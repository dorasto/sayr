import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@repo/ui/components/dialog";
import { Button } from "@repo/ui/components/button";
import { Input } from "@repo/ui/components/input";
import { Label } from "@repo/ui/components/label";

interface TwoFactorPasswordDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	isEnabling: boolean;
	password: string;
	onPasswordChange: (value: string) => void;
	onSubmit: () => void;
	error: string;
	loading: boolean;
}

export function TwoFactorPasswordDialog({
	open,
	onOpenChange,
	isEnabling,
	password,
	onPasswordChange,
	onSubmit,
	error,
	loading,
}: TwoFactorPasswordDialogProps) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>
						{isEnabling ? "Enable Two-Factor Authentication" : "Disable Two-Factor Authentication"}
					</DialogTitle>
					<DialogDescription>
						{isEnabling
							? "Enter your password to begin setting up two-factor authentication."
							: "Enter your password to disable two-factor authentication."}
					</DialogDescription>
				</DialogHeader>
				<div className="py-4">
					<Label htmlFor="2fa-password">Password</Label>
					<Input
						id="2fa-password"
						type="password"
						value={password}
						onChange={(e) => onPasswordChange(e.target.value)}
						onKeyDown={(e) => e.key === "Enter" && onSubmit()}
						className="mt-2"
						placeholder="Enter your password"
					/>
					{error && <p className="text-sm text-destructive mt-2">{error}</p>}
				</div>
				<DialogFooter>
					<Button variant="outline" onClick={() => onOpenChange(false)}>
						Cancel
					</Button>
					<Button onClick={onSubmit} disabled={loading}>
						{loading ? "Processing..." : "Continue"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
