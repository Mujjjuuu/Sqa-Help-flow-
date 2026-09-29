import { Attachment } from '../types';
import { storageService } from './storageService';
import { historyService } from './historyService';
import { getSupabaseClient, isSupabaseConfigured } from './supabaseClient';
import { localDB } from './localStore';

export const attachmentService = {
  async getAttachments(ticketId?: string): Promise<Attachment[]> {
    const supabase = getSupabaseClient();
    if (isSupabaseConfigured() && supabase) {
      let query = supabase.from('attachments').select('*');
      if (ticketId) {
        query = query.eq('ticket_id', ticketId);
      }
      const { data, error } = await query.order('created_at', { ascending: false });
      if (!error && data) {
        return data as Attachment[];
      }
    }
    return localDB.getAttachments(ticketId);
  },

  async uploadAndSaveAttachment(
    projectId: string,
    ticketId: string,
    file: File
  ): Promise<Attachment> {
    const uploadResult = await storageService.uploadFile(projectId, ticketId, file);

    const attachment: Attachment = {
      id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      ticket_id: ticketId,
      file_name: uploadResult.fileName,
      file_url: uploadResult.fileUrl,
      file_type: uploadResult.fileType,
      file_size: uploadResult.fileSize,
      created_at: new Date().toISOString(),
    };

    const supabase = getSupabaseClient();
    if (isSupabaseConfigured() && supabase) {
      const { data, error } = await supabase
        .from('attachments')
        .insert({
          ticket_id: ticketId,
          file_name: attachment.file_name,
          file_url: attachment.file_url,
          file_type: attachment.file_type,
          file_size: attachment.file_size,
        })
        .select()
        .single();

      if (!error && data) {
        await historyService.recordHistory(
          ticketId,
          'attachment_added',
          null,
          attachment.file_name
        );
        return data as Attachment;
      }
    }

    localDB.saveAttachment(attachment);
    await historyService.recordHistory(
      ticketId,
      'attachment_added',
      null,
      attachment.file_name
    );
    return attachment;
  },

  async deleteAttachment(attachment: Attachment): Promise<void> {
    await storageService.deleteFile(attachment.file_url);

    const supabase = getSupabaseClient();
    if (isSupabaseConfigured() && supabase) {
      await supabase.from('attachments').delete().eq('id', attachment.id);
    }
    localDB.deleteAttachment(attachment.id);

    await historyService.recordHistory(
      attachment.ticket_id,
      'attachment_removed',
      attachment.file_name,
      null
    );
  },

  downloadAttachment(attachment: Attachment): void {
    storageService.downloadFile(attachment.file_url, attachment.file_name);
  },
};
