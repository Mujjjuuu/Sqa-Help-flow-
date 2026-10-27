import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search,
  Menu,
  Clock,
  Sun,
  Moon,
  MousePointer2,
  PanelLeft,
  PanelLeftClose,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { localDB } from '../services/localStore';

export interface NavbarProps {
  onOpenMobileDrawer: () => void;
  isSidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
  searchValue: string;
  onSearchChange: (value: string) => void;
  title?: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenMobileDrawer,
  isSidebarCollapsed = false,
  onToggleSidebar,
  searchValue,
  onSearchChange,
  title,
}) => {
  const { user } = useAuth();
  const { theme, effectiveTheme, toggleTheme, customCursor, setCustomCursor } = useTheme();
  const navigate = useNavigate();
  const allUsers = localDB.getUsers();

  const handleSwitchUser = (targetUserId: string) => {
    const selected = allUsers.find((u) => u.id === targetUserId);
    if (selected) {
      localDB.setCurrentUser(selected);
      window.location.reload();
    }
  };

  const isDark = effectiveTheme === 'dark';

  return (
    <header className="h-16 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/90 dark:border-slate-800 px-3 sm:px-6 flex items-center justify-between gap-3 sticky top-0 z-20 transition-colors shadow-2xs dark:shadow-none">
      {/* Left: Sidebar Toggle, Mobile trigger & Breadcrumbs */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Mobile Hamburger Drawer Trigger */}
        <button
          type="button"
          onClick={onOpenMobileDrawer}
          className="p-2 -ml-1 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 md:hidden rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          title="Open Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Desktop Sidebar Toggle Button */}
        {onToggleSidebar && (
          <button
            type="button"
            onClick={onToggleSidebar}
            className="hidden md:flex p-2 text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title={isSidebarCollapsed ? 'Expand sidebar ([)' : 'Collapse sidebar ([)'}
          >
            {isSidebarCollapsed ? (
              <PanelLeft className="w-4 h-4" />
            ) : (
              <PanelLeftClose className="w-4 h-4" />
            )}
          </button>
        )}

        {title ? (
          <h1 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 tracking-tight truncate">
            {title}
          </h1>
        ) : (
          <div className="hidden sm:flex items-center gap-2">
            <span className="text-xs font-mono font-bold tracking-wider uppercase text-slate-500 dark:text-slate-400">
              KRUM
            </span>
            <span className="text-xs text-slate-300 dark:text-slate-600">/</span>
            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
              Workspace
            </span>
          </div>
        )}
      </div>

      {/* Middle: Universal Search */}
      <div className="flex-1 max-w-md mx-1 sm:mx-2">
        <div className="relative group">
          <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none group-focus-within:text-indigo-600 dark:group-focus-within:text-indigo-400 transition-colors" />
          <input
            type="text"
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search tickets, titles, notes..."
            className="w-full bg-slate-100/80 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 rounded-xl pl-9 pr-10 py-1.5 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-800 transition-all shadow-2xs"
          />
          <span className="hidden sm:inline-block absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono text-slate-400 dark:text-slate-500 bg-white dark:bg-slate-700 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-600 pointer-events-none">
            /
          </span>
        </div>
      </div>

      {/* Right Controls: Theme Toggle, Custom Arrow Toggle, Attendance Link & Profile */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {/* Custom Arrow Pointer Toggle */}
        <button
          type="button"
          onClick={() => setCustomCursor(!customCursor)}
          title={`Custom Arrow Pointer: ${customCursor ? 'Enabled (KRUM Bespoke Arrow)' : 'Disabled (Default OS Cursor)'}`}
          className={`p-2 rounded-xl border transition-all cursor-pointer flex items-center justify-center ${
            customCursor
              ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-300 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 shadow-2xs'
              : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/60'
          }`}
        >
          <MousePointer2 className="w-3.5 h-3.5" />
        </button>

        {/* Enhanced Theme Toggle (Dark / Light) with visual indicator */}
        <button
          type="button"
          onClick={toggleTheme}
          title={`Active theme: ${theme.toUpperCase()} (Click to switch to ${isDark ? 'Light' : 'Dark'} mode)`}
          className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 text-slate-700 dark:text-amber-300 hover:bg-slate-50 dark:hover:bg-slate-700/80 transition-all cursor-pointer shadow-2xs flex items-center gap-1.5"
        >
          {isDark ? (
            <Sun className="w-3.5 h-3.5 text-amber-400 transition-transform hover:rotate-45" />
          ) : (
            <Moon className="w-3.5 h-3.5 text-indigo-600 transition-transform hover:-rotate-12" />
          )}
          <span className="text-[11px] font-semibold hidden md:inline text-slate-600 dark:text-slate-300">
            {isDark ? 'Dark' : 'Light'}
          </span>
        </button>

        {/* Attendance Quick Link */}
        <Link
          to="/attendance"
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 text-xs font-semibold border border-indigo-200/80 dark:border-indigo-800/80 transition-colors shadow-2xs"
          title="Open Attendance Portal"
        >
          <Clock className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Attendance</span>
        </Link>

        {/* Persona Role Switcher */}
        {user && (
          <div className="hidden lg:flex items-center gap-1 bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1 shadow-2xs">
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold uppercase mr-1">
              Role:
            </span>
            <select
              value={user.id}
              onChange={(e) => handleSwitchUser(e.target.value)}
              className="text-xs font-bold text-slate-800 dark:text-slate-200 bg-transparent border-0 focus:outline-none cursor-pointer"
              title="Switch user role for testing attendance & permissions"
            >
              {allUsers.map((u) => (
                <option key={u.id} value={u.id} className="dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                  {u.name} ({u.role === 'super_admin' ? 'Super Admin' : u.role === 'admin' ? 'Admin' : 'Employee'})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Profile Avatar */}
        {user && (
          <Link
            to="/settings"
            title={`Logged in as ${user.name} (${user.email})`}
            className="flex items-center gap-1.5 p-1 rounded-full border border-slate-200 dark:border-slate-700 hover:border-indigo-500/50 dark:hover:border-indigo-500/50 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
          >
            {user.avatar_url ? (
              <img
                src={user.avatar_url}
                alt={user.name}
                className="w-7 h-7 rounded-full object-cover border border-slate-200 dark:border-slate-700"
              />
            ) : (
              <div className="w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-2xs">
                {(user.name || user.email || 'U')[0].toUpperCase()}
              </div>
            )}
          </Link>
        )}
      </div>
    </header>
  );
};
