import { aenderungGesperrt, regelverstoss } from '../../fundament/hausregeln';
import React, { useMemo, useState } from 'react';
import { Users, Plus, X, Sparkles } from 'lucide-react';
import { useCharacter } from '../../context/CharacterContext';
import {
  ATTRIBUTE, anhebbareFertigkeiten, ersteSchwelle, freieAttribute, gefolgeWerte, gruppenOptionen, kulturModul, kulturen, meisterschaftsAngebot,
  rassen, rasseText, waffenAngebot, zauberAngebot,
} from '../../regelwerk/gefolge';
import { zauberAlsSpell } from '../../regelwerk/bruecke';
import type { Katalog } from '../../regelwerk/katalog';
import type { Begleiter } from '../../types';
import { Werte, Eintrag, Hinweise, Notiz, WuerfelKnopf, MarkeMitEntfernen } from './Wertekasten';
import { BegleiterVitals, VitalKurz, spielDaten, useBegleiterSpiel } from './BegleiterSpiel';
import { Abschnittstitel, Auswahl, Eingabe, Karte, Knopf, Marke } from '../../fundament';

/** Gefolge-Punkte des Abenteurers (Summe der Ressource Gefolge) */
function useGefolgePunkte(): number {
  const { state } = useCharacter();
  return state.resourcesList.filter(r => /^Gefolge\b/.test(r.name)).reduce((s, r) => s + (Number(r.level) || 0), 0);
}

const Titel3: React.FC<{ children: React.ReactNode }> = ({ children }) => <Abschnittstitel als="h3" className="text-[15px]">{children}</Abschnittstitel>;

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
  const mw = kulturModul(k, b.id);
  const plaetze = freieAttribute(k, b.rasse);
  const schwelle1 = ersteSchwelle(k);
  const wahl = b.kulturWahl ?? {};
  const msAngebot = useMemo(() => meisterschaftsAngebot(k, g.fertigkeiten), [k, g.fertigkeiten]);
  const zAngebot = useMemo(() => zauberAngebot(k, g.fertigkeiten), [k, g.fertigkeiten]);
  const alleFertigkeiten = useMemo(() => anhebbareFertigkeiten(k), [k]);
  const titel = b.rufname ? `${b.rufname} (${b.aufgabe || b.name})` : b.aufgabe ? `${b.aufgabe} (${b.name})` : `Gefolgsmann (${b.name})`;
  const schwellen = b.schwellen ?? [];
  const ms = b.meisterschaften ?? [];
  const zs = b.zauber ?? [];
  const ws = b.waffen ?? [];
  const daten = spielDaten(b, g.werte);
  const spiel = useBegleiterSpiel(b, index, daten);
  const wAngebot = useMemo(() => waffenAngebot(k, g.fertigkeiten), [k, g.fertigkeiten]);

  return (
    <Eintrag titel={titel} offen={offen} umschalten={() => setOffen(o => !o)} vor={spiel.modale}
      onEntfernen={() => dispatch({ type: 'BEGLEITER_ENTFERNEN', payload: { index } })}
      marken={<>
        <VitalKurz spiel={spiel} daten={daten} />
        {b.rasse && <span>{k.get(b.rasse)?.name}</span>}
        <Marke klein>{g.punkte} {g.punkte === 1 ? 'Punkt' : 'Punkte'}</Marke>
        {g.hinweise.length > 0 && <Marke klein ton="erschoepft" title={g.hinweise.join('\n')}>{g.hinweise.length} Hinweis{g.hinweise.length > 1 ? 'e' : ''}</Marke>}
        {!kultur && <Marke klein ton="erschoepft">Kultur nicht im Katalog (Grimoire nicht geladen?)</Marke>}
      </>}>
      <div className="flex flex-wrap gap-3 items-end">
        <Eingabe beschriftung="Rufname" value={b.rufname ?? ''} onChange={ev => aendern({ rufname: ev.target.value || undefined })} placeholder="Name" />
        <Eingabe beschriftung="Aufgabe" value={b.aufgabe ?? ''} onChange={ev => aendern({ aufgabe: ev.target.value || undefined })} placeholder="Leibdiener, Knappe …" list="gefolge-aufgaben" />
        <Auswahl beschriftung="Rasse des Gefolgsmanns" value={b.rasse ?? ''} onChange={ev => aendern({ rasse: ev.target.value || undefined, attributFrei: undefined })}>
          <option value="">Rasse wählen …</option>
          {rassen(k).map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
        </Auswahl>
        {plaetze.map((p, i) => (
          <Auswahl key={i} beschriftung={`Freier Attributbonus ${i + 1} (+${p.bonus})`} value={b.attributFrei?.[i] ?? ''}
            onChange={ev => { const l = [...(b.attributFrei ?? [])]; l[i] = ev.target.value; aendern({ attributFrei: l }); }}>
            <option value="">Attribut …</option>
            {ATTRIBUTE.filter(([, n]) => !p.nicht.includes(n) && !(p.unterschiedlich && (b.attributFrei ?? []).some((x, j) => j !== i && x === n)))
              .map(([kurz, n]) => <option key={kurz} value={n}>{n}</option>)}
          </Auswahl>
        ))}
      </div>
      {b.rasse && <p className="text-leise">{rasseText(k, b.rasse)}; sonst alle Attribute 2 (GRW S. 78).</p>}

      {mw && (
        <div className="space-y-2">
          <Titel3>Kulturmodul {b.name}</Titel3>
          <div className="flex flex-wrap gap-3 items-end">
            {mw.fertigkeiten.map((gr, i) => {
              const liste = gruppenOptionen(k, mw.fertigkeiten, i, gr.rest_von != null ? wahl.fertigkeiten?.[String(gr.rest_von)] : undefined);
              if (liste.length <= 1) return null;
              return (
                <Auswahl key={i} beschriftung={`Kultur: ${gr.text}`} value={wahl.fertigkeiten?.[String(i)] ?? ''}
                  onChange={ev => aendern({ kulturWahl: { ...wahl, fertigkeiten: { ...(wahl.fertigkeiten ?? {}), [String(i)]: ev.target.value } } })}>
                  <option value="">wählen …</option>
                  {liste.map(o => <option key={o.id} value={o.id}>{o.text}</option>)}
                </Auswahl>
              );
            })}
            {mw.staerke_optionen.length > 1 && (
              <Auswahl beschriftung="Kultur: Stärke" value={wahl.staerke ?? ''} onChange={ev => aendern({ kulturWahl: { ...wahl, staerke: ev.target.value || undefined } })}>
                <option value="">wählen …</option>
                {mw.staerke_optionen.map(o => <option key={o.id} value={o.id}>{o.text}</option>)}
              </Auswahl>
            )}
            {mw.meisterschaft_optionen.length > 1 && (
              <Auswahl beschriftung="Kultur: Meisterschaft" value={wahl.meisterschaft ?? ''}
                onChange={ev => aendern({ kulturWahl: { ...wahl, meisterschaft: ev.target.value === '' ? undefined : Number(ev.target.value) } })}>
                <option value="">wählen …</option>
                {mw.meisterschaft_optionen.map((o, i) => <option key={i} value={i}>{o.text}</option>)}
              </Auswahl>
            )}
          </div>
        </div>
      )}

      {b.rasse && <BegleiterVitals spiel={spiel} daten={daten} />}
      <Werte w={g.werte} aktionen={spiel.aktionen} zustaende={spiel.zustand.zustaende} />
      <div className="flex flex-wrap gap-2 items-end">
        {ws.length > 0 && <span className="flex flex-wrap gap-2">{g.waffen.filter(x => !x.angeboren).map((x, i) => (
          <MarkeMitEntfernen key={`${x.id}-${i}`} label={`Waffe ${x.name} entfernen`} onEntfernen={() => { const j = ws.indexOf(x.id); aendern({ waffen: ws.filter((_, n) => n !== j) }); }}>
            {x.name} <span className="text-leise">({x.fertigkeit})</span>
          </MarkeMitEntfernen>))}</span>}
        <Auswahl beschriftung="Waffe für Gefolgsmann wählen" beschriftungVerborgen value={wWahl} onChange={ev => setWWahl(ev.target.value)}>
          <option value="">{wAngebot.length ? 'Waffe wählen …' : 'Waffen: erst eine Kampffertigkeit'}</option>
          {[...new Set(wAngebot.map(x => x.fertigkeit))].map(f => (
            <optgroup key={f} label={f}>{wAngebot.filter(x => x.fertigkeit === f).map(x => <option key={x.id} value={x.id}>{x.name} ({x.schaden}{x.modus && x.modus !== 'Nahkampf' ? `, ${x.modus}` : ''})</option>)}</optgroup>
          ))}
        </Auswahl>
        <Knopf disabled={!wWahl} onClick={() => { aendern({ waffen: [...ws, wWahl] }); setWWahl(''); }}><Plus size={14} aria-hidden />Waffe</Knopf>
      </div>

      <div className="space-y-2">
        <Titel3>Fertigkeiten</Titel3>
        {g.fertigkeiten.length === 0 ? <p className="text-leise">Keine.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-separate border-spacing-y-1">
              <thead><tr className="text-xs text-leise"><th>Fertigkeit</th><th>Punkte</th><th>Wert</th><th></th></tr></thead>
              <tbody>
                {g.fertigkeiten.map(f => (
                  <tr key={f.id}>
                    <td className="pr-2">{f.wert !== null
                      ? <WuerfelKnopf onClick={() => spiel.aktionen.probe(f.name, f.wert!)} label={`Probe ${f.name} würfeln`}>{f.name}</WuerfelKnopf>
                      : f.name}</td>
                    <td className="pr-2">{f.punkte}{f.zuHoch && <Marke klein ton="schaden" className="ml-2">über Heldengrad</Marke>}</td>
                    <td className="pr-2 font-titel">{f.wert ?? <span className="font-text text-leise" title="Kampffertigkeit: Punkte + Attribute der Waffe">+ Waffe</span>}</td>
                    <td className="text-right">
                      {f.angehoben ? (
                        <Knopf aria-label={`${f.name} nicht mehr anheben`} onClick={() => aendern({ schwellen: schwellen.filter(x => x !== f.id) })}>angehoben (1 P.) <X size={14} aria-hidden /></Knopf>
                      ) : f.punkte < schwelle1 ? (
                        <Knopf onClick={() => aendern({ schwellen: [...schwellen, f.id] })}>auf {schwelle1} anheben (1 P.)</Knopf>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="flex flex-wrap gap-2 items-end">
          <Auswahl beschriftung="Weitere Fertigkeit anheben" beschriftungVerborgen value={fWahl} onChange={ev => setFWahl(ev.target.value)}>
            <option value="">weitere Fertigkeit auf {schwelle1} …</option>
            {alleFertigkeiten.filter(e => !g.fertigkeiten.some(f => f.id === e.id)).map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
          </Auswahl>
          <Knopf disabled={!fWahl} onClick={() => { aendern({ schwellen: [...schwellen, fWahl] }); setFWahl(''); }}><Plus size={14} aria-hidden />Anheben (1 P.)</Knopf>
        </div>
      </div>

      <div className="space-y-1">
        <Titel3>Stärken</Titel3>
        <p>{g.staerken.map(i => k.get(i)?.name ?? i).join(', ') || 'keine'}</p>
      </div>

      <div className="space-y-2">
        <Titel3>Meisterschaften</Titel3>
        <div className="flex flex-wrap gap-2">
          {g.kulturMeisterschaft && <Marke>{g.kulturMeisterschaft.text} <span className="text-leise">(Kultur)</span></Marke>}
          {g.meisterschaften.map((m, i) => (
            <MarkeMitEntfernen key={`${m.id}-${i}`} ton={m.ok ? 'neutral' : 'erschoepft'} label={`Meisterschaft ${m.name} entfernen`} onEntfernen={() => aendern({ meisterschaften: ms.filter((_, j) => j !== i) })}>
              {m.name} <span className="text-leise">({m.fertigkeit}, S{m.schwelle}{i < g.freieMeisterschaften ? ', frei durch Schwelle' : ', 1 P.'}{m.ok ? '' : ', Voraussetzung fehlt'})</span>
            </MarkeMitEntfernen>
          ))}
        </div>
        <p className="text-leise">Frei: {g.freieMeisterschaften} (eine je angehobener Fertigkeit); jede weitere kostet 1 Punkt.</p>
        <div className="flex flex-wrap gap-2 items-end">
          <Auswahl beschriftung="Meisterschaft für Gefolgsmann wählen" beschriftungVerborgen value={msWahl} onChange={ev => setMsWahl(ev.target.value)}>
            <option value="">Meisterschaft wählen …</option>
            {[...new Set(msAngebot.map(m => m.fertigkeit))].map(f => (
              <optgroup key={f} label={f}>
                {msAngebot.filter(m => m.fertigkeit === f).map(m => <option key={m.id} value={m.id} disabled={ms.includes(m.id) || g.kulturMeisterschaft?.id === m.id}>{m.name} (S{m.schwelle})</option>)}
              </optgroup>
            ))}
          </Auswahl>
          <Knopf disabled={!msWahl} onClick={() => { aendern({ meisterschaften: [...ms, msWahl] }); setMsWahl(''); }}><Plus size={14} aria-hidden />Meisterschaft hinzufügen</Knopf>
        </div>
      </div>

      {(zAngebot.length > 0 || zs.length > 0) && (
        <div className="space-y-2">
          <Titel3>Zauber</Titel3>
          <div className="flex flex-wrap gap-2">
            {g.zauber.map((z, i) => {
              const sp = zauberAlsSpell(k, z.id, z.schuleId); const sw = g.fertigkeiten.find(f => f.id === z.schuleId)?.wert;
              return (
                <span key={`${z.id}-${i}`} className="inline-flex items-center gap-1">
                  {sp && sw !== null && sw !== undefined && (
                    <Knopf className="px-3" aria-label={`Zauber ${z.name} wirken`} onClick={() => spiel.aktionen.zaubern?.(sp, sw)}><Sparkles size={14} aria-hidden />Wirken</Knopf>
                  )}
                  <MarkeMitEntfernen ton={z.ok ? 'magie' : 'erschoepft'} label={`Zauber ${z.name} entfernen`} onEntfernen={() => aendern({ zauber: zs.filter((_, j) => j !== i) })}>
                    {z.name} <span className="text-leise">({z.schule} {z.grad}{i < g.freieZauber ? ', frei' : ', 1 P.'}{z.ok ? '' : ', Voraussetzung fehlt'})</span>
                  </MarkeMitEntfernen>
                </span>
              );
            })}
          </div>
          <p className="text-leise">Frei: {g.freieZauber} (je Magieschule ab 1, 3 und 6 Punkten einer); jeder weitere kostet 1 Punkt.</p>
          <div className="flex flex-wrap gap-2 items-end">
            <Auswahl beschriftung="Zauber für Gefolgsmann wählen" beschriftungVerborgen value={zWahl} onChange={ev => setZWahl(ev.target.value)}>
              <option value="">Zauber wählen …</option>
              {[...new Set(zAngebot.map(z => z.schule))].map(s => (
                <optgroup key={s} label={s}>
                  {zAngebot.filter(z => z.schule === s).map(z => <option key={z.id} value={z.id} disabled={zs.includes(z.id)}>{z.name} (Grad {z.grad})</option>)}
                </optgroup>
              ))}
            </Auswahl>
            <Knopf disabled={!zWahl} onClick={() => { aendern({ zauber: [...zs, zWahl] }); setZWahl(''); }}><Plus size={14} aria-hidden />Zauber hinzufügen</Knopf>
          </div>
        </div>
      )}

      <Hinweise liste={g.hinweise} />
      <Notiz b={b} aendern={aendern} />
    </Eintrag>
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
    <Karte data-testid="begleiter-gefolge" className="space-y-3">
      <div className="flex items-center gap-2">
        <Users size={18} aria-hidden />
        <Abschnittstitel>Gefolge</Abschnittstitel>
      </div>
      <p className="text-sm text-leise">
        Ressource Gefolge: {punkte || 'keine'}; verbraucht {verbraucht}. Jeder Punkt bringt einen Gefolgsmann (Attribute 2 + Rassenmodifikator,
        Werte des Kulturmoduls) oder hebt eine Fertigkeit auf die erste Schwelle oder kauft eine Meisterschaft bzw. einen Zauber.
        Keine Fertigkeit über {maxFertigkeit} (Heldengrad). Den Einsatz entscheidet die Spielleitung (GRW S. 77–78).
      </p>
      {verbraucht > punkte && <Hinweise liste={['Das Gefolge braucht mehr Punkte, als die Ressource Gefolge hergibt.']} />}
      <datalist id="gefolge-aufgaben">
        {['Leibdiener', 'Leibdienerin', 'Knappe', 'Leibwächter', 'Zofe', 'Knecht', 'Koch', 'Vorkoster', 'Schildmaid'].map(a => <option key={a} value={a} />)}
      </datalist>

      {eigene.length > 0 && (
        <ul className="space-y-3">
          {eigene.map(({ b, i }) => <GefolgeEintrag key={`${b.id}-${i}`} k={k} b={b} index={i} maxFertigkeit={maxFertigkeit} punkteFrei={punkte - verbraucht} />)}
        </ul>
      )}

      <div className="flex flex-wrap gap-2 items-end">
        <Auswahl beschriftung="Rasse wählen" beschriftungVerborgen value={rasse} onChange={e => setRasse(e.target.value)}>
          <option value="">Rasse …</option>
          {ra.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
        </Auswahl>
        <Auswahl beschriftung="Kultur wählen" beschriftungVerborgen value={kultur} onChange={e => setKultur(e.target.value)}>
          <option value="">Kultur …</option>
          {ku.map(c => <option key={c.id} value={c.id}>{c.name}{c.quelle.paket !== 'grw' ? ` (${k.pakete[c.quelle.paket]?.kuerzel ?? c.quelle.paket})` : ''}</option>)}
        </Auswahl>
        <Knopf art="sekundaer" disabled={!rasse || !kultur}
          onClick={() => { if (verbraucht + 1 > punkte && regelverstoss('Dafür reichen die Punkte der Ressource Gefolge nicht.')) return; dispatch({ type: 'BEGLEITER_HINZU', payload: { id: kultur, art: 'gefolge', name: k.get(kultur)!.name, rasse } }); setKultur(''); }}>
          <Plus size={14} aria-hidden />Gefolgsmann hinzufügen
        </Knopf>
      </div>
    </Karte>
  );
};
