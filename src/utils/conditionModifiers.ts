import type { StatusCondition } from '../types';
import { aktiverKatalog } from '../regelwerk/bruecke';
import { gesundheitsstufen } from '../regelwerk/vitals';
import { SKILL_CATEGORIES } from '../data/rules';

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

/** Fertigkeitsgruppe einer Fertigkeit nach ihrem Namen */
export function probenbereich(fertigkeit: string): Probenbereich {
  if (SKILL_CATEGORIES.COMBAT.includes(fertigkeit)) return 'kampf';
  if (SKILL_CATEGORIES.MAGIC.includes(fertigkeit)) return 'magie';
  return 'allgemein';
}

/** Art der Probe: Zustände wirken je nach Fertigkeitsgruppe verschieden (GRW S. 168–169) */
export type Probenbereich = 'allgemein' | 'kampf' | 'magie';

export interface Zustandskontext {
  /** Fertigkeitsgruppe der Probe; ohne Angabe gilt „allgemein“ */
  bereich?: Probenbereich;
  /** aktueller Wundabzug (0, −1, −2, −4, −8) – für den Zustand Verwundet */
  wundabzug?: number;
}

/** Wundabzüge je Gesundheitsstufe (GRW S. 172); Rückfall, falls das Paket nicht geladen ist */
const WUNDABZUEGE_RUECKFALL = [0, -1, -2, -4, -8];

function wundabzuege(): number[] {
  const liste = gesundheitsstufen(aktiverKatalog()).stufen.map((s) => Number(s.wundabzug)).filter((n) => Number.isFinite(n));
  return liste.length >= 5 ? liste.slice(0, 5) : WUNDABZUEGE_RUECKFALL;
}

/**
 * Abzug eines Zustands auf eine Probe nach dem Grundregelwerk (Liste der Zustände, GRW S. 168–169).
 * null = der Zustand ändert den Probenwert nicht (z. B. Benommen: verlangsamt nur; Angsterfüllt: nur Sicherheitswürfe).
 * Die Zahlen stehen hier, bis die Zustände im Paket strukturiert vorliegen (FUNDAMENT.md, Altlasten).
 */
export function getConditionMalus(condition: StatusCondition, kontext: Zustandskontext = {}): { label: string; malus: number; description?: string } | null {
  const level = condition.level || 1;
  const bereich = kontext.bereich ?? 'allgemein';

  switch (condition.key) {
    case 'Geblendet': {
      const stufe = Math.min(level, 4);
      return { label: `Geblendet ${level}`, malus: -2 * stufe, description: `−${2 * stufe} auf Angriffe und Handlungen, bei denen die Sicht eine Rolle spielt` };
    }
    case 'Erschöpft':
      if (bereich === 'magie') return null;
      return { label: `Erschöpft ${level}`, malus: -level, description: `−${level} auf Kampffertigkeiten und allgemeine Fertigkeiten` };
    case 'Verwundet': {
      const stufen = wundabzuege();
      const jetzt = Math.max(0, stufen.indexOf(kontext.wundabzug ?? 0));
      const malus = stufen[Math.min(stufen.length - 1, jetzt + level)] - stufen[jetzt];
      if (malus === 0) return null;
      return { label: `Verwundet ${level}`, malus, description: `Wundabzug wie ${level} Wundstufe${level > 1 ? 'n' : ''} schwerer verletzt (${malus} zusätzlich)` };
    }
    case 'Ringend':
      return { label: 'Ringend', malus: -3, description: '−3 auf alle Proben (Verteidigung −3, Geschwindigkeit 0)' };
    case 'Glaubenskrise':
      if (bereich !== 'magie') return null;
      return { label: `Glaubenskrise ${level}`, malus: -level, description: `−${level} auf Proben auf Magieschulen` };
    // Keine Zustände des Grundregelwerks; Werte aus dem bisherigen Editor übernommen
    case 'Liegend':
      return { label: 'Liegend', malus: -2, description: '−2 auf Nahkampfangriffe, Nahkampfverteidigung & Bewegung' };
    case 'Verwirrt':
      return { label: `Verwirrt ${level}`, malus: -1 * level, description: `−${1 * level} auf geistige Proben und Konzentration` };
    default:
      return null;
  }
}

/** Kurztexte der Zustände ohne Probenabzug – nur Rückfall; maßgeblich ist die Beschreibung im Paket */
const KURZTEXT: Record<string, (stufe: number) => string> = {
  Benommen: (s) => `Alle Handlungen dauern ${s} Tick${s > 1 ? 's' : ''} länger`,
  Angsterfüllt: () => 'Nur Sicherheitswürfe möglich',
  Rasend: () => 'Nur Risikowürfe möglich',
  Panisch: () => 'Flieht; ohne Fluchtweg handlungsunfähig',
  Lahm: () => 'Halbe Geschwindigkeit',
  Bewusstlos: () => 'Handlungsunfähig, gilt als liegend',
  Schlafend: () => 'Handlungsunfähig, gilt als liegend',
  Blutend: (s) => `Verliert alle 15 Ticks ${3 * s} Lebenspunkte`,
  Brennend: (s) => `Erleidet alle 15 Ticks ${s}W6 Feuerschaden`,
};

/** Beschreibung eines Zustands: aus dem Regelpaket, sonst Kurztext */
export function getConditionDescription(condition: StatusCondition): string {
  const k = aktiverKatalog();
  if (k) {
    for (const e of k.nachTyp('zustand')) {
      if (e.name === condition.key) {
        const text = (e.daten as { beschreibung?: string } | undefined)?.beschreibung;
        if (text) return text;
      }
    }
  }
  const mod = getConditionMalus(condition);
  if (mod?.description) return mod.description;
  return KURZTEXT[condition.key]?.(condition.level || 1) ?? '';
}

export function getActiveRollModifiers(
  conditions: StatusCondition[] = [],
  woundPenalty: number = 0,
  healthLevelName: string = 'Unverletzt',
  behinderung: number = 0,
  isBehinderungApplicable: boolean = false,
  bereich: Probenbereich = 'allgemein'
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
    const mod = getConditionMalus(c, { bereich, wundabzug: woundPenalty });
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
