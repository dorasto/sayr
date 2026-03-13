import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { authClient } from "@repo/auth/client";
import { Button } from "@repo/ui/components/button";
import { Input } from "@repo/ui/components/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@repo/ui/components/input-otp";
import { IconShieldCheck, IconKey } from "@tabler/icons-react";
import { getAccess } from "@/getAccess";
import { createServerFn } from "@tanstack/react-start";
const checkAuth = createServerFn({ method: "GET" }).handler(async () => {
	const { account } = await getAccess();
	return { account };
});
export const Route = createFileRoute("/auth/2fa")({
	beforeLoad: async () => {
		const { account } = await checkAuth();
		if (account) {
			throw redirect({ to: "/" });
		}
	},
	component: RouteComponent,
});

function RouteComponent() {
	const [code, setCode] = useState("");
	const [error, setError] = useState("");
	const [loading, setLoading] = useState(false);
	const [useBackupCode, setUseBackupCode] = useState(false);

	const handleVerify = async () => {
		if (useBackupCode) {
			if (code.length < 8) {
				setError("Please enter a valid backup code");
				return;
			}
		} else {
			if (code.length < 6) {
				setError("Please enter a valid 6-digit code");
				return;
			}
		}

		setLoading(true);
		setError("");

		try {
			let result;
			if (useBackupCode) {
				result = await authClient.twoFactor.verifyBackupCode({ code });
			} else {
				result = await authClient.twoFactor.verifyTotp({ code });
			}
			if (result.error) {
				setError(result.error.message || "Invalid code");
				return;
			}
			window.location.href = "/";
		} catch (err) {
			setError("An unexpected error occurred");
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="min-h-screen flex items-center justify-center bg-background p-4">
			<div className="w-full max-w-md">
				<div className="flex flex-col items-center text-center mb-8">
					<div className="flex size-16 items-center justify-center rounded-full bg-primary/10 mb-4">
						<IconShieldCheck className="size-8 text-primary" />
					</div>
					<h1 className="text-2xl font-semibold">Two-Factor Authentication</h1>
					<p className="text-muted-foreground mt-2">
						{useBackupCode
							? "Enter one of your backup codes"
							: "Enter the 6-digit code from your authenticator app"}
					</p>
				</div>

				<div className="bg-card rounded-lg border p-6">

					<div className="flex flex-col items-center">
						{useBackupCode ? (
							<Input
								value={code}
								onChange={(e) => setCode(e.target.value.toUpperCase())}
								placeholder="XXXX-XXXX"
								className="text-center font-mono text-lg tracking-widest"
								maxLength={9}
							/>
						) : (
							<InputOTP
								value={code}
								onChange={(value) => setCode(value)}
								maxLength={6}
								className="gap-2"
							>
								<InputOTPGroup>
									<InputOTPSlot index={0} />
									<InputOTPSlot index={1} />
									<InputOTPSlot index={2} />
									<InputOTPSlot index={3} />
									<InputOTPSlot index={4} />
									<InputOTPSlot index={5} />
								</InputOTPGroup>
							</InputOTP>
						)}

						{error && <p className="text-sm text-red-500 mt-4">{error}</p>}

						<div className="flex gap-2 mt-6">
							<Button
								onClick={handleVerify}
								disabled={loading || (useBackupCode ? code.length < 9 : code.length < 6)}
							>
								{loading ? "Verifying..." : "Verify"}
							</Button>
						</div>
						<button
							type="button"
							onClick={() => {
								setUseBackupCode(!useBackupCode);
								setCode("");
								setError("");
							}}
							className="mt-4 text-sm text-muted-foreground hover:text-primary flex items-center gap-1"
						>
							<IconKey className="size-3" />
							{useBackupCode ? "Use authenticator app" : "Use backup code"}
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}