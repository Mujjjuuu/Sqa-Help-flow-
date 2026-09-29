import React, { useState, useEffect } from 'react';
import {
  Paperclip,
  Download,
  Trash2,
  Eye,
  Search,
  Filter,
  FileText,
  FileImage,
  FileSpreadsheet,
  FileArchive,
  X,
} from 'lucide-react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { EmptyState } from '../components/EmptyState';
import { TableSkeleton } from '../components/Skeleton';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Modal } from '../components/Modal';
import { attachmentService } from '../services/attachmentService';
import { ticketService } from '../features/tickets/ticketService';
import { Attachment, Ticket } from '../types';

interface FileWithTicket extends Attachment {
  ticket?: Ticket;
}

export const FilesPage: React.FC = () => {
  const [files, setFiles] = useState<FileWithTicket[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedTicketId, setSelectedTicketId] = useState('');
  const [selectedFileType, setSelectedFileType] = useState('');
  const [filterDate, setFilterDate] = useState('');

  // Modals
  const [fileToDelete, setFileToDelete] = useState<Attachment | null>(null);
  const [previewFile, setPreviewFile] = useState<Attachment | null>(null);

  const loadFilesData = async () => {
    setIsLoading(true);
    try {
      const [attachments, allTickets] = await Promise.all([
        attachmentService.getAttachments(),
        ticketService.getTickets(),
      ]);

      const ticketMap = new Map(allTickets.map((t) => [t.id, t]));
      const enriched: FileWithTicket[] = attachments.map((att) => ({
        ...att,
        ticket: ticketMap.get(att.ticket_id),
      }));

      setFiles(enriched);
      setTickets(allTickets);
    } catch (e) {
      console.error('Failed to load files:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadFilesData();
  }, []);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  const getFileIcon = (type: string, name: string) => {
    const ext = name.split('.').pop()?.toLowerCase();
    if (['png', 'jpg', 'jpeg', 'webp', 'svg'].includes(ext || '')) {
      return <FileImage className="w-4 h-4 text-pink-500" />;
    }
    if (['xlsx', 'xls', 'csv'].includes(ext || '')) {
      return <FileSpreadsheet className="w-4 h-4 text-emerald-500" />;
    }
    if (['zip', 'rar', 'tar', 'gz'].includes(ext || '')) {
      return <FileArchive className="w-4 h-4 text-amber-500" />;
    }
    return <FileText className="w-4 h-4 text-sky-500" />;
  };

  const filteredFiles = files.filter((f) => {
    const q = search.toLowerCase().trim();
    const matchesSearch =
      !q ||
      f.file_name.toLowerCase().includes(q) ||
      (f.ticket?.ticket_number && f.ticket.ticket_number.toLowerCase().includes(q)) ||
      (f.ticket?.title && f.ticket.title.toLowerCase().includes(q));

    const matchesTicket = !selectedTicketId || f.ticket_id === selectedTicketId;

    let matchesType = true;
    if (selectedFileType) {
      const ext = f.file_name.split('.').pop()?.toLowerCase();
      matchesType = ext === selectedFileType;
    }

    let matchesDate = true;
    if (filterDate) {
      matchesDate = f.created_at.slice(0, 10) === filterDate;
    }

    return matchesSearch && matchesTicket && matchesType && matchesDate;
  });

  const hasFilters = Boolean(search || selectedTicketId || selectedFileType || filterDate);

  const clearFilters = () => {
    setSearch('');
    setSelectedTicketId('');
    setSelectedFileType('');
    setFilterDate('');
  };

  const handleDelete = async () => {
    if (!fileToDelete) return;
    await attachmentService.deleteAttachment(fileToDelete);
    setFileToDelete(null);
    await loadFilesData();
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Files & Attachments</h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          View, preview, and download all artifacts, specifications, and files attached to tickets.
        </p>
      </div>

      {/* Filter Bar */}
      <Card className="p-3 bg-white space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search file name, ticket number..."
              className="w-full text-xs pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Filter by Ticket */}
            <select
              value={selectedTicketId}
              onChange={(e) => setSelectedTicketId(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-900"
            >
              <option value="">All Tickets</option>
              {tickets.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.ticket_number} - {t.title.slice(0, 24)}...
                </option>
              ))}
            </select>

            {/* Filter by File Type */}
            <select
              value={selectedFileType}
              onChange={(e) => setSelectedFileType(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-900"
            >
              <option value="">All Types</option>
              <option value="pdf">PDF</option>
              <option value="png">PNG</option>
              <option value="jpg">JPG</option>
              <option value="docx">DOCX</option>
              <option value="xlsx">XLSX</option>
              <option value="zip">ZIP</option>
              <option value="txt">TXT</option>
            </select>

            {/* Date filter */}
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-900"
            />

            {hasFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50"
              >
                <X className="w-3.5 h-3.5 mr-1" />
                Clear
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Files Table */}
      {isLoading ? (
        <TableSkeleton rows={6} />
      ) : filteredFiles.length === 0 ? (
        <EmptyState
          icon={<Paperclip className="w-8 h-8 text-slate-400" />}
          title={hasFilters ? 'No Matching Files' : 'No Files Yet'}
          description={
            hasFilters
              ? 'Try modifying your filters to see more attachments.'
              : 'Attachments added to tickets will automatically be cataloged here.'
          }
        />
      ) : (
        <Card className="overflow-hidden bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200/80 text-slate-600 font-semibold">
                <tr>
                  <th className="py-3 px-4">File Name</th>
                  <th className="py-3 px-3">Ticket ID</th>
                  <th className="py-3 px-3">Ticket Title</th>
                  <th className="py-3 px-3">File Type</th>
                  <th className="py-3 px-3">Size</th>
                  <th className="py-3 px-3">Uploaded Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredFiles.map((file) => (
                  <tr key={file.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2 max-w-xs truncate font-medium text-slate-800">
                        {getFileIcon(file.file_type, file.file_name)}
                        <span className="truncate" title={file.file_name}>
                          {file.file_name}
                        </span>
                      </div>
                    </td>

                    <td className="py-3 px-3">
                      <span className="font-mono font-semibold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded text-[11px]">
                        {file.ticket?.ticket_number || '—'}
                      </span>
                    </td>

                    <td className="py-3 px-3 text-slate-600 max-w-xs truncate">
                      {file.ticket?.title || '—'}
                    </td>

                    <td className="py-3 px-3 uppercase text-[11px] font-mono text-slate-500">
                      {file.file_name.split('.').pop() || 'file'}
                    </td>

                    <td className="py-3 px-3 text-slate-500 text-[11px]">
                      {formatFileSize(file.file_size)}
                    </td>

                    <td className="py-3 px-3 text-slate-500 text-[11px]">
                      {new Date(file.created_at).toLocaleDateString()}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => setPreviewFile(file)}
                          className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100"
                          title="Preview file"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => attachmentService.downloadAttachment(file)}
                          className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100"
                          title="Download file"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setFileToDelete(file)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-slate-100"
                          title="Delete file"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={Boolean(fileToDelete)}
        onClose={() => setFileToDelete(null)}
        onConfirm={handleDelete}
        title="Delete File Attachment"
        message={`Are you sure you want to permanently delete "${fileToDelete?.file_name}"?`}
        confirmLabel="Delete File"
      />

      {/* File Preview Modal */}
      <Modal
        isOpen={Boolean(previewFile)}
        onClose={() => setPreviewFile(null)}
        title={previewFile?.file_name || 'File Preview'}
        subtitle={`Size: ${previewFile ? formatFileSize(previewFile.file_size) : ''}`}
        maxWidth="lg"
      >
        {previewFile && (
          <div className="space-y-4">
            {previewFile.file_name.match(/\.(png|jpg|jpeg|webp|svg)$/i) ? (
              <div className="flex justify-center bg-slate-900 rounded-lg p-2 overflow-hidden max-h-96">
                <img
                  src={previewFile.file_url}
                  alt={previewFile.file_name}
                  className="max-h-80 object-contain rounded"
                />
              </div>
            ) : previewFile.file_name.endsWith('.txt') ? (
              <div className="bg-slate-50 p-4 rounded-lg font-mono text-xs text-slate-800 max-h-80 overflow-y-auto whitespace-pre-wrap border border-slate-200">
                {previewFile.file_url.startsWith('data:text') ? (
                  atob(previewFile.file_url.split(',')[1] || '')
                ) : (
                  <span>Text file ready for download.</span>
                )}
              </div>
            ) : (
              <div className="p-8 text-center bg-slate-50 rounded-lg border border-dashed border-slate-200">
                <FileText className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                <p className="text-xs text-slate-600 font-medium">
                  Direct in-app preview is not available for this binary format.
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  You can download and open it in your local application.
                </p>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <Button variant="outline" size="sm" onClick={() => setPreviewFile(null)}>
                Close
              </Button>
              <Button
                variant="primary"
                size="sm"
                leftIcon={<Download className="w-3.5 h-3.5" />}
                onClick={() => attachmentService.downloadAttachment(previewFile)}
              >
                Download
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
