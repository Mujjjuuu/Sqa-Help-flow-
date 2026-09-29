import React, { useState } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { Status, Ticket } from '../../types';
import { StatusColumn } from './StatusColumn';
import { TicketCard } from './TicketCard';

export interface TicketBoardProps {
  statuses: Status[];
  tickets: Ticket[];
  onMoveTicket: (ticketId: string, newStatusId: string) => Promise<void>;
  onAddTicket: (statusId: string) => void;
  onSelectTicket: (ticket: Ticket) => void;
}

export const TicketBoard: React.FC<TicketBoardProps> = ({
  statuses,
  tickets,
  onMoveTicket,
  onAddTicket,
  onSelectTicket,
}) => {
  const [activeTicket, setActiveTicket] = useState<Ticket | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 4, // 4px drag distance to avoid conflicting with clicks
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Ensure "Uploaded" / is_final is always the last column
  const sortedStatuses = [...statuses].sort((a, b) => {
    if (a.is_final) return 1;
    if (b.is_final) return -1;
    return a.position - b.position;
  });

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const ticket = tickets.find((t) => t.id === active.id);
    if (ticket) {
      setActiveTicket(ticket);
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    if (activeId === overId) return;
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTicket(null);

    if (!over) return;

    const activeTicketId = active.id as string;
    const overId = over.id as string;

    const movingTicket = tickets.find((t) => t.id === activeTicketId);
    if (!movingTicket) return;

    // Check if dropped directly onto a column
    let targetStatus = statuses.find((s) => s.id === overId);

    // Or dropped onto another ticket in a column
    if (!targetStatus) {
      const overTicket = tickets.find((t) => t.id === overId);
      if (overTicket) {
        targetStatus = statuses.find((s) => s.id === overTicket.status_id);
      }
    }

    if (targetStatus && targetStatus.id !== movingTicket.status_id) {
      await onMoveTicket(activeTicketId, targetStatus.id);
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-6 pt-1 px-1 min-h-[calc(100vh-220px)] items-start">
        {sortedStatuses.map((status) => {
          const columnTickets = tickets.filter((t) => t.status_id === status.id);
          return (
            <StatusColumn
              key={status.id}
              status={status}
              tickets={columnTickets}
              onAddTicket={onAddTicket}
              onSelectTicket={onSelectTicket}
            />
          );
        })}
      </div>

      <DragOverlay>
        {activeTicket ? (
          <div className="w-72 sm:w-80 opacity-90 rotate-1 shadow-2xl">
            <TicketCard
              ticket={activeTicket}
              onClick={() => {}}
              isDraggingOverlay
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};
