/**
 * Spielwerte für Begleiter aus den Paketen (Datenseite begleiter_werte.py, 21.11.2026):
 * Abrichtungen mit Zahlen und Wahlen, Zusammenführen doppelter Merkmale, Verbesserte Angriffe, Vertrautenmagie.
 * Teile mit Grimoires laufen nur, wenn FOKUS_GRIMOIRES auf die Grimoires zeigt.
 */
import fs from 'fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { basisAusDateien, grimoireDatei } from './hilfen';
import { erstelleKatalog, grimoireLesen } from '../laden';
import { Katalog } from '../katalog';
import { merkmaleZusammenfuehren, leseModifikationen, anwenden, type MerkmalRegel } from '../modifikationen';
import { tierGrundwerte, tierWerte } from '../abrichtungsWerte';
import { wesenBaukastenWerte } from '../wesenBaukasten';
import { vertrautenMeisterschaften, alleVertrautenMeisterschaften, alleVertrautenZauber } from '../vertraute';
import type { Begleiter } from '../../types';

const b = basisAusDateien();
const GRW = new Katalog(b.manifest, [b.basis]);

describe('Merkmale zusammenführen (ohne Grimoires)', () => {
  const regel: MerkmalRegel = {
    ersetzen: [{ merkmal: 'Dämmersicht', ab: 2, wird: 'Dunkelsicht' }], stufen_addieren: true, andere_doppelte_entfallen: true,
    beide_entfallen: [['Feigling', 'Furchtimmunität']], beide_entfallen_ausser_mehrfach: ['Furchtimmunität'], robuster_lp: 2,
  };
  it('Ersetzen, Stufen addieren, Aufheben, Doppelte entfallen', () => {
    expect(merkmaleZusammenfuehren(['Dämmersicht', 'Dämmersicht', 'Flugwesen'], regel)).toEqual(['Flugwesen', 'Dunkelsicht']);
    expect(merkmaleZusammenfuehren(['Rüstungsbrecher 1', 'Rüstungsbrecher 2'], regel)).toEqual(['Rüstungsbrecher 3']);
    expect(merkmaleZusammenfuehren(['Feigling', 'Furchtimmunität', 'Flugwesen'], regel)).toEqual(['Flugwesen']);
    expect(merkmaleZusammenfuehren(['Feigling', 'Furchtimmunität', 'Furchtimmunität'], regel)).toEqual(['Furchtimmunität']);
    expect(merkmaleZusammenfuehren(['Flugwesen', 'Flugwesen'], { ...regel, stufen_addieren: false })).toEqual(['Flugwesen']);
  });
  it('„Merkmal X N oder +M“ und „Waffenmerkmal X N oder +M“', () => {
    const m = leseModifikationen(GRW, 'Angriff +2, Merkmal Furchterregend 15 oder +5, Waffenmerkmal Kritisch 1 oder +1');
    expect(m.merkmaleStufe).toEqual([{ name: 'Furchterregend', neu: 15, plus: 5 }]);
    expect(m.waffenmerkmaleStufe).toEqual([{ name: 'Kritisch', neu: 1, plus: 1 }]);
    const w = { attribute: {}, abgeleitet: { LP: 10 }, fertigkeiten: [], merkmale: ['Furchterregend 15'], waffen: [{ name: 'Biss', wert: 10, schaden: '1W6', wgs: '6', ini: '5', merkmale: 'Kritisch 1, Scharf 2' }] };
    const neu = anwenden(GRW, w, m);
    expect(neu.merkmale).toEqual(['Furchterregend 20']);
    expect(neu.waffen[0]).toMatchObject({ wert: 12, merkmale: 'Kritisch 2, Scharf 2' });
    expect(anwenden(GRW, { ...w, merkmale: [] }, m).merkmale).toEqual(['Furchterregend 15']);
  });
});

const BESTIEN = grimoireDatei('bestien');
const MAGIE = grimoireDatei('magie');
const mitGrimoires = !!BESTIEN && fs.existsSync(BESTIEN) && !!MAGIE && fs.existsSync(MAGIE);

describe.skipIf(!mitGrimoires)('mit „Bestienmeister“ und „Die Magie“ (lokal)', () => {
  let K: Katalog;
  beforeAll(() => {
    K = erstelleKatalog(b, [grimoireLesen(fs.readFileSync(BESTIEN, 'utf-8'), b.manifest), grimoireLesen(fs.readFileSync(MAGIE, 'utf-8'), b.manifest)]).katalog;
  });
  const wolf = (x: Partial<Begleiter> = {}): Begleiter => ({ id: 'grw:kreatur:wolf', art: 'tier', name: 'Wolf', ...x });

  it('Abrichtungen mit Zahlen: Angreifer, Kämpfer, Knurren, Renner', () => {
    const g = tierGrundwerte(K, K.get('grw:kreatur:wolf'))!;
    const angriff = g.waffen[0].wert; const vtd = g.abgeleitet.VTD;
    const t = tierWerte(K, wolf({ abrichtungen: ['bestien:abrichtung:angreifer', 'bestien:abrichtung:kaempfer', 'bestien:abrichtung:furchterregendes-knurren'] }), g, []);
    expect(t.geaendert).toBe(true);
    expect(t.werte!.waffen[0].wert).toBe(angriff + 5);
    expect(t.werte!.waffen[0].merkmale).toMatch(/Kritisch 1/);
    expect(t.werte!.abgeleitet.VTD).toBe(vtd + 2);
    expect(t.werte!.merkmale).toContain('Furchterregend 15');
    // Kämpfer: Meisterschaft in Handgemenge bis zur Schwelle der Kampfabrichter-Meisterschaft des Abrichters
    const ms = t.wahlen.find(w => w.w.art === 'meisterschaft')!;
    expect(ms.schwelle).toBe(0);
    expect(tierWerte(K, wolf({ abrichtungen: ['bestien:abrichtung:kaempfer'] }), g, ['bestien:meisterschaft:tierfuehrung:kampfabrichter-ii']).wahlen[0].schwelle).toBe(2);

    const p = tierGrundwerte(K, K.get('grw:kreatur:pferd'))!;
    const r = tierWerte(K, { id: 'grw:kreatur:pferd', art: 'tier', name: 'Pferd', abrichtungen: ['bestien:abrichtung:renner'] }, p, []);
    expect(r.werte!.abgeleitet.GSW).toBe(p.abgeleitet.GSW + 3);
    expect(r.werte!.merkmale).toContain('Erschöpfungsresistenz 2'); // Pferd hat Erschöpfungsresistenz 1
  });

  it('Wahlen: Gefestigt lässt Feigling entfallen, Verbesserte Fähigkeiten verlangen unterschiedliche Fertigkeiten', () => {
    const g = tierGrundwerte(K, K.get('grw:kreatur:wolf'))!;
    expect(g.merkmale).toContain('Feigling');
    const t = tierWerte(K, wolf({ abrichtungen: ['bestien:abrichtung:gefestigt'], abrichtungWahlen: { '0:0': '2' } }), g, []);
    expect(t.werte!.merkmale).not.toContain('Feigling');
    const ath = g.fertigkeiten.find(f => f.id === 'grw:fertigkeit:athletik')!.wert;
    const v = tierWerte(K, wolf({ abrichtungen: ['bestien:abrichtung:verbesserte-faehigkeiten'], abrichtungWahlen: { '0:0': 'grw:fertigkeit:athletik', '0:1': 'grw:fertigkeit:athletik' } }), g, []);
    expect(v.werte!.fertigkeiten.find(f => f.id === 'grw:fertigkeit:athletik')!.wert).toBe(ath + 6);
    expect(v.hinweise.some(h => /unterschiedlich/.test(h))).toBe(true);
    // Abrichtungen ohne Zahlen ändern nichts
    expect(tierWerte(K, wolf({ abrichtungen: ['bestien:abrichtung:apportieren'] }), g, []).geaendert).toBe(false);
  });

  it('Verbesserte Angriffe: Punkte aus Kämpfer + Korpus Mittel, Käufe über die Punkte sind ein Hinweis', () => {
    const mittel = Object.values(K.eintraege).find(e => e.typ === 'wesen_baukasten_basis' && e.name === 'Mittel')!;
    const w0 = wesenBaukastenWerte(K, { id: mittel.id, art: 'wesen', name: 'W', bausteine: ['magie:wesen_baukasten_rolle:kaempfer'] });
    expect(w0.verbesserteAngriffe).toMatchObject({ punkte: 2, verbraucht: 0 });
    const n = w0.werte!.waffen.length;
    const w1 = wesenBaukastenWerte(K, { id: mittel.id, art: 'wesen', name: 'W', bausteine: ['magie:wesen_baukasten_rolle:kaempfer'], verbesserteAngriffe: ['stumpf', 'set:3'] });
    expect(w1.verbesserteAngriffe).toMatchObject({ punkte: 2, verbraucht: 4 });
    expect(w1.werte!.waffen).toHaveLength(n + 1);
    expect(w1.werte!.waffen.some(x => /Stumpf/.test(x.merkmale))).toBe(false);
    expect(w1.hinweise.some(h => h.schluessel === 'va:punkte')).toBe(true);
  });

  it('Vertrautenmagie: Meisterschaften und Zauber aus den Paketen', () => {
    expect(alleVertrautenMeisterschaften(K).map(e => e.id)).toContain('grw:meisterschaft:naturmagie:vertrautenband');
    expect(alleVertrautenZauber(K).length).toBeGreaterThan(0);
    expect(vertrautenMeisterschaften(K, ['grw:meisterschaft:naturmagie:vertrautenband', 'grw:meisterschaft:handgemenge:umreissen']).map(e => e.id))
      .toEqual(['grw:meisterschaft:naturmagie:vertrautenband']);
  });
});
