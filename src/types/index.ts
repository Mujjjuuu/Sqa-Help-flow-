export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface User {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
  created_at: string;
}

export interface Project {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  status: 'active' | 'archived';
  created_at: string;
  updated_at: string;
  archived_at?: string | null;
}

export interface Status {
  id: string;
  project_id: string;
  name: string;
  position: number;
  is_final: boolean;
  created_at: string;
}

export interface Category {
  id: string;
  project_id: string;
  name: string;
  created_at: string;
}

export interface Attachment {
  id: string;
  ticket_id: string;
  file_name: string;
  file_url: string;
  file_type: string;
  file_size: number;
  created_at: string;
}

export type TicketHistoryActionType =
  | 'created'
  | 'status_changed'
  | 'priority_changed'
  | 'title_changed'
  | 'description_changed'
  | 'category_changed'
  | 'due_date_changed'
  | 'attachment_added'
  | 'attachment_removed'
  | 'notes_updated';

export interface TicketHistory {
  id: string;
  ticket_id: string;
  action_type: TicketHistoryActionType;
  old_value?: string | null;
  new_value?: string | null;
  created_at: string;
}

export interface Ticket {
  id: string;
  project_id: string;
  ticket_number: string; // e.g. "PRJ-101"
  title: string;
  description?: string;
  notes?: string;
  category_id: string;
  status_id: string;
  priority: TicketPriority;
  due_date?: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields for display
  status?: Status;
  category?: Category;
  attachments?: Attachment[];
  history?: TicketHistory[];
}

export interface ProjectStats {
  totalTickets: number;
  activeTickets: number;
  underReviewTickets: number;
  uploadedTickets: number;
  completionPercentage: number;
  statusDistribution: {
    statusName: string;
    count: number;
    color: string;
  }[];
}

export interface TicketFilterState {
  search: string;
  statusId: string;
  categoryId: string;
  priority: string;
  projectId?: string;
  dateField?: 'created_at' | 'updated_at';
  dateFrom?: string;
  dateTo?: string;
}

export interface ProjectReportData {
  project: Project;
  reportGeneratedDate: string;
  totalTickets: number;
  statusCounts: Record<string, number>;
  completionPercentage: number;
  tickets: Ticket[];
}
