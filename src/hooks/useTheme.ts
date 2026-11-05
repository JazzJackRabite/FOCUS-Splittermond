import { useState, useEffect } from 'react';
import { THEME_PALETTES, ThemePalette } from '../data/themePalettes';

const THEME_STORAGE_KEY = 'focus_color_theme';

export function useTheme() {
  const [currentThemeId, setCurrentThemeId] = useState<ThemePalette['id']>(() => {
    try {
      const stored = localStorage.getItem(THEME_STORAGE_KEY);
      if (stored && THEME_PALETTES.some((p) => p.id === stored)) {
        return stored as ThemePalette['id'];
      }
    } catch {
      // ignore
    }
    return 'focus-dark';
  });

  useEffect(() => {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, currentThemeId);
      document.documentElement.setAttribute('data-theme', currentThemeId);
      document.body.setAttribute('data-theme', currentThemeId);
    } catch {
      // ignore
    }
  }, [currentThemeId]);

  const currentTheme = THEME_PALETTES.find((t) => t.id === currentThemeId) ?? THEME_PALETTES[0];
  const mode: 'light' | 'dark' = currentTheme.mode ?? (currentThemeId === 'focus-light' ? 'light' : 'dark');

  const setMode = (newMode: 'light' | 'dark') => {
    if (newMode === 'light') {
      setCurrentThemeId('focus-light');
    } else {
      setCurrentThemeId('focus-dark');
    }
  };

  const toggleMode = () => {
    setMode(mode === 'light' ? 'dark' : 'light');
  };

  return {
    currentThemeId,
    currentTheme,
    mode,
    setTheme: setCurrentThemeId,
    setMode,
    toggleMode,
    palettes: THEME_PALETTES,
  };
}
