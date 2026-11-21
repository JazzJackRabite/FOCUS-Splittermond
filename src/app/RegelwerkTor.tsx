/**
 * Der Editor startet erst, wenn das Grundregelwerk-Paket geladen ist: alle Regeln kommen aus den Paketen,
 * eingebaute Rückfall-Listen gibt es nicht mehr (FUNDAMENT.md, Grundsatz 2).
 */
import React from 'react';
import { useRegelwerk } from '../regelwerk/RegelwerkContext';
import { Knopf } from '../fundament';

export const RegelwerkTor: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { status, fehler } = useRegelwerk();
  if (status === 'bereit') return <>{children}</>;
  return (
    <main className="min-h-screen bg-seite text-schrift font-text flex items-center justify-center p-4">
      <div className="bg-flaeche border border-rahmen rounded-karte p-6 max-w-md w-full text-center space-y-3" role="status" aria-live="polite">
        <h1 className="font-titel text-gold-hell text-xl">FOKUS</h1>
        {status === 'fehler' ? (
          <>
            <p>Das Grundregelwerk konnte nicht geladen werden.</p>
            {fehler && <p className="text-xs text-leise break-words">{fehler}</p>}
            <Knopf art="primaer" onClick={() => window.location.reload()}>Neu laden</Knopf>
          </>
        ) : (
          <p className="text-leise">Regelwerk wird geladen …</p>
        )}
      </div>
    </main>
  );
};
