import React, { useMemo, useRef, useState } from 'react';

type TacticalPlayer = {
  id: string;
  name: string;
  posX: number;
  posY: number;
  color?: string;
};

type RunLine = {
  id: string;
  fromId: string;
  toX: number;
  toY: number;
};

type RunStart = {
  type: 'player' | 'position';
  id?: string;
  x?: number;
  y?: number;
};

const initialPlayers: TacticalPlayer[] = [
  { id: 'gk', name: 'GK', posX: 14, posY: 50 },
  { id: 'lb', name: 'LB', posX: 24, posY: 30 },
  { id: 'cb1', name: 'CB', posX: 24, posY: 50 },
  { id: 'cb2', name: 'CB', posX: 24, posY: 70 },
  { id: 'rb', name: 'RB', posX: 24, posY: 90 },
  { id: 'cm1', name: 'CM', posX: 45, posY: 30 },
  { id: 'cm2', name: 'CM', posX: 45, posY: 50 },
  { id: 'cm3', name: 'CM', posX: 45, posY: 70 },
  { id: 'lw', name: 'LW', posX: 70, posY: 20 },
  { id: 'st', name: 'ST', posX: 82, posY: 50 },
  { id: 'rw', name: 'RW', posX: 70, posY: 80 }
];

const opponentPlayers: TacticalPlayer[] = [
  { id: 'ogk', name: 'GK', posX: 86, posY: 50, color: 'red' },
  { id: 'olb', name: 'LB', posX: 76, posY: 30, color: 'red' },
  { id: 'ocb1', name: 'CB', posX: 76, posY: 45, color: 'red' },
  { id: 'ocb2', name: 'CB', posX: 76, posY: 55, color: 'red' },
  { id: 'orb', name: 'RB', posX: 76, posY: 70, color: 'red' },
  { id: 'ocm1', name: 'CM', posX: 60, posY: 25, color: 'red' },
  { id: 'ocm2', name: 'CM', posX: 60, posY: 50, color: 'red' },
  { id: 'ocm3', name: 'CM', posX: 60, posY: 75, color: 'red' },
  { id: 'olw', name: 'LW', posX: 48, posY: 20, color: 'red' },
  { id: 'ost', name: 'ST', posX: 36, posY: 50, color: 'red' },
  { id: 'orw', name: 'RW', posX: 48, posY: 80, color: 'red' }
];

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

export default function TacticsBoard() {
  const boardRef = useRef<HTMLDivElement | null>(null);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const didDragRef = useRef(false);
  const [players, setPlayers] = useState<TacticalPlayer[]>(initialPlayers);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [runStartId, setRunStartId] = useState<string | null>(null);
  const [runChainStart, setRunChainStart] = useState<RunStart | null>(null);
  const [runs, setRuns] = useState<RunLine[]>([]);

  const undoLastRun = () => {
    setRuns((prev) => prev.slice(0, -1));
  };

  const removeRun = (runId: string) => {
    setRuns((prev) => prev.filter((run) => run.id !== runId));
  };

  const clearRuns = () => {
    setRuns([]);
  };

  const asJson = useMemo(
    () =>
      JSON.stringify(
        players.map((p) => ({ id: p.id, posX: Number(p.posX.toFixed(1)), posY: Number(p.posY.toFixed(1)) })),
        null,
        2
      ),
    [players]
  );

  const updateByPointer = (clientX: number, clientY: number) => {
    if (!draggingId || !boardRef.current) return;

    if (dragStartRef.current) {
      const dx = Math.abs(clientX - dragStartRef.current.x);
      const dy = Math.abs(clientY - dragStartRef.current.y);
      if (dx > 2 || dy > 2) {
        didDragRef.current = true;
      }
    }

    const rect = boardRef.current.getBoundingClientRect();
    const nextPos = boardToPitchCoords(clientX, clientY, rect);

    setPlayers((prev) => prev.map((p) => (p.id === draggingId ? { ...p, posX: nextPos.x, posY: nextPos.y } : p)));
  };

  const handleBoardClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!runStartId && !runChainStart && !boardRef.current) return;
    if (!runStartId && !runChainStart) return;

    const rect = boardRef.current.getBoundingClientRect();
    const target = boardToPitchCoords(event.clientX, event.clientY, rect);

    // Determine the source - either from player or from last run endpoint
    const sourceId = runStartId || `chain-${Date.now()}`;
    const fromId = runChainStart ? runChainStart.id! : runStartId!;

    setRuns((prev) => [
      ...prev,
      {
        id: sourceId,
        fromId: fromId,
        toX: target.x,
        toY: target.y
      }
    ]);

    // After placing run, enable chaining from the endpoint
    setRunStartId(null);
    setRunChainStart({
      type: 'position',
      id: sourceId,
      x: target.x,
      y: target.y
    });
  };

  const startNewChain = () => {
    if (runs.length > 0) {
      const lastRun = runs[runs.length - 1];
      setRunChainStart({
        type: 'position',
        id: `chain-from-${lastRun.id}`,
        x: lastRun.toX,
        y: lastRun.toY
      });
    }
  };

  const getPlayerById = (id: string) => players.find((player) => player.id === id) || opponentPlayers.find((player) => player.id === id);

  return (
    <section className="border-4 border-[#6f4ca1] bg-[#0f8f1f] p-3 font-mono text-[#d7ff9f]">
      <h2 className="mb-3 bg-black px-2 py-1 text-sm font-bold uppercase tracking-wider text-[#efe56b]">Tactics Board</h2>

      <div className="mb-3 grid gap-2 sm:grid-cols-[1fr_auto]">
        <div className="rounded border border-[#68e154] bg-[#122b13] p-3 text-xs text-[#d7ff9f]">
          <p className="font-semibold text-[#efe56b]">Board mode</p>
          <p>Left-to-right layout</p>
          <p>Shift+drag your players</p>
          <p>Click a player while holding <span className="font-bold">Shift</span> to start a run, then click the pitch to place the arrow.</p>
          <p className="mt-2">Opponent is shown in <span className="text-red-300">red</span>.</p>
          {runStartId ? <p className="mt-2 text-[#ffe26d]">Run from: {runStartId}</p> : null}
        </div>
        <div className="rounded border border-[#68e154] bg-[#122b13] p-3 text-xs text-[#d7ff9f]">
          <p className="font-semibold text-[#efe56b]">Legend</p>
          <div className="flex items-center gap-2"><span className="inline-block h-3 w-3 rounded-full bg-blue-600 border border-blue-300" /> Your players</div>
          <div className="flex items-center gap-2"><span className="inline-block h-3 w-3 rounded-full bg-red-600 border border-red-300" /> Opponent</div>
          <div className="flex items-center gap-2"><span className="inline-block h-0.5 w-8 bg-yellow-300" style={{ borderStyle: 'dashed' }} /> Run line</div>

          <p className="mt-3 font-semibold text-[#efe56b]">Run controls</p>
          <div className="mt-1 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={undoLastRun}
              disabled={runs.length === 0}
              className="rounded border border-[#efe56b] bg-[#1e6d1f] px-2 py-1 text-[11px] font-bold text-[#efe56b] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Undo last
            </button>
            <button
              type="button"
              onClick={clearRuns}
              disabled={runs.length === 0}
              className="rounded border border-[#efe56b] bg-[#1e6d1f] px-2 py-1 text-[11px] font-bold text-[#efe56b] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Clear all
            </button>
            {runStartId ? (
              <button
                type="button"
                onClick={() => setRunStartId(null)}
                className="rounded border border-[#ffe26d] bg-[#3d5e1e] px-2 py-1 text-[11px] font-bold text-[#ffe26d]"
              >
                Cancel start
              </button>
            ) : null}
            {runChainStart ? (
              <button
                type="button"
                onClick={() => setRunChainStart(null)}
                className="rounded border border-[#ffe26d] bg-[#3d5e1e] px-2 py-1 text-[11px] font-bold text-[#ffe26d]"
              >
                Cancel chain
              </button>
            ) : null}
            {!runChainStart && runs.length > 0 ? (
              <button
                type="button"
                onClick={startNewChain}
                className="rounded border border-[#68e154] bg-[#1e6d1f] px-2 py-1 text-[11px] font-bold text-[#68e154]"
              >
                Chain from last
              </button>
            ) : null}
          </div>

          <p className="mt-2 text-[11px] text-[#d7ff9f]">Runs: {runs.length}</p>
          {runs.length > 0 ? (
            <ul className="mt-1 max-h-20 space-y-1 overflow-auto">
              {runs.slice(-4).reverse().map((run) => (
                <li key={`run-item-${run.id}`} className="flex items-center justify-between gap-2 rounded border border-[#68e154] bg-[#114012] px-2 py-1">
                  <span className="truncate">{run.fromId} → ({Math.round(run.toX)}, {Math.round(run.toY)})</span>
                  <button
                    type="button"
                    onClick={() => removeRun(run.id)}
                    className="rounded border border-[#ff9f9f] bg-[#5c1f1f] px-1 py-0.5 text-[10px] font-bold text-[#ffd7d7]"
                    aria-label={`Delete run ${run.id}`}
                  >
                    X
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-1 text-[11px] text-[#9fd28d]">No runs yet.</p>
          )}
          {runChainStart && (
            <p className="mt-2 text-[10px] text-[#ffe26d]">📍 Chaining from run endpoint • click pitch to continue</p>
          )}
        </div>
      </div>

      <div
        className="relative h-[420px] w-full overflow-hidden rounded border-2 border-[#74be5f] bg-[#1f5b1a] shadow-[inset_0_0_35px_rgba(0,0,0,0.45)]"
        onPointerMove={(event) => updateByPointer(event.clientX, event.clientY)}
        onPointerUp={() => {
          setDraggingId(null);
          dragStartRef.current = null;
        }}
        onPointerLeave={() => {
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
          {runs.map((run) => {
            const from = getPlayerById(run.fromId);
            if (!from) return null;
            const fromBoard = pitchToBoardCoords(from.posX, from.posY);
            const toBoard = pitchToBoardCoords(run.toX, run.toY);
            return (
              <line
                key={run.id}
                x1={fromBoard.x}
                y1={fromBoard.y}
                x2={toBoard.x}
                y2={toBoard.y}
                stroke="#ffe26d"
                strokeWidth={0.7}
                strokeDasharray="2 2"
                markerEnd="url(#arrow)"
              />
            );
          })}
        </svg>

        {[...players, ...opponentPlayers].map((player) => {
          const mapped = pitchToBoardCoords(player.posX, player.posY);
          return (
          <button
            className={`absolute h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full border text-[10px] font-bold ${
              player.color === 'red'
                ? 'border-red-400 bg-red-600 text-white'
                : draggingId === player.id
                ? 'border-[#efe56b] bg-[#1f3c80] text-[#d2e1ff]'
                : 'border-[#8fc6ff] bg-[#2d4f8f] text-white'
            }`}
            key={player.id}
            onPointerDown={(event) => {
              event.preventDefault();
              if (event.shiftKey) {
                setDraggingId(player.id);
                dragStartRef.current = { x: event.clientX, y: event.clientY };
                didDragRef.current = false;
              }
            }}
            onClick={(event) => {
              if (!event.shiftKey) return;
              if (didDragRef.current) {
                didDragRef.current = false;
                return;
              }
              setRunChainStart(null);
              setRunStartId(player.id);
            }}
            style={{ left: `${mapped.x}%`, top: `${mapped.y}%` }}
            type="button"
          >
            {player.name}
          </button>
          );
        })}
      </div>

      <p className="mt-3 text-xs text-[#efe56b]">Shift+click any player (blue or red), then click pitch to place arrow. Use "Chain from last" to extend runs. Remove with Undo/Clear/X buttons.</p>
      <pre className="hidden mt-2 max-h-40 overflow-auto border border-[#68e154] bg-[#0b5f15] p-2 text-[11px] leading-4">{asJson}</pre>
    </section>
  );
}
