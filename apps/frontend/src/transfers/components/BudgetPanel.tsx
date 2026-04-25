/* ═══════════════════════════════════════════════════════════════════
   BudgetPanel.tsx — Budget overview bar
   ═══════════════════════════════════════════════════════════════════ */

import React from 'react';
import { useTransfer } from '../state/GameContext';

const BudgetPanel: React.FC = () => {
  const { getActiveClub, getActiveClubPlayers, getOffers } = useTransfer();
  const club = getActiveClub();
  const players = getActiveClubPlayers();
  const offers = getOffers();

  if (!club) return null;

  const wageSpent = players.reduce((sum, p) => sum + p.wage, 0);
  const wageBudget = club.wageBudget ?? Math.round(club.budget * 0.3);
  const wageRemaining = wageBudget - wageSpent;
  const incoming = offers.filter((o) => o.toClubId === club.id && o.status === 'pending').length;
  const outgoing = offers.filter((o) => o.fromClubId === club.id && o.status === 'pending').length;

  return (
    <div className="border-2 border-[#efe56b] bg-[#1a3a1e] px-3 py-2 mb-3 sticky top-0 z-10">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
        <span className="text-[#98ca7a]">
          Transfer Budget: <strong className="text-white">€{(club.budget / 1_000_000).toFixed(1)}M</strong>
        </span>
        <span className="text-[#98ca7a]">
          Wage Budget: <strong className="text-white">€{(wageBudget / 1000).toFixed(0)}K/w</strong>
        </span>
        <span className="text-[#98ca7a]">
          Wage Spend: <strong className="text-white">€{(wageSpent / 1000).toFixed(0)}K/w</strong>
        </span>
        <span className="text-[#98ca7a]">
          Remaining: <strong className={wageRemaining > 0 ? 'text-[#2a8a2b]' : 'text-[#ff4444]'}>€{(wageRemaining / 1000).toFixed(0)}K/w</strong>
        </span>
        <span className="text-[#6b9a5a]">|</span>
        <span className="text-[10px] text-[#d5f8b6]">
          Squad: <strong className="text-white">{players.length}</strong>
        </span>
        <span className="text-[10px] text-[#d5f8b6]">
          Incoming: <strong className="text-[#efe56b]">{incoming}</strong>
        </span>
        <span className="text-[10px] text-[#d5f8b6]">
          Outgoing: <strong className="text-[#00e5ff]">{outgoing}</strong>
        </span>
      </div>
    </div>
  );
};

export default BudgetPanel;
