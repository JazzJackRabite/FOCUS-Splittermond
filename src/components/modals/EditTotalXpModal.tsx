import React, { useState } from 'react';
import { Edit3, Plus, Minus, ArrowRight, Info, AlertTriangle } from 'lucide-react';

interface EditTotalXpModalProps {
  currentXpTotal: number;
  xpSpent: number;
  onClose: () => void;
  onSave: (newTotal: number, comment?: string) => void;
}

export const EditTotalXpModal: React.FC<EditTotalXpModalProps> = ({
  currentXpTotal,
  xpSpent,
  onClose,
  onSave,
}) => {
  const [newTotal, setNewTotal] = useState<number>(currentXpTotal);
  const [comment, setComment] = useState('');

  const delta = newTotal - currentXpTotal;
  const availableAfter = newTotal - xpSpent;

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isNaN(newTotal) || newTotal < 0) return;
    onSave(newTotal, comment.trim() || undefined);
    onClose();
  };

  const adjustBy = (amount: number) => {
    setNewTotal((prev) => Math.max(0, prev + amount));
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-3 sm:p-4">
      <div
        id="edit-total-xp-modal-dialog"
        className="bg-[#faf4e6] dark-theme-panel rounded-xl border-2 border-[#C5A059] shadow-2xl max-w-lg w-full max-h-[92vh] flex flex-col overflow-hidden"
      >
        <div className="px-5 py-4 border-b border-[#C5A059] flex items-center gap-2 shrink-0">
          <Edit3 className="w-5 h-5 text-[#C5A059]" />
          <h3 className="fantasy-font text-xl text-[#1B365D]">
            Gesamt-EP editieren
          </h3>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4 custom-scrollbar modal-body-scroll">
            {/* Current vs New comparison header */}
            <div className="grid grid-cols-2 gap-3 bg-[#f3e5cf]/60 p-3 rounded-lg border border-[#e3d4b9] text-xs">
              <div>
                <span className="text-gray-500 font-medium block">Bisherige Gesamt-EP:</span>
                <span className="text-base font-bold text-[#1B365D]">{currentXpTotal} EP</span>
              </div>
              <div>
                <span className="text-gray-500 font-medium block">Bereits ausgegeben:</span>
                <span className="text-base font-bold text-amber-800">{xpSpent} EP</span>
              </div>
            </div>

          {/* New Total XP Input & Stepper */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide">
              Neue Gesamt-EP festlegen
            </label>
            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => adjustBy(-10)}
                className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-[#ebdcc4] border border-[#d1c4b0] text-xs font-bold text-[#1B365D] transition shadow-2xs cursor-pointer"
                title="-10 EP"
              >
                -10
              </button>
              <button
                type="button"
                onClick={() => adjustBy(-1)}
                className="p-1.5 rounded-lg bg-white hover:bg-[#ebdcc4] border border-[#d1c4b0] text-[#1B365D] transition shadow-2xs cursor-pointer"
                title="-1 EP"
              >
                <Minus size={16} />
              </button>
              <input
                type="number"
                min={0}
                value={isNaN(newTotal) ? '' : newTotal}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  setNewTotal(isNaN(val) ? 0 : Math.max(0, val));
                }}
                className="w-28 text-center text-2xl font-bold bg-white text-[#1B365D] border-2 border-[#C5A059] rounded-lg py-1 shadow-inner focus:outline-none focus:ring-2 focus:ring-[#1B365D]"
                autoFocus
              />
              <button
                type="button"
                onClick={() => adjustBy(1)}
                className="p-1.5 rounded-lg bg-white hover:bg-[#ebdcc4] border border-[#d1c4b0] text-[#1B365D] transition shadow-2xs cursor-pointer"
                title="+1 EP"
              >
                <Plus size={16} />
              </button>
              <button
                type="button"
                onClick={() => adjustBy(10)}
                className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-[#ebdcc4] border border-[#d1c4b0] text-xs font-bold text-[#1B365D] transition shadow-2xs cursor-pointer"
                title="+10 EP"
              >
                +10
              </button>
            </div>
          </div>

          {/* Impact preview */}
          <div className="p-3 bg-white/80 rounded-lg border border-[#d1c4b0] space-y-1.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Differenz zur bisherigen Gesamt-EP:</span>
              <span
                className={`font-bold text-sm px-2 py-0.5 rounded border ${
                  delta > 0
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                    : delta < 0
                    ? 'bg-[#C5A059]/20 text-[#1B365D] border-[#C5A059]/40'
                    : 'bg-stone-100 text-stone-700 border-stone-300'
                }`}
              >
                {delta > 0 ? `+${delta}` : delta} EP
              </span>
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-[#d1c4b0]/40">
              <span className="text-gray-600">Verfügbare EP nach Korrektur:</span>
              <span
                className={`font-bold font-mono ${
                  availableAfter < 0 ? 'text-[#1B365D]' : 'text-emerald-700'
                }`}
              >
                {availableAfter} EP
              </span>
            </div>

            {availableAfter < 0 && (
              <div className="flex items-start gap-1.5 mt-2 p-2 bg-[#f3e5cf] rounded-lg border border-[#C5A059] text-[#1B365D] text-[11px] font-semibold">
                <AlertTriangle size={14} className="shrink-0 text-[#C5A059] mt-0.5" />
                <span>
                  Achtung: Die neue Gesamt-EP liegt unter den bisher ausgegebenen EP ({xpSpent} EP). Verfügbar sind rechnerisch {availableAfter} EP.
                </span>
              </div>
            )}
          </div>

          {/* Comment / Reason field */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wide">
              Kommentar / Begründung (wird im Protokoll angezeigt)
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="z. B. Spielleiter-Korrektur, Rechenfehler behoben, Kampagnen-Bonus..."
              rows={2}
              className="w-full bg-white border border-[#d1c4b0] rounded-lg p-2.5 text-sm text-[#2C1810] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#C5A059]"
            />
          </div>

          {/* Notice */}
          <div className="flex items-start gap-2 text-xs text-stone-600 bg-[#f3e5cf]/40 p-2.5 rounded-lg border border-[#e3d4b9]">
            <Info size={15} className="shrink-0 text-[#C5A059] mt-0.5" />
            <span>
              Diese Korrektur wird mit Zeitstempel, der Differenz von <strong>{delta > 0 ? `+${delta}` : delta} EP</strong> und deinem Kommentar im Steigerungsprotokoll festgehalten.
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="px-5 py-3.5 border-t border-[#C5A059]/40 bg-black/5 flex justify-end space-x-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-[#1B365D] hover:bg-[#ebdcc4] rounded-lg text-sm font-semibold transition cursor-pointer"
          >
            Abbrechen
          </button>
          <button
            type="submit"
            disabled={isNaN(newTotal) || newTotal < 0}
            className="px-5 py-2 bg-[#1B365D] hover:bg-[#2a4f7e] text-white rounded-lg font-bold text-sm shadow-xs border border-[#10233f] disabled:opacity-50 transition cursor-pointer flex items-center gap-1.5"
          >
            <span>Korrektur speichern</span>
            <ArrowRight size={15} />
          </button>
        </div>
      </form>
    </div>
  </div>
  );
};
