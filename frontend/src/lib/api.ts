/**
 * API utility for communicating with the FastAPI backend.
 * Now uses the shared ApiClient for consistent request/error handling.
 */
import { apiClient } from './api-client';

export interface WeatherResponse {
  name: string;
  main: {
    temp: number;
    humidity: number;
    pressure: number;
  };
  weather: Array<{
    main: string;
    description: string;
    icon: string;
  }>;
  is_mock?: boolean;
  is_api_missing?: boolean;
}

export interface StockResponse {
  symbol: string;
  name: string;
  price: number;
  currency: string;
  change: number;
  change_percent: number;
  market_cap: number;
  sector: string;
}

export interface HistoryDataPoint {
  date: string;
  close: number;
  volume: number;
}

export interface HistoryResponse {
  symbol: string;
  history: HistoryDataPoint[];
  analysis?: {
    // Original indicators
    rsi?: number[];
    sma_20?: number[];
    // Phase 2 indicators
    ema_20?: number[];
    bb_upper?: number[];
    bb_middle?: number[];
    bb_lower?: number[];
    macd?: number[];
    macd_signal?: number[];
    macd_hist?: number[];
  };
  engine?: string;
}

export interface UserResponse {
  id: number;
  username: string;
  full_name?: string;
  role: string;
  theme: string;
  preferred_units: 'metric' | 'imperial';
  preferred_currency: string;
  weather_enabled: boolean;
  tracked_stocks: Array<{ id: number; symbol: string }>;
  weather_locations: Array<{ id: number; city_name: string; is_primary: boolean }>;
}

export interface UserUpdateAdmin {
  username?: string;
  full_name?: string;
  password?: string;
  current_password?: string;
  role?: string;
  theme?: string;
  preferred_units?: 'metric' | 'imperial';
  preferred_currency?: string;
  weather_enabled?: boolean;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
}

// Local storage helpers
export const getLocalTheme = () => typeof window !== 'undefined' ? localStorage.getItem('fincast_theme') as 'light' | 'dark' | null : null;
export const setLocalTheme = (theme: 'light' | 'dark') => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('fincast_theme', theme);
    if (theme === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }
};

export const api = {
  /**
   * --- Authentication ---
   */
  async login(username: string, password: string): Promise<TokenResponse> {
    const formData = new URLSearchParams();
    formData.append('username', username);
    formData.append('password', password);

    const data = await apiClient.post<TokenResponse>('/api/auth/token', formData, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    
    if (typeof window !== 'undefined') {
      localStorage.setItem('fincast_token', data.access_token);
    }
    return data;
  },

  async register(username: string, password: string): Promise<UserResponse> {
    return apiClient.post<UserResponse>('/api/auth/register', { username, password });
  },

  logout() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('fincast_token');
    }
  },

  isAuthenticated(): boolean {
    return typeof window !== 'undefined' && !!localStorage.getItem('fincast_token');
  },

  /**
   * --- Data Fetching ---
   */
  async getWeatherStatus(): Promise<{ api_key_configured: boolean }> {
    return apiClient.get<{ api_key_configured: boolean }>('/api/weather/status');
  },

  async getWeather(city: string = 'London', units: string = 'metric'): Promise<WeatherResponse> {
    try {
      return await apiClient.get<WeatherResponse>(`/api/weather/?city=${encodeURIComponent(city)}&units=${units}`);
    } catch (e: unknown) {
      if (e instanceof Error && (e.message.includes('401') || e.message.includes('503') || e.message.toLowerCase().includes('api key')))
        return { is_api_missing: true } as unknown as WeatherResponse;
      throw e;
    }
  },

  async getForecast(city: string = 'London', units: string = 'metric'): Promise<unknown> {
    try {
      return await apiClient.get<unknown>(`/api/weather/forecast?city=${encodeURIComponent(city)}&units=${units}`);
    } catch (e: unknown) {
      if (e instanceof Error && (e.message.includes('401') || e.message.includes('503') || e.message.toLowerCase().includes('api key')))
        return { is_api_missing: true };
      throw e;
    }
  },

  async searchCities(query: string): Promise<Array<{ name: string; full_name: string }>> {
    if (query.length < 2) return [];
    try {
      return await apiClient.get<Array<{ name: string; full_name: string }>>(`/api/weather/search?q=${encodeURIComponent(query)}`);
    } catch {
      return [];
    }
  },

  async searchStocks(query: string): Promise<Array<{ symbol: string; name: string }>> {
    if (query.length < 1) return [];
    try {
      return await apiClient.get<Array<{ symbol: string; name: string }>>(`/api/stocks/search?q=${encodeURIComponent(query)}`);
    } catch {
      return [];
    }
  },

  async getStockPrice(symbol: string, currency?: string): Promise<StockResponse> {
    let url = `/api/stocks/?symbol=${encodeURIComponent(symbol)}`;
    if (currency) url += `&currency=${encodeURIComponent(currency)}`;
    return apiClient.get<StockResponse>(url);
  },

  async getStockHistory(symbol: string, period: string = '1mo', interval: string = '1d', currency?: string): Promise<HistoryResponse> {
    let url = `/api/stocks/history?symbol=${encodeURIComponent(symbol)}&period=${period}&interval=${interval}`;
    if (currency) url += `&currency=${encodeURIComponent(currency)}`;
    return apiClient.get<HistoryResponse>(url);
  },

  /**
   * --- User Preferences (Authenticated) ---
   */
  async getUserPreferences(): Promise<UserResponse> {
    return apiClient.get<UserResponse>('/api/users/me');
  },

  async addStockTicker(symbol: string): Promise<UserResponse> {
    return apiClient.post<UserResponse>('/api/users/me/stocks', { symbol });
  },

  async removeStockTicker(symbol: string): Promise<UserResponse> {
    return apiClient.delete<UserResponse>(`/api/users/me/stocks/${symbol}`);
  },

  async addWeatherLocation(cityName: string): Promise<UserResponse> {
    return apiClient.post<UserResponse>('/api/users/me/weather', { city_name: cityName, is_primary: false });
  },

  async removeWeatherLocation(locationId: number): Promise<UserResponse> {
    return apiClient.delete<UserResponse>(`/api/users/me/weather/${locationId}`);
  },

  async updateTheme(theme: 'light' | 'dark'): Promise<UserResponse> {
    return apiClient.patch<UserResponse>(`/api/users/me/theme?theme=${theme}`);
  },

  async updateUnits(units: 'metric' | 'imperial'): Promise<UserResponse> {
    return apiClient.patch<UserResponse>(`/api/users/me/units?units=${units}`);
  },

  async updateCurrency(currency: string): Promise<UserResponse> {
    return apiClient.patch<UserResponse>(`/api/users/me/currency?currency=${currency}`);
  },

  async updateWeatherEnabled(enabled: boolean): Promise<UserResponse> {
    return apiClient.patch<UserResponse>(`/api/users/me/weather-enabled?enabled=${enabled}`);
  },

  /**
   * --- Administrator Management ---
   */

  /**
   * Returns a paginated slice of all users plus the total count.
   * The backend sets X-Total-Count on the response so the frontend
   * can compute total pages without a separate request.
   */
  async listAllUsers(page: number = 1, limit: number = 10): Promise<{ users: UserResponse[]; total: number }> {
    const skip = (page - 1) * limit;
    const { data, headers } = await apiClient.getWithHeaders<UserResponse[]>(
      `/api/admin/users?skip=${skip}&limit=${limit}`
    );
    const total = parseInt(headers.get('X-Total-Count') || '0', 10);
    return { users: data, total };
  },

  async adminUpdateUser(userId: number, updateData: UserUpdateAdmin): Promise<UserResponse> {
    return apiClient.patch<UserResponse>(`/api/admin/users/${userId}`, updateData);
  },

  async adminDeleteUser(userId: number): Promise<void> {
    return apiClient.delete<void>(`/api/admin/users/${userId}`);
  }
};

