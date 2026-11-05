/**
 * Begleiter: Tiergefährten aus dem GRW (Ressource Kreatur, S. 78; Tierwerte S. 284–287), Zustand und Karte.
 */
import React from 'react';
import fs from 'fs';
import path from 'path';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { baseCharacterReducer, DEFAULT_STATE } from '../../hooks/useCharacterState';
import { CharacterContext } from '../../context/CharacterContext';
import { BegleiterKarte } from '../../components/begleiter/BegleiterKarte';
import { Katalog } from '../katalog';
import { basisAusDateien } from './hilfen';
import { erstelleKatalog, buchpaketLesen } from '../laden';
import { beschwoerbareWesen, diensteFuer, kreaturStufe, tiergefaehrten, wertekasten } from '../begleiter';

const b = basisAusDateien(); const K = new Katalog(b.manifest, [b.basis]);
vi.mock('../RegelwerkContext', () => ({ useRegelwerk: () => ({ katalog: K }) }));

describe('Tiergefährten aus dem GRW', () => {
  const tiere = tiergefaehrten(K);
  it('liefert Tiere mit Werten und Stufe', () => {
    expect(tiere.map(t => t.name)).toEqual(expect.arrayContaining(['Taube', 'Pferd', 'Wolf', 'Riesenschlange']));
    expect(tiere.length).toBeGreaterThan(0);
    for (const t of tiere) { expect(wertekasten(t.eintrag)?.abgeleitete_werte).toBeTruthy(); expect(kreaturStufe(t.eintrag)).toBe(t.stufe); }
    expect([...tiere].map(t => t.stufe)).toEqual([...tiere].map(t => t.stufe).sort((a, c) => a - c));
  });
  it('ohne Magie-Paket keine beschwörbaren Wesen', () => {
    expect(beschwoerbareWesen(K)).toEqual([]);
  });
});

describe('Begleiter-Zustand und Karte', () => {
  it('Reducer: hinzufügen und entfernen', () => {
    let s = baseCharacterReducer(DEFAULT_STATE, { type: 'BEGLEITER_HINZU', payload: { id: 'x', art: 'tier', name: 'Wolf' } });
    s = baseCharacterReducer(s, { type: 'BEGLEITER_HINZU', payload: { id: 'y', art: 'tier', name: 'Pferd' } });
    expect(s.begleiter?.map(x => x.name)).toEqual(['Wolf', 'Pferd']);
    s = baseCharacterReducer(s, { type: 'BEGLEITER_ENTFERNEN', payload: { index: 0 } });
    expect(s.begleiter?.map(x => x.name)).toEqual(['Pferd']);
  });

  it('Karte: Tiere über der Ressourcenstufe gesperrt, Werte aufklappbar', () => {
    const Rahmen: React.FC = () => {
      const [state, dispatch] = React.useReducer(baseCharacterReducer, {
        ...DEFAULT_STATE, resourcesList: [{ name: 'Kreatur', level: 3, source: 'test' }],
      });
      return <CharacterContext.Provider value={{ state, dispatch, calc: {} as never }}><BegleiterKarte /></CharacterContext.Provider>;
    };
    render(<Rahmen />);
    const sel = screen.getByLabelText('Tiergefährte wählen') as HTMLSelectElement;
    const opt = (n: string) => [...sel.options].find(o => o.text.startsWith(n))!;
    expect(opt('Pferd').disabled).toBe(false);
    expect(opt('Wolf').disabled).toBe(true);
    fireEvent.change(sel, { target: { value: opt('Pferd').value } });
    fireEvent.click(screen.getByRole('button', { name: /Hinzufügen/ }));
    const eintrag = screen.getByRole('button', { name: /^Pferd$/ });
    fireEvent.click(eintrag);
    expect(screen.getByText('GSW')).toBeTruthy();
    fireEvent.click(screen.getByLabelText('Pferd entfernen'));
    expect(screen.queryByRole('button', { name: /^Pferd$/ })).toBeNull();
  });
});

const MAGIE = process.env.FOKUS_BUECHER ? path.join(process.env.FOKUS_BUECHER, 'magie.srp.json') : '';
describe.skipIf(!MAGIE || !fs.existsSync(MAGIE))('Beschworene Wesen mit „Die Magie“ (lokal)', () => {
  it('Wesen und Dienste: Basisdienste für alle, erweiterte nur mit passender Meisterschaft', () => {
    const { katalog: KM } = erstelleKatalog(b, [buchpaketLesen(fs.readFileSync(MAGIE, 'utf-8'), b.manifest)]);
    const w = beschwoerbareWesen(KM);
    expect(w.length).toBe(65);
    const aschling = w.find(x => x.name === 'Aschling')!;
    const ohne = diensteFuer(KM, aschling.id, {});
    expect(ohne.length).toBeGreaterThan(0);
    expect(ohne.every(d => d.art !== 'erweitert')).toBe(true);
  });
});
