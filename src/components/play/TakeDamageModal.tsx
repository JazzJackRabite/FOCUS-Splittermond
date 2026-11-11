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
    <div className="fixed inset-0 bg-seite/80 flex items-center justify-center z-50 p-3 sm:p-4 overflow-y-auto">
      <div className="bg-flaeche border border-rahmen rounded-karte shadow-2xl max-w-lg w-full max-h-[92vh] flex flex-col text-schrift overflow-hidden my-auto">
        {/* Header */}
        <div className="px-4 sm:px-5 py-3.5 border-b border-gold flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-schaden-grund border border-schaden flex items-center justify-center text-schrift">
              <Flame size={18} />
            </div>
            <div>
              <h3 className="fantasy-font text-lg sm:text-xl text-gold-hell font-bold leading-tight">
                {begleiter ? `${begleiter}: Schaden erleiden` : 'Schaden erleiden'}
              </h3>
              <p className="text-[11px] text-gold leading-tight">
                Grundregelwerk (GRW S. 172–173 &amp; S. 81)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 min-w-11 inline-flex items-center justify-center rounded-knopf border border-rahmen bg-erhoeht text-schrift hover:border-gold transition-colors"
            title="Schließen" aria-label="Schließen"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 custom-scrollbar">
          {/* 1. Eingehender Schaden (Brutto) */}
          <div className="bg-seite border border-rahmen rounded-knopf p-3 sm:p-3.5 space-y-2.5">
            <label className="block text-xs font-bold text-gold uppercase tracking-wider">
              1. Eingehender Schaden (Brutto)
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setRawDamage((d) => Math.max(0, d - 5))}
                className="px-2.5 py-1.5 rounded-knopf bg-erhoeht hover:bg-rahmen text-xs font-bold text-schrift border border-rahmen cursor-pointer"
              >
                -5
              </button>
              <button
                type="button"
                onClick={() => setRawDamage((d) => Math.max(0, d - 1))}
                className="w-8 h-8 rounded-knopf bg-erhoeht hover:bg-rahmen flex items-center justify-center font-bold text-schrift border border-rahmen cursor-pointer"
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
                  className="w-full text-center bg-seite border border-gold rounded-knopf py-1.5 text-2xl tabular-nums font-bold text-schrift focus:outline-none focus:border-gold"
                />
              </div>

              <button
                type="button"
                onClick={() => setRawDamage((d) => d + 1)}
                className="w-8 h-8 rounded-knopf bg-erhoeht hover:bg-rahmen flex items-center justify-center font-bold text-schrift border border-rahmen cursor-pointer"
              >
                <Plus size={14} />
              </button>
              <button
                type="button"
                onClick={() => setRawDamage((d) => d + 5)}
                className="px-2.5 py-1.5 rounded-knopf bg-erhoeht hover:bg-rahmen text-xs font-bold text-schrift border border-rahmen cursor-pointer"
              >
                +5
              </button>
              <button
                type="button"
                onClick={() => setRawDamage((d) => d + 10)}
                className="px-2.5 py-1.5 rounded-knopf bg-erhoeht hover:bg-rahmen text-xs font-bold text-schrift border border-rahmen cursor-pointer"
              >
                +10
              </button>
            </div>
          </div>

          {/* 2. Schadenstyp (GRW S. 172–173) */}
          <div className="bg-seite border border-rahmen rounded-knopf p-3 sm:p-3.5 space-y-2">
            <label className="block text-xs font-bold text-gold uppercase tracking-wider">
              2. Schadenstyp (GRW S. 172–173)
            </label>
            <div className="grid grid-cols-3 gap-2">
              {/* Echter Schaden */}
              <button
                type="button"
                onClick={() => setDamageKind('consumed')}
                className={`p-2 rounded-knopf border text-left transition-all cursor-pointer ${
                  damageKind === 'consumed'
                    ? 'bg-schaden-grund border-schaden text-schrift'
                    : 'bg-seite border-rahmen text-schrift hover:bg-seite'
                }`}
              >
                <div className="flex items-center justify-between mb-0.5">
                  <span className="font-bold text-xs">Echter Schaden</span>
                  <span className="text-schaden font-bold tabular-nums text-xs">■</span>
                </div>
                <div className="text-[11px] text-leise leading-tight">Wunden, Stürze, Waffen</div>
              </button>

              {/* Betäubungsschaden */}
              <button
                type="button"
                onClick={() => setDamageKind('exhausted')}
                className={`p-2 rounded-knopf border text-left transition-all cursor-pointer ${
                  damageKind === 'exhausted'
                    ? 'bg-erschoepft-grund border-erschoepft text-schrift'
                    : 'bg-seite border-rahmen text-schrift hover:bg-seite'
                }`}
              >
                <div className="flex items-center justify-between mb-0.5">
                  <span className="font-bold text-xs">Betäubung</span>
                  <span className="text-gold font-bold tabular-nums text-xs">/</span>
                </div>
                <div className="text-[11px] text-leise leading-tight">Stumpfe Hiebe, Schock</div>
              </button>

              {/* Kanalisierter Schaden */}
              <button
                type="button"
                onClick={() => setDamageKind('channeled')}
                className={`p-2 rounded-knopf border text-left transition-all cursor-pointer ${
                  damageKind === 'channeled'
                    ? 'bg-flaeche border-kanalisiert text-schrift'
                    : 'bg-seite border-rahmen text-schrift hover:bg-seite'
                }`}
              >
                <div className="flex items-center justify-between mb-0.5">
                  <span className="font-bold text-xs">Kanalisiert</span>
                  <span className="text-kanalisiert font-bold tabular-nums text-xs">X</span>
                </div>
                <div className="text-[11px] text-leise leading-tight">Magische Bindung</div>
              </button>
            </div>
          </div>

          {/* 3. Schadensreduktion (SR / Panzerung) */}
          <div className="bg-seite border border-rahmen rounded-knopf p-3 sm:p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-gold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={applySR}
                  onChange={(e) => setApplySR(e.target.checked)}
                  className="rounded-knopf text-gold focus:ring-0 cursor-pointer w-4 h-4"
                />
                <Shield size={14} className="text-gold" />
                <span>3. Schadensreduktion (SR) anwenden</span>
              </label>
              {applySR && (
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-leise font-semibold">Effektive SR:</span>
                  <input
                    type="number"
                    min={0}
                    max={20}
                    value={effectiveSR}
                    onChange={(e) => setEffectiveSR(Math.max(0, parseInt(e.target.value, 10) || 0))}
                    className="w-12 bg-seite border border-rahmen rounded-knopf px-1.5 py-0.5 text-center text-xs tabular-nums font-bold text-schrift focus:outline-none focus:border-gold"
                  />
                </div>
              )}
            </div>

            {applySR && (
              <div className="text-[11px] text-leise flex items-center justify-between bg-seite px-2.5 py-1.5 rounded-knopf border border-rahmen">
                <span>
                  {begleiter ? 'SR' : 'Basis-SR des Helden'}: <strong className="text-schrift">{derivedSR}</strong>
                </span>
                <span className="text-schrift">
                  {rawDamage} Brutto − {effectiveSR} SR = <strong className="text-gold">{damageAfterSR} Schaden</strong>
                </span>
              </div>
            )}
          </div>

          {!begleiter && (<>
          {/* 4. Splitterpunkt: Schaden um 5 reduzieren (GRW S. 81) */}
          <div className="bg-seite border border-rahmen rounded-knopf p-3 sm:p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <label
                className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                  currentSplitterPoints > 0 ? 'text-gold cursor-pointer' : 'text-leise cursor-not-allowed'
                }`}
              >
                <input
                  type="checkbox"
                  disabled={currentSplitterPoints <= 0}
                  checked={useSplitter && currentSplitterPoints > 0}
                  onChange={(e) => setUseSplitter(e.target.checked)}
                  className="rounded-knopf text-gold focus:ring-0 cursor-pointer w-4 h-4 disabled:opacity-40"
                />
                <Sparkles size={14} className={currentSplitterPoints > 0 ? 'text-gold' : 'text-leise'} />
                <span>4. Splitterpunkt: Schaden um 5 reduzieren</span>
              </label>
              <span
                className={`text-[11px] font-bold px-2 py-0.5 rounded-knopf border ${
                  currentSplitterPoints > 0
                    ? 'bg-erhoeht text-gold border-gold'
                    : 'bg-schaden-grund text-schrift border-schaden'
                }`}
              >
                {currentSplitterPoints} SP verfügbar
              </span>
            </div>

            {useSplitter && currentSplitterPoints > 0 && (
              <div className="text-[11px] text-schrift bg-flaeche px-2.5 py-1.5 rounded-knopf border border-rahmen flex items-center justify-between">
                <span>GRW S. 81: Schaden aus einer Quelle um 5 Punkte reduzieren (1 SP)</span>
                <span className="text-gold font-bold">
                  {damageAfterSR} → {finalDamage} Schaden (−{Math.min(5, damageAfterSR)})
                </span>
              </div>
            )}
          </div>

          {/* 5. Temporäre Lebenspunkte */}
          {activeTempHP > 0 && (
            <div className="bg-temporaer-grund border border-temporaer rounded-knopf p-2.5 text-xs text-temporaer flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Heart size={14} className="text-temporaer" />
                <span>
                  Temporäre LP aktiv: <strong>{activeTempHP} Temp LP</strong>
                </span>
              </div>
              <span className="text-[11px] text-temporaer">
                {absorbedByTemp > 0 ? `${absorbedByTemp} absorbieren den Schaden` : 'Kein Schaden erreicht Temp LP'}
              </span>
            </div>
          )}

          {/* 6. Zustände hinzufügen (GRW S. 168–169) */}
          <div className="bg-seite border border-rahmen rounded-knopf p-3 sm:p-3.5 space-y-2.5">
            <label className="block text-xs font-bold text-gold uppercase tracking-wider">
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
                    className={`rounded-knopf border p-2 transition-all flex flex-col justify-between ${
                      isActive
                        ? 'bg-erschoepft-grund border-gold text-schrift'
                        : 'bg-seite border-rahmen text-schrift'
                    }`}
                  >
                    <label className="flex items-center gap-1.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={isActive}
                        onChange={() => handleToggleCommonCondition(cond.key)}
                        className="rounded-knopf text-gold focus:ring-0 cursor-pointer w-3.5 h-3.5"
                      />
                      <span className="text-xs font-bold truncate">{cond.key}</span>
                    </label>

                    {cond.hasLevel && isActive && (
                      <div className="mt-1.5 pt-1.5 border-t border-erschoepft flex items-center justify-between">
                        <span className="text-[11px] text-leise">Stufe:</span>
                        <div className="flex items-center gap-1">
                          {[1, 2, ...(cond.maxLevel && cond.maxLevel >= 3 ? [3] : [])].map((lvl) => (
                            <button
                              key={lvl}
                              type="button"
                              onClick={() => handleLevelChange(cond.key, lvl)}
                              className={`w-5 h-5 rounded-knopf text-[11px] font-bold flex items-center justify-center cursor-pointer transition-colors ${
                                level === lvl
                                  ? 'bg-gold text-seite'
                                  : 'bg-flaeche text-schrift hover:bg-erhoeht hover:text-schrift'
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
            <div className="pt-2 border-t border-rahmen flex items-center gap-2">
              <select
                value={extraCondition}
                onChange={(e) => setExtraCondition(e.target.value)}
                className="bg-seite border border-rahmen rounded-knopf px-2 py-1 text-xs text-schrift font-medium focus:outline-none focus:border-gold flex-1 min-w-[120px]"
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
                  className="w-12 bg-seite border border-rahmen rounded-knopf px-1.5 py-1 text-center text-xs tabular-nums font-bold text-schrift focus:outline-none focus:border-gold"
                />
              )}

              <button
                type="button"
                onClick={handleAddExtraCondition}
                className="px-2.5 py-1 rounded-knopf bg-erhoeht hover:bg-rahmen text-xs font-bold text-schrift border border-rahmen cursor-pointer shrink-0"
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
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-erschoepft-grund border border-gold text-[11px] text-gold-hell"
                  >
                    <span>
                      {item.key}
                      {item.level ? ` ${item.level}` : ''}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveExtraCondition(idx)}
                      className="text-leise hover:text-schrift cursor-pointer ml-0.5"
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
          <div className="bg-seite border border-rahmen rounded-knopf p-3 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-leise font-semibold">Wundstufen-Vorschau:</span>
              <div className="flex items-center gap-1.5 font-bold">
                <span className="text-schrift">{woundPreview.curName}</span>
                <span className="text-leise">→</span>
                <span className={woundPreview.isWoundIncreased ? 'text-schaden' : 'text-schrift'}>
                  {woundPreview.nextName}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] pt-1 border-t border-rahmen">
              <span className="text-leise">Wundabzug auf alle Proben:</span>
              <span
                className={`tabular-nums font-bold ${
                  woundPreview.nextPenalty < 0 ? 'text-schaden' : 'text-schrift'
                }`}
              >
                {woundPreview.nextPenalty}
              </span>
            </div>

            {woundPreview.isDying && (
              <div className="mt-1 bg-schaden-grund border border-schaden rounded-knopf px-2.5 py-1 text-xs text-schrift flex items-center gap-1.5">
                <AlertTriangle size={14} className="text-schaden shrink-0" />
                <span className="font-bold">
                  Achtung: Todgeweiht oder alle Lebenspunkte aufgebraucht (Sterbend / Bewusstlos)!
                </span>
              </div>
            )}
          </div>

          {/* 8. Schadensquelle / Notiz */}
          <div>
            <label className="block text-[11px] font-bold text-leise uppercase tracking-wide mb-1">
              Schadensquelle / Notiz (optional)
            </label>
            <input
              type="text"
              placeholder="z. B. Ork-Krieger Kriegsaxt, Sturz aus 5m, Feuerfalle"
              value={damageNote}
              onChange={(e) => setDamageNote(e.target.value)}
              className="w-full bg-seite border border-rahmen rounded-knopf px-2.5 py-1.5 text-xs text-schrift placeholder-leise focus:outline-none focus:border-gold"
            />
          </div>
        </form>

        {/* Footer Actions */}
        <div className="px-4 sm:px-5 py-3 border-t border-rahmen bg-seite flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 px-3.5 py-1.5 rounded-knopf text-xs font-semibold text-schrift hover:bg-seite transition-colors cursor-pointer"
          >
            Abbrechen
          </button>

          <button
            type="button"
            onClick={() => handleSubmit()}
            className="min-h-11 px-5 py-2 rounded-knopf text-xs sm:text-sm font-bold bg-gold text-seite hover:bg-gold-hell transition-colors cursor-pointer flex items-center gap-1.5"
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
