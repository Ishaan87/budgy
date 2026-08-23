"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

// Supabase has no single "log in, registering on first use" call, so this tries signUp first
// (cheap: with email confirmation off it returns a session immediately for a brand-new email)
// and falls back to signInWithPassword only when signUp reports the email is already taken.
// That keeps the form to one field set with no explicit sign-in/sign-up choice for the user.
function isAlreadyRegisteredError(error: { code?: string; message: string }) {
  return (
    error.code === "user_already_exists" ||
    error.message.toLowerCase().includes("already registered")
  );
}

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const authFailed = searchParams.get("error") === "auth-failed";
  const next = searchParams.get("next") ?? "/";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setErrorMessage(null);
    const supabase = createClient();

    const signUpResult = await supabase.auth.signUp({ email, password });

    if (!signUpResult.error) {
      if (signUpResult.data.session) {
        router.push(next);
        router.refresh();
        return;
      }
      // No session back despite no error and email confirmation being off — surface it rather
      // than silently stall on a blank page.
      setStatus("error");
      setErrorMessage("Could not create your session. Please try signing in again.");
      return;
    }

    if (!isAlreadyRegisteredError(signUpResult.error)) {
      setStatus("error");
      setErrorMessage(signUpResult.error.message);
      return;
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) {
      setStatus("error");
      setErrorMessage(signInError.message);
      return;
    }
    router.push(next);
    router.refresh();
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">BUDGY</CardTitle>
          <CardDescription>
            Enter your email and password. New here? The same form creates your account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                required
                autoFocus
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link
                  href="/forgot-password"
                  className="text-xs text-muted-foreground underline-offset-4 hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                required
                minLength={6}
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            {(status === "error" || authFailed) && (
              <p className="text-sm text-destructive">
                {errorMessage ?? "Something went wrong. Please try again."}
              </p>
            )}
            <Button type="submit" className="w-full" disabled={status === "loading"}>
              {status === "loading" ? "Please wait…" : "Continue"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
