/* ═══════════════════════════════════════════════════════════════════
   YouthAcademyTab.tsx — Youth academy management
   ═══════════════════════════════════════════════════════════════════ */

import React, { useState, useMemo } from 'react';
import { useTransfer } from '../state/GameContext';
import type { Player } from '../state/gameReducer';

function calculateOvr(p: Player): number {
  return Math.round((p.attributes.technical + p.attributes.mental + p.attributes.physical) / 3);
}

function getOvrColor(ovr: number): string {
  if (ovr >= 85) return 'text-[#00e5ff]';
  if (ovr >= 75) return 'text-[#2a8a2b]';
  if (ovr >= 65) return 'text-[#efe56b]';
  if (ovr >= 50) return 'text-[#ffa500]';
  return 'text-[#ff4444]';
}

const YouthAcademyTab: React.FC = () => {
  const { getYouthAcademy, promoteYouth, releaseYouth } = useTransfer();
  const youthPlayers = getYouthAcademy();
  const [sortBy, setSortBy] = useState('potential');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [confirmAction, setConfirmAction] = useState<{ player: Player; action: 'promote' | 'release' } | null>(null);

  const sorted = useMemo(() => {
    return [...youthPlayers].sort((a, b) => {
      let cmp = 0;
      switch (sortBy) {
        case 'name': cmp = a.name.localeCompare(b.name); break;
        case 'age': cmp = a.age - b.age; break;
        case 'position': cmp = a.position.localeCompare(b.position); break;
        case 'potential': cmp = a.potential - b.potential; break;
        default: cmp = a.potential - b.potential;
      }
      return sortDir === 'desc' ? -cmp : cmp;
    });
  }, [youthPlayers, sortBy, sortDir]);

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortDir('desc');
    }
  };

  const handleConfirm = () => {
    if (!confirmAction) return;
    if (confirmAction.action === 'promote') {
      promoteYouth(confirmAction.player.id);
    } else {
      releaseYouth(confirmAction.player.id);
    }
    setConfirmAction(null);
  };

  const SortHeader = ({ field, label }: { field: string; label: string }) => (
    <th
      className="px-1 py-1 text-[8px] font-bold text-[#98ca7a] uppercase cursor-pointer hover:text-[#efe56b] select-none"
      onClick={() => handleSort(field)}
    >
      {label} {sortBy === field ? (sortDir === 'asc' ? '▲' : '▼') : ''}
    </th>
  );

  return (
    <div>
      {/* Academy Info */}
      <div className="border border-[#444] bg-[#1e1e1e] p-3 rounded mb-3">
        <h3 className="text-[#efe56b] text-[10px] font-bold mb-2 uppercase tracking-wide">Youth Academy</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-[9px]">
          <div>
            <span className="text-[#98ca7a]">Academy Players</span>
            <p className="text-white font-bold text-[11px]">{youthPlayers.length}</p>
          </div>
          <div>
            <span className="text-[#98ca7a]">Avg Age</span>
            <p className="text-white font-bold">
              {youthPlayers.length > 0
                ? Math.round(youthPlayers.reduce((s, p) => s + p.age, 0) / youthPlayers.length)
                : '-'}
            </p>
          </div>
          <div>
            <span className="text-[#98ca7a]">Avg Potential</span>
            <p className="text-[#00e5ff] font-bold">
              {youthPlayers.length > 0
                ? Math.round(youthPlayers.reduce((s, p) => s + p.potential, 0) / youthPlayers.length)
                : '-'}
            </p>
          </div>
        </div>
      </div>

      {/* Youth Players Table */}
      {youthPlayers.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-[#00e5ff] text-[10px]">No youth players in the academy.</p>
          <p className="text-[#98ca7a] text-[8px] mt-1">Youth players are generated when the module initializes.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-[10px] border-collapse">
            <thead>
              <tr className="border-b border-[#444]">
                <SortHeader field="name" label="Name" />
                <SortHeader field="age" label="Age" />
                <SortHeader field="position" label="Pos" />
                <th className="px-1 py-1 text-[8px] font-bold text-[#98ca7a] uppercase">OVR</th>
                <SortHeader field="potential" label="Pot" />
                <th className="px-1 py-1 text-[8px] font-bold text-[#98ca7a] uppercase">Tec</th>
                <th className="px-1 py-1 text-[8px] font-bold text-[#98ca7a] uppercase">Men</th>
                <th className="px-1 py-1 text-[8px] font-bold text-[#98ca7a] uppercase">Phy</th>
                <th className="px-1 py-1 text-[8px] font-bold text-[#98ca7a] uppercase">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((player) => {
                const ovr = calculateOvr(player);
                return (
                  <tr key={player.id} className="border-b border-[#333] hover:bg-[#2a2a2a]">
                    <td className="px-1 py-1 text-white font-bold truncate max-w-[120px]">{player.name}</td>
                    <td className="px-1 py-1 text-[#d5f8b6]">{player.age}</td>
                    <td className="px-1 py-1 text-[#98ca7a]">{player.position}</td>
                    <td className={`px-1 py-1 font-black ${getOvrColor(ovr)}`}>{ovr}</td>
                    <td className={`px-1 py-1 font-bold ${player.potential >= 85 ? 'text-[#00e5ff]' : player.potential >= 75 ? 'text-[#2a8a2b]' : 'text-[#98ca7a]'}`}>
                      {player.potential}
                    </td>
                    <td className="px-1 py-1 text-[#d5f8b6]">{player.attributes.technical}</td>
                    <td className="px-1 py-1 text-[#d5f8b6]">{player.attributes.mental}</td>
                    <td className="px-1 py-1 text-[#d5f8b6]">{player.attributes.physical}</td>
                    <td className="px-1 py-1">
                      <div className="flex gap-1">
                        <button
                          onClick={() => setConfirmAction({ player, action: 'promote' })}
                          className="px-1.5 py-0.5 text-[7px] font-bold bg-[#2a5a2a] text-white border border-[#2a8a2b] rounded hover:bg-[#1a4a1a]"
                        >
                          PROMOTE
                        </button>
                        <button
                          onClick={() => setConfirmAction({ player, action: 'release' })}
                          className="px-1.5 py-0.5 text-[7px] font-bold bg-[#5a2a2a] text-white border border-[#ff4444] rounded hover:bg-[#4a1a1a]"
                        >
                          RELEASE
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Confirm Modal */}
      {confirmAction && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-[#1e1e1e] border-2 border-[#efe56b] p-4 rounded w-72">
            <h3 className="text-[#efe56b] text-[10px] font-bold mb-3 uppercase">
              {confirmAction.action === 'promote' ? 'Promote Youth' : 'Release Youth'}
            </h3>
            <p className="text-white text-[9px] mb-2">
              Are you sure you want to <strong>{confirmAction.action}</strong> {confirmAction.player.name}?
            </p>
            {confirmAction.action === 'release' && (
              <p className="text-[#ffa500] text-[8px] mb-2">
                Released players become free agents on the transfer market.
              </p>
            )}
            {confirmAction.action === 'promote' && (
              <p className="text-[#2a8a2b] text-[8px] mb-2">
                Promoted players join your senior squad with a professional contract.
              </p>
            )}
            <div className="flex gap-2 justify-end mt-3">
              <button
                onClick={() => setConfirmAction(null)}
                className="px-3 py-1 text-[8px] font-bold bg-[#5a2a2a] text-white border border-[#ff4444] rounded hover:bg-[#4a1a1a]"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                className={`px-3 py-1 text-[8px] font-bold text-white border rounded ${
                  confirmAction.action === 'promote'
                    ? 'bg-[#2a5a2a] border-[#2a8a2b] hover:bg-[#1a4a1a]'
                    : 'bg-[#5a2a2a] border-[#ff4444] hover:bg-[#4a1a1a]'
                }`}
              >
                Confirm {confirmAction.action === 'promote' ? 'Promotion' : 'Release'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default YouthAcademyTab;
