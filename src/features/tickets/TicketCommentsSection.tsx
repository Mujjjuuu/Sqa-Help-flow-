import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  Send,
  Mic,
  MicOff,
  Trash2,
  Square,
  Radio,
  FileText,
  Volume2,
  Image as ImageIcon,
  X,
  Maximize2,
  Paperclip,
} from 'lucide-react';
import { TicketComment } from '../../types';
import { commentService } from '../../services/commentService';
import { useSpeechRecognition, useAudioRecorder } from '../../hooks/useVoiceSpeech';
import { AudioVoicePlayer } from '../../components/AudioVoicePlayer';
import { Button } from '../../components/Button';
import { ImageLightboxModal, LightboxImage } from '../../components/ImageLightboxModal';

interface TicketCommentsSectionProps {
  ticketId: string;
  onCommentsUpdated?: () => void;
}

interface PendingCommentImage {
  id: string;
  file: File;
  preview: string;
}

export const TicketCommentsSection: React.FC<TicketCommentsSectionProps> = ({
  ticketId,
  onCommentsUpdated,
}) => {
  const [comments, setComments] = useState<TicketComment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [commentToDelete, setCommentToDelete] = useState<string | null>(null);

  // Attached images for the current comment draft
  const [pendingImages, setPendingImages] = useState<PendingCommentImage[]>([]);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Lightbox preview state
  const [lightboxImages, setLightboxImages] = useState<LightboxImage[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  // Voice speech-to-text hook
  const {
    isListening,
    isSupported: isSpeechSupported,
    startListening,
    stopListening,
    error: speechError,
  } = useSpeechRecognition();

  // Audio voice note recording hook
  const {
    isRecording,
    recordingDuration,
    audioUrl,
    error: audioError,
    startRecording,
    stopRecording,
    cancelRecording,
  } = useAudioRecorder();

  // Load comments
  const loadComments = async () => {
    try {
      const data = await commentService.getComments(ticketId);
      setComments(data);
    } catch (e) {
      console.error('Failed to load comments:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadComments();
  }, [ticketId]);

  // Handle image files selection for comment
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const files = Array.from(e.target.files);

    files.forEach((file) => {
      if (!file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setPendingImages((prev) => [
            ...prev,
            {
              id: `img-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              file,
              preview: event.target?.result as string,
            },
          ]);
        }
      };
      reader.readAsDataURL(file);
    });

    if (imageInputRef.current) imageInputRef.current.value = '';
  };

  const removePendingImage = (id: string) => {
    setPendingImages((prev) => prev.filter((img) => img.id !== id));
  };

  // Clipboard paste support in comment box for screenshots
  const handleCommentPaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.indexOf('image') !== -1) {
        const file = item.getAsFile();
        if (file) {
          const reader = new FileReader();
          reader.onload = (event) => {
            if (event.target?.result) {
              setPendingImages((prev) => [
                ...prev,
                {
                  id: `img-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                  file,
                  preview: event.target?.result as string,
                },
              ]);
            }
          };
          reader.readAsDataURL(file);
        }
      }
    }
  };

  // Open Lightbox for a comment's images
  const handleOpenCommentImageLightbox = (comment: TicketComment, clickedIndex: number) => {
    if (!comment.images || comment.images.length === 0) return;
    const formatted: LightboxImage[] = comment.images.map((imgUrl, idx) => ({
      url: imgUrl,
      title: `Attachment ${idx + 1} from comment`,
      source: `Uploaded by ${comment.user_name}`,
      date: new Date(comment.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' }),
    }));
    setLightboxImages(formatted);
    setLightboxIndex(clickedIndex);
    setIsLightboxOpen(true);
  };

  // Handle Speech to Text transcription for comment field
  const handleToggleDictation = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening((text) => {
        setCommentText((prev) => (prev ? `${prev.trim()} ${text}` : text));
      });
    }
  };

  // Start voice recording and optionally also transcribe simultaneously
  const handleStartVoiceRecording = async () => {
    await startRecording();
    if (isSpeechSupported && !isListening) {
      startListening((text) => {
        setCommentText((prev) => (prev ? `${prev.trim()} ${text}` : text));
      });
    }
  };

  const handleStopVoiceRecording = () => {
    stopRecording();
    if (isListening) {
      stopListening();
    }
  };

  const handleCancelVoiceRecording = () => {
    cancelRecording();
    if (isListening) {
      stopListening();
    }
  };

  // Submit comment
  const handleSubmitComment = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!commentText.trim() && !audioUrl && pendingImages.length === 0) return;

    setIsSubmitting(true);
    try {
      const imageUrls = pendingImages.map((img) => img.preview);

      await commentService.addComment({
        ticketId,
        content: commentText.trim(),
        images: imageUrls.length > 0 ? imageUrls : undefined,
        audioUrl: audioUrl || undefined,
        audioDuration: recordingDuration > 0 ? recordingDuration : undefined,
        isVoiceMessage: Boolean(audioUrl),
      });

      setCommentText('');
      setPendingImages([]);
      cancelRecording();
      await loadComments();
      if (onCommentsUpdated) onCommentsUpdated();
    } catch (err) {
      console.error('Failed to post comment:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteComment = async (id: string) => {
    try {
      await commentService.deleteComment(id);
      setComments((prev) => prev.filter((c) => c.id !== id));
      if (onCommentsUpdated) onCommentsUpdated();
    } catch (err) {
      console.error('Failed to delete comment:', err);
    } finally {
      setCommentToDelete(null);
    }
  };

  const formatTimer = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="space-y-4 pt-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-slate-700" />
          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Discussion & Comments ({comments.length})
          </h4>
        </div>
        <span className="text-[11px] text-slate-400">
          Text, images, voice notes & speech transcription
        </span>
      </div>

      {/* Error Notices */}
      {(speechError || audioError) && (
        <div className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-2.5">
          {speechError || audioError}
        </div>
      )}

      {/* Comments List */}
      <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
        {isLoading ? (
          <div className="py-6 text-center text-xs text-slate-400">Loading comments...</div>
        ) : comments.length === 0 ? (
          <div className="py-6 text-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50">
            <MessageSquare className="w-6 h-6 text-slate-300 mx-auto mb-1.5" />
            <p className="text-xs text-slate-500 font-medium">No comments yet</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Upload images, leave notes, speak to transcribe, or record voice memos below.
            </p>
          </div>
        ) : (
          comments.map((comment) => (
            <div
              key={comment.id}
              className="p-3.5 rounded-xl border border-slate-200/90 bg-white hover:border-slate-300 transition-all shadow-2xs space-y-2 group"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 font-bold text-[10px] flex items-center justify-center shrink-0">
                    {comment.user_name.slice(0, 2).toUpperCase()}
                  </div>
                  <span className="font-semibold text-xs text-slate-800 truncate">
                    {comment.user_name}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {new Date(comment.created_at).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}{' '}
                    · {new Date(comment.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                  {comment.images && comment.images.length > 0 && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                      <ImageIcon className="w-2.5 h-2.5" />
                      {comment.images.length} {comment.images.length === 1 ? 'image' : 'images'}
                    </span>
                  )}
                  {comment.is_voice_message && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200/60">
                      <Volume2 className="w-2.5 h-2.5" />
                      Voice Note
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => handleDeleteComment(comment.id)}
                    className="p-1 text-slate-400 hover:text-rose-600 rounded-md hover:bg-rose-50 transition-colors cursor-pointer"
                    title="Delete comment"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Voice Player if comment has audio */}
              {comment.audio_url && (
                <div className="pt-1">
                  <AudioVoicePlayer
                    src={comment.audio_url}
                    duration={comment.audio_duration}
                  />
                </div>
              )}

              {/* Text content or transcription */}
              {comment.content && (
                <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed pt-0.5">
                  {comment.content}
                </p>
              )}

              {/* Attached Images in Comment */}
              {comment.images && comment.images.length > 0 && (
                <div className="pt-2 flex flex-wrap gap-2">
                  {comment.images.map((imgUrl, imgIdx) => (
                    <div
                      key={imgIdx}
                      onClick={() => handleOpenCommentImageLightbox(comment, imgIdx)}
                      className="group/img relative w-20 h-20 sm:w-24 sm:h-24 rounded-lg overflow-hidden border border-slate-200/80 bg-slate-50 cursor-pointer shadow-2xs hover:shadow-md transition-all hover:scale-102"
                      title="Click to expand full screen"
                    >
                      <img
                        src={imgUrl}
                        alt={`Attachment ${imgIdx + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/img:opacity-100 flex items-center justify-center transition-opacity text-white">
                        <Maximize2 className="w-4 h-4" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Live Voice Recording Status Box */}
      {isRecording && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between gap-3 animate-pulse">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-rose-600 animate-spin" />
            <span className="text-xs font-semibold text-rose-900">
              Recording Voice Message: <strong className="font-mono">{formatTimer(recordingDuration)}</strong>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCancelVoiceRecording}
              className="text-xs text-rose-700 border-rose-300 hover:bg-rose-100"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleStopVoiceRecording}
              leftIcon={<Square className="w-3 h-3 fill-current" />}
              className="text-xs bg-rose-600 hover:bg-rose-700 text-white"
            >
              Finish Recording
            </Button>
          </div>
        </div>
      )}

      {/* Audio Voice Note Ready Preview */}
      {audioUrl && !isRecording && (
        <div className="p-3 bg-indigo-50/70 border border-indigo-200/80 rounded-xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-indigo-950 flex items-center gap-1.5">
              <Volume2 className="w-3.5 h-3.5 text-indigo-600" />
              Recorded Voice Message ({formatTimer(recordingDuration)})
            </span>
            <button
              type="button"
              onClick={handleCancelVoiceRecording}
              className="text-[11px] text-slate-500 hover:text-rose-600 font-medium cursor-pointer"
            >
              Discard Audio
            </button>
          </div>
          <AudioVoicePlayer src={audioUrl} duration={recordingDuration} />
          {commentText && (
            <p className="text-[11px] text-slate-600 italic">
              Transcribed text included below will be sent with this voice message.
            </p>
          )}
        </div>
      )}

      {/* Dictation Listening Indicator */}
      {isListening && (
        <div className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
            Transcribing voice speech in real-time... Speak now.
          </span>
          <button
            type="button"
            onClick={stopListening}
            className="text-[11px] font-semibold text-amber-800 hover:underline cursor-pointer"
          >
            Stop
          </button>
        </div>
      )}

      {/* Pending Images Preview Strip in Form */}
      {pendingImages.length > 0 && (
        <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
          <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium px-1">
            <span>Attached Images ({pendingImages.length})</span>
            <button
              type="button"
              onClick={() => setPendingImages([])}
              className="text-slate-400 hover:text-rose-600 cursor-pointer"
            >
              Clear all
            </button>
          </div>
          <div className="flex items-center gap-2 overflow-x-auto py-1">
            {pendingImages.map((img) => (
              <div
                key={img.id}
                className="relative w-16 h-16 rounded-lg overflow-hidden border border-slate-300 shrink-0 group"
              >
                <img src={img.preview} alt="Upload draft" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => removePendingImage(img.id)}
                  className="absolute top-1 right-1 p-0.5 rounded-full bg-slate-900/80 hover:bg-rose-600 text-white transition-colors cursor-pointer"
                  title="Remove image"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Comment Form Input */}
      <form onSubmit={handleSubmitComment} className="space-y-2.5 pt-1">
        <div className="relative">
          <textarea
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            onPaste={handleCommentPaste}
            placeholder="Write a comment, paste screenshot (Ctrl+V), or click mic/image buttons..."
            rows={2}
            className="w-full text-xs p-3 pr-28 rounded-xl border border-slate-300 focus:outline-none focus:ring-1 focus:ring-slate-900 text-slate-800 placeholder-slate-400 bg-white leading-relaxed resize-none"
          />

          {/* Quick Voice & Image Actions inside textarea */}
          <div className="absolute right-2 bottom-2.5 flex items-center gap-1">
            {/* Hidden image input */}
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleImageSelect}
            />

            {/* Image upload button */}
            <button
              type="button"
              onClick={() => imageInputRef.current?.click()}
              className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
              title="Attach image to comment"
            >
              <ImageIcon className="w-3.5 h-3.5" />
            </button>

            {/* Speech to text transcription */}
            <button
              type="button"
              onClick={handleToggleDictation}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                isListening
                  ? 'bg-rose-500 text-white shadow-xs animate-pulse'
                  : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
              }`}
              title={isListening ? 'Stop transcribing' : 'Voice to transcribe text'}
            >
              {isListening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Action Toolbar */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Image Upload Button */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => imageInputRef.current?.click()}
              leftIcon={<ImageIcon className="w-3 h-3 text-indigo-600" />}
              className="text-xs text-slate-700 border-slate-200 hover:bg-slate-50"
            >
              Add Images
            </Button>

            {/* Record Voice Message Button */}
            {!isRecording && !audioUrl && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleStartVoiceRecording}
                leftIcon={<Mic className="w-3 h-3 text-indigo-600" />}
                className="text-xs text-slate-700 border-slate-200 hover:bg-slate-50"
              >
                Voice Note
              </Button>
            )}

            {/* Dictate / Transcribe Helper */}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleToggleDictation}
              leftIcon={<FileText className="w-3 h-3 text-amber-600" />}
              className={`text-xs ${isListening ? 'text-rose-600 bg-rose-50' : 'text-slate-600'}`}
            >
              {isListening ? 'Listening...' : 'Transcribe'}
            </Button>
          </div>

          <Button
            type="submit"
            variant="primary"
            size="sm"
            isLoading={isSubmitting}
            disabled={!commentText.trim() && !audioUrl && pendingImages.length === 0}
            leftIcon={<Send className="w-3.5 h-3.5" />}
            className="text-xs shadow-xs"
          >
            {audioUrl ? 'Send Voice Note' : 'Post Comment'}
          </Button>
        </div>
      </form>

      {/* Lightbox Modal for Comments */}
      <ImageLightboxModal
        isOpen={isLightboxOpen}
        images={lightboxImages}
        initialIndex={lightboxIndex}
        onClose={() => setIsLightboxOpen(false)}
      />
    </div>
  );
};
