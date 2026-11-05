import React, { useState, useEffect } from 'react';
import { X, RotateCcw, Save, BookOpen, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import type { ResourceCategory } from '../../utils/gameResourceManager';

export interface EditableResourceItem {
  id?: string;
  type: ResourceCategory;
  name: string;
  secondaryKey?: string;
  categoryLabel?: string;
  subInfo?: string;
  source?: string;
  page?: number;
  originalDescription: string;
  currentDescription: string;
  isModified: boolean;
}

interface ResourceEditModalProps {
  item: EditableResourceItem;
  onClose: () => void;
  onSave: (type: ResourceCategory, name: string, description: string, secondaryKey?: string) => void;
  onReset: (type: ResourceCategory, name: string, secondaryKey?: string) => void;
}

const CATEGORY_NAMES: Record<ResourceCategory, string> = {
  spells: 'Zauber',
  masteries: 'Meisterschaft',
  strengths: 'Stärke',
  weaknesses: 'Schwäche',
  resources: 'Ressource',
};

export const ResourceEditModal: React.FC<ResourceEditModalProps> = ({
  item,
  onClose,
  onSave,
  onReset,
}) => {
  const [description, setDescription] = useState(item.currentDescription);
  const [hasChanged, setHasChanged] = useState(false);

  useEffect(() => {
    setDescription(item.currentDescription);
    setHasChanged(false);
  }, [item]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setDescription(val);
    setHasChanged(val !== item.currentDescription);
  };

  const handleSave = () => {
    onSave(item.type, item.name, description.trim(), item.secondaryKey);
    toast.success(`Beschreibung für "${item.name}" gespeichert.`);
    onClose();
  };

  const handleReset = () => {
    onReset(item.type, item.name, item.secondaryKey);
    setDescription(item.originalDescription);
    setHasChanged(false);
    toast.success(`"${item.name}" auf Standardbeschreibung zurückgesetzt.`);
    onClose();
  };

  const isCurrentlyDifferentFromDefault = description.trim() !== item.originalDescription.trim();

  return (
    <div
      className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-xs overflow-y-auto no-print"
      onClick={onClose}
    >
      <div
        className="bg-[#1C2130] rounded-xl shadow-2xl border-2 border-[#C5A059] max-w-xl w-full p-4 sm:p-6 relative max-h-[90vh] flex flex-col my-auto text-[#E6E1D3] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="resource-edit-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#C5A059]/40 pb-3 mb-4 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-[#0f2340] border border-[#C5A059]/40 text-[#C5A059]">
              <BookOpen size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-[#C5A059]/20 text-[#D9B563] border border-[#C5A059]/40">
                  {CATEGORY_NAMES[item.type]}
                </span>
                {item.categoryLabel && (
                  <span className="text-xs text-[#C5A059] font-semibold">
                    {item.categoryLabel}
                  </span>
                )}
              </div>
              <h2
                id="resource-edit-title"
                className="text-lg sm:text-xl font-bold fantasy-font text-[#F5F2EA]"
              >
                {item.name}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-[#A3A096] hover:text-[#F5F2EA] rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Schließen"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-4 overflow-y-auto pr-1.5 flex-1 custom-scrollbar modal-body-scroll">
          {/* Metadata pill box */}
          <div className="flex flex-wrap gap-2 text-xs bg-[#161B26] p-2.5 rounded-lg border border-[#3A4258]">
            {item.subInfo && (
              <span className="font-semibold text-[#F5F2EA]">
                Details: <span className="font-normal text-[#A3A096]">{item.subInfo}</span>
              </span>
            )}
            <span className="font-semibold text-[#F5F2EA]">
              Quelle: <span className="font-normal text-[#A3A096]">{item.source || 'GRW'}{item.page ? `, S. ${item.page}` : ''}</span>
            </span>
            <span className="font-semibold text-[#F5F2EA]">
              Status:{' '}
              {item.isModified ? (
                <span className="text-[#D9B563] font-bold bg-[#C5A059]/20 border border-[#C5A059]/40 px-1.5 py-0.5 rounded text-[11px]">
                  Angepasst
                </span>
              ) : (
                <span className="text-gray-400 bg-[#242A3B] border border-[#3A4258] px-1.5 py-0.5 rounded text-[11px]">
                  Standard
                </span>
              )}
            </span>
          </div>

          {/* Original description box */}
          <div className="p-3 bg-[#161B26] rounded-lg border border-dashed border-[#C5A059]/40 text-xs text-[#A3A096] space-y-1">
            <div className="flex items-center justify-between font-bold text-[#F5F2EA]">
              <span>Standardbeschreibung (Regelwerk):</span>
              <button
                type="button"
                onClick={() => {
                  setDescription(item.originalDescription);
                  setHasChanged(item.originalDescription !== item.currentDescription);
                }}
                className="text-[11px] text-[#C5A059] hover:underline cursor-pointer font-medium"
              >
                In Editor kopieren
              </button>
            </div>
            <p className="italic text-[#8E95A5] leading-relaxed">
              {item.originalDescription || '(Keine Beschreibung im Regelwerk hinterlegt)'}
            </p>
          </div>

          {/* Editable description textarea */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label
                htmlFor="resource-description-input"
                className="text-xs font-bold text-[#C5A059] uppercase tracking-wider"
              >
                Eigene / Angepasste Beschreibung:
              </label>
              <span className="text-[11px] text-[#A3A096]">
                {description.length} Zeichen
              </span>
            </div>
            <textarea
              id="resource-description-input"
              rows={5}
              value={description}
              onChange={handleChange}
              placeholder="Gib hier die angepasste Beschreibung ein..."
              className="w-full p-3 text-sm bg-[#161B26] border border-[#3A4258] focus:border-[#C5A059] rounded-lg text-[#E6E1D3] placeholder:text-[#6F6C63] focus:outline-hidden focus:ring-1 focus:ring-[#C5A059] resize-y shadow-inner font-sans leading-relaxed"
            />
          </div>

          {isCurrentlyDifferentFromDefault && (
            <div className="flex items-center gap-1.5 text-xs text-[#FBEFCE] bg-[#332A19] p-2 rounded border border-[#C5A059]/40">
              <AlertCircle size={14} className="shrink-0 text-[#C5A059]" />
              <span>Weicht von der Standard-Beschreibung des Grundregelwerks ab.</span>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#3A4258] pt-3 mt-4 shrink-0">
          <div>
            {item.isModified && (
              <button
                type="button"
                onClick={handleReset}
                className="px-3 py-2 text-xs font-bold rounded-lg border border-red-900/60 text-red-400 bg-red-950/40 hover:bg-red-900/50 flex items-center gap-1.5 cursor-pointer transition-colors"
                title="Auf Originalbeschreibung zurücksetzen"
              >
                <RotateCcw size={14} />
                <span>Standard wiederherstellen</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold rounded-lg border border-[#3A4258] text-[#A3A096] bg-[#242A3B] hover:text-[#F5F2EA] hover:bg-[#2C3347] cursor-pointer transition-colors"
            >
              Abbrechen
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-2 text-xs font-bold rounded-lg bg-[#0f2340] text-[#f3e5cf] hover:bg-[#1B365D] border border-[#C5A059] flex items-center gap-1.5 cursor-pointer transition-colors shadow-sm"
            >
              <Save size={14} className="text-[#C5A059]" />
              <span>Speichern</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
