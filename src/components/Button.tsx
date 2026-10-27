import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../utils/cn';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost' | 'ai' | 'indigo';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  className = '',
  disabled,
  ...props
}) => {
  const baseStyles =
    'inline-flex items-center justify-center font-medium transition-all duration-150 select-none cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98] shrink-0 whitespace-nowrap';

  const variants = {
    primary:
      'bg-indigo-600 dark:bg-indigo-600 text-white hover:bg-indigo-700 dark:hover:bg-indigo-500 active:bg-indigo-800 shadow-xs shadow-indigo-500/25 border border-indigo-600 dark:border-indigo-500 font-semibold',
    indigo:
      'bg-indigo-600 dark:bg-indigo-600 text-white hover:bg-indigo-700 dark:hover:bg-indigo-500 active:bg-indigo-800 shadow-xs shadow-indigo-500/25 border border-indigo-600 dark:border-indigo-500 font-semibold',
    secondary:
      'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 active:bg-slate-300 dark:active:bg-slate-600 border border-slate-200/80 dark:border-slate-700 font-medium',
    outline:
      'border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white hover:border-slate-300 dark:hover:border-slate-600 active:bg-slate-100 dark:active:bg-slate-700 shadow-2xs font-medium',
    ai:
      'bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/80 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100/90 dark:hover:bg-indigo-900/60 hover:border-indigo-300 dark:hover:border-indigo-700 active:bg-indigo-150 shadow-2xs font-semibold',
    danger:
      'bg-rose-600 text-white hover:bg-rose-700 active:bg-rose-800 shadow-xs shadow-rose-500/20 border border-rose-600 font-medium',
    ghost:
      'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 active:bg-slate-200/70 dark:active:bg-slate-700 border border-transparent font-medium',
  };

  const sizes = {
    sm: 'text-xs px-3 py-1.5 gap-1.5 h-8.5 rounded-lg',
    md: 'text-xs sm:text-sm px-3.5 py-2 gap-2 h-9.5 rounded-lg',
    lg: 'text-sm sm:text-base px-4.5 py-2.5 gap-2 h-10.5 rounded-xl',
  };

  return (
    <button
      className={cn(baseStyles, variants[variant], sizes[size], className)}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
      ) : (
        leftIcon && <span className="shrink-0 inline-flex items-center">{leftIcon}</span>
      )}
      {children && <span className="inline-flex items-center gap-1.5">{children}</span>}
      {!isLoading && rightIcon && <span className="shrink-0 inline-flex items-center">{rightIcon}</span>}
    </button>
  );
};
