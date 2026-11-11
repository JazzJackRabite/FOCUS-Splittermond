/**
 * Spielwerte der Begleiter: Würfeln mit den üblichen Modalen (Probe, Angriff, Zauber) und Lebenspunkte/Fokus je Begleiter.
 * Die Modale bekommen die Werte und Wundabzüge des Begleiters; Boni aus Stärken und Meisterschaften des Charakters gelten
 * nicht (der Charakter-Kontext wird für die Modale ohne Wirkungen weitergegeben), Splitterpunkte hat nur der Abenteurer.
 */
import React, { useContext, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import { Heart, Sparkles, RotateCcw, Coffee, HeartCrack, HeartPulse } from 'lucide-react';
import { CharacterContext, useCharacter } from '../../context/CharacterContext';
import { usePlaySessionOptional } from '../../context/PlaySessionContext';
import { RollModal } from '../play/RollModal';
import { AttackModal, type AttackTargetConfig } from '../play/AttackModal';
import { CastSpellModal } from '../play/CastSpellModal';
import { TakeDamageModal } from '../play/TakeDamageModal';
import { HealModal } from '../play/HealModal';
import type { RollEntry } from '../play/DiceLog';
import { aktiverKatalog } from '../../regelwerk/bruecke';
import { betaeubungsimmun, fokusFrei, gesundheitsfelder, gesundheitsstufen, lebenslage, schadenEintragen, type BegleiterZustand } from '../../regelwerk/vitals';
import type { Begleiter, Spell } from '../../types';
import type { Wertekasten } from '../../regelwerk/begleiter';
import { generateId } from '../../utils/id';
import { auswahl } from './Wertekasten';

export interface Waffe { name: string; wert: string | number; schaden: string; wgs: string; ini?: string; merkmale?: string }
export interface Aktionen {
  probe: (fertigkeit: string, wert: number) => void;
  angriff: (w: Waffe) => void;
  schaden: (w: Waffe) => void;
  zaubern?: (z: Spell, schulwert: number) => void;
}

const zahl = (s: unknown) => { const n = Number.parseInt(String(s ?? '').replace(/[−–]/g, '-'), 10); return Number.isFinite(n) ? n : 0; };
const zeit = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

/** Charakter-Kontext ohne Wirkungen: so zeigen die Modale keine Boni des Abenteurers */
const OhneCharakterBoni: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const ctx = useContext(CharacterContext);
  // ohne Wirkungen des Abenteurers; Höchstbonus aus Zauberei nicht nach seinem Heldengrad (Begleiter: Heldengrad 1)
  const wert = useMemo(() => (ctx ? {
    ...ctx,
    calc: { ...ctx.calc, wirkungen: undefined, heldengrad: undefined, regelwerk: ctx.calc?.regelwerk ? { ...ctx.calc.regelwerk, hoechstbonus: undefined } : ctx.calc?.regelwerk },
  } : null), [ctx]);
  return wert ? <CharacterContext.Provider value={wert as typeof ctx & object}>{children}</CharacterContext.Provider> : <>{children}</>;
};

/** Würfelformel „2W6+3“, „1W10−1“ → Wurf */
export function wirfFormel(formel: string): { wuerfel: number[]; mod: number; summe: number; formel: string } | null {
  const f = formel.replace(/[−–]/g, '-').replace(/\s/g, '').toUpperCase();
  const m = f.match(/^(\d*)W(\d+)([+-]\d+)?/);
  if (!m) return null;
  const n = Number(m[1] || 1); const s = Number(m[2]); const mod = m[3] ? Number(m[3]) : 0;
  const wuerfel = Array.from({ length: n }, () => Math.floor(Math.random() * s) + 1);
  return { wuerfel, mod, summe: wuerfel.reduce((a, b) => a + b, 0) + mod, formel: m[0] };
}

export interface BegleiterSpielDaten {
  name: string; lp: number; fo: number; merkmale: string[]; sr?: string | number;
}

/** Würfeln und Vitalwerte eines Begleiters. Liefert die Aktionen und die Modale (im Eintrag rendern). */
export function useBegleiterSpiel(b: Begleiter, index: number, daten: BegleiterSpielDaten) {
  const { dispatch } = useCharacter();
  const play = usePlaySessionOptional();
  const k = aktiverKatalog();
  const z: BegleiterZustand = b.zustand ?? {};
  const { stufen, quelle } = useMemo(() => gesundheitsstufen(k, daten.merkmale), [k, daten.merkmale]);
  const lage = lebenslage(daten.lp, stufen, z);
  const [probe, setProbe] = useState<{ name: string; wert: number } | null>(null);
  const [angriff, setAngriff] = useState<AttackTargetConfig | null>(null);
  const [zauber, setZauber] = useState<{ spell: Spell; wert: number } | null>(null);
  const [lpModal, setLpModal] = useState<'schaden' | 'heilen' | null>(null);

  const setze = (zustand: BegleiterZustand) => {
    const a = { type: 'BEGLEITER_AENDERN' as const, payload: { index, aenderung: { zustand } } };
    if (play) play.dispatchWithHistory(a); else dispatch(a);
  };
  const log = (category: 'damage' | 'heal' | 'focus' | 'spell' | 'combat' | 'misc', title: string, description?: string, badge?: { text: string; variant: 'danger' | 'warning' | 'info' | 'success' | 'gold' | 'neutral' }) =>
    play?.logEintrag({ category, title: `${daten.name}: ${title}`, description, badge });
  const wurfLog = (e: RollEntry) => play?.handleRecordRoll(e);

  const aktionen: Aktionen = {
    probe: (name, wert) => setProbe({ name, wert }),
    angriff: w => setAngriff({
      weapon: { name: w.name, damage: String(w.schaden).replace(/[−–]/g, '-'), wgs: zahl(w.wgs) || w.wgs, attributes: w.merkmale },
      skillName: `${daten.name}: ${w.name}`, skillTotal: zahl(w.wert),
    }),
    schaden: w => {
      const r = wirfFormel(String(w.schaden));
      if (!r) { toast.error(`Schaden „${w.schaden}“ nicht lesbar`); return; }
      wurfLog({ id: generateId(), type: 'roll', timestamp: zeit(), label: `${daten.name}: Schaden ${w.name} (${r.formel})`, d10s: r.wuerfel, baseVal: 0, modifier: r.mod, total: r.summe,
        outcome: `[${r.wuerfel.join(', ')}]${r.mod ? (r.mod > 0 ? ` + ${r.mod}` : ` − ${-r.mod}`) : ''} = ${r.summe}` });
      toast.success(`${daten.name}, ${w.name}: ${r.summe} Schaden (${r.formel} [${r.wuerfel.join(', ')}])`);
    },
    zaubern: (spell, wert) => setZauber({ spell, wert }),
  };
  const zahlSR = zahl(daten.sr);

  const fokus = z.fokus ?? {};
  const modale = (
    <OhneCharakterBoni>
      {probe && (
        <RollModal skillName={`${daten.name}: ${probe.name}`} baseValue={probe.wert} woundPenalty={lage.wundabzug} healthLevelName={lage.stufenName}
          conditions={[]} splitterPoints={0} onClose={() => setProbe(null)} onRecordRoll={wurfLog} />
      )}
      {angriff && (
        <AttackModal target={angriff} woundPenalty={lage.wundabzug} splitterpunkte={0} onClose={() => setAngriff(null)} onSpendSplitterpunkt={() => {}}
          onRecordRoll={wurfLog}
          onAttackSuccess={r => {
            log('combat', `Angriff getroffen: ${r.weapon.name} (${r.eg} EG)${r.damageRoll ? ` · ${r.damageRoll.netDamage} Schaden` : ''}`,
              `Wurf ${r.totalRoll} gegen VTD ${r.targetVTD}${r.damageRoll ? ` · ${r.damageRoll.breakdownText}` : ''}`,
              { text: r.damageRoll ? `${r.damageRoll.netDamage} SP · ${r.eg} EG` : `${r.eg} EG`, variant: r.damageRoll ? 'danger' : 'success' });
            setAngriff(null);
          }}
          onAttackFailure={r => {
            log('combat', `Angriff verfehlt: ${r.weapon.name}`, `Wurf ${r.totalRoll} gegen VTD ${r.targetVTD}${r.isFumble ? ' · Patzer' : ''}`, { text: r.isFumble ? 'Patzer' : 'verfehlt', variant: 'warning' });
            setAngriff(null);
          }} />
      )}
      {zauber && (
        <CastSpellModal spell={zauber.spell} schoolSkillTotal={zauber.wert} schoolSkillName={zauber.spell.school}
          availableFocus={fokusFrei(daten.fo, z)} maxFO={daten.fo}
          focusState={{ exhausted: fokus.erschoepft ?? 0, channeled: fokus.kanalisiert ?? 0, consumed: fokus.verzehrt ?? 0 }}
          woundPenalty={lage.wundabzug} splitterpunkte={0} onSpendSplitterpunkt={() => {}} onClose={() => setZauber(null)} onRecordRoll={wurfLog}
          onCastSuccess={r => {
            setze({ ...z, fokus: { erschoepft: (fokus.erschoepft ?? 0) + r.exhaustedFocus, kanalisiert: (fokus.kanalisiert ?? 0) + r.channeledFocus, verzehrt: (fokus.verzehrt ?? 0) + r.consumedFocus } });
            log('spell', `Zauber gewirkt: ${r.spell.name} (${r.eg} EG)`, `${r.exhaustedFocus} erschöpft, ${r.channeledFocus} kanalisiert, ${r.consumedFocus} verzehrt`,
              { text: `${r.exhaustedFocus + r.channeledFocus + r.consumedFocus} FO`, variant: 'info' });
            setZauber(null);
          }}
          onCastFailure={r => {
            setze({ ...z, fokus: { ...fokus, erschoepft: (fokus.erschoepft ?? 0) + r.exhaustedFocusLost } });
            log('spell', `Zauber misslungen: ${r.spell.name}`, `${r.exhaustedFocusLost} Fokus erschöpft`, { text: `−${r.exhaustedFocusLost} FO`, variant: 'warning' });
            setZauber(null);
          }} />
      )}
      {lpModal === 'schaden' && (
        <TakeDamageModal begleiter={daten.name} stufen={stufen} maxLP={daten.lp} derivedSR={zahlSR} armorSR={0} currentSplitterPoints={0} activeTempHP={0}
          currentHealthSlots={gesundheitsfelder(lage.gesamt, z)} onClose={() => setLpModal(null)}
          onApplyDamage={({ kind, amount, note }) => {
            if (amount <= 0) return;
            if (kind === 'exhausted' && betaeubungsimmun(k, daten.merkmale)) {
              log('damage', `immun gegen Betäubungsschaden (${amount} ignoriert)`, note, { text: 'immun', variant: 'neutral' });
              return;
            }
            const art = kind;
            setze(schadenEintragen(lage.gesamt, z, art, amount));
            const text = art === 'consumed' ? 'Schaden' : art === 'exhausted' ? 'Betäubungsschaden' : 'kanalisierter Schaden';
            log('damage', `${amount} ${text} erlitten`, note, { text: `−${amount} LP`, variant: 'danger' });
          }} />
      )}
      {lpModal === 'heilen' && (
        <HealModal begleiter={daten.name} stufen={stufen} maxLP={daten.lp} currentHealthSlots={gesundheitsfelder(lage.gesamt, z)} activeConditions={[]}
          onClose={() => setLpModal(null)}
          onApplyHeal={({ consumedHealed, exhaustedHealed, channeledHealed, note, healMethod }) => {
            const summe = consumedHealed + exhaustedHealed + channeledHealed;
            if (summe <= 0) return;
            setze({ ...z, schaden: Math.max(0, (z.schaden ?? 0) - consumedHealed), betaeubung: Math.max(0, (z.betaeubung ?? 0) - exhaustedHealed), kanalisiert: Math.max(0, (z.kanalisiert ?? 0) - channeledHealed) });
            log('heal', `${summe} LP geheilt${healMethod && healMethod !== 'manual' ? ` (${healMethod.replace('_', ' ')})` : ''}`, note, { text: `+${summe} LP`, variant: 'success' });
          }} />
      )}
    </OhneCharakterBoni>
  );

  return { aktionen, modale, lage, stufenQuelle: quelle, setze, log, zustand: z, schadenModal: () => setLpModal('schaden'), heilenModal: () => setLpModal('heilen') };
}

/** Lebenspunkte (je Gesundheitsstufe) und Fokus eines Begleiters */
export const BegleiterVitals: React.FC<{ spiel: ReturnType<typeof useBegleiterSpiel>; daten: BegleiterSpielDaten }> = ({ spiel, daten }) => {
  const { lage, zustand: z, setze, log, stufenQuelle } = spiel;
  const [foMenge, setFoMenge] = useState(1);
  const k = aktiverKatalog();
  const immun = betaeubungsimmun(k, daten.merkmale);
  const f = z.fokus ?? {};
  const frei = fokusFrei(daten.fo, z);
  const aendern = (neu: BegleiterZustand, titel: string, art: 'damage' | 'heal' | 'focus', badge: string) => {
    setze(neu); log(art, titel, undefined, { text: badge, variant: art === 'damage' ? 'danger' : art === 'heal' ? 'success' : 'info' });
  };
  if (!daten.lp && !daten.fo) return null;

  // Kästchen je Gesundheitsstufe: echter Schaden, Betäubung, kanalisiert
  const kaestchen: ('s' | 'b' | 'k' | '')[] = [];
  for (let i = 0; i < lage.gesamt; i++) {
    const s = z.schaden ?? 0; const bt = z.betaeubung ?? 0; const kn = z.kanalisiert ?? 0;
    kaestchen.push(i < s ? 's' : i < s + bt ? 'b' : i < s + bt + kn ? 'k' : '');
  }
  const farbe = { s: 'bg-schaden-grund border-schaden', b: 'bg-erschoepft border-erschoepft', k: 'bg-kanalisiert border-kanalisiert', '': 'bg-flaeche border-rahmen' };

  return (
    <div className="border border-rahmen rounded-knopf p-2 space-y-2 bg-erhoeht" data-testid="begleiter-vitals">
      {daten.lp > 0 && (
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <Heart size={14} className="text-schaden" />
            <strong>LP {lage.frei}/{lage.gesamt}</strong>
            <span className={lage.ausser ? 'text-schaden font-bold' : 'text-schrift'}>{lage.stufenName}</span>
            {lage.wundabzug !== 0 && <span className="text-schaden font-bold">Wundabzug {lage.wundabzug}</span>}
            <span className="text-leise">{daten.lp} je Stufe, {lage.stufen.length} Stufen{stufenQuelle ? ` (${stufenQuelle})` : ''}</span>
          </div>
          <div className="flex flex-wrap gap-1 mt-1" aria-label="Lebenspunkte">
            {lage.stufen.map((st, si) => (
              <div key={si} className="flex flex-col items-start">
                <span className="text-[11px] text-leise">{st.name}{st.wundabzug ? ` (${st.wundabzug})` : ''}</span>
                <div className="flex gap-0.5">
                  {kaestchen.slice(si * daten.lp, (si + 1) * daten.lp).map((x, i) => <span key={i} className={`w-3 h-3 rounded-knopf border ${farbe[x]}`} />)}
                </div>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-1 items-center mt-1">
            <button type="button" className="px-2 py-0.5 rounded-knopf bg-schaden-grund text-schrift font-bold cursor-pointer flex items-center gap-1"
              onClick={spiel.schadenModal}><HeartCrack size={11} />Schaden erleiden</button>
            <button type="button" className="px-2 py-0.5 rounded-knopf bg-unverletzt-grund text-schrift font-bold cursor-pointer flex items-center gap-1 disabled:opacity-40" disabled={!lage.verloren}
              onClick={spiel.heilenModal}><HeartPulse size={11} />Heilen</button>
            {immun && <span className="text-leise">immun gegen Betäubungsschaden</span>}
          </div>
        </div>
      )}
      {daten.fo > 0 && (
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <Sparkles size={14} className="text-schrift" />
            <strong>Fokus {frei}/{daten.fo}</strong>
            <span className="text-leise">erschöpft {f.erschoepft ?? 0}, kanalisiert {f.kanalisiert ?? 0}, verzehrt {f.verzehrt ?? 0}</span>
          </div>
          <div className="flex flex-wrap gap-1 items-center mt-1">
            <input type="number" min={1} value={foMenge} onChange={e => setFoMenge(Number(e.target.value) || 1)} className={`${auswahl} w-14`} aria-label="Menge Fokus" />
            {([['erschoepft', 'erschöpfen'], ['kanalisiert', 'kanalisieren'], ['verzehrt', 'verzehren']] as const).map(([feld, text]) => (
              <button key={feld} type="button" className="px-2 py-0.5 rounded-knopf border border-gold text-schrift font-bold cursor-pointer disabled:opacity-40" disabled={frei <= 0}
                onClick={() => { const m = Math.min(frei, Math.max(1, foMenge)); aendern({ ...z, fokus: { ...f, [feld]: (f[feld] ?? 0) + m } }, `${m} Fokus ${text === 'erschöpfen' ? 'erschöpft' : text === 'kanalisieren' ? 'kanalisiert' : 'verzehrt'}`, 'focus', `−${m} FO`); }}>
                {text}
              </button>
            ))}
            {(f.kanalisiert ?? 0) > 0 && (
              <button type="button" className="px-2 py-0.5 rounded-knopf border border-gold text-schrift cursor-pointer"
                onClick={() => aendern({ ...z, fokus: { ...f, kanalisiert: 0, erschoepft: (f.erschoepft ?? 0) + (f.kanalisiert ?? 0) } }, 'Kanalisierung beendet', 'focus', 'K → erschöpft')}>
                Kanalisierung beenden
              </button>
            )}
          </div>
        </div>
      )}
      <div className="flex flex-wrap gap-1">
        <button type="button" className="px-2 py-0.5 rounded-knopf border border-gold cursor-pointer flex items-center gap-1" title="Betäubungsschaden und erschöpfter Fokus erholen sich"
          onClick={() => aendern({ ...z, betaeubung: 0, fokus: { ...f, erschoepft: 0 } }, 'Verschnaufpause', 'heal', 'Pause')}><Coffee size={11} />Verschnaufpause</button>
        <button type="button" className="px-2 py-0.5 rounded-knopf border border-gold cursor-pointer flex items-center gap-1"
          onClick={() => aendern({}, 'Werte zurückgesetzt (voll)', 'heal', 'voll')}><RotateCcw size={11} />Alles zurücksetzen</button>
      </div>
    </div>
  );
};

/** Spieldaten aus einem Wertekasten (LP und FO je Stufe, Merkmale) */
export function spielDaten(b: Begleiter, w: Wertekasten | null | undefined): BegleiterSpielDaten {
  const merkmale = String(w?.felder?.merkmale ?? '').split(/,(?![^(]*\))/).map(x => x.trim()).filter(Boolean);
  return { name: b.rufname || b.name, lp: zahl(w?.abgeleitete_werte?.LP), fo: zahl(w?.abgeleitete_werte?.FO), sr: w?.abgeleitete_werte?.SR, merkmale };
}

/** Kurzanzeige im Kopf eines Begleiters: LP und Fokus */
export const VitalKurz: React.FC<{ spiel: ReturnType<typeof useBegleiterSpiel>; daten: BegleiterSpielDaten }> = ({ spiel, daten }) => {
  if (!daten.lp) return null;
  const { lage } = spiel;
  return (
    <span className={`font-bold ${lage.ausser ? 'text-schaden' : lage.wundabzug ? 'text-erschoepft' : 'text-schrift'}`} title={lage.stufenName}>
      {lage.frei}/{lage.gesamt}{daten.fo ? ` · FO ${fokusFrei(daten.fo, spiel.zustand)}/${daten.fo}` : ''}
    </span>
  );
};
