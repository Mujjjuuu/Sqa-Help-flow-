import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  StickyNote,
  Plus,
  Search,
  Filter,
  Image as ImageIcon,
  Mic,
  MicOff,
  Sparkles,
  ArrowRight,
  Pin,
  Trash2,
  Edit3,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Tag,
  FolderKanban,
  FileText,
  Volume2,
  Play,
  Pause,
  Upload,
  Copy,
  Check,
  X,
  Layers,
  ArrowUpRight,
  Loader2,
} from 'lucide-react';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Modal } from '../components/Modal';
import { useAuth } from '../context/AuthContext';
import { noteService } from '../services/noteService';
import { projectService } from '../features/projects/projectService';
import { ticketService } from '../features/tickets/ticketService';
import { categoryService } from '../services/categoryService';
import { ProjectNote, NoteFilterState, Project, TicketPriority, Category } from '../types';

export const NotesPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [notes, setNotes] = useState<ProjectNote[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [filters, setFilters] = useState<NoteFilterState>({
    search: '',
    projectId: '',
    tag: '',
    status: 'all',
  });

  // Editor Modal State
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Partial<ProjectNote> | null>(null);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [noteProjectId, setNoteProjectId] = useState<string>('');
  const [noteTags, setNoteTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [isPinned, setIsPinned] = useState(false);
  const [attachedImageBase64, setAttachedImageBase64] = useState<string | null>(null);
  const [attachedImageName, setAttachedImageName] = useState<string | null>(null);
  const [attachedAudioBase64, setAttachedAudioBase64] = useState<string | null>(null);
  const [attachedAudioName, setAttachedAudioName] = useState<string | null>(null);
  const [attachedAudioDuration, setAttachedAudioDuration] = useState<number | null>(null);

  // AI Operation States
  const [isExtractingText, setIsExtractingText] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [ocrSuccessMsg, setOcrSuccessMsg] = useState<string | null>(null);

  // Audio Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<any>(null);

  // Audio Playback
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  // Convert Note to Ticket Modal State
  const [isConvertModalOpen, setIsConvertModalOpen] = useState(false);
  const [noteToConvert, setNoteToConvert] = useState<ProjectNote | null>(null);
  const [targetProjectId, setTargetProjectId] = useState<string>('');
  const [projectCategories, setProjectCategories] = useState<Category[]>([]);
  const [isGeneratingTicket, setIsGeneratingTicket] = useState(false);
  const [ticketDraft, setTicketDraft] = useState<{
    title: string;
    description: string;
    notes: string;
    priority: TicketPriority;
    categoryId: string;
  }>({
    title: '',
    description: '',
    notes: '',
    priority: 'medium',
    categoryId: '',
  });
  const [isSubmittingTicket, setIsSubmittingTicket] = useState(false);

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Load Notes & Projects
  const loadData = async () => {
    setIsLoading(true);
    try {
      const [fetchedNotes, fetchedProjects] = await Promise.all([
        noteService.getNotes(filters),
        projectService.getProjects(),
      ]);
      setNotes(fetchedNotes);
      setProjects(fetchedProjects);
    } catch (e) {
      console.error('Failed to load notes data:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [filters]);

  // Handle open editor for new or existing note
  const handleOpenNewNote = (initialType?: 'ocr' | 'audio') => {
    setEditingNote(null);
    setNoteTitle('');
    setNoteContent('');
    setNoteProjectId('');
    setNoteTags([]);
    setTagInput('');
    setIsPinned(false);
    setAttachedImageBase64(null);
    setAttachedImageName(null);
    setAttachedAudioBase64(null);
    setAttachedAudioName(null);
    setAttachedAudioDuration(null);
    setOcrSuccessMsg(null);
    setIsEditorOpen(true);

    if (initialType === 'ocr') {
      setTimeout(() => {
        const fileInput = document.getElementById('note-image-upload') as HTMLInputElement;
        if (fileInput) fileInput.click();
      }, 150);
    } else if (initialType === 'audio') {
      setTimeout(() => {
        startRecording();
      }, 200);
    }
  };

  const handleEditNote = (note: ProjectNote) => {
    setEditingNote(note);
    setNoteTitle(note.title);
    setNoteContent(note.content);
    setNoteProjectId(note.project_id || '');
    setNoteTags(note.tags || []);
    setTagInput('');
    setIsPinned(Boolean(note.is_pinned));
    setAttachedImageBase64(note.image_url || null);
    setAttachedImageName(note.image_name || null);
    setAttachedAudioBase64(note.audio_url || null);
    setAttachedAudioName(note.audio_name || null);
    setAttachedAudioDuration(note.audio_duration || null);
    setOcrSuccessMsg(null);
    setIsEditorOpen(true);
  };

  // Save Note
  const handleSaveNote = async () => {
    if (!noteTitle.trim() && !noteContent.trim() && !attachedImageBase64 && !attachedAudioBase64) {
      alert('Please enter a note title, content, or attach media.');
      return;
    }

    try {
      const selectedProj = projects.find((p) => p.id === noteProjectId);

      await noteService.saveNote({
        id: editingNote?.id,
        title: noteTitle.trim() || 'Untitled Scratchpad Note',
        content: noteContent.trim(),
        project_id: noteProjectId || null,
        project_name: selectedProj ? selectedProj.name : null,
        tags: noteTags,
        is_pinned: isPinned,
        image_url: attachedImageBase64,
        image_name: attachedImageName,
        audio_url: attachedAudioBase64,
        audio_name: attachedAudioName,
        audio_duration: attachedAudioDuration,
        is_converted_to_ticket: editingNote?.is_converted_to_ticket,
        converted_ticket_id: editingNote?.converted_ticket_id,
        converted_ticket_number: editingNote?.converted_ticket_number,
      });

      setIsEditorOpen(false);
      showToast(editingNote?.id ? 'Note updated successfully.' : 'Note saved to workspace.');
      await loadData();
    } catch (e: any) {
      alert(e.message || 'Error saving note');
    }
  };

  // Delete Note
  const handleDeleteNote = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this note?')) {
      await noteService.deleteNote(id);
      showToast('Note deleted.');
      await loadData();
    }
  };

  // Toggle Pin
  const handleTogglePin = async (note: ProjectNote, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await noteService.saveNote({
        ...note,
        is_pinned: !note.is_pinned,
      });
      await loadData();
    } catch (err) {
      console.error(err);
    }
  };

  // Image Upload and OCR Handler
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file (PNG, JPG, WebP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      setAttachedImageBase64(base64);
      setAttachedImageName(file.name);

      // Offer immediate OCR extraction
      handleRunOCR(base64, file.type, file.name);
    };
    reader.readAsDataURL(file);
  };

  const handleRunOCR = async (base64: string, mimeType: string, filename?: string) => {
    setIsExtractingText(true);
    setOcrSuccessMsg(null);
    try {
      const extracted = await noteService.extractTextFromImage(base64, mimeType, 'full');
      if (extracted) {
        if (!noteTitle) {
          setNoteTitle(`Extracted Notes: ${filename || 'Screenshot'}`);
        }
        setNoteContent((prev) => (prev ? `${prev}\n\n---\n**Extracted from Image:**\n${extracted}` : extracted));
        setOcrSuccessMsg('Text extracted and added to note!');
      } else {
        setOcrSuccessMsg('No readable text detected in image.');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to extract text from image');
    } finally {
      setIsExtractingText(false);
    }
  };

  // Audio Recording (Microphone Speech to Text)
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64Audio = reader.result as string;
          setAttachedAudioBase64(base64Audio);
          setAttachedAudioName(`Voice Memo - ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`);
          setAttachedAudioDuration(recordingSeconds);

          // Transcribe automatically
          handleRunTranscribe(base64Audio, 'audio/webm');
        };
        reader.readAsDataURL(audioBlob);

        // Stop all tracks to release mic
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (e: any) {
      alert('Could not access microphone: ' + (e.message || 'Please grant microphone permissions in your browser.'));
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(recordingTimerRef.current);
    }
  };

  // Audio File Upload
  const handleAudioFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setAttachedAudioBase64(base64);
      setAttachedAudioName(file.name);
      handleRunTranscribe(base64, file.type || 'audio/webm');
    };
    reader.readAsDataURL(file);
  };

  const handleRunTranscribe = async (base64: string, mimeType: string) => {
    setIsTranscribing(true);
    try {
      const transcript = await noteService.transcribeAudio(base64, mimeType);
      if (transcript) {
        if (!noteTitle) {
          setNoteTitle('Voice Memo Transcript');
        }
        setNoteContent((prev) =>
          prev ? `${prev}\n\n---\n**Audio Transcript:**\n${transcript}` : transcript
        );
        showToast('Voice memo transcribed successfully!');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to transcribe audio');
    } finally {
      setIsTranscribing(false);
    }
  };

  // Play / Pause Audio
  const handlePlayAudio = (noteId: string, audioUrl?: string | null) => {
    if (!audioUrl) return;

    if (playingAudioId === noteId) {
      audioPlayerRef.current?.pause();
      setPlayingAudioId(null);
    } else {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
      }
      const audio = new Audio(audioUrl);
      audioPlayerRef.current = audio;
      setPlayingAudioId(noteId);
      audio.play();
      audio.onended = () => setPlayingAudioId(null);
    }
  };

  // Tag Management in Editor
  const handleAddTag = () => {
    const clean = tagInput.trim().replace(/^#/, '');
    if (clean && !noteTags.includes(clean)) {
      setNoteTags([...noteTags, clean]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setNoteTags(noteTags.filter((t) => t !== tagToRemove));
  };

  // Convert Note to Ticket Workflow
  const handleOpenConvertModal = async (note: ProjectNote, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setNoteToConvert(note);

    const defaultProjId = note.project_id || projects[0]?.id || '';
    setTargetProjectId(defaultProjId);

    // Initial draft from note
    setTicketDraft({
      title: note.title,
      description: note.content,
      notes: `Generated from scratchpad note [${note.title}] on ${new Date().toLocaleDateString()}.`,
      priority: 'medium',
      categoryId: '',
    });

    setIsConvertModalOpen(true);

    if (defaultProjId) {
      await loadProjectCategoriesAndSuggest(defaultProjId, note);
    }
  };

  const loadProjectCategoriesAndSuggest = async (projId: string, note: ProjectNote) => {
    try {
      const cats: Category[] = await categoryService.getCategories(projId);
      setProjectCategories(cats);

      // Trigger AI synthesis
      setIsGeneratingTicket(true);
      const proj = projects.find((p) => p.id === projId);
      const aiTicket = await noteService.generateTicketFromNote(
        note.title,
        note.content,
        proj?.name,
        cats.map((c: Category) => c.name)
      );

      const matchedCategory = cats.find(
        (c: Category) => c.name.toLowerCase() === aiTicket.category?.toLowerCase()
      );

      setTicketDraft({
        title: aiTicket.title || note.title,
        description: aiTicket.description || note.content,
        notes: aiTicket.notes || `Created from note: ${note.title}`,
        priority: aiTicket.priority || 'medium',
        categoryId: matchedCategory ? matchedCategory.id : cats[0]?.id || '',
      });
    } catch (e) {
      console.error(e);
    } finally {
      setIsGeneratingTicket(false);
    }
  };

  const handleConfirmConvert = async () => {
    if (!noteToConvert || !targetProjectId) return;
    if (!ticketDraft.title.trim()) {
      alert('Please provide a ticket title.');
      return;
    }

    setIsSubmittingTicket(true);
    try {
      const { note, ticket } = await noteService.createTicketFromNote(
        noteToConvert.id,
        targetProjectId,
        {
          title: ticketDraft.title.trim(),
          description: ticketDraft.description,
          notes: ticketDraft.notes,
          priority: ticketDraft.priority,
          categoryId: ticketDraft.categoryId,
        }
      );

      setIsConvertModalOpen(false);
      showToast(`Ticket ${ticket.ticket_number} created on board!`);
      await loadData();
    } catch (e: any) {
      alert(e.message || 'Failed to convert note to ticket');
    } finally {
      setIsSubmittingTicket(false);
    }
  };

  // Unique list of all tags across notes for filtering
  const allTags = useMemo(() => {
    const set = new Set<string>();
    notes.forEach((n) => n.tags?.forEach((t) => set.add(t)));
    return Array.from(set);
  }, [notes]);

  // Format date helper
  const formatTimeAgo = (dateStr: string) => {
    const now = new Date().getTime();
    const then = new Date(dateStr).getTime();
    const diffSecs = Math.max(0, Math.floor((now - then) / 1000));

    if (diffSecs < 60) return 'Just now';
    if (diffSecs < 3600) return `${Math.floor(diffSecs / 60)}m ago`;
    if (diffSecs < 86400) return `${Math.floor(diffSecs / 3600)}h ago`;
    return new Date(dateStr).toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <div className="space-y-6 pb-12 max-w-7xl mx-auto">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 bg-slate-900 text-white text-xs px-4 py-3 rounded-lg shadow-lg border border-slate-800 animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold text-slate-900 tracking-tight">
              Notes & Quick Scratchpad
            </h1>
            <span className="text-xs text-slate-400">·</span>
            <span className="text-xs text-slate-500 font-medium">{notes.length} saved</span>
          </div>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl">
            Jot down rapid thoughts, extract text from screenshots via AI OCR, transcribe voice memos, and seamlessly
            convert any note into a formal Kanban ticket when you're ready.
          </p>
        </div>

        {/* Quick Capture Buttons */}
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleOpenNewNote('ocr')}
            className="text-xs"
            leftIcon={<ImageIcon className="w-3.5 h-3.5 text-indigo-600" />}
          >
            Image to Text
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => handleOpenNewNote('audio')}
            className="text-xs"
            leftIcon={<Mic className="w-3.5 h-3.5 text-rose-600" />}
          >
            Voice Note
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => handleOpenNewNote()}
            className="text-xs font-semibold shadow-xs"
            leftIcon={<Plus className="w-3.5 h-3.5" />}
          >
            New Note
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-xl p-3.5 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search */}
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search notes by title, content, or tags..."
              value={filters.search || ''}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* Status Tabs */}
          <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200/60 dark:border-slate-700 shrink-0">
            <button
              type="button"
              onClick={() => setFilters({ ...filters, status: 'all' })}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                filters.status === 'all'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              All Notes
            </button>
            <button
              type="button"
              onClick={() => setFilters({ ...filters, status: 'open' })}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                filters.status === 'open'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Open Drafts
            </button>
            <button
              type="button"
              onClick={() => setFilters({ ...filters, status: 'converted' })}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                filters.status === 'converted'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Converted
            </button>
            <button
              type="button"
              onClick={() => setFilters({ ...filters, status: 'pinned' })}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                filters.status === 'pinned'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Pinned
            </button>
          </div>
        </div>

        {/* Project & Tag Filters */}
        <div className="flex items-center gap-2 flex-wrap pt-1 border-t border-slate-100 dark:border-slate-800 text-xs">
          <select
            value={filters.projectId || ''}
            onChange={(e) => setFilters({ ...filters, projectId: e.target.value })}
            className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-2.5 py-1 text-slate-700 dark:text-slate-200"
          >
            <option value="">All Projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          {allTags.length > 0 && (
            <select
              value={filters.tag || ''}
              onChange={(e) => setFilters({ ...filters, tag: e.target.value })}
              className="bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1 text-slate-700"
            >
              <option value="">All Tags</option>
              {allTags.map((t) => (
                <option key={t} value={t}>
                  #{t}
                </option>
              ))}
            </select>
          )}

          {(filters.search || filters.projectId || filters.tag || filters.status !== 'all') && (
            <button
              type="button"
              onClick={() => setFilters({ search: '', projectId: '', tag: '', status: 'all' })}
              className="text-xs text-rose-600 hover:text-rose-700 font-medium px-2 py-0.5 cursor-pointer ml-auto"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Notes Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-44 bg-slate-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : notes.length === 0 ? (
        <div className="bg-white border border-slate-200/90 rounded-xl p-12 text-center max-w-md mx-auto shadow-2xs">
          <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center mx-auto mb-3">
            <StickyNote className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-semibold text-slate-900 mb-1">No notes found</h3>
          <p className="text-xs text-slate-500 mb-5 leading-relaxed">
            Quickly capture ideas, paste error logs, extract text from screenshots, or transcribe voice notes for later
            ticket creation.
          </p>
          <Button variant="primary" size="sm" onClick={() => handleOpenNewNote()} leftIcon={<Plus className="w-4 h-4" />}>
            Create First Note
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {notes.map((note) => {
            const isPlaying = playingAudioId === note.id;

            return (
              <div
                key={note.id}
                onClick={() => handleEditNote(note)}
                className={`group bg-white dark:bg-slate-900 border rounded-xl p-4 transition-all duration-200 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-xs flex flex-col justify-between cursor-pointer ${
                  note.is_pinned
                    ? 'border-indigo-300/80 dark:border-indigo-500/50 bg-gradient-to-br from-white to-indigo-50/20 dark:from-slate-900 dark:to-indigo-950/25'
                    : 'border-slate-200/90 dark:border-slate-800'
                }`}
              >
                <div>
                  {/* Top Header: Project name, Pin & Convert state */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-1.5 truncate">
                      {note.project_name ? (
                        <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded truncate">
                          {note.project_name}
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-800/60 px-2 py-0.5 rounded">
                          General Note
                        </span>
                      )}

                      {note.is_converted_to_ticket && (
                        <span className="text-[10px] font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded flex items-center gap-1 shrink-0">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                          <span>{note.converted_ticket_number || 'Issue'}</span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => handleTogglePin(note, e)}
                        className={`p-1 rounded hover:bg-slate-100 transition-colors cursor-pointer ${
                          note.is_pinned ? 'text-indigo-600' : 'text-slate-300 hover:text-slate-600'
                        }`}
                        title={note.is_pinned ? 'Unpin note' : 'Pin note to top'}
                      >
                        <Pin className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={(e) => handleDeleteNote(note.id, e)}
                        className="p-1 rounded text-slate-300 hover:text-rose-600 hover:bg-slate-100 transition-colors cursor-pointer opacity-0 group-hover:opacity-100"
                        title="Delete note"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Title */}
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-1 mb-1">
                    {note.title}
                  </h3>

                  {/* Content snippet */}
                  <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-4 leading-relaxed whitespace-pre-line mb-3 font-normal">
                    {note.content || <span className="italic text-slate-400 dark:text-slate-500">No text description</span>}
                  </p>

                  {/* Attached Media Chips */}
                  <div className="space-y-2 mb-3">
                    {note.image_url && (
                      <div className="flex items-center gap-2 p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                        <img
                          src={note.image_url}
                          alt="Attached snippet"
                          className="w-8 h-8 rounded object-cover border border-slate-200 dark:border-slate-700"
                        />
                        <div className="truncate flex-1">
                          <span className="text-[11px] font-medium text-slate-700 dark:text-slate-300 block truncate">
                            {note.image_name || 'Attached screenshot'}
                          </span>
                          <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium">AI OCR Analyzed</span>
                        </div>
                      </div>
                    )}

                    {note.audio_url && (
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePlayAudio(note.id, note.audio_url);
                        }}
                        className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <div className="w-6 h-6 rounded-full bg-slate-900 dark:bg-indigo-600 text-white flex items-center justify-center shrink-0">
                            {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3 ml-0.5" />}
                          </div>
                          <span className="text-xs font-medium text-slate-700 dark:text-slate-200 truncate">
                            {note.audio_name || 'Voice Memo'}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 shrink-0 font-mono">
                          {note.audio_duration ? `${note.audio_duration}s` : 'Audio'}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Tags */}
                  {note.tags && note.tags.length > 0 && (
                    <div className="flex items-center gap-1 flex-wrap mb-3">
                      {note.tags.map((t) => (
                        <span
                          key={t}
                          className="text-[10px] font-medium text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700 px-1.5 py-0.2 rounded"
                        >
                          #{t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Footer: Timestamps & Action Buttons */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500 text-[11px]">
                    <Clock className="w-3 h-3" />
                    <span>{formatTimeAgo(note.updated_at || note.created_at)}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {!note.is_converted_to_ticket ? (
                      <button
                        type="button"
                        onClick={(e) => handleOpenConvertModal(note, e)}
                        className="flex items-center gap-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 px-2 py-1 rounded-md transition-colors cursor-pointer"
                        title="Create formal issue on Kanban board"
                      >
                        <Sparkles className="w-3 h-3" />
                        <span>Create Issue</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (note.project_id) {
                            navigate(`/projects/${note.project_id}`);
                          } else {
                            navigate('/tickets');
                          }
                        }}
                        className="flex items-center gap-1 text-[11px] font-medium text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
                      >
                        <span>View Board</span>
                        <ArrowUpRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL 1: Note Editor Modal with AI OCR & Voice Transcription */}
      <Modal
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        title={editingNote?.id ? 'Edit Scratchpad Note' : 'Create Quick Note'}
      >
        <div className="space-y-4 pt-1 max-h-[80vh] overflow-y-auto pr-1">
          {/* Note Title */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Title</label>
            <input
              type="text"
              placeholder="e.g. Bug: Biometric token expiry / Webhook backoff specs..."
              value={noteTitle}
              onChange={(e) => setNoteTitle(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-800"
            />
          </div>

          {/* Project & Pinned */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Assign to Project (Optional)</label>
              <select
                value={noteProjectId}
                onChange={(e) => setNoteProjectId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-800"
              >
                <option value="">General Workspace (Not Project-Specific)</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center pt-5">
              <label className="flex items-center gap-2 text-xs text-slate-700 font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={isPinned}
                  onChange={(e) => setIsPinned(e.target.checked)}
                  className="rounded border-slate-300 text-slate-900 focus:ring-slate-800"
                />
                <Pin className="w-3.5 h-3.5 text-indigo-600" />
                <span>Pin note to top of scratchpad</span>
              </label>
            </div>
          </div>

          {/* AI Tools Strip: OCR & Voice Transcription */}
          <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-3">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block">
              Modern AI Capture Tools
            </span>

            <div className="flex flex-wrap items-center gap-2">
              {/* Image to Text (OCR) Trigger */}
              <label className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-medium rounded-lg cursor-pointer shadow-2xs transition-all">
                <ImageIcon className="w-3.5 h-3.5 text-indigo-600" />
                <span>{attachedImageBase64 ? 'Replace Image' : 'Image to Text (OCR)'}</span>
                <input
                  id="note-image-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </label>

              {/* Voice Recording / Transcribe Trigger */}
              {!isRecording ? (
                <button
                  type="button"
                  onClick={startRecording}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-medium rounded-lg cursor-pointer shadow-2xs transition-all"
                >
                  <Mic className="w-3.5 h-3.5 text-rose-600" />
                  <span>Record Voice Memo</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={stopRecording}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 text-white text-xs font-semibold rounded-lg cursor-pointer shadow-2xs animate-pulse"
                >
                  <MicOff className="w-3.5 h-3.5" />
                  <span>Stop Recording ({recordingSeconds}s)</span>
                </button>
              )}

              {/* Upload audio file directly */}
              <label className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-medium rounded-lg cursor-pointer shadow-2xs transition-all">
                <Upload className="w-3.5 h-3.5 text-slate-500" />
                <span>Upload Audio</span>
                <input
                  type="file"
                  accept="audio/*"
                  onChange={handleAudioFileUpload}
                  className="hidden"
                />
              </label>
            </div>

            {/* OCR / Transcribe In-Progress Feedback */}
            {isExtractingText && (
              <div className="flex items-center gap-2 text-xs text-indigo-700 font-medium">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Extracting all text from image with Gemini Vision...</span>
              </div>
            )}

            {isTranscribing && (
              <div className="flex items-center gap-2 text-xs text-rose-700 font-medium">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Transcribing voice audio with Gemini Transcribe...</span>
              </div>
            )}

            {ocrSuccessMsg && (
              <div className="text-xs text-emerald-700 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{ocrSuccessMsg}</span>
              </div>
            )}

            {/* Attached Image Thumbnail Preview */}
            {attachedImageBase64 && (
              <div className="flex items-center justify-between p-2 bg-white rounded-lg border border-slate-200">
                <div className="flex items-center gap-2">
                  <img
                    src={attachedImageBase64}
                    alt="Uploaded thumbnail"
                    className="w-10 h-10 rounded object-cover border border-slate-200"
                  />
                  <div className="truncate">
                    <span className="text-xs font-medium text-slate-800 block truncate">
                      {attachedImageName || 'Attached Image'}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRunOCR(attachedImageBase64, 'image/png', attachedImageName || '')}
                      className="text-[11px] text-indigo-600 hover:underline font-medium cursor-pointer"
                    >
                      Re-run Text Extraction
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setAttachedImageBase64(null);
                    setAttachedImageName(null);
                  }}
                  className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Attached Audio Memo Preview */}
            {attachedAudioBase64 && (
              <div className="flex items-center justify-between p-2 bg-white rounded-lg border border-slate-200">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-slate-900 text-white flex items-center justify-center">
                    <Volume2 className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="text-xs font-medium text-slate-800 block">
                      {attachedAudioName || 'Attached Voice Memo'}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRunTranscribe(attachedAudioBase64, 'audio/webm')}
                      className="text-[11px] text-rose-600 hover:underline font-medium cursor-pointer"
                    >
                      Re-transcribe Audio
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setAttachedAudioBase64(null);
                    setAttachedAudioName(null);
                  }}
                  className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Note Content */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-slate-700">Note Content / Scratchpad</label>
              <span className="text-[10px] text-slate-400 font-mono">
                {noteContent.length} chars · {noteContent.split(/\s+/).filter(Boolean).length} words
              </span>
            </div>
            <textarea
              rows={8}
              placeholder="Write raw bullet points, caveats, bug details, acceptance criteria, or code snippets..."
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-800 leading-relaxed font-mono"
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Tags</label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Type tag (e.g. auth, bug, api) and press Add..."
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
                className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-800"
              />
              <Button variant="outline" size="sm" onClick={handleAddTag} className="text-xs">
                Add Tag
              </Button>
            </div>

            {noteTags.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap mt-2">
                {noteTags.map((t) => (
                  <span
                    key={t}
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded"
                  >
                    #{t}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(t)}
                      className="text-slate-400 hover:text-rose-600 cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <Button variant="ghost" size="sm" onClick={() => setIsEditorOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleSaveNote}>
              Save Note
            </Button>
          </div>
        </div>
      </Modal>

      {/* MODAL 2: Convert Note to Ticket Automatically */}
      <Modal
        isOpen={isConvertModalOpen}
        onClose={() => setIsConvertModalOpen(false)}
        title="Convert Scratchpad Note to Kanban Ticket"
      >
        <div className="space-y-4 pt-1 max-h-[80vh] overflow-y-auto pr-1">
          <p className="text-xs text-slate-600 leading-relaxed">
            Transform this scratchpad note into an active issue on your Kanban board. Review and edit the details
            generated by AI before publishing.
          </p>

          {/* Target Project Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Target Project</label>
            <select
              value={targetProjectId}
              onChange={(e) => {
                const newId = e.target.value;
                setTargetProjectId(newId);
                if (noteToConvert && newId) {
                  loadProjectCategoriesAndSuggest(newId, noteToConvert);
                }
              }}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-800"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* AI Synthesis Banner */}
          {isGeneratingTicket ? (
            <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center gap-2.5 text-xs text-indigo-700 font-medium">
              <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
              <span>Analyzing note content and synthesizing ticket specification with Gemini AI...</span>
            </div>
          ) : (
            <div className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200/80 rounded-lg text-xs">
              <div className="flex items-center gap-1.5 text-slate-700">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                <span>AI Ticket structuring applied from note</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (noteToConvert && targetProjectId) {
                    loadProjectCategoriesAndSuggest(targetProjectId, noteToConvert);
                  }
                }}
                className="text-indigo-600 hover:underline font-semibold cursor-pointer"
              >
                Re-generate
              </button>
            </div>
          )}

          {/* Ticket Title */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Ticket Title</label>
            <input
              type="text"
              value={ticketDraft.title}
              onChange={(e) => setTicketDraft({ ...ticketDraft, title: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 font-medium focus:outline-none focus:ring-1 focus:ring-slate-800"
            />
          </div>

          {/* Category & Priority */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
              <select
                value={ticketDraft.categoryId}
                onChange={(e) => setTicketDraft({ ...ticketDraft, categoryId: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-800"
              >
                {projectCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Priority</label>
              <select
                value={ticketDraft.priority}
                onChange={(e) => setTicketDraft({ ...ticketDraft, priority: e.target.value as TicketPriority })}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-800"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>

          {/* Ticket Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Description & Acceptance Criteria</label>
            <textarea
              rows={5}
              value={ticketDraft.description}
              onChange={(e) => setTicketDraft({ ...ticketDraft, description: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-800 leading-relaxed font-mono"
            />
          </div>

          {/* Technical Execution Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Technical Notes / Implementation Scratchpad</label>
            <textarea
              rows={3}
              value={ticketDraft.notes}
              onChange={(e) => setTicketDraft({ ...ticketDraft, notes: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-800 leading-relaxed font-mono"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <Button variant="ghost" size="sm" onClick={() => setIsConvertModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleConfirmConvert}
              disabled={isSubmittingTicket || !targetProjectId}
              leftIcon={<Check className="w-4 h-4" />}
            >
              {isSubmittingTicket ? 'Creating Ticket...' : 'Create Kanban Issue'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
