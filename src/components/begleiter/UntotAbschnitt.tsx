import { aenderungGesperrt } from '../../fundament/hausregeln';
import React, { useMemo, useState } from 'react';
import { Skull, Plus, Minus } from 'lucide-react';
import { useCharacter } from '../../context/CharacterContext';
import {
  ANGRIFF, abnormitaeten, steigerbareFertigkeiten, attributKosten, erhebungen, fertigkeitKosten, meisterschaftenBis, untotWerte,
} from '../../regelwerk/untote';
import { ATTRIBUT_KURZ, alsWertekasten } from '../../regelwerk/modifikationen';
import type { Katalog } from '../../regelwerk/katalog';
import type { Begleiter } from '../../types';
import { Werte, Eintrag, Hinweise, Notiz, MarkeMitEntfernen } from './Wertekasten';
import { BegleiterVitals, VitalKurz, spielDaten, useBegleiterSpiel } from './BegleiterSpiel';
import { Abschnittstitel, Auswahl, Eingabe, Karte, Knopf, Marke } from '../../fundament';

interface Nekromant { nekromant: boolean; meisterDerAbnormitaeten: boolean; zauber: string[] }

const Stufer: React.FC<{ label: string; wert: number; setzen: (n: number) => void; kosten: string }> = ({ label, wert, setzen, kosten }) => (
  <div className="flex items-center gap-2">
    <span className="min-w-[8rem]">{label}</span>
    <Knopf nurSymbol aria-label={`${label} senken`} disabled={wert <= 0} onClick={() => setzen(wert - 1)}><Minus size={16} aria-hidden /></Knopf>
    <span className="w-8 text-center font-titel text-base">+{wert}</span>
    <Knopf nurSymbol aria-label={`${label} steigern`} onClick={() => setzen(wert + 1)}><Plus size={16} aria-hidden /></Knopf>
    <span className="text-leise text-xs">{kosten}</span>
  </div>
);

const UntotEintrag: React.FC<{ k: Katalog; b: Begleiter; index: number; n: Nekromant }> = ({ k, b, index, n }) => {
  const { dispatch } = useCharacter();
  const [offen, setOffen] = useState(false);
  const [fWahl, setFWahl] = useState('');
  const [mWahl, setMWahl] = useState('');
  const u = untotWerte(k, b, n);
  const aendern = (aenderung: Partial<Begleiter>) => {
    if (aenderungGesperrt(u.verstoesse, untotWerte(k, { ...b, ...aenderung }, n).verstoesse)) return;
    dispatch({ type: 'BEGLEITER_AENDERN', payload: { index, aenderung } });
  };
  const st = b.steigerung ?? {};
  const setzeA = (a: string, v: number) => aendern({ steigerung: { ...st, attribute: { ...(st.attribute ?? {}), [a]: Math.max(0, v) } } });
  const setzeF = (f: string, v: number) => aendern({ steigerung: { ...st, fertigkeiten: { ...(st.fertigkeiten ?? {}), [f]: Math.max(0, v) } } });
  const titel = b.rufname ? `${b.rufname} (${b.name})` : b.name;
  const wk = u.werte ? alsWertekasten(u.werte) : null;
  const daten = spielDaten(b, wk);
  const spiel = useBegleiterSpiel(b, index, daten);
  const vorhanden = new Set([...(u.werte?.fertigkeiten ?? []).map(f => f.id), ...Object.keys(st.fertigkeiten ?? {})]);
  const steigerbar = useMemo(() => steigerbareFertigkeiten(k), [k]);
  const fertigkeitsListe = [ANGRIFF, ...[...vorhanden].filter((x): x is string => !!x && x !== ANGRIFF)];
  const ms = b.meisterschaften ?? [];
  // Angebot: Meisterschaften der Fertigkeiten mit freiem Platz, bis zur Schwelle des Platzes
  const plaetzeFrei = u.freieMeisterschaften.length - u.meisterschaften.filter(m => m.ok).length;
  const angebot = useMemo(() => {
    const hoechste = new Map<string, { name: string; schwelle: number }>();
    for (const p of u.freieMeisterschaften) if ((hoechste.get(p.fertigkeitId)?.schwelle ?? 0) < p.schwelle) hoechste.set(p.fertigkeitId, { name: p.fertigkeit, schwelle: p.schwelle });
    return [...hoechste.entries()].map(([id, x]) => ({ fertigkeit: x.name, liste: meisterschaftenBis(k, id, x.schwelle) }));
  }, [k, u.freieMeisterschaften]);

  return (
    <Eintrag titel={titel} offen={offen} umschalten={() => setOffen(o => !o)} vor={spiel.modale}
      onEntfernen={() => dispatch({ type: 'BEGLEITER_ENTFERNEN', payload: { index } })}
      marken={<>
        <VitalKurz spiel={spiel} daten={daten} />
        {u.erhebung && <span>{u.erhebung.zauber.name}</span>}
        {u.abnormitaet && <Marke klein>{u.abnormitaet.name}</Marke>}
        <Marke klein ton={u.epVerbraucht > u.epGesamt ? 'schaden' : 'neutral'}>EP {u.epVerbraucht}/{u.epGesamt}</Marke>
        {u.hinweise.length > 0 && <Marke klein ton="erschoepft" title={u.hinweise.join('\n')}>{u.hinweise.length} Hinweis{u.hinweise.length > 1 ? 'e' : ''}</Marke>}
      </>}>
      <div className="flex flex-wrap gap-3 items-end">
        <Eingabe beschriftung="Rufname" value={b.rufname ?? ''} onChange={ev => aendern({ rufname: ev.target.value || undefined })} placeholder={b.name} />
        <Eingabe beschriftung="Anzahl Verstärkungen" type="number" min={0} max={n.nekromant ? 20 : 1} className="w-24" value={b.verstaerkungen ?? 0}
          onChange={ev => aendern({ verstaerkungen: Math.max(0, Number(ev.target.value) || 0) || undefined })} />
        <Auswahl beschriftung="Abnormität" value={b.abnormitaet ?? ''} onChange={ev => aendern({ abnormitaet: ev.target.value || undefined })}>
          <option value="">keine</option>
          {abnormitaeten(k).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </Auswahl>
      </div>
      <p>
        {u.erhebung ? <>{u.erhebung.zauber.name} (Grad {u.erhebung.grad}): je Verstärkung {u.erhebung.epJeVerstaerkung} EP{n.nekromant ? ', beliebig oft (Nekromant)' : ', einmal (mehrfach mit Nekromant)'}. </> : null}
        Neue Punkte je Fertigkeit höchstens {u.grenze}. Verstand 0 (frisch erhoben); nur einfache Befehle, ab Verstand 1 auch komplexere (Die Magie S. 182).
      </p>
      {u.abnormitaet && <p><span className="text-leise">{u.abnormitaet.name}:</span> {u.abnormitaetText}</p>}

      {wk && <BegleiterVitals spiel={spiel} daten={daten} />}
      {wk ? <Werte w={wk} aktionen={spiel.aktionen} /> : null}

      <div className="space-y-2">
        <Abschnittstitel als="h3" className="text-[15px]">Steigerung (von 0 an)</Abschnittstitel>
        <div className="grid sm:grid-cols-2 gap-x-6 gap-y-2">
          {ATTRIBUT_KURZ.map(a => (
            <Stufer key={a} label={a} wert={st.attribute?.[a] ?? 0} setzen={v => setzeA(a, v)} kosten={`${attributKosten(st.attribute?.[a] ?? 0)} EP`} />
          ))}
        </div>
        <div className="grid sm:grid-cols-2 gap-x-6 gap-y-2">
          {fertigkeitsListe.map(f => (
            <Stufer key={f} label={f === ANGRIFF ? 'Angriff (Waffen)' : k.get(f)?.name ?? f} wert={st.fertigkeiten?.[f] ?? 0} setzen={v => setzeF(f, v)}
              kosten={`${fertigkeitKosten(st.fertigkeiten?.[f] ?? 0)} EP`} />
          ))}
        </div>
        <div className="flex flex-wrap gap-2 items-end">
          <Auswahl beschriftung="Neue Fertigkeit für Untoten" beschriftungVerborgen value={fWahl} onChange={ev => setFWahl(ev.target.value)}>
            <option value="">weitere Fertigkeit …</option>
            {steigerbar.filter(e => !vorhanden.has(e.id)).map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
          </Auswahl>
          <Knopf disabled={!fWahl} onClick={() => { setzeF(fWahl, 1); setFWahl(''); }}><Plus size={14} aria-hidden />Steigern</Knopf>
        </div>
        <p className="text-xs text-leise">Fertigkeitspunkte 1–6 je 3 EP, 7–9 je 5 EP …; Attribute 10, 15, … EP. Keine Magieschulen, kein Arkane Kunde / Geschichte und Mythen.</p>
      </div>

      {(u.freieMeisterschaften.length > 0 || ms.length > 0) && (
        <div className="space-y-2">
          <Abschnittstitel als="h3" className="text-[15px]">Freie Meisterschaften</Abschnittstitel>
          <p className="text-leise">Plätze: {u.freieMeisterschaften.map(p => `${p.fertigkeit} (Schwelle ${p.schwelle})`).join(', ') || 'keine'}; frei {Math.max(0, plaetzeFrei)}.</p>
          {u.meisterschaften.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {u.meisterschaften.map((m, i) => (
                <MarkeMitEntfernen key={`${m.id}-${i}`} ton={m.ok ? 'neutral' : 'erschoepft'} label={`Meisterschaft ${m.name} entfernen`}
                  onEntfernen={() => aendern({ meisterschaften: ms.filter((_, j) => j !== i) })}>
                  {m.name} ({m.fertigkeit}, S{m.schwelle}){m.ok ? '' : ' – ohne Platz'}
                </MarkeMitEntfernen>
              ))}
            </div>
          )}
          {plaetzeFrei > 0 && (
            <div className="flex flex-wrap gap-2 items-end">
              <Auswahl beschriftung="Freie Meisterschaft wählen" beschriftungVerborgen value={mWahl} onChange={ev => setMWahl(ev.target.value)}>
                <option value="">Meisterschaft wählen …</option>
                {angebot.map(g => (
                  <optgroup key={g.fertigkeit} label={g.fertigkeit}>
                    {g.liste.map(m => <option key={m.id} value={m.id} disabled={ms.includes(m.id)}>{m.name} (S{m.schwelle})</option>)}
                  </optgroup>
                ))}
              </Auswahl>
              <Knopf art="sekundaer" disabled={!mWahl} onClick={() => { aendern({ meisterschaften: [...ms, mWahl] }); setMWahl(''); }}><Plus size={14} aria-hidden />Meisterschaft</Knopf>
            </div>
          )}
        </div>
      )}

      <Hinweise liste={u.hinweise} />
      <Notiz b={b} aendern={aendern} />
    </Eintrag>
  );
};

/** Erhobene Untote (Nekromantie): Wertesatz nach Zauber, EP aus der Verstärkung, Abnormitäten (Die Magie S. 182–184) */
export const UntotAbschnitt: React.FC<{ k: Katalog }> = ({ k }) => {
  const { state, dispatch } = useCharacter();
  const [zauber, setZauber] = useState('');
  const [satz, setSatz] = useState('');
  const liste = useMemo(() => erhebungen(k), [k]);
  const ms = Object.values(state.masteries ?? {}).flat();
  const n: Nekromant = {
    nekromant: ms.some(m => /^Nekromant\b/.test(m.name)),
    meisterDerAbnormitaeten: ms.some(m => /^Meister der Abnormitäten\b/.test(m.name)),
    zauber: (state.spellsList ?? []).map(s => s.name),
  };
  const eigene = (state.begleiter ?? []).map((b, i) => ({ b, i })).filter(x => x.b.art === 'untoter');
  const gew = liste.find(x => x.zauber.id === zauber);
  if (!liste.length) return null;

  return (
    <Karte data-testid="begleiter-untote" className="space-y-3">
      <div className="flex items-center gap-2">
        <Skull size={18} aria-hidden />
        <Abschnittstitel>Erhobene Untote</Abschnittstitel>
      </div>
      <p className="text-sm text-leise">
        Der Erhebungszauber bestimmt den Wertesatz; Steigerungen mit den EP aus seiner Verstärkung (Die Magie S. 182–184).
        {!liste.some(x => x.zauber.quelle.paket === 'magie') && ' Weitere Zauber und Abnormitäten im Buchpaket „Die Magie“.'}
      </p>
      {eigene.length > 0 && <ul className="space-y-3">{eigene.map(({ b, i }) => <UntotEintrag key={`${b.id}-${i}`} k={k} b={b} index={i} n={n} />)}</ul>}
      <div className="flex flex-wrap gap-2 items-end">
        <Auswahl beschriftung="Erhebungszauber wählen" beschriftungVerborgen value={zauber} onChange={e => { setZauber(e.target.value); setSatz(''); }}>
          <option value="">Erhebungszauber …</option>
          {liste.map(x => <option key={x.zauber.id} value={x.zauber.id}>{x.zauber.name} (Tod {x.grad}){n.zauber.includes(x.zauber.name) ? ' – bekannt' : ''}</option>)}
        </Auswahl>
        <Auswahl beschriftung="Wertesatz wählen" beschriftungVerborgen value={satz} onChange={e => setSatz(e.target.value)} disabled={!gew}>
          <option value="">Wertesatz …</option>
          {(gew?.wertesaetze ?? []).map(w => <option key={w.name} value={w.name}>{w.name}{w.id ? '' : ` (Werte: ${w.quelle})`}</option>)}
        </Auswahl>
        <Knopf art="sekundaer" disabled={!gew || !satz} onClick={() => {
          const w = gew!.wertesaetze.find(x => x.name === satz)!;
          dispatch({ type: 'BEGLEITER_HINZU', payload: { id: w.id ?? `untoter:${w.name}`, art: 'untoter', name: w.name, erhebung: gew!.zauber.id } });
          setSatz('');
        }}><Plus size={14} aria-hidden />Untoten hinzufügen</Knopf>
      </div>
    </Karte>
  );
};
