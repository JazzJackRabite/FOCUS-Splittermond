import React from 'react';
import { SourceBadge } from '../ui/SourceBadge';
import { ATTRIBUTES, SKILL_CATEGORIES } from '../../data/rules';
import { MASTERIES_DB, GENERAL_COMBAT_MASTERIES } from '../../data/masteries';
import { getMasteryDescription } from '../../utils/gameResourceManager';
import { grossmeisterAb } from '../../regelwerk/bruecke';
import type { Mastery, Spell, AppMode } from '../../types';

interface SkillRowProps {
  name: string;
  val: number;
  totalValue: number | null;
  onIncrease: () => void;
  onDecrease: () => void;
  canIncrease: boolean;
  cost: number;
  masteries: Mastery[];
  onAddMastery: () => void;
  onRemoveMastery: (idx: number) => void;
  onRemoveMasteryById?: (id: string) => void;
  freeSlots: number;
  onAddSpell: () => void;
  spells: Spell[];
  onRemoveSpell: (s: Spell) => void;
  freeSpellSlotsCount: number;
  attrs: string[] | null;
  currentAttributes: Record<string, number>;
  isOpen: boolean;
  onToggle: () => void;
  creationMode?: boolean;
  creationBudget?: number;
  canDecrease?: boolean;
  mode?: AppMode;
}

export const SkillRow: React.FC<SkillRowProps> = ({
  name,
  val,
  totalValue,
  onIncrease,
  onDecrease,
  canIncrease,
  canDecrease = true,
  cost,
  masteries,
  onAddMastery,
  onRemoveMastery,
  onRemoveMasteryById,
  freeSlots,
  onAddSpell,
  spells,
  onRemoveSpell,
  freeSpellSlotsCount,
  attrs,
  currentAttributes,
  isOpen,
  onToggle,
  creationMode = false,
  creationBudget = 0,
  mode = 'creation',
}) => {
  const isMagic = SKILL_CATEGORIES.MAGIC.includes(name);

  let tooltipText = '';
  if (attrs && currentAttributes) {
    const [a1, a2] = attrs;
    const v1 = currentAttributes[a1];
    const v2 = currentAttributes[a2];
    tooltipText = `${ATTRIBUTES[a1 as keyof typeof ATTRIBUTES]} (${v1}) + ${ATTRIBUTES[a2 as keyof typeof ATTRIBUTES]} (${v2}) + Punkte (${val}) = ${totalValue}`;
  }

  const sortedMasteries = [...masteries].sort((a, b) => {
    if (a.tier !== b.tier) return a.tier - b.tier;
    return a.name.localeCompare(b.name);
  });

  const sortedSpells = [...spells].sort((a, b) => {
    if (a.grade !== b.grade) return a.grade - b.grade;
    return a.name.localeCompare(b.name);
  });

  const getMasteryDesc = (mName: string): string | undefined => {
    const customDesc = getMasteryDescription(name, mName);
    if (customDesc) return customDesc;
    let found = (MASTERIES_DB[name] ?? []).find((x) => x.name === mName);
    if (!found && SKILL_CATEGORIES.COMBAT.includes(name))
      found = GENERAL_COMBAT_MASTERIES.find((x) => x.name === mName);
    if (!found && SKILL_CATEGORIES.MAGIC.includes(name))
      found = (MASTERIES_DB['Magieschulen'] ?? []).find((x) => x.name === mName);
    return found?.desc;
  };

  const containerClasses = isOpen
    ? `rounded-lg mb-2 border shadow-lg transition-all ${
        isMagic
          ? 'bg-[#141C2B] border-[#8FB3D5]/60 border-l-4 border-l-[#8FB3D5]'
          : 'bg-[#141C2B] border-[#C5A059]/60 border-l-4 border-l-[#C5A059]'
      }`
    : val > 0
    ? `rounded-lg mb-1 border transition-colors ${
        isMagic
          ? 'bg-[#161F2E]/80 border-[#3A4258] border-l-2 border-l-[#8FB3D5]/80 hover:border-[#8FB3D5]'
          : 'bg-[#161F2E]/70 border-[#3A4258] hover:border-[#C5A059]/50'
      }`
    : `rounded-lg mb-1 border transition-colors border-transparent hover:border-[#3A4258]/60 hover:bg-[#161F2E]/40 ${
        isMagic ? 'border-l-2 border-l-[#8FB3D5]/40' : ''
      }`;

  return (
    <div className={containerClasses}>
      <div className="flex flex-wrap md:flex-nowrap items-center justify-between py-1.5 px-2.5">
        <div
          className="w-full md:w-1/2 flex items-center cursor-pointer mb-2 md:mb-0 select-none group"
          onClick={onToggle}
        >
          <span
            className={`text-xs mr-2 transition-transform duration-150 ${
              isOpen ? 'rotate-90 text-[#C5A059]' : 'text-gray-400 group-hover:text-gray-200'
            }`}
          >
            ▶
          </span>
          <span
            className={`text-sm md:text-base truncate transition-colors ${
              isOpen
                ? 'text-[#FBEFCE] font-bold'
                : val > 0
                ? 'text-[#F5F2EA] font-semibold'
                : 'text-[#94A3B8] group-hover:text-[#CBD5E1]'
            }`}
          >
            {name}
          </span>
          {freeSlots > 0 && (
            <span
              className="ml-2 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full shrink-0 shadow-2xs border bg-[#1B365D] text-[#C5A059] border-[#C5A059]/60 badge-free-mastery"
              title={`Verfügbare Gratis-Meisterschaften: ${freeSlots}`}
            >
              {freeSlots}
            </span>
          )}
          {freeSpellSlotsCount > 0 && isMagic && (
            <span
              className="ml-2 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full shrink-0 shadow-2xs border bg-[#1B365D] text-[#8FB3D5] border-[#8FB3D5]/60 badge-free-spell"
              title={`Verfügbare Gratis-Zauber: ${freeSpellSlotsCount}`}
            >
              {freeSpellSlotsCount}
            </span>
          )}
        </div>
        <div className="w-1/4 md:w-1/6 text-center text-sm font-serif text-gray-400 print:text-black shrink-0 md:mb-0">
          {totalValue !== null ? (
            <span title={tooltipText} className="cursor-help inline-flex items-center gap-1">
              <span className="text-xs text-[#C5A059] font-mono">∑</span>
              <span className="font-bold text-[#F5F2EA]">{totalValue}</span>
            </span>
          ) : (
            <span className="text-[10px] italic text-[#94A3B8]">Waffe</span>
          )}
        </div>
        <div className="w-full md:w-1/3 flex justify-end items-center space-x-1 md:space-x-2 no-print mt-1 md:mt-0">
          <div className="flex items-center space-x-1">
            <button
              onClick={onDecrease}
              disabled={!canDecrease}
              className="w-8 h-8 sm:w-7 sm:h-7 flex items-center justify-center rounded-md border border-[#3A4258] bg-[#1E2536] text-[#F5F2EA] hover:bg-[#2A3449] hover:border-[#C5A059]/50 active:scale-95 disabled:opacity-20 disabled:pointer-events-none shrink-0 font-bold text-sm touch-manipulation transition-all cursor-pointer shadow-xs"
              title="Verringern"
              aria-label={`${name} verringern`}
            >
              -
            </button>
            <span
              className={`w-8 md:w-6 text-center font-bold font-mono text-sm ${
                val > 0 ? 'text-[#C5A059]' : 'text-[#64748B]'
              }`}
            >
              {val}
            </span>
            <button
              onClick={onIncrease}
              disabled={!canIncrease}
              className="w-8 h-8 sm:w-7 sm:h-7 flex items-center justify-center rounded-md border border-[#3A4258] bg-[#1E2536] text-[#F5F2EA] hover:bg-[#2A3449] hover:border-[#C5A059]/50 active:scale-95 disabled:opacity-20 disabled:pointer-events-none shrink-0 font-bold text-sm touch-manipulation transition-all cursor-pointer shadow-xs"
              title="Erhöhen"
              aria-label={`${name} erhöhen`}
            >
              +
            </button>
          </div>
          <span className="w-12 md:w-10 text-[10px] text-right text-[#C5A059] font-bold shrink-0">
            {cost > 0 ? `${cost} EP` : ''}
          </span>
        </div>
        <span className="hidden print-only font-bold text-black ml-auto">
          {val} / ∑ {totalValue}
        </span>
      </div>

      {isOpen && (
        <div className="px-3 md:px-6 pb-3 pt-2 text-sm skill-details border-t border-[#3A4258]/60 space-y-2.5">
          <div className="text-[11px] uppercase tracking-wider font-bold border-b border-[#3A4258] pb-1.5 flex justify-between items-center text-[#C5A059]">
            <span>Optionen</span>
            <span className="no-print hidden md:inline text-[11px] font-normal text-[#94A3B8]">
              {val < 6
                ? 'Meisterschaften ab Wert 6'
                : val < 9
                ? 'Schwelle 1 verfügbar'
                : val < 12
                ? 'Schwelle 2 verfügbar'
                : val < 15
                ? 'Schwelle 3 verfügbar'
                : 'Schwelle 4 verfügbar'}
            </span>
          </div>
          {val >= grossmeisterAb() && (
            <div className="text-xs rounded border border-[#C5A059]/60 bg-[#C5A059]/10 text-[#C5A059] px-2 py-1" data-testid="grossmeister">
              <strong>Großmeister</strong>: bei jeder Probe in {name} ein zusätzlicher W10 (zählt nicht für Patzer, GRW S. 92). Wird beim Würfeln automatisch berücksichtigt.
            </div>
          )}
          {(val >= 6 || (creationMode && creationBudget > 0 && val >= 1)) && (
            <button
              onClick={onAddMastery}
              className="text-xs bg-[#1B365D] hover:bg-[#254572] active:scale-[0.98] px-3 py-2 md:py-1.5 rounded-md w-full text-center no-print border border-[#C5A059]/50 text-[#FBEFCE] font-bold touch-manipulation transition-colors cursor-pointer shadow-xs"
            >
              + Meisterschaft hinzufügen
            </button>
          )}
          {isMagic && val >= 1 && (
            <button
              onClick={onAddSpell}
              className="text-xs bg-[#1A2E4C] hover:bg-[#223C63] active:scale-[0.98] px-3 py-2 md:py-1.5 rounded-md w-full text-center no-print border border-[#8FB3D5]/60 text-[#8FB3D5] hover:text-white font-bold touch-manipulation transition-colors cursor-pointer shadow-xs"
            >
              + Zauber hinzufügen
            </button>
          )}

          {sortedMasteries.length > 0 && (
            <div className="mt-3 space-y-1.5">
              <div className="text-[10px] uppercase text-[#C5A059] font-bold tracking-wider">
                Meisterschaften
              </div>
              {sortedMasteries.map((m, idx) => {
                const baseDesc =
                  m.desc || getMasteryDesc(m.name) || 'Details zur Meisterschaft im Regelwerk.';
                const description = m.userNote ? `${baseDesc}\n\n📝 ${m.userNote}` : baseDesc;
                const canRemoveMastery =
                  mode === 'creation' ||
                  (mode === 'xp' && !m.isCreationBonus && m.source !== 'Erschaffung');
                return (
                  <div
                    key={m.id || idx}
                    className="flex justify-between items-center bg-[#101522] p-2 rounded-md border border-[#3A4258] hover:border-[#C5A059]/40 text-xs transition-colors"
                  >
                    <div className="flex flex-col">
                      <span className="font-bold text-[#FBEFCE]">
                        {m.name}
                        {!/\(S\d+\)/.test(m.name) && (
                          <span className="font-normal text-[#94A3B8] ml-1">(S{m.tier})</span>
                        )}
                      </span>
                      <SourceBadge
                        source={m.source}
                        page={m.page}
                        tooltipData={{ title: m.name, description }}
                      />
                    </div>
                    {canRemoveMastery && (
                      <button
                        onClick={() =>
                          onRemoveMasteryById ? onRemoveMasteryById(m.id) : onRemoveMastery(idx)
                        }
                        className="text-red-400/80 hover:text-red-300 font-bold px-2 text-base min-h-[28px] min-w-[28px] flex items-center justify-center cursor-pointer transition-colors"
                        title="Löschen"
                      >
                        ×
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {sortedSpells.length > 0 && (
            <div className="mt-3 space-y-1.5">
              <div className="text-[10px] uppercase text-[#8FB3D5] font-bold tracking-wider">
                Zauber
              </div>
              {sortedSpells.map((s, idx) => {
                const stats = [
                  { label: 'Schule', value: s.school },
                  { label: 'Grad', value: s.grade },
                  { label: 'Fokus', value: String(s.cost) },
                  ...(s.castTime ? [{ label: 'Dauer', value: s.castTime }] : []),
                  ...(s.range ? [{ label: 'Reichw.', value: s.range }] : []),
                  ...(s.duration
                    ? [{ label: 'Wirkung', value: s.duration, colSpan: true }]
                    : []),
                ].filter((stat) => stat.value);

                const canRemoveSpell = mode === 'creation' || s.sourceMode === 'xp';

                return (
                  <div
                    key={idx}
                    className="flex justify-between items-center bg-[#101522] p-2 rounded-md border border-[#3A4258] hover:border-[#8FB3D5]/40 text-xs transition-colors"
                  >
                    <div className="flex flex-col">
                      <span className="font-bold text-[#8FB3D5]">
                        {s.name}{' '}
                        <span className="font-normal text-[#94A3B8]">(Grad {s.grade})</span>
                      </span>
                      <SourceBadge
                        source={s.source}
                        page={s.page}
                        tooltipData={{ title: s.name, description: s.description, stats }}
                      />
                    </div>
                    {canRemoveSpell && (
                      <button
                        onClick={() => onRemoveSpell(s)}
                        className="text-red-400/80 hover:text-red-300 font-bold px-2 text-base min-h-[28px] min-w-[28px] flex items-center justify-center cursor-pointer transition-colors"
                        title="Löschen"
                      >
                        ×
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
