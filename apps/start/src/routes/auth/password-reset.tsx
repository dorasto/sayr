import { useState } from "react";
import { createFileRoute, useSearch } from "@tanstack/react-router";
import { authClient } from "@repo/auth/client";
import { Button } from "@repo/ui/components/button";
import { Input } from "@repo/ui/components/input"; // or whatever input you use

export const Route = createFileRoute("/auth/password-reset")({
  component: RouteComponent,
});

function RouteComponent() {
  const search = useSearch({ from: "/auth/password-reset" });
  const token = (search.token as string | undefined) ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="w-full max-w-sm rounded-lg border bg-card p-6 shadow-sm">
          <h1 className="mb-2 text-lg font-semibold">Invalid link</h1>
          <p className="text-sm text-muted-foreground">
            This password reset link is missing a token or is malformed. Please
            request a new reset email.
          </p>
        </div>
      </div>
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);

    if (!password || password.length < 8) {
      setErrorMsg("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setErrorMsg("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    try {
      await authClient.resetPassword({
        token,
        newPassword: password,
      });
      setDone(true);
    } catch (err) {
      setErrorMsg("Failed to reset password. The link may be expired.");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="w-full max-w-sm rounded-lg border bg-card p-6 shadow-sm">
          <h1 className="mb-2 text-lg font-semibold">Password updated</h1>
          <p className="text-sm text-muted-foreground">
            Your password has been reset. You can now sign in with your new
            password.
          </p>
          {/* Adjust this to your login route */}
          <Button
            className="mt-4 w-full"
            onClick={() => {
              window.location.href = "/auth/login";
            }}
          >
            Go to login
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm space-y-4 rounded-lg border bg-card p-6 shadow-sm"
      >
        <h1 className="text-lg font-semibold">Reset your password</h1>
        <p className="text-sm text-muted-foreground">
          Choose a new password for your account.
        </p>

        <div className="space-y-1">
          <label className="text-sm font-medium">New password</label>
          <Input
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter new password"
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium">Confirm password</label>
          <Input
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Re-enter new password"
          />
        </div>

        {errorMsg && (
          <p className="text-sm text-destructive mt-1">{errorMsg}</p>
        )}

        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? "Updating..." : "Reset password"}
        </Button>
      </form>
    </div>
  );
}