export type TicketPriority = 'low' | 'medium' | 'high' | 'critical' | 'urgent';

export type UserRole = 'super_admin' | 'admin' | 'employee';

export interface User {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
  role?: UserRole;
  department?: string;
  created_at: string;
}

export interface TicketComment {
  id: string;
  ticket_id: string;
  user_name: string;
  user_avatar?: string;
  content: string;
  images?: string[]; // Array of base64 data URLs or image URLs
  audio_url?: string; // base64 or audio URL for voice message
  audio_duration?: number; // duration in seconds
  is_voice_message?: boolean;
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
  user_id?: string;
  user_name?: string; // Author who made the modification
  user_avatar?: string;
  action_type: TicketHistoryActionType;
  old_value?: string | null;
  new_value?: string | null;
  details?: string;
  created_at: string;
}

export type TicketSeverity = 'low' | 'medium' | 'high' | 'critical';
export type TicketDevMask = 'frontend' | 'backend' | 'flutter' | 'fullstack' | 'devops' | 'qa';
export type TicketColor = 'default' | 'gray' | 'purple' | 'blue' | 'green' | 'orange' | 'red';

export interface TicketWorkAssignments {
  backend?: string;
  frontend?: string;
  flutter?: string;
  qa?: string;
}

export interface TicketWorkRelay {
  current_stage: 'fe' | 'qa' | 'completed';
  fe_user?: string;
  fe_done?: boolean;
  qa_user?: string;
  qa_done?: boolean;
  handover_notes?: string;
}

export interface TicketTimeStage {
  stage: string;
  moved_by: string;
  timestamp: string;
  duration_str: string;
  cycle?: number;
  is_current?: boolean;
}

export interface TicketTimeTracking {
  dev_time_str: string;
  qa_time_str: string;
  cycles: number;
  total_time_str: string;
  stages: TicketTimeStage[];
}

export interface Ticket {
  id: string;
  project_id: string;
  ticket_number: string; // e.g. "KBI-124"
  ref_code?: string; // e.g. "PMIC-078"
  ticket_type?: string; // e.g. "Modification", "UI/UX Bug", "Feature"
  title: string;
  description?: string;
  notes?: string;
  category_id: string;
  status_id: string;
  priority: TicketPriority;
  severity?: TicketSeverity;
  dev_mask?: TicketDevMask;
  color?: TicketColor;
  work_assignments?: TicketWorkAssignments;
  work_relay?: TicketWorkRelay;
  time_tracking?: TicketTimeTracking;
  start_date?: string | null;
  due_date?: string | null;
  created_by_name?: string;
  created_by_avatar?: string;
  updated_by_name?: string;
  updated_by_avatar?: string;
  created_at: string;
  updated_at: string;
  // Joined fields for display
  status?: Status;
  category?: Category;
  attachments?: Attachment[];
  history?: TicketHistory[];
  comments?: TicketComment[];
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

export type AttendanceStatus = 'present' | 'late' | 'half_day' | 'absent' | 'on_leave';

export interface AttendanceRecord {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  user_avatar?: string;
  user_role: UserRole;
  department?: string;
  date: string; // YYYY-MM-DD
  check_in?: string | null; // ISO string
  check_out?: string | null; // ISO string
  work_duration_minutes: number;
  status: AttendanceStatus;
  shift_start?: string; // e.g. "09:00"
  shift_end?: string; // e.g. "18:00"
  notes?: string;
  regularization_requested?: boolean;
  regularization_reason?: string;
  regularization_status?: 'pending' | 'approved' | 'rejected';
  created_at: string;
  updated_at: string;
}

export interface AttendanceFilterState {
  search?: string;
  userId?: string;
  role?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  department?: string;
}

export interface ProjectNote {
  id: string;
  project_id?: string | null;
  project_name?: string | null;
  title: string;
  content: string;
  tags?: string[];
  image_url?: string | null;
  image_name?: string | null;
  audio_url?: string | null;
  audio_duration?: number | null;
  audio_name?: string | null;
  is_pinned?: boolean;
  is_converted_to_ticket?: boolean;
  converted_ticket_id?: string | null;
  converted_ticket_number?: string | null;
  author_id?: string;
  author_name?: string;
  author_avatar?: string;
  created_at: string;
  updated_at: string;
}

export interface NoteFilterState {
  search?: string;
  projectId?: string;
  tag?: string;
  status?: 'all' | 'open' | 'converted' | 'pinned';
}
