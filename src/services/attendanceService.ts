import {
  User,
  UserRole,
  AttendanceRecord,
  AttendanceFilterState,
  AttendanceStatus,
} from '../types';
import { localDB, INITIAL_TEAM_USERS, DEFAULT_USER, generateSeedAttendance } from './localStore';
import { firestoreService } from './firestoreService';

// Format YYYY-MM-DD
export function getIsoDate(d = new Date()): string {
  return d.toISOString().split('T')[0];
}

export { generateSeedAttendance };

export const attendanceService = {
  /**
   * Get all workforce users (with assigned roles: super_admin, admin, employee)
   */
  async getWorkforceUsers(): Promise<User[]> {
    try {
      const users = localDB.getUsers();
      // Ensure super admin exists and is set
      const hasSuper = users.some((u) => u.role === 'super_admin');
      if (!hasSuper) {
        users[0].role = 'super_admin';
        localDB.saveUser(users[0]);
      }
      return users;
    } catch (e) {
      console.warn('getWorkforceUsers fallback:', e);
      return INITIAL_TEAM_USERS;
    }
  },

  /**
   * Super Admin assigns or revokes Admin access for a user
   * Rule: 1 single user is super admin. Only super admin can grant/revoke admin access.
   */
  async assignUserRole(targetUserId: string, newRole: UserRole, operator: User): Promise<User> {
    if (operator.role !== 'super_admin') {
      throw new Error('Unauthorized: Only Super Admin can assign or modify admin access permissions.');
    }

    const updatedUser = localDB.updateUserRole(targetUserId, newRole);

    // Also update any attendance records for this user to reflect their updated role
    try {
      const allAtt = localDB.getAttendance();
      let changed = false;
      const updatedAtt = allAtt.map((rec) => {
        if (rec.user_id === targetUserId) {
          changed = true;
          return { ...rec, user_role: newRole };
        }
        return rec;
      });
      if (changed) {
        localStorage.setItem('kanso_db_attendance', JSON.stringify(updatedAtt));
      }
    } catch (e) {
      console.error('Error syncing attendance roles:', e);
    }

    return updatedUser;
  },

  /**
   * Get attendance records with RBAC scoping:
   * - Employee can ONLY view their own records.
   * - Admin and Super Admin can view everyone's records.
   */
  async getAttendanceRecords(
    filters?: AttendanceFilterState,
    currentUser?: User | null
  ): Promise<AttendanceRecord[]> {
    const userRole = currentUser?.role || 'employee';

    // Scoping for employees
    const scopedFilters: AttendanceFilterState = {
      ...(filters || { search: '' }),
    };

    if (userRole === 'employee' && currentUser) {
      scopedFilters.userId = currentUser.id;
    }

    const records = localDB.getAttendance(scopedFilters);
    return records;
  },

  /**
   * Get today's attendance record for a user
   */
  async getTodayRecord(userId: string): Promise<AttendanceRecord | null> {
    const today = getIsoDate();
    const records = localDB.getAttendance({ userId, search: '' });
    return records.find((r) => r.date === today && r.user_id === userId) || null;
  },

  /**
   * Clock in for today
   */
  async clockIn(user: User, notes?: string): Promise<AttendanceRecord> {
    const today = getIsoDate();
    const existing = await this.getTodayRecord(user.id);

    if (existing && existing.check_in) {
      return existing;
    }

    const now = new Date();
    const nowIso = now.toISOString();

    // Determine if late (shift start is 09:00 with 15 min grace window => 09:15)
    const hours = now.getHours();
    const mins = now.getMinutes();
    const isLate = hours > 9 || (hours === 9 && mins > 15);

    const record: AttendanceRecord = {
      id: existing?.id || `att-${user.id}-${today}`,
      user_id: user.id,
      user_name: user.name,
      user_email: user.email,
      user_avatar: user.avatar_url,
      user_role: user.role || 'employee',
      department: user.department || 'Engineering',
      date: today,
      check_in: nowIso,
      check_out: null,
      work_duration_minutes: 0,
      status: isLate ? 'late' : 'present',
      shift_start: '09:00',
      shift_end: '18:00',
      notes: notes || (isLate ? 'Late arrival recorded' : undefined),
      created_at: existing?.created_at || nowIso,
      updated_at: nowIso,
    };

    return localDB.saveAttendance(record);
  },

  /**
   * Clock out for today
   */
  async clockOut(user: User, notes?: string): Promise<AttendanceRecord> {
    const today = getIsoDate();
    const existing = await this.getTodayRecord(user.id);

    if (!existing || !existing.check_in) {
      throw new Error('No active check-in found for today. Please clock in first.');
    }

    if (existing.check_out) {
      return existing;
    }

    const now = new Date();
    const nowIso = now.toISOString();
    const checkInTime = new Date(existing.check_in).getTime();
    const diffMins = Math.max(1, Math.round((now.getTime() - checkInTime) / 60000));

    // If worked less than 4 hours (240 mins), mark as half day
    let status = existing.status;
    if (diffMins < 240 && status !== 'late') {
      status = 'half_day';
    }

    const updated: AttendanceRecord = {
      ...existing,
      check_out: nowIso,
      work_duration_minutes: diffMins,
      status,
      notes: notes ? (existing.notes ? `${existing.notes} | ${notes}` : notes) : existing.notes,
      updated_at: nowIso,
    };

    return localDB.saveAttendance(updated);
  },

  /**
   * Request attendance regularization (e.g., missed punch, transit delay)
   */
  async requestRegularization(recordId: string, reason: string): Promise<AttendanceRecord> {
    const records = localDB.getAttendance();
    const target = records.find((r) => r.id === recordId);
    if (!target) throw new Error('Attendance record not found');

    const updated: AttendanceRecord = {
      ...target,
      regularization_requested: true,
      regularization_reason: reason,
      regularization_status: 'pending',
      updated_at: new Date().toISOString(),
    };

    return localDB.saveAttendance(updated);
  },

  /**
   * Admin or Super Admin resolves regularization
   */
  async resolveRegularization(
    recordId: string,
    approved: boolean,
    operator: User
  ): Promise<AttendanceRecord> {
    if (operator.role !== 'admin' && operator.role !== 'super_admin') {
      throw new Error('Unauthorized: Only Admin or Super Admin can approve attendance regularizations.');
    }

    const records = localDB.getAttendance();
    const target = records.find((r) => r.id === recordId);
    if (!target) throw new Error('Attendance record not found');

    const updated: AttendanceRecord = {
      ...target,
      regularization_status: approved ? 'approved' : 'rejected',
      status: approved ? 'present' : target.status,
      notes: approved
        ? `Regularization approved by ${operator.name}: ${target.regularization_reason || ''}`
        : `Regularization rejected by ${operator.name}`,
      updated_at: new Date().toISOString(),
    };

    return localDB.saveAttendance(updated);
  },

  /**
   * Get today's attendance summary metrics
   */
  async getTodaySummary(): Promise<{
    totalEmployees: number;
    clockedIn: number;
    clockedOut: number;
    lateArrivals: number;
    onLeave: number;
    notClockedIn: number;
    pendingRegularizations: number;
  }> {
    const users = await this.getWorkforceUsers();
    const today = getIsoDate();
    const todayRecords = localDB.getAttendance({ dateFrom: today, dateTo: today });

    const clockedIn = todayRecords.filter((r) => Boolean(r.check_in && !r.check_out)).length;
    const clockedOut = todayRecords.filter((r) => Boolean(r.check_out)).length;
    const lateArrivals = todayRecords.filter((r) => r.status === 'late').length;
    const onLeave = todayRecords.filter((r) => r.status === 'on_leave').length;
    const pendingRegularizations = todayRecords.filter((r) => r.regularization_status === 'pending').length;

    const recordedUserIds = new Set(todayRecords.map((r) => r.user_id));
    const notClockedIn = users.filter((u) => !recordedUserIds.has(u.id)).length;

    return {
      totalEmployees: users.length,
      clockedIn,
      clockedOut,
      lateArrivals,
      onLeave,
      notClockedIn,
      pendingRegularizations,
    };
  },
};
