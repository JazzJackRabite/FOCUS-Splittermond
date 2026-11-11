import { useHausregeln } from '../../fundament/hausregeln';
import React, { useState, useEffect, useMemo } from 'react';
import { SPELLS_DB } from '../../data/spells';
import { getSpellDescription } from '../../utils/gameResourceManager';
import { parseSpellPermissibleModifications } from '../../utils/magicRules';
import type { Spell } from '../../types';

interface SpellModalProps {
  availableSpells: Spell[];
  onClose: () => void;
  onAdd: (spell: Spell, isFree: boolean, cost: number) => void;
  budget: number;
  freeSlots: Record<string, number[]>;
  schoolName: string | null;
}

export const SpellModal: React.FC<SpellModalProps> = ({
  availableSpells = [],
  onClose,
  onAdd,
  budget,
  freeSlots,
  schoolName,
}) => {
  const [search, setSearch] = useState('');
  const [selectedSpellName, setSelectedSpellName] = useState(
    availableSpells.length > 0 ? availableSpells[0].name : 'custom',
  );
  const [customName, setCustomName] = useState('');
  const [customGrade, setCustomGrade] = useState(0);
  const [customDesc, setCustomDesc] = useState('');
  const [customSource, setCustomSource] = useState('');
  const [isFree, setIsFree] = useState(false);

  const resolvedSpells = React.useMemo(() => {
    return availableSpells.map((s) => ({
      ...s,
      description: getSpellDescription(s.name, s.school, s.description || ''),
    }));
  }, [availableSpells]);

  const filteredSpells = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return resolvedSpells;
    return resolvedSpells.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.school && s.school.toLowerCase().includes(q)) ||
        (s.description && s.description.toLowerCase().includes(q)),
    );
  }, [resolvedSpells, search]);

  // Keep selectedSpellName synchronized with filteredSpells
  useEffect(() => {
    if (selectedSpellName === 'custom') return;
    const exists = filteredSpells.some((s) => s.name === selectedSpellName);
    if (!exists) {
      if (filteredSpells.length > 0) {
        setSelectedSpellName(filteredSpells[0].name);
      } else {
        setSelectedSpellName('custom');
      }
    }
  }, [filteredSpells, selectedSpellName]);

  const isCustom = selectedSpellName === 'custom';

  const selectedSpell: Spell | undefined = isCustom
    ? {
        name: customName,
        school: schoolName ?? '',
        grade: customGrade,
        cost: '-',
        description: customDesc,
        source: customSource || 'Eigen',
      }
    : availableSpells.find((s) => s.name === selectedSpellName);

  let xpCost = 0;
  let canBeFree = false;
  let usedSlotGrade: number | null = null;

  if (selectedSpell) {
    xpCost = selectedSpell.grade === 0 ? 1 : selectedSpell.grade * 3;
    const school = selectedSpell.school || schoolName || ''; 
    const schoolSlots = freeSlots[school] ?? [];
    const validSlotIndex = schoolSlots.findIndex(
      (slotGrade) => slotGrade >= selectedSpell.grade,
    );
    if (validSlotIndex !== -1) {
      canBeFree = true;
      usedSlotGrade = schoolSlots[validSlotIndex];
    }
  }

  useEffect(() => {
    if (canBeFree && !isFree) setIsFree(true);
    if (!canBeFree && isFree) setIsFree(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSpellName, canBeFree, customGrade]);

  const finalCost = isFree ? 0 : xpCost;
  const hausregeln = useHausregeln();
  const isAffordable = isFree || finalCost <= budget;
  const isValid =
    selectedSpell && (isCustom ? customName.trim() !== '' : !!selectedSpell.name);

  const handleAdd = () => {
    if (isValid && selectedSpell) {
      onAdd(selectedSpell, isFree, finalCost);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-3 sm:p-4">
      <div
        id="spell-modal-dialog"
        className="bg-[#faf4e6] dark-theme-panel rounded-xl border-2 border-[#C5A059] shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden"
      >
        <div className="px-5 py-4 border-b border-[#C5A059] shrink-0">
          <h3 className="fantasy-font text-xl text-[#1B365D] tracking-wide uppercase">
            Zauber hinzufügen
          </h3>
          <div className="text-xs text-stone-600 mt-0.5">
            für {schoolName || 'Zauber'}
          </div>
        </div>

        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4 custom-scrollbar modal-body-scroll">
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-xs uppercase text-gray-500 font-semibold tracking-wider">
                Auswahl &amp; Suche
              </label>
              <span className="text-[11px] text-gray-500 font-medium">
                {filteredSpells.length} Treffer
              </span>
            </div>
            <div className="relative mb-2">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="🔍 Zauber filtern..."
                className="w-full p-2 pr-8 border border-[#d1c4b0] rounded-lg bg-white text-xs text-[#2C1810] focus:ring-1 focus:ring-[#1B365D] focus:border-[#1B365D] outline-none"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#8B263E] text-xs font-bold w-5 h-5 flex items-center justify-center rounded-md hover:bg-black/5 cursor-pointer"
                  title="Suche leeren"
                >
                  ✕
                </button>
              )}
            </div>
            <select
              value={selectedSpellName}
              onChange={(e) => setSelectedSpellName(e.target.value)}
              className="w-full p-2 border border-[#d1c4b0] rounded-lg bg-white text-[#2C1810] text-sm focus:ring-1 focus:ring-[#1B365D] focus:border-[#1B365D] outline-none"
            >
              {filteredSpells.map((s, idx) => (
                <option key={`${s.school || ''}-${s.name}-${s.grade}-${idx}`} value={s.name}>
                  {s.name} (Grad {s.grade})
                </option>
              ))}
              <option value="custom">-- Eigener Zauber --</option>
            </select>
          </div>

          {isCustom && (
            <div className="space-y-2 bg-white/80 p-3 rounded-lg border border-[#C5A059] shadow-xs">
              <div>
                <label className="block text-xs uppercase text-gray-600 font-semibold mb-1">Name *</label>
                <input
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  className="w-full p-2 border border-[#d1c4b0] rounded-lg bg-white text-[#2C1810] text-sm"
                  placeholder="Zaubername"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs uppercase text-gray-600 font-semibold mb-1">Grad</label>
                <select
                  value={customGrade}
                  onChange={(e) => setCustomGrade(parseInt(e.target.value))}
                  className="w-full p-2 border border-[#d1c4b0] rounded-lg bg-white text-[#2C1810] text-sm"
                >
                  {[0, 1, 2, 3, 4, 5].map((g) => (
                    <option key={g} value={g}>
                      Grad {g}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs uppercase text-gray-600 font-semibold mb-1">
                  Beschreibung
                </label>
                <input
                  type="text"
                  value={customDesc}
                  onChange={(e) => setCustomDesc(e.target.value)}
                  className="w-full p-2 border border-[#d1c4b0] rounded-lg bg-white text-[#2C1810] text-sm"
                  placeholder="Kurzbeschreibung"
                />
              </div>
              <div>
                <label className="block text-xs uppercase text-gray-600 font-semibold mb-1">Quelle</label>
                <input
                  type="text"
                  value={customSource}
                  onChange={(e) => setCustomSource(e.target.value)}
                  className="w-full p-2 border border-[#d1c4b0] rounded-lg bg-white text-[#2C1810] text-sm"
                  placeholder="z.B. Eigen, Erweiterungsband..."
                />
              </div>
            </div>
          )}

          {!isCustom && selectedSpell && (() => {
            const mods = parseSpellPermissibleModifications(selectedSpell.description, selectedSpell.name);
            return (
              <div className="bg-white/80 p-2.5 rounded-lg border border-[#d1c4b0] text-xs space-y-1 dark-theme-slot-inactive">
                <div className="flex justify-between">
                  <span className="text-gray-500">Schule:</span>
                  <span className="font-bold text-[#1B365D]">{selectedSpell.school || schoolName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Grad:</span>
                  <span className="font-bold text-[#1B365D]">{selectedSpell.grade}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Fokus-Kosten:</span>
                  <span className="font-medium text-[#2C1810]">{String(selectedSpell.cost)}</span>
                </div>
                {selectedSpell.page && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Seite:</span>
                    <span className="font-medium text-[#2C1810]">GRW S. {selectedSpell.page}</span>
                  </div>
                )}
                {mods.allowedNames.length > 0 && (
                  <div className="pt-1.5 border-t border-gray-200 mt-1">
                    <span className="text-gray-500 font-semibold block mb-1">Zulässige Modifikationen:</span>
                    <div className="flex flex-wrap gap-1">
                      {mods.allowedNames.map((modName) => (
                        <span
                          key={modName}
                          className="px-1.5 py-0.5 bg-[#f3e5cf] text-[#1B365D] border border-[#C5A059]/40 rounded text-[10px] font-semibold"
                        >
                          {modName}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {selectedSpell.description && (
                  <div className="text-gray-600 italic pt-1 border-t border-gray-200 mt-1 whitespace-pre-line">
                    {selectedSpell.description}
                  </div>
                )}
              </div>
            );
          })()}

          {/* Free spell slot */}
          <div
            id="spell-modal-free-slot"
            className={`p-3 rounded-lg border transition-all ${
              canBeFree
                ? 'bg-[#f3e5cf]/60 border-[#C5A059]/50 dark-theme-slot-active'
                : 'bg-stone-100 border-[#d1c4b0] dark-theme-slot-inactive'
            }`}
          >
            <label
              className={`flex items-center space-x-2 ${
                canBeFree ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'
              }`}
            >
              <input
                type="checkbox"
                checked={isFree}
                onChange={(e) => setIsFree(e.target.checked)}
                disabled={!canBeFree}
                className="w-4 h-4 text-[#1B365D] accent-[#C5A059] rounded"
              />
              <span className="font-bold text-[#1B365D]">Gratis-Slot nutzen</span>
            </label>
            {!canBeFree && selectedSpell && (
              <div className="text-xs text-[#8B263E] font-medium mt-1 ml-6">
                Kein passender Gratis-Slot für {selectedSpell.school || schoolName} (Grad{' '}
                {selectedSpell.grade}) verfügbar.
              </div>
            )}
          </div>

          <div className="flex justify-between items-baseline border-t border-[#d1c4b0] pt-3">
            <span className="text-xs uppercase text-stone-500 font-semibold tracking-wider">Kosten:</span>
            <span
              className={`font-bold font-mono text-lg ${isAffordable ? 'text-[#C5A059]' : 'text-[#8B263E]'}`}
            >
              {finalCost} EP
            </span>
          </div>
          {!isAffordable && selectedSpell && (
            <div className="text-xs text-[#8B263E] font-bold text-center border border-[#8B263E]/40 bg-[#f3e5cf] p-1.5 rounded-lg shadow-2xs">
              Nicht genügend EP verfügbar!
            </div>
          )}
        </div>

        <div className="px-5 py-3.5 border-t border-[#C5A059]/40 bg-black/5 flex justify-end space-x-2 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-[#1B365D] hover:bg-[#ebdcc4] rounded-lg font-semibold text-sm transition-colors cursor-pointer shrink-0"
          >
            Abbrechen
          </button>
          <button
            onClick={handleAdd}
            disabled={(!isAffordable && !hausregeln) || !isValid}
            className="px-5 py-2 bg-[#1B365D] hover:bg-[#2a4f7e] text-white rounded-lg font-bold text-sm shadow-xs border border-[#C5A059]/60 disabled:opacity-50 disabled:cursor-not-allowed shrink-0 transition-all cursor-pointer"
          >
            Hinzufügen
          </button>
        </div>
      </div>
    </div>
  );
};