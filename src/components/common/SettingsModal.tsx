import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Sun,
  Moon,
  Settings,
  Sliders,
  Info,
  ShieldCheck,
  ShieldAlert,
  Layers,
  Download,
  Upload,
  RotateCcw,
  Sparkles,
  CheckCircle2,
  BookOpen,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { ThemePalette, THEME_PALETTES } from '../../data/themePalettes';
import {
  useGameResources,
} from '../../hooks/useGameResources';
import {
  exportOverridesAsJson,
  importOverridesFromJson,
} from '../../utils/gameResourceManager';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { RegelpaketeTab } from './RegelpaketeTab';

interface SettingsModalProps {
  currentThemeId: ThemePalette['id'];
  onSelectTheme: (id: ThemePalette['id']) => void;
  onClose: () => void;
  onOpenAdmin?: () => void;
}

type SettingsTab = 'general' | 'regelpakete' | 'admin' | 'info';

export const SettingsModal: React.FC<SettingsModalProps> = ({
  currentThemeId,
  onSelectTheme,
  onClose,
  onOpenAdmin,
}) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const [confirmResetAll, setConfirmResetAll] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    modules,
    counts,
    resetAllOverrides,
  } = useGameResources();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const isLightMode = currentThemeId === 'focus-light';

  const handleToggleMode = () => {
    if (isLightMode) {
      onSelectTheme('focus-dark');
    } else {
      onSelectTheme('focus-light');
    }
  };

  const handleExportJson = () => {
    try {
      const jsonStr = exportOverridesAsJson();
      const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const dateStr = new Date().toISOString().slice(0, 10);
      link.download = `splittermond_ressourcen_backup_${dateStr}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success('Ressourcen-Backup erfolgreich exportiert.');
    } catch {
      toast.error('Export fehlgeschlagen.');
    }
  };

  const handleImportFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const result = importOverridesFromJson(content);
        if (result.success) {
          toast.success(result.message);
        } else {
          toast.error(result.message);
        }
      }
    };
    reader.onerror = () => {
      toast.error('Fehler beim Lesen der Datei.');
    };
    reader.readAsText(file);
    e.target.value = '';
  };

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
        {/* Hidden file input for JSON import */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleImportFileChange}
          className="hidden"
        />

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
                Passe Anzeigeoptionen und Systemressourcen an.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Simple Light/Dark Switch Button */}
            <button
              type="button"
              onClick={handleToggleMode}
              className="p-2 rounded-lg border border-[#C5A059] bg-[#1B365D] text-[#f3e5cf] hover:bg-[#C5A059] hover:text-[#1B365D] transition-colors cursor-pointer flex items-center justify-center shadow-xs"
              title={isLightMode ? 'Zu Dunkelmodus wechseln' : 'Zu Hellmodus wechseln'}
              aria-label={isLightMode ? 'Zu Dunkelmodus wechseln' : 'Zu Hellmodus wechseln'}
            >
              {isLightMode ? <Moon size={20} /> : <Sun size={20} />}
            </button>

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
            <span>Allgemein & Farbschema</span>
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
            onClick={() => setActiveTab('admin')}
            className={`shrink-0 whitespace-nowrap px-3 sm:px-4 py-2 text-xs sm:text-sm font-bold flex items-center gap-2 rounded-t-lg transition-colors cursor-pointer ${
              activeTab === 'admin'
                ? 'bg-[#1B365D] text-[#f3e5cf] border-t-2 border-[#C5A059]'
                : 'text-gray-600 hover:text-[#1B365D] hover:bg-black/5'
            }`}
          >
            <ShieldAlert size={16} className="text-[#C5A059]" />
            <span>Admin & Ressourcen</span>
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
        {/* Tab 1: Allgemein & Farbschema */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'general' && (
          <div className="overflow-y-auto space-y-4 pr-1.5 flex-1 custom-scrollbar modal-body-scroll">
            <div className="bg-white/70 p-4 rounded-xl border border-[#d1c4b0]">
              <h3 className="font-bold text-sm text-[#1B365D] mb-2 flex items-center gap-2">
                <Sun size={18} className="text-[#C5A059]" />
                <span>Erscheinungsbild</span>
              </h3>
              <p className="text-xs text-gray-600 mb-3">
                Wähle zwischen Hell- und Dunkelmodus für die optimale Lesbarkeit.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => onSelectTheme('focus-light')}
                  className={`p-3 rounded-lg border flex items-center justify-between transition-all cursor-pointer ${
                    currentThemeId === 'focus-light'
                      ? 'border-[#1B365D] bg-[#1B365D]/10 font-bold text-[#1B365D]'
                      : 'border-gray-300 bg-white text-gray-700 hover:border-[#C5A059]'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Sun size={18} />
                    <span>Hellmodus</span>
                  </div>
                  {currentThemeId === 'focus-light' && <CheckCircle2 size={16} className="text-[#1B365D]" />}
                </button>

                <button
                  type="button"
                  onClick={() => onSelectTheme('focus-dark')}
                  className={`p-3 rounded-lg border flex items-center justify-between transition-all cursor-pointer ${
                    currentThemeId === 'focus-dark'
                      ? 'border-[#1B365D] bg-[#1B365D]/10 font-bold text-[#1B365D]'
                      : 'border-gray-300 bg-white text-gray-700 hover:border-[#C5A059]'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Moon size={18} />
                    <span>Dunkelmodus</span>
                  </div>
                  {currentThemeId === 'focus-dark' && <CheckCircle2 size={16} className="text-[#1B365D]" />}
                </button>
              </div>
            </div>

            <div className="bg-white/70 p-4 rounded-xl border border-[#d1c4b0]">
              <h3 className="font-bold text-sm text-[#1B365D] mb-1">
                Lokale Datenspeicherung
              </h3>
              <p className="text-xs text-gray-600 leading-relaxed">
                Deine Helden und Charakterzustände werden automatisch im lokalen Browser-Speicher gesichert.
                Nutze den Reiter <strong>Admin & Ressourcen</strong> für erweiterte Spielressourcen-Anpassungen.
              </p>
            </div>
          </div>
        )}

        {activeTab === 'regelpakete' && <RegelpaketeTab />}

        {/* ------------------------------------------------------------- */}
        {/* Tab 2: Admin & Ressourcen */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'admin' && (
          <div className="overflow-y-auto space-y-4 pr-1.5 flex-1 custom-scrollbar modal-body-scroll">
            <div className="space-y-4">
              {/* Main Admin Console Action Card */}
              <div className="p-5 rounded-xl border-2 border-[#C5A059] bg-white shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="space-y-1 text-center sm:text-left">
                    <div className="flex items-center gap-2 justify-center sm:justify-start">
                      <ShieldAlert size={20} className="text-[#C5A059]" />
                      <h3 className="font-bold text-base text-[#1B365D]">
                        Admin-Konsole öffnen
                      </h3>
                    </div>
                    <p className="text-xs text-gray-600 max-w-md leading-relaxed">
                      Öffnet die detaillierte Verwaltungsoberfläche für alle <strong>Zauber, Meisterschaften, Stärken, Schwächen und Ressourcen</strong> mit Such- und Filtersystem sowie dem Beschreibungseditor.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (onOpenAdmin) {
                        onOpenAdmin();
                      }
                    }}
                    className="px-4 py-2.5 font-bold text-xs sm:text-sm rounded-lg bg-[#1B365D] text-[#f3e5cf] hover:bg-[#0f2340] border border-[#C5A059] flex items-center gap-2 cursor-pointer transition-all shadow-md shrink-0 active:scale-95"
                  >
                    <Sliders size={16} className="text-[#C5A059]" />
                    <span>Admin-Konsole öffnen</span>
                  </button>
                </div>

                {/* Modules Summary */}
                <div className="p-4 rounded-xl border border-[#d1c4b0] bg-white/70 space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-xs uppercase tracking-wider text-[#1B365D] flex items-center gap-1.5">
                      <Layers size={15} className="text-[#C5A059]" />
                      <span>Installierte Regelwerks-Module</span>
                    </h4>
                    <span className="text-xs font-semibold text-gray-500">
                      {modules.length} Module geladen
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                    {modules.map((m) => (
                      <div
                        key={m.id}
                        className="p-2 rounded-lg border border-gray-200 bg-white text-left"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-[#1B365D]">{m.name}</span>
                          {m.isDefault ? (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-[#1B365D] text-[#C5A059]">
                              Standard
                            </span>
                          ) : (
                            <span className="text-[9px] font-medium px-1.5 py-0.2 rounded bg-gray-100 text-gray-600">
                              Demo
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-gray-500 mt-0.5 line-clamp-1">
                          {m.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Data Persistence & Backup */}
                <div className="p-4 rounded-xl border border-[#d1c4b0] bg-white/70 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-xs uppercase tracking-wider text-[#1B365D] flex items-center gap-1.5">
                      <Sparkles size={15} className="text-[#C5A059]" />
                      <span>Dauerhafte Speicherung & Datensicherung</span>
                    </h4>
                    {counts.total > 0 ? (
                      <span className="text-xs font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-300">
                        {counts.total} Änderungen aktiv
                      </span>
                    ) : (
                      <span className="text-xs text-gray-500">Standard-Regeln aktiv</span>
                    )}
                  </div>

                  <p className="text-xs text-gray-600 leading-relaxed">
                    Alle Änderungen an Zaubern, Meisterschaften und Eigenschaften werden dauerhaft im Browser-Speicher (<code>localStorage</code>) gesichert und sind in allen Charakteren sofort verfügbar.
                    Hier kannst du deine Anpassungen als Datei sichern oder einspielen.
                  </p>

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleExportJson}
                      className="px-3 py-1.5 text-xs font-bold rounded-lg border border-[#C5A059] bg-white text-[#1B365D] hover:bg-[#C5A059]/15 flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
                      title="Alle selbst erstellten oder angepassten Zauber, Meisterschaften und Systemregeln als JSON sichern"
                    >
                      <Download size={14} className="text-[#C5A059]" />
                      <span>Regel-Backup exportieren (JSON)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3 py-1.5 text-xs font-bold rounded-lg border border-[#C5A059] bg-white text-[#1B365D] hover:bg-[#C5A059]/15 flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
                      title="Regel-Anpassungen aus einer gesicherten JSON-Datei wiederherstellen"
                    >
                      <Upload size={14} className="text-[#C5A059]" />
                      <span>Regel-Backup importieren (JSON)</span>
                    </button>

                    {counts.total > 0 && (
                      <button
                        type="button"
                        onClick={() => setConfirmResetAll(true)}
                        className="px-3 py-1.5 text-xs font-bold rounded-lg border border-red-300 text-red-700 bg-red-50 hover:bg-red-100 flex items-center gap-1.5 cursor-pointer transition-colors ml-auto"
                      >
                        <RotateCcw size={14} />
                        <span>Alle auf Standard zurücksetzen</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
          </div>
        )}

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
          <span className="text-xs text-gray-500">
            Modus: <strong className="text-[#1B365D]">{isLightMode ? 'Hellmodus' : 'Dunkelmodus'}</strong>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-[#1B365D] hover:bg-[#2c4b7a] text-white text-xs sm:text-sm font-bold rounded-lg transition-colors cursor-pointer"
          >
            Fertig
          </button>
        </div>

        {/* Confirm Reset All Dialog */}
        {confirmResetAll && (
          <ConfirmDialog
            title="Alle Anpassungen zurücksetzen?"
            message="Möchtest du wirklich alle geänderten Beschreibungen auf die offiziellen Standardwerte zurücksetzen?"
            onConfirm={() => {
              resetAllOverrides();
              setConfirmResetAll(false);
              toast.success('Alle Anpassungen wurden zurückgesetzt.');
            }}
            onCancel={() => setConfirmResetAll(false)}
          />
        )}
      </div>
    </div>
  );
};
