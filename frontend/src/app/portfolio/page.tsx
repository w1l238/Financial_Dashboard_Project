"use client";

/**
 * portfolio/page.tsx — Portfolio / Watchlist Overview Page.
 * Created: 2026-03-23
 * Shows a summary bar, sector allocation doughnut chart, and holdings table
 * for all stocks in the user's watchlist.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import DashboardLayout, { useDashboard } from '@/components/layout/DashboardLayout';
import { api, StockResponse } from '@/lib/api';
import { ArrowUpRight, ArrowDownRight, Download } from 'lucide-react';
import { exportWatchlistToCSV } from '@/lib/export';

ChartJS.register(ArcElement, Tooltip, Legend);

// Distinct palette for sectors
const SECTOR_COLORS = [
  'rgba(59, 130, 246, 0.8)',   // blue
  'rgba(16, 185, 129, 0.8)',   // emerald
  'rgba(245, 158, 11, 0.8)',   // amber
  'rgba(168, 85, 247, 0.8)',   // purple
  'rgba(239, 68, 68, 0.8)',    // red
  'rgba(20, 184, 166, 0.8)',   // teal
  'rgba(249, 115, 22, 0.8)',   // orange
  'rgba(236, 72, 153, 0.8)',   // pink
  'rgba(99, 102, 241, 0.8)',   // indigo
  'rgba(132, 204, 22, 0.8)',   // lime
];

function formatMarketCap(value: number | null | undefined): string {
  if (!value) return '—';
  if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
  if (value >= 1e9)  return `$${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6)  return `$${(value / 1e6).toFixed(2)}M`;
  return `$${value.toLocaleString()}`;
}

export default function PortfolioPage() {
  const { userPrefs } = useDashboard();
  const [stocks, setStocks] = useState<StockResponse[]>([]);
  const [loading, setLoading] = useState(true);

  const loadStocks = useCallback(async () => {
    if (!userPrefs) return;
    setLoading(true);
    try {
      const results = await Promise.all(
        userPrefs.tracked_stocks.map(s =>
          api.getStockPrice(s.symbol, userPrefs.preferred_currency).catch(() => null)
        )
      );
      setStocks(results.filter((s): s is StockResponse => s !== null));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [userPrefs]);

  useEffect(() => {
    loadStocks();
  }, [loadStocks]);

  // Derived summary stats
  const gainers = stocks.filter(s => (s.change_percent ?? 0) >= 0).length;
  const losers  = stocks.filter(s => (s.change_percent ?? 0) < 0).length;
  const avgChange = stocks.length
    ? stocks.reduce((sum, s) => sum + (s.change_percent ?? 0), 0) / stocks.length
    : 0;

  // Sector allocation data
  const sectorMap: Record<string, number> = {};
  stocks.forEach(s => {
    const sector = s.sector || 'Unknown';
    sectorMap[sector] = (sectorMap[sector] || 0) + 1;
  });
  const sectorLabels = Object.keys(sectorMap);
  const sectorCounts = sectorLabels.map(l => sectorMap[l]);

  const doughnutData = {
    labels: sectorLabels,
    datasets: [{
      data: sectorCounts,
      backgroundColor: sectorLabels.map((_, i) => SECTOR_COLORS[i % SECTOR_COLORS.length]),
      borderWidth: 0,
    }],
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '65%',
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          padding: 16,
          font: { size: 11, weight: 'bold' as const },
          color: 'rgb(100, 116, 139)',
        },
      },
      tooltip: {
        callbacks: {
          label: (ctx: { label: string; raw: unknown }) =>
            ` ${ctx.label}: ${ctx.raw} stock${(ctx.raw as number) > 1 ? 's' : ''}`,
        },
      },
    },
  };

  // Holdings sorted by change_percent descending
  const sorted = [...stocks].sort((a, b) => (b.change_percent ?? 0) - (a.change_percent ?? 0));

  const SkeletonRow = () => (
    <tr className="animate-pulse">
      {[...Array(6)].map((_, i) => (
        <td key={i} className="px-4 py-4">
          <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-3/4" />
        </td>
      ))}
    </tr>
  );

  return (
    <DashboardLayout title="Portfolio">
      <div className="space-y-6">

        {/* ── Summary Bar ──────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Tracked', value: stocks.length, color: 'text-slate-900 dark:text-white' },
            { label: 'Gainers', value: gainers, color: 'text-emerald-500' },
            { label: 'Losers',  value: losers,  color: 'text-rose-500' },
            {
              label: 'Avg Change',
              value: `${avgChange >= 0 ? '+' : ''}${avgChange.toFixed(2)}%`,
              color: avgChange >= 0 ? 'text-emerald-500' : 'text-rose-500',
            },
          ].map(({ label, value, color }) => (
            <div
              key={label}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm"
            >
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">{label}</p>
              <p className={`text-3xl font-black tracking-tight ${color}`}>
                {loading ? <span className="animate-pulse text-slate-200 dark:text-slate-700">—</span> : value}
              </p>
            </div>
          ))}
        </div>

        {/* ── Chart + Table Row ─────────────────────────────────────────── */}
        <div className="flex flex-col lg:flex-row gap-6">

          {/* Sector Doughnut Chart */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm lg:w-[40%] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-black uppercase tracking-widest text-slate-500">Sector Allocation</h2>
              <span className="text-[10px] font-bold text-slate-400">{sectorLabels.length} Sector{sectorLabels.length !== 1 ? 's' : ''}</span>
            </div>

            {loading ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="animate-pulse w-48 h-48 rounded-full bg-slate-100 dark:bg-slate-800" />
              </div>
            ) : sectorLabels.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-slate-400 italic text-sm">
                No stocks tracked
              </div>
            ) : (
              <div className="relative flex-1 min-h-[260px]">
                <Doughnut data={doughnutData} options={doughnutOptions} />
                {/* Center label */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ paddingBottom: '40px' }}>
                  <div className="text-center">
                    <p className="text-2xl font-black text-slate-900 dark:text-white">{stocks.length}</p>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Stocks</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Holdings Table */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex-1 overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
              <h2 className="text-sm font-black uppercase tracking-widest text-slate-500">Holdings</h2>
              {stocks.length > 0 && (
                <button
                  onClick={() => exportWatchlistToCSV(stocks)}
                  aria-label="Export watchlist as CSV"
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white text-[10px] font-bold uppercase tracking-wider transition-all active:scale-95"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export CSV</span>
                </button>
              )}
            </div>

            <div className="overflow-auto flex-1">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[10px] font-bold uppercase tracking-widest text-slate-400 border-b border-slate-100 dark:border-slate-800">
                    <th className="px-4 py-3 text-left">Symbol</th>
                    <th className="px-4 py-3 text-left">Name</th>
                    <th className="px-4 py-3 text-right">Price</th>
                    <th className="px-4 py-3 text-right">Change %</th>
                    <th className="px-4 py-3 text-left">Sector</th>
                    <th className="px-4 py-3 text-right">Mkt Cap</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                  {loading
                    ? [...Array(4)].map((_, i) => <SkeletonRow key={i} />)
                    : sorted.length === 0
                      ? (
                        <tr>
                          <td colSpan={6} className="px-4 py-12 text-center text-slate-400 italic">
                            No stocks tracked yet. Add some from the Overview page.
                          </td>
                        </tr>
                      )
                      : sorted.map(s => {
                          const isPos = (s.change_percent ?? 0) >= 0;
                          return (
                            <tr
                              key={s.symbol}
                              onClick={() => window.location.href = `/?ticker=${s.symbol}`}
                              className="hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
                            >
                              <td className="px-4 py-4 font-black text-slate-900 dark:text-white">{s.symbol}</td>
                              <td className="px-4 py-4 text-slate-500 font-medium max-w-[160px] truncate">{s.name || '—'}</td>
                              <td className="px-4 py-4 text-right font-bold text-slate-900 dark:text-white">
                                {s.price != null ? s.price.toFixed(2) : '—'}
                                <span className="text-slate-400 text-[10px] ml-1">{s.currency}</span>
                              </td>
                              <td className="px-4 py-4 text-right">
                                <span className={`flex items-center justify-end font-bold ${isPos ? 'text-emerald-500' : 'text-rose-500'}`}>
                                  {isPos ? <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" /> : <ArrowDownRight className="w-3.5 h-3.5 mr-0.5" />}
                                  {Math.abs(s.change_percent ?? 0).toFixed(2)}%
                                </span>
                              </td>
                              <td className="px-4 py-4 text-slate-500 font-medium">{s.sector || '—'}</td>
                              <td className="px-4 py-4 text-right text-slate-500 font-medium">{formatMarketCap(s.market_cap)}</td>
                            </tr>
                          );
                        })
                  }
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
}
