import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import type { ManagerSummary } from '@tmt/shared';
import MatchScreen from './components/MatchScreen';
import TacticsPage from './components/TacticsPage';
import BoardRoom from './components/BoardRoom';
import Mailbox from './components/Mailbox';
import CupCenter from './components/CupCenter';
import PlayerFixtures from './components/PlayerFixtures';
import TransferMarket from './components/TransferMarket';
import TrainingGround from './components/TrainingGround';
import ClubManagement from './components/ClubManagement';
import ClubCrest from './components/ClubCrest';
import ManagerPage from './components/ManagerPage';
import GameDashboard from './components/GameDashboard';
import ReadabilitySettings from './components/ReadabilitySettings';
import { loadActiveTactic, saveActiveTactic, type FullTactic } from './engine/tacticsSystem';
import { loadGameState, saveGameState, clearGameState as clearEngineGameState, type MatchEvent } from './engine/footballEngine';
import { realSquads } from './realSquads';
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
type SquadBulkUpdate = { playerId: string; status: SquadStatus };

const MAX_STARTERS = 11;
const MAX_BENCH = 12;

const SLOT_ROLE_PREFERENCES: Record<string, string[]> = {
  gk: ['GOALKEEPER'],
  lb: ['LEFT_BACK', 'LEFT_WING_BACK'],
  rb: ['RIGHT_BACK', 'RIGHT_WING_BACK'],
  lwb: ['LEFT_WING_BACK', 'LEFT_BACK'],
  rwb: ['RIGHT_WING_BACK', 'RIGHT_BACK'],
  cb1: ['CENTER_BACK', 'SWEEPER'],
  cb2: ['CENTER_BACK', 'SWEEPER'],
  cb3: ['CENTER_BACK', 'SWEEPER'],
  dm: ['DEFENSIVE_MIDFIELDER', 'ANCHOR'],
  dm1: ['DEFENSIVE_MIDFIELDER', 'ANCHOR'],
  dm2: ['DEFENSIVE_MIDFIELDER', 'CENTRAL_MIDFIELDER'],
  cm1: ['CENTRAL_MIDFIELDER', 'BOX_TO_BOX_MIDFIELDER', 'ANCHOR'],
  cm2: ['CENTRAL_MIDFIELDER', 'PLAYMAKER', 'BOX_TO_BOX_MIDFIELDER'],
  cm3: ['ATTACKING_MIDFIELDER', 'CENTRAL_MIDFIELDER', 'PLAYMAKER'],
  am: ['ATTACKING_MIDFIELDER', 'PLAYMAKER'],
  lm: ['LEFT_WINGER', 'LEFT_MIDFIELDER', 'INVERTED_WINGER'],
  rm: ['RIGHT_WINGER', 'RIGHT_MIDFIELDER', 'INVERTED_WINGER'],
  lw: ['LEFT_WINGER', 'INVERTED_WINGER', 'LEFT_MIDFIELDER'],
  rw: ['RIGHT_WINGER', 'INVERTED_WINGER', 'RIGHT_MIDFIELDER'],
  st: ['STRIKER', 'TARGET_MAN', 'FALSE_NINE', 'SECOND_STRIKER'],
  st1: ['STRIKER', 'TARGET_MAN', 'FALSE_NINE'],
  st2: ['STRIKER', 'SECOND_STRIKER', 'TARGET_MAN'],
};

function normalizeRoleKey(role: string): string {
  return role.trim().toUpperCase().replace(/\s+/g, '_');
}

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

type PageKey = 'mail' | 'board' | 'squad' | 'cup' | 'human' | 'manager' | 'manage' | 'transfers' | 'training' | 'tactics' | 'match' | 'game' | 'readability';

const SQUAD_STORAGE_KEY = 'tmt-squad-statuses';
const UI_FONT_SIZE_KEY = 'tmt-ui-font-size-pt';

function loadUiFontSizePt(): number {
  try {
    const raw = localStorage.getItem(UI_FONT_SIZE_KEY);
    const parsed = raw ? Number(raw) : 12;
    if (Number.isFinite(parsed)) {
      return Math.min(20, Math.max(10, parsed));
    }
  } catch {
    // storage unavailable
  }
  return 12;
}

function saveUiFontSizePt(value: number) {
  try {
    localStorage.setItem(UI_FONT_SIZE_KEY, String(value));
  } catch {
    // storage unavailable
  }
}

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
  { key: 'game', label: 'Game' },
  { key: 'human', label: 'Player Fixtures' },
  { key: 'manager', label: 'Manager' },
  { key: 'manage', label: 'Manage' },
  { key: 'transfers', label: 'Transfers' },
  { key: 'training', label: 'Training' },
  { key: 'tactics', label: 'Tactics' },
  { key: 'readability', label: 'Readability' }
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
  human: { title: 'Player Fixtures & Records', text: 'Alle speler prestaties, doelpunten, assists en records van het seizoen.' },
  manager: { title: 'Manager', text: 'Beheer je carrière, bekijk alle managers en kies een club om te managen.' },
  manage: { title: 'Club Management', text: 'Staf, faciliteiten en langetermijnplanning voor de club.' },
  transfers: { title: 'Transfer Market', text: 'Scoutrapporten, biedingen en contractonderhandelingen.' },
  training: { title: 'Training Ground', text: 'Trainingsschema, focusgebieden en spelersontwikkeling.' },
  tactics: { title: 'Tactical Desk', text: 'Plaats je spelers op het veld en verfijn je formatie.' },
  match: { title: 'Live Match', text: 'Live simulatie met eventlog en mini-pitch.' },
  game: { title: 'Game Engine', text: 'Speel wedstrijden, bekijk resultaten en beheer je seizoen.' },
  readability: { title: 'Readability Settings', text: 'Stel centraal de leesbaarheid in voor alle pagina\'s.' }
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
  const squad = realSquads[club.name];

  return fallbackSquadRoles.map((role, index) => {
    const real = squad?.[index];
    const firstName = real ? real.name.split(' ')[0] : fallbackFirstNames[(seed + index * 7) % fallbackFirstNames.length];
    const lastName = real ? real.name.split(' ').slice(1).join(' ') : fallbackLastNames[(seed + index * 11) % fallbackLastNames.length];
    const base = 48 + ((seed + index * 13) % 28);

    const age = real ? real.age : 18 + ((seed + index * 5) % 17);
    const expBase = Math.min(20, Math.max(1, Math.floor((age - 16) * 0.8) + ((seed + index * 9) % 5)));

    return {
      id: `${club.id || club.name}-fallback-${index + 1}`,
      name: real ? real.name : `${firstName} ${lastName}`,
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
      <span className="w-24 shrink-0 text-xs font-semibold text-[#98ca7a] uppercase">{label}</span>
      <div className="h-2 flex-1 bg-[#1a3a1e] rounded-sm overflow-hidden">
        <div className={`h-full ${color} rounded-sm`} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-7 text-right text-xs font-bold text-white">{value}</span>
    </div>
  );
}

function RoleBadge({ role, variant }: { role: string; variant: 'primary' | 'secondary' }) {
  const bg = variant === 'primary' ? 'bg-[#1d4ed8]' : 'bg-[#6b21a8]';
  return <span className={`${bg} px-2 py-0.5 text-xs font-bold text-white rounded`}>{role}</span>;
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
  onBulkStatusChange,
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
  onBulkStatusChange: (updates: SquadBulkUpdate[]) => void;
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

  const applyVisibleStatus = (target: SquadStatus) => {
    const updates: SquadBulkUpdate[] = visiblePlayers.map((player) => ({ playerId: player.id, status: target }));
    onBulkStatusChange(updates);
  };

  const autoSelectMatchdaySquad = () => {
    const ranked = [...players].sort((left, right) => getOverall(right) - getOverall(left));
    const startersSet = new Set(ranked.slice(0, MAX_STARTERS).map((player) => player.id));
    const benchSet = new Set(ranked.slice(MAX_STARTERS, MAX_STARTERS + MAX_BENCH).map((player) => player.id));
    const updates: SquadBulkUpdate[] = ranked.map((player) => ({
      playerId: player.id,
      status: startersSet.has(player.id) ? 'STARTER' : benchSet.has(player.id) ? 'BENCH' : 'EXCLUDED'
    }));
    onBulkStatusChange(updates);
  };

  const clearSelection = () => {
    const updates: SquadBulkUpdate[] = players.map((player) => ({ playerId: player.id, status: 'EXCLUDED' }));
    onBulkStatusChange(updates);
  };

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

      <div className="mb-3 flex flex-wrap items-center gap-2 border border-[#98ca7a] bg-[#1f641d] px-2 py-2 text-xs">
        <button
          type="button"
          onClick={autoSelectMatchdaySquad}
          className="border border-[#efe56b] bg-[#3a6e1d] px-2 py-1 font-bold text-[#efe56b] hover:bg-[#4a7e22]"
        >
          Auto Selectie (11+12)
        </button>
        <button
          type="button"
          onClick={() => applyVisibleStatus('STARTER')}
          className="border border-[#b78bda] bg-[#caa6e6] px-2 py-1 font-semibold text-[#2e1f4a] hover:bg-[#d7b8ee]"
        >
          Zichtbaar naar Basis
        </button>
        <button
          type="button"
          onClick={() => applyVisibleStatus('BENCH')}
          className="border border-[#b78bda] bg-[#caa6e6] px-2 py-1 font-semibold text-[#2e1f4a] hover:bg-[#d7b8ee]"
        >
          Zichtbaar naar Reserve
        </button>
        <button
          type="button"
          onClick={() => applyVisibleStatus('EXCLUDED')}
          className="border border-[#b78bda] bg-[#caa6e6] px-2 py-1 font-semibold text-[#2e1f4a] hover:bg-[#d7b8ee]"
        >
          Zichtbaar naar Uitgesloten
        </button>
        <button
          type="button"
          onClick={clearSelection}
          className="border border-[#ff6b6b] bg-[#ff6b6b] px-2 py-1 font-semibold text-[#2e1f4a] hover:bg-[#ff8282]"
        >
          Wis Selectie
        </button>
        <span className="ml-auto text-[#d5f8b6]">{visiblePlayers.length} zichtbaar</span>
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
              <div className="text-xs text-[#98ca7a]">OVR</div>
              <div className="text-2xl font-black text-white">{profile.ovr}</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-[#98ca7a]">EFF</div>
              <div className={`text-2xl font-black ${profile.effectiveOvr >= profile.ovr ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}>{profile.effectiveOvr}</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-[#98ca7a]">POT</div>
              <div className="text-2xl font-black text-[#60a5fa]">{selectedPlayer.potential}</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-[#98ca7a]">FORM</div>
              <div className={`text-sm font-bold ${profile.formImpact > 0 ? 'text-[#22c55e]' : profile.formImpact < 0 ? 'text-[#ef4444]' : 'text-white'}`}>{profile.formImpact > 0 ? '+' : ''}{profile.formImpact}</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-[#98ca7a]">FATIGUE</div>
              <div className={`text-sm font-bold ${profile.fatigueImpact < -5 ? 'text-[#ef4444]' : profile.fatigueImpact < 0 ? 'text-[#f97316]' : 'text-[#22c55e]'}`}>{profile.fatigueImpact}</div>
            </div>
          </div>

          {/* ── All Attributes ── */}
          <div className="mb-3 grid grid-cols-2 gap-x-4 gap-y-1">
            {/* Derived (0-100) */}
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
            {/* Classic TM (0-20) */}
            <AttrBar label="Speed" value={selectedPlayer.speed} max={20} />
            <AttrBar label="Passing" value={selectedPlayer.passing} max={20} />
            <AttrBar label="Heading" value={selectedPlayer.heading} max={20} />
            <AttrBar label="Marking" value={selectedPlayer.marking} max={20} />
            <AttrBar label="Experience" value={selectedPlayer.experience} max={20} />
            <AttrBar label="Stamina" value={selectedPlayer.stamina} max={20} />
            <AttrBar label="Fitness" value={selectedPlayer.fitness} max={20} />
            <AttrBar label="Freshness" value={selectedPlayer.freshness} max={20} />
            <AttrBar label="Caps" value={selectedPlayer.caps} max={20} />
            <AttrBar label="Morale" value={selectedPlayer.morale} max={20} />
          </div>

          {/* ── Player Info ── */}
          <div className="grid grid-cols-3 gap-x-4 font-mono border-t border-[#2a8a2b] pt-2 text-center">
            <div><span className="text-[#98ca7a]">Age</span> <span className="text-white font-bold">{selectedPlayer.age}</span></div>
            <div><span className="text-[#98ca7a]">Played</span> <span className="text-white font-bold">{selectedPlayer.played}</span></div>
            <div><span className="text-[#98ca7a]">Scored</span> <span className="text-white font-bold">{selectedPlayer.scored}</span></div>
          </div>

          {/* ── FIFA-style six-pack ── */}
          <div className="grid grid-cols-3 gap-2 border-t border-[#2a8a2b] pt-2 mt-2 text-center font-mono">
            <div><span className="text-[#efe56b]">Pace</span> <span className="text-white">{selectedPlayer.pac}</span></div>
            <div><span className="text-[#efe56b]">Shooting</span> <span className="text-white">{selectedPlayer.sho}</span></div>
            <div><span className="text-[#efe56b]">Passing</span> <span className="text-white">{selectedPlayer.pas}</span></div>
            <div><span className="text-[#efe56b]">Dribbling</span> <span className="text-white">{selectedPlayer.dri}</span></div>
            <div><span className="text-[#efe56b]">Defence</span> <span className="text-white">{selectedPlayer.def}</span></div>
            <div><span className="text-[#efe56b]">Physical</span> <span className="text-white">{selectedPlayer.phy}</span></div>
          </div>
        </div>
        );
      })() : null}
    </section>
  );
}

/* ── Right Sidebar: Managerbook + News & Transfer Feed ── */

function seededRand(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  s = (s * 16807) % 2147483647;
  return (s - 1) / 2147483646;
}

function hashString(str: string) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function generateNewsFeed(clubs: Club[], activeClub: Club, squad: SquadPlayer[]) {
  if (clubs.length === 0) return [];

  const seed = hashString(activeClub.id + activeClub.name);
  const items: { icon: string; text: string; type: 'transfer' | 'news' | 'injury' | 'morale' }[] = [];

  const otherClubs = clubs.filter((c) => c.id !== activeClub.id);

  // Transfer rumours about your players
  for (let i = 0; i < Math.min(3, otherClubs.length); i++) {
    const club = otherClubs[Math.floor(seededRand(seed + i * 7) * otherClubs.length)];
    if (squad.length > 0) {
      const target = squad[Math.floor(seededRand(seed + i * 13 + 1) * squad.length)];
      const templates = [
        `${club.name} are interested in signing ${target.name}.`,
        `${club.name} have made enquiries about ${target.name}.`,
        `${club.name} are monitoring ${target.name}'s situation closely.`,
        `Scouts from ${club.name} were spotted watching ${target.name}.`
      ];
      items.push({
        icon: '📋',
        text: templates[Math.floor(seededRand(seed + i * 17) * templates.length)],
        type: 'transfer'
      });
    }
  }

  // Transfer market activity between other clubs
  for (let i = 0; i < 2; i++) {
    const buyerIdx = Math.floor(seededRand(seed + 50 + i) * otherClubs.length);
    const sellerIdx = Math.floor(seededRand(seed + 60 + i) * otherClubs.length);
    if (buyerIdx !== sellerIdx && otherClubs[buyerIdx] && otherClubs[sellerIdx]) {
      const buyer = otherClubs[buyerIdx];
      const seller = otherClubs[sellerIdx];
      const playerNames = ['Johnson', 'Williams', 'Thompson', 'Garcia', 'Martinez', 'Anderson', 'Thomas', 'Jackson', 'White', 'Harris', 'Martin', 'Clark'];
      const pName = playerNames[Math.floor(seededRand(seed + 70 + i) * playerNames.length)];
      const fee = Math.round(1 + seededRand(seed + 80 + i) * 25);
      items.push({
        icon: '💰',
        text: `${buyer.name} sign ${pName} from ${seller.name} for €${fee}M.`,
        type: 'transfer'
      });
    }
  }

  // Squad morale
  if (squad.length > 0) {
    const player = squad[Math.floor(seededRand(seed + 100) * squad.length)];
    if (player.morale > 70) {
      items.push({ icon: '😊', text: `${player.name} is delighted with recent form and wants to stay at the club.`, type: 'morale' });
    } else if (player.morale < 40) {
      items.push({ icon: '😤', text: `${player.name} is unhappy with lack of playing time and may request a transfer.`, type: 'morale' });
    }

    // Injury concern
    const injuryPlayer = squad[Math.floor(seededRand(seed + 110) * squad.length)];
    if (injuryPlayer.stamina < 60) {
      items.push({ icon: '🏥', text: `${injuryPlayer.name} is carrying a minor knock and could miss the next match.`, type: 'injury' });
    }
  }

  // General league news
  const leagueNews = [
    `The FA has announced fixture changes for the upcoming round.`,
    `Attendance figures across the ${activeClub.leagueName ?? 'league'} are up 12% this season.`,
    `Referees will crack down on simulation starting next week.`,
    `The transfer window closes in 14 days. Clubs are expected to be busy.`,
    `TV revenue for the ${activeClub.leagueName ?? 'league'} has increased this year.`
  ];
  items.push({
    icon: '📰',
    text: leagueNews[Math.floor(seededRand(seed + 200) * leagueNews.length)],
    type: 'news'
  });

  return items;
}

function RightSidebar({
  summary,
  events,
  clubs,
  activeClub,
  squadPlayers
}: {
  summary: ManagerSummary | null;
  events: MatchEvent[];
  clubs: Club[];
  activeClub: Club;
  squadPlayers: SquadPlayer[];
}) {
  const fallbackSummary: ManagerSummary = useMemo(() => ({
    status: 'INEXPERIENCED',
    level: 1,
    successes: 0,
    successiveWins: 0,
    successiveLosses: 0,
    totalWins: 0,
    totalLosses: 0,
    totalDraws: 0
  }), []);

  const mgr = summary ?? fallbackSummary;
  const newsFeed = useMemo(() => generateNewsFeed(clubs, activeClub, squadPlayers), [clubs, activeClub, squadPlayers]);

  const statusColor = mgr.status === 'ELITE' ? 'text-[#22c55e]' : mgr.status === 'PRO' ? 'text-[#eab308]' : 'text-[#f97316]';

  return (
    <aside className="border-4 border-[#6f4ca1] bg-[#0d5e13] p-3 text-sm text-[#d5f8b6] overflow-y-auto">
      {/* Managerbook */}
      <h2 className="mb-2 font-black uppercase text-[#efe56b]">Managerbook</h2>
      <div className="mb-1 flex items-center justify-between border-b border-[#1a5a1e] py-1">
        <span className="text-[#98ca7a]">Status</span>
        <span className={`font-black ${statusColor}`}>{mgr.status}</span>
      </div>
      <div className="flex items-center justify-between border-b border-[#1a5a1e] py-1">
        <span className="text-[#98ca7a]">Level</span>
        <span className="font-bold text-white">{mgr.level}</span>
      </div>
      <div className="mt-1 grid grid-cols-3 gap-1 text-center">
        <div className="border border-[#2a8a2b] bg-[#1a3a1e] py-1">
          <p className="text-xs text-[#98ca7a]">Wins</p>
          <p className="font-black text-[#22c55e]">{mgr.totalWins}</p>
        </div>
        <div className="border border-[#2a8a2b] bg-[#1a3a1e] py-1">
          <p className="text-xs text-[#98ca7a]">Draws</p>
          <p className="font-black text-[#eab308]">{mgr.totalDraws}</p>
        </div>
        <div className="border border-[#2a8a2b] bg-[#1a3a1e] py-1">
          <p className="text-xs text-[#98ca7a]">Losses</p>
          <p className="font-black text-[#ef4444]">{mgr.totalLosses}</p>
        </div>
      </div>
      {mgr.successiveWins > 0 && (
        <p className="mt-1 text-xs text-[#22c55e]">🔥 {mgr.successiveWins} successive win{mgr.successiveWins > 1 ? 's' : ''}!</p>
      )}
      {mgr.successiveLosses > 0 && (
        <p className="mt-1 text-xs text-[#ef4444]">⚠ {mgr.successiveLosses} successive loss{mgr.successiveLosses > 1 ? 'es' : ''}.</p>
      )}
      {!summary && (
        <p className="mt-1 text-xs italic text-[#6b9a5a]">Start of career stats. Play matches to update.</p>
      )}

      {/* Match Feed */}
      <h3 className="mb-2 mt-4 font-black uppercase text-[#efe56b]">Match Feed</h3>
      {events.length === 0 ? (
        <p className="border-l-2 border-[#2a8a2b] pl-2 text-xs italic text-[#6b9a5a]">
          No live match in progress. Play a match to see events here.
        </p>
      ) : (
        <ul className="space-y-1 max-h-48 overflow-y-auto">
          {events.map((event) => {
            const isGoal = event.type === 'GOAL';
            return (
              <li
                className={`border px-2 py-1 ${isGoal ? 'border-[#efe56b] bg-[#2a6a1b]' : 'border-[#98ca7a] bg-[#256d22]'}`}
                key={`${event.minute}-${event.type}-${event.team ?? ''}`}
              >
                <span className="font-bold text-white">{event.minute}&apos;</span>{' '}
                {isGoal && <span className="text-[#efe56b]">⚽ </span>}
                {event.description ?? `${event.team ?? 'MATCH'} ${event.type}`}
              </li>
            );
          })}
        </ul>
      )}

      {/* News & Transfer Feed */}
      <h3 className="mb-2 mt-4 font-black uppercase text-[#efe56b]">News &amp; Transfers</h3>
      <ul className="space-y-1.5">
        {newsFeed.map((item, i) => (
          <li key={i} className="border-l-2 border-[#2a8a2b] pl-2 text-xs leading-snug">
            <span className="mr-1">{item.icon}</span>
            {item.text}
          </li>
        ))}
      </ul>
    </aside>
  );
}

function PagePanel({
  page,
  activeClub,
  clubs,
  squadPlayers,
  squadLoading,
  squadError,
  squadSearch,
  squadRoleFilter,
  squadSortBy,
  squadStatuses,
  positionOverrides,
  summary,
  onSquadSearchChange,
  onSquadRoleFilterChange,
  onSquadSortChange,
  onSquadStatusChange,
  onBulkSquadStatusChange,
  onAutoSelectFromTactic,
  onPositionChange,
  onClubChange,
  onMatchResult,
  onMatchEvents,
  onGameWeekAdvance,
  gameResetKey,
  mailboxRefreshToken,
  uiFontSizePt,
  onUiFontSizeChange,
}: {
  page: PageKey;
  activeClub: Club;
  clubs: Club[];
  squadPlayers: SquadPlayer[];
  squadLoading: boolean;
  squadError: string | null;
  squadSearch: string;
  squadRoleFilter: string;
  squadSortBy: SquadSortKey;
  squadStatuses: Record<string, SquadStatus>;
  positionOverrides: Record<string, string>;
  summary: ManagerSummary | null;
  onSquadSearchChange: (value: string) => void;
  onSquadRoleFilterChange: (value: string) => void;
  onSquadSortChange: (value: SquadSortKey) => void;
  onSquadStatusChange: (playerId: string, status: SquadStatus) => void;
  onBulkSquadStatusChange: (updates: SquadBulkUpdate[]) => void;
  onAutoSelectFromTactic: (tactic: FullTactic) => void;
  onPositionChange: (playerId: string, role: string) => void;
  onClubChange: (clubId: string) => void;
  onMatchResult: (homeGoals: number, awayGoals: number, isHome: boolean) => void;
  onMatchEvents: (events: MatchEvent[]) => void;
  onGameWeekAdvance: () => void;
  gameResetKey: number;
  mailboxRefreshToken: number;
  uiFontSizePt: number;
  onUiFontSizeChange: (value: number) => void;
}) {
  // Pages that remount on each visit (state is either in localStorage or not important)
  if (page === 'game') {
    return (
      <GameDashboard
        key={gameResetKey}
        clubs={clubs}
        activeClub={activeClub}
        squadPlayers={squadPlayers}
        activeTactic={loadActiveTactic(activeClub?.id)}
        onMatchResult={onMatchResult}
        onMatchEvents={onMatchEvents}
        onWeekAdvance={onGameWeekAdvance}
      />
    );
  }
  if (page === 'manager') {
    return <ManagerPage activeClub={activeClub} clubs={clubs} onClubChange={onClubChange} />;
  }
  if (page === 'readability') {
    return <ReadabilitySettings fontSizePt={uiFontSizePt} onFontSizeChange={onUiFontSizeChange} />;
  }
  if (page === 'match') return <MatchScreen />;

  // Derive starters/bench for tactics at this level so it's always fresh
  const starters = squadPlayers
    .filter((p) => squadStatuses[p.id] === 'STARTER')
    .map((p) => ({ ...p, role: positionOverrides[p.id] ?? p.role }));
  const bench = squadPlayers
    .filter((p) => squadStatuses[p.id] === 'BENCH')
    .map((p) => ({ ...p, role: positionOverrides[p.id] ?? p.role }));

  // Helper: inline style to hide/show without unmounting
  const show = (key: PageKey) => ({ display: page === key ? undefined : 'none' } as React.CSSProperties);

  // Fallback for unknown page keys
  const desc = pageDescriptions[page as PageKey];
  const isFallback = !['board','mail','cup','human','transfers','training','manage','squad','tactics','readability'].includes(page);

  return (
    <>
      {/* All state-heavy pages stay permanently mounted — only hidden via display:none when inactive */}
      <div style={show('board')}>
        <BoardRoom activeClub={activeClub} summary={summary} squadPlayers={squadPlayers} />
      </div>
      <div style={show('mail')}>
        <Mailbox activeClub={activeClub} clubs={clubs} squadPlayers={squadPlayers} summary={summary} refreshToken={mailboxRefreshToken} />
      </div>
      <div style={show('cup')}>
        <CupCenter activeClub={activeClub} />
      </div>
      <div style={show('human')}>
        <PlayerFixtures activeClub={activeClub} clubs={clubs} squadPlayers={squadPlayers} />
      </div>
      <div style={show('transfers')}>
        <TransferMarket activeClub={activeClub} clubs={clubs} squadPlayers={squadPlayers} />
      </div>
      <div style={show('training')}>
        <TrainingGround activeClub={activeClub} squadPlayers={squadPlayers} />
      </div>
      <div style={show('manage')}>
        <ClubManagement activeClub={activeClub} squadPlayers={squadPlayers} />
      </div>
      <div style={show('squad')}>
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
          onBulkStatusChange={onBulkSquadStatusChange}
          onPositionChange={onPositionChange}
        />
      </div>
      <div style={show('tactics')}>
        <TacticsPage
          starters={starters}
          bench={bench}
          clubId={activeClub?.id}
          onAutoSelectByFormation={onAutoSelectFromTactic}
        />
      </div>
      {isFallback && (
        <section className="border-4 border-[#6f4ca1] bg-[#16a51c] p-3">
          <h2 className="mb-3 border border-[#ceb8e1] bg-[#d5b5ec] p-2 text-center text-sm font-bold uppercase text-[#2e1f4a]">
            {desc?.title ?? page}
          </h2>
          <div className="retro-pitch mb-3 h-52 border-2 border-[#8ee486]" />
          <p className="border border-[#98ca7a] bg-[#256d22] px-2 py-1 text-sm text-[#d5f8b6]">{desc?.text}</p>
          <p className="mt-3 border border-[#98ca7a] bg-[#1f641d] px-2 py-1 text-sm text-[#d5f8b6]">
            Division: <strong>{activeClub.leagueName ?? activeClub.country ?? '1st Division'}</strong>
          </p>
          <p className="mt-3 border border-[#98ca7a] bg-[#1f641d] px-2 py-1 text-sm text-[#d5f8b6]">
            Active club: <strong>{activeClub.name}</strong>
          </p>
        </section>
      )}
    </>
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

/* ── Manager Summary: localStorage persistence ── */
const SUMMARY_KEY = 'tmt_manager_summary';
const MATCH_FEED_KEY = 'tmt_match_feed';

/* ── Save/Load slot system ── */
const NUM_SAVE_SLOTS = 4;
const SAVE_SLOT_KEY = (s: number) => `tmt_saveslot_${s}`;

interface SaveSlotData {
  version: 1;
  savedAt: string;
  activeClubId: string;
  clubName: string;
  season: number;
  week: number;
  summary: ManagerSummary | null;
  gameStateRaw: string;
  squadStatusesRaw: string;
  positionOverridesRaw: string;
  activeTacticRaw: string | null;
  matchFeedRaw: string;
}

function readSaveSlot(slot: number): SaveSlotData | null {
  try {
    const raw = localStorage.getItem(SAVE_SLOT_KEY(slot));
    return raw ? (JSON.parse(raw) as SaveSlotData) : null;
  } catch { return null; }
}

function writeSaveSlot(slot: number, data: SaveSlotData) {
  try {
    localStorage.setItem(SAVE_SLOT_KEY(slot), JSON.stringify(data));
  } catch { /* quota exceeded */ }
}

function eraseSlot(slot: number) {
  localStorage.removeItem(SAVE_SLOT_KEY(slot));
}

/* ── SaveLoadModal component ── */
function SaveLoadModal({
  mode,
  activeClub,
  summary,
  squadStatuses,
  positionOverrides,
  events,
  onClose,
  onLoad,
  onNewGame,
}: {
  mode: 'save' | 'load';
  activeClub: Club;
  summary: ManagerSummary | null;
  squadStatuses: Record<string, SquadStatus>;
  positionOverrides: Record<string, string>;
  events: MatchEvent[];
  onClose: () => void;
  onLoad: (data: SaveSlotData) => void;
  onNewGame: () => void;
}) {
  const [slots, setSlots] = useState<(SaveSlotData | null)[]>(() =>
    Array.from({ length: NUM_SAVE_SLOTS }, (_, i) => readSaveSlot(i))
  );
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [confirmNew, setConfirmNew] = useState(false);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  const handleSave = (slot: number) => {
    const gs = loadGameState();
    const at = loadActiveTactic(activeClub.id);
    const data: SaveSlotData = {
      version: 1,
      savedAt: new Date().toISOString(),
      activeClubId: activeClub.id,
      clubName: activeClub.name,
      season: gs?.season ?? 1,
      week: gs?.gameWeek ?? 1,
      summary,
      gameStateRaw: gs ? JSON.stringify(gs) : 'null',
      squadStatusesRaw: JSON.stringify(squadStatuses),
      positionOverridesRaw: JSON.stringify(positionOverrides),
      activeTacticRaw: at ? JSON.stringify(at) : null,
      matchFeedRaw: JSON.stringify(events),
    };
    writeSaveSlot(slot, data);
    setSlots((prev) => { const n = [...prev]; n[slot] = data; return n; });
    setSavedMsg(`Game opgeslagen in slot ${slot + 1}!`);
    setTimeout(() => setSavedMsg(null), 2500);
  };

  const handleDelete = (slot: number) => {
    eraseSlot(slot);
    setSlots((prev) => { const n = [...prev]; n[slot] = null; return n; });
    setConfirmDelete(null);
  };

  const fmt = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString('nl-NL', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
    } catch { return iso; }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
      <section className="w-full max-w-xl border-4 border-[#6f4ca1] bg-[#0d5e13] text-sm text-[#d5f8b6]">
        {/* Title bar */}
        <div className="border-b-2 border-[#6f4ca1] bg-[#2e1f4a] flex items-center justify-between px-4 py-2">
          <h2 className="font-black uppercase text-[#efe56b] tracking-widest text-sm">
            {mode === 'save' ? '💾 Spel Opslaan' : '📂 Spel Laden'}
          </h2>
          <button onClick={onClose} className="border border-[#efe56b] bg-[#1a3a1e] px-2 py-0.5 font-bold text-[#efe56b] hover:bg-[#2a8a2b]">✕</button>
        </div>

        {savedMsg && (
          <div className="bg-[#1a5a28] border-b border-[#efe56b] px-4 py-2 text-[#efe56b] font-bold text-xs text-center animate-pulse">
            ✓ {savedMsg}
          </div>
        )}

        {/* 2×2 save slot grid */}
        <div className="grid grid-cols-2 gap-3 p-4">
          {slots.map((slot, i) => (
            <div key={i} className={`border-2 p-3 min-h-[110px] ${slot ? 'border-[#2a8a2b] bg-[#0a3d0e]' : 'border-[#1a3a1e] bg-[#081a0a]'}`}>
              <div className="flex items-center justify-between mb-1">
                <span className="font-black text-[#efe56b] text-xs uppercase">Slot {i + 1}</span>
                {slot && confirmDelete !== i && (
                  <button onClick={() => setConfirmDelete(i)} className="text-[11px] border border-[#ef4444] px-1 py-0.5 text-[#ef4444] hover:bg-[#7f1d1d]">🗑</button>
                )}
              </div>

              {confirmDelete === i ? (
                <div className="space-y-1">
                  <p className="text-xs text-[#ef4444] font-bold">Verwijderen?</p>
                  <div className="flex gap-1">
                    <button onClick={() => handleDelete(i)} className="flex-1 border border-[#ef4444] bg-[#7f1d1d] text-[#ef4444] text-xs py-0.5 font-bold">Ja</button>
                    <button onClick={() => setConfirmDelete(null)} className="flex-1 border border-[#2a8a2b] bg-[#0a3d0e] text-[#98ca7a] text-xs py-0.5">Nee</button>
                  </div>
                </div>
              ) : slot ? (
                <div className="space-y-0.5">
                  <p className="font-bold text-white text-xs truncate">{slot.clubName}</p>
                  <p className="text-xs text-[#98ca7a]">Seizoen {slot.season} — Week {slot.week}</p>
                  <p className="text-xs text-[#6b9a5a]">{fmt(slot.savedAt)}</p>
                  {slot.summary && (
                    <p className="text-xs text-[#efe56b]">W:{slot.summary.totalWins} D:{slot.summary.totalDraws} V:{slot.summary.totalLosses}</p>
                  )}
                  <div className="flex gap-1 mt-2">
                    {mode === 'save' ? (
                      <button onClick={() => handleSave(i)} className="flex-1 border border-[#efe56b] bg-[#2a8a2b] text-[#efe56b] text-xs py-1 font-bold hover:bg-[#46b047]">💾 Overschrijven</button>
                    ) : (
                      <button onClick={() => onLoad(slot)} className="flex-1 border border-[#22c55e] bg-[#14532d] text-[#22c55e] text-xs py-1 font-bold hover:bg-[#166534]">📂 Laden</button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col justify-between h-full">
                  <p className="text-xs text-[#2a5a2e] italic mt-2">— Leeg slot —</p>
                  {mode === 'save' && (
                    <button onClick={() => handleSave(i)} className="mt-auto w-full border border-[#efe56b] bg-[#2a8a2b] text-[#efe56b] text-xs py-1 font-bold hover:bg-[#46b047]">💾 Hier opslaan</button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="border-t-2 border-[#6f4ca1] px-4 py-3 flex items-center justify-between gap-2 bg-[#2e1f4a]">
          {confirmNew ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#ef4444] font-bold">Huidige voortgang verliezen?</span>
              <button onClick={onNewGame} className="border border-[#ef4444] bg-[#7f1d1d] text-[#ef4444] px-2 py-0.5 text-xs font-bold">Ja, nieuw spel</button>
              <button onClick={() => setConfirmNew(false)} className="border border-[#2a8a2b] px-2 py-0.5 text-[#98ca7a] text-xs">Annuleren</button>
            </div>
          ) : (
            <button onClick={() => setConfirmNew(true)} className="border border-[#ef4444] bg-[#7f1d1d] text-[#ef4444] px-3 py-1 text-xs font-bold uppercase hover:bg-[#991b1b]">🔄 Nieuw Spel</button>
          )}
          <button onClick={onClose} className="border border-[#2a8a2b] bg-[#0a3d0e] text-[#98ca7a] px-4 py-1 text-xs font-bold hover:bg-[#1a5a28]">Sluiten</button>
        </div>
      </section>
    </div>
  );
}

function loadManagerSummary(): ManagerSummary | null {
  try {
    const raw = localStorage.getItem(SUMMARY_KEY);
    return raw ? (JSON.parse(raw) as ManagerSummary) : null;
  } catch {
    return null;
  }
}

function saveManagerSummary(s: ManagerSummary) {
  try {
    localStorage.setItem(SUMMARY_KEY, JSON.stringify(s));
  } catch { /* ignore quota errors */ }
}

function loadStoredMatchFeed(): MatchEvent[] {
  try {
    const raw = localStorage.getItem(MATCH_FEED_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as MatchEvent[]) : [];
  } catch {
    return [];
  }
}

function saveStoredMatchFeed(events: MatchEvent[]) {
  try {
    localStorage.setItem(MATCH_FEED_KEY, JSON.stringify(events.slice(-40)));
  } catch {
    // ignore quota errors
  }
}

function summaryMatchesPlayed(s: ManagerSummary | null): number {
  if (!s) return 0;
  return (s.totalWins ?? 0) + (s.totalDraws ?? 0) + (s.totalLosses ?? 0);
}

function pickMostAdvancedSummary(localSummary: ManagerSummary | null, remoteSummary: ManagerSummary): ManagerSummary {
  if (!localSummary) return remoteSummary;
  const localPlayed = summaryMatchesPlayed(localSummary);
  const remotePlayed = summaryMatchesPlayed(remoteSummary);
  if (localPlayed > remotePlayed) return localSummary;
  if (remotePlayed > localPlayed) return remoteSummary;
  if ((localSummary.level ?? 0) > (remoteSummary.level ?? 0)) return localSummary;
  if ((remoteSummary.level ?? 0) > (localSummary.level ?? 0)) return remoteSummary;
  return (localSummary.successes ?? 0) >= (remoteSummary.successes ?? 0) ? localSummary : remoteSummary;
}

function deriveStatus(level: number): ManagerSummary['status'] {
  if (level >= 10) return 'ELITE';
  if (level >= 7) return 'PRO';
  return 'INEXPERIENCED';
}

function buildSummaryFromGameState(activeClubId: string | null): ManagerSummary | null {
  if (!activeClubId) return null;
  const gs = loadGameState();
  if (!gs) return null;

  const played = Object.values(gs.fixtures)
    .filter((f) => f.played && (f.homeId === activeClubId || f.awayId === activeClubId))
    .sort((a, b) => {
      if (a.week !== b.week) return a.week - b.week;
      return a.id.localeCompare(b.id);
    });

  let totalWins = 0;
  let totalDraws = 0;
  let totalLosses = 0;

  for (const fixture of played) {
    const goalsFor = fixture.homeId === activeClubId ? fixture.homeGoals : fixture.awayGoals;
    const goalsAgainst = fixture.homeId === activeClubId ? fixture.awayGoals : fixture.homeGoals;
    if (goalsFor > goalsAgainst) totalWins += 1;
    else if (goalsFor === goalsAgainst) totalDraws += 1;
    else totalLosses += 1;
  }

  let successiveWins = 0;
  let successiveLosses = 0;
  for (let i = played.length - 1; i >= 0; i -= 1) {
    const fixture = played[i];
    const goalsFor = fixture.homeId === activeClubId ? fixture.homeGoals : fixture.awayGoals;
    const goalsAgainst = fixture.homeId === activeClubId ? fixture.awayGoals : fixture.homeGoals;
    if (goalsFor > goalsAgainst) {
      if (successiveLosses > 0) break;
      successiveWins += 1;
      continue;
    }
    if (goalsFor < goalsAgainst) {
      if (successiveWins > 0) break;
      successiveLosses += 1;
      continue;
    }
    break;
  }

  const successes = totalWins;
  const level = Math.max(1, 1 + Math.floor(totalWins / 5));
  const status = deriveStatus(level);

  return {
    status,
    level,
    successes,
    successiveWins,
    successiveLosses,
    totalWins,
    totalLosses,
    totalDraws,
  };
}

function updateSummaryAfterMatch(prev: ManagerSummary | null, homeGoals: number, awayGoals: number, isHome: boolean): ManagerSummary {
  const base: ManagerSummary = prev ?? {
    status: 'INEXPERIENCED', level: 1, successes: 0,
    successiveWins: 0, successiveLosses: 0, totalWins: 0, totalLosses: 0, totalDraws: 0,
  };

  const playerGoals = isHome ? homeGoals : awayGoals;
  const opponentGoals = isHome ? awayGoals : homeGoals;
  const isWin  = playerGoals > opponentGoals;
  const isDraw = playerGoals === opponentGoals;

  const totalWins   = base.totalWins   + (isWin  ? 1 : 0);
  const totalDraws  = base.totalDraws  + (isDraw  ? 1 : 0);
  const totalLosses = base.totalLosses + (!isWin && !isDraw ? 1 : 0);

  const successiveWins   = isWin  ? base.successiveWins + 1 : 0;
  const successiveLosses = !isWin && !isDraw ? base.successiveLosses + 1 : 0;
  const successes        = base.successes + (isWin ? 1 : 0);

  const level  = Math.max(1, 1 + Math.floor(totalWins / 5));
  const status = deriveStatus(level);

  return { status, level, successes, successiveWins, successiveLosses, totalWins, totalLosses, totalDraws };
}

export default function App() {
  const [clubs, setClubs] = useState<Club[]>([]);
  const [activeClubId, setActiveClubId] = useState<string | null>(null);
  const [events, setEvents] = useState<MatchEvent[]>(() => loadStoredMatchFeed());
  const [summary, setSummary] = useState<ManagerSummary | null>(() => loadManagerSummary());
  const error: string | null = null;
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
  // Save/Load modal state
  const [showSaveLoad, setShowSaveLoad] = useState(false);
  const [saveLoadMode, setSaveLoadMode] = useState<'save' | 'load'>('save');
  const [gameResetKey, setGameResetKey] = useState(0);
  const [mailboxRefreshToken, setMailboxRefreshToken] = useState(0);
  const [uiFontSizePt, setUiFontSizePt] = useState<number>(() => loadUiFontSizePt());

  const refreshSummaryFromGameState = useCallback((clubId?: string | null) => {
    const next = buildSummaryFromGameState(clubId ?? activeClubId);
    if (!next) return;
    setSummary(next);
    saveManagerSummary(next);
  }, [activeClubId]);

  // Called by GameDashboard when an interactive match finishes
  const handleMatchResult = useCallback((homeGoals: number, awayGoals: number, isHome: boolean) => {
    setSummary((prev) => {
      const next = updateSummaryAfterMatch(prev, homeGoals, awayGoals, isHome);
      saveManagerSummary(next);
      return next;
    });
    setMailboxRefreshToken((v) => v + 1);
    refreshSummaryFromGameState();
  }, [refreshSummaryFromGameState]);

  const handleGameWeekAdvance = useCallback(() => {
    setMailboxRefreshToken((v) => v + 1);
    refreshSummaryFromGameState();
  }, [refreshSummaryFromGameState]);

  // Called by GameDashboard when live match events change
  const handleMatchEvents = useCallback((evs: MatchEvent[]) => {
    setEvents(evs);
    saveStoredMatchFeed(evs);
  }, []);

  // Full game load from a save slot
  const handleLoadSlot = useCallback((data: SaveSlotData) => {
    // 1. Restore engine game state to localStorage
    if (data.gameStateRaw && data.gameStateRaw !== 'null') {
      try {
        const gs = JSON.parse(data.gameStateRaw);
        saveGameState(gs);
      } catch { /* corrupt save */ }
    } else {
      clearEngineGameState();
    }
    // 2. Restore active tactic
    if (data.activeTacticRaw) {
      try {
        const at = JSON.parse(data.activeTacticRaw);
        saveActiveTactic(data.activeClubId, at);
      } catch { /* corrupt */ }
    }
    // 3. Restore squad statuses to localStorage + state
    if (data.squadStatusesRaw) {
      try {
        const ss = JSON.parse(data.squadStatusesRaw) as Record<string, SquadStatus>;
        localStorage.setItem(SQUAD_STORAGE_KEY, JSON.stringify({ [data.activeClubId]: ss }));
        setSquadStatuses(ss);
      } catch { /* corrupt */ }
    }
    // 4. Restore position overrides
    if (data.positionOverridesRaw) {
      try {
        const po = JSON.parse(data.positionOverridesRaw) as Record<string, string>;
        localStorage.setItem(POSITION_OVERRIDES_KEY, JSON.stringify({ [data.activeClubId]: po }));
        setPositionOverrides(po);
      } catch { /* corrupt */ }
    }
    // 5. Restore manager summary
    if (data.summary) {
      saveManagerSummary(data.summary);
      setSummary(data.summary);
    }
    // 6. Restore match feed
    if (data.matchFeedRaw) {
      try {
        const feed = JSON.parse(data.matchFeedRaw) as MatchEvent[];
        saveStoredMatchFeed(feed);
        setEvents(feed);
      } catch { /* corrupt */ }
    }
    // 7. Restore active club → triggers squad reload
    setActiveClubId(data.activeClubId);
    refreshSummaryFromGameState(data.activeClubId);
    // 8. Force GameDashboard remount so it re-reads localStorage
    setGameResetKey((k) => k + 1);
    setMailboxRefreshToken((v) => v + 1);
    // 9. Close modal + go to game
    setShowSaveLoad(false);
    setActivePage('game');
  }, []);

  // New game: wipe all persisted state and restart
  const handleNewGame = useCallback(() => {
    clearEngineGameState();
    const blank: ManagerSummary = { status: 'INEXPERIENCED', level: 1, successes: 0, successiveWins: 0, successiveLosses: 0, totalWins: 0, totalLosses: 0, totalDraws: 0 };
    saveManagerSummary(blank);
    setSummary(null);
    saveStoredMatchFeed([]);
    setEvents([]);
    setGameResetKey((k) => k + 1);
    setMailboxRefreshToken((v) => v + 1);
    setShowSaveLoad(false);
    setActivePage('game');
  }, []);

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
      .then((res) => {
        setSummary((prev) => {
          const next = pickMostAdvancedSummary(prev, res.data);
          saveManagerSummary(next);
          return next;
        });
      })
      .catch(() => { /* use localStorage fallback loaded in useState initializer */ });

    socket.connect();
    socket.on('match:update', (payload: { events: MatchEvent[] }) => {
      setEvents(payload.events);
      saveStoredMatchFeed(payload.events);
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

  /** Build standings from the local game state saved in localStorage */
  const buildGameStateStandings = (): { rows: StandingRow[]; leagueName: string } | null => {
    const gs = loadGameState();
    if (!gs) return null;
    // Find the league that contains the active club
    const league = activeClub?.leagueId
      ? gs.leagues[activeClub.leagueId]
      : Object.values(gs.leagues).find((l) =>
          l.standings.some((s) => s.teamId === activeClub?.id || s.teamName === activeClub?.name)
        );
    if (!league?.standings?.length) return null;
    const rows: StandingRow[] = league.standings.map((s, i) => ({
      position: i + 1,
      clubId: s.teamId,
      clubName: s.teamName,
      played: s.played,
      won: s.won,
      drawn: s.drawn,
      lost: s.lost,
      goalsFor: s.gf,
      goalsAgainst: s.ga,
      goalDiff: s.gd,
      points: s.points,
      updatedAt: null,
    }));
    return { rows, leagueName: league.name };
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

    // Always try local game state first — it has the real up-to-date results
    const gsResult = buildGameStateStandings();
    if (gsResult) {
      setStandingsDivisionName(gsResult.leagueName);
      setStandingsRows(gsResult.rows);
      setStandingsLoading(false);
      return;
    }

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



  const setPlayerPosition = (playerId: string, role: string) => {
    setPositionOverrides((prev) => {
      const next = { ...prev, [playerId]: role };
      if (activeClubId) savePositionOverrides(activeClubId, next);
      return next;
    });
  };

  const setBulkPlayerStatuses = useCallback((updates: SquadBulkUpdate[]) => {
    if (updates.length === 0) return;
    setSquadStatuses((prev) => {
      const next = { ...prev };
      let startersCount = Object.values(next).filter((s) => s === 'STARTER').length;
      let benchCount = Object.values(next).filter((s) => s === 'BENCH').length;

      for (const update of updates) {
        const current = next[update.playerId] ?? 'EXCLUDED';
        const target = update.status;
        if (current === target) continue;

        if (target === 'STARTER' && startersCount >= MAX_STARTERS) continue;
        if (target === 'BENCH' && benchCount >= MAX_BENCH) continue;

        if (current === 'STARTER') startersCount -= 1;
        if (current === 'BENCH') benchCount -= 1;
        if (target === 'STARTER') startersCount += 1;
        if (target === 'BENCH') benchCount += 1;

        next[update.playerId] = target;
      }

      if (activeClubId) saveSquadStatuses(activeClubId, next);
      return next;
    });
  }, [activeClubId]);

  const autoSelectByTacticFormation = useCallback((tactic: FullTactic) => {
    if (!tactic || squadPlayers.length === 0) return;

    const ranked = [...squadPlayers].sort((left, right) => getOverall(right) - getOverall(left));
    const used = new Set<string>();
    const starterIds: string[] = [];
    const nextOverrides: Record<string, string> = { ...positionOverrides };

    for (const slot of tactic.slots.slice(0, MAX_STARTERS)) {
      const wanted = SLOT_ROLE_PREFERENCES[slot.id] ?? [];
      const match = ranked.find((player) => {
        if (used.has(player.id)) return false;
        const effectiveRole = normalizeRoleKey(positionOverrides[player.id] ?? player.role);
        return wanted.includes(effectiveRole);
      });
      if (!match) continue;
      used.add(match.id);
      starterIds.push(match.id);
      if (wanted.length > 0) nextOverrides[match.id] = wanted[0];
    }

    for (const player of ranked) {
      if (starterIds.length >= MAX_STARTERS) break;
      if (used.has(player.id)) continue;
      used.add(player.id);
      starterIds.push(player.id);
    }

    const benchIds: string[] = [];
    for (const player of ranked) {
      if (benchIds.length >= MAX_BENCH) break;
      if (used.has(player.id)) continue;
      used.add(player.id);
      benchIds.push(player.id);
    }

    const updates: SquadBulkUpdate[] = ranked.map((player) => ({
      playerId: player.id,
      status: starterIds.includes(player.id)
        ? 'STARTER'
        : benchIds.includes(player.id)
          ? 'BENCH'
          : 'EXCLUDED',
    }));

    setBulkPlayerStatuses(updates);
    setPositionOverrides(nextOverrides);
    if (activeClubId) savePositionOverrides(activeClubId, nextOverrides);
  }, [activeClubId, positionOverrides, setBulkPlayerStatuses, squadPlayers]);

  const setPlayerStatus = (playerId: string, status: SquadStatus) => {
    setBulkPlayerStatuses([{ playerId, status }]);
  };

  const handleUiFontSizeChange = useCallback((value: number) => {
    const next = Math.min(20, Math.max(10, Math.round(value)));
    setUiFontSizePt(next);
    saveUiFontSizePt(next);
  }, []);

  const mainStyle = {
    '--tm-base-font-size': `${uiFontSizePt}pt`,
  } as CSSProperties;

  return (
    <main
      className="tm-font-root min-h-screen bg-[#1a1e2b] p-3 text-[#d4f6a7] md:p-6 lg:p-8"
      style={mainStyle}
    >
      <section className="mx-auto w-[min(96vw,1720px)] border-4 border-[#6f4ca1] bg-[#2a8a2b] shadow-[0_0_0_4px_#120d1f]">
        <header className="flex flex-col gap-3 border-b-4 border-[#6f4ca1] bg-black px-4 py-3 text-[#ebe25f] md:flex-row md:items-center md:justify-between">
          <h1 className="flex items-center gap-2 text-base font-black uppercase tracking-wide sm:gap-3 sm:text-xl md:tracking-widest lg:text-2xl"><ClubCrest clubName={activeClub.name} size={36} />{activeClub.name}</h1>
          <div className="flex flex-wrap items-center gap-2">
            <button
              className="border border-[#98ca7a] bg-[#1a3a1e] px-2 py-1 text-xs font-bold uppercase text-[#98ca7a] hover:bg-[#2a8a2b]"
              onClick={() => { setSaveLoadMode('load'); setShowSaveLoad(true); }}
              type="button"
              title="Spel laden"
            >
              📂 Laden
            </button>
            <button
              className="border border-[#efe56b] bg-[#1a3a1e] px-2 py-1 text-xs font-bold uppercase text-[#efe56b] hover:bg-[#2a8a2b]"
              onClick={() => { setSaveLoadMode('save'); setShowSaveLoad(true); }}
              type="button"
              title="Spel opslaan"
            >
              💾 Opslaan
            </button>
            <button
              className="border-2 border-[#ebe25f] bg-[#2a8a2b] px-3 py-1 text-sm font-bold uppercase"
              onClick={() => setActivePage('game')}
              type="button"
            >
              Play Next Match
            </button>
          </div>
        </header>

        <div className="grid gap-4 p-4 lg:grid-cols-[250px_minmax(0,1fr)_340px]">
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

          <section className="min-w-0">
            <div className="mb-3 grid grid-cols-4 gap-2 text-center text-sm uppercase text-[#2e1f4a]">
              {topTabs.map((item) => (
                <button
                  className={`border p-2.5 font-bold ${
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
              clubs={clubs}
              page={activePage}
              squadPlayers={squadPlayers}
              squadLoading={squadLoading}
              squadError={squadError}
              squadSearch={squadSearch}
              squadRoleFilter={squadRoleFilter}
              squadSortBy={squadSortBy}
              squadStatuses={squadStatuses}
              positionOverrides={positionOverrides}
              summary={summary}
              onSquadSearchChange={setSquadSearch}
              onSquadRoleFilterChange={setSquadRoleFilter}
              onSquadSortChange={setSquadSortBy}
              onSquadStatusChange={setPlayerStatus}
              onBulkSquadStatusChange={setBulkPlayerStatuses}
              onAutoSelectFromTactic={autoSelectByTacticFormation}
              onPositionChange={setPlayerPosition}
              onClubChange={(id) => setActiveClubId(id)}
              onMatchResult={handleMatchResult}
              onMatchEvents={handleMatchEvents}
              onGameWeekAdvance={handleGameWeekAdvance}
              gameResetKey={gameResetKey}
              mailboxRefreshToken={mailboxRefreshToken}
              uiFontSizePt={uiFontSizePt}
              onUiFontSizeChange={handleUiFontSizeChange}
            />

            {error ? (
              <p className="mt-3 border border-[#98ca7a] bg-[#256d22] px-2 py-1 text-sm text-[#d5f8b6]">{error}</p>
            ) : null}
          </section>

          <div>
            <RightSidebar summary={summary} events={events} clubs={clubs} activeClub={activeClub} squadPlayers={squadPlayers} />
          </div>
        </div>

        {/* Save/Load Modal */}
        {showSaveLoad && (
          <SaveLoadModal
            mode={saveLoadMode}
            activeClub={activeClub}
            summary={summary}
            squadStatuses={squadStatuses}
            positionOverrides={positionOverrides}
            events={events}
            onClose={() => setShowSaveLoad(false)}
            onLoad={handleLoadSlot}
            onNewGame={handleNewGame}
          />
        )}

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
