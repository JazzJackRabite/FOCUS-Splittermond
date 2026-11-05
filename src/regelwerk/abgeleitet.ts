/**
 * Abgeleitete Werte aus den Formeln des Grundregelwerks (daten.strukturiert von
 * grw:regel:abgeleitete-werte-regeln:berechnung-der-abgeleiteten-werte). Portierung von abgeleitete_werte() aus Pruefsuite/lader.py.
 */
import type { Katalog } from './katalog';

export const ABGELEITET_ID = 'grw:regel:abgeleitete-werte-regeln:berechnung-der-abgeleiteten-werte';

/** Attribute mit vollen Namen: Ausstrahlung, Beweglichkeit, Intuition, Konstitution, Mystik, Stärke, Verstand, Willenskraft */
export type Attribute = Record<string, number>;

export interface BedingterBonus { wert: string; bonus: number; bedingung: string; quelle: string }

export interface AbgeleiteteWerte {
  werte: Record<string, number>;
  bedingt: BedingterBonus[];
  hinweise: string[];
  /** Höchstbonus je Quelle (Ausrüstung, Zauberei) nach Heldengrad und Stärken (GRW S. 18) */
  hoechstbonus: number;
}

export function abgeleiteteWerte(kat: Katalog, attribute: Attribute, rasse: string, staerken: string[] = [], heldengrad = 1,
  ausruestung: string[] = [], gesundheitsstufe = 1): AbgeleiteteWerte {
  const R = kat.get(ABGELEITET_ID)!.daten.strukturiert;
  const hinweise: string[] = [];
  const gk: number = kat.get(rasse)!.daten.groessenklasse;
  const tab: Record<number, Record<string, number>> = {};
  for (const g of R.groessenklassen) tab[g.groessenklasse] = g;
  const w: Record<string, number> = { GK: gk };
  for (const d of R.werte) {
    if (!('summe' in d)) continue;
    let s = 0;
    for (const t of d.summe) {
      if ('konstante' in t) s += t.konstante;
      else if ('attribut' in t) s += attribute[t.attribut] * (t.faktor ?? 1);
      else if ('wert' in t) s += w[t.wert];
      else if ('groessenklasse_tabelle' in t) s += tab[gk][t.groessenklasse_tabelle];
    }
    w[d.kuerzel] = s;
  }
  for (const m of R.modifikatoren) {
    if (m.quelle === 'heldengrad') for (const z of m.ziele) w[z] += m.wert * (heldengrad - 1);
  }
  const bedingt: BedingterBonus[] = [];
  const summeSt = new Map<string, number>();
  let hb: number = R.hoechstbonus.je_quelle_nach_heldengrad[String(heldengrad)];
  const anzahl = (sid: string) => staerken.filter(x => x === sid).length;
  for (const sid of staerken) {
    for (const m of kat.get(sid)?.daten.abgeleitete_werte_modifikatoren ?? []) {
      if (m.bedingt) { bedingt.push({ wert: m.abgeleiteter_wert, bonus: m.bonus, bedingung: m.bedingt, quelle: sid }); continue; }
      if (m.abgeleiteter_wert === 'hoechstbonus') { hb += m.bonus; continue; }
      const k: string = m.abgeleiteter_wert; const key = sid + '|' + k;
      const neu = (summeSt.get(key) ?? 0) + m.bonus;
      if (m.hoechstbonus && Math.abs(neu) > m.hoechstbonus) { hinweise.push(`${sid}: Höchstbonus ${m.hoechstbonus} erreicht`); continue; }
      if (typeof m.mehrfach === 'number' && anzahl(sid) > m.mehrfach) hinweise.push(`${sid}: höchstens ${m.mehrfach}× wählbar`);
      if (m.mehrfach === 'einmal pro Heldengrad' && anzahl(sid) > heldengrad) hinweise.push(`${sid}: nur einmal pro Heldengrad wählbar`);
      summeSt.set(key, neu); w[k] += m.bonus;
    }
  }
  // Ausrüstung: VTD-Bonus zählt zur Quelle Ausrüstung (Höchstbonus), Behinderung halbiert auf GSW
  let vtdAus = 0; let beh = 0;
  const kurz: Record<string, string> = {};
  for (const a of R.attribute) kurz[a.kuerzel] = a.name;
  for (const aid of ausruestung) {
    const d = kat.get(aid)!.daten;
    vtdAus += d.vtd_bonus || 0;
    let b: number = d.behinderung || 0;
    if (d.mindest_staerke) b += Math.max(0, d.mindest_staerke - attribute['Stärke']);
    for (const [k, v] of Object.entries((d.mindestattribute || {}) as Record<string, number>)) b += Math.max(0, v - attribute[kurz[k]]);
    beh += b;
  }
  if (vtdAus > hb) { hinweise.push(`VTD-Bonus aus Ausrüstung ${vtdAus} auf Höchstbonus ${hb} begrenzt`); vtdAus = hb; }
  w.VTD += vtdAus;
  if (beh) {
    if (R.rundung.art !== 'kaufmännisch') throw new Error('Rundungsregel unbekannt: ' + R.rundung.art);
    w.GSW -= Math.trunc(beh / 2 + 0.5); // halbe Gesamt-Behinderung, kaufmännisch gerundet (GRW S. 11)
  }
  const wa = R.gesundheitsstufen.find((g: { stufe: number }) => g.stufe === gesundheitsstufe).wundabzug;
  if (wa) { w.GSW += wa; w.INI -= wa; } // Malus: GSW sinkt, INI (kleiner ist besser) steigt
  w.GSW = Math.max(0, w.GSW);
  w.LP_gesamt = w.LP * 5;
  return { werte: w, bedingt, hinweise, hoechstbonus: hb };
}
