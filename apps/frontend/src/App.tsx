import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import type { ManagerSummary, MatchEvent } from '@tmt/shared';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';

interface Club {
  id: string;
  name: string;
  country: string;
  budget: number;
  reputation: number;
}

const socket = io(API_BASE, { autoConnect: false });

const menu = ['Human', 'Computer Manager', 'Manage', 'Transfers', 'Training', 'Tactics'];

export default function App() {
  const [clubs, setClubs] = useState<Club[]>([]);
  const [events, setEvents] = useState<MatchEvent[]>([]);
  const [summary, setSummary] = useState<ManagerSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    axios
      .get<Club[]>(`${API_BASE}/clubs`)
      .then((res) => setClubs(res.data))
      .catch(() => setError('Could not load clubs from backend.'));

    axios
      .get<ManagerSummary>(`${API_BASE}/manager/summary`)
      .then((res) => setSummary(res.data))
      .catch(() => setError('Could not load manager summary.'));

    socket.connect();
    socket.on('match:update', (payload: { events: MatchEvent[] }) => {
      setEvents(payload.events);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const fixture = useMemo(() => {
    if (clubs.length < 2) return null;
    return { homeClubId: clubs[0].id, awayClubId: clubs[1].id };
  }, [clubs]);

  const simulate = async () => {
    if (!fixture) return;

    try {
      await axios.post(`${API_BASE}/matches/simulate`, fixture);
      setError(null);
    } catch {
      setError('Could not simulate match.');
    }
  };

  return (
    <main className="min-h-screen bg-[#1a1e2b] p-4 text-[#d4f6a7] md:p-8">
      <section className="mx-auto max-w-6xl border-4 border-[#6f4ca1] bg-[#2a8a2b] shadow-[0_0_0_4px_#120d1f]">
        <header className="flex items-center justify-between border-b-4 border-[#6f4ca1] bg-black px-4 py-3 text-[#ebe25f]">
          <h1 className="text-2xl font-black uppercase tracking-widest">Nott Forest</h1>
          <button
            className="border-2 border-[#ebe25f] bg-[#2a8a2b] px-3 py-1 text-xs font-bold uppercase"
            onClick={simulate}
            type="button"
          >
            Play Next Match
          </button>
        </header>

        <div className="grid gap-4 p-4 md:grid-cols-[220px_1fr_300px]">
          <aside className="border-4 border-[#6f4ca1] bg-[#2e1f4a] p-3 text-xs">
            <div className="mb-3 border-2 border-white bg-[#fff7de] p-2 text-center text-[#d0121b]">
              <p className="text-lg font-black">⚽</p>
              <p className="font-black uppercase">Notts Forest</p>
            </div>
            <p className="mb-3 bg-[#2a8a2b] px-2 py-1 font-bold uppercase text-[#0e1d0f]">1st Division</p>
            <ul className="space-y-1">
              {menu.map((item) => (
                <li className="border border-[#b78bda] bg-[#caa6e6] px-2 py-1 font-bold text-[#2e1f4a]" key={item}>
                  {item}
                </li>
              ))}
            </ul>
            <div className="mt-3 border border-[#98ca7a] bg-[#256d22] p-2 text-[#d5f8b6]">
              <p className="font-bold uppercase">Club Value</p>
              <p>€{(clubs[0]?.budget ?? 0).toLocaleString()}</p>
            </div>
          </aside>

          <section className="border-4 border-[#6f4ca1] bg-[#16a51c] p-3">
            <div className="mb-3 grid grid-cols-4 gap-2 text-center text-[10px] uppercase text-[#2e1f4a]">
              {['Mail', 'Board', 'Squad', 'Cup'].map((item) => (
                <div className="border border-[#ceb8e1] bg-[#d5b5ec] p-2 font-bold" key={item}>
                  {item}
                </div>
              ))}
            </div>
            <div className="retro-pitch mb-3 h-52 border-2 border-[#8ee486]" />
            <p className="border border-[#98ca7a] bg-[#256d22] px-2 py-1 text-xs text-[#d5f8b6]">
              {error ?? 'Reinforcing... Board wants a solid promotion challenge.'}
            </p>
          </section>

          <aside className="border-4 border-[#6f4ca1] bg-[#0d5e13] p-3 text-xs text-[#d5f8b6]">
            <h2 className="mb-2 font-black uppercase text-[#efe56b]">Managerbook</h2>
            {summary ? (
              <ul className="space-y-1">
                <li>Status: {summary.status}</li>
                <li>Level: {summary.level}</li>
                <li>Successive Wins: {summary.successiveWins}</li>
                <li>Successive Losses: {summary.successiveLosses}</li>
                <li>Total Wins: {summary.totalWins}</li>
                <li>Total Losses: {summary.totalLosses}</li>
                <li>Total Draws: {summary.totalDraws}</li>
              </ul>
            ) : (
              <p>Loading manager stats...</p>
            )}

            <h3 className="mt-4 mb-2 font-black uppercase text-[#efe56b]">Match Feed</h3>
            <ul className="space-y-1">
              {events.length === 0 ? (
                <li>No match events yet.</li>
              ) : (
                events.map((event) => (
                  <li className="border border-[#98ca7a] bg-[#256d22] px-2 py-1" key={`${event.minute}-${event.type}`}>
                    {event.minute}' {event.description ?? `${event.team ?? 'MATCH'} ${event.type}`}
                  </li>
                ))
              )}
            </ul>
          </aside>
        </div>
      </section>
    </main>
  );
}
