import React, { useState } from 'react';
import { Plus, Minus, Sparkles } from 'lucide-react';

interface XpAddModalProps {
  onClose: () => void;
  onAdd: (val: number, note?: string) => void;
}

export const XpAddModal: React.FC<XpAddModalProps> = ({ onClose, onAdd }) => {
  const [val, setVal] = useState(15);
  const [note, setNote] = useState('');

  const quickAmounts = [5, 10, 15, 20, 30, 50];

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (val <= 0) return;
    onAdd(val, note.trim() || undefined);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-3 sm:p-4">
      <div
        id="xp-add-modal-dialog"
        className="bg-[#faf4e6] dark-theme-panel rounded-xl border-2 border-[#C5A059] shadow-2xl max-w-md w-full max-h-[90vh] flex flex-col overflow-hidden"
      >
        <div className="px-5 py-4 border-b border-[#C5A059] flex items-center gap-2 shrink-0">
          <Sparkles className="w-5 h-5 text-[#C5A059]" />
          <h3 className="fantasy-font text-xl text-[#1B365D]">
            Erfahrungspunkte (EP) hinzufügen
          </h3>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4 custom-scrollbar modal-body-scroll">
            {/* Quick buttons */}
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">
                Schnellauswahl
              </label>
              <div className="grid grid-cols-6 gap-1.5">
                {quickAmounts.map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setVal(amt)}
                    className={`py-1.5 text-xs font-bold rounded-lg border transition-colors cursor-pointer ${
                      val === amt
                        ? 'bg-[#1B365D] text-[#f3e5cf] border-[#10233f] shadow-xs'
                        : 'bg-white text-[#1B365D] border-[#d1c4b0] hover:bg-[#f3e5cf]'
                    }`}
                  >
                    +{amt}
                  </button>
                ))}
              </div>
            </div>

            {/* Stepper Input */}
            <div className="flex flex-col items-center justify-center pt-2">
              <label className="text-xs font-bold text-gray-600 mb-2 uppercase tracking-wide">
                EP-Menge
              </label>
              <div className="flex items-center justify-center space-x-3">
                <button
                  type="button"
                  onClick={() => setVal(Math.max(1, val - 1))}
                  className="w-10 h-10 rounded-lg bg-[#f3e5cf] hover:bg-[#ebdcc4] active:scale-95 font-bold flex items-center justify-center text-[#1B365D] border border-[#d1c4b0] shadow-2xs touch-manipulation cursor-pointer transition-all"
                >
                  <Minus size={18} />
                </button>
                <input
                  type="number"
                  min="1"
                  value={val || ''}
                  onChange={(e) => setVal(parseInt(e.target.value, 10) || 0)}
                  className="w-24 text-center text-2xl font-bold bg-white border border-[#C5A059] rounded-lg p-2 text-[#1B365D] shadow-inner focus:outline-none focus:ring-2 focus:ring-[#C5A059]"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setVal(val + 1)}
                  className="w-10 h-10 rounded-lg bg-[#f3e5cf] hover:bg-[#ebdcc4] active:scale-95 font-bold flex items-center justify-center text-[#1B365D] border border-[#d1c4b0] shadow-2xs touch-manipulation cursor-pointer transition-all"
                >
                  <Plus size={18} />
                </button>
              </div>
            </div>

            {/* Note Input */}
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1 uppercase tracking-wide">
                Grund / Abenteuer-Notiz (optional)
              </label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="z. B. Abenteuer 1, Spielleiter-Bonus, Meilenstein"
                className="w-full bg-white border border-[#d1c4b0] rounded-lg p-2 text-sm text-[#2C1810] focus:outline-none focus:ring-2 focus:ring-[#C5A059]"
              />
            </div>
          </div>

          <div className="px-5 py-3.5 border-t border-[#C5A059]/40 bg-black/5 flex justify-end space-x-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-[#1B365D] hover:bg-[#ebdcc4] rounded-lg text-sm font-semibold transition-colors cursor-pointer"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={val <= 0}
              className="px-5 py-2 bg-[#1B365D] hover:bg-[#2a4f7e] text-white rounded-lg font-bold text-sm shadow-xs border border-[#10233f] disabled:opacity-50 transition-all cursor-pointer"
            >
              +{val} EP Hinzufügen
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
