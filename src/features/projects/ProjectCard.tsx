import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FolderKanban,
  Download,
  ArrowRight,
  Clock,
  CheckCircle2,
  StickyNote,
  Layers,
  Sparkles,
} from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import { Project } from '../../types';

export interface ProjectCardProps {
  project: Project;
  totalTickets: number;
  uploadedTickets: number;
  progressPercent: number;
  notesCount?: number;
  onDownloadReport: (project: Project) => void;
  onEdit?: (project: Project) => void;
  onDelete?: (project: Project) => void;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({
  project,
  totalTickets,
  uploadedTickets,
  progressPercent,
  notesCount = 0,
  onDownloadReport,
}) => {
  const navigate = useNavigate();

  const handleCardClick = () => {
    navigate(`/projects/${project.id}`);
  };

  const handleOpenNotes = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/projects/${project.id}?tab=notes`);
  };

  return (
    <div
      onClick={handleCardClick}
      className="group relative flex flex-col justify-between h-full bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-500/80 rounded-2xl p-5 shadow-xs hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 cursor-pointer select-none"
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleCardClick();
        }
      }}
      title={`Click anywhere to open "${project.name}" Board`}
    >
      <div>
        {/* Top Header */}
        <div className="flex items-start justify-between gap-3 mb-2.5">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-100/90 dark:border-indigo-800/70 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5 group-hover:scale-105 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-2xs">
              <FolderKanban className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3
                className="font-bold text-sm sm:text-base text-slate-900 dark:text-slate-100 line-clamp-2 leading-snug group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors"
                title={project.name}
              >
                {project.name}
              </h3>
              <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
                Click anywhere to open board
              </span>
            </div>
          </div>
          <Badge
            variant={project.status === 'active' ? 'green' : 'slate'}
            dot
            className="capitalize shrink-0 text-[11px] font-semibold"
          >
            {project.status}
          </Badge>
        </div>

        {/* Description */}
        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-4 leading-relaxed min-h-[2.25rem]">
          {project.description || 'No project description provided. Click to open and add tickets or notes.'}
        </p>

        {/* Progress & Metrics */}
        <div className="space-y-3 mb-4 pt-3 border-t border-slate-100 dark:border-slate-800/80">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-600 dark:text-slate-300 font-semibold flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>QA & Done Progress</span>
            </span>
            <span className="font-extrabold text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md text-[11px] border border-slate-200/60 dark:border-slate-700/60">
              {progressPercent}%
            </span>
          </div>

          {/* Progress bar */}
          <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-200/40 dark:border-slate-700/50">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 via-indigo-600 to-emerald-500 rounded-full transition-all duration-300"
              style={{ width: `${Math.min(100, Math.max(0, progressPercent))}%` }}
            />
          </div>

          {/* Metric Badges Grid: Tickets, QA/Done, Notes */}
          <div className="grid grid-cols-3 gap-2 pt-1">
            <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 text-center">
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">Tickets</span>
              <span className="font-bold text-xs sm:text-sm text-slate-800 dark:text-slate-100 mt-0.5">{totalTickets}</span>
            </div>

            <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-purple-50/70 dark:bg-purple-950/40 border border-purple-100/80 dark:border-purple-900/60 text-center">
              <span className="text-[10px] text-purple-600 dark:text-purple-400 font-medium">Verified / Done</span>
              <span className="font-bold text-xs sm:text-sm text-purple-800 dark:text-purple-200 mt-0.5">{uploadedTickets}</span>
            </div>

            <button
              type="button"
              onClick={handleOpenNotes}
              className="flex flex-col items-center justify-center p-2 rounded-xl bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-900/60 text-center hover:bg-amber-100/70 dark:hover:bg-amber-900/50 transition-colors cursor-pointer group/notes"
              title="View and manage notes for this project"
            >
              <div className="flex items-center gap-1 text-[10px] text-amber-700 dark:text-amber-300 font-semibold">
                <StickyNote className="w-3 h-3 text-amber-600" />
                <span>Notes</span>
              </div>
              <span className="font-bold text-xs sm:text-sm text-amber-900 dark:text-amber-200 mt-0.5 group-hover/notes:scale-110 transition-transform">
                {notesCount}
              </span>
            </button>
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
            onClick={(e) => {
              e.stopPropagation();
              handleCardClick();
            }}
            rightIcon={<ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />}
            className="text-xs font-semibold group-hover:bg-indigo-600 group-hover:text-white group-hover:border-indigo-600 transition-colors"
          >
            Open Board
          </Button>
        </div>
      </div>
    </div>
  );
};
