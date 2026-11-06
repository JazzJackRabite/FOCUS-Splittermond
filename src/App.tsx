import React, { useState, useEffect } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import { Users, Settings, RotateCcw } from 'lucide-react';

import { useCharacterState } from './hooks/useCharacterState';
import { useCalculations } from './hooks/useCalculations';
import { useNamensAbgleich } from './regelwerk/useNamensAbgleich';
import { CharacterContext, useCharacter } from './context/CharacterContext';
import { XpAddModal } from './components/modals/XpAddModal';
import { ProfileModal } from './components/modals/ProfileModal';
import { SettingsModal } from './components/common/SettingsModal';
import { useTheme } from './hooks/useTheme';
import { loadFromLocalStorage } from './hooks/useLocalStorage';
import { ConfirmDialog } from './components/ui/ConfirmDialog';
import { CreationView } from './features/creation/CreationView';
import { AdvancementView } from './features/advancement/AdvancementView';
import { PlayView } from './features/play/PlayView';
import { CombatMagicTab } from './components/combat/CombatMagicTab';
import { InventoryView } from './features/inventory/InventoryView';
import { BegleiterView } from './features/begleiter/BegleiterView';
import { PlaySessionProvider, usePlaySession } from './context/PlaySessionContext';
import type { ConfirmDialogState } from './hooks/useModals';
import type { AppMode } from './types';

// ---------------------------------------------------------------
// Header Undo Button
// ---------------------------------------------------------------

const HeaderUndoButton: React.FC = () => {
  const { state, dispatch } = useCharacter();
  const session = usePlaySession();

  const isPlayOrCombat = state.mode === 'play' || state.mode === 'combat';
  const canUndoPlay = isPlayOrCombat && session.playHistory.length > 0;
  const canUndoAdvancement = (state.advancementHistory?.length ?? 0) > 0;
  const canUndo = canUndoPlay || canUndoAdvancement;

  const handleUndo = () => {
    if (canUndoPlay) {
      session.handleUndoPlay();
    } else if (canUndoAdvancement) {
      dispatch({ type: 'UNDO_LAST_ADVANCEMENT' });
      toast.success('Letzte Steigerung / Änderung rückgängig gemacht');
    }
  };

  return (
    <button
      type="button"
      onClick={handleUndo}
      disabled={!canUndo}
      className={`p-2 rounded transition flex items-center justify-center font-bold shadow-sm border ${
        canUndo
          ? 'bg-[#0f2340] border-[#C5A059] text-[#f3e5cf] hover:bg-[#C5A059] hover:text-[#1B365D] cursor-pointer active:scale-95'
          : 'bg-[#0f2340]/40 border-[#C5A059]/30 text-[#f3e5cf]/40 cursor-not-allowed'
      }`}
      title={
        canUndoPlay
          ? 'Letzte Aktion rückgängig machen'
          : canUndoAdvancement
          ? 'Letzte Steigerung rückgängig machen'
          : 'Keine Aktion zum Rückgängigmachen'
      }
      aria-label="Rückgängig"
    >
      <RotateCcw size={19} />
    </button>
  );
};

// ---------------------------------------------------------------

const App: React.FC = () => {
  const { state, dispatch } = useCharacterState();
  const calc = useCalculations(state);
  useNamensAbgleich(state, dispatch);
  const { currentThemeId, setTheme } = useTheme();

  const { mode, xpTotal } = state;
  const { xpAvailable, heldengrad, isCreationComplete } = calc;

  const hgMatch = heldengrad.name.match(/^(.*?)\s*(\(.*\))$/);
  const hgTitle = hgMatch ? hgMatch[1] : heldengrad.name;
  const hgRank = hgMatch ? hgMatch[2] : '';

  const [showXpModal, setShowXpModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState | null>(null);

  useEffect(() => {
    if (
      (mode === 'xp' || mode === 'play' || mode === 'combat' || mode === 'inventory' || mode === 'begleiter') &&
      !isCreationComplete &&
      !state.creationFinalized
    ) {
      dispatch({ type: 'SET_MODE', payload: 'creation' });
    }
  }, [isCreationComplete, state.creationFinalized, mode, dispatch]);

  // Auto-initialize playState when entering play or combat mode for the first time
  useEffect(() => {
    if ((mode === 'play' || mode === 'combat') && state.playState.healthSlots.length === 0) {
      dispatch({
        type: 'PLAY_RESET',
        payload: {
          maxLP: calc.maxLP,
          maxFocus: calc.maxFO,
          maxSplitter: calc.splinterPoints,
        },
      });
    }
  }, [mode, state.playState.healthSlots.length, calc.maxLP, calc.maxFO, calc.splinterPoints, dispatch]);

  const handleTabClick = (targetMode: AppMode) => {
    if (targetMode === mode) return;

    if (targetMode === 'creation') {
      if (state.creationFinalized) {
        setConfirmDialog({
          title: 'Erschaffung modifizieren?',
          message: 'Bist du sicher, dass du die Charaktererschaffung modifizieren möchtest?',
          onConfirm: () => {
            dispatch({ type: 'SET_CREATION_FINALIZED', payload: false });
            dispatch({ type: 'SET_MODE', payload: 'creation' });
            setConfirmDialog(null);
          },
        });
      } else {
        dispatch({ type: 'SET_MODE', payload: 'creation' });
      }
      return;
    }

    // targetMode is 'xp', 'play', 'combat', 'inventory' or 'begleiter'
    if (!state.creationFinalized) {
      if (!isCreationComplete) {
        toast.error('Die Charaktererschaffung ist noch nicht vollständig!');
        return;
      }
      setConfirmDialog({
        title: 'Charaktererschaffung abschließen?',
        message: 'Ist die Charaktererschaffung abgeschlossen? Sobald du dies bestätigst, darfst du deinen Charakter steigern und spielen.',
        onConfirm: () => {
          dispatch({ type: 'SET_CREATION_FINALIZED', payload: true });
          dispatch({ type: 'SET_MODE', payload: targetMode });
          setConfirmDialog(null);
          toast.success('Charaktererschaffung abgeschlossen! Steigerung und Spielen freigeschaltet.');
        },
      });
      return;
    }

    // Already finalized, switch directly
    dispatch({ type: 'SET_MODE', payload: targetMode });
  };

  const isAdvancementUnlocked = isCreationComplete || !!state.creationFinalized;

  return (
    <CharacterContext.Provider value={{ state, dispatch, calc }}>
      {/* Global Toast Notifications - always on top of modals & backdrops */}
      <Toaster
        position="top-right"
        containerStyle={{
          zIndex: 99999,
        }}
        toastOptions={{
          duration: 3500,
          style: {
            zIndex: 99999,
            background: '#1B365D',
            color: '#f3e5cf',
            border: '1px solid #C5A059',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5)',
            fontWeight: '500',
          },
          success: {
            iconTheme: {
              primary: '#C5A059',
              secondary: '#1B365D',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#f3e5cf',
            },
          },
        }}
      />

      <PlaySessionProvider>
        <div className="relative z-0 paper-bg rounded-lg min-h-[90vh] flex flex-col shadow-2xl pb-20 w-full">
          {/* Confirm Dialog */}
          {confirmDialog && (
            <ConfirmDialog
              title={confirmDialog.title}
              message={confirmDialog.message}
              onConfirm={confirmDialog.onConfirm}
              onCancel={() => setConfirmDialog(null)}
            />
          )}

          {/* Floating XP Counter */}
          <div className="fixed bottom-3 right-3 sm:bottom-4 sm:right-4 bg-[#1B365D] text-white px-3.5 py-1.5 sm:px-6 sm:py-3 rounded-full shadow-2xl z-50 flex flex-col items-center no-print border border-[#C5A059]/40 backdrop-blur-xs select-none">
            <div className="text-[9px] sm:text-[10px] uppercase tracking-wider text-[#C5A059] font-bold leading-tight">Verfügbar</div>
            <div className={`text-sm sm:text-xl font-bold leading-tight ${xpAvailable < 0 ? 'text-red-400' : 'text-white'}`}>
              {xpAvailable} EP
            </div>
          </div>

          {/* HEADER */}
          <div className="bg-[#1B365D] text-[#f3e5cf] p-3 sm:p-4 border-b-6 sm:border-b-8 border-[#C5A059] shadow-lg relative z-10 no-print w-full">
            <div className="flex flex-wrap items-center justify-between gap-3 lg:gap-4">
              {/* 1. Branding */}
              <div className="order-1 shrink-0">
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-widest text-[#f3e5cf] drop-shadow-lg leading-none">
                  FOCUS
                </h1>
                <p className="text-[11px] sm:text-xs text-[#C5A059] italic tracking-wide leading-tight mt-1">
                  Freier Online Charaktereditor:<br />
                  Universum Splittermond v.1.2
                </p>
              </div>

              {/* 2. Character Status Widget (Heldengrad & Gesamt-EP) */}
              <div className="order-3 sm:order-2 w-full sm:w-auto flex justify-center">
                <div className="bg-[#0f2340]/90 border border-[#C5A059]/60 rounded-lg px-3.5 sm:px-4 py-1.5 shadow-inner flex items-center gap-3 sm:gap-4">
                  <div className="text-center sm:text-right flex flex-col justify-center">
                    <div className="text-xs sm:text-sm font-bold text-[#C5A059] fantasy-font whitespace-nowrap leading-tight">
                      {hgTitle}
                    </div>
                    {hgRank && (
                      <div className="text-[10px] sm:text-xs text-[#f3e5cf]/85 font-medium whitespace-nowrap leading-tight mt-0.5">
                        {hgRank}
                      </div>
                    )}
                  </div>

                  <div className="h-8 w-px bg-[#C5A059]/40 self-center" />

                  <div className="flex items-center gap-2">
                    <div className="flex flex-col items-start">
                      <span className="text-[9px] sm:text-[10px] uppercase text-gray-400 tracking-wider font-semibold leading-none">
                        Gesamt-EP
                      </span>
                      {isAdvancementUnlocked && (
                        <button
                          type="button"
                          onClick={() => setShowXpModal(true)}
                          className="text-[10px] text-[#C5A059] hover:text-white hover:underline transition-colors mt-0.5 cursor-pointer font-medium leading-none whitespace-nowrap"
                          title="Erfahrungspunkte hinzufügen"
                        >
                          +EP
                        </button>
                      )}
                    </div>
                    <div
                      className="min-w-[3.6rem] bg-[#faf4e6] text-center font-bold text-[#1B365D] text-sm sm:text-base border border-[#C5A059] rounded py-0.5 px-2 select-none shadow-xs"
                      title="Gesamt-Erfahrungspunkte (können unten im Protokoll korrigiert werden)"
                    >
                      {xpTotal}
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. Action Controls */}
              <div className="order-2 sm:order-3 flex items-center gap-1.5 sm:gap-2 shrink-0">
                <button
                  onClick={() => setShowProfileModal(true)}
                  className="px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded transition bg-[#0f2340] border border-[#C5A059] text-[#f3e5cf] hover:bg-[#C5A059] hover:text-[#1B365D] flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-bold shadow-sm cursor-pointer"
                  title="Helden-Profile & Vorlagen"
                >
                  <Users size={17} />
                  <span className="hidden sm:inline">Meine Charaktere</span>
                  <span className="inline sm:hidden">Helden</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowThemeModal(true)}
                  className="p-1.5 sm:p-2 rounded transition bg-[#0f2340] border border-[#C5A059] text-[#f3e5cf] hover:bg-[#C5A059] hover:text-[#1B365D] flex items-center justify-center font-bold shadow-sm cursor-pointer"
                  title="Menü & Einstellungen"
                  aria-label="Menü & Einstellungen"
                >
                  <Settings size={19} />
                </button>

                <HeaderUndoButton />
              </div>
            </div>
          </div>

          {/* XP Modal */}
          {showXpModal && (
            <XpAddModal
              onClose={() => setShowXpModal(false)}
              onAdd={(val, note) => {
                dispatch({ type: 'ADD_XP_WITH_NOTE', payload: { amount: val, note } });
              }}
            />
          )}

          {/* Profile Modal */}
          {showProfileModal && (
            <ProfileModal
              currentState={state}
              onClose={() => setShowProfileModal(false)}
              onSelectProfile={(profileId) => {
                const loaded = loadFromLocalStorage(profileId);
                if (loaded) {
                  dispatch({ type: 'LOAD_STATE', payload: loaded });
                }
              }}
            />
          )}

          {/* Settings Modal */}
          {showThemeModal && (
            <SettingsModal
              currentThemeId={currentThemeId}
              onSelectTheme={(themeId) => setTheme(themeId)}
              onClose={() => setShowThemeModal(false)}
            />
          )}

          {/* TABS */}
          <div className="sticky top-0 z-30 flex bg-[#e3d4b9] border-b border-[#d1c4b0] no-print shadow-md w-full backdrop-blur-xs overflow-x-auto">
            <button
              onClick={() => handleTabClick('creation')}
              className={`flex-1 min-w-[85px] min-h-[40px] py-2 sm:py-2.5 md:py-3 px-1.5 sm:px-3 text-center font-bold uppercase tracking-normal sm:tracking-wider md:tracking-widest text-[11px] sm:text-xs md:text-sm transition-all flex items-center justify-center select-none ${
                mode === 'creation'
                  ? 'bg-[#faf4e6] text-[#1B365D] border-b-2 sm:border-b-0 sm:border-t-4 border-[#1B365D] shadow-xs'
                  : 'text-gray-700 hover:bg-[#ebdcc3]'
              }`}
            >
              <span>Erschaffung</span>
            </button>

            <button
              onClick={() => handleTabClick('xp')}
              disabled={!isAdvancementUnlocked}
              className={`flex-1 min-w-[85px] min-h-[40px] py-2 sm:py-2.5 md:py-3 px-1.5 sm:px-3 text-center font-bold uppercase tracking-normal sm:tracking-wider md:tracking-widest text-[11px] sm:text-xs md:text-sm transition-all flex items-center justify-center select-none ${
                mode === 'xp'
                  ? 'bg-[#faf4e6] text-[#1B365D] border-b-2 sm:border-b-0 sm:border-t-4 border-[#1B365D] shadow-xs'
                  : 'text-gray-700 hover:bg-[#ebdcc3]'
              } ${!isAdvancementUnlocked ? 'opacity-50 cursor-not-allowed' : ''}`}
              title={!isAdvancementUnlocked ? 'Erst verfügbar wenn Erschaffung abgeschlossen' : ''}
            >
              <span>Steigerung</span>
            </button>

            <button
              onClick={() => handleTabClick('play')}
              disabled={!isAdvancementUnlocked}
              className={`flex-1 min-w-[85px] min-h-[40px] py-2 sm:py-2.5 md:py-3 px-1.5 sm:px-3 text-center font-bold uppercase tracking-normal sm:tracking-wider md:tracking-widest text-[11px] sm:text-xs md:text-sm transition-all flex items-center justify-center select-none ${
                mode === 'play'
                  ? 'bg-[#faf4e6] text-[#1B365D] border-b-2 sm:border-b-0 sm:border-t-4 border-[#1B365D] shadow-xs'
                  : 'text-gray-700 hover:bg-[#ebdcc3]'
              } ${!isAdvancementUnlocked ? 'opacity-50 cursor-not-allowed' : ''}`}
              title={!isAdvancementUnlocked ? 'Erst verfügbar wenn Erschaffung abgeschlossen' : ''}
            >
              <span>Spielen</span>
            </button>

            <button
              onClick={() => handleTabClick('combat')}
              disabled={!isAdvancementUnlocked}
              className={`flex-1 min-w-[105px] min-h-[40px] py-2 sm:py-2.5 md:py-3 px-1.5 sm:px-3 text-center font-bold uppercase tracking-normal sm:tracking-wider md:tracking-widest text-[11px] sm:text-xs md:text-sm transition-all flex items-center justify-center select-none ${
                mode === 'combat'
                  ? 'bg-[#faf4e6] text-[#1B365D] border-b-2 sm:border-b-0 sm:border-t-4 border-[#1B365D] shadow-xs'
                  : 'text-gray-700 hover:bg-[#ebdcc3]'
              } ${!isAdvancementUnlocked ? 'opacity-50 cursor-not-allowed' : ''}`}
              title={!isAdvancementUnlocked ? 'Erst verfügbar wenn Erschaffung abgeschlossen' : ''}
            >
              <span>Kampf &amp; Magie</span>
            </button>

            <button
              onClick={() => handleTabClick('inventory')}
              disabled={!isAdvancementUnlocked}
              className={`flex-1 min-w-[85px] min-h-[40px] py-2 sm:py-2.5 md:py-3 px-1.5 sm:px-3 text-center font-bold uppercase tracking-normal sm:tracking-wider md:tracking-widest text-[11px] sm:text-xs md:text-sm transition-all flex items-center justify-center select-none ${
                mode === 'inventory'
                  ? 'bg-[#faf4e6] text-[#1B365D] border-b-2 sm:border-b-0 sm:border-t-4 border-[#1B365D] shadow-xs'
                  : 'text-gray-700 hover:bg-[#ebdcc3]'
              } ${!isAdvancementUnlocked ? 'opacity-50 cursor-not-allowed' : ''}`}
              title={!isAdvancementUnlocked ? 'Erst verfügbar wenn Erschaffung abgeschlossen' : ''}
            >
              <span>Inventar</span>
            </button>

            <button
              onClick={() => handleTabClick('begleiter')}
              disabled={!isAdvancementUnlocked}
              className={`flex-1 min-w-[85px] min-h-[40px] py-2 sm:py-2.5 md:py-3 px-1.5 sm:px-3 text-center font-bold uppercase tracking-normal sm:tracking-wider md:tracking-widest text-[11px] sm:text-xs md:text-sm transition-all flex items-center justify-center select-none ${
                mode === 'begleiter'
                  ? 'bg-[#faf4e6] text-[#1B365D] border-b-2 sm:border-b-0 sm:border-t-4 border-[#1B365D] shadow-xs'
                  : 'text-gray-700 hover:bg-[#ebdcc3]'
              } ${!isAdvancementUnlocked ? 'opacity-50 cursor-not-allowed' : ''}`}
              title={!isAdvancementUnlocked ? 'Erst verfügbar wenn Erschaffung abgeschlossen' : ''}
            >
              <span>Begleiter</span>
            </button>
          </div>

          {/* MAIN CONTENT */}
          {mode === 'creation' && <CreationView />}
          {mode === 'xp' && <AdvancementView />}
          {mode === 'play' && <PlayView />}
          {mode === 'combat' && <CombatMagicTab />}
          {mode === 'inventory' && <InventoryView />}
          {mode === 'begleiter' && <BegleiterView />}
        </div>
      </PlaySessionProvider>
    </CharacterContext.Provider>
  );
};

export default App;
