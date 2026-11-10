import React, { useState, useMemo } from 'react';
import {
  Sparkles,
  ZapOff,
  Clock,
  Plus,
  Minus,
  AlertCircle,
  Tag,
  Shield,
} from 'lucide-react';
import type { ChanneledSpell } from '../../types';
import { SourceBadge } from '../ui/SourceBadge';
import { getFullSpellInfo, getActiveSpellModifiers } from '../../utils/magicRules';

interface ChanneledSpellsTrackerProps {
  channeledSpells: ChanneledSpell[];
  onCancelSpell: (spell: ChanneledSpell) => void;
  onUpdateSpell?: (id: string, update: Partial<ChanneledSpell>) => void;
  onOpenCastModal?: () => void;
  className?: string;
  isCombatDashboard?: boolean;
}

export const ChanneledSpellsTracker: React.FC<ChanneledSpellsTrackerProps> = ({
  channeledSpells,
  onCancelSpell,
  onUpdateSpell,
  onOpenCastModal: _onOpenCastModal,
  className = '',
  isCombatDashboard = false,
}) => {
  const [expandedSpellId, setExpandedSpellId] = useState<string | null>(null);
  // Hooks müssen vor jeder frühen Rückgabe stehen (sonst Absturz, sobald der erste Zauber aktiv wird oder der letzte endet)
  const activeMods = useMemo(() => getActiveSpellModifiers(channeledSpells), [channeledSpells]);

  if (channeledSpells.length === 0) {
    if (!isCombatDashboard) return null;
    return (
      <div className={`bg-[#faf6ee] rounded-xl border border-[#d1c4b0] p-3.5 text-center ${className}`}>
        <div className="flex items-center justify-center gap-2 text-[#1B365D] font-bold text-sm">
          <Sparkles size={16} className="text-[#C5A059]" />
          <span>Keine aktiven kanalisierten Zauber</span>
        </div>
        <p className="text-xs text-stone-600 mt-1">
          Zauber mit kanalisierter Wirkungsdauer binden Fokus und werden hier mit Rundentracker aufgeführt.
        </p>
      </div>
    );
  }

  const totalChanneledFO = channeledSpells.reduce((sum, s) => sum + s.channeledFocus, 0);

  return (
    <div
      className={`bg-[#faf6ee] rounded-xl border border-[#d1c4b0] shadow-sm p-4 ${className}`}
    >
      {/* Header */}
      <div className="flex justify-between items-center border-b border-[#d1c4b0] pb-2 mb-3">
        <div className="flex items-center gap-2">
          <span className="p-1 rounded-md bg-[#1B365D] text-[#C5A059] shadow-xs">
            <Sparkles size={16} />
          </span>
          <div>
            <h3 className="font-bold text-sm sm:text-base text-[#1B365D] fantasy-font leading-tight">
              Aktive Kanalisierungen ({channeledSpells.length})
            </h3>
            <span className="text-[11px] text-stone-600">
              Gebundener Fokus: <strong className="font-mono text-[#1B365D]">{totalChanneledFO} FO</strong>
            </span>
          </div>
        </div>
        <span className="text-xs font-bold text-[#1B365D] bg-[#f3e5cf] border border-[#C5A059]/50 px-2 py-0.5 rounded-full">
          Live-Tracking
        </span>
      </div>

      {/* Spells List */}
      <div className="space-y-3">
        {channeledSpells.map((spell) => {
          const isExpanded = expandedSpellId === spell.id;
          const currentRound = spell.activeRounds ?? 1;
          const currentTicks = spell.activeTicks ?? 0;
          const buff = activeMods.breakdown.find((b) => b.spellName.toLowerCase() === (spell.name || '').toLowerCase());
          const spellInfo = getFullSpellInfo({
            name: spell.name,
            school: spell.school || '',
            grade: spell.grade ?? 0,
            cost: spell.channeledFocus,
          });
          const stats = [
            { label: 'Schule', value: spellInfo.school },
            { label: 'Grad', value: spellInfo.grade },
            { label: 'Kanalisiert', value: `${spell.channeledFocus} FO` },
            ...(spellInfo.range && spellInfo.range !== '—' ? [{ label: 'Reichw.', value: spellInfo.range }] : []),
            ...(spellInfo.duration && spellInfo.duration !== '—' ? [{ label: 'Wirkung', value: spellInfo.duration, colSpan: true }] : []),
          ].filter((stat) => stat.value);

          return (
            <div
              key={spell.id}
              className="bg-white rounded-lg border border-[#d1c4b0] shadow-2xs hover:border-[#C5A059] transition-all p-3 space-y-2.5"
            >
              {/* Top Row: Name, School, Focus badge & Release Button */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#C5A059] animate-pulse shrink-0" />
                  <div className="truncate">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-sm text-[#1B365D] block truncate">
                        {spell.name}
                      </span>
                      {buff && (
                        <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-1.5 py-0.5 rounded-md shadow-2xs">
                          {buff.description}
                        </span>
                      )}
                      {spell.targetItemName && (
                        <span className="text-[11px] font-bold text-amber-900 bg-amber-100 border border-amber-300 px-1.5 py-0.5 rounded-md shadow-2xs flex items-center gap-1">
                          <Tag size={10} className="text-amber-700" />
                          <span>Ziel: {spell.targetItemName}</span>
                        </span>
                      )}
                      <SourceBadge
                        source={spellInfo.source || 'GRW'}
                        page={spellInfo.page}
                        tooltipData={{ title: spell.name, description: spellInfo.description, stats }}
                      />
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
                      {spell.school && <span className="text-[#1B365D] font-bold">{spell.school}</span>}
                      {spell.grade !== undefined && <span>· Grad {spell.grade}</span>}
                      {spell.startedAt && <span>· Gestartet {spell.startedAt}</span>}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="bg-[#f3e5cf] text-[#1B365D] border border-[#C5A059]/40 text-xs font-bold px-2 py-1 rounded-md font-mono shadow-2xs">
                    {spell.channeledFocus} FO
                  </span>

                  {/* Schnell-Button zum Lösen/Fallenlassen der Kanalisierung */}
                  <button
                    type="button"
                    onClick={() => onCancelSpell(spell)}
                    className="bg-[#f3e5cf] hover:bg-[#ebdcc4] text-[#8B263E] border border-[#8B263E]/40 rounded-lg px-2.5 py-1 text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer active:scale-95 no-print"
                    title="Kanalisierung sofort beenden – überführt den gebundenen Fokus automatisch in den erschöpften Pool"
                  >
                    <ZapOff size={13} />
                    <span>Lösen</span>
                  </button>
                </div>
              </div>

              {/* Middle Row: Round Tracking & Tick Counters */}
              <div className="flex flex-wrap items-center justify-between gap-2 bg-[#faf6ee] border border-[#d1c4b0] rounded-md px-2.5 py-1.5 text-xs">
                {/* Rundenzähler */}
                <div className="flex items-center gap-1.5">
                  <Clock size={13} className="text-[#C5A059] shrink-0" />
                  <span className="text-gray-600 text-[11px] font-medium">Runde:</span>
                  <div className="flex items-center gap-1 bg-white border border-[#d1c4b0] rounded px-1 py-0.5">
                    <button
                      type="button"
                      disabled={currentRound <= 1}
                      onClick={() => onUpdateSpell?.(spell.id, { activeRounds: Math.max(1, currentRound - 1) })}
                      className="w-4 h-4 flex items-center justify-center text-[#1B365D] hover:bg-[#f3e5cf] rounded disabled:opacity-30"
                      title="Runde verringern"
                    >
                      <Minus size={10} />
                    </button>
                    <span className="font-bold text-xs font-mono px-1 min-w-[1.2rem] text-center text-[#1B365D]">
                      {currentRound}
                    </span>
                    <button
                      type="button"
                      onClick={() => onUpdateSpell?.(spell.id, { activeRounds: currentRound + 1 })}
                      className="w-4 h-4 flex items-center justify-center text-[#1B365D] hover:bg-[#f3e5cf] rounded"
                      title="+1 Runde weiter"
                    >
                      <Plus size={10} />
                    </button>
                  </div>
                </div>

                {/* Tick-Zähler */}
                <div className="flex items-center gap-1.5">
                  <span className="text-gray-600 text-[11px] font-medium">Ticks:</span>
                  <div className="flex items-center gap-1 bg-white border border-[#d1c4b0] rounded px-1 py-0.5">
                    <button
                      type="button"
                      disabled={currentTicks <= 0}
                      onClick={() => onUpdateSpell?.(spell.id, { activeTicks: Math.max(0, currentTicks - 1) })}
                      className="w-4 h-4 flex items-center justify-center text-[#1B365D] hover:bg-[#f3e5cf] rounded disabled:opacity-30"
                      title="Tick verringern"
                    >
                      <Minus size={10} />
                    </button>
                    <span className="font-bold text-xs font-mono px-1 min-w-[1.2rem] text-center text-[#1B365D]">
                      {currentTicks}
                    </span>
                    <button
                      type="button"
                      onClick={() => onUpdateSpell?.(spell.id, { activeTicks: currentTicks + 1 })}
                      className="w-4 h-4 flex items-center justify-center text-[#1B365D] hover:bg-[#f3e5cf] rounded"
                      title="+1 Tick"
                    >
                      <Plus size={10} />
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => onUpdateSpell?.(spell.id, { activeTicks: currentTicks + 3 })}
                    className="bg-white hover:bg-[#f3e5cf] text-[#1B365D] border border-[#d1c4b0] text-[10px] font-bold px-1.5 py-0.5 rounded cursor-pointer"
                    title="+3 Ticks"
                  >
                    +3
                  </button>
                </div>

                {/* Toggle details */}
                {(spell.enhancements?.length || spell.notes || spell.target) && (
                  <button
                    type="button"
                    onClick={() => setExpandedSpellId(isExpanded ? null : spell.id)}
                    className="text-[11px] text-[#1B365D] hover:text-[#C5A059] underline ml-auto cursor-pointer"
                  >
                    {isExpanded ? 'Details verbergen' : 'Details'}
                  </button>
                )}
              </div>

              {/* Optional Expanded Details */}
              {(isExpanded || (spell.enhancements && spell.enhancements.length > 0)) && (
                <div className="text-xs space-y-1.5 pt-1 border-t border-gray-100">
                  {spell.target && (
                    <div className="flex items-center gap-1 text-gray-600">
                      <Shield size={11} className="text-gray-400" />
                      <span>Ziel: <strong>{spell.target}</strong></span>
                    </div>
                  )}
                  {spell.enhancements && spell.enhancements.length > 0 && (
                    <div className="flex flex-wrap gap-1 items-center">
                      <Tag size={11} className="text-[#C5A059]" />
                      {spell.enhancements.map((enh, idx) => (
                        <span
                          key={idx}
                          className="bg-[#f3e5cf] text-[#1B365D] border border-[#C5A059]/40 text-[10px] font-semibold px-1.5 py-0.5 rounded"
                        >
                          {enh}
                        </span>
                      ))}
                    </div>
                  )}
                  {spell.notes && (
                    <p className="text-[11px] text-gray-600 italic bg-gray-50 p-1.5 rounded">
                      „{spell.notes}“
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Info footer */}
      <div className="mt-2.5 flex items-center gap-1 text-[11px] text-stone-600">
        <AlertCircle size={12} className="shrink-0 text-[#C5A059]" />
        <span>
          Beim Lösen der Kanalisierung wird der Fokus gemäß Splittermond-Regeln automatisch in erschöpften Fokus
          umgewandelt.
        </span>
      </div>
    </div>
  );
};
