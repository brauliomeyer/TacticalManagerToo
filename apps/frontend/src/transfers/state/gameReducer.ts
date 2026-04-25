/* ═══════════════════════════════════════════════════════════════════
   gameReducer.ts — Types, reducer & action handlers for Transfers module
   ═══════════════════════════════════════════════════════════════════ */

// ────────────────────────────────────────────
// TYPES
// ────────────────────────────────────────────

export interface PlayerAttributes {
  technical: number;
  mental: number;
  physical: number;
}

export interface Player {
  id: string;
  name: string;
  age: number;
  nationality: string;
  position: string;
  attributes: PlayerAttributes;
  potential: number;
  value: number;
  wage: number;
  contractYears: number;
  clubId: string | null;
  morale: number;
  form: number;
  isYouth: boolean;
  isListed: boolean;
}

export interface Club {
  id: string;
  name: string;
  country: string;
  budget: number;
  reputation: number;
  leagueId?: string | null;
  leagueName?: string | null;
  wageBudget?: number;
  wageSpent?: number;
}

export interface Transfer {
  id: string;
  playerId: string;
  playerName: string;
  fromClubId: string;
  fromClubName: string;
  toClubId: string;
  toClubName: string;
  fee: number;
  wage: number;
  status: 'completed' | 'cancelled';
  date: number;
}

export interface Offer {
  id: string;
  playerId: string;
  fromClubId: string;
  toClubId: string;
  amount: number;
  wage: number;
  status: 'pending' | 'accepted' | 'rejected' | 'counter';
  type: 'incoming' | 'outgoing';
  createdAt: number;
}

export interface ShortlistEntry {
  playerId: string;
  addedAt: number;
  notes?: string;
}

export interface TransferState {
  clubs: Record<string, Club>;
  players: Record<string, Player>;
  transfers: Record<string, Transfer>;
  offers: Record<string, Offer>;
  shortlist: ShortlistEntry[];
  youthAcademy: Player[];
  activeClubId: string;
  week: number;
  windowOpen: boolean;
  windowDaysLeft: number;
  ui: {
    activeTab: TabKey;
    scoutQuery: string;
    scoutResults: string[];
    scoutLoading: boolean;
    sortBy: string;
    sortDir: 'asc' | 'desc';
    filterPosition: string;
    filterAgeMin: number;
    filterAgeMax: number;
    filterValueMin: number;
    filterValueMax: number;
  };
}

export type TabKey =
  | 'overview'
  | 'squad'
  | 'transfer-list'
  | 'scout'
  | 'shortlist'
  | 'offers'
  | 'youth';

// ────────────────────────────────────────────
// ACTIONS
// ────────────────────────────────────────────

export type TransferAction =
  | { type: 'SET_ACTIVE_CLUB'; clubId: string }
  | { type: 'SET_TAB'; tab: TabKey }
  | { type: 'SET_CLUBS'; clubs: Club[] }
  | { type: 'SET_PLAYERS'; players: Player[] }
  | { type: 'ADD_OFFER'; offer: Offer }
  | { type: 'UPDATE_OFFER'; offer: Offer }
  | { type: 'REMOVE_OFFER'; offerId: string }
  | { type: 'COMPLETE_TRANSFER'; transfer: Transfer; player: Player; fromClub: Club; toClub: Club }
  | { type: 'ADD_TO_SHORTLIST'; playerId: string }
  | { type: 'REMOVE_FROM_SHORTLIST'; playerId: string }
  | { type: 'SET_SHORTLIST_NOTE'; playerId: string; notes: string }
  | { type: 'SET_YOUTH_ACADEMY'; players: Player[] }
  | { type: 'PROMOTE_YOUTH'; playerId: string }
  | { type: 'RELEASE_YOUTH'; playerId: string }
  | { type: 'LIST_PLAYER'; playerId: string }
  | { type: 'UNLIST_PLAYER'; playerId: string }
  | { type: 'UPDATE_PLAYER_VALUE'; playerId: string; value: number }
  | { type: 'UPDATE_CLUB_BUDGET'; clubId: string; budget: number; wageSpent: number }
  | { type: 'ADVANCE_WEEK' }
  | { type: 'SET_SCOUT_QUERY'; query: string }
  | { type: 'SET_SCOUT_RESULTS'; playerIds: string[] }
  | { type: 'SET_SCOUT_LOADING'; loading: boolean }
  | { type: 'SET_SORT'; sortBy: string; sortDir: 'asc' | 'desc' }
  | { type: 'SET_FILTER_POSITION'; position: string }
  | { type: 'SET_FILTER_AGE'; min: number; max: number }
  | { type: 'SET_FILTER_VALUE'; min: number; max: number }
  | { type: 'SET_WINDOW'; open: boolean; daysLeft: number }
  | { type: 'RESET_STATE'; state: TransferState };

// ────────────────────────────────────────────
// INITIAL STATE
// ────────────────────────────────────────────

export const initialTransferState: TransferState = {
  clubs: {},
  players: {},
  transfers: {},
  offers: {},
  shortlist: [],
  youthAcademy: [],
  activeClubId: '',
  week: 1,
  windowOpen: true,
  windowDaysLeft: 30,
  ui: {
    activeTab: 'overview',
    scoutQuery: '',
    scoutResults: [],
    scoutLoading: false,
    sortBy: 'value',
    sortDir: 'desc',
    filterPosition: '',
    filterAgeMin: 15,
    filterAgeMax: 45,
    filterValueMin: 0,
    filterValueMax: 999_999_999,
  },
};

// ────────────────────────────────────────────
// REDUCER
// ────────────────────────────────────────────

export function transferReducer(state: TransferState, action: TransferAction): TransferState {
  switch (action.type) {
    case 'SET_ACTIVE_CLUB':
      return { ...state, activeClubId: action.clubId };

    case 'SET_TAB':
      return { ...state, ui: { ...state.ui, activeTab: action.tab } };

    case 'SET_CLUBS': {
      const clubs: Record<string, Club> = {};
      for (const club of action.clubs) {
        clubs[club.id] = club;
      }
      return { ...state, clubs };
    }

    case 'SET_PLAYERS': {
      const players: Record<string, Player> = {};
      for (const p of action.players) {
        players[p.id] = p;
      }
      return { ...state, players };
    }

    case 'ADD_OFFER': {
      const offers = { ...state.offers, [action.offer.id]: action.offer };
      return { ...state, offers };
    }

    case 'UPDATE_OFFER': {
      const offers = { ...state.offers, [action.offer.id]: action.offer };
      return { ...state, offers };
    }

    case 'REMOVE_OFFER': {
      const offers = { ...state.offers };
      delete offers[action.offerId];
      return { ...state, offers };
    }

    case 'COMPLETE_TRANSFER': {
      const transfers = { ...state.transfers, [action.transfer.id]: action.transfer };
      const players = {
        ...state.players,
        [action.player.id]: action.player,
      };
      const clubs = {
        ...state.clubs,
        [action.fromClub.id]: action.fromClub,
        [action.toClub.id]: action.toClub,
      };
      return { ...state, transfers, players, clubs };
    }

    case 'ADD_TO_SHORTLIST': {
      if (state.shortlist.some((e) => e.playerId === action.playerId)) {
        return state;
      }
      return {
        ...state,
        shortlist: [...state.shortlist, { playerId: action.playerId, addedAt: Date.now() }],
      };
    }

    case 'REMOVE_FROM_SHORTLIST':
      return {
        ...state,
        shortlist: state.shortlist.filter((e) => e.playerId !== action.playerId),
      };

    case 'SET_SHORTLIST_NOTE':
      return {
        ...state,
        shortlist: state.shortlist.map((e) =>
          e.playerId === action.playerId ? { ...e, notes: action.notes } : e,
        ),
      };

    case 'SET_YOUTH_ACADEMY':
      return { ...state, youthAcademy: action.players };

    case 'PROMOTE_YOUTH': {
      const youthPlayer = state.youthAcademy.find((p) => p.id === action.playerId);
      if (!youthPlayer) return state;

      const promotedPlayer: Player = {
        ...youthPlayer,
        isYouth: false,
        clubId: state.activeClubId,
      };

      return {
        ...state,
        youthAcademy: state.youthAcademy.filter((p) => p.id !== action.playerId),
        players: { ...state.players, [promotedPlayer.id]: promotedPlayer },
      };
    }

    case 'RELEASE_YOUTH': {
      const youthPlayer = state.youthAcademy.find((p) => p.id === action.playerId);
      if (!youthPlayer) return state;

      const freeAgent: Player = {
        ...youthPlayer,
        isYouth: false,
        clubId: null, // Free agent
        value: Math.max(10000, Math.round(youthPlayer.value * 0.3)),
        wage: 0,
      };

      return {
        ...state,
        youthAcademy: state.youthAcademy.filter((p) => p.id !== action.playerId),
        players: { ...state.players, [freeAgent.id]: freeAgent },
      };
    }

    case 'LIST_PLAYER': {
      const player = state.players[action.playerId];
      if (!player) return state;
      return {
        ...state,
        players: { ...state.players, [action.playerId]: { ...player, isListed: true } },
      };
    }

    case 'UNLIST_PLAYER': {
      const player = state.players[action.playerId];
      if (!player) return state;
      return {
        ...state,
        players: { ...state.players, [action.playerId]: { ...player, isListed: false } },
      };
    }

    case 'UPDATE_PLAYER_VALUE': {
      const player = state.players[action.playerId];
      if (!player) return state;
      return {
        ...state,
        players: { ...state.players, [action.playerId]: { ...player, value: action.value } },
      };
    }

    case 'UPDATE_CLUB_BUDGET': {
      const club = state.clubs[action.clubId];
      if (!club) return state;
      return {
        ...state,
        clubs: {
          ...state.clubs,
          [action.clubId]: { ...club, budget: action.budget, wageSpent: action.wageSpent },
        },
      };
    }

    case 'ADVANCE_WEEK':
      return {
        ...state,
        week: state.week + 1,
        windowDaysLeft: Math.max(0, state.windowDaysLeft - 7),
        windowOpen: state.windowDaysLeft > 0,
      };

    case 'SET_SCOUT_QUERY':
      return { ...state, ui: { ...state.ui, scoutQuery: action.query } };

    case 'SET_SCOUT_RESULTS':
      return { ...state, ui: { ...state.ui, scoutResults: action.playerIds } };

    case 'SET_SCOUT_LOADING':
      return { ...state, ui: { ...state.ui, scoutLoading: action.loading } };

    case 'SET_SORT':
      return { ...state, ui: { ...state.ui, sortBy: action.sortBy, sortDir: action.sortDir } };

    case 'SET_FILTER_POSITION':
      return { ...state, ui: { ...state.ui, filterPosition: action.position } };

    case 'SET_FILTER_AGE':
      return { ...state, ui: { ...state.ui, filterAgeMin: action.min, filterAgeMax: action.max } };

    case 'SET_FILTER_VALUE':
      return { ...state, ui: { ...state.ui, filterValueMin: action.min, filterValueMax: action.max } };

    case 'SET_WINDOW':
      return { ...state, windowOpen: action.open, windowDaysLeft: action.daysLeft };

    case 'RESET_STATE':
      return action.state;

    default:
      return state;
  }
}
