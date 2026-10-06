import 'server-only';

import { TTLCache, mapWithConcurrency } from '@/lib/cache';
import { getFinnhubToken } from '@/lib/env';
import { logger } from '@/lib/logger';
import { withSpan } from '@/lib/telemetry';

const BASE_URL = 'https://finnhub.io/api/v1';
const REQUEST_TIMEOUT_MS = 8_000;
const QUOTE_TTL_MS = 15_000;
const MAX_CONCURRENCY = 6;

export interface Quote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  high: number;
  low: number;
  open: number;
  prevClose: number;
  timestamp: number;
}

export interface CompanyProfile {
  symbol: string;
  name: string;
  logo?: string;
  industry?: string;
  exchange?: string;
  currency?: string;
  country?: string;
  weburl?: string;
  ipo?: string;
  marketCap?: number; // millions
  sharesOutstanding?: number; // millions
}

export interface KeyMetrics {
  beta?: number;
  peTTM?: number;
  epsTTM?: number;
  dividendYield?: number;
  week52High?: number;
  week52Low?: number;
  week52Return?: number;
  avgVolume10D?: number;
  netMargin?: number;
  roe?: number;
}

export interface SymbolSearchResult {
  symbol: string;
  description: string;
  displaySymbol?: string;
  type: string;
}

export class FinnhubError extends Error {
  constructor(
    message: string,
    readonly status?: number
  ) {
    super(message);
    this.name = 'FinnhubError';
  }
}

export const isMarketDataConfigured = () => Boolean(getFinnhubToken());

const quoteCache = new TTLCache<string, Quote | null>(QUOTE_TTL_MS, 2000);
const inflight = new Map<string, Promise<unknown>>();

async function request<T>(path: string, params: Record<string, string>, revalidateSeconds?: number): Promise<T> {
  const token = getFinnhubToken();
  if (!token) throw new FinnhubError('FINNHUB_API_KEY is not configured');

  const url = new URL(`${BASE_URL}${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  url.searchParams.set('token', token);

  const init: RequestInit & { next?: { revalidate?: number } } = revalidateSeconds
    ? { next: { revalidate: revalidateSeconds } }
    : { cache: 'no-store' };

  // The URL carries the API token, so the span records only the route.
  return withSpan(`finnhub ${path}`, { 'finnhub.route': path, 'finnhub.revalidate_s': revalidateSeconds ?? 0 }, async (span) => {
    for (let attempt = 0; attempt < 3; attempt++) {
      span.setAttribute('finnhub.attempts', attempt + 1);
      let res: Response;
      try {
        res = await fetch(url, { ...init, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
      } catch (err) {
        if (attempt === 2) throw new FinnhubError(`Network error calling ${path}: ${(err as Error).message}`);
        await sleep(250 * 2 ** attempt);
        continue;
      }

      span.setAttribute('http.response.status_code', res.status);
      if (res.ok) return (await res.json()) as T;

      const retryable = res.status === 429 || res.status >= 500;
      if (!retryable || attempt === 2) {
        throw new FinnhubError(`Finnhub ${path} failed with ${res.status}`, res.status);
      }
      const retryAfter = Number(res.headers.get('retry-after'));
      await sleep(Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 400 * 2 ** attempt);
    }
    throw new FinnhubError(`Finnhub ${path} failed`);
  });
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function dedupe<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const existing = inflight.get(key) as Promise<T> | undefined;
  if (existing) return existing;
  const p = fn().finally(() => inflight.delete(key));
  inflight.set(key, p);
  return p;
}

const num = (v: unknown): number | undefined => (typeof v === 'number' && Number.isFinite(v) ? v : undefined);

export async function getQuote(rawSymbol: string): Promise<Quote | null> {
  const symbol = rawSymbol.toUpperCase();
  const cached = quoteCache.get(symbol);
  if (cached !== undefined) return cached;

  return dedupe(`quote:${symbol}`, async () => {
    try {
      const q = await request<Record<string, number>>('/quote', { symbol });
      // Finnhub returns zeros for unknown symbols.
      const quote: Quote | null =
        num(q.c) && q.c > 0
          ? {
              symbol,
              price: q.c,
              change: num(q.d) ?? 0,
              changePercent: num(q.dp) ?? 0,
              high: num(q.h) ?? q.c,
              low: num(q.l) ?? q.c,
              open: num(q.o) ?? q.c,
              prevClose: num(q.pc) ?? q.c,
              timestamp: num(q.t) ?? Math.floor(Date.now() / 1000),
            }
          : null;
      quoteCache.set(symbol, quote);
      return quote;
    } catch (err) {
      logger.warn('finnhub.quote_failed', { symbol, error: err });
      return null;
    }
  });
}

export async function getQuotes(symbols: readonly string[]): Promise<Record<string, Quote>> {
  const unique = [...new Set(symbols.map((s) => s.toUpperCase()).filter(Boolean))];
  if (!unique.length || !isMarketDataConfigured()) return {};
  const quotes = await mapWithConcurrency(unique, MAX_CONCURRENCY, getQuote);
  return Object.fromEntries(quotes.filter((q): q is Quote => q !== null).map((q) => [q.symbol, q]));
}

export async function getProfile(rawSymbol: string): Promise<CompanyProfile | null> {
  const symbol = rawSymbol.toUpperCase();
  return dedupe(`profile:${symbol}`, async () => {
    try {
      const p = await request<Record<string, unknown>>('/stock/profile2', { symbol }, 86_400);
      if (!p || !p.name) return null;
      return {
        symbol,
        name: String(p.name),
        logo: (p.logo as string) || undefined,
        industry: (p.finnhubIndustry as string) || undefined,
        exchange: (p.exchange as string) || undefined,
        currency: (p.currency as string) || undefined,
        country: (p.country as string) || undefined,
        weburl: (p.weburl as string) || undefined,
        ipo: (p.ipo as string) || undefined,
        marketCap: num(p.marketCapitalization),
        sharesOutstanding: num(p.shareOutstanding),
      };
    } catch (err) {
      logger.warn('finnhub.profile_failed', { symbol, error: err });
      return null;
    }
  });
}

export async function getProfiles(symbols: readonly string[]): Promise<Record<string, CompanyProfile>> {
  const unique = [...new Set(symbols.map((s) => s.toUpperCase()))];
  if (!unique.length || !isMarketDataConfigured()) return {};
  const profiles = await mapWithConcurrency(unique, MAX_CONCURRENCY, getProfile);
  return Object.fromEntries(profiles.filter((p): p is CompanyProfile => p !== null).map((p) => [p.symbol, p]));
}

export async function getMetrics(rawSymbol: string): Promise<KeyMetrics | null> {
  const symbol = rawSymbol.toUpperCase();
  return dedupe(`metrics:${symbol}`, async () => {
    try {
      const res = await request<{ metric?: Record<string, unknown> }>('/stock/metric', { symbol, metric: 'all' }, 21_600);
      const m = res?.metric;
      if (!m) return null;
      return {
        beta: num(m.beta),
        peTTM: num(m.peTTM) ?? num(m.peBasicExclExtraTTM),
        epsTTM: num(m.epsTTM) ?? num(m.epsBasicExclExtraItemsTTM),
        dividendYield: num(m.dividendYieldIndicatedAnnual) ?? num(m.currentDividendYieldTTM),
        week52High: num(m['52WeekHigh']),
        week52Low: num(m['52WeekLow']),
        week52Return: num(m['52WeekPriceReturnDaily']),
        avgVolume10D: num(m['10DayAverageTradingVolume']),
        netMargin: num(m.netProfitMarginTTM),
        roe: num(m.roeTTM),
      };
    } catch (err) {
      logger.warn('finnhub.metrics_failed', { symbol, error: err });
      return null;
    }
  });
}

export async function getMetricsMany(symbols: readonly string[]): Promise<Record<string, KeyMetrics>> {
  const unique = [...new Set(symbols.map((s) => s.toUpperCase()))];
  if (!unique.length || !isMarketDataConfigured()) return {};
  const metrics = await mapWithConcurrency(unique, MAX_CONCURRENCY, async (s) => [s, await getMetrics(s)] as const);
  return Object.fromEntries(metrics.filter((m): m is readonly [string, KeyMetrics] => m[1] !== null));
}

export async function searchSymbols(query: string): Promise<SymbolSearchResult[]> {
  const res = await request<{ result?: SymbolSearchResult[] }>('/search', { q: query }, 1_800);
  return Array.isArray(res?.result) ? res.result : [];
}

export async function getCompanyNews(symbol: string, from: string, to: string): Promise<RawNewsArticle[]> {
  const res = await request<RawNewsArticle[]>('/company-news', { symbol: symbol.toUpperCase(), from, to }, 300);
  return Array.isArray(res) ? res : [];
}

export async function getMarketNews(category = 'general'): Promise<RawNewsArticle[]> {
  const res = await request<RawNewsArticle[]>('/news', { category }, 300);
  return Array.isArray(res) ? res : [];
}
