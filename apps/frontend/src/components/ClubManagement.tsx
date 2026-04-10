import { useMemo, useState, useCallback } from 'react';

/* ══════════════════════════════════════════════
   Types
   ══════════════════════════════════════════════ */

interface Club {
  id: string;
  name: string;
  country: string;
  budget: number;
  reputation: number;
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

interface ClubManagementProps {
  activeClub: Club;
  squadPlayers: SquadPlayer[];
}

type TabKey = 'overview' | 'tasks' | 'staff' | 'players' | 'board' | 'external' | 'strategy' | 'events';

type Priority = 'low' | 'medium' | 'high';
type TaskStatus = 'active' | 'completed' | 'failed';

interface Task {
  id: string;
  title: string;
  description: string;
  priority: Priority;
  progress: number;
  deadline: string;
  module: string;
  status: TaskStatus;
  delegatedTo: string | null;
}

interface Staff {
  id: string;
  name: string;
  role: string;
  rating: number;
  specialization: string;
  contractYears: number;
  salary: number;
  assignment: string | null;
}

interface GameEvent {
  id: string;
  type: string;
  title: string;
  message: string;
  urgent: boolean;
  resolved: boolean;
  options: { label: string; effect: string; impact: EventImpact }[];
}

interface EventImpact {
  boardConfidence?: number;
  fanSentiment?: number;
  morale?: number;
  budget?: number;
  reputation?: number;
}

interface ClubStatus {
  reputation: number;
  boardConfidence: number;
  fanSentiment: number;
  financialHealth: number;
  jobSecurity: number;
}

interface PlayerRelation {
  playerId: string;
  status: 'happy' | 'neutral' | 'unhappy';
  lastInteraction: string;
}

type PlayStyle = 'attacking' | 'defensive' | 'balanced';
type YouthFocus = 'low' | 'medium' | 'high';
type TransferPolicy = 'buy' | 'develop' | 'sell';
type FinancialStrategy = 'aggressive' | 'balanced' | 'conservative';

interface Strategy {
  playStyle: PlayStyle;
  youthFocus: YouthFocus;
  transferPolicy: TransferPolicy;
  financialStrategy: FinancialStrategy;
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
   Constants
   ══════════════════════════════════════════════ */

const TABS: { key: TabKey; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'tasks', label: 'Tasks' },
  { key: 'staff', label: 'Staff' },
  { key: 'players', label: 'Players' },
  { key: 'board', label: 'Board' },
  { key: 'external', label: 'External' },
  { key: 'strategy', label: 'Strategy' },
  { key: 'events', label: 'Events' },
];

const RETRO = '"Press Start 2P", "Courier New", monospace';
const MONO = '"Courier New", monospace';

/* ══════════════════════════════════════════════
   Retro UI helpers
   ══════════════════════════════════════════════ */

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

function ActionBtn({ children, onClick, variant = 'green', disabled }: {
  children: React.ReactNode;
  onClick: () => void;
  variant?: 'green' | 'red' | 'blue' | 'yellow';
  disabled?: boolean;
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
      disabled={disabled}
      className={`px-2 py-1 text-[9px] font-bold uppercase border transition-colors ${disabled ? 'opacity-40 cursor-not-allowed' : ''} ${colors[variant]}`}
      style={{ fontFamily: MONO, letterSpacing: '0.05em' }}
    >
      {children}
    </button>
  );
}

function StatusBadge({ value, thresholds = [70, 40] }: { value: number; thresholds?: [number, number] }) {
  const color = value >= thresholds[0] ? 'text-[#2a8a2b]' : value >= thresholds[1] ? 'text-[#efe56b]' : 'text-[#ff4444]';
  return <span className={`font-bold font-mono text-[10px] ${color}`}>{value}%</span>;
}

function BarMini({ value, color }: { value: number; color?: string }) {
  const c = color ?? (value >= 70 ? 'bg-[#2a8a2b]' : value >= 40 ? 'bg-[#8a6a1a]' : 'bg-[#8a2a2a]');
  return (
    <div className="w-16 h-2 bg-[#0a2e0d] border border-[#1a5a1e] inline-block align-middle ml-1">
      <div className={`h-full ${c}`} style={{ width: `${Math.min(100, value)}%` }} />
    </div>
  );
}

function Panel({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`border-2 border-[#2a8a2b] bg-[#0d3f10] p-3 ${className}`}>{children}</div>;
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h4 className="text-[10px] font-black uppercase text-[#00e5ff] mb-2" style={{ fontFamily: RETRO }}>{children}</h4>;
}

/* ══════════════════════════════════════════════
   Data generators (seeded)
   ══════════════════════════════════════════════ */

const STAFF_FIRST = ['Alan', 'Brian', 'Carlos', 'Derek', 'Frank', 'Gary', 'Howard', 'Ivan', 'James', 'Keith', 'Larry', 'Mike', 'Neil', 'Oscar', 'Paul', 'Ray'];
const STAFF_LAST = ['Banks', 'Cooper', 'Dixon', 'Edwards', 'Fletcher', 'Gibson', 'Hill', 'Irving', 'Jones', 'Knight', 'Lewis', 'Murray', 'North', 'Owen', 'Palmer', 'Quinn'];
const STAFF_ROLES = ['Assistant Manager', 'First Team Coach', 'Fitness Coach', 'Goalkeeping Coach', 'Youth Coach', 'Head Scout', 'Regional Scout', 'Chief Physio', 'Sports Scientist'];
const STAFF_SPECS = ['Attacking', 'Defensive', 'Set Pieces', 'Youth Development', 'Fitness', 'Tactics', 'Man Management', 'Scouting Network', 'Injury Prevention', 'Recovery'];
const REGIONS = ['England', 'Spain', 'Germany', 'France', 'Italy', 'South America', 'Scandinavia', 'Africa', 'Eastern Europe', 'Asia'];

function generateStaff(clubId: string): Staff[] {
  const seed = hs(clubId + 'manage-staff');
  const list: Staff[] = [];
  for (let i = 0; i < 9; i++) {
    const ps = seed + i * 67;
    list.push({
      id: `stf-${i}-${ps}`,
      name: `${STAFF_FIRST[Math.floor(sr(ps) * STAFF_FIRST.length)]} ${STAFF_LAST[Math.floor(sr(ps + 1) * STAFF_LAST.length)]}`,
      role: STAFF_ROLES[i % STAFF_ROLES.length],
      rating: Math.round(40 + sr(ps + 2) * 55),
      specialization: STAFF_SPECS[Math.floor(sr(ps + 3) * STAFF_SPECS.length)],
      contractYears: 1 + Math.floor(sr(ps + 4) * 3),
      salary: Math.round((800 + sr(ps + 5) * 2200) / 50) * 50,
      assignment: null,
    });
  }
  return list;
}

function generateTasks(clubId: string, clubName: string): Task[] {
  const seed = hs(clubId + 'manage-tasks');
  const templates: Omit<Task, 'id' | 'progress' | 'status' | 'delegatedTo'>[] = [
    { title: 'Finish in Top 10', description: `Ensure ${clubName} finishes in the top half of the league this season.`, priority: 'high', deadline: 'End of Season', module: 'Squad' },
    { title: 'Reduce Wage Budget', description: 'Cut the wage bill by at least 15% via transfers or renegotiations.', priority: 'medium', deadline: 'January Window', module: 'Transfers' },
    { title: 'Develop 2 Youth Players', description: 'Promote and integrate at least 2 youth players into the first team.', priority: 'medium', deadline: 'End of Season', module: 'Training' },
    { title: 'Reach FA Cup Round 4', description: 'Progress through the FA Cup to at least the fourth round.', priority: 'high', deadline: 'FA Cup R4', module: 'Cup' },
    { title: 'Improve Training Facilities', description: 'Upgrade the training ground to boost player development.', priority: 'low', deadline: 'End of Season', module: 'Board' },
    { title: 'Sign a New Striker', description: 'Recruit a proven goalscorer to strengthen the forward line.', priority: 'high', deadline: 'Transfer Window', module: 'Transfers' },
    { title: 'Maintain Squad Morale', description: 'Keep average squad morale above 60% throughout the season.', priority: 'medium', deadline: 'Ongoing', module: 'Players' },
    { title: 'Secure Shirt Sponsor', description: 'Negotiate a lucrative shirt sponsorship deal for the club.', priority: 'low', deadline: 'Pre-Season', module: 'External' },
    { title: 'Balance the Books', description: 'Ensure the club does not exceed its budget this financial year.', priority: 'high', deadline: 'End of Season', module: 'Board' },
    { title: 'Scout 3 New Regions', description: 'Expand the scouting network to cover at least 3 new regions.', priority: 'low', deadline: 'End of Season', module: 'Transfers' },
  ];
  return templates.map((t, i) => ({
    ...t,
    id: `task-${i}-${seed + i}`,
    progress: Math.round(sr(seed + i * 13) * 75),
    status: 'active' as TaskStatus,
    delegatedTo: null,
  }));
}

function generateEvents(clubId: string, squadPlayers: SquadPlayer[]): GameEvent[] {
  const seed = hs(clubId + 'manage-events');
  const pName = (i: number) => squadPlayers[Math.floor(sr(seed + i * 31) * squadPlayers.length)]?.name ?? 'Unknown Player';
  const templates: Omit<GameEvent, 'id' | 'resolved'>[] = [
    {
      type: 'player-unhappy', title: 'Key Player Unhappy', urgent: true,
      message: `${pName(0)} is unhappy with his current role and wants more playing time. The dressing room is watching how you handle this.`,
      options: [
        { label: 'Promise More Playtime', effect: 'Player morale +15, others may expect the same', impact: { morale: 15, boardConfidence: -3 } },
        { label: 'Sell the Player', effect: 'Removes player, budget gained, morale risk', impact: { morale: -10, budget: 5000000, fanSentiment: -8 } },
        { label: 'Ignore the Complaint', effect: 'Player morale drops significantly', impact: { morale: -20, boardConfidence: -5 } },
      ],
    },
    {
      type: 'board-warning', title: 'Board Issues Warning', urgent: true,
      message: 'The board is concerned about recent performances. They expect an immediate improvement or consequences will follow.',
      options: [
        { label: 'Acknowledge and Promise Results', effect: 'Board confidence stabilized temporarily', impact: { boardConfidence: 5, morale: -5 } },
        { label: 'Blame Injuries', effect: 'Board partially satisfied, minor confidence hit', impact: { boardConfidence: -2 } },
        { label: 'Challenge the Board', effect: 'Risky move, could backfire', impact: { boardConfidence: -15, fanSentiment: 10 } },
      ],
    },
    {
      type: 'media-criticism', title: 'Media Pressure', urgent: false,
      message: 'The press is questioning your tactical decisions after a string of poor results. A press conference might help.',
      options: [
        { label: 'Hold Press Conference', effect: 'Reputation slightly improved', impact: { reputation: 3, fanSentiment: 5 } },
        { label: 'No Comment', effect: 'Media continues criticism', impact: { fanSentiment: -5 } },
        { label: 'Criticize the Media', effect: 'Bold stance, mixed reaction', impact: { fanSentiment: -3, reputation: -2, boardConfidence: -3 } },
      ],
    },
    {
      type: 'sponsor-offer', title: 'New Sponsor Offer', urgent: false,
      message: 'A major brand wants to sponsor the club\'s training kit for €2.5M per year. However, they have a controversial reputation.',
      options: [
        { label: 'Accept the Deal', effect: 'Budget +€2.5M, reputation risk', impact: { budget: 2500000, reputation: -5, fanSentiment: -8 } },
        { label: 'Reject the Offer', effect: 'Reputation maintained, no extra income', impact: { reputation: 3, fanSentiment: 5 } },
        { label: 'Negotiate Better Terms', effect: 'Budget +€1.8M, better image clause', impact: { budget: 1800000, reputation: 1 } },
      ],
    },
    {
      type: 'staff-conflict', title: 'Coaching Staff Disagreement', urgent: false,
      message: 'Your assistant manager and first team coach disagree about training priorities. The squad is divided.',
      options: [
        { label: 'Side with Assistant', effect: 'Coach unhappy, training focus maintained', impact: { morale: -5, boardConfidence: 2 } },
        { label: 'Side with Coach', effect: 'Assistant unhappy, different training results', impact: { morale: 3, boardConfidence: -2 } },
        { label: 'Mediate a Compromise', effect: 'Both partially satisfied', impact: { morale: 1, boardConfidence: 1 } },
      ],
    },
    {
      type: 'injury-crisis', title: 'Injury Crisis', urgent: true,
      message: `${pName(1)} and ${pName(2)} have both suffered injuries in training. Medical staff recommend a lighter schedule.`,
      options: [
        { label: 'Reduce Training Intensity', effect: 'Faster recovery, slower development', impact: { morale: 5, boardConfidence: -3 } },
        { label: 'Maintain Current Regime', effect: 'Risk of more injuries', impact: { morale: -8, boardConfidence: 2 } },
        { label: 'Invest in Medical Facilities', effect: 'Budget spent, long-term improvement', impact: { budget: -500000, reputation: 2 } },
      ],
    },
    {
      type: 'fan-protest', title: 'Fan Protest Planned', urgent: true,
      message: 'Supporters are organizing a protest against recent ticket price increases. The local media is covering it extensively.',
      options: [
        { label: 'Freeze Ticket Prices', effect: 'Fans appeased, revenue reduced', impact: { fanSentiment: 20, budget: -300000 } },
        { label: 'Issue Public Statement', effect: 'Moderate fan response', impact: { fanSentiment: 5, reputation: 2 } },
        { label: 'Ignore the Protest', effect: 'Fans grow angrier', impact: { fanSentiment: -15, reputation: -5 } },
      ],
    },
    {
      type: 'transfer-bid', title: 'Unexpected Transfer Bid', urgent: false,
      message: `A Premier League club has offered €12M for ${pName(3)}. The player wants to discuss his options.`,
      options: [
        { label: 'Accept the Bid', effect: 'Budget boost, lose key player', impact: { budget: 12000000, morale: -10, fanSentiment: -12 } },
        { label: 'Reject and Keep', effect: 'Player may be unsettled', impact: { morale: -5, fanSentiment: 8 } },
        { label: 'Demand More Money', effect: 'Negotiate for a higher fee', impact: { budget: 15000000, morale: -8, fanSentiment: -5 } },
      ],
    },
  ];
  return templates.map((t, i) => ({ ...t, id: `evt-${i}-${seed + i}`, resolved: false }));
}

/* ══════════════════════════════════════════════
   Overview Tab
   ══════════════════════════════════════════════ */

function OverviewTab({ clubStatus, squad, tasks, events, strategy, setTab }: {
  clubStatus: ClubStatus;
  squad: SquadPlayer[];
  tasks: Task[];
  events: GameEvent[];
  strategy: Strategy;
  setTab: (t: TabKey) => void;
}) {
  const avgMorale = squad.length > 0 ? Math.round(squad.reduce((s, p) => s + p.morale, 0) / squad.length) : 0;
  const topTasks = tasks.filter((t) => t.status === 'active').slice(0, 3);
  const unresolvedEvents = events.filter((e) => !e.resolved);
  const urgentCount = unresolvedEvents.filter((e) => e.urgent).length;

  const kpis: { label: string; value: number; thresholds?: [number, number]; tab?: TabKey }[] = [
    { label: 'Board Confidence', value: clubStatus.boardConfidence, tab: 'board' },
    { label: 'Fan Sentiment', value: clubStatus.fanSentiment, tab: 'external' },
    { label: 'Club Reputation', value: clubStatus.reputation },
    { label: 'Financial Health', value: clubStatus.financialHealth },
    { label: 'Squad Morale', value: avgMorale, tab: 'players' },
    { label: 'Job Security', value: clubStatus.jobSecurity },
  ];

  return (
    <div className="space-y-3">
      {/* KPI grid */}
      <div className="grid grid-cols-3 gap-2 lg:grid-cols-6">
        {kpis.map((k) => (
          <button
            key={k.label}
            type="button"
            onClick={() => k.tab && setTab(k.tab)}
            className={`text-left border-2 border-[#2a8a2b] bg-[#0d3f10] p-2 transition-colors ${k.tab ? 'hover:bg-[#1a4a1e] cursor-pointer' : 'cursor-default'}`}
          >
            <div className="text-[10px] uppercase text-[#6b9a5a] mb-0.5" style={{ fontFamily: MONO }}>{k.label}</div>
            <div className="flex items-center gap-1">
              <StatusBadge value={k.value} thresholds={k.thresholds} />
              <BarMini value={k.value} />
            </div>
          </button>
        ))}
      </div>

      {/* Alerts */}
      {clubStatus.boardConfidence < 40 && (
        <div className="border-2 border-[#8a2a2a] bg-[#3f100d] px-3 py-2 text-xs text-[#ff4444] font-bold uppercase">
          Warning: Board confidence critically low. Improve results immediately or face dismissal.
        </div>
      )}
      {clubStatus.fanSentiment < 35 && (
        <div className="border-2 border-[#6a5a1a] bg-[#3a2a0a] px-3 py-2 text-xs text-[#efe56b] font-bold uppercase">
          Alert: Fan sentiment is dropping. Consider addressing supporter concerns.
        </div>
      )}
      {urgentCount > 0 && (
        <div className="border-2 border-[#8a2a2a] bg-[#3f100d] px-3 py-2 text-xs text-[#ff8844] font-bold uppercase cursor-pointer hover:bg-[#4f201d]" onClick={() => setTab('events')}>
          {urgentCount} urgent event{urgentCount > 1 ? 's' : ''} require{urgentCount === 1 ? 's' : ''} your attention. Click to review.
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {/* Top objectives */}
        <Panel>
          <SectionTitle>Current Objectives</SectionTitle>
          {topTasks.length === 0 ? (
            <div className="text-[10px] text-[#6b9a5a] italic">No active objectives.</div>
          ) : topTasks.map((t) => (
            <div key={t.id} className="border-b border-[#1a5a1e] py-1.5 last:border-b-0">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase text-[#d5f8b6]" style={{ fontFamily: MONO }}>{t.title}</span>
                <span className={`text-[10px] font-bold uppercase ${t.priority === 'high' ? 'text-[#ff4444]' : t.priority === 'medium' ? 'text-[#efe56b]' : 'text-[#6b9a5a]'}`}>{t.priority}</span>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <div className="flex-1 h-1.5 bg-[#0a2e0d] border border-[#1a5a1e]">
                  <div className="h-full bg-[#2a8a2b]" style={{ width: `${t.progress}%` }} />
                </div>
                <span className="text-[10px] text-white font-mono">{t.progress}%</span>
              </div>
            </div>
          ))}
          <button type="button" onClick={() => setTab('tasks')} className="mt-2 text-[10px] text-[#00e5ff] underline hover:text-white">View all tasks →</button>
        </Panel>

        {/* Strategy summary */}
        <Panel>
          <SectionTitle>Club Strategy</SectionTitle>
          <div className="space-y-1 text-[10px]" style={{ fontFamily: MONO }}>
            <div className="flex justify-between">
              <span className="text-[#6b9a5a]">Playing Style</span>
              <span className="text-[#00e5ff] font-bold uppercase">{strategy.playStyle}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#6b9a5a]">Youth Focus</span>
              <span className="text-[#00e5ff] font-bold uppercase">{strategy.youthFocus}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#6b9a5a]">Transfer Policy</span>
              <span className="text-[#00e5ff] font-bold uppercase">{strategy.transferPolicy}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#6b9a5a]">Financial Strategy</span>
              <span className="text-[#00e5ff] font-bold uppercase">{strategy.financialStrategy}</span>
            </div>
          </div>
          <button type="button" onClick={() => setTab('strategy')} className="mt-2 text-[10px] text-[#00e5ff] underline hover:text-white">Adjust strategy →</button>
        </Panel>
      </div>

      {/* Recent events */}
      {unresolvedEvents.length > 0 && (
        <Panel>
          <SectionTitle>Pending Events</SectionTitle>
          <div className="space-y-1">
            {unresolvedEvents.slice(0, 4).map((e) => (
              <div key={e.id} className={`flex items-center justify-between px-2 py-1 border ${e.urgent ? 'border-[#8a2a2a] bg-[#2a1010]' : 'border-[#1a5a1e] bg-[#0a2e0d]'} cursor-pointer hover:bg-[#1a4a1e]`} onClick={() => setTab('events')}>
                <span className="text-[10px] text-[#d5f8b6] font-bold uppercase" style={{ fontFamily: MONO }}>{e.title}</span>
                {e.urgent && <span className="text-[10px] text-[#ff4444] font-bold">URGENT</span>}
              </div>
            ))}
          </div>
        </Panel>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════
   Tasks Tab
   ══════════════════════════════════════════════ */

function TasksTab({ tasks, staff, onUpdateTask, onDelegate }: {
  tasks: Task[];
  staff: Staff[];
  onUpdateTask: (id: string, updates: Partial<Task>) => void;
  onDelegate: (taskId: string, staffId: string) => void;
}) {
  const [filter, setFilter] = useState<'all' | 'active' | 'completed' | 'failed'>('all');

  const filtered = useMemo(() => {
    if (filter === 'all') return tasks;
    return tasks.filter((t) => t.status === filter);
  }, [tasks, filter]);

  const priorityColor = (p: Priority) => p === 'high' ? 'text-[#ff4444]' : p === 'medium' ? 'text-[#efe56b]' : 'text-[#6b9a5a]';
  const priorities: Priority[] = ['low', 'medium', 'high'];

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <h3 className="text-sm font-black uppercase text-[#00e5ff]" style={{ fontFamily: RETRO }}>
          Tasks & Objectives
        </h3>
        <div className="flex gap-1 ml-auto">
          {(['all', 'active', 'completed', 'failed'] as const).map((f) => (
            <Btn key={f} active={filter === f} onClick={() => setFilter(f)}>{f}</Btn>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        {filtered.map((t) => (
          <Panel key={t.id} className={t.status === 'completed' ? 'opacity-60' : ''}>
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase text-[#d5f8b6]" style={{ fontFamily: MONO }}>{t.title}</span>
                  <span className={`text-[10px] font-bold uppercase ${priorityColor(t.priority)}`}>[{t.priority}]</span>
                  <span className="text-[10px] text-[#6b9a5a] uppercase">{t.module}</span>
                </div>
                <p className="text-[9px] text-[#98ca7a] mt-0.5">{t.description}</p>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex-1 max-w-[200px] h-1.5 bg-[#0a2e0d] border border-[#1a5a1e]">
                    <div className={`h-full ${t.status === 'completed' ? 'bg-[#2a8a2b]' : t.status === 'failed' ? 'bg-[#8a2a2a]' : 'bg-[#2a8a2b]'}`} style={{ width: `${t.progress}%` }} />
                  </div>
                  <span className="text-[10px] text-white font-mono">{t.progress}%</span>
                  <span className="text-[10px] text-[#6b9a5a]">Deadline: {t.deadline}</span>
                  {t.delegatedTo && <span className="text-[10px] text-[#00e5ff]">Assigned: {staff.find((s) => s.id === t.delegatedTo)?.name ?? 'Staff'}</span>}
                </div>
              </div>
              {t.status === 'active' && (
                <div className="flex flex-col gap-1 items-end">
                  <div className="flex gap-1">
                    {priorities.map((p) => (
                      <Btn key={p} active={t.priority === p} onClick={() => onUpdateTask(t.id, { priority: p })} className="text-[10px] px-1 py-0.5">{p[0]}</Btn>
                    ))}
                  </div>
                  <select
                    value={t.delegatedTo ?? ''}
                    onChange={(e) => e.target.value && onDelegate(t.id, e.target.value)}
                    className="bg-[#0a2e0d] border border-[#2a8a2b] text-[#d5f8b6] text-[10px] px-1 py-0.5"
                  >
                    <option value="">Delegate to...</option>
                    {staff.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.role})</option>)}
                  </select>
                  <div className="flex gap-1">
                    <ActionBtn onClick={() => onUpdateTask(t.id, { status: 'completed', progress: 100 })} variant="green">Complete</ActionBtn>
                    <ActionBtn onClick={() => onUpdateTask(t.id, { status: 'failed' })} variant="red">Fail</ActionBtn>
                  </div>
                </div>
              )}
            </div>
          </Panel>
        ))}
        {filtered.length === 0 && (
          <div className="border-2 border-[#2a8a2b] bg-[#0d3f10] p-4 text-center text-xs text-[#6b9a5a] italic">
            No tasks match the current filter.
          </div>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════
   Staff Tab
   ══════════════════════════════════════════════ */

function StaffTab({ staff, onFire, onExtend, onAssign, addLog }: {
  staff: Staff[];
  onFire: (id: string) => void;
  onExtend: (id: string) => void;
  onAssign: (id: string, assignment: string) => void;
  addLog: (msg: string) => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const sel = staff.find((s) => s.id === selected);

  const roleGroups = useMemo(() => {
    const groups = new Map<string, Staff[]>();
    for (const s of staff) {
      const list = groups.get(s.role) ?? [];
      list.push(s);
      groups.set(s.role, list);
    }
    return groups;
  }, [staff]);

  const assignments: Record<string, string[]> = {
    'Head Scout': REGIONS,
    'Regional Scout': REGIONS,
    'First Team Coach': ['Attacking Drills', 'Defensive Drills', 'Set Piece Training', 'Fitness Focus', 'Tactical Preparation'],
    'Youth Coach': ['Youth Development', 'Youth Fitness', 'Youth Tactics', 'Mentoring'],
    'Fitness Coach': ['Stamina Building', 'Speed Work', 'Strength Training', 'Injury Prevention'],
    'Goalkeeping Coach': ['Shot Stopping', 'Distribution', 'Positioning', 'Cross Collection'],
    'Chief Physio': ['Injury Recovery', 'Prevention Programme', 'Fitness Monitoring', 'Rehabilitation'],
    'Sports Scientist': ['Data Analysis', 'Performance Monitoring', 'Recovery Optimization', 'Nutrition Planning'],
    'Assistant Manager': ['Match Preparation', 'Opposition Analysis', 'Team Talks', 'Training Oversight'],
  };

  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-[240px_1fr]">
      {/* Staff list */}
      <Panel className="max-h-[600px] overflow-y-auto">
        <SectionTitle>Club Staff ({staff.length})</SectionTitle>
        {Array.from(roleGroups).map(([role, members]) => (
          <div key={role} className="mb-2">
            <div className="text-[10px] uppercase text-[#efe56b] mb-0.5 font-bold">{role}</div>
            {members.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setSelected(s.id)}
                className={`block w-full text-left px-2 py-1 text-[10px] transition-colors ${selected === s.id ? 'bg-[#2a8a2b] text-[#efe56b]' : 'text-[#d5f8b6] hover:bg-[#1a4a1e]'}`}
                style={{ fontFamily: MONO }}
              >
                <span className="font-bold uppercase">{s.name}</span>
                <span className="ml-1 text-[10px] text-[#6b9a5a]">{s.rating}</span>
                {s.assignment && <span className="ml-1 text-[10px] text-[#00e5ff]">● {s.assignment}</span>}
              </button>
            ))}
          </div>
        ))}
      </Panel>

      {/* Detail panel */}
      <Panel>
        {sel ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black uppercase text-[#00e5ff]" style={{ fontFamily: RETRO }}>{sel.name}</h4>
              <span className="text-[10px] text-[#6b9a5a] uppercase" style={{ fontFamily: MONO }}>{sel.role}</span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[10px]" style={{ fontFamily: MONO }}>
              <div className="text-[#6b9a5a]">Rating: <span className="text-white font-bold">{sel.rating}</span> <BarMini value={sel.rating} /></div>
              <div className="text-[#6b9a5a]">Specialization: <span className="text-[#efe56b]">{sel.specialization}</span></div>
              <div className="text-[#6b9a5a]">Contract: <span className="text-white">{sel.contractYears} year{sel.contractYears > 1 ? 's' : ''}</span></div>
              <div className="text-[#6b9a5a]">Salary: <span className="text-white">€{sel.salary.toLocaleString()}/wk</span></div>
              <div className="text-[#6b9a5a]">Current Assignment: <span className={sel.assignment ? 'text-[#00e5ff]' : 'text-[#555]'}>{sel.assignment ?? 'None'}</span></div>
            </div>

            {/* Assign */}
            {assignments[sel.role] && (
              <div>
                <label className="block text-[10px] uppercase text-[#6b9a5a] mb-0.5">Assign to:</label>
                <div className="flex flex-wrap gap-1">
                  {assignments[sel.role].map((a) => (
                    <ActionBtn key={a} onClick={() => { onAssign(sel.id, a); addLog(`${sel.name} assigned to ${a}.`); }} variant={sel.assignment === a ? 'yellow' : 'blue'}>{a}</ActionBtn>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2 border-t border-[#1a5a1e] pt-2">
              <ActionBtn onClick={() => { onExtend(sel.id); addLog(`${sel.name}'s contract extended by 1 year.`); }} variant="green">Extend Contract</ActionBtn>
              <ActionBtn onClick={() => { onFire(sel.id); addLog(`${sel.name} has been dismissed.`); }} variant="red">Dismiss</ActionBtn>
            </div>
          </div>
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-[#6b9a5a] italic p-8">
            Select a staff member to view their profile and assign tasks.
          </div>
        )}
      </Panel>
    </div>
  );
}

/* ══════════════════════════════════════════════
   Player Interaction Tab
   ══════════════════════════════════════════════ */

function PlayerInteractionTab({ squad, relations, onInteract, addLog }: {
  squad: SquadPlayer[];
  relations: Map<string, PlayerRelation>;
  onInteract: (playerId: string, action: string, impact: number) => void;
  addLog: (msg: string) => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const sel = squad.find((p) => p.id === selected);

  const actions: { label: string; effect: string; impact: number; variant: 'green' | 'yellow' | 'red' | 'blue' }[] = [
    { label: 'Praise Performance', effect: 'Morale boost if form is good', impact: 12, variant: 'green' },
    { label: 'Discuss Playing Time', effect: 'Address concerns about minutes', impact: 5, variant: 'blue' },
    { label: 'Promise Key Role', effect: 'Big morale boost, risk if not fulfilled', impact: 15, variant: 'yellow' },
    { label: 'Criticize Performance', effect: 'Can motivate or upset the player', impact: -8, variant: 'red' },
    { label: 'Warn About Discipline', effect: 'Addresses poor behavior', impact: -5, variant: 'red' },
    { label: 'Offer Encouragement', effect: 'General morale support', impact: 8, variant: 'green' },
  ];

  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-[240px_1fr]">
      <Panel className="max-h-[600px] overflow-y-auto">
        <SectionTitle>Squad ({squad.length})</SectionTitle>
        {squad.map((p) => {
          const rel = relations.get(p.id);
          const statusIcon = rel?.status === 'happy' ? '😊' : rel?.status === 'unhappy' ? '😠' : '😐';
          const morColor = p.morale >= 70 ? 'text-[#2a8a2b]' : p.morale >= 40 ? 'text-[#efe56b]' : 'text-[#ff4444]';
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => setSelected(p.id)}
              className={`block w-full text-left px-2 py-1 text-[10px] transition-colors ${selected === p.id ? 'bg-[#2a8a2b] text-[#efe56b]' : 'text-[#d5f8b6] hover:bg-[#1a4a1e]'}`}
              style={{ fontFamily: MONO }}
            >
              <span className="font-bold uppercase">{p.name}</span>
              <span className="ml-1 text-[10px] text-[#6b9a5a]">{p.role}</span>
              <span className={`ml-1 text-[10px] font-bold ${morColor}`}>{p.morale}</span>
              <span className="ml-1 text-[10px]">{statusIcon}</span>
            </button>
          );
        })}
      </Panel>

      <Panel>
        {sel ? (() => {
          const rel = relations.get(sel.id);
          const statusLabel = rel?.status === 'happy' ? 'Happy' : rel?.status === 'unhappy' ? 'Unhappy' : 'Neutral';
          const statusColor = rel?.status === 'happy' ? 'text-[#2a8a2b]' : rel?.status === 'unhappy' ? 'text-[#ff4444]' : 'text-[#efe56b]';
          const morColor = sel.morale >= 70 ? 'text-[#2a8a2b]' : sel.morale >= 40 ? 'text-[#efe56b]' : 'text-[#ff4444]';
          return (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black uppercase text-[#00e5ff]" style={{ fontFamily: RETRO }}>{sel.name}</h4>
                <span className="text-[10px] text-[#6b9a5a]" style={{ fontFamily: MONO }}>{sel.role} | Age {sel.age}</span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-[10px]" style={{ fontFamily: MONO }}>
                <div className="text-[#6b9a5a]">Morale: <span className={`font-bold ${morColor}`}>{sel.morale}</span></div>
                <div className="text-[#6b9a5a]">Form: <StatusBadge value={sel.form} /></div>
                <div className="text-[#6b9a5a]">Status: <span className={`font-bold uppercase ${statusColor}`}>{statusLabel}</span></div>
                <div className="text-[#6b9a5a]">Fitness: <StatusBadge value={sel.fitness} /></div>
                <div className="text-[#6b9a5a]">Apps: <span className="text-white">{sel.played}</span></div>
                <div className="text-[#6b9a5a]">Goals: <span className="text-white">{sel.scored}</span></div>
              </div>

              {rel?.lastInteraction && (
                <div className="text-[10px] text-[#6b9a5a] italic">Last interaction: {rel.lastInteraction}</div>
              )}

              <div className="border-t border-[#1a5a1e] pt-2">
                <label className="block text-[10px] uppercase text-[#6b9a5a] mb-1">Player Interactions</label>
                <div className="grid grid-cols-2 gap-1 sm:grid-cols-3">
                  {actions.map((a) => (
                    <div key={a.label} className="flex flex-col">
                      <ActionBtn onClick={() => {
                        onInteract(sel.id, a.label, a.impact);
                        addLog(`${sel.name}: ${a.label}. ${a.effect}.`);
                      }} variant={a.variant}>{a.label}</ActionBtn>
                      <span className="text-[10px] text-[#5a8a4a] mt-0.5">{a.effect}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })() : (
          <div className="flex h-full items-center justify-center text-xs text-[#6b9a5a] italic p-8">
            Select a player to interact with.
          </div>
        )}
      </Panel>
    </div>
  );
}

/* ══════════════════════════════════════════════
   Board Interaction Tab
   ══════════════════════════════════════════════ */

function BoardTab({ clubStatus, onBoardAction, addLog }: {
  clubStatus: ClubStatus;
  onBoardAction: (action: string) => void;
  addLog: (msg: string) => void;
}) {
  const [lastResponse, setLastResponse] = useState<{ action: string; result: string; success: boolean } | null>(null);

  const boardActions: { label: string; description: string; successChance: number; variant: 'green' | 'blue' | 'yellow' | 'red' }[] = [
    { label: 'Request Transfer Funds', description: 'Ask the board for additional money to strengthen the squad.', successChance: clubStatus.boardConfidence * 0.8, variant: 'green' },
    { label: 'Expand Stadium', description: 'Propose a stadium expansion project to increase matchday revenue.', successChance: clubStatus.boardConfidence * 0.5, variant: 'blue' },
    { label: 'Upgrade Training Ground', description: 'Request investment in better training facilities.', successChance: clubStatus.boardConfidence * 0.7, variant: 'blue' },
    { label: 'Adjust Expectations', description: 'Negotiate more realistic season objectives with the board.', successChance: clubStatus.boardConfidence * 0.6, variant: 'yellow' },
    { label: 'Discuss Club Vision', description: 'Align the long-term direction of the club with the board.', successChance: clubStatus.boardConfidence * 0.9, variant: 'blue' },
    { label: 'Explain Poor Results', description: 'Address concerns about recent performances.', successChance: Math.min(80, clubStatus.boardConfidence + 20), variant: 'red' },
    { label: 'Request Youth Investment', description: 'Ask for funding to improve the youth academy.', successChance: clubStatus.boardConfidence * 0.65, variant: 'green' },
    { label: 'Propose Wage Budget Increase', description: 'Request a higher wage ceiling for player contracts.', successChance: clubStatus.boardConfidence * 0.4, variant: 'yellow' },
  ];

  const handleAction = (action: string, chance: number) => {
    const success = Math.random() * 100 < chance;
    const result = success
      ? 'The board has approved your request.'
      : 'The board has rejected your proposal. Try again when confidence is higher.';
    setLastResponse({ action, result, success });
    onBoardAction(action);
    addLog(`Board: ${action} — ${success ? 'APPROVED' : 'REJECTED'}.`);
  };

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-black uppercase text-[#00e5ff]" style={{ fontFamily: RETRO }}>
        Board Room
      </h3>

      {/* Board status */}
      <Panel>
        <div className="flex flex-wrap gap-4 text-[10px]" style={{ fontFamily: MONO }}>
          <span className="text-[#6b9a5a]">Board Confidence: <StatusBadge value={clubStatus.boardConfidence} /></span>
          <span className="text-[#6b9a5a]">Job Security: <StatusBadge value={clubStatus.jobSecurity} /></span>
          <span className="text-[#6b9a5a]">Financial Health: <StatusBadge value={clubStatus.financialHealth} /></span>
        </div>
        {clubStatus.boardConfidence < 30 && (
          <div className="mt-2 text-[9px] text-[#ff4444] font-bold uppercase">Your position is under severe pressure. Tread carefully.</div>
        )}
      </Panel>

      {lastResponse && (
        <div className={`border-2 px-3 py-2 ${lastResponse.success ? 'border-[#2a8a2b] bg-[#0d3f10]' : 'border-[#8a2a2a] bg-[#3f100d]'}`}>
          <div className="text-[10px] font-bold uppercase text-[#efe56b]" style={{ fontFamily: MONO }}>{lastResponse.action}</div>
          <div className={`text-[10px] font-bold ${lastResponse.success ? 'text-[#2a8a2b]' : 'text-[#ff4444]'}`}>{lastResponse.result}</div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {boardActions.map((a) => (
          <Panel key={a.label}>
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <h5 className="text-[10px] font-bold uppercase text-[#d5f8b6]" style={{ fontFamily: MONO }}>{a.label}</h5>
                <p className="text-[10px] text-[#98ca7a] mt-0.5">{a.description}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] text-[#6b9a5a]">Success chance:</span>
                  <BarMini value={a.successChance} />
                  <span className="text-[10px] text-white font-mono">{Math.round(a.successChance)}%</span>
                </div>
              </div>
              <ActionBtn onClick={() => handleAction(a.label, a.successChance)} variant={a.variant}>Submit</ActionBtn>
            </div>
          </Panel>
        ))}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════
   External Relations Tab
   ══════════════════════════════════════════════ */

function ExternalTab({ clubStatus, onMediaAction, onSponsorAction, addLog }: {
  clubStatus: ClubStatus;
  onMediaAction: (action: string) => void;
  onSponsorAction: (action: string, accepted: boolean) => void;
  addLog: (msg: string) => void;
}) {
  const sponsors: { name: string; value: number; reputation: number; description: string }[] = [
    { name: 'SportTech Pro', value: 1200000, reputation: 5, description: 'Leading sports technology brand. Clean image.' },
    { name: 'QuickBet Ltd', value: 3500000, reputation: -8, description: 'Gambling company. High payout but controversial.' },
    { name: 'GreenEnergy Co', value: 800000, reputation: 8, description: 'Eco-friendly energy provider. Great image.' },
    { name: 'MegaCorp Industries', value: 2000000, reputation: 0, description: 'Large multinational. Neutral reputation.' },
  ];

  const mediaActions: { label: string; description: string; variant: 'green' | 'blue' | 'yellow' | 'red' }[] = [
    { label: 'Hold Press Conference', description: 'Address the media on recent performances and club direction.', variant: 'blue' },
    { label: 'Exclusive Interview', description: 'Give a one-on-one interview to improve public perception.', variant: 'green' },
    { label: 'Respond to Criticism', description: 'Address specific media narratives about the club.', variant: 'yellow' },
    { label: 'No Comment Policy', description: 'Refuse to engage with the media this week.', variant: 'red' },
    { label: 'Community Outreach', description: 'Organize a community event for positive press coverage.', variant: 'green' },
  ];

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-black uppercase text-[#00e5ff]" style={{ fontFamily: RETRO }}>
        External Relations
      </h3>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {/* Media */}
        <Panel>
          <SectionTitle>Media Relations</SectionTitle>
          <div className="text-[10px] text-[#6b9a5a] mb-2" style={{ fontFamily: MONO }}>
            Fan Sentiment: <StatusBadge value={clubStatus.fanSentiment} /> | Reputation: <StatusBadge value={clubStatus.reputation} />
          </div>
          <div className="space-y-1">
            {mediaActions.map((a) => (
              <div key={a.label} className="flex items-center justify-between border border-[#1a5a1e] bg-[#0a2e0d] px-2 py-1.5">
                <div>
                  <div className="text-[10px] font-bold uppercase text-[#d5f8b6]" style={{ fontFamily: MONO }}>{a.label}</div>
                  <div className="text-[10px] text-[#98ca7a]">{a.description}</div>
                </div>
                <ActionBtn onClick={() => { onMediaAction(a.label); addLog(`Media: ${a.label}.`); }} variant={a.variant}>Act</ActionBtn>
              </div>
            ))}
          </div>
        </Panel>

        {/* Sponsors */}
        <Panel>
          <SectionTitle>Sponsor Offers</SectionTitle>
          <div className="space-y-2">
            {sponsors.map((s) => {
              const repColor = s.reputation > 0 ? 'text-[#2a8a2b]' : s.reputation < 0 ? 'text-[#ff4444]' : 'text-[#efe56b]';
              return (
                <div key={s.name} className="border border-[#1a5a1e] bg-[#0a2e0d] p-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-bold uppercase text-[#d5f8b6]" style={{ fontFamily: MONO }}>{s.name}</span>
                      <div className="text-[10px] text-[#98ca7a]">{s.description}</div>
                      <div className="text-[9px] mt-0.5" style={{ fontFamily: MONO }}>
                        <span className="text-[#efe56b]">€{s.value.toLocaleString()}/yr</span>
                        <span className="ml-2 text-[#6b9a5a]">Reputation impact: </span>
                        <span className={repColor}>{s.reputation > 0 ? '+' : ''}{s.reputation}</span>
                      </div>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <ActionBtn onClick={() => { onSponsorAction(s.name, true); addLog(`Sponsor: Accepted ${s.name} deal (€${s.value.toLocaleString()}/yr).`); }} variant="green">Accept</ActionBtn>
                      <ActionBtn onClick={() => { onSponsorAction(s.name, false); addLog(`Sponsor: Rejected ${s.name} offer.`); }} variant="red">Reject</ActionBtn>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════
   Strategy Tab
   ══════════════════════════════════════════════ */

function StrategyTab({ strategy, onChange, addLog }: {
  strategy: Strategy;
  onChange: (s: Strategy) => void;
  addLog: (msg: string) => void;
}) {
  const sections: {
    key: keyof Strategy;
    title: string;
    description: string;
    options: { value: string; label: string; desc: string }[];
  }[] = [
    {
      key: 'playStyle',
      title: 'Playing Style',
      description: 'Determines the team\'s approach on the pitch.',
      options: [
        { value: 'attacking', label: 'Attacking', desc: 'High press, offensive football. More goals but vulnerable defensively.' },
        { value: 'balanced', label: 'Balanced', desc: 'Solid all-round approach. Adaptable to different opponents.' },
        { value: 'defensive', label: 'Defensive', desc: 'Compact, disciplined defending. Fewer goals conceded but limited scoring.' },
      ],
    },
    {
      key: 'youthFocus',
      title: 'Youth Development',
      description: 'How much emphasis to place on developing young players.',
      options: [
        { value: 'high', label: 'High', desc: 'Heavy investment in youth. Long-term gains but short-term risk.' },
        { value: 'medium', label: 'Medium', desc: 'Balanced youth integration alongside experienced players.' },
        { value: 'low', label: 'Low', desc: 'Focus on proven players. Youth used as backup only.' },
      ],
    },
    {
      key: 'transferPolicy',
      title: 'Transfer Policy',
      description: 'Approach to building the squad via the transfer market.',
      options: [
        { value: 'buy', label: 'Buy Ready-Made', desc: 'Sign established stars. High cost but immediate impact.' },
        { value: 'develop', label: 'Develop Talent', desc: 'Sign young prospects and develop them. Lower cost, higher ceiling.' },
        { value: 'sell', label: 'Sell to Survive', desc: 'Generate revenue from sales. Rebuilding mentality.' },
      ],
    },
    {
      key: 'financialStrategy',
      title: 'Financial Strategy',
      description: 'Risk tolerance for financial decisions.',
      options: [
        { value: 'aggressive', label: 'Aggressive', desc: 'Spend big to compete. Risk financial instability.' },
        { value: 'balanced', label: 'Balanced', desc: 'Sustainable spending within means.' },
        { value: 'conservative', label: 'Conservative', desc: 'Minimize spending, maximize reserves. Less competitive short-term.' },
      ],
    },
  ];

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-black uppercase text-[#00e5ff]" style={{ fontFamily: RETRO }}>
        Strategy & Planning
      </h3>

      {sections.map((sec) => (
        <Panel key={sec.key}>
          <SectionTitle>{sec.title}</SectionTitle>
          <p className="text-[10px] text-[#98ca7a] mb-2">{sec.description}</p>
          <div className="grid grid-cols-1 gap-1 sm:grid-cols-3">
            {sec.options.map((opt) => {
              const isActive = strategy[sec.key] === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange({ ...strategy, [sec.key]: opt.value });
                    addLog(`Strategy: ${sec.title} changed to ${opt.label}.`);
                  }}
                  className={`text-left p-2 border transition-colors ${isActive ? 'border-[#efe56b] bg-[#2a8a2b]' : 'border-[#1a5a1e] bg-[#0a2e0d] hover:bg-[#1a4a1e]'}`}
                >
                  <div className={`text-[10px] font-bold uppercase ${isActive ? 'text-[#efe56b]' : 'text-[#d5f8b6]'}`} style={{ fontFamily: MONO }}>{opt.label}</div>
                  <div className={`text-[10px] mt-0.5 ${isActive ? 'text-[#d5f8b6]' : 'text-[#6b9a5a]'}`}>{opt.desc}</div>
                </button>
              );
            })}
          </div>
        </Panel>
      ))}
    </div>
  );
}

/* ══════════════════════════════════════════════
   Events Tab
   ══════════════════════════════════════════════ */

function EventsTab({ events, onResolve, addLog }: {
  events: GameEvent[];
  onResolve: (eventId: string, optionIndex: number) => void;
  addLog: (msg: string) => void;
}) {
  const unresolved = events.filter((e) => !e.resolved);
  const resolved = events.filter((e) => e.resolved);

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-black uppercase text-[#00e5ff]" style={{ fontFamily: RETRO }}>
        Events & Decisions ({unresolved.length} pending)
      </h3>

      {unresolved.length === 0 && (
        <Panel>
          <div className="text-center text-xs text-[#6b9a5a] italic p-4">
            No pending events. Check back after matches and training sessions.
          </div>
        </Panel>
      )}

      {unresolved.map((evt) => (
        <div key={evt.id} className={`border-2 p-3 ${evt.urgent ? 'border-[#8a2a2a] bg-[#1a0a0a]' : 'border-[#2a8a2b] bg-[#0d3f10]'}`}>
          <div className="flex items-center justify-between mb-1">
            <h4 className="text-xs font-black uppercase text-[#00e5ff]" style={{ fontFamily: RETRO }}>{evt.title}</h4>
            <div className="flex gap-2">
              <span className="text-[10px] text-[#6b9a5a] uppercase">{evt.type}</span>
              {evt.urgent && <span className="text-[10px] text-[#ff4444] font-bold uppercase animate-pulse">Urgent</span>}
            </div>
          </div>
          <p className="text-[10px] text-[#d5f8b6] mb-2" style={{ fontFamily: MONO }}>{evt.message}</p>
          <div className="grid grid-cols-1 gap-1 sm:grid-cols-3">
            {evt.options.map((opt, i) => (
              <button
                key={i}
                type="button"
                onClick={() => {
                  onResolve(evt.id, i);
                  addLog(`Event "${evt.title}": Chose "${opt.label}". ${opt.effect}.`);
                }}
                className="text-left border border-[#2a8a2b] bg-[#0a2e0d] p-2 hover:bg-[#1a4a1e] transition-colors"
              >
                <div className="text-[10px] font-bold uppercase text-[#efe56b]" style={{ fontFamily: MONO }}>{opt.label}</div>
                <div className="text-[10px] text-[#98ca7a] mt-0.5">{opt.effect}</div>
              </button>
            ))}
          </div>
        </div>
      ))}

      {resolved.length > 0 && (
        <div>
          <h4 className="text-[10px] font-bold uppercase text-[#6b9a5a] mb-1">Resolved Events ({resolved.length})</h4>
          <div className="space-y-1">
            {resolved.map((evt) => (
              <div key={evt.id} className="border border-[#1a5a1e] bg-[#0a2e0d] px-2 py-1 opacity-50">
                <span className="text-[9px] text-[#6b9a5a] uppercase" style={{ fontFamily: MONO }}>{evt.title}</span>
                <span className="ml-2 text-[10px] text-[#2a8a2b]">Resolved</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════
   Main Component
   ══════════════════════════════════════════════ */

export default function ClubManagement({ activeClub, squadPlayers }: ClubManagementProps) {
  const [tab, setTab] = useState<TabKey>('overview');
  const [log, setLog] = useState<string[]>([]);

  const addLog = useCallback((msg: string) => {
    setLog((prev) => [msg, ...prev].slice(0, 50));
  }, []);

  /* ── Club status ── */
  const initialStatus = useMemo((): ClubStatus => {
    const seed = hs(activeClub.id + 'manage-status');
    return {
      reputation: Math.round(35 + sr(seed) * 55),
      boardConfidence: Math.round(40 + sr(seed + 1) * 50),
      fanSentiment: Math.round(35 + sr(seed + 2) * 55),
      financialHealth: Math.round(30 + sr(seed + 3) * 60),
      jobSecurity: Math.round(40 + sr(seed + 4) * 50),
    };
  }, [activeClub.id]);

  const [clubStatus, setClubStatus] = useState<ClubStatus>(initialStatus);

  /* ── Strategy ── */
  const [strategy, setStrategy] = useState<Strategy>({
    playStyle: 'balanced',
    youthFocus: 'medium',
    transferPolicy: 'develop',
    financialStrategy: 'balanced',
  });

  /* ── Tasks ── */
  const initialTasks = useMemo(() => generateTasks(activeClub.id, activeClub.name), [activeClub.id, activeClub.name]);
  const [tasks, setTasks] = useState<Task[]>(initialTasks);

  /* ── Staff ── */
  const initialStaff = useMemo(() => generateStaff(activeClub.id), [activeClub.id]);
  const [staff, setStaff] = useState<Staff[]>(initialStaff);

  /* ── Events ── */
  const initialEvents = useMemo(() => generateEvents(activeClub.id, squadPlayers), [activeClub.id, squadPlayers]);
  const [events, setEvents] = useState<GameEvent[]>(initialEvents);

  /* ── Player relations ── */
  const initialRelations = useMemo(() => {
    const map = new Map<string, PlayerRelation>();
    for (const p of squadPlayers) {
      const status = p.morale >= 70 ? 'happy' : p.morale >= 40 ? 'neutral' : 'unhappy';
      map.set(p.id, { playerId: p.id, status: status as 'happy' | 'neutral' | 'unhappy', lastInteraction: '' });
    }
    return map;
  }, [squadPlayers]);

  const [relations, setRelations] = useState<Map<string, PlayerRelation>>(initialRelations);

  /* ── Apply impact helper ── */
  const applyImpact = useCallback((impact: EventImpact) => {
    setClubStatus((prev) => ({
      reputation: Math.max(0, Math.min(100, prev.reputation + (impact.reputation ?? 0))),
      boardConfidence: Math.max(0, Math.min(100, prev.boardConfidence + (impact.boardConfidence ?? 0))),
      fanSentiment: Math.max(0, Math.min(100, prev.fanSentiment + (impact.fanSentiment ?? 0))),
      financialHealth: Math.max(0, Math.min(100, prev.financialHealth + Math.round((impact.budget ?? 0) / 200000))),
      jobSecurity: Math.max(0, Math.min(100, prev.jobSecurity + (impact.boardConfidence ?? 0) * 0.5)),
    }));
  }, []);

  /* ── Task handlers ── */
  const handleUpdateTask = useCallback((id: string, updates: Partial<Task>) => {
    setTasks((prev) => prev.map((t) => t.id === id ? { ...t, ...updates } : t));
    if (updates.status === 'completed') {
      applyImpact({ boardConfidence: 3, reputation: 1 });
      addLog(`Task completed. Board confidence +3.`);
    } else if (updates.status === 'failed') {
      applyImpact({ boardConfidence: -5, fanSentiment: -3 });
      addLog(`Task failed. Board confidence -5.`);
    }
  }, [applyImpact, addLog]);

  const handleDelegate = useCallback((taskId: string, staffId: string) => {
    setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, delegatedTo: staffId } : t));
    const s = staff.find((x) => x.id === staffId);
    if (s) addLog(`Task delegated to ${s.name}.`);
  }, [staff, addLog]);

  /* ── Staff handlers ── */
  const handleStaffFire = useCallback((id: string) => {
    setStaff((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const handleStaffExtend = useCallback((id: string) => {
    setStaff((prev) => prev.map((s) => s.id === id ? { ...s, contractYears: s.contractYears + 1 } : s));
  }, []);

  const handleStaffAssign = useCallback((id: string, assignment: string) => {
    setStaff((prev) => prev.map((s) => s.id === id ? { ...s, assignment } : s));
  }, []);

  /* ── Player interaction ── */
  const handlePlayerInteract = useCallback((playerId: string, action: string, impact: number) => {
    setRelations((prev) => {
      const next = new Map(prev);
      const rel = next.get(playerId);
      if (rel) {
        const newStatus = impact > 10 ? 'happy' : impact < -5 ? 'unhappy' : rel.status;
        next.set(playerId, { ...rel, status: newStatus as 'happy' | 'neutral' | 'unhappy', lastInteraction: action });
      }
      return next;
    });
    if (impact > 0) {
      applyImpact({ morale: 1 });
    } else if (impact < -5) {
      applyImpact({ morale: -1, boardConfidence: -1 });
    }
  }, [applyImpact]);

  /* ── Board action ── */
  const handleBoardAction = useCallback((action: string) => {
    if (action === 'Request Transfer Funds') {
      applyImpact({ budget: 3000000, boardConfidence: -3 });
    } else if (action === 'Explain Poor Results') {
      applyImpact({ boardConfidence: 5 });
    } else {
      applyImpact({ boardConfidence: -2 });
    }
  }, [applyImpact]);

  /* ── Media action ── */
  const handleMediaAction = useCallback((action: string) => {
    if (action === 'Hold Press Conference' || action === 'Exclusive Interview') {
      applyImpact({ fanSentiment: 5, reputation: 2 });
    } else if (action === 'No Comment Policy') {
      applyImpact({ fanSentiment: -5 });
    } else if (action === 'Community Outreach') {
      applyImpact({ fanSentiment: 8, reputation: 3 });
    } else {
      applyImpact({ fanSentiment: -2, reputation: -1 });
    }
  }, [applyImpact]);

  /* ── Sponsor action ── */
  const handleSponsorAction = useCallback((name: string, accepted: boolean) => {
    if (accepted) {
      if (name === 'QuickBet Ltd') {
        applyImpact({ budget: 3500000, reputation: -8, fanSentiment: -10 });
      } else if (name === 'GreenEnergy Co') {
        applyImpact({ budget: 800000, reputation: 8, fanSentiment: 5 });
      } else {
        applyImpact({ budget: 1500000, reputation: 2 });
      }
    } else {
      applyImpact({ reputation: 1 });
    }
  }, [applyImpact]);

  /* ── Event resolve ── */
  const handleResolveEvent = useCallback((eventId: string, optionIndex: number) => {
    setEvents((prev) => prev.map((e) => {
      if (e.id !== eventId) return e;
      const opt = e.options[optionIndex];
      if (opt) applyImpact(opt.impact);
      return { ...e, resolved: true };
    }));
  }, [applyImpact]);

  /* ── Unresolved count for tab badge ── */
  const unresolvedCount = events.filter((e) => !e.resolved).length;
  const urgentCount = events.filter((e) => !e.resolved && e.urgent).length;

  return (
    <section className="border-4 border-[#6f4ca1] bg-[#16a51c] p-3">
      <h2 className="mb-3 border border-[#ceb8e1] bg-[#d5b5ec] p-2 text-center text-sm font-bold uppercase text-[#2e1f4a]">
        Club Management
      </h2>

      {/* Status bar */}
      <div className="border-2 border-[#efe56b] bg-[#1a3a1e] px-3 py-2 mb-3">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
          <span className="text-[#98ca7a]">Reputation: <StatusBadge value={clubStatus.reputation} /></span>
          <span className="text-[#98ca7a]">Board: <StatusBadge value={clubStatus.boardConfidence} /></span>
          <span className="text-[#98ca7a]">Fans: <StatusBadge value={clubStatus.fanSentiment} /></span>
          <span className="text-[#98ca7a]">Finances: <StatusBadge value={clubStatus.financialHealth} /></span>
          <span className="text-[#98ca7a]">Job Security: <StatusBadge value={clubStatus.jobSecurity} /></span>
          {urgentCount > 0 && (
            <span className="border border-[#8a2a2a] bg-[#3f100d] px-1.5 py-0.5 text-[10px] text-[#ff4444] font-bold animate-pulse cursor-pointer" onClick={() => setTab('events')}>
              {urgentCount} Urgent
            </span>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-3 flex flex-wrap gap-1 border-2 border-[#2a8a2b] bg-[#0d3f10] p-2">
        {TABS.map((t) => (
          <Btn key={t.key} active={tab === t.key} onClick={() => setTab(t.key)}>
            {t.label}
            {t.key === 'events' && unresolvedCount > 0 && (
              <span className="ml-1 text-[10px] text-[#ff4444]">({unresolvedCount})</span>
            )}
          </Btn>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'overview' && (
        <OverviewTab clubStatus={clubStatus} squad={squadPlayers} tasks={tasks} events={events} strategy={strategy} setTab={setTab} />
      )}
      {tab === 'tasks' && (
        <TasksTab tasks={tasks} staff={staff} onUpdateTask={handleUpdateTask} onDelegate={handleDelegate} />
      )}
      {tab === 'staff' && (
        <StaffTab staff={staff} onFire={handleStaffFire} onExtend={handleStaffExtend} onAssign={handleStaffAssign} addLog={addLog} />
      )}
      {tab === 'players' && (
        <PlayerInteractionTab squad={squadPlayers} relations={relations} onInteract={handlePlayerInteract} addLog={addLog} />
      )}
      {tab === 'board' && (
        <BoardTab clubStatus={clubStatus} onBoardAction={handleBoardAction} addLog={addLog} />
      )}
      {tab === 'external' && (
        <ExternalTab clubStatus={clubStatus} onMediaAction={handleMediaAction} onSponsorAction={handleSponsorAction} addLog={addLog} />
      )}
      {tab === 'strategy' && (
        <StrategyTab strategy={strategy} onChange={setStrategy} addLog={addLog} />
      )}
      {tab === 'events' && (
        <EventsTab events={events} onResolve={handleResolveEvent} addLog={addLog} />
      )}

      {/* Activity log */}
      {log.length > 0 && (
        <div className="mt-3 border-2 border-[#2a8a2b] bg-[#0a2e0d] p-2 max-h-32 overflow-y-auto">
          <h4 className="text-[9px] font-bold uppercase text-[#6b9a5a] mb-1">Management Log</h4>
          {log.map((msg, i) => (
            <div key={i} className="text-[9px] text-[#98ca7a] border-b border-[#1a3a1e] py-0.5" style={{ fontFamily: MONO }}>
              {msg}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
