/**
 * Splittermond Rulebook & Game Resource Data Model Specification (v1.0)
 *
 * This file defines the canonical persistent schema for game rules,
 * modular rulebook extensions, and external JSON import/export packages.
 */

export interface RulebookSpell {
  id?: string;
  name: string;
  school: string;
  grade: number; // 0 to 5
  cost: string; // e.g. "K4V1", "12V3", "K8", "1"
  castTime?: string; // e.g. "3 Ticks", "10 Minuten"
  range?: string; // e.g. "Berührung", "15 m", "Zauberer"
  duration?: string; // e.g. "sofort", "kanalisiert", "1 Stunde"
  target?: string; // e.g. "1 Wesen", "Zone (5m)"
  description: string;
  damage?: string; // e.g. "2W6", "1W10+2"
  source?: string; // e.g. "GRW", "MSK", "Eigen"
  page?: number;
  tags?: string[];
}

export interface RulebookMastery {
  id?: string;
  name: string; // e.g. "Wirbelwind (S2)"
  skill: string; // e.g. "Klingenwaffen" or "Allgemein"
  level?: number | string; // 1, 2, 3, 4 or "S1", "S2", "S3", "S4"
  desc: string;
  page?: number;
  source?: string;
  tags?: string[];
}

export interface RulebookStrength {
  id?: string;
  name: string;
  cost: number; // point cost, usually 1 to 4
  max?: number; // max stacks, default 1
  multi?: boolean; // selectable multiple times?
  onlyCreation?: boolean; // only available during character creation
  desc: string;
  page?: number;
  source?: string;
}

export interface RulebookWeakness {
  id?: string;
  name: string;
  desc: string;
  page?: number;
  source?: string;
}

export interface RulebookResourceItem {
  id?: string;
  name: string;
  desc: string;
  page?: number;
  source?: string;
}

export interface RulebookResourcesContainer {
  spells?: RulebookSpell[];
  masteries?: RulebookMastery[];
  strengths?: RulebookStrength[];
  weaknesses?: RulebookWeakness[];
  gameResources?: RulebookResourceItem[];
}

export interface RulebookModulePackage {
  format: 'splittermond-module-v1';
  id: string; // Unique alphanumeric slug (e.g. "mondstahlklingen-kampfstile")
  name: string; // Full human-readable name (e.g. "Mondstahlklingen – Erweiterung")
  shortName: string; // Short code (e.g. "MSK")
  version: string; // Semver format (e.g. "1.0.0")
  system: 'splittermond';
  systemVersion?: string; // Compatible system version (e.g. ">=1.0")
  description: string;
  author: string;
  website?: string;
  license?: string;
  isDefault?: boolean;
  isActive?: boolean;
  canRemove?: boolean;
  createdAt?: string;
  updatedAt?: string;
  itemCounts?: {
    spells: number;
    masteries: number;
    strengths: number;
    weaknesses: number;
    resources: number;
  };
  resources: RulebookResourcesContainer;
  overrides?: Record<
    string,
    {
      description: string;
      notes?: string;
    }
  >;
}

export interface ModuleValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface ModuleValidationResult {
  isValid: boolean;
  errors: ModuleValidationError[];
  warnings: ModuleValidationError[];
  summary: {
    spellsCount: number;
    masteriesCount: number;
    strengthsCount: number;
    weaknessesCount: number;
    resourcesCount: number;
    overridesCount: number;
  };
  sanitizedPackage?: RulebookModulePackage;
}

/**
 * Validates a parsed JSON object against the Rulebook Module Specification
 */
export function validateRulebookPackage(raw: unknown): ModuleValidationResult {
  const errors: ModuleValidationError[] = [];
  const warnings: ModuleValidationError[] = [];

  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return {
      isValid: false,
      errors: [{ field: 'root', message: 'Modul muss ein gültiges JSON-Objekt sein.', severity: 'error' }],
      warnings: [],
      summary: { spellsCount: 0, masteriesCount: 0, strengthsCount: 0, weaknessesCount: 0, resourcesCount: 0, overridesCount: 0 },
    };
  }

  const obj = raw as Record<string, unknown>;

  // Format check
  if (obj.format !== 'splittermond-module-v1') {
    if (obj.format === 'splittermond-resources-backup') {
      warnings.push({
        field: 'format',
        message: 'Format "splittermond-resources-backup" erkannt. Wird in "splittermond-module-v1" konvertiert.',
        severity: 'warning',
      });
    } else {
      errors.push({
        field: 'format',
        message: 'Feld "format" muss "splittermond-module-v1" entsprechen.',
        severity: 'error',
      });
    }
  }

  // ID check
  if (!obj.id || typeof obj.id !== 'string' || !/^[a-z0-9-_]+$/i.test(obj.id)) {
    errors.push({
      field: 'id',
      message: 'Feld "id" ist erforderlich und darf nur alphanumerische Zeichen, Bindestriche und Unterstriche enthalten.',
      severity: 'error',
    });
  }

  // Name check
  if (!obj.name || typeof obj.name !== 'string' || obj.name.trim().length === 0) {
    errors.push({
      field: 'name',
      message: 'Feld "name" ist erforderlich und darf nicht leer sein.',
      severity: 'error',
    });
  }

  // ShortName check
  if (!obj.shortName || typeof obj.shortName !== 'string' || obj.shortName.trim().length === 0) {
    errors.push({
      field: 'shortName',
      message: 'Feld "shortName" (z.B. "MSK" oder "HA") ist erforderlich.',
      severity: 'error',
    });
  }

  // Version check
  if (!obj.version || typeof obj.version !== 'string') {
    warnings.push({
      field: 'version',
      message: 'Keine Versionsnummer angegeben (Standard: "1.0.0").',
      severity: 'warning',
    });
  }

  // Description check
  if (!obj.description || typeof obj.description !== 'string') {
    warnings.push({
      field: 'description',
      message: 'Keine Beschreibung angegeben.',
      severity: 'warning',
    });
  }

  // Author check
  if (!obj.author || typeof obj.author !== 'string') {
    warnings.push({
      field: 'author',
      message: 'Kein Autor angegeben (Standard: "Community").',
      severity: 'warning',
    });
  }

  // Resources root check
  if (!obj.resources || typeof obj.resources !== 'object') {
    errors.push({
      field: 'resources',
      message: '"resources"-Objekt fehlt oder ist ungültig.',
      severity: 'error',
    });
  }

  const resObj = (obj.resources as Record<string, unknown>) || {};
  const validSpells: RulebookSpell[] = [];
  const validMasteries: RulebookMastery[] = [];
  const validStrengths: RulebookStrength[] = [];
  const validWeaknesses: RulebookWeakness[] = [];
  const validResources: RulebookResourceItem[] = [];

  // Spells Validation
  if (resObj.spells) {
    if (!Array.isArray(resObj.spells)) {
      errors.push({ field: 'resources.spells', message: '"spells" muss ein Array sein.', severity: 'error' });
    } else {
      resObj.spells.forEach((s, idx) => {
        if (!s || typeof s !== 'object') {
          errors.push({ field: `resources.spells[${idx}]`, message: 'Ungültiger Zauber-Eintrag.', severity: 'error' });
          return;
        }
        const spell = s as Record<string, unknown>;
        if (!spell.name || typeof spell.name !== 'string') {
          errors.push({ field: `resources.spells[${idx}].name`, message: 'Zauber benötigt einen Namen.', severity: 'error' });
          return;
        }
        if (!spell.school || typeof spell.school !== 'string') {
          errors.push({ field: `resources.spells[${idx}].school`, message: `Zauber "${spell.name}" benötigt eine Magieschule.`, severity: 'error' });
          return;
        }
        const grade = typeof spell.grade === 'number' ? spell.grade : parseInt(String(spell.grade), 10);
        if (isNaN(grade) || grade < 0 || grade > 5) {
          errors.push({ field: `resources.spells[${idx}].grade`, message: `Zauber "${spell.name}" hat einen ungültigen Grad (0–5 erwartet).`, severity: 'error' });
          return;
        }

        validSpells.push({
          id: typeof spell.id === 'string' ? spell.id : undefined,
          name: String(spell.name).trim(),
          school: String(spell.school).trim(),
          grade,
          cost: String(spell.cost || 'K4V1'),
          castTime: typeof spell.castTime === 'string' ? spell.castTime : undefined,
          range: typeof spell.range === 'string' ? spell.range : undefined,
          duration: typeof spell.duration === 'string' ? spell.duration : undefined,
          target: typeof spell.target === 'string' ? spell.target : undefined,
          description: String(spell.description || '').trim(),
          damage: typeof spell.damage === 'string' ? spell.damage : undefined,
          source: String(spell.source || obj.shortName || 'Eigen'),
          page: typeof spell.page === 'number' ? spell.page : undefined,
        });
      });
    }
  }

  // Masteries Validation
  if (resObj.masteries) {
    if (!Array.isArray(resObj.masteries)) {
      errors.push({ field: 'resources.masteries', message: '"masteries" muss ein Array sein.', severity: 'error' });
    } else {
      resObj.masteries.forEach((m, idx) => {
        if (!m || typeof m !== 'object') {
          errors.push({ field: `resources.masteries[${idx}]`, message: 'Ungültiger Meisterschafts-Eintrag.', severity: 'error' });
          return;
        }
        const mastery = m as Record<string, unknown>;
        if (!mastery.name || typeof mastery.name !== 'string') {
          errors.push({ field: `resources.masteries[${idx}].name`, message: 'Meisterschaft benötigt einen Namen.', severity: 'error' });
          return;
        }
        if (!mastery.skill || typeof mastery.skill !== 'string') {
          errors.push({ field: `resources.masteries[${idx}].skill`, message: `Meisterschaft "${mastery.name}" benötigt eine Fertigkeit.`, severity: 'error' });
          return;
        }

        validMasteries.push({
          id: typeof mastery.id === 'string' ? mastery.id : undefined,
          name: String(mastery.name).trim(),
          skill: String(mastery.skill).trim(),
          level: mastery.level !== undefined ? (typeof mastery.level === 'number' ? mastery.level : String(mastery.level)) : undefined,
          desc: String(mastery.desc || mastery.description || '').trim(),
          page: typeof mastery.page === 'number' ? mastery.page : undefined,
          source: String(mastery.source || obj.shortName || 'Eigen'),
        });
      });
    }
  }

  // Strengths Validation
  if (resObj.strengths) {
    if (!Array.isArray(resObj.strengths)) {
      errors.push({ field: 'resources.strengths', message: '"strengths" muss ein Array sein.', severity: 'error' });
    } else {
      resObj.strengths.forEach((st, idx) => {
        if (!st || typeof st !== 'object') return;
        const s = st as Record<string, unknown>;
        if (!s.name || typeof s.name !== 'string') return;

        validStrengths.push({
          id: typeof s.id === 'string' ? s.id : undefined,
          name: String(s.name).trim(),
          cost: typeof s.cost === 'number' ? s.cost : 1,
          max: typeof s.max === 'number' ? s.max : 1,
          multi: Boolean(s.multi),
          onlyCreation: Boolean(s.onlyCreation),
          desc: String(s.desc || s.description || '').trim(),
          page: typeof s.page === 'number' ? s.page : undefined,
          source: String(s.source || obj.shortName || 'Eigen'),
        });
      });
    }
  }

  // Weaknesses Validation
  if (resObj.weaknesses) {
    if (!Array.isArray(resObj.weaknesses)) {
      errors.push({ field: 'resources.weaknesses', message: '"weaknesses" muss ein Array sein.', severity: 'error' });
    } else {
      resObj.weaknesses.forEach((w, idx) => {
        if (!w || typeof w !== 'object') return;
        const weakness = w as Record<string, unknown>;
        if (!weakness.name || typeof weakness.name !== 'string') return;

        validWeaknesses.push({
          id: typeof weakness.id === 'string' ? weakness.id : undefined,
          name: String(weakness.name).trim(),
          desc: String(weakness.desc || weakness.description || '').trim(),
          page: typeof weakness.page === 'number' ? weakness.page : undefined,
          source: String(weakness.source || obj.shortName || 'Eigen'),
        });
      });
    }
  }

  // Game Resources Validation
  const incomingGameResources = resObj.gameResources || resObj.resources;
  if (incomingGameResources && Array.isArray(incomingGameResources)) {
    incomingGameResources.forEach((r) => {
      if (!r || typeof r !== 'object') return;
      const res = r as Record<string, unknown>;
      if (!res.name || typeof res.name !== 'string') return;

      validResources.push({
        id: typeof res.id === 'string' ? res.id : undefined,
        name: String(res.name).trim(),
        desc: String(res.desc || res.description || '').trim(),
        page: typeof res.page === 'number' ? res.page : undefined,
        source: String(res.source || obj.shortName || 'Eigen'),
      });
    });
  }

  const overridesCount = obj.overrides && typeof obj.overrides === 'object' ? Object.keys(obj.overrides).length : 0;

  const totalCount =
    validSpells.length +
    validMasteries.length +
    validStrengths.length +
    validWeaknesses.length +
    validResources.length +
    overridesCount;

  if (totalCount === 0) {
    warnings.push({
      field: 'resources',
      message: 'Das Modul enthält keine Ressourcen oder Regelanpassungen.',
      severity: 'warning',
    });
  }

  const sanitizedPackage: RulebookModulePackage = {
    format: 'splittermond-module-v1',
    id: String(obj.id || 'custom-module').toLowerCase().trim(),
    name: String(obj.name || 'Unbenanntes Modul').trim(),
    shortName: String(obj.shortName || 'MOD').toUpperCase().trim(),
    version: String(obj.version || '1.0.0').trim(),
    system: 'splittermond',
    systemVersion: typeof obj.systemVersion === 'string' ? obj.systemVersion : '>=1.0',
    description: String(obj.description || '').trim(),
    author: String(obj.author || 'Community').trim(),
    website: typeof obj.website === 'string' ? obj.website : undefined,
    license: typeof obj.license === 'string' ? obj.license : 'Fan-Content / OGL',
    isDefault: Boolean(obj.isDefault),
    isActive: obj.isActive !== undefined ? Boolean(obj.isActive) : true,
    canRemove: obj.canRemove !== undefined ? Boolean(obj.canRemove) : true,
    createdAt: typeof obj.createdAt === 'string' ? obj.createdAt : new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    itemCounts: {
      spells: validSpells.length,
      masteries: validMasteries.length,
      strengths: validStrengths.length,
      weaknesses: validWeaknesses.length,
      resources: validResources.length,
    },
    resources: {
      spells: validSpells,
      masteries: validMasteries,
      strengths: validStrengths,
      weaknesses: validWeaknesses,
      gameResources: validResources,
    },
    overrides: obj.overrides as Record<string, { description: string }> | undefined,
  };

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    summary: {
      spellsCount: validSpells.length,
      masteriesCount: validMasteries.length,
      strengthsCount: validStrengths.length,
      weaknessesCount: validWeaknesses.length,
      resourcesCount: validResources.length,
      overridesCount,
    },
    sanitizedPackage: errors.length === 0 ? sanitizedPackage : undefined,
  };
}

/**
 * Clean Starter Template ready for export, download, and community authoring.
 */
export const STARTER_MODULE_TEMPLATE: RulebookModulePackage = {
  format: 'splittermond-module-v1',
  id: 'mein-abenteuer-modul',
  name: 'Arkanes Kompendium & Abenteurer-Handbuch',
  shortName: 'AKH',
  version: '1.0.0',
  system: 'splittermond',
  systemVersion: '>=1.0',
  description: 'Ein modulares Regelwerks-Paket mit neuen Zaubern, Meisterschaften, Stärken und Ressourcen für Splittermond.',
  author: 'Splittermond Spieltisch / Community',
  license: 'Freie Fan-Erweiterung',
  isDefault: false,
  isActive: true,
  canRemove: true,
  createdAt: '2026-09-12T00:00:00Z',
  itemCounts: {
    spells: 3,
    masteries: 3,
    strengths: 2,
    weaknesses: 1,
    resources: 1,
  },
  resources: {
    spells: [
      {
        name: 'Aetherklinge',
        school: 'Kampfmagie',
        grade: 1,
        cost: 'K4V1',
        castTime: '1 Tick',
        range: 'Zauberer',
        duration: 'kanalisiert',
        description: 'Hüllt eine geführte Klingenwaffe in magisches Leuchten (+2 Kälteschaden).',
        damage: '+2',
        source: 'AKH',
        page: 12,
      },
      {
        name: 'Windschritt',
        school: 'Bewegungsmagie',
        grade: 2,
        cost: '8V2',
        castTime: '3 Ticks',
        range: 'Zauberer',
        duration: 'sofort',
        description: 'Der Zauberer überbrückt bis zu 10 Meter in einem Wimpernschlag ohne Gelegenheitsangriffe auszulösen.',
        source: 'AKH',
        page: 15,
      },
      {
        name: 'Sonnenflamme',
        school: 'Lichtmagie',
        grade: 3,
        cost: '12V3',
        castTime: '6 Ticks',
        range: '20 m',
        duration: 'sofort',
        description: 'Entfesselt einen gleißenden Lichtstrahl. Verursacht 3W6+3 Schaden und blendet Untote (Zustand Geblendet 2).',
        damage: '3W6+3',
        source: 'AKH',
        page: 18,
      },
    ],
    masteries: [
      {
        name: 'Klingenschatten (S1)',
        skill: 'Klingenwaffen',
        level: 1,
        desc: 'Nach erfolgreichem Treffer erhält der Abenteurer +1 VTD gegen den nächsten Nahkampfangriff des Ziels.',
        source: 'AKH',
        page: 24,
      },
      {
        name: 'Meister der Balance (S2)',
        skill: 'Akrobatik',
        level: 2,
        desc: 'Der Held ignoriert Abzüge durch schwankenden Boden, schmale Kanten oder Glätte vollständig.',
        source: 'AKH',
        page: 26,
      },
      {
        name: 'Arkane Gegenwehr (S2)',
        skill: 'Allgemein',
        level: 2,
        desc: 'Aktive Abwehr mit 2W10+Mystik gegen feindliche Zauberproben möglich.',
        source: 'AKH',
        page: 30,
      },
    ],
    strengths: [
      {
        name: 'Gespür für Relikte',
        cost: 1,
        max: 1,
        multi: false,
        onlyCreation: false,
        desc: '+2 auf Magiekunde- und Arkane Kunde-Proben beim Identifizieren magischer Artefakte.',
        source: 'AKH',
        page: 34,
      },
      {
        name: 'Unerschütterlich',
        cost: 2,
        max: 1,
        multi: false,
        onlyCreation: false,
        desc: '+3 Bonus auf Zähigkeit und Entschlossenheit gegen Einschüchterung und Furchteffekte.',
        source: 'AKH',
        page: 35,
      },
    ],
    weaknesses: [
      {
        name: 'Lichtempfindlich',
        desc: 'Erleidet bei direkter Sonneneinstrahlung -2 auf alle Wahrnehmungsproben (Sehen).',
        source: 'AKH',
        page: 38,
      },
    ],
    gameResources: [
      {
        name: 'Gelehrten-Loge',
        desc: 'Der Charakter hat Zugriff auf eine akademische Bibliothek mit seltenen Folianten (+2 auf Recherche).',
        source: 'AKH',
        page: 42,
      },
    ],
  },
  overrides: {},
};
