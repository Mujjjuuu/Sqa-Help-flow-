import React, { useState, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Mic, MicOff, Sparkles, Image as ImageIcon, AlertCircle } from 'lucide-react';
import { Modal } from '../../components/Modal';
import { Input } from '../../components/Input';
import { Textarea } from '../../components/Textarea';
import { Select } from '../../components/Select';
import { Button } from '../../components/Button';
import { FileUpload } from '../../components/FileUpload';
import { Ticket, Status, Category, Project, TicketPriority } from '../../types';
import { TicketFormData } from './ticketTypes';
import { categoryService } from '../../services/categoryService';
import { useSpeechRecognition } from '../../hooks/useVoiceSpeech';

const ticketSchema = z.object({
  title: z.string().min(2, 'Title must be at least 2 characters').max(150, 'Max 150 characters'),
  description: z.string().max(2000, 'Max 2000 characters').optional(),
  notes: z.string().max(2000, 'Max 2000 characters').optional(),
  project_id: z.string().min(1, 'Project is required'),
  category_id: z.string().min(1, 'Category is required'),
  status_id: z.string().min(1, 'Status is required'),
  priority: z.enum(['low', 'medium', 'high', 'critical', 'urgent']),
  severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  dev_mask: z.enum(['frontend', 'backend', 'flutter', 'fullstack', 'devops', 'qa']).optional(),
  ref_code: z.string().optional(),
  ticket_type: z.string().optional(),
  start_date: z.string().optional().nullable(),
  due_date: z.string().optional().nullable(),
});

export interface TicketFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: TicketFormData) => Promise<void>;
  projects: Project[];
  statuses: Status[];
  categories: Category[];
  initialData?: Ticket | null;
  initialDraft?: TicketFormData | null;
  initialFiles?: File[];
  defaultProjectId?: string;
  defaultStatusId?: string;
  onCategoryAdded?: (category: Category) => void;
  isLoading?: boolean;
}

export const TicketForm: React.FC<TicketFormProps> = ({
  isOpen,
  onClose,
  onSubmit,
  projects,
  statuses,
  categories,
  initialData,
  initialDraft,
  initialFiles,
  defaultProjectId,
  defaultStatusId,
  onCategoryAdded,
  isLoading = false,
}) => {
  const [attachedFiles, setAttachedFiles] = useState<File[]>(initialFiles || []);
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isAddingCat, setIsAddingCat] = useState(false);
  const [activeVoiceField, setActiveVoiceField] = useState<'title' | 'description' | 'notes' | null>(null);

  // Vision auto-fill state
  const [isAnalyzingImage, setIsAnalyzingImage] = useState(false);
  const [visionError, setVisionError] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const {
    isListening,
    startListening,
    stopListening,
    error: speechError,
  } = useSpeechRecognition();

  const activeProjectId = initialData?.project_id || defaultProjectId || projects[0]?.id || '';

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<TicketFormData>({
    resolver: zodResolver(ticketSchema),
    defaultValues: {
      title: initialDraft?.title || initialData?.title || '',
      description: initialDraft?.description || initialData?.description || '',
      notes: initialDraft?.notes || initialData?.notes || '',
      project_id: initialDraft?.project_id || activeProjectId,
      status_id: initialDraft?.status_id || initialData?.status_id || defaultStatusId || statuses[0]?.id || '',
      category_id: initialDraft?.category_id || initialData?.category_id || categories[0]?.id || '',
      priority: initialDraft?.priority || initialData?.priority || 'medium',
      due_date: initialDraft?.due_date
        ? initialDraft.due_date.slice(0, 10)
        : initialData?.due_date
        ? initialData.due_date.slice(0, 10)
        : '',
    },
  });

  const selectedProjectId = watch('project_id');

  const toggleVoiceForField = (field: 'title' | 'description' | 'notes') => {
    if (isListening && activeVoiceField === field) {
      stopListening();
      setActiveVoiceField(null);
    } else {
      if (isListening) {
        stopListening();
      }
      setActiveVoiceField(field);
      startListening((spokenText) => {
        const currentVal = watch(field) || '';
        const updated = currentVal ? `${currentVal.trim()} ${spokenText}` : spokenText;
        setValue(field, updated, { shouldValidate: true, shouldDirty: true });
      });
    }
  };

  useEffect(() => {
    if (!isListening) {
      setActiveVoiceField(null);
    }
  }, [isListening]);

  useEffect(() => {
    if (initialDraft) {
      reset({
        title: initialDraft.title,
        description: initialDraft.description || '',
        notes: initialDraft.notes || '',
        project_id: initialDraft.project_id || defaultProjectId || projects[0]?.id || '',
        category_id: initialDraft.category_id || categories[0]?.id || '',
        status_id: initialDraft.status_id || defaultStatusId || statuses[0]?.id || '',
        priority: initialDraft.priority || 'medium',
        severity: initialDraft.severity || 'high',
        dev_mask: initialDraft.dev_mask || 'frontend',
        ref_code: initialDraft.ref_code || 'PMIC-078',
        ticket_type: initialDraft.ticket_type || 'Modification',
        start_date: initialDraft.start_date ? initialDraft.start_date.slice(0, 10) : '',
        due_date: initialDraft.due_date ? initialDraft.due_date.slice(0, 10) : '',
      });
      if (initialFiles) setAttachedFiles(initialFiles);
    } else if (initialData) {
      reset({
        title: initialData.title,
        description: initialData.description || '',
        notes: initialData.notes || '',
        project_id: initialData.project_id,
        category_id: initialData.category_id,
        status_id: initialData.status_id,
        priority: initialData.priority,
        severity: initialData.severity || 'high',
        dev_mask: initialData.dev_mask || 'frontend',
        ref_code: initialData.ref_code || 'PMIC-078',
        ticket_type: initialData.ticket_type || 'Modification',
        start_date: initialData.start_date ? initialData.start_date.slice(0, 10) : '',
        due_date: initialData.due_date ? initialData.due_date.slice(0, 10) : '',
      });
      setAttachedFiles([]);
    } else {
      reset({
        title: '',
        description: '',
        notes: '',
        project_id: defaultProjectId || projects[0]?.id || '',
        category_id: categories[0]?.id || '',
        status_id: defaultStatusId || statuses[0]?.id || '',
        priority: 'medium',
        severity: 'high',
        dev_mask: 'frontend',
        ref_code: 'PMIC-078',
        ticket_type: 'Modification',
        start_date: '',
        due_date: '',
      });
      setAttachedFiles([]);
    }
  }, [initialData, initialDraft, initialFiles, defaultProjectId, defaultStatusId, isOpen, reset, projects, statuses, categories]);

  // Handle direct image analysis & auto-fill from screenshot
  const handleAutoFillFromImage = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setVisionError('Please select a valid image file (PNG, JPG, WEBP, GIF).');
      return;
    }

    setIsAnalyzingImage(true);
    setVisionError(null);

    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64Data = e.target?.result as string;
      try {
        const categoryNames = categories.map((c) => c.name);

        const res = await fetch('/api/analyze-ticket-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageBase64: base64Data,
            mimeType: file.type,
            categories: categoryNames,
          }),
        });

        const data = await res.json();
        if (!res.ok || data.error) {
          throw new Error(data.error || 'Failed to analyze image with Gemini');
        }

        const ticketData = data.ticket;

        // Auto-fill form fields
        if (ticketData.title) setValue('title', ticketData.title, { shouldValidate: true, shouldDirty: true });
        if (ticketData.description) setValue('description', ticketData.description, { shouldValidate: true, shouldDirty: true });
        if (ticketData.notes) setValue('notes', ticketData.notes, { shouldValidate: true, shouldDirty: true });

        if (ticketData.priority) {
          const validPriorities = ['low', 'medium', 'high', 'critical'];
          const prio = String(ticketData.priority).toLowerCase() as TicketPriority;
          if (validPriorities.includes(prio)) {
            setValue('priority', prio, { shouldValidate: true, shouldDirty: true });
          }
        }

        if (ticketData.category) {
          const matched = categories.find(
            (c) => c.name.toLowerCase() === ticketData.category?.toLowerCase()
          );
          if (matched) {
            setValue('category_id', matched.id, { shouldValidate: true, shouldDirty: true });
          }
        }

        // Attach image automatically to ticket files
        setAttachedFiles((prev) => [...prev, file]);
      } catch (err: any) {
        console.error('Vision auto-fill error:', err);
        setVisionError(err.message || 'Failed to analyze image.');
      } finally {
        setIsAnalyzingImage(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return;
    setIsAddingCat(true);
    try {
      const created = await categoryService.createCategory(selectedProjectId, newCategoryName.trim());
      if (onCategoryAdded) onCategoryAdded(created);
      setValue('category_id', created.id);
      setNewCategoryName('');
      setShowNewCategoryInput(false);
    } catch (e) {
      console.error('Failed to create category:', e);
    } finally {
      setIsAddingCat(false);
    }
  };

  const onFormSubmit = async (data: TicketFormData) => {
    await onSubmit({
      ...data,
      due_date: data.due_date ? new Date(data.due_date).toISOString() : null,
      files: attachedFiles,
    });
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? `Edit Ticket ${initialData.ticket_number}` : 'Create New Ticket'}
      subtitle="Fill in task details, voice dictation, categorization, and attachments."
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
        {speechError && (
          <div className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-2.5">
            {speechError}
          </div>
        )}

        {visionError && (
          <div className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-2.5 flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{visionError}</span>
          </div>
        )}

        {/* AI Vision Auto-populate Bar */}
        {!initialData && (
          <div className="p-3 bg-gradient-to-r from-indigo-50/90 to-purple-50/70 border border-indigo-200/80 rounded-2xl flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-indigo-600 text-white shadow-2xs">
                <Sparkles className="w-4 h-4 text-amber-300" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900">
                  Auto-fill from Screenshot / Image
                </h4>
                <p className="text-[11px] text-slate-500">
                  Upload an image to draft title, notes, priority & category
                </p>
              </div>
            </div>

            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleAutoFillFromImage(e.target.files[0]);
                }
              }}
            />

            <Button
              type="button"
              variant="ai"
              size="sm"
              isLoading={isAnalyzingImage}
              onClick={() => imageInputRef.current?.click()}
              leftIcon={<ImageIcon className="w-3.5 h-3.5 text-indigo-600" />}
            >
              {isAnalyzingImage ? 'Analyzing Image...' : 'Upload Image'}
            </Button>
          </div>
        )}

        {/* Project Selection if multiple projects exist and not fixed */}
        {projects.length > 1 && !defaultProjectId && (
          <Select
            label="Project"
            options={projects.map((p) => ({ value: p.id, label: p.name }))}
            error={errors.project_id?.message}
            {...register('project_id')}
          />
        )}

        {/* Title with Voice Typing */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-semibold text-slate-700">Ticket Title *</label>
            <button
              type="button"
              onClick={() => toggleVoiceForField('title')}
              className={`text-[11px] font-medium flex items-center gap-1 px-2 py-0.5 rounded-md cursor-pointer transition-colors ${
                isListening && activeVoiceField === 'title'
                  ? 'bg-rose-100 text-rose-700 animate-pulse font-semibold'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
              }`}
              title="Voice dictation for title"
            >
              {isListening && activeVoiceField === 'title' ? (
                <>
                  <MicOff className="w-3 h-3 text-rose-600" />
                  <span>Listening...</span>
                </>
              ) : (
                <>
                  <Mic className="w-3 h-3 text-indigo-600" />
                  <span>Voice Type</span>
                </>
              )}
            </button>
          </div>
          <Input
            placeholder="e.g. Implement user dashboard charts"
            error={errors.title?.message}
            {...register('title')}
          />
        </div>

        {/* Category & Status Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Category */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-slate-700">Category *</label>
              <button
                type="button"
                onClick={() => setShowNewCategoryInput(!showNewCategoryInput)}
                className="text-[11px] text-indigo-600 hover:text-indigo-800 font-medium cursor-pointer"
              >
                {showNewCategoryInput ? 'Select Existing' : '+ New Category'}
              </button>
            </div>

            {showNewCategoryInput ? (
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="New category name..."
                  className="flex-1 text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={handleCreateCategory}
                  isLoading={isAddingCat}
                  className="text-xs shrink-0"
                >
                  Add
                </Button>
              </div>
            ) : (
              <Select
                options={categories.map((c) => ({ value: c.id, label: c.name }))}
                error={errors.category_id?.message}
                {...register('category_id')}
              />
            )}
          </div>

          {/* Status */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Status / Stage *</label>
            <Select
              options={statuses
                .filter((s, idx, arr) => arr.findIndex((x) => x.id === s.id) === idx)
                .map((s) => ({
                  value: s.id,
                  label: `${s.name}${s.is_final ? ' (Verified by QA)' : ''}`,
                }))}
              error={errors.status_id?.message}
              {...register('status_id')}
            />
          </div>
        </div>

        {/* Priority & Severity */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Priority *</label>
            <Select
              options={[
                { value: 'low', label: 'Low Priority' },
                { value: 'medium', label: 'Medium Priority' },
                { value: 'high', label: 'High Priority' },
                { value: 'critical', label: 'Critical Priority' },
              ]}
              error={errors.priority?.message}
              {...register('priority')}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Severity</label>
            <Select
              options={[
                { value: 'low', label: 'Low' },
                { value: 'medium', label: 'Medium' },
                { value: 'high', label: 'High (Hard in production)' },
                { value: 'critical', label: 'Critical' },
              ]}
              {...register('severity')}
            />
          </div>
        </div>

        {/* Dev mask & Ticket Type & Ref Code */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Dev mask</label>
            <Select
              options={[
                { value: 'frontend', label: 'Frontend' },
                { value: 'backend', label: 'Backend' },
                { value: 'flutter', label: 'Flutter' },
                { value: 'fullstack', label: 'Fullstack' },
                { value: 'devops', label: 'DevOps' },
                { value: 'qa', label: 'QA' },
              ]}
              {...register('dev_mask')}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Ticket Type</label>
            <Input
              placeholder="e.g. Modification, Bug, Feature"
              {...register('ticket_type')}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Ref Code / Epic</label>
            <Input
              placeholder="e.g. PMIC-078"
              {...register('ref_code')}
            />
          </div>
        </div>

        {/* Start Date & Due Date */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Start Date (Optional)</label>
            <input
              type="date"
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white text-slate-800"
              {...register('start_date')}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Due Date (Optional)</label>
            <input
              type="date"
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white text-slate-800"
              {...register('due_date')}
            />
          </div>
        </div>

        {/* Description with Voice Typing */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-semibold text-slate-700">Description</label>
            <button
              type="button"
              onClick={() => toggleVoiceForField('description')}
              className={`text-[11px] font-medium flex items-center gap-1 px-2 py-0.5 rounded-md cursor-pointer transition-colors ${
                isListening && activeVoiceField === 'description'
                  ? 'bg-rose-100 text-rose-700 animate-pulse font-semibold'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
              }`}
              title="Voice dictation for description"
            >
              {isListening && activeVoiceField === 'description' ? (
                <>
                  <MicOff className="w-3 h-3 text-rose-600" />
                  <span>Listening...</span>
                </>
              ) : (
                <>
                  <Mic className="w-3 h-3 text-indigo-600" />
                  <span>Voice Type</span>
                </>
              )}
            </button>
          </div>
          <Textarea
            rows={3}
            placeholder="Details on what needs to be accomplished and acceptance criteria..."
            error={errors.description?.message}
            {...register('description')}
          />
        </div>

        {/* Separate Notes Field with Voice Typing */}
        <div className="bg-amber-50/40 p-3.5 rounded-xl border border-amber-200/80">
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-semibold text-amber-950">
              Personal Notes (Separate Memo / Scratchpad)
            </label>
            <button
              type="button"
              onClick={() => toggleVoiceForField('notes')}
              className={`text-[11px] font-medium flex items-center gap-1 px-2 py-0.5 rounded-md cursor-pointer transition-colors ${
                isListening && activeVoiceField === 'notes'
                  ? 'bg-rose-100 text-rose-700 animate-pulse font-semibold'
                  : 'text-amber-800 hover:text-amber-950 hover:bg-amber-100'
              }`}
              title="Voice dictation for notes"
            >
              {isListening && activeVoiceField === 'notes' ? (
                <>
                  <MicOff className="w-3 h-3 text-rose-600" />
                  <span>Listening...</span>
                </>
              ) : (
                <>
                  <Mic className="w-3 h-3 text-amber-700" />
                  <span>Voice Type</span>
                </>
              )}
            </button>
          </div>
          <Textarea
            rows={2}
            placeholder="Implementation ideas, edge cases, PR links, personal reminders..."
            className="bg-white border-amber-300 focus:ring-amber-500"
            error={errors.notes?.message}
            {...register('notes')}
          />
        </div>

        {/* Attachments Upload */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            File & Image Attachments ({attachedFiles.length})
          </label>
          <FileUpload
            files={attachedFiles}
            onChange={(newFiles) => setAttachedFiles(newFiles)}
            maxFiles={5}
          />
        </div>

        {/* Form Actions */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={onClose} className="text-xs">
            Cancel
          </Button>
          <Button type="submit" variant="primary" size="sm" isLoading={isLoading} className="text-xs font-semibold">
            {initialData ? 'Save Changes' : 'Create Ticket'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
