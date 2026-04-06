import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useRef, useState } from 'react';
const initialPlayers = [
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
const opponentPlayers = [
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
function clamp(value, min = 0, max = 100) {
    return Math.max(min, Math.min(max, value));
}
export default function TacticsBoard() {
    const boardRef = useRef(null);
    const [players, setPlayers] = useState(initialPlayers);
    const [draggingId, setDraggingId] = useState(null);
    const [runStartId, setRunStartId] = useState(null);
    const [runs, setRuns] = useState([]);
    const asJson = useMemo(() => JSON.stringify(players.map((p) => ({ id: p.id, posX: Number(p.posX.toFixed(1)), posY: Number(p.posY.toFixed(1)) })), null, 2), [players]);
    const updateByPointer = (clientX, clientY) => {
        if (!draggingId || !boardRef.current)
            return;
        const rect = boardRef.current.getBoundingClientRect();
        const posX = clamp(((clientX - rect.left) / rect.width) * 100);
        const posY = clamp(((clientY - rect.top) / rect.height) * 100);
        setPlayers((prev) => prev.map((p) => (p.id === draggingId ? { ...p, posX, posY } : p)));
    };
    const handleBoardClick = (event) => {
        if (!runStartId || !boardRef.current)
            return;
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
    const getPlayerById = (id) => players.find((player) => player.id === id) || opponentPlayers.find((player) => player.id === id);
    return (_jsxs("section", { className: "border-4 border-[#6f4ca1] bg-[#0f8f1f] p-3 font-mono text-[#d7ff9f]", children: [_jsx("h2", { className: "mb-3 bg-black px-2 py-1 text-sm font-bold uppercase tracking-wider text-[#efe56b]", children: "Tactics Board" }), _jsxs("div", { className: "mb-3 grid gap-2 sm:grid-cols-[1fr_auto]", children: [_jsxs("div", { className: "rounded border border-[#68e154] bg-[#122b13] p-3 text-xs text-[#d7ff9f]", children: [_jsx("p", { className: "font-semibold text-[#efe56b]", children: "Board mode" }), _jsx("p", { children: "Left-to-right layout" }), _jsx("p", { children: "Shift+drag your players" }), _jsxs("p", { children: ["Click a player while holding ", _jsx("span", { className: "font-bold", children: "Shift" }), " to start a run, then click the pitch to place the arrow."] }), _jsxs("p", { className: "mt-2", children: ["Opponent is shown in ", _jsx("span", { className: "text-red-300", children: "red" }), "."] }), runStartId ? _jsxs("p", { className: "mt-2 text-[#ffe26d]", children: ["Run from: ", runStartId] }) : null] }), _jsxs("div", { className: "rounded border border-[#68e154] bg-[#122b13] p-3 text-xs text-[#d7ff9f]", children: [_jsx("p", { className: "font-semibold text-[#efe56b]", children: "Legend" }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "inline-block h-3 w-3 rounded-full bg-[#2e1f4a] border border-[#cdb0ea]" }), " Your players"] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "inline-block h-3 w-3 rounded-full bg-red-600 border border-red-300" }), " Opponent"] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "inline-block h-0.5 w-8 bg-yellow-300", style: { borderStyle: 'dashed' } }), " Run line"] })] })] }), _jsxs("div", { className: "relative h-[420px] w-full overflow-hidden rounded bg-[#153d18]", onPointerMove: (event) => updateByPointer(event.clientX, event.clientY), onPointerUp: () => setDraggingId(null), onPointerLeave: () => setDraggingId(null), onClick: handleBoardClick, ref: boardRef, children: [_jsx("div", { className: "pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_left,_rgba(255,255,255,.08),_transparent_35%),radial-gradient(circle_at_right,_rgba(255,255,255,.05),_transparent_35%)]" }), _jsxs("svg", { viewBox: "0 0 100 100", className: "absolute inset-0 w-full h-full pointer-events-none", children: [_jsx("defs", { children: _jsx("marker", { id: "arrow", viewBox: "0 0 10 10", refX: "8", refY: "5", markerWidth: "6", markerHeight: "6", orient: "auto-start-reverse", children: _jsx("path", { d: "M 0 0 L 10 5 L 0 10 Z", fill: "#ffe26d" }) }) }), runs.map((run) => {
                                const from = getPlayerById(run.fromId);
                                if (!from)
                                    return null;
                                return (_jsx("line", { x1: from.posX, y1: from.posY, x2: run.toX, y2: run.toY, stroke: "#ffe26d", strokeWidth: 0.7, strokeDasharray: "2 2", markerEnd: "url(#arrow)" }, run.id));
                            })] }), [...players, ...opponentPlayers].map((player) => (_jsx("button", { className: `absolute h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full border text-[10px] font-bold ${player.color === 'red'
                            ? 'border-red-400 bg-red-600 text-white'
                            : draggingId === player.id
                                ? 'border-[#efe56b] bg-[#201632] text-[#efe56b]'
                                : 'border-[#cdb0ea] bg-[#2e1f4a] text-[#e7d1ff]'}`, onPointerDown: (event) => {
                            event.preventDefault();
                            if (event.shiftKey) {
                                setRunStartId(player.id);
                                return;
                            }
                            if (player.color !== 'red') {
                                setDraggingId(player.id);
                            }
                        }, style: { left: `${player.posX}%`, top: `${player.posY}%` }, type: "button", children: player.name }, player.id)))] }), _jsx("p", { className: "mt-3 text-xs text-[#efe56b]", children: "Drag your own players from left to right. Use Shift+click on a player, then click the pitch to place a dotted run arrow." }), _jsx("pre", { className: "hidden mt-2 max-h-40 overflow-auto border border-[#68e154] bg-[#0b5f15] p-2 text-[11px] leading-4", children: asJson })] }));
}
