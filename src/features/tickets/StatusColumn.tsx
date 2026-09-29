import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Plus, CheckCheck } from 'lucide-react';
import { Status, Ticket } from '../../types';
import { TicketCard } from './TicketCard';

export interface StatusColumnProps {
  status: Status;
  tickets: Ticket[];
  onAddTicket: (statusId: string) => void;
  onSelectTicket: (ticket: Ticket) => void;
}

export const StatusColumn: React.FC<StatusColumnProps> = ({
  status,
  tickets,
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

  const ticketIds = tickets.map((t) => t.id);

  return (
    <div
      ref={setNodeRef}
      className={`w-72 sm:w-80 shrink-0 flex flex-col rounded-xl bg-slate-100/80 border transition-colors ${
        isOver
          ? 'border-slate-400 bg-slate-200/60 ring-2 ring-slate-400/20'
          : 'border-slate-200/70'
      }`}
      style={{ maxHeight: 'calc(100vh - 180px)' }}
    >
      {/* Column Header */}
      <div className="p-3 pb-2 flex items-center justify-between border-b border-slate-200/50">
        <div className="flex items-center gap-2">
          {status.is_final && <CheckCheck className="w-4 h-4 text-purple-600" />}
          <h3 className="font-semibold text-xs text-slate-800 tracking-tight truncate max-w-[150px]">
            {status.name}
          </h3>
          <span className="text-[11px] font-semibold text-slate-500 bg-slate-200/80 px-2 py-0.5 rounded-full">
            {tickets.length}
          </span>
        </div>

        <button
          type="button"
          onClick={() => onAddTicket(status.id)}
          className="p-1 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-200/80 transition-colors cursor-pointer"
          title={`Add ticket to ${status.name}`}
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Ticket Cards List (Droppable & Sortable) */}
      <div className="p-2.5 space-y-2.5 overflow-y-auto flex-1 min-h-[140px]">
        <SortableContext items={ticketIds} strategy={verticalListSortingStrategy}>
          {tickets.map((ticket) => (
            <TicketCard
              key={ticket.id}
              ticket={ticket}
              onClick={onSelectTicket}
            />
          ))}
        </SortableContext>

        {tickets.length === 0 && (
          <div className="h-28 border border-dashed border-slate-300/80 rounded-lg flex items-center justify-center text-center p-3">
            <span className="text-xs text-slate-400">Empty column</span>
          </div>
        )}
      </div>
    </div>
  );
};
