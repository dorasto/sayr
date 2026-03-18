import { createFileRoute, redirect } from "@tanstack/react-router";
import { SubWrapper } from "@/components/generic/wrapper";
import { useLayoutData } from "@/components/generic/Context";
import { useServerEventsSubscription } from "@/hooks/useServerEventsSubscription";
import {
	Tile,
	TileAction,
	TileDescription,
	TileHeader,
	TileIcon,
	TileTitle,
} from "@repo/ui/components/doras-ui/tile";
import { Button } from "@repo/ui/components/button";
import { Switch } from "@repo/ui/components/switch";
import { Avatar, AvatarFallback } from "@repo/ui/components/avatar";
import {
	IconShield,
	IconShieldCheck,
	IconTrash,
	IconDeviceDesktop,
	IconDeviceMobile,
	IconAlertCircle,
	IconRefresh,
} from "@tabler/icons-react";
import { useState, useEffect } from "react";
import { authClient } from "@repo/auth/client";
import { auth as authServer } from "@repo/auth";
import { createServerFn } from "@tanstack/react-start";
import { auth, db, schema } from "@repo/database";
import { and, eq } from "drizzle-orm";
import { TwoFactorPasswordDialog } from "@/components/settings/security/TwoFactorPasswordDialog";
import { TwoFactorSetupDialog } from "@/components/settings/security/TwoFactorSetupDialog";
import { BackupCodesDialog } from "@/components/settings/security/BackupCodesDialog";
import { GenerateBackupCodesDialog } from "@/components/settings/security/GenerateBackupCodesDialog";
import { PasskeySection } from "@/components/settings/security/PasskeySection";

export const getConnections = createServerFn({ method: "GET" })
	.inputValidator((data: { account: schema.userType }) => data)
	.handler(async ({ data }) => {
		try {
			const email = await db.query.account.findFirst({
				where: and(
					eq(auth.account.userId, data.account?.id),
					eq(auth.account.providerId, "credential"),
				),
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

export const getBackupCodes = createServerFn({ method: "GET" })
	.inputValidator((data: { account: schema.userType }) => data)
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
		const connections = await getConnections({
			data: { account: context.account },
		});
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
	const { serverEvents, account } = useLayoutData();
	const { data: session } = authClient.useSession();
	useServerEventsSubscription({ serverEvents });

	const [twoFactorEnabled, setTwoFactorEnabled] = useState(account.twoFactorEnabled || false);
	const hasCredential = !!email;

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
	const [sessions, setSessions] = useState<
		{
			id: string;
			device: string;
			os: string;
			ipAddress: string;
			createdAt: Date;
			expiresAt: Date;
		}[]
	>([]);
	const [loadingSessions, setLoadingSessions] = useState(true);

	useEffect(() => {
		async function loadSessions() {
			try {
				const sessionsList = await authClient.listSessions();
				if (sessionsList.data) {
					setSessions(
						sessionsList.data.map((s) => ({
							id: s.id,
							device: s.userAgent
								? s.userAgent.includes("Mobile")
									? "Mobile"
									: "Desktop"
								: "Unknown",
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

	const handleRevokeSession = async (sessionId: string) => {
		try {
			await authClient.revokeSession({ token: sessionId });
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
				// Step 1 → enable, get TOTP URI + backup codes
				const result = await authClient.twoFactor.enable({ password });
				if (result.error) {
					setPasswordError(
						result.error.message || "Failed to enable two-factor authentication",
					);
					return;
				}
				// Store backup codes from the enable response
				if (result.data?.backupCodes) {
					setSetupBackupCodes(result.data.backupCodes);
				}
				if (result.data?.totpURI) {
					setTotpUri(result.data.totpURI);
				}
				// Move to step 2: TOTP setup dialog
				setShowPasswordDialog(false);
				setPassword("");
				setShowSetupDialog(true);
			} else {
				const result = await authClient.twoFactor.disable({ password });
				if (result.error) {
					setPasswordError(
						result.error.message || "Failed to disable two-factor authentication",
					);
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
		<SubWrapper title="Security" style="compact">
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
								<Button
									variant="outline"
									size="sm"
									onClick={() => setShowGenerateBackupDialog(true)}
								>
									<IconRefresh className="size-4 mr-1" />
									Generate New
								</Button>
							</div>
						</div>
					)}
				</div>

				{/* Passkeys */}
				<PasskeySection />

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
												{_session.device}{" "}
												{_session.id === session?.session?.id && "(Current)"}
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
										<Button
											variant="ghost"
											size="icon"
											onClick={() => handleRevokeSession(_session.id)}
										>
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
			<GenerateBackupCodesDialog
				open={showGenerateBackupDialog}
				onOpenChange={setShowGenerateBackupDialog}
			/>
		</SubWrapper>
	);
}
