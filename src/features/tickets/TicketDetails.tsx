import React, { useState } from 'react';
import {
  X,
  Edit2,
  Trash2,
  Paperclip,
  Download,
  Calendar,
  Clock,
  History,
  FileText,
  UploadCloud,
  FileCheck,
  Check,
  ChevronDown,
  FileSpreadsheet,
  FileCode,
  StickyNote,
} from 'lucide-react';
import { Ticket, Status, Category, Attachment } from '../../types';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { CATEGORY_COLORS, PRIORITY_CONFIG } from '../../config/ticketCategories';
import { STATUS_COLORS } from '../../config/ticketStatuses';
import { attachmentService } from '../../services/attachmentService';
import { ticketService } from './ticketService';
import { exportUtils } from '../reports/exportUtils';

export interface TicketDetailsProps {
  isOpen: boolean;
  ticket: Ticket | null;
  statuses: Status[];
  categories: Category[];
  onClose: () => void;
  onEdit: (ticket: Ticket) => void;
  onDelete: (ticketId: string) => void;
  onStatusChange: (ticketId: string, newStatusId: string) => Promise<void>;
  onRefreshTicket: (ticketId: string) => void;
}

export const TicketDetails: React.FC<TicketDetailsProps> = ({
  isOpen,
  ticket,
  statuses,
  onClose,
  onEdit,
  onDelete,
  onStatusChange,
  onRefreshTicket,
}) => {
  const [isDeletingTicket, setIsDeletingTicket] = useState(false);
  const [attachmentToDelete, setAttachmentToDelete] = useState<Attachment | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Inline Notes Edit State
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [notesValue, setNotesValue] = useState(ticket?.notes || '');
  const [isSavingNotes, setIsSavingNotes] = useState(false);

  React.useEffect(() => {
    if (ticket) {
      setNotesValue(ticket.notes || '');
      setIsEditingNotes(false);
    }
  }, [ticket?.id, ticket?.notes]);

  if (!isOpen || !ticket) return null;

  const priorityConf = PRIORITY_CONFIG[ticket.priority] || PRIORITY_CONFIG.medium;
  const currentStatus = statuses.find((s) => s.id === ticket.status_id) || ticket.status;
  const statusColor = currentStatus ? STATUS_COLORS[currentStatus.name] : null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    setIsUploading(true);
    try {
      await attachmentService.uploadAndSaveAttachment(ticket.project_id, ticket.id, file);
      onRefreshTicket(ticket.id);
    } catch (err) {
      console.error('Failed to upload file:', err);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteAttachment = async () => {
    if (!attachmentToDelete) return;
    try {
      await attachmentService.deleteAttachment(attachmentToDelete);
      setAttachmentToDelete(null);
      onRefreshTicket(ticket.id);
    } catch (err) {
      console.error('Failed to delete attachment:', err);
    }
  };

  const handleSaveInlineNotes = async () => {
    setIsSavingNotes(true);
    try {
      await ticketService.updateTicket(ticket.id, {
        notes: notesValue.trim(),
      });
      setIsEditingNotes(false);
      onRefreshTicket(ticket.id);
    } catch (err) {
      console.error('Failed to save notes:', err);
    } finally {
      setIsSavingNotes(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  return (
    <>
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity" onClick={onClose} />
        <div className="flex min-h-full items-center justify-center p-3 sm:p-4 text-left">
          <div
            className="relative transform overflow-hidden rounded-2xl bg-white text-left shadow-2xl transition-all w-full max-w-3xl border border-slate-200"
            onClick={(e) => {
              e.stopPropagation();
              if (isExportMenuOpen) setIsExportMenuOpen(false);
            }}
          >
            {/* Header */}
            <div className="p-5 border-b border-slate-100 flex items-start justify-between gap-4 bg-slate-50/50">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  <span className="font-mono text-xs font-bold text-slate-800 bg-white border border-slate-200 px-2 py-0.5 rounded shadow-2xs">
                    {ticket.ticket_number}
                  </span>

                  {/* Priority */}
                  <span
                    className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full ${priorityConf.bg} ${priorityConf.text}`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${priorityConf.dot}`} />
                    {priorityConf.label} Priority
                  </span>

                  {/* Category */}
                  {ticket.category && (
                    <Badge variant="slate" className="text-xs">
                      {ticket.category.name}
                    </Badge>
                  )}
                </div>

                <h2 className="text-lg font-bold text-slate-900 leading-snug">{ticket.title}</h2>
              </div>

              {/* Close & Action Buttons */}
              <div className="flex items-center gap-1.5 shrink-0">
                {/* Export Dropdown */}
                <div className="relative">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsExportMenuOpen(!isExportMenuOpen);
                    }}
                    leftIcon={<Download className="w-3.5 h-3.5" />}
                    rightIcon={<ChevronDown className="w-3 h-3 text-slate-400" />}
                    className="text-xs"
                  >
                    Export
                  </Button>

                  {isExportMenuOpen && (
                    <div
                      className="absolute right-0 top-full mt-1.5 w-44 bg-white border border-slate-200 rounded-xl shadow-lg z-30 py-1 text-xs divide-y divide-slate-100"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="px-3 py-1.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                        Export Ticket
                      </div>
                      <div className="py-1">
                        <button
                          type="button"
                          onClick={() => {
                            setIsExportMenuOpen(false);
                            exportUtils.exportSingleTicketPdf(ticket);
                          }}
                          className="w-full text-left px-3 py-1.5 hover:bg-slate-50 text-slate-700 flex items-center gap-2 cursor-pointer"
                        >
                          <FileText className="w-3.5 h-3.5 text-rose-500" />
                          <span>Export as PDF</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setIsExportMenuOpen(false);
                            exportUtils.exportSingleTicketExcel(ticket);
                          }}
                          className="w-full text-left px-3 py-1.5 hover:bg-slate-50 text-slate-700 flex items-center gap-2 cursor-pointer"
                        >
                          <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Export as Excel</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setIsExportMenuOpen(false);
                            exportUtils.exportSingleTicketCsv(ticket);
                          }}
                          className="w-full text-left px-3 py-1.5 hover:bg-slate-50 text-slate-700 flex items-center gap-2 cursor-pointer"
                        >
                          <FileCode className="w-3.5 h-3.5 text-sky-600" />
                          <span>Export as CSV</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onEdit(ticket)}
                  leftIcon={<Edit2 className="w-3.5 h-3.5" />}
                  className="text-xs"
                >
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsDeletingTicket(true)}
                  className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                  title="Delete ticket"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
                <button
                  type="button"
                  onClick={onClose}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer ml-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="p-6 max-h-[calc(100vh-180px)] overflow-y-auto space-y-6">
              {/* Quick Status Selector Bar */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-600">Current Status:</span>
                  <span
                    className={`text-xs font-semibold px-2.5 py-1 rounded-md border ${
                      statusColor ? `${statusColor.bg} ${statusColor.text} ${statusColor.border}` : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {currentStatus?.name || 'Pending'}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <label htmlFor="status-quick-select" className="text-xs text-slate-500">Move to:</label>
                  <select
                    id="status-quick-select"
                    value={ticket.status_id}
                    onChange={(e) => onStatusChange(ticket.id, e.target.value)}
                    className="text-xs font-medium bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-900 cursor-pointer"
                  >
                    {statuses.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} {s.is_final ? '(Final)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Meta Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-3 border-y border-slate-100 text-xs">
                <div>
                  <span className="text-slate-400 block text-[11px] mb-0.5">Due Date</span>
                  <div className="flex items-center gap-1 font-medium text-slate-700">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>
                      {ticket.due_date ? new Date(ticket.due_date).toLocaleDateString() : 'No deadline'}
                    </span>
                  </div>
                </div>

                <div>
                  <span className="text-slate-400 block text-[11px] mb-0.5">Created Date</span>
                  <div className="flex items-center gap-1 font-medium text-slate-700">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>{new Date(ticket.created_at).toLocaleDateString()}</span>
                  </div>
                </div>

                <div>
                  <span className="text-slate-400 block text-[11px] mb-0.5">Last Updated</span>
                  <div className="flex items-center gap-1 font-medium text-slate-700">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>{new Date(ticket.updated_at).toLocaleDateString()}</span>
                  </div>
                </div>

                <div>
                  <span className="text-slate-400 block text-[11px] mb-0.5">Workflow</span>
                  <div className="flex items-center gap-1 font-medium text-purple-700">
                    <FileCheck className="w-3.5 h-3.5 text-purple-600" />
                    <span>{currentStatus?.is_final ? 'Delivered (Uploaded)' : 'Active Stage'}</span>
                  </div>
                </div>
              </div>

              {/* 1. Description Box */}
              <div>
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-slate-500" />
                  <span>Description</span>
                </h4>
                <div className="bg-slate-50/80 border border-slate-200/80 rounded-xl p-4 text-xs sm:text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                  {ticket.description || 'No description provided.'}
                </div>
              </div>

              {/* 2. Notes Section (Separate from Description) */}
              <div className="bg-amber-50/40 border border-amber-200/70 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1 rounded-md bg-amber-100 text-amber-800">
                      <StickyNote className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-amber-950 uppercase tracking-wider">
                        Notes
                      </h4>
                      <p className="text-[11px] text-amber-700">
                        Separate personal notes, memos, implementation reminders, and scratchpad.
                      </p>
                    </div>
                  </div>

                  {!isEditingNotes && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsEditingNotes(true)}
                      leftIcon={<Edit2 className="w-3 h-3" />}
                      className="text-xs bg-white text-amber-900 border-amber-300 hover:bg-amber-50"
                    >
                      {ticket.notes ? 'Edit Notes' : 'Add Notes'}
                    </Button>
                  )}
                </div>

                {isEditingNotes ? (
                  <div className="space-y-2.5 pt-1">
                    <textarea
                      value={notesValue}
                      onChange={(e) => setNotesValue(e.target.value)}
                      placeholder="Add implementation notes, edge cases, PR links, or personal reminders..."
                      rows={3}
                      className="w-full text-xs p-3 rounded-lg border border-amber-300 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500 font-sans leading-relaxed"
                    />
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setNotesValue(ticket.notes || '');
                          setIsEditingNotes(false);
                        }}
                        className="text-xs text-slate-600 hover:bg-amber-100/50"
                      >
                        Cancel
                      </Button>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={handleSaveInlineNotes}
                        isLoading={isSavingNotes}
                        leftIcon={<Check className="w-3.5 h-3.5" />}
                        className="text-xs bg-amber-600 hover:bg-amber-700 text-white"
                      >
                        Save Notes
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed bg-white/70 border border-amber-200/50 rounded-lg p-3">
                    {ticket.notes?.trim() ? (
                      ticket.notes
                    ) : (
                      <span className="text-slate-400 italic">
                        No notes recorded yet. Click "Add Notes" to write quick personal memos.
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Attachments Section */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-1.5">
                    <Paperclip className="w-4 h-4 text-slate-500" />
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Attachments ({ticket.attachments?.length || 0})
                    </h4>
                  </div>

                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      onChange={handleFileUpload}
                      accept=".png,.jpg,.jpeg,.pdf,.docx,.xlsx,.zip,.txt"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      isLoading={isUploading}
                      leftIcon={<UploadCloud className="w-3.5 h-3.5" />}
                      className="text-xs"
                    >
                      Upload File
                    </Button>
                  </div>
                </div>

                {(!ticket.attachments || ticket.attachments.length === 0) ? (
                  <p className="text-xs text-slate-400 py-3 bg-slate-50 rounded-lg text-center border border-dashed border-slate-200">
                    No files attached to this ticket.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {ticket.attachments.map((att) => (
                      <div
                        key={att.id}
                        className="flex items-center justify-between gap-2 p-2.5 rounded-lg border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-colors text-xs"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <Paperclip className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <div className="truncate">
                            <span className="font-medium text-slate-800 block truncate" title={att.file_name}>
                              {att.file_name}
                            </span>
                            <span className="text-[10px] text-slate-400 block">
                              {formatFileSize(att.file_size)}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => attachmentService.downloadAttachment(att)}
                            className="p-1.5 text-slate-500 hover:text-slate-900 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
                            title="Download file"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setAttachmentToDelete(att)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
                            title="Delete attachment"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Ticket History Section */}
              <div>
                <div className="flex items-center gap-1.5 mb-3">
                  <History className="w-4 h-4 text-slate-500" />
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Ticket History ({ticket.history?.length || 0})
                  </h4>
                </div>

                {(!ticket.history || ticket.history.length === 0) ? (
                  <p className="text-xs text-slate-400 py-3 text-center">No history recorded yet.</p>
                ) : (
                  <div className="space-y-3 relative before:absolute before:inset-0 before:left-3 before:w-0.5 before:bg-slate-200">
                    {ticket.history.map((hist) => (
                      <div key={hist.id} className="relative flex items-start gap-3 pl-7">
                        <div className="absolute left-1.5 top-1 w-3 h-3 rounded-full bg-slate-900 border-2 border-white ring-2 ring-slate-100" />
                        <div className="flex-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-slate-800 capitalize">
                              {hist.action_type.replace(/_/g, ' ')}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {new Date(hist.created_at).toLocaleString()}
                            </span>
                          </div>
                          {hist.old_value && hist.new_value ? (
                            <p className="text-xs text-slate-500 mt-0.5">
                              Changed from <strong className="text-slate-700">{hist.old_value}</strong> to{' '}
                              <strong className="text-slate-700">{hist.new_value}</strong>
                            </p>
                          ) : hist.new_value ? (
                            <p className="text-xs text-slate-500 mt-0.5">{hist.new_value}</p>
                          ) : hist.old_value ? (
                            <p className="text-xs text-slate-500 mt-0.5">Removed: {hist.old_value}</p>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Confirm Ticket Delete Dialog */}
      <ConfirmDialog
        isOpen={isDeletingTicket}
        onClose={() => setIsDeletingTicket(false)}
        onConfirm={() => {
          onDelete(ticket.id);
          setIsDeletingTicket(false);
          onClose();
        }}
        title={`Delete Ticket ${ticket.ticket_number}`}
        message="Are you sure you want to permanently delete this ticket, its attachments, and history? This action cannot be undone."
        confirmLabel="Delete Ticket"
      />

      {/* Confirm Attachment Delete Dialog */}
      <ConfirmDialog
        isOpen={Boolean(attachmentToDelete)}
        onClose={() => setAttachmentToDelete(null)}
        onConfirm={handleDeleteAttachment}
        title="Delete Attachment"
        message={`Are you sure you want to remove "${attachmentToDelete?.file_name}" from this ticket?`}
        confirmLabel="Delete File"
      />
    </>
  );
};
