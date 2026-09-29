import {
  Ticket,
  TicketPriority,
  Category,
  Status,
  Attachment,
  TicketHistory,
  TicketFilterState,
} from '../../types';

export type {
  Ticket,
  TicketPriority,
  Category,
  Status,
  Attachment,
  TicketHistory,
  TicketFilterState,
};

export interface TicketFormData {
  title: string;
  description?: string;
  notes?: string;
  project_id: string;
  category_id: string;
  status_id: string;
  priority: TicketPriority;
  due_date?: string | null;
  files?: File[];
}

export interface MoveTicketPayload {
  ticketId: string;
  newStatusId: string;
}
