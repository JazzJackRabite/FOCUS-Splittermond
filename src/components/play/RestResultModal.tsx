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
      className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="rest-result-modal-card"
        className="bg-[#faf6ee] dark-theme-panel text-[#1B365D] w-full max-w-md rounded-2xl shadow-2xl border-2 border-[#C5A059] overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-[#1B365D] via-[#2A4D7F] to-[#1B365D] text-white p-5 flex items-center justify-between border-b border-[#C5A059]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-white/10 backdrop-blur-xs border border-[#C5A059]/40">
              {isVp ? (
                <Sun size={24} className="text-[#C5A059] animate-spin-slow" />
              ) : (
                <Moon size={24} className="text-[#C5A059]" />
              )}
            </div>
            <div>
              <h2 className="text-lg font-bold fantasy-font tracking-wide flex items-center gap-2">
                {data.title}
              </h2>
              <p className="text-xs text-[#f3e5cf] font-medium">{data.durationText}</p>
            </div>
          </div>
          <button
            id="close-rest-result-modal-btn"
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/15 transition-colors"
            title="Schließen"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4 overflow-y-auto custom-scroll modal-body-scroll flex-1">
          {/* Main Success Note */}
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-white/90 border border-[#e2d5c3] shadow-xs">
            <CheckCircle2 size={20} className={isVp ? 'text-[#C5A059] shrink-0 mt-0.5' : 'text-[#1B365D] shrink-0 mt-0.5'} />
            <div className="text-xs text-stone-700 leading-relaxed font-medium">
              {data.summary}
            </div>
          </div>

          {/* Regenerated Points Details */}
          <div>
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-2 flex items-center gap-1.5">
              <Sparkles size={13} className="text-[#C5A059]" />
              Regenerierte Werte &amp; Effekte
            </h4>
            <div className="grid grid-cols-1 gap-2">
              {data.details.map((item, idx) => {
                let icon = <CheckCircle2 size={16} className="text-stone-500" />;
                let badgeClass = 'bg-[#f3e5cf] text-stone-800 border-[#d1c4b0]';

                if (item.type === 'hp') {
                  icon = <Heart size={16} className="text-[#8B263E]" />;
                  badgeClass = 'bg-[#8B263E]/10 text-[#8B263E] border-[#8B263E]/30 font-bold';
                } else if (item.type === 'fo') {
                  icon = <Sparkles size={16} className="text-[#1B365D]" />;
                  badgeClass = 'bg-[#1B365D]/10 text-[#1B365D] border-[#1B365D]/30 font-bold';
                } else if (item.type === 'exhaust') {
                  icon = <Zap size={16} className="text-[#C5A059]" />;
                  badgeClass = 'bg-[#C5A059]/15 text-[#6c5118] border-[#C5A059]/40 font-bold';
                } else if (item.type === 'condition') {
                  icon = <ShieldCheck size={16} className="text-[#1B365D]" />;
                  badgeClass = 'bg-[#1B365D]/10 text-[#1B365D] border-[#1B365D]/20 font-bold';
                }

                return (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-white border border-[#e8ded0] text-xs shadow-2xs"
                  >
                    <div className="flex items-center gap-2">
                      {icon}
                      <span className="text-stone-700 font-medium">{item.label}</span>
                    </div>
                    <span className={`px-2 py-0.5 rounded-md text-xs border ${badgeClass}`}>
                      {item.value}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-[#f3e9db] border-t border-[#e2d5c3] flex justify-end">
          <button
            id="confirm-rest-result-modal-btn"
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl font-bold text-sm text-white shadow-xs active:scale-98 transition-all flex items-center justify-center gap-2 bg-[#1B365D] hover:bg-[#2a4f7e] border border-[#10233f] cursor-pointer"
          >
            Verstanden
          </button>
        </div>
      </div>
    </div>
  );
};
