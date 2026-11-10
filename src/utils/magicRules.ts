import { SPELLS_DB, type Spell as DbSpell } from '../data/spells';
import { getSpellDescription } from './gameResourceManager';
import type { Spell } from '../types';
import { SKILL_DATA } from '../data/rules';

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
 * Regel (GRW, Kanalisierte Zauber): Die Zahl hinter V ist ein Teil der Gesamtkosten, nicht zusätzlich.
 * „K6V2 sind 6 kanalisierte Punkte Fokus insgesamt, davon werden 2 sofort verzehrt.“
 * - "4": 4 exhausted focus
 * - "K1": 1 channeled focus
 * - "4V1": total 4 focus (3 exhausted, 1 consumed)
 * - "K4V1": total 4 focus (3 channeled, 1 consumed)
 * - "12V3": total 12 focus (9 exhausted, 3 consumed)
 * - "K8V2": total 8 focus (6 channeled, 2 consumed)
 * `exhausted`/`channeled` sind jeweils nur der nicht verzehrte Anteil.
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
    // Non-channeled: e.g. "4", "5V2" (insgesamt 5, davon 2 verzehrt)
    const numMatch = raw.match(/^(\d+)/);
    if (numMatch) {
      exhausted = parseInt(numMatch[1], 10) || 0;
    }
  }

  // V ist Teil der genannten Gesamtkosten
  consumed = Math.min(consumed, isChanneled ? channeled : exhausted);
  if (isChanneled) channeled -= consumed; else exhausted -= consumed;
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
    difficulty: spell.difficulty ?? dbEntry?.difficulty,
    difficultyType: spell.difficultyType ?? dbEntry?.difficultyType,
    difficultyValue: spell.difficultyValue ?? dbEntry?.difficultyValue,
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
 * Parst die zusätzlichen Fokuskosten einer Zauber-Verstärkung („Kosten +K1V1“).
 *
 * Die Schreibweise ist dieselbe wie bei den Grundkosten: Die Zahl hinter V ist ein Teil der genannten Punkte, nicht
 * zusätzlich. Beleg (GRW S. 221–222, Verzehrter Fokus): „Für je 3 EG kann 1 Punkt verzehrter Fokus eingespart werden
 * (Kosten -(K)1V1)“ – „1V1“ ist also genau 1 Punkt, und der ist verzehrt.
 * - "+K1V1": +1 Punkt, davon 1 verzehrt  (K4V1 → K5V2)
 * - "+1V1":  +1 Punkt, davon 1 verzehrt  (4V1 → 5V2)
 * - "+K2V2": +2 Punkte, beide verzehrt   (K8V2 → K10V4)
 * - "+2V1":  +2 Punkte, davon 1 verzehrt
 * - "+K1":   +1 kanalisierter Punkt
 */
export function parseEnhancementFocusDelta(rawInput?: string | null): ParsedFocusCost {
  const raw = String(rawInput ?? '0').trim();
  const delta = parseFocusCost(raw.replace(/^\+\s*/, ''));
  return { ...delta, raw: delta.total === 0 ? '0' : raw };
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
      const focusDelta = parseEnhancementFocusDelta(extraRaw);
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
        focusDelta: parseEnhancementFocusDelta('0'),
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
  expandArea: number;          // 3 EG per base area increase (GRW S. 221–222)
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
    (allocations.expandArea || 0) * 3 + // GRW S. 221–222: Wirkungsbereich je 3 EG
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

  // 3 EG sparen 1 Punkt verzehrten Fokus (GRW S. 221–222: „Die Mindestkosten betragen 1 erschöpften oder kanalisierten
  // Fokuspunkt“). Der verzehrte Anteil darf also ganz entfallen, solange ein nicht verzehrter Punkt bleibt.
  let effectiveConsumed = parsedBase.consumed;
  if (effectiveConsumed > 0 && allocations.saveConsumedFocus > 0) {
    const restBleibt = effectiveExhausted + effectiveChanneled >= 1;
    const maxReduction = restBleibt ? effectiveConsumed : Math.max(0, effectiveConsumed - 1);
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
    modificationsSummary.push(`+${allocations.expandArea}x Grundwirkungsbereich (${allocations.expandArea * 3} EG)`);
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

export interface ActiveSpellModifiers {
  vtdBonus: number;
  srBonus: number;
  gwBonus: number;
  kwBonus: number;
  gswBonus: number;
  woundPenaltyReduction: number;
  /** Hinweise, wenn Boni begrenzt wurden oder ein Zauber wegen eines stärkeren gleichen Typs nicht zählt */
  hinweise: string[];
  breakdown: Array<{
    spellName: string;
    vtd?: number;
    sr?: number;
    gw?: number;
    kw?: number;
    gsw?: number;
    woundPenaltyReduction?: number;
    description: string;
  }>;
}

/**
 * Prüft, ob ein aktiver Zauber mit seiner Verstärkungsoption gewirkt wurde. Jeder Zauber hat genau eine Verstärkung und
 * sie ist nur einmal wählbar (GRW S. 221–222), deshalb genügt „eine Verstärkung gewählt“. Für ältere Einträge ohne
 * `selectedEnhancementIds` wird der Text der Notizen durchsucht.
 */
export function isSpellEnhanced(cs: import('../types').ChanneledSpell, searchPatterns: string[] = []): boolean {
  if (cs.selectedEnhancementIds && cs.selectedEnhancementIds.length > 0) return true;
  const combined = `${cs.notes || ''} ${(cs.enhancements || []).join(' ')}`.toLowerCase();
  if (/verstärk|\+\s*k?\d+v\d+/.test(combined)) return true;
  return searchPatterns.some((p) => combined.includes(p.toLowerCase()));
}

type ZauberWerte = { vtd?: number; sr?: number; gw?: number; kw?: number; gsw?: number; wund?: number };

/**
 * Wirkungen kanalisierter GRW-Zauber auf Kampfwerte, geprüft gegen die Zauberbeschreibungen im Regelpaket
 * (public/regelpakete/grw.srp.json). `v` = Werte mit gewählter Verstärkung (ersetzen die Grundwerte).
 * `typ`: Zauber desselben Typs sind nicht kombinierbar (Zaubertext: „nicht mit anderen Zaubern kombinierbar, die
 * ebenfalls den Typus Haut / die Typen Rüstung und Schutzfeld besitzen“) – es zählt nur der stärkste.
 * „Widerstandswerte“ sind VTD, GW und KW (GRW S. 15).
 */
export const ZAUBER_KAMPFWERTE: Record<string, { basis: ZauberWerte; v?: ZauberWerte; typ?: 'haut' | 'schutzfeld' }> = {
  'steinhaut': { basis: { vtd: 2, sr: 2 }, v: { vtd: 2, sr: 3 }, typ: 'haut' },                 // S. 246
  'rindenhaut': { basis: { vtd: 1, sr: 1 }, v: { vtd: 1, sr: 2 }, typ: 'haut' },                // S. 240
  'stahlhaut': { basis: { vtd: 4, sr: 4 }, v: { vtd: 4, sr: 5 }, typ: 'haut' },                 // S. 245
  'eins mit dem feuer': { basis: { sr: 5 } },                                                   // S. 225
  'leib aus licht': { basis: { sr: 4 } },                                                       // S. 235
  'schattenleib': { basis: { sr: 4 } },                                                         // S. 241
  'magische rüstung': { basis: { vtd: 2 }, v: { vtd: 3 }, typ: 'schutzfeld' },                  // S. 237
  'magischer panzer': { basis: { vtd: 4 }, v: { vtd: 5 }, typ: 'schutzfeld' },                  // S. 237
  'eiserne aura': { basis: { vtd: 2 } },                                                        // S. 226
  'aura des anführers': { basis: { vtd: 2, gw: 2, kw: 2 } },                                    // S. 224
  'widerstände erhöhen': { basis: { vtd: 2, gw: 2, kw: 2 }, v: { vtd: 3, gw: 3, kw: 3 } },      // S. 252
  'hohe segnung': { basis: { vtd: 2, gw: 2, kw: 2 }, v: { vtd: 3, gw: 3, kw: 3 } },             // S. 233
  'segnung': { basis: { vtd: 1, gw: 1, kw: 1 }, v: { vtd: 2, gw: 2, kw: 2 } },                  // S. 244
  'aura der entschlossenheit': { basis: { gw: 1 } },                                            // S. 223
  'beschleunigen': { basis: { gsw: 2 }, v: { gsw: 4 } },                                        // S. 224
  'schmerzen widerstehen': { basis: { wund: 3 }, v: { wund: 4 } },                              // S. 243
  'schmerzen ignorieren': { basis: { wund: 6 }, v: { wund: 8 } },                               // S. 243
  'aura der schmerzlosigkeit': { basis: { wund: 999 } },                                        // S. 223
};

/** Zauber ohne Zahl auf dem Bogen: nur als Hinweis am aktiven Zauber (Grundwirkung / mit Verstärkung) */
const ZAUBER_HINWEISE: Record<string, [string, string?]> = {
  'kleiner magieschutz': ['Gegen das Ziel gerichtete Zauber: Malus 1', 'Gegen das Ziel gerichtete Zauber: Malus 2'],       // S. 234
  'großer magieschutz': ['Gegen das Ziel gerichtete Zauber: Malus 4', 'Gegen das Ziel gerichtete Zauber: Malus 6'],        // S. 232
  'schutz vor kälte': ['Kälteschaden um 4 gesenkt', 'Kälteschaden um 6 gesenkt'],                                          // S. 244
  'schutz vor elektrizität': ['Elektrizitätsschaden um 6 gesenkt', 'Elektrizitätsschaden um 8 gesenkt'],                   // S. 243
  'schutz vor elementen': ['Elementarschaden um 10 gesenkt', 'Elementarschaden um 12 gesenkt'],                            // S. 243
  'über wasser gehen': ['', '+2 GSW auf dem Wasser'],                                                                      // S. 248
  'geistreise': ['', 'SR 5 in der Geisterwelt'],                                                                           // S. 231
};

/**
 * Höchstbonus aus der Quelle Zauberei auf eine Probe oder einen abgeleiteten Wert: zu Spielbeginn 3, je Heldengrad +1
 * (GRW S. 18–19, S. 88–89). Ausrüstung ist eine eigene Quelle mit eigenem Höchstbonus.
 */
export function zauberHoechstbonus(calc?: { regelwerk?: { hoechstbonus?: number } | null; heldengrad?: { name?: string } } | null): number {
  const ausPaket = calc?.regelwerk?.hoechstbonus;
  if (typeof ausPaket === 'number' && ausPaket > 0) return ausPaket;
  const m = (calc?.heldengrad?.name ?? '').match(/Heldengrad\s*(\d)/);
  return 3 + Math.max(0, (m ? Number(m[1]) : 1) - 1);
}

/**
 * Ermittelt Boni auf Kampfwerte (VTD, SR, GW, KW, GSW, Wundabzüge) aus aktiven Zaubern nach Splittermond GRW.
 * `hoechstbonus`: Höchstbonus aus Zauberei (siehe zauberHoechstbonus). VTD, GW, KW und GSW sind abgeleitete Werte und
 * werden darauf begrenzt; die Schadensreduktion ist kein abgeleiteter Wert und bleibt unbegrenzt.
 */
export function getActiveSpellModifiers(
  channeledSpells: import('../types').ChanneledSpell[] = [],
  hoechstbonus?: number
): ActiveSpellModifiers {
  const breakdown: ActiveSpellModifiers['breakdown'] = [];
  const hinweise: string[] = [];
  const kandidaten: Array<{ cs: import('../types').ChanneledSpell; w: ZauberWerte; typ?: string; verstaerkt: boolean }> = [];

  for (const cs of channeledSpells) {
    const name = (cs.name || '').trim().toLowerCase();
    const verstaerkt = isSpellEnhanced(cs);
    const eintrag = ZAUBER_KAMPFWERTE[name];
    if (eintrag) {
      kandidaten.push({ cs, w: verstaerkt && eintrag.v ? eintrag.v : eintrag.basis, typ: eintrag.typ, verstaerkt: verstaerkt && !!eintrag.v });
      continue;
    }
    const hinweis = ZAUBER_HINWEISE[name];
    if (hinweis) {
      const text = verstaerkt && hinweis[1] ? hinweis[1] : hinweis[0];
      if (text) breakdown.push({ spellName: cs.name, description: `${text}${verstaerkt && hinweis[1] ? ' (verstärkt)' : ''}` });
    }
  }

  // Nicht kombinierbare Typen: nur der stärkste Zauber zählt
  const staerke = (w: ZauberWerte) => (w.vtd ?? 0) + (w.sr ?? 0);
  const bester: Record<string, (typeof kandidaten)[number]> = {};
  for (const k of kandidaten) if (k.typ && (!bester[k.typ] || staerke(k.w) > staerke(bester[k.typ].w))) bester[k.typ] = k;

  let vtdBonus = 0, srBonus = 0, gwBonus = 0, kwBonus = 0, gswBonus = 0, woundPenaltyReduction = 0;
  for (const k of kandidaten) {
    if (k.typ && bester[k.typ] !== k) {
      hinweise.push(`${k.cs.name} zählt nicht: nicht kombinierbar mit ${bester[k.typ].cs.name}`);
      breakdown.push({ spellName: k.cs.name, description: `zählt nicht (nicht kombinierbar mit ${bester[k.typ].cs.name})` });
      continue;
    }
    const w = k.w;
    vtdBonus += w.vtd ?? 0; srBonus += w.sr ?? 0; gwBonus += w.gw ?? 0; kwBonus += w.kw ?? 0; gswBonus += w.gsw ?? 0;
    woundPenaltyReduction = Math.max(woundPenaltyReduction, w.wund ?? 0);
    const teile = [
      w.vtd ? `+${w.vtd} VTD` : '', w.sr ? `+${w.sr} SR` : '', w.gw ? `+${w.gw} GW` : '', w.kw ? `+${w.kw} KW` : '', w.gsw ? `+${w.gsw} GSW` : '',
      w.wund ? (w.wund >= 999 ? 'Wundabzüge ignoriert' : `Wundabzug um ${w.wund} gesenkt`) : '',
    ].filter(Boolean);
    breakdown.push({
      spellName: k.cs.name, vtd: w.vtd, sr: w.sr, gw: w.gw, kw: w.kw, gsw: w.gsw, woundPenaltyReduction: w.wund,
      description: `${teile.join(', ')}${k.verstaerkt ? ' (verstärkt)' : ''}`,
    });
  }

  if (hoechstbonus !== undefined) {
    const kappen = (wert: number, label: string) => {
      if (wert > hoechstbonus) { hinweise.push(`${label}: Zauberbonus ${wert} auf Höchstbonus ${hoechstbonus} begrenzt (GRW S. 18)`); return hoechstbonus; }
      return wert;
    };
    vtdBonus = kappen(vtdBonus, 'VTD'); gwBonus = kappen(gwBonus, 'GW'); kwBonus = kappen(kwBonus, 'KW'); gswBonus = kappen(gswBonus, 'GSW');
  }

  return { vtdBonus, srBonus, gwBonus, kwBonus, gswBonus, woundPenaltyReduction, hinweise, breakdown };
}

export interface ActiveSpellRollBonus {
  id: string;
  source: string;
  bonus: number;
  description: string;
  /** false: nur in bestimmten Lagen – wird angeboten, ist aber nicht vorausgewählt */
  active: boolean;
}

const KAMPFFERTIGKEITEN = ['handgemenge', 'hiebwaffen', 'kettenwaffen', 'klingenwaffen', 'schusswaffen', 'stangenwaffen', 'wurfwaffen'];

/**
 * Probenboni aus aktiven GRW-Zaubern für Fertigkeits- und Angriffswürfe, geprüft gegen die Zauberbeschreibungen im
 * Regelpaket. Einträge mit `active: false` gelten nur in einer Lage (z. B. Sicht verbessern: nur Proben, die die Sicht
 * betreffen) und sind deshalb nicht vorausgewählt. Die Summe ist auf den Höchstbonus aus Zauberei begrenzt
 * (siehe begrenzeZauberbonus).
 */
export function getActiveSpellRollBonuses(
  channeledSpells: import('../types').ChanneledSpell[] = [],
  skillName: string,
  isCombatAttack: boolean = false,
  weaponId?: string
): ActiveSpellRollBonus[] {
  const result: ActiveSpellRollBonus[] = [];
  const cleanSkill = (skillName || '').trim();
  const lowerSkill = cleanSkill.toLowerCase();
  const attrs: string[] = SKILL_DATA[cleanSkill] || [];
  const istAngriff = isCombatAttack || KAMPFFERTIGKEITEN.includes(lowerSkill);
  const waffenlos = istWaffenlos(weaponId);

  const neu = (cs: import('../types').ChanneledSpell, kurz: string, bonus: number, description: string, active = true) =>
    result.push({ id: `spell-bonus-${cs.id}-${kurz}`, source: cs.name, bonus, description, active });

  // Attributszauber: bei Fertigkeiten über deren Attribute. Bei Angriffen hängen die Attribute von der Waffe ab
  // (GRW-Waffentabelle), die der Editor nicht kennt – dort anbieten, aber nicht vorauswählen.
  const attribut = (cs: import('../types').ChanneledSpell, kurz: string, attr: string, attrName: string, bonus: number, verstaerkt: boolean) => {
    if (istAngriff) neu(cs, kurz, bonus, `+${bonus}, wenn ${attrName} ein Attribut der Waffe ist${verstaerkt ? ' (verstärkt)' : ''}`, false);
    else if (attrs.includes(attr) || cleanSkill.toUpperCase() === attr || lowerSkill === attrName.toLowerCase()) neu(cs, kurz, bonus, `+${bonus} auf Proben mit ${attrName}${verstaerkt ? ' (verstärkt)' : ''}`);
  };

  for (const cs of channeledSpells) {
    const name = (cs.name || '').trim().toLowerCase();
    const v = isSpellEnhanced(cs);

    // 1. Alle Fertigkeitsproben
    if (name === 'hohe segnung') neu(cs, 'hohe-segnung', v ? 3 : 2, `+${v ? 3 : 2} auf alle Fertigkeitsproben${v ? ' (verstärkt)' : ''}`);         // S. 233
    else if (name === 'segnung') neu(cs, 'segnung', v ? 2 : 1, `+${v ? 2 : 1} auf alle Fertigkeitsproben${v ? ' (verstärkt)' : ''}`);              // S. 244

    // 2. Angriffe
    if (istAngriff) {
      if (name === 'aura des anführers') neu(cs, 'aura-anfuehrer', 2, '+2 auf alle Angriffe');                                                   // S. 224
      if (name === 'beflügelte waffe' && !waffenlos && zielTrifft(cs, weaponId)) {
        neu(cs, 'befluegelte-waffe', v ? 3 : 2, `+${v ? 3 : 2} auf Angriffe mit der verzauberten Waffe${v ? ' (verstärkt)' : ''}`);                // S. 224
      }
      if (name === 'waffe des lichtes' && !waffenlos && zielTrifft(cs, weaponId)) {
        neu(cs, 'waffe-des-lichtes', 2, '+2 nur gegen Untote, Geisterwesen und Schattenwesen', false);                                           // S. 250
      }
    }

    // 3. Attribute
    if (name === 'katzenreflexe') attribut(cs, 'katzenreflexe', 'BEW', 'Beweglichkeit', 2, false);                                               // S. 234
    if (name === 'bärenstärke') attribut(cs, 'baerenstaerke', 'STA', 'Stärke', v ? 5 : 4, v);                                                    // S. 224
    if (name === 'eulengespür') attribut(cs, 'eulengespuer', 'INT', 'Intuition', v ? 4 : 3, v);                                                  // S. 227
    if (name === 'inneres leuchten') attribut(cs, 'inneres-leuchten', 'AUS', 'Ausstrahlung', v ? 5 : 4, v);                                      // S. 233

    // 4. Einzelne Fertigkeiten
    if (lowerSkill === 'wahrnehmung') {
      if (name === 'sinne verstärken') neu(cs, 'sinne-verstaerken', v ? 7 : 5, `+${v ? 7 : 5} auf Wahrnehmung${v ? ' (verstärkt)' : ''}`);        // S. 245
      if (name === 'sicht verbessern') neu(cs, 'sicht', v ? 5 : 3, `+${v ? 5 : 3} nur auf Proben, die die Sicht betreffen`, false);               // S. 244
      if (name === 'gehör verbessern') neu(cs, 'gehoer', v ? 5 : 3, `+${v ? 5 : 3} nur auf Proben, die das Gehör betreffen`, false);              // S. 231
      if (name === 'nebelsicht' && v) neu(cs, 'nebelsicht', 2, '+2 nur in nebliger Umgebung', false);                                            // S. 239
    }
    if (lowerSkill === 'heimlichkeit') {
      if (name === 'aura der schatten' || name === 'schattenleib') neu(cs, 'schatten', 7, '+7 auf Heimlichkeit');                                // S. 223, 241
      if (name === 'verhüllung') neu(cs, 'verhuellung', v ? 5 : 3, `+${v ? 5 : 3} auf Heimlichkeit${v ? ' (verstärkt)' : ''}`);                   // S. 249
    }
    if (name === 'aura der entschlossenheit' && lowerSkill === 'entschlossenheit') neu(cs, 'entschlossenheit', 2, '+2 auf Entschlossenheit');    // S. 223
    // Klettern gehört zu Athletik; Akrobatik nur gegen das Herabstürzen
    if (name === 'spinnenlauf' && lowerSkill === 'athletik') neu(cs, 'spinnenlauf', v ? 6 : 4, `+${v ? 6 : 4} nur auf Proben zum Klettern`, false); // S. 245
    if (name === 'spinnenlauf' && lowerSkill === 'akrobatik') neu(cs, 'spinnenlauf', v ? 6 : 4, `+${v ? 6 : 4} nur, um nicht von einer Wand zu stürzen`, false);
    if (name === 'zunge des diplomaten' && (lowerSkill === 'diplomatie' || lowerSkill === 'redegewandtheit')) {
      neu(cs, 'zunge-diplomat', v ? 2 : 1, `+${v ? 2 : 1} auf Diplomatie und Redegewandtheit${v ? ' (verstärkt)' : ''}`);                         // S. 253
    }
    if (name === 'weg durch die natur' && lowerSkill === 'überleben') neu(cs, 'weg-natur', 3, '+3 nur auf Proben mit Bezug auf das Reisen', false); // S. 251
    if (name === 'freund der tiere' && lowerSkill === 'tierführung') neu(cs, 'freund-tiere', 1, '+1 auf Tierführung');                           // S. 230
  }

  return result;
}

/**
 * Summe der gewählten Zauberboni einer Probe, begrenzt auf den Höchstbonus aus Zauberei (GRW S. 18–19: „Der maximale
 * Bonus, den eine Probe oder ein Abgeleiteter Wert erhalten kann, beträgt zu Spielbeginn 3 Punkte aus jeder der beiden
 * Quellen Ausrüstung und Zauberei“).
 */
export function begrenzeZauberbonus(summe: number, hoechstbonus: number): number {
  return Math.min(summe, Math.max(0, hoechstbonus));
}

/** Waffenloser Angriff (Kennung „waffenlos“ oder die Ausrüstungs-ID der GRW-Liste) */
export function istWaffenlos(weaponId?: string, weaponName?: string): boolean {
  return (weaponId ?? '').toLowerCase().endsWith('waffenlos') || (weaponName ?? '').trim().toLowerCase() === 'waffenlos';
}

/** Trifft ein Waffenzauber diese Waffe? Mit gespeichertem Ziel nur genau diese Waffe; ohne Ziel (ältere Einträge) jede. */
function zielTrifft(cs: import('../types').ChanneledSpell, weaponId?: string, weaponName?: string): boolean {
  if (cs.targetItemId) return cs.targetItemId === weaponId;
  if (cs.targetItemName) return !!weaponName && cs.targetItemName.toLowerCase() === weaponName.toLowerCase();
  return true;
}

export interface SpellWeaponDamageBonus {
  fireDamage: number;
  lightDamage: number;
  /** übriger Zusatzschaden (Geschoss verzaubern, Krallen, Schockgriff) */
  otherDamage: number;
  /** Summe aller Zusatzschäden */
  totalDamage: number;
  bonusText: string;
}

/**
 * Zusatzschaden aus aktiven Zaubern für einen Angriff, geprüft gegen die Zauberbeschreibungen im Regelpaket.
 * - Waffenzauber (Typus Waffe) wirken nur auf die verzauberte Waffe. Für waffenlose Angriffe sind die Zauber des Typus
 *   Hand da (Flammenhand, Schockgriff) sowie Krallen; Waffenzauber auf waffenlose Angriffe lässt der Editor nicht zu
 *   (Auslegung: „Eine Waffe wird …“, keine eigene Regelstelle).
 * - Flammende Waffe, Waffe des Lichtes und Geschoss verzaubern sind untereinander nicht kombinierbar (Typen Schaden und
 *   Waffe) – es zählt der höchste Zusatzschaden.
 */
export function getSpellWeaponDamageBonus(
  channeledSpells: import('../types').ChanneledSpell[] = [],
  weaponId?: string,
  weaponName?: string
): SpellWeaponDamageBonus {
  const waffenlos = istWaffenlos(weaponId, weaponName);
  let fireDamage = 0, lightDamage = 0, otherDamage = 0;
  const parts: string[] = [];
  type Waffenschaden = { art: 'fire' | 'light' | 'other'; dmg: number; text: string };
  let waffe = null as Waffenschaden | null;

  for (const cs of channeledSpells) {
    const name = (cs.name || '').trim().toLowerCase();
    const v = isSpellEnhanced(cs);
    if (waffenlos) {
      if (name === 'flammenhand' && v) { fireDamage += 2; parts.push('+2 echter Feuerschaden (Flammenhand verstärkt)'); }                        // S. 229
      else if (name === 'schockgriff' && v) { otherDamage += 2; parts.push('+2 echter Elektrizitätsschaden (Schockgriff verstärkt)'); }          // S. 243
      else if (name === 'krallen' && v) { otherDamage += 1; parts.push('+1 Schaden (Krallen verstärkt)'); }                                      // S. 234
      continue;
    }
    if (!zielTrifft(cs, weaponId, weaponName)) continue;
    let k = null as Waffenschaden | null;
    if (name === 'flammende waffe') k = { art: 'fire', dmg: v ? 2 : 1, text: `Feuerschaden (Flammende Waffe${v ? ' verstärkt' : ''})` };           // S. 229
    else if (name === 'waffe des lichtes') k = { art: 'light', dmg: v ? 2 : 1, text: `Lichtschaden (Waffe des Lichtes${v ? ' verstärkt' : ''})` }; // S. 250
    else if (name === 'geschoss verzaubern') k = { art: 'other', dmg: v ? 3 : 2, text: `Schaden (Geschoss verzaubern${v ? ' verstärkt' : ''})` };  // S. 232
    if (k && (!waffe || k.dmg > waffe.dmg)) waffe = k;
  }
  if (waffe) {
    if (waffe.art === 'fire') fireDamage += waffe.dmg; else if (waffe.art === 'light') lightDamage += waffe.dmg; else otherDamage += waffe.dmg;
    parts.push(`+${waffe.dmg} ${waffe.text}`);
  }

  return { fireDamage, lightDamage, otherDamage, totalDamage: fireDamage + lightDamage + otherDamage, bonusText: parts.join(', ') };
}

export interface EquipmentSpellTargetCheck {
  isEquipmentSpell: boolean;
  targetsEquipment: boolean;
  equipmentType: 'weapon' | 'armor' | 'item' | null;
  targetCategory: string;
  constraintNote?: string;
  allowsUnarmed?: boolean;
}

/**
 * Prüft, ob ein Zauber ein bestimmtes Ausrüstungsstück im Inventar verzaubert
 * (z. B. Flammende Waffe auf Waffen; Rüstung schwächen auf Rüstung; Gegenstand verbessern auf Gegenstand).
 */
export function isEquipmentTargetingSpell(
  spellOrName: string | { name?: string; target?: string; description?: string; range?: string }
): EquipmentSpellTargetCheck {
  const KEIN_ZIEL: EquipmentSpellTargetCheck = { isEquipmentSpell: false, targetsEquipment: false, equipmentType: null, targetCategory: '', allowsUnarmed: true };
  const reichweite = typeof spellOrName === 'object' ? (spellOrName.range || '').trim().toLowerCase() : '';
  const nameVorab = (typeof spellOrName === 'string' ? spellOrName : spellOrName.name || '').trim().toLowerCase();
  // Reichweite „Zauberer“: der Zauber wirkt auf den Zauberer selbst (Magische Rüstung, Magischer Panzer, Steinhaut,
  // Geisterdolch …), nicht auf ein Ausrüstungsstück. Rüstung schwächen trifft die Rüstung eines Gegners.
  if (reichweite === 'zauberer' || ['magische rüstung', 'magischer panzer', 'rüstung schwächen'].includes(nameVorab)) return KEIN_ZIEL;

  const name = typeof spellOrName === 'string'
    ? spellOrName.trim().toLowerCase()
    : (spellOrName.name || '').trim().toLowerCase();
  const target = typeof spellOrName === 'object' && spellOrName.target
    ? spellOrName.target.toLowerCase()
    : '';

  // Spells targeting manufactured weapons (Waffen):
  const isWeaponSpell =
    name === 'flammende waffe' ||
    name === 'waffe des lichtes' ||
    name === 'beflügelte waffe' ||
    name === 'weihe' ||
    name === 'rankenpfeil' ||
    name === 'geschoss verzaubern' ||
    (target.includes('waffe') && !target.includes('herbeirufung') && !name.includes('aus licht') && !name.includes('dolch'));

  if (isWeaponSpell) {
    return {
      isEquipmentSpell: true,
      targetsEquipment: true,
      equipmentType: 'weapon',
      targetCategory: 'Waffe',
      allowsUnarmed: false,
      constraintNote: 'Nur Waffen aus dem Inventar. Für waffenlose Angriffe gibt es eigene Zauber (z. B. Flammenhand, Schockgriff, Krallen).',
    };
  }

  // Spells targeting armors / shields
  const isArmorSpell = target.includes('rüstung') && !target.includes('haut');

  if (isArmorSpell) {
    return {
      isEquipmentSpell: true,
      targetsEquipment: true,
      equipmentType: 'armor',
      targetCategory: 'Rüstung',
      allowsUnarmed: false,
      constraintNote: 'Nur getragene oder im Inventar befindliche Rüstungen und Schilde.',
    };
  }

  // Spells targeting general physical items
  const isItemSpell =
    name === 'gegenstand verbessern' ||
    name === 'metall erhitzen' ||
    target.includes('gegenstand') ||
    target.includes('objekt');

  if (isItemSpell) {
    return {
      isEquipmentSpell: true,
      targetsEquipment: true,
      equipmentType: 'item',
      targetCategory: 'Gegenstand',
      allowsUnarmed: false,
      constraintNote: 'Gegenstände aus dem Inventar.',
    };
  }

  return {
    isEquipmentSpell: false,
    targetsEquipment: false,
    equipmentType: null,
    targetCategory: '',
    allowsUnarmed: true,
  };
}

/**
 * Kombiniert eine Grundschadensformel (z. B. "1W6+1") mit Zusatzschadenspunkten (z. B. 2)
 * zu einer validen Standard-Würfelformel (z. B. "1W6+3" statt "1W6+1+2").
 */
export function combineDamageFormula(baseDamage: string, extraDamage: number): string {
  if (!extraDamage || extraDamage === 0) return baseDamage || '1W6';
  const clean = (baseDamage || '1W6').trim();
  const match = clean.match(/^(\d*W\d+)(.*)$/i);
  if (!match) {
    return `${clean}+${extraDamage}`;
  }
  const dicePart = match[1];
  const rest = match[2].trim();
  let existingMod = 0;
  if (rest) {
    const numMatches = rest.match(/([+-]\s*\d+)/g);
    if (numMatches) {
      for (const m of numMatches) {
        existingMod += parseInt(m.replace(/\s+/g, ''), 10) || 0;
      }
    }
  }
  const totalMod = existingMod + extraDamage;
  if (totalMod === 0) return dicePart;
  if (totalMod > 0) return `${dicePart}+${totalMod}`;
  return `${dicePart}${totalMod}`;
}

export interface WeaponEnchantmentInfo {
  hasEnchantment: boolean;
  fireDamage: number;
  lightDamage: number;
  atBonus: number;
  spells: Array<{
    name: string;
    description: string;
    badgeText: string;
    badgeVariant: 'fire' | 'light' | 'magic';
  }>;
  extraDamageText: string;      // z. B. "+2 Feuer"
  damageFormulaDisplay: string; // z. B. "1W6+1 (+2 Feuer)"
  damageRollFormula: string;    // z. B. "1W6+1+2"
  buttonDamageLabel: string;    // z. B. "1W6+1 (+2 Feuer) Schaden"
}

/**
 * Ermittelt alle aktiven Verzauberungen auf einer konkreten Waffe (z. B. Katar mit Flammende Waffe +2 Feuer).
 */
export function getWeaponEnchantments(
  weapon: { id?: string; name: string; damage?: string },
  channeledSpells: import('../types').ChanneledSpell[] = []
): WeaponEnchantmentInfo {
  const baseDamage = weapon.damage || '1W6';
  const schaden = getSpellWeaponDamageBonus(channeledSpells, weapon.id, weapon.name);
  const spells: WeaponEnchantmentInfo['spells'] = [];
  let atBonus = 0;

  if (!istWaffenlos(weapon.id, weapon.name)) {
    for (const cs of channeledSpells) {
      if (!zielTrifft(cs, weapon.id, weapon.name)) continue;
      const name = (cs.name || '').trim().toLowerCase();
      const v = isSpellEnhanced(cs);
      if (name === 'flammende waffe' && schaden.fireDamage > 0) {
        spells.push({ name: 'Flammende Waffe', description: `+${schaden.fireDamage} Feuerschaden`, badgeText: `+${schaden.fireDamage} Feuer`, badgeVariant: 'fire' });
      } else if (name === 'waffe des lichtes') {
        // Der Angriffsbonus +2 gilt nur gegen Untote, Geisterwesen und Schattenwesen und steht deshalb nicht im AT-Wert
        spells.push({
          name: 'Waffe des Lichtes',
          description: `${schaden.lightDamage > 0 ? `+${schaden.lightDamage} Lichtschaden, ` : ''}+2 AT nur gegen Untote, Geisterwesen, Schattenwesen`,
          badgeText: schaden.lightDamage > 0 ? `+${schaden.lightDamage} Licht` : 'Licht',
          badgeVariant: 'light',
        });
      } else if (name === 'beflügelte waffe') {
        const bonus = v ? 3 : 2;
        atBonus += bonus;
        spells.push({ name: 'Beflügelte Waffe', description: `+${bonus} auf Angriffe`, badgeText: `+${bonus} AT`, badgeVariant: 'magic' });
      }
    }
  }

  const extraDamageParts: string[] = [];
  if (schaden.fireDamage > 0) extraDamageParts.push(`+${schaden.fireDamage} Feuer`);
  if (schaden.lightDamage > 0) extraDamageParts.push(`+${schaden.lightDamage} Licht`);
  if (schaden.otherDamage > 0) extraDamageParts.push(`+${schaden.otherDamage} Zauber`);
  const extraDamageText = extraDamageParts.join(', ');

  return {
    hasEnchantment: spells.length > 0 || schaden.totalDamage > 0,
    fireDamage: schaden.fireDamage,
    lightDamage: schaden.lightDamage,
    atBonus,
    spells,
    extraDamageText,
    damageFormulaDisplay: extraDamageText ? `${baseDamage} (${extraDamageText})` : baseDamage,
    damageRollFormula: combineDamageFormula(baseDamage, schaden.totalDamage),
    buttonDamageLabel: extraDamageText ? `${baseDamage} (${extraDamageText}) Schaden` : `${baseDamage} Schaden`,
  };
}

/**
 * Liefert die effektive Schadensformel für Zauber, deren Schaden durch spezifische Zauber-Verstärkungen
 * verändert wird (z. B. Lebensraub von 2W6+5 auf 4W6+5 mit 1 EG).
 */
export function getEnhancedSpellDamage(
  spellName?: string,
  description?: string,
  allocations?: SpellEGAllocations,
  specificEnhancements: SpecificSpellEnhancement[] = []
): ParsedSpellDamage | null {
  const base = parseSpellDamage(description, spellName);
  if (!base) return null;
  const name = (spellName || '').trim().toLowerCase();
  const selectedEnhIds = allocations?.selectedEnhancementIds || [];

  if (name === 'lebensraub') {
    const isEnhanced =
      specificEnhancements.some(
        (e) => selectedEnhIds.includes(e.id) && (e.description.includes('4W6') || e.raw.includes('4W6') || e.egCost === 1)
      ) || (selectedEnhIds.length > 0 && selectedEnhIds.includes('enh-1'));
    if (isEnhanced) {
      return {
        ...base,
        diceCount: 4,
        formula: '4W6+5',
      };
    }
  }
  return base;
}

export interface ActiveEnhancementEffect {
  id: string;
  egCost: number;
  focusCostRaw?: string;
  description: string;
  addedCondition?: string;
}

/**
 * Liefert aktive Effekte (z. B. verliehene Zustände wie Benommen 1 bei Blitzschlag/Einfrieren/Wasserschwall)
 * aus den ausgewählten spezifischen Zauber-Verstärkungen.
 */
export function getSelectedSpecificEnhancementEffects(
  _spellName?: string,
  allocations?: SpellEGAllocations,
  specificEnhancements: SpecificSpellEnhancement[] = []
): ActiveEnhancementEffect[] {
  const selectedEnhIds = allocations?.selectedEnhancementIds || [];
  if (selectedEnhIds.length === 0) return [];

  const results: ActiveEnhancementEffect[] = [];
  for (const id of selectedEnhIds) {
    const enh = specificEnhancements.find((e) => e.id === id);
    if (enh) {
      let addedCondition: string | undefined = undefined;
      const lower = enh.description.toLowerCase();
      if (lower.includes('benommen 2')) addedCondition = 'Benommen 2';
      else if (lower.includes('benommen 1') || lower.includes('benommen')) addedCondition = 'Benommen 1';
      else if (lower.includes('verwundet 1') || lower.includes('verwundet')) addedCondition = 'Verwundet 1';
      else if (lower.includes('sterbend 2')) addedCondition = 'Sterbend 2 (Fluch)';
      else if (lower.includes('liegend')) addedCondition = 'Liegend';

      results.push({
        id: enh.id,
        egCost: enh.egCost,
        focusCostRaw: enh.focusCostRaw,
        description: enh.description,
        addedCondition,
      });
    }
  }
  return results;
}

export interface SpellHealingInfo {
  isHealingSpell: boolean;
  baseLP: number;
  isRestoreAll?: boolean;
  conditionToRemove?: string;
  label: string;
}

export interface CalculatedSpellHealing {
  isHealingSpell: boolean;
  baseLP: number;
  enhancedLP: number;
  totalLP: number;
  isRestoreAll: boolean;
  curesPoisonDisease: boolean;
  hasEnhancementSelected: boolean;
  conditionToRemove?: string;
  label: string;
}

/**
 * Berechnet die genaue Heilwirkung eines Zaubers unter Berücksichtigung von Basiswerten,
 * spezifischen Zauber-Verstärkungen aus den Erfolgsgraden (z. B. 2 EG bei Leichte Heilung = 10 LP)
 * und zusätzlichen EG-Investitionen in die Heilung.
 */
export function calculateSpellHealing(
  spellName?: string,
  allocations?: SpellEGAllocations,
  specificEnhancements: SpecificSpellEnhancement[] = []
): CalculatedSpellHealing | null {
  const name = (spellName || '').trim().toLowerCase();
  const selectedEnhIds = allocations?.selectedEnhancementIds || [];

  if (name === 'selbstheilung') {
    const baseLP = 3;
    // GRW S. 244: 2 EG (Kosten +1V1): Es werden insgesamt 6 Lebenspunkte regeneriert.
    const hasEnhancement =
      specificEnhancements.some(
        (e) => selectedEnhIds.includes(e.id) && (e.description.includes('6') || e.raw.includes('6') || e.egCost === 2)
      ) || (selectedEnhIds.length > 0 && selectedEnhIds.includes('enh-1'));
    const totalLP = hasEnhancement ? 6 : baseLP;
    return {
      isHealingSpell: true,
      baseLP,
      enhancedLP: totalLP,
      totalLP,
      isRestoreAll: false,
      curesPoisonDisease: false,
      hasEnhancementSelected: hasEnhancement,
      label: `Selbst heilen (+${totalLP} LP)`,
    };
  }

  if (name === 'leichte heilung') {
    const baseLP = 6;
    // GRW S. 235: 2 EG (Kosten +2V2): Es werden insgesamt 10 Lebenspunkte regeneriert.
    const hasEnhancement =
      specificEnhancements.some(
        (e) => selectedEnhIds.includes(e.id) && (e.description.includes('10') || e.raw.includes('10') || e.egCost === 2)
      ) || (selectedEnhIds.length > 0 && selectedEnhIds.includes('enh-1'));
    const totalLP = hasEnhancement ? 10 : baseLP;
    return {
      isHealingSpell: true,
      baseLP,
      enhancedLP: totalLP,
      totalLP,
      isRestoreAll: false,
      curesPoisonDisease: false,
      hasEnhancementSelected: hasEnhancement,
      label: `Selbst heilen (+${totalLP} LP)`,
    };
  }

  if (name === 'heilung') {
    const baseLP = 16;
    // GRW S. 233: 1 EG (Kosten +3V3): Es werden insgesamt 24 Lebenspunkte regeneriert.
    const hasEnhancement =
      specificEnhancements.some(
        (e) => selectedEnhIds.includes(e.id) && (e.description.includes('24') || e.raw.includes('24') || e.egCost === 1)
      ) || (selectedEnhIds.length > 0 && selectedEnhIds.includes('enh-1'));
    const totalLP = hasEnhancement ? 24 : baseLP;
    return {
      isHealingSpell: true,
      baseLP,
      enhancedLP: totalLP,
      totalLP,
      isRestoreAll: false,
      curesPoisonDisease: false,
      hasEnhancementSelected: hasEnhancement,
      label: `Selbst heilen (+${totalLP} LP)`,
    };
  }

  if (name === 'wiederherstellung') {
    // GRW S. 252: 1 EG (Kosten +4V4): Zusätzlich werden alle Gifte und Krankheiten aufgehoben...
    const hasEnhancement =
      specificEnhancements.some(
        (e) => selectedEnhIds.includes(e.id) && (e.description.includes('Gifte') || e.description.includes('Krankheiten') || e.raw.includes('Gifte'))
      ) || (selectedEnhIds.length > 0 && selectedEnhIds.includes('enh-1'));
    return {
      isHealingSpell: true,
      baseLP: 999,
      enhancedLP: 999,
      totalLP: 999,
      isRestoreAll: true,
      curesPoisonDisease: hasEnhancement,
      hasEnhancementSelected: hasEnhancement,
      label: hasEnhancement
        ? 'Selbst heilen (Alle LP, Zustände & Gifte/Krankheiten)'
        : 'Selbst heilen (Alle LP & Zustände)',
    };
  }

  if (name === 'erfrischung') {
    return {
      isHealingSpell: false,
      baseLP: 0,
      enhancedLP: 0,
      totalLP: 0,
      isRestoreAll: false,
      curesPoisonDisease: false,
      hasEnhancementSelected: false,
      conditionToRemove: 'Erschöpft',
      label: 'Erschöpfung abbauen',
    };
  }

  if (name === 'giftbann') {
    return {
      isHealingSpell: false,
      baseLP: 0,
      enhancedLP: 0,
      totalLP: 0,
      isRestoreAll: false,
      curesPoisonDisease: false,
      hasEnhancementSelected: false,
      conditionToRemove: 'Vergiftet',
      label: 'Vergiftung aufheben',
    };
  }

  return null;
}

/**
 * Liefert Selbstheilungs- bzw. Zustandsbehebungs-Informationen für Zauber nach Splittermond GRW.
 */
export function getSpellHealingInfo(
  spellName?: string,
  _description?: string,
  allocations?: SpellEGAllocations,
  specificEnhancements?: SpecificSpellEnhancement[]
): SpellHealingInfo | null {
  const calc = calculateSpellHealing(spellName, allocations, specificEnhancements);
  if (!calc) return null;
  return {
    isHealingSpell: calc.isHealingSpell,
    baseLP: calc.totalLP,
    isRestoreAll: calc.isRestoreAll,
    conditionToRemove: calc.conditionToRemove,
    label: calc.label,
  };
}


