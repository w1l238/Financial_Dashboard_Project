"use client";

import React, { useState } from 'react';
import { LayoutDashboard, LogIn, UserPlus, Loader2, AlertCircle } from 'lucide-react';
import { api } from '@/lib/api';

interface AuthFormProps {
  onSuccess: () => void;
}

/**
 * Integrated Login and Registration Form (Phase 3.3).
 * Provides a seamless entry point for users.
 */
const AuthForm: React.FC<AuthFormProps> = ({ onSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      if (isLogin) {
        await api.login(username, password);
      } else {
        await api.register(username, password);
        // Automatically login after registration
        await api.login(username, password);
      }
      onSuccess();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Authentication failed. Please check credentials.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-6 font-sans">
      <div className="w-full max-w-md space-y-8 animate-in fade-in zoom-in-95 duration-500">
        
        {/* Branding */}
        <div className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-xl shadow-blue-500/20">
            <LayoutDashboard className="text-white w-6 h-6" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">FinCast</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Personalized Financial & Weather Dashboard</p>
        </div>

        {/* Auth Card */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200 dark:border-slate-800 shadow-2xl shadow-slate-200/50 dark:shadow-none">
          <div className="space-y-6">
            <div className="space-y-2 text-center">
              <h2 className="text-xl font-bold">{isLogin ? 'Welcome Back' : 'Create Account'}</h2>
              <p className="text-sm text-slate-500">{isLogin ? 'Login to access your dashboard' : 'Join us to start tracking your market'}</p>
            </div>

            {error && (
              <div className="flex items-center space-x-2 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 p-4 rounded-xl text-xs font-semibold animate-in shake duration-300">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Username</label>
                <input 
                  type="text" 
                  required
                  placeholder="user"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all" 
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Password</label>
                <input 
                  type="password" 
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all" 
                />
              </div>

              <button 
                disabled={isLoading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white py-3.5 rounded-xl font-bold flex items-center justify-center space-x-2 transition-all shadow-lg shadow-blue-500/20 active:scale-[0.98]"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    {isLogin ? <LogIn className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                    <span>{isLogin ? 'Login' : 'Create Account'}</span>
                  </>
                )}
              </button>
            </form>

            <div className="text-center pt-2">
              <button 
                onClick={() => setIsLogin(!isLogin)}
                className="text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-blue-500 transition-colors"
              >
                {isLogin ? "Don't have an account? Register" : "Already have an account? Login"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthForm;
