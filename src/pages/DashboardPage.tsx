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
import { Project, Ticket, ProjectReportData, AttendanceRecord } from '../types';
import { useAuth } from '../context/AuthContext';
import { STATUS_COLORS } from '../config/ticketStatuses';
import { PRIORITY_CONFIG } from '../config/ticketCategories';
import { attendanceService } from '../services/attendanceService';
import { localDB } from '../services/localStore';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [allTickets, setAllTickets] = useState<Ticket[]>([]);
  const [projectStatsMap, setProjectStatsMap] = useState<Record<string, { total: number; uploaded: number; progress: number }>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [todayAttendance, setTodayAttendance] = useState<AttendanceRecord | null>(null);
  const [todaySummary, setTodaySummary] = useState<{ clockedIn: number; lateArrivals: number; totalEmployees: number } | null>(null);

  // Modals
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<ProjectReportData | null>(null);

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      const activeUser = user || localDB.getCurrentUser();
      const projs = await projectService.getProjects();
      const tickets = await ticketService.getTickets();
      setProjects(projs);
      setAllTickets(tickets);

      if (activeUser) {
        const att = await attendanceService.getTodayRecord(activeUser.id);
        setTodayAttendance(att);
      }
      const summary = await attendanceService.getTodaySummary();
      setTodaySummary(summary);

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
  }, [user?.id]);

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
      {/* Dashboard Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-1">
            <span>KRUM Workspace</span>
            <span aria-hidden="true">·</span>
            <span className="text-slate-800 dark:text-slate-200 font-medium">Home Dashboard</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            Welcome back, {user?.name?.split(' ')[0] || 'Maker'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
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

      {/* Attendance Quick Punch & Status Widget */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-xl p-4 sm:p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-300 shrink-0">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                Shift & Attendance
              </span>
              <span className="text-slate-300 dark:text-slate-700">·</span>
              <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 font-medium">
                {todayAttendance?.check_in ? (
                  todayAttendance.check_out ? (
                    <>
                      <span className="w-2 h-2 rounded-full bg-slate-400" />
                      <span>Shift Completed</span>
                    </>
                  ) : (
                    <>
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-emerald-700 dark:text-emerald-400 font-medium">Clocked In</span>
                    </>
                  )
                ) : (
                  <>
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    <span className="text-amber-700 dark:text-amber-400 font-medium">Not Clocked In</span>
                  </>
                )}
              </div>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {todayAttendance?.check_in
                ? `Punched in at ${new Date(todayAttendance.check_in).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}`
                : 'Standard shift: 09:00 — 18:00 (15 min grace window).'}
              {todaySummary && (
                <span className="text-slate-400 dark:text-slate-500 ml-2 hidden md:inline">
                  — Workforce: {todaySummary.clockedIn}/{todaySummary.totalEmployees} clocked in today.
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/attendance')}
            rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
            className="text-xs text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            Attendance Portal
          </Button>
        </div>
      </div>

      {/* Metric Cards (Total Projects, Total Tickets, Active Tickets, Uploaded Tickets) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-all shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Total Projects</span>
            <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              <FolderKanban className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100">{totalProjects}</span>
            <span className="text-xs text-slate-400 dark:text-slate-500">active</span>
          </div>
        </Card>

        <Card className="p-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-all shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Total Tickets</span>
            <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              <CheckSquare className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100">{totalTickets}</span>
            <span className="text-xs text-slate-400 dark:text-slate-500">across boards</span>
          </div>
        </Card>

        <Card className="p-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-all shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Active Workflow</span>
            <div className="p-2 rounded-xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold text-sky-700 dark:text-sky-400">{activeTickets}</span>
            <span className="text-xs text-slate-400 dark:text-slate-500">in progress</span>
          </div>
        </Card>

        <Card className="p-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-all shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Verified by QA</span>
            <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400">
              <Upload className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold text-purple-700 dark:text-purple-400">{uploadedTickets}</span>
            <span className="text-xs text-slate-400 dark:text-slate-500">delivered</span>
          </div>
        </Card>
      </div>

      {/* Main Grid: Projects Showcase & Recent Tickets */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: My Projects (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Workspace Projects</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Click any project card to open its dedicated 4-stage Kanban board.
              </p>
            </div>

            {projects.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/projects')}
                rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                className="text-xs text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
              >
                View All
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
          <Card className="p-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-3.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                Recent Tickets
              </h3>
              <button
                type="button"
                onClick={() => navigate('/tickets')}
                className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 font-medium cursor-pointer"
              >
                All Tickets
              </button>
            </div>

            {recentTickets.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">No tickets created yet.</p>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {recentTickets.map((t) => {
                  const sName = t.status?.name || 'Pending';
                  const sColor = STATUS_COLORS[sName] || {
                    bg: 'bg-slate-50 dark:bg-slate-800',
                    text: 'text-slate-700 dark:text-slate-300',
                    border: 'border-slate-200 dark:border-slate-700',
                  };
                  const pConf = PRIORITY_CONFIG[t.priority] || PRIORITY_CONFIG.medium;

                  return (
                    <div
                      key={t.id}
                      onClick={() => navigate(`/projects/${t.project_id}`)}
                      className="py-3 group cursor-pointer hover:bg-slate-50/70 dark:hover:bg-slate-800/60 -mx-2 px-2 rounded-lg transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="font-mono text-[11px] font-bold text-slate-700 dark:text-slate-300">
                          {t.ticket_number}
                        </span>
                        <span
                          className={`text-[10px] font-medium px-2 py-0.5 rounded-md border ${sColor.bg} ${sColor.text} ${sColor.border}`}
                        >
                          {sName}
                        </span>
                      </div>

                      <h4 className="text-xs font-medium text-slate-800 dark:text-slate-200 line-clamp-1 group-hover:text-slate-950 dark:group-hover:text-white">
                        {t.title}
                      </h4>

                      <div className="flex items-center justify-between text-[10px] text-slate-400 dark:text-slate-500 mt-1.5">
                        <span className="flex items-center gap-1">
                          <span className={`w-1.5 h-1.5 rounded-full ${pConf.dot}`} />
                          <span className="capitalize">{t.priority}</span>
                        </span>

                        {t.notes && (
                          <span className="text-amber-600 dark:text-amber-400 flex items-center gap-0.5">
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
          <Card className="p-4 bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-2.5 text-xs">
            <h4 className="font-bold text-slate-800 dark:text-slate-200 text-[11px] uppercase tracking-wider">
              4-Stage Personal Workflow
            </h4>
            <div className="space-y-2 text-slate-600 dark:text-slate-300">
              <div className="flex items-center justify-between">
                <span className="font-medium text-slate-700 dark:text-slate-200">1. Just Written</span>
                <span className="text-[11px] text-slate-400 dark:text-slate-500">Backlog draft</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-medium text-amber-700 dark:text-amber-400">2. Under Review</span>
                <span className="text-[11px] text-slate-400 dark:text-slate-500">In execution</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-medium text-sky-700 dark:text-sky-400">3. Verified</span>
                <span className="text-[11px] text-slate-400 dark:text-slate-500">Quality checked</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-medium text-purple-700 dark:text-purple-400">4. Verified by QA</span>
                <span className="text-[11px] text-slate-400 dark:text-slate-500">Final release</span>
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
