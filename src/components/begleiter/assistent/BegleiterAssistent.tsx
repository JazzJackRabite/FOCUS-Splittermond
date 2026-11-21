/**
 * Assistent zum Erstellen und Bearbeiten eines Begleiters: ein Dialog, ein Schritt nach dem anderen.
 * Erstellen: zuerst die Art, dann die Schritte dieser Art (Grundlage, Angaben, Wahlen, Übersicht).
 * Bearbeiten: dieselben Schritte ohne Art und Grundlage. Geändert wird ein Entwurf; erst „Erstellen“ bzw.
 * „Übernehmen“ schreibt ihn in den Charakter. Sperren wie bisher (Regelverstoß; mit Hausregeln nur Warnung).
 */
import React, { useState } from 'react';
import { Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { useCharacter } from '../../../context/CharacterContext';
import { aenderungGesperrt, regelverstoss } from '../../../fundament/hausregeln';
import { Dialog, Knopf } from '../../../fundament';
import { alleTiere, beschwoerbareWesen } from '../../../regelwerk/begleiter';
import { basen } from '../../../regelwerk/wesenBaukasten';
import { gefolgeWerte, kulturen } from '../../../regelwerk/gefolge';
import { erhebungen, untotWerte } from '../../../regelwerk/untote';
import { golemWerte, korpusse } from '../../../regelwerk/golem';
import type { Katalog } from '../../../regelwerk/katalog';
import type { Begleiter } from '../../../types';
import { ARTEN, artInfo, begleiterTitel, type BegleiterArt } from '../ansicht';
import { gefolgeVerbraucht, type Besitzer } from '../besitzer';
import { Erklaerung, Wahlkarte } from './teile';
import { tierSchritte } from './tier';
import { gefolgeSchritte } from './gefolge';
import { wesenSchritte } from './wesen';
import { untotSchritte } from './untot';
import { golemSchritte } from './golem';
import type { Schritt } from './typen';

/** Steht die Art mit den geladenen Paketen zur Verfügung? Sonst der Grund */
function artVerfuegbar(k: Katalog, art: BegleiterArt): string | null {
  switch (art) {
    case 'tier': return alleTiere(k).length || basen(k, 'kreatur').length ? null : 'Keine Tiere in den Paketen.';
    case 'gefolge': return k.get('grw:ressource:gefolge') || kulturen(k).length ? null : 'Die Ressource Gefolge fehlt im GRW-Paket.';
    case 'wesen': return beschwoerbareWesen(k).length || basen(k, 'beschwoerbar').length ? null : 'Beschwörbare Wesen stehen im Grimoire „Die Magie“.';
    case 'untoter': return erhebungen(k).length ? null : 'Keine Erhebungszauber in den Paketen.';
    case 'golem': return korpusse(k).length ? null : 'Der Golem-Baukasten steht im Grimoire „Die Magie“.';
  }
}

function schritteFuer(k: Katalog, b: Begleiter): Schritt[] {
  switch (b.art) {
    case 'tier': return tierSchritte(k, b);
    case 'gefolge': return gefolgeSchritte(k);
    case 'wesen': return wesenSchritte(k, b);
    case 'untoter': return untotSchritte(k);
    case 'golem': return golemSchritte(k);
  }
}

const ArtWahl: React.FC<{ k: Katalog; art: BegleiterArt | null; waehlen: (a: BegleiterArt) => void }> = ({ k, art, waehlen }) => (
  <div className="space-y-3">
    <Erklaerung>Welche Art von Begleiter möchtest du erstellen?</Erklaerung>
    <div className="grid sm:grid-cols-2 gap-3" role="group" aria-label="Art des Begleiters">
      {ARTEN.map(a => {
        const grund = artVerfuegbar(k, a.art);
        const Symbol = a.symbol;
        return <Wahlkarte key={a.art} gewaehlt={art === a.art} onClick={() => waehlen(a.art)} disabled={!!grund} hinweis={grund ?? undefined}
          symbol={<Symbol size={22} />} titel={a.name} text={a.text} />;
      })}
    </div>
  </div>
);

/** Schrittleiste: Nummer bzw. Häkchen und Titel; erreichbare Schritte anklickbar */
const Schrittleiste: React.FC<{ titel: string[]; aktuell: number; erreichbar: number; gehe: (i: number) => void }> = ({ titel, aktuell, erreichbar, gehe }) => (
  <ol className="flex flex-wrap gap-1.5 m-0 p-0 list-none" aria-label="Schritte">
    {titel.map((t, i) => {
      const fertig = i < aktuell;
      return (
        <li key={i}>
          <button type="button" disabled={i > erreichbar} onClick={() => gehe(i)} aria-current={i === aktuell ? 'step' : undefined}
            className={`min-h-11 flex items-center gap-2 rounded-knopf border px-2.5 text-xs font-text transition-colors ${
              i === aktuell ? 'border-gold bg-erhoeht text-schrift font-bold' : fertig ? 'border-rahmen text-schrift hover:border-gold' : 'border-rahmen text-leise hover:border-gold'
            } disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-rahmen`}>
            <span className={`w-5 h-5 rounded-full border flex items-center justify-center text-[11px] shrink-0 ${i === aktuell || fertig ? 'border-gold text-gold' : 'border-rahmen'}`} aria-hidden>
              {fertig ? <Check size={12} /> : i + 1}
            </span>
            {t}
          </button>
        </li>
      );
    })}
  </ol>
);

export const BegleiterAssistent: React.FC<{
  k: Katalog; besitzer: Besitzer;
  /** Stelle des Begleiters beim Bearbeiten; fehlt beim Erstellen */
  index?: number;
  onSchliessen: () => void;
  /** nach dem Erstellen: Stelle des neuen Begleiters */
  onFertig?: (index: number) => void;
}> = ({ k, besitzer, index, onSchliessen, onFertig }) => {
  const { state, dispatch } = useCharacter();
  const alle = state.begleiter ?? [];
  const neu = index === undefined;
  const [entwurf, setEntwurf] = useState<Begleiter | null>(neu ? null : { ...alle[index!] });
  const [stelle, setStelle] = useState(0);
  const [weitest, setWeitest] = useState(0);

  const artSchritt: Schritt = { id: 'art', titel: 'Art', inhalt: () => null, bereit: () => !!entwurf };
  const eigene = entwurf ? schritteFuer(k, entwurf).filter(s => neu || !s.nurNeu) : [];
  const schritte = neu ? [artSchritt, ...eigene] : eigene;
  const aktuell = schritte[Math.min(stelle, schritte.length - 1)];
  const istArt = aktuell?.id === 'art';
  const bereit = istArt ? !!entwurf : !aktuell?.bereit || (!!entwurf && aktuell.bereit(entwurf));
  const letzter = !!entwurf && stelle >= schritte.length - 1;
  // erreichbar: alle bis zum ersten nicht bereiten Schritt, höchstens so weit wie schon besucht + 1
  let erreichbar = 0;
  for (let i = 0; i < schritte.length - 1; i++) {
    const s = schritte[i];
    const ok = s.id === 'art' ? !!entwurf : !s.bereit || (!!entwurf && s.bereit(entwurf));
    if (!ok) break;
    erreichbar = i + 1;
  }
  erreichbar = Math.min(erreichbar, Math.max(weitest, stelle) + 1);

  const gehe = (i: number) => { setStelle(i); setWeitest(w => Math.max(w, i)); };

  /** Änderung am Entwurf mit den Sperren der Art (wie bisher in den Abschnitten) */
  const aendern = (a: Partial<Begleiter>) => {
    if (!entwurf) return;
    const nach = { ...entwurf, ...a };
    if (entwurf.id && nach.id) {
      if (entwurf.art === 'gefolge') {
        const vor = gefolgeWerte(k, entwurf, besitzer.maxFertigkeit); const jetzt = gefolgeWerte(k, nach, besitzer.maxFertigkeit);
        if (aenderungGesperrt(vor.verstoesse, jetzt.verstoesse)) return;
        const frei = besitzer.gefolgePunkte - gefolgeVerbraucht(k, alle, besitzer.maxFertigkeit, index) - vor.punkte;
        if (jetzt.punkte > vor.punkte && jetzt.punkte - vor.punkte > frei && regelverstoss('Dafür reichen die Punkte der Ressource Gefolge nicht.')) return;
      } else if (entwurf.art === 'untoter') {
        if (aenderungGesperrt(untotWerte(k, entwurf, besitzer).verstoesse, untotWerte(k, nach, besitzer).verstoesse)) return;
      } else if (entwurf.art === 'golem') {
        if (aenderungGesperrt(golemWerte(k, entwurf).verstoesse, golemWerte(k, nach).verstoesse)) return;
      }
    }
    setEntwurf(nach);
  };

  const fertig = () => {
    if (!entwurf?.id) return;
    if (neu) {
      if (entwurf.art === 'gefolge') {
        const brauchen = gefolgeVerbraucht(k, alle, besitzer.maxFertigkeit) + gefolgeWerte(k, entwurf, besitzer.maxFertigkeit).punkte;
        if (brauchen > besitzer.gefolgePunkte && regelverstoss('Dafür reichen die Punkte der Ressource Gefolge nicht.')) return;
      }
      dispatch({ type: 'BEGLEITER_HINZU', payload: entwurf });
      onFertig?.(alle.length);
    } else {
      // Spielstand (Lebenspunkte, Zustände) und Notiz bleiben, wie sie auf dem Blatt stehen
      const { zustand: _z, notiz: _n, ...aenderung } = entwurf;
      dispatch({ type: 'BEGLEITER_AENDERN', payload: { index: index!, aenderung } });
    }
    onSchliessen();
  };

  const Inhalt = aktuell?.inhalt;
  const titel = neu ? (entwurf ? `${artInfo(entwurf.art).name} erstellen` : 'Begleiter erstellen') : `${begleiterTitel(entwurf!)} bearbeiten`;

  return (
    <Dialog titel={titel} breite="breit" onSchliessen={onSchliessen}
      untertitel={entwurf ? `Schritt ${stelle + 1} von ${schritte.length}: ${aktuell?.titel ?? ''}` : 'Schritt 1: Art wählen'}
      fuss={<>
        <Knopf onClick={onSchliessen}>Abbrechen</Knopf>
        <Knopf disabled={stelle === 0} onClick={() => gehe(stelle - 1)}><ChevronLeft size={14} aria-hidden />Zurück</Knopf>
        {letzter ? (
          <Knopf art="primaer" disabled={!entwurf?.id} onClick={fertig}><Check size={14} aria-hidden />{neu ? 'Erstellen' : 'Übernehmen'}</Knopf>
        ) : (
          <Knopf art="primaer" disabled={!bereit} onClick={() => gehe(stelle + 1)}>Weiter<ChevronRight size={14} aria-hidden /></Knopf>
        )}
      </>}>
      <div data-testid="begleiter-assistent" className="space-y-5">
        {schritte.length > 1 && <div className="pb-4 border-b border-rahmen"><Schrittleiste titel={schritte.map(s => s.titel)} aktuell={stelle} erreichbar={erreichbar} gehe={gehe} /></div>}
        {istArt ? (
          <ArtWahl k={k} art={entwurf?.art ?? null} waehlen={art => { if (entwurf?.art !== art) { setEntwurf({ id: '', art, name: '' }); setWeitest(0); } gehe(1); }} />
        ) : entwurf && Inhalt ? (
          <Inhalt k={k} b={entwurf} aendern={aendern} besitzer={besitzer} alle={alle} index={index} />
        ) : null}
      </div>
    </Dialog>
  );
};
