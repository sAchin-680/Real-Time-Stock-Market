'use client';

import { useEffect, useState } from 'react';
import { getMarketStatus, type MarketStatus } from '@/lib/market-hours';
import { cn } from '@/lib/utils';

const TONE: Record<MarketStatus['session'], string> = {
  open: 'bg-[var(--gain)]',
  pre: 'bg-yellow-400',
  post: 'bg-yellow-400',
  closed: 'bg-gray-500',
};

export default function MarketStatusBadge({ className }: { className?: string }) {
  const [status, setStatus] = useState<MarketStatus | null>(null);

  useEffect(() => {
    const update = () => setStatus(getMarketStatus());
    update();
    const id = setInterval(update, 30_000);
    return () => clearInterval(id);
  }, []);

  if (!status) return null;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 rounded-full border border-gray-600 bg-gray-800 px-3 py-1 text-xs font-medium text-gray-400',
        className
      )}
      title="US equities (NYSE/Nasdaq), Eastern Time"
    >
      <span className="relative flex size-2">
        {status.isOpen && <span className={cn('absolute inline-flex size-full animate-ping rounded-full opacity-60', TONE.open)} />}
        <span className={cn('relative inline-flex size-2 rounded-full', TONE[status.session])} />
      </span>
      {status.label}
    </span>
  );
}
