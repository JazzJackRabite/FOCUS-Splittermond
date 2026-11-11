import React, { useMemo, useState } from 'react';
import { Sparkles, Plus } from 'lucide-react';
import { useCharacter } from '../../context/CharacterContext';
import { beschwoerbareWesen, diensteFuer, wertekasten, wesenStufe } from '../../regelwerk/begleiter';
import type { Katalog } from '../../regelwerk/katalog';
import { Werte, Eintrag, Notiz } from './Wertekasten';
import { WesenBaukasten } from './WesenBaukasten';
import { baukastenArt, basen, wesenBaukastenWerte } from '../../regelwerk/wesenBaukasten';
import { alsWertekasten } from '../../regelwerk/modifikationen';
import { BegleiterVitals, VitalKurz, spielDaten, useBegleiterSpiel } from './BegleiterSpiel';
import { Abschnittstitel, Auswahl, Karte, Knopf, Marke } from '../../fundament';
import type { Begleiter } from '../../types';

const Dienste: React.FC<{ k: Katalog; wesen: string }> = ({ k, wesen }) => {
  const { state } = useCharacter();
  const liste = useMemo(() => diensteFuer(k, wesen, state.masteries), [k, wesen, state.masteries]);
  if (!liste.length) return <p className="text-leise">Keine Dienste verfügbar (Paket „Die Magie“ geladen?).</p>;
  const art = { basis: 'Basisdienst', immer: 'immer verfügbar', erweitert: 'Erweiterter Dienst' } as const;
  return (
    <ul className="space-y-1">
      {liste.map(d => <li key={d.id}><strong>{k.get(d.id)?.name ?? d.id}</strong> <span className="text-leise">– {art[d.art]}, {d.kosten}</span></li>)}
    </ul>
  );
};

const WesenEintrag: React.FC<{ k: Katalog; b: Begleiter; index: number }> = ({ k, b, index }) => {
  const { dispatch } = useCharacter();
  const [offen, setOffen] = useState(false);
  const e = k.get(b.id);
  const bk = e && baukastenArt(e) ? wesenBaukastenWerte(k, b) : null;
  const w = bk?.werte ? alsWertekasten(bk.werte) : e ? wertekasten(e) : null;
  const daten = spielDaten(b, w);
  const spiel = useBegleiterSpiel(b, index, daten);
  const aendern = (aenderung: Partial<Begleiter>) => dispatch({ type: 'BEGLEITER_AENDERN', payload: { index, aenderung } });
  return (
    <Eintrag titel={b.rufname ? `${b.rufname} (${b.name})` : b.name} offen={offen} umschalten={() => setOffen(o => !o)} vor={spiel.modale}
      onEntfernen={() => dispatch({ type: 'BEGLEITER_ENTFERNEN', payload: { index } })}
      marken={<>
        <VitalKurz spiel={spiel} daten={daten} />
        <span>Stufe {bk ? bk.stufe : wesenStufe(e) ?? '?'}</span>
        {bk && <Marke klein>Baukasten</Marke>}
        {bk && bk.hinweise.length > 0 && <Marke klein ton="erschoepft">{bk.hinweise.length} Hinweis{bk.hinweise.length > 1 ? 'e' : ''}</Marke>}
        {!e && <Marke klein ton="erschoepft">nicht im Katalog (Grimoire nicht geladen?)</Marke>}
      </>}>
      {e && <>
        <BegleiterVitals spiel={spiel} daten={daten} />
        {w ? <Werte w={w} aktionen={spiel.aktionen} /> : <p className="text-leise">Keine Werte in den Paketen.</p>}
        {bk ? <WesenBaukasten k={k} b={b} w={bk} aendern={aendern} /> : (
          <div className="space-y-1"><Abschnittstitel als="h3" className="text-[15px]">Dienste</Abschnittstitel><Dienste k={k} wesen={b.id} /></div>
        )}
        <Notiz b={b} aendern={aendern} />
      </>}
    </Eintrag>
  );
};

/** Beschworene Wesen (Die Magie S. 186–191) mit ihren Diensten */
export const WesenAbschnitt: React.FC<{ k: Katalog }> = ({ k }) => {
  const { state, dispatch } = useCharacter();
  const [wahl, setWahl] = useState('');
  const [korpus, setKorpus] = useState('');
  const wesen = useMemo(() => beschwoerbareWesen(k), [k]);
  const korpusse = useMemo(() => basen(k, 'beschwoerbar'), [k]);
  const liste = (state.begleiter ?? []).map((b, i) => ({ b, i })).filter(x => x.b.art === 'wesen');

  return (
    <Karte data-testid="begleiter-wesen" className="space-y-3">
      <div className="flex items-center gap-2">
        <Sparkles size={18} aria-hidden />
        <Abschnittstitel>Beschworene Wesen</Abschnittstitel>
      </div>
      {!wesen.length && !liste.length && (
        <p className="text-sm text-leise">Beschwörbare Wesen und ihre Dienste stehen im Grimoire „Die Magie“ (Einstellungen → Regelpakete).</p>
      )}
      {liste.length > 0 && (
        <ul className="space-y-3">
          {liste.map(({ b, i }) => <WesenEintrag key={`${b.id}-${i}`} k={k} b={b} index={i} />)}
        </ul>
      )}
      {wesen.length > 0 && (
        <div className="flex flex-wrap gap-2 items-end">
          <Auswahl beschriftung="Beschworenes Wesen wählen" beschriftungVerborgen value={wahl} onChange={e => setWahl(e.target.value)}>
            <option value="">Beschworenes Wesen wählen …</option>
            {wesen.map(x => <option key={x.id} value={x.id}>{x.name} (Stufe {x.stufe}, {x.quelle})</option>)}
          </Auswahl>
          <Knopf art="sekundaer" disabled={!wahl} onClick={() => {
            const e = k.get(wahl); if (!e) return;
            dispatch({ type: 'BEGLEITER_HINZU', payload: { id: e.id, art: 'wesen', name: e.name } }); setWahl('');
          }}><Plus size={14} aria-hidden />Wesen hinzufügen</Knopf>
        </div>
      )}
      {korpusse.length > 0 && (
        <div className="flex flex-wrap gap-2 items-end">
          <Auswahl beschriftung="Eigenes Wesen bauen: Korpus" value={korpus} onChange={e => setKorpus(e.target.value)}>
            <option value="">Korpus wählen …</option>
            {korpusse.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}
          </Auswahl>
          <Knopf art="sekundaer" disabled={!korpus} onClick={() => {
            const e = k.get(korpus); if (!e) return;
            dispatch({ type: 'BEGLEITER_HINZU', payload: { id: e.id, art: 'wesen', name: `Eigenes Wesen (${e.name})`, bausteine: [] } }); setKorpus('');
          }}><Plus size={14} aria-hidden />Wesen bauen</Knopf>
        </div>
      )}
    </Karte>
  );
};
