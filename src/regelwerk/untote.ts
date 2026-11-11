/**
 * Erhobene Untote (Die Magie S. 182–184; Zauber Untote erheben GRW, Totentier, Grabesbestie, Der letzte Ruf).
 * - Der Zauber legt den Wertesatz fest; frisch erhobene Untote haben Verstand 0 (sonst ändert sich dadurch nichts).
 * - Die Verstärkung gibt Erfahrungspunkte (je Zauber 10/15/25/35); mehrfach nur mit der Meisterschaft Nekromant.
 * - Steigerung „von 0 an“: Fertigkeitspunkte 1–6 je 3 EP, 7–9 je 5 EP usw.; Attribute 10, 15, … EP; Attribute wirken auf
 *   abgeleitete Werte und Fertigkeiten (Angriff im Zweifel BEW + STÄ). Ab 6 gesteigerten Punkten eine Meisterschaft der
 *   Schwelle 1, ab 9 Schwelle 2 usw. Grenze der neuen Punkte: Zaubergrad 1–2 → Heldengrad 1, Grad 3 → Heldengrad 2 usw.
 * - Keine Magieschulen, keine „intellektuellen“ Fertigkeiten (z. B. Arkane Kunde, Geschichte und Mythen).
 * - Abnormität (Meisterschaft Meister der Abnormitäten): 5 EP, höchstens eine je Untotem.
 */
import type { Verstoss } from '../fundament/hausregeln';
import type { Katalog } from './katalog';
import type { Eintrag } from './typen';
import type { Begleiter } from '../types';
import { ABGELEITET_ID } from './abgeleitet';
import { anwenden, leseModifikationen, werteblock, ATTRIBUT_KURZ, type Werteblock } from './modifikationen';
import { wertekasten } from './begleiter';

/** Wertesätze der Erhebungszauber (laut Zauberbeschreibung) mit Fundstelle */
export const WERTESAETZE: Record<string, { name: string; quelle: string }[]> = {
  'grw:zauber:untote-erheben': [{ name: 'Wandelnder Leichnam', quelle: 'GRW S. 282' }, { name: 'Skelett', quelle: 'GRW S. 279' }],
  'magie:zauber:totentier': [{ name: 'Gruftkatze', quelle: 'Die Magie S. 211' }, { name: 'Wimmelnder Schrecken', quelle: 'Die Magie S. 217' }],
  'magie:zauber:grabesbestie': [{ name: 'Ghul', quelle: 'GRW S. 272' }, { name: 'Seuchenbringer', quelle: 'Bestien & Ungeheuer S. 123' }],
  'magie:zauber:der-letzte-ruf': [{ name: 'Knochenschänder', quelle: 'Die Magie S. 212' }, { name: 'Mumie', quelle: 'Bestien & Ungeheuer S. 122' }],
};
export const KURZ_NAME: Record<string, string> = {
  AUS: 'Ausstrahlung', BEW: 'Beweglichkeit', INT: 'Intuition', KON: 'Konstitution', MYS: 'Mystik', 'STÄ': 'Stärke', VER: 'Verstand', WIL: 'Willenskraft',
};
/** nicht steigerbar (Die Magie S. 183: „wie Arkane Kunde oder Geschichte und Mythen“) */
export const INTELLEKTUELL = ['grw:fertigkeit:arkane-kunde', 'grw:fertigkeit:geschichte-und-mythen'];
/** Pseudo-Fertigkeit für den Angriffswert der Waffen */
export const ANGRIFF = 'angriff';

export interface Erhebung { zauber: Eintrag; grad: number; epJeVerstaerkung: number; wertesaetze: { name: string; quelle: string; id: string | null }[] }

/** Erhebungszauber im Katalog (Typus Nekromantie mit Verstärkung „… Erfahrungspunkte“) */
export function erhebungen(k: Katalog): Erhebung[] {
  return Object.values(k.eintraege)
    .filter(e => e.typ === 'zauber' && (e.daten.typus ?? []).includes('Nekromantie') && /Erfahrungspunkte/.test(String(e.daten.erfolgsgrade ?? '')))
    .map(e => {
      const grad = Math.min(...(e.daten.schulen ?? []).map((s: { grad: number }) => s.grad));
      const ep = Number(String(e.daten.erfolgsgrade).match(/(\d+) Erfahrungspunkte/)?.[1] ?? 0);
      const ws = (WERTESAETZE[e.id] ?? []).map(w => ({ ...w, id: kreaturNachName(k, w.name) }));
      return { zauber: e, grad, epJeVerstaerkung: ep, wertesaetze: ws };
    }).sort((a, b) => a.grad - b.grad || a.zauber.name.localeCompare(b.zauber.name, 'de'));
}

function kreaturNachName(k: Katalog, name: string): string | null {
  return Object.values(k.eintraege).find(e => (e.typ === 'kreatur' || e.typ === 'tier') && e.name === name && wertekasten(e))?.id ?? null;
}

/** Heldengrad, dessen Grenzen für neu gekaufte Punkte gelten (Grad 1–2 → 1, 3 → 2, 4 → 3, 5 → 4) */
export const grenzHeldengrad = (grad: number) => Math.max(1, Math.min(4, grad - 1));
export const hoechstePunkte = (hg: number) => 3 + 3 * hg;

/** EP für n Fertigkeitspunkte „von 0 an“ (1–6: 3, 7–9: 5, 10–12: 7, 13–15: 9) */
export function fertigkeitKosten(n: number): number {
  let s = 0;
  for (let p = 1; p <= n; p++) s += p <= 6 ? 3 : 3 + 2 * Math.ceil((p - 6) / 3);
  return s;
}
/** EP für n Attributsteigerungen (10, 15, 20, …) */
export const attributKosten = (n: number) => 10 * n + 5 * (n * (n - 1)) / 2;
/** Schwelle der freien Meisterschaft nach gesteigerten Punkten (6 → 1, 9 → 2, 12 → 3, 15 → 4) */
export const freieSchwelle = (n: number) => (n >= 6 ? Math.min(4, 1 + Math.floor((n - 6) / 3)) : 0);

export interface UntotWerte {
  erhebung: Erhebung | null;
  wertesatz: { name: string; quelle: string; id: string | null } | null;
  werte: Werteblock | null;
  epGesamt: number; epVerbraucht: number;
  posten: { text: string; ep: number }[];
  grenze: number;
  freieMeisterschaften: { fertigkeit: string; schwelle: number }[];
  abnormitaet: Eintrag | null;
  hinweise: string[];
  /** Hinweise, die ein Regelverstoß sind */
  verstoesse: Verstoss[];
}

export function untotWerte(k: Katalog, b: Begleiter, opt: { nekromant: boolean; meisterDerAbnormitaeten: boolean }): UntotWerte {
  const hinweise: string[] = [];
  const verstoesse: Verstoss[] = [];
  const verstoss = (text: string, schluessel: string, mass = 1) => { hinweise.push(text); verstoesse.push({ text, schluessel, mass }); };
  const erhebung = erhebungen(k).find(x => x.zauber.id === b.erhebung) ?? null;
  const wertesatz = erhebung?.wertesaetze.find(w => w.id === b.id || w.name === b.name) ?? null;
  const grad = erhebung?.grad ?? 3;
  const grenze = hoechstePunkte(grenzHeldengrad(grad));
  const verst = b.verstaerkungen ?? 0;
  if (verst > 1 && !opt.nekromant) verstoss('Die Verstärkung mehrfach zu wählen erfordert die Meisterschaft Nekromant', 'verstaerkung', verst - 1);
  const epGesamt = verst * (erhebung?.epJeVerstaerkung ?? 0);

  const st = b.steigerung ?? {};
  const posten: { text: string; ep: number }[] = [];
  for (const [a, n] of Object.entries(st.attribute ?? {})) if (n > 0) posten.push({ text: `${a} +${n}`, ep: attributKosten(n) });
  const freieMeisterschaften: { fertigkeit: string; schwelle: number }[] = [];
  for (const [f, n] of Object.entries(st.fertigkeiten ?? {})) {
    if (n <= 0) continue;
    const name = f === ANGRIFF ? 'Angriff' : k.get(f)?.name ?? f;
    posten.push({ text: `${name} +${n}`, ep: fertigkeitKosten(n) });
    if (n > grenze) verstoss(`${name}: höchstens ${grenze} neue Punkte (Zaubergrad ${grad})`, `grenze:${f}`, n - grenze);
    if (f !== ANGRIFF && (INTELLEKTUELL.includes(f) || k.get(f)?.daten.kategorie === 'Magieschule')) verstoss(`${name} kann ein erhobener Untoter nicht steigern`, `nicht:${f}`, n);
    const s = freieSchwelle(n); if (s) freieMeisterschaften.push({ fertigkeit: name, schwelle: s });
  }
  const abnormitaet = b.abnormitaet ? k.get(b.abnormitaet) ?? null : null;
  if (abnormitaet) {
    posten.push({ text: `Abnormität ${abnormitaet.name}`, ep: Number(abnormitaet.daten.kosten_ep) || 5 });
    if (!opt.meisterDerAbnormitaeten) verstoss('Abnormitäten erfordern die Meisterschaft Meister der Abnormitäten', 'abnormitaet');
  }
  const epVerbraucht = posten.reduce((s, p) => s + p.ep, 0);
  if (epVerbraucht > epGesamt) verstoss(`${epVerbraucht} EP verteilt, aber nur ${epGesamt} EP aus der Verstärkung`, 'ep', epVerbraucht - epGesamt);
  if (!erhebung) hinweise.push('Erhebungszauber nicht im Katalog');

  // Werte: Wertesatz, Verstand 0, Steigerungen mit Auswirkung auf abgeleitete Werte, Abnormität
  let werte: Werteblock | null = null;
  const e = k.get(b.id);
  if (e && wertekasten(e)) {
    const w = werteblock(k, e.daten.werte_berechnet ?? e.daten);
    // gekaufte Attributpunkte; Verstand 0 bei frisch erhobenen Untoten ändert „der Einfachheit halber“ keine sonstigen Werte (S. 182)
    const gek = (a: string) => st.attribute?.[a] ?? 0;
    const kurz = (name: string) => Object.keys(KURZ_NAME).find(x => KURZ_NAME[x] === name);
    const attribute = Object.fromEntries(ATTRIBUT_KURZ.map(a => [a, (a === 'VER' ? 0 : w.attribute[a]) + gek(a)]));
    const R = k.get(ABGELEITET_ID)?.daten.strukturiert;
    const abgeleitet = { ...w.abgeleitet };
    for (const d of R?.werte ?? []) {
      if (!('summe' in d) || abgeleitet[d.kuerzel] === undefined) continue;
      for (const t of d.summe) if ('attribut' in t) abgeleitet[d.kuerzel] += (t.faktor ?? 1) * gek(kurz(t.attribut) ?? '');
    }
    const attrVon = (id: string): string[] => (k.get(id)?.daten.attribute ?? []).map((n: string) => kurz(n)).filter((x: string | undefined): x is string => !!x);
    const fertigkeiten = w.fertigkeiten.map(f => ({ ...f, wert: f.wert + (f.id ? (st.fertigkeiten?.[f.id] ?? 0) + attrVon(f.id).reduce((s, a) => s + gek(a), 0) : 0) }));
    for (const [f, n] of Object.entries(st.fertigkeiten ?? {}))
      if (f !== ANGRIFF && n > 0 && !fertigkeiten.some(x => x.id === f)) fertigkeiten.push({ id: f, name: k.get(f)?.name ?? f, wert: n + attrVon(f).reduce((s, a) => s + attribute[a], 0) });
    fertigkeiten.sort((x, y) => x.name.localeCompare(y.name, 'de'));
    const angriff = (st.fertigkeiten?.[ANGRIFF] ?? 0) + gek('BEW') + gek('STÄ');
    const waffen = w.waffen.map(x => ({ ...x, wert: x.wert + angriff }));
    werte = { ...w, attribute, abgeleitet, fertigkeiten, waffen };
    if (abnormitaet) {
      const m = leseModifikationen(k, abnormitaet.daten.modifikationen);
      werte = anwenden(k, werte, m);
    }
  } else if (wertesatz) {
    hinweise.push(`Wertesatz ${wertesatz.name} steht nicht in den Regelpaketen – Werte aus ${wertesatz.quelle}`);
  }
  return { erhebung, wertesatz, werte, epGesamt, epVerbraucht, posten, grenze, freieMeisterschaften, abnormitaet, hinweise, verstoesse };
}

export const abnormitaeten = (k: Katalog) => Object.values(k.eintraege).filter(e => e.typ === 'abnormitaet').sort((a, b) => a.name.localeCompare(b.name, 'de'));
