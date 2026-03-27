import React from 'react';
import { TrendingUp, ArrowUpRight, ArrowDownRight, Trash2 } from 'lucide-react';
import WidgetCard from '../ui/WidgetCard';
import { motion } from 'framer-motion';

interface StockData {
  symbol: string;
  name: string;
  price: number;
  change: number;
  change_percent: number; // Aligned with API response property
  currency: string;
}

interface StockWidgetProps {
  data?: StockData;
  isLoading?: boolean;
  isActive?: boolean;
  onSelect?: (symbol: string) => void;
  onRemove?: (symbol: string) => void;
}

const getCurrencySymbol = (currency: string) => {
  if (!currency) return '$';
  switch (currency.toUpperCase()) {
    case 'USD': return '$';
    case 'EUR': return '€';
    case 'GBP': return '£';
    case 'JPY': return '¥';
    default: return currency + ' ';
  }
};

/**
 * Interactive Stock Widget with Framer Motion layout transitions.
 */
const StockWidget: React.FC<StockWidgetProps> = ({ data, isLoading, isActive, onSelect, onRemove }) => {
  if (isLoading) {
    return (
      <WidgetCard title="Loading..." icon={TrendingUp} iconColor="text-slate-300">
        <div className="animate-pulse space-y-2">
          <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded w-1/2"></div>
          <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/4"></div>
        </div>
      </WidgetCard>
    );
  }

  if (!data) return null;

  const isPositive = data.change >= 0;
  const currencySymbol = getCurrencySymbol(data.currency);
  const trend = typeof data.change_percent === 'number' ? data.change_percent : 0;

  return (
    <motion.div 
      layoutId={`card-${data.symbol}`}
      onClick={() => onSelect?.(data.symbol)}
      className={`cursor-pointer transition-shadow duration-300 group/widget relative ${isActive ? 'ring-2 ring-blue-500 rounded-2xl' : ''}`}
    >
      <WidgetCard 
        title={data.symbol} 
        icon={TrendingUp} 
        iconColor={isActive ? 'text-blue-500' : 'text-emerald-500'}
        className={isActive ? 'bg-blue-50/50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800' : 'hover:border-blue-300 dark:hover:border-blue-700'}
        titleLayoutId={`symbol-${data.symbol}`}
        headerAction={onRemove && (
          <motion.button 
            whileHover={{ scale: 1.1 }}
            className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-rose-500 transition-all active:scale-90 opacity-0 group-hover/widget:opacity-100 duration-300"
            onClick={(e) => { e.stopPropagation(); onRemove(data.symbol); }}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </motion.button>
        )}
      >
        <div className="flex flex-col">
          <div className="flex items-center space-x-2">
            <span className="text-xs text-slate-500 truncate max-w-[150px] font-medium">{data.name}</span>
          </div>
          
          <div className="flex items-baseline justify-between mt-2">
            <motion.p 
              layoutId={`price-${data.symbol}`}
              className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white"
            >
              {currencySymbol}{data.price.toFixed(2)}
            </motion.p>
            
            <motion.div 
              layoutId={`trend-${data.symbol}`}
              className={`flex items-center text-sm font-bold ${isPositive ? 'text-emerald-500' : 'text-rose-500'}`}
            >
              {isPositive ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
              <span>{Math.abs(trend).toFixed(2)}%</span>
            </motion.div>
          </div>
        </div>
      </WidgetCard>
    </motion.div>
  );
};

export default StockWidget;

