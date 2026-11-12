import React, { useState, useRef } from 'react';
import {
  StickyNote,
  Plus,
  Search,
  Image as ImageIcon,
  Mic,
  MicOff,
  Sparkles,
  Pin,
  Trash2,
  Edit3,
  Clock,
  CheckCircle2,
  Tag,
  FolderKanban,
  Play,
  Pause,
  Upload,
  ArrowUpRight,
  Loader2,
  X,
  FileText,
} from 'lucide-react';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Modal } from '../../components/Modal';
import { useAuth } from '../../context/AuthContext';
import { noteService } from '../../services/noteService';
import { Project, ProjectNote, TicketPriority, Category } from '../../types';

export interface ProjectNotesSectionProps {
  project: Project;
  notes: ProjectNote[];
  categories: Category[];
  onRefresh: () => Promise<void>;
  onOpenTicketForm?: (draftData: any) => void;
}

export const ProjectNotesSection: React.FC<ProjectNotesSectionProps> = ({
  project,
  notes,
  categories,
  onRefresh,
}) => {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [selectedTag, setSelectedTag] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'converted' | 'pinned'>('all');

  // Modal State
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<ProjectNote | null>(null);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [noteTags, setNoteTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [isPinned, setIsPinned] = useState(false);
  const [attachedImageBase64, setAttachedImageBase64] = useState<string | null>(null);
  const [attachedImageName, setAttachedImageName] = useState<string | null>(null);
  const [attachedAudioBase64, setAttachedAudioBase64] = useState<string | null>(null);
  const [attachedAudioName, setAttachedAudioName] = useState<string | null>(null);
  const [attachedAudioDuration, setAttachedAudioDuration] = useState<number | null>(null);

  // AI & Voice State
  const [isExtractingText, setIsExtractingText] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [ocrSuccessMsg, setOcrSuccessMsg] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<any>(null);

  // Audio Playback
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  // Convert Note to Ticket State
  const [isConvertModalOpen, setIsConvertModalOpen] = useState(false);
  const [noteToConvert, setNoteToConvert] = useState<ProjectNote | null>(null);
  const [convertTitle, setConvertTitle] = useState('');
  const [convertDescription, setConvertDescription] = useState('');
  const [convertPriority, setConvertPriority] = useState<TicketPriority>('medium');
  const [convertCategoryId, setConvertCategoryId] = useState('');
  const [isConverting, setIsConverting] = useState(false);

  // Collect all unique tags for this project's notes
  const allTags = Array.from(new Set(notes.flatMap((n) => n.tags || [])));

  // Filter notes
  const filteredNotes = notes.filter((n) => {
    if (search) {
      const q = search.toLowerCase();
      const matchTitle = n.title?.toLowerCase().includes(q);
      const matchContent = n.content?.toLowerCase().includes(q);
      const matchTag = n.tags?.some((t) => t.toLowerCase().includes(q));
      if (!matchTitle && !matchContent && !matchTag) return false;
    }
    if (selectedTag && (!n.tags || !n.tags.includes(selectedTag))) return false;
    if (statusFilter === 'open' && n.is_converted_to_ticket) return false;
    if (statusFilter === 'converted' && !n.is_converted_to_ticket) return false;
    if (statusFilter === 'pinned' && !n.is_pinned) return false;
    return true;
  });

  const handleOpenNewNote = (initialAction?: 'ocr' | 'audio') => {
    setEditingNote(null);
    setNoteTitle('');
    setNoteContent('');
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

    if (initialAction === 'ocr') {
      setTimeout(() => {
        const fileInput = document.getElementById('project-note-image-upload') as HTMLInputElement;
        if (fileInput) fileInput.click();
      }, 150);
    } else if (initialAction === 'audio') {
      setTimeout(() => {
        startRecording();
      }, 200);
    }
  };

  const handleEditNote = (note: ProjectNote) => {
    setEditingNote(note);
    setNoteTitle(note.title);
    setNoteContent(note.content);
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

  const handleSaveNote = async () => {
    if (!noteTitle.trim() && !noteContent.trim() && !attachedImageBase64 && !attachedAudioBase64) {
      alert('Please provide a title, content, or attach media to save.');
      return;
    }

    try {
      await noteService.saveNote({
        id: editingNote?.id,
        project_id: project.id,
        project_name: project.name,
        title: noteTitle.trim() || 'Untitled Project Note',
        content: noteContent.trim(),
        tags: noteTags,
        is_pinned: isPinned,
        image_url: attachedImageBase64,
        image_name: attachedImageName,
        audio_url: attachedAudioBase64,
        audio_name: attachedAudioName,
        audio_duration: attachedAudioDuration,
        author_id: user?.id,
        author_name: user?.name,
      });

      setIsEditorOpen(false);
      await onRefresh();
    } catch (e) {
      console.error('Failed to save project note:', e);
      alert('Failed to save note. Please try again.');
    }
  };

  const handleDeleteNote = async (noteId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Delete this note from the project?')) return;
    try {
      await noteService.deleteNote(noteId);
      await onRefresh();
    } catch (e) {
      console.error('Failed to delete note:', e);
    }
  };

  const handleTogglePin = async (note: ProjectNote, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await noteService.saveNote({
        ...note,
        is_pinned: !note.is_pinned,
      });
      await onRefresh();
    } catch (e) {
      console.error('Failed to pin/unpin note:', e);
    }
  };

  // Convert to Ticket
  const handleOpenConvert = (note: ProjectNote, e: React.MouseEvent) => {
    e.stopPropagation();
    setNoteToConvert(note);
    setConvertTitle(note.title);
    setConvertDescription(note.content || '');
    setConvertPriority('medium');
    setConvertCategoryId(categories[0]?.id || '');
    setIsConvertModalOpen(true);
  };

  const handleConfirmConvert = async () => {
    if (!noteToConvert) return;
    setIsConverting(true);
    try {
      await noteService.createTicketFromNote(noteToConvert.id, project.id, {
        title: convertTitle.trim() || noteToConvert.title,
        description: convertDescription.trim(),
        notes: `Converted from project note #${noteToConvert.id.slice(-5)}`,
        priority: convertPriority,
        categoryId: convertCategoryId,
      });
      setIsConvertModalOpen(false);
      setNoteToConvert(null);
      await onRefresh();
    } catch (e) {
      console.error('Failed to convert note to ticket:', e);
      alert('Could not convert note to ticket. Please verify inputs.');
    } finally {
      setIsConverting(false);
    }
  };

  // Image Upload & OCR
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const b64 = reader.result as string;
      setAttachedImageBase64(b64);
      setAttachedImageName(file.name);
      handleExtractTextFromBase64(b64, file.type);
    };
    reader.readAsDataURL(file);
  };

  const handleExtractTextFromBase64 = async (b64: string, mime: string) => {
    setIsExtractingText(true);
    setOcrSuccessMsg(null);
    try {
      const extracted = await noteService.extractTextFromImage(b64, mime);
      if (extracted) {
        setNoteContent((prev) => (prev ? `${prev}\n\n[OCR Transcribed Text]:\n${extracted}` : extracted));
        if (!noteTitle) {
          const firstLine = extracted.split('\n')[0]?.trim().slice(0, 60);
          if (firstLine) setNoteTitle(firstLine);
        }
        setOcrSuccessMsg('Text extracted successfully from image.');
      }
    } catch (err: any) {
      console.warn('OCR error:', err);
    } finally {
      setIsExtractingText(false);
    }
  };

  // Audio Recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = async () => {
          const b64 = reader.result as string;
          setAttachedAudioBase64(b64);
          setAttachedAudioName(`voice-note-${Date.now().toString(36)}.webm`);
          setAttachedAudioDuration(recordingSeconds);
          handleTranscribeAudio(b64, 'audio/webm');
        };
        reader.readAsDataURL(audioBlob);

        stream.getTracks().forEach((track) => track.stop());
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setRecordingSeconds(0);

      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((s) => s + 1);
      }, 1000);
    } catch (err) {
      console.error('Microphone access denied:', err);
      alert('Microphone access was denied. Please allow audio access in your browser.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(recordingTimerRef.current);
    }
  };

  const handleTranscribeAudio = async (b64: string, mime: string) => {
    setIsTranscribing(true);
    try {
      const transcribed = await noteService.transcribeAudio(b64, mime);
      if (transcribed) {
        setNoteContent((prev) => (prev ? `${prev}\n\n[Voice Note Transcription]:\n${transcribed}` : transcribed));
        if (!noteTitle) {
          const firstSentence = transcribed.split('.')[0]?.trim().slice(0, 50);
          if (firstSentence) setNoteTitle(`Voice Note: ${firstSentence}`);
        }
      }
    } catch (err) {
      console.warn('Transcription error:', err);
    } finally {
      setIsTranscribing(false);
    }
  };

  // Audio Playback
  const handleTogglePlayAudio = (noteId: string, audioUrl: string, e: React.MouseEvent) => {
    e.stopPropagation();
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
      audio.onerror = () => setPlayingAudioId(null);
    }
  };

  const handleAddTag = () => {
    const t = tagInput.trim().replace(/^#/, '');
    if (t && !noteTags.includes(t)) {
      setNoteTags([...noteTags, t]);
      setTagInput('');
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Banner & Action Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/60 border border-amber-200/60 dark:border-amber-800/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <StickyNote className="w-4 h-4" />
            </div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              {project.name} • Project Notes
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            All notes created here stay locked to this project. Capture quick specs, image OCR, voice memos, and convert them to tickets anytime.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleOpenNewNote('ocr')}
            leftIcon={<ImageIcon className="w-3.5 h-3.5 text-sky-600" />}
            className="text-xs"
          >
            Image OCR
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => handleOpenNewNote('audio')}
            leftIcon={<Mic className="w-3.5 h-3.5 text-rose-600" />}
            className="text-xs"
          >
            Voice Note
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => handleOpenNewNote()}
            leftIcon={<Plus className="w-3.5 h-3.5" />}
            className="text-xs shadow-2xs"
          >
            New Project Note
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-2xs">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search this project's notes..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
          {/* Status Tabs */}
          <div className="inline-flex p-0.5 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200/60 dark:border-slate-700 text-xs">
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                statusFilter === 'all'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              All ({notes.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('open')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                statusFilter === 'open'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Drafts
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('converted')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                statusFilter === 'converted'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Converted
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('pinned')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                statusFilter === 'pinned'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Pinned
            </button>
          </div>

          {allTags.length > 0 && (
            <select
              value={selectedTag}
              onChange={(e) => setSelectedTag(e.target.value)}
              className="text-xs font-medium bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-slate-700 dark:text-slate-200 cursor-pointer"
            >
              <option value="">All Tags</option>
              {allTags.map((t) => (
                <option key={t} value={t}>
                  #{t}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Notes Grid */}
      {filteredNotes.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200/60 dark:border-amber-800/60 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
            <StickyNote className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-sm sm:text-base text-slate-800 dark:text-slate-100">
              {search ? 'No notes matched your search' : `No notes in "${project.name}" yet`}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
              Save meeting thoughts, screenshot snippets with Image OCR, or voice transcriptions. You can convert any note into a formal ticket with one click.
            </p>
          </div>
          <div className="flex items-center justify-center gap-2 pt-2">
            <Button variant="primary" size="sm" onClick={() => handleOpenNewNote()} leftIcon={<Plus className="w-3.5 h-3.5" />}>
              Create Note
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleOpenNewNote('ocr')} leftIcon={<ImageIcon className="w-3.5 h-3.5" />}>
              Upload Image OCR
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredNotes.map((note) => {
            const isPlaying = playingAudioId === note.id;

            return (
              <div
                key={note.id}
                onClick={() => handleEditNote(note)}
                className={`group bg-white dark:bg-slate-900 border rounded-2xl p-4.5 transition-all duration-200 hover:border-indigo-400 dark:hover:border-indigo-500/70 hover:shadow-md flex flex-col justify-between cursor-pointer select-none ${
                  note.is_pinned
                    ? 'border-indigo-300 dark:border-indigo-800 bg-gradient-to-br from-white to-indigo-50/25 dark:from-slate-900 dark:to-indigo-950/20'
                    : 'border-slate-200/90 dark:border-slate-800'
                }`}
              >
                <div>
                  {/* Top Badge Strip: Pin & Converted status */}
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/60 dark:border-indigo-800/60 px-2 py-0.5 rounded-md truncate">
                        {project.name}
                      </span>

                      {note.is_converted_to_ticket && (
                        <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/60 px-2 py-0.5 rounded-md flex items-center gap-1 shrink-0">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                          <span>{note.converted_ticket_number || 'Ticket Created'}</span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => handleTogglePin(note, e)}
                        className={`p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer ${
                          note.is_pinned ? 'text-amber-500' : 'text-slate-300 dark:text-slate-600 hover:text-slate-600'
                        }`}
                        title={note.is_pinned ? 'Unpin note' : 'Pin note to top'}
                      >
                        <Pin className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={(e) => handleDeleteNote(note.id, e)}
                        className="p-1.5 rounded-lg text-slate-300 dark:text-slate-600 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors cursor-pointer opacity-0 group-hover:opacity-100"
                        title="Delete note"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Title */}
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-1 mb-1.5">
                    {note.title}
                  </h3>

                  {/* Content snippet */}
                  <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-3 leading-relaxed whitespace-pre-line mb-3 font-normal">
                    {note.content || <span className="italic text-slate-400 dark:text-slate-500">No text description</span>}
                  </p>

                  {/* Attached Media Previews */}
                  {note.image_url && (
                    <div className="mb-3 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 max-h-28 bg-slate-100 dark:bg-slate-800">
                      <img src={note.image_url} alt="Attached snippet" className="w-full h-full object-cover" />
                    </div>
                  )}

                  {note.audio_url && (
                    <div
                      onClick={(e) => handleTogglePlayAudio(note.id, note.audio_url!, e)}
                      className="mb-3 flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 text-xs hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                          {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3 ml-0.5" />}
                        </div>
                        <span className="text-[11px] font-medium text-slate-700 dark:text-slate-200">
                          {isPlaying ? 'Playing Audio Memo...' : 'Voice Note Recording'}
                        </span>
                      </div>
                      {note.audio_duration && (
                        <span className="text-[10px] text-slate-400 font-mono">
                          {Math.floor(note.audio_duration / 60)}:{String(note.audio_duration % 60).padStart(2, '0')}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Tags */}
                  {note.tags && note.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {note.tags.map((t) => (
                        <span
                          key={t}
                          className="text-[10px] text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md font-mono"
                        >
                          #{t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Card Footer */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500 text-[11px]">
                    <Clock className="w-3 h-3" />
                    <span>{new Date(note.updated_at || note.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {!note.is_converted_to_ticket ? (
                      <button
                        type="button"
                        onClick={(e) => handleOpenConvert(note, e)}
                        className="flex items-center gap-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 px-2.5 py-1 rounded-lg transition-colors cursor-pointer border border-indigo-200/60 dark:border-indigo-800/60 shadow-2xs"
                        title="Convert to formal Kanban ticket in this project"
                      >
                        <Sparkles className="w-3 h-3" />
                        <span>Convert to Ticket</span>
                      </button>
                    ) : (
                      <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Ticket Linked</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Editor Modal for Project Note */}
      <Modal
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        title={editingNote ? `Edit Note in ${project.name}` : `New Note in ${project.name}`}
      >
        <div className="space-y-4 pt-1 max-h-[80vh] overflow-y-auto pr-1 text-slate-900 dark:text-slate-100">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Note Title
            </label>
            <input
              type="text"
              placeholder="e.g. Bug: Biometric token expiry / QA edge cases..."
              value={noteTitle}
              onChange={(e) => setNoteTitle(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
            />
          </div>

          <div className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50">
            <div className="flex items-center gap-2">
              <FolderKanban className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <div>
                <span className="text-[11px] text-slate-400 dark:text-slate-500 block font-medium">Assigned Project</span>
                <span className="font-bold text-xs text-indigo-900 dark:text-indigo-200">{project.name}</span>
              </div>
            </div>

            <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 font-medium cursor-pointer">
              <input
                type="checkbox"
                checked={isPinned}
                onChange={(e) => setIsPinned(e.target.checked)}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <Pin className="w-3.5 h-3.5 text-amber-500" />
              <span>Pin to top</span>
            </label>
          </div>

          {/* AI Tools Bar */}
          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 rounded-xl space-y-2.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
              Modern AI Capture Tools
            </span>

            <div className="flex flex-wrap items-center gap-2">
              <label className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-slate-300 text-slate-700 dark:text-slate-200 text-xs font-medium rounded-xl cursor-pointer shadow-2xs transition-all">
                <ImageIcon className="w-3.5 h-3.5 text-sky-600" />
                <span>Extract Text from Image (OCR)</span>
                <input
                  id="project-note-image-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleImageFileChange}
                  className="hidden"
                />
              </label>

              {!isRecording ? (
                <button
                  type="button"
                  onClick={startRecording}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-slate-300 text-slate-700 dark:text-slate-200 text-xs font-medium rounded-xl cursor-pointer shadow-2xs transition-all"
                >
                  <Mic className="w-3.5 h-3.5 text-rose-600" />
                  <span>Record Voice Note</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={stopRecording}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 text-white text-xs font-semibold rounded-xl cursor-pointer shadow-xs animate-pulse"
                >
                  <MicOff className="w-3.5 h-3.5" />
                  <span>Stop & Transcribe ({recordingSeconds}s)</span>
                </button>
              )}
            </div>

            {isExtractingText && (
              <div className="flex items-center gap-2 text-xs text-sky-600 dark:text-sky-400">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Gemini is reading text from image...</span>
              </div>
            )}

            {isTranscribing && (
              <div className="flex items-center gap-2 text-xs text-rose-600 dark:text-rose-400">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Transcribing voice audio note to text...</span>
              </div>
            )}

            {ocrSuccessMsg && (
              <span className="text-[11px] text-emerald-600 font-medium block">{ocrSuccessMsg}</span>
            )}
          </div>

          {/* Attached Image Preview */}
          {attachedImageBase64 && (
            <div className="relative rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden max-h-36">
              <img src={attachedImageBase64} alt="Attached" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => {
                  setAttachedImageBase64(null);
                  setAttachedImageName(null);
                }}
                className="absolute top-2 right-2 p-1 rounded-full bg-slate-900/80 text-white hover:bg-slate-900 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Content TextArea */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Note Content
            </label>
            <textarea
              rows={5}
              placeholder="Write your project thoughts, edge-case observations, or transcribe notes here..."
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 leading-relaxed"
            />
          </div>

          {/* Tags Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Tags
            </label>
            <div className="flex items-center gap-2 mb-2">
              <input
                type="text"
                placeholder="Add tag and press Enter (e.g. qa, release, api)"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
                className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <Button variant="outline" size="sm" onClick={handleAddTag} className="text-xs">
                Add Tag
              </Button>
            </div>
            {noteTags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {noteTags.map((t) => (
                  <span
                    key={t}
                    className="inline-flex items-center gap-1 text-[11px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700"
                  >
                    <span>#{t}</span>
                    <button
                      type="button"
                      onClick={() => setNoteTags(noteTags.filter((tag) => tag !== t))}
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Modal Buttons */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsEditorOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleSaveNote}>
              Save Project Note
            </Button>
          </div>
        </div>
      </Modal>

      {/* Convert Note to Ticket Modal */}
      <Modal
        isOpen={isConvertModalOpen}
        onClose={() => setIsConvertModalOpen(false)}
        title={`Convert Note to Ticket • ${project.name}`}
      >
        <div className="space-y-4 pt-1 text-slate-900 dark:text-slate-100">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            This will create a new ticket in <strong>{project.name}</strong> on the initial status ("Just Return") and link it to this note.
          </p>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Ticket Title
            </label>
            <input
              type="text"
              value={convertTitle}
              onChange={(e) => setConvertTitle(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Description
            </label>
            <textarea
              rows={4}
              value={convertDescription}
              onChange={(e) => setConvertDescription(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Priority
              </label>
              <select
                value={convertPriority}
                onChange={(e) => setConvertPriority(e.target.value as TicketPriority)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Category
              </label>
              <select
                value={convertCategoryId}
                onChange={(e) => setConvertCategoryId(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsConvertModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleConfirmConvert}
              isLoading={isConverting}
              leftIcon={<Sparkles className="w-3.5 h-3.5" />}
            >
              Create Ticket on Board
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
