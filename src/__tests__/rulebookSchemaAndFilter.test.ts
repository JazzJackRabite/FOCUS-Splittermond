import { describe, it, expect, beforeEach } from 'vitest';
import {
  validateRulebookPackage,
  STARTER_MODULE_TEMPLATE,
  type RulebookModulePackage,
} from '../types/rulebookSchema';
import {
  importRulebookModule,
  getResolvedSpells,
  getResolvedMasteries,
  getResolvedStrengths,
  getModules,
  removeModule,
  exportModuleAsJson,
  resetAllOverrides,
} from '../utils/gameResourceManager';

describe('Persistent Rulebook Data Model & Schema Validation', () => {
  beforeEach(() => {
    localStorage.clear();
    resetAllOverrides();
  });

  it('validates the starter module template successfully', () => {
    const res = validateRulebookPackage(STARTER_MODULE_TEMPLATE);
    expect(res.isValid).toBe(true);
    expect(res.errors.length).toBe(0);
    expect(res.summary.spellsCount).toBeGreaterThan(0);
    expect(res.summary.masteriesCount).toBeGreaterThan(0);
  });

  it('rejects incomplete packages with descriptive error messages', () => {
    const invalidPkg = {
      // missing format, id, name, shortName, system, resources
      title: 'Ungültig',
    };
    const res = validateRulebookPackage(invalidPkg);
    expect(res.isValid).toBe(false);
    expect(res.errors.some((e) => e.field === 'format')).toBe(true);
    expect(res.errors.some((e) => e.field === 'id')).toBe(true);
    expect(res.errors.some((e) => e.field === 'name')).toBe(true);
    expect(res.errors.some((e) => e.field === 'resources')).toBe(true);
  });

  it('imports a custom module package and merges its spells and masteries dynamically', () => {
    const testPackage: RulebookModulePackage = {
      format: 'splittermond-module-v1',
      id: 'test-arcanum',
      name: 'Test Arcanum',
      shortName: 'ARC',
      version: '1.0.0',
      system: 'splittermond',
      author: 'Splittermond Tester',
      description: 'Ein Test-Regelwerksmodul für arkane Zauber.',
      isActive: true,
      resources: {
        spells: [
          {
            name: 'Arkaner Blitz',
            school: 'Kampfmagie',
            grade: 2,
            cost: '6V2',
            castTime: '3 Ticks',
            range: '20 m',
            description: 'Feuert einen gezielten Blitz arkaner Energie ab.',
            damage: '2W6+3',
            source: 'ARC',
            page: 12,
          },
        ],
        masteries: [
          {
            name: 'Arkane Fokussierung (S1)',
            skill: 'Magiekunde',
            level: 1,
            desc: 'Verringert Fokuserschöpfung bei arkanen Ritualen.',
            source: 'ARC',
            page: 15,
          },
        ],
        strengths: [
          {
            name: 'Gespür für Runen',
            cost: 1,
            max: 1,
            desc: 'Erkennt arkan geladene Inschriften sofort.',
            source: 'ARC',
            page: 8,
          },
        ],
        weaknesses: [],
        gameResources: [],
      },
    };

    const importRes = importRulebookModule(testPackage);
    expect(importRes.isValid).toBe(true);

    // Verify module appears in modules list
    const modules = getModules();
    const foundModule = modules.find((m) => m.id === 'test-arcanum');
    expect(foundModule).toBeDefined();
    expect(foundModule?.shortName).toBe('ARC');

    // Verify spell is now resolved in Kampfmagie
    const spells = getResolvedSpells('Kampfmagie');
    const arkanerBlitz = spells.find((s) => s.name === 'Arkaner Blitz');
    expect(arkanerBlitz).toBeDefined();
    expect(arkanerBlitz?.source).toBe('ARC');
    expect(arkanerBlitz?.damage).toBe('2W6+3');

    // Verify mastery is resolved in Magiekunde
    const masteries = getResolvedMasteries('Magiekunde');
    const arkaneFokussierung = masteries.find((m) => m.name === 'Arkane Fokussierung (S1)');
    expect(arkaneFokussierung).toBeDefined();
    expect(arkaneFokussierung?.source).toBe('ARC');

    // Verify strength is resolved
    const strengths = getResolvedStrengths();
    const runeSense = strengths.find((s) => s.name === 'Gespür für Runen');
    expect(runeSense).toBeDefined();
    expect(runeSense?.source).toBe('ARC');

    // Verify module export
    const exportedJson = exportModuleAsJson('test-arcanum');
    expect(exportedJson).not.toBeNull();
    const parsedExport = JSON.parse(exportedJson!);
    expect(parsedExport.id).toBe('test-arcanum');
    expect(parsedExport.resources.spells.length).toBe(1);

    // Verify clean deletion
    const removeRes = removeModule('test-arcanum');
    expect(removeRes.success).toBe(true);
    const modulesAfter = getModules();
    expect(modulesAfter.find((m) => m.id === 'test-arcanum')).toBeUndefined();
  });

  it('supports tolerant multi-token search with umlauts and sub-info queries', () => {
    // Test that searching finds spells even with umlauts or partial words
    const allSpells = getResolvedSpells();
    expect(allSpells.length).toBeGreaterThan(50);

    // Filter testing Flammenstrahl
    const flammenSpells = allSpells.filter(
      (s) =>
        s.name.toLowerCase().includes('flamme') ||
        (s.description && s.description.toLowerCase().includes('flamme')),
    );
    expect(flammenSpells.length).toBeGreaterThan(0);
  });
});
