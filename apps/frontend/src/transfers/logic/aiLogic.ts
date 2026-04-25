/* ═══════════════════════════════════════════════════════════════════
   aiLogic.ts — Pure functions for AI-driven transfer market behavior
   ═══════════════════════════════════════════════════════════════════ */

import type { Player, Club, Offer } from '../state/gameReducer';
import { calculatePlayerValue } from './playerLogic';

// ────────────────────────────────────────────
// HELPERS
// ────────────────────────────────────────────

function seededRandom(seed: number): number {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  s = (s * 16807) % 2147483647;
  return (s - 1) / 2147483646;
}

function calculateOvr(p: Player): number {
  return Math.round((p.attributes.technical + p.attributes.mental + p.attributes.physical) / 3);
}

// ────────────────────────────────────────────
// VALUE FLUCTUATION
// ────────────────────────────────────────────

/**
 * Simulate weekly value fluctuations for all players.
 * Returns a map of playerId -> new value.
 */
export function valueFluctuation(
  players: Player[],
  week: number,
): Map<string, number> {
  const fluctuations = new Map<string, number>();

  for (const player of players) {
    const seed = week * 1000 + player.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    const ovr = calculateOvr(player);

    // Random fluctuation: -15% to +15%
    const change = (seededRandom(seed) - 0.5) * 0.3;
    const formBonus = ((player.form || 50) - 50) / 100 * 0.1; // Form affects value

    const newValue = Math.round(
      player.value * (1 + change + formBonus)
    );

    fluctuations.set(player.id, Math.max(10000, newValue));
  }

  return fluctuations;
}

// ────────────────────────────────────────────
// AI BIDDING
// ────────────────────────────────────────────

/**
 * Generate random AI club bids for players on the transfer list.
 * Returns an array of new offers from AI clubs.
 */
export function randomClubBids(
  players: Player[],
  clubs: Club[],
  activeClubId: string,
  week: number,
): Offer[] {
  const offers: Offer[] = [];
  const seed = week * 777;

  // Only consider players not in the active club
  const availablePlayers = players.filter(p => p.clubId !== activeClubId && !p.isYouth);

  // Each week, 5-15 random AI bids are generated
  const bidCount = 5 + Math.floor(seededRandom(seed) * 10);

  for (let i = 0; i < bidCount && i < availablePlayers.length; i++) {
    const playerIndex = Math.floor(seededRandom(seed + i * 13) * availablePlayers.length);
    const player = availablePlayers[playerIndex];

    // Find a random buying club (not the player's current club, not the active club)
    const buyingClubs = clubs.filter(c => c.id !== player.clubId && c.id !== activeClubId);
    if (buyingClubs.length === 0) continue;

    const buyer = buyingClubs[Math.floor(seededRandom(seed + i * 17) * buyingClubs.length)];

    // AI bid amount: 70-130% of player value
    const bidMultiplier = 0.7 + seededRandom(seed + i * 19) * 0.6;
    const bidAmount = Math.round(player.value * bidMultiplier);

    // AI wage offer: 80-120% of current wage
    const wageMultiplier = 0.8 + seededRandom(seed + i * 23) * 0.4;
    const bidWage = Math.round(player.wage * wageMultiplier);

    // Check if buyer can afford it
    if (bidAmount > buyer.budget) continue;

    const offer: Offer = {
      id: `ai-offer-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 5)}`,
      playerId: player.id,
      fromClubId: player.clubId ?? '',
      toClubId: buyer.id,
      amount: bidAmount,
      wage: bidWage,
      status: 'pending',
      type: 'outgoing',
      createdAt: Date.now(),
    };

    offers.push(offer);
  }

  return offers;
}

/**
 * Determine if an AI club accepts, rejects, or counters a bid.
 */
export function aiRespondToBid(
  player: Player,
  club: Club,
  bidAmount: number,
  seed: number,
): 'accept' | 'reject' | 'counter' {
  const ovr = calculateOvr(player);
  const playerValue = player.value;

  // Calculate bid ratio
  const bidRatio = bidAmount / playerValue;

  // Club needs money (low budget) = more likely to accept
  const financialPressure = club.budget < 5000000 ? 0.3 : 0;

  // Player wants to leave (low morale) = more likely to accept
  const moralePressure = (player.morale || 50) < 40 ? 0.2 : 0;

  // Random factor
  const randomFactor = seededRandom(seed) * 0.3;

  const acceptThreshold = 0.7 + financialPressure + moralePressure + randomFactor;

  if (bidRatio >= 1.3) return 'accept';
  if (bidRatio >= acceptThreshold) return 'accept';
  if (bidRatio >= 0.6) return 'counter';
  return 'reject';
}

/**
 * Generate a counter-offer amount.
 */
export function generateCounterOffer(player: Player, bidAmount: number, seed: number): number {
  const counterMultiplier = 1.1 + seededRandom(seed) * 0.3;
  return Math.round(Math.max(bidAmount, player.value * 0.8) * counterMultiplier);
}

/**
 * Flag players for the transfer list based on various factors.
 * Returns an array of player IDs to list.
 */
export function flagTransferListPlayers(players: Player[], week: number): string[] {
  const listed: string[] = [];
  const seed = week * 333;

  for (let i = 0; i < players.length; i++) {
    const player = players[i];
    const playerSeed = seed + i * 7;

    // Old players (32+) are more likely to be listed
    if (player.age >= 32 && seededRandom(playerSeed) < 0.4) {
      listed.push(player.id);
      continue;
    }

    // Low morale players
    if ((player.morale || 50) < 35 && seededRandom(playerSeed + 10) < 0.5) {
      listed.push(player.id);
      continue;
    }

    // Random listing (5% chance per player per week)
    if (seededRandom(playerSeed + 20) < 0.05) {
      listed.push(player.id);
      continue;
    }

    // Young players with low OVR (not developing)
    const ovr = calculateOvr(player);
    if (player.age <= 21 && ovr < 50 && seededRandom(playerSeed + 30) < 0.3) {
      listed.push(player.id);
      continue;
    }
  }

  return listed;
}
