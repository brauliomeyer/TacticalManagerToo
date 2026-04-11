import { useMemo, useState, useCallback } from 'react';

/* ══════════════════════════════════════════════
   Types
   ══════════════════════════════════════════════ */

interface Club {
  id: string;
  name: string;
  country: string;
  budget: number;
  reputation: number;
}

interface SquadPlayer {
  id: string;
  name: string;
  age: number;
  role: string;
  pac: number; sho: number; pas: number; dri: number; def: number; phy: number;
  morale: number;
  stamina: number;
  form: number;
  potential: number;
  played: number;
  scored: number;
  speed: number;
  control: number;
  tackling: number;
  passing: number;
  heading: number;
  shooting: number;
  marking: number;
  vision: number;
  caps: number;
  experience: number;
  fitness: number;
  freshness: number;
  influence: number;
  attitude: number;
  reliability: number;
}

interface TrainingGroundProps {
  activeClub: Club;
  squadPlayers: SquadPlayer[];
}

type TabKey = 'overview' | 'squad' | 'individual' | 'schedule' | 'youth' | 'development';

type Intensity = 'low' | 'medium' | 'high';
type TrainingFocus =
  | 'passing' | 'shooting' | 'dribbling' | 'crossing'
  | 'speed' | 'stamina' | 'strength'
  | 'vision' | 'composure' | 'positioning' | 'concentration'
  | 'fitness' | 'balanced';
type TeamFocus = 'attacking' | 'defensive' | 'balanced' | 'fitness';
type DayType = 'fitness' | 'tactical' | 'technical' | 'recovery' | 'rest' | 'match-prep';

interface PlayerTrainingState {
  focus: TrainingFocus;
  intensity: Intensity;
  resting: boolean;
  recovering: boolean;
  fatigue: number;
  fitnessBoost: number;
  gains: Record<string, number>;
}

interface YouthPlayer {
  id: string;
  name: string;
  age: number;
  position: string;
  potential: number;
  development: number;
  focus: TrainingFocus;
  intensity: Intensity;
  fatigue: number;
  fitness: number;
  morale: number;
}

interface ScheduleDay {
  day: string;
  type: DayType;
}

/* ══════════════════════════════════════════════
   Seeded random
   ══════════════════════════════════════════════ */

function sr(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  s = (s * 16807) % 2147483647;
  return (s - 1) / 2147483646;
}

function hs(str: string) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/* ══════════════════════════════════════════════
   Constants
   ══════════════════════════════════════════════ */

const TABS: { key: TabKey; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'squad', label: 'Squad Training' },
  { key: 'individual', label: 'Individual' },
  { key: 'schedule', label: 'Schedule' },
  { key: 'youth', label: 'Youth Academy' },
  { key: 'development', label: 'Development' },
];

const FOCUS_OPTIONS: { key: TrainingFocus; label: string; group: string }[] = [
  { key: 'passing', label: 'Passing', group: 'Technical' },
  { key: 'shooting', label: 'Shooting', group: 'Technical' },
  { key: 'dribbling', label: 'Dribbling', group: 'Technical' },
  { key: 'crossing', label: 'Crossing', group: 'Technical' },
  { key: 'speed', label: 'Speed', group: 'Physical' },
  { key: 'stamina', label: 'Stamina', group: 'Physical' },
  { key: 'strength', label: 'Strength', group: 'Physical' },
  { key: 'vision', label: 'Vision', group: 'Mental' },
  { key: 'composure', label: 'Composure', group: 'Mental' },
  { key: 'positioning', label: 'Positioning', group: 'Mental' },
  { key: 'concentration', label: 'Concentration', group: 'Mental' },
  { key: 'fitness', label: 'General Fitness', group: 'Fitness' },
  { key: 'balanced', label: 'Balanced', group: 'General' },
];

const INTENSITY_LABELS: Record<Intensity, { label: string; color: string }> = {
  low: { label: 'Low', color: 'text-[#2a8a2b]' },
  medium: { label: 'Medium', color: 'text-[#efe56b]' },
  high: { label: 'High', color: 'text-[#ff4444]' },
};

const TEAM_FOCUS_OPTIONS: { key: TeamFocus; label: string }[] = [
  { key: 'attacking', label: 'Attacking' },
  { key: 'defensive', label: 'Defensive' },
  { key: 'balanced', label: 'Balanced' },
  { key: 'fitness', label: 'Fitness' },
];

const DAY_TYPES: { key: DayType; label: string; color: string }[] = [
  { key: 'technical', label: 'Technical', color: 'bg-[#1a4a6a]' },
  { key: 'tactical', label: 'Tactical', color: 'bg-[#4a1a6a]' },
  { key: 'fitness', label: 'Fitness', color: 'bg-[#1a6a1e]' },
  { key: 'recovery', label: 'Recovery', color: 'bg-[#4a3a0a]' },
  { key: 'rest', label: 'Rest', color: 'bg-[#333]' },
  { key: 'match-prep', label: 'Match Prep', color: 'bg-[#6a1a1a]' },
];

const DAY_PROFILE_OPTIONS: { label: string; type: DayType }[] = [
  { label: 'Match Day', type: 'match-prep' },
  { label: 'Development Day', type: 'technical' },
  { label: 'Recovery Day', type: 'recovery' },
  { label: 'Trainingskamp Day', type: 'fitness' },
];

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const DEFAULT_SCHEDULE: ScheduleDay[] = [
  { day: 'Monday', type: 'fitness' },
  { day: 'Tuesday', type: 'technical' },
  { day: 'Wednesday', type: 'tactical' },
  { day: 'Thursday', type: 'technical' },
  { day: 'Friday', type: 'match-prep' },
  { day: 'Saturday', type: 'rest' },
  { day: 'Sunday', type: 'recovery' },
];

const SCHEDULE_PRESETS: { name: string; schedule: DayType[] }[] = [
  { name: 'Match Week', schedule: ['recovery', 'tactical', 'technical', 'tactical', 'match-prep', 'rest', 'recovery'] },
  { name: 'Development Week', schedule: ['technical', 'fitness', 'technical', 'tactical', 'technical', 'fitness', 'recovery'] },
  { name: 'Recovery Week', schedule: ['recovery', 'rest', 'technical', 'recovery', 'rest', 'technical', 'recovery'] },
  { name: 'Trainingskamp', schedule: ['fitness', 'technical', 'tactical', 'fitness', 'technical', 'match-prep', 'recovery'] },
  { name: 'Balanced Week', schedule: ['fitness', 'technical', 'tactical', 'technical', 'match-prep', 'rest', 'recovery'] },
];

const YOUTH_FIRST = [
  'Jayden', 'Kai', 'Liam', 'Reuben', 'Zane', 'Byron', 'Che', 'Harvey',
  'Kian', 'Ollie', 'Myles', 'Archie', 'Toby', 'Ellis', 'Jude', 'Rohan',
];

const YOUTH_LAST = [
  'Walker', 'Brown', 'Wilson', 'Davies', 'Roberts', 'King', 'Scott', 'Taylor',
  'Harris', 'Baker', 'Green', 'Adams', 'Nelson', 'Moore', 'Thompson', 'White',
];

const POSITIONS = ['GK', 'CB', 'LB', 'RB', 'DM', 'CM', 'AM', 'LW', 'RW', 'CF', 'ST'];

/* ══════════════════════════════════════════════
   Youth generation
   ══════════════════════════════════════════════ */

function generateYouth(clubId: string): YouthPlayer[] {
  const seed = hs(clubId + 'training-youth');
  const count = 8 + Math.floor(sr(seed) * 6);
  const players: YouthPlayer[] = [];
  for (let i = 0; i < count; i++) {
    const ps = seed + i * 73;
    players.push({
      id: `ty-${i}-${ps}`,
      name: `${YOUTH_FIRST[Math.floor(sr(ps) * YOUTH_FIRST.length)]} ${YOUTH_LAST[Math.floor(sr(ps + 1) * YOUTH_LAST.length)]}`,
      age: 15 + Math.floor(sr(ps + 2) * 4),
      position: POSITIONS[Math.floor(sr(ps + 3) * POSITIONS.length)],
      potential: Math.round(55 + sr(ps + 4) * 40),
      development: Math.round(sr(ps + 5) * 100),
      focus: 'balanced',
      intensity: 'medium',
      fatigue: Math.round(sr(ps + 6) * 30),
      fitness: Math.round(60 + sr(ps + 7) * 35),
      morale: Math.round(55 + sr(ps + 8) * 40),
    });
  }
  return players;
}

/* ══════════════════════════════════════════════
   Derived helpers
   ══════════════════════════════════════════════ */

function overall(p: SquadPlayer) {
  return Math.round((p.pac + p.sho + p.pas + p.dri + p.def + p.phy) / 6);
}

function playerFatigue(p: SquadPlayer, ts: PlayerTrainingState | undefined) {
  const base = Math.round(100 - p.freshness);
  return Math.min(100, base + (ts?.fatigue ?? 0));
}

function injuryRisk(fatigue: number, intensity: Intensity) {
  const base = fatigue * 0.5;
  const mult = intensity === 'high' ? 2.0 : intensity === 'medium' ? 1.0 : 0.4;
  return Math.min(100, Math.round(base * mult));
}

function growthRate(intensity: Intensity, fatigue: number, morale: number) {
  const intMult = intensity === 'high' ? 2.5 : intensity === 'medium' ? 1.5 : 0.8;
  const fatMult = Math.max(0.2, 1 - fatigue / 150);
  const morMult = 0.5 + morale / 200;
  return intMult * fatMult * morMult;
}

function pickSquadFocus(role: string, teamFocus: TeamFocus): TrainingFocus {
  const r = role.toUpperCase();
  if (teamFocus === 'fitness') return 'fitness';
  if (teamFocus === 'attacking') {
    if (r.includes('STRIKER') || r.includes('WINGER') || r.includes('FORWARD')) return 'shooting';
    if (r.includes('MIDFIELDER')) return 'passing';
    return 'positioning';
  }
  if (teamFocus === 'defensive') {
    if (r.includes('BACK') || r.includes('DEFENDER') || r.includes('SWEEPER')) return 'positioning';
    if (r.includes('GOALKEEPER')) return 'concentration';
    return 'stamina';
  }
  if (r.includes('GOALKEEPER')) return 'concentration';
  if (r.includes('MIDFIELDER')) return 'vision';
  if (r.includes('STRIKER') || r.includes('FORWARD')) return 'shooting';
  return 'balanced';
}

function pickYouthFocus(position: string): TrainingFocus {
  const pos = position.toUpperCase();
  if (pos === 'GK') return 'concentration';
  if (pos === 'CB' || pos === 'LB' || pos === 'RB' || pos === 'DM') return 'positioning';
  if (pos === 'CM' || pos === 'AM') return 'vision';
  if (pos === 'LW' || pos === 'RW') return 'dribbling';
  if (pos === 'CF' || pos === 'ST') return 'shooting';
  return 'balanced';
}

function recommendTrainingPlan(
  player: SquadPlayer,
  fatigue: number,
  risk: number,
  teamFocus: TeamFocus
): { focus: TrainingFocus; intensity: Intensity; resting: boolean; recovering: boolean } {
  const focus = fatigue >= 55 ? 'fitness' : pickSquadFocus(player.role, teamFocus);
  const intensity: Intensity =
    fatigue >= 70 || risk >= 75 ? 'low' :
    fatigue >= 45 ? 'medium' :
    player.age <= 23 ? 'high' : 'medium';
  const recovering = fatigue >= 80 || risk >= 85;
  const resting = !recovering && fatigue >= 65;
  return { focus, intensity, resting, recovering };
}

/* ══════════════════════════════════════════════
   Retro style helpers
   ══════════════════════════════════════════════ */

const RETRO = '"Press Start 2P", "Courier New", monospace';
const MONO = '"Courier New", monospace';

function Btn({ children, active, onClick, disabled, className = '' }: {
  children: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`px-2 py-1 text-[10px] font-black uppercase tracking-wide transition-colors border ${
        disabled
          ? 'border-[#333] bg-[#1a1a1a] text-[#555] cursor-not-allowed'
          : active
            ? 'bg-[#2a8a2b] text-[#efe56b] border-[#efe56b]'
            : 'text-[#00e5ff] hover:bg-[#1a4a1e] border-[#2a8a2b] bg-[#0d3f10]'
      } ${className}`}
      style={{ fontFamily: RETRO }}
    >
      {children}
    </button>
  );
}

function ActionBtn({ children, onClick, variant = 'green' }: {
  children: React.ReactNode;
  onClick: () => void;
  variant?: 'green' | 'red' | 'blue' | 'yellow';
}) {
  const colors = {
    green: 'bg-[#1a6a1e] hover:bg-[#2a8a2b] text-[#d5f8b6] border-[#2a8a2b]',
    red: 'bg-[#6a1a1a] hover:bg-[#8a2a2a] text-[#f8b6b6] border-[#8a2a2a]',
    blue: 'bg-[#1a1a6a] hover:bg-[#2a2a8a] text-[#b6d5f8] border-[#2a2a8a]',
    yellow: 'bg-[#4a3a0a] hover:bg-[#6a5a1a] text-[#efe56b] border-[#6a5a1a]',
  };
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-2 py-1 text-[9px] font-bold uppercase border transition-colors ${colors[variant]}`}
      style={{ fontFamily: MONO, letterSpacing: '0.05em' }}
    >
      {children}
    </button>
  );
}

function SkillBar({ label, value, maxValue = 100 }: {
  label: string;
  value: number;
  maxValue?: number;
}) {
  const pct = Math.min(100, (value / maxValue) * 100);
  const color = value >= 80 ? 'bg-[#2a8a2b]' : value >= 60 ? 'bg-[#6a8a1a]' : value >= 40 ? 'bg-[#8a6a1a]' : 'bg-[#8a2a2a]';
  const textColor = value >= 80 ? 'text-[#2a8a2b]' : value >= 60 ? 'text-[#efe56b]' : value >= 40 ? 'text-[#ff8844]' : 'text-[#ff4444]';
  return (
    <div className="flex items-center gap-1">
      <span className="w-20 text-[9px] text-[#6b9a5a] truncate" style={{ fontFamily: MONO }}>{label}</span>
      <div className="flex-1 h-2 bg-[#0a2e0d] border border-[#1a5a1e]">
        <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`w-6 text-right text-[9px] font-bold font-mono ${textColor}`}>{value}</span>
    </div>
  );
}

function StatusBadge({ value, thresholds = [70, 40] }: { value: number; thresholds?: [number, number] }) {
  const color = value >= thresholds[0] ? 'text-[#2a8a2b]' : value >= thresholds[1] ? 'text-[#efe56b]' : 'text-[#ff4444]';
  return <span className={`font-bold font-mono text-[10px] ${color}`}>{value}</span>;
}

/* ══════════════════════════════════════════════
   Overview Panel (always visible)
   ══════════════════════════════════════════════ */

function TrainingOverviewBar({ squad, trainingStates, teamIntensity, teamFocus }: {
  squad: SquadPlayer[];
  trainingStates: Map<string, PlayerTrainingState>;
  teamIntensity: Intensity;
  teamFocus: TeamFocus;
}) {
  const avgFitness = squad.length > 0 ? Math.round(squad.reduce((s, p) => s + p.fitness, 0) / squad.length) : 0;
  const avgMorale = squad.length > 0 ? Math.round(squad.reduce((s, p) => s + p.morale, 0) / squad.length) : 0;
  const fatigued = squad.filter((p) => playerFatigue(p, trainingStates.get(p.id)) > 60).length;
  const injured = squad.filter((p) => {
    const fat = playerFatigue(p, trainingStates.get(p.id));
    const ts = trainingStates.get(p.id);
    return injuryRisk(fat, ts?.intensity ?? teamIntensity) > 70;
  }).length;
  const avgInjuryRisk = squad.length > 0
    ? Math.round(squad.reduce((s, p) => {
      const fat = playerFatigue(p, trainingStates.get(p.id));
      const ts = trainingStates.get(p.id);
      return s + injuryRisk(fat, ts?.intensity ?? teamIntensity);
    }, 0) / squad.length)
    : 0;
  const load = teamIntensity === 'high' ? 'Heavy' : teamIntensity === 'medium' ? 'Moderate' : 'Light';

  return (
    <div className="border-2 border-[#efe56b] bg-[#1a3a1e] px-3 py-2 mb-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
        <span className="text-[#98ca7a]">Team Intensity: <strong className={INTENSITY_LABELS[teamIntensity].color}>{INTENSITY_LABELS[teamIntensity].label}</strong></span>
        <span className="text-[#98ca7a]">Focus: <strong className="text-[#00e5ff]">{TEAM_FOCUS_OPTIONS.find((o) => o.key === teamFocus)?.label}</strong></span>
        <span className="text-[#98ca7a]">Avg Fitness: <StatusBadge value={avgFitness} /></span>
        <span className="text-[#98ca7a]">Avg Morale: <StatusBadge value={avgMorale} /></span>
        <span className="text-[#6b9a5a]">|</span>
        <span className="text-[#98ca7a]">Injury Risk: <StatusBadge value={avgInjuryRisk} thresholds={[30, 60]} /></span>
        <span className="border border-[#2a8a2b] bg-[#0d3f10] px-1.5 py-0.5 text-[10px] text-[#d5f8b6]">
          Fatigued: <strong className={fatigued > 0 ? 'text-[#ff8844]' : 'text-[#2a8a2b]'}>{fatigued}</strong>
        </span>
        <span className="border border-[#2a8a2b] bg-[#0d3f10] px-1.5 py-0.5 text-[10px] text-[#d5f8b6]">
          High Risk: <strong className={injured > 0 ? 'text-[#ff4444]' : 'text-[#2a8a2b]'}>{injured}</strong>
        </span>
        <span className="border border-[#2a8a2b] bg-[#0d3f10] px-1.5 py-0.5 text-[10px] text-[#d5f8b6]">
          Load: <strong className="text-white">{load}</strong>
        </span>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════
   Overview Tab
   ══════════════════════════════════════════════ */

function OverviewTab({ squad, trainingStates, teamIntensity, teamFocus, onSetIntensity, onSetFocus, setTab }: {
  squad: SquadPlayer[];
  trainingStates: Map<string, PlayerTrainingState>;
  teamIntensity: Intensity;
  teamFocus: TeamFocus;
  onSetIntensity: (i: Intensity) => void;
  onSetFocus: (f: TeamFocus) => void;
  setTab: (t: TabKey) => void;
}) {
  const avgFit = squad.length > 0 ? Math.round(squad.reduce((s, p) => s + p.fitness, 0) / squad.length) : 0;
  const avgMor = squad.length > 0 ? Math.round(squad.reduce((s, p) => s + p.morale, 0) / squad.length) : 0;
  const avgForm = squad.length > 0 ? Math.round(squad.reduce((s, p) => s + p.form, 0) / squad.length) : 0;
  const avgOvr = squad.length > 0 ? Math.round(squad.reduce((s, p) => s + overall(p), 0) / squad.length) : 0;
  const fatigued = squad.filter((p) => playerFatigue(p, trainingStates.get(p.id)) > 60).length;
  const highRisk = squad.filter((p) => {
    const fat = playerFatigue(p, trainingStates.get(p.id));
    return injuryRisk(fat, trainingStates.get(p.id)?.intensity ?? teamIntensity) > 70;
  }).length;
  const resting = Array.from(trainingStates.values()).filter((ts) => ts.resting).length;
  const recovering = Array.from(trainingStates.values()).filter((ts) => ts.recovering).length;

  const cards: { label: string; value: string | number; color?: string; tab?: TabKey }[] = [
    { label: 'Squad Size', value: squad.length, tab: 'squad' },
    { label: 'Avg Overall', value: avgOvr },
    { label: 'Avg Fitness', value: avgFit, color: avgFit >= 70 ? 'text-[#2a8a2b]' : avgFit >= 40 ? 'text-[#efe56b]' : 'text-[#ff4444]' },
    { label: 'Avg Morale', value: avgMor, color: avgMor >= 70 ? 'text-[#2a8a2b]' : avgMor >= 40 ? 'text-[#efe56b]' : 'text-[#ff4444]' },
    { label: 'Avg Form', value: avgForm, color: avgForm >= 70 ? 'text-[#2a8a2b]' : avgForm >= 40 ? 'text-[#efe56b]' : 'text-[#ff4444]' },
    { label: 'Fatigued Players', value: fatigued, color: fatigued > 3 ? 'text-[#ff4444]' : fatigued > 0 ? 'text-[#efe56b]' : 'text-[#2a8a2b]' },
    { label: 'High Injury Risk', value: highRisk, color: highRisk > 0 ? 'text-[#ff4444]' : 'text-[#2a8a2b]' },
    { label: 'Players Resting', value: resting },
    { label: 'In Recovery', value: recovering },
  ];

  return (
    <div className="space-y-3">
      {/* Team controls */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="border-2 border-[#2a8a2b] bg-[#0d3f10] p-3">
          <h4 className="text-[10px] font-black uppercase text-[#00e5ff] mb-2" style={{ fontFamily: RETRO }}>Team Intensity</h4>
          <div className="flex gap-2">
            {(['low', 'medium', 'high'] as Intensity[]).map((i) => (
              <Btn key={i} active={teamIntensity === i} onClick={() => onSetIntensity(i)}>{i}</Btn>
            ))}
          </div>
          <p className="mt-2 text-[10px] text-[#5a8a4a]">
            {teamIntensity === 'high' ? 'Faster growth, higher injury risk and fatigue.' :
             teamIntensity === 'medium' ? 'Balanced growth and risk. Recommended default.' :
             'Slow growth, minimal fatigue. Good for recovery periods.'}
          </p>
        </div>
        <div className="border-2 border-[#2a8a2b] bg-[#0d3f10] p-3">
          <h4 className="text-[10px] font-black uppercase text-[#00e5ff] mb-2" style={{ fontFamily: RETRO }}>Team Focus</h4>
          <div className="flex gap-2 flex-wrap">
            {TEAM_FOCUS_OPTIONS.map((f) => (
              <Btn key={f.key} active={teamFocus === f.key} onClick={() => onSetFocus(f.key)}>{f.label}</Btn>
            ))}
          </div>
          <p className="mt-2 text-[10px] text-[#5a8a4a]">
            {teamFocus === 'attacking' ? 'Emphasis on shooting, passing and movement.' :
             teamFocus === 'defensive' ? 'Focus on tackling, positioning and marking.' :
             teamFocus === 'fitness' ? 'Conditioning, speed and stamina priority.' :
             'Even development across all attributes.'}
          </p>
        </div>
      </div>

      {/* Stats cards */}
      <h4 className="text-[10px] font-black uppercase text-[#efe56b]" style={{ fontFamily: RETRO }}>Team Status</h4>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {cards.map((c) => (
          <button
            key={c.label}
            type="button"
            onClick={() => c.tab && setTab(c.tab)}
            className={`text-left border-2 border-[#2a8a2b] bg-[#0d3f10] p-2 transition-colors ${c.tab ? 'hover:bg-[#1a4a1e] cursor-pointer' : 'cursor-default'}`}
          >
            <div className="text-[10px] uppercase text-[#6b9a5a] mb-0.5" style={{ fontFamily: MONO }}>{c.label}</div>
            <div className={`text-sm font-black ${c.color ?? 'text-white'}`} style={{ fontFamily: MONO }}>{c.value}</div>
          </button>
        ))}
      </div>

      {/* Warnings */}
      {highRisk > 0 && (
        <div className="border-2 border-[#8a2a2a] bg-[#3f100d] px-3 py-2 text-xs text-[#ff4444] font-bold uppercase">
          Warning: {highRisk} player{highRisk > 1 ? 's' : ''} at high injury risk. Consider lowering intensity or resting them.
        </div>
      )}
      {fatigued > 5 && (
        <div className="border-2 border-[#6a5a1a] bg-[#3a2a0a] px-3 py-2 text-xs text-[#efe56b] font-bold uppercase">
          Overtraining alert: {fatigued} players are fatigued. Schedule recovery sessions.
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════
   Squad Training Tab
   ══════════════════════════════════════════════ */

function SquadTrainingTab({ squad, trainingStates, teamIntensity, onSetFocus, onSetIntensity, onRest, onRecover, onAutoSelectTraining, onSelect }: {
  squad: SquadPlayer[];
  trainingStates: Map<string, PlayerTrainingState>;
  teamIntensity: Intensity;
  onSetFocus: (id: string, focus: TrainingFocus) => void;
  onSetIntensity: (id: string, intensity: Intensity) => void;
  onRest: (id: string) => void;
  onRecover: (id: string) => void;
  onAutoSelectTraining: () => void;
  onSelect: (p: SquadPlayer) => void;
}) {
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState<string>('name');

  const roles = Array.from(new Set(squad.map((p) => p.role)));

  const sorted = useMemo(() => {
    let list = [...squad];
    if (roleFilter !== 'ALL') list = list.filter((p) => p.role === roleFilter);
    switch (sortBy) {
      case 'name': list.sort((a, b) => a.name.localeCompare(b.name)); break;
      case 'age': list.sort((a, b) => a.age - b.age); break;
      case 'rating': list.sort((a, b) => overall(b) - overall(a)); break;
      case 'fitness': list.sort((a, b) => b.fitness - a.fitness); break;
      case 'fatigue': list.sort((a, b) => {
        const fB = playerFatigue(b, trainingStates.get(b.id));
        const fA = playerFatigue(a, trainingStates.get(a.id));
        return fB - fA;
      }); break;
      case 'morale': list.sort((a, b) => b.morale - a.morale); break;
    }
    return list;
  }, [squad, roleFilter, sortBy, trainingStates]);

  const thCls = 'py-1 px-1 text-left text-[9px] font-bold uppercase text-[#efe56b] cursor-pointer hover:text-white';

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <h3 className="text-sm font-black uppercase text-[#00e5ff]" style={{ fontFamily: RETRO }}>
          Squad Training
        </h3>
        <ActionBtn onClick={onAutoSelectTraining} variant="yellow">Auto Select Training</ActionBtn>
        <div className="flex gap-1 ml-auto">
          <Btn active={roleFilter === 'ALL'} onClick={() => setRoleFilter('ALL')}>All</Btn>
          {roles.map((r) => (
            <Btn key={r} active={roleFilter === r} onClick={() => setRoleFilter(r)}>{r}</Btn>
          ))}
        </div>
      </div>

      <div className="border-2 border-[#2a8a2b] bg-[#0d3f10] overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b-2 border-[#2a8a2b]">
              <th className={thCls} onClick={() => setSortBy('name')}>Player</th>
              <th className={thCls}>Position</th>
              <th className={thCls} onClick={() => setSortBy('age')}>Age</th>
              <th className={thCls} onClick={() => setSortBy('rating')}>Overall</th>
              <th className={thCls}>Potential</th>
              <th className={thCls} onClick={() => setSortBy('fitness')}>Fitness</th>
              <th className={thCls} onClick={() => setSortBy('fatigue')}>Fatigue</th>
              <th className={thCls} onClick={() => setSortBy('morale')}>Morale</th>
              <th className={thCls}>Focus</th>
              <th className={thCls}>Intensity</th>
              <th className={thCls}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((p) => {
              const ts = trainingStates.get(p.id);
              const ovr = overall(p);
              const fat = playerFatigue(p, ts);
              const risk = injuryRisk(fat, ts?.intensity ?? teamIntensity);
              const fatColor = fat < 30 ? 'text-[#2a8a2b]' : fat < 60 ? 'text-[#efe56b]' : 'text-[#ff4444]';
              const fitColor = p.fitness >= 70 ? 'text-[#2a8a2b]' : p.fitness >= 40 ? 'text-[#efe56b]' : 'text-[#ff4444]';
              const morColor = p.morale >= 70 ? 'text-[#2a8a2b]' : p.morale >= 40 ? 'text-[#efe56b]' : 'text-[#ff4444]';

              return (
                <tr key={p.id} className={`border-b border-[#1a5a1e] hover:bg-[#1a4a1e] cursor-pointer ${risk > 70 ? 'bg-[#2a1010]' : ts?.resting ? 'bg-[#0a2a2a]' : ''}`} onClick={() => onSelect(p)}>
                  <td className="py-1 px-1">
                    <span className="text-xs font-bold uppercase text-[#d5f8b6]" style={{ fontFamily: MONO }}>
                      {p.name}
                      {ts?.resting && <span className="ml-1 text-[10px] text-[#00e5ff]">[REST]</span>}
                      {ts?.recovering && <span className="ml-1 text-[10px] text-[#efe56b]">[RECOV]</span>}
                    </span>
                  </td>
                  <td className="py-1 px-1 text-[10px] text-[#00e5ff] uppercase font-mono">{p.role}</td>
                  <td className="py-1 px-1 text-[10px] text-white font-mono">{p.age}</td>
                  <td className="py-1 px-1 text-[10px] text-white font-bold font-mono">{ovr}</td>
                  <td className="py-1 px-1 text-[10px] text-[#efe56b] font-mono">{p.potential}</td>
                  <td className={`py-1 px-1 text-[10px] font-bold font-mono ${fitColor}`}>{p.fitness}</td>
                  <td className={`py-1 px-1 text-[10px] font-bold font-mono ${fatColor}`}>{fat}{risk > 70 && <span className="text-[#ff4444] ml-0.5">!</span>}</td>
                  <td className={`py-1 px-1 text-[10px] font-bold font-mono ${morColor}`}>{p.morale}</td>
                  <td className="py-1 px-1" onClick={(e) => e.stopPropagation()}>
                    <select
                      value={ts?.focus ?? 'balanced'}
                      onChange={(e) => onSetFocus(p.id, e.target.value as TrainingFocus)}
                      className="bg-[#0a2e0d] border border-[#2a8a2b] text-[#d5f8b6] text-[9px] px-1 py-0.5 w-20"
                    >
                      {FOCUS_OPTIONS.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}
                    </select>
                  </td>
                  <td className="py-1 px-1" onClick={(e) => e.stopPropagation()}>
                    <select
                      value={ts?.intensity ?? 'medium'}
                      onChange={(e) => onSetIntensity(p.id, e.target.value as Intensity)}
                      className="bg-[#0a2e0d] border border-[#2a8a2b] text-[#d5f8b6] text-[9px] px-1 py-0.5"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </td>
                  <td className="py-1 px-1" onClick={(e) => e.stopPropagation()}>
                    <div className="flex gap-1">
                      <ActionBtn onClick={() => onRest(p.id)} variant={ts?.resting ? 'yellow' : 'blue'}>
                        {ts?.resting ? 'Resume' : 'Rest'}
                      </ActionBtn>
                      <ActionBtn onClick={() => onRecover(p.id)} variant={ts?.recovering ? 'yellow' : 'green'}>
                        {ts?.recovering ? 'Stop' : 'Recover'}
                      </ActionBtn>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {sorted.length === 0 && (
        <div className="border-2 border-[#2a8a2b] bg-[#0d3f10] p-4 text-center text-xs text-[#6b9a5a] italic">
          No players match the current filter.
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════
   Individual Training Tab
   ══════════════════════════════════════════════ */

function IndividualTab({ squad, trainingStates, teamIntensity, teamFocus, selectedPlayer, onSelect, onSetFocus, onSetIntensity, onRest, onRecover, onTrain, onAutoPlan }: {
  squad: SquadPlayer[];
  trainingStates: Map<string, PlayerTrainingState>;
  teamIntensity: Intensity;
  teamFocus: TeamFocus;
  selectedPlayer: SquadPlayer | null;
  onSelect: (p: SquadPlayer | null) => void;
  onSetFocus: (id: string, focus: TrainingFocus) => void;
  onSetIntensity: (id: string, intensity: Intensity) => void;
  onRest: (id: string) => void;
  onRecover: (id: string) => void;
  onTrain: (id: string) => void;
  onAutoPlan: (id: string) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-[220px_1fr]">
      {/* Player list */}
      <div className="border-2 border-[#2a8a2b] bg-[#0d3f10] p-2 max-h-[600px] overflow-y-auto">
        <h4 className="text-[10px] font-black uppercase text-[#00e5ff] mb-2" style={{ fontFamily: RETRO }}>Select Player</h4>
        <div className="space-y-0.5">
          {squad.map((p) => {
            const ts = trainingStates.get(p.id);
            const fat = playerFatigue(p, ts);
            const risk = injuryRisk(fat, ts?.intensity ?? teamIntensity);
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => onSelect(selectedPlayer?.id === p.id ? null : p)}
                className={`block w-full text-left px-2 py-1 text-[10px] transition-colors ${
                  selectedPlayer?.id === p.id
                    ? 'bg-[#2a8a2b] text-[#efe56b]'
                    : risk > 70
                      ? 'text-[#ff4444] hover:bg-[#2a1010]'
                      : 'text-[#d5f8b6] hover:bg-[#1a4a1e]'
                }`}
                style={{ fontFamily: MONO }}
              >
                <span className="font-bold uppercase">{p.name}</span>
                <span className="ml-1 text-[10px] text-[#6b9a5a]">{p.role} {overall(p)}</span>
                {ts?.resting && <span className="ml-1 text-[10px] text-[#00e5ff]">[R]</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Detail panel */}
      <div className="border-2 border-[#2a8a2b] bg-[#0d3f10] p-3">
        {selectedPlayer ? (
          <PlayerTrainingDetail
            player={selectedPlayer}
            ts={trainingStates.get(selectedPlayer.id)}
            teamIntensity={teamIntensity}
            teamFocus={teamFocus}
            onSetFocus={onSetFocus}
            onSetIntensity={onSetIntensity}
            onRest={onRest}
            onRecover={onRecover}
            onTrain={onTrain}
            onAutoPlan={onAutoPlan}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-[#6b9a5a] italic p-8">
            Select a player from the list to view and manage their training.
          </div>
        )}
      </div>
    </div>
  );
}

function PlayerTrainingDetail({ player, ts, teamIntensity, teamFocus, onSetFocus, onSetIntensity, onRest, onRecover, onTrain, onAutoPlan }: {
  player: SquadPlayer;
  ts: PlayerTrainingState | undefined;
  teamIntensity: Intensity;
  teamFocus: TeamFocus;
  onSetFocus: (id: string, focus: TrainingFocus) => void;
  onSetIntensity: (id: string, intensity: Intensity) => void;
  onRest: (id: string) => void;
  onRecover: (id: string) => void;
  onTrain: (id: string) => void;
  onAutoPlan: (id: string) => void;
}) {
  const ovr = overall(player);
  const fat = playerFatigue(player, ts);
  const risk = injuryRisk(fat, ts?.intensity ?? teamIntensity);
  const growth = growthRate(ts?.intensity ?? teamIntensity, fat, player.morale);
  const gains = ts?.gains ?? {};
  const recommendation = recommendTrainingPlan(player, fat, risk, teamFocus);

  const technical = [
    { label: 'Passing', value: player.passing, gain: gains['passing'] ?? 0 },
    { label: 'Shooting', value: player.shooting, gain: gains['shooting'] ?? 0 },
    { label: 'Dribbling', value: player.dri, gain: gains['dribbling'] ?? 0 },
    { label: 'Crossing', value: player.control, gain: gains['crossing'] ?? 0 },
  ];
  const physical = [
    { label: 'Speed', value: player.speed, gain: gains['speed'] ?? 0 },
    { label: 'Stamina', value: player.stamina, gain: gains['stamina'] ?? 0 },
    { label: 'Strength', value: player.phy, gain: gains['strength'] ?? 0 },
  ];
  const mental = [
    { label: 'Vision', value: player.vision, gain: gains['vision'] ?? 0 },
    { label: 'Composure', value: player.attitude, gain: gains['composure'] ?? 0 },
    { label: 'Positioning', value: player.marking, gain: gains['positioning'] ?? 0 },
    { label: 'Concentration', value: player.influence, gain: gains['concentration'] ?? 0 },
  ];
  const condition = [
    { label: 'Fitness', value: player.fitness },
    { label: 'Freshness', value: player.freshness },
    { label: 'Morale', value: player.morale },
    { label: 'Form', value: player.form },
  ];

  const renderGroup = (title: string, items: { label: string; value: number; gain?: number }[]) => (
    <div>
      <h5 className="text-[9px] font-bold uppercase text-[#efe56b] mb-1">{title}</h5>
      <div className="space-y-1">
        {items.map((a) => (
          <div key={a.label} className="flex items-center gap-1">
            <SkillBar label={a.label} value={a.value} />
            {(a.gain ?? 0) > 0 && (
              <span className="text-[10px] text-[#2a8a2b] font-bold">+{a.gain}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-black uppercase text-[#00e5ff]" style={{ fontFamily: RETRO }}>{player.name}</h4>
        <div className="flex gap-2 text-[10px]" style={{ fontFamily: MONO }}>
          <span className="text-[#6b9a5a]">{player.role}</span>
          <span className="text-white font-bold">{ovr}</span>
          <span className="text-[#efe56b]">Pot: {player.potential}</span>
          <span className="text-[#6b9a5a]">Age: {player.age}</span>
        </div>
      </div>

      {/* Status bar */}
      <div className="flex flex-wrap gap-2 text-[10px] border-b border-[#1a5a1e] pb-2" style={{ fontFamily: MONO }}>
        <span className="text-[#6b9a5a]">Fatigue: <StatusBadge value={fat} thresholds={[30, 60]} /></span>
        <span className="text-[#6b9a5a]">Injury Risk: <StatusBadge value={risk} thresholds={[30, 60]} /></span>
        <span className="text-[#6b9a5a]">Growth Rate: <span className="text-white font-bold">{growth.toFixed(1)}x</span></span>
        {ts?.resting && <span className="text-[#00e5ff] font-bold">[RESTING]</span>}
        {ts?.recovering && <span className="text-[#efe56b] font-bold">[RECOVERING]</span>}
      </div>

      {risk > 70 && (
        <div className="border border-[#8a2a2a] bg-[#3f100d] px-2 py-1 text-[9px] text-[#ff4444] font-bold uppercase">
          High injury risk! Consider resting this player or lowering intensity.
        </div>
      )}

      {/* Attributes grid */}
      <div className="grid grid-cols-2 gap-3">
        {renderGroup('Technical', technical)}
        {renderGroup('Physical', physical)}
        {renderGroup('Mental', mental)}
        {renderGroup('Condition', condition)}
      </div>

      {/* Controls */}
      <div className="border-t border-[#1a5a1e] pt-2 space-y-2">
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-[10px] uppercase text-[#6b9a5a] mb-0.5">Training Focus</label>
            <select
              value={ts?.focus ?? 'balanced'}
              onChange={(e) => onSetFocus(player.id, e.target.value as TrainingFocus)}
              className="bg-[#0a2e0d] border border-[#2a8a2b] text-[#d5f8b6] text-[10px] px-1 py-1"
            >
              {FOCUS_OPTIONS.map((f) => <option key={f.key} value={f.key}>[{f.group}] {f.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] uppercase text-[#6b9a5a] mb-0.5">Intensity</label>
            <div className="flex gap-1">
              {(['low', 'medium', 'high'] as Intensity[]).map((i) => (
                <Btn key={i} active={(ts?.intensity ?? 'medium') === i} onClick={() => onSetIntensity(player.id, i)}>{i}</Btn>
              ))}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <ActionBtn onClick={() => onTrain(player.id)} variant="green">Run Training Session</ActionBtn>
          <ActionBtn onClick={() => onAutoPlan(player.id)} variant="yellow">Auto Select Plan</ActionBtn>
          <ActionBtn onClick={() => onRest(player.id)} variant={ts?.resting ? 'yellow' : 'blue'}>
            {ts?.resting ? 'Resume Training' : 'Rest Player'}
          </ActionBtn>
          <ActionBtn onClick={() => onRecover(player.id)} variant={ts?.recovering ? 'yellow' : 'blue'}>
            {ts?.recovering ? 'Stop Recovery' : 'Send to Recovery'}
          </ActionBtn>
        </div>
        <div className="text-[10px] text-[#98ca7a]" style={{ fontFamily: MONO }}>
          Suggested: <strong className="text-[#efe56b]">{recommendation.focus}</strong> ·
          <strong className="text-[#efe56b]"> {recommendation.intensity}</strong>
          {recommendation.recovering ? <span className="text-[#ff4444]"> · recovery</span> : recommendation.resting ? <span className="text-[#00e5ff]"> · rest</span> : null}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════
   Training Schedule Tab
   ══════════════════════════════════════════════ */

function ScheduleTab({ schedule, onChange, onApplyPreset }: {
  schedule: ScheduleDay[];
  onChange: (day: string, type: DayType) => void;
  onApplyPreset: (preset: DayType[]) => void;
}) {
  const applyDayProfile = (day: string, type: DayType) => {
    onChange(day, type);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <h3 className="text-sm font-black uppercase text-[#00e5ff]" style={{ fontFamily: RETRO }}>
          Weekly Schedule
        </h3>
        <div className="flex gap-1 ml-auto flex-wrap">
          {SCHEDULE_PRESETS.map((p) => (
            <ActionBtn key={p.name} onClick={() => onApplyPreset(p.schedule)} variant="blue">{p.name}</ActionBtn>
          ))}
        </div>
      </div>

      {/* Color legend */}
      <div className="flex flex-wrap gap-2 mb-2">
        {DAY_TYPES.map((d) => (
          <span key={d.key} className={`${d.color} px-2 py-0.5 text-[10px] text-white uppercase font-bold border border-[#333]`}>
            {d.label}
          </span>
        ))}
      </div>

      {/* Schedule grid */}
      <div className="border-2 border-[#2a8a2b] bg-[#0d3f10]">
        <div className="grid grid-cols-7">
          {DAYS.map((day) => (
            <div key={day} className="border-r border-[#1a5a1e] last:border-r-0">
              <div className="border-b-2 border-[#2a8a2b] bg-[#0a2e0d] px-2 py-2 text-center">
                <span className="text-[9px] font-black uppercase text-[#efe56b]" style={{ fontFamily: RETRO }}>{day.slice(0, 3)}</span>
              </div>
              <div className="p-2">
                {(() => {
                  const entry = schedule.find((s) => s.day === day);
                  const current = entry?.type ?? 'rest';
                  const dayType = DAY_TYPES.find((d) => d.key === current);
                  return (
                    <div className="space-y-1">
                      <div className={`${dayType?.color ?? 'bg-[#333]'} px-2 py-3 text-center border border-[#555]`}>
                        <span className="text-[10px] text-white font-bold uppercase" style={{ fontFamily: MONO }}>
                          {dayType?.label ?? 'Rest'}
                        </span>
                      </div>
                      <select
                        value={current}
                        onChange={(e) => onChange(day, e.target.value as DayType)}
                        className="w-full bg-[#0a2e0d] border border-[#2a8a2b] text-[#d5f8b6] text-[10px] px-1 py-0.5"
                      >
                        {DAY_TYPES.map((d) => <option key={d.key} value={d.key}>{d.label}</option>)}
                      </select>
                      <div className="mt-1 grid gap-1">
                        {DAY_PROFILE_OPTIONS.map((profile) => (
                          <button
                            key={profile.label}
                            type="button"
                            onClick={() => applyDayProfile(day, profile.type)}
                            className={`w-full border px-1 py-0.5 text-[8px] font-bold uppercase ${
                              current === profile.type
                                ? 'border-[#efe56b] bg-[#efe56b] text-[#2e1f4a]'
                                : 'border-[#2a8a2b] bg-[#0a2e0d] text-[#98ca7a] hover:bg-[#1a4a1e]'
                            }`}
                            style={{ fontFamily: MONO }}
                          >
                            {profile.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Schedule analysis */}
      <div className="border-2 border-[#2a8a2b] bg-[#0d3f10] p-2">
        <h4 className="text-[9px] font-bold uppercase text-[#efe56b] mb-1">Schedule Analysis</h4>
        <div className="flex flex-wrap gap-3 text-[10px]" style={{ fontFamily: MONO }}>
          {DAY_TYPES.map((d) => {
            const count = schedule.filter((s) => s.type === d.key).length;
            return (
              <span key={d.key} className="text-[#98ca7a]">
                {d.label}: <strong className="text-white">{count}</strong>
              </span>
            );
          })}
          {(() => {
            const restDays = schedule.filter((s) => s.type === 'rest' || s.type === 'recovery').length;
            const hardDays = schedule.filter((s) => s.type === 'fitness' || s.type === 'technical' || s.type === 'tactical').length;
            const balance = restDays >= 2 ? 'Balanced' : restDays >= 1 ? 'Moderate' : 'Intensive';
            const balColor = restDays >= 2 ? 'text-[#2a8a2b]' : restDays >= 1 ? 'text-[#efe56b]' : 'text-[#ff4444]';
            return (
              <>
                <span className="text-[#6b9a5a]">|</span>
                <span className="text-[#98ca7a]">Hard Days: <strong className="text-white">{hardDays}</strong></span>
                <span className="text-[#98ca7a]">Rest Days: <strong className="text-white">{restDays}</strong></span>
                <span className="text-[#98ca7a]">Balance: <strong className={balColor}>{balance}</strong></span>
              </>
            );
          })()}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════
   Youth Academy Tab
   ══════════════════════════════════════════════ */

function YouthTab({ youth, onSetFocus, onSetIntensity, onPromote, onRelease, onTrain, onAutoSelectYouthTraining }: {
  youth: YouthPlayer[];
  onSetFocus: (id: string, focus: TrainingFocus) => void;
  onSetIntensity: (id: string, intensity: Intensity) => void;
  onPromote: (id: string) => void;
  onRelease: (id: string) => void;
  onTrain: (id: string) => void;
  onAutoSelectYouthTraining: () => void;
}) {
  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <h3 className="text-sm font-black uppercase text-[#00e5ff]" style={{ fontFamily: RETRO }}>
          Youth Academy ({youth.length} players)
        </h3>
        <ActionBtn onClick={onAutoSelectYouthTraining} variant="yellow">Auto Select Youth</ActionBtn>
      </div>

      {youth.length === 0 ? (
        <div className="border-2 border-[#2a8a2b] bg-[#0d3f10] p-6 text-center text-xs text-[#6b9a5a] italic">
          No youth players available. New intake due next season.
        </div>
      ) : (
        <div className="border-2 border-[#2a8a2b] bg-[#0d3f10]">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-[#2a8a2b]">
                <th className="py-1 px-2 text-left text-[9px] font-bold uppercase text-[#efe56b]">Player</th>
                <th className="py-1 px-2 text-left text-[9px] font-bold uppercase text-[#efe56b]">Age</th>
                <th className="py-1 px-2 text-left text-[9px] font-bold uppercase text-[#efe56b]">Position</th>
                <th className="py-1 px-2 text-left text-[9px] font-bold uppercase text-[#efe56b]">Potential</th>
                <th className="py-1 px-2 text-left text-[9px] font-bold uppercase text-[#efe56b]">Development</th>
                <th className="py-1 px-2 text-left text-[9px] font-bold uppercase text-[#efe56b]">Fitness</th>
                <th className="py-1 px-2 text-left text-[9px] font-bold uppercase text-[#efe56b]">Fatigue</th>
                <th className="py-1 px-2 text-left text-[9px] font-bold uppercase text-[#efe56b]">Focus</th>
                <th className="py-1 px-2 text-left text-[9px] font-bold uppercase text-[#efe56b]">Intensity</th>
                <th className="py-1 px-2 text-left text-[9px] font-bold uppercase text-[#efe56b]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {youth.map((p) => {
                const potColor = p.potential >= 85 ? 'text-[#2a8a2b]' : p.potential >= 70 ? 'text-[#efe56b]' : p.potential >= 55 ? 'text-[#ff8844]' : 'text-[#6b9a5a]';
                const fatColor = p.fatigue < 30 ? 'text-[#2a8a2b]' : p.fatigue < 60 ? 'text-[#efe56b]' : 'text-[#ff4444]';
                return (
                  <tr key={p.id} className="border-b border-[#1a5a1e] hover:bg-[#1a4a1e]">
                    <td className="py-1 px-2 text-xs font-bold uppercase text-[#d5f8b6]" style={{ fontFamily: MONO }}>{p.name}</td>
                    <td className="py-1 px-2 text-[10px] text-white font-mono">{p.age}</td>
                    <td className="py-1 px-2 text-[10px] text-[#00e5ff] uppercase font-mono">{p.position}</td>
                    <td className={`py-1 px-2 text-[10px] font-bold font-mono ${potColor}`}>{p.potential}</td>
                    <td className="py-1 px-2">
                      <div className="flex items-center gap-1">
                        <div className="flex-1 h-2 bg-[#0a2e0d] border border-[#1a5a1e]">
                          <div className="h-full bg-[#2a8a2b]" style={{ width: `${p.development}%` }} />
                        </div>
                        <span className="text-[9px] text-white font-mono w-7 text-right">{p.development}%</span>
                      </div>
                    </td>
                    <td className="py-1 px-2"><StatusBadge value={p.fitness} /></td>
                    <td className={`py-1 px-2 text-[10px] font-bold font-mono ${fatColor}`}>{p.fatigue}</td>
                    <td className="py-1 px-2">
                      <select
                        value={p.focus}
                        onChange={(e) => onSetFocus(p.id, e.target.value as TrainingFocus)}
                        className="bg-[#0a2e0d] border border-[#2a8a2b] text-[#d5f8b6] text-[9px] px-1 py-0.5"
                      >
                        {FOCUS_OPTIONS.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}
                      </select>
                    </td>
                    <td className="py-1 px-2">
                      <select
                        value={p.intensity}
                        onChange={(e) => onSetIntensity(p.id, e.target.value as Intensity)}
                        className="bg-[#0a2e0d] border border-[#2a8a2b] text-[#d5f8b6] text-[9px] px-1 py-0.5"
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                      </select>
                    </td>
                    <td className="py-1 px-2">
                      <div className="flex gap-1">
                        <ActionBtn onClick={() => onTrain(p.id)} variant="green">Train</ActionBtn>
                        {p.age >= 17 && <ActionBtn onClick={() => onPromote(p.id)} variant="yellow">Promote</ActionBtn>}
                        <ActionBtn onClick={() => onRelease(p.id)} variant="red">Release</ActionBtn>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════
   Development Tracking Tab
   ══════════════════════════════════════════════ */

function DevelopmentTab({ squad, trainingStates, teamIntensity }: {
  squad: SquadPlayer[];
  trainingStates: Map<string, PlayerTrainingState>;
  teamIntensity: Intensity;
}) {
  const [sortBy, setSortBy] = useState<string>('gains');

  const playerData = useMemo(() => {
    return squad.map((p) => {
      const ts = trainingStates.get(p.id);
      const gains = ts?.gains ?? {};
      const totalGain = Object.values(gains).reduce((s, v) => s + v, 0);
      const fat = playerFatigue(p, ts);
      const risk = injuryRisk(fat, ts?.intensity ?? teamIntensity);
      const growth = growthRate(ts?.intensity ?? teamIntensity, fat, p.morale);
      return { player: p, gains, totalGain, fat, risk, growth, ts };
    });
  }, [squad, trainingStates, teamIntensity]);

  const sorted = useMemo(() => {
    const list = [...playerData];
    switch (sortBy) {
      case 'gains': list.sort((a, b) => b.totalGain - a.totalGain); break;
      case 'growth': list.sort((a, b) => b.growth - a.growth); break;
      case 'name': list.sort((a, b) => a.player.name.localeCompare(b.player.name)); break;
      case 'risk': list.sort((a, b) => b.risk - a.risk); break;
    }
    return list;
  }, [playerData, sortBy]);

  const thCls = 'py-1 px-1 text-left text-[9px] font-bold uppercase text-[#efe56b] cursor-pointer hover:text-white';

  const changeArrow = (v: number) => {
    if (v > 0) return <span className="text-[#2a8a2b]">↑{v}</span>;
    if (v < 0) return <span className="text-[#ff4444]">↓{Math.abs(v)}</span>;
    return <span className="text-[#555]">—</span>;
  };

  return (
    <div>
      <h3 className="mb-2 text-sm font-black uppercase text-[#00e5ff]" style={{ fontFamily: RETRO }}>
        Development Tracking
      </h3>

      <div className="border-2 border-[#2a8a2b] bg-[#0d3f10] overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b-2 border-[#2a8a2b]">
              <th className={thCls} onClick={() => setSortBy('name')}>Player</th>
              <th className={thCls}>Position</th>
              <th className={thCls}>Overall</th>
              <th className={thCls} onClick={() => setSortBy('growth')}>Growth Rate</th>
              <th className={thCls} onClick={() => setSortBy('gains')}>Total Gains</th>
              <th className={thCls}>Passing</th>
              <th className={thCls}>Shooting</th>
              <th className={thCls}>Speed</th>
              <th className={thCls}>Stamina</th>
              <th className={thCls}>Vision</th>
              <th className={thCls}>Fitness</th>
              <th className={thCls} onClick={() => setSortBy('risk')}>Injury Risk</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(({ player: p, gains, totalGain, risk, growth }) => {
              const riskColor = risk < 30 ? 'text-[#2a8a2b]' : risk < 60 ? 'text-[#efe56b]' : 'text-[#ff4444]';
              return (
                <tr key={p.id} className="border-b border-[#1a5a1e] hover:bg-[#1a4a1e]">
                  <td className="py-1 px-1 text-xs font-bold uppercase text-[#d5f8b6]" style={{ fontFamily: MONO }}>{p.name}</td>
                  <td className="py-1 px-1 text-[10px] text-[#00e5ff] uppercase font-mono">{p.role}</td>
                  <td className="py-1 px-1 text-[10px] text-white font-bold font-mono">{overall(p)}</td>
                  <td className="py-1 px-1 text-[10px] text-[#efe56b] font-bold font-mono">{growth.toFixed(1)}x</td>
                  <td className="py-1 px-1 text-[10px] font-bold font-mono">
                    {totalGain > 0 ? <span className="text-[#2a8a2b]">+{totalGain}</span> : <span className="text-[#6b9a5a]">0</span>}
                  </td>
                  <td className="py-1 px-1 text-[10px] font-mono">{changeArrow(gains['passing'] ?? 0)}</td>
                  <td className="py-1 px-1 text-[10px] font-mono">{changeArrow(gains['shooting'] ?? 0)}</td>
                  <td className="py-1 px-1 text-[10px] font-mono">{changeArrow(gains['speed'] ?? 0)}</td>
                  <td className="py-1 px-1 text-[10px] font-mono">{changeArrow(gains['stamina'] ?? 0)}</td>
                  <td className="py-1 px-1 text-[10px] font-mono">{changeArrow(gains['vision'] ?? 0)}</td>
                  <td className="py-1 px-1"><StatusBadge value={p.fitness} /></td>
                  <td className={`py-1 px-1 text-[10px] font-bold font-mono ${riskColor}`}>{risk}%</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {sorted.length === 0 && (
        <div className="border-2 border-[#2a8a2b] bg-[#0d3f10] p-4 text-center text-xs text-[#6b9a5a] italic">
          No training data available yet. Run training sessions to see development progress.
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════
   Main Component
   ══════════════════════════════════════════════ */

export default function TrainingGround({ activeClub, squadPlayers }: TrainingGroundProps) {
  const [tab, setTab] = useState<TabKey>('overview');
  const [teamIntensity, setTeamIntensity] = useState<Intensity>('medium');
  const [teamFocus, setTeamFocus] = useState<TeamFocus>('balanced');
  const [selectedPlayer, setSelectedPlayer] = useState<SquadPlayer | null>(null);
  const [schedule, setSchedule] = useState<ScheduleDay[]>(DEFAULT_SCHEDULE);
  const [trainingStates, setTrainingStates] = useState<Map<string, PlayerTrainingState>>(new Map());
  const [log, setLog] = useState<string[]>([]);

  const youthBase = useMemo(() => generateYouth(activeClub.id), [activeClub.id]);
  const [youthPlayers, setYouthPlayers] = useState<YouthPlayer[]>(youthBase);

  const addLog = useCallback((msg: string) => {
    setLog((prev) => [msg, ...prev].slice(0, 40));
  }, []);

  const getOrCreateTS = useCallback((id: string): PlayerTrainingState => {
    const existing = trainingStates.get(id);
    if (existing) return existing;
    return { focus: 'balanced', intensity: teamIntensity, resting: false, recovering: false, fatigue: 0, fitnessBoost: 0, gains: {} };
  }, [trainingStates, teamIntensity]);

  const updateTS = useCallback((id: string, updater: (ts: PlayerTrainingState) => PlayerTrainingState) => {
    setTrainingStates((prev) => {
      const next = new Map(prev);
      const current = next.get(id) ?? { focus: 'balanced' as TrainingFocus, intensity: teamIntensity, resting: false, recovering: false, fatigue: 0, fitnessBoost: 0, gains: {} };
      next.set(id, updater(current));
      return next;
    });
  }, [teamIntensity]);

  // Squad training actions
  const handleSetPlayerFocus = useCallback((id: string, focus: TrainingFocus) => {
    updateTS(id, (ts) => ({ ...ts, focus }));
    const p = squadPlayers.find((s) => s.id === id);
    if (p) addLog(`${p.name}'s training focus set to ${focus}.`);
  }, [updateTS, squadPlayers, addLog]);

  const handleSetPlayerIntensity = useCallback((id: string, intensity: Intensity) => {
    updateTS(id, (ts) => ({ ...ts, intensity }));
    const p = squadPlayers.find((s) => s.id === id);
    if (p) addLog(`${p.name}'s intensity set to ${intensity}.`);
  }, [updateTS, squadPlayers, addLog]);

  const handleRest = useCallback((id: string) => {
    updateTS(id, (ts) => ({
      ...ts,
      resting: !ts.resting,
      recovering: false,
      fatigue: ts.resting ? ts.fatigue : Math.max(0, ts.fatigue - 15),
    }));
    const p = squadPlayers.find((s) => s.id === id);
    const ts = getOrCreateTS(id);
    if (p) addLog(ts.resting ? `${p.name} returned to training.` : `${p.name} sent to rest. Fatigue reducing.`);
  }, [updateTS, squadPlayers, getOrCreateTS, addLog]);

  const handleRecover = useCallback((id: string) => {
    updateTS(id, (ts) => ({
      ...ts,
      recovering: !ts.recovering,
      resting: false,
      fatigue: ts.recovering ? ts.fatigue : Math.max(0, ts.fatigue - 10),
    }));
    const p = squadPlayers.find((s) => s.id === id);
    const ts = getOrCreateTS(id);
    if (p) addLog(ts.recovering ? `${p.name} left recovery.` : `${p.name} sent to recovery programme.`);
  }, [updateTS, squadPlayers, getOrCreateTS, addLog]);

  const handleTrain = useCallback((id: string) => {
    const p = squadPlayers.find((s) => s.id === id);
    if (!p) return;
    const ts = getOrCreateTS(id);
    if (ts.resting || ts.recovering) {
      addLog(`${p.name} is resting/recovering and cannot train right now.`);
      return;
    }

    const fat = playerFatigue(p, ts);
    const growth = growthRate(ts.intensity, fat, p.morale);
    const focusKey = ts.focus;

    // Calculate gains
    const gains = { ...(ts.gains ?? {}) };
    if (focusKey === 'balanced') {
      const allSkills = ['passing', 'shooting', 'speed', 'stamina', 'vision'];
      for (const skill of allSkills) {
        const gain = Math.round(growth * 0.4 * (0.5 + sr(hs(id + skill + Date.now())) * 0.5));
        if (gain > 0) gains[skill] = (gains[skill] ?? 0) + gain;
      }
    } else {
      const gain = Math.max(1, Math.round(growth * (0.5 + sr(hs(id + focusKey + Date.now())) * 1.0)));
      gains[focusKey] = (gains[focusKey] ?? 0) + gain;
      // Small secondary gains
      const secondary = focusKey === 'shooting' ? 'composure' : focusKey === 'passing' ? 'vision' : focusKey === 'speed' ? 'stamina' : 'positioning';
      const secGain = Math.round(gain * 0.3);
      if (secGain > 0) gains[secondary] = (gains[secondary] ?? 0) + secGain;
    }

    // Increase fatigue
    const fatGain = ts.intensity === 'high' ? 12 : ts.intensity === 'medium' ? 6 : 3;

    updateTS(id, (prev) => ({
      ...prev,
      fatigue: Math.min(100, prev.fatigue + fatGain),
      gains,
    }));

    const totalGain = Object.values(gains).reduce((s, v) => s + v, 0);
    addLog(`${p.name} completed a ${ts.intensity} ${focusKey} session. +${totalGain - Object.values(ts.gains ?? {}).reduce((s, v) => s + v, 0)} skill points. Fatigue +${fatGain}.`);
  }, [squadPlayers, getOrCreateTS, updateTS, addLog]);

  const handleAutoSelectTraining = useCallback(() => {
    setTrainingStates((prev) => {
      const next = new Map(prev);
      let recoverCount = 0;
      let restCount = 0;
      for (const player of squadPlayers) {
        const current = next.get(player.id) ?? {
          focus: 'balanced' as TrainingFocus,
          intensity: teamIntensity,
          resting: false,
          recovering: false,
          fatigue: 0,
          fitnessBoost: 0,
          gains: {},
        };
        const fatigue = playerFatigue(player, current);
        const risk = injuryRisk(fatigue, current.intensity);
        const recommendation = recommendTrainingPlan(player, fatigue, risk, teamFocus);
        const { focus, intensity, recovering, resting } = recommendation;
        if (recovering) recoverCount += 1;
        if (resting) restCount += 1;
        next.set(player.id, {
          ...current,
          focus,
          intensity,
          recovering,
          resting,
        });
      }
      addLog(`Auto training applied: ${recoverCount} recovering, ${restCount} resting, focus/intensity tuned for ${squadPlayers.length} players.`);
      return next;
    });
  }, [addLog, squadPlayers, teamFocus, teamIntensity]);

  const handleAutoPlanForPlayer = useCallback((id: string) => {
    const player = squadPlayers.find((s) => s.id === id);
    if (!player) return;
    const current = getOrCreateTS(id);
    const fatigue = playerFatigue(player, current);
    const risk = injuryRisk(fatigue, current.intensity);
    const recommendation = recommendTrainingPlan(player, fatigue, risk, teamFocus);
    updateTS(id, (ts) => ({
      ...ts,
      focus: recommendation.focus,
      intensity: recommendation.intensity,
      resting: recommendation.resting,
      recovering: recommendation.recovering,
    }));
    addLog(`${player.name}: auto plan set to ${recommendation.focus}/${recommendation.intensity}${recommendation.recovering ? ' + recovery' : recommendation.resting ? ' + rest' : ''}.`);
  }, [addLog, getOrCreateTS, squadPlayers, teamFocus, updateTS]);

  // Schedule actions
  const handleScheduleChange = useCallback((day: string, type: DayType) => {
    setSchedule((prev) => prev.map((s) => s.day === day ? { ...s, type } : s));
  }, []);

  const handleApplyPreset = useCallback((preset: DayType[]) => {
    setSchedule(DAYS.map((day, i) => ({ day, type: preset[i] })));
    addLog('Applied new training schedule preset.');
  }, [addLog]);

  // Youth actions
  const handleYouthSetFocus = useCallback((id: string, focus: TrainingFocus) => {
    setYouthPlayers((prev) => prev.map((p) => p.id === id ? { ...p, focus } : p));
    const p = youthPlayers.find((y) => y.id === id);
    if (p) addLog(`${p.name}'s youth training focus set to ${focus}.`);
  }, [youthPlayers, addLog]);

  const handleYouthSetIntensity = useCallback((id: string, intensity: Intensity) => {
    setYouthPlayers((prev) => prev.map((p) => p.id === id ? { ...p, intensity } : p));
  }, []);

  const handleYouthTrain = useCallback((id: string) => {
    setYouthPlayers((prev) => prev.map((p) => {
      if (p.id !== id) return p;
      const growth = p.intensity === 'high' ? 8 : p.intensity === 'medium' ? 5 : 3;
      const fatGain = p.intensity === 'high' ? 15 : p.intensity === 'medium' ? 8 : 4;
      return {
        ...p,
        development: Math.min(100, p.development + growth),
        fatigue: Math.min(100, p.fatigue + fatGain),
        fitness: Math.min(100, p.fitness + (p.focus === 'fitness' || p.focus === 'stamina' ? 2 : 0)),
      };
    }));
    const p = youthPlayers.find((y) => y.id === id);
    if (p) addLog(`${p.name} completed a youth training session.`);
  }, [youthPlayers, addLog]);

  const handleAutoSelectYouthTraining = useCallback(() => {
    setYouthPlayers((prev) => {
      const next = prev.map((p) => {
        const focus = p.fatigue >= 50 ? 'fitness' : pickYouthFocus(p.position);
        const intensity: Intensity = p.fatigue >= 70 ? 'low' : p.potential >= 80 && p.age <= 17 ? 'high' : 'medium';
        return { ...p, focus, intensity };
      });
      addLog(`Auto youth training applied for ${next.length} academy players.`);
      return next;
    });
  }, [addLog]);

  const handleYouthPromote = useCallback((id: string) => {
    const p = youthPlayers.find((y) => y.id === id);
    if (p) {
      setYouthPlayers((prev) => prev.filter((y) => y.id !== id));
      addLog(`${p.name} (${p.position}, potential ${p.potential}) promoted to the first team!`);
    }
  }, [youthPlayers, addLog]);

  const handleYouthRelease = useCallback((id: string) => {
    const p = youthPlayers.find((y) => y.id === id);
    if (p) {
      setYouthPlayers((prev) => prev.filter((y) => y.id !== id));
      addLog(`${p.name} released from the youth academy.`);
    }
  }, [youthPlayers, addLog]);

  return (
    <section className="border-4 border-[#6f4ca1] bg-[#16a51c] p-3">
      {/* Title */}
      <h2 className="mb-3 border border-[#ceb8e1] bg-[#d5b5ec] p-2 text-center text-sm font-bold uppercase text-[#2e1f4a]">
        Training Ground
      </h2>

      {/* Overview bar */}
      <TrainingOverviewBar squad={squadPlayers} trainingStates={trainingStates} teamIntensity={teamIntensity} teamFocus={teamFocus} />

      {/* Tabs */}
      <div className="mb-3 flex flex-wrap gap-1 border-2 border-[#2a8a2b] bg-[#0d3f10] p-2">
        {TABS.map((t) => (
          <Btn key={t.key} active={tab === t.key} onClick={() => setTab(t.key)}>{t.label}</Btn>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'overview' && (
        <OverviewTab
          squad={squadPlayers} trainingStates={trainingStates}
          teamIntensity={teamIntensity} teamFocus={teamFocus}
          onSetIntensity={setTeamIntensity} onSetFocus={setTeamFocus}
          setTab={setTab}
        />
      )}
      {tab === 'squad' && (
        <SquadTrainingTab
          squad={squadPlayers} trainingStates={trainingStates} teamIntensity={teamIntensity}
          onSetFocus={handleSetPlayerFocus} onSetIntensity={handleSetPlayerIntensity}
          onAutoSelectTraining={handleAutoSelectTraining}
          onRest={handleRest} onRecover={handleRecover} onSelect={(p) => { setSelectedPlayer(p); setTab('individual'); }}
        />
      )}
      {tab === 'individual' && (
        <IndividualTab
          squad={squadPlayers} trainingStates={trainingStates} teamIntensity={teamIntensity} teamFocus={teamFocus}
          selectedPlayer={selectedPlayer} onSelect={setSelectedPlayer}
          onSetFocus={handleSetPlayerFocus} onSetIntensity={handleSetPlayerIntensity}
          onRest={handleRest} onRecover={handleRecover} onTrain={handleTrain}
          onAutoPlan={handleAutoPlanForPlayer}
        />
      )}
      {tab === 'schedule' && (
        <ScheduleTab schedule={schedule} onChange={handleScheduleChange} onApplyPreset={handleApplyPreset} />
      )}
      {tab === 'youth' && (
        <YouthTab
          youth={youthPlayers}
          onSetFocus={handleYouthSetFocus} onSetIntensity={handleYouthSetIntensity}
          onAutoSelectYouthTraining={handleAutoSelectYouthTraining}
          onPromote={handleYouthPromote} onRelease={handleYouthRelease} onTrain={handleYouthTrain}
        />
      )}
      {tab === 'development' && (
        <DevelopmentTab squad={squadPlayers} trainingStates={trainingStates} teamIntensity={teamIntensity} />
      )}

      {/* Activity log */}
      {log.length > 0 && (
        <div className="mt-3 border-2 border-[#2a8a2b] bg-[#0a2e0d] p-2 max-h-32 overflow-y-auto">
          <h4 className="text-[9px] font-bold uppercase text-[#6b9a5a] mb-1">Training Log</h4>
          {log.map((msg, i) => (
            <div key={i} className="text-[9px] text-[#98ca7a] border-b border-[#1a3a1e] py-0.5" style={{ fontFamily: MONO }}>
              {msg}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
