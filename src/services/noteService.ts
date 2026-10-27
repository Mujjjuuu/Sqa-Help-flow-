import { ProjectNote, NoteFilterState, Ticket, TicketPriority } from '../types';
import { localDB, DEFAULT_USER } from './localStore';
import { ticketService } from '../features/tickets/ticketService';
import { projectService } from '../features/projects/projectService';
import { statusService } from './statusService';
import { categoryService } from './categoryService';

export const noteService = {
  /**
   * Fetch all notes with optional filter (search, project, tag, status)
   */
  async getNotes(filter?: NoteFilterState): Promise<ProjectNote[]> {
    return localDB.getNotes(filter);
  },

  /**
   * Fetch a single note by ID
   */
  async getNoteById(id: string): Promise<ProjectNote | null> {
    return localDB.getNoteById(id);
  },

  /**
   * Create or update a note
   */
  async saveNote(noteData: Partial<ProjectNote>): Promise<ProjectNote> {
    const currentUser = localDB.getCurrentUser() || DEFAULT_USER;
    const now = new Date().toISOString();

    const noteToSave: ProjectNote = {
      id: noteData.id || `note-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      project_id: noteData.project_id || null,
      project_name: noteData.project_name || null,
      title: noteData.title?.trim() || 'Untitled Note',
      content: noteData.content || '',
      tags: noteData.tags || [],
      image_url: noteData.image_url || null,
      image_name: noteData.image_name || null,
      audio_url: noteData.audio_url || null,
      audio_duration: noteData.audio_duration || null,
      audio_name: noteData.audio_name || null,
      is_pinned: Boolean(noteData.is_pinned),
      is_converted_to_ticket: Boolean(noteData.is_converted_to_ticket),
      converted_ticket_id: noteData.converted_ticket_id || null,
      converted_ticket_number: noteData.converted_ticket_number || null,
      author_id: noteData.author_id || currentUser.id,
      author_name: noteData.author_name || currentUser.name,
      author_avatar: noteData.author_avatar || currentUser.avatar_url,
      created_at: noteData.created_at || now,
      updated_at: now,
    };

    return localDB.saveNote(noteToSave);
  },

  /**
   * Delete a note by ID
   */
  async deleteNote(id: string): Promise<void> {
    localDB.deleteNote(id);
  },

  /**
   * AI Image to Text (OCR / Vision Extraction)
   */
  async extractTextFromImage(
    imageBase64: string,
    mimeType: string = 'image/png',
    mode: 'full' | 'summary' = 'full'
  ): Promise<string> {
    try {
      const response = await fetch('/api/extract-image-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64, mimeType, mode }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to extract text from image');
      }

      const data = await response.json();
      return data.text || '';
    } catch (e: any) {
      console.error('extractTextFromImage error:', e);
      throw e;
    }
  },

  /**
   * AI Speech-to-Text Audio Transcription via Gemini 3.5 Transcribe
   */
  async transcribeAudio(audioBase64: string, mimeType: string = 'audio/webm'): Promise<string> {
    try {
      const response = await fetch('/api/transcribe-audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audioBase64, mimeType }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to transcribe audio note');
      }

      const data = await response.json();
      return data.text || '';
    } catch (e: any) {
      console.error('transcribeAudio error:', e);
      throw e;
    }
  },

  /**
   * AI Structured Ticket Synthesis from Note
   */
  async generateTicketFromNote(
    noteTitle: string,
    noteContent: string,
    projectName?: string,
    categories: string[] = []
  ): Promise<{
    title: string;
    description: string;
    notes: string;
    priority: TicketPriority;
    category?: string;
  }> {
    try {
      const response = await fetch('/api/convert-note-to-ticket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ noteTitle, noteContent, projectName, categories }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to analyze note for ticket creation');
      }

      const data = await response.json();
      return (
        data.ticket || {
          title: noteTitle,
          description: noteContent,
          notes: '',
          priority: 'medium',
        }
      );
    } catch (e: any) {
      console.error('generateTicketFromNote error:', e);
      // Fallback if offline or API error
      return {
        title: noteTitle || 'New Ticket',
        description: noteContent || '',
        notes: 'Created from scratchpad note.',
        priority: 'medium',
      };
    }
  },

  /**
   * Automatically create a Kanban ticket from a note and link them
   */
  async createTicketFromNote(
    noteId: string,
    projectId: string,
    ticketPayload: {
      title: string;
      description?: string;
      notes?: string;
      priority: TicketPriority;
      categoryId?: string;
    }
  ): Promise<{ note: ProjectNote; ticket: Ticket }> {
    const statuses = await statusService.getStatuses(projectId);
    const initialStatus = statuses[0];

    const allCategories = await categoryService.getCategories(projectId);
    const categoryId = ticketPayload.categoryId || allCategories[0]?.id || `cat-${projectId}-0`;

    const savedTicket = await ticketService.createTicket({
      project_id: projectId,
      title: ticketPayload.title,
      description: ticketPayload.description || '',
      notes: ticketPayload.notes || '',
      priority: ticketPayload.priority,
      category_id: categoryId,
      status_id: initialStatus ? initialStatus.id : `st-${projectId}-0`,
    });

    const note = await this.getNoteById(noteId);
    if (note) {
      const updatedNote: ProjectNote = {
        ...note,
        project_id: projectId,
        is_converted_to_ticket: true,
        converted_ticket_id: savedTicket.id,
        converted_ticket_number: savedTicket.ticket_number,
        updated_at: new Date().toISOString(),
      };
      const savedNote = await this.saveNote(updatedNote);
      return { note: savedNote, ticket: savedTicket };
    }

    return { note: {} as any, ticket: savedTicket };
  },
};
