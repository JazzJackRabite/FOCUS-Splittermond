import React, { useState, useMemo } from 'react';
import { Heart, X, Plus, Minus, Check, Sparkles, Activity } from 'lucide-react';
import type { HealthSlot, StatusCondition } from '../../types';

export interface HealModalProps {
  onClose: () => void;
  maxLP: number;
  currentHealthSlots: HealthSlot[];
  activeConditions: StatusCondition[];
  onApplyHeal: (result: {
    consumedHealed: number;
    exhaustedHealed: number;
    channeledHealed: number;
    conditionsToRemove: string[];
    conditionsToReduceLevel: Array<{ id: string; newLevel: number }>;
    note?: string;
    healMethod?: string;
  }) => void;
}

type HealMethodType = 'manual' | 'erste_hilfe' | 'wundversorgung' | 'heilmagie' | 'heiltrank' | 'verschnaufpause';
type HealPriorityType = 'consumed_first' | 'exhausted_first' | 'only_consumed' | 'only_exhausted' | 'only_channeled';

export const HealModal: React.FC<HealModalProps> = ({
  onClose,
  maxLP,
  currentHealthSlots,
  activeConditions,
  onApplyHeal,
}) => {
  // Current slot damage counts
  const consumedCount = useMemo(
    () => currentHealthSlots.filter((s) => s.type === 'consumed').length,
    [currentHealthSlots]
  );
  const exhaustedCount = useMemo(
    () => currentHealthSlots.filter((s) => s.type === 'exhausted').length,
    [currentHealthSlots]
  );
  const channeledCount = useMemo(
    () => currentHealthSlots.filter((s) => s.type === 'channeled').length,
    [currentHealthSlots]
  );
  const totalDamageCount = consumedCount + exhaustedCount + channeledCount;

  // Selected healing method (GRW S. 165-167)
  const [method, setMethod] = useState<HealMethodType>('manual');

  // Amount to heal
  const [healAmount, setHealAmount] = useState<number>(() => (totalDamageCount > 0 ? Math.min(3, totalDamageCount) : 1));

  // Priority / target damage type
  const [priority, setPriority] = useState<HealPriorityType>('consumed_first');

  // Condition treatments: set of condition IDs to remove
  const [conditionsToRemove, setConditionsToRemove] = useState<Set<string>>(new Set());

  // Optional note
  const [healNote, setHealNote] = useState<string>('');

  // Handle method presets
  const handleSelectMethod = (selected: HealMethodType) => {
    setMethod(selected);
    const newConditionsToRemove = new Set(conditionsToRemove);

    // Auto-select "Blutend" removal if Erste Hilfe or Wundversorgung is selected (GRW S. 165)
    if (selected === 'erste_hilfe' || selected === 'wundversorgung') {
      activeConditions.forEach((c) => {
        if (c.key === 'Blutend') {
          newConditionsToRemove.add(c.id);
        }
      });
      setConditionsToRemove(newConditionsToRemove);
    }

    if (selected === 'verschnaufpause') {
      setPriority('only_exhausted');
      setHealAmount(exhaustedCount > 0 ? exhaustedCount : 1);
    } else if (selected === 'heilmagie') {
      setPriority('consumed_first');
    } else if (selected === 'wundversorgung') {
      setPriority('consumed_first');
    }
  };

  // Toggle condition removal
  const toggleConditionRemoval = (id: string) => {
    setConditionsToRemove((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Calculate actual healing breakdown based on healAmount, priority and available damage
  const { actualConsumed, actualExhausted, actualChanneled, totalActualHealed } = useMemo(() => {
    let budget = Math.max(0, healAmount);
    let c = 0;
    let e = 0;
    let ch = 0;

    if (priority === 'consumed_first') {
      c = Math.min(budget, consumedCount);
      budget -= c;
      e = Math.min(budget, exhaustedCount);
      budget -= e;
      ch = Math.min(budget, channeledCount);
    } else if (priority === 'exhausted_first') {
      e = Math.min(budget, exhaustedCount);
      budget -= e;
      c = Math.min(budget, consumedCount);
      budget -= c;
      ch = Math.min(budget, channeledCount);
    } else if (priority === 'only_consumed') {
      c = Math.min(budget, consumedCount);
    } else if (priority === 'only_exhausted') {
      e = Math.min(budget, exhaustedCount);
    } else if (priority === 'only_channeled') {
      ch = Math.min(budget, channeledCount);
    }

    return {
      actualConsumed: c,
      actualExhausted: e,
      actualChanneled: ch,
      totalActualHealed: c + e + ch,
    };
  }, [healAmount, priority, consumedCount, exhaustedCount, channeledCount]);

  // Wound preview simulation (GRW S. 163)
  const woundPreview = useMemo(() => {
    const HEALTH_LEVEL_NAMES = ['Unverletzt', 'Angeschlagen', 'Verletzt', 'Schwer verletzt', 'Todgeweiht'];
    const WOUND_PENALTIES = [0, -1, -2, -4, -8];

    let curLevelIndex = 0;
    if (consumedCount > maxLP) {
      curLevelIndex = Math.min(4, Math.floor((consumedCount - 1) / maxLP));
    }

    const simConsumed = Math.max(0, consumedCount - actualConsumed);

    let nextLevelIndex = 0;
    if (simConsumed > maxLP) {
      nextLevelIndex = Math.min(4, Math.floor((simConsumed - 1) / maxLP));
    }

    const curName = HEALTH_LEVEL_NAMES[curLevelIndex] ?? 'Unverletzt';
    const nextName = HEALTH_LEVEL_NAMES[nextLevelIndex] ?? 'Unverletzt';
    const curPenalty = WOUND_PENALTIES[curLevelIndex] ?? 0;
    const nextPenalty = WOUND_PENALTIES[nextLevelIndex] ?? 0;
    const isWoundImproved = nextLevelIndex < curLevelIndex;

    return {
      curName,
      nextName,
      curPenalty,
      nextPenalty,
      isWoundImproved,
    };
  }, [consumedCount, actualConsumed, maxLP]);

  // Submit healing
  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const methodNameMap: Record<HealMethodType, string> = {
      manual: 'Heilung',
      erste_hilfe: 'Erste Hilfe (GRW S. 165)',
      wundversorgung: 'Wundversorgung (GRW S. 165-166)',
      heilmagie: 'Heilmagie (GRW S. 238)',
      heiltrank: 'Heiltrank / Elixier',
      verschnaufpause: 'Verschnaufpause / Rast',
    };

    onApplyHeal({
      consumedHealed: actualConsumed,
      exhaustedHealed: actualExhausted,
      channeledHealed: actualChanneled,
      conditionsToRemove: Array.from(conditionsToRemove),
      conditionsToReduceLevel: [],
      note: healNote.trim() || undefined,
      healMethod: methodNameMap[method],
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center z-50 p-3 sm:p-4 overflow-y-auto">
      <div className="bg-[#141b27] border-2 border-emerald-600/80 rounded-xl shadow-2xl max-w-lg w-full max-h-[92vh] flex flex-col text-[#F2EFE6] overflow-hidden my-auto">
        {/* Header */}
        <div className="px-4 sm:px-5 py-3.5 border-b border-emerald-600/60 bg-[#0e141f] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#13271d] border border-emerald-500/60 flex items-center justify-center text-emerald-400">
              <Heart size={18} />
            </div>
            <div>
              <h3 className="fantasy-font text-lg sm:text-xl text-white font-bold leading-tight">
                Heilung anwenden
              </h3>
              <p className="text-[11px] text-emerald-400 leading-tight">
                Grundregelwerk (GRW S. 165–167: Erste Hilfe, Wundversorgung &amp; Heilmagie)
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

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 custom-scrollbar">
          {/* Current Health Overview */}
          <div className="bg-[#121c17] border border-emerald-700/40 rounded-lg p-2.5 sm:p-3 text-xs flex flex-wrap items-center justify-between gap-2">
            <span className="font-semibold text-emerald-300">Aktueller Schaden:</span>
            <div className="flex items-center gap-2 font-mono text-xs">
              <span className="px-2 py-0.5 rounded bg-[#291715] border border-[#8c3d35]/70 text-[#F9DEDC]" title="Echter Schaden">
                Echt: <strong>{consumedCount}</strong>
              </span>
              <span className="px-2 py-0.5 rounded bg-[#261c11] border border-[#966b2d]/70 text-[#FBEFCE]" title="Betäubung">
                Betäubung: <strong>{exhaustedCount}</strong>
              </span>
              {channeledCount > 0 && (
                <span className="px-2 py-0.5 rounded bg-[#14202e] border border-[#3d5675]/70 text-[#DCE8F4]" title="Kanalisiert">
                  Kanalisiert: <strong>{channeledCount}</strong>
                </span>
              )}
              <span className="font-bold text-stone-300">
                Gesamt: {totalDamageCount} LP
              </span>
            </div>
          </div>

          {/* 1. Heilmethode (GRW S. 165-167) */}
          <div className="bg-[#182333] border border-[#2b3a50] rounded-lg p-3 sm:p-3.5 space-y-2">
            <label className="block text-xs font-bold text-emerald-400 uppercase tracking-wider">
              1. Heilmethode / Kontext (GRW S. 165–167)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => handleSelectMethod('manual')}
                className={`p-2 rounded-lg border text-left cursor-pointer transition-colors ${
                  method === 'manual'
                    ? 'bg-[#182d22] border-emerald-500 text-white'
                    : 'bg-[#141b27] border-[#2c3a4f] text-stone-300 hover:bg-[#1a2436]'
                }`}
              >
                <div className="font-bold text-xs">Freie Heilung</div>
                <div className="text-[10px] text-stone-400 leading-tight">Beliebige Punkte</div>
              </button>

              <button
                type="button"
                onClick={() => handleSelectMethod('erste_hilfe')}
                className={`p-2 rounded-lg border text-left cursor-pointer transition-colors ${
                  method === 'erste_hilfe'
                    ? 'bg-[#182d22] border-emerald-500 text-white'
                    : 'bg-[#141b27] border-[#2c3a4f] text-stone-300 hover:bg-[#1a2436]'
                }`}
              >
                <div className="font-bold text-xs flex items-center justify-between">
                  <span>Erste Hilfe</span>
                  <Activity size={12} className="text-emerald-400" />
                </div>
                <div className="text-[10px] text-stone-400 leading-tight">GRW S. 165 (EG LP)</div>
              </button>

              <button
                type="button"
                onClick={() => handleSelectMethod('wundversorgung')}
                className={`p-2 rounded-lg border text-left cursor-pointer transition-colors ${
                  method === 'wundversorgung'
                    ? 'bg-[#182d22] border-emerald-500 text-white'
                    : 'bg-[#141b27] border-[#2c3a4f] text-stone-300 hover:bg-[#1a2436]'
                }`}
              >
                <div className="font-bold text-xs flex items-center justify-between">
                  <span>Wundversorgung</span>
                  <Plus size={12} className="text-emerald-400" />
                </div>
                <div className="text-[10px] text-stone-400 leading-tight">GRW S. 165–166</div>
              </button>

              <button
                type="button"
                onClick={() => handleSelectMethod('heilmagie')}
                className={`p-2 rounded-lg border text-left cursor-pointer transition-colors ${
                  method === 'heilmagie'
                    ? 'bg-[#182d22] border-emerald-500 text-white'
                    : 'bg-[#141b27] border-[#2c3a4f] text-stone-300 hover:bg-[#1a2436]'
                }`}
              >
                <div className="font-bold text-xs flex items-center justify-between">
                  <span>Heilmagie</span>
                  <Sparkles size={12} className="text-emerald-400" />
                </div>
                <div className="text-[10px] text-stone-400 leading-tight">Balsam, etc.</div>
              </button>

              <button
                type="button"
                onClick={() => handleSelectMethod('heiltrank')}
                className={`p-2 rounded-lg border text-left cursor-pointer transition-colors ${
                  method === 'heiltrank'
                    ? 'bg-[#182d22] border-emerald-500 text-white'
                    : 'bg-[#141b27] border-[#2c3a4f] text-stone-300 hover:bg-[#1a2436]'
                }`}
              >
                <div className="font-bold text-xs">Heiltrank / Elixier</div>
                <div className="text-[10px] text-stone-400 leading-tight">Alchemie</div>
              </button>

              <button
                type="button"
                onClick={() => handleSelectMethod('verschnaufpause')}
                className={`p-2 rounded-lg border text-left cursor-pointer transition-colors ${
                  method === 'verschnaufpause'
                    ? 'bg-[#182d22] border-emerald-500 text-white'
                    : 'bg-[#141b27] border-[#2c3a4f] text-stone-300 hover:bg-[#1a2436]'
                }`}
              >
                <div className="font-bold text-xs">Erholung</div>
                <div className="text-[10px] text-stone-400 leading-tight">Alle Betäubung weg</div>
              </button>
            </div>
          </div>

          {/* 2. Heilmenge (Punkte) */}
          <div className="bg-[#182333] border border-[#2b3a50] rounded-lg p-3 sm:p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                2. Zu heilende Schadenspunkte
              </label>
              <div className="flex items-center gap-1">
                {exhaustedCount > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setPriority('only_exhausted');
                      setHealAmount(exhaustedCount);
                    }}
                    className="px-2 py-0.5 rounded bg-[#261c11] hover:bg-[#382613] text-[10px] font-bold text-[#FBEFCE] border border-[#966b2d]/70 cursor-pointer transition-colors"
                  >
                    Betäubung ({exhaustedCount})
                  </button>
                )}
                {consumedCount > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setPriority('consumed_first');
                      setHealAmount(consumedCount);
                    }}
                    className="px-2 py-0.5 rounded bg-[#291715] hover:bg-[#3d1f1c] text-[10px] font-bold text-[#F9DEDC] border border-[#8c3d35]/70 cursor-pointer transition-colors"
                  >
                    Echter ({consumedCount})
                  </button>
                )}
                {totalDamageCount > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setPriority('consumed_first');
                      setHealAmount(totalDamageCount);
                    }}
                    className="px-2 py-0.5 rounded bg-[#13271d] hover:bg-[#1a3829] text-[10px] font-bold text-emerald-300 border border-emerald-600/60 cursor-pointer transition-colors"
                  >
                    Alles ({totalDamageCount})
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setHealAmount((d) => Math.max(0, d - 5))}
                className="px-2.5 py-1.5 rounded bg-[#223147] hover:bg-[#2d405b] text-xs font-bold text-stone-300 border border-[#374c69] cursor-pointer transition-colors"
              >
                -5
              </button>
              <button
                type="button"
                onClick={() => setHealAmount((d) => Math.max(0, d - 1))}
                className="w-8 h-8 rounded bg-[#223147] hover:bg-[#2d405b] flex items-center justify-center font-bold text-stone-200 border border-[#374c69] cursor-pointer transition-colors"
              >
                <Minus size={14} />
              </button>

              <div className="flex-1 text-center">
                <input
                  type="number"
                  min={0}
                  max={99}
                  value={healAmount}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => setHealAmount(Math.max(0, parseInt(e.target.value, 10) || 0))}
                  className="w-full text-center bg-[#0e141f] border border-emerald-500/70 rounded-lg py-1.5 text-2xl font-mono font-bold text-emerald-300 focus:outline-none focus:border-emerald-400"
                />
              </div>

              <button
                type="button"
                onClick={() => setHealAmount((d) => d + 1)}
                className="w-8 h-8 rounded bg-[#223147] hover:bg-[#2d405b] flex items-center justify-center font-bold text-stone-200 border border-[#374c69] cursor-pointer transition-colors"
              >
                <Plus size={14} />
              </button>
              <button
                type="button"
                onClick={() => setHealAmount((d) => d + 5)}
                className="px-2.5 py-1.5 rounded bg-[#223147] hover:bg-[#2d405b] text-xs font-bold text-stone-300 border border-[#374c69] cursor-pointer transition-colors"
              >
                +5
              </button>
              <button
                type="button"
                onClick={() => setHealAmount((d) => d + 10)}
                className="px-2.5 py-1.5 rounded bg-[#223147] hover:bg-[#2d405b] text-xs font-bold text-stone-300 border border-[#374c69] cursor-pointer transition-colors"
              >
                +10
              </button>
            </div>
          </div>

          {/* 3. Ziel-Schadensart / Priorität */}
          <div className="bg-[#182333] border border-[#2b3a50] rounded-lg p-3 sm:p-3.5 space-y-2">
            <label className="block text-xs font-bold text-emerald-400 uppercase tracking-wider">
              3. Zu heilende Schadensart / Priorität
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 text-xs">
              <button
                type="button"
                onClick={() => setPriority('consumed_first')}
                className={`p-2 rounded-lg border text-left cursor-pointer transition-colors ${
                  priority === 'consumed_first'
                    ? 'bg-[#182d22] border-emerald-500 text-white'
                    : 'bg-[#141b27] border-[#2c3a4f] text-stone-300 hover:bg-[#1a2436]'
                }`}
              >
                <div className="font-bold text-xs text-white">Echter Schaden zuerst</div>
                <div className="text-[10px] text-stone-400">Rest auf Betäubung</div>
              </button>

              <button
                type="button"
                onClick={() => setPriority('exhausted_first')}
                className={`p-2 rounded-lg border text-left cursor-pointer transition-colors ${
                  priority === 'exhausted_first'
                    ? 'bg-[#182d22] border-emerald-500 text-white'
                    : 'bg-[#141b27] border-[#2c3a4f] text-stone-300 hover:bg-[#1a2436]'
                }`}
              >
                <div className="font-bold text-xs text-white">Betäubung zuerst</div>
                <div className="text-[10px] text-stone-400">Rest auf echten Schaden</div>
              </button>

              <button
                type="button"
                onClick={() => setPriority('only_consumed')}
                className={`p-2 rounded-lg border text-left cursor-pointer transition-colors ${
                  priority === 'only_consumed'
                    ? 'bg-[#182d22] border-emerald-500 text-white'
                    : 'bg-[#141b27] border-[#2c3a4f] text-stone-300 hover:bg-[#1a2436]'
                }`}
              >
                <div className="font-bold text-xs text-red-300">Nur Echter Schaden</div>
                <div className="text-[10px] text-stone-400">Kästen leeren</div>
              </button>

              <button
                type="button"
                onClick={() => setPriority('only_exhausted')}
                className={`p-2 rounded-lg border text-left cursor-pointer transition-colors ${
                  priority === 'only_exhausted'
                    ? 'bg-[#182d22] border-emerald-500 text-white'
                    : 'bg-[#141b27] border-[#2c3a4f] text-stone-300 hover:bg-[#1a2436]'
                }`}
              >
                <div className="font-bold text-xs text-amber-300">Nur Betäubung</div>
                <div className="text-[10px] text-stone-400">Kästen leeren</div>
              </button>

              <button
                type="button"
                onClick={() => setPriority('only_channeled')}
                className={`p-2 rounded-lg border text-left cursor-pointer transition-colors ${
                  priority === 'only_channeled'
                    ? 'bg-[#182d22] border-emerald-500 text-white'
                    : 'bg-[#141b27] border-[#2c3a4f] text-stone-300 hover:bg-[#1a2436]'
                }`}
              >
                <div className="font-bold text-xs text-blue-300">Nur Kanalisiert</div>
                <div className="text-[10px] text-stone-400">Kästen leeren</div>
              </button>
            </div>

            {/* Effective healing summary pill */}
            <div className="text-[11px] bg-[#111926] p-2 rounded border border-[#26354a] flex items-center justify-between text-stone-300">
              <span>Effektiv geheilt:</span>
              <div className="flex items-center gap-2 font-mono font-bold">
                {actualConsumed > 0 && <span className="text-red-300">{actualConsumed} Echt</span>}
                {actualExhausted > 0 && <span className="text-amber-300">{actualExhausted} Betäubung</span>}
                {actualChanneled > 0 && <span className="text-blue-300">{actualChanneled} Kanalisiert</span>}
                <span className="text-emerald-400">= {totalActualHealed} LP</span>
              </div>
            </div>
          </div>

          {/* 4. Zustände lindern / entfernen (GRW S. 164–165) */}
          <div className="bg-[#182333] border border-[#2b3a50] rounded-lg p-3 sm:p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                4. Zustände beenden (GRW S. 164–165)
              </label>
              <span className="text-[11px] text-stone-400">
                {activeConditions.length} aktiv
              </span>
            </div>

            {activeConditions.length > 0 ? (
              <div className="space-y-1.5 pt-1">
                <p className="text-[11px] text-stone-400">
                  Wähle Zustände aus, die durch die Versorgung (z. B. Verband bei <em>Blutend</em>) aufgehoben werden:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {activeConditions.map((cond) => {
                    const isSelected = conditionsToRemove.has(cond.id);
                    return (
                      <label
                        key={cond.id}
                        className={`flex items-center justify-between p-2 rounded-lg border cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-[#182d22] border-emerald-500/80 text-white'
                            : 'bg-[#141b27] border-[#2c3a4f] text-stone-300 hover:bg-[#1a2436]'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleConditionRemoval(cond.id)}
                            className="rounded text-emerald-500 focus:ring-0 cursor-pointer w-4 h-4"
                          />
                          <span className="text-xs font-bold">
                            {cond.key} {cond.level && cond.level > 1 ? `Stufe ${cond.level}` : ''}
                          </span>
                        </div>
                        {cond.key === 'Blutend' && (
                          <span className="text-[10px] text-amber-300 font-semibold px-1.5 py-0.2 rounded bg-amber-950/60 border border-amber-500/30">
                            Wundversorgung
                          </span>
                        )}
                      </label>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="text-xs text-stone-400 italic bg-[#111926] p-2 rounded border border-[#26354a]">
                Keine aktiven Zustände auf dem Charakter vorhanden.
              </div>
            )}
          </div>

          {/* 5. Wundstufen-Vorschau (GRW S. 163) */}
          <div className="bg-[#111824] border border-[#2c3d54] rounded-lg p-3 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-stone-400 font-semibold">Wundstufen-Verbesserung:</span>
              <div className="flex items-center gap-1.5 font-bold">
                <span className="text-stone-300">{woundPreview.curName}</span>
                <span className="text-stone-500">→</span>
                <span className={woundPreview.isWoundImproved ? 'text-emerald-400' : 'text-stone-200'}>
                  {woundPreview.nextName}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] pt-1 border-t border-[#1e2a3c]">
              <span className="text-stone-400">Wundabzug auf Proben:</span>
              <div className="flex items-center gap-1.5 font-mono font-bold">
                <span className={woundPreview.curPenalty < 0 ? 'text-red-400' : 'text-stone-400'}>
                  {woundPreview.curPenalty}
                </span>
                <span className="text-stone-500">→</span>
                <span className={woundPreview.nextPenalty < 0 ? 'text-amber-300' : 'text-emerald-400'}>
                  {woundPreview.nextPenalty}
                </span>
              </div>
            </div>
          </div>

          {/* 6. Quelle / Notiz */}
          <div>
            <label className="block text-[11px] font-bold text-stone-400 uppercase tracking-wide mb-1">
              Quelle / Heiler / Zauber (optional)
            </label>
            <input
              type="text"
              placeholder="z. B. Balsam von Elena (4 LP), Erste Hilfe (3 EG), Heiltrank Q2"
              value={healNote}
              onChange={(e) => setHealNote(e.target.value)}
              className="w-full bg-[#0e141f] border border-[#2b3a50] rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-stone-500 focus:outline-none focus:border-emerald-500"
            />
          </div>
        </form>

        {/* Footer Actions */}
        <div className="px-4 sm:px-5 py-3 border-t border-emerald-600/40 bg-[#0e141f] flex items-center justify-between gap-3 shrink-0">
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
            disabled={totalActualHealed === 0 && conditionsToRemove.size === 0}
            className="px-5 py-2 rounded-lg text-xs sm:text-sm font-bold bg-[#13271d] hover:bg-[#1a3829] text-emerald-300 border border-emerald-500/70 hover:border-emerald-400 transition-colors shadow-md cursor-pointer flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Check size={16} />
            <span>
              {totalActualHealed > 0
                ? `${totalActualHealed} LP heilen`
                : conditionsToRemove.size > 0
                ? `${conditionsToRemove.size} Zustand/Zustände beenden`
                : 'Heilung anwenden'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
