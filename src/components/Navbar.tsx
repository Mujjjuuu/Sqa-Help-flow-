import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Menu, Clock, Crown, ShieldCheck, Briefcase } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { localDB, INITIAL_TEAM_USERS } from '../services/localStore';
import { User } from '../types';

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
  const { user } = useAuth();
  const navigate = useNavigate();
  const allUsers = localDB.getUsers();

  const handleSwitchUser = (targetUserId: string) => {
    const selected = allUsers.find((u) => u.id === targetUserId);
    if (selected) {
      localDB.setCurrentUser(selected);
      window.location.reload();
    }
  };

  const getRoleIcon = (role?: string) => {
    if (role === 'super_admin') return <Crown className="w-3 h-3 text-purple-600" />;
    if (role === 'admin') return <ShieldCheck className="w-3 h-3 text-indigo-600" />;
    return <Briefcase className="w-3 h-3 text-slate-500" />;
  };

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

      {/* Right: Attendance Quick Link & Persona Switcher */}
      <div className="flex items-center gap-2.5 shrink-0">
        <Link
          to="/attendance"
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold border border-indigo-200/70 transition-colors"
          title="Open Attendance System"
        >
          <Clock className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Attendance</span>
        </Link>

        {/* Persona Role Switcher */}
        {user && (
          <div className="hidden lg:flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1">
            <span className="text-[10px] text-slate-400 font-semibold uppercase mr-1">Role:</span>
            <select
              value={user.id}
              onChange={(e) => handleSwitchUser(e.target.value)}
              className="text-xs font-semibold text-slate-800 bg-transparent border-0 focus:outline-none cursor-pointer"
              title="Switch user role for testing"
            >
              {allUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.role === 'super_admin' ? 'Super Admin' : u.role === 'admin' ? 'Admin' : 'Employee'})
                </option>
              ))}
            </select>
          </div>
        )}

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
