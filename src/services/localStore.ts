import {
  User,
  Project,
  Status,
  Category,
  Ticket,
  Attachment,
  TicketHistory,
} from '../types';
import { DEFAULT_TICKET_STATUSES } from '../config/ticketStatuses';
import { DEFAULT_TICKET_CATEGORIES } from '../config/ticketCategories';

const STORE_PREFIX = 'kanso_db_';

interface DatabaseSchema {
  users: User[];
  projects: Project[];
  statuses: Status[];
  categories: Category[];
  tickets: Ticket[];
  attachments: Attachment[];
  ticket_history: TicketHistory[];
  currentUser: User | null;
}

const DEFAULT_USER: User = {
  id: 'usr-default-001',
  email: 'boboffical54@gmail.com',
  name: 'Bob Official',
  avatar_url: '',
  created_at: new Date('2026-09-01T08:00:00Z').toISOString(),
};

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
      status_id: getStatusId(proj1Id, 'In Progress'),
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
      status_id: getStatusId(proj1Id, 'Changes Required'),
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
      status_id: getStatusId(proj1Id, 'Completed'),
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
      status_id: getStatusId(proj1Id, 'Uploaded'),
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
      status_id: getStatusId(proj2Id, 'In Progress'),
      priority: 'urgent',
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
      status_id: getStatusId(proj2Id, 'Uploaded'),
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
      new_value: 'Uploaded',
      created_at: new Date(Date.now() - 12 * 3600000).toISOString(),
    },
  ];
  saveTable('ticket_history', ticketHistory);
}

// Ensure database is initialized
seedInitialData();

export const localDB = {
  // Current user
  getCurrentUser(): User {
    const user = getStoredTable<User | null>('currentUser', null);
    if (user) return user;
    saveTable('currentUser', DEFAULT_USER);
    return DEFAULT_USER;
  },

  setCurrentUser(user: User | null): void {
    saveTable('currentUser', user);
  },

  // Projects
  getProjects(): Project[] {
    const user = this.getCurrentUser();
    const projects = getStoredTable<Project[]>('projects', []);
    return projects.filter((p) => p.user_id === user.id);
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
    const all = getStoredTable<Status[]>('statuses', []);
    let filtered = all.filter((s) => s.project_id === projectId);
    
    // Auto-create default statuses if none exist for this project
    if (filtered.length === 0) {
      const newStatuses: Status[] = DEFAULT_TICKET_STATUSES.map((st) => ({
        id: `st-${projectId}-${st.position}`,
        project_id: projectId,
        name: st.name,
        position: st.position,
        is_final: st.is_final,
        created_at: new Date().toISOString(),
      }));
      all.push(...newStatuses);
      saveTable('statuses', all);
      filtered = newStatuses;
    }
    return filtered.sort((a, b) => a.position - b.position);
  },

  saveStatus(status: Status): Status {
    const all = getStoredTable<Status[]>('statuses', []);
    const idx = all.findIndex((s) => s.id === status.id);
    if (idx >= 0) {
      all[idx] = status;
    } else {
      all.push(status);
    }
    saveTable('statuses', all);
    return status;
  },

  // Categories
  getCategories(projectId: string): Category[] {
    const all = getStoredTable<Category[]>('categories', []);
    let filtered = all.filter((c) => c.project_id === projectId);
    
    // Auto-create default categories if none exist
    if (filtered.length === 0) {
      const newCats: Category[] = DEFAULT_TICKET_CATEGORIES.map((catName, idx) => ({
        id: `cat-${projectId}-${idx}`,
        project_id: projectId,
        name: catName,
        created_at: new Date().toISOString(),
      }));
      all.push(...newCats);
      saveTable('categories', all);
      filtered = newCats;
    }
    return filtered;
  },

  saveCategory(category: Category): Category {
    const all = getStoredTable<Category[]>('categories', []);
    const idx = all.findIndex((c) => c.id === category.id);
    if (idx >= 0) {
      all[idx] = category;
    } else {
      all.push(category);
    }
    saveTable('categories', all);
    return category;
  },

  // Tickets
  getTickets(projectId?: string): Ticket[] {
    const tickets = getStoredTable<Ticket[]>('tickets', []);
    const filtered = projectId ? tickets.filter((t) => t.project_id === projectId) : tickets;

    const statuses = getStoredTable<Status[]>('statuses', []);
    const categories = getStoredTable<Category[]>('categories', []);
    const attachments = getStoredTable<Attachment[]>('attachments', []);
    const history = getStoredTable<TicketHistory[]>('ticket_history', []);

    return filtered.map((t) => ({
      ...t,
      status: statuses.find((s) => s.id === t.status_id),
      category: categories.find((c) => c.id === t.category_id),
      attachments: attachments.filter((a) => a.ticket_id === t.id),
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
    const idx = tickets.findIndex((t) => t.id === ticket.id);

    if (idx >= 0) {
      tickets[idx] = {
        ...tickets[idx],
        ...ticket,
        updated_at: now,
      };
    } else {
      tickets.unshift({
        ...ticket,
        created_at: ticket.created_at || now,
        updated_at: now,
      });
    }
    saveTable('tickets', tickets);

    // Also update parent project's updated_at
    const projects = getStoredTable<Project[]>('projects', []);
    const pIdx = projects.findIndex((p) => p.id === ticket.project_id);
    if (pIdx >= 0) {
      projects[pIdx].updated_at = now;
      saveTable('projects', projects);
    }

    return this.getTicketById(ticket.id) || ticket;
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

  // Reset database to initial seeds
  resetDatabase(): void {
    localStorage.removeItem(`${STORE_PREFIX}projects`);
    localStorage.removeItem(`${STORE_PREFIX}statuses`);
    localStorage.removeItem(`${STORE_PREFIX}categories`);
    localStorage.removeItem(`${STORE_PREFIX}tickets`);
    localStorage.removeItem(`${STORE_PREFIX}attachments`);
    localStorage.removeItem(`${STORE_PREFIX}ticket_history`);
    localStorage.removeItem(`${STORE_PREFIX}users`);
    localStorage.removeItem(`${STORE_PREFIX}currentUser`);
    seedInitialData();
  },
};
