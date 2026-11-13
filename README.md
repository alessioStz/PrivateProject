# Bibel-Übersicht

Eine Web-App mit einer Übersicht über biblische Personen und Ereignisse – von der Schöpfung bis zur Christenversammlung des 1. Jahrhunderts.

- **228 Personen** und **156 Ereignisse** in 10 Epochen
- **Zeitleiste** mit Epochen-Navigation
- **Suche** über Namen, andere Namen, Rollen, Orte und Stichworte; sie toleriert Tippfehler und unterschiedliche Schreibweisen
- **Detailseiten** mit Zusammenfassung, wichtigen Punkten, Familie, Bibelstellen und Quellen
- Ausgelegt für **iPhone, iPad und Desktop**, mit hellem und dunklem Modus
- Lässt sich als App installieren („Zum Home-Bildschirm“) und funktioniert offline

## Quellen

Alle Inhalte beruhen **ausschließlich auf Veröffentlichungen von jw.org**, vor allem:

- „Einsichten über die Heilige Schrift“ (Onlinebibliothek wol.jw.org)
- die Studienbibel der Neuen-Welt-Übersetzung mit den Anhängen A6, A7 und B
- „Studie 3 – Ereignisse in den Strom der Zeit einordnen“

Die Texte sind **eigene, kurze Zusammenfassungen**. Es werden keine Texte oder Bilder von jw.org kopiert. Zu jedem Eintrag gibt es Links zu den genutzten Quellen. Bibelstellen öffnen die Neue-Welt-Übersetzung auf jw.org.

Die Jahresangaben folgen der Zeitrechnung von jw.org: v. u. Z. = vor unserer Zeitrechnung, u. Z. = unserer Zeitrechnung. Ist ein Datum nur ungefähr bekannt, steht ein „um“ davor.

## Aufbau

```
index.html              App-Gerüst (Navigation, Ansichten, Icons)
assets/css/app.css      Gestaltung (Apple-Stil, Hell/Dunkel, Mobil/Tablet/Desktop)
assets/js/app.js        App-Logik (Ansichten, Suche, Navigation)
assets/js/data.js       Erzeugte Daten – nicht von Hand bearbeiten
data/src/eras.json      Epochen
data/src/b01–b11.json   Personen und Ereignisse (Quelldaten)
scripts/build-data.mjs  Prüft die Quelldaten und erzeugt assets/js/data.js
sw.js                   Offline-Cache
manifest.webmanifest    App-Installation
```

Die App braucht weder ein Framework noch einen Build-Schritt. Nur für die Daten gibt es ein kleines Node-Skript.

## Daten ändern

1. Den passenden Eintrag in `data/src/bXX.json` bearbeiten.
2. Die Daten neu erzeugen (Node.js 18 oder neuer):

   ```sh
   node scripts/build-data.mjs
   ```

   Das Skript prüft die Einträge, zum Beispiel Pflichtfelder, Verweise zwischen Personen und Ereignissen und das Format der Bibelstellen. Danach schreibt es `assets/js/data.js` neu.
3. Damit installierte Apps die neuen Daten sicher laden, in `sw.js` die Cache-Version erhöhen (z. B. `bibel-uebersicht-v2`).

Bibelstellen werden so geschrieben: `1. Mose 12:1-3`, `Johannes 3:16`, `Lukas 22:31, 32`, `Apostelgeschichte 6:8–8:2` oder `Judas 3`.

## Lokal starten

Im Projektordner einen einfachen Webserver starten, zum Beispiel:

```sh
python -m http.server 8000
```

Danach im Browser `http://localhost:8000` öffnen.

## Veröffentlichen mit GitHub Pages

1. Auf GitHub im Repository **Settings → Pages** öffnen.
2. Unter „Build and deployment“ die Quelle **Deploy from a branch** wählen, dann den Branch **main** und den Ordner **/ (root)**.
3. Speichern. Nach etwa einer Minute ist die Seite unter `https://<benutzername>.github.io/<repository>/` erreichbar.

**Hinweis zur Privatsphäre:**

- Mit GitHub Free funktioniert Pages nur bei öffentlichen Repositories.
- Mit GitHub Pro kann das Repository privat bleiben. Die veröffentlichte Seite ist aber trotzdem für jeden erreichbar, der die Adresse kennt.
- Eine echte Zugriffsbeschränkung bietet GitHub nur mit Enterprise Cloud.

Damit Suchmaschinen die Seite nicht aufnehmen, sind `robots.txt` und `<meta name="robots" content="noindex">` gesetzt.
