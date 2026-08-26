import { Alert, AlertDescription } from "@repo/ui/components/alert";
import { Button } from "@repo/ui/components/button";
import { Label } from "@repo/ui/components/label";
import { Switch } from "@repo/ui/components/switch";
import {
	ALL_API_KEY_SCOPES,
	API_KEY_SCOPE_PRESETS,
	API_KEY_SCOPES,
	type ApiKeyScope,
	type ApiKeyScopeResource,
	parseScope,
	scopeDefinition,
} from "@repo/util";
import { IconInfoCircle } from "@tabler/icons-react";

/**
 * Groups are derived from the catalog, never hardcoded — adding a scope to
 * `API_KEY_SCOPES` makes it appear here automatically.
 */
const SCOPE_GROUPS = (Object.keys(API_KEY_SCOPES) as ApiKeyScopeResource[]).map((resource) => ({
	resource,
	title: `${resource.charAt(0).toUpperCase()}${resource.slice(1)}`,
	scopes: ALL_API_KEY_SCOPES.filter((scope) => parseScope(scope)?.resource === resource),
}));

function isSameScopeSet(a: readonly string[], b: readonly string[]) {
	if (a.length !== b.length) return false;
	const set = new Set(a);
	return b.every((scope) => set.has(scope));
}

interface ScopePickerProps {
	value: ApiKeyScope[];
	onChange: (scopes: ApiKeyScope[]) => void;
	disabled?: boolean;
}

export function ScopePicker({ value, onChange, disabled = false }: ScopePickerProps) {
	const selected = new Set<string>(value);

	const toggleScope = (scope: ApiKeyScope, checked: boolean) => {
		if (checked) {
			if (selected.has(scope)) return;
			// Keep catalog order so the stored scope list is stable and readable.
			onChange(ALL_API_KEY_SCOPES.filter((s) => s === scope || selected.has(s)));
			return;
		}
		onChange(value.filter((s) => s !== scope));
	};

	return (
		<div className="flex flex-col gap-4">
			<div className="flex flex-col gap-2">
				<Label variant={"subheading"}>Presets</Label>
				<div className="flex flex-wrap gap-2">
					{API_KEY_SCOPE_PRESETS.map((preset) => {
						const isActive = isSameScopeSet(value, preset.scopes);

						return (
							<Button
								key={preset.id}
								type="button"
								size="sm"
								variant={isActive ? "default" : "outline"}
								title={preset.description}
								disabled={disabled}
								onClick={() => onChange([...preset.scopes])}
							>
								{preset.label}
							</Button>
						);
					})}
					<Button
						type="button"
						size="sm"
						variant="ghost"
						disabled={disabled || value.length === 0}
						onClick={() => onChange([])}
					>
						Clear
					</Button>
				</div>
			</div>

			<div className="flex flex-col gap-4">
				{SCOPE_GROUPS.map((group) => (
					<div key={group.resource} className="flex flex-col gap-2">
						<Label variant={"subheading"}>{group.title}</Label>
						<div className="flex flex-col gap-1 rounded-lg border">
							{group.scopes.map((scope) => {
								const definition = scopeDefinition(scope);
								const inputId = `api-key-scope-${scope}`;

								return (
									<div
										key={scope}
										className="flex items-start justify-between gap-3 px-3 py-2.5 border-b last:border-b-0"
									>
										<div className="min-w-0 flex flex-col">
											<Label htmlFor={inputId} className="text-sm font-medium cursor-pointer">
												{definition.label}
											</Label>
											<span className="text-xs text-muted-foreground">{definition.description}</span>
										</div>
										<Switch
											id={inputId}
											className="shrink-0 mt-0.5"
											checked={selected.has(scope)}
											disabled={disabled}
											onCheckedChange={(checked) => toggleScope(scope, checked)}
										/>
									</div>
								);
							})}
						</div>
					</div>
				))}
			</div>

			<Alert>
				<IconInfoCircle className="size-4" />
				<AlertDescription className="text-xs text-muted-foreground">
					A key can never do more than your own permissions allow in each organization — if your access changes,
					the key's access changes with it. Scopes are recorded on the key now, but are not yet enforced on every
					endpoint, so treat any key as capable of everything your account can do until scope enforcement ships.
				</AlertDescription>
			</Alert>
		</div>
	);
}
