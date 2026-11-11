/**
 * Hausregeln (FUNDAMENT.md, Grundsatz 7): Der Editor sperrt Eingaben, die gegen eine Regel verstoßen.
 * Mit dem Schalter „Hausregeln erlauben“ (Einstellungen) wird aus der Sperre eine Warnung.
 * Jede Regelprüfung im Editor läuft über regelverstoss() bzw. useHausregeln() – keine Ansicht entscheidet das selbst.
 */
import { useSyncExternalStore } from 'react';
import { toast } from 'react-hot-toast';

const SCHLUESSEL = 'fokus_hausregeln';
const hoerer = new Set<() => void>();
let wert: boolean | null = null;

function lesen(): boolean {
  if (wert === null) {
    try { wert = localStorage.getItem(SCHLUESSEL) === '1'; } catch { wert = false; }
  }
  return wert;
}

/** Sind Hausregeln erlaubt? (Standard: nein) */
export function hausregelnErlaubt(): boolean {
  return lesen();
}

export function setzeHausregeln(erlaubt: boolean): void {
  wert = erlaubt;
  try { localStorage.setItem(SCHLUESSEL, erlaubt ? '1' : '0'); } catch { /* Einstellung gilt dann nur bis zum Neuladen */ }
  hoerer.forEach((h) => h());
}

/** Für Ansichten: aktueller Stand, aktualisiert sich beim Umschalten */
export function useHausregeln(): boolean {
  return useSyncExternalStore((h) => { hoerer.add(h); return () => { hoerer.delete(h); }; }, lesen, () => false);
}

/**
 * Meldet einen Regelverstoß. Rückgabe true = Eingabe abbrechen (gesperrt).
 * Mit erlaubten Hausregeln: Warnung anzeigen, Rückgabe false (Eingabe gilt).
 */
export function regelverstoss(meldung: string): boolean {
  if (lesen()) {
    toast(`Hausregel: ${meldung}`, { id: `hausregel:${meldung}` });
    return false;
  }
  toast.error(meldung, { id: `regel:${meldung}` });
  return true;
}
