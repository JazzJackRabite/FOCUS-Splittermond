import React, { useState } from 'react';
import { User, Plus, Copy, Trash2, Check, Sparkles, X, Upload, Download, BookOpenText } from 'lucide-react';
import {
  getProfilesList,
  getActiveProfileId,
  setActiveProfileId,
  deleteProfile,
  saveToLocalStorage,
  loadFromLocalStorage,
  type CharacterProfileMeta,
} from '../../hooks/useLocalStorage';
import { CHARACTER_PRESETS, type ArchetypePreset } from '../../data/presets';
import { DEFAULT_STATE } from '../../hooks/useCharacterState';
import { mitRegelIds } from '../../regelwerk/bruecke';
import { generateId } from '../../utils/id';
import { validateCharacterImport } from '../../utils/importValidation';
import { referenceCharacterResources } from '../../utils/gameResourceManager';
import type { CharacterState } from '../../types';
import { toast } from 'react-hot-toast';

interface ProfileModalProps {
  onClose: () => void;
  onSelectProfile: (profileId: string) => void;
  onApplyPreset?: (presetState: Record<string, unknown>) => void;
  currentState?: CharacterState;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ onClose, onSelectProfile, currentState }) => {
  const [profiles, setProfiles] = useState<CharacterProfileMeta[]>(() => {
    const list = getProfilesList();
    if (list.length === 0) {
      return [{ id: 'default', name: 'Standard Heldenprofil', race: 'Mensch', updatedAt: Date.now() }];
    }
    return list;
  });
  const [activeId, setActiveId] = useState<string>(() => getActiveProfileId());
  const [tab, setTab] = useState<'profiles' | 'presets'>('profiles');
  const [selectedPreset, setSelectedPreset] = useState<ArchetypePreset | null>(null);

  const handleSwitchProfile = (id: string) => {
    setActiveProfileId(id);
    setActiveId(id);
    onSelectProfile(id);
    toast.success('Profil gewechselt!');
    onClose();
  };

  const handleCreateNewProfile = () => {
    const newId = `char_${generateId()}`;
    const newState = { ...DEFAULT_STATE, name: 'Neuer Heldencharakter' };
    saveToLocalStorage(newState as unknown as Record<string, unknown>, newId);
    setActiveProfileId(newId);
    toast.success('Neuer Charakter erstellt!');
    onSelectProfile(newId);
    onClose();
  };

  const handleImportProfile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.json')) {
      toast.error('Nur JSON-Dateien erlaubt!');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const raw = JSON.parse((ev.target?.result as string) || '{}');
        const validated = validateCharacterImport(raw);
        const newId = `char_${generateId()}`;
        const rawState: Partial<CharacterState> = {
          ...DEFAULT_STATE,
          ...validated,
          inventory: validated.inventory ?? [],
          money: validated.money ?? { solare: 0, lunare: 5, telare: 0 },
          creationFinalized: validated.creationFinalized ?? true,
          playState: {
            ...DEFAULT_STATE.playState,
            ...(validated.playState ?? {}),
          },
          advancementLog: validated.advancementLog ?? [],
        };
        const completeState = referenceCharacterResources(rawState);
        saveToLocalStorage(completeState as unknown as Record<string, unknown>, newId);
        setActiveProfileId(newId);
        setActiveId(newId);
        const updated = getProfilesList();
        setProfiles(updated);
        onSelectProfile(newId);
        toast.success(`Charakter "${completeState.name || 'Neuer Held'}" importiert!`);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Fehler beim Lesen der Datei.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleExportProfile = (id: string, name: string) => {
    // If exporting the active profile, always prioritize in-memory state directly to avoid any latency
    const sourceData = (id === activeId && currentState) ? currentState : (loadFromLocalStorage(id) || DEFAULT_STATE);
    const blob = new Blob([JSON.stringify(mitRegelIds(sourceData as Partial<CharacterState>), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(name || 'Held').replace(/[^a-z0-9_-]/gi, '_')}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Charakter "${name}" exportiert!`);
  };

  const handleGenerateProfilePDF = async (id: string) => {
    const sourceData = loadFromLocalStorage(id) || DEFAULT_STATE;
    try {
      const { generatePdfForState } = await import('../export/PdfExport');
      await generatePdfForState(sourceData as unknown as CharacterState);
      toast.success(`PDF für "${(sourceData.name as string) || 'Held'}" generiert!`);
    } catch (err) {
      console.error(err);
      toast.error('Fehler beim Generieren des PDFs.');
    }
  };

  const handleCreateFromPreset = (preset: ArchetypePreset) => {
    const newId = `char_${generateId()}`;
    const referenced = referenceCharacterResources(preset.fullState);
    const newState = {
      ...referenced,
      creationFinalized: true,
      mode: 'play' as const,
    };
    saveToLocalStorage(newState as unknown as Record<string, unknown>, newId);
    setActiveProfileId(newId);
    toast.success(`Vorlage "${preset.name}" geladen! Charaktererschaffung ist abgeschlossen.`);
    onSelectProfile(newId);
    onClose();
  };

  const handleDuplicateProfile = (id: string) => {
    const sourceData = loadFromLocalStorage(id) || DEFAULT_STATE;
    const newId = `char_${generateId()}`;
    const duplicated = {
      ...sourceData,
      name: `${(sourceData.name as string) || 'Held'} (Kopie)`,
    };
    saveToLocalStorage(duplicated, newId);
    const updated = getProfilesList();
    setProfiles(updated);
    toast.success('Profil dupliziert!');
  };

  const handleDeleteProfile = (id: string) => {
    if (profiles.length <= 1) {
      toast.error('Das letzte Profil kann nicht gelöscht werden!');
      return;
    }
    deleteProfile(id);
    const updated = getProfilesList();
    setProfiles(updated);
    if (activeId === id) {
      const nextId = updated[0]?.id || 'default';
      setActiveProfileId(nextId);
      setActiveId(nextId);
      onSelectProfile(nextId);
    }
    toast.success('Profil gelöscht!');
  };

  return (
    <div className="fixed inset-0 z-50 bg-seite/80 flex items-center justify-center p-4">
      <div id="profile-modal-dialog" className="bg-flaeche border border-rahmen rounded-karte shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-erhoeht text-schrift p-4 flex justify-between items-center border-b-2 border-gold">
          <div className="flex items-center gap-2">
            <User className="text-gold" size={24} />
            <h2 className="text-xl font-bold fantasy-font">Charakter-Profile & Vorlagen</h2>
          </div>
          <button onClick={onClose} className="hover:text-schrift transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-rahmen bg-seite">
          <button
            onClick={() => setTab('profiles')}
            className={`flex-1 py-3 text-center font-bold text-sm uppercase tracking-wider transition-all ${
              tab === 'profiles' ? 'bg-erhoeht text-schrift border-b-2 border-gold' : 'text-leise hover:bg-rahmen'
            }`}
          >
            Meine Charaktere ({profiles.length})
          </button>
          <button
            onClick={() => setTab('presets')}
            className={`flex-1 py-3 text-center font-bold text-sm uppercase tracking-wider transition-all flex items-center justify-center gap-1 ${
              tab === 'presets' ? 'bg-erhoeht text-schrift border-b-2 border-gold' : 'text-leise hover:bg-rahmen'
            }`}
          >
            <Sparkles size={16} className="text-gold" /> Archetypen & Vorlagen
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-3 custom-scrollbar modal-body-scroll">
          {tab === 'profiles' && (
            <>
              <div className="flex flex-wrap justify-between items-center gap-2 mb-2">
                <p className="text-xs text-leise">
                  Verwalte mehrere Splittermond-Helden und wechsle jederzeit nahtlos zwischen ihnen.
                </p>
                <div className="flex items-center gap-2">
                  <label
                    className="bg-gold hover:bg-gold-hell text-seite text-xs font-bold px-3 py-1.5 rounded-knopf border border-erschoepft flex items-center gap-1.5 cursor-pointer transition-all "
                    title="Charakter aus JSON-Datei importieren"
                  >
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleImportProfile}
                      className="hidden"
                    />
                    <Upload size={14} /> Charakter importieren
                  </label>
                  <button
                    onClick={handleCreateNewProfile}
                    className="min-h-11 bg-gold hover:bg-gold-hell text-seite text-xs font-bold px-3 py-1.5 rounded-knopf border border-gold flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Plus size={14} /> Neuer Charakter
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                {profiles.map((p) => {
                  const isActive = p.id === activeId;
                  return (
                    <div
                      key={p.id}
                      className={`p-3 rounded-knopf border flex items-center justify-between transition-all ${
                        isActive
                          ? 'bg-erhoeht text-schrift border-gold '
                          : 'bg-flaeche hover:bg-rahmen border-rahmen text-schrift'
                      }`}
                    >
                      <div className="flex items-center gap-3 cursor-pointer flex-1" onClick={() => handleSwitchProfile(p.id)}>
                        <div
                          className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm border ${
                            isActive ? 'bg-gold text-seite border-rahmen' : 'bg-erhoeht text-seite border-gold'
                          }`}
                        >
                          {p.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-base flex items-center gap-2">
                            {p.name}
                            {isActive && <span className="bg-gold text-seite text-[11px] font-extrabold px-2 py-0.5 rounded-full">Aktiv</span>}
                          </div>
                          <div className={`text-xs ${isActive ? 'text-schrift' : 'text-leise'}`}>
                            Rasse: {p.race || 'Mensch'}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        {!isActive && (
                          <button
                            onClick={() => handleSwitchProfile(p.id)}
                            className="bg-gold hover:bg-gold-hell text-seite p-2 rounded-knopf text-xs font-bold flex items-center gap-1 border border-erschoepft cursor-pointer shadow-2xs"
                            title="Zu diesem Profil wechseln"
                          >
                            <Check size={14} /> Laden
                          </button>
                        )}
                        <button
                          onClick={() => handleGenerateProfilePDF(p.id)}
                          className={`p-2 rounded-knopf hover:bg-rahmen transition-colors cursor-pointer ${isActive ? 'hover:text-gold-hell text-schrift' : 'text-schrift'}`}
                          title="PDF-Charakterbogen generieren"
                        >
                          <BookOpenText size={16} />
                        </button>
                        <button
                          onClick={() => handleExportProfile(p.id, p.name)}
                          className={`p-2 rounded-knopf hover:bg-rahmen transition-colors cursor-pointer ${isActive ? 'hover:text-gold-hell text-schrift' : 'text-schrift'}`}
                          title="Charakter (JSON) exportieren"
                        >
                          <Download size={16} />
                        </button>
                        <button
                          onClick={() => handleDuplicateProfile(p.id)}
                          className={`p-2 rounded-knopf hover:bg-rahmen transition-colors cursor-pointer ${isActive ? 'hover:text-gold-hell text-schrift' : 'text-schrift'}`}
                          title="Duplizieren"
                        >
                          <Copy size={16} />
                        </button>
                        {profiles.length > 1 && (
                          <button
                            onClick={() => handleDeleteProfile(p.id)}
                            className={`p-2 rounded-knopf hover:bg-schaden hover:text-schrift transition-colors cursor-pointer ${
                              isActive ? 'text-schaden' : 'text-schaden'
                            }`}
                            title="Löschen"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {tab === 'presets' && (
            <div className="space-y-4">
              <p className="text-xs text-leise">
                Wähle eine fertige Heldenvorlage als Basis für deinen neuen Charakter aus:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {CHARACTER_PRESETS.map((preset) => (
                  <div
                    key={preset.id}
                    className="p-4 rounded-karte border border-gold bg-flaeche transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="font-bold text-schrift flex justify-between items-start">
                        <div>
                          <div className="text-base leading-tight font-extrabold">{preset.name}</div>
                          <div className="text-xs text-gold font-bold">{preset.title}</div>
                        </div>
                        <span className="text-xs font-semibold bg-seite text-schrift px-2 py-0.5 rounded-knopf shrink-0">
                          {preset.race}
                        </span>
                      </div>
                      <p className="text-xs text-leise my-2">{preset.description}</p>
                      <div className="text-[11px] text-leise space-y-1 bg-erhoeht p-2 rounded-knopf border border-rahmen">
                        <div><strong>Attribute:</strong> STA {preset.fullState.attrBase.STA}, KON {preset.fullState.attrBase.KON}, BEW {preset.fullState.attrBase.BEW}, INT {preset.fullState.attrBase.INT}, MYS {preset.fullState.attrBase.MYS}</div>
                        <div><strong>Region & Mond:</strong> {preset.homeRegion} ({preset.moonSign})</div>
                        <div><strong>Status:</strong> <span className="text-unverletzt font-bold">Vollständiger Held (Spielbereit)</span></div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleCreateFromPreset(preset)}
                      className="mt-3 w-full bg-erhoeht hover:bg-rahmen text-schrift text-xs font-bold py-2 rounded-knopf border border-rahmen flex items-center justify-center gap-1 transition-all cursor-pointer"
                    >
                      <Sparkles size={14} className="text-gold" /> Als neuen Held laden
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-seite border-t border-rahmen flex justify-end no-print">
          <button
            onClick={onClose}
            className="min-h-11 px-5 py-2 bg-erhoeht hover:bg-rahmen text-schrift rounded-knopf font-bold text-xs border border-rahmen transition-all cursor-pointer"
          >
            Schließen
          </button>
        </div>
      </div>
    </div>
  );
};
