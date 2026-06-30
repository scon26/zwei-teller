// GET /api/confirm?token=...
//
// Zweiter Schritt des Double-Opt-In: löst das Einmal-Token ein, markiert die
// Adresse als bestätigt und zeigt eine kleine, gebrandete Erfolgsseite.

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const token = (url.searchParams.get("token") || "").trim();

  if (!token || !env.SUBSCRIBERS) {
    return page(
      "Link unvollständig",
      "Dieser Bestätigungslink ist leider ungültig. Melde dich einfach noch einmal an.",
      false
    );
  }

  const email = await env.SUBSCRIBERS.get(`pending:${token}`);
  if (!email) {
    return page(
      "Link abgelaufen",
      "Dieser Bestätigungslink ist ungültig oder wurde bereits verwendet. Melde dich bei Bedarf einfach erneut an.",
      false
    );
  }

  // Bestätigt eintragen, Token verbrauchen.
  await env.SUBSCRIBERS.put(
    `sub:${email}`,
    JSON.stringify({ confirmedAt: new Date().toISOString() })
  );
  await env.SUBSCRIBERS.delete(`pending:${token}`);

  return page(
    "Du bist dabei! 🌿",
    "Deine Anmeldung ist bestätigt. Das erste Gericht landet bald in deinem Postfach.",
    true
  );
}

function page(title, message, success) {
  const accent = success ? "#6E7A3E" : "#B23A2E";
  const html = `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<meta name="robots" content="noindex" />
<title>${title} — zwei teller</title>
<style>
  body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;
    background:#46233E;color:#2C211B;font-family:system-ui,-apple-system,Helvetica,Arial,sans-serif;padding:24px;}
  .card{background:#F8F1E4;max-width:440px;width:100%;border-radius:20px;padding:40px 36px;text-align:center;
    box-shadow:0 24px 60px rgba(0,0,0,.28);}
  .mark{font-family:Georgia,serif;font-size:1.3rem;color:#46233E;opacity:.7;margin-bottom:20px;}
  h1{font-family:Georgia,serif;font-size:1.8rem;margin:0 0 12px;color:${accent};}
  p{font-size:1.05rem;line-height:1.6;margin:0 0 24px;color:#3a2e26;}
  a.btn{display:inline-block;background:#E3A52A;color:#371A31;text-decoration:none;font-weight:700;
    padding:12px 24px;border-radius:999px;}
</style>
</head>
<body>
  <div class="card">
    <div class="mark">zwei teller</div>
    <h1>${title}</h1>
    <p>${message}</p>
    <a class="btn" href="/">Zurück zur Seite</a>
  </div>
</body>
</html>`;

  return new Response(html, {
    status: success ? 200 : 400,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}
