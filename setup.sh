#!/usr/bin/env bash
#
# Einmaliges Setup der Newsletter-Anbindung (Cloudflare Pages + KV + Resend).
# Erledigt alle per CLI automatisierbaren Schritte. Voraussetzung: du bist in
# DEINEM Cloudflare-Account eingeloggt (wird sonst gestartet) und hast einen
# Resend-API-Key zur Hand (https://resend.com/api-keys).
#
#   bash setup.sh
#
set -euo pipefail

PROJECT="zwei-teller"
KV_BINDING="SUBSCRIBERS"

say(){ printf '\n\033[1;35m▸ %s\033[0m\n' "$1"; }
ask(){ local p="$1" d="${2:-}"; local a; read -rp "$p${d:+ [$d]}: " a; echo "${a:-$d}"; }

# --- wrangler vorhanden? ---
if ! command -v wrangler >/dev/null 2>&1; then
  if command -v npx >/dev/null 2>&1; then
    WRANGLER="npx --yes wrangler"
  else
    echo "Bitte zuerst Node/npm installieren (https://nodejs.org), dann erneut starten."; exit 1
  fi
else
  WRANGLER="wrangler"
fi

# --- Login (öffnet den Browser, falls nötig) ---
say "Cloudflare-Login prüfen"
$WRANGLER whoami >/dev/null 2>&1 || $WRANGLER login

# --- KV-Namespace anlegen und ID einsammeln ---
say "KV-Namespace \"$KV_BINDING\" anlegen"
KV_OUT="$($WRANGLER kv namespace create "$KV_BINDING" 2>&1 || true)"
echo "$KV_OUT"
KV_ID="$(printf '%s\n' "$KV_OUT" | grep -oE '[0-9a-f]{32}' | head -n1 || true)"

if [ -z "$KV_ID" ]; then
  KV_ID="$(ask 'Konnte die KV-ID nicht automatisch lesen. Bitte ID aus der Ausgabe oben einfügen')"
fi

if [ -n "$KV_ID" ]; then
  say "ID in wrangler.toml eintragen"
  # ersetzt den Platzhalter ODER eine bereits gesetzte 32-stellige ID
  sed -i.bak -E "s/id = \"(REPLACE_WITH_KV_NAMESPACE_ID|[0-9a-f]{32})\"/id = \"$KV_ID\"/" wrangler.toml
  rm -f wrangler.toml.bak
  echo "  → $KV_ID"
fi

# --- Variablen abfragen ---
say "E-Mail-Absender & Live-URL"
echo "  RESEND_FROM muss zu einer in Resend verifizierten Domain passen."
echo "  Zum Testen geht 'onboarding@resend.dev' (sendet nur an deine Konto-Adresse)."
FROM="$(ask 'RESEND_FROM' 'zwei teller <onboarding@resend.dev>')"
SITE="$(ask 'SITE_URL (Live-Adresse)' "https://${PROJECT}.pages.dev")"

# in wrangler.toml (für lokale Entwicklung) aktualisieren
sed -i.bak -E "s|^RESEND_FROM = .*|RESEND_FROM = \"$FROM\"|" wrangler.toml
sed -i.bak -E "s|^SITE_URL = .*|SITE_URL = \"$SITE\"|" wrangler.toml
rm -f wrangler.toml.bak

# --- Pages-Projekt sicherstellen ---
say "Cloudflare-Pages-Projekt \"$PROJECT\" sicherstellen"
$WRANGLER pages project create "$PROJECT" --production-branch main 2>/dev/null \
  || echo "  (Projekt existiert bereits – ok)"

# --- Secret + Variablen am Pages-Projekt setzen ---
say "Resend-API-Key als Secret hinterlegen"
echo "  Der Key wird gleich abgefragt und verschlüsselt in Cloudflare gespeichert."
$WRANGLER pages secret put RESEND_API_KEY --project-name "$PROJECT"

say "Produktiv-Variablen am Pages-Projekt setzen"
# KV-Binding & Vars für die Produktion. Schlägt eine Variante fehl (CLI-Version),
# trägst du sie einfach im Dashboard nach – siehe NEWSLETTER.md.
printf '%s' "$FROM" | $WRANGLER pages secret put RESEND_FROM --project-name "$PROJECT" 2>/dev/null \
  || echo "  RESEND_FROM bitte im Dashboard als Variable setzen: $FROM"
printf '%s' "$SITE" | $WRANGLER pages secret put SITE_URL --project-name "$PROJECT" 2>/dev/null \
  || echo "  SITE_URL bitte im Dashboard als Variable setzen: $SITE"

cat <<EOF

──────────────────────────────────────────────
✓ CLI-Teil erledigt.

Noch im Dashboard (Workers & Pages → $PROJECT → Settings → Functions):
  • KV namespace binding:  Variable "$KV_BINDING"  →  Namespace mit ID $KV_ID
    (das Git-Binding lässt sich nur im Dashboard setzen)

Dann deployen:
  • Repo im Pages-Projekt verbinden  ODER  direkt:  $WRANGLER pages deploy .

Lokal testen:
  echo "RESEND_API_KEY=DEIN_KEY" > .dev.vars
  $WRANGLER pages dev .
──────────────────────────────────────────────
EOF
