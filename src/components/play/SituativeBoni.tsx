import React, { useContext, useMemo, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { CharacterContext } from '../../context/CharacterContext';
import { aktiverKatalog } from '../../regelwerk/bruecke';
import { situativeBoni, type SituativerBonus, type WurfArtKontext } from '../../regelwerk/wirkungen';

/**
 * Bedingte Wirkungen aus Stärken und Meisterschaften für einen Wurf: zum Anklicken, wenn die Lage zutrifft.
 * Ohne Regelpakete oder ohne passende Wirkungen liefert der Hook eine leere Liste.
 */
export function useSituativeBoni(art: WurfArtKontext, fertigkeit: string) {
  const ctx = useContext(CharacterContext);
  const liste = ctx?.calc?.wirkungen?.liste;
  const attribute = ctx?.calc?.currentAttributes;
  const boni = useMemo(() => {
    const k = aktiverKatalog();
    return k && liste ? situativeBoni(k, liste, art, fertigkeit, attribute) : [];
  }, [liste, art, fertigkeit, attribute]);
  const [gewaehlt, setGewaehlt] = useState<Set<string>>(new Set());
  const umschalten = (id: string) => setGewaehlt(g => { const n = new Set(g); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const aktiv = boni.filter(b => gewaehlt.has(b.id) && b.wert !== null);
  const summe = aktiv.reduce((s, b) => s + (b.wert ?? 0), 0);
  const labels = aktiv.map(b => `${b.quelle} (${b.wert! >= 0 ? '+' : ''}${b.wert})`);
  return { boni, gewaehlt, umschalten, summe, labels };
}

const vorzeichen = (n: number) => (n >= 0 ? `+${n}` : `${n}`);

export const SituativeBoni: React.FC<{
  boni: SituativerBonus[];
  gewaehlt: Set<string>;
  onToggle: (id: string) => void;
  dunkel?: boolean;
}> = ({ boni, gewaehlt, onToggle, dunkel = false }) => {
  if (!boni.length) return null;
  const verrechenbar = boni.filter(b => b.wert !== null);
  const hinweise = boni.filter(b => b.wert === null);
  const rahmen = dunkel ? 'bg-[#0f1722] border-[#263547] text-stone-300' : 'bg-[#e3d4b9] border-[#d1c4b0] text-[#2C1810]';
  const titel = dunkel ? 'text-[#C5A059]' : 'text-[#1B365D]';
  return (
    <div className={`rounded-xl p-3 mb-3 border ${rahmen}`} data-testid="situative-boni">
      <div className={`text-xs font-bold uppercase tracking-wider fantasy-font flex items-center gap-1.5 mb-1 ${titel}`}>
        <Sparkles size={14} className="text-[#C5A059]" /> Stärken & Meisterschaften
      </div>
      {verrechenbar.length > 0 && (
        <>
          <p className={`text-xs mb-2 ${dunkel ? 'text-stone-400' : 'text-stone-600'}`}>Gilt nur in bestimmten Lagen – anklicken, wenn sie zutrifft:</p>
          <div className="flex flex-wrap gap-1.5">
            {verrechenbar.map(b => {
              const an = gewaehlt.has(b.id);
              return (
                <button key={b.id} type="button" onClick={() => onToggle(b.id)} aria-pressed={an} title={b.beleg}
                  className={`text-left px-2.5 py-1 rounded-lg text-xs border transition-all cursor-pointer ${an
                    ? 'bg-[#2F5D3A] text-white border-[#244a2e] font-bold'
                    : dunkel ? 'bg-[#15202e] text-stone-300 border-[#2b3a4f] hover:bg-[#1a293f]' : 'bg-white/90 text-stone-700 border-[#d1c4b0] hover:bg-white'}`}>
                  <span className="font-mono font-bold mr-1">{vorzeichen(b.wert!)}</span>
                  <span className="font-semibold">{b.quelle}</span>
                  {b.bedingung && <span className={an ? 'text-white/80' : 'opacity-75'}> – {b.bedingung}</span>}
                  {!b.bedingung && <span className={an ? 'text-white/80' : 'opacity-75'}> – {b.text}</span>}
                </button>
              );
            })}
          </div>
        </>
      )}
      {hinweise.length > 0 && (
        <ul className={`mt-2 text-xs space-y-0.5 ${dunkel ? 'text-stone-400' : 'text-stone-600'}`}>
          {hinweise.map(b => (
            <li key={b.id} title={b.beleg}><strong>{b.quelle}:</strong> {b.text}{b.bedingung ? ` – ${b.bedingung}` : ''}</li>
          ))}
        </ul>
      )}
    </div>
  );
};
