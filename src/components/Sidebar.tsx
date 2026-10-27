import React, { useState, useRef, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  FolderKanban,
  CheckSquare,
  Paperclip,
  FileSpreadsheet,
  Settings,
  ChevronLeft,
  ChevronRight,
  Plus,
  LogOut,
  LogIn,
  Clock,
  StickyNote,
  PanelLeftClose,
  PanelLeftOpen,
  User,
  ShieldAlert,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export interface SidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onOpenNewProject: () => void;
  onCloseMobileDrawer?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isCollapsed,
  onToggleCollapse,
  onOpenNewProject,
  onCloseMobileDrawer,
}) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const handleSignOut = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  // Close collapsed user menu on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    if (isUserMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isUserMenuOpen]);

  const navItems = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/projects', label: 'Projects', icon: FolderKanban },
    { to: '/tickets', label: 'All Tickets', icon: CheckSquare },
    { to: '/notes', label: 'Notes', icon: StickyNote },
    { to: '/attendance', label: 'Attendance', icon: Clock },
    { to: '/files', label: 'Files', icon: Paperclip },
    { to: '/reports', label: 'Reports', icon: FileSpreadsheet },
    { to: '/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside
      className={`relative h-screen bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col justify-between transition-[width] duration-250 ease-in-out select-none z-30 shrink-0 shadow-xs dark:shadow-none ${
        isCollapsed ? 'w-[72px]' : 'w-64'
      }`}
    >
      {/* Edge Hover Expand/Collapse Handle (Desktop) */}
      <button
        type="button"
        onClick={onToggleCollapse}
        title={isCollapsed ? 'Expand sidebar (Press [ or Ctrl+B)' : 'Collapse sidebar (Press [ or Ctrl+B)'}
        className="hidden md:flex absolute -right-3 top-20 z-40 w-6 h-6 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 items-center justify-center text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:scale-110 shadow-sm transition-all cursor-pointer opacity-70 hover:opacity-100"
      >
        {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
      </button>

      <div className="flex flex-col flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-3.5 border-b border-slate-100 dark:border-slate-800/80 shrink-0">
          {!isCollapsed ? (
            <div className="flex items-center justify-between w-full">
              <NavLink
                to="/"
                onClick={onCloseMobileDrawer}
                className="flex items-center gap-2.5 overflow-hidden group cursor-pointer"
              >
                <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-sm group-hover:scale-105 transition-transform tracking-wider">
                  K
                </div>
                <div className="truncate text-left">
                  <div className="flex items-center gap-1.5">
                    <span className="font-extrabold text-sm text-slate-900 dark:text-slate-100 tracking-tight block">
                      KRUM
                    </span>
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800">
                      v2.4
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium block tracking-wider uppercase">
                    Precision Space
                  </span>
                </div>
              </NavLink>

              <button
                type="button"
                onClick={onToggleCollapse}
                className="hidden md:flex p-1.5 rounded-lg text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title="Collapse sidebar ([)"
              >
                <PanelLeftClose className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-center w-full">
              <button
                type="button"
                onClick={onToggleCollapse}
                className="relative group p-1 rounded-lg cursor-pointer"
                title="Expand sidebar ([)"
              >
                <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-sm group-hover:scale-105 transition-transform tracking-wider">
                  K
                </div>
                {/* Floating tooltip */}
                <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 z-50 pointer-events-none hidden group-hover:flex items-center px-2 py-1 rounded-md text-xs font-semibold bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-md whitespace-nowrap">
                  <span>Expand Sidebar ([)</span>
                  <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-slate-900 dark:border-r-slate-100" />
                </div>
              </button>
            </div>
          )}
        </div>

        {/* Quick Action: New Project */}
        <div className="p-3">
          {!isCollapsed ? (
            <button
              type="button"
              onClick={onOpenNewProject}
              className="w-full flex items-center justify-between gap-2 rounded-xl py-2 px-3 text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 hover:text-indigo-700 dark:hover:bg-indigo-950/40 dark:hover:text-indigo-300 text-slate-700 dark:text-slate-200 transition-all cursor-pointer border border-slate-200/80 dark:border-slate-700/80 group shadow-2xs"
              title="Create Project"
            >
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-md bg-white dark:bg-slate-700 flex items-center justify-center shadow-2xs group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                  <Plus className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300 group-hover:text-white" />
                </div>
                <span>New Project</span>
              </div>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">⌘N</span>
            </button>
          ) : (
            <div className="relative group flex justify-center">
              <button
                type="button"
                onClick={onOpenNewProject}
                className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-indigo-600 hover:text-white text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-center transition-all cursor-pointer shadow-2xs group-hover:shadow-sm"
                title="Create Project"
              >
                <Plus className="w-4 h-4" />
              </button>
              {/* Floating tooltip */}
              <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 z-50 pointer-events-none hidden group-hover:flex items-center px-2 py-1 rounded-md text-xs font-semibold bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-md whitespace-nowrap">
                <span>New Project (⌘N)</span>
                <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-slate-900 dark:border-r-slate-100" />
              </div>
            </div>
          )}
        </div>

        {/* Navigation Items */}
        <nav className="px-2.5 space-y-1 flex-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.to} className="relative group">
                <NavLink
                  to={item.to}
                  onClick={onCloseMobileDrawer}
                  className={({ isActive }) =>
                    `flex items-center rounded-xl text-xs font-medium transition-all ${
                      isCollapsed
                        ? 'justify-center w-10 h-10 mx-auto'
                        : 'gap-3 px-3 py-2.5 w-full'
                    } ${
                      isActive
                        ? 'bg-indigo-600 text-white shadow-sm font-semibold'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/80'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-500 dark:text-slate-400 group-hover:text-slate-800 dark:group-hover:text-slate-200'}`} />
                      {!isCollapsed && <span className="truncate">{item.label}</span>}
                    </>
                  )}
                </NavLink>

                {/* Collapsed Tooltip */}
                {isCollapsed && (
                  <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 z-50 pointer-events-none hidden group-hover:flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-md whitespace-nowrap">
                    {item.label}
                    <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-slate-900 dark:border-r-slate-100" />
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </div>

      {/* Footer Info / User Auth */}
      <div className="p-3 border-t border-slate-100 dark:border-slate-800/80 shrink-0">
        {user ? (
          <div className="relative" ref={userMenuRef}>
            {!isCollapsed ? (
              <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200/60 dark:border-slate-700/80 text-slate-600 dark:text-slate-300 text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  {user.avatar_url ? (
                    <img
                      src={user.avatar_url}
                      alt={user.name || 'User'}
                      className="w-7 h-7 rounded-full shrink-0 border border-slate-200 dark:border-slate-700 object-cover"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                      {(user.name || user.email || 'U')[0].toUpperCase()}
                    </div>
                  )}
                  <div className="truncate leading-tight">
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="font-semibold text-slate-800 dark:text-slate-200 text-xs truncate">
                        {user.name}
                      </span>
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full border ${
                          user.role === 'super_admin'
                            ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800'
                            : user.role === 'admin'
                            ? 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800'
                            : 'bg-slate-200/80 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-600'
                        }`}
                      >
                        {user.role === 'super_admin' ? 'Super Admin' : user.role === 'admin' ? 'Admin' : 'Employee'}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 block truncate">
                      {user.email}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleSignOut}
                  title="Sign out of KRUM"
                  className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer shrink-0"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="relative group flex justify-center">
                <button
                  type="button"
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center cursor-pointer hover:ring-2 hover:ring-indigo-500/40 transition-all shadow-2xs"
                  title={`${user.name} - Click for user menu`}
                >
                  {user.avatar_url ? (
                    <img
                      src={user.avatar_url}
                      alt={user.name}
                      className="w-7 h-7 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs">
                      {(user.name || user.email || 'U')[0].toUpperCase()}
                    </div>
                  )}
                </button>

                {/* Collapsed Popover Menu */}
                {isUserMenuOpen && (
                  <div className="absolute left-full ml-3 bottom-0 w-52 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-50 py-2 px-1 text-xs divide-y divide-slate-100 dark:divide-slate-800 animate-in fade-in zoom-in-95 duration-150">
                    <div className="px-3 py-1.5">
                      <p className="font-semibold text-slate-800 dark:text-slate-200 truncate">{user.name}</p>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate">{user.email}</p>
                      <div className="mt-1">
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                          {user.role}
                        </span>
                      </div>
                    </div>
                    <div className="py-1">
                      <button
                        type="button"
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          navigate('/settings');
                        }}
                        className="w-full text-left px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-lg flex items-center gap-2 cursor-pointer"
                      >
                        <Settings className="w-3.5 h-3.5" />
                        <span>Settings</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          handleSignOut();
                        }}
                        className="w-full text-left px-3 py-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-lg flex items-center gap-2 cursor-pointer"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Sign out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => navigate('/login')}
            className={`w-full flex items-center gap-2 py-2 px-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-all shadow-xs cursor-pointer ${
              isCollapsed ? 'justify-center px-0 w-10 h-10 mx-auto' : ''
            }`}
            title="Sign in"
          >
            <LogIn className="w-4 h-4 shrink-0" />
            {!isCollapsed && <span className="truncate">Sign In</span>}
          </button>
        )}
      </div>
    </aside>
  );
};
