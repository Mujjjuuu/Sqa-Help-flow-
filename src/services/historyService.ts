import { TicketHistory, TicketHistoryActionType } from '../types';
import { getSupabaseClient, isSupabaseConfigured } from './supabaseClient';
import { localDB } from './localStore';

export const historyService = {
  async getTicketHistory(ticketId: string): Promise<TicketHistory[]> {
    const supabase = getSupabaseClient();
    if (isSupabaseConfigured() && supabase) {
      const { data, error } = await supabase
        .from('ticket_history')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: false });

      if (!error && data) {
        return data as TicketHistory[];
      }
    }
    return localDB.getHistory(ticketId);
  },

  async recordHistory(
    ticketId: string,
    actionType: TicketHistoryActionType,
    oldValue?: string | null,
    newValue?: string | null
  ): Promise<TicketHistory> {
    const historyItem: TicketHistory = {
      id: `hist-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      ticket_id: ticketId,
      action_type: actionType,
      old_value: oldValue ?? null,
      new_value: newValue ?? null,
      created_at: new Date().toISOString(),
    };

    const supabase = getSupabaseClient();
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase
          .from('ticket_history')
          .insert({
            ticket_id: ticketId,
            action_type: actionType,
            old_value: oldValue ?? null,
            new_value: newValue ?? null,
          })
          .select()
          .single();

        if (!error && data) {
          return data as TicketHistory;
        }
      } catch (err) {
        console.warn('History insert error in Supabase:', err);
      }
    }

    localDB.addHistory(historyItem);
    return historyItem;
  },
};
