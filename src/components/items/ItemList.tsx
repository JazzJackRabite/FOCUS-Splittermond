import React from 'react';
import { SourceBadge } from '../ui/SourceBadge';
import type { ItemEntry, AppMode } from '../../types';
import {
  getStrengthDetails,
  getWeaknessDetails,
  getResourceDetails,
  getLanguageDetails,
} from '../../utils/gameResourceManager';

interface ItemListProps {
  items: ItemEntry[];
  onDelete: (idx: number) => void;
  typeLabel: string;
  showCosts: boolean;
  xpMultiplier?: number;
  mode?: AppMode;
}

export const ItemList: React.FC<ItemListProps> = ({
  items,
  onDelete,
  typeLabel,
  showCosts,
  xpMultiplier = 5,
  mode = 'creation',
}) => {
  if (items.length === 0) {
    return (
      <div className="text-gray-400 text-sm italic p-2">Keine {typeLabel} gewählt</div>
    );
  }
  return (
    <div className="space-y-2 mt-2">
      {items.map((item, idx) => {
        const itemLevel = item.level ?? 1;
        const itemPointCost = item.pointCost !== undefined ? item.pointCost : 1;
        const creationCost = itemLevel * itemPointCost;
        const xpCost = itemLevel * itemPointCost * xpMultiplier;

        const canDelete = mode === 'creation'
          ? !item.isRacial
          : item.source === 'xp' && !item.isRacial && !item.isFree && item.pointCost !== 0;

        let details: { desc: string; source: string; page?: number } | null = null;
        if (typeLabel.includes('Sprach')) {
          details = getLanguageDetails(item.name, item.desc);
        } else if (typeLabel.includes('Schwäch')) {
          details = getWeaknessDetails(item.name, item.desc);
        } else if (typeLabel.includes('Stärk')) {
          details = getStrengthDetails(item.name, item.desc);
        } else if (typeLabel.includes('Ressourc')) {
          details = getResourceDetails(item.name, item.desc);
        }

        const rawSrc = item.sourceRef || item.source;
        const isGenericSource = !rawSrc || rawSrc === 'creation' || rawSrc === 'xp' || rawSrc === 'Regelwerk' || rawSrc === 'Erschaffung';
        const source = isGenericSource ? (details?.source || 'GRW') : rawSrc;
        const page = item.page ?? details?.page;
        const description = item.desc || details?.desc;

        return (
          <div
            key={idx}
            className="flex justify-between items-start bg-[#161B26] p-2.5 rounded-lg border border-[#3A4258] hover:border-[#C5A059]/40 transition-colors"
          >
            <div>
              <div className="flex items-center flex-wrap gap-2">
                <span className="font-bold text-[#F5F2EA]">{item.name}</span>
                {item.level && item.level > 1 ? (
                  <span className="bg-[#1B365D] border border-[#C5A059]/40 px-2 py-0.5 rounded text-[10px] font-bold text-[#FBEFCE] uppercase tracking-wider">
                    Stufe {item.level}
                  </span>
                ) : null}
                <SourceBadge
                  source={source}
                  page={page}
                  tooltipData={{ title: item.name, description }}
                />
              </div>

              {showCosts && (
                <div className="text-[10px] text-gray-400 mt-1">
                  {item.isRacial ? (
                    <span className="text-emerald-400 font-bold">Gratis: Rasse</span>
                  ) : item.pointCost === 0 ? (
                    <span className="text-emerald-400 font-bold">Gratis: Heimat</span>
                  ) : item.source === 'creation' ? (
                    <span className="text-[#C5A059] font-bold">
                      {creationCost} Pkt (Erstellung)
                    </span>
                  ) : item.isFree ? (
                    <span className="text-emerald-400 font-bold">Gratis</span>
                  ) : (
                    <span>
                      Kosten: {xpCost} EP
                    </span>
                  )}
                </div>
              )}
            </div>
            {canDelete && (
              <button
                onClick={() => onDelete(idx)}
                className="text-red-400/70 hover:text-red-300 font-bold text-lg px-2 no-print shrink-0 cursor-pointer transition-colors"
                title="Entfernen"
              >
                ×
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
};
