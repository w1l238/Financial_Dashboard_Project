"use client";

import React, { useState, useEffect, useCallback } from 'react';
import DashboardLayout, { useDashboard } from '@/components/layout/DashboardLayout';
import StockWidget from '@/components/widgets/StockWidget';
import StockHistoryChart from '@/components/widgets/StockHistoryChart';
import { api, StockResponse, HistoryDataPoint } from '@/lib/api';
import { X, ArrowUpRight, ArrowDownRight, TrendingUp, Search, Plus, Loader2, Download } from 'lucide-react';
import { exportHistoryToCSV } from '@/lib/export';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Overview Page (Home).
 * Now features a true shared element transition using Framer Motion.
 */
const POLL_INTERVAL_MS = 30_000;

export default function OverviewPage() {
  const { userPrefs, refreshData } = useDashboard();
  const [loading, setLoading] = useState(true);
  const [stocks, setStocks] = useState<Record<string, StockResponse>>({});
  // Polling state
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const [selectedTicker, setSelectedTicker] = useState<string | null>(null);
  const [activePeriod, setSelectedPeriod] = useState<string>('1mo');
  const [activeHistory, setActiveHistory] = useState<HistoryDataPoint[]>([]);
  const [activeAnalysis, setActiveAnalysis] = useState<{
    rsi?: number[]; sma_20?: number[]; ema_20?: number[];
    bb_upper?: number[]; bb_middle?: number[]; bb_lower?: number[];
    macd?: number[]; macd_signal?: number[]; macd_hist?: number[];
  } | undefined>(undefined);
  const [isChartLoading, setIsChartLoading] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Array<{ symbol: string; name: string }>>([]);
  const [isSearching, setIsSearching] = useState(false);

  const fetchAnalysis = useCallback(async (ticker: string, currency?: string, period: string = '1mo') => {
    setIsChartLoading(true);
    try {
      const res = await api.getStockHistory(ticker, period, '1d', currency);
      setActiveHistory(res.history);
      setActiveAnalysis(res.analysis || undefined);
    } catch (err) { console.error(err); } 
    finally { setIsChartLoading(false); }
  }, []);

  const loadStockData = useCallback(async () => {
    if (!userPrefs) return;
    setLoading(true);
    try {
      const stockResults = await Promise.all(
        userPrefs.tracked_stocks.map(s => api.getStockPrice(s.symbol, userPrefs.preferred_currency).catch(() => null))
      );

      const stockMap: Record<string, StockResponse> = {};
      stockResults.filter((s): s is StockResponse => s !== null).forEach(s => { stockMap[s.symbol] = s; });
      setStocks(stockMap);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [userPrefs]);

  useEffect(() => {
    loadStockData();
  }, [loadStockData]);

  /**
   * Lightweight price-only refresh for the polling interval.
   * Does NOT refetch chart history — only current prices.
   * Skips silently when the browser tab is hidden.
   */
  const refreshPricesOnly = useCallback(async () => {
    if (!userPrefs || document.hidden) return;
    setIsRefreshing(true);
    try {
      const results = await Promise.all(
        userPrefs.tracked_stocks.map(s =>
          api.getStockPrice(s.symbol, userPrefs.preferred_currency).catch(() => null)
        )
      );
      setStocks(prev => {
        const next = { ...prev };
        results
          .filter((s): s is StockResponse => s !== null)
          .forEach(s => { next[s.symbol] = s; });
        return next;
      });
      setLastUpdated(new Date());
    } finally {
      setIsRefreshing(false);
    }
  }, [userPrefs]);

  // Set up a 30-second polling interval; also refresh immediately when the tab regains focus
  useEffect(() => {
    if (!userPrefs?.tracked_stocks.length) return;
    const intervalId = setInterval(refreshPricesOnly, POLL_INTERVAL_MS);
    const handleVisibilityChange = () => {
      if (!document.hidden) refreshPricesOnly();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [userPrefs, refreshPricesOnly]);

  // Search Logic
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchQuery.length >= 1) {
        setIsSearching(true);
        try {
          const res = await api.searchStocks(searchQuery);
          setSuggestions(res);
        } catch (e) { console.error(e); }
        finally { setIsSearching(false); }
      } else { setSuggestions([]); }
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleAddTicker = async (symbol: string) => {
    try {
      await api.addStockTicker(symbol);
      setSearchQuery('');
      setSuggestions([]);
      refreshData();
    } catch (e) { console.error(e); }
  };

  const handleRemoveTicker = async (symbol: string) => {
    try {
      await api.removeStockTicker(symbol);
      if (selectedTicker === symbol) handleClose();
      refreshData();
    } catch (e) { console.error(e); }
  };

  const handleSelectTicker = (ticker: string) => {
    setSelectedTicker(ticker);
    fetchAnalysis(ticker, userPrefs?.preferred_currency, activePeriod);
  };

  const handleClose = () => {
    setSelectedTicker(null);
    setActiveHistory([]);
    setActiveAnalysis(undefined);
  };

  const getCurrencySymbol = (currency: string) => {
    switch (currency?.toUpperCase()) {
      case 'USD': return '$';
      case 'EUR': return '€';
      case 'GBP': return '£';
      case 'JPY': return '¥';
      default: return '$';
    }
  };

  return (
    <DashboardLayout title="Market Overview">
      <div className="relative min-h-[800px]">
        
        <AnimatePresence>
          {!selectedTicker ? (
            <motion.div 
              key="grid"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.2 } }}
              className="space-y-8"
            >
              {/* Search Header */}
              <div className="relative bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm">
                {/* Screen reader live region — announces price refresh to assistive technologies */}
                <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
                  {!isRefreshing && lastUpdated ? `Prices updated at ${lastUpdated.toLocaleTimeString()}` : ''}
                </div>

                <div className="flex-1 relative">
                  <div className="absolute left-4 top-3.5 text-slate-400">
                    {isSearching ? <Loader2 className="w-5 h-5 animate-spin text-blue-500" /> : <Search className="w-5 h-5" />}
                  </div>
                  <input
                    type="text"
                    aria-label="Search stocks to add"
                    placeholder="Search markets to add (e.g. BTC, NVDA, TSLA)..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border-0 rounded-2xl pl-12 pr-4 py-4 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  />
                </div>

                {/* Polling refresh indicator */}
                {lastUpdated && (
                  <div className="flex items-center space-x-1.5 mt-3 text-[10px] text-slate-400">
                    {isRefreshing
                      ? <Loader2 className="w-3 h-3 animate-spin" />
                      : <div className="w-2 h-2 rounded-full bg-emerald-400" />
                    }
                    <span>{isRefreshing ? 'Refreshing prices...' : `Updated ${lastUpdated.toLocaleTimeString()}`}</span>
                  </div>
                )}

                {suggestions.length > 0 && (
                  <div className="absolute z-50 left-6 right-6 mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden max-h-64 overflow-y-auto">
                    {suggestions.map((s, i) => (
                      <button key={i} onClick={() => handleAddTicker(s.symbol)} aria-label={`Add ${s.symbol} to watchlist`} className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-slate-50 dark:hover:bg-slate-800 border-b border-slate-50 dark:border-slate-800 last:border-0">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-900 dark:text-white">{s.symbol}</span>
                          <span className="text-xs text-slate-500">{s.name}</span>
                        </div>
                        <Plus className="w-4 h-4 text-blue-500" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {userPrefs?.tracked_stocks.map(ticker => (
                  <StockWidget 
                    key={ticker.id}
                    isActive={false}
                    onSelect={handleSelectTicker}
                    onRemove={handleRemoveTicker}
                    data={stocks[ticker.symbol.toUpperCase()]}
                    isLoading={loading} 
                  />
                ))}
                {userPrefs?.tracked_stocks.length === 0 && (
                  <div className="col-span-full py-20 text-center bg-slate-50 dark:bg-slate-900/50 rounded-[3rem] border border-dashed border-slate-200 dark:border-slate-800">
                    <p className="text-slate-400 font-medium italic">No tracked stocks. Search above to add markets.</p>
                  </div>
                )}
              </section>
            </motion.div>
          ) : (
            stocks[selectedTicker] && (
              <motion.section 
                key="expanded"
                layoutId={`card-${selectedTicker}`}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="absolute inset-0 z-30 w-full bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col h-[700px]"
              >
                <div className="p-8 pb-4 flex justify-between items-start shrink-0">
                  <div className="flex flex-col space-y-1">
                    <motion.div 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                      className="flex items-center space-x-3 text-blue-600 mb-2"
                    >
                      <TrendingUp className="w-5 h-5" />
                      <span className="text-[10px] font-black uppercase tracking-[0.2em]">Performance Analytics</span>
                    </motion.div>
                    <motion.h2 
                      layoutId={`symbol-${selectedTicker}`}
                      className="text-7xl font-black tracking-tighter text-slate-900 dark:text-white leading-none"
                    >
                      {selectedTicker}
                    </motion.h2>
                    <motion.p 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.3 }}
                      className="text-lg font-medium text-slate-500 pl-1"
                    >
                      {stocks[selectedTicker].name}
                    </motion.p>
                  </div>

                  <div className="flex items-start space-x-6">
                    <div className="text-right">
                      <motion.p 
                        layoutId={`price-${selectedTicker}`}
                        className="text-4xl font-black tracking-tighter text-slate-900 dark:text-white leading-none"
                      >
                        {getCurrencySymbol(stocks[selectedTicker].currency)}{stocks[selectedTicker].price.toFixed(2)}
                      </motion.p>
                      <motion.div 
                        layoutId={`trend-${selectedTicker}`}
                        className={`flex items-center justify-end text-sm font-bold mt-2 ${stocks[selectedTicker].change >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}
                      >
                        {stocks[selectedTicker].change >= 0 ? <ArrowUpRight className="w-4 h-4 mr-1" /> : <ArrowDownRight className="w-4 h-4 mr-1" />}
                        {Math.abs(stocks[selectedTicker].change_percent).toFixed(2)}%
                      </motion.div>
                    </div>
                    
                    <button
                      onClick={() => exportHistoryToCSV(selectedTicker, activePeriod, activeHistory, activeAnalysis)}
                      aria-label="Export history as CSV"
                      className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-all active:scale-90"
                    >
                      <Download className="w-6 h-6" />
                    </button>
                    <button
                      onClick={handleClose}
                      aria-label="Close stock details"
                      className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-all active:scale-90"
                    >
                      <X className="w-6 h-6" />
                    </button>
                  </div>
                </div>

                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.35 }}
                  className="px-8 mb-4 shrink-0"
                >
                  <div className="flex bg-slate-100 dark:bg-slate-950 p-1 rounded-2xl w-fit border border-slate-200 dark:border-slate-800">
                    {['5d', '1mo', '3mo', '6mo', '1y', '5y', 'max'].map((p) => (
                      <button
                        key={p}
                        onClick={() => { setSelectedPeriod(p); fetchAnalysis(selectedTicker, userPrefs?.preferred_currency, p); }}
                        aria-pressed={activePeriod === p}
                        aria-label={`Show ${p} period`}
                        className={`px-5 py-2 rounded-xl text-xs font-bold uppercase transition-all ${activePeriod === p ? 'bg-white dark:bg-slate-800 shadow-lg text-blue-600 scale-105' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </motion.div>

                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="flex-1 px-8 pb-8 pt-4 min-h-0"
                >
                  <StockHistoryChart 
                    symbol={selectedTicker} 
                    data={activeHistory} 
                    currency={userPrefs?.preferred_currency}
                    analysis={activeAnalysis}
                    isLoading={isChartLoading} 
                  />
                </motion.div>
              </motion.section>
            )
          )}
        </AnimatePresence>
      </div>
    </DashboardLayout>
  );
}
