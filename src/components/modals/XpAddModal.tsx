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
    <div className="fixed inset-0 bg-seite/80 flex items-center justify-center z-50 p-3 sm:p-4">
      <div
        id="xp-add-modal-dialog"
        className="bg-flaeche rounded-karte border border-rahmen shadow-2xl max-w-md w-full max-h-[90vh] flex flex-col overflow-hidden"
      >
        <div className="px-5 py-4 border-b border-gold flex items-center gap-2 shrink-0">
          <Sparkles className="w-5 h-5 text-gold" />
          <h3 className="fantasy-font text-[17px] font-bold text-gold-hell">
            Erfahrungspunkte (EP) hinzufügen
          </h3>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4 custom-scrollbar modal-body-scroll">
            {/* Quick buttons */}
            <div>
              <label className="block text-xs font-bold text-leise mb-1.5 uppercase tracking-wide">
                Schnellauswahl
              </label>
              <div className="grid grid-cols-6 gap-1.5">
                {quickAmounts.map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setVal(amt)}
                    className={`py-1.5 text-xs font-bold rounded-knopf border transition-colors cursor-pointer ${
                      val === amt
                        ? 'bg-erhoeht text-schrift border-rahmen '
                        : 'bg-flaeche text-schrift border-rahmen hover:bg-rahmen'
                    }`}
                  >
                    +{amt}
                  </button>
                ))}
              </div>
            </div>

            {/* Stepper Input */}
            <div className="flex flex-col items-center justify-center pt-2">
              <label className="text-xs font-bold text-leise mb-2 uppercase tracking-wide">
                EP-Menge
              </label>
              <div className="flex items-center justify-center space-x-3">
                <button
                  type="button"
                  onClick={() => setVal(Math.max(1, val - 1))}
                  className="w-10 h-10 rounded-knopf bg-erhoeht hover:bg-rahmen active:scale-95 font-bold flex items-center justify-center text-schrift border border-rahmen touch-manipulation cursor-pointer transition-all"
                >
                  <Minus size={18} />
                </button>
                <input
                  type="number"
                  min="1"
                  value={val || ''}
                  onChange={(e) => setVal(parseInt(e.target.value, 10) || 0)}
                  className="w-24 text-center text-2xl font-bold bg-flaeche border border-gold rounded-knopf p-2 text-schrift focus:outline-none focus:ring-2 focus:ring-gold"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setVal(val + 1)}
                  className="w-10 h-10 rounded-knopf bg-erhoeht hover:bg-rahmen active:scale-95 font-bold flex items-center justify-center text-schrift border border-rahmen touch-manipulation cursor-pointer transition-all"
                >
                  <Plus size={18} />
                </button>
              </div>
            </div>

            {/* Note Input */}
            <div>
              <label className="block text-xs font-bold text-leise mb-1 uppercase tracking-wide">
                Grund / Abenteuer-Notiz (optional)
              </label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="z. B. Abenteuer 1, Spielleiter-Bonus, Meilenstein"
                className="w-full bg-flaeche border border-rahmen rounded-knopf p-2 text-sm text-schrift focus:outline-none focus:ring-2 focus:ring-gold"
              />
            </div>
          </div>

          <div className="px-5 py-3.5 border-t border-rahmen bg-black/5 flex justify-end space-x-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="min-h-11 px-4 py-2 text-schrift hover:bg-rahmen rounded-knopf text-sm font-semibold transition-colors cursor-pointer"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={val <= 0}
              className="min-h-11 px-5 py-2 bg-gold hover:bg-gold-hell text-seite rounded-knopf font-bold text-sm border border-gold disabled:opacity-50 transition-all cursor-pointer"
            >
              +{val} EP Hinzufügen
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
