/* ═══════════════════════════════════════════════════════════════════
   ActionButton.tsx — Reusable action button with retro styling
   ═══════════════════════════════════════════════════════════════════ */

import React from 'react';

interface ActionButtonProps {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'danger' | 'warning' | 'info' | 'success';
  disabled?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

const VARIANT_STYLES: Record<string, string> = {
  primary: 'bg-[#2a5a2a] border-[#2a8a2b] text-white hover:bg-[#1a4a1a]',
  danger: 'bg-[#5a2a2a] border-[#ff4444] text-white hover:bg-[#4a1a1a]',
  warning: 'bg-[#5a4a2a] border-[#efe56b] text-white hover:bg-[#4a3a1a]',
  info: 'bg-[#2a2a5a] border-[#00e5ff] text-white hover:bg-[#1a1a4a]',
  success: 'bg-[#1a5a2a] border-[#2a8a2b] text-[#2a8a2b] hover:bg-[#0d3f10]',
};

const ActionButton: React.FC<ActionButtonProps> = ({
  label,
  onClick,
  variant = 'primary',
  disabled = false,
  size = 'sm',
  className = '',
}) => {
  const sizeClass = size === 'sm' ? 'px-1.5 py-0.5 text-[8px]' : 'px-3 py-1 text-[10px]';
  const variantClass = VARIANT_STYLES[variant] || VARIANT_STYLES.primary;

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`font-bold border rounded ${sizeClass} ${variantClass} ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${className}`}
      style={{ fontFamily: '"Press Start 2P", "Courier New", monospace' }}
    >
      {label}
    </button>
  );
};

export default ActionButton;
