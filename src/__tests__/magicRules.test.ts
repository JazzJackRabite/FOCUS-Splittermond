import { describe, it, expect } from 'vitest';
import {
  parseFocusCost,
  STANDARD_SPELL_ENHANCEMENTS,
  lookupSpellInDb,
  getFullSpellInfo,
  calculateSpellEG,
  calculateTotalEGSpent,
  calculateFinalSpellCosts,
  INITIAL_EG_ALLOCATIONS,
  parseSpellPermissibleModifications,
} from '../utils/magicRules';
import { baseCharacterReducer, DEFAULT_STATE } from '../hooks/useCharacterState';
import type { CharacterState, ChanneledSpell, Spell } from '../types';

describe('magicRules - parseFocusCost', () => {
  it('parses channeled focus cost correctly (e.g. K4)', () => {
    const result = parseFocusCost('K4');
    expect(result.isChanneled).toBe(true);
    expect(result.channeled).toBe(4);
    expect(result.exhausted).toBe(0);
    expect(result.consumed).toBe(0);
    expect(result.total).toBe(4);
  });

  it('parses standard exhausted focus cost (e.g. 4)', () => {
    const result = parseFocusCost('4');
    expect(result.isChanneled).toBe(false);
    expect(result.channeled).toBe(0);
    expect(result.exhausted).toBe(4);
    expect(result.consumed).toBe(0);
    expect(result.total).toBe(4);
  });

  it('parses consumed focus cost (e.g. 5V2 and 12V3)', () => {
    const result5v2 = parseFocusCost('5V2');
    expect(result5v2.isChanneled).toBe(false);
    expect(result5v2.channeled).toBe(0);
    expect(result5v2.exhausted).toBe(5);
    expect(result5v2.consumed).toBe(2);
    expect(result5v2.total).toBe(7);

    const result12v3 = parseFocusCost('12V3');
    expect(result12v3.isChanneled).toBe(false);
    expect(result12v3.channeled).toBe(0);
    expect(result12v3.exhausted).toBe(12);
    expect(result12v3.consumed).toBe(3);
    expect(result12v3.total).toBe(15);
  });

  it('parses channeled with consumed (e.g. K4V1)', () => {
    const result = parseFocusCost('K4V1');
    expect(result.isChanneled).toBe(true);
    expect(result.channeled).toBe(4);
    expect(result.consumed).toBe(1);
    expect(result.total).toBe(5);
  });

  it('handles empty or dash cost', () => {
    const result = parseFocusCost('—');
    expect(result.channeled).toBe(0);
    expect(result.exhausted).toBe(0);
    expect(result.consumed).toBe(0);
    expect(result.total).toBe(0);
  });
});

describe('magicRules - enhancements & info', () => {
  it('provides standard spell enhancements', () => {
    expect(STANDARD_SPELL_ENHANCEMENTS.length).toBeGreaterThanOrEqual(4);
    const rangeEnh = STANDARD_SPELL_ENHANCEMENTS.find((e) => e.id === 'range');
    expect(rangeEnh).toBeDefined();
    expect(rangeEnh?.focusDelta).toBe(2);
  });

  it('retrieves spell info from database', () => {
    const spell: Spell = {
      name: 'Wahrer Blick',
      school: 'Bannmagie',
      grade: 0,
      cost: 'K1',
    };
    const info = getFullSpellInfo(spell);
    expect(info.name).toBe('Wahrer Blick');
    expect(info.cost).toBe('K1');
    expect(info.isChanneled).toBe(true);
  });

  it('matches user example scenario: Feuerstrahl with 3 EG', () => {
    // Example from prompt:
    // Difficulty: 18, Roll: 27 -> diff: 9 -> 3 EG
    // Base cost: 5V2 (5 exhausted, 2 consumed)
    // Allocations: 1 EG for +1 damage, 2 EG to save 2 exhausted focus
    // Final focus costs: 3 exhausted, 2 consumed
    const egCalc = calculateSpellEG(27, 18);
    expect(egCalc.isSuccess).toBe(true);
    expect(egCalc.differenz).toBe(9);
    expect(egCalc.eg).toBe(3);

    const allocations = {
      ...INITIAL_EG_ALLOCATIONS,
      increaseDamage: 1, // 1 EG
      saveExhaustedFocus: 2, // 2 EG
    };

    expect(calculateTotalEGSpent(allocations)).toBe(3);

    const baseCost = parseFocusCost('5V2');
    const finalCosts = calculateFinalSpellCosts(baseCost, allocations);

    expect(finalCosts.effectiveExhausted).toBe(3);
    expect(finalCosts.effectiveConsumed).toBe(2);
    expect(finalCosts.effectiveChanneled).toBe(0);
    expect(finalCosts.totalFocus).toBe(5);
  });

  it('handles spell failure: exhausts negative EG focus', () => {
    // Failure: difficulty 18, roll 12 -> diff -6 -> -2 negative EG
    const egCalc = calculateSpellEG(12, 18);
    expect(egCalc.isSuccess).toBe(false);
    expect(egCalc.differenz).toBe(-6);
    expect(egCalc.negativeEG).toBe(2);
    expect(egCalc.exhaustedFocusLostOnFailure).toBe(2);
  });

  it('correctly parses permissible modifications according to Splittermond database', () => {
    // 1. Wahrer Blick: only Auslösezeit and Verstärken
    const wahrerBlick = lookupSpellInDb('Wahrer Blick', 'Bannmagie');
    expect(wahrerBlick).toBeDefined();
    const wbMods = parseSpellPermissibleModifications(wahrerBlick?.description, wahrerBlick?.name);
    expect(wbMods.allowsCastTime).toBe(true);
    expect(wbMods.allowsEnhance).toBe(true);
    expect(wbMods.allowsDamage).toBe(false);
    expect(wbMods.allowsRange).toBe(false);
    expect(wbMods.allowsDuration).toBe(false);
    expect(wbMods.allowsArea).toBe(false);
    expect(wbMods.allowsExhaustedFocus).toBe(false);
    expect(wbMods.allowsChanneledFocus).toBe(false);
    expect(wbMods.allowsConsumedFocus).toBe(false);
    expect(wbMods.specificEnhancements.length).toBeGreaterThan(0);
    expect(wbMods.specificEnhancements[0].egCost).toBe(2);
    expect(wbMods.specificEnhancements[0].focusCostRaw).toBe('+K1V1');

    // 2. Feuerstrahl: has Schaden, Reichweite, Erschöpfter Fokus, Verzehrter Fokus
    const feuerstrahl = lookupSpellInDb('Feuerstrahl', 'Kampfmagie');
    expect(feuerstrahl).toBeDefined();
    const fsMods = parseSpellPermissibleModifications(feuerstrahl?.description, feuerstrahl?.name);
    expect(fsMods.allowsDamage).toBe(true);
    expect(fsMods.allowsRange).toBe(true);
    expect(fsMods.allowsCastTime).toBe(true);
    expect(fsMods.allowsExhaustedFocus).toBe(true);
    expect(fsMods.allowsConsumedFocus).toBe(true);
    expect(fsMods.allowsDuration).toBe(false);
    expect(fsMods.allowsArea).toBe(false);

    // 3. Aura der Entschlossenheit: has Kanalisierter Fokus, Wirkungsbereich, Verzehrter Fokus
    const aura = lookupSpellInDb('Aura der Entschlossenheit', 'Stärkung');
    expect(aura).toBeDefined();
    const auraMods = parseSpellPermissibleModifications(aura?.description, aura?.name);
    expect(auraMods.allowsChanneledFocus).toBe(true);
    expect(auraMods.allowsArea).toBe(true);
    expect(auraMods.allowsConsumedFocus).toBe(true);
    expect(auraMods.allowsDamage).toBe(false);
    expect(auraMods.allowsRange).toBe(false);
  });

  it('saves consumed focus (3 EG per 1 consumed FO) and applies specific enhancement focus costs', () => {
    // Spell costs 4V2 (4 exhausted focus, 2 consumed focus)
    const baseCost = parseFocusCost('4V2');
    expect(baseCost.exhausted).toBe(4);
    expect(baseCost.consumed).toBe(2);

    const availableEnhancements = [
      {
        id: 'enh-1',
        egCost: 2,
        focusCostRaw: '+1V1',
        focusDelta: parseFocusCost('1V1'), // 1 exhausted, 1 consumed
        description: 'Zusätzlicher Effekt',
        raw: '2 EG (Kosten +1V1): Zusätzlicher Effekt',
      },
    ];

    const allocations = {
      ...INITIAL_EG_ALLOCATIONS,
      saveConsumedFocus: 1, // 3 EG spent -> saves 1 consumed focus
      selectedEnhancementIds: ['enh-1'], // 2 EG spent -> costs +1V1
    };

    // Total EG spent: 3 (saveConsumedFocus) + 2 (enh-1) = 5 EG
    expect(calculateTotalEGSpent(allocations, availableEnhancements)).toBe(5);

    const finalCosts = calculateFinalSpellCosts(baseCost, allocations, availableEnhancements);
    // Base exhausted: 4, save: 0, enh: +1 -> 5
    expect(finalCosts.effectiveExhausted).toBe(5);
    // Base consumed: 2, save: -1, enh: +1 -> 2
    expect(finalCosts.effectiveConsumed).toBe(2);
    expect(finalCosts.modificationsSummary).toContain('-1 Verzehrter Fokus (3 EG)');
    expect(finalCosts.modificationsSummary.some((s) => s.includes('Verstärkung: Zusätzlicher Effekt [Kosten +1V1] (2 EG)'))).toBe(true);
  });
});

describe('useCharacterState - spell actions', () => {
  it('PLAY_CAST_SPELL deducts exhausted focus', () => {
    const state: CharacterState = {
      ...DEFAULT_STATE,
      playState: {
        ...DEFAULT_STATE.playState,
        focus: { exhausted: 2, consumed: 0, channeled: 0 },
        channeledSpells: [],
      },
    };

    const nextState = baseCharacterReducer(state, {
      type: 'PLAY_CAST_SPELL',
      payload: {
        exhaustedFocus: 4,
        channeledFocus: 0,
        consumedFocus: 0,
      },
    });

    expect(nextState.playState.focus.exhausted).toBe(6);
    expect(nextState.playState.focus.channeled).toBe(0);
    expect(nextState.playState.focus.consumed).toBe(0);
  });

  it('PLAY_CAST_SPELL adds channeled focus and creates active channeled spell', () => {
    const state: CharacterState = {
      ...DEFAULT_STATE,
      playState: {
        ...DEFAULT_STATE.playState,
        focus: { exhausted: 0, consumed: 0, channeled: 0 },
        channeledSpells: [],
      },
    };

    const newSpell: ChanneledSpell = {
      id: 'spell-1',
      name: 'Lichtstrahl',
      school: 'Lichtmagie',
      grade: 1,
      channeledFocus: 4,
      activeRounds: 1,
      activeTicks: 0,
      startedAt: '2026-08-31',
    };

    const nextState = baseCharacterReducer(state, {
      type: 'PLAY_CAST_SPELL',
      payload: {
        exhaustedFocus: 0,
        channeledFocus: 4,
        consumedFocus: 0,
        channeledSpell: newSpell,
      },
    });

    expect(nextState.playState.focus.channeled).toBe(4);
    expect(nextState.playState.channeledSpells).toHaveLength(1);
    expect(nextState.playState.channeledSpells[0].name).toBe('Lichtstrahl');
  });

  it('PLAY_CANCEL_CHANNELED_SPELL releases channeled focus into exhausted focus pool', () => {
    const state: CharacterState = {
      ...DEFAULT_STATE,
      playState: {
        ...DEFAULT_STATE.playState,
        focus: { exhausted: 2, consumed: 0, channeled: 4 },
        channeledSpells: [
          {
            id: 'spell-1',
            name: 'Lichtstrahl',
            channeledFocus: 4,
          },
        ],
      },
    };

    const nextState = baseCharacterReducer(state, {
      type: 'PLAY_CANCEL_CHANNELED_SPELL',
      payload: { id: 'spell-1' },
    });

    expect(nextState.playState.focus.channeled).toBe(0);
    expect(nextState.playState.focus.exhausted).toBe(6); // 2 + 4
    expect(nextState.playState.channeledSpells).toHaveLength(0);
  });

  it('PLAY_UPDATE_CHANNELED_SPELL updates active rounds and ticks', () => {
    const state: CharacterState = {
      ...DEFAULT_STATE,
      playState: {
        ...DEFAULT_STATE.playState,
        channeledSpells: [
          {
            id: 'spell-1',
            name: 'Lichtstrahl',
            channeledFocus: 4,
            activeRounds: 1,
            activeTicks: 4,
          },
        ],
      },
    };

    const nextState = baseCharacterReducer(state, {
      type: 'PLAY_UPDATE_CHANNELED_SPELL',
      payload: {
        id: 'spell-1',
        update: { activeRounds: 2, activeTicks: 10 },
      },
    });

    expect(nextState.playState.channeledSpells[0].activeRounds).toBe(2);
    expect(nextState.playState.channeledSpells[0].activeTicks).toBe(10);
  });
});
