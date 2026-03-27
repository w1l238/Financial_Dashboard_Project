"use client";

/**
 * StockHistoryChart.tsx — Interactive stock price chart with toggleable technical indicators.
 * Updated: 2026-03-23
 * Features: SMA-20, EMA-20, Bollinger Bands, MACD (via C++ engine), RSI badge, MACD badge.
 */

import React, { useRef, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ScriptableContext,
  ChartData,
  ChartOptions
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { HistoryDataPoint } from '@/lib/api';
import { Info, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface AnalysisData {
  rsi?: number[];
  sma_20?: number[];
  ema_20?: number[];
  bb_upper?: number[];
  bb_middle?: number[];
  bb_lower?: number[];
  macd?: number[];
  macd_signal?: number[];
  macd_hist?: number[];
}

interface StockHistoryChartProps {
  symbol: string;
  data: HistoryDataPoint[];
  currency?: string;
  analysis?: AnalysisData;
  isLoading?: boolean;
}

/** Indicator toggle key type for type safety */
type IndicatorKey = 'sma_20' | 'ema_20' | 'bb' | 'macd';

const INDICATOR_LABELS: Record<IndicatorKey, string> = {
  sma_20: 'SMA-20',
  ema_20: 'EMA-20',
  bb: 'Bollinger',
  macd: 'MACD',
};

const INDICATOR_DESCRIPTIONS: Record<IndicatorKey, string> = {
  sma_20: 'Simple Moving Average (20): average closing price over the last 20 periods. Smooths noise to show trend direction.',
  ema_20: 'Exponential Moving Average (20): like SMA but weights recent prices more heavily, reacting faster to price changes.',
  bb: 'Bollinger Bands (20, 2σ): upper/lower bands are ±2 standard deviations from the 20-period SMA. Widening bands = higher volatility.',
  macd: 'MACD (12/26/9): momentum indicator showing the difference between two EMAs. When MACD crosses above the signal line, it\'s bullish.',
};

/** Small tooltip with an info icon */
const InfoBadge = ({ label, description }: { label: string; description: string }) => {
  const [show, setShow] = useState(false);
  return (
    <div className="relative flex items-center" onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none mr-1">{label}</span>
      <Info className="w-2.5 h-2.5 text-slate-300 hover:text-blue-500 transition-colors cursor-help" />
      <AnimatePresence>
        {show && (
          <motion.div
            initial={{ opacity: 0, y: 5, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 5, scale: 0.9 }}
            className="absolute bottom-full left-0 mb-2 w-52 p-3 bg-slate-900 text-white text-[10px] rounded-xl shadow-2xl z-50 border border-slate-700 pointer-events-none"
          >
            <div className="font-bold mb-1 text-blue-400">{label}</div>
            <div className="text-slate-300 leading-relaxed font-medium">{description}</div>
            <div className="absolute -bottom-1 left-2 w-2 h-2 bg-slate-900 border-r border-b border-slate-700 rotate-45" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

/**
 * Pads a shorter indicator array with leading nulls so it aligns with the
 * full data array in the chart (both arrays end at the same data point).
 */
function alignIndicator(data: HistoryDataPoint[], indicator: number[] | undefined): (number | null)[] {
  if (!indicator || indicator.length === 0) return [];
  return [
    ...new Array(data.length - indicator.length).fill(null),
    ...indicator,
  ];
}

/**
 * Enhanced Stock History Chart with toggelable technical indicator overlays.
 */
const StockHistoryChart: React.FC<StockHistoryChartProps> = ({
  symbol,
  data,
  currency = 'USD',
  analysis,
  isLoading,
}) => {
  const chartRef = useRef<ChartJS<'line'>>(null);
  // Start with SMA-20 active by default (preserves existing behaviour)
  const [activeIndicators, setActiveIndicators] = useState<Set<IndicatorKey>>(new Set(['sma_20']));

  const toggleIndicator = (key: IndicatorKey) => {
    setActiveIndicators(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  if (isLoading) {
    return (
      <div className="w-full h-full flex flex-col justify-center items-center space-y-4">
        <div className="animate-pulse bg-slate-100 dark:bg-slate-800 h-full w-full rounded-2xl" />
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center text-slate-400 italic">
        No historical data available
      </div>
    );
  }

  const latestPrice = data[data.length - 1].close;
  const initialPrice = data[0].close;
  const priceChange = latestPrice - initialPrice;
  const percentChange = (priceChange / initialPrice) * 100;
  const isPositive = priceChange >= 0;

  // Pre-align all indicator arrays to the chart data length
  const smaAligned  = alignIndicator(data, analysis?.sma_20);
  const emaAligned  = alignIndicator(data, analysis?.ema_20);
  const bbUpperAlgn = alignIndicator(data, analysis?.bb_upper);
  const bbLowerAlgn = alignIndicator(data, analysis?.bb_lower);

  // Determine which datasets to include based on toggle state
  const extraDatasets: ChartData<'line'>['datasets'] = [];

  if (activeIndicators.has('sma_20') && smaAligned.length > 0) {
    extraDatasets.push({
      label: 'SMA-20',
      data: smaAligned as number[],
      fill: false,
      borderColor: 'rgba(245, 158, 11, 0.85)',
      borderWidth: 1.5,
      borderDash: [5, 5],
      tension: 0.4,
      pointRadius: 0,
    });
  }

  if (activeIndicators.has('ema_20') && emaAligned.length > 0) {
    extraDatasets.push({
      label: 'EMA-20',
      data: emaAligned as number[],
      fill: false,
      borderColor: 'rgba(59, 130, 246, 0.85)',
      borderWidth: 1.5,
      borderDash: [4, 4],
      tension: 0.4,
      pointRadius: 0,
    });
  }

  if (activeIndicators.has('bb') && bbUpperAlgn.length > 0) {
    // Upper band — fills downward to the lower band via Chart.js fill: '+1'
    extraDatasets.push({
      label: 'BB Upper',
      data: bbUpperAlgn as number[],
      fill: '+1',
      borderColor: 'rgba(168, 85, 247, 0.6)',
      backgroundColor: 'rgba(168, 85, 247, 0.06)',
      borderWidth: 1,
      borderDash: [3, 3],
      tension: 0.4,
      pointRadius: 0,
    });
    // Lower band
    extraDatasets.push({
      label: 'BB Lower',
      data: bbLowerAlgn as number[],
      fill: false,
      borderColor: 'rgba(168, 85, 247, 0.6)',
      borderWidth: 1,
      borderDash: [3, 3],
      tension: 0.4,
      pointRadius: 0,
    });
  }

  const chartData: ChartData<'line'> = {
    labels: data.map(point => point.date),
    datasets: [
      {
        label: `${symbol}`,
        data: data.map(point => point.close),
        fill: true,
        borderColor: isPositive ? 'rgb(16, 185, 129)' : 'rgb(239, 68, 68)',
        backgroundColor: (context: ScriptableContext<'line'>) => {
          const ctx = context.chart.ctx;
          const gradient = ctx.createLinearGradient(0, 0, 0, 400);
          gradient.addColorStop(0, isPositive ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)');
          gradient.addColorStop(1, 'rgba(16, 185, 129, 0)');
          return gradient;
        },
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 6,
        pointHoverBackgroundColor: isPositive ? 'rgb(16, 185, 129)' : 'rgb(239, 68, 68)',
        pointHoverBorderColor: '#fff',
        pointHoverBorderWidth: 2,
        borderWidth: 2.5,
      },
      ...extraDatasets,
    ],
  };

  const chartOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        mode: 'index',
        intersect: false,
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        titleFont: { size: 11, weight: 'bold' },
        bodyFont: { size: 12, weight: 'bold' },
        padding: 12,
        cornerRadius: 12,
        displayColors: true,
        callbacks: {
          label: (context) => {
            const val = context.parsed.y;
            return val !== null
              ? ` ${val.toLocaleString('en-US', { style: 'currency', currency })}`
              : '';
          },
        },
      },
    },
    scales: {
      x: {
        display: true,
        grid: { display: false },
        ticks: {
          maxRotation: 0,
          autoSkip: true,
          maxTicksLimit: 6,
          color: 'rgb(148, 163, 184)',
          font: { size: 9, weight: 'bold' },
        },
      },
      y: {
        position: 'right',
        grid: { display: true, color: 'rgba(226, 232, 240, 0.05)' },
        ticks: {
          color: 'rgb(148, 163, 184)',
          font: { size: 10, weight: 'bold' },
          callback: (value) =>
            value.toLocaleString('en-US', { style: 'currency', currency, maximumSignificantDigits: 3 }),
        },
      },
    },
    interaction: { mode: 'nearest', axis: 'x', intersect: false },
  };

  // Derived badge values
  const latestRSI    = analysis?.rsi?.at(-1) ?? null;
  const latestMACD   = analysis?.macd?.at(-1) ?? null;
  const latestSignal = analysis?.macd_signal?.at(-1) ?? null;
  const latestHist   = analysis?.macd_hist?.at(-1) ?? null;

  // Determine which toggle buttons are available (only show if data exists)
  const availableToggles: IndicatorKey[] = [];
  if (analysis?.sma_20?.length)  availableToggles.push('sma_20');
  if (analysis?.ema_20?.length)  availableToggles.push('ema_20');
  if (analysis?.bb_upper?.length) availableToggles.push('bb');
  if (analysis?.macd?.length)    availableToggles.push('macd');

  return (
    <div className="w-full h-full flex flex-col">
      {/* ── Top Stats Row ─────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between mb-4 px-1">
        {/* Left: period change + RSI + MACD badges */}
        <div className="flex items-center space-x-4 flex-wrap gap-y-2">
          {/* Period change */}
          <div className="flex flex-col">
            <InfoBadge
              label="Period Change"
              description="Absolute and percentage difference between the first and last closing price in the selected timeframe."
            />
            <div className={`flex items-baseline space-x-1 ${isPositive ? 'text-emerald-500' : 'text-rose-500'}`}>
              <span className="text-sm font-black">{isPositive ? '+' : ''}{priceChange.toFixed(2)}</span>
              <span className="text-[10px] font-bold">({percentChange.toFixed(2)}%)</span>
            </div>
          </div>

          {/* RSI badge */}
          {latestRSI !== null && (
            <div className="flex flex-col border-l border-slate-100 dark:border-slate-800 pl-4">
              <InfoBadge
                label="RSI (14)"
                description="Relative Strength Index: measures momentum on a 0-100 scale. Above 70 = overbought, below 30 = oversold."
              />
              <span className={`text-sm font-black ${latestRSI > 70 ? 'text-rose-500' : latestRSI < 30 ? 'text-emerald-500' : 'text-blue-500'}`}>
                {latestRSI.toFixed(2)}
              </span>
            </div>
          )}

          {/* MACD badge — only shown when MACD toggle is active */}
          {activeIndicators.has('macd') && latestMACD !== null && latestSignal !== null && (
            <div className="flex flex-col border-l border-slate-100 dark:border-slate-800 pl-4">
              <InfoBadge
                label="MACD (12/26/9)"
                description="Difference between EMA-12 and EMA-26. When MACD crosses above the signal line it is bullish; below is bearish."
              />
              <div className="flex items-center space-x-1.5">
                <span className={`text-sm font-black ${latestHist !== null && latestHist >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {latestMACD.toFixed(3)}
                </span>
                {latestHist !== null && (
                  latestHist > 0
                    ? <TrendingUp className="w-3 h-3 text-emerald-500" />
                    : latestHist < 0
                      ? <TrendingDown className="w-3 h-3 text-rose-500" />
                      : <Minus className="w-3 h-3 text-slate-400" />
                )}
                <span className="text-[10px] text-slate-400 font-medium">sig {latestSignal.toFixed(3)}</span>
              </div>
            </div>
          )}
        </div>

        {/* Right: engine badge */}
        <div className="bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg flex items-center h-6 shrink-0">
          <span className="text-[8px] font-black text-slate-500 uppercase tracking-wider">Engine: C++</span>
        </div>
      </div>

      {/* ── Indicator Toggle Buttons ──────────────────────────────────────── */}
      {availableToggles.length > 0 && (
        <div className="flex items-center space-x-2 mb-4 px-1 flex-wrap gap-y-1.5">
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mr-1">Overlays</span>
          {availableToggles.map((key) => {
            const isActive = activeIndicators.has(key);
            return (
              <button
                key={key}
                onClick={() => toggleIndicator(key)}
                aria-pressed={isActive}
                title={INDICATOR_DESCRIPTIONS[key]}
                className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all border ${
                  isActive
                    ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400'
                    : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                }`}
              >
                {INDICATOR_LABELS[key]}
              </button>
            );
          })}
        </div>
      )}

      {/* ── Chart ─────────────────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 relative">
        <Line ref={chartRef} data={chartData} options={chartOptions} />
      </div>
    </div>
  );
};

export default StockHistoryChart;
