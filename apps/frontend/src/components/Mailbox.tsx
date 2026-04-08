import { useState, useMemo, useCallback } from 'react';
import type { ManagerSummary } from '@tmt/shared';

/* ── Types ── */

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
}

type MailType = 'board' | 'player' | 'media' | 'finance' | 'match' | 'transfer';
type MailPriority = 'low' | 'medium' | 'high';

interface MailAction {
  label: string;
  action: string;
}

interface Mail {
  id: string;
  type: MailType;
  subject: string;
  message: string;
  from: string;
  date: string;
  read: boolean;
  priority: MailPriority;
  actions?: MailAction[];
  response?: string;
}

interface MailboxProps {
  activeClub: Club;
  clubs: Club[];
  squadPlayers: SquadPlayer[];
  summary: ManagerSummary | null;
}

/* ── Helpers ── */

function seeded(seed: number) {
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

function pick<T>(arr: T[], seed: number): T {
  return arr[Math.floor(seeded(seed) * arr.length)];
}

function mailDate(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${d.getDate()} ${months[d.getMonth()]}`;
}

/* ── Mail Icons ── */

const TYPE_ICONS: Record<MailType, string> = {
  board: '🏛️',
  player: '⚽',
  media: '📰',
  finance: '💰',
  match: '🏟️',
  transfer: '📋',
};

const TYPE_LABELS: Record<MailType, string> = {
  board: 'Board',
  player: 'Player',
  media: 'Media',
  finance: 'Finance',
  match: 'Match',
  transfer: 'Transfer',
};

const PRIORITY_STYLES: Record<MailPriority, { border: string; dot: string; label: string }> = {
  high: { border: 'border-l-[#ef4444]', dot: 'bg-[#ef4444]', label: 'URGENT' },
  medium: { border: 'border-l-[#eab308]', dot: 'bg-[#eab308]', label: 'IMPORTANT' },
  low: { border: 'border-l-[#22c55e]', dot: 'bg-[#22c55e]', label: '' },
};

/* ── Event-driven mail generator ── */

function generateMails(club: Club, clubs: Club[], squad: SquadPlayer[], summary: ManagerSummary | null): Mail[] {
  const seed = hashStr(club.id + club.name);
  const mails: Mail[] = [];
  const otherClubs = clubs.filter((c) => c.id !== club.id);
  const division = club.leagueName ?? '1st Division';

  let idCounter = 0;
  const nextId = () => `mail-${++idCounter}`;

  // ─── 1. Welcome / season intro (always present) ───
  mails.push({
    id: nextId(),
    type: 'board',
    subject: `Welcome to ${club.name}`,
    message: `Dear Manager,\n\nWelcome to ${club.name}. The board and supporters are excited to have you at the helm.\n\nWe compete in the ${division} and our budget stands at €${club.budget.toLocaleString()}. The board expects competitive performances and a clear tactical identity.\n\nWe trust your judgement. Good luck for the season ahead.`,
    from: `${club.name} Board of Directors`,
    date: mailDate(14),
    read: true,
    priority: 'medium',
  });

  // ─── 2. Board expectations ───
  const boardExpectation = pick(
    ['a top half finish', 'to avoid relegation', 'a promotion push', 'a top 10 finish', 'to challenge for the title'],
    seed + 1
  );
  mails.push({
    id: nextId(),
    type: 'board',
    subject: 'Season Objectives',
    message: `The board has set the following objectives for this season:\n\n• League: Achieve ${boardExpectation} in the ${division}.\n• Cup: Make progress in the domestic cup competition.\n• Finance: Operate within the allocated wage budget.\n• Youth: Give opportunities to promising academy players.\n\nFailure to meet these targets may result in the board reviewing your position.`,
    from: 'Chairman',
    date: mailDate(13),
    read: true,
    priority: 'high',
    actions: [
      { label: 'Accept Objectives', action: 'accept_objectives' },
      { label: 'Request Adjustment', action: 'negotiate_objectives' },
    ],
  });

  // ─── 3. Finance report ───
  const wageBudget = Math.round(club.budget * 0.6);
  const currentSpend = Math.round(wageBudget * (0.55 + seeded(seed + 7) * 0.35));
  mails.push({
    id: nextId(),
    type: 'finance',
    subject: 'Monthly Financial Report',
    message: `Financial Summary:\n\n• Transfer Budget: €${club.budget.toLocaleString()}\n• Wage Budget: €${wageBudget.toLocaleString()}\n• Current Wage Spend: €${currentSpend.toLocaleString()}\n• Remaining Funds: €${(club.budget - Math.round(club.budget * 0.15)).toLocaleString()}\n\n${currentSpend > wageBudget * 0.85 ? 'WARNING: Wage spending is approaching the budget ceiling. The board advises caution with new contracts.' : 'Finances are in a healthy position. You have room to manoeuvre in the transfer market.'}`,
    from: 'Director of Finance',
    date: mailDate(10),
    read: false,
    priority: currentSpend > wageBudget * 0.85 ? 'high' : 'low',
  });

  // ─── 4. Transfer bids (from other clubs for your players) ───
  if (squad.length > 0 && otherClubs.length > 0) {
    for (let i = 0; i < 2; i++) {
      const bidder = pick(otherClubs, seed + 20 + i);
      const target = pick(squad, seed + 30 + i);
      const fee = Math.round(0.5 + seeded(seed + 40 + i) * 12);
      mails.push({
        id: nextId(),
        type: 'transfer',
        subject: `Transfer Bid: ${target.name}`,
        message: `${bidder.name} have submitted a formal bid of €${fee}M for ${target.name} (${target.role}, age ${target.age}).\n\nThe player is ${target.morale > 60 ? 'content at the club' : 'interested in discussing terms'}.\n\nHow would you like to proceed?`,
        from: 'Transfer Committee',
        date: mailDate(3 + i),
        read: false,
        priority: 'high',
        actions: [
          { label: 'Accept Bid', action: `accept_transfer_${target.id}` },
          { label: 'Reject Bid', action: `reject_transfer_${target.id}` },
          { label: 'Negotiate', action: `negotiate_transfer_${target.id}` },
        ],
      });
    }
  }

  // ─── 5. Player complaints (low morale) ───
  const unhappyPlayers = squad.filter((p) => p.morale < 45);
  for (const player of unhappyPlayers.slice(0, 2)) {
    mails.push({
      id: nextId(),
      type: 'player',
      subject: `${player.name} Wants to Talk`,
      message: `${player.name} has requested a meeting.\n\n"I'm not happy with my current situation at the club. I've only played ${player.played} matches this season and I feel I deserve more opportunities. If things don't change, I may have to consider my future here."\n\nThe dressing room is watching how you handle this.`,
      from: player.name,
      date: mailDate(2),
      read: false,
      priority: 'medium',
      actions: [
        { label: 'Promise More Playtime', action: `promise_time_${player.id}` },
        { label: 'Explain Situation', action: `explain_${player.id}` },
        { label: 'Transfer List', action: `transfer_list_${player.id}` },
      ],
    });
  }

  // ─── 6. Happy player ───
  const happyPlayers = squad.filter((p) => p.morale > 75);
  if (happyPlayers.length > 0) {
    const star = pick(happyPlayers, seed + 60);
    mails.push({
      id: nextId(),
      type: 'player',
      subject: `${star.name} Interview`,
      message: `${star.name} spoke to the media after training:\n\n"I'm really enjoying my football at ${club.name}. The manager has given me confidence and I feel like I'm playing the best football of my career. I hope to repay that faith with goals and performances."\n\nThis has boosted dressing room morale.`,
      from: 'Press Office',
      date: mailDate(4),
      read: true,
      priority: 'low',
    });
  }

  // ─── 7. Media coverage ───
  const mediaTemplates = [
    {
      subject: 'Pundit Analysis',
      message: `Sky Sports pundits discussed ${club.name} on last night's programme:\n\n"${club.name} have been ${pick(['impressive', 'inconsistent', 'solid', 'disappointing'], seed + 70)} this season. The manager needs to ${pick(['find more consistency', 'improve the defence', 'invest in attacking talent', 'give youth a chance'], seed + 71)} if they want to ${pick(['challenge at the top', 'survive in this league', 'push for promotion', 'meet the board\'s expectations'], seed + 72)}."\n\nFan forums are buzzing with reactions.`,
      priority: 'low' as MailPriority,
    },
    {
      subject: 'Press Conference Preview',
      message: `You have a press conference scheduled before the next match.\n\nExpected questions:\n• Recent form and results\n• Injury updates\n• Transfer rumours\n• Board expectations\n\nThe media will be watching your responses closely. Your words may affect player and supporter morale.`,
      priority: 'medium' as MailPriority,
    },
  ];
  const media = pick(mediaTemplates, seed + 75);
  mails.push({
    id: nextId(),
    type: 'media',
    subject: media.subject,
    message: media.message,
    from: 'Media Department',
    date: mailDate(1),
    read: false,
    priority: media.priority,
  });

  // ─── 8. Match report (last match) ───
  const homeGoals = Math.floor(seeded(seed + 80) * 4);
  const awayGoals = Math.floor(seeded(seed + 81) * 3);
  const opponent = pick(otherClubs.length > 0 ? otherClubs : [club], seed + 82);
  const result = homeGoals > awayGoals ? 'WIN' : homeGoals < awayGoals ? 'LOSS' : 'DRAW';
  const resultEmoji = result === 'WIN' ? '✅' : result === 'LOSS' ? '❌' : '➖';
  mails.push({
    id: nextId(),
    type: 'match',
    subject: `Match Report: ${club.name} ${homeGoals}-${awayGoals} ${opponent.name}`,
    message: `${resultEmoji} Full Time: ${club.name} ${homeGoals} - ${awayGoals} ${opponent.name}\n\nResult: ${result}\n\n${result === 'WIN' ? 'An excellent performance from the lads. The gameplan was executed well and the players showed great determination.' : result === 'LOSS' ? 'A disappointing result. The team struggled to create chances and looked vulnerable at the back. The board will expect a response.' : 'A hard-fought draw. Neither side could find a breakthrough. The team showed resilience but lacked a cutting edge.'}\n\nAttendance: ${(15000 + Math.floor(seeded(seed + 83) * 30000)).toLocaleString()}\nRating: ${(5.5 + seeded(seed + 84) * 4.0).toFixed(1)}/10`,
    from: 'Match Analyst',
    date: mailDate(0),
    read: false,
    priority: result === 'LOSS' ? 'medium' : 'low',
  });

  // ─── 9. Board reaction to results ───
  if (summary) {
    if (summary.successiveLosses >= 2) {
      mails.push({
        id: nextId(),
        type: 'board',
        subject: '⚠ Board Warning',
        message: `The board is concerned about the recent run of ${summary.successiveLosses} consecutive defeats.\n\nYour position as manager is under review. Immediate improvement in results is required or the board may be forced to take action.\n\nThis is a formal warning.`,
        from: 'Chairman',
        date: mailDate(0),
        read: false,
        priority: 'high',
      });
    } else if (summary.successiveWins >= 3) {
      mails.push({
        id: nextId(),
        type: 'board',
        subject: 'Board Commendation',
        message: `Congratulations on the magnificent run of ${summary.successiveWins} consecutive victories!\n\nThe board is delighted with performances and the supporters are fully behind the team. Keep up the excellent work.\n\nAs a gesture of confidence, the board has approved a small increase to the transfer budget.`,
        from: 'Chairman',
        date: mailDate(0),
        read: false,
        priority: 'medium',
      });
    }
  }

  // ─── 10. Scout report ───
  if (otherClubs.length > 0) {
    const scoutTarget = pick(['midfielder', 'striker', 'defender', 'goalkeeper', 'winger'], seed + 90);
    const scoutClub = pick(otherClubs, seed + 91);
    const scoutAge = 18 + Math.floor(seeded(seed + 92) * 14);
    const scoutFee = Math.round(0.5 + seeded(seed + 93) * 8);
    mails.push({
      id: nextId(),
      type: 'transfer',
      subject: `Scout Report: ${scoutTarget} available`,
      message: `Our scouts have identified a promising ${scoutTarget} at ${scoutClub.name}.\n\nAge: ${scoutAge}\nEstimated fee: €${scoutFee}M\nScouting rating: ${pick(['A', 'B+', 'B', 'C+'], seed + 94)}\n\nThe player would strengthen our ${scoutTarget === 'striker' || scoutTarget === 'winger' ? 'attack' : scoutTarget === 'midfielder' ? 'midfield' : 'defence'}. Shall we pursue the deal?`,
      from: 'Chief Scout',
      date: mailDate(5),
      read: true,
      priority: 'low',
      actions: [
        { label: 'Make Enquiry', action: 'scout_enquiry' },
        { label: 'Not Interested', action: 'scout_dismiss' },
      ],
    });
  }

  // ─── 11. Sponsor message ───
  const sponsorAmount = Math.round(0.2 + seeded(seed + 100) * 3);
  mails.push({
    id: nextId(),
    type: 'finance',
    subject: 'New Sponsorship Offer',
    message: `A new sponsor has approached the club with a deal worth €${sponsorAmount}M per season.\n\nTerms:\n• Duration: 2 seasons\n• Kit sponsorship: ${pick(['front of shirt', 'sleeve', 'training kit'], seed + 101)}\n• Bonus clauses: Performance-related bonuses for cup progression\n\nThe finance department recommends accepting the deal.`,
    from: 'Commercial Director',
    date: mailDate(7),
    read: true,
    priority: 'medium',
    actions: [
      { label: 'Accept Deal', action: 'accept_sponsor' },
      { label: 'Reject Deal', action: 'reject_sponsor' },
    ],
  });

  // Sort by date (newest first) — lower daysAgo = newer
  return mails.sort((a, b) => {
    const da = parseDateSortKey(a.date);
    const db = parseDateSortKey(b.date);
    return db - da;
  });
}

function parseDateSortKey(dateStr: string): number {
  const months: Record<string, number> = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };
  const parts = dateStr.split(' ');
  const day = parseInt(parts[0], 10);
  const month = months[parts[1]] ?? 0;
  return month * 31 + day;
}

/* ── Sub-components ── */

function MailPriorityDot({ priority }: { priority: MailPriority }) {
  const style = PRIORITY_STYLES[priority];
  if (priority === 'low') return null;
  return (
    <span className={`inline-block h-2 w-2 shrink-0 rounded-full ${style.dot}`} title={style.label} />
  );
}

function MailListItem({
  mail,
  selected,
  onClick,
}: {
  mail: Mail;
  selected: boolean;
  onClick: () => void;
}) {
  const style = PRIORITY_STYLES[mail.priority];
  const preview = mail.message.split('\n')[0].slice(0, 60) + (mail.message.length > 60 ? '…' : '');

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left border-l-4 ${style.border} ${
        selected ? 'bg-[#1f641d]' : mail.read ? 'bg-[#0d3f10]' : 'bg-[#1a4a1e]'
      } border-b border-[#1a5a1e] px-2 py-1.5 transition-colors hover:bg-[#1f641d]`}
    >
      <div className="flex items-center gap-1.5">
        <span className="shrink-0 text-sm">{TYPE_ICONS[mail.type]}</span>
        <MailPriorityDot priority={mail.priority} />
        <span className={`flex-1 truncate text-xs ${mail.read ? 'text-[#98ca7a]' : 'font-bold text-white'}`}>{mail.subject}</span>
        <span className="shrink-0 text-[10px] text-[#6b9a5a]">{mail.date}</span>
      </div>
      <p className="mt-0.5 truncate pl-6 text-[10px] text-[#6b9a5a]">{preview}</p>
    </button>
  );
}

function MailDetail({
  mail,
  onAction,
  onBack,
}: {
  mail: Mail;
  onAction: (mailId: string, action: string) => void;
  onBack: () => void;
}) {
  const style = PRIORITY_STYLES[mail.priority];

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b-2 border-[#2a8a2b] bg-[#1f641d] px-3 py-2">
        <button type="button" onClick={onBack} className="text-xs font-bold text-[#efe56b] hover:text-white">
          ← Back
        </button>
        <span className="text-[10px] text-[#6b9a5a]">{mail.date}</span>
      </div>

      {/* Meta */}
      <div className="border-b border-[#1a5a1e] px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">{TYPE_ICONS[mail.type]}</span>
          <div className="flex-1">
            <h3 className={`text-sm font-bold ${mail.priority === 'high' ? 'text-[#ef4444]' : 'text-white'}`}>{mail.subject}</h3>
            <p className="text-[10px] text-[#98ca7a]">
              From: <strong className="text-[#d5f8b6]">{mail.from}</strong>
              <span className="ml-2 inline-block rounded px-1 text-[9px] uppercase" style={{ background: '#1a3a1e' }}>
                {TYPE_LABELS[mail.type]}
              </span>
              {mail.priority !== 'low' && (
                <span className={`ml-1 inline-block rounded px-1 text-[9px] font-bold uppercase ${style.dot} text-white`}>
                  {style.label}
                </span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-3 py-2">
        {mail.message.split('\n').map((line, i) => {
          if (line.startsWith('•')) {
            return (
              <p key={i} className="ml-2 text-xs leading-relaxed text-[#d5f8b6]">
                {line}
              </p>
            );
          }
          if (line.trim() === '') {
            return <div key={i} className="h-2" />;
          }
          return (
            <p key={i} className="text-xs leading-relaxed text-[#d5f8b6]">
              {line}
            </p>
          );
        })}

        {/* Response */}
        {mail.response && (
          <div className="mt-3 border-l-2 border-[#efe56b] bg-[#1a3a1e] px-2 py-1.5">
            <p className="text-[10px] font-bold uppercase text-[#efe56b]">Your Response</p>
            <p className="text-xs text-[#d5f8b6]">{mail.response}</p>
          </div>
        )}
      </div>

      {/* Actions */}
      {mail.actions && mail.actions.length > 0 && !mail.response && (
        <div className="border-t-2 border-[#2a8a2b] bg-[#1a3a1e] px-3 py-2">
          <p className="mb-1.5 text-[10px] font-bold uppercase text-[#efe56b]">Choose Action</p>
          <div className="flex flex-wrap gap-1.5">
            {mail.actions.map((act) => (
              <button
                key={act.action}
                type="button"
                onClick={() => onAction(mail.id, act.action)}
                className="border border-[#98ca7a] bg-[#256d22] px-3 py-1 text-xs font-bold text-white transition-colors hover:bg-[#2a8a2b] hover:text-[#efe56b]"
              >
                {act.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Main Component ── */

export default function Mailbox({ activeClub, clubs, squadPlayers, summary }: MailboxProps) {
  const initialMails = useMemo(
    () => generateMails(activeClub, clubs, squadPlayers, summary),
    [activeClub, clubs, squadPlayers, summary]
  );

  const [mails, setMails] = useState<Mail[]>(initialMails);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<MailType | 'all'>('all');

  // Resync when club changes
  const [lastClubId, setLastClubId] = useState(activeClub.id);
  if (activeClub.id !== lastClubId) {
    setMails(initialMails);
    setSelectedId(null);
    setLastClubId(activeClub.id);
  }

  const selectedMail = mails.find((m) => m.id === selectedId) ?? null;

  const filteredMails = useMemo(
    () => (filter === 'all' ? mails : mails.filter((m) => m.type === filter)),
    [mails, filter]
  );

  const unreadCount = mails.filter((m) => !m.read).length;

  const handleSelect = useCallback((id: string) => {
    setSelectedId(id);
    setMails((prev) => prev.map((m) => (m.id === id ? { ...m, read: true } : m)));
  }, []);

  const handleAction = useCallback((mailId: string, action: string) => {
    const responseMap: Record<string, string> = {
      accept_objectives: 'You accepted the board\'s objectives. The board appreciates your commitment.',
      negotiate_objectives: 'You requested adjusted targets. The board will review your proposal.',
      accept_sponsor: 'You accepted the sponsorship deal. Additional revenue has been secured.',
      reject_sponsor: 'You rejected the sponsorship offer. The commercial department will seek alternatives.',
      scout_enquiry: 'You instructed scouts to make an official approach. Updates will follow.',
      scout_dismiss: 'You declined to pursue this target. The scouts will continue searching.',
    };

    // Generic action responses
    let response = responseMap[action];
    if (!response) {
      if (action.startsWith('accept_transfer_')) response = 'You accepted the transfer bid. The deal is being finalised.';
      else if (action.startsWith('reject_transfer_')) response = 'You rejected the transfer bid. The player stays.';
      else if (action.startsWith('negotiate_transfer_')) response = 'You instructed staff to negotiate a higher fee.';
      else if (action.startsWith('promise_time_')) response = 'You promised the player more game time. Their mood has improved slightly.';
      else if (action.startsWith('explain_')) response = 'You explained the squad competition. The player understands but remains watchful.';
      else if (action.startsWith('transfer_list_')) response = 'You placed the player on the transfer list. Other clubs have been notified.';
      else response = 'Action acknowledged.';
    }

    setMails((prev) =>
      prev.map((m) => (m.id === mailId ? { ...m, response } : m))
    );

    // Generate follow-up mail for transfer actions
    if (action.startsWith('accept_transfer_') || action.startsWith('transfer_list_')) {
      const followUp: Mail = {
        id: `mail-followup-${Date.now()}`,
        type: 'transfer',
        subject: 'Transfer Update',
        message: action.startsWith('accept_transfer_')
          ? 'The deal has been agreed in principle. Personal terms are being discussed with the player. The transfer should be completed within 48 hours.'
          : 'The player has been placed on the transfer list. Several clubs have been alerted and we expect interest in the coming days.',
        from: 'Transfer Committee',
        date: mailDate(0),
        read: false,
        priority: 'medium',
      };
      setMails((prev) => [followUp, ...prev]);
    }
  }, []);

  const filterTypes: (MailType | 'all')[] = ['all', 'board', 'player', 'media', 'finance', 'match', 'transfer'];

  return (
    <section className="border-4 border-[#6f4ca1] bg-[#16a51c] p-3">
      {/* Title */}
      <h2 className="mb-3 border border-[#ceb8e1] bg-[#d5b5ec] p-2 text-center text-sm font-bold uppercase text-[#2e1f4a]">
        Mailbox {unreadCount > 0 && <span className="ml-1 rounded bg-[#ef4444] px-1.5 py-0.5 text-[10px] text-white">{unreadCount}</span>}
      </h2>

      {/* Filter bar */}
      <div className="mb-2 flex flex-wrap gap-1">
        {filterTypes.map((ft) => (
          <button
            key={ft}
            type="button"
            onClick={() => { setFilter(ft); setSelectedId(null); }}
            className={`border px-2 py-0.5 text-[10px] font-bold uppercase transition-colors ${
              filter === ft
                ? 'border-[#efe56b] bg-[#2a8a2b] text-[#efe56b]'
                : 'border-[#1a5a1e] bg-[#0d3f10] text-[#98ca7a] hover:bg-[#1a4a1e]'
            }`}
          >
            {ft === 'all' ? `All (${mails.length})` : `${TYPE_ICONS[ft]} ${ft}`}
          </button>
        ))}
      </div>

      {/* Content area */}
      <div className="border-2 border-[#2a8a2b] bg-[#0a2e0d]" style={{ minHeight: '320px' }}>
        {selectedMail ? (
          <MailDetail
            mail={selectedMail}
            onAction={handleAction}
            onBack={() => setSelectedId(null)}
          />
        ) : filteredMails.length === 0 ? (
          <div className="flex items-center justify-center p-8">
            <p className="text-sm italic text-[#6b9a5a]">
              {filter === 'all' ? 'No messages available.' : `No ${filter} messages.`}
            </p>
          </div>
        ) : (
          <div className="max-h-[400px] overflow-y-auto">
            {filteredMails.map((mail) => (
              <MailListItem
                key={mail.id}
                mail={mail}
                selected={false}
                onClick={() => handleSelect(mail.id)}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
