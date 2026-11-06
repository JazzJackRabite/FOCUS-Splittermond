# FOKUS 1.0 – Claude-Edition

Repository `JazzJackRabite/FOKUS-1.0-claudeedition` (Branch `main`; entstanden als Branch `FOKUS-1.0-claudeedition` von FOKUS-1.0). Ziel: Der Editor arbeitet mit den Splittermond-Regelpaketen aus dem Ordner `SCR4P3/Regelpakete`
(feste IDs statt Namen, Regeln aus den Daten statt fest im Code).

## Stand 1 (05.11.2026): Regelpakete und Lader

- **Eingebaut ist nur das Grundregelwerk:** `public/regelpakete/manifest.json` und `grw.srp.json`
  (erzeugt mit `Werkzeuge/regelpakete/editor_export.py`, Ordner `Regelpakete/editor/basis`). Andere Bücher liegen nicht im Repo.
- **Weitere Bücher lädt man selbst:** Einstellungen → Regelpakete → „Buchpakete auswählen“, Dateien aus
  `Regelpakete/editor/buecher` (z. B. `magie.srp.json`). Sie bleiben im Browser (IndexedDB), werden beim nächsten Start wieder
  geladen und nie an einen Server geschickt. Jedes Buchpaket bringt seine Ladeangaben mit (`ladeinfo`: Ladereihenfolge,
  Abhängigkeiten, Regelgruppen, Umbenennungen).
- **Lader in TypeScript** (`src/regelwerk/`): Portierung von `Pruefsuite/lader.py`
  - `Katalog` – Lade-Algorithmus, Ergänzungen/Ersetzungen, Regelgruppen (geltende Fassung), Referenzprüfung
  - `erfuellt` – alle Bedingungsarten der Voraussetzungen
  - `abgeleiteteWerte` – Formeln, Heldengrad, Stärken, Ausrüstung, Höchstbonus, Wunden (GRW S. 13–15)
  - `pruefeErschaffung` – alle Schritte und Budgets der Erschaffung (GRW S. 22–30)
  - `verfuegbareDienste` – Dienste beschworener Wesen (nur mit Buchpaket „Die Magie“)
  - `RegelwerkProvider` / `useRegelwerk()` – Katalog für die ganze App
- **Abgleich mit der Python-Referenz:** `src/regelwerk/__tests__/regelwerk.test.ts` vergleicht 161 Voraussetzungen ×
  13 Charaktere, 120 Berechnungen abgeleiteter Werte und 150 Erschaffungen mit den Ergebnissen des Python-Laders.
  Mit allen Büchern lokal: `FOKUS_BUECHER=<Regelpakete/editor/buecher> FOKUS_REFERENZ_VOLL=<referenz_voll.json> npx vitest run src/regelwerk`.


## Stand 2 (05.11.2026): Regeln aus den Daten, Bücher im Editor

- **Abgeleitete Werte nach den Regeldaten** (`regelwerk/bruecke.ts` → `abgeleiteteFuerCharakter`, eingebunden in
  `utils/characterCalculations.ts`). Damit sind vier Abweichungen vom Buch behoben:
  1. Heldengrad-Bonus +2 auch auf die Verteidigung, nicht nur auf GW und KW (GRW S. 89)
  2. +1 Splitterpunkt je Heldengrad (S. 88)
  3. Stärken wirken auf abgeleitete Werte: Flink, Hoher Geistiger/Körperlicher Widerstand, Verbesserte Initiative, Einen Schritt voraus,
     Robust, Erhöhter Fokuspool, Zusätzliche Splitterpunkte
  4. Halbe Behinderung auf GSW kaufmännisch gerundet (S. 11); VTD-Bonus der Ausrüstung bis zum Höchstbonus (S. 18)
  Ohne geladene Regelpakete (z. B. in alten Tests) rechnet der Editor wie bisher.
- **Voraussetzungen über den Katalog** (`utils/prerequisiteValidator.ts` → `voraussetzungAusKatalog`): Jede Meisterschaft, die im Katalog
  steht (GRW und hochgeladene Bücher), wird formal geprüft; „Entscheidung der Spielleitung“ wird als Hinweis angezeigt.
- **Hochgeladene Bücher im Editor:** Zauber, Meisterschaften (mit Schwelle, Manöver-Kennzeichen, Voraussetzung), Stärken, Schwächen und
  Ressourcen erscheinen in allen Auswahllisten (über `getActivePackages` im `gameResourceManager`). Allgemeine Kampf- und
  Magiemeisterschaften der Bücher stehen bei den passenden Fertigkeiten.
- **Zuordnung Editor-Namen → IDs** geprüft: alle Rassen, Fertigkeiten, Stärken, Ressourcen und Meisterschaften des Editors haben eine ID.

## Stand 3 (05.11.2026): Erschaffung nach Regelwerk

- **Kultur & Abstammung** (neue Karte in der Erschaffung, `components/creation/ErschaffungRegelwerk.tsx`): Modul wählen
  (12 Kulturen und 17 Abstammungen des GRW, dazu Kulturen hochgeladener Bücher) oder frei verteilen. Wahlmöglichkeiten des Moduls
  (z. B. „Redegewandtheit oder eine Magieschule“, Ressourcen, Stärke, Meisterschaft) per Auswahlliste; „Modulwerte eintragen“
  schreibt Fertigkeitspunkte, Ressourcen, Stärke und Meisterschaft in den Charakter, „Werte wieder austragen“ nimmt sie zurück.
  Die Wahl wird mit dem Charakter gespeichert (`erschaffung`, auch im JSON-Export/Import).
- **Regelprüfung der Erschaffung (GRW S. 22–30)** mit `pruefeErschaffung()`: Attribute, freie Rassenmodifikatoren, Kultur, Abstammung,
  Ausbildung, Schritt 7, Start-Erfahrung und Feinschliff. Weil der Editor nur Summen speichert, ordnet `regelwerk/erschaffungEditor.ts`
  die Punkte außerhalb der Module den Schritten zu (maximaler Fluss über die Grenzen je Schritt): Gibt es eine regelgerechte Verteilung,
  wird sie gefunden; sonst meldet die Prüfung den überzogenen Schritt.
- FO in der Erschaffung zeigt jetzt den Gesamtwert mit Stärken (z. B. Erhöhter Fokuspool).
- Damit ist die letzte der sechs bekannten Abweichungen vom Buch behoben.

## Stand 4 (05.11.2026): Würfel, Großmeister, freie Meisterschaften

- **Gemeinsame Würfellogik** (`utils/wuerfeln.ts`) für Probe, Angriff und Zauber nach GRW S. 16–19. Der Angriffsdialog wich vorher
  vom Buch ab (Sicherheitswurf addierte beide Würfel, Patzer nur bei Doppel-1, Triumph nur bei Doppel-10); jetzt einheitlich:
  Patzer bei Augensumme ≤ 3, Triumph ab 19, Sicherheitswurf wertet nur den höheren Würfel.
- **Großmeister** ab 15 Fertigkeitspunkten (Schwelle aus den Regeldaten): automatisch ein zusätzlicher W10 bei Probe, Angriff und Zauber,
  zählt nicht für den Patzer; Hinweis in der Fertigkeitszeile.
- **Freie Meisterschaft trotz unerfüllter Voraussetzung** (GRW S. 92): Sind auf einer Schwelle nur solche Meisterschaften übrig, ist
  eine davon als Gratis-Meisterschaft wählbar (mit Hinweis, dass sie erst mit erfüllter Voraussetzung nutzbar ist).
- Geprüft: Die GRW-Texte der eingebauten Daten stimmen mit den Regelpaketen überein (419 Zauber, 437 Meisterschaften, 43 Stärken,
  20 Schwächen identisch; Ressourcen nur mit eingebetteter Stufentabelle) – kein Austausch nötig.

## Stand 5 (05.11.2026): Begleiter

- **Karte „Begleiter“ im Inventar** (`components/begleiter/BegleiterKarte.tsx`, Logik in `regelwerk/begleiter.ts`), nur mit Regelpaketen.
- **Tiergefährten** über die Ressource Kreatur (GRW S. 78): Auswahl aus allen Kreaturen/Tieren mit Merkmal „Kreatur N“; Tiere über der
  höchsten Ressourcenstufe sind gesperrt, Hinweise bei zu vielen Tieren oder zu niedriger Stufe. Mit dem GRW allein: 11 Tiere
  (Taube bis Riesenschlange, S. 284–287); weitere kommen mit Büchern wie dem Bestienmeister. Wertekasten aufklappbar; bei
  „Werte wie … mit folgenden Änderungen“ die berechneten Werte.
- **Beschworene Wesen** (nur mit „Die Magie“, 65 Wesen): Auswahl, Werte und verfügbare Dienste je nach den Meisterschaften des Charakters.
- Gespeichert im Charakter als `begleiter: [{ id, art, name }]` (Import geprüft); Aktionen `BEGLEITER_HINZU` / `BEGLEITER_ENTFERNEN`.

## Stand 6 (05.11.2026): Wirkungen

- `regelwerk/wirkungen.ts` liest `wirkungen_strukturiert` der Stärken und Meisterschaften des Charakters (nur Wirkungen auf ihn selbst).
- **Eingerechnet:** dauerhafte Boni auf benannte Fertigkeiten (z. B. Einfühlsamkeit: Empathie +2) im Fertigkeitswert (`getSkillTotal`,
  also auch bei Proben); Meisterschaftseffekte sind kumulativ (GRW S. 92). Stärken wie Hoher Geistiger Widerstand wirken wie bisher über
  die abgeleiteten Werte und werden nicht doppelt gezählt. Die Fertigkeitspunkte (`getSkillValue`, z. B. für Großmeister) bleiben unberührt.
- **Angezeigt:** Karte „Wirkungen“ unter „Spielen“ mit Eingerechnet / Dauerhaft (Resistenzen, Immunitäten) / In bestimmten Lagen /
  Bei Manövern; grünes Kästchen am Fertigkeitswert zeigt den Bonus und seine Quellen.
- Datenkorrektur dabei: Wirkungen der Beschwörer-Meisterschaften aus „Die Magie“ betreffen das Wesen, nicht den Zauberer
  (neues Buchpaket `magie.srp.json` nötig).

## Stand 7 (05.11.2026): Charaktere mit Regel-IDs

- Beim Speichern (Browserspeicher) und beim Export steht unter `regelIds` zu jedem Namen die ID aus den Regelpaketen: Rasse,
  Stärken, Schwächen, Ressourcen, Meisterschaften („Fertigkeit|Name“), Zauber („Schule|Name“) und die geladenen Pakete (Prüfsumme).
  Die Namen bleiben das führende Format; alte Charaktere ohne IDs laden wie bisher und erhalten die IDs beim nächsten Speichern.
- Beim Laden mit Regelpaketen (`regelwerk/useNamensAbgleich.ts`, Logik in `regelwerk/ids.ts`): Passt ein Name nicht mehr, die
  gespeicherte ID aber schon (auch über Umbenennungen und Regelgruppen), wird der Name aktualisiert; ein Hinweis nennt die Änderungen.
  Einträge aus nicht geladenen Büchern bleiben unverändert und behalten ihre ID.
- Behoben: Erschaffung nach Regelwerk (Stand 3) und Begleiter (Stand 5) gingen beim Neuladen der Seite verloren (`hydrateState`).

## Stand 8 (05.11.2026): „Admin & Ressourcen“ entfernt (Repository FOKUS-1.2)

- Arbeitsstand liegt jetzt in `JazzJackRabite/FOKUS-1.2` (aus Google AI Studio: npm statt Bun, Entwicklungsserver auf Port 3000,
  `.env.example`). Die Versionsgeschichte der Stände 1–7 liegt in `JazzJackRabite/FOKUS-1.0-claudeedition`.
- Entfernt: Reiter „Admin & Ressourcen“ in den Einstellungen, Admin-Konsole (Module, Beschreibungen ändern, Datenmodell,
  SQLite-Explorer), PIN-Schutz, Ressourcen-Backup, die Demo-Module „Mondstahlklingen“/„Götter & Dämonen“, der JSON-Modulimport,
  `sqliteService` und die Abhängigkeit `sql.js`.
- Bücher kommen nur noch über Einstellungen → Regelpakete. Alte Einträge der früheren Modul- und Beschreibungsverwaltung im
  Browserspeicher werden nicht mehr gelesen (nicht gelöscht).

## Stand 9 (05.11.2026): Bedingte Wirkungen beim Würfeln

- Probe, Angriff und Zauber zeigen einen Abschnitt „Stärken & Meisterschaften“ mit den bedingten Wirkungen, die zu diesem Wurf passen
  können (`situativeBoni()` in `regelwerk/wirkungen.ts`, Anzeige in `components/play/SituativeBoni.tsx`). Der Spieler klickt an,
  was in der Lage zutrifft; der Bonus fließt in den Wurf und steht im Würfelprotokoll.
- Zugeordnet: Boni auf die gewürfelte Fertigkeit (auch Waffen- und Magieschulfertigkeit), auf „Proben“ allgemein, auf Angriffe
  (Nahkampfangriffe nicht bei Schuss-/Wurfwaffen) und auf Zauber. Zusatzschaden, SR ignorieren und Schadensboni erscheinen beim
  Angriff nur als Hinweis; Manöver-Wirkungen stecken weiter in der Manöverauswahl.
- Ohne Regelpakete oder ohne passende Wirkung erscheint der Abschnitt nicht.

## Stand 10 (06.11.2026): Ausrüstung aus den Buchpaketen

- Vorher kam die Ausrüstung nur aus der eingebauten GRW-Liste (`data/equipment.ts`); Gegenstände, Waffen, Rüstungen usw. der
  hochgeladenen Bücher fehlten. Jetzt liefert `regelwerk/ausruestung.ts` → `alleAusruestung()` die GRW-Liste plus alle
  Ausrüstungs-Einträge der Bücher (mit allen Büchern rund 820): Waffen, Rüstungen, Schilde, Gegenstände, Kleidung, Projektile,
  Ausrüstungssätze, Alchemika, Kräuter, Gifte, Material, Verbesserungen und magische Gegenstände – mit Werten, Quelle und Seite.
- Inventar („Gegenstand hinzufügen“, Filter nach Quelle) und Kampf-Tab (Waffe bzw. Rüstung/Schild auswählen) nutzen diese Liste.
  Bei mehr als 50 Treffern weist das Inventar darauf hin, die Suche zu verfeinern.
- Änderungen der Bücher an GRW-Ausrüstung: „ersetzt“ übernimmt die neuen Werte (z. B. Waffenlos mit Freihändig, Mondstahlklingen
  S. 111) und nennt die Änderung in der Beschreibung; Beschreibungen aus „ergaenzt“ (vor allem Mondstahlklingen) werden angehängt.
- Doppelte Einträge mehrerer Bücher fasst der Lader über die Regelgruppen zusammen; sie erscheinen einmal.
- Tests: `regelwerk/__tests__/ausruestung.test.ts` (Testbuch; mit `FOKUS_BUECHER` zusätzlich: jeder Ausrüstungs-Eintrag aller
  Bücher genau einmal in der Liste).
- Noch nicht im Editor: Nachschlage-Inhalte wie Gottheiten, Reliktkräfte, Abrichtungen, Golembausteine, Feenwelten.

## Stand 11 (06.11.2026): Wirkungen vollständig gesichtet

- Neue Regeldaten (`public/regelpakete/grw.srp.json`): Die Wirkungen aller Stärken, Meisterschaften und Zauber sind gesichtet –
  jeder Satz mit Zahl ist entweder strukturiert erfasst oder bewusst Text (mit Grund). Gruppe A (Charakter und Würfe) und
  B (Zaubermechanik: Kosten, Zauberdauer, Schaden …). Über alle Bücher 804 Wirkungen statt bisher 296.
- Neue Felder: `gruppe` (A/B), `pro_eg`, `einheit`, `quelle_wirkung` („erfassung“ = gesichtet), Träger `gegner` (Würfe anderer
  gegen den Charakter), Werte auch als Attributkürzel (z. B. „VER“ bei Begabter Alchemist).
- Editor: Meisterschaften mit dauerhaften Wirkungen auf abgeleitete Werte werden eingerechnet (z. B. Sprinter GSW +1, Gute Reflexe
  VTD +1, Blitzreflexe INI −3); situative Boni in Höhe eines Attributs werden mit dem Attributwert angeboten.
- Buchpakete neu erzeugt: Wer Bücher schon hochgeladen hat, lädt sie neu hoch.

## Nächste Schritte

Die geplanten Schritte sind erledigt. Offen bleiben Ideen wie Spielhilfen für bedingte Wirkungen (z. B. Bonus gegen Typus per Klick
anwenden) oder Werte der Begleiter im Kampf.

## Stand 12 (06.11.2026): Zaubermechanik aus Meisterschaften im Zauber-Dialog

- Neuer Abschnitt „Kosten & Zauberdauer aus Meisterschaften“ im Zauber-Dialog: je Meisterschaft ein Knopf zum Anklicken
  (z. B. Sparsamer Zauberer, Eiliger Schutz, Auge des Zauberers mit Zauberdauer und Kosten gemeinsam). Gewählte Änderungen
  fließen in Grundkosten, Fokusabzug, Zauberdauer und die Zusammenfassung ein; Schwierigkeit, Wirkungsdauer, Zusatzschaden u. Ä.
  erscheinen als Hinweis. „(K)2V1“ richtet sich nach dem Zauber, „4V1 oder K3V1“ wählt die passende Variante, Mindestkosten 1.
- Magieschule beachtet: Meisterschaften einer Schule gelten nur für deren Zauber, allgemeine Magiemeisterschaften nur für die
  Schulen, unter denen der Charakter sie führt. Das gilt jetzt auch für die anklickbaren Würfelboni auf Zauber.
- Regelfehler behoben (Ausgangsstand): Fokuskosten mit V wurden doppelt gezählt („5V2“ = 7 Fokus). Nach GRW (Kanalisierte
  Zauber: „K6V2 sind 6 kanalisierte Punkte Fokus insgesamt, davon werden 2 sofort verzehrt“) kostet 5V2 insgesamt 5 Fokus:
  3 erschöpft, 2 verzehrt. Alte Tests auf die Buchregel umgestellt.
- Code: `zauberAnpassungen`, `kostenDelta`, `kostenAnwenden`, `zauberdauerAnpassen`, `giltFuerSchule` in `regelwerk/wirkungen.ts`;
  `useZauberAnpassungen`/`ZauberAnpassungen` in `components/play/SituativeBoni.tsx`. Tests: `zauberWirkungen.test.tsx`. 246 Tests grün.

## Stand 13 (06.11.2026): Probenboni nur bei passenden Fertigkeiten

- Fehler: Wirkungen auf „Proben“ ohne benannte Fertigkeit (z. B. Orientierungssinn „Proben zur Orientierung“, Geländekunde)
  erschienen bei jeder Fertigkeitsprobe, auch bei Alchemie.
- Regelpakete: solche Wirkungen tragen jetzt `fertigkeit_refs` (für welche Fertigkeiten sie gelten) oder `alle_proben: true`
  (z. B. Kühler Kopf). Zuordnung auf der Datenseite in `wirkungen_probenbezug.json` (nur IDs); Meisterschaften ohne Eintrag
  gelten für ihre eigene Fertigkeit. Neues GRW-Paket in `public/regelpakete`.
- Editor: Boni auf „Proben“ nur bei den zugeordneten Fertigkeiten bzw. bei „alle Proben“; ohne Zuordnung nicht im Würfeldialog
  (weiter in der Karte „Wirkungen“). Tests angepasst. 246 Tests grün.

## Stand 14 (06.11.2026): Relikte bauen (Relikt-Werkstatt im Inventar)

- Neue Karte „Relikte“ im Inventar mit der Relikt-Werkstatt (`components/relikte/ReliktKarte.tsx`, Logik in `regelwerk/relikte.ts`):
  Name, Grundgegenstand aus der Ausrüstungsliste (oder frei), Gegenstandsart, Punkte; Bausteine aus den Regelpaketen hinzufügen,
  mit Anzahl, Zaubergrad und Zauber (Zauberverankerung), Stufe (Stärke) oder freier Auswahl (Schwerpunkt, Schadensart, Typus …).
  Punktezähler und Warnungen (Punkte überschritten, Höchstzahl, falsche Gegenstandsart, fehlende Auswahl, Merkmal nötig,
  Materialqualität, nur eine Variante, mehr als die Höchstpunkte). Es wird nur gewarnt, nichts gesperrt.
- Jedes Relikt hat einen Inventareintrag (Kategorie „Relikt“, Werte des Grundgegenstands, Bausteine in der Beschreibung);
  Speichern aktualisiert ihn, Löschen entfernt beides. Neue Felder `relikte` im Charakter (Speichern, Laden, Import).
  Die Karte zeigt die Punkte der Ressource Relikt und die in Relikten vergebenen Punkte.
- Alle Regeln kommen aus den Paketen (`daten.relikt_baukasten`, `daten.baustein`), nichts davon steht im Code. Nur mit dem
  Grundregelwerk: 8 Verbesserungen (S. 142) und 3 Strukturgeber-Wirkungen (S. 254). Mondstahlklingen bringt weitere
  Verbesserungen und legendäre Kräfte, Die Götter göttliche Kräfte und besondere Materialien.
- Neues GRW-Paket in `public/regelpakete` (Herstellung, Verbesserungen, Artefaktwirkungen; 1539 Einträge). Buchpakete neu hochladen.
- Noch nicht: Wertänderungen der Bausteine auf Waffe/Rüstung, GW/KW und Zauberverankerung im Magie-Bereich (nächster Stand);
  Wachsen mit Chronik und beseelte Gegenstände (danach).
- Tests: `regelwerk/__tests__/relikte.test.tsx` (Baukasten, Kosten wie im GRW-Beispiel S. 142, Warnungen, Inventareintrag,
  Reducer, Werkstatt; mit `FOKUS_BUECHER` die Bausteine der Erweiterungen). Referenz des Python-Laders für den Katalog neu erzeugt.
  251 Tests grün (mit Büchern).

## Tab „Begleiter“, Teil 1: Tiere (Branch `begleiter-tab`)

- Neuer Tab **Begleiter** (nach Inventar, freigeschaltet wie die anderen Spiel-Tabs). Die Karte „Begleiter“ ist aus dem Inventar
  hierher umgezogen und aufgeteilt in **Tiere** und **Beschworene Wesen** (Dienste wie bisher).
- **Tiere:** alle Tiere mit Wertekasten (Merkmal Kreatur N oder Typus Tier), auch ohne Ressource (gekauft, gezähmt). Je Tier:
  Rufname, zugeordnete Ressource Kreatur (beim Hinzufügen die kleinste freie, die reicht), Qualität, Vertrauter (Stärke
  Tiervertrauter), Notiz. Warnungen: mehr/höhere Kreatur-Zuordnungen als Ressourcen, mehrere Vertraute, Vertrauter ohne Stärke.
  Reittiere werden erkannt (Typus Reittier oder Grundausbildung Reittier I).
- **Abrichtungen und Potenzial (Bestienmeister S. 15–23, nur mit Buchpaket):** Potenzial = Grundwert/Qualität + 2 je Kreatur +
  3 Tiervertrauter + Tierspezialist (je 1) + Meister der Bestien (2) + Meisterbändiger (1, nur Kreatur), mit Aufschlüsselung.
  Abrichtungen nach Gruppen wählbar, Kosten in Potenzialpunkten, Mehrfachwahl („maximal viermal“, „einmal pro HG“ …).
  Grundausbildungen (Reittier I, Kampfgefährte …) kosten 1 und brauchen zusätzlich die Voraussetzung der Abrichtung
  „Grundausbildung“ (Dompteur). Voraussetzungen werden geprüft – auch die des Tieres (`traeger: "tier"`: Typus, Größenklasse,
  frühere Abrichtungen) und gestaffelte je Wahl (Kämpfer). Nicht erfüllte Voraussetzungen sind markiert, blockieren aber nicht.
- Grenzen: Boni aus Abrichtungen sind im Wertekasten noch nicht eingerechnet (die Daten haben dafür keine strukturierten Wirkungen).
  Datenfehler: „Kleiner Trick“ verlangt Dompteur vom Tier statt vom Tierführer (`traeger: "tier"` zu viel).
- Code: `regelwerk/begleiter.ts` (alleTiere, abrichtungen, mehrfachGrenze, tierTraeger, pruefeAbrichtung, potenzial),
  `components/begleiter/{TierAbschnitt,WesenAbschnitt,Wertekasten}.tsx`, `features/begleiter/BegleiterView.tsx`,
  Aktion `BEGLEITER_AENDERN`, Import der neuen Felder. Tests: `begleiter.test.tsx` (mit Bestienmeister lokal).

## Tab „Begleiter“, Teil 2: Gefolge (Branch `begleiter-teil2`)

- Neuer Abschnitt **Gefolge** im Tab „Begleiter“ (Ressource Gefolge, GRW S. 77–78), nur Grundregelwerk nötig; Kulturen und Rassen
  aus geladenen Buchpaketen erscheinen mit.
- **Gefolgsmann:** Rasse und Kultur beim Hinzufügen; Rufname, Aufgabe (Leibdiener, Knappe, Leibwächter …), Notiz. Attribute
  2 + Rassenmodifikator mit Wahl der freien Boni (auch „unterschiedlich“, „nicht Stärke“). Werte des Kulturmoduls mit derselben
  Wahl wie bei der Erschaffung (Fertigkeitspunkte inkl. „eine Magieschule“, Stärke, Meisterschaft). Rassenstärken kommen dazu.
  Abgeleitete Werte nach den GRW-Formeln (Heldengrad 1), Fertigkeitswert = Punkte + Attribute (Kampffertigkeiten: „+ Waffe“).
- **Gefolge-Punkte:** 1 je Gefolgsmann, 1 je Fertigkeit auf der ersten Schwelle (6 Punkte, auch Fertigkeiten außerhalb der
  Kultur), 1 je Meisterschaft bzw. Zauber über den freien. Frei: eine Meisterschaft je angehobener Fertigkeit, Zauber nach der
  Erschaffungsregel (je Magieschule ab 1/3/6 Punkten einer; Zaubergrad n ab 3·n Punkten). Warnung, wenn die Ressource nicht
  reicht oder eine Fertigkeit über dem Höchstwert des Heldengrads des Abenteurers liegt. Meisterschaften: Schwelle 1 ab 1 Punkt,
  allgemeine Meisterschaftsgruppen über jede passende Fertigkeit.
- Code: `regelwerk/gefolge.ts` (gefolgeWerte, kulturWerte, gruppenOptionen, meisterschaftsAngebot, zauberAngebot),
  `components/begleiter/GefolgeAbschnitt.tsx`, Typ `Begleiter` um `art: 'gefolge'` und die Gefolge-Felder erweitert, Import.
  Tests: `gefolge.test.tsx`.

## Tab „Begleiter“, Teil 3: Erhobene Untote und Golems (Branch `begleiter-teil2`)

- **Modifikationen-Texte** (`regelwerk/modifikationen.ts`): „KON +1, STÄ +1; LP +1, VTD +2; Angriff +1, INI −1; Athletik +2;
  zusätzliches Merkmal: …; Merkmal Pazifist entfällt; GK +1 (maximal 7); Waffenmerkmal …“ werden ausgelesen und auf den
  Wertekasten angewendet (Attribute, abgeleitete Werte, Waffen mit Wert/Schaden/WGS/INI, Fertigkeiten, Merkmale, „Zerbrechlich wird
  zu Schwächlich …“ samt LP +1 nach S. 207). Wahlen und Freitexte („ein beliebiges Attribut +1“, freie Punkte/Meisterschaften)
  bleiben als Hinweis für den Feinschliff bzw. die Spielleitung.
- **Erhobene Untote** (Die Magie S. 182–184, nur mit Erhebungszauber im Katalog): Zauber → Wertesatz (Untote erheben:
  Wandelnder Leichnam/Skelett, Totentier: Gruftkatze/Wimmelnder Schrecken, Grabesbestie: Ghul/Seuchenbringer, Der letzte Ruf:
  Knochenschänder/Mumie). Verstand 0. EP aus der Verstärkung (10/15/25/35), mehrfach nur mit Nekromant. Steigerung „von 0 an“
  (Fertigkeitspunkte 3/5/7/9 EP, Attribute 10/15/20 …), Attribute wirken auf abgeleitete Werte (Formeln des GRW), Fertigkeiten
  und Angriff (BEW + STÄ); Pseudo-Fertigkeit „Angriff (Waffen)“. Grenze der neuen Punkte nach Zaubergrad (1–2 → HG 1 …),
  freie Meisterschaft ab 6/9/12/15 Punkten, keine Magieschulen, kein Arkane Kunde/Geschichte und Mythen. Abnormität (5 EP,
  Meister der Abnormitäten) mit ihren Modifikationen.
- **Golems** (Die Magie S. 197–207, nur mit Buchpaket): Korpus (Klein/Mittel/Groß), Material (Schritt 2, mit Schwachpunkt),
  Zusätzliche Fähigkeiten, Rollen (Kämpfer braucht Aggressiv), Applikationen (zwei frei bzw. eine je Stufe über die Ressource
  Golem; jede weitere +1 Schwierigkeit, +3 Fortschrittspunkte und ein Schwachpunkt), Schwachpunkte (Anfällig, Feingliedrig,
  Langsam auch in Zahlen), Instruktionen (Folge/Warte immer, eine weitere + „Zusätzliche Instruktion“), Verfügungen,
  Sonderausstattung (eine je zwei Stufen). Ausgabe: Stufe des Merkmals Golem mit Aufschlüsselung, Werte, passender
  Animierungszauber, Konstruktionsprobe, Kaufpreis, Meisterschaftsschwelle für den Feinschliff, Ressource Golem.
- Datenlücke: Skelett, Wandelnder Leichnam, Ghul (GRW-Bestiarium) sowie Mumie und Seuchenbringer (Bestien & Ungeheuer) haben
  keine Werte in den Paketen; diese Untoten lassen sich anlegen und steigern, der Editor verweist auf die Buchseite.
- Code: `regelwerk/{modifikationen,untote,golem}.ts`, `components/begleiter/{UntotAbschnitt,GolemAbschnitt}.tsx`, Typ `Begleiter`
  (`art: 'golem' | 'untoter'`, Felder für Bausteine und Steigerung), Import. Tests: `untoteGolems.test.tsx`. 269 Tests grün.
- Offen: Vertraute aus „Die Magie“, Baukasten für beschwörbare Wesen (Magie S. 193–196) und für Bestien (Bestienmeister),
  Begleiter im Kampf-Tab, Boni aus Abrichtungen im Wertekasten, fehlende Bestiarium-Werte auf der Datenseite.

## Google AI Studio

Unverändert eine Vite-/React-App mit `metadata.json` im Wurzelordner; Import über „Import from GitHub“, Hosting über Cloud Run.
Neue Abhängigkeiten gibt es nicht. Die Regelpakete liegen in `public/` und werden zur Laufzeit geladen.
