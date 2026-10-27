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
  severity?: import('../../types').TicketSeverity;
  dev_mask?: import('../../types').TicketDevMask;
  color?: import('../../types').TicketColor;
  ref_code?: string;
  ticket_type?: string;
  work_assignments?: import('../../types').TicketWorkAssignments;
  work_relay?: import('../../types').TicketWorkRelay;
  time_tracking?: import('../../types').TicketTimeTracking;
  start_date?: string | null;
  due_date?: string | null;
  files?: File[];
}

export interface MoveTicketPayload {
  ticketId: string;
  newStatusId: string;
}
