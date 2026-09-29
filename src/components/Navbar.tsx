import React from 'react';
import { Link } from 'react-router-dom';
import { Search, Menu, Database, User as UserIcon } from 'lucide-react';
import { isSupabaseConfigured } from '../services/supabaseClient';
import { useAuth } from '../context/AuthContext';

export interface NavbarProps {
  onOpenMobileDrawer: () => void;
  searchValue: string;
  onSearchChange: (value: string) => void;
  title?: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenMobileDrawer,
  searchValue,
  onSearchChange,
  title,
}) => {
  const isConnected = isSupabaseConfigured();
  const { user } = useAuth();

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

      {/* Right: Storage indicator & User Profile link */}
      <div className="flex items-center gap-2.5 shrink-0">
        <Link
          to="/settings"
          title={isConnected ? 'Connected to Supabase - Click to view status & SQL' : 'Using Persistent Local-first Storage - Click to configure'}
          className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors hover:shadow-xs cursor-pointer ${
            isConnected
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
              : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
          }`}
        >
          <Database className="w-3 h-3" />
          <span>{isConnected ? 'Supabase Target Active' : 'Local Persistent'}</span>
        </Link>

        {user && (
          <Link
            to="/settings"
            title={`Logged in as ${user.name} (${user.email})`}
            className="flex items-center gap-2 p-1 pl-1.5 pr-2 rounded-full border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all text-xs"
          >
            {user.avatar_url ? (
              <img
                src={user.avatar_url}
                alt={user.name}
                className="w-6 h-6 rounded-full object-cover border border-slate-200"
              />
            ) : (
              <div className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-[11px]">
                {(user.name || user.email || 'U')[0].toUpperCase()}
              </div>
            )}
            <span className="font-semibold text-slate-700 hidden md:inline text-xs">
              {user.name.split(' ')[0]}
            </span>
          </Link>
        )}
      </div>
    </header>
  );
};
