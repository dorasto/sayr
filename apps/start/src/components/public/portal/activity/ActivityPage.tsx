import { authClient } from "@repo/auth/client";
import { Button } from "@repo/ui/components/button";
import { IconUserCircle } from "@tabler/icons-react";
import LoginDialog from "@/components/auth/login";
import { Page } from "@/components/generic/page";
import { usePublicOrganizationLayout } from "@/contexts/publicContextOrg";
import { ActivityBody } from "./ActivityBody";
import { ActivityEmpty } from "./ActivityEmpty";
import { type ActivityUser, ActivityHeader } from "./ActivityHeader";
import { ActivityRowSkeletons } from "./ActivityRowSkeletons";

/** The viewer's own activity on the org's portal: posts they voted on and posts they wrote. Needs a login. */
export function ActivityPage() {
	const { organization } = usePublicOrganizationLayout();
	const { data: session, isPending } = authClient.useSession();
	const user: ActivityUser | null = session?.user
		? { id: session.user.id, name: session.user.name, image: session.user.image }
		: null;

	return (
		<Page>
			<div className="mx-auto w-full max-w-[1120px] px-4 pt-8 pb-16 md:px-6 md:pt-12">
				{!isPending && !user ? (
					<ActivityEmpty
						className="py-20"
						icon={<IconUserCircle className="size-6" />}
						title="Log in to see your activity"
						description="Your votes and posts are kept under your account. Votes you cast while logged out are not tied to you, so they will not show up here."
						actions={<LoginDialog trigger={<Button>Log in</Button>} />}
					/>
				) : (
					<>
						<ActivityHeader user={user} orgName={organization.name} />
						{user ? <ActivityBody userId={user.id} /> : <ActivityRowSkeletons className="max-w-[760px]" />}
					</>
				)}
			</div>
		</Page>
	);
}
