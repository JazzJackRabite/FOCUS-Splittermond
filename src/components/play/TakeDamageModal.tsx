import React, { useState, useMemo } from 'react';
import { Flame, Shield, Sparkles, X, Plus, Minus, AlertTriangle, Heart, Check } from 'lucide-react';
import { ALL_CONDITIONS, CONDITIONS_WITH_LEVELS } from '../../data/rules';
import type { HealthSlot } from '../../types';

export interface TakeDamageModalProps {
  onClose: () => void;
  maxLP: number;
  derivedSR: number;
  armorSR: number;
  currentSplitterPoints: number;
  activeTempHP: number;
  currentHealthSlots: HealthSlot[];
  /** Gesundheitsstufen (Standard: die fünf des GRW); Begleiter mit Schwächlich/Zerbrechlich haben weniger */
  stufen?: { name: string; wundabzug: number }[];
  /** Für Begleiter: ohne Splitterpunkte, temporäre LP und Zustände des Helden; Name für die Überschrift */
  begleiter?: string;
  onApplyDamage: (result: {
    kind: 'consumed' | 'exhausted' | 'channeled';
    amount: number;
    spendSplitter: boolean;
    selectedConditions: Array<{ key: string; level?: number }>;
    note?: string;
  }) => void;
}

const COMMON_DAMAGE_CONDITIONS: Array<{ key: string; hasLevel: boolean; maxLevel?: number; label: string }> = [
  { key: 'Blutend', hasLevel: true, maxLevel: 2, label: 'Blutend (Schnitt/Stich)' },
  { key: 'Brennend', hasLevel: true, maxLevel: 3, label: 'Brennend (Feuerschaden)' },
  { key: 'Benommen', hasLevel: true, maxLevel: 2, label: 'Benommen (Wucht/Schock)' },
  { key: 'Liegend', hasLevel: false, label: 'Liegend (zu Boden geworfen)' },
  { key: 'Erschöpft', hasLevel: true, maxLevel: 3, label: 'Erschöpft (Kälte/Ausdauer)' },
  { key: 'Vergiftet', hasLevel: false, label: 'Vergiftet (nur Markierung, kein GRW-Zustand)' },
];

const GRW_STUFEN = [
  { name: 'Unverletzt', wundabzug: 0 }, { name: 'Angeschlagen', wundabzug: -1 }, { name: 'Verletzt', wundabzug: -2 },
  { name: 'Schwer verletzt', wundabzug: -4 }, { name: 'Todgeweiht', wundabzug: -8 },
];

export const TakeDamageModal: React.FC<TakeDamageModalProps> = ({
  stufen = GRW_STUFEN,
  begleiter,
  onClose,
  maxLP,
  derivedSR,
  currentSplitterPoints,
  activeTempHP,
  currentHealthSlots,
  onApplyDamage,
}) => {
  // Raw incoming damage
  const [rawDamage, setRawDamage] = useState<number>(5);

  // Damage type (GRW: Echter Schaden [consumed], Betäubung [exhausted], Kanalisiert [channeled])
  const [damageKind, setDamageKind] = useState<'consumed' | 'exhausted' | 'channeled'>('consumed');

  // Schadensreduktion (SR / Panzerung)
  const [applySR, setApplySR] = useState<boolean>(derivedSR > 0);
  const [effectiveSR, setEffectiveSR] = useState<number>(derivedSR);

  // Splitterpunkt: Schaden um 5 Punkte reduzieren (GRW S. 81)
  const [useSplitter, setUseSplitter] = useState<boolean>(false);

  // Zustände durch Schaden (GRW S. 168–169)
  const [activeConditions, setActiveConditions] = useState<Record<string, { active: boolean; level: number }>>({
    Blutend: { active: false, level: 1 },
    Brennend: { active: false, level: 1 },
    Benommen: { active: false, level: 1 },
    Liegend: { active: false, level: 1 },
    Erschöpft: { active: false, level: 1 },
    Vergiftet: { active: false, level: 1 },
  });

  const [extraCondition, setExtraCondition] = useState<string>('Geblendet');
  const [extraLevel, setExtraLevel] = useState<number>(1);
  const [extraConditionsList, setExtraConditionsList] = useState<Array<{ key: string; level?: number }>>([]);

  // Optional note / source
  const [damageNote, setDamageNote] = useState<string>('');

  // Calculations
  const damageAfterSR = useMemo(() => {
    if (!applySR) return rawDamage;
    return Math.max(0, rawDamage - effectiveSR);
  }, [rawDamage, applySR, effectiveSR]);

  const finalDamage = useMemo(() => {
    let dmg = damageAfterSR;
    if (useSplitter && currentSplitterPoints > 0) {
      // GRW S. 81: Schaden aus einer Quelle um 5 Punkte reduzieren (1× pro Schadensquelle)
      dmg = Math.max(0, dmg - 5);
    }
    return Math.max(0, dmg);
  }, [damageAfterSR, useSplitter, currentSplitterPoints]);

  // Temp HP absorption estimation
  const absorbedByTemp = useMemo(() => {
    return Math.min(activeTempHP, finalDamage);
  }, [activeTempHP, finalDamage]);

  const damageHittingHealth = useMemo(() => {
    return Math.max(0, finalDamage - absorbedByTemp);
  }, [finalDamage, absorbedByTemp]);

  // Wound preview simulation
  const woundPreview = useMemo(() => {
    const HEALTH_LEVEL_NAMES = stufen.map((x) => x.name);
    const WOUND_PENALTIES = stufen.map((x) => x.wundabzug);
    const letzte = stufen.length - 1;

    const currentConsumed = currentHealthSlots.filter((s) => s.type === 'consumed').length;
    const currentFilled = currentHealthSlots.filter((s) => s.type !== 'empty').length;

    let curLevelIndex = 0;
    if (currentConsumed > maxLP) {
      curLevelIndex = Math.min(letzte, Math.floor((currentConsumed - 1) / maxLP));
    }

    // Simulate after damage
    let simConsumed = currentConsumed;
    let simTotalFilled = currentFilled + damageHittingHealth;
    const totalSlots = maxLP * stufen.length;

    if (damageKind === 'consumed') {
      simConsumed += damageHittingHealth;
    } else {
      // If exhausted or channeled, check overflow
      if (simTotalFilled > totalSlots) {
        const overflow = simTotalFilled - totalSlots;
        simConsumed += overflow;
      }
    }

    let nextLevelIndex = 0;
    if (simConsumed > maxLP) {
      nextLevelIndex = Math.min(letzte, Math.floor((simConsumed - 1) / maxLP));
    }

    const curName = HEALTH_LEVEL_NAMES[curLevelIndex] ?? 'Unverletzt';
    const nextName = HEALTH_LEVEL_NAMES[nextLevelIndex] ?? 'Unverletzt';
    const nextPenalty = WOUND_PENALTIES[nextLevelIndex] ?? 0;
    const isWoundIncreased = nextLevelIndex > curLevelIndex;
    const isDying = nextLevelIndex === letzte || simTotalFilled >= totalSlots;

    return {
      curName,
      nextName,
      nextPenalty,
      isWoundIncreased,
      isDying,
      simTotalFilled,
      totalSlots,
    };
  }, [currentHealthSlots, maxLP, damageHittingHealth, damageKind, stufen]);

  // Handlers
  const handleToggleCommonCondition = (key: string) => {
    setActiveConditions((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        active: !prev[key]?.active,
      },
    }));
  };

  const handleLevelChange = (key: string, lvl: number) => {
    setActiveConditions((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        level: Math.max(1, lvl),
      },
    }));
  };

  const handleAddExtraCondition = () => {
    if (!extraCondition) return;
    const hasLvl = CONDITIONS_WITH_LEVELS.includes(extraCondition);
    setExtraConditionsList((prev) => [
      ...prev,
      { key: extraCondition, level: hasLvl ? extraLevel : undefined },
    ]);
  };

  const handleRemoveExtraCondition = (index: number) => {
    setExtraConditionsList((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const selectedConds: Array<{ key: string; level?: number }> = [];

    // Collect common active conditions
    Object.entries(activeConditions).forEach(([key, val]) => {
      if (val.active) {
        const condDef = COMMON_DAMAGE_CONDITIONS.find((c) => c.key === key);
        selectedConds.push({
          key,
          level: condDef?.hasLevel ? val.level : undefined,
        });
      }
    });

    // Add extra conditions
    selectedConds.push(...extraConditionsList);

    onApplyDamage({
      kind: damageKind,
      amount: finalDamage,
      spendSplitter: !begleiter && useSplitter && currentSplitterPoints > 0,
      selectedConditions: begleiter ? [] : selectedConds,
      note: damageNote.trim() || undefined,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center z-50 p-3 sm:p-4 overflow-y-auto">
      <div className="bg-[#141b27] border-2 border-[#C5A059] rounded-xl shadow-2xl max-w-lg w-full max-h-[92vh] flex flex-col text-[#F2EFE6] overflow-hidden my-auto">
        {/* Header */}
        <div className="px-4 sm:px-5 py-3.5 border-b border-[#C5A059]/60 bg-[#0e141f] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-red-950/80 border border-red-500/50 flex items-center justify-center text-red-400">
              <Flame size={18} />
            </div>
            <div>
              <h3 className="fantasy-font text-lg sm:text-xl text-white font-bold leading-tight">
                {begleiter ? `${begleiter}: Schaden erleiden` : 'Schaden erleiden'}
              </h3>
              <p className="text-[11px] text-[#C5A059] leading-tight">
                Grundregelwerk (GRW S. 172–173 &amp; S. 81)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-stone-400 hover:text-white p-1 rounded-md transition-colors cursor-pointer"
            title="Schließen"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 custom-scrollbar">
          {/* 1. Eingehender Schaden (Brutto) */}
          <div className="bg-[#182333] border border-[#2b3a50] rounded-lg p-3 sm:p-3.5 space-y-2.5">
            <label className="block text-xs font-bold text-[#C5A059] uppercase tracking-wider">
              1. Eingehender Schaden (Brutto)
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setRawDamage((d) => Math.max(0, d - 5))}
                className="px-2.5 py-1.5 rounded bg-[#223147] hover:bg-[#2d405b] text-xs font-bold text-stone-300 border border-[#374c69] cursor-pointer"
              >
                -5
              </button>
              <button
                type="button"
                onClick={() => setRawDamage((d) => Math.max(0, d - 1))}
                className="w-8 h-8 rounded bg-[#223147] hover:bg-[#2d405b] flex items-center justify-center font-bold text-stone-200 border border-[#374c69] cursor-pointer"
              >
                <Minus size={14} />
              </button>

              <div className="flex-1 text-center">
                <input
                  type="number"
                  min={0}
                  max={99}
                  value={rawDamage}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => setRawDamage(Math.max(0, parseInt(e.target.value, 10) || 0))}
                  className="w-full text-center bg-[#0e141f] border border-[#C5A059]/60 rounded-lg py-1.5 text-2xl font-mono font-bold text-white focus:outline-none focus:border-[#C5A059]"
                />
              </div>

              <button
                type="button"
                onClick={() => setRawDamage((d) => d + 1)}
                className="w-8 h-8 rounded bg-[#223147] hover:bg-[#2d405b] flex items-center justify-center font-bold text-stone-200 border border-[#374c69] cursor-pointer"
              >
                <Plus size={14} />
              </button>
              <button
                type="button"
                onClick={() => setRawDamage((d) => d + 5)}
                className="px-2.5 py-1.5 rounded bg-[#223147] hover:bg-[#2d405b] text-xs font-bold text-stone-300 border border-[#374c69] cursor-pointer"
              >
                +5
              </button>
              <button
                type="button"
                onClick={() => setRawDamage((d) => d + 10)}
                className="px-2.5 py-1.5 rounded bg-[#223147] hover:bg-[#2d405b] text-xs font-bold text-stone-300 border border-[#374c69] cursor-pointer"
              >
                +10
              </button>
            </div>
          </div>

          {/* 2. Schadenstyp (GRW S. 172–173) */}
          <div className="bg-[#182333] border border-[#2b3a50] rounded-lg p-3 sm:p-3.5 space-y-2">
            <label className="block text-xs font-bold text-[#C5A059] uppercase tracking-wider">
              2. Schadenstyp (GRW S. 172–173)
            </label>
            <div className="grid grid-cols-3 gap-2">
              {/* Echter Schaden */}
              <button
                type="button"
                onClick={() => setDamageKind('consumed')}
                className={`p-2 rounded-lg border text-left transition-all cursor-pointer ${
                  damageKind === 'consumed'
                    ? 'bg-[#3b1919] border-red-500 shadow-md text-white'
                    : 'bg-[#141b27] border-[#2c3a4f] text-stone-300 hover:bg-[#1a2436]'
                }`}
              >
                <div className="flex items-center justify-between mb-0.5">
                  <span className="font-bold text-xs">Echter Schaden</span>
                  <span className="text-red-400 font-bold font-mono text-xs">■</span>
                </div>
                <div className="text-[10px] text-stone-400 leading-tight">Wunden, Stürze, Waffen</div>
              </button>

              {/* Betäubungsschaden */}
              <button
                type="button"
                onClick={() => setDamageKind('exhausted')}
                className={`p-2 rounded-lg border text-left transition-all cursor-pointer ${
                  damageKind === 'exhausted'
                    ? 'bg-[#3d2c14] border-amber-500 shadow-md text-white'
                    : 'bg-[#141b27] border-[#2c3a4f] text-stone-300 hover:bg-[#1a2436]'
                }`}
              >
                <div className="flex items-center justify-between mb-0.5">
                  <span className="font-bold text-xs">Betäubung</span>
                  <span className="text-amber-400 font-bold font-mono text-xs">/</span>
                </div>
                <div className="text-[10px] text-stone-400 leading-tight">Stumpfe Hiebe, Schock</div>
              </button>

              {/* Kanalisierter Schaden */}
              <button
                type="button"
                onClick={() => setDamageKind('channeled')}
                className={`p-2 rounded-lg border text-left transition-all cursor-pointer ${
                  damageKind === 'channeled'
                    ? 'bg-[#182942] border-blue-500 shadow-md text-white'
                    : 'bg-[#141b27] border-[#2c3a4f] text-stone-300 hover:bg-[#1a2436]'
                }`}
              >
                <div className="flex items-center justify-between mb-0.5">
                  <span className="font-bold text-xs">Kanalisiert</span>
                  <span className="text-blue-400 font-bold font-mono text-xs">X</span>
                </div>
                <div className="text-[10px] text-stone-400 leading-tight">Magische Bindung</div>
              </button>
            </div>
          </div>

          {/* 3. Schadensreduktion (SR / Panzerung) */}
          <div className="bg-[#182333] border border-[#2b3a50] rounded-lg p-3 sm:p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-[#C5A059] uppercase tracking-wider flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={applySR}
                  onChange={(e) => setApplySR(e.target.checked)}
                  className="rounded text-[#C5A059] focus:ring-0 cursor-pointer w-4 h-4"
                />
                <Shield size={14} className="text-amber-400" />
                <span>3. Schadensreduktion (SR) anwenden</span>
              </label>
              {applySR && (
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-stone-400 font-semibold">Effektive SR:</span>
                  <input
                    type="number"
                    min={0}
                    max={20}
                    value={effectiveSR}
                    onChange={(e) => setEffectiveSR(Math.max(0, parseInt(e.target.value, 10) || 0))}
                    className="w-12 bg-[#0e141f] border border-[#2e3b52] rounded px-1.5 py-0.5 text-center text-xs font-mono font-bold text-white focus:outline-none focus:border-[#C5A059]"
                  />
                </div>
              )}
            </div>

            {applySR && (
              <div className="text-[11px] text-stone-400 flex items-center justify-between bg-[#111926] px-2.5 py-1.5 rounded border border-[#26354a]">
                <span>
                  {begleiter ? 'SR' : 'Basis-SR des Helden'}: <strong className="text-white">{derivedSR}</strong>
                </span>
                <span className="text-stone-300">
                  {rawDamage} Brutto − {effectiveSR} SR = <strong className="text-[#C5A059]">{damageAfterSR} Schaden</strong>
                </span>
              </div>
            )}
          </div>

          {!begleiter && (<>
          {/* 4. Splitterpunkt: Schaden um 5 reduzieren (GRW S. 81) */}
          <div className="bg-[#182333] border border-[#2b3a50] rounded-lg p-3 sm:p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <label
                className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                  currentSplitterPoints > 0 ? 'text-[#C5A059] cursor-pointer' : 'text-stone-500 cursor-not-allowed'
                }`}
              >
                <input
                  type="checkbox"
                  disabled={currentSplitterPoints <= 0}
                  checked={useSplitter && currentSplitterPoints > 0}
                  onChange={(e) => setUseSplitter(e.target.checked)}
                  className="rounded text-[#C5A059] focus:ring-0 cursor-pointer w-4 h-4 disabled:opacity-40"
                />
                <Sparkles size={14} className={currentSplitterPoints > 0 ? 'text-[#C5A059]' : 'text-stone-500'} />
                <span>4. Splitterpunkt: Schaden um 5 reduzieren</span>
              </label>
              <span
                className={`text-[11px] font-bold px-2 py-0.5 rounded border ${
                  currentSplitterPoints > 0
                    ? 'bg-[#223147] text-[#C5A059] border-[#C5A059]/50'
                    : 'bg-red-950/60 text-red-400 border-red-500/30'
                }`}
              >
                {currentSplitterPoints} SP verfügbar
              </span>
            </div>

            {useSplitter && currentSplitterPoints > 0 && (
              <div className="text-[11px] text-stone-300 bg-[#1e2a3c] px-2.5 py-1.5 rounded border border-[#C5A059]/40 flex items-center justify-between">
                <span>GRW S. 81: Schaden aus einer Quelle um 5 Punkte reduzieren (1 SP)</span>
                <span className="text-[#C5A059] font-bold">
                  {damageAfterSR} → {finalDamage} Schaden (−{Math.min(5, damageAfterSR)})
                </span>
              </div>
            )}
          </div>

          {/* 5. Temporäre Lebenspunkte */}
          {activeTempHP > 0 && (
            <div className="bg-[#102724] border border-teal-500/40 rounded-lg p-2.5 text-xs text-teal-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Heart size={14} className="text-teal-400" />
                <span>
                  Temporäre LP aktiv: <strong>{activeTempHP} Temp LP</strong>
                </span>
              </div>
              <span className="text-[11px] text-teal-300">
                {absorbedByTemp > 0 ? `${absorbedByTemp} absorbieren den Schaden` : 'Kein Schaden erreicht Temp LP'}
              </span>
            </div>
          )}

          {/* 6. Zustände hinzufügen (GRW S. 168–169) */}
          <div className="bg-[#182333] border border-[#2b3a50] rounded-lg p-3 sm:p-3.5 space-y-2.5">
            <label className="block text-xs font-bold text-[#C5A059] uppercase tracking-wider">
              5. Zustände durch den Treffer (GRW S. 168–169)
            </label>

            {/* Quick condition toggles */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {COMMON_DAMAGE_CONDITIONS.map((cond) => {
                const isActive = activeConditions[cond.key]?.active;
                const level = activeConditions[cond.key]?.level ?? 1;

                return (
                  <div
                    key={cond.key}
                    className={`rounded-lg border p-2 transition-all flex flex-col justify-between ${
                      isActive
                        ? 'bg-[#2b1f1a] border-amber-500/80 text-white'
                        : 'bg-[#141b27] border-[#2c3a4f] text-stone-300'
                    }`}
                  >
                    <label className="flex items-center gap-1.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={isActive}
                        onChange={() => handleToggleCommonCondition(cond.key)}
                        className="rounded text-amber-500 focus:ring-0 cursor-pointer w-3.5 h-3.5"
                      />
                      <span className="text-xs font-bold truncate">{cond.key}</span>
                    </label>

                    {cond.hasLevel && isActive && (
                      <div className="mt-1.5 pt-1.5 border-t border-[#3f2f25] flex items-center justify-between">
                        <span className="text-[10px] text-stone-400">Stufe:</span>
                        <div className="flex items-center gap-1">
                          {[1, 2, ...(cond.maxLevel && cond.maxLevel >= 3 ? [3] : [])].map((lvl) => (
                            <button
                              key={lvl}
                              type="button"
                              onClick={() => handleLevelChange(cond.key, lvl)}
                              className={`w-5 h-5 rounded text-[11px] font-bold flex items-center justify-center cursor-pointer transition-colors ${
                                level === lvl
                                  ? 'bg-[#C5A059] text-[#1B365D]'
                                  : 'bg-[#1e2a3c] text-stone-300 hover:bg-[#2a394f]'
                              }`}
                            >
                              {lvl}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Additional condition dropdown */}
            <div className="pt-2 border-t border-[#2b3a50] flex items-center gap-2">
              <select
                value={extraCondition}
                onChange={(e) => setExtraCondition(e.target.value)}
                className="bg-[#141b27] border border-[#2e3b52] rounded-md px-2 py-1 text-xs text-[#F2EFE6] font-medium focus:outline-none focus:border-[#C5A059] flex-1 min-w-[120px]"
              >
                {ALL_CONDITIONS.map((cond) => (
                  <option key={cond} value={cond}>
                    {cond}
                  </option>
                ))}
              </select>

              {CONDITIONS_WITH_LEVELS.includes(extraCondition) && (
                <input
                  type="number"
                  min={1}
                  max={6}
                  value={extraLevel}
                  onChange={(e) => setExtraLevel(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="w-12 bg-[#141b27] border border-[#2e3b52] rounded-md px-1.5 py-1 text-center text-xs font-mono font-bold text-white focus:outline-none focus:border-[#C5A059]"
                />
              )}

              <button
                type="button"
                onClick={handleAddExtraCondition}
                className="px-2.5 py-1 rounded bg-[#223147] hover:bg-[#2d405b] text-xs font-bold text-stone-200 border border-[#374c69] cursor-pointer shrink-0"
              >
                + Zustand
              </button>
            </div>

            {/* Selected extra conditions pills */}
            {extraConditionsList.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {extraConditionsList.map((item, idx) => (
                  <span
                    key={`${item.key}-${idx}`}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-950/70 border border-amber-500/50 text-[11px] text-amber-200"
                  >
                    <span>
                      {item.key}
                      {item.level ? ` ${item.level}` : ''}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveExtraCondition(idx)}
                      className="text-stone-400 hover:text-white cursor-pointer ml-0.5"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
          </>)}

          {/* 7. Wundstufen-Vorschau (GRW S. 172) */}
          <div className="bg-[#111824] border border-[#2c3d54] rounded-lg p-3 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-stone-400 font-semibold">Wundstufen-Vorschau:</span>
              <div className="flex items-center gap-1.5 font-bold">
                <span className="text-stone-300">{woundPreview.curName}</span>
                <span className="text-stone-500">→</span>
                <span className={woundPreview.isWoundIncreased ? 'text-red-400' : 'text-stone-200'}>
                  {woundPreview.nextName}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] pt-1 border-t border-[#1e2a3c]">
              <span className="text-stone-400">Wundabzug auf alle Proben:</span>
              <span
                className={`font-mono font-bold ${
                  woundPreview.nextPenalty < 0 ? 'text-red-400' : 'text-stone-300'
                }`}
              >
                {woundPreview.nextPenalty}
              </span>
            </div>

            {woundPreview.isDying && (
              <div className="mt-1 bg-red-950/70 border border-red-500/60 rounded px-2.5 py-1 text-xs text-red-200 flex items-center gap-1.5">
                <AlertTriangle size={14} className="text-red-400 shrink-0" />
                <span className="font-bold">
                  Achtung: Todgeweiht oder alle Lebenspunkte aufgebraucht (Sterbend / Bewusstlos)!
                </span>
              </div>
            )}
          </div>

          {/* 8. Schadensquelle / Notiz */}
          <div>
            <label className="block text-[11px] font-bold text-stone-400 uppercase tracking-wide mb-1">
              Schadensquelle / Notiz (optional)
            </label>
            <input
              type="text"
              placeholder="z. B. Ork-Krieger Kriegsaxt, Sturz aus 5m, Feuerfalle"
              value={damageNote}
              onChange={(e) => setDamageNote(e.target.value)}
              className="w-full bg-[#0e141f] border border-[#2b3a50] rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-stone-500 focus:outline-none focus:border-[#C5A059]"
            />
          </div>
        </form>

        {/* Footer Actions */}
        <div className="px-4 sm:px-5 py-3 border-t border-[#C5A059]/40 bg-[#0e141f] flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-stone-300 hover:bg-[#1a2436] transition-colors cursor-pointer"
          >
            Abbrechen
          </button>

          <button
            type="button"
            onClick={() => handleSubmit()}
            className="px-5 py-2 rounded-lg text-xs sm:text-sm font-bold bg-[#C5A059] text-[#1B365D] hover:bg-[#d6b16a] transition-colors shadow-md cursor-pointer flex items-center gap-1.5"
          >
            <Check size={16} />
            <span>
              {finalDamage} {damageKind === 'consumed' ? 'echten' : damageKind === 'exhausted' ? 'Betäubungs-' : 'kanalis.'} Schaden anwenden
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
