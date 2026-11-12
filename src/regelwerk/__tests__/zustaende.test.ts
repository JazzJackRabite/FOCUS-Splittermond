/** Die Zustandsauswahl kommt aus den Paketen: 17 Zustände des Grundregelwerks (S. 168–169) plus Kampfposition Liegend. */
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { Katalog } from '../katalog';
import { erstelleKatalog, grimoireLesen } from '../laden';
import { basisAusDateien, grimoireDatei } from './hilfen';
import { alleZustaende, zustandHatStufe, zustandsliste } from '../zustaende';
import { getConditionDescription, getConditionMalus, probenbereich } from '../../utils/conditionModifiers';
import { ZUSTAENDE } from '../../data/zustaende';
import { setzeAktivenKatalog } from '../bruecke';

const basis = basisAusDateien();
const K = new Katalog(basis.manifest, [basis.basis]);
const GRW = ['Angsterfüllt', 'Benommen', 'Bewusstlos', 'Blutend', 'Brennend', 'Erschöpft', 'Geblendet', 'Glaubenskrise', 'Krank', 'Lahm', 'Panisch', 'Rasend', 'Ringend', 'Schlafend', 'Siechtum', 'Sterbend', 'Verwundet'];

const ALLE = [...GRW, 'Erschaudert', 'Geistreisend', 'Schwermut', 'Verorkt', 'Verstoßen', 'Übergangsschock'];

describe('Zustände aus dem Paket', () => {
  it('alle 23 Zustände sind wählbar (Übersicht im Splitterwiki), dazu die Kampfposition Liegend – sonst nichts', () => {
    const erwartet = [...ALLE, 'Liegend'].sort((a, b) => a.localeCompare(b, 'de'));
    expect(alleZustaende(K)).toEqual(erwartet);
    expect(alleZustaende(null)).toEqual(erwartet);
  });

  it('Stufen: für die 17 Zustände des Grundregelwerks laut Paket, für die übrigen laut Zustandsdaten', () => {
    const mitStufe = zustandsliste(K).filter((z) => z.mitStufe).map((z) => z.name);
    expect(mitStufe).toEqual(['Benommen', 'Blutend', 'Brennend', 'Erschaudert', 'Erschöpft', 'Geblendet', 'Glaubenskrise', 'Siechtum', 'Sterbend', 'Übergangsschock', 'Verorkt', 'Verwundet'].sort((a, b) => a.localeCompare(b, 'de')));
    expect(zustandsliste(null).filter((z) => z.mitStufe).map((z) => z.name)).toEqual(mitStufe);
    expect(zustandHatStufe('Krank', K)).toBe(false);
  });

  it('Zustandsdaten und Paket widersprechen sich nicht: gleiche Stufenangabe für jeden Zustand des Grundregelwerks', () => {
    for (const z of zustandsliste(K).filter((x) => x.id)) expect(!!ZUSTAENDE[z.name]?.stufe, z.name).toBe(z.mitStufe);
    for (const name of GRW) expect(ZUSTAENDE[name], name).toBeDefined();
  });

  it('Abzüge, die an Attributen hängen: Schwermut (WIL), Erschaudert (VER), Übergangsschock (BEW, KON, STÄ)', () => {
    const m = (key: string, level: number, fertigkeit: string) => getConditionMalus({ id: 'x', key, level }, { bereich: probenbereich(fertigkeit), fertigkeit })?.malus ?? null;
    expect(m('Schwermut', 1, 'Entschlossenheit')).toBe(-2); // AUS + WIL
    expect(m('Schwermut', 1, 'Akrobatik')).toBeNull(); // BEW + STÄ
    expect(m('Erschaudert', 3, 'Arkane Kunde')).toBe(-3); // MYS + VER
    expect(m('Erschaudert', 3, 'Athletik')).toBeNull();
    expect(m('Übergangsschock', 2, 'Akrobatik')).toBe(-2);
    expect(m('Übergangsschock', 2, 'Arkane Kunde')).toBeNull();
    expect(m('Verorkt', 2, 'Akrobatik')).toBeNull(); // Zahlen nicht hinterlegt
  });

  it('die Beschreibung kommt aus dem Paket', () => {
    setzeAktivenKatalog(K, false);
    expect(getConditionDescription({ id: 'x', key: 'Benommen', level: 1 })).toContain('Tick');
    setzeAktivenKatalog(null, false);
  });

  const buch = grimoireDatei('schleier');
  it.skipIf(!buch || !fs.existsSync(buch))('Zustände eines geladenen Buchs erscheinen in der Auswahl', () => {
    const { katalog: k } = erstelleKatalog(basis, [grimoireLesen(fs.readFileSync(buch, 'utf-8'), basis.manifest)]);
    expect(alleZustaende(k).length).toBeGreaterThan(18);
    expect(zustandHatStufe('Geistreisend', k)).toBe(false);
  });
});
