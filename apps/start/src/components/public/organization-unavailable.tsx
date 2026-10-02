import { Button } from "@repo/ui/components/button";

/** Full-screen notice for an organization that does not exist or has its public page turned off. */
export function OrganizationUnavailable() {
	return (
		<div className="via-surface to-surface flex h-screen items-center bg-[conic-gradient(at_bottom_left,var(--tw-gradient-stops))] from-primary">
			<div className="mx-auto max-w-xl text-center text-white">
				<h1 className="text-5xl font-black">Organization Not Available</h1>

				<p className="mb-7 mt-3">
					Sorry, this organization could not be found or isn't available right now. It might have been removed or
					the link is incorrect.
				</p>

				<div className="flex items-center justify-center gap-3">
					<a href="/">
						<Button className="border-surface-100! text-surface-100 w-full p-4 font-bold">Back home</Button>
					</a>

					<a href="https://doras.to/discord">
						<Button className="border-surface-100! text-surface-100 flex w-full gap-2 p-4 font-bold">
							Report an issue
						</Button>
					</a>
				</div>
			</div>
		</div>
	);
}
