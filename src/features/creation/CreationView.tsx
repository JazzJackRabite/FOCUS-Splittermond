import { regelverstoss, useHausregeln } from '../../fundament/hausregeln';
import React, { useState, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { ChevronsDownUp } from 'lucide-react';

import { ATTRIBUTES, RACES, SKILL_CATEGORIES, SKILL_DATA, REGIONS, MOON_SIGNS } from '../../data/rules';
import { STRENGTHS_DATA } from '../../data/strengths';
import { LANGUAGES_DATA } from '../../data/languages';
import { getStrengthDescription, matchSchool, getResolvedStrengths, getResolvedResources, getResolvedWeaknesses } from '../../utils/gameResourceManager';
import { getSkillXpCost, getAttrXpCost } from '../../utils/costCalculations';
import { useCharacter } from '../../context/CharacterContext';
import { useAttributeHandlers } from '../../hooks/useAttributeHandlers';
import { useItemHandlers } from '../../hooks/useItemHandlers';
import { useMasteryHandlers } from '../../hooks/useMasteryHandlers';
import { useSpellHandlers } from '../../hooks/useSpellHandlers';

import { StatusWidget } from '../../components/character/StatusWidget';
import { AttributeRow } from '../../components/attributes/AttributeRow';
import { SkillRow } from '../../components/skills/SkillRow';
import { ItemList } from '../../components/items/ItemList';
import { PointDisplay } from '../../components/ui/PointDisplay';
import { StatDisplay } from '../../components/ui/StatDisplay';
import { SourceBadge } from '../../components/ui/SourceBadge';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { AddItemModal } from '../../components/modals/AddItemModal';
import { SpellModal } from '../../components/modals/SpellModal';
import { MasteryModal } from '../../components/modals/MasteryModal';
import { XpAddModal } from '../../components/modals/XpAddModal';
import { AdvancementLog } from '../../components/advancement/AdvancementLog';
import { ErschaffungRegelwerk } from '../../components/creation/ErschaffungRegelwerk';
import type { ConfirmDialogState } from '../../hooks/useModals';
import type { RaceData } from '../../types';

// ---------------------------------------------------------------------------

function buildRacialStrengths(newRace: string) {
  const raceEntry = RACES[newRace as keyof typeof RACES] as RaceData | undefined;
  const racialStrengthNames = raceEntry?.strengths ?? [];
  return racialStrengthNames.map((rName) => {
    const data = STRENGTHS_DATA.find((sd) => sd.name === rName);
    return {
      name: rName,
      level: 1,
      isFree: true,
      isRacial: true,
      source: 'creation',
      desc: getStrengthDescription(rName, data ? data.desc : 'Rassenbonus'),
      pointCost: 0,
      sourceRef: 'GRW',
      page: data ? data.page : undefined,
    };
  });
}

// ---------------------------------------------------------------------------

export function CreationView() {
  const { state, dispatch, calc } = useCharacter();

  const {
    mode, name, race, moonSign, homeRegion,
    attrBase, raceBonusAttrs, attrIncrements,
    skillsBase, skillsXp, masteries, strengthsList, resourcesList,
    weaknessesList, languagesList, spellsList,
  } = state;

  const {
    getAttrValue, currentAttributes, xpAvailable, xpSpent, heldengrad,
    derived, robustBonus, maxLP, creationUsage,
    getFreeSlotsForSkill, getUsedFreeTiers,
    detailedFreeSpellSlots, totalFreeSpellSlots,
    totalFreeSlotsAvailable,
    groupedMasteries, groupedSpells, getSkillValue, getSkillTotal,
  } = calc;

  // ---- local modal state ----
  const [showStrengthModal, setShowStrengthModal] = useState(false);
  const [showResourceModal, setShowResourceModal] = useState(false);
  const [showWeaknessModal, setShowWeaknessModal] = useState(false);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [showSpellModal, setShowSpellModal] = useState(false);
  const [masteryModalOpen, setMasteryModalOpen] = useState(false);
  const [showXpModal, setShowXpModal] = useState(false);
  const [activeSkillForMastery, setActiveSkillForMastery] = useState<{ name: string; val: number } | null>(null);
  const [activeSkillForSpell, setActiveSkillForSpell] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState | null>(null);

  // ---- skill/filter state ----
  const [expandedSkills, setExpandedSkills] = useState<Record<string, boolean>>({});
  const [skillFilter, setSkillFilter] = useState<string | null>(null);

  // ---- handlers ----
  const { modAttrBase, modAttrXP, toggleRaceBonus } = useAttributeHandlers({
    state: { attrBase, attrIncrements, raceBonusAttrs, mode, race },
    calc: { creationUsage, heldengrad, xpAvailable },
    dispatch,
  });

  const hausregeln = useHausregeln();

  const modSkill = useCallback((key: string, delta: number) => {
    if (mode === 'creation') {
      const newVal = (skillsBase[key] ?? 0) + delta;
      if (newVal < 0) return;
      if (newVal > 6 && regelverstoss('Fertigkeiten lassen sich bei der Erschaffung höchstens auf 6 setzen.')) return;
      if (delta > 0 && creationUsage.skill >= 55 && regelverstoss('Alle 55 Fertigkeitspunkte sind verteilt.')) return;
    } else {
      const totalVal = (skillsBase[key] ?? 0) + (skillsXp[key] ?? 0);
      if (delta > 0) {
        if (totalVal >= heldengrad.maxSkill && regelverstoss('Höher lässt sich die Fertigkeit auf diesem Heldengrad nicht steigern.')) return;
        const cost = getSkillXpCost(totalVal + 1);
        if (xpAvailable < cost && regelverstoss('Nicht genügend EP!')) return;
      } else {
        if ((skillsXp[key] ?? 0) <= 0) return;
      }
    }
    dispatch({ type: 'MOD_SKILL', payload: { key, delta } });
  }, [mode, skillsBase, skillsXp, creationUsage.skill, heldengrad.maxSkill, xpAvailable, dispatch]);

  const handleRaceChange = useCallback((newRace: string) => {
    if (mode === 'xp') return;
    const hasPurchasedStrengths = strengthsList.some((s) => !s.isRacial && !s.isFree);
    const doChange = () => {
      const racialStrengths = buildRacialStrengths(newRace);
      const regionStrengthName = homeRegion ? `Kulturkunde (${homeRegion})` : '';
      const keptStrengths = strengthsList.filter((s) => s.name === regionStrengthName);
      dispatch({ type: 'SET_RACE', payload: { race: newRace, racialStrengths, keptStrengths } });
      toast.success(`Rasse zu ${newRace} geändert`);
    };
    if (hasPurchasedStrengths && newRace !== race) {
      setConfirmDialog({
        message: `Möchtest du wirklich zu ${newRace} wechseln? Alle gekauften Stärken werden gelöscht!`,
        onConfirm: () => { doChange(); setConfirmDialog(null); },
      });
    } else {
      doChange();
    }
  }, [mode, strengthsList, race, homeRegion, dispatch]);

  const { addListEntry, removeListEntry } = useItemHandlers({
    state: { mode, strengthsList, resourcesList, weaknessesList, languagesList, spellsList },
    calc: { creationUsage, xpAvailable },
    dispatch,
  });

  const { addMastery, removeMastery, removeMasteryById } = useMasteryHandlers({
    xpAvailable,
    activeSkillForMastery,
    mode,
    masteries,
    dispatch,
  });

  const { addSpell, removeSpellByObj, contextSpells } = useSpellHandlers({
    xpAvailable,
    spellsList,
    activeSkillForSpell,
    skillsBase,
    skillsXp,
    mode,
    dispatch,
  });

  // ---- skill filter ----
  const toggleSkill = (skillName: string) => {
    setExpandedSkills((prev) => ({ ...prev, [skillName]: !prev[skillName] }));
  };
  const collapseAllSkills = () => setExpandedSkills({});
  const hasExpandedSkills = Object.values(expandedSkills).some((v) => v);

  const filteredSkills = React.useMemo(() => {
    if (skillFilter === null) {
      return [...SKILL_CATEGORIES.GENERAL, ...SKILL_CATEGORIES.COMBAT, ...SKILL_CATEGORIES.MAGIC];
    }
    return SKILL_CATEGORIES[skillFilter as keyof typeof SKILL_CATEGORIES] ?? SKILL_CATEGORIES.GENERAL;
  }, [skillFilter]);

  // ---- budgets ----
  const strengthBudget = mode === 'creation' ? creationUsage.strengthLimit - creationUsage.strength : xpAvailable;
  const resourceBudget = mode === 'creation' ? creationUsage.resourceLimit - creationUsage.resource : xpAvailable;
  const spellBudget = xpAvailable;

  const raceEntry = RACES[race as keyof typeof RACES] as RaceData | undefined;
  const raceData = raceEntry ?? { gk: 5, mods: {}, freeMods: 0, strengths: [], traits: [] };

  const canUndoAdvancement = (state.advancementHistory?.length ?? 0) > 0;
  const handleUndoAdvancement = () => {
    if (!canUndoAdvancement) return;
    dispatch({ type: 'UNDO_LAST_ADVANCEMENT' });
    toast.success('Letztes Ereignis rückgängig gemacht');
  };

  const handleToggleCreationMode = () => {
    if (mode === 'creation') {
      if (!calc.isCreationComplete) {
        toast.error('Die Charaktererschaffung ist noch nicht vollständig!');
        return;
      }
      setConfirmDialog({
        title: 'Charaktererschaffung abschließen?',
        message: 'Ist die Charaktererschaffung abgeschlossen? Sobald du dies bestätigst, darfst du deinen Charakter steigern und spielen.',
        onConfirm: () => {
          dispatch({ type: 'SET_CREATION_FINALIZED', payload: true });
          dispatch({ type: 'SET_MODE', payload: 'xp' });
          setConfirmDialog(null);
          toast.success('Charaktererschaffung abgeschlossen! Steigerung und Spielen freigeschaltet.');
        },
      });
    } else {
      setConfirmDialog({
        title: 'Erschaffung modifizieren?',
        message: 'Bist du sicher, dass du die Charaktererschaffung modifizieren möchtest?',
        onConfirm: () => {
          dispatch({ type: 'SET_CREATION_FINALIZED', payload: false });
          dispatch({ type: 'SET_MODE', payload: 'creation' });
          setConfirmDialog(null);
        },
      });
    }
  };

  return (
    <>
      {confirmDialog && (
        <ConfirmDialog
          title={confirmDialog.title}
          message={confirmDialog.message}
          onConfirm={confirmDialog.onConfirm}
          onCancel={() => setConfirmDialog(null)}
        />
      )}

      {/* MODALS */}
      {showStrengthModal && (
        <AddItemModal
          title="Stärke" items={getResolvedStrengths()} onClose={() => setShowStrengthModal(false)}
          onAdd={(n, l, d, c, s, p, f) => addListEntry('strength', n, l, d, c, s, p, f)}
          mode={mode} type="strength" budget={strengthBudget} existingItems={strengthsList}
        />
      )}
      {showResourceModal && (
        <AddItemModal
          title="Ressource" items={getResolvedResources().list} onClose={() => setShowResourceModal(false)}
          onAdd={(n, l, d, c, s, p, f) => addListEntry('resource', n, l, d, c, s, p, f)}
          mode={mode} type="resource" budget={resourceBudget} existingItems={resourcesList}
        />
      )}
      {showWeaknessModal && (
        <AddItemModal
          title="Schwäche" items={getResolvedWeaknesses().list} onClose={() => setShowWeaknessModal(false)}
          onAdd={(n, l, d, c, s, p, f) => addListEntry('weakness', n, l, d, c, s, p, f)}
          mode={mode} type="weakness" budget={0} existingItems={weaknessesList}
        />
      )}
      {showLanguageModal && (
        <AddItemModal
          title="Sprache" items={LANGUAGES_DATA} onClose={() => setShowLanguageModal(false)}
          onAdd={(n, l, d, c, s, p, f) => addListEntry('language', n, l, d, c, s, p, f)}
          mode={mode} type="language" budget={xpAvailable} existingItems={languagesList}
        />
      )}
      {showSpellModal && activeSkillForSpell && (
        <SpellModal
          availableSpells={contextSpells} onClose={() => setShowSpellModal(false)}
          onAdd={addSpell} budget={spellBudget} freeSlots={detailedFreeSpellSlots}
          schoolName={activeSkillForSpell}
        />
      )}
      {masteryModalOpen && activeSkillForMastery && (
        <MasteryModal
          skillName={activeSkillForMastery.name}
          skillVal={activeSkillForMastery.val}
          currentFreeTiers={getUsedFreeTiers(activeSkillForMastery.name)}
          onClose={() => setMasteryModalOpen(false)}
          onAdd={addMastery}
          existingMasteries={masteries[activeSkillForMastery.name] ?? []}
          allCharacterMasteries={Object.values(masteries).flat()}
          skills={Object.fromEntries(Object.keys(SKILL_DATA).map((s) => [s, getSkillValue(s)]))}
          resources={resourcesList}
          culture={homeRegion}
          race={race}
          creationMode={mode === 'creation'}
          creationBudget={3 - creationUsage.creationMasteries}
          spells={spellsList}
        />
      )}
      {showXpModal && (
        <XpAddModal
          onClose={() => setShowXpModal(false)}
          onAdd={(val, note) => {
            dispatch({ type: 'ADD_XP_WITH_NOTE', payload: { amount: val, note } });
          }}
        />
      )}

      <div className="p-4 lg:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 flex-grow relative z-10 w-full">
        {/* LEFT COLUMN */}
        <div className="lg:col-span-5 space-y-8">
          <StatusWidget
            mode={mode} creationUsage={creationUsage} xpAvailable={xpAvailable}
            xpTotal={state.xpTotal}
            heldengrad={heldengrad}
            freeMasteries={totalFreeSlotsAvailable} freeSpells={totalFreeSpellSlots}
            onUndo={handleUndoAdvancement}
            canUndo={canUndoAdvancement}
            onAddXp={() => setShowXpModal(true)}
            onToggleCreationMode={handleToggleCreationMode}
          />

          {/* Character Info */}
          <div className="bg-white bg-opacity-60 p-5 rounded border border-[#d1c4b0] shadow-sm relative">
            <h3 className="font-bold text-xl mb-4 border-b border-[#C5A059] pb-2 fantasy-font text-[#1B365D]">Charakter</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs uppercase text-gray-500 font-bold mb-1">Name</label>
                <input
                  type="text" value={name} onChange={(e) => dispatch({ type: 'SET_NAME', payload: e.target.value })}
                  disabled={mode !== 'creation'}
                  className={`w-full border-2 border-[#d1c4b0] rounded px-2 focus:outline-none focus:border-[#1B365D] font-serif font-bold text-2xl py-1 text-[#2C1810] ${
                    mode !== 'creation' ? 'bg-gray-100 text-gray-600 cursor-not-allowed' : 'bg-white'
                  }`}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs uppercase text-gray-500 mb-1 font-bold">Heimatregion</label>
                  <select
                    value={homeRegion}
                    onChange={(e) => {
                      const newRegion = e.target.value;
                      if (newRegion) {
                        const kulturkundeName = `Kulturkunde (${newRegion})`;
                        const alreadyHas = strengthsList.some((s) => s.name === kulturkundeName);
                        if (!alreadyHas) toast.success(`Kulturkunde (${newRegion}) hinzugefügt`);
                      }
                      dispatch({ type: 'SET_HOME_REGION', payload: newRegion });
                    }}
                    className={`w-full border-2 border-[#d1c4b0] rounded px-2 focus:outline-none focus:border-[#1B365D] text-sm text-[#2C1810] py-1 ${
                      mode !== 'creation' ? 'bg-gray-100 text-gray-600 cursor-not-allowed' : 'bg-white'
                    }`}
                    disabled={mode !== 'creation'}
                  >
                    <option value="">-- Wählen --</option>
                    {REGIONS.map((reg) => <option key={reg} value={reg}>{reg}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs uppercase text-gray-500 mb-1 font-bold">Mondzeichen</label>
                  <select
                    value={moonSign}
                    onChange={(e) => dispatch({ type: 'SET_MOON_SIGN', payload: e.target.value })}
                    className={`w-full border-2 border-[#d1c4b0] rounded px-2 focus:outline-none focus:border-[#1B365D] text-sm text-[#2C1810] py-1 ${
                      mode !== 'creation' ? 'bg-gray-100 text-gray-600 cursor-not-allowed' : 'bg-white'
                    }`}
                    disabled={mode !== 'creation'}
                  >
                    <option value="">-- Wählen --</option>
                    {MOON_SIGNS.map((sign) => <option key={sign} value={sign}>{sign}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs uppercase text-gray-500 font-bold mb-2">Rasse</label>
                <div className={`flex flex-wrap gap-2 ${mode !== 'creation' ? 'opacity-50 pointer-events-none' : ''}`}>
                  {Object.keys(RACES).map((r) => (
                    <button
                      key={r} onClick={() => handleRaceChange(r)}
                      disabled={mode !== 'creation'}
                      className={`px-3 py-1 text-sm rounded shadow-sm transition-all ${race === r ? 'bg-[#1B365D] text-white ring-2 ring-[#C5A059] ring-offset-1' : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'}`}
                    >{r}</button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6 bg-[#fdfbf7] p-3 rounded border border-dashed border-gray-400 text-sm text-gray-700">
              <div className="flex justify-between mb-2 border-b border-gray-200 pb-1">
                <span><strong>GK:</strong> {raceData.gk}</span>
                <span>
                  <strong>Mods:</strong>{' '}
                  {Object.entries(raceData.mods).map(([k, v]) => `${k} ${(v as number) > 0 ? '+' + v : v}`).join(', ') || '-'}
                </span>
              </div>
              <div className={`mb-2 ${mode !== 'creation' ? 'opacity-50 pointer-events-none' : ''}`}>
                <strong className="block mb-1 text-[#1B365D]">Wählbare Boni: {raceData.freeMods}</strong>
                <div className="flex flex-wrap gap-1">
                  {Object.keys(ATTRIBUTES).map((attr) => {
                    const isSelected = raceBonusAttrs.includes(attr);
                    if (race === 'Varg' && attr === 'STA') return null;
                    return (
                      <button
                        key={attr} onClick={() => toggleRaceBonus(attr)}
                        disabled={mode !== 'creation'}
                        className={`text-[10px] px-2 py-1 border rounded uppercase font-bold ${isSelected ? 'bg-[#1B365D] text-white border-[#1B365D]' : 'bg-white text-gray-500 border-gray-300 hover:bg-gray-100'}`}
                      >{attr}</button>
                    );
                  })}
                </div>
              </div>
              <div>
                <strong className="block mb-1 text-[#1B365D]">Stärken:</strong>
                <ul className="list-disc list-inside text-xs pl-1">
                  {raceData.strengths.map((s) => <li key={s}>{s.replace(/ \(1\)$/, '')}</li>)}
                </ul>
              </div>
            </div>
          </div>

          {/* Kultur & Abstammung nach Regelwerk (nur mit geladenen Regelpaketen) */}
          <ErschaffungRegelwerk />

          {/* Attributes */}
          <div className="bg-white bg-opacity-60 p-4 sm:p-5 rounded border border-[#d1c4b0] shadow-sm relative overflow-hidden">
            <div className="flex justify-between items-center border-b border-[#C5A059] pb-2 mb-4">
              <h3 className="font-bold text-xl fantasy-font text-[#1B365D]">Attribute</h3>
              <PointDisplay current={creationUsage.attr} max={18} label="Punkte" mode={mode} />
            </div>
            <div className="space-y-1">
              {Object.keys(ATTRIBUTES).map((key) => {
                const base = attrBase[key as keyof typeof attrBase] ?? 0;
                const total = getAttrValue(key);
                const raceMod = (raceData.mods[key] as number | undefined) ?? 0;
                const bonus = raceBonusAttrs.includes(key) ? 1 : 0;
                const startValue = base + raceMod + bonus;
                const currentInc = attrIncrements[key as keyof typeof attrIncrements] ?? 0;
                const nextCost = getAttrXpCost(currentInc);
                const canDecrease = mode === 'creation' ? base > 1 : currentInc > 0;
                return (
                  <AttributeRow
                    key={key} attrKey={key} total={total} startValue={startValue}
                    onIncrease={() => mode === 'creation' ? modAttrBase(key, 1) : modAttrXP(key, 1)}
                    onDecrease={() => mode === 'creation' ? modAttrBase(key, -1) : modAttrXP(key, -1)}
                    canIncrease={hausregeln || (mode === 'creation' ? base < 3 && creationUsage.attr < 18 : currentInc < heldengrad.maxAttrMod && xpAvailable >= nextCost)}
                    canDecrease={canDecrease}
                    cost={mode === 'xp' && currentInc < heldengrad.maxAttrMod ? nextCost : 0}
                    mode={mode}
                  />
                );
              })}
            </div>
          </div>

          {/* Derived Stats */}
          <div className="bg-white bg-opacity-60 p-5 rounded border border-[#d1c4b0] shadow-sm relative print:break-inside-avoid">
            <h3 className="font-bold text-xl mb-4 border-b border-[#C5A059] pb-2 fantasy-font text-[#1B365D]">Abgeleitete Werte</h3>
            <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
              <StatDisplay label="GSW" value={derived.GSW} subLabel="Geschw." />
              <StatDisplay label="INI" value={derived.INI} subLabel="Initiative" />
              <StatDisplay
                label="LP"
                value={maxLP}
                subLabel="Lebenspunkte"
                bonus={robustBonus > 0 ? robustBonus : undefined}
                tooltip={[
                  `Basis-LP (GK + KON): ${derived.LP}`,
                  robustBonus > 0 ? `Robust-Bonus: +${robustBonus}` : 'Kein Robust-Bonus',
                  state.playState.lpModifier ? `LP-Modifikator: ${state.playState.lpModifier > 0 ? '+' : ''}${state.playState.lpModifier}` : undefined,
                  `Gesamt: ${maxLP}`,
                ].filter(Boolean).join('\n')}
              />
              <StatDisplay label="FO" value={calc.maxFO} subLabel="Fokus" bonus={calc.maxFO > derived.FO ? calc.maxFO - derived.FO : undefined} />
              <StatDisplay label="VTD" value={derived.VTD} subLabel="Verteidigung" />
              <StatDisplay label="SR" value={derived.SR} subLabel="Schadensred." />
              <StatDisplay label="GW" value={derived.GW} subLabel="Geist. Wid." />
              <StatDisplay label="KW" value={derived.KW} subLabel="Körp. Wid." />
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="lg:col-span-7 space-y-8">
          {/* Skills */}
          <div className="bg-white bg-opacity-60 p-5 rounded border border-[#d1c4b0] shadow-sm relative">
            <div className="flex justify-between items-center border-b border-[#C5A059] pb-2 mb-4 flex-wrap gap-2">
              <h3 className="font-bold text-xl fantasy-font text-[#1B365D]">Fertigkeiten</h3>
              <div className="flex items-center gap-4">
                <PointDisplay current={creationUsage.skill} max={55} label="Punkte" mode={mode} />
                <div className="flex gap-1 no-print items-center">
                  {[
                    { k: 'ALL', l: 'Alle' },
                    { k: 'GENERAL', l: 'Allgemein' },
                    { k: 'COMBAT', l: 'Kampf' },
                    { k: 'MAGIC', l: 'Magie' },
                  ].map((cat) => {
                    const isSelected = cat.k === 'ALL' ? skillFilter === null : skillFilter === cat.k;
                    return (
                      <button
                        key={cat.k}
                        onClick={() => setSkillFilter(cat.k === 'ALL' ? null : (skillFilter === cat.k ? null : cat.k))}
                        className={`px-2.5 py-1 text-xs rounded-md shadow-xs transition-all font-bold cursor-pointer ${
                          isSelected
                            ? 'bg-[#1B365D] text-[#FBEFCE] border border-[#C5A059] ring-1 ring-[#C5A059]'
                            : 'bg-[#1E2536] text-[#A3A096] border border-[#3A4258] hover:text-[#F5F2EA] hover:bg-[#283247]'
                        }`}
                      >
                        {cat.l}
                      </button>
                    );
                  })}
                  {hasExpandedSkills && (
                    <button onClick={collapseAllSkills} className="text-gray-400 hover:text-[#F5F2EA] px-1 py-1 ml-1 cursor-pointer transition-colors" title="Alle einklappen">
                      <ChevronsDownUp size={16} />
                    </button>
                  )}
                </div>
              </div>
            </div>
            <div className="space-y-1 h-[500px] overflow-y-auto pr-2 custom-scrollbar">
              {filteredSkills.map((skill) => {
                const val = getSkillValue(skill);
                const totalValue = getSkillTotal(skill);
                const cost = getSkillXpCost(val + 1);
                const currentMasteries = masteries[skill] ?? [];
                const currentSpells = spellsList.filter((s) => s.school === skill || matchSchool(s.school, skill));
                const freeSlots = getFreeSlotsForSkill(skill);
                const freeSpellSlotsCount = (detailedFreeSpellSlots[skill] ?? []).length;
                const attrs = SKILL_DATA[skill];
                return (
                  <SkillRow
                    key={skill} name={skill} val={val} totalValue={totalValue}
                    onIncrease={() => modSkill(skill, 1)} onDecrease={() => modSkill(skill, -1)}
                    canIncrease={hausregeln || (mode === 'creation' ? val < 6 && creationUsage.skill < 55 : val < heldengrad.maxSkill && xpAvailable >= cost)}
                    canDecrease={mode === 'creation' ? (skillsBase[skill] ?? 0) > 0 : (skillsXp[skill] ?? 0) > 0}
                    cost={mode === 'xp' && val < heldengrad.maxSkill ? cost : 0}
                    masteries={currentMasteries}
                    onAddMastery={() => { setActiveSkillForMastery({ name: skill, val }); setMasteryModalOpen(true); }}
                    onRemoveMastery={(idx) => removeMastery(skill, idx)}
                    onRemoveMasteryById={(id) => removeMasteryById(skill, id)}
                    freeSlots={freeSlots}
                    onAddSpell={() => { setActiveSkillForSpell(skill); setShowSpellModal(true); }}
                    spells={currentSpells}
                    onRemoveSpell={removeSpellByObj}
                    freeSpellSlotsCount={freeSpellSlotsCount}
                    attrs={attrs}
                    currentAttributes={currentAttributes}
                    isOpen={!!expandedSkills[skill]}
                    onToggle={() => toggleSkill(skill)}
                    creationMode={mode === 'creation'}
                    creationBudget={3 - creationUsage.creationMasteries}
                    mode={mode}
                  />
                );
              })}
            </div>
          </div>

          {/* Strengths & Weaknesses */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
            <div className="bg-white bg-opacity-60 p-5 rounded border border-[#d1c4b0] shadow-sm relative flex flex-col">
              <div className="flex justify-between items-center border-b border-[#C5A059] pb-2 mb-2">
                <h3 className="font-bold text-lg fantasy-font text-[#1B365D] truncate min-w-0">Stärken</h3>
                <button onClick={() => setShowStrengthModal(true)} className="text-xs bg-[#1B365D] hover:bg-[#254572] border border-[#C5A059]/50 px-2.5 py-1 rounded-md no-print font-bold text-[#FBEFCE] shrink-0 ml-2 transition-colors cursor-pointer shadow-xs">+ Hinzufügen</button>
              </div>
              <PointDisplay current={creationUsage.strength} max={creationUsage.strengthLimit} label="Erstellung" mode={mode} />
              <div className="flex-grow">
                <ItemList items={strengthsList} onDelete={(idx) => removeListEntry('strength', idx)} typeLabel="Stärken" showCosts xpMultiplier={7} mode={mode} />
              </div>
            </div>
            <div className="bg-white bg-opacity-60 p-5 rounded border border-[#d1c4b0] shadow-sm relative flex flex-col">
              <div className="flex justify-between items-center border-b border-[#C5A059] pb-2 mb-2">
                <h3 className="font-bold text-lg fantasy-font text-[#1B365D] truncate min-w-0">Schwächen</h3>
                <button onClick={() => setShowWeaknessModal(true)} className="text-xs bg-[#1B365D] hover:bg-[#254572] border border-[#C5A059]/50 px-2.5 py-1 rounded-md no-print font-bold text-[#FBEFCE] shrink-0 ml-2 transition-colors cursor-pointer shadow-xs">+ Hinzufügen</button>
              </div>
              <div className="flex-grow">
                <ItemList items={weaknessesList} onDelete={(idx) => removeListEntry('weakness', idx)} typeLabel="Schwächen" showCosts={false} mode={mode} />
              </div>
            </div>
          </div>

          {/* Resources & Languages */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
            <div className="bg-white bg-opacity-60 p-5 rounded border border-[#d1c4b0] shadow-sm relative flex flex-col">
              <div className="flex justify-between items-center border-b border-[#C5A059] pb-2 mb-2">
                <h3 className="font-bold text-lg fantasy-font text-[#1B365D] truncate min-w-0">Ressourcen</h3>
                <button onClick={() => setShowResourceModal(true)} className="text-xs bg-[#1B365D] hover:bg-[#254572] border border-[#C5A059]/50 px-2.5 py-1 rounded-md no-print font-bold text-[#FBEFCE] shrink-0 ml-2 transition-colors cursor-pointer shadow-xs">+ Hinzufügen</button>
              </div>
              <PointDisplay current={creationUsage.resource} max={creationUsage.resourceLimit} label="Erstellung" mode={mode} />
              <div className="flex-grow">
                <ItemList items={resourcesList} onDelete={(idx) => removeListEntry('resource', idx)} typeLabel="Ressourcen" showCosts xpMultiplier={7} mode={mode} />
              </div>
            </div>
            <div className="bg-white bg-opacity-60 p-5 rounded border border-[#d1c4b0] shadow-sm relative flex flex-col">
              <div className="flex justify-between items-center border-b border-[#C5A059] pb-2 mb-2">
                <h3 className="font-bold text-lg fantasy-font text-[#1B365D] truncate min-w-0">Sprachen</h3>
                <button onClick={() => setShowLanguageModal(true)} className="text-xs bg-[#1B365D] hover:bg-[#254572] border border-[#C5A059]/50 px-2.5 py-1 rounded-md no-print font-bold text-[#FBEFCE] shrink-0 ml-2 transition-colors cursor-pointer shadow-xs">+ Hinzufügen</button>
              </div>
              <div className="flex-grow">
                <ItemList items={languagesList} onDelete={(idx) => removeListEntry('language', idx)} typeLabel="Sprachen" showCosts mode={mode} />
              </div>
            </div>
          </div>

          {/* Learned Skills (Masteries + Spells) */}
          <div className="bg-white bg-opacity-60 p-5 rounded border border-[#d1c4b0] shadow-sm relative">
            <div className="flex justify-between items-center border-b border-[#C5A059] pb-2 mb-4">
              <h3 className="font-bold text-xl fantasy-font text-[#1B365D]">Gelernte Fähigkeiten</h3>
            </div>
            <div className="space-y-6">
              {groupedMasteries.length > 0 && (
                <div>
                  <h4 className="font-bold text-lg text-[#1B365D] border-b border-gray-300 pb-1 mb-2">Meisterschaften</h4>
                  <div className="space-y-4">
                    {groupedMasteries.map((group, i) => (
                      <div key={`mgroup-${i}`} className="bg-[#161B26] rounded-lg border border-[#3A4258] overflow-hidden">
                        <div className="bg-[#1B263B] px-3 py-1 font-bold text-[#FBEFCE] border-b border-[#3A4258] text-sm">{group.skill}</div>
                        <div className="p-2 space-y-1">
                          {group.items.map((m, idx) => {
                            const canDeleteMastery =
                              mode === 'creation' ||
                              (mode === 'xp' && !m.isCreationBonus && m.source !== 'Erschaffung');
                            return (
                              <div key={idx} className="flex justify-between items-start text-xs border-b border-gray-100 last:border-0 pb-1 last:pb-0">
                                <div>
                                  <span className="font-bold text-[#F5F2EA]">
                                    {m.name} {!/\(S\d+\)/.test(m.name) && `(S${m.tier})`}
                                  </span>
                                  <SourceBadge
                                    source={m.source}
                                    page={m.page}
                                    tooltipData={{
                                      title: m.name,
                                      description: m.userNote
                                        ? [m.desc, `📝 ${m.userNote}`].filter(Boolean).join('\n\n')
                                        : m.desc,
                                    }}
                                  />
                                </div>
                                <div className="text-gray-400 no-print flex items-center gap-2">
                                  <span>{m.cost} EP</span>
                                  {canDeleteMastery && (
                                    <button onClick={() => removeMasteryById(m.skill ?? '', m.id)} className="text-red-400 hover:text-red-700 font-bold px-1" title="Entfernen">×</button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {groupedSpells.length > 0 && (
                <div>
                  <h4 className="font-bold text-lg text-[#1B365D] border-b border-gray-300 pb-1 mb-2">Zauber</h4>
                  <div className="space-y-4">
                    {groupedSpells.map((group, i) => (
                      <div key={`sgroup-${i}`} className="bg-[#161B26] rounded-lg border border-[#3A4258] overflow-hidden">
                        <div className="bg-[#1B263B] px-3 py-1 font-bold text-[#8FB3D5] border-b border-[#3A4258] text-sm">{group.skill}</div>
                        <div className="p-2 space-y-1">
                          {group.items.map((s, idx) => {
                            const canDeleteSpell = mode === 'creation' || s.sourceMode === 'xp';
                            const spellEpCost = s.isFree
                              ? 0
                              : (s.xpCost !== undefined
                                  ? s.xpCost
                                  : (typeof s.cost === 'number' ? s.cost : (s.grade === 0 ? 1 : s.grade * 3)));
                            return (
                              <div key={idx} className="flex justify-between items-start text-xs border-b border-gray-100 last:border-0 pb-1 last:pb-0">
                                <div>
                                  <span className="font-bold text-[#8FB3D5]">{s.name} (Grad {s.grade})</span>
                                  <SourceBadge source={s.source} page={s.page} tooltipData={{ title: s.name, description: s.description }} />
                                </div>
                                <div className="text-gray-400 no-print flex items-center gap-2">
                                  <span title={s.isFree ? 'Gratis-Zauber (0 EP)' : `${spellEpCost} EP`}>{spellEpCost} EP</span>
                                  {canDeleteSpell && (
                                    <button onClick={() => removeSpellByObj(s)} className="text-red-400 hover:text-red-700 font-bold px-1" title="Entfernen">×</button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* FULL WIDTH ADVANCEMENT PROTOCOL (XP MODE ONLY) */}
        {mode === 'xp' && (
          <div className="lg:col-span-12 w-full">
            <AdvancementLog
              entries={state.advancementLog ?? []}
              xpTotal={state.xpTotal}
              xpSpent={xpSpent}
              xpAvailable={xpAvailable}
              onUndo={handleUndoAdvancement}
              canUndo={canUndoAdvancement}
              onAddXpWithNote={(amount, note) => {
                dispatch({ type: 'ADD_XP_WITH_NOTE', payload: { amount, note } });
              }}
              onEditTotalXp={(newTotal, note) => {
                dispatch({ type: 'EDIT_XP_TOTAL_WITH_NOTE', payload: { newTotal, note } });
              }}
              onAddCustomLog={(entry) => {
                dispatch({ type: 'ADD_ADVANCEMENT_LOG', payload: entry });
              }}
              onDeleteLogEntry={(id) => {
                dispatch({ type: 'REMOVE_ADVANCEMENT_LOG_ENTRY', payload: id });
              }}
            />
          </div>
        )}
      </div>
    </>
  );
}
