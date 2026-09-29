export const DEFAULT_TICKET_CATEGORIES = [
  'UI/UX',
  'Frontend',
  'Backend',
  'Database',
  'Content',
  'Testing',
  'MobileApp frontend',
  'Mobile app backend',
  'Other',
] as const;

export type DefaultTicketCategory = typeof DEFAULT_TICKET_CATEGORIES[number];

export const CATEGORY_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  'UI/UX': { bg: 'bg-pink-50', text: 'text-pink-700', dot: 'bg-pink-500' },
  'Frontend': { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
  'Backend': { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  'Database': { bg: 'bg-cyan-50', text: 'text-cyan-700', dot: 'bg-cyan-500' },
  'Content': { bg: 'bg-yellow-50', text: 'text-yellow-700', dot: 'bg-yellow-500' },
  'Testing': { bg: 'bg-violet-50', text: 'text-violet-700', dot: 'bg-violet-500' },
  'MobileApp frontend': { bg: 'bg-indigo-50', text: 'text-indigo-700', dot: 'bg-indigo-500' },
  'Mobile app backend': { bg: 'bg-teal-50', text: 'text-teal-700', dot: 'bg-teal-500' },
  'Other': { bg: 'bg-slate-100', text: 'text-slate-700', dot: 'bg-slate-500' },
};

export const PRIORITY_CONFIG = {
  low: { label: 'Low', bg: 'bg-slate-100', text: 'text-slate-600', dot: 'bg-slate-400' },
  medium: { label: 'Medium', bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
  high: { label: 'High', bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  urgent: { label: 'Urgent', bg: 'bg-rose-50', text: 'text-rose-700', dot: 'bg-rose-600' },
} as const;
