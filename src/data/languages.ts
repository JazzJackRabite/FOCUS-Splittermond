// Rückfall ohne geladenes Regelpaket; maßgeblich ist das GRW-Paket (regelwerk/grwListen.ts, GRW S. 314–315).
export interface LanguageData {
  name: string;
  source: string;
  page: number;
  family?: string;
  desc?: string;
}

export const LANGUAGES_DATA: LanguageData[] = [
    { name: "Altes Xienyan", source: "GRW", page: 315, family: "Takasadische Sprachen" },
    { name: "Antial", source: "GRW", page: 315, family: "Alben" },
    { name: "Basargnomisch", source: "GRW", page: 315, family: "Gnome" },
    { name: "Boromto", source: "GRW", page: 315, family: "Zwerge" },
    { name: "Chorrashitisch", source: "GRW", page: 315, family: "Weitere Sprachen" },
    { name: "Dalmarisch", source: "GRW", page: 315, family: "Dragoreische Sprachen" },
    { name: "Durghraeg", source: "GRW", page: 315, family: "Weitere Sprachen" },
    { name: "Farukanisch", source: "GRW", page: 315, family: "Farukanisch" },
    { name: "Frynto", source: "GRW", page: 315, family: "Zwerge" },
    { name: "Furato", source: "GRW", page: 315, family: "Zwerge" },
    { name: "Gemein-Dragoreisch", source: "GRW", page: 315, family: "Dragoreische Sprachen" },
    { name: "Jagodisch", source: "GRW", page: 315, family: "Weitere Sprachen" },
    { name: "Jogdarisch", source: "GRW", page: 315, family: "Weitere Sprachen" },
    { name: "Keshabu", source: "GRW", page: 315, family: "Gnome" },
    { name: "Keshu", source: "GRW", page: 315, family: "Gnome" },
    { name: "Kintial", source: "GRW", page: 315, family: "Alben" },
    { name: "Kungai", source: "GRW", page: 315, family: "Takasadische Sprachen" },
    { name: "Lingua Dracis", source: "GRW", page: 315, family: "Dragoreische Sprachen" },
    { name: "Mertalisch", source: "GRW", page: 315, family: "Dragoreische Sprachen" },
    { name: "Naga-Sprachen", source: "GRW", page: 315, family: "Weitere Sprachen" },
    { name: "Nyrdfingisch", source: "GRW", page: 315, family: "Dragoreische Sprachen" },
    { name: "Olelo", source: "GRW", page: 315, family: "Weitere Sprachen" },
    { name: "Patalisch", source: "GRW", page: 315, family: "Dragoreische Sprachen" },
    { name: "Raugro", source: "GRW", page: 315, family: "Varge" },
    { name: "Seratial", source: "GRW", page: 315, family: "Alben" },
    { name: "Siprangulu", source: "GRW", page: 315, family: "Weitere Sprachen" },
    { name: "Sprache der Orks", source: "GRW", page: 315, family: "Weitere Sprachen" },
    { name: "Tarrgro", source: "GRW", page: 315, family: "Varge" },
    { name: "Tial", source: "GRW", page: 315, family: "Alben" },
    { name: "Vaigro", source: "GRW", page: 315, family: "Varge" },
    { name: "Vintial", source: "GRW", page: 315, family: "Alben" },
    { name: "Westergromisch", source: "GRW", page: 315, family: "Dragoreische Sprachen" },
    { name: "Wintholtisch", source: "GRW", page: 315, family: "Dragoreische Sprachen" },
    { name: "Xagu", source: "GRW", page: 315, family: "Weitere Sprachen" },
    { name: "Xienyan", source: "GRW", page: 315, family: "Takasadische Sprachen" },
    { name: "Zwingardisch", source: "GRW", page: 315, family: "Dragoreische Sprachen" },
];
