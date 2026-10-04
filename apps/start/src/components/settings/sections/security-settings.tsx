import { authClient } from "@repo/auth/client";
import { Avatar, AvatarFallback } from "@repo/ui/components/avatar";
import { Button } from "@repo/ui/components/button";
import { Tile, TileAction, TileDescription, TileHeader, TileIcon, TileTitle } from "@repo/ui/components/doras-ui/tile";
import { Skeleton } from "@repo/ui/components/skeleton";
import { Switch } from "@repo/ui/components/switch";
import {
	IconDeviceDesktop,
	IconDeviceMobile,
	IconRefresh,
	IconShield,
	IconShieldCheck,
	IconTrash,
} from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { isSessionNotFresh, reauthUrl } from "@/lib/auth/reauth";
import { getSecuritySettings } from "@/lib/serverFunctions/account-settings";
import { BackupCodesDialog } from "../security/backup-codes-dialog";
import { GenerateBackupCodesDialog } from "../security/generate-backup-codes-dialog";
import { PasskeySection } from "../security/passkey-section";
import { TwoFactorPasswordDialog } from "../security/two-factor-password-dialog";
import { TwoFactorSetupDialog } from "../security/two-factor-setup-dialog";

export const SECURITY_SETTINGS_QUERY_KEY = ["account-settings", "security"] as const;

interface SessionRow {
	id: string;
	device: string;
	os: string;
	ipAddress: string;
	createdAt: Date;
	expiresAt: Date;
	token: string;
}

interface SecuritySettingsProps {
	/** Where "Confirm it's you" returns to. @default the current page */
	reauthReturnURL?: string;
	/** The Connections settings, where a user without a password can add one. @default "/settings/connections" */
	connectionsHref?: string;
}

/**
 * The Security settings section (two-factor, passkeys, active sessions). Self-contained: it loads its own data, so it
 * renders the same on the admin `/settings/security` page and in the portal's account dialog.
 */
export function SecuritySettings({
	reauthReturnURL,
	connectionsHref = "/settings/connections",
}: SecuritySettingsProps) {
	const security = useQuery({ queryKey: SECURITY_SETTINGS_QUERY_KEY, queryFn: () => getSecuritySettings() });

	if (security.isError) {
		return (
			<div className="flex items-center justify-between gap-3 rounded-lg bg-card p-4 text-sm">
				<span className="text-muted-foreground">We could not load your security settings.</span>
				<Button variant="outline" size="sm" onClick={() => security.refetch()}>
					Retry
				</Button>
			</div>
		);
	}
	if (!security.data) {
		return (
			<div className="flex flex-col gap-2" aria-busy="true">
				<Skeleton className="h-20 rounded-lg" />
				<Skeleton className="h-20 rounded-lg" />
				<Skeleton className="h-32 rounded-lg" />
			</div>
		);
	}
	return (
		<SecuritySettingsContent {...security.data} reauthReturnURL={reauthReturnURL} connectionsHref={connectionsHref} />
	);
}

interface SecuritySettingsContentProps {
	reauthReturnURL?: string;
	connectionsHref: string;
	hasPassword: boolean;
	twoFactorEnabled: boolean;
	backupCodes: string[];
}

function SecuritySettingsContent({
	hasPassword,
	twoFactorEnabled: initialTwoFactorEnabled,
	backupCodes,
	reauthReturnURL,
	connectionsHref,
}: SecuritySettingsContentProps) {
	const { data: session } = authClient.useSession();
	const router = useRouter();
	const confirmIdentity = () => {
		window.location.href = reauthUrl(reauthReturnURL ?? window.location.href);
	};
	const [twoFactorEnabled, setTwoFactorEnabled] = useState(initialTwoFactorEnabled);

	// --- Password dialog (step 1) ---
	const [showPasswordDialog, setShowPasswordDialog] = useState(false);
	const [pendingTwoFactorEnable, setPendingTwoFactorEnable] = useState<boolean | null>(null);
	const [password, setPassword] = useState("");
	const [passwordError, setPasswordError] = useState("");
	const [loadingPassword, setLoadingPassword] = useState(false);

	// --- TOTP setup dialog (step 2) ---
	const [showSetupDialog, setShowSetupDialog] = useState(false);
	const [totpUri, setTotpUri] = useState("");

	// --- Backup codes dialogs ---
	const [showSetupBackupCodesDialog, setShowSetupBackupCodesDialog] = useState(false);
	const [setupBackupCodes, setSetupBackupCodes] = useState<string[]>([]);
	const [showViewBackupCodesDialog, setShowViewBackupCodesDialog] = useState(false);
	const [showGenerateBackupDialog, setShowGenerateBackupDialog] = useState(false);

	// --- Sessions ---
	const [sessions, setSessions] = useState<SessionRow[]>([]);
	const [loadingSessions, setLoadingSessions] = useState(true);
	const [sessionsNeedReauth, setSessionsNeedReauth] = useState(false);

	useEffect(() => {
		async function loadSessions() {
			try {
				const sessionsList = await authClient.listSessions();
				if (isSessionNotFresh(sessionsList.error)) {
					setSessionsNeedReauth(true);
					return;
				}
				if (sessionsList.data) {
					setSessions(
						sessionsList.data.map((s) => ({
							id: s.id,
							device: s.userAgent ? (s.userAgent.includes("Mobile") ? "Mobile" : "Desktop") : "Unknown",
							os: s.userAgent || "Unknown",
							ipAddress: s.ipAddress || "Unknown",
							createdAt: new Date(s.createdAt),
							expiresAt: new Date(s.expiresAt),
							token: s.token,
						}))
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

	const handleRevokeSession = async (sessionId: string) => {
		try {
			const result = await authClient.revokeSession({ token: sessionId });
			if (isSessionNotFresh(result.error)) {
				confirmIdentity();
				return;
			}
			setSessions(sessions.filter((s) => s.id !== sessionId));
		} catch (error) {
			console.error("Failed to revoke session:", error);
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

	const isTwoFactorDisabled = !hasPassword;

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
				// Step 1 → enable, get TOTP URI + backup codes
				const result = await authClient.twoFactor.enable({ password });
				if (result.error) {
					setPasswordError(result.error.message || "Failed to enable two-factor authentication");
					return;
				}
				// Store backup codes from the enable response
				if (result.data.method === "totp" && result.data?.backupCodes) {
					setSetupBackupCodes(result.data.backupCodes);
				}
				if (result.data.method === "totp" && result.data?.totpURI) {
					setTotpUri(result.data.totpURI);
				}
				// Move to step 2: TOTP setup dialog
				setShowPasswordDialog(false);
				setPassword("");
				setShowSetupDialog(true);
			} else {
				const result = await authClient.twoFactor.disable({ password });
				if (result.error) {
					setPasswordError(result.error.message || "Failed to disable two-factor authentication");
					return;
				}
				setTwoFactorEnabled(false);
				setShowPasswordDialog(false);
				setPassword("");
			}
		} catch {
			setPasswordError("An unexpected error occurred");
		} finally {
			setLoadingPassword(false);
		}
	}

	function handleTotpVerified() {
		// Step 2 complete → move to step 3: show backup codes
		setShowSetupDialog(false);
		setShowSetupBackupCodesDialog(true);
	}

	function handleSetupBackupCodesDone() {
		// Step 3 complete → 2FA is now fully enabled
		setShowSetupBackupCodesDialog(false);
		setSetupBackupCodes([]);
		setTotpUri("");
		setTwoFactorEnabled(true);
	}

	return (
		<>
			<div className="flex flex-col gap-2">
				{/* Two-Factor Authentication */}
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
									? "Two-factor protects signing in with a password. You sign in with a connected account, so its own security (and two-factor, if you've turned it on there) protects you. Add a password to sign in with email too, then protect it here."
									: "Add an extra layer of security to your account"}
							</TileDescription>
						</TileHeader>
						<TileAction>
							{isTwoFactorDisabled ? (
								<Button variant="outline" size="sm" onClick={() => router.history.push(connectionsHref)}>
									Add a password
								</Button>
							) : (
								<div className="flex items-center gap-2">
									<Switch checked={twoFactorEnabled} onCheckedChange={handleTwoFactorToggle} />
									<span className="text-sm text-muted-foreground">
										{twoFactorEnabled ? "Enabled" : "Disabled"}
									</span>
								</div>
							)}
						</TileAction>
					</Tile>
					{twoFactorEnabled && (
						<div className="px-4 pb-4 pt-2 flex flex-col gap-2">
							<p className="text-xs text-muted-foreground">
								Backup codes let you recover access if you lose your authenticator.
							</p>
							<div className="flex gap-2">
								<Button variant="outline" size="sm" onClick={() => setShowGenerateBackupDialog(true)}>
									<IconRefresh className="size-4 mr-1" />
									Generate New
								</Button>
							</div>
						</div>
					)}
				</div>

				{/* Passkeys */}
				<PasskeySection onConfirmIdentity={confirmIdentity} />

				{/* Active Sessions */}
				<div className="bg-card rounded-lg flex flex-col">
					<Tile className="md:w-full">
						<TileHeader>
							<TileIcon className="size-10 bg-transparent">
								<div className="flex size-10 items-center justify-center rounded-md bg-accent">
									<IconShield className="size-5" />
								</div>
							</TileIcon>
							<TileTitle>Active Sessions</TileTitle>
							<TileDescription className="text-xs">Manage your active sessions across devices</TileDescription>
						</TileHeader>
					</Tile>

					{loadingSessions ? (
						<div className="px-4 pb-4 pt-2 text-sm text-muted-foreground">Loading sessions...</div>
					) : sessionsNeedReauth ? (
						<div className="flex items-center justify-between gap-3 px-4 pb-4 pt-2">
							<span className="text-sm text-muted-foreground">
								For your security, confirm it's you to see where you're signed in.
							</span>
							<Button variant="outline" size="sm" className="shrink-0" onClick={confirmIdentity}>
								Confirm it's you
							</Button>
						</div>
					) : (
						<div className="px-4 pb-4 pt-2 flex flex-col gap-2">
							{sessions.map((_session) => (
								<div
									key={_session.id}
									className="flex items-center justify-between p-3 rounded-md bg-accent/50"
								>
									<div className="flex min-w-0 items-center gap-3">
										<Avatar className="size-8">
											<AvatarFallback className="text-xs">{getDeviceIcon(_session.device)}</AvatarFallback>
										</Avatar>
										<div className="flex min-w-0 flex-col">
											<span className="text-sm font-medium">
												{_session.device} {_session.id === session?.session?.id && "(Current)"}
											</span>
											<span className="truncate text-xs text-muted-foreground">
												{_session.os} · {_session.ipAddress}
											</span>
											<span className="text-xs text-muted-foreground">
												Expires: {formatDate(_session.expiresAt)}
											</span>
										</div>
									</div>
									{_session.id !== session?.session?.id && (
										<Button variant="ghost" size="icon" onClick={() => handleRevokeSession(_session.token)}>
											<IconTrash className="size-4" />
										</Button>
									)}
								</div>
							))}
							{sessions.length === 0 && <div className="text-sm text-muted-foreground">No active sessions</div>}
						</div>
					)}
				</div>
			</div>

			{/* Step 1: Password */}
			<TwoFactorPasswordDialog
				open={showPasswordDialog}
				onOpenChange={setShowPasswordDialog}
				isEnabling={pendingTwoFactorEnable === true}
				password={password}
				onPasswordChange={setPassword}
				onSubmit={handlePasswordSubmit}
				error={passwordError}
				loading={loadingPassword}
			/>

			{/* Step 2: TOTP setup (QR code + verify) */}
			<TwoFactorSetupDialog
				open={showSetupDialog}
				onOpenChange={setShowSetupDialog}
				totpUri={totpUri}
				onVerified={handleTotpVerified}
			/>

			{/* Step 3: Save backup codes (shown immediately after setup) */}
			<BackupCodesDialog
				open={showSetupBackupCodesDialog}
				onOpenChange={setShowSetupBackupCodesDialog}
				codes={setupBackupCodes}
				isSetup={true}
				onDone={handleSetupBackupCodesDone}
			/>

			{/* View existing backup codes */}
			<BackupCodesDialog
				open={showViewBackupCodesDialog}
				onOpenChange={setShowViewBackupCodesDialog}
				codes={backupCodes}
			/>

			{/* Generate new backup codes */}
			<GenerateBackupCodesDialog open={showGenerateBackupDialog} onOpenChange={setShowGenerateBackupDialog} />
		</>
	);
}
