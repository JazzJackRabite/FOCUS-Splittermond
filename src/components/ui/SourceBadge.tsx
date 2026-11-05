import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { X } from 'lucide-react';

interface TooltipStat {
  label: string;
  value: string | number;
  colSpan?: boolean;
}

interface TooltipDataType {
  title?: string;
  description?: string;
  stats?: TooltipStat[];
}

interface SourceBadgeProps {
  source?: string;
  page?: number;
  tooltipData?: TooltipDataType;
  className?: string;
}

export const SourceBadge: React.FC<SourceBadgeProps> = ({ source, page, tooltipData, className }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const [isMobile, setIsMobile] = useState(false);
  const badgeRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const displaySource = (!source || source === 'creation' || source === 'xp' || source === 'Regelwerk' || source === 'Erschaffung')
    ? 'GRW'
    : source;

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const calculatePosition = () => {
    if (!badgeRef.current) return;
    const badgeRect = badgeRef.current.getBoundingClientRect();
    const tooltip = tooltipRef.current;

    // Use measured dimensions if mounted, otherwise use safe estimates
    const tooltipWidth = tooltip ? tooltip.offsetWidth : 320;
    const tooltipHeight = tooltip ? tooltip.offsetHeight : 280;

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const PADDING = 12;

    // Horizontal placement:
    // Try right side first: badge right + 10px
    // If it doesn't fit on the right, try left side: badge left - 10px - tooltipWidth
    const canFitRight = badgeRect.right + 10 + tooltipWidth <= viewportWidth - PADDING;
    const canFitLeft = badgeRect.left - 10 - tooltipWidth >= PADDING;

    let x: number;
    if (canFitRight) {
      x = badgeRect.right + 10;
    } else if (canFitLeft) {
      x = badgeRect.left - 10 - tooltipWidth;
    } else {
      // If neither side fits fully, place aligned with badge left
      x = badgeRect.left;
    }

    // Strict viewport clamp for horizontal coordinate
    const maxX = Math.max(PADDING, viewportWidth - tooltipWidth - PADDING);
    x = Math.max(PADDING, Math.min(x, maxX));

    // Vertical placement:
    // Start aligned with badge top
    let y = badgeRect.top;

    // If bottom of tooltip exceeds the viewport bottom, shift upward
    if (y + tooltipHeight > viewportHeight - PADDING) {
      y = viewportHeight - tooltipHeight - PADDING;
    }

    // Strict viewport clamp for vertical coordinate
    if (y < PADDING) {
      y = PADDING;
    }

    setCoords({ x: Math.round(x), y: Math.round(y) });
  };

  // Recalculate position whenever tooltip opens, using actual DOM measurements
  useLayoutEffect(() => {
    if (isOpen && !isMobile) {
      calculatePosition();
    }
  }, [isOpen, isMobile]);

  // Keep tooltip properly positioned on scroll or window resize while visible
  useEffect(() => {
    if (!isOpen || isMobile) return;
    const handleUpdate = () => {
      calculatePosition();
    };
    window.addEventListener('scroll', handleUpdate, true);
    window.addEventListener('resize', handleUpdate);
    return () => {
      window.removeEventListener('scroll', handleUpdate, true);
      window.removeEventListener('resize', handleUpdate);
    };
  }, [isOpen, isMobile]);

  const handleMouseEnter = () => {
    if (!isMobile) {
      calculatePosition();
      setIsOpen(true);
    }
  };

  const handleMouseLeave = () => {
    if (!isMobile) setIsOpen(false);
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isMobile) {
      setIsOpen(!isOpen);
    } else {
      calculatePosition();
      setIsOpen(true);
    }
  };

  const renderContent = () => (
    <>
      <h4 className="font-bold text-[#1B365D] text-sm border-b border-[#C5A059] pb-1 mb-2 fantasy-font pr-6">
        {tooltipData?.title}
      </h4>
      {isMobile && (
        <button
          onClick={() => setIsOpen(false)}
          className="absolute top-2 right-2 text-gray-500 hover:text-red-600 p-1 cursor-pointer"
        >
          <X size={16} />
        </button>
      )}
      {tooltipData?.description && (
        <div className="text-xs text-gray-800 italic mb-2 leading-snug whitespace-pre-line">
          {tooltipData.description}
        </div>
      )}
      {tooltipData?.stats && tooltipData.stats.length > 0 && (
        <div className="grid grid-cols-2 gap-x-3 gap-y-1 bg-white bg-opacity-50 p-2 rounded border border-gray-200 mb-2">
          {tooltipData.stats.map((s, i) => (
            <div
              key={i}
              className={`text-[10px] flex justify-between border-b border-gray-100 last:border-0 pb-0.5 ${s.colSpan ? 'col-span-2' : ''}`}
            >
              <span className="font-bold text-gray-600 mr-2">{s.label}:</span>
              <span className="text-[#1B365D] font-mono text-right">{s.value}</span>
            </div>
          ))}
        </div>
      )}
      <div className="text-[9px] text-[#C5A059] font-bold text-right mt-1 uppercase tracking-wider">
        Quelle: {displaySource} {page ? `S. ${page}` : ''}
      </div>
    </>
  );

  return (
    <>
      <div
        ref={badgeRef}
        className={className || "relative inline-block ml-2 align-middle shrink-0"}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
      >
        <span
          className={`inline-block bg-gray-200 text-gray-600 text-[9px] px-1.5 rounded font-mono border border-gray-300 align-middle ${tooltipData ? 'cursor-help hover:bg-[#C5A059] hover:text-white hover:border-[#b08d45]' : ''}`}
        >
          {displaySource} {page ? `S. ${page}` : ''}
        </span>
      </div>
      {isOpen && tooltipData && (
        isMobile ? (
          <div
            className="fixed inset-0 z-[9999] bg-black bg-opacity-60 flex items-center justify-center p-4"
            onClick={() => setIsOpen(false)}
          >
            <div
              className="bg-[#faf4e6] dark-theme-panel border-2 border-[#C5A059] shadow-2xl rounded p-4 w-full max-w-xs relative max-h-[85vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {renderContent()}
            </div>
          </div>
        ) : (
          <div
            ref={tooltipRef}
            className="fixed z-[9999] w-80 max-w-[calc(100vw-24px)] max-h-[calc(100vh-24px)] overflow-y-auto bg-[#faf4e6] dark-theme-panel border-2 border-[#C5A059] shadow-2xl rounded-lg p-3 text-left pointer-events-none"
            style={{ top: coords.y, left: coords.x }}
          >
            {renderContent()}
          </div>
        )
      )}
    </>
  );
};
