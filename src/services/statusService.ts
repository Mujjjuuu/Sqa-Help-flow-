import { Status } from '../types';
import { DEFAULT_TICKET_STATUSES } from '../config/ticketStatuses';
import { getSupabaseClient, isSupabaseConfigured } from './supabaseClient';
import { localDB } from './localStore';

export const statusService = {
  async getStatuses(projectId: string): Promise<Status[]> {
    const supabase = getSupabaseClient();
    if (isSupabaseConfigured() && supabase) {
      const { data, error } = await supabase
        .from('statuses')
        .select('*')
        .eq('project_id', projectId)
        .order('position', { ascending: true });

      if (!error && data && data.length > 0) {
        return data as Status[];
      }

      // If no statuses exist yet in Supabase for this project, seed them
      if (!error && data && data.length === 0) {
        const toInsert = DEFAULT_TICKET_STATUSES.map((s) => ({
          project_id: projectId,
          name: s.name,
          position: s.position,
          is_final: s.is_final,
        }));
        const { data: inserted } = await supabase
          .from('statuses')
          .insert(toInsert)
          .select();
        if (inserted) return inserted as Status[];
      }
    }

    return localDB.getStatuses(projectId);
  },

  async createStatus(
    projectId: string,
    name: string,
    isFinal = false
  ): Promise<Status> {
    const statuses = await this.getStatuses(projectId);
    // Find highest position before Uploaded (which is always last)
    const uploadedStatus = statuses.find((s) => s.is_final);
    const newPosition = uploadedStatus ? uploadedStatus.position : statuses.length;

    // Shift uploaded position if needed
    if (uploadedStatus && !isFinal) {
      uploadedStatus.position = newPosition + 1;
      await this.updateStatus(uploadedStatus);
    }

    const newStatus: Status = {
      id: `st-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      project_id: projectId,
      name: name.trim(),
      position: isFinal ? statuses.length : newPosition,
      is_final: isFinal,
      created_at: new Date().toISOString(),
    };

    const supabase = getSupabaseClient();
    if (isSupabaseConfigured() && supabase) {
      const { data, error } = await supabase
        .from('statuses')
        .insert({
          project_id: projectId,
          name: name.trim(),
          position: newStatus.position,
          is_final: isFinal,
        })
        .select()
        .single();
      if (!error && data) return data as Status;
    }

    return localDB.saveStatus(newStatus);
  },

  async updateStatus(status: Status): Promise<Status> {
    const supabase = getSupabaseClient();
    if (isSupabaseConfigured() && supabase) {
      const { data, error } = await supabase
        .from('statuses')
        .update({
          name: status.name,
          position: status.position,
          is_final: status.is_final,
        })
        .eq('id', status.id)
        .select()
        .single();
      if (!error && data) return data as Status;
    }
    return localDB.saveStatus(status);
  },
};
