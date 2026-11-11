import { regelverstoss } from '../../fundament/hausregeln';
import React, { useMemo, useState } from 'react';
import { Gem, Plus, Minus, Trash2, Pencil, X, Info, AlertTriangle } from 'lucide-react';
import { useCharacter } from '../../context/CharacterContext';
import { useRegelwerk } from '../../regelwerk/RegelwerkContext';
import { alleAusruestung, type AusruestungsItem } from '../../regelwerk/ausruestung';
import {
  AUSWAHL, GEGENSTANDSARTEN, artVon, kostenVon, passtZu, pruefeRelikt, reliktAlsInventar, reliktBaukasten, reliktBausteine, ressourcePunkte,
  type BausteinInfo,
} from '../../regelwerk/relikte';
import type { Katalog } from '../../regelwerk/katalog';
import type { Relikt, ReliktBaustein } from '../../types';
import { generateId } from '../../utils/id';

const knopf = 'px-2 py-1 rounded-knopf border border-gold bg-erhoeht text-schrift text-xs font-bold flex items-center gap-1 cursor-pointer disabled:opacity-50';
const feld = 'border border-rahmen rounded-knopf px-2 py-1 text-xs bg-flaeche text-schrift';

const typName = (k: Katalog, typ: string) => (typ === 'material' ? 'Besondere Materialien' : k.manifest.typen?.[typ]?.bezeichnung ?? typ);

/** Auswahl zu einem Baustein (Zauber des gewählten Grades, sonst Freitext) */
const AuswahlFeld: React.FC<{ k: Katalog; b: BausteinInfo; w: ReliktBaustein; setze: (w: Partial<ReliktBaustein>) => void }> = ({ k, b, w, setze }) => {
  const zauber = useMemo(() => {
    if (b.auswahl !== 'zauber') return [];
    return k.nachTyp('zauber').filter(z => ((z.daten.schulen ?? []) as Array<{ grad: number | null }>).some(s => s.grad === (w.grad ?? 0)))
      .map(z => z.name).sort((a, c) => a.localeCompare(c, 'de'));
  }, [k, b.auswahl, w.grad]);
  if (!b.auswahl) return null;
  if (b.auswahl === 'zauber') {
    return (
      <select value={w.auswahl ?? ''} onChange={e => setze({ auswahl: e.target.value })} aria-label="Zauber wählen" className={`${feld} max-w-[14rem]`}>
        <option value="">Zauber (Grad {w.grad ?? 0}) …</option>
        {zauber.map(n => <option key={n} value={n}>{n}</option>)}
      </select>
    );
  }
  return <input value={w.auswahl ?? ''} onChange={e => setze({ auswahl: e.target.value })} placeholder={AUSWAHL[b.auswahl] ?? b.auswahl} aria-label={AUSWAHL[b.auswahl] ?? b.auswahl} className={`${feld} w-40`} />;
};

const Werkstatt: React.FC<{ k: Katalog; start: Relikt; frei: number; schliessen: () => void }> = ({ k, start, frei, schliessen }) => {
  const { state, dispatch } = useCharacter();
  const bk = useMemo(() => reliktBaukasten(k), [k]);
  const bausteine = useMemo(() => reliktBausteine(k, bk), [k, bk]);
  const ausruestung = useMemo(() => alleAusruestung(k).filter(i => i.type !== 'alchemika'), [k]);
  const [r, setR] = useState<Relikt>(start);
  const [suche, setSuche] = useState('');
  const [basisSuche, setBasisSuche] = useState(start.basisName ?? '');
  const [alleZeigen, setAlleZeigen] = useState(false);
  const [info, setInfo] = useState<string | null>(null);

  const basis: AusruestungsItem | null = useMemo(() => ausruestung.find(i => i.id === r.basisId) ?? null, [ausruestung, r.basisId]);
  const pruefung = pruefeRelikt(r, bausteine, bk, basis);
  const nachId = useMemo(() => new Map(bausteine.map(b => [b.id, b])), [bausteine]);

  const basisTreffer = useMemo(() => {
    const q = basisSuche.trim().toLowerCase();
    if (!q || q === (basis?.name ?? '').toLowerCase()) return [];
    return ausruestung.filter(i => i.name.toLowerCase().includes(q)).slice(0, 12);
  }, [basisSuche, ausruestung, basis]);

  const sichtbar = bausteine.filter(b => (alleZeigen || passtZu(b, r.art)) && (!suche.trim() || b.name.toLowerCase().includes(suche.trim().toLowerCase())));
  const gruppen = (bk?.typen ?? []).map(t => ({ typ: t, liste: sichtbar.filter(b => b.typ === t) })).filter(g => g.liste.length);

  const hinzu = (b: BausteinInfo) => setR(x => {
    const vorhanden = x.bausteine.findIndex(w => w.id === b.id);
    if (vorhanden >= 0 && !b.auswahl && !b.kostenNachGrad && !b.kostenJe)
      return { ...x, bausteine: x.bausteine.map((w, i) => (i === vorhanden ? { ...w, anzahl: (w.anzahl || 1) + 1 } : w)) };
    return { ...x, bausteine: [...x.bausteine, { id: b.id, name: b.name, anzahl: 1, ...(b.kostenNachGrad ? { grad: b.kostenNachGrad[0].grad } : {}), ...(b.kostenJe ? { stufe: 1 } : {}) }] };
  });
  const setzeW = (i: number, u: Partial<ReliktBaustein>) => setR(x => ({ ...x, bausteine: x.bausteine.map((w, j) => (j === i ? { ...w, ...u } : w)) }));
  const entferneW = (i: number) => setR(x => ({ ...x, bausteine: x.bausteine.filter((_, j) => j !== i) }));

  const speichern = () => {
    if (pruefung.warnungen.length && regelverstoss(`Das Relikt verstößt gegen die Regeln: ${pruefung.warnungen[0]}`)) return;
    const relikt: Relikt = { ...r, name: r.name.trim() || basis?.name || 'Relikt', basisName: basis?.name ?? (basisSuche.trim() || undefined) };
    const alt = (state.inventory ?? []).find(it => it.id === relikt.inventarId);
    dispatch({ type: 'RELIKT_SPEICHERN', payload: { relikt, inventar: reliktAlsInventar(relikt, bausteine, basis, alt) } });
    schliessen();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-seite/80 p-4 overflow-y-auto" role="dialog" aria-label="Relikt-Werkstatt">
      <div className="bg-flaeche border border-rahmen rounded-karte shadow-2xl max-w-5xl w-full p-5 space-y-3 max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between border-b border-rahmen pb-2">
          <h3 className="font-bold text-lg text-gold-hell flex items-center gap-2"><Gem size={18} className="text-gold" />Relikt-Werkstatt</h3>
          <button type="button" onClick={schliessen} aria-label="Schließen" className="min-h-11 min-w-11 inline-flex items-center justify-center rounded-knopf border border-rahmen bg-erhoeht text-schrift hover:border-gold transition-colors"><X size={18} /></button>
        </div>

        <div className="grid md:grid-cols-2 gap-4 min-h-0 flex-1 overflow-y-auto md:overflow-hidden">
          {/* links: Relikt */}
          <div className="space-y-3 text-xs text-schrift md:overflow-y-auto md:pr-1">
            <label className="block">
              <span className="font-bold text-schrift">Name</span>
              <input value={r.name} onChange={e => setR({ ...r, name: e.target.value })} placeholder="z. B. Großvaters Klinge" className={`${feld} w-full mt-0.5`} />
            </label>
            <div className="relative">
              <span className="font-bold text-schrift">Grundgegenstand</span>
              <input value={basisSuche} onChange={e => setBasisSuche(e.target.value)} placeholder="Ausrüstung suchen (oder frei benennen)" aria-label="Grundgegenstand" className={`${feld} w-full mt-0.5`} />
              {basisTreffer.length > 0 && (
                <ul className="absolute z-10 left-0 right-0 bg-flaeche border border-rahmen rounded-knopf max-h-56 overflow-y-auto">
                  {basisTreffer.map(i => (
                    <li key={i.id}>
                      <button type="button" className="w-full text-left px-2 py-1 hover:bg-rahmen cursor-pointer"
                        onClick={() => { setR({ ...r, basisId: i.id, art: artVon(i), name: r.name || i.name }); setBasisSuche(i.name); }}>
                        {i.name} <span className="text-leise">({i.category}, {i.source})</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {basis && <p className="text-[11px] text-leise mt-0.5">{basis.category} · {basis.source}{basis.page ? ` S. ${basis.page}` : ''}{(basis as { attributes?: string }).attributes ? ` · ${(basis as { attributes?: string }).attributes}` : ''}</p>}
            </div>
            <div className="flex flex-wrap gap-3 items-end">
              <label>
                <span className="font-bold text-schrift block">Art</span>
                <select value={r.art} onChange={e => setR({ ...r, art: e.target.value })} aria-label="Art des Gegenstands" className={feld}>
                  {Object.entries(GEGENSTANDSARTEN).map(([a, n]) => <option key={a} value={a}>{n}</option>)}
                </select>
              </label>
              <label>
                <span className="font-bold text-schrift block">Punkte</span>
                <input type="number" min={1} value={r.punkte} onChange={e => setR({ ...r, punkte: Math.max(0, parseInt(e.target.value, 10) || 0) })} aria-label="Punkte des Relikts" className={`${feld} w-16`} />
              </label>
              <span className="text-leise">noch frei aus der Ressource Relikt: {frei}</span>
            </div>

            <div>
              <div className="font-bold text-schrift mb-1">Bausteine</div>
              {r.bausteine.length === 0 && <p className="italic text-leise">Noch keine Bausteine – rechts auswählen.</p>}
              <ul className="space-y-1.5">
                {r.bausteine.map((w, i) => {
                  const b = nachId.get(w.id);
                  return (
                    <li key={`${w.id}-${i}`} className="border border-rahmen rounded-knopf p-1.5 bg-flaeche flex flex-wrap items-center gap-1.5">
                      <span className="font-semibold">{b?.name ?? w.name ?? w.id}</span>
                      {b?.kostenNachGrad && (
                        <select value={w.grad ?? 0} onChange={e => setzeW(i, { grad: Number(e.target.value), auswahl: '' })} aria-label="Zaubergrad" className={feld}>
                          {b.kostenNachGrad.map(g => <option key={g.grad} value={g.grad}>Grad {g.grad}</option>)}
                        </select>
                      )}
                      {b?.kostenJe === 'stufe' && (
                        <label className="flex items-center gap-1">Stufe<input type="number" min={1} value={w.stufe ?? 1} onChange={e => setzeW(i, { stufe: Math.max(1, parseInt(e.target.value, 10) || 1) })} className={`${feld} w-12`} /></label>
                      )}
                      {b && <AuswahlFeld k={k} b={b} w={w} setze={u => setzeW(i, u)} />}
                      {b && b.maxAnzahl !== 1 && !b.auswahl && !b.kostenNachGrad && (
                        <span className="flex items-center gap-0.5">
                          <button type="button" aria-label="weniger" onClick={() => (w.anzahl > 1 ? setzeW(i, { anzahl: w.anzahl - 1 }) : entferneW(i))} className="p-0.5 rounded-knopf border border-rahmen cursor-pointer"><Minus size={10} /></button>
                          <span className="w-5 text-center">{w.anzahl}</span>
                          <button type="button" aria-label="mehr" onClick={() => setzeW(i, { anzahl: w.anzahl + 1 })} className="p-0.5 rounded-knopf border border-rahmen cursor-pointer"><Plus size={10} /></button>
                        </span>
                      )}
                      <span className="ml-auto text-leise">{b ? `${kostenVon(b, w)} P.` : '?'}</span>
                      <button type="button" aria-label={`${b?.name ?? w.id} entfernen`} onClick={() => entferneW(i)} className="p-1 rounded-knopf hover:bg-black/5 hover:text-schaden cursor-pointer"><Trash2 size={12} /></button>
                    </li>
                  );
                })}
              </ul>
            </div>

            <label className="block">
              <span className="font-bold text-schrift">Notiz (Herkunft, legendäre Taten …)</span>
              <textarea value={r.notiz ?? ''} onChange={e => setR({ ...r, notiz: e.target.value })} rows={2} className={`${feld} w-full mt-0.5`} />
            </label>

            <div className={`rounded-knopf p-2 border ${pruefung.warnungen.length ? 'bg-erschoepft-grund border-erschoepft' : 'bg-unverletzt-grund border-unverletzt'}`} data-testid="relikt-pruefung">
              <div className="font-bold">{pruefung.verwendet} von {r.punkte} Punkten verwendet</div>
              {pruefung.warnungen.map((t, i) => <div key={i} className="flex gap-1 text-erschoepft"><AlertTriangle size={12} className="shrink-0 mt-0.5" />{t}</div>)}
            </div>
          </div>

          {/* rechts: Bausteine aus den Regelpaketen */}
          <div className="space-y-2 text-xs text-schrift md:overflow-y-auto md:pr-1">
            <div className="flex flex-wrap gap-2 items-center">
              <input value={suche} onChange={e => setSuche(e.target.value)} placeholder="Bausteine suchen" aria-label="Bausteine suchen" className={`${feld} flex-1 min-w-[10rem]`} />
              <label className="flex items-center gap-1"><input type="checkbox" checked={alleZeigen} onChange={e => setAlleZeigen(e.target.checked)} />auch unpassende</label>
            </div>
            {gruppen.map(g => (
              <div key={g.typ}>
                <div className="font-bold text-schrift border-b border-rahmen mb-1">{typName(k, g.typ)}</div>
                <ul className="space-y-1">
                  {g.liste.map(b => (
                    <li key={b.id} className="bg-flaeche border border-rahmen rounded-knopf p-1.5">
                      <div className="flex items-center gap-1.5">
                        <button type="button" onClick={() => hinzu(b)} aria-label={`${b.name} hinzufügen`} className="p-0.5 rounded-knopf bg-erhoeht text-schrift cursor-pointer"><Plus size={12} /></button>
                        <span className="font-semibold">{b.name}</span>
                        <span className="text-leise">
                          {b.kostenNachGrad ? `${b.kostenNachGrad.map(g2 => g2.kosten).join('/')} P. je Grad` : `${b.kosten} P.${b.kostenJe ? ' je Stufe' : ''}`}
                          {b.maxAnzahl !== null ? `, max. ${b.maxAnzahl}×` : ''}{b.mindestPunkte ? `, ab ${b.mindestPunkte} P.` : ''}
                        </span>
                        <span className="ml-auto text-[11px] text-leise">{b.quelle}</span>
                        <button type="button" onClick={() => setInfo(info === b.id ? null : b.id)} aria-label={`${b.name}: Beschreibung`} className="p-0.5 rounded-knopf hover:bg-black/5 cursor-pointer"><Info size={12} /></button>
                      </div>
                      {info === b.id && <p className="mt-1 whitespace-pre-line text-schrift">{b.beschreibung || '—'}</p>}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            {!gruppen.length && <p className="italic text-leise">Keine passenden Bausteine.</p>}
            <p className="text-[11px] text-leise">Regeln: {(bk?.quellen ?? []).map(e => quelleKurz(k, e.quelle.paket, e.quelle.buch_seiten)).join(' · ')}</p>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-rahmen pt-2">
          <button type="button" onClick={schliessen} className="min-h-11 px-3 py-1.5 rounded-knopf border border-rahmen text-xs cursor-pointer">Abbrechen</button>
          <button type="button" onClick={speichern} className="min-h-11 bg-gold hover:bg-gold text-seite font-bold px-5 py-1.5 rounded-knopf text-xs cursor-pointer">Relikt speichern</button>
        </div>
      </div>
    </div>
  );
};

function quelleKurz(k: Katalog, paket: string, seiten?: number[]) {
  const kz = k.pakete[paket]?.kuerzel ?? paket.toUpperCase();
  return seiten?.length ? `${kz} S. ${seiten[0]}` : kz;
}

/** Relikte des Charakters im Inventar. Nur mit Regelpaketen, die einen Relikt-Baukasten festlegen (GRW). */
export const ReliktKarte: React.FC = () => {
  const { katalog: k } = useRegelwerk();
  const { state, dispatch } = useCharacter();
  const [bearbeiten, setBearbeiten] = useState<Relikt | null>(null);
  const bk = useMemo(() => reliktBaukasten(k), [k]);
  const bausteine = useMemo(() => reliktBausteine(k, bk), [k, bk]);
  if (!k || !bk) return null;

  const relikte = state.relikte ?? [];
  const ressource = ressourcePunkte(state.resourcesList);
  const vergeben = relikte.reduce((s, r) => s + (r.punkte || 0), 0);
  const nachId = new Map(bausteine.map(b => [b.id, b]));
  const neu = (): Relikt => ({ id: generateId(), name: '', punkte: Math.max(1, ressource - vergeben), art: 'nahkampfwaffe', bausteine: [], inventarId: generateId() });

  return (
    <div className="bg-flaeche bg-opacity-70 rounded-karte border border-rahmen p-4" data-testid="relikte">
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <Gem size={18} className="text-schrift" />
          <h3 className="font-bold text-base text-gold-hell">Relikte</h3>
        </div>
        <button type="button" onClick={() => setBearbeiten(neu())} className={knopf}><Plus size={12} />Relikt bauen</button>
      </div>
      <p className="text-xs text-leise mb-2">
        Ressource Relikt: {ressource} Punkte, davon in Relikten {vergeben}.
        {vergeben > ressource && <strong className="block text-erschoepft">Mehr Punkte in Relikten als in der Ressource Relikt.</strong>}
        {ressource === 0 && <span className="block">Ohne die Ressource Relikt kann ein Relikt nur mit Zustimmung der Spielleitung entstehen.</span>}
      </p>
      {relikte.length > 0 && (
        <ul className="space-y-2">
          {relikte.map(r => {
            const p = pruefeRelikt(r, bausteine, bk, alleAusruestung(k).find(i => i.id === r.basisId) ?? null);
            const imInventar = (state.inventory ?? []).some(it => it.id === r.inventarId);
            return (
              <li key={r.id} className="border border-rahmen rounded-knopf p-2 bg-flaeche text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-schrift">{r.name}</span>
                  <span className="text-leise">{r.basisName ? `${r.basisName}, ` : ''}{p.verwendet}/{r.punkte} Punkte</span>
                  {p.warnungen.length > 0 && <span className="text-erschoepft flex items-center gap-0.5" title={p.warnungen.join('\n')}><AlertTriangle size={12} />{p.warnungen.length}</span>}
                  {!imInventar && <span className="text-erschoepft">nicht im Inventar – „Bearbeiten“ und speichern legt ihn neu an</span>}
                  <span className="ml-auto flex gap-1">
                    <button type="button" aria-label={`${r.name} bearbeiten`} onClick={() => setBearbeiten(r)} className="p-1 rounded-knopf hover:bg-black/5 cursor-pointer"><Pencil size={13} /></button>
                    <button type="button" aria-label={`${r.name} löschen`} onClick={() => { if (window.confirm(`Relikt „${r.name}“ und seinen Inventareintrag löschen?`)) dispatch({ type: 'RELIKT_LOESCHEN', payload: { id: r.id } }); }}
                      className="p-1 rounded-knopf hover:bg-black/5 hover:text-schaden cursor-pointer"><Trash2 size={13} /></button>
                  </span>
                </div>
                {r.bausteine.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {r.bausteine.map((w, i) => {
                      const b = nachId.get(w.id);
                      return <span key={i} className="bg-erhoeht text-schrift border border-rahmen px-1.5 py-0.5 rounded-knopf">
                        {b?.name ?? w.name ?? w.id}{w.anzahl > 1 ? ` ×${w.anzahl}` : ''}{w.auswahl ? ` (${w.auswahl})` : ''}
                      </span>;
                    })}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {bearbeiten && <Werkstatt k={k} start={bearbeiten} frei={ressource - vergeben + ((state.relikte ?? []).find(x => x.id === bearbeiten.id)?.punkte ?? 0)} schliessen={() => setBearbeiten(null)} />}
    </div>
  );
};
