export interface DefaultStatusConfig {
  name: string;
  position: number;
  is_final: boolean;
  color: string;
  badgeBg: string;
  badgeText: string;
}

export const DEFAULT_TICKET_STATUSES: DefaultStatusConfig[] = [
  {
    name: 'Just Written',
    position: 0,
    is_final: false,
    color: '#64748b', // Slate
    badgeBg: 'bg-slate-100 dark:bg-slate-800',
    badgeText: 'text-slate-700 dark:text-slate-300',
  },
  {
    name: 'In Progress',
    position: 1,
    is_final: false,
    color: '#0284c7', // Sky
    badgeBg: 'bg-sky-50 dark:bg-sky-950',
    badgeText: 'text-sky-700 dark:text-sky-300',
  },
  {
    name: 'Under Review',
    position: 2,
    is_final: false,
    color: '#eab308', // Amber
    badgeBg: 'bg-amber-50 dark:bg-amber-950',
    badgeText: 'text-amber-700 dark:text-amber-300',
  },
  {
    name: 'Changes Required',
    position: 3,
    is_final: false,
    color: '#ea580c', // Orange
    badgeBg: 'bg-orange-50 dark:bg-orange-950',
    badgeText: 'text-orange-700 dark:text-orange-300',
  },
  {
    name: 'Completed',
    position: 4,
    is_final: false,
    color: '#16a34a', // Green
    badgeBg: 'bg-emerald-50 dark:bg-emerald-950',
    badgeText: 'text-emerald-700 dark:text-emerald-300',
  },
  {
    name: 'Uploaded',
    position: 5,
    is_final: true,
    color: '#8b5cf6', // Violet
    badgeBg: 'bg-purple-50 dark:bg-purple-950',
    badgeText: 'text-purple-700 dark:text-purple-300',
  },
];

export const STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  'Just Written': { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200' },
  'In Progress': { bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-200' },
  'Under Review': { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  'Changes Required': { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
  'Completed': { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  'Uploaded': { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
};
