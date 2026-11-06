/**
 * Wirkungen der Stärken, Meisterschaften und Zauber eines Charakters (daten.wirkungen_strukturiert der Regelpakete).
 *
 * - verrechnet: gilt „immer“ für den Charakter selbst und lässt sich eindeutig einrechnen:
 *     · Bonus/Malus auf benannte Fertigkeiten (z. B. Einfühlsamkeit: +2 Empathie) → Fertigkeitswert
 *     · Meisterschaften auf abgeleitete Werte (z. B. Sprinter: GSW +1, Gute Reflexe: VTD +1, Blitzreflexe: INI −3) → abgeleitete Werte
 *     · Stärken mit Modifikatoren auf abgeleitete Werte (z. B. Hoher Geistiger Widerstand) → schon in abgeleiteteWerte()
 * - dauerhaft: gilt „immer“, ist aber kein Zahlenwert des Bogens (Resistenzen, Immunitäten) → nur Anzeige
 * - bedingt / zauber / manoever: gilt nur in einer Lage, solange ein Zauber wirkt oder beim Manöver → nur Anzeige
 * Wirkungen auf andere (Ziel, beschworenes Wesen, Tier) gehören nicht zum Charakter und werden ausgelassen.
 * Meisterschaftseffekte sind kumulativ (GRW S. 92, „Die Effekte von Meisterschaften sind immer kumulativ“).
 */
import type { Katalog } from './katalog';

export interface Wirkung {
  art: string;
  wert?: number | string;
  bezug?: string;
  auf?: string;
  traeger: string;
  bedingung?: string | null;
  bezug_gruppe?: string;
  gruppe?: 'A' | 'B';
  pro_eg?: number | null;
  einheit?: string;
  quelle_wirkung?: string;
  fertigkeit_refs?: { id: string; text: string }[];
  zustand_ref?: { id: string; text: string };
  schadensart?: string;
  gegen_typus?: string;
  beleg: string;
  gilt: string;
}

export type WirkungsStatus = 'verrechnet' | 'dauerhaft' | 'bedingt' | 'zauber' | 'manoever';

export interface CharakterWirkung {
  quelle: string;
  quelleName: string;
  quelleTyp: string;
  wirkung: Wirkung;
  status: WirkungsStatus;
}

const FUER_CHARAKTER = new Set(['selbst', 'selbst_und_verbuendete']);
/** abgeleitete Werte, die der Editor führt; Meisterschaftswirkungen darauf werden eingerechnet */
const ABGELEITET = new Set(['GSW', 'INI', 'VTD', 'KW', 'GW', 'LP', 'FO']);
const VORZEICHEN: Record<string, number> = { bonus: 1, wert_erhoeht: 1, malus: -1, wert_gesenkt: -1 };

function status(k: Katalog, quelle: string, w: Wirkung): WirkungsStatus {
  if (w.gilt === 'solange der Zauber wirkt') return 'zauber';
  if (w.gilt === 'beim Manöver') return 'manoever';
  if (w.gilt !== 'immer') return 'bedingt';
  if ((w.art === 'bonus' || w.art === 'malus') && w.bezug === 'fertigkeit' && typeof w.wert === 'number' && w.fertigkeit_refs?.length) return 'verrechnet';
  const e = k.get(quelle);
  if (e?.typ === 'meisterschaft' && ABGELEITET.has(String(w.bezug)) && typeof w.wert === 'number' && VORZEICHEN[w.art] !== undefined) return 'verrechnet';
  if (e?.typ === 'staerke' && (e.daten.abgeleitete_werte_modifikatoren ?? []).some((m: { bedingt?: unknown }) => !m.bedingt)) return 'verrechnet';
  return 'dauerhaft';
}

/** Alle Wirkungen der gegebenen Einträge (Stärken mehrfach möglich: je Stufe einmal), die den Charakter selbst betreffen */
export function wirkungenDesCharakters(k: Katalog, ids: string[]): CharakterWirkung[] {
  const out: CharakterWirkung[] = [];
  const gesehen = new Set<string>();
  for (const id of ids) {
    const e = k.get(id);
    if (!e) continue;
    // Stärken mit mehreren Stufen wirken über ihre Modifikatoren; in der Liste reicht ein Eintrag
    if (gesehen.has(e.id)) continue;
    gesehen.add(e.id);
    for (const w of (e.daten.wirkungen_strukturiert ?? []) as Wirkung[]) {
      if (!FUER_CHARAKTER.has(w.traeger)) continue;
      out.push({ quelle: e.id, quelleName: e.name, quelleTyp: e.typ, wirkung: w, status: status(k, e.id, w) });
    }
  }
  return out;
}

export interface FertigkeitsBonus { summe: number; quellen: { name: string; wert: number }[] }

/** Dauerhafte Boni/Mali auf Fertigkeiten, nach Fertigkeitsname des Katalogs (gleich den Namen im Editor) */
export function fertigkeitsBoni(k: Katalog, liste: CharakterWirkung[]): Record<string, FertigkeitsBonus> {
  const out: Record<string, FertigkeitsBonus> = {};
  for (const cw of liste) {
    const w = cw.wirkung;
    if (cw.status !== 'verrechnet' || w.bezug !== 'fertigkeit' || typeof w.wert !== 'number') continue;
    const wert = w.art === 'malus' ? -w.wert : w.wert;
    for (const r of w.fertigkeit_refs ?? []) {
      const name = k.get(r.id)?.name ?? r.text;
      const b = (out[name] ??= { summe: 0, quellen: [] });
      b.summe += wert;
      b.quellen.push({ name: cw.quelleName, wert });
    }
  }
  return out;
}

/** Dauerhafte Änderungen abgeleiteter Werte durch Meisterschaften (Stärken stecken schon in abgeleiteteWerte()) */
export function werteBoni(liste: CharakterWirkung[]): Record<string, { summe: number; quellen: { name: string; wert: number }[] }> {
  const out: Record<string, { summe: number; quellen: { name: string; wert: number }[] }> = {};
  for (const cw of liste) {
    const w = cw.wirkung;
    if (cw.status !== 'verrechnet' || cw.quelleTyp !== 'meisterschaft' || !ABGELEITET.has(String(w.bezug)) || typeof w.wert !== 'number') continue;
    const v = (VORZEICHEN[w.art] ?? 0) * w.wert;
    if (!v) continue;
    const b = (out[String(w.bezug)] ??= { summe: 0, quellen: [] });
    b.summe += v; b.quellen.push({ name: cw.quelleName, wert: v });
  }
  return out;
}

const BEZUG_TEXT: Record<string, string> = {
  proben: 'Proben', angriff: 'Angriffe', nahkampfangriff: 'Nahkampfangriffe', fernkampfangriff: 'Fernkampfangriffe', aktive_abwehr: 'Aktive Abwehr',
  widerstaende: 'Widerstandswerte', fertigkeitsproben_und_widerstaende: 'Fertigkeitsproben und Widerstandswerte', schaden: 'Schaden', wundabzug: 'Wundabzüge',
  behinderung: 'Behinderung', tick_zuschlag: 'Tick-Zuschlag', maximalbonus: 'Höchstbonus', traglast: 'Last', wgs: 'WGS', zustandsabzug: 'Abzüge aus Zuständen',
  zauber: 'Zauber', zauberkosten: 'Zauberkosten', zauberdauer: 'Zauberdauer', reichweite: 'Reichweite', wirkungsdauer: 'Wirkungsdauer', schwierigkeit: 'Schwierigkeit',
  erfolgsgrade: 'Erfolgsgrade', zauberschaden: 'Zauberschaden', sonstiges: '',
};
function bezugText(w: Wirkung): string {
  if (w.bezug === 'fertigkeit' && w.fertigkeit_refs?.length) return w.fertigkeit_refs.map(r => r.text).join(', ');
  const b = String(w.bezug ?? '');
  if (b.startsWith('attributproben:')) return `Proben mit ${b.slice(15)}`;
  if (b.startsWith('attribut:')) return b.slice(9);
  return BEZUG_TEXT[b] ?? b;
}

/** Kurztext einer Wirkung für die Anzeige */
export function wirkungKurz(w: Wirkung): string {
  const z = (w.art === 'malus' || w.art === 'wert_gesenkt' ? '−' : '+') + (w.wert ?? '') + (w.pro_eg ? ` (+${w.pro_eg} je EG)` : '');
  switch (w.art) {
    case 'bonus': case 'malus': return `${z} auf ${(w.auf ?? bezugText(w)).replace(/^(?:seine[nrs]?|ihre[nrs]?|den|die|das) /, '')}`.trim();
    case 'wert_erhoeht': case 'wert_gesenkt': return `${bezugText(w)} ${z}`.trim();
    case 'schaden_gesenkt': return `${w.schadensart ?? 'Schaden'} −${w.wert}`;
    case 'immunitaet': return `immun gegen ${w.zustand_ref?.text ?? ''}`.trim();
    case 'zusatzschaden': return `${w.wert} zusätzlicher Schaden`;
    case 'sr_ignorieren': return `${w.wert} SR ignorieren`;
    case 'zustand': return `Zustand ${w.zustand_ref?.text ?? ''}`.trim();
    case 'wert_gesetzt': return `${w.bezug ?? ''} = ${w.wert}`;
    case 'heilung': return `heilt ${w.wert} ${w.bezug ?? ''}`.trim();
    case 'schaden': return `${w.wert} Schaden`;
    case 'kosten_gesenkt': return `Kosten −${w.wert}`;
    case 'kosten_erhoeht': return `Kosten +${w.wert}`;
    default: return w.beleg;
  }
}

// ---------------------------------------------------------------- Situative Boni beim Würfeln
export type WurfArtKontext = 'probe' | 'angriff' | 'zauber';

export interface SituativerBonus {
  /** eindeutig je Wirkung des Charakters */
  id: string;
  quelle: string;
  /** Bonus (positiv) oder Malus (negativ); null = nur Hinweis, nicht verrechenbar (z. B. Zusatzschaden) */
  wert: number | null;
  text: string;
  bedingung?: string | null;
  beleg: string;
}

const FERNKAMPF = new Set(['Schusswaffen', 'Wurfwaffen']);

/**
 * Bedingte Wirkungen, die zu diesem Wurf passen könnten: Der Spieler entscheidet, ob die Lage zutrifft.
 * - Fertigkeitsboni der gewürfelten Fertigkeit (auch Waffen- und Magieschulfertigkeit), Boni auf „Proben“ allgemein
 * - Angriff: Boni auf Angriffe (Nahkampfangriffe nur im Nahkampf); Zusatzschaden, SR ignorieren und Schadensboni als Hinweis
 *   (Wirkungen „beim Manöver“ stecken in der Manöverauswahl und erscheinen hier nicht)
 * - Zauber: Boni auf Zauber; Schadensboni als Hinweis
 */
const ATTR_EDITOR: Record<string, string> = { AUS: 'AUS', BEW: 'BEW', INT: 'INT', KON: 'KON', MYS: 'MYS', STÄ: 'STA', VER: 'VER', WIL: 'WIL' };

/** Wert einer Wirkung als Zahl: Zahl direkt, Attributkürzel (z. B. „VER“ bei Begabter Alchemist) über die Attribute des Charakters */
export function wertAlsZahl(wert: unknown, attribute?: Record<string, number>): number | null {
  if (typeof wert === 'number') return wert;
  const a = ATTR_EDITOR[String(wert)];
  if (a && attribute && typeof attribute[a] === 'number') return attribute[a];
  return null;
}

export function situativeBoni(k: Katalog, liste: CharakterWirkung[], art: WurfArtKontext, fertigkeit: string, attribute?: Record<string, number>): SituativerBonus[] {
  const out: SituativerBonus[] = [];
  const nahkampf = !FERNKAMPF.has(fertigkeit);
  liste.forEach((cw, i) => {
    // Manöver-Wirkungen stecken in der Manöverauswahl des Angriffs; hier nur bedingte Wirkungen
    if (cw.status !== 'bedingt') return;
    const w = cw.wirkung;
    const roh = wertAlsZahl(w.wert, attribute);
    const zahl = roh === null ? null : (w.art === 'malus' ? -roh : roh);
    let passt = false; let nurHinweis = false;
    if ((w.art === 'bonus' || w.art === 'malus') && cw.status === 'bedingt') {
      if (w.bezug === 'fertigkeit') passt = (w.fertigkeit_refs ?? []).some(r => (k.get(r.id)?.name ?? r.text) === fertigkeit);
      else if (w.bezug === 'proben') passt = true;
      else if (w.bezug === 'angriff') passt = art === 'angriff';
      else if (w.bezug === 'nahkampfangriff') passt = art === 'angriff' && nahkampf;
      else if (w.bezug === 'zauber') passt = art === 'zauber';
      else if (w.bezug === 'schaden') { passt = art === 'angriff' || art === 'zauber'; nurHinweis = true; }
    } else if (art === 'angriff' && cw.status === 'bedingt' && (w.art === 'zusatzschaden' || w.art === 'sr_ignorieren')) {
      passt = true; nurHinweis = true;
    }
    if (!passt) return;
    const text = typeof w.wert === 'string' && roh !== null ? `${wirkungKurz(w)} (= ${roh})` : wirkungKurz(w);
    out.push({ id: `${cw.quelle}#${i}`, quelle: cw.quelleName, wert: nurHinweis ? null : zahl, text, bedingung: w.bedingung, beleg: w.beleg });
  });
  return out;
}
