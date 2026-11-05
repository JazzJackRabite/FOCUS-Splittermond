import { describe, it, expect } from 'vitest';
import {
  calculateAttackEG,
  FREE_COMBAT_MANEUVERS,
  getAvailableCombatManeuvers,
  parseWeaponDamage,
  executeAttackDamageRoll,
} from '../utils/combatRules';

describe('Splittermond Combat Rules & Attack Calculations', () => {
  describe('calculateAttackEG (GRW S. 17 & 158-161)', () => {
    it('calculates 0 EG for close hit (Diff 0 to 2)', () => {
      // Roll 15 vs VTD 15 -> Diff 0 -> 0 EG
      const res0 = calculateAttackEG(15, 15);
      expect(res0.isSuccess).toBe(true);
      expect(res0.differenz).toBe(0);
      expect(res0.eg).toBe(0);

      // Roll 17 vs VTD 15 -> Diff 2 -> 0 EG
      const res2 = calculateAttackEG(17, 15);
      expect(res2.isSuccess).toBe(true);
      expect(res2.differenz).toBe(2);
      expect(res2.eg).toBe(0);
    });

    it('calculates 1 EG for Diff 3..5, 2 EG for Diff 6..8, 3 EG for Diff 9..11', () => {
      expect(calculateAttackEG(18, 15).eg).toBe(1);
      expect(calculateAttackEG(20, 15).eg).toBe(1);
      expect(calculateAttackEG(21, 15).eg).toBe(2);
      expect(calculateAttackEG(23, 15).eg).toBe(2);
      expect(calculateAttackEG(24, 15).eg).toBe(3);
      expect(calculateAttackEG(30, 15).eg).toBe(5);
    });

    it('handles missed attacks correctly', () => {
      const closeMiss = calculateAttackEG(14, 15);
      expect(closeMiss.isSuccess).toBe(false);
      expect(closeMiss.differenz).toBe(-1);
      expect(closeMiss.outcomeLabel).toBe('Knapp verfehlt');

      const farMiss = calculateAttackEG(10, 15);
      expect(farMiss.isSuccess).toBe(false);
      expect(farMiss.outcomeLabel).toBe('Verfehlt');
    });

    it('handles Fumble (Patzer) and Triumph (Doppel-10)', () => {
      const fumble = calculateAttackEG(18, 15, true, false);
      expect(fumble.isSuccess).toBe(false);
      expect(fumble.isFumble).toBe(true);
      expect(fumble.eg).toBe(0);
      expect(fumble.outcomeLabel).toBe('Patzer!');

      // Triumph gives minimum 1 EG and +1 extra EG
      const triumphLow = calculateAttackEG(15, 15, false, true);
      expect(triumphLow.isSuccess).toBe(true);
      expect(triumphLow.isCrit).toBe(true);
      expect(triumphLow.eg).toBe(1); // 0 base + 1 triumph bonus = 1

      const triumphHigh = calculateAttackEG(21, 15, false, true);
      expect(triumphHigh.eg).toBe(3); // 2 base + 1 triumph bonus = 3
    });
  });

  describe('FREE_COMBAT_MANEUVERS (GRW S. 160-161)', () => {
    it('provides standard maneuvers to all characters', () => {
      const ids = FREE_COMBAT_MANEUVERS.map((m) => m.id);
      expect(ids).toContain('none');
      expect(ids).toContain('wuchtangriff');
      expect(ids).toContain('gezielter_schlag');
      expect(ids).toContain('defensiver_angriff');
      expect(ids).toContain('finte');
      expect(ids).toContain('umreissen');
    });

    it('Wuchtangriff has egDamageRate of 2', () => {
      const wucht = FREE_COMBAT_MANEUVERS.find((m) => m.id === 'wuchtangriff');
      expect(wucht?.egDamageRate).toBe(2);
    });

    it('Umreißen inflicts condition Liegend', () => {
      const umreissen = FREE_COMBAT_MANEUVERS.find((m) => m.id === 'umreissen');
      expect(umreissen?.inflictsCondition).toBe('Liegend');
    });
  });

  describe('getAvailableCombatManeuvers with character masteries', () => {
    it('returns free maneuvers when no masteries learned', () => {
      const maneuvers = getAvailableCombatManeuvers([], 'Klingenwaffen');
      expect(maneuvers.length).toBe(FREE_COMBAT_MANEUVERS.length);
    });

    it('includes learned mastery maneuvers like Hammerschlag or Schmetterschlag', () => {
      const characterMasteries = [
        { name: 'Hammerschlag (S2)', skill: 'Hiebwaffen' },
        { name: 'Schmetterschlag (S2)', skill: 'Hiebwaffen' },
      ];
      const maneuvers = getAvailableCombatManeuvers(characterMasteries, 'Hiebwaffen');
      const names = maneuvers.map((m) => m.name);
      expect(names).toContain('Hammerschlag');
      expect(names).toContain('Schmetterschlag');
    });

    it('NEVER allows Scharfschütze or Meisterschuss for Hellebarde / Stangenwaffen', () => {
      // Character has learned various masteries across different skills
      const characterMasteries = [
        { name: 'Scharfschütze (S1)', skill: 'Schusswaffen' },
        { name: 'Meisterschuss (S3)', skill: 'Schusswaffen' },
        { name: 'Ausfall (S1)', skill: 'Stangenwaffen' },
        { name: 'Rundumschlag (S2)', skill: 'Allgemeine Nahkampfmeisterschaften' },
        { name: 'Hammerschlag (S2)', skill: 'Hiebwaffen' },
      ];

      // Test with Hellebarde (Stangenwaffen / Nahkampf)
      const maneuvers = getAvailableCombatManeuvers(characterMasteries, 'Stangenwaffen', 'Nahkampf');
      const names = maneuvers.map((m) => m.name);

      // Scharfschütze and Meisterschuss MUST NOT be in the maneuvers list
      expect(names).not.toContain('Scharfschütze');
      expect(names).not.toContain('Meisterschuss');

      // Hammerschlag is Hiebwaffen/Kettenwaffen only, so not on Stangenwaffen
      expect(names).not.toContain('Hammerschlag');

      // Allowed maneuvers for Stangenwaffen MUST be present
      expect(names).toContain('Ausfall');
      expect(names).toContain('Rundumschlag');
      expect(names).toContain('Standardangriff');
      expect(names).toContain('Wuchtangriff');
      expect(names).toContain('Gezielter Schlag / Schuss');
      expect(names).toContain('Defensiver Angriff');
      expect(names).toContain('Finte');
      expect(names).toContain('Zu Boden werfen / Umreißen');
    });

    it('handles Schusswaffen correctly: allows only ranged maneuvers and no melee maneuvers', () => {
      const characterMasteries = [
        { name: 'Scharfschütze (S1)', skill: 'Schusswaffen' },
        { name: 'Meisterschuss (S3)', skill: 'Schusswaffen' },
        { name: 'Ausfall (S1)', skill: 'Klingenwaffen' },
        { name: 'Rundumschlag (S2)', skill: 'Allgemeine Nahkampfmeisterschaften' },
        { name: 'Hammerschlag (S2)', skill: 'Hiebwaffen' },
      ];

      const maneuvers = getAvailableCombatManeuvers(characterMasteries, 'Schusswaffen', 'Fernkampf');
      const names = maneuvers.map((m) => m.name);

      // Ranged masteries allowed
      expect(names).toContain('Scharfschütze');
      expect(names).toContain('Meisterschuss');

      // Free ranged maneuvers
      expect(names).toContain('Standardangriff');
      expect(names).toContain('Gezielter Schuss');

      // Melee-only maneuvers MUST NOT be present
      expect(names).not.toContain('Wuchtangriff'); // GRW S. 160: not allowed with Schusswaffen
      expect(names).not.toContain('Defensiver Angriff');
      expect(names).not.toContain('Finte');
      expect(names).not.toContain('Zu Boden werfen / Umreißen');
      expect(names).not.toContain('Ausfall');
      expect(names).not.toContain('Rundumschlag');
      expect(names).not.toContain('Hammerschlag');
    });

    it('handles Wurfwaffen correctly: allows Wuchtangriff, Gezielter Wurf, and thrown masteries', () => {
      const characterMasteries = [
        { name: 'Scharfschütze (S1)', skill: 'Wurfwaffen' },
        { name: 'Meisterwurf (S3)', skill: 'Wurfwaffen' },
        { name: 'Meisterschuss (S3)', skill: 'Schusswaffen' },
        { name: 'Hammerschlag (S2)', skill: 'Hiebwaffen' },
      ];

      const maneuvers = getAvailableCombatManeuvers(characterMasteries, 'Wurfwaffen', 'Fernkampf');
      const names = maneuvers.map((m) => m.name);

      // Thrown masteries allowed
      expect(names).toContain('Scharfschütze');
      expect(names).toContain('Meisterwurf');

      // Free thrown maneuvers (Wuchtangriff allowed per GRW S. 160)
      expect(names).toContain('Standardangriff');
      expect(names).toContain('Wuchtangriff');
      expect(names).toContain('Gezielter Wurf');

      // Melee & Bow masteries rejected
      expect(names).not.toContain('Meisterschuss');
      expect(names).not.toContain('Hammerschlag');
      expect(names).not.toContain('Defensiver Angriff');
      expect(names).not.toContain('Finte');
    });
  });

  describe('parseWeaponDamage', () => {
    it('parses formulas like 1W6+2, 2W6, 1W10+4', () => {
      const p1 = parseWeaponDamage('1W6+2');
      expect(p1.count).toBe(1);
      expect(p1.sides).toBe(6);
      expect(p1.bonus).toBe(2);

      const p2 = parseWeaponDamage('2W6');
      expect(p2.count).toBe(2);
      expect(p2.sides).toBe(6);
      expect(p2.bonus).toBe(0);

      const p3 = parseWeaponDamage('1W10+4 (Stich)');
      expect(p3.count).toBe(1);
      expect(p3.sides).toBe(10);
      expect(p3.bonus).toBe(4);
      expect(p3.damageType).toBe('Stich');
    });
  });

  describe('executeAttackDamageRoll', () => {
    it('calculates gross damage, armor penetration and net damage', () => {
      const result = executeAttackDamageRoll({
        baseFormula: '1W6+4',
        egBonusDamage: 4, // e.g. 2 EG with Wuchtangriff (+2 per EG)
        targetArmorReduction: 3,
        armorPenetrationEG: 2, // 2 points armor penetrated
        damageType: 'Schnitt',
      });

      expect(result.grossDamage).toBeGreaterThanOrEqual(9); // at least 1 (min die) + 4 (bonus) + 4 (EG) = 9
      expect(result.effectiveArmor).toBe(1); // 3 - 2 = 1
      expect(result.netDamage).toBe(result.grossDamage - 1);
      expect(result.breakdownText).toBeDefined();
    });

    it('includes conditions when Umreißen or mastery maneuver is used', () => {
      const result = executeAttackDamageRoll({
        baseFormula: '1W6+2',
        egBonusDamage: 0,
        maneuverCondition: 'Verwundet 1',
        tripCondition: true,
      });

      expect(result.appliedConditions).toContain('Verwundet 1');
      expect(result.appliedConditions).toContain('Liegend');
    });
  });
});
