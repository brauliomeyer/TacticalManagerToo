/* ═══════════════════════════════════════════════════════════════════
   transferLogic.ts — Pure functions for transfer operations
   ═══════════════════════════════════════════════════════════════════ */

import type { Player, Club, Transfer, Offer } from '../state/gameReducer';

// ────────────────────────────────────────────
// TYPES
// ────────────────────────────────────────────

export interface BidResult {
  success: boolean;
  offer: Offer;
  updatedTransfer?: Transfer;
  message: string;
}

export interface TransferExecution {
  player: Player;
  fromClub: Club;
  toClub: Club;
  fee: number;
  wage: number;
  updatedFromBudget: number;
  updatedToBudget: number;
  updatedFromWageSpent: number;
  updatedToWageSpent: number;
}

// ────────────────────────────────────────────
// BID LOGIC
// ────────────────────────────────────────────

/**
 * Create a bid from a club for a player.
 * Validates budget and returns the offer.
 */
export function makeBid(
  player: Player,
  fromClubId: string,
  toClub: Club,
  bidAmount: number,
  bidWage: number,
): BidResult {
  // Validate bid amount
  if (bidAmount <= 0) {
    return { success: false, offer: null as unknown as Offer, message: 'Bid amount must be positive.' };
  }

  // Check if buying club can afford it
  if (bidAmount > toClub.budget) {
    return { success: false, offer: null as unknown as Offer, message: `Insufficient transfer budget. Need €${(bidAmount / 1_000_000).toFixed(1)}M, have €${(toClub.budget / 1_000_000).toFixed(1)}M.` };
  }

  // Check wage budget
  const wageTotal = (toClub.wageSpent || 0) + bidWage;
  if (wageTotal > (toClub.wageBudget || toClub.budget * 0.3)) {
    return { success: false, offer: null as unknown as Offer, message: 'Insufficient wage budget.' };
  }

  const offer: Offer = {
    id: `offer-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    playerId: player.id,
    fromClubId,
    toClubId: toClub.id,
    amount: bidAmount,
    wage: bidWage,
    status: 'pending',
    type: 'incoming',
    createdAt: Date.now(),
  };

  return {
    success: true,
    offer,
    message: `Bid of €${(bidAmount / 1_000_000).toFixed(1)}M submitted for ${player.name}.`,
  };
}

/**
 * Accept an offer — returns the transfer execution details.
 */
export function acceptOffer(
  offer: Offer,
  player: Player,
  fromClub: Club,
  toClub: Club,
): { execution: TransferExecution; updatedOffer: Offer } {
  const updatedOffer: Offer = { ...offer, status: 'accepted' };

  const transfer: Transfer = {
    id: `transfer-${Date.now()}`,
    playerId: player.id,
    playerName: player.name,
    fromClubId: fromClub.id,
    fromClubName: fromClub.name,
    toClubId: toClub.id,
    toClubName: toClub.name,
    fee: offer.amount,
    wage: offer.wage,
    status: 'completed',
    date: Date.now(),
  };

  const execution: TransferExecution = {
    player: { ...player, clubId: toClub.id, wage: offer.wage, contractYears: 3, morale: 80 },
    fromClub,
    toClub,
    fee: offer.amount,
    wage: offer.wage,
    updatedFromBudget: fromClub.budget + offer.amount,
    updatedToBudget: toClub.budget - offer.amount,
    updatedFromWageSpent: Math.max(0, (fromClub.wageSpent || 0) - player.wage),
    updatedToWageSpent: (toClub.wageSpent || 0) + offer.wage,
  };

  return { execution, updatedOffer };
}

/**
 * Reject an offer.
 */
export function rejectOffer(offer: Offer): Offer {
  return { ...offer, status: 'rejected' };
}

/**
 * Negotiate an offer (counter-offer).
 */
export function negotiateOffer(offer: Offer, counterAmount: number, counterWage: number): Offer {
  return {
    ...offer,
    status: 'counter',
    amount: counterAmount,
    wage: counterWage,
  };
}

/**
 * Check if a transfer is financially viable for a club.
 */
export function isTransferViable(
  club: Club,
  fee: number,
  wage: number,
): { viable: boolean; reason?: string } {
  if (fee > club.budget) {
    return { viable: false, reason: `Transfer fee €${(fee / 1_000_000).toFixed(1)}M exceeds budget €${(club.budget / 1_000_000).toFixed(1)}M` };
  }

  const newWageTotal = (club.wageSpent || 0) + wage;
  const wageCap = club.wageBudget || club.budget * 0.3;
  if (newWageTotal > wageCap) {
    return { viable: false, reason: `Wage budget would be exceeded (€${(newWageTotal / 1000).toFixed(0)}K / €${(wageCap / 1000).toFixed(0)}K)` };
  }

  return { viable: true };
}
