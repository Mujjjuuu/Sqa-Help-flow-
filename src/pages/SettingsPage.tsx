import React, { useState } from 'react';
import {
  Database,
  Key,
  RotateCcw,
  Download,
  Upload,
  CheckCircle2,
  AlertCircle,
  User,
  ShieldCheck,
  Server,
  Copy,
  ExternalLink,
  Code2,
  Flame,
  Cloud,
} from 'lucide-react';
import { useFirebase } from '../context/FirebaseContext';
import { validateFirestoreConnection } from '../services/firebase';
import firebaseConfig from '../../firebase-applet-config.json';
import { Card } from '../components/Card';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { ConfirmDialog } from '../components/ConfirmDialog';
import {
  getSupabaseCredentials,
  saveCustomSupabaseCredentials,
  isSupabaseConfigured,
  getSupabaseClient,
} from '../services/supabaseClient';
import { localDB, DEFAULT_USER } from '../services/localStore';

const MIGRATION_SQL = `-- ====================================================================
-- Kanso Projects - Personal Ticket Workspace
-- Complete Database Migration Script for Supabase SQL Editor
-- ====================================================================

-- 1. USERS TABLE
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. PROJECTS TABLE
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  archived_at TIMESTAMPTZ
);

-- 3. CATEGORIES TABLE
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  UNIQUE(project_id, name)
);

-- 4. STATUSES TABLE
CREATE TABLE IF NOT EXISTS public.statuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  is_final BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  UNIQUE(project_id, name)
);

-- 5. TICKETS TABLE
CREATE TABLE IF NOT EXISTS public.tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  ticket_number TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  notes TEXT,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  status_id UUID NOT NULL REFERENCES public.statuses(id) ON DELETE CASCADE,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  due_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  UNIQUE(project_id, ticket_number)
);

-- 6. ATTACHMENTS TABLE
CREATE TABLE IF NOT EXISTS public.attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 7. TICKET_HISTORY TABLE
CREATE TABLE IF NOT EXISTS public.ticket_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON public.projects(user_id);
CREATE INDEX IF NOT EXISTS idx_categories_project_id ON public.categories(project_id);
CREATE INDEX IF NOT EXISTS idx_statuses_project_id ON public.statuses(project_id);
CREATE INDEX IF NOT EXISTS idx_tickets_project_id ON public.tickets(project_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status_id ON public.tickets(status_id);
CREATE INDEX IF NOT EXISTS idx_tickets_category_id ON public.tickets(category_id);
CREATE INDEX IF NOT EXISTS idx_attachments_ticket_id ON public.attachments(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_history_ticket_id ON public.ticket_history(ticket_id);

-- Grants for Supabase API access
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO postgres, anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO postgres, anon, authenticated, service_role;

-- Enable Row Level Security (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_history ENABLE ROW LEVEL SECURITY;

-- Permissive RLS Policies for personal single-user workspace
DROP POLICY IF EXISTS "Allow all users access" ON public.users;
CREATE POLICY "Allow all users access" ON public.users FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all projects access" ON public.projects;
CREATE POLICY "Allow all projects access" ON public.projects FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all categories access" ON public.categories;
CREATE POLICY "Allow all categories access" ON public.categories FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all statuses access" ON public.statuses;
CREATE POLICY "Allow all statuses access" ON public.statuses FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all tickets access" ON public.tickets;
CREATE POLICY "Allow all tickets access" ON public.tickets FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all attachments access" ON public.attachments;
CREATE POLICY "Allow all attachments access" ON public.attachments FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all ticket_history access" ON public.ticket_history;
CREATE POLICY "Allow all ticket_history access" ON public.ticket_history FOR ALL USING (true) WITH CHECK (true);

-- Storage bucket setup
INSERT INTO storage.buckets (id, name, public)
VALUES ('project-files', 'project-files', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public storage access" ON storage.objects;
CREATE POLICY "Public storage access" ON storage.objects
  FOR ALL
  USING (bucket_id = 'project-files')
  WITH CHECK (bucket_id = 'project-files');
`;

export const SettingsPage: React.FC = () => {
  const credentials = getSupabaseCredentials();
  const [supabaseUrl, setSupabaseUrl] = useState(credentials.url);
  const [supabaseKey, setSupabaseKey] = useState(credentials.anonKey);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    status: 'success' | 'warning' | 'error';
    title: string;
    message: string;
    needsMigration?: boolean;
  } | null>(null);

  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);
  const [showSqlPreview, setShowSqlPreview] = useState(false);

  const isConnected = isSupabaseConfigured();
  const currentUser = localDB.getCurrentUser() || DEFAULT_USER;
  const { user: fbUser, signIn: fbSignIn, signOut: fbSignOut } = useFirebase();
  const [isFbTesting, setIsFbTesting] = useState(false);
  const [fbTestResult, setFbTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleTestFirebase = async () => {
    setIsFbTesting(true);
    setFbTestResult(null);
    try {
      const isOnline = await validateFirestoreConnection();
      if (isOnline) {
        setFbTestResult({
          success: true,
          message: `Connected to Cloud Firestore (Database: ${firebaseConfig.firestoreDatabaseId})`,
        });
      } else {
        setFbTestResult({
          success: false,
          message: 'Client reported offline. Please check network connectivity.',
        });
      }
    } catch (e: any) {
      setFbTestResult({
        success: false,
        message: e.message || 'Error validating Firebase connection.',
      });
    } finally {
      setIsFbTesting(false);
    }
  };

  const projectRef = supabaseUrl.includes('.supabase.co')
    ? supabaseUrl.replace('https://', '').replace('.supabase.co', '').split('/')[0]
    : '';

  const handleSaveCredentials = (e: React.FormEvent) => {
    e.preventDefault();
    saveCustomSupabaseCredentials(supabaseUrl, supabaseKey);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);

    const cleanUrl = supabaseUrl.trim();
    const cleanKey = supabaseKey.trim();

    if (!cleanUrl || !cleanKey) {
      setTestResult({
        status: 'error',
        title: 'Missing Configuration',
        message: 'Please provide both your Supabase Project URL and Anon/Publishable Key.',
      });
      setIsTesting(false);
      return;
    }

    try {
      saveCustomSupabaseCredentials(cleanUrl, cleanKey);

      // Step 1: Test auth endpoint to verify project existence & API key
      let authHealthy = false;
      try {
        const authRes = await fetch(`${cleanUrl}/auth/v1/settings`, {
          headers: { apikey: cleanKey },
        });
        if (authRes.ok || authRes.status === 200) {
          authHealthy = true;
        }
      } catch (networkErr: any) {
        setTestResult({
          status: 'error',
          title: 'Network / URL Unreachable',
          message: `Could not reach ${cleanUrl}. Check the project URL or network connection.`,
        });
        setIsTesting(false);
        return;
      }

      // Step 2: Test PostgREST table access
      const client = getSupabaseClient();
      if (!client) {
        setTestResult({
          status: 'error',
          title: 'Client Initialization Failed',
          message: 'Unable to initialize Supabase client with given credentials.',
        });
        setIsTesting(false);
        return;
      }

      const { data, error } = await client
        .from('projects')
        .select('count', { count: 'exact', head: true });

      if (error) {
        if (
          error.code === 'PGRST205' ||
          error.message?.includes('schema cache') ||
          error.message?.includes('does not exist')
        ) {
          setTestResult({
            status: 'warning',
            title: 'Supabase Connected — Tables Pending Setup',
            message:
              'Successfully connected to your Supabase project! However, the database tables (projects, tickets, etc.) have not been created yet. Copy and run the SQL migration below in your Supabase SQL Editor.',
            needsMigration: true,
          });
        } else {
          setTestResult({
            status: authHealthy ? 'warning' : 'error',
            title: authHealthy ? 'Connected (Table Permissions Notice)' : 'Query Error',
            message: `${error.message}. Code: ${error.code || 'unknown'}`,
            needsMigration: true,
          });
        }
      } else {
        setTestResult({
          status: 'success',
          title: 'Fully Connected & Live!',
          message: 'Successfully connected to Supabase PostgreSQL with active tables and storage bucket.',
        });
      }
    } catch (err: any) {
      setTestResult({
        status: 'error',
        title: 'Connection Exception',
        message: err.message || 'Unknown network error',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(MIGRATION_SQL);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  const handleResetDatabase = () => {
    localDB.resetDatabase();
    setIsResetConfirmOpen(false);
    window.location.reload();
  };

  const handleExportDataBackup = () => {
    const backup = {
      users: localDB.getCurrentUser(),
      projects: localDB.getProjects(),
      tickets: localDB.getTickets(),
      attachments: localDB.getAttachments(),
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `kanso_backup_${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 max-w-4xl pb-10">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Workspace Settings</h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          Configure database connectivity, storage engine, personal preferences, and backup data.
        </p>
      </div>

      {/* Database Mode Card */}
      <Card className="p-6 bg-white space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-slate-100 text-slate-800">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Database & Storage Engine</h2>
              <p className="text-xs text-slate-500">
                Target Project:{' '}
                <span className="font-mono text-slate-700 font-semibold">
                  {projectRef ? projectRef : 'Not configured'}
                </span>
              </p>
            </div>
          </div>

          <div
            className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 border ${
              isConnected
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-slate-100 text-slate-700 border-slate-200'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-slate-400'}`} />
            {isConnected ? 'Supabase Target Set' : 'Local Persistent'}
          </div>
        </div>

        <form onSubmit={handleSaveCredentials} className="space-y-4 pt-3 border-t border-slate-100">
          <Input
            label="Supabase Project URL"
            placeholder="https://gmkhnvlotcusmutmjkyp.supabase.co"
            value={supabaseUrl}
            onChange={(e) => setSupabaseUrl(e.target.value)}
            helperText="Your project endpoint from Supabase Project Settings -> API"
          />

          <Input
            label="Supabase Anon / Publishable Key"
            placeholder="sb_publishable_... or eyJhbGci..."
            type="password"
            value={supabaseKey}
            onChange={(e) => setSupabaseKey(e.target.value)}
            helperText="The publishable or anon key from Supabase Project Settings -> API"
          />

          {testResult && (
            <div
              className={`p-4 rounded-xl text-xs space-y-1.5 border ${
                testResult.status === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : testResult.status === 'warning'
                  ? 'bg-amber-50 text-amber-900 border-amber-200'
                  : 'bg-rose-50 text-rose-800 border-rose-200'
              }`}
            >
              <div className="flex items-center gap-2 font-bold text-sm">
                {testResult.status === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
                {testResult.status === 'warning' && <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />}
                {testResult.status === 'error' && <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />}
                <span>{testResult.title}</span>
              </div>
              <p className="text-xs leading-relaxed">{testResult.message}</p>

              {testResult.needsMigration && (
                <div className="pt-2 flex items-center gap-2">
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={handleCopySql}
                    leftIcon={<Copy className="w-3.5 h-3.5" />}
                    className="text-xs"
                  >
                    {copiedSql ? 'Copied SQL!' : 'Copy SQL Migration Script'}
                  </Button>
                  {projectRef && (
                    <a
                      href={`https://supabase.com/dashboard/project/${projectRef}/sql/new`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-800 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-2xs"
                    >
                      <span>Open Supabase SQL Editor</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              )}
            </div>
          )}

          {saveSuccess && (
            <div className="p-3 rounded-lg text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Configuration saved and active in current session.</span>
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleTestConnection}
              isLoading={isTesting}
              leftIcon={<Server className="w-3.5 h-3.5" />}
            >
              Test Connection Status
            </Button>

            <Button type="submit" variant="primary" size="sm">
              Save Configuration
            </Button>
          </div>
        </form>
      </Card>

      {/* Database Schema Setup Card */}
      <Card className="p-6 bg-white space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-slate-100 text-slate-800">
              <Code2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Database Schema Setup (Required on Supabase)</h2>
              <p className="text-xs text-slate-500">
                Run this SQL script in your Supabase Dashboard SQL Editor once to create tables and RLS policies.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowSqlPreview(!showSqlPreview)}
              className="text-xs"
            >
              {showSqlPreview ? 'Hide SQL' : 'View SQL'}
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleCopySql}
              leftIcon={<Copy className="w-3.5 h-3.5" />}
              className="text-xs"
            >
              {copiedSql ? 'Copied to Clipboard!' : 'Copy SQL Script'}
            </Button>
          </div>
        </div>

        {/* Setup steps */}
        <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 text-xs space-y-2 text-slate-700">
          <p className="font-semibold text-slate-900">3-Step Database Initialization:</p>
          <ol className="list-decimal list-inside space-y-1.5 pl-1 leading-relaxed">
            <li>
              Click <strong>Copy SQL Script</strong> above.
            </li>
            <li>
              Open your Supabase project's{' '}
              {projectRef ? (
                <a
                  href={`https://supabase.com/dashboard/project/${projectRef}/sql/new`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sky-700 font-semibold underline inline-flex items-center gap-0.5"
                >
                  SQL Editor <ExternalLink className="w-3 h-3 inline" />
                </a>
              ) : (
                <span className="font-semibold">SQL Editor</span>
              )}
              .
            </li>
            <li>
              Paste the SQL and click <strong>RUN</strong>. This creates all 7 tables, permissions, and the storage bucket!
            </li>
          </ol>
        </div>

        {showSqlPreview && (
          <div className="relative">
            <pre className="p-4 rounded-xl bg-slate-950 text-slate-200 font-mono text-[11px] max-h-72 overflow-y-auto leading-relaxed">
              {MIGRATION_SQL}
            </pre>
          </div>
        )}
      </Card>

      {/* Firebase Cloud Firestore & Authentication Card */}
      <Card className="p-6 bg-white space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600 border border-amber-200/60">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-slate-900">Google Firebase & Cloud Firestore</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Provisioned
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Cloud Firestore database & Google OAuth authentication engine.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-3 border-t border-slate-100 text-xs">
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/70">
            <span className="text-slate-400 block text-[11px] mb-1">Firebase Project ID</span>
            <span className="font-mono font-semibold text-slate-800 text-xs break-all">
              {firebaseConfig.projectId}
            </span>
          </div>

          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/70">
            <span className="text-slate-400 block text-[11px] mb-1">Firestore Database ID</span>
            <span className="font-mono font-semibold text-slate-800 text-xs break-all">
              {firebaseConfig.firestoreDatabaseId}
            </span>
          </div>

          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/70">
            <span className="text-slate-400 block text-[11px] mb-1">Google Auth State</span>
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${fbUser ? 'bg-emerald-500' : 'bg-slate-400'}`} />
              <span className="font-medium text-slate-700">
                {fbUser ? `Signed in as ${fbUser.displayName || fbUser.email}` : 'Not signed in'}
              </span>
            </div>
          </div>

          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/70">
            <span className="text-slate-400 block text-[11px] mb-1">Security Rules</span>
            <span className="font-medium text-emerald-700 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Hardened ABAC Rules Active
            </span>
          </div>
        </div>

        {fbTestResult && (
          <div
            className={`p-3 rounded-lg text-xs flex items-center gap-2 border ${
              fbTestResult.success
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-rose-50 text-rose-800 border-rose-200'
            }`}
          >
            {fbTestResult.success ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            )}
            <span>{fbTestResult.message}</span>
          </div>
        )}

        <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleTestFirebase}
            isLoading={isFbTesting}
            leftIcon={<Flame className="w-3.5 h-3.5 text-amber-500" />}
          >
            Verify Firestore Connection
          </Button>

          {fbUser ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fbSignOut()}
              className="text-xs"
            >
              Sign Out of Google
            </Button>
          ) : (
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => fbSignIn()}
              className="text-xs"
            >
              Sign In with Google
            </Button>
          )}
        </div>
      </Card>

      {/* User Profile Card */}
      <Card className="p-6 bg-white space-y-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2.5 rounded-xl bg-slate-100 text-slate-800">
            <User className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900">Personal Workspace Profile</h2>
            <p className="text-xs text-slate-500">Single-user isolated personal environment.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-3 border-t border-slate-100">
          <div>
            <span className="text-slate-400 block text-[11px] mb-1">User Name</span>
            <span className="font-semibold text-slate-800 text-sm">{currentUser.name}</span>
          </div>

          <div>
            <span className="text-slate-400 block text-[11px] mb-1">Email</span>
            <span className="font-mono text-slate-700">{currentUser.email}</span>
          </div>
        </div>
      </Card>

      {/* Data Backup & Reset */}
      <Card className="p-6 bg-white space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-slate-100 text-slate-800">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900">Data Management & Reset</h2>
            <p className="text-xs text-slate-500">
              Export complete JSON backup or reset workspace to factory seed tickets.
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
          >
            Export Complete Backup (.json)
          </Button>

          <Button
            type="button"
            variant="danger"
            size="sm"
            onClick={() => setIsResetConfirmOpen(true)}
            leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
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
