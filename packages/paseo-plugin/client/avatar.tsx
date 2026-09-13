import { Icon } from "@getpaseo/plugin/client/react-native";
import { useState } from "react";
import { Image, Text, View } from "react-native";
import type { Theme } from "./types";

/** Local copy of `packages/util/src/index.ts`'s `getInitials` — see the note on `extractPlainText` in `shared/prosekit.ts` for why this isn't an import. */
function getInitials(source: string | null | undefined): string {
	if (!source) return "?";
	const initials = source
		.split(" ")
		.filter(Boolean)
		.map((part) => part[0])
		.join("")
		.slice(0, 2)
		.toUpperCase();
	return initials || "?";
}

/**
 * A person's or org's avatar — the real image when there is one and it loads,
 * initials (people) or a fallback icon (orgs, matching the real web app's
 * `Avatar`/`AvatarImage`/`AvatarFallback` convention in
 * `apps/start/src/components/tasks/shared/inlinelabel.tsx` and
 * `apps/start/src/components/admin/sidebars/settings.tsx`) otherwise.
 *
 * `imageUrl` is used as-is rather than run through `@repo/util`'s
 * `ensureCdnUrl` — every value observed from the CLI/API so far is already an
 * absolute URL, and that helper's own relative-path branch needs a
 * server-side `FILE_CDN` env var this client bundle has no access to anyway.
 * A non-absolute value just falls back to the initials/icon instead of
 * rendering a broken image.
 */
export function Avatar({
	theme,
	name,
	imageUrl,
	size = 20,
	square = false,
	fallbackIcon,
}: {
	theme: Theme;
	name: string | null | undefined;
	imageUrl?: string | null;
	size?: number;
	/** Org logos are rounded-square in the real app, not circular — people avatars are circular. */
	square?: boolean;
	/** e.g. "Building2" for an org with no logo — omit for a person (initials fallback). */
	fallbackIcon?: string;
}) {
	const [failed, setFailed] = useState(false);
	const showImage =
		Boolean(imageUrl) && (imageUrl?.startsWith("http://") || imageUrl?.startsWith("https://")) && !failed;
	const borderRadius = square ? Math.max(4, size / 5) : size / 2;

	if (showImage) {
		return (
			<Image
				source={{ uri: imageUrl ?? undefined }}
				onError={() => setFailed(true)}
				style={{ width: size, height: size, borderRadius }}
			/>
		);
	}

	return (
		<View
			style={{
				width: size,
				height: size,
				borderRadius,
				backgroundColor: theme.colors.surface2,
				alignItems: "center",
				justifyContent: "center",
			}}
		>
			{fallbackIcon ? (
				<Icon name={fallbackIcon} size={size * 0.55} color={theme.colors.foregroundMuted} />
			) : (
				<Text style={{ fontSize: size * 0.4, color: theme.colors.foregroundMuted, fontWeight: "600" }}>
					{getInitials(name)}
				</Text>
			)}
		</View>
	);
}
