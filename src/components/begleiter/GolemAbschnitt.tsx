import { aenderungGesperrt } from '../../fundament/hausregeln';
import React, { useMemo, useState } from 'react';
import { Bot, Plus, X } from 'lucide-react';
import { useCharacter } from '../../context/CharacterContext';
import {
  IMMER_INSTRUKTIONEN, bausteinInfo, bausteine, golemWerte, hoechstens, korpusGK, korpusStufe,
  korpusse, materialInfo, materialien, sonderausstattungen, voraussetzung,
} from '../../regelwerk/golem';
import { alsWertekasten } from '../../regelwerk/modifikationen';
import type { Katalog } from '../../regelwerk/katalog';
import type { Begleiter } from '../../types';
import { Werte, Eintrag, Hinweise, Notiz } from './Wertekasten';
import { Feinschliff } from './Feinschliff';
import { BegleiterVitals, VitalKurz, spielDaten, useBegleiterSpiel } from './BegleiterSpiel';
import { Abschnittstitel, Auswahl, Eingabe, Karte, Knopf, Marke } from '../../fundament';

const ART_TEXT: Record<string, string> = {
  'Zusätzliche Fähigkeit': 'Zusätzliche Fähigkeiten (Schritt 3)', Rolle: 'Rollen (Schritt 4)', Applikation: 'Applikationen',
  Schwachpunkt: 'Schwachpunkte', Instruktion: 'Instruktionen', 'Verfügung': 'Verfügungen',
};

interface Besitzer { golemPunkte: number[]; konstrukteur: boolean; zauber: string[] }

const Titel3: React.FC<{ children: React.ReactNode }> = ({ children }) => <Abschnittstitel als="h3" className="text-[15px]">{children}</Abschnittstitel>;

const BausteinGruppe: React.FC<{ k: Katalog; art: string; b: Begleiter; aendern: (a: Partial<Begleiter>) => void; info?: React.ReactNode }> = ({ k, art, b, aendern, info }) => {
  const [wahl, setWahl] = useState('');
  const [offen, setOffen] = useState<Record<number, boolean>>({});
  const liste = useMemo(() => bausteine(k, art), [k, art]);
  const alle = b.bausteine ?? [];
  const meine = alle.map((id, i) => ({ id, i })).filter(x => bausteinInfo(k.get(x.id)).art === art);
  const namen = new Set(alle.map(i => k.get(i)?.name));
  return (
    <div className="space-y-2">
      <Titel3>{ART_TEXT[art] ?? art}</Titel3>
      {info && <p className="text-leise">{info}</p>}
      {art === 'Instruktion' && <p className="text-leise">Immer: {IMMER_INSTRUKTIONEN.join(', ')}.</p>}
      {meine.length > 0 && (
        <ul className="space-y-1">
          {meine.map(({ id, i }) => {
            const e = k.get(id)!; const bi = bausteinInfo(e);
            return (
              <li key={`${id}-${i}`} className="border-l-2 border-rahmen pl-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <Knopf className="border-transparent! bg-transparent! hover:bg-erhoeht! px-1 font-bold" aria-expanded={!!offen[i]} onClick={() => setOffen(o => ({ ...o, [i]: !o[i] }))}>{e.name}</Knopf>
                  {bi.zuschlag && <Marke klein>Golem {bi.zuschlag}</Marke>}
                  <Knopf nurSymbol className="ml-auto" aria-label={`${e.name} entfernen`} onClick={() => aendern({ bausteine: alle.filter((_, j) => j !== i) })}><X size={16} aria-hidden /></Knopf>
                </div>
                {offen[i] && <p className="mt-1">{bi.beschreibung}</p>}
              </li>
            );
          })}
        </ul>
      )}
      <div className="flex flex-wrap gap-2 items-end">
        <Auswahl beschriftung={`${art} wählen`} beschriftungVerborgen value={wahl} onChange={ev => setWahl(ev.target.value)}>
          <option value="">{art} wählen …</option>
          {liste.filter(e => !(art === 'Instruktion' && IMMER_INSTRUKTIONEN.includes(e.name))).map(e => {
            const n = alle.filter(x => x === e.id).length; const voll = n >= hoechstens(e);
            const v = voraussetzung(e); const fehlt = v && !namen.has(v); const z = bausteinInfo(e).zuschlag;
            return <option key={e.id} value={e.id} disabled={voll}>{e.name}{z ? ` (Golem ${z})` : ''}{voll ? ' – bereits gewählt' : fehlt ? ` – setzt ${v} voraus` : ''}</option>;
          })}
        </Auswahl>
        <Knopf disabled={!wahl} onClick={() => { aendern({ bausteine: [...alle, wahl] }); setWahl(''); }}><Plus size={14} aria-hidden />Hinzufügen</Knopf>
      </div>
      {wahl && <p>{bausteinInfo(k.get(wahl)).beschreibung}</p>}
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
    <Eintrag titel={titel} offen={offen} umschalten={() => setOffen(o => !o)} vor={spiel.modale}
      onEntfernen={() => dispatch({ type: 'BEGLEITER_ENTFERNEN', payload: { index } })}
      marken={<>
        <VitalKurz spiel={spiel} daten={daten} />
        <Marke klein>Golem {g.stufe}</Marke>
        {b.material && <span>{k.get(b.material)?.name}</span>}
        <span>{b.golemRessource ? 'Ressource Golem' : `${g.preis} L`}</span>
        {hinweise.length > 0 && <Marke klein ton="erschoepft" title={hinweise.join('\n')}>{hinweise.length} Hinweis{hinweise.length > 1 ? 'e' : ''}</Marke>}
        {!g.korpus && <Marke klein ton="erschoepft">nicht im Katalog („Die Magie“ geladen?)</Marke>}
      </>}>
      {g.korpus && <>
        <div className="flex flex-wrap gap-3 items-end">
          <Eingabe beschriftung="Rufname" value={b.rufname ?? ''} onChange={ev => aendern({ rufname: ev.target.value || undefined })} placeholder="Name" />
          <Auswahl beschriftung="Golemmaterial (Schritt 2)" value={b.material ?? ''} onChange={ev => aendern({ material: ev.target.value || undefined })}>
            <option value="">Material wählen …</option>
            {materialien(k).map(m => <option key={m.id} value={m.id}>{m.name} ({materialInfo(m)})</option>)}
          </Auswahl>
          <label className="flex items-center gap-2 min-h-11" title="Großer Ritus: dauerhaft animiert, eine Applikation je Stufe (Die Magie S. 203)">
            <input type="checkbox" className="w-5 h-5 accent-gold" checked={!!b.golemRessource} onChange={ev => aendern({ golemRessource: ev.target.checked || undefined })} />
            über Ressource Golem (Großer Ritus)
          </label>
        </div>

        <p>
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
          <div className="space-y-2">
            <Titel3>Sonderausstattung (eine je zwei Stufen)</Titel3>
            <div className="flex flex-wrap gap-3">
              {Array.from({ length: g.sonderausstattungPlaetze }, (_, i) => (
                <Auswahl key={i} beschriftung={`Sonderausstattung ${i + 1}`} value={b.sonderausstattung?.[i] ?? ''}
                  onChange={ev => { const l = [...(b.sonderausstattung ?? [])]; l[i] = ev.target.value; aendern({ sonderausstattung: l }); }}>
                  <option value="">wählen …</option>
                  {sa.map(z => (
                    <optgroup key={z.material} label={z.material}>
                      {z.optionen.map(o => <option key={o} value={o}>{o}</option>)}
                    </optgroup>
                  ))}
                </Auswahl>
              ))}
            </div>
          </div>
        )}

        {(g.wahlen.length > 0 || g.feinschliff.length > 0) && (
          <div className="space-y-2">
            <Titel3>Feinschliff (Schritt 5)</Titel3>
            {g.wahlen.length > 0 && <Feinschliff k={k} b={b} wahlen={g.wahlen} fertigkeiten={g.werte?.fertigkeiten ?? []} aendern={aendern} />}
            {g.feinschliff.length > 0 && (
              <div><span className="text-leise">Für die Spielleitung:</span><ul className="list-disc pl-6">{g.feinschliff.map((t, i) => <li key={i}>{t}</li>)}</ul></div>
            )}
          </div>
        )}

        <Hinweise liste={hinweise} />
        <Notiz b={b} aendern={aendern} />
      </>}
    </Eintrag>
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
    <Karte data-testid="begleiter-golems" className="space-y-3">
      <div className="flex items-center gap-2">
        <Bot size={18} aria-hidden />
        <Abschnittstitel>Golems</Abschnittstitel>
      </div>
      {liste.length === 0 ? (
        <p className="text-sm text-leise">Der Golem-Baukasten steht im Buchpaket „Die Magie“ (Einstellungen → Regelpakete).</p>
      ) : (
        <>
          <p className="text-sm text-leise">
            Baukasten nach Die Magie S. 205–207: Korpus, Material, Zusätzliche Fähigkeiten, Rollen, Feinschliff. Gekauft oder selbst gebaut
            (Kleiner Ritus mit Animierungszauber) oder dauerhaft über die Ressource Golem (1 Punkt je Stufe).
            {besitzer.golemPunkte.length > 0 && <> Ressource Golem: {besitzer.golemPunkte.join(', ')}.</>}
          </p>
          {eigene.length > 0 && <ul className="space-y-3">{eigene.map(({ b, i }) => <GolemEintrag key={`${b.id}-${i}`} k={k} b={b} index={i} besitzer={besitzer} />)}</ul>}
          <div className="flex flex-wrap gap-2 items-end">
            <Auswahl beschriftung="Korpus wählen" beschriftungVerborgen value={wahl} onChange={e => setWahl(e.target.value)}>
              <option value="">Korpus wählen …</option>
              {liste.map(e => <option key={e.id} value={e.id}>{e.name} (Golem {korpusStufe(e)}, GK {korpusGK(e)})</option>)}
            </Auswahl>
            <Knopf art="sekundaer" disabled={!wahl}
              onClick={() => { dispatch({ type: 'BEGLEITER_HINZU', payload: { id: wahl, art: 'golem', name: k.get(wahl)!.name } }); setWahl(''); }}>
              <Plus size={14} aria-hidden />Golem hinzufügen
            </Knopf>
          </div>
        </>
      )}
    </Karte>
  );
};
