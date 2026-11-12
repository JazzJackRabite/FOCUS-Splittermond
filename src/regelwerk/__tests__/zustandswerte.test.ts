/** Zustände wirken auf abgeleitete Werte und Fokus – Zahlen aus den Paketeinträgen (daten.zustandswirkung). */
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { Katalog } from '../katalog';
import { erstelleKatalog, grimoireLesen } from '../laden';
import { basisAusDateien, grimoireDatei } from './hilfen';
import { fokusDurchZustaende, mitZustaenden, zustandswerte } from '../zustandswerte';
import { getConditionMalus } from '../../utils/conditionModifiers';
import type { StatusCondition } from '../../types';

const basis = basisAusDateien();
const K = new Katalog(basis.manifest, [basis.basis]);
const z = (key: string, level?: number): StatusCondition => ({ id: key, key, ...(level ? { level } : {}) });

describe('Zustände und abgeleitete Werte (GRW S. 168–169)', () => {
  it('Erschöpft 2: Geschwindigkeit −2, Initiative +2', () => {
    const zw = zustandswerte([z('Erschöpft', 2)], K);
    expect(mitZustaenden('GSW', 8, zw)).toBe(6);
    expect(mitZustaenden('INI', 7, zw)).toBe(9);
    expect(mitZustaenden('VTD', 20, zw)).toBe(20);
  });

  it('Ringend: Verteidigung −3, Geschwindigkeit 0', () => {
    const zw = zustandswerte([z('Ringend')], K);
    expect(mitZustaenden('VTD', 20, zw)).toBe(17);
    expect(mitZustaenden('GSW', 8, zw)).toBe(0);
  });

  it('Lahm: halbe Geschwindigkeit (abgerundet), nach Zu- und Abschlägen', () => {
    expect(mitZustaenden('GSW', 9, zustandswerte([z('Lahm')], K))).toBe(4);
    expect(mitZustaenden('GSW', 9, zustandswerte([z('Lahm'), z('Erschöpft', 1)], K))).toBe(4);
  });

  it('Bewusstlos und Schlafend gelten als liegend; Liegend selbst ebenso – als Hinweis, ohne Wertänderung', () => {
    for (const k of ['Bewusstlos', 'Schlafend', 'Liegend']) {
      const zw = zustandswerte([z(k)], K);
      expect(zw.hinweise[0], k).toMatch(/gilt als liegend.*\+6.*−6/);
      expect(mitZustaenden('VTD', 20, zw)).toBe(20);
    }
  });

  it('ohne Paket rechnet der Rückfall genauso', () => {
    expect(mitZustaenden('GSW', 8, zustandswerte([z('Erschöpft', 2)], null))).toBe(6);
    expect(mitZustaenden('VTD', 20, zustandswerte([z('Ringend')], null))).toBe(17);
  });

  it('Geblendet: bei Angriffen und Zaubern gesetzt, bei Fertigkeitsproben nicht vorausgewählt', () => {
    expect(getConditionMalus(z('Geblendet', 1), { bereich: 'kampf' })?.vorausgewaehlt).toBe(true);
    expect(getConditionMalus(z('Geblendet', 1), { bereich: 'magie' })?.vorausgewaehlt).toBe(true);
    expect(getConditionMalus(z('Geblendet', 1), { bereich: 'allgemein' })?.vorausgewaehlt).toBe(false);
  });

  const buecher = ['schleier', 'jenseits', 'goetter'].map((id) => grimoireDatei(id));
  it.skipIf(buecher.some((b) => !b || !fs.existsSync(b)))('Zustände aus Grimoires: Schwermut, Übergangsschock, Erschaudert, Verstoßen', () => {
    const { katalog: k } = erstelleKatalog(basis, buecher.map((b) => grimoireLesen(fs.readFileSync(b, 'utf-8'), basis.manifest)));
    const zw = zustandswerte([z('Schwermut'), z('Übergangsschock', 2), z('Erschaudert', 1)], k);
    expect(mitZustaenden('GW', 20, zw)).toBe(15); // −2 −2 −1
    expect(mitZustaenden('VTD', 20, zw)).toBe(18);
    expect(fokusDurchZustaende(13, zustandswerte([z('Verstoßen', 1)], k))).toBe(3);
    expect(fokusDurchZustaende(13, zustandswerte([z('Verstoßen', 4)], k))).toBe(13);
  });
});
