import React, { useState, useEffect } from 'react';
import { Plus, Search, FolderKanban, Trash2, Edit3, Archive } from 'lucide-react';
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
import { reportService } from '../features/reports/reportService';
import { Project, ProjectReportData } from '../types';

export const ProjectsPage: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'archived'>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [projectStatsMap, setProjectStatsMap] = useState<Record<string, { total: number; uploaded: number; progress: number }>>({});

  // Modals & Dialogs
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [selectedReport, setSelectedReport] = useState<ProjectReportData | null>(null);

  const loadProjects = async () => {
    setIsLoading(true);
    try {
      const data = await projectService.getProjects();
      const tickets = await ticketService.getTickets();
      setProjects(data);

      const stats: Record<string, { total: number; uploaded: number; progress: number }> = {};
      for (const p of data) {
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
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Projects</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Manage your individual development projects, board workflows, and ticket repositories.
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
        >
          New Project
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 bg-white border border-slate-200/80 rounded-xl">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search projects..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs text-slate-500">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-900 cursor-pointer"
          >
            <option value="all">All Projects</option>
            <option value="active">Active Only</option>
            <option value="archived">Archived</option>
          </select>
        </div>
      </div>

      {/* Projects Grid */}
      {isLoading ? (
        <CardSkeleton count={3} />
      ) : filteredProjects.length === 0 ? (
        <EmptyState
          icon={<FolderKanban className="w-6 h-6 text-slate-400" />}
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
            return (
              <div key={project.id} className="relative group">
                <ProjectCard
                  project={project}
                  totalTickets={stat.total}
                  uploadedTickets={stat.uploaded}
                  progressPercent={stat.progress}
                  onDownloadReport={handleDownloadReport}
                />
                {/* Secondary management buttons top right */}
                <div className="absolute top-4 right-4 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white/95 px-1 py-0.5 rounded-lg border border-slate-200 shadow-2xs">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingProject(project);
                      setIsFormOpen(true);
                    }}
                    className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100"
                    title="Edit project"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setProjectToDelete(project)}
                    className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-slate-100"
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
