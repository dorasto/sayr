import { Button } from "@repo/ui/components/button";

export default function NotFound() {
	return (
		<>
			<link rel="icon" href="/icon.svg" type="image/svg+xml" sizes="any" />
			<title>404</title>
			<div className="via-surface to-surface flex h-screen items-center bg-[conic-gradient(at_bottom_left,_var(--tw-gradient-stops))] from-primary">
				<div className="mx-auto max-w-xl text-center text-white">
					<h1 className="text-5xl font-black">That's a 404, bud</h1>
					<p className="mb-7 mt-3">
						Sorry, we couldn't find what you were looking for. It either never existed, or we've messed something
						up!
					</p>
					<div className="flex place-content-center items-center gap-3">
						<a href="/">
							<Button className="!border-surface-100 text-surface-100 w-full p-4 font-bold">Back home</Button>
						</a>
						<a href="https://doras.to/discord">
							<Button className="!border-surface-100 text-surface-100 flex w-full gap-2 p-4 font-bold">
								Report an issue
							</Button>
						</a>
					</div>
				</div>
			</div>
		</>
	);
}
