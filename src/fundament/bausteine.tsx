/**
 * FUNDAMENT – Bausteine. Aus diesen Teilen setzen sich die Ansichten zusammen (siehe FUNDAMENT.md, Abschnitt „Gestaltung“).
 * Hier stehen keine Farbwerte, nur die benannten Werte aus fundament.css.
 */
import React, { useEffect, useId } from 'react';
import { X } from 'lucide-react';

const zusammen = (...teile: (string | false | null | undefined)[]) => teile.filter(Boolean).join(' ');

// ---------------------------------------------------------------- Knopf
export type KnopfArt = 'primaer' | 'sekundaer' | 'neutral' | 'gefahr' | 'erholung';

const KNOPF: Record<KnopfArt, string> = {
  /** die eine Hauptaktion einer Ansicht oder eines Dialogs */
  primaer: 'bg-gold border-gold text-seite font-bold hover:bg-gold-hell hover:border-gold-hell',
  /** weitere wichtige Aktionen */
  sekundaer: 'bg-transparent border-gold text-gold-hell font-bold hover:bg-erhoeht',
  /** alles Übrige */
  neutral: 'bg-erhoeht border-rahmen text-schrift hover:border-leise',
  /** Schaden, Löschen, Abbrechen mit Verlust */
  gefahr: 'bg-schaden-grund border-schaden text-schrift font-bold hover:bg-erhoeht',
  /** Heilen, Erholen */
  erholung: 'bg-unverletzt-grund border-unverletzt text-schrift font-bold hover:bg-unverletzt hover:text-seite',
};

export interface KnopfProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  art?: KnopfArt;
  /** quadratischer Knopf nur mit Symbol – braucht aria-label */
  nurSymbol?: boolean;
}

/** Schaltfläche. Mindestens 44 px hoch, damit sie auch am Handy sicher zu treffen ist. */
export const Knopf = React.forwardRef<HTMLButtonElement, KnopfProps>(({ art = 'neutral', nurSymbol, className, type = 'button', ...rest }, ref) => (
  <button
    ref={ref}
    type={type}
    className={zusammen(
      'inline-flex items-center justify-center gap-2 min-h-11 rounded-knopf border font-text text-[13px] cursor-pointer transition-colors',
      'disabled:cursor-not-allowed disabled:bg-flaeche disabled:border-rahmen disabled:text-leise disabled:font-normal',
      'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-hell',
      nurSymbol ? 'w-11 px-0' : 'px-[18px]',
      KNOPF[art],
      className,
    )}
    {...rest}
  />
));
Knopf.displayName = 'Knopf';

// ---------------------------------------------------------------- Karte und Titel
/** Fläche für einen zusammengehörigen Bereich */
export const Karte: React.FC<React.HTMLAttributes<HTMLElement> & { als?: 'section' | 'div' }> = ({ als: Tag = 'section', className, ...rest }) => (
  <Tag className={zusammen('bg-flaeche border border-rahmen rounded-karte p-5', className)} {...rest} />
);

/** Titel eines Bereichs (in einer Karte) */
export const Abschnittstitel: React.FC<React.HTMLAttributes<HTMLHeadingElement> & { als?: 'h2' | 'h3' }> = ({ als: Tag = 'h2', className, ...rest }) => (
  <Tag className={zusammen('m-0 font-titel font-bold text-[17px] tracking-[0.06em] text-gold-hell', className)} {...rest} />
);

// ---------------------------------------------------------------- Marke
export type Ton = 'neutral' | 'gold' | 'unverletzt' | 'erschoepft' | 'schaden' | 'kanalisiert' | 'magie' | 'temporaer';

/** Rahmen und Grund je Bedeutung – auch für Kästchen und Hinweisflächen außerhalb der Marke */
export const TON: Record<Ton, string> = {
  neutral: 'bg-erhoeht border-rahmen',
  gold: 'bg-transparent border-gold',
  unverletzt: 'bg-unverletzt-grund border-unverletzt',
  erschoepft: 'bg-erschoepft-grund border-erschoepft',
  schaden: 'bg-schaden-grund border-schaden',
  kanalisiert: 'bg-kanalisiert-grund border-kanalisiert',
  magie: 'bg-magie-grund border-magie',
  temporaer: 'bg-temporaer-grund border-temporaer',
};

/** Kleine Kennzeichnung (Zustand, Bonus, Kosten). Die Bedeutung trägt der Rahmen, der Text bleibt gut lesbar. */
export const Marke: React.FC<React.HTMLAttributes<HTMLSpanElement> & { ton?: Ton; klein?: boolean }> = ({ ton = 'neutral', klein, className, ...rest }) => (
  <span
    className={zusammen(
      'inline-flex items-center gap-1.5 border whitespace-nowrap',
      klein ? 'text-[11px] px-2 py-0.5 rounded-[10px]' : 'text-xs px-3 py-1.5 rounded-2xl',
      ton === 'neutral' ? 'text-leise' : ton === 'gold' ? 'text-gold-hell' : 'text-schrift',
      TON[ton],
      className,
    )}
    {...rest}
  />
);

// ---------------------------------------------------------------- Eingaben
const FELD = 'min-h-11 w-full box-border px-3.5 rounded-knopf border border-rahmen bg-erhoeht text-schrift font-text text-sm placeholder:text-leise focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-gold-hell disabled:text-leise';

/** Beschriftetes Eingabefeld. Die Beschriftung ist Pflicht (für Vorleseprogramme); mit `beschriftungVerborgen` unsichtbar. */
export const Eingabe = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement> & { beschriftung: string; beschriftungVerborgen?: boolean }>(
  ({ beschriftung, beschriftungVerborgen, className, id, ...rest }, ref) => {
    const eigene = useId();
    const feldId = id ?? eigene;
    return (
      <div className="flex flex-col gap-1.5">
        <label htmlFor={feldId} className={beschriftungVerborgen ? 'sr-only' : 'text-xs text-leise'}>{beschriftung}</label>
        <input ref={ref} id={feldId} className={zusammen(FELD, className)} {...rest} />
      </div>
    );
  },
);
Eingabe.displayName = 'Eingabe';

/** Beschriftete Auswahlliste */
export const Auswahl = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement> & { beschriftung: string; beschriftungVerborgen?: boolean }>(
  ({ beschriftung, beschriftungVerborgen, className, id, children, ...rest }, ref) => {
    const eigene = useId();
    const feldId = id ?? eigene;
    return (
      <div className="flex flex-col gap-1.5">
        <label htmlFor={feldId} className={beschriftungVerborgen ? 'sr-only' : 'text-xs text-leise'}>{beschriftung}</label>
        <select ref={ref} id={feldId} className={zusammen(FELD, className)} {...rest}>{children}</select>
      </div>
    );
  },
);
Auswahl.displayName = 'Auswahl';

// ---------------------------------------------------------------- Rollbereich
/** Bereich mit eigenem Scrollbalken (Gestaltung des Balkens: fundament.css). Mit Tastatur erreichbar. */
export const Rollbereich: React.FC<React.HTMLAttributes<HTMLDivElement> & { beschriftung: string }> = ({ beschriftung, className, ...rest }) => (
  <div role="region" aria-label={beschriftung} tabIndex={0} className={zusammen('overflow-y-auto pr-3', className)} {...rest} />
);

// ---------------------------------------------------------------- Rauten
/** Zählbare Punkte als Rauten (z. B. Splitterpunkte): gefüllt = vorhanden, nur Rand = verbraucht. */
export const Rauten: React.FC<{ wert: number; von: number; beschriftung: string; className?: string }> = ({ wert, von, beschriftung, className }) => (
  <div role="img" aria-label={beschriftung} className={zusammen('flex flex-wrap gap-2.5 px-1 py-1', className)}>
    {Array.from({ length: Math.max(von, wert) }).map((_, i) => (
      <span key={i} aria-hidden="true" className={zusammen('w-5 h-5 rotate-45 rounded-[3px] box-border', i < wert ? 'bg-gold' : 'border-2 border-gold')} />
    ))}
  </div>
);

// ---------------------------------------------------------------- Dialog
export interface DialogProps {
  titel: string;
  untertitel?: string;
  onSchliessen: () => void;
  /** Knöpfe unten rechts; die Hauptaktion steht zuletzt */
  fuss?: React.ReactNode;
  breite?: 'schmal' | 'mittel' | 'breit';
  children: React.ReactNode;
}

const BREITE = { schmal: 'max-w-md', mittel: 'max-w-xl', breit: 'max-w-3xl' };

/** Dialog über der Ansicht: Titelzeile mit goldener Linie, rollender Inhalt, Fußzeile mit Aktionen. Schließt mit Escape. */
export const Dialog: React.FC<DialogProps> = ({ titel, untertitel, onSchliessen, fuss, breite = 'mittel', children }) => {
  const titelId = useId();
  useEffect(() => {
    const taste = (e: KeyboardEvent) => { if (e.key === 'Escape') onSchliessen(); };
    document.addEventListener('keydown', taste);
    return () => document.removeEventListener('keydown', taste);
  }, [onSchliessen]);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-seite/80" onMouseDown={(e) => { if (e.target === e.currentTarget) onSchliessen(); }}>
      <div role="dialog" aria-modal="true" aria-labelledby={titelId} className={zusammen('w-full max-h-[90vh] flex flex-col bg-flaeche border border-rahmen rounded-karte overflow-hidden text-schrift font-text text-sm', BREITE[breite])}>
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-gold">
          <div className="min-w-0">
            <h2 id={titelId} className="m-0 font-titel font-bold text-lg tracking-[0.06em] text-schrift">{titel}</h2>
            {untertitel && <div className="text-xs text-leise">{untertitel}</div>}
          </div>
          <Knopf nurSymbol aria-label="Schließen" title="Schließen" onClick={onSchliessen}><X size={16} aria-hidden="true" /></Knopf>
        </div>
        <div className="p-5 overflow-y-auto flex flex-col gap-3.5">{children}</div>
        {fuss && <div className="flex flex-wrap justify-end gap-2.5 px-5 py-4 border-t border-rahmen">{fuss}</div>}
      </div>
    </div>
  );
};
