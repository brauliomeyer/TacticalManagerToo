import { useState, useMemo, useCallback } from 'react';

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

type ManagerType = 'AI' | 'Human';
type Difficulty = 'easy' | 'medium' | 'hard';
type ExperienceLevel = 'Beginner' | 'Intermediate' | 'Experienced';
type FilterKey = 'all' | 'AI' | 'Human';
type LeagueFilter = 'all' | string;
type DifficultyFilter = 'all' | Difficulty;
type FlowStep = 'idle' | 'create' | 'select_club' | 'confirm' | 'done';

interface ManagerStats {
  wins: number;
  draws: number;
  losses: number;
}

interface Manager {
  id: string;
  name: string;
  clubId?: string;
  clubName?: string;
  league: string;
  type: ManagerType;
  reputation: number;
  nationality: string;
  experience: ExperienceLevel;
  tacticalStyle: string;
  stats: ManagerStats;
  position?: number;
  recentForm?: string;
}

interface ClubOption {
  id: string;
  name: string;
  league: string;
  position: number;
  budget: number;
  difficulty: Difficulty;
  managerId?: string;
  managerName?: string;
}

interface ManagerPageProps {
  activeClub: Club;
  clubs: Club[];
  onClubChange?: (clubId: string) => void;
}

/* ══════════════════════════════════════════════
   Seeded random helpers
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

function pick<T>(arr: T[], seed: number): T {
  return arr[Math.floor(sr(seed) * arr.length)];
}

/* ══════════════════════════════════════════════
   Mock data generators
   ══════════════════════════════════════════════ */

/* ── Real manager data per club ── */

const REAL_MANAGERS: Record<string, { name: string; nationality: string; style: string }> = {
  // Championship
  'AFC Bournemouth':          { name: 'Jason Tindall',        nationality: 'English',     style: 'Balanced' },
  'Barnsley FC':              { name: 'Valérien Ismaël',      nationality: 'French',      style: 'High press' },
  'Birmingham City FC':       { name: 'Lee Bowyer',           nationality: 'English',     style: 'Direct' },
  'Blackburn Rovers FC':      { name: 'Tony Mowbray',         nationality: 'English',     style: 'Possession-based' },
  'Brentford FC':             { name: 'Thomas Frank',         nationality: 'Danish',      style: 'High press' },
  'Bristol City FC':          { name: 'Nigel Pearson',        nationality: 'English',     style: 'Defensive' },
  'Cardiff City FC':          { name: 'Mick McCarthy',        nationality: 'English',     style: 'Direct' },
  'Coventry City FC':         { name: 'Mark Robins',          nationality: 'English',     style: 'Counter-attack' },
  'Derby County FC':          { name: 'Wayne Rooney',         nationality: 'English',     style: 'Balanced' },
  'Huddersfield Town AFC':    { name: 'Carlos Corberán',      nationality: 'Spanish',     style: 'Possession-based' },
  'Luton Town FC':            { name: 'Nathan Jones',         nationality: 'Welsh',       style: 'High press' },
  'Middlesbrough FC':         { name: 'Neil Warnock',         nationality: 'English',     style: 'Direct' },
  'Millwall FC':              { name: 'Gary Rowett',          nationality: 'English',     style: 'Defensive' },
  'Norwich City FC':          { name: 'Daniel Farke',         nationality: 'German',      style: 'Possession-based' },
  'Nottingham Forest FC':     { name: 'Chris Hughton',        nationality: 'Irish',       style: 'Defensive' },
  'Preston North End FC':     { name: 'Alex Neil',            nationality: 'Scottish',    style: 'Counter-attack' },
  'Queens Park Rangers FC':   { name: 'Mark Warburton',       nationality: 'English',     style: 'Possession-based' },
  'Reading FC':               { name: 'Veljko Paunović',      nationality: 'Serbian',     style: 'Balanced' },
  'Rotherham United FC':      { name: 'Paul Warne',           nationality: 'English',     style: 'Direct' },
  'Sheffield Wednesday FC':   { name: 'Darren Moore',         nationality: 'English',     style: 'Balanced' },
  'Stoke City FC':            { name: "Michael O'Neill",      nationality: 'Northern Irish', style: 'Defensive' },
  'Swansea City FC':          { name: 'Steve Cooper',         nationality: 'English',     style: 'Possession-based' },
  'Watford FC':               { name: 'Xisco Muñoz',         nationality: 'Spanish',     style: 'Counter-attack' },
  'Wycombe Wanderers FC':     { name: 'Gareth Ainsworth',     nationality: 'English',     style: 'Route one' },

  // League One
  'AFC Wimbledon':            { name: 'Mark Robinson',        nationality: 'English',     style: 'Balanced' },
  'Accrington Stanley FC':    { name: 'John Coleman',         nationality: 'English',     style: 'Direct' },
  'Blackpool FC':             { name: 'Neil Critchley',       nationality: 'English',     style: 'Possession-based' },
  'Bristol Rovers FC':        { name: 'Joey Barton',          nationality: 'English',     style: 'High press' },
  'Burton Albion FC':         { name: 'Jimmy Floyd Hasselbaink', nationality: 'Dutch',    style: 'Counter-attack' },
  'Charlton Athletic FC':     { name: 'Nigel Adkins',         nationality: 'English',     style: 'Balanced' },
  'Crewe Alexandra FC':       { name: 'David Artell',         nationality: 'English',     style: 'Possession-based' },
  'Doncaster Rovers FC':      { name: 'Andy Butler',          nationality: 'English',     style: 'Balanced' },
  'Fleetwood Town FC':        { name: 'Simon Grayson',        nationality: 'English',     style: 'Direct' },
  'Gillingham FC':            { name: 'Steve Evans',          nationality: 'Scottish',    style: 'Direct' },
  'Hull City AFC':            { name: 'Grant McCann',         nationality: 'Northern Irish', style: 'Balanced' },
  'Ipswich Town FC':          { name: 'Paul Cook',            nationality: 'English',     style: 'Possession-based' },
  'Lincoln City FC':          { name: 'Michael Appleton',     nationality: 'English',     style: 'Balanced' },
  'Milton Keynes Dons FC':    { name: 'Russell Martin',       nationality: 'Scottish',    style: 'Possession-based' },
  'Northampton Town FC':      { name: 'Jon Brady',            nationality: 'Australian',  style: 'Counter-attack' },
  'Oxford United FC':         { name: 'Karl Robinson',        nationality: 'English',     style: 'Balanced' },
  'Peterborough United FC':   { name: 'Darren Ferguson',      nationality: 'Scottish',    style: 'Counter-attack' },
  'Plymouth Argyle FC':       { name: 'Ryan Lowe',            nationality: 'English',     style: 'High press' },
  'Portsmouth FC':            { name: 'Danny Cowley',         nationality: 'English',     style: 'High press' },
  'Rochdale AFC':             { name: 'Robbie Stockdale',     nationality: 'English',     style: 'Balanced' },
  'Shrewsbury Town FC':       { name: 'Steve Cotterill',      nationality: 'English',     style: 'Defensive' },
  'Sunderland AFC':           { name: 'Lee Johnson',          nationality: 'English',     style: 'Counter-attack' },
  'Swindon Town FC':          { name: 'John McGreal',         nationality: 'English',     style: 'Direct' },
  'Wigan Athletic FC':        { name: 'Leam Richardson',      nationality: 'English',     style: 'Balanced' },

  // League Two
  'Barrow AFC':               { name: 'David Dunn',           nationality: 'English',     style: 'Balanced' },
  'Bolton Wanderers FC':      { name: 'Ian Evatt',            nationality: 'English',     style: 'Possession-based' },
  'Bradford City AFC':        { name: 'Stuart McCall',        nationality: 'Scottish',    style: 'Direct' },
  'Cambridge United FC':      { name: 'Mark Bonner',          nationality: 'English',     style: 'Balanced' },
  'Carlisle United FC':       { name: 'Chris Beech',          nationality: 'English',     style: 'Direct' },
  'Cheltenham Town FC':       { name: 'Michael Duff',         nationality: 'Northern Irish', style: 'Balanced' },
  'Colchester United FC':     { name: 'Hayden Mullins',       nationality: 'English',     style: 'Balanced' },
  'Crawley Town FC':          { name: 'John Yems',            nationality: 'English',     style: 'Defensive' },
  'Exeter City FC':           { name: 'Matt Taylor',          nationality: 'English',     style: 'Balanced' },
  'Forest Green Rovers FC':   { name: 'Rob Edwards',          nationality: 'Welsh',       style: 'Possession-based' },
  'Grimsby Town FC':          { name: 'Paul Hurst',           nationality: 'English',     style: 'Direct' },
  'Harrogate Town AFC':       { name: 'Simon Weaver',         nationality: 'English',     style: 'Counter-attack' },
  'Leyton Orient FC':         { name: 'Ross Embleton',        nationality: 'English',     style: 'Balanced' },
  'Mansfield Town FC':        { name: 'Nigel Clough',         nationality: 'English',     style: 'Counter-attack' },
  'Morecambe FC':             { name: 'Stephen Robinson',     nationality: 'Northern Irish', style: 'Balanced' },
  'Newport County AFC':       { name: 'Michael Flynn',        nationality: 'Welsh',       style: 'Counter-attack' },
  'Oldham Athletic AFC':      { name: 'Keith Curle',          nationality: 'English',     style: 'Defensive' },
  'Port Vale FC':             { name: 'Darrell Clarke',       nationality: 'English',     style: 'Direct' },
  'Salford City FC':          { name: 'Richie Wellens',       nationality: 'English',     style: 'Balanced' },
  'Scunthorpe United FC':     { name: 'Neil Cox',             nationality: 'English',     style: 'Direct' },
  'Southend United FC':       { name: 'Phil Brown',           nationality: 'English',     style: 'Defensive' },
  'Stevenage FC':             { name: 'Alex Revell',          nationality: 'English',     style: 'Balanced' },
  'Tranmere Rovers FC':       { name: 'Keith Hill',           nationality: 'English',     style: 'Direct' },
  'Walsall FC':               { name: 'Darrell Clarke',       nationality: 'English',     style: 'Direct' },

  // Premier League
  'Arsenal':                  { name: 'Mikel Arteta',         nationality: 'Spanish',     style: 'Possession-based' },
  'Aston Villa':              { name: 'Dean Smith',           nationality: 'English',     style: 'Counter-attack' },
  'Brighton':                 { name: 'Graham Potter',        nationality: 'English',     style: 'Possession-based' },
  'Burnley':                  { name: 'Sean Dyche',           nationality: 'English',     style: 'Direct' },
  'Chelsea':                  { name: 'Thomas Tuchel',        nationality: 'German',      style: 'Possession-based' },
  'Crystal Palace':           { name: 'Patrick Vieira',       nationality: 'French',      style: 'Balanced' },
  'Everton':                  { name: 'Rafael Benítez',       nationality: 'Spanish',     style: 'Defensive' },
  'Fulham':                   { name: 'Marco Silva',          nationality: 'Portuguese',  style: 'Possession-based' },
  'Leeds United':             { name: 'Marcelo Bielsa',       nationality: 'Argentine',   style: 'High press' },
  'Leicester City':           { name: 'Brendan Rodgers',      nationality: 'Northern Irish', style: 'Possession-based' },
  'Liverpool':                { name: 'Jürgen Klopp',         nationality: 'German',      style: 'Gegenpressing' },
  'Manchester City':          { name: 'Pep Guardiola',        nationality: 'Spanish',     style: 'Tiki-taka' },
  'Manchester Utd':           { name: 'Ole Gunnar Solskjær',  nationality: 'Norwegian',   style: 'Counter-attack' },
  'Newcastle Utd':            { name: 'Steve Bruce',          nationality: 'English',     style: 'Defensive' },
  'Sheffield Utd':            { name: 'Chris Wilder',         nationality: 'English',     style: 'Overlapping CBs' },
  'Southampton':              { name: 'Ralph Hasenhüttl',     nationality: 'Austrian',    style: 'High press' },
  'Tottenham':                { name: 'Nuno Espírito Santo',  nationality: 'Portuguese',  style: 'Counter-attack' },
  'West Brom':                { name: 'Sam Allardyce',        nationality: 'English',     style: 'Direct' },
  'West Ham':                 { name: 'David Moyes',          nationality: 'Scottish',    style: 'Balanced' },
  'Wolves':                   { name: 'Bruno Lage',           nationality: 'Portuguese',  style: 'Counter-attack' },
};

const NATIONALITIES = [
  'English', 'Scottish', 'Welsh', 'Irish', 'Northern Irish', 'Spanish', 'Italian', 'German',
  'French', 'Portuguese', 'Dutch', 'Argentine', 'Brazilian', 'Danish', 'Serbian',
  'Austrian', 'Norwegian', 'Australian',
];

const TACTICAL_STYLES = [
  'Possession-based', 'Counter-attack', 'High press', 'Defensive', 'Balanced',
  'Wing play', 'Direct', 'Tiki-taka', 'Gegenpressing', 'Catenaccio',
  'Total football', 'Route one', 'Fluid attack', 'Park the bus', 'Overlapping CBs',
];

const RECENT_FORMS = ['WWWDL', 'WDWLW', 'LLWDW', 'DWWWW', 'LDLWW', 'WLWLW', 'DDDWL', 'WWLWW', 'LLLDW', 'WDWWL'];

function getDifficulty(club: Club): Difficulty {
  if (club.reputation >= 70) return 'hard';
  if (club.reputation >= 40) return 'medium';
  return 'easy';
}

function generateAIManagers(clubs: Club[]): Manager[] {
  return clubs.map((club) => {
    const seed = hs(club.id + club.name);
    const real = REAL_MANAGERS[club.name];
    const name = real?.name ?? `Manager of ${club.name}`;
    const nationality = real?.nationality ?? 'English';
    const style = real?.style ?? pick(TACTICAL_STYLES, seed + 9);
    const rep = Math.min(99, Math.max(15, club.reputation + Math.floor(sr(seed + 3) * 20) - 10));
    const totalGames = 20 + Math.floor(sr(seed + 4) * 30);
    const wins = Math.floor(totalGames * (0.2 + sr(seed + 5) * 0.5));
    const draws = Math.floor((totalGames - wins) * (0.2 + sr(seed + 6) * 0.3));
    const losses = totalGames - wins - draws;
    const position = 1 + Math.floor(sr(seed + 7) * 24);

    return {
      id: `mgr-${club.id}`,
      name,
      clubId: club.id,
      clubName: club.name,
      league: club.leagueName ?? 'Championship',
      type: 'AI' as ManagerType,
      reputation: rep,
      nationality,
      experience: rep >= 70 ? 'Experienced' : rep >= 40 ? 'Intermediate' : 'Beginner',
      tacticalStyle: style,
      stats: { wins, draws, losses },
      position,
      recentForm: pick(RECENT_FORMS, seed + 10),
    };
  });
}

function generateClubOptions(clubs: Club[], managers: Manager[]): ClubOption[] {
  return clubs.map((club) => {
    const seed = hs(club.id);
    const mgr = managers.find((m) => m.clubId === club.id);
    return {
      id: club.id,
      name: club.name,
      league: club.leagueName ?? 'Championship',
      position: 1 + Math.floor(sr(seed + 20) * 24),
      budget: club.budget,
      difficulty: getDifficulty(club),
      managerId: mgr?.id,
      managerName: mgr?.name,
    };
  });
}

/* ══════════════════════════════════════════════
   Sub-components
   ══════════════════════════════════════════════ */

function TypeBadge({ type }: { type: ManagerType }) {
  return (
    <span className={`rounded px-1.5 py-0.5 text-[9px] font-black uppercase ${
      type === 'Human' ? 'bg-[#1d4ed8] text-white' : 'bg-[#6b21a8] text-white'
    }`}>
      {type === 'Human' ? '👤 Human' : '🤖 AI'}
    </span>
  );
}

function DiffBadge({ diff }: { diff: Difficulty }) {
  const cfg: Record<Difficulty, { bg: string; label: string }> = {
    easy: { bg: 'bg-[#22c55e] text-[#0a2e0d]', label: 'EASY' },
    medium: { bg: 'bg-[#eab308] text-[#2e1f0a]', label: 'MEDIUM' },
    hard: { bg: 'bg-[#ef4444] text-white', label: 'HARD' },
  };
  const c = cfg[diff];
  return <span className={`${c.bg} rounded px-1.5 py-0.5 text-[9px] font-black uppercase`}>{c.label}</span>;
}

function RepBar({ value }: { value: number }) {
  const pct = Math.min(100, value);
  const color = pct >= 80 ? 'bg-[#22c55e]' : pct >= 60 ? 'bg-[#eab308]' : pct >= 40 ? 'bg-[#f97316]' : 'bg-[#ef4444]';
  return (
    <div className="flex items-center gap-1">
      <div className="h-1.5 w-16 bg-[#1a3a1e] rounded-sm overflow-hidden">
        <div className={`h-full ${color} rounded-sm`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[10px] font-bold text-white">{value}</span>
    </div>
  );
}

function FormDisplay({ form }: { form: string }) {
  return (
    <div className="flex gap-0.5">
      {form.split('').map((ch, i) => {
        const bg = ch === 'W' ? 'bg-[#22c55e]' : ch === 'D' ? 'bg-[#eab308]' : 'bg-[#ef4444]';
        return (
          <span key={i} className={`${bg} inline-flex h-4 w-4 items-center justify-center rounded-sm text-[8px] font-black text-white`}>
            {ch}
          </span>
        );
      })}
    </div>
  );
}

/* ── Manager List (left panel) ── */

function ManagerList({
  managers,
  filter,
  leagueFilter,
  selectedId,
  activeManagerId,
  onFilterChange,
  onLeagueFilterChange,
  onSelect,
}: {
  managers: Manager[];
  filter: FilterKey;
  leagueFilter: LeagueFilter;
  selectedId: string | null;
  activeManagerId: string | null;
  onFilterChange: (f: FilterKey) => void;
  onLeagueFilterChange: (l: LeagueFilter) => void;
  onSelect: (id: string) => void;
}) {
  const leagues = useMemo(() => {
    const set = new Set(managers.map((m) => m.league));
    return ['all', ...Array.from(set).sort()] as LeagueFilter[];
  }, [managers]);

  const filtered = useMemo(() => {
    let list = managers;
    if (filter !== 'all') list = list.filter((m) => m.type === filter);
    if (leagueFilter !== 'all') list = list.filter((m) => m.league === leagueFilter);
    return list.sort((a, b) => {
      if (a.type === 'Human' && b.type !== 'Human') return -1;
      if (b.type === 'Human' && a.type !== 'Human') return 1;
      return a.league.localeCompare(b.league) || b.reputation - a.reputation;
    });
  }, [managers, filter, leagueFilter]);

  return (
    <div className="flex flex-col h-full">
      {/* Filters */}
      <div className="mb-2 space-y-1">
        <div className="flex gap-1">
          {(['all', 'AI', 'Human'] as FilterKey[]).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => onFilterChange(f)}
              className={`flex-1 border px-1 py-0.5 text-[10px] font-bold uppercase ${
                filter === f
                  ? 'border-[#efe56b] bg-[#2a8a2b] text-[#efe56b]'
                  : 'border-[#1a5a1e] bg-[#0d3f10] text-[#98ca7a] hover:bg-[#1a4a1e]'
              }`}
            >
              {f === 'all' ? `All (${managers.length})` : f}
            </button>
          ))}
        </div>
        <select
          value={leagueFilter}
          onChange={(e) => onLeagueFilterChange(e.target.value as LeagueFilter)}
          className="w-full border border-[#2a8a2b] bg-[#0d3f10] px-1 py-0.5 text-[10px] text-[#d5f8b6]"
        >
          {leagues.map((l) => (
            <option key={l} value={l}>{l === 'all' ? 'All Leagues' : l}</option>
          ))}
        </select>
      </div>

      {/* Count */}
      <p className="mb-1 text-[10px] text-[#6b9a5a]">{filtered.length} manager{filtered.length !== 1 ? 's' : ''}</p>

      {/* List */}
      <div className="flex-1 overflow-y-auto max-h-[60vh] border border-[#2a8a2b]">
        {filtered.length === 0 ? (
          <p className="p-3 text-xs italic text-[#6b9a5a]">No managers found.</p>
        ) : (
          filtered.map((mgr) => {
            const isSelected = selectedId === mgr.id;
            const isActive = activeManagerId === mgr.id;
            return (
              <button
                key={mgr.id}
                type="button"
                onClick={() => onSelect(mgr.id)}
                className={`w-full text-left border-b border-[#1a5a1e] px-2 py-1.5 transition-colors ${
                  isActive
                    ? 'bg-[#1d4ed8]/20 border-l-4 border-l-[#efe56b]'
                    : isSelected
                      ? 'bg-[#1a4a1e] border-l-4 border-l-[#22c55e]'
                      : 'hover:bg-[#0d3f10] border-l-4 border-l-transparent'
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className={`text-xs font-bold ${isActive ? 'text-[#efe56b]' : 'text-white'}`}>
                    {mgr.name}
                  </span>
                  <TypeBadge type={mgr.type} />
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] text-[#98ca7a]">{mgr.clubName ?? 'Free Agent'}</span>
                  <span className="text-[10px] text-[#6b9a5a]">•</span>
                  <span className="text-[10px] text-[#6b9a5a]">{mgr.league}</span>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <RepBar value={mgr.reputation} />
                  <span className="text-[10px] text-[#98ca7a]">
                    {mgr.stats.wins}W {mgr.stats.draws}D {mgr.stats.losses}L
                  </span>
                </div>
                {isActive && (
                  <span className="mt-0.5 inline-block text-[9px] font-black text-[#efe56b] uppercase">★ Your Manager</span>
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

/* ── Manager Detail (center panel) ── */

function ManagerDetail({ manager }: { manager: Manager | null }) {
  if (!manager) {
    return (
      <div className="flex h-full items-center justify-center border-2 border-[#2a8a2b] bg-[#0d3f10] p-8">
        <div className="text-center">
          <p className="text-3xl mb-2">👔</p>
          <p className="text-sm text-[#6b9a5a]">Select a manager from the list to view details.</p>
        </div>
      </div>
    );
  }

  const totalGames = manager.stats.wins + manager.stats.draws + manager.stats.losses;
  const winRate = totalGames > 0 ? Math.round((manager.stats.wins / totalGames) * 100) : 0;

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="border-2 border-[#2a8a2b] bg-[#1f641d] px-3 py-2">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-black text-white">{manager.name}</h3>
            <div className="flex items-center gap-2 mt-0.5">
              <TypeBadge type={manager.type} />
              <span className="text-[10px] text-[#98ca7a]">{manager.nationality}</span>
              <span className="text-[10px] text-[#6b9a5a]">•</span>
              <span className="text-[10px] text-[#98ca7a]">{manager.experience}</span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-black text-[#efe56b]">{manager.reputation}</p>
            <p className="text-[10px] text-[#98ca7a]">REPUTATION</p>
          </div>
        </div>
      </div>

      {/* Club Info */}
      <div className="border-2 border-[#2a8a2b] bg-[#0d3f10]">
        <h4 className="border-b-2 border-[#2a8a2b] bg-[#1f641d] px-3 py-1 text-xs font-black uppercase tracking-wider text-[#efe56b]">
          Club Information
        </h4>
        <div className="p-3 space-y-1">
          <div className="flex justify-between border-b border-[#1a5a1e] py-0.5">
            <span className="text-xs text-[#98ca7a]">Club</span>
            <span className="text-xs font-bold text-white">{manager.clubName ?? 'Free Agent'}</span>
          </div>
          <div className="flex justify-between border-b border-[#1a5a1e] py-0.5">
            <span className="text-xs text-[#98ca7a]">League</span>
            <span className="text-xs font-bold text-white">{manager.league}</span>
          </div>
          {manager.position && (
            <div className="flex justify-between border-b border-[#1a5a1e] py-0.5">
              <span className="text-xs text-[#98ca7a]">League Position</span>
              <span className="text-xs font-bold text-white">{manager.position}{ordSuffix(manager.position)}</span>
            </div>
          )}
          <div className="flex justify-between py-0.5">
            <span className="text-xs text-[#98ca7a]">Tactical Style</span>
            <span className="text-xs font-bold text-[#efe56b]">{manager.tacticalStyle}</span>
          </div>
        </div>
      </div>

      {/* Record */}
      <div className="border-2 border-[#2a8a2b] bg-[#0d3f10]">
        <h4 className="border-b-2 border-[#2a8a2b] bg-[#1f641d] px-3 py-1 text-xs font-black uppercase tracking-wider text-[#efe56b]">
          Record &amp; Performance
        </h4>
        <div className="p-3">
          <div className="grid grid-cols-4 gap-1 text-center mb-3">
            <div className="border border-[#2a8a2b] bg-[#1a3a1e] py-1.5">
              <p className="text-[10px] text-[#98ca7a]">Played</p>
              <p className="text-sm font-black text-white">{totalGames}</p>
            </div>
            <div className="border border-[#2a8a2b] bg-[#1a3a1e] py-1.5">
              <p className="text-[10px] text-[#98ca7a]">Wins</p>
              <p className="text-sm font-black text-[#22c55e]">{manager.stats.wins}</p>
            </div>
            <div className="border border-[#2a8a2b] bg-[#1a3a1e] py-1.5">
              <p className="text-[10px] text-[#98ca7a]">Draws</p>
              <p className="text-sm font-black text-[#eab308]">{manager.stats.draws}</p>
            </div>
            <div className="border border-[#2a8a2b] bg-[#1a3a1e] py-1.5">
              <p className="text-[10px] text-[#98ca7a]">Losses</p>
              <p className="text-sm font-black text-[#ef4444]">{manager.stats.losses}</p>
            </div>
          </div>
          <div className="flex justify-between border-b border-[#1a5a1e] py-0.5">
            <span className="text-xs text-[#98ca7a]">Win Rate</span>
            <span className={`text-xs font-bold ${winRate >= 50 ? 'text-[#22c55e]' : winRate >= 30 ? 'text-[#eab308]' : 'text-[#ef4444]'}`}>
              {winRate}%
            </span>
          </div>
          {manager.recentForm && (
            <div className="flex items-center justify-between py-1">
              <span className="text-xs text-[#98ca7a]">Recent Form</span>
              <FormDisplay form={manager.recentForm} />
            </div>
          )}
        </div>
      </div>

      {/* Tactical Preferences */}
      <div className="border-2 border-[#2a8a2b] bg-[#0d3f10]">
        <h4 className="border-b-2 border-[#2a8a2b] bg-[#1f641d] px-3 py-1 text-xs font-black uppercase tracking-wider text-[#efe56b]">
          Tactical Preferences
        </h4>
        <div className="p-3 space-y-1">
          <div className="flex justify-between border-b border-[#1a5a1e] py-0.5">
            <span className="text-xs text-[#98ca7a]">Style</span>
            <span className="text-xs font-bold text-white">{manager.tacticalStyle}</span>
          </div>
          <div className="flex justify-between border-b border-[#1a5a1e] py-0.5">
            <span className="text-xs text-[#98ca7a]">Experience Level</span>
            <span className={`text-xs font-bold ${
              manager.experience === 'Experienced' ? 'text-[#22c55e]' : manager.experience === 'Intermediate' ? 'text-[#eab308]' : 'text-[#f97316]'
            }`}>{manager.experience}</span>
          </div>
          <div className="flex justify-between py-0.5">
            <span className="text-xs text-[#98ca7a]">Nationality</span>
            <span className="text-xs font-bold text-white">{manager.nationality}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Create Manager Form ── */

function CreateManagerForm({
  onCreated,
  existingNames,
}: {
  onCreated: (name: string, nationality: string, experience: ExperienceLevel) => void;
  existingNames: Set<string>;
}) {
  const [name, setName] = useState('');
  const [nationality, setNationality] = useState('English');
  const [experience, setExperience] = useState<ExperienceLevel>('Beginner');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Manager name cannot be empty.');
      return;
    }
    if (trimmed.length < 2) {
      setError('Manager name must be at least 2 characters.');
      return;
    }
    if (trimmed.length > 30) {
      setError('Manager name must be 30 characters or less.');
      return;
    }
    if (existingNames.has(trimmed.toLowerCase())) {
      setError('A manager with this name already exists.');
      return;
    }
    setError(null);
    onCreated(trimmed, nationality, experience);
  };

  const handleReset = () => {
    setName('');
    setNationality('English');
    setExperience('Beginner');
    setError(null);
  };

  return (
    <div className="border-2 border-[#2a8a2b] bg-[#0d3f10]">
      <h4 className="border-b-2 border-[#2a8a2b] bg-[#1f641d] px-3 py-1.5 text-xs font-black uppercase tracking-wider text-[#efe56b]">
        Create Your Manager
      </h4>
      <div className="p-3 space-y-2">
        {/* Name */}
        <div>
          <label className="block text-[10px] font-bold uppercase text-[#98ca7a] mb-0.5">
            Manager Name <span className="text-[#ef4444]">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => { setName(e.target.value); setError(null); }}
            placeholder="Enter your name..."
            maxLength={30}
            className="w-full border border-[#2a8a2b] bg-[#1a3a1e] px-2 py-1 text-xs text-white placeholder-[#6b9a5a] focus:border-[#efe56b] focus:outline-none"
          />
        </div>

        {/* Nationality */}
        <div>
          <label className="block text-[10px] font-bold uppercase text-[#98ca7a] mb-0.5">
            Nationality
          </label>
          <select
            value={nationality}
            onChange={(e) => setNationality(e.target.value)}
            className="w-full border border-[#2a8a2b] bg-[#1a3a1e] px-2 py-1 text-xs text-white"
          >
            {NATIONALITIES.map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>

        {/* Experience */}
        <div>
          <label className="block text-[10px] font-bold uppercase text-[#98ca7a] mb-0.5">
            Experience Level
          </label>
          <div className="flex gap-1">
            {(['Beginner', 'Intermediate', 'Experienced'] as ExperienceLevel[]).map((lvl) => (
              <button
                key={lvl}
                type="button"
                onClick={() => setExperience(lvl)}
                className={`flex-1 border px-1 py-1 text-[10px] font-bold ${
                  experience === lvl
                    ? 'border-[#efe56b] bg-[#2a8a2b] text-[#efe56b]'
                    : 'border-[#1a5a1e] bg-[#0d3f10] text-[#98ca7a] hover:bg-[#1a4a1e]'
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="border border-[#ef4444] bg-[#450a0a] px-2 py-1 text-[10px] text-[#ef4444]">
            ⚠ {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={handleSubmit}
            className="flex-1 border-2 border-[#efe56b] bg-[#2a8a2b] px-2 py-1.5 text-xs font-black uppercase text-[#efe56b] hover:bg-[#1f641d]"
          >
            Create Manager
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="border border-[#98ca7a] bg-[#0d3f10] px-2 py-1.5 text-xs font-bold uppercase text-[#98ca7a] hover:bg-[#1a4a1e]"
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Club Selection Panel ── */

function ClubSelectionPanel({
  clubs,
  leagueFilter,
  difficultyFilter,
  selectedClubId,
  onLeagueFilterChange,
  onDifficultyFilterChange,
  onSelectClub,
  onConfirm,
  onCancel,
}: {
  clubs: ClubOption[];
  leagueFilter: LeagueFilter;
  difficultyFilter: DifficultyFilter;
  selectedClubId: string | null;
  onLeagueFilterChange: (l: LeagueFilter) => void;
  onDifficultyFilterChange: (d: DifficultyFilter) => void;
  onSelectClub: (id: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const leagues = useMemo(() => {
    const set = new Set(clubs.map((c) => c.league));
    return ['all', ...Array.from(set).sort()] as LeagueFilter[];
  }, [clubs]);

  const filtered = useMemo(() => {
    let list = clubs;
    if (leagueFilter !== 'all') list = list.filter((c) => c.league === leagueFilter);
    if (difficultyFilter !== 'all') list = list.filter((c) => c.difficulty === difficultyFilter);
    return list.sort((a, b) => a.league.localeCompare(b.league) || a.name.localeCompare(b.name));
  }, [clubs, leagueFilter, difficultyFilter]);

  const selectedClub = selectedClubId ? clubs.find((c) => c.id === selectedClubId) : null;

  return (
    <div className="border-2 border-[#2a8a2b] bg-[#0d3f10]">
      <h4 className="border-b-2 border-[#2a8a2b] bg-[#1f641d] px-3 py-1.5 text-xs font-black uppercase tracking-wider text-[#efe56b]">
        Choose Your Club
      </h4>
      <div className="p-2 space-y-2">
        {/* Filters */}
        <div className="flex gap-1">
          <select
            value={leagueFilter}
            onChange={(e) => onLeagueFilterChange(e.target.value as LeagueFilter)}
            className="flex-1 border border-[#2a8a2b] bg-[#1a3a1e] px-1 py-0.5 text-[10px] text-[#d5f8b6]"
          >
            {leagues.map((l) => (
              <option key={l} value={l}>{l === 'all' ? 'All Leagues' : l}</option>
            ))}
          </select>
          <select
            value={difficultyFilter}
            onChange={(e) => onDifficultyFilterChange(e.target.value as DifficultyFilter)}
            className="flex-1 border border-[#2a8a2b] bg-[#1a3a1e] px-1 py-0.5 text-[10px] text-[#d5f8b6]"
          >
            <option value="all">All Difficulty</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </div>

        <p className="text-[10px] text-[#6b9a5a]">{filtered.length} club{filtered.length !== 1 ? 's' : ''} available</p>

        {/* Club list */}
        <div className="max-h-[35vh] overflow-y-auto border border-[#1a5a1e]">
          {filtered.map((club) => {
            const isSelected = selectedClubId === club.id;
            return (
              <button
                key={club.id}
                type="button"
                onClick={() => onSelectClub(club.id)}
                className={`w-full text-left border-b border-[#1a5a1e] px-2 py-1.5 transition-colors ${
                  isSelected ? 'bg-[#1a4a1e] border-l-4 border-l-[#efe56b]' : 'hover:bg-[#0d3f10] border-l-4 border-l-transparent'
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="text-xs font-bold text-white">{club.name}</span>
                  <DiffBadge diff={club.difficulty} />
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] text-[#98ca7a]">{club.league}</span>
                  <span className="text-[10px] text-[#6b9a5a]">•</span>
                  <span className="text-[10px] text-[#6b9a5a]">Pos: {club.position}</span>
                  <span className="text-[10px] text-[#6b9a5a]">•</span>
                  <span className="text-[10px] text-[#6b9a5a]">€{(club.budget / 1_000_000).toFixed(1)}M</span>
                </div>
                {club.managerName && (
                  <p className="text-[9px] text-[#6b9a5a] mt-0.5">Current: {club.managerName} (AI)</p>
                )}
              </button>
            );
          })}
        </div>

        {/* Selection confirmation */}
        {selectedClub && (
          <div className="border-2 border-[#efe56b] bg-[#1a3a1e] p-2">
            <p className="text-xs text-[#d5f8b6] mb-1">
              Selected: <strong className="text-white">{selectedClub.name}</strong>
            </p>
            <p className="text-[10px] text-[#98ca7a] mb-2">
              {selectedClub.league} • Budget: €{(selectedClub.budget / 1_000_000).toFixed(1)}M • {selectedClub.difficulty.toUpperCase()}
            </p>
            {selectedClub.managerName && (
              <p className="text-[10px] text-[#eab308] mb-2">
                ⚠ This will replace {selectedClub.managerName} as manager.
              </p>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onConfirm}
                className="flex-1 border-2 border-[#efe56b] bg-[#2a8a2b] px-2 py-1.5 text-xs font-black uppercase text-[#efe56b] hover:bg-[#1f641d]"
              >
                Confirm Selection
              </button>
              <button
                type="button"
                onClick={onCancel}
                className="border border-[#98ca7a] bg-[#0d3f10] px-2 py-1.5 text-xs font-bold uppercase text-[#98ca7a] hover:bg-[#1a4a1e]"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Manager Status Panel (shown when career is active) ── */

function ManagerStatusPanel({
  manager,
  club,
  onResign,
  onSwitchClub,
}: {
  manager: Manager;
  club: ClubOption | null;
  onResign: () => void;
  onSwitchClub: () => void;
}) {
  return (
    <div className="space-y-2">
      <div className="border-2 border-[#efe56b] bg-[#1a3a1e] p-3">
        <h4 className="text-xs font-black uppercase text-[#efe56b] mb-2">Your Career</h4>
        <div className="space-y-1">
          <div className="flex justify-between border-b border-[#1a5a1e] py-0.5">
            <span className="text-xs text-[#98ca7a]">Manager</span>
            <span className="text-xs font-bold text-white">{manager.name}</span>
          </div>
          <div className="flex justify-between border-b border-[#1a5a1e] py-0.5">
            <span className="text-xs text-[#98ca7a]">Club</span>
            <span className="text-xs font-bold text-white">{club?.name ?? 'None'}</span>
          </div>
          <div className="flex justify-between border-b border-[#1a5a1e] py-0.5">
            <span className="text-xs text-[#98ca7a]">League</span>
            <span className="text-xs font-bold text-white">{manager.league}</span>
          </div>
          <div className="flex justify-between border-b border-[#1a5a1e] py-0.5">
            <span className="text-xs text-[#98ca7a]">Reputation</span>
            <RepBar value={manager.reputation} />
          </div>
          <div className="flex justify-between py-0.5">
            <span className="text-xs text-[#98ca7a]">Record</span>
            <span className="text-xs font-bold text-white">{manager.stats.wins}W {manager.stats.draws}D {manager.stats.losses}L</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="space-y-1">
        <button
          type="button"
          onClick={onSwitchClub}
          className="w-full border border-[#eab308] bg-[#2e1f0a] px-2 py-1.5 text-xs font-bold uppercase text-[#eab308] hover:bg-[#3d2a0f]"
        >
          Apply for Another Job
        </button>
        <button
          type="button"
          onClick={onResign}
          className="w-full border border-[#ef4444] bg-[#450a0a] px-2 py-1.5 text-xs font-bold uppercase text-[#ef4444] hover:bg-[#5a0f0f]"
        >
          Resign from Post
        </button>
      </div>
    </div>
  );
}

/* ── Helper ── */

function ordSuffix(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}

/* ══════════════════════════════════════════════
   Main Component
   ══════════════════════════════════════════════ */

export default function ManagerPage({ clubs, onClubChange }: ManagerPageProps) {
  /* ── Core state ── */
  const aiManagers = useMemo<Manager[]>(() => generateAIManagers(clubs), [clubs]);
  const [humanManager, setHumanManager] = useState<Manager | null>(null);
  const [flowStep, setFlowStep] = useState<FlowStep>('idle');

  /* ── List state ── */
  const [filter, setFilter] = useState<FilterKey>('all');
  const [leagueFilter, setLeagueFilter] = useState<LeagueFilter>('all');
  const [selectedManagerId, setSelectedManagerId] = useState<string | null>(null);

  /* ── Club selection state ── */
  const [clubLeagueFilter, setClubLeagueFilter] = useState<LeagueFilter>('all');
  const [clubDiffFilter, setClubDiffFilter] = useState<DifficultyFilter>('all');
  const [selectedClubId, setSelectedClubId] = useState<string | null>(null);

  /* ── Resign confirmation ── */
  const [showResignConfirm, setShowResignConfirm] = useState(false);

  /* ── Derived data ── */
  const allManagers = useMemo<Manager[]>(() => {
    const list = [...aiManagers];
    if (humanManager) {
      // Replace AI manager of human's club
      const idx = list.findIndex((m) => m.clubId === humanManager.clubId);
      if (idx >= 0) list.splice(idx, 1);
      list.unshift(humanManager);
    }
    return list;
  }, [aiManagers, humanManager]);

  const clubOptions = useMemo(() => generateClubOptions(clubs, allManagers), [clubs, allManagers]);

  const selectedManager = useMemo(
    () => allManagers.find((m) => m.id === selectedManagerId) ?? null,
    [allManagers, selectedManagerId],
  );

  const existingNames = useMemo(
    () => new Set(allManagers.map((m) => m.name.toLowerCase())),
    [allManagers],
  );

  const activeManagerId = humanManager?.id ?? null;
  const activeClubOption = humanManager?.clubId
    ? clubOptions.find((c) => c.id === humanManager.clubId) ?? null
    : null;

  /* ── Handlers ── */
  const handleManagerCreated = useCallback((name: string, nationality: string, experience: ExperienceLevel) => {
    const repBase = experience === 'Experienced' ? 55 : experience === 'Intermediate' ? 35 : 15;
    const newMgr: Manager = {
      id: `mgr-human-${Date.now()}`,
      name,
      league: 'Unattached',
      type: 'Human',
      reputation: repBase + Math.floor(Math.random() * 10),
      nationality,
      experience,
      tacticalStyle: 'Balanced',
      stats: { wins: 0, draws: 0, losses: 0 },
      recentForm: '',
    };
    setHumanManager(newMgr);
    setSelectedManagerId(newMgr.id);
    setFlowStep('select_club');
  }, []);

  const handleClubConfirmed = useCallback(() => {
    if (!humanManager || !selectedClubId) return;
    const club = clubs.find((c) => c.id === selectedClubId);
    if (!club) return;

    setHumanManager((prev) => prev ? {
      ...prev,
      clubId: club.id,
      clubName: club.name,
      league: club.leagueName ?? 'Championship',
    } : null);
    setFlowStep('done');
    setSelectedClubId(null);

    // Notify parent to switch active club
    onClubChange?.(club.id);
  }, [humanManager, selectedClubId, clubs, onClubChange]);

  const handleResign = useCallback(() => {
    if (!humanManager) return;
    setHumanManager((prev) => prev ? {
      ...prev,
      clubId: undefined,
      clubName: undefined,
      league: 'Unattached',
    } : null);
    setFlowStep('select_club');
    setShowResignConfirm(false);
  }, [humanManager]);

  const handleSwitchClub = useCallback(() => {
    setFlowStep('select_club');
    setSelectedClubId(null);
    setClubLeagueFilter('all');
    setClubDiffFilter('all');
  }, []);

  const handleStartCareer = useCallback(() => {
    setFlowStep('create');
  }, []);

  /* ── Rendering ── */
  const hasHumanManager = humanManager !== null;
  const hasClub = humanManager?.clubId !== undefined && humanManager?.clubId !== null;

  return (
    <section className="border-4 border-[#6f4ca1] bg-[#16a51c] p-3">
      {/* Title */}
      <h2 className="mb-3 border border-[#ceb8e1] bg-[#d5b5ec] p-2 text-center text-sm font-bold uppercase text-[#2e1f4a]">
        Manager Registry &amp; Career Setup
      </h2>

      {/* 3-column layout */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-[240px_1fr_260px]">
        {/* LEFT: Manager List */}
        <div className="border-2 border-[#2a8a2b] bg-[#0a2e0d] p-2">
          <h3 className="mb-2 text-xs font-black uppercase tracking-wider text-[#efe56b] border-b border-[#2a8a2b] pb-1">
            All Managers ({allManagers.length})
          </h3>
          <ManagerList
            managers={allManagers}
            filter={filter}
            leagueFilter={leagueFilter}
            selectedId={selectedManagerId}
            activeManagerId={activeManagerId}
            onFilterChange={setFilter}
            onLeagueFilterChange={setLeagueFilter}
            onSelect={setSelectedManagerId}
          />
        </div>

        {/* CENTER: Detail View */}
        <div className="min-h-[400px]">
          <ManagerDetail manager={selectedManager} />
        </div>

        {/* RIGHT: Create / Club Select / Status */}
        <div className="border-2 border-[#2a8a2b] bg-[#0a2e0d] p-2 space-y-3">
          <h3 className="text-xs font-black uppercase tracking-wider text-[#efe56b] border-b border-[#2a8a2b] pb-1">
            Career Centre
          </h3>

          {/* No manager created yet — onboarding */}
          {!hasHumanManager && flowStep === 'idle' && (
            <div className="space-y-3">
              <div className="border-2 border-[#eab308] bg-[#2e1f0a] p-3 text-center">
                <p className="text-2xl mb-1">⚽</p>
                <p className="text-xs font-bold text-[#eab308] mb-1">Welcome, Manager!</p>
                <p className="text-[10px] text-[#d5c87a]">
                  Create your manager profile and choose a club to begin your career in English football.
                </p>
              </div>
              <button
                type="button"
                onClick={handleStartCareer}
                className="w-full border-2 border-[#efe56b] bg-[#2a8a2b] px-3 py-2 text-sm font-black uppercase text-[#efe56b] hover:bg-[#1f641d]"
              >
                Start New Career
              </button>
            </div>
          )}

          {/* Create manager form */}
          {!hasHumanManager && flowStep === 'create' && (
            <div className="space-y-2">
              <CreateManagerForm
                onCreated={handleManagerCreated}
                existingNames={existingNames}
              />
              <button
                type="button"
                onClick={() => setFlowStep('idle')}
                className="w-full border border-[#98ca7a] bg-[#0d3f10] px-2 py-1 text-[10px] font-bold uppercase text-[#98ca7a] hover:bg-[#1a4a1e]"
              >
                ← Back
              </button>
            </div>
          )}

          {/* Club selection flow */}
          {hasHumanManager && flowStep === 'select_club' && (
            <ClubSelectionPanel
              clubs={clubOptions}
              leagueFilter={clubLeagueFilter}
              difficultyFilter={clubDiffFilter}
              selectedClubId={selectedClubId}
              onLeagueFilterChange={setClubLeagueFilter}
              onDifficultyFilterChange={setClubDiffFilter}
              onSelectClub={setSelectedClubId}
              onConfirm={handleClubConfirmed}
              onCancel={() => setFlowStep(hasClub ? 'done' : 'idle')}
            />
          )}

          {/* Active career status */}
          {hasHumanManager && hasClub && flowStep === 'done' && (
            <>
              <ManagerStatusPanel
                manager={humanManager!}
                club={activeClubOption}
                onResign={() => setShowResignConfirm(true)}
                onSwitchClub={handleSwitchClub}
              />

              {/* Resign confirmation modal */}
              {showResignConfirm && (
                <div className="border-2 border-[#ef4444] bg-[#450a0a] p-3">
                  <p className="text-xs text-[#ef4444] font-bold mb-2">
                    Are you sure you want to resign from {humanManager!.clubName}?
                  </p>
                  <p className="text-[10px] text-[#d5a0a0] mb-2">
                    You will lose your position and need to find a new club.
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleResign}
                      className="flex-1 border border-[#ef4444] bg-[#5a0f0f] px-2 py-1 text-xs font-bold text-[#ef4444] hover:bg-[#6a1414]"
                    >
                      Yes, Resign
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowResignConfirm(false)}
                      className="flex-1 border border-[#98ca7a] bg-[#0d3f10] px-2 py-1 text-xs font-bold text-[#98ca7a] hover:bg-[#1a4a1e]"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Manager created but no club yet (not in select flow) */}
          {hasHumanManager && !hasClub && flowStep !== 'select_club' && (
            <div className="border-2 border-[#eab308] bg-[#2e1f0a] p-3">
              <p className="text-xs font-bold text-[#eab308] mb-1">Manager Created!</p>
              <p className="text-[10px] text-[#d5c87a] mb-2">
                {humanManager!.name} is ready. Choose a club to start managing.
              </p>
              <button
                type="button"
                onClick={() => setFlowStep('select_club')}
                className="w-full border-2 border-[#efe56b] bg-[#2a8a2b] px-2 py-1.5 text-xs font-black uppercase text-[#efe56b] hover:bg-[#1f641d]"
              >
                Choose a Club
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
