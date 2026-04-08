import { useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import type { ManagerSummary, MatchEvent } from '@tmt/shared';
import MatchScreen from './components/MatchScreen';
import TacticsBoard from './components/TacticsBoard';
import ClubCrest from './components/ClubCrest';
import { fallbackClubs } from './fallbackClubs';
import {
  synthesizeEventData,
  calculateDerivedAttributes,
  detectRoles,
  calculateOvr,
  calculateFormImpact,
  calculateFatigueImpact,
  applyVariance,
  type DerivedAttributes,
  type PlayerProfile,
} from './playerEngine';

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

interface DivisionGroup {
  id: string;
  name: string;
  country: string;
  clubs: Club[];
}

interface StandingRow {
  position: number;
  clubId: string;
  clubName: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;
  points: number;
  updatedAt: string | null;
}

interface SquadPlayer {
  id: string;
  name: string;
  age: number;
  role: string;
  pac: number;
  sho: number;
  pas: number;
  dri: number;
  def: number;
  phy: number;
  morale: number;
  stamina: number;
  form: number;
  potential: number;
  /* Original Tactical Manager attributes (0-20 scale) */
  played: number;
  scored: number;
  speed: number;
  control: number;
  tackling: number;
  passing: number;
  heading: number;
  shooting: number;
  marking: number;
  vision: number;
  caps: number;
  experience: number;
  fitness: number;
  freshness: number;
  influence: number;
  attitude: number;
  reliability: number;
}

type SquadSortKey = 'overall' | 'name' | 'age' | 'morale' | 'potential';
type SquadStatus = 'STARTER' | 'BENCH' | 'EXCLUDED';

const MAX_STARTERS = 11;
const MAX_BENCH = 12;

const ALL_POSITIONS = [
  'GOALKEEPER',
  'LEFT_BACK',
  'RIGHT_BACK',
  'CENTER_BACK',
  'SWEEPER',
  'LEFT_WING_BACK',
  'RIGHT_WING_BACK',
  'DEFENSIVE_MIDFIELDER',
  'CENTRAL_MIDFIELDER',
  'ATTACKING_MIDFIELDER',
  'BOX_TO_BOX_MIDFIELDER',
  'PLAYMAKER',
  'ANCHOR',
  'LEFT_WINGER',
  'RIGHT_WINGER',
  'LEFT_MIDFIELDER',
  'RIGHT_MIDFIELDER',
  'INVERTED_WINGER',
  'STRIKER',
  'TARGET_MAN',
  'FALSE_NINE',
  'SECOND_STRIKER',
] as const;

const fallbackSquadRoles = [
  'GOALKEEPER',
  'LEFT_BACK',
  'CENTER_BACK',
  'CENTER_BACK',
  'RIGHT_BACK',
  'DEFENSIVE_MIDFIELDER',
  'CENTRAL_MIDFIELDER',
  'CENTRAL_MIDFIELDER',
  'LEFT_WINGER',
  'STRIKER',
  'RIGHT_WINGER',
  'GOALKEEPER',
  'LEFT_BACK',
  'CENTER_BACK',
  'RIGHT_BACK',
  'DEFENSIVE_MIDFIELDER',
  'CENTRAL_MIDFIELDER',
  'ATTACKING_MIDFIELDER',
  'LEFT_WINGER',
  'STRIKER',
  'RIGHT_WINGER',
  'STRIKER',
  'PLAYMAKER'
] as const;

const fallbackFirstNames = [
  'James', 'Oliver', 'Ethan', 'Noah', 'Liam', 'Jacob', 'Samuel', 'Leo', 'Mason', 'Ryan'
];

const fallbackLastNames = [
  'Walker', 'Brown', 'Taylor', 'Wilson', 'Evans', 'King', 'Parker', 'Scott', 'Davies', 'Roberts'
];

type PageKey = 'mail' | 'board' | 'squad' | 'cup' | 'human' | 'manager' | 'manage' | 'transfers' | 'training' | 'tactics' | 'match';

const SQUAD_STORAGE_KEY = 'tmt-squad-statuses';

function loadSquadStatuses(clubId: string): Record<string, SquadStatus> {
  try {
    const raw = localStorage.getItem(SQUAD_STORAGE_KEY);
    if (!raw) return {};
    const all = JSON.parse(raw) as Record<string, Record<string, SquadStatus>>;
    return all[clubId] ?? {};
  } catch {
    return {};
  }
}

function saveSquadStatuses(clubId: string, statuses: Record<string, SquadStatus>) {
  try {
    const raw = localStorage.getItem(SQUAD_STORAGE_KEY);
    const all = raw ? (JSON.parse(raw) as Record<string, Record<string, SquadStatus>>) : {};
    all[clubId] = statuses;
    localStorage.setItem(SQUAD_STORAGE_KEY, JSON.stringify(all));
  } catch {
    // storage unavailable
  }
}

const POSITION_OVERRIDES_KEY = 'tmt-position-overrides';

function loadPositionOverrides(clubId: string): Record<string, string> {
  try {
    const raw = localStorage.getItem(POSITION_OVERRIDES_KEY);
    if (!raw) return {};
    const all = JSON.parse(raw) as Record<string, Record<string, string>>;
    return all[clubId] ?? {};
  } catch {
    return {};
  }
}

function savePositionOverrides(clubId: string, overrides: Record<string, string>) {
  try {
    const raw = localStorage.getItem(POSITION_OVERRIDES_KEY);
    const all = raw ? (JSON.parse(raw) as Record<string, Record<string, string>>) : {};
    all[clubId] = overrides;
    localStorage.setItem(POSITION_OVERRIDES_KEY, JSON.stringify(all));
  } catch {
    // storage unavailable
  }
}

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

function getOverall(player: SquadPlayer) {
  return Math.round((player.pac + player.sho + player.pas + player.dri + player.def + player.phy) / 6);
}

function hashText(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function buildFallbackSquad(club: Club): SquadPlayer[] {
  const seed = hashText(club.id || club.name || 'fallback-club');

  return fallbackSquadRoles.map((role, index) => {
    const firstName = fallbackFirstNames[(seed + index * 7) % fallbackFirstNames.length];
    const lastName = fallbackLastNames[(seed + index * 11) % fallbackLastNames.length];
    const base = 48 + ((seed + index * 13) % 28);

    const age = 18 + ((seed + index * 5) % 17);
    const expBase = Math.min(20, Math.max(1, Math.floor((age - 16) * 0.8) + ((seed + index * 9) % 5)));

    return {
      id: `${club.id || club.name}-fallback-${index + 1}`,
      name: `${firstName} ${lastName}`,
      age,
      role,
      pac: Math.min(99, base + ((seed + index * 2) % 10)),
      sho: Math.min(99, base + ((seed + index * 3) % 10)),
      pas: Math.min(99, base + ((seed + index * 4) % 10)),
      dri: Math.min(99, base + ((seed + index * 5) % 10)),
      def: Math.min(99, base + ((seed + index * 6) % 10)),
      phy: Math.min(99, base + ((seed + index * 7) % 10)),
      morale: 45 + ((seed + index * 3) % 55),
      stamina: 45 + ((seed + index * 4) % 55),
      form: 45 + ((seed + index * 5) % 55),
      potential: 55 + ((seed + index * 6) % 40),
      /* Original Tactical Manager attributes (0-20 scale) */
      played: 0,
      scored: 0,
      speed: 1 + ((seed + index * 8) % 19),
      control: 1 + ((seed + index * 12) % 19),
      tackling: 1 + ((seed + index * 14) % 19),
      passing: 1 + ((seed + index * 16) % 19),
      heading: ((seed + index * 18) % 16),
      shooting: ((seed + index * 20) % 16),
      marking: 1 + ((seed + index * 22) % 19),
      vision: 1 + ((seed + index * 24) % 19),
      caps: ((seed + index * 10) % 50),
      experience: expBase,
      fitness: 5 + ((seed + index * 26) % 16),
      freshness: 10 + ((seed + index * 28) % 11),
      influence: 1 + ((seed + index * 30) % 15),
      attitude: 3 + ((seed + index * 32) % 17),
      reliability: 2 + ((seed + index * 34) % 18)
    };
  });
}

function ensureTmAttrs(players: SquadPlayer[]): SquadPlayer[] {
  return players.map((p, i) => {
    if (p.speed !== undefined && p.speed !== null) return p;
    const seed = hashText(p.id);
    const expBase = Math.min(20, Math.max(1, Math.floor((p.age - 16) * 0.8) + ((seed + i * 9) % 5)));
    return {
      ...p,
      played: p.played ?? 0,
      scored: p.scored ?? 0,
      speed: 1 + ((seed + i * 8) % 19),
      control: 1 + ((seed + i * 12) % 19),
      tackling: 1 + ((seed + i * 14) % 19),
      passing: 1 + ((seed + i * 16) % 19),
      heading: (seed + i * 18) % 16,
      shooting: (seed + i * 20) % 16,
      marking: 1 + ((seed + i * 22) % 19),
      vision: 1 + ((seed + i * 24) % 19),
      caps: p.caps ?? ((seed + i * 10) % 50),
      experience: p.experience ?? expBase,
      fitness: 5 + ((seed + i * 26) % 16),
      freshness: 10 + ((seed + i * 28) % 11),
      influence: 1 + ((seed + i * 30) % 15),
      attitude: 3 + ((seed + i * 32) % 17),
      reliability: 2 + ((seed + i * 34) % 18)
    };
  });
}

function getPlayerProfile(player: SquadPlayer, role: string): PlayerProfile {
  const seed = hashText(player.id);
  const eventData = synthesizeEventData(player, seed);
  const derived = calculateDerivedAttributes(eventData);
  const variedDerived: DerivedAttributes = {} as DerivedAttributes;
  const keys = Object.keys(derived) as (keyof DerivedAttributes)[];
  keys.forEach((k, i) => {
    variedDerived[k] = applyVariance(derived[k], seed + i * 7);
  });
  const { primary, secondary } = detectRoles(variedDerived, role);
  const ovr = calculateOvr(variedDerived, role);
  const formImpact = calculateFormImpact(eventData.last5Ratings);
  const fatigueImpact = calculateFatigueImpact(player.fitness, player.freshness, eventData.minutesPlayed, eventData.appearances);
  const effectiveOvr = Math.max(1, Math.min(99, ovr + formImpact + fatigueImpact));
  return { primaryRole: primary, secondaryRole: secondary, derived: variedDerived, ovr, effectiveOvr, formImpact, fatigueImpact };
}

function AttrBar({ label, value, max = 100 }: { label: string; value: number; max?: number }) {
  const pct = Math.min(100, (value / max) * 100);
  const color = pct >= 80 ? 'bg-[#22c55e]' : pct >= 60 ? 'bg-[#eab308]' : pct >= 40 ? 'bg-[#f97316]' : 'bg-[#ef4444]';
  return (
    <div className="flex items-center gap-1">
      <span className="w-24 shrink-0 text-[10px] font-semibold text-[#98ca7a] uppercase">{label}</span>
      <div className="h-2 flex-1 bg-[#1a3a1e] rounded-sm overflow-hidden">
        <div className={`h-full ${color} rounded-sm`} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-7 text-right text-[10px] font-bold text-white">{value}</span>
    </div>
  );
}

function RoleBadge({ role, variant }: { role: string; variant: 'primary' | 'secondary' }) {
  const bg = variant === 'primary' ? 'bg-[#1d4ed8]' : 'bg-[#6b21a8]';
  return <span className={`${bg} px-2 py-0.5 text-[10px] font-bold text-white rounded`}>{role}</span>;
}

function PositionDropdown({ currentRole, originalRole, onChange }: {
  currentRole: string;
  originalRole: string;
  onChange: (role: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const isOverridden = currentRole !== originalRole;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`border border-[#b78bda] px-1 py-0.5 text-xs font-bold ${
          isOverridden ? 'bg-[#1d4ed8] text-white' : 'bg-[#d5b5ec] text-[#2e1f4a]'
        }`}
      >
        {currentRole.replace(/_/g, ' ')} ▾
      </button>
      {open ? (
        <div className="absolute left-0 top-full z-50 max-h-48 w-56 overflow-auto border-2 border-[#b78bda] bg-[#1a1e2b] shadow-lg">
          {ALL_POSITIONS.map((pos) => {
            const isOriginal = pos === originalRole;
            const isSelected = pos === currentRole;
            return (
              <button
                key={pos}
                type="button"
                onClick={() => { onChange(pos); setOpen(false); }}
                className={`block w-full whitespace-nowrap px-3 py-1.5 text-left text-xs font-bold hover:bg-[#374151] ${
                  isSelected
                    ? 'bg-[#1d4ed8] text-white'
                    : isOriginal
                      ? 'bg-[#450a0a] text-[#ff4444]'
                      : 'text-[#d1d5db]'
                }`}
              >
                {isOriginal ? '★ ' : ''}{pos.replace(/_/g, ' ')}{isSelected && !isOriginal ? ' ✓' : ''}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function SquadPanel({
  activeClub,
  players,
  loading,
  error,
  search,
  roleFilter,
  sortBy,
  statuses,
  positionOverrides,
  onSearchChange,
  onRoleFilterChange,
  onSortChange,
  onStatusChange,
  onPositionChange
}: {
  activeClub: Club;
  players: SquadPlayer[];
  loading: boolean;
  error: string | null;
  search: string;
  roleFilter: string;
  sortBy: SquadSortKey;
  statuses: Record<string, SquadStatus>;
  onSearchChange: (value: string) => void;
  onRoleFilterChange: (value: string) => void;
  onSortChange: (value: SquadSortKey) => void;
  positionOverrides: Record<string, string>;
  onStatusChange: (playerId: string, status: SquadStatus) => void;
  onPositionChange: (playerId: string, role: string) => void;
}) {
  const roleOptions = ['ALL', ...Array.from(new Set(players.map((player: SquadPlayer) => positionOverrides[player.id] ?? player.role))).sort((a, b) => a.localeCompare(b))];

  const visiblePlayers = [...players]
    .filter((player: SquadPlayer) => {
      const matchesSearch = player.name.toLowerCase().includes(search.trim().toLowerCase());
      const matchesRole = roleFilter === 'ALL' || (positionOverrides[player.id] ?? player.role) === roleFilter;
      return matchesSearch && matchesRole;
    })
    .sort((left: SquadPlayer, right: SquadPlayer) => {
      if (sortBy === 'name') return left.name.localeCompare(right.name);
      if (sortBy === 'age') return left.age - right.age;
      if (sortBy === 'morale') return right.morale - left.morale;
      if (sortBy === 'potential') return right.potential - left.potential;
      return getOverall(right) - getOverall(left);
    });

  const starters = players.filter((player: SquadPlayer) => (statuses[player.id] ?? 'EXCLUDED') === 'STARTER').length;
  const bench = players.filter((player: SquadPlayer) => (statuses[player.id] ?? 'EXCLUDED') === 'BENCH').length;
  const excluded = players.filter((player: SquadPlayer) => (statuses[player.id] ?? 'EXCLUDED') === 'EXCLUDED').length;
  const startersFull = starters >= MAX_STARTERS;
  const benchFull = bench >= MAX_BENCH;

  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const selectedPlayer = selectedPlayerId ? players.find((p) => p.id === selectedPlayerId) ?? null : null;

  return (
    <section className="border-4 border-[#6f4ca1] bg-[#16a51c] p-3">
      <h2 className="mb-3 border border-[#ceb8e1] bg-[#d5b5ec] p-2 text-center text-sm font-bold uppercase text-[#2e1f4a]">
        <span className="inline-flex items-center gap-2"><ClubCrest clubName={activeClub.name} size={24} />Squad - {activeClub.name}</span>
      </h2>

      <div className="mb-3 grid gap-2 md:grid-cols-3">
        <div className={`border p-2 text-sm font-semibold ${startersFull ? 'border-[#efe56b] bg-[#3a6e1d] text-[#efe56b]' : 'border-[#98ca7a] bg-[#1f641d] text-[#d5f8b6]'}`}>Basis: <strong>{starters}/{MAX_STARTERS}</strong></div>
        <div className={`border p-2 text-sm font-semibold ${benchFull ? 'border-[#efe56b] bg-[#3a6e1d] text-[#efe56b]' : 'border-[#98ca7a] bg-[#1f641d] text-[#d5f8b6]'}`}>Reserve: <strong>{bench}/{MAX_BENCH}</strong></div>
        <div className="border border-[#98ca7a] bg-[#1f641d] p-2 text-sm font-semibold text-[#d5f8b6]">Uitgesloten: <strong>{excluded}</strong></div>
      </div>

      <div className="mb-3 grid gap-2 md:grid-cols-3">
        <input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Zoek speler..."
          className="border border-[#b78bda] bg-[#d5b5ec] px-2 py-1 text-sm text-[#2e1f4a]"
        />
        <select
          value={roleFilter}
          onChange={(event) => onRoleFilterChange(event.target.value)}
          className="border border-[#b78bda] bg-[#d5b5ec] px-2 py-1 text-sm text-[#2e1f4a]"
        >
          {roleOptions.map((role: string) => (
            <option key={role} value={role}>{role}</option>
          ))}
        </select>
        <select
          value={sortBy}
          onChange={(event) => onSortChange(event.target.value as SquadSortKey)}
          className="border border-[#b78bda] bg-[#d5b5ec] px-2 py-1 text-sm text-[#2e1f4a]"
        >
          <option value="overall">Sort: Overall</option>
          <option value="potential">Sort: Potential</option>
          <option value="morale">Sort: Morale</option>
          <option value="age">Sort: Age</option>
          <option value="name">Sort: Name</option>
        </select>
      </div>

      {loading ? <p className="text-sm">Spelers laden...</p> : null}
      {error ? <p className="mb-2 text-sm text-[#ffcf9f]">{error}</p> : null}

      {!loading ? (
        <div className="max-h-[55vh] overflow-auto border border-[#98ca7a]">
          <table className="w-full border-collapse text-xs">
            <thead className="bg-[#1f641d] text-[#efe56b] font-semibold">
              <tr>
                <th className="px-2 py-1 text-left">Name</th>
                <th className="px-2 py-1 text-left">Role</th>
                <th className="px-2 py-1">Age</th>
                <th className="px-2 py-1">OVR</th>
                <th className="px-2 py-1">Morale</th>
                <th className="px-2 py-1">Potential</th>
                <th className="px-2 py-1 text-left">Management</th>
              </tr>
            </thead>
            <tbody>
              {visiblePlayers.map((player: SquadPlayer) => {
                const status = statuses[player.id] ?? 'EXCLUDED';
                return (
                  <tr key={player.id} className={`border-t border-[#2a8a2b] cursor-pointer ${selectedPlayerId === player.id ? 'bg-[#0a4a0e] ring-1 ring-[#efe56b]' : 'odd:bg-[#115d16] even:bg-[#0f5714]'}`} onClick={() => setSelectedPlayerId(selectedPlayerId === player.id ? null : player.id)}>
                    <td className="px-2 py-1">{player.name}</td>
                    <td className="px-2 py-1">
                      <PositionDropdown
                        currentRole={positionOverrides[player.id] ?? player.role}
                        originalRole={player.role}
                        onChange={(role) => onPositionChange(player.id, role)}
                      />
                    </td>
                    <td className="px-2 py-1 text-center">{player.age}</td>
                    <td className="px-2 py-1 text-center">{getOverall(player)}</td>
                    <td className="px-2 py-1 text-center">{player.morale}</td>
                    <td className="px-2 py-1 text-center">{player.potential}</td>
                    <td className="px-2 py-1">
                      <div className="flex flex-wrap gap-1">
                        <button
                          type="button"
                          onClick={() => onStatusChange(player.id, 'STARTER')}
                          disabled={status !== 'STARTER' && startersFull}
                          className={`border px-2 py-0.5 text-xs font-semibold ${status === 'STARTER' ? 'border-[#efe56b] bg-[#efe56b] text-[#2e1f4a]' : startersFull ? 'border-[#666] bg-[#888] text-[#444] cursor-not-allowed opacity-50' : 'border-[#b78bda] bg-[#caa6e6] text-[#2e1f4a]'}`}
                          title={status !== 'STARTER' && startersFull ? `Basis is vol (${MAX_STARTERS}/${MAX_STARTERS})` : ''}
                        >
                          Basis
                        </button>
                        <button
                          type="button"
                          onClick={() => onStatusChange(player.id, 'BENCH')}
                          disabled={status !== 'BENCH' && benchFull}
                          className={`border px-2 py-0.5 text-xs font-semibold ${status === 'BENCH' ? 'border-[#efe56b] bg-[#efe56b] text-[#2e1f4a]' : benchFull ? 'border-[#666] bg-[#888] text-[#444] cursor-not-allowed opacity-50' : 'border-[#b78bda] bg-[#caa6e6] text-[#2e1f4a]'}`}
                          title={status !== 'BENCH' && benchFull ? `Reserve is vol (${MAX_BENCH}/${MAX_BENCH})` : ''}
                        >
                          Reserve
                        </button>
                        <button
                          type="button"
                          onClick={() => onStatusChange(player.id, 'EXCLUDED')}
                          className={`border px-2 py-0.5 text-xs font-semibold ${status === 'EXCLUDED' ? 'border-[#ff6b6b] bg-[#ff6b6b] text-[#2e1f4a]' : 'border-[#b78bda] bg-[#caa6e6] text-[#2e1f4a]'}`}
                        >
                          Uitgesloten
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}

      {selectedPlayer ? (() => {
        const effectiveRole = positionOverrides[selectedPlayer.id] ?? selectedPlayer.role;
        const profile = getPlayerProfile(selectedPlayer, effectiveRole);
        const d = profile.derived;
        return (
        <div className="mt-3 border-2 border-[#efe56b] bg-[#0a3d0e] p-3 text-xs">
          {/* ── Header: name, role badges, close button ── */}
          <div className="mb-2 flex items-center justify-between border-b border-[#2a8a2b] pb-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-sm font-bold text-[#efe56b]">
                {selectedPlayer.name.toUpperCase()}
              </span>
              <span className="font-mono text-xs text-[#98ca7a]">— {effectiveRole.replace(/_/g, ' ')}</span>
              <RoleBadge role={profile.primaryRole} variant="primary" />
              {profile.secondaryRole ? <RoleBadge role={profile.secondaryRole} variant="secondary" /> : null}
            </div>
            <button type="button" onClick={() => setSelectedPlayerId(null)} className="text-[#ff6b6b] font-bold hover:text-white">✕</button>
          </div>

          {/* ── OVR / Effective OVR / POT / Form/Fatigue ── */}
          <div className="mb-3 flex flex-wrap items-center justify-center gap-4 border-b border-[#2a8a2b] pb-2">
            <div className="text-center">
              <div className="text-[10px] text-[#98ca7a]">OVR</div>
              <div className="text-2xl font-black text-white">{profile.ovr}</div>
            </div>
            <div className="text-center">
              <div className="text-[10px] text-[#98ca7a]">EFF</div>
              <div className={`text-2xl font-black ${profile.effectiveOvr >= profile.ovr ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}>{profile.effectiveOvr}</div>
            </div>
            <div className="text-center">
              <div className="text-[10px] text-[#98ca7a]">POT</div>
              <div className="text-2xl font-black text-[#60a5fa]">{selectedPlayer.potential}</div>
            </div>
            <div className="text-center">
              <div className="text-[10px] text-[#98ca7a]">FORM</div>
              <div className={`text-sm font-bold ${profile.formImpact > 0 ? 'text-[#22c55e]' : profile.formImpact < 0 ? 'text-[#ef4444]' : 'text-white'}`}>{profile.formImpact > 0 ? '+' : ''}{profile.formImpact}</div>
            </div>
            <div className="text-center">
              <div className="text-[10px] text-[#98ca7a]">FATIGUE</div>
              <div className={`text-sm font-bold ${profile.fatigueImpact < -5 ? 'text-[#ef4444]' : profile.fatigueImpact < 0 ? 'text-[#f97316]' : 'text-[#22c55e]'}`}>{profile.fatigueImpact}</div>
            </div>
          </div>

          {/* ── All Attributes (0-100 derived bars + TM 0-20 inline) ── */}
          <div className="mb-3 grid grid-cols-2 gap-x-4 gap-y-1">
            <AttrBar label="Control" value={d.control} />
            <AttrBar label="Composure" value={d.composure} />
            <AttrBar label="Vision" value={d.vision} />
            <AttrBar label="Creativity" value={d.creativity} />
            <AttrBar label="Tackling" value={d.tackling} />
            <AttrBar label="Positioning" value={d.positioning} />
            <AttrBar label="Shooting" value={d.shooting} />
            <AttrBar label="Aerial" value={d.aerialAbility} />
            <AttrBar label="Influence" value={d.influence} />
            <AttrBar label="Crossing" value={d.crossing} />
            <AttrBar label="Work Rate" value={d.workRate} />
            <AttrBar label="Long Pass" value={d.longPassing} />
            <AttrBar label="Attitude" value={d.attitude} />
            <AttrBar label="Concentration" value={d.concentration} />
            <AttrBar label="Reliability" value={d.reliability} />
            <AttrBar label="Leadership" value={d.leadership} />
          </div>

          {/* ── TM Stats + FIFA six-pack combined ── */}
          <div className="grid grid-cols-4 gap-x-3 gap-y-0 font-mono border-t border-[#2a8a2b] pt-2">
            {[
              ['SPD', selectedPlayer.speed], ['CTL', selectedPlayer.control], ['TAC', selectedPlayer.tackling], ['PAS', selectedPlayer.passing],
              ['HEA', selectedPlayer.heading], ['SHT', selectedPlayer.shooting], ['MRK', selectedPlayer.marking], ['VIS', selectedPlayer.vision],
              ['EXP', selectedPlayer.experience], ['CAP', selectedPlayer.caps], ['FIT', selectedPlayer.fitness], ['FRS', selectedPlayer.freshness],
              ['INF', selectedPlayer.influence], ['ATT', selectedPlayer.attitude], ['REL', selectedPlayer.reliability], ['STA', selectedPlayer.stamina],
              ['PLD', selectedPlayer.played], ['GLS', selectedPlayer.scored], ['AGE', selectedPlayer.age], ['MOR', selectedPlayer.morale],
            ].map(([label, val]) => (
              <div key={label as string} className="flex justify-between border-b border-[#1a5a1e] py-0.5">
                <span className="text-[#98ca7a]">{label}</span>
                <span className="text-white font-bold">{val}</span>
              </div>
            ))}
          </div>

          {/* ── FIFA-style six-pack ── */}
          <div className="grid grid-cols-3 gap-2 border-t border-[#2a8a2b] pt-2 mt-2 text-center font-mono">
            <div><span className="text-[#efe56b]">PAC</span> <span className="text-white">{selectedPlayer.pac}</span></div>
            <div><span className="text-[#efe56b]">SHO</span> <span className="text-white">{selectedPlayer.sho}</span></div>
            <div><span className="text-[#efe56b]">PAS</span> <span className="text-white">{selectedPlayer.pas}</span></div>
            <div><span className="text-[#efe56b]">DRI</span> <span className="text-white">{selectedPlayer.dri}</span></div>
            <div><span className="text-[#efe56b]">DEF</span> <span className="text-white">{selectedPlayer.def}</span></div>
            <div><span className="text-[#efe56b]">PHY</span> <span className="text-white">{selectedPlayer.phy}</span></div>
          </div>
        </div>
        );
      })() : null}
    </section>
  );
}

function PagePanel({
  page,
  activeClub,
  squadPlayers,
  squadLoading,
  squadError,
  squadSearch,
  squadRoleFilter,
  squadSortBy,
  squadStatuses,
  positionOverrides,
  onSquadSearchChange,
  onSquadRoleFilterChange,
  onSquadSortChange,
  onSquadStatusChange,
  onPositionChange
}: {
  page: PageKey;
  activeClub: Club;
  squadPlayers: SquadPlayer[];
  squadLoading: boolean;
  squadError: string | null;
  squadSearch: string;
  squadRoleFilter: string;
  squadSortBy: SquadSortKey;
  squadStatuses: Record<string, SquadStatus>;
  positionOverrides: Record<string, string>;
  onSquadSearchChange: (value: string) => void;
  onSquadRoleFilterChange: (value: string) => void;
  onSquadSortChange: (value: SquadSortKey) => void;
  onSquadStatusChange: (playerId: string, status: SquadStatus) => void;
  onPositionChange: (playerId: string, role: string) => void;
}) {
  if (page === 'tactics') {
    const starters = squadPlayers
      .filter((p) => squadStatuses[p.id] === 'STARTER')
      .map((p) => ({ ...p, role: positionOverrides[p.id] ?? p.role }));
    return <TacticsBoard starters={starters} clubId={activeClub?.id} />;
  }
  if (page === 'match') return <MatchScreen />;
  if (page === 'squad') {
    return (
      <SquadPanel
        activeClub={activeClub}
        players={squadPlayers}
        loading={squadLoading}
        error={squadError}
        search={squadSearch}
        roleFilter={squadRoleFilter}
        sortBy={squadSortBy}
        statuses={squadStatuses}
        positionOverrides={positionOverrides}
        onSearchChange={onSquadSearchChange}
        onRoleFilterChange={onSquadRoleFilterChange}
        onSortChange={onSquadSortChange}
        onStatusChange={onSquadStatusChange}
        onPositionChange={onPositionChange}
      />
    );
  }

  return (
    <section className="border-4 border-[#6f4ca1] bg-[#16a51c] p-3">
      <h2 className="mb-3 border border-[#ceb8e1] bg-[#d5b5ec] p-2 text-center text-sm font-bold uppercase text-[#2e1f4a]">
        {pageDescriptions[page].title}
      </h2>
      <div className="retro-pitch mb-3 h-52 border-2 border-[#8ee486]" />
      <p className="border border-[#98ca7a] bg-[#256d22] px-2 py-1 text-sm text-[#d5f8b6]">{pageDescriptions[page].text}</p>
      <p className="mt-3 border border-[#98ca7a] bg-[#1f641d] px-2 py-1 text-sm text-[#d5f8b6]">
        Division: <strong>{activeClub.leagueName ?? activeClub.country ?? '1st Division'}</strong>
      </p>
      <p className="mt-3 border border-[#98ca7a] bg-[#1f641d] px-2 py-1 text-sm text-[#d5f8b6]">
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
  return clubs.find((club: Club) => club.name === 'Nottingham Forest FC')?.id ?? clubs[0]?.id ?? null;
}

function getDivisionSortRank(name: string) {
  const order: Record<string, number> = {
    'Premier League': 0,
    Championship: 1,
    'League One': 2,
    'League Two': 3
  };

  return order[name] ?? 99;
}

export default function App() {
  const [clubs, setClubs] = useState<Club[]>([]);
  const [activeClubId, setActiveClubId] = useState<string | null>(null);
  const [events, setEvents] = useState<MatchEvent[]>([]);
  const [summary, setSummary] = useState<ManagerSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activePage, setActivePage] = useState<PageKey>('mail');
  const [showStandings, setShowStandings] = useState(false);
  const [standingsLoading, setStandingsLoading] = useState(false);
  const [standingsError, setStandingsError] = useState<string | null>(null);
  const [standingsRows, setStandingsRows] = useState<StandingRow[]>([]);
  const [standingsDivisionName, setStandingsDivisionName] = useState<string>('');
  const [squadPlayers, setSquadPlayers] = useState<SquadPlayer[]>([]);
  const [squadLoading, setSquadLoading] = useState(false);
  const [squadError, setSquadError] = useState<string | null>(null);
  const [squadSearch, setSquadSearch] = useState('');
  const [squadRoleFilter, setSquadRoleFilter] = useState('ALL');
  const [squadSortBy, setSquadSortBy] = useState<SquadSortKey>('overall');
  const [squadStatuses, setSquadStatuses] = useState<Record<string, SquadStatus>>({});
  const [positionOverrides, setPositionOverrides] = useState<Record<string, string>>({});

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

  useEffect(() => {
    if (!activeClubId) {
      setSquadPlayers([]);
      setSquadError(null);
      setSquadLoading(false);
      return;
    }

    const selectedClub = clubs.find((club: Club) => club.id === activeClubId) ?? {
      id: activeClubId,
      name: 'Selected Club',
      country: 'England',
      budget: 0,
      reputation: 0,
      leagueId: null,
      leagueName: null
    };

    setSquadLoading(true);
    setSquadError(null);

    axios
      .get<{ club: { id: string; name: string }; players: SquadPlayer[] }>(`${API_BASE}/clubs/${activeClubId}/players`)
      .then((res) => {
        const loadedPlayers = res.data.players.length > 0 ? ensureTmAttrs(res.data.players) : buildFallbackSquad(selectedClub);
        setSquadPlayers(loadedPlayers);
        const saved = loadSquadStatuses(activeClubId);
        const next: Record<string, SquadStatus> = {};
        loadedPlayers.forEach((player: SquadPlayer) => {
          next[player.id] = saved[player.id] ?? 'EXCLUDED';
        });
        setSquadStatuses(next);
        setPositionOverrides(loadPositionOverrides(activeClubId));
      })
      .catch(() => {
        const fallbackPlayers = buildFallbackSquad(selectedClub);
        setSquadPlayers(fallbackPlayers);
        const saved = loadSquadStatuses(activeClubId);
        const next: Record<string, SquadStatus> = {};
        fallbackPlayers.forEach((player: SquadPlayer) => {
          next[player.id] = saved[player.id] ?? 'EXCLUDED';
        });
        setSquadStatuses(next);
        setPositionOverrides(loadPositionOverrides(activeClubId));
        setSquadError('Live selectie kon niet geladen worden, fallback selectie is getoond.');
      })
      .finally(() => {
        setSquadLoading(false);
      });
  }, [activeClubId, clubs]);

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

  const englishDivisions = useMemo<DivisionGroup[]>(() => {
    const groups = new Map<string, DivisionGroup>();

    clubs
      .filter((club: Club) => (club.country ?? 'England') === 'England')
      .forEach((club: Club) => {
        const id = club.leagueId ?? club.leagueName ?? 'unknown-division';
        const existing = groups.get(id);

        if (existing) {
          existing.clubs.push(club);
          return;
        }

        groups.set(id, {
          id,
          name: club.leagueName ?? '1st Division',
          country: club.country ?? 'England',
          clubs: [club]
        });
      });

    return Array.from(groups.values())
      .map((group: DivisionGroup) => ({
        ...group,
        clubs: [...group.clubs].sort((left, right) => left.name.localeCompare(right.name))
      }))
      .sort((left, right) => {
        const rankDiff = getDivisionSortRank(left.name) - getDivisionSortRank(right.name);
        return rankDiff !== 0 ? rankDiff : left.name.localeCompare(right.name);
      });
  }, [clubs]);

  const activeDivisionIndex = Math.max(
    0,
    englishDivisions.findIndex((division) => division.id === (activeClub.leagueId ?? activeClub.leagueName ?? 'unknown-division'))
  );

  const activeDivision = englishDivisions[activeDivisionIndex] ?? null;

  const competitionClubs = useMemo(() => {
    if (activeDivision) {
      return activeDivision.clubs;
    }

    if (clubs.length === 0) return [];
    if (activeClub.country) {
      const sameCountry = clubs.filter((club: Club) => club.country === activeClub.country);
      if (sameCountry.length > 0) return sameCountry;
    }

    return clubs;
  }, [activeDivision, clubs, activeClub.country]);

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

  const previousDivision = () => {
    if (englishDivisions.length === 0) return;
    const nextIndex = (activeDivisionIndex - 1 + englishDivisions.length) % englishDivisions.length;
    const targetDivision = englishDivisions[nextIndex];
    const targetClub = targetDivision.clubs[activeCompetitionIndex % targetDivision.clubs.length] ?? targetDivision.clubs[0];
    setActiveClubId(targetClub.id);
  };

  const nextDivision = () => {
    if (englishDivisions.length === 0) return;
    const nextIndex = (activeDivisionIndex + 1) % englishDivisions.length;
    const targetDivision = englishDivisions[nextIndex];
    const targetClub = targetDivision.clubs[activeCompetitionIndex % targetDivision.clubs.length] ?? targetDivision.clubs[0];
    setActiveClubId(targetClub.id);
  };

  const buildFallbackStandings = (division: DivisionGroup | null): StandingRow[] => {
    if (!division) return [];
    return division.clubs.map((club: Club, index: number) => ({
      position: index + 1,
      clubId: club.id,
      clubName: club.name,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDiff: 0,
      points: 0,
      updatedAt: null
    }));
  };

  const openDivisionStandings = async () => {
    if (!activeDivision) return;

    setShowStandings(true);
    setStandingsDivisionName(activeDivision.name);
    setStandingsError(null);
    setStandingsLoading(true);

    if (!activeClub.leagueId) {
      setStandingsRows(buildFallbackStandings(activeDivision));
      setStandingsLoading(false);
      return;
    }

    try {
      const res = await axios.get<{ league: { id: string; name: string; season: number }; standings: StandingRow[] }>(
        `${API_BASE}/leagues/${activeClub.leagueId}/standings`
      );
      setStandingsDivisionName(res.data.league.name);
      setStandingsRows(res.data.standings);
    } catch {
      setStandingsRows(buildFallbackStandings(activeDivision));
      setStandingsError('Live standings konden niet geladen worden, fallback is getoond.');
    } finally {
      setStandingsLoading(false);
    }
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

  const setPlayerPosition = (playerId: string, role: string) => {
    setPositionOverrides((prev) => {
      const next = { ...prev, [playerId]: role };
      if (activeClubId) savePositionOverrides(activeClubId, next);
      return next;
    });
  };

  const setPlayerStatus = (playerId: string, status: SquadStatus) => {
    const target: SquadStatus = status;
    setSquadStatuses((prev) => {
      if (target === 'STARTER') {
        const currentStarters = Object.values(prev).filter((s) => s === 'STARTER').length;
        if (prev[playerId] !== 'STARTER' && currentStarters >= MAX_STARTERS) return prev;
      }
      if (target === 'BENCH') {
        const currentBench = Object.values(prev).filter((s) => s === 'BENCH').length;
        if (prev[playerId] !== 'BENCH' && currentBench >= MAX_BENCH) return prev;
      }
      const next = { ...prev, [playerId]: target };
      if (activeClubId) saveSquadStatuses(activeClubId, next);
      return next;
    });
  };

  return (
    <main className="min-h-screen bg-[#1a1e2b] p-4 text-[#d4f6a7] md:p-8">
      <section className="mx-auto max-w-6xl border-4 border-[#6f4ca1] bg-[#2a8a2b] shadow-[0_0_0_4px_#120d1f]">
        <header className="flex items-center justify-between border-b-4 border-[#6f4ca1] bg-black px-4 py-3 text-[#ebe25f]">
          <h1 className="flex items-center gap-3 text-2xl font-black uppercase tracking-widest"><ClubCrest clubName={activeClub.name} size={36} />{activeClub.name}</h1>
          <button
            className="border-2 border-[#ebe25f] bg-[#2a8a2b] px-3 py-1 text-sm font-bold uppercase"
            onClick={simulate}
            type="button"
          >
            Play Next Match
          </button>
        </header>

        <div className="grid gap-4 p-4 md:grid-cols-[220px_1fr_300px]">
          <aside className="border-4 border-[#6f4ca1] bg-[#2e1f4a] p-3 text-sm">
            <div className="mb-3 border-2 border-white bg-[#fff7de] p-2 text-center text-[#d0121b]">
              <div className="px-2">
                <ClubCrest clubName={activeClub.name} size={56} />
                <p className="text-lg font-black">{activeClub.name}</p>
                <p className="text-xs uppercase tracking-[0.2em] text-[#2e1f4a]">{activeClub.country || '1st Division'}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={openDivisionStandings}
              className="mb-2 w-full border border-[#0e1d0f] bg-[#2a8a2b] px-2 py-1 text-left font-bold uppercase text-[#0e1d0f] hover:bg-[#46b047]"
              title="Open divisie standings"
            >
              {(activeClub.leagueName || activeClub.country || '1st Division').toUpperCase()}
            </button>
            <div className="mb-2 flex items-center justify-between gap-2 rounded border border-[#6f4ca1] bg-[#1f641d] px-2 py-2 text-xs font-bold text-[#efe56b]">
              <button
                type="button"
                onClick={previousDivision}
                className="rounded border border-[#efe56b] bg-[#f0d9cf] px-2 py-1 text-xs font-bold text-[#2e1f4a]"
                disabled={englishDivisions.length <= 1}
              >
                ‹
              </button>
              <span className="text-center uppercase">
                Division {activeDivisionIndex + 1} / {englishDivisions.length}
              </span>
              <button
                type="button"
                onClick={nextDivision}
                className="rounded border border-[#efe56b] bg-[#f0d9cf] px-2 py-1 text-xs font-bold text-[#2e1f4a]"
                disabled={englishDivisions.length <= 1}
              >
                ›
              </button>
            </div>
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
            <p className="mb-3 border border-[#98ca7a] bg-[#1f641d] px-2 py-1 text-xs uppercase text-[#d5f8b6]">
              {activeClub.leagueName ?? '1st Division'} • Club {activeCompetitionIndex + 1} / {competitionClubs.length || 1}
            </p>
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
            <div className="mb-3 grid grid-cols-4 gap-2 text-center text-xs uppercase text-[#2e1f4a]">
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

            <PagePanel
              activeClub={activeClub}
              page={activePage}
              squadPlayers={squadPlayers}
              squadLoading={squadLoading}
              squadError={squadError}
              squadSearch={squadSearch}
              squadRoleFilter={squadRoleFilter}
              squadSortBy={squadSortBy}
              squadStatuses={squadStatuses}
              positionOverrides={positionOverrides}
              onSquadSearchChange={setSquadSearch}
              onSquadRoleFilterChange={setSquadRoleFilter}
              onSquadSortChange={setSquadSortBy}
              onSquadStatusChange={setPlayerStatus}
              onPositionChange={setPlayerPosition}
            />

            {error ? (
              <p className="mt-3 border border-[#98ca7a] bg-[#256d22] px-2 py-1 text-sm text-[#d5f8b6]">{error}</p>
            ) : null}
          </section>

          <aside className="border-4 border-[#6f4ca1] bg-[#0d5e13] p-3 text-sm text-[#d5f8b6]">
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

        {showStandings ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
            <section className="w-full max-w-4xl border-4 border-[#6f4ca1] bg-[#0d5e13] p-3 text-sm text-[#d5f8b6]">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-black uppercase text-[#efe56b]">{standingsDivisionName} Standings</h2>
                <button
                  type="button"
                  onClick={() => setShowStandings(false)}
                  className="border border-[#efe56b] bg-[#2a8a2b] px-2 py-1 font-bold uppercase text-[#efe56b]"
                >
                  Close
                </button>
              </div>

              {standingsError ? <p className="mb-2 text-[#ffcf9f]">{standingsError}</p> : null}

              {standingsLoading ? (
                <p>Loading standings...</p>
              ) : (
                <div className="max-h-[60vh] overflow-auto border border-[#98ca7a]">
                  <table className="w-full border-collapse text-left text-xs">
                    <thead className="bg-[#1f641d] text-[#efe56b]">
                      <tr>
                        <th className="px-2 py-1">Pos</th>
                        <th className="px-2 py-1">Team</th>
                        <th className="px-2 py-1">P</th>
                        <th className="px-2 py-1">W</th>
                        <th className="px-2 py-1">D</th>
                        <th className="px-2 py-1">L</th>
                        <th className="px-2 py-1">GF</th>
                        <th className="px-2 py-1">GA</th>
                        <th className="px-2 py-1">GD</th>
                        <th className="px-2 py-1">Pts</th>
                      </tr>
                    </thead>
                    <tbody>
                      {standingsRows.map((row: StandingRow) => (
                        <tr key={row.clubId} className="border-t border-[#2a8a2b] odd:bg-[#115d16] even:bg-[#0f5714]">
                          <td className="px-2 py-1">{row.position}</td>
                          <td className="px-2 py-1"><span className="inline-flex items-center gap-1"><ClubCrest clubName={row.clubName} size={16} />{row.clubName}</span></td>
                          <td className="px-2 py-1">{row.played}</td>
                          <td className="px-2 py-1">{row.won}</td>
                          <td className="px-2 py-1">{row.drawn}</td>
                          <td className="px-2 py-1">{row.lost}</td>
                          <td className="px-2 py-1">{row.goalsFor}</td>
                          <td className="px-2 py-1">{row.goalsAgainst}</td>
                          <td className="px-2 py-1">{row.goalDiff}</td>
                          <td className="px-2 py-1 font-bold text-[#efe56b]">{row.points}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        ) : null}
      </section>
    </main>
  );
}
