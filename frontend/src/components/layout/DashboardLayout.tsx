"use client";

import React, { useState, useEffect, useCallback, ReactNode, createContext, useContext } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import SettingsModal from '@/components/widgets/SettingsModal';
import AuthForm from '@/components/auth/AuthForm';
import { api, WeatherResponse, UserResponse, getLocalTheme, setLocalTheme } from '@/lib/api';

interface DashboardContextType {
  userPrefs: UserResponse | null;
  refreshData: () => Promise<void>;
  isLoading: boolean;
  toggleSettings: (open: boolean) => void;
  isSettingsOpen: boolean;
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

export const useDashboard = () => {
  const context = useContext(DashboardContext);
  if (!context) return { 
    userPrefs: null, 
    refreshData: async () => {}, 
    isLoading: false,
    toggleSettings: () => {},
    isSettingsOpen: false 
  };
  return context;
};

export const DashboardProvider = ({ children }: { children: ReactNode }) => {
  const [userPrefs, setUserPrefs] = useState<UserResponse | null>(null);
  const [weatherData, setWeatherData] = useState<Record<string, WeatherResponse>>({});
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Instant Theme Application (Phase 2.3)
  useEffect(() => {
    const theme = getLocalTheme();
    if (theme) setLocalTheme(theme);
  }, []);

  const syncLayout = useCallback(async () => {
    if (!api.isAuthenticated()) return;
    setLoading(true);
    try {
      const prefs = await api.getUserPreferences();
      setUserPrefs(prefs);
      
      if (prefs.theme === 'light' || prefs.theme === 'dark') {
        setLocalTheme(prefs.theme);
      }

      const weatherPromises = prefs.weather_locations.map(l => api.getWeather(l.city_name, prefs.preferred_units));
      const weatherResults = await Promise.all(weatherPromises.map(p => p.catch(() => null)));
      
      const weatherMap: Record<string, WeatherResponse> = {};
      weatherResults.forEach(w => { if(w) weatherMap[w.name] = w; });
      setWeatherData(weatherMap);
    } catch (err) {
      console.error("Layout sync error", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      const auth = api.isAuthenticated();
      setIsAuthenticated(auth);
      if (auth) await syncLayout();
      setIsAuthLoading(false);
    };
    init();
  }, [syncLayout]);

  const toggleSettings = (open: boolean) => setIsSettingsOpen(open);

  return (
    <DashboardContext.Provider value={{ 
      userPrefs, 
      refreshData: syncLayout, 
      isLoading: loading,
      toggleSettings,
      isSettingsOpen
    }}>
      {isAuthLoading ? null : !isAuthenticated ? (
        <AuthForm onSuccess={() => { setIsAuthenticated(true); syncLayout(); }} />
      ) : (
        <div className="flex h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 transition-colors duration-200 font-sans overflow-hidden">
          <Sidebar 
            onSettingsClick={() => toggleSettings(true)} 
            onLogout={() => { api.logout(); setIsAuthenticated(false); }}
            username={userPrefs?.username}
            role={userPrefs?.role}
            weatherData={weatherData}
            preferredUnits={userPrefs?.preferred_units}
            isLoadingWeather={loading}
            weatherEnabled={userPrefs?.weather_enabled}
          />
          {children}
          <SettingsModal 
            isOpen={isSettingsOpen} 
            onClose={() => toggleSettings(false)} 
            userPrefs={userPrefs} 
            onRefresh={syncLayout} 
          />
        </div>
      )}
    </DashboardContext.Provider>
  );
};

interface DashboardLayoutProps {
  children: ReactNode;
  title: string;
}

/**
 * Shared Layout for all Dashboard Pages (Markets, Forecasts, Overview).
 * Now acts as a wrapper for the page content.
 */
export default function DashboardLayout({ children, title }: DashboardLayoutProps) {
  return (
    <main className="flex-1 flex flex-col overflow-hidden">
      <Header title={title} />
      <div className="flex-1 overflow-y-auto p-8">
        {children}
      </div>
    </main>
  );
}
