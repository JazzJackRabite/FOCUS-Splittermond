/** Die Zustandsauswahl kommt aus den Paketen: 17 Zustände des Grundregelwerks (S. 168–169) plus Kampfposition Liegend. */
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { Katalog } from '../katalog';
import { erstelleKatalog, grimoireLesen } from '../laden';
import { basisAusDateien, grimoireDatei } from './hilfen';
import { alleZustaende, zustandHatStufe, zustandQuelle, zustandsliste } from '../zustaende';
import { getConditionDescription, getConditionMalus, probenbereich, zustandTooltip } from '../../utils/conditionModifiers';
import { GRW_ZUSTAENDE } from '../../data/zustaende';
import { setzeAktivenKatalog } from '../bruecke';

const basis = basisAusDateien();
const K = new Katalog(basis.manifest, [basis.basis]);
const GRW = ['Angsterfüllt', 'Benommen', 'Bewusstlos', 'Blutend', 'Brennend', 'Erschöpft', 'Geblendet', 'Glaubenskrise', 'Krank', 'Lahm', 'Panisch', 'Rasend', 'Ringend', 'Schlafend', 'Siechtum', 'Sterbend', 'Verwundet'];

describe('Zustände aus den Paketen', () => {
  it('Grundregelwerk-Paket: die 17 Zustände des Grundregelwerks, dazu die Kampfposition Liegend – keine Zustände aus anderen Bänden', () => {
    const erwartet = [...GRW, 'Liegend'].sort((a, b) => a.localeCompare(b, 'de'));
    expect(alleZustaende(K)).toEqual(erwartet);
    expect(alleZustaende(null)).toEqual(erwartet);
    for (const n of ['Schwermut', 'Verstoßen', 'Verorkt', 'Erschaudert']) expect(alleZustaende(K)).not.toContain(n);
  });

  it('Stufen laut Paket; der Rückfall ohne Paket stimmt damit überein', () => {
    const mitStufe = zustandsliste(K).filter((z) => z.mitStufe).map((z) => z.name);
    expect(mitStufe).toEqual(['Benommen', 'Blutend', 'Brennend', 'Erschöpft', 'Geblendet', 'Glaubenskrise', 'Siechtum', 'Sterbend', 'Verwundet']);
    expect(zustandsliste(null).filter((z) => z.mitStufe).map((z) => z.name)).toEqual(mitStufe);
  });

  it('Rückfall und Paket haben dieselben Abzüge und Seiten', () => {
    for (const z of zustandsliste(K).filter((x) => x.id)) {
      expect(GRW_ZUSTAENDE[z.name]?.wirkung, z.name).toEqual(z.wirkung);
      expect(`GRW S. ${GRW_ZUSTAENDE[z.name]?.seite}`, z.name).toBe(z.quelle);
    }
  });

  it('Quelle mit Seite für die Anzeige beim Überfahren mit der Maus', () => {
    expect(zustandQuelle('Benommen', K)).toBe('GRW S. 168');
    expect(zustandQuelle('Verwundet', K)).toBe('GRW S. 169');
    expect(zustandQuelle('Liegend', K)).toBe('GRW S. 170 (Kampfposition)');
    setzeAktivenKatalog(K, false);
    expect(zustandTooltip({ id: 'x', key: 'Benommen', level: 1 })).toMatch(/Tick[\s\S]*Quelle: GRW S\. 168$/);
    setzeAktivenKatalog(null, false);
  });

  it('die Beschreibung kommt aus dem Paket', () => {
    setzeAktivenKatalog(K, false);
    expect(getConditionDescription({ id: 'x', key: 'Benommen', level: 1 })).toContain('Tick');
    setzeAktivenKatalog(null, false);
  });

  const buecher = ['schleier', 'jenseits', 'goetter'].map((id) => grimoireDatei(id));
  it.skipIf(buecher.some((b) => !b || !fs.existsSync(b)))('Zustände aus Grimoires: wählbar, mit Quelle, Abzüge aus dem Paket', () => {
    const { katalog: k } = erstelleKatalog(basis, buecher.map((b) => grimoireLesen(fs.readFileSync(b, 'utf-8'), basis.manifest)));
    for (const n of ['Erschaudert', 'Geistreisend', 'Übergangsschock', 'Schwermut', 'Verstoßen']) expect(alleZustaende(k), n).toContain(n);
    expect(zustandQuelle('Schwermut', k)).toMatch(/S\. 51$/);
    expect(zustandQuelle('Verstoßen', k)).toMatch(/S\. 147$/);
    expect(zustandHatStufe('Verstoßen', k)).toBe(true);
    setzeAktivenKatalog(k, false);
    const m = (key: string, level: number, fertigkeit: string) => getConditionMalus({ id: 'x', key, level }, { bereich: probenbereich(fertigkeit), fertigkeit })?.malus ?? null;
    expect(m('Schwermut', 1, 'Entschlossenheit')).toBe(-2); // AUS + WIL
    expect(m('Schwermut', 1, 'Akrobatik')).toBeNull();
    expect(m('Erschaudert', 3, 'Arkane Kunde')).toBe(-3); // MYS + VER
    expect(m('Übergangsschock', 2, 'Akrobatik')).toBe(-2);
    expect(m('Übergangsschock', 2, 'Arkane Kunde')).toBeNull();
    setzeAktivenKatalog(null, false);
  });
});
