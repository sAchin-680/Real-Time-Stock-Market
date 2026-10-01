'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/format';

/** Price that briefly flashes green/red when it ticks. */
export function LivePrice({ value, className, currency }: { value?: number; className?: string; currency?: string }) {
  const prev = useRef(value);
  const [flash, setFlash] = useState<'flash-up' | 'flash-down' | null>(null);

  useEffect(() => {
    if (value !== undefined && prev.current !== undefined && value !== prev.current) {
      setFlash(value > prev.current ? 'flash-up' : 'flash-down');
      const t = setTimeout(() => setFlash(null), 1200);
      prev.current = value;
      return () => clearTimeout(t);
    }
    prev.current = value;
  }, [value]);

  return (
    <span className={cn('num rounded px-1 -mx-1', flash, className)}>
      {formatCurrency(value, { currency: currency || 'USD' })}
    </span>
  );
}
