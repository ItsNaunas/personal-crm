'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useRef, useEffect, useCallback } from 'react';
import {
  LayoutDashboard,
  Users,
  Briefcase,
  PhoneCall,
  UserCheck,
  Upload,
  Send,
  Lightbulb,
  Activity,
  ChevronRight,
  Search,
  CalendarCheck,
  FileText,
  Tag,
  Clock,
  Plus,
  Keyboard,
  X,
} from 'lucide-react';
import clsx from 'clsx';

const navItems = [
  { href: '/today', label: 'Today', icon: CalendarCheck },
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/leads', label: 'Leads', icon: Users },
  { href: '/deals', label: 'Deals', icon: Briefcase },
  { href: '/calls', label: 'Calls', icon: PhoneCall },
  { href: '/clients', label: 'Clients', icon: UserCheck },
  { href: '/intake', label: 'Intake', icon: Upload },
  { href: '/outreach', label: 'Outreach', icon: Send },
  { href: '/templates', label: 'Templates', icon: FileText },
  { href: '/tags', label: 'Tags', icon: Tag },
  { href: '/insights', label: 'Insights', icon: Lightbulb },
  { href: '/observability', label: 'Observability', icon: Activity },
];

// ─── Recently Viewed ─────────────────────────────────────────────────────────

const RECENTS_KEY = 'crm-recently-viewed';
const MAX_RECENTS = 8;

export interface RecentItem {
  type: 'lead' | 'deal' | 'client';
  id: string;
  name: string;
}

export function trackRecentItem(item: RecentItem) {
  try {
    const raw = localStorage.getItem(RECENTS_KEY);
    const list: RecentItem[] = raw ? (JSON.parse(raw) as RecentItem[]) : [];
    const filtered = list.filter((r) => !(r.type === item.type && r.id === item.id));
    const updated = [item, ...filtered].slice(0, MAX_RECENTS);
    localStorage.setItem(RECENTS_KEY, JSON.stringify(updated));
  } catch { /* ignore */ }
}

function useRecentItems() {
  const [recents, setRecents] = useState<RecentItem[]>([]);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(RECENTS_KEY);
      if (raw) setRecents(JSON.parse(raw) as RecentItem[]);
    } catch { /* ignore */ }
  }, []);
  return recents;
}

// ─── Keyboard Shortcuts Modal ─────────────────────────────────────────────────

const SHORTCUTS = [
  { keys: ['G', 'T'], description: 'Go to Today' },
  { keys: ['G', 'D'], description: 'Go to Dashboard' },
  { keys: ['G', 'L'], description: 'Go to Leads' },
  { keys: ['G', 'E'], description: 'Go to Deals' },
  { keys: ['G', 'C'], description: 'Go to Calls' },
  { keys: ['N'], description: 'Quick add lead' },
  { keys: ['/'], description: 'Focus search' },
  { keys: ['?'], description: 'Show shortcuts' },
];

function ShortcutsModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-full max-w-sm rounded-xl border border-gray-700 bg-gray-900 p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-200">Keyboard Shortcuts</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300"><X className="h-4 w-4" /></button>
        </div>
        <ul className="space-y-2">
          {SHORTCUTS.map((s, i) => (
            <li key={i} className="flex items-center justify-between">
              <span className="text-sm text-gray-400">{s.description}</span>
              <div className="flex items-center gap-1">
                {s.keys.map((k, ki) => (
                  <kbd key={ki} className="rounded bg-gray-800 border border-gray-700 px-1.5 py-0.5 text-xs text-gray-300 font-mono">{k}</kbd>
                ))}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// ─── Quick Add Modal ──────────────────────────────────────────────────────────

function QuickAddModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 bg-black/60">
      <div className="w-full max-w-xs rounded-xl border border-gray-700 bg-gray-900 p-4 shadow-2xl space-y-2">
        <p className="text-xs text-gray-500 mb-2">Quick add</p>
        <button
          onClick={() => { router.push('/leads/new'); onClose(); }}
          className="w-full text-left rounded-lg px-4 py-2.5 text-sm text-gray-300 hover:bg-gray-800 transition flex items-center gap-2"
        >
          <Users className="h-4 w-4 text-brand-400" /> New lead
        </button>
        <button
          onClick={() => { router.push('/intake'); onClose(); }}
          className="w-full text-left rounded-lg px-4 py-2.5 text-sm text-gray-300 hover:bg-gray-800 transition flex items-center gap-2"
        >
          <Upload className="h-4 w-4 text-brand-400" /> Import leads
        </button>
        <button onClick={onClose} className="w-full text-center rounded-lg py-2 text-xs text-gray-600 hover:text-gray-400 transition">
          Cancel (Esc)
        </button>
      </div>
    </div>
  );
}

// ─── Global Search ────────────────────────────────────────────────────────────

function GlobalSearch() {
  const router = useRouter();
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!value.trim()) return;
    router.push(`/leads?q=${encodeURIComponent(value.trim())}`);
    setValue('');
    inputRef.current?.blur();
  }

  return (
    <form onSubmit={submit} className="px-3 pb-2">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-600 pointer-events-none" />
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Search leads… (⌘K or /)"
          className="w-full pl-7 pr-2 py-1.5 rounded-lg bg-gray-800 border border-gray-700 text-xs text-gray-300 placeholder-gray-600 focus:border-brand-500 focus:outline-none transition"
        />
      </div>
    </form>
  );
}

// ─── Sidebar ─────────────────────────────────────────────────────────────────

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const recents = useRecentItems();
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);

  // Keyboard navigation
  useEffect(() => {
    let gPressed = false;
    let gTimer: ReturnType<typeof setTimeout>;

    function onKey(e: KeyboardEvent) {
      const tag = (document.activeElement as HTMLElement)?.tagName;
      const inInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';

      if (e.key === '?' && !inInput) { setShowShortcuts(true); return; }
      if (e.key === 'Escape') { setShowShortcuts(false); setShowQuickAdd(false); return; }
      if (e.key === 'n' && !inInput && !e.metaKey && !e.ctrlKey) { setShowQuickAdd(true); return; }

      if (e.key === 'g' && !inInput) {
        gPressed = true;
        gTimer = setTimeout(() => { gPressed = false; }, 1000);
        return;
      }

      if (gPressed && !inInput) {
        gPressed = false;
        clearTimeout(gTimer);
        switch (e.key.toLowerCase()) {
          case 't': router.push('/today'); break;
          case 'd': router.push('/dashboard'); break;
          case 'l': router.push('/leads'); break;
          case 'e': router.push('/deals'); break;
          case 'c': router.push('/calls'); break;
        }
      }
    }

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [router]);

  return (
    <>
      {showShortcuts && <ShortcutsModal onClose={() => setShowShortcuts(false)} />}
      {showQuickAdd && <QuickAddModal onClose={() => setShowQuickAdd(false)} />}

      <aside className="fixed left-0 top-0 h-full w-[220px] border-r border-gray-800 bg-gray-900 flex flex-col z-30">
        {/* Logo + Quick Add */}
        <div className="flex items-center gap-2 px-5 py-5 border-b border-gray-800">
          <div className="h-7 w-7 rounded-md bg-brand-500 flex items-center justify-center">
            <span className="text-white text-xs font-bold">CRM</span>
          </div>
          <span className="text-sm font-semibold text-white tracking-wide flex-1">Personal CRM</span>
          <button
            onClick={() => setShowQuickAdd(true)}
            className="text-gray-600 hover:text-brand-400 transition"
            title="Quick add (N)"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        {/* Global search */}
        <div className="pt-3">
          <GlobalSearch />
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-2 px-3">
          <ul className="space-y-1">
            {navItems.map(({ href, label, icon: Icon }) => {
              const isActive =
                href === '/dashboard'
                  ? pathname === '/dashboard' || pathname === '/'
                  : pathname.startsWith(href);

              return (
                <li key={href}>
                  <Link
                    href={href}
                    className={clsx(
                      'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-brand-500/20 text-brand-400'
                        : 'text-gray-400 hover:bg-gray-800 hover:text-gray-100',
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="flex-1">{label}</span>
                    {isActive && <ChevronRight className="h-3 w-3 opacity-60" />}
                  </Link>
                </li>
              );
            })}
          </ul>

          {/* Recently viewed */}
          {recents.length > 0 && (
            <div className="mt-4">
              <p className="px-3 mb-1 text-xs font-medium uppercase tracking-wider text-gray-600 flex items-center gap-1.5">
                <Clock className="h-3 w-3" /> Recent
              </p>
              <ul className="space-y-0.5">
                {recents.map((r) => (
                  <li key={`${r.type}-${r.id}`}>
                    <Link
                      href={`/${r.type}s/${r.id}`}
                      className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-800 hover:text-gray-300 transition"
                    >
                      <span className="capitalize text-gray-600">{r.type[0]}</span>
                      <span className="truncate">{r.name}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </nav>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-800 flex items-center justify-between">
          <p className="text-xs text-gray-600">
            {process.env.NEXT_PUBLIC_API_URL ?? 'localhost:3000'}
          </p>
          <button
            onClick={() => setShowShortcuts(true)}
            className="text-gray-600 hover:text-gray-400 transition"
            title="Keyboard shortcuts (?)"
          >
            <Keyboard className="h-3.5 w-3.5" />
          </button>
        </div>
      </aside>
    </>
  );
}
