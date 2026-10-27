import { TicketComment } from '../types';
import { localDB } from './localStore';
import { historyService } from './historyService';

export const commentService = {
  async getComments(ticketId: string): Promise<TicketComment[]> {
    return localDB.getComments(ticketId);
  },

  async addComment(params: {
    ticketId: string;
    content: string;
    images?: string[];
    audioUrl?: string;
    audioDuration?: number;
    isVoiceMessage?: boolean;
    userName?: string;
    userAvatar?: string;
  }): Promise<TicketComment> {
    const user = localDB.getCurrentUser();
    const authorName = params.userName || user?.name || 'Project Member';
    const authorAvatar = params.userAvatar || user?.avatar_url || '';

    const newComment = localDB.addComment({
      ticket_id: params.ticketId,
      user_name: authorName,
      user_avatar: authorAvatar,
      content: params.content,
      images: params.images,
      audio_url: params.audioUrl,
      audio_duration: params.audioDuration,
      is_voice_message: params.isVoiceMessage,
    });

    // Record in ticket history
    let actionDesc = '';
    if (params.isVoiceMessage) {
      actionDesc = `Added voice message (${Math.round(params.audioDuration || 0)}s)`;
    } else if (params.images && params.images.length > 0) {
      actionDesc = `Added comment with ${params.images.length} image attachment(s)`;
    } else {
      actionDesc = `Added comment: "${params.content.slice(0, 40)}${params.content.length > 40 ? '...' : ''}"`;
    }

    await historyService.recordHistory(
      params.ticketId,
      'notes_updated',
      null,
      actionDesc,
      { name: authorName, avatar: authorAvatar }
    );

    return newComment;
  },

  async deleteComment(commentId: string): Promise<void> {
    localDB.deleteComment(commentId);
  },
};
