"use client";

import { useEffect, useState, useTransition } from "react";
import { Loader2, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { addToWatchlist, removeFromWatchlist } from "@/lib/actions/watchlist.actions";
import { cn } from "@/lib/utils";

/** Watchlist toggle with optimistic UI; rolls back if the server rejects it. */
const WatchlistButton = ({
  symbol,
  company,
  isInWatchlist,
  showTrashIcon = false,
  type = "button",
  onWatchlistChange,
}: WatchlistButtonProps) => {
  const [added, setAdded] = useState<boolean>(!!isInWatchlist);
  const [pending, startTransition] = useTransition();

  useEffect(() => setAdded(!!isInWatchlist), [isInWatchlist]);

  const toggle = () => {
    const next = !added;
    setAdded(next);
    onWatchlistChange?.(symbol, next);

    startTransition(async () => {
      const res = next ? await addToWatchlist({ symbol, company }) : await removeFromWatchlist(symbol);
      if (!res.ok) {
        setAdded(!next);
        onWatchlistChange?.(symbol, !next);
        toast.error("Watchlist update failed", { description: res.error });
        return;
      }
      toast.success(next ? `${symbol} added to watchlist` : `${symbol} removed from watchlist`);
    });
  };

  const label = added ? `Remove ${symbol} from watchlist` : `Add ${symbol} to watchlist`;

  if (type === "icon") {
    return (
      <button
        type="button"
        title={label}
        aria-label={label}
        aria-pressed={added}
        disabled={pending}
        onClick={toggle}
        className={cn(
          "flex size-8 cursor-pointer items-center justify-center rounded-md transition-colors hover:bg-gray-700",
          added ? "text-gray-100" : "text-gray-500 hover:text-gray-100"
        )}
      >
        {showTrashIcon && added ? <Trash2 className="size-4" /> : <Star className="size-4" fill={added ? "currentColor" : "none"} />}
      </button>
    );
  }

  return (
    <Button
      type="button"
      variant={added ? "outline" : "default"}
      onClick={toggle}
      disabled={pending}
      aria-pressed={added}
      className={cn("h-10", !added && "btn-primary")}
    >
      {pending ? <Loader2 className="animate-spin" /> : <Star fill={added ? "currentColor" : "none"} className={cn(added && "text-gray-100")} />}
      {added ? "Watching" : "Add to watchlist"}
    </Button>
  );
};

export default WatchlistButton;
