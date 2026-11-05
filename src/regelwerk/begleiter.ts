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
import type { Mastery } from '../types';

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
