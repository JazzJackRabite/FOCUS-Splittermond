/*
 * Kosten in Erfahrungspunkten. Maßgeblich sind die Kernregeln des Grundregelwerk-Pakets (regelwerk/steigerungsregeln.ts);
 * die Zahlen in dieser Datei sind nur der Rückfall, solange kein Paket geladen ist (FUNDAMENT.md, Altlasten).
 */
import { kostenAttribut, kostenFertigkeitspunkt, kostenMeisterschaft, kostenRessourcenpunkt, kostenSprache, kostenStaerke, kostenZauber } from '../regelwerk/steigerungsregeln';

/**
 * Returns XP cost for a skill point increment.
 * totalVal is the value AFTER the increment (next value).
 */
export const getSkillXpCost = (nextVal: number): number => {
  const ausPaket = kostenFertigkeitspunkt(nextVal);
  if (ausPaket !== null) return ausPaket;
  if (nextVal > 12) return 9;
  if (nextVal > 9) return 7;
  if (nextVal > 6) return 5;
  return 3;
};

/**
 * Returns XP cost for an attribute increment.
 * currentInc is the current number of increments BEFORE this one.
 */
export const getAttrXpCost = (currentInc: number): number => {
  return kostenAttribut(currentInc + 1) ?? 10 + currentInc * 5;
};

/**
 * Returns XP cost according to official rules (PDF S. 25 & S. 87)
 */
export const calculateItemCost = (
  type: 'attribute' | 'skill' | 'strength' | 'resource' | 'language' | 'mastery' | 'spell',
  levelOrRank: number
): number => {
  switch (type) {
    case 'attribute':
      // 1. = 10 EP, 2. = 15 EP, 3. = 20 EP, 4. = 25 EP
      return kostenAttribut(levelOrRank) ?? 10 + (levelOrRank - 1) * 5;
    case 'skill':
      return getSkillXpCost(levelOrRank);
    case 'strength':
      // Stufe 1 = 7 EP, Stufe 2 = 14 EP
      return kostenStaerke(levelOrRank) ?? levelOrRank * 7;
    case 'resource':
      return kostenRessourcenpunkt() ?? 7;
    case 'language':
      return kostenSprache() ?? 5;
    case 'mastery':
      // Schwelle 1 = 5 EP, Schwelle 2 = 10 EP, Schwelle 3 = 15 EP, Schwelle 4 = 20 EP
      return kostenMeisterschaft(levelOrRank) ?? levelOrRank * 5;
    case 'spell':
      // Grad 0 = 1 EP, Grad 1 = 3 EP, Grad 2 = 6 EP, Grad 3 = 9 EP, Grad 4 = 12 EP, Grad 5 = 15 EP
      return kostenZauber(levelOrRank) ?? (levelOrRank === 0 ? 1 : levelOrRank * 3);
    default:
      return 0;
  }
};
