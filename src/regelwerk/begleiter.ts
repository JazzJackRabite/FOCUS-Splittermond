/**
 * Begleiter aus dem Katalog:
 * - Tiergefährten über die Ressource Kreatur (GRW S. 78; Bestienmeister): Kreaturen und Tiere, deren Merkmal „Kreatur N“ höchstens
 *   der Ressourcenstufe entspricht. Werte direkt aus dem Wertekasten oder aus daten.werte_berechnet („Werte wie … mit Änderungen“).
 * - Beschworene Wesen (Die Magie S. 186–191): verfügbare Dienste über verfuegbareDienste().
 */
import type { Katalog } from './katalog';
import type { Eintrag } from './typen';
import { verfuegbareDienste, type VerfuegbarerDienst } from './dienste';
import { meisterschaftId } from './bruecke';
import { erfuellt, type BedingungsCharakter, type Traeger } from './bedingungen';
import type { Ergebnis } from './typen';
import type { Begleiter, Mastery } from '../types';

export interface Wertekasten {
  attribute?: Record<string, string>;
  abgeleitete_werte?: Record<string, string>;
  waffen?: { name: string; wert: string; schaden: string; wgs: string; ini: string; merkmale: string }[];
  felder?: Record<string, string>;
  berechnet?: boolean;
}

export function wertekasten(e: Eintrag): Wertekasten | null {
  const d = e.daten.werte_berechnet ?? e.daten;
  if (!d.abgeleitete_werte) return null;
  return { attribute: d.attribute, abgeleitete_werte: d.abgeleitete_werte, waffen: d.waffen, felder: d.felder, berechnet: !!e.daten.werte_berechnet };
}

/** nötige Stufe der Ressource Kreatur (Merkmal „Kreatur N“); null = kein Tiergefährte */
export function kreaturStufe(e: Eintrag): number | null {
  const d = e.daten.werte_berechnet ?? e.daten;
  if (typeof d.ressource_kreatur === 'number') return d.ressource_kreatur;
  const m = String(d.felder?.merkmale ?? '').match(/Kreatur (\d+)/);
  return m ? Number(m[1]) : null;
}

export interface Tiergefaehrte { id: string; name: string; stufe: number; typus: string; quelle: string; eintrag: Eintrag }

/** Alle Tiergefährten im Katalog (mit Werten und Merkmal Kreatur), sortiert nach Stufe und Name */
export function tiergefaehrten(k: Katalog): Tiergefaehrte[] {
  return Object.values(k.eintraege)
    .filter(e => (e.typ === 'kreatur' || e.typ === 'tier') && wertekasten(e) && kreaturStufe(e) !== null)
    .map(e => ({ id: e.id, name: e.name, stufe: kreaturStufe(e)!, typus: String((e.daten.werte_berechnet ?? e.daten).felder?.typus ?? ''),
      quelle: k.pakete[e.quelle.paket]?.kuerzel ?? e.quelle.paket, eintrag: e }))
    .sort((a, b) => a.stufe - b.stufe || a.name.localeCompare(b.name, 'de'));
}

export interface BeschwoerbaresWesen { id: string; name: string; stufe: number; quelle: string; mitWerten: boolean }

export function beschwoerbareWesen(k: Katalog): BeschwoerbaresWesen[] {
  return Object.values(k.eintraege)
    .filter(e => e.daten.beschwoerbares_wesen_stufe !== undefined && e.daten.beschwoerbares_wesen_stufe !== null)
    .map(e => ({ id: e.id, name: e.name, stufe: Number(e.daten.beschwoerbares_wesen_stufe), quelle: k.pakete[e.quelle.paket]?.kuerzel ?? e.quelle.paket, mitWerten: !!wertekasten(e) }))
    .sort((a, b) => a.stufe - b.stufe || a.name.localeCompare(b.name, 'de'));
}

/** Dienste eines Wesens für einen Zauberer mit diesen Meisterschaften (Editor-Format) */
export function diensteFuer(k: Katalog, wesen: string, meisterschaften: Record<string, Mastery[]>, dienstexperte: string[] = []): VerfuegbarerDienst[] {
  const ids: string[] = [];
  for (const [skill, liste] of Object.entries(meisterschaften)) for (const m of liste) { const i = meisterschaftId(k, m.name, skill); if (i) ids.push(i); }
  return verfuegbareDienste(k, wesen, ids, dienstexperte);
}

// ---------------------------------------------------------------- Tiere: Typus, Potenzial, Abrichtungen (Bestienmeister S. 15–23)

/** Typus-Liste des Wertekastens („Katzenartiger, Reittier, Tier“ → [..]) */
export function typusListe(e: Eintrag): string[] {
  const d = e.daten.werte_berechnet ?? e.daten;
  return String(d.felder?.typus ?? '').split(',').map((x: string) => x.trim()).filter(Boolean);
}

/** Alle Tiere mit Werten: Tiergefährten (Merkmal Kreatur N) und weitere Tiere (Typus Tier), z. B. gekaufte Reittiere */
export function alleTiere(k: Katalog): Tiergefaehrte[] {
  return Object.values(k.eintraege)
    .filter(e => (e.typ === 'kreatur' || e.typ === 'tier') && wertekasten(e) && (kreaturStufe(e) !== null || typusListe(e).includes('Tier')))
    .map(e => ({ id: e.id, name: e.name, stufe: kreaturStufe(e) ?? 0, typus: typusListe(e).join(', '),
      quelle: k.pakete[e.quelle.paket]?.kuerzel ?? e.quelle.paket, eintrag: e }))
    .sort((a, b) => a.name.localeCompare(b.name, 'de') || a.quelle.localeCompare(b.quelle, 'de'));
}

/** Qualität gekaufter Tiere → Grundpotenzial (Bestienmeister S. 15, Tabelle „Tier / Potenzial / Preis“) */
export const TIER_QUALITAET: { name: string; potenzial: number }[] = [
  { name: 'Wildtier / unausgebildet / einfach', potenzial: 1 },
  { name: 'Vielversprechend', potenzial: 2 },
  { name: 'Hervorragend', potenzial: 4 },
  { name: 'Prachtexemplar', potenzial: 5 },
  { name: 'Legendär', potenzial: 6 },
];

export interface AbrichtungsInfo {
  id: string; name: string; gruppe: string; kosten: number; beschreibung: string;
  /** höchstens so oft wählbar (Infinity = beliebig oft) */
  hoechstens: number; mehrfachText: string | null;
  /** Grundausbildung: wird über die Abrichtung „Grundausbildung“ erlernt (kostet 1, braucht deren Voraussetzung) */
  grundausbildung: boolean;
  voraussetzung: { text: string; bedingung: unknown } | null;
  quelle: string; seite?: number;
}

const ZAHLWORT: Record<string, number> = { einmal: 1, zweimal: 2, dreimal: 3, viermal: 4, fuenfmal: 5, 'fünfmal': 5 };

/** „maximal viermal“ → 4, „beliebig oft …“ → Infinity, „einmal pro HG des Besitzers“ → Heldengrad, null → 1 */
export function mehrfachGrenze(text: string | null | undefined, heldengrad: number): number {
  if (!text) return 1;
  const t = text.toLowerCase();
  if (t.includes('beliebig')) return Infinity;
  if (/pro (hg|heldengrad)/.test(t) && !/magieschule/.test(t)) return heldengrad;
  const m = t.match(/(einmal|zweimal|dreimal|viermal|fünfmal|fuenfmal)/);
  if (m && t.includes('maximal')) return ZAHLWORT[m[1]];
  return Infinity; // z. B. „einmal pro Magieschule und Heldengrad“: Grenze hängt von der Wahl ab → Spielleitung
}

/** Alle Abrichtungen im Katalog (leer ohne Buchpaket „Bestienmeister“) */
export function abrichtungen(k: Katalog): AbrichtungsInfo[] {
  const alle = Object.values(k.eintraege).filter(e => e.typ === 'abrichtung');
  const grund = alle.find(e => e.name === 'Grundausbildung' && !e.daten.tabellenzeile);
  return alle.map(e => {
    const d = e.daten;
    const ga = !!d.tabellenzeile || d.gruppe === 'Grundausbildungen';
    let v = d.voraussetzungen && typeof d.voraussetzungen === 'object' && 'bedingung' in d.voraussetzungen ? d.voraussetzungen : null;
    const gv = grund?.daten.voraussetzungen;
    if (ga && gv?.bedingung) v = v ? { text: `${gv.text}, ${v.text}`, bedingung: { alle: [gv.bedingung, v.bedingung] } } : gv;
    return {
      id: e.id, name: e.name, gruppe: String(d.gruppe ?? ''), beschreibung: String(d.beschreibung ?? ''),
      kosten: typeof d.potenzial_kosten === 'number' ? d.potenzial_kosten : 1,
      hoechstens: ga ? 1 : mehrfachGrenze(d.mehrfach, 4), mehrfachText: d.mehrfach ?? null,
      grundausbildung: ga, voraussetzung: v ?? null,
      quelle: k.pakete[e.quelle.paket]?.kuerzel ?? e.quelle.paket, seite: e.quelle.buch_seiten?.[0],
    };
  }).filter(a => !(a.name === 'Grundausbildung' && !a.grundausbildung)) // die Sammel-Abrichtung selbst nicht anbieten
    .sort((a, b) => a.gruppe.localeCompare(b.gruppe, 'de') || a.name.localeCompare(b.name, 'de'));
}

/** Tier als Träger für Bedingungen mit "traeger": "tier" (Abrichtungen, Typus, Größenklasse, Fertigkeiten) */
export function tierTraeger(k: Katalog, b: Begleiter, bisIndex?: number): Traeger {
  const e = k.get(b.id);
  const d = e ? (e.daten.werte_berechnet ?? e.daten) : {};
  const werte: Record<string, number> = {};
  for (const f of d.fertigkeiten_refs ?? []) if (f?.id && typeof f.wert === 'number') werte[f.id] = f.wert;
  const gk = Number.parseInt(String(d.abgeleitete_werte?.GK ?? ''), 10);
  const ab = (b.abrichtungen ?? []).slice(0, bisIndex ?? undefined);
  return { hat: ab, werte, typus: e ? typusListe(e) : [], gk: Number.isFinite(gk) ? gk : null };
}

const WAHL = ['erste Wahl', 'zweite Wahl', 'dritte Wahl', 'vierte Wahl', 'fünfte Wahl'];

/** Prüft die Voraussetzung einer Abrichtung für den Tierführer (char) und sein Tier. n = wievielte Wahl (0 = erste). */
export function pruefeAbrichtung(k: Katalog, a: AbrichtungsInfo, char: BedingungsCharakter, tier: Traeger, n = 0): Ergebnis {
  if (!a.voraussetzung) return true;
  return erfuellt({ ...char, tier, stufe: WAHL[n] ?? WAHL[WAHL.length - 1] }, a.voraussetzung.bedingung, k);
}

export interface PotenzialPosten { text: string; wert: number }

/** Potenzial eines Tieres (Bestienmeister S. 15) mit Aufschlüsselung */
export function potenzial(k: Katalog, b: Begleiter, meisterschaftsIds: string[]): { gesamt: number; posten: PotenzialPosten[] } {
  const posten: PotenzialPosten[] = [];
  const q = TIER_QUALITAET.find(x => x.potenzial === (b.qualitaet ?? 1));
  posten.push({ text: b.qualitaet && b.qualitaet > 1 ? `Grundwert (${q?.name ?? 'Qualität'})` : 'Grundwert', wert: b.qualitaet ?? 1 });
  if (b.kreatur) posten.push({ text: `Ressource Kreatur ${b.kreatur}`, wert: 2 * b.kreatur });
  if (b.vertrauter) posten.push({ text: 'Tiervertrauter', wert: 3 });
  const anzahl = (name: string) => meisterschaftsIds.filter(i => k.get(i)?.name === name).length;
  const ts = anzahl('Tierspezialist'); if (ts) posten.push({ text: `Tierspezialist${ts > 1 ? ` ×${ts}` : ''}`, wert: ts });
  if (anzahl('Meister der Bestien')) posten.push({ text: 'Meister der Bestien', wert: 2 });
  if (b.kreatur && anzahl('Meisterbändiger')) posten.push({ text: 'Meisterbändiger (Kreatur)', wert: 1 });
  return { gesamt: posten.reduce((s, p) => s + p.wert, 0), posten };
}

/** Kosten der gewählten Abrichtungen in Potenzialpunkten */
export function potenzialVerbraucht(liste: AbrichtungsInfo[], gewaehlt: string[]): number {
  const m = new Map(liste.map(a => [a.id, a]));
  return gewaehlt.reduce((s, i) => s + (m.get(i)?.kosten ?? 1), 0);
}

/** Reittier: Typus Reittier oder Grundausbildung Reittier I */
export function istReittier(k: Katalog, b: Begleiter): boolean {
  const e = k.get(b.id);
  return (e ? typusListe(e).includes('Reittier') : false) || (b.abrichtungen ?? []).some(i => /reittier-i$/.test(i));
}

/** Stufe eines beschwörbaren Wesens (null, wenn nicht angegeben) */
export function wesenStufe(e: Eintrag | undefined): number | null {
  const s = Number(e?.daten.beschwoerbares_wesen_stufe);
  return Number.isFinite(s) && s > 0 ? s : null;
}
