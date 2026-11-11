/**
 * Begleiter Teil 3: Modifikationen-Texte, erhobene Untote und Golems (Die Magie S. 182–184, 197–207; lokal mit FOKUS_GRIMOIRES).
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
import { validateCharacterImport } from '../../utils/importValidation';
import { Katalog } from '../katalog';
import { basisAusDateien, grimoireDatei } from './hilfen';
import { erstelleKatalog, grimoireLesen } from '../laden';
import { anwenden, iniPlus, leseModifikationen, mehrfachAusText, schadenPlus, werteblock } from '../modifikationen';
import { attributKosten, erhebungen, fertigkeitKosten, freieSchwelle, grenzHeldengrad, untotWerte, ANGRIFF } from '../untote';
import { golemWerte, korpusse } from '../golem';
import type { Begleiter, CharacterState } from '../../types';

const b = basisAusDateien(); const K = new Katalog(b.manifest, [b.basis]);
const kat = { aktuell: K as Katalog };
vi.mock('../RegelwerkContext', () => ({ useRegelwerk: () => ({ katalog: kat.aktuell }) }));

describe('Modifikationen-Texte', () => {
  it('liest feste Werte, Fertigkeiten, Merkmale; Wahlen bleiben Text', () => {
    const m = leseModifikationen(K, 'Der Golem ist groß. Modifikationen: KON +1, STÄ +1; LP +1, VTD +2, SR +2; Angriff +1, INI −1; Athletik +2, Zähigkeit +2; '
      + 'zusätzliches Merkmal: Dämmersicht; Merkmal Pazifist entfällt; ein beliebiges Attribut +1; GK +1 (maximal 7), Schaden +2, WGS +2, zusätzliches Waffenmerkmal Wuchtig');
    expect(m.attribute).toEqual({ KON: 1, 'STÄ': 1 });
    expect(m.abgeleitet).toEqual({ LP: 1, VTD: 2, SR: 2, INI: -1, GK: 1 });
    expect(m.hoechstens).toEqual({ GK: 7 });
    expect([m.angriff, m.schaden, m.wgs]).toEqual([1, 2, 2]);
    expect(m.fertigkeiten).toEqual({ 'grw:fertigkeit:athletik': 2, 'grw:fertigkeit:zaehigkeit': 2 });
    expect(m.merkmaleDazu).toEqual(['Dämmersicht']);
    expect(m.merkmaleWeg).toEqual(['Pazifist']);
    expect(m.waffenmerkmale).toEqual(['Wuchtig']);
    expect(m.rest).toEqual(['ein beliebiges Attribut +1']);
  });
  it('wendet an: Waffen, Initiative, Zerbrechlich → Schwächlich, Obergrenze', () => {
    const w = werteblock(K, {
      attribute: { KON: '2' }, abgeleitete_werte: { GK: '7', LP: '5', SR: '0' }, merkmale: 'Pazifist, Zerbrechlich',
      waffen: [{ name: 'Körper', wert: '4', schaden: '1W10', wgs: '8', ini: '9−1W6', merkmale: '–' }],
    });
    const m = leseModifikationen(K, 'GK +1 (maximal 7), Angriff +2, Schaden +1, INI −2; Merkmal Pazifist entfällt; etwaiges Merkmal Zerbrechlich wird zu Schwächlich oder etwaiges Merkmal Schwächlich entfällt');
    const r = anwenden(K, w, m);
    expect(r.abgeleitet.GK).toBe(7);
    expect(r.waffen[0]).toMatchObject({ wert: 6, schaden: '1W10+1', ini: '7−1W6' });
    expect(r.merkmale).toEqual(['Schwächlich']);
    expect(schadenPlus('2W6+3', -4)).toBe('2W6−1');
    expect(iniPlus('8−1W6', -1)).toBe('7−1W6');
    expect([mehrfachAusText('bis zu zweimal gewählt'), mehrfachAusText('beliebig oft'), mehrfachAusText('Der Golem ...')]).toEqual([2, Infinity, 1]);
  });
});

describe('Untote: Regeln', () => {
  it('Kosten und Grenzen nach Die Magie S. 183', () => {
    expect([1, 6, 7, 9, 10].map(fertigkeitKosten)).toEqual([3, 18, 23, 33, 40]);
    expect([1, 2, 3].map(attributKosten)).toEqual([10, 25, 45]);
    expect([5, 6, 8, 9, 15].map(freieSchwelle)).toEqual([0, 1, 1, 2, 4]);
    expect([1, 2, 3, 4, 5].map(grenzHeldengrad)).toEqual([1, 1, 2, 3, 4]);
  });
  it('nur GRW: Untote erheben mit Wandelnder Leichnam/Skelett (Werte nicht im Paket)', () => {
    const e = erhebungen(K);
    expect(e.map(x => x.zauber.name)).toEqual(['Untote erheben']);
    expect(e[0]).toMatchObject({ grad: 3, epJeVerstaerkung: 15 });
    const u = untotWerte(K, { id: 'untoter:Skelett', art: 'untoter', name: 'Skelett', erhebung: 'grw:zauber:untote-erheben', verstaerkungen: 1,
      steigerung: { fertigkeiten: { [ANGRIFF]: 3 } } }, { nekromant: false, meisterDerAbnormitaeten: false });
    expect(u).toMatchObject({ epGesamt: 15, epVerbraucht: 9, grenze: 9, werte: null });
    expect(u.hinweise.some(h => /GRW S. 279/.test(h))).toBe(true);
  });
});

const MAGIE = grimoireDatei('magie');

describe.skipIf(!MAGIE || !fs.existsSync(MAGIE))('Untote und Golems mit „Die Magie“ (lokal)', () => {
  let KM = K;
  beforeAll(() => { KM = erstelleKatalog(b, [grimoireLesen(fs.readFileSync(MAGIE, 'utf-8'), b.manifest)]).katalog; });

  it('Erhebungszauber, Gruftkatze: Verstand 0, Steigerung wirkt auf abgeleitete Werte, Abnormität', () => {
    expect(erhebungen(KM).map(x => x.zauber.name)).toEqual(['Totentier', 'Untote erheben', 'Grabesbestie', 'Der letzte Ruf']);
    const katze: Begleiter = { id: 'magie:kreatur:gruftkatze', art: 'untoter', name: 'Gruftkatze', erhebung: 'magie:zauber:totentier', verstaerkungen: 2,
      steigerung: { attribute: { KON: 1 }, fertigkeiten: { 'grw:fertigkeit:wahrnehmung': 2 } }, abnormitaet: 'magie:abnormitaet:modernder-panzer' };
    const u = untotWerte(KM, katze, { nekromant: false, meisterDerAbnormitaeten: true });
    // Gruftkatze: KON 1, LP 3, KW 15, VTD 18, SR 0, Wahrnehmung 7
    expect(u.werte!.attribute).toMatchObject({ KON: 2, VER: 0 });
    expect(u.werte!.abgeleitet).toMatchObject({ LP: 4, KW: 16, VTD: 20, SR: 2 }); // +KON; Modernder Panzer VTD +2, SR +2
    expect(u.werte!.fertigkeiten.find(f => f.name === 'Wahrnehmung')?.wert).toBe(7 + 2);
    expect(u.epGesamt).toBe(20);
    expect(u.epVerbraucht).toBe(10 + 6 + 5);
    expect(u.hinweise).toEqual(expect.arrayContaining([expect.stringMatching(/Nekromant/), expect.stringMatching(/21 EP verteilt/)]));
  });

  it('Untote: freie Meisterschaften je erreichter Schwelle, nur mit freiem Platz', () => {
    const katze: Begleiter = { id: 'magie:kreatur:gruftkatze', art: 'untoter', name: 'Gruftkatze', erhebung: 'magie:zauber:totentier', verstaerkungen: 1,
      steigerung: { fertigkeiten: { 'grw:fertigkeit:wahrnehmung': 6 } } };
    const u = untotWerte(KM, katze, { nekromant: true, meisterDerAbnormitaeten: false });
    expect(u.freieMeisterschaften).toEqual([{ fertigkeitId: 'grw:fertigkeit:wahrnehmung', fertigkeit: 'Wahrnehmung', schwelle: 1 }]);
    const s1 = Object.values(KM.eintraege).filter(e => e.typ === 'meisterschaft' && e.daten.fertigkeit === 'grw:fertigkeit:wahrnehmung');
    const eins = s1.find(e => Number(e.daten.schwelle) === 1)!; const zwei = s1.find(e => Number(e.daten.schwelle) === 2)!;
    const mit = untotWerte(KM, { ...katze, meisterschaften: [eins.id] }, { nekromant: true, meisterDerAbnormitaeten: false });
    expect(mit.meisterschaften[0]).toMatchObject({ ok: true, schwelle: 1 });
    expect(mit.werte!.meisterschaften).toContain(eins.name);
    // Schwelle 2 hat keinen Platz (erst ab 9 Punkten), ein zweiter Platz fehlt auch
    const zuviel = untotWerte(KM, { ...katze, meisterschaften: [eins.id, zwei.id] }, { nekromant: true, meisterDerAbnormitaeten: false });
    expect(zuviel.meisterschaften[1].ok).toBe(false);
    expect(zuviel.verstoesse.some(v => v.schluessel === 'meisterschaften')).toBe(true);
  });

  it('Golem: Feinschliff-Wahlen Meisterschaft, Fertigkeit und Punkte mit Grenzen aus dem Text', () => {
    const id = (n: string) => Object.values(KM.eintraege).find(e => e.typ === 'golem_baustein' && e.name === n)!.id;
    const alle = Object.values(KM.eintraege).filter(e => e.typ === 'golem_baustein' && ['Zusätzliche Fähigkeit', 'Rolle'].includes(e.daten.baustein)).map(e => e.id);
    const g = golemWerte(KM, { id: 'magie:golem_baustein:gross', art: 'golem', name: 'Groß', material: 'magie:material:holz', bausteine: alle, golemRessource: true });
    const arten = new Set(g.wahlen.map(w => w.art));
    expect([...arten].sort()).toEqual(['attribut', 'fertigkeit', 'meisterschaft', 'punkte']);
    const punkte = g.wahlen.find(w => w.art === 'punkte')!;
    expect(punkte).toMatchObject({ anzahl: 8, max: 2 });
    // „[Schwelle siehe Schritt 5]“ → Schwelle nach Stufe (Tabelle Schritt 5), „[Schwelle 1]“ → 1
    const ms = g.wahlen.filter(w => w.art === 'meisterschaft').map(w => (w as { schwelle: number }).schwelle);
    expect(ms.every(x => Number.isFinite(x) && x >= 1)).toBe(true);
    expect(ms).toContain(1); expect(ms).toContain(g.meisterschaftSchwelle);
    const f = g.werte!.fertigkeiten.find(x => x.id)!;
    const zuviel = golemWerte(KM, { id: 'magie:golem_baustein:gross', art: 'golem', name: 'Groß', material: 'magie:material:holz', bausteine: alle, golemRessource: true,
      feinschliff: { [punkte.schluessel]: { [f.id!]: 3 } } });
    expect(zuviel.verstoesse.some(v => v.schluessel.startsWith('max:'))).toBe(true);
    const gut = golemWerte(KM, { id: 'magie:golem_baustein:gross', art: 'golem', name: 'Groß', material: 'magie:material:holz', bausteine: alle, golemRessource: true,
      feinschliff: { [punkte.schluessel]: { [f.id!]: 2 } } });
    expect(gut.werte!.fertigkeiten.find(x => x.id === f.id)!.wert).toBe(g.werte!.fertigkeiten.find(x => x.id === f.id)!.wert + 2);
    expect(id('Kämpfer')).toBeTruthy();
  });

  it('Golem: Stufe, Werte aus Korpus + Material + Modulen, Applikationen, Preis, Animierung', () => {
    expect(korpusse(KM).map(e => e.name)).toEqual(['Klein', 'Mittel', 'Groß']);
    const id = (n: string) => Object.values(KM.eintraege).find(e => e.typ === 'golem_baustein' && e.name === n)!.id;
    const golem: Begleiter = {
      id: 'magie:golem_baustein:mittel', art: 'golem', name: 'Mittel', material: 'magie:material:metall',
      bausteine: [id('Gerüstet'), id('Aggressiv'), id('Kämpfer'), id('Kennwort'), id('Speicher'), id('Sprachausgabe'), id('Kämpfe')],
      sonderausstattung: ['SR +2', 'Applikation Gefügig (x2)'],
    };
    const g = golemWerte(KM, golem);
    expect(g.stufe).toBe(2 + 1 + 1 + 1); // Mittel 2, Gerüstet, Aggressiv, Kämpfer
    expect(g.sonderausstattungPlaetze).toBe(2);
    // Mittel: KON 2, STÄ 3, LP 7, VTD 17, SR 1, Körper 6 / 1W10+1; Metall STÄ+1, VTD+1, SR+1, Langsam GSW −3; Gerüstet KON+1 STÄ+1 LP+1 VTD+2 SR+2;
    // Aggressiv Angriff +2; Kämpfer VTD+1, Angriff +2, Schaden +1; Sonderausstattung SR +2
    expect(g.werte!.attribute).toMatchObject({ KON: 3, 'STÄ': 5 });
    expect(g.werte!.abgeleitet).toMatchObject({ LP: 8, VTD: 21, SR: 6, GSW: 3 });
    expect(g.werte!.waffen[0]).toMatchObject({ wert: 10, schaden: '1W10+2' });
    expect(g.werte!.merkmale).toContain('Golem 5');
    expect(g.werte!.merkmale).not.toContain('Pazifist');
    expect(g.applikationenExtra).toBe(1);
    expect(g.hinweise).toEqual(expect.arrayContaining([expect.stringMatching(/fehlen 1 Schwachpunkt/)]));
    expect(g.konstruktion).toEqual({ schwierigkeit: 20 + 10 + 1, fortschritt: 10 + 3 });
    expect(g.preis).toBe(250 + 0 + 10);
    expect(g.animierung?.name).toBe('Animierung III');
    expect(g.meisterschaftSchwelle).toBe(2);
    // Wahlen des Feinschliffs aus den Texten: Kämpfer „BEW oder INT oder KON oder STÄ +1“
    const attr = g.wahlen.find(w => w.art === 'attribut' && w.quelle === 'Kämpfer')!;
    expect(attr).toMatchObject({ optionen: ['BEW', 'INT', 'KON', 'STÄ'], bonus: 1 });
    // gewählt: KON +1 → LP +1 (GK + KON), KW +1 (12 + KON + WIL); Zähigkeit (KON/WIL) +1
    const mitKon = golemWerte(KM, { ...golem, feinschliff: { [attr.schluessel]: 'KON' } });
    expect(mitKon.werte!.attribute.KON).toBe(4);
    expect(mitKon.werte!.abgeleitet.LP).toBe(g.werte!.abgeleitet.LP + 1);
    expect(mitKon.werte!.abgeleitet.KW).toBe(g.werte!.abgeleitet.KW + 1);
    expect(golemWerte(KM, { ...golem, feinschliff: { [attr.schluessel]: 'MYS' } }).werte!.attribute.MYS).toBe(g.werte!.attribute.MYS); // nicht wählbar
    // Kämpfer ohne Aggressiv
    const ohne = golemWerte(KM, { ...golem, bausteine: [id('Kämpfer')] });
    expect(ohne.hinweise).toEqual(expect.arrayContaining(['Kämpfer setzt Aggressiv voraus']));
    // Ressource Golem: eine Applikation je Stufe
    expect(golemWerte(KM, { ...golem, golemRessource: true }).applikationenExtra).toBe(0);
  });

  it('Tab: Golem bauen und Untoten erheben', () => {
    kat.aktuell = KM;
    render(<Rahmen start={{ masteries: { Todesmagie: [{ id: 'm', name: 'Meister der Abnormitäten', tier: 1, cost: 0, isFree: false, isCreationBonus: false, source: 't', skill: 'Todesmagie' }] } }} />);
    const gs = screen.getByTestId('begleiter-golems');
    const sel = within(gs).getByLabelText('Korpus wählen') as HTMLSelectElement;
    fireEvent.change(sel, { target: { value: 'magie:golem_baustein:klein' } });
    fireEvent.click(within(gs).getByRole('button', { name: /Golem hinzufügen/ }));
    fireEvent.click(within(gs).getByRole('button', { name: 'Golem (Klein)' }));
    expect(within(gs).getByText('Golem 1')).toBeTruthy();
    fireEvent.change(within(gs).getByLabelText(/Golemmaterial/), { target: { value: 'magie:material:holz' } });
    const fa = within(gs).getByLabelText('Zusätzliche Fähigkeit wählen') as HTMLSelectElement;
    fireEvent.change(fa, { target: { value: [...fa.options].find(o => o.text.startsWith('Hände'))!.value } });
    fireEvent.click(within(gs).getAllByRole('button', { name: /^Hinzufügen$/ })[0]); // erste Gruppe: Zusätzliche Fähigkeiten
    expect(within(gs).getByText('Golem 2')).toBeTruthy();
    expect(within(gs).getByText(/Animierung II/)).toBeTruthy();

    const us = screen.getByTestId('begleiter-untote');
    fireEvent.change(within(us).getByLabelText('Erhebungszauber wählen'), { target: { value: 'magie:zauber:totentier' } });
    fireEvent.change(within(us).getByLabelText('Wertesatz wählen'), { target: { value: 'Gruftkatze' } });
    fireEvent.click(within(us).getByRole('button', { name: /Untoten hinzufügen/ }));
    fireEvent.click(within(us).getByRole('button', { name: 'Gruftkatze' }));
    fireEvent.change(within(us).getByLabelText('Anzahl Verstärkungen'), { target: { value: '1' } });
    fireEvent.click(within(us).getByLabelText('KON steigern'));
    expect(within(us).getByText('EP 10/10')).toBeTruthy();
    // 15 EP bei 10 verfügbaren: ohne Hausregeln gesperrt, mit Hausregeln nur eine Warnung
    fireEvent.change(within(us).getByLabelText('Abnormität'), { target: { value: 'magie:abnormitaet:mordlust' } });
    expect(within(us).getByText('EP 10/10')).toBeTruthy();
    setzeHausregeln(true);
    fireEvent.change(within(us).getByLabelText('Abnormität'), { target: { value: 'magie:abnormitaet:mordlust' } });
    expect(within(us).getByText('EP 15/10')).toBeTruthy();
    setzeHausregeln(false);
  });
});

const Rahmen: React.FC<{ start: Partial<CharacterState> }> = ({ start }) => {
  const [state, dispatch] = React.useReducer(baseCharacterReducer, { ...DEFAULT_STATE, ...start });
  return <CharacterContext.Provider value={{ state, dispatch, calc: { heldengrad: { maxSkill: 6 } } as never }}><BegleiterView /></CharacterContext.Provider>;
};

describe('Import: Golem- und Untoten-Felder', () => {
  it('übernimmt gültige Felder', () => {
    const r = validateCharacterImport({ ...DEFAULT_STATE, begleiter: [
      { id: 'g', art: 'golem', name: 'Mittel', material: 'm', bausteine: ['a', 1], sonderausstattung: ['SR +2'], golemRessource: true },
      { id: 'u', art: 'untoter', name: 'Skelett', erhebung: 'z', verstaerkungen: 2.7, abnormitaet: 'a', steigerung: { attribute: { KON: 1, X: 'y' }, fertigkeiten: { f: 3 } } },
    ] });
    expect(r.begleiter?.[0]).toMatchObject({ art: 'golem', material: 'm', bausteine: ['a'], sonderausstattung: ['SR +2'], golemRessource: true });
    expect(r.begleiter?.[1]).toMatchObject({ art: 'untoter', erhebung: 'z', verstaerkungen: 2, abnormitaet: 'a', steigerung: { attribute: { KON: 1 }, fertigkeiten: { f: 3 } } });
  });
});
