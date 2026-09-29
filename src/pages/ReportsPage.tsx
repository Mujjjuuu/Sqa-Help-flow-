import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  Download,
  Eye,
  FolderKanban,
  CheckCircle2,
  Clock,
  Layers,
} from 'lucide-react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { CardSkeleton } from '../components/Skeleton';
import { EmptyState } from '../components/EmptyState';
import { ReportPreview } from '../features/reports/ReportPreview';
import { projectService } from '../features/projects/projectService';
import { reportService } from '../features/reports/reportService';
import { exportUtils } from '../features/reports/exportUtils';
import { Project, ProjectReportData } from '../types';

export const ReportsPage: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [reportsMap, setReportsMap] = useState<Record<string, ProjectReportData>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<ProjectReportData | null>(null);

  const loadReports = async () => {
    setIsLoading(true);
    try {
      const projs = await projectService.getProjects();
      setProjects(projs);

      const map: Record<string, ProjectReportData> = {};
      for (const p of projs) {
        const rep = await reportService.generateProjectReport(p.id);
        map[p.id] = rep;
      }
      setReportsMap(map);
    } catch (e) {
      console.error('Failed to load project reports:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  const handleDownloadPdf = async (project: Project) => {
    const report = reportsMap[project.id] || (await reportService.generateProjectReport(project.id));
    exportUtils.exportToPdf(report);
  };

  const handleDownloadExcel = async (project: Project) => {
    const report = reportsMap[project.id] || (await reportService.generateProjectReport(project.id));
    exportUtils.exportToExcel(report);
  };

  const handleViewReport = async (project: Project) => {
    const report = reportsMap[project.id] || (await reportService.generateProjectReport(project.id));
    setSelectedReport(report);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Project Reports</h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          Generate, preview, and download formal ticketing reports in PDF, Excel (.xlsx), CSV, and JSON formats.
        </p>
      </div>

      {/* Reports Grid */}
      {isLoading ? (
        <CardSkeleton count={3} />
      ) : projects.length === 0 ? (
        <EmptyState
          icon={<FileSpreadsheet className="w-8 h-8 text-slate-400" />}
          title="No Project Reports"
          description="Create a project to automatically generate tracking and completion reports."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {projects.map((project) => {
            const report = reportsMap[project.id];
            const totalTickets = report?.totalTickets || 0;
            const uploadedTickets = report?.statusCounts['Uploaded'] || 0;
            const progress = report?.completionPercentage || 0;

            return (
              <Card key={project.id} className="p-5 bg-white flex flex-col justify-between h-full">
                <div>
                  {/* Header */}
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700 shrink-0">
                        <FolderKanban className="w-4 h-4" />
                      </div>
                      <h3 className="font-semibold text-sm text-slate-900 truncate">{project.name}</h3>
                    </div>
                  </div>

                  <p className="text-xs text-slate-500 line-clamp-2 mb-4 leading-relaxed">
                    {project.description || 'No description provided.'}
                  </p>

                  {/* Progress & Stats */}
                  <div className="space-y-2 mb-4 pt-2 border-t border-slate-100 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Completion Rate</span>
                      </span>
                      <span className="font-semibold text-slate-900">{progress}%</span>
                    </div>

                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-600 rounded-full transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                      <span>
                        <strong className="text-slate-800">{totalTickets}</strong> Total Tickets
                      </span>
                      <span>
                        <strong className="text-purple-700">{uploadedTickets}</strong> Uploaded
                      </span>
                    </div>
                  </div>
                </div>

                {/* Footer with View & Download Actions */}
                <div className="pt-3 border-t border-slate-100 space-y-2.5">
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Updated {new Date(project.updated_at).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewReport(project)}
                      className="text-xs px-2"
                      leftIcon={<Eye className="w-3.5 h-3.5" />}
                    >
                      View
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownloadPdf(project)}
                      className="text-xs px-2"
                      leftIcon={<Download className="w-3.5 h-3.5" />}
                    >
                      PDF
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleDownloadExcel(project)}
                      className="text-xs px-2"
                      leftIcon={<FileSpreadsheet className="w-3.5 h-3.5" />}
                    >
                      Excel
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Report Preview Modal */}
      <ReportPreview
        isOpen={Boolean(selectedReport)}
        onClose={() => setSelectedReport(null)}
        reportData={selectedReport}
      />
    </div>
  );
};
