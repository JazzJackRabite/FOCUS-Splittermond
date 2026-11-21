/**
 * Begleiter: Tiergefährten aus dem GRW (Ressource Kreatur, S. 78; Tierwerte S. 284–287), Tab „Begleiter“,
 * Abrichtungen und Potenzial (Bestienmeister S. 15–23, lokal mit FOKUS_GRIMOIRES).
 */
import { setzeHausregeln } from '../../fundament/hausregeln';
import React from 'react';
import fs from 'fs';
import path from 'path';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { baseCharacterReducer, DEFAULT_STATE } from '../../hooks/useCharacterState';
import { CharacterContext } from '../../context/CharacterContext';
import { BegleiterView } from '../../features/begleiter/BegleiterView';
import { kreaturZuordnung } from '../../components/begleiter/besitzer';
import { validateCharacterImport } from '../../utils/importValidation';
import { Katalog } from '../katalog';
import { abschliessen, basisAusDateien, begleiterErstellen, blattWaehlen, grimoireDatei, weiter } from './hilfen';
import { erstelleKatalog, grimoireLesen } from '../laden';
import { bedingungsCharakter } from '../bruecke';
import {
  abrichtungen, alleTiere, beschwoerbareWesen, diensteFuer, istReittier, kreaturStufe, mehrfachGrenze, potenzial, pruefeAbrichtung,
  tierQualitaeten, tierTraeger, tiergefaehrten, wertekasten,
} from '../begleiter';
import type { Begleiter, CharacterState } from '../../types';

const b = basisAusDateien(); const K = new Katalog(b.manifest, [b.basis]);
const kat = { aktuell: K as Katalog };
vi.mock('../RegelwerkContext', () => ({ useRegelwerk: () => ({ katalog: kat.aktuell }) }));

describe('Tiergefährten aus dem GRW', () => {
  const tiere = tiergefaehrten(K);
  it('liefert Tiere mit Werten und Stufe', () => {
    expect(tiere.map(t => t.name)).toEqual(expect.arrayContaining(['Taube', 'Pferd', 'Wolf', 'Riesenschlange']));
    for (const t of tiere) { expect(wertekasten(t.eintrag)?.abgeleitete_werte).toBeTruthy(); expect(kreaturStufe(t.eintrag)).toBe(t.stufe); }
    expect([...tiere].map(t => t.stufe)).toEqual([...tiere].map(t => t.stufe).sort((a, c) => a - c));
  });
  it('alle Tiere: auch ohne Merkmal Kreatur (z. B. Bär), Pferd ist Reittier', () => {
    const alle = alleTiere(K);
    expect(alle.find(t => t.name === 'Bär')?.stufe).toBe(0);
    const pferd = alle.find(t => t.name === 'Pferd')!;
    expect(pferd.typus).toContain('Reittier');
    expect(istReittier(K, { id: pferd.id, art: 'tier', name: 'Pferd' })).toBe(true);
  });
  it('ohne Magie-Paket keine beschwörbaren Wesen, ohne Bestienmeister keine Abrichtungen', () => {
    expect(beschwoerbareWesen(K)).toEqual([]);
    expect(abrichtungen(K)).toEqual([]);
  });
});

describe('Regeln ohne Buch', () => {
  it('Mehrfachwahl', () => {
    expect(mehrfachGrenze(null, 2)).toBe(1);
    expect(mehrfachGrenze('beliebig oft', 2)).toBe(Infinity);
    expect(mehrfachGrenze('maximal viermal', 2)).toBe(4);
    expect(mehrfachGrenze('maximal dreimal', 2)).toBe(3);
    expect(mehrfachGrenze('einmal pro HG des Besitzers', 3)).toBe(3);
  });
  it('Zuordnung der Ressourcen Kreatur', () => {
    expect(kreaturZuordnung([3, 2], [2, 3])).toBe(true);
    expect(kreaturZuordnung([3], [3, 1])).toBe(false);
    expect(kreaturZuordnung([2], [3])).toBe(false);
    expect(kreaturZuordnung([], [0, 0])).toBe(true);
  });
  it('Potenzial nur mit Grimoire (Bestienmeister S. 15)', () => {
    // Potenzial ist eine Regel aus dem Bestienmeister: ohne Grimoire keine Werte im Code
    expect(potenzial(K, { id: 'x', art: 'tier', name: 'x', kreatur: 3, vertrauter: true }, []).posten).toEqual([]);
  });
});

describe('Begleiter-Zustand', () => {
  it('Reducer: hinzufügen, ändern, entfernen', () => {
    let s = baseCharacterReducer(DEFAULT_STATE, { type: 'BEGLEITER_HINZU', payload: { id: 'x', art: 'tier', name: 'Wolf' } });
    s = baseCharacterReducer(s, { type: 'BEGLEITER_HINZU', payload: { id: 'y', art: 'tier', name: 'Pferd' } });
    s = baseCharacterReducer(s, { type: 'BEGLEITER_AENDERN', payload: { index: 1, aenderung: { rufname: 'Blitz', abrichtungen: ['a', 'a'] } } });
    expect(s.begleiter?.[1]).toMatchObject({ id: 'y', rufname: 'Blitz', abrichtungen: ['a', 'a'] });
    s = baseCharacterReducer(s, { type: 'BEGLEITER_ENTFERNEN', payload: { index: 0 } });
    expect(s.begleiter?.map(x => x.name)).toEqual(['Pferd']);
  });
  it('Import übernimmt die neuen Felder und den Tab', () => {
    const r = validateCharacterImport({
      ...DEFAULT_STATE, mode: 'begleiter',
      begleiter: [{ id: 'grw:kreatur:pferd', art: 'tier', name: 'Pferd', rufname: 'Blitz', kreatur: 3, qualitaet: 2, vertrauter: true, abrichtungen: ['a', 7] }],
    });
    expect(r.mode).toBe('begleiter');
    expect(r.begleiter?.[0]).toEqual({ id: 'grw:kreatur:pferd', art: 'tier', name: 'Pferd', rufname: 'Blitz', kreatur: 3, qualitaet: 2, vertrauter: true, abrichtungen: ['a'] });
  });
});

const Rahmen: React.FC<{ start: Partial<CharacterState> }> = ({ start }) => {
  const [state, dispatch] = React.useReducer(baseCharacterReducer, { ...DEFAULT_STATE, ...start });
  return <CharacterContext.Provider value={{ state, dispatch, calc: {} as never }}><BegleiterView /></CharacterContext.Provider>;
};

describe('Tab „Begleiter“ (nur GRW)', () => {
  it('Tier erstellen im Assistenten: freie Ressource Kreatur wird zugeordnet, Blatt mit Werten', () => {
    kat.aktuell = K;
    render(<Rahmen start={{ resourcesList: [{ name: 'Kreatur', level: 3, source: 'test' }] }} />);
    expect(screen.getByText(/Noch keine Begleiter/)).toBeTruthy();
    const d = begleiterErstellen('Tier');
    const sel = within(d).getByLabelText('Tier wählen') as HTMLSelectElement;
    const opt = (n: string) => [...sel.options].find(o => o.text.startsWith(`${n} (`))!;
    expect(opt('Wolf').disabled).toBe(false); // auch zu hohe Tiere wählbar (dann ohne Ressource)
    expect((screen.getByRole('button', { name: /^Weiter/ }) as HTMLButtonElement).disabled).toBe(true); // erst ein Tier wählen
    fireEvent.change(sel, { target: { value: opt('Pferd').value } });
    weiter();
    expect(within(d).getByText(/Grimoire „Bestienmeister“/)).toBeTruthy();
    expect((within(d).getByLabelText('Ressource Kreatur') as HTMLSelectElement).value).toBe('3');
    fireEvent.change(within(d).getByPlaceholderText('Pferd'), { target: { value: 'Blitz' } });
    weiter();
    expect(within(screen.getByTestId('assistent-uebersicht')).getByText('GSW')).toBeTruthy();
    abschliessen();
    expect(screen.queryByTestId('begleiter-assistent')).toBeNull();
    const blatt = screen.getByTestId('begleiter-blatt');
    expect(within(blatt).getByRole('heading', { name: 'Blitz (Pferd)' })).toBeTruthy();
    expect(within(blatt).getByText('Kreatur 3')).toBeTruthy();
    expect(within(blatt).getByText('Reittier')).toBeTruthy();
    expect(within(blatt).getAllByTestId('begleiter-waffe').length).toBeGreaterThan(0);

    // zweites Tier: keine freie Ressource mehr → ohne Ressource; das neue Blatt ist gewählt
    begleiterErstellen('Tier');
    fireEvent.change(screen.getByLabelText('Tier wählen'), { target: { value: opt('Wolf').value } });
    abschliessen();
    expect(within(screen.getByTestId('begleiter-blatt')).getByText('ohne Ressource')).toBeTruthy();
    fireEvent.click(screen.getByLabelText('Wolf entfernen'));
    fireEvent.click(screen.getByRole('button', { name: 'OK' }));
    expect(screen.queryByRole('tab', { name: /^Wolf/ })).toBeNull();
    expect(within(blattWaehlen(/^Blitz \(Pferd\)/)).getByText('Kreatur 3')).toBeTruthy();
    expect(screen.getByRole('tab', { name: /^Blitz \(Pferd\)\s*LP \d+\/\d+/ })).toBeTruthy(); // Kurzstand in der Leiste
  });
  it('Hinweis auf „Die Magie“ bei den Wesen', () => {
    kat.aktuell = K;
    render(<Rahmen start={{}} />);
    fireEvent.click(screen.getByRole('button', { name: /^Begleiter erstellen$/ }));
    const karte = within(screen.getByTestId('begleiter-assistent')).getByRole('button', { name: /^Beschworenes Wesen/ }) as HTMLButtonElement;
    expect(karte.disabled).toBe(true);
    expect(within(karte).getByText(/Grimoire „Die Magie“/)).toBeTruthy();
  });
});


const MAGIE = grimoireDatei('magie');
const BESTIEN = grimoireDatei('bestien');

describe.skipIf(!MAGIE || !fs.existsSync(MAGIE))('Beschworene Wesen mit „Die Magie“ (lokal)', () => {
  it('Wesen und Dienste: Basisdienste für alle, erweiterte nur mit passender Meisterschaft', () => {
    const { katalog: KM } = erstelleKatalog(b, [grimoireLesen(fs.readFileSync(MAGIE, 'utf-8'), b.manifest)]);
    const w = beschwoerbareWesen(KM);
    expect(w.length).toBe(62); // ohne die drei Korpusse des Wesen-Baukastens (Klein, Mittel, Groß)
    const aschling = w.find(x => x.name === 'Aschling')!;
    const ohne = diensteFuer(KM, aschling.id, {});
    expect(ohne.length).toBeGreaterThan(0);
    expect(ohne.every(d => d.art !== 'erweitert')).toBe(true);
  });
});

describe.skipIf(!BESTIEN || !fs.existsSync(BESTIEN))('Abrichtungen mit „Bestienmeister“ (lokal)', () => {
  let KB = K; let liste: ReturnType<typeof abrichtungen> = [];
  beforeAll(() => {
    KB = erstelleKatalog(b, [grimoireLesen(fs.readFileSync(BESTIEN, 'utf-8'), b.manifest)]).katalog;
    liste = abrichtungen(KB);
  });
  const A = (n: string) => liste.find(a => a.name === n)!;
  const pferd: Begleiter = { id: 'grw:kreatur:pferd', art: 'tier', name: 'Pferd', kreatur: 3 };
  const wolf: Begleiter = { id: 'grw:kreatur:wolf', art: 'tier', name: 'Wolf', kreatur: 4 };
  const fuehrer = (...ms: string[]) => bedingungsCharakter(KB, {
    meisterschaften: ms.map(name => ({ id: name, name, tier: 1, cost: 0, isFree: false, isCreationBonus: false, source: 'test', skill: 'Tierführung' })), fertigkeiten: { Tierführung: 9 },
  });

  it('63 Abrichtungen ohne die Sammel-Abrichtung „Grundausbildung“; Grundausbildungen kosten 1 und brauchen Dompteur', () => {
    expect(liste.length).toBe(63);
    expect(liste.some(a => a.name === 'Grundausbildung')).toBe(false);
    const r1 = A('Reittier I');
    expect(r1.grundausbildung).toBe(true);
    expect(r1.kosten).toBe(1);
    expect(r1.voraussetzung?.text).toMatch(/Dompteur.*Typus Reittier/);
    expect(A('Kleiner Trick').kosten).toBe(0);
    expect(A('Kämpfer').hoechstens).toBe(4);
  });
  it('Reittier I: Dompteur beim Führer und Typus Reittier beim Tier', () => {
    expect(pruefeAbrichtung(KB, A('Reittier I'), fuehrer(), tierTraeger(KB, pferd))).toBe(false);
    expect(pruefeAbrichtung(KB, A('Reittier I'), fuehrer('Dompteur'), tierTraeger(KB, pferd))).toBe(true);
    expect(pruefeAbrichtung(KB, A('Reittier I'), fuehrer('Dompteur'), tierTraeger(KB, wolf))).toBe(false);
  });
  it('Schlachtross braucht Reittier I beim Tier', () => {
    const mit = { ...pferd, abrichtungen: [A('Reittier I').id] };
    expect(pruefeAbrichtung(KB, A('Schlachtross'), fuehrer('Dompteur'), tierTraeger(KB, pferd))).toBe(false);
    expect(pruefeAbrichtung(KB, A('Schlachtross'), fuehrer('Dompteur'), tierTraeger(KB, mit))).toBe(true);
    expect(istReittier(KB, { ...wolf, abrichtungen: [A('Reittier I').id] })).toBe(true);
  });
  it('Kämpfer gestaffelt: zweite Wahl braucht Kampfabrichter II', () => {
    const tier = tierTraeger(KB, { ...wolf, abrichtungen: [A('Kampfgefährte').id] });
    expect(pruefeAbrichtung(KB, A('Kämpfer'), fuehrer('Kampfabrichter I'), tier, 0)).toBe(true);
    expect(pruefeAbrichtung(KB, A('Kämpfer'), fuehrer('Kampfabrichter I'), tier, 1)).toBe(false);
    expect(pruefeAbrichtung(KB, A('Kämpfer'), fuehrer('Kampfabrichter I', 'Kampfabrichter II'), tier, 1)).toBe(true);
  });
  it('Potenzial mit Tierspezialist, Meister der Bestien und Meisterbändiger', () => {
    const ids = ['Tierspezialist', 'Tierspezialist', 'Meister der Bestien', 'Meisterbändiger']
      .map(n => Object.values(KB.eintraege).find(e => e.typ === 'meisterschaft' && e.name === n)!.id);
    expect(potenzial(KB, pferd, ids).gesamt).toBe(1 + 6 + 2 + 2 + 1);
    expect(potenzial(KB, { ...pferd, kreatur: undefined }, ids).gesamt).toBe(1 + 2 + 2);
    expect(potenzial(KB, { id: 'x', art: 'tier', name: 'x' }, []).gesamt).toBe(1);
    expect(potenzial(KB, { id: 'x', art: 'tier', name: 'x', kreatur: 3, vertrauter: true }, []).gesamt).toBe(1 + 6 + 3);
    expect(potenzial(KB, { id: 'x', art: 'tier', name: 'x', qualitaet: 4 }, []).gesamt).toBe(4);
    expect(tierQualitaeten(KB).map(q => q.potenzial)).toEqual([1, 2, 4, 5, 6]);
    expect(tierQualitaeten(K)).toEqual([]);
  });
  it('Tab: Abrichtung hinzufügen, Potenzial und Status', () => {
    kat.aktuell = KB;
    render(<Rahmen start={{
      resourcesList: [{ name: 'Kreatur', level: 3, source: 'test' }],
      begleiter: [pferd],
      masteries: { 'Tierführung': [{ id: 'm1', name: 'Dompteur', tier: 1, cost: 0, isFree: false, isCreationBonus: false, source: 'test', skill: 'Tierführung' }] },
    }} />);
    fireEvent.click(screen.getByRole('button', { name: /^Bearbeiten$/ }));
    weiter(); // Grundangaben → Abrichtungen
    const d = screen.getByTestId('begleiter-assistent');
    const sel = screen.getByLabelText('Abrichtung wählen') as HTMLSelectElement;
    const r1 = [...sel.options].find(o => o.text.includes('Reittier I ('))!;
    expect(r1.text).not.toMatch(/Voraussetzung fehlt|Spielleitung/); // erfüllt: kein Zusatz (keine Symbole, FUNDAMENT)
    fireEvent.change(sel, { target: { value: r1.value } });
    fireEvent.click(screen.getByRole('button', { name: /Abrichtung hinzufügen/ }));
    expect(within(d).getByText('Potenzial 1/7')).toBeTruthy();
    expect([...sel.options].find(o => o.value === r1.value)!.disabled).toBe(true);
    expect(within(d).getByText('erfüllt')).toBeTruthy();
    fireEvent.click(screen.getByLabelText('Abrichtung Reittier I entfernen'));
    expect(within(d).getByText('Potenzial 0/7')).toBeTruthy();
    fireEvent.change(sel, { target: { value: r1.value } });
    fireEvent.click(screen.getByRole('button', { name: /Abrichtung hinzufügen/ }));
    abschliessen();
    const blatt = screen.getByTestId('begleiter-blatt');
    expect(within(blatt).getByText('Potenzial 1/7')).toBeTruthy();
    expect(within(blatt).getByRole('button', { name: 'Reittier I' })).toBeTruthy();
    kat.aktuell = K;
  });
  it('Tab: Vertrauter erstellen, Abrichtung mit Wahl (Gefestigt) wirkt auf das Blatt', () => {
    kat.aktuell = KB;
    const { unmount } = render(<Rahmen start={{}} />);
    fireEvent.click(screen.getByRole('button', { name: /^Begleiter erstellen$/ }));
    expect((within(screen.getByTestId('begleiter-assistent')).getByRole('button', { name: /^Vertrauter/ }) as HTMLButtonElement).disabled).toBe(true);
    unmount();
    render(<Rahmen start={{ strengthsList: [{ name: 'Tiervertrauter', source: 'test' }] as never }} />);
    const d = begleiterErstellen('Vertrauter');
    expect(screen.getByText('Vertrauter erstellen')).toBeTruthy();
    const sel = within(d).getByLabelText('Tier wählen') as HTMLSelectElement;
    fireEvent.change(sel, { target: { value: [...sel.options].find(o => o.text.startsWith('Wolf ('))!.value } });
    weiter();
    expect((within(d).getByLabelText(/^Vertrauter/) as HTMLInputElement).checked).toBe(true);
    weiter(); // → Abrichtungen
    const ab = within(d).getByLabelText('Abrichtung wählen') as HTMLSelectElement;
    fireEvent.change(ab, { target: { value: [...ab.options].find(o => o.text.startsWith('Gefestigt ('))!.value } });
    setzeHausregeln(true); // Voraussetzungen des Führers hier nicht erfüllt
    fireEvent.click(within(d).getByRole('button', { name: /Abrichtung hinzufügen/ }));
    setzeHausregeln(false);
    fireEvent.change(within(d).getByLabelText('Gefestigt: Merkmal'), { target: { value: '2' } }); // Feigling entfällt
    abschliessen();
    const blatt = screen.getByTestId('begleiter-blatt');
    expect(within(blatt).getAllByText('Vertrauter').length).toBeGreaterThan(0);
    expect(within(blatt).getByText('Vertrautenmagie')).toBeTruthy();
    expect(within(blatt).getByText(/Noch nichts gelernt/)).toBeTruthy();
    const merkmale = within(blatt).getByText('Merkmale').parentElement!.textContent!;
    expect(merkmale).not.toMatch(/Feigling/);
    expect(within(blatt).getByText(/Boni der Abrichtungen sind in Werten/)).toBeTruthy();
    kat.aktuell = K;
  });
});
