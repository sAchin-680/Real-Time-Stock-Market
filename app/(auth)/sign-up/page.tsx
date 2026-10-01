import type { Metadata } from "next";
import AuthShell from "@/components/auth/AuthShell";
import SignUpForm from "@/components/auth/SignUpForm";
import { getEnabledSocialProviders } from "@/lib/better-auth/providers";

export const metadata: Metadata = { title: "Create your workspace" };

export default function SignUpPage() {
  return (
    <AuthShell title="Create your workspace" subtitle="Free. Your profile tailors news, digests and alerts." providers={getEnabledSocialProviders()} consent>
      <SignUpForm />
    </AuthShell>
  );
}
