/**
 * Golems (Die Magie S. 197–207): Baukasten mit Korpus, Material, Zusätzlichen Fähigkeiten, Rollen, Applikationen,
 * Schwachpunkten, Instruktionen, Verfügungen und Sonderausstattung.
 * - Stufe des Merkmals Golem = Korpus + Zuschläge der Zusätzlichen Fähigkeiten und Rollen.
 * - Jeder Golem hat automatisch zwei Applikationen; jede weitere erschwert die Konstruktion (+1 Schwierigkeit, +3 Fortschritts-
 *   punkte) und verlangt einen weiteren Schwachpunkt. Mit der Ressource Golem: eine Applikation je Stufe.
 * - Instruktionen Folge und Warte hat jeder Golem, dazu eine weitere; mehr über die Applikation „Zusätzliche Instruktion“.
 * - Sonderausstattung: eine je zwei Stufen (Schritt 5: Feinschliff).
 * - Preis (Kasten „Einen Golem kaufen“): 50 L je Stufe, 10 L je zusätzlicher Applikation nach der ersten, 5 L je Sonderausstattung.
 * - Konstruktion: erweiterte Probe gegen 20 + 2 × Stufe, Fortschrittspunkte 2 × Stufe (S. 200).
 */
import type { Verstoss } from '../fundament/hausregeln';
import type { Katalog } from './katalog';
import type { Eintrag } from './typen';
import type { Begleiter } from '../types';
import {
  anwenden, leer, leseModifikationen, mehrfachAusText, summe, werteblock, type Modifikationen, type Werteblock,
} from './modifikationen';

export const BAUSTEIN_ARTEN = ['Zusätzliche Fähigkeit', 'Rolle', 'Applikation', 'Schwachpunkt', 'Instruktion', 'Verfügung'] as const;
export const IMMER_INSTRUKTIONEN = ['Folge', 'Warte'];

export const korpusse = (k: Katalog) => Object.values(k.eintraege).filter(e => e.typ === 'golem_baustein' && e.daten.baustein === 'Korpus')
  .sort((a, b) => korpusStufe(a) - korpusStufe(b));
export const materialien = (k: Katalog) => Object.values(k.eintraege).filter(e => e.typ === 'material' && e.daten.art === 'Golemmaterial')
  .sort((a, b) => a.name.localeCompare(b.name, 'de'));
export const bausteine = (k: Katalog, art: string) => Object.values(k.eintraege)
  .filter(e => e.typ === 'golem_baustein' && e.daten.baustein === art).sort((a, b) => a.name.localeCompare(b.name, 'de'));

/** Stufe des Merkmals Golem eines Korpus („Golem 3“) */
export function korpusStufe(e: Eintrag): number {
  const r = (e.daten.merkmale_refs ?? []).find((x: { id?: string }) => /:golem$/.test(x.id ?? ''));
  if (r?.stufe) return Number(r.stufe);
  const m = String(e.daten.werte?.merkmale ?? '').match(/Golem (\d+)/);
  return m ? Number(m[1]) : 1;
}

/** Wie oft darf ein Baustein gewählt werden? Rollen beliebig oft (S. 205), sonst nach Beschreibung */
export function hoechstens(e: Eintrag): number {
  return e.daten.baustein === 'Rolle' ? Infinity : mehrfachAusText(e.daten.beschreibung);
}

/** Voraussetzung „Voraussetzung: Zusätzliche Fähigkeit Aggressiv“ → Name */
export function voraussetzung(e: Eintrag): string | null {
  return String(e.daten.beschreibung ?? '').match(/Voraussetzung: (?:Zusätzliche Fähigkeit )?([^;,.]+)/)?.[1]?.trim() ?? null;
}

/** Zahlen der Schwachpunkte, die die Beschreibung nur als Prosa nennt */
function schwachpunktModifikation(e: Eintrag): Modifikationen {
  const m = leer();
  if (/:anfaellig$/.test(e.id)) { m.abgeleitet.VTD = -1; m.abgeleitet.GW = -1; m.abgeleitet.KW = -1; }
  else if (/:feingliedrig$/.test(e.id)) { m.abgeleitet.SR = -1; m.abgeleitet.LP = -1; }
  else if (/:langsam$/.test(e.id)) { m.abgeleitet.GSW = -3; }
  return m;
}

/** Sonderausstattung (Tabelle Schritt 5): Zeilen mit zwei Möglichkeiten („SR +2“ oder „Applikation Gefügig (x2)“) */
export function sonderausstattungen(k: Katalog): { optionen: string[]; material: string }[] {
  const r = Object.values(k.eintraege).find(e => e.typ === 'regel' && /baukasten-schritt-5-feinschliff$/.test(e.id));
  const t = (r?.daten.tabellen ?? []).find((x: { kopf: string[] }) => x.kopf?.[0] === 'Wirkung');
  return (t?.zeilen ?? []).map((z: string[]) => ({ optionen: z[0].split(/ oder /).map(s => s.trim()), material: z[1] }));
}

/** Höchste Meisterschaftsschwelle nach Stufe des Merkmals Golem (Tabelle Schritt 5) */
export function golemSchwelle(k: Katalog, stufe: number): number {
  const r = Object.values(k.eintraege).find(e => e.typ === 'regel' && /baukasten-schritt-5-feinschliff$/.test(e.id));
  const t = (r?.daten.tabellen ?? []).find((x: { kopf: string[] }) => x.kopf?.[0] === 'Stufe');
  for (const [bereich, schwelle] of (t?.zeilen ?? []) as string[][]) {
    const [von, bis] = bereich.split('-').map(Number);
    if (stufe >= von && stufe <= (bis || von)) return Number(schwelle);
  }
  return stufe >= 9 ? 4 : 1;
}

/** Animierungszauber, der einen Golem dieser Stufe animieren kann („Merkmal Golem 3 oder niedriger“) */
export function animierung(k: Katalog, stufe: number): Eintrag | null {
  const z = Object.values(k.eintraege).filter(e => e.typ === 'zauber' && (e.daten.typus ?? []).includes('Animierung'))
    .map(e => ({ e, bis: Number(String(e.daten.wirkung ?? '').match(/Merkmal Golem (\d+)/)?.[1] ?? 0) }))
    .filter(x => x.bis >= stufe).sort((a, b) => a.bis - b.bis);
  return z[0]?.e ?? null;
}

export interface GolemWerte {
  korpus: Eintrag | undefined;
  stufe: number;
  stufePosten: { text: string; wert: number }[];
  werte: Werteblock | null;
  /** gewählte Bausteine je Art (Einträge in Reihenfolge) */
  gewaehlt: Record<string, Eintrag[]>;
  applikationenFrei: number;
  applikationenExtra: number;
  schwachpunkteNoetig: number;
  materialSchwachpunkt: string | null;
  instruktionenErlaubt: number;
  verfuegungenAktiv: number | null;
  sonderausstattungPlaetze: number;
  meisterschaftSchwelle: number;
  preis: number;
  konstruktion: { schwierigkeit: number; fortschritt: number };
  animierung: Eintrag | null;
  feinschliff: string[];
  hinweise: string[];
  /** Hinweise, die ein Regelverstoß sind */
  verstoesse: Verstoss[];
}

export function golemWerte(k: Katalog, b: Begleiter): GolemWerte {
  const korpus = k.get(b.id);
  const hinweise: string[] = [];
  const verstoesse: Verstoss[] = [];
  const verstoss = (text: string, schluessel: string, mass = 1) => { hinweise.push(text); verstoesse.push({ text, schluessel, mass }); };
  const gewaehlt: Record<string, Eintrag[]> = Object.fromEntries(BAUSTEIN_ARTEN.map(a => [a, []]));
  for (const i of b.bausteine ?? []) { const e = k.get(i); if (e?.typ === 'golem_baustein' && gewaehlt[e.daten.baustein]) gewaehlt[e.daten.baustein].push(e); }
  const anzahl = (e: Eintrag) => (b.bausteine ?? []).filter(x => x === e.id).length;

  const stufePosten = [{ text: `Korpus ${korpus?.name ?? '?'}`, wert: korpus ? korpusStufe(korpus) : 0 }];
  for (const e of [...gewaehlt['Zusätzliche Fähigkeit'], ...gewaehlt.Rolle]) {
    const z = Number.parseInt(String(e.daten.stufe_merkmal_golem ?? '0').replace('+', ''), 10) || 0;
    if (z) stufePosten.push({ text: e.name, wert: z });
  }
  const stufe = stufePosten.reduce((s, p) => s + p.wert, 0);

  // Mehrfachwahl und Voraussetzungen
  for (const e of new Set(Object.values(gewaehlt).flat())) {
    if (anzahl(e) > hoechstens(e)) verstoss(`${e.name} ist höchstens ${hoechstens(e)}-mal wählbar`, `anzahl:${e.id}`, anzahl(e) - hoechstens(e));
    const v = voraussetzung(e);
    if (v && !Object.values(gewaehlt).flat().some(x => x.name === v)) verstoss(`${e.name} setzt ${v} voraus`, `voraus:${e.id}`);
  }
  const material = b.material ? k.get(b.material) : undefined;
  if (!material) hinweise.push('Material wählen (Schritt 2)');
  const materialSchwachpunkt: string | null = material?.daten.felder?.schwachpunkt ?? null;

  const applikationenFrei = b.golemRessource ? Math.max(2, stufe) : 2;
  const applikationenExtra = Math.max(0, gewaehlt.Applikation.length - applikationenFrei);
  const schwachpunkteNoetig = applikationenExtra;
  if (gewaehlt.Schwachpunkt.length < schwachpunkteNoetig)
    verstoss(`Für ${applikationenExtra} zusätzliche Applikation${applikationenExtra > 1 ? 'en' : ''} fehlen ${schwachpunkteNoetig - gewaehlt.Schwachpunkt.length} Schwachpunkt(e)`, 'schwachpunkte', schwachpunkteNoetig - gewaehlt.Schwachpunkt.length);
  const instruktionenErlaubt = 1 + gewaehlt.Applikation.filter(e => /zusaetzliche-instruktion$/.test(e.id)).length;
  const instr = gewaehlt.Instruktion.filter(e => !IMMER_INSTRUKTIONEN.includes(e.name));
  if (instr.length > instruktionenErlaubt) verstoss(`Mehr Instruktionen (${instr.length}) als implementierbar (${instruktionenErlaubt}); weitere über die Applikation Zusätzliche Instruktion`, 'instruktionen', instr.length - instruktionenErlaubt);
  const verfuegungenAktiv = b.golemRessource ? Math.max(1, stufe) : null;
  if (verfuegungenAktiv !== null && gewaehlt['Verfügung'].length > verfuegungenAktiv) verstoss(`Höchstens ${verfuegungenAktiv} aktive Verfügungen (Ressource Golem)`, 'verfuegungen', gewaehlt['Verfügung'].length - verfuegungenAktiv);
  const sonderausstattungPlaetze = Math.floor(stufe / 2);
  const sa = (b.sonderausstattung ?? []).slice(0, sonderausstattungPlaetze).filter(Boolean);
  if ((b.sonderausstattung ?? []).filter(Boolean).length > sonderausstattungPlaetze) verstoss(`Höchstens ${sonderausstattungPlaetze} Sonderausstattung(en)`, 'sonderausstattung', (b.sonderausstattung ?? []).filter(Boolean).length - sonderausstattungPlaetze);

  // Werte
  let werte: Werteblock | null = null;
  const feinschliff: string[] = [];
  if (korpus) {
    const grund = werteblock(k, { ...korpus.daten.werte, fertigkeiten_refs: korpus.daten.fertigkeiten_refs });
    const mods: Modifikationen[] = [];
    if (material) mods.push(leseModifikationen(k, material.daten.felder?.modifikationen));
    const matSp = materialSchwachpunkt ? bausteine(k, 'Schwachpunkt').find(e => e.name === materialSchwachpunkt) : undefined;
    if (matSp) mods.push(schwachpunktModifikation(matSp));
    for (const e of [...gewaehlt['Zusätzliche Fähigkeit'], ...gewaehlt.Rolle]) mods.push(leseModifikationen(k, String(e.daten.beschreibung).replace(/^Voraussetzung:[^;]*;\s*/, '')));
    for (const e of gewaehlt.Schwachpunkt) mods.push(schwachpunktModifikation(e));
    for (const s of sa) mods.push(leseModifikationen(k, s));
    const m = summe(...mods);
    werte = anwenden(k, grund, m);
    werte.merkmale = werte.merkmale.map(x => (/^Golem \d+$/.test(x) ? `Golem ${stufe}` : x));
    feinschliff.push(...m.rest.filter(r => !/^Applikation /.test(r)));
  }
  for (const s of sa) if (/^Applikation /.test(s)) feinschliff.push(`Sonderausstattung: ${s}`);

  const preis = 50 * stufe + 10 * Math.max(0, applikationenExtra - 1) + 5 * sa.length;
  return {
    korpus, stufe, stufePosten, werte, gewaehlt, applikationenFrei, applikationenExtra, schwachpunkteNoetig, materialSchwachpunkt,
    instruktionenErlaubt, verfuegungenAktiv, sonderausstattungPlaetze, meisterschaftSchwelle: golemSchwelle(k, stufe),
    preis, konstruktion: { schwierigkeit: 20 + 2 * stufe + applikationenExtra, fortschritt: 2 * stufe + 3 * applikationenExtra },
    animierung: animierung(k, stufe), feinschliff, hinweise, verstoesse,
  };
}
