/**
 * Die Listen des Grundregelwerks kommen aus dem GRW-Paket (regelwerk/grwListen.ts). Der eingebaute Rückfall in
 * src/data (nur ohne geladenes Paket) muss mit dem Paket übereinstimmen.
 */
import { describe, expect, it } from 'vitest';
import { Katalog } from '../katalog';
import { basisAusDateien } from './hilfen';
import {
  grwAllgemeineKampfmeisterschaften, grwAllgemeineMagiemeisterschaften, grwFertigkeiten, grwFertigkeitsattribute, grwMeisterschaften,
  grwMondzeichen, grwRessourcen, grwSchwaechen, grwSprachen, grwStaerken, grwZauber, schwellenwert, staerkeHoechstens,
  grwRassen, staerkenBudget, grwAttribute, grwAlleFertigkeiten, grwGesundheitsstufen,
} from '../grwListen';

const basis = basisAusDateien();
const K = new Katalog(basis.manifest, [basis.basis]);
// IDs kommen aus dem Paket; die alten Bedingungsbäume (prerequisite) braucht der Editor nicht mehr – Voraussetzungen prüft der Katalog formal
const ohneId = <T extends object>(l: T[]) => l.map((x) => { const { id: _i, regelId: _r, prerequisite: _p, prerequisiteStatus: _s, ...rest } = x as Record<string, unknown>; return rest; });
const nachName = <T extends { name: string }>(l: T[]) => [...l].sort((a, b) => a.name.localeCompare(b.name, 'de') || JSON.stringify(a).localeCompare(JSON.stringify(b)));

describe('GRW-Listen aus dem Paket, Rückfall gleich', () => {
  it('Zauber: 278 Zauber in 419 Schulen, gleich mit dem Rückfall', () => {
    const p = grwZauber(K);
    expect(new Set(p.map((s) => s.name)).size).toBe(278);
    expect(p).toHaveLength(419);
    expect(nachName(p)).toEqual(nachName(grwZauber(null)));
  });

  it('Meisterschaften je Fertigkeit und allgemeine Meisterschaften gleich mit dem Rückfall (IDs aus dem Paket)', () => {
    const p = grwMeisterschaften(K); const r = grwMeisterschaften(null);
    expect(Object.keys(p).sort()).toEqual(Object.keys(r).sort());
    for (const f of Object.keys(r)) expect(nachName(ohneId(p[f]) as never), f).toEqual(nachName(ohneId(r[f]) as never));
    expect(p['Geschichte & Mythen']).toBe(p['Geschichte und Mythen']);
    expect(nachName(ohneId(grwAllgemeineKampfmeisterschaften(K)) as never)).toEqual(nachName(ohneId(grwAllgemeineKampfmeisterschaften(null)) as never));
    expect(nachName(ohneId(grwAllgemeineMagiemeisterschaften(K)) as never)).toEqual(nachName(ohneId(grwAllgemeineMagiemeisterschaften(null)) as never));
    expect(p.Klingenwaffen[0].id).toMatch(/^grw:meisterschaft:klingenwaffen:/);
  });

  it('Stärken, Schwächen, Ressourcen, Sprachen, Mondzeichen gleich mit dem Rückfall', () => {
    expect(nachName(grwStaerken(K))).toEqual(nachName(grwStaerken(null)));
    expect(nachName(grwSchwaechen(K))).toEqual(nachName(grwSchwaechen(null)));
    expect(nachName(grwRessourcen(K))).toEqual(nachName(grwRessourcen(null)));
    expect(nachName(grwSprachen(K))).toEqual(nachName(grwSprachen(null)));
    expect([...grwMondzeichen(K)].sort()).toEqual([...grwMondzeichen(null)].sort());
  });

  it('Fertigkeiten mit Attributen gleich mit dem Rückfall', () => {
    const p = grwFertigkeiten(K); const r = grwFertigkeiten(null);
    for (const a of ['allgemein', 'kampf', 'magie'] as const) expect([...p[a]].sort(), a).toEqual([...r[a]].sort());
    expect(grwFertigkeitsattribute(K)).toEqual(grwFertigkeitsattribute(null));
  });

  it('Meisterschaftsschwellen aus dem Paket (GRW: 6, 9, 12, 15)', () => {
    expect([1, 2, 3, 4].map((s) => schwellenwert(s, K))).toEqual([6, 9, 12, 15]);
    expect([1, 2, 3, 4].map((s) => schwellenwert(s, null))).toEqual([6, 9, 12, 15]);
  });

  it('Mehrfach wählbare Stärken laut Text (GRW S. 72–74)', () => {
    const s = Object.fromEntries(grwStaerken(K).map((x) => [x.name, [x.max, x.multi]]));
    expect(s.Robust).toEqual([3, true]);                       // „bis zu dreimal“
    expect(s.Lastesel).toEqual([3, true]);
    expect(s['Erhöhter Fokuspool']).toEqual([20, true]);       // „beliebig oft wählbar“
    expect(s['Hoher Geistiger Widerstand']).toEqual([4, true]); // „einmal pro Heldengrad“
    expect(s['Erwählter der [Wesen]']).toEqual([1, true]);      // jede Wahl für einen anderen Typus
    expect(s.Attraktivität).toEqual([1, false]);
    expect(staerkeHoechstens(undefined)).toEqual({ max: 1, multi: false });
  });

  it('Rassen, Stärkenpunkte, Attribute, Gesundheitsstufen gleich mit dem Rückfall (GRW S. 13–15, 23–27, 172)', () => {
    expect(grwRassen(K)).toEqual(grwRassen(null));
    expect(['Mensch', 'Alb', 'Gnom'].map((r) => staerkenBudget(r, K))).toEqual([8, 6, 6]);
    expect(['Mensch', 'Alb', 'Gnom'].map((r) => staerkenBudget(r, null))).toEqual([8, 6, 6]);
    expect(grwAttribute(K)).toEqual(grwAttribute(null));
    expect(grwAlleFertigkeiten(K)).toEqual(grwAlleFertigkeiten(null));
    expect(grwGesundheitsstufen(K)).toEqual(grwGesundheitsstufen(null));
  });
});

describe('Erschaffung: kostenlose Stärke der Kultur', () => {
  it('Kulturkunde laut GRW-Paket (GRW S. 23)', async () => {
    const { gratisStaerkeDerKultur } = await import('../grwListen');
    expect(gratisStaerkeDerKultur(K)).toBe('Kulturkunde');
    expect(gratisStaerkeDerKultur(null)).toBe('Kulturkunde');
  });
});
