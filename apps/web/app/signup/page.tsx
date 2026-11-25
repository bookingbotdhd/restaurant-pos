"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { registerSchema, type RegisterDto } from "@restroos/types";
import { motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { StatusNote, useNoteToast } from "@/components/ui/status-note";
import { AuthBrandPanel } from "@/components/layout/auth-brand-panel";
import { Logo } from "@/components/layout/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { useRegister } from "@/hooks/use-auth";
import { ApiError } from "@/lib/api";

export default function SignupPage() {
  const router = useRouter();
  const register = useRegister();
  const { note, clear, toast } = useNoteToast();
  const prefersReducedMotion = useReducedMotion();
  const {
    register: field,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterDto>({ resolver: zodResolver(registerSchema) });

  const onSubmit = (dto: RegisterDto) => {
    register.mutate(dto, {
      onSuccess: () => router.push("/dashboard"),
      onError: (err) => {
        toast.error(err instanceof ApiError ? err.message : "Something went wrong");
      },
    });
  };

  return (
    <main className="grid min-h-dvh flex-1 bg-background lg:grid-cols-[1.05fr_1fr]">
      <AuthBrandPanel
        headline="Your restaurant, up and running today."
        subhead="Create your account and start taking orders — menu, tables and billing included from the first login."
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
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">
              Set up your restaurant
            </h1>
            <p className="text-sm text-muted-foreground">
              A few details and you&apos;re ready for service
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <Label htmlFor="restaurantName">Restaurant name</Label>
              <Input
                id="restaurantName"
                autoComplete="organization"
                placeholder="e.g. Spice Route"
                {...field("restaurantName")}
              />
              {errors.restaurantName && (
                <p className="text-xs text-destructive">{errors.restaurantName.message}</p>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="branchName">First branch name</Label>
              <Input
                id="branchName"
                placeholder="Main Branch"
                defaultValue="Main Branch"
                {...field("branchName")}
              />
              {errors.branchName && (
                <p className="text-xs text-destructive">{errors.branchName.message}</p>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="ownerName">Your name</Label>
              <Input
                id="ownerName"
                autoComplete="name"
                placeholder="e.g. Priya Sharma"
                {...field("ownerName")}
              />
              {errors.ownerName && (
                <p className="text-xs text-destructive">{errors.ownerName.message}</p>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@restaurant.com"
                {...field("email")}
              />
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="password">Password</Label>
              <PasswordInput
                id="password"
                autoComplete="new-password"
                placeholder="At least 8 characters"
                {...field("password")}
              />
              {errors.password && (
                <p className="text-xs text-destructive">{errors.password.message}</p>
              )}
            </div>

            <StatusNote note={note} onClear={clear} />
            <Button type="submit" size="lg" className="mt-2 w-full" disabled={register.isPending}>
              {register.isPending ? "Creating your account…" : "Create account"}
            </Button>
          </form>

          <p className="mt-8 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-primary hover:underline">
              Sign in
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
