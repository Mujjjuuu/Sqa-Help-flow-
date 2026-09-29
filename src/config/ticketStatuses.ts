export interface DefaultStatusConfig {
  name: string;
  position: number;
  is_final: boolean;
  color: string;
  badgeBg: string;
  badgeText: string;
}

/**
 * Simplified 4-Stage Personal Workflow:
 * 1. Just Written
 * 2. Under Review
 * 3. Verified
 * 4. Uploaded (Final)
 */
export const DEFAULT_TICKET_STATUSES: DefaultStatusConfig[] = [
  {
    name: 'Just Written',
    position: 0,
    is_final: false,
    color: '#64748b', // Slate
    badgeBg: 'bg-slate-100',
    badgeText: 'text-slate-700',
  },
  {
    name: 'Under Review',
    position: 1,
    is_final: false,
    color: '#d97706', // Amber
    badgeBg: 'bg-amber-50',
    badgeText: 'text-amber-700',
  },
  {
    name: 'Verified',
    position: 2,
    is_final: false,
    color: '#0284c7', // Sky / Cyan
    badgeBg: 'bg-sky-50',
    badgeText: 'text-sky-700',
  },
  {
    name: 'Uploaded',
    position: 3,
    is_final: true,
    color: '#7c3aed', // Purple / Violet (Final delivery)
    badgeBg: 'bg-purple-50',
    badgeText: 'text-purple-700',
  },
];

export const STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  'Just Written': { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200' },
  'Under Review': { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  'Verified': { bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-200' },
  'Uploaded': { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  // Backward compatibility fallbacks
  'In Progress': { bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-200' },
  'Changes Required': { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
  'Completed': { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
};
