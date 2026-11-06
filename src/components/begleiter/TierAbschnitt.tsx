import React, { useMemo, useState } from 'react';
import { PawPrint, Plus, Trash2, ChevronDown, ChevronRight, X, Check, AlertTriangle, HelpCircle } from 'lucide-react';
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
import { Werte, auswahl, karte, knopf } from './Wertekasten';

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

const Status: React.FC<{ e: Ergebnis; text?: string }> = ({ e, text }) => (
  e === true ? <Check size={13} className="text-green-700 shrink-0" aria-label="Voraussetzung erfüllt" />
    : e === false ? <span title={text ? `Voraussetzung: ${text}` : undefined}><AlertTriangle size={13} className="text-amber-700 shrink-0" aria-label="Voraussetzung nicht erfüllt" /></span>
      : <span title={text ? `Spielleitung: ${text}` : undefined}><HelpCircle size={13} className="text-gray-500 shrink-0" aria-label="Entscheidung der Spielleitung" /></span>
);

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

  return (
    <li className="border border-[#d1c4b0] rounded-lg p-2 bg-white">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <button type="button" className="flex items-center gap-1 text-sm font-bold text-[#1B365D] cursor-pointer" onClick={() => setOffen(o => !o)} aria-expanded={offen}>
          {offen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}{b.rufname ? `${b.rufname} (${b.name})` : b.name}
        </button>
        <span className="flex items-center gap-2 text-xs text-gray-500 flex-wrap">
          {reittier && <span className="px-1.5 rounded bg-[#ebdcc3] text-[#1B365D] font-bold">Reittier</span>}
          {b.vertrauter && <span className="px-1.5 rounded bg-[#ebdcc3] text-[#1B365D] font-bold">Vertrauter</span>}
          {b.kreatur ? `Kreatur ${b.kreatur}` : 'ohne Ressource'}
          {liste.length > 0 && <span className={verbraucht > pot.gesamt ? 'text-red-700 font-bold' : ''}>Potenzial {verbraucht}/{pot.gesamt}</span>}
          {!e && <span className="text-amber-700">nicht im Katalog (Buch nicht geladen?)</span>}
          {b.kreatur !== undefined && b.kreatur > 0 && st !== null && st > b.kreatur && <span className="text-amber-700">braucht Kreatur {st}</span>}
          <button type="button" aria-label={`${b.name} entfernen`} onClick={() => dispatch({ type: 'BEGLEITER_ENTFERNEN', payload: { index } })}
            className="p-1 rounded hover:bg-black/5 hover:text-red-700 cursor-pointer"><Trash2 size={14} /></button>
        </span>
      </div>

      {offen && (
        <div className="mt-2 space-y-3">
          <div className="flex flex-wrap gap-3 items-end text-xs">
            <label className="flex flex-col gap-0.5">Rufname
              <input value={b.rufname ?? ''} onChange={ev => aendern({ rufname: ev.target.value || undefined })} className={auswahl} placeholder={b.name} />
            </label>
            <label className="flex flex-col gap-0.5">Ressource Kreatur
              <select value={b.kreatur ?? 0} onChange={ev => aendern({ kreatur: Number(ev.target.value) || undefined })} className={auswahl}>
                <option value={0}>keine (gekauft, gezähmt …)</option>
                {[...new Set([...f.kreatur, b.kreatur ?? 0])].filter(x => x > 0).sort((x, y) => x - y).map(x => <option key={x} value={x}>Kreatur {x}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-0.5">Qualität
              <select value={b.qualitaet ?? 1} onChange={ev => aendern({ qualitaet: Number(ev.target.value) > 1 ? Number(ev.target.value) : undefined })} className={auswahl}>
                {TIER_QUALITAET.map(q => <option key={q.potenzial} value={q.potenzial}>{q.name} (Potenzial {q.potenzial})</option>)}
              </select>
            </label>
            <label className={`flex items-center gap-1 ${f.tiervertrauter || b.vertrauter ? '' : 'opacity-50'}`} title={f.tiervertrauter ? undefined : 'Erfordert die Stärke Tiervertrauter'}>
              <input type="checkbox" checked={!!b.vertrauter} disabled={!f.tiervertrauter && !b.vertrauter} onChange={ev => aendern({ vertrauter: ev.target.checked || undefined })} />
              Vertrauter (Stärke Tiervertrauter)
            </label>
          </div>

          {e ? (w ? <Werte w={w} /> : <p className="text-xs text-gray-600">Keine Werte im Katalog.</p>) : null}

          <div>
            <h4 className="text-xs font-bold text-[#1B365D] mb-1">Abrichtungen</h4>
            {liste.length === 0 ? (
              <p className="text-xs text-gray-600">Abrichtungen und Potenzial stehen im Buchpaket „Bestienmeister“ (Einstellungen → Regelpakete).</p>
            ) : (
              <>
                <p className="text-xs text-gray-600 mb-1">
                  Potenzial {pot.gesamt} = {pot.posten.map(p => `${p.text} ${p.wert}`).join(' + ')}; verbraucht {verbraucht} (Bestienmeister S. 15).
                  {verbraucht > pot.gesamt && <strong className="block text-red-700">Mehr Abrichtungen, als das Potenzial erlaubt.</strong>}
                </p>
                {gewaehlt.length > 0 && (
                  <ul className="text-xs space-y-1 mb-2">
                    {gewaehlt.map((id, i) => {
                      const a = info.get(id);
                      return (
                        <li key={`${id}-${i}`} className="border-l-2 border-[#C5A059] pl-2">
                          <div className="flex items-center gap-1">
                            <Status e={pruefung[i]} text={a?.voraussetzung?.text} />
                            <button type="button" className="font-bold text-[#2C1810] cursor-pointer text-left" onClick={() => setText(t => ({ ...t, [i]: !t[i] }))}>
                              {a?.name ?? k.get(id)?.name ?? id}
                            </button>
                            <span className="text-gray-500">{a ? `${a.grundausbildung ? 'Grundausbildung, ' : ''}${a.kosten} P.` : 'nicht im Katalog'}</span>
                            <button type="button" aria-label={`Abrichtung ${a?.name ?? id} entfernen`} onClick={() => aendern({ abrichtungen: gewaehlt.filter((_, j) => j !== i) })}
                              className="ml-auto p-0.5 rounded hover:bg-black/5 hover:text-red-700 cursor-pointer"><X size={12} /></button>
                          </div>
                          {text[i] && a && <p className="text-gray-700 mt-0.5">{a.beschreibung}{a.voraussetzung ? <span className="block text-gray-500">Voraussetzung: {a.voraussetzung.text}</span> : null}</p>}
                        </li>
                      );
                    })}
                  </ul>
                )}
                <div className="flex flex-wrap gap-2 items-center">
                  <select value={wahl} onChange={ev => setWahl(ev.target.value)} aria-label="Abrichtung wählen" className={auswahl}>
                    <option value="">Abrichtung wählen …</option>
                    {gruppen.map(g => (
                      <optgroup key={g} label={g}>
                        {angebot.filter(x => x.a.gruppe === g).map(({ a, voll, ergebnis }) => (
                          <option key={a.id} value={a.id} disabled={voll}>
                            {ergebnis === true ? '✓ ' : ergebnis === false ? '✗ ' : '? '}{a.name} ({a.kosten} P.{a.quelle !== 'Bestienmeister' ? `, ${a.quelle}` : ''}){voll ? ' – bereits gewählt' : ''}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                  <button type="button" disabled={!wahl} className={knopf} onClick={() => { aendern({ abrichtungen: [...gewaehlt, wahl] }); setWahl(''); }}>
                    <Plus size={12} />Abrichtung hinzufügen
                  </button>
                </div>
                {wahl && (() => {
                  const x = angebot.find(y => y.a.id === wahl); if (!x) return null;
                  return (
                    <p className="text-xs text-gray-700 mt-1">
                      {x.a.beschreibung}
                      {x.a.voraussetzung && <span className={`block ${x.ergebnis === false ? 'text-amber-700' : 'text-gray-500'}`}>
                        Voraussetzung: {x.a.voraussetzung.text}{x.ergebnis === false ? ' – nicht erfüllt' : x.ergebnis === 'offen' ? ' – Entscheidung der Spielleitung' : ''}
                      </span>}
                    </p>
                  );
                })()}
                <p className="text-[11px] text-gray-500 mt-1">Boni aus Abrichtungen sind im Wertekasten noch nicht eingerechnet.</p>
              </>
            )}
          </div>

          <label className="flex flex-col gap-0.5 text-xs">Notiz
            <textarea value={b.notiz ?? ''} onChange={ev => aendern({ notiz: ev.target.value || undefined })} rows={2} className={`${auswahl} w-full`} />
          </label>
        </div>
      )}
    </li>
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

  return (
    <section className={karte} data-testid="begleiter-tiere">
      <div className="flex items-center gap-2 mb-2">
        <PawPrint size={18} className="text-[#1B365D]" />
        <h3 className="font-bold text-base text-[#1B365D]">Tiere</h3>
      </div>
      <p className="text-xs text-gray-600 mb-3">
        Ressource Kreatur: {f.kreatur.length ? f.kreatur.join(', ') : 'keine'} – ein Tiergefährte je Ressource, höchstens mit „Kreatur N“ (GRW S. 78).
        Reittiere und gekaufte Tiere brauchen keine Ressource.
        {!zuordnungOk && <strong className="block text-amber-700">Die Tiere nutzen mehr oder höhere Ressourcen Kreatur, als der Charakter hat.</strong>}
        {vertraute > 1 && <strong className="block text-amber-700">Mehr als ein Vertrauter.</strong>}
        {vertraute > 0 && !f.tiervertrauter && <strong className="block text-amber-700">Vertrauter ohne die Stärke Tiervertrauter.</strong>}
      </p>

      {eigene.length > 0 && (
        <ul className="space-y-2 mb-3">
          {eigene.map(({ b, i }) => <TierEintrag key={`${b.id}-${i}`} k={k} b={b} index={i} f={f} liste={liste} />)}
        </ul>
      )}

      <div className="flex flex-wrap gap-2 items-center">
        <select value={wahl} onChange={e => setWahl(e.target.value)} aria-label="Tier wählen" className={auswahl}>
          <option value="">Tier wählen …</option>
          {tiere.map(t => (
            <option key={t.id} value={t.id}>
              {t.name} ({[t.stufe ? `Kreatur ${t.stufe}` : null, t.typus.includes('Reittier') ? 'Reittier' : null, t.quelle !== 'GRW' ? t.quelle : null].filter(Boolean).join(', ') || 'Tier'})
            </option>
          ))}
        </select>
        <button type="button" disabled={!wahl} className={knopf} onClick={() => { hinzu(wahl); setWahl(''); }}><Plus size={12} />Tier hinzufügen</button>
      </div>
    </section>
  );
};
