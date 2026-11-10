import React, { useState, useMemo, useEffect, useId, useContext } from 'react';
import {
  Sword,
  Shield,
  Target,
  Dice1,
  Sparkles,
  Zap,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  HelpCircle,
  Flame,
  Award,
} from 'lucide-react';
import type { StatusCondition, ChanneledSpell } from '../../types';
import type { RollEntry } from './DiceLog';
import { getActiveRollModifiers } from '../../utils/conditionModifiers';
import {
  begrenzeZauberbonus,
  getActiveSpellRollBonuses,
  getSpellWeaponDamageBonus,
  istWaffenlos,
  zauberHoechstbonus,
} from '../../utils/magicRules';
import { CharacterContext } from '../../context/CharacterContext';
import {
  calculateAttackEG,
  getAvailableCombatManeuvers,
  FREE_COMBAT_MANEUVERS,
  parseWeaponDamage,
  executeAttackDamageRoll,
  type CombatManeuver,
  type AttackEGCalculation,
  type DamageRollResult,
} from '../../utils/combatRules';
import { toast } from 'react-hot-toast';

export interface AttackWeaponData {
  id?: string;
  name: string;
  weaponSkill?: string;
  skill?: string;
  damage?: string;
  wgs?: number | string;
  range?: string;
  attributes?: string;
  category?: string;
  equipped?: boolean;
}

export interface AttackTargetConfig {
  weapon: AttackWeaponData;
  skillName: string;
  skillTotal: number;
  customBonus?: number;
  targetVTD?: number;
  /** Großmeister in der Waffenfertigkeit (ab 15 Punkten): zusätzlicher W10 */
  grossmeister?: boolean;
}

export interface AttackSuccessResult {
  weapon: AttackWeaponData;
  maneuver: CombatManeuver;
  totalRoll: number;
  targetVTD: number;
  differenz: number;
  eg: number;
  egDamageSpent: number;
  egArmorPenSpent: number;
  egDefensiveSpent: number;
  egTripSpent: boolean;
  isCrit: boolean;
  damageRoll?: DamageRollResult;
  notes?: string;
}

export interface AttackFailureResult {
  weapon: AttackWeaponData;
  maneuver: CombatManeuver;
  totalRoll: number;
  targetVTD: number;
  differenz: number;
  isFumble: boolean;
  notes?: string;
}

export interface AttackModalProps {
  target: AttackTargetConfig;
  characterMasteries?: any[];
  conditions?: StatusCondition[];
  channeledSpells?: ChanneledSpell[];
  woundPenalty?: number;
  splitterpunkte: number;
  onClose: () => void;
  onSpendSplitterpunkt: () => void;
  onRecordRoll?: (roll: RollEntry) => void;
  onAttackSuccess: (result: AttackSuccessResult) => void;
  onAttackFailure: (result: AttackFailureResult) => void;
}

type RollType = 'standard' | 'safe' | 'risk';
import { wuerfeln } from '../../utils/wuerfeln';
import { SituativeBoni, useSituativeBoni } from './SituativeBoni';


/** Stabile leere Liste: ein `= []` als Vorgabe erzeugt bei jedem Rendern ein neues Array und löst über den Effekt unten eine Endlosschleife aus. */
const KEINE_ZAUBER: ChanneledSpell[] = [];

export const AttackModal: React.FC<AttackModalProps> = ({
  target,
  characterMasteries = [],
  conditions = [],
  channeledSpells = KEINE_ZAUBER,
  woundPenalty = 0,
  splitterpunkte,
  onClose,
  onSpendSplitterpunkt,
  onRecordRoll,
  onAttackSuccess,
  onAttackFailure,
}) => {
  const modalHeadingId = useId();
  const { weapon, skillName, skillTotal } = target;
  const situativ = useSituativeBoni('angriff', skillName);

  // Available Maneuvers (Free + Masteries) filtered strictly by weapon category & skill
  const availableManeuvers = useMemo(() => {
    return getAvailableCombatManeuvers(characterMasteries, skillName, weapon.category);
  }, [characterMasteries, skillName, weapon.category]);

  const [selectedManeuver, setSelectedManeuver] = useState<CombatManeuver>(
    availableManeuvers[0] || {
      id: 'none',
      name: 'Standardangriff',
      type: 'free',
      description: 'Standardangriff',
      shortDesc: 'Standardangriff',
      egDamageRate: 1,
    }
  );

  // Keep selected maneuver valid if available maneuvers change
  useEffect(() => {
    if (!availableManeuvers.some((m) => m.id === selectedManeuver.id)) {
      setSelectedManeuver(availableManeuvers[0] || FREE_COMBAT_MANEUVERS[0]);
    }
  }, [availableManeuvers, selectedManeuver.id]);

  // Step 1: Target Defense & Modifiers
  const [targetVTD, setTargetVTD] = useState<number>(target.targetVTD ?? 15);
  const [targetArmor, setTargetArmor] = useState<number>(0);
  const [situationalMod, setSituationalMod] = useState<number>(0);
  const [targetLying, setTargetLying] = useState<boolean>(false);
  const [targetCover, setTargetCover] = useState<boolean>(false);
  const [advantageFlank, setAdvantageFlank] = useState<boolean>(false);
  const [attackNote, setAttackNote] = useState<string>('');

  // Active condition modifiers
  const conditionMods = useMemo(() => getActiveRollModifiers(conditions), [conditions]);
  const [activeConditionsState, setActiveConditionsState] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    conditionMods.forEach((c) => {
      init[c.id] = c.active;
    });
    return init;
  });

  const totalConditionPenalty = useMemo(() => {
    return conditionMods.reduce((sum, c) => {
      return sum + (activeConditionsState[c.id] ? c.malus : 0);
    }, 0);
  }, [conditionMods, activeConditionsState]);

  // Situational adjustments based on checkboxes
  const situationPresetBonus = useMemo(() => {
    let bonus = 0;
    if (targetLying) bonus += 2; // +2 on melee vs. prone
    if (advantageFlank) bonus += 1; // +1 flanking / higher ground
    return bonus;
  }, [targetLying, advantageFlank]);

  const effectiveTargetVTD = useMemo(() => {
    let vtd = targetVTD;
    if (targetCover) vtd += 2; // +2 VTD for cover
    return vtd;
  }, [targetVTD, targetCover]);

  // Splittermond GRW: Aktive kanalisierte Zauber (Aura des Anführers, Beflügelte Waffe, Flammende Waffe etc.)
  // Waffenlose Angriffe kommen ohne Ausrüstungs-ID an – sonst träfen Waffenzauber ohne Zielangabe auch sie.
  const waffenId = istWaffenlos(weapon.id, weapon.name) ? 'waffenlos' : weapon.id;
  const spellAttackBonuses = useMemo(() => {
    return getActiveSpellRollBonuses(channeledSpells, skillName, true, waffenId);
  }, [channeledSpells, skillName, waffenId]);

  const [activeSpellBonusIds, setActiveSpellBonusIds] = useState<Set<string>>(() => {
    return new Set(spellAttackBonuses.filter((b) => b.active).map((b) => b.id));
  });

  useEffect(() => {
    setActiveSpellBonusIds(new Set(spellAttackBonuses.filter((b) => b.active).map((b) => b.id)));
  }, [spellAttackBonuses]);

  const toggleSpellBonus = (id: string) => {
    setActiveSpellBonusIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Höchstbonus aus Zauberei (GRW S. 18–19): 3 zu Spielbeginn, +1 je Heldengrad
  const hoechstbonusZauber = zauberHoechstbonus(useContext(CharacterContext)?.calc);
  const spellAttackBonusRoh = useMemo(() => {
    return spellAttackBonuses
      .filter((b) => activeSpellBonusIds.has(b.id))
      .reduce((sum, b) => sum + b.bonus, 0);
  }, [spellAttackBonuses, activeSpellBonusIds]);
  const spellAttackBonusTotal = begrenzeZauberbonus(spellAttackBonusRoh, hoechstbonusZauber);

  const spellWeaponDamage = useMemo(() => {
    return getSpellWeaponDamageBonus(channeledSpells, waffenId, weapon.name);
  }, [channeledSpells, waffenId, weapon.name]);

  const extraSpellDmg = spellWeaponDamage.totalDamage;

  // Total modifier applied to the 2W10 roll
  const totalAttackModifier =
    skillTotal +
    woundPenalty +
    totalConditionPenalty +
    situationalMod +
    situationPresetBonus +
    situativ.summe +
    spellAttackBonusTotal +
    (target.customBonus ?? 0);

  // Step 2: Roll Execution & State
  const [hasRolled, setHasRolled] = useState<boolean>(false);
  const [rollDice, setRollDice] = useState<number[]>([0, 0]);
  const [diceSum, setDiceSum] = useState<number>(0);
  const [isFumble, setIsFumble] = useState<boolean>(false);
  const [isCrit, setIsCrit] = useState<boolean>(false);
  const [rollType, setRollType] = useState<RollType>('standard');
  const [isRolling, setIsRolling] = useState<boolean>(false);
  const [extraSPBonus, setExtraSPBonus] = useState<number>(0);
  const [manualInputOpen, setManualInputOpen] = useState<boolean>(false);
  const [manualRollVal, setManualRollVal] = useState<string>('');

  // Total rolled result
  const totalRollResult = hasRolled ? diceSum + totalAttackModifier + extraSPBonus : 0;

  // EG calculation
  const egCalculation: AttackEGCalculation | null = useMemo(() => {
    if (!hasRolled) return null;
    return calculateAttackEG(totalRollResult, effectiveTargetVTD, isFumble, isCrit);
  }, [hasRolled, totalRollResult, effectiveTargetVTD, isFumble, isCrit]);

  // Step 3: EG Allocation
  const [egDamageSpent, setEgDamageSpent] = useState<number>(0);
  const [egArmorPenSpent, setEgArmorPenSpent] = useState<number>(0);
  const [egDefensiveSpent, setEgDefensiveSpent] = useState<number>(0);
  const [egTripSpent, setEgTripSpent] = useState<boolean>(false);

  const totalEgAvailable = egCalculation?.eg ?? 0;
  const tripEgCost = egTripSpent ? 2 : 0;
  const totalEgAllocated = egDamageSpent + egArmorPenSpent + egDefensiveSpent + tripEgCost;
  const remainingEG = Math.max(0, totalEgAvailable - totalEgAllocated);

  // Step 4: Integrated Damage Roll
  const [damageRollResult, setDamageRollResult] = useState<DamageRollResult | null>(null);
  const attackCausesDamage = Boolean(weapon.damage !== '0' && weapon.damage !== '-');

  // Execute the attack roll
  const handleExecuteRoll = (forcedType?: RollType) => {
    const typeToUse = forcedType || rollType;
    setIsRolling(true);

    setTimeout(() => {
      let rolledDice: number[] = [];
      let sum = 0;
      let fumble = false;
      let crit = false;

      // Würfel nach GRW S. 16–19 (gemeinsame Würfellogik), mit Großmeister ab 15 Fertigkeitspunkten
      const w = wuerfeln(typeToUse, !!target.grossmeister);
      rolledDice = w.dice;
      sum = w.result;
      fumble = w.isFumble;
      crit = w.isCrit;

      setRollDice(rolledDice);
      setDiceSum(sum);
      setIsFumble(fumble);
      setIsCrit(crit);
      setHasRolled(true);
      setIsRolling(false);
      setDamageRollResult(null);

      // Default EG allocation for damage
      const calc = calculateAttackEG(
        sum + totalAttackModifier + extraSPBonus,
        effectiveTargetVTD,
        fumble,
        crit
      );
      if (calc.isSuccess && calc.eg > 0) {
        setEgDamageSpent(calc.eg);
      } else {
        setEgDamageSpent(0);
      }
      setEgArmorPenSpent(0);
      setEgDefensiveSpent(0);
      setEgTripSpent(false);
    }, 180);
  };

  const handleManualRollSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseInt(manualRollVal, 10);
    if (isNaN(val) || val < 2 || val > 30) {
      toast.error('Bitte eine gültige Würfelsumme zwischen 2 und 30 eingeben');
      return;
    }
    const d1 = Math.floor(val / 2);
    const d2 = val - d1;
    setRollDice([d1, d2]);
    setDiceSum(val);
    setIsFumble(val === 2);
    setIsCrit(val === 20);
    setHasRolled(true);
    setManualInputOpen(false);
    setDamageRollResult(null);

    const calc = calculateAttackEG(
      val + totalAttackModifier + extraSPBonus,
      effectiveTargetVTD,
      val === 2,
      val === 20
    );
    if (calc.isSuccess && calc.eg > 0) {
      setEgDamageSpent(calc.eg);
    } else {
      setEgDamageSpent(0);
    }
    setEgArmorPenSpent(0);
    setEgDefensiveSpent(0);
    setEgTripSpent(false);
  };

  // Perform the Damage Roll
  const handleRollDamage = () => {
    const rate = selectedManeuver.egDamageRate ?? 1;
    const egBonus = egDamageSpent * rate;

    const res = executeAttackDamageRoll({
      baseFormula: weapon.damage || '1W6',
      maneuverExtraFormula: selectedManeuver.extraDamageFormula,
      egBonusDamage: egBonus + extraSpellDmg,
      damageMultiplier: selectedManeuver.damageMultiplier ?? 1,
      targetArmorReduction: targetArmor,
      armorPenetrationEG: egArmorPenSpent,
      maneuverCondition: selectedManeuver.inflictsCondition,
      tripCondition: egTripSpent,
    });

    setDamageRollResult(res);
    const spellDmgText = extraSpellDmg > 0 ? ` (inkl. ${spellWeaponDamage.bonusText})` : '';
    toast.success(`💥 ${res.netDamage} Schaden erzielt! (${res.grossDamage} Brutto - ${res.effectiveArmor} RS)${spellDmgText}`);
  };

  // Complete and Log Attack
  const handleCompleteAttack = () => {
    if (!egCalculation) return;

    if (egCalculation.isSuccess) {
      // Record to dice protocol
      if (onRecordRoll) {
        const activeSpellLabels = spellAttackBonuses
          .filter((b) => activeSpellBonusIds.has(b.id))
          .map((b) => `${b.source} (+${b.bonus})`);
        const allBuffLabels = [...situativ.labels, ...activeSpellLabels];

        onRecordRoll({
          id: `atk_${Date.now()}`,
          type: 'roll',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          label: `Angriff mit ${weapon.name} (${selectedManeuver.name})${allBuffLabels.length ? ` [${allBuffLabels.join(', ')}]` : ''}`,
          d10s: rollDice,
          baseVal: totalAttackModifier,
          modifier: extraSPBonus,
          total: totalRollResult,
          isTriumph: isCrit,
          isPatzer: isFumble,
          outcome: `${egCalculation.outcomeLabel} (${egCalculation.eg} EG vs. VTD ${effectiveTargetVTD})${
            damageRollResult ? ` · 💥 ${damageRollResult.netDamage} Schaden (${damageRollResult.breakdownText})` : ''
          }`,
        });
      }

      onAttackSuccess({
        weapon,
        maneuver: selectedManeuver,
        totalRoll: totalRollResult,
        targetVTD: effectiveTargetVTD,
        differenz: egCalculation.differenz,
        eg: egCalculation.eg,
        egDamageSpent,
        egArmorPenSpent,
        egDefensiveSpent,
        egTripSpent,
        isCrit,
        damageRoll: damageRollResult || undefined,
        notes: attackNote,
      });

      const dmgText = damageRollResult ? ` · 💥 ${damageRollResult.netDamage} Schaden angerichtet!` : '';
      toast.success(`⚔️ Treffer mit ${weapon.name}! (${egCalculation.eg} EG)${dmgText}`);
    } else {
      if (onRecordRoll) {
        onRecordRoll({
          id: `atk_miss_${Date.now()}`,
          type: 'roll',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          label: `Angriff mit ${weapon.name} (${selectedManeuver.name})${situativ.labels.length ? ` [${situativ.labels.join(', ')}]` : ''}`,
          d10s: rollDice,
          baseVal: totalAttackModifier,
          modifier: extraSPBonus,
          total: totalRollResult,
          isTriumph: false,
          isPatzer: isFumble,
          outcome: `${egCalculation.outcomeLabel} (Diff: ${egCalculation.differenz} vs. VTD ${effectiveTargetVTD})`,
        });
      }

      onAttackFailure({
        weapon,
        maneuver: selectedManeuver,
        totalRoll: totalRollResult,
        targetVTD: effectiveTargetVTD,
        differenz: egCalculation.differenz,
        isFumble,
        notes: attackNote,
      });

      toast(`❌ Angriff mit ${weapon.name} verfehlt (Diff ${egCalculation.differenz}).`);
    }

    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={modalHeadingId}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs overflow-y-auto animate-fadeIn"
    >
      <div className="bg-[#121c2b] text-[#f3e5cf] border border-[#C5A059]/70 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden my-auto">
        {/* ── HEADER ── */}
        <div className="bg-gradient-to-r from-[#172437] via-[#1E304A] to-[#172437] p-4 sm:p-5 border-b border-[#C5A059]/40 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-[#2b181d] border border-[#b84058] flex items-center justify-center shadow-xs shrink-0">
              <Sword size={22} className="text-[#FF9EAA]" />
            </div>
            <div className="min-w-0">
              <h3 id={modalHeadingId} className="font-bold text-lg sm:text-xl fantasy-font text-white truncate flex items-center gap-2">
                <span>Angriff: {weapon.name}</span>
                <span className="text-xs bg-[#24334a] text-[#C5A059] px-2 py-0.5 rounded border border-[#C5A059]/40 font-mono font-semibold">
                  {skillName}
                </span>
              </h3>
              <p className="text-xs text-stone-300 font-mono flex items-center gap-2 mt-0.5 flex-wrap">
                <span>
                  Basis-AT: <strong className="text-white">{skillTotal}</strong>
                </span>
                <span>·</span>
                <span>
                  Schaden: <strong className="text-red-400">{weapon.damage || '1W6'}</strong>
                </span>
                {weapon.wgs && (
                  <>
                    <span>·</span>
                    <span>WGS: {weapon.wgs} Ticks</span>
                  </>
                )}
                {weapon.attributes && (
                  <>
                    <span>·</span>
                    <span className="italic text-stone-400 truncate max-w-[180px]" title={weapon.attributes}>
                      {weapon.attributes}
                    </span>
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {splitterpunkte > 0 && (
              <button
                type="button"
                onClick={() => {
                  onSpendSplitterpunkt();
                  setExtraSPBonus((prev) => prev + 3);
                }}
                className="bg-amber-950/60 hover:bg-amber-900 text-amber-300 border border-amber-600/70 px-2.5 py-1 rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1 cursor-pointer"
                title="Splitterpunkt einsetzen: +3 auf den Wurf"
              >
                <Sparkles size={13} className="text-amber-400" />
                <span>+3 (SP: {splitterpunkte})</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="text-stone-400 hover:text-white hover:bg-white/10 p-1.5 rounded-lg transition-colors cursor-pointer"
              title="Schließen (Esc)"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* ── MODAL BODY (Scrollable) ── */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-stone-200">
          {/* ── ROW 1: ZIEL-VERTEIDIGUNG & SITUATION ── */}
          <div className="bg-[#182333] border border-[#2b3a4f] rounded-xl p-3.5 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold uppercase tracking-wider text-[#C5A059] fantasy-font flex items-center gap-1.5">
                <Target size={14} /> 1. Ziel &amp; Verteidigung (VTD)
              </span>
              <span className="text-xs font-mono font-bold text-white bg-[#0e1622] px-2 py-0.5 rounded border border-[#2B374D]">
                Effektive VTD: {effectiveTargetVTD}
              </span>
            </div>

            {/* VTD Input & Presets */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-stone-400 block mb-1">Gegnerische Verteidigung (VTD):</label>
                <div className="flex items-center gap-1.5">
                  <div className="flex-1 flex items-center bg-[#0d1520] border border-[#2a3c54] rounded-lg overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setTargetVTD((prev) => Math.max(5, prev - 1))}
                      className="px-3 py-1.5 hover:bg-white/10 text-stone-300 font-bold transition-colors cursor-pointer"
                    >
                      −
                    </button>
                    <input
                      type="number"
                      value={targetVTD}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => setTargetVTD(Math.max(1, parseInt(e.target.value, 10) || 15))}
                      className="w-full text-center bg-transparent text-white font-mono font-bold text-sm py-1.5 focus:outline-hidden"
                    />
                    <button
                      type="button"
                      onClick={() => setTargetVTD((prev) => prev + 1)}
                      className="px-3 py-1.5 hover:bg-white/10 text-stone-300 font-bold transition-colors cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                  {/* Quick Presets */}
                  <div className="flex gap-1">
                    {[15, 18, 21, 24].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setTargetVTD(val)}
                        className={`px-2 py-1 text-xs rounded border transition-all cursor-pointer font-mono font-semibold ${
                          targetVTD === val
                            ? 'bg-[#C5A059] text-stone-950 border-[#E5C079]'
                            : 'bg-[#101b2b] text-stone-300 border-[#2b3a4f] hover:bg-[#1a293f]'
                        }`}
                        title={`Standard VTD ${val}`}
                      >
                        {val}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Target Armor (RS) */}
              <div>
                <label className="text-xs text-stone-400 block mb-1">Gegnerische Rüstung (RS):</label>
                <div className="flex items-center gap-1.5">
                  <div className="flex-1 flex items-center bg-[#0d1520] border border-[#2a3c54] rounded-lg overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setTargetArmor((prev) => Math.max(0, prev - 1))}
                      className="px-3 py-1.5 hover:bg-white/10 text-stone-300 font-bold transition-colors cursor-pointer"
                    >
                      −
                    </button>
                    <input
                      type="number"
                      value={targetArmor}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => setTargetArmor(Math.max(0, parseInt(e.target.value, 10) || 0))}
                      className="w-full text-center bg-transparent text-white font-mono font-bold text-sm py-1.5 focus:outline-hidden"
                    />
                    <button
                      type="button"
                      onClick={() => setTargetArmor((prev) => prev + 1)}
                      className="px-3 py-1.5 hover:bg-white/10 text-stone-300 font-bold transition-colors cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                  <div className="flex gap-1">
                    {[0, 2, 4, 6].map((rs) => (
                      <button
                        key={rs}
                        type="button"
                        onClick={() => setTargetArmor(rs)}
                        className={`px-2 py-1 text-xs rounded border transition-all cursor-pointer font-mono font-semibold ${
                          targetArmor === rs
                            ? 'bg-amber-600 text-white border-amber-400'
                            : 'bg-[#101b2b] text-stone-300 border-[#2b3a4f] hover:bg-[#1a293f]'
                        }`}
                      >
                        {rs}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <SituativeBoni boni={situativ.boni} gewaehlt={situativ.gewaehlt} onToggle={situativ.umschalten} dunkel />

            {/* Splittermond GRW: Aktive Zauber-Wirkungen (Aura des Anführers, Beflügelte Waffe, Flammende Waffe, etc.) */}
            {(spellAttackBonuses.length > 0 || spellWeaponDamage.totalDamage > 0) && (
              <div className="bg-[#10241b] border border-[#27593c] rounded-xl p-3 text-xs space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-emerald-300 flex items-center gap-1.5 uppercase tracking-wide text-[11px]">
                    <Sparkles size={13} className="text-emerald-400" /> Aktive Zauber-Wirkungen
                  </span>
                  {spellAttackBonusTotal > 0 && (
                    <span className="font-mono font-bold px-2 py-0.5 rounded bg-emerald-800 text-emerald-100 border border-emerald-600">
                      AT-Bonus: +{spellAttackBonusTotal}
                      {spellAttackBonusRoh > spellAttackBonusTotal && ` (von +${spellAttackBonusRoh}, Höchstbonus GRW S. 18)`}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {spellAttackBonuses.map((b) => {
                    const isActive = activeSpellBonusIds.has(b.id);
                    return (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => toggleSpellBonus(b.id)}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                          isActive
                            ? 'bg-emerald-700/80 text-white border-emerald-500 shadow-xs'
                            : 'bg-[#182330] text-stone-400 border-stone-700 line-through'
                        }`}
                        title={`${b.description} (Klicken zum ${isActive ? 'Abwählen' : 'Aktivieren'})`}
                      >
                        {isActive ? <Check size={12} className="text-emerald-300" /> : <X size={12} className="text-stone-400" />}
                        <span>{b.source}</span>
                        <span className="font-mono font-bold text-emerald-200">+{b.bonus} AT</span>
                      </button>
                    );
                  })}
                  {spellWeaponDamage.totalDamage > 0 && (
                    <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-orange-950/80 text-orange-200 border border-orange-700 shadow-xs">
                      <Flame size={12} className="text-orange-400" />
                      <span>{spellWeaponDamage.bonusText}</span>
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Situational Toggles */}
            <div className="flex flex-wrap gap-2 pt-2 border-t border-[#2a3c54]/60 text-xs">
              <button
                type="button"
                onClick={() => setTargetLying((prev) => !prev)}
                className={`px-2.5 py-1 rounded-lg border transition-all flex items-center gap-1.5 cursor-pointer font-semibold ${
                  targetLying
                    ? 'bg-emerald-950 text-emerald-300 border-emerald-500'
                    : 'bg-[#0f1722] text-stone-400 border-[#263547] hover:bg-[#15202e]'
                }`}
              >
                <span>{targetLying ? '✓' : '+'}</span>
                <span>Gegner liegt (+2 Nahkampf)</span>
              </button>

              <button
                type="button"
                onClick={() => setAdvantageFlank((prev) => !prev)}
                className={`px-2.5 py-1 rounded-lg border transition-all flex items-center gap-1.5 cursor-pointer font-semibold ${
                  advantageFlank
                    ? 'bg-emerald-950 text-emerald-300 border-emerald-500'
                    : 'bg-[#0f1722] text-stone-400 border-[#263547] hover:bg-[#15202e]'
                }`}
              >
                <span>{advantageFlank ? '✓' : '+'}</span>
                <span>Vorteil / Überzahl (+1)</span>
              </button>

              <button
                type="button"
                onClick={() => setTargetCover((prev) => !prev)}
                className={`px-2.5 py-1 rounded-lg border transition-all flex items-center gap-1.5 cursor-pointer font-semibold ${
                  targetCover
                    ? 'bg-amber-950 text-amber-300 border-amber-500'
                    : 'bg-[#0f1722] text-stone-400 border-[#263547] hover:bg-[#15202e]'
                }`}
              >
                <span>{targetCover ? '✓' : '+'}</span>
                <span>Ziel in Deckung (+2 VTD)</span>
              </button>

              <div className="flex items-center gap-1 ml-auto">
                <span className="text-stone-400 text-xs">Situations-Mod:</span>
                <button
                  type="button"
                  onClick={() => setSituationalMod((prev) => prev - 1)}
                  className="w-6 h-6 rounded bg-[#0d1520] hover:bg-white/10 text-stone-300 font-bold flex items-center justify-center border border-[#2a3c54] cursor-pointer"
                >
                  −
                </button>
                <span className="w-7 text-center font-mono font-bold text-xs text-white">
                  {situationalMod >= 0 ? `+${situationalMod}` : situationalMod}
                </span>
                <button
                  type="button"
                  onClick={() => setSituationalMod((prev) => prev + 1)}
                  className="w-6 h-6 rounded bg-[#0d1520] hover:bg-white/10 text-stone-300 font-bold flex items-center justify-center border border-[#2a3c54] cursor-pointer"
                >
                  +
                </button>
              </div>
            </div>

            {/* Conditions & Wound Penalty summary */}
            {(woundPenalty !== 0 || conditionMods.length > 0) && (
              <div className="pt-2 border-t border-[#2a3c54]/60 flex flex-wrap items-center gap-1.5 text-xs">
                <span className="text-stone-400 flex items-center gap-1">
                  <AlertCircle size={13} className="text-amber-400" />
                  Aktive Abzüge:
                </span>
                {woundPenalty !== 0 && (
                  <span className="bg-[#8B263E] text-white px-2 py-0.5 rounded text-[11px] font-bold border border-[#A8324E]">
                    Wundabzug: {woundPenalty}
                  </span>
                )}
                {conditionMods.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() =>
                      setActiveConditionsState((prev) => ({ ...prev, [c.id]: !prev[c.id] }))
                    }
                    className={`px-2 py-0.5 rounded text-[11px] font-bold border transition-colors cursor-pointer ${
                      activeConditionsState[c.id]
                        ? 'bg-red-950 text-red-200 border-red-800'
                        : 'bg-[#15202e] text-stone-500 border-[#2a3c54] line-through'
                    }`}
                  >
                    {c.label} ({c.malus})
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ── ROW 2: MANÖVER-AUSWAHL (EXAKT NACH REGELWERK) ── */}
          <div className="bg-[#182333] border border-[#2b3a4f] rounded-xl p-3.5 space-y-2.5">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold uppercase tracking-wider text-[#C5A059] fantasy-font flex items-center gap-1.5">
                <Zap size={14} /> 2. Kampfmanöver wählen (max. 1 Manöver)
              </span>
              <span className="text-xs text-stone-400 font-medium">
                {availableManeuvers.filter((m) => m.type === 'mastery').length} erlernte Meisterschaften
              </span>
            </div>

            {/* Maneuvers Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {availableManeuvers.map((m) => {
                const isSelected = selectedManeuver.id === m.id;
                const isMastery = m.type === 'mastery';
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setSelectedManeuver(m)}
                    className={`text-left p-2.5 rounded-lg border transition-all cursor-pointer relative flex flex-col justify-between ${
                      isSelected
                        ? 'bg-[#212f45] border-[#C5A059] shadow-sm ring-1 ring-[#C5A059]/40'
                        : 'bg-[#101b2a] border-[#223145] hover:bg-[#162438] hover:border-[#384c66]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <div className="flex items-center gap-1.5 font-bold text-xs text-white">
                        <span>{m.name}</span>
                      </div>
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded font-semibold uppercase tracking-wider ${
                          isMastery
                            ? 'bg-amber-900/60 text-amber-300 border border-amber-600/50'
                            : 'bg-stone-800 text-stone-300'
                        }`}
                      >
                        {isMastery ? 'Meisterschaft' : 'Frei'}
                      </span>
                    </div>
                    <p className="text-[11px] text-stone-300 leading-snug line-clamp-2">
                      {m.shortDesc}
                    </p>
                    {isSelected && (
                      <span className="absolute top-1.5 right-1.5 text-xs text-[#C5A059] font-bold">
                        ✓
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Detailed description of chosen maneuver */}
            {selectedManeuver && selectedManeuver.description && (
              <div className="bg-[#0f1722] p-2.5 rounded-lg border border-[#25364b] text-xs text-stone-300 mt-1">
                <span className="font-bold text-[#C5A059]">{selectedManeuver.name}:</span>{' '}
                <span>{selectedManeuver.description}</span>
              </div>
            )}
          </div>

          {/* ── ROW 3: WURF AUSFÜHREN ── */}
          <div className="bg-[#182333] border border-[#2b3a4f] rounded-xl p-3.5 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold uppercase tracking-wider text-[#C5A059] fantasy-font flex items-center gap-1.5">
                <Dice1 size={14} /> 3. Angriffswurf (2W10 + AT vs. VTD)
              </span>
              <div className="flex items-center gap-1">
                {(['standard', 'safe', 'risk'] as RollType[]).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => {
                      setRollType(mode);
                      if (hasRolled) handleExecuteRoll(mode);
                    }}
                    className={`px-2 py-0.5 text-xs rounded border transition-all cursor-pointer font-medium ${
                      rollType === mode
                        ? 'bg-[#1B365D] text-white border-[#C5A059]'
                        : 'bg-[#0f1722] text-stone-400 border-[#2a3c54]'
                    }`}
                  >
                    {mode === 'standard' ? 'Standard' : mode === 'safe' ? 'Sicherheit' : 'Risiko'}
                  </button>
                ))}
              </div>
            </div>

            {/* Total calculation formula bar */}
            <div className="bg-[#0f1722] p-2.5 rounded-lg border border-[#2a3c54] flex items-center justify-between text-xs font-mono flex-wrap gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-stone-400">Probe:</span>
                <span className="text-white font-bold">2W10</span>
                <span>+</span>
                <span title="Basis-AT">{skillTotal} AT</span>
                {woundPenalty !== 0 && (
                  <span className="text-red-400">({woundPenalty} Wunde)</span>
                )}
                {totalConditionPenalty !== 0 && (
                  <span className="text-red-400">({totalConditionPenalty} Zustand)</span>
                )}
                {situativ.summe !== 0 && (
                  <span className="text-emerald-400">({situativ.summe > 0 ? '+' : ''}{situativ.summe} Stärken/Meisterschaften)</span>
                )}
                {situationalMod + situationPresetBonus !== 0 && (
                  <span className="text-emerald-400">
                    ({situationalMod + situationPresetBonus > 0 ? `+${situationalMod + situationPresetBonus}` : situationalMod + situationPresetBonus} Sit.)
                  </span>
                )}
                {extraSPBonus > 0 && <span className="text-amber-400">(+{extraSPBonus} SP)</span>}
                <span>=</span>
                <strong className="text-emerald-400 text-sm">
                  2W10 {totalAttackModifier + extraSPBonus >= 0 ? `+ ${totalAttackModifier + extraSPBonus}` : `- ${Math.abs(totalAttackModifier + extraSPBonus)}`}
                </strong>
              </div>

              <span className="text-stone-400">
                Ziel-VTD: <strong className="text-white">{effectiveTargetVTD}</strong>
              </span>
            </div>

            {/* Roll trigger buttons */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleExecuteRoll()}
                disabled={isRolling}
                className="flex-1 bg-gradient-to-r from-[#1B365D] to-[#254a80] hover:from-[#254a80] hover:to-[#3361a3] text-white border border-[#C5A059] font-bold py-2.5 px-4 rounded-xl text-sm transition-all shadow-md cursor-pointer flex items-center justify-center gap-2 active:scale-98"
              >
                <Dice1 size={18} className="text-[#C5A059]" />
                <span>{hasRolled ? 'Erneut würfeln' : 'Angriff würfeln'}</span>
              </button>

              <button
                type="button"
                onClick={() => setManualInputOpen((prev) => !prev)}
                className="bg-[#0f1722] hover:bg-[#1a283b] text-stone-300 border border-[#2a3c54] py-2.5 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer"
                title="Ergebnis vom echten Spieltisch eingeben"
              >
                Tisch-Wurf
              </button>
            </div>

            {/* Manual table dice input */}
            {manualInputOpen && (
              <form onSubmit={handleManualRollSubmit} className="flex items-center gap-2 bg-[#0e1622] p-2 rounded-lg border border-amber-600/40">
                <span className="text-xs text-stone-300">Würfelsumme (2W10):</span>
                <input
                  type="number"
                  min="2"
                  max="30"
                  placeholder="z.B. 14"
                  value={manualRollVal}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => setManualRollVal(e.target.value)}
                  className="w-20 bg-[#162335] text-white font-mono font-bold text-center px-2 py-1 rounded border border-[#2a3c54] text-xs"
                />
                <button
                  type="submit"
                  className="bg-[#C5A059] hover:bg-[#d8b066] text-stone-950 font-bold px-3 py-1 rounded text-xs transition-colors cursor-pointer"
                >
                  Übernehmen
                </button>
              </form>
            )}

            {/* ── ROLL RESULT DISPLAY ── */}
            {hasRolled && egCalculation && (
              <div
                className={`p-3.5 rounded-xl border transition-all ${
                  egCalculation.isSuccess
                    ? isCrit
                      ? 'bg-amber-950/40 border-amber-500 shadow-md shadow-amber-950/20'
                      : 'bg-emerald-950/30 border-emerald-500/80 shadow-md shadow-emerald-950/20'
                    : 'bg-red-950/30 border-red-600/80'
                }`}
              >
                <div className="flex justify-between items-center flex-wrap gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="flex gap-1">
                      {rollDice.map((d, i) => (
                        <span
                          key={i}
                          className="w-8 h-8 rounded-lg bg-[#0e1724] border border-[#2b3e58] text-white font-mono font-extrabold flex items-center justify-center text-sm shadow-xs"
                        >
                          {d}
                        </span>
                      ))}
                    </div>
                    <div>
                      <span className="text-xs text-stone-400 font-mono">
                        [{rollDice.join(' + ')}] + {totalAttackModifier + extraSPBonus} =
                      </span>
                      <span className="font-extrabold text-lg text-white ml-1.5 font-mono">
                        {totalRollResult}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span
                      className={`text-sm font-bold fantasy-font tracking-wide px-2.5 py-0.5 rounded-md border ${
                        egCalculation.isSuccess
                          ? isCrit
                            ? 'bg-amber-900/60 text-amber-200 border-amber-400'
                            : 'bg-emerald-900/60 text-emerald-200 border-emerald-400'
                          : 'bg-red-900/60 text-red-200 border-red-500'
                      }`}
                    >
                      {egCalculation.outcomeLabel}
                    </span>
                    <div className="text-xs text-stone-400 font-mono mt-0.5">
                      Diff: {egCalculation.differenz >= 0 ? `+${egCalculation.differenz}` : egCalculation.differenz} vs. VTD {effectiveTargetVTD}
                    </div>
                  </div>
                </div>

                {egCalculation.isSuccess && (
                  <div className="mt-2.5 pt-2.5 border-t border-white/10 flex items-center justify-between text-xs">
                    <span className="font-semibold text-stone-300">
                      Erfolgsgrade (EG):{' '}
                      <strong className="text-emerald-400 text-sm font-bold font-mono">
                        {egCalculation.eg} EG
                      </strong>
                    </span>
                    <span className="text-stone-400">
                      Verbleibend zum Zuweisen:{' '}
                      <strong
                        className={`font-mono font-bold ${
                          remainingEG === 0 ? 'text-stone-300' : 'text-amber-400'
                        }`}
                      >
                        {remainingEG} EG
                      </strong>
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── ROW 4: ERFOLGSGRADE ZUWEISEN (WENN TREFFER) ── */}
          {hasRolled && egCalculation && egCalculation.isSuccess && (
            <div className="bg-[#182333] border border-[#2b3a4f] rounded-xl p-3.5 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold uppercase tracking-wider text-[#C5A059] fantasy-font flex items-center gap-1.5">
                  <Award size={14} /> 4. Erfolgsgrade einsetzen ({egCalculation.eg} EG verfügbar)
                </span>
                <span className="text-xs font-mono text-stone-400">
                  Eingesetzt: {totalEgAllocated} / {totalEgAvailable} EG
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                {/* 1. Schaden erhöhen */}
                <div className="bg-[#0f1722] p-2.5 rounded-lg border border-[#253549] flex items-center justify-between">
                  <div>
                    <span className="font-bold text-white block">
                      Schaden erhöhen
                    </span>
                    <span className="text-[11px] text-stone-400">
                      {selectedManeuver.egDamageRate === 2
                        ? 'Wuchtangriff: +2 Schaden / EG!'
                        : '+1 Schaden / EG'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setEgDamageSpent((prev) => Math.max(0, prev - 1))}
                      disabled={egDamageSpent <= 0}
                      className="w-6 h-6 rounded bg-[#182638] hover:bg-[#253952] disabled:opacity-30 text-white font-bold flex items-center justify-center cursor-pointer"
                    >
                      −
                    </button>
                    <span className="w-6 text-center font-mono font-bold text-white">
                      {egDamageSpent}
                    </span>
                    <button
                      type="button"
                      onClick={() => setEgDamageSpent((prev) => (remainingEG > 0 ? prev + 1 : prev))}
                      disabled={remainingEG <= 0}
                      className="w-6 h-6 rounded bg-[#182638] hover:bg-[#253952] disabled:opacity-30 text-white font-bold flex items-center justify-center cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* 2. Rüstung durchdringen (Gezielter Schlag) */}
                <div className="bg-[#0f1722] p-2.5 rounded-lg border border-[#253549] flex items-center justify-between">
                  <div>
                    <span className="font-bold text-white block">
                      Rüstung umgehen
                    </span>
                    <span className="text-[11px] text-stone-400">
                      -1 gegnerische RS / EG
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setEgArmorPenSpent((prev) => Math.max(0, prev - 1))}
                      disabled={egArmorPenSpent <= 0}
                      className="w-6 h-6 rounded bg-[#182638] hover:bg-[#253952] disabled:opacity-30 text-white font-bold flex items-center justify-center cursor-pointer"
                    >
                      −
                    </button>
                    <span className="w-6 text-center font-mono font-bold text-white">
                      {egArmorPenSpent}
                    </span>
                    <button
                      type="button"
                      onClick={() => setEgArmorPenSpent((prev) => (remainingEG > 0 ? prev + 1 : prev))}
                      disabled={remainingEG <= 0}
                      className="w-6 h-6 rounded bg-[#182638] hover:bg-[#253952] disabled:opacity-30 text-white font-bold flex items-center justify-center cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* 3. Umreißen / Zu Boden werfen (2 EG) */}
                <div className="bg-[#0f1722] p-2.5 rounded-lg border border-[#253549] flex items-center justify-between">
                  <div>
                    <span className="font-bold text-white block">
                      Zu Boden werfen
                    </span>
                    <span className="text-[11px] text-stone-400">
                      Kostet 2 EG: Ziel erhält <em>Liegend</em>
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (egTripSpent) {
                        setEgTripSpent(false);
                      } else if (remainingEG >= 2) {
                        setEgTripSpent(true);
                      } else {
                        toast('Benötigt mindestens 2 ungenutzte Erfolgsgrade');
                      }
                    }}
                    className={`px-3 py-1 rounded font-bold text-xs border transition-all cursor-pointer ${
                      egTripSpent
                        ? 'bg-emerald-950 text-emerald-300 border-emerald-500'
                        : 'bg-[#182638] text-stone-400 border-[#2a3c54] hover:bg-[#253952]'
                    }`}
                  >
                    {egTripSpent ? '✓ Aktiv (2 EG)' : '2 EG'}
                  </button>
                </div>

                {/* 4. Defensiver Bonus (+1 VTD pro EG, max 3) */}
                <div className="bg-[#0f1722] p-2.5 rounded-lg border border-[#253549] flex items-center justify-between">
                  <div>
                    <span className="font-bold text-white block">
                      Eigene Abwehr
                    </span>
                    <span className="text-[11px] text-stone-400">
                      +1 VTD bis nächste Aktion / EG (max 3)
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setEgDefensiveSpent((prev) => Math.max(0, prev - 1))}
                      disabled={egDefensiveSpent <= 0}
                      className="w-6 h-6 rounded bg-[#182638] hover:bg-[#253952] disabled:opacity-30 text-white font-bold flex items-center justify-center cursor-pointer"
                    >
                      −
                    </button>
                    <span className="w-6 text-center font-mono font-bold text-white">
                      {egDefensiveSpent}
                    </span>
                    <button
                      type="button"
                      onClick={() => setEgDefensiveSpent((prev) => (remainingEG > 0 && prev < 3 ? prev + 1 : prev))}
                      disabled={remainingEG <= 0 || egDefensiveSpent >= 3}
                      className="w-6 h-6 rounded bg-[#182638] hover:bg-[#253952] disabled:opacity-30 text-white font-bold flex items-center justify-center cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── ROW 5: DIREKTER SCHADENSWURF (INTEGRIERTER SCHADEN) ── */}
          {hasRolled && egCalculation && egCalculation.isSuccess && (
            <div className="bg-[#182333] border border-[#2b3a4f] rounded-xl p-3.5 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold uppercase tracking-wider text-[#C5A059] fantasy-font flex items-center gap-1.5">
                  <Flame size={14} className="text-red-400" /> 5. Schaden auswürfeln
                </span>
                <span className="text-xs font-mono text-stone-300">
                  Formel: <strong className="text-red-400">{weapon.damage || '1W6'}</strong>
                  {selectedManeuver.extraDamageFormula && ` + ${selectedManeuver.extraDamageFormula}`}
                  {extraSpellDmg > 0 && ` + ${extraSpellDmg} Zauber`}
                  {egDamageSpent > 0 && ` + ${egDamageSpent * (selectedManeuver.egDamageRate ?? 1)} EG`}
                </span>
              </div>

              {/* Damage Action Button */}
              <button
                type="button"
                onClick={handleRollDamage}
                className="w-full damage-roll-btn font-bold py-2.5 px-4 rounded-xl text-sm transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-98"
              >
                <Flame size={16} />
                <span>
                  {damageRollResult
                    ? 'Schaden erneut würfeln'
                    : `Schaden würfeln (${weapon.damage || '1W6'}${
                        selectedManeuver.extraDamageFormula ? ` + ${selectedManeuver.extraDamageFormula}` : ''
                      }${extraSpellDmg > 0 ? ` + ${extraSpellDmg} Zauber` : ''}${
                        egDamageSpent > 0 ? ` + ${egDamageSpent * (selectedManeuver.egDamageRate ?? 1)} EG` : ''
                      })`}
                </span>
              </button>

              {/* Damage Roll Result Details */}
              {damageRollResult && (
                <div className="bg-[#0f1722] p-3 rounded-xl border border-red-950/70 space-y-2">
                  <div className="flex justify-between items-center flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-stone-400 font-mono">Waffenschaden:</span>
                      <span className="text-sm font-mono font-bold text-white">
                        [{damageRollResult.baseDice.join(', ')}]
                        {damageRollResult.baseBonus !== 0 && (damageRollResult.baseBonus > 0 ? ` + ${damageRollResult.baseBonus}` : ` - ${Math.abs(damageRollResult.baseBonus)}`)}
                      </span>
                      {damageRollResult.maneuverDice.length > 0 && (
                        <span className="text-xs text-amber-300 font-mono">
                          + Manöver [{damageRollResult.maneuverDice.join(', ')}]
                        </span>
                      )}
                      {extraSpellDmg > 0 && (
                        <span className="text-xs text-orange-300 font-mono">
                          + {extraSpellDmg} Zauber
                        </span>
                      )}
                      {egDamageSpent > 0 && (
                        <span className="text-xs text-emerald-300 font-mono">
                          + {egDamageSpent * (selectedManeuver.egDamageRate ?? 1)} EG
                        </span>
                      )}
                    </div>

                    <div className="text-right">
                      <span className="text-xs text-stone-400 mr-1.5">Netto am Ziel:</span>
                      <span className="text-lg font-extrabold text-red-400 font-mono">
                        💥 {damageRollResult.netDamage} {damageRollResult.damageType}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-[#202f42] text-xs font-mono text-stone-400 flex justify-between items-center flex-wrap gap-2">
                    <span>
                      Brutto: <strong className="text-white">{damageRollResult.grossDamage}</strong>
                      {targetArmor > 0 && (
                        <span>
                          {' '}· Rüstung: -{damageRollResult.effectiveArmor} RS
                          {damageRollResult.effectiveArmor < targetArmor && (
                            <span className="text-emerald-400"> ({targetArmor - damageRollResult.effectiveArmor} ignoriert)</span>
                          )}
                        </span>
                      )}
                    </span>

                    {damageRollResult.appliedConditions.length > 0 && (
                      <span className="text-amber-400 font-bold">
                        Effekte: {damageRollResult.appliedConditions.join(', ')}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Optional Notes */}
          <div>
            <input
              type="text"
              value={attackNote}
              onChange={(e) => setAttackNote(e.target.value)}
              placeholder="Notiz zum Ziel / Angriff (optional, z.B. 'Ork-Anführer mit Schild')..."
              className="w-full bg-[#0d1520] border border-[#2a3c54] rounded-lg text-xs text-stone-200 px-3 py-2 focus:outline-hidden focus:border-[#C5A059]"
            />
          </div>
        </div>

        {/* ── FOOTER ACTIONS ── */}
        <div className="bg-[#172437] p-3.5 sm:p-4 border-t border-[#C5A059]/40 flex items-center justify-between gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-stone-800 hover:bg-stone-700 text-stone-300 transition-colors cursor-pointer"
          >
            Abbrechen
          </button>

          <div className="flex items-center gap-2">
            {hasRolled && (
              egCalculation?.isSuccess && attackCausesDamage && !damageRollResult ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCompleteAttack}
                    className="px-3 py-2 text-xs font-semibold text-stone-400 hover:text-stone-200 underline decoration-dotted transition-colors cursor-pointer"
                    title="Angriff abschließen ohne Schaden auszuwürfeln"
                  >
                    Ohne Schaden vollenden
                  </button>
                  <button
                    type="button"
                    onClick={handleRollDamage}
                    className="bg-[#C5A059] hover:bg-[#d8b066] text-stone-950 font-bold px-4 py-2 rounded-xl text-xs sm:text-sm transition-all shadow-md flex items-center gap-1.5 cursor-pointer active:scale-95"
                  >
                    <Flame size={16} className="text-red-700" />
                    <span>
                      Schaden würfeln ({weapon.damage || '1W6'}
                      {selectedManeuver.extraDamageFormula ? ` + ${selectedManeuver.extraDamageFormula}` : ''}
                      {egDamageSpent > 0 ? ` + ${egDamageSpent * (selectedManeuver.egDamageRate ?? 1)} EG` : ''})
                    </span>
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleCompleteAttack}
                  className="bg-[#C5A059] hover:bg-[#d8b066] text-stone-950 font-bold px-4 py-2 rounded-xl text-xs sm:text-sm transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
                >
                  <Check size={16} />
                  <span>
                    Angriff vollenden
                    {damageRollResult ? ` (· 💥 ${damageRollResult.netDamage} Schaden)` : ''}
                  </span>
                </button>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AttackModal;
