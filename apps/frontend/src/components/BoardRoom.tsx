import { useMemo, useState, useCallback } from 'react';
import type { ManagerSummary } from '@tmt/shared';
import { loadGameState } from '../engine/footballEngine';

/* ── Interfaces ── */

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
  morale: number;
  stamina: number;
  form: number;
  potential: number;
  played: number;
  scored: number;
  wage?: number;
}

interface BoardRoomProps {
  activeClub: Club;
  summary: ManagerSummary | null;
  squadPlayers: SquadPlayer[];
}

/* ── Helpers ── */

function seededRandom(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  s = (s * 16807) % 2147483647;
  return (s - 1) / 2147483646;
}

function hashStr(str: string) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function pickSeeded<T>(arr: T[], seed: number): T {
  return arr[Math.floor(seededRandom(seed) * arr.length)];
}

/* ── Derived board data ── */

function deriveBoardData(club: Club, summary: ManagerSummary | null, squad: SquadPlayer[]) {
  const seed = hashStr(club.id + club.name);

  // ── Read real game state data ──
  const gameState = loadGameState();
  let myStanding: { played: number; won: number; drawn: number; lost: number; gf: number; points: number; form: string } | null = null;
  let myLeaguePosition = 0;
  let myLeagueSize = 0;
  if (gameState) {
    // Find the league containing this club
    const leagues = Object.values(gameState.leagues);
    for (const league of leagues) {
      const idx = league.standings.findIndex((s) => s.teamId === club.id || s.teamName === club.name);
      if (idx >= 0) {
        myStanding = league.standings[idx];
        myLeaguePosition = idx + 1; // already sorted by points
        myLeagueSize = league.standings.length;
        break;
      }
    }
  }

  // League info
  const division = club.leagueName ?? club.country ?? '1st Division';

  // Squad derived stats (still from squad props)
  const avgAge = squad.length > 0 ? Math.round(squad.reduce((s, p) => s + p.age, 0) / squad.length) : 0;
  const avgMorale = squad.length > 0 ? Math.round(squad.reduce((s, p) => s + p.morale, 0) / squad.length) : 0;

  // Real match stats from game state, fall back to squad props
  const totalGoals = myStanding ? myStanding.gf : squad.reduce((s, p) => s + (p.scored ?? 0), 0);
  const totalPlayed = myStanding ? myStanding.played : Math.max(...squad.map((p) => p.played ?? 0), 0);

  // Budget / finance estimates
  const transferBudget = club.budget;
  const wageBudget = Math.round(transferBudget * 0.6);
  const currentWageSpend = Math.round(wageBudget * (0.55 + seededRandom(seed + 7) * 0.35));
  const remainingTransfer = Math.round(transferBudget - transferBudget * (0.05 + seededRandom(seed + 3) * 0.25));

  // Board confidence — prefer real game state results
  const baseConfidence = (() => {
    const st = myStanding;
    if (st && st.played > 0) {
      // Win rate drives confidence: 50% base, wins push up, losses push down
      const winRate = st.won / st.played;
      const lossRate = st.lost / st.played;
      return Math.min(95, Math.max(25, Math.round(50 + winRate * 40 - lossRate * 25)));
    }
    if (summary) {
      return Math.min(95, Math.max(25,
        50 + summary.totalWins * 3 - summary.totalLosses * 2 + summary.successiveWins * 5 - summary.successiveLosses * 4
      ));
    }
    return Math.round(40 + seededRandom(seed + 1) * 40);
  })();

  // League position — from real game state
  const leaguePosition = myLeaguePosition > 0
    ? myLeaguePosition
    : Math.max(1, Math.round(1 + seededRandom(seed + 2) * Math.max(23, myLeagueSize - 1)));

  // Form — from real game state (string "WWDLL" → array)
  const form = (() => {
    if (myStanding?.form && myStanding.form.length > 0) {
      // Pad to 5 if fewer than 5 matches played, most recent last
      const chars = myStanding.form.split('');
      while (chars.length < 5) chars.unshift('-');
      return chars.slice(-5);
    }
    const formOptions = ['W', 'D', 'L'];
    return Array.from({ length: 5 }, (_, i) => pickSeeded(formOptions, seed + 10 + i));
  })();

  // Morale text
  const moraleText = avgMorale >= 75 ? 'High' : avgMorale >= 50 ? 'Medium' : avgMorale >= 30 ? 'Low' : 'Very Low';

  // Objectives
  const leagueObjectives: Record<string, string> = {
    'Premier League': 'Mid-table finish',
    Championship: 'Top half finish',
    'League One': 'Promotion push',
    'League Two': 'Avoid relegation'
  };
  const leagueObjective = leagueObjectives[division] ?? pickSeeded(
    ['Top 10 finish', 'Secure a playoff spot', 'Fight for promotion', 'Comfortable mid-table finish'],
    seed + 20
  );

  const cupObjective = pickSeeded(
    ['Reach Round 4', 'Quarter-final place', 'Progress past Round 3', 'Make a decent cup run'],
    seed + 21
  );

  const financeObjective = pickSeeded(
    ['Stay within the wage budget', 'Generate transfer profit', 'Reduce overall wage bill', 'Balance the books by end of season'],
    seed + 22
  );

  const youthObjective = pickSeeded(
    ['Integrate 2 youth players into the first team', 'Develop academy prospects', 'Give youth players regular game time', 'Promote at least 1 academy player'],
    seed + 23
  );

  // Board messages — prefer real game state data
  const boardMessages: string[] = [];

  // Use real standing data if available
  const recentForm = myStanding?.form ?? '';
  const recentWins = [...recentForm].filter((c) => c === 'W').length;
  const recentLosses = [...recentForm].filter((c) => c === 'L').length;

  if (myStanding && myStanding.played > 0) {
    if (recentWins >= 3) {
      boardMessages.push('The board is delighted with the current winning run. Keep it up!');
    } else if (recentLosses >= 3) {
      boardMessages.push('The board is concerned about the recent string of defeats. Improvement is expected.');
    } else if (myStanding.won > myStanding.lost) {
      boardMessages.push('The board is generally satisfied with performances this season.');
    } else {
      boardMessages.push('The board expects better results going forward.');
    }
    // Position context
    if (myLeaguePosition > 0 && myLeagueSize > 0) {
      const relPos = myLeaguePosition / myLeagueSize;
      if (relPos <= 0.25) {
        boardMessages.push(`${myLeaguePosition}th place — you are in excellent form. The board is very pleased.`);
      } else if (relPos > 0.75) {
        boardMessages.push(`${myLeaguePosition}th place — the board expects improvement in league position.`);
      }
    }
  } else if (summary) {
    if (summary.successiveWins >= 3) {
      boardMessages.push('The board is delighted with the current winning run. Keep it up!');
    } else if (summary.successiveLosses >= 3) {
      boardMessages.push('The board is concerned about the recent string of defeats. Improvement is expected.');
    } else if (summary.totalWins > summary.totalLosses) {
      boardMessages.push('The board is generally satisfied with performances this season.');
    } else {
      boardMessages.push('The board expects better results going forward.');
    }
  }

  if (avgMorale < 40) {
    boardMessages.push('Player morale is worryingly low. The board urges you to address squad harmony.');
  } else if (avgMorale > 75) {
    boardMessages.push('The dressing room atmosphere is excellent. Players are motivated and focused.');
  }

  if (currentWageSpend > wageBudget * 0.9) {
    boardMessages.push('Wage spending is approaching the budget ceiling. Exercise caution in the transfer market.');
  }

  if (boardMessages.length === 0) {
    boardMessages.push(pickSeeded([
      'The board is monitoring the situation closely and expects steady progress.',
      'Continue building on recent performances. The board is watching patiently.',
      'Stability is key. The board wants consistent results over the coming months.',
      'The supporters are behind the team. The board hopes you can maintain their confidence.'
    ], seed + 30));
  }

  /* ── Revenue streams ── */

  // Stadium
  const stadiumCapacity = Math.round(8000 + seededRandom(seed + 50) * 52000);
  const stadiumName = pickSeeded(
    [`${club.name} Stadium`, `The ${club.name} Arena`, `${club.name} Park`, `${club.name} Ground`],
    seed + 51
  );
  const facilityLevel = Math.min(5, Math.max(1, Math.round(1 + (club.reputation / 25))));
  const facilityLabels: Record<number, string> = { 1: 'Basic', 2: 'Adequate', 3: 'Good', 4: 'Excellent', 5: 'World-Class' };

  // Matchday revenue (base values — user can override prices)
  const avgAttendance = Math.round(stadiumCapacity * (0.6 + seededRandom(seed + 52) * 0.35));
  const defaultTicketPrice = Math.round(18 + seededRandom(seed + 53) * 62);
  const seasonTicketHolders = Math.round(avgAttendance * (0.35 + seededRandom(seed + 54) * 0.3));
  const defaultHospitalityPrice = Math.round(5000 + seededRandom(seed + 55) * 45000);
  const defaultCateringPrice = Math.round(avgAttendance * (2 + seededRandom(seed + 56) * 6));
  const matchesPlayed = Math.max(totalPlayed, Math.round(8 + seededRandom(seed + 57) * 20));

  // Sponsors
  const sponsorTiers = [
    { tier: 'Main Shirt Sponsor', company: pickSeeded(['Emirates', 'Etihad Airways', 'AIA', 'Three', 'TeamViewer', 'Stake.com', 'Spotify', 'Jeep', 'Rakuten', 'Standard Chartered', 'Vodafone', 'Fly Better'], seed + 60), value: Math.round(transferBudget * (0.08 + seededRandom(seed + 61) * 0.12)) },
    { tier: 'Sleeve Sponsor', company: pickSeeded(['Visit Rwanda', 'Cinch', 'Konami', 'CoinJar', 'Travelodge', 'Cadbury', 'Cazoo'], seed + 62), value: Math.round(transferBudget * (0.02 + seededRandom(seed + 63) * 0.04)) },
    { tier: 'Training Kit Sponsor', company: pickSeeded(['SAP', 'Trivago', 'Castore', 'BetVictor', 'Iqoniq', 'Cinch'], seed + 64), value: Math.round(transferBudget * (0.01 + seededRandom(seed + 65) * 0.03)) },
    { tier: 'Stadium Naming Rights', company: pickSeeded(['Emirates', 'Etihad', 'Amex', 'Tottenham Hotspur', 'St. James\' Park', 'Gtech Community', 'Vitality'], seed + 66), value: Math.round(transferBudget * (0.03 + seededRandom(seed + 67) * 0.07)) },
    { tier: 'Official Kit Manufacturer', company: pickSeeded(['Nike', 'Adidas', 'Puma', 'New Balance', 'Umbro', 'Under Armour', 'Castore', 'Macron', 'Joma'], seed + 68), value: Math.round(transferBudget * (0.04 + seededRandom(seed + 69) * 0.08)) },
  ];
  const totalSponsorIncome = sponsorTiers.reduce((s, t) => s + t.value, 0);

  // Merchandise (base values — user can override prices)
  const kitSalesVolume = Math.round(4000 + seededRandom(seed + 70) * 96000);
  const defaultKitPrice = Math.round(50 + seededRandom(seed + 71) * 40);
  const scarfSalesVolume = Math.round(kitSalesVolume * (0.3 + seededRandom(seed + 72) * 0.4));
  const defaultScarfPrice = Math.round(12 + seededRandom(seed + 73) * 10);
  const defaultProgrammePrice = Math.round(3 + seededRandom(seed + 74) * 4);
  const defaultOnlineMarkup = Math.round(10 + seededRandom(seed + 75) * 15); // percentage

  // Facilities (base levels — user can upgrade)
  const defaultFacilities = [
    { name: 'Training Ground', baseLevel: Math.min(5, facilityLevel + Math.round(seededRandom(seed + 80) * 1.5 - 0.5)), upgradeCost: Math.round(transferBudget * (0.15 + seededRandom(seed + 81) * 0.1)) },
    { name: 'Youth Academy', baseLevel: Math.min(5, facilityLevel + Math.round(seededRandom(seed + 82) * 1 - 0.5)), upgradeCost: Math.round(transferBudget * (0.1 + seededRandom(seed + 83) * 0.1)) },
    { name: 'Medical Centre', baseLevel: Math.min(5, facilityLevel + Math.round(seededRandom(seed + 84) * 1 - 0.5)), upgradeCost: Math.round(transferBudget * (0.08 + seededRandom(seed + 85) * 0.08)) },
    { name: 'Stadium Expansion', baseLevel: facilityLevel, upgradeCost: Math.round(transferBudget * (0.3 + seededRandom(seed + 86) * 0.4)) },
    { name: 'Corporate Hospitality', baseLevel: Math.min(5, Math.max(1, facilityLevel - 1 + Math.round(seededRandom(seed + 87) * 2))), upgradeCost: Math.round(transferBudget * (0.05 + seededRandom(seed + 88) * 0.1)) },
    { name: 'Fan Zone & Club Shop', baseLevel: Math.min(5, Math.max(1, facilityLevel - 1 + Math.round(seededRandom(seed + 89) * 2))), upgradeCost: Math.round(transferBudget * (0.03 + seededRandom(seed + 90) * 0.05)) },
  ];

  return {
    division,
    leaguePosition,
    form,
    moraleText,
    avgAge,
    avgMorale,
    totalGoals,
    totalPlayed,
    transferBudget,
    wageBudget,
    currentWageSpend,
    remainingTransfer,
    baseConfidence,
    leagueObjective,
    cupObjective,
    financeObjective,
    youthObjective,
    boardMessages,
    // Revenue base data
    stadiumName,
    stadiumCapacity,
    avgAttendance,
    defaultTicketPrice,
    seasonTicketHolders,
    defaultHospitalityPrice,
    defaultCateringPrice,
    matchesPlayed,
    sponsorTiers,
    totalSponsorIncome,
    kitSalesVolume,
    defaultKitPrice,
    scarfSalesVolume,
    defaultScarfPrice,
    defaultProgrammePrice,
    defaultOnlineMarkup,
    defaultFacilities,
    facilityLabels,
    facilityLevel,
  };
}

/* ── Sub-components ── */

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-2 border-[#2a8a2b] bg-[#0d3f10]">
      <h3 className="border-b-2 border-[#2a8a2b] bg-[#1f641d] px-3 py-1.5 text-xs font-black uppercase tracking-wider text-[#efe56b]">
        {title}
      </h3>
      <div className="p-3">{children}</div>
    </div>
  );
}

function StatRow({ label, value, highlight }: { label: string; value: string | number; highlight?: boolean }) {
  return (
    <div className="flex justify-between border-b border-[#1a5a1e] py-1 last:border-0">
      <span className="text-[#98ca7a]">{label}</span>
      <span className={highlight ? 'font-black text-[#efe56b]' : 'font-bold text-white'}>{value}</span>
    </div>
  );
}

function ObjectiveRow({ category, description, status }: { category: string; description: string; status: 'on-track' | 'at-risk' | 'behind' }) {
  const statusColors = {
    'on-track': 'bg-[#22c55e] text-[#0a2e0d]',
    'at-risk': 'bg-[#eab308] text-[#2e1f4a]',
    behind: 'bg-[#ef4444] text-white'
  };
  const statusLabels = {
    'on-track': 'On Track',
    'at-risk': 'At Risk',
    behind: 'Behind'
  };

  return (
    <div className="flex items-start gap-2 border-b border-[#1a5a1e] py-1.5 last:border-0">
      <div className="flex-1">
        <span className="text-xs font-bold uppercase text-[#efe56b]">{category}</span>
        <p className="text-sm text-[#d5f8b6]">{description}</p>
      </div>
      <span className={`shrink-0 rounded px-2 py-0.5 text-[10px] font-black uppercase ${statusColors[status]}`}>
        {statusLabels[status]}
      </span>
    </div>
  );
}

function ConfidenceBar({ value }: { value: number }) {
  const color = value >= 70 ? 'bg-[#22c55e]' : value >= 45 ? 'bg-[#eab308]' : 'bg-[#ef4444]';
  return (
    <div className="mt-1">
      <div className="flex justify-between text-xs">
        <span className="text-[#98ca7a]">Board Confidence</span>
        <span className="font-black text-[#efe56b]">{value}%</span>
      </div>
      <div className="mt-1 h-3 w-full overflow-hidden rounded-sm bg-[#1a3a1e]">
        <div className={`h-full rounded-sm ${color} transition-all`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function FormDisplay({ form }: { form: string[] }) {
  return (
    <div className="flex gap-1">
      {form.map((r, i) => {
        const bg = r === 'W' ? 'bg-[#22c55e]' : r === 'D' ? 'bg-[#eab308]' : r === 'L' ? 'bg-[#ef4444]' : 'bg-[#3a5a3e]';
        return (
          <span key={i} className={`inline-flex h-6 w-6 items-center justify-center rounded-sm text-[10px] font-black text-white ${bg}`}>
            {r}
          </span>
        );
      })}
    </div>
  );
}

function PriceControl({ label, value, min, max, step, unit, onChange }: {
  label: string; value: number; min: number; max: number; step: number; unit: string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="border-b border-[#1a5a1e] py-1.5 last:border-0">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[#98ca7a] text-xs">{label}</span>
        <span className="font-black text-[#efe56b] text-xs">{unit}{value.toLocaleString()}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-2 appearance-none rounded bg-[#1a3a1e] accent-[#22c55e] cursor-pointer [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#efe56b] [&::-webkit-slider-thumb]:appearance-none"
      />
      <div className="flex justify-between text-[9px] text-[#6b9a5a]">
        <span>{unit}{min.toLocaleString()}</span>
        <span>{unit}{max.toLocaleString()}</span>
      </div>
    </div>
  );
}

function ActionButton({ label, cost, disabled, onClick }: {
  label: string; cost: string; disabled: boolean; onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`w-full border px-2 py-1 text-[10px] font-bold transition-colors ${
        disabled
          ? 'border-[#1a3a1e] bg-[#0a2e0d] text-[#3a5a3e] cursor-not-allowed'
          : 'border-[#efe56b] bg-[#2a8a2b] text-[#efe56b] hover:bg-[#22c55e] hover:text-[#0a2e0d]'
      }`}
    >
      {label} — {cost}
    </button>
  );
}

/* ── Main component ── */

export default function BoardRoom({ activeClub, summary, squadPlayers }: BoardRoomProps) {
  const data = useMemo(
    () => deriveBoardData(activeClub, summary, squadPlayers),
    [activeClub, summary, squadPlayers]
  );

  // ── Interactive state: Matchday pricing ──
  const [ticketPrice, setTicketPrice] = useState(data.defaultTicketPrice);
  const [hospitalityPrice, setHospitalityPrice] = useState(data.defaultHospitalityPrice);
  const [cateringPrice, setCateringPrice] = useState(data.defaultCateringPrice);

  // ── Interactive state: Merchandise pricing ──
  const [kitPrice, setKitPrice] = useState(data.defaultKitPrice);
  const [scarfPrice, setScarfPrice] = useState(data.defaultScarfPrice);
  const [programmePrice, setProgrammePrice] = useState(data.defaultProgrammePrice);
  const [onlineMarkup, setOnlineMarkup] = useState(data.defaultOnlineMarkup);

  // ── Interactive state: Facility upgrades ──
  const [facilityLevels, setFacilityLevels] = useState<Record<string, number>>(() => {
    const lvls: Record<string, number> = {};
    data.defaultFacilities.forEach((f) => { lvls[f.name] = f.baseLevel; });
    return lvls;
  });
  const [totalUpgradeSpent, setTotalUpgradeSpent] = useState(0);
  const [upgradeLog, setUpgradeLog] = useState<string[]>([]);

  // ── Derived calculations (reactive to user changes) ──

  // Attendance impact: higher ticket prices reduce attendance slightly
  const priceRatio = ticketPrice / data.defaultTicketPrice;
  const attendanceMultiplier = Math.max(0.5, Math.min(1.1, 1.15 - 0.15 * priceRatio));
  const effectiveAttendance = Math.round(data.avgAttendance * attendanceMultiplier);
  const seasonTicketPrice = ticketPrice * 19;

  const totalMatchdayRevenue =
    effectiveAttendance * ticketPrice * data.matchesPlayed +
    data.seasonTicketHolders * seasonTicketPrice +
    hospitalityPrice * data.matchesPlayed +
    cateringPrice * data.matchesPlayed;

  // Merchandise: price affects demand
  const kitDemandMultiplier = Math.max(0.4, Math.min(1.2, 1.2 - 0.004 * (kitPrice - 40)));
  const effectiveKitSales = Math.round(data.kitSalesVolume * kitDemandMultiplier);
  const scarfDemandMultiplier = Math.max(0.5, Math.min(1.2, 1.15 - 0.01 * (scarfPrice - 10)));
  const effectiveScarfSales = Math.round(data.scarfSalesVolume * scarfDemandMultiplier);
  const programmesSold = Math.round(effectiveAttendance * 0.15 * data.matchesPlayed);
  const onlineMerchRevenue = Math.round(effectiveKitSales * kitPrice * (onlineMarkup / 100));
  const totalMerchRevenue = effectiveKitSales * kitPrice + effectiveScarfSales * scarfPrice + programmesSold * programmePrice + onlineMerchRevenue;

  const totalSeasonRevenue = totalMatchdayRevenue + data.totalSponsorIncome + totalMerchRevenue;

  // Facility upgrade handler
  const handleUpgrade = useCallback((facilityName: string, cost: number) => {
    setFacilityLevels((prev) => ({ ...prev, [facilityName]: Math.min(5, (prev[facilityName] ?? 1) + 1) }));
    setTotalUpgradeSpent((prev) => prev + cost);
    setUpgradeLog((prev) => [...prev, `Upgraded ${facilityName} — €${cost.toLocaleString()}`]);
  }, []);

  // Determine objective statuses from board data
  const leagueStatus: 'on-track' | 'at-risk' | 'behind' =
    data.leaguePosition <= 10 ? 'on-track' : data.leaguePosition <= 16 ? 'at-risk' : 'behind';
  const cupStatus: 'on-track' | 'at-risk' | 'behind' =
    data.baseConfidence >= 55 ? 'on-track' : data.baseConfidence >= 40 ? 'at-risk' : 'behind';
  const financeStatus: 'on-track' | 'at-risk' | 'behind' =
    data.currentWageSpend <= data.wageBudget * 0.8 ? 'on-track' : data.currentWageSpend <= data.wageBudget ? 'at-risk' : 'behind';
  const youthStatus: 'on-track' | 'at-risk' | 'behind' = pickSeeded(
    ['on-track', 'at-risk', 'behind'] as const,
    hashStr(activeClub.id) + 40
  );

  return (
    <section className="border-4 border-[#6f4ca1] bg-[#16a51c] p-3">
      {/* Title */}
      <h2 className="mb-3 border border-[#ceb8e1] bg-[#d5b5ec] p-2 text-center text-sm font-bold uppercase text-[#2e1f4a]">
        Board Room
      </h2>

      {/* Grid */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {/* 1. Board Objectives */}
        <Card title="Board Objectives">
          <ObjectiveRow category="League" description={data.leagueObjective} status={leagueStatus} />
          <ObjectiveRow category="Cup" description={data.cupObjective} status={cupStatus} />
          <ObjectiveRow category="Finance" description={data.financeObjective} status={financeStatus} />
          <ObjectiveRow category="Youth" description={data.youthObjective} status={youthStatus} />
        </Card>

        {/* 2. Financial Overview */}
        <Card title="Financial Overview">
          <StatRow label="Transfer Budget" value={`€${data.transferBudget.toLocaleString()}`} />
          <StatRow label="Wage Budget" value={`€${data.wageBudget.toLocaleString()}`} />
          <StatRow
            label="Current Wage Spend"
            value={`€${data.currentWageSpend.toLocaleString()}`}
            highlight={data.currentWageSpend > data.wageBudget * 0.9}
          />
          <StatRow label="Remaining Transfer Funds" value={`€${data.remainingTransfer.toLocaleString()}`} highlight />
          <StatRow label="Club Value" value={`€${data.transferBudget.toLocaleString()}`} />
        </Card>

        {/* 3. Club Status */}
        <Card title="Club Status &amp; Performance">
          <StatRow label="Division" value={data.division} />
          <StatRow label="League Position" value={`${data.leaguePosition}${ordinal(data.leaguePosition)}`} highlight />
          <div className="flex items-center justify-between border-b border-[#1a5a1e] py-1">
            <span className="text-[#98ca7a]">Current Form</span>
            <FormDisplay form={data.form} />
          </div>
          <StatRow label="Morale" value={data.moraleText} />
          <StatRow label="Average Age" value={data.avgAge} />
          <StatRow label="Goals Scored" value={data.totalGoals} />
          <StatRow label="Matches Played" value={data.totalPlayed} />
          <ConfidenceBar value={data.baseConfidence} />
        </Card>

        {/* 4. Board Feedback */}
        <Card title="Board Feedback">
          {summary ? (
            <div className="space-y-3">
              <div className="space-y-2">
                {data.boardMessages.map((msg, i) => (
                  <p key={i} className="border-l-2 border-[#efe56b] pl-2 text-sm leading-snug text-[#d5f8b6]">
                    {msg}
                  </p>
                ))}
              </div>
              <div className="border-t border-[#2a8a2b] pt-2">
                <p className="text-[10px] font-bold uppercase text-[#98ca7a]">Manager Profile</p>
                <div className="mt-1 grid grid-cols-2 gap-x-4">
                  <StatRow label="Status" value={summary.status} />
                  <StatRow label="Level" value={summary.level} />
                  <StatRow label="Wins" value={summary.totalWins} />
                  <StatRow label="Losses" value={summary.totalLosses} />
                  <StatRow label="Draws" value={summary.totalDraws} />
                  <StatRow label="Successes" value={summary.successes} />
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="border-l-2 border-[#efe56b] pl-2 text-sm leading-snug text-[#d5f8b6]">
                The board is reviewing the current situation. A full summary will be available shortly.
              </p>
              <p className="text-xs italic text-[#6b9a5a]">
                Manager data is being compiled. Check back after your next match.
              </p>
            </div>
          )}
        </Card>
      </div>

      {/* Revenue Streams Header */}
      <h2 className="mt-4 mb-3 border border-[#ceb8e1] bg-[#d5b5ec] p-2 text-center text-sm font-bold uppercase text-[#2e1f4a]">
        Revenue &amp; Club Income
      </h2>

      {/* Revenue total bar */}
      <div className="mb-3 border-2 border-[#efe56b] bg-[#1a3a1e] px-3 py-2 text-center">
        <span className="text-xs text-[#98ca7a]">Estimated Season Revenue</span>
        <p className="text-lg font-black text-[#efe56b]">€{totalSeasonRevenue.toLocaleString()}</p>
        <div className="mt-1 flex justify-center gap-4 text-[10px] text-[#d5f8b6]">
          <span>Matchday: <strong className="text-white">€{totalMatchdayRevenue.toLocaleString()}</strong></span>
          <span>Sponsors: <strong className="text-white">€{data.totalSponsorIncome.toLocaleString()}</strong></span>
          <span>Merchandise: <strong className="text-white">€{totalMerchRevenue.toLocaleString()}</strong></span>
        </div>
        {totalUpgradeSpent > 0 && (
          <p className="mt-1 text-[10px] text-[#ef4444]">Facility investments: −€{totalUpgradeSpent.toLocaleString()}</p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {/* 5. Sponsor Deals */}
        <Card title="Sponsor Deals">
          <div className="space-y-0">
            {data.sponsorTiers.map((sp) => (
              <div key={sp.tier} className="flex items-center justify-between border-b border-[#1a5a1e] py-1.5 last:border-0">
                <div>
                  <span className="text-xs font-bold text-[#efe56b]">{sp.tier}</span>
                  <p className="text-xs text-[#d5f8b6]">{sp.company}</p>
                </div>
                <span className="shrink-0 font-bold text-white text-xs">€{sp.value.toLocaleString()}<span className="text-[9px] text-[#6b9a5a]">/yr</span></span>
              </div>
            ))}
          </div>
          <div className="mt-2 border-t-2 border-[#2a8a2b] pt-2">
            <StatRow label="Total Sponsor Income" value={`€${data.totalSponsorIncome.toLocaleString()}`} highlight />
          </div>
        </Card>

        {/* 6. Matchday Revenue — INTERACTIVE */}
        <Card title="⚙ Matchday Revenue — Set Prices">
          <p className="mb-2 text-[10px] text-[#98ca7a]">{data.stadiumName} — Capacity: <strong className="text-white">{data.stadiumCapacity.toLocaleString()}</strong></p>

          <PriceControl label="Ticket Price" value={ticketPrice} min={10} max={150} step={1} unit="€" onChange={setTicketPrice} />
          <PriceControl label="Hospitality (per match)" value={hospitalityPrice} min={1000} max={100000} step={500} unit="€" onChange={setHospitalityPrice} />
          <PriceControl label="Catering Budget (per match)" value={cateringPrice} min={500} max={80000} step={500} unit="€" onChange={setCateringPrice} />

          <div className="mt-2 border-t border-[#2a8a2b] pt-2 space-y-0.5">
            <StatRow label="Effective Attendance" value={`${effectiveAttendance.toLocaleString()} (${Math.round((effectiveAttendance / data.stadiumCapacity) * 100)}%)`} />
            {attendanceMultiplier < 0.95 && (
              <p className="text-[9px] text-[#eab308]">⚠ High ticket prices are reducing attendance by {Math.round((1 - attendanceMultiplier) * 100)}%</p>
            )}
            {attendanceMultiplier > 1.0 && (
              <p className="text-[9px] text-[#22c55e]">✓ Affordable tickets boosting attendance by {Math.round((attendanceMultiplier - 1) * 100)}%</p>
            )}
            <StatRow label="Season Ticket Holders" value={data.seasonTicketHolders.toLocaleString()} />
            <StatRow label="Season Ticket Price" value={`€${seasonTicketPrice.toLocaleString()}`} />
            <StatRow label="Home Matches Played" value={data.matchesPlayed} />
          </div>
          <div className="mt-2 border-t-2 border-[#2a8a2b] pt-2">
            <StatRow label="Total Matchday Revenue" value={`€${totalMatchdayRevenue.toLocaleString()}`} highlight />
          </div>
        </Card>

        {/* 7. Stadium & Facilities — INTERACTIVE UPGRADES */}
        <Card title="⚙ Stadium &amp; Facilities — Manage">
          <div className="mb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#98ca7a]">Overall Facility Rating</span>
              <span className="text-xs font-black text-[#efe56b]">{data.facilityLabels[data.facilityLevel]}</span>
            </div>
            <div className="mt-1 flex gap-0.5">
              {Array.from({ length: 5 }, (_, i) => (
                <div key={i} className={`h-2 flex-1 ${i < data.facilityLevel ? 'bg-[#22c55e]' : 'bg-[#1a3a1e]'}`} />
              ))}
            </div>
          </div>
          {data.defaultFacilities.map((fac) => {
            const currentLevel = facilityLevels[fac.name] ?? fac.baseLevel;
            const canUpgrade = currentLevel < 5;
            const nextCost = Math.round(fac.upgradeCost * (1 + (currentLevel - fac.baseLevel) * 0.5));
            return (
              <div key={fac.name} className="border-b border-[#1a5a1e] py-2 last:border-0">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <span className="text-xs text-[#d5f8b6]">{fac.name}</span>
                    <div className="mt-0.5 flex gap-0.5">
                      {Array.from({ length: 5 }, (_, i) => (
                        <div key={i} className={`h-1.5 w-4 ${i < currentLevel ? 'bg-[#22c55e]' : 'bg-[#1a3a1e]'}`} />
                      ))}
                    </div>
                  </div>
                  <span className="text-[10px] text-[#98ca7a] mr-2">Lv. {currentLevel}</span>
                </div>
                {canUpgrade && (
                  <div className="mt-1">
                    <ActionButton
                      label={`Upgrade to Lv. ${currentLevel + 1}`}
                      cost={`€${nextCost.toLocaleString()}`}
                      disabled={false}
                      onClick={() => handleUpgrade(fac.name, nextCost)}
                    />
                  </div>
                )}
                {!canUpgrade && (
                  <p className="mt-1 text-[9px] text-[#22c55e]">✓ Maximum level reached</p>
                )}
              </div>
            );
          })}
          {totalUpgradeSpent > 0 && (
            <div className="mt-2 border-t-2 border-[#2a8a2b] pt-2">
              <StatRow label="Total Invested" value={`€${totalUpgradeSpent.toLocaleString()}`} highlight />
              <div className="mt-1 max-h-20 overflow-y-auto">
                {upgradeLog.map((msg, i) => (
                  <p key={i} className="text-[9px] text-[#98ca7a]">✓ {msg}</p>
                ))}
              </div>
            </div>
          )}
        </Card>

        {/* 8. Merchandise & Supporter Products — INTERACTIVE */}
        <Card title="⚙ Merchandise &amp; Products — Set Prices">
          <PriceControl label="Kit Price" value={kitPrice} min={30} max={120} step={1} unit="€" onChange={setKitPrice} />
          <PriceControl label="Scarf Price" value={scarfPrice} min={5} max={35} step={1} unit="€" onChange={setScarfPrice} />
          <PriceControl label="Programme Price" value={programmePrice} min={1} max={12} step={1} unit="€" onChange={setProgrammePrice} />
          <PriceControl label="Online Shop Markup" value={onlineMarkup} min={5} max={40} step={1} unit="" onChange={setOnlineMarkup} />
          {onlineMarkup > 0 && (
            <p className="text-[9px] text-[#6b9a5a] -mt-1 mb-1">Online adds {onlineMarkup}% on top of kit revenue</p>
          )}

          <div className="mt-2 border-t border-[#2a8a2b] pt-2 space-y-0.5">
            <StatRow label="Kits Sold" value={effectiveKitSales.toLocaleString()} />
            {kitDemandMultiplier < 0.9 && (
              <p className="text-[9px] text-[#eab308]">⚠ High kit price reducing demand by {Math.round((1 - kitDemandMultiplier) * 100)}%</p>
            )}
            <StatRow label="Scarves Sold" value={effectiveScarfSales.toLocaleString()} />
            <StatRow label="Programmes Sold" value={programmesSold.toLocaleString()} />
            <StatRow label="Online Shop Revenue" value={`€${onlineMerchRevenue.toLocaleString()}`} />
          </div>
          <div className="mt-2 border-t-2 border-[#2a8a2b] pt-2">
            <StatRow label="Total Merchandise Revenue" value={`€${totalMerchRevenue.toLocaleString()}`} highlight />
          </div>
        </Card>
      </div>

      {/* Footer status bar */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border border-[#98ca7a] bg-[#1f641d] px-3 py-1.5 text-xs text-[#d5f8b6]">
        <span>
          Division: <strong className="text-white">{data.division}</strong>
        </span>
        <span>
          Active club: <strong className="text-white">{activeClub.name}</strong>
        </span>
        <span>
          Squad size: <strong className="text-white">{squadPlayers.length}</strong>
        </span>
      </div>
    </section>
  );
}

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}
