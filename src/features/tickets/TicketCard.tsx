import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Paperclip, Calendar, GripVertical } from 'lucide-react';
import { Ticket } from '../../types';
import { CATEGORY_COLORS, PRIORITY_CONFIG } from '../../config/ticketCategories';

export interface TicketCardProps {
  ticket: Ticket;
  onClick: (ticket: Ticket) => void;
  isDraggingOverlay?: boolean;
}

export const TicketCard: React.FC<TicketCardProps> = ({
  ticket,
  onClick,
  isDraggingOverlay = false,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: ticket.id,
    data: {
      type: 'Ticket',
      ticket,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const priorityConf = PRIORITY_CONFIG[ticket.priority] || PRIORITY_CONFIG.medium;
  const categoryConf = ticket.category?.name
    ? CATEGORY_COLORS[ticket.category.name] || {
        bg: 'bg-slate-100',
        text: 'text-slate-700',
        dot: 'bg-slate-400',
      }
    : null;

  const attachmentCount = ticket.attachments?.length || 0;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-white border rounded-xl p-3 shadow-2xs hover:shadow-md transition-all select-none group cursor-pointer ${
        isDragging
          ? 'opacity-40 border-slate-400'
          : isDraggingOverlay
          ? 'shadow-lg border-slate-900 ring-2 ring-slate-900/10'
          : 'border-slate-200/90 hover:border-slate-300'
      }`}
      onClick={() => onClick(ticket)}
    >
      {/* Header: Ticket Number, Drag Handle, Priority */}
      <div className="flex items-center justify-between gap-1.5 mb-2">
        <div className="flex items-center gap-1.5">
          <div
            {...attributes}
            {...listeners}
            onClick={(e) => e.stopPropagation()}
            className="p-1 -ml-1 text-slate-300 hover:text-slate-600 rounded cursor-grab active:cursor-grabbing hover:bg-slate-50 transition-colors"
            title="Drag ticket"
          >
            <GripVertical className="w-3.5 h-3.5" />
          </div>
          <span className="font-mono text-xs font-semibold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
            {ticket.ticket_number}
          </span>
        </div>

        {/* Priority Badge */}
        <span
          className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full ${priorityConf.bg} ${priorityConf.text}`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${priorityConf.dot}`} />
          {priorityConf.label}
        </span>
      </div>

      {/* Ticket Title */}
      <h4 className="text-xs font-semibold text-slate-900 line-clamp-2 mb-2.5 leading-snug group-hover:text-slate-800">
        {ticket.title}
      </h4>

      {/* Category Pill */}
      {categoryConf && ticket.category && (
        <div className="mb-3">
          <span
            className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-md ${categoryConf.bg} ${categoryConf.text}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${categoryConf.dot}`} />
            <span className="truncate max-w-[130px]">{ticket.category.name}</span>
          </span>
        </div>
      )}

      {/* Footer Info: Attachments & Due/Update Date */}
      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
        <div className="flex items-center gap-3">
          {attachmentCount > 0 && (
            <span className="flex items-center gap-1 text-slate-500 font-medium" title={`${attachmentCount} attachments`}>
              <Paperclip className="w-3 h-3" />
              <span>{attachmentCount}</span>
            </span>
          )}

          {ticket.due_date && (
            <span
              className="flex items-center gap-1 text-slate-500"
              title={`Due: ${new Date(ticket.due_date).toLocaleDateString()}`}
            >
              <Calendar className="w-3 h-3" />
              <span>{new Date(ticket.due_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
            </span>
          )}
        </div>

        <span className="text-[10px] text-slate-400">
          {new Date(ticket.updated_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
        </span>
      </div>
    </div>
  );
};
