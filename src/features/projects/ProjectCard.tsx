import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FolderKanban, Download, ArrowRight, Clock, CheckCircle2 } from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import { Project } from '../../types';

export interface ProjectCardProps {
  project: Project;
  totalTickets: number;
  uploadedTickets: number;
  progressPercent: number;
  onDownloadReport: (project: Project) => void;
  onEdit?: (project: Project) => void;
  onDelete?: (project: Project) => void;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({
  project,
  totalTickets,
  uploadedTickets,
  progressPercent,
  onDownloadReport,
}) => {
  const navigate = useNavigate();

  return (
    <Card hoverable className="p-5 flex flex-col justify-between h-full bg-white dark:bg-slate-900 group border border-slate-200/90 dark:border-slate-800 hover:border-indigo-200 dark:hover:border-indigo-500/50 hover:shadow-md transition-all duration-200 rounded-2xl">
      <div>
        {/* Top Header */}
        <div className="flex items-start justify-between gap-3 mb-2.5">
          <div className="flex items-start gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100/80 dark:border-indigo-900/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5">
              <FolderKanban className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3
                className="font-semibold text-sm sm:text-base text-slate-900 dark:text-slate-100 line-clamp-2 leading-snug group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors"
                title={project.name}
              >
                {project.name}
              </h3>
            </div>
          </div>
          <Badge
            variant={project.status === 'active' ? 'green' : 'slate'}
            dot
            className="capitalize shrink-0 text-[11px]"
          >
            {project.status}
          </Badge>
        </div>

        {/* Description */}
        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-4 leading-relaxed min-h-[2.25rem]">
          {project.description || 'No project description provided.'}
        </p>

        {/* Progress & Metrics */}
        <div className="space-y-2.5 mb-4 pt-3 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-600 dark:text-slate-300 font-medium flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Delivery Progress</span>
            </span>
            <span className="font-bold text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-[11px]">
              {progressPercent}%
            </span>
          </div>

          {/* Progress bar */}
          <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden p-0.5">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-full transition-all duration-300"
              style={{ width: `${Math.min(100, Math.max(0, progressPercent))}%` }}
            />
          </div>

          {/* Quick metric pills */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-750 text-xs">
              <span className="text-slate-500 dark:text-slate-400 text-[11px]">Total Tickets</span>
              <span className="font-bold text-slate-800 dark:text-slate-100">{totalTickets}</span>
            </div>
            <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-purple-50/70 dark:bg-purple-950/40 border border-purple-100 dark:border-purple-900/60 text-xs">
              <span className="text-purple-700 dark:text-purple-300 text-[11px] font-medium">Verified by QA</span>
              <span className="font-bold text-purple-800 dark:text-purple-200">{uploadedTickets}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Card Footer Actions */}
      <div className="pt-3.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
        <span className="text-[11px] text-slate-400 dark:text-slate-500 flex items-center gap-1.5 font-medium">
          <Clock className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
          <span>Updated {new Date(project.updated_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
        </span>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onDownloadReport(project);
            }}
            leftIcon={<Download className="w-3.5 h-3.5" />}
            title="Download PDF/CSV/Excel report for this project"
            className="text-xs text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
          >
            Report
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/projects/${project.id}`)}
            rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
            className="text-xs font-semibold group-hover:bg-indigo-600 group-hover:text-white group-hover:border-indigo-600 transition-colors"
          >
            Open Board
          </Button>
        </div>
      </div>
    </Card>
  );
};
