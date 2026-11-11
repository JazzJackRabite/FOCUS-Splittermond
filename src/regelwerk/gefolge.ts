/**
 * Gefolge (Ressource Gefolge, GRW S. 77–78).
 * - Der erste Punkt bringt einen Gefolgsmann: Attribute 2 + Rassenmodifikator, dazu die üblichen Werte seiner Kultur
 *   (Fertigkeitspunkte, Stärke und Meisterschaft des Kulturmoduls).
 * - Jeder weitere Punkt: ein weiterer Gefolgsmann ODER eine zusätzliche Meisterschaft/ein zusätzlicher Zauber ODER eine
 *   Fertigkeit auf die erste Meisterschaftsschwelle (6 Punkte) anheben – mit den Meisterschaften und Zaubern dieser Schwelle.
 * - Keine Fertigkeit höher, als es der Heldengrad des Abenteurers zulässt.
 * Zauber nach der Erschaffungsregel (GRW S. 30, Beispiel Klingentänzerin): je Magieschule ab 1 Punkt ein Zauber des Grades 0,
 * ab 3 Punkten einer des Grades 1, ab 6 Punkten einer des Grades 2. Zaubergrad n braucht 3·n Punkte (Grad 0: 1 Punkt).
 */
import type { Verstoss } from '../fundament/hausregeln';
import type { Katalog } from './katalog';
import type { Begleiter } from '../types';
import { abgeleiteteWerte } from './abgeleitet';
import { gruppePasst, type ModulWahl } from './erschaffung';
import type { Wertekasten } from './begleiter';

export const GEFOLGE_ID = 'grw:ressource:gefolge';
export const ATTRIBUTE: [string, string][] = [
  ['AUS', 'Ausstrahlung'], ['BEW', 'Beweglichkeit'], ['INT', 'Intuition'], ['KON', 'Konstitution'],
  ['MYS', 'Mystik'], ['STÄ', 'Stärke'], ['VER', 'Verstand'], ['WIL', 'Willenskraft'],
];
/** Fertigkeitspunkte der ersten Meisterschaftsschwelle (grw:regel:fertigkeiten-regeln:meisterschaften-erhalten) */
export function ersteSchwelle(k: Katalog): number {
  const s = k.get('grw:regel:fertigkeiten-regeln:meisterschaften-erhalten')?.daten.strukturiert?.schwellen;
  return Number(s?.find((x: { schwelle: number }) => x.schwelle === 1)?.fertigkeitspunkte) || 6;
}
/** Erreichte Meisterschaftsschwelle bei so vielen Punkten (0 = keine) */
export function schwelleBei(k: Katalog, punkte: number): number {
  const s: { schwelle: number; fertigkeitspunkte: number }[] = k.get('grw:regel:fertigkeiten-regeln:meisterschaften-erhalten')?.daten.strukturiert?.schwellen
    ?? [{ schwelle: 1, fertigkeitspunkte: 6 }, { schwelle: 2, fertigkeitspunkte: 9 }, { schwelle: 3, fertigkeitspunkte: 12 }, { schwelle: 4, fertigkeitspunkte: 15 }];
  return Math.max(0, ...s.filter(x => punkte >= x.fertigkeitspunkte).map(x => x.schwelle));
}
/** Höchster Zaubergrad bei so vielen Punkten in der Magieschule (−1 = keiner) */
export function hoechsterZaubergrad(punkte: number): number {
  return punkte < 1 ? -1 : Math.min(5, Math.floor(punkte / 3));
}
/** Freie Zauber einer Magieschule nach der Erschaffungsregel (1 / 3 / 6 Punkte) */
export function freieZauberBei(punkte: number): number {
  return (punkte >= 1 ? 1 : 0) + (punkte >= 3 ? 1 : 0) + (punkte >= 6 ? 1 : 0);
}

export const rassen = (k: Katalog) => Object.values(k.eintraege).filter(e => e.typ === 'rasse' && e.daten.attributsmodifikatoren)
  .sort((a, b) => a.name.localeCompare(b.name, 'de'));
export const kulturen = (k: Katalog) => Object.values(k.eintraege).filter(e => e.typ === 'kultur' && e.daten.modulwerte)
  .sort((a, b) => a.name.localeCompare(b.name, 'de'));

export interface FreiesAttribut { bonus: number; nicht: string[]; unterschiedlich: boolean }
/** Freie Attributboni der Rasse als einzelne Plätze („+1 auf zwei beliebige unterschiedliche Attribute“ → 2 Plätze) */
export function freieAttribute(k: Katalog, rasse: string | undefined): FreiesAttribut[] {
  const m = rasse ? k.get(rasse)?.daten.attributsmodifikatoren : null;
  const out: FreiesAttribut[] = [];
  for (const f of m?.frei ?? []) for (let i = 0; i < (Number(f.anzahl) || 1); i++)
    out.push({ bonus: Number(f.bonus) || 1, nicht: f.nicht ?? [], unterschiedlich: !!f.unterschiedlich });
  return out;
}

type Gruppe = { text: string; punkte: number; optionen?: { id?: string; text: string; auswahl?: string }[]; rest_von?: number | null };

/** Wählbare Fertigkeiten einer Gruppe des Kulturmoduls (feste Optionen und „eine Magieschule“, „eine Kampffertigkeit“) */
export function gruppenOptionen(k: Katalog, gruppen: Gruppe[], i: number, gewaehlt?: string): { id: string; text: string }[] {
  const g = gruppen[i];
  if (g.rest_von != null) return (gruppen[g.rest_von].optionen ?? []).filter(o => o.id && o.id !== gewaehlt).map(o => ({ id: o.id!, text: o.text }));
  const feste = (g.optionen ?? []).filter(o => o.id).map(o => ({ id: o.id!, text: o.text }));
  const platz = (g.optionen ?? []).filter(o => o.auswahl).map(o => o.auswahl!);
  if (!platz.length) return feste;
  const extra = Object.values(k.eintraege).filter(e => e.typ === 'fertigkeit' && !feste.some(f => f.id === e.id) && (
    (platz.includes('magieschule') && e.daten.kategorie === 'Magieschule') ||
    ((platz.includes('kampffertigkeit') || platz.includes('nahkampffertigkeit')) && e.daten.kategorie === 'Kampffertigkeit')))
    .sort((a, b) => a.name.localeCompare(b.name, 'de')).map(e => ({ id: e.id, text: e.name }));
  return [...feste, ...extra];
}

export interface KulturWerte {
  fertigkeiten: Record<string, number>;
  staerke?: string;
  meisterschaft?: { id?: string; text: string; fertigkeit?: string };
  fehlend: string[];
}

/** Werte des Kulturmoduls mit der getroffenen Wahl (als Katalog-IDs) */
export function kulturWerte(k: Katalog, kultur: string, wahl: ModulWahl = {}): KulturWerte {
  const mw = k.get(kultur)?.daten.modulwerte;
  const out: KulturWerte = { fertigkeiten: {}, fehlend: [] };
  if (!mw) return out;
  const gruppen: Gruppe[] = mw.fertigkeiten ?? [];
  const gew: Record<number, string | undefined> = {};
  gruppen.forEach((g, i) => {
    const w = (wahl.fertigkeiten ?? {})[String(i)];
    const opt = gruppenOptionen(k, gruppen, i, g.rest_von != null ? gew[g.rest_von] : undefined);
    const id = w && opt.some(o => o.id === w) ? w : opt.length === 1 ? opt[0].id : undefined;
    gew[i] = id;
    if (id) out.fertigkeiten[id] = (out.fertigkeiten[id] ?? 0) + g.punkte; else out.fehlend.push(g.text);
  });
  const st: { id?: string }[] = mw.staerke_optionen ?? [];
  if (st.length) {
    const ids = st.filter(o => o.id).map(o => o.id!);
    out.staerke = wahl.staerke && ids.includes(wahl.staerke) ? wahl.staerke : ids.length === 1 ? ids[0] : undefined;
    if (!out.staerke) out.fehlend.push('Stärke');
  }
  const ms: { id?: string; text: string; schwerpunkt?: { fertigkeit: string; name: string } }[] = mw.meisterschaft_optionen ?? [];
  if (ms.length) {
    const o = ms[wahl.meisterschaft ?? (ms.length === 1 ? 0 : -1)];
    if (!o) out.fehlend.push('Meisterschaft');
    else if (o.id) out.meisterschaft = { id: o.id, text: k.get(o.id)?.name ?? o.text, fertigkeit: k.get(o.id)?.daten.fertigkeit };
    else out.meisterschaft = { text: o.schwerpunkt ? `Schwerpunkt ${o.schwerpunkt.name}` : o.text, fertigkeit: o.schwerpunkt?.fertigkeit };
  }
  return out;
}

export interface GefolgeFertigkeit {
  id: string; name: string; punkte: number;
  /** Punkte + Attribute; null bei Kampffertigkeiten (Attribute je Waffe) */
  wert: number | null; schwelle: number; angehoben: boolean; zuHoch: boolean }
export interface GefolgeZauber { id: string; name: string; schule?: string; schuleId?: string; grad?: number; ok: boolean }
export interface GefolgeMeisterschaft { id: string; name: string; fertigkeit?: string; schwelle: number; ok: boolean }

export interface GefolgeWerte {
  attribute: Record<string, number>;
  werte: Wertekasten;
  fertigkeiten: GefolgeFertigkeit[];
  staerken: string[];
  kulturMeisterschaft?: KulturWerte['meisterschaft'];
  meisterschaften: GefolgeMeisterschaft[];
  zauber: GefolgeZauber[];
  freieMeisterschaften: number;
  freieZauber: number;
  /** Waffen mit Angriffswert (Punkte der Waffenfertigkeit + Attribute der Waffe) */
  waffen: { id: string; name: string; wert: number; schaden: string; wgs: string; ini: string; merkmale: string; fertigkeit: string }[];
  /** Gefolge-Punkte für diesen Gefolgsmann: 1 + Schwellen + Meisterschaften/Zauber über den freien */
  punkte: number;
  hinweise: string[];
  /** Hinweise, die ein Regelverstoß sind (nicht bloß „noch wählen“) */
  verstoesse: Verstoss[];
}

/** Alle Werte eines Gefolgsmanns. maxFertigkeit = höchster Fertigkeitswert nach Heldengrad des Abenteurers (GRW S. 87). */
export function gefolgeWerte(k: Katalog, b: Begleiter, maxFertigkeit: number): GefolgeWerte {
  const hinweise: string[] = [];
  const verstoesse: Verstoss[] = [];
  const verstoss = (text: string, schluessel: string, mass = 1) => { hinweise.push(text); verstoesse.push({ text, schluessel, mass }); };
  const rasse = b.rasse && k.get(b.rasse) ? b.rasse : undefined;
  if (!rasse) hinweise.push('Rasse wählen');
  const A: Record<string, number> = Object.fromEntries(ATTRIBUTE.map(([, n]) => [n, 2]));
  const mod = rasse ? k.get(rasse)!.daten.attributsmodifikatoren : null;
  for (const [n, v] of Object.entries(mod?.fest ?? {})) A[n] = (A[n] ?? 2) + Number(v);
  const plaetze = freieAttribute(k, rasse);
  const frei = b.attributFrei ?? [];
  plaetze.forEach((p, i) => {
    const n = frei[i];
    if (!n || !(n in A) || p.nicht.includes(n) || (p.unterschiedlich && frei.slice(0, i).includes(n))) { hinweise.push('freien Attributbonus der Rasse wählen'); return; }
    A[n] += p.bonus;
  });

  const kw = k.get(b.id)?.typ === 'kultur' ? kulturWerte(k, b.id, b.kulturWahl) : { fertigkeiten: {}, fehlend: ['Kultur'] } as KulturWerte;
  for (const f of kw.fehlend) hinweise.push(`Kultur: ${f} wählen`);

  const schwelle1 = ersteSchwelle(k);
  const punkte: Record<string, number> = { ...kw.fertigkeiten };
  const angehoben = new Set((b.schwellen ?? []).filter(i => k.get(i)?.typ === 'fertigkeit'));
  for (const i of angehoben) punkte[i] = Math.max(punkte[i] ?? 0, schwelle1);
  const fertigkeiten: GefolgeFertigkeit[] = Object.entries(punkte).filter(([, p]) => p > 0).map(([id, p]) => {
    const e = k.get(id);
    const attr: string[] = e?.daten.attribute ?? [];
    return { id, name: e?.name ?? id, punkte: p, wert: attr.length ? p + attr.reduce((s, a) => s + (A[a] ?? 0), 0) : null, schwelle: schwelleBei(k, p),
      angehoben: angehoben.has(id), zuHoch: p > maxFertigkeit };
  }).sort((x, y) => x.name.localeCompare(y.name, 'de'));
  for (const f of fertigkeiten) if (f.zuHoch) verstoss(`${f.name} ${f.punkte} ist höher, als der Heldengrad des Abenteurers zulässt (${maxFertigkeit})`, `hoch:${f.id}`, f.punkte - maxFertigkeit);

  const staerken = [
    ...(rasse ? (k.get(rasse)!.daten.staerken_refs ?? []).map((s: { id?: string }) => s.id).filter(Boolean) : []),
    ...(kw.staerke ? [kw.staerke] : []),
  ] as string[];

  const pkt = (i?: string) => (i ? punkte[i] ?? 0 : 0);
  /** Punkte der besten passenden Fertigkeit (bei allgemeinen Meisterschaftsgruppen: jede passende Fertigkeit) */
  const bestePunkte = (f: string) => k.get(f)?.typ === 'meisterschaftsgruppe'
    ? Math.max(0, ...Object.keys(punkte).filter(x => gruppePasst(f, x, k)).map(pkt)) : pkt(f);
  const meisterschaften: GefolgeMeisterschaft[] = (b.meisterschaften ?? []).map(id => {
    const e = k.get(id); const f: string | undefined = e?.daten.fertigkeit; const s = Number(e?.daten.schwelle) || 1;
    // wie bei der Erschaffung: Schwelle 1 schon mit 1 Punkt, höhere erst mit erreichter Schwelle
    const p = f ? bestePunkte(f) : 0;
    const ok = !!e && (f ? p >= 1 && s <= Math.max(1, schwelleBei(k, p)) : true);
    return { id, name: e?.name ?? id, fertigkeit: f ? k.get(f)?.name ?? f : undefined, schwelle: s, ok };
  });
  for (const m of meisterschaften) if (!m.ok) verstoss(`Meisterschaft ${m.name}: Fertigkeit fehlt oder Schwelle nicht erreicht`, `ms:${m.id}`);

  const zauber: GefolgeZauber[] = (b.zauber ?? []).map(id => {
    const e = k.get(id);
    const schulen: { id: string; schule: string; grad: number }[] = e?.daten.schulen ?? [];
    const passend = schulen.filter(s => s.grad <= hoechsterZaubergrad(pkt(s.id))).sort((x, y) => x.grad - y.grad)[0];
    const s = passend ?? schulen.find(x => pkt(x.id) > 0) ?? schulen[0];
    return { id, name: e?.name ?? id, schule: s?.schule, schuleId: s?.id, grad: s?.grad, ok: !!passend };
  });
  for (const z of zauber) if (!z.ok) verstoss(`Zauber ${z.name}: Magieschule fehlt oder zu wenige Punkte für Grad ${z.grad ?? '?'}`, `z:${z.id}`);

  const magie = fertigkeiten.filter(f => k.get(f.id)?.daten.kategorie === 'Magieschule');
  const freieZauber = magie.reduce((s, f) => s + freieZauberBei(f.punkte), 0);
  const freieMeisterschaften = angehoben.size;
  const gesamtPunkte = 1 + angehoben.size + Math.max(0, meisterschaften.length - freieMeisterschaften) + Math.max(0, zauber.length - freieZauber);

  const kurzName: Record<string, string> = Object.fromEntries(ATTRIBUTE);
  const waffen = (b.waffen ?? []).map(id => k.get(id)).filter((e): e is NonNullable<typeof e> => e?.typ === 'waffe').map(e => {
    const d = e.daten; const f: string = d.fertigkeit ?? '';
    const wert = pkt(f) + (d.attribute ?? []).reduce((s: number, a: string) => s + (A[kurzName[a] ?? a] ?? 0), 0);
    return { id: e.id, name: e.name, wert, schaden: String(d.schaden ?? ''), wgs: String(d.wgs ?? ''), ini: '', merkmale: String(d.merkmale_text ?? '–'), fertigkeit: k.get(f)?.name ?? f };
  });

  let werte: Wertekasten = { attribute: Object.fromEntries(ATTRIBUTE.map(([kurz, n]) => [kurz, String(A[n])])) };
  if (rasse) {
    const w = abgeleiteteWerte(k, A, rasse, staerken, 1).werte;
    werte = {
      ...werte,
      abgeleitete_werte: { ...Object.fromEntries(['GK', 'GSW', 'INI', 'LP', 'FO', 'VTD', 'GW', 'KW'].map(x => [x, String(w[x] ?? '–')])), SR: '0' },
      waffen: waffen.map(x => ({ name: x.name, wert: String(x.wert), schaden: x.schaden, wgs: x.wgs, ini: x.ini, merkmale: x.merkmale })),
    };
  }
  return {
    attribute: A, werte, fertigkeiten, staerken, kulturMeisterschaft: kw.meisterschaft, meisterschaften, zauber, waffen,
    freieMeisterschaften, freieZauber, punkte: gesamtPunkte, hinweise, verstoesse,
  };
}

/** Meisterschaften, die ein Gefolgsmann mit diesen Fertigkeiten lernen kann (Schwelle ≤ erreichte, mindestens 1) */
export function meisterschaftsAngebot(k: Katalog, fertigkeiten: GefolgeFertigkeit[]) {
  const s = new Map(fertigkeiten.map(f => [f.id, Math.max(1, f.schwelle)]));
  const schwelle = (f: string) => k.get(f)?.typ === 'meisterschaftsgruppe'
    ? Math.max(0, ...fertigkeiten.filter(x => gruppePasst(f, x.id, k)).map(x => Math.max(1, x.schwelle))) : s.get(f) ?? 0;
  return Object.values(k.eintraege)
    .filter(e => e.typ === 'meisterschaft' && e.daten.fertigkeit && (Number(e.daten.schwelle) || 1) <= schwelle(e.daten.fertigkeit))
    .map(e => ({ id: e.id, name: e.name, fertigkeit: k.get(e.daten.fertigkeit)?.name ?? '', schwelle: Number(e.daten.schwelle) || 1 }))
    .sort((a, b) => a.fertigkeit.localeCompare(b.fertigkeit, 'de') || a.schwelle - b.schwelle || a.name.localeCompare(b.name, 'de'));
}

/** Zauber der Magieschulen des Gefolgsmanns bis zum erreichbaren Grad */
export function zauberAngebot(k: Katalog, fertigkeiten: GefolgeFertigkeit[]) {
  const p = new Map(fertigkeiten.map(f => [f.id, f.punkte]));
  return Object.values(k.eintraege).filter(e => e.typ === 'zauber').flatMap(e => {
    const s = (e.daten.schulen ?? []).filter((x: { id: string; grad: number }) => p.has(x.id) && x.grad <= hoechsterZaubergrad(p.get(x.id)!))
      .sort((x: { grad: number }, y: { grad: number }) => x.grad - y.grad)[0];
    return s ? [{ id: e.id, name: e.name, schule: s.schule as string, grad: s.grad as number }] : [];
  }).sort((a, b) => a.schule.localeCompare(b.schule, 'de') || a.grad - b.grad || a.name.localeCompare(b.name, 'de'));
}

/** Waffen für einen Gefolgsmann: Waffen der Kampffertigkeiten, die er besitzt */
export function waffenAngebot(k: Katalog, fertigkeiten: GefolgeFertigkeit[]) {
  const f = new Set(fertigkeiten.map(x => x.id));
  return Object.values(k.eintraege).filter(e => e.typ === 'waffe' && f.has(e.daten.fertigkeit))
    .map(e => ({ id: e.id, name: e.name, fertigkeit: k.get(e.daten.fertigkeit)?.name ?? '', modus: String(e.daten.modus ?? ''), schaden: String(e.daten.schaden ?? '') }))
    .sort((a, b) => a.fertigkeit.localeCompare(b.fertigkeit, 'de') || a.name.localeCompare(b.name, 'de'));
}
