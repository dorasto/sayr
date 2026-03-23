import { useEffect, useState } from "react";
import { createServerFn } from "@tanstack/react-start";
import {
  authClient,
  signInDoras,
  signInDiscord,
  signInEmail,
  signInEmailTwoFactor,
  signInGithub,
  signInSlack,
} from "@repo/auth/client";

import TasqIcon from "@repo/ui/components/brand-icon";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@repo/ui/components/dialog";
import { Input } from "@repo/ui/components/input";
import { Separator } from "@repo/ui/components/separator";
import { cn } from "@repo/ui/lib/utils";
import {
  IconBrandDiscordFilled,
  IconBrandGithub,
  IconBrandGithubFilled,
  IconBrandSlack,
} from "@tabler/icons-react";
import { ArrowRight } from "lucide-react";
import {
  Tile,
  TileHeader,
  TileIcon,
  TileTitle,
} from "@repo/ui/components/doras-ui/tile";
import { Label } from "@repo/ui/components/label";

interface OAuthProviders {
  github: boolean;
  doras: boolean;
  discord: boolean;
  slack: boolean;
}

const getOAuthProviders = createServerFn({ method: "GET" }).handler(
  async (): Promise<OAuthProviders> => {
    return {
      github: !!(
        process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET
      ),
      doras: !!(process.env.DORAS_CLIENT_ID && process.env.DORAS_CLIENT_SECRET),
      discord: !!(
        process.env.DISCORD_CLIENT_ID && process.env.DISCORD_CLIENT_SECRET
      ),
      slack: !!(process.env.SLACK_CLIENT_ID && process.env.SLACK_CLIENT_SECRET),
    };
  },
);

interface Props {
  trigger?: React.ReactNode;
}

export default function LoginDialog({ trigger }: Props) {
  const [providers, setProviders] = useState<OAuthProviders | undefined>(
    undefined,
  );

  useEffect(() => {
    getOAuthProviders().then(setProviders);
  }, []);

  return (
    <Dialog>
      <DialogTrigger asChild>
        {trigger || <Button variant="outline">Sign in</Button>}
      </DialogTrigger>
      <DialogContent
        onOpenAutoFocus={(e) => e.preventDefault()}
        className="sm:max-w-sm p-0 gap-0 overflow-hidden rounded-2xl!"
      >
        <LoginComponent isDialog providers={providers} />
      </DialogContent>
    </Dialog>
  );
}

export function LoginComponent({
  isDialog = false,
  providers,
}: {
  isDialog?: boolean;
  providers?: OAuthProviders;
}) {
  const lastMethod = authClient.getLastUsedLoginMethod();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [step, setStep] = useState<"email" | "password">("email");

  const handleEmailSubmit = () => {
    if (email) {
      setStep("password");
    }
  };

  const handlePasswordSubmit = () => {
    authClient.signIn
      .email({
        email,
        password,
      })
      .then((e) => {
        if (e.data) {
          //@ts-expect-error
          if (e.data.twoFactorRedirect) {
            signInEmailTwoFactor();
          } else {
            signInEmail();
          }
        }
      });
  };

  const hasAnyProvider =
    providers?.doras ||
    providers?.github ||
    providers?.discord ||
    providers?.slack;

  const providerButtons = [
    providers?.doras && {
      id: "doras",
      label: "Doras",
      onClick: signInDoras,
      icon: (
        <>
          <img
            src="https://cdn.doras.to/doras/icon-white.svg"
            alt="Doras"
            width={18}
            height={18}
            className="not-dark:hidden"
          />
          <img
            src="https://cdn.doras.to/doras/icon.svg"
            alt="Doras"
            width={18}
            height={18}
            className="dark:hidden"
          />
        </>
      ),
    },
    providers?.github && {
      id: "github",
      label: "GitHub",
      onClick: signInGithub,
      icon: <IconBrandGithubFilled className="size-[18px]" />,
    },
    providers?.discord && {
      id: "discord",
      label: "Discord",
      onClick: signInDiscord,
      icon: <IconBrandDiscordFilled className="size-[18px]" />,
    },
    providers?.slack && {
      id: "slack",
      label: "Slack",
      onClick: signInSlack,
      icon: <IconBrandSlack className="size-[18px]" />,
    },
  ].filter(Boolean) as Array<{
    id: string;
    label: string;
    onClick: () => void;
    icon: React.ReactNode;
  }>;

  return (
    <div
      className={cn(
        "rounded-2xl mx-auto w-full max-w-sm",
        !isDialog && "bg-card border shadow-sm",
        isDialog && "",
      )}
    >
      {/* Header */}
      <div className="flex flex-col items-center gap-2 px-6 pt-8 pb-6">
        <div
          className="flex size-16 shrink-0 items-center justify-center mb-1"
          aria-hidden="true"
        >
          <TasqIcon className="text-primary size-14" />
        </div>
        <h1 className="text-2xl! font-semibold tracking-tight">Sayr.io</h1>
        <p className="text-sm text-muted-foreground">
          Sign in or create an account
        </p>
      </div>

      {/* Body */}
      <div className="px-6 pb-8 flex flex-col gap-3">
        {/* SSO Buttons */}
        {hasAnyProvider && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 w-full">
            {providerButtons.map((provider) => {
              const isLastUsed = lastMethod === provider.id;
              return (
                <Button
                  key={provider.id}
                  variant="primary"
                  className={cn(
                    "w-full justify-start gap-3 h-10 relative",
                    provider.id === "doras" && "",
                  )}
                  onClick={provider.onClick}
                >
                  <span className="size-[18px] shrink-0 flex items-center justify-center">
                    {provider.icon}
                  </span>
                  <span className="flex-1 text-left">{provider.label}</span>
                  {isLastUsed && (
                    <Badge
                      variant="secondary"
                      className="text-[10px] px-1.5 py-0 h-5 leading-none font-normal shrink-0"
                    >
                      Last used
                    </Badge>
                  )}
                </Button>
              );
            })}
          </div>
        )}

        {/* Divider */}
        {hasAnyProvider && (
          <div className="flex items-center gap-3 my-1">
            <Separator className="flex-1" />
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              Or continue with email
            </span>
            <Separator className="flex-1" />
          </div>
        )}

        {/* Email */}
        <div className="flex flex-col gap-2">
          <div className="flex items-end gap-2">
            {step === "email" ? (
              <div className="group relative flex-1">
                <label
                  htmlFor="email"
                  className="bg-card text-foreground absolute start-1 top-0 z-10 block -translate-y-1/2 px-2 text-xs font-medium group-has-disabled:opacity-50"
                >
                  Email address
                </label>
                <Input
                  id="email"
                  className="h-10 bg-card"
                  placeholder="hi@yourcompany.com"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleEmailSubmit()}
                  autoComplete={"webauthn"}
                  disabled
                />
              </div>
            ) : (
              <div className="group relative flex-1">
                <label
                  htmlFor="password"
                  className="bg-card text-foreground absolute start-1 top-0 z-10 block -translate-y-1/2 px-2 text-xs font-medium group-has-disabled:opacity-50"
                >
                  Password
                </label>
                <Input
                  id="password"
                  className="h-10 bg-card"
                  placeholder="Enter your password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handlePasswordSubmit()}
                />
              </div>
            )}
            <Button
              type="button"
              size="icon"
              className="shrink-0"
              onClick={
                step === "email" ? handleEmailSubmit : handlePasswordSubmit
              }
            >
              <ArrowRight className="size-4" />
            </Button>
          </div>
          {step === "password" && (
            <Button
              variant="link"
              size="sm"
              className="h-auto p-0 text-muted-foreground self-start"
              onClick={() => {
                setStep("email");
                setPassword("");
              }}
            >
              Back to email
            </Button>
          )}
        </div>
      </div>

      {/* Legal footer */}
      <div className="px-6 pb-6 text-center">
        <p className="text-xs text-muted-foreground">
          By continuing, you agree to our{" "}
          <a
            href="https://sayr.io/legal/terms"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:text-foreground transition-colors"
          >
            Terms of Service
          </a>{" "}
          and{" "}
          <a
            href="https://sayr.io/legal/privacy"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:text-foreground transition-colors"
          >
            Privacy Policy
          </a>
          .
        </p>
      </div>
    </div>
  );
}
