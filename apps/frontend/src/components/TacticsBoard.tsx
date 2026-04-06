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

const initialPlayers: TacticalPlayer[] = [
  { id: 'gk', name: 'GK', posX: 8, posY: 50 },
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
  { id: 'ogk', name: 'GK', posX: 92, posY: 50, color: 'red' },
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

export default function TacticsBoard() {
  const boardRef = useRef<HTMLDivElement | null>(null);
  const [players, setPlayers] = useState<TacticalPlayer[]>(initialPlayers);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [runStartId, setRunStartId] = useState<string | null>(null);
  const [runs, setRuns] = useState<RunLine[]>([]);

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

    const rect = boardRef.current.getBoundingClientRect();
    const posX = clamp(((clientX - rect.left) / rect.width) * 100);
    const posY = clamp(((clientY - rect.top) / rect.height) * 100);

    setPlayers((prev) => prev.map((p) => (p.id === draggingId ? { ...p, posX, posY } : p)));
  };

  const handleBoardClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!runStartId || !boardRef.current) return;

    const rect = boardRef.current.getBoundingClientRect();
    const toX = clamp(((event.clientX - rect.left) / rect.width) * 100);
    const toY = clamp(((event.clientY - rect.top) / rect.height) * 100);

    setRuns((prev) => [
      ...prev,
      {
        id: `run-${prev.length + 1}`,
        fromId: runStartId,
        toX,
        toY
      }
    ]);
    setRunStartId(null);
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
        </div>
      </div>

      <div
        className="relative h-[420px] w-full overflow-hidden rounded border-2 border-[#74be5f] bg-[#1f5b1a] shadow-[inset_0_0_35px_rgba(0,0,0,0.45)]"
        onPointerMove={(event) => updateByPointer(event.clientX, event.clientY)}
        onPointerUp={() => setDraggingId(null)}
        onPointerLeave={() => setDraggingId(null)}
        onClick={handleBoardClick}
        ref={boardRef}
      >
        <div className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(90deg,rgba(93,201,38,0.8)_0,rgba(93,201,38,0.8)_5%,rgba(78,178,31,0.82)_5%,rgba(78,178,31,0.82)_10%)]" />
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-2 border border-white/80" />
        </div>

        <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full pointer-events-none">
          <defs>
            <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 Z" fill="#ffe26d" />
            </marker>
          </defs>
          <rect x="3" y="3" width="94" height="94" fill="none" stroke="rgba(255,255,255,0.88)" strokeWidth="0.8" />
          <line x1="50" y1="3" x2="50" y2="97" stroke="rgba(255,255,255,0.84)" strokeWidth="0.45" />
          <circle cx="50" cy="50" r="7" fill="none" stroke="rgba(255,255,255,0.84)" strokeWidth="0.45" />
          <circle cx="50" cy="50" r="0.9" fill="rgba(255,255,255,0.95)" />
          <rect x="3" y="20" width="16" height="60" fill="none" stroke="rgba(255,255,255,0.84)" strokeWidth="0.45" />
          <rect x="81" y="20" width="16" height="60" fill="none" stroke="rgba(255,255,255,0.84)" strokeWidth="0.45" />
          <rect x="3" y="35" width="6" height="30" fill="none" stroke="rgba(255,255,255,0.84)" strokeWidth="0.42" />
          <rect x="91" y="35" width="6" height="30" fill="none" stroke="rgba(255,255,255,0.84)" strokeWidth="0.42" />
          <circle cx="14" cy="50" r="0.65" fill="rgba(255,255,255,0.95)" />
          <circle cx="86" cy="50" r="0.65" fill="rgba(255,255,255,0.95)" />
          <path d="M19,42 A8,8 0 0 1 19,58" fill="none" stroke="rgba(255,255,255,0.84)" strokeWidth="0.42" />
          <path d="M81,42 A8,8 0 0 0 81,58" fill="none" stroke="rgba(255,255,255,0.84)" strokeWidth="0.42" />
          <path d="M3,3 q3,0 3,3" fill="none" stroke="rgba(255,255,255,0.84)" strokeWidth="0.38" />
          <path d="M3,97 q3,0 3,-3" fill="none" stroke="rgba(255,255,255,0.84)" strokeWidth="0.38" />
          <path d="M97,3 q-3,0 -3,3" fill="none" stroke="rgba(255,255,255,0.84)" strokeWidth="0.38" />
          <path d="M97,97 q-3,0 -3,-3" fill="none" stroke="rgba(255,255,255,0.84)" strokeWidth="0.38" />
          <rect x="1.2" y="43" width="1.8" height="14" fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="0.35" />
          <rect x="97" y="43" width="1.8" height="14" fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="0.35" />
          {runs.map((run) => {
            const from = getPlayerById(run.fromId);
            if (!from) return null;
            return (
              <line
                key={run.id}
                x1={from.posX}
                y1={from.posY}
                x2={run.toX}
                y2={run.toY}
                stroke="#ffe26d"
                strokeWidth={0.7}
                strokeDasharray="2 2"
                markerEnd="url(#arrow)"
              />
            );
          })}
        </svg>

        {[...players, ...opponentPlayers].map((player) => (
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
                setRunStartId(player.id);
                return;
              }
              if (player.color !== 'red') {
                setDraggingId(player.id);
              }
            }}
            style={{ left: `${player.posX}%`, top: `${player.posY}%` }}
            type="button"
          >
            {player.name}
          </button>
        ))}
      </div>

      <p className="mt-3 text-xs text-[#efe56b]">Drag your own players from left to right. Use Shift+click on a player, then click the pitch to place a dotted run arrow.</p>
      <pre className="hidden mt-2 max-h-40 overflow-auto border border-[#68e154] bg-[#0b5f15] p-2 text-[11px] leading-4">{asJson}</pre>
    </section>
  );
}
