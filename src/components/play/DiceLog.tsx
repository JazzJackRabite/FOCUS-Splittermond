import React, { useState } from 'react';
import {
  Dices,
  Trash2,
  ChevronDown,
  ChevronUp,
  History,
  Sun,
  Moon,
  Heart,
  Sparkles,
  Zap,
  ShieldCheck,
  ShieldAlert,
  RotateCcw,
  AlertTriangle,
  Flame,
  Star,
  Activity,
  Skull,
  Sword,
} from 'lucide-react';
import type { RestDetailItem } from './RestResultModal';

export interface RollEntry {
  type?: 'roll';
  id: string;
  timestamp: string;
  label: string;
  d10s: number[];
  baseVal: number;
  modifier: number;
  total: number;
  target?: number;
  eg?: number;
  outcome?: string;
  isTriumph?: boolean;
  isPatzer?: boolean;
}

export interface RestLogEntry {
  type: 'rest';
  id: string;
  timestamp: string;
  restType: 'verschnaufpause' | 'ruhephase';
  title: string;
  summary: string;
  details: RestDetailItem[];
}

export interface ActionLogEntry {
  type: 'action';
  id: string;
  timestamp: string;
  category: 'damage' | 'heal' | 'focus' | 'condition' | 'splitter' | 'mercy' | 'spell' | 'combat' | 'tempHp' | 'misc';
  title: string;
  description?: string;
  badge?: {
    text: string;
    variant: 'danger' | 'warning' | 'info' | 'success' | 'gold' | 'neutral';
  };
}

export type LogEntry = RollEntry | RestLogEntry | ActionLogEntry;

interface DiceLogProps {
  entries?: LogEntry[];
  rolls?: RollEntry[]; // For backwards-compatibility
  onClearRolls: () => void;
  onQuickRoll: (sides: number, diceCount: number, label: string, modifier?: number) => void;
  onUndo?: () => void;
  canUndo?: boolean;
}

function isRestLogEntry(item: LogEntry): item is RestLogEntry {
  return item.type === 'rest' || 'restType' in item;
}

function isActionLogEntry(item: LogEntry): item is ActionLogEntry {
  return item.type === 'action' || 'category' in item;
}

export const DiceLog: React.FC<DiceLogProps> = ({
  entries,
  rolls,
  onClearRolls,
  onQuickRoll,
  onUndo,
  canUndo = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  // Unify entries list
  const allEntries: LogEntry[] = entries ?? (rolls ?? []);

  return (
    <div id="protocol-section" className="bg-white bg-opacity-80 rounded-xl border border-[#d1c4b0] shadow-sm p-4 text-[#1B365D]">
      <div className="flex justify-between items-center border-b border-[#C5A059] pb-2 mb-3">
        <div className="flex items-center gap-2">
          <History className="text-[#C5A059]" size={20} />
          <h3 className="font-bold text-lg fantasy-font">Protokoll &amp; Schnellwürfler</h3>
        </div>
        <div className="flex items-center gap-2">
          {onUndo && (
            <button
              id="undo-protocol-btn"
              onClick={onUndo}
              disabled={!canUndo}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold transition border ${
                canUndo
                  ? 'bg-[#1B365D] text-[#f3e5cf] hover:bg-[#2c4b7a] border-[#C5A059] cursor-pointer shadow-xs active:scale-95'
                  : 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed opacity-60'
              }`}
              title={
                canUndo
                  ? 'Letztes Ereignis rückgängig machen (setzt Berechnungen/Zustände zurück und löscht den Protokolleintrag)'
                  : 'Kein Ereignis zum Rückgängigmachen vorhanden'
              }
            >
              <RotateCcw size={13} /> Rückgängig
            </button>
          )}
          {allEntries.length > 0 && (
            <button
              id="clear-protocol-btn"
              onClick={onClearRolls}
              className="p-1 rounded-md text-stone-400 hover:text-[#8B263E] transition-colors cursor-pointer"
              title="Protokoll leeren"
            >
              <Trash2 size={16} />
            </button>
          )}
          <button
            id="toggle-protocol-btn"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 rounded text-gray-600 hover:text-[#1B365D]"
          >
            {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
        </div>
      </div>

      {/* Quick Dice Bar */}
      <div className="flex flex-wrap items-center gap-2 mb-3 bg-[#f3e5cf] p-2.5 rounded-lg border border-[#e3d4b9]">
        <span className="text-xs font-bold text-gray-700 mr-1 flex items-center gap-1">
          <Dices size={15} className="text-[#C5A059]" /> Schnellwurf:
        </span>
        <button
          onClick={() => onQuickRoll(4, 1, '1W4')}
          className="bg-[#1B365D] hover:bg-[#2c4b7a] active:scale-95 text-white text-xs md:text-sm font-bold min-w-[44px] py-2 px-3 rounded-lg transition-all shadow-sm touch-manipulation flex items-center justify-center"
          title="1W4 Würfeln"
        >
          1W4
        </button>
        <button
          onClick={() => onQuickRoll(6, 1, '1W6')}
          className="bg-[#1B365D] hover:bg-[#2c4b7a] active:scale-95 text-white text-xs md:text-sm font-bold min-w-[44px] py-2 px-3 rounded-lg transition-all shadow-sm touch-manipulation flex items-center justify-center"
          title="1W6 Würfeln"
        >
          1W6
        </button>
        <button
          onClick={() => onQuickRoll(8, 1, '1W8')}
          className="bg-[#1B365D] hover:bg-[#2c4b7a] active:scale-95 text-white text-xs md:text-sm font-bold min-w-[44px] py-2 px-3 rounded-lg transition-all shadow-sm touch-manipulation flex items-center justify-center"
          title="1W8 Würfeln"
        >
          1W8
        </button>
        <button
          onClick={() => onQuickRoll(10, 1, '1W10')}
          className="bg-[#1B365D] hover:bg-[#2c4b7a] active:scale-95 text-white text-xs md:text-sm font-bold min-w-[44px] py-2 px-3 rounded-lg transition-all shadow-sm touch-manipulation flex items-center justify-center"
          title="1W10 Würfeln"
        >
          1W10
        </button>
        <button
          onClick={() => onQuickRoll(12, 1, '1W12')}
          className="bg-[#1B365D] hover:bg-[#2c4b7a] active:scale-95 text-white text-xs md:text-sm font-bold min-w-[44px] py-2 px-3 rounded-lg transition-all shadow-sm touch-manipulation flex items-center justify-center"
          title="1W12 Würfeln"
        >
          1W12
        </button>
      </div>

      {/* Protocol History Feed */}
      {isExpanded && (
        <div className="space-y-2 max-h-64 overflow-y-auto pr-1 custom-scroll">
          {allEntries.length === 0 ? (
            <div className="text-xs text-center protocol-desc py-3 italic opacity-75">
              Noch keine Einträge im Protokoll.
            </div>
          ) : (
            allEntries.map((item) => {
              // Check if Rest Entry
              if (isRestLogEntry(item)) {
                const rest = item;
                const isVp = rest.restType === 'verschnaufpause';
                const Icon = isVp ? Sun : Moon;
                const cardClass = isVp ? 'protocol-card-rest-vp' : 'protocol-card-rest-rp';
                const badgeClass = isVp ? 'protocol-badge-gold' : 'protocol-badge-info';
                const cleanTitle = rest.title
                  ? rest.title.replace(/^[\p{Extended_Pictographic}\uFE0F\s]+/u, '').trim() || (isVp ? 'Verschnaufpause' : 'Ruhephase')
                  : (isVp ? 'Verschnaufpause' : 'Ruhephase');

                return (
                  <div
                    key={rest.id}
                    className={`protocol-card ${cardClass} p-2.5 rounded-lg border text-xs flex justify-between items-center transition-all shadow-2xs`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="protocol-icon-box w-7 h-7 rounded-md flex items-center justify-center shrink-0 border">
                        <Icon size={16} />
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold flex items-center gap-1.5 flex-wrap">
                          <span className="protocol-title text-xs sm:text-sm font-bold tracking-tight">{cleanTitle}</span>
                          <span className="protocol-time text-[10px] font-normal">({rest.timestamp})</span>
                        </div>
                        <div className="protocol-desc text-[11px] mt-0.5 font-medium leading-relaxed">
                          {rest.summary}
                        </div>
                      </div>
                    </div>

                    <span className={`protocol-badge text-[11px] px-2.5 py-0.5 rounded-md shrink-0 ml-2 font-bold shadow-2xs ${badgeClass}`}>
                      {isVp ? '15 Min' : '6 Std'}
                    </span>
                  </div>
                );
              }

              // Action Log Entry (Combat, Damage, Heal, Focus, Condition, Splitter, etc.)
              if (isActionLogEntry(item)) {
                const act = item;
                let Icon = Activity;
                let cardClass = 'protocol-card-default';

                if (act.category === 'combat') {
                  Icon = Sword;
                  cardClass = 'protocol-card-combat';
                } else if (act.category === 'damage') {
                  Icon = Heart;
                  cardClass = 'protocol-card-damage';
                } else if (act.category === 'heal') {
                  Icon = Sparkles;
                  cardClass = 'protocol-card-heal';
                } else if (act.category === 'focus') {
                  Icon = Zap;
                  cardClass = 'protocol-card-focus';
                } else if (act.category === 'condition') {
                  Icon = ShieldAlert;
                  cardClass = 'protocol-card-condition';
                } else if (act.category === 'splitter' || act.category === 'mercy') {
                  Icon = Star;
                  cardClass = 'protocol-card-splitter';
                } else if (act.category === 'spell') {
                  Icon = Sparkles;
                  cardClass = 'protocol-card-spell';
                }

                let badgeClass = 'protocol-badge-neutral';
                if (act.badge) {
                  switch (act.badge.variant) {
                    case 'danger':
                      badgeClass = 'protocol-badge-danger';
                      break;
                    case 'warning':
                      badgeClass = 'protocol-badge-warning';
                      break;
                    case 'info':
                      badgeClass = 'protocol-badge-info';
                      break;
                    case 'success':
                      badgeClass = 'protocol-badge-success';
                      break;
                    case 'gold':
                      badgeClass = 'protocol-badge-gold';
                      break;
                    default:
                      badgeClass = 'protocol-badge-neutral';
                  }
                }

                return (
                  <div
                    key={act.id}
                    className={`protocol-card ${cardClass} p-2.5 rounded-lg border text-xs flex justify-between items-center transition-all shadow-2xs`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="protocol-icon-box w-7 h-7 rounded-md flex items-center justify-center shrink-0 border">
                        <Icon size={16} />
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold flex items-center gap-1.5 flex-wrap">
                          <span className="protocol-title text-xs sm:text-sm font-bold tracking-tight">{act.title}</span>
                          <span className="protocol-time text-[10px] font-normal">({act.timestamp})</span>
                        </div>
                        {act.description && (
                          <div className="protocol-desc text-[11px] mt-0.5 font-medium leading-relaxed">
                            {act.description}
                          </div>
                        )}
                      </div>
                    </div>

                    {act.badge && (
                      <span className={`protocol-badge text-[11px] px-2.5 py-0.5 rounded-md shrink-0 ml-2 font-bold shadow-2xs ${badgeClass}`}>
                        {act.badge.text}
                      </span>
                    )}
                  </div>
                );
              }

              // Roll Entry
              const r = item as RollEntry;
              const isWin = r.eg !== undefined && r.eg >= 0;
              const cardClass = r.isTriumph
                ? 'protocol-card-roll-triumph'
                : r.isPatzer
                ? 'protocol-card-roll-patzer'
                : isWin
                ? 'protocol-card-roll-win'
                : 'protocol-card-roll-fail';

              const RollIcon = r.isTriumph ? Sparkles : r.isPatzer ? Skull : Dices;

              return (
                <div
                  key={r.id}
                  className={`protocol-card ${cardClass} p-2.5 rounded-lg border text-xs flex justify-between items-center transition-all shadow-2xs`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="protocol-icon-box w-7 h-7 rounded-md flex items-center justify-center shrink-0 border">
                      <RollIcon size={16} />
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold flex items-center gap-1.5 flex-wrap">
                        <span className="protocol-title text-xs sm:text-sm font-bold tracking-tight">{r.label}</span>
                        <span className="protocol-time text-[10px] font-normal">({r.timestamp})</span>
                      </div>
                      <div className="protocol-desc text-[11px] mt-0.5 font-medium leading-relaxed">
                        Gewürfelt: <span className="font-bold">[{r.d10s.join(', ')}]</span>
                        {r.baseVal > 0 && <span> + {r.baseVal} (Basis)</span>}
                        {r.modifier !== 0 && <span> {r.modifier > 0 ? `+ ${r.modifier}` : `- ${Math.abs(r.modifier)}`}</span>}
                        {r.target !== undefined && <span> vs. KW {r.target}</span>}
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0 ml-2">
                    <div className="protocol-title text-base font-extrabold">{r.total}</div>
                    {r.isTriumph && <span className="font-bold text-amber-500 uppercase text-[10px] block">✨ Triumph!</span>}
                    {r.isPatzer && <span className="font-bold text-red-500 uppercase text-[10px] block">💀 Patzer!</span>}
                    {!r.isTriumph && !r.isPatzer && r.eg !== undefined && (
                      <span className={`font-bold text-[10px] block ${r.eg >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                        {r.eg >= 0 ? `+${r.eg} EG` : `${r.eg} EG`}
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
