import React, { useEffect } from 'react';
import { X, Sun, Moon, Heart, Sparkles, Zap, ShieldCheck, CheckCircle2 } from 'lucide-react';

export interface RestDetailItem {
  label: string;
  value: string;
  type?: 'hp' | 'fo' | 'exhaust' | 'condition' | 'info';
}

export interface RestResultModalData {
  restType: 'verschnaufpause' | 'ruhephase';
  title: string;
  durationText: string;
  summary: string;
  details: RestDetailItem[];
}

interface RestResultModalProps {
  data: RestResultModalData;
  onClose: () => void;
}

export const RestResultModal: React.FC<RestResultModalProps> = ({ data, onClose }) => {
  // Handle ESC / Enter key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Enter') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const isVp = data.restType === 'verschnaufpause';

  return (
    <div
      id="rest-result-modal-backdrop"
      className="fixed inset-0 bg-seite/80 flex items-center justify-center z-50 p-4 animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="rest-result-modal-card"
        className="bg-flaeche text-schrift w-full max-w-md rounded-karte shadow-2xl border border-rahmen overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header Banner */}
        <div className="text-schrift p-5 flex items-center justify-between border-b border-gold">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-karte bg-rahmen border border-rahmen">
              {isVp ? (
                <Sun size={24} className="text-gold animate-spin-slow" />
              ) : (
                <Moon size={24} className="text-gold" />
              )}
            </div>
            <div>
              <h2 className="text-lg font-bold fantasy-font tracking-wide flex items-center gap-2">
                {data.title}
              </h2>
              <p className="text-xs text-schrift font-medium">{data.durationText}</p>
            </div>
          </div>
          <button
            id="close-rest-result-modal-btn"
            onClick={onClose}
            className="min-h-11 min-w-11 inline-flex items-center justify-center rounded-knopf border border-rahmen bg-erhoeht text-schrift hover:border-gold transition-colors"
            title="Schließen" aria-label="Schließen"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4 overflow-y-auto custom-scroll modal-body-scroll flex-1">
          {/* Main Success Note */}
          <div className="flex items-start gap-2.5 p-3 rounded-karte bg-flaeche border border-rahmen ">
            <CheckCircle2 size={20} className={isVp ? 'text-gold shrink-0 mt-0.5' : 'text-schrift shrink-0 mt-0.5'} />
            <div className="text-xs text-schrift leading-relaxed font-medium">
              {data.summary}
            </div>
          </div>

          {/* Regenerated Points Details */}
          <div>
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-leise mb-2 flex items-center gap-1.5">
              <Sparkles size={13} className="text-gold" />
              Regenerierte Werte &amp; Effekte
            </h4>
            <div className="grid grid-cols-1 gap-2">
              {data.details.map((item, idx) => {
                let icon = <CheckCircle2 size={16} className="text-leise" />;
                let badgeClass = 'bg-erhoeht text-schrift border-rahmen';

                if (item.type === 'hp') {
                  icon = <Heart size={16} className="text-schaden" />;
                  badgeClass = 'bg-schaden-grund text-schaden border-magie font-bold';
                } else if (item.type === 'fo') {
                  icon = <Sparkles size={16} className="text-schrift" />;
                  badgeClass = 'bg-flaeche text-schrift border-rahmen font-bold';
                } else if (item.type === 'exhaust') {
                  icon = <Zap size={16} className="text-gold" />;
                  badgeClass = 'bg-erhoeht text-erschoepft border-rahmen font-bold';
                } else if (item.type === 'condition') {
                  icon = <ShieldCheck size={16} className="text-schrift" />;
                  badgeClass = 'bg-flaeche text-schrift border-rahmen font-bold';
                }

                return (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2.5 rounded-knopf bg-flaeche border border-rahmen text-xs shadow-2xs"
                  >
                    <div className="flex items-center gap-2">
                      {icon}
                      <span className="text-schrift font-medium">{item.label}</span>
                    </div>
                    <span className={`px-2 py-0.5 rounded-knopf text-xs border ${badgeClass}`}>
                      {item.value}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-erhoeht border-t border-rahmen flex justify-end">
          <button
            id="confirm-rest-result-modal-btn"
            onClick={onClose}
            className="min-h-11 w-full sm:w-auto px-6 py-2.5 rounded-karte font-bold text-sm text-schrift active:scale-98 transition-all flex items-center justify-center gap-2 bg-erhoeht hover:bg-rahmen border border-rahmen cursor-pointer"
          >
            Verstanden
          </button>
        </div>
      </div>
    </div>
  );
};
