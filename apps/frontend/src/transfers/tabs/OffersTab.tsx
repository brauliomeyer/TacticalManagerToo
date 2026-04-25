/* ═══════════════════════════════════════════════════════════════════
   OffersTab.tsx — Incoming & outgoing bids
   ═══════════════════════════════════════════════════════════════════ */

import React, { useState } from 'react';
import { useTransfer } from '../state/GameContext';
import type { Offer, Player } from '../state/gameReducer';

const OffersTab: React.FC = () => {
  const { getOffers, getPlayer, getClub, handleAcceptOffer, handleRejectOffer, handleCounterOffer, state } = useTransfer();
  const offers = getOffers();
  const [counterModal, setCounterModal] = useState<Offer | null>(null);
  const [counterAmount, setCounterAmount] = useState(0);
  const [counterWage, setCounterWage] = useState(0);

  const incomingOffers = offers.filter((o) => o.toClubId === state.activeClubId);
  const outgoingOffers = offers.filter((o) => o.fromClubId === state.activeClubId);

  const openCounter = (offer: Offer) => {
    setCounterModal(offer);
    setCounterAmount(Math.round(offer.amount * 1.2));
    setCounterWage(offer.wage);
  };

  const submitCounter = () => {
    if (!counterModal) return;
    handleCounterOffer(counterModal.id, counterAmount, counterWage);
    setCounterModal(null);
  };

  const renderOfferRow = (offer: Offer) => {
    const player = getPlayer(offer.playerId);
    const fromClub = getClub(offer.fromClubId);
    const toClub = getClub(offer.toClubId);
    if (!player) return null;

    const statusColors: Record<string, string> = {
      pending: 'text-[#efe56b]',
      accepted: 'text-[#2a8a2b]',
      rejected: 'text-[#ff4444]',
      counter: 'text-[#00e5ff]',
    };

    return (
      <div key={offer.id} className="border border-[#444] bg-[#1e1e1e] p-2 rounded mb-2">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <span className="text-white text-[10px] font-bold">{player.name}</span>
            <span className="text-[#98ca7a] text-[8px]">{player.position}</span>
            <span className="text-[#98ca7a] text-[8px]">OVR: {Math.round((player.attributes.technical + player.attributes.mental + player.attributes.physical) / 3)}</span>
          </div>
          <span className={`text-[8px] font-bold uppercase ${statusColors[offer.status]}`}>{offer.status}</span>
        </div>
        <div className="flex items-center justify-between text-[8px]">
          <div className="flex items-center gap-3">
            <span className="text-[#98ca7a]">
              {offer.type === 'incoming' ? 'From:' : 'To:'}{' '}
              <span className="text-[#00e5ff]">{offer.type === 'incoming' ? fromClub?.name : toClub?.name}</span>
            </span>
            <span className="text-[#98ca7a]">
              Fee: <span className="text-[#efe56b]">€{(offer.amount / 1_000_000).toFixed(1)}M</span>
            </span>
            <span className="text-[#98ca7a]">
              Wage: <span className="text-white">€{offer.wage.toLocaleString()}/w</span>
            </span>
          </div>
          {offer.status === 'pending' && offer.type === 'incoming' && (
            <div className="flex gap-1">
              <button
                onClick={() => handleAcceptOffer(offer.id)}
                className="px-2 py-0.5 text-[7px] font-bold bg-[#2a5a2a] text-white border border-[#2a8a2b] rounded hover:bg-[#1a4a1a]"
              >
                Accept
              </button>
              <button
                onClick={() => openCounter(offer)}
                className="px-2 py-0.5 text-[7px] font-bold bg-[#2a2a5a] text-white border border-[#00e5ff] rounded hover:bg-[#1a1a4a]"
              >
                Counter
              </button>
              <button
                onClick={() => handleRejectOffer(offer.id)}
                className="px-2 py-0.5 text-[7px] font-bold bg-[#5a2a2a] text-white border border-[#ff4444] rounded hover:bg-[#4a1a1a]"
              >
                Reject
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Incoming Offers */}
      <div>
        <h3 className="text-[#efe56b] text-[10px] font-bold mb-2 uppercase tracking-wide">
          Incoming Offers ({incomingOffers.length})
        </h3>
        {incomingOffers.length === 0 ? (
          <p className="text-[#00e5ff] text-[9px]">No incoming offers.</p>
        ) : (
          incomingOffers.map(renderOfferRow)
        )}
      </div>

      {/* Outgoing Offers */}
      <div>
        <h3 className="text-[#00e5ff] text-[10px] font-bold mb-2 uppercase tracking-wide">
          Outgoing Offers ({outgoingOffers.length})
        </h3>
        {outgoingOffers.length === 0 ? (
          <p className="text-[#00e5ff] text-[9px]">No outgoing offers.</p>
        ) : (
          outgoingOffers.map(renderOfferRow)
        )}
      </div>

      {/* Counter Offer Modal */}
      {counterModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-[#1e1e1e] border-2 border-[#efe56b] p-4 rounded w-80">
            <h3 className="text-[#efe56b] text-[10px] font-bold mb-3 uppercase">Counter Offer</h3>
            <p className="text-white text-[9px] mb-2">
              Player: <strong>{getPlayer(counterModal.playerId)?.name}</strong>
            </p>
            <p className="text-[#98ca7a] text-[8px] mb-3">
              Original Bid: €{(counterModal.amount / 1_000_000).toFixed(1)}M
            </p>
            <div className="space-y-2 mb-3">
              <div>
                <label className="text-[#98ca7a] text-[8px] block mb-1">Counter Amount (€)</label>
                <input
                  type="number"
                  value={counterAmount}
                  onChange={(e) => setCounterAmount(Number(e.target.value))}
                  className="w-full bg-[#232323] border border-[#444] text-white text-[9px] px-2 py-1 rounded"
                />
              </div>
              <div>
                <label className="text-[#98ca7a] text-[8px] block mb-1">Offered Wage (€/w)</label>
                <input
                  type="number"
                  value={counterWage}
                  onChange={(e) => setCounterWage(Number(e.target.value))}
                  className="w-full bg-[#232323] border border-[#444] text-white text-[9px] px-2 py-1 rounded"
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setCounterModal(null)}
                className="px-3 py-1 text-[8px] font-bold bg-[#5a2a2a] text-white border border-[#ff4444] rounded hover:bg-[#4a1a1a]"
              >
                Cancel
              </button>
              <button
                onClick={submitCounter}
                className="px-3 py-1 text-[8px] font-bold bg-[#2a2a5a] text-white border border-[#00e5ff] rounded hover:bg-[#1a1a4a]"
              >
                Send Counter
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OffersTab;
