import React, { useMemo, useState } from 'react';
import { Skull, Plus, Minus, Trash2, ChevronDown, ChevronRight, AlertTriangle } from 'lucide-react';
import { useCharacter } from '../../context/CharacterContext';
import {
  ANGRIFF, INTELLEKTUELL, abnormitaeten, attributKosten, erhebungen, fertigkeitKosten, untotWerte,
} from '../../regelwerk/untote';
import { ATTRIBUT_KURZ, alsWertekasten } from '../../regelwerk/modifikationen';
import type { Katalog } from '../../regelwerk/katalog';
import type { Begleiter } from '../../types';
import { Werte, auswahl, karte, knopf } from './Wertekasten';

interface Nekromant { nekromant: boolean; meisterDerAbnormitaeten: boolean; zauber: string[] }

const Stufer: React.FC<{ label: string; wert: number; setzen: (n: number) => void; kosten: string }> = ({ label, wert, setzen, kosten }) => (
  <div className="flex items-center gap-1">
    <span className="min-w-[7rem]">{label}</span>
    <button type="button" aria-label={`${label} senken`} disabled={wert <= 0} onClick={() => setzen(wert - 1)}
      className="p-0.5 rounded border border-[#d1c4b0] disabled:opacity-40 cursor-pointer"><Minus size={10} /></button>
    <span className="w-5 text-center font-bold">+{wert}</span>
    <button type="button" aria-label={`${label} steigern`} onClick={() => setzen(wert + 1)}
      className="p-0.5 rounded border border-[#d1c4b0] cursor-pointer"><Plus size={10} /></button>
    <span className="text-gray-500">{kosten}</span>
  </div>
);

const UntotEintrag: React.FC<{ k: Katalog; b: Begleiter; index: number; n: Nekromant }> = ({ k, b, index, n }) => {
  const { dispatch } = useCharacter();
  const [offen, setOffen] = useState(false);
  const [fWahl, setFWahl] = useState('');
  const aendern = (aenderung: Partial<Begleiter>) => dispatch({ type: 'BEGLEITER_AENDERN', payload: { index, aenderung } });
  const u = untotWerte(k, b, n);
  const st = b.steigerung ?? {};
  const setzeA = (a: string, v: number) => aendern({ steigerung: { ...st, attribute: { ...(st.attribute ?? {}), [a]: Math.max(0, v) } } });
  const setzeF = (f: string, v: number) => aendern({ steigerung: { ...st, fertigkeiten: { ...(st.fertigkeiten ?? {}), [f]: Math.max(0, v) } } });
  const titel = b.rufname ? `${b.rufname} (${b.name})` : b.name;
  const vorhanden = new Set([...(u.werte?.fertigkeiten ?? []).map(f => f.id), ...Object.keys(st.fertigkeiten ?? {})]);
  const steigerbar = useMemo(() => Object.values(k.eintraege).filter(e => e.typ === 'fertigkeit' && !e.daten.gruppierte_fertigkeit
    && e.daten.kategorie !== 'Magieschule' && !INTELLEKTUELL.includes(e.id)).sort((x, y) => x.name.localeCompare(y.name, 'de')), [k]);
  const fertigkeitsListe = [ANGRIFF, ...[...vorhanden].filter((x): x is string => !!x && x !== ANGRIFF)];

  return (
    <li className="border border-[#d1c4b0] rounded-lg p-2 bg-white">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <button type="button" className="flex items-center gap-1 text-sm font-bold text-[#1B365D] cursor-pointer" onClick={() => setOffen(o => !o)} aria-expanded={offen}>
          {offen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}{titel}
        </button>
        <span className="flex items-center gap-2 text-xs text-gray-500 flex-wrap">
          {u.erhebung && <span>{u.erhebung.zauber.name}</span>}
          {u.abnormitaet && <span className="px-1.5 rounded bg-[#ebdcc3] text-[#1B365D] font-bold">{u.abnormitaet.name}</span>}
          <span className={u.epVerbraucht > u.epGesamt ? 'text-red-700 font-bold' : ''}>EP {u.epVerbraucht}/{u.epGesamt}</span>
          {u.hinweise.length > 0 && <span className="text-amber-700 flex items-center gap-0.5" title={u.hinweise.join('\n')}><AlertTriangle size={12} />{u.hinweise.length}</span>}
          <button type="button" aria-label={`${titel} entfernen`} onClick={() => dispatch({ type: 'BEGLEITER_ENTFERNEN', payload: { index } })}
            className="p-1 rounded hover:bg-black/5 hover:text-red-700 cursor-pointer"><Trash2 size={14} /></button>
        </span>
      </div>

      {offen && (
        <div className="mt-2 space-y-3 text-xs">
          <div className="flex flex-wrap gap-3 items-end">
            <label className="flex flex-col gap-0.5">Rufname
              <input value={b.rufname ?? ''} onChange={ev => aendern({ rufname: ev.target.value || undefined })} className={auswahl} placeholder={b.name} />
            </label>
            <label className="flex flex-col gap-0.5">Verstärkung (EP) gewählt
              <input type="number" min={0} max={n.nekromant ? 20 : 1} value={b.verstaerkungen ?? 0} className={`${auswahl} w-20`} aria-label="Anzahl Verstärkungen"
                onChange={ev => aendern({ verstaerkungen: Math.max(0, Number(ev.target.value) || 0) || undefined })} />
            </label>
            <label className="flex flex-col gap-0.5">Abnormität (5 EP)
              <select value={b.abnormitaet ?? ''} onChange={ev => aendern({ abnormitaet: ev.target.value || undefined })} className={auswahl} aria-label="Abnormität">
                <option value="">keine</option>
                {abnormitaeten(k).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </label>
          </div>
          <p className="text-gray-700">
            {u.erhebung ? <>{u.erhebung.zauber.name} (Grad {u.erhebung.grad}): je Verstärkung {u.erhebung.epJeVerstaerkung} EP{n.nekromant ? ', beliebig oft (Nekromant)' : ', einmal (mehrfach mit Nekromant)'}. </> : null}
            Neue Punkte je Fertigkeit höchstens {u.grenze}. Verstand 0 (frisch erhoben); nur einfache Befehle, ab Verstand 1 auch komplexere (S. 182).
            {u.abnormitaet && <span className="block mt-1">{u.abnormitaet.name}: {u.abnormitaet.daten.beschreibung}</span>}
          </p>

          {u.werte ? <Werte w={alsWertekasten(u.werte)} /> : null}

          <div>
            <h4 className="font-bold text-[#1B365D] mb-1">Steigerung (von 0 an)</h4>
            <div className="grid sm:grid-cols-2 gap-x-6 gap-y-1">
              {ATTRIBUT_KURZ.map(a => (
                <Stufer key={a} label={a} wert={st.attribute?.[a] ?? 0} setzen={v => setzeA(a, v)} kosten={`${attributKosten(st.attribute?.[a] ?? 0)} EP`} />
              ))}
            </div>
            <div className="grid sm:grid-cols-2 gap-x-6 gap-y-1 mt-2">
              {fertigkeitsListe.map(f => (
                <Stufer key={f} label={f === ANGRIFF ? 'Angriff (Waffen)' : k.get(f)?.name ?? f} wert={st.fertigkeiten?.[f] ?? 0} setzen={v => setzeF(f, v)}
                  kosten={`${fertigkeitKosten(st.fertigkeiten?.[f] ?? 0)} EP`} />
              ))}
            </div>
            <div className="flex flex-wrap gap-2 items-center mt-1">
              <select value={fWahl} onChange={ev => setFWahl(ev.target.value)} aria-label="Neue Fertigkeit für Untoten" className={auswahl}>
                <option value="">weitere Fertigkeit …</option>
                {steigerbar.filter(e => !vorhanden.has(e.id)).map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
              <button type="button" disabled={!fWahl} className={knopf} onClick={() => { setzeF(fWahl, 1); setFWahl(''); }}><Plus size={12} />Steigern</button>
            </div>
            {u.freieMeisterschaften.length > 0 && (
              <p className="text-gray-700 mt-1">Freie Meisterschaften: {u.freieMeisterschaften.map(m => `${m.fertigkeit} (Schwelle ${m.schwelle})`).join(', ')} – in der Notiz festhalten.</p>
            )}
            <p className="text-gray-500 mt-1">Fertigkeitspunkte 1–6 je 3 EP, 7–9 je 5 EP …; Attribute 10, 15, … EP. Keine Magieschulen, kein Arkane Kunde / Geschichte und Mythen.</p>
          </div>

          {u.hinweise.length > 0 && <ul className="text-amber-700 list-disc pl-4">{u.hinweise.map((h, i) => <li key={i}>{h}</li>)}</ul>}

          <label className="flex flex-col gap-0.5">Notiz
            <textarea value={b.notiz ?? ''} onChange={ev => aendern({ notiz: ev.target.value || undefined })} rows={2} className={`${auswahl} w-full`} />
          </label>
        </div>
      )}
    </li>
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
    <section className={karte} data-testid="begleiter-untote">
      <div className="flex items-center gap-2 mb-2">
        <Skull size={18} className="text-[#1B365D]" />
        <h3 className="font-bold text-base text-[#1B365D]">Erhobene Untote</h3>
      </div>
      <p className="text-xs text-gray-600 mb-3">
        Der Erhebungszauber bestimmt den Wertesatz; Steigerungen mit den EP aus seiner Verstärkung (Die Magie S. 182–184).
        {!liste.some(x => x.zauber.quelle.paket === 'magie') && ' Weitere Zauber und Abnormitäten im Buchpaket „Die Magie“.'}
      </p>
      {eigene.length > 0 && <ul className="space-y-2 mb-3">{eigene.map(({ b, i }) => <UntotEintrag key={`${b.id}-${i}`} k={k} b={b} index={i} n={n} />)}</ul>}
      <div className="flex flex-wrap gap-2 items-center">
        <select value={zauber} onChange={e => { setZauber(e.target.value); setSatz(''); }} aria-label="Erhebungszauber wählen" className={auswahl}>
          <option value="">Erhebungszauber …</option>
          {liste.map(x => <option key={x.zauber.id} value={x.zauber.id}>{n.zauber.includes(x.zauber.name) ? '✓ ' : ''}{x.zauber.name} (Tod {x.grad})</option>)}
        </select>
        <select value={satz} onChange={e => setSatz(e.target.value)} aria-label="Wertesatz wählen" className={auswahl} disabled={!gew}>
          <option value="">Wertesatz …</option>
          {(gew?.wertesaetze ?? []).map(w => <option key={w.name} value={w.name}>{w.name}{w.id ? '' : ` (Werte: ${w.quelle})`}</option>)}
        </select>
        <button type="button" disabled={!gew || !satz} className={knopf} onClick={() => {
          const w = gew!.wertesaetze.find(x => x.name === satz)!;
          dispatch({ type: 'BEGLEITER_HINZU', payload: { id: w.id ?? `untoter:${w.name}`, art: 'untoter', name: w.name, erhebung: gew!.zauber.id } });
          setSatz('');
        }}><Plus size={12} />Untoten hinzufügen</button>
      </div>
    </section>
  );
};
