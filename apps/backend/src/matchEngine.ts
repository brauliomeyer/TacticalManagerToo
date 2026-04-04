import type { Player, Tactics } from '@prisma/client';

export type EngineEventType = 'GOAL' | 'SHOT' | 'PASS';

export interface EngineEvent {
  minute: number;
  type: EngineEventType;
  team: 'HOME' | 'AWAY';
  description: string;
}

interface TeamInput {
  players: Player[];
  tactics: Tactics | null;
}

interface TeamStrength {
  attack: number;
  midfield: number;
  defense: number;
  cohesion: number;
}

function avg(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((sum, val) => sum + val, 0) / values.length;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function zoneWeight(posY: number, target: 'ATTACK' | 'MID' | 'DEF') {
  if (target === 'ATTACK') return clamp(posY / 100, 0.3, 1.25);
  if (target === 'DEF') return clamp((100 - posY) / 100, 0.3, 1.25);
  return 1 - Math.abs(50 - posY) / 70;
}

function calculateTeamStrength(input: TeamInput): TeamStrength {
  const { players, tactics } = input;
  const attackValues = players.map((p) => (p.sho * 0.45 + p.pac * 0.25 + p.dri * 0.3) * zoneWeight(p.posY, 'ATTACK'));
  const midfieldValues = players.map((p) => (p.pas * 0.55 + p.stamina * 0.25 + p.form * 0.2) * zoneWeight(p.posY, 'MID'));
  const defenseValues = players.map((p) => (p.def * 0.55 + p.phy * 0.3 + p.stamina * 0.15) * zoneWeight(p.posY, 'DEF'));

  const shapeSpread = avg(players.map((p) => Math.abs(50 - p.posX)));
  const shapePenalty = clamp(shapeSpread / 100, 0, 0.25);

  const tempo = tactics?.tempo ?? 50;
  const pressing = tactics?.pressing ?? 50;
  const width = tactics?.width ?? 50;
  const mentalityBoost = (tactics?.mentality ?? 'Balanced') === 'Attacking' ? 1.06 : (tactics?.mentality ?? 'Balanced') === 'Defensive' ? 0.96 : 1;

  const attack = avg(attackValues) * (0.9 + tempo / 250) * mentalityBoost;
  const midfield = avg(midfieldValues) * (0.85 + pressing / 300);
  const defense = avg(defenseValues) * (0.9 + (100 - width) / 350);
  const cohesion = clamp(1 - shapePenalty, 0.75, 1.05);

  return { attack, midfield, defense, cohesion };
}

export function simulateMatchEngine(home: TeamInput, away: TeamInput) {
  const homeStrength = calculateTeamStrength(home);
  const awayStrength = calculateTeamStrength(away);

  let scoreHome = 0;
  let scoreAway = 0;
  const events: EngineEvent[] = [];

  for (let minute = 1; minute <= 90; minute += 1) {
    const homePossessionBias =
      homeStrength.midfield * homeStrength.cohesion - awayStrength.midfield * awayStrength.cohesion + (Math.random() - 0.5) * 20;
    const possessionTeam: 'HOME' | 'AWAY' = homePossessionBias >= 0 ? 'HOME' : 'AWAY';

    if (Math.random() < 0.62) {
      events.push({ minute, type: 'PASS', team: possessionTeam, description: `${possessionTeam} circulates possession.` });
    }

    const attacker = possessionTeam === 'HOME' ? homeStrength : awayStrength;
    const defender = possessionTeam === 'HOME' ? awayStrength : homeStrength;

    const buildUpChance = clamp((attacker.midfield * attacker.cohesion - defender.midfield * 0.35) / 220, 0.08, 0.58);
    if (Math.random() > buildUpChance) continue;

    const shotChance = clamp((attacker.attack - defender.defense * 0.42) / 210, 0.07, 0.45);
    if (Math.random() > shotChance) continue;

    events.push({ minute, type: 'SHOT', team: possessionTeam, description: `${possessionTeam} creates a shooting chance.` });

    const goalChance = clamp((attacker.attack * 0.56 - defender.defense * 0.5 + (Math.random() - 0.5) * 24) / 180, 0.03, 0.38);
    if (Math.random() > goalChance) continue;

    if (possessionTeam === 'HOME') scoreHome += 1;
    else scoreAway += 1;

    events.push({ minute, type: 'GOAL', team: possessionTeam, description: `${possessionTeam} scores!` });
  }

  return {
    scoreHome,
    scoreAway,
    events
  };
}
