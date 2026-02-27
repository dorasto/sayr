import { useState } from "react";
import { ArrowRight, Check, Mail } from "lucide-react";

export default function Waitlist() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    await fetch("/api/internal/v1/waitlist", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email }),
    });
    setSubmitted(true);
  };

  return (
    <div className="w-full max-w-md mx-auto">
      {!submitted ? (
        <form
          onSubmit={handleSubmit}
          className="flex flex-col items-center gap-4"
        >
          <p className="text-sm text-muted-foreground">
            We're still building. Join the waitlist to get early access.
          </p>
          <div className="relative w-full group">
            <div className="absolute -inset-0.5 bg-linear-to-r from-primary/20 via-primary/10 to-primary/20 rounded-full blur-sm opacity-0 group-focus-within:opacity-100 transition-opacity duration-500" />
            <div className="relative flex items-center w-full rounded-full border bg-card/80 backdrop-blur shadow-lg shadow-primary/5 overflow-hidden transition-colors focus-within:border-primary/30">
              <Mail className="size-4 text-muted-foreground ml-4 shrink-0" />
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="flex-1 bg-transparent px-3 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none"
              />
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 bg-primary text-primary-foreground text-sm font-medium px-5 py-2 m-1.5 rounded-full hover:bg-primary/90 transition-colors shadow-sm shadow-primary/20 shrink-0"
              >
                Join Waitlist
                <ArrowRight className="size-3.5" />
              </button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            We'll keep you posted on our progress and notify you when it's time!
          </p>
        </form>
      ) : (
        <div className="flex flex-col items-center gap-3 py-2">
          <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Check className="size-5 text-primary" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium">You're on the list!</p>
            <p className="text-xs text-muted-foreground mt-1">
              We'll reach out to{" "}
              <span className="font-medium text-foreground">{email}</span> when
              we're ready.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
