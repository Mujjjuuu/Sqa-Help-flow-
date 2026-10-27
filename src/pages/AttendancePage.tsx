import React, { useState, useEffect, useMemo } from 'react';
import {
  Clock,
  Calendar,
  Users,
  Search,
  Filter,
  Download,
  CheckCircle2,
  AlertCircle,
  LogIn,
  LogOut,
  ChevronRight,
  Crown,
  ShieldCheck,
  ShieldAlert,
  Briefcase,
  Coffee,
  CalendarDays,
  Check,
  X,
  Building2,
  Laptop,
  ArrowUpRight,
  TrendingUp,
  FileText,
  SlidersHorizontal,
  ChevronDown,
  Info,
  MapPin,
  Sparkles,
  Lock,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { attendanceService, getIsoDate } from '../services/attendanceService';
import { localDB, INITIAL_TEAM_USERS } from '../services/localStore';
import {
  User,
  UserRole,
  AttendanceRecord,
  AttendanceFilterState,
  AttendanceStatus,
} from '../types';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Modal } from '../components/Modal';

export const AttendancePage: React.FC = () => {
  const { user: authUser } = useAuth();

  // Active user (synced with localDB currentUser)
  const [currentUser, setCurrentUser] = useState<User>(() => {
    return localDB.getCurrentUser() || INITIAL_TEAM_USERS[0];
  });

  const [activeTab, setActiveTab] = useState<'my_attendance' | 'reports' | 'roles'>('my_attendance');
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null);
  const [summaryMetrics, setSummaryMetrics] = useState<{
    totalEmployees: number;
    clockedIn: number;
    clockedOut: number;
    lateArrivals: number;
    onLeave: number;
    notClockedIn: number;
    pendingRegularizations: number;
  }>({
    totalEmployees: 0,
    clockedIn: 0,
    clockedOut: 0,
    lateArrivals: 0,
    onLeave: 0,
    notClockedIn: 0,
    pendingRegularizations: 0,
  });

  // Current live time for clock
  const [currentTime, setCurrentTime] = useState(new Date());

  // Date preset for reports
  const [datePreset, setDatePreset] = useState<'all' | 'today' | 'week' | 'month'>('today');

  // Filter state for Reports tab
  const [filters, setFilters] = useState<AttendanceFilterState>({
    search: '',
    userId: '',
    role: '',
    status: '',
    department: '',
    dateFrom: getIsoDate(),
    dateTo: getIsoDate(),
  });

  // Modals state
  const [isPunchModalOpen, setIsPunchModalOpen] = useState(false);
  const [isPunchOutConfirmOpen, setIsPunchOutConfirmOpen] = useState(false);
  const [punchMode, setPunchMode] = useState<'office' | 'wfh'>('office');
  const [punchNotes, setPunchNotes] = useState('');

  // Regularization Modal
  const [isRegularizeModalOpen, setIsRegularizeModalOpen] = useState(false);
  const [selectedRecordForRegularize, setSelectedRecordForRegularize] = useState<AttendanceRecord | null>(null);
  const [regularizeReason, setRegularizeReason] = useState('');

  // Role Assignment Confirmation Modal
  const [roleModalUser, setRoleModalUser] = useState<User | null>(null);
  const [targetNewRole, setTargetNewRole] = useState<UserRole>('employee');
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);

  // Persona Switcher modal
  const [isPersonaModalOpen, setIsPersonaModalOpen] = useState(false);

  // Success toast message
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Live seconds ticker
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Sync date preset with filters
  const applyDatePreset = (preset: 'all' | 'today' | 'week' | 'month') => {
    setDatePreset(preset);
    const today = getIsoDate();
    const now = new Date();

    if (preset === 'today') {
      setFilters((prev) => ({ ...prev, dateFrom: today, dateTo: today }));
    } else if (preset === 'week') {
      const pastWeek = new Date(now.getTime() - 7 * 86400000);
      setFilters((prev) => ({ ...prev, dateFrom: pastWeek.toISOString().split('T')[0], dateTo: today }));
    } else if (preset === 'month') {
      const pastMonth = new Date(now.getTime() - 30 * 86400000);
      setFilters((prev) => ({ ...prev, dateFrom: pastMonth.toISOString().split('T')[0], dateTo: today }));
    } else {
      setFilters((prev) => ({ ...prev, dateFrom: '', dateTo: '' }));
    }
  };

  // Load workforce and attendance data
  const loadData = async () => {
    try {
      const users = await attendanceService.getWorkforceUsers();
      setAllUsers(users);

      const found = users.find((u) => u.id === currentUser.id);
      if (found) {
        setCurrentUser(found);
      }

      const records = await attendanceService.getAttendanceRecords(filters, currentUser);
      setAttendanceRecords(records);

      const today = await attendanceService.getTodayRecord(currentUser.id);
      setTodayRecord(today);

      const summary = await attendanceService.getTodaySummary();
      setSummaryMetrics(summary);
    } catch (e) {
      console.error('Error loading attendance data:', e);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentUser.id, currentUser.role, filters]);

  // Switch persona (for testing / experiencing RBAC directly)
  const handleSwitchPersona = (targetUser: User) => {
    localDB.setCurrentUser(targetUser);
    setCurrentUser(targetUser);
    setIsPersonaModalOpen(false);
    showToast(`Switched active session to: ${targetUser.name} (${formatRoleName(targetUser.role || 'employee')})`);
    if (targetUser.role === 'employee' && (activeTab === 'reports' || activeTab === 'roles')) {
      setActiveTab('my_attendance');
    }
  };

  // Punch In Handler
  const handleClockIn = async () => {
    try {
      const locLabel = punchMode === 'wfh' ? 'Remote / WFH' : 'Office';
      const fullNotes = `[${locLabel}]${punchNotes ? ` · ${punchNotes}` : ''}`;
      const rec = await attendanceService.clockIn(currentUser, fullNotes);
      setTodayRecord(rec);
      setIsPunchModalOpen(false);
      setPunchNotes('');
      showToast('Clocked in successfully. Have a productive shift!');
      await loadData();
    } catch (e: any) {
      alert(e.message || 'Error clocking in');
    }
  };

  // Punch Out Handler
  const handleClockOut = async () => {
    try {
      const rec = await attendanceService.clockOut(currentUser);
      setTodayRecord(rec);
      setIsPunchOutConfirmOpen(false);
      showToast('Clocked out successfully. Great work today!');
      await loadData();
    } catch (e: any) {
      alert(e.message || 'Error clocking out');
    }
  };

  // Request Regularization
  const handleRequestRegularization = async () => {
    if (!selectedRecordForRegularize || !regularizeReason.trim()) return;
    try {
      await attendanceService.requestRegularization(selectedRecordForRegularize.id, regularizeReason.trim());
      setIsRegularizeModalOpen(false);
      setRegularizeReason('');
      setSelectedRecordForRegularize(null);
      showToast('Regularization request submitted to Administrator for review.');
      await loadData();
    } catch (e: any) {
      alert(e.message || 'Error requesting regularization');
    }
  };

  // Resolve Regularization (Admin / Super Admin)
  const handleResolveRegularization = async (recordId: string, approved: boolean) => {
    try {
      await attendanceService.resolveRegularization(recordId, approved, currentUser);
      showToast(approved ? 'Regularization approved.' : 'Regularization rejected.');
      await loadData();
    } catch (e: any) {
      alert(e.message || 'Error resolving regularization');
    }
  };

  // Assign or revoke Admin access (Super Admin only)
  const handleConfirmRoleChange = async () => {
    if (!roleModalUser) return;
    try {
      await attendanceService.assignUserRole(roleModalUser.id, targetNewRole, currentUser);
      setIsRoleModalOpen(false);
      const actionLabel = targetNewRole === 'admin' ? 'granted Admin access to' : 'revoked Admin access from';
      showToast(`Successfully ${actionLabel} ${roleModalUser.name}.`);
      await loadData();
    } catch (e: any) {
      alert(e.message || 'Error updating user role');
    }
  };

  // Format elapsed time if clocked in
  const getElapsedSeconds = (checkInIso?: string | null) => {
    if (!checkInIso) return 0;
    const start = new Date(checkInIso).getTime();
    return Math.max(0, Math.floor((currentTime.getTime() - start) / 1000));
  };

  const elapsedSeconds = getElapsedSeconds(todayRecord?.check_in);
  const elapsedHours = Math.floor(elapsedSeconds / 3600);
  const elapsedMinutes = Math.floor((elapsedSeconds % 3600) / 60);
  const elapsedSecs = elapsedSeconds % 60;

  // Workday target: 9 hours = 32400 seconds
  const shiftProgressPercent = Math.min(100, Math.round((elapsedSeconds / 32400) * 100));

  // Export CSV
  const handleExportCSV = () => {
    if (attendanceRecords.length === 0) {
      alert('No attendance records available to export.');
      return;
    }

    const headers = [
      'Date',
      'Employee Name',
      'Email',
      'Role',
      'Department',
      'Shift',
      'Check In',
      'Check Out',
      'Duration (Minutes)',
      'Status',
      'Notes',
      'Regularization Status',
    ];

    const rows = attendanceRecords.map((r) => [
      r.date,
      `"${r.user_name || ''}"`,
      r.user_email || '',
      r.user_role || 'employee',
      r.department || 'Engineering',
      `${r.shift_start || '09:00'} - ${r.shift_end || '18:00'}`,
      r.check_in ? new Date(r.check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A',
      r.check_out ? new Date(r.check_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A',
      r.work_duration_minutes || 0,
      r.status,
      `"${r.notes || ''}"`,
      r.regularization_status || 'none',
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `attendance_report_${getIsoDate()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Attendance CSV exported successfully.');
  };

  function formatRoleName(role: UserRole) {
    if (role === 'super_admin') return 'Super Admin';
    if (role === 'admin') return 'Admin';
    return 'Employee';
  }

  // Clean unboxed status formatting
  function getStatusDotColor(status: AttendanceStatus) {
    switch (status) {
      case 'present':
        return 'bg-emerald-500';
      case 'late':
        return 'bg-amber-500';
      case 'half_day':
        return 'bg-violet-500';
      case 'on_leave':
        return 'bg-slate-400';
      case 'absent':
      default:
        return 'bg-rose-500';
    }
  }

  function getStatusLabel(status: AttendanceStatus) {
    switch (status) {
      case 'present':
        return 'Present';
      case 'late':
        return 'Late Arrival';
      case 'half_day':
        return 'Half Day';
      case 'on_leave':
        return 'On Leave';
      case 'absent':
      default:
        return 'Absent';
    }
  }

  const isSuperAdmin = currentUser.role === 'super_admin';
  const isAdmin = currentUser.role === 'admin' || isSuperAdmin;
  const isEmployee = currentUser.role === 'employee';

  // Personal metrics for current user
  const personalRecords = useMemo(() => {
    return attendanceRecords.filter((r) => r.user_id === currentUser.id);
  }, [attendanceRecords, currentUser.id]);

  const personalPresentDays = personalRecords.filter(
    (r) => r.status === 'present' || r.status === 'late'
  ).length;

  const personalLateDays = personalRecords.filter((r) => r.status === 'late').length;

  const personalTotalMinutes = personalRecords.reduce((acc, r) => acc + (r.work_duration_minutes || 0), 0);
  const personalTotalHoursStr = `${Math.floor(personalTotalMinutes / 60)}h ${personalTotalMinutes % 60}m`;

  const personalPendingRegularizations = personalRecords.filter(
    (r) => r.regularization_status === 'pending'
  ).length;

  return (
    <div className="space-y-6 pb-12 max-w-7xl mx-auto">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 bg-slate-900 text-white text-xs px-4 py-3 rounded-lg shadow-lg border border-slate-800 animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header & Session Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/80 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold text-slate-900 tracking-tight">
              Attendance & Workforce
            </h1>
            <span className="text-xs text-slate-400 font-normal">/</span>
            <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
              <span
                className={`w-2 h-2 rounded-full ${
                  isSuperAdmin ? 'bg-purple-600' : isAdmin ? 'bg-indigo-600' : 'bg-slate-400'
                }`}
              />
              <span>{formatRoleName(currentUser.role || 'employee')}</span>
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Track daily work shifts, inspect team attendance reports, and manage access permissions.
          </p>
        </div>

        {/* User Identity Switcher (Quick Persona Switch for Testing) */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-2.5 bg-white border border-slate-200/90 rounded-lg p-1.5 pl-3 shadow-2xs">
            <div className="text-right">
              <span className="text-xs font-semibold text-slate-900 block leading-tight">
                {currentUser.name}
              </span>
              <span className="text-[10px] text-slate-400 font-medium block">
                {currentUser.department || 'Engineering'}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setIsPersonaModalOpen(true)}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors cursor-pointer"
              title="Switch user role persona to test access levels"
            >
              <span>Switch User</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>
          </div>
        </div>
      </div>

      {/* Segmented Tab Navigation */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="inline-flex p-1 bg-slate-100 rounded-lg border border-slate-200/60">
          <button
            type="button"
            onClick={() => setActiveTab('my_attendance')}
            className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium rounded-md transition-all cursor-pointer ${
              activeTab === 'my_attendance'
                ? 'bg-white text-slate-900 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            <span>My Attendance</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('reports')}
            className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium rounded-md transition-all cursor-pointer ${
              activeTab === 'reports'
                ? 'bg-white text-slate-900 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-3.5 h-3.5 text-slate-500" />
            <span>Workforce Reports</span>
            {!isAdmin && <Lock className="w-3 h-3 text-slate-400 ml-0.5" />}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('roles')}
            className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium rounded-md transition-all cursor-pointer ${
              activeTab === 'roles'
                ? 'bg-white text-slate-900 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-slate-500" />
            <span>Workforce & Roles</span>
            {!isSuperAdmin && <Lock className="w-3 h-3 text-slate-400 ml-0.5" />}
          </button>
        </div>

        {/* Live Monospace Time Display */}
        <div className="flex items-center gap-2 text-xs text-slate-500 font-mono">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>
            {currentTime.toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            })}
          </span>
          <span className="text-slate-300">·</span>
          <span className="text-slate-600 font-sans font-medium">
            {currentTime.toLocaleDateString(undefined, {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
            })}
          </span>
        </div>
      </div>

      {/* TAB 1: MY ATTENDANCE */}
      {activeTab === 'my_attendance' && (
        <div className="space-y-6">
          {/* Main Shift Punch Banner */}
          <div className="bg-white border border-slate-200/90 rounded-xl p-6 shadow-2xs">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              {/* Left Details */}
              <div className="space-y-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-3 h-3 rounded-full bg-slate-900 flex items-center justify-center">
                    <span className="w-1.5 h-1.5 rounded-full bg-white" />
                  </div>
                  <h2 className="text-base font-semibold text-slate-900 tracking-tight">
                    Today's Work Shift
                  </h2>
                  <span className="text-xs text-slate-400">·</span>
                  <span className="text-xs text-slate-500 font-medium">
                    Scheduled: 09:00 — 18:00 (15 min grace)
                  </span>
                </div>

                <div className="flex items-baseline gap-4 flex-wrap">
                  {todayRecord?.check_in ? (
                    todayRecord.check_out ? (
                      <div>
                        <span className="text-2xl font-bold font-mono text-slate-900">
                          {Math.floor(todayRecord.work_duration_minutes / 60)}h{' '}
                          {todayRecord.work_duration_minutes % 60}m
                        </span>
                        <span className="text-xs text-slate-500 ml-2">Total shift logged</span>
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-3xl font-extrabold font-mono text-slate-900 tracking-tight">
                            {String(elapsedHours).padStart(2, '0')}:
                            {String(elapsedMinutes).padStart(2, '0')}:
                            {String(elapsedSecs).padStart(2, '0')}
                          </span>
                          <span className="text-xs font-semibold text-emerald-600">Active</span>
                        </div>
                        <span className="text-xs text-slate-500">
                          Punch in at{' '}
                          {new Date(todayRecord.check_in).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    )
                  ) : (
                    <div>
                      <span className="text-2xl font-bold text-slate-900">Not Clocked In</span>
                      <span className="text-xs text-slate-500 block mt-0.5">
                        Please record your punch to begin tracking today's work hours.
                      </span>
                    </div>
                  )}
                </div>

                {/* Progress bar towards 9-hour workday */}
                {todayRecord?.check_in && !todayRecord.check_out && (
                  <div className="space-y-1.5 max-w-md pt-1">
                    <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
                      <span>Workday Goal: 9h</span>
                      <span>{shiftProgressPercent}% completed</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-slate-900 transition-all duration-500 rounded-full"
                        style={{ width: `${shiftProgressPercent}%` }}
                      />
                    </div>
                  </div>
                )}

                {todayRecord?.notes && (
                  <p className="text-xs text-slate-600 pt-1">
                    <span className="font-medium text-slate-700">Note:</span> {todayRecord.notes}
                  </p>
                )}
              </div>

              {/* Right Action Buttons */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
                {!todayRecord?.check_in ? (
                  <Button
                    variant="primary"
                    onClick={() => setIsPunchModalOpen(true)}
                    className="px-5 py-2.5 text-xs font-semibold shadow-xs"
                    leftIcon={<LogIn className="w-4 h-4" />}
                  >
                    Clock In for Today
                  </Button>
                ) : !todayRecord.check_out ? (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setIsPunchOutConfirmOpen(true)}
                      className="px-4 py-2 text-xs font-semibold text-rose-600 hover:text-rose-700 border-rose-200 hover:bg-rose-50"
                      leftIcon={<LogOut className="w-4 h-4" />}
                    >
                      Clock Out
                    </Button>
                  </div>
                ) : (
                  <div className="text-right sm:text-right p-3 rounded-lg bg-slate-50 border border-slate-200/60">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Shift Finished</span>
                    </div>
                    <span className="text-[11px] text-slate-500 block mt-0.5">
                      Punched out at{' '}
                      {new Date(todayRecord.check_out).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                )}

                {todayRecord?.status === 'late' && !todayRecord.regularization_requested && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedRecordForRegularize(todayRecord);
                      setIsRegularizeModalOpen(true);
                    }}
                    className="text-xs text-amber-700 border-amber-300 hover:bg-amber-50"
                  >
                    Request Regularization
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Personal Stats Row (Clean typographic cards) */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-2xs">
              <span className="text-xs text-slate-500 font-medium block">Present Days</span>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-2xl font-bold text-slate-900">{personalPresentDays}</span>
                <span className="text-xs text-slate-400">shifts</span>
              </div>
              <span className="text-[11px] text-slate-400 block mt-1">Last 30-day window</span>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-2xs">
              <span className="text-xs text-slate-500 font-medium block">Total Hours Logged</span>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-2xl font-bold text-slate-900">{personalTotalHoursStr}</span>
              </div>
              <span className="text-[11px] text-slate-400 block mt-1">Average ~9h / day</span>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-2xs">
              <span className="text-xs text-slate-500 font-medium block">Late Arrivals</span>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-2xl font-bold text-amber-600">{personalLateDays}</span>
                <span className="text-xs text-slate-400">occurrences</span>
              </div>
              <span className="text-[11px] text-slate-400 block mt-1">After 09:15 AM threshold</span>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-2xs">
              <span className="text-xs text-slate-500 font-medium block">Pending Regularizations</span>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-2xl font-bold text-slate-900">{personalPendingRegularizations}</span>
                <span className="text-xs text-slate-400">requests</span>
              </div>
              <span className="text-[11px] text-slate-400 block mt-1">Under admin review</span>
            </div>
          </div>

          {/* Personal History Table */}
          <div className="bg-white border border-slate-200/90 rounded-xl overflow-hidden shadow-2xs">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between flex-wrap gap-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Attendance History</h3>
                <p className="text-xs text-slate-500">
                  Your daily attendance timestamps, durations, and regularization records.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportCSV}
                  className="text-xs"
                  leftIcon={<Download className="w-3.5 h-3.5" />}
                >
                  Export Log
                </Button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-[11px] font-semibold text-slate-500 border-b border-slate-200/70">
                  <tr>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Scheduled Shift</th>
                    <th className="py-3 px-4">Check In</th>
                    <th className="py-3 px-4">Check Out</th>
                    <th className="py-3 px-4">Duration</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Notes / Regularization</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {personalRecords.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400">
                        No attendance records recorded yet.
                      </td>
                    </tr>
                  ) : (
                    personalRecords.map((record) => {
                      const isTodayRecord = record.date === getIsoDate();
                      const dotColor = getStatusDotColor(record.status);
                      const statusLabel = getStatusLabel(record.status);

                      return (
                        <tr key={record.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-3 px-4 font-medium text-slate-900 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <span>{record.date}</span>
                              {isTodayRecord && (
                                <span className="text-[10px] font-medium text-indigo-600 bg-indigo-50 px-1.5 py-0.2 rounded">
                                  Today
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                            {record.shift_start || '09:00'} — {record.shift_end || '18:00'}
                          </td>

                          <td className="py-3 px-4 font-mono font-medium text-slate-800 whitespace-nowrap">
                            {record.check_in
                              ? new Date(record.check_in).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })
                              : '—'}
                          </td>

                          <td className="py-3 px-4 font-mono font-medium text-slate-800 whitespace-nowrap">
                            {record.check_out
                              ? new Date(record.check_out).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })
                              : record.check_in && isTodayRecord
                              ? 'Active'
                              : '—'}
                          </td>

                          <td className="py-3 px-4 font-medium text-slate-800 whitespace-nowrap">
                            {record.work_duration_minutes > 0
                              ? `${Math.floor(record.work_duration_minutes / 60)}h ${
                                  record.work_duration_minutes % 60
                                }m`
                              : isTodayRecord && record.check_in && !record.check_out
                              ? `${elapsedHours}h ${elapsedMinutes}m`
                              : '0m'}
                          </td>

                          <td className="py-3 px-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <span className={`w-2 h-2 rounded-full ${dotColor}`} />
                              <span className="font-medium text-slate-700">{statusLabel}</span>
                            </div>
                          </td>

                          <td className="py-3 px-4 max-w-xs">
                            {record.regularization_requested ? (
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span
                                  className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                                    record.regularization_status === 'approved'
                                      ? 'bg-emerald-50 text-emerald-700'
                                      : record.regularization_status === 'rejected'
                                      ? 'bg-rose-50 text-rose-700'
                                      : 'bg-amber-50 text-amber-700'
                                  }`}
                                >
                                  {record.regularization_status || 'pending'}
                                </span>
                                <span className="text-[11px] text-slate-500 truncate">
                                  {record.regularization_reason}
                                </span>
                              </div>
                            ) : record.notes ? (
                              <span className="text-[11px] text-slate-500 truncate block">
                                {record.notes}
                              </span>
                            ) : (
                              <span className="text-slate-300">—</span>
                            )}
                          </td>

                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            {record.status === 'late' && !record.regularization_requested && (
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedRecordForRegularize(record);
                                  setIsRegularizeModalOpen(true);
                                }}
                                className="text-xs text-indigo-600 hover:text-indigo-800 font-medium cursor-pointer"
                              >
                                Regularize
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: WORKFORCE ATTENDANCE REPORTS (Admin & Super Admin) */}
      {activeTab === 'reports' && (
        <div className="space-y-6">
          {!isAdmin ? (
            /* Restricted Access State */
            <div className="bg-white border border-slate-200/90 rounded-xl p-10 text-center max-w-md mx-auto shadow-2xs">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 mx-auto mb-4">
                <Lock className="w-6 h-6" />
              </div>
              <h3 className="text-base font-semibold text-slate-900 mb-1">
                Admin Access Required
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed mb-5">
                Workforce attendance reports and team oversight metrics are accessible to Administrators and the Super
                Admin.
              </p>
              <div className="flex flex-col gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    const adminUser = allUsers.find((u) => u.role === 'admin') || allUsers[0];
                    handleSwitchPersona(adminUser);
                  }}
                  leftIcon={<ShieldCheck className="w-4 h-4" />}
                >
                  Switch to Admin (Mujtaba Bilal)
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setActiveTab('my_attendance')}
                  className="text-xs text-slate-500"
                >
                  Back to My Attendance
                </Button>
              </div>
            </div>
          ) : (
            <>
              {/* Executive KPI Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-2xs">
                  <span className="text-[11px] font-medium text-slate-500 block">Total Workforce</span>
                  <span className="text-2xl font-bold text-slate-900 mt-1 block">
                    {summaryMetrics.totalEmployees}
                  </span>
                  <span className="text-[10px] text-slate-400">Team members</span>
                </div>

                <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-2xs">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="text-[11px] font-medium text-slate-500 block">Clocked In</span>
                  </div>
                  <span className="text-2xl font-bold text-slate-900 mt-1 block">
                    {summaryMetrics.clockedIn}
                  </span>
                  <span className="text-[10px] text-emerald-600 font-medium">Active now</span>
                </div>

                <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-2xs">
                  <span className="text-[11px] font-medium text-slate-500 block">Clocked Out</span>
                  <span className="text-2xl font-bold text-slate-900 mt-1 block">
                    {summaryMetrics.clockedOut}
                  </span>
                  <span className="text-[10px] text-slate-400">Shift finished</span>
                </div>

                <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-2xs">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    <span className="text-[11px] font-medium text-slate-500 block">Late Arrivals</span>
                  </div>
                  <span className="text-2xl font-bold text-amber-600 mt-1 block">
                    {summaryMetrics.lateArrivals}
                  </span>
                  <span className="text-[10px] text-slate-400">After 09:15</span>
                </div>

                <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-2xs">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-slate-400" />
                    <span className="text-[11px] font-medium text-slate-500 block">On Leave</span>
                  </div>
                  <span className="text-2xl font-bold text-slate-900 mt-1 block">
                    {summaryMetrics.onLeave}
                  </span>
                  <span className="text-[10px] text-slate-400">Approved leave</span>
                </div>

                <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-2xs">
                  <span className="text-[11px] font-medium text-slate-500 block">Pending Reviews</span>
                  <span className="text-2xl font-bold text-indigo-600 mt-1 block">
                    {summaryMetrics.pendingRegularizations}
                  </span>
                  <span className="text-[10px] text-indigo-600 font-medium">Regularizations</span>
                </div>
              </div>

              {/* Filtering Controls */}
              <div className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-2xs space-y-3">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  {/* Search Bar */}
                  <div className="relative flex-1 max-w-sm">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search employee, email, notes..."
                      value={filters.search || ''}
                      onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-800"
                    />
                  </div>

                  {/* Date Presets Segmented Buttons */}
                  <div className="inline-flex p-1 bg-slate-100 rounded-lg border border-slate-200/60 shrink-0">
                    <button
                      type="button"
                      onClick={() => applyDatePreset('today')}
                      className={`px-3 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                        datePreset === 'today'
                          ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Today
                    </button>
                    <button
                      type="button"
                      onClick={() => applyDatePreset('week')}
                      className={`px-3 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                        datePreset === 'week'
                          ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Last 7 Days
                    </button>
                    <button
                      type="button"
                      onClick={() => applyDatePreset('month')}
                      className={`px-3 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                        datePreset === 'month'
                          ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      30 Days
                    </button>
                    <button
                      type="button"
                      onClick={() => applyDatePreset('all')}
                      className={`px-3 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                        datePreset === 'all'
                          ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      All Records
                    </button>
                  </div>
                </div>

                {/* Sub-Filters: Employee, Role, Status, Department */}
                <div className="flex items-center gap-2 flex-wrap pt-1 border-t border-slate-100">
                  <select
                    value={filters.userId || ''}
                    onChange={(e) => setFilters({ ...filters, userId: e.target.value })}
                    className="text-xs bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1.5 text-slate-700"
                  >
                    <option value="">All Employees</option>
                    {allUsers.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </select>

                  <select
                    value={filters.role || ''}
                    onChange={(e) => setFilters({ ...filters, role: e.target.value })}
                    className="text-xs bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1.5 text-slate-700"
                  >
                    <option value="">All Roles</option>
                    <option value="super_admin">Super Admin</option>
                    <option value="admin">Admin</option>
                    <option value="employee">Employee</option>
                  </select>

                  <select
                    value={filters.status || ''}
                    onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                    className="text-xs bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1.5 text-slate-700"
                  >
                    <option value="">All Statuses</option>
                    <option value="present">Present</option>
                    <option value="late">Late Arrival</option>
                    <option value="half_day">Half Day</option>
                    <option value="on_leave">On Leave</option>
                  </select>

                  <select
                    value={filters.department || ''}
                    onChange={(e) => setFilters({ ...filters, department: e.target.value })}
                    className="text-xs bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1.5 text-slate-700"
                  >
                    <option value="">All Departments</option>
                    <option value="Leadership & Product">Leadership</option>
                    <option value="Quality Assurance">Quality Assurance</option>
                    <option value="Frontend Engineering">Frontend</option>
                    <option value="Backend Infrastructure">Backend</option>
                    <option value="Product Design">Design</option>
                    <option value="Mobile Development">Mobile</option>
                  </select>

                  {(filters.search || filters.userId || filters.role || filters.status || filters.department) && (
                    <button
                      type="button"
                      onClick={() =>
                        setFilters({
                          search: '',
                          userId: '',
                          role: '',
                          status: '',
                          department: '',
                          dateFrom: filters.dateFrom,
                          dateTo: filters.dateTo,
                        })
                      }
                      className="text-xs text-rose-600 hover:text-rose-700 font-medium px-2 py-1 cursor-pointer"
                    >
                      Clear
                    </button>
                  )}

                  <div className="ml-auto">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleExportCSV}
                      className="text-xs"
                      leftIcon={<Download className="w-3.5 h-3.5" />}
                    >
                      Export CSV
                    </Button>
                  </div>
                </div>
              </div>

              {/* Master Workforce Table */}
              <div className="bg-white border border-slate-200/90 rounded-xl overflow-hidden shadow-2xs">
                <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">Workforce Registry</h3>
                    <p className="text-xs text-slate-500">
                      Showing {attendanceRecords.length} records matching current filter scope.
                    </p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-700">
                    <thead className="bg-slate-50 text-[11px] font-semibold text-slate-500 border-b border-slate-200/70">
                      <tr>
                        <th className="py-3 px-4">Employee</th>
                        <th className="py-3 px-4">Role & Dept</th>
                        <th className="py-3 px-4">Date</th>
                        <th className="py-3 px-4">Check In</th>
                        <th className="py-3 px-4">Check Out</th>
                        <th className="py-3 px-4">Duration</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4">Review Regularization</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {attendanceRecords.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-8 text-center text-slate-400">
                            No attendance records match the selected criteria.
                          </td>
                        </tr>
                      ) : (
                        attendanceRecords.map((record) => {
                          const dotColor = getStatusDotColor(record.status);
                          const statusLabel = getStatusLabel(record.status);

                          return (
                            <tr key={record.id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="py-3 px-4 whitespace-nowrap">
                                <div className="flex items-center gap-2.5">
                                  {record.user_avatar ? (
                                    <img
                                      src={record.user_avatar}
                                      alt={record.user_name}
                                      className="w-7 h-7 rounded-full object-cover border border-slate-200"
                                    />
                                  ) : (
                                    <div className="w-7 h-7 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs shrink-0">
                                      {(record.user_name || 'U')[0]}
                                    </div>
                                  )}
                                  <div>
                                    <span className="font-medium text-slate-900 block leading-tight">
                                      {record.user_name}
                                    </span>
                                    <span className="text-[10px] text-slate-400">{record.user_email}</span>
                                  </div>
                                </div>
                              </td>

                              <td className="py-3 px-4 whitespace-nowrap">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-medium text-slate-800">
                                    {formatRoleName(record.user_role || 'employee')}
                                  </span>
                                  <span className="text-slate-300">·</span>
                                  <span className="text-slate-500">{record.department || 'Engineering'}</span>
                                </div>
                              </td>

                              <td className="py-3 px-4 font-medium text-slate-800 whitespace-nowrap">
                                {record.date}
                              </td>

                              <td className="py-3 px-4 font-mono font-medium text-slate-800 whitespace-nowrap">
                                {record.check_in
                                  ? new Date(record.check_in).toLocaleTimeString([], {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })
                                  : '—'}
                              </td>

                              <td className="py-3 px-4 font-mono font-medium text-slate-800 whitespace-nowrap">
                                {record.check_out
                                  ? new Date(record.check_out).toLocaleTimeString([], {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })
                                  : '—'}
                              </td>

                              <td className="py-3 px-4 font-medium text-slate-800 whitespace-nowrap">
                                {record.work_duration_minutes > 0
                                  ? `${Math.floor(record.work_duration_minutes / 60)}h ${
                                      record.work_duration_minutes % 60
                                    }m`
                                  : '0m'}
                              </td>

                              <td className="py-3 px-4 whitespace-nowrap">
                                <div className="flex items-center gap-2">
                                  <span className={`w-2 h-2 rounded-full ${dotColor}`} />
                                  <span className="font-medium text-slate-700">{statusLabel}</span>
                                </div>
                              </td>

                              <td className="py-3 px-4">
                                {record.regularization_requested && record.regularization_status === 'pending' ? (
                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => handleResolveRegularization(record.id, true)}
                                      className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 text-xs font-semibold cursor-pointer"
                                      title="Approve regularization"
                                    >
                                      Approve
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleResolveRegularization(record.id, false)}
                                      className="px-2 py-0.5 rounded bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 text-xs font-semibold cursor-pointer"
                                      title="Reject regularization"
                                    >
                                      Reject
                                    </button>
                                    <span className="text-[11px] text-slate-500 italic truncate max-w-[140px]">
                                      {record.regularization_reason}
                                    </span>
                                  </div>
                                ) : record.regularization_status ? (
                                  <span
                                    className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                                      record.regularization_status === 'approved'
                                        ? 'bg-emerald-50 text-emerald-700'
                                        : 'bg-rose-50 text-rose-700'
                                    }`}
                                  >
                                    Regularization: {record.regularization_status}
                                  </span>
                                ) : (
                                  <span className="text-slate-300">—</span>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* TAB 3: WORKFORCE & ADMIN ACCESS (Super Admin Exclusive) */}
      {activeTab === 'roles' && (
        <div className="space-y-6">
          {/* Super Admin Workspace Authority Banner */}
          <div className="bg-white border border-slate-200/90 rounded-xl p-6 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Crown className="w-4 h-4 text-purple-600" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-purple-700">
                    Authority Architecture
                  </span>
                </div>
                <h2 className="text-base font-semibold text-slate-900">
                  Workforce Role Management & Admin Access
                </h2>
                <p className="text-xs text-slate-500 max-w-xl mt-1 leading-relaxed">
                  Rule: Exactly 1 single user holds Super Admin authority. Only the Super Admin can grant or revoke
                  Admin access for team members. Admins can view workforce-wide reports; employees have personal access.
                </p>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-lg shrink-0">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                  Current Super Admin
                </span>
                <span className="text-sm font-bold text-slate-900 block mt-0.5">
                  {allUsers.find((u) => u.role === 'super_admin')?.name || 'Bob Official'}
                </span>
                <span className="text-[11px] text-purple-700 font-medium">Permanent Authority</span>
              </div>
            </div>
          </div>

          {!isSuperAdmin && (
            <div className="p-3.5 bg-amber-50/70 border border-amber-200/80 rounded-lg text-xs text-amber-800 flex items-center gap-2.5">
              <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                You are currently viewing as <strong>{currentUser.name}</strong> ({formatRoleName(currentUser.role || 'employee')}). Role assignment
                controls are locked. Only the workspace Super Admin can assign or revoke Admin access.
              </span>
            </div>
          )}

          {/* Workforce Directory & Role Controls */}
          <div className="bg-white border border-slate-200/90 rounded-xl overflow-hidden shadow-2xs">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Team Directory & Permissions</h3>
                <p className="text-xs text-slate-500">
                  Assign admin permissions to team members to empower them to review attendance reports.
                </p>
              </div>
            </div>

            <div className="divide-y divide-slate-100">
              {allUsers.map((user) => {
                const isSuper = user.role === 'super_admin';
                const isUserAdmin = user.role === 'admin';

                return (
                  <div
                    key={user.id}
                    className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {user.avatar_url ? (
                        <img
                          src={user.avatar_url}
                          alt={user.name}
                          className="w-10 h-10 rounded-full object-cover border border-slate-200"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-sm shrink-0">
                          {(user.name || 'U')[0]}
                        </div>
                      )}

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-slate-900">{user.name}</span>
                          <span className="text-slate-300">·</span>
                          <span className="text-xs text-slate-500 font-medium">
                            {formatRoleName(user.role || 'employee')}
                          </span>
                        </div>
                        <span className="text-xs text-slate-400 block">{user.email}</span>
                        <span className="text-[11px] text-slate-500 font-medium mt-0.5 block">
                          Department: {user.department || 'Engineering'}
                        </span>
                      </div>
                    </div>

                    {/* Permissions summary & Action Button */}
                    <div className="flex items-center gap-3 self-end sm:self-center">
                      <div className="text-right hidden md:block">
                        <span className="text-[10px] text-slate-400 block uppercase font-medium">
                          Permissions
                        </span>
                        <span className="text-xs text-slate-600 font-medium">
                          {isSuper
                            ? 'Full Governance & Role Assignment'
                            : isUserAdmin
                            ? 'Workforce Reports & Regularizations'
                            : 'Personal Attendance Portal Only'}
                        </span>
                      </div>

                      {isSuper ? (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-50 text-purple-700 text-xs font-semibold border border-purple-200/60">
                          <Crown className="w-3.5 h-3.5" />
                          <span>Super Admin</span>
                        </div>
                      ) : (
                        <div>
                          {isUserAdmin ? (
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={!isSuperAdmin}
                              onClick={() => {
                                setRoleModalUser(user);
                                setTargetNewRole('employee');
                                setIsRoleModalOpen(true);
                              }}
                              className="text-xs text-rose-700 border-rose-200 hover:bg-rose-50"
                            >
                              Revoke Admin Access
                            </Button>
                          ) : (
                            <Button
                              variant="primary"
                              size="sm"
                              disabled={!isSuperAdmin}
                              onClick={() => {
                                setRoleModalUser(user);
                                setTargetNewRole('admin');
                                setIsRoleModalOpen(true);
                              }}
                              className="text-xs"
                              leftIcon={<ShieldCheck className="w-3.5 h-3.5" />}
                            >
                              Assign Admin Access
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: Punch In */}
      <Modal
        isOpen={isPunchModalOpen}
        onClose={() => setIsPunchModalOpen(false)}
        title="Clock In for Today's Shift"
      >
        <div className="space-y-4 pt-1">
          <p className="text-xs text-slate-600">
            Confirm your attendance punch for <strong>{currentUser.name}</strong>. The system records your timestamp
            and shift hours.
          </p>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Work Location</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPunchMode('office')}
                className={`flex items-center justify-center gap-2 p-2.5 rounded-lg border text-xs font-medium cursor-pointer transition-all ${
                  punchMode === 'office'
                    ? 'bg-slate-900 border-slate-900 text-white font-semibold'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Building2 className="w-4 h-4" />
                Office Punch
              </button>

              <button
                type="button"
                onClick={() => setPunchMode('wfh')}
                className={`flex items-center justify-center gap-2 p-2.5 rounded-lg border text-xs font-medium cursor-pointer transition-all ${
                  punchMode === 'wfh'
                    ? 'bg-slate-900 border-slate-900 text-white font-semibold'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Laptop className="w-4 h-4" />
                Remote / WFH
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Optional Notes</label>
            <input
              type="text"
              placeholder="e.g. Sprint planning / client review meeting"
              value={punchNotes}
              onChange={(e) => setPunchNotes(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-800"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button variant="ghost" size="sm" onClick={() => setIsPunchModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleClockIn} leftIcon={<LogIn className="w-3.5 h-3.5" />}>
              Confirm Clock In
            </Button>
          </div>
        </div>
      </Modal>

      {/* MODAL 2: Punch Out Confirmation */}
      <Modal
        isOpen={isPunchOutConfirmOpen}
        onClose={() => setIsPunchOutConfirmOpen(false)}
        title="Clock Out Confirmation"
      >
        <div className="space-y-4 pt-1">
          <p className="text-xs text-slate-600">
            Are you sure you want to end your shift for today? Total elapsed time will be logged in your attendance
            history.
          </p>

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-500">Employee:</span>
              <span className="font-semibold text-slate-800">{currentUser.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Clocked In:</span>
              <span className="font-mono text-slate-800">
                {todayRecord?.check_in
                  ? new Date(todayRecord.check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  : '—'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Current Work Duration:</span>
              <span className="font-bold text-slate-900">
                {elapsedHours}h {elapsedMinutes}m
              </span>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button variant="ghost" size="sm" onClick={() => setIsPunchOutConfirmOpen(false)}>
              Keep Working
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={handleClockOut}
              className="bg-rose-600 hover:bg-rose-700 text-white"
              leftIcon={<LogOut className="w-3.5 h-3.5" />}
            >
              Confirm Clock Out
            </Button>
          </div>
        </div>
      </Modal>

      {/* MODAL 3: Request Regularization */}
      <Modal
        isOpen={isRegularizeModalOpen}
        onClose={() => setIsRegularizeModalOpen(false)}
        title="Request Attendance Regularization"
      >
        <div className="space-y-4 pt-1">
          <p className="text-xs text-slate-600">
            Submit an attendance regularization request for review by an Administrator or Super Admin.
          </p>

          {selectedRecordForRegularize && (
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Date:</span>
                <span className="font-semibold text-slate-800">{selectedRecordForRegularize.date}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Recorded Status:</span>
                <span className="font-semibold text-amber-600">
                  {getStatusLabel(selectedRecordForRegularize.status)}
                </span>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Reason for Regularization</label>
            <textarea
              rows={3}
              placeholder="e.g. Transit delay of 30 mins on route 4 / Client meeting on-site / System login issue"
              value={regularizeReason}
              onChange={(e) => setRegularizeReason(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-800"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button variant="ghost" size="sm" onClick={() => setIsRegularizeModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleRequestRegularization}
              disabled={!regularizeReason.trim()}
            >
              Submit for Admin Review
            </Button>
          </div>
        </div>
      </Modal>

      {/* MODAL 4: Super Admin Role Assignment Confirmation */}
      <Modal
        isOpen={isRoleModalOpen}
        onClose={() => setIsRoleModalOpen(false)}
        title={targetNewRole === 'admin' ? 'Assign Admin Access' : 'Revoke Admin Access'}
      >
        <div className="space-y-4 pt-1">
          <p className="text-xs text-slate-600">
            {targetNewRole === 'admin'
              ? `Are you sure you want to grant Administrator access to ${roleModalUser?.name}? They will gain permissions to inspect all workforce attendance reports and resolve regularizations.`
              : `Are you sure you want to revoke Administrator access from ${roleModalUser?.name}? They will return to standard Employee status with personal portal access.`}
          </p>

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-500">Target User:</span>
              <span className="font-semibold text-slate-800">{roleModalUser?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Email:</span>
              <span className="text-slate-600">{roleModalUser?.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">New Role:</span>
              <span
                className={`font-bold ${
                  targetNewRole === 'admin' ? 'text-indigo-600' : 'text-slate-700'
                }`}
              >
                {formatRoleName(targetNewRole)}
              </span>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button variant="ghost" size="sm" onClick={() => setIsRoleModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant={targetNewRole === 'admin' ? 'primary' : 'danger'}
              size="sm"
              onClick={handleConfirmRoleChange}
            >
              {targetNewRole === 'admin' ? 'Grant Admin Access' : 'Revoke Admin Access'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* MODAL 5: Interactive Persona Switcher Dialog */}
      <Modal
        isOpen={isPersonaModalOpen}
        onClose={() => setIsPersonaModalOpen(false)}
        title="Switch User Persona"
      >
        <div className="space-y-3 pt-1">
          <p className="text-xs text-slate-500">
            Select a team member to immediately experience the attendance portal with their assigned permissions.
          </p>

          <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden">
            {allUsers.map((u) => {
              const isSelected = u.id === currentUser.id;
              const roleTitle = formatRoleName(u.role || 'employee');

              return (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => handleSwitchPersona(u)}
                  className={`w-full text-left p-3 flex items-center justify-between gap-3 transition-colors cursor-pointer ${
                    isSelected ? 'bg-slate-50' : 'hover:bg-slate-50/60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {u.avatar_url ? (
                      <img
                        src={u.avatar_url}
                        alt={u.name}
                        className="w-8 h-8 rounded-full object-cover border border-slate-200"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs shrink-0">
                        {(u.name || 'U')[0]}
                      </div>
                    )}

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-slate-900">{u.name}</span>
                        {u.role === 'super_admin' && (
                          <span className="text-[10px] font-semibold text-purple-700 bg-purple-50 px-1.5 py-0.2 rounded">
                            Super Admin
                          </span>
                        )}
                        {u.role === 'admin' && (
                          <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-50 px-1.5 py-0.2 rounded">
                            Admin
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-400 block">{u.department || 'Engineering'}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {isSelected ? (
                      <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                        <Check className="w-4 h-4" /> Active
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400 font-medium">Select</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="flex justify-end pt-2">
            <Button variant="ghost" size="sm" onClick={() => setIsPersonaModalOpen(false)}>
              Close
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
