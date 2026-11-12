import type { StatusCondition } from '../types';
import { aktiverKatalog } from '../regelwerk/bruecke';
import { gesundheitsstufen } from '../regelwerk/vitals';
import { SKILL_CATEGORIES, SKILL_DATA } from '../data/rules';
import { ZUSTAENDE, type Probenbereich } from '../data/zustaende';

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

export type { Probenbereich } from '../data/zustaende';

export interface Zustandskontext {
  /** Fertigkeitsgruppe der Probe; ohne Angabe gilt „allgemein“ */
  bereich?: Probenbereich;
  /** aktueller Wundabzug (0, −1, −2, −4, −8) – für den Zustand Verwundet */
  wundabzug?: number;
  /** Name der Fertigkeit oder Magieschule – für Zustände, die an Attributen hängen */
  fertigkeit?: string;
}

/** Wundabzüge je Gesundheitsstufe (GRW S. 172); Rückfall, falls das Paket nicht geladen ist */
const WUNDABZUEGE_RUECKFALL = [0, -1, -2, -4, -8];

function wundabzuege(): number[] {
  const liste = gesundheitsstufen(aktiverKatalog()).stufen.map((s) => Number(s.wundabzug)).filter((n) => Number.isFinite(n));
  return liste.length >= 5 ? liste.slice(0, 5) : WUNDABZUEGE_RUECKFALL;
}

/** Abzug auf eigene Angriffe im Liegen aus der Tabelle der Kampfpositionen (GRW S. 170); Rückfall −6 */
function liegendEigeneAngriffe(): number {
  const d = aktiverKatalog()?.get('grw:regel:kampf-regeln:kampfpositionen')?.daten as { tabellen?: { zeilen?: string[][] }[] } | undefined;
  for (const t of d?.tabellen ?? []) {
    const zeile = t.zeilen?.find((z) => z[0] === 'Liegend, Nahkampf');
    const wert = Number(String(zeile?.[1] ?? '').replace('−', '-'));
    if (zeile && Number.isFinite(wert) && wert !== 0) return wert;
  }
  return -6;
}

/**
 * Abzug eines Zustands auf eine Probe. Die Zahlen stehen als Daten in data/zustaende.ts, nicht hier.
 * null = der Zustand ändert den Probenwert nicht (z. B. Benommen: verlangsamt nur; Angsterfüllt: nur Sicherheitswürfe).
 * „Liegend“ ist eine Kampfposition (GRW S. 170) und kommt aus der Tabelle der Kampfpositionen im Paket.
 */
export function getConditionMalus(condition: StatusCondition, kontext: Zustandskontext = {}): { label: string; malus: number; description?: string } | null {
  const level = condition.level || 1;
  const bereich = kontext.bereich ?? 'allgemein';

  if (condition.key === 'Liegend') {
    if (bereich !== 'kampf') return null;
    const malus = liegendEigeneAngriffe();
    return { label: 'Liegend', malus, description: `${malus} auf eigene Angriffe im Nahkampf und Fernkampf (Armbrust: kein Abzug). Angriffe gegen Liegende: Nahkampf +6, Fernkampf −6` };
  }

  const z = ZUSTAENDE[condition.key];
  const p = z?.probe;
  if (!z || !p) return null;
  const label = z.stufe ? `${condition.key} ${level}` : condition.key;

  if (p.art === 'wundstufe') {
    const stufen = wundabzuege();
    const jetzt = Math.max(0, stufen.indexOf(kontext.wundabzug ?? 0));
    const malus = stufen[Math.min(stufen.length - 1, jetzt + level)] - stufen[jetzt];
    return malus === 0 ? null : { label, malus, description: `${z.kurz} (${malus} zusätzlich)` };
  }
  if (p.bereiche && !p.bereiche.includes(bereich)) return null;
  if (p.attribute) {
    // hängt an Attributen: gilt nur, wenn die Fertigkeit bekannt ist und eines der Attribute nutzt
    const attribute = kontext.fertigkeit ? SKILL_DATA[kontext.fertigkeit] : null;
    if (!attribute || !attribute.some((x) => p.attribute!.includes(x))) return null;
  }
  const stufe = Math.min(level, p.hoechststufe ?? z.hoechststufe ?? level);
  const malus = (p.fest ?? 0) + (p.pro_stufe ?? 0) * stufe;
  return malus === 0 ? null : { label, malus, description: z.kurz };
}

/** Beschreibung eines Zustands: aus dem Regelpaket, sonst die Kurzbeschreibung aus den Zustandsdaten */
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
  if (condition.key === 'Liegend') return getConditionMalus(condition, { bereich: 'kampf' })?.description ?? '';
  return ZUSTAENDE[condition.key]?.kurz ?? '';
}

export function getActiveRollModifiers(
  conditions: StatusCondition[] = [],
  woundPenalty: number = 0,
  healthLevelName: string = 'Unverletzt',
  behinderung: number = 0,
  isBehinderungApplicable: boolean = false,
  bereich: Probenbereich = 'allgemein',
  fertigkeit?: string
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
    const mod = getConditionMalus(c, { bereich, wundabzug: woundPenalty, fertigkeit });
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
