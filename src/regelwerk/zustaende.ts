/**
 * Zustände aus den Regelpaketen (FUNDAMENT.md, Regelquellen): Welche Zustände es gibt und ob sie eine Stufe haben,
 * steht in den Einträgen vom Typ `zustand` (Grundregelwerk und geladene Bücher), nicht im Programmcode.
 * „Liegend“ ist kein Zustand, sondern eine Kampfposition (GRW S. 170); der Editor führt sie in derselben Auswahl,
 * weil sie am Spieltisch genauso an- und abgelegt wird.
 */
import { aktiverKatalog } from './bruecke';
import type { Katalog } from './katalog';
import { ZUSTAENDE } from '../data/zustaende';

export const KAMPFPOSITION_LIEGEND = 'Liegend';

export interface Zustandsangabe { name: string; mitStufe: boolean; id?: string }

let cache: { k: Katalog | null; liste: Zustandsangabe[] } | null = null;

/** Alle wählbaren Zustände, alphabetisch: aus den Paketen, ergänzt um die Zustandsdaten (data/zustaende.ts) */
export function zustandsliste(k: Katalog | null = aktiverKatalog()): Zustandsangabe[] {
  if (cache && cache.k === k) return cache.liste;
  const nachName = new Map<string, Zustandsangabe>();
  if (k) {
    for (const e of k.nachTyp('zustand')) {
      const parameter = (e.daten as { parameter?: unknown } | undefined)?.parameter;
      // im Paket als Text wie „[Stufe]“ oder „[Krankheit, Phase]“
      const p = Array.isArray(parameter) ? parameter.join(',') : String(parameter ?? '');
      nachName.set(e.name, { name: e.name, mitStufe: /\bStufe\b/.test(p), id: e.id });
    }
  }
  // Zustände, die in keinem geladenen Paket stehen (z. B. aus nicht geladenen Büchern), kommen aus den Zustandsdaten
  for (const [name, z] of Object.entries(ZUSTAENDE)) if (!nachName.has(name)) nachName.set(name, { name, mitStufe: !!z.stufe });
  nachName.set(KAMPFPOSITION_LIEGEND, { name: KAMPFPOSITION_LIEGEND, mitStufe: false });
  const liste = [...nachName.values()].sort((a, b) => a.name.localeCompare(b.name, 'de'));
  cache = { k, liste };
  return liste;
}

export function alleZustaende(k: Katalog | null = aktiverKatalog()): string[] {
  return zustandsliste(k).map((z) => z.name);
}

export function zustandHatStufe(name: string, k: Katalog | null = aktiverKatalog()): boolean {
  return zustandsliste(k).find((z) => z.name === name)?.mitStufe ?? false;
}

export function istZustand(name: string, k: Katalog | null = aktiverKatalog()): boolean {
  return zustandsliste(k).some((z) => z.name === name);
}
