import { useMemo, useRef, useState } from 'react';

type TacticalPlayer = {
  id: string;
  name: string;
  posX: number;
  posY: number;
};

const initialPlayers: TacticalPlayer[] = [
  { id: 'gk', name: 'GK', posX: 50, posY: 8 },
  { id: 'lb', name: 'LB', posX: 18, posY: 24 },
  { id: 'cb1', name: 'CB', posX: 40, posY: 24 },
  { id: 'cb2', name: 'CB', posX: 60, posY: 24 },
  { id: 'rb', name: 'RB', posX: 82, posY: 24 },
  { id: 'cm1', name: 'CM', posX: 28, posY: 52 },
  { id: 'cm2', name: 'CM', posX: 50, posY: 58 },
  { id: 'cm3', name: 'CM', posX: 72, posY: 52 },
  { id: 'lw', name: 'LW', posX: 28, posY: 80 },
  { id: 'st', name: 'ST', posX: 50, posY: 86 },
  { id: 'rw', name: 'RW', posX: 72, posY: 80 }
];

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

export default function TacticsBoard() {
  const boardRef = useRef<HTMLDivElement | null>(null);
  const [players, setPlayers] = useState<TacticalPlayer[]>(initialPlayers);
  const [draggingId, setDraggingId] = useState<string | null>(null);

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

  return (
    <section className="border-4 border-[#6f4ca1] bg-[#0f8f1f] p-3 font-mono text-[#d7ff9f]">
      <h2 className="mb-3 bg-black px-2 py-1 text-sm font-bold uppercase tracking-wider text-[#efe56b]">Tactics Board</h2>

      <div
        className="relative h-[420px] w-full border-2 border-[#97f77a] bg-[#16a51c]"
        onPointerMove={(event) => updateByPointer(event.clientX, event.clientY)}
        onPointerUp={() => setDraggingId(null)}
        onPointerLeave={() => setDraggingId(null)}
        ref={boardRef}
      >
        <div className="pointer-events-none absolute inset-[8%] border border-[#68e154]" />
        <div className="pointer-events-none absolute left-1/2 top-[8%] h-[84%] w-px -translate-x-1/2 bg-[#68e154]" />
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#68e154]" />

        {players.map((player) => (
          <button
            className={`absolute h-8 w-8 -translate-x-1/2 -translate-y-1/2 border text-[10px] font-bold ${
              draggingId === player.id
                ? 'border-[#efe56b] bg-[#201632] text-[#efe56b]'
                : 'border-[#cdb0ea] bg-[#2e1f4a] text-[#e7d1ff]'
            }`}
            key={player.id}
            onPointerDown={(event) => {
              event.preventDefault();
              setDraggingId(player.id);
            }}
            style={{ left: `${player.posX}%`, top: `${player.posY}%` }}
            type="button"
          >
            {player.name}
          </button>
        ))}
      </div>

      <p className="mt-3 text-xs text-[#efe56b]">Drag players freely. Positions are stored as posX/posY (0–100).</p>
      <pre className="mt-2 max-h-40 overflow-auto border border-[#68e154] bg-[#0b5f15] p-2 text-[11px] leading-4">{asJson}</pre>
    </section>
  );
}
