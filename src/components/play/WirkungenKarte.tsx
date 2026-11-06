import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Sparkles } from 'lucide-react';
import { useCharacter } from '../../context/CharacterContext';
import { wirkungKurz, type CharakterWirkung, type WirkungsStatus } from '../../regelwerk/wirkungen';

const GRUPPEN: { status: WirkungsStatus; titel: string; hinweis: string; offen: boolean }[] = [
  { status: 'verrechnet', titel: 'Eingerechnet', hinweis: 'In Fertigkeits- und abgeleiteten Werten enthalten.', offen: true },
  { status: 'dauerhaft', titel: 'Dauerhaft', hinweis: 'Gilt immer. Behinderung, Tick-Zuschlag und Wundabzüge rechnet der Editor teils schon ein; der Rest steht nicht als Zahl auf dem Bogen.', offen: true },
  { status: 'bedingt', titel: 'In bestimmten Lagen', hinweis: 'Nur wenn die Bedingung erfüllt ist – selbst anwenden.', offen: false },
  { status: 'manoever', titel: 'Bei Manövern', hinweis: 'Nur beim Einsatz des Manövers.', offen: false },
];

const Zeile: React.FC<{ cw: CharakterWirkung }> = ({ cw }) => (
  <li className="text-xs text-[#2C1810] py-0.5" title={cw.wirkung.beleg}>
    <strong>{cw.quelleName}:</strong> {wirkungKurz(cw.wirkung)}
    {cw.wirkung.bedingung && <span className="text-stone-500"> – {cw.wirkung.bedingung}</span>}
    {cw.wirkung.gegen_typus && !cw.wirkung.bedingung && <span className="text-stone-500"> – gegen {cw.wirkung.gegen_typus}</span>}
  </li>
);

/** Wirkungen aus Stärken und Meisterschaften (nur mit Regelpaketen) */
export const WirkungenKarte: React.FC = () => {
  const { calc } = useCharacter();
  const w = calc.wirkungen;
  const [offen, setOffen] = useState<Record<string, boolean>>(() => Object.fromEntries(GRUPPEN.map(g => [g.status, g.offen])));
  if (!w || !w.liste.length) return null;
  return (
    <div className="bg-white bg-opacity-70 rounded-xl border border-[#d1c4b0] shadow p-5" data-testid="wirkungen">
      <div className="flex items-center gap-2 border-b border-[#C5A059] pb-2 mb-3">
        <Sparkles size={18} className="text-[#C5A059]" />
        <h3 className="font-bold text-xl fantasy-font text-[#1B365D]">Wirkungen</h3>
      </div>
      <div className="space-y-2">
        {GRUPPEN.map(g => {
          const liste = w.liste.filter(x => x.status === g.status);
          if (!liste.length) return null;
          return (
            <div key={g.status}>
              <button type="button" onClick={() => setOffen(o => ({ ...o, [g.status]: !o[g.status] }))} aria-expanded={!!offen[g.status]}
                className="flex items-center gap-1 text-sm font-bold text-[#1B365D] cursor-pointer">
                {offen[g.status] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}{g.titel} ({liste.length})
              </button>
              {offen[g.status] && (
                <>
                  <p className="text-[11px] text-stone-500 ml-5">{g.hinweis}</p>
                  <ul className="ml-5">{liste.map((cw, i) => <Zeile key={`${cw.quelle}-${i}`} cw={cw} />)}</ul>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
