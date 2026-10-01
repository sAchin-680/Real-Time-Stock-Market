"use client";

import { Suspense } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import InputField from "@/components/forms/InputField";
import FooterLink from "@/components/forms/FooterLink";
import DemoButton from "@/components/forms/DemoButton";
import { signInWithEmail } from "@/lib/actions/auth.actions";
import { toast } from "sonner";
import { useRouter, useSearchParams } from "next/navigation";
import { EMAIL_PATTERN } from "@/lib/constants";

const SignInForm = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignInFormData>({
    defaultValues: {
      email: "",
      password: "",
    },
    mode: "onBlur",
  });

  const onSubmit = async (data: SignInFormData) => {
    try {
      const result = await signInWithEmail(data);
      if (!result.success) {
        toast.error("Sign in failed", { description: result.error });
        return;
      }
      const next = searchParams.get("next");
      router.push(next && next.startsWith("/") && !next.startsWith("//") ? next : "/");
      router.refresh();
    } catch (e) {
      console.error(e);
      toast.error("Sign in failed", {
        description: e instanceof Error ? e.message : "Failed to sign in.",
      });
    }
  };

  return (
    <>
      <h1 className="form-title">Sign in to Tickline</h1>
      <p className="mb-6 text-sm text-gray-500">Welcome back — your positions are streaming.</p>
      <div className="mb-6">
        <DemoButton />
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <InputField
          name="email"
          label="Email"
          placeholder="abc@email.com"
          register={register}
          error={errors.email}
          validation={{
            required: "Email is required",
            pattern: { value: EMAIL_PATTERN, message: "Enter a valid email address" },
          }}
        />

        <InputField
          name="password"
          label="Password"
          placeholder="Enter your password"
          type="password"
          register={register}
          error={errors.password}
          validation={{
            required: "Password is required",
            minLength: { value: 8, message: "Password must be at least 8 characters" },
          }}
        />

        <Button
          type="submit"
          disabled={isSubmitting}
          className="yellow-btn mt-2 w-full"
        >
          {isSubmitting ? "Signing in…" : "Sign in"}
        </Button>

        <FooterLink
          text="Don't have an account?"
          linkText="Create a workspace"
          href="/sign-up"
        />
      </form>
    </>
  );
};
const SignIn = () => (
  <Suspense>
    <SignInForm />
  </Suspense>
);

export default SignIn;
