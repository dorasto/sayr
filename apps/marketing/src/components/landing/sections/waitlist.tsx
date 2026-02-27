import { useEffect, useRef, useState } from "react";
import { ArrowRight, Check, Loader2, Mail } from "lucide-react";
import "@cap.js/widget";

const capWidgetStyles = {
  "--cap-background": "transparent",
  "--cap-border-color": "transparent",
  "--cap-border-radius": "9999px",
  "--cap-widget-padding": "0px",
  "--cap-widget-height": "36px",
  "--cap-color": "var(--foreground)",
  "--cap-checkbox-border": "1px solid var(--secondary)",
  "--cap-checkbox-border-radius": "9999px",
  "--cap-checkbox-background": "var(--background)",
  "--cap-checkbox-size": "22px",
  "--cap-gap": "10px",
  "--cap-font":
    'system-ui, -apple-system, "BlinkMacSystemFont", "Segoe UI", "Roboto", "Helvetica Neue", sans-serif',
  "--cap-spinner-color": "var(--sl-color-accent)",
  "--cap-spinner-background-color": "var(--secondary)",
} as React.CSSProperties;

export default function Waitlist() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const widgetRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = widgetRef.current;
    if (!el) return;
    const handler = (e: Event) => {
      const token = (e as CustomEvent).detail?.token;
      if (token) setCaptchaToken(token);
    };
    el.addEventListener("solve", handler);
    return () => el.removeEventListener("solve", handler);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || loading || !captchaToken) return;
    setLoading(true);
    try {
      await fetch("/api/internal/v1/waitlist", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, captchaToken }),
      });
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
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
                disabled={loading}
                className="flex-1 bg-transparent px-3 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none disabled:opacity-50"
              />
              {!captchaToken ? (
                <div className="m-1.5 shrink-0">
                  {/* @ts-expect-error cap-widget is a custom element */}
                  <cap-widget
                    ref={widgetRef}
                    data-cap-api-endpoint={
                      import.meta.env.PUBLIC_CAP_API_ENDPOINT
                    }
                    style={capWidgetStyles}
                  />
                </div>
              ) : (
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center gap-1.5 bg-primary text-primary-foreground text-sm font-medium px-5 py-2 m-1.5 rounded-full hover:bg-primary/90 transition-colors shadow-sm shadow-primary/20 shrink-0 disabled:opacity-50 disabled:pointer-events-none"
                >
                  {loading ? (
                    <>
                      Joining...
                      <Loader2 className="size-3.5 animate-spin" />
                    </>
                  ) : (
                    <>
                      Join Waitlist
                      <ArrowRight className="size-3.5" />
                    </>
                  )}
                </button>
              )}
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
