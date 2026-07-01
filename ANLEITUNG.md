# Anleitung in einfacher Sprache

So bringst du den Newsletter zum Laufen. Alles passiert durch **Klicken auf zwei
Webseiten** – kein Programmieren, kein „schwarzes Fenster". Dauer: ca. 15 Minuten.

Du arbeitest mit zwei Diensten:
- **Resend** – verschickt die E-Mails.
- **Cloudflare** – zeigt deine Webseite an und sammelt die Anmeldungen ein.

> Wichtig: Deinen geheimen Resend-Schlüssel (siehe Teil 1) **niemals im Chat oder
> per Mail weitergeben**. Er kommt nur in das Cloudflare-Feld aus Teil 3.

---

## Teil 1 – Bei Resend den Schlüssel holen

Der „Schlüssel" ist ein langes Passwort, mit dem deine Seite Resend sagen darf:
„bitte diese Mail verschicken".

1. Gehe auf **resend.com** und melde dich an.
2. Klicke links auf **API Keys**.
3. Klicke auf **Create API Key** (Schlüssel erstellen).
4. Gib einen Namen ein, z. B. `zwei-teller`, und bestätige.
5. Es erscheint eine lange Zeichenkette, die mit `re_` beginnt.
   **Kopiere sie** und lege sie kurz zwischen (z. B. in eine Notiz).
   Du brauchst sie gleich in Teil 3.

---

## Teil 2 – Bei Cloudflare die Webseite verbinden

1. Gehe auf **dash.cloudflare.com** und melde dich an (oder kostenlos registrieren).
2. Klicke links auf **Workers & Pages**.
3. Klicke auf **Create** (Erstellen) und wähle oben den Reiter **Pages**.
4. Klicke **Connect to Git** und erlaube den Zugriff auf dein GitHub.
5. Wähle das Projekt **zwei-teller** aus und klicke **Begin setup** / **Weiter**.
6. Bei den Bau-Einstellungen musst du **nichts** eintragen
   (kein „Build command", Ausgabe bleibt auf `/`).
7. Klicke **Save and Deploy** (Speichern und Veröffentlichen) und warte kurz.

Deine Seite ist jetzt online – die Adresse endet auf `.pages.dev`.
**Notiere dir diese Adresse**, du brauchst sie in Teil 3.

---

## Teil 3 – Die vier Angaben eintragen

Jetzt sagst du Cloudflare, wo die Anmeldungen gespeichert werden und wie die
Mails verschickt werden. Das ist der einzige etwas fummelige Teil – einfach
genau der Reihe nach.

### 3a) Speicher-Schublade anlegen (für die Adressen)

1. Links wieder auf **Workers & Pages**, dann oben den Reiter **KV** wählen.
2. Klicke **Create a namespace** (Schublade erstellen).
3. Gib als Namen genau ein: `SUBSCRIBERS`
4. Speichern. Fertig – mehr musst du hier nicht tun.

### 3b) Schublade mit der Webseite verbinden

1. Gehe zurück zu deinem Projekt: **Workers & Pages → zwei-teller**.
2. Oben auf **Settings** (Einstellungen), dann auf **Bindings**
   (in manchen Ansichten heißt es **Functions → KV namespace bindings**).
3. Klicke **Add** (Hinzufügen) und trage ein:
   - **Variable name:** `SUBSCRIBERS`
   - **KV namespace:** die Schublade `SUBSCRIBERS` aus Schritt 3a auswählen
4. Speichern.

### 3c) Die drei Angaben für die Mails

Bleibe in **Settings** und suche den Bereich **Variables and Secrets**
(Variablen und Geheimnisse). Dort fügst du nacheinander **drei** Einträge hinzu
(Knopf **Add**):

| Name (genau so) | Typ | Was rein muss |
|---|---|---|
| `RESEND_API_KEY` | **Secret** (Geheim / „Encrypt") | dein Schlüssel aus Teil 1 (beginnt mit `re_`) |
| `RESEND_FROM` | Text (Plaintext) | Absender, z. B. `zwei teller <onboarding@resend.dev>` |
| `SITE_URL` | Text (Plaintext) | deine `.pages.dev`-Adresse aus Teil 2 |

> Beim ersten Ausprobieren nimmst du bei `RESEND_FROM` den Wert
> `zwei teller <onboarding@resend.dev>`. Damit kommt die Testmail aber **nur an
> deine eigene** Resend-Adresse an. Wenn später alle Anmelder Mails bekommen
> sollen, muss in Resend einmal deine eigene Domain freigeschaltet werden
> (siehe „Später" unten).

### 3d) Einmal neu veröffentlichen

Damit die neuen Angaben wirken:
1. Im Projekt oben auf **Deployments**.
2. Beim obersten Eintrag rechts auf die drei Punkte **⋯** und
   **Retry deployment** (neu veröffentlichen) klicken.

---

## Fertig – so testest du

1. Öffne deine `.pages.dev`-Seite.
2. Trage unten beim Newsletter **deine eigene E-Mail** ein und klicke **Dabei sein**.
3. Es sollte „Fast geschafft!" erscheinen.
4. Schau in dein Postfach: Dort liegt eine Mail „Bitte bestätige deine Anmeldung".
5. Klicke darin auf **Anmeldung bestätigen** – es erscheint „Du bist dabei!".

Klappt das, ist die Anbindung fertig. 🎉

Wenn etwas nicht klappt, sag mir **an welcher Nummer** du hängst – dann helfe ich
gezielt weiter.

---

## Später (nicht jetzt nötig)

- **Eigene Absender-Adresse:** In Resend deine Domain freischalten, damit Mails an
  alle Anmelder rausgehen (nicht nur an dich). Dann `RESEND_FROM` auf deine
  Adresse ändern.
- **Wochenmail verschicken** und **Abmelde-Link** – das bauen wir ein, wenn du so
  weit bist. Sag einfach Bescheid.
