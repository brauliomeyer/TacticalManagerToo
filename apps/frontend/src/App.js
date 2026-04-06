import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import MatchScreen from './components/MatchScreen';
import TacticsBoard from './components/TacticsBoard';
const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';
const socket = io(API_BASE, { autoConnect: false });
const sideMenu = [
    { key: 'human', label: 'Human' },
    { key: 'manager', label: 'Computer Manager' },
    { key: 'manage', label: 'Manage' },
    { key: 'transfers', label: 'Transfers' },
    { key: 'training', label: 'Training' },
    { key: 'tactics', label: 'Tactics' }
];
const topTabs = [
    { key: 'mail', label: 'Mail' },
    { key: 'board', label: 'Board' },
    { key: 'squad', label: 'Squad' },
    { key: 'cup', label: 'Cup' }
];
const pageDescriptions = {
    mail: { title: 'Mailbox', text: 'Je ontvangt hier berichten van bestuur, spelers en pers.' },
    board: { title: 'Board Room', text: 'Bestuursdoelen, budget en verwachtingen voor het seizoen.' },
    squad: { title: 'Squad Hub', text: 'Overzicht van selectie, vorm, conditie en rollen.' },
    cup: { title: 'Cup Overview', text: 'Bekerloting, uitslagen en route naar de finale.' },
    human: { title: 'Human Manager', text: 'Profiel van de menselijke manager en persoonlijke statistieken.' },
    manager: { title: 'AI Manager', text: 'Overzicht van de computer manager keuzes en tegenstandersanalyse.' },
    manage: { title: 'Club Management', text: 'Staf, faciliteiten en langetermijnplanning voor de club.' },
    transfers: { title: 'Transfer Market', text: 'Scoutrapporten, biedingen en contractonderhandelingen.' },
    training: { title: 'Training Ground', text: 'Trainingsschema, focusgebieden en spelersontwikkeling.' },
    tactics: { title: 'Tactical Desk', text: 'Plaats je spelers op het veld en verfijn je formatie.' },
    match: { title: 'Live Match', text: 'Live simulatie met eventlog en mini-pitch.' }
};
function PagePanel({ page, clubs }) {
    if (page === 'tactics')
        return _jsx(TacticsBoard, {});
    if (page === 'match')
        return _jsx(MatchScreen, {});
    return (_jsxs("section", { className: "border-4 border-[#6f4ca1] bg-[#16a51c] p-3", children: [_jsx("h2", { className: "mb-3 border border-[#ceb8e1] bg-[#d5b5ec] p-2 text-center text-xs font-bold uppercase text-[#2e1f4a]", children: pageDescriptions[page].title }), _jsx("div", { className: "retro-pitch mb-3 h-52 border-2 border-[#8ee486]" }), _jsx("p", { className: "border border-[#98ca7a] bg-[#256d22] px-2 py-1 text-xs text-[#d5f8b6]", children: pageDescriptions[page].text }), _jsxs("p", { className: "mt-3 border border-[#98ca7a] bg-[#1f641d] px-2 py-1 text-xs text-[#d5f8b6]", children: ["Active club: ", _jsx("strong", { children: clubs[0]?.name ?? 'Notts Forest' })] })] }));
}
export default function App() {
    const [clubs, setClubs] = useState([]);
    const [events, setEvents] = useState([]);
    const [summary, setSummary] = useState(null);
    const [error, setError] = useState(null);
    const [activePage, setActivePage] = useState('mail');
    useEffect(() => {
        axios
            .get(`${API_BASE}/clubs`)
            .then((res) => setClubs(res.data))
            .catch(() => setError('Could not load clubs from backend.'));
        axios
            .get(`${API_BASE}/manager/summary`)
            .then((res) => setSummary(res.data))
            .catch(() => setError('Could not load manager summary.'));
        socket.connect();
        socket.on('match:update', (payload) => {
            setEvents(payload.events);
        });
        return () => {
            socket.disconnect();
        };
    }, []);
    const fixture = useMemo(() => {
        if (clubs.length < 2)
            return null;
        return { homeClubId: clubs[0].id, awayClubId: clubs[1].id };
    }, [clubs]);
    const simulate = async () => {
        if (!fixture)
            return;
        try {
            await axios.post(`${API_BASE}/matches/simulate`, fixture);
            setActivePage('match');
            setError(null);
        }
        catch {
            setError('Could not simulate match.');
        }
    };
    return (_jsx("main", { className: "min-h-screen bg-[#1a1e2b] p-4 text-[#d4f6a7] md:p-8", children: _jsxs("section", { className: "mx-auto max-w-6xl border-4 border-[#6f4ca1] bg-[#2a8a2b] shadow-[0_0_0_4px_#120d1f]", children: [_jsxs("header", { className: "flex items-center justify-between border-b-4 border-[#6f4ca1] bg-black px-4 py-3 text-[#ebe25f]", children: [_jsx("h1", { className: "text-2xl font-black uppercase tracking-widest", children: "Nott Forest" }), _jsx("button", { className: "border-2 border-[#ebe25f] bg-[#2a8a2b] px-3 py-1 text-xs font-bold uppercase", onClick: simulate, type: "button", children: "Play Next Match" })] }), _jsxs("div", { className: "grid gap-4 p-4 md:grid-cols-[220px_1fr_300px]", children: [_jsxs("aside", { className: "border-4 border-[#6f4ca1] bg-[#2e1f4a] p-3 text-xs", children: [_jsxs("div", { className: "mb-3 border-2 border-white bg-[#fff7de] p-2 text-center text-[#d0121b]", children: [_jsx("p", { className: "text-lg font-black", children: "\u26BD" }), _jsx("p", { className: "font-black uppercase", children: "Notts Forest" })] }), _jsx("p", { className: "mb-3 bg-[#2a8a2b] px-2 py-1 font-bold uppercase text-[#0e1d0f]", children: "1st Division" }), _jsx("ul", { className: "space-y-1", children: sideMenu.map((item) => (_jsx("li", { children: _jsx("button", { className: `w-full border px-2 py-1 text-left font-bold ${activePage === item.key
                                                ? 'border-[#efe56b] bg-[#efe56b] text-[#2e1f4a]'
                                                : 'border-[#b78bda] bg-[#caa6e6] text-[#2e1f4a]'}`, onClick: () => setActivePage(item.key), type: "button", children: item.label }) }, item.key))) }), _jsxs("div", { className: "mt-3 border border-[#98ca7a] bg-[#256d22] p-2 text-[#d5f8b6]", children: [_jsx("p", { className: "font-bold uppercase", children: "Club Value" }), _jsxs("p", { children: ["\u20AC", (clubs[0]?.budget ?? 0).toLocaleString()] })] })] }), _jsxs("section", { children: [_jsx("div", { className: "mb-3 grid grid-cols-4 gap-2 text-center text-[10px] uppercase text-[#2e1f4a]", children: topTabs.map((item) => (_jsx("button", { className: `border p-2 font-bold ${activePage === item.key
                                            ? 'border-[#efe56b] bg-[#efe56b] text-[#2e1f4a]'
                                            : 'border-[#ceb8e1] bg-[#d5b5ec] text-[#2e1f4a]'}`, onClick: () => setActivePage(item.key), type: "button", children: item.label }, item.key))) }), _jsx(PagePanel, { clubs: clubs, page: activePage }), error ? (_jsx("p", { className: "mt-3 border border-[#98ca7a] bg-[#256d22] px-2 py-1 text-xs text-[#d5f8b6]", children: error })) : null] }), _jsxs("aside", { className: "border-4 border-[#6f4ca1] bg-[#0d5e13] p-3 text-xs text-[#d5f8b6]", children: [_jsx("h2", { className: "mb-2 font-black uppercase text-[#efe56b]", children: "Managerbook" }), summary ? (_jsxs("ul", { className: "space-y-1", children: [_jsxs("li", { children: ["Status: ", summary.status] }), _jsxs("li", { children: ["Level: ", summary.level] }), _jsxs("li", { children: ["Successive Wins: ", summary.successiveWins] }), _jsxs("li", { children: ["Successive Losses: ", summary.successiveLosses] }), _jsxs("li", { children: ["Total Wins: ", summary.totalWins] }), _jsxs("li", { children: ["Total Losses: ", summary.totalLosses] }), _jsxs("li", { children: ["Total Draws: ", summary.totalDraws] })] })) : (_jsx("p", { children: "Loading manager stats..." })), _jsx("h3", { className: "mb-2 mt-4 font-black uppercase text-[#efe56b]", children: "Match Feed" }), _jsx("ul", { className: "space-y-1", children: events.length === 0 ? (_jsx("li", { children: "No match events yet." })) : (events.map((event) => (_jsxs("li", { className: "border border-[#98ca7a] bg-[#256d22] px-2 py-1", children: [event.minute, "' ", event.description ?? `${event.team ?? 'MATCH'} ${event.type}`] }, `${event.minute}-${event.type}`)))) })] })] })] }) }));
}
