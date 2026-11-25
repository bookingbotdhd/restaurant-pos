"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, type LoginDto } from "@restroos/types";
import { motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { AlertCircle } from "lucide-react";
import { AuthBrandPanel } from "@/components/layout/auth-brand-panel";
import { Logo } from "@/components/layout/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { useLogin } from "@/hooks/use-auth";
import { ApiError } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const login = useLogin();
  // Set once the server says this account uses two-factor authentication.
  const [needsCode, setNeedsCode] = useState(false);
  // Shown inline under the form (a toast vanishes before it can be read).
  const [error, setError] = useState<string | null>(null);
  const prefersReducedMotion = useReducedMotion();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginDto>({ resolver: zodResolver(loginSchema) });

  const onSubmit = (dto: LoginDto) => {
    setError(null);
    login.mutate(dto, {
      onSuccess: (data) => {
        // A delivery rider has no back-office screens: open their deliveries.
        const user = (data as { user?: { roleName?: string; permissions?: string[] } }).user;
        const rider = user?.roleName === "DELIVERY_STAFF" && user.permissions?.includes("delivery.rider");
        router.push(rider ? "/my-deliveries" : "/dashboard");
      },
      onError: (err) => {
        if (err instanceof ApiError && err.message === "TWO_FACTOR_REQUIRED") {
          setNeedsCode(true);
          return;
        }
        if (err instanceof ApiError && err.status >= 500) {
          setError("The server is having a problem right now. Please try again in a minute.");
        } else if (err instanceof ApiError) {
          setError(err.message);
        } else {
          setError("Can't reach the server. Check your internet connection and try again.");
        }
      },
    });
  };

  return (
    <main className="grid min-h-dvh flex-1 bg-background lg:grid-cols-[1.05fr_1fr]">
      <AuthBrandPanel
        headline="Run your restaurant, beautifully."
        subhead="Orders, tables, kitchen and billing — one calm screen for the busiest hour of service."
      />

      <div className="relative flex items-center justify-center px-4 py-10">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-[320px] bg-[radial-gradient(50%_50%_at_50%_0%,color-mix(in_oklch,var(--primary),transparent_90%),transparent)] lg:hidden"
        />
        <motion.div
          initial={prefersReducedMotion ? false : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="relative w-full max-w-sm"
        >
          <div className="mb-8 flex flex-col items-start gap-3">
            <Link href="/" className="lg:hidden" aria-label="RestroOS home">
              <Logo size={44} />
            </Link>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">Welcome back</h1>
            <p className="text-sm text-muted-foreground">Sign in to manage your restaurant</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Email or phone number</Label>
              <Input
                id="email"
                type="text"
                autoComplete="username"
                inputMode="email"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                enterKeyHint="next"
                autoFocus
                placeholder="you@restaurant.com or phone number"
                {...register("email")}
              />
              {errors.email && (
                <p className="text-xs text-destructive">{errors.email.message}</p>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="password">Password</Label>
              <PasswordInput
                id="password"
                autoComplete="current-password"
                enterKeyHint="go"
                placeholder="Your password"
                {...register("password")}
              />
              {errors.password && (
                <p className="text-xs text-destructive">{errors.password.message}</p>
              )}
            </div>

            {needsCode && (
              <div className="flex flex-col gap-2">
                <Label htmlFor="totp">Verification code</Label>
                <Input
                  id="totp"
                  inputMode="text"
                  autoComplete="one-time-code"
                  autoFocus
                  placeholder="6-digit code or recovery code"
                  {...register("totp")}
                />
                <p className="text-xs text-muted-foreground">
                  Open your authenticator app, or use one of your recovery codes.
                </p>
                {errors.totp && <p className="text-xs text-destructive">{errors.totp.message}</p>}
              </div>
            )}

            {error && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <Button type="submit" size="lg" className="mt-2 w-full" disabled={login.isPending}>
              {login.isPending ? "Signing in…" : "Sign in"}
            </Button>
          </form>

          <p className="mt-8 text-center text-sm text-muted-foreground">
            New restaurant?{" "}
            <Link href="/signup" className="font-medium text-primary hover:underline">
              Create an account
            </Link>
          </p>
          <p className="mt-6 text-center text-xs text-muted-foreground lg:hidden">
            RestroOS · Powered by Shibam Solutions
          </p>
        </motion.div>
      </div>
    </main>
  );
}
