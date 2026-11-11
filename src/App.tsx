import React, { useState, useEffect } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import { Users, Settings, RotateCcw } from 'lucide-react';

import { useCharacterState } from './hooks/useCharacterState';
import { useCalculations } from './hooks/useCalculations';
import { useNamensAbgleich } from './regelwerk/useNamensAbgleich';
import { CharacterContext, useCharacter } from './context/CharacterContext';
import { ProfileModal } from './components/modals/ProfileModal';
import { SettingsModal } from './components/common/SettingsModal';
import { loadFromLocalStorage } from './hooks/useLocalStorage';
import { ConfirmDialog } from './components/ui/ConfirmDialog';
import { CreationView } from './features/creation/CreationView';
import { PlayView } from './features/play/PlayView';
import { CombatMagicTab } from './components/combat/CombatMagicTab';
import { InventoryView } from './features/inventory/InventoryView';
import { BegleiterView } from './features/begleiter/BegleiterView';
import { PlaySessionProvider, usePlaySession } from './context/PlaySessionContext';
import { ReliktAbgleich } from './components/relikte/ReliktKarte';
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
      className={`p-2 rounded-knopf transition flex items-center justify-center font-bold border ${
        canUndo
          ? 'bg-erhoeht border-gold text-schrift hover:bg-rahmen hover:text-gold-hell cursor-pointer active:scale-95'
          : 'bg-flaeche border-rahmen text-leise cursor-not-allowed'
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

  const { mode } = state;
  const { xpAvailable, isCreationComplete } = calc;

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
            background: 'var(--color-erhoeht)',
            color: 'var(--color-schrift)',
            border: '1px solid var(--color-gold)',
            fontWeight: '500',
          },
          success: {
            iconTheme: {
              primary: 'var(--color-gold)',
              secondary: 'var(--color-seite)',
            },
          },
          error: {
            iconTheme: {
              primary: 'var(--color-schaden)',
              secondary: 'var(--color-schrift)',
            },
          },
        }}
      />

      <ReliktAbgleich />
      <PlaySessionProvider>
        <div className="relative z-0 paper-bg rounded-knopf min-h-[90vh] flex flex-col shadow-2xl pb-20 w-full">
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
          <div className="fixed bottom-3 right-3 sm:bottom-4 sm:right-4 bg-erhoeht text-schrift px-3.5 py-1.5 sm:px-6 sm:py-3 rounded-full shadow-2xl z-50 flex flex-col items-center no-print border border-rahmen select-none">
            <div className="text-[11px] sm:text-[11px] uppercase tracking-wider text-gold font-bold leading-tight">Verfügbar</div>
            <div className={`text-sm sm:text-xl font-bold leading-tight ${xpAvailable < 0 ? 'text-schaden' : 'text-schrift'}`}>
              {xpAvailable} EP
            </div>
          </div>

          {/* HEADER */}
          <div className="bg-flaeche text-schrift px-4 sm:px-6 pt-4 pb-3 relative z-10 no-print w-full">
            <div className="flex items-center justify-between gap-3 lg:gap-4">
              {/* 1. Branding */}
              <div className="shrink-0">
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-widest text-gold leading-none">
                  FOCUS
                </h1>
                <p className="text-[11px] sm:text-xs text-leise tracking-wide leading-tight mt-1">
                  Freier Online Charaktereditor:<br />
                  Universum Splittermond v.1.2
                </p>
              </div>

              {/* 2. Action Controls */}
              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                <button
                  onClick={() => setShowProfileModal(true)}
                  className="px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-knopf transition bg-erhoeht border border-gold text-schrift hover:bg-rahmen hover:text-gold-hell flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-bold cursor-pointer"
                  title="Helden-Profile & Vorlagen"
                >
                  <Users size={17} />
                  <span className="hidden sm:inline">Meine Charaktere</span>
                  <span className="inline sm:hidden">Helden</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowThemeModal(true)}
                  className="p-1.5 sm:p-2 rounded-knopf transition bg-erhoeht border border-gold text-schrift hover:bg-rahmen hover:text-gold-hell flex items-center justify-center font-bold cursor-pointer"
                  title="Menü & Einstellungen"
                  aria-label="Menü & Einstellungen"
                >
                  <Settings size={19} />
                </button>

                <HeaderUndoButton />
              </div>
            </div>
          </div>

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
              onClose={() => setShowThemeModal(false)}
            />
          )}

          {/* TABS */}
          <div className="sticky top-0 z-30 flex bg-flaeche border-b border-rahmen no-print w-full overflow-x-auto px-2 sm:px-4">
            <button
              onClick={() => {
                if (mode === 'creation' || mode === 'xp') return;
                if (state.creationFinalized) {
                  dispatch({ type: 'SET_MODE', payload: 'xp' });
                } else {
                  dispatch({ type: 'SET_MODE', payload: 'creation' });
                }
              }}
              className={`flex-1 min-w-[85px] min-h-11 py-2 sm:py-2.5 md:py-3 font-titel px-1.5 sm:px-3 text-center font-bold uppercase tracking-normal sm:tracking-wider md:tracking-widest text-[11px] sm:text-xs md:text-sm transition-all flex items-center justify-center select-none ${
                mode === 'creation' || mode === 'xp'
                  ? 'text-gold border-b-2 border-gold'
                  : 'text-leise border-b-2 border-transparent hover:text-schrift'
              }`}
            >
              <span>Charakter</span>
            </button>

            <button
              onClick={() => handleTabClick('play')}
              disabled={!isAdvancementUnlocked}
              className={`flex-1 min-w-[85px] min-h-11 py-2 sm:py-2.5 md:py-3 font-titel px-1.5 sm:px-3 text-center font-bold uppercase tracking-normal sm:tracking-wider md:tracking-widest text-[11px] sm:text-xs md:text-sm transition-all flex items-center justify-center select-none ${
                mode === 'play'
                  ? 'text-gold border-b-2 border-gold'
                  : 'text-leise border-b-2 border-transparent hover:text-schrift'
              } ${!isAdvancementUnlocked ? 'opacity-50 cursor-not-allowed' : ''}`}
              title={!isAdvancementUnlocked ? 'Erst verfügbar wenn Erschaffung abgeschlossen' : ''}
            >
              <span>Spielen</span>
            </button>

            <button
              onClick={() => handleTabClick('combat')}
              disabled={!isAdvancementUnlocked}
              className={`flex-1 min-w-[105px] min-h-11 py-2 sm:py-2.5 md:py-3 font-titel px-1.5 sm:px-3 text-center font-bold uppercase tracking-normal sm:tracking-wider md:tracking-widest text-[11px] sm:text-xs md:text-sm transition-all flex items-center justify-center select-none ${
                mode === 'combat'
                  ? 'text-gold border-b-2 border-gold'
                  : 'text-leise border-b-2 border-transparent hover:text-schrift'
              } ${!isAdvancementUnlocked ? 'opacity-50 cursor-not-allowed' : ''}`}
              title={!isAdvancementUnlocked ? 'Erst verfügbar wenn Erschaffung abgeschlossen' : ''}
            >
              <span>Kampf &amp; Magie</span>
            </button>

            <button
              onClick={() => handleTabClick('inventory')}
              disabled={!isAdvancementUnlocked}
              className={`flex-1 min-w-[85px] min-h-11 py-2 sm:py-2.5 md:py-3 font-titel px-1.5 sm:px-3 text-center font-bold uppercase tracking-normal sm:tracking-wider md:tracking-widest text-[11px] sm:text-xs md:text-sm transition-all flex items-center justify-center select-none ${
                mode === 'inventory'
                  ? 'text-gold border-b-2 border-gold'
                  : 'text-leise border-b-2 border-transparent hover:text-schrift'
              } ${!isAdvancementUnlocked ? 'opacity-50 cursor-not-allowed' : ''}`}
              title={!isAdvancementUnlocked ? 'Erst verfügbar wenn Erschaffung abgeschlossen' : ''}
            >
              <span>Inventar</span>
            </button>

            <button
              onClick={() => handleTabClick('begleiter')}
              disabled={!isAdvancementUnlocked}
              className={`flex-1 min-w-[85px] min-h-11 py-2 sm:py-2.5 md:py-3 font-titel px-1.5 sm:px-3 text-center font-bold uppercase tracking-normal sm:tracking-wider md:tracking-widest text-[11px] sm:text-xs md:text-sm transition-all flex items-center justify-center select-none ${
                mode === 'begleiter'
                  ? 'text-gold border-b-2 border-gold'
                  : 'text-leise border-b-2 border-transparent hover:text-schrift'
              } ${!isAdvancementUnlocked ? 'opacity-50 cursor-not-allowed' : ''}`}
              title={!isAdvancementUnlocked ? 'Erst verfügbar wenn Erschaffung abgeschlossen' : ''}
            >
              <span>Begleiter</span>
            </button>
          </div>

          {/* MAIN CONTENT */}
          {(mode === 'creation' || mode === 'xp') && <CreationView />}
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
