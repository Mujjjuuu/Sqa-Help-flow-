import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FolderKanban,
  CheckSquare,
  Clock,
  Upload,
  Plus,
  ArrowRight,
  ExternalLink,
  Code2,
  FileText,
  StickyNote,
  Layers,
  ChevronRight,
} from 'lucide-react';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { EmptyState } from '../components/EmptyState';
import { CardSkeleton } from '../components/Skeleton';
import { ProjectCard } from '../features/projects/ProjectCard';
import { ProjectForm } from '../features/projects/ProjectForm';
import { ReportPreview } from '../features/reports/ReportPreview';
import { projectService } from '../features/projects/projectService';
import { ticketService } from '../features/tickets/ticketService';
import { reportService } from '../features/reports/reportService';
import { Project, Ticket, ProjectReportData } from '../types';
import { useAuth } from '../context/AuthContext';
import { STATUS_COLORS } from '../config/ticketStatuses';
import { PRIORITY_CONFIG } from '../config/ticketCategories';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [allTickets, setAllTickets] = useState<Ticket[]>([]);
  const [projectStatsMap, setProjectStatsMap] = useState<Record<string, { total: number; uploaded: number; progress: number }>>({});
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<ProjectReportData | null>(null);

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      const projs = await projectService.getProjects();
      const tickets = await ticketService.getTickets();
      setProjects(projs);
      setAllTickets(tickets);

      const stats: Record<string, { total: number; uploaded: number; progress: number }> = {};
      for (const p of projs) {
        const pTickets = tickets.filter((t) => t.project_id === p.id);
        const uploaded = pTickets.filter(
          (t) => t.status?.is_final || t.status?.name?.toLowerCase() === 'uploaded'
        ).length;
        const total = pTickets.length;
        const progress = total > 0 ? Math.round((uploaded / total) * 100) : 0;
        stats[p.id] = { total, uploaded, progress };
      }
      setProjectStatsMap(stats);
    } catch (e) {
      console.error('Error loading dashboard:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const totalProjects = projects.length;
  const totalTickets = allTickets.length;
  const uploadedTickets = allTickets.filter(
    (t) => t.status?.is_final || t.status?.name?.toLowerCase() === 'uploaded'
  ).length;
  const activeTickets = totalTickets - uploadedTickets;

  const recentTickets = [...allTickets]
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, 5);

  const handleDownloadReport = async (project: Project) => {
    try {
      const report = await reportService.generateProjectReport(project.id);
      setSelectedReport(report);
    } catch (e) {
      console.error('Failed to generate report:', e);
    }
  };

  const handleCreateProject = async (data: any) => {
    const created = await projectService.createProject(data);
    await loadDashboardData();
    navigate(`/projects/${created.id}`);
  };

  return (
    <div className="space-y-8">
      {/* Top Banner & Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <span>Personal Workspace</span>
            <span aria-hidden="true">·</span>
            <span className="text-slate-800 font-medium">Home Dashboard</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Welcome back, {user?.name?.split(' ')[0] || 'Maker'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Track solo projects, organize Kanban boards, and manage 4-stage release workflows.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Button
            variant="primary"
            size="md"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => setIsProjectModalOpen(true)}
            className="text-xs sm:text-sm font-semibold shadow-xs"
          >
            Create Project
          </Button>
        </div>
      </div>

      {/* Metric Cards (Total Projects, Total Tickets, Active Tickets, Uploaded Tickets) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5 bg-white border border-slate-200/80 hover:border-slate-300 transition-all shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold text-slate-600">Total Projects</span>
            <div className="p-2 rounded-xl bg-slate-100 text-slate-700">
              <FolderKanban className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold text-slate-900">{totalProjects}</span>
            <span className="text-xs text-slate-400">active</span>
          </div>
        </Card>

        <Card className="p-5 bg-white border border-slate-200/80 hover:border-slate-300 transition-all shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold text-slate-600">Total Tickets</span>
            <div className="p-2 rounded-xl bg-slate-100 text-slate-700">
              <CheckSquare className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold text-slate-900">{totalTickets}</span>
            <span className="text-xs text-slate-400">across boards</span>
          </div>
        </Card>

        <Card className="p-5 bg-white border border-slate-200/80 hover:border-slate-300 transition-all shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold text-slate-600">Active Workflow</span>
            <div className="p-2 rounded-xl bg-sky-50 text-sky-600">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold text-sky-700">{activeTickets}</span>
            <span className="text-xs text-slate-400">in progress</span>
          </div>
        </Card>

        <Card className="p-5 bg-white border border-slate-200/80 hover:border-slate-300 transition-all shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold text-slate-600">Uploaded / Final</span>
            <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
              <Upload className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold text-purple-700">{uploadedTickets}</span>
            <span className="text-xs text-slate-400">delivered</span>
          </div>
        </Card>
      </div>

      {/* Main Grid: Projects Showcase & Recent Tickets */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: My Projects (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Workspace Projects</h2>
              <p className="text-xs text-slate-500">
                Click any project card to open its dedicated 4-stage Kanban board.
              </p>
            </div>

            {projects.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/projects')}
                className="text-xs text-slate-600 hover:text-slate-900"
              >
                <span>View All</span>
                <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            )}
          </div>

          {isLoading ? (
            <CardSkeleton count={3} />
          ) : projects.length === 0 ? (
            <EmptyState
              icon={<FolderKanban className="w-6 h-6 text-slate-400" />}
              title="No Projects Yet"
              description="Create your first project to start organizing tickets and visualizing workflows."
              actionLabel="Create Project"
              onAction={() => setIsProjectModalOpen(true)}
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {projects.map((project) => {
                const stat = projectStatsMap[project.id] || { total: 0, uploaded: 0, progress: 0 };
                return (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    totalTickets={stat.total}
                    uploadedTickets={stat.uploaded}
                    progressPercent={stat.progress}
                    onDownloadReport={handleDownloadReport}
                  />
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Quick Recent Activity & Workflow Stages (4 cols) */}
        <div className="lg:col-span-4 space-y-5">
          {/* Recent Tickets Card */}
          <Card className="p-5 bg-white border border-slate-200/80 shadow-2xs space-y-3.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Recent Tickets
              </h3>
              <button
                type="button"
                onClick={() => navigate('/tickets')}
                className="text-xs text-slate-500 hover:text-slate-900 font-medium cursor-pointer"
              >
                All Tickets
              </button>
            </div>

            {recentTickets.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">No tickets created yet.</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {recentTickets.map((t) => {
                  const sName = t.status?.name || 'Pending';
                  const sColor = STATUS_COLORS[sName] || {
                    bg: 'bg-slate-50',
                    text: 'text-slate-700',
                    border: 'border-slate-200',
                  };
                  const pConf = PRIORITY_CONFIG[t.priority] || PRIORITY_CONFIG.medium;

                  return (
                    <div
                      key={t.id}
                      onClick={() => navigate(`/projects/${t.project_id}`)}
                      className="py-3 group cursor-pointer hover:bg-slate-50/70 -mx-2 px-2 rounded-lg transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="font-mono text-[11px] font-bold text-slate-700">
                          {t.ticket_number}
                        </span>
                        <span
                          className={`text-[10px] font-medium px-2 py-0.5 rounded-md border ${sColor.bg} ${sColor.text} ${sColor.border}`}
                        >
                          {sName}
                        </span>
                      </div>

                      <h4 className="text-xs font-medium text-slate-800 line-clamp-1 group-hover:text-slate-950">
                        {t.title}
                      </h4>

                      <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1.5">
                        <span className="flex items-center gap-1">
                          <span className={`w-1.5 h-1.5 rounded-full ${pConf.dot}`} />
                          <span className="capitalize">{t.priority}</span>
                        </span>

                        {t.notes && (
                          <span className="text-amber-600 flex items-center gap-0.5">
                            <StickyNote className="w-2.5 h-2.5" />
                            <span>Notes</span>
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {/* 4-Stage Workflow Legend Card */}
          <Card className="p-4 bg-slate-50/70 border border-slate-200/80 shadow-2xs space-y-2.5 text-xs">
            <h4 className="font-bold text-slate-800 text-[11px] uppercase tracking-wider">
              4-Stage Personal Workflow
            </h4>
            <div className="space-y-2 text-slate-600">
              <div className="flex items-center justify-between">
                <span className="font-medium text-slate-700">1. Just Written</span>
                <span className="text-[11px] text-slate-400">Backlog draft</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-medium text-amber-700">2. Under Review</span>
                <span className="text-[11px] text-slate-400">In execution</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-medium text-sky-700">3. Verified</span>
                <span className="text-[11px] text-slate-400">Quality checked</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-medium text-purple-700">4. Uploaded</span>
                <span className="text-[11px] text-slate-400">Final release</span>
              </div>
            </div>
          </Card>
        </div>

      </div>

      {/* Project Form Modal */}
      <ProjectForm
        isOpen={isProjectModalOpen}
        onClose={() => setIsProjectModalOpen(false)}
        onSubmit={handleCreateProject}
      />

      {/* Report Preview Modal */}
      <ReportPreview
        isOpen={Boolean(selectedReport)}
        onClose={() => setSelectedReport(null)}
        reportData={selectedReport}
      />
    </div>
  );
};
