/* ═══════════════════════════════════════════════════════════════════
   GameContext.tsx — Context Provider with useReducer + localStorage
   ═══════════════════════════════════════════════════════════════════ */

import React, { createContext, useContext, useReducer, useEffect, useCallback, useRef, type ReactNode } from 'react';
import type { Club as AppClub } from '../../App';
import {
  transferReducer,
  initialTransferState,
  type TransferState,
  type TransferAction,
  type Player,
  type Club,
  type Offer,
  type Transfer,
  type TabKey,
} from './gameReducer';
import { buildClubSquad, generateYouthPlayers, promoteYouthPlayer, calculatePlayerValue, calculateOvr } from '../logic/playerLogic';
import { makeBid, acceptOffer, rejectOffer, negotiateOffer } from '../logic/transferLogic';
import { valueFluctuation, randomClubBids, aiRespondToBid, generateCounterOffer, flagTransferListPlayers } from '../logic/aiLogic';
import { fallbackClubs } from '../../fallbackClubs';

// ────────────────────────────────────────────
// CONTEXT TYPE
// ────────────────────────────────────────────

interface TransferContextValue {
  state: TransferState;
  dispatch: React.Dispatch<TransferAction>;
  // Convenience helpers
  getPlayer: (id: string) => Player | undefined;
  getClub: (id: string) => Club | undefined;
  getActiveClub: () => Club | undefined;
  getActiveClubPlayers: () => Player[];
  getAllPlayers: () => Player[];
  getAllClubs: () => Club[];
  getOffers: () => Offer[];
  getTransfers: () => Transfer[];
  getShortlistPlayers: () => Player[];
  getTransferListPlayers: () => Player[];
  getYouthAcademy: () => Player[];
  // Actions
  placeBid: (playerId: string, amount: number, wage: number) => string | null;
  handleAcceptOffer: (offerId: string) => void;
  handleRejectOffer: (offerId: string) => void;
  handleCounterOffer: (offerId: string, counterAmount: number, counterWage: number) => void;
  addToShortlist: (playerId: string) => void;
  removeFromShortlist: (playerId: string) => void;
  promoteYouth: (playerId: string) => void;
  releaseYouth: (playerId: string) => void;
  listPlayer: (playerId: string) => void;
  unlistPlayer: (playerId: string) => void;
  advanceWeek: () => void;
  setTab: (tab: TabKey) => void;
  scoutPlayers: (query: string) => void;
  initialize: (activeClub: AppClub) => void;
}

const TransferContext = createContext<TransferContextValue | null>(null);

// ────────────────────────────────────────────
// STORAGE KEY
// ────────────────────────────────────────────

const STORAGE_KEY = 'tmt_transfer_state';

// ────────────────────────────────────────────
// PROVIDER
// ────────────────────────────────────────────

interface TransferProviderProps {
  children: ReactNode;
  activeClub: AppClub;
}

export const TransferProvider: React.FC<TransferProviderProps> = ({ children, activeClub }) => {
  const [state, dispatch] = useReducer(transferReducer, initialTransferState);
  const initializedRef = useRef(false);

  // ── Load from localStorage on mount ──
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as TransferState;
        dispatch({ type: 'RESET_STATE', state: parsed });
      }
    } catch {
      // Ignore parse errors
    }
  }, []);

  // ── Save to localStorage on state change ──
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Ignore storage errors
    }
  }, [state]);

  // ── Initialize data when activeClub changes ──
  useEffect(() => {
    if (!activeClub?.id) return;
    if (initializedRef.current && state.activeClubId === activeClub.id) return;

    initializedRef.current = true;
    dispatch({ type: 'SET_ACTIVE_CLUB', clubId: activeClub.id });

    // Only initialize if we don't already have data for this club
    if (Object.keys(state.clubs).length > 0 && state.players[state.activeClubId]) return;

    // Convert fallback clubs to our Club type
    const clubs: Club[] = fallbackClubs.map((c) => ({
      id: c.id,
      name: c.name,
      country: c.country,
      budget: c.budget,
      reputation: c.reputation,
      leagueId: c.leagueId ?? null,
      leagueName: c.leagueName ?? null,
      wageBudget: Math.round(c.budget * 0.3),
      wageSpent: 0,
    }));

    dispatch({ type: 'SET_CLUBS', clubs });

    // Build squads for all clubs
    const allPlayers: Player[] = [];
    for (let i = 0; i < clubs.length; i++) {
      const squad = buildClubSquad(clubs[i]);
      allPlayers.push(...squad);
    }
    dispatch({ type: 'SET_PLAYERS', players: allPlayers });

    // Generate youth academy for active club
    const youthSeed = Date.now();
    const youthPlayers = generateYouthPlayers(activeClub.id, 8, youthSeed);
    dispatch({ type: 'SET_YOUTH_ACADEMY', players: youthPlayers });
  }, [activeClub, state.clubs, state.activeClubId]);

  // ── Convenience getters ──

  const getPlayer = useCallback((id: string) => state.players[id], [state.players]);
  const getClub = useCallback((id: string) => state.clubs[id], [state.clubs]);
  const getActiveClub = useCallback(() => state.clubs[state.activeClubId], [state.clubs, state.activeClubId]);
  const getActiveClubPlayers = useCallback(
    () => Object.values(state.players).filter((p) => p.clubId === state.activeClubId && !p.isYouth),
    [state.players, state.activeClubId],
  );
  const getAllPlayers = useCallback(() => Object.values(state.players), [state.players]);
  const getAllClubs = useCallback(() => Object.values(state.clubs), [state.clubs]);
  const getOffers = useCallback(() => Object.values(state.offers), [state.offers]);
  const getTransfers = useCallback(() => Object.values(state.transfers), [state.transfers]);
  const getShortlistPlayers = useCallback(
    () => state.shortlist.map((e) => state.players[e.playerId]).filter(Boolean),
    [state.shortlist, state.players],
  );
  const getTransferListPlayers = useCallback(
    () => Object.values(state.players).filter((p) => p.isListed && p.clubId !== state.activeClubId),
    [state.players, state.activeClubId],
  );
  const getYouthAcademy = useCallback(() => state.youthAcademy, [state.youthAcademy]);

  // ── Actions ──

  const placeBid = useCallback(
    (playerId: string, amount: number, wage: number): string | null => {
      const player = state.players[playerId];
      const toClub = state.clubs[state.activeClubId];
      if (!player || !toClub) return 'Club or player not found';

      const result = makeBid(player, state.activeClubId, toClub, amount, wage);
      if (result.success) {
        dispatch({ type: 'ADD_OFFER', offer: result.offer });
        return null;
      }
      return result.message;
    },
    [state.players, state.clubs, state.activeClubId],
  );

  const handleAcceptOffer = useCallback(
    (offerId: string) => {
      const offer = state.offers[offerId];
      if (!offer) return;

      const player = state.players[offer.playerId];
      const fromClub = state.clubs[offer.fromClubId];
      const toClub = state.clubs[offer.toClubId];
      if (!player || !fromClub || !toClub) return;

      const { execution, updatedOffer } = acceptOffer(offer, player, fromClub, toClub);

      dispatch({ type: 'UPDATE_OFFER', offer: updatedOffer });

      dispatch({
        type: 'COMPLETE_TRANSFER',
        transfer: {
          id: `transfer-${Date.now()}`,
          playerId: player.id,
          playerName: player.name,
          fromClubId: fromClub.id,
          fromClubName: fromClub.name,
          toClubId: toClub.id,
          toClubName: toClub.name,
          fee: offer.amount,
          wage: offer.wage,
          status: 'completed',
          date: Date.now(),
        },
        player: execution.player,
        fromClub: { ...fromClub, budget: execution.updatedFromBudget, wageSpent: execution.updatedFromWageSpent },
        toClub: { ...toClub, budget: execution.updatedToBudget, wageSpent: execution.updatedToWageSpent },
      });
    },
    [state.offers, state.players, state.clubs],
  );

  const handleRejectOffer = useCallback(
    (offerId: string) => {
      const offer = state.offers[offerId];
      if (!offer) return;
      dispatch({ type: 'UPDATE_OFFER', offer: rejectOffer(offer) });
    },
    [state.offers],
  );

  const handleCounterOffer = useCallback(
    (offerId: string, counterAmount: number, counterWage: number) => {
      const offer = state.offers[offerId];
      if (!offer) return;
      dispatch({ type: 'UPDATE_OFFER', offer: negotiateOffer(offer, counterAmount, counterWage) });
    },
    [state.offers],
  );

  const addToShortlist = useCallback((playerId: string) => {
    dispatch({ type: 'ADD_TO_SHORTLIST', playerId });
  }, []);

  const removeFromShortlist = useCallback((playerId: string) => {
    dispatch({ type: 'REMOVE_FROM_SHORTLIST', playerId });
  }, []);

  const promoteYouth = useCallback(
    (playerId: string) => {
      const youth = state.youthAcademy.find((p) => p.id === playerId);
      if (!youth) return;

      const promoted = promoteYouthPlayer(youth);
      dispatch({ type: 'PROMOTE_YOUTH', playerId });
      // Also update the player in the players map with calculated values
      dispatch({
        type: 'UPDATE_PLAYER_VALUE',
        playerId,
        value: promoted.value,
      });
    },
    [state.youthAcademy],
  );

  const releaseYouth = useCallback((playerId: string) => {
    dispatch({ type: 'RELEASE_YOUTH', playerId });
  }, []);

  const listPlayer = useCallback((playerId: string) => {
    dispatch({ type: 'LIST_PLAYER', playerId });
  }, []);

  const unlistPlayer = useCallback((playerId: string) => {
    dispatch({ type: 'UNLIST_PLAYER', playerId });
  }, []);

  const advanceWeek = useCallback(() => {
    // Apply value fluctuations
    const allPlayers = Object.values(state.players);
    const fluctuations = valueFluctuation(allPlayers, state.week);
    for (const [playerId, newValue] of fluctuations) {
      dispatch({ type: 'UPDATE_PLAYER_VALUE', playerId, value: newValue });
    }

    // Generate AI bids
    const aiOffers = randomClubBids(allPlayers, Object.values(state.clubs), state.activeClubId, state.week);
    for (const offer of aiOffers) {
      dispatch({ type: 'ADD_OFFER', offer });
    }

    // Flag players for transfer list
    const toList = flagTransferListPlayers(allPlayers, state.week);
    for (const playerId of toList) {
      dispatch({ type: 'LIST_PLAYER', playerId });
    }

    dispatch({ type: 'ADVANCE_WEEK' });
  }, [state.players, state.clubs, state.activeClubId, state.week]);

  const setTab = useCallback((tab: TabKey) => {
    dispatch({ type: 'SET_TAB', tab });
  }, []);

  const scoutPlayers = useCallback(
    (query: string) => {
      dispatch({ type: 'SET_SCOUT_QUERY', query });
      dispatch({ type: 'SET_SCOUT_LOADING', loading: true });

      // Capture current players/clubs to avoid stale closure
      const currentPlayers = Object.values(state.players);
      const currentClubs = state.clubs;

      // Simulate scout delay
      setTimeout(() => {
        const lower = query.toLowerCase();
        const results = currentPlayers.filter(
          (p) =>
            p.name.toLowerCase().includes(lower) ||
            p.position.toLowerCase().includes(lower) ||
            p.nationality.toLowerCase().includes(lower) ||
            (p.clubId && currentClubs[p.clubId]?.name.toLowerCase().includes(lower)),
        );
        dispatch({ type: 'SET_SCOUT_RESULTS', playerIds: results.map((p) => p.id) });
        dispatch({ type: 'SET_SCOUT_LOADING', loading: false });
      }, 800);
    },
    [state.players, state.clubs],
  );

  const initialize = useCallback(
    (club: AppClub) => {
      if (Object.keys(state.clubs).length > 0) return;
      dispatch({ type: 'SET_ACTIVE_CLUB', clubId: club.id });

      const clubs: Club[] = fallbackClubs.map((c) => ({
        id: c.id,
        name: c.name,
        country: c.country,
        budget: c.budget,
        reputation: c.reputation,
        leagueId: c.leagueId ?? null,
        leagueName: c.leagueName ?? null,
        wageBudget: Math.round(c.budget * 0.3),
        wageSpent: 0,
      }));

      dispatch({ type: 'SET_CLUBS', clubs });

      const allPlayers: Player[] = [];
      for (let i = 0; i < clubs.length; i++) {
        const squad = buildClubSquad(clubs[i]);
        allPlayers.push(...squad);
      }
      dispatch({ type: 'SET_PLAYERS', players: allPlayers });

      const youthSeed = Date.now();
      const youthPlayers = generateYouthPlayers(club.id, 8, youthSeed);
      dispatch({ type: 'SET_YOUTH_ACADEMY', players: youthPlayers });
    },
    [state.clubs],
  );

  const value: TransferContextValue = {
    state,
    dispatch,
    getPlayer,
    getClub,
    getActiveClub,
    getActiveClubPlayers,
    getAllPlayers,
    getAllClubs,
    getOffers,
    getTransfers,
    getShortlistPlayers,
    getTransferListPlayers,
    getYouthAcademy,
    placeBid,
    handleAcceptOffer,
    handleRejectOffer,
    handleCounterOffer,
    addToShortlist,
    removeFromShortlist,
    promoteYouth,
    releaseYouth,
    listPlayer,
    unlistPlayer,
    advanceWeek,
    setTab,
    scoutPlayers,
    initialize,
  };

  return <TransferContext.Provider value={value}>{children}</TransferContext.Provider>;
};

// ────────────────────────────────────────────
// HOOK
// ────────────────────────────────────────────

export function useTransfer(): TransferContextValue {
  const ctx = useContext(TransferContext);
  if (!ctx) {
    throw new Error('useTransfer must be used within a TransferProvider');
  }
  return ctx;
}
