import React, { useState, useMemo } from 'react';
import { Heart, X, Plus, Minus, Check, Sparkles, Activity } from 'lucide-react';
import type { HealthSlot, StatusCondition } from '../../types';

export interface HealModalProps {
  onClose: () => void;
  maxLP: number;
  currentHealthSlots: HealthSlot[];
  activeConditions: StatusCondition[];
  /** Gesundheitsstufen (Standard: die fünf des GRW) */
  stufen?: { name: string; wundabzug: number }[];
  /** Für Begleiter: ohne Zustände des Helden; Name für die Überschrift */
  begleiter?: string;
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

const GRW_STUFEN = [
  { name: 'Unverletzt', wundabzug: 0 }, { name: 'Angeschlagen', wundabzug: -1 }, { name: 'Verletzt', wundabzug: -2 },
  { name: 'Schwer verletzt', wundabzug: -4 }, { name: 'Todgeweiht', wundabzug: -8 },
];

export const HealModal: React.FC<HealModalProps> = ({
  stufen = GRW_STUFEN,
  begleiter,
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

  // Selected healing method (GRW S. 119–120, 173–174)
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

    // Auto-select "Blutend" removal if Erste Hilfe or Wundversorgung is selected (GRW S. 119–120)
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

  // Wound preview simulation (GRW S. 172)
  const woundPreview = useMemo(() => {
    const HEALTH_LEVEL_NAMES = stufen.map((x) => x.name);
    const letzte = stufen.length - 1;
    const WOUND_PENALTIES = stufen.map((x) => x.wundabzug);

    let curLevelIndex = 0;
    if (consumedCount > maxLP) {
      curLevelIndex = Math.min(letzte, Math.floor((consumedCount - 1) / maxLP));
    }

    const simConsumed = Math.max(0, consumedCount - actualConsumed);

    let nextLevelIndex = 0;
    if (simConsumed > maxLP) {
      nextLevelIndex = Math.min(letzte, Math.floor((simConsumed - 1) / maxLP));
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
  }, [consumedCount, actualConsumed, maxLP, stufen]);

  // Submit healing
  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const methodNameMap: Record<HealMethodType, string> = {
      manual: 'Heilung',
      erste_hilfe: 'Erste Hilfe (Heilkunde, GRW S. 119–120)',
      wundversorgung: 'Wundversorgung (Heilkunde, GRW S. 119–120)',
      heilmagie: 'Heilmagie',
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
    <div className="fixed inset-0 bg-seite/80 flex items-center justify-center z-50 p-3 sm:p-4 overflow-y-auto">
      <div className="bg-flaeche border border-unverletzt rounded-karte shadow-2xl max-w-lg w-full max-h-[92vh] flex flex-col text-schrift overflow-hidden my-auto">
        {/* Header */}
        <div className="px-4 sm:px-5 py-3.5 border-b border-gold flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-unverletzt-grund border border-unverletzt flex items-center justify-center text-unverletzt">
              <Heart size={18} />
            </div>
            <div>
              <h3 className="fantasy-font text-lg sm:text-xl text-gold-hell font-bold leading-tight">
                {begleiter ? `${begleiter}: Heilung anwenden` : 'Heilung anwenden'}
              </h3>
              <p className="text-[11px] text-unverletzt leading-tight">
                Grundregelwerk (GRW S. 119–120 Heilkunde, S. 173–174 Heilung)
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

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 custom-scrollbar">
          {/* Current Health Overview */}
          <div className="bg-seite border border-unverletzt rounded-knopf p-2.5 sm:p-3 text-xs flex flex-wrap items-center justify-between gap-2">
            <span className="font-semibold text-unverletzt">Aktueller Schaden:</span>
            <div className="flex items-center gap-2 tabular-nums text-xs">
              <span className="px-2 py-0.5 rounded-knopf bg-schaden-grund border border-schaden text-schrift" title="Echter Schaden">
                Echt: <strong>{consumedCount}</strong>
              </span>
              <span className="px-2 py-0.5 rounded-knopf bg-erschoepft-grund border border-erschoepft text-schrift" title="Betäubung">
                Betäubung: <strong>{exhaustedCount}</strong>
              </span>
              {channeledCount > 0 && (
                <span className="px-2 py-0.5 rounded-knopf bg-seite border border-rahmen text-schrift" title="Kanalisiert">
                  Kanalisiert: <strong>{channeledCount}</strong>
                </span>
              )}
              <span className="font-bold text-schrift">
                Gesamt: {totalDamageCount} LP
              </span>
            </div>
          </div>

          {/* 1. Heilmethode (GRW S. 119–120, 173–174) */}
          <div className="bg-seite border border-rahmen rounded-knopf p-3 sm:p-3.5 space-y-2">
            <label className="block text-xs font-bold text-unverletzt uppercase tracking-wider">
              1. Heilmethode / Kontext (GRW S. 119–120, 173–174)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => handleSelectMethod('manual')}
                className={`p-2 rounded-knopf border text-left cursor-pointer transition-colors ${
                  method === 'manual'
                    ? 'bg-unverletzt-grund border-unverletzt text-schrift'
                    : 'bg-seite border-rahmen text-schrift hover:bg-seite'
                }`}
              >
                <div className="font-bold text-xs">Freie Heilung</div>
                <div className="text-[11px] text-leise leading-tight">Beliebige Punkte</div>
              </button>

              <button
                type="button"
                onClick={() => handleSelectMethod('erste_hilfe')}
                className={`p-2 rounded-knopf border text-left cursor-pointer transition-colors ${
                  method === 'erste_hilfe'
                    ? 'bg-unverletzt-grund border-unverletzt text-schrift'
                    : 'bg-seite border-rahmen text-schrift hover:bg-seite'
                }`}
              >
                <div className="font-bold text-xs flex items-center justify-between">
                  <span>Erste Hilfe</span>
                  <Activity size={12} className="text-unverletzt" />
                </div>
                <div className="text-[11px] text-leise leading-tight">Heilkunde, GRW S. 119–120</div>
              </button>

              <button
                type="button"
                onClick={() => handleSelectMethod('wundversorgung')}
                className={`p-2 rounded-knopf border text-left cursor-pointer transition-colors ${
                  method === 'wundversorgung'
                    ? 'bg-unverletzt-grund border-unverletzt text-schrift'
                    : 'bg-seite border-rahmen text-schrift hover:bg-seite'
                }`}
              >
                <div className="font-bold text-xs flex items-center justify-between">
                  <span>Wundversorgung</span>
                  <Plus size={12} className="text-unverletzt" />
                </div>
                <div className="text-[11px] text-leise leading-tight">Heilkunde, GRW S. 119–120</div>
              </button>

              <button
                type="button"
                onClick={() => handleSelectMethod('heilmagie')}
                className={`p-2 rounded-knopf border text-left cursor-pointer transition-colors ${
                  method === 'heilmagie'
                    ? 'bg-unverletzt-grund border-unverletzt text-schrift'
                    : 'bg-seite border-rahmen text-schrift hover:bg-seite'
                }`}
              >
                <div className="font-bold text-xs flex items-center justify-between">
                  <span>Heilmagie</span>
                  <Sparkles size={12} className="text-unverletzt" />
                </div>
                <div className="text-[11px] text-leise leading-tight">Balsam, etc.</div>
              </button>

              <button
                type="button"
                onClick={() => handleSelectMethod('heiltrank')}
                className={`p-2 rounded-knopf border text-left cursor-pointer transition-colors ${
                  method === 'heiltrank'
                    ? 'bg-unverletzt-grund border-unverletzt text-schrift'
                    : 'bg-seite border-rahmen text-schrift hover:bg-seite'
                }`}
              >
                <div className="font-bold text-xs">Heiltrank / Elixier</div>
                <div className="text-[11px] text-leise leading-tight">Alchemie</div>
              </button>

              <button
                type="button"
                onClick={() => handleSelectMethod('verschnaufpause')}
                className={`p-2 rounded-knopf border text-left cursor-pointer transition-colors ${
                  method === 'verschnaufpause'
                    ? 'bg-unverletzt-grund border-unverletzt text-schrift'
                    : 'bg-seite border-rahmen text-schrift hover:bg-seite'
                }`}
              >
                <div className="font-bold text-xs">Erholung</div>
                <div className="text-[11px] text-leise leading-tight">Alle Betäubung weg</div>
              </button>
            </div>
          </div>

          {/* 2. Heilmenge (Punkte) */}
          <div className="bg-seite border border-rahmen rounded-knopf p-3 sm:p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-unverletzt uppercase tracking-wider">
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
                    className="px-2 py-0.5 rounded-knopf bg-erschoepft-grund hover:bg-erschoepft-grund text-[11px] font-bold text-schrift border border-erschoepft cursor-pointer transition-colors"
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
                    className="px-2 py-0.5 rounded-knopf bg-schaden-grund hover:bg-schaden-grund text-[11px] font-bold text-schrift border border-schaden cursor-pointer transition-colors"
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
                    className="px-2 py-0.5 rounded-knopf bg-unverletzt-grund hover:bg-unverletzt-grund text-[11px] font-bold text-unverletzt border border-unverletzt cursor-pointer transition-colors"
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
                className="px-2.5 py-1.5 rounded-knopf bg-erhoeht hover:bg-rahmen text-xs font-bold text-schrift border border-rahmen cursor-pointer transition-colors"
              >
                -5
              </button>
              <button
                type="button"
                onClick={() => setHealAmount((d) => Math.max(0, d - 1))}
                className="w-8 h-8 rounded-knopf bg-erhoeht hover:bg-rahmen flex items-center justify-center font-bold text-schrift border border-rahmen cursor-pointer transition-colors"
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
                  className="w-full text-center bg-seite border border-unverletzt rounded-knopf py-1.5 text-2xl tabular-nums font-bold text-unverletzt focus:outline-none focus:border-unverletzt"
                />
              </div>

              <button
                type="button"
                onClick={() => setHealAmount((d) => d + 1)}
                className="w-8 h-8 rounded-knopf bg-erhoeht hover:bg-rahmen flex items-center justify-center font-bold text-schrift border border-rahmen cursor-pointer transition-colors"
              >
                <Plus size={14} />
              </button>
              <button
                type="button"
                onClick={() => setHealAmount((d) => d + 5)}
                className="px-2.5 py-1.5 rounded-knopf bg-erhoeht hover:bg-rahmen text-xs font-bold text-schrift border border-rahmen cursor-pointer transition-colors"
              >
                +5
              </button>
              <button
                type="button"
                onClick={() => setHealAmount((d) => d + 10)}
                className="px-2.5 py-1.5 rounded-knopf bg-erhoeht hover:bg-rahmen text-xs font-bold text-schrift border border-rahmen cursor-pointer transition-colors"
              >
                +10
              </button>
            </div>
          </div>

          {/* 3. Ziel-Schadensart / Priorität */}
          <div className="bg-seite border border-rahmen rounded-knopf p-3 sm:p-3.5 space-y-2">
            <label className="block text-xs font-bold text-unverletzt uppercase tracking-wider">
              3. Zu heilende Schadensart / Priorität
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 text-xs">
              <button
                type="button"
                onClick={() => setPriority('consumed_first')}
                className={`p-2 rounded-knopf border text-left cursor-pointer transition-colors ${
                  priority === 'consumed_first'
                    ? 'bg-unverletzt-grund border-unverletzt text-schrift'
                    : 'bg-seite border-rahmen text-schrift hover:bg-seite'
                }`}
              >
                <div className="font-bold text-xs text-schrift">Echter Schaden zuerst</div>
                <div className="text-[11px] text-leise">Rest auf Betäubung</div>
              </button>

              <button
                type="button"
                onClick={() => setPriority('exhausted_first')}
                className={`p-2 rounded-knopf border text-left cursor-pointer transition-colors ${
                  priority === 'exhausted_first'
                    ? 'bg-unverletzt-grund border-unverletzt text-schrift'
                    : 'bg-seite border-rahmen text-schrift hover:bg-seite'
                }`}
              >
                <div className="font-bold text-xs text-schrift">Betäubung zuerst</div>
                <div className="text-[11px] text-leise">Rest auf echten Schaden</div>
              </button>

              <button
                type="button"
                onClick={() => setPriority('only_consumed')}
                className={`p-2 rounded-knopf border text-left cursor-pointer transition-colors ${
                  priority === 'only_consumed'
                    ? 'bg-unverletzt-grund border-unverletzt text-schrift'
                    : 'bg-seite border-rahmen text-schrift hover:bg-seite'
                }`}
              >
                <div className="font-bold text-xs text-schaden">Nur Echter Schaden</div>
                <div className="text-[11px] text-leise">Kästen leeren</div>
              </button>

              <button
                type="button"
                onClick={() => setPriority('only_exhausted')}
                className={`p-2 rounded-knopf border text-left cursor-pointer transition-colors ${
                  priority === 'only_exhausted'
                    ? 'bg-unverletzt-grund border-unverletzt text-schrift'
                    : 'bg-seite border-rahmen text-schrift hover:bg-seite'
                }`}
              >
                <div className="font-bold text-xs text-gold-hell">Nur Betäubung</div>
                <div className="text-[11px] text-leise">Kästen leeren</div>
              </button>

              <button
                type="button"
                onClick={() => setPriority('only_channeled')}
                className={`p-2 rounded-knopf border text-left cursor-pointer transition-colors ${
                  priority === 'only_channeled'
                    ? 'bg-unverletzt-grund border-unverletzt text-schrift'
                    : 'bg-seite border-rahmen text-schrift hover:bg-seite'
                }`}
              >
                <div className="font-bold text-xs text-kanalisiert">Nur Kanalisiert</div>
                <div className="text-[11px] text-leise">Kästen leeren</div>
              </button>
            </div>

            {/* Effective healing summary pill */}
            <div className="text-[11px] bg-seite p-2 rounded-knopf border border-rahmen flex items-center justify-between text-schrift">
              <span>Effektiv geheilt:</span>
              <div className="flex items-center gap-2 tabular-nums font-bold">
                {actualConsumed > 0 && <span className="text-schaden">{actualConsumed} Echt</span>}
                {actualExhausted > 0 && <span className="text-gold-hell">{actualExhausted} Betäubung</span>}
                {actualChanneled > 0 && <span className="text-kanalisiert">{actualChanneled} Kanalisiert</span>}
                <span className="text-unverletzt">= {totalActualHealed} LP</span>
              </div>
            </div>
          </div>

          {!begleiter && (<>
          {/* 4. Zustände lindern / entfernen (GRW S. 168–169) */}
          <div className="bg-seite border border-rahmen rounded-knopf p-3 sm:p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-unverletzt uppercase tracking-wider">
                4. Zustände beenden (GRW S. 168–169)
              </label>
              <span className="text-[11px] text-leise">
                {activeConditions.length} aktiv
              </span>
            </div>

            {activeConditions.length > 0 ? (
              <div className="space-y-1.5 pt-1">
                <p className="text-[11px] text-leise">
                  Wähle Zustände aus, die durch die Versorgung (z. B. Verband bei <em>Blutend</em>) aufgehoben werden:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {activeConditions.map((cond) => {
                    const isSelected = conditionsToRemove.has(cond.id);
                    return (
                      <label
                        key={cond.id}
                        className={`flex items-center justify-between p-2 rounded-knopf border cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-unverletzt-grund border-unverletzt text-schrift'
                            : 'bg-seite border-rahmen text-schrift hover:bg-seite'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleConditionRemoval(cond.id)}
                            className="rounded-knopf text-unverletzt focus:ring-0 cursor-pointer w-4 h-4"
                          />
                          <span className="text-xs font-bold">
                            {cond.key} {cond.level && cond.level > 1 ? `Stufe ${cond.level}` : ''}
                          </span>
                        </div>
                        {cond.key === 'Blutend' && (
                          <span className="text-[11px] text-gold-hell font-semibold px-1.5 py-0.2 rounded-knopf bg-erschoepft-grund border border-erschoepft">
                            Wundversorgung
                          </span>
                        )}
                      </label>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="text-xs text-leise italic bg-seite p-2 rounded-knopf border border-rahmen">
                Keine aktiven Zustände auf dem Charakter vorhanden.
              </div>
            )}
          </div>
          </>)}

          {/* 5. Wundstufen-Vorschau (GRW S. 172) */}
          <div className="bg-seite border border-rahmen rounded-knopf p-3 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-leise font-semibold">Wundstufen-Verbesserung:</span>
              <div className="flex items-center gap-1.5 font-bold">
                <span className="text-schrift">{woundPreview.curName}</span>
                <span className="text-leise">→</span>
                <span className={woundPreview.isWoundImproved ? 'text-unverletzt' : 'text-schrift'}>
                  {woundPreview.nextName}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] pt-1 border-t border-rahmen">
              <span className="text-leise">Wundabzug auf Proben:</span>
              <div className="flex items-center gap-1.5 tabular-nums font-bold">
                <span className={woundPreview.curPenalty < 0 ? 'text-schaden' : 'text-leise'}>
                  {woundPreview.curPenalty}
                </span>
                <span className="text-leise">→</span>
                <span className={woundPreview.nextPenalty < 0 ? 'text-gold-hell' : 'text-unverletzt'}>
                  {woundPreview.nextPenalty}
                </span>
              </div>
            </div>
          </div>

          {/* 6. Quelle / Notiz */}
          <div>
            <label className="block text-[11px] font-bold text-leise uppercase tracking-wide mb-1">
              Quelle / Heiler / Zauber (optional)
            </label>
            <input
              type="text"
              placeholder="z. B. Balsam von Elena (4 LP), Erste Hilfe (3 EG), Heiltrank Q2"
              value={healNote}
              onChange={(e) => setHealNote(e.target.value)}
              className="w-full bg-seite border border-rahmen rounded-knopf px-2.5 py-1.5 text-xs text-schrift placeholder-leise focus:outline-none focus:border-unverletzt"
            />
          </div>
        </form>

        {/* Footer Actions */}
        <div className="px-4 sm:px-5 py-3 border-t border-unverletzt bg-seite flex items-center justify-between gap-3 shrink-0">
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
            disabled={totalActualHealed === 0 && conditionsToRemove.size === 0}
            className="min-h-11 px-5 py-2 rounded-knopf text-xs sm:text-sm font-bold bg-unverletzt-grund hover:bg-unverletzt-grund text-unverletzt border border-unverletzt hover:border-unverletzt transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
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
