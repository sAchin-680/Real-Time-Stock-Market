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
        className="flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-gray-600 bg-gray-800 font-medium text-gray-100 transition-colors hover:border-gray-500 hover:bg-gray-700 disabled:opacity-60"
      >
        {pending ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
        {pending ? "Preparing your demo…" : "Try the live demo — no sign up"}
      </button>
      <div className="flex items-center gap-3 text-xs uppercase tracking-wider text-gray-500">
        <span className="h-px flex-1 bg-gray-600" />
        or use your account
        <span className="h-px flex-1 bg-gray-600" />
      </div>
    </div>
  );
}
