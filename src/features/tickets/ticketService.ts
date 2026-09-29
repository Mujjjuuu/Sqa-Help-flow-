import { Ticket, TicketFilterState } from '../../types';
import { getSupabaseClient, isSupabaseConfigured } from '../../services/supabaseClient';
import { firestoreService } from '../../services/firestoreService';
import { localDB } from '../../services/localStore';
import { historyService } from '../../services/historyService';
import { attachmentService } from '../../services/attachmentService';
import { statusService } from '../../services/statusService';
import { projectService } from '../projects/projectService';
import { TicketFormData } from './ticketTypes';

export const ticketService = {
  /**
   * Fetch tickets optionally filtered by project and query parameters
   */
  async getTickets(
    projectId?: string,
    filters?: Partial<TicketFilterState>
  ): Promise<Ticket[]> {
    let tickets: Ticket[] = [];

    try {
      const fsTickets = await firestoreService.getTickets(projectId);
      if (fsTickets && fsTickets.length > 0) {
        tickets = fsTickets;
      }
    } catch (e) {
      console.warn('Firestore getTickets note:', e);
    }

    if (tickets.length === 0) {
      const supabase = getSupabaseClient();
      if (isSupabaseConfigured() && supabase) {
        try {
          let query = supabase.from('tickets').select(`
            *,
            status:statuses(*),
            category:categories(*),
            attachments:attachments(*),
            history:ticket_history(*)
          `);

          if (projectId) {
            query = query.eq('project_id', projectId);
          }

          const { data, error } = await query.order('created_at', { ascending: false });
          if (!error && data) {
            tickets = data as Ticket[];
          } else {
            tickets = localDB.getTickets(projectId);
          }
        } catch (e) {
          console.warn('Error fetching tickets from Supabase, using local:', e);
          tickets = localDB.getTickets(projectId);
        }
      } else {
        tickets = localDB.getTickets(projectId);
      }
    }

    // Apply client filters if specified
    if (filters) {
      if (filters.search?.trim()) {
        const q = filters.search.toLowerCase().trim();
        tickets = tickets.filter(
          (t) =>
            t.ticket_number.toLowerCase().includes(q) ||
            t.title.toLowerCase().includes(q) ||
            (t.description && t.description.toLowerCase().includes(q)) ||
            (t.notes && t.notes.toLowerCase().includes(q))
        );
      }

      if (filters.statusId) {
        tickets = tickets.filter((t) => t.status_id === filters.statusId);
      }

      if (filters.categoryId) {
        tickets = tickets.filter((t) => t.category_id === filters.categoryId);
      }

      if (filters.priority) {
        tickets = tickets.filter((t) => t.priority === filters.priority);
      }

      if (filters.projectId) {
        tickets = tickets.filter((t) => t.project_id === filters.projectId);
      }

      if (filters.dateFrom) {
        const fromTime = new Date(filters.dateFrom).getTime();
        tickets = tickets.filter((t) => {
          const tTime = new Date(filters.dateField === 'updated_at' ? t.updated_at : t.created_at).getTime();
          return tTime >= fromTime;
        });
      }

      if (filters.dateTo) {
        const toTime = new Date(filters.dateTo).setHours(23, 59, 59, 999);
        tickets = tickets.filter((t) => {
          const tTime = new Date(filters.dateField === 'updated_at' ? t.updated_at : t.created_at).getTime();
          return tTime <= toTime;
        });
      }
    }

    return tickets;
  },

  /**
   * Get single ticket by ID
   */
  async getTicketById(ticketId: string): Promise<Ticket | null> {
    const supabase = getSupabaseClient();
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase
          .from('tickets')
          .select(`
            *,
            status:statuses(*),
            category:categories(*),
            attachments:attachments(*),
            history:ticket_history(*)
          `)
          .eq('id', ticketId)
          .single();

        if (!error && data) {
          return data as Ticket;
        }
      } catch (e) {
        console.warn('Error fetching ticket by id from Supabase:', e);
      }
    }
    return localDB.getTicketById(ticketId);
  },

  /**
   * Generate next sequential ticket number for project (e.g. PRJ-101, PRJ-102)
   */
  async generateTicketNumber(projectId: string): Promise<string> {
    const project = await projectService.getProjectById(projectId);
    const prefix = project
      ? project.name
          .split(' ')
          .map((w) => w[0])
          .join('')
          .toUpperCase()
          .replace(/[^A-Z]/g, '')
          .slice(0, 3) || 'TCK'
      : 'TCK';

    const existingTickets = localDB.getTickets(projectId);
    const nextNum = 100 + existingTickets.length + 1;
    return `${prefix}-${nextNum}`;
  },

  /**
   * Create a new ticket
   */
  async createTicket(formData: TicketFormData): Promise<Ticket> {
    const ticketNumber = await this.generateTicketNumber(formData.project_id);
    const now = new Date().toISOString();

    const newTicket: Ticket = {
      id: `tkt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      project_id: formData.project_id,
      ticket_number: ticketNumber,
      title: formData.title.trim(),
      description: formData.description?.trim() || '',
      notes: formData.notes?.trim() || '',
      category_id: formData.category_id,
      status_id: formData.status_id,
      priority: formData.priority,
      due_date: formData.due_date || null,
      created_at: now,
      updated_at: now,
    };

    // Save to Firestore first
    try {
      await firestoreService.saveTicket(newTicket);
    } catch (fsErr) {
      console.warn('Firestore saveTicket note:', fsErr);
    }

    const supabase = getSupabaseClient();
    let created: Ticket;

    if (isSupabaseConfigured() && supabase) {
      const { data, error } = await supabase
        .from('tickets')
        .insert({
          project_id: newTicket.project_id,
          ticket_number: newTicket.ticket_number,
          title: newTicket.title,
          description: newTicket.description,
          notes: newTicket.notes,
          category_id: newTicket.category_id,
          status_id: newTicket.status_id,
          priority: newTicket.priority,
          due_date: newTicket.due_date,
        })
        .select()
        .single();

      if (!error && data) {
        created = data as Ticket;
      } else {
        created = localDB.saveTicket(newTicket);
      }
    } else {
      created = localDB.saveTicket(newTicket);
    }

    // Record creation history
    await historyService.recordHistory(
      created.id,
      'created',
      null,
      `Created ticket ${created.ticket_number}: ${created.title}`
    );

    // Upload any initial files attached
    if (formData.files && formData.files.length > 0) {
      for (const file of formData.files) {
        try {
          await attachmentService.uploadAndSaveAttachment(
            created.project_id,
            created.id,
            file
          );
        } catch (uploadErr) {
          console.error('Failed to attach file during ticket creation:', uploadErr);
        }
      }
    }

    return (await this.getTicketById(created.id)) || created;
  },

  /**
   * Update ticket fields and automatically track changed attributes in ticket history
   */
  async updateTicket(
    ticketId: string,
    updates: Partial<TicketFormData>
  ): Promise<Ticket> {
    const existing = await this.getTicketById(ticketId);
    if (!existing) throw new Error('Ticket not found');

    const statuses = await statusService.getStatuses(existing.project_id);

    // Track status change
    if (updates.status_id && updates.status_id !== existing.status_id) {
      const oldStatus = statuses.find((s) => s.id === existing.status_id)?.name || 'Unknown';
      const newStatus = statuses.find((s) => s.id === updates.status_id)?.name || 'Unknown';
      await historyService.recordHistory(ticketId, 'status_changed', oldStatus, newStatus);
    }

    // Track priority change
    if (updates.priority && updates.priority !== existing.priority) {
      await historyService.recordHistory(ticketId, 'priority_changed', existing.priority, updates.priority);
    }

    // Track title change
    if (updates.title && updates.title !== existing.title) {
      await historyService.recordHistory(ticketId, 'title_changed', existing.title, updates.title);
    }

    // Track notes change
    if (updates.notes !== undefined && updates.notes !== existing.notes) {
      await historyService.recordHistory(ticketId, 'notes_updated', 'Previous notes', 'Updated notes');
    }

    // Track due date change
    if (updates.due_date !== undefined && updates.due_date !== existing.due_date) {
      await historyService.recordHistory(
        ticketId,
        'due_date_changed',
        existing.due_date || 'No due date',
        updates.due_date || 'No due date'
      );
    }

    const updatedData: Ticket = {
      ...existing,
      ...updates,
      updated_at: new Date().toISOString(),
    };

    try {
      await firestoreService.saveTicket(updatedData);
    } catch (fsErr) {
      console.warn('Firestore updateTicket note:', fsErr);
    }

    const supabase = getSupabaseClient();
    if (isSupabaseConfigured() && supabase) {
      const { data, error } = await supabase
        .from('tickets')
        .update({
          title: updatedData.title,
          description: updatedData.description,
          notes: updatedData.notes,
          category_id: updatedData.category_id,
          status_id: updatedData.status_id,
          priority: updatedData.priority,
          due_date: updatedData.due_date,
          updated_at: updatedData.updated_at,
        })
        .eq('id', ticketId)
        .select()
        .single();

      if (!error && data) {
        return (await this.getTicketById(ticketId)) || updatedData;
      }
    }

    localDB.saveTicket(updatedData);
    return (await this.getTicketById(ticketId)) || updatedData;
  },

  /**
   * Move ticket between statuses (Drag & Drop or direct action)
   */
  async moveTicketStatus(ticketId: string, newStatusId: string): Promise<Ticket> {
    const existing = await this.getTicketById(ticketId);
    if (!existing) throw new Error('Ticket not found');
    if (existing.status_id === newStatusId) return existing;

    const statuses = await statusService.getStatuses(existing.project_id);
    const oldStatus = statuses.find((s) => s.id === existing.status_id)?.name || 'Previous Status';
    const newStatus = statuses.find((s) => s.id === newStatusId)?.name || 'New Status';

    // Record status movement in history
    await historyService.recordHistory(ticketId, 'status_changed', oldStatus, newStatus);

    const now = new Date().toISOString();
    const updatedTicket: Ticket = {
      ...existing,
      status_id: newStatusId,
      updated_at: now,
    };

    try {
      await firestoreService.saveTicket(updatedTicket);
    } catch (fsErr) {
      console.warn('Firestore moveTicketStatus note:', fsErr);
    }

    const supabase = getSupabaseClient();
    if (isSupabaseConfigured() && supabase) {
      await supabase
        .from('tickets')
        .update({
          status_id: newStatusId,
          updated_at: now,
        })
        .eq('id', ticketId);
    }

    localDB.saveTicket(updatedTicket);
    return (await this.getTicketById(ticketId)) || updatedTicket;
  },

  /**
   * Delete ticket and its dependencies
   */
  async deleteTicket(ticketId: string): Promise<void> {
    const existing = await this.getTicketById(ticketId);
    if (existing) {
      try {
        await firestoreService.deleteTicket(existing.project_id, ticketId);
      } catch (fsErr) {
        console.warn('Firestore deleteTicket note:', fsErr);
      }
    }

    const supabase = getSupabaseClient();
    if (isSupabaseConfigured() && supabase) {
      await supabase.from('tickets').delete().eq('id', ticketId);
    }
    localDB.deleteTicket(ticketId);
  },

  /**
   * Bulk change status for multiple selected tickets
   */
  async bulkUpdateStatus(ticketIds: string[], newStatusId: string): Promise<void> {
    for (const id of ticketIds) {
      await this.moveTicketStatus(id, newStatusId);
    }
  },

  /**
   * Bulk delete tickets
   */
  async bulkDeleteTickets(ticketIds: string[]): Promise<void> {
    for (const id of ticketIds) {
      await this.deleteTicket(id);
    }
  },
};
