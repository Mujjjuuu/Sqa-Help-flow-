import React, { useState } from 'react';
import {
  X,
  Edit2,
  Trash2,
  Paperclip,
  Download,
  Calendar,
  Clock,
  FileText,
  UploadCloud,
  Check,
  ChevronDown,
  FileSpreadsheet,
  FileCode,
  StickyNote,
  Mic,
  MicOff,
  Image as ImageIcon,
  Maximize2,
  CheckCircle2,
  ArrowRight,
  RotateCcw,
  AlertCircle,
} from 'lucide-react';
import {
  Ticket,
  Status,
  Category,
  Attachment,
  TicketSeverity,
  TicketDevMask,
  TicketColor,
  TicketWorkAssignments,
  TicketWorkRelay,
  TicketTimeTracking,
} from '../../types';
import { Button } from '../../components/Button';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { PRIORITY_CONFIG } from '../../config/ticketCategories';
import { STATUS_COLORS } from '../../config/ticketStatuses';
import { attachmentService } from '../../services/attachmentService';
import { ticketService } from './ticketService';
import { exportUtils } from '../reports/exportUtils';
import { TicketCommentsSection } from './TicketCommentsSection';
import { useSpeechRecognition } from '../../hooks/useVoiceSpeech';
import { ImageLightboxModal, LightboxImage } from '../../components/ImageLightboxModal';

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

const COLOR_SWATCHES: { id: TicketColor; label: string; bg: string; ring: string; border: string }[] = [
  { id: 'default', label: 'Default', bg: 'bg-white', ring: 'ring-slate-300', border: 'border-slate-300' },
  { id: 'gray', label: 'Gray', bg: 'bg-slate-400', ring: 'ring-slate-400', border: 'border-slate-400' },
  { id: 'purple', label: 'Purple', bg: 'bg-indigo-600', ring: 'ring-indigo-600', border: 'border-indigo-600' },
  { id: 'blue', label: 'Blue', bg: 'bg-sky-500', ring: 'ring-sky-500', border: 'border-sky-500' },
  { id: 'green', label: 'Green', bg: 'bg-emerald-500', ring: 'ring-emerald-500', border: 'border-emerald-500' },
  { id: 'orange', label: 'Orange', bg: 'bg-amber-500', ring: 'ring-amber-500', border: 'border-amber-500' },
  { id: 'red', label: 'Red', bg: 'bg-rose-500', ring: 'ring-rose-500', border: 'border-rose-500' },
];

const TEAM_MEMBERS = [
  'Nobody yet',
  'Mujtaba Bilal',
  'imran',
  'Bob Official',
  'Alex Chen',
  'Sarah Connor',
];

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

  // Lightbox Preview State
  const [lightboxImages, setLightboxImages] = useState<LightboxImage[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  // Inline Notes Edit State
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [notesValue, setNotesValue] = useState(ticket?.notes || '');
  const [isSavingNotes, setIsSavingNotes] = useState(false);

  // Inline Description Edit State
  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [descValue, setDescValue] = useState(ticket?.description || '');
  const [isSavingDesc, setIsSavingDesc] = useState(false);

  // Handover Note Input
  const [isAddingHandoverNote, setIsAddingHandoverNote] = useState(false);
  const [handoverNoteInput, setHandoverNoteInput] = useState('');

  // Active Tab for extra sections (Notes, Comments, History)
  const [activeExtraTab, setActiveExtraTab] = useState<'comments' | 'notes'>('comments');

  const {
    isListening: isNotesListening,
    startListening: startNotesListening,
    stopListening: stopNotesListening,
  } = useSpeechRecognition();

  const toggleNotesVoice = () => {
    if (isNotesListening) {
      stopNotesListening();
    } else {
      startNotesListening((spokenText) => {
        setNotesValue((prev) => (prev ? `${prev.trim()} ${spokenText}` : spokenText));
      });
    }
  };

  React.useEffect(() => {
    if (ticket) {
      setNotesValue(ticket.notes || '');
      setDescValue(ticket.description || '');
      setIsEditingNotes(false);
      setIsEditingDesc(false);
      setIsAddingHandoverNote(false);
      setHandoverNoteInput(ticket.work_relay?.handover_notes || '');
    }
  }, [ticket?.id, ticket?.notes, ticket?.description]);

  if (!isOpen || !ticket) return null;

  const priorityConf = PRIORITY_CONFIG[ticket.priority] || PRIORITY_CONFIG.medium;
  const currentStatus = statuses.find((s) => s.id === ticket.status_id) || ticket.status;
  const statusColor = currentStatus ? STATUS_COLORS[currentStatus.name] : null;

  // Defaults matching update.jpg
  const ticketType = ticket.ticket_type || 'Modification';
  const refCode = ticket.ref_code || 'PMIC-078';
  const severity: TicketSeverity = ticket.severity || 'high';
  const devMask: TicketDevMask = ticket.dev_mask || 'frontend';
  const currentColor: TicketColor = ticket.color || 'default';

  const assignments: TicketWorkAssignments = ticket.work_assignments || {
    backend: 'Nobody yet',
    frontend: 'imran',
    flutter: 'Nobody yet',
    qa: 'Mujtaba Bilal',
  };

  const pulledCount = Object.values(assignments).filter(
    (v) => v && v !== 'Nobody yet' && v.trim() !== ''
  ).length;

  const relay: TicketWorkRelay = ticket.work_relay || {
    current_stage: 'qa',
    fe_user: assignments.frontend && assignments.frontend !== 'Nobody yet' ? assignments.frontend : 'imran',
    fe_done: true,
    qa_user: assignments.qa && assignments.qa !== 'Nobody yet' ? assignments.qa : 'Mujtaba Bilal',
    qa_done: false,
    handover_notes: '',
  };

  const timeTracking: TicketTimeTracking = ticket.time_tracking || {
    dev_time_str: '2d 2h',
    qa_time_str: '1d 7h',
    cycles: 2,
    total_time_str: '4d 7h',
    stages: [
      {
        stage: 'To Do',
        moved_by: 'Mujtaba Bilal',
        timestamp: '08 Oct 2026, 11:34',
        duration_str: '6h 54m',
      },
      {
        stage: 'Ready for Review',
        moved_by: 'imran',
        timestamp: '09 Oct 2026, 17:02',
        duration_str: '7h 53m',
      },
      {
        stage: 'In Progress',
        moved_by: 'Mujtaba Bilal',
        timestamp: '12 Oct 2026, 12:44',
        duration_str: '1d 5h',
      },
      {
        stage: 'Ready for Review',
        moved_by: 'imran',
        timestamp: '13 Oct 2026, 19:48',
        duration_str: '7h 3m',
        cycle: 2,
        is_current: true,
      },
    ],
  };

  // Image Attachments
  const imageAttachments = (ticket.attachments || []).filter(
    (a) =>
      a.file_type?.startsWith('image/') ||
      a.file_url?.startsWith('data:image/') ||
      /\.(png|jpe?g|webp|gif|svg)$/i.test(a.file_name)
  );

  const commentImages: { url: string; author: string; date: string }[] = [];
  (ticket.comments || []).forEach((c) => {
    if (c.images && c.images.length > 0) {
      c.images.forEach((imgUrl) => {
        commentImages.push({
          url: imgUrl,
          author: c.user_name,
          date: c.created_at,
        });
      });
    }
  });

  const allUploadedImages: LightboxImage[] = [
    ...imageAttachments.map((att) => ({
      url: att.file_url,
      title: att.file_name,
      source: 'Ticket Attachment',
      date: new Date(att.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' }),
    })),
    ...commentImages.map((cImg, idx) => ({
      url: cImg.url,
      title: `Comment image ${idx + 1}`,
      source: `Comment by ${cImg.author}`,
      date: new Date(cImg.date).toLocaleDateString([], { month: 'short', day: 'numeric' }),
    })),
  ];

  const totalAttachments = ticket.attachments?.length || 0;
  const totalAttachmentBytes = (ticket.attachments || []).reduce((acc, a) => acc + (a.file_size || 0), 0);

  const handleOpenImageGallery = (index: number) => {
    setLightboxImages(allUploadedImages);
    setLightboxIndex(index);
    setIsLightboxOpen(true);
  };

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

  const handleSaveDescription = async () => {
    setIsSavingDesc(true);
    try {
      await ticketService.updateTicket(ticket.id, {
        description: descValue.trim(),
      });
      setIsEditingDesc(false);
      onRefreshTicket(ticket.id);
    } catch (err) {
      console.error('Failed to save description:', err);
    } finally {
      setIsSavingDesc(false);
    }
  };

  const handleUpdateField = async (fields: Partial<Ticket>) => {
    try {
      await ticketService.updateTicket(ticket.id, fields as any);
      onRefreshTicket(ticket.id);
    } catch (err) {
      console.error('Failed to update ticket field:', err);
    }
  };

  const handleUpdateAssignment = async (role: keyof TicketWorkAssignments, value: string) => {
    const updated = { ...assignments, [role]: value };
    await handleUpdateField({ work_assignments: updated });
  };

  const handleRelayDone = async () => {
    const updatedRelay: TicketWorkRelay = {
      ...relay,
      qa_done: true,
      current_stage: 'completed',
    };
    await handleUpdateField({ work_relay: updatedRelay });

    // Move to final status if available
    const finalSt = statuses.find((s) => s.is_final || s.name.toLowerCase().includes('qa') || s.name.toLowerCase().includes('uploaded'));
    if (finalSt) {
      await onStatusChange(ticket.id, finalSt.id);
    }
  };

  const handleRelayHandBack = async () => {
    const updatedRelay: TicketWorkRelay = {
      ...relay,
      current_stage: 'fe',
      qa_done: false,
      fe_done: false,
    };
    await handleUpdateField({ work_relay: updatedRelay });

    // Move back to in progress or under review if available
    const reviewSt = statuses.find((s) => s.name.toLowerCase().includes('review') || s.name.toLowerCase().includes('progress'));
    if (reviewSt) {
      await onStatusChange(ticket.id, reviewSt.id);
    }
  };

  const handleSaveHandoverNote = async () => {
    const updatedRelay: TicketWorkRelay = {
      ...relay,
      handover_notes: handoverNoteInput.trim(),
    };
    await handleUpdateField({ work_relay: updatedRelay });
    setIsAddingHandoverNote(false);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  const reporterName = ticket.created_by_name || 'Mujtaba Bilal';

  return (
    <>
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity" onClick={onClose} />
        <div className="flex min-h-full items-center justify-center p-2 sm:p-4 text-left">
          <div
            className="relative transform overflow-hidden rounded-2xl bg-white text-left shadow-2xl transition-all w-full max-w-5xl lg:max-w-6xl border border-slate-200"
            onClick={(e) => {
              e.stopPropagation();
              if (isExportMenuOpen) setIsExportMenuOpen(false);
            }}
          >
            {/* ---------------------------------------------------- */}
            {/* Top Bar (Header Matching Screenshot)                 */}
            {/* ---------------------------------------------------- */}
            <div className="px-6 py-3.5 border-b border-slate-200/90 flex items-center justify-between bg-white">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="text-xs font-medium px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                  {ticketType}
                </span>

                <span className="font-mono text-xs font-bold text-slate-800">
                  {ticket.ticket_number}
                </span>

                {refCode && (
                  <span className="font-mono text-xs text-slate-400">
                    · {refCode}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {/* Export Dropdown */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsExportMenuOpen(!isExportMenuOpen);
                    }}
                    className="text-xs text-slate-500 hover:text-slate-800 px-2 py-1 rounded hover:bg-slate-100 flex items-center gap-1 cursor-pointer"
                  >
                    <span>Export</span>
                    <ChevronDown className="w-3 h-3" />
                  </button>

                  {isExportMenuOpen && (
                    <div
                      className="absolute right-0 top-full mt-1.5 w-44 bg-white border border-slate-200 rounded-xl shadow-lg z-30 py-1 text-xs divide-y divide-slate-100"
                      onClick={(e) => e.stopPropagation()}
                    >
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

                <button
                  type="button"
                  onClick={() => setIsDeletingTicket(true)}
                  className="text-xs text-slate-400 hover:text-rose-600 px-2 py-1 rounded hover:bg-rose-50 transition-colors cursor-pointer"
                  title="Delete ticket"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="text-xs text-slate-400 hover:text-slate-800 px-2 py-1 rounded hover:bg-slate-100 cursor-pointer ml-1 font-medium"
                >
                  Close
                </button>
              </div>
            </div>

            {/* Title Section */}
            <div className="px-6 pt-5 pb-4 border-b border-slate-100 bg-white">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 leading-snug">
                {ticket.title}
              </h2>
            </div>

            {/* ---------------------------------------------------- */}
            {/* Main Content Grid: 2 Columns Matching Screenshot     */}
            {/* ---------------------------------------------------- */}
            <div className="p-6 max-h-[calc(100vh-160px)] overflow-y-auto">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* ================================================= */}
                {/* LEFT COLUMN: Description, Relay, Time, Files     */}
                {/* ================================================= */}
                <div className="lg:col-span-8 space-y-7">
                  {/* 1. Description with Edit action */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                        Description
                      </h3>
                      {!isEditingDesc ? (
                        <button
                          type="button"
                          onClick={() => setIsEditingDesc(true)}
                          className="text-xs text-slate-400 hover:text-slate-700 flex items-center gap-1 font-medium cursor-pointer"
                        >
                          <Edit2 className="w-3 h-3" />
                          <span>Edit</span>
                        </button>
                      ) : (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setDescValue(ticket.description || '');
                              setIsEditingDesc(false);
                            }}
                            className="text-xs text-slate-500 hover:text-slate-800"
                          >
                            Cancel
                          </button>
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={handleSaveDescription}
                            isLoading={isSavingDesc}
                            className="text-xs h-7 px-2.5"
                          >
                            Save
                          </Button>
                        </div>
                      )}
                    </div>

                    {isEditingDesc ? (
                      <textarea
                        value={descValue}
                        onChange={(e) => setDescValue(e.target.value)}
                        rows={8}
                        className="w-full text-xs sm:text-sm p-3.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-sans leading-relaxed text-slate-800 bg-white"
                        placeholder="Enter detailed description, issue details, current behavior, and expected behavior..."
                      />
                    ) : (
                      <div className="text-xs sm:text-sm text-slate-700 whitespace-pre-wrap leading-relaxed space-y-2 bg-slate-50/50 p-4 rounded-xl border border-slate-200/70">
                        {ticket.description ? (
                          ticket.description
                        ) : (
                          <div className="text-slate-400 italic">
                            No description provided. Click "Edit" to add structured requirements, reproduction steps, or expected behavior.
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* 2. Work Relay (Handover Pipeline) */}
                  <div className="pt-2 border-t border-slate-100 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-bold text-slate-900 tracking-tight">
                          Work relay
                        </h4>
                        <span className="text-[11px] text-slate-400 font-medium">
                          {relay.current_stage === 'completed' || relay.qa_done ? '2 of 2 done' : '1 of 2 done'}
                        </span>
                      </div>
                    </div>

                    {/* Stepper Pipeline Cards */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Step 1: Frontend */}
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-medium">
                        <div className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                          <Check className="w-3 h-3 stroke-[2.5]" />
                        </div>
                        <span className="font-semibold text-slate-700">1. FE</span>
                        <span className="text-slate-400">·</span>
                        <span className="text-slate-600">{relay.fe_user || 'imran'}</span>
                      </div>

                      <ArrowRight className="w-3.5 h-3.5 text-slate-300" />

                      {/* Step 2: QA */}
                      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium ${
                        relay.qa_done
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                          : 'bg-indigo-50/70 border-indigo-200 text-indigo-900'
                      }`}>
                        {relay.qa_done ? (
                          <div className="w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0">
                            <Check className="w-3 h-3 stroke-[2.5]" />
                          </div>
                        ) : (
                          <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse shrink-0" />
                        )}
                        <span className="font-bold">2. QA • NOW</span>
                        <span className="text-slate-400">·</span>
                        <span>{relay.qa_user || 'Mujtaba Bilal'}</span>
                      </div>
                    </div>

                    {/* QA Handover Box */}
                    <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/60 text-xs space-y-2">
                      <div className="flex items-center justify-between text-slate-500">
                        <span className="font-bold text-[11px] text-slate-600 uppercase tracking-wider">
                          QA HANDOVER · {relay.qa_user || 'Mujtaba Bilal'}
                        </span>
                        {!isAddingHandoverNote && (
                          <button
                            type="button"
                            onClick={() => setIsAddingHandoverNote(true)}
                            className="text-indigo-600 hover:text-indigo-800 font-semibold text-xs cursor-pointer"
                          >
                            {relay.handover_notes ? 'Edit' : 'Add'}
                          </button>
                        )}
                      </div>

                      {isAddingHandoverNote ? (
                        <div className="space-y-2 pt-1">
                          <textarea
                            value={handoverNoteInput}
                            onChange={(e) => setHandoverNoteInput(e.target.value)}
                            placeholder="Add QA handover notes, instructions, testing credentials, or edge cases..."
                            rows={2}
                            className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setIsAddingHandoverNote(false)}
                              className="text-xs text-slate-500 hover:text-slate-800"
                            >
                              Cancel
                            </button>
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={handleSaveHandoverNote}
                              className="text-xs h-7 px-2.5"
                            >
                              Save Note
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-slate-500 italic">
                          {relay.handover_notes || 'Nothing recorded yet — optional, and the relay works without it.'}
                        </p>
                      )}
                    </div>

                    {/* Relay Actions */}
                    <div className="flex items-center gap-2 pt-1">
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={handleRelayDone}
                        leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
                        className="text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white"
                      >
                        {relay.qa_done ? 'QA Verified' : 'Mark my qa done'}
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleRelayHandBack}
                        leftIcon={<RotateCcw className="w-3.5 h-3.5 text-slate-500" />}
                        className="text-xs text-slate-700"
                      >
                        Hand back
                      </Button>
                    </div>

                    <p className="text-[11px] text-slate-400">
                      You are last — clicking this finishes the relay. The column is yours to move
                    </p>
                  </div>

                  {/* 3. Time & Cycle Tracking */}
                  <div className="pt-2 border-t border-slate-100 space-y-3">
                    <div className="flex items-center gap-2 text-xs text-slate-500 flex-wrap">
                      <span className="font-bold text-slate-900">Time</span>
                      <span>dev: <strong className="text-slate-700">{timeTracking.dev_time_str}</strong></span>
                      <span>·</span>
                      <span>qa: <strong className="text-slate-700">{timeTracking.qa_time_str}</strong></span>
                      <span>·</span>
                      <span><strong className="text-slate-700">{timeTracking.cycles}</strong> cycles</span>
                      <span>·</span>
                      <span>total: <strong className="text-slate-900">{timeTracking.total_time_str}</strong></span>
                    </div>

                    {/* Segmented Color Timeline Bar */}
                    <div className="w-full h-2 rounded-full overflow-hidden bg-slate-100 flex">
                      <div className="h-full bg-sky-500 w-[45%]" title="Dev: 45%" />
                      <div className="h-full bg-amber-500 w-[20%]" title="QA Cycle 1: 20%" />
                      <div className="h-full bg-indigo-500 w-[20%]" title="Dev Cycle 2: 20%" />
                      <div className="h-full bg-emerald-500 w-[15%]" title="QA Review: 15%" />
                    </div>

                    {/* Timeline Stage History List */}
                    <div className="space-y-1.5 pt-1 text-xs text-slate-600 font-mono">
                      {timeTracking.stages.map((st, idx) => (
                        <div key={idx} className="flex items-center justify-between gap-2 py-0.5">
                          <div className="flex items-center gap-2 truncate">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
                            <span className="font-semibold text-slate-800">
                              {st.stage}
                              {st.cycle ? `: cycle ${st.cycle}` : ''}
                            </span>
                            <span className="text-slate-400 font-sans text-[11px]">
                              moved by {st.moved_by}
                              {st.is_current ? ' · still here' : ''}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 shrink-0 text-slate-400 text-[11px]">
                            <span>{st.timestamp}</span>
                            <span className="font-bold text-slate-700 w-14 text-right">
                              {st.duration_str}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 4. Attachments (Cards matching update.jpg) */}
                  <div className="pt-2 border-t border-slate-100 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-bold text-slate-900 tracking-tight">
                          Attachments
                        </h4>
                        <span className="text-xs text-slate-400">
                          {totalAttachments} • {formatFileSize(totalAttachmentBytes)}
                        </span>
                      </div>
                    </div>

                    {/* Choose files & Drag info */}
                    <div className="p-3 rounded-xl border border-dashed border-slate-300 bg-slate-50/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2">
                        <input
                          ref={fileInputRef}
                          type="file"
                          className="hidden"
                          onChange={handleFileUpload}
                          accept=".png,.jpg,.jpeg,.webp,.pdf,.docx,.xlsx,.zip,.txt"
                        />
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isUploading}
                          className="px-3 py-1.5 rounded-lg bg-slate-900 text-white font-medium hover:bg-slate-800 transition-colors cursor-pointer text-xs shadow-2xs"
                        >
                          {isUploading ? 'Uploading...' : 'Choose files'}
                        </button>
                        <span className="text-slate-400 text-[11px]">No file chosen</span>
                      </div>
                      <span className="text-[11px] text-slate-400">
                        Drag files here. Images are compressed automatically; video files are rejected.
                      </span>
                    </div>

                    {/* Image Cards Grid */}
                    {totalAttachments === 0 ? (
                      <p className="text-xs text-slate-400 py-4 text-center bg-slate-50 rounded-xl border border-slate-200">
                        No files attached to this ticket yet.
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                        {ticket.attachments?.map((att, idx) => (
                          <div
                            key={att.id}
                            className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs flex flex-col justify-between"
                          >
                            {/* Image Thumbnail Preview */}
                            <div
                              onClick={() => {
                                const imgIdx = allUploadedImages.findIndex((img) => img.url === att.file_url);
                                handleOpenImageGallery(imgIdx >= 0 ? imgIdx : 0);
                              }}
                              className="h-28 w-full bg-slate-100 relative group/att cursor-pointer overflow-hidden border-b border-slate-100"
                            >
                              {att.file_type?.startsWith('image/') || /\.(png|jpe?g|webp|gif|svg)$/i.test(att.file_name) ? (
                                <img
                                  src={att.file_url}
                                  alt={att.file_name}
                                  className="w-full h-full object-cover group-hover/att:scale-102 transition-transform duration-200"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-400">
                                  <Paperclip className="w-8 h-8" />
                                </div>
                              )}
                              <div className="absolute inset-0 bg-black/25 opacity-0 group-hover/att:opacity-100 flex items-center justify-center transition-opacity text-white text-xs font-medium gap-1">
                                <Maximize2 className="w-3.5 h-3.5" />
                                <span>Preview</span>
                              </div>
                            </div>

                            {/* Card Footer Details */}
                            <div className="p-3 text-xs flex items-center justify-between gap-2">
                              <div className="min-w-0">
                                <span className="font-bold text-slate-800 block truncate" title={att.file_name}>
                                  {att.file_name}
                                </span>
                                <span className="text-[10px] text-slate-400 block">
                                  {formatFileSize(att.file_size)} · uncompressed
                                </span>
                                <span className="text-[10px] text-slate-400 block">
                                  {reporterName} · 4h ago
                                </span>
                              </div>

                              <div className="flex items-center gap-2 shrink-0 text-xs">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const imgIdx = allUploadedImages.findIndex((img) => img.url === att.file_url);
                                    handleOpenImageGallery(imgIdx >= 0 ? imgIdx : 0);
                                  }}
                                  className="text-slate-500 hover:text-slate-900 font-medium cursor-pointer"
                                >
                                  View
                                </button>
                                <span className="text-slate-300">·</span>
                                <button
                                  type="button"
                                  onClick={() => attachmentService.downloadAttachment(att)}
                                  className="text-slate-500 hover:text-slate-900 font-medium cursor-pointer"
                                >
                                  Download
                                </button>
                                <span className="text-slate-300">·</span>
                                <button
                                  type="button"
                                  onClick={() => setAttachmentToDelete(att)}
                                  className="text-rose-500 hover:text-rose-700 font-medium cursor-pointer"
                                >
                                  Delete
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* 5. Discussion / Voice Notes Tabs */}
                  <div className="pt-2 border-t border-slate-100 space-y-4">
                    <div className="flex items-center gap-3 border-b border-slate-200">
                      <button
                        type="button"
                        onClick={() => setActiveExtraTab('comments')}
                        className={`pb-2 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer border-b-2 ${
                          activeExtraTab === 'comments'
                            ? 'border-indigo-600 text-indigo-600'
                            : 'border-transparent text-slate-400 hover:text-slate-700'
                        }`}
                      >
                        Discussion Comments ({ticket.comments?.length || 0})
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveExtraTab('notes')}
                        className={`pb-2 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer border-b-2 ${
                          activeExtraTab === 'notes'
                            ? 'border-amber-600 text-amber-700'
                            : 'border-transparent text-slate-400 hover:text-slate-700'
                        }`}
                      >
                        Personal Notes & Reminders
                      </button>
                    </div>

                    {activeExtraTab === 'comments' ? (
                      <TicketCommentsSection
                        ticketId={ticket.id}
                        onCommentsUpdated={() => onRefreshTicket(ticket.id)}
                      />
                    ) : (
                      <div className="bg-amber-50/40 border border-amber-200/70 rounded-xl p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <StickyNote className="w-4 h-4 text-amber-700" />
                            <h4 className="text-xs font-bold text-amber-950 uppercase tracking-wider">
                              Notes & Reminders
                            </h4>
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
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] text-amber-800 font-medium">Type or dictate with voice:</span>
                              <button
                                type="button"
                                onClick={toggleNotesVoice}
                                className={`text-[11px] font-medium flex items-center gap-1 px-2.5 py-1 rounded-md cursor-pointer transition-colors ${
                                  isNotesListening
                                    ? 'bg-rose-100 text-rose-700 font-semibold animate-pulse'
                                    : 'bg-white border border-amber-300 text-amber-900 hover:bg-amber-100'
                                }`}
                              >
                                {isNotesListening ? (
                                  <>
                                    <MicOff className="w-3.5 h-3.5 text-rose-600" />
                                    <span>Listening...</span>
                                  </>
                                ) : (
                                  <>
                                    <Mic className="w-3.5 h-3.5 text-amber-700" />
                                    <span>Voice Dictate</span>
                                  </>
                                )}
                              </button>
                            </div>
                            <textarea
                              value={notesValue}
                              onChange={(e) => setNotesValue(e.target.value)}
                              placeholder="Add personal notes, edge cases, PR links, or scratchpad memos..."
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
                                  if (isNotesListening) stopNotesListening();
                                }}
                                className="text-xs text-slate-600 hover:bg-amber-100/50"
                              >
                                Cancel
                              </Button>
                              <Button
                                variant="primary"
                                size="sm"
                                onClick={() => {
                                  if (isNotesListening) stopNotesListening();
                                  handleSaveInlineNotes();
                                }}
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
                    )}
                  </div>
                </div>

                {/* ================================================= */}
                {/* RIGHT SIDEBAR: Status, Severity, Assignments, Dates*/}
                {/* ================================================= */}
                <div className="lg:col-span-4 space-y-5 lg:border-l lg:border-slate-100 lg:pl-6">
                  {/* Status */}
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-600">
                      Status
                    </label>
                    <div className="relative">
                      <select
                        value={ticket.status_id}
                        onChange={(e) => onStatusChange(ticket.id, e.target.value)}
                        className="w-full text-xs font-medium bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer appearance-none shadow-2xs"
                      >
                        {statuses
                          .filter((s, idx, arr) => arr.findIndex((x) => x.id === s.id) === idx)
                          .map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name}
                            </option>
                          ))}
                      </select>
                      <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>

                  {/* Severity */}
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-600">
                      Severity
                    </label>
                    <div className="relative">
                      <select
                        value={severity}
                        onChange={(e) => handleUpdateField({ severity: e.target.value as TicketSeverity })}
                        className="w-full text-xs font-medium bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer appearance-none shadow-2xs capitalize"
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="critical">Critical</option>
                      </select>
                      <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                    <p className="text-[11px] text-slate-400 leading-tight pt-0.5">
                      How hard it is in production — separate from priority, which is when it gets done.
                    </p>
                  </div>

                  {/* Dev mask */}
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-600">
                      Dev mask
                    </label>
                    <div className="relative">
                      <select
                        value={devMask}
                        onChange={(e) => handleUpdateField({ dev_mask: e.target.value as TicketDevMask })}
                        className="w-full text-xs font-medium bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer appearance-none shadow-2xs capitalize"
                      >
                        <option value="frontend">Frontend</option>
                        <option value="backend">Backend</option>
                        <option value="flutter">Flutter</option>
                        <option value="fullstack">Fullstack</option>
                        <option value="devops">DevOps</option>
                        <option value="qa">QA</option>
                      </select>
                      <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                    <p className="text-[11px] text-slate-400 leading-tight pt-0.5">
                      Rails credit list dev check in each branch full, not half in each
                    </p>
                  </div>

                  {/* Colour Swatch Picker */}
                  <div className="space-y-1.5 pt-1">
                    <label className="block text-xs font-semibold text-slate-600">
                      Colour
                    </label>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {COLOR_SWATCHES.map((swatch) => (
                        <button
                          key={swatch.id}
                          type="button"
                          onClick={() => handleUpdateField({ color: swatch.id })}
                          className={`w-5 h-5 rounded-full ${swatch.bg} ${swatch.border} border transition-all cursor-pointer ${
                            currentColor === swatch.id
                              ? 'ring-2 ring-offset-2 ring-slate-800 scale-110'
                              : 'hover:scale-105'
                          }`}
                          title={`Color: ${swatch.label}`}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Work assignments (4 roles) */}
                  <div className="space-y-2.5 pt-2 border-t border-slate-100">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-semibold text-slate-700">
                        Work assignments
                      </label>
                      <span className="text-[11px] text-slate-400">
                        {pulledCount} of 4 pulled
                      </span>
                    </div>

                    <div className="space-y-2 text-xs">
                      {/* Backend */}
                      <div className="space-y-1">
                        <span className="text-[11px] text-slate-500 block">Backend</span>
                        <div className="relative">
                          <select
                            value={assignments.backend || 'Nobody yet'}
                            onChange={(e) => handleUpdateAssignment('backend', e.target.value)}
                            className="w-full text-xs font-medium bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer appearance-none shadow-2xs"
                          >
                            {TEAM_MEMBERS.map((m) => (
                              <option key={m} value={m}>
                                {m}
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>
                      </div>

                      {/* Frontend */}
                      <div className="space-y-1">
                        <span className="text-[11px] text-slate-500 block">Frontend</span>
                        <div className="relative">
                          <select
                            value={assignments.frontend || 'imran'}
                            onChange={(e) => handleUpdateAssignment('frontend', e.target.value)}
                            className="w-full text-xs font-medium bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer appearance-none shadow-2xs"
                          >
                            {TEAM_MEMBERS.map((m) => (
                              <option key={m} value={m}>
                                {m}
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>
                      </div>

                      {/* Flutter */}
                      <div className="space-y-1">
                        <span className="text-[11px] text-slate-500 block">Flutter</span>
                        <div className="relative">
                          <select
                            value={assignments.flutter || 'Nobody yet'}
                            onChange={(e) => handleUpdateAssignment('flutter', e.target.value)}
                            className="w-full text-xs font-medium bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer appearance-none shadow-2xs"
                          >
                            {TEAM_MEMBERS.map((m) => (
                              <option key={m} value={m}>
                                {m}
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>
                      </div>

                      {/* QA */}
                      <div className="space-y-1">
                        <span className="text-[11px] text-slate-500 block">QA</span>
                        <div className="relative">
                          <select
                            value={assignments.qa || 'Mujtaba Bilal'}
                            onChange={(e) => handleUpdateAssignment('qa', e.target.value)}
                            className="w-full text-xs font-medium bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer appearance-none shadow-2xs"
                          >
                            {TEAM_MEMBERS.map((m) => (
                              <option key={m} value={m}>
                                {m}
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Reporter */}
                  <div className="pt-2 border-t border-slate-100 space-y-1.5">
                    <span className="text-xs font-semibold text-slate-600 block">Reporter</span>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0">
                        {reporterName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                      <span className="text-xs font-medium text-slate-800">{reporterName}</span>
                    </div>
                  </div>

                  {/* Dates */}
                  <div className="pt-2 border-t border-slate-100 space-y-3 text-xs">
                    {/* Start Date */}
                    <div className="space-y-1">
                      <span className="text-[11px] font-semibold text-slate-600 block">Start date</span>
                      <div className="relative">
                        <input
                          type="date"
                          value={ticket.start_date ? ticket.start_date.slice(0, 10) : ''}
                          onChange={(e) => handleUpdateField({ start_date: e.target.value ? new Date(e.target.value).toISOString() : null })}
                          className="w-full text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                        />
                      </div>
                    </div>

                    {/* Due Date */}
                    <div className="space-y-1">
                      <span className="text-[11px] font-semibold text-slate-600 block">Due date</span>
                      <div className="relative">
                        <input
                          type="date"
                          value={ticket.due_date ? ticket.due_date.slice(0, 10) : ''}
                          onChange={(e) => handleUpdateField({ due_date: e.target.value ? new Date(e.target.value).toISOString() : null })}
                          className="w-full text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                        />
                      </div>
                    </div>

                    {/* Timestamps */}
                    <div className="pt-2 border-t border-slate-100 space-y-1 text-[11px] text-slate-400">
                      <div>Created {new Date(ticket.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                      <div>Updated {new Date(ticket.updated_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Lightbox Modal */}
      <ImageLightboxModal
        isOpen={isLightboxOpen}
        images={lightboxImages}
        initialIndex={lightboxIndex}
        onClose={() => setIsLightboxOpen(false)}
      />

      {/* Delete Ticket Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isDeletingTicket}
        onClose={() => setIsDeletingTicket(false)}
        onConfirm={() => {
          setIsDeletingTicket(false);
          onDelete(ticket.id);
        }}
        title={`Delete Ticket ${ticket.ticket_number}`}
        message="Are you sure you want to permanently delete this ticket and all attached files, comments, and history?"
        confirmLabel="Delete Ticket"
      />

      {/* Delete Attachment Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(attachmentToDelete)}
        onClose={() => setAttachmentToDelete(null)}
        onConfirm={handleDeleteAttachment}
        title="Delete Attachment"
        message={`Are you sure you want to delete "${attachmentToDelete?.file_name}"?`}
        confirmLabel="Delete Attachment"
      />
    </>
  );
};
