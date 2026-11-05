import React from 'react';
import { SettingsModal } from './SettingsModal';
import { ThemePalette } from '../../data/themePalettes';

export interface ThemeSettingsModalProps {
  currentThemeId: ThemePalette['id'];
  onSelectTheme: (id: ThemePalette['id']) => void;
  onClose: () => void;
}

export const ThemeSettingsModal: React.FC<ThemeSettingsModalProps> = (props) => {
  return <SettingsModal {...props} />;
};
