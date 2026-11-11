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
    <div id="rest-section-container" className="bg-flaeche bg-opacity-70 rounded-karte border border-rahmen p-4 sm:p-5 space-y-3.5">
      {/* Section Header */}
      <div className="flex items-center justify-between border-b border-rahmen pb-2">
        <div className="flex items-center gap-2">
          
          <h3 className="font-bold text-lg sm:text-xl fantasy-font text-gold-hell">
            Regeneration &amp; Pausen
          </h3>
        </div>
      </div>

      {/* Two Action Cards (gestapelt für rechte Spalte) */}
      <div className="grid grid-cols-1 gap-3">
        {/* ── CARD 1: VERSCHNAUFPAUSE ── */}
        <div
          id="verschnaufpause-card"
          className="rounded-karte border border-rahmen bg-erhoeht p-4 flex flex-col justify-between hover:border-gold transition-all relative"
        >
          <div className="space-y-2">
            {/* Top row: Title + Duration */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-knopf bg-erhoeht text-schrift border border-rahmen shadow-2xs">
                  <Sun size={18} className="text-gold" />
                </div>
                <div>
                  <h4 className="font-bold text-base text-gold-hell fantasy-font">
                    Verschnaufpause
                  </h4>
                  <div className="flex items-center gap-1.5 text-xs mt-0.5">
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-knopf bg-erhoeht text-schrift tabular-nums font-bold text-xs border border-rahmen">
                      <Clock size={12} className="text-gold shrink-0" />
                      <span>{vpDuration}</span>
                    </span>
                    {hasSegenMondkraft && (
                      <span className="text-[11px] px-1.5 py-0.5 rounded-knopf bg-rahmen text-schrift font-bold border border-rahmen">
                        Mondsegen
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Status Badge when customized */}
              {!isVpDefault && (
                <span className="text-[11px] px-2 py-0.5 rounded-full font-bold bg-erhoeht text-gold border border-rahmen shadow-2xs">
                  Angepasst
                </span>
              )}
            </div>

            {/* Effect in 1 sentence */}
            <p className="text-xs text-schrift leading-relaxed min-h-[36px]">
              Heilt Betäubungsschaden &amp; erschöpften Fokus, baut 1 Stufe Erschöpfung ab.
            </p>
          </div>

          {/* Action Row */}
          <div className="pt-3 mt-2 border-t border-rahmen flex flex-col gap-2">
            <button
              id="btn-execute-verschnaufpause"
              type="button"
              onClick={handleExecuteVerschnaufpause}
              className="w-full min-h-[42px] px-4 py-2 rounded-knopf bg-gold hover:bg-gold-hell active:scale-[0.99] text-seite font-bold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer select-none border border-gold"
            >
              <Sun size={17} className="text-gold" />
              <span>Verschnaufpause durchführen</span>
            </button>

            <div className="flex items-center justify-between text-xs px-0.5">
              <button
                type="button"
                onClick={() => setActiveModal('verschnaufpause')}
                className="text-leise hover:text-gold-hell flex items-center gap-1 font-medium transition-colors hover:underline cursor-pointer py-1"
              >
                <Settings size={13} className="text-gold" />
                <span>Optionen anpassen</span>
              </button>

              {!isVpDefault && (
                <button
                  type="button"
                  onClick={resetVpToDefault}
                  className="text-schaden hover:text-schaden flex items-center gap-1 font-bold text-[11px] hover:underline cursor-pointer py-1"
                  title="Auf berechnete Regelwerte zurücksetzen"
                >
                  <RotateCcw size={12} />
                  <span>Standardwerte wiederherstellen</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── CARD 2: RUHEPHASE ── */}
        <div
          id="ruhephase-card"
          className="rounded-karte border border-rahmen bg-erhoeht p-4 flex flex-col justify-between hover:border-gold transition-all relative"
        >
          <div className="space-y-2">
            {/* Top row: Title + Duration */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-knopf bg-erhoeht text-schrift border border-rahmen shadow-2xs">
                  <Moon size={18} className="text-schrift" />
                </div>
                <div>
                  <h4 className="font-bold text-base text-gold-hell fantasy-font">
                    Ruhephase
                  </h4>
                  <div className="flex items-center gap-1.5 text-xs mt-0.5">
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-knopf bg-erhoeht text-schrift tabular-nums font-bold text-xs border border-rahmen">
                      <Clock size={12} className="text-gold shrink-0" />
                      <span>{ruhephaseDuration}</span>
                    </span>
                    {hasSegenMondkraft && (
                      <span className="text-[11px] px-1.5 py-0.5 rounded-knopf bg-rahmen text-schrift font-bold border border-rahmen">
                        Mondsegen
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Status or preview badges */}
              <div className="flex items-center gap-1.5">
                {!isRuhephaseDefault && (
                  <span className="text-[11px] px-2 py-0.5 rounded-full font-bold bg-erhoeht text-gold border border-rahmen shadow-2xs">
                    Angepasst
                  </span>
                )}
                <span className="text-xs font-bold tabular-nums px-2 py-0.5 rounded-knopf bg-erhoeht text-schrift border border-rahmen shadow-2xs">
                  +{customLP} LP · +{customFO} FO
                </span>
              </div>
            </div>

            {/* Effect in 1 sentence */}
            <p className="text-xs text-schrift leading-relaxed min-h-[36px]">
              Heilt zusätzlich echten Schaden &amp; verzehrten Fokus, baut Erschöpfung komplett ab.
            </p>
          </div>

          {/* Action Row */}
          <div className="pt-3 mt-2 border-t border-rahmen flex flex-col gap-2">
            <button
              id="btn-execute-ruhephase"
              type="button"
              onClick={handleExecuteRuhephase}
              className="w-full min-h-[42px] px-4 py-2 rounded-knopf bg-gold hover:bg-gold-hell active:scale-[0.99] text-seite font-bold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer select-none border border-gold"
            >
              <Moon size={17} className="text-gold" />
              <span>Ruhephase durchführen</span>
            </button>

            <div className="flex items-center justify-between text-xs px-0.5">
              <button
                type="button"
                onClick={() => setActiveModal('ruhephase')}
                className="text-leise hover:text-gold-hell flex items-center gap-1 font-medium transition-colors hover:underline cursor-pointer py-1"
              >
                <Settings size={13} className="text-gold" />
                <span>Optionen anpassen</span>
              </button>

              {!isRuhephaseDefault && (
                <button
                  type="button"
                  onClick={resetRuhephaseToDefault}
                  className="text-schaden hover:text-schaden flex items-center gap-1 font-bold text-[11px] hover:underline cursor-pointer py-1"
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
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-seite/80 animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget) setActiveModal(null);
          }}
        >
          <div
            id="rest-options-modal-card"
            className="bg-flaeche text-schrift w-full max-w-lg rounded-karte shadow-2xl border border-rahmen overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-150"
          >
            {/* Modal Header */}
            <div className="text-schrift p-4 flex items-center justify-between border-b border-gold">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-knopf bg-rahmen border border-rahmen">
                  {activeModal === 'verschnaufpause' ? (
                    <Sun size={20} className="text-gold" />
                  ) : (
                    <Moon size={20} className="text-gold" />
                  )}
                </div>
                <div>
                  <h4 className="font-bold text-base sm:text-lg fantasy-font">
                    {activeModal === 'verschnaufpause'
                      ? 'Optionen: Verschnaufpause'
                      : 'Optionen: Ruhephase'}
                  </h4>
                  <span className="text-xs text-schrift">
                    {activeModal === 'verschnaufpause'
                      ? `Verschnaufpause (${vpDuration})`
                      : `Ruhephase (${ruhephaseDuration})`}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="p-1.5 rounded-knopf text-schrift hover:text-schrift hover:bg-rahmen transition-colors cursor-pointer"
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
                  <div className="bg-erhoeht border border-rahmen rounded-knopf p-3 space-y-1.5 text-xs text-schrift">
                    <div className="flex items-center justify-between font-bold text-schrift">
                      <span>Regel-Grundlage:</span>
                      <span className="font-normal text-[11px] text-leise">Splittermond GRW S. 160</span>
                    </div>
                    <p className="leading-relaxed">
                      Dauer: <strong>{vpDuration}</strong> ununterbrochene Rast. Heilt allen Betäubungsschaden, stellt erschöpften Fokus wieder her und baut 1 Stufe <em>Erschöpft</em> ab.
                    </p>

                    {(hasSegenMondkraft || hasMeditation || hasDickschaedel) && (
                      <div className="pt-2 border-t border-rahmen space-y-1">
                        <span className="font-semibold text-schrift block text-[11px]">Aktive Besonderheiten:</span>
                        <div className="flex flex-wrap gap-1.5">
                          {hasSegenMondkraft && (
                            <span className="px-2 py-0.5 rounded-knopf bg-rahmen text-schrift font-bold border border-rahmen text-[11px]">
                              Mondsegen: 15 Min statt 30 Min
                            </span>
                          )}
                          {hasMeditation && (
                            <span className="px-2 py-0.5 rounded-knopf bg-kanalisiert-grund text-kanalisiert border border-kanalisiert text-[11px] font-semibold">
                              Meditation (T1): Fokus in 10 Min
                            </span>
                          )}
                          {hasDickschaedel && (
                            <span className="px-2 py-0.5 rounded-knopf bg-unverletzt-grund text-unverletzt border border-unverletzt text-[11px] font-semibold">
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
                    <div className="bg-flaeche rounded-knopf border border-rahmen p-3 space-y-2 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-schrift flex items-center gap-1.5">
                          <Heart size={15} className="text-schaden" />
                          <span>Betäubungsschaden (LP)</span>
                        </span>
                        <label className="flex items-center gap-1.5 text-xs text-schrift cursor-pointer select-none font-semibold">
                          <input
                            type="checkbox"
                            checked={vpHealAllStun}
                            onChange={(e) => setVpHealAllStun(e.target.checked)}
                            className="rounded-knopf border-rahmen text-unverletzt focus:ring-unverletzt"
                          />
                          <span>Komplett heilen</span>
                        </label>
                      </div>

                      {!vpHealAllStun && (
                        <div className="flex items-center justify-between pt-1 border-t border-rahmen">
                          <span className="text-xs text-leise">Maximal zu heilende LP:</span>
                          <div className="flex items-center rounded-knopf border border-rahmen bg-erhoeht overflow-hidden h-7">
                            <button
                              type="button"
                              onClick={() => setVpStunAmount((prev) => Math.max(0, prev - 1))}
                              className="w-7 h-full hover:bg-rahmen text-schrift font-bold flex items-center justify-center transition-colors"
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
                              className="w-12 h-full text-center font-bold text-xs text-schrift bg-transparent border-0 outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => setVpStunAmount((prev) => prev + 1)}
                              className="w-7 h-full hover:bg-rahmen text-schrift font-bold flex items-center justify-center transition-colors"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      )}
                      <p className="text-[11px] text-leise">
                        {vpHealAllStun
                          ? 'Entfernt sämtlichen Betäubungsschaden (Gelb ✕ / Blau /) aus der Schadensleiste.'
                          : `Heilt maximal ${vpStunAmount} Punkte Betäubungsschaden.`}
                      </p>
                    </div>

                    {/* Erschöpfter Fokus */}
                    <div className="bg-flaeche rounded-knopf border border-rahmen p-3 space-y-2 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-schrift flex items-center gap-1.5">
                          <Sparkles size={15} className="text-kanalisiert" />
                          <span>Erschöpfter Fokus (FO)</span>
                        </span>
                        <label className="flex items-center gap-1.5 text-xs text-schrift cursor-pointer select-none font-semibold">
                          <input
                            type="checkbox"
                            checked={vpHealAllFocus}
                            onChange={(e) => setVpHealAllFocus(e.target.checked)}
                            className="rounded-knopf border-rahmen text-unverletzt focus:ring-unverletzt"
                          />
                          <span>Komplett heilen</span>
                        </label>
                      </div>

                      {!vpHealAllFocus && (
                        <div className="flex items-center justify-between pt-1 border-t border-rahmen">
                          <span className="text-xs text-leise">Maximal zu heilender FO:</span>
                          <div className="flex items-center rounded-knopf border border-rahmen bg-erhoeht overflow-hidden h-7">
                            <button
                              type="button"
                              onClick={() => setVpFocusAmount((prev) => Math.max(0, prev - 1))}
                              className="w-7 h-full hover:bg-rahmen text-schrift font-bold flex items-center justify-center transition-colors"
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
                              className="w-12 h-full text-center font-bold text-xs text-schrift bg-transparent border-0 outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => setVpFocusAmount((prev) => prev + 1)}
                              className="w-7 h-full hover:bg-rahmen text-schrift font-bold flex items-center justify-center transition-colors"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      )}
                      <p className="text-[11px] text-leise">
                        {vpHealAllFocus
                          ? 'Stellt sämtlichen erschöpften Fokus wieder her & beendet kanalisierte Zauber.'
                          : `Stellt maximal ${vpFocusAmount} Punkte erschöpften Fokus wieder her.`}
                      </p>
                    </div>

                    {/* Erschöpfung & Zustände */}
                    <div className="bg-flaeche rounded-knopf border border-rahmen p-3 space-y-2.5 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-schrift text-xs">Erschöpfung abbauen:</span>
                        <div className="flex items-center rounded-knopf border border-rahmen bg-erhoeht overflow-hidden h-7">
                          <button
                            type="button"
                            onClick={() => setVpExhaustReduction((prev) => Math.max(0, prev - 1))}
                            className="w-7 h-full hover:bg-rahmen text-schrift font-bold flex items-center justify-center transition-colors"
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
                            className="w-12 h-full text-center font-bold text-xs text-schrift bg-transparent border-0 outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => setVpExhaustReduction((prev) => prev + 1)}
                            className="w-7 h-full hover:bg-rahmen text-schrift font-bold flex items-center justify-center transition-colors"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-rahmen">
                        <label className="flex items-center gap-2 text-xs text-schrift cursor-pointer select-none font-semibold">
                          <input
                            type="checkbox"
                            checked={vpRemoveConditions}
                            onChange={(e) => setVpRemoveConditions(e.target.checked)}
                            className="rounded-knopf border-rahmen text-unverletzt focus:ring-unverletzt"
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
                  <div className="bg-erhoeht border border-rahmen rounded-knopf p-3 space-y-2 text-xs text-schrift">
                    <div className="flex items-center justify-between font-bold text-schrift">
                      <span>Berechnungsgrundlage (Regel-Standard):</span>
                      <span className="font-normal text-[11px] text-leise">Splittermond GRW S. 160</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
                      <div className="p-2 rounded-knopf bg-flaeche border border-rahmen">
                        <div className="font-bold text-schaden">Lebenspunkte (LP):</div>
                        <div className="tabular-nums text-[11px] mt-0.5 text-schrift">
                          {hasDahinsiechen
                            ? '0 LP (Dahinsiechen)'
                            : `KON (${kon}) × ${lpMultiplier}${hasSchnellAufBeinen ? ' + 1' : ''}${hasGesunderGeist ? ' + 1' : ''} = ${calculatedLPDefault} LP`}
                        </div>
                      </div>

                      <div className="p-2 rounded-knopf bg-flaeche border border-rahmen">
                        <div className="font-bold text-schrift">Fokuspool (FO):</div>
                        <div className="tabular-nums text-[11px] mt-0.5 text-schrift">
                          {`WIL (${wil}) × ${foMultiplier} = ${calculatedFODefault} FO`}
                        </div>
                      </div>
                    </div>

                    {/* Active Modifiers info */}
                    {(hasErhoehteLPRegen || hasErhoehteFORegen || hasSchnellAufBeinen || hasGesunderGeist || hasDahinsiechen) && (
                      <div className="pt-2 border-t border-rahmen space-y-1">
                        <span className="font-semibold text-schrift block text-[11px]">Berücksichtigte Modifikatoren:</span>
                        <div className="flex flex-wrap gap-1.5 text-[11px]">
                          {hasErhoehteLPRegen && (
                            <span className="px-2 py-0.5 rounded-knopf bg-unverletzt-grund text-unverletzt font-semibold border border-unverletzt">
                              Stärke: Erhöhte Lebensregeneration (×3)
                            </span>
                          )}
                          {hasErhoehteFORegen && (
                            <span className="px-2 py-0.5 rounded-knopf bg-unverletzt-grund text-unverletzt font-semibold border border-unverletzt">
                              Stärke: Erhöhte Fokusregeneration (×3)
                            </span>
                          )}
                          {hasSchnellAufBeinen && (
                            <span className="px-2 py-0.5 rounded-knopf bg-kanalisiert-grund text-kanalisiert font-semibold border border-kanalisiert">
                              Meisterschaft: Schnell wieder auf den Beinen (+1 LP)
                            </span>
                          )}
                          {hasGesunderGeist && (
                            <span className="px-2 py-0.5 rounded-knopf bg-kanalisiert-grund text-kanalisiert font-semibold border border-kanalisiert">
                              Meisterschaft: Gesunder Geist in gesundem Körper (+1 LP)
                            </span>
                          )}
                          {hasDahinsiechen && (
                            <span className="px-2 py-0.5 rounded-knopf bg-schaden-grund text-schaden font-semibold border border-schaden">
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
                    <div className="bg-flaeche rounded-knopf border border-rahmen p-3 space-y-2 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <label className="font-bold text-schrift text-xs flex items-center gap-1">
                          <Heart size={14} className="text-gold" />
                          <span>Zu heilende LP:</span>
                        </label>
                        <span className="text-[11px] text-leise font-medium">
                          Std: {calculatedLPDefault}
                        </span>
                      </div>

                      <div className="flex items-center rounded-knopf border border-rahmen bg-flaeche overflow-hidden h-9">
                        <button
                          type="button"
                          onClick={() => setCustomLP((prev) => Math.max(0, prev - 1))}
                          className="w-9 h-full hover:bg-rahmen text-schrift font-bold flex items-center justify-center transition-colors cursor-pointer"
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
                          className="flex-1 h-full text-center font-bold text-sm text-schrift bg-transparent border-0 outline-none tabular-nums"
                        />
                        <button
                          type="button"
                          onClick={() => setCustomLP((prev) => prev + 1)}
                          className="w-9 h-full hover:bg-rahmen text-schrift font-bold flex items-center justify-center transition-colors cursor-pointer"
                        >
                          +
                        </button>
                      </div>
                      <p className="text-[11px] text-leise">
                        Heilt echten Schaden (Verzehrt ■ / Schrägstrich).
                      </p>
                    </div>

                    {/* FO Input */}
                    <div className="bg-flaeche rounded-knopf border border-rahmen p-3 space-y-2 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <label className="font-bold text-schrift text-xs flex items-center gap-1">
                          <Sparkles size={14} className="text-schrift" />
                          <span>Zu heilender FO:</span>
                        </label>
                        <span className="text-[11px] text-leise font-medium">
                          Std: {calculatedFODefault}
                        </span>
                      </div>

                      <div className="flex items-center rounded-knopf border border-rahmen bg-flaeche overflow-hidden h-9">
                        <button
                          type="button"
                          onClick={() => setCustomFO((prev) => Math.max(0, prev - 1))}
                          className="w-9 h-full hover:bg-flaeche text-schrift font-bold flex items-center justify-center transition-colors cursor-pointer"
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
                          className="flex-1 h-full text-center font-bold text-sm text-schrift bg-transparent border-0 outline-none tabular-nums"
                        />
                        <button
                          type="button"
                          onClick={() => setCustomFO((prev) => prev + 1)}
                          className="w-9 h-full hover:bg-flaeche text-schrift font-bold flex items-center justify-center transition-colors cursor-pointer"
                        >
                          +
                        </button>
                      </div>
                      <p className="text-[11px] text-leise">
                        Regeneriert verzehrten Fokus.
                      </p>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3.5 sm:p-4 bg-erhoeht border-t border-rahmen flex flex-wrap items-center justify-between gap-2.5">
              {/* Reset to standard button (only if modified) */}
              <div>
                {activeModal === 'verschnaufpause' && !isVpDefault && (
                  <button
                    type="button"
                    onClick={resetVpToDefault}
                    className="text-schaden hover:text-schaden flex items-center gap-1.5 font-bold text-xs hover:underline cursor-pointer py-1"
                  >
                    <RotateCcw size={13} />
                    <span>Standardwerte wiederherstellen</span>
                  </button>
                )}

                {activeModal === 'ruhephase' && !isRuhephaseDefault && (
                  <button
                    type="button"
                    onClick={resetRuhephaseToDefault}
                    className="text-schaden hover:text-schaden flex items-center gap-1.5 font-bold text-xs hover:underline cursor-pointer py-1"
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
                  className="min-h-11 px-3.5 py-2 rounded-knopf border border-rahmen bg-flaeche hover:bg-rahmen text-schrift font-bold text-xs transition-colors cursor-pointer"
                >
                  Übernehmen &amp; Schließen
                </button>

                {activeModal === 'verschnaufpause' ? (
                  <button
                    type="button"
                    onClick={handleExecuteVerschnaufpause}
                    className="min-h-11 px-4 py-2 rounded-knopf bg-gold hover:bg-gold-hell text-seite font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer border border-gold"
                  >
                    <Sun size={14} className="text-gold" />
                    <span>Jetzt durchführen</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleExecuteRuhephase}
                    className="min-h-11 px-4 py-2 rounded-knopf bg-gold hover:bg-gold-hell text-seite font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer border border-gold"
                  >
                    <Moon size={14} className="text-gold" />
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
