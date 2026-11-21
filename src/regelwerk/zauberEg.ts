/**
 * Zauber durch Erfolgsgrade verbessern (GRW S. 221–222) und Auslösezeit (GRW S. 194–195) aus dem GRW-Paket:
 * EG je Option, Höchstzahl, Mindestwerte. Ohne Paket die Werte des Grundregelwerks als Rückfall.
 */
import type { Katalog } from './katalog';
import { aktiverKatalog } from './bruecke';

const EG_ID = 'grw:regel:zauber-regeln:zauber-durch-erfolgsgrade-verbessern';
const AUSLOESEN_ID = 'grw:regel:zauber-regeln:erlaeuterung-der-zauberbeschreibungen';

export interface ZauberEgOption { eg: number; hoechstens: number | null; minimum: number | null }
export interface ZauberEgRegeln {
  erschoepft: ZauberEgOption; kanalisiert: ZauberEgOption; verzehrt: ZauberEgOption;
  schaden: ZauberEgOption; reichweite: ZauberEgOption; wirkungsdauer: ZauberEgOption; wirkungsbereich: ZauberEgOption;
  ausloesezeit: ZauberEgOption;
  /** Dauer der sofortigen Aktion zum Auslösen in Ticks */
  grundAusloesezeit: number;
  quelle: string;
}

/** Name der Option im Paket → Schlüssel */
const OPTION: Record<string, keyof Omit<ZauberEgRegeln, 'grundAusloesezeit' | 'quelle'>> = {
  'Erschöpfter Fokus': 'erschoepft', 'Kanalisierter Fokus': 'kanalisiert', 'Verzehrter Fokus': 'verzehrt',
  Schaden: 'schaden', Reichweite: 'reichweite', Wirkungsdauer: 'wirkungsdauer', Wirkungsbereich: 'wirkungsbereich', 'Auslösezeit': 'ausloesezeit',
};

const RUECKFALL: ZauberEgRegeln = {
  erschoepft: { eg: 1, hoechstens: null, minimum: 1 }, kanalisiert: { eg: 2, hoechstens: null, minimum: 1 }, verzehrt: { eg: 3, hoechstens: null, minimum: 1 },
  schaden: { eg: 1, hoechstens: null, minimum: null }, reichweite: { eg: 1, hoechstens: null, minimum: null },
  wirkungsdauer: { eg: 2, hoechstens: null, minimum: null }, wirkungsbereich: { eg: 3, hoechstens: null, minimum: null },
  ausloesezeit: { eg: 3, hoechstens: 2, minimum: 1 }, grundAusloesezeit: 3, quelle: 'GRW S. 221–222',
};

const CACHE = new WeakMap<Katalog, ZauberEgRegeln>();

export function zauberEgRegeln(k: Katalog | null = aktiverKatalog()): ZauberEgRegeln {
  if (!k) return RUECKFALL;
  if (CACHE.has(k)) return CACHE.get(k)!;
  const r: ZauberEgRegeln = { ...RUECKFALL };
  const opt = k.get(EG_ID)?.daten.strukturiert?.optionen as { name: string; eg: number | string; hoechstens?: number | null; minimum?: string }[] | undefined;
  for (const o of opt ?? []) {
    const key = OPTION[o.name];
    if (!key || typeof o.eg !== 'number') continue;
    const min = o.minimum?.match(/^(\d+)/);
    r[key] = { eg: o.eg, hoechstens: o.hoechstens ?? null, minimum: min ? +min[1] : null };
  }
  const t = k.get(AUSLOESEN_ID)?.daten.strukturiert?.ausloesezeit_ticks;
  if (typeof t === 'number') r.grundAusloesezeit = t;
  CACHE.set(k, r);
  return r;
}
