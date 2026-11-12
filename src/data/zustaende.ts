/**
 * Rückfall für die Zustände des Grundregelwerks (GRW S. 168–169), solange kein Regelpaket geladen ist.
 * Maßgeblich sind die Einträge vom Typ `zustand` im Grundregelwerk-Paket (Feld `daten.zustandswirkung`);
 * Zustände aus anderen Bänden kommen ausschließlich aus den hochgeladenen Grimoires und stehen nicht im Code.
 * Ein Test hält diese Tabelle mit dem Paket gleich (FUNDAMENT.md, Altlasten).
 */
export type Probenbereich = 'allgemein' | 'kampf' | 'magie';

/** Form wie `daten.zustandswirkung` im Paket */
export interface Zustandswirkung {
  probe?: { bereiche?: Probenbereich[]; attribute?: string[]; pro_stufe?: number; fest?: number; hoechststufe?: number; nur?: 'sicht'; art?: 'wundstufe' };
  werte?: Record<string, { pro_stufe?: number; fest?: number; faktor?: number; setzen?: number; kanalisiert_anteil_pro_stufe?: number }>;
}

export interface GrwZustand { stufe: boolean; seite: number; wirkung?: Zustandswirkung }

const ALLE: Probenbereich[] = ['kampf', 'allgemein', 'magie'];

export const GRW_ZUSTAENDE: Record<string, GrwZustand> = {
  Angsterfüllt: { stufe: false, seite: 168 },
  Benommen: { stufe: true, seite: 168 },
  Bewusstlos: { stufe: false, seite: 168 },
  Blutend: { stufe: true, seite: 168 },
  Brennend: { stufe: true, seite: 168 },
  Erschöpft: { stufe: true, seite: 168, wirkung: { probe: { bereiche: ['kampf', 'allgemein'], pro_stufe: -1 }, werte: { GSW: { pro_stufe: -1 }, INI: { pro_stufe: 1 } } } },
  Geblendet: { stufe: true, seite: 168, wirkung: { probe: { bereiche: ALLE, pro_stufe: -2, hoechststufe: 4, nur: 'sicht' } } },
  Glaubenskrise: { stufe: true, seite: 168, wirkung: { probe: { bereiche: ['magie'], pro_stufe: -1 } } },
  Krank: { stufe: false, seite: 169 },
  Lahm: { stufe: false, seite: 169, wirkung: { werte: { GSW: { faktor: 0.5 } } } },
  Panisch: { stufe: false, seite: 169 },
  Rasend: { stufe: false, seite: 169 },
  Ringend: { stufe: false, seite: 169, wirkung: { probe: { bereiche: ALLE, fest: -3 }, werte: { VTD: { fest: -3 }, GSW: { setzen: 0 } } } },
  Schlafend: { stufe: false, seite: 169 },
  Siechtum: { stufe: true, seite: 169 },
  Sterbend: { stufe: true, seite: 169 },
  Verwundet: { stufe: true, seite: 169, wirkung: { probe: { art: 'wundstufe' } } },
};
