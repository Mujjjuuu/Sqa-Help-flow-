import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import {
  Paperclip,
  Calendar,
  GripVertical,
  StickyNote,
  MessageSquare,
  Image as ImageIcon,
} from 'lucide-react';
import { Ticket, Status } from '../../types';
import { CATEGORY_COLORS, PRIORITY_CONFIG } from '../../config/ticketCategories';

export interface TicketCardProps {
  ticket: Ticket;
  allStatuses?: Status[];
  onMoveTicket?: (ticketId: string, newStatusId: string) => Promise<void>;
  onClick: (ticket: Ticket) => void;
  isDraggingOverlay?: boolean;
}

export const TicketCard: React.FC<TicketCardProps> = ({
  ticket,
  allStatuses = [],
  onMoveTicket,
  onClick,
  isDraggingOverlay = false,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    isDragging,
  } = useDraggable({
    id: ticket.id,
    data: {
      type: 'Ticket',
      ticket,
    },
    disabled: isDraggingOverlay,
  });

  const priorityConf = PRIORITY_CONFIG[ticket.priority] || PRIORITY_CONFIG.medium;
  const categoryConf = ticket.category?.name
    ? CATEGORY_COLORS[ticket.category.name] || {
        bg: 'bg-slate-100 dark:bg-slate-800',
        text: 'text-slate-700 dark:text-slate-300',
        dot: 'bg-slate-400',
      }
    : null;

  // Count image attachments for clean footer indicator
  const imageAttachmentsCount = (ticket.attachments || []).filter(
    (a) =>
      a.file_type?.startsWith('image/') ||
      a.file_url?.startsWith('data:image/') ||
      /\.(png|jpe?g|webp|gif|svg)$/i.test(a.file_name)
  ).length;

  const attachmentCount = ticket.attachments?.length || 0;
  const commentCount = ticket.comments?.length || 0;

  // Author who made changes or created ticket
  const modifierName =
    ticket.updated_by_name ||
    ticket.history?.[0]?.user_name ||
    ticket.created_by_name ||
    'KRUM User';

  const formatRelativeTime = (isoString: string) => {
    try {
      const diffMs = Date.now() - new Date(isoString).getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      if (diffMins < 1) return 'just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      const diffDays = Math.floor(diffHours / 24);
      if (diffDays < 7) return `${diffDays}d ago`;
      return new Date(isoString).toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  };

  const colorBorderClass =
    ticket.color && ticket.color !== 'default'
      ? {
          red: 'border-l-4 border-l-rose-500',
          orange: 'border-l-4 border-l-amber-500',
          green: 'border-l-4 border-l-emerald-500',
          blue: 'border-l-4 border-l-sky-500',
          purple: 'border-l-4 border-l-indigo-600',
          gray: 'border-l-4 border-l-slate-400',
        }[ticket.color] || ''
      : '';

  return (
    <div
      ref={setNodeRef}
      {...(isDraggingOverlay ? {} : attributes)}
      {...(isDraggingOverlay ? {} : listeners)}
      className={`bg-white dark:bg-slate-900 border rounded-2xl p-3.5 shadow-2xs hover:shadow-md transition-all select-none group cursor-grab active:cursor-grabbing relative overflow-hidden ${colorBorderClass} ${
        isDragging
          ? 'opacity-25 border-dashed border-indigo-400 bg-indigo-50/20'
          : isDraggingOverlay
          ? 'shadow-2xl border-indigo-600 ring-2 ring-indigo-500/20 rotate-1 scale-102 cursor-grabbing'
          : 'border-slate-200/90 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
      }`}
      onClick={() => {
        if (!isDragging && !isDraggingOverlay) {
          onClick(ticket);
        }
      }}
    >
      {/* Header: Ticket Number, Drag Handle, Priority Badge */}
      <div className="flex items-center justify-between gap-1.5 mb-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <div
            className="p-1 -ml-1 text-slate-300 dark:text-slate-600 group-hover:text-slate-600 dark:group-hover:text-slate-300 rounded transition-colors shrink-0"
            title="Drag ticket"
          >
            <GripVertical className="w-3.5 h-3.5" />
          </div>
          <span className="font-mono text-[11px] font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md border border-slate-200/70 dark:border-slate-700 truncate">
            {ticket.ticket_number}
            {ticket.ref_code ? ` · ${ticket.ref_code}` : ''}
          </span>
        </div>

        {/* Priority Badge */}
        <span
          className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border shadow-2xs ${priorityConf.bg} ${priorityConf.text} ${priorityConf.border || 'border-slate-200 dark:border-slate-700'}`}
          title={`${priorityConf.label} Priority`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${priorityConf.dot}`} />
          {priorityConf.label}
        </span>
      </div>

      {/* Ticket Title */}
      <h4 className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100 line-clamp-2 mb-1.5 leading-snug group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
        {ticket.title}
      </h4>

      {/* Description Snippet (if available) */}
      {ticket.description && (
        <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mb-2.5 leading-relaxed">
          {ticket.description}
        </p>
      )}

      {/* Category Pill */}
      {categoryConf && ticket.category && (
        <div className="mb-2.5">
          <span
            className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-md ${categoryConf.bg} ${categoryConf.text}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${categoryConf.dot}`} />
            <span className="truncate max-w-[150px]">{ticket.category.name}</span>
          </span>
        </div>
      )}

      {/* Who made changes indicator */}
      <div className="mb-2.5 flex items-center gap-1.5 text-[10px] text-slate-400 dark:text-slate-500">
        <div className="w-4 h-4 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center font-bold text-[9px] shrink-0">
          {modifierName.slice(0, 1).toUpperCase()}
        </div>
        <span className="truncate max-w-[140px] text-slate-600 dark:text-slate-400 font-medium" title={`Last modified by ${modifierName}`}>
          {modifierName}
        </span>
        <span>•</span>
        <span className="text-slate-400 dark:text-slate-500 font-mono">
          {formatRelativeTime(ticket.updated_at || ticket.created_at)}
        </span>
      </div>

      {/* Footer Info: Notes, Attachments, Images, Comments & Due Date / Stage Mover */}
      <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500">
        <div className="flex items-center gap-2">
          {ticket.notes && (
            <span
              className="flex items-center gap-0.5 text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-200/70 dark:border-amber-800/60 px-1.5 py-0.5 rounded font-medium text-[10px]"
              title="Has notes"
            >
              <StickyNote className="w-2.5 h-2.5 text-amber-600 dark:text-amber-400" />
              <span>Note</span>
            </span>
          )}

          {imageAttachmentsCount > 0 && (
            <span
              className="flex items-center gap-1 text-slate-500 dark:text-slate-400 font-medium"
              title={`${imageAttachmentsCount} attached image${imageAttachmentsCount > 1 ? 's' : ''}`}
            >
              <ImageIcon className="w-3 h-3 text-slate-400 dark:text-slate-500" />
              <span>{imageAttachmentsCount}</span>
            </span>
          )}

          {attachmentCount > 0 && (
            <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400 font-medium" title={`${attachmentCount} attachments`}>
              <Paperclip className="w-3 h-3 text-slate-400 dark:text-slate-500" />
              <span>{attachmentCount}</span>
            </span>
          )}

          {commentCount > 0 && (
            <span
              className="flex items-center gap-1 text-slate-500 dark:text-slate-400 font-medium"
              title={`${commentCount} comments`}
            >
              <MessageSquare className="w-3 h-3 text-indigo-400" />
              <span>{commentCount}</span>
            </span>
          )}

          {ticket.due_date && (
            <span
              className="flex items-center gap-1 text-slate-500 dark:text-slate-400"
              title={`Due: ${new Date(ticket.due_date).toLocaleDateString()}`}
            >
              <Calendar className="w-3 h-3 text-slate-400 dark:text-slate-500" />
              <span>{new Date(ticket.due_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          {onMoveTicket && allStatuses.length > 0 && (
            <select
              value={ticket.status_id}
              onChange={(e) => {
                e.stopPropagation();
                onMoveTicket(ticket.id, e.target.value);
              }}
              className="text-[10px] font-medium bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-md px-1.5 py-0.5 border border-slate-200 dark:border-slate-700 cursor-pointer focus:outline-none focus:ring-1 focus:ring-indigo-500 shadow-2xs"
              title="Change stage"
            >
              {allStatuses
                .filter((s, idx, arr) => arr.findIndex((x) => x.id === s.id) === idx)
                .map((s) => (
                  <option key={s.id} value={s.id} className="dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                    {s.name}
                  </option>
                ))}
            </select>
          )}
        </div>
      </div>
    </div>
  );
};
