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
 * Parst die zusätzlichen Fokus-Kosten (Delta) einer spezifischen Zauber-Verstärkung.
 * Im Gegensatz zu absoluten Spruchkosten (wo z. B. K4V1 bedeutet: insgesamt 4 Fokus, davon 1 verzehrt)
 * ist ein Delta additiv:
 * - "+K1V1" bedeutet: +1 Kanalisierter Fokus UND +1 Verzehrter Fokus (+2 FO gesamt).
 * - "+1V1" bedeutet: +1 Erschöpfter Fokus UND +1 Verzehrter Fokus (+2 FO gesamt).
 * - "+K2V2" bedeutet: +2 Kanalisierter Fokus UND +2 Verzehrter Fokus (+4 FO gesamt).
 * - "+2V1" bedeutet: +2 Erschöpfter Fokus UND +1 Verzehrter Fokus (+3 FO gesamt).
 */
export function parseEnhancementFocusDelta(rawInput?: string | null): ParsedFocusCost {
  const raw = String(rawInput ?? '0').trim();
  if (!raw || raw === '0' || raw === 'frei' || raw === 'Frei') {
    return { isChanneled: false, exhausted: 0, channeled: 0, consumed: 0, total: 0, raw: '0' };
  }

  let exhausted = 0;
  let channeled = 0;
  let consumed = 0;
  let isChanneled = false;

  // Extract V (Verzehrt): z. B. "V1", "V2"
  const vMatch = raw.match(/V(\d+)/i);
  if (vMatch) {
    consumed = parseInt(vMatch[1], 10) || 0;
  }

  // Extract K (Kanalisiert): z. B. "+K1V1", "K2V2", "+K1"
  const hasK = /K/i.test(raw);
  if (hasK) {
    isChanneled = true;
    const kMatch = raw.match(/K(\d+)/i);
    if (kMatch) {
      channeled = parseInt(kMatch[1], 10) || 0;
    } else {
      channeled = 1;
    }
  } else {
    // Non-channeled: z. B. "+1V1", "+2V1", "+2"
    const cleaned = raw.replace(/^\+/, '').trim();
    const numMatch = cleaned.match(/^(\d+)(?=V|$)/i);
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

export interface ActiveSpellModifiers {
  vtdBonus: number;
  srBonus: number;
  gwBonus: number;
  kwBonus: number;
  gswBonus: number;
  woundPenaltyReduction: number;
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
 * Prüft, ob ein aktiver kanalisierter Zauber durch eine spezifische Zauber-Verstärkung verstärkt wurde.
 */
export function isSpellEnhanced(cs: import('../types').ChanneledSpell, searchPatterns: string[] = []): boolean {
  if (cs.selectedEnhancementIds && cs.selectedEnhancementIds.length > 0) {
    if (searchPatterns.length === 0) return true;
    if (cs.selectedEnhancementIds.some((id) => id.startsWith('enh-'))) {
      const notes = (cs.notes || '').toLowerCase();
      const enhancements = (cs.enhancements || []).join(' ').toLowerCase();
      const combined = `${notes} ${enhancements}`;
      if (searchPatterns.some((p) => combined.includes(p.toLowerCase()))) return true;
      return true;
    }
  }
  const notes = (cs.notes || '').toLowerCase();
  const enhancements = (cs.enhancements || []).join(' ').toLowerCase();
  const combined = `${notes} ${enhancements}`;
  return searchPatterns.some((p) => combined.includes(p.toLowerCase()));
}

/**
 * Ermittelt Boni auf abgeleitete Kampfeigenschaften (VTD, SR, GW, KW, GSW, Wundabzüge)
 * aus aktuell aktiven kanalisierten Zaubern nach Splittermond GRW.
 */
export function getActiveSpellModifiers(channeledSpells: import('../types').ChanneledSpell[] = []): ActiveSpellModifiers {
  let vtdBonus = 0;
  let srBonus = 0;
  let gwBonus = 0;
  let kwBonus = 0;
  let gswBonus = 0;
  let woundPenaltyReduction = 0;
  const breakdown: ActiveSpellModifiers['breakdown'] = [];

  for (const cs of channeledSpells) {
    const name = (cs.name || '').trim().toLowerCase();

    if (name === 'steinhaut') {
      // GRW S. 246: +2 VTD, +2 SR. Bei 2 EG (+K2V2): SR erhöht sich auf 3 Punkte.
      const hasSREnhancement = isSpellEnhanced(cs, ['sr 3', 'sr auf 3', '+k2v2', '3 punkte', 'erhöht sich auf 3']);
      const spellSR = hasSREnhancement ? 3 : 2;
      const spellVTD = 2;
      vtdBonus += spellVTD;
      srBonus += spellSR;
      breakdown.push({
        spellName: cs.name,
        vtd: spellVTD,
        sr: spellSR,
        description: `+${spellVTD} VTD, +${spellSR} SR${hasSREnhancement ? ' (verstärkt)' : ''}`,
      });
    } else if (name === 'rindenhaut') {
      // GRW S. 244: +1 VTD, +1 SR
      vtdBonus += 1;
      srBonus += 1;
      breakdown.push({
        spellName: cs.name,
        vtd: 1,
        sr: 1,
        description: '+1 VTD, +1 SR',
      });
    } else if (name === 'stahlhaut') {
      // GRW S. 246: +4 VTD, +4 SR
      vtdBonus += 4;
      srBonus += 4;
      breakdown.push({
        spellName: cs.name,
        vtd: 4,
        sr: 4,
        description: '+4 VTD, +4 SR',
      });
    } else if (name === 'eins mit dem feuer') {
      // GRW S. 243: +5 SR
      srBonus += 5;
      breakdown.push({
        spellName: cs.name,
        sr: 5,
        description: '+5 SR',
      });
    } else if (name === 'leib aus licht') {
      // GRW S. 244: +4 SR
      srBonus += 4;
      breakdown.push({
        spellName: cs.name,
        sr: 4,
        description: '+4 SR',
      });
    } else if (name === 'schattenleib') {
      // GRW S. 245: +4 SR
      srBonus += 4;
      breakdown.push({
        spellName: cs.name,
        sr: 4,
        description: '+4 SR',
      });
    } else if (name === 'magische rüstung') {
      // GRW S. 244: +2 VTD. Bei 1 EG (+K1V1): Erhöhung beträgt 3 Punkte (+3 VTD).
      const hasEnh = isSpellEnhanced(cs, ['3 punkte', '+k1v1', 'beträgt 3', 'erhöhung beträgt 3']);
      const vtd = hasEnh ? 3 : 2;
      vtdBonus += vtd;
      breakdown.push({
        spellName: cs.name,
        vtd,
        description: `+${vtd} VTD${hasEnh ? ' (verstärkt)' : ''}`,
      });
    } else if (name === 'magischer panzer') {
      // GRW S. 244: +4 VTD. Bei 1 EG (+K3V3): Erhöhung beträgt 5 Punkte (+5 VTD).
      const hasEnh = isSpellEnhanced(cs, ['5 punkte', '+k3v3', 'beträgt 5', 'erhöhung beträgt 5']);
      const vtd = hasEnh ? 5 : 4;
      vtdBonus += vtd;
      breakdown.push({
        spellName: cs.name,
        vtd,
        description: `+${vtd} VTD${hasEnh ? ' (verstärkt)' : ''}`,
      });
    } else if (name === 'eiserne aura') {
      // GRW S. 243: +2 VTD
      vtdBonus += 2;
      breakdown.push({
        spellName: cs.name,
        vtd: 2,
        description: '+2 VTD',
      });
    } else if (name === 'aura des anführers') {
      // GRW S. 241: +2 VTD, +2 GW, +2 KW
      vtdBonus += 2;
      gwBonus += 2;
      kwBonus += 2;
      breakdown.push({
        spellName: cs.name,
        vtd: 2,
        gw: 2,
        kw: 2,
        description: '+2 VTD, +2 GW, +2 KW',
      });
    } else if (name === 'widerstände erhöhen') {
      // GRW S. 246: +2 GW, +2 KW. Bei 2 EG (+K3V3): Der Bonus erhöht sich auf 3 Punkte (+3 GW, +3 KW).
      const hasEnh = isSpellEnhanced(cs, ['3 punkte', '+k3v3', 'auf 3', 'erhöht sich auf 3']);
      const val = hasEnh ? 3 : 2;
      gwBonus += val;
      kwBonus += val;
      breakdown.push({
        spellName: cs.name,
        gw: val,
        kw: val,
        description: `+${val} GW, +${val} KW${hasEnh ? ' (verstärkt)' : ''}`,
      });
    } else if (name === 'kleiner magieschutz') {
      // GRW S. 235: Malus 1 auf gegnerische Zauber (+1 GW/KW). Bei 1 EG (+K1V1): Malus 2 (+2 GW/KW).
      const hasEnh = isSpellEnhanced(cs, ['2 punkte', '+k1v1', 'auf 2', 'erhöht sich auf 2']);
      const val = hasEnh ? 2 : 1;
      gwBonus += val;
      kwBonus += val;
      breakdown.push({
        spellName: cs.name,
        gw: val,
        kw: val,
        description: `+${val} GW, +${val} KW (Kleiner Magieschutz${hasEnh ? ' verstärkt' : ''})`,
      });
    } else if (name === 'großer magieschutz') {
      // GRW S. 233: Malus 4 auf gegnerische Zauber (+4 GW/KW). Bei 1 EG (+K3V3): Malus 6 (+6 GW/KW).
      const hasEnh = isSpellEnhanced(cs, ['6 punkte', '+k3v3', 'auf 6', 'erhöht sich auf 6']);
      const val = hasEnh ? 6 : 4;
      gwBonus += val;
      kwBonus += val;
      breakdown.push({
        spellName: cs.name,
        gw: val,
        kw: val,
        description: `+${val} GW, +${val} KW (Großer Magieschutz${hasEnh ? ' verstärkt' : ''})`,
      });
    } else if (name === 'hohe segnung') {
      // GRW S. 244: +2 auf alle Proben und Widerstandswerte
      gwBonus += 2;
      kwBonus += 2;
      breakdown.push({
        spellName: cs.name,
        gw: 2,
        kw: 2,
        description: '+2 GW, +2 KW (+2 Fertigkeiten)',
      });
    } else if (name === 'segnung') {
      // GRW S. 245: +1 auf alle Proben und Widerstandswerte
      gwBonus += 1;
      kwBonus += 1;
      breakdown.push({
        spellName: cs.name,
        gw: 1,
        kw: 1,
        description: '+1 GW, +1 KW (+1 Fertigkeiten)',
      });
    } else if (name === 'aura der entschlossenheit') {
      // GRW S. 241: +1 GW
      gwBonus += 1;
      breakdown.push({
        spellName: cs.name,
        gw: 1,
        description: '+1 GW',
      });
    } else if (name === 'beschleunigen') {
      // GRW S. 242: +2 GSW
      gswBonus += 2;
      breakdown.push({
        spellName: cs.name,
        gsw: 2,
        description: '+2 GSW',
      });
    } else if (name === 'über wasser gehen') {
      // GRW S. 250: Bei 1 EG (+K3V3): Die Geschwindigkeit erhöht sich um 2 Punkte auf Wasser.
      const hasEnh = isSpellEnhanced(cs, ['2 punkte', '+k3v3', 'geschwindigkeit']);
      if (hasEnh) {
        gswBonus += 2;
        breakdown.push({
          spellName: cs.name,
          gsw: 2,
          description: '+2 GSW (auf Wasser verstärkt)',
        });
      }
    } else if (name === 'schutz vor kälte') {
      // GRW S. 245: Senkt Kälteschaden um 4. Bei 2 EG (+K1V1): um 6 Punkte gesenkt.
      const hasEnh = isSpellEnhanced(cs, ['6 punkte', '+k1v1', 'um 6']);
      const val = hasEnh ? 6 : 4;
      breakdown.push({
        spellName: cs.name,
        description: `Kälteschaden um ${val} gesenkt${hasEnh ? ' (verstärkt)' : ''}`,
      });
    } else if (name === 'schutz vor elektrizität') {
      // GRW S. 245: Senkt Blitzschaden um 6. Bei 1 EG (+K2V2): um 8 Punkte gesenkt.
      const hasEnh = isSpellEnhanced(cs, ['8 punkte', '+k2v2', 'um 8']);
      const val = hasEnh ? 8 : 6;
      breakdown.push({
        spellName: cs.name,
        description: `Blitzschaden um ${val} gesenkt${hasEnh ? ' (verstärkt)' : ''}`,
      });
    } else if (name === 'schutz vor elementen') {
      // GRW S. 245: Senkt Elementschaden um 8. Bei 1 EG (+K4V4): um 12 Punkte gesenkt.
      const hasEnh = isSpellEnhanced(cs, ['12 punkte', '+k4v4', 'um 12']);
      const val = hasEnh ? 12 : 8;
      breakdown.push({
        spellName: cs.name,
        description: `Elementschaden um ${val} gesenkt${hasEnh ? ' (verstärkt)' : ''}`,
      });
    } else if (name === 'geistreise') {
      // GRW S. 232: Bei 1 EG (+K5V5): SR 5 in der Geisterwelt.
      const hasEnh = isSpellEnhanced(cs, ['5 punkte', '+k5v5', 'sr 5', 'geisterwelt']);
      if (hasEnh) {
        srBonus += 5;
        breakdown.push({
          spellName: cs.name,
          sr: 5,
          description: '+5 SR (in Geisterwelt)',
        });
      }
    } else if (name === 'schmerzen widerstehen') {
      // GRW S. 245: Eventuelle Wundabzüge sinken um 3 Punkte.
      woundPenaltyReduction = Math.max(woundPenaltyReduction, 3);
      breakdown.push({
        spellName: cs.name,
        woundPenaltyReduction: 3,
        description: 'Wundabzug um 3 gesenkt',
      });
    } else if (name === 'schmerzen ignorieren') {
      // GRW S. 245: Eventuelle Wundabzüge sinken um 6 Punkte.
      woundPenaltyReduction = Math.max(woundPenaltyReduction, 6);
      breakdown.push({
        spellName: cs.name,
        woundPenaltyReduction: 6,
        description: 'Wundabzug um 6 gesenkt',
      });
    } else if (name === 'aura der schmerzlosigkeit') {
      // GRW S. 241: Wundabzüge werden ignoriert.
      woundPenaltyReduction = Math.max(woundPenaltyReduction, 999);
      breakdown.push({
        spellName: cs.name,
        woundPenaltyReduction: 999,
        description: 'Wundabzüge ignoriert',
      });
    }
  }

  return {
    vtdBonus,
    srBonus,
    gwBonus,
    kwBonus,
    gswBonus,
    woundPenaltyReduction,
    breakdown,
  };
}

export interface ActiveSpellRollBonus {
  id: string;
  source: string;
  bonus: number;
  description: string;
  active: boolean;
}

/**
 * Ermittelt situationsbezogene Probenboni aus aktiven kanalisierten Zaubern
 * für Fertigkeits-, Attributs- und Kampfwürfe (GRW S. 241–246).
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
  const attrs = SKILL_DATA[cleanSkill] || [];

  const usesAttr = (attr: string) => {
    if (cleanSkill.toUpperCase().startsWith(attr)) return true;
    if (attrs && attrs.includes(attr)) return true;
    if (['klingenwaffen', 'handgemenge', 'stangenwaffen', 'hiebwaffen', 'kettenwaffen'].includes(lowerSkill) && (attr === 'BEW' || attr === 'STA')) return true;
    if (lowerSkill === 'schusswaffen' && (attr === 'BEW' || attr === 'INT')) return true;
    if (lowerSkill === 'wurfwaffen' && (attr === 'BEW' || attr === 'STA')) return true;
    return false;
  };

  for (const cs of channeledSpells) {
    const name = (cs.name || '').trim().toLowerCase();

    // 1. Pauschale Fertigkeitsboni
    if (name === 'hohe segnung') {
      result.push({
        id: `spell-bonus-${cs.id}-hohe-segnung`,
        source: 'Hohe Segnung',
        bonus: 2,
        description: '+2 auf alle Fertigkeitsproben',
        active: true,
      });
    } else if (name === 'segnung') {
      result.push({
        id: `spell-bonus-${cs.id}-segnung`,
        source: 'Segnung',
        bonus: 1,
        description: '+1 auf alle Fertigkeitsproben',
        active: true,
      });
    }

    // 2. Angriffsboni im Kampf
    if (isCombatAttack || ['handgemenge', 'hiebwaffen', 'kettenwaffen', 'klingenwaffen', 'schusswaffen', 'stangenwaffen', 'wurfwaffen'].includes(lowerSkill)) {
      if (name === 'aura des anführers') {
        result.push({
          id: `spell-bonus-${cs.id}-aura-anfuehrer`,
          source: 'Aura des Anführers',
          bonus: 2,
          description: '+2 auf alle Angriffe',
          active: true,
        });
      }
      if (name === 'beflügelte waffe') {
        // Beflügelte Waffe targets a specific weapon (Waffenlos cannot be enchanted)
        const isTargeted = !weaponId || (cs.targetItemId ? cs.targetItemId === weaponId : true);
        if (isTargeted && weaponId !== 'waffenlos') {
          const hasEnh = isSpellEnhanced(cs, ['3 punkte', '+k1v1', 'auf 3', 'erhöht sich auf 3']);
          const bonus = hasEnh ? 3 : 2;
          result.push({
            id: `spell-bonus-${cs.id}-befluegelte-waffe`,
            source: 'Beflügelte Waffe',
            bonus,
            description: `+${bonus} auf Angriffe mit verzauberter Waffe${hasEnh ? ' (verstärkt)' : ''}`,
            active: true,
          });
        }
      }
    }

    // 3. Probenboni auf Attribute
    if (name === 'katzenreflexe' && usesAttr('BEW')) {
      result.push({
        id: `spell-bonus-${cs.id}-katzenreflexe`,
        source: 'Katzenreflexe',
        bonus: 2,
        description: '+2 auf Proben mit Beweglichkeit',
        active: true,
      });
    }
    if (name === 'bärenstärke' && usesAttr('STA')) {
      const hasEnh = isSpellEnhanced(cs, ['5 punkte', '+k4v4', 'auf 5', 'erhöht sich auf 5']);
      const bonus = hasEnh ? 5 : 4;
      result.push({
        id: `spell-bonus-${cs.id}-baerenstaerke`,
        source: 'Bärenstärke',
        bonus,
        description: `+${bonus} auf Proben mit Stärke${hasEnh ? ' (verstärkt)' : ''}`,
        active: true,
      });
    }
    if (name === 'eulengespür' && usesAttr('INT')) {
      result.push({
        id: `spell-bonus-${cs.id}-eulengespuer`,
        source: 'Eulengespür',
        bonus: 3,
        description: '+3 auf Proben mit Intuition',
        active: true,
      });
    }
    if (name === 'inneres leuchten' && usesAttr('AUS')) {
      result.push({
        id: `spell-bonus-${cs.id}-inneres-leuchten`,
        source: 'Inneres Leuchten',
        bonus: 4,
        description: '+4 auf Proben mit Ausstrahlung',
        active: true,
      });
    }

    // 4. Spezifische Fertigkeitsboni
    if (name === 'sinne verstärken' && lowerSkill === 'wahrnehmung') {
      result.push({
        id: `spell-bonus-${cs.id}-sinne-verstaerken`,
        source: 'Sinne verstärken',
        bonus: 5,
        description: '+5 auf Wahrnehmung',
        active: true,
      });
    }
    if ((name === 'sicht verbessern' || name === 'gehör verbessern') && lowerSkill === 'wahrnehmung') {
      result.push({
        id: `spell-bonus-${cs.id}-${name}`,
        source: cs.name,
        bonus: 3,
        description: '+3 auf Wahrnehmung',
        active: true,
      });
    }
    if (name === 'nebelsicht' && lowerSkill === 'wahrnehmung') {
      const hasEnh = isSpellEnhanced(cs, ['2 punkte', '+k1v1', 'wahrnehmung']);
      if (hasEnh) {
        result.push({
          id: `spell-bonus-${cs.id}-nebelsicht`,
          source: 'Nebelsicht',
          bonus: 2,
          description: '+2 auf Wahrnehmung in nebliger Umgebung',
          active: true,
        });
      }
    }
    if ((name === 'aura der schatten' || name === 'schattenleib') && lowerSkill === 'heimlichkeit') {
      result.push({
        id: `spell-bonus-${cs.id}-${name}`,
        source: cs.name,
        bonus: 7,
        description: '+7 auf Heimlichkeit',
        active: true,
      });
    }
    if (name === 'verhüllung' && lowerSkill === 'heimlichkeit') {
      result.push({
        id: `spell-bonus-${cs.id}-verhuellung`,
        source: 'Verhüllung',
        bonus: 3,
        description: '+3 auf Heimlichkeit',
        active: true,
      });
    }
    if (name === 'spinnenlauf' && (lowerSkill === 'klettern' || lowerSkill === 'akrobatik')) {
      result.push({
        id: `spell-bonus-${cs.id}-spinnenlauf`,
        source: 'Spinnenlauf',
        bonus: 4,
        description: '+4 auf Klettern / Akrobatik',
        active: true,
      });
    }
    if (name === 'zunge des diplomaten' && (lowerSkill === 'diplomatie' || lowerSkill === 'redegewandtheit')) {
      const hasEnh = isSpellEnhanced(cs, ['2 punkte', '+k1v1', 'auf 2', 'erhöht sich auf 2']);
      const bonus = hasEnh ? 2 : 1;
      result.push({
        id: `spell-bonus-${cs.id}-zunge-diplomat`,
        source: 'Zunge des Diplomaten',
        bonus,
        description: `+${bonus} auf Diplomatie / Redegewandtheit${hasEnh ? ' (verstärkt)' : ''}`,
        active: true,
      });
    }
    if (name === 'weg durch die natur' && (lowerSkill === 'überleben' || lowerSkill === 'naturkunde')) {
      result.push({
        id: `spell-bonus-${cs.id}-weg-natur`,
        source: 'Weg durch die Natur',
        bonus: 3,
        description: '+3 auf Überleben & Naturkunde beim Reisen',
        active: true,
      });
    }
    if (name === 'freund der tiere' && lowerSkill === 'tierführung') {
      result.push({
        id: `spell-bonus-${cs.id}-freund-tiere`,
        source: 'Freund der Tiere',
        bonus: 1,
        description: '+1 auf Tierführung',
        active: true,
      });
    }
  }

  return result;
}

export interface SpellWeaponDamageBonus {
  fireDamage: number;
  lightDamage: number;
  bonusText: string;
}

/**
 * Ermittelt zusätzlichen Waffenschaden durch aktive kanalisierte Zauber (z. B. Flammende Waffe +1).
 * Wenn eine weaponId übergeben wird, werden Zauber nur eingerechnet, wenn sie diese Waffe verzaubern.
 * Waffenloser Kampf (waffenlos) kann niemals mit Waffenverzauberungen belegt werden (GRW S. 229).
 */
export function getSpellWeaponDamageBonus(
  channeledSpells: import('../types').ChanneledSpell[] = [],
  weaponId?: string
): SpellWeaponDamageBonus {
  if (weaponId === 'waffenlos') {
    return {
      fireDamage: 0,
      lightDamage: 0,
      bonusText: '',
    };
  }

  let fireDamage = 0;
  let lightDamage = 0;
  const parts: string[] = [];

  for (const cs of channeledSpells) {
    // If weaponId is provided: check if this weapon is targeted
    const isTargeted = !weaponId || (cs.targetItemId ? cs.targetItemId === weaponId : true);
    if (!isTargeted) continue;

    const name = (cs.name || '').trim().toLowerCase();
    if (name === 'flammende waffe') {
      // GRW S. 229: Grundwert +1 Feuerschaden. Bei 2 EG (+K1V1): Die Klinge richtet 2 Punkte Feuerschaden an.
      const isEnhanced = isSpellEnhanced(cs, ['2 punkte', '2 punkte feuerschaden', '+k1v1', 'richtet 2 punkte']);
      const dmg = isEnhanced ? 2 : 1;
      fireDamage += dmg;
      parts.push(`+${dmg} Feuerschaden (Flammende Waffe${isEnhanced ? ' verstärkt' : ''})`);
    } else if (name === 'waffe des lichtes') {
      // GRW S. 250: Grundwert +1 Lichtschaden. Bei 1 EG (+K2V2): Zusatzschaden erhöht sich auf 2 Punkte Lichtschaden.
      const isEnhanced = isSpellEnhanced(cs, ['2 punkte', '2 punkte lichtschaden', '+k2v2', 'erhöht sich auf 2']);
      const dmg = isEnhanced ? 2 : 1;
      lightDamage += dmg;
      parts.push(`+${dmg} Lichtschaden (Waffe des Lichtes${isEnhanced ? ' verstärkt' : ''})`);
    } else if (name === 'flammenhand') {
      // GRW S. 229: Bei 1 EG (+K1V1): Schaden erhöht sich um 2 Punkte echten Feuerschaden.
      const isEnhanced = isSpellEnhanced(cs, ['2 punkte', 'echten feuerschaden', '+k1v1', 'schaden erhöht sich um 2']);
      if (isEnhanced) {
        fireDamage += 2;
        parts.push('+2 echter Feuerschaden (Flammenhand verstärkt)');
      }
    } else if (name === 'krallen') {
      const hasEnh = isSpellEnhanced(cs, ['zusätzlich um 1', '+k1v1', '+1', 'schaden erhöht sich']);
      if (hasEnh) {
        parts.push('+1 Schaden (Krallen verstärkt)');
      }
    } else if (name === 'schockgriff') {
      const hasEnh = isSpellEnhanced(cs, ['2 punkte', '+k1v1', 'elektritzitätsschaden', 'elektrizitätsschaden']);
      if (hasEnh) {
        parts.push('+2 echter Elektrizitätsschaden (Schockgriff verstärkt)');
      }
    }
  }

  return {
    fireDamage,
    lightDamage,
    bonusText: parts.join(', '),
  };
}

export interface EquipmentSpellTargetCheck {
  isEquipmentSpell: boolean;
  equipmentType: 'weapon' | 'armor' | 'item' | null;
  targetCategory: string;
  constraintNote?: string;
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
  spellOrName: string | { name?: string; target?: string; description?: string }
): EquipmentSpellTargetCheck {
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
      constraintNote: 'Nur hergestellte Waffen im Inventar. Waffenloser Kampf kann nicht verzaubert werden (GRW S. 229).',
    };
  }

  // Spells targeting armors / shields
  const isArmorSpell =
    name === 'rüstung schwächen' ||
    name === 'magische rüstung' ||
    name === 'magischer panzer' ||
    (target.includes('rüstung') && !target.includes('haut'));

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
  // Waffenloser Kampf (waffenlos) kann keine Waffenverzauberungen empfangen
  if (weapon.id === 'waffenlos' || weapon.name.toLowerCase() === 'waffenlos') {
    return {
      hasEnchantment: false,
      fireDamage: 0,
      lightDamage: 0,
      atBonus: 0,
      spells: [],
      extraDamageText: '',
      damageFormulaDisplay: weapon.damage || '1W6',
      damageRollFormula: weapon.damage || '1W6',
      buttonDamageLabel: `${weapon.damage || '1W6'} Schaden`,
    };
  }

  let fireDamage = 0;
  let lightDamage = 0;
  let atBonus = 0;
  const spells: WeaponEnchantmentInfo['spells'] = [];

  for (const cs of channeledSpells) {
    const name = (cs.name || '').trim().toLowerCase();

    // Zielabgleich:
    // Wenn targetItemId gesetzt ist: muss mit weapon.id übereinstimmen
    // Wenn targetItemId NICHT gesetzt ist, aber targetItemName vorhanden: Namensabgleich
    // Wenn beides fehlt: generische Wirkung auf hergestellte Waffen
    const isTargeted = cs.targetItemId
      ? cs.targetItemId === weapon.id
      : cs.targetItemName
      ? cs.targetItemName.toLowerCase() === weapon.name.toLowerCase()
      : true;

    if (!isTargeted) continue;

    if (name === 'flammende waffe') {
      const isEnhanced = isSpellEnhanced(cs, ['2 punkte', '2 punkte feuerschaden', '+k1v1', 'richtet 2 punkte']);
      const dmg = isEnhanced ? 2 : 1;
      fireDamage += dmg;
      spells.push({
        name: 'Flammende Waffe',
        description: `+${dmg} Feuerschaden`,
        badgeText: `+${dmg} Feuer`,
        badgeVariant: 'fire',
      });
    } else if (name === 'waffe des lichtes') {
      const isEnhanced = isSpellEnhanced(cs, ['2 punkte', '2 punkte lichtschaden', '+k2v2', 'erhöht sich auf 2']);
      const dmg = isEnhanced ? 2 : 1;
      lightDamage += dmg;
      atBonus += 2;
      spells.push({
        name: 'Waffe des Lichtes',
        description: `+${dmg} Lichtschaden (+2 AT gg. Untote/Geister/Schatten)`,
        badgeText: `+${dmg} Licht`,
        badgeVariant: 'light',
      });
    } else if (name === 'beflügelte waffe') {
      const isEnhanced = isSpellEnhanced(cs, ['3 punkte', '+3', 'um 3 punkte', '+k1v1']);
      const bonus = isEnhanced ? 3 : 2;
      atBonus += bonus;
      spells.push({
        name: 'Beflügelte Waffe',
        description: `+${bonus} AT Nahkampf`,
        badgeText: `+${bonus} AT`,
        badgeVariant: 'magic',
      });
    }
  }

  const hasEnchantment = spells.length > 0;
  const totalExtraDamage = fireDamage + lightDamage;
  const extraDamageParts: string[] = [];
  if (fireDamage > 0) extraDamageParts.push(`+${fireDamage} Feuer`);
  if (lightDamage > 0) extraDamageParts.push(`+${lightDamage} Licht`);
  const extraDamageText = extraDamageParts.join(', ');

  const baseDamage = weapon.damage || '1W6';
  const damageFormulaDisplay = extraDamageText ? `${baseDamage} (${extraDamageText})` : baseDamage;
  const damageRollFormula = combineDamageFormula(baseDamage, totalExtraDamage);
  const buttonDamageLabel = extraDamageText ? `${baseDamage} (${extraDamageText}) Schaden` : `${baseDamage} Schaden`;

  return {
    hasEnchantment,
    fireDamage,
    lightDamage,
    atBonus,
    spells,
    extraDamageText,
    damageFormulaDisplay,
    damageRollFormula,
    buttonDamageLabel,
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


