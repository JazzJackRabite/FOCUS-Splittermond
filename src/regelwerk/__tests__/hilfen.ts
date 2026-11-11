import fs from 'fs';
import path from 'path';
import type { Basis } from '../laden';
import type { LadePaket, Manifest, RegelPaket } from '../typen';
import type { BedingungsCharakter } from '../bedingungen';

export const PUBLIC = path.resolve(__dirname, '../../../public/regelpakete');

export function basisAusDateien(ordner = PUBLIC): Basis {
  const manifest = JSON.parse(fs.readFileSync(path.join(ordner, 'manifest.json'), 'utf-8')) as Manifest;
  const info = manifest.pakete.find(p => p.id === manifest.basis_paket)!;
  const paket = JSON.parse(fs.readFileSync(path.join(ordner, info.datei!), 'utf-8')) as RegelPaket;
  return { manifest, basis: { info, paket, erwarteteEintraege: info.eintraege } as LadePaket, warnungen: [] };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function charAusJson(c: any): BedingungsCharakter {
  const out: BedingungsCharakter = { hat: new Set(c.hat), werte: c.werte, schwerpunkte: c.schwerpunkte, zauber: c.zauber };
  for (const k of ['tier', 'wesen'] as const) if (c[k]) out[k] = { ...c[k], hat: new Set(c[k].hat ?? []) };
  for (const k of ['typus', 'gk', 'stufe', 'gottheit', 'gewaehlte_magieschule', 'auswahl_geprueft']) if (k in c) (out as unknown as Record<string, unknown>)[k] = c[k];
  return out;
}

/**
 * Ordner mit den Grimoires für lokale Volltests (FOKUS_GRIMOIRES; FOKUS_BUECHER gilt als alter Name weiter).
 * Leer: die Tests mit Grimoires werden übersprungen.
 */
export const GRIMOIRE_ORDNER = process.env.FOKUS_GRIMOIRES ?? process.env.FOKUS_BUECHER ?? '';

/** Ist das eine Grimoire-Datei? `.grim`; `.srp.json` aus älteren Exporten der Datenseite wird weiter gelesen */
export const istGrimoireDatei = (f: string) => f.endsWith('.grim') || (f.endsWith('.srp.json') && !f.startsWith('grw.'));

/** Pfad eines Grimoires im Ordner (`<id>.grim`, sonst die ältere Endung); leer ohne Ordner */
export function grimoireDatei(id: string): string {
  if (!GRIMOIRE_ORDNER) return '';
  const grim = path.join(GRIMOIRE_ORDNER, `${id}.grim`);
  return fs.existsSync(grim) ? grim : path.join(GRIMOIRE_ORDNER, `${id}.srp.json`);
}
