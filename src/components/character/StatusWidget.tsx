import React from 'react';
import { RotateCcw } from 'lucide-react';
import type { AppMode, CreationUsage } from '../../types';

interface StatusWidgetProps {
  mode: AppMode;
  creationUsage: CreationUsage;
  xpAvailable: number;
  freeMasteries: number;
  freeSpells: number;
  onUndo?: () => void;
  canUndo?: boolean;
}

export const StatusWidget: React.FC<StatusWidgetProps> = ({
  mode,
  creationUsage,
  xpAvailable,
  freeMasteries,
  freeSpells,
  onUndo,
  canUndo = false,
}) => (
  <div className="bg-[#1B365D] p-4 rounded border-2 border-[#C5A059] shadow-lg text-[#f3e5cf] mb-6 print:hidden">
    <div className="flex justify-between items-start mb-4">
      <div className="flex items-center gap-3">
        <h3 className="font-bold text-xl fantasy-font tracking-widest text-white">STATUS</h3>
        {mode === 'xp' && onUndo && (
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-bold transition border ${
              canUndo
                ? 'bg-[#C5A059] text-[#1B365D] hover:bg-[#d6b16a] border-[#e3d4b9] cursor-pointer shadow-xs active:scale-95'
                : 'bg-white/10 text-gray-400 border-white/20 cursor-not-allowed opacity-50'
            }`}
            title={canUndo ? 'Letztes Ereignis rückgängig machen' : 'Kein Ereignis zum Rückgängigmachen vorhanden'}
          >
            <RotateCcw size={13} /> Rückgängig
          </button>
        )}
      </div>
      <div className="text-right">
        <div className="text-[10px] uppercase tracking-wider text-[#C5A059]">Verfügbare EP</div>
        <div className="text-2xl font-bold leading-none text-white">{xpAvailable}</div>
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
