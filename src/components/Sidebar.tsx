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
} from 'lucide-react';

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

      {/* Footer Info */}
      <div className="p-3 border-t border-slate-100">
        <div
          className={`flex items-center gap-2.5 px-2 py-2 rounded-lg bg-slate-50 text-slate-600 text-xs ${
            isCollapsed ? 'justify-center px-0' : ''
          }`}
        >
          <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-semibold text-[11px] shrink-0">
            B
          </div>
          {!isCollapsed && (
            <div className="truncate leading-tight">
              <span className="font-medium text-slate-800 block text-xs truncate">Bob Official</span>
              <span className="text-[10px] text-slate-400 block truncate">Solo Workspace</span>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};
