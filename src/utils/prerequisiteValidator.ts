import type { MasteryEntry, PrerequisiteCondition } from '../data/masteries';
import type { Mastery, AppMode } from '../types';
import { aktiverKatalog, bedingungsCharakter, voraussetzungAusKatalog } from '../regelwerk/bruecke';
import { schwellenwert } from '../regelwerk/grwListen';

export interface PrerequisiteValidationContext {
  allCharacterMasteries: Array<Mastery | string>;
  skills: Record<string, number>;
  resources?: Array<{ name: string; level?: number; [k: string]: any }>;
  strengths?: Array<{ name: string; level?: number; [k: string]: any }>;
  spells?: Array<{ name: string; school?: string; [k: string]: any }>;
  culture?: string;
  race?: string;
  mode?: AppMode;
  creationBudget?: number;
  isCreationBonus?: boolean;
}

export interface PrerequisiteCheckResult {
  canLearn: boolean;
  thresholdMet: boolean;
  prerequisitesMet: boolean;
  tier: number;
  minSkillValue: number;
  currentSkillVal: number;
  thresholdReason?: string;
  prerequisiteReason?: string;
  missingPrerequisites: string[];
}

/**
 * Normalizes a mastery name by removing the threshold suffix like ' (S1)', ' (S2)'
 */
export function normalizeMasteryName(name: string): string {
  return name.replace(/\s*\(S\d\)/g, '').trim();
}

/**
 * Returns the threshold level (Schwelle 1..4) of a mastery
 */
export function getMasteryTier(mastery: MasteryEntry | { name: string; tier?: number }): number {
  if (typeof mastery.tier === 'number' && mastery.tier >= 1 && mastery.tier <= 4) {
    return mastery.tier;
  }
  const match = mastery.name.match(/\(S(\d)\)/);
  if (match?.[1]) {
    return parseInt(match[1], 10);
  }
  return 1;
}

/**
 * Returns the required skill value for a given mastery threshold (Schwellenwert)
 * – aus dem GRW-Paket (Kapitel „Meisterschaften erhalten“: 6, 9, 12, 15), siehe regelwerk/grwListen.ts
 */
export function getRequiredSkillValue(tier: number): number {
  return schwellenwert(tier);
}

/**
 * Evaluates whether a character meets the prerequisites and threshold requirements
 * to learn a specific mastery.
 */
export function checkMasteryPrerequisites(
  mastery: MasteryEntry,
  currentSkillName: string,
  currentSkillVal: number,
  context: PrerequisiteValidationContext
): PrerequisiteCheckResult {
  const tier = mastery.tier || getMasteryTier(mastery);
  const minSkillValue = mastery.minSkillValue || getRequiredSkillValue(tier);
  const mode = context.mode || 'creation';
  const isCreation = mode === 'creation';

  // 1. Schwellenvoraussetzung (Threshold check)
  let thresholdMet = false;
  let thresholdReason: string | undefined;

  if (isCreation) {
    // In character creation, max skill value is 6.
    // Therefore, Tier 2, 3, and 4 masteries CANNOT be chosen at creation.
    if (tier > 1) {
      thresholdMet = false;
      thresholdReason = `Schwelle ${tier} erfordert Fertigkeitswert ${minSkillValue} (In der Heldenerstellung können nur Schwelle-1-Meisterschaften gewählt werden).`;
    } else {
      // Tier 1: standard requirement is skillVal >= 6.
      // Exception: Starting free masteries / bonus slots can be used if skillVal >= 1.
      if (currentSkillVal >= 6) {
        thresholdMet = true;
      } else if (
        context.isCreationBonus ||
        (typeof context.creationBudget === 'number' && context.creationBudget > 0 && currentSkillVal >= 1)
      ) {
        thresholdMet = true;
      } else {
        thresholdMet = false;
        thresholdReason = `Schwelle 1 erfordert Fertigkeitswert 6 (aktuell: ${currentSkillVal}).`;
      }
    }
  } else {
    // In Advancement (XP) or Play mode:
    if (currentSkillVal >= minSkillValue) {
      thresholdMet = true;
    } else {
      thresholdMet = false;
      thresholdReason = `Schwelle ${tier} erfordert Fertigkeitswert ${minSkillValue} (aktuell: ${currentSkillVal}).`;
    }
  }

  // 2. Spezifische Voraussetzungen (Specific prerequisites)
  const missingPrerequisites: string[] = [];
  const characterMasteryNames = new Set(
    (context.allCharacterMasteries || []).map((m) =>
      typeof m === 'string' ? normalizeMasteryName(m).toLowerCase() : normalizeMasteryName(m.name).toLowerCase()
    )
  );

  // Helper function to check if character has a mastery
  const hasMastery = (targetName: string): boolean => {
    const normTarget = normalizeMasteryName(targetName).toLowerCase();
    if (characterMasteryNames.has(normTarget)) return true;

    // Check with variations or within specific skill
    for (const m of context.allCharacterMasteries || []) {
      const mName = typeof m === 'string' ? m : m.name;
      const normM = normalizeMasteryName(mName).toLowerCase();

      if (normM === normTarget) return true;

      // Check notes if focus (Schwerpunkt)
      if (typeof m !== 'string' && m.userNote && normTarget.includes(m.userNote.toLowerCase())) {
        return true;
      }
    }
    return false;
  };

  // Helper function to check mastery in specific skill
  const hasMasteryInSkill = (targetName: string, skill: string): boolean => {
    const normTarget = normalizeMasteryName(targetName).toLowerCase();
    const normSkill = skill.replace(/\s+und\s+/g, ' & ').trim().toLowerCase();
    for (const m of context.allCharacterMasteries || []) {
      const mName = typeof m === 'string' ? m : m.name;
      const normM = normalizeMasteryName(mName).toLowerCase();
      const rawSkill = typeof m !== 'string' ? ((m as any).skill || '') : '';
      const mSkill = rawSkill.replace(/\s+und\s+/g, ' & ').trim().toLowerCase();
      
      // Match name
      if (normM === normTarget || normM.includes(normTarget) || normTarget.includes(normM)) {
        if (mSkill) {
          if (mSkill === normSkill || mSkill.includes('allgemein')) {
            return true;
          }
        } else {
          // If mastery has no skill property attached, accept it
          return true;
        }
      }
    }
    return false;
  };

  // Helper function to check spell existence
  const hasSpell = (spellName: string): boolean => {
    const norm = spellName.toLowerCase();
    return (context.spells || []).some((s) => {
      const sName = s.name.toLowerCase();
      return sName === norm || sName.includes(norm) || norm.includes(sName);
    });
  };

  // Helper function to resolve skill value with alias support ('&' vs 'und')
  const getSkillVal = (skillName: string): number => {
    if (context.skills[skillName] !== undefined) return context.skills[skillName];
    const alt1 = skillName.replace(/\s+und\s+/g, ' & ');
    if (context.skills[alt1] !== undefined) return context.skills[alt1];
    const alt2 = skillName.replace(/\s+&\s+/g, ' und ');
    if (context.skills[alt2] !== undefined) return context.skills[alt2];
    return 0;
  };

  // Helper function to check resources
  const getResourceValue = (resName: string): number => {
    const norm = resName.toLowerCase();
    for (const r of context.resources || []) {
      if (r.name.toLowerCase() === norm || r.name.toLowerCase().includes(norm)) {
        return typeof r.level === 'number' ? r.level : 1;
      }
    }
    return 0;
  };

  // Helper function to evaluate condition recursively
  const evaluateCond = (cond: PrerequisiteCondition): { satisfied: boolean; reason?: string } => {
    if (!cond) return { satisfied: true };

    switch (cond.typ) {
      case 'besitzt_regel': {
        const cat = cond.ziel_kategorie;
        const target = cond.ziel_name || '';

        if (cat === 'meisterschaften') {
          // Check if specific skill mentioned in original
          if (cond.original && cond.original.includes('in der Fertigkeit')) {
            const match = cond.original.match(/in der Fertigkeit\s+([^,]+)/i);
            const specificSkill = match?.[1]?.trim();
            if (specificSkill && !hasMasteryInSkill(target, specificSkill)) {
              return {
                satisfied: false,
                reason: `Meisterschaft "${target}" in der Fertigkeit ${specificSkill}`,
              };
            }
          }
          if (cond.original && cond.original.includes('in der gleichen Magieschule')) {
            if (!hasMasteryInSkill(target, currentSkillName)) {
              return {
                satisfied: false,
                reason: `Meisterschaft "${target}" in der Magieschule ${currentSkillName}`,
              };
            }
          }
          if (hasMastery(target)) {
            return { satisfied: true };
          }
          return {
            satisfied: false,
            reason: `Meisterschaft "${target}"`,
          };
        }

        if (cat === 'kulturen') {
          if (context.culture && context.culture.toLowerCase() === target.toLowerCase()) {
            return { satisfied: true };
          }
          return { satisfied: false, reason: `Kultur "${target}"` };
        }

        if (cat === 'rassen') {
          if (context.race && context.race.toLowerCase() === target.toLowerCase()) {
            return { satisfied: true };
          }
          return { satisfied: false, reason: `Rasse "${target}"` };
        }

        // Generic fallback
        return { satisfied: true };
      }

      case 'mindestwert': {
        const skillName = cond.name || '';
        const requiredValue = cond.wert || 0;
        const currentVal = getSkillVal(skillName);
        if (currentVal >= requiredValue) {
          return { satisfied: true };
        }
        return {
          satisfied: false,
          reason: `Fertigkeitspunkte in ${skillName} ${requiredValue} (aktuell: ${currentVal})`,
        };
      }

      case 'regel_mindestwert': {
        const resName = cond.ziel_name || '';
        const requiredValue = cond.wert || 0;
        const currentVal = getResourceValue(resName);
        if (currentVal >= requiredValue) {
          return { satisfied: true };
        }
        return {
          satisfied: false,
          reason: `Ressource ${resName} Stufe ${requiredValue} (aktuell: ${currentVal})`,
        };
      }

      case 'und': {
        const subs = cond.bedingungen || [];
        for (const sub of subs) {
          const res = evaluateCond(sub);
          if (!res.satisfied) {
            return res;
          }
        }
        return { satisfied: true };
      }

      case 'oder': {
        const subs = cond.bedingungen || [];
        const subReasons: string[] = [];
        for (const sub of subs) {
          const res = evaluateCond(sub);
          if (res.satisfied) {
            return { satisfied: true };
          }
          if (res.reason) subReasons.push(res.reason);
        }
        return {
          satisfied: false,
          reason: subReasons.join(' ODER '),
        };
      }

      case 'ungeklaert': {
        const text = (cond.original || cond.name || '').trim();

        // Check: in der gleichen Magieschule
        if (text.includes('in der gleichen Magieschule')) {
          const reqName = text
            .replace(/^(?:Meisterschaft\s+)?/i, '')
            .replace(/\s+in der gleichen Magieschule.*$/i, '')
            .trim();
          if (reqName && hasMasteryInSkill(reqName, currentSkillName)) {
            return { satisfied: true };
          }
          return {
            satisfied: false,
            reason: `Meisterschaft "${reqName}" in der Magieschule ${currentSkillName}`,
          };
        }

        // Check: in der Fertigkeit ...
        if (text.includes('in der Fertigkeit')) {
          const match = text.match(/(?:Meisterschaft\s+)?([A-Za-zÄÖÜäöüß\s]+)\s+in der Fertigkeit\s+([^,]+)/i);
          const reqName = match?.[1]?.trim() || '';
          const reqSkill = match?.[2]?.trim() || '';
          if (reqName && reqSkill && hasMasteryInSkill(reqName, reqSkill)) {
            return { satisfied: true };
          }
          return {
            satisfied: false,
            reason: `Meisterschaft "${reqName}" in der Fertigkeit ${reqSkill}`,
          };
        }

        // Check: in Stärkungsmagie
        if (text.includes('in Stärkungsmagie')) {
          const reqName = text
            .replace(/^(?:Meisterschaft\s+)?/i, '')
            .replace(/\s+in\s+Stärkungsmagie.*$/i, '')
            .trim();
          if (reqName && hasMasteryInSkill(reqName, 'Stärkungsmagie')) {
            return { satisfied: true };
          }
          return {
            satisfied: false,
            reason: `Meisterschaft "${reqName}" in Stärkungsmagie`,
          };
        }

        // Check: Verbessertes Entwaffnen (Block, Meisterschaft Entwaffnen in Handgemenge)
        if (text.includes('Block') && text.includes('Entwaffnen')) {
          const hasBlock = hasMasteryInSkill('Block', 'Handgemenge');
          const hasEntwaffnen = hasMasteryInSkill('Entwaffnen', 'Handgemenge');
          if (hasBlock && hasEntwaffnen) return { satisfied: true };
          return {
            satisfied: false,
            reason: `Meisterschaften "Block" und "Entwaffnen" in Handgemenge`,
          };
        }

        // Check: Freiheit der Form (Bevorzugte Gestalt + Kleintierform oder Tierform)
        if (text.includes('Bevorzugte Gestalt') && (text.includes('Kleintierform') || text.includes('Tierform'))) {
          const hasMasteryReq = hasMastery('Bevorzugte Gestalt');
          const hasSpellReq = hasSpell('Kleintierform') || hasSpell('Tierform');
          if (hasMasteryReq && hasSpellReq) return { satisfied: true };
          return {
            satisfied: false,
            reason: `Meisterschaft "Bevorzugte Gestalt" und Zauber "Kleintierform" oder "Tierform"`,
          };
        }

        // Check: Spezialist für alle Wesen (Tierarzt + Arkane Kunde 6 oder Geschichte und Mythen 6)
        if (text.includes('Tierarzt')) {
          const hasTierarzt = hasMastery('Tierarzt');
          const arkaneVal = getSkillVal('Arkane Kunde');
          const mythenVal = getSkillVal('Geschichte und Mythen');
          if (hasTierarzt && (arkaneVal >= 6 || mythenVal >= 6)) return { satisfied: true };
          return {
            satisfied: false,
            reason: `Meisterschaft "Tierarzt" und Fertigkeitspunkte in Arkane Kunde 6 oder Geschichte und Mythen 6`,
          };
        }

        // Check: Geselle / Fachmann / Meister im jeweiligen Schwerpunkt
        if (text.includes('im jeweiligen Schwerpunkt')) {
          if (text.includes('Geselle')) {
            const hasGeselle = (context.allCharacterMasteries || []).some((m) => {
              const mName = typeof m === 'string' ? m : m.name;
              return mName.toLowerCase().includes('geselle');
            });
            if (hasGeselle) return { satisfied: true };
            return { satisfied: false, reason: `Meisterschaft "Geselle" in dieser Fertigkeit` };
          }
          if (text.includes('Fachmann')) {
            const hasFachmann = (context.allCharacterMasteries || []).some((m) => {
              const mName = typeof m === 'string' ? m : m.name;
              return mName.toLowerCase().includes('fachmann');
            });
            if (hasFachmann) return { satisfied: true };
            return { satisfied: false, reason: `Meisterschaft "Fachmann" in dieser Fertigkeit` };
          }
          if (text.includes('Meister') && !text.includes('Meisterwerk')) {
            const hasMeister = (context.allCharacterMasteries || []).some((m) => {
              const mName = typeof m === 'string' ? m : m.name;
              const norm = mName.toLowerCase();
              return norm.includes('meister') && !norm.includes('meisterwerk');
            });
            if (hasMeister) return { satisfied: true };
            return { satisfied: false, reason: `Meisterschaft "Meister" in dieser Fertigkeit` };
          }
        }

        // Check: mind. ein Schwerpunkt für eine Stadt (Wie meine Westentasche)
        if (text.includes('Schwerpunkt für eine Stadt') || text.includes('Stadt')) {
          const hasCityFocus = (context.allCharacterMasteries || []).some((m) => {
            const mName = typeof m === 'string' ? m : m.name;
            const note = typeof m === 'string' ? '' : m.userNote || '';
            const norm = (mName + ' ' + note).toLowerCase();
            return norm.includes('schwerpunkt') || norm.includes('stadt');
          });
          if (hasCityFocus) return { satisfied: true };
          return { satisfied: false, reason: `Schwerpunkt für eine Stadt in Straßenkunde` };
        }

        // Check: Schwerpunkt ...
        if (text.includes('Schwerpunkt')) {
          const cleanFocus = text.replace(/^(?:Meisterschaft\s+)?Schwerpunkt\s+/i, '').trim();
          const subOptions = cleanFocus.split(/\s+oder\s+/i).map((s) => s.trim().replace(/^['"]+|['"]+$/g, ''));
          
          const hasAnyFocus = (context.allCharacterMasteries || []).some((m) => {
            const mName = typeof m === 'string' ? m : m.name;
            const note = typeof m === 'string' ? '' : m.userNote || '';
            const combined = (mName + ' ' + note).toLowerCase();
            
            return subOptions.some((opt) => {
              const normOpt = opt.toLowerCase();
              // Check parts (e.g. 'Kräutersuche/Zutaten sammeln' -> 'Kräutersuche', 'Zutaten sammeln')
              const parts = normOpt.split(/[\/,]/).map((p) => p.trim());
              return parts.some((p) => combined.includes(p));
            });
          });

          if (hasAnyFocus) return { satisfied: true };
          return { satisfied: false, reason: `Schwerpunkt "${cleanFocus}"` };
        }

        // Check: Kultur ...
        if (text.startsWith('Kultur')) {
          const cultureList = text.replace(/^Kultur\s+/i, '').split(/,\s*|\s+oder\s+/i).map((c) => c.trim().toLowerCase());
          if (context.culture && cultureList.includes(context.culture.toLowerCase())) {
            return { satisfied: true };
          }
          return { satisfied: false, reason: text };
        }

        // Check: Rasse ...
        if (text.startsWith('Rasse')) {
          const reqRace = text.replace(/^Rasse\s+/i, '').trim().toLowerCase();
          if (context.race && context.race.toLowerCase() === reqRace) {
            return { satisfied: true };
          }
          return { satisfied: false, reason: text };
        }

        // Check: Muttersprache
        if (text.includes('Muttersprache')) {
          return { satisfied: true };
        }

        // Fallback: check if text rule is present
        if (hasMastery(text)) {
          return { satisfied: true };
        }
        return { satisfied: false, reason: text };
      }

      default:
        return { satisfied: true };
    }
  };

  // Regelpakete (falls geladen): Voraussetzung formal über den Katalog prüfen (GRW und hochgeladene Grimoires)
  let spielleitung: string | undefined;
  const regelId = (mastery as MasteryEntry & { regelId?: string }).regelId ?? (mastery.id && /^[a-z0-9]+:[a-z_]+:/.test(mastery.id) ? mastery.id : undefined);
  const ausKatalog = voraussetzungAusKatalog(mastery.name, mastery.skill || currentSkillName, regelId, () => bedingungsCharakter(aktiverKatalog()!, {
    meisterschaften: context.allCharacterMasteries || [],
    fertigkeiten: context.skills || {},
    ressourcen: context.resources || [],
    zauber: context.spells || [],
    staerken: context.strengths || [],
    rasse: context.race,
  }));
  if (ausKatalog) {
    if (ausKatalog.ergebnis === false) missingPrerequisites.push(ausKatalog.text || 'Voraussetzung nicht erfüllt');
    if (ausKatalog.ergebnis === 'offen') spielleitung = `Entscheidung der Spielleitung: ${ausKatalog.text}`;
  } else if (mastery.prerequisite) {
    const res = evaluateCond(mastery.prerequisite);
    if (!res.satisfied && res.reason) {
      missingPrerequisites.push(res.reason);
    }
  } else if (mastery.prerequisiteText) {
    // String-based fallback if no condition tree
    const text = mastery.prerequisiteText.trim();
    if (!hasMastery(text)) {
      missingPrerequisites.push(text);
    }
  }

  const prerequisitesMet = missingPrerequisites.length === 0;
  const canLearn = thresholdMet && prerequisitesMet;

  return {
    canLearn,
    thresholdMet,
    prerequisitesMet,
    tier,
    minSkillValue,
    currentSkillVal,
    thresholdReason,
    prerequisiteReason: missingPrerequisites.length > 0 ? missingPrerequisites.join('; ') : spielleitung,
    missingPrerequisites,
  };
}
