import { useEffect, useState } from "react";
import { Button } from "@repo/ui/components/button";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@repo/ui/components/table";
import { Input } from "@repo/ui/components/input";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@repo/ui/components/alert-dialog";
import { Badge } from "@repo/ui/components/badge";
import { IconCopy, IconCheck } from "@tabler/icons-react";

interface ApiKey {
	id: string;
	name: string;
	prefix: string;
	enabled: boolean;
	expiresAt: Date | null;
	createdAt: Date;
	lastRequest: Date | null;
	requestCount: number;
}

interface SystemApiKeysProps {
	initialData?: ApiKey[];
}

function CopyKeyButton({ text }: { text: string }) {
	const [copied, setCopied] = useState(false);

	const copy = async () => {
		await navigator.clipboard.writeText(text);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	};

	return (
		<Button variant="outline" size="icon" onClick={copy}>
			{copied ? <IconCheck className="h-4 w-4 text-green-500" /> : <IconCopy className="h-4 w-4" />}
		</Button>
	);
}

export function SystemApiKeys({ initialData = [] }: SystemApiKeysProps) {
	const [keys, setKeys] = useState<ApiKey[]>(initialData);
	const [newKeyName, setNewKeyName] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [createdKey, setCreatedKey] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);

	const fetchKeys = async () => {
		try {
			const base =
				import.meta.env.VITE_APP_ENV === "development"
					? "/backend-api/internal"
					: "/api/internal";
			const res = await fetch(`${base}/v1/console/system-api-keys`, {
				credentials: "include",
			});
			const json = await res.json();
			if (json.success) {
				setKeys(
					(json.data as ApiKey[]).map((k) => ({
						...k,
						createdAt: new Date(k.createdAt),
						expiresAt: k.expiresAt ? new Date(k.expiresAt) : null,
						lastRequest: k.lastRequest ? new Date(k.lastRequest) : null,
					}))
				);
			}
		} catch (err) {
			console.error("Failed to fetch API keys:", err);
		}
	};
	useEffect(() => {
		fetchKeys();
	}, []);

	const createKey = async () => {
		if (!newKeyName.trim()) return;
		setIsLoading(true);
		setError(null);
		setCreatedKey(null);

		try {
			const base =
				import.meta.env.VITE_APP_ENV === "development"
					? "/backend-api/internal"
					: "/api/internal";
			const res = await fetch(`${base}/v1/console/system-api-keys`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				credentials: "include",
				body: JSON.stringify({ name: newKeyName.trim() }),
			});
			const json = await res.json();
			if (json.success) {
				setCreatedKey(json.data.key);
				setNewKeyName("");
				await fetchKeys();
			} else {
				setError(json.error || "Failed to create API key");
			}
		} catch (err) {
			setError("Failed to create API key");
		} finally {
			setIsLoading(false);
		}
	};

	const deleteKey = async (keyId: string) => {
		try {
			const base =
				import.meta.env.VITE_APP_ENV === "development"
					? "/backend-api/internal"
					: "/api/internal";
			const res = await fetch(`${base}/v1/console/system-api-keys/${keyId}`, {
				method: "DELETE",
				credentials: "include",
			});
			const json = await res.json();
			if (json.success) {
				await fetchKeys();
			}
		} catch (err) {
			console.error("Failed to delete API key:", err);
		}
	};

	const formatDate = (date: Date | null) => {
		if (!date) return "Never";
		return date.toLocaleDateString("en-US", {
			year: "numeric",
			month: "short",
			day: "numeric",
		});
	};

	return (
		<div className="space-y-4">
			<div className="flex items-center gap-2">
				<Input
					placeholder="API key name (e.g., 'Production API')"
					value={newKeyName}
					onChange={(e) => setNewKeyName(e.target.value)}
					className="max-w-sm"
					onKeyDown={(e) => e.key === "Enter" && createKey()}
				/>
				<Button onClick={createKey} disabled={isLoading || !newKeyName.trim()}>
					{isLoading ? "Creating..." : "Create API Key"}
				</Button>
			</div>

			{error && <p className="text-sm text-red-500">{error}</p>}

			{createdKey && (
				<div className="p-4 bg-green-50 border border-green-200 rounded-lg">
					<p className="text-sm font-medium text-green-800 mb-2">
						API key created successfully! Copy it now — you won't be able to see it
						again.
					</p>
					<div className="flex items-center gap-2">
						<code className="flex-1 p-2 bg-white border rounded font-mono text-sm break-all">
							{createdKey}
						</code>
						<CopyKeyButton text={createdKey} />
					</div>
					<Button
						variant="ghost"
						size="sm"
						className="mt-2"
						onClick={() => setCreatedKey(null)}
					>
						Dismiss
					</Button>
				</div>
			)}

			{keys.length === 0 ? (
				<p className="text-sm text-muted-foreground">No API keys found.</p>
			) : (
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Name</TableHead>
							<TableHead>Prefix</TableHead>
							<TableHead>Status</TableHead>
							<TableHead>Created</TableHead>
							<TableHead>Expires</TableHead>
							<TableHead>Requests</TableHead>
							<TableHead className="w-[50px]"></TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{keys.map((key) => (
							<TableRow key={key.id}>
								<TableCell className="font-medium">{key.name}</TableCell>
								<TableCell>
									<code className="text-xs bg-muted px-1.5 py-0.5 rounded">
										{key.prefix}...
									</code>
								</TableCell>
								<TableCell>
									<Badge variant={key.enabled ? "default" : "secondary"}>
										{key.enabled ? "Active" : "Disabled"}
									</Badge>
								</TableCell>
								<TableCell>{formatDate(key.createdAt)}</TableCell>
								<TableCell>{formatDate(key.expiresAt)}</TableCell>
								<TableCell>{key.requestCount}</TableCell>
								<TableCell>
									<AlertDialog>
										<AlertDialogTrigger asChild>
											<Button variant="ghost" size="icon" className="text-red-500">
												Delete
											</Button>
										</AlertDialogTrigger>
										<AlertDialogContent>
											<AlertDialogHeader>
												<AlertDialogTitle>Delete API Key</AlertDialogTitle>
												<AlertDialogDescription>
													Are you sure you want to delete the API key "{key.name}"? This
													action cannot be undone.
												</AlertDialogDescription>
											</AlertDialogHeader>
											<AlertDialogFooter>
												<AlertDialogCancel>Cancel</AlertDialogCancel>
												<AlertDialogAction
													onClick={() => deleteKey(key.id)}
													className="bg-red-500 hover:bg-red-600"
												>
													Delete
												</AlertDialogAction>
											</AlertDialogFooter>
										</AlertDialogContent>
									</AlertDialog>
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			)}
		</div>
	);
}
