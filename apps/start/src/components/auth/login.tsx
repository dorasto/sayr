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
import { Button } from "@repo/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@repo/ui/components/dialog";
import { Input } from "@repo/ui/components/input";
import { Label } from "@repo/ui/components/label";
import { cn } from "@repo/ui/lib/utils";
import {
  IconBrandDiscordFilled,
  IconBrandGithub,
  IconBrandSlack,
} from "@tabler/icons-react";
import { ArrowRight } from "lucide-react";

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
      slack: !!(
        process.env.SLACK_CLIENT_ID && process.env.SLACK_CLIENT_SECRET
      ),
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
      <DialogContent onOpenAutoFocus={(e) => e.preventDefault()}>
        <div className="flex flex-col items-center gap-2">
          <div
            className="flex size-11 shrink-0 items-center justify-center rounded-full bg-accent border"
            aria-hidden="true"
          >
            <TasqIcon className="text-primary" />
          </div>
          <DialogHeader>
            <DialogTitle className="sm:text-center">
              {import.meta.env.VITE_PROJECT_NAME}
            </DialogTitle>
            <DialogDescription className="sm:text-center">
              Sign in or create an account
            </DialogDescription>
          </DialogHeader>
        </div>
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

  useEffect(() => {
    if (
      !PublicKeyCredential.isConditionalMediationAvailable ||
      !PublicKeyCredential.isConditionalMediationAvailable()
    ) {
      return;
    }
    void authClient.signIn.passkey({ autoFill: true }).then((e) => {
      if (e.data?.session) {
        signInEmail();
      }
    });
  }, []);

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

  return (
    <div
      className={cn(
        "rounded-2xl mx-auto w-full max-w-prose",
        !isDialog && "bg-card border p-3",
      )}
    >
      <div className="flex flex-col items-center gap-9">
        {!isDialog && (
          <div className="flex flex-col mx-auto items-center gap-2">
            <div
              className="flex size-11 shrink-0 items-center justify-center rounded-full bg-accent border"
              aria-hidden="true"
            >
              <TasqIcon className="text-primary" />
            </div>
            <Label
              variant={"heading"}
              className="text-4xl text-center font-bold"
            >
              {import.meta.env.VITE_PROJECT_NAME}
            </Label>
            <Label variant={"subheading"} className="text-center">
              Sign in or create an account
            </Label>
          </div>
        )}
        {(providers?.doras || providers?.github || providers?.discord || providers?.slack) && (
          <div className="flex flex-wrap gap-3">
            {providers?.doras && (
              <Button
                variant="accent"
                size={"icon"}
                className="flex flex-col items-center gap-1 w-full size-18 aspect-square"
                onClick={signInDoras}
              >
                <img
                  src={"https://cdn.doras.to/doras/icon-white.svg"}
                  alt="Doras logo"
                  width={20}
                  height={20}
                  className=" not-dark:hidden"
                />
                <img
                  src={"https://cdn.doras.to/doras/icon.svg"}
                  alt="Doras logo"
                  width={20}
                  height={20}
                  className="dark:hidden"
                />
                {lastMethod === "doras" && (
                  <span className="text-[9px] leading-none opacity-70">Last used</span>
                )}
              </Button>
            )}

            {providers?.github && (
              <Button
                variant="accent"
                size={"icon"}
                className="flex flex-col items-center gap-1 w-full aspect-square size-18"
                onClick={signInGithub}
              >
                <IconBrandGithub className="size-5! text-black dark:hidden" />
                <IconBrandGithub className="size-5! text-white hidden dark:block" />
                {lastMethod === "github" && (
                  <span className="text-[9px] leading-none opacity-70">Last used</span>
                )}
              </Button>
            )}
            {providers?.discord && (
              <Button
                variant="accent"
                size={"icon"}
                className="flex flex-col items-center gap-1 w-full aspect-square size-18"
                onClick={signInDiscord}
              >
                <IconBrandDiscordFilled className="size-5!" />
                {lastMethod === "discord" && (
                  <span className="text-[9px] leading-none opacity-70">Last used</span>
                )}
              </Button>
            )}
            {providers?.slack && (
              <Button
                variant="accent"
                size={"icon"}
                className="flex flex-col items-center gap-1 w-full aspect-square size-18"
                onClick={signInSlack}
              >
                <IconBrandSlack className="size-5!" />
                {lastMethod === "slack" && (
                  <span className="text-[9px] leading-none opacity-70">Last used</span>
                )}
              </Button>
            )}
          </div>
        )}
        <div className="flex flex-col gap-3">
          <div className="flex items-end gap-2 justify-between">
            {step === "email" ? (
              <div className="group relative w-full">
                <label
                  htmlFor={"email"}
                  className="bg-card text-foreground absolute start-1 top-0 z-10 block -translate-y-1/2 px-2 text-xs font-medium group-has-disabled:opacity-50"
                >
                  Email address
                </label>
                <Input
                  id={"email"}
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
              <div className="group relative w-full">
                <label
                  htmlFor={"password"}
                  className="bg-card text-foreground absolute start-1 top-0 z-10 block -translate-y-1/2 px-2 text-xs font-medium group-has-disabled:opacity-50"
                >
                  Password
                </label>
                <Input
                  id={"password"}
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
              size={"icon"}
              className="shrink-0"
              onClick={
                step === "email" ? handleEmailSubmit : handlePasswordSubmit
              }
            >
              <ArrowRight />
            </Button>
          </div>
          {step === "password" && (
            <Button
              variant="link"
              size={"sm"}
              className="h-auto p-0 text-muted-foreground"
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
    </div>
  );
}
