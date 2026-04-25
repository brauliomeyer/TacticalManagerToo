import React, { useEffect, useMemo, useRef, useState } from 'react';

interface StarterPlayer {
  id: string;
  name: string;
  role: string;
}

interface TacticsBoardProps {
  starters?: StarterPlayer[];
  clubId?: string;
}

type TacticalPlayer = {
  id: string;
  name: string;
  posX: number;
  posY: number;
  origX: number;
  origY: number;
  color?: string;
};

type RunLine = {
  id: string;
  fromId: string; // Can be player.id or "run-end-{runId}"
  toX: number;
  toY: number;
};

type TacticsSnapshot = {
  players: TacticalPlayer[];
  runs: RunLine[];
  timestamp: number;
};

const initialPlayers: TacticalPlayer[] = [
  { id: 'gk', name: 'GK', posX: 14, posY: 50, origX: 14, origY: 50 },
  { id: 'lb', name: 'LB', posX: 24, posY: 30, origX: 24, origY: 30 },
  { id: 'cb1', name: 'CB', posX: 24, posY: 50, origX: 24, origY: 50 },
  { id: 'cb2', name: 'CB', posX: 24, posY: 70, origX: 24, origY: 70 },
  { id: 'rb', name: 'RB', posX: 24, posY: 90, origX: 24, origY: 90 },
  { id: 'cm1', name: 'CM', posX: 45, posY: 30, origX: 45, origY: 30 },
  { id: 'cm2', name: 'CM', posX: 45, posY: 50, origX: 45, origY: 50 },
  { id: 'cm3', name: 'CM', posX: 45, posY: 70, origX: 45, origY: 70 },
  { id: 'lw', name: 'LW', posX: 70, posY: 20, origX: 70, origY: 20 },
  { id: 'st', name: 'ST', posX: 82, posY: 50, origX: 82, origY: 50 },
  { id: 'rw', name: 'RW', posX: 70, posY: 80, origX: 70, origY: 80 }
];

const opponentPlayers: TacticalPlayer[] = [
  { id: 'ogk', name: 'GK', posX: 86, posY: 50, origX: 86, origY: 50, color: 'red' },
  { id: 'olb', name: 'LB', posX: 76, posY: 30, origX: 76, origY: 30, color: 'red' },
  { id: 'ocb1', name: 'CB', posX: 76, posY: 45, origX: 76, origY: 45, color: 'red' },
  { id: 'ocb2', name: 'CB', posX: 76, posY: 55, origX: 76, origY: 55, color: 'red' },
  { id: 'orb', name: 'RB', posX: 76, posY: 70, origX: 76, origY: 70, color: 'red' },
  { id: 'ocm1', name: 'CM', posX: 60, posY: 25, origX: 60, origY: 25, color: 'red' },
  { id: 'ocm2', name: 'CM', posX: 60, posY: 50, origX: 60, origY: 50, color: 'red' },
  { id: 'ocm3', name: 'CM', posX: 60, posY: 75, origX: 60, origY: 75, color: 'red' },
  { id: 'olw', name: 'LW', posX: 48, posY: 20, origX: 48, origY: 20, color: 'red' },
  { id: 'ost', name: 'ST', posX: 36, posY: 50, origX: 36, origY: 50, color: 'red' },
  { id: 'orw', name: 'RW', posX: 48, posY: 80, origX: 48, origY: 80, color: 'red' }
];

/** Maps a tactical board position ID to an ordered list of squad roles that can fill it. */
const positionToRoles: Record<string, string[]> = {
  gk:  ['GOALKEEPER'],
  lb:  ['LEFT_BACK', 'LEFT_WING_BACK'],
  cb1: ['CENTER_BACK', 'SWEEPER'],
  cb2: ['CENTER_BACK', 'SWEEPER'],
  rb:  ['RIGHT_BACK', 'RIGHT_WING_BACK'],
  cm1: ['CENTRAL_MIDFIELDER', 'BOX_TO_BOX_MIDFIELDER', 'ANCHOR'],
  cm2: ['DEFENSIVE_MIDFIELDER', 'CENTRAL_MIDFIELDER', 'ANCHOR'],
  cm3: ['ATTACKING_MIDFIELDER', 'PLAYMAKER', 'CENTRAL_MIDFIELDER'],
  lw:  ['LEFT_WINGER', 'INVERTED_WINGER', 'LEFT_MIDFIELDER'],
  st:  ['STRIKER', 'TARGET_MAN', 'FALSE_NINE', 'SECOND_STRIKER'],
  rw:  ['RIGHT_WINGER', 'INVERTED_WINGER', 'RIGHT_MIDFIELDER'],
};

/** Given the 11 starters, return a mapping of board position id → player last name. */
function mapStartersToPositions(starters: StarterPlayer[]): Record<string, string> {
  const result: Record<string, string> = {};
  const used = new Set<string>();
  const posIds = Object.keys(positionToRoles);

  // First pass: exact role matches
  for (const posId of posIds) {
    const roles = positionToRoles[posId];
    for (const role of roles) {
      const match = starters.find((s) => s.role === role && !used.has(s.id));
      if (match) {
        const parts = match.name.split(' ');
        result[posId] = parts[parts.length - 1];
        used.add(match.id);
        break;
      }
    }
  }

  // Second pass: fill remaining positions with unassigned starters
  for (const posId of posIds) {
    if (result[posId]) continue;
    const remaining = starters.find((s) => !used.has(s.id));
    if (remaining) {
      const parts = remaining.name.split(' ');
      result[posId] = parts[parts.length - 1];
      used.add(remaining.id);
    }
  }

  return result;
}

function storageKeyForClub(clubId?: string) {
  return clubId ? `tacticsboard-v1-${clubId}` : 'tacticsboard-v1';
}

function loadSavedState(clubId?: string): { players: TacticalPlayer[]; runs: RunLine[] } | null {
  try {
    const raw = localStorage.getItem(storageKeyForClub(clubId));
    if (!raw) return null;
    return JSON.parse(raw) as { players: TacticalPlayer[]; runs: RunLine[] };
  } catch {
    return null;
  }
}

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

const PITCH_BOUNDS = {
  minX: 1,
  maxX: 99,
  minY: 1,
  maxY: 99
};

const PITCH_WIDTH = PITCH_BOUNDS.maxX - PITCH_BOUNDS.minX;
const PITCH_HEIGHT = PITCH_BOUNDS.maxY - PITCH_BOUNDS.minY;
const PLAYER_SAFE_MARGIN = 6;

function clampPlayerPos(value: number) {
  return clamp(value, PLAYER_SAFE_MARGIN, 100 - PLAYER_SAFE_MARGIN);
}

function boardToPitchCoords(clientX: number, clientY: number, rect: DOMRect) {
  const boardX = clamp(((clientX - rect.left) / rect.width) * 100);
  const boardY = clamp(((clientY - rect.top) / rect.height) * 100);

  return {
    x: clampPlayerPos(((boardX - PITCH_BOUNDS.minX) / PITCH_WIDTH) * 100),
    y: clampPlayerPos(((boardY - PITCH_BOUNDS.minY) / PITCH_HEIGHT) * 100)
  };
}

function pitchToBoardCoords(posX: number, posY: number) {
  return {
    x: PITCH_BOUNDS.minX + (clampPlayerPos(posX) / 100) * PITCH_WIDTH,
    y: PITCH_BOUNDS.minY + (clampPlayerPos(posY) / 100) * PITCH_HEIGHT
  };
}

export default function TacticsBoard({ starters = [], clubId }: TacticsBoardProps) {
  const boardRef = useRef<HTMLDivElement | null>(null);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const didDragRef = useRef(false);

  const defaultPlayers = [...initialPlayers, ...opponentPlayers];

  const [allPlayers, setAllPlayers] = useState<TacticalPlayer[]>(() => {
    const saved = loadSavedState(clubId);
    return saved?.players ?? defaultPlayers;
  });
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [selectedRunSourceId, setSelectedRunSourceId] = useState<string | null>(null);
  const [runs, setRuns] = useState<RunLine[]>(() => {
    const saved = loadSavedState(clubId);
    return saved?.runs ?? [];
  });
  const [history, setHistory] = useState<TacticsSnapshot[]>(() => {
    const saved = loadSavedState(clubId);
    return [{ players: saved?.players ?? defaultPlayers, runs: saved?.runs ?? [], timestamp: Date.now() }];
  });
  const [historyIndex, setHistoryIndex] = useState(0);

  const starterNames = useMemo(() => mapStartersToPositions(starters), [starters]);

  // Reset board state when switching clubs
  useEffect(() => {
    const saved = loadSavedState(clubId);
    const players = saved?.players ?? [...initialPlayers, ...opponentPlayers];
    const savedRuns = saved?.runs ?? [];
    setAllPlayers(players);
    setRuns(savedRuns);
    setHistory([{ players, runs: savedRuns, timestamp: Date.now() }]);
    setHistoryIndex(0);
    setDraggingId(null);
    setSelectedRunSourceId(null);
  }, [clubId]);

  // Persist to localStorage per club
  useEffect(() => {
    try {
      localStorage.setItem(storageKeyForClub(clubId), JSON.stringify({ players: allPlayers, runs }));
    } catch {
      // storage unavailable or full
    }
  }, [allPlayers, runs, clubId]);

  const saveSnapshot = (newPlayers: TacticalPlayer[], newRuns: RunLine[]) => {
    setHistory((prev) => {
      const trimmed = prev.slice(0, historyIndex + 1);
      return [
        ...trimmed,
        { players: newPlayers, runs: newRuns, timestamp: Date.now() }
      ];
    });
    setHistoryIndex((prev) => prev + 1);
  };

  const undoMove = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setAllPlayers(history[newIndex].players);
      setRuns(history[newIndex].runs);
    }
  };

  const redoMove = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setAllPlayers(history[newIndex].players);
      setRuns(history[newIndex].runs);
    }
  };

  const undoLastRun = () => {
    const newRuns = runs.slice(0, -1);
    saveSnapshot(allPlayers, newRuns);
    setRuns(newRuns);
    setSelectedRunSourceId(null);
  };

  const getChainedRunIds = (runId: string, allRuns: RunLine[]): string[] => {
    const children = allRuns.filter((r) => r.fromId === `run-end-${runId}`);
    const childIds = children.map((c) => c.id);
    return [...childIds, ...childIds.flatMap((id) => getChainedRunIds(id, allRuns))];
  };

  const removeRun = (runId: string) => {
    const chainedIds = getChainedRunIds(runId, runs);
    const allIdsToRemove = new Set([runId, ...chainedIds]);
    const newRuns = runs.filter((run) => !allIdsToRemove.has(run.id));
    saveSnapshot(allPlayers, newRuns);
    setRuns(newRuns);
    setSelectedRunSourceId(null);
  };

  const clearRuns = () => {
    const resetPlayers = allPlayers.map((p) => ({ ...p, posX: p.origX, posY: p.origY }));
    saveSnapshot(resetPlayers, []);
    setAllPlayers(resetPlayers);
    setRuns([]);
    setSelectedRunSourceId(null);
  };

  const cancelRunSetup = () => {
    setSelectedRunSourceId(null);
  };

  const getPlayerById = (id: string): TacticalPlayer | undefined => {
    return allPlayers.find((player) => player.id === id);
  };

  const getRunEndpoint = (runId: string): { x: number; y: number } | null => {
    const run = runs.find((r) => r.id === runId);
    return run ? { x: run.toX, y: run.toY } : null;
  };

  const startRunFromRunEnd = (runId: string) => {
    setSelectedRunSourceId(`run-end-${runId}`);
  };

  const getSourceCoordinates = (sourceId: string): { x: number; y: number } | null => {
    if (sourceId.startsWith('run-end-')) {
      // Extract runId from "run-end-{runId}"
      const runId = sourceId.replace('run-end-', '');
      return getRunEndpoint(runId);
    } else {
      // It's a player ID
      const player = getPlayerById(sourceId);
      return player ? { x: player.posX, y: player.posY } : null;
    }
  };

  const updateByPointer = (clientX: number, clientY: number) => {
    if (!draggingId || !boardRef.current) return;

    if (dragStartRef.current) {
      const dx = Math.abs(clientX - dragStartRef.current.x);
      const dy = Math.abs(clientY - dragStartRef.current.y);
      if (dx > 2 || dy > 2) {
        didDragRef.current = true;
      }
    }

    const rect = boardRef.current!.getBoundingClientRect();
    const nextPos = boardToPitchCoords(clientX, clientY, rect);

    setAllPlayers((prev) => 
      prev.map((p) => (p.id === draggingId ? { ...p, posX: nextPos.x, posY: nextPos.y } : p))
    );
  };

  const handleBoardClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!selectedRunSourceId || !boardRef.current) return;

    const rect = boardRef.current!.getBoundingClientRect();
    const target = boardToPitchCoords(event.clientX, event.clientY, rect);

    // Create new run with unique ID
    const runId = `run-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newRuns = [
      ...runs,
      {
        id: runId,
        fromId: selectedRunSourceId,
        toX: target.x,
        toY: target.y
      }
    ];

    saveSnapshot(allPlayers, newRuns);
    setRuns(newRuns);
    setSelectedRunSourceId(null);
  };

  const asJson = useMemo(
    () =>
      JSON.stringify(
        allPlayers.map((p) => ({ 
          id: p.id, 
          posX: Number(p.posX.toFixed(1)), 
          posY: Number(p.posY.toFixed(1)),
          origX: Number(p.origX.toFixed(1)),
          origY: Number(p.origY.toFixed(1))
        })),
        null,
        2
      ),
    [allPlayers]
  );

  return (
    <section className="border-4 border-[#6f4ca1] bg-[#0f8f1f] p-3 font-mono text-[#d7ff9f]">
      <h2 className="mb-3 bg-black px-2 py-1 text-sm font-bold uppercase tracking-wider text-[#efe56b]">Tactics Board</h2>

      <div className="mb-3 grid gap-2 sm:grid-cols-[1fr_auto]">
        <div className="rounded border border-[#68e154] bg-[#122b13] p-3 text-sm text-[#d7ff9f]">
          <p className="font-semibold text-[#efe56b]">Board mode</p>
          <p>Left-to-right layout</p>
          <p><span className="font-bold">Shift+drag</span> any player (blue or red) to reposition</p>
          <p><span className="font-bold">Shift+click</span> a player to select as run source (highlighted)</p>
          <p>Then <span className="font-bold">click the pitch</span> to place the run arrow there</p>
          <p><span className="font-bold">Click run endpoint circles</span> to chain into next run</p>
          <p className="mt-2">Opponent is shown in <span className="text-red-300">red</span>.</p>
          {selectedRunSourceId && (
            <p className="mt-2 text-[#ffe26d] font-bold">
              ▶ Run source selected: {selectedRunSourceId.startsWith('run-end-') ? 'Run endpoint' : selectedRunSourceId}
            </p>
          )}
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={undoMove}
              disabled={historyIndex <= 0}
              className="rounded border border-[#68e154] bg-[#1e6d1f] px-2 py-1 text-xs font-bold text-[#68e154] disabled:cursor-not-allowed disabled:opacity-40"
              title="Undo tactic change"
            >
              ↶ Undo
            </button>
            <button
              type="button"
              onClick={redoMove}
              disabled={historyIndex >= history.length - 1}
              className="rounded border border-[#68e154] bg-[#1e6d1f] px-2 py-1 text-xs font-bold text-[#68e154] disabled:cursor-not-allowed disabled:opacity-40"
              title="Redo tactic change"
            >
              ↷ Redo
            </button>
            <span className="text-xs text-[#9fd28d]">Step {historyIndex + 1} of {history.length}</span>
          </div>
        </div>
        <div className="rounded border border-[#68e154] bg-[#122b13] p-3 text-sm text-[#d7ff9f]">
          <p className="font-semibold text-[#efe56b]">Legend</p>
          <div className="flex items-center gap-2"><span className="inline-block h-3 w-3 rounded-full bg-blue-600 border border-blue-300" /> Your players</div>
          <div className="flex items-center gap-2"><span className="inline-block h-3 w-3 rounded-full bg-red-600 border border-red-300" /> Opponent</div>
          <div className="flex items-center gap-2"><span className="inline-block h-0.5 w-8 bg-yellow-300" style={{ borderStyle: 'dashed' }} /> Run line</div>
          <div className="flex items-center gap-2"><span className="inline-block h-2.5 w-2.5 rounded-full border-2 border-yellow-400 bg-transparent" /> Run endpoint</div>

          <p className="mt-3 font-semibold text-[#efe56b]">Run controls</p>
          <div className="mt-1 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={undoLastRun}
              disabled={runs.length === 0}
              className="rounded border border-[#efe56b] bg-[#1e6d1f] px-2 py-1 text-xs font-bold text-[#efe56b] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Undo last
            </button>
            <button
              type="button"
              onClick={clearRuns}
              disabled={runs.length === 0}
              className="rounded border border-[#efe56b] bg-[#1e6d1f] px-2 py-1 text-xs font-bold text-[#efe56b] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Clear all
            </button>
            {selectedRunSourceId && (
              <button
                type="button"
                onClick={cancelRunSetup}
                className="rounded border border-[#ffe26d] bg-[#3d5e1e] px-2 py-1 text-xs font-bold text-[#ffe26d]"
              >
                Cancel run
              </button>
            )}
          </div>

          <p className="mt-2 text-xs text-[#d7ff9f]">Runs: {runs.length}</p>
          {runs.length > 0 ? (
            <ul className="mt-1 max-h-20 space-y-1 overflow-auto">
              {runs.slice(-4).reverse().map((run) => (
                <li key={`run-item-${run.id}`} className="flex items-center justify-between gap-2 rounded border border-[#68e154] bg-[#114012] px-2 py-1">
                  <span className="truncate text-xs">
                    {run.fromId.startsWith('run-end-') ? '↪' : '→'} {run.fromId.startsWith('run-end-') ? 'chain' : run.fromId} to ({Math.round(run.toX)}, {Math.round(run.toY)})
                  </span>
                  <button
                    type="button"
                    onClick={() => removeRun(run.id)}
                    className="rounded border border-[#ff9f9f] bg-[#5c1f1f] px-1 py-0.5 text-xs font-bold text-[#ffd7d7]"
                    aria-label={`Delete run ${run.id}`}
                  >
                    X
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-1 text-xs text-[#9fd28d]">No runs yet.</p>
          )}
        </div>
      </div>

      <div
        className="relative h-[420px] w-full overflow-hidden rounded border-2 border-[#74be5f] bg-[#1f5b1a] shadow-[inset_0_0_35px_rgba(0,0,0,0.45)]"
        onPointerMove={(event) => updateByPointer(event.clientX, event.clientY)}
        onPointerUp={() => {
          if (draggingId) {
            saveSnapshot(allPlayers, runs);
          }
          setDraggingId(null);
          dragStartRef.current = null;
        }}
        onPointerLeave={() => {
          if (draggingId) {
            saveSnapshot(allPlayers, runs);
          }
          setDraggingId(null);
          dragStartRef.current = null;
        }}
        onClick={handleBoardClick}
        ref={boardRef}
      >
        <div className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(90deg,rgba(93,201,38,0.8)_0,rgba(93,201,38,0.8)_5%,rgba(78,178,31,0.82)_5%,rgba(78,178,31,0.82)_10%)]" />
        <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full pointer-events-none">
          <defs>
            <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 Z" fill="#ffe26d" />
            </marker>
          </defs>
          <rect x="1" y="1" width="98" height="98" fill="none" stroke="rgba(255,255,255,0.88)" strokeWidth="0.8" />
          <line x1="50" y1="1" x2="50" y2="99" stroke="rgba(255,255,255,0.84)" strokeWidth="0.45" />
          <circle cx="50" cy="50" r="7" fill="none" stroke="rgba(255,255,255,0.84)" strokeWidth="0.45" />
          <circle cx="50" cy="50" r="0.9" fill="rgba(255,255,255,0.95)" />
          <rect x="1" y="20" width="18" height="60" fill="none" stroke="rgba(255,255,255,0.84)" strokeWidth="0.45" />
          <rect x="81" y="20" width="18" height="60" fill="none" stroke="rgba(255,255,255,0.84)" strokeWidth="0.45" />
          <rect x="1" y="35" width="8" height="30" fill="none" stroke="rgba(255,255,255,0.84)" strokeWidth="0.42" />
          <rect x="91" y="35" width="8" height="30" fill="none" stroke="rgba(255,255,255,0.84)" strokeWidth="0.42" />
          <circle cx="14" cy="50" r="0.65" fill="rgba(255,255,255,0.95)" />
          <circle cx="86" cy="50" r="0.65" fill="rgba(255,255,255,0.95)" />
          <path d="M19,42 A8,8 0 0 1 19,58" fill="none" stroke="rgba(255,255,255,0.84)" strokeWidth="0.42" />
          <path d="M81,42 A8,8 0 0 0 81,58" fill="none" stroke="rgba(255,255,255,0.84)" strokeWidth="0.42" />
          <path d="M1,1 q3,0 3,3" fill="none" stroke="rgba(255,255,255,0.84)" strokeWidth="0.38" />
          <path d="M1,99 q3,0 3,-3" fill="none" stroke="rgba(255,255,255,0.84)" strokeWidth="0.38" />
          <path d="M99,1 q-3,0 -3,3" fill="none" stroke="rgba(255,255,255,0.84)" strokeWidth="0.38" />
          <path d="M99,99 q-3,0 -3,-3" fill="none" stroke="rgba(255,255,255,0.84)" strokeWidth="0.38" />
          <rect x="0.4" y="43" width="1.4" height="14" fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="0.35" />
          <rect x="98.2" y="43" width="1.4" height="14" fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="0.35" />
          
          {/* Render run lines */}
          {runs.map((run) => {
            const source = getSourceCoordinates(run.fromId);
            if (!source) return null;
            const fromBoard = pitchToBoardCoords(source.x, source.y);
            const toBoard = pitchToBoardCoords(run.toX, run.toY);
            return (
              <g key={run.id}>
                {/* Dashed line */}
                <line
                  x1={fromBoard.x}
                  y1={fromBoard.y}
                  x2={toBoard.x}
                  y2={toBoard.y}
                  stroke="#ffe26d"
                  strokeWidth={0.7}
                  strokeDasharray="2 2"
                  markerEnd="url(#arrow)"
                  pointerEvents="none"
                />
              </g>
            );
          })}
        </svg>

        {/* Render players */}
        {allPlayers.map((player) => {
          const mapped = pitchToBoardCoords(player.posX, player.posY);
          const isSelected = selectedRunSourceId === player.id;
          const assignedName = player.color !== 'red' ? starterNames[player.id] : undefined;
          const hasStarter = !!assignedName;
          return (
            <div
              key={player.id}
              className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center"
              style={{ left: `${mapped.x}%`, top: `${mapped.y}%` }}
            >
              <button
                className={`h-8 w-8 rounded-full border font-bold transition-all text-[11px] ${
                  isSelected
                    ? 'border-[#ffe26d] bg-[#4a7c2e] text-[#ffe26d] ring-2 ring-[#ffe26d]'
                    : player.color === 'red'
                    ? 'border-red-400 bg-red-600 text-white hover:border-red-300'
                    : draggingId === player.id
                    ? 'border-[#efe56b] bg-[#1f3c80] text-[#d2e1ff]'
                    : hasStarter
                    ? 'border-[#efe56b] bg-[#2d4f8f] text-white hover:border-[#a8d5ff]'
                    : 'border-[#8fc6ff] bg-[#2d4f8f] text-white hover:border-[#a8d5ff]'
                }`}
                onPointerDown={(event) => {
                  event.preventDefault();
                  if (event.shiftKey) {
                    setDraggingId(player.id);
                    dragStartRef.current = { x: event.clientX, y: event.clientY };
                    didDragRef.current = false;
                  }
                }}
                onClick={(event) => {
                  event.stopPropagation();
                  if (!event.shiftKey) return;
                  if (didDragRef.current) {
                    didDragRef.current = false;
                    return;
                  }
                  setSelectedRunSourceId(player.id);
                }}
                type="button"
                title={`${assignedName ? `${assignedName} (${player.name})` : player.name} (Shift+drag to move, Shift+click to start run)`}
              >
                {player.name}
              </button>
              {hasStarter && (
                <span className="mt-[1px] whitespace-nowrap rounded bg-black/75 px-1.5 py-[2px] text-[10px] font-bold text-[#efe56b] pointer-events-none shadow-sm">
                  {assignedName}
                </span>
              )}
            </div>
          );
        })}

        {/* Render clickable run endpoints - after players so they appear on top */}
        {runs.map((run) => {
          const endpoint = pitchToBoardCoords(run.toX, run.toY);
          return (
            <button
              key={`run-end-btn-${run.id}`}
              type="button"
              className={`absolute z-10 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 transition-all ${
                selectedRunSourceId === `run-end-${run.id}`
                  ? 'border-yellow-200 bg-yellow-300'
                  : 'border-yellow-400 bg-transparent hover:bg-yellow-400'
              }`}
              onClick={(e) => {
                e.stopPropagation();
                startRunFromRunEnd(run.id);
              }}
              title="Click to extend run from here"
              style={{ left: `${endpoint.x}%`, top: `${endpoint.y}%` }}
            />
          );
        })}
      </div>

      <p className="mt-3 text-sm text-[#efe56b]">
        Shift+drag to move any player • Shift+click to select run source • Click pitch to place run • Click run endpoints to chain • Use Undo/Redo to navigate
      </p>
      <pre className="hidden mt-2 max-h-40 overflow-auto border border-[#68e154] bg-[#0b5f15] p-2 text-xs leading-4">{asJson}</pre>
    </section>
  );
}
