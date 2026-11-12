# FUNDAMENT

Verbindliche Grundlage für FOKUS, das Charakterwerkzeug für Splittermond. Wer am Editor arbeitet – Mensch, Claude oder
Gemini in Google AI Studio – liest diese Datei zuerst und hält sich daran.

- Hier steht nur, **was gilt**. Was wann gemacht wurde, steht in `CLAUDE_EDITION.md`.
- Die Prüfungen in `src/fundament/__tests__/` setzen diese Datei durch. Schlägt eine fehl, ist der Code zu ändern, nicht die Prüfung.
- Änderungen an dieser Datei entscheidet der Projektinhaber.

> **Stand 11.11.2026.** Teil 2 (Regelquellen) ist gegen den Code geprüft; eine Prüfung hält Tabelle und Code seitdem
> zusammen (`src/fundament/__tests__`).

---

## 1. Grundsätze

1. **Nur das Grundregelwerk ist eingebaut.** Die Erweiterungsbände heißen im Editor **Grimoires** (Einzahl: das Grimoire,
   Dateiendung `.grim`). Jeder Nutzer lädt sie selbst hoch; sie bleiben
   in seinem Browser. Buchinhalte kommen nicht ins Repository und nicht auf den Server.
2. **Regeln kommen aus den Regelpaketen.** Was im Grundregelwerk steht, steht im GRW-Paket, alles andere in den
   Grimoires. Der Editor legt keine Regel selbst fest: keine Tabellen nach Zauber-, Meisterschafts- oder Stärkennamen,
   keine Zahlen aus dem Gedächtnis. Fehlt ein Wert, kommt er zuerst ins Paket (Datenseite, Ordner `Werkzeuge`), dann liest
   ihn der Editor.
3. **Kein Regeltext aus Erweiterungen im Code.** Werkzeuge, Tests und Editor enthalten zu Erweiterungen nur IDs, Zahlen,
   Fingerabdrücke und kurze Kennwörter.
4. **Jede Regel hat eine Fundstelle.** Seitenangaben werden gegen das Paket geprüft, nicht geschätzt. Eine Auslegung ohne
   Regelstelle wird als Auslegung gekennzeichnet.
5. **Die App bleibt in Google AI Studio lauffähig:** Vite und React, `metadata.json` im Wurzelordner, Daten unter
   `public/`, keine neuen Abhängigkeiten ohne Rücksprache.
6. **Ein Erscheinungsbild.** Es gibt genau ein Design: das dunkle CI aus Teil 3. Kein helles Design, kein Farbschema-Menü.
7. **Sperren als Standard, Hausregeln auf Wunsch** (Entscheidung 11.11.2026). Verstößt eine Eingabe gegen eine Regel,
   sperrt der Editor sie und sagt, warum. Mit dem Schalter „Hausregeln erlauben“ (Einstellungen → Allgemein, Standard:
   aus) wird aus jeder Sperre eine Warnung. Keine Ansicht entscheidet das selbst: Regelprüfungen laufen über
   `regelverstoss()`, `aenderungGesperrt()` und `useHausregeln()` aus `src/fundament/hausregeln.ts`. Bei zusammengesetzten
   Einträgen (Gefolge, Untote, Golems) ist gesperrt, was einen Verstoß neu schafft oder vergrößert; Änderungen, die nichts
   verschlimmern, gehen immer.

## 2. Regelquellen

Welche Regel der Editor woher liest. „Paket“ meint das GRW-Paket und die hochgeladenen Grimoires gleichermaßen;
Felder stehen unter `daten` des jeweiligen Eintrags. **Was hier nicht steht, darf der Editor nicht selbst festlegen.**

| Bereich | Quelle im Paket | Liest im Editor |
|---|---|---|
| Kosten in Erfahrungspunkten, Heldengrade (Schwellen, Grenzen, Widerstandsbonus), Fertigkeitspunkte je Zaubergrad | Kernregeln: `strukturiert` mit `steigerungskosten`, `heldengrade` | `regelwerk/steigerungsregeln.ts` |
| Pakete laden und im Browser speichern | Paketkopf, Einträge | `regelwerk/laden.ts`, `regelwerk/paketSpeicher.ts` |
| Einträge finden, Namen und IDs, Umbenennungen | Einträge mit `id`, `typ`, `name`; ID-Register | `regelwerk/katalog.ts`, `regelwerk/bruecke.ts`, `regelwerk/ids.ts` |
| Abgeleitete Werte, Heldengrade, Höchstbonus | Kernregeln: `strukturiert`; an Stärken: `abgeleitete_werte_modifikatoren`; `groessenklasse`; an Ausrüstung: `behinderung`, `vtd_bonus`, `mindest_staerke` | `regelwerk/abgeleitet.ts` |
| Voraussetzungen | `voraussetzungen` (formal, mit IDs) | `regelwerk/bedingungen.ts` |
| Erschaffung: Rassen, Kulturen, Abstammungen, Module, Grenzen je Schritt | `modulwerte`, `attributsmodifikatoren`, `staerken_refs`, `strukturiert`, `tabelle` | `regelwerk/erschaffung.ts`, `regelwerk/erschaffungEditor.ts` |
| Wirkungen von Stärken und Meisterschaften (feste Boni, Boni beim Würfeln) | `wirkungen_strukturiert` mit `fertigkeit_refs`, `alle_proben`, `gilt`, `traeger` | `regelwerk/wirkungen.ts` |
| Kosten und Zauberdauer aus Meisterschaften | `wirkungen_strukturiert`, Gruppe B | `regelwerk/wirkungen.ts` |
| Wirkung aktiver Zauber (Kampfwerte, Proben, Zusatzschaden, Lebenspunkte, unterdrückte Zustände) | `spielwerte`, `typus`, `reichweite` | `regelwerk/zauberwerte.ts`, `utils/magicRules.ts` |
| Zauber, Meisterschaften, Stärken, Ressourcen aus Grimoires in den Auswahllisten | `schulen`, `kosten`, `zauberdauer`, `reichweite`, `wirkungsdauer`, `wirkung`, `erfolgsgrade`, `schwelle`, `stufe`, `fertigkeit`, `manoever` | `regelwerk/bruecke.ts` |
| Ausrüstung aus Grimoires | Ausrüstungseinträge; `modus` (ersetzt, ergänzt) | `regelwerk/ausruestung.ts` |
| Relikte | `relikt_baukasten`, `baustein` | `regelwerk/relikte.ts` |
| Begleiter: Tiere, beschworene Wesen, Dienste | `werte_berechnet`, `tabellenzeile`, `beschwoerbares_wesen_stufe`, `immer_verfuegbar` | `regelwerk/begleiter.ts`, `regelwerk/dienste.ts` |
| Begleiter: Gefolge, erhobene Untote, Golems | `attribute`, `modulwerte`, `modifikationen`, `kosten_ep`, `baustein`, `felder`, `tabellen` | `regelwerk/gefolge.ts`, `regelwerk/untote.ts`, `regelwerk/golem.ts`, `regelwerk/modifikationen.ts` |
| Begleiter: Wesen-Baukasten (beschwörbare Wesen, Kreaturen) | Einträge `wesen_baukasten_basis`, `wesen_baukasten_modul`, `wesen_baukasten_rolle`; `beschwoerbares_wesen_stufe`, `ressource_kreatur`, `stufe_bonus`, `kosten_punkte`, `mehrfach`, `gruppe`, `voraussetzungen`, `moegliche_dienste`, `modifikationen`; Schritt 5: `strukturiert` | `regelwerk/wesenBaukasten.ts`, `regelwerk/modifikationen.ts` |
| Lebenspunkte und Stufen der Begleiter | Kernregeln: `strukturiert`; Merkmale: `beschreibung` | `regelwerk/vitals.ts` |

Ansichten (`components/`) greifen nicht selbst in die Paketdaten, sondern fragen die Module aus `regelwerk/`. Wo eine
Ansicht das heute noch tut, steht sie in `src/fundament/altlasten.json` (`paketzugriffe`).

### Regeln, die noch im Code stehen (Altlasten)

Diese Stellen verstoßen gegen Grundsatz 2. Sie sind bekannt, werden von den Prüfungen vorerst geduldet und sollen auf die
Datenseite wandern. Neue kommen nicht hinzu.

| Was | Wo | Ziel |
|---|---|---|
| Eingebaute Listen des Grundregelwerks: Zauber, Meisterschaften, Stärken, Schwächen, Ressourcen, Ausrüstung, Sprachen | `src/data/*.ts` | Der Editor liest diese Listen aus dem GRW-Paket; `src/data` entfällt |
| Attribute, Fertigkeiten mit ihren Attributen, Rassen, Mondzeichen, Heldengrade (Grenzen, Boni), Zustandslisten, Wundabzüge | `src/data/rules.ts` | Kernregeln und Einträge des GRW-Pakets |
| Beispielcharaktere (Archetypen) mit Namen von Stärken, Meisterschaften und Zaubern | `src/data/presets.ts` | Auf IDs umstellen |
| Abzüge der Zustände auf Proben (die Beschreibungen kommen schon aus dem Paket) | `utils/conditionModifiers.ts` | Zustandseinträge des Pakets, strukturiert |
| Würfelmechanik (Standard-, Sicherheits-, Risikowurf, Patzer, Triumph, Erfolgsgrade), GRW S. 16–19 | `utils/wuerfeln.ts` | Kernregeln `strukturiert` |
| Fokuskosten, Erfolgsgrade beim Zaubern, GRW S. 221–222 | `utils/magicRules.ts` | Kernregeln `strukturiert` |
| Kampfmanöver nach Namen | `utils/combatRules.ts` | Daten der Meisterschaften |
| Einzelne Stärken und Meisterschaften nach Namen (z. B. bei Rast und abgeleiteten Werten) | `utils/characterCalculations.ts`, `components/play/RestSection.tsx`, `utils/prerequisiteValidator.ts` | `wirkungen_strukturiert` |
| Regelwerte für Gefolge, Untote und Golems (Kosten, Grenzen, Preisformel) | `regelwerk/gefolge.ts`, `untote.ts`, `golem.ts` | `strukturiert` an den Regeltexten |
| Schadens- und Heildialog: Zustandsliste, Verschnaufpause | `components/play/TakeDamageModal.tsx`, `HealModal.tsx` | Zustände und Kernregeln des Pakets |

Die genaue Liste der geduldeten Regelnamen steht in `src/fundament/altlasten.json` (`regelnamen`).
Ohne geladenes Regelpaket rechnet der Editor mit diesen eingebauten Werten weiter (Rückfall). Das gilt auch für die Kosten in
Erfahrungspunkten und die Heldengrade: Maßgeblich ist das Paket; `utils/costCalculations.ts` und die Liste in
`src/data/rules.ts` enthalten dieselben Zahlen nur noch als Rückfall, und ein Test hält beide gleich.

## 3. Gestaltung

Ein dunkles Erscheinungsbild auf Grundlage von Marineblau und Gold: ruhig, warm, für lange Spielabende.
Das Muster dazu ist das Mockup „FOKUS – Mockup dunkles CD“. Im Zweifel gilt, was dort zu sehen ist:

- Spielansicht: [`docs/fundament/mockup-spielansicht.png`](docs/fundament/mockup-spielansicht.png)
- Bausteine und Farben: [`docs/fundament/mockup-bausteine.png`](docs/fundament/mockup-bausteine.png)

### Werte

Alle Werte stehen in `src/fundament/fundament.css` und **nur dort**. Ansichten verwenden die Namen
(`bg-flaeche`, `text-leise`, `border-gold`, `font-titel`, `rounded-karte`), nie einen Farbwert.

| Name | Wert | Verwendung |
|---|---|---|
| `seite` | `#1C2130` | Hintergrund der App, Spur des Scrollbalkens |
| `flaeche` | `#242A3B` | Karten, Dialoge, Kopfzeile |
| `erhoeht` | `#2C3347` | Eingabefelder, neutrale Knöpfe, Hover |
| `rahmen` | `#3A4258` | Rahmen und Trennlinien |
| `schrift` | `#E6E1D3` | Überschriften, Werte, Fließtext |
| `leise` | `#A3A096` | Beschriftungen, Nebentext, Griff des Scrollbalkens |
| `gold` | `#C9A24C` | Marke, aktiver Reiter, Hauptaktion |
| `gold-hell` | `#D9B563` | Abschnittstitel, Schrift auf goldumrandeten Knöpfen, Hover |
| `unverletzt` / `-grund` | `#7A9D76` / `#26301F` | freie Lebenspunkte, Heilen |
| `erschoepft` / `-grund` | `#C99A4E` / `#332A19` | erschöpfter Fokus, Betäubungsschaden |
| `schaden` / `-grund` | `#B06258` / `#33211D` | Schaden, verzehrter Fokus, Wundabzug, Gefahr |
| `kanalisiert` / `-grund` | `#6C8CAA` / `#1F2836` | kanalisierter Fokus |
| `magie` / `-grund` | `#9683AB` / `#292233` | Zauber, Magieschulen, Zauberboni |
| `temporaer` / `-grund` | `#6BA99C` / `#1E2D29` | temporäre Lebenspunkte |

Schrift: **Cinzel** (`font-titel`) für Marke, Überschriften und große Zahlen; **Merriweather** (`font-text`) für alles andere.
Größen: Fließtext 14, Beschriftung 12, kleinste Schrift 11, Abschnittstitel 17, große Werte 22–30.
Rundungen: Karten und Dialoge 12 (`rounded-karte`), Knöpfe und Felder 8 (`rounded-knopf`), Marken voll gerundet.

### Regeln

1. **Gold ist knapp.** Gold bekommen nur die Marke, Abschnittstitel, der aktive Reiter und die eine Hauptaktion einer
   Ansicht oder eines Dialogs. Alles andere bleibt in den Blaugrau-Tönen.
2. **Bedeutungsfarben sind Rahmen, keine Schrift.** Eine Bedeutung zeigt sich als Rahmen auf ihrem gedämpften Grundton;
   der Text darauf bleibt `schrift`. Bedeutungsfarben als Textfarbe sind zu kontrastarm.
3. **Jede Farbe hat eine Bedeutung.** Rot heißt Schaden oder Gefahr, Grün Gesundheit, Lila Magie – nie Schmuck.
   Eine Bedeutung hängt nie allein an der Farbe: Es steht immer ein Wort oder eine Zahl dabei.
4. **Schaltflächen sind mindestens 44 Pixel hoch** und echte `<button>`- bzw. `<a>`-Elemente. Knöpfe nur mit Symbol
   brauchen eine Beschriftung für Vorleseprogramme (`aria-label`). Eingabefelder haben immer eine Beschriftung.
5. **Keine Verläufe, keine Leuchteffekte, keine Emojis.** Flächen sind einfarbig; Symbole kommen aus `lucide-react`.
6. **Lesbarkeit geht vor.** Schrift und Hintergrund desselben Elements haben ein Kontrastverhältnis von mindestens
   4,5 : 1. Verboten sind damit dunkle Schrift auf dunklem Grund und helle Schrift auf hellem Grund. Erlaubte Paare:

   | Hintergrund | Schrift |
   |---|---|
   | `seite`, `flaeche`, `erhoeht` | `schrift`, `leise`, `gold`, `gold-hell` |
   | `rahmen` (z. B. unter dem Mauszeiger) | `schrift`, `gold-hell` |
   | gedämpfte Grundtöne (`schaden-grund`, `magie-grund` …) | `schrift` |
   | `gold`, `gold-hell` | `seite` |
   | kräftige Bedeutungsfarben (`schaden`, `magie` …) | gar nicht als Fläche hinter Text – nur als Rahmen, Balken, Punkt |

   Ändert ein Zustand (Mauszeiger, gewählt, gesperrt) den Hintergrund, muss die Schriftfarbe dazu passen. Eine Prüfung
   rechnet das für jede Klassenliste nach und schlägt bei einem Verstoß fehl. Sie sieht nur Schrift und Hintergrund am
   selben Element; Schrift, die ihre Farbe von außen erbt, erfasst sie nicht.
7. **Scrollbalken:** Spur `seite`, Griff `leise`, unter dem Mauszeiger `gold`, 10 Pixel breit. Gilt überall von selbst.
7. **Am Handy brauchbar:** Bereiche stapeln sich, Leisten brechen um, breite Tabellen rollen in ihrem eigenen Kasten.

### Bausteine

Ansichten setzen sich aus den Bausteinen in `src/fundament/` zusammen (`import { Knopf, Karte } from '…/fundament'`).
Fehlt einer, wird er dort ergänzt – nicht in der Ansicht nachgebaut.

| Baustein | Zweck | Varianten |
|---|---|---|
| `Knopf` | jede Schaltfläche | `primaer` (Gold, eine je Ansicht), `sekundaer` (goldener Rahmen), `neutral`, `gefahr`, `erholung`; `nurSymbol` |
| `Karte` | Fläche für einen zusammengehörigen Bereich | – |
| `Abschnittstitel` | Titel eines Bereichs | `h2`, `h3` |
| `Marke` | kleine Kennzeichnung: Zustand, Bonus, Kosten | Ton: `neutral`, `gold`, `unverletzt`, `erschoepft`, `schaden`, `kanalisiert`, `magie`, `temporaer`; `klein` |
| `Eingabe`, `Auswahl` | beschriftete Felder | Beschriftung sichtbar oder verborgen |
| `Rollbereich` | Bereich mit eigenem Scrollbalken | – |
| `Dialog` | Fenster über der Ansicht: Titelzeile mit goldener Linie, Inhalt, Fußzeile mit Aktionen | `schmal`, `mittel`, `breit` |
| `Rauten` | Zählbare Punkte wie Splitterpunkte: gefüllte Raute = vorhanden, nur Rand = verbraucht; mit Beschriftung für Vorleseprogramme | – |

### Stand der Umstellung

Alle Ansichten verwenden die benannten Werte; fest eingetragene Farbwerte gibt es nur noch in `fundament.css`. Die frühere
Übergangsdatei ist gelöscht. Gemeinsame Klassen, die keine Bausteine sind (Grundstil der Seite, Protokollkarten,
Würfelbanner, Druck), stehen in `src/fundament/klassen.css` – ebenfalls ohne eigene Farbwerte.

Noch nicht überall erreicht: Die Bausteine (`Dialog`, `Knopf`, `Karte` …) trägt bisher nur der Würfeldialog. Die übrigen
Ansichten haben die Farben, Rundungen und Schriften des CI, bauen ihre Knöpfe und Dialograhmen aber noch selbst. Wer eine
Ansicht anfasst, stellt sie dabei auf die Bausteine um (Mindesthöhe 44 Pixel, eine goldene Hauptaktion).

## 4. Arbeitsweise

1. **Vor der Arbeit:** diese Datei lesen, den aktuellen Stand holen (`git pull`).
2. **Prüfen:** `npx tsc --noEmit` und `npx vitest run` müssen ohne Fehler laufen, `npm run build` muss gelingen.
3. **Altlasten werden nur weniger.** Wer eine Ansicht umstellt oder eine Regel ins Paket verlagert, schreibt die Liste neu:
   `FUNDAMENT_ALTLASTEN=schreiben npx vitest run src/fundament`. Die Liste wird nie von Hand erweitert.
4. **Festhalten:** Jede abgeschlossene Arbeit bekommt einen Eintrag „Stand n“ in `CLAUDE_EDITION.md` (fortlaufend
   nummeriert): was geändert wurde, mit welcher Fundstelle, was offen bleibt.
5. **Arbeit aus Google AI Studio** wird nach GitHub übertragen und gegen das Grundregelwerk geprüft, bevor darauf
   weitergebaut wird. Bildschirmfotos und Buchseiten gehören nicht ins Repository.
6. **Mehrere Bearbeiter zugleich:** jeder auf eigenem Zweig, nacheinander nach `main`. Während eine Ansicht umgestellt
   wird, arbeitet dort niemand sonst.
