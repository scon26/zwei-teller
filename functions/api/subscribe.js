// POST /api/subscribe   Body: { email } (JSON oder Formular)
//
// Schlanke Newsletter-Anbindung mit Double-Opt-In (rechtlich sauber für DE):
//   1. E-Mail validieren
//   2. Einmal-Token erzeugen und als "pending" im KV ablegen (48 h gültig)
//   3. Bestätigungsmail über Resend verschicken
// Erst nach Klick auf den Link (siehe confirm.js) wird die Adresse bestätigt.
//
// Erwartete Bindings (in Cloudflare Pages → Settings → Functions):
//   KV-Namespace : SUBSCRIBERS
//   Secret       : RESEND_API_KEY
//   Variablen    : RESEND_FROM  z. B. "zwei teller <hallo@deine-domain.de>"
//                  SITE_URL     z. B. "https://zwei-teller.pages.dev" (optional, Fallback = Request-Origin)

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

export async function onRequestPost({ request, env }) {
  // ---- Eingabe lesen (JSON oder Formular) ----
  let email = "";
  let honeypot = "";
  const ctype = request.headers.get("content-type") || "";
  try {
    if (ctype.includes("application/json")) {
      const body = await request.json();
      email = String(body.email || "").trim().toLowerCase();
      honeypot = String(body.website || "").trim();
    } else {
      const form = await request.formData();
      email = String(form.get("email") || "").trim().toLowerCase();
      honeypot = String(form.get("website") || "").trim();
    }
  } catch {
    return json({ ok: false, error: "Ungültige Anfrage." }, 400);
  }

  // Honeypot: nur Bots füllen das versteckte Feld → wir tun nichts, melden aber Erfolg.
  if (honeypot) return json({ ok: true });

  if (!EMAIL_RE.test(email)) {
    return json({ ok: false, error: "Bitte eine gültige E-Mail-Adresse eingeben." }, 422);
  }

  if (!env.SUBSCRIBERS) {
    return json({ ok: false, error: "Speicher ist nicht konfiguriert." }, 500);
  }

  // Schon bestätigt? Dann keine zweite Mail.
  const existing = await env.SUBSCRIBERS.get(`sub:${email}`);
  if (existing) return json({ ok: true, already: true });

  // ---- Einmal-Token (48 h) ----
  const token = crypto.randomUUID();
  await env.SUBSCRIBERS.put(`pending:${token}`, email, { expirationTtl: 60 * 60 * 48 });

  const base = (env.SITE_URL || new URL(request.url).origin).replace(/\/$/, "");
  const confirmUrl = `${base}/api/confirm?token=${token}`;

  // ---- Bestätigungsmail verschicken ----
  try {
    await sendConfirmationEmail(env, email, confirmUrl);
  } catch (err) {
    // Token wieder entfernen, damit kein "Geist"-Eintrag bleibt.
    await env.SUBSCRIBERS.delete(`pending:${token}`);
    console.error("Resend-Fehler:", err && err.message);
    return json(
      { ok: false, error: "Bestätigungsmail konnte nicht versendet werden. Bitte später erneut versuchen." },
      502
    );
  }

  return json({ ok: true });
}

async function sendConfirmationEmail(env, email, confirmUrl) {
  if (!env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY fehlt");
  }
  const from = env.RESEND_FROM || "zwei teller <onboarding@resend.dev>";

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [email],
      subject: "Bitte bestätige deine Anmeldung – zwei teller",
      html: confirmationEmailHtml(confirmUrl),
      text:
        "Schön, dass du dabei sein willst!\n\n" +
        "Bitte bestätige deine Anmeldung zum zwei-teller-Newsletter über diesen Link:\n" +
        confirmUrl +
        "\n\nWenn du dich nicht angemeldet hast, ignoriere diese Mail einfach.",
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Resend ${res.status}: ${detail}`);
  }
}

function confirmationEmailHtml(confirmUrl) {
  return `<!DOCTYPE html>
<html lang="de"><body style="margin:0;background:#F7EFDD;font-family:Helvetica,Arial,sans-serif;color:#2C211B;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#F8F1E4;border-radius:18px;overflow:hidden;">
        <tr><td style="background:#46233E;padding:28px 32px;">
          <span style="font-family:Georgia,serif;font-size:24px;color:#F4E9D6;">zwei teller</span>
        </td></tr>
        <tr><td style="padding:32px;">
          <h1 style="font-family:Georgia,serif;font-size:24px;margin:0 0 12px;">Fast geschafft! 🌿</h1>
          <p style="font-size:16px;line-height:1.6;margin:0 0 24px;">
            Schön, dass du dabei sein willst. Bitte bestätige einmal deine Anmeldung —
            dann landet jede Woche ein erprobtes Gericht mit fertigem Split in deinem Postfach.
          </p>
          <p style="margin:0 0 28px;">
            <a href="${confirmUrl}" style="display:inline-block;background:#E3A52A;color:#371A31;text-decoration:none;font-weight:bold;padding:14px 26px;border-radius:999px;font-size:16px;">
              Anmeldung bestätigen
            </a>
          </p>
          <p style="font-size:13px;line-height:1.6;color:#6b5d52;margin:0;">
            Klappt der Button nicht? Kopiere diesen Link in deinen Browser:<br>
            <a href="${confirmUrl}" style="color:#CC6B43;word-break:break-all;">${confirmUrl}</a>
          </p>
          <p style="font-size:13px;line-height:1.6;color:#6b5d52;margin:20px 0 0;">
            Du hast dich nicht angemeldet? Dann ignoriere diese Mail einfach — ohne Bestätigung passiert nichts.
          </p>
        </td></tr>
      </table>
      <p style="font-size:12px;color:#8a7d70;margin:16px 0 0;">zwei teller — einmal kochen, alle essen mit</p>
    </td></tr>
  </table>
</body></html>`;
}
