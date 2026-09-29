import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus } from 'lucide-react';
import { Modal } from '../../components/Modal';
import { Input } from '../../components/Input';
import { Textarea } from '../../components/Textarea';
import { Select } from '../../components/Select';
import { Button } from '../../components/Button';
import { FileUpload } from '../../components/FileUpload';
import { Ticket, Status, Category, Project } from '../../types';
import { TicketFormData } from './ticketTypes';
import { categoryService } from '../../services/categoryService';

const ticketSchema = z.object({
  title: z.string().min(2, 'Title must be at least 2 characters').max(150, 'Max 150 characters'),
  description: z.string().max(2000, 'Max 2000 characters').optional(),
  notes: z.string().max(2000, 'Max 2000 characters').optional(),
  project_id: z.string().min(1, 'Project is required'),
  category_id: z.string().min(1, 'Category is required'),
  status_id: z.string().min(1, 'Status is required'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
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
  defaultProjectId,
  defaultStatusId,
  onCategoryAdded,
  isLoading = false,
}) => {
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isAddingCat, setIsAddingCat] = useState(false);

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
      title: initialData?.title || '',
      description: initialData?.description || '',
      notes: initialData?.notes || '',
      project_id: activeProjectId,
      status_id: initialData?.status_id || defaultStatusId || statuses[0]?.id || '',
      category_id: initialData?.category_id || categories[0]?.id || '',
      priority: initialData?.priority || 'medium',
      due_date: initialData?.due_date ? initialData.due_date.slice(0, 10) : '',
    },
  });

  const selectedProjectId = watch('project_id');

  React.useEffect(() => {
    if (initialData) {
      reset({
        title: initialData.title,
        description: initialData.description || '',
        notes: initialData.notes || '',
        project_id: initialData.project_id,
        category_id: initialData.category_id,
        status_id: initialData.status_id,
        priority: initialData.priority,
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
        due_date: '',
      });
      setAttachedFiles([]);
    }
  }, [initialData, defaultProjectId, defaultStatusId, isOpen, reset, projects, statuses, categories]);

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
      subtitle="Fill in task details, categorization, and attachments."
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
        {/* Project Selection if multiple projects exist and not fixed */}
        {projects.length > 1 && !defaultProjectId && (
          <Select
            label="Project"
            options={projects.map((p) => ({ value: p.id, label: p.name }))}
            error={errors.project_id?.message}
            {...register('project_id')}
          />
        )}

        {/* Title */}
        <Input
          label="Ticket Title"
          placeholder="e.g. Implement FaceID fallback flow"
          error={errors.title?.message}
          required
          {...register('title')}
        />

        {/* Category & Status Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-700">Category *</label>
              <button
                type="button"
                onClick={() => setShowNewCategoryInput(!showNewCategoryInput)}
                className="text-[11px] text-slate-500 hover:text-slate-900 font-medium flex items-center gap-0.5 cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>Custom</span>
              </button>
            </div>

            {showNewCategoryInput ? (
              <div className="flex gap-1.5 mb-1">
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="New category name"
                  className="w-full text-xs px-2.5 py-1.5 border rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="primary"
                  onClick={handleCreateCategory}
                  isLoading={isAddingCat}
                >
                  Add
                </Button>
              </div>
            ) : null}

            <Select
              options={categories.map((c) => ({ value: c.id, label: c.name }))}
              error={errors.category_id?.message}
              {...register('category_id')}
            />
          </div>

          <Select
            label="Status Column"
            options={statuses.map((s) => ({ value: s.id, label: s.name }))}
            error={errors.status_id?.message}
            required
            {...register('status_id')}
          />
        </div>

        {/* Priority & Due Date Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <Select
            label="Priority"
            options={[
              { value: 'low', label: 'Low' },
              { value: 'medium', label: 'Medium' },
              { value: 'high', label: 'High' },
              { value: 'urgent', label: 'Urgent' },
            ]}
            error={errors.priority?.message}
            {...register('priority')}
          />

          <Input
            type="date"
            label="Due Date (Optional)"
            error={errors.due_date?.message}
            {...register('due_date')}
          />
        </div>

        {/* Description */}
        <Textarea
          label="Description"
          placeholder="Detailed problem statement, reproduction steps, or requirements..."
          rows={3}
          error={errors.description?.message}
          {...register('description')}
        />

        {/* Notes */}
        <Textarea
          label="Implementation Notes"
          placeholder="Technical considerations, edge cases, PR links, or memo..."
          rows={2}
          error={errors.notes?.message}
          {...register('notes')}
        />

        {/* File Attachments (Only on creation or adding new) */}
        {!initialData && (
          <FileUpload
            files={attachedFiles}
            onChange={setAttachedFiles}
            label="Initial Attachments"
          />
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" size="sm" isLoading={isLoading}>
            {initialData ? 'Update Ticket' : 'Create Ticket'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
