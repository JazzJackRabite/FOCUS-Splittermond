import React, { useMemo, useState } from 'react';
import { Users, Plus, Trash2, ChevronDown, ChevronRight, X, AlertTriangle } from 'lucide-react';
import { useCharacter } from '../../context/CharacterContext';
import {
  ATTRIBUTE, ersteSchwelle, freieAttribute, gefolgeWerte, gruppenOptionen, kulturen, meisterschaftsAngebot, rassen, zauberAngebot,
} from '../../regelwerk/gefolge';
import type { Katalog } from '../../regelwerk/katalog';
import type { Begleiter } from '../../types';
import { Werte, auswahl, karte, knopf } from './Wertekasten';

/** Gefolge-Punkte des Abenteurers (Summe der Ressource Gefolge) */
function useGefolgePunkte(): number {
  const { state } = useCharacter();
  return state.resourcesList.filter(r => /^Gefolge\b/.test(r.name)).reduce((s, r) => s + (Number(r.level) || 0), 0);
}

const GefolgeEintrag: React.FC<{ k: Katalog; b: Begleiter; index: number; maxFertigkeit: number }> = ({ k, b, index, maxFertigkeit }) => {
  const { dispatch } = useCharacter();
  const [offen, setOffen] = useState(false);
  const [msWahl, setMsWahl] = useState('');
  const [zWahl, setZWahl] = useState('');
  const [fWahl, setFWahl] = useState('');
  const aendern = (aenderung: Partial<Begleiter>) => dispatch({ type: 'BEGLEITER_AENDERN', payload: { index, aenderung } });
  const g = gefolgeWerte(k, b, maxFertigkeit);
  const kultur = k.get(b.id);
  const mw = kultur?.daten.modulwerte;
  const plaetze = freieAttribute(k, b.rasse);
  const schwelle1 = ersteSchwelle(k);
  const wahl = b.kulturWahl ?? {};
  const msAngebot = useMemo(() => meisterschaftsAngebot(k, g.fertigkeiten), [k, g.fertigkeiten]);
  const zAngebot = useMemo(() => zauberAngebot(k, g.fertigkeiten), [k, g.fertigkeiten]);
  const alleFertigkeiten = useMemo(() => Object.values(k.eintraege).filter(e => e.typ === 'fertigkeit' && !e.daten.gruppierte_fertigkeit)
    .sort((x, y) => x.name.localeCompare(y.name, 'de')), [k]);
  const titel = b.rufname ? `${b.rufname} (${b.aufgabe || b.name})` : b.aufgabe ? `${b.aufgabe} (${b.name})` : `Gefolgsmann (${b.name})`;
  const schwellen = b.schwellen ?? [];
  const ms = b.meisterschaften ?? [];
  const zs = b.zauber ?? [];

  return (
    <li className="border border-[#d1c4b0] rounded-lg p-2 bg-white">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <button type="button" className="flex items-center gap-1 text-sm font-bold text-[#1B365D] cursor-pointer" onClick={() => setOffen(o => !o)} aria-expanded={offen}>
          {offen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}{titel}
        </button>
        <span className="flex items-center gap-2 text-xs text-gray-500 flex-wrap">
          {b.rasse && <span>{k.get(b.rasse)?.name}</span>}
          <span>{g.punkte} {g.punkte === 1 ? 'Punkt' : 'Punkte'}</span>
          {g.hinweise.length > 0 && <span className="text-amber-700 flex items-center gap-0.5" title={g.hinweise.join('\n')}><AlertTriangle size={12} />{g.hinweise.length}</span>}
          {!kultur && <span className="text-amber-700">Kultur nicht im Katalog (Buch nicht geladen?)</span>}
          <button type="button" aria-label={`${titel} entfernen`} onClick={() => dispatch({ type: 'BEGLEITER_ENTFERNEN', payload: { index } })}
            className="p-1 rounded hover:bg-black/5 hover:text-red-700 cursor-pointer"><Trash2 size={14} /></button>
        </span>
      </div>

      {offen && (
        <div className="mt-2 space-y-3 text-xs">
          <div className="flex flex-wrap gap-3 items-end">
            <label className="flex flex-col gap-0.5">Rufname
              <input value={b.rufname ?? ''} onChange={ev => aendern({ rufname: ev.target.value || undefined })} className={auswahl} placeholder="Name" />
            </label>
            <label className="flex flex-col gap-0.5">Aufgabe
              <input value={b.aufgabe ?? ''} onChange={ev => aendern({ aufgabe: ev.target.value || undefined })} className={auswahl} placeholder="Leibdiener, Knappe …" list="gefolge-aufgaben" />
            </label>
            <label className="flex flex-col gap-0.5">Rasse
              <select value={b.rasse ?? ''} onChange={ev => aendern({ rasse: ev.target.value || undefined, attributFrei: undefined })} className={auswahl} aria-label="Rasse des Gefolgsmanns">
                <option value="">Rasse wählen …</option>
                {rassen(k).map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </label>
            {plaetze.map((p, i) => (
              <label key={i} className="flex flex-col gap-0.5">+{p.bonus} frei
                <select value={b.attributFrei?.[i] ?? ''} aria-label={`Freier Attributbonus ${i + 1}`} className={auswahl}
                  onChange={ev => { const l = [...(b.attributFrei ?? [])]; l[i] = ev.target.value; aendern({ attributFrei: l }); }}>
                  <option value="">Attribut …</option>
                  {ATTRIBUTE.filter(([, n]) => !p.nicht.includes(n) && !(p.unterschiedlich && (b.attributFrei ?? []).some((x, j) => j !== i && x === n)))
                    .map(([kurz, n]) => <option key={kurz} value={n}>{n}</option>)}
                </select>
              </label>
            ))}
          </div>
          {b.rasse && <p className="text-gray-600">{k.get(b.rasse)?.daten.attributsmodifikatoren?.text}; sonst alle Attribute 2 (GRW S. 78).</p>}

          {mw && (
            <div>
              <h4 className="font-bold text-[#1B365D] mb-1">Kulturmodul {b.name}</h4>
              <div className="flex flex-wrap gap-3 items-end">
                {(mw.fertigkeiten ?? []).map((gr: { text: string; rest_von?: number | null }, i: number) => {
                  const liste = gruppenOptionen(k, mw.fertigkeiten, i, gr.rest_von != null ? wahl.fertigkeiten?.[String(gr.rest_von)] : undefined);
                  if (liste.length <= 1) return null;
                  return (
                    <label key={i} className="flex flex-col gap-0.5">{gr.text}
                      <select value={wahl.fertigkeiten?.[String(i)] ?? ''} className={auswahl} aria-label={`Kultur: ${gr.text}`}
                        onChange={ev => aendern({ kulturWahl: { ...wahl, fertigkeiten: { ...(wahl.fertigkeiten ?? {}), [String(i)]: ev.target.value } } })}>
                        <option value="">wählen …</option>
                        {liste.map(o => <option key={o.id} value={o.id}>{o.text}</option>)}
                      </select>
                    </label>
                  );
                })}
                {(mw.staerke_optionen ?? []).length > 1 && (
                  <label className="flex flex-col gap-0.5">Stärke
                    <select value={wahl.staerke ?? ''} className={auswahl} aria-label="Kultur: Stärke" onChange={ev => aendern({ kulturWahl: { ...wahl, staerke: ev.target.value || undefined } })}>
                      <option value="">wählen …</option>
                      {mw.staerke_optionen.map((o: { id: string; text: string }) => <option key={o.id} value={o.id}>{o.text}</option>)}
                    </select>
                  </label>
                )}
                {(mw.meisterschaft_optionen ?? []).length > 1 && (
                  <label className="flex flex-col gap-0.5">Meisterschaft
                    <select value={wahl.meisterschaft ?? ''} className={auswahl} aria-label="Kultur: Meisterschaft"
                      onChange={ev => aendern({ kulturWahl: { ...wahl, meisterschaft: ev.target.value === '' ? undefined : Number(ev.target.value) } })}>
                      <option value="">wählen …</option>
                      {mw.meisterschaft_optionen.map((o: { text: string }, i: number) => <option key={i} value={i}>{o.text}</option>)}
                    </select>
                  </label>
                )}
              </div>
            </div>
          )}

          <Werte w={g.werte} />

          <div>
            <h4 className="font-bold text-[#1B365D] mb-1">Fertigkeiten</h4>
            {g.fertigkeiten.length === 0 ? <p className="text-gray-600">Keine.</p> : (
              <table className="w-full text-left">
                <thead><tr className="text-[10px] text-gray-500"><th>Fertigkeit</th><th>Punkte</th><th>Wert</th><th></th></tr></thead>
                <tbody>
                  {g.fertigkeiten.map(f => (
                    <tr key={f.id} className={f.zuHoch ? 'text-red-700' : ''}>
                      <td>{f.name}</td><td>{f.punkte}</td>
                      <td className="font-bold">{f.wert ?? <span className="font-normal text-gray-500" title="Kampffertigkeit: Punkte + Attribute der Waffe">+ Waffe</span>}</td>
                      <td className="text-right">
                        {f.angehoben ? (
                          <button type="button" className="text-gray-500 hover:text-red-700 cursor-pointer" aria-label={`${f.name} nicht mehr anheben`}
                            onClick={() => aendern({ schwellen: schwellen.filter(x => x !== f.id) })}>angehoben (1 P.) <X size={11} className="inline" /></button>
                        ) : f.punkte < schwelle1 ? (
                          <button type="button" className="text-[#1B365D] underline cursor-pointer" onClick={() => aendern({ schwellen: [...schwellen, f.id] })}>
                            auf {schwelle1} anheben (1 P.)
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <div className="flex flex-wrap gap-2 items-center mt-1">
              <select value={fWahl} onChange={ev => setFWahl(ev.target.value)} aria-label="Weitere Fertigkeit anheben" className={auswahl}>
                <option value="">weitere Fertigkeit auf {schwelle1} …</option>
                {alleFertigkeiten.filter(e => !g.fertigkeiten.some(f => f.id === e.id)).map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
              <button type="button" disabled={!fWahl} className={knopf} onClick={() => { aendern({ schwellen: [...schwellen, fWahl] }); setFWahl(''); }}><Plus size={12} />Anheben (1 P.)</button>
            </div>
          </div>

          <div>
            <h4 className="font-bold text-[#1B365D] mb-1">Stärken</h4>
            <p>{g.staerken.map(i => k.get(i)?.name ?? i).join(', ') || 'keine'}</p>
          </div>

          <div>
            <h4 className="font-bold text-[#1B365D] mb-1">Meisterschaften</h4>
            <ul className="space-y-0.5">
              {g.kulturMeisterschaft && <li>{g.kulturMeisterschaft.text} <span className="text-gray-500">(Kultur)</span></li>}
              {g.meisterschaften.map((m, i) => (
                <li key={`${m.id}-${i}`} className="flex items-center gap-1">
                  {!m.ok && <AlertTriangle size={12} className="text-amber-700" aria-label="Voraussetzung nicht erfüllt" />}
                  {m.name} <span className="text-gray-500">({m.fertigkeit}, S{m.schwelle}{i < g.freieMeisterschaften ? ', frei durch Schwelle' : ', 1 P.'})</span>
                  <button type="button" aria-label={`Meisterschaft ${m.name} entfernen`} onClick={() => aendern({ meisterschaften: ms.filter((_, j) => j !== i) })}
                    className="p-0.5 rounded hover:bg-black/5 hover:text-red-700 cursor-pointer"><X size={11} /></button>
                </li>
              ))}
            </ul>
            <p className="text-gray-600">Frei: {g.freieMeisterschaften} (eine je angehobener Fertigkeit); jede weitere kostet 1 Punkt.</p>
            <div className="flex flex-wrap gap-2 items-center mt-1">
              <select value={msWahl} onChange={ev => setMsWahl(ev.target.value)} aria-label="Meisterschaft für Gefolgsmann wählen" className={auswahl}>
                <option value="">Meisterschaft wählen …</option>
                {[...new Set(msAngebot.map(m => m.fertigkeit))].map(f => (
                  <optgroup key={f} label={f}>
                    {msAngebot.filter(m => m.fertigkeit === f).map(m => <option key={m.id} value={m.id} disabled={ms.includes(m.id) || g.kulturMeisterschaft?.id === m.id}>{m.name} (S{m.schwelle})</option>)}
                  </optgroup>
                ))}
              </select>
              <button type="button" disabled={!msWahl} className={knopf} onClick={() => { aendern({ meisterschaften: [...ms, msWahl] }); setMsWahl(''); }}><Plus size={12} />Meisterschaft hinzufügen</button>
            </div>
          </div>

          {(zAngebot.length > 0 || zs.length > 0) && (
            <div>
              <h4 className="font-bold text-[#1B365D] mb-1">Zauber</h4>
              <ul className="space-y-0.5">
                {g.zauber.map((z, i) => (
                  <li key={`${z.id}-${i}`} className="flex items-center gap-1">
                    {!z.ok && <AlertTriangle size={12} className="text-amber-700" aria-label="Voraussetzung nicht erfüllt" />}
                    {z.name} <span className="text-gray-500">({z.schule} {z.grad}{i < g.freieZauber ? ', frei' : ', 1 P.'})</span>
                    <button type="button" aria-label={`Zauber ${z.name} entfernen`} onClick={() => aendern({ zauber: zs.filter((_, j) => j !== i) })}
                      className="p-0.5 rounded hover:bg-black/5 hover:text-red-700 cursor-pointer"><X size={11} /></button>
                  </li>
                ))}
              </ul>
              <p className="text-gray-600">Frei: {g.freieZauber} (je Magieschule ab 1, 3 und 6 Punkten einer); jeder weitere kostet 1 Punkt.</p>
              <div className="flex flex-wrap gap-2 items-center mt-1">
                <select value={zWahl} onChange={ev => setZWahl(ev.target.value)} aria-label="Zauber für Gefolgsmann wählen" className={auswahl}>
                  <option value="">Zauber wählen …</option>
                  {[...new Set(zAngebot.map(z => z.schule))].map(s => (
                    <optgroup key={s} label={s}>
                      {zAngebot.filter(z => z.schule === s).map(z => <option key={z.id} value={z.id} disabled={zs.includes(z.id)}>{z.name} (Grad {z.grad})</option>)}
                    </optgroup>
                  ))}
                </select>
                <button type="button" disabled={!zWahl} className={knopf} onClick={() => { aendern({ zauber: [...zs, zWahl] }); setZWahl(''); }}><Plus size={12} />Zauber hinzufügen</button>
              </div>
            </div>
          )}

          {g.hinweise.length > 0 && (
            <ul className="text-amber-700 list-disc pl-4">{g.hinweise.map((h, i) => <li key={i}>{h}</li>)}</ul>
          )}

          <label className="flex flex-col gap-0.5">Notiz
            <textarea value={b.notiz ?? ''} onChange={ev => aendern({ notiz: ev.target.value || undefined })} rows={2} className={`${auswahl} w-full`} />
          </label>
        </div>
      )}
    </li>
  );
};

/** Gefolge: humanoide Gefolgsleute über die Ressource Gefolge (GRW S. 77–78) */
export const GefolgeAbschnitt: React.FC<{ k: Katalog }> = ({ k }) => {
  const { state, dispatch, calc } = useCharacter();
  const [rasse, setRasse] = useState('');
  const [kultur, setKultur] = useState('');
  const punkte = useGefolgePunkte();
  const maxFertigkeit = Number((calc as { heldengrad?: { maxSkill?: number } } | undefined)?.heldengrad?.maxSkill) || 6;
  const eigene = (state.begleiter ?? []).map((b, i) => ({ b, i })).filter(x => x.b.art === 'gefolge');
  const verbraucht = eigene.reduce((s, x) => s + gefolgeWerte(k, x.b, maxFertigkeit).punkte, 0);
  const ku = useMemo(() => kulturen(k), [k]);
  const ra = useMemo(() => rassen(k), [k]);
  if (!k.get('grw:ressource:gefolge') && !ku.length) return null;

  return (
    <section className={karte} data-testid="begleiter-gefolge">
      <div className="flex items-center gap-2 mb-2">
        <Users size={18} className="text-[#1B365D]" />
        <h3 className="font-bold text-base text-[#1B365D]">Gefolge</h3>
      </div>
      <p className="text-xs text-gray-600 mb-3">
        Ressource Gefolge: {punkte || 'keine'}; verbraucht {verbraucht}. Jeder Punkt bringt einen Gefolgsmann (Attribute 2 + Rassenmodifikator,
        Werte des Kulturmoduls) oder hebt eine Fertigkeit auf die erste Schwelle oder kauft eine Meisterschaft bzw. einen Zauber.
        Keine Fertigkeit über {maxFertigkeit} (Heldengrad). Den Einsatz entscheidet die Spielleitung (GRW S. 77–78).
        {verbraucht > punkte && <strong className="block text-amber-700">Das Gefolge braucht mehr Punkte, als die Ressource Gefolge hergibt.</strong>}
      </p>
      <datalist id="gefolge-aufgaben">
        {['Leibdiener', 'Leibdienerin', 'Knappe', 'Leibwächter', 'Zofe', 'Knecht', 'Koch', 'Vorkoster', 'Schildmaid'].map(a => <option key={a} value={a} />)}
      </datalist>

      {eigene.length > 0 && (
        <ul className="space-y-2 mb-3">
          {eigene.map(({ b, i }) => <GefolgeEintrag key={`${b.id}-${i}`} k={k} b={b} index={i} maxFertigkeit={maxFertigkeit} />)}
        </ul>
      )}

      <div className="flex flex-wrap gap-2 items-center">
        <select value={rasse} onChange={e => setRasse(e.target.value)} aria-label="Rasse wählen" className={auswahl}>
          <option value="">Rasse …</option>
          {ra.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
        <select value={kultur} onChange={e => setKultur(e.target.value)} aria-label="Kultur wählen" className={auswahl}>
          <option value="">Kultur …</option>
          {ku.map(c => <option key={c.id} value={c.id}>{c.name}{c.quelle.paket !== 'grw' ? ` (${k.pakete[c.quelle.paket]?.kuerzel ?? c.quelle.paket})` : ''}</option>)}
        </select>
        <button type="button" disabled={!rasse || !kultur} className={knopf}
          onClick={() => { dispatch({ type: 'BEGLEITER_HINZU', payload: { id: kultur, art: 'gefolge', name: k.get(kultur)!.name, rasse } }); setKultur(''); }}>
          <Plus size={12} />Gefolgsmann hinzufügen
        </button>
      </div>
    </section>
  );
};
