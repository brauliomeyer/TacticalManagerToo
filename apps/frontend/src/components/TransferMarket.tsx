import { useEffect, useMemo, useState, useCallback } from 'react';

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
  pac: number; sho: number; pas: number; dri: number; def: number; phy: number;
  morale: number;
  stamina: number;
  form: number;
  potential: number;
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

interface TransferMarketProps {
  activeClub: Club;
  clubs: Club[];
  squadPlayers: SquadPlayer[];
}

type TabKey = 'overview' | 'squad' | 'transfer-list' | 'scout' | 'shortlist' | 'offers' | 'youth';

interface MarketPlayer {
  id: string;
  name: string;
  age: number;
  position: string;
  club: string;
  nationality: string;
  league: string;
  rating: number;
  potential: number;
  value: number;
  wage: number;
  contractYears: number;
  morale: number;
  status: string;
  pace: number;
  shooting: number;
  passing: number;
  defending: number;
  physical: number;
  dribbling: number;
}

interface TransferOffer {
  id: string;
  playerId: string;
  playerName: string;
  fromClub: string;
  toClub: string;
  amount: number;
  type: 'buy' | 'loan';
  status: 'pending' | 'accepted' | 'rejected' | 'counter';
  loanDuration?: number;
  wageSplit?: number;
  buyClause?: number;
  timestamp: number;
}

interface YouthPlayer {
  id: string;
  name: string;
  age: number;
  position: string;
  potential: number;
  development: number;
  trainingFocus: string;
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

/* ══════════════════════════════════════════════
   Constants
   ══════════════════════════════════════════════ */

const TABS: { key: TabKey; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'squad', label: 'Squad' },
  { key: 'transfer-list', label: 'Transfer List' },
  { key: 'scout', label: 'Scout Search' },
  { key: 'shortlist', label: 'Shortlist' },
  { key: 'offers', label: 'Offers' },
  { key: 'youth', label: 'Youth Academy' },
];

const POSITIONS = ['GK', 'CB', 'LB', 'RB', 'DM', 'CM', 'AM', 'LW', 'RW', 'CF', 'ST'];
const NATIONALITIES = [
  'England', 'France', 'Spain', 'Germany', 'Italy', 'Brazil', 'Argentina',
  'Netherlands', 'Portugal', 'Belgium', 'Croatia', 'Nigeria', 'Colombia',
  'Denmark', 'Sweden', 'Norway', 'Scotland', 'Wales', 'Ireland', 'Japan',
  'China', 'South Korea', 'Australia', 'USA', 'Mexico', 'Uruguay', 'Chile',
  'Peru', 'Ecuador', 'Paraguay', 'Venezuela', 'Ghana', 'Senegal', 'Morocco',
  'Egypt', 'South Africa', 'Cameroon', 'Ivory Coast', 'Tunisia', 'Algeria',
  'Serbia', 'Poland', 'Czech Republic', 'Turkey', 'Saudi Arabia', 'Qatar',
];
const LEAGUES = [
  'Premier League', 'Championship', 'La Liga', 'Serie A', 'Bundesliga',
  'Ligue 1', 'Eredivisie', 'Primeira Liga', 'Scottish Premier', 'MLS',
  'Brasileirao Serie A', 'Argentine Primera', 'Liga MX', 'Uruguayan Primera',
  'Chilean Primera', 'Colombian Primera A', 'Peruvian Liga 1', 'J1 League',
  'Chinese Super League', 'K League 1', 'A-League', 'Egyptian Premier League',
  'South African Premiership', 'Moroccan Botola', 'Tunisian Ligue 1',
  'Saudi Pro League', 'Qatar Stars League',
];

const FIRST_NAMES = [
  'James', 'Oliver', 'Lucas', 'Mason', 'Ethan', 'Noah', 'Leo', 'Samuel',
  'Ryan', 'Jacob', 'Marcus', 'Daniel', 'Alex', 'Harry', 'Tom', 'Jack',
  'Luis', 'André', 'Diego', 'Carlos', 'Pierre', 'Marco', 'Stefan', 'Ivan',
  'Kenji', 'Youssef', 'Kwame', 'Patrick', 'Connor', 'Finn', 'Oscar', 'Rafael',
];

const LAST_NAMES = [
  'Walker', 'Brown', 'Wilson', 'Davies', 'Roberts', 'King', 'Scott', 'Taylor',
  'Harris', 'Baker', 'Green', 'Adams', 'Nelson', 'Moore', 'Thompson', 'White',
  'Silva', 'Santos', 'Martinez', 'Lopez', 'Müller', 'Schmidt', 'Rossi', 'Bianchi',
  'Fernandez', 'Garcia', 'Petrov', 'Jansen', 'Nielsen', 'Svensson', 'Tanaka', 'Diallo',
];

const CLUB_NAMES = [
  'Man United', 'Arsenal', 'Chelsea', 'Liverpool', 'Man City', 'Tottenham', 'Newcastle',
  'West Ham', 'Aston Villa', 'Everton', 'Leeds United', 'Sheffield Wednesday', 'Nottingham Forest',
  'Blackburn Rovers', 'QPR', 'Crystal Palace', 'Brighton', 'Wolves', 'Leicester', 'Southampton',
  'Fulham', 'Brentford', 'Bournemouth', 'Burnley', 'Sheffield United', 'Sunderland',
  'Real Madrid', 'Barcelona', 'Bayern Munich', 'Juventus', 'PSG', 'Ajax',
  'Benfica', 'Porto', 'Celtic', 'Rangers', 'Feyenoord', 'Dortmund',
  'AC Milan', 'Inter Milan', 'Atletico Madrid', 'Sevilla', 'Lyon', 'Monaco',
];

const YOUTH_FIRST = [
  'Jayden', 'Kai', 'Liam', 'Reuben', 'Zane', 'Byron', 'Che', 'Harvey',
  'Kian', 'Ollie', 'Myles', 'Archie', 'Toby', 'Ellis', 'Jude', 'Rohan',
];

const TRAINING_FOCUSES = ['General', 'Attacking', 'Defending', 'Physical', 'Technical', 'Tactical'];

type RegionFilter = 'ALL' | 'Europe' | 'South America' | 'Africa' | 'Asia';

const NATIONALITY_REGION: Record<string, Exclude<RegionFilter, 'ALL'>> = {
  England: 'Europe', France: 'Europe', Spain: 'Europe', Germany: 'Europe', Italy: 'Europe',
  Netherlands: 'Europe', Portugal: 'Europe', Belgium: 'Europe', Croatia: 'Europe', Denmark: 'Europe',
  Sweden: 'Europe', Norway: 'Europe', Scotland: 'Europe', Wales: 'Europe', Ireland: 'Europe',
  Serbia: 'Europe', Poland: 'Europe', 'Czech Republic': 'Europe',
  Brazil: 'South America', Argentina: 'South America', Colombia: 'South America', Uruguay: 'South America',
  Chile: 'South America', Peru: 'South America', Ecuador: 'South America', Paraguay: 'South America', Venezuela: 'South America',
  Nigeria: 'Africa', Ghana: 'Africa', Senegal: 'Africa', Morocco: 'Africa', Egypt: 'Africa',
  'South Africa': 'Africa', Cameroon: 'Africa', 'Ivory Coast': 'Africa', Tunisia: 'Africa', Algeria: 'Africa',
  Japan: 'Asia', China: 'Asia', 'South Korea': 'Asia', Turkey: 'Asia', 'Saudi Arabia': 'Asia', Qatar: 'Asia',
};

function getRegionForNationality(nationality: string): Exclude<RegionFilter, 'ALL'> {
  return NATIONALITY_REGION[nationality] ?? 'Europe';
}

function uniqueName(base: string, used: Set<string>, seed: number): string {
  if (!used.has(base)) {
    used.add(base);
    return base;
  }
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  for (let i = 0; i < alphabet.length; i++) {
    const tagged = `${base} ${alphabet[(seed + i) % alphabet.length]}.`;
    if (!used.has(tagged)) {
      used.add(tagged);
      return tagged;
    }
  }
  let suffix = 2;
  while (used.has(`${base} ${suffix}`)) {
    suffix += 1;
  }
  const fallback = `${base} ${suffix}`;
  used.add(fallback);
  return fallback;
}

function dedupeByKey<T>(items: T[], getKey: (item: T) => string): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const item of items) {
    const key = getKey(item);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

/* ══════════════════════════════════════════════
   Data generators
   ══════════════════════════════════════════════ */

function generateMarketPlayers(clubId: string, count: number, clubs: Club[]): MarketPlayer[] {
  const players: MarketPlayer[] = [];
  const usedNames = new Set<string>();
  const baseSeed = hs(clubId + 'market');
  const knownClubs = clubs.filter((c) => c.id !== clubId);

  for (let i = 0; i < count; i++) {
    const seed = baseSeed + i * 137;
    const age = 17 + Math.floor(sr(seed) * 20);
    const rating = Math.round(45 + sr(seed + 1) * 45);
    const pot = Math.round(Math.min(99, rating + sr(seed + 2) * 25));
    const posIdx = Math.floor(sr(seed + 3) * POSITIONS.length);
    const natIdx = Math.floor(sr(seed + 4) * NATIONALITIES.length);
    const lgIdx = Math.floor(sr(seed + 5) * LEAGUES.length);
    const fnIdx = Math.floor(sr(seed + 6) * FIRST_NAMES.length);
    const lnIdx = Math.floor(sr(seed + 7) * LAST_NAMES.length);
    const clIdx = Math.floor(sr(seed + 8) * CLUB_NAMES.length);
    const knownClub = knownClubs.length > 0 ? knownClubs[Math.floor(sr(seed + 30) * knownClubs.length)] : null;
    const useKnownClub = knownClub && sr(seed + 31) > 0.45;
    const leagueName = useKnownClub && knownClub?.leagueName ? knownClub.leagueName : LEAGUES[lgIdx];
    const clubName = useKnownClub ? knownClub!.name : CLUB_NAMES[clIdx];
    const nationality = useKnownClub && knownClub?.country ? knownClub.country : NATIONALITIES[natIdx];
    const baseVal = rating * rating * 800 + (pot - rating) * 50000;
    const ageFactor = age < 23 ? 1.4 : age < 28 ? 1.2 : age < 32 ? 0.8 : 0.4;

    const baseName = `${FIRST_NAMES[fnIdx]} ${LAST_NAMES[lnIdx]}`;
    const name = uniqueName(baseName, usedNames, seed + 60);

    players.push({
      id: `mp-${i}-${seed}`,
      name,
      age,
      position: POSITIONS[posIdx],
      club: clubName,
      nationality,
      league: leagueName,
      rating,
      potential: pot,
      value: Math.round(baseVal * ageFactor / 1000) * 1000,
      wage: Math.round((rating * 250 + sr(seed + 9) * 15000) / 100) * 100,
      contractYears: 1 + Math.floor(sr(seed + 10) * 5),
      morale: Math.round(50 + sr(seed + 11) * 50),
      status: sr(seed + 12) > 0.85 ? 'Unsettled' : sr(seed + 12) > 0.7 ? 'Wanting Away' : 'Happy',
      pace: Math.round(40 + sr(seed + 20) * 55),
      shooting: Math.round(40 + sr(seed + 21) * 55),
      passing: Math.round(40 + sr(seed + 22) * 55),
      defending: Math.round(40 + sr(seed + 23) * 55),
      physical: Math.round(40 + sr(seed + 24) * 55),
      dribbling: Math.round(40 + sr(seed + 25) * 55),
    });
  }

  return players;
}

function generateYouthPlayers(clubId: string): YouthPlayer[] {
  const seed = hs(clubId + 'youth');
  const count = 8 + Math.floor(sr(seed) * 6);
  const players: YouthPlayer[] = [];
  const usedNames = new Set<string>();

  for (let i = 0; i < count; i++) {
    const pSeed = seed + i * 73;
    const fnIdx = Math.floor(sr(pSeed) * YOUTH_FIRST.length);
    const lnIdx = Math.floor(sr(pSeed + 1) * LAST_NAMES.length);
    const posIdx = Math.floor(sr(pSeed + 2) * POSITIONS.length);
    const focIdx = Math.floor(sr(pSeed + 5) * TRAINING_FOCUSES.length);

    const baseName = `${YOUTH_FIRST[fnIdx]} ${LAST_NAMES[lnIdx]}`;
    const name = uniqueName(baseName, usedNames, pSeed + 21);

    players.push({
      id: `yp-${i}-${pSeed}`,
      name,
      age: 15 + Math.floor(sr(pSeed + 3) * 4),
      position: POSITIONS[posIdx],
      potential: Math.round(55 + sr(pSeed + 4) * 40),
      development: Math.round(sr(pSeed + 6) * 100),
      trainingFocus: TRAINING_FOCUSES[focIdx],
    });
  }

  return players;
}

/* ══════════════════════════════════════════════
   Format helpers
   ══════════════════════════════════════════════ */

function fmtMoney(n: number): string {
  if (n >= 1_000_000) return `£${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `£${(n / 1_000).toFixed(0)}K`;
  return `£${n}`;
}

function fmtWage(n: number): string {
  return `£${(n / 1000).toFixed(1)}K/w`;
}

function youthScoutRating(p: YouthPlayer): number {
  return Math.round(p.potential * 0.7 + p.development * 0.3);
}

/* ══════════════════════════════════════════════
   Retro styling helpers
   ══════════════════════════════════════════════ */

const RETRO = '"Press Start 2P", "Courier New", monospace';
const MONO = '"Courier New", monospace';

function Btn({ children, active, onClick, disabled, className = '' }: {
  children: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`px-2 py-1 text-[10px] font-black uppercase tracking-wide transition-colors border ${
        disabled
          ? 'border-[#333] bg-[#1a1a1a] text-[#555] cursor-not-allowed'
          : active
            ? 'bg-[#2a8a2b] text-[#efe56b] border-[#efe56b]'
            : 'text-[#00e5ff] hover:bg-[#1a4a1e] border-[#2a8a2b] bg-[#0d3f10]'
      } ${className}`}
      style={{ fontFamily: RETRO }}
    >
      {children}
    </button>
  );
}

function ActionBtn({ children, onClick, variant = 'green' }: {
  children: React.ReactNode;
  onClick: () => void;
  variant?: 'green' | 'red' | 'blue' | 'yellow';
}) {
  const colors = {
    green: 'bg-[#1a6a1e] hover:bg-[#2a8a2b] text-[#d5f8b6] border-[#2a8a2b]',
    red: 'bg-[#6a1a1a] hover:bg-[#8a2a2a] text-[#f8b6b6] border-[#8a2a2a]',
    blue: 'bg-[#1a1a6a] hover:bg-[#2a2a8a] text-[#b6d5f8] border-[#2a2a8a]',
    yellow: 'bg-[#4a3a0a] hover:bg-[#6a5a1a] text-[#efe56b] border-[#6a5a1a]',
  };
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-2 py-1 text-[9px] font-bold uppercase border transition-colors ${colors[variant]}`}
      style={{ fontFamily: MONO, letterSpacing: '0.05em' }}
    >
      {children}
    </button>
  );
}

/* ══════════════════════════════════════════════
   Budget Panel (always visible)
   ══════════════════════════════════════════════ */

function BudgetPanel({ club, squad, offers, windowOpen, windowDays }: {
  club: Club;
  squad: SquadPlayer[];
  offers: TransferOffer[];
  windowOpen: boolean;
  windowDays: number;
}) {
  const transferBudget = club.budget;
  const totalWage = squad.reduce((s, p) => {
    const w = Math.round(p.shooting * 250 + p.passing * 200 + p.influence * 300);
    return s + w;
  }, 0);
  const wageBudget = Math.round(transferBudget * 0.12);
  const incoming = offers.filter((o) => o.toClub === club.name && o.status === 'pending').length;
  const outgoing = offers.filter((o) => o.fromClub === club.name && o.status === 'pending').length;

  return (
    <div className="border-2 border-[#efe56b] bg-[#1a3a1e] px-3 py-2 mb-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
        <span className="text-[#98ca7a]">Transfer Budget: <strong className="text-white">{fmtMoney(transferBudget)}</strong></span>
        <span className="text-[#98ca7a]">Wage Budget: <strong className="text-white">{fmtWage(wageBudget)}</strong></span>
        <span className="text-[#98ca7a]">Wage Spend: <strong className="text-white">{fmtWage(totalWage)}</strong></span>
        <span className="text-[#98ca7a]">Remaining: <strong className={transferBudget > 0 ? 'text-[#2a8a2b]' : 'text-[#ff4444]'}>{fmtMoney(transferBudget)}</strong></span>
        <span className="text-[#6b9a5a]">|</span>
        <span className={`border px-1.5 py-0.5 text-[10px] font-bold ${windowOpen ? 'border-[#2a8a2b] bg-[#0d3f10] text-[#2a8a2b]' : 'border-[#8a2a2a] bg-[#3f100d] text-[#ff4444]'}`}>
          Window: {windowOpen ? 'OPEN' : 'CLOSED'}
        </span>
        {windowOpen && (
          <span className="text-[10px] text-[#efe56b]">{windowDays} days left</span>
        )}
        <span className="text-[#6b9a5a]">|</span>
        <span className="text-[10px] text-[#d5f8b6]">Squad: <strong className="text-white">{squad.length}</strong></span>
        <span className="text-[10px] text-[#d5f8b6]">Incoming: <strong className="text-[#efe56b]">{incoming}</strong></span>
        <span className="text-[10px] text-[#d5f8b6]">Outgoing: <strong className="text-[#00e5ff]">{outgoing}</strong></span>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════
   Overview Tab
   ══════════════════════════════════════════════ */

function OverviewTab({ club, squad, offers, marketPlayers, shortlist, youthPlayers, windowOpen, windowDays, setTab }: {
  club: Club;
  squad: SquadPlayer[];
  offers: TransferOffer[];
  marketPlayers: MarketPlayer[];
  shortlist: MarketPlayer[];
  youthPlayers: YouthPlayer[];
  windowOpen: boolean;
  windowDays: number;
  setTab: (t: TabKey) => void;
}) {
  const pending = offers.filter((o) => o.status === 'pending');
  const accepted = offers.filter((o) => o.status === 'accepted');
  const totalWage = squad.reduce((s, p) => s + Math.round(p.shooting * 250 + p.passing * 200 + p.influence * 300), 0);
  const avgAge = squad.length > 0 ? (squad.reduce((s, p) => s + p.age, 0) / squad.length).toFixed(1) : '0';
  const avgRat = squad.length > 0 ? (squad.reduce((s, p) => s + (p.pac + p.sho + p.pas + p.dri + p.def + p.phy) / 6, 0) / squad.length).toFixed(0) : '0';

  const cards: { label: string; value: string | number; sub?: string; tab?: TabKey; color?: string }[] = [
    { label: 'Transfer Budget', value: fmtMoney(club.budget), sub: 'Available to spend', color: 'text-[#2a8a2b]' },
    { label: 'Weekly Wages', value: fmtWage(totalWage), sub: `Budget: ${fmtWage(Math.round(club.budget * 0.12))}` },
    { label: 'Squad Size', value: squad.length, sub: 'First team players', tab: 'squad' },
    { label: 'Average Age', value: avgAge, sub: 'First team' },
    { label: 'Average Rating', value: avgRat, sub: 'Overall squad level' },
    { label: 'Pending Offers', value: pending.length, sub: `${accepted.length} accepted`, tab: 'offers', color: pending.length > 0 ? 'text-[#efe56b]' : undefined },
    { label: 'Shortlisted', value: shortlist.length, sub: 'Scouted targets', tab: 'shortlist' },
    { label: 'Youth Players', value: youthPlayers.length, sub: 'Academy prospects', tab: 'youth' },
    { label: 'Transfer Window', value: windowOpen ? 'OPEN' : 'CLOSED', sub: windowOpen ? `${windowDays} days remaining` : 'Transfers disabled', color: windowOpen ? 'text-[#2a8a2b]' : 'text-[#ff4444]' },
    { label: 'Market Players', value: marketPlayers.length, sub: 'Available worldwide', tab: 'scout' },
  ];

  return (
    <div>
      <h3 className="mb-2 text-sm font-black uppercase text-[#00e5ff]" style={{ fontFamily: RETRO }}>
        Transfer Overview
      </h3>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {cards.map((c) => (
          <button
            key={c.label}
            type="button"
            onClick={() => c.tab && setTab(c.tab)}
            className={`text-left border-2 border-[#2a8a2b] bg-[#0d3f10] p-2 transition-colors ${c.tab ? 'hover:bg-[#1a4a1e] cursor-pointer' : 'cursor-default'}`}
          >
            <div className="text-[9px] uppercase text-[#6b9a5a] mb-0.5" style={{ fontFamily: MONO }}>{c.label}</div>
            <div className={`text-sm font-black ${c.color ?? 'text-white'}`} style={{ fontFamily: MONO }}>{c.value}</div>
            {c.sub && <div className="text-[10px] text-[#5a8a4a] mt-0.5">{c.sub}</div>}
          </button>
        ))}
      </div>

      {!windowOpen && (
        <div className="mt-3 border-2 border-[#8a2a2a] bg-[#3f100d] px-3 py-2 text-center text-xs text-[#ff4444] font-bold uppercase">
          The transfer window is currently closed. You cannot make or accept transfer offers.
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════
   Squad Tab
   ══════════════════════════════════════════════ */

function SquadTab({ squad, windowOpen, onSell, onLoan, onList, onRenew, onNotForSale, onSelect }: {
  club: Club;
  squad: SquadPlayer[];
  windowOpen: boolean;
  onSell: (p: SquadPlayer) => void;
  onLoan: (p: SquadPlayer) => void;
  onList: (p: SquadPlayer) => void;
  onRenew: (p: SquadPlayer) => void;
  onNotForSale: (p: SquadPlayer) => void;
  onSelect: (p: SquadPlayer) => void;
}) {

  const thCls = 'py-1 px-1 text-left text-[9px] font-bold uppercase text-[#efe56b] cursor-pointer hover:text-white select-none';
  // All state/logic comes from props now
  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <h3 className="text-sm font-black uppercase text-[#00e5ff]" style={{ fontFamily: RETRO }}>
          First Team Squad
        </h3>
        <div className="flex gap-1 ml-auto">
          <Btn active={roleFilter === 'ALL'} onClick={() => onRoleFilter('ALL')}>All</Btn>
          {roles.map((r) => (
            <Btn key={r} active={roleFilter === r} onClick={() => onRoleFilter(r)}>{r}</Btn>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap gap-2 mb-2">
        <input
          type="text"
          className="border border-[#2a8a2b] bg-[#0d3f10] text-xs px-2 py-1 rounded text-[#efe56b] placeholder-[#6b9a5a]"
          placeholder="Filter by name..."
          value={nameFilter}
          onChange={e => onNameFilter(e.target.value)}
          style={{ minWidth: 120 }}
        />
        <select
          className="border border-[#2a8a2b] bg-[#0d3f10] text-xs px-2 py-1 rounded text-[#efe56b]"
          value={roleFilter}
          onChange={e => onRoleFilter(e.target.value)}
        >
          <option value="ALL">All Positions</option>
          {roles.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
      </div>
      <div className="border-2 border-[#2a8a2b] bg-[#0d3f10] overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b-2 border-[#2a8a2b]">
              <th className={thCls} onClick={() => onSort('name')}>
                Player {sortBy === 'name' && (sortDir === 'asc' ? '▲' : '▼')}
              </th>
              <th className={thCls} onClick={() => onSort('role')}>
                Position {sortBy === 'role' && (sortDir === 'asc' ? '▲' : '▼')}
              </th>
              <th className={thCls} onClick={() => onSort('age')}>
                Age {sortBy === 'age' && (sortDir === 'asc' ? '▲' : '▼')}
              </th>
              <th className={thCls} onClick={() => onSort('rating')}>
                Rating {sortBy === 'rating' && (sortDir === 'asc' ? '▲' : '▼')}
              </th>
              <th className={thCls} onClick={() => onSort('potential')}>
                Potential {sortBy === 'potential' && (sortDir === 'asc' ? '▲' : '▼')}
              </th>
              <th className={thCls}>Contract</th>
              <th className={thCls}>Wage</th>
              <th className={thCls} onClick={() => onSort('value')}>
                Value {sortBy === 'value' && (sortDir === 'asc' ? '▲' : '▼')}
              </th>
              <th className={thCls} onClick={() => onSort('morale')}>
                Morale {sortBy === 'morale' && (sortDir === 'asc' ? '▲' : '▼')}
              </th>
              <th className={thCls}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {squad.map((p) => {
              const rating = Math.round((p.pac + p.sho + p.pas + p.dri + p.def + p.phy) / 6);
              const value = Math.round(rating ** 2 * 800);
              const wage = Math.round(p.shooting * 250 + p.passing * 200 + p.influence * 300);
              const contract = 1 + Math.floor(sr(hs(p.id + 'contract')) * 5);
              const moraleLbl = p.morale > 80 ? 'Happy' : p.morale > 50 ? 'Content' : p.morale > 30 ? 'Unhappy' : 'Angry';
              const moraleColor = p.morale > 80 ? 'text-[#2a8a2b]' : p.morale > 50 ? 'text-[#efe56b]' : p.morale > 30 ? 'text-[#ff8844]' : 'text-[#ff4444]';

              return (
                <tr key={p.id} className="border-b border-[#1a5a1e] hover:bg-[#1a4a1e] cursor-pointer" onClick={() => onSelect(p)}>
                  <td className="py-1 px-1">
                    <span className="text-xs font-bold uppercase text-[#d5f8b6]" style={{ fontFamily: MONO }}>{p.name}</span>
                  </td>
                  <td className="py-1 px-1 text-[10px] text-[#00e5ff] uppercase" style={{ fontFamily: MONO }}>{p.role}</td>
                  <td className="py-1 px-1 text-[10px] text-white font-mono">{p.age}</td>
                  <td className="py-1 px-1 text-[10px] text-white font-bold font-mono">{rating}</td>
                  <td className="py-1 px-1 text-[10px] text-[#efe56b] font-mono">{p.potential}</td>
                  <td className="py-1 px-1 text-[10px] text-[#98ca7a] font-mono">{contract} yr</td>
                  <td className="py-1 px-1 text-[10px] text-[#98ca7a] font-mono">{fmtWage(wage)}</td>
                  <td className="py-1 px-1 text-[10px] text-white font-mono">{fmtMoney(value)}</td>
                  <td className={`py-1 px-1 text-[10px] font-bold font-mono ${moraleColor}`}>{moraleLbl}</td>
                  <td className="py-1 px-1" onClick={(e) => e.stopPropagation()}>
                    <div className="flex gap-1 flex-wrap">
                      {windowOpen && <ActionBtn onClick={() => onSell(p)} variant="red">Sell</ActionBtn>}
                      {windowOpen && <ActionBtn onClick={() => onLoan(p)} variant="blue">Loan</ActionBtn>}
                      <ActionBtn onClick={() => onList(p)} variant="yellow">List</ActionBtn>
                      <ActionBtn onClick={() => onRenew(p)} variant="green">Renew</ActionBtn>
                      <ActionBtn onClick={() => onNotForSale(p)}>Not For Sale</ActionBtn>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {squad.length === 0 && (
        <div className="border-2 border-[#2a8a2b] bg-[#0d3f10] p-4 text-center text-xs text-[#6b9a5a] italic">
          No players match the current filter.
        </div>
      )}
    </div>
  );
}
}

/* ══════════════════════════════════════════════
   Transfer List Tab
   ══════════════════════════════════════════════ */

function TransferListTab({ listed, onRemove, onAdjustPrice, onAcceptBid }: {
  listed: { player: SquadPlayer; askingPrice: number; loanAvailable: boolean }[];
  onRemove: (id: string) => void;
  onAdjustPrice: (id: string, delta: number) => void;
  onAcceptBid: (id: string) => void;
}) {
  return (
    <div>
      <h3 className="mb-2 text-sm font-black uppercase text-[#00e5ff]" style={{ fontFamily: RETRO }}>
        Transfer List
      </h3>
      {listed.length === 0 ? (
        <div className="border-2 border-[#2a8a2b] bg-[#0d3f10] p-6 text-center text-xs text-[#6b9a5a] italic">
          No players currently listed for transfer. Use the Squad tab to add players.
        </div>
      ) : (
        <div className="border-2 border-[#2a8a2b] bg-[#0d3f10]">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-[#2a8a2b]">
                <th className="py-1 px-2 text-left text-[9px] font-bold uppercase text-[#efe56b]">Player</th>
                <th className="py-1 px-2 text-left text-[9px] font-bold uppercase text-[#efe56b]">Position</th>
                <th className="py-1 px-2 text-left text-[9px] font-bold uppercase text-[#efe56b]">Age</th>
                <th className="py-1 px-2 text-left text-[9px] font-bold uppercase text-[#efe56b]">Rating</th>
                <th className="py-1 px-2 text-left text-[9px] font-bold uppercase text-[#efe56b]">Asking Price</th>
                <th className="py-1 px-2 text-left text-[9px] font-bold uppercase text-[#efe56b]">Loan</th>
                <th className="py-1 px-2 text-left text-[9px] font-bold uppercase text-[#efe56b]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {listed.map(({ player: p, askingPrice, loanAvailable }) => {
                const rating = Math.round((p.pac + p.sho + p.pas + p.dri + p.def + p.phy) / 6);
                return (
                  <tr key={p.id} className="border-b border-[#1a5a1e]">
                    <td className="py-1 px-2 text-xs font-bold uppercase text-[#d5f8b6]" style={{ fontFamily: MONO }}>{p.name}</td>
                    <td className="py-1 px-2 text-[10px] text-[#00e5ff] uppercase font-mono">{p.role}</td>
                    <td className="py-1 px-2 text-[10px] text-white font-mono">{p.age}</td>
                    <td className="py-1 px-2 text-[10px] text-white font-bold font-mono">{rating}</td>
                    <td className="py-1 px-2 text-[10px] text-[#efe56b] font-bold font-mono">{fmtMoney(askingPrice)}</td>
                    <td className="py-1 px-2 text-[10px] font-mono">{loanAvailable ? <span className="text-[#2a8a2b]">Yes</span> : <span className="text-[#6b9a5a]">No</span>}</td>
                    <td className="py-1 px-2">
                      <div className="flex gap-1">
                        <ActionBtn onClick={() => onAdjustPrice(p.id, 500000)} variant="green">+500K</ActionBtn>
                        <ActionBtn onClick={() => onAdjustPrice(p.id, -500000)} variant="red">-500K</ActionBtn>
                        <ActionBtn onClick={() => onAcceptBid(p.id)} variant="yellow">Accept Bid</ActionBtn>
                        <ActionBtn onClick={() => onRemove(p.id)} variant="red">Remove</ActionBtn>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════
   Scout / Search Tab
   ══════════════════════════════════════════════ */

function ScoutTab({ players, onAddShortlist, onMakeOffer, onRequestLoan, windowOpen, selectedPlayer, onSelect }: {
  players: MarketPlayer[];
  onAddShortlist: (p: MarketPlayer) => void;
  onMakeOffer: (p: MarketPlayer) => void;
  onRequestLoan: (p: MarketPlayer) => void;
  windowOpen: boolean;
  selectedPlayer: MarketPlayer | null;
  onSelect: (p: MarketPlayer | null) => void;
}) {
  const [posFilter, setPosFilter] = useState('ALL');
  const [regionFilter, setRegionFilter] = useState<RegionFilter>('ALL');
  const [natFilter, setNatFilter] = useState('ALL');
  const [leagueFilter, setLeagueFilter] = useState('ALL');
  const [minAge, setMinAge] = useState(15);
  const [maxAge, setMaxAge] = useState(40);
  const [minRating, setMinRating] = useState(40);
  const [maxPrice, setMaxPrice] = useState(999_000_000);
  const [sortBy, setSortBy] = useState<string>('rating');
  const [contractFilter, setContractFilter] = useState('ALL');
  const [top100Only, setTop100Only] = useState(false);

  const availableNationalities = useMemo(
    () => Array.from(new Set(players.map((p) => p.nationality))).sort((a, b) => a.localeCompare(b)),
    [players]
  );
  const availableLeagues = useMemo(
    () => Array.from(new Set(players.map((p) => p.league))).sort((a, b) => a.localeCompare(b)),
    [players]
  );

  const filteredAll = useMemo(() => {
    let list = [...players];
    if (posFilter !== 'ALL') list = list.filter((p) => p.position === posFilter);
    if (regionFilter !== 'ALL') list = list.filter((p) => getRegionForNationality(p.nationality) === regionFilter);
    if (natFilter !== 'ALL') list = list.filter((p) => p.nationality === natFilter);
    if (leagueFilter !== 'ALL') list = list.filter((p) => p.league === leagueFilter);
    if (contractFilter === 'expiring') list = list.filter((p) => p.contractYears <= 1);
    if (contractFilter === 'free') list = list.filter((p) => p.contractYears === 0);
    list = list.filter((p) => p.age >= minAge && p.age <= maxAge);
    list = list.filter((p) => p.rating >= minRating);
    list = list.filter((p) => p.value <= maxPrice);

    switch (sortBy) {
      case 'rating': list.sort((a, b) => b.rating - a.rating); break;
      case 'potential': list.sort((a, b) => b.potential - a.potential); break;
      case 'value': list.sort((a, b) => a.value - b.value); break;
      case 'age': list.sort((a, b) => a.age - b.age); break;
      case 'name': list.sort((a, b) => a.name.localeCompare(b.name)); break;
    }
    return list;
  }, [players, posFilter, regionFilter, natFilter, leagueFilter, contractFilter, minAge, maxAge, minRating, maxPrice, sortBy]);

  const filtered = useMemo(() => {
    if (top100Only) {
      return [...filteredAll].sort((a, b) => b.rating - a.rating).slice(0, 100);
    }
    return filteredAll.slice(0, 50);
  }, [filteredAll, top100Only]);

  const thCls = 'py-1 px-1 text-left text-[9px] font-bold uppercase text-[#efe56b] cursor-pointer hover:text-white';

  useEffect(() => {
    if (filtered.length === 0) {
      if (selectedPlayer) onSelect(null);
      return;
    }
    if (!selectedPlayer || !filtered.some((p) => p.id === selectedPlayer.id)) {
      onSelect(filtered[0]);
    }
  }, [filtered, selectedPlayer, onSelect]);

  const resetFilters = () => {
    setPosFilter('ALL');
    setRegionFilter('ALL');
    setNatFilter('ALL');
    setLeagueFilter('ALL');
    setContractFilter('ALL');
    setMinAge(15);
    setMaxAge(40);
    setMinRating(40);
    setMaxPrice(999_000_000);
    setSortBy('rating');
    setTop100Only(false);
  };

  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-[220px_1fr_280px]">
      {/* Filters panel */}
      <div className="border-2 border-[#2a8a2b] bg-[#0d3f10] p-2 space-y-2">
        <h4 className="text-[10px] font-black uppercase text-[#00e5ff]" style={{ fontFamily: RETRO }}>Filters</h4>
        <ActionBtn onClick={resetFilters} variant="yellow">Reset Filters</ActionBtn>

        <div>
          <label className="block text-[10px] uppercase text-[#6b9a5a] mb-0.5">Position</label>
          <select value={posFilter} onChange={(e) => setPosFilter(e.target.value)} className="w-full bg-[#0a2e0d] border border-[#2a8a2b] text-[#d5f8b6] text-[10px] px-1 py-0.5">
            <option value="ALL">All Positions</option>
            {POSITIONS.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-[10px] uppercase text-[#6b9a5a] mb-0.5">Region</label>
          <select value={regionFilter} onChange={(e) => setRegionFilter(e.target.value as RegionFilter)} className="w-full bg-[#0a2e0d] border border-[#2a8a2b] text-[#d5f8b6] text-[10px] px-1 py-0.5">
            <option value="ALL">All Regions</option>
            <option value="Europe">Europe</option>
            <option value="South America">South America</option>
            <option value="Africa">Africa</option>
            <option value="Asia">Asia</option>
          </select>
        </div>

        <div>
          <label className="block text-[10px] uppercase text-[#6b9a5a] mb-0.5">Nationality</label>
          <select value={natFilter} onChange={(e) => setNatFilter(e.target.value)} className="w-full bg-[#0a2e0d] border border-[#2a8a2b] text-[#d5f8b6] text-[10px] px-1 py-0.5">
            <option value="ALL">All Nationalities</option>
            {availableNationalities.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-[10px] uppercase text-[#6b9a5a] mb-0.5">League</label>
          <select value={leagueFilter} onChange={(e) => setLeagueFilter(e.target.value)} className="w-full bg-[#0a2e0d] border border-[#2a8a2b] text-[#d5f8b6] text-[10px] px-1 py-0.5">
            <option value="ALL">All Leagues</option>
            {availableLeagues.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-[10px] uppercase text-[#6b9a5a] mb-0.5">Contract</label>
          <select value={contractFilter} onChange={(e) => setContractFilter(e.target.value)} className="w-full bg-[#0a2e0d] border border-[#2a8a2b] text-[#d5f8b6] text-[10px] px-1 py-0.5">
            <option value="ALL">Any Contract</option>
            <option value="expiring">Expiring (1 year)</option>
            <option value="free">Free Agent</option>
          </select>
        </div>

        <div>
          <label className="block text-[10px] uppercase text-[#6b9a5a] mb-0.5">Age: {minAge} – {maxAge}</label>
          <div className="flex gap-1">
            <input type="range" min={15} max={40} value={minAge} onChange={(e) => setMinAge(Number(e.target.value))} className="flex-1 accent-[#2a8a2b]" />
            <input type="range" min={15} max={40} value={maxAge} onChange={(e) => setMaxAge(Number(e.target.value))} className="flex-1 accent-[#2a8a2b]" />
          </div>
        </div>

        <div>
          <label className="block text-[10px] uppercase text-[#6b9a5a] mb-0.5">Minimum Rating: {minRating}</label>
          <input type="range" min={40} max={95} value={minRating} onChange={(e) => setMinRating(Number(e.target.value))} className="w-full accent-[#2a8a2b]" />
        </div>

        <div>
          <label className="block text-[10px] uppercase text-[#6b9a5a] mb-0.5">Max Price: {fmtMoney(maxPrice)}</label>
          <input type="range" min={0} max={200_000_000} step={1_000_000} value={maxPrice} onChange={(e) => setMaxPrice(Number(e.target.value))} className="w-full accent-[#2a8a2b]" />
        </div>

        <div>
          <label className="block text-[10px] uppercase text-[#6b9a5a] mb-0.5">Scout Speed</label>
          <button
            type="button"
            onClick={() => setTop100Only((v) => !v)}
            className={`w-full border px-2 py-1 text-[10px] font-bold uppercase ${top100Only ? 'border-[#efe56b] bg-[#4a3a0a] text-[#efe56b]' : 'border-[#2a8a2b] bg-[#0a2e0d] text-[#98ca7a] hover:bg-[#1a4a1e]'}`}
            style={{ fontFamily: MONO }}
          >
            {top100Only ? 'Top 100 by Rating: ON' : 'Top 100 by Rating: OFF'}
          </button>
        </div>

        <div>
          <label className="block text-[10px] uppercase text-[#6b9a5a] mb-0.5">Sort By</label>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="w-full bg-[#0a2e0d] border border-[#2a8a2b] text-[#d5f8b6] text-[10px] px-1 py-0.5">
            <option value="rating">Rating</option>
            <option value="potential">Potential</option>
            <option value="value">Value</option>
            <option value="age">Age</option>
            <option value="name">Name</option>
          </select>
        </div>

        <div className="text-[9px] text-[#5a8a4a] pt-1 border-t border-[#1a5a1e]">
          Showing {filtered.length} of {filteredAll.length} filtered ({players.length} total)
        </div>
      </div>

      {/* Results table */}
      <div className="border-2 border-[#2a8a2b] bg-[#0d3f10] overflow-x-auto">
        {filtered.length > 0 && (
          <div className="border-b border-[#1a5a1e] bg-[#0a2e0d] p-2">
            <div className="mb-1 text-[10px] font-bold uppercase text-[#00e5ff]" style={{ fontFamily: RETRO }}>
              Quick Results
            </div>
            <div className="grid gap-1 sm:grid-cols-2">
              {filtered.slice(0, 10).map((p) => (
                <button
                  key={`quick-${p.id}`}
                  type="button"
                  onClick={() => onSelect(p)}
                  className={`w-full border px-2 py-1 text-left text-[10px] ${selectedPlayer?.id === p.id ? 'border-[#efe56b] bg-[#1a4a1e] text-[#efe56b]' : 'border-[#2a8a2b] bg-[#0d3f10] text-[#d5f8b6] hover:bg-[#1a4a1e]'}`}
                >
                  <span className="font-bold uppercase" style={{ fontFamily: MONO }}>{p.name}</span>
                  <span className="ml-1 text-[#98ca7a]">{p.position}</span>
                  <span className="ml-1 text-white">{p.rating}</span>
                </button>
              ))}
            </div>
          </div>
        )}
        <table className="w-full">
          <thead>
            <tr className="border-b-2 border-[#2a8a2b]">
              <th className={thCls} onClick={() => setSortBy('name')}>Player</th>
              <th className={thCls}>Position</th>
              <th className={thCls}>Club</th>
              <th className={thCls} onClick={() => setSortBy('age')}>Age</th>
              <th className={thCls} onClick={() => setSortBy('rating')}>Rating</th>
              <th className={thCls} onClick={() => setSortBy('potential')}>Potential</th>
              <th className={thCls} onClick={() => setSortBy('value')}>Value</th>
              <th className={thCls}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <tr
                key={p.id}
                className={`border-b border-[#1a5a1e] cursor-pointer transition-colors ${selectedPlayer?.id === p.id ? 'bg-[#1a4a1e]' : 'hover:bg-[#122e14]'}`}
                onClick={() => onSelect(selectedPlayer?.id === p.id ? null : p)}
              >
                <td className="py-1 px-1 text-xs font-bold uppercase text-[#d5f8b6]" style={{ fontFamily: MONO }}>{p.name}</td>
                <td className="py-1 px-1 text-[10px] text-[#00e5ff] uppercase font-mono">{p.position}</td>
                <td className="py-1 px-1 text-[10px] text-[#98ca7a] uppercase font-mono">{p.club}</td>
                <td className="py-1 px-1 text-[10px] text-white font-mono">{p.age}</td>
                <td className="py-1 px-1 text-[10px] text-white font-bold font-mono">{p.rating}</td>
                <td className="py-1 px-1 text-[10px] text-[#efe56b] font-mono">{p.potential}</td>
                <td className="py-1 px-1 text-[10px] text-white font-mono">{fmtMoney(p.value)}</td>
                <td className="py-1 px-1" onClick={(e) => e.stopPropagation()}>
                  <div className="flex gap-1">
                    <ActionBtn onClick={() => onAddShortlist(p)} variant="yellow">Shortlist</ActionBtn>
                    {windowOpen && <ActionBtn onClick={() => onMakeOffer(p)} variant="green">Bid</ActionBtn>}
                    {windowOpen && <ActionBtn onClick={() => onRequestLoan(p)} variant="blue">Loan</ActionBtn>}
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={8} className="py-4 text-center text-xs text-[#6b9a5a] italic">No players match the current filters. Use Reset Filters to show the full global market.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Player detail panel */}
      <div className="border-2 border-[#2a8a2b] bg-[#0d3f10] p-2">
        {selectedPlayer ? (
          <PlayerDetailPanel player={selectedPlayer} windowOpen={windowOpen} onMakeOffer={onMakeOffer} onRequestLoan={onRequestLoan} onAddShortlist={onAddShortlist} />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-[#6b9a5a] italic p-4">
            Select a player to view details
          </div>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════
   Player Detail Panel
   ══════════════════════════════════════════════ */

function PlayerDetailPanel({ player, windowOpen, onMakeOffer, onRequestLoan, onAddShortlist }: {
  player: MarketPlayer;
  windowOpen: boolean;
  onMakeOffer: (p: MarketPlayer) => void;
  onRequestLoan: (p: MarketPlayer) => void;
  onAddShortlist: (p: MarketPlayer) => void;
}) {
  const attrs = [
    { label: 'Pace', value: player.pace },
    { label: 'Shooting', value: player.shooting },
    { label: 'Passing', value: player.passing },
    { label: 'Dribbling', value: player.dribbling },
    { label: 'Defending', value: player.defending },
    { label: 'Physical', value: player.physical },
  ];

  const attrColor = (v: number) => v >= 80 ? 'text-[#2a8a2b]' : v >= 65 ? 'text-[#efe56b]' : v >= 50 ? 'text-[#ff8844]' : 'text-[#ff4444]';

  return (
    <div className="space-y-2">
      <h4 className="text-xs font-black uppercase text-[#00e5ff]" style={{ fontFamily: RETRO }}>
        {player.name}
      </h4>

      <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[10px]" style={{ fontFamily: MONO }}>
        <span className="text-[#6b9a5a]">Club</span><span className="text-[#d5f8b6]">{player.club}</span>
        <span className="text-[#6b9a5a]">Position</span><span className="text-[#00e5ff]">{player.position}</span>
        <span className="text-[#6b9a5a]">Age</span><span className="text-white">{player.age}</span>
        <span className="text-[#6b9a5a]">Nationality</span><span className="text-[#d5f8b6]">{player.nationality}</span>
        <span className="text-[#6b9a5a]">League</span><span className="text-[#98ca7a]">{player.league}</span>
        <span className="text-[#6b9a5a]">Rating</span><span className="text-white font-bold">{player.rating}</span>
        <span className="text-[#6b9a5a]">Potential</span><span className="text-[#efe56b] font-bold">{player.potential}</span>
        <span className="text-[#6b9a5a]">Value</span><span className="text-white">{fmtMoney(player.value)}</span>
        <span className="text-[#6b9a5a]">Wage</span><span className="text-[#98ca7a]">{fmtWage(player.wage)}</span>
        <span className="text-[#6b9a5a]">Contract</span><span className="text-[#98ca7a]">{player.contractYears} yr</span>
        <span className="text-[#6b9a5a]">Status</span>
        <span className={player.status === 'Happy' ? 'text-[#2a8a2b]' : player.status === 'Unsettled' ? 'text-[#ff8844]' : 'text-[#ff4444]'}>{player.status}</span>
      </div>

      <div className="border-t border-[#1a5a1e] pt-2">
        <h5 className="text-[9px] font-bold uppercase text-[#efe56b] mb-1">Attributes</h5>
        <div className="space-y-1">
          {attrs.map((a) => (
            <div key={a.label} className="flex items-center gap-1">
              <span className="w-16 text-[9px] text-[#6b9a5a]" style={{ fontFamily: MONO }}>{a.label}</span>
              <div className="flex-1 h-2 bg-[#0a2e0d] border border-[#1a5a1e]">
                <div className="h-full bg-[#2a8a2b]" style={{ width: `${a.value}%` }} />
              </div>
              <span className={`w-6 text-right text-[9px] font-bold font-mono ${attrColor(a.value)}`}>{a.value}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-[#1a5a1e] pt-2 flex flex-wrap gap-1">
        <ActionBtn onClick={() => onAddShortlist(player)} variant="yellow">Add to Shortlist</ActionBtn>
        {windowOpen && <ActionBtn onClick={() => onMakeOffer(player)} variant="green">Make Offer</ActionBtn>}
        {windowOpen && <ActionBtn onClick={() => onRequestLoan(player)} variant="blue">Request Loan</ActionBtn>}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════
   Shortlist Tab
   ══════════════════════════════════════════════ */

function ShortlistTab({ shortlist, windowOpen, onRemove, onMakeOffer, onRequestLoan }: {
  shortlist: MarketPlayer[];
  windowOpen: boolean;
  onRemove: (id: string) => void;
  onMakeOffer: (p: MarketPlayer) => void;
  onRequestLoan: (p: MarketPlayer) => void;
}) {
  return (
    <div>
      <h3 className="mb-2 text-sm font-black uppercase text-[#00e5ff]" style={{ fontFamily: RETRO }}>
        Shortlist ({shortlist.length})
      </h3>
      {shortlist.length === 0 ? (
        <div className="border-2 border-[#2a8a2b] bg-[#0d3f10] p-6 text-center text-xs text-[#6b9a5a] italic">
          No players shortlisted. Use the Scout Search to find and save transfer targets.
        </div>
      ) : (
        <div className="border-2 border-[#2a8a2b] bg-[#0d3f10]">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-[#2a8a2b]">
                <th className="py-1 px-2 text-left text-[9px] font-bold uppercase text-[#efe56b]">Player</th>
                <th className="py-1 px-2 text-left text-[9px] font-bold uppercase text-[#efe56b]">Position</th>
                <th className="py-1 px-2 text-left text-[9px] font-bold uppercase text-[#efe56b]">Club</th>
                <th className="py-1 px-2 text-left text-[9px] font-bold uppercase text-[#efe56b]">Age</th>
                <th className="py-1 px-2 text-left text-[9px] font-bold uppercase text-[#efe56b]">Rating</th>
                <th className="py-1 px-2 text-left text-[9px] font-bold uppercase text-[#efe56b]">Potential</th>
                <th className="py-1 px-2 text-left text-[9px] font-bold uppercase text-[#efe56b]">Value</th>
                <th className="py-1 px-2 text-left text-[9px] font-bold uppercase text-[#efe56b]">Status</th>
                <th className="py-1 px-2 text-left text-[9px] font-bold uppercase text-[#efe56b]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {shortlist.map((p) => (
                <tr key={p.id} className="border-b border-[#1a5a1e] hover:bg-[#1a4a1e]">
                  <td className="py-1 px-2 text-xs font-bold uppercase text-[#d5f8b6]" style={{ fontFamily: MONO }}>{p.name}</td>
                  <td className="py-1 px-2 text-[10px] text-[#00e5ff] uppercase font-mono">{p.position}</td>
                  <td className="py-1 px-2 text-[10px] text-[#98ca7a] uppercase font-mono">{p.club}</td>
                  <td className="py-1 px-2 text-[10px] text-white font-mono">{p.age}</td>
                  <td className="py-1 px-2 text-[10px] text-white font-bold font-mono">{p.rating}</td>
                  <td className="py-1 px-2 text-[10px] text-[#efe56b] font-mono">{p.potential}</td>
                  <td className="py-1 px-2 text-[10px] text-white font-mono">{fmtMoney(p.value)}</td>
                  <td className={`py-1 px-2 text-[10px] font-mono ${p.status === 'Happy' ? 'text-[#2a8a2b]' : 'text-[#ff8844]'}`}>{p.status}</td>
                  <td className="py-1 px-2">
                    <div className="flex gap-1">
                      {windowOpen && <ActionBtn onClick={() => onMakeOffer(p)} variant="green">Bid</ActionBtn>}
                      {windowOpen && <ActionBtn onClick={() => onRequestLoan(p)} variant="blue">Loan</ActionBtn>}
                      <ActionBtn onClick={() => onRemove(p.id)} variant="red">Remove</ActionBtn>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════
   Offers Tab
   ══════════════════════════════════════════════ */

function OffersTab({ offers, clubName, onAccept, onReject, onNegotiate }: {
  offers: TransferOffer[];
  clubName: string;
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
  onNegotiate: (id: string) => void;
}) {
  const incoming = offers.filter((o) => o.toClub === clubName || o.fromClub !== clubName);
  const outgoing = offers.filter((o) => o.fromClub === clubName);

  const statusColor = (s: string) => {
    switch (s) {
      case 'pending': return 'text-[#efe56b]';
      case 'accepted': return 'text-[#2a8a2b]';
      case 'rejected': return 'text-[#ff4444]';
      case 'counter': return 'text-[#ff8844]';
      default: return 'text-white';
    }
  };

  const renderTable = (title: string, list: TransferOffer[], showActions: boolean) => (
    <div className="mb-3">
      <h4 className="mb-1 text-[10px] font-black uppercase text-[#efe56b]" style={{ fontFamily: RETRO }}>{title} ({list.length})</h4>
      {list.length === 0 ? (
        <div className="border-2 border-[#2a8a2b] bg-[#0d3f10] p-3 text-center text-[10px] text-[#6b9a5a] italic">
          No {title.toLowerCase()}.
        </div>
      ) : (
        <div className="border-2 border-[#2a8a2b] bg-[#0d3f10]">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-[#2a8a2b]">
                <th className="py-1 px-2 text-left text-[9px] font-bold uppercase text-[#efe56b]">Player</th>
                <th className="py-1 px-2 text-left text-[9px] font-bold uppercase text-[#efe56b]">Club</th>
                <th className="py-1 px-2 text-left text-[9px] font-bold uppercase text-[#efe56b]">Amount</th>
                <th className="py-1 px-2 text-left text-[9px] font-bold uppercase text-[#efe56b]">Type</th>
                <th className="py-1 px-2 text-left text-[9px] font-bold uppercase text-[#efe56b]">Status</th>
                {showActions && <th className="py-1 px-2 text-left text-[9px] font-bold uppercase text-[#efe56b]">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {list.map((o) => (
                <tr key={o.id} className="border-b border-[#1a5a1e]">
                  <td className="py-1 px-2 text-xs font-bold uppercase text-[#d5f8b6]" style={{ fontFamily: MONO }}>{o.playerName}</td>
                  <td className="py-1 px-2 text-[10px] text-[#98ca7a] uppercase font-mono">{showActions ? o.fromClub : o.toClub}</td>
                  <td className="py-1 px-2 text-[10px] text-white font-bold font-mono">{fmtMoney(o.amount)}</td>
                  <td className="py-1 px-2 text-[10px] text-[#00e5ff] uppercase font-mono">{o.type}</td>
                  <td className={`py-1 px-2 text-[10px] uppercase font-bold font-mono ${statusColor(o.status)}`}>{o.status}</td>
                  {showActions && o.status === 'pending' && (
                    <td className="py-1 px-2">
                      <div className="flex gap-1">
                        <ActionBtn onClick={() => onAccept(o.id)} variant="green">Accept</ActionBtn>
                        <ActionBtn onClick={() => onReject(o.id)} variant="red">Reject</ActionBtn>
                        <ActionBtn onClick={() => onNegotiate(o.id)} variant="yellow">Counter</ActionBtn>
                      </div>
                    </td>
                  )}
                  {showActions && o.status !== 'pending' && (
                    <td className="py-1 px-2 text-[9px] text-[#6b9a5a] italic">—</td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  return (
    <div>
      <h3 className="mb-2 text-sm font-black uppercase text-[#00e5ff]" style={{ fontFamily: RETRO }}>
        Transfer Offers
      </h3>
      {renderTable('Incoming Offers', incoming, true)}
      {renderTable('Outgoing Offers', outgoing, false)}
    </div>
  );
}

/* ══════════════════════════════════════════════
   Youth Academy Tab
   ══════════════════════════════════════════════ */

function YouthAcademyTab({ youth, onPromote, onRelease, onSetFocus }: {
  youth: YouthPlayer[];
  onPromote: (id: string) => void;
  onRelease: (id: string) => void;
  onSetFocus: (id: string, focus: string) => void;
}) {
  const [top100Only, setTop100Only] = useState(false);

  const visibleYouth = useMemo(() => {
    const ranked = [...youth].sort((a, b) => youthScoutRating(b) - youthScoutRating(a));
    return top100Only ? ranked.slice(0, 100) : ranked;
  }, [youth, top100Only]);

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <h3 className="text-sm font-black uppercase text-[#00e5ff]" style={{ fontFamily: RETRO }}>
          Youth Academy ({visibleYouth.length}/{youth.length} players)
        </h3>
        <button
          type="button"
          onClick={() => setTop100Only((v) => !v)}
          className={`border px-2 py-1 text-[10px] font-bold uppercase ${top100Only ? 'border-[#efe56b] bg-[#4a3a0a] text-[#efe56b]' : 'border-[#2a8a2b] bg-[#0a2e0d] text-[#98ca7a] hover:bg-[#1a4a1e]'}`}
          style={{ fontFamily: MONO }}
        >
          {top100Only ? 'Top 100 by Rating: ON' : 'Top 100 by Rating: OFF'}
        </button>
      </div>

      {visibleYouth.length === 0 ? (
        <div className="border-2 border-[#2a8a2b] bg-[#0d3f10] p-6 text-center text-xs text-[#6b9a5a] italic">
          No youth players available. New intake due next season.
        </div>
      ) : (
        <div className="border-2 border-[#2a8a2b] bg-[#0d3f10]">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-[#2a8a2b]">
                <th className="py-1 px-2 text-left text-[9px] font-bold uppercase text-[#efe56b]">Player</th>
                <th className="py-1 px-2 text-left text-[9px] font-bold uppercase text-[#efe56b]">Age</th>
                <th className="py-1 px-2 text-left text-[9px] font-bold uppercase text-[#efe56b]">Position</th>
                <th className="py-1 px-2 text-left text-[9px] font-bold uppercase text-[#efe56b]">Potential</th>
                <th className="py-1 px-2 text-left text-[9px] font-bold uppercase text-[#efe56b]">Development</th>
                <th className="py-1 px-2 text-left text-[9px] font-bold uppercase text-[#efe56b]">Training Focus</th>
                <th className="py-1 px-2 text-left text-[9px] font-bold uppercase text-[#efe56b]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visibleYouth.map((p) => {
                const potColor = p.potential >= 85 ? 'text-[#2a8a2b]' : p.potential >= 70 ? 'text-[#efe56b]' : p.potential >= 55 ? 'text-[#ff8844]' : 'text-[#6b9a5a]';
                return (
                  <tr key={p.id} className="border-b border-[#1a5a1e] hover:bg-[#1a4a1e]">
                    <td className="py-1 px-2 text-xs font-bold uppercase text-[#d5f8b6]" style={{ fontFamily: MONO }}>{p.name}</td>
                    <td className="py-1 px-2 text-[10px] text-white font-mono">{p.age}</td>
                    <td className="py-1 px-2 text-[10px] text-[#00e5ff] uppercase font-mono">{p.position}</td>
                    <td className={`py-1 px-2 text-[10px] font-bold font-mono ${potColor}`}>{p.potential}</td>
                    <td className="py-1 px-2">
                      <div className="flex items-center gap-1">
                        <div className="flex-1 h-2 bg-[#0a2e0d] border border-[#1a5a1e]">
                          <div className="h-full bg-[#2a8a2b]" style={{ width: `${p.development}%` }} />
                        </div>
                        <span className="text-[9px] text-white font-mono w-7 text-right">{p.development}%</span>
                      </div>
                    </td>
                    <td className="py-1 px-2">
                      <select
                        value={p.trainingFocus}
                        onChange={(e) => onSetFocus(p.id, e.target.value)}
                        className="bg-[#0a2e0d] border border-[#2a8a2b] text-[#d5f8b6] text-[9px] px-1 py-0.5"
                      >
                        {TRAINING_FOCUSES.map((f) => <option key={f} value={f}>{f}</option>)}
                      </select>
                    </td>
                    <td className="py-1 px-2">
                      <div className="flex gap-1">
                        {p.age >= 17 && <ActionBtn onClick={() => onPromote(p.id)} variant="green">Promote</ActionBtn>}
                        <ActionBtn onClick={() => onRelease(p.id)} variant="red">Release</ActionBtn>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════
   Squad Player Detail (when clicking squad row)
   ══════════════════════════════════════════════ */

function SquadPlayerDetail({ player, onClose }: {
  player: SquadPlayer;
  onClose: () => void;
}) {
  const rating = Math.round((player.pac + player.sho + player.pas + player.dri + player.def + player.phy) / 6);
  const value = Math.round(rating ** 2 * 800);
  const wage = Math.round(player.shooting * 250 + player.passing * 200 + player.influence * 300);
  const contract = 1 + Math.floor(sr(hs(player.id + 'contract')) * 5);

  const attrs = [
    { label: 'Pace', value: player.pac },
    { label: 'Shooting', value: player.sho },
    { label: 'Passing', value: player.pas },
    { label: 'Dribbling', value: player.dri },
    { label: 'Defending', value: player.def },
    { label: 'Physical', value: player.phy },
  ];

  const extras = [
    { label: 'Speed', value: player.speed },
    { label: 'Control', value: player.control },
    { label: 'Tackling', value: player.tackling },
    { label: 'Heading', value: player.heading },
    { label: 'Vision', value: player.vision },
    { label: 'Marking', value: player.marking },
    { label: 'Influence', value: player.influence },
  ];

  const attrColor = (v: number) => v >= 80 ? 'text-[#2a8a2b]' : v >= 65 ? 'text-[#efe56b]' : v >= 50 ? 'text-[#ff8844]' : 'text-[#ff4444]';

  return (
    <div className="border-2 border-[#efe56b] bg-[#0d3f10] p-3 mb-3">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-xs font-black uppercase text-[#00e5ff]" style={{ fontFamily: RETRO }}>{player.name}</h4>
        <ActionBtn onClick={onClose} variant="red">Close</ActionBtn>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-[10px] mb-2" style={{ fontFamily: MONO }}>
        <span className="text-[#6b9a5a]">Position</span><span className="text-[#00e5ff]">{player.role}</span>
        <span className="text-[#6b9a5a]">Age</span><span className="text-white">{player.age}</span>
        <span className="text-[#6b9a5a]">Rating</span><span className="text-white font-bold">{rating}</span>
        <span className="text-[#6b9a5a]">Potential</span><span className="text-[#efe56b] font-bold">{player.potential}</span>
        <span className="text-[#6b9a5a]">Value</span><span className="text-white">{fmtMoney(value)}</span>
        <span className="text-[#6b9a5a]">Wage</span><span className="text-[#98ca7a]">{fmtWage(wage)}</span>
        <span className="text-[#6b9a5a]">Contract</span><span className="text-[#98ca7a]">{contract} yr</span>
        <span className="text-[#6b9a5a]">Morale</span><span className={player.morale > 70 ? 'text-[#2a8a2b]' : player.morale > 40 ? 'text-[#efe56b]' : 'text-[#ff4444]'}>{player.morale}</span>
        <span className="text-[#6b9a5a]">Caps</span><span className="text-white">{player.caps}</span>
        <span className="text-[#6b9a5a]">Played</span><span className="text-white">{player.played}</span>
        <span className="text-[#6b9a5a]">Goals</span><span className="text-white">{player.scored}</span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <h5 className="text-[9px] font-bold uppercase text-[#efe56b] mb-1">Main Attributes</h5>
          {attrs.map((a) => (
            <div key={a.label} className="flex items-center gap-1">
              <span className="w-16 text-[9px] text-[#6b9a5a]" style={{ fontFamily: MONO }}>{a.label}</span>
              <div className="flex-1 h-2 bg-[#0a2e0d] border border-[#1a5a1e]">
                <div className="h-full bg-[#2a8a2b]" style={{ width: `${a.value}%` }} />
              </div>
              <span className={`w-6 text-right text-[9px] font-bold font-mono ${attrColor(a.value)}`}>{a.value}</span>
            </div>
          ))}
        </div>
        <div>
          <h5 className="text-[9px] font-bold uppercase text-[#efe56b] mb-1">Detailed Attributes</h5>
          {extras.map((a) => (
            <div key={a.label} className="flex items-center gap-1">
              <span className="w-16 text-[9px] text-[#6b9a5a]" style={{ fontFamily: MONO }}>{a.label}</span>
              <div className="flex-1 h-2 bg-[#0a2e0d] border border-[#1a5a1e]">
                <div className="h-full bg-[#2a8a2b]" style={{ width: `${a.value}%` }} />
              </div>
              <span className={`w-6 text-right text-[9px] font-bold font-mono ${attrColor(a.value)}`}>{a.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════
   Negotiation Dialog
   ══════════════════════════════════════════════ */

function NegotiationDialog({ player, type, onSubmit, onCancel }: {
  player: { name: string; value: number; wage: number; club: string };
  type: 'buy' | 'loan';
  onSubmit: (amount: number, loanDuration?: number, wageSplit?: number, buyClause?: number) => void;
  onCancel: () => void;
}) {
  const [amount, setAmount] = useState(type === 'buy' ? player.value : 0);
  const [loanDuration, setLoanDuration] = useState(12);
  const [wageSplit, setWageSplit] = useState(50);
  const [buyClause, setBuyClause] = useState(0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="border-4 border-[#efe56b] bg-[#0d3f10] p-4 w-80">
        <h3 className="text-xs font-black uppercase text-[#00e5ff] mb-3" style={{ fontFamily: RETRO }}>
          {type === 'buy' ? 'Transfer Offer' : 'Loan Request'}
        </h3>

        <div className="text-[10px] text-[#d5f8b6] mb-2" style={{ fontFamily: MONO }}>
          Player: <strong className="text-white">{player.name}</strong>
        </div>
        <div className="text-[10px] text-[#d5f8b6] mb-3" style={{ fontFamily: MONO }}>
          Club: <strong className="text-[#98ca7a]">{player.club}</strong>
        </div>

        {type === 'buy' ? (
          <div className="space-y-2">
            <div>
              <label className="block text-[10px] uppercase text-[#6b9a5a] mb-0.5">Bid Amount: {fmtMoney(amount)}</label>
              <input type="range" min={0} max={player.value * 3} step={100000} value={amount} onChange={(e) => setAmount(Number(e.target.value))} className="w-full accent-[#2a8a2b]" />
              <div className="flex justify-between text-[10px] text-[#5a8a4a]">
                <span>£0</span>
                <span className="text-[#efe56b]">Value: {fmtMoney(player.value)}</span>
                <span>{fmtMoney(player.value * 3)}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <div>
              <label className="block text-[10px] uppercase text-[#6b9a5a] mb-0.5">Loan Duration: {loanDuration} months</label>
              <input type="range" min={1} max={24} value={loanDuration} onChange={(e) => setLoanDuration(Number(e.target.value))} className="w-full accent-[#2a8a2b]" />
            </div>
            <div>
              <label className="block text-[10px] uppercase text-[#6b9a5a] mb-0.5">Wage Split: {wageSplit}% your club</label>
              <input type="range" min={0} max={100} step={5} value={wageSplit} onChange={(e) => setWageSplit(Number(e.target.value))} className="w-full accent-[#2a8a2b]" />
            </div>
            <div>
              <label className="block text-[10px] uppercase text-[#6b9a5a] mb-0.5">Optional Buy Clause: {buyClause > 0 ? fmtMoney(buyClause) : 'None'}</label>
              <input type="range" min={0} max={player.value * 2} step={500000} value={buyClause} onChange={(e) => setBuyClause(Number(e.target.value))} className="w-full accent-[#2a8a2b]" />
            </div>
          </div>
        )}

        <div className="flex gap-2 mt-4">
          <ActionBtn onClick={() => onSubmit(amount, loanDuration, wageSplit, buyClause)} variant="green">Submit Offer</ActionBtn>
          <ActionBtn onClick={onCancel} variant="red">Cancel</ActionBtn>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════
   Main Component
   ══════════════════════════════════════════════ */

export default function TransferMarket({ activeClub, clubs, squadPlayers }: TransferMarketProps) {
  const [tab, setTab] = useState<TabKey>('overview');

  // Transfer window state
  const windowOpen = true;
  const windowDays = 14 + Math.floor(sr(hs(activeClub.id + 'window')) * 30);

  // Generate market players — exclude own club
  const marketPlayers = useMemo(() => {
    return dedupeByKey(generateMarketPlayers(activeClub.id, 1200, clubs), (p) => `${p.name}|${p.club}|${p.position}`);
  }, [activeClub.id, clubs]);
  const youthPlayersBase = useMemo(
    () => dedupeByKey(generateYouthPlayers(activeClub.id), (p) => `${p.name}|${p.position}|${p.age}`),
    [activeClub.id]
  );

  // State
  const [shortlist, setShortlist] = useState<MarketPlayer[]>([]);
  const [offers, setOffers] = useState<TransferOffer[]>(() => {
    // Seed some incoming offers
    const seed = hs(activeClub.id + 'offers');
    const initial: TransferOffer[] = [];
    const incomingCount = 2 + Math.floor(sr(seed) * 3);
    const usedPlayerIds = new Set<string>();
    const maxAttempts = incomingCount * 8;

    for (let attempt = 0; attempt < maxAttempts && initial.length < incomingCount; attempt++) {
      const pSeed = seed + attempt * 47;
      if (squadPlayers.length === 0) break;
      const pIdx = Math.floor(sr(pSeed) * squadPlayers.length);
      const p = squadPlayers[pIdx];
      if (usedPlayerIds.has(p.id)) continue;
      const rating = (p.pac + p.sho + p.pas + p.dri + p.def + p.phy) / 6;
      const val = Math.round(rating ** 2 * 800);
      const clubIdx = Math.floor(sr(pSeed + 1) * CLUB_NAMES.length);
      usedPlayerIds.add(p.id);

      initial.push({
        id: `offer-in-${initial.length}-${p.id}`,
        playerId: p.id,
        playerName: p.name,
        fromClub: CLUB_NAMES[clubIdx],
        toClub: activeClub.name,
        amount: Math.round(val * (0.6 + sr(pSeed + 2) * 0.8) / 1000) * 1000,
        type: sr(pSeed + 3) > 0.7 ? 'loan' : 'buy',
        status: 'pending',
        timestamp: Date.now() - Math.floor(sr(pSeed + 4) * 3_000_000),
      });
    }
    return initial;
  });
  const [listed, setListed] = useState<{ player: SquadPlayer; askingPrice: number; loanAvailable: boolean }[]>([]);
  const [youthPlayers, setYouthPlayers] = useState<YouthPlayer[]>(youthPlayersBase);
  const [selectedSquadPlayer, setSelectedSquadPlayer] = useState<SquadPlayer | null>(null);
  const [selectedMarketPlayer, setSelectedMarketPlayer] = useState<MarketPlayer | null>(null);
  const [negotiation, setNegotiation] = useState<{ player: { name: string; value: number; wage: number; club: string }; type: 'buy' | 'loan' } | null>(null);
  const [log, setLog] = useState<string[]>([]);

  const addLog = useCallback((msg: string) => {
    setLog((prev) => [msg, ...prev].slice(0, 30));
  }, []);

  // Squad actions
  const handleSell = useCallback((p: SquadPlayer) => {
    const rating = (p.pac + p.sho + p.pas + p.dri + p.def + p.phy) / 6;
    const val = Math.round(rating ** 2 * 800);
    setNegotiation({ player: { name: p.name, value: val, wage: 0, club: activeClub.name }, type: 'buy' });
  }, [activeClub.name]);

  const handleLoan = useCallback((p: SquadPlayer) => {
    const rating = (p.pac + p.sho + p.pas + p.dri + p.def + p.phy) / 6;
    const val = Math.round(rating ** 2 * 800);
    setNegotiation({ player: { name: p.name, value: val, wage: 0, club: activeClub.name }, type: 'loan' });
  }, [activeClub.name]);

  const handleList = useCallback((p: SquadPlayer) => {
    if (listed.some((l) => l.player.id === p.id)) {
      addLog(`${p.name} is already on the transfer list.`);
      return;
    }
    const rating = (p.pac + p.sho + p.pas + p.dri + p.def + p.phy) / 6;
    const val = Math.round(rating ** 2 * 800);
    setListed((prev) => [...prev, { player: p, askingPrice: val, loanAvailable: true }]);
    addLog(`${p.name} added to the transfer list at ${fmtMoney(val)}.`);
  }, [listed, addLog]);

  const handleRenew = useCallback((p: SquadPlayer) => {
    addLog(`Contract renewal offered to ${p.name}.`);
  }, [addLog]);

  const handleNotForSale = useCallback((p: SquadPlayer) => {
    addLog(`${p.name} has been marked as not for sale.`);
    setListed((prev) => prev.filter((l) => l.player.id !== p.id));
  }, [addLog]);

  // Transfer list actions
  const handleRemoveFromList = useCallback((id: string) => {
    const item = listed.find((l) => l.player.id === id);
    setListed((prev) => prev.filter((l) => l.player.id !== id));
    if (item) addLog(`${item.player.name} removed from transfer list.`);
  }, [listed, addLog]);

  const handleAdjustPrice = useCallback((id: string, delta: number) => {
    setListed((prev) => prev.map((l) =>
      l.player.id === id ? { ...l, askingPrice: Math.max(0, l.askingPrice + delta) } : l
    ));
  }, []);

  const handleAcceptListBid = useCallback((id: string) => {
    const item = listed.find((l) => l.player.id === id);
    if (item) {
      addLog(`Accepted bid for ${item.player.name} at ${fmtMoney(item.askingPrice)}. Player sold!`);
      setListed((prev) => prev.filter((l) => l.player.id !== id));
    }
  }, [listed, addLog]);

  // Scout actions
  const handleAddShortlist = useCallback((p: MarketPlayer) => {
    if (shortlist.some((s) => s.id === p.id)) {
      addLog(`${p.name} is already on your shortlist.`);
      return;
    }
    setShortlist((prev) => [...prev, p]);
    addLog(`${p.name} added to shortlist.`);
  }, [shortlist, addLog]);

  const handleMakeOffer = useCallback((p: MarketPlayer) => {
    setNegotiation({ player: { name: p.name, value: p.value, wage: p.wage, club: p.club }, type: 'buy' });
  }, []);

  const handleRequestLoan = useCallback((p: MarketPlayer) => {
    setNegotiation({ player: { name: p.name, value: p.value, wage: p.wage, club: p.club }, type: 'loan' });
  }, []);

  const handleRemoveShortlist = useCallback((id: string) => {
    const p = shortlist.find((s) => s.id === id);
    setShortlist((prev) => prev.filter((s) => s.id !== id));
    if (p) addLog(`${p.name} removed from shortlist.`);
  }, [shortlist, addLog]);

  // Negotiation submit
  const handleNegotiationSubmit = useCallback((amount: number, loanDuration?: number, wageSplit?: number, buyClause?: number) => {
    if (!negotiation) return;
    const newOffer: TransferOffer = {
      id: `offer-out-${Date.now()}`,
      playerId: '',
      playerName: negotiation.player.name,
      fromClub: activeClub.name,
      toClub: negotiation.player.club,
      amount,
      type: negotiation.type,
      status: 'pending',
      loanDuration,
      wageSplit,
      buyClause,
      timestamp: Date.now(),
    };
    setOffers((prev) => [...prev, newOffer]);
    addLog(`${negotiation.type === 'buy' ? 'Transfer' : 'Loan'} offer submitted for ${negotiation.player.name}: ${fmtMoney(amount)}.`);
    setNegotiation(null);

    // Simulate response after adding
    setTimeout(() => {
      const chance = sr(hs(negotiation.player.name + amount));
      const ratio = amount / negotiation.player.value;
      if (negotiation.type === 'buy' && ratio >= 1.1) {
        setOffers((prev) => prev.map((o) => o.id === newOffer.id ? { ...o, status: 'accepted' } : o));
        addLog(`${negotiation.player.club} accepted your offer for ${negotiation.player.name}!`);
      } else if (chance > 0.6) {
        setOffers((prev) => prev.map((o) => o.id === newOffer.id ? { ...o, status: 'counter', amount: Math.round(amount * 1.2 / 1000) * 1000 } : o));
        addLog(`${negotiation.player.club} made a counter offer for ${negotiation.player.name}.`);
      } else {
        setOffers((prev) => prev.map((o) => o.id === newOffer.id ? { ...o, status: 'rejected' } : o));
        addLog(`${negotiation.player.club} rejected your offer for ${negotiation.player.name}.`);
      }
    }, 0);
  }, [negotiation, activeClub.name, addLog]);

  // Offer actions
  const handleAcceptOffer = useCallback((id: string) => {
    setOffers((prev) => prev.map((o) => o.id === id ? { ...o, status: 'accepted' } : o));
    const offer = offers.find((o) => o.id === id);
    if (offer) addLog(`Accepted ${offer.type} offer from ${offer.fromClub} for ${offer.playerName}: ${fmtMoney(offer.amount)}.`);
  }, [offers, addLog]);

  const handleRejectOffer = useCallback((id: string) => {
    setOffers((prev) => prev.map((o) => o.id === id ? { ...o, status: 'rejected' } : o));
    const offer = offers.find((o) => o.id === id);
    if (offer) addLog(`Rejected offer from ${offer.fromClub} for ${offer.playerName}.`);
  }, [offers, addLog]);

  const handleNegotiateOffer = useCallback((id: string) => {
    setOffers((prev) => prev.map((o) => o.id === id ? { ...o, status: 'counter', amount: Math.round(o.amount * 1.3 / 1000) * 1000 } : o));
    const offer = offers.find((o) => o.id === id);
    if (offer) addLog(`Counter offer sent to ${offer.fromClub} for ${offer.playerName}: ${fmtMoney(Math.round(offer.amount * 1.3 / 1000) * 1000)}.`);
  }, [offers, addLog]);

  // Youth actions
  const handlePromote = useCallback((id: string) => {
    const p = youthPlayers.find((y) => y.id === id);
    if (p) {
      setYouthPlayers((prev) => prev.filter((y) => y.id !== id));
      addLog(`${p.name} promoted to the first team!`);
    }
  }, [youthPlayers, addLog]);

  const handleRelease = useCallback((id: string) => {
    const p = youthPlayers.find((y) => y.id === id);
    if (p) {
      setYouthPlayers((prev) => prev.filter((y) => y.id !== id));
      addLog(`${p.name} released from the youth academy.`);
    }
  }, [youthPlayers, addLog]);

  const handleSetFocus = useCallback((id: string, focus: string) => {
    setYouthPlayers((prev) => prev.map((y) => y.id === id ? { ...y, trainingFocus: focus } : y));
    const p = youthPlayers.find((y) => y.id === id);
    if (p) addLog(`${p.name}'s training focus set to ${focus}.`);
  }, [youthPlayers, addLog]);

  return (
    <section className="tm-page-readable border-4 border-[#6f4ca1] bg-[#16a51c] p-3 space-y-3">
      {/* Title */}
      <h2 className="mb-3 border border-[#ceb8e1] bg-[#d5b5ec] p-2 text-center text-sm font-bold uppercase text-[#2e1f4a]">
        Transfer Market
      </h2>

      {/* Budget panel */}
      <BudgetPanel club={activeClub} squad={squadPlayers} offers={offers} windowOpen={windowOpen} windowDays={windowDays} />

      {/* Tabs */}
      <div className="mb-3 flex flex-wrap gap-1 border-2 border-[#2a8a2b] bg-[#0d3f10] p-2">
        {TABS.map((t) => (
          <Btn key={t.key} active={tab === t.key} onClick={() => setTab(t.key)}>
            {t.label}
            {t.key === 'offers' && offers.filter((o) => o.status === 'pending').length > 0 && (
              <span className="ml-1 inline-block px-1 py-0.5 text-[10px] bg-[#8a2a2a] text-white rounded">
                {offers.filter((o) => o.status === 'pending').length}
              </span>
            )}
            {t.key === 'shortlist' && shortlist.length > 0 && (
              <span className="ml-1 inline-block px-1 py-0.5 text-[10px] bg-[#4a3a0a] text-[#efe56b] rounded">
                {shortlist.length}
              </span>
            )}
          </Btn>
        ))}
      </div>

      {/* Selected squad player detail */}
      {selectedSquadPlayer && (
        <SquadPlayerDetail player={selectedSquadPlayer} onClose={() => setSelectedSquadPlayer(null)} />
      )}

      {/* Tab content */}
      {tab === 'overview' && (
        <OverviewTab
          club={activeClub} squad={squadPlayers} offers={offers}
          marketPlayers={marketPlayers} shortlist={shortlist}
          youthPlayers={youthPlayers} windowOpen={windowOpen} windowDays={windowDays}
          setTab={setTab}
        />
      )}
      {tab === 'squad' && (
        <SquadTab
          club={activeClub} squad={squadPlayers} windowOpen={windowOpen}
          onSell={handleSell} onLoan={handleLoan} onList={handleList}
          onRenew={handleRenew} onNotForSale={handleNotForSale}
          onSelect={setSelectedSquadPlayer}
        />
      )}
      {tab === 'transfer-list' && (
        <TransferListTab
          listed={listed}
          onRemove={handleRemoveFromList}
          onAdjustPrice={handleAdjustPrice}
          onAcceptBid={handleAcceptListBid}
        />
      )}
      {tab === 'scout' && (
        <ScoutTab
          players={marketPlayers} windowOpen={windowOpen}
          onAddShortlist={handleAddShortlist}
          onMakeOffer={handleMakeOffer}
          onRequestLoan={handleRequestLoan}
          selectedPlayer={selectedMarketPlayer}
          onSelect={setSelectedMarketPlayer}
        />
      )}
      {tab === 'shortlist' && (
        <ShortlistTab
          shortlist={shortlist} windowOpen={windowOpen}
          onRemove={handleRemoveShortlist}
          onMakeOffer={handleMakeOffer}
          onRequestLoan={handleRequestLoan}
        />
      )}
      {tab === 'offers' && (
        <OffersTab
          offers={offers} clubName={activeClub.name}
          onAccept={handleAcceptOffer}
          onReject={handleRejectOffer}
          onNegotiate={handleNegotiateOffer}
        />
      )}
      {tab === 'youth' && (
        <YouthAcademyTab
          youth={youthPlayers}
          onPromote={handlePromote}
          onRelease={handleRelease}
          onSetFocus={handleSetFocus}
        />
      )}

      {/* Activity log */}
      {log.length > 0 && (
        <div className="mt-3 border-2 border-[#2a8a2b] bg-[#0a2e0d] p-2 max-h-32 overflow-y-auto">
          <h4 className="text-[9px] font-bold uppercase text-[#6b9a5a] mb-1">Activity Log</h4>
          {log.map((msg, i) => (
            <div key={i} className="text-[9px] text-[#98ca7a] border-b border-[#1a3a1e] py-0.5" style={{ fontFamily: MONO }}>
              {msg}
            </div>
          ))}
        </div>
      )}

      {/* Negotiation dialog */}
      {negotiation && (
        <NegotiationDialog
          player={negotiation.player}
          type={negotiation.type}
          onSubmit={handleNegotiationSubmit}
          onCancel={() => setNegotiation(null)}
        />
      )}
    </section>
  );
}
