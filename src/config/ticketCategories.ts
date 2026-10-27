export const DEFAULT_TICKET_CATEGORIES = [
  'Verified by Admin or Owner or Project Manager',
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
  'Verified by Admin or Owner or Project Manager': { bg: 'bg-emerald-50', text: 'text-emerald-800', dot: 'bg-emerald-600' },
  'Verified by Admin / Owner / Project Manager': { bg: 'bg-emerald-50', text: 'text-emerald-800', dot: 'bg-emerald-600' },
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
  low: { label: 'Low', bg: 'bg-slate-100', text: 'text-slate-700', dot: 'bg-slate-400', border: 'border-slate-300' },
  medium: { label: 'Medium', bg: 'bg-blue-100', text: 'text-blue-800', dot: 'bg-blue-500', border: 'border-blue-300' },
  high: { label: 'High', bg: 'bg-amber-100', text: 'text-amber-800', dot: 'bg-amber-500', border: 'border-amber-300' },
  critical: { label: 'Critical', bg: 'bg-rose-100', text: 'text-rose-800', dot: 'bg-rose-600', border: 'border-rose-300' },
  urgent: { label: 'Critical', bg: 'bg-rose-100', text: 'text-rose-800', dot: 'bg-rose-600', border: 'border-rose-300' },
} as const;
