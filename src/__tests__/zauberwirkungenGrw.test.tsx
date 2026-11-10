/**
 * Prüfung der Zauberwirkungen im Spielmodus gegen das Grundregelwerk (Regelpaket public/regelpakete/grw.srp.json).
 * Entstanden bei der Durchsicht des AI-Studio-Stands vom 10.11.2026 (CLAUDE_EDITION Stand 15/16).
 */
import React from 'react';
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import {
  ZAUBER_KAMPFWERTE,
  INITIAL_EG_ALLOCATIONS,
  begrenzeZauberbonus,
  calculateFinalSpellCosts,
  calculateTotalEGSpent,
  getActiveSpellModifiers,
  getActiveSpellRollBonuses,
  getSpellWeaponDamageBonus,
  parseFocusCost,
  zauberHoechstbonus,
} from '../utils/magicRules';
import { ChanneledSpellsTracker } from '../components/play/ChanneledSpellsTracker';
import type { ChanneledSpell } from '../types';

const paket = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../public/regelpakete/grw.srp.json'), 'utf8'));
const ZAUBER: Record<string, { wirkung: string; erfolgsgrade: string }> = {};
for (const e of paket.eintraege) if (e.typ === 'zauber') ZAUBER[e.name.toLowerCase()] = { wirkung: e.daten.wirkung ?? '', erfolgsgrade: e.daten.erfolgsgrade ?? '' };

const zauber = (name: string, verstaerkt = false, extra: Partial<ChanneledSpell> = {}): ChanneledSpell =>
  ({ id: `cs-${name}`, name, channeledFocus: 4, ...(verstaerkt ? { selectedEnhancementIds: ['enh-1'] } : {}), ...extra }) as ChanneledSpell;

describe('Tabelle der Kampfwerte stimmt mit den Zaubertexten des GRW überein', () => {
  it('jeder Zauber existiert, Grundwerte stehen in der Wirkung, verstärkte Werte in den Erfolgsgraden', () => {
    for (const [name, e] of Object.entries(ZAUBER_KAMPFWERTE)) {
      const z = ZAUBER[name];
      expect(z, `Zauber „${name}“ fehlt im GRW`).toBeTruthy();
      for (const [feld, wert] of Object.entries(e.basis)) {
        if (wert >= 999) { expect(z.wirkung, name).toMatch(/ignoriert/); continue; }
        expect(z.wirkung, `${name}: Grundwert ${feld} ${wert}`).toMatch(new RegExp(`(?<!\\d)${wert}(?!\\d) Punkt`));
      }
      const geaendert = Object.entries(e.v ?? {}).filter(([feld, wert]) => (e.basis as Record<string, number>)[feld] !== wert);
      for (const [feld, wert] of geaendert) {
        expect(z.erfolgsgrade, `${name}: verstärkter Wert ${feld} ${wert}`).toMatch(new RegExp(`(?<!\\d)${wert}(?!\\d) Punkt`));
      }
    }
  });
});

describe('Höchstbonus aus Zauberei (GRW S. 18–19)', () => {
  it('3 zu Spielbeginn, +1 je Heldengrad', () => {
    expect(zauberHoechstbonus({ heldengrad: { name: 'Heldengrad 1 (Suchender)' } })).toBe(3);
    expect(zauberHoechstbonus({ heldengrad: { name: 'Heldengrad 3 (Streiter)' } })).toBe(5);
    expect(zauberHoechstbonus({ regelwerk: { hoechstbonus: 4 }, heldengrad: { name: 'Heldengrad 1 (Suchender)' } })).toBe(4);
  });
  it('Stahlhaut: VTD auf 3 begrenzt, Schadensreduktion (kein abgeleiteter Wert) bleibt 4', () => {
    const m = getActiveSpellModifiers([zauber('Stahlhaut')], 3);
    expect(m.vtdBonus).toBe(3);
    expect(m.srBonus).toBe(4);
    expect(m.hinweise.join(' ')).toContain('Höchstbonus 3');
  });
  it('Probenbonus: Sinne verstärken +5 wird auf 3 begrenzt', () => {
    const b = getActiveSpellRollBonuses([zauber('Sinne verstärken')], 'Wahrnehmung');
    expect(b.map((x) => x.bonus)).toEqual([5]);
    expect(begrenzeZauberbonus(5, 3)).toBe(3);
  });
});

describe('Zauberwerte nach GRW', () => {
  it('Zauber des Typus Haut sind nicht kombinierbar – nur der stärkste zählt', () => {
    const m = getActiveSpellModifiers([zauber('Rindenhaut'), zauber('Steinhaut')]);
    expect([m.vtdBonus, m.srBonus]).toEqual([2, 2]);
    expect(m.hinweise[0]).toContain('Rindenhaut zählt nicht');
  });
  it('Widerstandswerte sind VTD, GW und KW (Widerstände erhöhen, Segnung)', () => {
    const m = getActiveSpellModifiers([zauber('Widerstände erhöhen')]);
    expect([m.vtdBonus, m.gwBonus, m.kwBonus]).toEqual([2, 2, 2]);
  });
  it('Verstärkungen: Schmerzen widerstehen 4, Beschleunigen +4, Rindenhaut SR 2', () => {
    expect(getActiveSpellModifiers([zauber('Schmerzen widerstehen', true)]).woundPenaltyReduction).toBe(4);
    expect(getActiveSpellModifiers([zauber('Beschleunigen', true)]).gswBonus).toBe(4);
    expect(getActiveSpellModifiers([zauber('Rindenhaut', true)]).srBonus).toBe(2);
  });
  it('Magieschutz ist ein Malus auf gegnerische Zauber, kein Bonus auf GW/KW; Schutz vor Elementen senkt um 10', () => {
    const m = getActiveSpellModifiers([zauber('Großer Magieschutz'), zauber('Schutz vor Elementen')]);
    expect([m.gwBonus, m.kwBonus]).toEqual([0, 0]);
    expect(m.breakdown.map((b) => b.description).join(' | ')).toContain('um 10 gesenkt');
  });
  it('Spinnenlauf gilt für Klettern (Athletik), Weg durch die Natur nur für Überleben – beide nur in der passenden Lage', () => {
    const s = getActiveSpellRollBonuses([zauber('Spinnenlauf')], 'Athletik');
    expect(s.map((x) => [x.bonus, x.active])).toEqual([[4, false]]);
    expect(getActiveSpellRollBonuses([zauber('Weg durch die Natur')], 'Naturkunde')).toEqual([]);
    expect(getActiveSpellRollBonuses([zauber('Weg durch die Natur')], 'Überleben')[0].active).toBe(false);
  });
  it('Attributszauber bei Angriffen nicht vorausgewählt (Attribute hängen von der Waffe ab); Waffe des Lichtes +2 nur gegen bestimmte Wesen', () => {
    const b = getActiveSpellRollBonuses([zauber('Bärenstärke'), zauber('Waffe des Lichtes')], 'Klingenwaffen', true, 'w1');
    expect(b.map((x) => [x.source, x.bonus, x.active])).toEqual([['Bärenstärke', 4, false], ['Waffe des Lichtes', 2, false]]);
  });
  it('Waffenzauber treffen nur die verzauberte Waffe und nie den waffenlosen Angriff; Flammenhand wirkt waffenlos', () => {
    const flamme = zauber('Flammende Waffe', false, { targetItemId: 'w-katar' });
    expect(getSpellWeaponDamageBonus([flamme], 'w-katar', 'Katar').totalDamage).toBe(1);
    expect(getSpellWeaponDamageBonus([flamme], 'w-schwert', 'Langschwert').totalDamage).toBe(0);
    expect(getSpellWeaponDamageBonus([flamme], undefined, 'Waffenlos').totalDamage).toBe(0);
    expect(getSpellWeaponDamageBonus([zauber('Flammende Waffe')], 'waffen|Nahkampf|Handgemenge|Waffenlos').totalDamage).toBe(0);
    expect(getSpellWeaponDamageBonus([zauber('Flammenhand', true)], 'waffenlos').fireDamage).toBe(2);
  });
});

describe('Erfolgsgrade (GRW S. 221–222)', () => {
  it('verzehrter Fokus ist ganz einsparbar, solange 1 erschöpfter oder kanalisierter Punkt bleibt', () => {
    const k = calculateFinalSpellCosts(parseFocusCost('4V1'), { ...INITIAL_EG_ALLOCATIONS, saveConsumedFocus: 1 });
    expect([k.effectiveExhausted, k.effectiveConsumed, k.totalFocus]).toEqual([3, 0, 3]);
  });
  it('Wirkungsbereich kostet 3 EG je Stufe', () => {
    expect(calculateTotalEGSpent({ ...INITIAL_EG_ALLOCATIONS, expandArea: 2 })).toBe(6);
  });
});

describe('Anzeige', () => {
  it('Tracker übersteht den Wechsel von „kein Zauber“ zu „ein Zauber“ (Hooks vor der frühen Rückgabe)', () => {
    const leer = () => {};
    const { rerender, getByText } = render(<ChanneledSpellsTracker channeledSpells={[]} onCancelSpell={leer} onUpdateSpell={leer} isCombatDashboard />);
    expect(() => rerender(<ChanneledSpellsTracker channeledSpells={[zauber('Steinhaut')]} onCancelSpell={leer} onUpdateSpell={leer} isCombatDashboard />)).not.toThrow();
    expect(getByText('Steinhaut')).toBeTruthy();
  });
});
