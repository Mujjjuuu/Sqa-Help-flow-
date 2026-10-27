import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';
import { TicketForm } from '../features/tickets/TicketForm';
import { ProjectForm } from '../features/projects/ProjectForm';
import { GeminiChatBot } from './GeminiChatBot';
import { projectService } from '../features/projects/projectService';
import { ticketService } from '../features/tickets/ticketService';
import { statusService } from '../services/statusService';
import { categoryService } from '../services/categoryService';
import { Project, Status, Category } from '../types';

export const Layout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Persist collapsed sidebar state
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('krum_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');

  // Global modals
  const [isGlobalTicketModalOpen, setIsGlobalTicketModalOpen] = useState(false);
  const [isGlobalProjectModalOpen, setIsGlobalProjectModalOpen] = useState(false);

  const [projects, setProjects] = useState<Project[]>([]);
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  // Toggle handler that persists to localStorage
  const handleToggleSidebar = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('krum_sidebar_collapsed', String(next));
      } catch {}
      return next;
    });
  };

  // Global keyboard shortcuts: `[` or `Ctrl+B` / `Cmd+B` to toggle sidebar, `Cmd+N` for new project
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input or textarea
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }

      if ((e.key === 'b' && (e.ctrlKey || e.metaKey)) || e.key === '[') {
        e.preventDefault();
        handleToggleSidebar();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const loadGlobalContext = async () => {
    try {
      const projs = await projectService.getProjects();
      setProjects(projs);
      if (projs[0]) {
        const [stList, catList] = await Promise.all([
          statusService.getStatuses(projs[0].id),
          categoryService.getCategories(projs[0].id),
        ]);
        const seenStIds = new Set<string>();
        const uniqueSt = (stList || []).filter((s) => {
          if (!s || !s.id || seenStIds.has(s.id)) return false;
          seenStIds.add(s.id);
          return true;
        });

        const seenCatIds = new Set<string>();
        const uniqueCats = (catList || []).filter((c) => {
          if (!c || !c.id || seenCatIds.has(c.id)) return false;
          seenCatIds.add(c.id);
          return true;
        });

        setStatuses(uniqueSt);
        setCategories(uniqueCats);
      }
    } catch (e) {
      console.error('Failed to load global context:', e);
    }
  };

  useEffect(() => {
    loadGlobalContext();
  }, []);

  const handleGlobalSearchChange = (value: string) => {
    setGlobalSearch(value);
    // If not already on /tickets, route to /tickets with search query
    if (location.pathname !== '/tickets' && value.trim().length > 0) {
      navigate('/tickets');
    }
  };

  const handleCreateGlobalTicket = async (data: any) => {
    await ticketService.createTicket(data);
    await loadGlobalContext();
  };

  const handleCreateGlobalProject = async (data: any) => {
    const created = await projectService.createProject(data);
    await loadGlobalContext();
    navigate(`/projects/${created.id}`);
  };

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 overflow-hidden font-sans text-slate-900 dark:text-slate-100 transition-colors">
      {/* Desktop & Tablet Sidebar */}
      <div className="hidden md:flex shrink-0">
        <Sidebar
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={handleToggleSidebar}
          onOpenNewProject={() => setIsGlobalProjectModalOpen(true)}
        />
      </div>

      {/* Mobile Drawer Backdrop & Sidebar */}
      {isMobileDrawerOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm transition-opacity"
            onClick={() => setIsMobileDrawerOpen(false)}
          />
          <div className="relative z-10 w-64 h-full bg-white dark:bg-slate-900 shadow-2xl animate-in slide-in-from-left duration-250">
            <Sidebar
              isCollapsed={false}
              onToggleCollapse={() => {}}
              onOpenNewProject={() => {
                setIsMobileDrawerOpen(false);
                setIsGlobalProjectModalOpen(true);
              }}
              onCloseMobileDrawer={() => setIsMobileDrawerOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Main Content Viewport */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Navbar
          onOpenMobileDrawer={() => setIsMobileDrawerOpen(true)}
          isSidebarCollapsed={isSidebarCollapsed}
          onToggleSidebar={handleToggleSidebar}
          searchValue={globalSearch}
          onSearchChange={handleGlobalSearchChange}
        />

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Global Quick New Ticket Modal */}
      <TicketForm
        isOpen={isGlobalTicketModalOpen}
        onClose={() => setIsGlobalTicketModalOpen(false)}
        onSubmit={handleCreateGlobalTicket}
        projects={projects}
        statuses={statuses}
        categories={categories}
      />

      {/* Global Quick New Project Modal */}
      <ProjectForm
        isOpen={isGlobalProjectModalOpen}
        onClose={() => setIsGlobalProjectModalOpen(false)}
        onSubmit={handleCreateGlobalProject}
      />

      {/* Floating Gemini AI Assistant */}
      <GeminiChatBot />
    </div>
  );
};
