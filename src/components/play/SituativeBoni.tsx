import React, { useContext, useMemo, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { CharacterContext } from '../../context/CharacterContext';
import { aktiverKatalog } from '../../regelwerk/bruecke';
import { situativeBoni, zauberAnpassungen, type KostenDelta, type SituativerBonus, type WurfArtKontext, type ZauberAnpassung } from '../../regelwerk/wirkungen';

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

/**
 * Wirkungen auf Zaubermechanik (Kosten, Zauberdauer; Schwierigkeit, Reichweite … als Hinweis) für einen Zauber der Schule.
 * Gewählte Kostenänderungen und Zauberdauer-Änderungen werden vom Zauber-Dialog verrechnet.
 */
export function useZauberAnpassungen(schule: string, kanalisiert: boolean) {
  const ctx = useContext(CharacterContext);
  const liste = ctx?.calc?.wirkungen?.liste;
  const anpassungen = useMemo(() => {
    const k = aktiverKatalog();
    return k && liste ? zauberAnpassungen(k, liste, schule, kanalisiert) : [];
  }, [liste, schule, kanalisiert]);
  const [gewaehlt, setGewaehlt] = useState<Set<string>>(new Set());
  const umschalten = (id: string) => setGewaehlt(g => { const n = new Set(g); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const { kosten, dauer, labels } = useMemo(() => {
    const aktiv = anpassungen.filter(a => gewaehlt.has(a.id) && a.art !== 'hinweis');
    return {
      kosten: aktiv.flatMap(a => (a.kosten ? [a.kosten] : [])) as KostenDelta[],
      dauer: aktiv.flatMap(a => (a.dauer ? [a.dauer] : [])),
      labels: aktiv.map(a => `${a.quelle}: ${a.text}`),
    };
  }, [anpassungen, gewaehlt]);
  return { anpassungen, gewaehlt, umschalten, kosten, dauer, labels };
}

export const ZauberAnpassungen: React.FC<{
  anpassungen: ZauberAnpassung[];
  gewaehlt: Set<string>;
  onToggle: (id: string) => void;
}> = ({ anpassungen, gewaehlt, onToggle }) => {
  if (!anpassungen.length) return null;
  // je Meisterschaft ein Knopf (Kosten und Zauberdauer gemeinsam)
  const waehlbar = Object.values(anpassungen.filter(a => a.art !== 'hinweis').reduce<Record<string, { id: string; quelle: string; texte: string[]; bedingungen: string[]; beleg: string }>>((m, a) => {
    const g = (m[a.id] ??= { id: a.id, quelle: a.quelle, texte: [], bedingungen: [], beleg: '' });
    g.texte.push(a.text);
    if (a.bedingung && !g.bedingungen.includes(a.bedingung)) g.bedingungen.push(a.bedingung);
    g.beleg = g.beleg ? `${g.beleg} · ${a.beleg}` : a.beleg;
    return m;
  }, {}));
  const hinweise = anpassungen.filter(a => a.art === 'hinweis');
  return (
    <div className="rounded-xl p-3 border bg-[#e3d4b9] border-[#d1c4b0] text-[#2C1810]" data-testid="zauber-anpassungen">
      <div className="text-xs font-bold uppercase tracking-wider fantasy-font flex items-center gap-1.5 mb-1 text-[#1B365D]">
        <Sparkles size={14} className="text-[#C5A059]" /> Kosten & Zauberdauer aus Meisterschaften
      </div>
      {waehlbar.length > 0 && (
        <>
          <p className="text-xs mb-2 text-stone-600">Anklicken, wenn die Meisterschaft für diesen Zauber gilt bzw. genutzt wird – wird in Kosten und Zauberdauer eingerechnet:</p>
          <div className="flex flex-wrap gap-1.5">
            {waehlbar.map(a => {
              const an = gewaehlt.has(a.id);
              return (
                <button key={a.id} type="button" onClick={() => onToggle(a.id)} aria-pressed={an} title={a.beleg}
                  className={`text-left px-2.5 py-1 rounded-lg text-xs border transition-all cursor-pointer ${an
                    ? 'bg-[#2F5D3A] text-white border-[#244a2e] font-bold'
                    : 'bg-white/90 text-stone-700 border-[#d1c4b0] hover:bg-white'}`}>
                  <span className="font-mono font-bold mr-1">{a.texte.join(', ')}</span>
                  <span className="font-semibold">{a.quelle}</span>
                  {a.bedingungen.length > 0 && <span className={an ? 'text-white/80' : 'opacity-75'}> – {a.bedingungen.join('; ')}</span>}
                </button>
              );
            })}
          </div>
        </>
      )}
      {hinweise.length > 0 && (
        <ul className="mt-2 text-xs space-y-0.5 text-stone-600">
          {hinweise.map((a, i) => (
            <li key={`${a.id}-${i}`} title={a.beleg}><strong>{a.quelle}:</strong> {a.text}{a.bedingung ? ` – ${a.bedingung}` : ''}</li>
          ))}
        </ul>
      )}
    </div>
  );
};
