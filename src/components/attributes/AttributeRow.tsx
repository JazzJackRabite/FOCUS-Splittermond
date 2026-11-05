import React from 'react';
import { ATTRIBUTES } from '../../data/rules';
import type { AttributeRowProps } from '../../types';

export const AttributeRow: React.FC<AttributeRowProps> = ({
  attrKey,
  total,
  startValue,
  onIncrease,
  onDecrease,
  canIncrease,
  canDecrease,
  cost,
  mode,
}) => (
  <div className="flex items-center justify-between py-2 border-b border-[#3A4258]/60 last:border-0 print:border-gray-400 gap-2">
    <div className="flex flex-col min-w-0 flex-1 pr-1">
      <span className="font-bold text-sm sm:text-base text-[#F5F2EA] truncate">
        {ATTRIBUTES[attrKey as keyof typeof ATTRIBUTES]}
      </span>
      <div className="flex items-center gap-1.5 text-xs text-gray-400">
        <span className="uppercase font-semibold tracking-wider text-[#C5A059]">{attrKey}</span>
        {mode === 'xp' && total > startValue && (
          <span className="text-[10px] text-[#FBEFCE] bg-[#1E2536] border border-[#3A4258] px-1.5 rounded font-mono font-medium">
            Start {startValue}
          </span>
        )}
      </div>
    </div>
    <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 no-print">
      <button
        onClick={onDecrease}
        disabled={!canDecrease}
        className="w-8 h-8 sm:w-7 sm:h-7 flex items-center justify-center rounded-md border border-[#3A4258] bg-[#1E2536] text-[#F5F2EA] hover:bg-[#2A3449] hover:border-[#C5A059]/50 active:scale-95 disabled:opacity-20 disabled:pointer-events-none shrink-0 font-bold text-sm touch-manipulation transition-all cursor-pointer shadow-xs"
        aria-label={`${ATTRIBUTES[attrKey as keyof typeof ATTRIBUTES]} verringern`}
        title="Verringern"
      >
        -
      </button>
      <div className="flex flex-col items-center justify-center min-w-[2.25rem] sm:min-w-[2.5rem] px-0.5">
        <div className="font-mono text-lg sm:text-xl font-bold text-[#C5A059] leading-none">{total}</div>
        {cost > 0 && (
          <span className="text-[10px] text-[#94A3B8] font-semibold leading-none mt-1 whitespace-nowrap">
            {cost} EP
          </span>
        )}
      </div>
      <button
        onClick={onIncrease}
        disabled={!canIncrease}
        className="w-8 h-8 sm:w-7 sm:h-7 flex items-center justify-center rounded-md border border-[#3A4258] bg-[#1E2536] text-[#F5F2EA] hover:bg-[#2A3449] hover:border-[#C5A059]/50 active:scale-95 disabled:opacity-20 disabled:pointer-events-none shrink-0 font-bold text-sm touch-manipulation transition-all cursor-pointer shadow-xs"
        aria-label={`${ATTRIBUTES[attrKey as keyof typeof ATTRIBUTES]} erhöhen`}
        title="Erhöhen"
      >
        +
      </button>
    </div>
  </div>
);
