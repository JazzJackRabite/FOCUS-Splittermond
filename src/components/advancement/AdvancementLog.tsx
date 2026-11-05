import React, { useState, useMemo } from 'react';
import {
  History,
  ChevronDown,
  ChevronUp,
  Sparkles,
  TrendingUp,
  Search,
  Copy,
  Check,
  Plus,
  Zap,
  Award,
  Shield,
  Layers,
  FileText,
  RotateCcw,
  Edit3,
} from 'lucide-react';
import toast from 'react-hot-toast';
import type { AdvancementLogEntry } from '../../types';
import { XpAddModal } from '../modals/XpAddModal';
import { EditTotalXpModal } from '../modals/EditTotalXpModal';

interface AdvancementLogProps {
  entries: AdvancementLogEntry[];
  xpTotal: number;
  xpSpent: number;
  xpAvailable: number;
  onAddXpWithNote: (amount: number, note?: string) => void;
  onEditTotalXp?: (newTotal: number, note?: string) => void;
  onAddCustomLog: (entry: AdvancementLogEntry) => void;
  onDeleteLogEntry: (id: string) => void;
  onUndo?: () => void;
  canUndo?: boolean;
  onClearLog?: () => void;
}

type FilterCategory = 'all' | 'xp' | 'attr' | 'skill' | 'mastery' | 'spell' | 'strength_resource' | 'other';

export const AdvancementLog: React.FC<AdvancementLogProps> = ({
  entries,
  xpTotal,
  xpSpent,
  xpAvailable,
  onAddXpWithNote,
  onEditTotalXp,
  onAddCustomLog,
  onDeleteLogEntry,
  onUndo,
  canUndo = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<FilterCategory>('all');
  const [showXpModal, setShowXpModal] = useState(false);
  const [showEditTotalXpModal, setShowEditTotalXpModal] = useState(false);
  const [showAddNoteModal, setShowAddNoteModal] = useState(false);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteDetail, setNoteDetail] = useState('');
  const [copied, setCopied] = useState(false);

  // Filtered log entries
  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      // Category filter
      if (filterCategory === 'xp' && entry.category !== 'xp') return false;
      if (filterCategory === 'attr' && entry.category !== 'attr') return false;
      if (filterCategory === 'skill' && entry.category !== 'skill') return false;
      if (filterCategory === 'mastery' && entry.category !== 'mastery') return false;
      if (filterCategory === 'spell' && entry.category !== 'spell') return false;
      if (
        filterCategory === 'strength_resource' &&
        entry.category !== 'strength' &&
        entry.category !== 'resource'
      )
        return false;
      if (
        filterCategory === 'other' &&
        !['weakness', 'language', 'note'].includes(entry.category)
      )
        return false;

      // Text search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const titleMatch = entry.title.toLowerCase().includes(q);
        const detailMatch = entry.detail?.toLowerCase().includes(q) ?? false;
        const timeMatch = entry.timestamp.toLowerCase().includes(q);
        return titleMatch || detailMatch || timeMatch;
      }

      return true;
    });
  }, [entries, filterCategory, searchQuery]);

  const handleCopyLog = () => {
    if (entries.length === 0) return;
    const text = entries
      .map((e) => {
        const deltaStr =
          e.xpDelta !== undefined
            ? ` (${e.xpDelta > 0 ? `+${e.xpDelta}` : e.xpDelta} EP)`
            : '';
        const detailStr = e.detail ? ` - ${e.detail}` : '';
        return `[${e.timestamp}] ${e.title}${detailStr}${deltaStr}`;
      })
      .join('\n');

    navigator.clipboard.writeText(
      `--- SPLITTERMOND STEIGERUNGSPROTOKOLL ---\nGesamt: ${xpTotal} EP | Ausgegeben: ${xpSpent} EP | Verfügbar: ${xpAvailable} EP\n\n` +
        text,
    );
    setCopied(true);
    toast.success('Steigerungsprotokoll in die Zwischenablage kopiert!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAddCustomNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteTitle.trim()) return;

    onAddCustomLog({
      id: 'adv-note-' + Date.now(),
      timestamp: new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }),
      category: 'note',
      title: noteTitle.trim(),
      detail: noteDetail.trim() || undefined,
    });

    setNoteTitle('');
    setNoteDetail('');
    setShowAddNoteModal(false);
    toast.success('Notiz zum Protokoll hinzugefügt.');
  };

  const getCategoryIcon = (category: AdvancementLogEntry['category']) => {
    switch (category) {
      case 'xp':
        return <Sparkles size={14} className="text-emerald-600" />;
      case 'attr':
        return <TrendingUp size={14} className="text-amber-600" />;
      case 'skill':
        return <Award size={14} className="text-blue-600" />;
      case 'mastery':
        return <Shield size={14} className="text-indigo-600" />;
      case 'spell':
        return <Zap size={14} className="text-[#C5A059]" />;
      case 'strength':
      case 'resource':
        return <Layers size={14} className="text-teal-600" />;
      default:
        return <FileText size={14} className="text-gray-600" />;
    }
  };

  const getCategoryBadgeClass = (category: AdvancementLogEntry['category']) => {
    switch (category) {
      case 'xp':
        return 'bg-emerald-50 text-emerald-800 border-emerald-300';
      case 'attr':
        return 'bg-amber-50 text-amber-900 border-amber-300';
      case 'skill':
        return 'bg-blue-50 text-blue-900 border-blue-300';
      case 'mastery':
        return 'bg-indigo-50 text-indigo-900 border-indigo-300';
      case 'spell':
        return 'bg-[#f3e5cf] text-[#1B365D] border-[#C5A059]/40';
      case 'strength':
      case 'resource':
        return 'bg-teal-50 text-teal-900 border-teal-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getCategoryLabel = (category: AdvancementLogEntry['category']) => {
    switch (category) {
      case 'xp':
        return 'EP-Buchung';
      case 'attr':
        return 'Attribut';
      case 'skill':
        return 'Fertigkeit';
      case 'mastery':
        return 'Meisterschaft';
      case 'spell':
        return 'Zauber';
      case 'strength':
        return 'Stärke';
      case 'resource':
        return 'Ressource';
      case 'language':
        return 'Sprache';
      case 'weakness':
        return 'Schwäche';
      case 'note':
        return 'Notiz';
      default:
        return 'Aktivität';
    }
  };

  return (
    <div
      id="advancement-protocol-section"
      className="bg-white bg-opacity-60 rounded-xl border border-[#d1c4b0] shadow-sm p-4 text-[#1B365D] mt-6 no-print"
    >
      {/* Header */}
      <div className="flex flex-wrap justify-between items-center border-b border-[#C5A059] pb-3 mb-4 gap-2">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-[#f3e5cf] rounded-lg border border-[#C5A059]/40 text-[#1B365D]">
            <History size={20} className="text-[#1B365D]" />
          </div>
          <div>
            <h3 className="font-bold text-lg fantasy-font leading-tight text-[#1B365D] flex items-center gap-2">
              Protokoll: Steigerungen &amp; Erfahrungspunkte
              <span className="text-xs font-sans font-medium text-[#1B365D] bg-[#f3e5cf] px-2 py-0.5 rounded-full border border-[#C5A059]/30">
                {entries.length} Einträge
              </span>
            </h3>
            <p className="text-xs text-gray-600">
              Lückenlose Aufzeichnung aller EP-Gutschriften, Attributs-, Fertigkeits- und Meisterschaftssteigerungen
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onUndo && (
            <button
              onClick={onUndo}
              disabled={!canUndo}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition border ${
                canUndo
                  ? 'bg-[#1B365D] text-[#f3e5cf] hover:bg-[#2c4b7a] border-[#C5A059] cursor-pointer shadow-xs active:scale-95'
                  : 'bg-[#e3d4b9]/40 text-gray-400 border-[#d1c4b0] cursor-not-allowed opacity-60'
              }`}
              title={
                canUndo
                  ? 'Letztes Ereignis rückgängig machen (Berechnungen zurücksetzen & Protokolleintrag löschen)'
                  : 'Kein Ereignis zum Rückgängigmachen vorhanden'
              }
            >
              <RotateCcw size={14} /> Rückgängig
            </button>
          )}
          <button
            onClick={() => setShowXpModal(true)}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-[#1B365D] text-[#f3e5cf] hover:bg-[#2c4b7a] border border-[#C5A059] rounded-lg text-xs font-bold transition shadow-xs cursor-pointer"
            title="Erfahrungspunkte gutschreiben"
          >
            <Plus size={14} /> EP hinzufügen
          </button>
          <button
            onClick={() => setShowAddNoteModal(true)}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-[#1B365D] text-[#f3e5cf] hover:bg-[#2c4b7a] border border-[#C5A059] rounded-lg text-xs font-bold transition cursor-pointer"
            title="Notiz ins Protokoll eintragen"
          >
            <FileText size={14} /> Notiz
          </button>
          {entries.length > 0 && (
            <button
              onClick={handleCopyLog}
              className="p-1.5 rounded text-gray-600 hover:text-[#1B365D] hover:bg-[#e3d4b9]/30 transition-colors"
              title="Protokoll in Zwischenablage kopieren"
            >
              {copied ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} />}
            </button>
          )}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded text-gray-600 hover:text-[#1B365D] hover:bg-[#e3d4b9]/30 transition-colors"
            title={isExpanded ? 'Einklappen' : 'Ausklappen'}
          >
            {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="space-y-4">
          {/* Summary Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-[#faf4e6] p-3 rounded-lg border border-[#e3d4b9] text-xs">
            <div className="flex flex-col">
              <span className="text-gray-500 font-medium">Gesamt-EP:</span>
              <span className="font-bold text-sm text-[#1B365D]">{xpTotal} EP</span>
            </div>
            <div className="flex flex-col">
              <span className="text-gray-500 font-medium">Ausgegeben:</span>
              <span className="font-bold text-sm text-amber-800">{xpSpent} EP</span>
            </div>
            <div className="flex flex-col">
              <span className="text-gray-500 font-medium">Verfügbar:</span>
              <span
                className={`font-bold text-sm ${
                  xpAvailable < 0 ? 'text-red-600' : 'text-emerald-700'
                }`}
              >
                {xpAvailable} EP
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-gray-500 font-medium">Aktivitäten:</span>
              <span className="font-bold text-sm text-gray-700">{entries.length} Einträge</span>
            </div>
          </div>

          {/* Search & Category Filter Bar */}
          <div className="flex flex-col md:flex-row gap-2 justify-between items-stretch md:items-center">
            {/* Filter Pills */}
            <div className="flex flex-wrap gap-1 items-center">
              {(
                [
                  { id: 'all', label: 'Alle' },
                  { id: 'xp', label: 'EP' },
                  { id: 'skill', label: 'Fertigkeiten' },
                  { id: 'attr', label: 'Attribute' },
                  { id: 'mastery', label: 'Meisterschaften' },
                  { id: 'spell', label: 'Zauber' },
                  { id: 'strength_resource', label: 'Stärken/Ressourcen' },
                  { id: 'other', label: 'Sonstiges' },
                ] as const
              ).map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setFilterCategory(cat.id)}
                  className={`px-2.5 py-1 text-xs rounded-full font-medium transition-all ${
                    filterCategory === cat.id
                      ? 'bg-[#1B365D] text-[#f3e5cf] shadow-xs'
                      : 'bg-[#f3e5cf] text-[#1B365D] hover:bg-[#e3d4b9] border border-[#C5A059]/30'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative min-w-[200px]">
              <Search
                size={14}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Protokoll durchsuchen..."
                className="w-full pl-8 pr-3 py-1 bg-white border border-[#d1c4b0] rounded-lg text-xs text-[#1B365D] placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-[#C5A059]"
              />
            </div>
          </div>

          {/* Entries list */}
          {filteredEntries.length === 0 ? (
            <div className="text-center py-8 px-4 bg-[#faf4e6] rounded-lg border border-dashed border-[#d1c4b0]">
              <History size={32} className="mx-auto text-gray-400 mb-2 opacity-60" />
              <p className="text-sm font-semibold text-gray-600">
                {entries.length === 0
                  ? 'Noch keine Steigerungen oder EP-Buchungen protokolliert.'
                  : 'Keine Einträge für die aktuelle Filterung gefunden.'}
              </p>
              <p className="text-xs text-gray-500 max-w-md mx-auto mt-1">
                {entries.length === 0
                  ? 'Alle künftigen Steigerungen von Fertigkeiten, Attributen, Meisterschaften, Zaubern oder EP-Änderungen erscheinen automatisch hier.'
                  : 'Passe die Filter an oder setze den Suchbegriff zurück.'}
              </p>
              {entries.length === 0 && (
                <button
                  onClick={() => setShowXpModal(true)}
                  className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#1B365D] text-[#f3e5cf] hover:bg-[#2c4b7a] rounded-lg text-xs font-bold transition shadow-xs cursor-pointer"
                >
                  <Sparkles size={14} /> Erste EP gutschreiben
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1.5 custom-scrollbar modal-body-scroll">
              {filteredEntries.map((entry) => {
                const isPositiveXp = (entry.xpDelta ?? 0) > 0;
                const isNegativeXp = (entry.xpDelta ?? 0) < 0;

                return (
                  <div
                    key={entry.id}
                    className="flex items-start justify-between gap-2 p-2.5 rounded-lg bg-[#faf4e6] border border-[#e3d4b9] hover:bg-[#f3e5cf] transition-colors"
                  >
                    <div className="flex items-start gap-2.5 flex-1 min-w-0">
                      <div className="mt-0.5 shrink-0">{getCategoryIcon(entry.category)}</div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                            className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border leading-none ${getCategoryBadgeClass(
                              entry.category,
                            )}`}
                          >
                            {getCategoryLabel(entry.category)}
                          </span>
                          <span className="text-xs font-bold text-[#1B365D] truncate">
                            {entry.title}
                          </span>
                          <span className="text-[10px] text-gray-400 ml-auto shrink-0">
                            {entry.timestamp}
                          </span>
                        </div>
                        {entry.detail && (
                          <p className="text-xs text-gray-600 mt-0.5 line-clamp-2">
                            {entry.detail}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {entry.xpDelta !== undefined && entry.xpDelta !== 0 && (
                        <div
                          className={`text-xs font-bold px-2 py-0.5 rounded border ${
                            isPositiveXp
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                              : isNegativeXp
                              ? 'bg-amber-100 text-amber-900 border-amber-300'
                              : 'bg-gray-100 text-gray-700 border-gray-300'
                          }`}
                        >
                          {isPositiveXp ? `+${entry.xpDelta}` : entry.xpDelta} EP
                        </div>
                      )}
                      <button
                        onClick={() => {
                          onDeleteLogEntry(entry.id);
                          toast.success('Eintrag gelöscht');
                        }}
                        className="text-[#8B263E]/60 hover:text-[#8B263E] font-bold text-lg px-2 no-print shrink-0 cursor-pointer transition-colors"
                        title="Löschen"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Bottom Protocol Action Bar */}
          <div className="pt-3 border-t border-[#e3d4b9] flex flex-wrap items-center justify-between gap-3 bg-[#faf4e6] p-2.5 rounded-lg border border-[#e3d4b9] no-print">
            <div className="text-xs text-gray-600 flex items-center gap-2 sm:gap-3 flex-wrap">
              <span>
                Gesamt-EP: <strong className="text-[#1B365D] font-bold">{xpTotal} EP</strong>
              </span>
              <span className="text-gray-300">•</span>
              <span>
                Ausgegeben: <strong className="text-amber-800 font-bold">{xpSpent} EP</strong>
              </span>
              <span className="text-gray-300">•</span>
              <span>
                Verfügbar:{' '}
                <strong
                  className={`font-bold ${
                    xpAvailable < 0 ? 'text-red-600' : 'text-emerald-700'
                  }`}
                >
                  {xpAvailable} EP
                </strong>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowEditTotalXpModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1B365D] text-[#f3e5cf] hover:bg-[#2c4b7a] border border-[#C5A059] rounded-lg text-xs font-bold transition shadow-xs cursor-pointer"
                title="Gesamt-EP mit Kommentar und Protokolleintrag korrigieren"
              >
                <Edit3 size={14} className="text-[#C5A059]" />
                <span>Gesamt EP editieren</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Total XP Modal */}
      {showEditTotalXpModal && (
        <EditTotalXpModal
          currentXpTotal={xpTotal}
          xpSpent={xpSpent}
          onClose={() => setShowEditTotalXpModal(false)}
          onSave={(newTotal, note) => {
            onEditTotalXp?.(newTotal, note);
            toast.success('Gesamt-EP erfolgreich korrigiert!');
          }}
        />
      )}

      {/* Quick XP Modal */}
      {showXpModal && (
        <XpAddModal
          onClose={() => setShowXpModal(false)}
          onAdd={(val, note) => {
            onAddXpWithNote(val, note);
            toast.success(`+${val} EP erfolgreich gutgeschrieben!`);
          }}
        />
      )}

      {/* Add Custom Note Modal */}
      {showAddNoteModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div id="advancement-log-note-dialog" className="bg-[#faf4e6] dark-theme-panel p-5 sm:p-6 rounded-xl border-2 border-[#C5A059] shadow-2xl max-w-md w-full">
            <div className="flex items-center gap-2 border-b border-[#C5A059] pb-3 mb-4">
              <FileText className="w-5 h-5 text-[#C5A059]" />
              <h3 className="fantasy-font text-xl text-[#1B365D]">
                Notiz zum Protokoll hinzufügen
              </h3>
            </div>
            <form onSubmit={handleAddCustomNote} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1 uppercase tracking-wide">
                  Titel / Ereignis
                </label>
                <input
                  type="text"
                  value={noteTitle}
                  onChange={(e) => setNoteTitle(e.target.value)}
                  placeholder="z. B. Spielrunde vom 12.05., Lehrmeister besucht"
                  className="w-full bg-white border border-[#d1c4b0] rounded-lg p-2.5 text-sm text-[#2C1810] focus:outline-none focus:ring-2 focus:ring-[#C5A059]"
                  autoFocus
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1 uppercase tracking-wide">
                  Details / Beschreibung (optional)
                </label>
                <textarea
                  value={noteDetail}
                  onChange={(e) => setNoteDetail(e.target.value)}
                  placeholder="Weitere Details zum Geschehen oder zu Absprachen mit der Spielleitung..."
                  rows={3}
                  className="w-full bg-white border border-[#d1c4b0] rounded-lg p-2.5 text-sm text-[#2C1810] focus:outline-none focus:ring-2 focus:ring-[#C5A059]"
                />
              </div>
              <div className="flex justify-end space-x-2 pt-2 border-t border-[#d1c4b0]">
                <button
                  type="button"
                  onClick={() => setShowAddNoteModal(false)}
                  className="px-4 py-2 text-[#1B365D] hover:bg-[#ebdcc4] rounded-lg text-sm font-semibold transition cursor-pointer"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  disabled={!noteTitle.trim()}
                  className="px-5 py-2 bg-[#1B365D] hover:bg-[#2a4f7e] text-white rounded-lg font-bold text-sm shadow-xs border border-[#10233f] disabled:opacity-50 transition cursor-pointer"
                >
                  Eintragen
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
