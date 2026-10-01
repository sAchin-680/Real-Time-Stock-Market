import 'server-only';

import { logger } from '@/lib/logger';
import { getCompanyNews, getMarketNews, isMarketDataConfigured } from '@/lib/server/finnhub';
import { formatArticle, getDateRange, validateArticle } from '@/lib/utils';

const MAX_ARTICLES = 6;

export async function getNews(symbols?: string[], maxArticles = MAX_ARTICLES): Promise<MarketNewsArticle[]> {
  if (!isMarketDataConfigured()) return [];

  const range = getDateRange(5);
  const cleanSymbols = [...new Set((symbols || []).map((s) => s?.trim().toUpperCase()).filter(Boolean))];

  if (cleanSymbols.length > 0) {
    const perSymbol: Record<string, RawNewsArticle[]> = {};
    await Promise.all(
      cleanSymbols.map(async (sym) => {
        try {
          perSymbol[sym] = (await getCompanyNews(sym, range.from, range.to)).filter(validateArticle);
        } catch (e) {
          logger.warn('news.company_failed', { symbol: sym, error: e });
          perSymbol[sym] = [];
        }
      })
    );

    // Round-robin across symbols so one noisy ticker doesn't crowd out the rest.
    const collected: MarketNewsArticle[] = [];
    for (let round = 0; round < maxArticles && collected.length < maxArticles; round++) {
      for (const sym of cleanSymbols) {
        const article = perSymbol[sym]?.shift();
        if (!article) continue;
        collected.push(formatArticle(article, true, sym, round));
        if (collected.length >= maxArticles) break;
      }
    }

    if (collected.length > 0) {
      return collected.sort((a, b) => (b.datetime || 0) - (a.datetime || 0));
    }
  }

  try {
    const seen = new Set<string>();
    const unique: RawNewsArticle[] = [];
    for (const art of await getMarketNews('general')) {
      if (!validateArticle(art)) continue;
      const key = art.url || art.headline || String(art.id);
      if (seen.has(key)) continue;
      seen.add(key);
      unique.push(art);
      if (unique.length >= maxArticles) break;
    }
    return unique.map((a, idx) => formatArticle(a, false, undefined, idx));
  } catch (err) {
    logger.error('news.general_failed', { error: err });
    return [];
  }
}

