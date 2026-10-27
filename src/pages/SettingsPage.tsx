import React, { useState } from 'react';
import {
  User,
  ShieldCheck,
  Download,
  RotateCcw,
  Sliders,
  CheckCircle2,
  FolderKanban,
  FileText,
  Paperclip,
  Clock,
  Sparkles,
  Save,
} from 'lucide-react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { localDB } from '../services/localStore';

interface WorkspacePreferences {
  defaultPriority: 'low' | 'medium' | 'high' | 'urgent';
  defaultView: 'board' | 'overview';
  cardDensity: 'comfortable' | 'compact';
  showNotesPreview: boolean;
  enableSoundEffects: boolean;
}

const PREF_STORAGE_KEY = 'kanso_user_preferences';

export const SettingsPage: React.FC = () => {
  const currentUser = localDB.getCurrentUser() || {
    name: 'Bob Official',
    email: 'boboffical54@gmail.com',
  };

  const projects = localDB.getProjects();
  const tickets = localDB.getTickets();
  const attachments = localDB.getAttachments();

  const [preferences, setPreferences] = useState<WorkspacePreferences>(() => {
    try {
      const saved = localStorage.getItem(PREF_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      // Fallback
    }
    return {
      defaultPriority: 'medium',
      defaultView: 'board',
      cardDensity: 'comfortable',
      showNotesPreview: true,
      enableSoundEffects: false,
    };
  });

  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [saveToast, setSaveToast] = useState(false);

  const handlePreferenceChange = <K extends keyof WorkspacePreferences>(
    key: K,
    value: WorkspacePreferences[K]
  ) => {
    const updated = { ...preferences, [key]: value };
    setPreferences(updated);
    try {
      localStorage.setItem(PREF_STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to save preferences:', e);
    }
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 2000);
  };

  const handleExportDataBackup = () => {
    const backup = {
      users: localDB.getCurrentUser(),
      projects: localDB.getProjects(),
      tickets: localDB.getTickets(),
      attachments: localDB.getAttachments(),
      preferences,
      exportedAt: new Date().toISOString(),
      version: '1.2.0',
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `kanso_workspace_backup_${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleResetDatabase = () => {
    localDB.resetDatabase();
    setIsResetConfirmOpen(false);
    window.location.reload();
  };

  return (
    <div className="space-y-6 max-w-4xl pb-12">
      {/* Page Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Workspace Settings</h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          Manage your personal workspace preferences, Kanban display behavior, and data backups.
        </p>
      </div>

      {/* Save Toast Notification */}
      {saveToast && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-semibold">Workspace preferences saved successfully.</span>
        </div>
      )}

      {/* Profile & Account Information Card */}
      <Card className="p-6 bg-white space-y-4 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-sm">
            {currentUser.name.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900">Personal Workspace Profile</h2>
            <p className="text-xs text-slate-500">Your single-user personal workspace credentials.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs pt-4 border-t border-slate-100">
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/70">
            <span className="text-slate-400 block text-[11px] mb-1 font-medium">Workspace Owner</span>
            <span className="font-bold text-slate-800 text-sm">{currentUser.name}</span>
          </div>

          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/70">
            <span className="text-slate-400 block text-[11px] mb-1 font-medium">Contact Email</span>
            <span className="font-mono font-medium text-slate-700 text-xs break-all">{currentUser.email}</span>
          </div>

          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/70">
            <span className="text-slate-400 block text-[11px] mb-1 font-medium">Workspace Environment</span>
            <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-700">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Active & Synced
            </span>
          </div>
        </div>
      </Card>

      {/* Kanban & Workflow Preferences */}
      <Card className="p-6 bg-white space-y-5 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-100">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900">Kanban Board & Workflow Preferences</h2>
            <p className="text-xs text-slate-500">
              Customize how tickets are displayed and managed across the 4-stage pipeline.
            </p>
          </div>
        </div>

        <div className="space-y-4 pt-3 border-t border-slate-100 text-xs">
          {/* Default Ticket Priority */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
            <div>
              <span className="font-semibold text-slate-800 text-xs block">Default Ticket Priority</span>
              <span className="text-[11px] text-slate-500">Preset priority applied when creating new tickets.</span>
            </div>
            <select
              value={preferences.defaultPriority}
              onChange={(e) => handlePreferenceChange('defaultPriority', e.target.value as any)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
            >
              <option value="low">Low Priority</option>
              <option value="medium">Medium Priority</option>
              <option value="high">High Priority</option>
              <option value="urgent">Urgent Priority</option>
            </select>
          </div>

          {/* Default Project View */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
            <div>
              <span className="font-semibold text-slate-800 text-xs block">Default Project View</span>
              <span className="text-[11px] text-slate-500">View shown upon navigating to a project.</span>
            </div>
            <select
              value={preferences.defaultView}
              onChange={(e) => handlePreferenceChange('defaultView', e.target.value as any)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
            >
              <option value="board">Kanban Columns Board</option>
              <option value="overview">Analytics & Overview</option>
            </select>
          </div>

          {/* Card Density */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
            <div>
              <span className="font-semibold text-slate-800 text-xs block">Kanban Card Density</span>
              <span className="text-[11px] text-slate-500">Adjust the vertical spacing and padding of cards.</span>
            </div>
            <select
              value={preferences.cardDensity}
              onChange={(e) => handlePreferenceChange('cardDensity', e.target.value as any)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
            >
              <option value="comfortable">Comfortable (Detailed)</option>
              <option value="compact">Compact (Dense)</option>
            </select>
          </div>

          {/* Notes Preview Toggle */}
          <div className="flex items-center justify-between gap-4 pt-1">
            <div>
              <span className="font-semibold text-slate-800 text-xs block">Show Personal Notes Badge</span>
              <span className="text-[11px] text-slate-500">
                Display a note badge on tickets that contain personal scratchpad memos.
              </span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={preferences.showNotesPreview}
                onChange={(e) => handlePreferenceChange('showNotesPreview', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-slate-900" />
            </label>
          </div>
        </div>
      </Card>

      {/* Workspace Storage Summary */}
      <Card className="p-6 bg-white space-y-4 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-slate-100 text-slate-800">
            <FolderKanban className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900">Workspace Storage Summary</h2>
            <p className="text-xs text-slate-500">Live inventory of personal workspace items.</p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-3 border-t border-slate-100">
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/70 text-center">
            <span className="text-[11px] text-slate-500 block mb-1">Projects</span>
            <span className="text-lg font-bold text-slate-900">{projects.length}</span>
          </div>

          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/70 text-center">
            <span className="text-[11px] text-slate-500 block mb-1">Total Tickets</span>
            <span className="text-lg font-bold text-slate-900">{tickets.length}</span>
          </div>

          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/70 text-center">
            <span className="text-[11px] text-slate-500 block mb-1">Uploaded Releases</span>
            <span className="text-lg font-bold text-purple-700">
              {tickets.filter((t) => t.status?.is_final).length}
            </span>
          </div>

          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/70 text-center">
            <span className="text-[11px] text-slate-500 block mb-1">Attachments</span>
            <span className="text-lg font-bold text-slate-900">{attachments.length}</span>
          </div>
        </div>
      </Card>

      {/* Data Backup & Reset */}
      <Card className="p-6 bg-white space-y-4 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-slate-100 text-slate-800">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900">Data Backup & Recovery</h2>
            <p className="text-xs text-slate-500">
              Export a standalone JSON backup of your projects and tickets, or reset to initial sample data.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between flex-wrap gap-3 pt-3 border-t border-slate-100">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleExportDataBackup}
            leftIcon={<Download className="w-3.5 h-3.5" />}
            className="text-xs font-semibold"
          >
            Export Complete Backup (.json)
          </Button>

          <Button
            type="button"
            variant="danger"
            size="sm"
            onClick={() => setIsResetConfirmOpen(true)}
            leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
            className="text-xs font-semibold"
          >
            Reset Workspace to Seed Data
          </Button>
        </div>
      </Card>

      {/* Confirm Reset Dialog */}
      <ConfirmDialog
        isOpen={isResetConfirmOpen}
        onClose={() => setIsResetConfirmOpen(false)}
        onConfirm={handleResetDatabase}
        title="Reset All Workspace Data"
        message="This will reset all projects, tickets, attachments, and history back to the initial sample state. All personal additions will be overwritten."
        confirmLabel="Reset Everything"
      />
    </div>
  );
};
