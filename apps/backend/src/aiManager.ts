export type TacticalStyle = 'defensive' | 'balanced' | 'attacking';
export type PlayerRole = 'GOALKEEPER' | 'CENTER_BACK' | 'LEFT_BACK' | 'RIGHT_BACK' | 'SWEEPER' | 'LEFT_WING_BACK' | 'RIGHT_WING_BACK' | 'CENTRAL_MIDFIELDER' | 'DEFENSIVE_MIDFIELDER' | 'ATTACKING_MIDFIELDER' | 'LEFT_MIDFIELDER' | 'RIGHT_MIDFIELDER' | 'BOX_TO_BOX_MIDFIELDER' | 'ANCHOR' | 'LEFT_WINGER' | 'RIGHT_WINGER' | 'INVERTED_WINGER' | 'SECOND_STRIKER' | 'STRIKER' | 'TARGET_MAN' | 'FALSE_NINE' | 'PLAYMAKER';

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
  GOALKEEPER: [{ x: 50, y: 5 }],
  CENTER_BACK: [{ x: 50, y: 25 }],
  LEFT_BACK: [{ x: 10, y: 30 }],
  RIGHT_BACK: [{ x: 90, y: 30 }],
  SWEEPER: [{ x: 50, y: 15 }],
  LEFT_WING_BACK: [{ x: 15, y: 35 }],
  RIGHT_WING_BACK: [{ x: 85, y: 35 }],
  CENTRAL_MIDFIELDER: [{ x: 50, y: 45 }],
  DEFENSIVE_MIDFIELDER: [{ x: 35, y: 50 }],
  ATTACKING_MIDFIELDER: [{ x: 50, y: 65 }],
  LEFT_MIDFIELDER: [{ x: 25, y: 60 }],
  RIGHT_MIDFIELDER: [{ x: 75, y: 60 }],
  BOX_TO_BOX_MIDFIELDER: [{ x: 55, y: 50 }],
  ANCHOR: [{ x: 40, y: 40 }],
  LEFT_WINGER: [{ x: 20, y: 80 }],
  RIGHT_WINGER: [{ x: 80, y: 80 }],
  INVERTED_WINGER: [{ x: 30, y: 75 }],
  SECOND_STRIKER: [{ x: 40, y: 75 }],
  STRIKER: [{ x: 50, y: 90 }],
  TARGET_MAN: [{ x: 50, y: 88 }],
  FALSE_NINE: [{ x: 50, y: 85 }],
  PLAYMAKER: [{ x: 45, y: 55 }]
};

function roleScore(player: AIPlayer, role: PlayerRole) {
  const common = player.form * 0.2 + player.stamina * 0.15 + player.morale * 0.15;

  if (role === 'GOALKEEPER') return common + player.pas * 0.2 + player.phy * 0.15 + player.def * 0.15 + player.dri * 0.15;
  if (role === 'CENTER_BACK' || role === 'LEFT_BACK' || role === 'RIGHT_BACK') return common + player.def * 0.35 + player.phy * 0.25 + player.pas * 0.1 + player.pac * 0.1;
  if (role === 'SWEEPER') return common + player.def * 0.3 + player.pas * 0.25 + player.phy * 0.2 + player.dri * 0.1;
  if (role === 'LEFT_WING_BACK' || role === 'RIGHT_WING_BACK') return common + player.def * 0.25 + player.pac * 0.2 + player.pas * 0.15 + player.dri * 0.15;
  if (role === 'CENTRAL_MIDFIELDER') return common + player.pas * 0.25 + player.def * 0.2 + player.dri * 0.15 + player.phy * 0.1;
  if (role === 'DEFENSIVE_MIDFIELDER') return common + player.def * 0.25 + player.pas * 0.25 + player.phy * 0.2 + player.dri * 0.1;
  if (role === 'ATTACKING_MIDFIELDER') return common + player.pas * 0.25 + player.dri * 0.2 + player.sho * 0.15 + player.pac * 0.1;
  if (role === 'LEFT_MIDFIELDER' || role === 'RIGHT_MIDFIELDER') return common + player.pas * 0.2 + player.dri * 0.2 + player.pac * 0.15 + player.def * 0.1;
  if (role === 'BOX_TO_BOX_MIDFIELDER') return common + player.pac * 0.2 + player.def * 0.15 + player.sho * 0.15 + player.pas * 0.15;
  if (role === 'ANCHOR') return common + player.def * 0.3 + player.pas * 0.25 + player.phy * 0.15 + player.dri * 0.1;
  if (role === 'LEFT_WINGER' || role === 'RIGHT_WINGER') return common + player.pac * 0.25 + player.dri * 0.2 + player.sho * 0.15 + player.pas * 0.1;
  if (role === 'INVERTED_WINGER') return common + player.dri * 0.25 + player.pas * 0.2 + player.pac * 0.15 + player.sho * 0.1;
  if (role === 'SECOND_STRIKER') return common + player.sho * 0.25 + player.pas * 0.2 + player.dri * 0.15 + player.pac * 0.1;
  if (role === 'STRIKER') return common + player.sho * 0.35 + player.pac * 0.2 + player.dri * 0.15 + player.phy * 0.1;
  if (role === 'TARGET_MAN') return common + player.phy * 0.3 + player.sho * 0.25 + player.pac * 0.15 + player.def * 0.1;
  if (role === 'FALSE_NINE') return common + player.pas * 0.3 + player.dri * 0.25 + player.sho * 0.15 + player.pac * 0.1;
  if (role === 'PLAYMAKER') return common + player.pas * 0.4 + player.dri * 0.25 + player.sho * 0.1 + player.def * 0.05;
  return common + player.pas * 0.2 + player.dri * 0.2 + player.sho * 0.2 + player.def * 0.2; // default fallback
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
