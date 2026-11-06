import React, { useMemo, useState } from 'react';
import { Sparkles, Plus, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import { useCharacter } from '../../context/CharacterContext';
import { beschwoerbareWesen, diensteFuer, wertekasten } from '../../regelwerk/begleiter';
import type { Katalog } from '../../regelwerk/katalog';
import { Werte, auswahl, karte, knopf } from './Wertekasten';

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

/** Beschworene Wesen (Die Magie S. 186–191) mit ihren Diensten */
export const WesenAbschnitt: React.FC<{ k: Katalog }> = ({ k }) => {
  const { state, dispatch } = useCharacter();
  const [wahl, setWahl] = useState('');
  const [offen, setOffen] = useState<Record<number, boolean>>({});
  const wesen = useMemo(() => beschwoerbareWesen(k), [k]);
  const liste = (state.begleiter ?? []).map((b, i) => ({ b, i })).filter(x => x.b.art === 'wesen');

  return (
    <section className={karte} data-testid="begleiter-wesen">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles size={18} className="text-[#C5A059]" />
        <h3 className="font-bold text-base text-[#1B365D]">Beschworene Wesen</h3>
      </div>
      {!wesen.length && !liste.length && (
        <p className="text-xs text-gray-600">Beschwörbare Wesen und ihre Dienste stehen im Buchpaket „Die Magie“ (Einstellungen → Regelpakete).</p>
      )}
      {liste.length > 0 && (
        <ul className="space-y-2 mb-3">
          {liste.map(({ b, i }) => {
            const e = k.get(b.id); const w = e ? wertekasten(e) : null;
            return (
              <li key={`${b.id}-${i}`} className="border border-[#d1c4b0] rounded-lg p-2 bg-white">
                <div className="flex items-center justify-between gap-2">
                  <button type="button" className="flex items-center gap-1 text-sm font-bold text-[#1B365D] cursor-pointer" onClick={() => setOffen(o => ({ ...o, [i]: !o[i] }))} aria-expanded={!!offen[i]}>
                    {offen[i] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}{b.name}
                  </button>
                  <span className="flex items-center gap-2 text-xs text-gray-500">
                    Stufe {e?.daten.beschwoerbares_wesen_stufe ?? '?'}
                    {!e && <span className="text-amber-700">nicht im Katalog (Buch nicht geladen?)</span>}
                    <button type="button" aria-label={`${b.name} entfernen`} onClick={() => dispatch({ type: 'BEGLEITER_ENTFERNEN', payload: { index: i } })}
                      className="p-1 rounded hover:bg-black/5 hover:text-red-700 cursor-pointer"><Trash2 size={14} /></button>
                  </span>
                </div>
                {offen[i] && e && (
                  <div className="mt-2 space-y-2">
                    {w ? <Werte w={w} /> : <p className="text-xs text-gray-600">Keine Werte im Katalog ({e.daten.quelle_text ?? 'anderes Werk'}).</p>}
                    <div><strong className="text-xs">Dienste:</strong><Dienste k={k} wesen={b.id} /></div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {wesen.length > 0 && (
        <div className="flex flex-wrap gap-2 items-center">
          <select value={wahl} onChange={e => setWahl(e.target.value)} aria-label="Beschworenes Wesen wählen" className={auswahl}>
            <option value="">Beschworenes Wesen wählen …</option>
            {wesen.map(x => <option key={x.id} value={x.id}>{x.name} (Stufe {x.stufe}, {x.quelle})</option>)}
          </select>
          <button type="button" disabled={!wahl} className={knopf} onClick={() => {
            const e = k.get(wahl); if (!e) return;
            dispatch({ type: 'BEGLEITER_HINZU', payload: { id: e.id, art: 'wesen', name: e.name } }); setWahl('');
          }}><Plus size={12} />Wesen hinzufügen</button>
        </div>
      )}
    </section>
  );
};
