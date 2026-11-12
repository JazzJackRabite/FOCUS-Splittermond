/** Die Zustandsauswahl kommt aus den Paketen: 17 Zustände des Grundregelwerks (S. 168–169) plus Kampfposition Liegend. */
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { Katalog } from '../katalog';
import { basisAusDateien } from './hilfen';
import { alleZustaende, zustandHatStufe, zustandsliste } from '../zustaende';
import { getConditionDescription } from '../../utils/conditionModifiers';
import { setzeAktivenKatalog } from '../bruecke';

const basis = basisAusDateien();
const K = new Katalog(basis.manifest, [basis.basis]);
const GRW = ['Angsterfüllt', 'Benommen', 'Bewusstlos', 'Blutend', 'Brennend', 'Erschöpft', 'Geblendet', 'Glaubenskrise', 'Krank', 'Lahm', 'Panisch', 'Rasend', 'Ringend', 'Schlafend', 'Siechtum', 'Sterbend', 'Verwundet'];

describe('Zustände aus dem Paket', () => {
  it('alle 17 Zustände des Grundregelwerks sind wählbar, dazu die Kampfposition Liegend – sonst nichts', () => {
    expect(alleZustaende(K)).toEqual([...GRW, 'Liegend'].sort((a, b) => a.localeCompare(b, 'de')));
  });

  it('Stufen wie im Regelwerk', () => {
    const mitStufe = zustandsliste(K).filter((z) => z.mitStufe).map((z) => z.name);
    expect(mitStufe).toEqual(['Benommen', 'Blutend', 'Brennend', 'Erschöpft', 'Geblendet', 'Glaubenskrise', 'Siechtum', 'Sterbend', 'Verwundet']);
    expect(zustandHatStufe('Krank', K)).toBe(false);
  });

  it('ohne Paket gilt dieselbe Liste aus dem eingebauten Rückfall', () => {
    expect(alleZustaende(null)).toEqual(alleZustaende(K));
    expect(zustandsliste(null).filter((z) => z.mitStufe).map((z) => z.name)).toEqual(zustandsliste(K).filter((z) => z.mitStufe).map((z) => z.name));
  });

  it('die Beschreibung kommt aus dem Paket', () => {
    setzeAktivenKatalog(K, false);
    expect(getConditionDescription({ id: 'x', key: 'Benommen', level: 1 })).toContain('Tick');
    setzeAktivenKatalog(null, false);
  });

  const buch = process.env.FOKUS_BUECHER ? path.join(process.env.FOKUS_BUECHER, 'schleier.srp.json') : '';
  it.skipIf(!buch || !fs.existsSync(buch))('Zustände eines geladenen Buchs erscheinen in der Auswahl', () => {
    const k = new Katalog(basis.manifest, [basis.basis, JSON.parse(fs.readFileSync(buch, 'utf8'))]);
    expect(alleZustaende(k).length).toBeGreaterThan(18);
  });
});
