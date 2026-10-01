import Link from "next/link";
import DemoButton from "@/components/forms/DemoButton";
import SocialButtons from "@/components/forms/SocialButtons";
import type { SocialProviderId } from "@/lib/better-auth/providers";

const Divider = ({ label }: { label: string }) => (
  <div className="flex items-center gap-3 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-gray-500">
    <span className="h-px flex-1 bg-gray-600" />
    {label}
    <span className="h-px flex-1 bg-gray-600" />
  </div>
);

/** Shared auth column: heading, demo, OAuth providers, email form, consent. */
export default function AuthShell({
  title,
  subtitle,
  providers,
  consent,
  children,
}: {
  title: string;
  subtitle: string;
  providers: SocialProviderId[];
  consent?: boolean;
  children: React.ReactNode;
}) {
  return (
    <>
      <h1 className="form-title">{title}</h1>
      <p className="mb-6 text-sm text-gray-500">{subtitle}</p>

      <div className="space-y-4">
        <DemoButton />
        {providers.length > 0 && (
          <>
            <Divider label="or continue with" />
            <SocialButtons providers={providers} />
          </>
        )}
        <Divider label="or with email" />
      </div>

      <div className="mt-4">{children}</div>

      {consent && (
        <p className="mt-6 text-center text-[11px] leading-relaxed text-gray-500">
          By continuing you agree to the{" "}
          <Link href="/terms" className="text-gray-400 underline underline-offset-2 hover:text-gray-100">Terms of Service</Link> and{" "}
          <Link href="/privacy" className="text-gray-400 underline underline-offset-2 hover:text-gray-100">Privacy Policy</Link>.
        </p>
      )}
    </>
  );
}
