"use client";

import { useState } from "react";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from "@repo/ui/components/card";
import { Input } from "@repo/ui/components/input";
import { Button } from "@repo/ui/components/button";

export function WaitlistForm() {
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();

        setLoading(true);
        setError(null);

        try {
            const res = await fetch("/api/internal/v1/waitlist", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ email }),
            });

            if (!res.ok) {
                const data = await res.json().catch(() => null);
                throw new Error(data?.message || "Something went wrong");
            }

            setSuccess(true);
        } catch (err) {
            setError(
                err instanceof Error ? err.message : "Failed to join waitlist",
            );
        } finally {
            setLoading(false);
        }
    }

    if (success) {
        return (
            <Card className="max-w-md mx-auto">
                <CardContent className="py-6 text-center">
                    ✅ You’re on the waitlist!
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="max-w-md mx-auto">
            <CardHeader>
                <CardTitle>Join the Waitlist</CardTitle>
                <CardDescription>
                    Get early access when we launch.
                </CardDescription>
            </CardHeader>

            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-3">
                    <div className="flex gap-2">
                        <Input
                            type="email"
                            placeholder="you@example.com"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                        <Button type="submit" disabled={loading}>
                            {loading ? "Joining..." : "Join"}
                        </Button>
                    </div>

                    {error && (
                        <p className="text-sm text-destructive">{error}</p>
                    )}
                </form>
            </CardContent>
        </Card>
    );
}