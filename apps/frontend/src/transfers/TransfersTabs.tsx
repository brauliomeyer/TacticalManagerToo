/* ═══════════════════════════════════════════════════════════════════
   TransfersTabs.tsx — Tab navigation for transfers module
   ═══════════════════════════════════════════════════════════════════ */

import React from 'react';
import { useTransfer } from './state/GameContext';
import type { TabKey } from './state/gameReducer';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'squad', label: 'Squad' },
  { key: 'transfer-list', label: 'Transfer List' },
  { key: 'scout', label: 'Scout/Search' },
  { key: 'shortlist', label: 'Shortlist' },
  { key: 'offers', label: 'Offers' },
  { key: 'youth', label: 'Youth Academy' },
];

const TransfersTabs: React.FC = () => {
  const { state, setTab } = useTransfer();
  const { activeTab } = state.ui;

  return (
    <div className="flex flex-wrap gap-1 mb-4">
      {TABS.map((t) => (
        <button
          key={t.key}
          onClick={() => setTab(t.key)}
          className={`px-2 py-1 text-[9px] font-black uppercase tracking-wide border-b-2 transition-colors ${
            activeTab === t.key
              ? 'border-[#efe56b] text-[#efe56b] bg-[#222]'
              : 'border-transparent text-[#00e5ff] hover:text-[#efe56b]'
          }`}
          style={{ fontFamily: '"Press Start 2P", "Courier New", monospace' }}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
};

export default TransfersTabs;
