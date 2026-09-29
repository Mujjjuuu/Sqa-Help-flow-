import React from 'react';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'slate' | 'blue' | 'green' | 'amber' | 'rose' | 'purple' | 'cyan';
  dot?: boolean;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  dot = false,
  className = '',
}) => {
  const variants = {
    default: 'bg-slate-100 text-slate-700 border-slate-200',
    slate: 'bg-slate-100 text-slate-700 border-slate-200',
    blue: 'bg-sky-50 text-sky-700 border-sky-200',
    green: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    amber: 'bg-amber-50 text-amber-800 border-amber-200',
    rose: 'bg-rose-50 text-rose-700 border-rose-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
    cyan: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  };

  const dotColors = {
    default: 'bg-slate-400',
    slate: 'bg-slate-500',
    blue: 'bg-sky-500',
    green: 'bg-emerald-500',
    amber: 'bg-amber-500',
    rose: 'bg-rose-500',
    purple: 'bg-purple-500',
    cyan: 'bg-cyan-500',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium border ${variants[variant]} ${className}`}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColors[variant]}`} />}
      {children}
    </span>
  );
};
