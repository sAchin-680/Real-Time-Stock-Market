"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { signInAsDemo } from "@/lib/actions/auth.actions";

/** One click into a private sandbox account with a seeded portfolio. */
export default function DemoButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const start = () =>
    startTransition(async () => {
      const res = await signInAsDemo();
      if (!res.success) {
        toast.error("Demo unavailable", { description: res.error });
        return;
      }
      router.push("/");
      router.refresh();
    });

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={start}
        disabled={pending}
        className="flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-md border border-gray-600 bg-gray-800 font-medium text-gray-100 transition-colors hover:border-gray-500 hover:bg-gray-700 disabled:opacity-60"
      >
        {pending ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
        {pending ? "Preparing your sandbox…" : "Launch live demo"}
      </button>
      <p className="text-center text-[11px] text-gray-500">No sign-up · private sandbox with a sample portfolio · resets in 24h</p>
      <div className="flex items-center gap-3 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-gray-500">
        <span className="h-px flex-1 bg-gray-600" />
        or with email
        <span className="h-px flex-1 bg-gray-600" />
      </div>
    </div>
  );
}
