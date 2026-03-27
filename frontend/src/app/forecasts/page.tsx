"use client";

import React, { useState, useEffect, useCallback } from 'react';
import DashboardLayout, { useDashboard } from '@/components/layout/DashboardLayout';
import { api } from '@/lib/api';
import { Cloud, Droplets, Thermometer, MapPin, Sun, CloudRain, CloudLightning, Snowflake, Wind, Search, Plus, Trash2, Loader2 } from 'lucide-react';

interface ForecastData {
  db_id: number;
  db_city_name: string;
  list?: Array<{
    dt_txt: string;
    main: {
      temp: number;
      humidity: number;
      pressure: number;
    };
    weather: Array<{
      main: string;
      description: string;
    }>;
    wind?: {
      speed: number;
    };
  }>;
  city?: {
    name: string;
  };
  is_api_missing?: boolean;
}

/**
 * Forecasts Page with Extended 5-Day Data and City Management (Phase 3.2).
 */
export default function ForecastsPage() {
  const { userPrefs, refreshData, toggleSettings } = useDashboard();
  const [loading, setLoading] = useState(true);
  const [forecasts, setForecasts] = useState<ForecastData[]>([]);
  
  const [cityQuery, setCityQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Array<{ name: string; full_name: string }>>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [apiKeyConfigured, setApiKeyConfigured] = useState(true);

  const loadForecasts = useCallback(async () => {
    if (!userPrefs || !userPrefs.weather_enabled) return;
    setLoading(true);
    try {
      const results = await Promise.all(
        userPrefs.weather_locations.map(async (l) => {
          const res = await api.getForecast(l.city_name, userPrefs.preferred_units).catch(() => null);
          // Always return an object with the DB ID so it can be removed even on fetch failure
          return { ...(res || {}), db_id: l.id, db_city_name: l.city_name } as ForecastData;
        })
      );
      setForecasts(results.filter((f): f is ForecastData => f !== null));
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [userPrefs]);

  useEffect(() => { loadForecasts(); }, [loadForecasts]);

  useEffect(() => {
    api.getWeatherStatus().then(({ api_key_configured }) => setApiKeyConfigured(api_key_configured)).catch(() => {});
  }, []);

  // City Search Logic
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (cityQuery.length >= 2) {
        setIsSearching(true);
        try {
          const res = await api.searchCities(cityQuery);
          setSuggestions(res);
        } catch (e) { console.error(e); }
        finally { setIsSearching(false); }
      } else { setSuggestions([]); }
    }, 400);
    return () => clearTimeout(timer);
  }, [cityQuery]);

  const handleAddCity = async (fullName: string) => {
    try {
      await api.addWeatherLocation(fullName);
      setCityQuery('');
      setSuggestions([]);
      refreshData();
    } catch (e) { console.error(e); }
  };

  const handleRemoveCity = async (locationId: number) => {
    try {
      await api.removeWeatherLocation(locationId);
      refreshData();
    } catch (e) { console.error(e); }
  };

  if (userPrefs && !userPrefs.weather_enabled) {
    return (
      <DashboardLayout title="Weather Forecasts">
        <div className="flex flex-col items-center justify-center h-[60vh] space-y-4 text-center">
          <div className="w-20 h-20 bg-slate-100 dark:bg-slate-900 rounded-3xl flex items-center justify-center text-slate-400">
            <Cloud className="w-10 h-10" />
          </div>
          <div className="space-y-2 max-w-sm">
            <h2 className="text-xl font-bold">Weather Services Disabled</h2>
            <p className="text-sm text-slate-500">Enable weather functionality in your dashboard settings to track forecasts and sync climate data.</p>
          </div>
          <button 
            onClick={() => toggleSettings(true)}
            className="px-6 py-3 bg-blue-600 text-white rounded-2xl font-bold text-sm shadow-lg shadow-blue-500/20 active:scale-[0.98] transition-all"
          >
            Open Settings
          </button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Weather Forecasts">
      <div className="space-y-8">
        {/* City Search & Management */}
        <div className="relative bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm">
          {!apiKeyConfigured && (
            <div className="mb-4 flex items-start space-x-3 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl">
              <Cloud className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">OpenWeather API key required</p>
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
                  Add <code className="bg-amber-100 dark:bg-amber-900 px-1 rounded">OPENWEATHER_API_KEY</code> to the backend <code className="bg-amber-100 dark:bg-amber-900 px-1 rounded">.env</code> file to enable city search and live forecast data.
                </p>
              </div>
            </div>
          )}
          <div className="flex items-center space-x-4">
            <div className="flex-1 relative">
              <div className="absolute left-4 top-3.5 text-slate-400">
                {isSearching ? <Loader2 className="w-5 h-5 animate-spin text-blue-500" /> : <Search className="w-5 h-5" />}
              </div>
              <input
                type="text"
                aria-label="Search cities to track"
                disabled={!apiKeyConfigured}
                placeholder={apiKeyConfigured ? "Search cities to track (e.g. Tokyo, Berlin)..." : "API key required to search cities"}
                value={cityQuery}
                onChange={(e) => setCityQuery(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border-0 rounded-2xl pl-12 pr-4 py-4 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>
          </div>

          {/* Autocomplete Results */}
          {suggestions.length > 0 && (
            <div className="absolute z-50 left-6 right-6 mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden max-h-64 overflow-y-auto animate-in fade-in slide-in-from-top-2">
              {suggestions.map((s, i) => (
                <button key={i} onClick={() => handleAddCity(s.full_name)} aria-label={`Add ${s.full_name} to tracked cities`} className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-slate-50 dark:hover:bg-slate-800 border-b border-slate-50 dark:border-slate-800 last:border-0">
                  <div className="flex items-center space-x-3">
                    <MapPin className="w-4 h-4 text-blue-500" />
                    <span className="font-bold text-slate-900 dark:text-white text-sm">{s.full_name}</span>
                  </div>
                  <Plus className="w-4 h-4 text-blue-500" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          {loading ? (
            [1,2].map(i => <div key={i} className="h-96 bg-slate-100 dark:bg-slate-800 animate-pulse rounded-[2.5rem]" />)
          ) : forecasts.map((data, idx) => (
            <ForecastCard 
              key={idx} 
              data={data} 
              units={userPrefs?.preferred_units} 
              onRemove={() => handleRemoveCity(data.db_id)}
            />
          ))}
          {!loading && forecasts.length === 0 && (
            <div className="xl:col-span-2 py-20 text-center bg-slate-50/50 dark:bg-slate-900/50 rounded-[3rem] border border-dashed border-slate-200 dark:border-slate-800">
              <p className="text-slate-400 italic">No cities tracked. Search above to add locations.</p>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

const ForecastCard = ({ data, units, onRemove }: { data: ForecastData, units?: string, onRemove: () => void }) => {
  const isApiMissing = data?.is_api_missing;
  const cityName = isApiMissing ? "API Key Needed" : (data.city?.name || data.db_city_name || "Unknown");
  
  // OWM provides 40 data points (every 3 hours). 
  // We'll filter to get one point per day (approx noon).
    const dailyPoints = data.list?.filter((item: { dt_txt: string }) => item.dt_txt.includes("12:00:00")).slice(0, 5) || [];
  
    const getWeatherIcon = (main?: string) => {
      if (isApiMissing || !main) return <Cloud className="w-6 h-6 text-slate-300" />;
      switch (main.toLowerCase()) {
      case 'clear': return <Sun className="w-6 h-6 text-orange-400" />;
      case 'clouds': return <Cloud className="w-6 h-6 text-slate-400" />;
      case 'rain': return <CloudRain className="w-6 h-6 text-blue-400" />;
      case 'thunderstorm': return <CloudLightning className="w-6 h-6 text-yellow-500" />;
      case 'snow': return <Snowflake className="w-6 h-6 text-sky-300" />;
      default: return <Cloud className="w-6 h-6 text-slate-400" />;
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden relative group transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/5">
      <div className="relative z-10 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <div className="flex items-center space-x-2 text-blue-500">
              <MapPin className="w-4 h-4" />
              <span className="text-[10px] font-bold uppercase tracking-widest">{isApiMissing ? 'Action Required' : 'Extended Forecast'}</span>
            </div>
            <h3 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">{cityName}</h3>
            {isApiMissing && data.db_city_name && <p className="text-[10px] text-slate-500 font-medium">{data.db_city_name}</p>}
          </div>
          <div className="flex items-start space-x-3">
            <div className={`${isApiMissing ? 'bg-rose-50 dark:bg-rose-900/20' : 'bg-blue-50 dark:bg-blue-900/20'} px-4 py-2 rounded-2xl flex items-center space-x-2`}>
               <div className={`animate-pulse w-2 h-2 rounded-full ${isApiMissing ? 'bg-rose-500' : 'bg-emerald-500'}`} />
               <p className={`text-[10px] font-bold ${isApiMissing ? 'text-rose-600 dark:text-rose-400' : 'text-blue-600 dark:text-blue-400'} uppercase tracking-tighter`}>
                 {isApiMissing ? 'Configuration Error' : 'Live Updates'}
               </p>
            </div>
            <button
              onClick={onRemove}
              aria-label={`Remove ${cityName} from tracked cities`}
              className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-all border border-slate-100 dark:border-slate-800"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 5-Day Grid */}
        <div className="grid grid-cols-5 gap-3">
          {isApiMissing ? (
            [1,2,3,4,5].map(i => (
              <div key={i} className="bg-slate-50 dark:bg-slate-950 p-4 rounded-3xl border border-slate-100 dark:border-slate-800 flex flex-col items-center justify-center space-y-3 opacity-50">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Day {i}</span>
                <Cloud className="w-6 h-6 text-slate-300" />
                <span className="text-sm font-black">-</span>
              </div>
            ))
          ) : dailyPoints.map((day, i: number) => {
            const date = new Date(day.dt_txt);
            const dayName = i === 0 ? "Today" : date.toLocaleDateString('en-US', { weekday: 'short' });
            return (
              <div key={i} className="bg-slate-50 dark:bg-slate-950 p-4 rounded-3xl border border-slate-100 dark:border-slate-800 flex flex-col items-center justify-center space-y-3 group/item hover:border-blue-500/50 transition-colors">
                <span className="text-[10px] font-bold text-slate-400 uppercase">{dayName}</span>
                <div className="transform group-hover/item:scale-110 transition-transform duration-300">
                  {getWeatherIcon(day.weather[0].main)}
                </div>
                <div className="text-center">
                  <span className="text-sm font-black">{Math.round(day.main.temp)}°</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Current Stats */}
        <div className="grid grid-cols-3 gap-4 pt-2">
          <div className="flex items-center space-x-3 px-4 py-3 bg-slate-50/50 dark:bg-slate-950/50 rounded-2xl border border-slate-100 dark:border-slate-800">
            <Droplets className="w-4 h-4 text-blue-400" />
            <div className="flex flex-col">
              <span className="text-[9px] font-bold text-slate-400 uppercase">Humidity</span>
              <span className="text-xs font-bold">{isApiMissing ? '-' : `${dailyPoints[0]?.main.humidity}%`}</span>
            </div>
          </div>
          <div className="flex items-center space-x-3 px-4 py-3 bg-slate-50/50 dark:bg-slate-950/50 rounded-2xl border border-slate-100 dark:border-slate-800">
            <Wind className="w-4 h-4 text-slate-400" />
            <div className="flex flex-col">
              <span className="text-[9px] font-bold text-slate-400 uppercase">Wind Speed</span>
              <span className="text-xs font-bold">{isApiMissing ? '-' : `${dailyPoints[0]?.wind?.speed ?? '—'} ${units === 'metric' ? 'm/s' : 'mph'}`}</span>
            </div>
          </div>
          <div className="flex items-center space-x-3 px-4 py-3 bg-slate-50/50 dark:bg-slate-950/50 rounded-2xl border border-slate-100 dark:border-slate-800">
            <Thermometer className="w-4 h-4 text-orange-400" />
            <div className="flex flex-col">
              <span className="text-[9px] font-bold text-slate-400 uppercase">Pressure</span>
              <span className="text-xs font-bold">{isApiMissing ? '-' : `${dailyPoints[0]?.main.pressure} hPa`}</span>
            </div>
          </div>
        </div>

        {isApiMissing && (
          <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-center">
            <p className="text-xs font-medium text-slate-500">Please provide an <code className="bg-slate-200 dark:bg-slate-800 px-1 rounded">OPENWEATHER_API_KEY</code> in the backend <code className="bg-slate-200 dark:bg-slate-800 px-1 rounded">.env</code> file to enable forecast data.</p>
          </div>
        )}
      </div>
    </div>
  );
};
