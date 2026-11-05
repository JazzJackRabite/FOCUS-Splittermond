import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, Delete, Check, X } from 'lucide-react';

interface QuickNumberInputProps {
  value: number;
  onChange: (val: number) => void;
  min?: number;
  max?: number;
  label?: string;
  className?: string;
  inputClassName?: string;
  presets?: number[];
  allowZero?: boolean;
  disabled?: boolean;
}

export const QuickNumberInput: React.FC<QuickNumberInputProps> = ({
  value,
  onChange,
  min = 1,
  max = 99,
  label,
  className = '',
  inputClassName = '',
  presets,
  allowZero = false,
  disabled = false,
}) => {
  const effectiveMin = allowZero ? 0 : min;
  const [localStr, setLocalStr] = useState<string>(value.toString());
  const [isOpen, setIsOpen] = useState(false);
  const [padValue, setPadValue] = useState<string>(value.toString());
  const inputRef = useRef<HTMLInputElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Sync external value to local string when not focused/open
  useEffect(() => {
    setLocalStr(value.toString());
    setPadValue(value.toString());
  }, [value]);

  // Close popover when clicking outside
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        handleApplyPad();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen, padValue]);

  const commitValue = (valStr: string) => {
    let num = parseInt(valStr, 10);
    if (isNaN(num)) {
      num = effectiveMin;
    }
    const clamped = Math.max(effectiveMin, Math.min(max, num));
    setLocalStr(clamped.toString());
    setPadValue(clamped.toString());
    onChange(clamped);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    // Allow empty string while typing so users can delete the '1'
    if (raw === '') {
      setLocalStr('');
      return;
    }
    // Allow digits only
    if (/^\d*$/.test(raw)) {
      setLocalStr(raw);
      const parsed = parseInt(raw, 10);
      if (!isNaN(parsed)) {
        onChange(Math.max(effectiveMin, Math.min(max, parsed)));
      }
    }
  };

  const handleInputBlur = () => {
    commitValue(localStr);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      commitValue(localStr);
      inputRef.current?.blur();
      setIsOpen(false);
    } else if (e.key === 'Escape') {
      setLocalStr(value.toString());
      inputRef.current?.blur();
      setIsOpen(false);
    }
  };

  const handleInputClick = (e: React.MouseEvent<HTMLInputElement>) => {
    // Select all text on desktop click
    e.currentTarget.select();
  };

  const handleOpenPad = () => {
    if (disabled) return;
    setPadValue(value.toString());
    setIsOpen(true);
  };

  const handlePadDigit = (digit: string) => {
    if (padValue === '0' || padValue === '') {
      setPadValue(digit);
    } else {
      const next = padValue + digit;
      if (parseInt(next, 10) <= max) {
        setPadValue(next);
      }
    }
  };

  const handlePadBackspace = () => {
    if (padValue.length <= 1) {
      setPadValue(effectiveMin.toString());
    } else {
      setPadValue(padValue.slice(0, -1));
    }
  };

  const handlePadClear = () => {
    setPadValue(effectiveMin.toString());
  };

  const handlePadPreset = (presetVal: number) => {
    const clamped = Math.max(effectiveMin, Math.min(max, presetVal));
    setPadValue(clamped.toString());
    commitValue(clamped.toString());
    setIsOpen(false);
  };

  const handlePadAdjust = (delta: number) => {
    const current = parseInt(padValue, 10) || effectiveMin;
    const next = Math.max(effectiveMin, Math.min(max, current + delta));
    setPadValue(next.toString());
  };

  const handleApplyPad = () => {
    commitValue(padValue);
    setIsOpen(false);
  };

  const defaultPresets = presets || (
    effectiveMin === 0
      ? [0, 1, 2, 3, 4, 5, 6, 8, 10, 15, 20]
      : [1, 2, 3, 4, 5, 6, 8, 10, 12, 15, 20]
  );

  return (
    <div className={`relative inline-flex items-center ${className}`}>
      <input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        value={localStr}
        disabled={disabled}
        onChange={handleInputChange}
        onBlur={handleInputBlur}
        onKeyDown={handleInputKeyDown}
        onClick={handleInputClick}
        onDoubleClick={handleOpenPad}
        title={label ? `${label} (Klick zum Auswählen/Tippen, Doppelklick für Ziffernfeld)` : 'Klick zum Auswählen/Tippen'}
        className={`w-10 h-full text-center font-bold text-sm bg-transparent border-0 outline-none select-all cursor-pointer text-[#1B365D] dark:text-[#F5F2EA] ${inputClassName}`}
      />

      {/* Touch / Quick-Pad Toggle Icon Button (only visible on mobile or hover) */}
      <button
        type="button"
        tabIndex={-1}
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen((prev) => !prev);
        }}
        disabled={disabled}
        className="no-print opacity-60 hover:opacity-100 p-0.5 text-[#1B365D] dark:text-[#C5A059] transition-opacity shrink-0 -ml-1 text-[11px]"
        title="Zahleneingabe-Pop-up öffnen"
      >
        <span className="text-[10px] leading-none">▾</span>
      </button>

      {/* ── Touch / Quick Keypad Modal / Popover ── */}
      {isOpen && (
        <>
          {/* Backdrop for easy mobile tapping */}
          <div
            className="fixed inset-0 bg-black/30 backdrop-blur-[1px] z-50 sm:hidden"
            onClick={handleApplyPad}
          />

          <div
            ref={popoverRef}
            className="fixed sm:absolute sm:top-full sm:left-1/2 sm:-translate-x-1/2 mt-1 z-50 bg-[#fbf8f2] border-2 border-[#C5A059] rounded-2xl shadow-2xl p-3.5 w-[280px] max-w-[90vw] text-[#1B365D] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 sm:translate-y-0 animate-in fade-in zoom-in-95 duration-150"
          >
            {/* Header */}
            <div className="flex justify-between items-center pb-2 mb-2 border-b border-[#C5A059]/30">
              <span className="font-bold text-xs fantasy-font text-[#1B365D] flex items-center gap-1.5">
                <Sparkles size={13} className="text-[#C5A059]" />
                {label || 'Zahl auswählen'}
              </span>
              <button
                onClick={() => setIsOpen(false)}
                className="text-stone-400 hover:text-[#8B263E] p-1 rounded-md hover:bg-black/5 cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>

            {/* Current Value Preview Display */}
            <div className="flex items-center justify-between bg-white border border-[#C5A059]/50 rounded-xl px-3 py-2 mb-3 shadow-inner">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handlePadAdjust(-5)}
                  className="px-1.5 py-0.5 text-[11px] font-bold rounded-md bg-[#ebdcc4] hover:bg-[#e0cfb4] text-[#1B365D] border border-[#d1c4b0] active:scale-95 cursor-pointer"
                >
                  -5
                </button>
                <button
                  type="button"
                  onClick={() => handlePadAdjust(-1)}
                  className="px-2 py-0.5 text-xs font-bold rounded-md bg-[#ebdcc4] hover:bg-[#e0cfb4] text-[#1B365D] border border-[#d1c4b0] active:scale-95 cursor-pointer"
                >
                  -1
                </button>
              </div>

              <span className="font-bold text-2xl text-[#1B365D] font-mono px-2">
                {padValue || effectiveMin}
              </span>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handlePadAdjust(1)}
                  className="px-2 py-0.5 text-xs font-bold rounded-md bg-[#ebdcc4] hover:bg-[#e0cfb4] text-[#1B365D] border border-[#d1c4b0] active:scale-95 cursor-pointer"
                >
                  +1
                </button>
                <button
                  type="button"
                  onClick={() => handlePadAdjust(5)}
                  className="px-1.5 py-0.5 text-[11px] font-bold rounded-md bg-[#ebdcc4] hover:bg-[#e0cfb4] text-[#1B365D] border border-[#d1c4b0] active:scale-95 cursor-pointer"
                >
                  +5
                </button>
              </div>
            </div>

            {/* Quick Presets Chips */}
            <div className="mb-3">
              <div className="text-[10px] uppercase font-bold text-stone-500 mb-1 tracking-wider">
                Schnellwahl
              </div>
              <div className="grid grid-cols-6 gap-1">
                {defaultPresets.slice(0, 12).map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => handlePadPreset(num)}
                    className={`py-1 rounded-md text-xs font-bold transition-all border cursor-pointer ${
                      parseInt(padValue, 10) === num
                        ? 'bg-[#1B365D] text-white border-[#10233f] shadow-xs'
                        : 'bg-white hover:bg-[#f3e5cf] text-[#1B365D] border-[#d1c4b0]'
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>

            {/* Numpad Digits Grid */}
            <div className="grid grid-cols-3 gap-1.5 mb-3">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
                <button
                  key={digit}
                  type="button"
                  onClick={() => handlePadDigit(digit.toString())}
                  className="h-9 rounded-lg bg-white border border-[#d1c4b0] hover:bg-[#f3e5cf] active:bg-[#ebdcc4] font-bold text-sm text-[#1B365D] shadow-2xs active:scale-95 transition-all flex items-center justify-center cursor-pointer"
                >
                  {digit}
                </button>
              ))}
              <button
                type="button"
                onClick={handlePadClear}
                className="h-9 rounded-lg bg-stone-100 border border-[#d1c4b0] hover:bg-stone-200 active:bg-stone-300 font-bold text-xs text-[#1B365D] shadow-2xs active:scale-95 transition-all flex items-center justify-center cursor-pointer"
                title="Löschen"
              >
                C
              </button>
              <button
                type="button"
                onClick={() => handlePadDigit('0')}
                className="h-9 rounded-lg bg-white border border-[#d1c4b0] hover:bg-[#f3e5cf] active:bg-[#ebdcc4] font-bold text-sm text-[#1B365D] shadow-2xs active:scale-95 transition-all flex items-center justify-center cursor-pointer"
              >
                0
              </button>
              <button
                type="button"
                onClick={handlePadBackspace}
                className="h-9 rounded-lg bg-[#ebdcc4] border border-[#d1c4b0] hover:bg-[#e0cfb4] active:bg-[#d6c2a2] font-bold text-xs text-[#1B365D] shadow-2xs active:scale-95 transition-all flex items-center justify-center cursor-pointer"
                title="Letzte Ziffer löschen"
              >
                <Delete size={14} />
              </button>
            </div>

            {/* Confirm / Apply Button */}
            <button
              type="button"
              onClick={handleApplyPad}
              className="w-full py-2 bg-[#1B365D] hover:bg-[#2a4f7e] text-white font-bold text-xs rounded-xl shadow-xs border border-[#10233f] transition-all flex items-center justify-center gap-1.5 active:scale-[0.99] cursor-pointer"
            >
              <Check size={14} className="text-[#C5A059]" />
              <span>Übernehmen</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
};
