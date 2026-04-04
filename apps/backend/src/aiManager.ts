export type TacticalStyle = 'defensive' | 'balanced' | 'attacking';
export type PlayerRole = 'GOALKEEPER' | 'DEFENDER' | 'MIDFIELDER' | 'ATTACKER';

export interface AIPlayer {
  id: string;
  name: string;
  role: PlayerRole;
  pac: number;
  sho: number;
  pas: number;
  dri: number;
  def: number;
  phy: number;
  stamina: number;
  form: number;
  morale: number;
  posX: number;
  posY: number;
}

export interface TeamTactic {
  style: TacticalStyle;
  tempo: number;
  pressing: number;
  width: number;
  mentality: string;
}

export interface AIPlan {
  lineup: AIPlayer[];
  bench: AIPlayer[];
  tactic: TeamTactic;
}

const STARTING_SLOTS: Record<PlayerRole, Array<{ x: number; y: number }>> = {
  GOALKEEPER: [{ x: 50, y: 8 }],
  DEFENDER: [
    { x: 18, y: 24 },
    { x: 38, y: 26 },
    { x: 62, y: 26 },
    { x: 82, y: 24 }
  ],
  MIDFIELDER: [
    { x: 24, y: 52 },
    { x: 50, y: 56 },
    { x: 76, y: 52 }
  ],
  ATTACKER: [
    { x: 30, y: 78 },
    { x: 50, y: 84 },
    { x: 70, y: 78 }
  ]
};

function roleScore(player: AIPlayer, role: PlayerRole) {
  const common = player.form * 0.2 + player.stamina * 0.15 + player.morale * 0.15;

  if (role === 'GOALKEEPER') return common + player.pas * 0.2 + player.phy * 0.15 + player.def * 0.15 + player.dri * 0.15;
  if (role === 'DEFENDER') return common + player.def * 0.35 + player.phy * 0.25 + player.pas * 0.1 + player.pac * 0.1;
  if (role === 'MIDFIELDER') return common + player.pas * 0.35 + player.dri * 0.2 + player.pac * 0.1 + player.def * 0.1;
  return common + player.sho * 0.35 + player.pac * 0.2 + player.dri * 0.15 + player.phy * 0.1;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export function pickBestLineup(players: AIPlayer[]): { lineup: AIPlayer[]; bench: AIPlayer[] } {
  const selected = new Set<string>();
  const lineup: AIPlayer[] = [];

  (Object.keys(STARTING_SLOTS) as PlayerRole[]).forEach((role) => {
    const needed = STARTING_SLOTS[role].length;
    const roleCandidates = players
      .filter((p) => !selected.has(p.id))
      .sort((a, b) => roleScore(b, role) - roleScore(a, role))
      .slice(0, needed)
      .map((player, index) => ({
        ...player,
        posX: STARTING_SLOTS[role][index].x,
        posY: STARTING_SLOTS[role][index].y
      }));

    roleCandidates.forEach((p) => selected.add(p.id));
    lineup.push(...roleCandidates);
  });

  const bench = players
    .filter((p) => !selected.has(p.id))
    .sort((a, b) =>
      roleScore(b, b.role) + b.form * 0.2 + b.morale * 0.1 - (roleScore(a, a.role) + a.form * 0.2 + a.morale * 0.1)
    );

  return { lineup, bench };
}

export function chooseTacticStyle(lineup: AIPlayer[], preferred: TacticalStyle = 'balanced'): TeamTactic {
  const attackPower = lineup.reduce((sum, p) => sum + p.sho + p.pac, 0) / Math.max(1, lineup.length);
  const defensePower = lineup.reduce((sum, p) => sum + p.def + p.phy, 0) / Math.max(1, lineup.length);

  let style: TacticalStyle = preferred;

  if (attackPower - defensePower > 8) style = 'attacking';
  else if (defensePower - attackPower > 8) style = 'defensive';

  if (style === 'attacking') {
    return { style, tempo: 78, pressing: 74, width: 70, mentality: 'Attacking' };
  }

  if (style === 'defensive') {
    return { style, tempo: 45, pressing: 52, width: 42, mentality: 'Defensive' };
  }

  return { style: 'balanced', tempo: 62, pressing: 60, width: 56, mentality: 'Balanced' };
}

export function adjustTacticDuringMatch(
  current: TeamTactic,
  scoreFor: number,
  scoreAgainst: number,
  minute: number
): TeamTactic {
  const goalDiff = scoreFor - scoreAgainst;
  const lateGame = minute >= 60;

  if (goalDiff < 0 && lateGame) {
    return {
      style: 'attacking',
      tempo: clamp(current.tempo + 12, 35, 95),
      pressing: clamp(current.pressing + 10, 35, 95),
      width: clamp(current.width + 8, 30, 95),
      mentality: 'Attacking'
    };
  }

  if (goalDiff > 0 && lateGame) {
    return {
      style: 'defensive',
      tempo: clamp(current.tempo - 10, 25, 90),
      pressing: clamp(current.pressing - 8, 25, 90),
      width: clamp(current.width - 8, 20, 80),
      mentality: 'Defensive'
    };
  }

  return { ...current, style: 'balanced', mentality: 'Balanced' };
}

export function buildAIPlan(players: AIPlayer[], preferredStyle: TacticalStyle = 'balanced'): AIPlan {
  const { lineup, bench } = pickBestLineup(players);
  const tactic = chooseTacticStyle(lineup, preferredStyle);
  return { lineup, bench, tactic };
}
