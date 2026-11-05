import React, { useState, useEffect } from 'react';
import { Sun, Moon, RotateCcw, Settings, Heart, Sparkles, X, Check, Clock } from 'lucide-react';
import type { ItemEntry, Mastery } from '../../types';

export interface VerschnaufpauseOptions {
  healAllStun: boolean;
  stunAmount: number;
  healAllExhaustedFocus: boolean;
  exhaustedFocusAmount: number;
  exhaustReduction: number;
  removeConditions: boolean;
}

interface RestSectionProps {
  kon: number;
  wil: number;
  strengthsList: ItemEntry[];
  weaknessesList: ItemEntry[];
  masteries: Record<string, Mastery[]>;
  moonSign: string;
  onVerschnaufpause: (options?: Partial<VerschnaufpauseOptions>) => void;
  onRuhephase: (lpAmount: number, foAmount: number) => void;
}

export const RestSection: React.FC<RestSectionProps> = ({
  kon,
  wil,
  strengthsList,
  weaknessesList,
  masteries,
  moonSign,
  onVerschnaufpause,
  onRuhephase,
}) => {
  // Masteries, Strengths, Weaknesses detection helper
  const allMasteriesFlat = Object.values(masteries).flat();
  const hasMastery = (name: string) =>
    allMasteriesFlat.some((m) => m.name.toLowerCase().trim().includes(name.toLowerCase().trim()));
  const hasStrength = (name: string) =>
    strengthsList.some((s) => s.name.toLowerCase().trim().includes(name.toLowerCase().trim()));
  const hasWeakness = (name: string) =>
    weaknessesList.some((w) => w.name.toLowerCase().trim().includes(name.toLowerCase().trim()));

  // Active modifiers detection
  const hasErhoehteLPRegen = hasStrength('Erhöhte Lebensregeneration');
  const hasErhoehteFORegen = hasStrength('Erhöhte Fokusregeneration');
  const hasSchnellAufBeinen = hasMastery('Schnell wieder auf den Beinen');
  const hasGesunderGeist = hasMastery('Gesunder Geist in gesundem Körper');
  const hasDahinsiechen = hasWeakness('Dahinsiechen');
  const hasMeditation = hasMastery('Meditation');
  const hasDickschaedel = hasMastery('Dickschädel');
  const hasSegenMondkraft = moonSign === 'Segen der Mondkraft';

  // -------------------------------------------------------------
  // Ruhephase Default calculation
  // -------------------------------------------------------------
  const lpMultiplier = hasErhoehteLPRegen ? 3 : 2;
  const foMultiplier = hasErhoehteFORegen ? 3 : 2;

  let calculatedLPDefault = hasDahinsiechen ? 0 : kon * lpMultiplier;
  if (!hasDahinsiechen) {
    if (hasSchnellAufBeinen) calculatedLPDefault += 1;
    if (hasGesunderGeist) calculatedLPDefault += 1;
    calculatedLPDefault = Math.max(0, calculatedLPDefault);
  }

  const calculatedFODefault = Math.max(0, wil * foMultiplier);

  // User configured Ruhephase amounts
  const [customLP, setCustomLP] = useState<number>(calculatedLPDefault);
  const [customFO, setCustomFO] = useState<number>(calculatedFODefault);

  // -------------------------------------------------------------
  // Verschnaufpause configured options
  // -------------------------------------------------------------
  const [vpHealAllStun, setVpHealAllStun] = useState<boolean>(true);
  const [vpStunAmount, setVpStunAmount] = useState<number>(kon * 2);
  const [vpHealAllFocus, setVpHealAllFocus] = useState<boolean>(true);
  const [vpFocusAmount, setVpFocusAmount] = useState<number>(wil * 2);
  const [vpExhaustReduction, setVpExhaustReduction] = useState<number>(1);
  const [vpRemoveConditions, setVpRemoveConditions] = useState<boolean>(true);

  // Modal state: null | 'verschnaufpause' | 'ruhephase'
  const [activeModal, setActiveModal] = useState<'verschnaufpause' | 'ruhephase' | null>(null);

  // Sync with calculated defaults when character stats change
  useEffect(() => {
    setCustomLP(calculatedLPDefault);
  }, [calculatedLPDefault]);

  useEffect(() => {
    setCustomFO(calculatedFODefault);
  }, [calculatedFODefault]);

  // Handle ESC key for modal
  useEffect(() => {
    if (!activeModal) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setActiveModal(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeModal]);

  // Verschnaufpause is default check
  const isVpDefault =
    vpHealAllStun &&
    vpHealAllFocus &&
    vpExhaustReduction === 1 &&
    vpRemoveConditions;

  const resetVpToDefault = () => {
    setVpHealAllStun(true);
    setVpStunAmount(kon * 2);
    setVpHealAllFocus(true);
    setVpFocusAmount(wil * 2);
    setVpExhaustReduction(1);
    setVpRemoveConditions(true);
  };

  // Ruhephase is default check
  const isRuhephaseDefault = customLP === calculatedLPDefault && customFO === calculatedFODefault;

  const resetRuhephaseToDefault = () => {
    setCustomLP(calculatedLPDefault);
    setCustomFO(calculatedFODefault);
  };

  const handleExecuteVerschnaufpause = () => {
    onVerschnaufpause({
      healAllStun: vpHealAllStun,
      stunAmount: vpHealAllStun ? undefined : vpStunAmount,
      healAllExhaustedFocus: vpHealAllFocus,
      exhaustedFocusAmount: vpHealAllFocus ? undefined : vpFocusAmount,
      exhaustReduction: vpExhaustReduction,
      removeConditions: vpRemoveConditions,
    });
    if (activeModal === 'verschnaufpause') {
      setActiveModal(null);
    }
  };

  const handleExecuteRuhephase = () => {
    onRuhephase(customLP, customFO);
    if (activeModal === 'ruhephase') {
      setActiveModal(null);
    }
  };

  const vpDuration = hasSegenMondkraft ? '15 Minuten' : '30 Minuten';
  const ruhephaseDuration = hasSegenMondkraft ? '3 Stunden' : '6 Stunden';

  return (
    <div id="rest-section-container" className="bg-white bg-opacity-70 rounded-xl border border-[#d1c4b0] shadow-sm p-4 sm:p-5 space-y-3.5">
      {/* Section Header */}
      <div className="flex items-center justify-between border-b border-[#C5A059]/40 pb-2">
        <div className="flex items-center gap-2">
          <span className="text-xl">🏕️</span>
          <h3 className="font-bold text-lg sm:text-xl fantasy-font text-[#1B365D]">
            Regeneration &amp; Pausen
          </h3>
        </div>
      </div>

      {/* Two Action Cards (gestapelt für rechte Spalte) */}
      <div className="grid grid-cols-1 gap-3">
        {/* ── CARD 1: ☀️ VERSCHNAUFPAUSE ── */}
        <div
          id="verschnaufpause-card"
          className="rounded-xl border border-[#d1c4b0] bg-[#faf6ee] p-4 flex flex-col justify-between shadow-xs hover:border-[#C5A059] transition-all relative"
        >
          <div className="space-y-2">
            {/* Top row: Title + Duration */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-[#f3e5cf] text-[#1B365D] border border-[#C5A059]/40 shadow-2xs">
                  <Sun size={18} className="text-[#C5A059]" />
                </div>
                <div>
                  <h4 className="font-bold text-base text-[#1B365D] fantasy-font">
                    Verschnaufpause
                  </h4>
                  <div className="flex items-center gap-1.5 text-xs mt-0.5">
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[#f3e5cf] text-[#1B365D] font-mono font-bold text-xs border border-[#C5A059]/30">
                      <Clock size={12} className="text-[#C5A059] shrink-0" />
                      <span>{vpDuration}</span>
                    </span>
                    {hasSegenMondkraft && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#C5A059]/20 text-[#1B365D] font-bold border border-[#C5A059]/40">
                        Mondsegen
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Status Badge when customized */}
              {!isVpDefault && (
                <span className="text-[11px] px-2 py-0.5 rounded-full font-bold bg-[#1B365D] text-[#C5A059] border border-[#C5A059]/40 shadow-2xs">
                  Angepasst
                </span>
              )}
            </div>

            {/* Effect in 1 sentence */}
            <p className="text-xs text-gray-700 leading-relaxed min-h-[36px]">
              Heilt Betäubungsschaden &amp; erschöpften Fokus, baut 1 Stufe Erschöpfung ab.
            </p>
          </div>

          {/* Action Row */}
          <div className="pt-3 mt-2 border-t border-[#e3d4b9] flex flex-col gap-2">
            <button
              id="btn-execute-verschnaufpause"
              type="button"
              onClick={handleExecuteVerschnaufpause}
              className="w-full min-h-[42px] px-4 py-2 rounded-lg bg-[#1B365D] hover:bg-[#2a4f7e] active:scale-[0.99] text-white font-bold text-sm shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer select-none border border-[#1B365D]"
            >
              <Sun size={17} className="text-[#C5A059]" />
              <span>Verschnaufpause durchführen</span>
            </button>

            <div className="flex items-center justify-between text-xs px-0.5">
              <button
                type="button"
                onClick={() => setActiveModal('verschnaufpause')}
                className="text-gray-600 hover:text-[#1B365D] flex items-center gap-1 font-medium transition-colors hover:underline cursor-pointer py-1"
              >
                <Settings size={13} className="text-[#C5A059]" />
                <span>Optionen anpassen</span>
              </button>

              {!isVpDefault && (
                <button
                  type="button"
                  onClick={resetVpToDefault}
                  className="text-[#8B263E] hover:text-[#6a1c2f] flex items-center gap-1 font-bold text-[11px] hover:underline cursor-pointer py-1"
                  title="Auf berechnete Regelwerte zurücksetzen"
                >
                  <RotateCcw size={12} />
                  <span>Standardwerte wiederherstellen</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── CARD 2: 🌙 RUHEPHASE ── */}
        <div
          id="ruhephase-card"
          className="rounded-xl border border-[#d1c4b0] bg-[#faf6ee] p-4 flex flex-col justify-between shadow-xs hover:border-[#C5A059] transition-all relative"
        >
          <div className="space-y-2">
            {/* Top row: Title + Duration */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-[#f3e5cf] text-[#1B365D] border border-[#C5A059]/40 shadow-2xs">
                  <Moon size={18} className="text-[#1B365D]" />
                </div>
                <div>
                  <h4 className="font-bold text-base text-[#1B365D] fantasy-font">
                    Ruhephase
                  </h4>
                  <div className="flex items-center gap-1.5 text-xs mt-0.5">
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[#f3e5cf] text-[#1B365D] font-mono font-bold text-xs border border-[#C5A059]/30">
                      <Clock size={12} className="text-[#C5A059] shrink-0" />
                      <span>{ruhephaseDuration}</span>
                    </span>
                    {hasSegenMondkraft && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#C5A059]/20 text-[#1B365D] font-bold border border-[#C5A059]/40">
                        Mondsegen
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Status or preview badges */}
              <div className="flex items-center gap-1.5">
                {!isRuhephaseDefault && (
                  <span className="text-[11px] px-2 py-0.5 rounded-full font-bold bg-[#1B365D] text-[#C5A059] border border-[#C5A059]/40 shadow-2xs">
                    Angepasst
                  </span>
                )}
                <span className="text-xs font-bold font-mono px-2 py-0.5 rounded-md bg-[#f3e5cf] text-[#1B365D] border border-[#C5A059]/40 shadow-2xs">
                  +{customLP} LP · +{customFO} FO
                </span>
              </div>
            </div>

            {/* Effect in 1 sentence */}
            <p className="text-xs text-gray-700 leading-relaxed min-h-[36px]">
              Heilt zusätzlich echten Schaden &amp; verzehrten Fokus, baut Erschöpfung komplett ab.
            </p>
          </div>

          {/* Action Row */}
          <div className="pt-3 mt-2 border-t border-[#e3d4b9] flex flex-col gap-2">
            <button
              id="btn-execute-ruhephase"
              type="button"
              onClick={handleExecuteRuhephase}
              className="w-full min-h-[42px] px-4 py-2 rounded-lg bg-[#1B365D] hover:bg-[#2a4f7e] active:scale-[0.99] text-white font-bold text-sm shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer select-none border border-[#1B365D]"
            >
              <Moon size={17} className="text-[#C5A059]" />
              <span>Ruhephase durchführen</span>
            </button>

            <div className="flex items-center justify-between text-xs px-0.5">
              <button
                type="button"
                onClick={() => setActiveModal('ruhephase')}
                className="text-gray-600 hover:text-[#1B365D] flex items-center gap-1 font-medium transition-colors hover:underline cursor-pointer py-1"
              >
                <Settings size={13} className="text-[#C5A059]" />
                <span>Optionen anpassen</span>
              </button>

              {!isRuhephaseDefault && (
                <button
                  type="button"
                  onClick={resetRuhephaseToDefault}
                  className="text-[#8B263E] hover:text-[#6a1c2f] flex items-center gap-1 font-bold text-[11px] hover:underline cursor-pointer py-1"
                  title="Auf berechnete Regelwerte zurücksetzen"
                >
                  <RotateCcw size={12} />
                  <span>Standardwerte wiederherstellen</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* OPTIONS MODAL                                                 */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeModal && (
        <div
          id="rest-options-modal-backdrop"
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget) setActiveModal(null);
          }}
        >
          <div
            id="rest-options-modal-card"
            className="bg-[#faf6ee] dark-theme-panel text-[#1B365D] w-full max-w-lg rounded-2xl shadow-2xl border-2 border-[#C5A059] overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-150"
          >
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-[#1B365D] via-[#2A4D7F] to-[#1B365D] text-white p-4 flex items-center justify-between border-b border-[#C5A059]">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-white/15 border border-white/20">
                  {activeModal === 'verschnaufpause' ? (
                    <Sun size={20} className="text-[#C5A059]" />
                  ) : (
                    <Moon size={20} className="text-[#C5A059]" />
                  )}
                </div>
                <div>
                  <h4 className="font-bold text-base sm:text-lg fantasy-font">
                    {activeModal === 'verschnaufpause'
                      ? 'Optionen: Verschnaufpause'
                      : 'Optionen: Ruhephase'}
                  </h4>
                  <span className="text-xs text-white/80">
                    {activeModal === 'verschnaufpause'
                      ? `Verschnaufpause (${vpDuration})`
                      : `Ruhephase (${ruhephaseDuration})`}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/15 transition-colors cursor-pointer"
                title="Schließen"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4 text-xs sm:text-sm custom-scrollbar modal-body-scroll">
              {activeModal === 'verschnaufpause' ? (
                <>
                  {/* Rule Reference Info */}
                  <div className="bg-[#f3e5cf] border border-[#C5A059]/40 rounded-lg p-3 space-y-1.5 text-xs text-[#1B365D]">
                    <div className="flex items-center justify-between font-bold text-[#1B365D]">
                      <span>Regel-Grundlage:</span>
                      <span className="font-normal text-[11px] text-[#1B365D]/80">Splittermond GRW S. 160</span>
                    </div>
                    <p className="leading-relaxed">
                      Dauer: <strong>{vpDuration}</strong> ununterbrochene Rast. Heilt allen Betäubungsschaden, stellt erschöpften Fokus wieder her und baut 1 Stufe <em>Erschöpft</em> ab.
                    </p>

                    {(hasSegenMondkraft || hasMeditation || hasDickschaedel) && (
                      <div className="pt-2 border-t border-[#C5A059]/30 space-y-1">
                        <span className="font-semibold text-[#1B365D] block text-[11px]">Aktive Besonderheiten:</span>
                        <div className="flex flex-wrap gap-1.5">
                          {hasSegenMondkraft && (
                            <span className="px-2 py-0.5 rounded bg-[#C5A059]/20 text-[#1B365D] font-bold border border-[#C5A059]/40 text-[11px]">
                              Mondsegen: 15 Min statt 30 Min
                            </span>
                          )}
                          {hasMeditation && (
                            <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-900 border border-blue-200 text-[11px] font-semibold">
                              Meditation (T1): Fokus in 10 Min
                            </span>
                          )}
                          {hasDickschaedel && (
                            <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 border border-emerald-200 text-[11px] font-semibold">
                              Dickschädel (T1): Erschöpfung in 15 Min
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Options Settings */}
                  <div className="space-y-3">
                    {/* Betäubungsschaden */}
                    <div className="bg-white rounded-lg border border-stone-200 p-3 space-y-2 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-stone-900 flex items-center gap-1.5">
                          <Heart size={15} className="text-red-600" />
                          <span>Betäubungsschaden (LP)</span>
                        </span>
                        <label className="flex items-center gap-1.5 text-xs text-stone-700 cursor-pointer select-none font-semibold">
                          <input
                            type="checkbox"
                            checked={vpHealAllStun}
                            onChange={(e) => setVpHealAllStun(e.target.checked)}
                            className="rounded border-stone-300 text-emerald-600 focus:ring-emerald-500"
                          />
                          <span>Komplett heilen</span>
                        </label>
                      </div>

                      {!vpHealAllStun && (
                        <div className="flex items-center justify-between pt-1 border-t border-stone-100">
                          <span className="text-xs text-stone-600">Maximal zu heilende LP:</span>
                          <div className="flex items-center rounded-lg border border-stone-300 bg-stone-50 overflow-hidden h-7">
                            <button
                              type="button"
                              onClick={() => setVpStunAmount((prev) => Math.max(0, prev - 1))}
                              className="w-7 h-full hover:bg-stone-200 text-stone-800 font-bold flex items-center justify-center transition-colors"
                            >
                              −
                            </button>
                            <input
                              type="number"
                              min={0}
                              max={999}
                              value={vpStunAmount}
                              onFocus={(e) => e.target.select()}
                              onChange={(e) => setVpStunAmount(Math.max(0, parseInt(e.target.value, 10) || 0))}
                              className="w-12 h-full text-center font-bold text-xs text-stone-900 bg-transparent border-0 outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => setVpStunAmount((prev) => prev + 1)}
                              className="w-7 h-full hover:bg-stone-200 text-stone-800 font-bold flex items-center justify-center transition-colors"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      )}
                      <p className="text-[11px] text-stone-500">
                        {vpHealAllStun
                          ? 'Entfernt sämtlichen Betäubungsschaden (Gelb ✕ / Blau /) aus der Schadensleiste.'
                          : `Heilt maximal ${vpStunAmount} Punkte Betäubungsschaden.`}
                      </p>
                    </div>

                    {/* Erschöpfter Fokus */}
                    <div className="bg-white rounded-lg border border-stone-200 p-3 space-y-2 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-stone-900 flex items-center gap-1.5">
                          <Sparkles size={15} className="text-indigo-600" />
                          <span>Erschöpfter Fokus (FO)</span>
                        </span>
                        <label className="flex items-center gap-1.5 text-xs text-stone-700 cursor-pointer select-none font-semibold">
                          <input
                            type="checkbox"
                            checked={vpHealAllFocus}
                            onChange={(e) => setVpHealAllFocus(e.target.checked)}
                            className="rounded border-stone-300 text-emerald-600 focus:ring-emerald-500"
                          />
                          <span>Komplett heilen</span>
                        </label>
                      </div>

                      {!vpHealAllFocus && (
                        <div className="flex items-center justify-between pt-1 border-t border-stone-100">
                          <span className="text-xs text-stone-600">Maximal zu heilender FO:</span>
                          <div className="flex items-center rounded-lg border border-stone-300 bg-stone-50 overflow-hidden h-7">
                            <button
                              type="button"
                              onClick={() => setVpFocusAmount((prev) => Math.max(0, prev - 1))}
                              className="w-7 h-full hover:bg-stone-200 text-stone-800 font-bold flex items-center justify-center transition-colors"
                            >
                              −
                            </button>
                            <input
                              type="number"
                              min={0}
                              max={999}
                              value={vpFocusAmount}
                              onFocus={(e) => e.target.select()}
                              onChange={(e) => setVpFocusAmount(Math.max(0, parseInt(e.target.value, 10) || 0))}
                              className="w-12 h-full text-center font-bold text-xs text-stone-900 bg-transparent border-0 outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => setVpFocusAmount((prev) => prev + 1)}
                              className="w-7 h-full hover:bg-stone-200 text-stone-800 font-bold flex items-center justify-center transition-colors"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      )}
                      <p className="text-[11px] text-stone-500">
                        {vpHealAllFocus
                          ? 'Stellt sämtlichen erschöpften Fokus wieder her & beendet kanalisierte Zauber.'
                          : `Stellt maximal ${vpFocusAmount} Punkte erschöpften Fokus wieder her.`}
                      </p>
                    </div>

                    {/* Erschöpfung & Zustände */}
                    <div className="bg-white rounded-lg border border-stone-200 p-3 space-y-2.5 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-stone-900 text-xs">Erschöpfung abbauen:</span>
                        <div className="flex items-center rounded-lg border border-stone-300 bg-stone-50 overflow-hidden h-7">
                          <button
                            type="button"
                            onClick={() => setVpExhaustReduction((prev) => Math.max(0, prev - 1))}
                            className="w-7 h-full hover:bg-stone-200 text-stone-800 font-bold flex items-center justify-center transition-colors"
                          >
                            −
                          </button>
                          <input
                            type="number"
                            min={0}
                            max={10}
                            value={vpExhaustReduction}
                            onFocus={(e) => e.target.select()}
                            onChange={(e) => setVpExhaustReduction(Math.max(0, parseInt(e.target.value, 10) || 0))}
                            className="w-12 h-full text-center font-bold text-xs text-stone-900 bg-transparent border-0 outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => setVpExhaustReduction((prev) => prev + 1)}
                            className="w-7 h-full hover:bg-stone-200 text-stone-800 font-bold flex items-center justify-center transition-colors"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-stone-100">
                        <label className="flex items-center gap-2 text-xs text-stone-800 cursor-pointer select-none font-semibold">
                          <input
                            type="checkbox"
                            checked={vpRemoveConditions}
                            onChange={(e) => setVpRemoveConditions(e.target.checked)}
                            className="rounded border-stone-300 text-emerald-600 focus:ring-emerald-500"
                          />
                          <span>Zustände <em>Glaubenskrise</em> &amp; <em>Lahm</em> aufheben</span>
                        </label>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* Ruhephase Calculation & Traits */}
                  <div className="bg-[#f3e5cf] border border-[#C5A059]/40 rounded-lg p-3 space-y-2 text-xs text-[#1B365D]">
                    <div className="flex items-center justify-between font-bold text-[#1B365D]">
                      <span>Berechnungsgrundlage (Regel-Standard):</span>
                      <span className="font-normal text-[11px] text-[#1B365D]/80">Splittermond GRW S. 160</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
                      <div className="p-2 rounded bg-white border border-[#d1c4b0]">
                        <div className="font-bold text-[#8B263E]">❤️ Lebenspunkte (LP):</div>
                        <div className="font-mono text-[11px] mt-0.5 text-gray-800">
                          {hasDahinsiechen
                            ? '0 LP (Dahinsiechen)'
                            : `KON (${kon}) × ${lpMultiplier}${hasSchnellAufBeinen ? ' + 1' : ''}${hasGesunderGeist ? ' + 1' : ''} = ${calculatedLPDefault} LP`}
                        </div>
                      </div>

                      <div className="p-2 rounded bg-white border border-[#d1c4b0]">
                        <div className="font-bold text-[#1B365D]">✨ Fokuspool (FO):</div>
                        <div className="font-mono text-[11px] mt-0.5 text-gray-800">
                          {`WIL (${wil}) × ${foMultiplier} = ${calculatedFODefault} FO`}
                        </div>
                      </div>
                    </div>

                    {/* Active Modifiers info */}
                    {(hasErhoehteLPRegen || hasErhoehteFORegen || hasSchnellAufBeinen || hasGesunderGeist || hasDahinsiechen) && (
                      <div className="pt-2 border-t border-[#C5A059]/30 space-y-1">
                        <span className="font-semibold text-[#1B365D] block text-[11px]">Berücksichtigte Modifikatoren:</span>
                        <div className="flex flex-wrap gap-1.5 text-[11px]">
                          {hasErhoehteLPRegen && (
                            <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 font-semibold border border-emerald-200">
                              Stärke: Erhöhte Lebensregeneration (×3)
                            </span>
                          )}
                          {hasErhoehteFORegen && (
                            <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 font-semibold border border-emerald-200">
                              Stärke: Erhöhte Fokusregeneration (×3)
                            </span>
                          )}
                          {hasSchnellAufBeinen && (
                            <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-900 font-semibold border border-blue-200">
                              Meisterschaft: Schnell wieder auf den Beinen (+1 LP)
                            </span>
                          )}
                          {hasGesunderGeist && (
                            <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-900 font-semibold border border-blue-200">
                              Meisterschaft: Gesunder Geist in gesundem Körper (+1 LP)
                            </span>
                          )}
                          {hasDahinsiechen && (
                            <span className="px-2 py-0.5 rounded bg-red-100 text-red-900 font-semibold border border-red-200">
                              Schwäche: Dahinsiechen (keine LP-Regeneration)
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Manual Value Inputs */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* LP Input */}
                    <div className="bg-white rounded-lg border border-[#d1c4b0] p-3 space-y-2 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <label className="font-bold text-[#1B365D] text-xs flex items-center gap-1">
                          <Heart size={14} className="text-[#C5A059]" />
                          <span>Zu heilende LP:</span>
                        </label>
                        <span className="text-[11px] text-stone-500 font-medium">
                          Std: {calculatedLPDefault}
                        </span>
                      </div>

                      <div className="flex items-center rounded-lg border border-[#d1c4b0] bg-white overflow-hidden h-9">
                        <button
                          type="button"
                          onClick={() => setCustomLP((prev) => Math.max(0, prev - 1))}
                          className="w-9 h-full hover:bg-[#ebdcc4] text-[#1B365D] font-bold flex items-center justify-center transition-colors cursor-pointer"
                        >
                          −
                        </button>
                        <input
                          type="number"
                          min={0}
                          max={999}
                          value={customLP}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => setCustomLP(Math.max(0, parseInt(e.target.value, 10) || 0))}
                          className="flex-1 h-full text-center font-bold text-sm text-[#1B365D] bg-transparent border-0 outline-none font-mono"
                        />
                        <button
                          type="button"
                          onClick={() => setCustomLP((prev) => prev + 1)}
                          className="w-9 h-full hover:bg-[#ebdcc4] text-[#1B365D] font-bold flex items-center justify-center transition-colors cursor-pointer"
                        >
                          +
                        </button>
                      </div>
                      <p className="text-[11px] text-stone-500">
                        Heilt echten Schaden (Verzehrt ■ / Schrägstrich).
                      </p>
                    </div>

                    {/* FO Input */}
                    <div className="bg-white rounded-lg border border-[#d1c4b0] p-3 space-y-2 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <label className="font-bold text-[#1B365D] text-xs flex items-center gap-1">
                          <Sparkles size={14} className="text-[#1B365D]" />
                          <span>Zu heilender FO:</span>
                        </label>
                        <span className="text-[11px] text-stone-500 font-medium">
                          Std: {calculatedFODefault}
                        </span>
                      </div>

                      <div className="flex items-center rounded-lg border-2 border-[#1B365D]/30 bg-[#1B365D]/5 overflow-hidden h-9">
                        <button
                          type="button"
                          onClick={() => setCustomFO((prev) => Math.max(0, prev - 1))}
                          className="w-9 h-full hover:bg-[#1B365D]/15 text-[#1B365D] font-bold flex items-center justify-center transition-colors cursor-pointer"
                        >
                          −
                        </button>
                        <input
                          type="number"
                          min={0}
                          max={999}
                          value={customFO}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => setCustomFO(Math.max(0, parseInt(e.target.value, 10) || 0))}
                          className="flex-1 h-full text-center font-bold text-sm text-[#1B365D] bg-transparent border-0 outline-none font-mono"
                        />
                        <button
                          type="button"
                          onClick={() => setCustomFO((prev) => prev + 1)}
                          className="w-9 h-full hover:bg-[#1B365D]/15 text-[#1B365D] font-bold flex items-center justify-center transition-colors cursor-pointer"
                        >
                          +
                        </button>
                      </div>
                      <p className="text-[11px] text-stone-500">
                        Regeneriert verzehrten Fokus.
                      </p>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3.5 sm:p-4 bg-[#f3e9db] border-t border-[#d1c4b0] flex flex-wrap items-center justify-between gap-2.5">
              {/* Reset to standard button (only if modified) */}
              <div>
                {activeModal === 'verschnaufpause' && !isVpDefault && (
                  <button
                    type="button"
                    onClick={resetVpToDefault}
                    className="text-[#8B263E] hover:text-[#6a1c2f] flex items-center gap-1.5 font-bold text-xs hover:underline cursor-pointer py-1"
                  >
                    <RotateCcw size={13} />
                    <span>Standardwerte wiederherstellen</span>
                  </button>
                )}

                {activeModal === 'ruhephase' && !isRuhephaseDefault && (
                  <button
                    type="button"
                    onClick={resetRuhephaseToDefault}
                    className="text-[#8B263E] hover:text-[#6a1c2f] flex items-center gap-1.5 font-bold text-xs hover:underline cursor-pointer py-1"
                  >
                    <RotateCcw size={13} />
                    <span>Standardwerte wiederherstellen</span>
                  </button>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2 ml-auto">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-3.5 py-2 rounded-lg border border-[#d1c4b0] bg-white hover:bg-[#ebdcc4] text-[#1B365D] font-bold text-xs transition-colors cursor-pointer"
                >
                  Übernehmen &amp; Schließen
                </button>

                {activeModal === 'verschnaufpause' ? (
                  <button
                    type="button"
                    onClick={handleExecuteVerschnaufpause}
                    className="px-4 py-2 rounded-lg bg-[#1B365D] hover:bg-[#2a4f7e] text-white font-bold text-xs shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer border border-[#10233f]"
                  >
                    <Sun size={14} className="text-[#C5A059]" />
                    <span>Jetzt durchführen</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleExecuteRuhephase}
                    className="px-4 py-2 rounded-lg bg-[#1B365D] hover:bg-[#2a4f7e] text-white font-bold text-xs shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer border border-[#10233f]"
                  >
                    <Moon size={14} className="text-[#C5A059]" />
                    <span>Jetzt durchführen</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
