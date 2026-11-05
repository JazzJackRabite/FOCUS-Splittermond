import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { THEME_PALETTES } from '../data/themePalettes';
import { SettingsModal } from '../components/common/SettingsModal';
import { ThemeSettingsModal } from '../components/common/ThemeSettingsModal';

describe('Theme Palettes & SettingsModal', () => {
  it('defines focus-light and focus-dark palettes with base and complementary tones', () => {
    expect(THEME_PALETTES).toHaveLength(2);

    const ids = THEME_PALETTES.map((p) => p.id);
    expect(ids).toContain('focus-light');
    expect(ids).toContain('focus-dark');

    THEME_PALETTES.forEach((palette) => {
      expect(palette.name).toBeTruthy();
      expect(palette.mode).toMatch(/^(light|dark)$/);
      expect(palette.description).toBeTruthy();
      expect(palette.baseTones.length).toBeGreaterThanOrEqual(4);
      expect(palette.complementaryTones.length).toBeGreaterThanOrEqual(4);

      palette.baseTones.forEach((tone) => {
        expect(tone.name).toBeTruthy();
        expect(tone.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
        expect(tone.role).toBeTruthy();
      });

      palette.complementaryTones.forEach((tone) => {
        expect(tone.name).toBeTruthy();
        expect(tone.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
        expect(tone.role).toBeTruthy();
      });
    });
  });

  it('renders settings modal with title, placeholder tabs Menü 1-3, and mode switch icon button in header', () => {
    const onSelectTheme = vi.fn();
    const onClose = vi.fn();

    const { rerender } = render(
      <SettingsModal
        currentThemeId="focus-dark"
        onSelectTheme={onSelectTheme}
        onClose={onClose}
      />
    );

    // Modal title & tabs
    expect(screen.getByText('Einstellungen')).toBeDefined();
    expect(screen.getByRole('button', { name: /Allgemein & Farbschema/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /Regelpakete/i })).toBeDefined();
    expect(screen.queryByRole('button', { name: /Admin & Ressourcen/i })).toBeNull();
    expect(screen.getByRole('button', { name: /Info/i })).toBeDefined();

    // Mode toggle button in header (no text, aria-label to toggle)
    const toggleToLightBtn = screen.getByRole('button', { name: /Zu Hellmodus wechseln/i });
    expect(toggleToLightBtn).toBeDefined();
    fireEvent.click(toggleToLightBtn);
    expect(onSelectTheme).toHaveBeenCalledWith('focus-light');

    // Rerender with light theme
    rerender(
      <SettingsModal
        currentThemeId="focus-light"
        onSelectTheme={onSelectTheme}
        onClose={onClose}
      />
    );

    const toggleToDarkBtn = screen.getByRole('button', { name: /Zu Dunkelmodus wechseln/i });
    expect(toggleToDarkBtn).toBeDefined();
    fireEvent.click(toggleToDarkBtn);
    expect(onSelectTheme).toHaveBeenCalledWith('focus-dark');
  });

  it('navigates between tabs in SettingsModal', () => {
    const onSelectTheme = vi.fn();
    const onClose = vi.fn();

    render(
      <SettingsModal
        currentThemeId="focus-dark"
        onSelectTheme={onSelectTheme}
        onClose={onClose}
      />
    );

    // Initial tab is Allgemein & Farbschema
    expect(screen.getByText('Erscheinungsbild')).toBeDefined();


    // Click Info
    fireEvent.click(screen.getByRole('button', { name: /Info/i }));
    expect(screen.getByText(/Splittermond Charaktergenerator/i)).toBeDefined();
  });

  it('ThemeSettingsModal acts as a compatible wrapper and handles close actions', () => {
    const onSelectTheme = vi.fn();
    const onClose = vi.fn();

    render(
      <ThemeSettingsModal
        currentThemeId="focus-dark"
        onSelectTheme={onSelectTheme}
        onClose={onClose}
      />
    );

    const closeBtn = screen.getByLabelText('Schließen');
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalledTimes(1);

    const doneBtn = screen.getByText('Fertig');
    fireEvent.click(doneBtn);
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
