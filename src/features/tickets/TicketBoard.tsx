import React, { useState } from 'react';
import {
  DndContext,
  DragOverlay,
  CollisionDetection,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
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
        distance: 4, // 4px drag distance to distinguish clicks from drags
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Ensure statuses are strictly deduplicated by ID & position and sorted
  const sortedStatuses = React.useMemo(() => {
    const seenIds = new Set<string>();
    const seenPositions = new Set<number>();
    const unique: Status[] = [];
    for (const s of statuses) {
      if (s && s.id && !seenIds.has(s.id) && !seenPositions.has(s.position)) {
        seenIds.add(s.id);
        seenPositions.add(s.position);
        unique.push(s);
      }
    }
    return unique.sort((a, b) => {
      if (a.is_final) return 1;
      if (b.is_final) return -1;
      return a.position - b.position;
    });
  }, [statuses]);

  // Cursor-first column collision detection:
  // 1. If pointerCoordinates is present, check which column horizontally bounds the cursor.
  //    This gives 100% natural feel: wherever the cursor is hovering is where the ticket drops.
  // 2. If cursor is between columns (e.g. in the margin), snap to the closest column horizontally.
  // 3. Fallback for keyboard navigation or touch without coordinates: use card center point.
  const columnCollisionDetection: CollisionDetection = (args) => {
    const { droppableContainers, droppableRects, collisionRect, pointerCoordinates } = args;

    // Collect all valid column droppables with their measured DOMRects
    const columnsWithRects = droppableContainers
      .map((container) => {
        const rect = droppableRects.get(container.id);
        return { container, rect };
      })
      .filter((c): c is { container: typeof c.container; rect: DOMRect } => Boolean(c.rect));

    if (columnsWithRects.length === 0) {
      return [];
    }

    // Sort columns left-to-right by horizontal position
    columnsWithRects.sort((a, b) => a.rect.left - b.rect.left);

    // 1. PRIMARY: Pointer coordinates (cursor location is decisive)
    if (pointerCoordinates) {
      const px = pointerCoordinates.x;

      // Exact hit: cursor is within column's horizontal span [rect.left, rect.right]
      for (const item of columnsWithRects) {
        if (px >= item.rect.left && px <= item.rect.right) {
          return [{
            id: item.container.id,
            data: { droppableContainer: item.container, value: 1 },
          }];
        }
      }

      // Cursor in gap between columns or outside bounds: find closest column boundary to px
      let closestCol = columnsWithRects[0];
      let minDistance = Infinity;

      for (const item of columnsWithRects) {
        const { rect } = item;
        let dist = 0;
        if (px < rect.left) {
          dist = rect.left - px;
        } else if (px > rect.right) {
          dist = px - rect.right;
        }

        if (dist < minDistance) {
          minDistance = dist;
          closestCol = item;
        }
      }

      return [{
        id: closestCol.container.id,
        data: { droppableContainer: closestCol.container, value: minDistance },
      }];
    }

    // 2. FALLBACK: Keyboard / rect center
    if (collisionRect) {
      const cardCenterX = collisionRect.left + collisionRect.width / 2;

      for (const item of columnsWithRects) {
        if (cardCenterX >= item.rect.left && cardCenterX <= item.rect.right) {
          return [{
            id: item.container.id,
            data: { droppableContainer: item.container, value: 1 },
          }];
        }
      }

      let closestCol = columnsWithRects[0];
      let minDistance = Infinity;

      for (const item of columnsWithRects) {
        const colCenterX = item.rect.left + item.rect.width / 2;
        const dist = Math.abs(cardCenterX - colCenterX);
        if (dist < minDistance) {
          minDistance = dist;
          closestCol = item;
        }
      }

      return [{
        id: closestCol.container.id,
        data: { droppableContainer: closestCol.container, value: minDistance },
      }];
    }

    return [{
      id: columnsWithRects[0].container.id,
      data: { droppableContainer: columnsWithRects[0].container, value: 0 },
    }];
  };

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const ticket = tickets.find((t) => t.id === active.id);
    if (ticket) {
      setActiveTicket(ticket);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTicket(null);

    if (!over) return;

    const activeTicketId = String(active.id);
    const targetStatusId = String(over.id);

    const movingTicket = tickets.find((t) => t.id === activeTicketId);
    if (!movingTicket) return;

    // Verify target status exists in project
    const targetStatus = statuses.find((s) => s.id === targetStatusId);
    if (!targetStatus) return;

    if (targetStatus.id !== movingTicket.status_id) {
      await onMoveTicket(activeTicketId, targetStatus.id);
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={columnCollisionDetection}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 sm:gap-5 overflow-x-auto pb-6 pt-1 px-1 min-h-[calc(100vh-210px)] items-start">
        {sortedStatuses.map((status) => {
          const columnTickets = tickets.filter((t) => t.status_id === status.id);
          return (
            <StatusColumn
              key={status.id}
              status={status}
              tickets={columnTickets}
              allStatuses={sortedStatuses}
              onMoveTicket={onMoveTicket}
              onAddTicket={onAddTicket}
              onSelectTicket={onSelectTicket}
            />
          );
        })}
      </div>

      <DragOverlay dropAnimation={{ duration: 160, easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)' }}>
        {activeTicket ? (
          <div className="w-72 sm:w-80 opacity-95 shadow-2xl scale-102 cursor-grabbing pointer-events-none">
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
