import { SPELLS_DB, type Spell as DbSpell } from '../data/spells';
import { getSpellDescription } from './gameResourceManager';
import type { Spell } from '../types';

export interface ParsedFocusCost {
  isChanneled: boolean;
  exhausted: number;
  channeled: number;
  consumed: number;
  total: number;
  raw: string;
}

/**
 * Parses Splittermond focus cost strings like "4", "K1", "4V1", "12V3", "K4V1", "K8V2", "K16V4", "20V5"
 *
 * Rules:
 * - "4": 4 exhausted focus
 * - "K1": 1 channeled focus
 * - "4V1": Total 4 focus (3 exhausted, 1 consumed)
 * - "K4V1": 4 channeled focus + 1 consumed focus (total 5 focus)
 * - "12V3": Total 12 focus (9 exhausted, 3 consumed)
 * - "K8V2": 8 channeled focus + 2 consumed focus (total 10 focus)
 */
export function parseFocusCost(costInput?: string | number | null): ParsedFocusCost {
  const raw = String(costInput ?? '0').trim();
  if (!raw || raw === '0' || raw === 'frei' || raw === 'Frei') {
    return { isChanneled: false, exhausted: 0, channeled: 0, consumed: 0, total: 0, raw: '0' };
  }

  let isChanneled = false;
  let exhausted = 0;
  let channeled = 0;
  let consumed = 0;

  const hasK = /K/i.test(raw);
  const vMatch = raw.match(/V(\d+)/i);
  if (vMatch) {
    consumed = parseInt(vMatch[1], 10) || 0;
  }

  if (hasK) {
    isChanneled = true;
    const kMatch = raw.match(/K(\d+)/i);
    if (kMatch) {
      channeled = parseInt(kMatch[1], 10) || 0;
    } else {
      channeled = 1;
    }
  } else {
    // Non-channeled: e.g. "4", "5V2" (5 exhausted, 2 consumed)
    const numMatch = raw.match(/^(\d+)/);
    if (numMatch) {
      exhausted = parseInt(numMatch[1], 10) || 0;
    }
  }

  const total = exhausted + channeled + consumed;
  return {
    isChanneled,
    exhausted,
    channeled,
    consumed,
    total,
    raw,
  };
}

/**
 * Looks up full spell data in the SPELLS_DB by spell name and optional school.
 */
export function lookupSpellInDb(spellName: string, school?: string): DbSpell | undefined {
  const trimmed = spellName.trim().toLowerCase();
  let found: DbSpell | undefined;
  if (school) {
    found = SPELLS_DB.find(
      (s) => s.name.toLowerCase() === trimmed && s.school.toLowerCase() === school.toLowerCase()
    );
  }
  if (!found) {
    found = SPELLS_DB.find((s) => s.name.toLowerCase() === trimmed);
  }
  if (found) {
    const desc = getSpellDescription(found.name, found.school, found.description);
    return { ...found, description: desc };
  }
  return undefined;
}

/**
 * Merges a character Spell object with its DB entry to get full properties like castTime, range, duration, description, cost string.
 */
export function getFullSpellInfo(spell: Spell): Spell & { dbCost?: string; isChanneled?: boolean } {
  const dbEntry = lookupSpellInDb(spell.name, spell.school);
  const costString = dbEntry?.cost ?? (typeof spell.cost === 'string' ? spell.cost : undefined);
  const parsed = parseFocusCost(costString);

  return {
    ...spell,
    cost: costString ?? spell.cost,
    castTime: spell.castTime || dbEntry?.castTime || '—',
    range: spell.range || dbEntry?.range || '—',
    duration: spell.duration || dbEntry?.duration || (parsed.isChanneled ? 'kanalisiert' : '—'),
    target: spell.target || dbEntry?.target || '—',
    description: spell.description || dbEntry?.description || '',
    page: spell.page || dbEntry?.page,
    source: spell.source || dbEntry?.source || 'GRW',
    dbCost: costString,
    isChanneled: parsed.isChanneled,
  };
}

export interface SpellCastEGCalculation {
  isSuccess: boolean;
  differenz: number;
  eg: number;
  negativeEG: number;
  exhaustedFocusLostOnFailure: number;
  isFumble: boolean;
  isCrit: boolean;
}

/**
 * Calculates success degrees (EG) and failure consequences for a spell roll in Splittermond.
 *
 * Rules:
 * - Difference = total - difficulty
 * - Success: When total >= difficulty and not a fumble.
 *   - 1 EG for every full 3 points above difficulty (Math.floor(diff / 3)).
 *   - Triumph (+3 EG bonus if roll succeeded).
 * - Failure: When total < difficulty or fumble.
 *   - Spell fizzles!
 *   - Player exhausts focus equal to the negative EG:
 *     diff -1 to -3 = 1 neg EG (1 FO exhausted)
 *     diff -4 to -6 = 2 neg EG (2 FO exhausted)
 *     diff -7 to -9 = 3 neg EG (3 FO exhausted)
 *     Fumble adds +3 negative EG penalty.
 */
export function calculateSpellEG(
  totalRoll: number,
  difficulty: number,
  isFumble = false,
  isCrit = false
): SpellCastEGCalculation {
  const differenz = totalRoll - difficulty;
  const isSuccess = differenz >= 0 && !isFumble;

  if (isSuccess) {
    let eg = Math.floor(differenz / 3);
    if (isCrit) {
      eg += 3;
    }
    return {
      isSuccess: true,
      differenz,
      eg: Math.max(0, eg),
      negativeEG: 0,
      exhaustedFocusLostOnFailure: 0,
      isFumble: false,
      isCrit,
    };
  }

  // Failure
  // PDF S. 17 & 198:
  // Knapp misslungen (Diff -1 bis -2): 0 EG. Bei Kampf und Zauberei keine negativen Folgen (0 Fokusverlust).
  // Misslungen (Diff <= -3): negative EG = Math.floor(abs(diff) / 3)
  // Patzer (S. 18): Probe immer misslungen, zusätzlicher Abzug von -3 EG (maximal -1 EG).
  let negativeEG = 0;
  if (!isFumble) {
    if (differenz <= -3) {
      negativeEG = Math.floor(Math.abs(differenz) / 3);
    } else {
      // Differenz -1 or -2: Knapp misslungen -> 0 negative EG
      negativeEG = 0;
    }
  } else {
    // Patzer (fumble)
    if (differenz >= 0) {
      const baseEG = Math.floor(differenz / 3);
      negativeEG = Math.max(1, 3 - baseEG);
    } else if (differenz >= -2) {
      negativeEG = 3;
    } else {
      negativeEG = Math.floor(Math.abs(differenz) / 3) + 3;
    }
  }

  return {
    isSuccess: false,
    differenz,
    eg: 0,
    negativeEG,
    exhaustedFocusLostOnFailure: negativeEG,
    isFumble,
    isCrit: false,
  };
}

export interface SpecificSpellEnhancement {
  id: string;
  egCost: number;
  focusCostRaw: string;
  focusDelta: ParsedFocusCost;
  description: string;
  raw: string;
}

export interface PermissibleSpellModifications {
  rawList: string;
  allowsCastTime: boolean; // Auslösezeit
  allowsExhaustedFocus: boolean; // Erschöpfter Fokus
  allowsChanneledFocus: boolean; // Kanalisierter Fokus
  allowsConsumedFocus: boolean; // Verzehrter Fokus
  allowsRange: boolean; // Reichweite
  allowsDamage: boolean; // Schaden
  allowsDuration: boolean; // Wirkungsdauer
  allowsArea: boolean; // Wirkungsbereich
  allowsEnhance: boolean; // Verstärken
  allowedNames: string[];
  specificEnhancements: SpecificSpellEnhancement[];
}

/**
 * Parses the permissible modifications ("Zulässige Modifikationen") and specific enhancements
 * from a spell's description or Erfolgsgrade section as stored in the Splittermond GRW database.
 */
export function parseSpellPermissibleModifications(
  description?: string,
  spellName?: string
): PermissibleSpellModifications {
  const desc = description || '';
  const egIdx = desc.indexOf('Erfolgsgrade:');

  if (egIdx === -1) {
    // If no Erfolgsgrade section is found (e.g. custom user spell without structured text),
    // provide sensible defaults.
    return {
      rawList: 'Auslösezeit, Fokus, Verstärken',
      allowsCastTime: true,
      allowsExhaustedFocus: true,
      allowsChanneledFocus: true,
      allowsConsumedFocus: true,
      allowsRange: true,
      allowsDamage: true,
      allowsDuration: true,
      allowsArea: true,
      allowsEnhance: true,
      allowedNames: [
        'Auslösezeit',
        'Erschöpfter Fokus',
        'Kanalisierter Fokus',
        'Verzehrter Fokus',
        'Reichweite',
        'Schaden',
        'Wirkungsdauer',
        'Wirkungsbereich',
        'Verstärken',
      ],
      specificEnhancements: [],
    };
  }

  const egSection = desc.slice(egIdx + 'Erfolgsgrade:'.length).trim();
  const bullets = egSection.split('•').map((b) => b.trim()).filter(Boolean);

  const modBullet = bullets[0] || '';
  const allowedClean = modBullet
    .replace(/\(s\.\s*u\.\)/g, '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const allowedSet = new Set(allowedClean.map((s) => s.toLowerCase()));

  const specificEnhancements: SpecificSpellEnhancement[] = [];
  for (let i = 1; i < bullets.length; i++) {
    const bulletText = bullets[i];
    // Pattern: "2 EG (Kosten +K1V1): Es können bis zu fünf Personen bestimmt werden."
    // or "1 EG (Kosten +1V1): Der Zauberer weiß..."
    // or "2 EG: ..."
    const m = bulletText.match(/^(\d+)\s*EG(?:\s*\((?:Kosten\s*)?([^\)]+)\))?\s*:\s*(.+)$/i);
    if (m) {
      const egCost = parseInt(m[1], 10) || 1;
      const extraRaw = m[2] ? m[2].trim() : '';
      const cleanCost = extraRaw.replace(/^\+/, '');
      const focusDelta = parseFocusCost(cleanCost);
      specificEnhancements.push({
        id: `enh-${i}`,
        egCost,
        focusCostRaw: extraRaw,
        focusDelta,
        description: m[3].trim(),
        raw: bulletText,
      });
    } else {
      specificEnhancements.push({
        id: `enh-${i}`,
        egCost: 1,
        focusCostRaw: '',
        focusDelta: parseFocusCost('0'),
        description: bulletText,
        raw: bulletText,
      });
    }
  }

  return {
    rawList: modBullet,
    allowsCastTime: allowedSet.has('auslösezeit'),
    allowsExhaustedFocus: allowedSet.has('erschöpfter fokus'),
    allowsChanneledFocus: allowedSet.has('kanalisierter fokus'),
    allowsConsumedFocus: allowedSet.has('verzehrter fokus'),
    allowsRange: allowedSet.has('reichweite'),
    allowsDamage: allowedSet.has('schaden'),
    allowsDuration: allowedSet.has('wirkungsdauer'),
    allowsArea: allowedSet.has('wirkungsbereich'),
    allowsEnhance: allowedSet.has('verstärken'),
    allowedNames: allowedClean,
    specificEnhancements,
  };
}

export interface SpellEGAllocations {
  saveExhaustedFocus: number; // 1 EG per 1 exhausted FO saved
  saveChanneledFocus: number;  // 2 EG per 1 channeled FO saved
  saveConsumedFocus: number;   // 3 EG per 1 consumed FO saved (Splittermond standard)
  increaseDamage: number;      // 1 EG per +1 damage
  increaseRange: number;       // 1 EG per base range increase
  increaseDuration: number;    // 2 EG per base duration increase
  reduceCastTime: number;      // 3 EG per -1 tick cast time reduction (max 2)
  expandArea: number;          // 1 EG per area expansion step
  selectedEnhancementIds: string[]; // List of specific enhancement IDs selected
  customEnhancementEG: number; // EG spent on spell-specific enhancement
  customEnhancementText: string;
  customEnhancementExtraFocus: number; // extra focus if enhancement requires it
  customEnhancementExtraFocusType: 'exhausted' | 'channeled' | 'consumed';
}

export const INITIAL_EG_ALLOCATIONS: SpellEGAllocations = {
  saveExhaustedFocus: 0,
  saveChanneledFocus: 0,
  saveConsumedFocus: 0,
  increaseDamage: 0,
  increaseRange: 0,
  increaseDuration: 0,
  reduceCastTime: 0,
  expandArea: 0,
  selectedEnhancementIds: [],
  customEnhancementEG: 0,
  customEnhancementText: '',
  customEnhancementExtraFocus: 0,
  customEnhancementExtraFocusType: 'exhausted',
};

/**
 * Calculates total EG spent on modifications.
 */
export function calculateTotalEGSpent(
  allocations: SpellEGAllocations,
  availableEnhancements?: SpecificSpellEnhancement[]
): number {
  let specificEG = 0;
  if (allocations.selectedEnhancementIds && availableEnhancements) {
    for (const id of allocations.selectedEnhancementIds) {
      const found = availableEnhancements.find((e) => e.id === id);
      if (found) {
        specificEG += found.egCost;
      }
    }
  }

  return (
    (allocations.saveExhaustedFocus || 0) * 1 +
    (allocations.saveChanneledFocus || 0) * 2 +
    (allocations.saveConsumedFocus || 0) * 3 +
    (allocations.increaseDamage || 0) * 1 +
    (allocations.increaseRange || 0) * 1 +
    (allocations.increaseDuration || 0) * 2 +
    (allocations.reduceCastTime || 0) * 3 +
    (allocations.expandArea || 0) * 1 +
    specificEG +
    (allocations.customEnhancementEG || 0)
  );
}

export interface FinalSpellCosts {
  baseCost: ParsedFocusCost;
  effectiveExhausted: number;
  effectiveChanneled: number;
  effectiveConsumed: number;
  totalFocus: number;
  effectiveCastTicks: number; // standard trigger time is 3 ticks, reducible by reduceCastTime
  modificationsSummary: string[];
}

/**
 * Calculates final focus costs and effects after applying EG modifications.
 */
export function calculateFinalSpellCosts(
  parsedBase: ParsedFocusCost,
  allocations: SpellEGAllocations,
  availableEnhancements?: SpecificSpellEnhancement[]
): FinalSpellCosts {
  // 1 EG saves 1 exhausted focus (minimum cost: 1 if originally > 0)
  let effectiveExhausted = parsedBase.exhausted;
  if (effectiveExhausted > 0 && allocations.saveExhaustedFocus > 0) {
    const maxReduction = Math.max(0, effectiveExhausted - 1);
    const reduction = Math.min(maxReduction, allocations.saveExhaustedFocus);
    effectiveExhausted -= reduction;
  }

  // 2 EG saves 1 channeled focus (minimum cost: 1 if originally > 0)
  let effectiveChanneled = parsedBase.channeled;
  if (effectiveChanneled > 0 && allocations.saveChanneledFocus > 0) {
    const maxReduction = Math.max(0, effectiveChanneled - 1);
    const reduction = Math.min(maxReduction, allocations.saveChanneledFocus);
    effectiveChanneled -= reduction;
  }

  // 3 EG saves 1 consumed focus (minimum cost: 1 if originally > 0)
  let effectiveConsumed = parsedBase.consumed;
  if (effectiveConsumed > 0 && allocations.saveConsumedFocus > 0) {
    const maxReduction = Math.max(0, effectiveConsumed - 1);
    const reduction = Math.min(maxReduction, allocations.saveConsumedFocus);
    effectiveConsumed -= reduction;
  }

  // Apply extra focus from selected specific enhancements
  const modificationsSummary: string[] = [];
  if (allocations.saveExhaustedFocus > 0) {
    modificationsSummary.push(`-${allocations.saveExhaustedFocus} Erschöpfter Fokus (${allocations.saveExhaustedFocus} EG)`);
  }
  if (allocations.saveChanneledFocus > 0) {
    modificationsSummary.push(`-${allocations.saveChanneledFocus} Kanalisierter Fokus (${allocations.saveChanneledFocus * 2} EG)`);
  }
  if (allocations.saveConsumedFocus > 0) {
    modificationsSummary.push(`-${allocations.saveConsumedFocus} Verzehrter Fokus (${allocations.saveConsumedFocus * 3} EG)`);
  }
  if (allocations.increaseDamage > 0) {
    modificationsSummary.push(`+${allocations.increaseDamage} Schaden (${allocations.increaseDamage} EG)`);
  }
  if (allocations.increaseRange > 0) {
    modificationsSummary.push(`+${allocations.increaseRange}x Grundreichweite (${allocations.increaseRange} EG)`);
  }
  if (allocations.increaseDuration > 0) {
    modificationsSummary.push(`+${allocations.increaseDuration}x Grundwirkungsdauer (${allocations.increaseDuration * 2} EG)`);
  }
  if (allocations.reduceCastTime > 0) {
    modificationsSummary.push(`-${allocations.reduceCastTime} Ticks Auslösezeit (${allocations.reduceCastTime * 3} EG)`);
  }
  if (allocations.expandArea > 0) {
    modificationsSummary.push(`+${allocations.expandArea} Stufe(n) Wirkungsbereich (${allocations.expandArea} EG)`);
  }

  if (allocations.selectedEnhancementIds && availableEnhancements) {
    for (const id of allocations.selectedEnhancementIds) {
      const found = availableEnhancements.find((e) => e.id === id);
      if (found) {
        effectiveExhausted += found.focusDelta.exhausted;
        effectiveChanneled += found.focusDelta.channeled;
        effectiveConsumed += found.focusDelta.consumed;
        const costNote = found.focusCostRaw ? ` [Kosten ${found.focusCostRaw}]` : '';
        modificationsSummary.push(`Verstärkung: ${found.description}${costNote} (${found.egCost} EG)`);
      }
    }
  }

  // Add extra focus from custom/spell-specific enhancement if configured
  if (allocations.customEnhancementExtraFocus > 0) {
    if (allocations.customEnhancementExtraFocusType === 'consumed') {
      effectiveConsumed += allocations.customEnhancementExtraFocus;
    } else if (allocations.customEnhancementExtraFocusType === 'channeled') {
      effectiveChanneled += allocations.customEnhancementExtraFocus;
    } else {
      effectiveExhausted += allocations.customEnhancementExtraFocus;
    }
  }

  if (allocations.customEnhancementEG > 0) {
    modificationsSummary.push(
      `Eigene Verstärkung: ${allocations.customEnhancementText || 'Zauberverstärkung'} (${allocations.customEnhancementEG} EG)`
    );
  }

  const effectiveCastTicks = Math.max(1, 3 - (allocations.reduceCastTime || 0));

  return {
    baseCost: parsedBase,
    effectiveExhausted,
    effectiveChanneled,
    effectiveConsumed,
    totalFocus: effectiveExhausted + effectiveChanneled + effectiveConsumed,
    effectiveCastTicks,
    modificationsSummary,
  };
}

export interface SpellEnhancementOption {
  id: string;
  name: string;
  shortLabel: string;
  description: string;
  focusDelta: number;
  focusType: 'exhausted' | 'channeled' | 'consumed';
  icon: string;
}

export const STANDARD_SPELL_ENHANCEMENTS: SpellEnhancementOption[] = [
  {
    id: 'duration',
    name: 'Wirkungsdauer erhöhen',
    shortLabel: '+Wirkungsdauer',
    description: 'Verlängert die Wirkungsdauer um eine Stufe (+2 FO)',
    focusDelta: 2,
    focusType: 'exhausted',
    icon: '⏱️',
  },
  {
    id: 'range',
    name: 'Reichweite verdoppeln',
    shortLabel: '+Reichweite',
    description: 'Verdoppelt die Reichweite des Zaubers (+2 FO)',
    focusDelta: 2,
    focusType: 'exhausted',
    icon: '🏹',
  },
  {
    id: 'area',
    name: 'Wirkungsbereich vergrößern / Mehrere Ziele',
    shortLabel: '+Bereich/Ziele',
    description: 'Erhöht Wirkungsbereich (+1m / +1 Ziel) (+2 FO)',
    focusDelta: 2,
    focusType: 'exhausted',
    icon: '👥',
  },
  {
    id: 'potency',
    name: 'Schaden / Effekt verstärken',
    shortLabel: '+Wirkung',
    description: 'Erhöht Schaden, Schutz oder Effektstufe (+2 FO)',
    focusDelta: 2,
    focusType: 'exhausted',
    icon: '⚡',
  },
  {
    id: 'speed',
    name: 'Zauberdauer verkürzen (Schnellzaubern)',
    shortLabel: 'Schnellzaubern',
    description: 'Verkürzt Zauberdauer um z. B. 3 Ticks (+2 FO)',
    focusDelta: 2,
    focusType: 'exhausted',
    icon: '💨',
  },
  {
    id: 'focus_saving',
    name: 'Fokus einsparen (Meisterschaft / EG)',
    shortLabel: '-1 Fokus',
    description: 'Reduziert den Fokusaufwand um 1 Punkt (-1 FO)',
    focusDelta: -1,
    focusType: 'exhausted',
    icon: '💎',
  },
];

export interface ParsedSpellDamage {
  hasDamage: boolean;
  diceCount: number;
  diceSides: number;
  baseBonus: number;
  formula: string; // e.g. "2W6" or "3W6+3"
  damageType: string; // e.g. "Feuerschaden", "Kälteschaden", "Schaden"
}

export function parseSpellDamage(description?: string, spellName?: string): ParsedSpellDamage | null {
  const text = `${spellName || ''} ${description || ''}`;
  if (!text.trim()) return null;

  // Match patterns like "2W6", "3w6+3", "1W10", "2W10+2", "1W6 + 3"
  const match = text.match(/(\d+)\s*[wW](\d+)(?:\s*\+\s*(\d+))?/);
  if (!match) return null;

  const diceCount = parseInt(match[1], 10) || 1;
  const diceSides = parseInt(match[2], 10) || 6;
  const baseBonus = match[3] ? parseInt(match[3], 10) || 0 : 0;
  const formula = baseBonus > 0 ? `${diceCount}W${diceSides}+${baseBonus}` : `${diceCount}W${diceSides}`;

  // Detect damage type
  let damageType = 'Schaden';
  const lower = text.toLowerCase();
  if (lower.includes('feuerschaden') || lower.includes('feuer')) {
    damageType = 'Feuerschaden';
  } else if (lower.includes('kälteschaden') || lower.includes('kälte') || lower.includes('eis')) {
    damageType = 'Kälteschaden';
  } else if (lower.includes('blitzschaden') || lower.includes('blitz') || lower.includes('elektrizität')) {
    damageType = 'Blitzschaden';
  } else if (lower.includes('lichtschaden') || lower.includes('lichtblitz')) {
    damageType = 'Lichtschaden';
  } else if (lower.includes('echten schaden') || lower.includes('echter schaden')) {
    damageType = 'Echter Schaden';
  } else if (lower.includes('direkten schaden') || lower.includes('direkter schaden')) {
    damageType = 'Direkter Schaden';
  } else if (lower.includes('geistesschaden') || lower.includes('geist')) {
    damageType = 'Geistesschaden';
  } else if (lower.includes('fels') || lower.includes('erde') || lower.includes('stein')) {
    damageType = 'Physischer Schaden';
  }

  return {
    hasDamage: true,
    diceCount,
    diceSides,
    baseBonus,
    formula,
    damageType,
  };
}

export interface SpellDamageRollResult {
  formula: string;
  diceCount: number;
  diceSides: number;
  dice: number[];
  diceSum: number;
  baseBonus: number;
  egBonus: number;
  total: number;
  damageType: string;
}

export function executeSpellDamageRoll(
  diceCount: number,
  diceSides: number,
  baseBonus: number = 0,
  egBonus: number = 0,
  damageType: string = 'Schaden',
  manualDice?: number[]
): SpellDamageRollResult {
  const dice: number[] = [];
  if (manualDice && manualDice.length === diceCount) {
    dice.push(...manualDice);
  } else {
    for (let i = 0; i < diceCount; i++) {
      dice.push(Math.floor(Math.random() * diceSides) + 1);
    }
  }
  const diceSum = dice.reduce((a, b) => a + b, 0);
  const total = Math.max(0, diceSum + baseBonus + egBonus);
  const formulaParts = [`${diceCount}W${diceSides}`];
  if (baseBonus > 0) formulaParts.push(`+${baseBonus}`);
  if (egBonus > 0) formulaParts.push(`+${egBonus} EG`);

  return {
    formula: formulaParts.join(' '),
    diceCount,
    diceSides,
    dice,
    diceSum,
    baseBonus,
    egBonus,
    total,
    damageType,
  };
}

