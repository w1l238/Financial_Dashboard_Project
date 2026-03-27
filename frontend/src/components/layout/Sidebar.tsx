"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, CloudSun, Settings, LogOut, LucideIcon, ChevronRight, ShieldCheck, PieChart } from 'lucide-react';
import { WeatherResponse } from '@/lib/api';

interface NavLinkProps {
  icon: LucideIcon;
  label: string;
  href: string;
  active?: boolean;
}

const NavLink: React.FC<NavLinkProps> = ({ icon: Icon, label, href, active = false }) => {
  const baseClasses = "flex items-center space-x-3 px-3 py-2 rounded-lg transition-all duration-200";
  const activeClasses = active 
    ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-medium shadow-sm shadow-blue-500/5" 
    : "hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-600 dark:text-slate-400";
  
  return (
    <Link href={href} className={`${baseClasses} ${activeClasses}`}>
      <Icon className="w-5 h-5" />
      <span className="text-sm">{label}</span>
    </Link>
  );
};

interface SidebarProps {
  onSettingsClick: () => void;
  onLogout: () => void;
  username?: string;
  role?: string;
  weatherData?: Record<string, WeatherResponse>;
  preferredUnits?: 'metric' | 'imperial';
  isLoadingWeather?: boolean;
  weatherEnabled?: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  onSettingsClick, 
  onLogout, 
  username, 
  role,
  weatherData, 
  preferredUnits = 'metric',
  isLoadingWeather,
  weatherEnabled = true
}) => {
  const [weatherIndex, setWeatherIndex] = useState(0);
  const pathname = usePathname();
  const unitSymbol = preferredUnits === 'metric' ? '°C' : '°F';
  
  const weatherList = weatherData ? Object.values(weatherData) : [];
  const primaryWeather = weatherList.length > 0 ? weatherList[weatherIndex % weatherList.length] : null;
  const isApiMissing = primaryWeather?.is_api_missing;

  return (
    <aside className="w-64 border-r border-slate-200 dark:border-slate-800 flex flex-col p-4 bg-white dark:bg-slate-950 z-20">
      <div className="flex items-center space-x-3 px-2 py-4 border-b border-slate-100 dark:border-slate-900 mb-4">
        <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20 text-white">
          <LayoutDashboard className="w-6 h-6" />
        </div>
        <div className="flex flex-col">
          <span className="font-bold text-lg tracking-tight leading-none text-slate-900 dark:text-white">FinCast</span>
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Dashboard</span>
        </div>
      </div>
      
      <nav className="flex-1 space-y-1">
        <NavLink icon={LayoutDashboard} label="Overview" href="/" active={pathname === '/'} />
        <NavLink icon={PieChart} label="Portfolio" href="/portfolio" active={pathname === '/portfolio'} />
        {weatherEnabled && <NavLink icon={CloudSun} label="Forecasts" href="/forecasts" active={pathname === '/forecasts'} />}
        {role === 'admin' && <NavLink icon={ShieldCheck} label="Users" href="/admin" active={pathname === '/admin'} />}
      </nav>

      {weatherEnabled && (
        <div className="mt-auto pt-4 border-t border-slate-100 dark:border-slate-900 mb-4 px-1">
          <div className="px-3 mb-2 flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Weather Sync</span>
            <div className="flex space-x-1">
              {weatherList.map((_, i) => (
                 <div key={i} className={`w-1 h-1 rounded-full ${i === (weatherIndex % weatherList.length) ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'}`} />
              ))}
            </div>
          </div>
          
          <button 
            onClick={() => setWeatherIndex(prev => (prev + 1) % (weatherList.length || 1))}
            disabled={weatherList.length <= 1}
            className={`w-full bg-slate-50 dark:bg-slate-900/50 rounded-2xl p-4 border border-slate-100 dark:border-slate-800 text-left transition-all ${weatherList.length > 1 ? 'hover:border-blue-500/50 active:scale-[0.98]' : ''}`}
          >
            {isLoadingWeather ? (
              <div className="animate-pulse space-y-2"><div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/2" /><div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-1/4" /></div>
            ) : primaryWeather ? (
              <div className="flex items-center justify-between group">
                <div>
                  <p className="text-xl font-bold tracking-tight">{isApiMissing ? '-' : Math.round(primaryWeather.main.temp)}{!isApiMissing && unitSymbol}</p>
                  <p className="text-[10px] font-semibold text-slate-500 capitalize">{isApiMissing ? 'API Key Needed' : primaryWeather.weather[0].main}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-slate-400">{isApiMissing ? 'Action Required' : primaryWeather.name}</p>
                  <div className="flex items-center justify-end space-x-1">
                     {weatherList.length > 1 && <ChevronRight className="w-2.5 h-2.5 text-blue-500 group-hover:translate-x-0.5 transition-transform" />}
                     <p className="text-[9px] text-blue-500 font-bold uppercase tracking-tighter">Live</p>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-[10px] text-slate-400 italic text-center">Add a city in settings</p>
            )}
          </button>
        </div>
      )}

      <div className="space-y-1 pt-4 border-t border-slate-100 dark:border-slate-900">
        {username && (
          <div className="px-3 py-2 mb-2 flex items-center space-x-3">
             <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center">
                <span className="text-xs font-bold text-blue-600">{username[0].toUpperCase()}</span>
             </div>
             <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 truncate">{username}</span>
          </div>
        )}
        <button onClick={onSettingsClick} className="flex items-center space-x-3 px-3 py-2.5 w-full rounded-xl hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-600 dark:text-slate-400 transition-all text-left group">
          <Settings className="w-5 h-5 group-hover:rotate-45 transition-transform duration-300" />
          <span className="text-sm font-medium">Settings</span>
        </button>
        <button onClick={onLogout} className="flex items-center space-x-3 px-3 py-2.5 w-full rounded-xl hover:bg-rose-50 dark:hover:bg-rose-900/10 text-slate-600 dark:text-slate-400 hover:text-rose-600 transition-all text-left">
          <LogOut className="w-5 h-5" />
          <span className="text-sm font-medium">Logout</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
