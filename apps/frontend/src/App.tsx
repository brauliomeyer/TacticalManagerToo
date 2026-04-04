import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import type { MatchEvent } from '@tmt/shared';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';

interface Club {
  id: string;
  name: string;
  country: string;
  budget: number;
  reputation: number;
}

const socket = io(API_BASE, { autoConnect: false });

export default function App() {
  const [clubs, setClubs] = useState<Club[]>([]);
  const [events, setEvents] = useState<MatchEvent[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    axios
      .get<Club[]>(`${API_BASE}/clubs`)
      .then((res) => setClubs(res.data))
      .catch(() => setError('Could not load clubs from backend.'));

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
    <main className="min-h-screen bg-zinc-950 p-6 text-zinc-100">
      <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-2">
        <section className="rounded border border-lime-400 bg-panel p-4 shadow-lg shadow-lime-900/30">
          <h1 className="mb-3 text-3xl font-bold uppercase tracking-widest text-lime-300">
            Tactical Manager Too
          </h1>
          <p className="mb-4 text-sm text-zinc-300">
            Retro-inspired football manager dashboard with live match events.
          </p>
          {error ? <p className="mb-3 text-sm text-red-400">{error}</p> : null}
          <button
            className="rounded bg-lime-500 px-4 py-2 font-semibold text-zinc-950 hover:bg-lime-400"
            onClick={simulate}
            type="button"
          >
            Simulate match
          </button>
          <ul className="mt-4 space-y-2 text-sm">
            {clubs.map((club) => (
              <li className="rounded bg-zinc-900 px-3 py-2" key={club.id}>
                {club.name} ({club.country}) — Budget €{club.budget.toLocaleString()}
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded border border-cyan-400 bg-panel p-4 shadow-lg shadow-cyan-900/30">
          <h2 className="mb-3 text-xl font-bold uppercase tracking-wide text-cyan-300">Match Feed</h2>
          <ul className="space-y-2 text-sm">
            {events.length === 0 ? (
              <li className="text-zinc-400">No events yet. Start a simulation.</li>
            ) : (
              events.map((event) => (
                <li className="rounded bg-zinc-900 px-3 py-2" key={`${event.minute}-${event.type}`}>
                  {event.minute}' — {event.description}
                </li>
              ))
            )}
          </ul>
        </section>
      </div>
    </main>
  );
}
