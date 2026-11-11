/**
 * Prüfungen zum FUNDAMENT (siehe FUNDAMENT.md im Wurzelordner). Sie setzen durch, was dort steht:
 *   1. Farbwerte stehen nur in src/fundament/fundament.css.
 *   2. Regeln hängen nicht an Zauber-, Meisterschafts- oder Stärkennamen im Programmcode.
 *   3. Die Tabelle „Regelquellen“ stimmt mit dem Code überein; nur die dort genannten Dateien lesen Paketdaten.
 * Was heute noch dagegen verstößt, steht als Altlast in src/fundament/altlasten.json und darf nur weniger werden.
 * Altlastenliste nach einer Umstellung neu schreiben:  FUNDAMENT_ALTLASTEN=schreiben npx vitest run src/fundament
 */
import React from 'react';
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { FARBEN_ERLAUBT, WURZEL, farbtabelle, farbwerte, kontrast, kontrastBefunde, paketzugriffe, regelnamenImCode, regelquellen, regelquellenBefunde } from './pruefen';
import { Abschnittstitel, Auswahl, Dialog, Eingabe, Karte, Knopf, Marke, Rauten, Rollbereich } from '..';

const ALTLASTEN = path.join(WURZEL, 'src/fundament/altlasten.json');

describe('Fundament: Altlasten dürfen nur weniger werden', () => {
  const ist = { farbwerte: farbwerte(), regelnamen: regelnamenImCode(), paketzugriffe: paketzugriffe() };
  if (process.env.FUNDAMENT_ALTLASTEN === 'schreiben') {
    fs.writeFileSync(ALTLASTEN, JSON.stringify({
      _hinweis: 'Bekannte Verstöße gegen FUNDAMENT.md. Wird nur kleiner: nach einer Umstellung mit FUNDAMENT_ALTLASTEN=schreiben npx vitest run src/fundament neu schreiben. Nie von Hand erweitern.',
      farbwerte: ist.farbwerte,
      regelnamen: ist.regelnamen,
      paketzugriffe: ist.paketzugriffe,
    }, null, 2) + '\n');
  }
  const soll = JSON.parse(fs.readFileSync(ALTLASTEN, 'utf8')) as { farbwerte: Record<string, number>; regelnamen: string[]; paketzugriffe: string[] };

  it(`Farbwerte stehen nur in ${FARBEN_ERLAUBT}`, () => {
    const zuviel = Object.entries(ist.farbwerte)
      .filter(([datei, n]) => n > (soll.farbwerte[datei] ?? 0))
      .map(([datei, n]) => `${datei}: ${n} Farbwerte (erlaubt: ${soll.farbwerte[datei] ?? 0})`);
    expect(zuviel, 'Neue fest eingetragene Farbwerte. Stattdessen die benannten Werte aus fundament.css verwenden (z. B. bg-flaeche, text-leise, border-gold) oder die Bausteine aus src/fundament.').toEqual([]);
  });

  it('keine neuen Regelnamen im Programmcode', () => {
    const neu = ist.regelnamen.filter((x) => !soll.regelnamen.includes(x));
    expect(neu, 'Ein Zauber-, Meisterschafts- oder Stärkenname steht als Text im Code. Regeln kommen aus den Regelpaketen (FUNDAMENT.md, Regelquellen): den Wert ins Paket legen und über die ID oder das Datenfeld lesen.').toEqual([]);
  });

  it('die Tabelle „Regelquellen“ in FUNDAMENT.md passt zum Code', () => {
    expect(regelquellen().length).toBeGreaterThan(10);
    expect(regelquellenBefunde(), 'FUNDAMENT.md nennt eine Datei, die es nicht gibt, oder ein Feld, das dort nicht gelesen wird. Tabelle und Code zusammen ändern.').toEqual([]);
  });

  it('nur die Dateien aus der Tabelle „Regelquellen“ lesen Paketdaten', () => {
    const neu = ist.paketzugriffe.filter((x) => !soll.paketzugriffe.includes(x));
    expect(neu, 'Eine Datei greift selbst in die Paketdaten (…daten.feld). Das gehört in ein Modul unter src/regelwerk, das in FUNDAMENT.md (Regelquellen) eingetragen ist.').toEqual([]);
  });

  it('Schrift und Hintergrund eines Elements haben genug Kontrast (mindestens 4,5 : 1)', () => {
    expect(kontrastBefunde(4.5), 'Dunkle Schrift auf dunklem Grund oder helle auf hellem. Auf dunklen Flächen und gedämpften Grundtönen text-schrift (oder text-leise), auf Gold text-seite verwenden – siehe FUNDAMENT.md, Gestaltung, Regel 6.').toEqual([]);
  });

  it('die Farben des Fundaments selbst sind miteinander lesbar', () => {
    const f = farbtabelle();
    for (const grund of ['seite', 'flaeche', 'erhoeht', 'unverletzt-grund', 'erschoepft-grund', 'schaden-grund', 'kanalisiert-grund', 'magie-grund', 'temporaer-grund']) {
      expect(kontrast(f[grund], f.schrift), `schrift auf ${grund}`).toBeGreaterThanOrEqual(7);
    }
    for (const grund of ['seite', 'flaeche', 'erhoeht']) expect(kontrast(f[grund], f.leise), `leise auf ${grund}`).toBeGreaterThanOrEqual(4.5);
    for (const grund of ['gold', 'gold-hell']) expect(kontrast(f[grund], f.seite), `seite auf ${grund}`).toBeGreaterThanOrEqual(4.5);
  });

  it('Rauten: gefüllt für vorhandene Punkte, nur Rand für verbrauchte, mit Beschriftung', () => {
    const { getByRole } = render(<Rauten wert={2} von={3} beschriftung="2 von 3 Splitterpunkten" />);
    const r = getByRole('img', { name: '2 von 3 Splitterpunkten' });
    expect([...r.children].map((c) => c.className.includes('bg-gold'))).toEqual([true, true, false]);
  });

  it('Dialoge bauen Hintergrund und Fenster nicht selbst, sondern mit den Bausteinen', () => {
    const eigene: string[] = [];
    const lauf = (d: string) => {
      for (const e of fs.readdirSync(d, { withFileTypes: true })) {
        const p = path.join(d, e.name);
        if (e.isDirectory()) { if (e.name !== 'fundament' && e.name !== '__tests__') lauf(p); continue; }
        if (e.name.endsWith('.tsx') && /fixed inset-0[^"`']*bg-seite\/80|bg-seite\/80[^"`']*fixed inset-0/.test(fs.readFileSync(p, 'utf8'))) eigene.push(path.relative(WURZEL, p));
      }
    };
    lauf(path.join(WURZEL, 'src'));
    expect(eigene, 'Dialoge verwenden Dialoghintergrund und Dialogfenster (oder gleich Dialog) aus src/fundament.').toEqual([]);
  });

  it('die Bausteine selbst enthalten keinen Farbwert', () => {
    expect(ist.farbwerte['src/fundament/bausteine.tsx'] ?? 0).toBe(0);
  });
});

describe('Fundament: Bausteine', () => {
  it('Knopf: echte Schaltfläche, Art bestimmt das Aussehen, gesperrt löst nicht aus', () => {
    const klick = vi.fn();
    render(<><Knopf art="primaer" onClick={klick}>Würfeln</Knopf><Knopf disabled onClick={klick}>Gesperrt</Knopf></>);
    const knopf = screen.getByRole('button', { name: 'Würfeln' });
    expect(knopf.getAttribute('type')).toBe('button');
    expect(knopf.className).toContain('bg-gold');
    fireEvent.click(knopf);
    fireEvent.click(screen.getByRole('button', { name: 'Gesperrt' }));
    expect(klick).toHaveBeenCalledTimes(1);
  });

  it('Eingabe und Auswahl sind mit ihrer Beschriftung verbunden', () => {
    render(<><Eingabe beschriftung="Zusätzlicher Modifikator" defaultValue={0} /><Auswahl beschriftung="Wurfart"><option>Standard</option></Auswahl></>);
    expect(screen.getByLabelText('Zusätzlicher Modifikator').tagName).toBe('INPUT');
    expect(screen.getByLabelText('Wurfart').tagName).toBe('SELECT');
  });

  it('Karte, Titel, Marke und Rollbereich', () => {
    render(<Karte><Abschnittstitel>Zustände</Abschnittstitel><Marke ton="schaden">Blutend 2</Marke><Rollbereich beschriftung="Liste der Fertigkeiten">Inhalt</Rollbereich></Karte>);
    expect(screen.getByRole('heading', { name: 'Zustände' })).toBeTruthy();
    expect(screen.getByText('Blutend 2').className).toContain('border-schaden');
    expect(screen.getByRole('region', { name: 'Liste der Fertigkeiten' }).getAttribute('tabindex')).toBe('0');
  });

  it('Dialog: benannt, schließt über Knopf und Escape', () => {
    const zu = vi.fn();
    render(<Dialog titel="Wahrnehmung" untertitel="Fertigkeitsprobe" onSchliessen={zu} fuss={<Knopf art="primaer">Würfeln</Knopf>}>Inhalt</Dialog>);
    expect(screen.getByRole('dialog', { name: 'Wahrnehmung' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Schließen' }));
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(zu).toHaveBeenCalledTimes(2);
  });
});
