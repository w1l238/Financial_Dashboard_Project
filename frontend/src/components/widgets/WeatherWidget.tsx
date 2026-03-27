import React from 'react';
import { CloudSun } from 'lucide-react';
import WidgetCard from '../ui/WidgetCard';

interface WeatherData {
  city: string;
  temp: number;
  condition: string;
  humidity: number;
  is_api_missing?: boolean;
}

interface WeatherWidgetProps {
  data?: WeatherData;
  isLoading?: boolean;
  preferredUnits?: 'metric' | 'imperial';
}

const WeatherWidget: React.FC<WeatherWidgetProps> = ({ data, isLoading, preferredUnits = 'metric' }) => {
  const unitSymbol = preferredUnits === 'metric' ? '°C' : '°F';
  const isApiMissing = data?.is_api_missing;

  if (isLoading) {
    return (
      <WidgetCard title="Weather" icon={CloudSun} iconColor="text-blue-500">
        <div className="animate-pulse space-y-2">
          <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded w-1/2"></div>
          <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/4"></div>
        </div>
      </WidgetCard>
    );
  }

  if (!data) {
    return (
      <WidgetCard title="Weather" icon={CloudSun} iconColor="text-blue-500">
        <p className="text-slate-400 italic">No data available</p>
      </WidgetCard>
    );
  }

  return (
    <WidgetCard title="Weather" icon={CloudSun} iconColor="text-blue-500">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-3xl font-bold tracking-tight">
            {isApiMissing ? '-' : Math.round(data.temp)}{!isApiMissing && unitSymbol}
          </p>
          <p className="text-slate-500 dark:text-slate-400 font-medium capitalize">
            {isApiMissing ? 'API Key Needed' : data.condition}
          </p>
          <p className="text-xs text-slate-400 mt-1">{isApiMissing ? 'Action Required' : data.city}</p>
        </div>
        <div className="text-right flex flex-col items-end">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            {isApiMissing ? 'Action Required' : 'Humidity'}
          </span>
          <p className="text-xs font-semibold text-slate-500">
            {isApiMissing ? 'Check .env' : `${data.humidity}%`}
          </p>
        </div>
      </div>
    </WidgetCard>
  );
};

export default WeatherWidget;
