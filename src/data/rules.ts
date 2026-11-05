
import type { RaceData } from '../types';

export const ATTRIBUTES = { AUS: 'Ausstrahlung', BEW: 'Beweglichkeit', INT: 'Intuition', KON: 'Konstitution', MYS: 'Mystik', STA: 'Stärke', VER: 'Verstand', WIL: 'Willenskraft' };

export const BASE_STRENGTH_POINTS = 6;

export const RACES: Record<string, RaceData> = {
    Mensch: { gk: 5, mods: {}, freeMods: 2, strengths: ['Zusätzliche Splitterpunkte'], traits: [{ id: 'zusaetzliche_staerkenpunkte', label: 'Zusätzliche Stärkenpunkte', modifiers: { strengthPoints: 2 } }] },
    Alb: { gk: 5, mods: { BEW: 1, AUS: 1, KON: -1 }, freeMods: 1, strengths: ['Attraktivität', 'Scharfes Gehör', 'Dämmersicht'], traits: [] },
    Zwerg: { gk: 4, mods: { KON: 1, WIL: 1, BEW: -1 }, freeMods: 1, strengths: ['Giftresistenz', 'Robust', 'Orientierungssinn'], traits: [] },
    Gnom: { gk: 3, mods: { MYS: 1, VER: 1, STA: -1 }, freeMods: 1, strengths: ['Feensinn', 'Hoher Geistiger Widerstand', 'Flink'], traits: [] },
    Varg: { gk: 6, mods: { STA: 2, WIL: -1 }, freeMods: 1, strengths: ['Natürlicher Rüstungsschutz', 'Ausdauernd', 'Natürliche Waffe'], traits: [] }
};

export function getStrengthBudget(race: string): number {
    const raceData = RACES[race];
    if (!raceData) return BASE_STRENGTH_POINTS;
    const traitBonus = raceData.traits.reduce((sum, trait) => sum + (trait.modifiers.strengthPoints ?? 0), 0);
    return BASE_STRENGTH_POINTS + traitBonus;
}

export const MOON_SIGNS = [
    "Blutiges Antlitz des Mondes",
    "Das zweite Gesicht",
    "Der Blitz",
    "Der Fels",
    "Der Spieler",
    "Freundschaft der Trabanten",
    "Geist der Gedanken",
    "Gunst des reichen Mannes",
    "Omen des schwarzen Mondes",
    "Segen der Mondkraft"
];

export const REGIONS = [
    "Albische Inseln", "Dakardsmyr", "Farukan", "Immersommerwald", 
    "Ioria", "Kintai", "Lorakis (Allgemein)", "Midstad", 
    "Nördliche Wälder", "Patalis", "Selenia", "Surmakar", 
    "Tarr", "Termark", "Windküste", "Zwingard"
];

export const SKILL_CATEGORIES = {
    GENERAL: ['Akrobatik', 'Alchemie', 'Anführen', 'Arkane Kunde', 'Athletik', 'Darbietung', 'Diplomatie', 'Edelhandwerk', 'Empathie', 'Entschlossenheit', 'Fingerfertigkeit', 'Geschichte & Mythen', 'Handwerk', 'Heilkunde', 'Heimlichkeit', 'Jagdkunst', 'Länderkunde', 'Naturkunde', 'Redegewandtheit', 'Schlösser & Fallen', 'Schwimmen', 'Seefahrt', 'Straßenkunde', 'Tierführung', 'Überleben', 'Wahrnehmung', 'Zähigkeit'],
    COMBAT: ['Handgemenge', 'Hiebwaffen', 'Kettenwaffen', 'Klingenwaffen', 'Schusswaffen', 'Stangenwaffen', 'Wurfwaffen'],
    MAGIC: ['Bannmagie', 'Beherrschungsmagie', 'Bewegungsmagie', 'Erkenntnismagie', 'Felsmagie', 'Feuermagie', 'Heilungsmagie', 'Illusionsmagie', 'Kampfmagie', 'Lichtmagie', 'Naturmagie', 'Schattenmagie', 'Schicksalsmagie', 'Schutzmagie', 'Stärkungsmagie', 'Todesmagie', 'Verwandlungsmagie', 'Wassermagie', 'Windmagie']
};

export const ALL_SKILLS = [...SKILL_CATEGORIES.GENERAL, ...SKILL_CATEGORIES.COMBAT, ...SKILL_CATEGORIES.MAGIC].sort();

export const SKILL_DATA: Record<string, string[] | null> = { 
    'Akrobatik': ['BEW', 'STA'], 'Alchemie': ['MYS', 'VER'], 'Anführen': ['AUS', 'WIL'], 'Arkane Kunde': ['MYS', 'VER'], 'Athletik': ['BEW', 'STA'], 'Darbietung': ['AUS', 'WIL'], 'Diplomatie': ['AUS', 'VER'], 'Edelhandwerk': ['INT', 'VER'], 'Empathie': ['INT', 'VER'], 'Entschlossenheit': ['AUS', 'WIL'], 'Fingerfertigkeit': ['AUS', 'BEW'], 'Geschichte & Mythen': ['MYS', 'VER'], 'Handwerk': ['KON', 'VER'], 'Heilkunde': ['INT', 'VER'], 'Heimlichkeit': ['BEW', 'INT'], 'Jagdkunst': ['KON', 'VER'], 'Länderkunde': ['INT', 'VER'], 'Naturkunde': ['INT', 'VER'], 'Redegewandtheit': ['AUS', 'WIL'], 'Schlösser & Fallen': ['INT', 'BEW'], 'Schwimmen': ['KON', 'STA'], 'Seefahrt': ['BEW', 'KON'], 'Straßenkunde': ['AUS', 'INT'], 'Tierführung': ['AUS', 'BEW'], 'Überleben': ['INT', 'KON'], 'Wahrnehmung': ['INT', 'WIL'], 'Zähigkeit': ['KON', 'WIL'], 
    'Bannmagie': ['MYS', 'WIL'], 'Beherrschungsmagie': ['MYS', 'WIL'], 'Bewegungsmagie': ['MYS', 'BEW'], 'Erkenntnismagie': ['MYS', 'VER'], 'Felsmagie': ['MYS', 'KON'], 'Feuermagie': ['MYS', 'AUS'], 'Heilungsmagie': ['MYS', 'AUS'], 'Illusionsmagie': ['MYS', 'AUS'], 'Kampfmagie': ['MYS', 'STA'], 'Lichtmagie': ['MYS', 'AUS'], 'Naturmagie': ['MYS', 'AUS'], 'Schattenmagie': ['MYS', 'INT'], 'Schicksalsmagie': ['MYS', 'AUS'], 'Schutzmagie': ['MYS', 'AUS'], 'Stärkungsmagie': ['MYS', 'STA'], 'Todesmagie': ['MYS', 'VER'], 'Verwandlungsmagie': ['MYS', 'KON'], 'Wassermagie': ['MYS', 'INT'], 'Windmagie': ['MYS', 'VER'], 
    'Handgemenge': null, 'Hiebwaffen': null, 'Kettenwaffen': null, 'Klingenwaffen': null, 'Schusswaffen': null, 'Stangenwaffen': null, 'Wurfwaffen': null 
};

export const HELDENGRADE = [
    { name: 'Heldengrad 1 (Suchender)', minXP: 0, maxAttrMod: 1, maxSkill: 6, resistBonus: 0 }, 
    { name: 'Heldengrad 2 (Wanderer)', minXP: 100, maxAttrMod: 2, maxSkill: 9, resistBonus: 2 }, 
    { name: 'Heldengrad 3 (Veteran)', minXP: 300, maxAttrMod: 3, maxSkill: 12, resistBonus: 4 }, 
    { name: 'Heldengrad 4 (Heroe)', minXP: 600, maxAttrMod: 4, maxSkill: 15, resistBonus: 6 }
];


// ---------------------------------------------------------------
// Condition categories
// ---------------------------------------------------------------
export const CONDITIONS_WITH_LEVELS: string[] = ['Benommen', 'Blutend', 'Brennend', 'Erschöpft', 'Geblendet', 'Glaubenskrise', 'Siechtum', 'Sterbend', 'Verwundet', 'Verwirrt'].sort();
export const CONDITIONS_WITHOUT_LEVELS: string[] = ['Angsterfüllt', 'Bewusstlos', 'Lahm', 'Liegend', 'Panisch', 'Rasend', 'Ringend', 'Schlafend'];
export const ALL_CONDITIONS: string[] = [...CONDITIONS_WITH_LEVELS, ...CONDITIONS_WITHOUT_LEVELS].sort();

export const HEALTH_LEVEL_LABELS: string[] = ['Gesund', 'Angeschlagen', 'Verletzt', 'Schwer verletzt', 'Todgeweiht'];
export const WOUND_PENALTIES: number[] = [0, -1, -2, -4, -8];
