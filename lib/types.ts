import type { AlertCondition, AlertFrequency } from '@/lib/finance/alerts';
import type { MonthlyRealized, PortfolioSummary, TransactionSide } from '@/lib/finance/portfolio';
import type { MarketStatus } from '@/lib/market-hours';

/** Serializable shapes passed from server to client components. */

export interface LiveQuote {
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

export interface QuotesResponse {
  quotes: Record<string, LiveQuote>;
  market: MarketStatus;
  asOf: string;
}

export interface TransactionDTO {
  id: string;
  symbol: string;
  side: TransactionSide;
  quantity: number;
  price: number;
  fees: number;
  total: number;
  executedAt: string;
  notes: string;
}

export interface PortfolioSnapshot extends PortfolioSummary {
  monthlyRealized: MonthlyRealized[];
  transactionCount: number;
  marketDataAvailable: boolean;
  asOf: string;
}

export interface WatchlistRow {
  symbol: string;
  company: string;
  logo?: string;
  sector?: string;
  addedAt: string;
  price?: number;
  change?: number;
  changePercent?: number;
  marketCap?: number;
  peRatio?: number;
  week52High?: number;
  week52Low?: number;
  activeAlerts: number;
}

export interface AlertDTO {
  id: string;
  symbol: string;
  company: string;
  name: string;
  condition: AlertCondition;
  threshold: number;
  frequency: AlertFrequency;
  active: boolean;
  triggerCount: number;
  lastTriggeredAt?: string;
  createdAt: string;
  currentPrice?: number;
  changePercent?: number;
  history: { price: number; changePercent: number; triggeredAt: string }[];
}

export interface StockOverview {
  symbol: string;
  name: string;
  logo?: string;
  industry?: string;
  exchange?: string;
  currency?: string;
  country?: string;
  weburl?: string;
  ipo?: string;
  marketCap?: number;
  quote?: LiveQuote;
  metrics: {
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
  };
  inWatchlist: boolean;
  position?: {
    quantity: number;
    avgCost: number;
    costBasis: number;
    marketValue: number;
    unrealizedPnl: number;
    unrealizedPercent: number;
    realizedPnl: number;
  };
  alerts: AlertDTO[];
}
