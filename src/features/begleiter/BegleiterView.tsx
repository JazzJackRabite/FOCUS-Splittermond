import React from 'react';
import { useRegelwerk } from '../../regelwerk/RegelwerkContext';
import { TierAbschnitt } from '../../components/begleiter/TierAbschnitt';
import { WesenAbschnitt } from '../../components/begleiter/WesenAbschnitt';

/** Tab „Begleiter“: Tiere (Tiergefährten, Reittiere, Vertraute) und beschworene Wesen. Braucht die Regelpakete. */
export const BegleiterView: React.FC = () => {
  const { katalog: k } = useRegelwerk();
  return (
    <div className="max-w-5xl mx-auto p-3 sm:p-4 space-y-4" data-testid="begleiter">
      {!k ? (
        <p className="text-sm text-gray-700">Die Regelpakete werden geladen …</p>
      ) : (
        <>
          <TierAbschnitt k={k} />
          <WesenAbschnitt k={k} />
        </>
      )}
    </div>
  );
};
