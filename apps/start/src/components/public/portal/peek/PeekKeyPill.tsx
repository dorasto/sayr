import { formatTaskKey } from "@repo/util";
import { usePublicOrganizationLayout } from "@/contexts/publicContextOrg";
import { Pill } from "../ui/Pill";
import { usePeek } from "./peek-context";

/** Header, left side: the post key as a pill (`SAY-55`). */
export function PeekKeyPill() {
	const { organization } = usePublicOrganizationLayout();
	const { shortId } = usePeek();

	if (shortId === null) return null;

	return <Pill variant="gh">{formatTaskKey(organization.shortId, shortId)}</Pill>;
}
