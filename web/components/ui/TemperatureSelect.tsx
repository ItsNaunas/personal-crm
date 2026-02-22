'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown } from 'lucide-react';
import { temperatureSelectClasses } from './Badge';

const TEMPERATURES = ['', 'cold', 'warm', 'hot'] as const;
const TEMP_LABELS: Record<string, string> = { '': '—', cold: 'cold', warm: 'warm', hot: 'hot' };

/** Colored text when closed (cold/warm/hot), dark text in open list for readability. */
const closedTextClasses: Record<string, string> = {
  cold: 'text-cyan-200',
  warm: 'text-orange-200',
  hot: 'text-red-200',
};

export type TemperatureValue = 'cold' | 'warm' | 'hot' | '';

interface TemperatureSelectProps {
  value: TemperatureValue;
  onChange: (value: TemperatureValue) => void;
  disabled?: boolean;
  className?: string;
  size?: 'xs' | 'sm';
  placeholder?: string;
}

export function TemperatureSelect({
  value,
  onChange,
  disabled = false,
  className = '',
  size = 'xs',
  placeholder = '—',
}: TemperatureSelectProps) {
  const [open, setOpen] = useState(false);
  const [menuRect, setMenuRect] = useState<{ top: number; left: number; width: number } | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      const target = e.target as Node;
      const inMenu = ref.current?.contains(target);
      const onTrigger = triggerRef.current?.contains(target);
      if (!inMenu && !onTrigger) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  useEffect(() => {
    if (open && triggerRef.current && typeof document !== 'undefined') {
      const rect = triggerRef.current.getBoundingClientRect();
      setMenuRect({ top: rect.bottom + 4, left: rect.left, width: rect.width });
    } else {
      setMenuRect(null);
    }
  }, [open]);

  const sizeClasses = size === 'xs' ? 'px-1.5 py-0.5 text-xs min-w-[72px]' : 'px-2 py-1 text-sm min-w-[80px]';
  const closedBgBorder = value && temperatureSelectClasses[value] ? temperatureSelectClasses[value] : 'border-gray-700 bg-gray-800';
  const closedText = value && closedTextClasses[value] ? closedTextClasses[value] : 'text-gray-300';

  const menu = open && menuRect && (
    <div
      ref={ref}
      className="fixed z-[100] rounded border border-gray-300 bg-white shadow-xl py-0.5 min-w-[72px]"
      style={{ top: menuRect.top, left: menuRect.left, width: menuRect.width }}
    >
      {TEMPERATURES.map((t) => (
        <button
          key={t || '_empty'}
          type="button"
          onClick={() => {
            onChange((t || '') as TemperatureValue);
            setOpen(false);
          }}
          className={`w-full text-left px-2 py-1.5 text-black hover:bg-gray-100 transition ${size === 'xs' ? 'text-xs' : 'text-sm'}`}
        >
          {t ? t : placeholder}
        </button>
      ))}
    </div>
  );

  return (
    <div className={`relative inline-block ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => !disabled && setOpen((o) => !o)}
        disabled={disabled}
        className={`rounded border font-medium focus:ring-1 focus:ring-brand-500 flex items-center justify-between gap-1 w-full ${sizeClasses} ${closedBgBorder} ${closedText} disabled:opacity-50`}
      >
        <span>{value ? TEMP_LABELS[value] : placeholder}</span>
        <ChevronDown className={`h-3 w-3 shrink-0 transition ${open ? 'rotate-180' : ''}`} />
      </button>
      {typeof document !== 'undefined' && menu && createPortal(menu, document.body)}
    </div>
  );
}
