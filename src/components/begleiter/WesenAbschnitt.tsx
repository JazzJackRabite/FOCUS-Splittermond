import React, { useMemo, useState } from 'react';
import { Sparkles, Plus } from 'lucide-react';
import { useCharacter } from '../../context/CharacterContext';
import { beschwoerbareWesen, diensteFuer, wertekasten, wesenStufe } from '../../regelwerk/begleiter';
import type { Katalog } from '../../regelwerk/katalog';
import { Werte, Eintrag, Notiz } from './Wertekasten';
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
  const e = k.get(b.id); const w = e ? wertekasten(e) : null;
  const daten = spielDaten(b, w);
  const spiel = useBegleiterSpiel(b, index, daten);
  const aendern = (aenderung: Partial<Begleiter>) => dispatch({ type: 'BEGLEITER_AENDERN', payload: { index, aenderung } });
  return (
    <Eintrag titel={b.rufname ? `${b.rufname} (${b.name})` : b.name} offen={offen} umschalten={() => setOffen(o => !o)} vor={spiel.modale}
      onEntfernen={() => dispatch({ type: 'BEGLEITER_ENTFERNEN', payload: { index } })}
      marken={<>
        <VitalKurz spiel={spiel} daten={daten} />
        <span>Stufe {wesenStufe(e) ?? '?'}</span>
        {!e && <Marke klein ton="erschoepft">nicht im Katalog (Buch nicht geladen?)</Marke>}
      </>}>
      {e && <>
        <BegleiterVitals spiel={spiel} daten={daten} />
        {w ? <Werte w={w} aktionen={spiel.aktionen} /> : <p className="text-leise">Keine Werte in den Paketen.</p>}
        <div className="space-y-1"><Abschnittstitel als="h3" className="text-[15px]">Dienste</Abschnittstitel><Dienste k={k} wesen={b.id} /></div>
        <Notiz b={b} aendern={aendern} />
      </>}
    </Eintrag>
  );
};

/** Beschworene Wesen (Die Magie S. 186–191) mit ihren Diensten */
export const WesenAbschnitt: React.FC<{ k: Katalog }> = ({ k }) => {
  const { state, dispatch } = useCharacter();
  const [wahl, setWahl] = useState('');
  const wesen = useMemo(() => beschwoerbareWesen(k), [k]);
  const liste = (state.begleiter ?? []).map((b, i) => ({ b, i })).filter(x => x.b.art === 'wesen');

  return (
    <Karte data-testid="begleiter-wesen" className="space-y-3">
      <div className="flex items-center gap-2">
        <Sparkles size={18} aria-hidden />
        <Abschnittstitel>Beschworene Wesen</Abschnittstitel>
      </div>
      {!wesen.length && !liste.length && (
        <p className="text-sm text-leise">Beschwörbare Wesen und ihre Dienste stehen im Buchpaket „Die Magie“ (Einstellungen → Regelpakete).</p>
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
    </Karte>
  );
};
