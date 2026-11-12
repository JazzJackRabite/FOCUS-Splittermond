/** Kosten in Erfahrungspunkten und Heldengrade kommen aus den Kernregeln des Grundregelwerk-Pakets. */
import { afterEach, describe, expect, it } from 'vitest';
import { Katalog } from '../katalog';
import { setzeAktivenKatalog } from '../bruecke';
import { basisAusDateien } from './hilfen';
import { heldengrade, kostenAttribut, kostenFertigkeitspunkt, kostenMeisterschaft, kostenRessourcenpunkt, kostenSprache, kostenStaerke, kostenZauber, mindestpunkteZauber } from '../steigerungsregeln';
import { calculateItemCost, getAttrXpCost, getSkillXpCost } from '../../utils/costCalculations';
import { HELDENGRADE } from '../../data/rules';

const basis = basisAusDateien();
const K = new Katalog(basis.manifest, [basis.basis]);
afterEach(() => setzeAktivenKatalog(null, false));

describe('Steigerungsregeln aus dem Paket', () => {
  it('ohne Paket liefern die Funktionen null; der eingebaute Rückfall rechnet weiter', () => {
    expect(kostenFertigkeitspunkt(7)).toBeNull();
    expect(heldengrade()).toBeNull();
    expect(getSkillXpCost(7)).toBe(5);
  });

  it('Kosten nach GRW S. 87: Fertigkeitspunkte, Attribute, Stärken, Ressourcen, Sprachen, Zauber, Meisterschaften', () => {
    expect([1, 6, 7, 9, 10, 12, 13, 15].map((w) => kostenFertigkeitspunkt(w, K))).toEqual([3, 3, 5, 5, 7, 7, 9, 9]);
    expect([1, 2, 3, 4].map((n) => kostenAttribut(n, K))).toEqual([10, 15, 20, 25]);
    expect([kostenStaerke(1, K), kostenStaerke(2, K), kostenRessourcenpunkt(K), kostenSprache(K)]).toEqual([7, 14, 7, 5]);
    expect([0, 1, 2, 3, 4, 5].map((g) => kostenZauber(g, K))).toEqual([1, 3, 6, 9, 12, 15]);
    expect([0, 1, 2, 3, 4, 5].map((g) => mindestpunkteZauber(g, K))).toEqual([1, 3, 6, 9, 12, 15]);
    expect([1, 2, 3, 4].map((s) => kostenMeisterschaft(s, K))).toEqual([5, 10, 15, 20]);
  });

  it('Heldengrade nach GRW S. 88; der eingebaute Rückfall stimmt mit dem Paket überein', () => {
    expect(heldengrade(K)).toEqual(HELDENGRADE);
  });

  it('die Kostenfunktionen des Editors fragen das Paket', () => {
    const veraendert = JSON.parse(JSON.stringify(basis.basis));
    const alle: { id: string; daten: { strukturiert: { steigerungskosten: { sprache: number; attribut: { kosten_ep: number }[] } } } }[] =
      veraendert.paket.eintraege;
    const eintrag = alle.find((e) => e.id === 'grw:regel:steigerung-regeln:erfahrungspunkte-einsetzen')!;
    eintrag.daten.strukturiert.steigerungskosten.sprache = 6;
    eintrag.daten.strukturiert.steigerungskosten.attribut[0].kosten_ep = 11;
    setzeAktivenKatalog(new Katalog(basis.manifest, [veraendert]), false);
    expect(calculateItemCost('language', 1)).toBe(6);
    expect(getAttrXpCost(0)).toBe(11);
    expect(getSkillXpCost(13)).toBe(9);
  });
});
