/**
 * export.ts — Client-side CSV export utilities for the Financial Dashboard.
 * Created: 2026-03-23
 * Purpose: Convert in-memory stock history and watchlist data to downloadable CSV files.
 *          No backend involvement — runs entirely in the browser.
 */

import type { HistoryDataPoint, HistoryResponse, StockResponse } from './api';

/**
 * Aligns a shorter indicator array to the full data array length by padding
 * null values at the front. This mirrors the chart alignment logic.
 */
function alignToData(dataLength: number, indicator: number[] | undefined): (number | null)[] {
  if (!indicator || indicator.length === 0) {
    return new Array(dataLength).fill(null);
  }
  const padding = new Array(dataLength - indicator.length).fill(null);
  return [...padding, ...indicator];
}

/**
 * Formats a cell value for CSV output.
 * Nulls/undefined become empty strings; numbers are kept as-is (no quoting needed).
 */
function csvCell(value: number | null | undefined): string {
  if (value === null || value === undefined) return '';
  return String(value);
}

/**
 * Triggers a browser file download for the given CSV content string.
 */
function downloadCSV(filename: string, csvContent: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  // Revoke after a short delay to allow the download to begin
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Exports historical price data for a single stock, including all available
 * technical indicators, as a CSV file.
 *
 * Columns: date, close, volume, rsi, sma_20, ema_20, bb_upper, bb_lower, macd, macd_signal, macd_hist
 *
 * @param symbol   The ticker symbol (used in the filename).
 * @param period   The selected time period (used in the filename, e.g. "1mo").
 * @param data     The array of historical data points.
 * @param analysis Optional technical indicator arrays from the C++ engine.
 */
export function exportHistoryToCSV(
  symbol: string,
  period: string,
  data: HistoryDataPoint[],
  analysis?: HistoryResponse['analysis']
): void {
  const len = data.length;

  // Align all indicator arrays to the data length (null-padded at the front)
  const rsi        = alignToData(len, analysis?.rsi);
  const sma20      = alignToData(len, analysis?.sma_20);
  const ema20      = alignToData(len, analysis?.ema_20);
  const bbUpper    = alignToData(len, analysis?.bb_upper);
  const bbLower    = alignToData(len, analysis?.bb_lower);
  const macd       = alignToData(len, analysis?.macd);
  const macdSignal = alignToData(len, analysis?.macd_signal);
  const macdHist   = alignToData(len, analysis?.macd_hist);

  const header = 'date,close,volume,rsi,sma_20,ema_20,bb_upper,bb_lower,macd,macd_signal,macd_hist';

  const rows = data.map((point, i) => [
    point.date,
    csvCell(point.close),
    csvCell(point.volume),
    csvCell(rsi[i]),
    csvCell(sma20[i]),
    csvCell(ema20[i]),
    csvCell(bbUpper[i]),
    csvCell(bbLower[i]),
    csvCell(macd[i]),
    csvCell(macdSignal[i]),
    csvCell(macdHist[i]),
  ].join(','));

  const csvContent = [header, ...rows].join('\n');
  const today = new Date().toISOString().split('T')[0];
  downloadCSV(`${symbol}_${period}_${today}.csv`, csvContent);
}

/**
 * Exports the current watchlist snapshot (all tracked stocks and their live prices)
 * as a CSV file.
 *
 * Columns: symbol, name, price, currency, change, change_percent, market_cap, sector
 *
 * @param stocks Array of StockResponse objects (the current live prices).
 */
export function exportWatchlistToCSV(stocks: StockResponse[]): void {
  const header = 'symbol,name,price,currency,change,change_percent,market_cap,sector';

  const rows = stocks.map(s => [
    s.symbol,
    // Wrap name in quotes in case it contains commas
    `"${(s.name || '').replace(/"/g, '""')}"`,
    csvCell(s.price),
    s.currency || '',
    csvCell(s.change),
    csvCell(s.change_percent),
    csvCell(s.market_cap),
    `"${(s.sector || '').replace(/"/g, '""')}"`,
  ].join(','));

  const csvContent = [header, ...rows].join('\n');
  const today = new Date().toISOString().split('T')[0];
  downloadCSV(`watchlist_${today}.csv`, csvContent);
}
