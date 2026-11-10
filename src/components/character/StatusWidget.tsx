import React from 'react';
import type { AppMode, CreationUsage } from '../../types';

interface StatusWidgetProps {
  mode: AppMode;
  creationUsage: CreationUsage;
  xpAvailable: number;
  xpTotal?: number;
  heldengrad?: { name: string; [key: string]: any };
  freeMasteries: number;
  freeSpells: number;
  onUndo?: () => void;
  canUndo?: boolean;
  onAddXp?: () => void;
  onToggleCreationMode?: () => void;
}

export const StatusWidget: React.FC<StatusWidgetProps> = ({
  mode,
  creationUsage,
  xpAvailable,
  xpTotal,
  heldengrad,
  freeMasteries,
  freeSpells,
  onUndo,
  canUndo = false,
  onAddXp,
  onToggleCreationMode,
}) => {
  const hgMatch = heldengrad?.name?.match(/^(.*?)\s*(\(.*\))$/);
  const hgTitle = hgMatch ? hgMatch[1].toUpperCase() : (heldengrad?.name?.toUpperCase() || '');
  const hgRank = hgMatch ? hgMatch[2] : '';

  return (
    <div className="bg-[#1B365D] p-4 rounded border-2 border-[#C5A059] shadow-lg text-[#f3e5cf] mb-6 print:hidden">
      <div className="flex justify-between items-start mb-4 gap-4">
        {/* Left: Status & Heldengrad */}
        <div className="flex flex-col">
          <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
            <h3 className="font-bold text-xl fantasy-font tracking-widest text-white">STATUS</h3>
            {onToggleCreationMode && (
              mode === 'creation' ? (
                <button
                  type="button"
                  onClick={onToggleCreationMode}
                  className="px-2.5 py-1 rounded text-xs font-bold transition bg-[#C5A059] text-[#1B365D] hover:bg-[#d6b16a] active:scale-95 shadow-xs cursor-pointer border border-[#e3d4b9] whitespace-nowrap"
                  title="Charaktererschaffung abschließen und Steigerung freischalten"
                >
                  Erschaffung abschließen
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onToggleCreationMode}
                  className="px-2.5 py-1 rounded text-xs font-bold transition bg-[#0f2340] text-[#f3e5cf] hover:bg-[#C5A059] hover:text-[#1B365D] active:scale-95 shadow-xs cursor-pointer border border-[#C5A059] whitespace-nowrap"
                  title="Charaktererschaffung wieder bearbeiten"
                >
                  Erschaffung
                </button>
              )
            )}
          </div>
          {heldengrad && hgTitle && (
            <div className="mt-1 flex items-center gap-1.5 flex-wrap">
              <span className="text-xs sm:text-sm font-bold text-[#C5A059] fantasy-font leading-tight">
                {hgTitle}
              </span>
              {hgRank && (
                <span className="text-[11px] sm:text-xs text-[#f3e5cf]/85 font-medium leading-tight">
                  {hgRank}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Right: Verfügbare EP & Gesamt-EP */}
        <div className="text-right flex flex-col items-end">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-[#C5A059]">Verfügbare EP</div>
            <div className="text-2xl font-bold leading-none text-white">{xpAvailable}</div>
          </div>

          {xpTotal !== undefined && (
            <div className="mt-2 flex items-center gap-1.5 flex-wrap justify-end">
              <span className="text-[10px] uppercase tracking-wider text-gray-300 font-semibold leading-none">
                Gesamt-EP
              </span>
              <span
                className="bg-[#faf4e6] text-[#1B365D] font-bold text-xs px-2 py-0.5 rounded border border-[#C5A059] shadow-xs select-none"
                title="Gesamt-Erfahrungspunkte"
              >
                {xpTotal}
              </span>
              {mode === 'xp' && onAddXp && (
                <button
                  type="button"
                  onClick={onAddXp}
                  className="px-2 py-0.5 rounded text-xs font-bold bg-[#C5A059] text-[#1B365D] hover:bg-[#d6b16a] active:scale-95 transition-all shadow-xs cursor-pointer leading-none"
                  title="Erfahrungspunkte hinzufügen"
                >
                  +EP
                </button>
              )}
            </div>
          )}
        </div>
      </div>

    {mode === 'creation' && (
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mb-4">
        {[
          { label: 'Attr', current: creationUsage.attr, max: 18, extra: null },
          {
            label: 'Skill',
            current: creationUsage.skill,
            max: 55,
            extra:
              creationUsage.nonMagicPoints < 5 ? 'Min. 5 nicht-magisch!' : null,
          },
          {
            label: 'Stärk',
            current: creationUsage.strength,
            max: creationUsage.strengthLimit,
            extra: null,
          },
          {
            label: 'Ress',
            current: creationUsage.resource,
            max: creationUsage.resourceLimit,
            extra: null,
          },
          { label: 'Sprach', current: creationUsage.languages, max: 2, extra: null },
        ].map(({ label, current, max, extra }) => {
          const done = current === max;
          return (
            <div
              key={label}
              className={`p-2 rounded text-center border border-opacity-30 ${
                done ? 'bg-green-900 border-green-500' : 'bg-[#2c1810] border-red-500'
              }`}
            >
              <div className="text-[10px] uppercase text-gray-300">{label}</div>
              <div className={`font-bold text-lg ${done ? 'text-green-400' : 'text-red-400'}`}>
                {current}/{max}
              </div>
              {extra && (
                <div className="text-[8px] text-red-300 leading-tight">{extra}</div>
              )}
            </div>
          );
        })}
      </div>
    )}

    <div className="space-y-1 text-sm border-t border-[#C5A059] pt-2">
      {mode === 'creation' && (
        <div className="flex justify-between">
          <span className="text-gray-300">Start-Meisterschaften:</span>
          <span
            className={`font-bold ${
              creationUsage.creationMasteries === 3 ? 'text-green-400' : 'text-red-400'
            }`}
          >
            {creationUsage.creationMasteries}/3
          </span>
        </div>
      )}
      <div className="flex justify-between">
        <span className="text-gray-300">Gratis-Meisterschaften:</span>
        <span className="font-bold text-white">{freeMasteries} offen</span>
      </div>
      <div className="flex justify-between">
        <span className="text-gray-300">Gratis-Zauber:</span>
        <span className="font-bold text-white">{freeSpells} offen</span>
      </div>
    </div>
  </div>
);
};
