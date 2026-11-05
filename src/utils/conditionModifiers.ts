import type { StatusCondition } from '../types';

export interface ActiveRollModifier {
  id: string;
  source: 'wound' | 'condition' | 'behinderung';
  label: string;
  malus: number;
  active: boolean;
  description?: string;
}

/**
 * In Splittermond (GRW S. 187):
 * Behinderung gives a malus equal to its value on all checks for general skills (Allgemeine Fertigkeiten)
 * in which Beweglichkeit (BEW) is used. Combat skills and magic schools are explicitly excluded.
 */
export const GENERAL_BEW_SKILLS = [
  'Akrobatik',
  'Athletik',
  'Fingerfertigkeit',
  'Heimlichkeit',
  'Schlösser & Fallen',
  'Seefahrt',
  'Tierführung',
] as const;

export function isSkillAffectedByBehinderung(skillName: string): boolean {
  return (GENERAL_BEW_SKILLS as readonly string[]).includes(skillName);
}

/**
 * Returns the standard modifier and description for a Splittermond condition.
 */
export function getConditionMalus(condition: StatusCondition): { label: string; malus: number; description?: string } | null {
  const level = condition.level || 1;
  const key = condition.key;

  switch (key) {
    case 'Geblendet':
      return {
        label: `Geblendet ${level}`,
        malus: -2 * level,
        description: `−${2 * level} auf sichtbasierte Proben, Angriffe & Orientierung`,
      };
    case 'Liegend':
      return {
        label: 'Liegend',
        malus: -2,
        description: '−2 auf Nahkampfangriffe, Nahkampfverteidigung & Bewegung',
      };
    case 'Benommen':
      return {
        label: `Benommen ${level}`,
        malus: -1 * level,
        description: `−${1 * level} auf alle Proben und aktive Abwehr`,
      };
    case 'Verwirrt':
      return {
        label: `Verwirrt ${level}`,
        malus: -1 * level,
        description: `−${1 * level} auf geistige Proben und Konzentration`,
      };
    case 'Erschöpft':
      return {
        label: `Erschöpft ${level}`,
        malus: -1 * level,
        description: `−${1 * level} auf alle Proben`,
      };
    case 'Verwundet':
      return {
        label: `Verwundet ${level}`,
        malus: -1 * level,
        description: `−${1 * level} zusätzlicher Wundabzug auf Proben`,
      };
    case 'Angsterfüllt':
      return {
        label: 'Angsterfüllt',
        malus: -2,
        description: '−2 auf alle Proben (außer Flucht & Verteidigung)',
      };
    case 'Panisch':
      return {
        label: 'Panisch',
        malus: -4,
        description: '−4 auf alle Proben',
      };
    case 'Ringend':
      return {
        label: 'Ringend',
        malus: -3,
        description: '−3 auf alle Proben (Verteidigung −3, GSW 0)',
      };
    case 'Lahm':
      return {
        label: 'Lahm',
        malus: -2,
        description: '−2 auf Bewegungs- und Athletikproben (GSW halbiert)',
      };
    case 'Glaubenskrise':
      return {
        label: condition.level ? `Glaubenskrise ${condition.level}` : 'Glaubenskrise',
        malus: -1 * level,
        description: `−${level} auf Magieschulen-Proben`,
      };
    case 'Siechtum':
      return {
        label: `Siechtum ${level}`,
        malus: -1 * level,
        description: `−${1 * level} auf körperliche Proben`,
      };
    default:
      return null;
  }
}

/**
 * Returns human-readable rules description for any condition according to Splittermond GRW.
 */
export function getConditionDescription(condition: StatusCondition): string {
  const level = condition.level || 1;
  switch (condition.key) {
    case 'Benommen':
      return `−${level} auf alle Proben und aktive Abwehr (GRW S. 172)`;
    case 'Verwirrt':
      return `−${level} auf geistige Proben und Konzentration`;
    case 'Erschöpft':
      return `−${level} auf alle Proben (GRW S. 173)`;
    case 'Geblendet':
      return `−${level * 2} auf sichtbasierte Proben, Angriffe und Orientierung (GRW S. 173)`;
    case 'Liegend':
      return '−2 auf Nahkampfangriffe und Verteidigung, +2 gegen Fernkampf (GRW S. 174)';
    case 'Lahm':
      return '−2 auf Bewegungs- und Athletikproben, Geschwindigkeit (GSW) halbiert (GRW S. 174)';
    case 'Panisch':
      return '−4 auf alle Proben, Drang zur Flucht (GRW S. 174)';
    case 'Angsterfüllt':
      return '−2 auf alle Proben (außer Flucht & Verteidigung) (GRW S. 172)';
    case 'Ringend':
      return '−3 auf alle Proben & Verteidigung, GSW sinkt auf 0 (GRW S. 174)';
    case 'Siechtum':
      return `−${level} auf körperliche Proben (GRW S. 174)`;
    case 'Verwundet':
      return `−${level} zusätzlicher Wundabzug auf Proben (GRW S. 175)`;
    case 'Glaubenskrise':
      return `−${level} auf Magieschulen-Proben (GRW S. 173)`;
    case 'Blutend':
      return `Verliert alle 10 Ticks ${level} Lebenspunkt(e) (GRW S. 172)`;
    case 'Brennend':
      return `Erleidet laufenden Feuerschaden Stufe ${level} (GRW S. 173)`;
    case 'Sterbend':
      return `Akute Lebensgefahr Stufe ${level} – benötigt sofortige Hilfe (GRW S. 175)`;
    case 'Bewusstlos':
      return 'Handlungsunfähig, Verteidigung = 0, wehrlos (GRW S. 172)';
    case 'Schlafend':
      return 'Schläft; erwacht bei Schaden oder Weckversuch (GRW S. 174)';
    case 'Rasend':
      return '+2 Nahkampfschaden, keine Verteidigung oder Zauber möglich (GRW S. 174)';
    default:
      return 'Aktiver Zustand (Splittermond GRW)';
  }
}

/**
 * Compiles all currently active health (wound) penalties, condition modifiers, and armor/load handicap.
 */
export function getActiveRollModifiers(
  conditions: StatusCondition[] = [],
  woundPenalty: number = 0,
  healthLevelName: string = 'Unverletzt',
  behinderung: number = 0,
  isBehinderungApplicable: boolean = false
): ActiveRollModifier[] {
  const result: ActiveRollModifier[] = [];

  // Behinderung (Rüstungs- und Lastabzug auf allgemeine Fertigkeiten mit Beweglichkeit)
  if (behinderung > 0 && isBehinderungApplicable) {
    result.push({
      id: 'behinderung',
      source: 'behinderung',
      label: `Behinderung (${behinderung})`,
      malus: -behinderung,
      active: true,
      description: `Rüstungs- und Lastbehinderung (−${behinderung}) auf Fertigkeiten mit Beweglichkeit`,
    });
  }

  // Health / Wound penalty
  if (woundPenalty !== 0) {
    result.push({
      id: 'wound_penalty',
      source: 'wound',
      label: `Wundabzug (${healthLevelName})`,
      malus: woundPenalty,
      active: true,
      description: `Gesundheitsstatus: ${healthLevelName}`,
    });
  }

  // Active status conditions
  conditions.forEach((c) => {
    const mod = getConditionMalus(c);
    if (mod) {
      result.push({
        id: c.id,
        source: 'condition',
        label: mod.label,
        malus: mod.malus,
        active: true,
        description: mod.description,
      });
    }
  });

  return result;
}
