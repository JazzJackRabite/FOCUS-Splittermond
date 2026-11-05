import { describe, it, expect, beforeEach } from 'vitest';
import {
  getModules,
  addModuleDummy,
  removeModuleDummy,
  saveOverride,
  resetOverride,
  resetAllOverrides,
  getSpellDescription,
  getMasteryDescription,
  getStrengthDescription,
  getWeaknessDescription,
  getResourceDescription,
  getOverridesCount,
} from '../utils/gameResourceManager';

describe('Game Resource Manager & Module System', () => {
  beforeEach(() => {
    localStorage.clear();
    resetAllOverrides();
  });

  it('has Grundregelwerk configured as default module which cannot be removed', () => {
    const modules = getModules();
    expect(modules.length).toBeGreaterThan(0);
    const grw = modules.find((m) => m.id === 'grw');
    expect(grw).toBeDefined();
    expect(grw?.isDefault).toBe(true);
    expect(grw?.canRemove).toBe(false);
  });

  it('provides dummy responses for adding and removing modules as requested', () => {
    const addResult = addModuleDummy();
    expect(addResult.success).toBe(false);
    expect(addResult.message).toContain('Dummy-Funktion');

    // Trying to remove GRW
    const grwRemoveResult = removeModuleDummy('grw');
    expect(grwRemoveResult.success).toBe(false);
    expect(grwRemoveResult.message).toContain('Standard-Modul');

    // Removing another dummy module
    const mskRemoveResult = removeModuleDummy('msk');
    expect(mskRemoveResult.success).toBe(false);
    expect(mskRemoveResult.message).toContain('Dummy-Funktion');
  });

  it('allows customizing descriptions for all 5 game resource types and resetting them', () => {
    // 1. Spells (Zauber)
    saveOverride('spells', 'Flammenstrahl', 'Benutzerdefinierte Flammen-Beschreibung');
    expect(getSpellDescription('Flammenstrahl')).toBe('Benutzerdefinierte Flammen-Beschreibung');

    // 2. Masteries (Meisterschaften)
    saveOverride('masteries', 'Block (S1)', 'Erweiterte Block-Meisterschaftsbeschreibung', 'Handgemenge');
    expect(getMasteryDescription('Handgemenge', 'Block (S1)')).toBe(
      'Erweiterte Block-Meisterschaftsbeschreibung',
    );

    // 3. Strengths (Stärken)
    saveOverride('strengths', 'Ausdauernd', 'Erhöhte Ausdauer im Kampf und auf Reisen');
    expect(getStrengthDescription('Ausdauernd')).toBe('Erhöhte Ausdauer im Kampf und auf Reisen');

    // 4. Weaknesses (Schwächen)
    saveOverride('weaknesses', 'Aberglaube', 'Sieht überall böse Vorzeichen und Flüche');
    expect(getWeaknessDescription('Aberglaube')).toBe('Sieht überall böse Vorzeichen und Flüche');

    // 5. Resources (Ressourcen)
    saveOverride('resources', 'Kontakte', 'Netzwerk aus Informanten in ganz Lorakis');
    expect(getResourceDescription('Kontakte')).toBe('Netzwerk aus Informanten in ganz Lorakis');

    // Check count
    const counts = getOverridesCount();
    expect(counts.total).toBe(5);
    expect(counts.spells).toBe(1);
    expect(counts.masteries).toBe(1);
    expect(counts.strengths).toBe(1);
    expect(counts.weaknesses).toBe(1);
    expect(counts.resources).toBe(1);

    // Reset single override
    resetOverride('spells', 'Flammenstrahl');
    expect(getSpellDescription('Flammenstrahl')).not.toBe(
      'Benutzerdefinierte Flammen-Beschreibung',
    );

    // Reset all overrides
    resetAllOverrides();
    expect(getOverridesCount().total).toBe(0);
    expect(getStrengthDescription('Ausdauernd')).not.toBe(
      'Erhöhte Ausdauer im Kampf und auf Reisen',
    );
  });
});
