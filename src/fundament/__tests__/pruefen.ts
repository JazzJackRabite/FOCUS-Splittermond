/**
 * Messungen für die Fundament-Prüfungen: fest eingetragene Farbwerte und Regelnamen im Programmcode.
 * Wird vom Test (fundament.test.tsx) und zum Fortschreiben der Altlastenliste benutzt.
 */
import fs from 'node:fs';
import path from 'node:path';

export const WURZEL = path.resolve(__dirname, '../../..');
const SRC = path.join(WURZEL, 'src');

function dateien(ordner: string, out: string[] = []): string[] {
  for (const e of fs.readdirSync(ordner, { withFileTypes: true })) {
    const p = path.join(ordner, e.name);
    if (e.isDirectory()) { if (e.name !== '__tests__' && e.name !== 'testdaten') dateien(p, out); }
    else if (/\.(tsx?|css)$/.test(e.name) && !/\.test\.tsx?$/.test(e.name)) out.push(p);
  }
  return out;
}
const rel = (p: string) => path.relative(WURZEL, p).split(path.sep).join('/');

/** Die einzige Datei, in der Farbwerte stehen dürfen */
export const FARBEN_ERLAUBT = 'src/fundament/fundament.css';

/** Anzahl fest eingetragener Farbwerte (#RGB, #RRGGBB, rgb(), rgba(), hsl()) je Datei */
export function farbwerte(): Record<string, number> {
  const out: Record<string, number> = {};
  for (const p of dateien(SRC)) {
    const r = rel(p);
    if (r === FARBEN_ERLAUBT) continue;
    const n = (fs.readFileSync(p, 'utf8').match(/#[0-9a-fA-F]{3,8}\b|\brgba?\(|\bhsla?\(/g) ?? []).length;
    if (n) out[r] = n;
  }
  return out;
}

/** Ordner mit Programmcode, in dem keine Regelnamen stehen sollen (src/data sind die eingebauten Listen – eigene Altlast) */
const CODE = ['components', 'context', 'features', 'hooks', 'regelwerk', 'utils', 'fundament'];
const REGELTYPEN = new Set(['zauber', 'meisterschaft', 'staerke']);

/**
 * Zauber-, Meisterschafts- und Stärkennamen des Grundregelwerks, die als Zeichenkette im Programmcode stehen
 * („Datei: Name“). So fällt auf, wenn eine Regel an einem Namen im Code hängt statt an den Daten der Regelpakete.
 */
export function regelnamenImCode(): string[] {
  const paket = JSON.parse(fs.readFileSync(path.join(WURZEL, 'public/regelpakete/grw.srp.json'), 'utf8'));
  const namen = new Set<string>();
  for (const e of paket.eintraege) if (REGELTYPEN.has(e.typ) && e.name.length >= 6) namen.add(e.name.toLowerCase());
  const out = new Set<string>();
  for (const ordner of CODE) {
    const o = path.join(SRC, ordner);
    if (!fs.existsSync(o)) continue;
    for (const p of dateien(o)) {
      if (p.endsWith('.css')) continue;
      const text = fs.readFileSync(p, 'utf8').replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, '');
      for (const m of text.matchAll(/'([^'\n]{6,60})'|"([^"\n]{6,60})"|`([^`\n$]{6,60})`/g)) {
        const s = (m[1] ?? m[2] ?? m[3]).trim().toLowerCase();
        if (namen.has(s)) out.add(`${rel(p)}: ${s}`);
      }
    }
  }
  return [...out].sort();
}
