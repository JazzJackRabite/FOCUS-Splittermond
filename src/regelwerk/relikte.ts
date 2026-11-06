/**
 * Relikte (Ressource Relikt, GRW S. 79) als Baukasten.
 * Alle Regeln kommen aus den Regelpaketen:
 * - daten.relikt_baukasten: welche Bausteintypen ein Relikt nutzen darf, Budget und Höchstpunkte (GRW: Ressource Relikt;
 *   Bücher ergänzen Typen, z. B. legendäre Kräfte, göttliche Kräfte, besondere Materialien)
 * - daten.baustein: Kosten, Höchstzahl, Gegenstandsart, Auswahl, Bedingungen und Wertänderungen je Baustein
 * Der Editor prüft nur und warnt; er sperrt nichts (viele Relikt-Regeln sind Spielleiterentscheid).
 */
import type { Katalog } from './katalog';
import type { Eintrag } from './typen';
import type { InventoryItem, Relikt, ReliktBaustein } from '../types';
import type { AusruestungsItem } from './ausruestung';

/** Gegenstandsarten, wie sie daten.baustein.gilt_fuer nennt */
export const GEGENSTANDSARTEN: Record<string, string> = {
  nahkampfwaffe: 'Nahkampfwaffe', fernkampfwaffe: 'Fernkampfwaffe', ruestung: 'Rüstung', schild: 'Schild',
  kleidung: 'Kleidung', gegenstand: 'sonstiger Gegenstand',
};

export interface Baukasten {
  budget: string;
  maxPunkte: number | null;
  typen: string[];
  material: { kosten: number; mindestAus: string } | null;
  /** Einträge, die den Baukasten festlegen (für Quellenangaben) */
  quellen: Eintrag[];
}

export interface BausteinInfo {
  id: string;
  typ: string;
  name: string;
  kosten: number | null;
  kostenNachGrad?: Array<{ grad: number; kosten: number }>;
  kostenJe?: string;
  maxAnzahl: number | null;
  giltFuer: string[];
  auswahl?: string;
  grenze?: string;
  bedingungMerkmal?: string;
  mindestVtd?: number;
  mindestPunkte?: number;
  variante?: string;
  aenderungen: Array<Record<string, unknown>>;
  quelle: string;
  beschreibung: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type D = Record<string, any>;
const txt = (v: unknown) => (v === null || v === undefined ? '' : String(v).trim());

function alleEintraege(k: Katalog): Eintrag[] {
  return [...Object.values(k.eintraege), ...Object.values(k.erweiterungen).flat()];
}

export function quelleText(k: Katalog, e: Eintrag): string {
  const p = k.pakete[e.quelle.paket];
  const kz = p?.kuerzel ?? (k.manifest.bekannte_pakete ?? []).find(x => x.id === e.quelle.paket)?.kuerzel ?? e.quelle.paket.toUpperCase();
  const s = (e.quelle.buch_seiten ?? [])[0];
  return s ? `${kz} S. ${s}` : kz;
}

/** Baukasten aus allen geladenen Paketen; null, wenn kein Paket einen festlegt */
export function reliktBaukasten(k: Katalog | null): Baukasten | null {
  if (!k) return null;
  const quellen = alleEintraege(k).filter(e => e.daten?.relikt_baukasten);
  if (!quellen.length) return null;
  const bk: Baukasten = { budget: 'ressourcenpunkte', maxPunkte: null, typen: [], material: null, quellen };
  for (const e of quellen) {
    const d = e.daten.relikt_baukasten as D;
    if (d.budget) bk.budget = d.budget;
    if (typeof d.max_punkte === 'number') bk.maxPunkte = d.max_punkte;
    for (const t of d.bausteintypen ?? []) if (!bk.typen.includes(t)) bk.typen.push(t);
    if (d.material) bk.material = { kosten: Number(d.material.kosten), mindestAus: String(d.material.mindest_punkte_aus ?? 'qualitaet') };
  }
  return bk;
}

function beschreibung(k: Katalog, e: Eintrag): string {
  const d = e.daten as D;
  const teile = [txt(d.liste?.kurzbeschreibung), txt(d.beschreibung)];
  const felder = d.felder as D | undefined;
  if (felder?.materialeigenschaft) teile.push(`Materialeigenschaft: ${txt(felder.materialeigenschaft)}`);
  if (txt(d.liste?.einschraenkungen)) teile.push(`Einschränkungen: ${txt(d.liste.einschraenkungen)}`);
  if (txt(d.kosten_und_grenzen)) teile.push(`Kosten und Grenzen: ${txt(d.kosten_und_grenzen)}`);
  if (txt(d.fussnote)) teile.push(txt(d.fussnote));
  for (const x of k.erweiterungen[e.id] ?? []) {
    const t = txt((x.daten as D).beschreibung);
    if (t && !teile.includes(t)) teile.push(`${quelleText(k, x)}: ${t}`);
  }
  return teile.filter(Boolean).join('\n\n');
}

/** Alle Bausteine, die der Baukasten erlaubt, sortiert nach Typ (Reihenfolge im Baukasten) und Name */
export function reliktBausteine(k: Katalog | null, bk: Baukasten | null = reliktBaukasten(k)): BausteinInfo[] {
  if (!k || !bk) return [];
  const out: BausteinInfo[] = [];
  for (const e of Object.values(k.eintraege)) {
    if (!bk.typen.includes(e.typ)) continue;
    const d = e.daten as D;
    if (e.typ === 'material') {
      if (!bk.material) continue;
      // Qualität im Eintrag oder in einer Ergänzung (z. B. GRW-Material mit Materialqualität aus einem Buch)
      const q = [d, ...(k.erweiterungen[e.id] ?? []).map(x => x.daten as D)].map(x => Number(x[bk.material!.mindestAus])).find(n => Number.isFinite(n) && n > 0) ?? NaN;
      if (!Number.isFinite(q) || q <= 0) continue;
      out.push({ id: e.id, typ: e.typ, name: e.name, kosten: bk.material.kosten, maxAnzahl: 1, giltFuer: ['alle'], mindestPunkte: q,
        aenderungen: [], quelle: quelleText(k, e), beschreibung: beschreibung(k, e), variante: 'material' });
      continue;
    }
    const b = d.baustein as D | undefined;
    if (!b || (b.kosten === null && !b.kosten_nach_grad)) continue;
    out.push({
      id: e.id, typ: e.typ, name: e.name, kosten: b.kosten ?? null, kostenNachGrad: b.kosten_nach_grad, kostenJe: b.kosten_je,
      maxAnzahl: b.max_anzahl ?? null, giltFuer: b.gilt_fuer ?? ['alle'], auswahl: b.auswahl, grenze: b.grenze,
      bedingungMerkmal: b.bedingung_merkmal, mindestVtd: b.mindest_vtd_bonus, variante: b.variante_von,
      aenderungen: b.aenderungen ?? [], quelle: quelleText(k, e), beschreibung: beschreibung(k, e),
    });
  }
  const ord = (t: string) => bk.typen.indexOf(t);
  return out.sort((a, b) => ord(a.typ) - ord(b.typ) || a.name.localeCompare(b.name, 'de'));
}

/** Gegenstandsart eines Ausrüstungseintrags (für gilt_fuer) */
export function artVon(item: { type?: string; category?: string } | null | undefined): string {
  if (!item) return 'gegenstand';
  if (item.type === 'weapon') return item.category === 'Fernkampf' ? 'fernkampfwaffe' : 'nahkampfwaffe';
  if (item.type === 'armor') return 'ruestung';
  if (item.type === 'shield') return 'schild';
  if (item.type === 'alchemika') return 'alchemikum';
  if (/kleidung/i.test(item.category ?? '')) return 'kleidung';
  return 'gegenstand';
}

/** Passt der Baustein zur Gegenstandsart? */
export function passtZu(b: BausteinInfo, art: string): boolean {
  if (b.giltFuer.includes('alle') && art !== 'alchemikum') return true;
  if (b.giltFuer.includes(art)) return true;
  return b.giltFuer.includes('waffe') && (art === 'nahkampfwaffe' || art === 'fernkampfwaffe');
}

/** Kosten eines gewählten Bausteins (Punkte der Ressource Relikt) */
export function kostenVon(b: BausteinInfo, w: ReliktBaustein): number {
  const n = Math.max(1, w.anzahl || 1);
  if (b.kostenNachGrad) return (b.kostenNachGrad.find(x => x.grad === (w.grad ?? 0))?.kosten ?? 0) * n;
  if (b.kostenJe === 'stufe') return (b.kosten ?? 0) * Math.max(1, w.stufe ?? 1) * n;
  return (b.kosten ?? 0) * n;
}

const merkmalNamen = (attributes?: string) => String(attributes ?? '').split(/,\s*/).map(s => s.replace(/\s*\(?\d+\)?\s*$/, '').trim().toLowerCase()).filter(Boolean);

export interface ReliktPruefung { verwendet: number; warnungen: string[] }

/** Prüft ein Relikt gegen den Baukasten. Nur Warnungen. */
export function pruefeRelikt(relikt: Relikt, bausteine: BausteinInfo[], bk: Baukasten | null, basis?: AusruestungsItem | null): ReliktPruefung {
  const W: string[] = [];
  const nachId = new Map(bausteine.map(b => [b.id, b]));
  let verwendet = 0;
  const anzahl = new Map<string, number>();
  const varianten = new Map<string, string[]>();
  for (const w of relikt.bausteine) {
    const b = nachId.get(w.id);
    if (!b) { W.push(`${w.name ?? w.id}: Baustein nicht geladen (Buch fehlt?) – Kosten nicht gezählt.`); continue; }
    verwendet += kostenVon(b, w);
    anzahl.set(b.id, (anzahl.get(b.id) ?? 0) + Math.max(1, w.anzahl || 1));
    if (b.variante) varianten.set(b.variante, [...(varianten.get(b.variante) ?? []), b.name]);
    if (!passtZu(b, relikt.art)) W.push(`${b.name}: gilt für ${b.giltFuer.map(g => GEGENSTANDSARTEN[g] ?? g).join(', ')}, nicht für ${GEGENSTANDSARTEN[relikt.art] ?? relikt.art}.`);
    if (b.mindestPunkte && relikt.punkte < b.mindestPunkte) W.push(`${b.name}: verlangt mindestens ${b.mindestPunkte} Punkte (Materialqualität).`);
    if (b.bedingungMerkmal && basis && !merkmalNamen((basis as { attributes?: string }).attributes).includes(b.bedingungMerkmal.toLowerCase()))
      W.push(`${b.name}: Der Gegenstand braucht das Merkmal ${b.bedingungMerkmal}.`);
    if (b.mindestVtd && basis && 'vtdBonus' in basis && Number(basis.vtdBonus) < b.mindestVtd) W.push(`${b.name}: nur ab VTD-Bonus +${b.mindestVtd}.`);
    if (b.auswahl && !w.auswahl?.trim()) W.push(`${b.name}: Auswahl fehlt (${AUSWAHL[b.auswahl] ?? b.auswahl}).`);
  }
  for (const [id, n] of anzahl) {
    const b = nachId.get(id)!;
    if (b.maxAnzahl !== null && n > b.maxAnzahl) W.push(`${b.name}: höchstens ${b.maxAnzahl}×, gewählt ${n}×.`);
  }
  for (const [v, namen] of varianten) if (namen.length > 1) W.push(`${v === 'material' ? 'Material' : v}: nur eine Variante wählbar (${namen.join(', ')}).`);
  if (verwendet > relikt.punkte) W.push(`Die Bausteine kosten ${verwendet} Punkte, das Relikt hat ${relikt.punkte}.`);
  if (bk?.maxPunkte !== null && bk?.maxPunkte !== undefined && relikt.punkte > bk.maxPunkte) W.push(`Mehr als ${bk.maxPunkte} Punkte in einem Relikt (nur nach Spielleiterentscheid).`);
  return { verwendet, warnungen: W };
}

export const AUSWAHL: Record<string, string> = {
  zauber: 'Zauber', schwerpunkt: 'Schwerpunkt', schadensart: 'Schadensart', typus: 'Kreaturentypus', fertigkeit: 'Fertigkeit und Umstand', staerke: 'Stärke',
};

/** Punkte der Ressource Relikt (Summe aller Einträge „Relikt“) */
export function ressourcePunkte(resources: Array<{ name: string; level: number }>): number {
  return resources.filter(r => /^Relikt\b/i.test(r.name)).reduce((s, r) => s + (Number(r.level) || 0), 0);
}

/** Der Inventareintrag eines Relikts: Werte des Grundgegenstands, Name und Beschreibung des Relikts */
export function reliktAlsInventar(relikt: Relikt, bausteine: BausteinInfo[], basis: AusruestungsItem | null | undefined, alt?: InventoryItem): InventoryItem {
  const nachId = new Map(bausteine.map(b => [b.id, b]));
  const zeilen = relikt.bausteine.map(w => {
    const b = nachId.get(w.id);
    const name = b?.name ?? w.name ?? w.id;
    const extra = [w.grad !== undefined && b?.kostenNachGrad ? `Grad ${w.grad}` : '', w.stufe && b?.kostenJe ? `Stufe ${w.stufe}` : '', w.auswahl ?? ''].filter(Boolean).join(', ');
    return `• ${name}${(w.anzahl ?? 1) > 1 ? ` ×${w.anzahl}` : ''}${extra ? ` (${extra})` : ''}${b ? ` – ${kostenVon(b, w)} P., ${b.quelle}` : ''}`;
  });
  const kopf = `Relikt mit ${relikt.punkte} Punkten${basis ? ` auf Basis von ${basis.name}` : ''}.`;
  const desc = [kopf, ...zeilen, relikt.notiz ?? ''].filter(Boolean).join('\n');
  const b = (basis ?? {}) as Record<string, unknown>;
  const typ = (basis?.type ?? (relikt.art === 'ruestung' ? 'armor' : relikt.art === 'schild' ? 'shield' : relikt.art.endsWith('waffe') ? 'weapon' : 'gear')) as InventoryItem['type'];
  const last = typeof b.load === 'number' ? b.load : parseInt(String(b.load ?? ''), 10) || 0;
  return {
    id: relikt.inventarId,
    name: relikt.name,
    type: typ,
    category: 'Relikt',
    quantity: 1,
    weight: alt?.weight ?? last,
    price: undefined,
    desc,
    equipped: alt?.equipped ?? false,
    source: basis?.source ?? 'Eigen',
    page: typeof basis?.page === 'number' && basis.page ? basis.page : undefined,
    weaponSkill: b.skill as string | undefined,
    damage: b.damage as string | undefined,
    wgs: b.wgs as number | string | undefined,
    range: b.range as string | undefined,
    attributes: b.attributes as string | undefined,
    vtdBonus: b.vtdBonus as number | undefined,
    sr: b.sr as number | undefined,
    handicap: b.handicap as number | undefined,
    tickModifier: b.tickModifier as number | undefined,
    minStrength: b.minStrength as number | undefined,
  };
}
