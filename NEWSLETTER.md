# Newsletter-Anbindung

Schlanke, kostenlose Lösung auf **Cloudflare Pages** (Hosting + Functions) mit
**Resend** (Versand) und **Cloudflare KV** (Abonnentenliste). Rechtssicher per
**Double-Opt-In**: Eine Adresse zählt erst nach Klick auf den Bestätigungslink.

```
Formular (index.html)
      │  POST /api/subscribe { email }
      ▼
functions/api/subscribe.js  ──►  KV: pending:<token> = email (48 h)
      │                          Resend: Bestätigungsmail mit Link
      ▼
Nutzer klickt Link  ──►  GET /api/confirm?token=…
      ▼
functions/api/confirm.js    ──►  KV: sub:<email> = { confirmedAt }
                                 löscht pending:<token>
```

## Was schon im Repo liegt

| Datei | Zweck |
|---|---|
| `functions/api/subscribe.js` | Nimmt die Anmeldung an, legt `pending`-Token an, schickt die Bestätigungsmail. |
| `functions/api/confirm.js` | Löst den Link ein, markiert die Adresse als bestätigt, zeigt eine Erfolgsseite. |
| `index.html` | Formular sendet jetzt echt an `/api/subscribe` (inkl. Honeypot gegen Bots). |
| `wrangler.toml` | Bindings für lokale Entwicklung. |

## Kosten (Free-Tier, Stand 2026)

- **Cloudflare Pages**: unbegrenzte statische Requests, 100.000 Function-Aufrufe/Tag.
- **Cloudflare KV**: 100.000 Lesevorgänge + 1.000 Schreibvorgänge pro Tag.
- **Resend**: 3.000 Mails/Monat, 100/Tag.

Für eine startende Newsletter-Seite reicht das mit großem Abstand.

## Schnellstart per Script

Den CLI-Teil (KV anlegen, ID in `wrangler.toml` eintragen, Secret & Variablen
setzen, Pages-Projekt anlegen) erledigt das mitgelieferte Script. Du brauchst
nur deinen Resend-API-Key:

```bash
bash setup.sh
```

Es startet bei Bedarf `wrangler login`, fragt Absender/URL ab und legt alles an.
Den einen Dashboard-Schritt (KV-Binding ans Pages-Projekt) nennt es dir am Ende.
Wer es lieber manuell macht, folgt den Schritten unten.

## Einrichtung (einmalig, manuell)

### 1. Resend-Konto + API-Key
1. Konto auf [resend.com](https://resend.com) anlegen.
2. **Domain verifizieren** (DNS-Einträge setzen) – danach kannst du z. B. von
   `hallo@deine-domain.de` senden. *Zum Testen* geht ohne Domain
   `onboarding@resend.dev` (verschickt nur an die eigene Konto-Adresse).
3. Unter **API Keys** einen Key erstellen und kopieren.

### 2. KV-Namespace anlegen
```bash
npm install -g wrangler        # falls noch nicht vorhanden
wrangler login
wrangler kv namespace create SUBSCRIBERS
```
Die ausgegebene `id` in `wrangler.toml` eintragen (für lokale Entwicklung) und
im Dashboard binden (nächster Schritt).

### 3. Cloudflare-Pages-Projekt verbinden
1. Cloudflare-Dashboard → **Workers & Pages → Create → Pages** → dieses
   Git-Repo verbinden.
2. Build-Einstellungen: **kein** Build-Command nötig, Output-Verzeichnis `/`
   (statische Seite im Repo-Root).
3. Nach dem ersten Deploy unter **Settings → Functions**:
   - **KV namespace bindings**: Variable `SUBSCRIBERS` → den oben erstellten Namespace.
   - **Environment variables**:
     - `RESEND_FROM` = `zwei teller <hallo@deine-domain.de>`
     - `SITE_URL` = die Live-URL, z. B. `https://zwei-teller.pages.dev`
   - **Secrets** (verschlüsselt, „Encrypt"):
     - `RESEND_API_KEY` = der Resend-Key aus Schritt 1.
4. Neu deployen, damit die Bindings greifen.

## Lokal testen
```bash
# Secret nur für die lokale Session setzen:
echo "RESEND_API_KEY=dein_key" > .dev.vars
wrangler pages dev .
```
`.dev.vars` ist bereits in `.gitignore` und landet nicht im Repo.

## Abonnenten ansehen / exportieren
```bash
# Bestätigte Adressen auflisten:
wrangler kv key list --binding SUBSCRIBERS | grep '"name": "sub:'
# Einzelnen Eintrag lesen:
wrangler kv key get "sub:adresse@example.de" --binding SUBSCRIBERS
```

## Nächste Schritte (optional, später)
- **Versand der Wochenmail**: über das Resend-Dashboard/Broadcasts oder ein
  kleines Script, das `sub:*` aus KV liest.
- **Abmeldelink** (`/api/unsubscribe`) – Pflicht, sobald echte Mails rausgehen;
  Eintrag in KV einfach löschen.
- **Rate-Limiting** pro IP, falls Spam zum Thema wird.
