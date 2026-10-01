import { ExternalLink, Newspaper } from "lucide-react";
import { formatTimeAgo } from "@/lib/utils";
import { EmptyState } from "@/components/finance/primitives";

export default function NewsGrid({ articles, columns = 3 }: { articles: MarketNewsArticle[]; columns?: 2 | 3 }) {
  if (!articles.length) {
    return <EmptyState icon={<Newspaper className="size-5" />} title="No news right now" description="Check back during market hours." />;
  }

  return (
    <ul className={`grid gap-px bg-gray-600/40 sm:grid-cols-2 ${columns === 3 ? "xl:grid-cols-3" : ""}`}>
      {articles.map((a) => (
        <li key={`${a.id}-${a.url}`} className="bg-gray-800">
          <a href={a.url} target="_blank" rel="noopener noreferrer" className="group flex h-full flex-col gap-2 p-4 transition-colors hover:bg-gray-700/40 md:p-5">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              {a.related && a.category === "company" && <span className="num rounded bg-gray-700 px-1.5 py-0.5 text-gray-100">{a.related}</span>}
              <span className="truncate">{a.source}</span>
              <span aria-hidden>·</span>
              <time dateTime={new Date(a.datetime * 1000).toISOString()}>{formatTimeAgo(a.datetime)}</time>
            </div>
            <h3 className="line-clamp-2 font-semibold leading-snug text-gray-100 group-hover:text-white">{a.headline}</h3>
            <p className="line-clamp-2 text-sm text-gray-500">{a.summary}</p>
            <span className="mt-auto inline-flex items-center gap-1 pt-1 text-xs font-medium text-gray-400">
              Read story <ExternalLink className="size-3" />
            </span>
          </a>
        </li>
      ))}
    </ul>
  );
}
