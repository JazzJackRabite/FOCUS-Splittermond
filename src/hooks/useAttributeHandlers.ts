import { useCallback } from 'react';
import { RACES } from '../data/rules';
import type React from 'react';
import type { CharacterAction, AttrMap, AppMode, CreationUsage } from '../types';

interface AttributeHandlersParams {
  state: {
    attrBase: AttrMap;
    attrIncrements: AttrMap;
    raceBonusAttrs: string[];
    mode: AppMode;
    race: string;
  };
  calc: {
    creationUsage: CreationUsage;
    heldengrad: { maxAttrMod: number };
    xpAvailable: number;
  };
  dispatch: React.Dispatch<CharacterAction>;
}

export function useAttributeHandlers({ state, calc, dispatch }: AttributeHandlersParams) {
  const { attrBase, attrIncrements, raceBonusAttrs, mode, race } = state;
  const { creationUsage, heldengrad, xpAvailable } = calc;

  const modAttrBase = useCallback((key: string, delta: number) => {
    const newVal = (attrBase[key as keyof AttrMap] ?? 0) + delta;
    if (newVal < 1 || newVal > 3) return;
    if (delta > 0 && creationUsage.attr >= 18) return;
    dispatch({ type: 'MOD_ATTR_BASE', payload: { key: key as keyof AttrMap, delta } });
  }, [attrBase, creationUsage.attr, dispatch]);

  const modAttrXP = useCallback((key: string, delta: number) => {
    const currentInc = attrIncrements[key as keyof AttrMap] ?? 0;
    if (delta > 0) {
      if (currentInc >= heldengrad.maxAttrMod) return;
      const cost = 10 + currentInc * 5;
      if (xpAvailable < cost) return;
    } else {
      if (currentInc <= 0) return;
    }
    dispatch({ type: 'MOD_ATTR_XP', payload: { key: key as keyof AttrMap, delta } });
  }, [attrIncrements, heldengrad.maxAttrMod, xpAvailable, dispatch]);

  const toggleRaceBonus = useCallback((attr: string) => {
    if (mode === 'xp') return;
    const max = (RACES[race as keyof typeof RACES] as { freeMods: number }).freeMods;
    if (race === 'Varg' && attr === 'STA') return;
    if (raceBonusAttrs.includes(attr)) {
      dispatch({ type: 'TOGGLE_RACE_BONUS', payload: attr });
    } else if (raceBonusAttrs.length < max) {
      dispatch({ type: 'TOGGLE_RACE_BONUS', payload: attr });
    }
  }, [mode, race, raceBonusAttrs, dispatch]);

  return { modAttrBase, modAttrXP, toggleRaceBonus };
}
