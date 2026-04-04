export interface TeamStats {
  attack: number;
  defense: number;
  midfield: number;
  possession: number;
  fatigue: number;
  ballWins: number;
  wingPlay: number;
  mistakes: number;
  offsideRisk: number;
  longBallRate: number;
  shortPassRate: number;
}

export interface TacticSliders {
  tempo: number; // 0-100
  pressing: number; // 0-100
  width: number; // 0-100
  mentality: number; // 0-100
  passingStyle: number; // 0-100
  defensiveLine: number; // 0-100
}

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

/**
 * Applies tactical slider impact to base team stats.
 */
export function applyTactics(teamStats: TeamStats, tactics: TacticSliders): TeamStats {
  const tempoFactor = tactics.tempo / 100;
  const pressingFactor = tactics.pressing / 100;
  const widthFactor = tactics.width / 100;
  const mentalityFactor = tactics.mentality / 100;
  const passingFactor = tactics.passingStyle / 100;
  const lineFactor = tactics.defensiveLine / 100;

  const attacksBoost = 8 * tempoFactor + 10 * mentalityFactor;
  const mistakesBoost = 6 * tempoFactor;

  const ballWinsBoost = 12 * pressingFactor;
  const fatigueBoost = 10 * pressingFactor + 4 * tempoFactor;

  const wingPlayBoost = 14 * widthFactor;

  const defensePenaltyFromMentality = 8 * mentalityFactor;
  const defenseBoostFromLine = 4 * lineFactor;

  const longBallRate = clamp(100 - tactics.passingStyle);
  const shortPassRate = clamp(tactics.passingStyle);

  const offsideRisk = clamp(teamStats.offsideRisk + 15 * lineFactor);

  return {
    ...teamStats,
    attack: clamp(teamStats.attack + attacksBoost),
    defense: clamp(teamStats.defense - defensePenaltyFromMentality + defenseBoostFromLine),
    midfield: clamp(teamStats.midfield + 6 * pressingFactor + 4 * passingFactor),
    possession: clamp(teamStats.possession + 5 * passingFactor - 3 * longBallRate * 0.01),
    fatigue: clamp(teamStats.fatigue + fatigueBoost),
    ballWins: clamp(teamStats.ballWins + ballWinsBoost),
    wingPlay: clamp(teamStats.wingPlay + wingPlayBoost),
    mistakes: clamp(teamStats.mistakes + mistakesBoost),
    offsideRisk,
    longBallRate,
    shortPassRate
  };
}
