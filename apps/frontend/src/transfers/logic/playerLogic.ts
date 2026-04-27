/* ═══════════════════════════════════════════════════════════════════
   playerLogic.ts — Pure functions for player generation & valuation
   ═══════════════════════════════════════════════════════════════════ */

import { realSquads } from '../../realSquads';
import type { Player, Club } from '../state/gameReducer';

// ────────────────────────────────────────────
// CONSTANTS
// ────────────────────────────────────────────

const FALLBACK_SQUAD_ROLES: string[] = [
  'GOALKEEPER', 'LEFT_BACK', 'CENTER_BACK', 'CENTER_BACK', 'RIGHT_BACK',
  'DEFENSIVE_MIDFIELDER', 'CENTRAL_MIDFIELDER', 'CENTRAL_MIDFIELDER',
  'LEFT_WINGER', 'STRIKER', 'RIGHT_WINGER',
  'GOALKEEPER', 'LEFT_BACK', 'CENTER_BACK', 'RIGHT_BACK',
  'DEFENSIVE_MIDFIELDER', 'CENTRAL_MIDFIELDER', 'ATTACKING_MIDFIELDER',
  'LEFT_WINGER', 'STRIKER', 'RIGHT_WINGER', 'STRIKER', 'PLAYMAKER',
];

const FALLBACK_FIRST_NAMES = [
  'James', 'Oliver', 'Ethan', 'Noah', 'Liam', 'Jacob', 'Samuel', 'Leo', 'Mason', 'Ryan',
  'Harry', 'Jack', 'Charlie', 'Thomas', 'George', 'Oscar', 'William', 'Henry', 'Alfie', 'Freddie',
];

const FALLBACK_LAST_NAMES = [
  'Walker', 'Brown', 'Taylor', 'Wilson', 'Evans', 'King', 'Parker', 'Scott', 'Davies', 'Roberts',
  'Johnson', 'Williams', 'Jones', 'Miller', 'Davis', 'Garcia', 'Martinez', 'Anderson', 'Thomas', 'Jackson',
];

const YOUTH_FIRST_NAMES = [
  'Harvey', 'Jake', 'Kyle', 'Lucas', 'Mason', 'Nathan', 'Owen', 'Reece', 'Sam', 'Tommy',
  'Archie', 'Benny', 'Callum', 'Dylan', 'Elliot', 'Finley', 'George', 'Harry', 'Isaac', 'Jamie',
];

const YOUTH_LAST_NAMES = [
  'Adams', 'Baker', 'Clark', 'Dixon', 'Edwards', 'Fisher', 'Grant', 'Hayes', 'Irwin', 'James',
  'Knight', 'Lloyd', 'Morgan', 'Nelson', 'Owen', 'Price', 'Quinn', 'Reed', 'Smith', 'Turner',
];

const POSITIONS = [
  'GOALKEEPER', 'LEFT_BACK', 'CENTER_BACK', 'RIGHT_BACK',
  'DEFENSIVE_MIDFIELDER', 'CENTRAL_MIDFIELDER', 'ATTACKING_MIDFIELDER',
  'LEFT_WINGER', 'RIGHT_WINGER', 'STRIKER', 'PLAYMAKER',
  'BOX_TO_BOX_MIDFIELDER', 'SWEEPER', 'LEFT_WING_BACK', 'RIGHT_WING_BACK',
  'TARGET_MAN', 'FALSE_NINE', 'SECOND_STRIKER', 'INVERTED_WINGER', 'ANCHOR',
];

// ────────────────────────────────────────────
// HELPERS
// ────────────────────────────────────────────

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (Math.imul(31, hash) + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function seededRandom(seed: number): number {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  s = (s * 16807) % 2147483647;
  return (s - 1) / 2147483646;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function calculateOvr(p: Player): number {
  const t = p.attributes.technical;
  const m = p.attributes.mental;
  const ph = p.attributes.physical;
  return Math.round((t + m + ph) / 3);
}

// ────────────────────────────────────────────
// VALUE & WAGE CALCULATION
// ────────────────────────────────────────────

export function calculatePlayerValue(ovr: number, age: number, potential: number, contractYears: number): number {
  // Base value from OVR (0-99 scale)
  const baseValue = Math.pow(ovr / 50, 3) * 5000000;

  // Age factor: peak at 24-28, decline after 30
  let ageFactor: number;
  if (age <= 17) ageFactor = 0.3;
  else if (age <= 20) ageFactor = 0.6 + (age - 17) * 0.1;
  else if (age <= 24) ageFactor = 0.8 + (age - 20) * 0.05;
  else if (age <= 28) ageFactor = 1.0;
  else if (age <= 30) ageFactor = 0.85;
  else if (age <= 32) ageFactor = 0.65;
  else if (age <= 34) ageFactor = 0.45;
  else ageFactor = 0.25;

  // Potential bonus
  const potentialBonus = 1 + Math.max(0, (potential - ovr) / 100);

  // Contract factor: longer contract = higher value
  const contractFactor = 0.8 + contractYears * 0.05;

  const value = Math.round(baseValue * ageFactor * potentialBonus * contractFactor);
  return Math.max(10000, value);
}

export function calculatePlayerWage(ovr: number, age: number): number {
  const baseWage = Math.pow(ovr / 50, 2.5) * 20000;
  let ageFactor: number;
  if (age <= 17) ageFactor = 0.2;
  else if (age <= 20) ageFactor = 0.4;
  else if (age <= 24) ageFactor = 0.7;
  else if (age <= 28) ageFactor = 1.0;
  else if (age <= 30) ageFactor = 0.9;
  else if (age <= 32) ageFactor = 0.75;
  else if (age <= 34) ageFactor = 0.6;
  else ageFactor = 0.4;

  return Math.max(500, Math.round(baseWage * ageFactor));
}

// ────────────────────────────────────────────
// PLAYER GENERATION
// ────────────────────────────────────────────

export function generatePlayerName(seed: number): string {
  const first = FALLBACK_FIRST_NAMES[Math.floor(seededRandom(seed) * FALLBACK_FIRST_NAMES.length)];
  const last = FALLBACK_LAST_NAMES[Math.floor(seededRandom(seed + 100) * FALLBACK_LAST_NAMES.length)];
  return `${first} ${last}`;
}

export function generateYouthPlayerName(seed: number): string {
  const first = YOUTH_FIRST_NAMES[Math.floor(seededRandom(seed) * YOUTH_FIRST_NAMES.length)];
  const last = YOUTH_LAST_NAMES[Math.floor(seededRandom(seed + 100) * YOUTH_LAST_NAMES.length)];
  return `${first} ${last}`;
}

/**
 * Build a full squad for a club using realSquads data if available,
 * otherwise fall back to generated players.
 */
export function buildClubSquad(club: Club): Player[] {
  const seed = hashString(club.id + club.name);
  const realSquad = realSquads[club.name];
  const reputation = club.reputation || 50;
  const baseOvr = Math.round(reputation * 0.7 + 20);

  return FALLBACK_SQUAD_ROLES.map((role, index) => {
    const playerSeed = seed + index * 13;
    const real = realSquad?.[index];

    const name = real ? real.name : generatePlayerName(playerSeed);
    const age = real ? real.age : 18 + Math.floor(seededRandom(playerSeed + 5) * 17);

    // Generate attributes based on club reputation + variance
    const variance = Math.floor(seededRandom(playerSeed + 10) * 20) - 10;
    const technical = clamp(baseOvr + variance + Math.floor(seededRandom(playerSeed + 20) * 10), 20, 99);
    const mental = clamp(baseOvr + variance + Math.floor(seededRandom(playerSeed + 30) * 10), 20, 99);
    const physical = clamp(baseOvr + variance + Math.floor(seededRandom(playerSeed + 40) * 10), 20, 99);

    const ovr = Math.round((technical + mental + physical) / 3);
    const potential = clamp(ovr + Math.floor(seededRandom(playerSeed + 50) * 20), 20, 99);
    const contractYears = age >= 32 ? 1 : age >= 28 ? 2 : age >= 22 ? 3 + Math.floor(seededRandom(playerSeed + 60) * 2) : 4 + Math.floor(seededRandom(playerSeed + 70) * 2);
    const value = calculatePlayerValue(ovr, age, potential, contractYears);
    const wage = calculatePlayerWage(ovr, age);
    const morale = 30 + Math.floor(seededRandom(playerSeed + 80) * 70);
    const form = 30 + Math.floor(seededRandom(playerSeed + 90) * 70);

    return {
      id: `${club.id}-player-${index}`,
      name,
      age,
      nationality: 'England',
      position: role,
      attributes: { technical, mental, physical },
      potential,
      value,
      wage,
      contractYears,
      clubId: club.id,
      morale,
      form,
      isYouth: false,
      isListed: false,
    };
  });
}

/**
 * Generate youth players for a club's academy.
 */
export function generateYouthPlayers(clubId: string, count: number, seed: number): Player[] {
  const players: Player[] = [];

  for (let i = 0; i < count; i++) {
    const playerSeed = seed + i * 17;
    const age = 15 + Math.floor(seededRandom(playerSeed) * 4); // 15-18
    const position = POSITIONS[Math.floor(seededRandom(playerSeed + 10) * POSITIONS.length)];

    const technical = 15 + Math.floor(seededRandom(playerSeed + 20) * 35);
    const mental = 20 + Math.floor(seededRandom(playerSeed + 30) * 30);
    const physical = 25 + Math.floor(seededRandom(playerSeed + 40) * 25);

    const potential = clamp(65 + Math.floor(seededRandom(playerSeed + 50) * 30), 65, 99);

    players.push({
      id: `youth-${clubId}-${i}`,
      name: generateYouthPlayerName(playerSeed),
      age,
      nationality: 'England',
      position,
      attributes: { technical, mental, physical },
      potential,
      value: 0, // Youth players have no market value yet
      wage: 0,  // Youth contract
      contractYears: 3,
      clubId,
      morale: 70,
      form: 50,
      isYouth: true,
      isListed: false,
    });
  }

  return players;
}

/**
 * Generate a single promoted youth player (when promoted to senior squad).
 */
export function promoteYouthPlayer(youth: Player): Player {
  return {
    ...youth,
    isYouth: false,
    value: calculatePlayerValue(
      calculateOvr(youth),
      youth.age,
      youth.potential,
      3
    ),
    wage: calculatePlayerWage(calculateOvr(youth), youth.age),
    contractYears: 3,
  };
}

export { calculateOvr };
