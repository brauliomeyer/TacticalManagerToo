/* ═══════════════════════════════════════════════════════════════════
   PlayerTable.tsx — Reusable player table with sorting & filtering
   ═══════════════════════════════════════════════════════════════════ */

import React, { useMemo } from 'react';
import type { Player, Club } from '../state/gameReducer';

interface PlayerTableProps {
  players: Player[];
  clubs?: Record<string, Club>;
  showClub?: boolean;
  showActions?: boolean;
  onBid?: (player: Player) => void;
  onShortlist?: (player: Player) => void;
  onList?: (player: Player) => void;
  onUnlist?: (player: Player) => void;
  emptyMessage?: string;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
  onSort?: (field: string) => void;
}

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

const PlayerTable: React.FC<PlayerTableProps> = ({
  players,
  clubs,
  showClub = false,
  showActions = false,
  onBid,
  onShortlist,
  onList,
  onUnlist,
  emptyMessage = 'No players found.',
  sortBy,
  sortDir,
  onSort,
}) => {
  const sorted = useMemo(() => {
    if (!sortBy) return players;
    return [...players].sort((a, b) => {
      let cmp = 0;
      switch (sortBy) {
        case 'name': cmp = a.name.localeCompare(b.name); break;
        case 'age': cmp = a.age - b.age; break;
        case 'position': cmp = a.position.localeCompare(b.position); break;
        case 'value': cmp = a.value - b.value; break;
        case 'wage': cmp = a.wage - b.wage; break;
        case 'potential': cmp = a.potential - b.potential; break;
        case 'morale': cmp = a.morale - b.morale; break;
        case 'form': cmp = a.form - b.form; break;
        default: cmp = a.value - b.value;
      }
      return sortDir === 'desc' ? -cmp : cmp;
    });
  }, [players, sortBy, sortDir]);

  if (players.length === 0) {
    return <div className="text-center py-8 text-[#00e5ff] text-[10px]">{emptyMessage}</div>;
  }

  const SortHeader = ({ field, label }: { field: string; label: string }) => (
    <th
      className="px-1 py-1 text-[8px] font-bold text-[#98ca7a] uppercase cursor-pointer hover:text-[#efe56b] select-none"
      onClick={() => onSort?.(field)}
    >
      {label} {sortBy === field ? (sortDir === 'asc' ? '▲' : '▼') : ''}
    </th>
  );

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[10px] border-collapse">
        <thead>
          <tr className="border-b border-[#444]">
            <SortHeader field="name" label="Name" />
            <SortHeader field="age" label="Age" />
            <SortHeader field="position" label="Pos" />
            <th className="px-1 py-1 text-[8px] font-bold text-[#98ca7a] uppercase">OVR</th>
            <SortHeader field="potential" label="Pot" />
            <SortHeader field="value" label="Value" />
            <SortHeader field="wage" label="Wage" />
            <SortHeader field="morale" label="Mor" />
            <SortHeader field="form" label="Form" />
            {showClub && <th className="px-1 py-1 text-[8px] font-bold text-[#98ca7a] uppercase">Club</th>}
            <th className="px-1 py-1 text-[8px] font-bold text-[#98ca7a] uppercase">Status</th>
            {showActions && <th className="px-1 py-1 text-[8px] font-bold text-[#98ca7a] uppercase">Actions</th>}
          </tr>
        </thead>
        <tbody>
          {sorted.map((player) => {
            const ovr = calculateOvr(player);
            const club = clubs?.[player.clubId ?? ''];
            return (
              <tr key={player.id} className="border-b border-[#333] hover:bg-[#2a2a2a]">
                <td className="px-1 py-1 text-white font-bold truncate max-w-[120px]">{player.name}</td>
                <td className="px-1 py-1 text-[#d5f8b6]">{player.age}</td>
                <td className="px-1 py-1 text-[#98ca7a]">{player.position}</td>
                <td className={`px-1 py-1 font-black ${getOvrColor(ovr)}`}>{ovr}</td>
                <td className={`px-1 py-1 font-bold ${ovr >= 75 ? 'text-[#00e5ff]' : 'text-[#98ca7a]'}`}>{player.potential}</td>
                <td className="px-1 py-1 text-white">€{(player.value / 1_000_000).toFixed(1)}M</td>
                <td className="px-1 py-1 text-[#d5f8b6]">€{player.wage.toLocaleString()}</td>
                <td className="px-1 py-1">
                  <div className="w-10 h-1.5 bg-[#333] rounded-full overflow-hidden">
                    <div
                      className={`h-full ${player.morale >= 70 ? 'bg-[#2a8a2b]' : player.morale >= 40 ? 'bg-[#efe56b]' : 'bg-[#ff4444]'}`}
                      style={{ width: `${player.morale}%` }}
                    />
                  </div>
                </td>
                <td className="px-1 py-1 text-center">{player.form >= 70 ? '🟢' : player.form >= 40 ? '🟡' : '🔴'}</td>
                {showClub && (
                  <td className="px-1 py-1 text-[#00e5ff] truncate max-w-[100px]">
                    {club?.name ?? (player.clubId === null ? 'Free Agent' : 'Unknown')}
                  </td>
                )}
                <td className="px-1 py-1">
                  {player.isListed && <span className="text-[#ffa500] text-[8px] font-bold">LISTED</span>}
                  {player.isYouth && <span className="text-[#00e5ff] text-[8px] font-bold">YOUTH</span>}
                  {player.clubId === null && <span className="text-[#ff4444] text-[8px] font-bold">FREE</span>}
                </td>
                {showActions && (
                  <td className="px-1 py-1">
                    <div className="flex gap-0.5">
                      {onBid && (
                        <button
                          onClick={() => onBid(player)}
                          className="px-1 py-0.5 text-[7px] font-bold bg-[#2a5a2a] text-white border border-[#2a8a2b] rounded hover:bg-[#1a4a1a]"
                        >
                          BID
                        </button>
                      )}
                      {onShortlist && (
                        <button
                          onClick={() => onShortlist(player)}
                          className="px-1 py-0.5 text-[7px] font-bold bg-[#5a4a2a] text-white border border-[#efe56b] rounded hover:bg-[#4a3a1a]"
                        >
                          WATCH
                        </button>
                      )}
                      {onList && !player.isListed && (
                        <button
                          onClick={() => onList(player)}
                          className="px-1 py-0.5 text-[7px] font-bold bg-[#5a2a2a] text-white border border-[#ff4444] rounded hover:bg-[#4a1a1a]"
                        >
                          LIST
                        </button>
                      )}
                      {onUnlist && player.isListed && (
                        <button
                          onClick={() => onUnlist(player)}
                          className="px-1 py-0.5 text-[7px] font-bold bg-[#2a2a5a] text-white border border-[#00e5ff] rounded hover:bg-[#1a1a4a]"
                        >
                          UNLIST
                        </button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default PlayerTable;
