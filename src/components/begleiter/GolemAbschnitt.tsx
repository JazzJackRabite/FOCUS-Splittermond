import { aenderungGesperrt } from '../../fundament/hausregeln';
import React, { useMemo, useState } from 'react';
import { Bot, Plus, Trash2, ChevronDown, ChevronRight, X, AlertTriangle } from 'lucide-react';
import { useCharacter } from '../../context/CharacterContext';
import {
  IMMER_INSTRUKTIONEN, bausteine, golemWerte, hoechstens, korpusStufe, korpusse, materialien, sonderausstattungen, voraussetzung,
} from '../../regelwerk/golem';
import { alsWertekasten } from '../../regelwerk/modifikationen';
import type { Katalog } from '../../regelwerk/katalog';
import type { Begleiter } from '../../types';
import { Werte, auswahl, karte, knopf } from './Wertekasten';
import { BegleiterVitals, VitalKurz, spielDaten, useBegleiterSpiel } from './BegleiterSpiel';

const ART_TEXT: Record<string, string> = {
  'Zusätzliche Fähigkeit': 'Zusätzliche Fähigkeiten (Schritt 3)', Rolle: 'Rollen (Schritt 4)', Applikation: 'Applikationen',
  Schwachpunkt: 'Schwachpunkte', Instruktion: 'Instruktionen', 'Verfügung': 'Verfügungen',
};

interface Besitzer { golemPunkte: number[]; konstrukteur: boolean; zauber: string[] }

const BausteinGruppe: React.FC<{ k: Katalog; art: string; b: Begleiter; aendern: (a: Partial<Begleiter>) => void; info?: React.ReactNode }> = ({ k, art, b, aendern, info }) => {
  const [wahl, setWahl] = useState('');
  const [offen, setOffen] = useState<Record<number, boolean>>({});
  const liste = useMemo(() => bausteine(k, art), [k, art]);
  const alle = b.bausteine ?? [];
  const meine = alle.map((id, i) => ({ id, i })).filter(x => k.get(x.id)?.daten.baustein === art);
  const namen = new Set(alle.map(i => k.get(i)?.name));
  return (
    <div>
      <h4 className="font-bold text-[#1B365D] mb-1">{ART_TEXT[art] ?? art}</h4>
      {info && <p className="text-gray-600 mb-1">{info}</p>}
      {art === 'Instruktion' && <p className="text-gray-600 mb-1">Immer: {IMMER_INSTRUKTIONEN.join(', ')}.</p>}
      {meine.length > 0 && (
        <ul className="space-y-0.5 mb-1">
          {meine.map(({ id, i }) => {
            const e = k.get(id)!;
            return (
              <li key={`${id}-${i}`} className="border-l-2 border-[#C5A059] pl-2">
                <div className="flex items-center gap-1">
                  <button type="button" className="font-bold text-left cursor-pointer" onClick={() => setOffen(o => ({ ...o, [i]: !o[i] }))}>{e.name}</button>
                  {e.daten.stufe_merkmal_golem && <span className="text-gray-500">Golem {e.daten.stufe_merkmal_golem}</span>}
                  <button type="button" aria-label={`${e.name} entfernen`} onClick={() => aendern({ bausteine: alle.filter((_, j) => j !== i) })}
                    className="ml-auto p-0.5 rounded hover:bg-black/5 hover:text-red-700 cursor-pointer"><X size={11} /></button>
                </div>
                {offen[i] && <p className="text-gray-700">{e.daten.beschreibung}</p>}
              </li>
            );
          })}
        </ul>
      )}
      <div className="flex flex-wrap gap-2 items-center">
        <select value={wahl} onChange={ev => setWahl(ev.target.value)} aria-label={`${art} wählen`} className={auswahl}>
          <option value="">{art} wählen …</option>
          {liste.filter(e => !(art === 'Instruktion' && IMMER_INSTRUKTIONEN.includes(e.name))).map(e => {
            const n = alle.filter(x => x === e.id).length; const voll = n >= hoechstens(e);
            const v = voraussetzung(e); const fehlt = v && !namen.has(v);
            return <option key={e.id} value={e.id} disabled={voll}>{fehlt ? '✗ ' : ''}{e.name}{e.daten.stufe_merkmal_golem ? ` (Golem ${e.daten.stufe_merkmal_golem})` : ''}{voll ? ' – bereits gewählt' : ''}</option>;
          })}
        </select>
        <button type="button" disabled={!wahl} className={knopf} onClick={() => { aendern({ bausteine: [...alle, wahl] }); setWahl(''); }}><Plus size={12} />Hinzufügen</button>
      </div>
      {wahl && <p className="text-gray-700 mt-1">{k.get(wahl)?.daten.beschreibung}</p>}
    </div>
  );
};

const GolemEintrag: React.FC<{ k: Katalog; b: Begleiter; index: number; besitzer: Besitzer }> = ({ k, b, index, besitzer }) => {
  const { dispatch } = useCharacter();
  const [offen, setOffen] = useState(false);
  const g = golemWerte(k, b);
  const aendern = (aenderung: Partial<Begleiter>) => {
    if (aenderungGesperrt(g.verstoesse, golemWerte(k, { ...b, ...aenderung }).verstoesse)) return;
    dispatch({ type: 'BEGLEITER_AENDERN', payload: { index, aenderung } });
  };
  const sa = sonderausstattungen(k);
  const titel = b.rufname ? `${b.rufname} (Golem, ${b.name})` : `Golem (${b.name})`;
  const kennt = g.animierung ? besitzer.zauber.includes(g.animierung.name) : false;
  const hinweise = [...g.hinweise];
  const wk = g.werte ? alsWertekasten(g.werte) : null;
  const daten = spielDaten(b, wk);
  const spiel = useBegleiterSpiel(b, index, daten);
  if (b.golemRessource && !besitzer.golemPunkte.some(p => p >= g.stufe)) hinweise.push(`Ressource Golem ${g.stufe} nötig (1 Punkt je Stufe)`);

  return (
    <li className="border border-[#d1c4b0] rounded-lg p-2 bg-white">
      {spiel.modale}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <button type="button" className="flex items-center gap-1 text-sm font-bold text-[#1B365D] cursor-pointer" onClick={() => setOffen(o => !o)} aria-expanded={offen}>
          {offen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}{titel}
        </button>
        <span className="flex items-center gap-2 text-xs text-gray-500 flex-wrap">
          <VitalKurz spiel={spiel} daten={daten} />
          <span className="px-1.5 rounded bg-[#ebdcc3] text-[#1B365D] font-bold">Golem {g.stufe}</span>
          {b.material && <span>{k.get(b.material)?.name}</span>}
          <span>{b.golemRessource ? 'Ressource Golem' : `${g.preis} L`}</span>
          {hinweise.length > 0 && <span className="text-amber-700 flex items-center gap-0.5" title={hinweise.join('\n')}><AlertTriangle size={12} />{hinweise.length}</span>}
          {!g.korpus && <span className="text-amber-700">nicht im Katalog („Die Magie“ geladen?)</span>}
          <button type="button" aria-label={`${titel} entfernen`} onClick={() => dispatch({ type: 'BEGLEITER_ENTFERNEN', payload: { index } })}
            className="p-1 rounded hover:bg-black/5 hover:text-red-700 cursor-pointer"><Trash2 size={14} /></button>
        </span>
      </div>

      {offen && g.korpus && (
        <div className="mt-2 space-y-3 text-xs">
          <div className="flex flex-wrap gap-3 items-end">
            <label className="flex flex-col gap-0.5">Rufname
              <input value={b.rufname ?? ''} onChange={ev => aendern({ rufname: ev.target.value || undefined })} className={auswahl} placeholder="Name" />
            </label>
            <label className="flex flex-col gap-0.5">Material (Schritt 2)
              <select value={b.material ?? ''} onChange={ev => aendern({ material: ev.target.value || undefined })} className={auswahl} aria-label="Golemmaterial">
                <option value="">Material wählen …</option>
                {materialien(k).map(m => <option key={m.id} value={m.id}>{m.name} ({m.daten.felder?.modifikationen}; Schwachpunkt {m.daten.felder?.schwachpunkt})</option>)}
              </select>
            </label>
            <label className="flex items-center gap-1" title="Großer Ritus: dauerhaft animiert, eine Applikation je Stufe (Die Magie S. 203)">
              <input type="checkbox" checked={!!b.golemRessource} onChange={ev => aendern({ golemRessource: ev.target.checked || undefined })} />
              über Ressource Golem (Großer Ritus)
            </label>
          </div>

          <p className="text-gray-700">
            <strong>Stufe Golem {g.stufe}</strong> = {g.stufePosten.map(p => `${p.text} ${p.wert}`).join(' + ')}.{' '}
            {g.animierung ? <>Kleiner Ritus: <strong>{g.animierung.name}</strong>{kennt ? ' (bekannt)' : ''}. </> : 'Kein Animierungszauber für diese Stufe. '}
            Konstruktion: Handwerk/Edelhandwerk gegen {g.konstruktion.schwierigkeit}, {g.konstruktion.fortschritt} Fortschrittspunkte
            {besitzer.konstrukteur ? '' : ' (Meisterschaft Konstrukteur nötig)'}; Unterweisung (Arkane Kunde) ebenso.{' '}
            {!b.golemRessource && <>Kaufpreis {g.preis} L.</>}
            {g.materialSchwachpunkt && <> Schwachpunkt des Materials: {g.materialSchwachpunkt}.</>}
          </p>

          {wk && <BegleiterVitals spiel={spiel} daten={daten} />}
          {wk && <Werte w={wk} aktionen={spiel.aktionen} />}

          <BausteinGruppe k={k} art="Zusätzliche Fähigkeit" b={b} aendern={aendern} />
          <BausteinGruppe k={k} art="Rolle" b={b} aendern={aendern} info="Mehrfach wählbar und kombinierbar; Kämpfer setzt Aggressiv voraus." />
          <BausteinGruppe k={k} art="Applikation" b={b} aendern={aendern}
            info={<>Gewählt {g.gewaehlt.Applikation.length}, frei {g.applikationenFrei}{b.golemRessource ? ' (eine je Stufe)' : ' (zwei automatisch)'}; jede weitere: +1 Schwierigkeit, +3 Fortschrittspunkte und ein weiterer Schwachpunkt.</>} />
          <BausteinGruppe k={k} art="Schwachpunkt" b={b} aendern={aendern} info={<>Nötig: {g.schwachpunkteNoetig} zusätzlich zum Material.</>} />
          <BausteinGruppe k={k} art="Instruktion" b={b} aendern={aendern} info={<>Implementierbar: {g.instruktionenErlaubt} (eine, weitere über „Zusätzliche Instruktion“).</>} />
          <BausteinGruppe k={k} art="Verfügung" b={b} aendern={aendern}
            info={g.verfuegungenAktiv !== null ? <>Aktiv höchstens {g.verfuegungenAktiv} (Stufe des Merkmals Golem, mind. 1).</> : 'Beim Kleinen Ritus über die Verstärkung des Animierungszaubers.'} />

          {g.sonderausstattungPlaetze > 0 && (
            <div>
              <h4 className="font-bold text-[#1B365D] mb-1">Sonderausstattung (eine je zwei Stufen)</h4>
              <div className="flex flex-wrap gap-2">
                {Array.from({ length: g.sonderausstattungPlaetze }, (_, i) => (
                  <select key={i} value={b.sonderausstattung?.[i] ?? ''} aria-label={`Sonderausstattung ${i + 1}`} className={auswahl}
                    onChange={ev => { const l = [...(b.sonderausstattung ?? [])]; l[i] = ev.target.value; aendern({ sonderausstattung: l }); }}>
                    <option value="">wählen …</option>
                    {sa.map(z => (
                      <optgroup key={z.material} label={z.material}>
                        {z.optionen.map(o => <option key={o} value={o}>{o}</option>)}
                      </optgroup>
                    ))}
                  </select>
                ))}
              </div>
            </div>
          )}

          {g.feinschliff.length > 0 && (
            <div>
              <h4 className="font-bold text-[#1B365D] mb-1">Feinschliff (Schritt 5, Spielleitung)</h4>
              <ul className="list-disc pl-4 text-gray-700">{g.feinschliff.map((t, i) => <li key={i}>{t}</li>)}</ul>
              <p className="text-gray-600">Freie Fertigkeitspunkte nur auf allgemeine Fertigkeiten, die der Golem besitzt; freie Meisterschaften bis Schwelle {g.meisterschaftSchwelle}.</p>
            </div>
          )}

          {hinweise.length > 0 && <ul className="text-amber-700 list-disc pl-4">{hinweise.map((h, i) => <li key={i}>{h}</li>)}</ul>}

          <label className="flex flex-col gap-0.5">Notiz
            <textarea value={b.notiz ?? ''} onChange={ev => aendern({ notiz: ev.target.value || undefined })} rows={2} className={`${auswahl} w-full`} />
          </label>
        </div>
      )}
    </li>
  );
};

/** Golems: Baukasten aus „Die Magie“ (S. 197–207); ohne das Buchpaket nur ein Hinweis */
export const GolemAbschnitt: React.FC<{ k: Katalog }> = ({ k }) => {
  const { state, dispatch } = useCharacter();
  const [wahl, setWahl] = useState('');
  const liste = useMemo(() => korpusse(k), [k]);
  const besitzer: Besitzer = useMemo(() => ({
    golemPunkte: state.resourcesList.filter(r => /^Golem\b/.test(r.name)).map(r => Number(r.level) || 0),
    konstrukteur: Object.values(state.masteries ?? {}).flat().some(m => /^Konstrukteur\b/.test(m.name)),
    zauber: (state.spellsList ?? []).map(s => s.name),
  }), [state.resourcesList, state.masteries, state.spellsList]);
  const eigene = (state.begleiter ?? []).map((b, i) => ({ b, i })).filter(x => x.b.art === 'golem');

  return (
    <section className={karte} data-testid="begleiter-golems">
      <div className="flex items-center gap-2 mb-2">
        <Bot size={18} className="text-[#1B365D]" />
        <h3 className="font-bold text-base text-[#1B365D]">Golems</h3>
      </div>
      {liste.length === 0 ? (
        <p className="text-xs text-gray-600">Der Golem-Baukasten steht im Buchpaket „Die Magie“ (Einstellungen → Regelpakete).</p>
      ) : (
        <>
          <p className="text-xs text-gray-600 mb-3">
            Baukasten nach Die Magie S. 205–207: Korpus, Material, Zusätzliche Fähigkeiten, Rollen, Feinschliff. Gekauft oder selbst gebaut
            (Kleiner Ritus mit Animierungszauber) oder dauerhaft über die Ressource Golem (1 Punkt je Stufe).
            {besitzer.golemPunkte.length > 0 && <> Ressource Golem: {besitzer.golemPunkte.join(', ')}.</>}
          </p>
          {eigene.length > 0 && <ul className="space-y-2 mb-3">{eigene.map(({ b, i }) => <GolemEintrag key={`${b.id}-${i}`} k={k} b={b} index={i} besitzer={besitzer} />)}</ul>}
          <div className="flex flex-wrap gap-2 items-center">
            <select value={wahl} onChange={e => setWahl(e.target.value)} aria-label="Korpus wählen" className={auswahl}>
              <option value="">Korpus wählen …</option>
              {liste.map(e => <option key={e.id} value={e.id}>{e.name} (Golem {korpusStufe(e)}, GK {e.daten.werte?.abgeleitete_werte?.GK})</option>)}
            </select>
            <button type="button" disabled={!wahl} className={knopf}
              onClick={() => { dispatch({ type: 'BEGLEITER_HINZU', payload: { id: wahl, art: 'golem', name: k.get(wahl)!.name } }); setWahl(''); }}>
              <Plus size={12} />Golem hinzufügen
            </button>
          </div>
        </>
      )}
    </section>
  );
};

