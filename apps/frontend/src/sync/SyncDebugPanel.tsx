/* ═══════════════════════════════════════════════════════════════════
   SYNC DEBUG PANEL
   A small UI component to monitor the sync queue status.
   Collapsible, shows pending items, retry counts, and online status.
   ═══════════════════════════════════════════════════════════════════ */

import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { onSyncStatus, triggerSync, type SyncStatusCallback } from './syncEngine';

// ────────────────────────────────────────────
// COMPONENT
// ────────────────────────────────────────────

export function SyncDebugPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [syncStatus, setSyncStatus] = useState<{
    pending: number;
    lastSync: string | null;
    isOnline: boolean;
    isProcessing: boolean;
  }>({ pending: 0, lastSync: null, isOnline: true, isProcessing: false });

  // Live query for sync queue items
  const queueItems = useLiveQuery(
    () => db.syncQueue.orderBy('createdAt').reverse().limit(20).toArray(),
    [],
  );

  // Subscribe to sync status updates
  useEffect(() => {
    const unsub = onSyncStatus((status) => {
      setSyncStatus(status);
    });
    return unsub;
  }, []);

  if (!isOpen) {
    // Minimized indicator
    const hasIssues = syncStatus.pending > 0 || !syncStatus.isOnline;
    return (
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-2 right-2 z-50 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-bold shadow-lg transition-colors ${
          hasIssues
            ? 'bg-[#ef4444] text-white'
            : 'bg-[#22c55e] text-white'
        }`}
        title="Sync status — click to expand"
      >
        <span
          className={`inline-block h-2 w-2 rounded-full ${
            syncStatus.isOnline ? 'bg-white' : 'bg-[#fbbf24]'
          }`}
        />
        {syncStatus.isOnline ? 'Online' : 'Offline'}
        {syncStatus.pending > 0 && ` · ${syncStatus.pending} pending`}
      </button>
    );
  }

  return (
    <div className="fixed bottom-2 right-2 z-50 w-80 rounded-lg border-2 border-[#6f4ca1] bg-[#1a1e2b] p-3 shadow-2xl">
      {/* Header */}
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase text-[#efe56b]">
          ⚙️ Sync Queue
        </h3>
        <button
          onClick={() => setIsOpen(false)}
          className="text-[10px] text-[#98ca7a] hover:text-white"
        >
          ✕
        </button>
      </div>

      {/* Status bar */}
      <div className="mb-2 grid grid-cols-3 gap-1 text-[10px]">
        <div
          className={`rounded px-1 py-0.5 text-center font-bold ${
            syncStatus.isOnline
              ? 'bg-[#1a5e1a] text-[#22c55e]'
              : 'bg-[#5e1a1a] text-[#ef4444]'
          }`}
        >
          {syncStatus.isOnline ? '🟢 Online' : '🔴 Offline'}
        </div>
        <div className="rounded bg-[#1a3a5e] px-1 py-0.5 text-center font-bold text-[#3b82f6]">
          {syncStatus.pending} pending
        </div>
        <div className="rounded bg-[#5e4a1a] px-1 py-0.5 text-center font-bold text-[#eab308]">
          {syncStatus.isProcessing ? '⏳ Syncing...' : '✓ Idle'}
        </div>
      </div>

      {/* Action buttons */}
      <div className="mb-2 flex gap-1">
        <button
          onClick={() => triggerSync()}
          disabled={syncStatus.isProcessing}
          className="flex-1 rounded bg-[#1d4ed8] px-2 py-1 text-[10px] font-bold text-white hover:bg-[#1e40af] disabled:opacity-50"
        >
          Sync Now
        </button>
      </div>

      {/* Queue items */}
      <div className="max-h-40 overflow-y-auto">
        {(!queueItems || queueItems.length === 0) && (
          <p className="py-2 text-center text-[10px] text-[#6b7280]">
            No items in queue
          </p>
        )}
        {queueItems?.map((item) => (
          <div
            key={item.id}
            className="mb-0.5 flex items-center justify-between rounded bg-[#111827] px-2 py-1 text-[10px]"
          >
            <div className="flex items-center gap-1">
              <span
                className={`inline-block h-1.5 w-1.5 rounded-full ${
                  item.status === 'done'
                    ? 'bg-[#22c55e]'
                    : item.status === 'syncing'
                      ? 'bg-[#3b82f6]'
                      : item.status === 'failed'
                        ? 'bg-[#ef4444]'
                        : 'bg-[#eab308]'
                }`}
              />
              <span className="text-[#d1d5db]">{item.type}</span>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`font-bold ${
                  item.status === 'done'
                    ? 'text-[#22c55e]'
                    : item.status === 'failed'
                      ? 'text-[#ef4444]'
                      : 'text-[#eab308]'
                }`}
              >
                {item.status}
              </span>
              {item.retries > 0 && (
                <span className="text-[#f97316]">×{item.retries}</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Logging */}
      <div className="mt-1 text-[8px] text-[#6b7280]">
        {queueItems && queueItems.length > 0 && (
          <span>Showing last {Math.min(queueItems.length, 20)} items</span>
        )}
      </div>
    </div>
  );
}
