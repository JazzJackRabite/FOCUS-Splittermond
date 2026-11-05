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
