import { SPELLS_DB, type Spell } from '../data/spells';
import {
  MASTERIES_DB,
  GENERAL_COMBAT_MASTERIES,
  GENERAL_MAGIC_MASTERIES,
  type MasteryEntry,
} from '../data/masteries';
import { STRENGTHS_DATA } from '../data/strengths';
import { WEAKNESSES_DATA, WEAKNESS_DESCRIPTIONS, WEAKNESS_PAGES } from '../data/weaknesses';
import { PREDEFINED_RESOURCES, RESOURCE_DESCRIPTIONS } from '../data/resources';
import { LANGUAGES_DATA } from '../data/languages';
import type { CharacterState, Mastery, ItemEntry, AdvancementLogEntry } from '../types';
import { generateId } from './id';
import { ALL_SKILLS } from '../data/rules';
import {
  type RulebookModulePackage,
  type RulebookSpell,
  type RulebookMastery,
  type RulebookStrength,
  type RulebookWeakness,
  type RulebookResourceItem,
  type ModuleValidationResult,
  validateRulebookPackage,
} from '../types/rulebookSchema';
import { buchModule } from '../regelwerk/bruecke';

export type StrengthEntry = (typeof STRENGTHS_DATA)[number];
export type ResourceEntry = (typeof PREDEFINED_RESOURCES)[number];

export interface GameModule {
  id: string;
  name: string;
  shortName: string;
  version: string;
  description: string;
  isDefault: boolean;
  isActive: boolean;
  canRemove: boolean;
  author?: string;
  itemCounts?: {
    spells: number;
    masteries: number;
    strengths: number;
    weaknesses: number;
    resources: number;
  };
}

export type ResourceCategory = 'spells' | 'masteries' | 'strengths' | 'weaknesses' | 'resources';

export interface ResourceOverride {
  id: string; // e.g. "spell:Flammenstrahl" or "mastery:Handgemenge:Block (S1)"
  type: ResourceCategory;
  name: string;
  secondaryKey?: string; // e.g. schoolName or skillName
  description: string;
  updatedAt: string;
}

const MODULES_STORAGE_KEY = 'splittermond_game_modules_v1';
const PACKAGES_STORAGE_KEY = 'splittermond_custom_packages_v1';
const OVERRIDES_STORAGE_KEY = 'splittermond_resource_overrides_v1';

// ---------------------------------------------------------------------------
// Built-in Expansion Modules with authentic sample content
// ---------------------------------------------------------------------------

export const BUILTIN_MSK_PACKAGE: RulebookModulePackage = {
  format: 'splittermond-module-v1',
  id: 'msk',
  name: 'Mondstahlklingen',
  shortName: 'MSK',
  version: '1.1',
  system: 'splittermond',
  description: 'Ausrüstung, Kampfstile und fortgeschrittene Waffenmeisterschaften.',
  author: 'Uhrwerk Verlag / Demo',
  isDefault: false,
  isActive: false,
  canRemove: false,
  createdAt: '2026-01-01T00:00:00Z',
  itemCounts: {
    spells: 0,
    masteries: 4,
    strengths: 2,
    weaknesses: 0,
    resources: 1,
  },
  resources: {
    spells: [],
    masteries: [
      {
        name: 'Meisterlicher Fechtschritt (S2)',
        skill: 'Klingenwaffen',
        level: 2,
        desc: 'Ermöglicht nach erfolgreicher Aktiver Abwehr einen sofortigen Gegenangriff mit +2 Angriffswert.',
        source: 'MSK',
        page: 44,
      },
      {
        name: 'Schwerer Stoß (S2)',
        skill: 'Stangenwaffen',
        level: 2,
        desc: 'Stößt den Gegner bei Treffer 2 Meter zurück und erzwingt Akrobatik-Probe gegen Sturz.',
        source: 'MSK',
        page: 48,
      },
      {
        name: 'Pfeilregen (S3)',
        skill: 'Schusswaffen',
        level: 3,
        desc: 'Erlaubt das gleichzeitige Verschießen zweier Pfeile auf benachbarte Ziele mit nur 1 zusätzlichen Tick.',
        source: 'MSK',
        page: 52,
      },
      {
        name: 'Klingenwirbel (S3)',
        skill: 'Klingenwaffen',
        level: 3,
        desc: 'Trifft im Nahkampf bis zu drei umstehende Widersacher mit je voller Trefferwirkung.',
        source: 'MSK',
        page: 56,
      },
    ],
    strengths: [
      {
        name: 'Waffennarr',
        cost: 1,
        max: 1,
        desc: 'Kennt alle Feinheiten von Schmiedemarken und Waffenwerten (+2 auf Handwerk: Schmieden).',
        source: 'MSK',
        page: 20,
      },
      {
        name: 'Klingengespür',
        cost: 2,
        max: 1,
        desc: 'Erhält +1 Bonus auf die Aktive Abwehr, solange eine geführte Klingenwaffe intakt ist.',
        source: 'MSK',
        page: 22,
      },
    ],
    weaknesses: [],
    gameResources: [
      {
        name: 'Mondstahl-Schmiede',
        desc: 'Zugang zu den seltenen Schmiedewerkstätten für Anfertigung erlesener Mondstahl-Klingen.',
        source: 'MSK',
        page: 30,
      },
    ],
  },
};

export const BUILTIN_GUD_PACKAGE: RulebookModulePackage = {
  format: 'splittermond-module-v1',
  id: 'gud',
  name: 'Götter & Dämonen',
  shortName: 'G&D',
  version: '1.0',
  system: 'splittermond',
  description: 'Priestermeisterschaften, Kulte und jenseitige Zaubermagie.',
  author: 'Uhrwerk Verlag / Demo',
  isDefault: false,
  isActive: false,
  canRemove: false,
  createdAt: '2026-01-01T00:00:00Z',
  itemCounts: {
    spells: 3,
    masteries: 2,
    strengths: 1,
    weaknesses: 1,
    resources: 1,
  },
  resources: {
    spells: [
      {
        name: 'Göttlicher Beistand',
        school: 'Lichtmagie',
        grade: 1,
        cost: 'K4V1',
        castTime: '2 Ticks',
        range: 'Berührung',
        duration: '10 Ticks',
        description: 'Das Ziel erhält göttlichen Schutz (+1 VTD und +1 auf alle Widerstandsproben).',
        source: 'G&D',
        page: 62,
      },
      {
        name: 'Geisterflamme',
        school: 'Todesmagie',
        grade: 2,
        cost: '8V2',
        castTime: '4 Ticks',
        range: '15 m',
        duration: 'sofort',
        description: 'Geisterhaftes Feuer fügt Untoten und Dämonen 2W6+4 heiligen Schaden zu.',
        damage: '2W6+4',
        source: 'G&D',
        page: 66,
      },
      {
        name: 'Aura der Reinheit',
        school: 'Bannmagie',
        grade: 3,
        cost: 'K12V3',
        castTime: '5 Ticks',
        range: 'Zauberer',
        duration: 'kanalisiert',
        description: 'Schwächt Flüche und dämonische Besessenheiten im Umkreis von 5 Metern um 2 Stufen ab.',
        source: 'G&D',
        page: 70,
      },
    ],
    masteries: [
      {
        name: 'Glaubensfestigkeit (S1)',
        skill: 'Entschlossenheit',
        level: 1,
        desc: 'Bonus von +2 gegen Einschüchterungsversuche durch unheilige oder finstere Kreaturen.',
        source: 'G&D',
        page: 80,
      },
      {
        name: 'Marter der Ketzerei (S2)',
        skill: 'Magiekunde',
        level: 2,
        desc: 'Erleichtert das Erkennen fremder religiöser Rituale und verbotener Kulte (+2 Probe).',
        source: 'G&D',
        page: 84,
      },
    ],
    strengths: [
      {
        name: 'Geweihter Boden',
        cost: 1,
        max: 1,
        desc: 'Kann heiligen Boden spüren und regeneriert dort Fokuspunkte um 20 % schneller.',
        source: 'G&D',
        page: 18,
      },
    ],
    weaknesses: [
      {
        name: 'Dogmatisch',
        desc: 'Muss die Gebote der eigenen Gottheit streng befolgen; Widerstandsproben bei Verstoß erschwert.',
        source: 'G&D',
        page: 25,
      },
    ],
    gameResources: [
      {
        name: 'Tempelzehnt',
        desc: 'Monatlicher Anspruch auf Zuwendungen und Unterstützung durch ein befreundetes Gotteshaus.',
        source: 'G&D',
        page: 32,
      },
    ],
  },
};

export const DEFAULT_MODULES: GameModule[] = [
  {
    id: 'grw',
    name: 'Grundregelwerk (SQLite)',
    shortName: 'GRW',
    version: '1.0',
    description: 'Offizielles Splittermond Grundregelwerk aus src/data/splittermond_grw.sqlite (vollständige Datenbank)',
    isDefault: true,
    isActive: true,
    canRemove: false,
    author: 'Uhrwerk Verlag / splittermond_grw.sqlite',
    itemCounts: {
      spells: SPELLS_DB.length,
      masteries: Object.values(MASTERIES_DB).reduce((acc, arr) => acc + arr.length, 0) + GENERAL_COMBAT_MASTERIES.length + GENERAL_MAGIC_MASTERIES.length,
      strengths: STRENGTHS_DATA.length,
      weaknesses: WEAKNESSES_DATA.length,
      resources: PREDEFINED_RESOURCES.length,
    },
  },
  {
    id: 'msk',
    name: 'Mondstahlklingen',
    shortName: 'MSK',
    version: '1.1',
    description: 'Ausrüstung, Kampfstile und fortgeschrittene Waffenmeisterschaften.',
    isDefault: false,
    isActive: false,
    canRemove: false,
    author: 'Uhrwerk Verlag / Demo',
    itemCounts: BUILTIN_MSK_PACKAGE.itemCounts,
  },
  {
    id: 'gud',
    name: 'Götter & Dämonen',
    shortName: 'G&D',
    version: '1.0',
    description: 'Priestermeisterschaften, Kulte und jenseitige Zaubermagie.',
    isDefault: false,
    isActive: false,
    canRemove: false,
    author: 'Uhrwerk Verlag / Demo',
    itemCounts: BUILTIN_GUD_PACKAGE.itemCounts,
  },
];

// Helper to notify all subscribers
function notifyResourceChanges() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('splittermond-resources-changed'));
  }
}

// ---------------------------------------------------------------------------
// Custom Rulebook Packages Storage
// ---------------------------------------------------------------------------

export function getCustomPackages(): Record<string, RulebookModulePackage> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(PACKAGES_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      return parsed;
    }
  } catch (err) {
    console.error('Failed to parse custom packages from localStorage:', err);
  }
  return {};
}

export function saveCustomPackage(pkg: RulebookModulePackage): void {
  if (typeof window === 'undefined') return;
  const current = getCustomPackages();
  current[pkg.id] = pkg;
  try {
    localStorage.setItem(PACKAGES_STORAGE_KEY, JSON.stringify(current));
  } catch (err) {
    console.error('Failed to save custom package:', err);
  }
}

export function deleteCustomPackageFromStorage(packageId: string): void {
  if (typeof window === 'undefined') return;
  const current = getCustomPackages();
  if (current[packageId]) {
    delete current[packageId];
    try {
      localStorage.setItem(PACKAGES_STORAGE_KEY, JSON.stringify(current));
    } catch (err) {
      console.error('Failed to delete custom package:', err);
    }
  }
}

// ---------------------------------------------------------------------------
// Modules Management
// ---------------------------------------------------------------------------

export function getModules(): GameModule[] {
  const customPkgs = getCustomPackages();
  let baseModules = DEFAULT_MODULES;

  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(MODULES_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          baseModules = parsed;
        }
      }
    } catch (err) {
      console.error('Failed to parse modules from localStorage:', err);
    }
  }

  // Ensure default GRW is always present and active
  const map = new Map<string, GameModule>();
  for (const def of DEFAULT_MODULES) {
    map.set(def.id, { ...def });
  }

  for (const m of baseModules) {
    if (map.has(m.id)) {
      const existing = map.get(m.id)!;
      map.set(m.id, {
        ...existing,
        isActive: m.id === 'grw' ? true : m.isActive,
      });
    } else {
      map.set(m.id, m);
    }
  }

  // Merge custom packages that might not be in modules list yet
  for (const [id, pkg] of Object.entries(customPkgs)) {
    if (!map.has(id)) {
      map.set(id, {
        id: pkg.id,
        name: pkg.name,
        shortName: pkg.shortName,
        version: pkg.version,
        description: pkg.description,
        isDefault: false,
        isActive: pkg.isActive ?? true,
        canRemove: true,
        author: pkg.author,
        itemCounts: pkg.itemCounts,
      });
    }
  }

  return Array.from(map.values());
}

export function saveModules(modules: GameModule[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(MODULES_STORAGE_KEY, JSON.stringify(modules));
    notifyResourceChanges();
  } catch (err) {
    console.error('Failed to save modules:', err);
  }
}

export function toggleModuleActive(moduleId: string): void {
  const list = getModules();
  const updated = list.map((m) => {
    if (m.id === moduleId) {
      if (m.isDefault) return m; // Grundregelwerk is always active
      return { ...m, isActive: !m.isActive };
    }
    return m;
  });
  saveModules(updated);
}

/**
 * Returns full package by ID (whether built-in or custom)
 */
export function getPackageById(packageId: string): RulebookModulePackage | undefined {
  if (packageId === 'msk') return BUILTIN_MSK_PACKAGE;
  if (packageId === 'gud') return BUILTIN_GUD_PACKAGE;
  const custom = getCustomPackages();
  return custom[packageId];
}

/**
 * Imports a Rulebook Module Package (validating against the persistent data model schema)
 */
export function importRulebookModule(rawInput: unknown): ModuleValidationResult & { module?: GameModule } {
  let parsed: unknown = rawInput;
  if (typeof rawInput === 'string') {
    try {
      parsed = JSON.parse(rawInput);
    } catch (err) {
      return {
        isValid: false,
        errors: [{ field: 'syntax', message: `Ungültiges JSON: ${err instanceof Error ? err.message : 'Syntaxfehler'}`, severity: 'error' }],
        warnings: [],
        summary: { spellsCount: 0, masteriesCount: 0, strengthsCount: 0, weaknessesCount: 0, resourcesCount: 0, overridesCount: 0 },
      };
    }
  }

  const validation = validateRulebookPackage(parsed);
  if (!validation.isValid || !validation.sanitizedPackage) {
    return validation;
  }

  const pkg = validation.sanitizedPackage;

  // Persist the package
  saveCustomPackage(pkg);

  // Register in module list
  const currentModules = getModules();
  const existingIdx = currentModules.findIndex((m) => m.id === pkg.id);
  const newModuleEntry: GameModule = {
    id: pkg.id,
    name: pkg.name,
    shortName: pkg.shortName,
    version: pkg.version,
    description: pkg.description,
    isDefault: false,
    isActive: true,
    canRemove: true,
    author: pkg.author,
    itemCounts: pkg.itemCounts,
  };

  let updatedModules: GameModule[];
  if (existingIdx >= 0) {
    updatedModules = [...currentModules];
    updatedModules[existingIdx] = newModuleEntry;
  } else {
    updatedModules = [...currentModules, newModuleEntry];
  }

  saveModules(updatedModules);

  // If the module package includes overrides, import them as well
  if (pkg.overrides && Object.keys(pkg.overrides).length > 0) {
    const overrides = getOverrides();
    for (const [key, ov] of Object.entries(pkg.overrides)) {
      overrides[key] = {
        id: key,
        type: 'spells',
        name: key,
        description: ov.description,
        updatedAt: new Date().toISOString(),
      };
    }
    localStorage.setItem(OVERRIDES_STORAGE_KEY, JSON.stringify(overrides));
  }

  notifyResourceChanges();

  return {
    ...validation,
    module: newModuleEntry,
  };
}

/**
 * Removes a custom module
 */
export function removeModule(moduleId: string): {
  success: boolean;
  message: string;
} {
  const list = getModules();
  const target = list.find((m) => m.id === moduleId);
  if (!target) {
    return { success: false, message: 'Modul nicht gefunden.' };
  }
  if (target.isDefault || !target.canRemove) {
    return {
      success: false,
      message: 'Dieses Modul ist ein System-Standardmodul und kann nicht gelöscht werden.',
    };
  }

  deleteCustomPackageFromStorage(moduleId);
  const updated = list.filter((m) => m.id !== moduleId);
  saveModules(updated);

  return {
    success: true,
    message: `Modul "${target.name}" wurde erfolgreich entfernt.`,
  };
}

export function addModuleDummy(): { success: boolean; message: string } {
  return {
    success: false,
    message:
      'Dummy-Funktion: Neue Module können als standardisiertes JSON (splittermond-module-v1) im Admin-Bereich importiert werden.',
  };
}

export function removeModuleDummy(moduleId: string): { success: boolean; message: string } {
  if (moduleId === 'grw') {
    return {
      success: false,
      message: 'Das Grundregelwerk ist das Standard-Modul und kann nicht entfernt werden.',
    };
  }
  return {
    success: false,
    message: 'Dummy-Funktion: Dieses Modul kann nicht entfernt werden.',
  };
}

export function exportModuleAsJson(moduleId: string): string | null {
  const pkg = getPackageById(moduleId);
  if (pkg) {
    return JSON.stringify(pkg, null, 2);
  }
  const mod = getModules().find((m) => m.id === moduleId);
  if (mod) {
    // Generate minimal export
    const minimal: RulebookModulePackage = {
      format: 'splittermond-module-v1',
      id: mod.id,
      name: mod.name,
      shortName: mod.shortName,
      version: mod.version,
      system: 'splittermond',
      description: mod.description,
      author: mod.author || 'Community',
      isDefault: mod.isDefault,
      isActive: mod.isActive,
      resources: { spells: [], masteries: [], strengths: [], weaknesses: [], gameResources: [] },
    };
    return JSON.stringify(minimal, null, 2);
  }
  return null;
}

// ---------------------------------------------------------------------------
// Active Module Resources Aggregator
// ---------------------------------------------------------------------------

function getActivePackages(): RulebookModulePackage[] {
  const modules = getModules();
  const activeIds = new Set(modules.filter((m) => m.isActive).map((m) => m.id));
  const result: RulebookModulePackage[] = [];

  if (activeIds.has('msk')) result.push(BUILTIN_MSK_PACKAGE);
  if (activeIds.has('gud')) result.push(BUILTIN_GUD_PACKAGE);

  const custom = getCustomPackages();
  for (const [id, pkg] of Object.entries(custom)) {
    if (activeIds.has(id)) {
      result.push(pkg);
    }
  }

  // Hochgeladene Regelpakete (Einstellungen → Regelpakete) als Module
  result.push(...buchModule());

  return result;
}

// ---------------------------------------------------------------------------
// Overrides Management
// ---------------------------------------------------------------------------

export function getOverrides(): Record<string, ResourceOverride> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(OVERRIDES_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      return parsed;
    }
  } catch (err) {
    console.error('Failed to parse overrides from localStorage:', err);
  }
  return {};
}

function makeOverrideId(type: ResourceCategory, name: string, secondaryKey?: string): string {
  const normName = name.trim().toLowerCase();
  const normSec = secondaryKey ? secondaryKey.trim().toLowerCase() : '';
  return `${type}:${normSec}:${normName}`;
}

export function getOverride(
  type: ResourceCategory,
  name: string,
  secondaryKey?: string,
): ResourceOverride | undefined {
  const overrides = getOverrides();
  const idExact = makeOverrideId(type, name, secondaryKey);
  if (overrides[idExact]) return overrides[idExact];

  const idFallback = makeOverrideId(type, name);
  return overrides[idFallback];
}

export function saveOverride(
  type: ResourceCategory,
  name: string,
  description: string,
  secondaryKey?: string,
): void {
  const overrides = getOverrides();
  const id = makeOverrideId(type, name, secondaryKey);

  overrides[id] = {
    id,
    type,
    name,
    secondaryKey,
    description,
    updatedAt: new Date().toISOString(),
  };

  try {
    localStorage.setItem(OVERRIDES_STORAGE_KEY, JSON.stringify(overrides));
    notifyResourceChanges();
  } catch (err) {
    console.error('Failed to save override:', err);
  }
}

export function resetOverride(
  type: ResourceCategory,
  name: string,
  secondaryKey?: string,
): void {
  const overrides = getOverrides();
  const idExact = makeOverrideId(type, name, secondaryKey);
  const idFallback = makeOverrideId(type, name);

  let changed = false;
  if (overrides[idExact]) {
    delete overrides[idExact];
    changed = true;
  }
  if (overrides[idFallback]) {
    delete overrides[idFallback];
    changed = true;
  }

  if (changed) {
    try {
      localStorage.setItem(OVERRIDES_STORAGE_KEY, JSON.stringify(overrides));
      notifyResourceChanges();
    } catch (err) {
      console.error('Failed to remove override:', err);
    }
  }
}

export function resetAllOverrides(): void {
  try {
    localStorage.removeItem(OVERRIDES_STORAGE_KEY);
    notifyResourceChanges();
  } catch (err) {
    console.error('Failed to reset all overrides:', err);
  }
}

export function getOverridesCount(): {
  total: number;
  spells: number;
  masteries: number;
  strengths: number;
  weaknesses: number;
  resources: number;
} {
  const overrides = getOverrides();
  const counts = {
    total: 0,
    spells: 0,
    masteries: 0,
    strengths: 0,
    weaknesses: 0,
    resources: 0,
  };

  for (const item of Object.values(overrides)) {
    counts.total++;
    if (item.type === 'spells') counts.spells++;
    else if (item.type === 'masteries') counts.masteries++;
    else if (item.type === 'strengths') counts.strengths++;
    else if (item.type === 'weaknesses') counts.weaknesses++;
    else if (item.type === 'resources') counts.resources++;
  }

  return counts;
}

// ---------------------------------------------------------------------------
// Unified Resolved Resource Lookups (Core GRW + Active Modules + Overrides)
// ---------------------------------------------------------------------------

export function getSpellDescription(spellName: string, schoolName?: string, defaultDesc = ''): string {
  const override = getOverride('spells', spellName, schoolName);
  if (override) return override.description;

  const trimmed = spellName.trim().toLowerCase();

  // 1. Search in active module packages
  const activePackages = getActivePackages();
  for (const pkg of activePackages) {
    const found = pkg.resources.spells?.find(
      (s) =>
        s.name.toLowerCase() === trimmed &&
        (!schoolName || s.school.toLowerCase() === schoolName.trim().toLowerCase()),
    );
    if (found?.description) return found.description;
  }

  // 2. Search in core GRW
  if (schoolName) {
    const found = SPELLS_DB.find(
      (s) => s.name.toLowerCase() === trimmed && s.school.toLowerCase() === schoolName.trim().toLowerCase(),
    );
    if (found?.description) return found.description;
  }
  const fallback = SPELLS_DB.find((s) => s.name.toLowerCase() === trimmed);
  return fallback?.description || defaultDesc;
}

/**
 * Returns all spells (Core GRW + all active modules) with overrides applied.
 */
export function getResolvedSpells(schoolFilter?: string): Spell[] {
  const overrides = getOverrides();
  const activePackages = getActivePackages();

  // Combine Core + Active Modules
  const baseSpells: Spell[] = [...SPELLS_DB];

  for (const pkg of activePackages) {
    if (pkg.resources.spells && pkg.resources.spells.length > 0) {
      for (const s of pkg.resources.spells) {
        baseSpells.push({
          name: s.name,
          school: s.school,
          grade: s.grade,
          cost: s.cost,
          castTime: s.castTime,
          range: s.range,
          duration: s.duration,
          target: s.target,
          description: s.description,
          damage: s.damage,
          page: s.page,
          source: s.source || pkg.shortName,
        });
      }
    }
  }

  return baseSpells
    .filter((s) => !schoolFilter || s.school === schoolFilter)
    .map((s) => {
      const ov =
        overrides[makeOverrideId('spells', s.name, s.school)] ||
        overrides[makeOverrideId('spells', s.name)];
      if (ov) {
        return { ...s, description: ov.description };
      }
      return s;
    });
}

export function canonicalSchool(schoolName?: string): string {
  if (!schoolName) return '';
  const trimmed = schoolName.trim();
  const lower = trimmed.toLowerCase();
  for (const s of [
    'Bannmagie', 'Beherrschungsmagie', 'Bewegungsmagie', 'Erkenntnismagie',
    'Felsmagie', 'Feuermagie', 'Heilungsmagie', 'Illusionsmagie',
    'Kampfmagie', 'Lichtmagie', 'Naturmagie', 'Schattenmagie',
    'Schicksalsmagie', 'Schutzmagie', 'Stärkungsmagie', 'Todesmagie',
    'Verwandlungsmagie', 'Wassermagie', 'Windmagie'
  ]) {
    if (s.toLowerCase() === lower) return s;
    if (s.toLowerCase().startsWith(lower)) return s;
  }
  if (lower.startsWith('tod')) return 'Todesmagie';
  return trimmed;
}

export function matchSchool(s1?: string, s2?: string): boolean {
  if (!s1 || !s2) return false;
  if (s1.toLowerCase() === s2.toLowerCase()) return true;
  return canonicalSchool(s1) === canonicalSchool(s2);
}

export interface SpellDetailsResult {
  found: boolean;
  name: string;
  school: string;
  grade: number;
  cost: string | number;
  castTime?: string;
  range?: string;
  duration?: string;
  target?: string;
  description: string;
  damage?: string;
  source: string;
  page?: number;
}

/**
 * Returns full details (description, source, page, stats) for a spell.
 * Checks active rulebook modules, core GRW, and custom overrides.
 * If not found in any database or module, marks source as 'unbekannt'.
 */
export function getSpellDetails(
  spellName: string,
  schoolName?: string,
  fallbackDesc = '',
): SpellDetailsResult {
  const normSpell = spellName.trim().toLowerCase();
  const canonSchool = canonicalSchool(schoolName);
  const override = getOverride('spells', spellName, schoolName);

  // 1. Search in active module packages
  const activePackages = getActivePackages();
  for (const pkg of activePackages) {
    const found = pkg.resources.spells?.find(
      (s) =>
        s.name.trim().toLowerCase() === normSpell &&
        (!schoolName || matchSchool(s.school, schoolName)),
    );
    if (found) {
      return {
        found: true,
        name: found.name,
        school: canonicalSchool(found.school) || canonSchool,
        grade: found.grade,
        cost: found.cost,
        castTime: found.castTime,
        range: found.range,
        duration: found.duration,
        target: found.target,
        description: override?.description || found.description || fallbackDesc || 'Details zum Zauber im Regelwerk.',
        damage: found.damage,
        source: found.source || pkg.shortName || 'Modul',
        page: found.page,
      };
    }
  }

  // 2. Search in core GRW
  if (schoolName) {
    const found = SPELLS_DB.find(
      (s) => s.name.trim().toLowerCase() === normSpell && matchSchool(s.school, schoolName),
    );
    if (found) {
      return {
        found: true,
        name: found.name,
        school: canonicalSchool(found.school) || canonSchool,
        grade: found.grade,
        cost: found.cost,
        castTime: found.castTime,
        range: found.range,
        duration: found.duration,
        target: found.target,
        description: override?.description || found.description || fallbackDesc || 'Details zum Zauber im Regelwerk.',
        damage: found.damage,
        source: found.source || 'GRW',
        page: found.page,
      };
    }
  }

  // 3. Fallback search across all spells in SPELLS_DB by name alone
  const fallback = SPELLS_DB.find((s) => s.name.trim().toLowerCase() === normSpell);
  if (fallback) {
    return {
      found: true,
      name: fallback.name,
      school: canonSchool || canonicalSchool(fallback.school),
      grade: fallback.grade,
      cost: fallback.cost,
      castTime: fallback.castTime,
      range: fallback.range,
      duration: fallback.duration,
      target: fallback.target,
      description: override?.description || fallback.description || fallbackDesc || 'Details zum Zauber im Regelwerk.',
      damage: fallback.damage,
      source: fallback.source || 'GRW',
      page: fallback.page,
    };
  }

  // 4. Not found in any database or loaded rulebook module
  return {
    found: false,
    name: spellName,
    school: canonSchool || 'Magie',
    grade: 0,
    cost: 'K1',
    description: override?.description || fallbackDesc || 'Unbekannter Zauber (nicht im Regelwerk gefunden).',
    source: 'unbekannt',
    page: undefined,
  };
}

export function matchSkillName(s1?: string, s2?: string): boolean {
  if (!s1 || !s2) return false;
  if (s1 === s2) return true;
  return (
    s1.replace(/\s+und\s+/g, ' & ').trim().toLowerCase() ===
    s2.replace(/\s+und\s+/g, ' & ').trim().toLowerCase()
  );
}

export function getMasteryDescription(
  skillName: string,
  masteryName: string,
  defaultDesc = '',
): string {
  const override = getOverride('masteries', masteryName, skillName);
  if (override) return override.description;

  // 1. Search in active module packages
  const activePackages = getActivePackages();
  for (const pkg of activePackages) {
    const found = pkg.resources.masteries?.find(
      (m) =>
        m.name === masteryName &&
        (!skillName || m.skill === skillName || matchSkillName(m.skill, skillName) || m.skill === 'Allgemein'),
    );
    if (found?.desc) return found.desc;
  }

  // 2. Search in core GRW
  const found = (MASTERIES_DB[skillName] ?? []).find((x) => x.name === masteryName);
  if (found?.desc) return found.desc;

  const general = GENERAL_COMBAT_MASTERIES.find((x) => x.name === masteryName);
  if (general?.desc) return general.desc;

  const magic = GENERAL_MAGIC_MASTERIES.find((x) => x.name === masteryName);
  if (magic?.desc) return magic.desc;

  return defaultDesc;
}

export interface MasteryDetailsResult {
  found: boolean;
  name: string;
  tier: number;
  desc: string;
  source: string;
  page?: number;
  skill?: string;
  manoever?: boolean;
}

/**
 * Returns full details (description, source, page, tier) for a mastery.
 * Checks active rulebook modules, core GRW, and custom overrides.
 * If not found in any database or module, marks source as 'unbekannt'.
 */
export function getMasteryDetails(
  skillName: string,
  masteryName: string,
  fallbackDesc = '',
): MasteryDetailsResult {
  const norm = masteryName.replace(/\s*\([ST]?\d+\)$/i, '').trim().toLowerCase();
  const tierMatch = masteryName.match(/\([ST]?(\d+)\)/i);
  const fallbackTier = tierMatch ? parseInt(tierMatch[1], 10) : 1;

  const override = getOverride('masteries', masteryName, skillName);

  // 1. Search in active module packages
  const activePackages = getActivePackages();
  for (const pkg of activePackages) {
    const found = pkg.resources.masteries?.find(
      (m) =>
        (m.name === masteryName || m.name.replace(/\s*\([ST]?\d+\)$/i, '').trim().toLowerCase() === norm) &&
        (!skillName || m.skill === skillName || matchSkillName(m.skill, skillName) || m.skill === 'Allgemein'),
    );
    if (found) {
      return {
        found: true,
        name: found.name,
        tier: typeof found.level === 'number' ? found.level : (Number(found.level) || fallbackTier),
        desc: override?.description || found.desc || fallbackDesc || 'Details zur Meisterschaft im Regelwerk.',
        source: found.source || pkg.shortName || 'Modul',
        page: found.page,
        skill: found.skill || skillName,
      };
    }
  }

  // 2. Search in core GRW for specified skill
  const skillList = MASTERIES_DB[skillName] ?? [];
  const foundInSkill = skillList.find(
    (x) => x.name === masteryName || x.baseName === masteryName || x.name.replace(/\s*\([ST]?\d+\)$/i, '').trim().toLowerCase() === norm
  );
  if (foundInSkill) {
    return {
      found: true,
      name: foundInSkill.name,
      tier: foundInSkill.tier ?? fallbackTier,
      desc: override?.description || foundInSkill.desc || fallbackDesc || 'Details zur Meisterschaft im Regelwerk.',
      source: foundInSkill.source || 'GRW',
      page: foundInSkill.page,
      skill: foundInSkill.skill || skillName,
      manoever: foundInSkill.manoever,
    };
  }

  // 3. Search in general combat masteries
  const generalCombat = GENERAL_COMBAT_MASTERIES.find(
    (x) => x.name === masteryName || x.baseName === masteryName || x.name.replace(/\s*\([ST]?\d+\)$/i, '').trim().toLowerCase() === norm
  );
  if (generalCombat) {
    return {
      found: true,
      name: generalCombat.name,
      tier: generalCombat.tier ?? fallbackTier,
      desc: override?.description || generalCombat.desc || fallbackDesc || 'Details zur Meisterschaft im Regelwerk.',
      source: generalCombat.source || 'GRW',
      page: generalCombat.page,
      skill: generalCombat.skill || skillName,
      manoever: generalCombat.manoever,
    };
  }

  // 4. Search in general magic masteries
  const generalMagic = GENERAL_MAGIC_MASTERIES.find(
    (x) => x.name === masteryName || x.baseName === masteryName || x.name.replace(/\s*\([ST]?\d+\)$/i, '').trim().toLowerCase() === norm
  );
  if (generalMagic) {
    return {
      found: true,
      name: generalMagic.name,
      tier: generalMagic.tier ?? fallbackTier,
      desc: override?.description || generalMagic.desc || fallbackDesc || 'Details zur Meisterschaft im Regelwerk.',
      source: generalMagic.source || 'GRW',
      page: generalMagic.page,
      skill: generalMagic.skill || skillName,
    };
  }

  // 5. Fallback across all skills in MASTERIES_DB
  for (const [sKey, list] of Object.entries(MASTERIES_DB)) {
    const f = list.find(
      (x) => x.name === masteryName || x.baseName === masteryName || x.name.replace(/\s*\([ST]?\d+\)$/i, '').trim().toLowerCase() === norm
    );
    if (f) {
      return {
        found: true,
        name: f.name,
        tier: f.tier ?? fallbackTier,
        desc: override?.description || f.desc || fallbackDesc || 'Details zur Meisterschaft im Regelwerk.',
        source: f.source || 'GRW',
        page: f.page,
        skill: f.skill || sKey,
        manoever: f.manoever,
      };
    }
  }

  // 6. Not found in any database or loaded rulebook module
  return {
    found: false,
    name: masteryName,
    tier: fallbackTier,
    desc: override?.description || fallbackDesc || 'Unbekannte Meisterschaft (nicht im Regelwerk gefunden).',
    source: 'unbekannt',
    page: undefined,
    skill: skillName,
  };
}

/**
 * Returns all masteries (Core GRW + all active modules) with overrides applied.
 */
export function getResolvedMasteries(skillName?: string): MasteryEntry[] {
  const overrides = getOverrides();
  const activePackages = getActivePackages();
  const map = new Map<string, MasteryEntry>();

  // Add core GRW masteries
  if (skillName) {
    for (const item of MASTERIES_DB[skillName] ?? []) {
      map.set(item.name, item);
    }
  } else {
    for (const arr of Object.values(MASTERIES_DB)) {
      for (const item of arr) {
        map.set(item.name, item);
      }
    }
    for (const item of GENERAL_COMBAT_MASTERIES) {
      map.set(item.name, item);
    }
    for (const item of GENERAL_MAGIC_MASTERIES) {
      map.set(item.name, item);
    }
  }

  // Add active module masteries
  for (const pkg of activePackages) {
    if (pkg.resources.masteries) {
      for (const m of pkg.resources.masteries) {
        if (!skillName || m.skill === skillName || matchSkillName(m.skill, skillName) || (skillName && m.skill === 'Allgemein')) {
          const extra = m as RulebookMastery & Partial<MasteryEntry> & { regelId?: string };
          map.set(m.name, {
            name: m.name,
            desc: m.desc,
            page: m.page,
            source: m.source || pkg.shortName,
            ...(extra.tier !== undefined ? { tier: extra.tier, baseName: extra.baseName, skill: extra.skill, manoever: extra.manoever, prerequisiteText: extra.prerequisiteText ?? null } : {}),
            ...(extra.regelId ? { id: extra.regelId } : {}),
          });
        }
      }
    }
  }

  return Array.from(map.values()).map((m) => {
    const ov =
      (skillName ? overrides[makeOverrideId('masteries', m.name, skillName)] : undefined) ||
      overrides[makeOverrideId('masteries', m.name)];
    if (ov) {
      return { ...m, desc: ov.description };
    }
    return m;
  });
}

export function getStrengthDescription(name: string, defaultDesc = ''): string {
  const override = getOverride('strengths', name);
  if (override) return override.description;

  const activePackages = getActivePackages();
  for (const pkg of activePackages) {
    const found = pkg.resources.strengths?.find((s) => s.name === name);
    if (found?.desc) return found.desc;
  }

  const found = STRENGTHS_DATA.find((s) => s.name === name);
  return found?.desc || defaultDesc;
}

/**
 * Returns full details (description, source, page) for a strength.
 */
export function getStrengthDetails(
  name: string,
  fallbackDesc = '',
): { found: boolean; desc: string; source: string; page?: number; cost?: number } {
  const override = getOverride('strengths', name);
  const activePackages = getActivePackages();
  for (const pkg of activePackages) {
    const found = pkg.resources.strengths?.find((s) => s.name === name);
    if (found) {
      return {
        found: true,
        desc: override?.description || found.desc || fallbackDesc || 'Details im Regelwerk.',
        source: found.source || pkg.shortName || 'Modul',
        page: found.page,
        cost: found.cost ?? 1,
      };
    }
  }

  const found = STRENGTHS_DATA.find((s) => s.name === name);
  if (found) {
    return {
      found: true,
      desc: override?.description || found.desc || fallbackDesc || 'Details im Regelwerk.',
      source: found.source || 'GRW',
      page: found.page,
      cost: found.cost ?? 1,
    };
  }

  return {
    found: false,
    desc: override?.description || fallbackDesc || 'Unbekannte Stärke (nicht im Regelwerk gefunden).',
    source: 'unbekannt',
    page: undefined,
    cost: 1,
  };
}

/**
 * Returns all strengths (Core GRW + active modules) with overrides applied.
 */
export function getResolvedStrengths(): StrengthEntry[] {
  const overrides = getOverrides();
  const activePackages = getActivePackages();
  const list: StrengthEntry[] = [...STRENGTHS_DATA];

  for (const pkg of activePackages) {
    if (pkg.resources.strengths) {
      for (const s of pkg.resources.strengths) {
        list.push({
          name: s.name,
          cost: s.cost ?? 1,
          max: s.max ?? 1,
          multi: s.multi ?? false,
          onlyCreation: s.onlyCreation ?? false,
          desc: s.desc,
          page: s.page ?? 0,
          source: s.source || pkg.shortName,
        });
      }
    }
  }

  return list.map((s) => {
    const ov = overrides[makeOverrideId('strengths', s.name)];
    if (ov) {
      return { ...s, desc: ov.description };
    }
    return s;
  });
}

export function getWeaknessDescription(name: string, defaultDesc = ''): string {
  const override = getOverride('weaknesses', name);
  if (override) return override.description;

  const activePackages = getActivePackages();
  for (const pkg of activePackages) {
    const found = pkg.resources.weaknesses?.find((w) => w.name === name);
    if (found?.desc) return found.desc;
  }

  return WEAKNESS_DESCRIPTIONS[name] || defaultDesc;
}

/**
 * Returns full details (description, source, page) for a weakness.
 */
export function getWeaknessDetails(
  name: string,
  fallbackDesc = '',
): { found: boolean; desc: string; source: string; page?: number } {
  const override = getOverride('weaknesses', name);
  const activePackages = getActivePackages();
  for (const pkg of activePackages) {
    const found = pkg.resources.weaknesses?.find((w) => w.name === name);
    if (found) {
      return {
        found: true,
        desc: override?.description || found.desc || fallbackDesc || 'Details im Regelwerk.',
        source: found.source || pkg.shortName || 'Modul',
        page: found.page ?? WEAKNESS_PAGES[name] ?? 84,
      };
    }
  }

  if (WEAKNESS_DESCRIPTIONS[name]) {
    return {
      found: true,
      desc: override?.description || WEAKNESS_DESCRIPTIONS[name] || fallbackDesc || 'Details im Regelwerk.',
      source: 'GRW',
      page: WEAKNESS_PAGES[name] ?? 84,
    };
  }

  return {
    found: false,
    desc: override?.description || fallbackDesc || 'Unbekannte Schwäche (nicht im Regelwerk gefunden).',
    source: 'unbekannt',
    page: undefined,
  };
}

/**
 * Returns full details (description, source, page) for a language.
 */
export function getLanguageDetails(
  name: string,
  fallbackDesc = '',
): { found: boolean; desc: string; source: string; page?: number } {
  const found = LANGUAGES_DATA.find((l) => l.name.toLowerCase() === name.toLowerCase());
  if (found) {
    const familyInfo = found.family ? `Sprachfamilie: ${found.family}.` : '';
    const desc = fallbackDesc || (familyInfo ? `${familyInfo} Details im Regelwerk.` : 'Sprache in Lorakis.');
    return {
      found: true,
      desc,
      source: found.source || 'GRW',
      page: found.page ?? 314,
    };
  }

  return {
    found: false,
    desc: fallbackDesc || 'Unbekannte Sprache.',
    source: 'unbekannt',
    page: undefined,
  };
}

/**
 * Returns all weaknesses (Core GRW + active modules) with overrides applied.
 */
export function getResolvedWeaknesses(): {
  list: string[];
  descriptions: Record<string, string>;
} {
  const overrides = getOverrides();
  const activePackages = getActivePackages();
  const list = [...WEAKNESSES_DATA];
  const descMap: Record<string, string> = { ...WEAKNESS_DESCRIPTIONS };

  for (const pkg of activePackages) {
    if (pkg.resources.weaknesses) {
      for (const w of pkg.resources.weaknesses) {
        if (!list.includes(w.name)) {
          list.push(w.name);
        }
        descMap[w.name] = w.desc;
      }
    }
  }

  for (const name of list) {
    const ov = overrides[makeOverrideId('weaknesses', name)];
    if (ov) {
      descMap[name] = ov.description;
    }
  }

  return {
    list,
    descriptions: descMap,
  };
}

export function getResourceDescription(name: string, defaultDesc = ''): string {
  const override = getOverride('resources', name);
  if (override) return override.description;

  const activePackages = getActivePackages();
  for (const pkg of activePackages) {
    const found = pkg.resources.gameResources?.find((r) => r.name === name);
    if (found?.desc) return found.desc;
  }

  return RESOURCE_DESCRIPTIONS[name] || defaultDesc;
}

/**
 * Returns full details (description, source, page) for a resource.
 */
export function getResourceDetails(
  name: string,
  fallbackDesc = '',
): { found: boolean; desc: string; source: string; page?: number } {
  const override = getOverride('resources', name);
  const activePackages = getActivePackages();
  for (const pkg of activePackages) {
    const found = pkg.resources.gameResources?.find((r) => r.name === name);
    if (found) {
      return {
        found: true,
        desc: override?.description || found.desc || fallbackDesc || 'Details im Regelwerk.',
        source: found.source || pkg.shortName || 'Modul',
        page: found.page,
      };
    }
  }

  const found = PREDEFINED_RESOURCES.find((r) => r.name === name);
  if (found || RESOURCE_DESCRIPTIONS[name]) {
    return {
      found: true,
      desc: override?.description || found?.desc || RESOURCE_DESCRIPTIONS[name] || fallbackDesc || 'Details im Regelwerk.',
      source: found?.source || 'GRW',
      page: found?.page ?? 75,
    };
  }

  return {
    found: false,
    desc: override?.description || fallbackDesc || 'Unbekannte Ressource (nicht im Regelwerk gefunden).',
    source: 'unbekannt',
    page: undefined,
  };
}

/**
 * Returns all resources (Core GRW + active modules) with overrides applied.
 */
export function getResolvedResources(): {
  list: ResourceEntry[];
  descriptions: Record<string, string>;
} {
  const overrides = getOverrides();
  const activePackages = getActivePackages();
  const list: ResourceEntry[] = [...PREDEFINED_RESOURCES];
  const descMap: Record<string, string> = { ...RESOURCE_DESCRIPTIONS };

  for (const pkg of activePackages) {
    if (pkg.resources.gameResources) {
      for (const r of pkg.resources.gameResources) {
        list.push({
          name: r.name,
          desc: r.desc,
          page: r.page ?? 0,
          source: r.source || pkg.shortName,
        });
        descMap[r.name] = r.desc;
      }
    }
  }

  const resolvedList = list.map((r) => {
    const ov = overrides[makeOverrideId('resources', r.name)];
    const resolvedDesc = ov ? ov.description : (descMap[r.name] || r.desc);
    descMap[r.name] = resolvedDesc;
    return {
      ...r,
      desc: resolvedDesc,
    };
  });

  return {
    list: resolvedList,
    descriptions: descMap,
  };
}

/**
 * Takes any partial or full CharacterState (from presets, imports, or storage)
 * and references all game resources against SQLite & all loaded rulebook sources.
 *
 * - Masteries: resolved by canonical name, authentic description, authentic source, page, tier, and skill.
 * - Spells: resolved by canonical name and school, authentic description, focus cost, cast time, page, and source.
 * - Strengths, Weaknesses, Resources, Languages: resolved against active modules & GRW datasets.
 * - Missing resources in DB: assigned source 'unbekannt'.
 * - Advancement log: seeds initial entries so they display in the advancement (Steigerung) protocol tabs.
 */
export function referenceCharacterResources(rawState: Partial<CharacterState>): CharacterState {
  const state = { ...rawState };

  // 1. Reference Masteries
  const resolvedMasteries: Record<string, Mastery[]> = {};
  if (state.masteries && typeof state.masteries === 'object') {
    for (const [skill, list] of Object.entries(state.masteries)) {
      if (!Array.isArray(list)) continue;
      resolvedMasteries[skill] = list.map((m) => {
        const details = getMasteryDetails(skill, m.name, m.desc);
        return {
          id: m.id || generateId(),
          name: details.name,
          tier: details.tier,
          cost: m.cost ?? (m.isFree || m.isCreationBonus ? 0 : details.tier * 5),
          isFree: m.isFree ?? false,
          isCreationBonus: m.isCreationBonus ?? false,
          source: details.source,
          page: details.page,
          desc: details.desc,
          skill: skill,
          userNote: m.userNote,
        };
      });
    }
  }
  state.masteries = resolvedMasteries;

  // 2. Reference Spells
  if (Array.isArray(state.spellsList)) {
    state.spellsList = state.spellsList.map((s) => {
      const details = getSpellDetails(s.name, s.school, s.description);
      return {
        name: details.name,
        school: details.school,
        grade: details.grade,
        cost: details.cost,
        castTime: details.castTime,
        range: details.range,
        duration: details.duration,
        target: details.target,
        description: details.description,
        damage: details.damage,
        source: details.source,
        page: details.page,
        isFree: s.isFree ?? false,
        xpCost: s.xpCost,
        sourceMode: s.sourceMode || 'creation',
      };
    });
  } else {
    state.spellsList = [];
  }

  // 3. Reference Strengths
  if (Array.isArray(state.strengthsList)) {
    state.strengthsList = state.strengthsList.map((st) => {
      const details = getStrengthDetails(st.name, st.desc);
      return {
        ...st,
        desc: details.desc,
        sourceRef: details.source,
        page: details.page,
        pointCost: st.pointCost ?? details.cost ?? 1,
      };
    });
  } else {
    state.strengthsList = [];
  }

  // 4. Reference Weaknesses
  if (Array.isArray(state.weaknessesList)) {
    state.weaknessesList = state.weaknessesList.map((w) => {
      const details = getWeaknessDetails(w.name, w.desc);
      return {
        ...w,
        desc: details.desc,
        sourceRef: details.source,
        page: details.page,
      };
    });
  } else {
    state.weaknessesList = [];
  }

  // 5. Reference Resources
  if (Array.isArray(state.resourcesList)) {
    state.resourcesList = state.resourcesList.map((r) => {
      const details = getResourceDetails(r.name, r.desc);
      return {
        ...r,
        desc: details.desc,
        sourceRef: details.source,
        page: details.page,
      };
    });
  } else {
    state.resourcesList = [];
  }

  // 6. Reference Languages
  if (Array.isArray(state.languagesList)) {
    state.languagesList = state.languagesList.map((l) => {
      const details = getLanguageDetails(l.name, l.desc);
      return {
        ...l,
        desc: details.desc,
        sourceRef: details.source,
        page: details.page,
      };
    });
  } else {
    state.languagesList = [];
  }

  // 7. Ensure Advancement Log contains entries for starting values so they show in Steigerungsprotokoll
  const existingLog = Array.isArray(state.advancementLog) ? [...state.advancementLog] : [];
  const hasMasteryLog = existingLog.some((e) => e.category === 'mastery');
  const hasSpellLog = existingLog.some((e) => e.category === 'spell');

  // If no advancement logs exist or masteries/spells are not recorded, generate initial creation log entries
  if (existingLog.length === 0 || (!hasMasteryLog && Object.keys(resolvedMasteries).length > 0) || (!hasSpellLog && state.spellsList.length > 0)) {
    const creationEntries: AdvancementLogEntry[] = [];
    const timestamp = 'Erschaffung';

    // Seed masteries
    for (const [skill, list] of Object.entries(resolvedMasteries)) {
      for (const m of list) {
        const alreadyLogged = existingLog.some((e) => e.category === 'mastery' && e.title.includes(m.name));
        if (!alreadyLogged) {
          creationEntries.push({
            id: generateId(),
            timestamp,
            category: 'mastery',
            title: `Meisterschaft: ${m.name}`,
            detail: `Fertigkeit: ${skill} (Schwelle S${m.tier}) · Quelle: ${m.source}${m.page ? ', S. ' + m.page : ''}`,
            xpDelta: m.cost > 0 ? -m.cost : 0,
          });
        }
      }
    }

    // Seed spells
    for (const s of state.spellsList) {
      const alreadyLogged = existingLog.some((e) => e.category === 'spell' && e.title.includes(s.name));
      if (!alreadyLogged) {
        creationEntries.push({
          id: generateId(),
          timestamp,
          category: 'spell',
          title: `Zauber: ${s.name}`,
          detail: `Schule: ${s.school}, Grad ${s.grade} · Fokus: ${s.cost} · Quelle: ${s.source}${s.page ? ', S. ' + s.page : ''}`,
          xpDelta: 0,
        });
      }
    }

    // Seed strengths
    for (const st of state.strengthsList) {
      const alreadyLogged = existingLog.some((e) => e.category === 'strength' && e.title.includes(st.name));
      if (!alreadyLogged) {
        creationEntries.push({
          id: generateId(),
          timestamp,
          category: 'strength',
          title: `Stärke: ${st.name}`,
          detail: `Punkte: ${st.pointCost ?? 1} · Quelle: ${st.sourceRef || 'GRW'}${st.page ? ', S. ' + st.page : ''}`,
          xpDelta: 0,
        });
      }
    }

    // Seed resources
    for (const r of state.resourcesList) {
      const alreadyLogged = existingLog.some((e) => e.category === 'resource' && e.title.includes(r.name));
      if (!alreadyLogged) {
        creationEntries.push({
          id: generateId(),
          timestamp,
          category: 'resource',
          title: `Ressource: ${r.name} (Wert ${r.level})`,
          detail: `Punkte: ${r.level} · Quelle: ${r.sourceRef || 'GRW'}${r.page ? ', S. ' + r.page : ''}`,
          xpDelta: 0,
        });
      }
    }

    // Seed XP
    if (!existingLog.some((e) => e.category === 'xp')) {
      creationEntries.push({
        id: generateId(),
        timestamp,
        category: 'xp',
        title: 'Start-Erfahrungspunkte',
        detail: `${state.xpTotal ?? 15} EP bei Erschaffung`,
        xpDelta: state.xpTotal ?? 15,
      });
    }

    state.advancementLog = [...existingLog, ...creationEntries];
  } else {
    state.advancementLog = existingLog;
  }

  return state as CharacterState;
}

// ---------------------------------------------------------------------------
// Export & Import for Global System Backups
// ---------------------------------------------------------------------------

export interface ResourceBackupPayload {
  format: 'splittermond-resources-backup';
  version: number;
  exportedAt: string;
  modules: GameModule[];
  customPackages: Record<string, RulebookModulePackage>;
  overrides: Record<string, ResourceOverride>;
  summary: {
    totalOverrides: number;
    spells: number;
    masteries: number;
    strengths: number;
    weaknesses: number;
    resources: number;
  };
}

export function exportOverridesAsJson(): string {
  const overrides = getOverrides();
  const modules = getModules();
  const customPackages = getCustomPackages();
  const counts = getOverridesCount();

  const payload: ResourceBackupPayload = {
    format: 'splittermond-resources-backup',
    version: 2,
    exportedAt: new Date().toISOString(),
    modules,
    customPackages,
    overrides,
    summary: {
      totalOverrides: counts.total,
      spells: counts.spells,
      masteries: counts.masteries,
      strengths: counts.strengths,
      weaknesses: counts.weaknesses,
      resources: counts.resources,
    },
  };

  return JSON.stringify(payload, null, 2);
}

export function importOverridesFromJson(rawJson: string): {
  success: boolean;
  count: number;
  message: string;
} {
  try {
    const data = JSON.parse(rawJson);
    if (!data || typeof data !== 'object') {
      return { success: false, count: 0, message: 'Ungültiges JSON-Format.' };
    }

    // Check if user is importing a full rulebook module package!
    if (data.format === 'splittermond-module-v1') {
      const result = importRulebookModule(data);
      if (result.isValid) {
        const totalItems =
          result.summary.spellsCount +
          result.summary.masteriesCount +
          result.summary.strengthsCount +
          result.summary.weaknessesCount +
          result.summary.resourcesCount;
        return {
          success: true,
          count: totalItems,
          message: `Regelwerks-Modul "${result.sanitizedPackage?.name}" mit ${totalItems} Ressourcen erfolgreich importiert!`,
        };
      } else {
        const firstErr = result.errors[0]?.message || 'Ungültiges Modul-Format';
        return { success: false, count: 0, message: `Modul-Import fehlgeschlagen: ${firstErr}` };
      }
    }

    let importedOverrides: Record<string, ResourceOverride> = {};
    if (data.format === 'splittermond-resources-backup' && data.overrides) {
      importedOverrides = data.overrides;
    } else if (typeof data.overrides === 'object') {
      importedOverrides = data.overrides;
    } else if (typeof data === 'object' && !Array.isArray(data)) {
      importedOverrides = data as Record<string, ResourceOverride>;
    }

    const validEntries: Record<string, ResourceOverride> = {};
    let count = 0;

    for (const [key, item] of Object.entries(importedOverrides)) {
      if (item && typeof item === 'object' && typeof item.description === 'string') {
        validEntries[key] = {
          id: item.id || key,
          type: item.type || 'spells',
          name: item.name || key,
          secondaryKey: item.secondaryKey,
          description: item.description,
          updatedAt: item.updatedAt || new Date().toISOString(),
        };
        count++;
      }
    }

    // Merge with current overrides
    const current = getOverrides();
    const merged = { ...current, ...validEntries };
    localStorage.setItem(OVERRIDES_STORAGE_KEY, JSON.stringify(merged));

    // Also import custom packages if present in backup
    if (data.customPackages && typeof data.customPackages === 'object') {
      const currentPkgs = getCustomPackages();
      for (const [id, pkg] of Object.entries(data.customPackages)) {
        if (pkg && typeof pkg === 'object') {
          currentPkgs[id] = pkg as RulebookModulePackage;
        }
      }
      localStorage.setItem(PACKAGES_STORAGE_KEY, JSON.stringify(currentPkgs));
    }

    // Merge module states
    if (Array.isArray(data.modules) && data.modules.length > 0) {
      const currentModules = getModules();
      const mergedModules = [...currentModules];
      for (const m of data.modules) {
        if (!mergedModules.some((existing) => existing.id === m.id)) {
          mergedModules.push(m);
        }
      }
      saveModules(mergedModules);
    }

    notifyResourceChanges();

    return {
      success: true,
      count,
      message: `${count} angepasste Ressourcen erfolgreich importiert und dauerhaft gespeichert.`,
    };
  } catch (err) {
    return {
      success: false,
      count: 0,
      message: `Import fehlgeschlagen: ${err instanceof Error ? err.message : 'Ungültige Datei'}`,
    };
  }
}
