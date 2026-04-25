/* ═══════════════════════════════════════════════════════════════════
   FOOTBALL GAME ENGINE v1.0
   Complete season simulation: leagues, cups, match simulation,
   interactive match, standings & progression.
   Pure logic — no React or DOM dependencies.
   ═══════════════════════════════════════════════════════════════════ */

import {
  type FullTactic,
  type TacticStyleId,
  computeTacticModifiers,
  getTacticCounterBonus,
  TACTIC_PRESETS,
  createTacticFromPreset,
} from './tacticsSystem';

// ────────────────────────────────────────────
// 1. TYPES
// ────────────────────────────────────────────

export interface GameClub {
  id: string;
  name: string;
  reputation: number;
  leagueId: string;
  leagueName: string;
  rating: number;
  form: number;   // -10 … +10
  morale: number;  // 0 … 100
}

export interface MatchFixture {
  id: string;
  homeId: string;
  awayId: string;
  compId: string;
  compName: string;
  week: number;
  played: boolean;
  homeGoals: number;
  awayGoals: number;
  stats: MatchStats | null;
}

export interface MatchStats {
  possession: [number, number];
  shots: [number, number];
  shotsOnTarget: [number, number];
  fouls: [number, number];
  corners: [number, number];
  yellowCards: [number, number];
  redCards: [number, number];
}

export type MatchEventType =
  | 'GOAL' | 'SHOT' | 'SHOT_ON_TARGET' | 'SAVE'
  | 'FOUL' | 'YELLOW_CARD' | 'RED_CARD'
  | 'CORNER' | 'OFFSIDE' | 'INJURY' | 'SUBSTITUTION'
  | 'HALF_TIME' | 'FULL_TIME'
  | 'FREE_KICK' | 'CLEARANCE' | 'TACKLE'
  | 'CHANCE_MISSED' | 'LONG_BALL' | 'COUNTER_ATTACK';

export interface MatchEvent {
  minute: number;
  type: MatchEventType;
  team: 'HOME' | 'AWAY';
  playerIndex: number;
  description: string;
}

export interface Standing {
  teamId: string;
  teamName: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number;
  ga: number;
  gd: number;
  points: number;
  form: string;
}

export interface CupRoundData {
  round: number;
  name: string;
  fixtureIds: string[];
  completed: boolean;
}

export interface CupData {
  id: string;
  name: string;
  allTeams: string[];
  rounds: CupRoundData[];
  currentRound: number;
  eliminated: string[];
}

export interface LeagueData {
  id: string;
  name: string;
  teams: string[];
  standings: Standing[];
  matchdayFixtureIds: Record<number, string[]>;
  currentMatchday: number;
  totalMatchdays: number;
}

export type GamePhase =
  | 'idle'
  | 'simulating'
  | 'interactive_match'
  | 'showing_results'
  | 'end_of_season';

export interface TacticConfig {
  tempo: number;
  pressing: number;
  width: number;
  mentality: 'Defensive' | 'Balanced' | 'Attacking';
}

export interface InteractiveMatchState {
  fixtureId: string;
  homeId: string;
  awayId: string;
  homeName: string;
  awayName: string;
  compName: string;
  minute: number;
  homeGoals: number;
  awayGoals: number;
  events: MatchEvent[];
  stats: MatchStats;
  isRunning: boolean;
  isFinished: boolean;
  speed: number;
  homeTactics: TacticConfig;
  awayTactics: TacticConfig;
  homeFullTactic: FullTactic | null;
  awayFullTactic: FullTactic | null;
  subsRemainingHome: number;
  subsRemainingAway: number;
  momentum: number;
  ballPos: [number, number];
  lastGoalMinute: number;
  substitutions: { minute: number; team: 'HOME' | 'AWAY'; outIndex: number; inIndex: number }[];
  isPlayerHome?: boolean;
}

export interface GameState {
  initialized: boolean;
  gameWeek: number;
  season: number;
  activeClubId: string;
  clubs: Record<string, GameClub>;
  leagues: Record<string, LeagueData>;
  faCup: CupData;
  leagueCup: CupData;
  fixtures: Record<string, MatchFixture>;
  weekFixtureIds: Record<number, string[]>;
  phase: GamePhase;
  lastWeekResultIds: string[];
  seasonComplete: boolean;
}

// ────────────────────────────────────────────
// 2. UTILITIES
// ────────────────────────────────────────────

function sr(seed: number): number {
  let t = (seed >>> 0) + 0x6D2B79F5;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

function hs(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function uid(prefix: string, seed: number): string {
  const hex = ((seed * 2654435761) >>> 0).toString(16).padStart(8, '0');
  const hex2 = ((seed * 40503) >>> 0).toString(16).padStart(4, '0');
  return `${prefix}-${hex}-${hex2}`;
}

function shuffle<T>(arr: T[], seed: number): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(sr(seed + i * 7) * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

// ────────────────────────────────────────────
// 3. SCHEDULE GENERATION
// ────────────────────────────────────────────

const SEASON_WEEKS = 46;
const FA_CUP_WEEKS = [5, 10, 16, 22, 28, 34, 40];
const LEAGUE_CUP_WEEKS = [3, 8, 14, 20, 26, 32, 38];
const CUP_ROUND_NAMES = ['Round 1', 'Round 2', 'Round 3', 'Round 4', 'Quarter-Final', 'Semi-Final', 'Final'];

/** Round-robin schedule (circle method). Returns array of matchdays, each an array of [home, away] pairs. */
function generateRoundRobin(teamIds: string[]): [string, string][][] {
  const teams = [...teamIds];
  if (teams.length % 2 !== 0) teams.push('__BYE__');
  const n = teams.length;
  const rounds: [string, string][][] = [];

  for (let r = 0; r < n - 1; r++) {
    const pairs: [string, string][] = [];
    for (let i = 0; i < n / 2; i++) {
      const a = teams[i];
      const b = teams[n - 1 - i];
      if (a !== '__BYE__' && b !== '__BYE__') {
        pairs.push(r % 2 === 0 ? [a, b] : [b, a]);
      }
    }
    rounds.push(pairs);
    // rotate: fix teams[0], rotate rest
    const last = teams.pop()!;
    teams.splice(1, 0, last);
  }

  // second half: reverse home/away
  const firstHalf = rounds.length;
  for (let i = 0; i < firstHalf; i++) {
    rounds.push(rounds[i].map(([h, a]) => [a, h] as [string, string]));
  }
  return rounds;
}

/** Generate cup first-round draw. Top teams by reputation get byes. */
function generateCupR1(
  allTeamIds: string[],
  clubs: Record<string, GameClub>,
  seed: number
): { pairings: [string, string][]; byeTeams: string[] } {
  // sort by reputation descending
  const sorted = [...allTeamIds].sort((a, b) => (clubs[b]?.reputation ?? 0) - (clubs[a]?.reputation ?? 0));
  // next power of 2
  let pow2 = 1;
  while (pow2 < sorted.length) pow2 *= 2;
  const numByes = pow2 - sorted.length;
  const byeTeams = sorted.slice(0, numByes);
  const playingTeams = shuffle(sorted.slice(numByes), seed);

  const pairings: [string, string][] = [];
  for (let i = 0; i < playingTeams.length - 1; i += 2) {
    pairings.push([playingTeams[i], playingTeams[i + 1]]);
  }
  return { pairings, byeTeams };
}

/** Generate cup draw for round 2+. */
function generateCupNextRound(
  advancingTeams: string[],
  seed: number
): [string, string][] {
  const shuffled = shuffle(advancingTeams, seed);
  const pairings: [string, string][] = [];
  for (let i = 0; i < shuffled.length - 1; i += 2) {
    pairings.push([shuffled[i], shuffled[i + 1]]);
  }
  // odd team out gets a bye (auto-advance) — shouldn't happen if powers of 2 work correctly
  return pairings;
}

// ────────────────────────────────────────────
// 4. MATCH SIMULATION (AI)
// ────────────────────────────────────────────

interface TeamRatings {
  attack: number;
  midfield: number;
  defense: number;
  overall: number;
}

/** Generate a plausible AI tactic based on club reputation.
 *  If avoidStyle is provided (the player's style), the AI will never pick that style.
 *  If avoidFormation is provided, the AI strongly prefers a different formation. */
function generateAITactic(club: GameClub, avoidStyle?: TacticStyleId, avoidFormation?: string): FullTactic {
  const seed = hs(club.id) + (avoidStyle ? hs(avoidStyle) : 0);
  const allStyles: TacticStyleId[] = [
    'tiki-taka', 'gegenpress', 'counter-attack', 'long-ball',
    'defensive-block', 'balanced', 'ajax-school', 'deutsche-schule', 'catenaccio',
    'park-the-bus', 'wing-play', 'bielsa-ball', 'fluid-counter', 'route-one',
  ];
  // Higher rep clubs use more sophisticated tactics
  const allWeights = club.reputation > 80
    ? [0.15, 0.15, 0.06, 0.03, 0.03, 0.10, 0.12, 0.12, 0.04, 0.02, 0.05, 0.06, 0.04, 0.03]
    : club.reputation > 60
      ? [0.08, 0.10, 0.12, 0.06, 0.06, 0.14, 0.08, 0.08, 0.06, 0.04, 0.06, 0.04, 0.05, 0.03]
      : [0.03, 0.05, 0.14, 0.12, 0.10, 0.14, 0.04, 0.04, 0.08, 0.08, 0.06, 0.03, 0.06, 0.03];
  // Filter out the player's style so the AI never copies it
  // Also deprioritise presets that share the player's formation
  const styles: TacticStyleId[] = [];
  const weights: number[] = [];
  for (let i = 0; i < allStyles.length; i++) {
    if (allStyles[i] === avoidStyle) continue;
    styles.push(allStyles[i]);
    const preset = TACTIC_PRESETS.find((p) => p.id === allStyles[i]);
    // If the preset uses the same formation as the player, halve its weight
    const formPenalty = (avoidFormation && preset && preset.formation === avoidFormation) ? 0.3 : 1;
    weights.push(allWeights[i] * formPenalty);
  }
  // Normalise weights after filtering
  const total = weights.reduce((a, b) => a + b, 0);
  let cumulative = 0;
  const roll = sr(seed + 99);
  let chosenStyle: TacticStyleId = styles[styles.length - 1];
  for (let i = 0; i < styles.length; i++) {
    cumulative += weights[i] / total;
    if (roll < cumulative) { chosenStyle = styles[i]; break; }
  }
  const preset = TACTIC_PRESETS.find((p) => p.id === chosenStyle) ?? TACTIC_PRESETS[5];
  return createTacticFromPreset(preset);
}

function getTeamRatings(club: GameClub, isHome: boolean): TeamRatings {
  const base = club.rating;
  const formBonus = club.form * 1.5;
  const moraleBonus = (club.morale - 50) * 0.3;
  const homeBonus = isHome ? 5 : 0;

  const overall = clamp(base + formBonus + moraleBonus + homeBonus, 20, 99);
  return {
    attack: clamp(overall + (sr(hs(club.id) + 1) * 10 - 5), 15, 99),
    midfield: clamp(overall + (sr(hs(club.id) + 2) * 10 - 5), 15, 99),
    defense: clamp(overall + (sr(hs(club.id) + 3) * 10 - 5), 15, 99),
    overall,
  };
}

export function simulateMatch(
  homeClub: GameClub,
  awayClub: GameClub,
  seed: number,
  homeTactic?: FullTactic | null,
  awayTactic?: FullTactic | null,
): { homeGoals: number; awayGoals: number; events: MatchEvent[]; stats: MatchStats } {
  const home = getTeamRatings(homeClub, true);
  const away = getTeamRatings(awayClub, false);

  // Compute tactic modifiers (AI teams get generated tactics)
  const hTac = homeTactic ?? generateAITactic(homeClub);
  const aTac = awayTactic ?? generateAITactic(awayClub);
  const hMods = computeTacticModifiers(hTac);
  const aMods = computeTacticModifiers(aTac);

  // Separate counter bonuses (symmetric — each team independently)
  const hCounterAdv = Math.max(0, getTacticCounterBonus(hTac.styleId, aTac.styleId));
  const aCounterAdv = Math.max(0, getTacticCounterBonus(aTac.styleId, hTac.styleId));

  // Compute TACTIC ADVANTAGE — the decisive factor
  const hTacScore = hMods.attackMod + hMods.possessionMod * 0.5 + hMods.chanceCreationMod + hMods.shotQualityMod + hMods.counterAttackMod * 0.3;
  const aTacScore = aMods.attackMod + aMods.possessionMod * 0.5 + aMods.chanceCreationMod + aMods.shotQualityMod + aMods.counterAttackMod * 0.3;
  const tacticDiff = (hTacScore - aTacScore) + (hCounterAdv - aCounterAdv) * 1.2;
  const hGoalMul = clamp(1 + tacticDiff * 0.018, 0.45, 1.65);
  const aGoalMul = clamp(1 - tacticDiff * 0.018, 0.45, 1.65);

  // Also apply modifiers to mid-level ratings (tactic is king)
  home.attack = clamp(home.attack + hMods.attackMod * 0.8 + hCounterAdv * 0.4, 15, 99);
  home.midfield = clamp(home.midfield + hMods.possessionMod * 0.8, 15, 99);
  home.defense = clamp(home.defense + hMods.defenseMod * 0.8, 15, 99);
  away.attack = clamp(away.attack + aMods.attackMod * 0.8 + aCounterAdv * 0.4, 15, 99);
  away.midfield = clamp(away.midfield + aMods.possessionMod * 0.8, 15, 99);
  away.defense = clamp(away.defense + aMods.defenseMod * 0.8, 15, 99);

  let hGoals = 0;
  let aGoals = 0;
  const events: MatchEvent[] = [];
  let hShots = 0, aShots = 0, hSoT = 0, aSoT = 0;
  let hFouls = 0, aFouls = 0, hCorners = 0, aCorners = 0;
  let hYellow = 0, aYellow = 0;
  const hRed = 0, aRed = 0;
  let hPoss = 0;
  let lastGoalMin = -10;

  for (let min = 1; min <= 90; min++) {
    const s = seed + min * 127;

    // Possession — tactic modifiers have MAJOR impact
    const simPossMod = (hMods.possessionMod - aMods.possessionMod) / 80;
    const midDiff = (home.midfield - away.midfield) / 300;
    const possHome = clamp(0.5 + midDiff + simPossMod + (sr(s) - 0.5) * 0.10, 0.28, 0.72);
    const teamHasBall = sr(s + 1) < possHome;
    if (teamHasBall) hPoss++;
    const team: 'HOME' | 'AWAY' = teamHasBall ? 'HOME' : 'AWAY';
    const atk = teamHasBall ? home.attack : away.attack;
    const def = teamHasBall ? away.defense : home.defense;

    // Cooldown after recent goal — reduced attack chance
    const cooldown = (min - lastGoalMin <= 3) ? 0.45 : 1.0;

    // Dangerous attack creation — tactic advantage is THE decisive factor
    const tacMulSim = teamHasBall ? hGoalMul : aGoalMul;
    const baseAtkStr = clamp((atk - def * 0.25) / 170 + 0.16, 0.18, 0.46);
    const atkStrength = clamp(baseAtkStr * (0.35 + tacMulSim * 0.65), 0.10, 0.52) * cooldown;

    if (sr(s + 2) > atkStrength) {
      // No dangerous attack — possible foul
      if (sr(s + 3) < 0.05) {
        const defTeam: 'HOME' | 'AWAY' = team === 'HOME' ? 'AWAY' : 'HOME';
        if (defTeam === 'HOME') hFouls++; else aFouls++;
        events.push({ minute: min, type: 'FOUL', team: defTeam, playerIndex: 2 + Math.floor(sr(s + 4) * 5), description: '' });
        if (sr(s + 5) < 0.18) {
          if (defTeam === 'HOME') hYellow++; else aYellow++;
          events.push({ minute: min, type: 'YELLOW_CARD', team: defTeam, playerIndex: events[events.length - 1].playerIndex, description: '' });
        }
      }
      continue;
    }

    // Corner on some attacks
    if (sr(s + 6) < 0.12) {
      if (team === 'HOME') hCorners++; else aCorners++;
      events.push({ minute: min, type: 'CORNER', team, playerIndex: 7, description: '' });
    }

    // Shot attempt — tactic quality improves shot creation
    const shotChance = clamp(0.68 + (atk - def) / 300 + (tacMulSim - 1) * 0.08, 0.50, 0.82);
    if (sr(s + 7) > shotChance) {
      if (sr(s + 8) < 0.10) {
        events.push({ minute: min, type: 'OFFSIDE', team, playerIndex: 9 + Math.floor(sr(s + 9) * 2), description: '' });
      }
      continue;
    }

    if (team === 'HOME') hShots++; else aShots++;
    const pi = 8 + Math.floor(sr(s + 10) * 3);
    events.push({ minute: min, type: 'SHOT', team, playerIndex: pi, description: '' });

    // On target — boosted by shot quality modifier
    const sqMod = teamHasBall ? hMods.shotQualityMod : aMods.shotQualityMod;
    const onTargetChance = clamp(0.36 + (atk - def) / 400 + sqMod * 0.006, 0.26, 0.50);
    if (sr(s + 11) > onTargetChance) continue;

    if (team === 'HOME') hSoT++; else aSoT++;
    events.push({ minute: min, type: 'SHOT_ON_TARGET', team, playerIndex: pi, description: '' });

    // Goal — boosted by tactic multiplier + chance creation modifier
    const ccMod = teamHasBall ? hMods.chanceCreationMod : aMods.chanceCreationMod;
    const goalMul = teamHasBall ? hGoalMul : aGoalMul;
    const goalChance = clamp((0.26 + (atk - def) / 500 + ccMod * 0.005) * goalMul, 0.08, 0.42);
    if (sr(s + 12) > goalChance) {
      events.push({ minute: min, type: 'SAVE', team: team === 'HOME' ? 'AWAY' : 'HOME', playerIndex: 0, description: '' });
      continue;
    }

    if (team === 'HOME') hGoals++;
    else aGoals++;
    events.push({ minute: min, type: 'GOAL', team, playerIndex: pi, description: '' });
    lastGoalMin = min;
  }

  events.push({ minute: 45, type: 'HALF_TIME', team: 'HOME', playerIndex: -1, description: 'Half-time' });
  events.push({ minute: 90, type: 'FULL_TIME', team: 'HOME', playerIndex: -1, description: 'Full-time' });
  events.sort((a, b) => a.minute - b.minute || (a.type === 'GOAL' ? 1 : -1));

  const possH = Math.round((hPoss / 90) * 100);
  const stats: MatchStats = {
    possession: [possH, 100 - possH],
    shots: [hShots, aShots],
    shotsOnTarget: [hSoT, aSoT],
    fouls: [hFouls, aFouls],
    corners: [hCorners, aCorners],
    yellowCards: [hYellow, aYellow],
    redCards: [hRed, aRed],
  };

  return { homeGoals: hGoals, awayGoals: aGoals, events, stats };
}

// ────────────────────────────────────────────
// 5. INTERACTIVE MATCH ENGINE
// ────────────────────────────────────────────

export function createInteractiveMatch(
  fixtureId: string,
  homeClub: GameClub,
  awayClub: GameClub,
  compName: string,
  playerTactic?: FullTactic | null,
  isPlayerHome?: boolean,
): InteractiveMatchState {
  // ALWAYS ensure both teams have a tactic — critical for tactic impact!
  // If player hasn't chosen, generate a smart default based on reputation (same as AI)
  const playerClub = isPlayerHome === true ? homeClub : awayClub;
  const playerTac = playerTactic ?? generateAITactic(playerClub);
  // AI must NEVER use the same tactic style as the human manager
  // AI also avoids the same formation to create visual variety
  const playerStyle = playerTac.styleId;
  const playerFormation = playerTac.formation;
  const aiOpponent = isPlayerHome !== undefined
    ? (isPlayerHome ? generateAITactic(awayClub, playerStyle, playerFormation) : generateAITactic(homeClub, playerStyle, playerFormation))
    : generateAITactic(awayClub, playerStyle, playerFormation);
  const homeFullTactic = isPlayerHome === true ? playerTac : (isPlayerHome === false ? aiOpponent : generateAITactic(homeClub));
  const awayFullTactic = isPlayerHome === true ? aiOpponent : (isPlayerHome === false ? playerTac : generateAITactic(awayClub));

  // Derive simple TacticConfig from FullTactic for backwards compat
  const toSimple = (ft: FullTactic): TacticConfig => ({
    tempo: ft.instructions.tempo,
    pressing: ft.instructions.pressing,
    width: ft.instructions.width,
    mentality: ft.instructions.mentality,
  });

  return {
    fixtureId,
    homeId: homeClub.id,
    awayId: awayClub.id,
    homeName: homeClub.name,
    awayName: awayClub.name,
    compName,
    minute: 0,
    homeGoals: 0,
    awayGoals: 0,
    events: [],
    stats: {
      possession: [50, 50],
      shots: [0, 0],
      shotsOnTarget: [0, 0],
      fouls: [0, 0],
      corners: [0, 0],
      yellowCards: [0, 0],
      redCards: [0, 0],
    },
    isRunning: false,
    isFinished: false,
    speed: 1,
    homeTactics: toSimple(homeFullTactic),
    awayTactics: toSimple(awayFullTactic),
    homeFullTactic,
    awayFullTactic,
    subsRemainingHome: 5,
    subsRemainingAway: 5,
    momentum: 0,
    ballPos: [50, 75],
    lastGoalMinute: -10,
    substitutions: [],
    isPlayerHome,
  };
}

export function tickInteractiveMatch(
  state: InteractiveMatchState,
  homeRating: number,
  awayRating: number,
): InteractiveMatchState {
  if (state.isFinished || state.minute >= 90) {
    if (!state.isFinished) {
      return {
        ...state,
        isFinished: true,
        isRunning: false,
        events: [...state.events, { minute: 90, type: 'FULL_TIME', team: 'HOME', playerIndex: -1, description: 'Full-time!' }],
      };
    }
    return state;
  }

  const next = { ...state, minute: state.minute + 1, events: [...state.events], stats: { ...state.stats } };
  const min = next.minute;
  const seed = hs(`tick-${state.fixtureId}-${min}`);

  // half-time
  if (min === 46) {
    next.events.push({ minute: 45, type: 'HALF_TIME', team: 'HOME', playerIndex: -1, description: 'Half-time!' });
  }

  // Full tactic modifiers
  const hMods = state.homeFullTactic ? computeTacticModifiers(state.homeFullTactic) : null;
  const aMods = state.awayFullTactic ? computeTacticModifiers(state.awayFullTactic) : null;

  // Separate counter bonuses for each team (symmetric — no double penalty)
  const hCounterBonus = (state.homeFullTactic && state.awayFullTactic)
    ? Math.max(0, getTacticCounterBonus(state.homeFullTactic.styleId, state.awayFullTactic.styleId))
    : 0;
  const aCounterBonus = (state.homeFullTactic && state.awayFullTactic)
    ? Math.max(0, getTacticCounterBonus(state.awayFullTactic.styleId, state.homeFullTactic.styleId))
    : 0;

  // TACTIC ADVANTAGE — the decisive factor
  // Human manager gets a very large "tactical preparation" bonus since they actively chose a plan
  const humanBonus = 22;
  const hTacRaw = hMods ? (hMods.attackMod + hMods.possessionMod * 0.5 + hMods.chanceCreationMod + hMods.shotQualityMod + hMods.counterAttackMod * 0.3) : 0;
  const aTacRaw = aMods ? (aMods.attackMod + aMods.possessionMod * 0.5 + aMods.chanceCreationMod + aMods.shotQualityMod + aMods.counterAttackMod * 0.3) : 0;
  const hTacScore = hTacRaw + (state.isPlayerHome === true ? humanBonus : 0);
  const aTacScore = aTacRaw + (state.isPlayerHome === false ? humanBonus : 0);
  // Counter system contributes but does NOT override tactic quality
  const tacticDiff = (hTacScore - aTacScore) + (hCounterBonus - aCounterBonus) * 1.0;
  // 3x stronger sensitivity so tactic choices are viscerally felt
  const hGoalMul = clamp(1 + tacticDiff * 0.035, 0.18, 2.50);
  const aGoalMul = clamp(1 - tacticDiff * 0.035, 0.18, 2.50);

  // Tactic modifiers (symmetric for both teams)
  const hTempo = state.homeTactics.tempo / 100;
  const hPress = state.homeTactics.pressing / 100;
  const hMent = state.homeTactics.mentality === 'Attacking' ? 1.10 : state.homeTactics.mentality === 'Defensive' ? 0.90 : 1;
  const aTempo = state.awayTactics.tempo / 100;
  const aPress = state.awayTactics.pressing / 100;
  const aMent = state.awayTactics.mentality === 'Attacking' ? 1.10 : state.awayTactics.mentality === 'Defensive' ? 0.90 : 1;

  const homeAdv = 3;
  const hTacAtk = hMods ? hMods.attackMod + hCounterBonus * 0.4 : 0;
  const hTacDef = hMods ? hMods.defenseMod : 0;
  const hTacPoss = hMods ? hMods.possessionMod : 0;
  const aTacAtk = aMods ? aMods.attackMod + aCounterBonus * 0.4 : 0;
  const aTacDef = aMods ? aMods.defenseMod : 0;
  const aTacPoss = aMods ? aMods.possessionMod : 0;
  const hAtk = (homeRating + homeAdv + hTacAtk) * (0.85 + hTempo * 0.3) * hMent + (state.momentum > 0 ? state.momentum * 0.06 : 0);
  const aAtk = (awayRating + aTacAtk) * (0.85 + aTempo * 0.3) * aMent + (state.momentum < 0 ? -state.momentum * 0.06 : 0);
  const hDef = (homeRating + homeAdv + hTacDef) * (1.1 - hTempo * 0.2) + hPress * 5;
  const aDef = (awayRating + aTacDef) * (1.1 - aTempo * 0.2) + aPress * 5;

  // Possession — driven purely by TACTIC possession quality + player bonus
  // Raw ratings do NOT determine possession — the tactic does
  const playerPossBonus = (state.isPlayerHome === true ? 0.05 : state.isPlayerHome === false ? -0.05 : 0);
  const possMod = (hTacPoss - aTacPoss) / 60;
  const possHome = clamp(0.5 + possMod + playerPossBonus + (sr(seed) - 0.5) * 0.08, 0.24, 0.76);
  const teamHasBall = sr(seed + 1) < possHome;
  const team: 'HOME' | 'AWAY' = teamHasBall ? 'HOME' : 'AWAY';
  const ti = team === 'HOME' ? 0 : 1;

  // Update rolling possession
  const totalMin = min;
  const oldH = next.stats.possession[0] * (totalMin - 1) / 100;
  const newH = oldH + (teamHasBall ? 1 : 0);
  const possHPct = Math.round((newH / totalMin) * 100);
  next.stats.possession = [possHPct, 100 - possHPct] as [number, number];

  // Attack/defense for the attacking team
  const atk = teamHasBall ? hAtk : aAtk;
  const def = teamHasBall ? aDef : hDef;

  // Cooldown after recent goal — lasts 5 minutes
  const cooldown = (min - state.lastGoalMinute <= 5) ? 0.4 : 1.0;

  // Dangerous attack creation — tactic advantage is THE decisive factor
  const baseAtkStr = clamp((atk - def * 0.25) / 200 + 0.10, 0.09, 0.34);
  const tacMul = teamHasBall ? hGoalMul : aGoalMul;
  const atkStrength = clamp(baseAtkStr * (0.30 + tacMul * 0.70), 0.06, 0.38) * cooldown;

  if (sr(seed + 2) > atkStrength) {
    // No dangerous attack — minor events for variety
    if (sr(seed + 3) < 0.07) {
      const defTeam: 'HOME' | 'AWAY' = team === 'HOME' ? 'AWAY' : 'HOME';
      const di = defTeam === 'HOME' ? 0 : 1;
      const pi = 2 + Math.floor(sr(seed + 4) * 5);
      next.stats.fouls = [...next.stats.fouls] as [number, number];
      next.stats.fouls[di]++;
      next.events.push({ minute: min, type: 'FOUL', team: defTeam, playerIndex: pi, description: '' });
      if (sr(seed + 5) < 0.18) {
        next.stats.yellowCards = [...next.stats.yellowCards] as [number, number];
        next.stats.yellowCards[di]++;
        next.events.push({ minute: min, type: 'YELLOW_CARD', team: defTeam, playerIndex: pi, description: '' });
      }
      next.ballPos = [30 + sr(seed + 6) * 40, teamHasBall ? 40 + sr(seed + 7) * 30 : 80 + sr(seed + 8) * 30] as [number, number];
      next.momentum = clamp(next.momentum + (teamHasBall ? 2 : -2), -20, 20);
    } else if (sr(seed + 9) < 0.05) {
      const defTeam: 'HOME' | 'AWAY' = team === 'HOME' ? 'AWAY' : 'HOME';
      next.events.push({ minute: min, type: 'TACKLE', team: defTeam, playerIndex: 3 + Math.floor(sr(seed + 10) * 4), description: '' });
      next.ballPos = [30 + sr(seed + 11) * 40, 50 + sr(seed + 12) * 50] as [number, number];
    } else if (sr(seed + 13) < 0.03) {
      const defTeam: 'HOME' | 'AWAY' = team === 'HOME' ? 'AWAY' : 'HOME';
      next.events.push({ minute: min, type: 'CLEARANCE', team: defTeam, playerIndex: 2 + Math.floor(sr(seed + 14) * 3), description: '' });
    }
    return next;
  }

  // Corner chance
  if (sr(seed + 15) < 0.12) {
    next.stats.corners = [...next.stats.corners] as [number, number];
    next.stats.corners[ti]++;
    next.events.push({ minute: min, type: 'CORNER', team, playerIndex: 7, description: '' });
    next.ballPos = teamHasBall ? [92, 10] as [number, number] : [8, 140] as [number, number];
  }

  // Shot attempt — tactic quality improves shot creation
  const shotChance = clamp(0.72 + (atk - def) / 350 + (tacMul - 1) * 0.06, 0.54, 0.86);
  if (sr(seed + 16) > shotChance) {
    if (sr(seed + 17) < 0.08) {
      next.events.push({ minute: min, type: 'OFFSIDE', team, playerIndex: 9 + Math.floor(sr(seed + 18) * 2), description: '' });
    } else if (sr(seed + 19) < 0.06) {
      next.events.push({ minute: min, type: 'CHANCE_MISSED', team, playerIndex: 8 + Math.floor(sr(seed + 20) * 3), description: '' });
    }
    next.ballPos = [30 + sr(seed + 21) * 40, teamHasBall ? 30 + sr(seed + 22) * 40 : 80 + sr(seed + 23) * 30] as [number, number];
    return next;
  }

  const pi = 8 + Math.floor(sr(seed + 24) * 3);
  next.stats.shots = [...next.stats.shots] as [number, number];
  next.stats.shots[ti]++;
  next.events.push({ minute: min, type: 'SHOT', team, playerIndex: pi, description: '' });
  next.ballPos = teamHasBall
    ? [40 + sr(seed + 25) * 20, 12 + sr(seed + 26) * 10] as [number, number]
    : [40 + sr(seed + 27) * 20, 128 + sr(seed + 28) * 10] as [number, number];

  // On target — boosted by shot quality + direct player bonus
  const sqModTick = teamHasBall ? (hMods?.shotQualityMod ?? 0) : (aMods?.shotQualityMod ?? 0);
  const isPlayerAtk = state.isPlayerHome !== undefined && ((teamHasBall && state.isPlayerHome === true) || (!teamHasBall && state.isPlayerHome === false));
  const isAIAtk    = state.isPlayerHome !== undefined && ((teamHasBall && state.isPlayerHome === false) || (!teamHasBall && state.isPlayerHome === true));
  const otPlayerBonus = isPlayerAtk ? 0.04 : (isAIAtk ? -0.04 : 0);
  const onTargetChance = clamp(0.25 + (atk - def) / 500 + sqModTick * 0.004 + otPlayerBonus, 0.14, 0.44);
  if (sr(seed + 29) > onTargetChance) {
    next.momentum = clamp(next.momentum + (teamHasBall ? 1 : -1), -20, 20);
    return next;
  }

  next.stats.shotsOnTarget = [...next.stats.shotsOnTarget] as [number, number];
  next.stats.shotsOnTarget[ti]++;
  next.events.push({ minute: min, type: 'SHOT_ON_TARGET', team, playerIndex: pi, description: '' });

  // Goal chance — tactic multiplier + float player/AI direct bonus
  // Direct bonus ensures even with unlucky variance the player WILL score from sustained pressure
  const ccModTick = teamHasBall ? (hMods?.chanceCreationMod ?? 0) : (aMods?.chanceCreationMod ?? 0);
  const caModTick = teamHasBall ? (hMods?.counterAttackMod ?? 0) : (aMods?.counterAttackMod ?? 0);
  const goalMul = teamHasBall ? hGoalMul : aGoalMul;
  const goalDirectBonus = isPlayerAtk ? 0.05 : (isAIAtk ? -0.05 : 0);
  const goalChance = clamp((0.16 + (atk - def) / 600 + ccModTick * 0.003 + caModTick * 0.002) * goalMul + goalDirectBonus, 0.03, 0.36);
  if (sr(seed + 30) > goalChance) {
    const keeperTeam: 'HOME' | 'AWAY' = team === 'HOME' ? 'AWAY' : 'HOME';
    next.events.push({ minute: min, type: 'SAVE', team: keeperTeam, playerIndex: 0, description: '' });
    next.momentum = clamp(next.momentum + (teamHasBall ? 1 : -1), -20, 20);
    return next;
  }

  // GOAL!
  if (team === 'HOME') next.homeGoals++;
  else next.awayGoals++;

  // Add tactic-flavored description to goal
  const scoringTactic = teamHasBall ? state.homeFullTactic : state.awayFullTactic;
  const goalDesc = getTacticalGoalDescription(scoringTactic?.styleId, sr(seed + 31));
  next.events.push({ minute: min, type: 'GOAL', team, playerIndex: pi, description: goalDesc });
  next.ballPos = [50, 75];
  next.momentum = clamp(next.momentum + (teamHasBall ? 5 : -5), -20, 20);
  next.lastGoalMinute = min;

  return next;
}

/** Produce a flavour-text description for goals based on the scoring team's tactic style */
function getTacticalGoalDescription(styleId: TacticStyleId | undefined, roll: number): string {
  const descs: Record<string, string[]> = {
    'tiki-taka':        ['Beautiful passing move!', 'Patient build-up finds the gap!', 'Short passes unlock the defence!'],
    'gegenpress':       ['High press wins it back and scores!', 'Pressing forces a turnover — GOAL!', 'Relentless pressure pays off!'],
    'counter-attack':   ['Lightning counter-attack!', 'Devastating break on the counter!', 'Quick transition catches them out!'],
    'long-ball':        ['Long ball over the top finds the striker!', 'Direct play beats the offside trap!', 'Route-one football at its best!'],
    'defensive-block':  ['Rare chance from deep and they take it!', 'Soaking up pressure then striking!', 'Clinical finish after patient defending!'],
    'balanced':         ['Well-worked goal!', 'Good build-up play!', 'Nicely taken!'],
    'ajax-school':      ['Total football at its finest!', 'Positional play opens up space!', 'Cruyff would be proud of that move!'],
    'deutsche-schule':  ['Efficient and clinical finish!', 'Disciplined build-up, lethal finish!', 'German precision in the final third!'],
    'catenaccio':       ['Counter from deep — deadly finish!', 'Defensive masterclass turns to attack!', 'Patience rewarded with a clinical strike!'],
    'park-the-bus':     ['Rare attack from deep and they score!', 'Soaking up pressure then a sucker punch!', 'Bus parked, but the break was lethal!'],
    'wing-play':        ['Cross from the wing — headed home!', 'Overlapping run and a perfect delivery!', 'Width creates havoc — goal from the flank!'],
    'bielsa-ball':      ['Relentless intensity breaks through!', 'Man-marking leaves one gap — exploited!', 'Vertical pass splits the defence!'],
    'fluid-counter':    ['Devastating counter-attack!', 'Break at pace — clinical finish!', 'Transition football at its lethal best!'],
    'route-one':        ['Long ball, flick-on, GOAL!', 'Direct play wins the second ball!', 'Route one — no messing about!'],
  };
  const options = descs[styleId ?? 'balanced'] ?? descs['balanced'];
  return options[Math.floor(roll * options.length)] ?? options[0];
}

// ────────────────────────────────────────────
// 6. COMPETITION MANAGEMENT
// ────────────────────────────────────────────

function initStandings(teamIds: string[], clubs: Record<string, GameClub>): Standing[] {
  return teamIds.map((id) => ({
    teamId: id,
    teamName: clubs[id]?.name ?? id,
    played: 0,
    won: 0,
    drawn: 0,
    lost: 0,
    gf: 0,
    ga: 0,
    gd: 0,
    points: 0,
    form: '',
  }));
}

function sortStandings(standings: Standing[]): Standing[] {
  return [...standings].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.gd !== a.gd) return b.gd - a.gd;
    if (b.gf !== a.gf) return b.gf - a.gf;
    return a.teamName.localeCompare(b.teamName);
  });
}

export function updateStandingsWithResult(
  standings: Standing[],
  homeId: string,
  awayId: string,
  homeGoals: number,
  awayGoals: number,
): Standing[] {
  const next = standings.map((s) => ({ ...s }));
  const homeRow = next.find((s) => s.teamId === homeId);
  const awayRow = next.find((s) => s.teamId === awayId);
  if (!homeRow || !awayRow) return next;

  homeRow.played++;
  awayRow.played++;
  homeRow.gf += homeGoals;
  homeRow.ga += awayGoals;
  awayRow.gf += awayGoals;
  awayRow.ga += homeGoals;
  homeRow.gd = homeRow.gf - homeRow.ga;
  awayRow.gd = awayRow.gf - awayRow.ga;

  if (homeGoals > awayGoals) {
    homeRow.won++;
    awayRow.lost++;
    homeRow.points += 3;
    homeRow.form = (homeRow.form + 'W').slice(-5);
    awayRow.form = (awayRow.form + 'L').slice(-5);
  } else if (homeGoals < awayGoals) {
    awayRow.won++;
    homeRow.lost++;
    awayRow.points += 3;
    homeRow.form = (homeRow.form + 'L').slice(-5);
    awayRow.form = (awayRow.form + 'W').slice(-5);
  } else {
    homeRow.drawn++;
    awayRow.drawn++;
    homeRow.points += 1;
    awayRow.points += 1;
    homeRow.form = (homeRow.form + 'D').slice(-5);
    awayRow.form = (awayRow.form + 'D').slice(-5);
  }

  return sortStandings(next);
}

/** After a cup round is complete, determine who advances and generate next round draw. */
function advanceCupRound(
  cup: CupData,
  fixtures: Record<string, MatchFixture>,
  clubs: Record<string, GameClub>,
  baseSeed: number,
): CupData {
  const round = cup.rounds[cup.currentRound];
  if (!round || !round.completed) return cup;

  const winners: string[] = [];
  for (const fId of round.fixtureIds) {
    const f = fixtures[fId];
    if (!f || !f.played) continue;
    winners.push(f.homeGoals >= f.awayGoals ? f.homeId : f.awayId); // home advantage on draw
  }

  // add bye teams from R1
  if (cup.currentRound === 0) {
    const playingTeams = new Set<string>();
    for (const fId of round.fixtureIds) {
      const f = fixtures[fId];
      if (f) { playingTeams.add(f.homeId); playingTeams.add(f.awayId); }
    }
    for (const tid of cup.allTeams) {
      if (!playingTeams.has(tid) && !cup.eliminated.includes(tid)) {
        winners.push(tid);
      }
    }
  }

  // eliminated
  const allEliminated = [...cup.eliminated];
  for (const fId of round.fixtureIds) {
    const f = fixtures[fId];
    if (!f || !f.played) continue;
    const loser = f.homeGoals >= f.awayGoals ? f.awayId : f.homeId;
    allEliminated.push(loser);
  }

  const nextRoundIdx = cup.currentRound + 1;
  if (nextRoundIdx >= CUP_ROUND_NAMES.length || winners.length < 2) {
    // cup is over
    return { ...cup, currentRound: nextRoundIdx, eliminated: allEliminated };
  }

  // generate next round draw
  const nextPairings = generateCupNextRound(winners, baseSeed + nextRoundIdx * 1000);

  return {
    ...cup,
    currentRound: nextRoundIdx,
    eliminated: allEliminated,
    rounds: [
      ...cup.rounds,
      {
        round: nextRoundIdx,
        name: CUP_ROUND_NAMES[nextRoundIdx] ?? `Round ${nextRoundIdx + 1}`,
        fixtureIds: [], // will be filled when fixtures are created
        completed: false,
      },
    ],
    // store pairings temporarily — the game engine will create actual fixtures
    _pendingPairings: nextPairings,
  } as CupData & { _pendingPairings: [string, string][] };
}

// ────────────────────────────────────────────
// 7. GAME STATE MANAGEMENT
// ────────────────────────────────────────────

const GAME_STATE_KEY = 'tmt-game-state';

/**
 * Save game state to localStorage (synchronous, for backward compatibility
 * with existing code that hasn't been migrated to Dexie yet).
 * New code should use the Dexie-based saveGameStateLocally from db.ts.
 */
export function saveGameState(state: GameState): void {
  try {
    localStorage.setItem(GAME_STATE_KEY, JSON.stringify(state));
  } catch { /* storage full or unavailable */ }
}

/**
 * Load game state from localStorage (synchronous, for backward compatibility).
 * New code should use the Dexie-based loadGameStateLocally from db.ts.
 */
export function loadGameState(): GameState | null {
  try {
    const raw = localStorage.getItem(GAME_STATE_KEY);
    if (!raw) return null;
    const state = JSON.parse(raw) as GameState;
    // Migrate: fix corrupted club reputations and ratings from old saves
    const leagueRepBounds: Record<string, [number, number]> = {
      'Premier League': [62, 92],
      'Championship':   [45, 72],
      'League One':     [30, 55],
      'League Two':     [22, 45],
    };
    for (const club of Object.values(state.clubs)) {
      const [minRep, maxRep] = leagueRepBounds[club.leagueName] ?? [22, 95];
      const sanRep = clamp(club.reputation, minRep, maxRep);
      if (club.reputation !== sanRep) {
        club.reputation = sanRep;
        // Recompute rating from corrected reputation
        club.rating = clamp(sanRep + Math.floor(sr(hs(club.id)) * 10) - 5, 25, 95);
      }
    }
    return state;
  } catch {
    return null;
  }
}

/**
 * Clear game state from localStorage (synchronous, for backward compatibility).
 * New code should use the Dexie-based clearGameStateLocally from db.ts.
 */
export function clearGameState(): void {
  localStorage.removeItem(GAME_STATE_KEY);
}

interface ClubInput {
  id: string;
  name: string;
  reputation: number;
  leagueId?: string | null;
  leagueName?: string | null;
}

export function initializeGame(clubInputs: ClubInput[], activeClubId: string): GameState {
  const clubs: Record<string, GameClub> = {};
  const leagueGroups: Record<string, string[]> = {};
  const allTeamIds: string[] = [];

  // Reputation ranges by league — prevents broken data from generating impossible rating gaps
  const leagueRepBounds: Record<string, [number, number]> = {
    'Premier League': [62, 92],
    'Championship':   [45, 72],
    'League One':     [30, 55],
    'League Two':     [22, 45],
  };

  for (const c of clubInputs) {
    const lid = c.leagueId ?? c.leagueName ?? 'unknown';
    // Sanitise reputation to league-appropriate bounds
    const [minRep, maxRep] = leagueRepBounds[c.leagueName ?? ''] ?? [22, 95];
    const sanitizedRep = clamp(c.reputation, minRep, maxRep);
    const gc: GameClub = {
      id: c.id,
      name: c.name,
      reputation: sanitizedRep,
      leagueId: lid,
      leagueName: c.leagueName ?? 'Unknown',
      rating: clamp(sanitizedRep + Math.floor(sr(hs(c.id)) * 10) - 5, 25, 95),
      form: Math.floor(sr(hs(c.id) + 1) * 6) - 2,
      morale: 45 + Math.floor(sr(hs(c.id) + 2) * 30),
    };
    clubs[c.id] = gc;
    if (!leagueGroups[lid]) leagueGroups[lid] = [];
    leagueGroups[lid].push(c.id);
    allTeamIds.push(c.id);
  }

  // Build league fixtures
  const leagues: Record<string, LeagueData> = {};
  const allFixtures: Record<string, MatchFixture> = {};
  const weekFixtureIds: Record<number, string[]> = {};

  for (const [lid, teamIds] of Object.entries(leagueGroups)) {
    const leagueName = clubs[teamIds[0]]?.leagueName ?? 'Unknown';
    const rounds = generateRoundRobin(teamIds);
    const totalMatchdays = rounds.length;
    const matchdayFixtureIds: Record<number, string[]> = {};

    for (let md = 0; md < totalMatchdays; md++) {
      const week = md + 1;
      if (week > SEASON_WEEKS) break;
      const fIds: string[] = [];

      for (const [homeId, awayId] of rounds[md]) {
        const fid = uid('lf', hs(`${lid}-${md}-${homeId}-${awayId}`));
        const fixture: MatchFixture = {
          id: fid,
          homeId,
          awayId,
          compId: lid,
          compName: leagueName,
          week,
          played: false,
          homeGoals: 0,
          awayGoals: 0,
          stats: null,
        };
        allFixtures[fid] = fixture;
        fIds.push(fid);
        if (!weekFixtureIds[week]) weekFixtureIds[week] = [];
        weekFixtureIds[week].push(fid);
      }
      matchdayFixtureIds[md + 1] = fIds;
    }

    leagues[lid] = {
      id: lid,
      name: leagueName,
      teams: teamIds,
      standings: initStandings(teamIds, clubs),
      matchdayFixtureIds,
      currentMatchday: 1,
      totalMatchdays: Math.min(totalMatchdays, SEASON_WEEKS),
    };
  }

  // Build cups
  const seasonSeed = 2025;

  function buildCup(cupId: string, cupName: string, weeks: number[]): CupData {
    const { pairings } = generateCupR1(allTeamIds, clubs, seasonSeed + hs(cupId));
    const r1FixtureIds: string[] = [];

    for (const [homeId, awayId] of pairings) {
      const fid = uid('cf', hs(`${cupId}-r1-${homeId}-${awayId}`));
      const fixture: MatchFixture = {
        id: fid,
        homeId,
        awayId,
        compId: cupId,
        compName: cupName,
        week: weeks[0],
        played: false,
        homeGoals: 0,
        awayGoals: 0,
        stats: null,
      };
      allFixtures[fid] = fixture;
      r1FixtureIds.push(fid);
      if (!weekFixtureIds[weeks[0]]) weekFixtureIds[weeks[0]] = [];
      weekFixtureIds[weeks[0]].push(fid);
    }

    return {
      id: cupId,
      name: cupName,
      allTeams: allTeamIds,
      rounds: [{ round: 0, name: 'Round 1', fixtureIds: r1FixtureIds, completed: false }],
      currentRound: 0,
      eliminated: [],
    };
  }

  const faCup = buildCup('fa-cup', 'FA Cup', FA_CUP_WEEKS);
  const leagueCup = buildCup('league-cup', 'League Cup', LEAGUE_CUP_WEEKS);

  const state: GameState = {
    initialized: true,
    gameWeek: 1,
    season: 1,
    activeClubId,
    clubs,
    leagues,
    faCup,
    leagueCup,
    fixtures: allFixtures,
    weekFixtureIds,
    phase: 'idle',
    lastWeekResultIds: [],
    seasonComplete: false,
  };

  saveGameState(state);
  return state;
}

/** Get all fixture objects for the current game week. */
export function getWeekFixtures(state: GameState): MatchFixture[] {
  const ids = state.weekFixtureIds[state.gameWeek] ?? [];
  return ids.map((id) => state.fixtures[id]).filter(Boolean);
}

/** Check if a fixture involves the active manager's club. */
export function isPlayerFixture(fixture: MatchFixture, activeClubId: string): boolean {
  return fixture.homeId === activeClubId || fixture.awayId === activeClubId;
}

/** Simulate all AI fixtures for the current week. Returns updated state + list of results. */
export function simulateAIFixtures(state: GameState): GameState {
  const weekFixtures = getWeekFixtures(state);
  const next = { ...state, fixtures: { ...state.fixtures } };
  const resultIds: string[] = [];

  for (const f of weekFixtures) {
    if (f.played) continue;
    if (isPlayerFixture(f, state.activeClubId)) continue; // skip player's match

    const homeClub = next.clubs[f.homeId];
    const awayClub = next.clubs[f.awayId];
    if (!homeClub || !awayClub) continue;

    const seed = hs(`${f.id}-sim-${state.gameWeek}`);
    const result = simulateMatch(homeClub, awayClub, seed);

    next.fixtures[f.id] = {
      ...f,
      played: true,
      homeGoals: result.homeGoals,
      awayGoals: result.awayGoals,
      stats: result.stats,
    };
    resultIds.push(f.id);
  }

  next.lastWeekResultIds = resultIds;
  return next;
}

/** Apply a single match result to the game state (standings, form, morale). */
export function applyMatchResult(state: GameState, fixtureId: string): GameState {
  const fixture = state.fixtures[fixtureId];
  if (!fixture || !fixture.played) return state;

  const next = { ...state, leagues: { ...state.leagues }, clubs: { ...state.clubs } };

  // Update league standings
  const league = next.leagues[fixture.compId];
  if (league) {
    next.leagues[fixture.compId] = {
      ...league,
      standings: updateStandingsWithResult(
        league.standings,
        fixture.homeId,
        fixture.awayId,
        fixture.homeGoals,
        fixture.awayGoals,
      ),
    };
  }

  // Update club form & morale
  function updateClubState(clubId: string, goalsFor: number, goalsAgainst: number) {
    const c = next.clubs[clubId];
    if (!c) return;
    const won = goalsFor > goalsAgainst;
    const drawn = goalsFor === goalsAgainst;
    next.clubs[clubId] = {
      ...c,
      form: clamp(c.form + (won ? 2 : drawn ? 0 : -2), -10, 10),
      morale: clamp(c.morale + (won ? 5 : drawn ? 1 : -4), 10, 99),
    };
  }

  updateClubState(fixture.homeId, fixture.homeGoals, fixture.awayGoals);
  updateClubState(fixture.awayId, fixture.awayGoals, fixture.homeGoals);

  return next;
}

/** Process cup round completion: check if all cup fixtures for current round are done. */
export function processCupRounds(state: GameState): GameState {
  const next = { ...state };

  function processCup(cup: CupData, cupWeeks: number[]): CupData {
    const round = cup.rounds[cup.currentRound];
    if (!round || round.completed) return cup;

    // check if all fixtures in this round are played
    const allPlayed = round.fixtureIds.every((fid) => next.fixtures[fid]?.played);
    if (!allPlayed) return cup;

    const completedRound = { ...round, completed: true };
    const updatedCup = { ...cup, rounds: cup.rounds.map((r, i) => i === cup.currentRound ? completedRound : r) };

    // advance to next round
    const advanced = advanceCupRound(updatedCup, next.fixtures, next.clubs, hs(cup.id) + cup.currentRound);

    // create fixtures for next round
    const pending = (advanced as CupData & { _pendingPairings?: [string, string][] })._pendingPairings;
    if (pending && pending.length > 0) {
      const nextRoundIdx = advanced.currentRound;
      const cupWeek = cupWeeks[nextRoundIdx] ?? state.gameWeek + 5;
      const fIds: string[] = [];

      for (const [homeId, awayId] of pending) {
        const fid = uid('cf', hs(`${cup.id}-r${nextRoundIdx}-${homeId}-${awayId}`));
        const fixture: MatchFixture = {
          id: fid,
          homeId,
          awayId,
          compId: cup.id,
          compName: cup.name,
          week: cupWeek,
          played: false,
          homeGoals: 0,
          awayGoals: 0,
          stats: null,
        };
        next.fixtures[fid] = fixture;
        fIds.push(fid);
        if (!next.weekFixtureIds[cupWeek]) next.weekFixtureIds[cupWeek] = [];
        next.weekFixtureIds[cupWeek].push(fid);
      }

      // update the last round's fixtureIds
      const lastRound = advanced.rounds[advanced.rounds.length - 1];
      if (lastRound) lastRound.fixtureIds = fIds;
    }

    // remove temp field
    const clean = { ...advanced };
    delete (clean as Record<string, unknown>)['_pendingPairings'];
    return clean as CupData;
  }

  next.faCup = processCup(next.faCup, FA_CUP_WEEKS);
  next.leagueCup = processCup(next.leagueCup, LEAGUE_CUP_WEEKS);

  return next;
}

/** Advance to next week. */
export function advanceWeek(state: GameState): GameState {
  const nextWeek = state.gameWeek + 1;
  const seasonDone = nextWeek > SEASON_WEEKS;

  // update league matchday counters
  const leagues = { ...state.leagues };
  for (const [lid, league] of Object.entries(leagues)) {
    if (league.currentMatchday < league.totalMatchdays) {
      leagues[lid] = { ...league, currentMatchday: league.currentMatchday + 1 };
    }
  }

  const next: GameState = {
    ...state,
    gameWeek: nextWeek,
    leagues,
    phase: seasonDone ? 'end_of_season' : 'idle',
    seasonComplete: seasonDone,
  };

  saveGameState(next);
  return next;
}

/** Record an interactive match result into the game state. */
export function recordInteractiveResult(
  state: GameState,
  fixtureId: string,
  homeGoals: number,
  awayGoals: number,
  stats: MatchStats,
): GameState {
  const next = {
    ...state,
    fixtures: {
      ...state.fixtures,
      [fixtureId]: {
        ...state.fixtures[fixtureId],
        played: true,
        homeGoals,
        awayGoals,
        stats,
      },
    },
    lastWeekResultIds: [...state.lastWeekResultIds, fixtureId],
  };
  return next;
}

// ────────────────────────────────────────────
// 8. FORMATION POSITIONS (for visualization)
// ────────────────────────────────────────────

/** Default 4-4-2 formation positions on pitch (viewBox 0-100 x 0-150) */
export const HOME_POSITIONS: [number, number][] = [
  [50, 140],                                        // GK
  [20, 118], [38, 122], [62, 122], [80, 118],       // DEF
  [18, 85], [38, 85], [62, 85], [82, 85],           // MID
  [38, 52], [62, 52],                                // FWD
];

export const AWAY_POSITIONS: [number, number][] = [
  [50, 10],                                          // GK
  [80, 32], [62, 28], [38, 28], [20, 32],            // DEF
  [82, 65], [62, 65], [38, 65], [18, 65],            // MID
  [62, 98], [38, 98],                                // FWD
];

export const POSITION_LABELS = ['GK', 'LB', 'CB', 'CB', 'RB', 'LM', 'CM', 'CM', 'RM', 'ST', 'ST'];

/** Convert a FullTactic's formation slots into pitch positions (viewBox 0-100 x 0-150).
 *  isHome=true → bottom half (GK at y=140), isHome=false → top half (GK at y=10). */
export function getFormationPositions(tactic: FullTactic | null): { positions: [number, number][]; labels: string[] } {
  if (!tactic) return { positions: HOME_POSITIONS, labels: POSITION_LABELS };
  const slots = tactic.slots;
  const positions: [number, number][] = slots.map(s => [s.posX, s.posY]);
  const labels: string[] = slots.map(s => s.label);
  return { positions, labels };
}

/** Map formation positions (posX 0-100, posY 0-100) to home pitch coords (viewBox 0-100 x 0-150) */
export function formationToHomePitch(pos: [number, number][]): [number, number][] {
  // posY 0 = top of formation (striker) → y ~50 on pitch. posY 92 = GK → y ~140.
  return pos.map(([x, y]) => [x, 50 + (y / 100) * 90] as [number, number]);
}

/** Map formation positions to away pitch coords (mirrored) */
export function formationToAwayPitch(pos: [number, number][]): [number, number][] {
  // posY 0 = striker → y ~100 on pitch (bottom-ish). posY 92 = GK → y ~10.
  return pos.map(([x, y]) => [100 - x, 100 - (50 + (y / 100) * 90) + 10] as [number, number]);
}
