import { setzeHausregeln, useHausregeln } from '../../fundament/hausregeln';
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
  const hausregeln = useHausregeln();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/70 overflow-y-auto no-print"
      onClick={onClose}
    >
      <div
        className="bg-flaeche rounded-karte shadow-2xl border border-rahmen max-w-2xl w-full p-4 sm:p-6 relative max-h-[90vh] flex flex-col my-auto overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-modal-title"
      >
        {/* Header with Title, Mode Switch Button without text, and Close Button */}
        <div className="flex items-center justify-between border-b border-gold pb-3 mb-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-knopf bg-erhoeht text-gold">
              <Settings size={22} />
            </div>
            <div>
              <h2
                id="settings-modal-title"
                className="text-xl sm:text-2xl font-bold fantasy-font text-gold-hell"
              >
                Einstellungen
              </h2>
              <p className="text-xs sm:text-sm text-leise">
                Datenspeicherung, Regelpakete und Informationen zur App.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-leise hover:text-gold-hell rounded-knopf hover:bg-black/5 transition-colors cursor-pointer"
              aria-label="Schließen"
            >
              <X size={22} />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-rahmen mb-4 gap-1 shrink-0 overflow-x-auto custom-scrollbar">
          <button
            type="button"
            onClick={() => setActiveTab('general')}
            className={`shrink-0 whitespace-nowrap px-3 sm:px-4 py-2 text-xs sm:text-sm font-bold flex items-center gap-2 rounded-t-knopf transition-colors cursor-pointer ${
              activeTab === 'general'
                ? 'bg-erhoeht text-schrift border-t-2 border-gold'
                : 'text-leise hover:text-gold-hell hover:bg-black/5'
            }`}
          >
            <Sliders size={16} />
            <span>Allgemein</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('regelpakete')}
            className={`shrink-0 whitespace-nowrap px-3 sm:px-4 py-2 text-xs sm:text-sm font-bold flex items-center gap-2 rounded-t-knopf transition-colors cursor-pointer ${
              activeTab === 'regelpakete'
                ? 'bg-erhoeht text-schrift border-t-2 border-gold'
                : 'text-leise hover:text-gold-hell hover:bg-black/5'
            }`}
          >
            <BookOpen size={16} />
            <span>Regelpakete</span>
          </button>

          

          <button
            type="button"
            onClick={() => setActiveTab('info')}
            className={`shrink-0 whitespace-nowrap px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold flex items-center gap-2 rounded-t-knopf transition-colors cursor-pointer ${
              activeTab === 'info'
                ? 'bg-erhoeht text-schrift border-t-2 border-gold'
                : 'text-leise hover:text-schrift hover:bg-black/5'
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
            <div className="bg-flaeche p-4 rounded-karte border border-rahmen">
              <h3 className="font-bold text-sm text-gold-hell mb-1">
                Lokale Datenspeicherung
              </h3>
              <p className="text-xs text-leise leading-relaxed">
                Deine Helden und Charakterzustände werden automatisch im lokalen Browser-Speicher gesichert.
                Hochgeladene Regelpakete bleiben ebenfalls nur in diesem Browser (Reiter <strong>Regelpakete</strong>).
              </p>
            </div>
            <div className="bg-erhoeht p-4 rounded-karte border border-rahmen">
              <label className="flex items-start gap-3 cursor-pointer min-h-11">
                <input
                  type="checkbox"
                  className="mt-1 h-5 w-5 accent-gold cursor-pointer"
                  checked={hausregeln}
                  onChange={(e) => setzeHausregeln(e.target.checked)}
                />
                <span>
                  <span className="block font-bold text-sm text-schrift">Hausregeln erlauben</span>
                  <span className="block text-xs text-leise leading-relaxed">
                    Aus: Der Editor sperrt Eingaben, die gegen die Regeln verstoßen (zu wenig Erfahrungspunkte, Grenzen
                    des Heldengrads, nicht erfüllte Voraussetzungen). An: Solche Eingaben sind möglich; der Editor
                    zeigt nur eine Warnung.
                  </span>
                </span>
              </label>
            </div>
          </div>
        )}

        {activeTab === 'regelpakete' && <RegelpaketeTab />}

        {/* ------------------------------------------------------------- */}
        {/* Tab 3: Info */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'info' && (
          <div className="overflow-y-auto space-y-4 pr-1.5 flex-1 custom-scrollbar modal-body-scroll">
            <div className="p-6 rounded-karte border border-dashed border-gold bg-flaeche text-center py-8">
              <div className="mx-auto w-12 h-12 rounded-full bg-flaeche flex items-center justify-center text-schrift mb-3">
                <ShieldCheck size={24} />
              </div>
              <h3 className="font-bold text-base sm:text-lg text-gold-hell mb-1">
                Splittermond Charaktergenerator
              </h3>
              <p className="text-xs sm:text-sm text-leise max-w-md mx-auto mb-3">
                Offizielles Regelsystem basierend auf dem Splittermond Grundregelwerk (Uhrwerk Verlag) mit Unterstützung für Zauber, Meisterschaften, Steigerung, Gesundheit/Fokus-Verwaltung und Würfelproben.
              </p>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-erhoeht border border-rahmen text-xs text-schrift font-bold">
                Version 1.2 · Modulares Regelsystem
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 mt-3 border-t border-gold shrink-0">
          <span />
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-erhoeht hover:bg-rahmen text-schrift text-xs sm:text-sm font-bold rounded-knopf transition-colors cursor-pointer"
          >
            Fertig
          </button>
        </div>

      </div>
    </div>
  );
};
