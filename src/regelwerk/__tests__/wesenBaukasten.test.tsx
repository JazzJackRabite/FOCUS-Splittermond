/**
 * Wesen-Baukasten: beschwörbare Wesen (Die Magie) und Kreaturen (Bestienmeister). Lokal mit FOKUS_BUECHER.
 */
import React from 'react';
import fs from 'fs';
import path from 'path';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { baseCharacterReducer, DEFAULT_STATE } from '../../hooks/useCharacterState';
import { CharacterContext } from '../../context/CharacterContext';
import { BegleiterView } from '../../features/begleiter/BegleiterView';
import { Katalog } from '../katalog';
import { basisAusDateien } from './hilfen';
import { erstelleKatalog, buchpaketLesen } from '../laden';
import { setzeAktivenKatalog } from '../bruecke';
import { basen, baukastenArt, wesenBaukastenWerte } from '../wesenBaukasten';
import { beschwoerbareWesen } from '../begleiter';
import { validateCharacterImport } from '../../utils/importValidation';
import type { Begleiter, CharacterState } from '../../types';

const b = basisAusDateien();
const kat = { aktuell: new Katalog(b.manifest, [b.basis]) as Katalog };
vi.mock('../RegelwerkContext', () => ({ useRegelwerk: () => ({ katalog: kat.aktuell }) }));

describe('Wesen-Baukasten ohne Buchpakete', () => {
  it('keine Basen, Import übernimmt Dienste', () => {
    expect(basen(kat.aktuell, 'beschwoerbar')).toEqual([]);
    const r = validateCharacterImport({ ...DEFAULT_STATE, begleiter: [{ id: 'x', art: 'wesen', name: 'W', bausteine: ['a'], dienste: ['d', 1], basisdienst: 'd' }] });
    expect(r.begleiter?.[0]).toMatchObject({ bausteine: ['a'], dienste: ['d'], basisdienst: 'd' });
  });
});

const BUECHER = process.env.FOKUS_BUECHER ?? '';
const datei = (n: string) => (BUECHER ? path.join(BUECHER, `${n}.srp.json`) : '');

describe.skipIf(!BUECHER || !fs.existsSync(datei('magie')) || !fs.existsSync(datei('bestien')))('Wesen-Baukasten mit „Die Magie“ und „Bestienmeister“ (lokal)', () => {
  let K: Katalog;
  const id = (paket: string, name: string, typ = 'wesen_baukasten_modul') => Object.values(K.eintraege).find(e => e.typ === typ && e.name === name && e.quelle.paket === paket)!.id;
  beforeAll(() => {
    K = erstelleKatalog(b, ['magie', 'bestien'].map(n => buchpaketLesen(fs.readFileSync(datei(n), 'utf-8'), b.manifest))).katalog;
    kat.aktuell = K; setzeAktivenKatalog(K, false);
  });

  it('Basen beider Bücher; Korpusse sind keine fertigen beschwörbaren Wesen', () => {
    expect(basen(K, 'beschwoerbar').map(e => e.name)).toEqual(['Groß', 'Klein', 'Mittel']);
    expect(basen(K, 'kreatur').map(e => e.name)).toEqual(['Agil', 'Robust', 'Schnell', 'Stark']);
    expect(beschwoerbareWesen(K).some(w => K.get(w.id)?.typ === 'wesen_baukasten_basis')).toBe(false);
  });

  it('beschwörbares Wesen: Stufe aus stufe_bonus, Werte aus Modifikationen, Dienste, Feinschliff nach Stufe', () => {
    const mittel = id('magie', 'Mittel', 'wesen_baukasten_basis');
    expect(baukastenArt(K.get(mittel))).toBe('beschwoerbar');
    const wesen: Begleiter = { id: mittel, art: 'wesen', name: 'W', bausteine: [id('magie', 'Bedrohlich'), id('magie', 'Kämpfer', 'wesen_baukasten_rolle')] };
    const w = wesenBaukastenWerte(K, wesen);
    expect(w.stufe).toBe(1 + 1 + 1);
    // Mittel: Stufe 1, AUS 2, VTD 15, KW 15, GW 14, Körper 3; Bedrohlich AUS +1, VTD +1, KW +1, GW +2, Angriff +2; Kämpfer VTD +1, KW +1, GW +1, Angriff +1
    expect(w.werte!.attribute.AUS).toBe(3);
    expect(w.werte!.abgeleitet).toMatchObject({ VTD: 17, KW: 17, GW: 17 });
    expect(w.werte!.waffen[0].wert).toBe(6);
    expect(w.werte!.merkmale).toContain('Beschwörbares Wesen 3');
    expect(w.dienste.map(d => d.name)).toEqual(expect.arrayContaining(['Kämpfe', 'Wache', 'Beschütze']));
    expect(w.schritt5).toMatchObject({ schwelle: 1, grad: 1 });
    expect(w.wahlen.some(x => x.art === 'attribut')).toBe(true);
    expect(w.hinweise).toEqual([]);
    // gewählte Attributwahl wirkt
    const wahl = w.wahlen.find(x => x.art === 'attribut')!;
    expect(wesenBaukastenWerte(K, { ...wesen, feinschliff: { [wahl.schluessel]: 'STÄ' } }).werte!.attribute['STÄ']).toBe(w.werte!.attribute['STÄ'] + 1);
    // Mehrfachwahl über die Grenze
    expect(wesenBaukastenWerte(K, { ...wesen, bausteine: [...wesen.bausteine!, id('magie', 'Bedrohlich')] }).hinweise.map(h => h.schluessel))
      .toEqual([`mehrfach:${id('magie', 'Bedrohlich')}`]);
    // Rollen beliebig oft
    expect(wesenBaukastenWerte(K, { ...wesen, bausteine: [...wesen.bausteine!, id('magie', 'Kämpfer', 'wesen_baukasten_rolle')] }).hinweise).toEqual([]);
  });

  it('Kreatur: Punkte aus kosten_punkte, Voraussetzungen mit Träger „wesen“, Kosten ohne Zahl', () => {
    const robust = id('bestien', 'Robust', 'wesen_baukasten_basis');
    const k1: Begleiter = { id: robust, art: 'tier', name: 'K', bausteine: [id('bestien', 'Angriffslustig'), id('bestien', 'Klein')] };
    const w = wesenBaukastenWerte(K, k1);
    expect(w.stufe).toBe(2 + 1 - 1);
    expect(w.werte!.merkmale).toContain('Kreatur 2');
    expect(w.hinweise).toEqual([]);
    const mitGross = wesenBaukastenWerte(K, { ...k1, bausteine: [...k1.bausteine!, id('bestien', 'Groß')] });
    expect(mitGross.hinweise.map(h => h.schluessel).sort()).toEqual([`voraussetzung:${id('bestien', 'Groß')}`, `voraussetzung:${id('bestien', 'Klein')}`].sort());
    const speziell = wesenBaukastenWerte(K, { ...k1, bausteine: [id('bestien', 'Reittier')] });
    expect(speziell.ohneZahl.map(e => e.name)).toEqual(['Reittier']);
    // Initiative und entfallendes Waffenmerkmal (Angriffslustig: INI −1, Stumpf entfällt oder …)
    expect(w.werte!.waffen[0].ini).toBe('7-1W6');
  });

  it('Tab: Wesen bauen, Modul hinzufügen, zweites gleiches Modul gesperrt', () => {
    render(<Rahmen />);
    const sek = screen.getByTestId('begleiter-wesen');
    fireEvent.change(within(sek).getByLabelText('Eigenes Wesen bauen: Korpus'), { target: { value: id('magie', 'Mittel', 'wesen_baukasten_basis') } });
    fireEvent.click(within(sek).getByRole('button', { name: /Wesen bauen/ }));
    fireEvent.click(within(sek).getByRole('button', { name: 'Eigenes Wesen (Mittel)' }));
    const auswahl = within(sek).getByLabelText('Schritt 3: Zusätzliche Fähigkeiten: Baustein wählen') as HTMLSelectElement;
    const hinzu = () => {
      fireEvent.change(auswahl, { target: { value: id('magie', 'Bedrohlich') } });
      fireEvent.click(within(auswahl.closest('div')!.parentElement!.parentElement!).getByRole('button', { name: /Hinzufügen/ }));
    };
    hinzu();
    expect(within(sek).getByText('Stufe 2')).toBeTruthy();
    hinzu(); // höchstens einmal: gesperrt (ohne Hausregeln)
    expect(within(sek).getByText('Stufe 2')).toBeTruthy();
    expect(within(sek).getAllByRole('button', { name: /Bedrohlich entfernen/ })).toHaveLength(1);
  });
});

const Rahmen: React.FC = () => {
  const [state, dispatch] = React.useReducer(baseCharacterReducer, { ...DEFAULT_STATE } as CharacterState);
  return <CharacterContext.Provider value={{ state, dispatch, calc: { heldengrad: { maxSkill: 6 } } as never }}><BegleiterView /></CharacterContext.Provider>;
};
