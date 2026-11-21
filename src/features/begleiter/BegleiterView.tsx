import React, { useState } from 'react';
import { Plus, Users } from 'lucide-react';
import { useRegelwerk } from '../../regelwerk/RegelwerkContext';
import { useCharacter } from '../../context/CharacterContext';
import type { Katalog } from '../../regelwerk/katalog';
import { Abschnittstitel, Karte, Knopf } from '../../fundament';
import { BegleiterBlatt } from '../../components/begleiter/BegleiterBlatt';
import { BegleiterAssistent } from '../../components/begleiter/assistent/BegleiterAssistent';
import { Hinweise } from '../../components/begleiter/Wertekasten';
import { artInfo, begleiterTitel } from '../../components/begleiter/ansicht';
import { gefolgeVerbraucht, kreaturZuordnung, useBesitzer } from '../../components/begleiter/besitzer';

/**
 * Tab „Begleiter“: je Begleiter ein Blatt wie „Kampf & Magie“ (Leiste oben wählt den Begleiter).
 * Erstellt und bearbeitet wird ausschließlich im Assistenten (Dialog, ein Schritt nach dem anderen). Braucht die Regelpakete.
 */
const Begleiter: React.FC<{ k: Katalog }> = ({ k }) => {
  const { state } = useCharacter();
  const besitzer = useBesitzer(k);
  const alle = state.begleiter ?? [];
  const [wahl, setWahl] = useState(0);
  const [assistent, setAssistent] = useState<{ index?: number } | null>(null);
  const aktiv = alle.length ? Math.min(wahl, alle.length - 1) : -1;

  const tiere = alle.filter(b => b.art === 'tier');
  const vertraute = tiere.filter(b => b.vertrauter).length;
  const gefolge = gefolgeVerbraucht(k, alle, besitzer.maxFertigkeit);
  const hinweise = [
    ...(!kreaturZuordnung(besitzer.kreatur, tiere.map(b => b.kreatur ?? 0)) ? ['Die Tiere nutzen mehr oder höhere Ressourcen Kreatur, als der Charakter hat.'] : []),
    ...(vertraute > 1 ? ['Mehr als ein Vertrauter.'] : []),
    ...(vertraute > 0 && !besitzer.tiervertrauter ? ['Vertrauter ohne die Stärke Tiervertrauter.'] : []),
    ...(gefolge > besitzer.gefolgePunkte ? ['Das Gefolge braucht mehr Punkte, als die Ressource Gefolge hergibt.'] : []),
  ];
  const ressourcen = [
    `Kreatur: ${besitzer.kreatur.length ? besitzer.kreatur.join(', ') : 'keine'}`,
    `Gefolge: ${gefolge}/${besitzer.gefolgePunkte}`,
    ...(besitzer.golemPunkte.length ? [`Golem: ${besitzer.golemPunkte.join(', ')}`] : []),
  ];

  return (
    <>
      <Karte className="space-y-4" data-testid="begleiter-kopf">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="space-y-1 min-w-0">
            <Abschnittstitel className="flex items-center gap-2"><Users size={20} className="text-gold" aria-hidden />Begleiter</Abschnittstitel>
            <p className="text-xs text-leise m-0">Ressourcen – {ressourcen.join(' · ')}</p>
          </div>
          <Knopf art="primaer" onClick={() => setAssistent({})}><Plus size={16} aria-hidden />Begleiter erstellen</Knopf>
        </div>
        {alle.length > 0 && (
          <div className="flex flex-wrap gap-2" role="tablist" aria-label="Begleiter wählen">
            {alle.map((b, i) => {
              const Symbol = artInfo(b.art).symbol;
              return (
                <Knopf key={i} role="tab" aria-selected={i === aktiv} onClick={() => setWahl(i)}
                  className={i === aktiv ? 'border-gold! bg-erhoeht! text-schrift font-bold' : ''}>
                  <Symbol size={16} className={i === aktiv ? 'text-gold' : ''} aria-hidden />{begleiterTitel(b)}
                </Knopf>
              );
            })}
          </div>
        )}
        <Hinweise liste={hinweise} />
      </Karte>

      {aktiv >= 0 ? (
        <BegleiterBlatt key={aktiv} k={k} b={alle[aktiv]} index={aktiv} besitzer={besitzer} bearbeiten={() => setAssistent({ index: aktiv })} />
      ) : (
        <Karte className="text-center space-y-3 py-10">
          <p className="text-sm text-leise m-0">Noch keine Begleiter. Tiere, Gefolgsleute, beschworene Wesen, erhobene Untote und Golems legst du Schritt für Schritt an.</p>
          <Knopf art="sekundaer" onClick={() => setAssistent({})}><Plus size={14} aria-hidden />Ersten Begleiter erstellen</Knopf>
        </Karte>
      )}

      {assistent && (
        <BegleiterAssistent k={k} besitzer={besitzer} index={assistent.index} onSchliessen={() => setAssistent(null)} onFertig={i => setWahl(i)} />
      )}
    </>
  );
};

export const BegleiterView: React.FC = () => {
  const { katalog: k } = useRegelwerk();
  return (
    <div className="p-4 md:p-6 space-y-6 w-full" data-testid="begleiter">
      {!k ? <p className="text-sm text-schrift">Die Regelpakete werden geladen …</p> : <Begleiter k={k} />}
    </div>
  );
};
