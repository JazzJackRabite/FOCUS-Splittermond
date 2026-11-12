/**
 * Zustände in Splittermond mit ihren Wirkungen auf Proben – als Daten, nicht als Programmlogik.
 * Grundlage: Übersicht der Zustände im Splitterwiki (splitterwiki.de/wiki/Zustand); Entscheidung des Projektinhabers
 * vom 12.11.2026: Zustände brauchen keine Quellenangabe und müssen nicht aus den Regelwerken extrahiert werden.
 * Keine Regeltexte: Die Kurzbeschreibungen sind eigene Formulierungen.
 *
 * probe.bereiche: Fertigkeitsgruppen, für die der Abzug gilt (kampf, allgemein, magie)
 * probe.attribute: Abzug nur auf Fertigkeiten, in die eines dieser Attribute eingeht (Kürzel wie in SKILL_DATA)
 * probe.pro_stufe / probe.fest: Abzug je Stufe bzw. fester Abzug; probe.art 'wundstufe': zählt als Wundstufe schwerer
 * werte: Wirkung auf abgeleitete Werte (vom Editor noch nicht eingerechnet, nur beschrieben)
 */
export type Probenbereich = 'allgemein' | 'kampf' | 'magie';

export interface Zustandswirkung {
  stufe?: boolean;
  hoechststufe?: number;
  probe?: { bereiche?: Probenbereich[]; attribute?: string[]; pro_stufe?: number; fest?: number; hoechststufe?: number; nur?: string; art?: 'wundstufe' };
  werte?: Record<string, { pro_stufe?: number; fest?: number; faktor?: number; setzen?: number }>;
  kurz: string;
}

export const ZUSTAENDE: Record<string, Zustandswirkung> = {
  "Angsterfüllt": {
    kurz: "Nur Sicherheitswürfe möglich."
  },
  Benommen: {
    stufe: true,
    kurz: "Jede Handlung dauert je Stufe 1 Tick länger."
  },
  Bewusstlos: {
    kurz: "Handlungsunfähig, gilt als liegend."
  },
  Blutend: {
    stufe: true,
    kurz: "Verliert alle 15 Ticks 3 Lebenspunkte je Stufe."
  },
  Brennend: {
    stufe: true,
    kurz: "Erleidet alle 15 Ticks Feuerschaden."
  },
  Erschaudert: {
    stufe: true,
    probe: {
      bereiche: [
        "kampf",
        "allgemein",
        "magie"
      ],
      attribute: [
        "VER"
      ],
      pro_stufe: -1
    },
    werte: {
      GW: {
        pro_stufe: -1
      }
    },
    kurz: "Abzug in Höhe der Stufe auf den Geistigen Widerstand und auf alle Fertigkeiten mit Verstand."
  },
  "Erschöpft": {
    stufe: true,
    probe: {
      bereiche: [
        "kampf",
        "allgemein"
      ],
      pro_stufe: -1
    },
    werte: {
      GSW: {
        pro_stufe: -1
      },
      INI: {
        pro_stufe: 1
      }
    },
    kurz: "Abzug in Höhe der Stufe auf Kampffertigkeiten und allgemeine Fertigkeiten; Geschwindigkeit −1 und Initiative +1 je Stufe."
  },
  Geblendet: {
    stufe: true,
    probe: {
      bereiche: [
        "kampf",
        "allgemein",
        "magie"
      ],
      pro_stufe: -2,
      hoechststufe: 4,
      nur: "sichtabhängige Handlungen"
    },
    kurz: "Lichtverhältnisse gelten je Stufe als eine Stufe schlechter: −2 je Stufe (höchstens Stufe 4) auf alles, wofür man sehen muss."
  },
  Geistreisend: {
    kurz: "Der Geist ist in der Geisterwelt; der Körper ist handlungsunfähig und nimmt nichts wahr."
  },
  Glaubenskrise: {
    stufe: true,
    probe: {
      bereiche: [
        "magie"
      ],
      pro_stufe: -1
    },
    kurz: "Nur Priester: Abzug in Höhe der Stufe auf Proben auf Magieschulen."
  },
  Krank: {
    kurz: "Wirkung je nach Krankheit und Phase."
  },
  Lahm: {
    werte: {
      GSW: {
        faktor: 0.5
      }
    },
    kurz: "Halbe Geschwindigkeit."
  },
  Panisch: {
    kurz: "Flieht im Sprint; ohne Fluchtweg handlungsunfähig."
  },
  Rasend: {
    kurz: "Nur Risikowürfe möglich."
  },
  Ringend: {
    probe: {
      bereiche: [
        "kampf",
        "allgemein",
        "magie"
      ],
      fest: -3
    },
    werte: {
      VTD: {
        fest: -3
      },
      GSW: {
        setzen: 0
      }
    },
    kurz: "−3 auf alle Proben und auf die Verteidigung, Geschwindigkeit 0."
  },
  Schlafend: {
    kurz: "Handlungsunfähig, gilt als liegend."
  },
  Schwermut: {
    probe: {
      bereiche: [
        "kampf",
        "allgemein",
        "magie"
      ],
      attribute: [
        "WIL"
      ],
      fest: -2
    },
    werte: {
      GW: {
        fest: -2
      }
    },
    kurz: "Geistiger Widerstand −2; −2 auf alle Proben, in die Willenskraft eingeht."
  },
  Siechtum: {
    stufe: true,
    kurz: "An einen anderen Zustand geknüpft: Dessen Ursache ist schwer zu heilen."
  },
  Sterbend: {
    stufe: true,
    kurz: "Dem Abenteurer entgleitet das Leben; er braucht Heilung."
  },
  Verorkt: {
    stufe: true,
    hoechststufe: 3,
    kurz: "Folge der Krankheit Orkische Mutation: Attribute und abgeleitete Werte ändern sich, Abzüge auf die meisten Fertigkeiten und Magieschulen; mit jeder Stufe stärker. Die Zahlen rechnet der Editor nicht."
  },
  "Verstoßen": {
    kurz: "Priester, die gegen die Gebote ihrer Gottheit verstoßen: Der Fokusvorrat sinkt schrittweise. Die Zahlen rechnet der Editor nicht."
  },
  Verwundet: {
    stufe: true,
    probe: {
      art: "wundstufe"
    },
    kurz: "Zählt beim Wundabzug je Stufe als eine Wundstufe schwerer verletzt."
  },
  "Übergangsschock": {
    stufe: true,
    probe: {
      bereiche: [
        "kampf",
        "allgemein",
        "magie"
      ],
      attribute: [
        "BEW",
        "KON",
        "STA"
      ],
      pro_stufe: -1
    },
    werte: {
      VTD: {
        pro_stufe: -1
      },
      GW: {
        pro_stufe: -1
      }
    },
    kurz: "Abzug in Höhe der Stufe auf Verteidigung, Geistigen Widerstand und alle Fertigkeiten mit Beweglichkeit, Konstitution oder Stärke."
  }
};
