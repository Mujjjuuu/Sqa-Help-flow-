import React from 'react';
import { Link } from 'react-router-dom';
import { Search, Plus, Menu, Database } from 'lucide-react';
import { Button } from './Button';
import { isSupabaseConfigured } from '../services/supabaseClient';

export interface NavbarProps {
  onOpenMobileDrawer: () => void;
  onOpenNewTicket: () => void;
  searchValue: string;
  onSearchChange: (value: string) => void;
  title?: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenMobileDrawer,
  onOpenNewTicket,
  searchValue,
  onSearchChange,
  title,
}) => {
  const isConnected = isSupabaseConfigured();

  return (
    <header className="h-16 bg-white border-b border-slate-200/80 px-4 sm:px-6 flex items-center justify-between gap-4 sticky top-0 z-20">
      {/* Left: Mobile trigger & Page title */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenMobileDrawer}
          className="p-2 -ml-2 text-slate-500 hover:text-slate-800 md:hidden rounded-lg hover:bg-slate-100 cursor-pointer"
        >
          <Menu className="w-5 h-5" />
        </button>
        {title && <h1 className="text-base font-semibold text-slate-800 hidden sm:block">{title}</h1>}
      </div>

      {/* Middle: Universal Search */}
      <div className="flex-1 max-w-md mx-2">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search tickets, titles, notes (e.g. MB-101)..."
            className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-800 focus:bg-white transition-all"
          />
        </div>
      </div>

      {/* Right: Storage indicator & New Ticket button */}
      <div className="flex items-center gap-2.5 shrink-0">
        <Link
          to="/settings"
          title={isConnected ? 'Connected to Supabase - Click to view status & SQL' : 'Using Persistent Local-first Storage - Click to configure'}
          className={`hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors hover:shadow-xs cursor-pointer ${
            isConnected
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
              : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
          }`}
        >
          <Database className="w-3 h-3" />
          <span>{isConnected ? 'Supabase Target Active' : 'Local Persistent'}</span>
        </Link>

        <Button
          variant="primary"
          size="sm"
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={onOpenNewTicket}
        >
          <span className="hidden sm:inline">New Ticket</span>
          <span className="sm:hidden">New</span>
        </Button>
      </div>
    </header>
  );
};
