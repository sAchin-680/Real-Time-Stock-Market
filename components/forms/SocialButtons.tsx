"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { authClient } from "@/lib/better-auth/client";
import type { SocialProviderId } from "@/lib/better-auth/providers";

const LABELS: Record<SocialProviderId, string> = { google: "Google", apple: "Apple", microsoft: "Microsoft" };

function ProviderIcon({ id }: { id: SocialProviderId }) {
  if (id === "google")
    return (
      <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
        <path fill="#4285F4" d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.46a5.53 5.53 0 0 1-2.4 3.63v3h3.88c2.27-2.09 3.58-5.17 3.58-8.82Z" />
        <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.95-2.91l-3.88-3c-1.08.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.95H1.26v3.1A12 12 0 0 0 12 24Z" />
        <path fill="#FBBC05" d="M5.27 14.29A7.2 7.2 0 0 1 4.9 12c0-.8.14-1.57.37-2.29v-3.1H1.26a12 12 0 0 0 0 10.78l4.01-3.1Z" />
        <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.44-3.44A11.97 11.97 0 0 0 12 0 12 12 0 0 0 1.26 6.61l4.01 3.1C6.22 6.86 8.87 4.75 12 4.75Z" />
      </svg>
    );
  if (id === "apple")
    return (
      <svg viewBox="0 0 24 24" className="size-4" fill="currentColor" aria-hidden>
        <path d="M16.37 12.73c-.03-2.6 2.12-3.85 2.22-3.91-1.21-1.77-3.09-2.01-3.76-2.04-1.6-.16-3.12.94-3.93.94-.81 0-2.06-.92-3.39-.89-1.74.03-3.35 1.01-4.25 2.57-1.81 3.14-.46 7.79 1.3 10.34.86 1.25 1.89 2.65 3.24 2.6 1.3-.05 1.79-.84 3.36-.84 1.57 0 2.01.84 3.38.81 1.4-.02 2.29-1.27 3.14-2.53.99-1.45 1.4-2.86 1.42-2.93-.03-.01-2.72-1.04-2.75-4.12ZM13.79 5.1c.72-.87 1.2-2.08 1.07-3.29-1.03.04-2.28.69-3.02 1.56-.66.77-1.24 2-1.09 3.18 1.15.09 2.32-.58 3.04-1.45Z" />
      </svg>
    );
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
      <path fill="#F25022" d="M1 1h10.5v10.5H1z" />
      <path fill="#7FBA00" d="M12.5 1H23v10.5H12.5z" />
      <path fill="#00A4EF" d="M1 12.5h10.5V23H1z" />
      <path fill="#FFB900" d="M12.5 12.5H23V23H12.5z" />
    </svg>
  );
}

/** "Continue with …" buttons for the OAuth providers that are configured. */
export default function SocialButtons({ providers, callbackURL = "/" }: { providers: SocialProviderId[]; callbackURL?: string }) {
  const [pending, setPending] = useState<SocialProviderId | null>(null);
  if (!providers.length) return null;

  const start = async (provider: SocialProviderId) => {
    setPending(provider);
    const { error } = await authClient.signIn.social({ provider, callbackURL, errorCallbackURL: "/sign-in?error=oauth" });
    if (error) {
      setPending(null);
      toast.error(`${LABELS[provider]} sign-in failed`, { description: error.message || "Please try again." });
    }
  };

  return (
    <div className="grid gap-2">
      {providers.map((id) => (
        <button
          key={id}
          type="button"
          onClick={() => start(id)}
          disabled={pending !== null}
          className="flex h-10 w-full cursor-pointer items-center justify-center gap-2.5 rounded-md border border-gray-600 bg-gray-800 text-sm font-medium text-gray-100 transition-colors hover:border-gray-500 hover:bg-gray-700 disabled:opacity-60"
        >
          {pending === id ? <Loader2 className="size-4 animate-spin" /> : <ProviderIcon id={id} />}
          Continue with {LABELS[id]}
        </button>
      ))}
    </div>
  );
}
