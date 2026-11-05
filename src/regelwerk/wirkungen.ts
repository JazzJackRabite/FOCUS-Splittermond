/**
 * Wirkungen der Stärken, Meisterschaften und Zauber eines Charakters (daten.wirkungen_strukturiert der Regelpakete).
 *
 * - verrechnet: gilt „immer“ für den Charakter selbst und lässt sich eindeutig einrechnen:
 *     · Bonus/Malus auf benannte Fertigkeiten (z. B. Einfühlsamkeit: +2 Empathie) → Fertigkeitswert
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

function status(k: Katalog, quelle: string, w: Wirkung): WirkungsStatus {
  if (w.gilt === 'solange der Zauber wirkt') return 'zauber';
  if (w.gilt === 'beim Manöver') return 'manoever';
  if (w.gilt !== 'immer') return 'bedingt';
  if ((w.art === 'bonus' || w.art === 'malus') && w.bezug === 'fertigkeit' && typeof w.wert === 'number' && w.fertigkeit_refs?.length) return 'verrechnet';
  const e = k.get(quelle);
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

/** Kurztext einer Wirkung für die Anzeige */
export function wirkungKurz(w: Wirkung): string {
  const z = typeof w.wert === 'number' ? (w.art === 'malus' || w.art === 'wert_gesenkt' ? `−${w.wert}` : `+${w.wert}`) : w.wert ?? '';
  switch (w.art) {
    case 'bonus': case 'malus': return `${z} auf ${(w.auf ?? w.bezug ?? '').replace(/^(?:seine[nrs]?|ihre[nrs]?|den|die|das) /, '')}`.trim();
    case 'wert_erhoeht': case 'wert_gesenkt': return `${w.bezug ?? ''} ${z}`.trim();
    case 'schaden_gesenkt': return `${w.schadensart ?? 'Schaden'} −${w.wert}`;
    case 'immunitaet': return `immun gegen ${w.zustand_ref?.text ?? ''}`.trim();
    case 'zusatzschaden': return `${w.wert} zusätzlicher Schaden`;
    case 'sr_ignorieren': return `${w.wert} SR ignorieren`;
    case 'zustand': return `Zustand ${w.zustand_ref?.text ?? ''}`.trim();
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
export function situativeBoni(k: Katalog, liste: CharakterWirkung[], art: WurfArtKontext, fertigkeit: string): SituativerBonus[] {
  const out: SituativerBonus[] = [];
  const nahkampf = !FERNKAMPF.has(fertigkeit);
  liste.forEach((cw, i) => {
    // Manöver-Wirkungen stecken in der Manöverauswahl des Angriffs; hier nur bedingte Wirkungen
    if (cw.status !== 'bedingt') return;
    const w = cw.wirkung;
    const zahl = typeof w.wert === 'number' ? (w.art === 'malus' ? -w.wert : w.wert) : null;
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
    out.push({ id: `${cw.quelle}#${i}`, quelle: cw.quelleName, wert: nurHinweis ? null : zahl, text: wirkungKurz(w), bedingung: w.bedingung, beleg: w.beleg });
  });
  return out;
}
