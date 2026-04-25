/* ═══════════════════════════════════════════════════════════════════
   SYNC ENGINE
   Processes the sync queue with exponential backoff, online/offline
   detection, and automatic retry logic.
   ═══════════════════════════════════════════════════════════════════ */

import {
  db,
  getPendingSyncItems,
  markSyncDone,
  markSyncFailed,
  pruneSyncQueue,
} from '../db';

const API_BASE = (import.meta as any).env?.VITE_API_URL ?? 'http://localhost:4000';
/** Whether a backend API is available (false on GitHub Pages where VITE_API_URL is empty / not set). */
const HAS_BACKEND = API_BASE.length > 0;

// ────────────────────────────────────────────
// 1. CONFIGURATION
// ────────────────────────────────────────────

const MAX_RETRIES = 10;
const BASE_DELAY_MS = 1000;
const MAX_DELAY_MS = 30_000;
const SYNC_INTERVAL_MS = 10_000;

// ────────────────────────────────────────────
// 2. STATE
// ────────────────────────────────────────────

let isProcessing = false;
let syncIntervalId: ReturnType<typeof setInterval> | null = null;
let isOnline = navigator.onLine;

/** Callback fired when sync status changes (for debug panel). */
export type SyncStatusCallback = (status: {
  pending: number;
  lastSync: string | null;
  isOnline: boolean;
  isProcessing: boolean;
}) => void;

const statusCallbacks: Set<SyncStatusCallback> = new Set();

function notifyStatus() {
  getPendingSyncItems().then((items) => {
    const status = {
      pending: items.length,
      lastSync: null as string | null,
      isOnline,
      isProcessing,
    };
    statusCallbacks.forEach((cb) => cb(status));
  });
}

export function onSyncStatus(cb: SyncStatusCallback): () => void {
  statusCallbacks.add(cb);
  notifyStatus();
  return () => { statusCallbacks.delete(cb); };
}

// ────────────────────────────────────────────
// 3. EXPONENTIAL BACKOFF
// ────────────────────────────────────────────

function getBackoffDelay(retries: number): number {
  const delay = BASE_DELAY_MS * Math.pow(2, retries);
  return Math.min(delay, MAX_DELAY_MS);
}

// ────────────────────────────────────────────
// 4. PROCESS QUEUE
// ────────────────────────────────────────────

/**
 * Process all pending/failed items in the sync queue.
 * Sends each item to the backend, then marks it done or failed.
 */
export async function processQueue(): Promise<void> {
  // No backend available (e.g. GitHub Pages) — skip syncing entirely
  if (!HAS_BACKEND) return;

  if (isProcessing || !isOnline) return;
  isProcessing = true;
  notifyStatus();

  try {
    const pending = await getPendingSyncItems();

    for (const item of pending) {
      if (!isOnline) break; // Stop if we go offline mid-sync

      // Skip items that have exceeded max retries
      if (item.retries >= MAX_RETRIES) {
        console.warn(`[Sync] Item ${item.id} exceeded max retries, skipping.`);
        if (item.id) await markSyncDone(item.id);
        continue;
      }

      // Mark as syncing
      if (item.id) await db.syncQueue.update(item.id, { status: 'syncing' });

      try {
        const response = await fetch(`${API_BASE}/game/save`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item.payload),
        });

        if (!response.ok) {
          // 409 = version conflict (older snapshot rejected) — still mark as done
          if (response.status === 409) {
            console.warn(`[Sync] Version conflict for item ${item.id}, marking done.`);
            if (item.id) await markSyncDone(item.id);
            continue;
          }
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        // Success!
        if (item.id) await markSyncDone(item.id);
        console.log(`[Sync] Item ${item.id} synced successfully.`);
      } catch (err) {
        const newRetries = item.retries + 1;
        console.warn(`[Sync] Item ${item.id} failed (attempt ${newRetries}/${MAX_RETRIES}):`, err);

        if (item.id) await markSyncFailed(item.id, newRetries);

        // Schedule a retry with backoff
        const delay = getBackoffDelay(item.retries);
        setTimeout(() => processQueue(), delay);

        // Stop processing this batch — let the retry handle the rest
        isProcessing = false;
        notifyStatus();
        return;
      }
    }

    // Clean up old done items
    await pruneSyncQueue();
  } finally {
    isProcessing = false;
    notifyStatus();
  }
}

// ────────────────────────────────────────────
// 5. ONLINE / OFFLINE DETECTION
// ────────────────────────────────────────────

function handleOnline() {
  isOnline = true;
  console.log('[Sync] Connection restored — processing queue...');
  notifyStatus();
  processQueue();
}

function handleOffline() {
  isOnline = false;
  console.log('[Sync] Connection lost — queueing changes locally.');
  notifyStatus();
}

// ────────────────────────────────────────────
// 6. START / STOP
// ────────────────────────────────────────────

/** Start the sync engine: periodic polling + event listeners. */
export function startSyncEngine(): void {
  // No backend available (e.g. GitHub Pages) — no syncing needed
  if (!HAS_BACKEND) {
    console.log('[Sync] No backend available — sync engine not started.');
    return;
  }

  // Process queue immediately on start
  processQueue();

  // Poll every SYNC_INTERVAL_MS
  syncIntervalId = setInterval(() => {
    processQueue();
  }, SYNC_INTERVAL_MS);

  // Listen for online/offline events
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  console.log('[Sync] Engine started.');
}

/** Stop the sync engine. */
export function stopSyncEngine(): void {
  if (syncIntervalId) {
    clearInterval(syncIntervalId);
    syncIntervalId = null;
  }

  window.removeEventListener('online', handleOnline);
  window.removeEventListener('offline', handleOffline);

  console.log('[Sync] Engine stopped.');
}

/** Manually trigger a sync (for debug panel). */
export function triggerSync(): void {
  processQueue();
}
