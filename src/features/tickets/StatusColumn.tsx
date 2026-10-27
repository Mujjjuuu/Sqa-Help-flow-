import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { Plus, CheckCheck, Clock, CheckCircle2 } from 'lucide-react';
import { Status, Ticket } from '../../types';
import { TicketCard } from './TicketCard';

export interface StatusColumnProps {
  status: Status;
  tickets: Ticket[];
  allStatuses?: Status[];
  onMoveTicket?: (ticketId: string, newStatusId: string) => Promise<void>;
  onAddTicket: (statusId: string) => void;
  onSelectTicket: (ticket: Ticket) => void;
}

// Stage accent configurations
const STATUS_ACCENTS: Record<string, { bar: string; badge: string; border: string; glow: string }> = {
  'Just Written': {
    bar: 'bg-slate-400',
    badge: 'bg-slate-200/90 text-slate-700',
    border: 'border-slate-300',
    glow: 'ring-slate-400/20 bg-slate-100/90',
  },
  'Under Review': {
    bar: 'bg-amber-500',
    badge: 'bg-amber-100 text-amber-800 border border-amber-300/60',
    border: 'border-amber-300/80',
    glow: 'ring-amber-400/30 bg-amber-50/70 border-amber-400',
  },
  'Verified': {
    bar: 'bg-sky-500',
    badge: 'bg-sky-100 text-sky-800 border border-sky-300/60',
    border: 'border-sky-300/80',
    glow: 'ring-sky-400/30 bg-sky-50/70 border-sky-400',
  },
  'Verified by QA': {
    bar: 'bg-purple-600',
    badge: 'bg-purple-100 text-purple-800 border border-purple-300/60',
    border: 'border-purple-300/80',
    glow: 'ring-purple-400/30 bg-purple-50/70 border-purple-400',
  },
  'Uploaded': {
    bar: 'bg-purple-600',
    badge: 'bg-purple-100 text-purple-800 border border-purple-300/60',
    border: 'border-purple-300/80',
    glow: 'ring-purple-400/30 bg-purple-50/70 border-purple-400',
  },
};

export const StatusColumn: React.FC<StatusColumnProps> = ({
  status,
  tickets,
  allStatuses,
  onMoveTicket,
  onAddTicket,
  onSelectTicket,
}) => {
  const { setNodeRef, isOver } = useDroppable({
    id: status.id,
    data: {
      type: 'Column',
      status,
    },
  });

  const accent = STATUS_ACCENTS[status.name] || {
    bar: 'bg-indigo-500',
    badge: 'bg-indigo-100 text-indigo-700',
    border: 'border-indigo-300',
    glow: 'ring-indigo-400/20 bg-indigo-50/50',
  };

  return (
    <div
      ref={setNodeRef}
      data-status-id={status.id}
      className={`w-72 sm:w-80 shrink-0 flex flex-col rounded-2xl bg-slate-100/90 border transition-all duration-150 shadow-2xs ${
        isOver
          ? `ring-4 ${accent.glow} shadow-lg`
          : 'border-slate-200/80 hover:border-slate-300'
      }`}
      style={{ maxHeight: 'calc(100vh - 190px)' }}
    >
      {/* Top Accent Color Bar */}
      <div className={`h-1.5 w-full rounded-t-2xl ${accent.bar}`} />

      {/* Column Header */}
      <div className="p-3.5 pb-2.5 flex items-center justify-between border-b border-slate-200/60 bg-white/70 backdrop-blur-xs">
        <div className="flex items-center gap-2">
          {status.is_final ? (
            <CheckCheck className="w-4 h-4 text-purple-600 shrink-0" />
          ) : status.name === 'Under Review' ? (
            <Clock className="w-4 h-4 text-amber-600 shrink-0" />
          ) : status.name === 'Verified' ? (
            <CheckCircle2 className="w-4 h-4 text-sky-600 shrink-0" />
          ) : null}

          <h3 className="font-bold text-xs sm:text-sm text-slate-800 tracking-tight whitespace-nowrap">
            {status.name}
          </h3>

          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full shrink-0 ${accent.badge}`}>
            {tickets.length}
          </span>
        </div>

        <button
          type="button"
          onClick={() => onAddTicket(status.id)}
          className="p-1 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-200/80 transition-colors cursor-pointer"
          title={`Add ticket to ${status.name}`}
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Ticket Cards List */}
      <div className="p-2.5 space-y-2.5 overflow-y-auto flex-1 min-h-[160px]">
        {tickets
          .filter((t, idx, arr) => arr.findIndex((x) => x.id === t.id) === idx)
          .map((ticket) => (
            <TicketCard
              key={ticket.id}
              ticket={ticket}
              allStatuses={allStatuses}
              onMoveTicket={onMoveTicket}
              onClick={onSelectTicket}
            />
          ))}

        {/* Empty state or Active drop zone prompt */}
        {tickets.length === 0 && (
          <div
            className={`h-32 border-2 border-dashed rounded-xl flex flex-col items-center justify-center text-center p-4 transition-colors ${
              isOver
                ? 'border-indigo-400 bg-indigo-50/60 text-indigo-700'
                : 'border-slate-300/80 text-slate-400 bg-white/30'
            }`}
          >
            <span className="text-xs font-semibold">
              {isOver ? `Drop into ${status.name}` : 'Empty column'}
            </span>
            <span className="text-[10px] mt-1 text-slate-400">
              {isOver ? 'Release mouse to move here' : 'Drag tickets here'}
            </span>
          </div>
        )}

        {/* Visual drop indicator when hovering over non-empty column */}
        {tickets.length > 0 && isOver && (
          <div className="h-12 border-2 border-dashed border-indigo-400 bg-indigo-50/60 rounded-xl flex items-center justify-center text-xs font-semibold text-indigo-700 animate-pulse">
            Drop into {status.name}
          </div>
        )}
      </div>
    </div>
  );
};
