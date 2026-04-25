/* ═══════════════════════════════════════════════════════════════════
   TransfersPage.tsx — Main transfers module entry point
   ═══════════════════════════════════════════════════════════════════ */

import React from 'react';
import { TransferProvider, useTransfer } from './state/GameContext';
import BudgetPanel from './components/BudgetPanel';
import TransfersTabs from './TransfersTabs';
import OverviewTab from './tabs/OverviewTab';
import SquadTab from './tabs/SquadTab';
import TransferListTab from './tabs/TransferListTab';
import ScoutTab from './tabs/ScoutTab';
import ShortlistTab from './tabs/ShortlistTab';
import OffersTab from './tabs/OffersTab';
import YouthAcademyTab from './tabs/YouthAcademyTab';
import type { Club } from '../App';

interface TransfersPageProps {
  activeClub: Club;
  clubs: Club[];
  squadPlayers: any[];
}

const TransfersContent: React.FC = () => {
  const { state } = useTransfer();
  const { activeTab } = state.ui;

  const renderTab = () => {
    switch (activeTab) {
      case 'overview':
        return <OverviewTab />;
      case 'squad':
        return <SquadTab />;
      case 'transfer-list':
        return <TransferListTab />;
      case 'scout':
        return <ScoutTab />;
      case 'shortlist':
        return <ShortlistTab />;
      case 'offers':
        return <OffersTab />;
      case 'youth':
        return <YouthAcademyTab />;
      default:
        return <OverviewTab />;
    }
  };

  return (
    <div className="bg-[#181818] min-h-screen p-4" style={{ fontFamily: '"Press Start 2P", "Courier New", monospace' }}>
      <BudgetPanel />
      <TransfersTabs />
      <div className="border border-[#efe56b] bg-[#232323] p-4 rounded min-h-[300px]">
        {renderTab()}
      </div>
    </div>
  );
};

const TransfersPage: React.FC<TransfersPageProps> = ({ activeClub }) => {
  return (
    <TransferProvider activeClub={activeClub}>
      <TransfersContent />
    </TransferProvider>
  );
};

export default TransfersPage;
