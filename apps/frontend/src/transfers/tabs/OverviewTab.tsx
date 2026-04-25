/* ═══════════════════════════════════════════════════════════════════
   OverviewTab.tsx — Budget overview + recent transfers
   ═══════════════════════════════════════════════════════════════════ */

import React from 'react';
import { useTransfer } from '../state/GameContext';

const OverviewTab: React.FC = () => {
  const { getActiveClub, getActiveClubPlayers, getTransfers, getOffers, advanceWeek, state } = useTransfer();
  const club = getActiveClub();
  const players = getActiveClubPlayers();
  const transfers = Object.values(getTransfers()).sort((a, b) => b.date - a.date).slice(0, 5);
  const offers = getOffers();

  if (!club) return null;

  const wageSpent = players.reduce((sum, p) => sum + p.wage, 0);
  const wageBudget = club.wageBudget ?? Math.round(club.budget * 0.3);
  const totalPlayerValue = players.reduce((sum, p) => sum + p.value, 0);
  const avgAge = players.length > 0 ? Math.round(players.reduce((sum, p) => sum + p.age, 0) / players.length) : 0;
  const pendingIncoming = offers.filter((o) => o.toClubId === club.id && o.status === 'pending').length;
  const pendingOutgoing = offers.filter((o) => o.fromClubId === club.id && o.status === 'pending').length;

  return (
    <div className="space-y-4">
      {/* Club Info */}
      <div className="border border-[#444] bg-[#1e1e1e] p-3 rounded">
        <h3 className="text-[#efe56b] text-[10px] font-bold mb-2 uppercase tracking-wide">Club Overview</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-[9px]">
          <div>
            <span className="text-[#98ca7a]">Club</span>
            <p className="text-white font-bold text-[11px]">{club.name}</p>
          </div>
          <div>
            <span className="text-[#98ca7a]">Reputation</span>
            <p className="text-white font-bold">{club.reputation}/100</p>
          </div>
          <div>
            <span className="text-[#98ca7a]">League</span>
            <p className="text-[#00e5ff]">{club.leagueName ?? 'N/A'}</p>
          </div>
          <div>
            <span className="text-[#98ca7a]">Week</span>
            <p className="text-[#efe56b] font-bold">{state.week}</p>
          </div>
        </div>
      </div>

      {/* Financial Summary */}
      <div className="border border-[#444] bg-[#1e1e1e] p-3 rounded">
        <h3 className="text-[#efe56b] text-[10px] font-bold mb-2 uppercase tracking-wide">Financial Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-[9px]">
          <div>
            <span className="text-[#98ca7a]">Transfer Budget</span>
            <p className="text-white font-bold text-[11px]">€{(club.budget / 1_000_000).toFixed(1)}M</p>
          </div>
          <div>
            <span className="text-[#98ca7a]">Wage Budget</span>
            <p className="text-white font-bold">€{(wageBudget / 1000).toFixed(0)}K/w</p>
          </div>
          <div>
            <span className="text-[#98ca7a]">Wage Spend</span>
            <p className="text-white font-bold">€{(wageSpent / 1000).toFixed(0)}K/w</p>
          </div>
          <div>
            <span className="text-[#98ca7a]">Wage Remaining</span>
            <p className={`font-bold ${wageBudget - wageSpent > 0 ? 'text-[#2a8a2b]' : 'text-[#ff4444]'}`}>
              €{((wageBudget - wageSpent) / 1000).toFixed(0)}K/w
            </p>
          </div>
        </div>
      </div>

      {/* Squad Summary */}
      <div className="border border-[#444] bg-[#1e1e1e] p-3 rounded">
        <h3 className="text-[#efe56b] text-[10px] font-bold mb-2 uppercase tracking-wide">Squad Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-[9px]">
          <div>
            <span className="text-[#98ca7a]">Squad Size</span>
            <p className="text-white font-bold text-[11px]">{players.length}</p>
          </div>
          <div>
            <span className="text-[#98ca7a]">Avg Age</span>
            <p className="text-white font-bold">{avgAge}</p>
          </div>
          <div>
            <span className="text-[#98ca7a]">Total Value</span>
            <p className="text-white font-bold">€{(totalPlayerValue / 1_000_000).toFixed(1)}M</p>
          </div>
          <div>
            <span className="text-[#98ca7a]">Avg Value</span>
            <p className="text-white font-bold">€{(totalPlayerValue / Math.max(1, players.length) / 1_000_000).toFixed(1)}M</p>
          </div>
        </div>
      </div>

      {/* Transfer Activity */}
      <div className="border border-[#444] bg-[#1e1e1e] p-3 rounded">
        <h3 className="text-[#efe56b] text-[10px] font-bold mb-2 uppercase tracking-wide">Transfer Activity</h3>
        <div className="grid grid-cols-2 gap-3 text-[9px] mb-3">
          <div>
            <span className="text-[#98ca7a]">Pending Incoming</span>
            <p className="text-[#efe56b] font-bold">{pendingIncoming}</p>
          </div>
          <div>
            <span className="text-[#98ca7a]">Pending Outgoing</span>
            <p className="text-[#00e5ff] font-bold">{pendingOutgoing}</p>
          </div>
        </div>

        {transfers.length > 0 && (
          <>
            <h4 className="text-[#98ca7a] text-[9px] font-bold mb-1 uppercase">Recent Transfers</h4>
            <div className="space-y-1">
              {transfers.map((t) => (
                <div key={t.id} className="flex items-center justify-between text-[8px] bg-[#232323] p-1 rounded">
                  <span className="text-white truncate max-w-[100px]">{t.playerName}</span>
                  <span className="text-[#98ca7a]">{t.fromClubName} → {t.toClubName}</span>
                  <span className="text-[#efe56b]">€{(t.fee / 1_000_000).toFixed(1)}M</span>
                </div>
              ))}
            </div>
          </>
        )}
        {transfers.length === 0 && (
          <p className="text-[#00e5ff] text-[9px]">No completed transfers yet.</p>
        )}
      </div>

      {/* Advance Week Button */}
      <div className="flex justify-center">
        <button
          onClick={advanceWeek}
          className="px-4 py-2 text-[9px] font-bold bg-[#2a5a2a] text-white border-2 border-[#2a8a2b] rounded hover:bg-[#1a4a1a] uppercase tracking-wide"
          style={{ fontFamily: '"Press Start 2P", "Courier New", monospace' }}
        >
          Advance Week (Week {state.week + 1})
        </button>
      </div>
    </div>
  );
};

export default OverviewTab;
