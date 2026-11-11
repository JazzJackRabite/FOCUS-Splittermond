import { aenderungGesperrt, regelverstoss } from '../../fundament/hausregeln';
import React, { useMemo, useState } from 'react';
import { Users, Plus, Trash2, ChevronDown, ChevronRight, X, AlertTriangle } from 'lucide-react';
import { useCharacter } from '../../context/CharacterContext';
import {
  ATTRIBUTE, ersteSchwelle, freieAttribute, gefolgeWerte, gruppenOptionen, waffenAngebot, kulturen, meisterschaftsAngebot, rassen, zauberAngebot,
} from '../../regelwerk/gefolge';
import type { Katalog } from '../../regelwerk/katalog';
import type { Begleiter } from '../../types';
import { Werte, auswahl, karte, knopf, wuerfelKnopf } from './Wertekasten';
import { BegleiterVitals, VitalKurz, spielDaten, useBegleiterSpiel } from './BegleiterSpiel';
import type { Spell } from '../../types';

/** Gefolge-Punkte des Abenteurers (Summe der Ressource Gefolge) */
function useGefolgePunkte(): number {
  const { state } = useCharacter();
  return state.resourcesList.filter(r => /^Gefolge\b/.test(r.name)).reduce((s, r) => s + (Number(r.level) || 0), 0);
}

const GefolgeEintrag: React.FC<{ k: Katalog; b: Begleiter; index: number; maxFertigkeit: number; punkteFrei: number }> = ({ k, b, index, maxFertigkeit, punkteFrei }) => {
  const { dispatch } = useCharacter();
  const [offen, setOffen] = useState(false);
  const [msWahl, setMsWahl] = useState('');
  const [zWahl, setZWahl] = useState('');
  const [fWahl, setFWahl] = useState('');
  const [wWahl, setWWahl] = useState('');
  const g = gefolgeWerte(k, b, maxFertigkeit);
  const aendern = (aenderung: Partial<Begleiter>) => {
    const neu = gefolgeWerte(k, { ...b, ...aenderung }, maxFertigkeit);
    if (aenderungGesperrt(g.verstoesse, neu.verstoesse)) return;
    if (neu.punkte > g.punkte && neu.punkte - g.punkte > punkteFrei && regelverstoss('Dafür reichen die Punkte der Ressource Gefolge nicht.')) return;
    dispatch({ type: 'BEGLEITER_AENDERN', payload: { index, aenderung } });
  };
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
  const ws = b.waffen ?? [];
  const daten = spielDaten(b, g.werte);
  const spiel = useBegleiterSpiel(b, index, daten);
  const wAngebot = useMemo(() => waffenAngebot(k, g.fertigkeiten), [k, g.fertigkeiten]);
  /** Katalog-Zauber → Zauber des Editors für das Zauber-Modal */
  const alsSpell = (id: string, schuleId?: string): Spell | null => {
    const e = k.get(id); if (!e) return null; const d = e.daten;
    const sch = (d.schulen ?? []).find((x: { id: string }) => x.id === schuleId) ?? d.schulen?.[0];
    return { name: e.name, school: k.get(sch?.id)?.name ?? '', grade: Number(sch?.grad) || 0, cost: String(d.kosten ?? ''), castTime: d.zauberdauer,
      range: d.reichweite, duration: d.wirkungsdauer, description: d.wirkung, source: k.pakete[e.quelle.paket]?.kuerzel ?? e.quelle.paket, page: e.quelle.buch_seiten?.[0] };
  };

  return (
    <li className="border border-rahmen rounded-knopf p-2 bg-flaeche">
      {spiel.modale}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <button type="button" className="flex items-center gap-1 text-sm font-bold text-schrift cursor-pointer" onClick={() => setOffen(o => !o)} aria-expanded={offen}>
          {offen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}{titel}
        </button>
        <span className="flex items-center gap-2 text-xs text-leise flex-wrap">
          <VitalKurz spiel={spiel} daten={daten} />
          {b.rasse && <span>{k.get(b.rasse)?.name}</span>}
          <span>{g.punkte} {g.punkte === 1 ? 'Punkt' : 'Punkte'}</span>
          {g.hinweise.length > 0 && <span className="text-erschoepft flex items-center gap-0.5" title={g.hinweise.join('\n')}><AlertTriangle size={12} />{g.hinweise.length}</span>}
          {!kultur && <span className="text-erschoepft">Kultur nicht im Katalog (Buch nicht geladen?)</span>}
          <button type="button" aria-label={`${titel} entfernen`} onClick={() => dispatch({ type: 'BEGLEITER_ENTFERNEN', payload: { index } })}
            className="p-1 rounded-knopf hover:bg-black/5 hover:text-schaden cursor-pointer"><Trash2 size={14} /></button>
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
          {b.rasse && <p className="text-leise">{k.get(b.rasse)?.daten.attributsmodifikatoren?.text}; sonst alle Attribute 2 (GRW S. 78).</p>}

          {mw && (
            <div>
              <h4 className="font-bold text-gold-hell mb-1">Kulturmodul {b.name}</h4>
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

          {b.rasse && <BegleiterVitals spiel={spiel} daten={daten} />}
          <Werte w={g.werte} aktionen={spiel.aktionen} />
          <div className="flex flex-wrap gap-2 items-center">
            {ws.length > 0 && <span className="flex flex-wrap gap-1">{g.waffen.map((x, i) => (
              <span key={`${x.id}-${i}`} className="inline-flex items-center gap-0.5 border border-rahmen rounded-knopf px-1">{x.name} <span className="text-leise">({x.fertigkeit})</span>
                <button type="button" aria-label={`Waffe ${x.name} entfernen`} onClick={() => aendern({ waffen: ws.filter((_, j) => j !== i) })} className="p-0.5 hover:text-schaden cursor-pointer"><X size={10} /></button>
              </span>))}</span>}
            <select value={wWahl} onChange={ev => setWWahl(ev.target.value)} aria-label="Waffe für Gefolgsmann wählen" className={auswahl}>
              <option value="">{wAngebot.length ? 'Waffe wählen …' : 'Waffen: erst eine Kampffertigkeit'}</option>
              {[...new Set(wAngebot.map(x => x.fertigkeit))].map(f => (
                <optgroup key={f} label={f}>{wAngebot.filter(x => x.fertigkeit === f).map(x => <option key={x.id} value={x.id}>{x.name} ({x.schaden}{x.modus && x.modus !== 'Nahkampf' ? `, ${x.modus}` : ''})</option>)}</optgroup>
              ))}
            </select>
            <button type="button" disabled={!wWahl} className={knopf} onClick={() => { aendern({ waffen: [...ws, wWahl] }); setWWahl(''); }}><Plus size={12} />Waffe</button>
          </div>

          <div>
            <h4 className="font-bold text-gold-hell mb-1">Fertigkeiten</h4>
            {g.fertigkeiten.length === 0 ? <p className="text-leise">Keine.</p> : (
              <table className="w-full text-left">
                <thead><tr className="text-[11px] text-leise"><th>Fertigkeit</th><th>Punkte</th><th>Wert</th><th></th></tr></thead>
                <tbody>
                  {g.fertigkeiten.map(f => (
                    <tr key={f.id} className={f.zuHoch ? 'text-schaden' : ''}>
                      <td>{f.wert !== null ? (
                        <button type="button" className={wuerfelKnopf} onClick={() => spiel.aktionen.probe(f.name, f.wert!)} aria-label={`Probe ${f.name} würfeln`}>{f.name}</button>
                      ) : f.name}</td><td>{f.punkte}</td>
                      <td className="font-bold">{f.wert ?? <span className="font-normal text-leise" title="Kampffertigkeit: Punkte + Attribute der Waffe">+ Waffe</span>}</td>
                      <td className="text-right">
                        {f.angehoben ? (
                          <button type="button" className="text-leise hover:text-schaden cursor-pointer" aria-label={`${f.name} nicht mehr anheben`}
                            onClick={() => aendern({ schwellen: schwellen.filter(x => x !== f.id) })}>angehoben (1 P.) <X size={11} className="inline" /></button>
                        ) : f.punkte < schwelle1 ? (
                          <button type="button" className="text-schrift underline cursor-pointer" onClick={() => aendern({ schwellen: [...schwellen, f.id] })}>
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
            <h4 className="font-bold text-gold-hell mb-1">Stärken</h4>
            <p>{g.staerken.map(i => k.get(i)?.name ?? i).join(', ') || 'keine'}</p>
          </div>

          <div>
            <h4 className="font-bold text-gold-hell mb-1">Meisterschaften</h4>
            <ul className="space-y-0.5">
              {g.kulturMeisterschaft && <li>{g.kulturMeisterschaft.text} <span className="text-leise">(Kultur)</span></li>}
              {g.meisterschaften.map((m, i) => (
                <li key={`${m.id}-${i}`} className="flex items-center gap-1">
                  {!m.ok && <AlertTriangle size={12} className="text-erschoepft" aria-label="Voraussetzung nicht erfüllt" />}
                  {m.name} <span className="text-leise">({m.fertigkeit}, S{m.schwelle}{i < g.freieMeisterschaften ? ', frei durch Schwelle' : ', 1 P.'})</span>
                  <button type="button" aria-label={`Meisterschaft ${m.name} entfernen`} onClick={() => aendern({ meisterschaften: ms.filter((_, j) => j !== i) })}
                    className="p-0.5 rounded-knopf hover:bg-black/5 hover:text-schaden cursor-pointer"><X size={11} /></button>
                </li>
              ))}
            </ul>
            <p className="text-leise">Frei: {g.freieMeisterschaften} (eine je angehobener Fertigkeit); jede weitere kostet 1 Punkt.</p>
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
              <h4 className="font-bold text-gold-hell mb-1">Zauber</h4>
              <ul className="space-y-0.5">
                {g.zauber.map((z, i) => (
                  <li key={`${z.id}-${i}`} className="flex items-center gap-1">
                    {!z.ok && <AlertTriangle size={12} className="text-erschoepft" aria-label="Voraussetzung nicht erfüllt" />}
                    {(() => {
                      const sp = alsSpell(z.id, z.schuleId); const sw = g.fertigkeiten.find(f => f.id === z.schuleId)?.wert;
                      return sp && sw !== null && sw !== undefined
                        ? <button type="button" className={wuerfelKnopf} onClick={() => spiel.aktionen.zaubern?.(sp, sw)} aria-label={`Zauber ${z.name} wirken`}>{z.name}</button>
                        : <>{z.name}</>;
                    })()} <span className="text-leise">({z.schule} {z.grad}{i < g.freieZauber ? ', frei' : ', 1 P.'})</span>
                    <button type="button" aria-label={`Zauber ${z.name} entfernen`} onClick={() => aendern({ zauber: zs.filter((_, j) => j !== i) })}
                      className="p-0.5 rounded-knopf hover:bg-black/5 hover:text-schaden cursor-pointer"><X size={11} /></button>
                  </li>
                ))}
              </ul>
              <p className="text-leise">Frei: {g.freieZauber} (je Magieschule ab 1, 3 und 6 Punkten einer); jeder weitere kostet 1 Punkt.</p>
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
            <ul className="text-erschoepft list-disc pl-4">{g.hinweise.map((h, i) => <li key={i}>{h}</li>)}</ul>
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
        <Users size={18} className="text-schrift" />
        <h3 className="font-bold text-base text-gold-hell">Gefolge</h3>
      </div>
      <p className="text-xs text-leise mb-3">
        Ressource Gefolge: {punkte || 'keine'}; verbraucht {verbraucht}. Jeder Punkt bringt einen Gefolgsmann (Attribute 2 + Rassenmodifikator,
        Werte des Kulturmoduls) oder hebt eine Fertigkeit auf die erste Schwelle oder kauft eine Meisterschaft bzw. einen Zauber.
        Keine Fertigkeit über {maxFertigkeit} (Heldengrad). Den Einsatz entscheidet die Spielleitung (GRW S. 77–78).
        {verbraucht > punkte && <strong className="block text-erschoepft">Das Gefolge braucht mehr Punkte, als die Ressource Gefolge hergibt.</strong>}
      </p>
      <datalist id="gefolge-aufgaben">
        {['Leibdiener', 'Leibdienerin', 'Knappe', 'Leibwächter', 'Zofe', 'Knecht', 'Koch', 'Vorkoster', 'Schildmaid'].map(a => <option key={a} value={a} />)}
      </datalist>

      {eigene.length > 0 && (
        <ul className="space-y-2 mb-3">
          {eigene.map(({ b, i }) => <GefolgeEintrag key={`${b.id}-${i}`} k={k} b={b} index={i} maxFertigkeit={maxFertigkeit} punkteFrei={punkte - verbraucht} />)}
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
          onClick={() => { if (verbraucht + 1 > punkte && regelverstoss('Dafür reichen die Punkte der Ressource Gefolge nicht.')) return; dispatch({ type: 'BEGLEITER_HINZU', payload: { id: kultur, art: 'gefolge', name: k.get(kultur)!.name, rasse } }); setKultur(''); }}>
          <Plus size={12} />Gefolgsmann hinzufügen
        </button>
      </div>
    </section>
  );
};
