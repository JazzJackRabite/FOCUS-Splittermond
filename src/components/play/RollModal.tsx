import React, { useState, useEffect, useRef, useMemo, useContext } from 'react';
import { X, Sparkles, RotateCw, Zap, Check } from 'lucide-react';
import DiceIcon from '../ui/DiceIcon';
import type { RollEntry } from './DiceLog';
import { generateId } from '../../utils/id';
import type { StatusCondition, ChanneledSpell } from '../../types';
import {
  getActiveRollModifiers,
  isSkillAffectedByBehinderung,
  type ActiveRollModifier,
} from '../../utils/conditionModifiers';
import { begrenzeZauberbonus, getActiveSpellRollBonuses, zauberHoechstbonus } from '../../utils/magicRules';
import { CharacterContext } from '../../context/CharacterContext';
import { SituativeBoni, useSituativeBoni } from './SituativeBoni';

// ---------------------------------------------------------------
// Dice roll logic (RAW)
// ---------------------------------------------------------------

type RollType = 'standard' | 'safe' | 'risk';

import { wuerfeln, type WurfErgebnis as RollResult } from '../../utils/wuerfeln';

/** Stabile leere Liste: ein `= []` als Vorgabe erzeugt bei jedem Rendern ein neues Array und löst über den Effekt unten eine Endlosschleife aus. */
const KEINE_ZAUBER: ChanneledSpell[] = [];

export { wuerfeln };

// ---------------------------------------------------------------
// Erfolgsgrade (EG) – success-degree helpers
// ---------------------------------------------------------------

interface EGResult {
  eg: number;
  differenz: number;
  qualitaet: string;
  qualitaetEmoji: string;
  hasFumbleModifier: boolean;
  hasCritModifier: boolean;
}

function calcEG(
  total: number,
  schwierigkeit: number,
  isFumble: boolean,
  isCrit: boolean,
): EGResult {
  const differenz = total - schwierigkeit;
  // Use truncation (not floor) so that –1/–2 diff → 0 EG (knapp misslungen)
  let eg = Math.trunc(differenz / 3);

  // Triumph only grants bonus EG when the roll also succeeds (total >= schwierigkeit)
  const hasCritModifier = isCrit && total >= schwierigkeit;

  if (isFumble) {
    eg = Math.min(eg - 3, -1);
  } else if (hasCritModifier) {
    eg += 3;
  }

  let qualitaet: string;
  let qualitaetEmoji: string;

  if (eg >= 5) {
    qualitaet = 'Herausragend gelungen';
    qualitaetEmoji = '🌟';
  } else if (eg >= 1) {
    qualitaet = 'Gelungen';
    qualitaetEmoji = '✅';
  } else if (eg === 0) {
    // Distinguish "knapp gelungen" (diff 0–2) vs "knapp misslungen" (diff –1 to –2)
    if (differenz >= 0) {
      qualitaet = 'Knapp gelungen';
      qualitaetEmoji = '⚪';
    } else {
      qualitaet = 'Knapp misslungen';
      qualitaetEmoji = '🟡';
    }
  } else if (eg >= -4) {
    qualitaet = 'Misslungen';
    qualitaetEmoji = '❌';
  } else {
    qualitaet = 'Verheerend misslungen';
    qualitaetEmoji = '💥';
  }

  return { eg, differenz, qualitaet, qualitaetEmoji, hasFumbleModifier: isFumble, hasCritModifier };
}

export interface RollModalProps {
  skillName: string;
  baseValue: number;
  woundPenalty?: number;
  healthLevelName?: string;
  conditions?: StatusCondition[];
  channeledSpells?: ChanneledSpell[];
  activeModifiers?: ActiveRollModifier[];
  /** Behinderung (Armor / Shield / Overweight Handicap) */
  behinderung?: number;
  /** Current available splinter points */
  splitterPoints?: number;
  /** Callback when 1 SP is spent during or for this roll */
  onSpendSplitterPoint?: (reason: string) => void;
  onClose: () => void;
  /** Optional callback after a successful roll (e.g. deduct focus costs) */
  onSuccess?: () => void;
  /** If provided, shows a "Erfolg!" button after rolling */
  successLabel?: string;
  /** Pre-fills the Schwierigkeit (difficulty) field */
  initialSchwierigkeit?: number;
  /** Großmeister (ab 15 Fertigkeitspunkten): zusätzlicher W10 bei jeder Probe */
  grossmeister?: boolean;
  /** Called when the roll fails against the Schwierigkeit (total < schwierigkeit) */
  onFailure?: () => void;
  /** Custom outcome labels shown automatically after rolling when Schwierigkeit is set */
  probeOutcomeLabels?: { success: string; failure: string };
  /** Optional callback to log roll to history */
  onRecordRoll?: (entry: RollEntry) => void;
}

// ---------------------------------------------------------------
// Animated D10 die face – uses DiceIcon shape with overlaid number
// ---------------------------------------------------------------
const DICE_VIEWBOX_WIDTH = 130.97302;
const DICE_VIEWBOX_HEIGHT = 115.3993;

const D10Face: React.FC<{ value: number; dimmed?: boolean }> = ({ value, dimmed = false }) => {
  const iconSize = 54;
  const iconHeight = Math.round(iconSize * (DICE_VIEWBOX_HEIGHT / DICE_VIEWBOX_WIDTH));
  return (
    <div
      className={`relative inline-flex items-center justify-center drop-shadow-md${dimmed ? ' opacity-40' : ''}`}
      style={{ width: iconSize, height: iconHeight }}
    >
      <DiceIcon size={iconSize} fill="#faf4e6" stroke="#C5A059" />
      <span
        className="absolute inset-0 flex items-center justify-center font-bold"
        style={{ fontFamily: 'Cinzel, serif', fontSize: 18, color: '#1B365D' }}
      >
        {value}
      </span>
    </div>
  );
};

export const RollModal: React.FC<RollModalProps> = ({
  skillName,
  baseValue,
  woundPenalty = 0,
  healthLevelName = 'Unverletzt',
  conditions = [],
  channeledSpells = KEINE_ZAUBER,
  activeModifiers,
  behinderung = 0,
  splitterPoints = 0,
  onSpendSplitterPoint,
  onClose,
  onSuccess,
  successLabel,
  initialSchwierigkeit,
  onFailure,
  grossmeister = false,
  probeOutcomeLabels,
  onRecordRoll,
}) => {
  const [rollType, setRollType] = useState<RollType>('standard');

  const initialModifiers = useMemo(() => {
    if (activeModifiers) return activeModifiers;
    const isAffected = isSkillAffectedByBehinderung(skillName);
    return getActiveRollModifiers(
      conditions,
      woundPenalty,
      healthLevelName,
      behinderung,
      isAffected
    );
  }, [activeModifiers, conditions, woundPenalty, healthLevelName, behinderung, skillName]);

  const [modifiersList, setModifiersList] = useState<ActiveRollModifier[]>(initialModifiers);
  const situativ = useSituativeBoni('probe', skillName);

  // Splittermond GRW: Aktive kanalisierte Zauber-Boni (automatisch aktiv)
  const spellBonuses = useMemo(() => {
    return getActiveSpellRollBonuses(channeledSpells, skillName, false);
  }, [channeledSpells, skillName]);

  const [activeSpellBonusIds, setActiveSpellBonusIds] = useState<Set<string>>(() => {
    return new Set(spellBonuses.filter((b) => b.active).map((b) => b.id));
  });

  useEffect(() => {
    setActiveSpellBonusIds(new Set(spellBonuses.filter((b) => b.active).map((b) => b.id)));
  }, [spellBonuses]);

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
  const spellBonusRoh = useMemo(() => {
    return spellBonuses
      .filter((b) => activeSpellBonusIds.has(b.id))
      .reduce((sum, b) => sum + b.bonus, 0);
  }, [spellBonuses, activeSpellBonusIds]);
  const spellBonusTotal = begrenzeZauberbonus(spellBonusRoh, hoechstbonusZauber);

  const [extraModifier, setExtraModifier] = useState(0);
  const [extraModifierStr, setExtraModifierStr] = useState('0');
  const [schwierigkeit, setSchwierigkeit] = useState<number | null>(initialSchwierigkeit ?? null);
  const [schwierigkeitStr, setSchwierigkeitStr] = useState(
    initialSchwierigkeit !== undefined ? String(initialSchwierigkeit) : '',
  );
  const [result, setResult] = useState<RollResult | null>(null);
  const [isRolling, setIsRolling] = useState(false);
  const [splinterBonusSpent, setSplinterBonusSpent] = useState(false);
  const [splinterRerollCount, setSplinterRerollCount] = useState(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) clearTimeout(timeoutRef.current);
    };
  }, []);

  const conditionMalusTotal = modifiersList
    .filter((m) => m.active)
    .reduce((sum, m) => sum + m.malus, 0);

  const splinterModifier = splinterBonusSpent ? 3 : 0;
  const effectiveModifier = conditionMalusTotal + situativ.summe + extraModifier + splinterModifier + spellBonusTotal;
  const diceCount = (rollType === 'risk' ? 4 : 2) + (grossmeister ? 1 : 0);

  const toggleModifier = (id: string) => {
    setModifiersList((prev) =>
      prev.map((m) => (m.id === id ? { ...m, active: !m.active } : m))
    );
  };

  const executeRoll = (isReroll = false, bonusApplied = splinterBonusSpent) => {
    const r: RollResult = wuerfeln(rollType, grossmeister);

    // Clear any previous timeout
    if (timeoutRef.current !== null) { clearTimeout(timeoutRef.current); timeoutRef.current = null; }

    // Start animation
    setIsRolling(true);
    setResult(null);

    timeoutRef.current = setTimeout(() => {
      timeoutRef.current = null;
      setIsRolling(false);
      setResult(r);

      const currentEffMod = conditionMalusTotal + situativ.summe + extraModifier + (bonusApplied ? 3 : 0) + spellBonusTotal;
      const computedTotal = baseValue + r.result + currentEffMod;
      const computedEg =
        schwierigkeit !== null
          ? calcEG(computedTotal, schwierigkeit, r.isFumble, r.isCrit).eg
          : undefined;

      const activeConditionLabels = modifiersList
        .filter((m) => m.active)
        .map((m) => `${m.label} (${m.malus >= 0 ? `+${m.malus}` : m.malus})`);
      activeConditionLabels.push(...situativ.labels);

      const activeSpellBonusLabels = spellBonuses
        .filter((b) => activeSpellBonusIds.has(b.id))
        .map((b) => `${b.source} (+${b.bonus})`);
      activeConditionLabels.push(...activeSpellBonusLabels);

      if (bonusApplied) {
        activeConditionLabels.push('Splitterpunkt +3');
      }
      if (isReroll) {
        activeConditionLabels.push('Splitterpunkt Neuwurf');
      }

      const rollLabel = `${skillName} (${rollType === 'standard' ? 'Standard' : rollType === 'safe' ? 'Sicherheit' : 'Risiko'})${
        activeConditionLabels.length > 0 ? ` [${activeConditionLabels.join(', ')}]` : ''
      }`;

      if (onRecordRoll) {
        onRecordRoll({
          id: generateId(),
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          label: rollLabel,
          d10s: r.dice,
          baseVal: baseValue,
          modifier: currentEffMod,
          total: computedTotal,
          target: schwierigkeit ?? undefined,
          eg: computedEg,
          isTriumph: r.isCrit,
          isPatzer: r.isFumble,
        });
      }
    }, 560);
  };

  const handleRoll = () => {
    setSplinterBonusSpent(false);
    setSplinterRerollCount(0);
    executeRoll(false, false);
  };

  const handleSplinterBonus = () => {
    if (splitterPoints < 1 || splinterBonusSpent) return;
    if (onSpendSplitterPoint) {
      onSpendSplitterPoint(`+3 auf Probe (${skillName})`);
    }
    setSplinterBonusSpent(true);

    if (result && onRecordRoll) {
      const newEffMod = conditionMalusTotal + situativ.summe + extraModifier + 3 + spellBonusTotal;
      const newComputedTotal = baseValue + result.result + newEffMod;
      const newComputedEg =
        schwierigkeit !== null
          ? calcEG(newComputedTotal, schwierigkeit, result.isFumble, result.isCrit).eg
          : undefined;

      const activeConditionLabels = modifiersList
        .filter((m) => m.active)
        .map((m) => `${m.label} (${m.malus >= 0 ? `+${m.malus}` : m.malus})`);
      activeConditionLabels.push(...situativ.labels);

      const activeSpellBonusLabels = spellBonuses
        .filter((b) => activeSpellBonusIds.has(b.id))
        .map((b) => `${b.source} (+${b.bonus})`);
      activeConditionLabels.push(...activeSpellBonusLabels);
      activeConditionLabels.push('Splitterpunkt +3');

      onRecordRoll({
        id: generateId(),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        label: `${skillName} (${rollType === 'standard' ? 'Standard' : rollType === 'safe' ? 'Sicherheit' : 'Risiko'}) [${activeConditionLabels.join(', ')}]`,
        d10s: result.dice,
        baseVal: baseValue,
        modifier: newEffMod,
        total: newComputedTotal,
        target: schwierigkeit ?? undefined,
        eg: newComputedEg,
        isTriumph: result.isCrit,
        isPatzer: result.isFumble,
      });
    }
  };

  const handleSplinterReroll = () => {
    if (splitterPoints < 1) return;
    if (onSpendSplitterPoint) {
      onSpendSplitterPoint(`Neuwurf (${skillName})`);
    }
    setSplinterRerollCount((c) => c + 1);
    executeRoll(true, splinterBonusSpent);
  };

  const total = result ? baseValue + result.result + effectiveModifier : null;
  const egResult =
    total !== null && result && schwierigkeit !== null
      ? calcEG(total, schwierigkeit, result.isFumble, result.isCrit)
      : null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-3 sm:p-4 no-print">
      <div
        id="roll-modal-dialog"
        className="bg-[#faf4e6] dark-theme-panel rounded-xl shadow-2xl border-2 border-[#C5A059] max-w-md w-full my-auto max-h-[90vh] flex flex-col overflow-hidden"
      >
        <div className="px-5 py-4 border-b border-[#C5A059]/40 flex justify-between items-start shrink-0">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-[#1B365D] fantasy-font mb-0.5">{skillName}</h2>
            <p className="text-xs text-gray-600">Fertigkeitsprobe</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-red-500 transition-colors p-1 rounded-lg hover:bg-black/5 cursor-pointer"
            title="Schließen"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-4 sm:p-5 overflow-y-auto flex-1 custom-scrollbar modal-body-scroll space-y-3">
          {/* Basiswert Info */}
          <div className="bg-[#e3d4b9] rounded-lg p-3 text-sm space-y-1">
          <div className="flex justify-between items-center">
            <span className="text-gray-700 font-medium">Basiswert:</span>
            <span className="font-bold text-lg text-[#1B365D]">{baseValue}</span>
          </div>
          {effectiveModifier !== 0 && (
            <div className="flex justify-between items-center pt-1 border-t border-[#d1c4b0]">
              <span className="text-gray-700 font-medium">Gesamt-Modifikator:</span>
              <span className={`font-bold ${effectiveModifier < 0 ? 'text-red-600' : 'text-green-700'}`}>
                {effectiveModifier >= 0 ? `+${effectiveModifier}` : effectiveModifier}
              </span>
            </div>
          )}
        </div>

        {/* Aktive Zauber-Wirkungen (GRW: Bärenstärke, Katzenreflexe, Sinne verstärken, etc.) */}
        {spellBonuses.length > 0 && (
          <div className="bg-[#e4ede6] rounded-xl p-3 mb-3 border border-[#b8d9bf]">
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-900 fantasy-font flex items-center gap-1.5">
                <Sparkles size={14} className="text-emerald-700" /> Aktive Zauber-Wirkungen
              </span>
              <span className="text-xs font-bold font-mono px-2 py-0.5 rounded-md border bg-emerald-800 text-white border-emerald-900">
                Bonus: +{spellBonusTotal}
                {spellBonusRoh > spellBonusTotal && ` (von +${spellBonusRoh})`}
              </span>
            </div>
            <p className="text-xs text-emerald-950/80 mb-2 leading-relaxed">
              Aus aktiven Zaubern. Anklicken zum Ab- oder Zuwählen; durchgestrichene gelten nur in bestimmten Lagen.
              {spellBonusRoh > spellBonusTotal && ` Zauberboni sind auf den Höchstbonus +${hoechstbonusZauber} begrenzt (GRW S. 18).`}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {spellBonuses.map((b) => {
                const isActive = activeSpellBonusIds.has(b.id);
                return (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => toggleSpellBonus(b.id)}
                    title={`${b.description} (Klicken zum ${isActive ? 'Abwählen' : 'Aktivieren'})`}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all border shadow-2xs cursor-pointer ${
                      isActive
                        ? 'bg-emerald-800 text-white border-emerald-900 shadow-xs hover:bg-emerald-700 active:scale-98'
                        : 'bg-white/90 text-stone-600 border-[#d1c4b0] line-through hover:opacity-100'
                    }`}
                  >
                    {isActive ? (
                      <Check size={12} strokeWidth={3} className="shrink-0 text-emerald-300" />
                    ) : (
                      <X size={12} strokeWidth={3} className="shrink-0 text-stone-500" />
                    )}
                    <span>{b.source}</span>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[11px] font-mono font-bold ${
                        isActive ? 'bg-black/25 text-white' : 'bg-[#d1c4b0]/50 text-stone-600'
                      }`}
                    >
                      +{b.bonus}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Zustands- & Wundabzüge (D&D Beyond Style: automatisch eingerechnet und einzeln abwählbar) */}
        <SituativeBoni boni={situativ.boni} gewaehlt={situativ.gewaehlt} onToggle={situativ.umschalten} />

        {modifiersList.length > 0 && (
          <div className="bg-[#e3d4b9] rounded-xl p-3 mb-3 border border-[#d1c4b0]">
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-xs font-bold uppercase tracking-wider text-[#1B365D] fantasy-font flex items-center gap-1.5">
                <Zap size={14} className="text-[#C5A059]" /> Aktive Zustände & Wunden
              </span>
              <span
                className={`text-xs font-bold font-mono px-2 py-0.5 rounded-md border ${
                  modifiersList.some((m) => (m.source === 'wound' || m.id === 'wound_penalty') && m.active) || conditionMalusTotal < 0
                    ? 'bg-red-700 text-white border-red-800'
                    : 'bg-[#1B365D] text-white border-[#10233f]'
                }`}
              >
                Abzug: {conditionMalusTotal >= 0 ? `+${conditionMalusTotal}` : conditionMalusTotal}
              </span>
            </div>
            <p className="text-xs text-stone-600 mb-2 leading-relaxed">
              Automatisch vorausgewählt. Klicke auf einen Zustand, um ihn für diese Probe abzuwählen:
            </p>
            <div className="flex flex-wrap gap-1.5">
              {modifiersList.map((m) => {
                const isWound = m.source === 'wound' || m.id === 'wound_penalty';
                const isBehinderung = m.source === 'behinderung' || m.id === 'behinderung';
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => toggleModifier(m.id)}
                    title={`${m.description || m.label} (Klicken zum ${m.active ? 'Abwählen' : 'Aktivieren'})`}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all border shadow-2xs cursor-pointer ${
                      m.active
                        ? isWound
                          ? 'bg-red-700 text-white border-red-800 shadow-xs hover:bg-red-800 active:scale-98'
                          : isBehinderung
                            ? 'bg-[#8B263E] text-white border-[#A8324E] shadow-xs hover:bg-[#782035] active:scale-98'
                            : 'bg-[#1B365D] text-white border-[#10233f] shadow-xs hover:bg-[#254a80] active:scale-98'
                        : 'bg-white/90 text-stone-600 border-[#d1c4b0] line-through hover:opacity-100'
                    }`}
                  >
                    {m.active ? (
                      <Check
                        size={12}
                        strokeWidth={3}
                        className={`shrink-0 ${isWound || isBehinderung ? 'text-[#f3e5cf]' : 'text-[#C5A059]'}`}
                      />
                    ) : (
                      <X size={12} strokeWidth={3} className="shrink-0 text-stone-500" />
                    )}
                    <span>{m.label}</span>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[11px] font-mono font-bold ${
                        m.active
                          ? isWound || isBehinderung
                            ? 'bg-black/25 text-white'
                            : 'bg-white/20 text-white'
                          : 'bg-[#d1c4b0]/50 text-stone-600'
                      }`}
                    >
                      {m.malus > 0 ? `+${m.malus}` : m.malus}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Situativer Zusatz-Modifier + Schwierigkeit */}
        <div className="flex gap-3 mb-4">
          <div className="flex-1">
            <label className="block text-xs uppercase text-gray-500 font-bold mb-1">
              Situativer Zusatz-Mod.
            </label>
            <input
              type="number"
              value={extraModifierStr}
              onFocus={(e) => e.target.select()}
              onChange={(e) => {
                setExtraModifierStr(e.target.value);
                const n = parseInt(e.target.value, 10);
                setExtraModifier(isNaN(n) ? 0 : n);
              }}
              className="w-full bg-white border-2 border-[#d1c4b0] rounded px-3 py-1.5 text-[#1B365D] font-bold focus:outline-none focus:border-[#1B365D]"
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs uppercase text-gray-500 font-bold mb-1">
              Schwierigkeit (optional)
            </label>
            <input
              type="number"
              value={schwierigkeitStr}
              placeholder="—"
              onFocus={(e) => e.target.select()}
              onChange={(e) => {
                setSchwierigkeitStr(e.target.value);
                const n = parseInt(e.target.value, 10);
                setSchwierigkeit(isNaN(n) ? null : n);
              }}
              className="w-full bg-white border-2 border-[#d1c4b0] rounded px-3 py-1.5 text-[#1B365D] font-bold focus:outline-none focus:border-[#1B365D]"
            />
          </div>
        </div>

        {/* Roll type selection */}
        <div className="mb-4">
          <label className="block text-xs uppercase text-gray-500 font-bold mb-2">Wurfart</label>
          <div className="flex gap-2">
            {([
              { key: 'standard', label: 'Standard' },
              { key: 'safe', label: 'Sicherheit' },
              { key: 'risk', label: 'Risiko' },
            ] as { key: RollType; label: string }[]).map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => setRollType(key)}
                className={`flex-1 py-2 text-sm font-bold rounded-lg border transition-all ${
                  rollType === key
                    ? 'bg-[#1B365D] text-[#f3e5cf] border-[#10233f] shadow-xs'
                    : 'bg-white text-[#1B365D] border-[#d1c4b0] hover:bg-[#f3e5cf]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <p className="text-xs text-stone-500 mt-1">
            {rollType === 'standard' && '2W10 addieren. ≤3 = Patzer, ≥19 = Triumph.'}
            {rollType === 'safe' && '2W10, nur höchster zählt. Kein Patzer/Triumph.'}
            {rollType === 'risk' && '4W10, niedrigste 2 prüfen (Patzer?), sonst höchste 2 addieren.'}
            {grossmeister && ' Großmeister: +1 W10 (zählt nicht für Patzer, sonst gelten die besten Würfel).'}
          </p>
        </div>

        {/* Roll button */}
        <button
          type="button"
          onClick={handleRoll}
          disabled={isRolling}
          className="w-full bg-[#1B365D] hover:bg-[#2a4f7e] disabled:opacity-60 text-white font-bold py-3 rounded-lg text-lg transition-all mb-4 shadow border border-[#10233f] flex items-center justify-center gap-2 fantasy-font tracking-wide"
        >
          <DiceIcon size={20} fill="white" stroke="#C5A059" /> Würfeln!
        </button>

        {/* Dice rolling animation */}
        {isRolling && (
          <div className="flex justify-center gap-4 mb-4">
            {Array.from({ length: diceCount }).map((_, i) => (
              <div key={i} className="dice-roll">
                <DiceIcon size={48} fill="#1B365D" stroke="#C5A059" />
              </div>
            ))}
          </div>
        )}

        {/* Result */}
        {!isRolling && result && total !== null && (
          <div className="bg-white rounded-xl border-2 border-[#C5A059] p-4 text-center space-y-2">
            {result.isFumble && (
              <div className="roll-patzer-banner font-bold py-2.5 px-4 rounded-lg text-lg shadow-md fantasy-font tracking-wide flex items-center justify-center gap-2">
                <span>💀</span>
                <span className="tracking-widest font-black">PATZER!</span>
              </div>
            )}
            {result.isCrit && !result.isFumble && (
              <div className="roll-triumph-banner font-bold py-2.5 px-4 rounded-lg text-lg shadow-md fantasy-font tracking-wide flex items-center justify-center gap-2">
                <span>⭐</span>
                <span className="tracking-widest font-black">TRIUMPH!</span>
              </div>
            )}
            <div className="flex justify-center gap-3 mb-2">
              {result.dice.map((v, i) => (
                <D10Face
                  key={i}
                  value={v}
                  dimmed={rollType === 'risk' && i < 2}
                />
              ))}
            </div>
            <div className="text-sm font-medium text-stone-600 dark:text-stone-300">
              <span className="font-semibold text-stone-700 dark:text-stone-200">{baseValue}</span> (Basis) +{' '}
              <span className="font-semibold text-stone-700 dark:text-stone-200">{result.result}</span> (Wurf){' '}
              {effectiveModifier !== 0 ? (
                <span className={effectiveModifier < 0 ? 'text-[#ff6b81] dark:text-[#ff8ba7] font-bold font-mono' : 'text-emerald-600 dark:text-emerald-400 font-bold font-mono'}>
                  {effectiveModifier >= 0 ? `+ ${effectiveModifier}` : `− ${Math.abs(effectiveModifier)}`} (Mod.)
                </span>
              ) : ''}
            </div>
            <div className="text-5xl font-black font-mono text-[#1B365D] dark:text-[#F2EFE6] tracking-tight py-1">{total}</div>

            {/* Splitterpunkt einsetzen (GRW Splittermond) */}
            <div className="mt-3 pt-3 border-t border-[#e3d4b9] bg-[#faf6ee] -mx-4 -mb-2 p-3 rounded-b-xl border-b border-[#d1c4b0]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[#1B365D] fantasy-font flex items-center gap-1">
                  <Sparkles size={14} className="text-[#C5A059]" /> Splitterpunkte
                </span>
                <span className="text-xs font-bold font-mono text-[#1B365D] bg-[#f3e5cf] border border-[#C5A059]/40 px-2 py-0.5 rounded-md">
                  Vorrat: {splitterPoints} SP
                </span>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                {/* Option 1: +3 Bonus auf diese Probe */}
                <button
                  type="button"
                  onClick={handleSplinterBonus}
                  disabled={splitterPoints < 1 || splinterBonusSpent}
                  title={
                    splinterBonusSpent
                      ? 'Splitterpunkt-Bonus (+3) bereits für diese Probe angewendet'
                      : splitterPoints < 1
                      ? 'Keine Splitterpunkte mehr verfügbar'
                      : '1 SP einsetzen für +3 auf dieses Würfelergebnis'
                  }
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold transition-all border ${
                    splinterBonusSpent
                      ? 'bg-[#f3e5cf] text-[#1B365D] border-[#C5A059] opacity-90 cursor-default'
                      : splitterPoints >= 1
                      ? 'bg-[#C5A059] hover:bg-[#b58f48] text-[#1B365D] border-[#a07c34] shadow-xs active:scale-98'
                      : 'bg-stone-100 text-stone-400 border-stone-200 cursor-not-allowed dark-theme-slot-inactive'
                  }`}
                >
                  <Sparkles size={14} />
                  <span>{splinterBonusSpent ? '✓ +3 SP aktiv' : 'Splitterpunkt: +3 (1 SP)'}</span>
                </button>

                {/* Option 2: Wurf wiederholen */}
                <button
                  type="button"
                  onClick={handleSplinterReroll}
                  disabled={splitterPoints < 1}
                  title={
                    splitterPoints < 1
                      ? 'Keine Splitterpunkte mehr verfügbar'
                      : '1 SP einsetzen um den Wurf komplett neu zu würfeln'
                  }
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold transition-all border ${
                    splitterPoints >= 1
                      ? 'bg-[#1B365D] hover:bg-[#2a4f7e] text-white border-[#10233f] shadow-xs active:scale-98'
                      : 'bg-stone-100 text-stone-400 border-stone-200 cursor-not-allowed dark-theme-slot-inactive'
                  }`}
                >
                  <RotateCw size={14} />
                  <span>Neuwurf (1 SP){splinterRerollCount > 0 ? ` (${splinterRerollCount}×)` : ''}</span>
                </button>
              </div>
            </div>

            {/* EG block – only when Schwierigkeit was provided */}
            {egResult && (
              <div className="mt-3 pt-3 border-t border-[#e3d4b9] space-y-1">
                <div className="text-3xl font-bold text-[#1B365D]">
                  EG: {egResult.eg >= 0 ? '+' : ''}{egResult.eg}
                </div>
                <div className="inline-block rounded-lg px-3 py-1 text-sm font-bold bg-[#f3e5cf] text-[#1B365D] border border-[#C5A059]/50 shadow-2xs">
                  {egResult.qualitaetEmoji} {egResult.qualitaet}
                </div>
                {egResult.hasFumbleModifier && (
                  <div className="text-xs text-red-600 font-medium">
                    Patzer: −3 EG, max. −1 EG
                  </div>
                )}
                {egResult.hasCritModifier && (
                  <div className="text-xs text-[#C5A059] font-medium">
                    Triumph: +3 EG
                  </div>
                )}
                <div className="text-xs text-stone-500 font-medium">
                  Differenz: {egResult.differenz >= 0 ? '+' : ''}{egResult.differenz} (Schwierigkeit {schwierigkeit})
                </div>
              </div>
            )}

            {/* Probe outcome – shown automatically when Schwierigkeit + outcome labels are set */}
            {probeOutcomeLabels && schwierigkeit !== null ? (
              total >= schwierigkeit ? (
                <div className="mt-2 space-y-2">
                  <div className="bg-[#f3e5cf] border-2 border-emerald-700/60 rounded-lg px-4 py-2 text-emerald-900 font-bold text-sm shadow-xs">
                    ✅ {probeOutcomeLabels.success}
                  </div>
                  {onSuccess && successLabel && (
                    <button
                      type="button"
                      onClick={() => { onSuccess(); onClose(); }}
                      className="w-full bg-[#1B365D] hover:bg-[#2a4f7e] text-white font-bold py-2 px-4 rounded-lg border border-[#10233f] shadow-xs transition-all"
                    >
                      {successLabel}
                    </button>
                  )}
                </div>
              ) : (
                <div className="mt-2 space-y-2">
                  <div className="bg-[#f3e5cf] border-2 border-red-600 rounded-lg px-4 py-2 text-red-800 font-bold text-sm shadow-xs">
                    ❌ {probeOutcomeLabels.failure}
                  </div>
                  {onFailure && (
                    <button
                      type="button"
                      onClick={() => { onFailure(); onClose(); }}
                      className="w-full bg-red-700 hover:bg-red-800 text-white font-bold py-2 px-4 rounded-lg border border-red-900 shadow-xs transition-all"
                    >
                      Bewusstlos setzen & schließen
                    </button>
                  )}
                </div>
              )
            ) : (
              onSuccess && successLabel && (
                <button
                  type="button"
                  onClick={() => { onSuccess(); onClose(); }}
                  className="mt-2 bg-[#1B365D] hover:bg-[#2a4f7e] text-white font-bold py-2 px-6 rounded-lg border border-[#10233f] shadow-xs transition-all"
                >
                  {successLabel}
                </button>
              )
            )}
          </div>
        )}
        </div>
      </div>
    </div>
  );
};

