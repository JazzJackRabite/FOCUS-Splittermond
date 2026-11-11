import { regelverstoss } from '../../fundament/hausregeln';
import React, { useMemo, useState } from 'react';
import { PawPrint, Plus, X } from 'lucide-react';
import { useCharacter } from '../../context/CharacterContext';
import {
  abrichtungen as alleAbrichtungen, alleTiere, istReittier, kreaturStufe, potenzial, potenzialVerbraucht, pruefeAbrichtung,
  tierTraeger, TIER_QUALITAET, wertekasten, type AbrichtungsInfo,
} from '../../regelwerk/begleiter';
import { bedingungsCharakter, meisterschaftId } from '../../regelwerk/bruecke';
import type { BedingungsCharakter } from '../../regelwerk/bedingungen';
import type { Katalog } from '../../regelwerk/katalog';
import type { Ergebnis } from '../../regelwerk/typen';
import type { Begleiter } from '../../types';
import { HELDENGRADE } from '../../data/rules';
import { Werte, Eintrag, Hinweise, Notiz } from './Wertekasten';
import { Abschnittstitel, Auswahl, Eingabe, Karte, Knopf, Marke } from '../../fundament';
import { BegleiterVitals, VitalKurz, spielDaten, useBegleiterSpiel } from './BegleiterSpiel';

interface Fuehrer {
  char: BedingungsCharakter; msIds: string[]; heldengrad: number;
  kreatur: number[]; tiervertrauter: boolean;
}

/** Tierführer: Bedingungs-Charakter, Meisterschafts-IDs, Heldengrad, Ressourcen Kreatur */
function useFuehrer(k: Katalog): Fuehrer {
  const { state, calc } = useCharacter();
  return useMemo(() => {
    const ms = Object.entries(state.masteries ?? {}).flatMap(([skill, l]) => l.map(m => ({ ...m, skill: m.skill || skill })));
    const fertigkeiten: Record<string, number> = {};
    for (const s of Object.keys(state.skillsBase ?? {})) fertigkeiten[s] = calc?.getSkillValue ? calc.getSkillValue(s) : (state.skillsBase[s] ?? 0);
    const char = bedingungsCharakter(k, {
      meisterschaften: ms, fertigkeiten, ressourcen: state.resourcesList, zauber: state.spellsList, staerken: state.strengthsList, rasse: state.race,
    });
    const msIds = ms.map(m => meisterschaftId(k, m.name, m.skill, (m as { regelId?: string }).regelId)).filter((x): x is string => !!x);
    const hg = calc?.heldengrad ? HELDENGRADE.indexOf(calc.heldengrad) + 1 : 1;
    const kreatur = state.resourcesList.filter(r => /^Kreatur\b/.test(r.name)).map(r => Number(r.level) || 0).sort((a, b) => b - a);
    const tiervertrauter = state.strengthsList.some(s => /^Tiervertrauter\b/.test(s.name));
    return { char, msIds, heldengrad: Math.max(1, hg), kreatur, tiervertrauter };
  }, [k, state.masteries, state.skillsBase, state.resourcesList, state.spellsList, state.strengthsList, state.race, calc]);
}

/** Passen die Kreatur-Punkte der Tiere zu den Ressourcen? (jede Ressource Kreatur trägt ein Tier) */
export function kreaturZuordnung(ressourcen: number[], tiere: number[]): boolean {
  const r = [...ressourcen].sort((a, b) => b - a); const t = tiere.filter(x => x > 0).sort((a, b) => b - a);
  return t.length <= r.length && t.every((x, i) => x <= r[i]);
}

/** Ergebnis einer Voraussetzung als Marke: Wort und Rahmen, nicht nur Farbe */
const Status: React.FC<{ e: Ergebnis; text?: string }> = ({ e, text }) => (
  e === true ? <Marke ton="unverletzt" klein>erfüllt</Marke>
    : e === false ? <Marke ton="erschoepft" klein title={text ? `Voraussetzung: ${text}` : undefined}>nicht erfüllt</Marke>
      : <Marke klein title={text ? `Spielleitung: ${text}` : undefined}>Spielleitung</Marke>
);
const ergebnisWort = (e: Ergebnis) => (e === true ? '' : e === false ? ' – Voraussetzung fehlt' : ' – Spielleitung');

const TierEintrag: React.FC<{ k: Katalog; b: Begleiter; index: number; f: Fuehrer; liste: AbrichtungsInfo[] }> = ({ k, b, index, f, liste }) => {
  const { dispatch } = useCharacter();
  const [offen, setOffen] = useState(false);
  const [wahl, setWahl] = useState('');
  const [text, setText] = useState<Record<number, boolean>>({});
  const e = k.get(b.id); const w = e ? wertekasten(e) : null; const st = e ? kreaturStufe(e) : null;
  const aendern = (aenderung: Partial<Begleiter>) => dispatch({ type: 'BEGLEITER_AENDERN', payload: { index, aenderung } });
  const gewaehlt = b.abrichtungen ?? [];
  const pot = potenzial(k, b, f.msIds);
  const verbraucht = potenzialVerbraucht(liste, gewaehlt);
  const info = new Map(liste.map(a => [a.id, a]));
  const reittier = istReittier(k, b);
  const daten = spielDaten(b, w);
  const spiel = useBegleiterSpiel(b, index, daten);

  // Prüfung je gewählter Abrichtung: mit den Abrichtungen davor, als n-te Wahl derselben Abrichtung
  const pruefung = gewaehlt.map((id, i) => {
    const a = info.get(id); if (!a) return 'offen' as Ergebnis;
    const n = gewaehlt.slice(0, i).filter(x => x === id).length;
    return pruefeAbrichtung(k, a, f.char, tierTraeger(k, b, i), n);
  });
  const angebot = liste.map(a => {
    const n = gewaehlt.filter(x => x === a.id).length;
    const grenze = a.mehrfachText && /pro (hg|heldengrad) des besitzers/i.test(a.mehrfachText) ? f.heldengrad : a.hoechstens;
    return { a, voll: n >= grenze, ergebnis: pruefeAbrichtung(k, a, f.char, tierTraeger(k, b), n) };
  });
  const gruppen = [...new Set(liste.map(a => a.gruppe))];
  const titel = b.rufname ? `${b.rufname} (${b.name})` : b.name;

  return (
    <Eintrag titel={titel} offen={offen} umschalten={() => setOffen(o => !o)} vor={spiel.modale}
      onEntfernen={() => dispatch({ type: 'BEGLEITER_ENTFERNEN', payload: { index } })}
      marken={<>
        <VitalKurz spiel={spiel} daten={daten} />
        {reittier && <Marke klein>Reittier</Marke>}
        {b.vertrauter && <Marke klein>Vertrauter</Marke>}
        <span>{b.kreatur ? `Kreatur ${b.kreatur}` : 'ohne Ressource'}</span>
        {liste.length > 0 && <Marke klein ton={verbraucht > pot.gesamt ? 'schaden' : 'neutral'}>Potenzial {verbraucht}/{pot.gesamt}</Marke>}
        {!e && <Marke klein ton="erschoepft">nicht im Katalog (Buch nicht geladen?)</Marke>}
        {b.kreatur !== undefined && b.kreatur > 0 && st !== null && st > b.kreatur && <Marke klein ton="erschoepft">braucht Kreatur {st}</Marke>}
      </>}>
      <div className="flex flex-wrap gap-3 items-end">
        <Eingabe beschriftung="Rufname" value={b.rufname ?? ''} onChange={ev => aendern({ rufname: ev.target.value || undefined })} placeholder={b.name} />
        <Auswahl beschriftung="Ressource Kreatur" value={b.kreatur ?? 0} onChange={ev => aendern({ kreatur: Number(ev.target.value) || undefined })}>
          <option value={0}>keine (gekauft, gezähmt …)</option>
          {[...new Set([...f.kreatur, b.kreatur ?? 0])].filter(x => x > 0).sort((x, y) => x - y).map(x => <option key={x} value={x}>Kreatur {x}</option>)}
        </Auswahl>
        <Auswahl beschriftung="Qualität" value={b.qualitaet ?? 1} onChange={ev => aendern({ qualitaet: Number(ev.target.value) > 1 ? Number(ev.target.value) : undefined })}>
          {TIER_QUALITAET.map(q => <option key={q.potenzial} value={q.potenzial}>{q.name} (Potenzial {q.potenzial})</option>)}
        </Auswahl>
        <label className={`flex items-center gap-2 min-h-11 ${f.tiervertrauter || b.vertrauter ? '' : 'text-leise'}`} title={f.tiervertrauter ? undefined : 'Erfordert die Stärke Tiervertrauter'}>
          <input type="checkbox" className="w-5 h-5 accent-gold" checked={!!b.vertrauter} disabled={!f.tiervertrauter && !b.vertrauter} onChange={ev => aendern({ vertrauter: ev.target.checked || undefined })} />
          Vertrauter (Stärke Tiervertrauter)
        </label>
      </div>

      {w && <BegleiterVitals spiel={spiel} daten={daten} />}
      {e ? (w ? <Werte w={w} aktionen={spiel.aktionen} /> : <p className="text-leise">Keine Werte im Katalog.</p>) : null}

      <div className="space-y-2">
        <Abschnittstitel als="h3" className="text-[15px]">Abrichtungen</Abschnittstitel>
        {liste.length === 0 ? (
          <p className="text-leise">Abrichtungen und Potenzial stehen im Buchpaket „Bestienmeister“ (Einstellungen → Regelpakete).</p>
        ) : (
          <>
            <p className="text-leise">
              Potenzial {pot.gesamt} = {pot.posten.map(p => `${p.text} ${p.wert}`).join(' + ')}; verbraucht {verbraucht} (Bestienmeister S. 15).
            </p>
            {verbraucht > pot.gesamt && <Hinweise liste={['Mehr Abrichtungen, als das Potenzial erlaubt.']} />}
            {gewaehlt.length > 0 && (
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
                        <span className="text-leise">{a ? `${a.grundausbildung ? 'Grundausbildung, ' : ''}${a.kosten} P.` : 'nicht im Katalog'}</span>
                        <Knopf nurSymbol className="ml-auto" aria-label={`Abrichtung ${a?.name ?? id} entfernen`} onClick={() => aendern({ abrichtungen: gewaehlt.filter((_, j) => j !== i) })}><X size={16} aria-hidden /></Knopf>
                      </div>
                      {text[i] && a && <p className="mt-1">{a.beschreibung}{a.voraussetzung ? <span className="block text-leise">Voraussetzung: {a.voraussetzung.text}</span> : null}</p>}
                    </li>
                  );
                })}
              </ul>
            )}
            <div className="flex flex-wrap gap-2 items-end">
              <Auswahl beschriftung="Abrichtung wählen" beschriftungVerborgen value={wahl} onChange={ev => setWahl(ev.target.value)}>
                <option value="">Abrichtung wählen …</option>
                {gruppen.map(g => (
                  <optgroup key={g} label={g}>
                    {angebot.filter(x => x.a.gruppe === g).map(({ a, voll, ergebnis }) => (
                      <option key={a.id} value={a.id} disabled={voll}>
                        {a.name} ({a.kosten} P.{a.quelle !== 'Bestienmeister' ? `, ${a.quelle}` : ''}){voll ? ' – bereits gewählt' : ergebnisWort(ergebnis)}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </Auswahl>
              <Knopf art="sekundaer" disabled={!wahl} onClick={() => { if (angebot.find(x => x.a.id === wahl)?.ergebnis === false && regelverstoss('Die Voraussetzung dieser Abrichtung ist nicht erfüllt.')) return; aendern({ abrichtungen: [...gewaehlt, wahl] }); setWahl(''); }}>
                <Plus size={14} aria-hidden />Abrichtung hinzufügen
              </Knopf>
            </div>
            {wahl && (() => {
              const x = angebot.find(y => y.a.id === wahl); if (!x) return null;
              return (
                <p>
                  {x.a.beschreibung}
                  {x.a.voraussetzung && <span className="block text-leise">
                    Voraussetzung: {x.a.voraussetzung.text}{x.ergebnis === false ? ' – nicht erfüllt' : x.ergebnis === 'offen' ? ' – Entscheidung der Spielleitung' : ''}
                  </span>}
                </p>
              );
            })()}
            <p className="text-xs text-leise">Boni aus Abrichtungen sind im Wertekasten nicht eingerechnet: Die Einträge im Paket haben dafür noch keine Zahlenwerte.</p>
          </>
        )}
      </div>

      <Notiz b={b} aendern={aendern} />
    </Eintrag>
  );
};

/** Tiere: Tiergefährten (Ressource Kreatur, GRW S. 78), Reittiere, Vertraute; Abrichtungen und Potenzial (Bestienmeister) */
export const TierAbschnitt: React.FC<{ k: Katalog }> = ({ k }) => {
  const { state, dispatch } = useCharacter();
  const [wahl, setWahl] = useState('');
  const tiere = useMemo(() => alleTiere(k), [k]);
  const liste = useMemo(() => alleAbrichtungen(k), [k]);
  const f = useFuehrer(k);
  const eigene = (state.begleiter ?? []).map((b, i) => ({ b, i })).filter(x => x.b.art === 'tier');
  const zuordnungOk = kreaturZuordnung(f.kreatur, eigene.map(x => x.b.kreatur ?? 0));
  const vertraute = eigene.filter(x => x.b.vertrauter).length;

  const hinzu = (id: string) => {
    const e = k.get(id); if (!e) return;
    const st = kreaturStufe(e);
    // freie Ressource Kreatur, die für das Tier reicht (kleinste passende)
    const belegt = [...f.kreatur];
    for (const x of eigene) { const j = belegt.indexOf(x.b.kreatur ?? -1); if (j >= 0) belegt.splice(j, 1); }
    const frei = st !== null ? belegt.filter(x => x >= st).sort((a, b) => a - b)[0] : undefined;
    dispatch({ type: 'BEGLEITER_HINZU', payload: { id: e.id, art: 'tier', name: e.name, ...(frei ? { kreatur: frei } : {}) } });
  };
  const hinweise = [
    ...(!zuordnungOk ? ['Die Tiere nutzen mehr oder höhere Ressourcen Kreatur, als der Charakter hat.'] : []),
    ...(vertraute > 1 ? ['Mehr als ein Vertrauter.'] : []),
    ...(vertraute > 0 && !f.tiervertrauter ? ['Vertrauter ohne die Stärke Tiervertrauter.'] : []),
  ];

  return (
    <Karte data-testid="begleiter-tiere" className="space-y-3">
      <div className="flex items-center gap-2">
        <PawPrint size={18} aria-hidden />
        <Abschnittstitel>Tiere</Abschnittstitel>
      </div>
      <p className="text-sm text-leise">
        Ressource Kreatur: {f.kreatur.length ? f.kreatur.join(', ') : 'keine'} – ein Tiergefährte je Ressource, höchstens mit „Kreatur N“ (GRW S. 78).
        Reittiere und gekaufte Tiere brauchen keine Ressource.
      </p>
      <Hinweise liste={hinweise} />

      {eigene.length > 0 && (
        <ul className="space-y-3">
          {eigene.map(({ b, i }) => <TierEintrag key={`${b.id}-${i}`} k={k} b={b} index={i} f={f} liste={liste} />)}
        </ul>
      )}

      <div className="flex flex-wrap gap-2 items-end">
        <Auswahl beschriftung="Tier wählen" beschriftungVerborgen value={wahl} onChange={e => setWahl(e.target.value)}>
          <option value="">Tier wählen …</option>
          {tiere.map(t => (
            <option key={t.id} value={t.id}>
              {t.name} ({[t.stufe ? `Kreatur ${t.stufe}` : null, t.typus.includes('Reittier') ? 'Reittier' : null, t.quelle !== 'GRW' ? t.quelle : null].filter(Boolean).join(', ') || 'Tier'})
            </option>
          ))}
        </Auswahl>
        <Knopf art="sekundaer" disabled={!wahl} onClick={() => { hinzu(wahl); setWahl(''); }}><Plus size={14} aria-hidden />Tier hinzufügen</Knopf>
      </div>
    </Karte>
  );
};
