/* ═══════════════════════════════════════════════════════════════════
   ShortlistTab.tsx — Saved players for scouting
   ═══════════════════════════════════════════════════════════════════ */

import React, { useState } from 'react';
import { useTransfer } from '../state/GameContext';
import PlayerTable from '../components/PlayerTable';
import type { Player } from '../state/gameReducer';

const ShortlistTab: React.FC = () => {
  const { getShortlistPlayers, removeFromShortlist, placeBid, state } = useTransfer();
  const shortlistPlayers = getShortlistPlayers();
  const [sortBy, setSortBy] = useState('value');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [bidModal, setBidModal] = useState<Player | null>(null);
  const [bidAmount, setBidAmount] = useState(0);
  const [bidWage, setBidWage] = useState(0);
  const [bidError, setBidError] = useState<string | null>(null);

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
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[#efe56b] text-[10px] font-bold uppercase tracking-wide">
          Shortlist ({shortlistPlayers.length})
        </h3>
      </div>

      {shortlistPlayers.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-[#00e5ff] text-[10px]">No players on your shortlist.</p>
          <p className="text-[#98ca7a] text-[8px] mt-1">Use the "WATCH" button on any player to add them here.</p>
        </div>
      ) : (
        <PlayerTable
          players={shortlistPlayers}
          clubs={state.clubs}
          showClub
          sortBy={sortBy}
          sortDir={sortDir}
          onSort={handleSort}
          showActions
          onBid={handleBid}
          onShortlist={(player) => removeFromShortlist(player.id)}
          emptyMessage="No players on your shortlist."
        />
      )}

      {/* Bid Modal */}
      {bidModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-[#1e1e1e] border-2 border-[#efe56b] p-4 rounded w-80">
            <h3 className="text-[#efe56b] text-[10px] font-bold mb-3 uppercase">Place Bid</h3>
            <p className="text-white text-[9px] mb-2">Player: <strong>{bidModal.name}</strong></p>
            <p className="text-[#98ca7a] text-[8px] mb-3">
              Value: €{(bidModal.value / 1_000_000).toFixed(1)}M | Wage: €{bidModal.wage.toLocaleString()}/w
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

export default ShortlistTab;
