"use client";

import React, { useEffect, useRef } from 'react';
import { X, Sun, Moon, Settings2, CloudSun } from 'lucide-react';
import { UserResponse, api, setLocalTheme } from '@/lib/api';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  userPrefs: UserResponse | null;
  onRefresh: () => void;
}

/**
 * Enhanced Settings Modal with reactive preference management.
 */
const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, userPrefs, onRefresh }) => {
  const dialogRef = useRef<HTMLDivElement>(null);

  // Trap focus inside the modal and close on Escape
  useEffect(() => {
    if (!isOpen) return;

    const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

    // Move focus into the modal when it opens
    const firstFocusable = dialogRef.current?.querySelector<HTMLElement>(FOCUSABLE);
    firstFocusable?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key !== 'Tab') return;

      // Collect all focusable elements inside the dialog
      const focusable = Array.from(
        dialogRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleToggleTheme = async () => {
    const nextTheme = userPrefs?.theme === 'light' ? 'dark' : 'light';
    try {
      setLocalTheme(nextTheme); // Instant feedback and persistence
      await api.updateTheme(nextTheme);
      onRefresh();
    } catch (err) { console.error(err); }
  };

  const handleToggleWeather = async () => {
    try {
      await api.updateWeatherEnabled(!userPrefs?.weather_enabled);
      onRefresh();
    } catch (err) { console.error(err); }
  };

  const handleUpdateUnits = async (units: 'metric' | 'imperial') => {
    try {
      await api.updateUnits(units);
      onRefresh();
    } catch (err) { console.error(err); }
  };

  const handleUpdateCurrency = async (currency: string) => {
    try {
      await api.updateCurrency(currency);
      onRefresh();
    } catch (err) { console.error(err); }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-modal-title"
      ref={dialogRef}
    >
      <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">

        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center space-x-2 text-blue-600">
            <Settings2 className="w-5 h-5" />
            <h2 id="settings-modal-title" className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">Dashboard Settings</h2>
          </div>
          <button onClick={onClose} aria-label="Close settings" className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 space-y-6 overflow-y-auto">
          
          {/* Appearance Section */}
          <section className="space-y-2">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Appearance</h3>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleToggleTheme}
                aria-pressed={userPrefs?.theme === 'light'}
                className={`flex items-center justify-center space-x-2 p-3 rounded-2xl border transition-all ${userPrefs?.theme === 'light' ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800'}`}
              >
                <Sun className="w-4 h-4" />
                <span className="text-xs font-bold">Light</span>
              </button>
              <button
                onClick={handleToggleTheme}
                aria-pressed={userPrefs?.theme === 'dark'}
                className={`flex items-center justify-center space-x-2 p-3 rounded-2xl border transition-all ${userPrefs?.theme === 'dark' ? 'bg-blue-900/20 border-blue-800 text-blue-400' : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800'}`}
              >
                <Moon className="w-4 h-4" />
                <span className="text-xs font-bold">Dark</span>
              </button>
            </div>
          </section>

          {/* Units & Currency */}
          <div className="grid grid-cols-2 gap-4">
            <section className="space-y-1.5">
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Units</h3>
              <div className="flex bg-slate-100 dark:bg-slate-950 p-1 rounded-xl">
                {['metric', 'imperial'].map((u) => (
                  <button key={u} onClick={() => handleUpdateUnits(u as 'metric' | 'imperial')} className={`flex-1 text-[10px] font-bold py-2 rounded-lg capitalize transition-all ${userPrefs?.preferred_units === u ? 'bg-white dark:bg-slate-800 shadow-sm text-blue-600' : 'text-slate-500'}`}>{u}</button>
                ))}
              </div>
            </section>
            <section className="space-y-1.5">
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Currency</h3>
              <select 
                value={userPrefs?.preferred_currency}
                onChange={(e) => handleUpdateCurrency(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-[10px] font-bold outline-none"
              >
                {['USD', 'EUR', 'GBP', 'JPY'].map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </section>
          </div>

          {/* Features Section */}
          <section className="space-y-3">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Features</h3>
            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl">
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-xl ${userPrefs?.weather_enabled ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600' : 'bg-slate-200 dark:bg-slate-800 text-slate-400'}`}>
                  <CloudSun className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold">Weather Services</p>
                  <p className="text-[10px] text-slate-500">Enable forecasts & sync</p>
                </div>
              </div>
              <button
                onClick={handleToggleWeather}
                role="switch"
                aria-checked={!!userPrefs?.weather_enabled}
                aria-label="Toggle weather services"
                className={`w-12 h-6 rounded-full transition-colors relative ${userPrefs?.weather_enabled ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'}`}
              >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${userPrefs?.weather_enabled ? 'right-1' : 'left-1'}`} />
              </button>
            </div>
          </section>
        </div>

        {/* Modal Footer */}
        <div className="p-6 bg-slate-50 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-800 shrink-0">
          <button onClick={onClose} className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 py-3 rounded-2xl font-bold transition-transform active:scale-[0.98] shadow-lg">
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
