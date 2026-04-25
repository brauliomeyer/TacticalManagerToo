/* ═══════════════════════════════════════════════════════════════════
   useGameState HOOK
   React hook that provides the game state from IndexedDB (Dexie)
   with automatic sync queue integration.
   ═══════════════════════════════════════════════════════════════════ */

import { useCallback, useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, saveGameStateLocally, loadGameStateLocally, clearGameStateLocally, enqueueSync } from '../db';
import type { GameSaveRecord } from '../db';

import { processQueue } from '../sync/syncEngine';
import type { GameState } from '../engine/footballEngine';

// ────────────────────────────────────────────
// HOOK
// ────────────────────────────────────────────

/**
 * Provides the game state for a given club, with automatic persistence
 * to IndexedDB and sync queue integration.
 *
 * Flow:
 * 1. User performs action → saveGameState() called
 * 2. Saves immediately to IndexedDB
 * 3. Adds action to sync queue
 * 4. UI updates instantly (via useLiveQuery)
 * 5. Background sync sends to backend
 */
export function useGameState(clubId: string | null) {
  // Live query — UI reacts to DB changes automatically
  const record = useLiveQuery<GameSaveRecord | undefined>(
    () => (clubId ? db.gameState.where('clubId').equals(clubId).first() : undefined),
    [clubId],
  );


  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (clubId) {
      setIsLoading(false);
    }
  }, [clubId]);

  /** Save the game state: local first, then enqueue sync. */
  const saveGameState = useCallback(
    async (data: GameState) => {
      if (!clubId) return;

      try {
        const existing = await loadGameStateLocally(clubId);
        const newVersion = (existing?.version ?? 0) + 1;

        // 1. Save locally first (optimistic)
        const record = await saveGameStateLocally({
          clubId,
          version: newVersion,
          updatedAt: new Date().toISOString(),
          data,
        });

        // 2. Add to sync queue
        await enqueueSync({
          type: 'SAVE_GAME',
          payload: record,
          status: 'pending',
          retries: 0,
          createdAt: Date.now(),
        });

        // 3. Trigger background sync (non-blocking)
        processQueue();

        setError(null);
      } catch (err) {
        console.error('[useGameState] Failed to save:', err);
        setError('Failed to save game state');
      }
    },
    [clubId],
  );

  /** Clear the game state locally and enqueue a clear. */
  const clearGameState = useCallback(async () => {
    if (!clubId) return;

    try {
      await clearGameStateLocally(clubId);
    } catch (err) {
      console.error('[useGameState] Failed to clear:', err);
    }
  }, [clubId]);

  return {
    /** The current game state (undefined if not loaded). */
    gameState: record?.data as GameState | undefined,
    /** Save a new game state snapshot. */
    saveGameState,
    /** Clear the game state. */
    clearGameState,
    /** Whether the state is still loading. */
    isLoading,
    /** Any error that occurred. */
    error,
    /** The raw record (for advanced use). */
    record,
  };
}
