import { createFileRoute, redirect } from "@tanstack/react-router";
import { SubWrapper } from "@/components/generic/wrapper";
import { useLayoutData } from "@/components/generic/Context";
import { useWebSocketSubscription } from "@/hooks/useWebSocketSubscription";
import { Tile, TileAction, TileDescription, TileHeader, TileIcon, TileTitle } from "@repo/ui/components/doras-ui/tile";
import { Button } from "@repo/ui/components/button";
import { Switch } from "@repo/ui/components/switch";
import { Avatar, AvatarFallback } from "@repo/ui/components/avatar";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@repo/ui/components/dialog";
import { Input } from "@repo/ui/components/input";
import { Label } from "@repo/ui/components/label";
import { IconKey, IconShield, IconShieldCheck, IconDeviceFloppy, IconTrash, IconDeviceDesktop, IconDeviceMobile, IconAlertCircle, IconDownload, IconRefresh } from "@tabler/icons-react";
import { useState, useEffect } from "react";
import { authClient } from "@repo/auth/client";
import { auth as authServer } from "@repo/auth";
import { createServerFn } from "@tanstack/react-start";
import { auth, db, schema } from "@repo/database";
import { and, eq } from "drizzle-orm";
export const getConnections = createServerFn({ method: "GET" })
	.inputValidator((data: { account: schema.userType }) => data)
	.handler(async ({ data }) => {
		try {
			const email = await db.query.account.findFirst({
				where: and(eq(auth.account.userId, data.account?.id), eq(auth.account.providerId, "credential")),
			});

			return {
				email,
			};
		} catch (error) {
			// If it's already a redirect, re-throw it
			if (error && typeof error === "object" && "redirect" in error) {
				throw error;
			}
			throw redirect({ to: "/" });
		}
	});

export const getBackupCodes = createServerFn({ method: "GET" }).inputValidator((data: { account: schema.userType }) => data)
	.handler(async ({ data }) => {
		try {
			//@ts-expect-error
			const backupCodes = await authServer.api.viewBackupCodes({
				body: {
					userId: data.account.id,
				},
			});
			return {
				backupCodes: backupCodes.backupCodes || [],
			};
		} catch (error) {
			if (error && typeof error === "object" && "redirect" in error) {
				throw error;
			}
			return {
				backupCodes: [],
			};
		}
	});
export const Route = createFileRoute("/(admin)/settings/security/")({
	loader: async ({ context }) => {
		if (!context.account) {
			throw redirect({ to: "/auth/login" });
		}
		const connections = await getConnections({ data: { account: context.account } });
		let backupCodes: string[] = [];
		if (context.account.twoFactorEnabled) {
			const bc = await getBackupCodes({ data: { account: context.account } });
			backupCodes = bc.backupCodes;
		}
		return { ...connections, backupCodes };
	},
	component: RouteComponent,
});

function RouteComponent() {
	const { email, backupCodes } = Route.useLoaderData();
	const { ws, account } = useLayoutData();
	const { data: session } = authClient.useSession()
	useWebSocketSubscription({ ws });

	const [twoFactorEnabled, setTwoFactorEnabled] = useState(account.twoFactorEnabled || false);
	const hasCredential = email !== null;
	const [passkeysEnabled, setPasskeysEnabled] = useState(false);

	const [showPasswordDialog, setShowPasswordDialog] = useState(false);
	const [pendingTwoFactorEnable, setPendingTwoFactorEnable] = useState<boolean | null>(null);
	const [password, setPassword] = useState("");
	const [passwordError, setPasswordError] = useState("");
	const [loadingPassword, setLoadingPassword] = useState(false);

	const [showBackupCodesDialog, setShowBackupCodesDialog] = useState(false);
	const [showGenerateBackupDialog, setShowGenerateBackupDialog] = useState(false);
	const [generatedBackupCodes, setGeneratedBackupCodes] = useState<string[]>([]);

	const [passkeys, setPasskeys] = useState<{ id: string; name: string; createdAt: string }[]>([
		{ id: "1", name: "MacBook Pro", createdAt: "2024-01-15" },
		{ id: "2", name: "iPhone 15", createdAt: "2024-02-20" },
	]);

	const [sessions, setSessions] = useState<{ id: string; device: string; os: string; ipAddress: string; createdAt: Date; expiresAt: Date }[]>([]);
	const [loadingSessions, setLoadingSessions] = useState(true);

	useEffect(() => {
		async function loadSessions() {
			try {
				const sessionsList = await authClient.listSessions();
				if (sessionsList.data) {
					setSessions(
						sessionsList.data.map((s) => ({
							id: s.id,
							device: s.userAgent ? (s.userAgent.includes("Mobile") ? "Mobile" : "Desktop") : "Unknown",
							os: s.userAgent || "Unknown",
							ipAddress: s.ipAddress || "Unknown",
							createdAt: new Date(s.createdAt),
							expiresAt: new Date(s.expiresAt),
						})),
					);
				}
			} catch (error) {
				console.error("Failed to load sessions:", error);
			} finally {
				setLoadingSessions(false);
			}
		}
		loadSessions();
	}, []);

	const handleRemovePasskey = (id: string) => {
		setPasskeys(passkeys.filter((p) => p.id !== id));
	};

	const handleRevokeSession = async (sessionId: string) => {
		try {
			await authClient.revokeSession({ token: sessionId });
			setSessions(sessions.filter((s) => s.id !== sessionId));
		} catch (error) {
			console.error("Failed to revoke session:", error);
		}
	};

	const handleDownloadBackupCodes = (codes: string[]) => {
		const content = codes.join("\n");
		const blob = new Blob([content], { type: "text/plain" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = "backup-codes.txt";
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	};

	const handleViewBackupCodes = async () => {
		setShowBackupCodesDialog(true);
	};

	const handleGenerateBackupCodes = async () => {
		setShowGenerateBackupDialog(true);
	};

	const handleGenerateBackupSubmit = async () => {
		if (!password) {
			setPasswordError("Password is required");
			return;
		}
		setLoadingPassword(true);
		setPasswordError("");
		try {
			const result = await authClient.twoFactor.generateBackupCodes({ password });
			if (result.error) {
				setPasswordError(result.error.message || "Failed to generate backup codes");
				return;
			}
			if (result.data?.backupCodes) {
				setGeneratedBackupCodes(result.data.backupCodes);
			}
		} catch (err) {
			setPasswordError("An unexpected error occurred");
		} finally {
			setLoadingPassword(false);
		}
	};

	const getDeviceIcon = (device: string) => {
		if (device === "Mobile") {
			return <IconDeviceMobile className="size-4" />;
		}
		return <IconDeviceDesktop className="size-4" />;
	};

	const formatDate = (date: Date) => {
		return new Date(date).toLocaleDateString("en-US", {
			year: "numeric",
			month: "short",
			day: "numeric",
		});
	};

	const isTwoFactorDisabled = hasCredential === false;

	function handleTwoFactorToggle(checked: boolean): void {
		setPendingTwoFactorEnable(checked);
		setPassword("");
		setPasswordError("");
		setShowPasswordDialog(true);
	}

	async function handlePasswordSubmit() {
		if (!password) {
			setPasswordError("Password is required");
			return;
		}

		setLoadingPassword(true);
		setPasswordError("");

		try {
			if (pendingTwoFactorEnable) {
				const result = await authClient.twoFactor.enable({ password });
				if (result.error) {
					setPasswordError(result.error.message || "Failed to enable two-factor authentication");
					return;
				}
				if (result.data?.totpURI) {
					sessionStorage.setItem("2fa-setup-totp", result.data.totpURI);
				}
				window.location.href = "/auth/2fa";
			} else {
				const result = await authClient.twoFactor.disable({ password });
				if (result.error) {
					setPasswordError(result.error.message || "Failed to disable two-factor authentication");
					return;
				}
				setTwoFactorEnabled(false);
				setShowPasswordDialog(false);
			}
		} catch (err) {
			setPasswordError("An unexpected error occurred");
		} finally {
			setLoadingPassword(false);
		}
	}

	return (
		<SubWrapper title="Security" style="compact">
			<div className="flex flex-col gap-2">
				<div className="bg-card rounded-lg flex flex-col">
					<Tile className="md:w-full">
						<TileHeader>
							<TileIcon className="size-10 bg-transparent">
								<div className="flex size-10 items-center justify-center rounded-md bg-accent">
									<IconShieldCheck className="size-5" />
								</div>
							</TileIcon>
							<TileTitle>Two-Factor Authentication</TileTitle>
							<TileDescription className="text-xs">
								{isTwoFactorDisabled
									? "Set up a password to enable two-factor authentication"
									: "Add an extra layer of security to your account"}
							</TileDescription>
						</TileHeader>
						<TileAction>
							<div className="flex items-center gap-2">
								{hasCredential === false && (
									<div className="flex items-center gap-1 text-xs text-muted-foreground">
										<IconAlertCircle className="size-3" />
										<span>No password</span>
									</div>
								)}
								<Switch
									checked={twoFactorEnabled}
									onCheckedChange={handleTwoFactorToggle}
									disabled={isTwoFactorDisabled}
								/>
								<span className="text-sm text-muted-foreground">
									{twoFactorEnabled ? "Enabled" : "Disabled"}
								</span>
							</div>
						</TileAction>
					</Tile>
					{twoFactorEnabled && (
						<div className="px-4 pb-4 pt-2 flex flex-col gap-2">
							<p className="text-xs text-muted-foreground">
								Backup codes let you recover access if you lose your authenticator.
							</p>
							<div className="flex gap-2">
								<Button variant="outline" size="sm" onClick={handleViewBackupCodes}>
									<IconDownload className="size-4 mr-1" />
									View Codes
								</Button>
								<Button variant="outline" size="sm" onClick={handleGenerateBackupCodes}>
									<IconRefresh className="size-4 mr-1" />
									Generate New
								</Button>
							</div>
						</div>
					)}
				</div>

				<div className="bg-card rounded-lg flex flex-col">
					<Tile className="md:w-full">
						<TileHeader>
							<TileIcon className="size-10 bg-transparent">
								<div className="flex size-10 items-center justify-center rounded-md bg-accent">
									<IconKey className="size-5" />
								</div>
							</TileIcon>
							<TileTitle>Passkeys</TileTitle>
							<TileDescription className="text-xs">
								Use passkeys for passwordless, secure sign-in
							</TileDescription>
						</TileHeader>
						<TileAction>
							<div className="flex items-center gap-2">
								<Switch
									checked={passkeysEnabled}
									onCheckedChange={setPasskeysEnabled}
								/>
								<span className="text-sm text-muted-foreground">
									{passkeysEnabled ? "Enabled" : "Disabled"}
								</span>
							</div>
						</TileAction>
					</Tile>

					{passkeysEnabled && passkeys.length > 0 && (
						<div className="px-4 pb-4 pt-2 flex flex-col gap-2">
							{passkeys.map((passkey) => (
								<div
									key={passkey.id}
									className="flex items-center justify-between p-3 rounded-md bg-accent/50"
								>
									<div className="flex items-center gap-3">
										<Avatar className="size-8">
											<AvatarFallback className="text-xs">
												<IconDeviceFloppy className="size-4" />
											</AvatarFallback>
										</Avatar>
										<div className="flex flex-col">
											<span className="text-sm font-medium">{passkey.name}</span>
											<span className="text-xs text-muted-foreground">
												Added {passkey.createdAt}
											</span>
										</div>
									</div>
									<Button variant="ghost" size="icon" onClick={() => handleRemovePasskey(passkey.id)}>
										<IconTrash className="size-4" />
									</Button>
								</div>
							))}
							<Button variant="accent" size="sm" className="mt-2">
								Add Passkey
							</Button>
						</div>
					)}
				</div>

				<div className="bg-card rounded-lg flex flex-col">
					<Tile className="md:w-full">
						<TileHeader>
							<TileIcon className="size-10 bg-transparent">
								<div className="flex size-10 items-center justify-center rounded-md bg-accent">
									<IconShield className="size-5" />
								</div>
							</TileIcon>
							<TileTitle>Active Sessions</TileTitle>
							<TileDescription className="text-xs">
								Manage your active sessions across devices
							</TileDescription>
						</TileHeader>
					</Tile>

					{loadingSessions ? (
						<div className="px-4 pb-4 pt-2 text-sm text-muted-foreground">Loading sessions...</div>
					) : (
						<div className="px-4 pb-4 pt-2 flex flex-col gap-2">
							{sessions.map((_session) => (
								<div
									key={_session.id}
									className="flex items-center justify-between p-3 rounded-md bg-accent/50"
								>
									<div className="flex items-center gap-3">
										<Avatar className="size-8">
											<AvatarFallback className="text-xs">
												{getDeviceIcon(_session.device)}
											</AvatarFallback>
										</Avatar>
										<div className="flex flex-col">
											<span className="text-sm font-medium">
												{_session.device} {_session.id === session?.session?.id && "(Current)"}
											</span>
											<span className="text-xs text-muted-foreground">
												{_session.os} · {_session.ipAddress}
											</span>
											<span className="text-xs text-muted-foreground">
												Expires: {formatDate(_session.expiresAt)}
											</span>
										</div>
									</div>
									{_session.id !== session?.session?.id && (
										<Button variant="ghost" size="icon" onClick={() => handleRevokeSession(_session.id)}>
											<IconTrash className="size-4" />
										</Button>
									)}
								</div>
							))}
							{sessions.length === 0 && (
								<div className="text-sm text-muted-foreground">No active sessions</div>
							)}
						</div>
					)}
				</div>
			</div>

			<Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>
							{pendingTwoFactorEnable ? "Enable Two-Factor Authentication" : "Disable Two-Factor Authentication"}
						</DialogTitle>
						<DialogDescription>
							{pendingTwoFactorEnable
								? "Enter your password to enable two-factor authentication."
								: "Enter your password to disable two-factor authentication."}
						</DialogDescription>
					</DialogHeader>
					<div className="py-4">
						<Label htmlFor="password">Password</Label>
						<Input
							id="password"
							type="password"
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							onKeyDown={(e) => e.key === "Enter" && handlePasswordSubmit()}
							className="mt-2"
							placeholder="Enter your password"
						/>
						{passwordError && <p className="text-sm text-red-500 mt-2">{passwordError}</p>}
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setShowPasswordDialog(false)}>
							Cancel
						</Button>
						<Button onClick={handlePasswordSubmit} disabled={loadingPassword}>
							{loadingPassword ? "Processing..." : "Confirm"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<Dialog open={showBackupCodesDialog} onOpenChange={setShowBackupCodesDialog}>
				<DialogContent className="max-w-md">
					<DialogHeader>
						<DialogTitle>Backup Codes</DialogTitle>
						<DialogDescription>
							Save these codes somewhere safe. Each code can only be used once.
						</DialogDescription>
					</DialogHeader>
					<div className="py-4">
						<div className="grid grid-cols-2 gap-2 font-mono text-sm">
							{backupCodes.map((code, index) => (
								<div key={index} className="p-2 bg-accent rounded text-center">
									{code}
								</div>
							))}
						</div>
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setShowBackupCodesDialog(false)}>
							Close
						</Button>
						<Button onClick={() => handleDownloadBackupCodes(backupCodes)}>
							<IconDownload className="size-4 mr-1" />
							Download
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<Dialog open={showGenerateBackupDialog} onOpenChange={setShowGenerateBackupDialog}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Generate New Backup Codes</DialogTitle>
						<DialogDescription>
							Generating new backup codes will invalidate your existing codes. Enter your password to continue.
						</DialogDescription>
					</DialogHeader>
					{generatedBackupCodes.length === 0 ? (
						<>
							<div className="py-4">
								<Label htmlFor="gen-password">Password</Label>
								<Input
									id="gen-password"
									type="password"
									value={password}
									onChange={(e) => setPassword(e.target.value)}
									onKeyDown={(e) => e.key === "Enter" && handleGenerateBackupSubmit()}
									className="mt-2"
									placeholder="Enter your password"
								/>
								{passwordError && <p className="text-sm text-red-500 mt-2">{passwordError}</p>}
							</div>
							<DialogFooter>
								<Button variant="outline" onClick={() => { setShowGenerateBackupDialog(false); setGeneratedBackupCodes([]); setPassword(""); }}>
									Cancel
								</Button>
								<Button onClick={handleGenerateBackupSubmit} disabled={loadingPassword}>
									{loadingPassword ? "Generating..." : "Generate"}
								</Button>
							</DialogFooter>
						</>
					) : (
						<>
							<div className="py-4">
								<div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-md mb-4">
									<p className="text-sm text-yellow-800 dark:text-yellow-200">
										Warning: Your previous backup codes are no longer valid.
									</p>
								</div>
								<div className="grid grid-cols-2 gap-2 font-mono text-sm">
									{generatedBackupCodes.map((code, index) => (
										<div key={index} className="p-2 bg-accent rounded text-center">
											{code}
										</div>
									))}
								</div>
							</div>
							<DialogFooter>
								<Button variant="outline" onClick={() => { setShowGenerateBackupDialog(false); setGeneratedBackupCodes([]); setPassword(""); }}>
									Close
								</Button>
								<Button onClick={() => handleDownloadBackupCodes(generatedBackupCodes)}>
									<IconDownload className="size-4 mr-1" />
									Download
								</Button>
							</DialogFooter>
						</>
					)}
				</DialogContent>
			</Dialog>
		</SubWrapper>
	);
}
