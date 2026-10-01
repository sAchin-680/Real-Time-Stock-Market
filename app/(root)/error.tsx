"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/finance/primitives";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="panel">
      <EmptyState
        icon={<AlertTriangle className="size-5" />}
        title="Something went wrong"
        description={`We couldn't load this page. ${error.digest ? `Reference: ${error.digest}` : "Please try again."}`}
        action={
          <Button onClick={reset} className="btn-primary">
            Try again
          </Button>
        }
      />
    </div>
  );
}
