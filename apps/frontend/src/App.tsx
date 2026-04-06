import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import type { ManagerSummary, MatchEvent } from '@tmt/shared';
import MatchScreen from './components/MatchScreen';
import TacticsBoard from './components/TacticsBoard';
import { fallbackClubs } from './fallbackClubs';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';

interface Club {
  id: string;
  name: string;
  country: string;
  budget: number;
  reputation: number;
  leagueId?: string | null;
  leagueName?: string | null;
}

type PageKey = 'mail' | 'board' | 'squad' | 'cup' | 'human' | 'manager' | 'manage' | 'transfers' | 'training' | 'tactics' | 'match';

const socket = io(API_BASE, { autoConnect: false });

const sideMenu: { key: PageKey; label: string }[] = [
  { key: 'human', label: 'Human' },
  { key: 'manager', label: 'Computer Manager' },
  { key: 'manage', label: 'Manage' },
  { key: 'transfers', label: 'Transfers' },
  { key: 'training', label: 'Training' },
  { key: 'tactics', label: 'Tactics' }
];

const topTabs: { key: PageKey; label: string }[] = [
  { key: 'mail', label: 'Mail' },
  { key: 'board', label: 'Board' },
  { key: 'squad', label: 'Squad' },
  { key: 'cup', label: 'Cup' }
];

const pageDescriptions: Record<PageKey, { title: string; text: string }> = {
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

function PagePanel({ page, activeClub }: { page: PageKey; activeClub: Club }) {
  if (page === 'tactics') return <TacticsBoard />;
  if (page === 'match') return <MatchScreen />;

  return (
    <section className="border-4 border-[#6f4ca1] bg-[#16a51c] p-3">
      <h2 className="mb-3 border border-[#ceb8e1] bg-[#d5b5ec] p-2 text-center text-xs font-bold uppercase text-[#2e1f4a]">
        {pageDescriptions[page].title}
      </h2>
      <div className="retro-pitch mb-3 h-52 border-2 border-[#8ee486]" />
      <p className="border border-[#98ca7a] bg-[#256d22] px-2 py-1 text-xs text-[#d5f8b6]">{pageDescriptions[page].text}</p>
      <p className="mt-3 border border-[#98ca7a] bg-[#1f641d] px-2 py-1 text-xs text-[#d5f8b6]">
        Active club: <strong>{activeClub.name}</strong>
      </p>
    </section>
  );
}

function normalizeClubs(payload: unknown): Club[] {
  if (Array.isArray(payload)) {
    return payload as Club[];
  }

  if (payload && typeof payload === 'object' && Array.isArray((payload as { clubs?: unknown[] }).clubs)) {
    return (payload as { clubs: Club[] }).clubs;
  }

  return [];
}

function getDefaultClubId(clubs: Club[]) {
  return clubs.find((club) => club.name === 'Nottingham Forest FC')?.id ?? clubs[0]?.id ?? null;
}

export default function App() {
  const [clubs, setClubs] = useState<Club[]>([]);
  const [activeClubId, setActiveClubId] = useState<string | null>(null);
  const [events, setEvents] = useState<MatchEvent[]>([]);
  const [summary, setSummary] = useState<ManagerSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activePage, setActivePage] = useState<PageKey>('mail');

  useEffect(() => {
    axios
      .get<Club[]>(`${API_BASE}/clubs`)
      .then((res) => {
        const nextClubs = normalizeClubs(res.data);
        setClubs(nextClubs.length > 0 ? nextClubs : [...fallbackClubs]);
      })
      .catch(() => {
        setClubs([...fallbackClubs]);
      });

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

  useEffect(() => {
    if (clubs.length === 0) {
      setActiveClubId(null);
      return;
    }

    if (!activeClubId || !clubs.some((club: Club) => club.id === activeClubId)) {
      setActiveClubId(getDefaultClubId(clubs));
    }
  }, [clubs, activeClubId]);

  const fallbackClub: Club = {
    id: '',
    name: 'Notts Forest',
    country: '1st Division',
    budget: 0,
    reputation: 0,
    leagueId: null,
    leagueName: '1st Division'
  };

  const activeClub = clubs.find((club: Club) => club.id === activeClubId) ?? fallbackClub;

  const competitionClubs = useMemo(() => {
    if (clubs.length === 0) return [];
    if (activeClub.leagueId) {
      const sameLeague = clubs.filter((club: Club) => club.leagueId === activeClub.leagueId);
      if (sameLeague.length > 0) return sameLeague;
    }

    if (activeClub.country) {
      const sameCountry = clubs.filter((club: Club) => club.country === activeClub.country);
      if (sameCountry.length > 0) return sameCountry;
    }

    return clubs;
  }, [clubs, activeClub.leagueId, activeClub.country]);

  const activeCompetitionIndex = Math.max(
    0,
    competitionClubs.findIndex((club: Club) => club.id === activeClub.id)
  );

  const fixture = useMemo(() => {
    if (clubs.length < 2) return null;
    const awayClub = clubs.find((club: Club) => club.id !== activeClub.id) ?? clubs[0];
    return { homeClubId: activeClub.id, awayClubId: awayClub.id };
  }, [clubs, activeClub.id]);

  const previousClub = () => {
    if (competitionClubs.length === 0) return;
    const nextIndex = (activeCompetitionIndex - 1 + competitionClubs.length) % competitionClubs.length;
    setActiveClubId(competitionClubs[nextIndex].id);
  };

  const nextClub = () => {
    if (competitionClubs.length === 0) return;
    const nextIndex = (activeCompetitionIndex + 1) % competitionClubs.length;
    setActiveClubId(competitionClubs[nextIndex].id);
  };

  const simulate = async () => {
    if (!fixture) return;

    try {
      await axios.post(`${API_BASE}/matches/simulate`, fixture);
      setActivePage('match');
      setError(null);
    } catch {
      setError('Could not simulate match.');
    }
  };

  return (
    <main className="min-h-screen bg-[#1a1e2b] p-4 text-[#d4f6a7] md:p-8">
      <section className="mx-auto max-w-6xl border-4 border-[#6f4ca1] bg-[#2a8a2b] shadow-[0_0_0_4px_#120d1f]">
        <header className="flex items-center justify-between border-b-4 border-[#6f4ca1] bg-black px-4 py-3 text-[#ebe25f]">
          <h1 className="text-2xl font-black uppercase tracking-widest">{activeClub.name}</h1>
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
              <div className="px-2">
                <p className="text-lg font-black">{activeClub.name}</p>
                <p className="text-[10px] uppercase tracking-[0.2em] text-[#2e1f4a]">{activeClub.country || '1st Division'}</p>
              </div>
            </div>
            <p className="mb-2 bg-[#2a8a2b] px-2 py-1 font-bold uppercase text-[#0e1d0f]">
              {(activeClub.leagueName || activeClub.country || '1st Division').toUpperCase()}
            </p>
            <div className="mb-3 flex items-center justify-between gap-2 rounded border border-[#d0121b] bg-[#2a8a2b] px-2 py-2 text-xs font-bold text-[#d0121b]">
              <button
                type="button"
                onClick={previousClub}
                className="rounded border border-[#d0121b] bg-[#f0d9cf] px-3 py-1 text-xs font-bold text-[#2e1f4a]"
                disabled={competitionClubs.length <= 1}
              >
                ‹
              </button>
              <span className="uppercase">Switch club</span>
              <button
                type="button"
                onClick={nextClub}
                className="rounded border border-[#d0121b] bg-[#f0d9cf] px-3 py-1 text-xs font-bold text-[#2e1f4a]"
                disabled={competitionClubs.length <= 1}
              >
                ›
              </button>
            </div>
            <ul className="space-y-1">
              {sideMenu.map((item) => (
                <li key={item.key}>
                  <button
                    className={`w-full border px-2 py-1 text-left font-bold ${
                      activePage === item.key
                        ? 'border-[#efe56b] bg-[#efe56b] text-[#2e1f4a]'
                        : 'border-[#b78bda] bg-[#caa6e6] text-[#2e1f4a]'
                    }`}
                    onClick={() => setActivePage(item.key)}
                    type="button"
                  >
                    {item.label}
                  </button>
                </li>
              ))}
            </ul>
            <div className="mt-3 border border-[#98ca7a] bg-[#256d22] p-2 text-[#d5f8b6]">
              <p className="font-bold uppercase">Club Value</p>
              <p>€{(activeClub.budget ?? 0).toLocaleString()}</p>
            </div>
          </aside>

          <section>
            <div className="mb-3 grid grid-cols-4 gap-2 text-center text-[10px] uppercase text-[#2e1f4a]">
              {topTabs.map((item) => (
                <button
                  className={`border p-2 font-bold ${
                    activePage === item.key
                      ? 'border-[#efe56b] bg-[#efe56b] text-[#2e1f4a]'
                      : 'border-[#ceb8e1] bg-[#d5b5ec] text-[#2e1f4a]'
                  }`}
                  key={item.key}
                  onClick={() => setActivePage(item.key)}
                  type="button"
                >
                  {item.label}
                </button>
              ))}
            </div>

            <PagePanel activeClub={activeClub} page={activePage} />

            {error ? (
              <p className="mt-3 border border-[#98ca7a] bg-[#256d22] px-2 py-1 text-xs text-[#d5f8b6]">{error}</p>
            ) : null}
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

            <h3 className="mb-2 mt-4 font-black uppercase text-[#efe56b]">Match Feed</h3>
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
