import { Project, ProjectStats } from '../../types';

export type { Project, ProjectStats };

export interface ProjectFormData {
  name: string;
  description?: string;
  status?: 'active' | 'archived';
}
