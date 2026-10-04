import { authClient } from "@repo/auth/client";
import { Badge } from "@repo/ui/components/badge";
import { Button, buttonVariants } from "@repo/ui/components/button";
import { headlessToast } from "@repo/ui/components/headless-toast";
import { Input } from "@repo/ui/components/input";
import { Separator } from "@repo/ui/components/separator";
import { cn } from "@repo/ui/lib/utils";
import {
	IconBrandDiscordFilled,
	IconBrandGithubFilled,
	IconBrandSlack,
	IconFingerprint,
	IconShieldLock,
} from "@tabler/icons-react";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";
import { authErrorCode, isSafeReturnUrl } from "@/lib/auth/reauth";
import { getReauthOptions, type ReauthProvider } from "@/lib/serverFunctions/account-settings";
import { getOgImageUrl, seo } from "@/seo";

const PROVIDER_LABELS: Record<ReauthProvider, string> = {
	doras: "Doras",
	github: "GitHub",
	discord: "Discord",
	slack: "Slack",
};

const PROVIDER_ICONS: Record<ReauthProvider, ReactNode> = {
	doras: (
		<>
			<img
				src="https://cdn.doras.to/doras/icon-white.svg"
				alt=""
				width={18}
				height={18}
				className="not-dark:hidden"
			/>
			<img src="https://cdn.doras.to/doras/icon.svg" alt="" width={18} height={18} className="dark:hidden" />
		</>
	),
	github: <IconBrandGithubFilled className="size-[18px]" />,
	discord: <IconBrandDiscordFilled className="size-[18px]" />,
	slack: <IconBrandSlack className="size-[18px]" />,
};

export const Route = createFileRoute("/auth/reauth")({
	head: () => ({
		meta: seo({
			title: "Confirm it's you",
			image: getOgImageUrl({ type: "simple", title: "Confirm it's you" }),
		}),
	}),
	validateSearch: (search: Record<string, unknown>): { redirect?: string } => ({
		redirect: typeof search.redirect === "string" ? search.redirect : undefined,
	}),
	loader: async () => {
		const options = await getReauthOptions();
		if (!options) throw redirect({ to: "/auth/login" });
		return options;
	},
	component: ReauthPage,
});

/**
 * "Confirm it's you": a fresh sign-in for actions Better Auth only allows soon after signing in (see `lib/auth/reauth`).
 * Offers the user's own sign-in methods (linked providers, passkey, password), then returns to `?redirect=` — any page
 * on Sayr, including an org portal with its settings dialog open.
 */
function ReauthPage() {
	const { email, hasPassword, providers } = Route.useLoaderData();
	const { redirect: requested } = Route.useSearch();
	const [lastMethod, setLastMethod] = useState<string | null>(null);
	const [password, setPassword] = useState("");
	const [submitting, setSubmitting] = useState(false);

	const rootDomain = import.meta.env.VITE_ROOT_DOMAIN;
	const returnTo =
		requested && rootDomain && isSafeReturnUrl(requested, rootDomain)
			? requested
			: `${import.meta.env.VITE_URL_ROOT}/settings/security`;

	useEffect(() => {
		setLastMethod(authClient.getLastUsedLoginMethod());
	}, []);

	const handleProvider = (provider: ReauthProvider) => {
		void authClient.signIn.social({ provider, callbackURL: returnTo });
	};

	const handlePasskey = async () => {
		const result = await authClient.signIn.passkey();
		if (result.data?.session) {
			window.location.href = returnTo;
			return;
		}
		const code = authErrorCode(result.error);
		if (!code || code === "AUTH_CANCELLED" || code.startsWith("ERROR_")) return;
		headlessToast.error({
			title: "Couldn't confirm with a passkey",
			description: code === "PASSKEY_NOT_FOUND" ? "That passkey isn't on your account." : result.error?.message,
		});
	};

	const handlePassword = async () => {
		if (!password) return;
		setSubmitting(true);
		const result = await authClient.signIn.email({ email, password });
		setSubmitting(false);
		if (result.error) {
			headlessToast.error({ title: "That password didn't work", description: "Please try again." });
			return;
		}
		if (result.data && "twoFactorRedirect" in result.data && result.data.twoFactorRedirect) {
			// The 2FA page finishes through /auth/auth-check, which returns to the login origin + this path.
			const target = new URL(returnTo);
			document.cookie = `post_login_redirect=${encodeURIComponent(`${target.pathname}${target.search}`)}; path=/; max-age=500; samesite=lax`;
			document.cookie = `login_origin=${encodeURIComponent(target.origin)}; path=/; max-age=500; samesite=lax; domain=.${rootDomain}`;
			window.location.href = "/auth/2fa";
			return;
		}
		window.location.href = returnTo;
	};

	const methodButton = (id: string, label: string, icon: ReactNode, onClick: () => void) => (
		<Button key={id} variant="primary" className="h-10 w-full justify-start gap-3" onClick={onClick}>
			<span className="flex size-[18px] shrink-0 items-center justify-center">{icon}</span>
			<span className="flex-1 text-left">{label}</span>
			{lastMethod === id && (
				<Badge variant="secondary" className="h-5 shrink-0 px-1.5 py-0 font-normal text-[10px] leading-none">
					Last used
				</Badge>
			)}
		</Button>
	);

	return (
		<div className="flex min-h-screen items-center justify-center p-4">
			<div className="mx-auto w-full max-w-sm rounded-2xl border bg-card shadow-sm">
				<div className="flex flex-col items-center gap-2 px-6 pt-8 pb-6 text-center">
					<div className="mb-1 flex size-12 items-center justify-center rounded-xl bg-accent" aria-hidden="true">
						<IconShieldLock className="size-6" />
					</div>
					<h1 className="font-semibold text-xl! tracking-tight">Confirm it's you</h1>
					<p className="text-muted-foreground text-sm">
						For your security, sign in again as <span className="text-foreground">{email}</span> to continue.
					</p>
				</div>

				<div className="flex flex-col gap-2 px-6 pb-6">
					{providers.map((provider) =>
						methodButton(provider, PROVIDER_LABELS[provider], PROVIDER_ICONS[provider], () =>
							handleProvider(provider)
						)
					)}
					{methodButton("passkey", "Passkey", <IconFingerprint className="size-[18px]" />, handlePasskey)}

					{hasPassword && (
						<>
							<div className="my-1 flex items-center gap-3">
								<Separator className="flex-1" />
								<span className="whitespace-nowrap text-muted-foreground text-xs">Or use your password</span>
								<Separator className="flex-1" />
							</div>
							<form
								className="flex items-center gap-2"
								onSubmit={(event) => {
									event.preventDefault();
									void handlePassword();
								}}
							>
								<Input
									type="password"
									className="h-10 bg-card"
									placeholder="Password"
									autoComplete="current-password"
									aria-label="Password"
									value={password}
									onChange={(event) => setPassword(event.target.value)}
								/>
								<Button
									type="submit"
									size="icon"
									className="shrink-0"
									disabled={submitting || !password}
									aria-label="Confirm"
								>
									<ArrowRight className="size-4" />
								</Button>
							</form>
						</>
					)}

					<a
						href={returnTo}
						className={cn(
							buttonVariants({ variant: "ghost", size: "sm" }),
							"mt-2 self-center text-muted-foreground"
						)}
					>
						Cancel
					</a>
				</div>
			</div>
		</div>
	);
}
