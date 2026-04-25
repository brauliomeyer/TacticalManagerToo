// ═══════════════════════════════════════════════════════════════════════════════
// PLAYER ENGINE — Attribute Calculation, Role Detection & Realism Layer
// Inspired by StatsBomb event-based data model + Tactical Manager / FM depth
// ═══════════════════════════════════════════════════════════════════════════════

// ─── STATSBOMB-STYLE RAW EVENT DATA ──────────────────────────────────────────

export interface PlayerEventData {
  // Match base
  appearances: number;
  minutesPlayed: number;
  starts: number;

  // Attacking events
  goals: number;
  assists: number;
  shots: number;
  shotsOnTarget: number;
  xG: number;
  xA: number;
  bigChancesCreated: number;

  // Passing events
  passesAttempted: number;
  passesCompleted: number;
  keyPasses: number;
  throughBalls: number;
  longBallsAccurate: number;
  crossesAttempted: number;
  crossesCompleted: number;

  // Possession & dribbling
  touches: number;
  dribbleAttempts: number;
  dribbleSuccessful: number;
  ballRecoveries: number;
  dispossessed: number;

  // Defensive events
  tackles: number;
  tacklesWon: number;
  interceptions: number;
  clearances: number;
  blocks: number;
  aerialDuelsWon: number;
  aerialDuelsLost: number;
  groundDuelsWon: number;
  groundDuelsLost: number;

  // Discipline & pressing
  foulsCommitted: number;
  foulsWon: number;
  yellowCards: number;
  redCards: number;
  pressures: number;
  pressuresSuccessful: number;

  // Goalkeeper-specific
  saves: number;
  cleanSheets: number;
  goalsConceded: number;
  penaltySaves: number;

  // Last 5 matches form (each 0-10 individual match rating)
  last5Ratings: number[];
}

// ─── DERIVED ADVANCED ATTRIBUTES (0-100 SCALE) ──────────────────────────────

export interface DerivedAttributes {
  control: number;
  vision: number;
  tackling: number;
  shooting: number;
  influence: number;
  attitude: number;
  reliability: number;
  creativity: number;
  workRate: number;
  composure: number;
  positioning: number;
  aerialAbility: number;
  crossing: number;
  longPassing: number;
  concentration: number;
  leadership: number;
}

// ─── DETECTED ROLES ──────────────────────────────────────────────────────────

export type DetectedRole =
  | 'Playmaker'
  | 'Ball Winner'
  | 'Target Man'
  | 'Poacher'
  | 'Deep-Lying Playmaker'
  | 'Box-to-Box'
  | 'Defensive Anchor'
  | 'Inverted Winger'
  | 'Advanced Forward'
  | 'Trequartista'
  | 'Pressing Forward'
  | 'Complete Forward'
  | 'Wing-Back'
  | 'Ball-Playing Defender'
  | 'Sweeper Keeper'
  | 'Shot Stopper'
  | 'Mezzala'
  | 'Regista'
  | 'Raumdeuter'
  | 'False Nine';

export interface PlayerProfile {
  primaryRole: DetectedRole;
  secondaryRole: DetectedRole | null;
  derived: DerivedAttributes;
  ovr: number;
  effectiveOvr: number; // after form/fatigue adjustments
  formImpact: number;   // -15 to +10
  fatigueImpact: number; // -20 to 0
}

// ─── NORMALIZATION HELPERS ───────────────────────────────────────────────────

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function normalize(value: number, min: number, max: number): number {
  if (max === min) return 50;
  return clamp(Math.round(((value - min) / (max - min)) * 100), 0, 100);
}

function safeRatio(numerator: number, denominator: number, fallback = 0): number {
  return denominator > 0 ? numerator / denominator : fallback;
}

// ─── ATTRIBUTE ENGINE ────────────────────────────────────────────────────────
// Converts raw event data → derived attributes (0-100)
// Each formula combines multiple event types with calibrated weights

export function calculateDerivedAttributes(ev: PlayerEventData): DerivedAttributes {
  const per90 = ev.minutesPlayed > 0 ? 90 / ev.minutesPlayed : 0;
  const passAccuracy = safeRatio(ev.passesCompleted, ev.passesAttempted) * 100;
  const ballRetention = safeRatio(ev.touches - ev.dispossessed, ev.touches) * 100;
  const tackleSuccess = safeRatio(ev.tacklesWon, ev.tackles) * 100;
  const aerialWinRate = safeRatio(ev.aerialDuelsWon, ev.aerialDuelsWon + ev.aerialDuelsLost) * 100;
  const dribbleSuccess = safeRatio(ev.dribbleSuccessful, ev.dribbleAttempts) * 100;
  const pressureSuccess = safeRatio(ev.pressuresSuccessful, ev.pressures) * 100;
  const crossAccuracy = safeRatio(ev.crossesCompleted, ev.crossesAttempted) * 100;

  // CONTROL = pass accuracy + ball retention + dribble success
  const controlRaw = passAccuracy * 0.4 + ballRetention * 0.3 + dribbleSuccess * 0.3;
  const control = clamp(Math.round(controlRaw), 0, 100);

  // VISION = key passes per 90 + xA per 90 + through balls per 90
  const visionRaw = (ev.keyPasses * per90) * 15 + (ev.xA * per90) * 40 + (ev.throughBalls * per90) * 20 + (ev.bigChancesCreated * per90) * 10;
  const vision = normalize(visionRaw, 0, 25);

  // TACKLING = tackles won per 90 + interceptions per 90 + tackle success rate
  const tacklingRaw = (ev.tacklesWon * per90) * 10 + (ev.interceptions * per90) * 12 + tackleSuccess * 0.3;
  const tackling = normalize(tacklingRaw, 0, 80);

  // SHOOTING = xG per 90 + shots on target ratio + goals per 90
  const shotAccuracy = safeRatio(ev.shotsOnTarget, ev.shots) * 100;
  const shootingRaw = (ev.xG * per90) * 50 + shotAccuracy * 0.3 + (ev.goals * per90) * 25;
  const shooting = normalize(shootingRaw, 0, 50);

  // INFLUENCE = touches per 90 + passes per 90 + minutes share
  const minuteShare = safeRatio(ev.minutesPlayed, ev.appearances * 90) * 100;
  const influenceRaw = (ev.touches * per90) * 0.5 + (ev.passesAttempted * per90) * 0.3 + minuteShare * 0.4;
  const influence = normalize(influenceRaw, 0, 80);

  // ATTITUDE = pressures per 90 + duels per 90 - fouls (inverse weighting)
  const totalDuels = ev.groundDuelsWon + ev.groundDuelsLost + ev.aerialDuelsWon + ev.aerialDuelsLost;
  const attitudeRaw = (ev.pressures * per90) * 2 + (totalDuels * per90) * 1.5 - (ev.foulsCommitted * per90) * 3 - ev.yellowCards * 5 - ev.redCards * 15;
  const attitude = normalize(attitudeRaw, -20, 60);

  // RELIABILITY = consistency over last 5 matches (low std dev = high reliability)
  const ratings = ev.last5Ratings.length > 0 ? ev.last5Ratings : [5];
  const avgRating = ratings.reduce((s, r) => s + r, 0) / ratings.length;
  const variance = ratings.reduce((s, r) => s + (r - avgRating) ** 2, 0) / ratings.length;
  const stdDev = Math.sqrt(variance);
  const reliabilityRaw = 100 - stdDev * 20 + avgRating * 5;
  const reliability = clamp(Math.round(reliabilityRaw), 0, 100);

  // CREATIVITY = key passes + through balls + big chances created + xA
  const creativityRaw = (ev.keyPasses * per90) * 12 + (ev.throughBalls * per90) * 18 + (ev.bigChancesCreated * per90) * 15 + (ev.xA * per90) * 35;
  const creativity = normalize(creativityRaw, 0, 25);

  // WORK RATE = distance proxy (pressures + ball recoveries + tackles + duels)
  const workRateRaw = (ev.pressures * per90) * 2 + (ev.ballRecoveries * per90) * 3 + (ev.tackles * per90) * 4 + (totalDuels * per90) * 1;
  const workRate = normalize(workRateRaw, 0, 80);

  // COMPOSURE = shot accuracy + dribble success under pressure + pass accuracy
  const composureRaw = shotAccuracy * 0.3 + dribbleSuccess * 0.3 + passAccuracy * 0.2 + pressureSuccess * 0.2;
  const composure = clamp(Math.round(composureRaw), 0, 100);

  // POSITIONING = interceptions + blocks + clearances per 90 (reading the game)
  const positioningRaw = (ev.interceptions * per90) * 12 + (ev.blocks * per90) * 10 + (ev.clearances * per90) * 6;
  const positioning = normalize(positioningRaw, 0, 60);

  // AERIAL ABILITY = aerial duel win rate + heading-related clearances
  const aerialAbilityRaw = aerialWinRate * 0.7 + (ev.aerialDuelsWon * per90) * 8;
  const aerialAbility = normalize(aerialAbilityRaw, 0, 100);

  // CROSSING = cross accuracy + crosses attempted per 90
  const crossingRaw = crossAccuracy * 0.5 + (ev.crossesAttempted * per90) * 8;
  const crossing = normalize(crossingRaw, 0, 80);

  // LONG PASSING = long balls accurate per 90 + key passes
  const longPassingRaw = (ev.longBallsAccurate * per90) * 12 + (ev.keyPasses * per90) * 5;
  const longPassing = normalize(longPassingRaw, 0, 50);

  // CONCENTRATION = (blocks + clearances + interceptions) / (fouls + dispossessed)
  const goodEvents = ev.blocks + ev.clearances + ev.interceptions;
  const badEvents = ev.foulsCommitted + ev.dispossessed + 1;
  const concentrationRaw = safeRatio(goodEvents, badEvents) * 15 + passAccuracy * 0.3;
  const concentration = normalize(concentrationRaw, 0, 60);

  // LEADERSHIP = experience-weighted influence (caps/appearances proxy)
  const leadershipRaw = minuteShare * 0.3 + (ev.starts / Math.max(1, ev.appearances)) * 40 + avgRating * 5;
  const leadership = normalize(leadershipRaw, 0, 80);

  return {
    control, vision, tackling, shooting, influence, attitude,
    reliability, creativity, workRate, composure, positioning,
    aerialAbility, crossing, longPassing, concentration, leadership,
  };
}

// ─── ROLE DETECTION ENGINE ───────────────────────────────────────────────────
// Rule-based system: checks threshold combinations to assign primary + secondary

interface RoleRule {
  role: DetectedRole;
  score: (d: DerivedAttributes, posGroup: string) => number;
}

function positionGroup(role: string): string {
  const r = role.toUpperCase();
  if (r.includes('GOALKEEPER')) return 'GK';
  if (r.includes('BACK') || r.includes('CENTER_BACK') || r.includes('SWEEPER')) return 'DEF';
  if (r.includes('WING_BACK')) return 'DEF';
  if (r.includes('MIDFIELDER') || r.includes('PLAYMAKER') || r.includes('ANCHOR') || r === 'BOX_TO_BOX_MIDFIELDER') return 'MID';
  if (r.includes('WINGER') || r.includes('INVERTED_WINGER')) return 'WING';
  return 'FWD';
}

const roleRules: RoleRule[] = [
  {
    role: 'Playmaker',
    score: (d, pg) => (pg === 'MID' || pg === 'WING' ? 1.2 : 0.8) * (d.vision * 0.35 + d.creativity * 0.30 + d.control * 0.20 + d.longPassing * 0.15),
  },
  {
    role: 'Deep-Lying Playmaker',
    score: (d, pg) => (pg === 'MID' ? 1.3 : 0.7) * (d.longPassing * 0.30 + d.vision * 0.25 + d.composure * 0.20 + d.positioning * 0.15 + d.control * 0.10),
  },
  {
    role: 'Regista',
    score: (d, pg) => (pg === 'MID' ? 1.3 : 0.6) * (d.longPassing * 0.30 + d.vision * 0.30 + d.control * 0.20 + d.creativity * 0.20),
  },
  {
    role: 'Mezzala',
    score: (d, pg) => (pg === 'MID' ? 1.2 : 0.7) * (d.workRate * 0.25 + d.creativity * 0.25 + d.control * 0.20 + d.shooting * 0.15 + d.vision * 0.15),
  },
  {
    role: 'Ball Winner',
    score: (d, pg) => (pg === 'MID' || pg === 'DEF' ? 1.2 : 0.7) * (d.tackling * 0.35 + d.workRate * 0.25 + d.positioning * 0.20 + d.attitude * 0.20),
  },
  {
    role: 'Defensive Anchor',
    score: (d, pg) => (pg === 'MID' || pg === 'DEF' ? 1.3 : 0.5) * (d.positioning * 0.30 + d.tackling * 0.25 + d.concentration * 0.25 + d.reliability * 0.20),
  },
  {
    role: 'Box-to-Box',
    score: (d, pg) => (pg === 'MID' ? 1.3 : 0.6) * (d.workRate * 0.30 + d.tackling * 0.20 + d.shooting * 0.15 + d.control * 0.15 + d.attitude * 0.20),
  },
  {
    role: 'Target Man',
    score: (d, pg) => (pg === 'FWD' ? 1.3 : 0.5) * (d.aerialAbility * 0.35 + d.shooting * 0.25 + d.composure * 0.20 + d.positioning * 0.20),
  },
  {
    role: 'Poacher',
    score: (d, pg) => (pg === 'FWD' ? 1.3 : 0.5) * (d.shooting * 0.40 + d.composure * 0.25 + d.positioning * 0.20 + d.attitude * 0.15),
  },
  {
    role: 'Advanced Forward',
    score: (d, pg) => (pg === 'FWD' ? 1.2 : 0.6) * (d.shooting * 0.25 + d.control * 0.20 + d.workRate * 0.20 + d.creativity * 0.15 + d.composure * 0.20),
  },
  {
    role: 'Pressing Forward',
    score: (d, pg) => (pg === 'FWD' ? 1.2 : 0.6) * (d.workRate * 0.35 + d.attitude * 0.25 + d.tackling * 0.15 + d.shooting * 0.15 + d.composure * 0.10),
  },
  {
    role: 'Complete Forward',
    score: (d, pg) => (pg === 'FWD' ? 1.2 : 0.5) * (d.shooting * 0.20 + d.control * 0.20 + d.vision * 0.15 + d.aerialAbility * 0.15 + d.composure * 0.15 + d.workRate * 0.15),
  },
  {
    role: 'Trequartista',
    score: (d, pg) => (pg === 'MID' || pg === 'FWD' ? 1.2 : 0.6) * (d.creativity * 0.30 + d.vision * 0.25 + d.control * 0.25 + d.shooting * 0.20),
  },
  {
    role: 'Inverted Winger',
    score: (d, pg) => (pg === 'WING' ? 1.3 : 0.6) * (d.control * 0.25 + d.shooting * 0.25 + d.creativity * 0.20 + d.composure * 0.15 + d.workRate * 0.15),
  },
  {
    role: 'Wing-Back',
    score: (d, pg) => (pg === 'DEF' || pg === 'WING' ? 1.3 : 0.5) * (d.crossing * 0.30 + d.workRate * 0.25 + d.tackling * 0.20 + d.control * 0.15 + d.attitude * 0.10),
  },
  {
    role: 'Ball-Playing Defender',
    score: (d, pg) => (pg === 'DEF' ? 1.4 : 0.4) * (d.control * 0.25 + d.longPassing * 0.25 + d.composure * 0.20 + d.tackling * 0.15 + d.positioning * 0.15),
  },
  {
    role: 'Sweeper Keeper',
    score: (d, pg) => (pg === 'GK' ? 2.0 : 0.1) * (d.control * 0.30 + d.composure * 0.30 + d.longPassing * 0.20 + d.positioning * 0.20),
  },
  {
    role: 'Shot Stopper',
    score: (d, pg) => (pg === 'GK' ? 2.0 : 0.1) * (d.positioning * 0.30 + d.concentration * 0.30 + d.composure * 0.20 + d.reliability * 0.20),
  },
  {
    role: 'Raumdeuter',
    score: (d, pg) => (pg === 'WING' || pg === 'FWD' ? 1.2 : 0.5) * (d.positioning * 0.30 + d.shooting * 0.30 + d.composure * 0.20 + d.attitude * 0.20),
  },
  {
    role: 'False Nine',
    score: (d, pg) => (pg === 'FWD' ? 1.2 : 0.5) * (d.creativity * 0.25 + d.vision * 0.25 + d.control * 0.25 + d.shooting * 0.15 + d.composure * 0.10),
  },
];

export function detectRoles(derived: DerivedAttributes, role: string): { primary: DetectedRole; secondary: DetectedRole | null } {
  const pg = positionGroup(role);
  const scored = roleRules
    .map((r) => ({ role: r.role, score: r.score(derived, pg) }))
    .sort((a, b) => b.score - a.score);

  const primary = scored[0].role;
  const secondary = scored.length > 1 && scored[1].score > scored[0].score * 0.65 ? scored[1].role : null;

  return { primary, secondary };
}

// ─── POSITION-WEIGHTED OVR FORMULA ───────────────────────────────────────────
// Different positions weight attributes differently

interface OvrWeights {
  control: number; vision: number; tackling: number; shooting: number;
  influence: number; composure: number; positioning: number; workRate: number;
  aerialAbility: number; crossing: number; creativity: number; concentration: number;
  leadership: number; longPassing: number; attitude: number; reliability: number;
}

const ovrWeightsByPosition: Record<string, OvrWeights> = {
  GK: {
    control: 0.05, vision: 0.02, tackling: 0.02, shooting: 0.00,
    influence: 0.05, composure: 0.15, positioning: 0.20, workRate: 0.02,
    aerialAbility: 0.10, crossing: 0.00, creativity: 0.00, concentration: 0.18,
    leadership: 0.06, longPassing: 0.05, attitude: 0.05, reliability: 0.05,
  },
  DEF: {
    control: 0.08, vision: 0.04, tackling: 0.18, shooting: 0.02,
    influence: 0.05, composure: 0.10, positioning: 0.15, workRate: 0.08,
    aerialAbility: 0.10, crossing: 0.02, creativity: 0.02, concentration: 0.08,
    leadership: 0.03, longPassing: 0.02, attitude: 0.05, reliability: 0.10,
  },
  MID: {
    control: 0.12, vision: 0.14, tackling: 0.08, shooting: 0.06,
    influence: 0.08, composure: 0.08, positioning: 0.06, workRate: 0.10,
    aerialAbility: 0.02, crossing: 0.04, creativity: 0.10, concentration: 0.04,
    leadership: 0.02, longPassing: 0.06, attitude: 0.04, reliability: 0.05,
  },
  WING: {
    control: 0.12, vision: 0.10, tackling: 0.03, shooting: 0.12,
    influence: 0.05, composure: 0.08, positioning: 0.05, workRate: 0.08,
    aerialAbility: 0.02, crossing: 0.15, creativity: 0.12, concentration: 0.02,
    leadership: 0.01, longPassing: 0.02, attitude: 0.04, reliability: 0.03,
  },
  FWD: {
    control: 0.10, vision: 0.08, tackling: 0.02, shooting: 0.22,
    influence: 0.05, composure: 0.14, positioning: 0.10, workRate: 0.06,
    aerialAbility: 0.05, crossing: 0.02, creativity: 0.08, concentration: 0.02,
    leadership: 0.01, longPassing: 0.01, attitude: 0.04, reliability: 0.04,
  },
};

export function calculateOvr(derived: DerivedAttributes, role: string): number {
  const pg = positionGroup(role);
  const w = ovrWeightsByPosition[pg] ?? ovrWeightsByPosition.MID;
  let ovr = 0;
  for (const key of Object.keys(w) as (keyof OvrWeights)[]) {
    ovr += (derived[key] ?? 0) * w[key];
  }
  return clamp(Math.round(ovr), 1, 99);
}

// ─── REALISM LAYER ───────────────────────────────────────────────────────────
// Form impact: based on last 5 match ratings
// Fatigue impact: based on freshness + fitness

export function calculateFormImpact(last5Ratings: number[]): number {
  if (last5Ratings.length === 0) return 0;
  const avg = last5Ratings.reduce((s, r) => s + r, 0) / last5Ratings.length;
  // avg is 0-10; baseline is 6.5
  // Great form (8+): up to +10
  // Poor form (< 5): down to -15
  if (avg >= 6.5) return clamp(Math.round((avg - 6.5) * 6.67), 0, 10);
  return clamp(Math.round((avg - 6.5) * 10), -15, 0);
}

export function calculateFatigueImpact(fitness: number, freshness: number, minutesPlayed: number, appearances: number): number {
  // fitness/freshness are 0-20 scale from TM
  const fitNorm = (fitness / 20) * 100;
  const freshNorm = (freshness / 20) * 100;
  const avgMinutes = appearances > 0 ? minutesPlayed / appearances : 0;
  // Overplayed penalty: > 85 min avg = penalty
  const overplayedPenalty = avgMinutes > 85 ? (avgMinutes - 85) * 0.5 : 0;
  const fatigueScore = (fitNorm * 0.4 + freshNorm * 0.6) - overplayedPenalty;
  // 100 = no fatigue, 0 = exhausted → map to 0..-20
  if (fatigueScore >= 80) return 0;
  return clamp(Math.round((fatigueScore - 80) * 0.25), -20, 0);
}

export function applyVariance(value: number, seed: number): number {
  // Deterministic slight variance: ±3 points
  const noise = ((seed * 2654435761) >>> 0) % 7 - 3;
  return clamp(value + noise, 0, 100);
}

// ─── FULL PROFILE BUILDER ────────────────────────────────────────────────────
// Takes a player's event data + existing TM attrs → produces full profile

export function buildPlayerProfile(
  ev: PlayerEventData,
  role: string,
  varianceSeed: number
): PlayerProfile {
  const derived = calculateDerivedAttributes(ev);

  // Apply slight variance to each derived attribute
  const variedDerived: DerivedAttributes = {} as DerivedAttributes;
  const keys = Object.keys(derived) as (keyof DerivedAttributes)[];
  keys.forEach((k, i) => {
    variedDerived[k] = applyVariance(derived[k], varianceSeed + i * 7);
  });

  const { primary, secondary } = detectRoles(variedDerived, role);
  const ovr = calculateOvr(variedDerived, role);
  const formImpact = calculateFormImpact(ev.last5Ratings);
  const fatigueImpact = calculateFatigueImpact(
    10, // default fitness (will be overridden by actual value)
    15, // default freshness
    ev.minutesPlayed,
    ev.appearances
  );
  const effectiveOvr = clamp(ovr + formImpact + fatigueImpact, 1, 99);

  return {
    primaryRole: primary,
    secondaryRole: secondary,
    derived: variedDerived,
    ovr,
    effectiveOvr,
    formImpact,
    fatigueImpact,
  };
}

// ─── SYNTHETIC EVENT DATA GENERATOR ──────────────────────────────────────────
// Converts existing SquadPlayer TM attributes (0-20) + FIFA stats (0-99)
// into realistic PlayerEventData for the attribute engine

export function synthesizeEventData(player: {
  age: number;
  role: string;
  pac: number; sho: number; pas: number; dri: number; def: number; phy: number;
  morale: number; stamina: number; form: number;
  played: number; scored: number; speed: number; control: number;
  tackling: number; passing: number; heading: number; shooting: number;
  marking: number; vision: number; caps: number; experience: number;
  fitness: number; freshness: number; influence: number; attitude: number;
  reliability: number;
}, seed: number): PlayerEventData {
  const s = seed;
  const h = (offset: number) => ((s * 31 + offset * 2654435761) >>> 0) % 100;

  // Scale TM 0-20 → 0-100 percentile
  const tm = (v: number) => (v / 20) * 100;
  // Scale FIFA 0-99 → 0-100
  const fa = (v: number) => v;

  const pg = positionGroup(player.role);
  const isGK = pg === 'GK';
  const isDef = pg === 'DEF';
  const isMid = pg === 'MID';
  const isFwd = pg === 'FWD' || pg === 'WING';

  const gamesPlayed = player.played > 0 ? player.played : 10 + (h(1) % 25);
  const minutesPlayed = Math.round(gamesPlayed * (65 + h(2) % 26));

  const passAcc = (fa(player.pas) * 0.6 + tm(player.passing) * 0.4);
  const passesAttempted = Math.round(gamesPlayed * (20 + passAcc * 0.4 + h(3) % 15));
  const passesCompleted = Math.round(passesAttempted * (passAcc / 100) * (0.85 + h(4) % 15 / 100));

  const shotBase = isFwd ? 3.5 : isMid ? 1.5 : isDef ? 0.4 : 0.1;
  const shots = Math.round(gamesPlayed * shotBase * (0.7 + tm(player.shooting) / 200));
  const shotsOnTarget = Math.round(shots * (0.3 + fa(player.sho) / 300));

  const goals = player.scored > 0 ? player.scored : Math.round(shots * (fa(player.sho) / 400) * (0.5 + h(5) / 200));
  const xG = goals * (0.8 + h(6) % 40 / 100);

  const assistBase = isFwd ? 0.2 : isMid ? 0.25 : isDef ? 0.08 : 0.02;
  const assists = Math.round(gamesPlayed * assistBase * (0.5 + tm(player.vision) / 150));
  const xA = assists * (0.75 + h(7) % 50 / 100);

  const keyPasses = Math.round(gamesPlayed * (0.5 + tm(player.vision) * 0.025));
  const throughBalls = Math.round(keyPasses * (0.15 + tm(player.vision) / 400));
  const bigChancesCreated = Math.round(assists * (0.9 + h(8) % 20 / 100));
  const longBallsAccurate = Math.round(passesCompleted * (0.05 + tm(player.passing) / 600));
  const crossesAttempted = (pg === 'WING' || pg === 'DEF') ? Math.round(gamesPlayed * (1 + h(9) % 3)) : Math.round(gamesPlayed * 0.3);
  const crossesCompleted = Math.round(crossesAttempted * (0.2 + passAcc / 400));

  const touches = Math.round(passesAttempted * (1.4 + h(10) % 20 / 100));
  const dribbleAttempts = Math.round(gamesPlayed * (0.5 + fa(player.dri) * 0.025));
  const dribbleSuccessful = Math.round(dribbleAttempts * (0.4 + fa(player.dri) / 300));
  const ballRecoveries = Math.round(gamesPlayed * (2 + tm(player.marking) * 0.05 + tm(player.tackling) * 0.03));
  const dispossessed = Math.round(dribbleAttempts - dribbleSuccessful + h(11) % 5);

  const tackleBase = isDef ? 3 : isMid ? 2 : 0.8;
  const tackles = Math.round(gamesPlayed * tackleBase * (0.6 + tm(player.tackling) / 150));
  const tacklesWon = Math.round(tackles * (0.5 + tm(player.tackling) / 200));
  const interceptions = Math.round(gamesPlayed * (isDef ? 2 : isMid ? 1.2 : 0.4) * (0.5 + tm(player.marking) / 150));
  const clearances = isDef || isGK ? Math.round(gamesPlayed * (2 + tm(player.heading) * 0.1)) : Math.round(gamesPlayed * 0.3);
  const blocks = isDef ? Math.round(gamesPlayed * (0.5 + h(12) % 10 / 10)) : Math.round(gamesPlayed * 0.15);
  const aerialDuelsWon = Math.round(gamesPlayed * (0.5 + tm(player.heading) * 0.08 + fa(player.phy) * 0.01));
  const aerialDuelsLost = Math.round(aerialDuelsWon * (0.3 + (100 - fa(player.phy)) / 200));
  const groundDuelsWon = Math.round(gamesPlayed * (1.5 + tm(player.tackling) * 0.04 + fa(player.phy) * 0.01));
  const groundDuelsLost = Math.round(groundDuelsWon * (0.3 + h(13) % 30 / 100));

  const foulsCommitted = Math.round(gamesPlayed * (1 + (20 - player.attitude) * 0.05));
  const foulsWon = Math.round(gamesPlayed * (0.5 + fa(player.dri) * 0.01));
  const yellowCards = Math.round(foulsCommitted * 0.12);
  const redCards = yellowCards > 6 ? 1 : 0;
  const pressures = Math.round(gamesPlayed * (5 + tm(player.attitude) * 0.15));
  const pressuresSuccessful = Math.round(pressures * (0.25 + tm(player.tackling) / 300));

  const saves = isGK ? Math.round(gamesPlayed * (2.5 + fa(player.def) * 0.02)) : 0;
  const cleanSheets = isGK ? Math.round(gamesPlayed * (0.15 + fa(player.def) / 500)) : 0;
  const goalsConceded = isGK ? Math.round(gamesPlayed * 1.2 - cleanSheets * 1.2) : 0;
  const penaltySaves = isGK && h(14) > 70 ? 1 : 0;

  // Last 5 match ratings: based on form + reliability + small variance
  const formBase = player.form / 10; // 0-10 scale roughly
  const relBase = player.reliability / 20; // 0-1
  const last5Ratings: number[] = [];
  for (let i = 0; i < 5; i++) {
    const noise = ((h(20 + i) % 30) - 15) / 10; // ±1.5
    const dampening = relBase * 0.6 + 0.4; // high reliability = less noise
    const rating = clamp(formBase + noise * (1 - dampening), 1, 10);
    last5Ratings.push(Math.round(rating * 10) / 10);
  }

  return {
    appearances: gamesPlayed,
    minutesPlayed,
    starts: Math.round(gamesPlayed * (0.7 + h(15) % 30 / 100)),
    goals, assists, shots, shotsOnTarget, xG, xA, bigChancesCreated,
    passesAttempted, passesCompleted, keyPasses, throughBalls, longBallsAccurate,
    crossesAttempted, crossesCompleted,
    touches, dribbleAttempts, dribbleSuccessful, ballRecoveries, dispossessed,
    tackles, tacklesWon, interceptions, clearances, blocks,
    aerialDuelsWon, aerialDuelsLost, groundDuelsWon, groundDuelsLost,
    foulsCommitted, foulsWon, yellowCards, redCards,
    pressures, pressuresSuccessful,
    saves, cleanSheets, goalsConceded, penaltySaves,
    last5Ratings,
  };
}
