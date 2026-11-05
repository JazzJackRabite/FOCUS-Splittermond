export interface ColorSwatch {
  name: string;
  color: string;
  role: string;
}

export interface ThemePalette {
  id: 'focus-dark' | 'focus-light' | string;
  name: string;
  subtitle: string;
  badge: string;
  mode: 'dark' | 'light';
  description: string;
  baseTones: ColorSwatch[];
  complementaryTones: ColorSwatch[];
  previewColors: {
    bgPage: string;
    bgPaper: string;
    primary: string;
    accent: string;
    text: string;
  };
}

export const THEME_PALETTES: ThemePalette[] = [
  {
    id: 'focus-light',
    name: 'Focus Marineblau & Bronze',
    subtitle: 'Warmes Creme, Marineblau & Bronze',
    badge: 'Hellmodus (CD-Konzept)',
    mode: 'light',
    description: 'Das offizielle CD-Konzept auf heller Fläche: Euer Marineblau (#233248) bleibt tragendes Markenelement, kombiniert mit einem beruhigten Bronze-Ton (#B7935C), neutral-warmem Creme (#F6F3EC / #FDFCF9) und dezent gebrochenen Statusfarben für hohe Lesbarkeit und ein ruhiges Gesamtbild bei Tag.',
    previewColors: {
      bgPage: '#F6F3EC',
      bgPaper: '#FDFCF9',
      primary: '#233248',
      accent: '#B7935C',
      text: '#2C2A24',
    },
    baseTones: [
      { name: 'Seite', color: '#F6F3EC', role: 'Haupt-Hintergrund' },
      { name: 'Karte / Fläche', color: '#FDFCF9', role: 'Panels & Karten' },
      { name: 'Tab-Leiste', color: '#EEE7D8', role: 'Inaktive Tabs & Sub-Leisten' },
      { name: 'Rahmen', color: '#E1DAC8', role: 'Trennlinien & Boxen' },
      { name: 'Text primär', color: '#2C2A24', role: 'Überschriften & Werte' },
      { name: 'Text sekundär', color: '#77746A', role: 'Beschriftungen & Meta' },
    ],
    complementaryTones: [
      { name: 'Blau 900 (Marke)', color: '#233248', role: 'Header, Primärbuttons' },
      { name: 'Blau 700', color: '#33455D', role: 'Aktive Tabs, Icons' },
      { name: 'Bronze', color: '#B7935C', role: 'Akzent-Buttons & Erfahrungspunkte' },
      { name: 'Bronze hell', color: '#C6A677', role: 'Hover-Zustand' },
      { name: 'Unverletzt', color: '#5F8C6C', role: 'Gesundheit (Soft #E7EFE6)' },
      { name: 'Angeschlagen', color: '#BD9351', role: 'Erschöpfter Fokus / Betäubung' },
      { name: 'Schaden', color: '#AD5B51', role: 'Verzehrter Fokus / Wunden' },
      { name: 'Kanalisiert', color: '#5C7189', role: 'Kanalisierter Fokus (Blau 500)' },
      { name: 'Magie', color: '#8A7AA1', role: 'Zauberschulen & Magie' },
      { name: 'Temp. LP', color: '#5F9A8D', role: 'Temporäre Lebenspunkte' },
    ],
  },
  {
    id: 'focus-dark',
    name: 'Focus Dunkelblau & Gold',
    subtitle: 'Warmes Blaugrau & Edles Gold',
    badge: 'Dunkelmodus',
    mode: 'dark',
    description: 'Ruhiges, warmes Dunkel-Layout auf Basis der Marineblau/Gold-Identität. Gedämpfte Blaugrautöne, gebrochenes Pergament-Weiß und entsättigte Statusfarben für lange Spielabende.',
    previewColors: {
      bgPage: '#1C2130',
      bgPaper: '#242A3B',
      primary: '#2C3347',
      accent: '#C9A24C',
      text: '#E6E1D3',
    },
    baseTones: [
      { name: 'Seite (Tiefblau)', color: '#1C2130', role: 'Haupt-Hintergrund der App' },
      { name: 'Fläche', color: '#242A3B', role: 'Karten & Panels' },
      { name: 'Fläche erhöht', color: '#2C3347', role: 'Eingaben & Hover-Zustände' },
      { name: 'Rahmen', color: '#3A4258', role: 'Trennlinien & Boxen' },
      { name: 'Text primär', color: '#E6E1D3', role: 'Überschriften & Werte (Pergament-Weiß)' },
      { name: 'Text sekundär', color: '#A3A096', role: 'Beschriftungen & Meta' },
    ],
    complementaryTones: [
      { name: 'Edles Gold', color: '#C9A24C', role: 'Buttons, aktive Tabs & Akzente' },
      { name: 'Gold hell', color: '#D9B563', role: 'Hover & Überschriften' },
      { name: 'Angeschlagen / Fokus', color: '#C99A4E', role: 'Erschöpfter Fokus (Amber-Soft #332A19)' },
      { name: 'Kanalisiert', color: '#6C8CAA', role: 'Kanalisierter Fokus (Blau-Soft #1F2836)' },
      { name: 'Schaden', color: '#B06258', role: 'Verzehrter Fokus / Wunden (Rot-Soft #33211D)' },
      { name: 'Unverletzt', color: '#7A9D76', role: 'Gesundheit (Grün-Soft #26301F)' },
      { name: 'Magie', color: '#9683AB', role: 'Zauberschulen & Magie (Lila-Soft #292233)' },
      { name: 'Temp. LP', color: '#6BA99C', role: 'Temporäre LP (Teal-Soft #1E2D29)' },
    ],
  },
];
