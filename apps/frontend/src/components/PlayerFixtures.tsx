import { useMemo, useState } from 'react';
import { loadGameState } from '../engine/footballEngine';

/* ══════════════════════════════════════════════
   Types
   ══════════════════════════════════════════════ */

interface Club {
  id: string;
  name: string;
  country: string;
  budget: number;
  reputation: number;
  leagueId?: string | null;
  leagueName?: string | null;
}

interface SquadPlayer {
  id: string;
  name: string;
  age: number;
  role: string;
  played: number;
  scored: number;
  caps: number;
  morale: number;
  stamina: number;
  form: number;
  potential: number;
  shooting: number;
  passing: number;
  tackling: number;
  heading: number;
  influence: number;
  attitude: number;
  reliability: number;
}

interface PlayerFixturesProps {
  activeClub: Club;
  clubs: Club[];
  squadPlayers: SquadPlayer[];
}

interface LeaderboardEntry {
  rank: number;
  playerId: string;
  playerName: string;
  clubName: string;
  value: number;
}

type CategoryKey =
  | 'motm'
  | 'penalties'
  | 'shooters'
  | 'cupGoals'
  | 'superSubs'
  | 'hatTricks'
  | 'redCards'
  | 'yellowCards'
  | 'capped'
  | 'assists'
  | 'cleanSheets'
  | 'appearances';

type CompFilter = 'all' | 'league' | 'fa-cup' | 'league-cup' | 'champions-league' | 'europa-league' | 'conference-league';

interface Category {
  key: CategoryKey;
  title: string;
  shortTitle: string;
  unit: string;
}

interface CompetitionOption {
  key: CompFilter;
  label: string;
  short: string;
}

/* ══════════════════════════════════════════════
   Seeded random
   ══════════════════════════════════════════════ */

function sr(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  s = (s * 16807) % 2147483647;
  return (s - 1) / 2147483646;
}

function hs(str: string) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/* ══════════════════════════════════════════════
   Categories
   ══════════════════════════════════════════════ */

const CATEGORIES: Category[] = [
  { key: 'motm', title: 'Men of the Matches', shortTitle: 'Men of the Matches', unit: 'awards' },
  { key: 'penalties', title: 'Penalty Princes', shortTitle: 'Penalties', unit: 'scored' },
  { key: 'shooters', title: 'Super Shooters', shortTitle: 'Goals', unit: 'goals' },
  { key: 'cupGoals', title: 'Cup Scoring Kings', shortTitle: 'Cup Goals', unit: 'goals' },
  { key: 'superSubs', title: 'Super Subs', shortTitle: 'Sub Goals', unit: 'goals' },
  { key: 'hatTricks', title: 'Hat Trick Heroes', shortTitle: 'Hat-tricks', unit: 'hat-tricks' },
  { key: 'redCards', title: 'Red Card Rogues', shortTitle: 'Red Cards', unit: 'cards' },
  { key: 'yellowCards', title: 'Yellow Perils', shortTitle: 'Yellow Cards', unit: 'cards' },
  { key: 'capped', title: 'Capped Counts', shortTitle: 'International Caps', unit: 'caps' },
  { key: 'assists', title: 'Assist Kings', shortTitle: 'Assists', unit: 'assists' },
  { key: 'cleanSheets', title: 'Clean Sheet Masters', shortTitle: 'Clean Sheets', unit: 'sheets' },
  { key: 'appearances', title: 'Appearance Leaders', shortTitle: 'Appearances', unit: 'appearances' },
];

const COMPETITIONS: CompetitionOption[] = [
  { key: 'all', label: 'All Competitions', short: 'All Competitions' },
  { key: 'league', label: 'League', short: 'League' },
  { key: 'fa-cup', label: 'FA Cup', short: 'FA Cup' },
  { key: 'league-cup', label: 'League Cup', short: 'League Cup' },
  { key: 'champions-league', label: 'Champions League', short: 'Champions League' },
  { key: 'europa-league', label: 'Europa League', short: 'Europa League' },
  { key: 'conference-league', label: 'Conference League', short: 'Conference League' },
];

/* ══════════════════════════════════════════════
   Famous player names pool (for non-active clubs)
   ══════════════════════════════════════════════ */

const PLAYER_POOL = [
  'Robson', 'Wilkins', 'Donaghy', 'Thorstvedt', 'Barnes', 'Southall', 'O Leary', 'Moran',
  'Waddle', 'McGrath', 'Rush', 'Walker', 'Aldridge', 'Pearce', 'Houghton', 'Schmeichel',
  'Hoddle', 'Strachan', 'Hughes', 'Beardsley', 'Shearer', 'Le Tissier', 'Cantona', 'Bergkamp',
  'Zola', 'Vieira', 'Keane', 'Giggs', 'Scholes', 'Beckham', 'Gerrard', 'Lampard',
  'Ferdinand', 'Terry', 'Cole', 'Henry', 'Rooney', 'Drogba', 'Torres', 'Aguero',
  'Silva', 'Hazard', 'De Bruyne', 'Salah', 'Kane', 'Son', 'Vardy', 'Mahrez',
  'Sterling', 'Saka', 'Foden', 'Mount', 'Rice', 'Bellingham', 'Palmer', 'Watkins',
  'Lineker', 'Gascoigne', 'Platt', 'Adams', 'Seaman', 'Campbell', 'Owen', 'Fowler',
];

/* ══════════════════════════════════════════════
   Generate leaderboard data — per competition
   ══════════════════════════════════════════════ */

const COMP_CONFIG: Record<Exclude<CompFilter, 'all'>, { mult: number; seedOff: number }> = {
  'league':            { mult: 1.0,  seedOff: 0 },
  'fa-cup':            { mult: 0.3,  seedOff: 1000 },
  'league-cup':        { mult: 0.2,  seedOff: 2000 },
  'champions-league':  { mult: 0.45, seedOff: 3000 },
  'europa-league':     { mult: 0.35, seedOff: 4000 },
  'conference-league': { mult: 0.2,  seedOff: 5000 },
};

/* ──────────────────────────────────────────────
   Internal entry type (before ranking)
   ────────────────────────────────────────────── */
interface RawEntry {
  playerId: string;
  playerName: string;
  clubName: string;
  value: number;
}

/* ──────────────────────────────────────────────
   Data validation: clamp outliers, remove NaN/negatives
   ────────────────────────────────────────────── */
function validateValue(value: number, category: CategoryKey, maxReasonable: number): number {
  if (!Number.isFinite(value) || value < 0) return 0;
  // Cap at a reasonable maximum per category to prevent unrealistic outliers
  return Math.min(value, maxReasonable);
}

const MAX_REASONABLE: Record<CategoryKey, number> = {
  motm: 38,
  penalties: 15,
  shooters: 60,
  cupGoals: 20,
  superSubs: 15,
  hatTricks: 10,
  redCards: 5,
  yellowCards: 20,
  capped: 200,
  assists: 30,
  cleanSheets: 38,
  appearances: 60,
};

/* ──────────────────────────────────────────────
   Compute a single player's value for a category
   ────────────────────────────────────────────── */
function computePlayerValue(
  p: SquadPlayer,
  category: CategoryKey,
  mult: number,
): number {
  const baseSeed = hs(p.id + category);
  let value = 0;

  switch (category) {
    case 'motm':
      value = Math.max(0, Math.round((p.influence * 0.3 + p.form * 0.2 + sr(baseSeed) * 4 - 1) * mult));
      break;
    case 'penalties':
      value = p.role.includes('FORWARD') || p.role.includes('ATTACKING')
        ? Math.round(sr(baseSeed) * 6 * mult)
        : Math.round(sr(baseSeed) * 2 * mult);
      break;
    case 'shooters':
      value = p.scored > 0 ? Math.round(p.scored * mult) : Math.round(p.shooting * 0.4 * sr(baseSeed + 1) * mult);
      break;
    case 'cupGoals':
      value = Math.round((p.scored > 0 ? p.scored * 0.3 : p.shooting * 0.15) * sr(baseSeed + 2) * mult);
      break;
    case 'superSubs':
      value = Math.round(sr(baseSeed) * 4 * (p.attitude > 12 ? 1.5 : 1) * mult);
      break;
    case 'hatTricks':
      value = p.scored >= 8 ? Math.max(0, Math.round((sr(baseSeed) * 3 - 0.5) * mult)) : 0;
      break;
    case 'redCards':
      value = Math.round(sr(baseSeed) * (p.tackling > 14 ? 3 : 1.5) * (p.attitude < 10 ? 1.5 : 0.8) * mult);
      break;
    case 'yellowCards':
      value = Math.round(sr(baseSeed) * (p.tackling > 10 ? 8 : 4) * (p.attitude < 12 ? 1.3 : 0.7) * mult);
      break;
    case 'capped':
      value = p.caps > 0 ? Math.round(p.caps * mult) : Math.round(sr(baseSeed) * 30 * (p.influence > 12 ? 1.5 : 0.5) * mult);
      break;
    case 'assists':
      value = Math.round((p.passing * 0.35 * sr(baseSeed + 3) + p.played * 0.1) * mult);
      break;
    case 'cleanSheets':
      value = p.role === 'GOALKEEPER' || p.role.includes('BACK')
        ? Math.round((sr(baseSeed) * 12 + p.played * 0.2) * mult)
        : 0;
      break;
    case 'appearances':
      value = p.played > 0 ? Math.round(p.played * mult) : Math.round((8 + sr(baseSeed) * 30) * mult);
      break;
  }

  return validateValue(value, category, MAX_REASONABLE[category]);
}

function makeAiPlayerId(clubId: string, index: number): string {
  return `ai_${clubId}_${index}`;
}

function generateCompEntries(
  category: CategoryKey,
  comp: Exclude<CompFilter, 'all'>,
  activeClub: Club,
  clubs: Club[],
  squad: SquadPlayer[],
): RawEntry[] {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let state: any = null;
  try { state = loadGameState(); } catch { /* noop */ }

  const realStats: Record<string, { [player: string]: { [cat: string]: number } }> = {};
  if (state && state.fixtures) {
    for (const fixId in state.fixtures) {
      const fix = state.fixtures[fixId];
      if (!fix.played || !fix.stats) continue;
      if (fix.compId !== comp) continue;

      const homeClub = state.clubs[fix.homeId];
      const awayClub = state.clubs[fix.awayId];
      const homeName = homeClub?.name;
      const awayName = awayClub?.name;

      if (homeName && homeClub) {
        if (!realStats[homeName]) realStats[homeName] = {};
        const homeSquad = state.squads?.[fix.homeId] ?? [];
        if (homeSquad.length > 0) {
          const scorerIdx = Math.floor(sr(hs(fixId + 'home')) * homeSquad.length);
          const scorer = homeSquad[scorerIdx];
          const pName = scorer.name ?? scorer.playerName ?? 'Unknown';
          if (!realStats[homeName][pName]) realStats[homeName][pName] = {};
          realStats[homeName][pName]["appearances"] = (realStats[homeName][pName]["appearances"] || 0) + 1;
          realStats[homeName][pName]["shooters"] = (realStats[homeName][pName]["shooters"] || 0) + fix.homeGoals;
          realStats[homeName][pName]["motm"] = (realStats[homeName][pName]["motm"] || 0) + (fix.stats.shotsOnTarget[0] > fix.stats.shotsOnTarget[1] ? 1 : 0);
        } else {
          for (const p of squad) {
            if (!realStats[homeName][p.name]) realStats[homeName][p.name] = {};
            realStats[homeName][p.name]["appearances"] = (realStats[homeName][p.name]["appearances"] || 0) + 1;
          }
          if (squad.length > 0) {
            const scorerIdx = Math.floor(sr(hs(fixId + 'home')) * squad.length);
            const scorer = squad[scorerIdx];
            realStats[homeName][scorer.name]["shooters"] = (realStats[homeName][scorer.name]["shooters"] || 0) + fix.homeGoals;
          }
        }
      }

      if (awayName && awayClub) {
        if (!realStats[awayName]) realStats[awayName] = {};
        const awaySquad = state.squads?.[fix.awayId] ?? [];
        if (awaySquad.length > 0) {
          const scorerIdx = Math.floor(sr(hs(fixId + 'away')) * awaySquad.length);
          const scorer = awaySquad[scorerIdx];
          const pName = scorer.name ?? scorer.playerName ?? 'Unknown';
          if (!realStats[awayName][pName]) realStats[awayName][pName] = {};
          realStats[awayName][pName]["appearances"] = (realStats[awayName][pName]["appearances"] || 0) + 1;
          realStats[awayName][pName]["shooters"] = (realStats[awayName][pName]["shooters"] || 0) + fix.awayGoals;
          realStats[awayName][pName]["motm"] = (realStats[awayName][pName]["motm"] || 0) + (fix.stats.shotsOnTarget[1] > fix.stats.shotsOnTarget[0] ? 1 : 0);
        } else {
          for (const p of squad) {
            if (!realStats[awayName][p.name]) realStats[awayName][p.name] = {};
            realStats[awayName][p.name]["appearances"] = (realStats[awayName][p.name]["appearances"] || 0) + 1;
          }
          if (squad.length > 0) {
            const scorerIdx = Math.floor(sr(hs(fixId + 'away')) * squad.length);
            const scorer = squad[scorerIdx];
            realStats[awayName][scorer.name]["shooters"] = (realStats[awayName][scorer.name]["shooters"] || 0) + fix.awayGoals;
          }
        }
      }
    }
  }

  const cfg = COMP_CONFIG[comp];
  const m = cfg.mult;
  const entries: RawEntry[] = [];

  for (let i = 0; i < squad.length; i++) {
    const p = squad[i];
    let value = 0;

    if (realStats[activeClub.name]?.[p.name]?.[category] != null) {
      value = realStats[activeClub.name][p.name][category];
    } else {
      value = computePlayerValue(p, category, m);
    }

    if (value > 0) {
      entries.push({ playerId: p.id, playerName: p.name, clubName: activeClub.name, value });
    }
  }

  for (const club of clubs) {
    if (club.id === activeClub.id) continue;
    const clubName = club.name;

    if (realStats[clubName]) {
      for (const playerName in realStats[clubName]) {
        const value = realStats[clubName][playerName][category] || 0;
        if (value > 0) {
          entries.push({ playerId: `ai_${club.id}_${playerName}`, playerName, clubName, value });
        }
      }
    } else {
      const usedNames = new Set<string>();
      for (let i = 0; i < 2; i++) {
        const pSeed = hs(club.id + category) + i * 97 + 500;
        let name = PLAYER_POOL[Math.floor(sr(pSeed) * PLAYER_POOL.length)];
        let attempt = 0;
        while (usedNames.has(name) && attempt < 10) {
          name = PLAYER_POOL[Math.floor(sr(pSeed + attempt + 1) * PLAYER_POOL.length)];
          attempt++;
        }
        usedNames.add(name);

        let value = 0;
        switch (category) {
          case 'motm': value = Math.round((1 + sr(pSeed + 2) * 8) * m); break;
          case 'penalties': value = Math.round(sr(pSeed + 2) * 8 * m); break;
          case 'shooters': value = Math.round((1 + sr(pSeed + 2) * 25) * m); break;
          case 'cupGoals': value = Math.round(sr(pSeed + 2) * 10 * m); break;
          case 'superSubs': value = Math.round(sr(pSeed + 2) * 6 * m); break;
          case 'hatTricks': value = Math.round(sr(pSeed + 2) * 4 * m); break;
          case 'redCards': value = Math.round(sr(pSeed + 2) * 4 * m); break;
          case 'yellowCards': value = Math.round((1 + sr(pSeed + 2) * 12) * m); break;
          case 'capped': value = Math.round((10 + sr(pSeed + 2) * 80) * m); break;
          case 'assists': value = Math.round((1 + sr(pSeed + 2) * 15) * m); break;
          case 'cleanSheets': value = Math.round(sr(pSeed + 2) * 15 * m); break;
          case 'appearances': value = Math.round((10 + sr(pSeed + 2) * 35) * m); break;
        }
        value = validateValue(value, category, MAX_REASONABLE[category]);

        if (value > 0) {
          entries.push({
            playerId: makeAiPlayerId(club.id, i),
            playerName: name,
            clubName,
            value,
          });
        }
      }
    }
  }

  return entries;
}

const SINGLE_COMPS: Exclude<CompFilter, 'all'>[] = ['league', 'fa-cup', 'league-cup', 'champions-league', 'europa-league', 'conference-league'];

function dedupeLeaderboardEntries(entries: RawEntry[]): RawEntry[] {
  const map = new Map<string, RawEntry>();
  for (const entry of entries) {
    const key = entry.playerId;
    const existing = map.get(key);
    if (!existing || entry.value > existing.value) {
      map.set(key, { ...entry });
    }
  }
  return Array.from(map.values());
}

function generateLeaderboard(
  category: CategoryKey,
  comp: CompFilter,
  activeClub: Club,
  clubs: Club[],
  squad: SquadPlayer[],
): LeaderboardEntry[] {
  let raw: RawEntry[];

  if (comp === 'all') {
    const merged = new Map<string, RawEntry>();
    for (const c of SINGLE_COMPS) {
      for (const entry of generateCompEntries(category, c, activeClub, clubs, squad)) {
        const existing = merged.get(entry.playerId);
        if (existing) {
          existing.value += entry.value;
        } else {
          merged.set(entry.playerId, { ...entry });
        }
      }
    }
    raw = Array.from(merged.values());
  } else {
    raw = generateCompEntries(category, comp, activeClub, clubs, squad);
  }

  raw = dedupeLeaderboardEntries(raw);

  raw.sort((a, b) => b.value - a.value);
  return raw.slice(0, 20).map((e, idx) => ({
    rank: idx + 1,
    playerId: e.playerId,
    playerName: e.playerName,
    clubName: e.clubName,
    value: e.value,
  }));
}

/* ══════════════════════════════════════════════
   Sub-components
   ══════════════════════════════════════════════ */

function CategoryMenu({ categories, selected, onSelect }: {
  categories: Category[];
  selected: CategoryKey;
  onSelect: (key: CategoryKey) => void;
}) {
  return (
    <div className="border-2 border-[#2a8a2b] bg-[#0d3f10] p-2">
      <div className="space-y-0.5">
        {categories.map((cat) => (
          <button
            key={cat.key}
            type="button"
            onClick={() => onSelect(cat.key)}
            className={`block w-full text-left px-3 py-1.5 text-sm font-black uppercase tracking-wide transition-colors ${
              selected === cat.key
                ? 'bg-[#2a8a2b] text-[#00e5ff]'
                : 'text-[#00e5ff] hover:bg-[#1a4a1e]'
            }`}
            style={{ fontFamily: '"Press Start 2P", "Courier New", monospace' }}
          >
            {cat.title}
          </button>
        ))}
      </div>
    </div>
  );
}

function LeaderboardTable({ category, entries, clubName }: {
  category: Category;
  entries: LeaderboardEntry[];
  clubName: string;
}) {
  return (
    <div className="border-2 border-[#2a8a2b] bg-[#0d3f10]">
      <h3
        className="border-b-2 border-[#2a8a2b] bg-[#0a2e0d] px-4 py-3 text-lg font-black uppercase text-[#00e5ff]"
        style={{ fontFamily: '"Press Start 2P", "Courier New", monospace' }}
      >
        {category.title}
      </h3>
      <div className="p-2">
        <table className="w-full">
          <thead>
            <tr className="border-b-2 border-[#2a8a2b]">
              <th className="py-1 text-left text-[10px] font-bold uppercase text-[#efe56b] w-8">#</th>
              <th className="py-1 text-left text-[10px] font-bold uppercase text-[#efe56b]">Player</th>
              <th className="py-1 text-left text-[10px] font-bold uppercase text-[#efe56b]">Club</th>
              <th className="py-1 text-right text-[10px] font-bold uppercase text-[#efe56b] w-16">{category.unit}</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => {
              const isOwnClub = entry.clubName === clubName;
              return (
                <tr
                  key={`${entry.rank}-${entry.playerName}`}
                  className={`border-b border-[#1a5a1e] ${isOwnClub ? 'bg-[#1a4a1e]' : ''}`}
                >
                  <td className="py-1 px-1 text-xs text-[#6b9a5a] font-mono">{entry.rank}</td>
                  <td className="py-1 px-1">
                    <span
                      className={`text-xs font-bold uppercase ${isOwnClub ? 'text-[#efe56b]' : 'text-[#d5f8b6]'}`}
                      style={{ fontFamily: '"Courier New", monospace', letterSpacing: '0.05em' }}
                    >
                      {entry.playerName}
                    </span>
                  </td>
                  <td className="py-1 px-1">
                    <span
                      className={`text-xs uppercase ${isOwnClub ? 'text-[#efe56b]' : 'text-[#98ca7a]'}`}
                      style={{ fontFamily: '"Courier New", monospace', letterSpacing: '0.05em' }}
                    >
                      {entry.clubName}
                    </span>
                  </td>
                  <td className="py-1 px-1 text-right">
                    <span className="text-xs font-black text-white font-mono">{entry.value}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ClubSummaryBar({ club, squad, allData }: {
  club: Club;
  squad: SquadPlayer[];
  allData: Map<CategoryKey, LeaderboardEntry[]>;
}) {
  const clubInTop = CATEGORIES.map((cat) => {
    const data = allData.get(cat.key) ?? [];
    return { title: cat.shortTitle, count: data.filter((e) => e.clubName === club.name).length };
  }).filter((c) => c.count > 0);

  const totalGoals = squad.reduce((s, p) => s + p.scored, 0);
  const totalPlayed = Math.max(...squad.map((p) => p.played), 0);
  const totalCaps = squad.reduce((s, p) => s + p.caps, 0);

  return (
    <div className="border-2 border-[#efe56b] bg-[#1a3a1e] px-3 py-2">
      <div className="flex flex-wrap items-center gap-3 text-xs">
        <span className="text-[#98ca7a]">Squad goals: <strong className="text-white">{totalGoals}</strong></span>
        <span className="text-[#98ca7a]">Max apps: <strong className="text-white">{totalPlayed}</strong></span>
        <span className="text-[#98ca7a]">Total caps: <strong className="text-white">{totalCaps}</strong></span>
        <span className="text-[#6b9a5a]">|</span>
        {clubInTop.map((c) => (
          <span key={c.title} className="border border-[#2a8a2b] bg-[#0d3f10] px-1.5 py-0.5 text-[10px] text-[#d5f8b6]">
            {c.title}: <strong className="text-[#efe56b]">{c.count}</strong> in top 20
          </span>
        ))}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════
   Main Component
   ══════════════════════════════════════════════ */

export default function PlayerFixtures({ activeClub, clubs, squadPlayers }: PlayerFixturesProps) {
  const [selectedCategory, setSelectedCategory] = useState<CategoryKey>('shooters');
  const [selectedComp, setSelectedComp] = useState<CompFilter>('all');

  const allData = useMemo(() => {
    const map = new Map<CategoryKey, LeaderboardEntry[]>();
    for (const cat of CATEGORIES) {
      map.set(cat.key, generateLeaderboard(cat.key, selectedComp, activeClub, clubs, squadPlayers));
    }
    return map;
  }, [activeClub, clubs, squadPlayers, selectedComp]);

  const selectedCat = CATEGORIES.find((c) => c.key === selectedCategory)!;
  const entries = allData.get(selectedCategory) ?? [];

  return (
    <section className="border-4 border-[#6f4ca1] bg-[#16a51c] p-3">
      <h2 className="mb-3 border border-[#ceb8e1] bg-[#d5b5ec] p-2 text-center text-sm font-bold uppercase text-[#2e1f4a]">
        Player Fixtures & Records
      </h2>

      <div className="mb-3 flex flex-wrap gap-1 border-2 border-[#2a8a2b] bg-[#0d3f10] p-2">
        {COMPETITIONS.map((comp) => (
          <button
            key={comp.key}
            type="button"
            onClick={() => setSelectedComp(comp.key)}
            className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-wide transition-colors ${
              selectedComp === comp.key
                ? 'bg-[#2a8a2b] text-[#efe56b] border border-[#efe56b]'
                : 'text-[#00e5ff] hover:bg-[#1a4a1e] border border-transparent'
            }`}
            style={{ fontFamily: '"Press Start 2P", "Courier New", monospace' }}
          >
            {comp.short}
          </button>
        ))}
        <span className="ml-auto self-center text-[9px] text-[#6b9a5a] italic">
          {COMPETITIONS.find((c) => c.key === selectedComp)?.label}
        </span>
      </div>

      <div className="mb-3">
        <ClubSummaryBar club={activeClub} squad={squadPlayers} allData={allData} />
      </div>

      <div className="flex items-center mb-3">
        <h2 className="flex-1 border border-[#ceb8e1] bg-[#d5b5ec] p-2 text-center text-sm font-bold uppercase text-[#2e1f4a]">
          All Categories — Top 3
        </h2>
        <button
          className="ml-2 px-3 py-1 text-[10px] font-bold uppercase border border-[#2a8a2b] bg-[#0d3f10] text-[#efe56b] hover:bg-[#1a4a1e]"
          style={{ fontFamily: 'Courier New, monospace' }}
          onClick={() => { window.localStorage.clear(); window.location.reload(); }}
        >
          Reset
        </button>
      </div>
      <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {CATEGORIES.map((cat) => {
          const catEntries = allData.get(cat.key) ?? [];
          const top3 = catEntries.slice(0, 3);
          return (
            <button
              key={cat.key}
              type="button"
              onClick={() => setSelectedCategory(cat.key)}
              className={`w-full text-left border-2 p-2 transition-colors ${
                selectedCategory === cat.key
                  ? 'border-[#efe56b] bg-[#1a4a1e]'
                  : 'border-[#2a8a2b] bg-[#0d3f10] hover:bg-[#1a4a1e]'
              }`}
            >
              <h4
                className="text-[10px] font-black uppercase text-[#00e5ff] mb-1"
                style={{ fontFamily: '"Press Start 2P", "Courier New", monospace' }}
              >
                {cat.title}
              </h4>
              {top3.map((e) => (
                <div key={`${e.rank}-${e.playerName}`} className="flex justify-between text-[10px]">
                  <span className={e.clubName === activeClub.name ? 'text-[#efe56b] font-bold' : 'text-[#d5f8b6]'}>
                    {e.rank}. {e.playerName} <span className="text-[#98ca7a]">({e.clubName})</span>
                  </span>
                  <span className="text-white font-mono font-bold">{e.value}</span>
                </div>
              ))}
              {top3.length === 0 && (
                <p className="text-[9px] italic text-[#6b9a5a]">No data yet</p>
              )}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-[240px_1fr]">
        <CategoryMenu categories={CATEGORIES} selected={selectedCategory} onSelect={setSelectedCategory} />
        <LeaderboardTable category={selectedCat} entries={entries} clubName={activeClub.name} />
      </div>
    </section>
  );
}
