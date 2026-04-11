import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  type GameState,
  type GameClub,
  type MatchFixture,
  type InteractiveMatchState,
  type MatchEvent,
  type MatchStats,
  type Standing,
  type TacticConfig,
  initializeGame,
  loadGameState,
  saveGameState,
  clearGameState,
  getWeekFixtures,
  isPlayerFixture,
  simulateAIFixtures,
  applyMatchResult,
  processCupRounds,
  advanceWeek,
  createInteractiveMatch,
  tickInteractiveMatch,
  recordInteractiveResult,
  HOME_POSITIONS,
  AWAY_POSITIONS,
  POSITION_LABELS,
  getFormationPositions,
  formationToHomePitch,
  formationToAwayPitch,
} from '../engine/footballEngine';
import type { FullTactic, OffensiveRun, DefensiveRun } from '../engine/tacticsSystem';
import { TACTIC_PRESETS, createTacticFromPreset } from '../engine/tacticsSystem';

/* ── Prop types (matching App.tsx definitions) ── */
interface Club {
  id: string;
  name: string;
  country: string;
  budget: number;
  reputation: number;
  leagueId?: string | null;
  leagueName?: string | null;
}

interface SquadPlayer {
  id: string;
  name: string;
  age: number;
  role: string;
  pac: number;
  sho: number;
  pas: number;
  dri: number;
  def: number;
  phy: number;
  morale: number;
  stamina: number;
  form: number;
  potential: number;
}

interface GameDashboardProps {
  clubs: Club[];
  activeClub: Club;
  squadPlayers: SquadPlayer[];
  activeTactic?: FullTactic | null;
}

/* ── Helpers ── */
function hashStr(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function getPlayerNamesForClub(clubName: string, clubId: string): string[] {
  const seed = hashStr(clubId);
  const firstNames = ['James', 'Oliver', 'Ethan', 'Noah', 'Liam', 'Jacob', 'Samuel', 'Leo', 'Mason', 'Ryan', 'Ben'];
  const lastNames = ['Walker', 'Brown', 'Taylor', 'Wilson', 'Evans', 'King', 'Parker', 'Scott', 'Davies', 'Roberts', 'Hall'];
  return Array.from({ length: 11 }, (_, i) => {
    const fi = (seed + i * 7) % firstNames.length;
    const li = (seed + i * 11) % lastNames.length;
    return `${firstNames[fi]} ${lastNames[li]}`;
  });
}

/* ══════════════════════════════════════════════
   SUB-COMPONENTS
   ══════════════════════════════════════════════ */

/* ── Pitch Visualization (SVG) ── */
function PitchView({
  homePositions,
  awayPositions,
  homeLabels,
  awayLabels,
  ballPos,
  homeColor = '#3b82f6',
  awayColor = '#ef4444',
  homeRuns,
  awayRuns,
  possession,
}: {
  homePositions: [number, number][];
  awayPositions: [number, number][];
  homeLabels?: string[];
  awayLabels?: string[];
  ballPos: [number, number];
  homeColor?: string;
  awayColor?: string;
  homeRuns?: OffensiveRun[];
  awayRuns?: OffensiveRun[];
  possession?: 'HOME' | 'AWAY';
}) {
  const hLabels = homeLabels ?? POSITION_LABELS;
  const aLabels = awayLabels ?? POSITION_LABELS;

  // Track previous ball position for the trail line
  const prevBallRef = useRef<[number, number]>(ballPos);
  const prevBall = prevBallRef.current;
  useEffect(() => {
    prevBallRef.current = ballPos;
  }, [ballPos]);

  const ballColor = possession === 'HOME' ? homeColor : possession === 'AWAY' ? awayColor : '#ffffff';
  const PT = 'cx 0.42s ease-in-out, cy 0.42s ease-in-out';
  const LT = 'x 0.42s ease-in-out, y 0.42s ease-in-out';
  const BT = 'cx 0.28s ease, cy 0.28s ease';

  // Generate offensive run arrows — animated marching dashes
  const renderRunLines = (positions: [number, number][], runs: OffensiveRun[] | undefined, color: string, isHome: boolean) => {
    if (!runs || runs.length === 0) return null;
    const arrows: React.ReactNode[] = [];
    const dir = isHome ? -1 : 1;
    const runSet = new Set(runs);
    const anim = { style: { animation: 'march 0.65s linear infinite' } };

    if (runSet.has('overlap-runs') && positions.length >= 5) {
      for (const idx of [1, Math.min(4, positions.length - 1)]) {
        const [x, y] = positions[idx];
        arrows.push(<line key={`ovr-${idx}`} x1={x} y1={y} x2={x} y2={y + dir * 16} stroke={color} strokeWidth="0.55" strokeDasharray="1.5,1" opacity="0.7" markerEnd="url(#arrowHead)" {...anim} />);
      }
    }
    if (runSet.has('runs-behind')) {
      for (let i = positions.length - 3; i < positions.length; i++) {
        if (i < 0) continue;
        const [x, y] = positions[i];
        if ((isHome && y < 78) || (!isHome && y > 72)) {
          arrows.push(<line key={`rb-${i}`} x1={x} y1={y} x2={x + (x < 50 ? 7 : -7)} y2={y + dir * 13} stroke={color} strokeWidth="0.55" strokeDasharray="1.5,1" opacity="0.65" markerEnd="url(#arrowHead)" {...anim} />);
        }
      }
    }
    if (runSet.has('inside-forward-cut')) {
      for (let i = 0; i < positions.length; i++) {
        const [x, y] = positions[i];
        if (x < 28 && y < (isHome ? 85 : 125)) arrows.push(<line key={`ifc-l-${i}`} x1={x} y1={y} x2={x + 14} y2={y + dir * 9} stroke={color} strokeWidth="0.55" strokeDasharray="1.5,1" opacity="0.65" markerEnd="url(#arrowHead)" {...anim} />);
        if (x > 72 && y < (isHome ? 85 : 125)) arrows.push(<line key={`ifc-r-${i}`} x1={x} y1={y} x2={x - 14} y2={y + dir * 9} stroke={color} strokeWidth="0.55" strokeDasharray="1.5,1" opacity="0.65" markerEnd="url(#arrowHead)" {...anim} />);
      }
    }
    if (runSet.has('third-man-runs') && positions.length >= 8) {
      const [x, y] = positions[Math.floor(positions.length / 2)];
      arrows.push(<line key="tmr" x1={x} y1={y} x2={x} y2={y + dir * 18} stroke={color} strokeWidth="0.55" strokeDasharray="1.5,1" opacity="0.65" markerEnd="url(#arrowHead)" {...anim} />);
    }
    if (runSet.has('switch-play') && positions.length >= 5) {
      const midY = isHome ? 88 : 62;
      arrows.push(<line key="sp" x1={12} y1={midY} x2={88} y2={midY - dir * 4} stroke={color} strokeWidth="0.4" strokeDasharray="2,1.5" opacity="0.5" markerEnd="url(#arrowHead)" {...anim} />);
    }
    return <>{arrows}</>;
  };

  return (
    <svg viewBox="0 0 100 150" className="w-full h-full">
      <defs>
        <style>{`
          @keyframes march { from { stroke-dashoffset: 0; } to { stroke-dashoffset: -5; } }
          @keyframes ballglow { 0%,100% { opacity: 0.12; } 50% { opacity: 0.48; } }
        `}</style>
        <marker id="arrowHead" viewBox="0 0 6 6" refX="5" refY="3" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
          <path d="M0,0 L6,3 L0,6 Z" fill="#efe56b" opacity="0.85" />
        </marker>
        <radialGradient id="ballGrad" cx="38%" cy="32%" r="65%">
          <stop offset="0%" stopColor="white" />
          <stop offset="100%" stopColor="#bbb" />
        </radialGradient>
        <filter id="ballShadow" x="-80%" y="-80%" width="260%" height="260%">
          <feDropShadow dx="0" dy="0.4" stdDeviation="1" floodColor="rgba(0,0,0,0.65)" />
        </filter>
      </defs>

      {/* Alternating pitch stripes */}
      {[0, 1, 2, 3, 4].map(i => (
        <rect key={i} x="3" y={3 + i * 28.8} width="94" height="28.8" fill={i % 2 === 0 ? '#1a5e1a' : '#1c6b1c'} />
      ))}

      {/* Pitch markings */}
      <rect x="3" y="3" width="94" height="144" fill="none" stroke="#3a9a3a" strokeWidth="0.4" />
      <line x1="3" y1="75" x2="97" y2="75" stroke="#3a9a3a" strokeWidth="0.35" />
      <circle cx="50" cy="75" r="12" fill="none" stroke="#3a9a3a" strokeWidth="0.3" />
      <circle cx="50" cy="75" r="0.6" fill="#3a9a3a" />
      <rect x="25" y="3" width="50" height="20" fill="none" stroke="#3a9a3a" strokeWidth="0.3" />
      <rect x="25" y="127" width="50" height="20" fill="none" stroke="#3a9a3a" strokeWidth="0.3" />
      <rect x="35" y="3" width="30" height="8" fill="none" stroke="#3a9a3a" strokeWidth="0.3" />
      <rect x="35" y="139" width="30" height="8" fill="none" stroke="#3a9a3a" strokeWidth="0.3" />
      <circle cx="50" cy="16" r="0.5" fill="#3a9a3a" />
      <circle cx="50" cy="134" r="0.5" fill="#3a9a3a" />
      <rect x="42" y="0" width="16" height="3" fill="none" stroke="white" strokeWidth="0.5" />
      <rect x="42" y="147" width="16" height="3" fill="none" stroke="white" strokeWidth="0.5" />
      <path d="M3,6 A3,3 0 0,1 6,3" fill="none" stroke="#3a9a3a" strokeWidth="0.3" />
      <path d="M94,3 A3,3 0 0,1 97,6" fill="none" stroke="#3a9a3a" strokeWidth="0.3" />
      <path d="M3,144 A3,3 0 0,0 6,147" fill="none" stroke="#3a9a3a" strokeWidth="0.3" />
      <path d="M94,147 A3,3 0 0,0 97,144" fill="none" stroke="#3a9a3a" strokeWidth="0.3" />

      {/* Ball trail — shows direction of last pass/move */}
      <line
        x1={prevBall[0]} y1={prevBall[1]}
        x2={ballPos[0]} y2={ballPos[1]}
        stroke="rgba(255,255,180,0.55)" strokeWidth="0.7" strokeDasharray="1,0.7"
      />

      {/* Tactic run arrows */}
      {renderRunLines(homePositions, homeRuns, '#efe56b', true)}
      {renderRunLines(awayPositions, awayRuns, '#ff9999', false)}

      {/* Away players */}
      {awayPositions.map(([x, y], i) => (
        <g key={`away-${i}`}>
          <circle cx={x} cy={y} r="2.5" fill={awayColor} stroke="#000" strokeWidth="0.35" style={{ transition: PT }} />
          <text x={x} y={y + 0.85} textAnchor="middle" fontSize="2.1" fill="white" fontWeight="bold" style={{ transition: LT }}>{aLabels[i] ?? POSITION_LABELS[i]}</text>
        </g>
      ))}

      {/* Home players */}
      {homePositions.map(([x, y], i) => (
        <g key={`home-${i}`}>
          <circle cx={x} cy={y} r="2.5" fill={homeColor} stroke="#000" strokeWidth="0.35" style={{ transition: PT }} />
          <text x={x} y={y + 0.85} textAnchor="middle" fontSize="2.1" fill="white" fontWeight="bold" style={{ transition: LT }}>{hLabels[i] ?? POSITION_LABELS[i]}</text>
        </g>
      ))}

      {/* Ball glow (pulsing halo) */}
      <circle
        cx={ballPos[0]} cy={ballPos[1]} r="4.5"
        fill={ballColor} style={{ transition: BT, animation: 'ballglow 0.85s ease-in-out infinite' }}
      />

      {/* Ball */}
      <circle
        cx={ballPos[0]} cy={ballPos[1]} r="2"
        fill="url(#ballGrad)" stroke="#444" strokeWidth="0.25"
        filter="url(#ballShadow)"
        style={{ transition: BT }}
      />
    </svg>
  );
}

/* ── Match Stats Panel ── */
function StatsPanel({ stats, homeName, awayName }: { stats: MatchStats; homeName: string; awayName: string }) {
  const rows: [string, number, number][] = [
    ['Possession', stats.possession[0], stats.possession[1]],
    ['Shots', stats.shots[0], stats.shots[1]],
    ['On Target', stats.shotsOnTarget[0], stats.shotsOnTarget[1]],
    ['Fouls', stats.fouls[0], stats.fouls[1]],
    ['Corners', stats.corners[0], stats.corners[1]],
    ['Yellow Cards', stats.yellowCards[0], stats.yellowCards[1]],
    ['Red Cards', stats.redCards[0], stats.redCards[1]],
  ];
  return (
    <div className="border border-[#2a8a2b] bg-[#0a3d0e] p-2 text-xs">
      <h4 className="text-[10px] font-bold uppercase text-[#efe56b] mb-1 text-center">Match Stats</h4>
      <div className="grid grid-cols-3 gap-0.5 text-center mb-1.5">
        <span className="text-[9px] text-[#98ca7a] truncate">{homeName}</span>
        <span />
        <span className="text-[9px] text-[#98ca7a] truncate">{awayName}</span>
      </div>
      {rows.map(([label, h, a]) => (
        <div key={label} className="grid grid-cols-3 gap-0.5 text-center py-0.5 border-t border-[#1a5a1e]">
          <span className="text-white font-bold">{label === 'Possession' ? `${h}%` : h}</span>
          <span className="text-[#98ca7a] text-[10px]">{label}</span>
          <span className="text-white font-bold">{label === 'Possession' ? `${a}%` : a}</span>
        </div>
      ))}
    </div>
  );
}

/* ── Event Log ── */
function EventLog({
  events,
  homeNames,
  awayNames,
  homeName,
  awayName,
}: {
  events: MatchEvent[];
  homeNames: string[];
  awayNames: string[];
  homeName: string;
  awayName: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [viewMode, setViewMode] = useState<'highlights' | 'detail'>('highlights');
  useEffect(() => { ref.current?.scrollTo(0, ref.current.scrollHeight); }, [events.length]);

  const highlightTypes = new Set<string>(['GOAL', 'YELLOW_CARD', 'RED_CARD', 'HALF_TIME', 'FULL_TIME', 'SUBSTITUTION', 'INJURY']);
  const detailTypes = new Set<string>([
    'GOAL', 'SHOT', 'SHOT_ON_TARGET', 'SAVE', 'FOUL', 'YELLOW_CARD', 'RED_CARD',
    'CORNER', 'OFFSIDE', 'INJURY', 'SUBSTITUTION', 'HALF_TIME', 'FULL_TIME',
    'FREE_KICK', 'CLEARANCE', 'TACKLE', 'CHANCE_MISSED', 'LONG_BALL', 'COUNTER_ATTACK',
  ]);

  const filtered = events.filter((e) =>
    viewMode === 'highlights' ? highlightTypes.has(e.type) : detailTypes.has(e.type)
  );

  function describeEvent(e: MatchEvent): string {
    const names = e.team === 'HOME' ? homeNames : awayNames;
    const teamName = e.team === 'HOME' ? homeName : awayName;
    const player = e.playerIndex >= 0 && e.playerIndex < names.length ? names[e.playerIndex] : '';
    switch (e.type) {
      case 'GOAL': return `⚽ GOAL! ${player} scores for ${teamName}!`;
      case 'SHOT': return `💨 Shot by ${player} (${teamName})`;
      case 'SHOT_ON_TARGET': return `🎯 Shot on target by ${player}`;
      case 'SAVE': return `🧤 Great save by the ${teamName} keeper!`;
      case 'FOUL': return `⛔ Foul by ${player} (${teamName})`;
      case 'YELLOW_CARD': return `🟨 Yellow card: ${player} (${teamName})`;
      case 'RED_CARD': return `🟥 Red card: ${player} (${teamName})`;
      case 'CORNER': return `🚩 Corner kick for ${teamName}`;
      case 'OFFSIDE': return `🚫 ${player} caught offside`;
      case 'HALF_TIME': return '── Half-time ──';
      case 'FULL_TIME': return '── Full-time ──';
      case 'INJURY': return `🏥 Injury: ${player} (${teamName})`;
      case 'SUBSTITUTION': return `🔄 Substitution: ${player} (${teamName})`;
      case 'TACKLE': return `🦶 Strong tackle by ${player} (${teamName})`;
      case 'CLEARANCE': return `🛡️ Clearance by ${player} (${teamName})`;
      case 'CHANCE_MISSED': return `😤 Chance missed by ${player}!`;
      case 'LONG_BALL': return `📏 Long ball forward by ${player}`;
      case 'COUNTER_ATTACK': return `⚡ Counter-attack by ${teamName}!`;
      case 'FREE_KICK': return `🎯 Free kick for ${teamName}`;
      default: return `${e.type} (${teamName})`;
    }
  }

  return (
    <div className="border border-[#2a8a2b] bg-[#0a3d0e] p-2 text-xs">
      <div className="flex items-center justify-between mb-1">
        <h4 className="text-[10px] font-bold uppercase text-[#efe56b]">Event Log</h4>
        <div className="flex gap-0.5">
          <button
            onClick={() => setViewMode('highlights')}
            className={`px-1.5 py-0.5 text-[9px] font-bold border ${
              viewMode === 'highlights'
                ? 'border-[#efe56b] bg-[#efe56b] text-[#2e1f4a]'
                : 'border-[#2a8a2b] bg-[#1a3a1e] text-[#98ca7a]'
            }`}
          >
            Highlights
          </button>
          <button
            onClick={() => setViewMode('detail')}
            className={`px-1.5 py-0.5 text-[9px] font-bold border ${
              viewMode === 'detail'
                ? 'border-[#efe56b] bg-[#efe56b] text-[#2e1f4a]'
                : 'border-[#2a8a2b] bg-[#1a3a1e] text-[#98ca7a]'
            }`}
          >
            Detail
          </button>
        </div>
      </div>
      <div ref={ref} className="max-h-56 overflow-auto">
        {filtered.length === 0 ? (
          <p className="text-[#6b9a5a] italic text-[10px]">Waiting for kick-off...</p>
        ) : (
          <ul className="space-y-0.5">
            {filtered.map((e, i) => {
              const isGoal = e.type === 'GOAL';
              const isHalf = e.type === 'HALF_TIME' || e.type === 'FULL_TIME';
              return (
                <li
                  key={`${e.minute}-${e.type}-${i}`}
                  className={`px-1.5 py-0.5 ${
                    isGoal
                      ? 'bg-[#2a6a1b] border border-[#efe56b] text-[#efe56b] font-bold'
                      : isHalf
                        ? 'text-[#98ca7a] text-center font-bold border-t border-[#2a8a2b] mt-1'
                        : 'text-[#d5f8b6] border-l-2 border-[#2a8a2b]'
                  }`}
                >
                  <span className="font-mono text-white mr-1">{e.minute}&apos;</span>
                  {describeEvent(e)}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

/* ── Manager Controls ── */
function ManagerControls({
  tactics,
  currentFullTactic,
  speed,
  isRunning,
  isFinished,
  subsRemaining,
  substitutions,
  minute,
  playerNames,
  onTacticsChange,
  onFullTacticChange,
  onSpeedChange,
  onToggleRun,
  onSubstitute,
}: {
  tactics: TacticConfig;
  currentFullTactic: FullTactic | null | undefined;
  speed: number;
  isRunning: boolean;
  isFinished: boolean;
  subsRemaining: number;
  substitutions: { minute: number; team: 'HOME' | 'AWAY'; outIndex: number; inIndex: number }[];
  minute: number;
  playerNames: string[];
  onTacticsChange: (t: TacticConfig) => void;
  onFullTacticChange: (ft: FullTactic) => void;
  onSpeedChange: (s: number) => void;
  onToggleRun: () => void;
  onSubstitute: (outIndex: number, inIndex: number) => void;
}) {
  const [subMode, setSubMode] = useState(false);
  const [subOut, setSubOut] = useState<number | null>(null);

  const usedOutIndices = new Set(substitutions.map((s) => s.outIndex));
  const usedInIndices = new Set(substitutions.map((s) => s.inIndex));

  const handleStartSub = () => {
    setSubMode(true);
    setSubOut(null);
  };

  const handleConfirmSub = (inIndex: number) => {
    if (subOut !== null) {
      onSubstitute(subOut, inIndex);
      setSubMode(false);
      setSubOut(null);
    }
  };

  const handleCancelSub = () => {
    setSubMode(false);
    setSubOut(null);
  };

  return (
    <div className="border border-[#2a8a2b] bg-[#0a3d0e] p-2 text-xs">
      <h4 className="text-[10px] font-bold uppercase text-[#efe56b] mb-2">Manager Controls</h4>

      {/* Speed + Play/Pause */}
      <div className="flex items-center gap-1 mb-2">
        <span className="text-[#98ca7a] w-12">Speed:</span>
        {[1, 2, 4, 8].map((s) => (
          <button
            key={s}
            onClick={() => onSpeedChange(s)}
            className={`px-2 py-0.5 border font-bold ${
              speed === s ? 'border-[#efe56b] bg-[#efe56b] text-[#2e1f4a]' : 'border-[#2a8a2b] bg-[#1a3a1e] text-[#98ca7a]'
            }`}
          >
            {s}x
          </button>
        ))}
        <button
          onClick={onToggleRun}
          disabled={isFinished}
          className={`ml-2 px-3 py-0.5 border font-bold ${
            isFinished
              ? 'border-[#666] bg-[#333] text-[#666] cursor-not-allowed'
              : isRunning
                ? 'border-[#ef4444] bg-[#7f1d1d] text-[#ef4444]'
                : 'border-[#22c55e] bg-[#14532d] text-[#22c55e]'
          }`}
        >
          {isFinished ? 'Finished' : isRunning ? '⏸ Pause' : '▶ Play'}
        </button>
      </div>

      {/* Mentality */}
      <div className="flex items-center gap-1 mb-2">
        <span className="text-[#98ca7a] w-12">Style:</span>
        {(['Defensive', 'Balanced', 'Attacking'] as const).map((m) => (
          <button
            key={m}
            onClick={() => onTacticsChange({ ...tactics, mentality: m })}
            className={`px-2 py-0.5 border font-bold ${
              tactics.mentality === m
                ? 'border-[#efe56b] bg-[#efe56b] text-[#2e1f4a]'
                : 'border-[#2a8a2b] bg-[#1a3a1e] text-[#98ca7a]'
            }`}
          >
            {m}
          </button>
        ))}
      </div>

      {/* Sliders */}
      <div className="grid grid-cols-3 gap-2 mb-2">
        {(['tempo', 'pressing', 'width'] as const).map((key) => (
          <div key={key}>
            <label className="block text-[10px] text-[#98ca7a] capitalize mb-0.5">{key}: {tactics[key]}</label>
            <input
              type="range"
              min={0}
              max={100}
              value={tactics[key]}
              onChange={(e) => onTacticsChange({ ...tactics, [key]: Number(e.target.value) })}
              className="w-full h-1.5 accent-[#efe56b] bg-[#1a3a1e]"
            />
          </div>
        ))}
      </div>

      {/* Tactic Preset Switcher — always visible grid */}
      <div className="border-t border-[#2a8a2b] pt-2 mb-2">
        <div className="text-[10px] font-bold uppercase text-[#efe56b] mb-1">
          Switch Tactic / Formation
          {currentFullTactic && (
            <span className="ml-2 text-white normal-case font-normal">
              Active: <span className="text-[#efe56b]">{currentFullTactic.name}</span>
              <span className="text-[#6b9a5a] ml-1">({currentFullTactic.formation})</span>
            </span>
          )}
        </div>
        {!isFinished ? (
          <div className="grid grid-cols-2 gap-0.5">
            {TACTIC_PRESETS.map((preset) => {
              const isActive = currentFullTactic?.styleId === preset.id;
              return (
                <button
                  key={preset.id}
                  onClick={() => {
                    const ft = createTacticFromPreset(preset);
                    onFullTacticChange(ft);
                    onTacticsChange({
                      mentality: preset.instructions.mentality ?? tactics.mentality,
                      tempo: preset.instructions.tempo ?? tactics.tempo,
                      pressing: preset.instructions.pressing ?? tactics.pressing,
                      width: preset.instructions.width ?? tactics.width,
                    });
                  }}
                  className={`text-left px-1.5 py-1 text-[9px] border flex justify-between items-center gap-1 ${
                    isActive
                      ? 'border-[#efe56b] bg-[#1a3a1e] text-[#efe56b] font-bold'
                      : 'border-[#2a4a2e] bg-[#0a180e] text-[#98ca7a] hover:bg-[#162a1a] hover:border-[#4a8a4e]'
                  }`}
                >
                  <span className="truncate">{preset.name}</span>
                  <span className="text-[#6b9a5a] shrink-0">{preset.formation}</span>
                </button>
              );
            })}
          </div>
        ) : (
          <p className="text-[9px] text-[#6b9a5a] italic">Match finished</p>
        )}
      </div>

      {/* Substitutions */}
      <div className="border-t border-[#2a8a2b] pt-2">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] font-bold uppercase text-[#efe56b]">
            Substitutions ({subsRemaining} remaining)
          </span>
          {!subMode && !isFinished && subsRemaining > 0 && minute > 0 && (
            <button
              onClick={handleStartSub}
              className="px-2 py-0.5 border border-[#22c55e] bg-[#14532d] text-[#22c55e] font-bold text-[10px]"
            >
              🔄 Make Sub
            </button>
          )}
          {subMode && (
            <button
              onClick={handleCancelSub}
              className="px-2 py-0.5 border border-[#ef4444] bg-[#7f1d1d] text-[#ef4444] font-bold text-[10px]"
            >
              ✕ Cancel
            </button>
          )}
        </div>

        {/* Active substitution selection */}
        {subMode && (
          <div className="space-y-1.5 bg-[#1a3a1e] p-1.5 border border-[#2a8a2b]">
            {subOut === null ? (
              <>
                <p className="text-[10px] text-[#efe56b] font-bold">Select player to take off:</p>
                <div className="grid grid-cols-3 gap-0.5">
                  {playerNames.slice(0, 11).map((name, idx) => (
                    <button
                      key={idx}
                      disabled={usedOutIndices.has(idx)}
                      onClick={() => setSubOut(idx)}
                      className={`px-1 py-0.5 text-[9px] border truncate ${
                        usedOutIndices.has(idx)
                          ? 'border-[#333] bg-[#222] text-[#555] cursor-not-allowed'
                          : 'border-[#2a8a2b] bg-[#0a3d0e] text-white hover:bg-[#2a8a2b]'
                      }`}
                    >
                      {POSITION_LABELS[idx]} {name.split(' ').pop()}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <>
                <p className="text-[10px] text-[#efe56b] font-bold">
                  Taking off: <span className="text-white">{playerNames[subOut]}</span> — Select replacement:
                </p>
                <div className="grid grid-cols-3 gap-0.5">
                  {playerNames.slice(11).map((name, relIdx) => {
                    const absIdx = relIdx + 11;
                    return (
                      <button
                        key={absIdx}
                        disabled={usedInIndices.has(absIdx)}
                        onClick={() => handleConfirmSub(absIdx)}
                        className={`px-1 py-0.5 text-[9px] border truncate ${
                          usedInIndices.has(absIdx)
                            ? 'border-[#333] bg-[#222] text-[#555] cursor-not-allowed'
                            : 'border-[#22c55e] bg-[#0a3d0e] text-[#22c55e] hover:bg-[#14532d]'
                        }`}
                      >
                        {name.split(' ').pop()}
                      </button>
                    );
                  })}
                </div>
                <button
                  onClick={() => setSubOut(null)}
                  className="text-[9px] text-[#98ca7a] underline"
                >
                  ← Back
                </button>
              </>
            )}
          </div>
        )}

        {/* Completed subs */}
        {substitutions.length > 0 && (
          <div className="mt-1 space-y-0.5">
            {substitutions.map((s, i) => (
              <div key={i} className="text-[9px] text-[#98ca7a]">
                <span className="font-mono text-white">{s.minute}&apos;</span>{' '}
                🔄 {playerNames[s.inIndex] ?? `Player ${s.inIndex}`} ↔ {playerNames[s.outIndex] ?? `Player ${s.outIndex}`}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Standings Table (compact) ── */
function StandingsTable({ standings, title, activeClubId }: { standings: Standing[]; title: string; activeClubId: string }) {
  return (
    <div className="border border-[#2a8a2b] bg-[#0a3d0e] p-2 text-xs">
      <h4 className="text-[10px] font-bold uppercase text-[#efe56b] mb-1">{title}</h4>
      <div className="max-h-52 overflow-auto">
        <table className="w-full border-collapse">
          <thead className="bg-[#1a3a1e] text-[#efe56b] sticky top-0">
            <tr>
              <th className="px-1 py-0.5 text-left">#</th>
              <th className="px-1 py-0.5 text-left">Team</th>
              <th className="px-1 py-0.5">P</th>
              <th className="px-1 py-0.5">W</th>
              <th className="px-1 py-0.5">D</th>
              <th className="px-1 py-0.5">L</th>
              <th className="px-1 py-0.5">GD</th>
              <th className="px-1 py-0.5">Pts</th>
              <th className="px-1 py-0.5">Form</th>
            </tr>
          </thead>
          <tbody>
            {standings.map((s, i) => (
              <tr
                key={s.teamId}
                className={`border-t border-[#1a5a1e] ${
                  s.teamId === activeClubId ? 'bg-[#1a5a28] font-bold' : i % 2 === 0 ? 'bg-[#0d4a12]' : ''
                }`}
              >
                <td className="px-1 py-0.5">{i + 1}</td>
                <td className="px-1 py-0.5 truncate max-w-[100px]">{s.teamName}</td>
                <td className="px-1 py-0.5 text-center">{s.played}</td>
                <td className="px-1 py-0.5 text-center">{s.won}</td>
                <td className="px-1 py-0.5 text-center">{s.drawn}</td>
                <td className="px-1 py-0.5 text-center">{s.lost}</td>
                <td className="px-1 py-0.5 text-center">{s.gd > 0 ? `+${s.gd}` : s.gd}</td>
                <td className="px-1 py-0.5 text-center text-[#efe56b] font-bold">{s.points}</td>
                <td className="px-1 py-0.5 text-center font-mono text-[10px]">
                  {s.form.split('').map((ch, fi) => (
                    <span key={fi} className={ch === 'W' ? 'text-[#22c55e]' : ch === 'L' ? 'text-[#ef4444]' : 'text-[#eab308]'}>
                      {ch}
                    </span>
                  ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── Fixture Result Row ── */
function FixtureRow({
  fixture,
  clubs,
  activeClubId,
  compact = false,
}: {
  fixture: MatchFixture;
  clubs: Record<string, GameClub>;
  activeClubId: string;
  compact?: boolean;
}) {
  const h = clubs[fixture.homeId];
  const a = clubs[fixture.awayId];
  const isPlayer = isPlayerFixture(fixture, activeClubId);
  const hName = h?.name ?? fixture.homeId.slice(0, 8);
  const aName = a?.name ?? fixture.awayId.slice(0, 8);

  return (
    <div
      className={`grid grid-cols-[1fr_60px_1fr] items-center gap-1 px-2 py-1 border-t border-[#1a5a1e] ${
        isPlayer ? 'bg-[#1a5a28] border-l-2 border-l-[#efe56b]' : ''
      }`}
    >
      <span className={`text-right truncate text-[11px] ${fixture.homeId === activeClubId ? 'text-[#efe56b] font-bold' : 'text-white'}`}>
        {hName}
      </span>
      <span className="font-mono font-black text-white text-center whitespace-nowrap">
        {fixture.played ? `${fixture.homeGoals} - ${fixture.awayGoals}` : 'vs'}
      </span>
      <span className={`truncate text-[11px] ${fixture.awayId === activeClubId ? 'text-[#efe56b] font-bold' : 'text-white'}`}>
        {aName}
      </span>
      {!compact && (
        <span className="col-span-3 text-[9px] text-[#6b9a5a] text-center">{fixture.compName}</span>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════
   MAIN VIEWS
   ══════════════════════════════════════════════ */

/* ── Week Overview (idle state) ── */
function WeekOverview({
  gameState,
  onStartMatchday,
  onResetSeason,
}: {
  gameState: GameState;
  onStartMatchday: () => void;
  onResetSeason: () => void;
}) {
  const fixtures = getWeekFixtures(gameState);
  const playerFixture = fixtures.find((f) => isPlayerFixture(f, gameState.activeClubId));
  const playerClub = gameState.clubs[gameState.activeClubId];
  const leagueId = playerClub?.leagueId;
  const league = leagueId ? gameState.leagues[leagueId] : null;

  // group fixtures by competition
  const byComp: Record<string, MatchFixture[]> = {};
  for (const f of fixtures) {
    const key = f.compName;
    if (!byComp[key]) byComp[key] = [];
    byComp[key].push(f);
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="border border-[#ceb8e1] bg-[#d5b5ec] px-3 py-2 text-center">
        <h2 className="text-sm font-black uppercase text-[#2e1f4a]">
          Season {gameState.season} — Week {gameState.gameWeek}
        </h2>
        <p className="text-[10px] text-[#4a3570]">
          {fixtures.length} match{fixtures.length !== 1 ? 'es' : ''} scheduled
        </p>
      </div>

      {/* Player's match highlight */}
      {playerFixture && (
        <div className="border-2 border-[#efe56b] bg-[#1a3a1e] p-2">
          <p className="text-[10px] font-bold uppercase text-[#efe56b] mb-1">Your Match</p>
          <FixtureRow fixture={playerFixture} clubs={gameState.clubs} activeClubId={gameState.activeClubId} />
        </div>
      )}

      {/* All fixtures by competition */}
      {Object.entries(byComp).map(([comp, fxs]) => (
        <div key={comp} className="border border-[#2a8a2b] bg-[#0a3d0e]">
          <div className="bg-[#1a3a1e] px-2 py-1">
            <h4 className="text-[10px] font-bold uppercase text-[#98ca7a]">{comp} ({fxs.length} matches)</h4>
          </div>
          <div className="text-xs">
            {fxs.slice(0, 12).map((f) => (
              <FixtureRow key={f.id} fixture={f} clubs={gameState.clubs} activeClubId={gameState.activeClubId} compact />
            ))}
            {fxs.length > 12 && (
              <p className="text-center text-[10px] text-[#6b9a5a] py-1">
                +{fxs.length - 12} more match{fxs.length - 12 > 1 ? 'es' : ''}
              </p>
            )}
          </div>
        </div>
      ))}

      {/* League standings */}
      {league && (
        <StandingsTable standings={league.standings} title={league.name} activeClubId={gameState.activeClubId} />
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={onStartMatchday}
          className="flex-1 border-2 border-[#efe56b] bg-[#2a8a2b] px-4 py-2 text-sm font-black uppercase text-[#efe56b] hover:bg-[#46b047] transition-colors"
        >
          ▶ Play Next Match
        </button>
        <button
          onClick={onResetSeason}
          className="border border-[#ef4444] bg-[#1a3a1e] px-3 py-2 text-[10px] font-bold uppercase text-[#ef4444] hover:bg-[#7f1d1d]"
        >
          Reset
        </button>
      </div>
    </div>
  );
}

/* ── Simulation View (AI matches playing) ── */
function SimulationView({
  gameState,
  simulatedResults,
  onComplete,
}: {
  gameState: GameState;
  simulatedResults: string[];
  onComplete: () => void;
}) {
  const [revealCount, setRevealCount] = useState(0);

  useEffect(() => {
    if (revealCount >= simulatedResults.length) {
      const timer = setTimeout(onComplete, 800);
      return () => clearTimeout(timer);
    }
    const timer = setTimeout(() => setRevealCount((c) => c + 1), 300);
    return () => clearTimeout(timer);
  }, [revealCount, simulatedResults.length, onComplete]);

  const revealed = simulatedResults.slice(0, revealCount);

  return (
    <div className="space-y-3">
      <div className="border border-[#ceb8e1] bg-[#d5b5ec] px-3 py-2 text-center">
        <h2 className="text-sm font-black uppercase text-[#2e1f4a]">
          Simulating Matchday {gameState.gameWeek}...
        </h2>
        <p className="text-[10px] text-[#4a3570]">
          {revealCount} / {simulatedResults.length} matches
        </p>
      </div>

      <div className="border border-[#2a8a2b] bg-[#0a3d0e] p-2 max-h-80 overflow-auto text-xs">
        {revealed.map((fId) => {
          const f = gameState.fixtures[fId];
          return f ? <FixtureRow key={fId} fixture={f} clubs={gameState.clubs} activeClubId={gameState.activeClubId} compact /> : null;
        })}
        {revealCount < simulatedResults.length && (
          <p className="text-center text-[#6b9a5a] py-2 animate-pulse">Processing results...</p>
        )}
      </div>
    </div>
  );
}

/* ── Interactive Match View ── */
function InteractiveMatchView({
  matchState,
  gameState,
  homeNames,
  awayNames,
  onTick,
  onTacticsChange,
  onFullTacticChange,
  onSpeedChange,
  onToggleRun,
  onSubstitute,
  onFinish,
}: {
  matchState: InteractiveMatchState;
  gameState: GameState;
  homeNames: string[];
  awayNames: string[];
  onTick: () => void;
  onTacticsChange: (t: TacticConfig) => void;
  onFullTacticChange: (ft: FullTactic) => void;
  onSpeedChange: (s: number) => void;
  onToggleRun: () => void;
  onSubstitute: (outIndex: number, inIndex: number) => void;
  onFinish: () => void;
}) {
  // Auto-tick
  useEffect(() => {
    if (!matchState.isRunning || matchState.isFinished) return;
    const ms = Math.max(50, 1000 / matchState.speed);
    const interval = setInterval(onTick, ms);
    return () => clearInterval(interval);
  }, [matchState.isRunning, matchState.isFinished, matchState.speed, onTick]);

  // Player position offsets — formation-centroid shift: whole shape moves with ball
  const homePosOffset = useMemo(() => {
    const ft = matchState.homeFullTactic;
    const basePosArr = ft ? formationToHomePitch(getFormationPositions(ft).positions) : HOME_POSITIONS;
    const n = basePosArr.length;
    const ballY = matchState.ballPos[1];
    const ballX = matchState.ballPos[0];

    // Centroid of outfield players (skip GK)
    const outfield = basePosArr.slice(1);
    const centX = outfield.reduce((s, [x]) => s + x, 0) / outfield.length;
    const centY = outfield.reduce((s, [, y]) => s + y, 0) / outfield.length;

    // How far ball has moved from the formation centroid
    const shiftX = ballX - centX;
    const shiftY = ballY - centY; // negative = ball in opponent half (home attacking)

    const mentality = matchState.homeTactics.mentality;
    const mentalityY = mentality === 'Attacking' ? -10 : mentality === 'Defensive' ? 8 : 0;

    // Only 1 player goes to the exact ball position (closest outfield player)
    let minDist = Infinity, ballIdx = 1;
    for (let i = 1; i < n; i++) {
      const d = Math.hypot(basePosArr[i][0] - ballX, basePosArr[i][1] - ballY);
      if (d < minDist) { minDist = d; ballIdx = i; }
    }

    return basePosArr.map(([bx, by], i) => {
      const seed = hashStr(`${matchState.minute}-home-${i}`);
      const jx = ((seed % 9) - 4) * 0.8;  // small jitter ±3.2 units
      const jy = ((seed % 7) - 3) * 0.7;  // small jitter ±2.1 units

      if (i === 0) {
        // GK: stays in goal, tiny horizontal drift, mentality shifts line slightly
        return [
          Math.max(36, Math.min(64, bx + shiftX * 0.06 + jx * 0.4)),
          Math.max(130, Math.min(145, by + mentalityY * 0.15 + jy * 0.3)),
        ] as [number, number];
      }

      if (i === ballIdx) {
        // Ball carrier: moves to ball position
        return [
          Math.max(4, Math.min(96, ballX + jx * 0.3)),
          Math.max(8, Math.min(145, ballY + jy * 0.3)),
        ] as [number, number];
      }

      // Role from base Y — home: GK@140, DEF@108-125, MID@75-98, FWD@50-72
      const isForward = by < 72;
      const isDefender = by > 108;
      // Shift factors: how much each role tracks the ball shift
      const fxr = isForward ? 0.30 : isDefender ? 0.10 : 0.20;
      const fyr = isForward ? 0.42 : isDefender ? 0.16 : 0.30;
      const mentY = isForward ? mentalityY * 0.6 : isDefender ? mentalityY * 0.2 : mentalityY * 0.4;

      return [
        Math.max(4, Math.min(96, bx + shiftX * fxr + jx)),
        Math.max(6, Math.min(144, by + shiftY * fyr + mentY + jy)),
      ] as [number, number];
    });
  }, [matchState.minute, matchState.homeTactics.mentality, matchState.homeFullTactic, matchState.ballPos]);

  const awayPosOffset = useMemo(() => {
    const ft = matchState.awayFullTactic;
    const basePosArr = ft ? formationToAwayPitch(getFormationPositions(ft).positions) : AWAY_POSITIONS;
    const n = basePosArr.length;
    const ballY = matchState.ballPos[1];
    const ballX = matchState.ballPos[0];

    // Centroid of away outfield players
    const outfield = basePosArr.slice(1);
    const centX = outfield.reduce((s, [x]) => s + x, 0) / outfield.length;
    const centY = outfield.reduce((s, [, y]) => s + y, 0) / outfield.length;

    // Ball displacement from formation centroid
    const shiftX = ballX - centX;
    const shiftY = ballY - centY; // positive = ball in home half (away attacking)

    const mentality = matchState.awayTactics.mentality;
    const mentalityY = mentality === 'Attacking' ? 10 : mentality === 'Defensive' ? -8 : 0;

    // Only closest outfield player goes to ball
    let minDist = Infinity, ballIdx = 1;
    for (let i = 1; i < n; i++) {
      const d = Math.hypot(basePosArr[i][0] - ballX, basePosArr[i][1] - ballY);
      if (d < minDist) { minDist = d; ballIdx = i; }
    }

    return basePosArr.map(([bx, by], i) => {
      const seed = hashStr(`${matchState.minute}-away-${i}`);
      const jx = ((seed % 9) - 4) * 0.8;
      const jy = ((seed % 7) - 3) * 0.7;

      if (i === 0) {
        // Away GK: stays near own goal, tiny horizontal drift
        return [
          Math.max(36, Math.min(64, bx + shiftX * 0.06 + jx * 0.4)),
          Math.max(5, Math.min(20, by + mentalityY * 0.15 + jy * 0.3)),
        ] as [number, number];
      }

      if (i === ballIdx) {
        // Ball carrier: goes to ball
        return [
          Math.max(4, Math.min(96, ballX + jx * 0.3)),
          Math.max(5, Math.min(142, ballY + jy * 0.3)),
        ] as [number, number];
      }

      // Role from base Y — away: GK@10, DEF@25-42, MID@55-75, FWD@78-110
      const isForward = by > 78;
      const isDefender = by < 42;
      const fxr = isForward ? 0.30 : isDefender ? 0.10 : 0.20;
      const fyr = isForward ? 0.42 : isDefender ? 0.16 : 0.30;
      const mentY = isForward ? mentalityY * 0.6 : isDefender ? mentalityY * 0.2 : mentalityY * 0.4;

      return [
        Math.max(4, Math.min(96, bx + shiftX * fxr + jx)),
        Math.max(6, Math.min(144, by + shiftY * fyr + mentY + jy)),
      ] as [number, number];
    });
  }, [matchState.minute, matchState.awayTactics.mentality, matchState.awayFullTactic, matchState.ballPos]);

  const homeLabels = matchState.homeFullTactic ? getFormationPositions(matchState.homeFullTactic).labels : POSITION_LABELS;
  const awayLabels = matchState.awayFullTactic ? getFormationPositions(matchState.awayFullTactic).labels : POSITION_LABELS;

  const isUserHome = gameState.activeClubId === matchState.homeId;

  return (
    <div className="space-y-2">
      {/* Tactical Info Banner */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-1 border border-[#2a8a2b] bg-[#0a3d0e] px-2 py-1 text-[10px]">
        <div className={`text-right ${isUserHome ? 'text-[#efe56b]' : 'text-[#98ca7a]'}`}>
          <span className="font-bold">{matchState.homeFullTactic?.name ?? 'Default'}</span>
          <span className="ml-1 text-[#6b9a5a]">({matchState.homeFullTactic?.formation ?? '4-4-2'})</span>
        </div>
        <span className="text-[#6b9a5a] px-1">vs</span>
        <div className={`${!isUserHome ? 'text-[#efe56b]' : 'text-[#98ca7a]'}`}>
          <span className="font-bold">{matchState.awayFullTactic?.name ?? 'Default'}</span>
          <span className="ml-1 text-[#6b9a5a]">({matchState.awayFullTactic?.formation ?? '4-4-2'})</span>
        </div>
      </div>

      {/* Scoreboard */}
      <div className="border-2 border-[#efe56b] bg-black px-3 py-2 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <span className={`font-black text-sm truncate text-right ${isUserHome ? 'text-[#efe56b]' : 'text-white'}`}>
          {matchState.homeName}
        </span>
        <div className="text-center">
          <div className="text-2xl font-black text-white font-mono">
            {matchState.homeGoals} — {matchState.awayGoals}
          </div>
          <div className="text-[10px] text-[#98ca7a]">{matchState.compName}</div>
        </div>
        <span className={`font-black text-sm truncate ${!isUserHome ? 'text-[#efe56b]' : 'text-white'}`}>
          {matchState.awayName}
        </span>
      </div>

      {/* Clock */}
      <div className="text-center">
        <span className="inline-block border border-[#2a8a2b] bg-[#0a3d0e] px-4 py-1 font-mono text-lg font-black text-[#22c55e]">
          {matchState.minute}&apos;
        </span>
        {matchState.minute <= 45 && <span className="ml-2 text-[10px] text-[#98ca7a]">1st Half</span>}
        {matchState.minute > 45 && matchState.minute <= 90 && <span className="ml-2 text-[10px] text-[#98ca7a]">2nd Half</span>}
      </div>

      {/* Pitch + Stats + Events */}
      <div className="grid gap-2 lg:grid-cols-[1fr_280px]">
        {/* Pitch */}
        <div className="border border-[#2a8a2b] bg-[#0d2a0d] p-1" style={{ maxHeight: '480px' }}>
          <PitchView
            homePositions={homePosOffset}
            awayPositions={awayPosOffset}
            homeLabels={homeLabels}
            awayLabels={awayLabels}
            ballPos={matchState.ballPos}
            homeRuns={matchState.homeFullTactic?.offensiveRuns}
            awayRuns={matchState.awayFullTactic?.offensiveRuns}
            possession={matchState.ballPos[1] < 68 ? 'HOME' : matchState.ballPos[1] > 82 ? 'AWAY' : undefined}
          />
        </div>

        {/* Right column: Stats + Events */}
        <div className="space-y-2 min-w-0">
          <StatsPanel stats={matchState.stats} homeName={matchState.homeName} awayName={matchState.awayName} />
          <EventLog
            events={matchState.events}
            homeNames={homeNames}
            awayNames={awayNames}
            homeName={matchState.homeName}
            awayName={matchState.awayName}
          />
        </div>
      </div>

      {/* Controls */}
      <ManagerControls
        tactics={isUserHome ? matchState.homeTactics : matchState.awayTactics}
        currentFullTactic={isUserHome ? matchState.homeFullTactic : matchState.awayFullTactic}
        speed={matchState.speed}
        isRunning={matchState.isRunning}
        isFinished={matchState.isFinished}
        subsRemaining={isUserHome ? matchState.subsRemainingHome : matchState.subsRemainingAway}
        substitutions={matchState.substitutions.filter((s) => s.team === (isUserHome ? 'HOME' : 'AWAY'))}
        minute={matchState.minute}
        playerNames={isUserHome ? homeNames : awayNames}
        onTacticsChange={onTacticsChange}
        onFullTacticChange={onFullTacticChange}
        onSpeedChange={onSpeedChange}
        onToggleRun={onToggleRun}
        onSubstitute={onSubstitute}
      />

      {/* Finish button after match ends */}
      {matchState.isFinished && (
        <button
          onClick={onFinish}
          className="w-full border-2 border-[#efe56b] bg-[#2a8a2b] px-4 py-2 text-sm font-black uppercase text-[#efe56b] hover:bg-[#46b047]"
        >
          Continue →
        </button>
      )}
    </div>
  );
}

/* ── Results View ── */
function ResultsView({
  gameState,
  onContinue,
}: {
  gameState: GameState;
  onContinue: () => void;
}) {
  const resultFixtures = gameState.lastWeekResultIds
    .map((id) => gameState.fixtures[id])
    .filter(Boolean);

  // Group by competition
  const byComp: Record<string, MatchFixture[]> = {};
  for (const f of resultFixtures) {
    if (!byComp[f.compName]) byComp[f.compName] = [];
    byComp[f.compName].push(f);
  }

  // Get the player's league standings
  const playerClub = gameState.clubs[gameState.activeClubId];
  const league = playerClub ? gameState.leagues[playerClub.leagueId] : null;

  return (
    <div className="space-y-3">
      <div className="border border-[#ceb8e1] bg-[#d5b5ec] px-3 py-2 text-center">
        <h2 className="text-sm font-black uppercase text-[#2e1f4a]">
          Week {gameState.gameWeek} Results
        </h2>
        <p className="text-[10px] text-[#4a3570]">
          {resultFixtures.length} match{resultFixtures.length !== 1 ? 'es' : ''} played
        </p>
      </div>

      {Object.entries(byComp).map(([comp, fxs]) => (
        <div key={comp} className="border border-[#2a8a2b] bg-[#0a3d0e]">
          <div className="bg-[#1a3a1e] px-2 py-1">
            <h4 className="text-[10px] font-bold uppercase text-[#98ca7a]">{comp}</h4>
          </div>
          <div className="text-xs max-h-60 overflow-auto">
            {fxs.map((f) => (
              <FixtureRow key={f.id} fixture={f} clubs={gameState.clubs} activeClubId={gameState.activeClubId} compact />
            ))}
          </div>
        </div>
      ))}

      {/* Updated standings */}
      {league && (
        <StandingsTable standings={league.standings} title={`${league.name} Standings`} activeClubId={gameState.activeClubId} />
      )}

      <button
        onClick={onContinue}
        className="w-full border-2 border-[#efe56b] bg-[#2a8a2b] px-4 py-2 text-sm font-black uppercase text-[#efe56b] hover:bg-[#46b047]"
      >
        Continue to Week {gameState.gameWeek + 1} →
      </button>
    </div>
  );
}

/* ── End of Season View ── */
function EndOfSeasonView({
  gameState,
  onNewSeason,
}: {
  gameState: GameState;
  onNewSeason: () => void;
}) {
  const allLeagues = Object.values(gameState.leagues);
  const playerClub = gameState.clubs[gameState.activeClubId];

  return (
    <div className="space-y-3">
      <div className="border-2 border-[#efe56b] bg-[#d5b5ec] px-3 py-3 text-center">
        <h2 className="text-lg font-black uppercase text-[#2e1f4a]">🏆 End of Season {gameState.season}</h2>
        {playerClub && (
          <p className="text-sm text-[#4a3570] font-bold">
            {playerClub.name} — Final Standings
          </p>
        )}
      </div>

      {allLeagues.map((league) => (
        <StandingsTable
          key={league.id}
          standings={league.standings}
          title={`${league.name} — Final`}
          activeClubId={gameState.activeClubId}
        />
      ))}

      <button
        onClick={onNewSeason}
        className="w-full border-2 border-[#efe56b] bg-[#2a8a2b] px-4 py-3 text-sm font-black uppercase text-[#efe56b] hover:bg-[#46b047]"
      >
        Start New Season →
      </button>
    </div>
  );
}

/* ══════════════════════════════════════════════
   MAIN COMPONENT
   ══════════════════════════════════════════════ */

export default function GameDashboard({ clubs, activeClub, squadPlayers, activeTactic }: GameDashboardProps) {
  // ── Game State ──
  const [gameState, setGameState] = useState<GameState | null>(() => {
    const saved = loadGameState();
    if (saved && saved.activeClubId === activeClub.id && saved.initialized) return saved;
    return null;
  });

  const [interactiveMatch, setInteractiveMatch] = useState<InteractiveMatchState | null>(null);
  const [simulatedResultIds, setSimulatedResultIds] = useState<string[]>([]);

  // Initialize game if needed
  useEffect(() => {
    if (gameState && gameState.activeClubId === activeClub.id) return;
    const newState = initializeGame(clubs, activeClub.id);
    setGameState(newState);
  }, [activeClub.id, clubs, gameState]);

  // ── Player names for event descriptions ──
  const playerNames = useMemo(() => {
    return squadPlayers.slice(0, 11).map((p) => p.name);
  }, [squadPlayers]);

  const getOpponentNames = useCallback((opponentId: string) => {
    const club = gameState?.clubs[opponentId];
    return club ? getPlayerNamesForClub(club.name, club.id) : getPlayerNamesForClub('Unknown', opponentId);
  }, [gameState]);

  // ── Handlers ──
  const handleStartMatchday = useCallback(() => {
    if (!gameState) return;

    // 1. Simulate all AI fixtures
    const afterSim = simulateAIFixtures(gameState);

    // 2. Apply results for all simulated matches
    let state = afterSim;
    for (const fId of afterSim.lastWeekResultIds) {
      state = applyMatchResult(state, fId);
    }

    setSimulatedResultIds([...afterSim.lastWeekResultIds]);
    setGameState({ ...state, phase: 'simulating' });
  }, [gameState]);

  const handleSimulationComplete = useCallback(() => {
    if (!gameState) return;

    // Check if the player has a fixture
    const fixtures = getWeekFixtures(gameState);
    const playerFix = fixtures.find((f) => isPlayerFixture(f, gameState.activeClubId));

    if (playerFix && !playerFix.played) {
      const homeClub = gameState.clubs[playerFix.homeId];
      const awayClub = gameState.clubs[playerFix.awayId];
      if (homeClub && awayClub) {
        const isPlayerHome = gameState.activeClubId === playerFix.homeId;
        const im = createInteractiveMatch(playerFix.id, homeClub, awayClub, playerFix.compName, activeTactic, isPlayerHome);
        setInteractiveMatch(im);
        setGameState({ ...gameState, phase: 'interactive_match' });
        return;
      }
    }

    // No player fixture — skip to results
    setGameState({ ...gameState, phase: 'showing_results' });
  }, [gameState, activeTactic]);

  const handleTick = useCallback(() => {
    setInteractiveMatch((prev) => {
      if (!prev || !gameState) return prev;
      const homeClub = gameState.clubs[prev.homeId];
      const awayClub = gameState.clubs[prev.awayId];
      if (!homeClub || !awayClub) return prev;
      // Apply form + morale adjustments (same as simulateMatch getTeamRatings)
      const toEffRating = (club: typeof homeClub, isHome: boolean) => {
        const base = club.rating + club.form * 1.5 + (club.morale - 50) * 0.3 + (isHome ? 5 : 0);
        return Math.max(25, Math.min(99, Math.round(base)));
      };
      const rawHome = toEffRating(homeClub, true);
      const rawAway = toEffRating(awayClub, false);
      // CAP THE AI'S RATING DOWN — player should never face more than +12 rating gap
      // This corrects for stale reputation data in old saves and keeps gameplay fair
      const capGap = 12;
      const isPlayerHome = prev.isPlayerHome;
      let effHome = rawHome;
      let effAway = rawAway;
      if (isPlayerHome === true && rawAway > rawHome + capGap) effAway = rawHome + capGap;
      if (isPlayerHome === false && rawHome > rawAway + capGap) effHome = rawAway + capGap;
      return tickInteractiveMatch(prev, effHome, effAway);
    });
  }, [gameState]);

  const handleTacticsChange = useCallback((tactics: TacticConfig) => {
    if (!interactiveMatch || !gameState) return;
    const isHome = gameState.activeClubId === interactiveMatch.homeId;
    // Sync slider changes back into the FullTactic instructions so the engine reads updated values
    const ftKey = isHome ? 'homeFullTactic' : 'awayFullTactic';
    const currentFT = interactiveMatch[ftKey];
    const updatedFT = currentFT ? {
      ...currentFT,
      instructions: {
        ...currentFT.instructions,
        tempo: tactics.tempo,
        pressing: tactics.pressing,
        width: tactics.width,
        mentality: tactics.mentality,
      },
    } : currentFT;
    setInteractiveMatch({
      ...interactiveMatch,
      ...(isHome
        ? { homeTactics: tactics, homeFullTactic: updatedFT }
        : { awayTactics: tactics, awayFullTactic: updatedFT }),
    });
  }, [interactiveMatch, gameState]);

  const handleFullTacticChange = useCallback((ft: FullTactic) => {
    if (!interactiveMatch || !gameState) return;
    const isHome = gameState.activeClubId === interactiveMatch.homeId;
    const newTactics: TacticConfig = {
      mentality: ft.instructions.mentality ?? 'Balanced',
      tempo: ft.instructions.tempo ?? 60,
      pressing: ft.instructions.pressing ?? 60,
      width: ft.instructions.width ?? 60,
    };
    setInteractiveMatch({
      ...interactiveMatch,
      ...(isHome
        ? { homeTactics: newTactics, homeFullTactic: ft }
        : { awayTactics: newTactics, awayFullTactic: ft }),
    });
  }, [interactiveMatch, gameState]);

  const handleSpeedChange = useCallback((speed: number) => {
    if (!interactiveMatch) return;
    setInteractiveMatch({ ...interactiveMatch, speed });
  }, [interactiveMatch]);

  const handleToggleRun = useCallback(() => {
    if (!interactiveMatch) return;
    setInteractiveMatch({ ...interactiveMatch, isRunning: !interactiveMatch.isRunning });
  }, [interactiveMatch]);

  const handleSubstitute = useCallback((outIndex: number, inIndex: number) => {
    if (!interactiveMatch || !gameState) return;
    const isHome = gameState.activeClubId === interactiveMatch.homeId;
    const team: 'HOME' | 'AWAY' = isHome ? 'HOME' : 'AWAY';
    const subsKey = isHome ? 'subsRemainingHome' : 'subsRemainingAway';
    if (interactiveMatch[subsKey] <= 0) return;

    const sub = { minute: interactiveMatch.minute, team, outIndex, inIndex };
    const subEvent: MatchEvent = {
      minute: interactiveMatch.minute,
      type: 'SUBSTITUTION',
      team,
      playerIndex: inIndex,
      description: '',
    };

    setInteractiveMatch({
      ...interactiveMatch,
      [subsKey]: interactiveMatch[subsKey] - 1,
      substitutions: [...interactiveMatch.substitutions, sub],
      events: [...interactiveMatch.events, subEvent],
      isRunning: false, // auto-pause for the sub
    });
  }, [interactiveMatch, gameState]);

  const handleMatchFinish = useCallback(() => {
    if (!interactiveMatch || !gameState) return;

    // Record result
    let state = recordInteractiveResult(
      gameState,
      interactiveMatch.fixtureId,
      interactiveMatch.homeGoals,
      interactiveMatch.awayGoals,
      interactiveMatch.stats,
    );

    // Apply result to standings
    state = applyMatchResult(state, interactiveMatch.fixtureId);

    // Process cup rounds
    state = processCupRounds(state);

    state.phase = 'showing_results';
    setGameState(state);
    saveGameState(state);
    setInteractiveMatch(null);
  }, [interactiveMatch, gameState]);

  const handleContinue = useCallback(() => {
    if (!gameState) return;
    // Process cup rounds
    let state = processCupRounds(gameState);
    // Advance week
    state = advanceWeek(state);
    setGameState(state);
    setSimulatedResultIds([]);
  }, [gameState]);

  const handleResetSeason = useCallback(() => {
    clearGameState();
    const newState = initializeGame(clubs, activeClub.id);
    setGameState(newState);
    setInteractiveMatch(null);
    setSimulatedResultIds([]);
  }, [clubs, activeClub.id]);

  const handleNewSeason = useCallback(() => {
    // Reinitialize for a new season
    clearGameState();
    const newState = initializeGame(clubs, activeClub.id);
    newState.season = (gameState?.season ?? 1) + 1;
    saveGameState(newState);
    setGameState(newState);
    setInteractiveMatch(null);
    setSimulatedResultIds([]);
  }, [clubs, activeClub.id, gameState?.season]);

  // ── Render ──
  if (!gameState) {
    return (
      <section className="border-4 border-[#6f4ca1] bg-[#16a51c] p-3">
        <p className="text-sm text-[#d5f8b6]">Initializing game engine...</p>
      </section>
    );
  }

  return (
    <section className="border-4 border-[#6f4ca1] bg-[#16a51c] p-3">
      {gameState.phase === 'idle' && (
        <WeekOverview gameState={gameState} onStartMatchday={handleStartMatchday} onResetSeason={handleResetSeason} />
      )}

      {gameState.phase === 'simulating' && (
        <SimulationView
          gameState={gameState}
          simulatedResults={simulatedResultIds}
          onComplete={handleSimulationComplete}
        />
      )}

      {gameState.phase === 'interactive_match' && interactiveMatch && (
        <InteractiveMatchView
          matchState={interactiveMatch}
          gameState={gameState}
          homeNames={
            gameState.activeClubId === interactiveMatch.homeId
              ? playerNames
              : getOpponentNames(interactiveMatch.homeId)
          }
          awayNames={
            gameState.activeClubId === interactiveMatch.awayId
              ? playerNames
              : getOpponentNames(interactiveMatch.awayId)
          }
          onTick={handleTick}
          onTacticsChange={handleTacticsChange}
          onFullTacticChange={handleFullTacticChange}
          onSpeedChange={handleSpeedChange}
          onToggleRun={handleToggleRun}
          onSubstitute={handleSubstitute}
          onFinish={handleMatchFinish}
        />
      )}

      {gameState.phase === 'showing_results' && (
        <ResultsView gameState={gameState} onContinue={handleContinue} />
      )}

      {gameState.phase === 'end_of_season' && (
        <EndOfSeasonView gameState={gameState} onNewSeason={handleNewSeason} />
      )}
    </section>
  );
}
