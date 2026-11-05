import React, { useRef, useState } from 'react';
import { BookOpen, CheckCircle2, Lock, Trash2, Upload, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useRegelwerk } from '../../regelwerk/RegelwerkContext';

/** Einstellungen → Regelpakete: Grundregelwerk (eingebaut) und hochgeladene Bücher verwalten. */
export const RegelpaketeTab: React.FC = () => {
  const rw = useRegelwerk();
  const eingabe = useRef<HTMLInputElement>(null);
  const [laeuft, setLaeuft] = useState(false);

  const beiDateien = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const dateien = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (!dateien.length) return;
    setLaeuft(true);
    const r = await rw.hochladen(dateien);
    setLaeuft(false);
    if (r.geladen.length) toast.success(`Geladen: ${r.geladen.join(', ')}`);
    for (const f of r.fehler) toast.error(f, { duration: 7000 });
  };

  if (rw.status === 'laedt') return <p className="text-sm text-gray-600 p-4">Regelpakete werden geladen …</p>;
  if (rw.status === 'fehler' || rw.status === 'nicht_verfuegbar') {
    return <p className="text-sm text-red-700 p-4">Regelpakete konnten nicht geladen werden{rw.fehler ? `: ${rw.fehler}` : '.'}</p>;
  }
  const basisInfo = rw.basis!.basis.info;
  const geladen = new Set([basisInfo.id, ...rw.buecher.map(b => b.info.id)]);
  const bekannt = (rw.basis!.manifest.bekannte_pakete ?? []).filter(p => !geladen.has(p.id));
  const anzahl = rw.katalog ? Object.keys(rw.katalog.eintraege).length : 0;

  return (
    <div className="overflow-y-auto space-y-4 pr-1.5 flex-1 custom-scrollbar modal-body-scroll">
      <input ref={eingabe} type="file" accept=".json,application/json" multiple className="hidden" onChange={beiDateien} data-testid="regelpakete-upload" />
      <div className="bg-white/70 p-4 rounded-xl border border-[#d1c4b0]">
        <h3 className="font-bold text-sm text-[#1B365D] mb-1 flex items-center gap-2"><BookOpen size={18} className="text-[#C5A059]" /><span>Geladene Regelwerke</span></h3>
        <p className="text-xs text-gray-600 mb-3">{anzahl} Regeleinträge im Katalog.</p>
        <ul className="space-y-2">
          <li className="flex items-center justify-between gap-2 p-2 rounded-lg border border-[#d1c4b0] bg-white">
            <span className="flex items-center gap-2 text-sm"><Lock size={14} className="text-[#C5A059]" /><strong>{basisInfo.titel}</strong></span>
            <span className="text-xs text-gray-500">eingebaut · {rw.basis!.basis.paket.eintraege.length} Einträge</span>
          </li>
          {rw.buecher.map(b => {
            const aus = rw.ausgelassen.find(a => a.id === b.info.id);
            return (
              <li key={b.info.id} className="flex items-center justify-between gap-2 p-2 rounded-lg border border-[#d1c4b0] bg-white">
                <span className="flex items-center gap-2 text-sm">
                  {aus ? <AlertTriangle size={14} className="text-amber-600" /> : <CheckCircle2 size={14} className="text-green-700" />}
                  <span><strong>{b.info.titel}</strong>{aus && <span className="block text-xs text-amber-700">nicht aktiv: {aus.grund}</span>}</span>
                </span>
                <span className="flex items-center gap-2 text-xs text-gray-500">
                  {b.paket.eintraege.length} Einträge
                  <button type="button" onClick={() => rw.entfernen(b.info.id)} className="p-1 rounded hover:bg-black/5 text-gray-600 hover:text-red-700 cursor-pointer" aria-label={`${b.info.titel} entfernen`} title="Entfernen">
                    <Trash2 size={15} />
                  </button>
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="bg-white/70 p-4 rounded-xl border border-[#d1c4b0]">
        <h3 className="font-bold text-sm text-[#1B365D] mb-1 flex items-center gap-2"><Upload size={18} className="text-[#C5A059]" /><span>Weitere Bücher laden</span></h3>
        <p className="text-xs text-gray-600 leading-relaxed mb-3">
          Wähle Buchpakete aus deinem Ordner <code>Regelpakete/editor/buecher</code> (z. B. <code>magie.srp.json</code>). Sie werden nur in diesem Browser
          gespeichert, nicht hochgeladen und nicht mit anderen geteilt.
          {!rw.dauerhaft && <strong className="block text-amber-700 mt-1">Dieser Browser erlaubt keine dauerhafte Speicherung; die Bücher bleiben nur bis zum Neuladen.</strong>}
        </p>
        <button type="button" disabled={laeuft} onClick={() => eingabe.current?.click()}
          className="px-3 py-2 rounded-lg border border-[#C5A059] bg-[#1B365D] text-[#f3e5cf] hover:bg-[#C5A059] hover:text-[#1B365D] transition-colors cursor-pointer text-sm font-bold flex items-center gap-2 disabled:opacity-50">
          <Upload size={16} />{laeuft ? 'Lade …' : 'Buchpakete auswählen'}
        </button>
        {bekannt.length > 0 && (
          <p className="text-xs text-gray-500 mt-3">Noch nicht geladen: {bekannt.map(p => p.kuerzel).join(', ')}</p>
        )}
        {rw.meldungen.map(m => <p key={m} className="text-xs text-amber-700 mt-2">{m}</p>)}
      </div>
    </div>
  );
};
