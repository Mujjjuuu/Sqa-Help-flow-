import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, User, ArrowRight, ShieldCheck, CheckCircle2, AlertCircle } from 'lucide-react';
import { Card } from '../components/Card';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { getSupabaseClient, isSupabaseConfigured } from '../services/supabaseClient';
import { localDB } from '../services/localStore';

type AuthMode = 'login' | 'signup' | 'forgot' | 'reset';

export const AuthPage: React.FC = () => {
  const navigate = useNavigate();
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const supabase = getSupabaseClient();

    try {
      if (mode === 'signup') {
        if (!isSupabaseConfigured() || !supabase) {
          // Local registration
          localDB.setCurrentUser({
            id: `usr-${Date.now()}`,
            email,
            name: name || email.split('@')[0],
            created_at: new Date().toISOString(),
          });
          setSuccessMsg('Account created successfully! Welcome to Kanso.');
          setTimeout(() => navigate('/'), 800);
          return;
        }

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { name: name || email.split('@')[0] },
          },
        });

        if (error) throw error;
        setSuccessMsg('Sign-up successful! You can now log in or check your email verification.');
        setMode('login');
      } else if (mode === 'login') {
        if (!isSupabaseConfigured() || !supabase) {
          // Local login
          localDB.setCurrentUser({
            id: 'usr-default-001',
            email: email || 'boboffical54@gmail.com',
            name: email.split('@')[0] || 'Bob Official',
            created_at: new Date().toISOString(),
          });
          navigate('/');
          return;
        }

        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;
        navigate('/');
      } else if (mode === 'forgot') {
        if (isSupabaseConfigured() && supabase) {
          const { error } = await supabase.auth.resetPasswordForEmail(email);
          if (error) throw error;
        }
        setSuccessMsg('Password reset link sent to your email address.');
      } else if (mode === 'reset') {
        if (isSupabaseConfigured() && supabase) {
          const { error } = await supabase.auth.updateUser({ password });
          if (error) throw error;
        }
        setSuccessMsg('Password updated successfully. You can now log in.');
        setMode('login');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred during authentication.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Brand */}
        <div className="text-center">
          <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-lg mx-auto mb-3 shadow-sm">
            K
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Kanso Projects</h1>
          <p className="text-xs text-slate-500 mt-1">Single-user personal project & ticket workspace</p>
        </div>

        <Card className="p-6 sm:p-8 bg-white shadow-md">
          <div className="mb-6">
            <h2 className="text-base font-bold text-slate-900">
              {mode === 'login' && 'Sign in to your workspace'}
              {mode === 'signup' && 'Create your personal account'}
              {mode === 'forgot' && 'Reset your password'}
              {mode === 'reset' && 'Enter your new password'}
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              {mode === 'login' && 'Enter your credentials to access your projects and tickets.'}
              {mode === 'signup' && 'Get started with a clean, lightweight personal Kanban.'}
              {mode === 'forgot' && 'Enter your email to receive recovery instructions.'}
              {mode === 'reset' && 'Provide a secure new password for your account.'}
            </p>
          </div>

          {errorMsg && (
            <div className="mb-4 p-3 rounded-lg text-xs bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-4 p-3 rounded-lg text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <Input
                label="Full Name"
                placeholder="Bob Official"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                leftIcon={<User className="w-4 h-4" />}
              />
            )}

            {mode !== 'reset' && (
              <Input
                label="Email Address"
                type="email"
                placeholder="you@example.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                leftIcon={<Mail className="w-4 h-4" />}
              />
            )}

            {mode !== 'forgot' && (
              <Input
                label={mode === 'reset' ? 'New Password' : 'Password'}
                type="password"
                placeholder="••••••••"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                leftIcon={<Lock className="w-4 h-4" />}
              />
            )}

            {mode === 'login' && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setMode('forgot')}
                  className="text-xs text-slate-600 hover:text-slate-900 font-medium cursor-pointer"
                >
                  Forgot password?
                </button>
              </div>
            )}

            <Button type="submit" variant="primary" size="md" isLoading={isLoading} className="w-full">
              {mode === 'login' && 'Sign In'}
              {mode === 'signup' && 'Create Account'}
              {mode === 'forgot' && 'Send Reset Link'}
              {mode === 'reset' && 'Update Password'}
            </Button>

            {/* Quick Guest / Solo Workspace Access */}
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={() => {
                localDB.setCurrentUser({
                  id: 'usr-default-001',
                  email: 'boboffical54@gmail.com',
                  name: 'Bob Official',
                  created_at: new Date().toISOString(),
                });
                navigate('/');
              }}
              className="w-full text-xs text-slate-700"
            >
              Continue directly as Bob (Solo Workspace)
            </Button>
          </form>

          {/* Mode Switchers */}
          <div className="mt-6 pt-4 border-t border-slate-100 text-center text-xs text-slate-500">
            {mode === 'login' ? (
              <p>
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => setMode('signup')}
                  className="font-semibold text-slate-900 hover:underline cursor-pointer"
                >
                  Sign up
                </button>
              </p>
            ) : (
              <p>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className="font-semibold text-slate-900 hover:underline cursor-pointer"
                >
                  Back to login
                </button>
              </p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};
