import { Project, ProjectStats } from '../../types';
import { getSupabaseClient, isSupabaseConfigured } from '../../services/supabaseClient';
import { firestoreService } from '../../services/firestoreService';
import { localDB } from '../../services/localStore';
import { statusService } from '../../services/statusService';
import { categoryService } from '../../services/categoryService';
import { ProjectFormData } from './projectTypes';

export const projectService = {
  async getProjects(): Promise<Project[]> {
    try {
      const projs = await firestoreService.getProjects();
      if (projs && projs.length > 0) return projs;
    } catch (e) {
      console.warn('Firestore getProjects note:', e);
    }

    const supabase = getSupabaseClient();
    if (isSupabaseConfigured() && supabase) {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('updated_at', { ascending: false });

      if (!error && data) {
        return data as Project[];
      }
    }
    return localDB.getProjects();
  },

  async getProjectById(id: string): Promise<Project | null> {
    try {
      const proj = await firestoreService.getProjectById(id);
      if (proj) return proj;
    } catch (e) {
      console.warn('Firestore getProjectById note:', e);
    }

    const supabase = getSupabaseClient();
    if (isSupabaseConfigured() && supabase) {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', id)
        .single();

      if (!error && data) {
        return data as Project;
      }
    }
    return localDB.getProjectById(id);
  },

  async createProject(formData: ProjectFormData): Promise<Project> {
    const user = localDB.getCurrentUser();
    const newProject: Project = {
      id: `proj-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      user_id: user?.id || 'usr-default-001',
      name: formData.name.trim(),
      description: formData.description?.trim() || '',
      status: formData.status || 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      archived_at: null,
    };

    // Save to Firestore first
    try {
      await firestoreService.saveProject(newProject);
    } catch (err) {
      console.warn('Firestore saveProject note:', err);
    }

    const supabase = getSupabaseClient();
    if (isSupabaseConfigured() && supabase) {
      await supabase
        .from('projects')
        .insert({
          id: newProject.id,
          name: newProject.name,
          description: newProject.description,
          status: newProject.status,
          user_id: user?.id || newProject.user_id,
        });
    }

    // Save locally
    const saved = localDB.saveProject(newProject);

    // Initialize default statuses & categories for this project
    await statusService.getStatuses(newProject.id);
    await categoryService.getCategories(newProject.id);

    return saved;
  },

  async updateProject(id: string, formData: Partial<ProjectFormData>): Promise<Project> {
    const existing = await this.getProjectById(id);
    if (!existing) throw new Error('Project not found');

    const updated: Project = {
      ...existing,
      name: formData.name ? formData.name.trim() : existing.name,
      description: formData.description !== undefined ? formData.description.trim() : existing.description,
      status: formData.status || existing.status,
      archived_at: formData.status === 'archived' ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    };

    try {
      await firestoreService.saveProject(updated);
    } catch (err) {
      console.warn('Firestore updateProject note:', err);
    }

    const supabase = getSupabaseClient();
    if (isSupabaseConfigured() && supabase) {
      await supabase
        .from('projects')
        .update({
          name: updated.name,
          description: updated.description,
          status: updated.status,
          archived_at: updated.archived_at,
          updated_at: updated.updated_at,
        })
        .eq('id', id);
    }

    return localDB.saveProject(updated);
  },

  async deleteProject(id: string): Promise<void> {
    try {
      await firestoreService.deleteProject(id);
    } catch (err) {
      console.warn('Firestore deleteProject note:', err);
    }

    const supabase = getSupabaseClient();
    if (isSupabaseConfigured() && supabase) {
      await supabase.from('projects').delete().eq('id', id);
    }
    localDB.deleteProject(id);
  },

  async getProjectStats(projectId: string): Promise<ProjectStats> {
    const tickets = localDB.getTickets(projectId);
    const statuses = await statusService.getStatuses(projectId);

    const totalTickets = tickets.length;
    const finalStatusIds = new Set(statuses.filter((s) => s.is_final).map((s) => s.id));
    const underReviewStatus = statuses.find((s) => s.name.toLowerCase() === 'under review');

    const uploadedTickets = tickets.filter((t) => finalStatusIds.has(t.status_id)).length;
    const activeTickets = totalTickets - uploadedTickets;
    const underReviewTickets = underReviewStatus
      ? tickets.filter((t) => t.status_id === underReviewStatus.id).length
      : 0;

    const completionPercentage = totalTickets > 0 ? Math.round((uploadedTickets / totalTickets) * 100) : 0;

    const statusCounts: Record<string, number> = {};
    statuses.forEach((st) => {
      statusCounts[st.name] = 0;
    });

    tickets.forEach((t) => {
      const statusName = t.status?.name || statuses.find((s) => s.id === t.status_id)?.name;
      if (statusName) {
        statusCounts[statusName] = (statusCounts[statusName] || 0) + 1;
      }
    });

    const statusColorsMap: Record<string, string> = {
      'Just Written': '#64748b',
      'Under Review': '#d97706',
      'Verified': '#0284c7',
      'Uploaded': '#7c3aed',
      'In Progress': '#0284c7',
      'Changes Required': '#ea580c',
      'Completed': '#16a34a',
    };

    const statusDistribution = statuses.map((st) => ({
      statusName: st.name,
      count: statusCounts[st.name] || 0,
      color: statusColorsMap[st.name] || '#6366f1',
    }));

    return {
      totalTickets,
      activeTickets,
      underReviewTickets,
      uploadedTickets,
      completionPercentage,
      statusDistribution,
    };
  },
};
