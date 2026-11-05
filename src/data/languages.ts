
export interface LanguageData {
  name: string;
  source: string;
  page: number;
  family?: string;
  desc?: string;
}

export const LANGUAGES_DATA: LanguageData[] = [
    // Dragoreische Familie
    { name: "Lingua Dracis", source: "GRW", page: 314, family: "Dragoreisch" },
    { name: "Gemein-Dragoreisch", source: "GRW", page: 314, family: "Dragoreisch" },
    { name: "Patalisch", source: "GRW", page: 314, family: "Dragoreisch" },
    { name: "Dalmarisch", source: "GRW", page: 314, family: "Dragoreisch" },
    { name: "Wintholtisch", source: "GRW", page: 314, family: "Dragoreisch" },
    { name: "Westergromisch", source: "GRW", page: 314, family: "Dragoreisch" },
    { name: "Nyrdfingisch", source: "GRW", page: 314, family: "Dragoreisch" },
    { name: "Zwingardisch", source: "GRW", page: 314, family: "Dragoreisch" },
    { name: "Mertalisch", source: "GRW", page: 314, family: "Dragoreisch" },
    // Takasadische Familie
    { name: "Altes Xienyan", source: "GRW", page: 314, family: "Takasadisch" },
    { name: "Xienyan", source: "GRW", page: 314, family: "Takasadisch" },
    { name: "Kungai", source: "GRW", page: 314, family: "Takasadisch" },
    // Farukanisch
    { name: "Farukanisch", source: "GRW", page: 314, family: "Farukanisch" },
    // Alben
    { name: "Tial", source: "GRW", page: 314, family: "Alben" },
    { name: "Kintial", source: "GRW", page: 314, family: "Alben" },
    { name: "Antial", source: "GRW", page: 314, family: "Alben" },
    { name: "Vintial", source: "GRW", page: 314, family: "Alben" },
    { name: "Seratial", source: "GRW", page: 314, family: "Alben" },
    // Zwerge
    { name: "Boromto", source: "GRW", page: 314, family: "Zwerge" },
    { name: "Frynto", source: "GRW", page: 314, family: "Zwerge" },
    { name: "Furato", source: "GRW", page: 314, family: "Zwerge" },
    // Vargen
    { name: "Raugro", source: "GRW", page: 314, family: "Vargen" },
    { name: "Vaigro", source: "GRW", page: 314, family: "Vargen" },
    { name: "Tarrgro", source: "GRW", page: 314, family: "Vargen" },
    // Gnome
    { name: "Gesamt-Gnomisch", source: "GRW", page: 314, family: "Gnome" },
    { name: "Keshabu", source: "GRW", page: 314, family: "Gnome" },
    { name: "Keshu", source: "GRW", page: 314, family: "Gnome" },
    { name: "Basargnomisch", source: "GRW", page: 314, family: "Gnome" },
    // Weitere
    { name: "Jagodisch", source: "GRW", page: 314 },
    { name: "Jogdarisch", source: "GRW", page: 314 },
    { name: "Chorrashitisch", source: "GRW", page: 314 },
    { name: "Siprangulu", source: "GRW", page: 314 },
    { name: "Olelo", source: "GRW", page: 314 },
    { name: "Durghraeg", source: "GRW", page: 314 },
    { name: "Xagu", source: "GRW", page: 314 },
    { name: "Naga-Sprachen", source: "GRW", page: 314 },
    { name: "Ork-Sprache", source: "GRW", page: 314 },
];
