import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  X,
  Search,
  RotateCcw,
  Sparkles,
  Swords,
  Dumbbell,
  AlertTriangle,
  Scroll,
  Edit2,
  Lock,
  Unlock,
  Layers,
  CheckCircle2,
  Info,
  Download,
  Upload,
  FileJson,
  FilterX,
  SlidersHorizontal,
  BookOpen,
  Trash2,
  ToggleLeft,
  ToggleRight,
  ExternalLink,
  Database,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useGameResources } from '../../hooks/useGameResources';
import { SPELLS_DB } from '../../data/spells';
import {
  MASTERIES_DB,
  GENERAL_COMBAT_MASTERIES,
  GENERAL_MAGIC_MASTERIES,
} from '../../data/masteries';
import { STRENGTHS_DATA } from '../../data/strengths';
import { WEAKNESSES_DATA, WEAKNESS_DESCRIPTIONS } from '../../data/weaknesses';
import { PREDEFINED_RESOURCES, RESOURCE_DESCRIPTIONS } from '../../data/resources';
import {
  type ResourceCategory,
  type GameModule,
  getSpellDescription,
  getMasteryDescription,
  getStrengthDescription,
  getWeaknessDescription,
  getResourceDescription,
  exportOverridesAsJson,
  importOverridesFromJson,
} from '../../utils/gameResourceManager';
import { ResourceEditModal, type EditableResourceItem } from './ResourceEditModal';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { DataModelSpecView } from './DataModelSpecView';
import { SqliteExplorerView } from './SqliteExplorerView';

interface AdminModalProps {
  onClose: () => void;
}

export type AdminTab = ResourceCategory | 'modules' | 'sqlite' | 'spec';

// Helper to normalize strings for forgiving search (handles umlauts, trimming, lowercasing)
function normalizeForSearch(text: string): string {
  return text
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .trim();
}

function itemMatchesSearch(item: EditableResourceItem, query: string): boolean {
  if (!query.trim()) return true;

  const haystack = [
    item.name,
    item.currentDescription,
    item.originalDescription,
    item.categoryLabel || '',
    item.subInfo || '',
    item.secondaryKey || '',
    item.source || '',
    item.page ? `seite ${item.page} s. ${item.page} s.${item.page} p.${item.page} ${item.page}` : '',
  ].join(' ');

  const rawHaystack = haystack.toLowerCase();
  const normHaystack = normalizeForSearch(haystack);

  // Multi-word search: all tokens must match either raw or normalized
  const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);

  return tokens.every((tok) => {
    const normTok = normalizeForSearch(tok);
    return rawHaystack.includes(tok) || normHaystack.includes(normTok);
  });
}

export const AdminModal: React.FC<AdminModalProps> = ({ onClose }) => {
  const {
    modules,
    overrides,
    counts,
    saveOverride,
    resetOverride,
    resetAllOverrides,
    toggleModule,
    removeModule,
    exportModule,
    getPackageById,
  } = useGameResources();

  const [activeTab, setActiveTab] = useState<AdminTab>('spells');
  const [selectedModuleId, setSelectedModuleId] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [onlyModified, setOnlyModified] = useState(false);

  // Category specific sub-filters
  const [spellSchoolFilter, setSpellSchoolFilter] = useState<string>('all');
  const [spellGradeFilter, setSpellGradeFilter] = useState<string>('all');
  const [masterySkillFilter, setMasterySkillFilter] = useState<string>('all');
  const [masteryTierFilter, setMasteryTierFilter] = useState<string>('all');
  const [strengthTypeFilter, setStrengthTypeFilter] = useState<string>('all');

  // Edit item state
  const [editingItem, setEditingItem] = useState<EditableResourceItem | null>(null);

  // Confirm dialogs
  const [confirmResetAll, setConfirmResetAll] = useState(false);
  const [moduleToDelete, setModuleToDelete] = useState<GameModule | null>(null);

  // File import ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // ---------------------------------------------------------------------------
  // Build Complete Unified Item Collections (Core GRW + Module Packages)
  // ---------------------------------------------------------------------------

  // Spells
  const allSpells: EditableResourceItem[] = useMemo(() => {
    const list: EditableResourceItem[] = [];

    // 1. Core GRW spells
    SPELLS_DB.forEach((s, idx) => {
      const currentDesc = getSpellDescription(s.name, s.school, s.description || '');
      const originalDesc = s.description || '';
      const isModified = currentDesc.trim() !== originalDesc.trim();

      list.push({
        id: `spells-grw-${s.school}-${s.name}-${s.grade}-${idx}`,
        type: 'spells',
        name: s.name,
        secondaryKey: s.school,
        categoryLabel: `${s.school} (Grad ${s.grade})`,
        subInfo: `Kosten: ${s.cost} | Dauer: ${s.castTime || '—'} | RW: ${s.range || '—'}`,
        source: s.source || 'GRW',
        page: s.page,
        originalDescription: originalDesc,
        currentDescription: currentDesc,
        isModified,
      });
    });

    // 2. Spells from installed module packages
    for (const mod of modules) {
      if (mod.id === 'grw') continue;
      const pkg = getPackageById(mod.id);
      if (pkg?.resources.spells) {
        pkg.resources.spells.forEach((s, idx) => {
          const currentDesc = getSpellDescription(s.name, s.school, s.description || '');
          const originalDesc = s.description || '';
          const isModified = currentDesc.trim() !== originalDesc.trim();

          list.push({
            id: `spells-${mod.id}-${s.school}-${s.name}-${s.grade}-${idx}`,
            type: 'spells',
            name: s.name,
            secondaryKey: s.school,
            categoryLabel: `${s.school} (Grad ${s.grade})`,
            subInfo: `Kosten: ${s.cost} | Dauer: ${s.castTime || '—'} | RW: ${s.range || '—'}${!mod.isActive ? ' (Inaktiv)' : ''}`,
            source: s.source || mod.shortName,
            page: s.page,
            originalDescription: originalDesc,
            currentDescription: currentDesc,
            isModified,
          });
        });
      }
    }

    return list;
  }, [modules, overrides, getPackageById]);

  // Masteries
  const allMasteries: EditableResourceItem[] = useMemo(() => {
    const list: EditableResourceItem[] = [];

    // 1. Core GRW Specific skills
    for (const [skillName, masteries] of Object.entries(MASTERIES_DB)) {
      for (let i = 0; i < masteries.length; i++) {
        const m = masteries[i];
        const currentDesc = getMasteryDescription(skillName, m.name, m.desc || '');
        const originalDesc = m.desc || '';
        const isModified = currentDesc.trim() !== originalDesc.trim();

        const prereqPart = m.prerequisiteText ? ` • Vorauss.: ${m.prerequisiteText}` : '';
        const subInfo = `Fertigkeit: ${skillName} • Schwelle ${m.tier || 1} (FP ≥ ${m.minSkillValue || 6})${prereqPart}`;

        list.push({
          id: `masteries-grw-${skillName}-${m.name}-${m.page || ''}-${i}`,
          type: 'masteries',
          name: m.name,
          secondaryKey: skillName,
          categoryLabel: skillName,
          subInfo,
          source: m.source || 'GRW',
          page: m.page,
          originalDescription: originalDesc,
          currentDescription: currentDesc,
          isModified,
        });
      }
    }

    // 2. Core GRW General combat masteries
    for (let i = 0; i < GENERAL_COMBAT_MASTERIES.length; i++) {
      const m = GENERAL_COMBAT_MASTERIES[i];
      const currentDesc = getMasteryDescription(
        'Allgemeine Kampfmeisterschaften',
        m.name,
        m.desc || '',
      );
      const originalDesc = m.desc || '';
      const isModified = currentDesc.trim() !== originalDesc.trim();

      const prereqPart = m.prerequisiteText ? ` • Vorauss.: ${m.prerequisiteText}` : '';
      const subInfo = `Kampf (Allgemein) • Schwelle ${m.tier || 1} (FP ≥ ${m.minSkillValue || 6})${prereqPart}`;

      list.push({
        id: `masteries-general-${m.name}-${m.page || ''}-${i}`,
        type: 'masteries',
        name: m.name,
        secondaryKey: 'Allgemein',
        categoryLabel: 'Allgemeine Kampfmeisterschaften',
        subInfo,
        source: m.source || 'GRW',
        page: m.page,
        originalDescription: originalDesc,
        currentDescription: currentDesc,
        isModified,
      });
    }

    // 2b. Core GRW General magic masteries
    for (let i = 0; i < GENERAL_MAGIC_MASTERIES.length; i++) {
      const m = GENERAL_MAGIC_MASTERIES[i];
      const currentDesc = getMasteryDescription(
        'Allgemeine Magiemeisterschaften',
        m.name,
        m.desc || '',
      );
      const originalDesc = m.desc || '';
      const isModified = currentDesc.trim() !== originalDesc.trim();

      const prereqPart = m.prerequisiteText ? ` • Vorauss.: ${m.prerequisiteText}` : '';
      const subInfo = `Magie (Allgemein) • Schwelle ${m.tier || 1} (FP ≥ ${m.minSkillValue || 6})${prereqPart}`;

      list.push({
        id: `masteries-general-magic-${m.name}-${m.page || ''}-${i}`,
        type: 'masteries',
        name: m.name,
        secondaryKey: 'Allgemein',
        categoryLabel: 'Allgemeine Magiemeisterschaften',
        subInfo,
        source: m.source || 'GRW',
        page: m.page,
        originalDescription: originalDesc,
        currentDescription: currentDesc,
        isModified,
      });
    }

    // 3. Module masteries
    for (const mod of modules) {
      if (mod.id === 'grw') continue;
      const pkg = getPackageById(mod.id);
      if (pkg?.resources.masteries) {
        pkg.resources.masteries.forEach((m, idx) => {
          const currentDesc = getMasteryDescription(m.skill, m.name, m.desc || '');
          const originalDesc = m.desc || '';
          const isModified = currentDesc.trim() !== originalDesc.trim();

          list.push({
            id: `masteries-${mod.id}-${m.skill}-${m.name}-${idx}`,
            type: 'masteries',
            name: m.name,
            secondaryKey: m.skill,
            categoryLabel: m.skill,
            subInfo: `Fertigkeit: ${m.skill}${!mod.isActive ? ' (Inaktiv)' : ''}`,
            source: m.source || mod.shortName,
            page: m.page,
            originalDescription: originalDesc,
            currentDescription: currentDesc,
            isModified,
          });
        });
      }
    }

    return list;
  }, [modules, overrides, getPackageById]);

  // Strengths
  const allStrengths: EditableResourceItem[] = useMemo(() => {
    const list: EditableResourceItem[] = [];

    // Core GRW Strengths
    STRENGTHS_DATA.forEach((st, idx) => {
      const currentDesc = getStrengthDescription(st.name, st.desc || '');
      const originalDesc = st.desc || '';
      const isModified = currentDesc.trim() !== originalDesc.trim();

      list.push({
        id: `strengths-grw-${st.name}-${idx}`,
        type: 'strengths',
        name: st.name,
        categoryLabel: st.onlyCreation ? 'Nur Erschaffung' : 'Erschaffung & Steigerung',
        subInfo: `Kosten: ${st.cost} | Max: ${st.max || 1}${st.multi ? ' (mehrfach)' : ''}`,
        source: st.source || 'GRW',
        page: st.page,
        originalDescription: originalDesc,
        currentDescription: currentDesc,
        isModified,
      });
    });

    // Module Strengths
    for (const mod of modules) {
      if (mod.id === 'grw') continue;
      const pkg = getPackageById(mod.id);
      if (pkg?.resources.strengths) {
        pkg.resources.strengths.forEach((st, idx) => {
          const currentDesc = getStrengthDescription(st.name, st.desc || '');
          const originalDesc = st.desc || '';
          const isModified = currentDesc.trim() !== originalDesc.trim();

          list.push({
            id: `strengths-${mod.id}-${st.name}-${idx}`,
            type: 'strengths',
            name: st.name,
            categoryLabel: st.onlyCreation ? 'Nur Erschaffung' : 'Erschaffung & Steigerung',
            subInfo: `Kosten: ${st.cost} | Max: ${st.max || 1}${st.multi ? ' (mehrfach)' : ''}${!mod.isActive ? ' (Inaktiv)' : ''}`,
            source: st.source || mod.shortName,
            page: st.page,
            originalDescription: originalDesc,
            currentDescription: currentDesc,
            isModified,
          });
        });
      }
    }

    return list;
  }, [modules, overrides, getPackageById]);

  // Weaknesses
  const allWeaknesses: EditableResourceItem[] = useMemo(() => {
    const list: EditableResourceItem[] = [];

    // Core GRW Weaknesses
    WEAKNESSES_DATA.forEach((wName, idx) => {
      const originalDesc = WEAKNESS_DESCRIPTIONS[wName] || '';
      const currentDesc = getWeaknessDescription(wName, originalDesc);
      const isModified = currentDesc.trim() !== originalDesc.trim();

      list.push({
        id: `weaknesses-grw-${wName}-${idx}`,
        type: 'weaknesses',
        name: wName,
        categoryLabel: 'Schwäche',
        subInfo: 'Generelle Schwäche',
        source: 'GRW',
        page: 78,
        originalDescription: originalDesc,
        currentDescription: currentDesc,
        isModified,
      });
    });

    // Module Weaknesses
    for (const mod of modules) {
      if (mod.id === 'grw') continue;
      const pkg = getPackageById(mod.id);
      if (pkg?.resources.weaknesses) {
        pkg.resources.weaknesses.forEach((w, idx) => {
          const originalDesc = w.desc || '';
          const currentDesc = getWeaknessDescription(w.name, originalDesc);
          const isModified = currentDesc.trim() !== originalDesc.trim();

          list.push({
            id: `weaknesses-${mod.id}-${w.name}-${idx}`,
            type: 'weaknesses',
            name: w.name,
            categoryLabel: 'Schwäche',
            subInfo: `Modul-Schwäche${!mod.isActive ? ' (Inaktiv)' : ''}`,
            source: w.source || mod.shortName,
            page: w.page,
            originalDescription: originalDesc,
            currentDescription: currentDesc,
            isModified,
          });
        });
      }
    }

    return list;
  }, [modules, overrides, getPackageById]);

  // Resources
  const allResources: EditableResourceItem[] = useMemo(() => {
    const list: EditableResourceItem[] = [];

    // Core GRW Resources
    PREDEFINED_RESOURCES.forEach((r, idx) => {
      const originalDesc = r.desc || RESOURCE_DESCRIPTIONS[r.name] || '';
      const currentDesc = getResourceDescription(r.name, originalDesc);
      const isModified = currentDesc.trim() !== originalDesc.trim();

      list.push({
        id: `resources-grw-${r.name}-${idx}`,
        type: 'resources',
        name: r.name,
        categoryLabel: 'Ressource',
        subInfo: 'Ressourcen-Vorteil',
        source: 'GRW',
        page: 79,
        originalDescription: originalDesc,
        currentDescription: currentDesc,
        isModified,
      });
    });

    // Module Resources
    for (const mod of modules) {
      if (mod.id === 'grw') continue;
      const pkg = getPackageById(mod.id);
      if (pkg?.resources.gameResources) {
        pkg.resources.gameResources.forEach((r, idx) => {
          const originalDesc = r.desc || '';
          const currentDesc = getResourceDescription(r.name, originalDesc);
          const isModified = currentDesc.trim() !== originalDesc.trim();

          list.push({
            id: `resources-${mod.id}-${r.name}-${idx}`,
            type: 'resources',
            name: r.name,
            categoryLabel: 'Ressource',
            subInfo: `Modul-Ressource${!mod.isActive ? ' (Inaktiv)' : ''}`,
            source: r.source || mod.shortName,
            page: r.page,
            originalDescription: originalDesc,
            currentDescription: currentDesc,
            isModified,
          });
        });
      }
    }

    return list;
  }, [modules, overrides, getPackageById]);

  // Current category base items
  const currentCategoryItems = useMemo(() => {
    switch (activeTab) {
      case 'spells':
        return allSpells;
      case 'masteries':
        return allMasteries;
      case 'strengths':
        return allStrengths;
      case 'weaknesses':
        return allWeaknesses;
      case 'resources':
        return allResources;
      default:
        return [];
    }
  }, [activeTab, allSpells, allMasteries, allStrengths, allWeaknesses, allResources]);

  // Unique Spell Schools (including any from modules)
  const spellSchools = useMemo(() => {
    const set = new Set<string>();
    allSpells.forEach((s) => {
      if (s.secondaryKey) set.add(s.secondaryKey);
    });
    return Array.from(set).sort();
  }, [allSpells]);

  // Unique Mastery Skills (including any from modules)
  const masterySkills = useMemo(() => {
    const set = new Set<string>();
    allMasteries.forEach((m) => {
      if (m.secondaryKey) set.add(m.secondaryKey);
      if (m.categoryLabel) set.add(m.categoryLabel);
    });
    return Array.from(set).sort();
  }, [allMasteries]);

  // ---------------------------------------------------------------------------
  // Filtering Logic
  // ---------------------------------------------------------------------------

  const filteredItems = useMemo(() => {
    return currentCategoryItems.filter((item) => {
      // 1. Module filter
      if (selectedModuleId !== 'all') {
        const mod = modules.find((m) => m.id === selectedModuleId);
        if (selectedModuleId === 'grw') {
          // Standard core rules items
          if (item.source && item.source.toUpperCase() !== 'GRW' && item.source !== 'creation') {
            return false;
          }
        } else if (mod) {
          const sUpper = (item.source || '').toUpperCase();
          const matches =
            sUpper === mod.id.toUpperCase() ||
            sUpper === mod.shortName.toUpperCase();
          if (!matches) {
            return false;
          }
        }
      }

      // 2. Only modified filter
      if (onlyModified && !item.isModified) {
        return false;
      }

      // 3. Category specific sub-filters
      if (activeTab === 'spells') {
        if (spellSchoolFilter !== 'all' && item.secondaryKey !== spellSchoolFilter) {
          return false;
        }
        if (spellGradeFilter !== 'all') {
          if (!item.categoryLabel?.includes(`Grad ${spellGradeFilter}`)) {
            return false;
          }
        }
      } else if (activeTab === 'masteries') {
        if (masterySkillFilter !== 'all') {
          const matchSkill =
            item.categoryLabel === masterySkillFilter ||
            item.secondaryKey === masterySkillFilter;
          if (!matchSkill) return false;
        }
        if (masteryTierFilter !== 'all') {
          if (!item.name.includes(`(${masteryTierFilter})`)) {
            return false;
          }
        }
      } else if (activeTab === 'strengths') {
        if (strengthTypeFilter === 'creation_only' && !item.categoryLabel?.includes('Nur Erschaffung')) {
          return false;
        }
        if (strengthTypeFilter === 'advancement' && item.categoryLabel?.includes('Nur Erschaffung')) {
          return false;
        }
        if (strengthTypeFilter === 'multi' && !item.subInfo?.includes('mehrfach')) {
          return false;
        }
      }

      // 4. Robust Search Query
      if (search.trim()) {
        if (!itemMatchesSearch(item, search)) {
          return false;
        }
      }

      return true;
    });
  }, [
    currentCategoryItems,
    selectedModuleId,
    modules,
    onlyModified,
    activeTab,
    spellSchoolFilter,
    spellGradeFilter,
    masterySkillFilter,
    masteryTierFilter,
    strengthTypeFilter,
    search,
  ]);

  // Is any filter active?
  const isAnyFilterActive =
    search.trim() !== '' ||
    onlyModified ||
    selectedModuleId !== 'all' ||
    (activeTab === 'spells' && (spellSchoolFilter !== 'all' || spellGradeFilter !== 'all')) ||
    (activeTab === 'masteries' && (masterySkillFilter !== 'all' || masteryTierFilter !== 'all')) ||
    (activeTab === 'strengths' && strengthTypeFilter !== 'all');

  const handleResetFilters = () => {
    setSearch('');
    setOnlyModified(false);
    setSelectedModuleId('all');
    setSpellSchoolFilter('all');
    setSpellGradeFilter('all');
    setMasterySkillFilter('all');
    setMasteryTierFilter('all');
    setStrengthTypeFilter('all');
  };

  // ---------------------------------------------------------------------------
  // JSON Export and Import Handlers
  // ---------------------------------------------------------------------------

  const handleExportJson = () => {
    try {
      const dataStr = exportOverridesAsJson();
      const blob = new Blob([dataStr], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `splittermond-ressourcen-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success('Ressourcen-Backup erfolgreich als JSON heruntergeladen.');
    } catch {
      toast.error('Export fehlgeschlagen.');
    }
  };

  const handleExportSingleModule = (moduleId: string) => {
    try {
      const json = exportModule(moduleId);
      if (!json) {
        toast.error('Modul konnte nicht exportiert werden.');
        return;
      }
      const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `splittermond-modul-${moduleId}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success(`Modul "${moduleId}" als JSON exportiert.`);
    } catch {
      toast.error('Export fehlgeschlagen.');
    }
  };

  const handleImportFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const result = importOverridesFromJson(content);
        if (result.success) {
          toast.success(result.message);
        } else {
          toast.error(result.message);
        }
      }
    };
    reader.onerror = () => {
      toast.error('Fehler beim Lesen der Datei.');
    };
    reader.readAsText(file);
    // Reset file input value
    e.target.value = '';
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-xs overflow-hidden no-print"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-6xl h-[92vh] flex flex-col bg-[#1C2130] rounded-2xl shadow-2xl border-2 border-[#C5A059] p-3 sm:p-5 text-[#E6E1D3] relative overflow-hidden"
      >
        {/* Hidden File Input for JSON import */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleImportFileChange}
          accept=".json"
          className="hidden"
        />

        {/* ------------------------------------------------------------- */}
        {/* MODAL HEADER */}
        {/* ------------------------------------------------------------- */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#C5A059]/40 shrink-0">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#0f2340] border border-[#C5A059]/40 text-[#C5A059] flex items-center justify-center shadow-xs">
              <Layers size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-xl font-bold font-serif text-[#F5F2EA] tracking-wide">
                  Spielressourcen- & Modul-Verwaltung
                </h2>
              </div>
              <p className="text-xs text-[#A3A096] hidden sm:block">
                Regelwerks-Module, Zauber, Meisterschaften und Stärken persistent bearbeiten und als JSON importieren.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-[#A3A096] hover:text-[#F5F2EA] rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              aria-label="Schließen"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* COMPACT MODULE BAR */}
        {/* ------------------------------------------------------------- */}
        <div className="my-2.5 bg-[#161B26] border border-[#3A4258] rounded-xl p-2.5 shrink-0">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Layers size={15} className="text-[#C5A059]" />
              <span className="text-xs font-bold uppercase tracking-wider text-[#F5F2EA]">
                Installierte Regelwerke ({modules.length})
              </span>
              <span className="text-[11px] text-[#A3A096] hidden md:inline">
                • GRW ist das unveränderliche Basis-Regelwerk
              </span>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              {/* Export Button */}
              <button
                type="button"
                onClick={handleExportJson}
                className="px-2.5 py-1 text-xs font-bold rounded-lg border border-[#C5A059]/60 text-[#E6E1D3] bg-[#242A3B] hover:bg-[#2C3347] hover:border-[#C5A059] flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                title="Gesamtes System-Backup als JSON herunterladen"
              >
                <Download size={13} className="text-[#C5A059]" />
                <span>Backup (JSON)</span>
              </button>

              {/* Import Button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-2.5 py-1 text-xs font-bold rounded-lg border border-[#C5A059]/60 text-[#E6E1D3] bg-[#242A3B] hover:bg-[#2C3347] hover:border-[#C5A059] flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                title="Modul oder Backup aus JSON-Datei importieren"
              >
                <Upload size={13} className="text-[#C5A059]" />
                <span>Importieren</span>
              </button>

              {/* Link to Spec */}
              <button
                type="button"
                onClick={() => setActiveTab('spec')}
                className="px-2.5 py-1 text-xs font-bold rounded-lg bg-[#332A19] border border-[#C5A059]/60 text-[#FBEFCE] hover:bg-[#433722] flex items-center gap-1 cursor-pointer transition-colors"
                title="Genaue Beschreibung des Datenmodells abrufen"
              >
                <BookOpen size={13} className="text-[#C5A059]" />
                <span>Datenmodell-Doku</span>
              </button>
            </div>
          </div>

          {/* Quick Module Status Badges */}
          <div className="flex flex-wrap items-center gap-1.5 mt-2">
            {modules.map((m) => {
              const isSelectedFilter = selectedModuleId === m.id;
              return (
                <div
                  key={m.id}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs transition-colors ${
                    isSelectedFilter
                      ? 'bg-[#C5A059] text-[#1B365D] font-bold border-[#C5A059]'
                      : m.isActive
                      ? 'bg-[#242A3B] text-[#E6E1D3] border-[#3A4258] hover:border-[#C5A059]/60'
                      : 'bg-[#161B26] text-gray-500 border-[#2A3246]'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      if (!m.isDefault) {
                        toggleModule(m.id);
                        toast.success(`${m.name} ist nun ${!m.isActive ? 'aktiv' : 'inaktiv'}`);
                      }
                    }}
                    disabled={m.isDefault}
                    className={`cursor-pointer ${m.isDefault ? 'opacity-50 cursor-not-allowed' : ''}`}
                    title={m.isDefault ? 'Standard-Regelwerk ist immer aktiv' : `${m.name} ein-/ausschalten`}
                  >
                    {m.isActive ? (
                      <CheckCircle2 size={13} className={isSelectedFilter ? 'text-[#1B365D]' : 'text-emerald-400'} />
                    ) : (
                      <span className="w-2.5 h-2.5 rounded-full bg-gray-600 inline-block"></span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedModuleId(selectedModuleId === m.id ? 'all' : m.id)}
                    className="font-bold hover:underline cursor-pointer"
                    title={`Nur Ressourcen von ${m.name} anzeigen`}
                  >
                    {m.shortName || m.name}
                  </button>

                  {m.itemCounts && (
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded ${
                        isSelectedFilter ? 'bg-[#1B365D]/20 text-[#1B365D]' : 'bg-[#161B26] text-[#A3A096]'
                      }`}
                    >
                      {(m.itemCounts.spells || 0) +
                        (m.itemCounts.masteries || 0) +
                        (m.itemCounts.strengths || 0) +
                        (m.itemCounts.weaknesses || 0) +
                        (m.itemCounts.resources || 0)}
                    </span>
                  )}
                </div>
              );
            })}

            {selectedModuleId !== 'all' && (
              <button
                type="button"
                onClick={() => setSelectedModuleId('all')}
                className="text-[11px] text-[#C5A059] underline font-medium hover:text-[#D9B563] ml-1 cursor-pointer"
              >
                Filter aufheben
              </button>
            )}
          </div>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* MAIN NAVIGATION TABS */}
        {/* ------------------------------------------------------------- */}
        <div className="flex border-b border-[#3A4258] mb-2.5 gap-1 shrink-0 overflow-x-auto custom-scrollbar pb-0.5">
          <button
            type="button"
            onClick={() => setActiveTab('spells')}
            className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-bold flex items-center gap-1.5 rounded-t-lg transition-colors cursor-pointer shrink-0 ${
              activeTab === 'spells'
                ? 'bg-[#0f2340] text-[#F5F2EA] border-t-2 border-[#C5A059] shadow-inner'
                : 'text-[#A3A096] hover:text-[#F5F2EA] hover:bg-white/5'
            }`}
          >
            <Sparkles size={15} className="text-[#C5A059]" />
            <span>Zauber</span>
            <span className="text-[11px] opacity-80 font-normal">({allSpells.length})</span>
            {counts.spells > 0 && (
              <span className="w-2 h-2 rounded-full bg-[#C5A059]"></span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('masteries')}
            className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-bold flex items-center gap-1.5 rounded-t-lg transition-colors cursor-pointer shrink-0 ${
              activeTab === 'masteries'
                ? 'bg-[#0f2340] text-[#F5F2EA] border-t-2 border-[#C5A059] shadow-inner'
                : 'text-[#A3A096] hover:text-[#F5F2EA] hover:bg-white/5'
            }`}
          >
            <Swords size={15} className="text-[#C5A059]" />
            <span>Meisterschaften</span>
            <span className="text-[11px] opacity-80 font-normal">({allMasteries.length})</span>
            {counts.masteries > 0 && (
              <span className="w-2 h-2 rounded-full bg-[#C5A059]"></span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('strengths')}
            className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-bold flex items-center gap-1.5 rounded-t-lg transition-colors cursor-pointer shrink-0 ${
              activeTab === 'strengths'
                ? 'bg-[#0f2340] text-[#F5F2EA] border-t-2 border-[#C5A059] shadow-inner'
                : 'text-[#A3A096] hover:text-[#F5F2EA] hover:bg-white/5'
            }`}
          >
            <Dumbbell size={15} className="text-[#C5A059]" />
            <span>Stärken</span>
            <span className="text-[11px] opacity-80 font-normal">({allStrengths.length})</span>
            {counts.strengths > 0 && (
              <span className="w-2 h-2 rounded-full bg-[#C5A059]"></span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('weaknesses')}
            className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-bold flex items-center gap-1.5 rounded-t-lg transition-colors cursor-pointer shrink-0 ${
              activeTab === 'weaknesses'
                ? 'bg-[#0f2340] text-[#F5F2EA] border-t-2 border-[#C5A059] shadow-inner'
                : 'text-[#A3A096] hover:text-[#F5F2EA] hover:bg-white/5'
            }`}
          >
            <AlertTriangle size={15} className="text-[#C5A059]" />
            <span>Schwächen</span>
            <span className="text-[11px] opacity-80 font-normal">({allWeaknesses.length})</span>
            {counts.weaknesses > 0 && (
              <span className="w-2 h-2 rounded-full bg-[#C5A059]"></span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('resources')}
            className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-bold flex items-center gap-1.5 rounded-t-lg transition-colors cursor-pointer shrink-0 ${
              activeTab === 'resources'
                ? 'bg-[#0f2340] text-[#F5F2EA] border-t-2 border-[#C5A059] shadow-inner'
                : 'text-[#A3A096] hover:text-[#F5F2EA] hover:bg-white/5'
            }`}
          >
            <Scroll size={15} className="text-[#C5A059]" />
            <span>Ressourcen</span>
            <span className="text-[11px] opacity-80 font-normal">({allResources.length})</span>
            {counts.resources > 0 && (
              <span className="w-2 h-2 rounded-full bg-[#C5A059]"></span>
            )}
          </button>

          {/* New Tab: Modules Management */}
          <button
            type="button"
            onClick={() => setActiveTab('modules')}
            className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-bold flex items-center gap-1.5 rounded-t-lg transition-colors cursor-pointer shrink-0 ${
              activeTab === 'modules'
                ? 'bg-[#0f2340] text-[#F5F2EA] border-t-2 border-[#C5A059] shadow-inner'
                : 'text-[#A3A096] hover:text-[#F5F2EA] hover:bg-white/5'
            }`}
          >
            <Layers size={15} className="text-[#C5A059]" />
            <span>Module verwalten</span>
            <span className="text-[11px] opacity-80 font-normal">({modules.length})</span>
          </button>

          {/* New Tab: SQLite Database Explorer */}
          <button
            type="button"
            onClick={() => setActiveTab('sqlite')}
            className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-bold flex items-center gap-1.5 rounded-t-lg transition-colors cursor-pointer shrink-0 ${
              activeTab === 'sqlite'
                ? 'bg-[#0f2340] text-[#F5F2EA] border-t-2 border-[#C5A059] shadow-inner'
                : 'text-[#A3A096] hover:text-[#F5F2EA] hover:bg-white/5'
            }`}
          >
            <Database size={15} className="text-[#C5A059]" />
            <span>SQLite-Datenbank</span>
            <span className="px-1.5 py-0.2 bg-[#C5A059]/20 text-[#C5A059] border border-[#C5A059]/40 rounded text-[10px] font-mono">GRW Live</span>
          </button>

          {/* New Tab: Data Model Spec & Documentation */}
          <button
            type="button"
            onClick={() => setActiveTab('spec')}
            className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-bold flex items-center gap-1.5 rounded-t-lg transition-colors cursor-pointer shrink-0 ${
              activeTab === 'spec'
                ? 'bg-[#332A19] text-[#FBEFCE] border-t-2 border-[#C5A059]'
                : 'bg-[#242A3B] text-[#C5A059] border-t border-[#3A4258] hover:bg-[#332A19]/60'
            }`}
          >
            <BookOpen size={15} />
            <span>Datenmodell & Doku</span>
            <span className="px-1.5 py-0.2 bg-black/40 text-[#C5A059] border border-[#C5A059]/40 rounded text-[10px] font-mono">Schema</span>
          </button>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* VIEW 0: SQLITE EXPLORER */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'sqlite' && (
          <div className="flex-1 overflow-y-auto pr-1.5 custom-scrollbar modal-body-scroll">
            <SqliteExplorerView />
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* VIEW 1: DATA MODEL SPEC & DOCUMENTATION */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'spec' && (
          <div className="flex-1 overflow-y-auto pr-1.5 custom-scrollbar modal-body-scroll">
            <DataModelSpecView />
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* VIEW 2: MODULES MANAGEMENT */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'modules' && (
          <div className="flex-1 overflow-y-auto pr-1.5 custom-scrollbar modal-body-scroll space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-[#242A3B] rounded-xl border border-[#3A4258] shadow-xs">
              <div>
                <h3 className="font-bold text-sm text-[#F5F2EA] font-serif">
                  Regelwerks-Module & Erweiterungen
                </h3>
                <p className="text-xs text-[#A3A096]">
                  Verwalte aktive Module oder importiere neue JSON-Pakete basierend auf dem Splittermond-Datenmodell.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1.5 text-xs font-bold rounded-lg bg-[#0f2340] text-[#f3e5cf] hover:bg-[#1B365D] border border-[#C5A059] flex items-center gap-1.5 cursor-pointer transition-colors shadow-xs"
                >
                  <Upload size={14} className="text-[#C5A059]" />
                  <span>Modul importieren (.json)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('spec')}
                  className="px-3 py-1.5 text-xs font-bold rounded-lg bg-[#332A19] text-[#FBEFCE] border border-[#C5A059]/60 hover:bg-[#433722] flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <BookOpen size={14} className="text-[#C5A059]" />
                  <span>Datenmodell-Spezifikation</span>
                </button>
              </div>
            </div>

            {/* Modules Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {modules.map((m) => (
                <div
                  key={m.id}
                  className={`p-4 rounded-xl border transition-all ${
                    m.isActive
                      ? 'bg-[#242A3B] border-[#3A4258] hover:border-[#C5A059]/70 shadow-xs'
                      : 'bg-[#161B26]/80 border-gray-800 opacity-75'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-sm text-[#F5F2EA]">{m.name}</h4>
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-[#C5A059]/20 text-[#D9B563] border border-[#C5A059]/40">
                          {m.shortName}
                        </span>
                        {m.version && (
                          <span className="text-[10px] text-[#A3A096] font-mono">v{m.version}</span>
                        )}
                      </div>
                      <p className="text-xs text-[#A3A096] mt-1">{m.description}</p>
                      {m.author && (
                        <span className="text-[11px] text-[#8E95A5] block mt-0.5">
                          Autor: {m.author}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-col items-end gap-1.5">
                      {/* Active toggle */}
                      {m.isDefault ? (
                        <span className="text-[11px] font-bold text-emerald-300 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800">
                          Immer aktiv
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            toggleModule(m.id);
                            toast.success(`${m.name} ist nun ${!m.isActive ? 'aktiv' : 'inaktiv'}`);
                          }}
                          className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded cursor-pointer transition-colors ${
                            m.isActive
                              ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800 hover:bg-emerald-900/60'
                              : 'bg-[#161B26] text-gray-400 border border-[#3A4258] hover:bg-[#202636]'
                          }`}
                        >
                          {m.isActive ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                          <span>{m.isActive ? 'Aktiv' : 'Inaktiv'}</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Item Counts */}
                  {m.itemCounts && (
                    <div className="mt-3 pt-2 border-t border-[#3A4258]/60 grid grid-cols-5 gap-1 text-center text-[11px]">
                      <div className="bg-[#161B26] p-1 rounded border border-[#3A4258]/40">
                        <span className="text-[#A3A096] block text-[10px]">Zauber</span>
                        <span className="font-bold text-[#F5F2EA]">{m.itemCounts.spells || 0}</span>
                      </div>
                      <div className="bg-[#161B26] p-1 rounded border border-[#3A4258]/40">
                        <span className="text-[#A3A096] block text-[10px]">Meister.</span>
                        <span className="font-bold text-[#F5F2EA]">{m.itemCounts.masteries || 0}</span>
                      </div>
                      <div className="bg-[#161B26] p-1 rounded border border-[#3A4258]/40">
                        <span className="text-[#A3A096] block text-[10px]">Stärken</span>
                        <span className="font-bold text-[#F5F2EA]">{m.itemCounts.strengths || 0}</span>
                      </div>
                      <div className="bg-[#161B26] p-1 rounded border border-[#3A4258]/40">
                        <span className="text-[#A3A096] block text-[10px]">Schwächen</span>
                        <span className="font-bold text-[#F5F2EA]">{m.itemCounts.weaknesses || 0}</span>
                      </div>
                      <div className="bg-[#161B26] p-1 rounded border border-[#3A4258]/40">
                        <span className="text-[#A3A096] block text-[10px]">Ressour.</span>
                        <span className="font-bold text-[#F5F2EA]">{m.itemCounts.resources || 0}</span>
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="mt-3 flex items-center justify-between gap-2 pt-2 border-t border-[#3A4258]/60 text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedModuleId(m.id);
                        setActiveTab('masteries');
                      }}
                      className="text-[#C5A059] hover:underline font-bold text-xs cursor-pointer"
                    >
                      Inhalte anzeigen & filtern →
                    </button>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleExportSingleModule(m.id)}
                        className="px-2 py-1 text-[11px] rounded border border-[#3A4258] hover:bg-white/5 text-[#E6E1D3] flex items-center gap-1 cursor-pointer"
                        title="Dieses Modul als JSON herunterladen"
                      >
                        <Download size={12} className="text-[#C5A059]" />
                        <span>JSON</span>
                      </button>

                      {m.canRemove && (
                        <button
                          type="button"
                          onClick={() => setModuleToDelete(m)}
                          className="px-2 py-1 text-[11px] rounded border border-red-900/60 text-red-400 hover:bg-red-950/40 flex items-center gap-1 cursor-pointer"
                          title="Modul dauerhaft löschen"
                        >
                          <Trash2 size={12} />
                          <span>Löschen</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* VIEW 3: RESOURCE EDITING (SPELLS, MASTERIES, STRENGTHS, ETC.) */}
        {/* ------------------------------------------------------------- */}
        {activeTab !== 'spec' && activeTab !== 'modules' && (
          <>
            {/* SEARCH & FILTER BAR */}
            <div className="bg-[#242A3B] p-2.5 rounded-xl border border-[#3A4258] mb-2.5 shrink-0 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                {/* Search Input */}
                <div className="relative flex-1 min-w-[200px]">
                  <Search
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Name, Beschreibung, Seite oder Details durchsuchen..."
                    className="w-full pl-9 pr-8 py-1.5 text-xs sm:text-sm rounded-lg border border-[#3A4258] focus:border-[#C5A059] bg-[#161B26] text-[#E6E1D3] placeholder:text-[#6F6C63] focus:outline-hidden focus:ring-1 focus:ring-[#C5A059]"
                  />
                  {search && (
                    <button
                      type="button"
                      onClick={() => setSearch('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#F5F2EA] cursor-pointer"
                      title="Suche löschen"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                {/* Module Filter Dropdown */}
                <select
                  value={selectedModuleId}
                  onChange={(e) => setSelectedModuleId(e.target.value)}
                  className="py-1.5 px-2.5 text-xs sm:text-sm rounded-lg border border-[#3A4258] focus:border-[#C5A059] bg-[#161B26] text-[#E6E1D3] focus:outline-hidden focus:ring-1 focus:ring-[#C5A059] cursor-pointer"
                  title="Nach Regelwerks-Modul filtern"
                >
                  <option value="all">Alle Module (Gesamt)</option>
                  <option value="grw">Grundregelwerk (GRW)</option>
                  {modules
                    .filter((m) => !m.isDefault)
                    .map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.shortName})
                      </option>
                    ))}
                </select>

                {/* Category-Specific Filters: Spells */}
                {activeTab === 'spells' && (
                  <>
                    <select
                      value={spellSchoolFilter}
                      onChange={(e) => setSpellSchoolFilter(e.target.value)}
                      className="py-1.5 px-2.5 text-xs rounded-lg border border-[#3A4258] focus:border-[#C5A059] bg-[#161B26] text-[#E6E1D3] cursor-pointer max-w-[150px]"
                    >
                      <option value="all">Alle Schulen</option>
                      {spellSchools.map((sch) => (
                        <option key={sch} value={sch}>
                          {sch}
                        </option>
                      ))}
                    </select>

                    <select
                      value={spellGradeFilter}
                      onChange={(e) => setSpellGradeFilter(e.target.value)}
                      className="py-1.5 px-2.5 text-xs rounded-lg border border-[#3A4258] focus:border-[#C5A059] bg-[#161B26] text-[#E6E1D3] cursor-pointer"
                    >
                      <option value="all">Alle Grade</option>
                      <option value="0">Grad 0</option>
                      <option value="1">Grad 1</option>
                      <option value="2">Grad 2</option>
                      <option value="3">Grad 3</option>
                      <option value="4">Grad 4</option>
                      <option value="5">Grad 5</option>
                    </select>
                  </>
                )}

                {/* Category-Specific Filters: Masteries */}
                {activeTab === 'masteries' && (
                  <>
                    <select
                      value={masterySkillFilter}
                      onChange={(e) => setMasterySkillFilter(e.target.value)}
                      className="py-1.5 px-2.5 text-xs rounded-lg border border-[#3A4258] focus:border-[#C5A059] bg-[#161B26] text-[#E6E1D3] cursor-pointer max-w-[170px]"
                    >
                      <option value="all">Alle Fertigkeiten</option>
                      {masterySkills.map((sk) => (
                        <option key={sk} value={sk}>
                          {sk}
                        </option>
                      ))}
                    </select>

                    <select
                      value={masteryTierFilter}
                      onChange={(e) => setMasteryTierFilter(e.target.value)}
                      className="py-1.5 px-2.5 text-xs rounded-lg border border-[#3A4258] focus:border-[#C5A059] bg-[#161B26] text-[#E6E1D3] cursor-pointer"
                    >
                      <option value="all">Alle Stufen</option>
                      <option value="S1">Stufe 1 (S1)</option>
                      <option value="S2">Stufe 2 (S2)</option>
                      <option value="S3">Stufe 3 (S3)</option>
                      <option value="S4">Stufe 4 (S4)</option>
                    </select>
                  </>
                )}

                {/* Category-Specific Filters: Strengths */}
                {activeTab === 'strengths' && (
                  <select
                    value={strengthTypeFilter}
                    onChange={(e) => setStrengthTypeFilter(e.target.value)}
                    className="py-1.5 px-2.5 text-xs rounded-lg border border-[#3A4258] focus:border-[#C5A059] bg-[#161B26] text-[#E6E1D3] cursor-pointer"
                  >
                    <option value="all">Alle Typen</option>
                    <option value="creation_only">Nur Erschaffung</option>
                    <option value="advancement">Auch in Steigerung</option>
                    <option value="multi">Mehrfach wählbar</option>
                  </select>
                )}

                {/* Modified Only Checkbox */}
                <label className="flex items-center gap-1.5 text-xs font-semibold text-[#FBEFCE] cursor-pointer px-2 py-1 rounded bg-[#332A19] border border-[#C5A059]/40 hover:bg-[#433722]">
                  <input
                    type="checkbox"
                    checked={onlyModified}
                    onChange={(e) => setOnlyModified(e.target.checked)}
                    className="rounded text-[#C5A059] focus:ring-[#C5A059] bg-[#161B26] border-[#3A4258] cursor-pointer"
                  />
                  <span>Nur Geänderte ({counts[activeTab as ResourceCategory] ?? 0})</span>
                </label>

                {/* Clear Filters Button */}
                {isAnyFilterActive && (
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="px-2 py-1 text-xs rounded border border-[#3A4258] text-[#A3A096] hover:text-[#F5F2EA] hover:bg-white/5 flex items-center gap-1 cursor-pointer transition-colors"
                    title="Alle Filter zurücksetzen"
                  >
                    <FilterX size={14} />
                    <span>Filter löschen</span>
                  </button>
                )}
              </div>

              {/* Status and count info */}
              <div className="flex items-center justify-between text-[11px] text-[#A3A096] pt-1 border-t border-[#3A4258]/50">
                <div>
                  Zeige <strong className="text-[#F5F2EA]">{filteredItems.length}</strong> von {currentCategoryItems.length} Einträgen
                  {selectedModuleId !== 'all' && (
                    <span className="ml-1 text-[#C5A059]">
                      (Gefiltert nach: {modules.find((m) => m.id === selectedModuleId)?.name})
                    </span>
                  )}
                </div>

                {counts.total > 0 && (
                  <button
                    type="button"
                    onClick={() => setConfirmResetAll(true)}
                    className="text-red-400 hover:text-red-300 hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <RotateCcw size={12} />
                    <span>Alle {counts.total} Änderungen zurücksetzen</span>
                  </button>
                )}
              </div>
            </div>

            {/* ITEMS LIST */}
            <div className="flex-1 overflow-y-auto pr-1.5 space-y-2 custom-scrollbar modal-body-scroll">
              {filteredItems.length === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center text-center p-6 bg-[#161B26]/60 rounded-xl border border-dashed border-[#3A4258]">
                  <SlidersHorizontal size={36} className="text-gray-500 mb-2" />
                  <p className="font-bold text-sm text-[#F5F2EA]">
                    Keine Einträge für diese Filterauswahl gefunden.
                  </p>
                  <p className="text-xs text-[#A3A096] mt-1 max-w-md">
                    {selectedModuleId !== 'all'
                      ? `Das Modul „${modules.find((m) => m.id === selectedModuleId)?.name}“ enthält in dieser Kategorie keine Einträge oder die Suche schränkt das Ergebnis zu stark ein.`
                      : 'Passe deine Suchbegriffe oder aktiven Filter an, um Ressourcen anzuzeigen.'}
                  </p>
                  <div className="flex items-center gap-2 mt-4">
                    {isAnyFilterActive && (
                      <button
                        type="button"
                        onClick={handleResetFilters}
                        className="px-3 py-1.5 text-xs font-bold rounded-lg bg-[#0f2340] border border-[#C5A059]/60 text-[#f3e5cf] hover:bg-[#1B365D] cursor-pointer"
                      >
                        Alle Filter zurücksetzen
                      </button>
                    )}
                    {selectedModuleId !== 'all' && (
                      <button
                        type="button"
                        onClick={() => setSelectedModuleId('all')}
                        className="px-3 py-1.5 text-xs font-bold rounded-lg border border-[#C5A059] bg-[#242A3B] text-[#E6E1D3] hover:bg-[#2C3347] cursor-pointer"
                      >
                        Filter auf „Alle Module“ setzen
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                filteredItems.map((item) => (
                  <div
                    key={item.id}
                    className={`p-3 rounded-xl border transition-all ${
                      item.isModified
                        ? 'bg-[#2D2619] border-[#C5A059] shadow-sm'
                        : 'bg-[#242A3B] border-[#3A4258] hover:border-[#C5A059]/70'
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="flex-1 min-w-[220px]">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-bold text-sm text-[#F5F2EA]">{item.name}</h4>

                          {item.categoryLabel && (
                            <span className="px-2 py-0.5 text-[10px] font-semibold bg-[#161B26] text-[#A3A096] rounded-md border border-[#3A4258]">
                              {item.categoryLabel}
                            </span>
                          )}

                          <span className="px-1.5 py-0.5 text-[10px] font-mono font-bold bg-[#0f2340] text-[#C5A059] border border-[#C5A059]/30 rounded">
                            {item.source}
                          </span>

                          {item.page && (
                            <span className="text-[10px] text-[#A3A096] font-mono">
                              S. {item.page}
                            </span>
                          )}

                          {item.isModified && (
                            <span className="px-1.5 py-0.5 text-[10px] font-bold bg-[#C5A059]/20 text-[#D9B563] border border-[#C5A059]/50 rounded-full flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#C5A059]"></span>
                              Angepasst
                            </span>
                          )}
                        </div>

                        {item.subInfo && (
                          <div className="text-[11px] text-[#C5A059]/80 mt-0.5 font-medium">
                            {item.subInfo}
                          </div>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        {item.isModified && (
                          <button
                            type="button"
                            onClick={() => {
                              resetOverride(item.type, item.name, item.secondaryKey);
                              toast.success(`"${item.name}" auf Standard zurückgesetzt.`);
                            }}
                            className="p-1 text-[#A3A096] hover:text-[#C5A059] rounded hover:bg-[#332A19] transition-colors cursor-pointer"
                            title="Auf offizielle Standard-Beschreibung zurücksetzen"
                          >
                            <RotateCcw size={15} />
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => setEditingItem(item)}
                          className="px-2.5 py-1 text-xs font-bold rounded-lg bg-[#0f2340] text-[#f3e5cf] hover:bg-[#1B365D] border border-[#C5A059]/60 flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                        >
                          <Edit2 size={13} className="text-[#C5A059]" />
                          <span>Bearbeiten</span>
                        </button>
                      </div>
                    </div>

                    {/* Text description preview */}
                    <div className="mt-2 text-xs text-[#D8D4C7] bg-[#161B26] p-2 rounded-lg border border-[#3A4258]/60 leading-relaxed font-sans line-clamp-3 hover:line-clamp-none transition-all">
                      {item.currentDescription}
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}

        {/* ------------------------------------------------------------- */}
        {/* EDIT MODAL */}
        {/* ------------------------------------------------------------- */}
        {editingItem && (
          <ResourceEditModal
            item={editingItem}
            onClose={() => setEditingItem(null)}
            onSave={(type, name, desc, secKey) => {
              saveOverride(type, name, desc, secKey);
            }}
            onReset={(type, name, secKey) => {
              resetOverride(type, name, secKey);
            }}
          />
        )}

        {/* Confirm Reset All Modal */}
        {confirmResetAll && (
          <ConfirmDialog
            title="Alle Anpassungen zurücksetzen?"
            message="Möchtest du wirklich alle geänderten Spielressourcen auf die offiziellen Standardbeschreibungen zurücksetzen? Diese Aktion kann nicht rückgängig gemacht werden (außer du hast ein JSON-Backup exportiert)."
            onConfirm={() => {
              resetAllOverrides();
              setConfirmResetAll(false);
              toast.success('Alle Ressourcen auf Standard zurückgesetzt.');
            }}
            onCancel={() => setConfirmResetAll(false)}
          />
        )}

        {/* Confirm Delete Module Modal */}
        {moduleToDelete && (
          <ConfirmDialog
            title={`Modul "${moduleToDelete.name}" löschen?`}
            message={`Möchtest du das benutzerdefinierte Modul "${moduleToDelete.name}" (${moduleToDelete.shortName}) und alle darin enthaltenen Spielressourcen wirklich unwiderruflich aus dem System entfernen?`}
            onConfirm={() => {
              const res = removeModule(moduleToDelete.id);
              if (res.success) {
                toast.success(res.message);
                if (selectedModuleId === moduleToDelete.id) {
                  setSelectedModuleId('all');
                }
              } else {
                toast.error(res.message);
              }
              setModuleToDelete(null);
            }}
            onCancel={() => setModuleToDelete(null)}
          />
        )}
      </div>
    </div>
  );
};
