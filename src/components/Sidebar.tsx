import React from 'react';
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

  const handleSignOut = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const navItems = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/projects', label: 'Projects', icon: FolderKanban },
    { to: '/tickets', label: 'All Tickets', icon: CheckSquare },
    { to: '/files', label: 'Files', icon: Paperclip },
    { to: '/reports', label: 'Reports', icon: FileSpreadsheet },
    { to: '/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside
      className={`h-screen bg-white border-r border-slate-200/80 flex flex-col justify-between transition-all duration-200 select-none z-30 ${
        isCollapsed ? 'w-18' : 'w-64'
      }`}
    >
      <div>
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-100">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-xs">
              K
            </div>
            {!isCollapsed && (
              <div className="truncate">
                <span className="font-bold text-sm text-slate-900 tracking-tight block">Kanso</span>
                <span className="text-[10px] text-slate-400 font-medium block -mt-1 tracking-wider uppercase">
                  Personal Space
                </span>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={onToggleCollapse}
            className="hidden md:flex p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Quick Action */}
        <div className="p-3">
          <button
            type="button"
            onClick={onOpenNewProject}
            className={`w-full flex items-center justify-center gap-2 rounded-lg py-2 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer ${
              isCollapsed ? 'px-0' : 'px-3'
            }`}
            title="Create Project"
          >
            <Plus className="w-4 h-4 text-slate-600 shrink-0" />
            {!isCollapsed && <span>New Project</span>}
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="px-3 space-y-1 mt-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onCloseMobileDrawer}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  } ${isCollapsed ? 'justify-center px-0' : ''}`
                }
                title={isCollapsed ? item.label : undefined}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {!isCollapsed && <span className="truncate">{item.label}</span>}
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Footer Info / User Auth */}
      <div className="p-3 border-t border-slate-100">
        {user ? (
          <div
            className={`flex items-center justify-between gap-2 p-2 rounded-xl bg-slate-50 border border-slate-200/60 text-slate-600 text-xs ${
              isCollapsed ? 'justify-center p-1.5' : ''
            }`}
          >
            <div className="flex items-center gap-2 truncate">
              {user.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt={user.name || 'User'}
                  className="w-7 h-7 rounded-full shrink-0 border border-slate-200 object-cover"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                  {(user.name || user.email || 'U')[0].toUpperCase()}
                </div>
              )}
              {!isCollapsed && (
                <div className="truncate leading-tight">
                  <span className="font-semibold text-slate-800 block text-xs truncate">
                    {user.name}
                  </span>
                  <span className="text-[10px] text-slate-400 block truncate">{user.email}</span>
                </div>
              )}
            </div>

            {!isCollapsed && (
              <button
                type="button"
                onClick={handleSignOut}
                title="Sign out of workspace"
                className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-200/60 transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => navigate('/login')}
            className={`w-full flex items-center gap-2 py-2 px-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium transition-colors shadow-2xs cursor-pointer ${
              isCollapsed ? 'justify-center px-0' : ''
            }`}
            title="Sign in"
          >
            <LogIn className="w-3.5 h-3.5 shrink-0" />
            {!isCollapsed && <span className="truncate">Sign In</span>}
          </button>
        )}
      </div>
    </aside>
  );
};
