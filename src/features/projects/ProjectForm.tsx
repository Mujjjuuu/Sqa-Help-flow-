import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from '../../components/Modal';
import { Input } from '../../components/Input';
import { Textarea } from '../../components/Textarea';
import { Select } from '../../components/Select';
import { Button } from '../../components/Button';
import { Project } from '../../types';
import { ProjectFormData } from './projectTypes';

const projectSchema = z.object({
  name: z.string().min(2, 'Project name must be at least 2 characters').max(80, 'Max 80 characters'),
  description: z.string().max(500, 'Max 500 characters').optional(),
  status: z.enum(['active', 'archived']).default('active'),
});

export interface ProjectFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ProjectFormData) => Promise<void>;
  initialData?: Project | null;
  isLoading?: boolean;
}

export const ProjectForm: React.FC<ProjectFormProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  isLoading = false,
}) => {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProjectFormData>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      name: initialData?.name || '',
      description: initialData?.description || '',
      status: initialData?.status || 'active',
    },
  });

  React.useEffect(() => {
    if (initialData) {
      reset({
        name: initialData.name,
        description: initialData.description || '',
        status: initialData.status,
      });
    } else {
      reset({
        name: '',
        description: '',
        status: 'active',
      });
    }
  }, [initialData, reset, isOpen]);

  const onFormSubmit = async (data: ProjectFormData) => {
    await onSubmit(data);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? 'Edit Project' : 'Create New Project'}
      subtitle="Organize your personal tickets, statuses, and downloadable reports."
      maxWidth="md"
    >
      <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
        <Input
          label="Project Name"
          placeholder="e.g. Mobile Banking App Redesign"
          error={errors.name?.message}
          required
          {...register('name')}
        />

        <Textarea
          label="Description"
          placeholder="Brief summary of the project goals, milestones, or architecture notes..."
          rows={3}
          error={errors.description?.message}
          {...register('description')}
        />

        {initialData && (
          <Select
            label="Project Status"
            options={[
              { value: 'active', label: 'Active' },
              { value: 'archived', label: 'Archived' },
            ]}
            error={errors.status?.message}
            {...register('status')}
          />
        )}

        <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" size="sm" isLoading={isLoading}>
            {initialData ? 'Save Changes' : 'Create Project'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
