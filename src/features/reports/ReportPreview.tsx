import React from 'react';
import {
  FileText,
  FileSpreadsheet,
  FileCode,
  Download,
  Calendar,
  CheckCircle2,
  Printer,
} from 'lucide-react';
import { Modal } from '../../components/Modal';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import { ProjectReportData } from '../../types';
import { exportUtils } from './exportUtils';

export interface ReportPreviewProps {
  isOpen: boolean;
  onClose: () => void;
  reportData: ProjectReportData | null;
}

export const ReportPreview: React.FC<ReportPreviewProps> = ({
  isOpen,
  onClose,
  reportData,
}) => {
  if (!isOpen || !reportData) return null;

  const { project, reportGeneratedDate, totalTickets, statusCounts, completionPercentage, tickets } =
    reportData;

  const handlePrint = () => {
    window.print();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Project Ticketing Report: ${project.name}`}
      subtitle={`Generated on ${new Date(reportGeneratedDate).toLocaleString()}`}
      maxWidth="3xl"
    >
      <div className="space-y-6">
        {/* Export Buttons Toolbar */}
        <div className="flex items-center justify-between flex-wrap gap-2.5 p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-700">Export Formats:</span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Download className="w-3.5 h-3.5" />}
              onClick={() => exportUtils.exportToPdf(reportData)}
              className="text-xs"
            >
              PDF (Default)
            </Button>
            <Button
              variant="outline"
              size="sm"
              leftIcon={<FileSpreadsheet className="w-3.5 h-3.5" />}
              onClick={() => exportUtils.exportToExcel(reportData)}
              className="text-xs"
            >
              Excel (.xlsx)
            </Button>
            <Button
              variant="outline"
              size="sm"
              leftIcon={<FileText className="w-3.5 h-3.5" />}
              onClick={() => exportUtils.exportToCsv(tickets, project.name)}
              className="text-xs"
            >
              CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              leftIcon={<FileCode className="w-3.5 h-3.5" />}
              onClick={() => exportUtils.exportToJson(reportData)}
              className="text-xs"
            >
              JSON
            </Button>
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<Printer className="w-3.5 h-3.5" />}
              onClick={handlePrint}
              className="text-xs"
            >
              Print
            </Button>
          </div>
        </div>

        {/* Report Overview Box */}
        <div className="border border-slate-200 rounded-xl p-5 bg-white space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">{project.name}</h3>
              <p className="text-xs text-slate-500 mt-1">
                {project.description || 'No project description provided.'}
              </p>
            </div>
            <Badge variant="blue" className="shrink-0 text-xs">
              {completionPercentage}% Done
            </Badge>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-100 text-xs">
            <div>
              <span className="text-slate-400 block text-[11px]">Total Tickets</span>
              <span className="text-lg font-bold text-slate-900">{totalTickets}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Completed & Uploaded</span>
              <span className="text-lg font-bold text-purple-700">
                {statusCounts['Uploaded'] || 0}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Completion Rate</span>
              <span className="text-lg font-bold text-emerald-600">{completionPercentage}%</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Report Date</span>
              <span className="text-xs font-medium text-slate-700">
                {new Date(reportGeneratedDate).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>

        {/* Status Counts Breakdown */}
        <div>
          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2.5">
            Counts Per Status
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
            {Object.entries(statusCounts).map(([statusName, count]) => (
              <div
                key={statusName}
                className="p-3 rounded-lg border border-slate-200/80 bg-slate-50/50 flex flex-col justify-between"
              >
                <span className="text-xs text-slate-600 font-medium truncate" title={statusName}>
                  {statusName}
                </span>
                <span className="text-base font-bold text-slate-900 mt-1">{count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Tickets Table */}
        <div>
          <div className="flex items-center justify-between mb-2.5">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Tickets ({tickets.length})
            </h4>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="overflow-x-auto max-h-72">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold sticky top-0">
                  <tr>
                    <th className="py-2.5 px-3">Ticket ID</th>
                    <th className="py-2.5 px-3">Title</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Priority</th>
                    <th className="py-2.5 px-3">Created</th>
                    <th className="py-2.5 px-3">Updated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {tickets.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50/60">
                      <td className="py-2.5 px-3 font-mono font-semibold text-slate-700">
                        {t.ticket_number}
                      </td>
                      <td className="py-2.5 px-3 font-medium text-slate-800 max-w-xs truncate">
                        {t.title}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">{t.category?.name || '—'}</td>
                      <td className="py-2.5 px-3 text-slate-600">{t.status?.name || '—'}</td>
                      <td className="py-2.5 px-3 capitalize font-medium">{t.priority}</td>
                      <td className="py-2.5 px-3 text-slate-400">
                        {new Date(t.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-2.5 px-3 text-slate-400">
                        {new Date(t.updated_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end pt-3 border-t border-slate-100">
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
};
