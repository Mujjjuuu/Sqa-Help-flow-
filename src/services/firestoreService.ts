import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  collectionGroup,
} from 'firebase/firestore';
import { db, auth } from './firebase';
import { Project, Ticket, TicketStatus, TicketCategory, Attachment, TicketHistory } from '../types';
import { localDB } from './localStore';

export const firestoreService = {
  // ----------------------------------------------------
  // Projects
  // ----------------------------------------------------
  async getProjects(): Promise<Project[]> {
    try {
      const colRef = collection(db, 'projects');
      const snapshot = await getDocs(colRef);
      if (!snapshot.empty) {
        const firestoreProjects: Project[] = [];
        snapshot.forEach((docSnap) => {
          firestoreProjects.push(docSnap.data() as Project);
        });
        return firestoreProjects;
      }
    } catch (err) {
      console.warn('Firestore getProjects warning, using local cache:', err);
    }
    return localDB.getProjects();
  },

  async getProjectById(id: string): Promise<Project | null> {
    try {
      const docRef = doc(db, 'projects', id);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        return snap.data() as Project;
      }
    } catch (err) {
      console.warn(`Firestore getProjectById (${id}) warning:`, err);
    }
    return localDB.getProjectById(id);
  },

  async saveProject(project: Project): Promise<Project> {
    try {
      const docRef = doc(db, 'projects', project.id);
      await setDoc(docRef, {
        id: project.id,
        user_id: project.user_id || auth.currentUser?.uid || 'usr-default-001',
        name: project.name,
        description: project.description || '',
        status: project.status || 'active',
        created_at: project.created_at,
        updated_at: project.updated_at,
        archived_at: project.archived_at || null,
      });
    } catch (err) {
      console.warn('Firestore saveProject warning, saving locally:', err);
    }
    return localDB.saveProject(project);
  },

  async deleteProject(id: string): Promise<void> {
    try {
      const docRef = doc(db, 'projects', id);
      await deleteDoc(docRef);
    } catch (err) {
      console.warn('Firestore deleteProject warning:', err);
    }
    localDB.deleteProject(id);
  },

  // ----------------------------------------------------
  // Statuses (Subcollection under /projects/{projectId}/statuses)
  // ----------------------------------------------------
  async getStatuses(projectId: string): Promise<TicketStatus[]> {
    try {
      const colRef = collection(db, 'projects', projectId, 'statuses');
      const q = query(colRef, orderBy('position', 'asc'));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const statuses: TicketStatus[] = [];
        snapshot.forEach((docSnap) => {
          statuses.push(docSnap.data() as TicketStatus);
        });
        return statuses;
      }
    } catch (err) {
      console.warn(`Firestore getStatuses for project ${projectId} warning:`, err);
    }
    return localDB.getStatuses(projectId);
  },

  async saveStatuses(projectId: string, statuses: TicketStatus[]): Promise<TicketStatus[]> {
    try {
      for (const st of statuses) {
        const docRef = doc(db, 'projects', projectId, 'statuses', st.id);
        await setDoc(docRef, {
          id: st.id,
          project_id: projectId,
          name: st.name,
          position: st.position,
          is_final: Boolean(st.is_final),
          created_at: st.created_at || new Date().toISOString(),
        });
      }
    } catch (err) {
      console.warn('Firestore saveStatuses warning:', err);
    }
    return localDB.saveStatuses(projectId, statuses);
  },

  // ----------------------------------------------------
  // Categories (Subcollection under /projects/{projectId}/categories)
  // ----------------------------------------------------
  async getCategories(projectId: string): Promise<TicketCategory[]> {
    try {
      const colRef = collection(db, 'projects', projectId, 'categories');
      const snapshot = await getDocs(colRef);
      if (!snapshot.empty) {
        const cats: TicketCategory[] = [];
        snapshot.forEach((docSnap) => {
          cats.push(docSnap.data() as TicketCategory);
        });
        return cats;
      }
    } catch (err) {
      console.warn(`Firestore getCategories warning for project ${projectId}:`, err);
    }
    return localDB.getCategories(projectId);
  },

  async saveCategory(projectId: string, category: TicketCategory): Promise<TicketCategory> {
    try {
      const docRef = doc(db, 'projects', projectId, 'categories', category.id);
      await setDoc(docRef, {
        id: category.id,
        project_id: projectId,
        name: category.name,
        created_at: category.created_at,
      });
    } catch (err) {
      console.warn('Firestore saveCategory warning:', err);
    }
    return localDB.saveCategory(category);
  },

  // ----------------------------------------------------
  // Tickets (Subcollection under /projects/{projectId}/tickets)
  // ----------------------------------------------------
  async getTickets(projectId?: string): Promise<Ticket[]> {
    try {
      if (projectId) {
        const colRef = collection(db, 'projects', projectId, 'tickets');
        const snap = await getDocs(colRef);
        if (!snap.empty) {
          const tickets: Ticket[] = [];
          snap.forEach((docSnap) => {
            tickets.push(docSnap.data() as Ticket);
          });
          return tickets;
        }
      } else {
        // Collect tickets across all projects
        const projs = await this.getProjects();
        const all: Ticket[] = [];
        for (const p of projs) {
          const colRef = collection(db, 'projects', p.id, 'tickets');
          const snap = await getDocs(colRef);
          snap.forEach((docSnap) => all.push(docSnap.data() as Ticket));
        }
        if (all.length > 0) return all;
      }
    } catch (err) {
      console.warn('Firestore getTickets warning, falling back to local DB:', err);
    }
    return localDB.getTickets(projectId);
  },

  async getTicketById(ticketId: string): Promise<Ticket | null> {
    const all = await this.getTickets();
    const found = all.find((t) => t.id === ticketId);
    if (found) return found;
    return localDB.getTicketById(ticketId);
  },

  async saveTicket(ticket: Ticket): Promise<Ticket> {
    try {
      const docRef = doc(db, 'projects', ticket.project_id, 'tickets', ticket.id);
      const dataToSave: Record<string, any> = {
        id: ticket.id,
        project_id: ticket.project_id,
        ticket_number: ticket.ticket_number,
        title: ticket.title,
        category_id: ticket.category_id,
        status_id: ticket.status_id,
        priority: ticket.priority,
        created_at: ticket.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      if (ticket.description) dataToSave.description = ticket.description;
      if (ticket.notes) dataToSave.notes = ticket.notes;
      if (ticket.due_date) dataToSave.due_date = ticket.due_date;

      await setDoc(docRef, dataToSave, { merge: true });
    } catch (err) {
      console.warn('Firestore saveTicket warning:', err);
    }
    return localDB.saveTicket(ticket);
  },

  async deleteTicket(projectId: string, ticketId: string): Promise<void> {
    try {
      const docRef = doc(db, 'projects', projectId, 'tickets', ticketId);
      await deleteDoc(docRef);
    } catch (err) {
      console.warn('Firestore deleteTicket warning:', err);
    }
    localDB.deleteTicket(ticketId);
  },

  // ----------------------------------------------------
  // Attachments
  // ----------------------------------------------------
  async saveAttachment(projectId: string, attachment: Attachment): Promise<Attachment> {
    try {
      const docRef = doc(
        db,
        'projects',
        projectId,
        'tickets',
        attachment.ticket_id,
        'attachments',
        attachment.id
      );
      await setDoc(docRef, {
        id: attachment.id,
        ticket_id: attachment.ticket_id,
        file_name: attachment.file_name,
        file_url: attachment.file_url,
        file_type: attachment.file_type,
        file_size: attachment.file_size,
        created_at: attachment.created_at,
      });
    } catch (err) {
      console.warn('Firestore saveAttachment warning:', err);
    }
    return localDB.saveAttachment(attachment);
  },

  async getAttachments(projectId: string, ticketId: string): Promise<Attachment[]> {
    try {
      const colRef = collection(
        db,
        'projects',
        projectId,
        'tickets',
        ticketId,
        'attachments'
      );
      const snap = await getDocs(colRef);
      if (!snap.empty) {
        const atts: Attachment[] = [];
        snap.forEach((d) => atts.push(d.data() as Attachment));
        return atts;
      }
    } catch (err) {
      console.warn('Firestore getAttachments warning:', err);
    }
    return localDB.getAttachments(ticketId);
  },
};
