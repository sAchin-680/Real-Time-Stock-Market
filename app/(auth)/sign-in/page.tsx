import type { Metadata } from "next";
import AuthShell from "@/components/auth/AuthShell";
import SignInForm from "@/components/auth/SignInForm";
import { getEnabledSocialProviders } from "@/lib/better-auth/providers";

export const metadata: Metadata = { title: "Sign in" };

export default function SignInPage() {
  return (
    <AuthShell title="Sign in to Tickline" subtitle="Welcome back — your positions are streaming." providers={getEnabledSocialProviders()} consent>
      <SignInForm />
    </AuthShell>
  );
}
