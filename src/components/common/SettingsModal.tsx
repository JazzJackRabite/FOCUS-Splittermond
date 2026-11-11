import React, { useState, useEffect } from 'react';
import {
  X,
  Settings,
  Sliders,
  Info,
  ShieldCheck,
  BookOpen,
} from 'lucide-react';
import { RegelpaketeTab } from './RegelpaketeTab';

interface SettingsModalProps {
  onClose: () => void;
}

type SettingsTab = 'general' | 'regelpakete' | 'info';

export const SettingsModal: React.FC<SettingsModalProps> = ({
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/70 backdrop-blur-xs overflow-y-auto no-print"
      onClick={onClose}
    >
      <div
        className="bg-[#faf4e6] dark-theme-panel rounded-xl shadow-2xl border-2 border-[#C5A059] max-w-2xl w-full p-4 sm:p-6 relative max-h-[90vh] flex flex-col my-auto overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-modal-title"
      >
        {/* Header with Title, Mode Switch Button without text, and Close Button */}
        <div className="flex items-center justify-between border-b border-[#C5A059] pb-3 mb-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-[#1B365D] text-[#C5A059]">
              <Settings size={22} />
            </div>
            <div>
              <h2
                id="settings-modal-title"
                className="text-xl sm:text-2xl font-bold fantasy-font text-[#1B365D]"
              >
                Einstellungen
              </h2>
              <p className="text-xs sm:text-sm text-gray-600">
                Datenspeicherung, Regelpakete und Informationen zur App.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-gray-500 hover:text-[#1B365D] rounded-lg hover:bg-black/5 transition-colors cursor-pointer"
              aria-label="Schließen"
            >
              <X size={22} />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-[#d1c4b0] mb-4 gap-1 shrink-0 overflow-x-auto custom-scrollbar">
          <button
            type="button"
            onClick={() => setActiveTab('general')}
            className={`shrink-0 whitespace-nowrap px-3 sm:px-4 py-2 text-xs sm:text-sm font-bold flex items-center gap-2 rounded-t-lg transition-colors cursor-pointer ${
              activeTab === 'general'
                ? 'bg-[#1B365D] text-[#f3e5cf] border-t-2 border-[#C5A059]'
                : 'text-gray-600 hover:text-[#1B365D] hover:bg-black/5'
            }`}
          >
            <Sliders size={16} />
            <span>Allgemein</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('regelpakete')}
            className={`shrink-0 whitespace-nowrap px-3 sm:px-4 py-2 text-xs sm:text-sm font-bold flex items-center gap-2 rounded-t-lg transition-colors cursor-pointer ${
              activeTab === 'regelpakete'
                ? 'bg-[#1B365D] text-[#f3e5cf] border-t-2 border-[#C5A059]'
                : 'text-gray-600 hover:text-[#1B365D] hover:bg-black/5'
            }`}
          >
            <BookOpen size={16} />
            <span>Regelpakete</span>
          </button>

          

          <button
            type="button"
            onClick={() => setActiveTab('info')}
            className={`shrink-0 whitespace-nowrap px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold flex items-center gap-2 rounded-t-lg transition-colors cursor-pointer ${
              activeTab === 'info'
                ? 'bg-[#1B365D] text-[#f3e5cf] border-t-2 border-[#C5A059]'
                : 'text-gray-500 hover:text-gray-800 hover:bg-black/5'
            }`}
          >
            <Info size={16} />
            <span>Info</span>
          </button>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* Tab 1: Allgemein */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'general' && (
          <div className="overflow-y-auto space-y-4 pr-1.5 flex-1 custom-scrollbar modal-body-scroll">
            <div className="bg-white/70 p-4 rounded-xl border border-[#d1c4b0]">
              <h3 className="font-bold text-sm text-[#1B365D] mb-1">
                Lokale Datenspeicherung
              </h3>
              <p className="text-xs text-gray-600 leading-relaxed">
                Deine Helden und Charakterzustände werden automatisch im lokalen Browser-Speicher gesichert.
                Hochgeladene Regelpakete bleiben ebenfalls nur in diesem Browser (Reiter <strong>Regelpakete</strong>).
              </p>
            </div>
          </div>
        )}

        {activeTab === 'regelpakete' && <RegelpaketeTab />}

        {/* ------------------------------------------------------------- */}
        {/* Tab 3: Info */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'info' && (
          <div className="overflow-y-auto space-y-4 pr-1.5 flex-1 custom-scrollbar modal-body-scroll">
            <div className="p-6 rounded-xl border border-dashed border-[#C5A059] bg-white/60 text-center py-8">
              <div className="mx-auto w-12 h-12 rounded-full bg-[#1B365D]/10 flex items-center justify-center text-[#1B365D] mb-3">
                <ShieldCheck size={24} />
              </div>
              <h3 className="font-bold text-base sm:text-lg text-[#1B365D] mb-1">
                Splittermond Charaktergenerator
              </h3>
              <p className="text-xs sm:text-sm text-gray-600 max-w-md mx-auto mb-3">
                Offizielles Regelsystem basierend auf dem Splittermond Grundregelwerk (Uhrwerk Verlag) mit Unterstützung für Zauber, Meisterschaften, Steigerung, Gesundheit/Fokus-Verwaltung und Würfelproben.
              </p>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#C5A059]/15 border border-[#C5A059]/40 text-xs text-[#1B365D] font-bold">
                Version 1.2 · Modulares Regelsystem
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 mt-3 border-t border-[#C5A059] shrink-0">
          <span />
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-[#1B365D] hover:bg-[#2c4b7a] text-white text-xs sm:text-sm font-bold rounded-lg transition-colors cursor-pointer"
          >
            Fertig
          </button>
        </div>

      </div>
    </div>
  );
};
