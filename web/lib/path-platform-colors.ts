/**
 * Shared colors for Recommended Path and Platform across leads list, detail, and dashboard.
 * Path = AI-recommended path (outreach, nurture, direct_call, ignore).
 * Platform = contact channel (linkedin, cold_email, instagram, etc.).
 */

export type RecommendedPath = 'outreach' | 'nurture' | 'direct_call' | 'ignore';

const PATH_COLORS: Record<RecommendedPath, { bg: string; text: string; bar: string }> = {
  outreach:    { bg: 'bg-violet-900/50',  text: 'text-violet-300', bar: 'bg-violet-500' },
  nurture:    { bg: 'bg-amber-900/50',    text: 'text-amber-300',  bar: 'bg-amber-500' },
  direct_call: { bg: 'bg-emerald-900/50', text: 'text-emerald-300', bar: 'bg-emerald-500' },
  ignore:     { bg: 'bg-gray-700/50',     text: 'text-gray-400',   bar: 'bg-gray-500' },
};

const PLATFORM_COLORS: Record<string, { bg: string; text: string; bar: string }> = {
  linkedin:   { bg: 'bg-blue-900/50',   text: 'text-blue-300',   bar: 'bg-blue-500' },
  cold_email: { bg: 'bg-slate-700/50',  text: 'text-slate-300',  bar: 'bg-slate-500' },
  instagram:  { bg: 'bg-pink-900/50',   text: 'text-pink-300',   bar: 'bg-pink-500' },
  tiktok:     { bg: 'bg-cyan-900/50',   text: 'text-cyan-300',   bar: 'bg-cyan-500' },
  twitter:    { bg: 'bg-sky-800/50',    text: 'text-sky-300',    bar: 'bg-sky-500' },
  x:          { bg: 'bg-sky-800/50',    text: 'text-sky-300',    bar: 'bg-sky-500' },
  phone:      { bg: 'bg-teal-900/50',   text: 'text-teal-300',   bar: 'bg-teal-500' },
  other:      { bg: 'bg-gray-700/50',   text: 'text-gray-400',   bar: 'bg-gray-500' },
};

const DEFAULT_PLATFORM = PLATFORM_COLORS.other;

function normalizePlatform(platform: string | null | undefined): string {
  if (!platform || typeof platform !== 'string') return 'other';
  const p = platform.toLowerCase().trim();
  if (p.includes('linkedin')) return 'linkedin';
  if (p.includes('email')) return 'cold_email';
  if (p.includes('instagram')) return 'instagram';
  if (p.includes('tiktok')) return 'tiktok';
  if (p.includes('twitter') || p === 'x') return 'twitter';
  if (p.includes('phone')) return 'phone';
  return 'other';
}

function normalizePath(path: string | null | undefined): RecommendedPath | null {
  if (!path || typeof path !== 'string') return null;
  const p = path.toLowerCase().trim().replace(/\s+/g, '_');
  if (['outreach', 'nurture', 'direct_call', 'ignore'].includes(p)) return p as RecommendedPath;
  return null;
}

/** Badge class for recommended path (e.g. in table or detail). */
export function getPathBadgeClass(path: string | null | undefined): string {
  const key = normalizePath(path);
  if (!key) return 'bg-gray-800 text-gray-400';
  const { bg, text } = PATH_COLORS[key];
  return `${bg} ${text}`;
}

/** Badge class for platform (e.g. in table or detail). */
export function getPlatformBadgeClass(platform: string | null | undefined): string {
  const key = normalizePlatform(platform);
  const { bg, text } = PLATFORM_COLORS[key] ?? DEFAULT_PLATFORM;
  return `${bg} ${text}`;
}

/** Bar color for dashboard HBarList (path or platform). */
export function getPathBarClass(path: string | null | undefined): string {
  const key = normalizePath(path);
  if (!key) return 'bg-gray-500';
  return PATH_COLORS[key].bar;
}

export function getPlatformBarClass(platform: string | null | undefined): string {
  const key = normalizePlatform(platform);
  return (PLATFORM_COLORS[key] ?? DEFAULT_PLATFORM).bar;
}

/** Path colors for detail page path selector (selected vs unselected). Returns full class strings so Tailwind can purge. */
const PATH_BUTTON_SELECTED: Record<RecommendedPath, string> = {
  outreach:    'rounded-full border px-2 py-0.5 text-xs transition bg-violet-900/50 border-violet-500/60 text-violet-300 ring-1 ring-inset ring-violet-500/30',
  nurture:     'rounded-full border px-2 py-0.5 text-xs transition bg-amber-900/50 border-amber-500/60 text-amber-300 ring-1 ring-inset ring-amber-500/30',
  direct_call: 'rounded-full border px-2 py-0.5 text-xs transition bg-emerald-900/50 border-emerald-500/60 text-emerald-300 ring-1 ring-inset ring-emerald-500/30',
  ignore:      'rounded-full border px-2 py-0.5 text-xs transition bg-gray-700/50 border-gray-500/60 text-gray-400 ring-1 ring-inset ring-gray-500/30',
};
const PATH_BUTTON_UNSELECTED = 'rounded-full border border-gray-700 px-2 py-0.5 text-xs text-gray-400 transition hover:border-gray-600 hover:text-gray-300';

export function getPathButtonClasses(path: string, isSelected: boolean): string {
  const key = normalizePath(path);
  if (!key) return PATH_BUTTON_UNSELECTED;
  return isSelected ? PATH_BUTTON_SELECTED[key] : PATH_BUTTON_UNSELECTED;
}

export { PATH_COLORS, PLATFORM_COLORS, normalizePath, normalizePlatform };
