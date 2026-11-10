import React from 'react';
import { Swords } from 'lucide-react';
import type { Wertekasten } from '../../regelwerk/begleiter';
import type { Aktionen } from './BegleiterSpiel';
import DiceIcon from '../ui/DiceIcon';

const ATTR = ['AUS', 'BEW', 'INT', 'KON', 'MYS', 'STÄ', 'VER', 'WIL'];
const ABGL = ['GK', 'GSW', 'LP', 'FO', 'VTD', 'SR', 'KW', 'GW'];

/** Kommas außerhalb von Klammern trennen */
function teile(s: string): string[] {
  const out: string[] = []; let tiefe = 0; let akt = '';
  for (const c of s) {
    if (c === '(') tiefe++; if (c === ')') tiefe--;
    if (c === ',' && tiefe === 0) { out.push(akt); akt = ''; } else akt += c;
  }
  out.push(akt);
  return out.map(x => x.trim()).filter(Boolean);
}

/** „Akrobatik 8, Athletik 10“ → [{name, wert}]; Einträge ohne Zahl bleiben Text */
export function fertigkeitenAusText(t: string): { name: string; wert: number | null; text: string }[] {
  return teile(t).map(x => {
    const m = x.match(/^(.+?)\s+(\d+)(?:\s*\(.*\))?$/);
    return m ? { name: m[1], wert: Number(m[2]), text: x } : { name: x, wert: null, text: x };
  });
}

export const wuerfelKnopf = 'inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded border border-[#C5A059] bg-[#faf4e6] text-[#1B365D] font-bold hover:bg-[#ebdcc3] cursor-pointer';
const Wuerfel: React.FC = () => <DiceIcon size={11} fill="#faf4e6" stroke="#1B365D" />;

/** Wertekasten eines Tieres oder Wesens; mit `aktionen` sind Fertigkeiten, Angriffe und Schaden Würfelknöpfe */
export const Werte: React.FC<{ w: Wertekasten; aktionen?: Aktionen }> = ({ w, aktionen }) => (
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
          <tbody>{w.waffen!.map((x, i) => (
            <tr key={i}>
              <td>{x.name}</td>
              <td>{aktionen ? (
                <button type="button" className={wuerfelKnopf} onClick={() => aktionen.angriff(x)} aria-label={`Angriff ${x.name} würfeln`}><Swords size={11} />{x.wert}</button>
              ) : x.wert}</td>
              <td>{aktionen ? (
                <button type="button" className={wuerfelKnopf} onClick={() => aktionen.schaden(x)} aria-label={`Schaden ${x.name} würfeln`}><Wuerfel />{x.schaden}</button>
              ) : x.schaden}</td>
              <td>{x.wgs}</td><td>{x.ini}</td><td>{x.merkmale}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    )}
    {w.felder?.typus && <div><strong>Typus:</strong> {w.felder.typus}</div>}
    {w.felder?.fertigkeiten && (
      aktionen ? (
        <div className="flex flex-wrap gap-1 items-center"><strong className="mr-1">Fertigkeiten:</strong>
          {fertigkeitenAusText(w.felder.fertigkeiten).map((f, i) => f.wert !== null ? (
            <button key={i} type="button" className={wuerfelKnopf} onClick={() => aktionen.probe(f.name, f.wert!)} aria-label={`Probe ${f.name} würfeln`}>
              <Wuerfel />{f.name} {f.wert}
            </button>
          ) : <span key={i}>{f.text}</span>)}
        </div>
      ) : <div><strong>Fertigkeiten:</strong> {w.felder.fertigkeiten}</div>
    )}
    {(['meisterschaften', 'merkmale'] as const).map(f => w.felder?.[f] ? (
      <div key={f}><strong className="capitalize">{f}:</strong> {w.felder[f]}</div>
    ) : null)}
    {w.berechnet && <div className="text-gray-500 italic">Werte berechnet aus „Werte wie … mit folgenden Änderungen“.</div>}
  </div>
);

export const knopf = 'px-2 py-1 rounded border border-[#C5A059] bg-[#1B365D] text-[#f3e5cf] text-xs font-bold flex items-center gap-1 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';
export const auswahl = 'border border-[#d1c4b0] rounded px-2 py-1 text-xs bg-white text-[#2C1810] max-w-full';
export const karte = 'bg-white bg-opacity-70 rounded-xl border border-[#d1c4b0] shadow p-4';
