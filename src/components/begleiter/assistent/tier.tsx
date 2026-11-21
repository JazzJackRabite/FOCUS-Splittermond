/** Assistent: Tier (Tiergefährte, Reittier, Vertrauter, eigene Kreatur); Abrichtungen und Potenzial aus „Bestienmeister“ */
import React, { useMemo, useState } from 'react';
import { BookOpen, Hammer, Plus, X } from 'lucide-react';
import { regelverstoss } from '../../../fundament/hausregeln';
import {
  abrichtungen as alleAbrichtungen, alleTiere, kreaturStufe, potenzial, potenzialVerbraucht, pruefeAbrichtung, tierTraeger, TIER_QUALITAET,
} from '../../../regelwerk/begleiter';
import { baukastenArt, basen, wesenBaukastenWerte } from '../../../regelwerk/wesenBaukasten';
import type { Katalog } from '../../../regelwerk/katalog';
import type { Ergebnis } from '../../../regelwerk/typen';
import { Auswahl, Eingabe, Knopf, Marke } from '../../../fundament';
import { Hinweise } from '../Wertekasten';
import { WesenBaukasten } from '../WesenBaukasten';
import { freieKreatur } from '../besitzer';
import { Erklaerung, UEBERSICHT, Wahlkarte } from './teile';
import type { Schritt, SchrittProps } from './typen';

const Herkunft: React.FC<SchrittProps> = ({ k, b, aendern, besitzer, alle, index }) => {
  const tiere = useMemo(() => alleTiere(k), [k]);
  const basisListe = useMemo(() => basen(k, 'kreatur'), [k]);
  const [weg, setWeg] = useState<'katalog' | 'bauen'>(b.bausteine ? 'bauen' : 'katalog');
  const waehle = (id: string, bauen: boolean) => {
    const e = k.get(id);
    if (!e) { aendern({ id: '', name: '', kreatur: undefined, bausteine: undefined }); return; }
    const frei = freieKreatur(besitzer, alle, kreaturStufe(e), index);
    aendern({ id: e.id, name: bauen ? `Eigene Kreatur (${e.name})` : e.name, kreatur: frei, bausteine: bauen ? [] : undefined, abrichtungen: undefined });
  };
  return (
    <div className="space-y-4">
      <Erklaerung>
        Ressource Kreatur: {besitzer.kreatur.length ? besitzer.kreatur.join(', ') : 'keine'} – ein Tiergefährte je Ressource, höchstens mit „Kreatur N“ (GRW S. 78).
        Reittiere und gekaufte Tiere brauchen keine Ressource.
      </Erklaerung>
      <div className="grid sm:grid-cols-2 gap-3">
        <Wahlkarte gewaehlt={weg === 'katalog'} onClick={() => { setWeg('katalog'); if (b.bausteine) waehle('', false); }} symbol={<BookOpen size={20} />}
          titel="Tier aus dem Katalog" text="Ein Tier mit seinen Werten aus dem Grundregelwerk oder einem Grimoire." />
        <Wahlkarte gewaehlt={weg === 'bauen'} onClick={() => { setWeg('bauen'); if (!b.bausteine) waehle('', true); }} symbol={<Hammer size={20} />}
          disabled={!basisListe.length} hinweis={basisListe.length ? undefined : 'Der Kreatur-Baukasten steht im Grimoire „Bestienmeister“.'}
          titel="Eigene Kreatur bauen" text="Aus einer Basis und Modulen (Bestienmeister)." />
      </div>
      {weg === 'katalog' ? (
        <Auswahl beschriftung="Tier wählen" value={b.bausteine ? '' : b.id} onChange={e => waehle(e.target.value, false)}>
          <option value="">Tier wählen …</option>
          {tiere.map(t => (
            <option key={t.id} value={t.id}>
              {t.name} ({[t.stufe ? `Kreatur ${t.stufe}` : null, t.typus.includes('Reittier') ? 'Reittier' : null, t.quelle !== 'GRW' ? t.quelle : null].filter(Boolean).join(', ') || 'Tier'})
            </option>
          ))}
        </Auswahl>
      ) : (
        <Auswahl beschriftung="Basis der Kreatur" value={b.bausteine ? b.id : ''} onChange={e => waehle(e.target.value, true)}>
          <option value="">Basis wählen …</option>
          {basisListe.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}
        </Auswahl>
      )}
    </div>
  );
};

const Grundangaben: React.FC<SchrittProps> = ({ k, b, aendern, besitzer }) => (
  <div className="space-y-4">
    {!alleAbrichtungen(k).length && <Erklaerung>Abrichtungen und Potenzial stehen im Grimoire „Bestienmeister“ (Einstellungen → Regelpakete).</Erklaerung>}
    <div className="grid sm:grid-cols-2 gap-3">
      <Eingabe beschriftung="Rufname" value={b.rufname ?? ''} onChange={ev => aendern({ rufname: ev.target.value || undefined })} placeholder={b.name} />
      <Auswahl beschriftung="Ressource Kreatur" value={b.kreatur ?? 0} onChange={ev => aendern({ kreatur: Number(ev.target.value) || undefined })}>
        <option value={0}>keine (gekauft, gezähmt …)</option>
        {[...new Set([...besitzer.kreatur, b.kreatur ?? 0])].filter(x => x > 0).sort((x, y) => x - y).map(x => <option key={x} value={x}>Kreatur {x}</option>)}
      </Auswahl>
      <Auswahl beschriftung="Qualität" value={b.qualitaet ?? 1} onChange={ev => aendern({ qualitaet: Number(ev.target.value) > 1 ? Number(ev.target.value) : undefined })}>
        {TIER_QUALITAET.map(q => <option key={q.potenzial} value={q.potenzial}>{q.name} (Potenzial {q.potenzial})</option>)}
      </Auswahl>
    </div>
    <label className={`flex items-center gap-2 min-h-11 ${besitzer.tiervertrauter || b.vertrauter ? '' : 'text-leise'}`} title={besitzer.tiervertrauter ? undefined : 'Erfordert die Stärke Tiervertrauter'}>
      <input type="checkbox" className="w-5 h-5 accent-gold" checked={!!b.vertrauter} disabled={!besitzer.tiervertrauter && !b.vertrauter} onChange={ev => aendern({ vertrauter: ev.target.checked || undefined })} />
      Vertrauter (Stärke Tiervertrauter)
    </label>
  </div>
);

const Baukasten: React.FC<SchrittProps> = ({ k, b, aendern }) => <WesenBaukasten k={k} b={b} w={wesenBaukastenWerte(k, b)} aendern={aendern} />;

/** Ergebnis einer Voraussetzung als Marke: Wort und Rahmen, nicht nur Farbe */
const Status: React.FC<{ e: Ergebnis; text?: string }> = ({ e, text }) => (
  e === true ? <Marke ton="unverletzt" klein>erfüllt</Marke>
    : e === false ? <Marke ton="erschoepft" klein title={text ? `Voraussetzung: ${text}` : undefined}>nicht erfüllt</Marke>
      : <Marke klein title={text ? `Spielleitung: ${text}` : undefined}>Spielleitung</Marke>
);
const ergebnisWort = (e: Ergebnis) => (e === true ? '' : e === false ? ' – Voraussetzung fehlt' : ' – Spielleitung');

const Abrichtungen: React.FC<SchrittProps> = ({ k, b, aendern, besitzer }) => {
  const liste = useMemo(() => alleAbrichtungen(k), [k]);
  const [wahl, setWahl] = useState('');
  const [text, setText] = useState<Record<number, boolean>>({});
  const gewaehlt = b.abrichtungen ?? [];
  const pot = potenzial(k, b, besitzer.msIds);
  const verbraucht = potenzialVerbraucht(liste, gewaehlt);
  const info = new Map(liste.map(a => [a.id, a]));
  const pruefung = gewaehlt.map((id, i) => {
    const a = info.get(id); if (!a) return 'offen' as Ergebnis;
    const n = gewaehlt.slice(0, i).filter(x => x === id).length;
    return pruefeAbrichtung(k, a, besitzer.char, tierTraeger(k, b, i), n);
  });
  const angebot = liste.map(a => {
    const n = gewaehlt.filter(x => x === a.id).length;
    const grenze = a.mehrfachText && /pro (hg|heldengrad) des besitzers/i.test(a.mehrfachText) ? besitzer.heldengrad : a.hoechstens;
    return { a, voll: n >= grenze, ergebnis: pruefeAbrichtung(k, a, besitzer.char, tierTraeger(k, b), n) };
  });
  const gruppen = [...new Set(liste.map(a => a.gruppe))];
  const x = angebot.find(y => y.a.id === wahl);
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <Marke ton={verbraucht > pot.gesamt ? 'schaden' : 'neutral'}>Potenzial {verbraucht}/{pot.gesamt}</Marke>
        <span className="text-sm text-leise">{pot.posten.map(p => `${p.text} ${p.wert}`).join(' + ')} (Bestienmeister S. 15)</span>
      </div>
      {verbraucht > pot.gesamt && <Hinweise liste={['Mehr Abrichtungen, als das Potenzial erlaubt.']} />}
      {gewaehlt.length > 0 ? (
        <ul className="space-y-2">
          {gewaehlt.map((id, i) => {
            const a = info.get(id);
            return (
              <li key={`${id}-${i}`} className="border-l-2 border-rahmen pl-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <Knopf className="border-transparent! bg-transparent! hover:bg-erhoeht! px-1 font-bold" aria-expanded={!!text[i]} onClick={() => setText(t => ({ ...t, [i]: !t[i] }))}>
                    {a?.name ?? k.get(id)?.name ?? id}
                  </Knopf>
                  <Status e={pruefung[i]} text={a?.voraussetzung?.text} />
                  <span className="text-leise text-sm">{a ? `${a.grundausbildung ? 'Grundausbildung, ' : ''}${a.kosten} P.` : 'nicht im Katalog'}</span>
                  <Knopf nurSymbol className="ml-auto" aria-label={`Abrichtung ${a?.name ?? id} entfernen`} onClick={() => aendern({ abrichtungen: gewaehlt.filter((_, j) => j !== i) })}><X size={16} aria-hidden /></Knopf>
                </div>
                {text[i] && a && <p className="mt-1 text-sm">{a.beschreibung}{a.voraussetzung ? <span className="block text-leise">Voraussetzung: {a.voraussetzung.text}</span> : null}</p>}
              </li>
            );
          })}
        </ul>
      ) : <Erklaerung>Noch keine Abrichtungen. Abrichtungen lassen sich auch später über „Bearbeiten“ ergänzen.</Erklaerung>}
      <div className="flex flex-wrap gap-2 items-end">
        <Auswahl beschriftung="Abrichtung wählen" value={wahl} onChange={ev => setWahl(ev.target.value)}>
          <option value="">Abrichtung wählen …</option>
          {gruppen.map(g => (
            <optgroup key={g} label={g}>
              {angebot.filter(y => y.a.gruppe === g).map(({ a, voll, ergebnis }) => (
                <option key={a.id} value={a.id} disabled={voll}>
                  {a.name} ({a.kosten} P.{a.quelle !== 'Bestienmeister' ? `, ${a.quelle}` : ''}){voll ? ' – bereits gewählt' : ergebnisWort(ergebnis)}
                </option>
              ))}
            </optgroup>
          ))}
        </Auswahl>
        <Knopf art="sekundaer" disabled={!wahl} onClick={() => {
          if (x?.ergebnis === false && regelverstoss('Die Voraussetzung dieser Abrichtung ist nicht erfüllt.')) return;
          aendern({ abrichtungen: [...gewaehlt, wahl] }); setWahl('');
        }}><Plus size={14} aria-hidden />Abrichtung hinzufügen</Knopf>
      </div>
      {x && (
        <p className="text-sm m-0">
          {x.a.beschreibung}
          {x.a.voraussetzung && <span className="block text-leise">
            Voraussetzung: {x.a.voraussetzung.text}{x.ergebnis === false ? ' – nicht erfüllt' : x.ergebnis === 'offen' ? ' – Entscheidung der Spielleitung' : ''}
          </span>}
        </p>
      )}
      <p className="text-xs text-leise m-0">Boni aus Abrichtungen sind im Wertekasten nicht eingerechnet: Die Einträge im Paket haben dafür noch keine Zahlenwerte.</p>
    </div>
  );
};

export function tierSchritte(k: Katalog, b: { id: string; bausteine?: string[] }): Schritt[] {
  const e = b.id ? k.get(b.id) : undefined;
  const gebaut = !!b.bausteine || !!(e && baukastenArt(e));
  return [
    { id: 'herkunft', titel: 'Tier wählen', inhalt: Herkunft, nurNeu: true, bereit: x => !!x.id },
    { id: 'grund', titel: 'Grundangaben', inhalt: Grundangaben },
    ...(gebaut ? [{ id: 'baukasten', titel: 'Module', inhalt: Baukasten }] : []),
    ...(alleAbrichtungen(k).length ? [{ id: 'abrichtungen', titel: 'Abrichtungen', inhalt: Abrichtungen }] : []),
    UEBERSICHT,
  ];
}
