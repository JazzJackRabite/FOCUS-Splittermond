import React from 'react';
import { useRegelwerk } from '../../regelwerk/RegelwerkContext';
import { TierAbschnitt } from '../../components/begleiter/TierAbschnitt';
import { WesenAbschnitt } from '../../components/begleiter/WesenAbschnitt';
import { GefolgeAbschnitt } from '../../components/begleiter/GefolgeAbschnitt';
import { UntotAbschnitt } from '../../components/begleiter/UntotAbschnitt';
import { GolemAbschnitt } from '../../components/begleiter/GolemAbschnitt';

/** Tab „Begleiter“: Tiere (Tiergefährten, Reittiere, Vertraute), Gefolge, beschworene Wesen, erhobene Untote und Golems. Braucht die Regelpakete. */
export const BegleiterView: React.FC = () => {
  const { katalog: k } = useRegelwerk();
  return (
    <div className="max-w-5xl mx-auto p-3 sm:p-4 space-y-4" data-testid="begleiter">
      {!k ? (
        <p className="text-sm text-schrift">Die Regelpakete werden geladen …</p>
      ) : (
        <>
          <TierAbschnitt k={k} />
          <GefolgeAbschnitt k={k} />
          <WesenAbschnitt k={k} />
          <UntotAbschnitt k={k} />
          <GolemAbschnitt k={k} />
        </>
      )}
    </div>
  );
};
