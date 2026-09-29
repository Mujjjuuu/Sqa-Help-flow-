import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';
import { TicketForm } from '../features/tickets/TicketForm';
import { ProjectForm } from '../features/projects/ProjectForm';
import { projectService } from '../features/projects/projectService';
import { ticketService } from '../features/tickets/ticketService';
import { statusService } from '../services/statusService';
import { categoryService } from '../services/categoryService';
import { Project, Status, Category } from '../types';

export const Layout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');

  // Global modals
  const [isGlobalTicketModalOpen, setIsGlobalTicketModalOpen] = useState(false);
  const [isGlobalProjectModalOpen, setIsGlobalProjectModalOpen] = useState(false);

  const [projects, setProjects] = useState<Project[]>([]);
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  const loadGlobalContext = async () => {
    try {
      const projs = await projectService.getProjects();
      setProjects(projs);
      if (projs[0]) {
        const [stList, catList] = await Promise.all([
          statusService.getStatuses(projs[0].id),
          categoryService.getCategories(projs[0].id),
        ]);
        setStatuses(stList);
        setCategories(catList);
      }
    } catch (e) {
      console.error('Failed to load global context:', e);
    }
  };

  React.useEffect(() => {
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
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans text-slate-900">
      {/* Desktop & Tablet Sidebar */}
      <div className="hidden md:flex shrink-0">
        <Sidebar
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          onOpenNewProject={() => setIsGlobalProjectModalOpen(true)}
        />
      </div>

      {/* Mobile Drawer Backdrop & Sidebar */}
      {isMobileDrawerOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs"
            onClick={() => setIsMobileDrawerOpen(false)}
          />
          <div className="relative z-10 w-64 h-full bg-white shadow-xl">
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
    </div>
  );
};
