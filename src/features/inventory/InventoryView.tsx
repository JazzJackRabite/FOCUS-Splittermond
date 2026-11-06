import React, { useState, useMemo } from 'react';
import {
  Package,
  Coins,
  Weight,
  Plus,
  Minus,
  ChevronUp,
  ChevronDown,
  Trash2,
  Edit2,
  Search,
  Shield,
  Swords,
  FlaskConical,
  Compass,
  AlertTriangle,
  Check,
  RotateCcw,
} from 'lucide-react';
import { useCharacter } from '../../context/CharacterContext';
import { alleAusruestung } from '../../regelwerk/ausruestung';
import { useRegelwerk } from '../../regelwerk/RegelwerkContext';
import { SourceBadge } from '../../components/ui/SourceBadge';
import { generateId } from '../../utils/id';
import type { InventoryItem } from '../../types';
import { toast } from 'react-hot-toast';
import { BegleiterKarte } from '../../components/begleiter/BegleiterKarte';
import { ReliktKarte } from '../../components/relikte/ReliktKarte';

export const InventoryView: React.FC = () => {
  const { state, dispatch, calc } = useCharacter();
  const { inventory = [], money = { solare: 0, lunare: 5, telare: 0 } } = state;
  const { loadCapacity, totalLoad } = calc;
  const { katalog } = useRegelwerk();
  // GRW-Liste plus Ausrüstung der hochgeladenen Regelpakete
  const ALL_EQUIPMENT = useMemo(() => alleAusruestung(katalog), [katalog]);

  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [modalTab, setModalTab] = useState<'catalog' | 'custom'>('catalog');
  const [catalogSearch, setCatalogSearch] = useState('');
  const [catalogCategoryFilter, setCatalogCategoryFilter] = useState('all');
  const [catalogSourceFilter, setCatalogSourceFilter] = useState('all');

  const catalogSources = useMemo(() => {
    const set = new Set<string>();
    ALL_EQUIPMENT.forEach((item: any) => {
      if (item.source) set.add(item.source);
    });
    if (set.size === 0) set.add('GRW');
    return Array.from(set);
  }, [ALL_EQUIPMENT]);

  // Helper to resolve source & page for any item
  const getItemSource = (item: { name: string; source?: string; page?: number | string }) => {
    if (item.source) {
      return {
        source: item.source,
        page: typeof item.page === 'number' ? item.page : item.page ? parseInt(String(item.page), 10) : undefined,
      };
    }
    const match = ALL_EQUIPMENT.find((e) => e.name.toLowerCase() === item.name.toLowerCase());
    return {
      source: match?.source || 'GRW',
      page: match?.page,
    };
  };

  // Custom item form
  const [customItem, setCustomItem] = useState({
    name: '',
    type: 'gear' as InventoryItem['type'],
    category: 'Ausrüstung',
    quantity: 1,
    weight: 1,
    price: '1 L',
    desc: '',
    attributes: '',
    source: 'Eigen',
    page: '',
  });

  // Edit item state
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);

  // Filtered inventory items
  const filteredItems = useMemo(() => {
    return inventory.filter((item) => {
      const matchesSearch =
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.desc && item.desc.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.attributes && item.attributes.toLowerCase().includes(searchQuery.toLowerCase()));

      if (!matchesSearch) return false;

      if (activeCategory === 'all') return true;
      if (activeCategory === 'weapon') return item.type === 'weapon';
      if (activeCategory === 'armor') return item.type === 'armor' || item.type === 'shield';
      if (activeCategory === 'gear') return item.type === 'gear';
      if (activeCategory === 'alchemika') return item.type === 'alchemika';
      if (activeCategory === 'other') return item.type === 'other' || !item.type;
      return true;
    });
  }, [inventory, searchQuery, activeCategory]);

  // Catalog filtered items
  const filteredCatalog = useMemo(() => {
    return ALL_EQUIPMENT.filter((item: any) => {
      const matchesSearch =
        item.name.toLowerCase().includes(catalogSearch.toLowerCase()) ||
        (item.category && item.category.toLowerCase().includes(catalogSearch.toLowerCase())) ||
        (item.attributes && item.attributes.toLowerCase().includes(catalogSearch.toLowerCase())) ||
        (item.desc && item.desc.toLowerCase().includes(catalogSearch.toLowerCase()));

      if (!matchesSearch) return false;

      if (catalogCategoryFilter === 'weapon' && item.type !== 'weapon') return false;
      if (catalogCategoryFilter === 'armor' && item.type !== 'armor' && item.type !== 'shield') return false;
      if (catalogCategoryFilter === 'gear' && item.type !== 'gear') return false;
      if (catalogCategoryFilter === 'alchemika' && item.type !== 'alchemika') return false;

      if (catalogSourceFilter !== 'all' && (item.source || 'GRW') !== catalogSourceFilter) {
        return false;
      }

      return true;
    });
  }, [ALL_EQUIPMENT, catalogSearch, catalogCategoryFilter, catalogSourceFilter]);

  // Handle Money change
  const handleModifyMoney = (field: 'solare' | 'lunare' | 'telare', delta: number) => {
    const current = money[field] ?? 0;
    const nextVal = Math.max(0, current + delta);
    dispatch({ type: 'SET_MONEY', payload: { [field]: nextVal } });
  };

  const handleSetMoney = (field: 'solare' | 'lunare' | 'telare', value: number) => {
    dispatch({ type: 'SET_MONEY', payload: { [field]: Math.max(0, value) } });
  };

  // Handle Add Catalog item
  const handleAddCatalogItem = (item: any) => {
    const rawLoad = typeof item.load === 'number' ? item.load : parseInt(String(item.load), 10) || 0;
    const newItem: InventoryItem = {
      id: generateId(),
      name: item.name,
      type: item.type || 'gear',
      category: item.category,
      quantity: 1,
      weight: rawLoad,
      price: item.price || '',
      desc: item.desc || '',
      equipped: false,
      source: item.source || 'GRW',
      page: typeof item.page === 'number' ? item.page : item.page ? parseInt(String(item.page), 10) : undefined,
      weaponSkill: item.skill,
      damage: item.damage,
      wgs: item.wgs,
      range: item.range,
      vtdBonus: item.vtdBonus,
      sr: item.sr,
      handicap: item.handicap,
      tickModifier: item.tickModifier,
      minStrength: item.minStrength,
      attributes: item.attributes,
    };
    dispatch({ type: 'ADD_INVENTORY_ITEM', payload: newItem });
    toast.success(`'${item.name}' zum Inventar hinzugefügt!`);
  };

  // Handle Add Custom Item
  const handleAddCustomItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customItem.name.trim()) {
      toast.error('Bitte Namen eingeben.');
      return;
    }
    const newItem: InventoryItem = {
      id: generateId(),
      name: customItem.name.trim(),
      type: customItem.type,
      category: customItem.category.trim() || undefined,
      quantity: Math.max(1, customItem.quantity),
      weight: customItem.weight,
      price: customItem.price.trim() || undefined,
      desc: customItem.desc.trim() || undefined,
      attributes: customItem.attributes.trim() || undefined,
      source: customItem.source.trim() || 'Eigen',
      page: customItem.page.trim() ? parseInt(customItem.page, 10) || undefined : undefined,
      equipped: false,
    };
    dispatch({ type: 'ADD_INVENTORY_ITEM', payload: newItem });
    toast.success(`'${newItem.name}' zum Inventar hinzugefügt!`);
    setCustomItem({
      name: '',
      type: 'gear',
      category: 'Ausrüstung',
      quantity: 1,
      weight: 1,
      price: '1 L',
      desc: '',
      attributes: '',
      source: 'Eigen',
      page: '',
    });
    setShowAddModal(false);
  };

  // Handle Quantity adjustment
  const handleAdjustQuantity = (item: InventoryItem, delta: number) => {
    const newQty = (item.quantity || 1) + delta;
    if (newQty <= 0) {
      dispatch({ type: 'REMOVE_INVENTORY_ITEM', payload: { id: item.id } });
      toast.success(`'${item.name}' entfernt`);
    } else {
      dispatch({ type: 'UPDATE_INVENTORY_ITEM', payload: { id: item.id, updates: { quantity: newQty } } });
    }
  };

  // Overweight calculation
  const isOverweight = totalLoad > loadCapacity;
  const overweightAmount = Math.max(0, totalLoad - loadCapacity);

  return (
    <div className="p-4 md:p-6 space-y-6 w-full">
      {/* ── HEADER & VERMÖGEN ── */}
      <div className="bg-[#1B365D] text-[#f3e5cf] rounded-xl border-2 border-[#C5A059] shadow-lg p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="font-bold text-xl md:text-2xl fantasy-font text-[#f3e5cf] tracking-wide flex items-center gap-2">
            <Package size={24} className="text-[#C5A059]" />
            Inventar &amp; Ausrüstung
          </h2>
          <p className="text-xs text-stone-300 mt-1">
            Gegenstände, Reisegepäck, Vorräte und Splittermond-Geldbeutel
          </p>
        </div>

        {/* ── GELDBEUTEL (Solare, Lunare, Telare) ── */}
        <div className="bg-[#0f2340] border border-[#C5A059] rounded-xl p-2.5 sm:p-3 shadow-inner flex flex-wrap items-center gap-2 sm:gap-2.5">
          <div className="flex items-center gap-1.5 text-xs shrink-0 mr-0.5">
            <Coins size={16} className="text-[#C5A059]" />
            <span className="font-bold uppercase tracking-wider text-stone-300">Geld:</span>
          </div>

          {/* Solare (Gold) */}
          <div
            className="flex items-center bg-[#162744] hover:border-[#C5A059] border border-[#C5A059]/60 rounded-lg shadow-xs px-2 py-1 gap-1.5 transition-colors"
            title="Solare (Goldmünzen, 1 S = 100 L) · Klick auf ▲/▼ zum Anpassen (Shift+Klick: 10er-Schritte)"
          >
            <span className="flex items-center gap-1 select-none shrink-0 font-mono text-xs font-bold" title="Solare (Goldmünzen, 1 S = 100 L)">
              <span className="w-3 h-3 rounded-full bg-gradient-to-br from-[#FFE57F] via-[#FFB300] to-[#D97706] border border-[#FDE68A] shadow-2xs inline-block shrink-0" />
              <span className="text-amber-400">S</span>
            </span>
            <input
              type="number"
              min={0}
              value={money.solare ?? 0}
              onFocus={(e) => e.target.select()}
              onChange={(e) => handleSetMoney('solare', parseInt(e.target.value, 10) || 0)}
              className="w-7 sm:w-8 text-center font-mono font-bold text-xs bg-transparent text-[#F2EFE6] focus:outline-none p-0"
              title="Solare (Goldmünzen, 1 S = 100 L)"
            />
            <div className="flex flex-col -my-1 -mr-1 pl-1 border-l border-[#C5A059]/30 shrink-0">
              <button
                type="button"
                onClick={(e) => {
                  const delta = e.shiftKey ? 10 : 1;
                  handleModifyMoney('solare', delta);
                }}
                className="h-3.5 w-4 flex items-center justify-center text-[#C5A059] hover:text-amber-200 hover:bg-[#C5A059]/20 rounded-tr transition-colors cursor-pointer"
                title="+1 Solar (Shift+Klick: +10)"
                aria-label="+1 Solar"
              >
                <ChevronUp size={11} strokeWidth={2.5} />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  const delta = e.shiftKey ? -10 : -1;
                  handleModifyMoney('solare', delta);
                }}
                disabled={(money.solare ?? 0) <= 0}
                className="h-3.5 w-4 flex items-center justify-center text-[#C5A059] hover:text-amber-200 hover:bg-[#C5A059]/20 disabled:opacity-20 disabled:pointer-events-none rounded-br transition-colors cursor-pointer"
                title="-1 Solar (Shift+Klick: -10)"
                aria-label="-1 Solar"
              >
                <ChevronDown size={11} strokeWidth={2.5} />
              </button>
            </div>
          </div>

          {/* Lunare (Silber) */}
          <div
            className="flex items-center bg-[#162744] hover:border-[#C5A059] border border-[#C5A059]/60 rounded-lg shadow-xs px-2 py-1 gap-1.5 transition-colors"
            title="Lunare (Silbermünzen, 1 L = 100 T) · Klick auf ▲/▼ zum Anpassen (Shift+Klick: 10er-Schritte)"
          >
            <span className="flex items-center gap-1 select-none shrink-0 font-mono text-xs font-bold" title="Lunare (Silbermünzen, 1 L = 100 T)">
              <span className="w-3 h-3 rounded-full bg-gradient-to-br from-[#FFFFFF] via-[#CBD5E1] to-[#64748B] border border-[#E2E8F0] shadow-2xs inline-block shrink-0" />
              <span className="text-slate-300">L</span>
            </span>
            <input
              type="number"
              min={0}
              value={money.lunare ?? 0}
              onFocus={(e) => e.target.select()}
              onChange={(e) => handleSetMoney('lunare', parseInt(e.target.value, 10) || 0)}
              className="w-7 sm:w-8 text-center font-mono font-bold text-xs bg-transparent text-[#F2EFE6] focus:outline-none p-0"
              title="Lunare (Silbermünzen, 1 L = 100 T)"
            />
            <div className="flex flex-col -my-1 -mr-1 pl-1 border-l border-[#C5A059]/30 shrink-0">
              <button
                type="button"
                onClick={(e) => {
                  const delta = e.shiftKey ? 10 : 1;
                  handleModifyMoney('lunare', delta);
                }}
                className="h-3.5 w-4 flex items-center justify-center text-[#C5A059] hover:text-amber-200 hover:bg-[#C5A059]/20 rounded-tr transition-colors cursor-pointer"
                title="+1 Lunar (Shift+Klick: +10)"
                aria-label="+1 Lunar"
              >
                <ChevronUp size={11} strokeWidth={2.5} />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  const delta = e.shiftKey ? -10 : -1;
                  handleModifyMoney('lunare', delta);
                }}
                disabled={(money.lunare ?? 0) <= 0}
                className="h-3.5 w-4 flex items-center justify-center text-[#C5A059] hover:text-amber-200 hover:bg-[#C5A059]/20 disabled:opacity-20 disabled:pointer-events-none rounded-br transition-colors cursor-pointer"
                title="-1 Lunar (Shift+Klick: -10)"
                aria-label="-1 Lunar"
              >
                <ChevronDown size={11} strokeWidth={2.5} />
              </button>
            </div>
          </div>

          {/* Telare (Kupfer) */}
          <div
            className="flex items-center bg-[#162744] hover:border-[#C5A059] border border-[#C5A059]/60 rounded-lg shadow-xs px-2 py-1 gap-1.5 transition-colors"
            title="Telare (Kupfermünzen) · Klick auf ▲/▼ zum Anpassen (Shift+Klick: 10er-Schritte)"
          >
            <span className="flex items-center gap-1 select-none shrink-0 font-mono text-xs font-bold" title="Telare (Kupfermünzen)">
              <span className="w-3 h-3 rounded-full bg-gradient-to-br from-[#FDBA74] via-[#C2410C] to-[#7C2D12] border border-[#FED7AA] shadow-2xs inline-block shrink-0" />
              <span className="text-amber-600">T</span>
            </span>
            <input
              type="number"
              min={0}
              value={money.telare ?? 0}
              onFocus={(e) => e.target.select()}
              onChange={(e) => handleSetMoney('telare', parseInt(e.target.value, 10) || 0)}
              className="w-7 sm:w-8 text-center font-mono font-bold text-xs bg-transparent text-[#F2EFE6] focus:outline-none p-0"
              title="Telare (Kupfermünzen)"
            />
            <div className="flex flex-col -my-1 -mr-1 pl-1 border-l border-[#C5A059]/30 shrink-0">
              <button
                type="button"
                onClick={(e) => {
                  const delta = e.shiftKey ? 10 : 1;
                  handleModifyMoney('telare', delta);
                }}
                className="h-3.5 w-4 flex items-center justify-center text-[#C5A059] hover:text-amber-200 hover:bg-[#C5A059]/20 rounded-tr transition-colors cursor-pointer"
                title="+1 Telar (Shift+Klick: +10)"
                aria-label="+1 Telar"
              >
                <ChevronUp size={11} strokeWidth={2.5} />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  const delta = e.shiftKey ? -10 : -1;
                  handleModifyMoney('telare', delta);
                }}
                disabled={(money.telare ?? 0) <= 0}
                className="h-3.5 w-4 flex items-center justify-center text-[#C5A059] hover:text-amber-200 hover:bg-[#C5A059]/20 disabled:opacity-20 disabled:pointer-events-none rounded-br transition-colors cursor-pointer"
                title="-1 Telar (Shift+Klick: -10)"
                aria-label="-1 Telar"
              >
                <ChevronDown size={11} strokeWidth={2.5} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── TRAGKRAFT & LAST (BELASTUNG) ── */}
      <div className="bg-white bg-opacity-70 rounded-xl border border-[#d1c4b0] shadow p-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-2">
          <div className="flex items-center gap-2 flex-wrap">
            <Weight size={18} className="text-[#1B365D]" />
            <h3 className="font-bold text-base text-[#1B365D]">Tragkraft &amp; Last</h3>
            <span className="text-xs text-stone-500 font-medium">
              (Tragkraft = KON + STA = {loadCapacity})
            </span>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Checkbox: Tragelast ignorieren */}
            <label
              className="flex items-center gap-1.5 cursor-pointer text-xs select-none bg-[#f3e5cf] hover:bg-[#ebdcc4] text-[#1B365D] border border-[#C5A059]/60 px-2.5 py-1 rounded-md transition-colors shadow-2xs"
              title="Aktivieren, um ohne die optionale Traglast-Regel zu spielen (Überlastung erzeugt keine Behinderung)"
            >
              <input
                type="checkbox"
                checked={!!state.ignoreEncumbrance}
                onChange={(e) => dispatch({ type: 'SET_IGNORE_ENCUMBRANCE', payload: e.target.checked })}
                className="w-3.5 h-3.5 rounded border-[#C5A059] text-[#1B365D] focus:ring-[#C5A059] cursor-pointer accent-[#1B365D]"
              />
              <span className="font-bold">Tragelast ignorieren</span>
            </label>

            <span
              className={`font-mono font-bold text-sm ${
                isOverweight && !state.ignoreEncumbrance ? 'text-red-600' : 'text-[#1B365D]'
              }`}
            >
              Gesamtlast: {totalLoad} / {loadCapacity} Last
            </span>
            {isOverweight && !state.ignoreEncumbrance && (
              <span className="bg-red-100 text-[#8B263E] border border-red-300 text-xs px-2 py-0.5 rounded font-bold flex items-center gap-1">
                <AlertTriangle size={12} />
                +{overweightAmount} Behinderung
              </span>
            )}
            {isOverweight && state.ignoreEncumbrance && (
              <span
                className="bg-stone-100 text-stone-600 border border-stone-300 text-xs px-2 py-0.5 rounded font-medium flex items-center gap-1"
                title="Tragelast ist ignoriert (Optionalregel inaktiv) – kein Behinderungs-Malus"
              >
                Last ignoriert
              </span>
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-stone-200 h-2.5 rounded-full overflow-hidden border border-[#d1c4b0]">
          <div
            className={`h-full transition-all duration-300 ${
              state.ignoreEncumbrance
                ? 'bg-[#1B365D]/50'
                : isOverweight
                  ? 'bg-[#8B263E]'
                  : totalLoad > loadCapacity * 0.8
                    ? 'bg-amber-500'
                    : 'bg-emerald-600'
            }`}
            style={{ width: `${Math.min(100, (totalLoad / Math.max(1, loadCapacity)) * 100)}%` }}
          />
        </div>
      </div>

      {/* ── CONTROLS: CATEGORIES & SEARCH & ADD BUTTON ── */}
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
        {/* Category Tabs */}
        <div className="flex flex-wrap gap-1 bg-[#e3d4b9] p-1 rounded-xl border border-[#d1c4b0]">
          {[
            { id: 'all', label: `Alle (${inventory.length})` },
            { id: 'weapon', label: '⚔️ Waffen' },
            { id: 'armor', label: '🛡️ Rüstungen & Schilde' },
            { id: 'gear', label: '🎒 Ausrüstung' },
            { id: 'alchemika', label: '🧪 Alchemika' },
            { id: 'other', label: '💎 Sonstiges' },
          ].map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveCategory(cat.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeCategory === cat.id
                  ? 'bg-[#1B365D] text-white shadow-xs'
                  : 'text-stone-700 hover:bg-[#ebdcc3]'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Search & Add button */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-48">
            <Search size={14} className="absolute left-2.5 top-2.5 text-stone-400" />
            <input
              type="text"
              placeholder="Inventar durchsuchen..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-[#d1c4b0] rounded-lg pl-8 pr-3 py-1.5 text-xs text-[#1B365D]"
            />
          </div>

          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="bg-[#1B365D] hover:bg-[#254a80] text-[#f3e5cf] border border-[#C5A059] px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs shrink-0 whitespace-nowrap active:scale-95"
          >
            <Plus size={14} className="text-[#C5A059]" />
            <span>Gegenstand</span>
          </button>
        </div>
      </div>

      {/* ── ITEMS LIST ── */}
      <div className="space-y-2.5">
        {filteredItems.length === 0 ? (
          <div className="bg-white bg-opacity-70 rounded-xl border border-[#d1c4b0] p-8 text-center text-stone-500 italic">
            <Package size={32} className="mx-auto text-stone-400 mb-2 opacity-60" />
            {inventory.length === 0
              ? 'Das Inventar ist noch leer. Klicke oben auf "Gegenstand", um Ausrüstung aus dem offiziellen Splittermond-Katalog hinzuzufügen.'
              : 'Keine Gegenstände gefunden, die den Filtern entsprechen.'}
          </div>
        ) : (
          filteredItems.map((item) => {
            const itemSource = getItemSource(item);
            return (
              <div
                key={item.id}
                className={`rounded-xl border p-3.5 shadow-2xs transition-all flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 ${
                  item.equipped
                    ? 'bg-[#faf6ee] border-[#C5A059] ring-1 ring-[#C5A059]/30'
                    : 'bg-white bg-opacity-80 border-[#d1c4b0]'
                }`}
              >
                {/* Item Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-base text-[#1B365D] truncate">{item.name}</span>
                    {item.equipped && (
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded border border-emerald-300">
                        Ausgerüstet
                      </span>
                    )}
                    {item.category && (
                      <span className="text-[10px] bg-[#f3e5cf] text-[#1B365D] font-medium px-2 py-0.5 rounded border border-[#d1c4b0]">
                        {item.category}
                      </span>
                    )}
                    {item.price && (
                      <span className="text-[10px] text-stone-500 font-medium">
                        Preis: {item.price}
                      </span>
                    )}
                    <SourceBadge
                      source={itemSource.source}
                      page={itemSource.page}
                      tooltipData={{
                        title: item.name,
                        description: item.desc || item.attributes,
                        stats: [
                          ...(item.type === 'weapon'
                            ? [
                                { label: 'Fertigkeit', value: item.weaponSkill || '—' },
                                { label: 'Schaden', value: item.damage || '—' },
                                { label: 'WGS', value: String(item.wgs || '—') },
                                ...(item.range ? [{ label: 'Reichweite', value: item.range }] : []),
                              ]
                            : []),
                          ...(item.type === 'armor' || item.type === 'shield'
                            ? [
                                ...(item.sr !== undefined && item.sr > 0 ? [{ label: 'SR', value: item.sr }] : []),
                                ...(item.vtdBonus !== undefined && item.vtdBonus > 0 ? [{ label: 'VTD', value: `+${item.vtdBonus}` }] : []),
                                ...(item.handicap !== undefined && item.handicap > 0 ? [{ label: 'Behinderung', value: item.handicap }] : []),
                                ...(item.tickModifier !== undefined && item.tickModifier > 0 ? [{ label: 'Tick-Zuschlag', value: `+${item.tickModifier}` }] : []),
                              ]
                            : []),
                          ...(item.weight !== undefined ? [{ label: 'Last', value: item.weight }] : []),
                          ...(item.price ? [{ label: 'Preis', value: item.price }] : []),
                        ],
                      }}
                    />
                  </div>

                  {/* Sub details: load, damage, armor */}
                  <div className="flex items-center gap-2.5 text-xs text-stone-600 mt-1.5 flex-wrap">
                    <span className="font-mono text-stone-600 bg-stone-100 border border-stone-200 px-2 py-0.5 rounded text-[11px]">
                      Last: <strong className="text-stone-800">{(item.weight ?? 0) * (item.quantity ?? 1)}</strong>{' '}
                      {(item.quantity ?? 1) > 1 && `(${item.weight} je Stk.)`}
                    </span>
                    {item.type === 'weapon' && (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {item.weaponSkill && (
                          <span className="bg-[#f3e5cf] text-[#1B365D] border border-[#d1c4b0] px-2 py-0.5 rounded text-[11px] font-semibold">
                            {item.weaponSkill}
                          </span>
                        )}
                        {item.damage && (
                          <span className="bg-red-50 text-red-800 border border-red-200 px-2 py-0.5 rounded text-[11px] font-semibold">
                            Schaden: <strong className="text-red-700">{item.damage}</strong>
                          </span>
                        )}
                        {item.wgs && (
                          <span className="bg-stone-100 text-stone-700 border border-stone-200 px-2 py-0.5 rounded text-[11px]">
                            WGS: <strong>{item.wgs} Ticks</strong>
                          </span>
                        )}
                        {item.range && (
                          <span className="bg-stone-100 text-stone-700 border border-stone-200 px-2 py-0.5 rounded text-[11px]">
                            Reichweite: <strong>{item.range}</strong>
                          </span>
                        )}
                      </div>
                    )}
                    {(item.type === 'armor' || item.type === 'shield') && (
                      <div className="flex items-center gap-1.5 flex-wrap font-mono">
                        {item.sr !== undefined && item.sr > 0 && (
                          <span className="bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded text-[11px]">
                            SR: <strong className="text-amber-700">{item.sr}</strong>
                          </span>
                        )}
                        {item.vtdBonus !== undefined && item.vtdBonus > 0 && (
                          <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded text-[11px]">
                            VTD: <strong className="text-emerald-700">+{item.vtdBonus}</strong>
                          </span>
                        )}
                        {item.handicap !== undefined && item.handicap > 0 && (
                          <span className="bg-stone-100 text-stone-700 border border-stone-200 px-2 py-0.5 rounded text-[11px]">
                            Behinderung: <strong>{item.handicap}</strong>
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Attributes & Description */}
                  {(item.attributes || item.desc) && (
                    <p className="text-xs text-stone-600 mt-1 italic line-clamp-2">
                      {item.attributes && <span className="font-semibold text-stone-700 not-italic mr-1">{item.attributes} · </span>}
                      {item.desc}
                    </p>
                  )}
                </div>

                {/* Action Controls */}
                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  {/* Quantity Controls */}
                  <div className="flex items-center bg-stone-100 rounded-lg border border-[#d1c4b0] px-1 py-0.5">
                    <button
                      type="button"
                      onClick={() => handleAdjustQuantity(item, -1)}
                      className="w-5 h-5 flex items-center justify-center font-bold text-stone-600 hover:text-stone-900 cursor-pointer"
                      title="Menge -1"
                    >
                      -
                    </button>
                    <span className="w-8 text-center font-mono font-bold text-xs text-[#1B365D]">
                      {item.quantity ?? 1}x
                    </span>
                    <button
                      type="button"
                      onClick={() => handleAdjustQuantity(item, 1)}
                      className="w-5 h-5 flex items-center justify-center font-bold text-stone-600 hover:text-stone-900 cursor-pointer"
                      title="Menge +1"
                    >
                      +
                    </button>
                  </div>

                  {/* Equip toggle if weapon or armor */}
                  {(item.type === 'weapon' || item.type === 'armor' || item.type === 'shield') && (
                    <button
                      type="button"
                      onClick={() => dispatch({ type: 'TOGGLE_EQUIP_ITEM', payload: { id: item.id } })}
                      className={`px-2.5 py-1 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                        item.equipped
                          ? 'bg-amber-100 text-amber-800 border-amber-300 hover:bg-amber-200'
                          : 'bg-[#1B365D] text-white border-[#1B365D] hover:bg-[#254a80]'
                      }`}
                    >
                      {item.equipped ? 'Ablegen' : 'Ausrüsten'}
                    </button>
                  )}

                  {/* Edit button */}
                  <button
                    type="button"
                    onClick={() => setEditingItem({ ...item })}
                    className="p-1.5 rounded-lg text-stone-400 hover:text-[#1B365D] hover:bg-stone-200 transition-all cursor-pointer"
                    title="Gegenstand bearbeiten (inkl. Quelle & Seite)"
                  >
                    <Edit2 size={16} />
                  </button>

                  {/* Delete button */}
                  <button
                    type="button"
                    onClick={() => {
                      dispatch({ type: 'REMOVE_INVENTORY_ITEM', payload: { id: item.id } });
                      toast.success(`'${item.name}' entfernt`);
                    }}
                    className="p-1.5 rounded-lg text-stone-400 hover:text-red-600 hover:bg-red-50 transition-all cursor-pointer"
                    title="Gegenstand löschen"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ── RELIKTE (Ressource Relikt; Baukasten aus den Regelpaketen) ── */}
      <ReliktKarte />

      {/* ── BEGLEITER (Tiergefährten, beschworene Wesen; nur mit Regelpaketen) ── */}
      <BegleiterKarte />

      {/* ── MODAL: GEGENSTAND HINZUFÜGEN ── */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-[#faf4e6] border-2 border-[#C5A059] rounded-2xl shadow-2xl max-w-2xl w-full p-5 space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center border-b border-[#C5A059] pb-2">
              <h3 className="font-bold text-lg text-[#1B365D] fantasy-font flex items-center gap-2">
                <Package size={20} className="text-[#C5A059]" />
                Gegenstand hinzufügen
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-stone-500 hover:text-stone-800 font-bold text-lg px-2"
              >
                ✕
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="flex gap-2 border-b border-[#d1c4b0] pb-2">
              <button
                type="button"
                onClick={() => setModalTab('catalog')}
                className={`px-4 py-1.5 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                  modalTab === 'catalog'
                    ? 'bg-[#1B365D] text-[#f3e5cf] border border-[#C5A059]'
                    : 'bg-[#faf4e6] text-[#1B365D] border border-[#d1c4b0] hover:bg-[#ebdcc4]'
                }`}
              >
                Splittermond Katalog ({ALL_EQUIPMENT.length} Gegenstände)
              </button>
              <button
                type="button"
                onClick={() => setModalTab('custom')}
                className={`px-4 py-1.5 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                  modalTab === 'custom'
                    ? 'bg-[#1B365D] text-[#f3e5cf] border border-[#C5A059]'
                    : 'bg-[#faf4e6] text-[#1B365D] border border-[#d1c4b0] hover:bg-[#ebdcc4]'
                }`}
              >
                Eigener Gegenstand
              </button>
            </div>

            {/* Tab 1: Catalog */}
            {modalTab === 'catalog' && (
              <div className="space-y-3 flex-1 flex flex-col min-h-0">
                {/* Search & Category Filter */}
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <Search size={16} className="absolute left-2.5 top-2.5 text-stone-400" />
                    <input
                      type="text"
                      placeholder="Im Katalog suchen..."
                      value={catalogSearch}
                      onChange={(e) => setCatalogSearch(e.target.value)}
                      className="w-full bg-[#faf4e6] border border-[#d1c4b0] rounded-lg pl-8 pr-3 py-1.5 text-xs text-[#1B365D] placeholder:text-stone-400 focus:outline-none focus:border-[#C5A059]"
                    />
                  </div>
                  <select
                    value={catalogCategoryFilter}
                    onChange={(e) => setCatalogCategoryFilter(e.target.value)}
                    className="bg-[#faf4e6] border border-[#d1c4b0] rounded-lg px-2 py-1.5 text-xs text-[#1B365D] focus:outline-none focus:border-[#C5A059]"
                  >
                    <option value="all">Alle Kategorien</option>
                    <option value="weapon">Waffen</option>
                    <option value="armor">Rüstungen &amp; Schilde</option>
                    <option value="gear">Ausrüstung &amp; Reisebedarf</option>
                    <option value="alchemika">Alchemika &amp; Tränke</option>
                  </select>
                  <select
                    value={catalogSourceFilter}
                    onChange={(e) => setCatalogSourceFilter(e.target.value)}
                    className="bg-[#faf4e6] border border-[#d1c4b0] rounded-lg px-2 py-1.5 text-xs text-[#1B365D] focus:outline-none focus:border-[#C5A059]"
                    title="Nach Quelle / Regelwerk filtern"
                  >
                    <option value="all">Alle Quellen ({catalogSources.length})</option>
                    {catalogSources.map((s) => (
                      <option key={s} value={s}>
                        Quelle: {s}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Catalog items list */}
                <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-[350px]">
                  {filteredCatalog.slice(0, 50).map((catItem: any, idx: number) => (
                    <div
                      key={catItem.id || `${catItem.name}-${idx}`}
                      className="bg-[#faf6ee] rounded-lg p-2.5 border border-[#d1c4b0] hover:border-[#C5A059] flex justify-between items-center gap-2 text-xs"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-[#1B365D]">{catItem.name}</span>
                          <span className="bg-[#f3e5cf] text-[#1B365D] px-1.5 py-0.5 rounded text-[10px] font-semibold">
                            {catItem.category || catItem.type}
                          </span>
                          {catItem.price && (
                            <span className="text-stone-500 font-medium">Preis: {catItem.price}</span>
                          )}
                          {catItem.load !== undefined && (
                            <span className="text-stone-500">Last: {catItem.load}</span>
                          )}
                          <SourceBadge
                            source={catItem.source || 'GRW'}
                            page={catItem.page}
                            tooltipData={{
                              title: catItem.name,
                              description: catItem.desc || catItem.attributes,
                              stats: [
                                ...(catItem.type === 'weapon'
                                  ? [
                                      { label: 'Fertigkeit', value: catItem.skill || '—' },
                                      { label: 'Schaden', value: catItem.damage || '—' },
                                      { label: 'WGS', value: String(catItem.wgs || '—') },
                                      ...(catItem.range ? [{ label: 'Reichweite', value: catItem.range }] : []),
                                    ]
                                  : []),
                                ...(catItem.type === 'armor' || catItem.type === 'shield'
                                  ? [
                                      ...(catItem.sr !== undefined && catItem.sr > 0 ? [{ label: 'SR', value: catItem.sr }] : []),
                                      ...(catItem.vtdBonus !== undefined && catItem.vtdBonus > 0 ? [{ label: 'VTD', value: `+${catItem.vtdBonus}` }] : []),
                                      ...(catItem.handicap !== undefined && catItem.handicap > 0 ? [{ label: 'Behinderung', value: catItem.handicap }] : []),
                                      ...(catItem.tickModifier !== undefined && catItem.tickModifier > 0 ? [{ label: 'Tick-Zuschlag', value: `+${catItem.tickModifier}` }] : []),
                                    ]
                                  : []),
                                ...(catItem.load !== undefined ? [{ label: 'Last', value: catItem.load }] : []),
                                ...(catItem.price ? [{ label: 'Preis', value: catItem.price }] : []),
                              ],
                            }}
                          />
                        </div>
                        {catItem.desc && (
                          <p className="text-[11px] text-stone-600 mt-1 line-clamp-1 italic">{catItem.desc}</p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleAddCatalogItem(catItem)}
                        className="bg-[#1B365D] hover:bg-[#254a80] text-white px-3 py-1 rounded-lg font-bold text-xs shrink-0 cursor-pointer shadow-2xs"
                      >
                        + Hinzufügen
                      </button>
                    </div>
                  ))}
                  {filteredCatalog.length > 50 && (
                    <p className="text-[11px] text-stone-500 italic text-center py-1">
                      {filteredCatalog.length - 50} weitere Treffer – Suche oder Filter verfeinern.
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Tab 2: Custom Item Form */}
            {modalTab === 'custom' && (
              <form onSubmit={handleAddCustomItem} className="space-y-3">
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="col-span-2">
                    <label className="font-bold text-stone-700 block mb-1">Gegenstandsname *</label>
                    <input
                      type="text"
                      placeholder="z.B. Kletterseil, Seidengewand, Heiltrank"
                      value={customItem.name}
                      onChange={(e) => setCustomItem({ ...customItem, name: e.target.value })}
                      className="w-full bg-white border border-[#d1c4b0] rounded px-3 py-1.5 text-xs text-[#1B365D]"
                      required
                    />
                  </div>

                  <div>
                    <label className="font-bold text-stone-700 block mb-1">Typ</label>
                    <select
                      value={customItem.type}
                      onChange={(e) =>
                        setCustomItem({ ...customItem, type: e.target.value as InventoryItem['type'] })
                      }
                      className="w-full bg-white border border-[#d1c4b0] rounded px-2 py-1.5 text-xs text-[#1B365D]"
                    >
                      <option value="gear">Ausrüstung</option>
                      <option value="weapon">Waffe</option>
                      <option value="armor">Rüstung</option>
                      <option value="shield">Schild</option>
                      <option value="alchemika">Alchemika / Trank</option>
                      <option value="other">Sonstiges</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-stone-700 block mb-1">Kategorie / Notiz</label>
                    <input
                      type="text"
                      placeholder="z.B. Kleidung, Werkzeug"
                      value={customItem.category}
                      onChange={(e) => setCustomItem({ ...customItem, category: e.target.value })}
                      className="w-full bg-white border border-[#d1c4b0] rounded px-2 py-1.5 text-xs text-[#1B365D]"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-stone-700 block mb-1">Anzahl</label>
                    <input
                      type="number"
                      min={1}
                      value={customItem.quantity}
                      onChange={(e) =>
                        setCustomItem({ ...customItem, quantity: parseInt(e.target.value, 10) || 1 })
                      }
                      className="w-full bg-white border border-[#d1c4b0] rounded px-2 py-1.5 text-xs text-[#1B365D]"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-stone-700 block mb-1">Last (pro Stück)</label>
                    <input
                      type="number"
                      min={0}
                      value={customItem.weight}
                      onChange={(e) =>
                        setCustomItem({ ...customItem, weight: parseInt(e.target.value, 10) || 0 })
                      }
                      className="w-full bg-white border border-[#d1c4b0] rounded px-2 py-1.5 text-xs text-[#1B365D]"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-stone-700 block mb-1">Preis</label>
                    <input
                      type="text"
                      placeholder="z.B. 2 L 50 T"
                      value={customItem.price}
                      onChange={(e) => setCustomItem({ ...customItem, price: e.target.value })}
                      className="w-full bg-white border border-[#d1c4b0] rounded px-2 py-1.5 text-xs text-[#1B365D]"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-stone-700 block mb-1">Merkmale (optional)</label>
                    <input
                      type="text"
                      placeholder="z.B. Wasserdicht, Haltbar"
                      value={customItem.attributes}
                      onChange={(e) => setCustomItem({ ...customItem, attributes: e.target.value })}
                      className="w-full bg-white border border-[#d1c4b0] rounded px-2 py-1.5 text-xs text-[#1B365D]"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-stone-700 block mb-1">Quelle (Quellenvermerk)</label>
                    <input
                      type="text"
                      placeholder="z.B. GRW, Mondstahlklingen, Eigen"
                      list="custom-item-sources"
                      value={customItem.source}
                      onChange={(e) => setCustomItem({ ...customItem, source: e.target.value })}
                      className="w-full bg-white border border-[#d1c4b0] rounded px-2 py-1.5 text-xs text-[#1B365D]"
                    />
                    <datalist id="custom-item-sources">
                      <option value="GRW" />
                      <option value="Mondstahlklingen" />
                      <option value="Bestien & Ungeheuer" />
                      <option value="Götter & Dämonen" />
                      <option value="Eigen" />
                    </datalist>
                  </div>

                  <div>
                    <label className="font-bold text-stone-700 block mb-1">Seite (optional)</label>
                    <input
                      type="number"
                      min={1}
                      placeholder="z.B. 183"
                      value={customItem.page}
                      onChange={(e) => setCustomItem({ ...customItem, page: e.target.value })}
                      className="w-full bg-white border border-[#d1c4b0] rounded px-2 py-1.5 text-xs text-[#1B365D]"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="font-bold text-stone-700 block mb-1">Beschreibung</label>
                    <textarea
                      placeholder="Details oder besondere Wirkung..."
                      value={customItem.desc}
                      onChange={(e) => setCustomItem({ ...customItem, desc: e.target.value })}
                      rows={2}
                      className="w-full bg-white border border-[#d1c4b0] rounded px-3 py-1.5 text-xs text-[#1B365D]"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-[#d1c4b0]">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-1.5 rounded-lg text-xs font-bold bg-stone-200 text-stone-700 hover:bg-stone-300"
                  >
                    Abbrechen
                  </button>
                  <button
                    type="submit"
                    className="bg-[#C5A059] hover:bg-[#b08e4d] text-[#1B365D] font-bold px-5 py-1.5 rounded-lg text-xs shadow-xs"
                  >
                    Gegenstand erstellen
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ── MODAL: GEGENSTAND BEARBEITEN (INKL. QUELLENVERMERK) ── */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-[#faf4e6] border-2 border-[#C5A059] rounded-2xl shadow-2xl max-w-xl w-full p-5 space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center border-b border-[#C5A059] pb-2">
              <h3 className="font-bold text-lg text-[#1B365D] fantasy-font flex items-center gap-2">
                <Edit2 size={18} className="text-[#C5A059]" />
                Gegenstand bearbeiten: {editingItem.name}
              </h3>
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="text-stone-500 hover:text-stone-800 font-bold text-lg px-2 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!editingItem) return;
                const pageNum = editingItem.page !== undefined && editingItem.page !== null && String(editingItem.page).trim() !== ''
                  ? parseInt(String(editingItem.page), 10) || undefined
                  : undefined;
                dispatch({
                  type: 'UPDATE_INVENTORY_ITEM',
                  payload: {
                    id: editingItem.id,
                    updates: {
                      name: editingItem.name.trim(),
                      type: editingItem.type,
                      category: editingItem.category?.trim() || undefined,
                      quantity: Math.max(1, editingItem.quantity || 1),
                      weight: typeof editingItem.weight === 'number' ? editingItem.weight : parseInt(String(editingItem.weight), 10) || 0,
                      price: editingItem.price?.trim() || undefined,
                      attributes: editingItem.attributes?.trim() || undefined,
                      desc: editingItem.desc?.trim() || undefined,
                      source: editingItem.source?.trim() || 'Eigen',
                      page: pageNum,
                      weaponSkill: editingItem.weaponSkill?.trim() || undefined,
                      damage: editingItem.damage?.trim() || undefined,
                      wgs: editingItem.wgs !== undefined && editingItem.wgs !== null && String(editingItem.wgs).trim() !== ''
                        ? (isNaN(Number(editingItem.wgs)) ? editingItem.wgs : Number(editingItem.wgs))
                        : undefined,
                      range: editingItem.range?.trim() || undefined,
                      sr: editingItem.sr !== undefined && editingItem.sr !== null && String(editingItem.sr).trim() !== ''
                        ? parseInt(String(editingItem.sr), 10) || 0
                        : undefined,
                      vtdBonus: editingItem.vtdBonus !== undefined && editingItem.vtdBonus !== null && String(editingItem.vtdBonus).trim() !== ''
                        ? parseInt(String(editingItem.vtdBonus), 10) || 0
                        : undefined,
                      handicap: editingItem.handicap !== undefined && editingItem.handicap !== null && String(editingItem.handicap).trim() !== ''
                        ? parseInt(String(editingItem.handicap), 10) || 0
                        : undefined,
                      tickModifier: editingItem.tickModifier !== undefined && editingItem.tickModifier !== null && String(editingItem.tickModifier).trim() !== ''
                        ? parseInt(String(editingItem.tickModifier), 10) || 0
                        : undefined,
                    },
                  },
                });
                toast.success(`'${editingItem.name}' aktualisiert!`);
                setEditingItem(null);
              }}
              className="space-y-3 overflow-y-auto pr-1 flex-1"
            >
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="col-span-2">
                  <label className="font-bold text-stone-700 block mb-1">Gegenstandsname *</label>
                  <input
                    type="text"
                    value={editingItem.name}
                    onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                    className="w-full bg-white border border-[#d1c4b0] rounded px-3 py-1.5 text-xs text-[#1B365D]"
                    required
                  />
                </div>

                <div>
                  <label className="font-bold text-stone-700 block mb-1">Typ</label>
                  <select
                    value={editingItem.type || 'gear'}
                    onChange={(e) =>
                      setEditingItem({ ...editingItem, type: e.target.value as InventoryItem['type'] })
                    }
                    className="w-full bg-white border border-[#d1c4b0] rounded px-2 py-1.5 text-xs text-[#1B365D]"
                  >
                    <option value="gear">Ausrüstung</option>
                    <option value="weapon">Waffe</option>
                    <option value="armor">Rüstung</option>
                    <option value="shield">Schild</option>
                    <option value="alchemika">Alchemika / Trank</option>
                    <option value="other">Sonstiges</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-stone-700 block mb-1">Kategorie</label>
                  <input
                    type="text"
                    value={editingItem.category || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, category: e.target.value })}
                    className="w-full bg-white border border-[#d1c4b0] rounded px-2 py-1.5 text-xs text-[#1B365D]"
                  />
                </div>

                <div>
                  <label className="font-bold text-stone-700 block mb-1">Anzahl</label>
                  <input
                    type="number"
                    min={1}
                    value={editingItem.quantity || 1}
                    onChange={(e) =>
                      setEditingItem({ ...editingItem, quantity: parseInt(e.target.value, 10) || 1 })
                    }
                    className="w-full bg-white border border-[#d1c4b0] rounded px-2 py-1.5 text-xs text-[#1B365D]"
                  />
                </div>

                <div>
                  <label className="font-bold text-stone-700 block mb-1">Last (pro Stück)</label>
                  <input
                    type="number"
                    min={0}
                    value={editingItem.weight ?? 0}
                    onChange={(e) =>
                      setEditingItem({ ...editingItem, weight: parseInt(e.target.value, 10) || 0 })
                    }
                    className="w-full bg-white border border-[#d1c4b0] rounded px-2 py-1.5 text-xs text-[#1B365D]"
                  />
                </div>

                <div>
                  <label className="font-bold text-stone-700 block mb-1">Preis</label>
                  <input
                    type="text"
                    value={editingItem.price || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, price: e.target.value })}
                    className="w-full bg-white border border-[#d1c4b0] rounded px-2 py-1.5 text-xs text-[#1B365D]"
                  />
                </div>

                <div>
                  <label className="font-bold text-stone-700 block mb-1">Merkmale</label>
                  <input
                    type="text"
                    value={editingItem.attributes || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, attributes: e.target.value })}
                    className="w-full bg-white border border-[#d1c4b0] rounded px-2 py-1.5 text-xs text-[#1B365D]"
                  />
                </div>

                {/* Quellenvermerk */}
                <div className="bg-[#f3e5cf]/60 p-2.5 rounded-lg border border-[#C5A059]/40 col-span-2 grid grid-cols-2 gap-2">
                  <div>
                    <label className="font-bold text-[#1B365D] block mb-1">
                      Quelle (Quellenvermerk) *
                    </label>
                    <input
                      type="text"
                      placeholder="z.B. GRW, Mondstahlklingen, Eigen"
                      list="edit-sources-datalist"
                      value={editingItem.source || ''}
                      onChange={(e) => setEditingItem({ ...editingItem, source: e.target.value })}
                      className="w-full bg-white border border-[#d1c4b0] rounded px-2 py-1.5 text-xs text-[#1B365D] font-medium"
                    />
                    <datalist id="edit-sources-datalist">
                      <option value="GRW" />
                      <option value="Mondstahlklingen" />
                      <option value="Bestien & Ungeheuer" />
                      <option value="Götter & Dämonen" />
                      <option value="Eigen" />
                    </datalist>
                  </div>

                  <div>
                    <label className="font-bold text-[#1B365D] block mb-1">
                      Seite (optional)
                    </label>
                    <input
                      type="number"
                      min={1}
                      placeholder="z.B. 183"
                      value={editingItem.page ?? ''}
                      onChange={(e) =>
                        setEditingItem({
                          ...editingItem,
                          page: e.target.value ? parseInt(e.target.value, 10) || undefined : undefined,
                        })
                      }
                      className="w-full bg-white border border-[#d1c4b0] rounded px-2 py-1.5 text-xs text-[#1B365D] font-medium"
                    />
                  </div>
                </div>

                {editingItem.type === 'weapon' && (
                  <div className="col-span-2 grid grid-cols-2 sm:grid-cols-4 gap-2 bg-[#f3e5cf]/30 p-2 rounded border border-[#d1c4b0]">
                    <div>
                      <label className="font-bold text-stone-700 block mb-1">Fertigkeit</label>
                      <input
                        type="text"
                        value={editingItem.weaponSkill || ''}
                        onChange={(e) => setEditingItem({ ...editingItem, weaponSkill: e.target.value })}
                        className="w-full bg-white border border-[#d1c4b0] rounded px-2 py-1 text-xs"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-stone-700 block mb-1">Schaden</label>
                      <input
                        type="text"
                        value={editingItem.damage || ''}
                        onChange={(e) => setEditingItem({ ...editingItem, damage: e.target.value })}
                        className="w-full bg-white border border-[#d1c4b0] rounded px-2 py-1 text-xs"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-stone-700 block mb-1">WGS</label>
                      <input
                        type="text"
                        value={editingItem.wgs ?? ''}
                        onChange={(e) => setEditingItem({ ...editingItem, wgs: e.target.value })}
                        className="w-full bg-white border border-[#d1c4b0] rounded px-2 py-1 text-xs"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-stone-700 block mb-1">Reichweite</label>
                      <input
                        type="text"
                        value={editingItem.range || ''}
                        onChange={(e) => setEditingItem({ ...editingItem, range: e.target.value })}
                        className="w-full bg-white border border-[#d1c4b0] rounded px-2 py-1 text-xs"
                      />
                    </div>
                  </div>
                )}

                {(editingItem.type === 'armor' || editingItem.type === 'shield') && (
                  <div className="col-span-2 grid grid-cols-2 sm:grid-cols-4 gap-2 bg-[#f3e5cf]/30 p-2 rounded border border-[#d1c4b0]">
                    <div>
                      <label className="font-bold text-stone-700 block mb-1">SR</label>
                      <input
                        type="number"
                        value={editingItem.sr ?? 0}
                        onChange={(e) => setEditingItem({ ...editingItem, sr: parseInt(e.target.value, 10) || 0 })}
                        className="w-full bg-white border border-[#d1c4b0] rounded px-2 py-1 text-xs"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-stone-700 block mb-1">VTD</label>
                      <input
                        type="number"
                        value={editingItem.vtdBonus ?? 0}
                        onChange={(e) => setEditingItem({ ...editingItem, vtdBonus: parseInt(e.target.value, 10) || 0 })}
                        className="w-full bg-white border border-[#d1c4b0] rounded px-2 py-1 text-xs"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-stone-700 block mb-1">Behinderung</label>
                      <input
                        type="number"
                        value={editingItem.handicap ?? 0}
                        onChange={(e) => setEditingItem({ ...editingItem, handicap: parseInt(e.target.value, 10) || 0 })}
                        className="w-full bg-white border border-[#d1c4b0] rounded px-2 py-1 text-xs"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-stone-700 block mb-1">Tick-Zuschlag</label>
                      <input
                        type="number"
                        value={editingItem.tickModifier ?? 0}
                        onChange={(e) => setEditingItem({ ...editingItem, tickModifier: parseInt(e.target.value, 10) || 0 })}
                        className="w-full bg-white border border-[#d1c4b0] rounded px-2 py-1 text-xs"
                      />
                    </div>
                  </div>
                )}

                <div className="col-span-2">
                  <label className="font-bold text-stone-700 block mb-1">Beschreibung</label>
                  <textarea
                    rows={2}
                    value={editingItem.desc || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, desc: e.target.value })}
                    className="w-full bg-white border border-[#d1c4b0] rounded px-3 py-1.5 text-xs text-[#1B365D]"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#d1c4b0]">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-4 py-1.5 rounded-lg text-xs font-bold bg-stone-200 text-stone-700 hover:bg-stone-300 cursor-pointer"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  className="bg-[#C5A059] hover:bg-[#b08e4d] text-[#1B365D] font-bold px-5 py-1.5 rounded-lg text-xs shadow-xs cursor-pointer"
                >
                  Änderungen speichern
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
