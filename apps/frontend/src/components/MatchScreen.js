import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from 'react';
const sampleEvents = [
    { minute: 3, type: 'SHOT', team: 'HOME' },
    { minute: 11, type: 'FOUL', team: 'AWAY' },
    { minute: 18, type: 'SHOT', team: 'AWAY' },
    { minute: 29, type: 'GOAL', team: 'HOME' },
    { minute: 44, type: 'FOUL', team: 'HOME' },
    { minute: 57, type: 'SHOT', team: 'HOME' },
    { minute: 72, type: 'GOAL', team: 'AWAY' },
    { minute: 84, type: 'SHOT', team: 'AWAY' }
];
const dotMap = {
    GOAL: { x: 50, y: 12 },
    SHOT: { x: 50, y: 24 },
    FOUL: { x: 50, y: 46 }
};
export default function MatchScreen() {
    const [visibleCount, setVisibleCount] = useState(0);
    const [scoreHome, setScoreHome] = useState(0);
    const [scoreAway, setScoreAway] = useState(0);
    const visibleEvents = useMemo(() => sampleEvents.slice(0, visibleCount), [visibleCount]);
    useEffect(() => {
        if (visibleCount >= sampleEvents.length)
            return;
        const timer = setTimeout(() => {
            const next = sampleEvents[visibleCount];
            if (next.type === 'GOAL') {
                if (next.team === 'HOME')
                    setScoreHome((v) => v + 1);
                else
                    setScoreAway((v) => v + 1);
            }
            setVisibleCount((v) => v + 1);
        }, 900);
        return () => clearTimeout(timer);
    }, [visibleCount]);
    return (_jsxs("section", { className: "border-4 border-[#1a3f1c] bg-[#001f00] p-3 font-mono text-[#7dff7d]", children: [_jsxs("header", { className: "mb-3 border border-[#4dff4d] bg-black px-3 py-2 text-lg font-bold tracking-widest", children: ["HOME ", scoreHome, " - ", scoreAway, " AWAY"] }), _jsxs("div", { className: "grid gap-3 md:grid-cols-[1fr_220px]", children: [_jsxs("div", { className: "border border-[#4dff4d] bg-[#022902] p-2", children: [_jsx("h3", { className: "mb-2 text-sm uppercase text-[#a2ffa2]", children: "Event Log" }), _jsx("ul", { className: "max-h-64 space-y-1 overflow-auto text-xs", children: visibleEvents.length === 0 ? (_jsx("li", { children: "Waiting for kickoff..." })) : (visibleEvents.map((event, index) => (_jsxs("li", { className: "border border-[#2d9e2d] bg-[#053405] px-2 py-1", children: [String(event.minute).padStart(2, '0'), "' ", event.team, " ", event.type] }, `${event.minute}-${index}`)))) })] }), _jsxs("div", { className: "border border-[#4dff4d] bg-[#033003] p-2", children: [_jsx("h3", { className: "mb-2 text-sm uppercase text-[#a2ffa2]", children: "Mini Pitch" }), _jsxs("div", { className: "relative h-64 border border-[#4dff4d] bg-[#055005]", children: [_jsx("div", { className: "absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-[#4dff4d]" }), _jsx("div", { className: "absolute left-1/2 top-1/2 h-12 w-12 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#4dff4d]" }), visibleEvents.map((event, index) => {
                                        const base = dotMap[event.type];
                                        const isHome = event.team === 'HOME';
                                        const x = isHome ? base.x - 20 + ((index % 4) * 6) : base.x + 20 - ((index % 4) * 6);
                                        const y = isHome ? base.y + (index % 5) * 4 : 100 - base.y - (index % 5) * 4;
                                        return (_jsx("span", { className: "absolute h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#b8ff00]", style: { left: `${x}%`, top: `${y}%` } }, `${event.minute}-${event.type}-${index}`));
                                    })] })] })] })] }));
}
