export interface Tactics {
  teamId: string;
  sliders: {
    tempo: number; // 0-100
    pressing: number; // 0-100
    width: number; // 0-100
    mentality: number; // 0-100
    passingStyle: number; // 0-100
    defensiveLine: number; // 0-100
  };
  playerPositions: Array<{
    playerId: string;
    posX: number; // 0-100
    posY: number; // 0-100
  }>;
  tacticProfile: {
    buildUp: 'slow' | 'balanced' | 'fast';
    pressure: 'low' | 'medium' | 'high';
    shape: 'narrow' | 'balanced' | 'wide';
    risk: 'low' | 'medium' | 'high';
  };
}

export const exampleTactics: Tactics = {
  teamId: 'notts-forest',
  sliders: {
    tempo: 68,
    pressing: 61,
    width: 57,
    mentality: 64,
    passingStyle: 72,
    defensiveLine: 54
  },
  playerPositions: [
    { playerId: 'gk-1', posX: 50, posY: 8 },
    { playerId: 'cb-1', posX: 38, posY: 24 },
    { playerId: 'cb-2', posX: 62, posY: 24 },
    { playerId: 'cm-1', posX: 50, posY: 56 },
    { playerId: 'st-1', posX: 50, posY: 84 }
  ],
  tacticProfile: {
    buildUp: 'fast',
    pressure: 'medium',
    shape: 'balanced',
    risk: 'medium'
  }
};
