import React from 'react';

interface StatDisplayProps {
  label: string;
  value: number | string;
  subLabel?: string;
  bonus?: number;
  tooltip?: string;
}

export const StatDisplay: React.FC<StatDisplayProps> = ({ label, value, subLabel, bonus, tooltip }) => {
  const displayVal = typeof value === 'number' && isNaN(value) ? '-' : value;
  return (
    <div className="flex flex-col items-center p-2 stat-box shadow-sm min-w-[80px] flex-shrink-0" title={tooltip}>
      <span className="text-[10px] md:text-xs uppercase font-bold tracking-wider text-gray-600 print:text-black text-center">
        {label}
      </span>
      <span className="text-2xl md:text-3xl font-bold fantasy-font text-[#1B365D] print:text-black my-1 flex items-baseline gap-1">
        {displayVal}
        {bonus !== undefined && !isNaN(bonus) && bonus > 0 && (
          <span className="text-sm font-bold text-green-600 print:text-green-800">(+{bonus})</span>
        )}
      </span>
      {subLabel && (
        <span className="text-[10px] text-gray-500 print:text-gray-600 text-center leading-tight">
          {subLabel}
        </span>
      )}
    </div>
  );
};
