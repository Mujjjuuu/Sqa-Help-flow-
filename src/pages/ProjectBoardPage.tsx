import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  Filter,
  X,
  FileSpreadsheet,
  BarChart2,
  Columns,
  FolderKanban,
  Download,
  AlertCircle,
} from 'lucide-react';
import { Button } from '../components/Button';
import { BoardSkeleton } from '../components/Skeleton';
import { EmptyState } from '../components/EmptyState';
import { TicketBoard } from '../features/tickets/TicketBoard';
import { TicketForm } from '../features/tickets/TicketForm';
import { TicketDetails } from '../features/tickets/TicketDetails';
import { ProjectOverview } from '../features/projects/ProjectOverview';
import { ReportPreview } from '../features/reports/ReportPreview';
import { projectService } from '../features/projects/projectService';
import { ticketService } from '../features/tickets/ticketService';
import { statusService } from '../services/statusService';
import { categoryService } from '../services/categoryService';
import { reportService } from '../features/reports/reportService';
import {
  Project,
  Ticket,
  Status,
  Category,
  ProjectStats,
  ProjectReportData,
} from '../types';

export const ProjectBoardPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();

  const [allProjects, setAllProjects] = useState<Project[]>([]);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [stats, setStats] = useState<ProjectStats | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'board' | 'overview'>('board');

  // Filters
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedPriority, setSelectedPriority] = useState('');

  // Modals
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [selectedTicketForDetails, setSelectedTicketForDetails] = useState<Ticket | null>(null);
  const [editingTicket, setEditingTicket] = useState<Ticket | null>(null);
  const [targetColumnForNewTicket, setTargetColumnForNewTicket] = useState<string | undefined>();
  const [reportData, setReportData] = useState<ProjectReportData | null>(null);

  const loadData = async (targetProjId?: string) => {
    setIsLoading(true);
    try {
      const projects = await projectService.getProjects();
      setAllProjects(projects);

      const activeId = targetProjId || projectId || projects[0]?.id;
      if (!activeId) {
        setIsLoading(false);
        return;
      }

      const proj = await projectService.getProjectById(activeId);
      setCurrentProject(proj);

      if (proj) {
        const [stList, catList, tktList, projStats] = await Promise.all([
          statusService.getStatuses(proj.id),
          categoryService.getCategories(proj.id),
          ticketService.getTickets(proj.id),
          projectService.getProjectStats(proj.id),
        ]);

        setStatuses(stList);
        setCategories(catList);
        setTickets(tktList);
        setStats(projStats);
      }
    } catch (e) {
      console.error('Failed to load project board data:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData(projectId);
  }, [projectId]);

  // Filtered tickets
  const filteredTickets = tickets.filter((t) => {
    const matchesSearch =
      !search ||
      t.ticket_number.toLowerCase().includes(search.toLowerCase()) ||
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      (t.description && t.description.toLowerCase().includes(search.toLowerCase())) ||
      (t.notes && t.notes.toLowerCase().includes(search.toLowerCase()));

    const matchesCat = !selectedCategory || t.category_id === selectedCategory;
    const matchesPriority = !selectedPriority || t.priority === selectedPriority;

    return matchesSearch && matchesCat && matchesPriority;
  });

  const hasActiveFilters = Boolean(search || selectedCategory || selectedPriority);

  const clearFilters = () => {
    setSearch('');
    setSelectedCategory('');
    setSelectedPriority('');
  };

  // Drag-and-drop ticket movement
  const handleMoveTicket = async (ticketId: string, newStatusId: string) => {
    // Optimistic update
    setTickets((prev) =>
      prev.map((t) => (t.id === ticketId ? { ...t, status_id: newStatusId } : t))
    );

    try {
      await ticketService.moveTicketStatus(ticketId, newStatusId);
      if (currentProject) {
        const updatedStats = await projectService.getProjectStats(currentProject.id);
        setStats(updatedStats);
      }
    } catch (err) {
      console.error('Failed to move ticket:', err);
      // Revert if error
      if (currentProject) {
        const refreshed = await ticketService.getTickets(currentProject.id);
        setTickets(refreshed);
      }
    }
  };

  const handleOpenAddTicket = (statusId?: string) => {
    setEditingTicket(null);
    setTargetColumnForNewTicket(statusId);
    setIsTicketModalOpen(true);
  };

  const handleSaveTicket = async (formData: any) => {
    if (editingTicket) {
      const updated = await ticketService.updateTicket(editingTicket.id, formData);
      setEditingTicket(null);
      if (selectedTicketForDetails?.id === updated.id) {
        setSelectedTicketForDetails(updated);
      }
    } else {
      await ticketService.createTicket({
        ...formData,
        project_id: currentProject?.id || formData.project_id,
        status_id: targetColumnForNewTicket || formData.status_id,
      });
    }

    if (currentProject) {
      const [refreshed, updatedStats] = await Promise.all([
        ticketService.getTickets(currentProject.id),
        projectService.getProjectStats(currentProject.id),
      ]);
      setTickets(refreshed);
      setStats(updatedStats);
    }
  };

  const handleDeleteTicket = async (ticketId: string) => {
    await ticketService.deleteTicket(ticketId);
    if (currentProject) {
      const [refreshed, updatedStats] = await Promise.all([
        ticketService.getTickets(currentProject.id),
        projectService.getProjectStats(currentProject.id),
      ]);
      setTickets(refreshed);
      setStats(updatedStats);
    }
    if (selectedTicketForDetails?.id === ticketId) {
      setSelectedTicketForDetails(null);
    }
  };

  const handleRefreshSingleTicket = async (ticketId: string) => {
    const refreshed = await ticketService.getTicketById(ticketId);
    if (refreshed) {
      setSelectedTicketForDetails(refreshed);
      setTickets((prev) => prev.map((t) => (t.id === ticketId ? refreshed : t)));
    }
  };

  const handleOpenReport = async () => {
    if (!currentProject) return;
    try {
      const rep = await reportService.generateProjectReport(currentProject.id);
      setReportData(rep);
    } catch (e) {
      console.error('Failed to generate report:', e);
    }
  };

  if (!isLoading && allProjects.length === 0) {
    return (
      <EmptyState
        icon={<FolderKanban className="w-8 h-8 text-slate-400" />}
        title="No Projects Available"
        description="Please create a project first to access the Kanban board."
        actionLabel="Go to Projects"
        onAction={() => navigate('/projects')}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Board Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200">
        <div className="flex items-center gap-3">
          {/* Project Switcher */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium hidden sm:inline">Project:</span>
            <select
              value={currentProject?.id || ''}
              onChange={(e) => navigate(`/projects/${e.target.value}`)}
              className="font-bold text-sm sm:text-base text-slate-900 bg-transparent border-0 focus:outline-none focus:ring-0 cursor-pointer pr-6 py-0.5"
            >
              {allProjects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {stats && (
            <div className="hidden md:flex items-center gap-2 pl-3 border-l border-slate-200 text-xs">
              <span className="text-slate-500">
                <strong className="text-slate-900 font-semibold">{stats.totalTickets}</strong> Tickets
              </span>
              <span className="text-purple-600 font-medium">
                • {stats.uploadedTickets} Uploaded ({stats.completionPercentage}%)
              </span>
            </div>
          )}
        </div>

        {/* View Switcher & Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Tab Switcher (Board vs Overview) */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
            <button
              type="button"
              onClick={() => setActiveTab('board')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                activeTab === 'board'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Columns className="w-3.5 h-3.5" />
              <span>Board</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('overview')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                activeTab === 'overview'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BarChart2 className="w-3.5 h-3.5" />
              <span>Overview</span>
            </button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleOpenReport}
            leftIcon={<Download className="w-3.5 h-3.5" />}
            className="text-xs"
          >
            Report
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => handleOpenAddTicket()}
            leftIcon={<Plus className="w-3.5 h-3.5" />}
            className="text-xs"
          >
            Add Ticket
          </Button>
        </div>
      </div>

      {/* Filter Toolbar (Board Mode) */}
      {activeTab === 'board' && (
        <div className="flex items-center justify-between gap-3 flex-wrap bg-white p-2.5 rounded-xl border border-slate-200/80">
          <div className="flex items-center gap-2 flex-1 max-w-sm">
            <div className="relative w-full">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filter by ID, title, notes..."
                className="w-full text-xs pl-8 pr-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Category Filter */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-900 cursor-pointer"
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            {/* Priority Filter */}
            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-900 cursor-pointer"
            >
              <option value="">All Priorities</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>

            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="text-xs px-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
              >
                <X className="w-3 h-3 mr-1" />
                Clear
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Main Content Area */}
      {isLoading ? (
        <BoardSkeleton />
      ) : activeTab === 'board' ? (
        <TicketBoard
          statuses={statuses}
          tickets={filteredTickets}
          onMoveTicket={handleMoveTicket}
          onAddTicket={handleOpenAddTicket}
          onSelectTicket={(ticket) => setSelectedTicketForDetails(ticket)}
        />
      ) : currentProject && stats ? (
        <ProjectOverview
          project={currentProject}
          stats={stats}
          recentTickets={tickets}
          onSelectTicket={(ticket) => setSelectedTicketForDetails(ticket)}
          onOpenReport={handleOpenReport}
        />
      ) : null}

      {/* Ticket Create / Edit Modal */}
      <TicketForm
        isOpen={isTicketModalOpen}
        onClose={() => {
          setIsTicketModalOpen(false);
          setEditingTicket(null);
          setTargetColumnForNewTicket(undefined);
        }}
        onSubmit={handleSaveTicket}
        projects={allProjects}
        statuses={statuses}
        categories={categories}
        initialData={editingTicket}
        defaultProjectId={currentProject?.id}
        defaultStatusId={targetColumnForNewTicket}
        onCategoryAdded={(newCat) => setCategories((prev) => [...prev, newCat])}
      />

      {/* Ticket Full Details Drawer / Modal */}
      <TicketDetails
        isOpen={Boolean(selectedTicketForDetails)}
        ticket={selectedTicketForDetails}
        statuses={statuses}
        categories={categories}
        onClose={() => setSelectedTicketForDetails(null)}
        onEdit={(ticket) => {
          setSelectedTicketForDetails(null);
          setEditingTicket(ticket);
          setIsTicketModalOpen(true);
        }}
        onDelete={handleDeleteTicket}
        onStatusChange={handleMoveTicket}
        onRefreshTicket={handleRefreshSingleTicket}
      />

      {/* Report Preview Modal */}
      <ReportPreview
        isOpen={Boolean(reportData)}
        onClose={() => setReportData(null)}
        reportData={reportData}
      />
    </div>
  );
};
