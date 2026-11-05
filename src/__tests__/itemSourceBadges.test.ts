import { describe, it, expect } from 'vitest';
import { ALL_EQUIPMENT, WEAPONS_DATA, ARMORS_DATA, SHIELDS_DATA, GEAR_DATA } from '../data/equipment';
import { useCharacterState } from '../hooks/useCharacterState';
import { renderHook, act } from '@testing-library/react';
import type { InventoryItem } from '../types';

describe('Quellenvermerk (Item Sources) Verification', () => {
  it('verifies that all catalog equipment items have authentic source and page definitions', () => {
    expect(ALL_EQUIPMENT.length).toBeGreaterThan(140);

    for (const item of ALL_EQUIPMENT) {
      expect(item.source).toBeDefined();
      expect(typeof item.source).toBe('string');
      expect(item.source.length).toBeGreaterThan(0);
      expect(item.page).toBeDefined();
      expect(typeof item.page).toBe('number');
      expect(item.page).toBeGreaterThan(0);
    }

    // Weapons from GRW
    expect(WEAPONS_DATA.every((w) => w.source === 'GRW' && w.page >= 180)).toBe(true);
    // Armors and shields from GRW
    expect(ARMORS_DATA.every((a) => a.source === 'GRW' && a.page >= 180)).toBe(true);
    expect(SHIELDS_DATA.every((s) => s.source === 'GRW' && s.page >= 180)).toBe(true);
    // Gear from GRW
    expect(GEAR_DATA.every((g) => g.source === 'GRW' && g.page >= 180)).toBe(true);
  });

  it('preserves authentic sources and pages when adding items to inventory', () => {
    const { result } = renderHook(() => useCharacterState());
    const customItem: InventoryItem = {
      id: 'msk-item-1',
      name: 'Rondrakamm',
      type: 'weapon',
      quantity: 1,
      source: 'Mondstahlklingen',
      page: 42,
      damage: '2W6+3',
      weaponSkill: 'Zweihandschwerter',
      wgs: 8,
    };

    act(() => {
      result.current.dispatch({
        type: 'ADD_INVENTORY_ITEM',
        payload: customItem,
      });
    });

    const storedItem = result.current.state.inventory?.find((i) => i.id === 'msk-item-1');
    expect(storedItem).toBeDefined();
    expect(storedItem?.source).toBe('Mondstahlklingen');
    expect(storedItem?.page).toBe(42);
  });

  it('allows updating an item source and page via UPDATE_INVENTORY_ITEM', () => {
    const { result } = renderHook(() => useCharacterState());
    const initialItem: InventoryItem = {
      id: 'test-item-2',
      name: 'Zauberöl',
      type: 'alchemika',
      quantity: 1,
      source: 'Eigen',
    };

    act(() => {
      result.current.dispatch({
        type: 'ADD_INVENTORY_ITEM',
        payload: initialItem,
      });
    });

    act(() => {
      result.current.dispatch({
        type: 'UPDATE_INVENTORY_ITEM',
        payload: {
          id: 'test-item-2',
          updates: {
            source: 'Bestien & Ungeheuer',
            page: 112,
          },
        },
      });
    });

    const updated = result.current.state.inventory?.find((i) => i.id === 'test-item-2');
    expect(updated?.source).toBe('Bestien & Ungeheuer');
    expect(updated?.page).toBe(112);
  });
});
