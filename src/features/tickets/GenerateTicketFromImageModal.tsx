import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  UploadCloud,
  Image as ImageIcon,
  X,
  Check,
  AlertCircle,
  FileText,
  StickyNote,
  Tag,
  Flag,
  ArrowRight,
  Clipboard,
  RefreshCw,
  FolderKanban,
} from 'lucide-react';
import { Modal } from '../../components/Modal';
import { Button } from '../../components/Button';
import { Project, Status, Category, TicketPriority } from '../../types';
import { PRIORITY_CONFIG } from '../../config/ticketCategories';
import { ticketService } from './ticketService';
import { TicketFormData } from './ticketTypes';

export interface GenerateTicketFromImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  projects: Project[];
  statuses: Status[];
  categories: Category[];
  currentProjectId?: string;
  defaultStatusId?: string;
  onTicketCreated?: () => void;
  onOpenFullFormWithDraft?: (draft: TicketFormData, imageFile?: File) => void;
}

interface AnalyzedTicketResult {
  title: string;
  description: string;
  notes: string;
  priority: TicketPriority;
  category?: string;
  summary?: string;
}

export const GenerateTicketFromImageModal: React.FC<GenerateTicketFromImageModalProps> = ({
  isOpen,
  onClose,
  projects,
  statuses,
  categories,
  currentProjectId,
  defaultStatusId,
  onTicketCreated,
  onOpenFullFormWithDraft,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [additionalContext, setAdditionalContext] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [analyzedResult, setAnalyzedResult] = useState<AnalyzedTicketResult | null>(null);

  const [targetProjectId, setTargetProjectId] = useState(currentProjectId || projects[0]?.id || '');
  const [targetStatusId, setTargetStatusId] = useState(defaultStatusId || statuses[0]?.id || '');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [selectedPriority, setSelectedPriority] = useState<TicketPriority>('medium');

  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync defaults when modal opens
  useEffect(() => {
    if (isOpen) {
      const pId = currentProjectId || projects[0]?.id || '';
      setTargetProjectId(pId);
      setTargetStatusId(defaultStatusId || statuses[0]?.id || '');
      setSelectedCategoryId(categories[0]?.id || '');
    } else {
      // Reset state on close
      setSelectedFile(null);
      setPreviewUrl(null);
      setAdditionalContext('');
      setIsAnalyzing(false);
      setErrorMsg(null);
      setAnalyzedResult(null);
    }
  }, [isOpen, currentProjectId, defaultStatusId, projects, statuses, categories]);

  // Support clipboard paste (Cmd+V / Ctrl+V) for screenshots anywhere when modal is open
  useEffect(() => {
    if (!isOpen) return;

    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.indexOf('image') !== -1) {
          const file = item.getAsFile();
          if (file) {
            handleFileSelect(file);
            break;
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [isOpen]);

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setErrorMsg('Please select a valid image file (PNG, JPG, WEBP, GIF, SVG).');
      return;
    }

    setErrorMsg(null);
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string);
    };
    reader.readAsDataURL(file);
    setAnalyzedResult(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleAnalyzeImage = async () => {
    if (!previewUrl || !selectedFile) {
      setErrorMsg('Please upload or paste an image first.');
      return;
    }

    setIsAnalyzing(true);
    setErrorMsg(null);

    try {
      const categoryNames = categories.map((c) => c.name);

      const res = await fetch('/api/analyze-ticket-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: previewUrl,
          mimeType: selectedFile.type,
          additionalPrompt: additionalContext.trim(),
          categories: categoryNames,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to analyze image with Gemini');
      }

      const ticketData = data.ticket as AnalyzedTicketResult;
      setAnalyzedResult(ticketData);

      // Auto-select matching category if returned
      if (ticketData.category) {
        const matched = categories.find(
          (c) => c.name.toLowerCase() === ticketData.category?.toLowerCase()
        );
        if (matched) {
          setSelectedCategoryId(matched.id);
        } else if (categories.length > 0) {
          setSelectedCategoryId(categories[0].id);
        }
      }

      if (ticketData.priority) {
        setSelectedPriority(ticketData.priority);
      }
    } catch (err: any) {
      console.error('Image analysis error:', err);
      setErrorMsg(err.message || 'Failed to analyze image. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Option A: Quick-create ticket directly
  const handleQuickCreateTicket = async () => {
    if (!analyzedResult) return;
    setIsSaving(true);
    try {
      await ticketService.createTicket({
        title: analyzedResult.title,
        description: analyzedResult.description,
        notes: analyzedResult.notes,
        project_id: targetProjectId,
        status_id: targetStatusId,
        category_id: selectedCategoryId || categories[0]?.id || '',
        priority: selectedPriority,
        due_date: null,
        files: selectedFile ? [selectedFile] : undefined,
      });

      if (onTicketCreated) onTicketCreated();
      onClose();
    } catch (err: any) {
      console.error('Quick ticket creation failed:', err);
      setErrorMsg(err.message || 'Failed to create ticket.');
    } finally {
      setIsSaving(false);
    }
  };

  // Option B: Open in full ticket editor with prefilled data + image
  const handleOpenInEditor = () => {
    if (!analyzedResult) return;
    if (onOpenFullFormWithDraft) {
      onOpenFullFormWithDraft(
        {
          title: analyzedResult.title,
          description: analyzedResult.description,
          notes: analyzedResult.notes,
          project_id: targetProjectId,
          status_id: targetStatusId,
          category_id: selectedCategoryId || categories[0]?.id || '',
          priority: selectedPriority,
          due_date: null,
          files: selectedFile ? [selectedFile] : undefined,
        },
        selectedFile || undefined
      );
    }
    onClose();
  };

  const priorityConf = PRIORITY_CONFIG[selectedPriority] || PRIORITY_CONFIG.medium;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Generate Ticket from Image"
      subtitle="Upload or paste a screenshot, UI mockup, or bug photo to generate an actionable ticket with Gemini Vision."
      maxWidth="2xl"
    >
      <div className="space-y-4">
        {errorMsg && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Upload Drop Zone / Paste Area */}
        {!previewUrl ? (
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-indigo-200 hover:border-indigo-400 bg-indigo-50/40 hover:bg-indigo-50/70 rounded-2xl p-6 sm:p-8 text-center cursor-pointer transition-all duration-200 group relative"
          >
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept="image/*"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFileSelect(e.target.files[0]);
                }
              }}
            />
            <div className="w-12 h-12 mx-auto rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform shadow-xs">
              <UploadCloud className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-slate-800 mb-1">
              Drop screenshot or click to browse
            </h4>
            <p className="text-xs text-slate-500 mb-3 max-w-sm mx-auto">
              Supports PNG, JPG, WEBP, GIF, SVG screenshots, bug logs, whiteboard sketches & design mockups
            </p>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-indigo-200 text-[11px] font-semibold text-indigo-700 shadow-2xs">
              <Clipboard className="w-3.5 h-3.5" />
              <span>ProTip: Press Ctrl+V / Cmd+V to paste screenshot</span>
            </div>
          </div>
        ) : (
          /* Preview of Uploaded Image */
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 relative">
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="flex items-center gap-2">
                <div className="p-1 rounded bg-indigo-100 text-indigo-700">
                  <ImageIcon className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800 truncate max-w-xs">
                    {selectedFile?.name || 'Pasted Image'}
                  </h4>
                  <p className="text-[10px] text-slate-400">
                    {(selectedFile ? (selectedFile.size / 1024).toFixed(1) : 0)} KB • Ready for Vision Analysis
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setSelectedFile(null);
                  setPreviewUrl(null);
                  setAnalyzedResult(null);
                }}
                className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-white transition-colors cursor-pointer"
                title="Remove image"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="max-h-56 overflow-hidden rounded-xl border border-slate-200/80 bg-white flex items-center justify-center">
              <img
                src={previewUrl}
                alt="Upload preview"
                className="max-h-56 w-auto object-contain"
              />
            </div>
          </div>
        )}

        {/* Optional Context Prompt */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Optional Instructions / Guidance for AI
          </label>
          <input
            type="text"
            value={additionalContext}
            onChange={(e) => setAdditionalContext(e.target.value)}
            placeholder="e.g. Focus on the red alert message, or 'Create a bug ticket for mobile layout'"
            className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
        </div>

        {/* Analyze Action Button */}
        {previewUrl && !analyzedResult && (
          <div className="pt-1">
            <Button
              variant="indigo"
              size="md"
              onClick={handleAnalyzeImage}
              isLoading={isAnalyzing}
              leftIcon={<Sparkles className="w-4 h-4 text-amber-300" />}
              className="w-full justify-center font-semibold"
            >
              {isAnalyzing ? 'Analyzing Image with Gemini Vision...' : 'Analyze Image & Generate Ticket'}
            </Button>
          </div>
        )}

        {/* AI Analyzed Results Section */}
        {analyzedResult && (
          <div className="mt-3 p-4 bg-slate-50 border border-indigo-100 rounded-2xl space-y-3.5 shadow-2xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200/80">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  AI Generated Ticket Draft
                </span>
              </div>
              <button
                type="button"
                onClick={handleAnalyzeImage}
                disabled={isAnalyzing}
                className="text-[11px] text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className={`w-3 h-3 ${isAnalyzing ? 'animate-spin' : ''}`} />
                <span>Re-analyze</span>
              </button>
            </div>

            {/* Generated Title */}
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Title
              </span>
              <input
                type="text"
                value={analyzedResult.title}
                onChange={(e) =>
                  setAnalyzedResult({ ...analyzedResult, title: e.target.value })
                }
                className="w-full text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            {/* Priority & Category Settings */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Priority
                </label>
                <select
                  value={selectedPriority}
                  onChange={(e) => setSelectedPriority(e.target.value as TicketPriority)}
                  className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-800 font-medium cursor-pointer"
                >
                  <option value="low">Low Priority</option>
                  <option value="medium">Medium Priority</option>
                  <option value="high">High Priority</option>
                  <option value="critical">Critical Priority</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Category
                </label>
                <select
                  value={selectedCategoryId}
                  onChange={(e) => setSelectedCategoryId(e.target.value)}
                  className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-800 font-medium cursor-pointer"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Generated Description */}
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Description & Acceptance Criteria
              </span>
              <textarea
                rows={3}
                value={analyzedResult.description}
                onChange={(e) =>
                  setAnalyzedResult({ ...analyzedResult, description: e.target.value })
                }
                className="w-full text-xs p-2.5 rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-sans leading-relaxed"
              />
            </div>

            {/* Generated Notes */}
            {analyzedResult.notes && (
              <div className="bg-amber-50/60 border border-amber-200/80 rounded-xl p-3">
                <span className="text-[10px] font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1 mb-1">
                  <StickyNote className="w-3 h-3 text-amber-600" />
                  <span>Technical Notes & Caveats</span>
                </span>
                <textarea
                  rows={2}
                  value={analyzedResult.notes}
                  onChange={(e) =>
                    setAnalyzedResult({ ...analyzedResult, notes: e.target.value })
                  }
                  className="w-full text-xs p-2 rounded-lg border border-amber-200 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500 font-sans leading-relaxed"
                />
              </div>
            )}

            {/* Final Action Buttons */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-end gap-2.5">
              <Button
                variant="outline"
                size="sm"
                onClick={handleOpenInEditor}
                className="w-full sm:w-auto"
              >
                Open in Full Form Editor
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleQuickCreateTicket}
                isLoading={isSaving}
                leftIcon={<Check className="w-4 h-4" />}
                className="w-full sm:w-auto font-semibold"
              >
                Create Ticket with Image
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
