export type Formation = '4-4-2' | '4-3-3' | '3-5-2';

export interface Club {
  id: string;
  name: string;
  country: string;
  budget: number;
  reputation: number;
}

export interface Player {
  id: string;
  clubId: string;
  name: string;
  position: 'GK' | 'DF' | 'MF' | 'FW';
  age: number;
  overall: number;
  potential: number;
  wage: number;
}

export type MatchEventType = 'goal' | 'card' | 'substitution' | 'GOAL' | 'SHOT' | 'PASS' | 'FOUL';

export interface MatchEvent {
  minute: number;
  type: MatchEventType;
  team?: 'HOME' | 'AWAY' | string;
  description?: string;
}

export interface ManagerSummary {
  status: 'INEXPERIENCED' | 'PRO' | 'ELITE';
  level: number;
  successes: number;
  successiveWins: number;
  successiveLosses: number;
  totalWins: number;
  totalLosses: number;
  totalDraws: number;
}

// ────────────────────────────────────────────
// OFFLINE-FIRST: GameSave contract
// ────────────────────────────────────────────

/** Snapshot-based GameSave — the single API contract between frontend and backend. */
export interface GameSave {
  clubId: string;
  version: number;
  updatedAt: string; // ISO 8601
  data: unknown;     // Full GameState snapshot
}
