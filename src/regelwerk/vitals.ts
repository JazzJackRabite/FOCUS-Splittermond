/**
 * Lebenspunkte und Fokus von Begleitern nach den Regeldaten:
 * - Gesundheitsstufen und Wundabzüge aus grw:regel:abgeleitete-werte-regeln:berechnung-der-abgeleiteten-werte (strukturiert).
 * - Merkmale, die die Zahl der Gesundheitsstufen ändern (z. B. Schwächlich, Zerbrechlich), werden aus der Beschreibung des
 *   Monstermerkmals gelesen („Auf diesen Stufen werden die Regeln für die Stufen … angewendet“).
 * - Immunität gegen Betäubungsschaden (z. B. Konstrukt) ebenfalls aus der Merkmalsbeschreibung.
 * - Betäubungs- und kanalisierter Schaden verursachen keine Wundabzüge (wundabzuege.nur_echter_schaden).
 */
import type { Katalog } from './katalog';
import { ABGELEITET_ID } from './abgeleitet';
import { norm } from './bruecke';

export interface Gesundheitsstufe { name: string; wundabzug: number }
export interface BegleiterZustand {
  schaden?: number; betaeubung?: number; kanalisiert?: number;
  fokus?: { erschoepft?: number; kanalisiert?: number; verzehrt?: number };
}

const STANDARD: Gesundheitsstufe[] = [
  { name: 'Unverletzt', wundabzug: 0 }, { name: 'Angeschlagen', wundabzug: -1 }, { name: 'Verletzt', wundabzug: -2 },
  { name: 'Schwer verletzt', wundabzug: -4 }, { name: 'Todgeweiht', wundabzug: -8 },
];

function monstermerkmal(k: Katalog, merkmal: string) {
  const n = norm(merkmal.replace(/\s*[(\d].*$/, ''));
  return Object.values(k.eintraege).find(e => e.typ === 'monstermerkmal' && norm(e.name) === n);
}

/** Gesundheitsstufen eines Wesens mit diesen Merkmalen */
export function gesundheitsstufen(k: Katalog | null, merkmale: string[] = []): { stufen: Gesundheitsstufe[]; quelle: string | null } {
  const alle: Gesundheitsstufe[] = k?.get(ABGELEITET_ID)?.daten.strukturiert?.gesundheitsstufen?.map((s: { name: string; wundabzug: number }) => ({ name: s.name, wundabzug: s.wundabzug })) ?? STANDARD;
  if (k) for (const m of merkmale) {
    const text = String(monstermerkmal(k, m)?.daten.beschreibung ?? '');
    const i = text.search(/Regeln für die Stufen? /);
    if (!/Gesundheitsstufe/.test(text) || i < 0) continue;
    const rest = text.slice(i);
    const namen = alle.filter(s => new RegExp(`\\b${s.name}\\b`).test(rest));
    if (namen.length) return { stufen: namen, quelle: m.replace(/\s*[(\d].*$/, '') };
  }
  return { stufen: alle, quelle: null };
}

/** Immun gegen Betäubungsschaden (z. B. Konstrukt)? */
export function betaeubungsimmun(k: Katalog | null, merkmale: string[] = []): boolean {
  if (!k) return false;
  return merkmale.some(m => /^Betäubungsimmunität/.test(m) || /immun gegen (?:[^.]*?)?Betäubungsschaden/.test(String(monstermerkmal(k, m)?.daten.beschreibung ?? '')));
}

export interface Lebenslage {
  lp: number; stufen: Gesundheitsstufe[]; gesamt: number;
  verloren: number; frei: number;
  /** Gesundheitsstufe nach allem verlorenen LP (Anzeige) */
  stufe: number;
  /** Wundabzug nur aus echtem Schaden */
  wundabzug: number; stufenName: string;
  ausser: boolean;
}

/** Lage der Lebenspunkte: lp = Lebenspunkte je Gesundheitsstufe */
export function lebenslage(lp: number, stufen: Gesundheitsstufe[], z: BegleiterZustand = {}): Lebenslage {
  const gesamt = Math.max(0, lp) * stufen.length;
  const schaden = z.schaden ?? 0; const verloren = Math.min(gesamt, schaden + (z.betaeubung ?? 0) + (z.kanalisiert ?? 0));
  const idx = (n: number) => (lp > 0 ? Math.min(stufen.length - 1, Math.floor(n / lp)) : 0);
  const ausser = gesamt > 0 && verloren >= gesamt;
  const stufe = idx(Math.min(verloren, gesamt - 1));
  const echte = stufen[idx(Math.min(schaden, gesamt - 1))];
  return {
    lp, stufen, gesamt, verloren, frei: gesamt - verloren, stufe,
    wundabzug: schaden > 0 ? echte.wundabzug : 0, stufenName: ausser ? 'Außer Gefecht' : stufen[stufe]?.name ?? '',
    ausser,
  };
}

/** Freier Fokus */
export function fokusFrei(fo: number, z: BegleiterZustand = {}): number {
  const f = z.fokus ?? {};
  return Math.max(0, fo - (f.erschoepft ?? 0) - (f.kanalisiert ?? 0) - (f.verzehrt ?? 0));
}
