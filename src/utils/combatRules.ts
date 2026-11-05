import { GENERAL_COMBAT_MASTERIES, MASTERIES_DB, type MasteryEntry } from '../data/masteries';

export interface AttackEGCalculation {
  totalRoll: number;
  targetVTD: number;
  differenz: number;
  isSuccess: boolean;
  isFumble: boolean;
  isCrit: boolean;
  eg: number;
  outcomeLabel: string;
}

/**
 * Calculates attack success and success degrees (Erfolgsgrade, EG)
 * according to Splittermond Grundregelwerk (GRW S. 17 & S. 158-161).
 *
 * Rules:
 * - Differenz = totalRoll - targetVTD
 * - Diff >= 0 -> Treffer!
 * - Diff 0..2 = 0 EG (Knapp gelungen)
 * - Diff 3..5 = 1 EG
 * - Diff 6..8 = 2 EG
 * - Diff 9..11 = 3 EG (+1 EG per 3 points above)
 * - Fumble (Patzer): Always failure, 0 EG
 * - Triumph (Doppel-10): Guarantees success and grants at least +1 bonus EG!
 */
export function calculateAttackEG(
  totalRoll: number,
  targetVTD: number,
  isFumble: boolean = false,
  isCrit: boolean = false
): AttackEGCalculation {
  if (isFumble) {
    return {
      totalRoll,
      targetVTD,
      differenz: totalRoll - targetVTD,
      isSuccess: false,
      isFumble: true,
      isCrit: false,
      eg: 0,
      outcomeLabel: 'Patzer!',
    };
  }

  const differenz = totalRoll - targetVTD;
  let isSuccess = differenz >= 0;

  if (isCrit) {
    // Triumph always succeeds in Splittermond
    isSuccess = true;
  }

  if (!isSuccess) {
    const isClose = differenz >= -2;
    return {
      totalRoll,
      targetVTD,
      differenz,
      isSuccess: false,
      isFumble: false,
      isCrit: false,
      eg: 0,
      outcomeLabel: isClose ? 'Knapp verfehlt' : 'Verfehlt',
    };
  }

  // Base EG calculation
  let eg = Math.max(0, Math.floor(differenz / 3));

  if (isCrit) {
    // Triumph gives minimum 1 EG and +1 extra EG
    eg = Math.max(1, eg + 1);
  }

  let outcomeLabel = 'Treffer!';
  if (isCrit) {
    outcomeLabel = 'Triumph! Kritischer Treffer!';
  } else if (eg >= 4) {
    outcomeLabel = 'Meisterhafter Treffer!';
  } else if (eg >= 2) {
    outcomeLabel = 'Herausragender Treffer!';
  } else if (eg === 1) {
    outcomeLabel = 'Solider Treffer';
  } else {
    outcomeLabel = 'Knapper Treffer (0 EG)';
  }

  return {
    totalRoll,
    targetVTD,
    differenz,
    isSuccess: true,
    isFumble: false,
    isCrit,
    eg,
    outcomeLabel,
  };
}

export interface CombatManeuver {
  id: string;
  name: string;
  type: 'free' | 'mastery';
  skill?: string;
  source?: string;
  page?: number;
  description: string;
  shortDesc: string;
  extraDamageFormula?: string; // e.g. "+1W6" for Hammerschlag
  damageMultiplier?: number;   // e.g. 0.5 for Abdrängen
  fixedExtraDamage?: number;
  egDamageRate?: number;       // default 1 damage per EG, 2 for Wuchtangriff
  inflictsCondition?: string;  // e.g. "Liegend" or "Verwundet 1"
  targetResistance?: 'VTD' | 'KW' | 'GW'; // default VTD
  requiresZielen?: boolean;
}

export const MELEE_WEAPON_SKILLS = [
  'Klingenwaffen',
  'Stangenwaffen',
  'Hiebwaffen',
  'Kettenwaffen',
  'Handgemenge',
] as const;

export const RANGED_WEAPON_SKILLS = [
  'Schusswaffen',
  'Wurfwaffen',
] as const;

/**
 * Checks if a given weapon / skill represents melee combat (Nahkampf).
 */
export function isMeleeWeapon(weaponSkill?: string, weaponCategory?: string): boolean {
  if (weaponCategory && /fern/i.test(weaponCategory)) return false;
  if (weaponSkill && RANGED_WEAPON_SKILLS.some((s) => s.toLowerCase() === weaponSkill.toLowerCase())) return false;
  if (weaponCategory && /nah/i.test(weaponCategory)) return true;
  if (weaponSkill && MELEE_WEAPON_SKILLS.some((s) => s.toLowerCase() === weaponSkill.toLowerCase())) return true;
  return true; // Default fallback to melee
}

/**
 * Checks if a given weapon / skill represents ranged combat (Fernkampf).
 */
export function isRangedWeapon(weaponSkill?: string, weaponCategory?: string): boolean {
  return !isMeleeWeapon(weaponSkill, weaponCategory);
}

/**
 * Free maneuvers available to any character according to Splittermond GRW S. 160-161.
 */
export const FREE_COMBAT_MANEUVERS: CombatManeuver[] = [
  {
    id: 'none',
    name: 'Standardangriff',
    type: 'free',
    source: 'GRW',
    page: 158,
    description: 'Ein gewöhnlicher Angriff ohne spezielles Manöver. Jeder erzielte Erfolgsgrad kann flexibel für zusätzlichen Schaden (+1 Schaden pro EG), das Umgehen von Rüstung (-1 RS pro EG) oder eigene Abwehr (+1 VTD pro EG) eingesetzt werden.',
    shortDesc: 'Standardangriff (1 EG = +1 Schaden)',
    egDamageRate: 1,
  },
  {
    id: 'wuchtangriff',
    name: 'Wuchtangriff',
    type: 'free',
    source: 'GRW',
    page: 160,
    description: 'Der Kämpfer legt seine gesamte Kraft in den Hieb. Jeder eingesetzte Erfolgsgrad (EG) erhöht den Schaden um 2 Punkte (statt normal 1 Punkt). Nur für Nahkampfwaffen und Wurfwaffen, nicht jedoch für Schusswaffen (GRW S. 160).',
    shortDesc: 'Maximale Kraft: Jeder EG bringt +2 Schaden!',
    egDamageRate: 2,
  },
  {
    id: 'gezielter_schlag',
    name: 'Gezielter Schlag / Schuss',
    type: 'free',
    source: 'GRW',
    page: 160,
    description: 'Der Angreifer zielt gezielt auf eine Schwachstelle oder Rüstungslücke. Jeder eingesetzte Erfolgsgrad ignoriert 1 Punkt der gegnerischen Schadensreduktion (RS). Überschüssige EG erhöhen den Schaden um 1.',
    shortDesc: 'Ignoriert 1 Punkt gegnerische Rüstung (RS) pro EG',
    egDamageRate: 1,
  },
  {
    id: 'defensiver_angriff',
    name: 'Defensiver Angriff',
    type: 'free',
    source: 'GRW',
    page: 160,
    description: 'Der Kämpfer greift mit Bedacht an und achtet vor allem auf die eigene Deckung. Bis zu 3 eingesetzte Erfolgsgrade erhöhen die eigene Verteidigung bis zur nächsten eigenen Aktion um +1 VTD pro EG. Nur im Nahkampf einsetzbar (GRW S. 160).',
    shortDesc: 'Erhöht eigene VTD bis zur nächsten Aktion (+1 VTD pro EG, max. 3)',
    egDamageRate: 1,
  },
  {
    id: 'finte',
    name: 'Finte',
    type: 'free',
    source: 'GRW',
    page: 160,
    description: 'Ein angetäuschter Schlag bringt die Abwehr des Gegners ins Wanken. Jeder eingesetzte Erfolgsgrad senkt die Verteidigung des Ziels gegen den nächsten folgenden Angriff um 1 Punkt. Nur im Nahkampf einsetzbar (GRW S. 160).',
    shortDesc: 'Senkt VTD des Ziels für den nächsten Angriff (-1 VTD pro EG)',
    egDamageRate: 1,
  },
  {
    id: 'umreissen',
    name: 'Zu Boden werfen / Umreißen',
    type: 'free',
    source: 'GRW',
    page: 161,
    description: 'Der Angreifer versucht, den Gegner durch Schwung, Schildstoß oder Beinstellen zu Fall zu bringen. Kostet 2 Erfolgsgrade. Bei Erfolg erhält das Ziel den Zustand Liegend. Nur im Nahkampf einsetzbar (GRW S. 161).',
    shortDesc: 'Kostet 2 EG: Bringt das Ziel zu Boden (Zustand Liegend)',
    inflictsCondition: 'Liegend',
    egDamageRate: 1,
  },
];

/**
 * Returns allowed free combat maneuvers for a specific weapon skill and category.
 * Rules according to Splittermond GRW S. 160-161:
 * - Melee (Nahkampf): Standardangriff, Wuchtangriff, Gezielter Schlag, Defensiver Angriff, Finte, Zu Boden werfen / Umreißen.
 * - Ranged (Schusswaffen): Standardangriff, Gezielter Schuss. (Kein Wuchtangriff, kein Defensiver Angriff, keine Finte, kein Umreißen).
 * - Thrown (Wurfwaffen): Standardangriff, Wuchtangriff (erlaubt laut GRW S. 160), Gezielter Wurf.
 */
export function getFreeCombatManeuversForWeapon(
  weaponSkill: string = 'Klingenwaffen',
  weaponCategory?: string
): CombatManeuver[] {
  const isMelee = isMeleeWeapon(weaponSkill, weaponCategory);
  const isWurf = weaponSkill.toLowerCase().includes('wurf');

  return FREE_COMBAT_MANEUVERS.filter((m) => {
    if (m.id === 'none') return true;
    if (m.id === 'gezielter_schlag') return true;
    if (m.id === 'wuchtangriff') {
      return isMelee || isWurf;
    }
    if (['defensiver_angriff', 'finte', 'umreissen'].includes(m.id)) {
      return isMelee;
    }
    return true;
  }).map((m) => {
    if (m.id === 'gezielter_schlag' && !isMelee) {
      return {
        ...m,
        name: isWurf ? 'Gezielter Wurf' : 'Gezielter Schuss',
        description: 'Der Angreifer visiert eine Schwachstelle des Ziels an. Jeder eingesetzte Erfolgsgrad ignoriert 1 Punkt gegnerische Rüstung (RS).',
        shortDesc: 'Ignoriert 1 Punkt gegnerische Rüstung (RS) pro EG',
      };
    }
    return m;
  });
}

export interface KnownMasteryManeuverConfig extends Partial<CombatManeuver> {
  allowedSkills?: string[];
  isGeneralNahkampf?: boolean;
}

/**
 * Known Combat Mastery maneuvers mapped to their specific mechanics and weapon restrictions.
 */
export const KNOWN_MASTERY_MANEUVERS: Record<string, KnownMasteryManeuverConfig> = {
  // Allgemeine Nahkampfmeisterschaften (valid for ALL melee weapon skills: Klingen-, Stangen-, Hieb-, Kettenwaffen, Handgemenge)
  'Abdrängen': {
    isGeneralNahkampf: true,
    targetResistance: 'KW',
    damageMultiplier: 0.5,
    shortDesc: 'Probe vs. Körperlicher Widerstand (KW). Gegner wird 1m (+0,5m pro weiterem EG) zurückgedrängt, halber Schaden.',
  },
  'Entwaffnen': {
    isGeneralNahkampf: true,
    shortDesc: 'Ziel verliert die geführte Waffe (Mindest-EG oder vergleichende Probe).',
  },
  'Rundumschlag': {
    isGeneralNahkampf: true,
    shortDesc: 'Greift bis zu 2 weitere Gegner in Nahkampfreichweite gleichzeitig an.',
  },
  'Umklammern': {
    isGeneralNahkampf: true,
    inflictsCondition: 'Ringend',
    shortDesc: 'Ziel und Angreifer erhalten Zustand Ringend (VTD -2 und Aktionen erschwert).',
  },
  'Vorstürmen': {
    isGeneralNahkampf: true,
    shortDesc: 'Stürmt auf den Gegner zu und führt einen mächtigen Nahkampfangriff aus.',
  },

  // Hiebwaffen & Kettenwaffen & Stangenwaffen
  'Hammerschlag': {
    allowedSkills: ['Hiebwaffen', 'Kettenwaffen'],
    extraDamageFormula: '1W6',
    shortDesc: '+1W6 Schaden zusätzlich! Weitere EG können für weiteren Schaden genutzt werden.',
  },
  'Schmetterschlag': {
    allowedSkills: ['Hiebwaffen', 'Stangenwaffen'],
    inflictsCondition: 'Verwundet 1',
    shortDesc: 'Verursacht zusätzlich zum normalen Schaden den Zustand Verwundet 1.',
  },
  'Knochenbrecher': {
    allowedSkills: ['Hiebwaffen'],
    shortDesc: 'Fügt dem Ziel schwere Knochenbrüche zu.',
  },
  'Schildbrecher': {
    allowedSkills: ['Hiebwaffen'],
    shortDesc: 'Zielt auf gegnerischen Schild. Beschädigt oder zerstört Schilde.',
  },

  // Klingenwaffen & Stangenwaffen
  'Ausfall': {
    allowedSkills: ['Klingenwaffen', 'Stangenwaffen'],
    shortDesc: 'Gegner mit einer schnellen Angriffsserie bedrängen und zurückweichen lassen.',
  },
  'Klingenwirbel': {
    allowedSkills: ['Klingenwaffen', 'Stangenwaffen'],
    shortDesc: 'Erlaubt einen schnellen zweiten Angriff in Folge.',
  },
  'Blutiger Aderlass': {
    allowedSkills: ['Klingenwaffen'],
    inflictsCondition: 'Blutend 1',
    shortDesc: 'Verursacht zusätzlich zum normalen Schaden den Zustand Blutend 1.',
  },
  'Verteidigungswirbel': {
    allowedSkills: ['Klingenwaffen', 'Kettenwaffen'],
    shortDesc: 'Erhöht die aktive Abwehr mit der geführten Waffe.',
  },
  'Verwirrung': {
    allowedSkills: ['Klingenwaffen', 'Handgemenge'],
    shortDesc: 'Verwirrt den Gegner durch geschickte Manöver.',
  },

  // Handgemenge
  'Schmerzhafter Hieb': {
    allowedSkills: ['Handgemenge'],
    shortDesc: 'Fügt schmerzhaften Zusatzschaden oder Zustände im Nahkampf zu.',
  },
  'Würgegriff': {
    allowedSkills: ['Handgemenge'],
    shortDesc: 'Nimmt den Gegner in den Würgegriff.',
  },

  // Fernkampf - Schusswaffen
  'Meisterschuss': {
    allowedSkills: ['Schusswaffen'],
    requiresZielen: true,
    shortDesc: 'Meisterlicher Fernkampfschuss mit mächtigem Durchschlag.',
  },
  'Sehnenschneider': {
    allowedSkills: ['Schusswaffen'],
    inflictsCondition: 'Lahm (60 Ticks)',
    shortDesc: 'Verursacht zusätzlich für 60 Ticks den Zustand Lahm.',
  },

  // Fernkampf - Wurfwaffen
  'Meisterwurf': {
    allowedSkills: ['Wurfwaffen'],
    requiresZielen: true,
    shortDesc: 'Meisterlicher Wurf mit verheerender Präzision.',
  },
  'Harter Wurf': {
    allowedSkills: ['Wurfwaffen'],
    shortDesc: 'Kräftiger Wurf mit zusätzlichem Wuchtschaden.',
  },
  'Mehrfachwurf': {
    allowedSkills: ['Wurfwaffen'],
    shortDesc: 'Schleudert mehrere Wurfwaffen gleichzeitig auf Feinde.',
  },
  'Geschosshagel': {
    allowedSkills: ['Wurfwaffen'],
    shortDesc: 'Regen aus Wurfwaffen auf bis zu mehrere Feinde.',
  },

  // Scharfschütze (Fernkampf only - Schusswaffen & Wurfwaffen)
  'Scharfschütze': {
    allowedSkills: ['Schusswaffen', 'Wurfwaffen'],
    requiresZielen: true,
    shortDesc: 'Präziser Fernkampfschuss nach Zielen (ignoriert Modifikatoren für Getümmel).',
  },
};

/**
 * Checks if a combat maneuver is allowed for a given weapon skill and category.
 */
export function isCombatManeuverAllowedForWeapon(
  maneuverNameOrClean: string,
  weaponSkill: string = 'Klingenwaffen',
  weaponCategory?: string,
  masterySkill?: string
): boolean {
  const cleanName = maneuverNameOrClean.replace(/\s*\([ST]\d+\)/i, '').trim();
  const cleanLower = cleanName.toLowerCase();
  const isMelee = isMeleeWeapon(weaponSkill, weaponCategory);
  const normWeaponSkill = weaponSkill.trim().toLowerCase();

  const known = KNOWN_MASTERY_MANEUVERS[cleanName];

  // If it's a known general melee mastery:
  if (known?.isGeneralNahkampf) {
    if (!isMelee) return false;
    if (known.allowedSkills && known.allowedSkills.length > 0) {
      return known.allowedSkills.some((s) => s.toLowerCase() === normWeaponSkill);
    }
    return true;
  }

  // If known has specific allowed skills:
  if (known?.allowedSkills && known.allowedSkills.length > 0) {
    const matchedSkill = known.allowedSkills.some((s) => s.toLowerCase() === normWeaponSkill);
    if (!matchedSkill) return false;
    const isKnownMelee = known.allowedSkills.some((s) =>
      MELEE_WEAPON_SKILLS.some((m) => m.toLowerCase() === s.toLowerCase())
    );
    const isKnownRanged = known.allowedSkills.some((s) =>
      RANGED_WEAPON_SKILLS.some((r) => r.toLowerCase() === s.toLowerCase())
    );
    if (isMelee && !isKnownMelee) return false;
    if (!isMelee && !isKnownRanged) return false;
    return true;
  }

  // If masterySkill is specified:
  if (masterySkill) {
    const normMasterySkill = masterySkill.trim().toLowerCase();
    if (normMasterySkill.includes('allgemeine') || normMasterySkill.includes('nahkampf')) {
      return isMelee;
    }
    if (normMasterySkill === normWeaponSkill) {
      return true;
    }
    return false;
  }

  // Check in MASTERIES_DB
  const dbEntries = MASTERIES_DB[weaponSkill] || [];
  const foundInSkill = dbEntries.find(
    (e) => (e.baseName || e.name).replace(/\s*\([ST]\d+\)/i, '').trim().toLowerCase() === cleanLower
  );
  if (foundInSkill) return true;

  if (isMelee) {
    const foundInGeneral = GENERAL_COMBAT_MASTERIES.find(
      (e) => (e.baseName || e.name).replace(/\s*\([ST]\d+\)/i, '').trim().toLowerCase() === cleanLower
    );
    if (foundInGeneral) return true;
  }

  return false;
}

/**
 * Returns available combat maneuvers for a character and their chosen weapon/skill.
 * Combines category-filtered free maneuvers with valid learned mastery maneuvers.
 */
export function getAvailableCombatManeuvers(
  characterMasteries: any = [],
  weaponSkill: string = 'Klingenwaffen',
  weaponCategory?: string
): CombatManeuver[] {
  // 1. Get filtered free maneuvers for weapon category
  const maneuvers: CombatManeuver[] = getFreeCombatManeuversForWeapon(weaponSkill, weaponCategory);
  const isMelee = isMeleeWeapon(weaponSkill, weaponCategory);

  // 2. Parse learned masteries from characterMasteries (handles Array or Object/Record)
  interface LearnedItem {
    rawName: string;
    cleanName: string;
    cleanLower: string;
    skill?: string;
  }
  const learnedList: LearnedItem[] = [];

  if (Array.isArray(characterMasteries)) {
    for (const item of characterMasteries) {
      const rawName = typeof item === 'string' ? item : (item?.name || item?.baseName || '');
      if (!rawName) continue;
      const cleanName = rawName.replace(/\s*\([ST]\d+\)/i, '').trim();
      learnedList.push({
        rawName,
        cleanName,
        cleanLower: cleanName.toLowerCase(),
        skill: typeof item === 'object' ? item?.skill : undefined,
      });
    }
  } else if (characterMasteries && typeof characterMasteries === 'object') {
    for (const [skillKey, list] of Object.entries(characterMasteries)) {
      if (Array.isArray(list)) {
        for (const item of list) {
          const rawName = typeof item === 'string' ? item : (item?.name || item?.baseName || '');
          if (!rawName) continue;
          const cleanName = rawName.replace(/\s*\([ST]\d+\)/i, '').trim();
          learnedList.push({
            rawName,
            cleanName,
            cleanLower: cleanName.toLowerCase(),
            skill: skillKey,
          });
        }
      }
    }
  }

  // 3. Search relevant DB masteries (General combat masteries if melee + weapon specific masteries)
  const skillMasteries = MASTERIES_DB[weaponSkill] || [];
  const relevantDbMasteries: MasteryEntry[] = [
    ...(isMelee ? GENERAL_COMBAT_MASTERIES : []),
    ...skillMasteries,
  ].filter((m) => {
    return m.manoever || (m.desc && m.desc.includes('[Manöver]'));
  });

  for (const dbM of relevantDbMasteries) {
    const cleanName = (dbM.baseName || dbM.name).replace(/\s*\([ST]\d+\)/i, '').trim();
    const cleanLower = cleanName.toLowerCase();

    // Check if character learned this mastery
    const learnedMatch = learnedList.find((l) => l.cleanLower === cleanLower);
    if (!learnedMatch) continue;

    // Verify maneuver is allowed for this weapon
    if (!isCombatManeuverAllowedForWeapon(cleanName, weaponSkill, weaponCategory, dbM.skill || learnedMatch.skill)) {
      continue;
    }

    if (!maneuvers.some((m) => m.name.toLowerCase() === cleanLower)) {
      const knownData = KNOWN_MASTERY_MANEUVERS[cleanName] || {};
      maneuvers.push({
        id: `mastery_${cleanLower.replace(/\s+/g, '_')}`,
        name: cleanName,
        type: 'mastery',
        skill: dbM.skill || learnedMatch.skill || weaponSkill,
        source: dbM.source || 'GRW',
        page: dbM.page,
        description: dbM.desc || '',
        shortDesc: knownData.shortDesc || (dbM.desc ? dbM.desc.replace(/^\[Manöver\]\s*/i, '').slice(0, 100) + '...' : cleanName),
        extraDamageFormula: knownData.extraDamageFormula,
        damageMultiplier: knownData.damageMultiplier ?? 1,
        fixedExtraDamage: knownData.fixedExtraDamage ?? 0,
        egDamageRate: knownData.egDamageRate ?? 1,
        inflictsCondition: knownData.inflictsCondition,
        targetResistance: knownData.targetResistance ?? 'VTD',
        requiresZielen: knownData.requiresZielen,
      });
    }
  }

  // 4. Also check directly known mastery maneuvers learned by character
  for (const learned of learnedList) {
    if (maneuvers.some((m) => m.name.toLowerCase() === learned.cleanLower)) continue;

    if (KNOWN_MASTERY_MANEUVERS[learned.cleanName]) {
      // Must be allowed for this weapon!
      if (!isCombatManeuverAllowedForWeapon(learned.cleanName, weaponSkill, weaponCategory, learned.skill)) {
        continue;
      }

      const known = KNOWN_MASTERY_MANEUVERS[learned.cleanName];
      maneuvers.push({
        id: `mastery_${learned.cleanLower.replace(/\s+/g, '_')}`,
        name: learned.cleanName,
        type: 'mastery',
        skill: learned.skill || (known.isGeneralNahkampf ? 'Allgemeine Nahkampfmeisterschaften' : weaponSkill),
        source: 'GRW',
        description: known.shortDesc || learned.cleanName,
        shortDesc: known.shortDesc || learned.cleanName,
        extraDamageFormula: known.extraDamageFormula,
        damageMultiplier: known.damageMultiplier ?? 1,
        fixedExtraDamage: known.fixedExtraDamage ?? 0,
        egDamageRate: known.egDamageRate ?? 1,
        inflictsCondition: known.inflictsCondition,
        targetResistance: known.targetResistance ?? 'VTD',
        requiresZielen: known.requiresZielen,
      });
    }
  }

  return maneuvers;
}

export interface ParsedWeaponDamage {
  count: number;
  sides: number;
  bonus: number;
  damageType: string;
  raw: string;
}

/**
 * Parses weapon damage string like "1W6+2", "2W6", "1W10+4", or "1W6"
 */
export function parseWeaponDamage(formulaStr?: string | null, fallbackType: string = 'Schnitt'): ParsedWeaponDamage {
  const raw = (formulaStr || '1W6').trim();
  const match = raw.match(/^(\d*)W(\d+)\s*([+-]\s*\d+)?/i);

  if (!match) {
    return {
      count: 1,
      sides: 6,
      bonus: 0,
      damageType: fallbackType,
      raw: '1W6',
    };
  }

  const count = parseInt(match[1] || '1', 10);
  const sides = parseInt(match[2], 10);
  let bonus = 0;
  if (match[3]) {
    bonus = parseInt(match[3].replace(/\s+/g, ''), 10) || 0;
  }

  // Attempt to detect damage type from attributes or suffix
  let damageType = fallbackType;
  if (/stich/i.test(raw)) damageType = 'Stich';
  else if (/hieb/i.test(raw)) damageType = 'Hieb';
  else if (/waffenlos|stumpf/i.test(raw)) damageType = 'Stumpf';

  return {
    count,
    sides,
    bonus,
    damageType,
    raw,
  };
}

export interface DamageRollInput {
  baseFormula: string;           // e.g. "1W6+3"
  maneuverExtraFormula?: string; // e.g. "1W6" (from Hammerschlag)
  egBonusDamage: number;         // extra damage from allocated EG (e.g. +4)
  damageMultiplier?: number;     // e.g. 0.5 for Abdrängen
  targetArmorReduction?: number; // opponent's RS (e.g. 3)
  armorPenetrationEG?: number;   // RS ignored from Gezielter Schlag (e.g. 2)
  damageType?: string;
  maneuverCondition?: string;    // e.g. "Verwundet 1"
  tripCondition?: boolean;       // if Umreißen was used
}

export interface DamageRollResult {
  baseDice: number[];
  baseDiceSum: number;
  baseBonus: number;
  maneuverDice: number[];
  maneuverDiceSum: number;
  egBonusDamage: number;
  grossDamage: number;           // before armor
  effectiveArmor: number;        // targetArmorReduction - armorPenetrationEG
  netDamage: number;             // after armor
  damageType: string;
  appliedConditions: string[];
  breakdownText: string;
}

/**
 * Rolls damage transparently and calculates net damage vs. target armor.
 */
export function executeAttackDamageRoll(input: DamageRollInput): DamageRollResult {
  const parsed = parseWeaponDamage(input.baseFormula, input.damageType || 'Schnitt');

  // Roll base dice
  const baseDice: number[] = [];
  for (let i = 0; i < parsed.count; i++) {
    baseDice.push(Math.floor(Math.random() * parsed.sides) + 1);
  }
  const baseDiceSum = baseDice.reduce((a, b) => a + b, 0);

  // Roll maneuver extra dice (if applicable, e.g. Hammerschlag +1W6)
  const maneuverDice: number[] = [];
  if (input.maneuverExtraFormula) {
    const parsedM = parseWeaponDamage(input.maneuverExtraFormula);
    for (let i = 0; i < parsedM.count; i++) {
      maneuverDice.push(Math.floor(Math.random() * parsedM.sides) + 1);
    }
  }
  const maneuverDiceSum = maneuverDice.reduce((a, b) => a + b, 0);

  // Sum before multiplier
  const rawSum = baseDiceSum + parsed.bonus + maneuverDiceSum + input.egBonusDamage;
  const multiplier = input.damageMultiplier ?? 1;
  const grossDamage = Math.max(1, Math.round(rawSum * multiplier));

  // Armor calculations
  const rawArmor = Math.max(0, input.targetArmorReduction ?? 0);
  const armorPen = Math.max(0, input.armorPenetrationEG ?? 0);
  const effectiveArmor = Math.max(0, rawArmor - armorPen);
  const netDamage = Math.max(0, grossDamage - effectiveArmor);

  // Applied conditions
  const appliedConditions: string[] = [];
  if (input.maneuverCondition) {
    appliedConditions.push(input.maneuverCondition);
  }
  if (input.tripCondition) {
    appliedConditions.push('Liegend');
  }

  // Construct readable breakdown
  const dicePart = `[${baseDice.join(', ')}]`;
  const bonusPart = parsed.bonus !== 0 ? (parsed.bonus > 0 ? ` + ${parsed.bonus}` : ` - ${Math.abs(parsed.bonus)}`) : '';
  const egPart = input.egBonusDamage > 0 ? ` + ${input.egBonusDamage} EG` : '';
  const manPart = maneuverDice.length > 0 ? ` + Manöver [${maneuverDice.join(', ')}]` : '';
  const multPart = multiplier !== 1 ? ` × ${multiplier}` : '';
  const armorPart = rawArmor > 0
    ? ` - ${effectiveArmor} RS${armorPen > 0 ? ` (${rawArmor} - ${armorPen} durchdrungen)` : ''}`
    : '';

  const breakdownText = `${dicePart}${bonusPart}${egPart}${manPart}${multPart} = ${grossDamage} Brutto${armorPart} ➔ ${netDamage} Netto`;

  return {
    baseDice,
    baseDiceSum,
    baseBonus: parsed.bonus,
    maneuverDice,
    maneuverDiceSum,
    egBonusDamage: input.egBonusDamage,
    grossDamage,
    effectiveArmor,
    netDamage,
    damageType: input.damageType || parsed.damageType,
    appliedConditions,
    breakdownText,
  };
}
