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
    <Card hoverable className="p-5 flex flex-col justify-between h-full bg-white group">
      <div>
        {/* Top Header */}
        <div className="flex items-start justify-between gap-3 mb-2.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 shrink-0">
              <FolderKanban className="w-4 h-4" />
            </div>
            <h3 className="font-semibold text-sm text-slate-900 truncate group-hover:text-slate-700 transition-colors">
              {project.name}
            </h3>
          </div>
          <Badge
            variant={project.status === 'active' ? 'green' : 'slate'}
            dot
            className="capitalize shrink-0"
          >
            {project.status}
          </Badge>
        </div>

        {/* Description */}
        <p className="text-xs text-slate-500 line-clamp-2 mb-4 leading-relaxed min-h-[2rem]">
          {project.description || 'No project description provided.'}
        </p>

        {/* Progress & Metrics */}
        <div className="space-y-2 mb-4 pt-2 border-t border-slate-100">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Progress</span>
            </span>
            <span className="font-semibold text-slate-800">{progressPercent}%</span>
          </div>

          {/* Progress bar */}
          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-slate-800 rounded-full transition-all duration-300"
              style={{ width: `${Math.min(100, Math.max(0, progressPercent))}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
            <span>
              <strong className="text-slate-800 font-semibold">{totalTickets}</strong> Total Tickets
            </span>
            <span>
              <strong className="text-purple-700 font-semibold">{uploadedTickets}</strong> Uploaded
            </span>
          </div>
        </div>
      </div>

      {/* Card Footer Actions */}
      <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
        <span className="text-[11px] text-slate-400 flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {new Date(project.updated_at).toLocaleDateString()}
        </span>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onDownloadReport(project);
            }}
            title="Download Report"
            className="text-xs px-2 text-slate-600 hover:text-slate-900"
          >
            <Download className="w-3.5 h-3.5 mr-1" />
            Report
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate(`/projects/${project.id}`)}
            className="text-xs"
          >
            <span>Open Board</span>
            <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </Button>
        </div>
      </div>
    </Card>
  );
};
