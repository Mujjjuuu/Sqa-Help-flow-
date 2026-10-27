import {
  User,
  UserRole,
  Project,
  Status,
  Category,
  Ticket,
  Attachment,
  TicketHistory,
  TicketComment,
  AttendanceRecord,
  AttendanceFilterState,
  AttendanceStatus,
  ProjectNote,
  NoteFilterState,
} from '../types';
import { DEFAULT_TICKET_STATUSES } from '../config/ticketStatuses';
import { DEFAULT_TICKET_CATEGORIES } from '../config/ticketCategories';

const STORE_PREFIX = 'kanso_db_';

interface DatabaseSchema {
  users: User[];
  attendance: AttendanceRecord[];
  projects: Project[];
  statuses: Status[];
  categories: Category[];
  tickets: Ticket[];
  attachments: Attachment[];
  ticket_history: TicketHistory[];
  comments: TicketComment[];
  notes: ProjectNote[];
  currentUser: User | null;
}

export const DEFAULT_USER: User = {
  id: 'usr-default-001',
  email: 'boboffical54@gmail.com',
  name: 'Bob Official',
  avatar_url: '',
  role: 'super_admin',
  department: 'Leadership & Product',
  created_at: new Date('2026-09-01T08:00:00Z').toISOString(),
};

export const INITIAL_TEAM_USERS: User[] = [
  DEFAULT_USER,
  {
    id: 'usr-team-002',
    email: 'mujtaba@kanso.dev',
    name: 'Mujtaba Bilal',
    avatar_url: '',
    role: 'admin',
    department: 'Quality Assurance',
    created_at: new Date('2026-09-02T08:00:00Z').toISOString(),
  },
  {
    id: 'usr-team-003',
    email: 'imran@kanso.dev',
    name: 'Imran Khan',
    avatar_url: '',
    role: 'employee',
    department: 'Frontend Engineering',
    created_at: new Date('2026-09-05T08:00:00Z').toISOString(),
  },
  {
    id: 'usr-team-004',
    email: 'alex@kanso.dev',
    name: 'Alex Chen',
    avatar_url: '',
    role: 'employee',
    department: 'Backend Infrastructure',
    created_at: new Date('2026-09-10T08:00:00Z').toISOString(),
  },
  {
    id: 'usr-team-005',
    email: 'sarah@kanso.dev',
    name: 'Sarah Connor',
    avatar_url: '',
    role: 'employee',
    department: 'Product Design',
    created_at: new Date('2026-09-12T08:00:00Z').toISOString(),
  },
  {
    id: 'usr-team-006',
    email: 'david@kanso.dev',
    name: 'David Miller',
    avatar_url: '',
    role: 'employee',
    department: 'Mobile Development',
    created_at: new Date('2026-09-15T08:00:00Z').toISOString(),
  },
];

function getStoredTable<T>(tableName: string, defaultValue: T): T {
  try {
    const raw = localStorage.getItem(`${STORE_PREFIX}${tableName}`);
    if (!raw) return defaultValue;
    return JSON.parse(raw);
  } catch (e) {
    console.error(`Error loading table ${tableName}:`, e);
    return defaultValue;
  }
}

function saveTable<T>(tableName: string, data: T): void {
  try {
    localStorage.setItem(`${STORE_PREFIX}${tableName}`, JSON.stringify(data));
  } catch (e) {
    console.error(`Error saving table ${tableName}:`, e);
  }
}

// Initial seed data generator
function seedInitialData(): void {
  const existingProjects = getStoredTable<Project[]>('projects', []);
  if (existingProjects.length > 0) return;

  const user = DEFAULT_USER;
  saveTable('users', [user]);
  saveTable('currentUser', user);

  const proj1Id = 'proj-mobile-banking-01';
  const proj2Id = 'proj-payment-api-02';

  const projects: Project[] = [
    {
      id: proj1Id,
      user_id: user.id,
      name: 'Mobile Banking Application Redesign',
      description: 'Modernizing personal wealth dashboard, transaction flows, and biometric authentication.',
      status: 'active',
      created_at: new Date(Date.now() - 14 * 86400000).toISOString(),
      updated_at: new Date(Date.now() - 1 * 3600000).toISOString(),
      archived_at: null,
    },
    {
      id: proj2Id,
      user_id: user.id,
      name: 'Core Payment Gateway v2',
      description: 'Zero-downtime microservices migration, idempotency checks, and automated webhook retries.',
      status: 'active',
      created_at: new Date(Date.now() - 25 * 86400000).toISOString(),
      updated_at: new Date(Date.now() - 6 * 3600000).toISOString(),
      archived_at: null,
    },
  ];
  saveTable('projects', projects);

  // Seed statuses for both projects
  const statuses: Status[] = [];
  [proj1Id, proj2Id].forEach((projId) => {
    DEFAULT_TICKET_STATUSES.forEach((st) => {
      statuses.push({
        id: `st-${projId}-${st.position}`,
        project_id: projId,
        name: st.name,
        position: st.position,
        is_final: st.is_final,
        created_at: new Date(Date.now() - 20 * 86400000).toISOString(),
      });
    });
  });
  saveTable('statuses', statuses);

  // Seed categories for both projects
  const categories: Category[] = [];
  [proj1Id, proj2Id].forEach((projId) => {
    DEFAULT_TICKET_CATEGORIES.forEach((catName, idx) => {
      categories.push({
        id: `cat-${projId}-${idx}`,
        project_id: projId,
        name: catName,
        created_at: new Date(Date.now() - 20 * 86400000).toISOString(),
      });
    });
  });
  saveTable('categories', categories);

  const getStatusId = (pId: string, name: string) =>
    statuses.find((s) => s.project_id === pId && s.name === name)?.id || '';
  const getCatId = (pId: string, name: string) =>
    categories.find((c) => c.project_id === pId && c.name === name)?.id || '';

  // Seed tickets for Project 1
  const tickets: Ticket[] = [
    {
      id: 'tkt-mb-101',
      project_id: proj1Id,
      ticket_number: 'MB-101',
      title: 'Biometric Face ID fallback PIN lock',
      description: 'Implement biometric prompt with secure enclave key storage and 5-attempt PIN lock protection.',
      notes: 'Reviewed security whitepaper; ensure biometric payload is salted before transmission.',
      category_id: getCatId(proj1Id, 'MobileApp frontend'),
      status_id: getStatusId(proj1Id, 'Under Review'),
      priority: 'high',
      due_date: new Date(Date.now() + 4 * 86400000).toISOString(),
      created_at: new Date(Date.now() - 6 * 86400000).toISOString(),
      updated_at: new Date(Date.now() - 2 * 3600000).toISOString(),
    },
    {
      id: 'tkt-mb-102',
      project_id: proj1Id,
      ticket_number: 'MB-102',
      title: 'Card freeze and spend limits drawer UI',
      description: 'Create interactive toggle switch for instant card freeze and daily ATM withdrawal limits slider.',
      notes: 'Ensure instant optimistic feedback with animated SVG status indicator.',
      category_id: getCatId(proj1Id, 'UI/UX'),
      status_id: getStatusId(proj1Id, 'Just Written'),
      priority: 'medium',
      due_date: new Date(Date.now() + 7 * 86400000).toISOString(),
      created_at: new Date(Date.now() - 4 * 86400000).toISOString(),
      updated_at: new Date(Date.now() - 4 * 86400000).toISOString(),
    },
    {
      id: 'tkt-mb-103',
      project_id: proj1Id,
      ticket_number: 'MB-103',
      title: 'Push notification deep-linking handler',
      description: 'Support universal links for transaction dispute notifications routing to detail screen.',
      notes: 'Tested on iOS simulator; pending Android intent-filter verification.',
      category_id: getCatId(proj1Id, 'Frontend'),
      status_id: getStatusId(proj1Id, 'Under Review'),
      priority: 'high',
      due_date: new Date(Date.now() + 2 * 86400000).toISOString(),
      created_at: new Date(Date.now() - 8 * 86400000).toISOString(),
      updated_at: new Date(Date.now() - 5 * 3600000).toISOString(),
    },
    {
      id: 'tkt-mb-104',
      project_id: proj1Id,
      ticket_number: 'MB-104',
      title: 'Fix transaction search debounce memory leak',
      description: 'Search input was not unmounting observer properly when switching between checking and savings tabs.',
      notes: 'Resolved by wrapping cleanup effect in AbortController signal.',
      category_id: getCatId(proj1Id, 'Testing'),
      status_id: getStatusId(proj1Id, 'Verified'),
      priority: 'urgent',
      due_date: new Date(Date.now() + 1 * 86400000).toISOString(),
      created_at: new Date(Date.now() - 3 * 86400000).toISOString(),
      updated_at: new Date(Date.now() - 1 * 3600000).toISOString(),
    },
    {
      id: 'tkt-mb-105',
      project_id: proj1Id,
      ticket_number: 'MB-105',
      title: 'Monthly statement PDF generation pipeline',
      description: 'Client-side receipt and statement formatting with checksum calculation.',
      notes: 'Approved during security walkthrough.',
      category_id: getCatId(proj1Id, 'Backend'),
      status_id: getStatusId(proj1Id, 'Verified'),
      priority: 'medium',
      due_date: new Date(Date.now() - 2 * 86400000).toISOString(),
      created_at: new Date(Date.now() - 10 * 86400000).toISOString(),
      updated_at: new Date(Date.now() - 8 * 3600000).toISOString(),
    },
    {
      id: 'tkt-mb-106',
      project_id: proj1Id,
      ticket_number: 'MB-106',
      title: 'Production release artifact signing',
      description: 'Signed release binary bundle uploaded to internal distribution server.',
      notes: 'Uploaded build v2.4.1 to staging cluster.',
      category_id: getCatId(proj1Id, 'MobileApp frontend'),
      status_id: getStatusId(proj1Id, 'Verified by QA'),
      priority: 'high',
      due_date: new Date(Date.now() - 1 * 86400000).toISOString(),
      created_at: new Date(Date.now() - 12 * 86400000).toISOString(),
      updated_at: new Date(Date.now() - 12 * 3600000).toISOString(),
    },

    // Project 2 tickets
    {
      id: 'tkt-pg-201',
      project_id: proj2Id,
      ticket_number: 'PG-201',
      title: 'Implement Redis idempotency keys for stripe webhooks',
      description: 'Prevent double charging during network retry spikes with a 24h key TTL.',
      notes: 'Benchmark showed < 2ms latency overhead.',
      category_id: getCatId(proj2Id, 'Backend'),
      status_id: getStatusId(proj2Id, 'Under Review'),
      priority: 'critical',
      due_date: new Date(Date.now() + 3 * 86400000).toISOString(),
      created_at: new Date(Date.now() - 5 * 86400000).toISOString(),
      updated_at: new Date(Date.now() - 4 * 3600000).toISOString(),
    },
    {
      id: 'tkt-pg-202',
      project_id: proj2Id,
      ticket_number: 'PG-202',
      title: 'Database connection pool optimization & health checks',
      description: 'Configure pgbouncer transaction mode with max 100 client connections.',
      notes: 'Ready for deployment.',
      category_id: getCatId(proj2Id, 'Database'),
      status_id: getStatusId(proj2Id, 'Verified by QA'),
      priority: 'high',
      due_date: new Date(Date.now() - 3 * 86400000).toISOString(),
      created_at: new Date(Date.now() - 15 * 86400000).toISOString(),
      updated_at: new Date(Date.now() - 20 * 3600000).toISOString(),
    },
  ];
  saveTable('tickets', tickets);

  // Attachments
  const samplePdfData = 'data:application/pdf;base64,JVBERi0xLjQKJcTl8uXrCg==';
  const attachments: Attachment[] = [
    {
      id: 'att-001',
      ticket_id: 'tkt-mb-101',
      file_name: 'biometric-flow-diagram.pdf',
      file_url: samplePdfData,
      file_type: 'application/pdf',
      file_size: 142800,
      created_at: new Date(Date.now() - 5 * 86400000).toISOString(),
    },
    {
      id: 'att-002',
      ticket_id: 'tkt-mb-104',
      file_name: 'memory-leak-trace.txt',
      file_url: 'data:text/plain;base64,TWVtb3J5IExlYWsgaW4gU2VhcmNoSW5wdXQ6IERPTU5vZGUgY291bnQgcm9zZSBmcm9tIDMyMCB0byAyNDUwIGR1cmluZyBxdWljayB0YWIgc3dpdGNoaW5nLg==',
      file_type: 'text/plain',
      file_size: 1204,
      created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
    },
  ];
  saveTable('attachments', attachments);

  // History
  const ticketHistory: TicketHistory[] = [
    {
      id: 'hist-001',
      ticket_id: 'tkt-mb-101',
      action_type: 'created',
      old_value: null,
      new_value: 'MB-101: Biometric Face ID fallback PIN lock',
      created_at: new Date(Date.now() - 6 * 86400000).toISOString(),
    },
    {
      id: 'hist-002',
      ticket_id: 'tkt-mb-101',
      action_type: 'status_changed',
      old_value: 'Just Written',
      new_value: 'In Progress',
      created_at: new Date(Date.now() - 3 * 86400000).toISOString(),
    },
    {
      id: 'hist-003',
      ticket_id: 'tkt-mb-104',
      action_type: 'status_changed',
      old_value: 'Under Review',
      new_value: 'Changes Required',
      created_at: new Date(Date.now() - 1 * 86400000).toISOString(),
    },
    {
      id: 'hist-004',
      ticket_id: 'tkt-mb-106',
      action_type: 'status_changed',
      old_value: 'Completed',
      new_value: 'Verified by QA',
      created_at: new Date(Date.now() - 12 * 3600000).toISOString(),
    },
  ];
  saveTable('ticket_history', ticketHistory);

  // Initial Seed Notes
  const existingNotes = getStoredTable<ProjectNote[]>('notes', []);
  if (existingNotes.length === 0) {
    const initialNotes: ProjectNote[] = [
      {
        id: 'note-001',
        project_id: 'proj-mobile-banking-01',
        project_name: 'Mobile Banking Application Redesign',
        title: 'Biometric Face ID fallback to PIN lock after 3 failed attempts',
        content: 'Investigation findings:\n- On iOS FaceID failure, user gets locked out without a manual fallback to device PIN.\n- Need to integrate LocalAuthentication context evaluatePolicy with fallback Title.\n\nExecution notes:\n- Fallback button must be labeled "Enter Passcode"\n- Throttle rapid attempts with 30s backoff timer\n- Ensure biometric payload invalidated if system enrolled biometrics change',
        tags: ['auth', 'security', 'ios'],
        is_pinned: true,
        is_converted_to_ticket: false,
        author_id: DEFAULT_USER.id,
        author_name: DEFAULT_USER.name,
        created_at: new Date(Date.now() - 4 * 3600000).toISOString(),
        updated_at: new Date(Date.now() - 1 * 3600000).toISOString(),
      },
      {
        id: 'note-002',
        project_id: 'proj-payment-api-02',
        project_name: 'Core Payment Gateway v2',
        title: 'Webhook delivery retry mechanism specification',
        content: 'Rough notes from architecture standup:\n- Webhooks fail silently if merchant endpoint returns 503/timeout\n- Implement exponential backoff schedule: 10s, 1m, 15m, 1h, 6h, 24h\n- Add Idempotency-Key in webhook POST header so merchants avoid double charges\n- Store failed attempts in dead-letter table with replay UI',
        tags: ['webhooks', 'api', 'architecture'],
        is_pinned: false,
        is_converted_to_ticket: false,
        author_id: DEFAULT_USER.id,
        author_name: DEFAULT_USER.name,
        created_at: new Date(Date.now() - 18 * 3600000).toISOString(),
        updated_at: new Date(Date.now() - 12 * 3600000).toISOString(),
      },
      {
        id: 'note-003',
        project_id: null,
        project_name: 'General Workspace',
        title: 'UX Friction: Checkout button hidden below fold on mobile safari',
        content: 'Customer reported issue on Safari mobile with bottom navigation bar obscuring primary action.\nSteps captured:\n1. Sticky checkout footer needs env(safe-area-inset-bottom) padding\n2. Add floating summary bar when user scrolls past payment options\n3. Test on iPhone 15 Pro & Pixel 8',
        tags: ['mobile', 'css', 'bug'],
        is_pinned: false,
        is_converted_to_ticket: true,
        converted_ticket_id: 'tkt-mb-101',
        converted_ticket_number: 'MB-101',
        author_id: DEFAULT_USER.id,
        author_name: DEFAULT_USER.name,
        created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
        updated_at: new Date(Date.now() - 1 * 86400000).toISOString(),
      },
    ];
    saveTable('notes', initialNotes);
  }
}

// Ensure database is initialized
seedInitialData();

// Generate realistic seed attendance records across the workforce
export function generateSeedAttendance(): AttendanceRecord[] {
  const users = INITIAL_TEAM_USERS;
  const records: AttendanceRecord[] = [];
  const now = new Date();

  // Days: Today (0), yesterday (1), 2, 3, 4, 5 days ago
  const daysOffset = [0, 1, 2, 3, 4, 5];

  daysOffset.forEach((offset) => {
    const dayDate = new Date(now.getTime() - offset * 86400000);
    const dateStr = dayDate.toISOString().split('T')[0];
    const isToday = offset === 0;

    users.forEach((u, uIdx) => {
      const recId = `att-${u.id}-${dateStr}`;

      if (isToday) {
        if (u.id === 'usr-team-006') {
          // David Miller on leave
          records.push({
            id: recId,
            user_id: u.id,
            user_name: u.name,
            user_email: u.email,
            user_avatar: u.avatar_url,
            user_role: u.role || 'employee',
            department: u.department,
            date: dateStr,
            check_in: null,
            check_out: null,
            work_duration_minutes: 0,
            status: 'on_leave',
            shift_start: '09:00',
            shift_end: '18:00',
            notes: 'Approved sick leave for dental appointment',
            created_at: dayDate.toISOString(),
            updated_at: dayDate.toISOString(),
          });
        } else if (u.id === 'usr-team-003') {
          // Imran Khan: late arrival
          const checkIn = new Date(`${dateStr}T09:32:00`).toISOString();
          records.push({
            id: recId,
            user_id: u.id,
            user_name: u.name,
            user_email: u.email,
            user_avatar: u.avatar_url,
            user_role: u.role || 'employee',
            department: u.department,
            date: dateStr,
            check_in: checkIn,
            check_out: null,
            work_duration_minutes: 215,
            status: 'late',
            shift_start: '09:00',
            shift_end: '18:00',
            notes: 'Delayed due to metro commute disruption',
            regularization_requested: true,
            regularization_reason: 'Metro train transit line delayed by 30 mins',
            regularization_status: 'pending',
            created_at: checkIn,
            updated_at: checkIn,
          });
        } else if (u.id === 'usr-team-004') {
          // Alex Chen: not punched in yet today
        } else {
          // Present & working
          const checkInMinute = 48 + ((uIdx * 3) % 12);
          const minuteStr = checkInMinute < 10 ? `0${checkInMinute}` : `${checkInMinute}`;
          const checkIn = new Date(`${dateStr}T08:${minuteStr}:00`).toISOString();
          records.push({
            id: recId,
            user_id: u.id,
            user_name: u.name,
            user_email: u.email,
            user_avatar: u.avatar_url,
            user_role: u.role || 'employee',
            department: u.department,
            date: dateStr,
            check_in: checkIn,
            check_out: null,
            work_duration_minutes: 270 - uIdx * 15,
            status: 'present',
            shift_start: '09:00',
            shift_end: '18:00',
            created_at: checkIn,
            updated_at: checkIn,
          });
        }
      } else {
        // Historical completed days
        let status: AttendanceStatus = 'present';
        let checkInTime = '08:52:00';
        let checkOutTime = '18:15:00';
        let durationMins = 563;

        if (offset === 2 && u.id === 'usr-team-004') {
          status = 'half_day';
          checkInTime = '09:00:00';
          checkOutTime = '13:15:00';
          durationMins = 255;
        } else if (offset === 3 && u.id === 'usr-team-003') {
          status = 'late';
          checkInTime = '09:40:00';
          checkOutTime = '18:45:00';
          durationMins = 545;
        } else if (offset === 4 && u.id === 'usr-team-005') {
          status = 'on_leave';
          checkInTime = '';
          checkOutTime = '';
          durationMins = 0;
        }

        records.push({
          id: recId,
          user_id: u.id,
          user_name: u.name,
          user_email: u.email,
          user_avatar: u.avatar_url,
          user_role: u.role || 'employee',
          department: u.department,
          date: dateStr,
          check_in: checkInTime ? new Date(`${dateStr}T${checkInTime}`).toISOString() : null,
          check_out: checkOutTime ? new Date(`${dateStr}T${checkOutTime}`).toISOString() : null,
          work_duration_minutes: durationMins,
          status,
          shift_start: '09:00',
          shift_end: '18:00',
          notes: status === 'on_leave' ? 'Annual leave' : undefined,
          regularization_status: status === 'late' ? 'approved' : undefined,
          created_at: dayDate.toISOString(),
          updated_at: dayDate.toISOString(),
        });
      }
    });
  });

  return records;
}

export const localDB = {
  // Current user (null when logged out)
  getCurrentUser(): User | null {
    return getStoredTable<User | null>('currentUser', null);
  },

  setCurrentUser(user: User | null): void {
    saveTable('currentUser', user);
  },

  // Users & Workforce Management
  getUsers(): User[] {
    const users = getStoredTable<User[]>('users', []);
    if (!users || users.length === 0) {
      saveTable('users', INITIAL_TEAM_USERS);
      return INITIAL_TEAM_USERS;
    }
    // Ensure all initial team users exist and super_admin is properly designated
    const existingIds = new Set(users.map((u: User) => u.id));
    let hasChanges = false;
    INITIAL_TEAM_USERS.forEach((teamUser) => {
      if (!existingIds.has(teamUser.id)) {
        users.push(teamUser);
        hasChanges = true;
      }
    });
    // Ensure exactly 1 super_admin exists
    const superAdminCount = users.filter((u: User) => u.role === 'super_admin').length;
    if (superAdminCount === 0 && users.length > 0) {
      users[0].role = 'super_admin';
      hasChanges = true;
    }
    if (hasChanges) {
      saveTable('users', users);
    }
    return users;
  },

  getUserById(id: string): User | null {
    const users = this.getUsers();
    return users.find((u: User) => u.id === id) || null;
  },

  saveUser(user: User): User {
    const users = this.getUsers();
    const idx = users.findIndex((u: User) => u.id === user.id);
    if (idx >= 0) {
      users[idx] = { ...users[idx], ...user };
    } else {
      users.push(user);
    }
    saveTable('users', users);
    return user;
  },

  updateUserRole(userId: string, newRole: UserRole): User {
    const users = this.getUsers();
    const idx = users.findIndex((u: User) => u.id === userId);
    if (idx < 0) {
      throw new Error(`User with ID ${userId} not found`);
    }

    // Rule: 1 single user will be super admin
    if (users[idx].role === 'super_admin' && newRole !== 'super_admin') {
      throw new Error('The workspace Super Admin cannot be demoted. Exactly 1 user must be Super Admin.');
    }

    if (newRole === 'super_admin') {
      // Reassign super admin: demote existing super admin to admin
      users.forEach((u: User) => {
        if (u.role === 'super_admin') {
          u.role = 'admin';
        }
      });
    }

    users[idx].role = newRole;
    saveTable('users', users);

    // If the updated user is currently logged in, update currentUser as well
    const currentUser = this.getCurrentUser();
    if (currentUser && currentUser.id === userId) {
      this.setCurrentUser({ ...currentUser, role: newRole });
    }

    return users[idx];
  },

  // Attendance Records
  getAttendance(filters?: AttendanceFilterState): AttendanceRecord[] {
    let records = getStoredTable<AttendanceRecord[]>('attendance', []);
    if (!records || records.length === 0) {
      const seeded = generateSeedAttendance();
      saveTable('attendance', seeded);
      records = seeded;
    }

    if (!filters) return records;

    return records.filter((r: AttendanceRecord) => {
      if (filters.userId && r.user_id !== filters.userId) return false;
      if (filters.role && r.user_role !== filters.role) return false;
      if (filters.status && r.status !== filters.status) return false;
      if (filters.department && r.department !== filters.department) return false;
      if (filters.dateFrom && r.date < filters.dateFrom) return false;
      if (filters.dateTo && r.date > filters.dateTo) return false;
      if (filters.search) {
        const q = filters.search.toLowerCase();
        const matchesName = r.user_name?.toLowerCase().includes(q);
        const matchesEmail = r.user_email?.toLowerCase().includes(q);
        const matchesNotes = r.notes?.toLowerCase().includes(q);
        const matchesDept = r.department?.toLowerCase().includes(q);
        if (!matchesName && !matchesEmail && !matchesNotes && !matchesDept) return false;
      }
      return true;
    }).sort((a: AttendanceRecord, b: AttendanceRecord) => {
      if (a.date !== b.date) {
        return b.date.localeCompare(a.date);
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  },

  saveAttendance(record: AttendanceRecord): AttendanceRecord {
    const all = getStoredTable<AttendanceRecord[]>('attendance', []);
    const idx = all.findIndex((r: AttendanceRecord) => r.id === record.id);
    if (idx >= 0) {
      all[idx] = { ...record, updated_at: new Date().toISOString() };
    } else {
      all.unshift(record);
    }
    saveTable('attendance', all);
    return record;
  },

  deleteAttendance(id: string): void {
    const all = getStoredTable<AttendanceRecord[]>('attendance', []);
    saveTable('attendance', all.filter((r: AttendanceRecord) => r.id !== id));
  },

  // Projects
  getProjects(): Project[] {
    const user = this.getCurrentUser();
    const projects = getStoredTable<Project[]>('projects', []);
    if (!user) return [];
    return projects.filter(
      (p) => !p.user_id || p.user_id === user.id || p.user_id === DEFAULT_USER.id
    );
  },

  getProjectById(id: string): Project | null {
    const projects = this.getProjects();
    return projects.find((p) => p.id === id) || null;
  },

  saveProject(project: Project): Project {
    const projects = getStoredTable<Project[]>('projects', []);
    const index = projects.findIndex((p) => p.id === project.id);
    if (index >= 0) {
      projects[index] = { ...project, updated_at: new Date().toISOString() };
    } else {
      projects.unshift(project);
    }
    saveTable('projects', projects);
    return project;
  },

  deleteProject(id: string): void {
    const projects = getStoredTable<Project[]>('projects', []).filter((p) => p.id !== id);
    saveTable('projects', projects);

    // Cascade delete statuses, categories, tickets, attachments, history
    const statuses = getStoredTable<Status[]>('statuses', []).filter((s) => s.project_id !== id);
    saveTable('statuses', statuses);

    const categories = getStoredTable<Category[]>('categories', []).filter((c) => c.project_id !== id);
    saveTable('categories', categories);

    const tickets = getStoredTable<Ticket[]>('tickets', []);
    const projectTicketIds = new Set(tickets.filter((t) => t.project_id === id).map((t) => t.id));
    const remainingTickets = tickets.filter((t) => t.project_id !== id);
    saveTable('tickets', remainingTickets);

    const attachments = getStoredTable<Attachment[]>('attachments', []).filter(
      (a) => !projectTicketIds.has(a.ticket_id)
    );
    saveTable('attachments', attachments);

    const history = getStoredTable<TicketHistory[]>('ticket_history', []).filter(
      (h) => !projectTicketIds.has(h.ticket_id)
    );
    saveTable('ticket_history', history);
  },

  // Statuses
  getStatuses(projectId: string): Status[] {
    const rawAll = getStoredTable<Status[]>('statuses', []);
    
    // Auto-migrate any old status named "Uploaded" to "Verified by QA"
    let hasMigrated = false;
    const migratedRaw = rawAll.map((s) => {
      if (s && (s.name === 'Uploaded' || s.is_final)) {
        if (s.name === 'Uploaded') {
          hasMigrated = true;
          return { ...s, name: 'Verified by QA', is_final: true };
        }
      }
      return s;
    });
    if (hasMigrated) {
      saveTable('statuses', migratedRaw);
    }

    // Global deduplication: heal storage if duplicates ever accumulated
    const globalSeen = new Set<string>();
    const cleanedAll: Status[] = [];
    for (const s of (hasMigrated ? migratedRaw : rawAll)) {
      if (s && s.id && !globalSeen.has(s.id)) {
        globalSeen.add(s.id);
        cleanedAll.push(s);
      }
    }
    if (cleanedAll.length !== rawAll.length) {
      saveTable('statuses', cleanedAll);
    }

    const filtered = cleanedAll.filter((s) => s.project_id === projectId);

    // Strict project-level deduplication by ID and position
    const seenIds = new Set<string>();
    const seenPositions = new Set<number>();
    const uniqueProjectStatuses: Status[] = [];
    for (const s of filtered) {
      if (!seenIds.has(s.id) && !seenPositions.has(s.position)) {
        seenIds.add(s.id);
        seenPositions.add(s.position);
        uniqueProjectStatuses.push(s);
      }
    }

    // If no statuses exist yet for this project, initialize default 4 statuses
    if (uniqueProjectStatuses.length === 0) {
      const newStatuses: Status[] = DEFAULT_TICKET_STATUSES.map((st) => ({
        id: `st-${projectId}-${st.position}`,
        project_id: projectId,
        name: st.name,
        position: st.position,
        is_final: st.is_final,
        created_at: new Date().toISOString(),
      }));

      const others = cleanedAll.filter((s) => s.project_id !== projectId);
      others.push(...newStatuses);
      saveTable('statuses', others);
      return newStatuses.sort((a, b) => a.position - b.position);
    }

    // If duplicates were discovered and filtered out, heal localStorage
    if (uniqueProjectStatuses.length !== filtered.length) {
      const others = cleanedAll.filter((s) => s.project_id !== projectId);
      saveTable('statuses', [...others, ...uniqueProjectStatuses]);
    }

    return uniqueProjectStatuses.sort((a, b) => a.position - b.position);
  },

  saveStatus(status: Status): Status {
    const all = getStoredTable<Status[]>('statuses', []);
    // Filter out all prior occurrences of this status ID or matching position in project
    const remaining = all.filter(
      (s) => s && s.id !== status.id && !(s.project_id === status.project_id && s.position === status.position)
    );
    remaining.push(status);
    saveTable('statuses', remaining);
    return status;
  },

  // Categories
  getCategories(projectId: string): Category[] {
    const rawAll = getStoredTable<Category[]>('categories', []);
    
    // Global deduplication
    const globalSeen = new Set<string>();
    const cleanedAll: Category[] = [];
    for (const c of rawAll) {
      if (c && c.id && !globalSeen.has(c.id)) {
        globalSeen.add(c.id);
        cleanedAll.push(c);
      }
    }
    if (cleanedAll.length !== rawAll.length) {
      saveTable('categories', cleanedAll);
    }

    const filtered = cleanedAll.filter((c) => c.project_id === projectId);

    const seenIds = new Set<string>();
    const seenNames = new Set<string>();
    const uniqueProjectCats: Category[] = [];
    for (const c of filtered) {
      const norm = (c.name || '').trim().toLowerCase();
      if (!seenIds.has(c.id) && !seenNames.has(norm)) {
        seenIds.add(c.id);
        seenNames.add(norm);
        uniqueProjectCats.push(c);
      }
    }
    
    // Auto-create default categories if none exist
    if (uniqueProjectCats.length === 0) {
      const newCats: Category[] = DEFAULT_TICKET_CATEGORIES.map((catName, idx) => ({
        id: `cat-${projectId}-${idx}`,
        project_id: projectId,
        name: catName,
        created_at: new Date().toISOString(),
      }));
      const others = cleanedAll.filter((c) => c.project_id !== projectId);
      others.push(...newCats);
      saveTable('categories', others);
      return newCats;
    }

    // Ensure 'Verified by Admin or Owner or Project Manager' category exists for the project
    const hasAdminCat = uniqueProjectCats.some(
      (c) => c.name.toLowerCase().includes('verified by admin')
    );
    if (!hasAdminCat && projectId) {
      const adminCat: Category = {
        id: `cat-${projectId}-admin-verified`,
        project_id: projectId,
        name: 'Verified by Admin or Owner or Project Manager',
        created_at: new Date().toISOString(),
      };
      uniqueProjectCats.unshift(adminCat);
      const others = cleanedAll.filter((c) => c.project_id !== projectId);
      saveTable('categories', [...others, ...uniqueProjectCats]);
      return uniqueProjectCats;
    }

    if (uniqueProjectCats.length !== filtered.length) {
      const others = cleanedAll.filter((c) => c.project_id !== projectId);
      saveTable('categories', [...others, ...uniqueProjectCats]);
    }

    return uniqueProjectCats;
  },

  saveCategory(category: Category): Category {
    const all = getStoredTable<Category[]>('categories', []);
    const norm = (category.name || '').trim().toLowerCase();
    const remaining = all.filter(
      (c) => c && c.id !== category.id && !(c.project_id === category.project_id && (c.name || '').trim().toLowerCase() === norm)
    );
    remaining.push(category);
    saveTable('categories', remaining);
    return category;
  },

  // Tickets
  getTickets(projectId?: string): Ticket[] {
    const rawTickets = getStoredTable<Ticket[]>('tickets', []);
    
    // Sort so newest updated tickets take precedence
    const sorted = [...rawTickets].sort((a, b) => {
      const timeA = new Date(a.updated_at || a.created_at || 0).getTime();
      const timeB = new Date(b.updated_at || b.created_at || 0).getTime();
      return timeB - timeA;
    });

    // Strict deduplication by ID AND by project_id + ticket_number
    const seenIds = new Set<string>();
    const seenTicketKeys = new Set<string>();
    const deduplicated: Ticket[] = [];

    for (const t of sorted) {
      if (!t.id) continue;
      const tNumKey = t.project_id && t.ticket_number ? `${t.project_id}::${t.ticket_number.trim().toLowerCase()}` : '';
      
      if (!seenIds.has(t.id) && (!tNumKey || !seenTicketKeys.has(tNumKey))) {
        seenIds.add(t.id);
        if (tNumKey) seenTicketKeys.add(tNumKey);
        deduplicated.push(t);
      }
    }

    // If duplicates were found in storage, heal and persist clean state
    if (deduplicated.length !== rawTickets.length) {
      saveTable('tickets', deduplicated);
    }

    const filtered = projectId ? deduplicated.filter((t) => t.project_id === projectId) : deduplicated;

    const statuses = getStoredTable<Status[]>('statuses', []);
    const categories = getStoredTable<Category[]>('categories', []);
    const attachments = getStoredTable<Attachment[]>('attachments', []);
    const history = getStoredTable<TicketHistory[]>('ticket_history', []);
    const comments = getStoredTable<TicketComment[]>('comments', []);

    return filtered.map((t) => ({
      ...t,
      status: statuses.find((s) => s.id === t.status_id),
      category: categories.find((c) => c.id === t.category_id),
      attachments: attachments.filter((a) => a.ticket_id === t.id),
      comments: comments
        .filter((c) => c.ticket_id === t.id)
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()),
      history: history
        .filter((h) => h.ticket_id === t.id)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    }));
  },

  getTicketById(id: string): Ticket | null {
    const all = this.getTickets();
    return all.find((t) => t.id === id) || null;
  },

  saveTicket(ticket: Ticket): Ticket {
    const tickets = getStoredTable<Ticket[]>('tickets', []);
    const now = new Date().toISOString();

    // Clean ticket to avoid saving nested objects into localStorage row
    const cleanTicket: Ticket = {
      id: ticket.id,
      project_id: ticket.project_id,
      ticket_number: ticket.ticket_number.trim(),
      ref_code: ticket.ref_code || '',
      ticket_type: ticket.ticket_type || 'Modification',
      title: ticket.title.trim(),
      description: ticket.description || '',
      notes: ticket.notes || '',
      category_id: ticket.category_id,
      status_id: ticket.status_id,
      priority: ticket.priority,
      severity: ticket.severity || 'medium',
      dev_mask: ticket.dev_mask || 'frontend',
      color: ticket.color || 'default',
      work_assignments: ticket.work_assignments || {
        backend: '',
        frontend: '',
        flutter: '',
        qa: '',
      },
      work_relay: ticket.work_relay,
      time_tracking: ticket.time_tracking,
      start_date: ticket.start_date || null,
      due_date: ticket.due_date || null,
      created_by_name: ticket.created_by_name || 'Project Owner',
      created_by_avatar: ticket.created_by_avatar || '',
      updated_by_name: ticket.updated_by_name || ticket.created_by_name || 'Project Owner',
      updated_by_avatar: ticket.updated_by_avatar || '',
      created_at: ticket.created_at || now,
      updated_at: ticket.updated_at || now,
    };

    const targetKey = `${cleanTicket.project_id}::${cleanTicket.ticket_number.toLowerCase()}`;

    // Remove any previous versions with matching ID or project+ticket_number
    const filtered = tickets.filter((t) => {
      if (t.id === cleanTicket.id) return false;
      const tKey = t.project_id && t.ticket_number ? `${t.project_id}::${t.ticket_number.trim().toLowerCase()}` : '';
      if (tKey && tKey === targetKey) return false;
      return true;
    });

    // Insert updated clean ticket at start
    filtered.unshift(cleanTicket);
    saveTable('tickets', filtered);

    // Also update parent project's updated_at
    const projects = getStoredTable<Project[]>('projects', []);
    const pIdx = projects.findIndex((p) => p.id === cleanTicket.project_id);
    if (pIdx >= 0) {
      projects[pIdx].updated_at = now;
      saveTable('projects', projects);
    }

    return this.getTicketById(cleanTicket.id) || cleanTicket;
  },

  deleteTicket(id: string): void {
    const tickets = getStoredTable<Ticket[]>('tickets', []).filter((t) => t.id !== id);
    saveTable('tickets', tickets);

    const attachments = getStoredTable<Attachment[]>('attachments', []).filter((a) => a.ticket_id !== id);
    saveTable('attachments', attachments);

    const history = getStoredTable<TicketHistory[]>('ticket_history', []).filter((h) => h.ticket_id !== id);
    saveTable('ticket_history', history);
  },

  // Attachments
  getAttachments(ticketId?: string): Attachment[] {
    const all = getStoredTable<Attachment[]>('attachments', []);
    if (ticketId) {
      return all.filter((a) => a.ticket_id === ticketId);
    }
    return all;
  },

  saveAttachment(attachment: Attachment): Attachment {
    const all = getStoredTable<Attachment[]>('attachments', []);
    all.unshift(attachment);
    saveTable('attachments', all);
    return attachment;
  },

  deleteAttachment(id: string): void {
    const all = getStoredTable<Attachment[]>('attachments', []).filter((a) => a.id !== id);
    saveTable('attachments', all);
  },

  // History
  getHistory(ticketId: string): TicketHistory[] {
    const all = getStoredTable<TicketHistory[]>('ticket_history', []);
    return all
      .filter((h) => h.ticket_id === ticketId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },

  addHistory(historyItem: TicketHistory): void {
    const all = getStoredTable<TicketHistory[]>('ticket_history', []);
    all.unshift(historyItem);
    saveTable('ticket_history', all);
  },

  // Comments
  getComments(ticketId: string): TicketComment[] {
    const all = getStoredTable<TicketComment[]>('comments', []);
    return all
      .filter((c) => c.ticket_id === ticketId)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  },

  addComment(commentData: {
    ticket_id: string;
    user_name: string;
    user_avatar?: string;
    content: string;
    images?: string[];
    audio_url?: string;
    audio_duration?: number;
    is_voice_message?: boolean;
  }): TicketComment {
    const all = getStoredTable<TicketComment[]>('comments', []);
    const newComment: TicketComment = {
      id: `cmt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      ticket_id: commentData.ticket_id,
      user_name: commentData.user_name || 'Team Member',
      user_avatar: commentData.user_avatar || '',
      content: commentData.content || '',
      images: Array.isArray(commentData.images) ? commentData.images : [],
      audio_url: commentData.audio_url,
      audio_duration: commentData.audio_duration,
      is_voice_message: Boolean(commentData.is_voice_message),
      created_at: new Date().toISOString(),
    };
    all.push(newComment);
    saveTable('comments', all);
    return newComment;
  },

  deleteComment(commentId: string): void {
    const all = getStoredTable<TicketComment[]>('comments', []);
    saveTable('comments', all.filter((c) => c.id !== commentId));
  },

  // Notes & Scratchpad
  getNotes(filter?: NoteFilterState): ProjectNote[] {
    let notes = getStoredTable<ProjectNote[]>('notes', []);
    if (!notes || notes.length === 0) {
      seedInitialData();
      notes = getStoredTable<ProjectNote[]>('notes', []);
    }

    if (!filter) {
      return notes.sort((a, b) => {
        if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
    }

    return notes
      .filter((n) => {
        if (filter.projectId && n.project_id !== filter.projectId) return false;
        if (filter.tag && (!n.tags || !n.tags.includes(filter.tag))) return false;
        if (filter.status === 'open' && n.is_converted_to_ticket) return false;
        if (filter.status === 'converted' && !n.is_converted_to_ticket) return false;
        if (filter.status === 'pinned' && !n.is_pinned) return false;
        if (filter.search) {
          const q = filter.search.toLowerCase();
          const matchesTitle = n.title?.toLowerCase().includes(q);
          const matchesContent = n.content?.toLowerCase().includes(q);
          const matchesTags = n.tags?.some((t) => t.toLowerCase().includes(q));
          const matchesProject = n.project_name?.toLowerCase().includes(q);
          if (!matchesTitle && !matchesContent && !matchesTags && !matchesProject) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
  },

  getNoteById(id: string): ProjectNote | null {
    const notes = getStoredTable<ProjectNote[]>('notes', []);
    return notes.find((n) => n.id === id) || null;
  },

  saveNote(note: ProjectNote): ProjectNote {
    const notes = getStoredTable<ProjectNote[]>('notes', []);
    const idx = notes.findIndex((n) => n.id === note.id);
    const now = new Date().toISOString();
    const cleanNote: ProjectNote = {
      ...note,
      updated_at: now,
      created_at: note.created_at || now,
    };
    if (idx >= 0) {
      notes[idx] = cleanNote;
    } else {
      notes.unshift(cleanNote);
    }
    saveTable('notes', notes);
    return cleanNote;
  },

  deleteNote(id: string): void {
    const notes = getStoredTable<ProjectNote[]>('notes', []);
    saveTable('notes', notes.filter((n) => n.id !== id));
  },

  convertNoteToTicket(noteId: string, ticketData: Ticket): { note: ProjectNote; ticket: Ticket } {
    const savedTicket = this.saveTicket(ticketData);
    const note = this.getNoteById(noteId);
    if (note) {
      const updatedNote: ProjectNote = {
        ...note,
        is_converted_to_ticket: true,
        converted_ticket_id: savedTicket.id,
        converted_ticket_number: savedTicket.ticket_number,
        updated_at: new Date().toISOString(),
      };
      this.saveNote(updatedNote);
      return { note: updatedNote, ticket: savedTicket };
    }
    return { note: note as any, ticket: savedTicket };
  },

  // Reset database to initial seeds
  resetDatabase(): void {
    localStorage.removeItem(`${STORE_PREFIX}projects`);
    localStorage.removeItem(`${STORE_PREFIX}statuses`);
    localStorage.removeItem(`${STORE_PREFIX}categories`);
    localStorage.removeItem(`${STORE_PREFIX}tickets`);
    localStorage.removeItem(`${STORE_PREFIX}attachments`);
    localStorage.removeItem(`${STORE_PREFIX}ticket_history`);
    localStorage.removeItem(`${STORE_PREFIX}comments`);
    localStorage.removeItem(`${STORE_PREFIX}notes`);
    localStorage.removeItem(`${STORE_PREFIX}users`);
    localStorage.removeItem(`${STORE_PREFIX}currentUser`);
    seedInitialData();
  },
};
