import { Dialogfenster, Dialoghintergrund } from '../../fundament';
import React, { useState, useMemo, useEffect, useId, useContext } from 'react';
import { Knopf, Dialog } from '../../fundament';
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
  isMeleeWeapon,
  manoeverRegeln,
  wuchtangriffJeEg,
  type AngreiferWerte,
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
  /** Störender Angriff: EG, je +3 auf die Entschlossenheit-Probe des Ziels (GRW S. 161) */
  egStoerendSpent: number;
  /** Betäubungsschlag (1 EG): Schaden als Betäubungsschaden */
  betaeubungsschlag: boolean;
  /** weitere EG für das angesagte Manöver (z. B. Abdrängen je 0,5 m) */
  egManoeverExtra: number;
  /** zu wenige EG für das angesagte Manöver: Streiftreffer (GRW S. 161) */
  streiftreffer: boolean;
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
  /** Werte des Angreifers für Zusatzschaden aus Manövern (Stärke, Intuition, Geschwindigkeit) */
  angreiferWerte?: AngreiferWerte;
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
const KEINE_WERTE: AngreiferWerte = {};
const WIDERSTAND_TEXT: Record<'VTD' | 'KW' | 'GW', string> = { VTD: 'Verteidigung (VTD)', KW: 'Körperlicher Widerstand (KW)', GW: 'Geistiger Widerstand (GW)' };

/** Zähler für Erfolgsgrade (−/+), mindestens 44 Pixel hohe Knöpfe */
const EgZaehler: React.FC<{ titel: string; text: string; wert: number; setze: (f: (v: number) => number) => void; mehrMoeglich: boolean; testid: string }> = ({ titel, text, wert, setze, mehrMoeglich, testid }) => (
  <div className="bg-seite p-2.5 rounded-knopf border border-rahmen flex items-center justify-between gap-2" data-testid={testid}>
    <div>
      <span className="font-bold text-schrift block">{titel}</span>
      <span className="text-[11px] text-leise">{text}</span>
    </div>
    <div className="flex items-center gap-1.5">
      <Knopf nurSymbol aria-label={`${titel}: ein EG weniger`} disabled={wert <= 0} onClick={() => setze((v) => Math.max(0, v - 1))}>−</Knopf>
      <span className="w-6 text-center tabular-nums font-bold text-schrift" data-testid={`${testid}-wert`}>{wert}</span>
      <Knopf nurSymbol aria-label={`${titel}: ein EG mehr`} disabled={!mehrMoeglich} onClick={() => setze((v) => (mehrMoeglich ? v + 1 : v))}>+</Knopf>
    </div>
  </div>
);

export const AttackModal: React.FC<AttackModalProps> = ({
  target,
  characterMasteries = [],
  angreiferWerte = KEINE_WERTE,
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
    return getAvailableCombatManeuvers(characterMasteries, skillName, weapon.category, angreiferWerte);
  }, [characterMasteries, skillName, weapon.category, angreiferWerte]);
  // Freie Manöver und Streiftreffer aus dem Paket (GRW S. 161)
  const regeln = useMemo(() => manoeverRegeln(), []);
  const nahkampf = isMeleeWeapon(skillName, weapon.category);
  const wuchtJeEg = useMemo(() => wuchtangriffJeEg(weapon.attributes), [weapon.attributes]);
  const stoerend = regeln.freie.find((f) => f.je_eg?.entschlossenheit_erschwert);
  const betaeubung = regeln.freie.find((f) => f.betaeubungsschaden && (!f.nur_nahkampf || nahkampf));

  const [selectedManeuver, setSelectedManeuver] = useState<CombatManeuver>(availableManeuvers[0] || FREE_COMBAT_MANEUVERS[0]);

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
  // Zustände für Kampffertigkeiten; der Wundabzug selbst wird unten gesondert gezeigt
  const conditionMods = useMemo(() => getActiveRollModifiers(conditions, woundPenalty, '', 0, false, 'kampf').filter((m) => m.source === 'condition'), [conditions, woundPenalty]);
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
  const [egStoerendSpent, setEgStoerendSpent] = useState<number>(0);
  const [betaeubungsschlag, setBetaeubungsschlag] = useState<boolean>(false);
  const [egManoeverExtra, setEgManoeverExtra] = useState<number>(0);

  const totalEgAvailable = egCalculation?.eg ?? 0;
  // Ein angesagtes Meisterschafts-Manöver kostet EG; reichen sie nicht, ist es ein Streiftreffer und alle EG verfallen
  const manoeverKosten = selectedManeuver.egCost ?? 0;
  const streiftreffer = !!egCalculation?.isSuccess && totalEgAvailable < manoeverKosten;
  const freieEg = streiftreffer ? 0 : Math.max(0, totalEgAvailable - manoeverKosten);
  const totalEgAllocated = egDamageSpent + egStoerendSpent + (betaeubungsschlag ? (betaeubung?.eg ?? 1) : 0) + egManoeverExtra;
  const remainingEG = Math.max(0, freieEg - totalEgAllocated);
  const verteileStandard = (eg: number, erfolg: boolean) => {
    const frei = erfolg && eg >= manoeverKosten ? eg - manoeverKosten : 0;
    setEgDamageSpent(frei);
    setEgStoerendSpent(0);
    setBetaeubungsschlag(false);
    setEgManoeverExtra(0);
  };

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
      verteileStandard(calc.eg, calc.isSuccess);
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
    verteileStandard(calc.eg, calc.isSuccess);
  };

  // Perform the Damage Roll
  const handleRollDamage = () => {
    const egBonus = streiftreffer ? 0 : egDamageSpent * wuchtJeEg;
    const angesagt = selectedManeuver.type === 'mastery' ? 1 : 0;

    const res = executeAttackDamageRoll({
      baseFormula: weapon.damage || '1W6',
      // Beim Streiftreffer bleiben die Effekte der Manöver aus; Schadenseinschränkungen (halber Schaden) gelten weiter
      maneuverExtraFormula: streiftreffer ? undefined : selectedManeuver.extraDamageFormula,
      maneuverFixedDamage: streiftreffer ? 0 : selectedManeuver.fixedExtraDamage,
      egBonusDamage: egBonus + extraSpellDmg,
      damageMultiplier: selectedManeuver.damageMultiplier ?? 1,
      targetArmorReduction: targetArmor,
      maneuverCondition: streiftreffer ? undefined : selectedManeuver.inflictsCondition,
      stunDamage: betaeubungsschlag && !streiftreffer,
      streiftrefferAbzug: streiftreffer ? angesagt * regeln.streiftrefferSchaden : 0,
    });

    setDamageRollResult(res);
    const spellDmgText = extraSpellDmg > 0 ? ` (inkl. ${spellWeaponDamage.bonusText})` : '';
    toast.success(`${res.netDamage} Schaden erzielt! (${res.grossDamage} Brutto - ${res.effectiveArmor} RS)${spellDmgText}`);
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
            damageRollResult ? ` · ${damageRollResult.netDamage} Schaden (${damageRollResult.breakdownText})` : ''
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
        egStoerendSpent,
        betaeubungsschlag,
        egManoeverExtra,
        streiftreffer,
        isCrit,
        damageRoll: damageRollResult || undefined,
        notes: attackNote,
      });

      const dmgText = damageRollResult ? ` · ${damageRollResult.netDamage} Schaden angerichtet!` : '';
      toast.success(`Treffer mit ${weapon.name}! (${egCalculation.eg} EG)${dmgText}`);
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

      toast(`Angriff mit ${weapon.name} verfehlt (Diff ${egCalculation.differenz}).`);
    }

    onClose();
  };

  return (
    <Dialoghintergrund
      role="dialog"
      aria-modal="true"
      aria-labelledby={modalHeadingId} className="animate-fadeIn"
    >
      <Dialogfenster breite="2xl">
        {/* ── HEADER ── */}
        <div className="p-4 sm:p-5 border-b border-gold flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-karte bg-schaden-grund border border-schaden flex items-center justify-center shrink-0">
              <Sword size={22} className="text-schaden" />
            </div>
            <div className="min-w-0">
              <h3 id={modalHeadingId} className="font-bold text-lg sm:text-xl fantasy-font text-gold-hell truncate flex items-center gap-2">
                <span>Angriff: {weapon.name}</span>
                <span className="text-xs bg-erhoeht text-gold px-2 py-0.5 rounded-knopf border border-rahmen tabular-nums font-semibold">
                  {skillName}
                </span>
              </h3>
              <p className="text-xs text-schrift tabular-nums flex items-center gap-2 mt-0.5 flex-wrap">
                <span>
                  Basis-AT: <strong className="text-schrift">{skillTotal}</strong>
                </span>
                <span>·</span>
                <span>
                  Schaden: <strong className="text-schaden">{weapon.damage || '1W6'}</strong>
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
                    <span className="italic text-leise truncate max-w-[180px]" title={weapon.attributes}>
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
                className="min-h-11 bg-erschoepft-grund hover:bg-erschoepft text-gold-hell border border-erschoepft px-2.5 py-1 rounded-knopf text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                title="Splitterpunkt einsetzen: +3 auf den Wurf"
              >
                <Sparkles size={13} className="text-gold" />
                <span>+3 (SP: {splitterpunkte})</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="min-h-11 min-w-11 inline-flex items-center justify-center text-leise hover:text-schrift hover:bg-rahmen rounded-knopf transition-colors cursor-pointer"
              title="Schließen (Esc)" aria-label="Schließen"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* ── MODAL BODY (Scrollable) ── */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-schrift">
          {/* ── ROW 1: ZIEL-VERTEIDIGUNG & SITUATION ── */}
          <div className="bg-seite border border-rahmen rounded-karte p-3.5 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold uppercase tracking-wider text-gold fantasy-font flex items-center gap-1.5">
                <Target size={14} /> 1. Ziel &amp; Verteidigung (VTD)
              </span>
              <span className="text-xs tabular-nums font-bold text-schrift bg-seite px-2 py-0.5 rounded-knopf border border-rahmen">
                Effektive VTD: {effectiveTargetVTD}
              </span>
            </div>

            {/* VTD Input & Presets */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-leise block mb-1">{WIDERSTAND_TEXT[selectedManeuver.targetResistance ?? 'VTD']} des Ziels:</label>
                <div className="flex items-center gap-1.5">
                  <div className="flex-1 flex items-center bg-seite border border-rahmen rounded-knopf overflow-hidden">
                    <Knopf
                      onClick={() => setTargetVTD((prev) => Math.max(5, prev - 1))}
                    >
                      −
                    </Knopf>
                    <input
                      type="number"
                      value={targetVTD}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => setTargetVTD(Math.max(1, parseInt(e.target.value, 10) || 15))}
                      className="w-full text-center bg-transparent text-schrift tabular-nums font-bold text-sm py-1.5 focus:outline-hidden"
                    />
                    <Knopf
                      onClick={() => setTargetVTD((prev) => prev + 1)}
                    >
                      +
                    </Knopf>
                  </div>
                  {/* Quick Presets */}
                  <div className="flex gap-1">
                    {[15, 18, 21, 24].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setTargetVTD(val)}
                        className={`min-h-11 px-2 py-1 text-xs rounded-knopf border transition-all cursor-pointer tabular-nums font-semibold ${
                          targetVTD === val
                            ? 'bg-gold text-seite border-gold-hell'
                            : 'bg-seite text-schrift border-rahmen hover:bg-flaeche hover:text-schrift'
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
                <label className="text-xs text-leise block mb-1">Gegnerische Rüstung (RS):</label>
                <div className="flex items-center gap-1.5">
                  <div className="flex-1 flex items-center bg-seite border border-rahmen rounded-knopf overflow-hidden">
                    <Knopf
                      onClick={() => setTargetArmor((prev) => Math.max(0, prev - 1))}
                    >
                      −
                    </Knopf>
                    <input
                      type="number"
                      value={targetArmor}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => setTargetArmor(Math.max(0, parseInt(e.target.value, 10) || 0))}
                      className="w-full text-center bg-transparent text-schrift tabular-nums font-bold text-sm py-1.5 focus:outline-hidden"
                    />
                    <Knopf
                      onClick={() => setTargetArmor((prev) => prev + 1)}
                    >
                      +
                    </Knopf>
                  </div>
                  <div className="flex gap-1">
                    {[0, 2, 4, 6].map((rs) => (
                      <button
                        key={rs}
                        type="button"
                        onClick={() => setTargetArmor(rs)}
                        className={`min-h-11 px-2 py-1 text-xs rounded-knopf border transition-all cursor-pointer tabular-nums font-semibold ${
                          targetArmor === rs
                            ? 'bg-erschoepft text-seite border-erschoepft'
                            : 'bg-seite text-schrift border-rahmen hover:bg-flaeche'
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
              <div className="bg-magie-grund border border-magie rounded-karte p-3 text-xs space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-magie flex items-center gap-1.5 uppercase tracking-wide text-[11px]">
                    <Sparkles size={13} className="text-magie" /> Aktive Zauber-Wirkungen
                  </span>
                  {spellAttackBonusTotal > 0 && (
                    <span className="tabular-nums font-bold px-2 py-0.5 rounded-knopf bg-magie-grund text-schrift border border-magie">
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
                        className={`min-h-11 flex items-center gap-1 px-2.5 py-1 rounded-knopf text-xs font-semibold border transition-all cursor-pointer ${
                          isActive
                            ? 'bg-magie-grund text-schrift border-magie '
                            : 'bg-seite text-leise border-rahmen line-through'
                        }`}
                        title={`${b.description} (Klicken zum ${isActive ? 'Abwählen' : 'Aktivieren'})`}
                      >
                        {isActive ? <Check size={12} className="text-magie" /> : <X size={12} className="text-leise" />}
                        <span>{b.source}</span>
                        <span className="tabular-nums font-bold text-magie">+{b.bonus} AT</span>
                      </button>
                    );
                  })}
                  {spellWeaponDamage.totalDamage > 0 && (
                    <span className="flex items-center gap-1 px-2.5 py-1 rounded-knopf text-xs font-semibold bg-erschoepft-grund text-gold-hell border border-erschoepft ">
                      <Flame size={12} className="text-erschoepft" />
                      <span>{spellWeaponDamage.bonusText}</span>
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Situational Toggles */}
            <div className="flex flex-wrap gap-2 pt-2 border-t border-rahmen text-xs">
              <button
                type="button"
                onClick={() => setTargetLying((prev) => !prev)}
                className={`min-h-11 px-2.5 py-1 rounded-knopf border transition-all flex items-center gap-1.5 cursor-pointer font-semibold ${
                  targetLying
                    ? 'bg-magie-grund text-schrift border-magie'
                    : 'bg-seite text-leise border-rahmen hover:bg-seite'
                }`}
              >
                <span>{targetLying ? '✓' : '+'}</span>
                <span>Gegner liegt (+2 Nahkampf)</span>
              </button>

              <button
                type="button"
                onClick={() => setAdvantageFlank((prev) => !prev)}
                className={`min-h-11 px-2.5 py-1 rounded-knopf border transition-all flex items-center gap-1.5 cursor-pointer font-semibold ${
                  advantageFlank
                    ? 'bg-magie-grund text-schrift border-magie'
                    : 'bg-seite text-leise border-rahmen hover:bg-seite'
                }`}
              >
                <span>{advantageFlank ? '✓' : '+'}</span>
                <span>Vorteil / Überzahl (+1)</span>
              </button>

              <button
                type="button"
                onClick={() => setTargetCover((prev) => !prev)}
                className={`min-h-11 px-2.5 py-1 rounded-knopf border transition-all flex items-center gap-1.5 cursor-pointer font-semibold ${
                  targetCover
                    ? 'bg-erschoepft-grund text-gold-hell border-erschoepft'
                    : 'bg-seite text-leise border-rahmen hover:bg-seite'
                }`}
              >
                <span>{targetCover ? '✓' : '+'}</span>
                <span>Ziel in Deckung (+2 VTD)</span>
              </button>

              <div className="flex items-center gap-1 ml-auto">
                <span className="text-leise text-xs">Situations-Mod:</span>
                <button
                  type="button"
                  onClick={() => setSituationalMod((prev) => prev - 1)}
                  className="w-6 h-6 rounded-knopf bg-seite hover:bg-rahmen text-schrift font-bold flex items-center justify-center border border-rahmen cursor-pointer"
                >
                  −
                </button>
                <span className="w-7 text-center tabular-nums font-bold text-xs text-schrift">
                  {situationalMod >= 0 ? `+${situationalMod}` : situationalMod}
                </span>
                <button
                  type="button"
                  onClick={() => setSituationalMod((prev) => prev + 1)}
                  className="w-6 h-6 rounded-knopf bg-seite hover:bg-rahmen text-schrift font-bold flex items-center justify-center border border-rahmen cursor-pointer"
                >
                  +
                </button>
              </div>
            </div>

            {/* Conditions & Wound Penalty summary */}
            {(woundPenalty !== 0 || conditionMods.length > 0) && (
              <div className="pt-2 border-t border-rahmen flex flex-wrap items-center gap-1.5 text-xs">
                <span className="text-leise flex items-center gap-1">
                  <AlertCircle size={13} className="text-gold" />
                  Aktive Abzüge:
                </span>
                {woundPenalty !== 0 && (
                  <span className="bg-schaden-grund text-schrift px-2 py-0.5 rounded-knopf text-[11px] font-bold border border-schaden">
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
                    className={`min-h-11 px-2 py-0.5 rounded-knopf text-[11px] font-bold border transition-colors cursor-pointer ${
                      activeConditionsState[c.id]
                        ? 'bg-schaden-grund text-schrift border-schaden'
                        : 'bg-seite text-leise border-rahmen line-through'
                    }`}
                  >
                    {c.label} ({c.malus})
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ── ROW 2: MANÖVER-AUSWAHL (EXAKT NACH REGELWERK) ── */}
          <div className="bg-seite border border-rahmen rounded-karte p-3.5 space-y-2.5">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold uppercase tracking-wider text-gold fantasy-font flex items-center gap-1.5">
                <Zap size={14} /> 2. Meisterschafts-Manöver ansagen
              </span>
              <span className="text-xs text-leise font-medium">
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
                    title={[m.page ? `${m.source ?? 'GRW'} S. ${m.page}` : '', ...(m.belege ?? [])].filter(Boolean).join('\n') || undefined}
                    aria-pressed={isSelected}
                    data-testid={`manoever-${m.id}`}
                    className={`min-h-11 text-left p-2.5 rounded-knopf border transition-all cursor-pointer relative flex flex-col justify-between ${
                      isSelected
                        ? 'bg-flaeche border-gold ring-1 ring-rahmen'
                        : 'bg-seite border-rahmen hover:bg-seite hover:border-rahmen'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <div className="flex items-center gap-1.5 font-bold text-xs text-schrift">
                        <span>{m.name}</span>
                      </div>
                      <span
                        className={`text-[11px] px-1.5 py-0.2 rounded-knopf font-semibold uppercase tracking-wider ${
                          isMastery
                            ? 'bg-erschoepft-grund text-gold-hell border border-erschoepft'
                            : 'bg-seite text-schrift'
                        }`}
                      >
                        {isMastery ? `${m.egCost} EG` : 'Ohne'}
                      </span>
                    </div>
                    <p className="text-[11px] text-schrift leading-snug line-clamp-2">
                      {m.shortDesc}
                    </p>
                  </button>
                );
              })}
            </div>

            {/* Beschreibung und Voraussetzungen des gewählten Manövers (aus dem Paket) */}
            {selectedManeuver && selectedManeuver.description && (
              <div className="bg-seite p-2.5 rounded-knopf border border-rahmen text-xs text-schrift mt-1 space-y-1">
                <div>
                  <span className="font-bold text-gold-hell">{selectedManeuver.name}</span>
                  {selectedManeuver.page ? <span className="text-leise"> ({selectedManeuver.source ?? 'GRW'} S. {selectedManeuver.page})</span> : null}:{' '}
                  <span>{selectedManeuver.description}</span>
                </div>
                {selectedManeuver.requires === 'zielen' && <div data-testid="manoever-voraussetzung">Voraussetzung: mindestens eine Zielen-Aktion vor dem Angriff.</div>}
                {selectedManeuver.requires === 'ringend' && <div data-testid="manoever-voraussetzung">Voraussetzung: Angreifer und Ziel sind ringend.</div>}
                {selectedManeuver.hoechstensGk && <div>Nur gegen Ziele bis Größenklasse {selectedManeuver.hoechstensGk}.</div>}
              </div>
            )}
          </div>

          {/* ── ROW 3: WURF AUSFÜHREN ── */}
          <div className="bg-seite border border-rahmen rounded-karte p-3.5 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold uppercase tracking-wider text-gold fantasy-font flex items-center gap-1.5">
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
                    className={`min-h-11 px-2 py-0.5 text-xs rounded-knopf border transition-all cursor-pointer font-medium ${
                      rollType === mode
                        ? 'bg-erhoeht text-schrift border-gold'
                        : 'bg-seite text-leise border-rahmen'
                    }`}
                  >
                    {mode === 'standard' ? 'Standard' : mode === 'safe' ? 'Sicherheit' : 'Risiko'}
                  </button>
                ))}
              </div>
            </div>

            {/* Total calculation formula bar */}
            <div className="bg-seite p-2.5 rounded-knopf border border-rahmen flex items-center justify-between text-xs tabular-nums flex-wrap gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-leise">Probe:</span>
                <span className="text-schrift font-bold">2W10</span>
                <span>+</span>
                <span title="Basis-AT">{skillTotal} AT</span>
                {woundPenalty !== 0 && (
                  <span className="text-schaden">({woundPenalty} Wunde)</span>
                )}
                {totalConditionPenalty !== 0 && (
                  <span className="text-schaden">({totalConditionPenalty} Zustand)</span>
                )}
                {situativ.summe !== 0 && (
                  <span className="text-unverletzt">({situativ.summe > 0 ? '+' : ''}{situativ.summe} Stärken/Meisterschaften)</span>
                )}
                {situationalMod + situationPresetBonus !== 0 && (
                  <span className="text-unverletzt">
                    ({situationalMod + situationPresetBonus > 0 ? `+${situationalMod + situationPresetBonus}` : situationalMod + situationPresetBonus} Sit.)
                  </span>
                )}
                {extraSPBonus > 0 && <span className="text-gold">(+{extraSPBonus} SP)</span>}
                <span>=</span>
                <strong className="text-unverletzt text-sm">
                  2W10 {totalAttackModifier + extraSPBonus >= 0 ? `+ ${totalAttackModifier + extraSPBonus}` : `- ${Math.abs(totalAttackModifier + extraSPBonus)}`}
                </strong>
              </div>

              <span className="text-leise">
                Ziel-{selectedManeuver.targetResistance ?? 'VTD'}: <strong className="text-schrift">{effectiveTargetVTD}</strong>
              </span>
            </div>

            {/* Roll trigger buttons */}
            <div className="flex items-center gap-2">
              <Knopf art="primaer"
                onClick={() => handleExecuteRoll()}
                disabled={isRolling}
                className="flex-1 text-sm gap-2 active:scale-98"
              >
                <Dice1 size={18} className="text-gold" />
                <span>{hasRolled ? 'Erneut würfeln' : 'Angriff würfeln'}</span>
              </Knopf>

              <Knopf
                onClick={() => setManualInputOpen((prev) => !prev)}
                className="text-xs"
                title="Ergebnis vom echten Spieltisch eingeben"
              >
                Tisch-Wurf
              </Knopf>
            </div>

            {/* Manual table dice input */}
            {manualInputOpen && (
              <form onSubmit={handleManualRollSubmit} className="flex items-center gap-2 bg-seite p-2 rounded-knopf border border-erschoepft">
                <span className="text-xs text-schrift">Würfelsumme (2W10):</span>
                <input
                  type="number"
                  min="2"
                  max="30"
                  placeholder="z.B. 14"
                  value={manualRollVal}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => setManualRollVal(e.target.value)}
                  className="w-20 bg-seite text-schrift tabular-nums font-bold text-center px-2 py-1 rounded-knopf border border-rahmen text-xs"
                />
                <Knopf art="primaer"
                  type="submit"
                  className="text-xs"
                >
                  Übernehmen
                </Knopf>
              </form>
            )}

            {/* ── ROLL RESULT DISPLAY ── */}
            {hasRolled && egCalculation && (
              <div
                className={`p-3.5 rounded-karte border transition-all ${
                  egCalculation.isSuccess
                    ? isCrit
                      ? 'bg-erschoepft-grund border-erschoepft shadow-amber-950/20'
                      : 'bg-unverletzt-grund border-unverletzt'
                    : 'bg-schaden-grund border-schaden'
                }`}
              >
                <div className="flex justify-between items-center flex-wrap gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="flex gap-1">
                      {rollDice.map((d, i) => (
                        <span
                          key={i}
                          className="w-8 h-8 rounded-knopf bg-seite border border-rahmen text-schrift tabular-nums font-extrabold flex items-center justify-center text-sm "
                        >
                          {d}
                        </span>
                      ))}
                    </div>
                    <div>
                      <span className="text-xs text-leise tabular-nums">
                        [{rollDice.join(' + ')}] + {totalAttackModifier + extraSPBonus} =
                      </span>
                      <span className="font-extrabold text-lg text-schrift ml-1.5 tabular-nums">
                        {totalRollResult}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span
                      className={`text-sm font-bold fantasy-font tracking-wide px-2.5 py-0.5 rounded-knopf border ${
                        egCalculation.isSuccess
                          ? isCrit
                            ? 'bg-erschoepft-grund text-gold-hell border-erschoepft'
                            : 'bg-unverletzt-grund text-unverletzt border-unverletzt'
                          : 'bg-schaden-grund text-schrift border-schaden'
                      }`}
                    >
                      {egCalculation.outcomeLabel}
                    </span>
                    <div className="text-xs text-leise tabular-nums mt-0.5">
                      Diff: {egCalculation.differenz >= 0 ? `+${egCalculation.differenz}` : egCalculation.differenz} vs. VTD {effectiveTargetVTD}
                    </div>
                  </div>
                </div>

                {egCalculation.isSuccess && (
                  <div className="mt-2.5 pt-2.5 border-t border-rahmen flex items-center justify-between text-xs">
                    <span className="font-semibold text-schrift">
                      Erfolgsgrade (EG):{' '}
                      <strong className="text-unverletzt text-sm font-bold tabular-nums">
                        {egCalculation.eg} EG
                      </strong>
                    </span>
                    <span className="text-leise">
                      Verbleibend zum Zuweisen:{' '}
                      <strong
                        className={`tabular-nums font-bold ${
                          remainingEG === 0 ? 'text-schrift' : 'text-gold'
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

          {/* ── ROW 4: ERFOLGSGRADE EINSETZEN (WENN TREFFER) – freie Manöver und Kosten des Manövers aus dem Paket, GRW S. 161 ── */}
          {hasRolled && egCalculation && egCalculation.isSuccess && (
            <div className="bg-seite border border-rahmen rounded-karte p-3.5 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold uppercase tracking-wider text-gold fantasy-font flex items-center gap-1.5">
                  <Award size={14} /> 4. Erfolgsgrade einsetzen ({egCalculation.eg} EG)
                </span>
                <span className="text-xs tabular-nums text-leise">
                  Eingesetzt: {totalEgAllocated + (streiftreffer ? 0 : manoeverKosten)} / {totalEgAvailable} EG
                </span>
              </div>

              {selectedManeuver.type === 'mastery' && (
                streiftreffer ? (
                  <div className="p-2.5 rounded-knopf bg-schaden-grund border border-schaden text-xs text-schrift" data-testid="streiftreffer" title={regeln.quelle}>
                    <strong>Streiftreffer:</strong> {selectedManeuver.name} braucht {manoeverKosten} EG. Die Wirkung des Manövers bleibt aus,
                    alle Erfolgsgrade verfallen, und der Schaden sinkt um {regeln.streiftrefferSchaden} (alternativ {regeln.streiftrefferBetaeubung} Punkte
                    Betäubungsschaden für den Angreifer) – {regeln.quelle}.
                  </div>
                ) : (
                  <div className="p-2.5 rounded-knopf bg-erhoeht border border-rahmen text-xs text-schrift" data-testid="manoever-kosten">
                    {selectedManeuver.name}: {manoeverKosten} EG für das angesagte Manöver
                  </div>
                )
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                {/* Wuchtangriff */}
                <EgZaehler
                  titel="Wuchtangriff"
                  text={`+${wuchtJeEg} Schaden je EG${wuchtJeEg > 1 ? ' (Merkmal der Waffe)' : ''}`}
                  wert={egDamageSpent}
                  setze={setEgDamageSpent}
                  mehrMoeglich={remainingEG > 0}
                  testid="eg-wucht"
                />

                {/* Störender Angriff */}
                {stoerend && (
                  <EgZaehler
                    titel="Störender Angriff"
                    text={`Entschlossenheit des Ziels gegen Unterbrechung +${stoerend.je_eg?.entschlossenheit_erschwert} je EG`}
                    wert={egStoerendSpent}
                    setze={setEgStoerendSpent}
                    mehrMoeglich={remainingEG > 0}
                    testid="eg-stoerend"
                  />
                )}

                {/* Betäubungsschlag (nur Nahkampf) */}
                {betaeubung && (
                  <div className="bg-seite p-2.5 rounded-knopf border border-rahmen flex items-center justify-between gap-2">
                    <div>
                      <span className="font-bold text-schrift block">Betäubungsschlag</span>
                      <span className="text-[11px] text-leise">{betaeubung.eg ?? 1} EG: Schaden wird Betäubungsschaden</span>
                    </div>
                    <Knopf
                      art={betaeubungsschlag ? 'erholung' : 'neutral'}
                      aria-pressed={betaeubungsschlag}
                      disabled={!betaeubungsschlag && remainingEG < (betaeubung.eg ?? 1)}
                      onClick={() => setBetaeubungsschlag((v) => !v)}
                      data-testid="eg-betaeubung"
                    >
                      {betaeubungsschlag ? 'Gewählt' : `${betaeubung.eg ?? 1} EG`}
                    </Knopf>
                  </div>
                )}

                {/* Weitere EG für das angesagte Manöver */}
                {selectedManeuver.jeWeiteremEg && !streiftreffer && (
                  <EgZaehler
                    titel={selectedManeuver.name}
                    text={`Je weiterem EG: ${selectedManeuver.jeWeiteremEg}`}
                    wert={egManoeverExtra}
                    setze={setEgManoeverExtra}
                    mehrMoeglich={remainingEG > 0}
                    testid="eg-manoever"
                  />
                )}
              </div>
            </div>
          )}

          {/* ── ROW 5: DIREKTER SCHADENSWURF (INTEGRIERTER SCHADEN) ── */}
          {hasRolled && egCalculation && egCalculation.isSuccess && (
            <div className="bg-seite border border-rahmen rounded-karte p-3.5 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold uppercase tracking-wider text-gold fantasy-font flex items-center gap-1.5">
                  <Flame size={14} className="text-schaden" /> 5. Schaden auswürfeln
                </span>
                <span className="text-xs tabular-nums text-schrift">
                  Formel: <strong className="text-schaden">{weapon.damage || '1W6'}</strong>
                  {selectedManeuver.extraDamageFormula && ` + ${selectedManeuver.extraDamageFormula}`}
                  {extraSpellDmg > 0 && ` + ${extraSpellDmg} Zauber`}
                  {!streiftreffer && egDamageSpent > 0 && ` + ${egDamageSpent * wuchtJeEg} EG`}
                </span>
              </div>

              {/* Damage Action Button */}
              <Knopf
                onClick={handleRollDamage}
                className="w-full damage-roll-btn text-sm gap-2 active:scale-98"
              >
                <Flame size={16} />
                <span>
                  {damageRollResult
                    ? 'Schaden erneut würfeln'
                    : `Schaden würfeln (${weapon.damage || '1W6'}${
                        selectedManeuver.extraDamageFormula ? ` + ${selectedManeuver.extraDamageFormula}` : ''
                      }${extraSpellDmg > 0 ? ` + ${extraSpellDmg} Zauber` : ''}${
                        !streiftreffer && egDamageSpent > 0 ? ` + ${egDamageSpent * wuchtJeEg} EG` : ''
                      })`}
                </span>
              </Knopf>

              {/* Damage Roll Result Details */}
              {damageRollResult && (
                <div className="bg-seite p-3 rounded-karte border border-schaden space-y-2">
                  <div className="flex justify-between items-center flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-leise tabular-nums">Waffenschaden:</span>
                      <span className="text-sm tabular-nums font-bold text-schrift">
                        [{damageRollResult.baseDice.join(', ')}]
                        {damageRollResult.baseBonus !== 0 && (damageRollResult.baseBonus > 0 ? ` + ${damageRollResult.baseBonus}` : ` - ${Math.abs(damageRollResult.baseBonus)}`)}
                      </span>
                      {damageRollResult.maneuverDice.length > 0 && (
                        <span className="text-xs text-gold-hell tabular-nums">
                          + Manöver [{damageRollResult.maneuverDice.join(', ')}]
                        </span>
                      )}
                      {extraSpellDmg > 0 && (
                        <span className="text-xs text-gold-hell tabular-nums">
                          + {extraSpellDmg} Zauber
                        </span>
                      )}
                      {egDamageSpent > 0 && (
                        <span className="text-xs text-unverletzt tabular-nums">
                          + {egDamageSpent * wuchtJeEg} EG
                        </span>
                      )}
                    </div>

                    <div className="text-right">
                      <span className="text-xs text-leise mr-1.5">Netto am Ziel:</span>
                      <span className="text-lg font-extrabold text-schaden tabular-nums">
                        {damageRollResult.netDamage} {damageRollResult.damageType}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-rahmen text-xs tabular-nums text-leise flex justify-between items-center flex-wrap gap-2">
                    <span>
                      Brutto: <strong className="text-schrift">{damageRollResult.grossDamage}</strong>
                      {targetArmor > 0 && (
                        <span>
                          {' '}· Rüstung: -{damageRollResult.effectiveArmor} RS
                          {damageRollResult.effectiveArmor < targetArmor && (
                            <span className="text-unverletzt"> ({targetArmor - damageRollResult.effectiveArmor} ignoriert)</span>
                          )}
                        </span>
                      )}
                    </span>

                    {damageRollResult.appliedConditions.length > 0 && (
                      <span className="text-gold font-bold">
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
              className="w-full bg-seite border border-rahmen rounded-knopf text-xs text-schrift px-3 py-2 focus:outline-hidden focus:border-gold"
            />
          </div>
        </div>

        {/* ── FOOTER ACTIONS ── */}
        <div className="bg-seite p-3.5 sm:p-4 border-t border-rahmen flex items-center justify-between gap-2 shrink-0">
          <Knopf
            onClick={onClose}
            className="text-xs"
          >
            Abbrechen
          </Knopf>

          <div className="flex items-center gap-2">
            {hasRolled && (
              egCalculation?.isSuccess && attackCausesDamage && !damageRollResult ? (
                <div className="flex items-center gap-2">
                  <Knopf art="primaer"
                    onClick={handleCompleteAttack}
                    className="text-xs underline decoration-dotted"
                    title="Angriff abschließen ohne Schaden auszuwürfeln"
                  >
                    Ohne Schaden vollenden
                  </Knopf>
                  <Knopf art="primaer"
                    onClick={handleRollDamage}
                    className="text-xs sm:text-sm gap-1.5 active:scale-95"
                  >
                    <Flame size={16} className="text-schaden" />
                    <span>
                      Schaden würfeln ({weapon.damage || '1W6'}
                      {selectedManeuver.extraDamageFormula ? ` + ${selectedManeuver.extraDamageFormula}` : ''}
                      {!streiftreffer && egDamageSpent > 0 ? ` + ${egDamageSpent * wuchtJeEg} EG` : ''})
                    </span>
                  </Knopf>
                </div>
              ) : (
                <Knopf art="primaer"
                  onClick={handleCompleteAttack}
                  className="text-xs sm:text-sm gap-1.5"
                >
                  <Check size={16} />
                  <span>
                    Angriff vollenden
                    {damageRollResult ? ` (· ${damageRollResult.netDamage} Schaden)` : ''}
                  </span>
                </Knopf>
              )
            )}
          </div>
        </div>
      </Dialogfenster>
    </Dialoghintergrund>
  );
};

export default AttackModal;
