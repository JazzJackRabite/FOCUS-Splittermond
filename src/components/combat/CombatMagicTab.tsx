import React, { useState, useMemo, useRef, useLayoutEffect } from 'react';
import {
  Swords,
  Shield,
  Sparkles,
  Wand2,
  Plus,
  Trash2,
  Check,
  Search,
  AlertTriangle,
  Zap,
} from 'lucide-react';
import DiceIcon from '../ui/DiceIcon';
import { useCharacter } from '../../context/CharacterContext';
import { usePlaySession } from '../../context/PlaySessionContext';
import { PlaySharedVitals } from '../play/PlaySharedVitals';
import { SourceBadge } from '../ui/SourceBadge';
import { SKILL_CATEGORIES, SKILL_DATA } from '../../data/rules';
import { type WeaponItem, type ArmorItem, type ShieldItem } from '../../data/equipment';
import { alleAusruestung } from '../../regelwerk/ausruestung';
import { useRegelwerk } from '../../regelwerk/RegelwerkContext';
import { getMasteryDetails } from '../../utils/gameResourceManager';
import {
  getFullSpellInfo,
  parseFocusCost,
  getActiveSpellModifiers,
  zauberHoechstbonus,
  getWeaponEnchantments,
} from '../../utils/magicRules';
import { generateId } from '../../utils/id';
import type { InventoryItem, Spell } from '../../types';
import { toast } from 'react-hot-toast';

// Helper to resolve authentic source & page for any item
const getItemSource = (item: { name: string; source?: string; page?: number | string }) => {
  if (item.source) {
    return {
      source: item.source,
      page: typeof item.page === 'number' ? item.page : item.page ? parseInt(String(item.page), 10) : undefined,
    };
  }
  const match = alleAusruestung().find((e) => e.name.toLowerCase() === item.name.toLowerCase());
  return {
    source: match?.source || 'GRW',
    page: match?.page,
  };
};

interface QuickSpellCardProps {
  spell: Spell;
  session: ReturnType<typeof usePlaySession>;
}

const QuickSpellCard: React.FC<QuickSpellCardProps> = ({ spell, session }) => {
  const info = useMemo(() => getFullSpellInfo(spell), [spell]);
  const containerRef = useRef<HTMLDivElement>(null);
  const textMeasureRef = useRef<HTMLSpanElement>(null);
  const buttonsRef = useRef<HTMLDivElement>(null);
  const [shouldWrap, setShouldWrap] = useState(false);

  useLayoutEffect(() => {
    const checkWrap = () => {
      if (!containerRef.current || !textMeasureRef.current) return;
      const containerWidth = containerRef.current.clientWidth;
      const textWidth = textMeasureRef.current.scrollWidth;
      const buttonsWidth = buttonsRef.current?.offsetWidth || 120;
      const gap = 16;
      // Zeilenumbruch nur genau dann, wenn der Name sonst abgeschnitten oder nicht mehr lesbar wäre
      setShouldWrap(containerWidth < textWidth + buttonsWidth + gap);
    };

    checkWrap();
    if (typeof ResizeObserver !== 'undefined' && containerRef.current) {
      const ro = new ResizeObserver(checkWrap);
      ro.observe(containerRef.current);
      return () => ro.disconnect();
    }
  }, [spell.name, spell.grade]);

  const stats = useMemo(() => {
    return [
      { label: 'Schule', value: info.school },
      { label: 'Grad', value: info.grade },
      { label: 'Fokus', value: String(info.cost) },
      ...(info.castTime && info.castTime !== '—' ? [{ label: 'Dauer', value: info.castTime }] : []),
      ...(info.range && info.range !== '—' ? [{ label: 'Reichw.', value: info.range }] : []),
      ...(info.duration && info.duration !== '—' ? [{ label: 'Wirkung', value: info.duration, colSpan: true }] : []),
    ].filter((stat) => stat.value);
  }, [info]);

  return (
    <div
      ref={containerRef}
      className="bg-[#faf6ee] hover:bg-[#f4ebe0] rounded-xl p-3 text-sm border border-[#d1c4b0] hover:border-[#C5A059] shadow-2xs transition-all relative"
    >
      {/* Unsichtbares Messelement für die unbeschränkte Breite von Name + Grad */}
      <span
        ref={textMeasureRef}
        aria-hidden="true"
        className="absolute invisible pointer-events-none whitespace-nowrap text-base font-bold pr-6"
      >
        {spell.name} (Grad {spell.grade})
      </span>

      {shouldWrap ? (
        /* Umgebrochenes Layout: Name oben über die volle Breite, Buttons rechtsbündig darunter */
        <div className="flex flex-col gap-2">
          <div
            onClick={() => session.handleOpenCastSpell(spell)}
            className="cursor-pointer flex items-center gap-1.5 w-full min-w-0"
            title={`${spell.name} (Grad ${spell.grade}) – Zaubern öffnen`}
          >
            <Wand2 size={15} className="text-[#C5A059] shrink-0" />
            <span className="font-bold text-base text-[#1B365D] hover:text-[#2a4f7e] leading-snug truncate">
              {spell.name}
            </span>
            <span className="text-[11px] font-semibold text-stone-500 shrink-0">
              (Grad {spell.grade})
            </span>
          </div>

          <div
            ref={buttonsRef}
            className="flex items-center justify-end gap-1.5 shrink-0 pt-1 border-t border-[#d1c4b0]/40"
          >
            <button
              type="button"
              onClick={() => session.handleOpenCastSpell(spell)}
              className="bg-[#1B365D] hover:bg-[#2a4f7e] text-[#f3e5cf] text-xs px-2.5 py-1 rounded font-bold transition-all shadow-2xs flex items-center gap-1 border border-[#C5A059]/40 cursor-pointer whitespace-nowrap active:scale-95"
            >
              <Sparkles size={12} className="text-[#C5A059]" />
              <span>Zaubern</span>
            </button>
            <SourceBadge
              source={info.source || 'GRW'}
              page={info.page}
              tooltipData={{ title: info.name, description: info.description, stats }}
            />
          </div>
        </div>
      ) : (
        /* Einzeiliges Layout: Name links, Buttons rechts */
        <div className="flex items-center justify-between gap-3">
          <div
            onClick={() => session.handleOpenCastSpell(spell)}
            className="cursor-pointer flex items-center gap-1.5 min-w-0 flex-1"
            title={`${spell.name} (Grad ${spell.grade}) – Zaubern öffnen`}
          >
            <Wand2 size={15} className="text-[#C5A059] shrink-0" />
            <span className="font-bold text-base text-[#1B365D] hover:text-[#2a4f7e] leading-snug truncate">
              {spell.name}
            </span>
            <span className="text-[11px] font-semibold text-stone-500 shrink-0">
              (Grad {spell.grade})
            </span>
          </div>

          <div ref={buttonsRef} className="flex items-center gap-1.5 shrink-0 ml-auto">
            <button
              type="button"
              onClick={() => session.handleOpenCastSpell(spell)}
              className="bg-[#1B365D] hover:bg-[#2a4f7e] text-[#f3e5cf] text-xs px-2.5 py-1 rounded font-bold transition-all shadow-2xs flex items-center gap-1 border border-[#C5A059]/40 cursor-pointer whitespace-nowrap active:scale-95"
            >
              <Sparkles size={12} className="text-[#C5A059]" />
              <span>Zaubern</span>
            </button>
            <SourceBadge
              source={info.source || 'GRW'}
              page={info.page}
              tooltipData={{ title: info.name, description: info.description, stats }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export const CombatMagicTab: React.FC = () => {
  const { state, dispatch, calc } = useCharacter();
  const { katalog } = useRegelwerk();
  // Waffen, Rüstungen und Schilde aus GRW und hochgeladenen Regelpaketen
  const ausruestung = useMemo(() => alleAusruestung(katalog), [katalog]);
  const WEAPONS_DATA = useMemo(() => ausruestung.filter((i): i is WeaponItem => i.type === 'weapon'), [ausruestung]);
  const ARMORS_DATA = useMemo(() => ausruestung.filter((i): i is ArmorItem => i.type === 'armor'), [ausruestung]);
  const SHIELDS_DATA = useMemo(() => ausruestung.filter((i): i is ShieldItem => i.type === 'shield'), [ausruestung]);
  const session = usePlaySession();

  const { spellsList, masteries, inventory = [] } = state;
  const {
    getSkillTotal,
    getSkillValue,
    currentAttributes,
    derived,
    armorSR,
    gearVtdBonus,
    currentWoundPenalty,
  } = calc;

  const channeledSpells = state.playState?.channeledSpells ?? [];
  const hoechstbonusZauber = zauberHoechstbonus(calc);
  const activeSpellMods = useMemo(() => getActiveSpellModifiers(channeledSpells, hoechstbonusZauber), [channeledSpells, hoechstbonusZauber]);

  // Modals for adding weapon and armor
  const [showAddWeaponModal, setShowAddWeaponModal] = useState(false);
  const [showAddArmorModal, setShowAddArmorModal] = useState(false);

  // Weapon catalog search & custom form state
  const [weaponSearch, setWeaponSearch] = useState('');
  const [weaponCategoryFilter, setWeaponCategoryFilter] = useState('Alle');
  const [customWeapon, setCustomWeapon] = useState({
    name: '',
    weaponSkill: 'Klingenwaffen',
    damage: '1W6+2',
    wgs: '7',
    range: '',
    attributes: '',
    weight: 1,
    source: 'Eigen',
    page: '',
  });

  // Armor catalog search & custom form state
  const [armorSearch, setArmorSearch] = useState('');
  const [armorTypeFilter, setArmorTypeFilter] = useState<'all' | 'armor' | 'shield'>('all');
  const [customArmor, setCustomArmor] = useState({
    name: '',
    type: 'armor' as 'armor' | 'shield',
    sr: 2,
    vtdBonus: 0,
    handicap: 1,
    tickModifier: 1,
    minStrength: 2,
    weight: 2,
    attributes: '',
    source: 'Eigen',
    page: '',
  });

  // Split inventory into weapons and armors
  const weapons = useMemo(() => {
    return inventory.filter((item) => item.type === 'weapon');
  }, [inventory]);

  const armorsAndShields = useMemo(() => {
    return inventory.filter((item) => item.type === 'armor' || item.type === 'shield');
  }, [inventory]);

  // Catalog filtered lists
  const filteredCatalogWeapons = useMemo(() => {
    return WEAPONS_DATA.filter((w) => {
      const matchesSearch =
        w.name.toLowerCase().includes(weaponSearch.toLowerCase()) ||
        w.skill.toLowerCase().includes(weaponSearch.toLowerCase()) ||
        w.attributes.toLowerCase().includes(weaponSearch.toLowerCase());
      const matchesCat =
        weaponCategoryFilter === 'Alle' ||
        w.category === weaponCategoryFilter ||
        w.skill === weaponCategoryFilter;
      return matchesSearch && matchesCat;
    });
  }, [WEAPONS_DATA, weaponSearch, weaponCategoryFilter]);

  const filteredCatalogArmors = useMemo(() => {
    const list: Array<ArmorItem | ShieldItem> = [
      ...(armorTypeFilter !== 'shield' ? ARMORS_DATA : []),
      ...(armorTypeFilter !== 'armor' ? SHIELDS_DATA : []),
    ];
    return list.filter((a) => {
      return (
        a.name.toLowerCase().includes(armorSearch.toLowerCase()) ||
        a.attributes.toLowerCase().includes(armorSearch.toLowerCase())
      );
    });
  }, [ARMORS_DATA, SHIELDS_DATA, armorSearch, armorTypeFilter]);

  // Handle adding catalog weapon
  const handleAddCatalogWeapon = (w: WeaponItem, equipImmediately = true) => {
    const newItem: InventoryItem = {
      id: generateId(),
      name: w.name,
      type: 'weapon',
      category: w.category,
      quantity: 1,
      weight: typeof w.load === 'number' ? w.load : parseInt(String(w.load), 10) || 1,
      price: w.price,
      desc: w.desc,
      equipped: equipImmediately,
      source: w.source || 'GRW',
      page: w.page,
      weaponSkill: w.skill,
      damage: w.damage,
      wgs: w.wgs,
      range: w.range || undefined,
      attributes: w.attributes,
    };
    dispatch({ type: 'ADD_INVENTORY_ITEM', payload: newItem });
    toast.success(`Waffe '${w.name}' hinzugefügt!`);
    setShowAddWeaponModal(false);
  };

  // Handle adding custom weapon
  const handleAddCustomWeapon = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customWeapon.name.trim()) {
      toast.error('Bitte einen Namen für die Waffe angeben.');
      return;
    }
    const newItem: InventoryItem = {
      id: generateId(),
      name: customWeapon.name.trim(),
      type: 'weapon',
      category: customWeapon.range ? 'Fernkampf' : 'Nahkampf',
      quantity: 1,
      weight: customWeapon.weight,
      equipped: true,
      source: customWeapon.source.trim() || 'Eigen',
      page: customWeapon.page ? parseInt(customWeapon.page, 10) || undefined : undefined,
      weaponSkill: customWeapon.weaponSkill,
      damage: customWeapon.damage.trim() || '1W6',
      wgs: customWeapon.wgs.trim() || '6',
      range: customWeapon.range.trim() || undefined,
      attributes: customWeapon.attributes.trim() || undefined,
    };
    dispatch({ type: 'ADD_INVENTORY_ITEM', payload: newItem });
    toast.success(`Eigene Waffe '${newItem.name}' hinzugefügt!`);
    setShowAddWeaponModal(false);
  };

  // Handle adding catalog armor
  const handleAddCatalogArmor = (a: ArmorItem | ShieldItem, equipImmediately = true) => {
    const isArmor = a.type === 'armor';
    const armorItem = a as ArmorItem;
    const newItem: InventoryItem = {
      id: generateId(),
      name: a.name,
      type: a.type,
      category: a.category,
      quantity: 1,
      weight: typeof a.load === 'number' ? a.load : parseInt(String(a.load), 10) || 1,
      price: a.price,
      desc: a.desc,
      equipped: equipImmediately,
      source: a.source || 'GRW',
      page: a.page,
      vtdBonus: a.vtdBonus,
      sr: isArmor ? armorItem.sr : undefined,
      handicap: a.handicap,
      tickModifier: a.tickModifier,
      minStrength: isArmor ? armorItem.minStrength : undefined,
      attributes: a.attributes,
    };
    dispatch({ type: 'ADD_INVENTORY_ITEM', payload: newItem });
    toast.success(`${a.type === 'shield' ? 'Schild' : 'Rüstung'} '${a.name}' angelegt!`);
    setShowAddArmorModal(false);
  };

  // Handle adding custom armor
  const handleAddCustomArmor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customArmor.name.trim()) {
      toast.error('Bitte einen Namen für die Rüstung angeben.');
      return;
    }
    const newItem: InventoryItem = {
      id: generateId(),
      name: customArmor.name.trim(),
      type: customArmor.type,
      quantity: 1,
      weight: customArmor.weight,
      equipped: true,
      source: customArmor.source.trim() || 'Eigen',
      page: customArmor.page ? parseInt(customArmor.page, 10) || undefined : undefined,
      sr: customArmor.type === 'armor' ? customArmor.sr : 0,
      vtdBonus: customArmor.vtdBonus,
      handicap: customArmor.handicap,
      tickModifier: customArmor.tickModifier,
      minStrength: customArmor.type === 'armor' ? customArmor.minStrength : undefined,
      attributes: customArmor.attributes.trim() || undefined,
    };
    dispatch({ type: 'ADD_INVENTORY_ITEM', payload: newItem });
    toast.success(`Eigene ${newItem.type === 'shield' ? 'Schild' : 'Rüstung'} '${newItem.name}' angelegt!`);
    setShowAddArmorModal(false);
  };

  return (
    <div className="p-4 md:p-6 space-y-6 w-full">
      {/* ── SHARED VITALS: Live-Status, LP, Fokus, Abgeleitete Werte, Splitterpunkte ── */}
      <PlaySharedVitals />

      {/* ── KAMPF & MAGIE GRID ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ══════════════════════════════════════════════════════════ */}
        {/* ── LINKE SPALTE: NEU Waffen & Angriffe, NEU Rüstungen, Kampf ── */}
        {/* ══════════════════════════════════════════════════════════ */}
        <div className="space-y-6">
          {/* ── NEU: WAFFEN UND ANGRIFFE ── */}
          <div className="bg-white bg-opacity-70 rounded-xl border border-[#d1c4b0] shadow p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3 border-b border-[#C5A059] pb-3 mb-4">
              <h3 className="font-bold text-lg sm:text-xl fantasy-font text-[#1B365D] flex items-center gap-2">
                <Swords size={20} className="text-[#C5A059] shrink-0" />
                <span>Waffen &amp; Angriffe</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowAddWeaponModal(true)}
                className="bg-[#1B365D] hover:bg-[#254a80] text-[#f3e5cf] border border-[#C5A059] px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs shrink-0 whitespace-nowrap active:scale-95"
              >
                <Plus size={14} className="text-[#C5A059]" />
                <span>Waffe</span>
              </button>
            </div>

            {/* List of Weapons */}
            <div className="space-y-3">
              {/* Natural / Unarmed Attack (Always available in Splittermond) */}
              <div className="bg-[#faf6ee] rounded-xl border border-[#d1c4b0] p-4 shadow-2xs hover:border-[#C5A059] transition-all space-y-3">
                {/* Header Row: Title & Badges */}
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-base text-[#1B365D]">Waffenlos</span>
                    <span className="text-xs bg-[#f3e5cf] text-[#1B365D] font-semibold px-2 py-0.5 rounded border border-[#d1c4b0]">
                      Handgemenge (FW {getSkillValue('Handgemenge')})
                    </span>
                    <span className="text-[10px] text-stone-500 font-medium bg-stone-100 px-1.5 py-0.5 rounded border border-stone-200">
                      Nahkampf
                    </span>
                  </div>
                  <span className="text-[10px] text-stone-500 italic">
                    Stets verfügbar
                  </span>
                </div>

                {/* Combat Stats Grid */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-white/80 rounded-lg border border-[#d1c4b0]/70 p-2 text-center shadow-2xs">
                    <span className="text-[10px] uppercase font-bold text-stone-500 block leading-tight">AT</span>
                    <span className="text-base font-bold font-mono text-[#1B365D] mt-0.5 block">
                      {getSkillValue('Handgemenge')}
                      {currentWoundPenalty !== 0 && (
                        <span className="text-red-600 text-xs font-normal"> ({currentWoundPenalty})</span>
                      )}
                    </span>
                  </div>
                  <div className="bg-white/80 rounded-lg border border-[#d1c4b0]/70 p-2 text-center shadow-2xs">
                    <span className="text-[10px] uppercase font-bold text-stone-500 block leading-tight">Schaden</span>
                    <span className="text-base font-bold font-mono text-red-700 mt-0.5 block">
                      1W6 <span className="text-xs text-stone-500 font-sans font-normal">(Stumpf)</span>
                    </span>
                  </div>
                  <div className="bg-white/80 rounded-lg border border-[#d1c4b0]/70 p-2 text-center shadow-2xs">
                    <span className="text-[10px] uppercase font-bold text-stone-500 block leading-tight">WGS</span>
                    <span className="text-base font-bold font-mono text-stone-800 mt-0.5 block">
                      5 <span className="text-xs text-stone-500 font-sans font-normal">Ticks</span>
                    </span>
                  </div>
                </div>

                {/* Primary Action Buttons */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-[#d1c4b0]/40">
                  <button
                    type="button"
                    onClick={() => session.openRollForWeapon('Waffenlos', 'Handgemenge', 0, 15, { id: 'waffenlos', damage: '1W6', wgs: 5, attributes: 'Stumpf' })}
                    className="w-full bg-[#1B365D] hover:bg-[#254a80] text-[#f3e5cf] border border-[#C5A059] px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
                    title="Angriffsprobe & Manöver öffnen (2W10 + AT vs. VTD)"
                  >
                    <DiceIcon size={15} fill="#C5A059" stroke="#1B365D" />
                    <span>Angriff (Handgemenge)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => session.handleRollDiceFormula(getWeaponEnchantments({ id: 'waffenlos', name: 'Waffenlos', damage: '1W6' }, channeledSpells).damageRollFormula, 'Waffenloser Schaden')}
                    className="damage-roll-btn w-full px-3 py-2 rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1.5 active:scale-95"
                    title="Schaden würfeln (1W6)"
                  >
                    <span className="text-xs">🎲</span>
                    <span className="tracking-wide text-white font-extrabold">1W6 Schaden</span>
                  </button>
                </div>
              </div>

              {/* Character Weapons from Inventory */}
              {weapons.map((w) => {
                const skillName = w.weaponSkill || 'Klingenwaffen';
                const skillVal = getSkillValue(skillName);
                const itemSrc = getItemSource(w);
                const enchantments = getWeaponEnchantments(w, channeledSpells);
                const effectiveAT = skillVal + enchantments.atBonus;
                return (
                  <div
                    key={w.id}
                    className={`rounded-xl border p-4 shadow-2xs transition-all space-y-3 ${
                      w.equipped
                        ? enchantments.hasEnchantment
                          ? 'bg-[#faf6ee] border-[#C5A059] ring-2 ring-amber-400/60 shadow-md'
                          : 'bg-[#faf6ee] border-[#C5A059] ring-1 ring-[#C5A059]/30'
                        : 'bg-white/80 border-[#d1c4b0] opacity-85 hover:opacity-100'
                    }`}
                  >
                    {/* Header Row: Title, Badges & Secondary Controls */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                          <span className="font-bold text-base text-[#1B365D] truncate">{w.name}</span>
                          <span className="text-xs bg-[#f3e5cf] text-[#1B365D] font-semibold px-2 py-0.5 rounded border border-[#d1c4b0]">
                            {skillName} (FW {skillVal})
                          </span>
                          {w.equipped ? (
                            <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded border border-emerald-300">
                              Ausgerüstet
                            </span>
                          ) : (
                            <span className="text-[10px] bg-stone-100 text-stone-600 font-medium px-1.5 py-0.5 rounded border border-stone-200">
                              Im Rucksack
                            </span>
                          )}
                          {w.category && (
                            <span className="text-[10px] text-stone-500 font-medium bg-stone-100 px-1.5 py-0.5 rounded">
                              {w.category}
                            </span>
                          )}
                          {enchantments.hasEnchantment && (
                            <span className="text-[10px] bg-amber-100 text-amber-900 border border-amber-300 font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-2xs">
                              <Sparkles size={11} className="text-amber-600" />
                              <span>{enchantments.spells.map((s) => s.name).join(', ')}</span>
                            </span>
                          )}
                          <SourceBadge
                            source={itemSrc.source}
                            page={itemSrc.page}
                            tooltipData={{
                              title: w.name,
                              description: w.desc || w.attributes,
                              stats: [
                                { label: 'Fertigkeit', value: skillName },
                                { label: 'Schaden', value: enchantments.damageFormulaDisplay },
                                { label: 'WGS', value: String(w.wgs || '—') },
                                ...(w.range ? [{ label: 'Reichweite', value: w.range }] : []),
                                ...(w.attributes ? [{ label: 'Merkmale', value: w.attributes, colSpan: true }] : []),
                                ...(enchantments.hasEnchantment
                                  ? [
                                      {
                                        label: 'Verzauberung',
                                        value: enchantments.spells
                                          .map((s) => `${s.name}: ${s.description}`)
                                          .join('; '),
                                        colSpan: true,
                                      },
                                    ]
                                  : []),
                              ],
                            }}
                          />
                        </div>
                      </div>

                      {/* Secondary Management Controls (Ziehen/Ablegen & Löschen) */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => dispatch({ type: 'TOGGLE_EQUIP_ITEM', payload: { id: w.id } })}
                          className={`px-2.5 py-1 rounded-lg border text-xs cursor-pointer transition-all whitespace-nowrap font-medium ${
                            w.equipped
                              ? 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
                              : 'bg-stone-50 text-stone-700 border-stone-300 hover:bg-stone-100'
                          }`}
                          title={w.equipped ? 'Waffe wegstecken (in Rucksack)' : 'Waffe ziehen / ausrüsten'}
                        >
                          {w.equipped ? 'Wegstecken' : 'Ziehen'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            dispatch({ type: 'REMOVE_INVENTORY_ITEM', payload: { id: w.id } });
                            toast.success(`'${w.name}' entfernt`);
                          }}
                          className="p-1 rounded-lg text-stone-400 hover:text-red-600 hover:bg-red-50 transition-all cursor-pointer"
                          title="Waffe löschen"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>

                    {/* Combat Stats Grid (AT, Schaden, WGS, Reichweite) */}
                    <div className={`grid gap-2 ${w.range ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-3'}`}>
                      <div className="bg-white/80 rounded-lg border border-[#d1c4b0]/70 p-2 text-center shadow-2xs">
                        <span className="text-[10px] uppercase font-bold text-stone-500 block leading-tight">AT</span>
                        <span className="text-base font-bold font-mono text-[#1B365D] mt-0.5 block">
                          {effectiveAT}
                          {enchantments.atBonus > 0 && (
                            <span
                              className="text-emerald-700 text-xs font-bold font-mono ml-1"
                              title="Bonus durch Zauber"
                            >
                              (+{enchantments.atBonus})
                            </span>
                          )}
                          {currentWoundPenalty !== 0 && (
                            <span className="text-red-600 text-xs font-normal"> ({currentWoundPenalty})</span>
                          )}
                        </span>
                      </div>
                      <div className="bg-white/80 rounded-lg border border-[#d1c4b0]/70 p-2 text-center shadow-2xs">
                        <span className="text-[10px] uppercase font-bold text-stone-500 block leading-tight">Schaden</span>
                        <span className="text-base font-bold font-mono text-red-700 mt-0.5 block">
                          {w.damage || '1W6'}
                          {enchantments.extraDamageText && (
                            <span className="text-orange-600 text-xs font-bold font-mono ml-1 block sm:inline">
                              ({enchantments.extraDamageText})
                            </span>
                          )}
                        </span>
                      </div>
                      <div className="bg-white/80 rounded-lg border border-[#d1c4b0]/70 p-2 text-center shadow-2xs">
                        <span className="text-[10px] uppercase font-bold text-stone-500 block leading-tight">WGS</span>
                        <span className="text-base font-bold font-mono text-stone-800 mt-0.5 block">
                          {w.wgs || 7} <span className="text-xs text-stone-500 font-sans font-normal">Ticks</span>
                        </span>
                      </div>
                      {w.range && (
                        <div className="bg-white/80 rounded-lg border border-[#d1c4b0]/70 p-2 text-center shadow-2xs">
                          <span className="text-[10px] uppercase font-bold text-stone-500 block leading-tight">Reichweite</span>
                          <span className="text-base font-bold font-mono text-stone-800 mt-0.5 block">
                            {w.range}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Merkmale / Traits */}
                    {w.attributes && (
                      <div className="bg-[#f3e5cf]/40 border border-[#d1c4b0]/50 rounded-lg px-2.5 py-1 text-xs text-stone-700 flex items-start gap-1.5">
                        <span className="font-semibold text-stone-800 shrink-0">Merkmale:</span>
                        <span className="italic">{w.attributes}</span>
                      </div>
                    )}

                    {/* Primary Combat Action Buttons (Roll Attack & Roll Damage) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-[#d1c4b0]/40">
                      <button
                        type="button"
                        onClick={() => session.openRollForWeapon(w.name, skillName, 0, 15, w)}
                        className="w-full bg-[#1B365D] hover:bg-[#254a80] text-[#f3e5cf] border border-[#C5A059] px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
                        title={`Angriff & Manöver mit ${w.name} öffnen (2W10 + AT vs. VTD)`}
                      >
                        <DiceIcon size={15} fill="#C5A059" stroke="#1B365D" />
                        <span>
                          Angriff ({skillName})
                          {enchantments.atBonus > 0 && ` +${enchantments.atBonus}`}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          session.handleRollDiceFormula(
                            enchantments.damageRollFormula,
                            `${w.name} Schaden${enchantments.extraDamageText ? ` (${enchantments.extraDamageText})` : ''}`
                          )
                        }
                        className="damage-roll-btn w-full px-3 py-2 rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1.5 active:scale-95"
                        title={`Schaden würfeln (${enchantments.damageRollFormula})`}
                      >
                        <DiceIcon size={15} />
                        <span className="tracking-wide text-white font-extrabold">{enchantments.buttonDamageLabel}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── NEU: RÜSTUNGEN UND SCHILDE ── */}
          <div className="bg-white bg-opacity-70 rounded-xl border border-[#d1c4b0] shadow p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3 border-b border-[#C5A059] pb-3 mb-4">
              <h3 className="font-bold text-lg sm:text-xl fantasy-font text-[#1B365D] flex items-center gap-2">
                <Shield size={20} className="text-[#C5A059] shrink-0" />
                <span>Rüstungen &amp; Schilde</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowAddArmorModal(true)}
                className="bg-[#1B365D] hover:bg-[#254a80] text-[#f3e5cf] border border-[#C5A059] px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs shrink-0 whitespace-nowrap active:scale-95"
              >
                <Plus size={14} className="text-[#C5A059]" />
                <span>Rüstung / Schild</span>
              </button>
            </div>

            {/* Defense Summary Strip - Responsive Grid that scales gracefully on all viewport sizes */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
              <div className="bg-[#faf6ee] rounded-xl border border-[#d1c4b0] p-2.5 text-center flex flex-col justify-center min-w-0 shadow-2xs">
                <span className="text-[10px] sm:text-[11px] uppercase font-bold text-stone-600 block leading-tight text-center break-words" title="Rüstungsschutz (SR)">
                  Rüstung (SR)
                </span>
                <span className="text-lg sm:text-xl font-bold text-[#1B365D] font-mono mt-0.5">
                  {derived.SR + activeSpellMods.srBonus}
                  {armorSR > 0 && <span className="text-xs text-amber-700 ml-1 font-semibold">({armorSR})</span>}
                  {activeSpellMods.srBonus > 0 && (
                    <span
                      className="text-xs text-emerald-600 ml-1 font-semibold"
                      title={`+${activeSpellMods.srBonus} SR durch Zauber (${activeSpellMods.breakdown.filter((b) => b.sr).map((b) => b.spellName).join(', ')})`}
                    >
                      +{activeSpellMods.srBonus} Zauber
                    </span>
                  )}
                </span>
              </div>

              <div className="bg-[#faf6ee] rounded-xl border border-[#d1c4b0] p-2.5 text-center flex flex-col justify-center min-w-0 shadow-2xs">
                <span className="text-[10px] sm:text-[11px] uppercase font-bold text-stone-600 block leading-tight text-center break-words" title="Verteidigung (VTD)">
                  Verteidigung
                </span>
                <span className="text-lg sm:text-xl font-bold text-[#1B365D] font-mono mt-0.5">
                  {derived.VTD + activeSpellMods.vtdBonus}
                  {gearVtdBonus > 0 && <span className="text-xs text-emerald-600 ml-1 font-semibold">+{gearVtdBonus}</span>}
                  {activeSpellMods.vtdBonus > 0 && (
                    <span
                      className="text-xs text-emerald-600 ml-1 font-semibold"
                      title={`+${activeSpellMods.vtdBonus} VTD durch Zauber (${activeSpellMods.breakdown.filter((b) => b.vtd).map((b) => b.spellName).join(', ')})`}
                    >
                      +{activeSpellMods.vtdBonus} Zauber
                    </span>
                  )}
                </span>
              </div>

              <div
                className="bg-[#faf6ee] rounded-xl border border-[#d1c4b0] p-2.5 text-center flex flex-col justify-center min-w-0 shadow-2xs cursor-help"
                title={`Gesamt-Behinderung: ${calc.totalHandicap ?? calc.gearHandicap} (Rüstung: ${calc.armorHandicap ?? 0}, Schild: ${calc.shieldHandicap ?? 0}${calc.overweightHandicap ? `, Überlast: +${calc.overweightHandicap}` : ''})`}
              >
                <span className="text-[10px] sm:text-[11px] uppercase font-bold text-stone-600 block leading-tight text-center break-words">
                  Behinderung
                </span>
                <span className={`text-lg sm:text-xl font-bold font-mono mt-0.5 ${(calc.totalHandicap ?? calc.gearHandicap) > 0 ? 'text-[#8B263E]' : 'text-stone-800'}`}>
                  {calc.totalHandicap ?? calc.gearHandicap}
                  {calc.overweightHandicap > 0 && (
                    <span className="text-[10px] text-[#8B263E] ml-1 font-bold">+{calc.overweightHandicap}</span>
                  )}
                </span>
              </div>

              <div className="bg-[#faf6ee] rounded-xl border border-[#d1c4b0] p-2.5 text-center flex flex-col justify-center min-w-0 shadow-2xs">
                <span className="text-[10px] sm:text-[11px] uppercase font-bold text-stone-600 block leading-tight text-center break-words" title="Tick-Zuschlag">
                  Tick-Zuschlag
                </span>
                <span className="text-lg sm:text-xl font-bold text-stone-800 font-mono mt-0.5">
                  {calc.gearTickModifier}
                </span>
              </div>
            </div>

            {/* List of Armor / Shields */}
            <div className="space-y-3">
              {armorsAndShields.length === 0 ? (
                <p className="text-xs text-stone-500 italic p-3 text-center bg-[#faf6ee] rounded-lg border border-[#d1c4b0]/50">
                  Keine Rüstung oder Schild ausgerüstet. Klicke auf &quot;Rüstung / Schild&quot; um aus dem Katalog zu wählen.
                </p>
              ) : (
                armorsAndShields.map((a) => {
                  const itemSrc = getItemSource(a);
                  return (
                    <div
                      key={a.id}
                      className={`rounded-xl border p-3.5 shadow-2xs transition-all ${
                        a.equipped
                          ? 'bg-[#faf6ee] border-[#C5A059] ring-1 ring-[#C5A059]/30'
                          : 'bg-white/80 border-[#d1c4b0] opacity-80 hover:opacity-100'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-base text-[#1B365D] truncate">{a.name}</span>
                            <span className="text-xs bg-[#f3e5cf] text-[#1B365D] font-semibold px-2 py-0.5 rounded border border-[#d1c4b0]">
                              {a.type === 'shield' ? '🛡️ Schild' : '🛡️ Rüstung'}
                            </span>
                            {a.equipped ? (
                              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded border border-emerald-300">
                                Angelegt
                              </span>
                            ) : (
                              <span className="text-[10px] bg-stone-100 text-stone-600 font-medium px-1.5 py-0.5 rounded">
                                Abgelegt
                              </span>
                            )}
                            <SourceBadge
                              source={itemSrc.source}
                              page={itemSrc.page}
                              tooltipData={{
                                title: a.name,
                                description: a.desc || a.attributes,
                                stats: [
                                  ...(a.type === 'armor' && a.sr !== undefined ? [{ label: 'SR', value: a.sr }] : []),
                                  ...(a.vtdBonus !== undefined ? [{ label: 'VTD', value: `+${a.vtdBonus}` }] : []),
                                  ...(a.handicap !== undefined ? [{ label: 'Behinderung', value: a.handicap }] : []),
                                  ...(a.tickModifier !== undefined ? [{ label: 'Tick-Zuschlag', value: `+${a.tickModifier}` }] : []),
                                  ...(a.minStrength ? [{ label: 'Mindest-STA', value: a.minStrength }] : []),
                                ],
                              }}
                            />
                          </div>

                        {/* Armor stats bar */}
                        <div className="flex items-center gap-x-3 gap-y-1.5 text-xs text-stone-700 mt-2 flex-wrap font-mono">
                          {a.type === 'armor' && (
                            <span>
                              <strong className="text-stone-900 font-sans">SR:</strong>{' '}
                              <span className="font-bold text-amber-700">{a.sr ?? 0}</span>
                            </span>
                          )}
                          <span>
                            <strong className="text-stone-900 font-sans">VTD:</strong>{' '}
                            <span className="font-bold text-emerald-700">+{a.vtdBonus ?? 0}</span>
                          </span>
                          <span>
                            <strong className="text-stone-900 font-sans">Behinderung:</strong> {a.handicap ?? 0}
                          </span>
                          <span>
                            <strong className="text-stone-900 font-sans">Tick-Mod:</strong> +{a.tickModifier ?? 0}
                          </span>
                          {a.minStrength !== undefined && a.minStrength > 0 && (
                            <span>
                              <strong className="text-stone-900 font-sans">Min-STA:</strong> {a.minStrength}
                            </span>
                          )}
                        </div>

                        {a.attributes && (
                          <div className="mt-1.5 text-xs text-stone-600 italic">
                            <span className="font-semibold text-stone-700 not-italic">Merkmale:</span> {a.attributes}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#d1c4b0]/40 justify-start sm:justify-end">
                        <button
                          type="button"
                          onClick={() => dispatch({ type: 'TOGGLE_EQUIP_ITEM', payload: { id: a.id } })}
                          className={`px-3 py-1 rounded-lg border text-xs font-bold cursor-pointer transition-all whitespace-nowrap ${
                            a.equipped
                              ? 'bg-amber-100 text-amber-800 border-amber-300 hover:bg-amber-200'
                              : 'bg-[#1B365D] text-white border-[#1B365D] hover:bg-[#254a80]'
                          }`}
                        >
                          {a.equipped ? 'Ablegen' : 'Anlegen'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            dispatch({ type: 'REMOVE_INVENTORY_ITEM', payload: { id: a.id } });
                            toast.success(`'${a.name}' entfernt`);
                          }}
                          className="p-1.5 rounded-lg text-stone-400 hover:text-red-600 hover:bg-red-50 transition-all cursor-pointer"
                          title="Löschen"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
              )}
            </div>
          </div>

          {/* ── KAMPFFERTIGKEITEN (Combat Skills) ── */}
          <div className="bg-white bg-opacity-70 rounded-xl border border-[#d1c4b0] shadow p-5">
            <h3 className="font-bold text-xl fantasy-font text-[#1B365D] border-b border-[#C5A059] pb-2 mb-3 flex items-center gap-2">
              <Swords size={20} className="text-[#C5A059]" />
              Kampffertigkeiten
            </h3>
            <div className="space-y-2">
              {SKILL_CATEGORIES.COMBAT.map((skill) => {
                const val = getSkillValue(skill);
                const skillMasteries = masteries[skill] ?? [];
                return (
                  <div key={skill}>
                    <button
                      type="button"
                      onClick={() => session.openRollForCombat(skill)}
                      className="w-full flex justify-between items-center bg-[#f3e5cf] hover:bg-[#e3d4b9] rounded px-3 py-2 text-sm font-bold text-[#1B365D] transition-all border border-transparent hover:border-[#C5A059] cursor-pointer"
                    >
                      <span className="flex items-center gap-1.5">
                        <DiceIcon size={14} fill="currentColor" stroke="currentColor" />
                        <span>{skill}</span>
                      </span>
                      <span className="text-lg font-mono">{val}</span>
                    </button>
                    {skillMasteries.length > 0 && (
                      <ul className="ml-2 mt-1 space-y-1">
                        {skillMasteries.map((m) => {
                          const details = getMasteryDetails(skill, m.name, m.desc);
                          const desc = m.userNote
                            ? `${details.desc}\n\n📝 ${m.userNote}`
                            : details.desc;
                          return (
                            <li
                              key={m.id}
                              className="text-xs text-stone-700 flex items-center justify-between gap-1 py-0.5 border-b border-[#d1c4b0]/30 last:border-0"
                            >
                              <span className="truncate" title={m.name}>
                                · {m.name}
                                {m.tier > 1 ? ` (T${m.tier})` : ''}
                              </span>
                              <SourceBadge
                                source={m.source || details.source || 'GRW'}
                                page={m.page || details.page}
                                tooltipData={{ title: m.name, description: desc }}
                              />
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════ */}
        {/* ── RECHTE SPALTE: Zauber-Schnellzugriff & Magieschulen ── */}
        {/* ══════════════════════════════════════════════════════════ */}
        <div className="space-y-6">
          {/* ── ZAUBER-SCHNELLZUGRIFF ── */}
          <div className="bg-white bg-opacity-70 rounded-xl border border-[#d1c4b0] shadow p-5">
            <div className="flex justify-between items-center border-b border-[#C5A059] pb-2 mb-3">
              <h3 className="font-bold text-xl fantasy-font text-[#1B365D] flex items-center gap-2">
                <Sparkles size={20} className="text-[#C5A059]" />
                Zauber-Schnellzugriff
              </h3>
            </div>

            {spellsList.length === 0 ? (
              <p className="text-xs text-stone-500 italic p-3 text-center bg-[#faf6ee] rounded-lg border border-[#d1c4b0]/50">
                Noch keine Zauber erlernt. Erlerne Zauber in der Steigerung.
              </p>
            ) : (
              <div className="space-y-2">
                {spellsList.map((spell, idx) => (
                  <QuickSpellCard
                    key={`${spell.name}-${spell.school}-${idx}`}
                    spell={spell}
                    session={session}
                  />
                ))}
              </div>
            )}
          </div>

          {/* ── MAGIESCHULEN ── */}
          <div className="bg-white bg-opacity-70 rounded-xl border border-[#d1c4b0] shadow p-5">
            <h3 className="font-bold text-xl fantasy-font text-[#1B365D] border-b border-[#C5A059] pb-2 mb-3 flex items-center gap-2">
              <Sparkles size={20} className="text-[#C5A059]" />
              Magieschulen
            </h3>
            <div className="space-y-2">
              {SKILL_CATEGORIES.MAGIC.map((skill) => {
                const total = getSkillTotal(skill);
                const skillMasteries = masteries[skill] ?? [];
                const schoolSpells = spellsList.filter((s) => s.school === skill);
                return (
                  <div key={skill}>
                    <button
                      type="button"
                      onClick={() => session.openRollForSkill(skill)}
                      className="w-full flex justify-between items-center bg-[#faf6ee] hover:bg-[#f4ebe0] rounded-lg px-3 py-2 text-sm font-bold text-[#1B365D] transition-all border border-[#d1c4b0]/70 hover:border-[#C5A059] cursor-pointer shadow-2xs"
                    >
                      <span className="flex items-center gap-1.5">
                        <DiceIcon size={14} fill="currentColor" stroke="currentColor" />
                        <Sparkles size={14} className="text-[#C5A059]" />
                        <span>{skill}</span>
                      </span>
                      <span className="text-sm font-mono font-bold">{total}</span>
                    </button>
                    {skillMasteries.length > 0 && (
                      <ul className="ml-2 mt-1 space-y-1">
                        {skillMasteries.map((m) => {
                          const details = getMasteryDetails(skill, m.name, m.desc);
                          const desc = m.userNote
                            ? `${details.desc}\n\n📝 ${m.userNote}`
                            : details.desc;
                          return (
                            <li
                              key={m.id}
                              className="text-xs text-stone-700 flex items-center justify-between gap-1 py-0.5 border-b border-[#d1c4b0]/30 last:border-0"
                            >
                              <span className="truncate" title={m.name}>
                                · {m.name}
                                {m.tier > 1 ? ` (T${m.tier})` : ''}
                              </span>
                              <SourceBadge
                                source={m.source || details.source || 'GRW'}
                                page={m.page || details.page}
                                tooltipData={{ title: m.name, description: desc }}
                              />
                            </li>
                          );
                        })}
                      </ul>
                    )}
                    {schoolSpells.length > 0 && (
                      <ul className="ml-4 mt-1.5 space-y-1">
                        {schoolSpells.map((s) => {
                          const info = getFullSpellInfo(s);
                          const stats = [
                            { label: 'Schule', value: info.school },
                            { label: 'Grad', value: info.grade },
                            { label: 'Fokus', value: String(info.cost) },
                            ...(info.castTime && info.castTime !== '—' ? [{ label: 'Dauer', value: info.castTime }] : []),
                            ...(info.range && info.range !== '—' ? [{ label: 'Reichw.', value: info.range }] : []),
                            ...(info.duration && info.duration !== '—' ? [{ label: 'Wirkung', value: info.duration, colSpan: true }] : []),
                          ].filter((stat) => stat.value);
                          return (
                            <li key={`${s.name}-${s.grade}`}>
                              <button
                                type="button"
                                onClick={() => session.handleOpenCastSpell(s)}
                                className="w-full flex items-center justify-between text-xs bg-[#faf6ee] hover:bg-[#f4ebe0] active:bg-[#ebdcc4] border border-[#d1c4b0]/70 hover:border-[#C5A059] rounded-lg px-2.5 py-1.5 transition-all shadow-2xs cursor-pointer group gap-2 text-left"
                                title="Zauber wirken"
                              >
                                <div className="text-[#1B365D] group-hover:text-[#2a4f7e] font-bold truncate flex items-center gap-1.5 min-w-0 flex-1">
                                  <Sparkles size={11} className="text-[#C5A059] shrink-0" />
                                  <span className="truncate">
                                    {s.name} <span className="text-stone-500 font-medium text-[11px]">(G{s.grade})</span>
                                  </span>
                                </div>
                                <div className="shrink-0 ml-auto flex items-center" onClick={(e) => e.stopPropagation()}>
                                  <SourceBadge
                                    source={info.source || 'GRW'}
                                    page={info.page}
                                    tooltipData={{ title: info.name, description: info.description, stats }}
                                  />
                                </div>
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ── MODAL: Waffe hinzufügen ── */}
      {showAddWeaponModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-[#faf4e6] border-2 border-[#C5A059] rounded-2xl shadow-2xl max-w-2xl w-full p-5 space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center border-b border-[#C5A059] pb-2">
              <h3 className="font-bold text-lg text-[#1B365D] fantasy-font flex items-center gap-2">
                <Swords size={20} className="text-[#C5A059]" />
                Waffe auswählen oder erstellen
              </h3>
              <button
                type="button"
                onClick={() => setShowAddWeaponModal(false)}
                className="text-stone-500 hover:text-stone-800 font-bold text-lg px-2"
              >
                ✕
              </button>
            </div>

            {/* Search & Filter */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search size={16} className="absolute left-2.5 top-2.5 text-stone-400" />
                <input
                  type="text"
                  placeholder="Splittermond-Waffen suchen..."
                  value={weaponSearch}
                  onChange={(e) => setWeaponSearch(e.target.value)}
                  className="w-full bg-[#faf4e6] border border-[#d1c4b0] rounded-lg pl-8 pr-3 py-1.5 text-xs text-[#1B365D] placeholder:text-stone-400 focus:outline-none focus:border-[#C5A059]"
                />
              </div>
              <select
                value={weaponCategoryFilter}
                onChange={(e) => setWeaponCategoryFilter(e.target.value)}
                className="bg-[#faf4e6] border border-[#d1c4b0] rounded-lg px-2 py-1.5 text-xs text-[#1B365D] focus:outline-none focus:border-[#C5A059]"
              >
                <option value="Alle">Alle Fertigkeiten</option>
                {SKILL_CATEGORIES.COMBAT.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Catalog list */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-[300px]">
              {filteredCatalogWeapons.slice(0, 40).map((w) => (
                <div
                  key={w.id || w.name}
                  className="bg-[#faf6ee] rounded-lg p-2.5 border border-[#d1c4b0] hover:border-[#C5A059] flex justify-between items-center gap-2 text-xs"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-[#1B365D]">{w.name}</span>
                      <span className="bg-[#f3e5cf] text-[#1B365D] px-1.5 py-0.5 rounded text-[10px] font-semibold">
                        {w.skill}
                      </span>
                      <span className="text-stone-500">{w.category}</span>
                      <SourceBadge
                        source={w.source || 'GRW'}
                        page={w.page}
                        tooltipData={{
                          title: w.name,
                          description: w.desc || w.attributes,
                        }}
                      />
                    </div>
                    <div className="text-[11px] text-stone-600 mt-1 flex gap-3 font-mono">
                      <span>Schaden: <strong className="text-red-700">{w.damage}</strong></span>
                      <span>WGS: {w.wgs}</span>
                      {w.range && <span>Reichweite: {w.range}</span>}
                      <span>Preis: {w.price}</span>
                    </div>
                    {w.attributes && (
                      <div className="text-[10px] text-stone-500 italic mt-0.5">{w.attributes}</div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleAddCatalogWeapon(w)}
                    className="bg-[#1B365D] hover:bg-[#254a80] text-white px-2.5 py-1 rounded font-bold text-xs shrink-0 cursor-pointer"
                  >
                    + Hinzufügen
                  </button>
                </div>
              ))}
            </div>

            {/* Custom Weapon Accordion / Form */}
            <form onSubmit={handleAddCustomWeapon} className="pt-3 border-t border-[#d1c4b0] space-y-2">
              <span className="font-bold text-xs text-[#1B365D]">Oder eigene Waffe erstellen:</span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <input
                  type="text"
                  placeholder="Waffenname"
                  value={customWeapon.name}
                  onChange={(e) => setCustomWeapon({ ...customWeapon, name: e.target.value })}
                  className="bg-white border border-[#d1c4b0] rounded px-2 py-1 col-span-2 text-xs"
                  required
                />
                <select
                  value={customWeapon.weaponSkill}
                  onChange={(e) => setCustomWeapon({ ...customWeapon, weaponSkill: e.target.value })}
                  className="bg-white border border-[#d1c4b0] rounded px-2 py-1 text-xs"
                >
                  {SKILL_CATEGORIES.COMBAT.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder="Schaden (z.B. 1W6+3)"
                  value={customWeapon.damage}
                  onChange={(e) => setCustomWeapon({ ...customWeapon, damage: e.target.value })}
                  className="bg-white border border-[#d1c4b0] rounded px-2 py-1 text-xs"
                />
                <input
                  type="text"
                  placeholder="WGS (Ticks, z.B. 7)"
                  value={customWeapon.wgs}
                  onChange={(e) => setCustomWeapon({ ...customWeapon, wgs: e.target.value })}
                  className="bg-white border border-[#d1c4b0] rounded px-2 py-1 text-xs"
                />
                <input
                  type="text"
                  placeholder="Reichweite (z.B. 20m)"
                  value={customWeapon.range}
                  onChange={(e) => setCustomWeapon({ ...customWeapon, range: e.target.value })}
                  className="bg-white border border-[#d1c4b0] rounded px-2 py-1 text-xs"
                />
                <input
                  type="text"
                  placeholder="Merkmale (z.B. Scharf 2)"
                  value={customWeapon.attributes}
                  onChange={(e) => setCustomWeapon({ ...customWeapon, attributes: e.target.value })}
                  className="bg-white border border-[#d1c4b0] rounded px-2 py-1 col-span-2 text-xs"
                />
                <input
                  type="text"
                  placeholder="Quelle (z.B. GRW, MSK, Eigen)"
                  value={customWeapon.source}
                  onChange={(e) => setCustomWeapon({ ...customWeapon, source: e.target.value })}
                  className="bg-white border border-[#d1c4b0] rounded px-2 py-1 text-xs"
                />
                <input
                  type="number"
                  placeholder="Seite (z.B. 183)"
                  value={customWeapon.page}
                  onChange={(e) => setCustomWeapon({ ...customWeapon, page: e.target.value })}
                  className="bg-white border border-[#d1c4b0] rounded px-2 py-1 text-xs"
                />
              </div>
              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  className="bg-[#C5A059] hover:bg-[#b08e4d] text-[#1B365D] font-bold px-4 py-1.5 rounded-lg text-xs cursor-pointer shadow-xs"
                >
                  Eigene Waffe erstellen
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: Rüstung oder Schild hinzufügen ── */}
      {showAddArmorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-[#faf4e6] border-2 border-[#C5A059] rounded-2xl shadow-2xl max-w-2xl w-full p-5 space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center border-b border-[#C5A059] pb-2">
              <h3 className="font-bold text-lg text-[#1B365D] fantasy-font flex items-center gap-2">
                <Shield size={20} className="text-[#C5A059]" />
                Rüstung oder Schild auswählen
              </h3>
              <button
                type="button"
                onClick={() => setShowAddArmorModal(false)}
                className="text-stone-500 hover:text-stone-800 font-bold text-lg px-2"
              >
                ✕
              </button>
            </div>

            {/* Filter buttons */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search size={16} className="absolute left-2.5 top-2.5 text-stone-400" />
                <input
                  type="text"
                  placeholder="Rüstung oder Schild suchen..."
                  value={armorSearch}
                  onChange={(e) => setArmorSearch(e.target.value)}
                  className="w-full bg-[#faf4e6] border border-[#d1c4b0] rounded-lg pl-8 pr-3 py-1.5 text-xs text-[#1B365D] placeholder:text-stone-400 focus:outline-none focus:border-[#C5A059]"
                />
              </div>
              <div className="flex rounded-lg border border-[#d1c4b0] overflow-hidden text-xs">
                <button
                  type="button"
                  onClick={() => setArmorTypeFilter('all')}
                  className={`px-3 py-1 font-bold transition-all ${
                    armorTypeFilter === 'all'
                      ? 'bg-[#1B365D] text-[#f3e5cf]'
                      : 'bg-[#faf4e6] text-[#1B365D] hover:bg-[#ebdcc4]'
                  }`}
                >
                  Alle
                </button>
                <button
                  type="button"
                  onClick={() => setArmorTypeFilter('armor')}
                  className={`px-3 py-1 font-bold transition-all ${
                    armorTypeFilter === 'armor'
                      ? 'bg-[#1B365D] text-[#f3e5cf]'
                      : 'bg-[#faf4e6] text-[#1B365D] hover:bg-[#ebdcc4]'
                  }`}
                >
                  Rüstungen
                </button>
                <button
                  type="button"
                  onClick={() => setArmorTypeFilter('shield')}
                  className={`px-3 py-1 font-bold transition-all ${
                    armorTypeFilter === 'shield'
                      ? 'bg-[#1B365D] text-[#f3e5cf]'
                      : 'bg-[#faf4e6] text-[#1B365D] hover:bg-[#ebdcc4]'
                  }`}
                >
                  Schilde
                </button>
              </div>
            </div>

            {/* Catalog list */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-[300px]">
              {filteredCatalogArmors.slice(0, 30).map((a) => {
                const isArmor = a.type === 'armor';
                const armorItem = a as ArmorItem;
                return (
                  <div
                    key={a.id || a.name}
                    className="bg-[#faf6ee] rounded-lg p-2.5 border border-[#d1c4b0] hover:border-[#C5A059] flex justify-between items-center gap-2 text-xs"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-[#1B365D]">{a.name}</span>
                        <span className="bg-[#f3e5cf] text-[#1B365D] px-1.5 py-0.5 rounded text-[10px] font-semibold">
                          {isArmor ? 'Rüstung' : 'Schild'}
                        </span>
                        <span className="text-stone-500">{a.category}</span>
                        <SourceBadge
                          source={a.source || 'GRW'}
                          page={a.page}
                          tooltipData={{
                            title: a.name,
                            description: a.desc || a.attributes,
                          }}
                        />
                      </div>
                      <div className="text-[11px] text-stone-600 mt-1 flex gap-3 font-mono flex-wrap">
                        {isArmor && <span>SR: <strong className="text-amber-700">{armorItem.sr}</strong></span>}
                        <span>VTD: <strong className="text-emerald-700">+{a.vtdBonus}</strong></span>
                        <span>Behinderung: {a.handicap}</span>
                        <span>Tick: +{a.tickModifier}</span>
                        <span>Preis: {a.price}</span>
                      </div>
                      {a.attributes && (
                        <div className="text-[10px] text-stone-500 italic mt-0.5">{a.attributes}</div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleAddCatalogArmor(a)}
                      className="bg-[#1B365D] hover:bg-[#254a80] text-white px-2.5 py-1 rounded font-bold text-xs shrink-0 cursor-pointer"
                    >
                      + Anlegen
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Custom Armor / Shield Form */}
            <form onSubmit={handleAddCustomArmor} className="pt-3 border-t border-[#d1c4b0] space-y-2">
              <span className="font-bold text-xs text-[#1B365D]">Oder eigene Rüstung / Schild erstellen:</span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <input
                  type="text"
                  placeholder="Name"
                  value={customArmor.name}
                  onChange={(e) => setCustomArmor({ ...customArmor, name: e.target.value })}
                  className="bg-white border border-[#d1c4b0] rounded px-2 py-1 col-span-2 text-xs"
                  required
                />
                <select
                  value={customArmor.type}
                  onChange={(e) => setCustomArmor({ ...customArmor, type: e.target.value as 'armor' | 'shield' })}
                  className="bg-white border border-[#d1c4b0] rounded px-2 py-1 text-xs"
                >
                  <option value="armor">Rüstung</option>
                  <option value="shield">Schild</option>
                </select>
                {customArmor.type === 'armor' ? (
                  <div className="flex items-center gap-1">
                    <span className="text-[11px]">SR:</span>
                    <input
                      type="number"
                      min={0}
                      max={10}
                      value={customArmor.sr}
                      onChange={(e) => setCustomArmor({ ...customArmor, sr: parseInt(e.target.value, 10) || 0 })}
                      className="w-12 bg-white border border-[#d1c4b0] rounded px-1.5 py-1 text-center text-xs"
                    />
                  </div>
                ) : (
                  <div className="flex items-center gap-1">
                    <span className="text-[11px]">VTD:</span>
                    <input
                      type="number"
                      min={0}
                      max={5}
                      value={customArmor.vtdBonus}
                      onChange={(e) => setCustomArmor({ ...customArmor, vtdBonus: parseInt(e.target.value, 10) || 0 })}
                      className="w-12 bg-white border border-[#d1c4b0] rounded px-1.5 py-1 text-center text-xs"
                    />
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <span className="text-[11px]">Behinderung:</span>
                  <input
                    type="number"
                    min={0}
                    max={10}
                    value={customArmor.handicap}
                    onChange={(e) => setCustomArmor({ ...customArmor, handicap: parseInt(e.target.value, 10) || 0 })}
                    className="w-12 bg-white border border-[#d1c4b0] rounded px-1.5 py-1 text-center text-xs"
                  />
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-[11px]">Tick:</span>
                  <input
                    type="number"
                    min={0}
                    max={5}
                    value={customArmor.tickModifier}
                    onChange={(e) => setCustomArmor({ ...customArmor, tickModifier: parseInt(e.target.value, 10) || 0 })}
                    className="w-12 bg-white border border-[#d1c4b0] rounded px-1.5 py-1 text-center text-xs"
                  />
                </div>
                <input
                  type="text"
                  placeholder="Merkmale (optional)"
                  value={customArmor.attributes}
                  onChange={(e) => setCustomArmor({ ...customArmor, attributes: e.target.value })}
                  className="bg-white border border-[#d1c4b0] rounded px-2 py-1 col-span-2 text-xs"
                />
                <input
                  type="text"
                  placeholder="Quelle (z.B. GRW, MSK, Eigen)"
                  value={customArmor.source}
                  onChange={(e) => setCustomArmor({ ...customArmor, source: e.target.value })}
                  className="bg-white border border-[#d1c4b0] rounded px-2 py-1 text-xs"
                />
                <input
                  type="number"
                  placeholder="Seite (z.B. 183)"
                  value={customArmor.page}
                  onChange={(e) => setCustomArmor({ ...customArmor, page: e.target.value })}
                  className="bg-white border border-[#d1c4b0] rounded px-2 py-1 text-xs"
                />
              </div>
              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  className="bg-[#C5A059] hover:bg-[#b08e4d] text-[#1B365D] font-bold px-4 py-1.5 rounded-lg text-xs cursor-pointer shadow-xs"
                >
                  Erstellen &amp; Anlegen
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
