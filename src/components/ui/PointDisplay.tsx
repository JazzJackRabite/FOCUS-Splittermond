import React from 'react';
import type { AppMode } from '../../types';

interface PointDisplayProps {
  current: number;
  max: number;
  label: string;
  mode: AppMode;
}

export const PointDisplay: React.FC<PointDisplayProps> = ({ current, max, label, mode }) => {
  if (mode === 'xp') return null;
  const isComplete = current === max;
  return (
    <div className="text-[10px] uppercase tracking-wider font-bold text-right mt-1">
      {label}:{' '}
      <span className={isComplete ? 'text-green-600' : 'text-red-600'}>
        {current} / {max}
      </span>
    </div>
  );
};
