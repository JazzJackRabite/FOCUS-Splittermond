import React from 'react';
import type { Wertekasten } from '../../regelwerk/begleiter';

const ATTR = ['AUS', 'BEW', 'INT', 'KON', 'MYS', 'STÄ', 'VER', 'WIL'];
const ABGL = ['GK', 'GSW', 'LP', 'FO', 'VTD', 'SR', 'KW', 'GW'];

/** Wertekasten eines Tieres oder Wesens aus dem Katalog */
export const Werte: React.FC<{ w: Wertekasten }> = ({ w }) => (
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

export const knopf = 'px-2 py-1 rounded border border-[#C5A059] bg-[#1B365D] text-[#f3e5cf] text-xs font-bold flex items-center gap-1 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';
export const auswahl = 'border border-[#d1c4b0] rounded px-2 py-1 text-xs bg-white text-[#2C1810] max-w-full';
export const karte = 'bg-white bg-opacity-70 rounded-xl border border-[#d1c4b0] shadow p-4';
