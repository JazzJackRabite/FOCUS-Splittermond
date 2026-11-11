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

export const wuerfelKnopf = 'inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-knopf border border-gold bg-erhoeht text-schrift font-bold hover:bg-rahmen cursor-pointer';
const Wuerfel: React.FC = () => <DiceIcon size={11} />;

/** Wertekasten eines Tieres oder Wesens; mit `aktionen` sind Fertigkeiten, Angriffe und Schaden Würfelknöpfe */
export const Werte: React.FC<{ w: Wertekasten; aktionen?: Aktionen }> = ({ w, aktionen }) => (
  <div className="text-xs space-y-2 text-schrift">
    <div className="grid grid-cols-8 gap-1 text-center">
      {ATTR.map(a => <div key={a}><div className="font-bold text-[11px] text-leise">{a}</div><div>{w.attribute?.[a] ?? '–'}</div></div>)}
    </div>
    <div className="grid grid-cols-8 gap-1 text-center">
      {ABGL.map(a => <div key={a}><div className="font-bold text-[11px] text-leise">{a}</div><div>{w.abgeleitete_werte?.[a] ?? '–'}</div></div>)}
    </div>
    {(w.waffen ?? []).length > 0 && (
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead><tr className="text-[11px] text-leise"><th>Waffe</th><th>Wert</th><th>Schaden</th><th>WGS</th><th>INI</th><th>Merkmale</th></tr></thead>
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
    {w.berechnet && <div className="text-leise italic">Werte berechnet aus „Werte wie … mit folgenden Änderungen“.</div>}
  </div>
);

export const knopf = 'px-2 py-1 rounded-knopf border border-gold bg-erhoeht text-schrift text-xs font-bold flex items-center gap-1 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';
export const auswahl = 'border border-rahmen rounded-knopf px-2 py-1 text-xs bg-flaeche text-schrift max-w-full';
export const karte = 'bg-flaeche bg-opacity-70 rounded-karte border border-rahmen p-4';
