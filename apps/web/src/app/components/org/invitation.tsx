"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@repo/ui/components/button";
import { inviteAction } from "@/app/lib/fetches/organization";
import type { schema } from "@repo/database";
import { Loader2 } from "lucide-react";

interface InvitationActionsProps {
	invite: schema.inviteType;
	organizationName: string;
}

export function InvitationActions({ invite, organizationName }: InvitationActionsProps) {
	const router = useRouter();
	const [isLoading, setIsLoading] = useState<"accept" | "deny" | null>(null);
	const [error, setError] = useState<string | null>(null);

	const handleAction = async (type: "accept" | "deny") => {
		setIsLoading(type);
		setError(null);

		try {
			const result = await inviteAction(invite, type);

			if (result.success) {
				if (type === "accept") {
					// Redirect to the organization after accepting
					router.push(`/`);
					router.refresh();
				} else {
					// Redirect home after declining
					router.push("/");
					router.refresh();
				}
			} else {
				setError(result.error || "Something went wrong. Please try again.");
			}
		} catch {
			setError("An unexpected error occurred. Please try again.");
		} finally {
			setIsLoading(null);
		}
	};

	return (
		<div className="flex flex-col items-center gap-3">
			<div className="flex items-center gap-3">
				<Button
					variant="primary"
					onClick={() => handleAction("accept")}
					disabled={isLoading !== null}
				>
					{isLoading === "accept" ? (
						<>
							<Loader2 className="mr-2 h-4 w-4 animate-spin" />
							Joining...
						</>
					) : (
						`Join ${organizationName}`
					)}
				</Button>
				<Button
					variant="primary"
					className="bg-transparent"
					onClick={() => handleAction("deny")}
					disabled={isLoading !== null}
				>
					{isLoading === "deny" ? (
						<>
							<Loader2 className="mr-2 h-4 w-4 animate-spin" />
							Declining...
						</>
					) : (
						"Decline"
					)}
				</Button>
			</div>
			{error && <p className="text-sm text-destructive">{error}</p>}
		</div>
	);
}
