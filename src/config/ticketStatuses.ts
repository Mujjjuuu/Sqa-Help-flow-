export interface DefaultStatusConfig {
  name: string;
  position: number;
  is_final: boolean;
  color: string;
  badgeBg: string;
  badgeText: string;
}

/**
 * 5-Stage KRUM Workflow:
 * 1. Just Return (جسٹ ریٹرن)
 * 2. To Do (ٹو ڈو)
 * 3. Under Review (انڈر ریویو)
 * 4. Verified by QA (ویریفائیڈ بائے کیو اے)
 * 5. Done (ڈن - Final)
 */
export const DEFAULT_TICKET_STATUSES: DefaultStatusConfig[] = [
  {
    name: 'Just Return',
    position: 0,
    is_final: false,
    color: '#f97316', // Orange / Amber-red for returned items
    badgeBg: 'bg-orange-50 dark:bg-orange-950/50',
    badgeText: 'text-orange-700 dark:text-orange-300',
  },
  {
    name: 'To Do',
    position: 1,
    is_final: false,
    color: '#3b82f6', // Blue for items queued to work on
    badgeBg: 'bg-blue-50 dark:bg-blue-950/50',
    badgeText: 'text-blue-700 dark:text-blue-300',
  },
  {
    name: 'Under Review',
    position: 2,
    is_final: false,
    color: '#d97706', // Amber for code review / staging inspection
    badgeBg: 'bg-amber-50 dark:bg-amber-950/50',
    badgeText: 'text-amber-700 dark:text-amber-300',
  },
  {
    name: 'Verified by QA',
    position: 3,
    is_final: false,
    color: '#7c3aed', // Purple for QA sign-off
    badgeBg: 'bg-purple-50 dark:bg-purple-950/50',
    badgeText: 'text-purple-700 dark:text-purple-300',
  },
  {
    name: 'Done',
    position: 4,
    is_final: true,
    color: '#10b981', // Emerald for completed delivery
    badgeBg: 'bg-emerald-50 dark:bg-emerald-950/50',
    badgeText: 'text-emerald-700 dark:text-emerald-300',
  },
];

export const STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  'Just Return': { bg: 'bg-orange-50 dark:bg-orange-950/40', text: 'text-orange-700 dark:text-orange-300', border: 'border-orange-200 dark:border-orange-800' },
  'To Do': { bg: 'bg-blue-50 dark:bg-blue-950/40', text: 'text-blue-700 dark:text-blue-300', border: 'border-blue-200 dark:border-blue-800' },
  'Under Review': { bg: 'bg-amber-50 dark:bg-amber-950/40', text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-200 dark:border-amber-800' },
  'Verified by QA': { bg: 'bg-purple-50 dark:bg-purple-950/40', text: 'text-purple-700 dark:text-purple-300', border: 'border-purple-200 dark:border-purple-800' },
  'Done': { bg: 'bg-emerald-50 dark:bg-emerald-950/40', text: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-200 dark:border-emerald-800' },
  // Backward compatibility fallbacks
  'Just Written': { bg: 'bg-orange-50 dark:bg-orange-950/40', text: 'text-orange-700 dark:text-orange-300', border: 'border-orange-200 dark:border-orange-800' },
  'Verified': { bg: 'bg-purple-50 dark:bg-purple-950/40', text: 'text-purple-700 dark:text-purple-300', border: 'border-purple-200 dark:border-purple-800' },
  'Uploaded': { bg: 'bg-emerald-50 dark:bg-emerald-950/40', text: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-200 dark:border-emerald-800' },
  'In Progress': { bg: 'bg-blue-50 dark:bg-blue-950/40', text: 'text-blue-700 dark:text-blue-300', border: 'border-blue-200 dark:border-blue-800' },
  'Changes Required': { bg: 'bg-orange-50 dark:bg-orange-950/40', text: 'text-orange-700 dark:text-orange-300', border: 'border-orange-200 dark:border-orange-800' },
  'Completed': { bg: 'bg-emerald-50 dark:bg-emerald-950/40', text: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-200 dark:border-emerald-800' },
};
