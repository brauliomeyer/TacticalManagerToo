import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  type FullTactic,
  type TacticPreset,
  type TacticStyleId,
  type FormationId,
  type PlayerRole,
  type TeamInstructions,
  type Mentality,
  type AutoSubRule,
  FORMATIONS,
  TACTIC_PRESETS,
  createTacticFromPreset,
  changeFormation,
  getAllowedRoles,
  saveActiveTactic,
  loadActiveTactic,
  computeTacticModifiers,
} from '../engine/tacticsSystem';

/* ── Prop types ── */
interface StarterPlayer {
  id: string;
  name: string;
  role: string;
}

interface BenchPlayer {
  id: string;
  name: string;
  role: string;
}

interface TacticsPageProps {
  starters: StarterPlayer[];
  bench: BenchPlayer[];
  clubId: string;
  onAutoSelectByFormation?: (tactic: FullTactic) => void;
}

/* ── Tab type ── */
type Tab = 'presets' | 'formation' | 'roles' | 'instructions' | 'autosubs' | 'summary';

/* ══════════════════════════════════════════════
   SMALL SUB-COMPONENTS
   ══════════════════════════════════════════════ */

function Slider({
  label,
  value,
  onChange,
  leftLabel,
  rightLabel,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  leftLabel: string;
  rightLabel: string;
}) {
  return (
    <div className="mb-2">
      <div className="flex justify-between text-[10px] mb-0.5">
        <span className="text-[#98ca7a] font-bold uppercase">{label}: {value}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-[9px] text-[#6b9a5a] w-14 text-right">{leftLabel}</span>
        <input
          type="range"
          min={0}
          max={100}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="flex-1 h-1.5 accent-[#efe56b] bg-[#1a3a1e]"
        />
        <span className="text-[9px] text-[#6b9a5a] w-14">{rightLabel}</span>
      </div>
    </div>
  );
}

function TabButton({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-2 py-1 text-[10px] font-black uppercase border-2 transition-colors ${
        active
          ? 'border-[#efe56b] bg-[#efe56b] text-[#2e1f4a]'
          : 'border-[#2a8a2b] bg-[#0a3d0e] text-[#98ca7a] hover:bg-[#1a5a1e]'
      }`}
    >
      {label}
    </button>
  );
}

/* ── Preset Card ── */
function PresetCard({
  preset,
  isActive,
  onApply,
}: {
  preset: TacticPreset;
  isActive: boolean;
  onApply: () => void;
}) {
  return (
    <div
      className={`border-2 p-2 cursor-pointer transition-all ${
        isActive
          ? 'border-[#efe56b] bg-[#1a5a28]'
          : 'border-[#2a8a2b] bg-[#0a3d0e] hover:border-[#98ca7a]'
      }`}
      onClick={onApply}
    >
      <div className="flex items-center gap-2 mb-1">
        <span className="text-lg">{preset.icon}</span>
        <div>
          <h4 className="text-xs font-black text-white">{preset.name}</h4>
          <span className="text-[9px] text-[#98ca7a]">{preset.formation}</span>
        </div>
        {isActive && (
          <span className="ml-auto text-[9px] font-bold text-[#efe56b] border border-[#efe56b] px-1.5 py-0.5">ACTIVE</span>
        )}
      </div>
      <p className="text-[10px] text-[#d5f8b6] leading-tight">{preset.description}</p>
      <div className="mt-1 flex flex-wrap gap-1">
        {Object.entries(preset.roleOverrides).slice(0, 4).map(([slotId, role]) => (
          <span key={slotId} className="text-[8px] bg-[#1a3a1e] border border-[#2a8a2b] px-1 py-0.5 text-[#98ca7a]">
            {slotId.toUpperCase()}: {role}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ── Formation Pitch ── */
function FormationPitch({
  tactic,
  starters,
  selectedSlot,
  onSelectSlot,
}: {
  tactic: FullTactic;
  starters: StarterPlayer[];
  selectedSlot: string | null;
  onSelectSlot: (id: string) => void;
}) {
  const starterMap = useMemo(() => {
    const map: Record<string, string> = {};
    const used = new Set<string>();
    const posToRole: Record<string, string[]> = {
      gk: ['GOALKEEPER'],
      lb: ['LEFT_BACK', 'LEFT_WING_BACK'], rb: ['RIGHT_BACK', 'RIGHT_WING_BACK'],
      lwb: ['LEFT_WING_BACK', 'LEFT_BACK'], rwb: ['RIGHT_WING_BACK', 'RIGHT_BACK'],
      cb1: ['CENTER_BACK', 'SWEEPER'], cb2: ['CENTER_BACK', 'SWEEPER'], cb3: ['CENTER_BACK', 'SWEEPER'],
      dm: ['DEFENSIVE_MIDFIELDER', 'ANCHOR'], dm1: ['DEFENSIVE_MIDFIELDER', 'ANCHOR'], dm2: ['DEFENSIVE_MIDFIELDER', 'CENTRAL_MIDFIELDER'],
      cm1: ['CENTRAL_MIDFIELDER', 'BOX_TO_BOX_MIDFIELDER', 'ANCHOR'],
      cm2: ['CENTRAL_MIDFIELDER', 'PLAYMAKER', 'BOX_TO_BOX_MIDFIELDER'],
      cm3: ['ATTACKING_MIDFIELDER', 'CENTRAL_MIDFIELDER', 'PLAYMAKER'],
      am: ['ATTACKING_MIDFIELDER', 'PLAYMAKER'],
      lm: ['LEFT_WINGER', 'LEFT_MIDFIELDER', 'INVERTED_WINGER'],
      rm: ['RIGHT_WINGER', 'RIGHT_MIDFIELDER', 'INVERTED_WINGER'],
      lw: ['LEFT_WINGER', 'INVERTED_WINGER', 'LEFT_MIDFIELDER'],
      rw: ['RIGHT_WINGER', 'INVERTED_WINGER', 'RIGHT_MIDFIELDER'],
      st: ['STRIKER', 'TARGET_MAN', 'FALSE_NINE', 'SECOND_STRIKER'],
      st1: ['STRIKER', 'TARGET_MAN', 'FALSE_NINE'], st2: ['STRIKER', 'SECOND_STRIKER', 'TARGET_MAN'],
    };
    for (const slot of tactic.slots) {
      const roles = posToRole[slot.id] ?? [];
      for (const role of roles) {
        const match = starters.find((s) => s.role === role && !used.has(s.id));
        if (match) {
          const parts = match.name.split(' ');
          map[slot.id] = parts[parts.length - 1];
          used.add(match.id);
          break;
        }
      }
    }
    const remaining = starters.filter((s) => !used.has(s.id));
    let ri = 0;
    for (const slot of tactic.slots) {
      if (!map[slot.id] && ri < remaining.length) {
        const parts = remaining[ri].name.split(' ');
        map[slot.id] = parts[parts.length - 1];
        ri++;
      }
    }
    return map;
  }, [tactic.slots, starters]);

  return (
    <div className="border border-[#2a8a2b] bg-[#0d2d0d] relative" style={{ aspectRatio: '3/4' }}>
      <svg viewBox="0 0 100 100" className="w-full h-full">
        {/* Pitch markings */}
        <rect x="2" y="2" width="96" height="96" fill="#1a5e1a" stroke="#3a9a3a" strokeWidth="0.3" />
        <line x1="2" y1="50" x2="98" y2="50" stroke="#3a9a3a" strokeWidth="0.2" />
        <circle cx="50" cy="50" r="10" fill="none" stroke="#3a9a3a" strokeWidth="0.2" />
        <rect x="25" y="2" width="50" height="14" fill="none" stroke="#3a9a3a" strokeWidth="0.2" />
        <rect x="25" y="84" width="50" height="14" fill="none" stroke="#3a9a3a" strokeWidth="0.2" />
        <rect x="35" y="2" width="30" height="6" fill="none" stroke="#3a9a3a" strokeWidth="0.2" />
        <rect x="35" y="92" width="30" height="6" fill="none" stroke="#3a9a3a" strokeWidth="0.2" />

        {/* Players */}
        {tactic.slots.map((slot) => {
          const isSelected = selectedSlot === slot.id;
          return (
            <g
              key={slot.id}
              onClick={() => onSelectSlot(slot.id)}
              className="cursor-pointer"
            >
              <circle
                cx={slot.posX}
                cy={slot.posY}
                r="3.5"
                fill={isSelected ? '#efe56b' : '#3b82f6'}
                stroke={isSelected ? '#fff' : '#1e3a5f'}
                strokeWidth="0.4"
              />
              <text
                x={slot.posX}
                y={slot.posY + 1}
                textAnchor="middle"
                fontSize="2.2"
                fill={isSelected ? '#2e1f4a' : 'white'}
                fontWeight="bold"
              >
                {slot.label}
              </text>
              <text
                x={slot.posX}
                y={slot.posY + 6}
                textAnchor="middle"
                fontSize="1.8"
                fill="#d5f8b6"
              >
                {starterMap[slot.id] ?? ''}
              </text>
              <text
                x={slot.posX}
                y={slot.posY - 4.5}
                textAnchor="middle"
                fontSize="1.5"
                fill="#efe56b"
                fontWeight="bold"
              >
                {slot.assignedRole}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/* ══════════════════════════════════════════════
   TAB PANELS
   ══════════════════════════════════════════════ */

/* ── Presets Panel ── */
function PresetsPanel({
  tactic,
  onApplyPreset,
}: {
  tactic: FullTactic;
  onApplyPreset: (presetId: TacticStyleId) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-[10px] text-[#98ca7a]">
        Select a tactical style. This will set formation, roles, and instructions.
        You can fine-tune afterwards (Hybrid Mode).
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {TACTIC_PRESETS.map((preset) => (
          <PresetCard
            key={preset.id}
            preset={preset}
            isActive={tactic.styleId === preset.id && tactic.isPreset}
            onApply={() => onApplyPreset(preset.id)}
          />
        ))}
      </div>
    </div>
  );
}

/* ── Formation Panel ── */
function FormationPanel({
  tactic,
  starters,
  onChangeFormation,
  onAutoSelectCurrent,
  onQuickAutoFormation,
  selectedSlot,
  onSelectSlot,
}: {
  tactic: FullTactic;
  starters: StarterPlayer[];
  onChangeFormation: (f: FormationId) => void;
  onAutoSelectCurrent: () => void;
  onQuickAutoFormation: (f: FormationId) => void;
  selectedSlot: string | null;
  onSelectSlot: (id: string) => void;
}) {
  const formationIds = Object.keys(FORMATIONS) as FormationId[];
  const quickAutoFormations = (['4-3-3', '4-2-3-1'] as FormationId[]).filter((fid) => !!FORMATIONS[fid]);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-1 border border-[#2a8a2b] bg-[#0a3d0e] p-2">
        <button
          onClick={onAutoSelectCurrent}
          className="px-2 py-1 text-[10px] font-black uppercase border-2 border-[#22c55e] bg-[#14532d] text-[#22c55e] hover:bg-[#166534]"
        >
          Auto Selectie op Huidige Formatie
        </button>
        {quickAutoFormations.map((fid) => (
          <button
            key={fid}
            onClick={() => onQuickAutoFormation(fid)}
            className="px-2 py-1 text-[10px] font-black uppercase border-2 border-[#efe56b] bg-[#efe56b] text-[#2e1f4a] hover:bg-[#f6ec96]"
          >
            Auto {fid}
          </button>
        ))}
      </div>

      {/* Formation selector */}
      <div className="flex flex-wrap gap-1">
        {formationIds.map((fid) => (
          <button
            key={fid}
            onClick={() => onChangeFormation(fid)}
            className={`px-2 py-1 text-xs font-black border-2 ${
              tactic.formation === fid
                ? 'border-[#efe56b] bg-[#efe56b] text-[#2e1f4a]'
                : 'border-[#2a8a2b] bg-[#0a3d0e] text-[#98ca7a] hover:bg-[#1a5a1e]'
            }`}
          >
            {FORMATIONS[fid].label}
          </button>
        ))}
      </div>

      {/* Pitch */}
      <div className="max-w-sm mx-auto">
        <FormationPitch
          tactic={tactic}
          starters={starters}
          selectedSlot={selectedSlot}
          onSelectSlot={onSelectSlot}
        />
      </div>

      <p className="text-[10px] text-[#6b9a5a] text-center">Click a player to edit their role in the Roles tab.</p>
    </div>
  );
}

/* ── Roles Panel ── */
function RolesPanel({
  tactic,
  selectedSlot,
  onSelectSlot,
  onChangeRole,
}: {
  tactic: FullTactic;
  selectedSlot: string | null;
  onSelectSlot: (id: string) => void;
  onChangeRole: (slotId: string, role: PlayerRole) => void;
}) {
  const selected = tactic.slots.find((s) => s.id === selectedSlot);
  const allowedRoles = selectedSlot ? getAllowedRoles(selectedSlot) : [];

  return (
    <div className="space-y-2">
      <p className="text-[10px] text-[#98ca7a]">
        Assign specialized roles to each position. Roles affect how players behave during matches.
      </p>

      {/* Slot list */}
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-1">
        {tactic.slots.map((slot) => (
          <button
            key={slot.id}
            onClick={() => onSelectSlot(slot.id)}
            className={`p-1.5 border text-left ${
              selectedSlot === slot.id
                ? 'border-[#efe56b] bg-[#1a5a28]'
                : 'border-[#2a8a2b] bg-[#0a3d0e] hover:bg-[#1a3a1e]'
            }`}
          >
            <div className="text-[10px] font-black text-white">{slot.label}</div>
            <div className="text-[9px] text-[#efe56b] truncate">{slot.assignedRole}</div>
          </button>
        ))}
      </div>

      {/* Role selector for selected slot */}
      {selected && (
        <div className="border-2 border-[#efe56b] bg-[#0a3d0e] p-2">
          <h4 className="text-xs font-black text-[#efe56b] mb-1">
            {selected.label} — Choose Role
          </h4>
          <div className="flex flex-wrap gap-1">
            {allowedRoles.map((role) => (
              <button
                key={role}
                onClick={() => onChangeRole(selected.id, role)}
                className={`px-2 py-1 text-[10px] font-bold border ${
                  selected.assignedRole === role
                    ? 'border-[#efe56b] bg-[#efe56b] text-[#2e1f4a]'
                    : 'border-[#2a8a2b] bg-[#1a3a1e] text-white hover:bg-[#2a8a2b]'
                }`}
              >
                {role}
              </button>
            ))}
          </div>
          <p className="text-[9px] text-[#6b9a5a] mt-1">
            {getRoleDescription(selected.assignedRole)}
          </p>
        </div>
      )}
    </div>
  );
}

function getRoleDescription(role: PlayerRole): string {
  const descs: Partial<Record<PlayerRole, string>> = {
    'Playmaker': 'Dictates tempo and creates chances with through balls. Boosts possession and chance creation.',
    'Box-to-Box': 'Covers full pitch. Balanced contribution to attack and defense.',
    'Anchor': 'Sits deep, shields the defense. Strong defensive contribution.',
    'Mezzala': 'Drifts into wide positions from central midfield. Good chance creation.',
    'False 9': 'Drops deep to create space. Boosts possession and chance creation.',
    'Target Man': 'Holds up play, wins headers. Improves shot quality.',
    'Poacher': 'Lurks in the box. Highest shot quality bonus.',
    'Advanced Forward': 'Leads the line with runs in behind. Strong attack bonus.',
    'Winger': 'Hugs the touchline and delivers crosses. Good chance creation and counter.',
    'Inside Forward': 'Cuts inside from wing. Boosts attack and shot quality.',
    'Inverted Winger': 'Cuts inside on stronger foot. Good possession retention.',
    'Wing Back': 'Attacking full back. Provides width and chance creation.',
    'Inverted Wing Back': 'Tucks inside when in possession. Boosts possession.',
    'Ball Playing Defender': 'Starts attacks from the back. Boosts possession.',
    'Stopper': 'Aggressive defender. Steps up to intercept. Strong defense.',
    'Deep Lying Playmaker': 'Drops between defenders to distribute. High possession and defense.',
    'Trequartista': 'Creative freedom in final third. Best chance creation and attack.',
    'Defensive Midfielder': 'Screens defense. Breaks up play before it develops.',
    'Full Back': 'Traditional defender. Solid defensive contribution.',
    'Goalkeeper': 'Last line of defense.',
  };
  return descs[role] ?? 'Standard role.';
}

/* ── Instructions Panel ── */
function InstructionsPanel({
  tactic,
  onUpdate,
}: {
  tactic: FullTactic;
  onUpdate: (inst: Partial<TeamInstructions>) => void;
}) {
  const inst = tactic.instructions;

  return (
    <div className="space-y-3">
      <p className="text-[10px] text-[#98ca7a]">
        Fine-tune your team&apos;s behaviour. These settings directly affect match outcomes.
      </p>

      {/* Attack */}
      <div className="border border-[#2a8a2b] bg-[#0a3d0e] p-2">
        <h4 className="text-[10px] font-black uppercase text-[#efe56b] mb-1">Attack</h4>
        <Slider
          label="Passing"
          value={inst.passing}
          onChange={(v) => onUpdate({ passing: v })}
          leftLabel="Short"
          rightLabel="Long"
        />
        <Slider
          label="Tempo"
          value={inst.tempo}
          onChange={(v) => onUpdate({ tempo: v })}
          leftLabel="Slow"
          rightLabel="Fast"
        />
        <Slider
          label="Width"
          value={inst.width}
          onChange={(v) => onUpdate({ width: v })}
          leftLabel="Narrow"
          rightLabel="Wide"
        />
      </div>

      {/* Defense */}
      <div className="border border-[#2a8a2b] bg-[#0a3d0e] p-2">
        <h4 className="text-[10px] font-black uppercase text-[#efe56b] mb-1">Defense</h4>
        <Slider
          label="Pressing"
          value={inst.pressing}
          onChange={(v) => onUpdate({ pressing: v })}
          leftLabel="Low"
          rightLabel="High"
        />
        <Slider
          label="Def. Line"
          value={inst.defensiveLine}
          onChange={(v) => onUpdate({ defensiveLine: v })}
          leftLabel="Deep"
          rightLabel="High"
        />
        <Slider
          label="Tackling"
          value={inst.tackling}
          onChange={(v) => onUpdate({ tackling: v })}
          leftLabel="Soft"
          rightLabel="Aggressive"
        />
      </div>

      {/* Mentality */}
      <div className="border border-[#2a8a2b] bg-[#0a3d0e] p-2">
        <h4 className="text-[10px] font-black uppercase text-[#efe56b] mb-1">Mentality</h4>
        <div className="flex gap-1">
          {(['Defensive', 'Balanced', 'Attacking'] as Mentality[]).map((m) => (
            <button
              key={m}
              onClick={() => onUpdate({ mentality: m })}
              className={`flex-1 py-1 text-[10px] font-black border-2 ${
                inst.mentality === m
                  ? 'border-[#efe56b] bg-[#efe56b] text-[#2e1f4a]'
                  : 'border-[#2a8a2b] bg-[#1a3a1e] text-[#98ca7a]'
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Auto Substitutions Panel ── */
function AutoSubsPanel({
  tactic,
  bench,
  onAddRule,
  onRemoveRule,
  onToggleRule,
}: {
  tactic: FullTactic;
  bench: BenchPlayer[];
  onAddRule: (rule: AutoSubRule) => void;
  onRemoveRule: (id: string) => void;
  onToggleRule: (id: string) => void;
}) {
  const [condition, setCondition] = useState<AutoSubRule['condition']>('minute');
  const [condValue, setCondValue] = useState(60);
  const [outSlot, setOutSlot] = useState(tactic.slots[0]?.id ?? '');
  const [inIdx, setInIdx] = useState(0);

  const usedSlots = new Set(tactic.autoSubRules.map((r) => r.outSlotId));

  const handleAdd = () => {
    if (tactic.autoSubRules.length >= 5) return;
    onAddRule({
      id: `rule-${Date.now()}`,
      condition,
      conditionValue: condition === 'minute' ? condValue : undefined,
      outSlotId: outSlot,
      inPlayerIndex: inIdx,
      enabled: true,
    });
  };

  return (
    <div className="space-y-3">
      <p className="text-[10px] text-[#98ca7a]">
        Set up automatic substitutions. Max 5 subs per match.
        Rules are checked each minute during the match.
      </p>

      {/* Existing rules */}
      {tactic.autoSubRules.length > 0 && (
        <div className="border border-[#2a8a2b] bg-[#0a3d0e] p-2 space-y-1">
          <h4 className="text-[10px] font-black uppercase text-[#efe56b] mb-1">
            Active Rules ({tactic.autoSubRules.length}/5)
          </h4>
          {tactic.autoSubRules.map((rule) => {
            const slot = tactic.slots.find((s) => s.id === rule.outSlotId);
            const benchP = bench[rule.inPlayerIndex];
            return (
              <div key={rule.id} className="flex items-center gap-1 bg-[#1a3a1e] p-1 border border-[#2a8a2b]">
                <button
                  onClick={() => onToggleRule(rule.id)}
                  className={`w-4 h-4 border text-[10px] font-bold ${
                    rule.enabled ? 'border-[#22c55e] text-[#22c55e]' : 'border-[#666] text-[#666]'
                  }`}
                >
                  {rule.enabled ? '✓' : '×'}
                </button>
                <span className="text-[10px] text-white flex-1">
                  When <span className="text-[#efe56b] font-bold">{rule.condition}</span>
                  {rule.condition === 'minute' && <span> ≥ {rule.conditionValue}&apos;</span>}
                  {' → '}
                  <span className="text-[#ef4444]">{slot?.label ?? '?'}</span>
                  {' ↔ '}
                  <span className="text-[#22c55e]">{benchP?.name?.split(' ').pop() ?? `Bench #${rule.inPlayerIndex + 1}`}</span>
                </span>
                <button
                  onClick={() => onRemoveRule(rule.id)}
                  className="text-[10px] text-[#ef4444] font-bold px-1"
                >
                  ✕
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Add new rule */}
      {tactic.autoSubRules.length < 5 && (
        <div className="border border-[#2a8a2b] bg-[#0a3d0e] p-2">
          <h4 className="text-[10px] font-black uppercase text-[#efe56b] mb-2">Add Rule</h4>
          <div className="grid grid-cols-2 gap-2 text-[10px]">
            <div>
              <label className="block text-[#98ca7a] mb-0.5 font-bold">Condition</label>
              <select
                value={condition}
                onChange={(e) => setCondition(e.target.value as AutoSubRule['condition'])}
                className="w-full bg-[#1a3a1e] border border-[#2a8a2b] text-white px-1 py-0.5 text-[10px]"
              >
                <option value="minute">At minute</option>
                <option value="losing">When losing</option>
                <option value="winning">When winning</option>
                <option value="drawing">When drawing</option>
                <option value="injury">On injury</option>
                <option value="red_card">On red card</option>
              </select>
            </div>
            {condition === 'minute' && (
              <div>
                <label className="block text-[#98ca7a] mb-0.5 font-bold">Minute</label>
                <input
                  type="number"
                  min={1}
                  max={89}
                  value={condValue}
                  onChange={(e) => setCondValue(Number(e.target.value))}
                  className="w-full bg-[#1a3a1e] border border-[#2a8a2b] text-white px-1 py-0.5 text-[10px]"
                />
              </div>
            )}
            <div>
              <label className="block text-[#98ca7a] mb-0.5 font-bold">Sub Out</label>
              <select
                value={outSlot}
                onChange={(e) => setOutSlot(e.target.value)}
                className="w-full bg-[#1a3a1e] border border-[#2a8a2b] text-white px-1 py-0.5 text-[10px]"
              >
                {tactic.slots.filter((s) => s.id !== 'gk').map((s) => (
                  <option key={s.id} value={s.id} disabled={usedSlots.has(s.id)}>
                    {s.label} ({s.assignedRole})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[#98ca7a] mb-0.5 font-bold">Sub In</label>
              <select
                value={inIdx}
                onChange={(e) => setInIdx(Number(e.target.value))}
                className="w-full bg-[#1a3a1e] border border-[#2a8a2b] text-white px-1 py-0.5 text-[10px]"
              >
                {bench.map((p, i) => (
                  <option key={p.id} value={i}>
                    {p.name.split(' ').pop()} ({p.role})
                  </option>
                ))}
              </select>
            </div>
          </div>
          <button
            onClick={handleAdd}
            className="mt-2 w-full border-2 border-[#22c55e] bg-[#14532d] text-[#22c55e] py-1 text-[10px] font-black uppercase hover:bg-[#166534]"
          >
            + Add Auto-Sub Rule
          </button>
        </div>
      )}
    </div>
  );
}

/* ── Summary Panel ── */
function SummaryPanel({ tactic }: { tactic: FullTactic }) {
  const mods = computeTacticModifiers(tactic);
  const inst = tactic.instructions;

  const modItems: { label: string; value: number; unit: string; good: 'high' | 'low' | 'neutral' }[] = [
    { label: 'Possession', value: mods.possessionMod, unit: '', good: 'high' },
    { label: 'Attack', value: mods.attackMod, unit: '', good: 'high' },
    { label: 'Defense', value: mods.defenseMod, unit: '', good: 'high' },
    { label: 'Shot Quality', value: mods.shotQualityMod, unit: '', good: 'high' },
    { label: 'Chance Creation', value: mods.chanceCreationMod, unit: '', good: 'high' },
    { label: 'Counter Attack', value: mods.counterAttackMod, unit: '', good: 'high' },
    { label: 'Fatigue Rate', value: Math.round(mods.fatigueMod * 100 - 100), unit: '%', good: 'low' },
    { label: 'Foul Risk', value: Math.round(mods.foulRiskMod * 100 - 100), unit: '%', good: 'low' },
  ];

  return (
    <div className="space-y-3">
      {/* Tactic identity */}
      <div className="border-2 border-[#efe56b] bg-[#1a3a1e] p-3 text-center">
        <h3 className="text-sm font-black text-[#efe56b]">{tactic.name}</h3>
        <p className="text-[10px] text-[#98ca7a]">
          {tactic.formation} · {inst.mentality} · {tactic.isPreset ? 'Preset' : 'Custom'}
        </p>
      </div>

      {/* Modifier impact */}
      <div className="border border-[#2a8a2b] bg-[#0a3d0e] p-2">
        <h4 className="text-[10px] font-black uppercase text-[#efe56b] mb-2">Match Impact</h4>
        <div className="space-y-1">
          {modItems.map((item) => {
            const isGood =
              item.good === 'high' ? item.value > 0 :
              item.good === 'low' ? item.value < 0 :
              true;
            const color =
              item.value === 0 ? 'text-[#98ca7a]' :
              isGood ? 'text-[#22c55e]' : 'text-[#ef4444]';
            return (
              <div key={item.label} className="flex justify-between text-[10px]">
                <span className="text-[#d5f8b6]">{item.label}</span>
                <span className={`font-bold ${color}`}>
                  {item.value > 0 ? '+' : ''}{item.value}{item.unit}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Role breakdown */}
      <div className="border border-[#2a8a2b] bg-[#0a3d0e] p-2">
        <h4 className="text-[10px] font-black uppercase text-[#efe56b] mb-1">Roles</h4>
        <div className="flex flex-wrap gap-1">
          {tactic.slots.map((slot) => (
            <span
              key={slot.id}
              className="text-[9px] bg-[#1a3a1e] border border-[#2a8a2b] px-1 py-0.5 text-white"
            >
              <span className="text-[#98ca7a]">{slot.label}:</span> {slot.assignedRole}
            </span>
          ))}
        </div>
      </div>

      {/* Instruction summary */}
      <div className="border border-[#2a8a2b] bg-[#0a3d0e] p-2">
        <h4 className="text-[10px] font-black uppercase text-[#efe56b] mb-1">Instructions</h4>
        <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-[10px]">
          <span className="text-[#98ca7a]">Passing</span>
          <span className="text-white font-bold">{inst.passing < 35 ? 'Short' : inst.passing > 65 ? 'Long' : 'Mixed'}</span>
          <span className="text-[#98ca7a]">Tempo</span>
          <span className="text-white font-bold">{inst.tempo < 35 ? 'Slow' : inst.tempo > 65 ? 'Fast' : 'Normal'}</span>
          <span className="text-[#98ca7a]">Width</span>
          <span className="text-white font-bold">{inst.width < 35 ? 'Narrow' : inst.width > 65 ? 'Wide' : 'Normal'}</span>
          <span className="text-[#98ca7a]">Pressing</span>
          <span className="text-white font-bold">{inst.pressing < 35 ? 'Low' : inst.pressing > 65 ? 'High' : 'Medium'}</span>
          <span className="text-[#98ca7a]">Def. Line</span>
          <span className="text-white font-bold">{inst.defensiveLine < 35 ? 'Deep' : inst.defensiveLine > 65 ? 'High' : 'Normal'}</span>
          <span className="text-[#98ca7a]">Tackling</span>
          <span className="text-white font-bold">{inst.tackling < 35 ? 'Soft' : inst.tackling > 65 ? 'Aggressive' : 'Normal'}</span>
        </div>
      </div>

      {/* Auto-sub rules */}
      {tactic.autoSubRules.length > 0 && (
        <div className="border border-[#2a8a2b] bg-[#0a3d0e] p-2">
          <h4 className="text-[10px] font-black uppercase text-[#efe56b] mb-1">
            Auto-Subs ({tactic.autoSubRules.filter((r) => r.enabled).length} active)
          </h4>
          {tactic.autoSubRules.filter((r) => r.enabled).map((rule) => {
            const slot = tactic.slots.find((s) => s.id === rule.outSlotId);
            return (
              <p key={rule.id} className="text-[10px] text-[#d5f8b6]">
                {rule.condition === 'minute' ? `At ${rule.conditionValue}'` : rule.condition}
                {' → sub '}
                {slot?.label ?? '?'}
              </p>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════
   MAIN COMPONENT
   ══════════════════════════════════════════════ */

export default function TacticsPage({ starters, bench, clubId, onAutoSelectByFormation }: TacticsPageProps) {
  const [tab, setTab] = useState<Tab>('presets');
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);

  // Load or create tactic
  const [tactic, setTactic] = useState<FullTactic>(() => {
    const saved = loadActiveTactic(clubId);
    if (saved) return saved;
    const balanced = TACTIC_PRESETS.find((p) => p.id === 'balanced')!;
    return createTacticFromPreset(balanced);
  });

  // Persist on every change
  useEffect(() => {
    saveActiveTactic(clubId, tactic);
  }, [tactic, clubId]);

  // Reset when club changes
  useEffect(() => {
    const saved = loadActiveTactic(clubId);
    if (saved) setTactic(saved);
    else {
      const balanced = TACTIC_PRESETS.find((p) => p.id === 'balanced')!;
      setTactic(createTacticFromPreset(balanced));
    }
  }, [clubId]);

  // ── Handlers ──
  const handleApplyPreset = useCallback((presetId: TacticStyleId) => {
    const preset = TACTIC_PRESETS.find((p) => p.id === presetId)!;
    setTactic(createTacticFromPreset(preset));
  }, []);

  const handleChangeFormation = useCallback((f: FormationId) => {
    setTactic((prev) => changeFormation(prev, f));
    setSelectedSlot(null);
  }, []);

  const handleAutoSelectCurrent = useCallback(() => {
    onAutoSelectByFormation?.(tactic);
  }, [onAutoSelectByFormation, tactic]);

  const handleQuickAutoFormation = useCallback((f: FormationId) => {
    setTactic((prev) => {
      const next = changeFormation(prev, f);
      onAutoSelectByFormation?.(next);
      return next;
    });
    setSelectedSlot(null);
  }, [onAutoSelectByFormation]);

  const handleChangeRole = useCallback((slotId: string, role: PlayerRole) => {
    setTactic((prev) => ({
      ...prev,
      slots: prev.slots.map((s) => s.id === slotId ? { ...s, assignedRole: role } : s),
      isPreset: false,
    }));
  }, []);

  const handleUpdateInstructions = useCallback((partial: Partial<TeamInstructions>) => {
    setTactic((prev) => ({
      ...prev,
      instructions: { ...prev.instructions, ...partial },
      isPreset: false,
    }));
  }, []);

  const handleAddRule = useCallback((rule: AutoSubRule) => {
    setTactic((prev) => ({
      ...prev,
      autoSubRules: [...prev.autoSubRules, rule],
    }));
  }, []);

  const handleRemoveRule = useCallback((id: string) => {
    setTactic((prev) => ({
      ...prev,
      autoSubRules: prev.autoSubRules.filter((r) => r.id !== id),
    }));
  }, []);

  const handleToggleRule = useCallback((id: string) => {
    setTactic((prev) => ({
      ...prev,
      autoSubRules: prev.autoSubRules.map((r) =>
        r.id === id ? { ...r, enabled: !r.enabled } : r
      ),
    }));
  }, []);

  const presetMatch = TACTIC_PRESETS.find((p) => p.id === tactic.styleId);

  return (
    <section className="border-4 border-[#6f4ca1] bg-[#16a51c] p-3 space-y-3">
      {/* Header */}
      <div className="border border-[#ceb8e1] bg-[#d5b5ec] px-3 py-2">
        <h2 className="text-sm font-black uppercase text-[#2e1f4a]">Tactical Desk</h2>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[10px] text-[#4a3570]">
            Active: <span className="font-black text-[#2e1f4a]">{tactic.name}</span>
          </span>
          <span className="text-[10px] bg-[#2e1f4a] text-[#d5b5ec] px-1.5 py-0.5 font-bold">{tactic.formation}</span>
          {presetMatch && (
            <span className="text-[10px] text-[#4a3570]">{presetMatch.icon}</span>
          )}
        </div>
      </div>

      {/* Mode indicator */}
      <div className="flex items-center gap-2 text-[10px]">
        <span className={`px-2 py-0.5 font-bold border ${
          tactic.isPreset ? 'border-[#22c55e] text-[#22c55e] bg-[#14532d]' : 'border-[#eab308] text-[#eab308] bg-[#422006]'
        }`}>
          {tactic.isPreset ? 'Preset Mode' : 'Custom / Hybrid Mode'}
        </span>
        {!tactic.isPreset && (
          <span className="text-[#6b9a5a]">Modify any setting — you&apos;re in full control.</span>
        )}
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1">
        <TabButton active={tab === 'presets'} label="Presets" onClick={() => setTab('presets')} />
        <TabButton active={tab === 'formation'} label="Formation" onClick={() => setTab('formation')} />
        <TabButton active={tab === 'roles'} label="Roles" onClick={() => setTab('roles')} />
        <TabButton active={tab === 'instructions'} label="Instructions" onClick={() => setTab('instructions')} />
        <TabButton active={tab === 'autosubs'} label="Auto-Subs" onClick={() => setTab('autosubs')} />
        <TabButton active={tab === 'summary'} label="Summary" onClick={() => setTab('summary')} />
      </div>

      {/* Tab content */}
      <div className="border border-[#2a8a2b] bg-[#0d2d0d] p-2">
        {tab === 'presets' && (
          <PresetsPanel tactic={tactic} onApplyPreset={handleApplyPreset} />
        )}
        {tab === 'formation' && (
          <FormationPanel
            tactic={tactic}
            starters={starters}
            onChangeFormation={handleChangeFormation}
            onAutoSelectCurrent={handleAutoSelectCurrent}
            onQuickAutoFormation={handleQuickAutoFormation}
            selectedSlot={selectedSlot}
            onSelectSlot={setSelectedSlot}
          />
        )}
        {tab === 'roles' && (
          <RolesPanel
            tactic={tactic}
            selectedSlot={selectedSlot}
            onSelectSlot={setSelectedSlot}
            onChangeRole={handleChangeRole}
          />
        )}
        {tab === 'instructions' && (
          <InstructionsPanel tactic={tactic} onUpdate={handleUpdateInstructions} />
        )}
        {tab === 'autosubs' && (
          <AutoSubsPanel
            tactic={tactic}
            bench={bench}
            onAddRule={handleAddRule}
            onRemoveRule={handleRemoveRule}
            onToggleRule={handleToggleRule}
          />
        )}
        {tab === 'summary' && (
          <SummaryPanel tactic={tactic} />
        )}
      </div>
    </section>
  );
}
