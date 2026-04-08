import { useState, useMemo } from 'react';

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

type CompetitionType = 'domestic' | 'european';
type CupFormat = 'knockout' | 'group_knockout';
type CupStatus = 'active' | 'eliminated' | 'won' | 'not_started';
type FixtureStatus = 'upcoming' | 'played' | 'postponed';
type HomeAway = 'home' | 'away';
type QualStatus = 'qualified' | 'playoff' | 'eliminated' | 'active';

interface Fixture {
  id: string;
  competitionId: string;
  competitionName: string;
  week: number;
  round: string;
  opponent: string;
  homeAway: HomeAway;
  status: FixtureStatus;
  score?: string;
  aggregateScore?: string;
  notes?: string;
}

interface GroupTableRow {
  team: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  qualificationStatus: QualStatus;
}

interface BracketNode {
  round: string;
  matchLabel: string;
  team1: string;
  team2: string;
  score1?: number;
  score2?: number;
  decided: boolean;
  isClub: boolean;
}

interface CupStats {
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
}

interface CupCompetition {
  id: string;
  name: string;
  shortName: string;
  type: CompetitionType;
  format: CupFormat;
  status: CupStatus;
  stage: string;
  currentRound: string;
  boardExpectation: string;
  prizeMoney: string;
  fixtures: Fixture[];
  bracket: BracketNode[];
  standings: GroupTableRow[];
  stats: CupStats;
}

type FilterKey = 'all' | 'domestic' | 'european';

interface CupCenterProps {
  activeClub: Club;
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

function pickN<T>(arr: T[], n: number, seed: number): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(sr(seed + i) * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, n);
}

/* ══════════════════════════════════════════════
   Mock data generator
   ══════════════════════════════════════════════ */

const EURO_CLUBS = [
  'Real Madrid', 'Barcelona', 'Bayern Munich', 'PSG', 'Juventus', 'AC Milan', 'Inter Milan',
  'Ajax', 'Porto', 'Benfica', 'Sporting CP', 'Celtic', 'Marseille', 'Roma', 'Napoli',
  'Dortmund', 'RB Leipzig', 'Feyenoord', 'PSV', 'Brugge', 'Galatasaray', 'Olympiacos',
  'Red Star Belgrade', 'Copenhagen', 'Salzburg', 'Shakhtar Donetsk', 'Dinamo Zagreb', 'Villarreal',
];

const DOMESTIC_CLUBS = [
  'Arsenal', 'Chelsea', 'Liverpool', 'Man City', 'Man United', 'Tottenham', 'Newcastle',
  'West Ham', 'Aston Villa', 'Brighton', 'Wolves', 'Crystal Palace', 'Everton', 'Fulham',
  'Brentford', 'Bournemouth', 'Burnley', 'Sheffield Utd', 'Luton Town', 'Leeds United',
  'Southampton', 'Leicester', 'Norwich', 'Preston', 'Swansea', 'Sunderland', 'Middlesbrough',
  'Birmingham', 'Stoke City', 'QPR', 'Hull City', 'Blackburn', 'Millwall', 'Watford',
  'Plymouth', 'Coventry', 'Ipswich Town', 'Reading', 'Wigan Athletic', 'Crewe Alexandra',
];

function generateCups(club: Club): CupCompetition[] {
  const seed = hs(club.id + club.name);
  const clubName = club.name;
  const div = club.leagueName ?? '1st Division';
  const isTopDiv = div === 'Premier League' || div === 'Championship';
  const cups: CupCompetition[] = [];
  const availableClubs = DOMESTIC_CLUBS.filter((c) => c !== clubName);

  // ─── FA Cup ───
  const faRounds = ['Round 1', 'Round 2', 'Round 3', 'Round 4', 'Round 5', 'Quarter Final', 'Semi Final', 'Final'];
  const faProgress = Math.min(faRounds.length - 1, Math.floor(sr(seed + 1) * (faRounds.length + 1)));
  const faEliminated = sr(seed + 2) > 0.6;
  const faStatus: CupStatus = faEliminated && faProgress < faRounds.length - 1 ? 'eliminated' : faProgress === faRounds.length - 1 && sr(seed + 50) > 0.7 ? 'won' : 'active';

  const faFixtures: Fixture[] = [];
  const faBracket: BracketNode[] = [];
  for (let i = 0; i <= Math.min(faProgress, faRounds.length - 1); i++) {
    const opp = pick(availableClubs, seed + 10 + i);
    const ha: HomeAway = sr(seed + 20 + i) > 0.5 ? 'home' : 'away';
    const isPlayed = i < faProgress || (i === faProgress && faStatus === 'eliminated');
    const homeG = Math.floor(sr(seed + 30 + i) * 4);
    const awayG = Math.floor(sr(seed + 31 + i) * 3);
    const won = ha === 'home' ? homeG > awayG : awayG > homeG;

    faFixtures.push({
      id: `fa-${i}`,
      competitionId: 'fa-cup',
      competitionName: 'FA Cup',
      week: 8 + i * 4,
      round: faRounds[i],
      opponent: opp,
      homeAway: ha,
      status: isPlayed ? 'played' : 'upcoming',
      score: isPlayed ? `${homeG}-${awayG}` : undefined,
      notes: isPlayed && !won && i === faProgress ? 'Eliminated' : undefined,
    });

    faBracket.push({
      round: faRounds[i],
      matchLabel: faRounds[i],
      team1: ha === 'home' ? clubName : opp,
      team2: ha === 'away' ? clubName : opp,
      score1: isPlayed ? homeG : undefined,
      score2: isPlayed ? awayG : undefined,
      decided: isPlayed,
      isClub: true,
    });
  }

  // Add future bracket nodes
  for (let i = faProgress + 1; i < faRounds.length; i++) {
    faBracket.push({
      round: faRounds[i],
      matchLabel: faRounds[i],
      team1: i === faProgress + 1 && faStatus === 'active' ? clubName : 'TBD',
      team2: 'TBD',
      decided: false,
      isClub: i === faProgress + 1 && faStatus === 'active',
    });
  }

  const faPlayed = faFixtures.filter((f) => f.status === 'played').length;
  cups.push({
    id: 'fa-cup',
    name: 'FA Cup',
    shortName: 'FA',
    type: 'domestic',
    format: 'knockout',
    status: faStatus,
    stage: faStatus === 'eliminated' ? `Out in ${faRounds[faProgress]}` : faStatus === 'won' ? 'Winners!' : faRounds[faProgress],
    currentRound: faRounds[Math.min(faProgress, faRounds.length - 1)],
    boardExpectation: isTopDiv ? 'Reach the Quarter Finals' : 'Reach Round 4',
    prizeMoney: '£1.8M (winner)',
    fixtures: faFixtures,
    bracket: faBracket,
    standings: [],
    stats: {
      played: faPlayed,
      wins: faFixtures.filter((f) => f.status === 'played' && !f.notes).length,
      draws: 0,
      losses: faStatus === 'eliminated' ? 1 : 0,
      goalsFor: faFixtures.filter((f) => f.status === 'played').reduce((s, f) => s + (parseInt(f.score?.split('-')[0] ?? '0') || 0), 0),
      goalsAgainst: faFixtures.filter((f) => f.status === 'played').reduce((s, f) => s + (parseInt(f.score?.split('-')[1] ?? '0') || 0), 0),
    },
  });

  // ─── League Cup (EFL Cup) ───
  const lcRounds = ['Round 1', 'Round 2', 'Round 3', 'Round 4', 'Quarter Final', 'Semi Final', 'Final'];
  const lcProgress = Math.min(lcRounds.length - 1, Math.floor(sr(seed + 100) * (lcRounds.length + 1)));
  const lcElim = sr(seed + 101) > 0.55;
  const lcStatus: CupStatus = lcElim && lcProgress < lcRounds.length - 1 ? 'eliminated' : lcProgress === lcRounds.length - 1 && sr(seed + 102) > 0.75 ? 'won' : 'active';

  const lcFixtures: Fixture[] = [];
  const lcBracket: BracketNode[] = [];
  for (let i = 0; i <= Math.min(lcProgress, lcRounds.length - 1); i++) {
    const opp = pick(availableClubs, seed + 110 + i);
    const ha: HomeAway = sr(seed + 120 + i) > 0.5 ? 'home' : 'away';
    const isPlayed = i < lcProgress || (i === lcProgress && lcStatus === 'eliminated');
    const hg = Math.floor(sr(seed + 130 + i) * 4);
    const ag = Math.floor(sr(seed + 131 + i) * 3);
    const won = ha === 'home' ? hg > ag : ag > hg;

    lcFixtures.push({
      id: `lc-${i}`,
      competitionId: 'league-cup',
      competitionName: 'League Cup',
      week: 6 + i * 3,
      round: lcRounds[i],
      opponent: opp,
      homeAway: ha,
      status: isPlayed ? 'played' : 'upcoming',
      score: isPlayed ? `${hg}-${ag}` : undefined,
      notes: isPlayed && !won && i === lcProgress ? 'Eliminated' : undefined,
    });

    lcBracket.push({
      round: lcRounds[i],
      matchLabel: lcRounds[i],
      team1: ha === 'home' ? clubName : opp,
      team2: ha === 'away' ? clubName : opp,
      score1: isPlayed ? hg : undefined,
      score2: isPlayed ? ag : undefined,
      decided: isPlayed,
      isClub: true,
    });
  }

  for (let i = lcProgress + 1; i < lcRounds.length; i++) {
    lcBracket.push({
      round: lcRounds[i],
      matchLabel: lcRounds[i],
      team1: i === lcProgress + 1 && lcStatus === 'active' ? clubName : 'TBD',
      team2: 'TBD',
      decided: false,
      isClub: i === lcProgress + 1 && lcStatus === 'active',
    });
  }

  const lcPlayed = lcFixtures.filter((f) => f.status === 'played').length;
  cups.push({
    id: 'league-cup',
    name: 'League Cup',
    shortName: 'LC',
    type: 'domestic',
    format: 'knockout',
    status: lcStatus,
    stage: lcStatus === 'eliminated' ? `Out in ${lcRounds[lcProgress]}` : lcStatus === 'won' ? 'Winners!' : lcRounds[lcProgress],
    currentRound: lcRounds[Math.min(lcProgress, lcRounds.length - 1)],
    boardExpectation: isTopDiv ? 'Reach the Semi Finals' : 'Reach Round 3',
    prizeMoney: '£100,000 (winner)',
    fixtures: lcFixtures,
    bracket: lcBracket,
    standings: [],
    stats: {
      played: lcPlayed,
      wins: lcFixtures.filter((f) => f.status === 'played' && !f.notes).length,
      draws: 0,
      losses: lcStatus === 'eliminated' ? 1 : 0,
      goalsFor: lcFixtures.filter((f) => f.status === 'played').reduce((s, f) => s + (parseInt(f.score?.split('-')[0] ?? '0') || 0), 0),
      goalsAgainst: lcFixtures.filter((f) => f.status === 'played').reduce((s, f) => s + (parseInt(f.score?.split('-')[1] ?? '0') || 0), 0),
    },
  });

  // ─── European Competition (if top division) ───
  if (isTopDiv) {
    const euroName = div === 'Premier League'
      ? (club.reputation > 75 ? 'Champions League' : 'Europa League')
      : 'Conference League';
    const euroShort = euroName === 'Champions League' ? 'UCL' : euroName === 'Europa League' ? 'UEL' : 'UECL';

    // Group stage
    const groupTeams = pickN(EURO_CLUBS, 3, seed + 200);
    const allGroupTeams = [clubName, ...groupTeams];
    const standings: GroupTableRow[] = allGroupTeams.map((team) => {
      const s2 = hs(team) + seed;
      const p = 6;
      const w = Math.floor(sr(s2 + 1) * 5);
      const d = Math.floor(sr(s2 + 2) * (6 - w));
      const l = p - w - d;
      const gf = w * 2 + d + Math.floor(sr(s2 + 3) * 3);
      const ga = l * 2 + d + Math.floor(sr(s2 + 4) * 2);
      return {
        team,
        played: p,
        wins: w,
        draws: d,
        losses: l,
        goalsFor: gf,
        goalsAgainst: ga,
        goalDifference: gf - ga,
        points: w * 3 + d,
        qualificationStatus: 'active' as QualStatus,
      };
    }).sort((a, b) => b.points - a.points || b.goalDifference - a.goalDifference);

    // Set qualification status
    standings.forEach((row, pos) => {
      if (pos < 2) row.qualificationStatus = 'qualified';
      else if (pos === 2) row.qualificationStatus = 'playoff';
      else row.qualificationStatus = 'eliminated';
    });

    const clubPosition = standings.findIndex((r) => r.team === clubName) + 1;
    const qualifiedForKO = clubPosition <= 2;

    // Group fixtures
    const euroFixtures: Fixture[] = [];
    let matchday = 0;
    for (const opp of groupTeams) {
      for (const ha of ['home', 'away'] as HomeAway[]) {
        matchday++;
        const hg = Math.floor(sr(seed + 300 + matchday) * 4);
        const ag = Math.floor(sr(seed + 301 + matchday) * 3);
        euroFixtures.push({
          id: `euro-g-${matchday}`,
          competitionId: `euro-${euroShort.toLowerCase()}`,
          competitionName: euroName,
          week: 4 + matchday * 2,
          round: `Matchday ${matchday}`,
          opponent: opp,
          homeAway: ha,
          status: 'played',
          score: `${hg}-${ag}`,
        });
      }
    }

    // KO stage if qualified
    const euroKORounds = ['Round of 16', 'Quarter Final', 'Semi Final', 'Final'];
    const euroBracket: BracketNode[] = [];
    let euroStatus: CupStatus = qualifiedForKO ? 'active' : 'eliminated';
    let euroStage = qualifiedForKO ? 'Knockout Stage' : `Eliminated (Group ${clubPosition}${ordinal(clubPosition)})`;
    let koProgress = 0;

    if (qualifiedForKO) {
      koProgress = Math.min(euroKORounds.length - 1, Math.floor(sr(seed + 400) * (euroKORounds.length + 1)));
      const koElim = sr(seed + 401) > 0.5;

      if (koElim && koProgress < euroKORounds.length - 1) {
        euroStatus = 'eliminated';
        euroStage = `Out in ${euroKORounds[koProgress]}`;
      } else if (koProgress === euroKORounds.length - 1 && sr(seed + 402) > 0.8) {
        euroStatus = 'won';
        euroStage = 'Winners! 🏆';
      } else {
        euroStage = euroKORounds[koProgress];
      }

      for (let i = 0; i <= Math.min(koProgress, euroKORounds.length - 1); i++) {
        const opp = pick(EURO_CLUBS, seed + 410 + i);
        const isPlayed = i < koProgress || (i === koProgress && euroStatus === 'eliminated');

        // Two-leg ties (except final)
        if (i < euroKORounds.length - 1) {
          const leg1h = Math.floor(sr(seed + 420 + i * 2) * 3);
          const leg1a = Math.floor(sr(seed + 421 + i * 2) * 3);
          const leg2h = Math.floor(sr(seed + 422 + i * 2) * 3);
          const leg2a = Math.floor(sr(seed + 423 + i * 2) * 3);
          const agg1 = leg1h + leg2a;
          const agg2 = leg1a + leg2h;

          euroFixtures.push({
            id: `euro-ko-${i}-1`,
            competitionId: `euro-${euroShort.toLowerCase()}`,
            competitionName: euroName,
            week: 24 + i * 4,
            round: `${euroKORounds[i]} — 1st Leg`,
            opponent: opp,
            homeAway: 'home',
            status: isPlayed ? 'played' : 'upcoming',
            score: isPlayed ? `${leg1h}-${leg1a}` : undefined,
            aggregateScore: isPlayed ? `${agg1}-${agg2} agg.` : undefined,
          });

          euroFixtures.push({
            id: `euro-ko-${i}-2`,
            competitionId: `euro-${euroShort.toLowerCase()}`,
            competitionName: euroName,
            week: 25 + i * 4,
            round: `${euroKORounds[i]} — 2nd Leg`,
            opponent: opp,
            homeAway: 'away',
            status: isPlayed ? 'played' : 'upcoming',
            score: isPlayed ? `${leg2h}-${leg2a}` : undefined,
            aggregateScore: isPlayed ? `${agg1}-${agg2} agg.` : undefined,
            notes: isPlayed && agg1 === agg2 ? 'Decided on penalties' : undefined,
          });

          euroBracket.push({
            round: euroKORounds[i],
            matchLabel: `${euroKORounds[i]}`,
            team1: clubName,
            team2: opp,
            score1: isPlayed ? agg1 : undefined,
            score2: isPlayed ? agg2 : undefined,
            decided: isPlayed,
            isClub: true,
          });
        } else {
          // Final — single match
          const fh = Math.floor(sr(seed + 450) * 3);
          const fa = Math.floor(sr(seed + 451) * 3);
          euroFixtures.push({
            id: `euro-ko-final`,
            competitionId: `euro-${euroShort.toLowerCase()}`,
            competitionName: euroName,
            week: 38,
            round: 'Final',
            opponent: opp,
            homeAway: 'neutral' as HomeAway,
            status: isPlayed ? 'played' : 'upcoming',
            score: isPlayed ? `${fh}-${fa}` : undefined,
            notes: isPlayed && fh === fa ? 'After extra time & penalties' : undefined,
          });

          euroBracket.push({
            round: 'Final',
            matchLabel: 'Final',
            team1: clubName,
            team2: opp,
            score1: isPlayed ? fh : undefined,
            score2: isPlayed ? fa : undefined,
            decided: isPlayed,
            isClub: true,
          });
        }
      }

      // Future bracket nodes
      for (let i = koProgress + 1; i < euroKORounds.length; i++) {
        euroBracket.push({
          round: euroKORounds[i],
          matchLabel: euroKORounds[i],
          team1: i === koProgress + 1 && euroStatus === 'active' ? clubName : 'TBD',
          team2: 'TBD',
          decided: false,
          isClub: i === koProgress + 1 && euroStatus === 'active',
        });
      }
    }

    const euroPlayed = euroFixtures.filter((f) => f.status === 'played').length;
    const euroWins = euroFixtures.filter((f) => {
      if (f.status !== 'played' || !f.score) return false;
      const [h, a] = f.score.split('-').map(Number);
      return f.homeAway === 'home' ? h > a : a > h;
    }).length;
    const euroDraws = euroFixtures.filter((f) => {
      if (f.status !== 'played' || !f.score) return false;
      const [h, a] = f.score.split('-').map(Number);
      return h === a;
    }).length;

    cups.push({
      id: `euro-${euroShort.toLowerCase()}`,
      name: euroName,
      shortName: euroShort,
      type: 'european',
      format: 'group_knockout',
      status: euroStatus,
      stage: euroStage,
      currentRound: qualifiedForKO ? euroKORounds[Math.min(koProgress, euroKORounds.length - 1)] : `Group Stage — ${clubPosition}${ordinal(clubPosition)}`,
      boardExpectation: euroName === 'Champions League' ? 'Reach the Quarter Finals' : euroName === 'Europa League' ? 'Qualify from the group' : 'Progress as far as possible',
      prizeMoney: euroName === 'Champions League' ? '€50M+ (group stage)' : euroName === 'Europa League' ? '€15M+ (group stage)' : '€5M+',
      fixtures: euroFixtures,
      bracket: euroBracket,
      standings,
      stats: {
        played: euroPlayed,
        wins: euroWins,
        draws: euroDraws,
        losses: euroPlayed - euroWins - euroDraws,
        goalsFor: euroFixtures.filter((f) => f.status === 'played').reduce((s, f) => s + (parseInt(f.score?.split('-')[0] ?? '0') || 0), 0),
        goalsAgainst: euroFixtures.filter((f) => f.status === 'played').reduce((s, f) => s + (parseInt(f.score?.split('-')[1] ?? '0') || 0), 0),
      },
    });
  }

  return cups;
}

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}

/* ══════════════════════════════════════════════
   Sub-components
   ══════════════════════════════════════════════ */

function StatusBadge({ status }: { status: CupStatus }) {
  const cfg: Record<CupStatus, { bg: string; text: string; label: string }> = {
    active: { bg: 'bg-[#22c55e]', text: 'text-[#0a2e0d]', label: 'ACTIVE' },
    eliminated: { bg: 'bg-[#ef4444]', text: 'text-white', label: 'ELIMINATED' },
    won: { bg: 'bg-[#efe56b]', text: 'text-[#2e1f4a]', label: '🏆 WINNER' },
    not_started: { bg: 'bg-[#6b9a5a]', text: 'text-white', label: 'NOT STARTED' },
  };
  const c = cfg[status];
  return <span className={`${c.bg} ${c.text} rounded px-2 py-0.5 text-[10px] font-black uppercase`}>{c.label}</span>;
}

function TypeBadge({ type }: { type: CompetitionType }) {
  return (
    <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase ${
      type === 'european' ? 'bg-[#1d4ed8] text-white' : 'bg-[#6b21a8] text-white'
    }`}>
      {type === 'european' ? '🌍 European' : '🏴 Domestic'}
    </span>
  );
}

function Card({ title, children, compact }: { title: string; children: React.ReactNode; compact?: boolean }) {
  return (
    <div className="border-2 border-[#2a8a2b] bg-[#0d3f10]">
      <h3 className="border-b-2 border-[#2a8a2b] bg-[#1f641d] px-3 py-1.5 text-xs font-black uppercase tracking-wider text-[#efe56b]">
        {title}
      </h3>
      <div className={compact ? 'p-2' : 'p-3'}>{children}</div>
    </div>
  );
}

function StatRow({ label, value, highlight }: { label: string; value: string | number; highlight?: boolean }) {
  return (
    <div className="flex justify-between border-b border-[#1a5a1e] py-0.5 last:border-0">
      <span className="text-[#98ca7a] text-xs">{label}</span>
      <span className={highlight ? 'font-black text-[#efe56b] text-xs' : 'font-bold text-white text-xs'}>{value}</span>
    </div>
  );
}

/* ── All Cups Overview ── */

function AllCupsOverview({ cups, onSelect }: { cups: CupCompetition[]; onSelect: (id: string) => void }) {
  const allFixtures = cups.flatMap((c) => c.fixtures);
  const upcoming = allFixtures.filter((f) => f.status === 'upcoming').sort((a, b) => a.week - b.week);
  const upcomingCount = upcoming.length;
  const nextTwoWeeks = upcoming.filter((f) => f.week <= (upcoming[0]?.week ?? 0) + 2);

  return (
    <div className="space-y-3">
      {/* Congestion warning */}
      {nextTwoWeeks.length >= 3 && (
        <div className="border-2 border-[#eab308] bg-[#2e1f0a] px-3 py-2 text-xs text-[#eab308]">
          ⚠ <strong>Fixture Congestion:</strong> {nextTwoWeeks.length} cup matches in the next 2 weeks. Consider squad rotation.
        </div>
      )}

      {/* Summary bar */}
      <div className="flex flex-wrap gap-2 text-xs">
        <span className="border border-[#98ca7a] bg-[#1a3a1e] px-2 py-0.5 text-[#d5f8b6]">
          {cups.filter((c) => c.status === 'active').length} active
        </span>
        <span className="border border-[#98ca7a] bg-[#1a3a1e] px-2 py-0.5 text-[#d5f8b6]">
          {cups.filter((c) => c.status === 'eliminated').length} eliminated
        </span>
        <span className="border border-[#98ca7a] bg-[#1a3a1e] px-2 py-0.5 text-[#d5f8b6]">
          {upcomingCount} upcoming fixture{upcomingCount !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Competition cards */}
      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
        {cups.map((cup) => {
          const next = cup.fixtures.find((f) => f.status === 'upcoming');
          return (
            <button
              key={cup.id}
              type="button"
              onClick={() => onSelect(cup.id)}
              className="w-full text-left border-2 border-[#2a8a2b] bg-[#0d3f10] p-2.5 transition-colors hover:bg-[#1a4a1e]"
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="font-black text-sm text-white">{cup.name}</span>
                <StatusBadge status={cup.status} />
              </div>
              <div className="flex items-center gap-2 mb-1">
                <TypeBadge type={cup.type} />
                <span className="text-[10px] text-[#98ca7a]">{cup.format === 'group_knockout' ? 'Group + KO' : 'Knockout'}</span>
              </div>
              <p className="text-xs text-[#d5f8b6] mb-1">Stage: <strong className="text-white">{cup.stage}</strong></p>
              {next && (
                <p className="text-[10px] text-[#98ca7a]">
                  Next: {next.round} — <span className="text-white">{next.homeAway === 'home' ? 'vs' : '@'} {next.opponent}</span> (Week {next.week})
                </p>
              )}
              {!next && cup.status === 'active' && (
                <p className="text-[10px] italic text-[#6b9a5a]">Draw pending…</p>
              )}
              <p className="mt-1 text-[10px] text-[#6b9a5a]">Board: {cup.boardExpectation}</p>
            </button>
          );
        })}
      </div>

      {/* Next fixtures across all cups */}
      {upcoming.length > 0 && (
        <Card title="Upcoming Cup Fixtures">
          {upcoming.slice(0, 6).map((f) => (
            <div key={f.id} className="flex items-center justify-between border-b border-[#1a5a1e] py-1 last:border-0">
              <div className="flex-1">
                <span className="text-[10px] font-bold uppercase text-[#efe56b]">{f.competitionName}</span>
                <p className="text-xs text-[#d5f8b6]">
                  {f.round} — <span className="text-white">{f.homeAway === 'home' ? 'vs' : '@'} {f.opponent}</span>
                </p>
              </div>
              <span className="text-[10px] text-[#6b9a5a]">Wk {f.week}</span>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}

/* ── Competition Detail ── */

function CompetitionDetail({ cup }: { cup: CupCompetition }) {
  const [tab, setTab] = useState<'overview' | 'fixtures' | 'bracket' | 'standings'>('overview');
  const hasStandings = cup.standings.length > 0;
  const hasBracket = cup.bracket.length > 0;

  const tabs: { key: typeof tab; label: string; show: boolean }[] = [
    { key: 'overview', label: 'Overview', show: true },
    { key: 'fixtures', label: 'Fixtures', show: cup.fixtures.length > 0 },
    { key: 'bracket', label: 'Route', show: hasBracket },
    { key: 'standings', label: 'Group', show: hasStandings },
  ];

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between border-2 border-[#2a8a2b] bg-[#1f641d] px-3 py-2">
        <div>
          <h3 className="font-black text-sm text-white">{cup.name}</h3>
          <div className="flex items-center gap-2 mt-0.5">
            <TypeBadge type={cup.type} />
            <StatusBadge status={cup.status} />
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-[#efe56b] font-bold">{cup.stage}</p>
          <p className="text-[10px] text-[#98ca7a]">{cup.prizeMoney}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1">
        {tabs.filter((t) => t.show).map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`border px-2 py-0.5 text-[10px] font-bold uppercase ${
              tab === t.key
                ? 'border-[#efe56b] bg-[#2a8a2b] text-[#efe56b]'
                : 'border-[#1a5a1e] bg-[#0d3f10] text-[#98ca7a] hover:bg-[#1a4a1e]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'overview' && <OverviewTab cup={cup} />}
      {tab === 'fixtures' && <FixturesTab fixtures={cup.fixtures} />}
      {tab === 'bracket' && <BracketTab bracket={cup.bracket} />}
      {tab === 'standings' && <StandingsTab standings={cup.standings} />}
    </div>
  );
}

function OverviewTab({ cup }: { cup: CupCompetition }) {
  const next = cup.fixtures.find((f) => f.status === 'upcoming');
  const feedbackMessages = generateFeedback(cup);

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      {/* Stats */}
      <Card title="Cup Statistics">
        <StatRow label="Played" value={cup.stats.played} />
        <StatRow label="Wins" value={cup.stats.wins} />
        <StatRow label="Draws" value={cup.stats.draws} />
        <StatRow label="Losses" value={cup.stats.losses} />
        <StatRow label="Goals For" value={cup.stats.goalsFor} />
        <StatRow label="Goals Against" value={cup.stats.goalsAgainst} />
        <StatRow label="Goal Difference" value={cup.stats.goalsFor - cup.stats.goalsAgainst} highlight />
      </Card>

      {/* Next Match */}
      <Card title="Next Match">
        {next ? (
          <div>
            <p className="text-xs text-[#98ca7a] mb-1">{next.round}</p>
            <p className="text-sm font-bold text-white">
              {next.homeAway === 'home' ? 'vs' : '@'} {next.opponent}
            </p>
            <p className="text-[10px] text-[#6b9a5a] mt-1">
              {next.homeAway === 'home' ? '🏠 Home' : '✈️ Away'} — Week {next.week}
            </p>
            {next.aggregateScore && (
              <p className="text-[10px] text-[#eab308] mt-0.5">{next.aggregateScore}</p>
            )}
          </div>
        ) : (
          <p className="text-xs italic text-[#6b9a5a]">
            {cup.status === 'eliminated' ? 'Eliminated from competition.' : cup.status === 'won' ? 'Competition completed — Champions!' : 'Awaiting draw…'}
          </p>
        )}
      </Card>

      {/* Board Expectation */}
      <Card title="Board Expectation">
        <p className="text-xs text-[#d5f8b6]">{cup.boardExpectation}</p>
        <p className="mt-1 text-[10px] text-[#98ca7a]">Prize: {cup.prizeMoney}</p>
      </Card>

      {/* Feedback */}
      <Card title="Cup Feedback">
        <div className="space-y-1.5">
          {feedbackMessages.map((msg, i) => (
            <p key={i} className="border-l-2 border-[#efe56b] pl-2 text-xs leading-snug text-[#d5f8b6]">{msg}</p>
          ))}
        </div>
      </Card>
    </div>
  );
}

function FixturesTab({ fixtures }: { fixtures: Fixture[] }) {
  const sorted = [...fixtures].sort((a, b) => a.week - b.week);

  return (
    <Card title={`Fixtures (${fixtures.length})`} compact>
      <div className="max-h-[360px] overflow-y-auto">
        {sorted.map((f) => (
          <div
            key={f.id}
            className={`flex items-center gap-2 border-b border-[#1a5a1e] py-1.5 last:border-0 ${
              f.status === 'upcoming' ? 'bg-[#0d3f10]' : ''
            }`}
          >
            <span className="w-10 shrink-0 text-center text-[10px] text-[#6b9a5a]">Wk {f.week}</span>
            <div className="flex-1">
              <p className="text-xs">
                <span className="font-bold text-white">{f.homeAway === 'home' ? 'vs' : '@'} {f.opponent}</span>
                <span className="ml-1 text-[10px] text-[#98ca7a]">({f.round})</span>
              </p>
              {f.notes && <p className="text-[10px] text-[#eab308]">{f.notes}</p>}
            </div>
            <div className="shrink-0 text-right">
              {f.status === 'played' && f.score ? (
                <span className="font-mono text-xs font-bold text-white">{f.score}</span>
              ) : f.status === 'upcoming' ? (
                <span className="text-[10px] text-[#22c55e]">Upcoming</span>
              ) : (
                <span className="text-[10px] text-[#6b9a5a]">{f.status}</span>
              )}
              {f.aggregateScore && (
                <p className="text-[9px] text-[#eab308]">{f.aggregateScore}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function BracketTab({ bracket }: { bracket: BracketNode[] }) {
  return (
    <Card title="Route to the Final" compact>
      <div className="space-y-1">
        {bracket.map((node, i) => (
          <div
            key={i}
            className={`flex items-center gap-2 border-l-4 px-2 py-1.5 ${
              node.isClub && !node.decided
                ? 'border-l-[#efe56b] bg-[#1a4a1e]'
                : node.decided
                  ? 'border-l-[#2a8a2b] bg-[#0d3f10]'
                  : 'border-l-[#1a3a1e] bg-[#0a2e0d]'
            }`}
          >
            <span className="w-24 shrink-0 text-[10px] font-bold uppercase text-[#efe56b]">{node.round}</span>
            <div className="flex-1 text-xs">
              <span className={node.team1 !== 'TBD' && node.isClub ? 'font-bold text-white' : 'text-[#98ca7a]'}>
                {node.team1}
              </span>
              <span className="mx-1 text-[#6b9a5a]">vs</span>
              <span className={node.team2 !== 'TBD' ? 'text-[#d5f8b6]' : 'text-[#6b9a5a]'}>
                {node.team2}
              </span>
            </div>
            {node.decided && node.score1 != null && (
              <span className="shrink-0 font-mono text-xs font-bold text-white">
                {node.score1}-{node.score2}
              </span>
            )}
            {!node.decided && node.isClub && (
              <span className="shrink-0 text-[10px] text-[#22c55e]">Next</span>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}

function StandingsTab({ standings }: { standings: GroupTableRow[] }) {
  const qualColors: Record<QualStatus, string> = {
    qualified: 'border-l-[#22c55e]',
    playoff: 'border-l-[#eab308]',
    eliminated: 'border-l-[#ef4444]',
    active: 'border-l-[#6b9a5a]',
  };

  return (
    <Card title="Group Standings" compact>
      <div className="overflow-x-auto">
        <table className="w-full text-[10px]">
          <thead>
            <tr className="border-b-2 border-[#2a8a2b] text-[#efe56b]">
              <th className="py-1 text-left px-1">#</th>
              <th className="py-1 text-left px-1">Team</th>
              <th className="py-1 text-center px-1">P</th>
              <th className="py-1 text-center px-1">W</th>
              <th className="py-1 text-center px-1">D</th>
              <th className="py-1 text-center px-1">L</th>
              <th className="py-1 text-center px-1">GF</th>
              <th className="py-1 text-center px-1">GA</th>
              <th className="py-1 text-center px-1">GD</th>
              <th className="py-1 text-center px-1 font-black">Pts</th>
            </tr>
          </thead>
          <tbody>
            {standings.map((row, i) => (
              <tr
                key={row.team}
                className={`border-l-4 border-b border-[#1a5a1e] ${qualColors[row.qualificationStatus]}`}
              >
                <td className="py-1 px-1 text-[#6b9a5a]">{i + 1}</td>
                <td className={`py-1 px-1 font-bold ${row.qualificationStatus === 'qualified' ? 'text-[#22c55e]' : row.qualificationStatus === 'eliminated' ? 'text-[#ef4444]' : 'text-white'}`}>
                  {row.team}
                </td>
                <td className="py-1 px-1 text-center text-[#d5f8b6]">{row.played}</td>
                <td className="py-1 px-1 text-center text-[#d5f8b6]">{row.wins}</td>
                <td className="py-1 px-1 text-center text-[#d5f8b6]">{row.draws}</td>
                <td className="py-1 px-1 text-center text-[#d5f8b6]">{row.losses}</td>
                <td className="py-1 px-1 text-center text-[#d5f8b6]">{row.goalsFor}</td>
                <td className="py-1 px-1 text-center text-[#d5f8b6]">{row.goalsAgainst}</td>
                <td className="py-1 px-1 text-center text-[#d5f8b6]">{row.goalDifference > 0 ? '+' : ''}{row.goalDifference}</td>
                <td className="py-1 px-1 text-center font-black text-[#efe56b]">{row.points}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-2 flex gap-3 text-[9px]">
        <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 bg-[#22c55e]" /> Qualified</span>
        <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 bg-[#eab308]" /> Playoff</span>
        <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 bg-[#ef4444]" /> Eliminated</span>
      </div>
    </Card>
  );
}

/* ── Feedback generator ── */

function generateFeedback(cup: CupCompetition): string[] {
  const msgs: string[] = [];

  if (cup.status === 'won') {
    msgs.push('Congratulations! The club has won the trophy. A fantastic achievement for the players and fans.');
  } else if (cup.status === 'eliminated') {
    if (cup.type === 'european') {
      msgs.push('European elimination is a blow to the club\'s finances and prestige.');
    } else {
      msgs.push('The board is disappointed with the early cup exit and expects a response in the league.');
    }
  } else if (cup.status === 'active') {
    if (cup.stats.wins >= 3) {
      msgs.push('The cup run is building momentum. The fans are dreaming of a trip to Wembley.');
    }
    if (cup.type === 'european') {
      msgs.push('European qualification is crucial for club finances and reputation.');
      msgs.push('Fixture congestion from European commitments may require squad rotation.');
    } else {
      msgs.push('Fans expect a strong home performance in the next round.');
    }
    const next = cup.fixtures.find((f) => f.status === 'upcoming');
    if (next && next.homeAway === 'away') {
      msgs.push('An away draw will test the squad\'s resilience.');
    }
  }

  if (msgs.length === 0) {
    msgs.push('The competition has not yet started. Preparations are underway.');
  }

  return msgs;
}

/* ══════════════════════════════════════════════
   Main Component
   ══════════════════════════════════════════════ */

export default function CupCenter({ activeClub }: CupCenterProps) {
  const cups = useMemo(() => generateCups(activeClub), [activeClub]);

  const [filter, setFilter] = useState<FilterKey>('all');
  const [selectedCupId, setSelectedCupId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (filter === 'domestic') return cups.filter((c) => c.type === 'domestic');
    if (filter === 'european') return cups.filter((c) => c.type === 'european');
    return cups;
  }, [cups, filter]);

  const selectedCup = selectedCupId ? cups.find((c) => c.id === selectedCupId) ?? null : null;

  const filterButtons: { key: FilterKey; label: string }[] = [
    { key: 'all', label: `All Cups (${cups.length})` },
    { key: 'domestic', label: `Domestic (${cups.filter((c) => c.type === 'domestic').length})` },
    { key: 'european', label: `European (${cups.filter((c) => c.type === 'european').length})` },
  ];

  return (
    <section className="border-4 border-[#6f4ca1] bg-[#16a51c] p-3">
      {/* Title */}
      <h2 className="mb-3 border border-[#ceb8e1] bg-[#d5b5ec] p-2 text-center text-sm font-bold uppercase text-[#2e1f4a]">
        Cup Competitions
      </h2>

      {/* Filter + back */}
      <div className="mb-2 flex flex-wrap items-center gap-1">
        {selectedCup && (
          <button
            type="button"
            onClick={() => setSelectedCupId(null)}
            className="mr-2 border border-[#efe56b] bg-[#2a8a2b] px-2 py-0.5 text-[10px] font-bold text-[#efe56b] hover:bg-[#1f641d]"
          >
            ← All Cups
          </button>
        )}
        {!selectedCup && filterButtons.map((fb) => (
          <button
            key={fb.key}
            type="button"
            onClick={() => setFilter(fb.key)}
            className={`border px-2 py-0.5 text-[10px] font-bold uppercase ${
              filter === fb.key
                ? 'border-[#efe56b] bg-[#2a8a2b] text-[#efe56b]'
                : 'border-[#1a5a1e] bg-[#0d3f10] text-[#98ca7a] hover:bg-[#1a4a1e]'
            }`}
          >
            {fb.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {cups.length === 0 ? (
        <div className="border-2 border-[#2a8a2b] bg-[#0d3f10] p-8 text-center">
          <p className="text-sm italic text-[#6b9a5a]">No cup competitions available this season.</p>
        </div>
      ) : selectedCup ? (
        <CompetitionDetail cup={selectedCup} />
      ) : (
        <AllCupsOverview cups={filtered} onSelect={setSelectedCupId} />
      )}
    </section>
  );
}
