import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  Filter,
  X,
  FileSpreadsheet,
  FileCode,
  FileText,
  BarChart2,
  Columns,
  FolderKanban,
  Download,
  AlertCircle,
  ChevronDown,
  Sparkles,
  Image as ImageIcon,
  StickyNote,
} from 'lucide-react';
import { Button } from '../components/Button';
import { BoardSkeleton } from '../components/Skeleton';
import { EmptyState } from '../components/EmptyState';
import { TicketBoard } from '../features/tickets/TicketBoard';
import { TicketForm } from '../features/tickets/TicketForm';
import { TicketDetails } from '../features/tickets/TicketDetails';
import { GenerateTicketFromImageModal } from '../features/tickets/GenerateTicketFromImageModal';
import { ProjectOverview } from '../features/projects/ProjectOverview';
import { ReportPreview } from '../features/reports/ReportPreview';
import { projectService } from '../features/projects/projectService';
import { ticketService } from '../features/tickets/ticketService';
import { TicketFormData } from '../features/tickets/ticketTypes';
import { statusService } from '../services/statusService';
import { categoryService } from '../services/categoryService';
import { reportService } from '../features/reports/reportService';
import { exportUtils } from '../features/reports/exportUtils';
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
  const [isImageToTicketModalOpen, setIsImageToTicketModalOpen] = useState(false);
  const [ticketDraftFromImage, setTicketDraftFromImage] = useState<TicketFormData | null>(null);
  const [ticketDraftFiles, setTicketDraftFiles] = useState<File[]>([]);
  const [selectedTicketForDetails, setSelectedTicketForDetails] = useState<Ticket | null>(null);
  const [editingTicket, setEditingTicket] = useState<Ticket | null>(null);
  const [targetColumnForNewTicket, setTargetColumnForNewTicket] = useState<string | undefined>();
  const [reportData, setReportData] = useState<ProjectReportData | null>(null);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);

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

        // Deduplicate statuses by id & position
        const seenStIds = new Set<string>();
        const seenStPos = new Set<number>();
        const uniqueStatuses = (stList || []).filter((s) => {
          if (!s || !s.id || seenStIds.has(s.id) || seenStPos.has(s.position)) return false;
          seenStIds.add(s.id);
          seenStPos.add(s.position);
          return true;
        });

        // Deduplicate categories by id
        const seenCatIds = new Set<string>();
        const uniqueCats = (catList || []).filter((c) => {
          if (!c || !c.id || seenCatIds.has(c.id)) return false;
          seenCatIds.add(c.id);
          return true;
        });

        setStatuses(uniqueStatuses);
        setCategories(uniqueCats);
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

  // Drag-and-drop & direct ticket status movement
  const handleMoveTicket = async (ticketId: string, newStatusId: string) => {
    const targetStatus = statuses.find((s) => s.id === newStatusId);
    const now = new Date().toISOString();

    // Immediate optimistic update with duplicate protection
    setTickets((prev) => {
      const targetTicket = prev.find((t) => t.id === ticketId);
      const targetKey = targetTicket?.project_id && targetTicket?.ticket_number
        ? `${targetTicket.project_id}::${targetTicket.ticket_number.trim().toLowerCase()}`
        : '';

      const seenIds = new Set<string>();
      const seenKeys = new Set<string>();

      return prev
        .map((t) => {
          const isTarget =
            t.id === ticketId ||
            (targetKey &&
              t.project_id &&
              t.ticket_number &&
              `${t.project_id}::${t.ticket_number.trim().toLowerCase()}` === targetKey);

          return isTarget
            ? {
                ...t,
                status_id: newStatusId,
                status: targetStatus || t.status,
                updated_at: now,
              }
            : t;
        })
        .filter((t) => {
          if (seenIds.has(t.id)) return false;
          seenIds.add(t.id);
          const key = t.project_id && t.ticket_number ? `${t.project_id}::${t.ticket_number.trim().toLowerCase()}` : t.id;
          if (seenKeys.has(key)) return false;
          seenKeys.add(key);
          return true;
        });
    });

    if (selectedTicketForDetails?.id === ticketId) {
      setSelectedTicketForDetails((prev) =>
        prev ? { ...prev, status_id: newStatusId, status: targetStatus || prev.status, updated_at: now } : null
      );
    }

    try {
      await ticketService.moveTicketStatus(ticketId, newStatusId);
      if (currentProject) {
        const updatedStats = await projectService.getProjectStats(currentProject.id);
        setStats(updatedStats);
      }
    } catch (err) {
      console.error('Failed to move ticket:', err);
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          {/* Project Switcher */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium hidden sm:inline">Project:</span>
            <select
              value={currentProject?.id || ''}
              onChange={(e) => navigate(`/projects/${e.target.value}`)}
              className="font-bold text-sm sm:text-base text-slate-900 dark:text-slate-100 bg-transparent border-0 focus:outline-none focus:ring-0 cursor-pointer pr-6 py-0.5"
            >
              {allProjects.map((p) => (
                <option key={p.id} value={p.id} className="dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {stats && (
            <div className="hidden md:flex items-center gap-2 pl-3 border-l border-slate-200 dark:border-slate-800 text-xs">
              <span className="text-slate-500 dark:text-slate-400">
                <strong className="text-slate-900 dark:text-slate-100 font-semibold">{stats.totalTickets}</strong> Tickets
              </span>
              <span className="text-purple-600 dark:text-purple-400 font-medium">
                • {stats.uploadedTickets} Verified by QA ({stats.completionPercentage}%)
              </span>
            </div>
          )}
        </div>

        {/* View Switcher & Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Tab Switcher (Board vs Overview) */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs">
            <button
              type="button"
              onClick={() => setActiveTab('board')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                activeTab === 'board'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
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
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              <BarChart2 className="w-3.5 h-3.5" />
              <span>Overview</span>
            </button>
          </div>

          {/* Export Dropdown */}
          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setIsExportMenuOpen(!isExportMenuOpen);
              }}
              leftIcon={<Download className="w-3.5 h-3.5" />}
              rightIcon={<ChevronDown className="w-3 h-3 text-slate-400" />}
              className="text-xs"
            >
              Export
            </Button>

            {isExportMenuOpen && (
              <div
                className="absolute right-0 top-full mt-1.5 w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg z-30 py-1 text-xs divide-y divide-slate-100 dark:divide-slate-800"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="px-3 py-1.5 text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  Export Board Tickets ({filteredTickets.length})
                </div>
                <div className="py-1">
                  <button
                    type="button"
                    onClick={() => {
                      setIsExportMenuOpen(false);
                      exportUtils.exportBulkTicketsPdf(
                        filteredTickets,
                        currentProject?.name || 'Project Tickets'
                      );
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center gap-2 cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5 text-rose-500" />
                    <span>Export as PDF</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsExportMenuOpen(false);
                      exportUtils.exportBulkTicketsExcel(
                        filteredTickets,
                        currentProject?.name || 'Project Tickets'
                      );
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center gap-2 cursor-pointer"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Export as Excel (.xlsx)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsExportMenuOpen(false);
                      exportUtils.exportToCsv(
                        filteredTickets,
                        currentProject?.name || 'project_tickets'
                      );
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center gap-2 cursor-pointer"
                  >
                    <FileCode className="w-3.5 h-3.5 text-sky-600" />
                    <span>Export as CSV</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleOpenReport}
          >
            Report View
          </Button>

          {/* Scratchpad Notes */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/notes')}
            leftIcon={<StickyNote className="w-3.5 h-3.5 text-amber-600" />}
          >
            Notes
          </Button>

          {/* AI Image to Ticket Generator */}
          <Button
            variant="ai"
            size="sm"
            onClick={() => setIsImageToTicketModalOpen(true)}
            leftIcon={<Sparkles className="w-3.5 h-3.5 text-indigo-600" />}
          >
            Image to Ticket
          </Button>

          {/* Create Ticket Button (Shown specifically inside project board) */}
          <Button
            variant="primary"
            size="sm"
            onClick={() => handleOpenAddTicket()}
            leftIcon={<Plus className="w-3.5 h-3.5" />}
          >
            Create Ticket
          </Button>
        </div>
      </div>

      {/* Filter Toolbar (Board Mode) */}
      {activeTab === 'board' && (
        <div className="flex items-center justify-between gap-3 flex-wrap bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800">
          <div className="flex items-center gap-2 flex-1 max-w-sm">
            <div className="relative w-full">
              <Search className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filter by ID, title, notes..."
                className="w-full text-xs pl-8 pr-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Category Filter */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="" className="dark:bg-slate-900 text-slate-900 dark:text-slate-100">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id} className="dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                  {c.name}
                </option>
              ))}
            </select>

            {/* Priority Filter */}
            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="" className="dark:bg-slate-900 text-slate-900 dark:text-slate-100">All Priorities</option>
              <option value="low" className="dark:bg-slate-900 text-slate-900 dark:text-slate-100">Low</option>
              <option value="medium" className="dark:bg-slate-900 text-slate-900 dark:text-slate-100">Medium</option>
              <option value="high" className="dark:bg-slate-900 text-slate-900 dark:text-slate-100">High</option>
              <option value="critical" className="dark:bg-slate-900 text-slate-900 dark:text-slate-100">Critical</option>
              <option value="urgent" className="dark:bg-slate-900 text-slate-900 dark:text-slate-100">Critical (Urgent)</option>
            </select>

            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="text-xs px-2 text-rose-600 dark:text-rose-400 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40"
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
          setTicketDraftFromImage(null);
          setTicketDraftFiles([]);
          setTargetColumnForNewTicket(undefined);
        }}
        onSubmit={handleSaveTicket}
        projects={allProjects}
        statuses={statuses}
        categories={categories}
        initialData={editingTicket}
        initialDraft={ticketDraftFromImage}
        initialFiles={ticketDraftFiles}
        defaultProjectId={currentProject?.id}
        defaultStatusId={targetColumnForNewTicket}
        onCategoryAdded={(newCat) => setCategories((prev) => [...prev, newCat])}
      />

      {/* Generate Ticket from Image Modal */}
      <GenerateTicketFromImageModal
        isOpen={isImageToTicketModalOpen}
        onClose={() => setIsImageToTicketModalOpen(false)}
        projects={allProjects}
        statuses={statuses}
        categories={categories}
        currentProjectId={currentProject?.id}
        defaultStatusId={statuses[0]?.id}
        onTicketCreated={() => loadData(currentProject?.id)}
        onOpenFullFormWithDraft={(draft, imageFile) => {
          setTicketDraftFromImage(draft);
          if (imageFile) setTicketDraftFiles([imageFile]);
          setEditingTicket(null);
          setIsTicketModalOpen(true);
        }}
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
