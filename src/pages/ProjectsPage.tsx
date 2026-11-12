import React, { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  FolderKanban,
  Trash2,
  Edit3,
  Archive,
  Layers,
  CheckCircle2,
  StickyNote,
  Sparkles,
} from 'lucide-react';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { EmptyState } from '../components/EmptyState';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { CardSkeleton } from '../components/Skeleton';
import { ProjectCard } from '../features/projects/ProjectCard';
import { ProjectForm } from '../features/projects/ProjectForm';
import { ReportPreview } from '../features/reports/ReportPreview';
import { projectService } from '../features/projects/projectService';
import { ticketService } from '../features/tickets/ticketService';
import { noteService } from '../services/noteService';
import { reportService } from '../features/reports/reportService';
import { Project, ProjectReportData } from '../types';

export const ProjectsPage: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'archived'>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [projectStatsMap, setProjectStatsMap] = useState<Record<string, { total: number; uploaded: number; progress: number }>>({});
  const [projectNotesMap, setProjectNotesMap] = useState<Record<string, number>>({});

  // Modals & Dialogs
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [selectedReport, setSelectedReport] = useState<ProjectReportData | null>(null);

  const loadProjects = async () => {
    setIsLoading(true);
    try {
      const [data, tickets, allNotes] = await Promise.all([
        projectService.getProjects(),
        ticketService.getTickets(),
        noteService.getNotes(),
      ]);
      setProjects(data);

      const stats: Record<string, { total: number; uploaded: number; progress: number }> = {};
      const notesCount: Record<string, number> = {};

      for (const p of data) {
        const pTickets = tickets.filter((t) => t.project_id === p.id);
        const uploaded = pTickets.filter(
          (t) =>
            t.status?.is_final ||
            t.status?.name?.toLowerCase() === 'uploaded' ||
            t.status?.name?.toLowerCase() === 'done' ||
            t.status?.name?.toLowerCase() === 'verified by qa'
        ).length;
        const total = pTickets.length;
        const progress = total > 0 ? Math.round((uploaded / total) * 100) : 0;
        stats[p.id] = { total, uploaded, progress };

        // Count notes specifically associated with this project
        const pNotes = allNotes.filter((n) => n.project_id === p.id);
        notesCount[p.id] = pNotes.length;
      }

      setProjectStatsMap(stats);
      setProjectNotesMap(notesCount);
    } catch (e) {
      console.error('Failed to load projects:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  const filteredProjects = projects.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.description && p.description.toLowerCase().includes(search.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalTicketsAcrossAll = Object.values(projectStatsMap).reduce((acc, s) => acc + s.total, 0);
  const totalVerifiedAcrossAll = Object.values(projectStatsMap).reduce((acc, s) => acc + s.uploaded, 0);
  const totalNotesAcrossAll = Object.values(projectNotesMap).reduce((acc, count) => acc + count, 0);

  const handleCreateOrUpdate = async (formData: any) => {
    if (editingProject) {
      await projectService.updateProject(editingProject.id, formData);
      setEditingProject(null);
    } else {
      await projectService.createProject(formData);
    }
    await loadProjects();
  };

  const handleDeleteProject = async () => {
    if (!projectToDelete) return;
    await projectService.deleteProject(projectToDelete.id);
    setProjectToDelete(null);
    await loadProjects();
  };

  const handleDownloadReport = async (project: Project) => {
    try {
      const report = await reportService.generateProjectReport(project.id);
      setSelectedReport(report);
    } catch (e) {
      console.error('Failed to generate report:', e);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header with New Project Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80 dark:border-slate-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            Projects Workspace
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Select any project to open its Kanban board, 5-stage ticket pipeline, and project-specific notes.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={() => {
            setEditingProject(null);
            setIsFormOpen(true);
          }}
          className="shadow-sm"
        >
          New Project
        </Button>
      </div>

      {/* Global Quick Metrics Summary Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-2xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
            <FolderKanban className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium block">Total Projects</span>
            <span className="font-extrabold text-base text-slate-900 dark:text-slate-100">{projects.length}</span>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-2xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-100 dark:border-blue-900/60 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium block">Total Tickets</span>
            <span className="font-extrabold text-base text-slate-900 dark:text-slate-100">{totalTicketsAcrossAll}</span>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-2xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-100 dark:border-emerald-900/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium block">QA Verified & Done</span>
            <span className="font-extrabold text-base text-emerald-600 dark:text-emerald-400">{totalVerifiedAcrossAll}</span>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-2xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-100 dark:border-amber-900/60 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
            <StickyNote className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium block">Project Notes</span>
            <span className="font-extrabold text-base text-amber-600 dark:text-amber-400">{totalNotesAcrossAll}</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-2xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search projects by name, description..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="text-xs font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer"
          >
            <option value="all" className="dark:bg-slate-900 text-slate-900 dark:text-slate-100">All Projects</option>
            <option value="active" className="dark:bg-slate-900 text-slate-900 dark:text-slate-100">Active Only</option>
            <option value="archived" className="dark:bg-slate-900 text-slate-900 dark:text-slate-100">Archived</option>
          </select>
        </div>
      </div>

      {/* Projects Grid */}
      {isLoading ? (
        <CardSkeleton count={3} />
      ) : filteredProjects.length === 0 ? (
        <EmptyState
          icon={<FolderKanban className="w-8 h-8 text-slate-400" />}
          title={search ? 'No Projects Match Search' : 'No Projects Found'}
          description={
            search
              ? 'Try adjusting your search criteria.'
              : 'Create your first project to begin organizing tickets and boards.'
          }
          actionLabel={search ? undefined : 'Create Project'}
          onAction={() => setIsFormOpen(true)}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredProjects.map((project) => {
            const stat = projectStatsMap[project.id] || { total: 0, uploaded: 0, progress: 0 };
            const notesCount = projectNotesMap[project.id] || 0;
            return (
              <div key={project.id} className="relative group">
                <ProjectCard
                  project={project}
                  totalTickets={stat.total}
                  uploadedTickets={stat.uploaded}
                  progressPercent={stat.progress}
                  notesCount={notesCount}
                  onDownloadReport={handleDownloadReport}
                />
                {/* Secondary management buttons top right */}
                <div className="absolute top-4 right-4 z-10 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white/95 dark:bg-slate-800/95 backdrop-blur-xs px-1.5 py-1 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingProject(project);
                      setIsFormOpen(true);
                    }}
                    className="p-1.5 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                    title="Edit project"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setProjectToDelete(project);
                    }}
                    className="p-1.5 text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors cursor-pointer"
                    title="Delete project"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Project Create/Edit Modal */}
      <ProjectForm
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingProject(null);
        }}
        onSubmit={handleCreateOrUpdate}
        initialData={editingProject}
      />

      {/* Delete Project Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(projectToDelete)}
        onClose={() => setProjectToDelete(null)}
        onConfirm={handleDeleteProject}
        title={`Delete Project "${projectToDelete?.name}"`}
        message="Are you sure you want to delete this project? All associated statuses, categories, tickets, attachments, and history will be permanently deleted."
        confirmLabel="Delete Project"
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
