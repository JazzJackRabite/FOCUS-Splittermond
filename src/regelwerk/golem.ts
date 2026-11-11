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
import { ABGELEITET_ID } from './abgeleitet';
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

/** Wahl beim Feinschliff, aus dem Text eines Bausteins gelesen (Zahlen aus dem Paket) */
export type GolemWahl = { schluessel: string; quelle: string; text: string } & (
  | { art: 'attribut'; optionen: string[]; bonus: number }
  | { art: 'meisterschaft'; schwelle: number }
  | { art: 'fertigkeit'; neu: number; plus: number }
  | { art: 'punkte'; anzahl: number; max: number }
);

const ALLE_ATTRIBUTE = ['AUS', 'BEW', 'INT', 'KON', 'MYS', 'STÄ', 'VER', 'WIL'];

/** Wahl-Texte eines Bausteins → Wahlen; übrige Texte bleiben Text. feste: „zusätzliche Meisterschaften: …“ ohne Wahl */
export function leseWahlen(rest: string[], quelle: string, quellId: string, schwelleSchritt5: number): { wahlen: GolemWahl[]; text: string[]; feste: string[] } {
  const wahlen: GolemWahl[] = []; const text: string[] = []; const feste: string[] = [];
  let n = 0;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const neu = (w: Record<string, any>) => wahlen.push({ ...w, schluessel: `${quellId}#${n++}`, quelle } as GolemWahl);
  for (const r0 of rest) {
    const r = r0.trim();
    let m: RegExpMatchArray | null;
    if ((m = r.match(/^ein beliebiges Attribut \+(\d+)$/))) { neu({ art: 'attribut', optionen: ALLE_ATTRIBUTE, bonus: Number(m[1]), text: r }); continue; }
    if ((m = r.match(/^((?:[A-ZÄ]{3} oder )+[A-ZÄ]{3}) \+(\d+)$/))) { neu({ art: 'attribut', optionen: m[1].split(' oder '), bonus: Number(m[2]), text: r }); continue; }
    if ((m = r.match(/^eine noch nicht freigeschaltete Fertigkeit auf (\d+) oder eine bestehende \+(\d+)$/))) { neu({ art: 'fertigkeit', neu: Number(m[1]), plus: Number(m[2]), text: r }); continue; }
    if ((m = r.match(/^(\d+) freie Fertigkeitspunkte[^(]*\(max\. \+(\d+) pro Fertigkeit\)$/))) { neu({ art: 'punkte', anzahl: Number(m[1]), max: Number(m[2]), text: r }); continue; }
    const frei = [...r.matchAll(/eine freie Meisterschaft \[Schwelle (\d+|siehe Schritt 5)\]/g)];
    if (frei.length) {
      for (const f of frei) neu({ art: 'meisterschaft', schwelle: /^\d+$/.test(f[1]) ? Number(f[1]) : schwelleSchritt5, text: f[0] });
      continue;
    }
    if ((m = r.match(/^zusätzliche Meisterschaften?: (.+)$/))) { feste.push(m[1]); continue; }
    text.push(r);
  }
  return { wahlen, text, feste };
}

/**
 * Getroffene Wahlen des Feinschliffs anwenden (Attribut mit Wirkung auf abgeleitete Werte und Fertigkeiten, Meisterschaft bis
 * zur erlaubten Schwelle, Fertigkeit neu/erhöht, freie Punkte mit Höchstwert je Fertigkeit). Gemeinsam für Golem und Wesen-Baukasten.
 */
export function wahlenAnwenden(
  k: Katalog, werte: Werteblock, wahlen: GolemWahl[], feste: string[], fs: Record<string, string | Record<string, number>>,
  verstoss: (text: string, schluessel: string, mass?: number) => void, wer: string,
): void {
  const R = k.get(ABGELEITET_ID)?.daten.strukturiert;
  const kurzName: Record<string, string> = { AUS: 'Ausstrahlung', BEW: 'Beweglichkeit', INT: 'Intuition', KON: 'Konstitution', MYS: 'Mystik', 'STÄ': 'Stärke', VER: 'Verstand', WIL: 'Willenskraft' };
  const attrVon = (id: string): string[] => (k.get(id)?.daten.attribute ?? []).map((n: string) => Object.keys(kurzName).find(x => kurzName[x] === n)).filter(Boolean);
  const msNeu: string[] = [...feste];
  for (const w of wahlen) {
    const v = fs[w.schluessel];
    if (v === undefined || v === '') continue;
    if (w.art === 'attribut' && typeof v === 'string' && w.optionen.includes(v)) {
      werte.attribute[v] = (werte.attribute[v] ?? 0) + w.bonus;
      // Attribut wirkt auf abgeleitete Werte (Formeln des GRW) und Fertigkeiten
      for (const d of R?.werte ?? []) if ('summe' in d && werte.abgeleitet[d.kuerzel] !== undefined)
        for (const t of d.summe) if ('attribut' in t && t.attribut === kurzName[v]) werte.abgeleitet[d.kuerzel] += (t.faktor ?? 1) * w.bonus;
      werte.fertigkeiten = werte.fertigkeiten.map(f => (f.id && attrVon(f.id).includes(v) ? { ...f, wert: f.wert + w.bonus } : f));
    } else if (w.art === 'meisterschaft' && typeof v === 'string') {
      const e = k.get(v);
      if (e) {
        msNeu.push(`${k.get(e.daten.fertigkeit)?.name ?? ''} (${e.name})`);
        if ((Number(e.daten.schwelle) || 1) > w.schwelle) verstoss(`${e.name}: Schwelle ${e.daten.schwelle} über der erlaubten (${w.schwelle})`, `ms:${w.schluessel}`);
        if (!werte.fertigkeiten.some(f => f.id === e.daten.fertigkeit)) verstoss(`${e.name}: ${wer[0].toUpperCase()}${wer.slice(1)} besitzt die Fertigkeit nicht`, `msf:${w.schluessel}`);
      }
    } else if (w.art === 'fertigkeit' && typeof v === 'string' && k.get(v)) {
      const f = werte.fertigkeiten.find(x => x.id === v);
      if (f) f.wert += w.plus;
      else werte.fertigkeiten.push({ id: v, name: k.get(v)!.name, wert: w.neu + attrVon(v).reduce((s3, a) => s3 + (werte.attribute[a] ?? 0), 0) });
    } else if (w.art === 'punkte' && typeof v === 'object') {
      const summeP = Object.values(v).reduce((s3, x) => s3 + (Number(x) || 0), 0);
      if (summeP > w.anzahl) verstoss(`${w.quelle}: ${summeP} von ${w.anzahl} freien Fertigkeitspunkten verteilt`, `punkte:${w.schluessel}`, summeP - w.anzahl);
      for (const [id, x] of Object.entries(v)) {
        const nP = Number(x) || 0; if (!nP) continue;
        if (nP > w.max) verstoss(`${w.quelle}: höchstens +${w.max} je Fertigkeit`, `max:${w.schluessel}:${id}`, nP - w.max);
        const f = werte.fertigkeiten.find(y => y.id === id);
        if (f) f.wert += nP; else verstoss(`${w.quelle}: Punkte nur auf Fertigkeiten, die ${wer} besitzt`, `fremd:${w.schluessel}:${id}`, nP);
      }
    }
  }
  werte.fertigkeiten.sort((x, y) => x.name.localeCompare(y.name, 'de'));
  if (msNeu.length) werte.meisterschaften = [werte.meisterschaften, ...msNeu].filter(Boolean).join(', ');
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
  /** Freitexte für die Spielleitung */
  feinschliff: string[];
  /** bedienbare Wahlen des Feinschliffs */
  wahlen: GolemWahl[];
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
  const wahlen: GolemWahl[] = [];
  const schwelle5 = golemSchwelle(k, stufe);
  if (korpus) {
    const grund = werteblock(k, { ...korpus.daten.werte, fertigkeiten_refs: korpus.daten.fertigkeiten_refs });
    const mods: Modifikationen[] = [];
    const feste: string[] = [];
    const mitWahl = (m: Modifikationen, quelle: string, id: string) => {
      const w = leseWahlen(m.rest.filter(r => !/^Applikation /.test(r)), quelle, id, schwelle5);
      wahlen.push(...w.wahlen); feinschliff.push(...w.text); feste.push(...w.feste);
      return { ...m, rest: [] };
    };
    if (material) mods.push(leseModifikationen(k, material.daten.felder?.modifikationen));
    const matSp = materialSchwachpunkt ? bausteine(k, 'Schwachpunkt').find(e => e.name === materialSchwachpunkt) : undefined;
    if (matSp) mods.push(schwachpunktModifikation(matSp));
    const zaehler = new Map<string, number>();
    for (const e of [...gewaehlt['Zusätzliche Fähigkeit'], ...gewaehlt.Rolle]) {
      const nr = zaehler.get(e.id) ?? 0; zaehler.set(e.id, nr + 1);
      mods.push(mitWahl(leseModifikationen(k, String(e.daten.beschreibung).replace(/^Voraussetzung:[^;]*;\s*/, '')), e.name, `${e.id}:${nr}`));
    }
    for (const e of gewaehlt.Schwachpunkt) mods.push(schwachpunktModifikation(e));
    sa.forEach((s2, i) => mods.push(mitWahl(leseModifikationen(k, s2), 'Sonderausstattung', `sa:${i}`)));
    const m = summe(...mods);
    werte = anwenden(k, grund, m);
    werte.merkmale = werte.merkmale.map(x => (/^Golem \d+$/.test(x) ? `Golem ${stufe}` : x));

    wahlenAnwenden(k, werte, wahlen, feste, b.feinschliff ?? {}, verstoss, 'der Golem');
  }
  for (const s2 of sa) if (/^Applikation /.test(s2)) feinschliff.push(`Sonderausstattung: ${s2}`);

  const preis = 50 * stufe + 10 * Math.max(0, applikationenExtra - 1) + 5 * sa.length;
  return {
    korpus, stufe, stufePosten, werte, gewaehlt, applikationenFrei, applikationenExtra, schwachpunkteNoetig, materialSchwachpunkt,
    instruktionenErlaubt, verfuegungenAktiv, sonderausstattungPlaetze, meisterschaftSchwelle: schwelle5,
    preis, konstruktion: { schwierigkeit: 20 + 2 * stufe + applikationenExtra, fortschritt: 2 * stufe + 3 * applikationenExtra },
    animierung: animierung(k, stufe), feinschliff, wahlen, hinweise, verstoesse,
  };
}

/** Fertigkeiten, die der Golem besitzt, und Meisterschaften dazu bis zu einer Schwelle */
export function golemMeisterschaften(k: Katalog, fertigkeiten: { id?: string; name: string }[], schwelle: number) {
  const ids = new Set(fertigkeiten.map(f => f.id).filter(Boolean));
  return Object.values(k.eintraege).filter(e => e.typ === 'meisterschaft' && ids.has(e.daten.fertigkeit) && (Number(e.daten.schwelle) || 1) <= schwelle)
    .map(e => ({ id: e.id, name: e.name, fertigkeit: k.get(e.daten.fertigkeit)?.name ?? '', schwelle: Number(e.daten.schwelle) || 1 }))
    .sort((a, b) => a.fertigkeit.localeCompare(b.fertigkeit, 'de') || a.schwelle - b.schwelle || a.name.localeCompare(b.name, 'de'));
}

/** Allgemeine Fertigkeiten (für „eine noch nicht freigeschaltete Fertigkeit“) */
export function allgemeineFertigkeiten(k: Katalog) {
  return Object.values(k.eintraege).filter(e => e.typ === 'fertigkeit' && !e.daten.gruppierte_fertigkeit && e.daten.kategorie !== 'Magieschule' && e.daten.kategorie !== 'Kampffertigkeit')
    .sort((a, b) => a.name.localeCompare(b.name, 'de'));
}

/** Anzeige eines Golem-Bausteins: Art, Zuschlag auf das Merkmal Golem, Beschreibung */
export function bausteinInfo(e: Eintrag | undefined): { art: string; zuschlag: string | null; beschreibung: string } {
  return { art: String(e?.daten.baustein ?? ''), zuschlag: e?.daten.stufe_merkmal_golem ? String(e.daten.stufe_merkmal_golem) : null, beschreibung: String(e?.daten.beschreibung ?? '') };
}
/** Anzeige eines Golemmaterials: Modifikationen und Schwachpunkt */
export function materialInfo(e: Eintrag): string {
  return `${e.daten.felder?.modifikationen ?? ''}; Schwachpunkt ${e.daten.felder?.schwachpunkt ?? '–'}`;
}
/** Größenklasse eines Korpus */
export function korpusGK(e: Eintrag): string {
  return String(e.daten.werte?.abgeleitete_werte?.GK ?? '?');
}
