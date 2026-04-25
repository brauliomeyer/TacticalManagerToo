/* ═══════════════════════════════════════════════════════════════════
   DEXIE INDEXEDDB DATABASE
   Offline-first local storage for Tactical Manager Too.
   ═══════════════════════════════════════════════════════════════════ */

import { Dexie, type Table } from 'dexie';
import type { GameSave } from '@tmt/shared';

// ────────────────────────────────────────────
// 1. TABLE RECORD TYPES
// ────────────────────────────────────────────

/** The local copy of a GameSave snapshot. */
export interface GameSaveRecord {
  id?: number;
  clubId: string;
  version: number;
  updatedAt: string;
  data: unknown; // GameState
}

/** An item waiting to be synced to the backend. */
export interface SyncQueueItem {
  id?: number;
  type: 'SAVE_GAME';
  payload: GameSaveRecord;
  status: 'pending' | 'syncing' | 'failed' | 'done';
  retries: number;
  createdAt: number;
}

/** Simple key-value metadata (e.g. last sync timestamp). */
export interface MetaRecord {
  key: string;
  value: string;
}

// ────────────────────────────────────────────
// 2. DATABASE CLASS
// ────────────────────────────────────────────

export class TacticalManagerDB extends Dexie {
  gameState!: Table<GameSaveRecord, number>;
  syncQueue!: Table<SyncQueueItem, number>;
  meta!: Table<MetaRecord, string>;

  constructor() {
    super('TacticalManagerDB');

    this.version(1).stores({
      gameState: '++id, clubId, updatedAt',
      syncQueue: '++id, status, createdAt',
      meta: 'key',
    });
  }
}

/** Singleton database instance. */
export const db = new TacticalManagerDB();

// ────────────────────────────────────────────
// 3. CONVENIENCE HELPERS
// ────────────────────────────────────────────

/** Save a GameSave snapshot locally (upsert by clubId). */
export async function saveGameStateLocally(save: GameSave): Promise<GameSaveRecord> {
  const existing = await db.gameState.where('clubId').equals(save.clubId).first();

  const record: GameSaveRecord = {
    clubId: save.clubId,
    version: save.version,
    updatedAt: save.updatedAt,
    data: save.data,
  };

  if (existing?.id) {
    await db.gameState.update(existing.id, record);
    return { ...record, id: existing.id };
  } else {
    const id = await db.gameState.add(record);
    return { ...record, id };
  }
}

/** Load the latest GameSave snapshot for a club. */
export async function loadGameStateLocally(clubId: string): Promise<GameSaveRecord | null> {
  const record = await db.gameState.where('clubId').equals(clubId).first();
  return record ?? null;
}

/** Delete the local GameSave for a club. */
export async function clearGameStateLocally(clubId: string): Promise<void> {
  await db.gameState.where('clubId').equals(clubId).delete();
}

/** Add an item to the sync queue. */
export async function enqueueSync(item: Omit<SyncQueueItem, 'id'>): Promise<number> {
  return await db.syncQueue.add(item);
}

/** Get all pending/failed sync items. */
export async function getPendingSyncItems(): Promise<SyncQueueItem[]> {
  return await db.syncQueue
    .where('status')
    .anyOf('pending', 'failed')
    .toArray();
}

/** Mark a sync item as done. */
export async function markSyncDone(id: number): Promise<void> {
  await db.syncQueue.update(id, { status: 'done' });
}

/** Mark a sync item as failed and increment retries. */
export async function markSyncFailed(id: number, retries: number): Promise<void> {
  await db.syncQueue.update(id, { status: 'failed', retries });
}

/** Clean up old "done" sync items (keep last 50). */
export async function pruneSyncQueue(): Promise<void> {
  const doneItems = await db.syncQueue
    .where('status')
    .equals('done')
    .reverse()
    .offset(50)
    .toArray();

  for (const item of doneItems) {
    if (item.id) await db.syncQueue.delete(item.id);
  }
}
