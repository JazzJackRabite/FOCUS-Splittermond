import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { HealModal } from '../components/play/HealModal';
import type { HealthSlot, StatusCondition } from '../types';

describe('HealModal (GRW S. 165-167)', () => {
  const sampleSlots: HealthSlot[] = [
    { type: 'consumed' },
    { type: 'consumed' },
    { type: 'consumed' },
    { type: 'exhausted' },
    { type: 'exhausted' },
    { type: 'empty' },
    { type: 'empty' },
    { type: 'empty' },
  ];

  const sampleConditions: StatusCondition[] = [
    { id: 'cond-1', key: 'Blutend', level: 1 },
    { id: 'cond-2', key: 'Benommen', level: 1 },
  ];

  it('renders modal with damage overview, healing methods, priority options, and conditions', () => {
    const onApplyHeal = vi.fn();
    const onClose = vi.fn();

    render(
      <HealModal
        onClose={onClose}
        maxLP={8}
        currentHealthSlots={sampleSlots}
        activeConditions={sampleConditions}
        onApplyHeal={onApplyHeal}
      />
    );

    expect(screen.getByRole('heading', { name: /Heilung anwenden/i })).toBeDefined();
    expect(screen.getByText(/1. Heilmethode/i)).toBeDefined();
    expect(screen.getByText(/2. Zu heilende Schadenspunkte/i)).toBeDefined();
    expect(screen.getByText(/3. Zu heilende Schadensart/i)).toBeDefined();
    expect(screen.getByText(/4. Zustände beenden/i)).toBeDefined();
    expect(screen.getByText(/Wundstufen-Verbesserung/i)).toBeDefined();
  });

  it('calculates consumed and exhausted healing correctly with consumed_first priority', () => {
    const onApplyHeal = vi.fn();
    const onClose = vi.fn();

    render(
      <HealModal
        onClose={onClose}
        maxLP={8}
        currentHealthSlots={sampleSlots}
        activeConditions={sampleConditions}
        onApplyHeal={onApplyHeal}
      />
    );

    // Initial amount is 3. With consumed_first and 3 consumed available:
    // It heals 3 consumed, 0 exhausted
    const applyButton = screen.getByRole('button', { name: /3 LP heilen/i });
    expect(applyButton).toBeDefined();

    fireEvent.click(applyButton);

    expect(onApplyHeal).toHaveBeenCalledWith(
      expect.objectContaining({
        consumedHealed: 3,
        exhaustedHealed: 0,
        channeledHealed: 0,
      })
    );
    expect(onClose).toHaveBeenCalled();
  });

  it('auto-selects Blutend condition removal when Erste Hilfe is chosen (GRW S. 165)', () => {
    const onApplyHeal = vi.fn();
    const onClose = vi.fn();

    render(
      <HealModal
        onClose={onClose}
        maxLP={8}
        currentHealthSlots={sampleSlots}
        activeConditions={sampleConditions}
        onApplyHeal={onApplyHeal}
      />
    );

    // Click Erste Hilfe
    const ersteHilfeBtn = screen.getByRole('button', { name: /Erste Hilfe/i });
    fireEvent.click(ersteHilfeBtn);

    // The Blutend checkbox should now be checked
    const blutendCheckbox = screen.getByLabelText(/Blutend/i) as HTMLInputElement;
    expect(blutendCheckbox.checked).toBe(true);

    // Submit
    const applyButton = screen.getByRole('button', { name: /heilen/i });
    fireEvent.click(applyButton);

    expect(onApplyHeal).toHaveBeenCalledWith(
      expect.objectContaining({
        conditionsToRemove: ['cond-1'],
        healMethod: expect.stringContaining('Erste Hilfe'),
      })
    );
  });
});
