import React from 'react';
import DiceIcon from '../ui/DiceIcon';
import { useCharacter } from '../../context/CharacterContext';
import { usePlaySession } from '../../context/PlaySessionContext';
import { PlaySharedVitals } from './PlaySharedVitals';
import { RestSection } from './RestSection';
import { WirkungenKarte } from './WirkungenKarte';
import { SourceBadge } from '../ui/SourceBadge';
import {
  ATTRIBUTES,
  SKILL_CATEGORIES,
} from '../../data/rules';
import { isSkillAffectedByBehinderung } from '../../utils/conditionModifiers';
import {
  getMasteryDetails,
  getStrengthDetails,
  getWeaknessDetails,
  getLanguageDetails,
} from '../../utils/gameResourceManager';

export const PlayTab: React.FC = () => {
  const { state, calc } = useCharacter();
  const session = usePlaySession();

  const {
    masteries,
    strengthsList,
    weaknessesList,
    languagesList = [],
  } = state;

  const {
    currentAttributes,
    getSkillTotal,
    getSkillBonus,
    totalHandicap = 0,
  } = calc;

  return (
    <div className="p-4 md:p-6 space-y-6 w-full">
      {/* ── SHARED VITALS: Live-Status, Lebenspunkte, Fokus, Abgeleitete Werte, Splitterpunkte ── */}
      <PlaySharedVitals isMinimal={true} />

      {/* ── SPIELEN & ABENTEUER CONTENT GRID ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Linke Hauptspalte: Allgemeine Fertigkeiten & Stärken, Schwächen, Sprachen ── */}
        <div className="lg:col-span-2 space-y-6">
          {/* ── Allgemeine Fertigkeiten ── */}
          <div className="bg-flaeche bg-opacity-70 rounded-karte border border-rahmen p-5">
            <div className="flex justify-between items-center border-b border-gold pb-2 mb-3">
              <h3 className="font-bold text-xl fantasy-font text-gold-hell">
                Allgemeine Fertigkeiten
              </h3>
              <span className="text-xs text-leise font-medium">Klick zum Würfeln (2W10 + Wert)</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-1.5">
              {SKILL_CATEGORIES.GENERAL.map((skill) => {
                const total = getSkillTotal(skill);
                const skillMasteries = masteries[skill] ?? [];
                const isAffected = isSkillAffectedByBehinderung(skill);
                const beh = isAffected ? totalHandicap : 0;
                return (
                  <div key={skill} className="flex flex-col">
                    <button
                      type="button"
                      onClick={() => session.openRollForSkill(skill)}
                      title={
                        beh > 0
                          ? `${skill}: Basiswert ${total}, Behinderung −${beh} (effektiv ${Number(total) - beh})`
                          : `${skill} würfeln`
                      }
                      className="flex justify-between items-center bg-erhoeht hover:bg-rahmen rounded-knopf px-2.5 py-1.5 text-xs font-bold text-schrift transition-all border border-transparent hover:border-gold cursor-pointer w-full shadow-2xs"
                    >
                      <span className="flex items-center gap-1 truncate mr-1">
                        <DiceIcon size={14} /> {skill}
                      </span>
                      <span className="flex items-center gap-1 shrink-0 tabular-nums">
                        {getSkillBonus(skill) !== 0 && (
                          <span
                            data-testid={`wirkungsbonus-${skill}`}
                            className="text-[11px] font-bold tabular-nums px-1 rounded-knopf bg-unverletzt-grund text-schrift"
                            title={`Enthält ${getSkillBonus(skill) > 0 ? '+' : ''}${getSkillBonus(skill)} aus: ${(calc.wirkungen?.fertigkeitsBoni[skill]?.quellen ?? []).map(q => q.name).join(', ')}`}
                          >
                            {getSkillBonus(skill) > 0 ? '+' : ''}{getSkillBonus(skill)}
                          </span>
                        )}
                        {beh > 0 && (
                          <span
                            className="text-xs font-bold tabular-nums px-1.5 py-0.5 rounded-knopf bg-schaden text-schrift border border-schaden tracking-tight"
                            title={`Behinderung: −${beh} (Effektiver Wert: ${Number(total) - beh})`}
                          >
                            −{beh}
                          </span>
                        )}
                        <span className="font-bold text-sm">{total}</span>
                      </span>
                    </button>
                    {skillMasteries.length > 0 && (
                      <ul className="ml-2 mt-1 space-y-1">
                        {skillMasteries.map((m) => {
                          const details = getMasteryDetails(skill, m.name, m.desc);
                          const desc = m.userNote
                            ? `${details.desc}\n\n📝 ${m.userNote}`
                            : details.desc;
                          return (
                            <li
                              key={m.id}
                              className="text-xs text-schrift flex items-center justify-between gap-1 py-0.5 border-b border-rahmen last:border-0"
                            >
                              <span className="truncate" title={m.name}>
                                · {m.name}
                                {m.tier > 1 ? ` (T${m.tier})` : ''}
                              </span>
                              <SourceBadge
                                source={m.source || details.source || 'GRW'}
                                page={m.page || details.page}
                                tooltipData={{ title: m.name, description: desc }}
                              />
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Stärken, Schwächen & Sprachen ── */}
          {(strengthsList.length > 0 || weaknessesList.length > 0 || languagesList.length > 0) && (
            <div className="bg-flaeche bg-opacity-70 rounded-karte border border-rahmen p-5">
              <h3 className="font-bold text-xl fantasy-font text-gold-hell border-b border-gold pb-2 mb-3">
                Stärken, Schwächen &amp; Sprachen
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Stärken */}
                <div>
                  <h4 className="font-bold text-sm text-gold-hell mb-2">Stärken</h4>
                  {strengthsList.length === 0 ? (
                    <p className="text-sm text-leise italic">Keine Stärken.</p>
                  ) : (
                    <ul className="space-y-1">
                      {strengthsList.map((s) => {
                        const details = getStrengthDetails(s.name, s.desc);
                        const src =
                          !s.sourceRef ||
                          s.sourceRef === 'Regelwerk' ||
                          s.sourceRef === 'creation' ||
                          s.sourceRef === 'xp' ||
                          s.sourceRef === 'Erschaffung'
                            ? details.source
                            : s.sourceRef;
                        const page = s.page || details.page;
                        return (
                          <li
                            key={s.name}
                            className="flex justify-between items-center text-sm bg-erhoeht rounded-knopf px-2.5 py-1 border border-rahmen"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="font-semibold text-schrift truncate">{s.name}</span>
                              {s.level > 0 && (
                                <span className="text-xs text-leise font-medium shrink-0">Stufe {s.level}</span>
                              )}
                            </div>
                            <SourceBadge
                              source={src}
                              page={page}
                              tooltipData={{ title: s.name, description: details.desc }}
                            />
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>

                {/* Schwächen */}
                <div>
                  <h4 className="font-bold text-sm text-gold-hell mb-2">Schwächen</h4>
                  {weaknessesList.length === 0 ? (
                    <p className="text-sm text-leise italic">Keine Schwächen.</p>
                  ) : (
                    <ul className="space-y-1">
                      {weaknessesList.map((s) => {
                        const details = getWeaknessDetails(s.name, s.desc);
                        const src =
                          !s.sourceRef ||
                          s.sourceRef === 'Regelwerk' ||
                          s.sourceRef === 'creation' ||
                          s.sourceRef === 'xp' ||
                          s.sourceRef === 'Erschaffung'
                            ? details.source
                            : s.sourceRef;
                        const page = s.page || details.page;
                        return (
                          <li
                            key={s.name}
                            className="flex justify-between items-center text-sm bg-erhoeht rounded-knopf px-2.5 py-1 border border-rahmen"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="font-semibold text-schaden truncate">{s.name}</span>
                              {s.level > 0 && (
                                <span className="text-xs text-leise font-medium shrink-0">Stufe {s.level}</span>
                              )}
                            </div>
                            <SourceBadge
                              source={src}
                              page={page}
                              tooltipData={{ title: s.name, description: details.desc }}
                            />
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>

                {/* Sprachen */}
                <div>
                  <h4 className="font-bold text-sm text-gold-hell mb-2">Sprachen</h4>
                  {languagesList.length === 0 ? (
                    <p className="text-sm text-leise italic">Keine Sprachen.</p>
                  ) : (
                    <ul className="space-y-1">
                      {languagesList.map((s) => {
                        const details = getLanguageDetails(s.name, s.desc);
                        const src =
                          !s.sourceRef ||
                          s.sourceRef === 'Regelwerk' ||
                          s.sourceRef === 'creation' ||
                          s.sourceRef === 'xp' ||
                          s.sourceRef === 'Erschaffung'
                            ? details.source
                            : s.sourceRef;
                        const page = s.page || details.page;
                        return (
                          <li
                            key={s.name}
                            className="flex justify-between items-center text-sm bg-erhoeht rounded-knopf px-2.5 py-1 border border-rahmen"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="font-semibold text-schrift truncate">{s.name}</span>
                              {s.level > 0 && (
                                <span className="text-xs text-leise font-medium shrink-0">Stufe {s.level}</span>
                              )}
                              {s.isFree && (
                                <span className="text-[11px] text-unverletzt font-bold bg-unverletzt-grund px-1.5 py-0.5 rounded-knopf">
                                  Muttersp.
                                </span>
                              )}
                            </div>
                            <SourceBadge
                              source={src}
                              page={page}
                              tooltipData={{ title: s.name, description: details.desc }}
                            />
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Rechte Spalte: Regeneration & Pausen & Attribute ── */}
        <div className="lg:col-span-1 space-y-6">
          {/* ── Regeneration & Pausen ── */}
          <RestSection
            kon={currentAttributes.KON ?? 1}
            wil={currentAttributes.WIL ?? 1}
            strengthsList={strengthsList}
            weaknessesList={weaknessesList}
            masteries={masteries}
            moonSign={state.moonSign}
            onVerschnaufpause={session.handleVerschnaufpause}
            onRuhephase={session.handleRuhephase}
          />

          {/* ── Wirkungen aus Stärken und Meisterschaften (nur mit Regelpaketen) ── */}
          <WirkungenKarte />

          {/* ── Attribute (würfelbar 2W10 + Attr) ── */}
          <div className="bg-flaeche bg-opacity-70 rounded-karte border border-rahmen p-5">
            <div className="flex justify-between items-center border-b border-gold pb-2 mb-3">
              <h3 className="font-bold text-xl fantasy-font text-gold-hell">
                Attribute
              </h3>
              <span className="text-xs text-leise font-medium">Attributsprobe</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(ATTRIBUTES).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => session.openRollForAttr(key)}
                  className="flex justify-between items-center bg-erhoeht hover:bg-rahmen rounded-knopf px-3 py-2 text-sm font-bold text-schrift transition-all border border-transparent hover:border-gold cursor-pointer shadow-2xs"
                  title={`${label}: Klick für Attributsprobe (2W10 + ${key})`}
                >
                  <span className="flex items-center gap-1.5">
                    <DiceIcon size={14} /> {key}
                  </span>
                  <span className="text-lg tabular-nums">{currentAttributes[key] ?? 0}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
