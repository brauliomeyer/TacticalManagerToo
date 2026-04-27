/* ═══════════════════════════════════════════════════════════════════
   TransferListTab.tsx — Global transfer market (all listed players)
   ═══════════════════════════════════════════════════════════════════ */

import React, { useState, useMemo } from 'react';
import { useTransfer } from '../state/GameContext';
import PlayerTable from '../components/PlayerTable';
import type { Player } from '../state/gameReducer';

const TransferListTab: React.FC = () => {
  const { getClub, addToShortlist, placeBid, state } = useTransfer();
  const [search, setSearch] = useState('');
  const [positionFilter, setPositionFilter] = useState('');
  const [sortBy, setSortBy] = useState('value');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [bidModal, setBidModal] = useState<Player | null>(null);
  const [bidAmount, setBidAmount] = useState(0);
  const [bidWage, setBidWage] = useState(0);
  const [bidError, setBidError] = useState<string | null>(null);

  // Show all players not in active club (listed + free agents)
  const marketPlayers = useMemo(() => {
    return Object.values(state.players).filter(
      (p) => p.clubId !== state.activeClubId && !p.isYouth
    );
  }, [state.players, state.activeClubId]);

  const positions = useMemo(() => {
    const posSet = new Set(marketPlayers.map((p) => p.position));
    return Array.from(posSet).sort();
  }, [marketPlayers]);

  const filtered = useMemo(() => {
    let result = marketPlayers;
    if (search) {
      const lower = search.toLowerCase();
      result = result.filter((p) => p.name.toLowerCase().includes(lower));
    }
    if (positionFilter) {
      result = result.filter((p) => p.position === positionFilter);
    }
    return result;
  }, [marketPlayers, search, positionFilter]);

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortDir('desc');
    }
  };

  const handleBid = (player: Player) => {
    setBidModal(player);
    setBidAmount(Math.round(player.value * 0.8));
    setBidWage(player.wage);
    setBidError(null);
  };

  const submitBid = () => {
    if (!bidModal) return;
    const error = placeBid(bidModal.id, bidAmount, bidWage);
    if (error) {
      setBidError(error);
    } else {
      setBidModal(null);
    }
  };

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-3">
        <input
          type="text"
          placeholder="Search market..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-[#232323] border border-[#444] text-white text-[9px] px-2 py-1 rounded w-40"
          style={{ fontFamily: '"Press Start 2P", "Courier New", monospace' }}
        />
        <select
          value={positionFilter}
          onChange={(e) => setPositionFilter(e.target.value)}
          className="bg-[#232323] border border-[#444] text-white text-[9px] px-2 py-1 rounded"
          style={{ fontFamily: '"Press Start 2P", "Courier New", monospace' }}
        >
          <option value="">All Positions</option>
          {positions.map((pos) => (
            <option key={pos} value={pos}>{pos}</option>
          ))}
        </select>
        <span className="text-[#98ca7a] text-[9px] self-center">{filtered.length} players</span>
      </div>

      {/* Player Table */}
      <PlayerTable
        players={filtered}
        clubs={state.clubs}
        showClub
        sortBy={sortBy}
        sortDir={sortDir}
        onSort={handleSort}
        showActions
        onBid={handleBid}
        onShortlist={(player) => addToShortlist(player.id)}
        emptyMessage="No players available on the transfer market."
      />

      {/* Bid Modal */}
      {bidModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-[#1e1e1e] border-2 border-[#efe56b] p-4 rounded w-80">
            <h3 className="text-[#efe56b] text-[10px] font-bold mb-3 uppercase">Place Bid</h3>
            <p className="text-white text-[9px] mb-2">Player: <strong>{bidModal.name}</strong></p>
            <p className="text-[#98ca7a] text-[8px] mb-3">
              Club: {getClub(bidModal.clubId ?? '')?.name ?? 'Free Agent'} | 
              Value: €{(bidModal.value / 1_000_000).toFixed(1)}M | 
              Wage: €{bidModal.wage.toLocaleString()}/w
            </p>
            <div className="space-y-2 mb-3">
              <div>
                <label className="text-[#98ca7a] text-[8px] block mb-1">Bid Amount (€)</label>
                <input
                  type="number"
                  value={bidAmount}
                  onChange={(e) => setBidAmount(Number(e.target.value))}
                  className="w-full bg-[#232323] border border-[#444] text-white text-[9px] px-2 py-1 rounded"
                />
              </div>
              <div>
                <label className="text-[#98ca7a] text-[8px] block mb-1">Offered Wage (€/w)</label>
                <input
                  type="number"
                  value={bidWage}
                  onChange={(e) => setBidWage(Number(e.target.value))}
                  className="w-full bg-[#232323] border border-[#444] text-white text-[9px] px-2 py-1 rounded"
                />
              </div>
            </div>
            {bidError && <p className="text-[#ff4444] text-[8px] mb-2">{bidError}</p>}
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setBidModal(null)}
                className="px-3 py-1 text-[8px] font-bold bg-[#5a2a2a] text-white border border-[#ff4444] rounded hover:bg-[#4a1a1a]"
              >
                Cancel
              </button>
              <button
                onClick={submitBid}
                className="px-3 py-1 text-[8px] font-bold bg-[#2a5a2a] text-white border border-[#2a8a2b] rounded hover:bg-[#1a4a1a]"
              >
                Submit Bid
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransferListTab;
