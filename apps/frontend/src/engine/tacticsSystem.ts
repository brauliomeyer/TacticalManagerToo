/* ═══════════════════════════════════════════════════════════════════
   ADVANCED TACTICAL SYSTEM
   Formation, style, player roles, team instructions, presets,
   tactic counters, and auto-substitution rules.
   Pure logic — no React or DOM dependencies.
   ═══════════════════════════════════════════════════════════════════ */

// ────────────────────────────────────────────
// 1. TYPES
// ────────────────────────────────────────────

export type FormationId = '4-3-3' | '4-2-3-1' | '4-4-2' | '3-5-2' | '5-3-2' | '4-1-4-1' | '4-4-1-1' | '3-4-3' | '4-5-1' | '4-3-2-1';

export type TacticStyleId =
  | 'tiki-taka'
  | 'gegenpress'
  | 'counter-attack'
  | 'long-ball'
  | 'defensive-block'
  | 'balanced'
  | 'ajax-school'
  | 'deutsche-schule'
  | 'catenaccio'
  | 'park-the-bus'
  | 'wing-play'
  | 'bielsa-ball'
  | 'fluid-counter'
  | 'route-one';

export type PlayerRole =
  | 'Goalkeeper'
  | 'Ball Playing Defender'
  | 'Stopper'
  | 'Full Back'
  | 'Wing Back'
  | 'Inverted Wing Back'
  | 'Anchor'
  | 'Box-to-Box'
  | 'Playmaker'
  | 'Mezzala'
  | 'Winger'
  | 'Inverted Winger'
  | 'Inside Forward'
  | 'Target Man'
  | 'False 9'
  | 'Poacher'
  | 'Advanced Forward'
  | 'Deep Lying Playmaker'
  | 'Trequartista'
  | 'Defensive Midfielder';

export type Mentality = 'Defensive' | 'Balanced' | 'Attacking';

export interface TeamInstructions {
  passing: number;       // 0 (short) … 100 (long)
  tempo: number;         // 0 (slow)  … 100 (fast)
  width: number;         // 0 (narrow) … 100 (wide)
  pressing: number;      // 0 (low)   … 100 (high)
  defensiveLine: number; // 0 (deep)  … 100 (high)
  tackling: number;      // 0 (soft)  … 100 (aggressive)
  mentality: Mentality;
}

export interface FormationSlot {
  id: string;             // e.g. 'gk', 'lb', 'cb1', 'cb2', 'rb', 'cm1', 'cm2', 'cm3', 'lw', 'st', 'rw'
  label: string;          // display label
  posX: number;           // 0..100 (left to right on pitch)
  posY: number;           // 0..100 (top to bottom)
  defaultRole: PlayerRole;
  assignedRole: PlayerRole;
}

export interface AutoSubRule {
  id: string;
  condition: 'losing' | 'winning' | 'drawing' | 'minute' | 'red_card' | 'injury';
  conditionValue?: number;   // e.g. minute 60
  outSlotId: string;         // formation slot id to sub out
  inPlayerIndex: number;     // bench index
  enabled: boolean;
}

export interface FullTactic {
  id: string;
  name: string;
  styleId: TacticStyleId;
  formation: FormationId;
  slots: FormationSlot[];
  instructions: TeamInstructions;
  offensiveRuns: OffensiveRun[];
  defensiveRuns: DefensiveRun[];
  autoSubRules: AutoSubRule[];
  isPreset: boolean;
}

// ────────────────────────────────────────────
// 2. FORMATION DEFINITIONS
// ────────────────────────────────────────────

export interface FormationDef {
  id: FormationId;
  label: string;
  slots: { id: string; label: string; posX: number; posY: number; defaultRole: PlayerRole }[];
}

export const FORMATIONS: Record<FormationId, FormationDef> = {
  '4-3-3': {
    id: '4-3-3',
    label: '4-3-3',
    slots: [
      { id: 'gk', label: 'GK', posX: 50, posY: 92, defaultRole: 'Goalkeeper' },
      { id: 'lb', label: 'LB', posX: 15, posY: 75, defaultRole: 'Full Back' },
      { id: 'cb1', label: 'CB', posX: 37, posY: 78, defaultRole: 'Stopper' },
      { id: 'cb2', label: 'CB', posX: 63, posY: 78, defaultRole: 'Ball Playing Defender' },
      { id: 'rb', label: 'RB', posX: 85, posY: 75, defaultRole: 'Full Back' },
      { id: 'cm1', label: 'CM', posX: 30, posY: 55, defaultRole: 'Box-to-Box' },
      { id: 'cm2', label: 'CM', posX: 50, posY: 50, defaultRole: 'Playmaker' },
      { id: 'cm3', label: 'CM', posX: 70, posY: 55, defaultRole: 'Box-to-Box' },
      { id: 'lw', label: 'LW', posX: 15, posY: 25, defaultRole: 'Winger' },
      { id: 'st', label: 'ST', posX: 50, posY: 15, defaultRole: 'Advanced Forward' },
      { id: 'rw', label: 'RW', posX: 85, posY: 25, defaultRole: 'Winger' },
    ],
  },
  '4-2-3-1': {
    id: '4-2-3-1',
    label: '4-2-3-1',
    slots: [
      { id: 'gk', label: 'GK', posX: 50, posY: 92, defaultRole: 'Goalkeeper' },
      { id: 'lb', label: 'LB', posX: 15, posY: 75, defaultRole: 'Full Back' },
      { id: 'cb1', label: 'CB', posX: 37, posY: 78, defaultRole: 'Stopper' },
      { id: 'cb2', label: 'CB', posX: 63, posY: 78, defaultRole: 'Ball Playing Defender' },
      { id: 'rb', label: 'RB', posX: 85, posY: 75, defaultRole: 'Full Back' },
      { id: 'dm1', label: 'DM', posX: 37, posY: 58, defaultRole: 'Anchor' },
      { id: 'dm2', label: 'DM', posX: 63, posY: 58, defaultRole: 'Deep Lying Playmaker' },
      { id: 'lm', label: 'LM', posX: 18, posY: 38, defaultRole: 'Winger' },
      { id: 'am', label: 'AM', posX: 50, posY: 35, defaultRole: 'Trequartista' },
      { id: 'rm', label: 'RM', posX: 82, posY: 38, defaultRole: 'Inverted Winger' },
      { id: 'st', label: 'ST', posX: 50, posY: 15, defaultRole: 'Advanced Forward' },
    ],
  },
  '4-4-2': {
    id: '4-4-2',
    label: '4-4-2',
    slots: [
      { id: 'gk', label: 'GK', posX: 50, posY: 92, defaultRole: 'Goalkeeper' },
      { id: 'lb', label: 'LB', posX: 15, posY: 75, defaultRole: 'Full Back' },
      { id: 'cb1', label: 'CB', posX: 37, posY: 78, defaultRole: 'Stopper' },
      { id: 'cb2', label: 'CB', posX: 63, posY: 78, defaultRole: 'Ball Playing Defender' },
      { id: 'rb', label: 'RB', posX: 85, posY: 75, defaultRole: 'Full Back' },
      { id: 'lm', label: 'LM', posX: 15, posY: 50, defaultRole: 'Winger' },
      { id: 'cm1', label: 'CM', posX: 37, posY: 53, defaultRole: 'Box-to-Box' },
      { id: 'cm2', label: 'CM', posX: 63, posY: 53, defaultRole: 'Playmaker' },
      { id: 'rm', label: 'RM', posX: 85, posY: 50, defaultRole: 'Winger' },
      { id: 'st1', label: 'ST', posX: 38, posY: 18, defaultRole: 'Target Man' },
      { id: 'st2', label: 'ST', posX: 62, posY: 18, defaultRole: 'Poacher' },
    ],
  },
  '3-5-2': {
    id: '3-5-2',
    label: '3-5-2',
    slots: [
      { id: 'gk', label: 'GK', posX: 50, posY: 92, defaultRole: 'Goalkeeper' },
      { id: 'cb1', label: 'CB', posX: 28, posY: 78, defaultRole: 'Ball Playing Defender' },
      { id: 'cb2', label: 'CB', posX: 50, posY: 80, defaultRole: 'Stopper' },
      { id: 'cb3', label: 'CB', posX: 72, posY: 78, defaultRole: 'Ball Playing Defender' },
      { id: 'lwb', label: 'LWB', posX: 10, posY: 55, defaultRole: 'Wing Back' },
      { id: 'cm1', label: 'CM', posX: 33, posY: 52, defaultRole: 'Box-to-Box' },
      { id: 'cm2', label: 'CM', posX: 50, posY: 48, defaultRole: 'Playmaker' },
      { id: 'cm3', label: 'CM', posX: 67, posY: 52, defaultRole: 'Mezzala' },
      { id: 'rwb', label: 'RWB', posX: 90, posY: 55, defaultRole: 'Wing Back' },
      { id: 'st1', label: 'ST', posX: 38, posY: 18, defaultRole: 'Target Man' },
      { id: 'st2', label: 'ST', posX: 62, posY: 18, defaultRole: 'Advanced Forward' },
    ],
  },
  '5-3-2': {
    id: '5-3-2',
    label: '5-3-2',
    slots: [
      { id: 'gk', label: 'GK', posX: 50, posY: 92, defaultRole: 'Goalkeeper' },
      { id: 'lwb', label: 'LWB', posX: 10, posY: 70, defaultRole: 'Wing Back' },
      { id: 'cb1', label: 'CB', posX: 28, posY: 78, defaultRole: 'Ball Playing Defender' },
      { id: 'cb2', label: 'CB', posX: 50, posY: 80, defaultRole: 'Stopper' },
      { id: 'cb3', label: 'CB', posX: 72, posY: 78, defaultRole: 'Ball Playing Defender' },
      { id: 'rwb', label: 'RWB', posX: 90, posY: 70, defaultRole: 'Wing Back' },
      { id: 'cm1', label: 'CM', posX: 30, posY: 50, defaultRole: 'Box-to-Box' },
      { id: 'cm2', label: 'CM', posX: 50, posY: 45, defaultRole: 'Playmaker' },
      { id: 'cm3', label: 'CM', posX: 70, posY: 50, defaultRole: 'Defensive Midfielder' },
      { id: 'st1', label: 'ST', posX: 38, posY: 18, defaultRole: 'Target Man' },
      { id: 'st2', label: 'ST', posX: 62, posY: 18, defaultRole: 'Poacher' },
    ],
  },
  '4-1-4-1': {
    id: '4-1-4-1',
    label: '4-1-4-1',
    slots: [
      { id: 'gk', label: 'GK', posX: 50, posY: 92, defaultRole: 'Goalkeeper' },
      { id: 'lb', label: 'LB', posX: 15, posY: 75, defaultRole: 'Full Back' },
      { id: 'cb1', label: 'CB', posX: 37, posY: 78, defaultRole: 'Stopper' },
      { id: 'cb2', label: 'CB', posX: 63, posY: 78, defaultRole: 'Ball Playing Defender' },
      { id: 'rb', label: 'RB', posX: 85, posY: 75, defaultRole: 'Full Back' },
      { id: 'dm', label: 'DM', posX: 50, posY: 60, defaultRole: 'Anchor' },
      { id: 'lm', label: 'LM', posX: 15, posY: 42, defaultRole: 'Inside Forward' },
      { id: 'cm1', label: 'CM', posX: 37, posY: 45, defaultRole: 'Box-to-Box' },
      { id: 'cm2', label: 'CM', posX: 63, posY: 45, defaultRole: 'Mezzala' },
      { id: 'rm', label: 'RM', posX: 85, posY: 42, defaultRole: 'Inverted Winger' },
      { id: 'st', label: 'ST', posX: 50, posY: 15, defaultRole: 'Advanced Forward' },
    ],
  },
  '4-4-1-1': {
    id: '4-4-1-1',
    label: '4-4-1-1',
    slots: [
      { id: 'gk', label: 'GK', posX: 50, posY: 92, defaultRole: 'Goalkeeper' },
      { id: 'lb', label: 'LB', posX: 15, posY: 75, defaultRole: 'Full Back' },
      { id: 'cb1', label: 'CB', posX: 37, posY: 78, defaultRole: 'Stopper' },
      { id: 'cb2', label: 'CB', posX: 63, posY: 78, defaultRole: 'Ball Playing Defender' },
      { id: 'rb', label: 'RB', posX: 85, posY: 75, defaultRole: 'Full Back' },
      { id: 'lm', label: 'LM', posX: 15, posY: 50, defaultRole: 'Winger' },
      { id: 'cm1', label: 'CM', posX: 37, posY: 53, defaultRole: 'Box-to-Box' },
      { id: 'cm2', label: 'CM', posX: 63, posY: 53, defaultRole: 'Playmaker' },
      { id: 'rm', label: 'RM', posX: 85, posY: 50, defaultRole: 'Winger' },
      { id: 'ss', label: 'SS', posX: 50, posY: 30, defaultRole: 'Trequartista' },
      { id: 'st', label: 'ST', posX: 50, posY: 15, defaultRole: 'Advanced Forward' },
    ],
  },
  '3-4-3': {
    id: '3-4-3',
    label: '3-4-3',
    slots: [
      { id: 'gk', label: 'GK', posX: 50, posY: 92, defaultRole: 'Goalkeeper' },
      { id: 'cb1', label: 'CB', posX: 28, posY: 78, defaultRole: 'Ball Playing Defender' },
      { id: 'cb2', label: 'CB', posX: 50, posY: 80, defaultRole: 'Stopper' },
      { id: 'cb3', label: 'CB', posX: 72, posY: 78, defaultRole: 'Ball Playing Defender' },
      { id: 'lwb', label: 'LWB', posX: 10, posY: 52, defaultRole: 'Wing Back' },
      { id: 'cm1', label: 'CM', posX: 37, posY: 50, defaultRole: 'Box-to-Box' },
      { id: 'cm2', label: 'CM', posX: 63, posY: 50, defaultRole: 'Playmaker' },
      { id: 'rwb', label: 'RWB', posX: 90, posY: 52, defaultRole: 'Wing Back' },
      { id: 'lw', label: 'LW', posX: 18, posY: 22, defaultRole: 'Inside Forward' },
      { id: 'st', label: 'ST', posX: 50, posY: 15, defaultRole: 'Advanced Forward' },
      { id: 'rw', label: 'RW', posX: 82, posY: 22, defaultRole: 'Inside Forward' },
    ],
  },
  '4-5-1': {
    id: '4-5-1',
    label: '4-5-1',
    slots: [
      { id: 'gk', label: 'GK', posX: 50, posY: 92, defaultRole: 'Goalkeeper' },
      { id: 'lb', label: 'LB', posX: 15, posY: 75, defaultRole: 'Full Back' },
      { id: 'cb1', label: 'CB', posX: 37, posY: 78, defaultRole: 'Stopper' },
      { id: 'cb2', label: 'CB', posX: 63, posY: 78, defaultRole: 'Ball Playing Defender' },
      { id: 'rb', label: 'RB', posX: 85, posY: 75, defaultRole: 'Full Back' },
      { id: 'lm', label: 'LM', posX: 12, posY: 48, defaultRole: 'Winger' },
      { id: 'cm1', label: 'CM', posX: 33, posY: 52, defaultRole: 'Box-to-Box' },
      { id: 'dm', label: 'DM', posX: 50, posY: 58, defaultRole: 'Anchor' },
      { id: 'cm2', label: 'CM', posX: 67, posY: 52, defaultRole: 'Playmaker' },
      { id: 'rm', label: 'RM', posX: 88, posY: 48, defaultRole: 'Winger' },
      { id: 'st', label: 'ST', posX: 50, posY: 15, defaultRole: 'Target Man' },
    ],
  },
  '4-3-2-1': {
    id: '4-3-2-1',
    label: '4-3-2-1',
    slots: [
      { id: 'gk', label: 'GK', posX: 50, posY: 92, defaultRole: 'Goalkeeper' },
      { id: 'lb', label: 'LB', posX: 15, posY: 75, defaultRole: 'Full Back' },
      { id: 'cb1', label: 'CB', posX: 37, posY: 78, defaultRole: 'Stopper' },
      { id: 'cb2', label: 'CB', posX: 63, posY: 78, defaultRole: 'Ball Playing Defender' },
      { id: 'rb', label: 'RB', posX: 85, posY: 75, defaultRole: 'Full Back' },
      { id: 'cm1', label: 'CM', posX: 30, posY: 55, defaultRole: 'Box-to-Box' },
      { id: 'cm2', label: 'CM', posX: 50, posY: 50, defaultRole: 'Deep Lying Playmaker' },
      { id: 'cm3', label: 'CM', posX: 70, posY: 55, defaultRole: 'Mezzala' },
      { id: 'am1', label: 'AM', posX: 35, posY: 33, defaultRole: 'Trequartista' },
      { id: 'am2', label: 'AM', posX: 65, posY: 33, defaultRole: 'Inside Forward' },
      { id: 'st', label: 'ST', posX: 50, posY: 15, defaultRole: 'Advanced Forward' },
    ],
  },
};

// ────────────────────────────────────────────
// 3. PRESET TACTICS
// ────────────────────────────────────────────

export type OffensiveRun =
  | 'overlap-runs'        // fullbacks/wingbacks overlap on the wing
  | 'underlap-runs'       // fullbacks cut inside behind midfield
  | 'runs-behind'         // strikers run behind the defensive line
  | 'channel-runs'        // forwards exploit gaps between CB and FB
  | 'third-man-runs'      // midfielder runs beyond the striker
  | 'switch-play'         // quick ball movement from one flank to the other
  | 'inside-forward-cut'  // wingers cut inside onto their strong foot
  | 'false-9-drop'        // striker drops deep, pulling CBs out of position
  | 'wing-rotation'       // wingers and fullbacks rotate positions
  | 'central-overload';   // overload the centre of the pitch

export type DefensiveRun =
  | 'press-triggers'      // immediate counter-press when losing ball
  | 'drop-deep'           // entire team retreats into own half
  | 'compact-shape'       // tighten gaps between lines (max 25m)
  | 'cover-shadow'        // cut passing lanes while pressing
  | 'recovery-runs'       // midfielders sprint back to fill gaps
  | 'high-trap'           // play offside trap with high defensive line
  | 'low-block'           // sit deep in two banks of four
  | 'pressing-wedge'      // press in groups of 2-3 to isolate opponent
  | 'transition-press'    // press immediately during opponent's transition
  | 'man-mark-striker';   // one CB man-marks the striker

export interface TacticPreset {
  id: TacticStyleId;
  name: string;
  description: string;
  icon: string;
  formation: FormationId;
  instructions: TeamInstructions;
  roleOverrides: Record<string, PlayerRole>;
  offensiveRuns: OffensiveRun[];
  defensiveRuns: DefensiveRun[];
}

export const TACTIC_PRESETS: TacticPreset[] = [
  {
    id: 'tiki-taka',
    name: 'Tiki-Taka',
    description: 'Possession-based football with short passing, high tempo, and positional play. Man City / Barcelona style.',
    icon: '🎯',
    formation: '4-3-3',
    instructions: {
      passing: 15, tempo: 80, width: 70, pressing: 75,
      defensiveLine: 72, tackling: 40, mentality: 'Attacking',
    },
    roleOverrides: {
      lb: 'Inverted Wing Back', rb: 'Inverted Wing Back',
      cm1: 'Mezzala', cm2: 'Playmaker', cm3: 'Mezzala',
      lw: 'Inside Forward', rw: 'Inside Forward', st: 'False 9',
    },
    offensiveRuns: ['inside-forward-cut', 'false-9-drop', 'third-man-runs', 'central-overload', 'wing-rotation'],
    defensiveRuns: ['press-triggers', 'cover-shadow', 'compact-shape', 'recovery-runs'],
  },
  {
    id: 'gegenpress',
    name: 'Gegenpress',
    description: 'Intense high pressing. Win the ball back immediately after losing it. Klopp-style heavy metal football.',
    icon: '⚡',
    formation: '4-3-3',
    instructions: {
      passing: 45, tempo: 90, width: 60, pressing: 95,
      defensiveLine: 80, tackling: 78, mentality: 'Attacking',
    },
    roleOverrides: {
      cm1: 'Box-to-Box', cm2: 'Box-to-Box', cm3: 'Box-to-Box',
      lw: 'Inside Forward', rw: 'Inside Forward', st: 'Poacher',
    },
    offensiveRuns: ['runs-behind', 'channel-runs', 'third-man-runs', 'overlap-runs'],
    defensiveRuns: ['press-triggers', 'transition-press', 'pressing-wedge', 'high-trap', 'recovery-runs'],
  },
  {
    id: 'counter-attack',
    name: 'Counter Attack',
    description: 'Absorb pressure, then hit fast on the break. Lethal on transitions.',
    icon: '🏃',
    formation: '4-4-2',
    instructions: {
      passing: 60, tempo: 55, width: 50, pressing: 30,
      defensiveLine: 30, tackling: 60, mentality: 'Balanced',
    },
    roleOverrides: {
      lm: 'Winger', rm: 'Winger',
      cm1: 'Anchor', cm2: 'Deep Lying Playmaker',
      st1: 'Poacher', st2: 'Advanced Forward',
    },
    offensiveRuns: ['runs-behind', 'channel-runs', 'switch-play', 'overlap-runs'],
    defensiveRuns: ['drop-deep', 'compact-shape', 'recovery-runs', 'transition-press'],
  },
  {
    id: 'long-ball',
    name: 'Long Ball',
    description: 'Direct play. Bypass the midfield and launch balls to target men. Physical, aerial dominance.',
    icon: '🚀',
    formation: '4-4-2',
    instructions: {
      passing: 90, tempo: 70, width: 55, pressing: 45,
      defensiveLine: 40, tackling: 70, mentality: 'Balanced',
    },
    roleOverrides: {
      cb1: 'Ball Playing Defender', cb2: 'Stopper',
      cm1: 'Box-to-Box', cm2: 'Box-to-Box',
      st1: 'Target Man', st2: 'Poacher',
    },
    offensiveRuns: ['runs-behind', 'channel-runs', 'overlap-runs'],
    defensiveRuns: ['compact-shape', 'recovery-runs', 'drop-deep'],
  },
  {
    id: 'defensive-block',
    name: 'Defensive Block',
    description: 'Compact, deep defensive shape. Deny space and hit on rare openings. Park the bus.',
    icon: '🛡️',
    formation: '5-3-2',
    instructions: {
      passing: 50, tempo: 30, width: 35, pressing: 20,
      defensiveLine: 18, tackling: 55, mentality: 'Defensive',
    },
    roleOverrides: {
      cb2: 'Stopper',
      cm1: 'Defensive Midfielder', cm2: 'Anchor', cm3: 'Box-to-Box',
      st1: 'Target Man', st2: 'Poacher',
    },
    offensiveRuns: ['runs-behind', 'channel-runs'],
    defensiveRuns: ['low-block', 'drop-deep', 'compact-shape', 'man-mark-striker', 'recovery-runs'],
  },
  {
    id: 'balanced',
    name: 'Balanced',
    description: 'Solid all-round approach. No extremes — reliable foundation to build from.',
    icon: '⚖️',
    formation: '4-3-3',
    instructions: {
      passing: 50, tempo: 50, width: 50, pressing: 50,
      defensiveLine: 50, tackling: 50, mentality: 'Balanced',
    },
    roleOverrides: {},
    offensiveRuns: ['overlap-runs', 'runs-behind', 'switch-play'],
    defensiveRuns: ['compact-shape', 'recovery-runs', 'press-triggers'],
  },  {
    id: 'ajax-school',
    name: 'Ajax-School',
    description: 'Total Football \u00e0 la Cruyff. 4-3-3 with interchangeable positions, wingers cutting inside, fullbacks pushing up, high line, fearless attacking. The Amsterdam way.',
    icon: '\ud83c\uddf3\ud83c\uddf1',
    formation: '4-3-3',
    instructions: {
      passing: 20, tempo: 75, width: 75, pressing: 82,
      defensiveLine: 78, tackling: 45, mentality: 'Attacking',
    },
    roleOverrides: {
      lb: 'Wing Back', rb: 'Wing Back',
      cb1: 'Ball Playing Defender', cb2: 'Ball Playing Defender',
      cm1: 'Box-to-Box', cm2: 'Playmaker', cm3: 'Mezzala',
      lw: 'Inside Forward', rw: 'Inside Forward', st: 'False 9',
    },
    offensiveRuns: ['overlap-runs', 'inside-forward-cut', 'false-9-drop', 'wing-rotation', 'third-man-runs', 'central-overload'],
    defensiveRuns: ['press-triggers', 'high-trap', 'cover-shadow', 'transition-press', 'recovery-runs'],
  },
  {
    id: 'deutsche-schule',
    name: 'Deutsche Schule',
    description: 'German efficiency. Disciplined pressing, direct vertical play, powerful midfield, clinical finishing. Ordnung muss sein.',
    icon: '\ud83c\udde9\ud83c\uddea',
    formation: '4-2-3-1',
    instructions: {
      passing: 55, tempo: 72, width: 58, pressing: 78,
      defensiveLine: 62, tackling: 68, mentality: 'Balanced',
    },
    roleOverrides: {
      dm1: 'Anchor', dm2: 'Box-to-Box',
      lm: 'Winger', rm: 'Inside Forward',
      am: 'Playmaker', st: 'Advanced Forward',
    },
    offensiveRuns: ['underlap-runs', 'runs-behind', 'channel-runs', 'third-man-runs', 'switch-play'],
    defensiveRuns: ['pressing-wedge', 'transition-press', 'compact-shape', 'cover-shadow', 'recovery-runs'],
  },
  {
    id: 'catenaccio',
    name: 'Catenaccio',
    description: 'Italian ultra-defense. Chain defense with sweeper, compact shape, minimal risk, lethal on the counter. La porta \u00e8 chiusa.',
    icon: '\ud83c\uddee\ud83c\uddf9',
    formation: '5-3-2',
    instructions: {
      passing: 45, tempo: 25, width: 30, pressing: 15,
      defensiveLine: 12, tackling: 62, mentality: 'Defensive',
    },
    roleOverrides: {
      cb2: 'Stopper',
      cb1: 'Ball Playing Defender', cb3: 'Stopper',
      cm1: 'Defensive Midfielder', cm2: 'Anchor', cm3: 'Deep Lying Playmaker',
      st1: 'Target Man', st2: 'Poacher',
    },
    offensiveRuns: ['runs-behind', 'channel-runs'],
    defensiveRuns: ['low-block', 'drop-deep', 'compact-shape', 'man-mark-striker', 'recovery-runs', 'cover-shadow'],
  },
  {
    id: 'park-the-bus',
    name: 'Park the Bus',
    description: 'Mourinho ultra-defense. Two rigid banks, no space, no mercy. Frustrate opponents and steal it on the break. The anti-football masterclass.',
    icon: '🚌',
    formation: '4-5-1',
    instructions: {
      passing: 55, tempo: 20, width: 28, pressing: 12,
      defensiveLine: 10, tackling: 65, mentality: 'Defensive',
    },
    roleOverrides: {
      lb: 'Full Back', rb: 'Full Back',
      lm: 'Winger', rm: 'Winger',
      cm1: 'Defensive Midfielder', dm: 'Anchor', cm2: 'Defensive Midfielder',
      st: 'Target Man',
    },
    offensiveRuns: ['runs-behind', 'channel-runs'],
    defensiveRuns: ['low-block', 'drop-deep', 'compact-shape', 'man-mark-striker', 'recovery-runs', 'cover-shadow'],
  },
  {
    id: 'wing-play',
    name: 'Wing Play',
    description: 'Classic British wing play. Overlapping fullbacks, whipped crosses, aerial dominance in the box. The flanks are everything.',
    icon: '🦅',
    formation: '4-4-2',
    instructions: {
      passing: 60, tempo: 65, width: 90, pressing: 55,
      defensiveLine: 50, tackling: 58, mentality: 'Attacking',
    },
    roleOverrides: {
      lb: 'Wing Back', rb: 'Wing Back',
      lm: 'Winger', rm: 'Winger',
      cm1: 'Box-to-Box', cm2: 'Playmaker',
      st1: 'Target Man', st2: 'Poacher',
    },
    offensiveRuns: ['overlap-runs', 'channel-runs', 'runs-behind', 'switch-play', 'wing-rotation'],
    defensiveRuns: ['compact-shape', 'recovery-runs', 'press-triggers', 'drop-deep'],
  },
  {
    id: 'bielsa-ball',
    name: 'Bielsa Ball',
    description: 'El Loco\'s 3-3-1-3 madness. Man-marking everywhere, vertical passes, relentless energy. Beautiful chaos.',
    icon: '🔥',
    formation: '3-4-3',
    instructions: {
      passing: 35, tempo: 88, width: 72, pressing: 92,
      defensiveLine: 85, tackling: 72, mentality: 'Attacking',
    },
    roleOverrides: {
      cb1: 'Ball Playing Defender', cb2: 'Stopper', cb3: 'Ball Playing Defender',
      lwb: 'Wing Back', rwb: 'Wing Back',
      cm1: 'Box-to-Box', cm2: 'Playmaker',
      lw: 'Inside Forward', rw: 'Inside Forward', st: 'Advanced Forward',
    },
    offensiveRuns: ['overlap-runs', 'runs-behind', 'third-man-runs', 'central-overload', 'inside-forward-cut', 'channel-runs'],
    defensiveRuns: ['press-triggers', 'man-mark-striker', 'high-trap', 'transition-press', 'pressing-wedge', 'recovery-runs'],
  },
  {
    id: 'fluid-counter',
    name: 'Fluid Counter',
    description: 'Modern counter-attacking masterclass. Compact in defence, devastating on the break. Vardy\'s Leicester / Ancelotti\'s Real Madrid.',
    icon: '⚡',
    formation: '4-2-3-1',
    instructions: {
      passing: 55, tempo: 70, width: 55, pressing: 40,
      defensiveLine: 35, tackling: 55, mentality: 'Balanced',
    },
    roleOverrides: {
      dm1: 'Anchor', dm2: 'Deep Lying Playmaker',
      lm: 'Winger', rm: 'Inside Forward',
      am: 'Trequartista', st: 'Poacher',
    },
    offensiveRuns: ['runs-behind', 'channel-runs', 'switch-play', 'inside-forward-cut', 'third-man-runs'],
    defensiveRuns: ['drop-deep', 'compact-shape', 'transition-press', 'recovery-runs', 'cover-shadow'],
  },
  {
    id: 'route-one',
    name: 'Route One',
    description: 'Classic English direct football. Win it, launch it, head it, score. No nonsense, big men up top, second balls.',
    icon: '🎯',
    formation: '4-4-2',
    instructions: {
      passing: 95, tempo: 65, width: 50, pressing: 50,
      defensiveLine: 38, tackling: 72, mentality: 'Balanced',
    },
    roleOverrides: {
      cb1: 'Stopper', cb2: 'Stopper',
      cm1: 'Box-to-Box', cm2: 'Box-to-Box',
      lm: 'Winger', rm: 'Winger',
      st1: 'Target Man', st2: 'Poacher',
    },
    offensiveRuns: ['runs-behind', 'channel-runs', 'overlap-runs'],
    defensiveRuns: ['compact-shape', 'recovery-runs', 'drop-deep', 'man-mark-striker'],
  },
];

// ────────────────────────────────────────────
// 4. ROLE DEFINITIONS & ALLOWED ROLES PER SLOT
// ────────────────────────────────────────────

/** Which roles are allowed for each type of slot. */
const SLOT_ALLOWED_ROLES: Record<string, PlayerRole[]> = {
  gk: ['Goalkeeper'],
  lb: ['Full Back', 'Wing Back', 'Inverted Wing Back'],
  rb: ['Full Back', 'Wing Back', 'Inverted Wing Back'],
  lwb: ['Wing Back', 'Inverted Wing Back', 'Full Back'],
  rwb: ['Wing Back', 'Inverted Wing Back', 'Full Back'],
  cb1: ['Stopper', 'Ball Playing Defender'],
  cb2: ['Stopper', 'Ball Playing Defender'],
  cb3: ['Stopper', 'Ball Playing Defender'],
  dm: ['Anchor', 'Deep Lying Playmaker', 'Defensive Midfielder'],
  dm1: ['Anchor', 'Deep Lying Playmaker', 'Defensive Midfielder'],
  dm2: ['Anchor', 'Deep Lying Playmaker', 'Defensive Midfielder'],
  cm1: ['Box-to-Box', 'Playmaker', 'Mezzala', 'Anchor', 'Deep Lying Playmaker', 'Defensive Midfielder'],
  cm2: ['Playmaker', 'Box-to-Box', 'Mezzala', 'Anchor', 'Deep Lying Playmaker', 'Defensive Midfielder'],
  cm3: ['Box-to-Box', 'Mezzala', 'Playmaker', 'Anchor'],
  am: ['Trequartista', 'Playmaker', 'Mezzala'],
  lm: ['Winger', 'Inside Forward', 'Inverted Winger'],
  rm: ['Winger', 'Inside Forward', 'Inverted Winger'],
  lw: ['Winger', 'Inside Forward', 'Inverted Winger'],
  rw: ['Winger', 'Inside Forward', 'Inverted Winger'],
  st: ['Advanced Forward', 'Poacher', 'Target Man', 'False 9'],
  st1: ['Target Man', 'Advanced Forward', 'Poacher', 'False 9'],
  st2: ['Poacher', 'Advanced Forward', 'Target Man', 'False 9'],
  ss: ['Trequartista', 'Advanced Forward', 'False 9', 'Poacher'],
  am1: ['Trequartista', 'Playmaker', 'Mezzala', 'Inside Forward'],
  am2: ['Trequartista', 'Playmaker', 'Mezzala', 'Inside Forward'],
};

export function getAllowedRoles(slotId: string): PlayerRole[] {
  return SLOT_ALLOWED_ROLES[slotId] ?? ['Box-to-Box'];
}

// ────────────────────────────────────────────
// 5. TACTIC CREATION / HELPERS
// ────────────────────────────────────────────

export function createTacticFromPreset(preset: TacticPreset): FullTactic {
  const formDef = FORMATIONS[preset.formation];
  const slots: FormationSlot[] = formDef.slots.map((s) => ({
    ...s,
    assignedRole: preset.roleOverrides[s.id] ?? s.defaultRole,
  }));
  return {
    id: `preset-${preset.id}`,
    name: preset.name,
    styleId: preset.id,
    formation: preset.formation,
    slots,
    instructions: { ...preset.instructions },
    offensiveRuns: [...preset.offensiveRuns],
    defensiveRuns: [...preset.defensiveRuns],
    autoSubRules: [],
    isPreset: true,
  };
}

export function createCustomTactic(formation: FormationId, name: string): FullTactic {
  const formDef = FORMATIONS[formation];
  const slots: FormationSlot[] = formDef.slots.map((s) => ({
    ...s,
    assignedRole: s.defaultRole,
  }));
  return {
    id: `custom-${Date.now()}`,
    name,
    styleId: 'balanced',
    formation,
    slots,
    instructions: {
      passing: 50, tempo: 50, width: 50, pressing: 50,
      defensiveLine: 50, tackling: 50, mentality: 'Balanced',
    },
    offensiveRuns: ['overlap-runs', 'runs-behind', 'switch-play'],
    defensiveRuns: ['compact-shape', 'recovery-runs', 'press-triggers'],
    autoSubRules: [],
    isPreset: false,
  };
}

export function changeFormation(tactic: FullTactic, newFormation: FormationId): FullTactic {
  const formDef = FORMATIONS[newFormation];
  const slots: FormationSlot[] = formDef.slots.map((s) => ({
    ...s,
    assignedRole: s.defaultRole,
  }));
  return { ...tactic, formation: newFormation, slots, isPreset: false };
}

// ────────────────────────────────────────────
// 6. TACTIC → MATCH MODIFIERS
// ────────────────────────────────────────────

export interface TacticModifiers {
  possessionMod: number;       // -15 … +15
  attackMod: number;           // -15 … +15
  defenseMod: number;          // -15 … +15
  shotQualityMod: number;      // -10 … +10
  chanceCreationMod: number;   // -10 … +10
  fatigueMod: number;          // 0.8 … 1.3 (multiplier on stamina drain)
  foulRiskMod: number;         // 0.7 … 1.5
  counterAttackMod: number;    // 0 … +12 (bonus on counter chances)
}

/** Compute match modifiers from a full tactic. This is the bridge between tactics and match engine. */
export function computeTacticModifiers(tactic: FullTactic): TacticModifiers {
  const inst = tactic.instructions;

  // ── Base modifiers from instructions ──
  // Passing: short → possession++, long → counter++
  const passNorm = (inst.passing - 50) / 50; // -1..1
  const possFromPass = -passNorm * 6;        // short passing → +6 possession
  const counterFromPass = passNorm * 4;       // long passing → +4 counter

  // Tempo: high → attack++, fatigue++
  const tempoNorm = (inst.tempo - 50) / 50;
  const atkFromTempo = tempoNorm * 5;
  const fatigueFromTempo = 1 + tempoNorm * 0.15;

  // Width: wide → chance creation, narrow → shot quality
  const widthNorm = (inst.width - 50) / 50;
  const chanceFromWidth = widthNorm * 4;
  const shotQFromWidth = -widthNorm * 3;

  // Pressing: high → possession recovery, stamina drain, fouls
  const pressNorm = (inst.pressing - 50) / 50;
  const possFromPress = pressNorm * 5;
  const defFromPress = pressNorm * 3;
  const fatigueFromPress = 1 + pressNorm * 0.1;
  const foulsFromPress = 1 + pressNorm * 0.25;

  // Defensive line: high → attack support, risky on counter
  const lineNorm = (inst.defensiveLine - 50) / 50;
  const atkFromLine = lineNorm * 3;
  const defFromLine = -lineNorm * 4; // high line is risky
  const counterVuln = -lineNorm * 5; // opponent counter bonus

  // Tackling
  const tackleNorm = (inst.tackling - 50) / 50;
  const defFromTackle = tackleNorm * 3;
  const foulsFromTackle = 1 + tackleNorm * 0.2;

  // Mentality
  const mentMod = inst.mentality === 'Attacking' ? 1 : inst.mentality === 'Defensive' ? -1 : 0;
  const atkFromMent = mentMod * 5;
  const defFromMent = -mentMod * 4;

  // ── Role bonuses ──
  let roleAtkBonus = 0;
  let roleDefBonus = 0;
  let rolePossBonus = 0;
  let roleChanceBonus = 0;
  let roleShotQBonus = 0;
  let roleCounterBonus = 0;

  for (const slot of tactic.slots) {
    switch (slot.assignedRole) {
      case 'Playmaker': rolePossBonus += 2; roleChanceBonus += 1.5; break;
      case 'Deep Lying Playmaker': rolePossBonus += 2.5; roleDefBonus += 1; break;
      case 'Trequartista': roleChanceBonus += 2.5; roleAtkBonus += 1.5; break;
      case 'Box-to-Box': roleAtkBonus += 1; roleDefBonus += 1; break;
      case 'Mezzala': roleAtkBonus += 1.5; roleChanceBonus += 1; break;
      case 'Anchor': roleDefBonus += 2.5; rolePossBonus += 0.5; break;
      case 'Defensive Midfielder': roleDefBonus += 2; break;
      case 'False 9': roleChanceBonus += 2; rolePossBonus += 1.5; break;
      case 'Target Man': roleShotQBonus += 1.5; roleAtkBonus += 0.5; break;
      case 'Poacher': roleShotQBonus += 2; roleAtkBonus += 1; break;
      case 'Advanced Forward': roleAtkBonus += 2; roleShotQBonus += 1; break;
      case 'Winger': roleChanceBonus += 1.5; roleCounterBonus += 1; break;
      case 'Inside Forward': roleAtkBonus += 1.5; roleShotQBonus += 1; break;
      case 'Inverted Winger': roleChanceBonus += 1; rolePossBonus += 0.5; break;
      case 'Wing Back': roleChanceBonus += 1; roleAtkBonus += 0.5; break;
      case 'Inverted Wing Back': rolePossBonus += 1; roleDefBonus += 0.5; break;
      case 'Ball Playing Defender': rolePossBonus += 1; roleDefBonus += 0.5; break;
      case 'Stopper': roleDefBonus += 1.5; break;
      case 'Full Back': roleDefBonus += 1; break;
      default: break;
    }
  }

  // ── Running line bonuses ──
  // Offensive runs
  const offRuns = new Set(tactic.offensiveRuns ?? []);
  let runAtkBonus = 0;
  let runChanceBonus = 0;
  let runShotQBonus = 0;
  let runCounterBonus = 0;
  let runPossBonus = 0;
  if (offRuns.has('overlap-runs'))       { runChanceBonus += 2; runAtkBonus += 0.5; }
  if (offRuns.has('underlap-runs'))      { runChanceBonus += 1.5; runPossBonus += 0.5; }
  if (offRuns.has('runs-behind'))        { runAtkBonus += 2; runShotQBonus += 1; }
  if (offRuns.has('channel-runs'))       { runAtkBonus += 1.5; runChanceBonus += 1; }
  if (offRuns.has('third-man-runs'))     { runChanceBonus += 2; runAtkBonus += 1; }
  if (offRuns.has('switch-play'))        { runChanceBonus += 1.5; runPossBonus += 1; }
  if (offRuns.has('inside-forward-cut')) { runShotQBonus += 2; runAtkBonus += 1; }
  if (offRuns.has('false-9-drop'))       { runPossBonus += 1.5; runChanceBonus += 1.5; }
  if (offRuns.has('wing-rotation'))      { runChanceBonus += 1.5; runPossBonus += 0.5; }
  if (offRuns.has('central-overload'))   { runAtkBonus += 1.5; runShotQBonus += 1; }

  // Defensive runs
  const defRuns = new Set(tactic.defensiveRuns ?? []);
  let runDefBonus = 0;
  if (defRuns.has('press-triggers'))    { runDefBonus += 1.5; runPossBonus += 1; }
  if (defRuns.has('drop-deep'))         { runDefBonus += 2; runCounterBonus += 1; }
  if (defRuns.has('compact-shape'))     { runDefBonus += 2.5; }
  if (defRuns.has('cover-shadow'))      { runDefBonus += 1.5; runPossBonus += 0.5; }
  if (defRuns.has('recovery-runs'))     { runDefBonus += 1.5; }
  if (defRuns.has('high-trap'))         { runDefBonus += 1; runAtkBonus += 0.5; }
  if (defRuns.has('low-block'))         { runDefBonus += 3; runCounterBonus += 1.5; }
  if (defRuns.has('pressing-wedge'))    { runDefBonus += 1.5; runPossBonus += 1; }
  if (defRuns.has('transition-press'))  { runDefBonus += 1; runCounterBonus += 0.5; }
  if (defRuns.has('man-mark-striker'))  { runDefBonus += 2; }

  // ── Combine ──
  const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
  return {
    possessionMod: clamp(possFromPass + possFromPress + rolePossBonus + runPossBonus, -15, 15),
    attackMod: clamp(atkFromTempo + atkFromLine + atkFromMent + roleAtkBonus + runAtkBonus, -15, 15),
    defenseMod: clamp(defFromPress + defFromLine + defFromTackle + defFromMent + roleDefBonus + runDefBonus, -15, 15),
    shotQualityMod: clamp(shotQFromWidth + roleShotQBonus + runShotQBonus, -10, 10),
    chanceCreationMod: clamp(chanceFromWidth + roleChanceBonus + runChanceBonus, -10, 10),
    fatigueMod: clamp(fatigueFromTempo * fatigueFromPress, 0.8, 1.3),
    foulRiskMod: clamp(foulsFromPress * foulsFromTackle, 0.7, 1.5),
    counterAttackMod: clamp(counterFromPass + roleCounterBonus + counterVuln + runCounterBonus, 0, 12),
  };
}

// ────────────────────────────────────────────
// 7. TACTIC COUNTER SYSTEM
// ────────────────────────────────────────────

/** Returns a modifier (-8 to +8) for how well tacticA counters tacticB. */
export function getTacticCounterBonus(styleA: TacticStyleId, styleB: TacticStyleId): number {
  const counters: Record<string, number> = {
    // [attacker-defender] → bonus for attacker
    'gegenpress-tiki-taka': 4,        // pressing disrupts short passing
    'counter-attack-gegenpress': 5,    // counter exploits high line after press
    'counter-attack-tiki-taka': 3,     // counter vs possession
    'defensive-block-tiki-taka': 2,    // compact block frustrates possession
    'defensive-block-gegenpress': 3,   // deep block vs high press
    'long-ball-defensive-block': 3,    // aerial vs compact defense
    'long-ball-gegenpress': 2,         // bypass the press
    'tiki-taka-long-ball': 5,          // technical superiority
    'tiki-taka-defensive-block': -3,   // struggle vs parked bus
    'gegenpress-counter-attack': -3,   // pressing into counters is risky
    'gegenpress-long-ball': 2,         // press forces mistakes
    'tiki-taka-counter-attack': -2,    // high line exposed
    'balanced-balanced': 0,
    // Ajax-school (Total Football) counters
    'ajax-school-long-ball': 6,
    'ajax-school-defensive-block': -2,
    'ajax-school-balanced': 4,
    'ajax-school-catenaccio': -3,
    'gegenpress-ajax-school': 2,
    'counter-attack-ajax-school': 4,
    // Deutsche Schule counters
    'deutsche-schule-tiki-taka': 3,
    'deutsche-schule-balanced': 3,
    'deutsche-schule-long-ball': 4,
    'deutsche-schule-defensive-block': 2,
    'counter-attack-deutsche-schule': 3,
    'catenaccio-deutsche-schule': 1,
    // Catenaccio counters
    'catenaccio-tiki-taka': 4,
    'catenaccio-gegenpress': 5,
    'catenaccio-ajax-school': 3,
    'long-ball-catenaccio': 2,
    'deutsche-schule-catenaccio': -1,
    'counter-attack-catenaccio': -2,
    // Park the Bus counters
    'park-the-bus-tiki-taka': 3,         // bus frustrates possession
    'park-the-bus-gegenpress': 4,        // deep block negates pressing
    'park-the-bus-ajax-school': 2,       // denies space for total football
    'long-ball-park-the-bus': 4,         // aerial vs compact bus
    'counter-attack-park-the-bus': -1,   // two deep teams cancel out
    'bielsa-ball-park-the-bus': 3,       // intensity breaks the bus
    // Wing Play counters
    'wing-play-defensive-block': 3,      // crosses over compact block
    'wing-play-catenaccio': 2,           // width stretches narrow defence
    'gegenpress-wing-play': 3,           // press prevents crosses
    'tiki-taka-wing-play': 2,            // possession controls wings
    'counter-attack-wing-play': 2,       // counter vs advanced fullbacks
    // Bielsa Ball counters
    'bielsa-ball-balanced': 4,           // intensity overwhelms average teams
    'bielsa-ball-long-ball': 3,          // press forces mistakes
    'bielsa-ball-defensive-block': 2,    // energy breaks deep block
    'counter-attack-bielsa-ball': 5,     // counters exploit man-marking gaps
    'catenaccio-bielsa-ball': 3,         // deep block absorbs chaos
    // Fluid Counter counters
    'fluid-counter-gegenpress': 4,       // counter exploits high line
    'fluid-counter-ajax-school': 3,      // counter vs high line
    'fluid-counter-bielsa-ball': 4,      // devastates open attacking play
    'tiki-taka-fluid-counter': 3,        // possession vs transition
    'defensive-block-fluid-counter': 2,  // two defensive sides = stale
    // Route One counters
    'route-one-tiki-taka': 2,            // bypasses short passing
    'route-one-balanced': 2,             // directness surprises average teams
    'gegenpress-route-one': 3,           // press causes direct play to backfire
    'tiki-taka-route-one': 4,            // technical superiority over direct play
    'deutsche-schule-route-one': 3,      // discipline beats direct
  };

  const key = `${styleA}-${styleB}`;
  const reverseKey = `${styleB}-${styleA}`;
  if (counters[key] !== undefined) return counters[key];
  if (counters[reverseKey] !== undefined) return -counters[reverseKey];
  return 0;
}

// ────────────────────────────────────────────
// 8. AUTO-SUBSTITUTION ENGINE
// ────────────────────────────────────────────

export function evaluateAutoSubs(
  rules: AutoSubRule[],
  minute: number,
  homeGoals: number,
  awayGoals: number,
  isHome: boolean,
  hasRedCard: boolean,
  hasInjury: boolean,
  subsRemaining: number,
  alreadyUsedSlots: Set<string>,
): AutoSubRule | null {
  if (subsRemaining <= 0) return null;

  for (const rule of rules) {
    if (!rule.enabled) continue;
    if (alreadyUsedSlots.has(rule.outSlotId)) continue;

    const myGoals = isHome ? homeGoals : awayGoals;
    const oppGoals = isHome ? awayGoals : homeGoals;
    let triggered = false;

    switch (rule.condition) {
      case 'losing': triggered = oppGoals > myGoals; break;
      case 'winning': triggered = myGoals > oppGoals; break;
      case 'drawing': triggered = myGoals === oppGoals; break;
      case 'minute': triggered = minute >= (rule.conditionValue ?? 60); break;
      case 'red_card': triggered = hasRedCard; break;
      case 'injury': triggered = hasInjury; break;
    }

    if (triggered) return rule;
  }
  return null;
}

// ────────────────────────────────────────────
// 9. PERSISTENCE
// ────────────────────────────────────────────

const TACTIC_STORAGE_KEY = 'tmt-active-tactic';

/**
 * Save active tactic to localStorage (synchronous, for backward compatibility).
 * New code should use the Dexie-based persistence from db.ts.
 */
export function saveActiveTactic(clubId: string, tactic: FullTactic): void {
  try {
    const raw = localStorage.getItem(TACTIC_STORAGE_KEY);
    const all = raw ? JSON.parse(raw) : {};
    all[clubId] = tactic;
    localStorage.setItem(TACTIC_STORAGE_KEY, JSON.stringify(all));
  } catch { /* storage unavailable */ }
}

/**
 * Load active tactic from localStorage (synchronous, for backward compatibility).
 * New code should use the Dexie-based persistence from db.ts.
 */
export function loadActiveTactic(clubId: string): FullTactic | null {
  try {
    const raw = localStorage.getItem(TACTIC_STORAGE_KEY);
    if (!raw) return null;
    const all = JSON.parse(raw);
    return all[clubId] ?? null;
  } catch {
    return null;
  }
}

/** Get the active tactic or create default balanced. */
export function getOrCreateTactic(clubId: string): FullTactic {
  const saved = loadActiveTactic(clubId);
  if (saved) return saved;
  const balanced = TACTIC_PRESETS.find((p) => p.id === 'balanced')!;
  const tactic = createTacticFromPreset(balanced);
  saveActiveTactic(clubId, tactic);
  return tactic;
}
