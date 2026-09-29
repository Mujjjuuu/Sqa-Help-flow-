import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FolderKanban,
  CheckSquare,
  Clock,
  Upload,
  Plus,
  ArrowRight,
  Sparkles,
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
import { isSupabaseConfigured, getSupabaseCredentials } from '../services/supabaseClient';
import { Database, ExternalLink, Code2 } from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
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

  const handleDownloadReport = async (project: Project) => {
    try {
      const report = await reportService.generateProjectReport(project.id);
      setSelectedReport(report);
    } catch (e) {
      console.error('Failed to generate report:', e);
    }
  };

  const handleCreateProject = async (data: any) => {
    await projectService.createProject(data);
    await loadDashboardData();
  };

  return (
    <div className="space-y-7">
      {/* Top Banner & Welcome */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Personal Workspace Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Track your individual projects, manage tickets on Kanban boards, and generate reports.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => setIsProjectModalOpen(true)}
          >
            Create Project
          </Button>
        </div>
      </div>

      {/* Supabase Status Banner */}
      {isSupabaseConfigured() && (
        <div className="bg-sky-50/80 border border-sky-200/90 rounded-xl p-3.5 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-sky-100 text-sky-700">
              <Database className="w-4 h-4" />
            </div>
            <div className="text-xs">
              <span className="font-semibold text-sky-950">
                Supabase Connected: {getSupabaseCredentials().url.replace('https://', '')}
              </span>
              <p className="text-sky-700 mt-0.5">
                Ensure you have executed the initial SQL migration in your Supabase SQL Editor so your tables are active.
              </p>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/settings')}
            className="text-xs bg-white text-sky-900 border-sky-300 hover:bg-sky-50 shadow-2xs"
            leftIcon={<Code2 className="w-3.5 h-3.5" />}
          >
            Database Settings & SQL
          </Button>
        </div>
      )}

      {/* Metric Cards (Total Projects, Total Tickets, Active Tickets, Uploaded Tickets) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 sm:p-5 bg-white">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Projects</span>
            <div className="p-2 rounded-lg bg-slate-100 text-slate-700">
              <FolderKanban className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold text-slate-900">{totalProjects}</span>
            <span className="text-xs text-slate-400">active</span>
          </div>
        </Card>

        <Card className="p-4 sm:p-5 bg-white">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Tickets</span>
            <div className="p-2 rounded-lg bg-slate-100 text-slate-700">
              <CheckSquare className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold text-slate-900">{totalTickets}</span>
            <span className="text-xs text-slate-400">all projects</span>
          </div>
        </Card>

        <Card className="p-4 sm:p-5 bg-white">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Active Tickets</span>
            <div className="p-2 rounded-lg bg-sky-50 text-sky-600">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold text-sky-700">{activeTickets}</span>
            <span className="text-xs text-slate-400">in progress</span>
          </div>
        </Card>

        <Card className="p-4 sm:p-5 bg-white">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Uploaded Tickets</span>
            <div className="p-2 rounded-lg bg-purple-50 text-purple-600">
              <Upload className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold text-purple-700">{uploadedTickets}</span>
            <span className="text-xs text-slate-400">completed</span>
          </div>
        </Card>
      </div>

      {/* My Projects Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">My Projects</h2>
            <p className="text-xs text-slate-500">Select a project to access its Kanban board and tickets.</p>
          </div>

          {projects.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/projects')}
              className="text-xs"
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
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
