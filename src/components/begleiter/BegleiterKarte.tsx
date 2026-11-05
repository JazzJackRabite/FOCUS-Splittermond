import React, { useMemo, useState } from 'react';
import { PawPrint, Plus, Trash2, ChevronDown, ChevronRight, Sparkles } from 'lucide-react';
import { useCharacter } from '../../context/CharacterContext';
import { useRegelwerk } from '../../regelwerk/RegelwerkContext';
import { beschwoerbareWesen, diensteFuer, kreaturStufe, tiergefaehrten, wertekasten, type Wertekasten } from '../../regelwerk/begleiter';
import type { Katalog } from '../../regelwerk/katalog';

const ATTR = ['AUS', 'BEW', 'INT', 'KON', 'MYS', 'STÄ', 'VER', 'WIL'];
const ABGL = ['GK', 'GSW', 'LP', 'FO', 'VTD', 'SR', 'KW', 'GW'];

const Werte: React.FC<{ w: Wertekasten }> = ({ w }) => (
  <div className="text-xs space-y-2 text-[#2C1810]">
    <div className="grid grid-cols-8 gap-1 text-center">
      {ATTR.map(a => <div key={a}><div className="font-bold text-[10px] text-gray-500">{a}</div><div>{w.attribute?.[a] ?? '–'}</div></div>)}
    </div>
    <div className="grid grid-cols-8 gap-1 text-center">
      {ABGL.map(a => <div key={a}><div className="font-bold text-[10px] text-gray-500">{a}</div><div>{w.abgeleitete_werte?.[a] ?? '–'}</div></div>)}
    </div>
    {(w.waffen ?? []).length > 0 && (
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead><tr className="text-[10px] text-gray-500"><th>Waffe</th><th>Wert</th><th>Schaden</th><th>WGS</th><th>INI</th><th>Merkmale</th></tr></thead>
          <tbody>{w.waffen!.map((x, i) => <tr key={i}><td>{x.name}</td><td>{x.wert}</td><td>{x.schaden}</td><td>{x.wgs}</td><td>{x.ini}</td><td>{x.merkmale}</td></tr>)}</tbody>
        </table>
      </div>
    )}
    {(['typus', 'fertigkeiten', 'meisterschaften', 'merkmale'] as const).map(f => w.felder?.[f] ? (
      <div key={f}><strong className="capitalize">{f}:</strong> {w.felder[f]}</div>
    ) : null)}
    {w.berechnet && <div className="text-gray-500 italic">Werte berechnet aus „Werte wie … mit folgenden Änderungen“.</div>}
  </div>
);

const Dienste: React.FC<{ k: Katalog; wesen: string }> = ({ k, wesen }) => {
  const { state } = useCharacter();
  const liste = useMemo(() => diensteFuer(k, wesen, state.masteries), [k, wesen, state.masteries]);
  if (!liste.length) return <p className="text-xs text-gray-600">Keine Dienste verfügbar (Paket „Die Magie“ geladen?).</p>;
  const art = { basis: 'Basisdienst', immer: 'immer verfügbar', erweitert: 'Erweiterter Dienst' } as const;
  return (
    <ul className="text-xs space-y-0.5">
      {liste.map(d => <li key={d.id}><strong>{k.get(d.id)?.name ?? d.id}</strong> – {art[d.art]}, {d.kosten}</li>)}
    </ul>
  );
};

/** Begleiter: Tiergefährten über die Ressource Kreatur und beschworene Wesen. Nur mit geladenen Regelpaketen. */
export const BegleiterKarte: React.FC = () => {
  const { katalog: k } = useRegelwerk();
  const { state, dispatch } = useCharacter();
  const [auswahlTier, setAuswahlTier] = useState('');
  const [auswahlWesen, setAuswahlWesen] = useState('');
  const [offen, setOffen] = useState<Record<number, boolean>>({});
  const tiere = useMemo(() => (k ? tiergefaehrten(k) : []), [k]);
  const wesen = useMemo(() => (k ? beschwoerbareWesen(k) : []), [k]);
  if (!k) return null;

  const kreatur = state.resourcesList.filter(r => /^Kreatur\b/.test(r.name)).map(r => Number(r.level) || 0).sort((a, b) => b - a);
  const maxStufe = kreatur[0] ?? 0;
  const begleiter = state.begleiter ?? [];
  const anzahlTiere = begleiter.filter(b => b.art === 'tier').length;

  const hinzu = (art: 'tier' | 'wesen', id: string) => {
    const e = k.get(id); if (!e) return;
    dispatch({ type: 'BEGLEITER_HINZU', payload: { id: e.id, art, name: e.name } });
  };

  return (
    <div className="bg-white bg-opacity-70 rounded-xl border border-[#d1c4b0] shadow p-4" data-testid="begleiter">
      <div className="flex items-center gap-2 mb-2">
        <PawPrint size={18} className="text-[#1B365D]" />
        <h3 className="font-bold text-base text-[#1B365D]">Begleiter</h3>
      </div>
      <p className="text-xs text-gray-600 mb-3">
        Ressource Kreatur: {kreatur.length ? kreatur.join(', ') : 'keine'} – ein Tiergefährte je Ressource, höchstens mit „Kreatur {maxStufe || 'N'}“ (GRW S. 78).
        {anzahlTiere > kreatur.length && <strong className="block text-amber-700">Mehr Tiergefährten als Ressourcen Kreatur.</strong>}
      </p>

      {begleiter.length > 0 && (
        <ul className="space-y-2 mb-3">
          {begleiter.map((b, i) => {
            const e = k.get(b.id); const w = e ? wertekasten(e) : null; const st = e ? kreaturStufe(e) : null;
            return (
              <li key={`${b.id}-${i}`} className="border border-[#d1c4b0] rounded-lg p-2 bg-white">
                <div className="flex items-center justify-between gap-2">
                  <button type="button" className="flex items-center gap-1 text-sm font-bold text-[#1B365D] cursor-pointer" onClick={() => setOffen(o => ({ ...o, [i]: !o[i] }))} aria-expanded={!!offen[i]}>
                    {offen[i] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}{b.name}
                  </button>
                  <span className="flex items-center gap-2 text-xs text-gray-500">
                    {b.art === 'tier' ? `Kreatur ${st ?? '?'}` : `Stufe ${e?.daten.beschwoerbares_wesen_stufe ?? '?'}`}
                    {!e && <span className="text-amber-700">nicht im Katalog (Buch nicht geladen?)</span>}
                    {b.art === 'tier' && st !== null && st > maxStufe && <span className="text-amber-700">Ressource Kreatur zu niedrig</span>}
                    <button type="button" aria-label={`${b.name} entfernen`} onClick={() => dispatch({ type: 'BEGLEITER_ENTFERNEN', payload: { index: i } })}
                      className="p-1 rounded hover:bg-black/5 hover:text-red-700 cursor-pointer"><Trash2 size={14} /></button>
                  </span>
                </div>
                {offen[i] && e && (
                  <div className="mt-2 space-y-2">
                    {w ? <Werte w={w} /> : <p className="text-xs text-gray-600">Keine Werte im Katalog ({e.daten.quelle_text ?? 'anderes Werk'}).</p>}
                    {b.art === 'wesen' && <div><strong className="text-xs">Dienste:</strong><Dienste k={k} wesen={b.id} /></div>}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <div className="flex flex-wrap gap-2 items-center">
        <select value={auswahlTier} onChange={e => setAuswahlTier(e.target.value)} aria-label="Tiergefährte wählen"
          className="border border-[#d1c4b0] rounded px-2 py-1 text-xs bg-white text-[#2C1810] max-w-full">
          <option value="">Tiergefährte wählen …</option>
          {tiere.map(t => <option key={t.id} value={t.id} disabled={t.stufe > maxStufe}>{t.name} (Kreatur {t.stufe}{t.quelle !== 'GRW' ? `, ${t.quelle}` : ''})</option>)}
        </select>
        <button type="button" disabled={!auswahlTier} onClick={() => { hinzu('tier', auswahlTier); setAuswahlTier(''); }}
          className="px-2 py-1 rounded border border-[#C5A059] bg-[#1B365D] text-[#f3e5cf] text-xs font-bold flex items-center gap-1 cursor-pointer disabled:opacity-50"><Plus size={12} />Hinzufügen</button>
      </div>
      {wesen.length > 0 && (
        <div className="flex flex-wrap gap-2 items-center mt-2">
          <Sparkles size={14} className="text-[#C5A059]" />
          <select value={auswahlWesen} onChange={e => setAuswahlWesen(e.target.value)} aria-label="Beschworenes Wesen wählen"
            className="border border-[#d1c4b0] rounded px-2 py-1 text-xs bg-white text-[#2C1810] max-w-full">
            <option value="">Beschworenes Wesen wählen …</option>
            {wesen.map(x => <option key={x.id} value={x.id}>{x.name} (Stufe {x.stufe}, {x.quelle})</option>)}
          </select>
          <button type="button" disabled={!auswahlWesen} onClick={() => { hinzu('wesen', auswahlWesen); setAuswahlWesen(''); }}
            className="px-2 py-1 rounded border border-[#C5A059] bg-[#1B365D] text-[#f3e5cf] text-xs font-bold flex items-center gap-1 cursor-pointer disabled:opacity-50"><Plus size={12} />Hinzufügen</button>
        </div>
      )}
    </div>
  );
};
