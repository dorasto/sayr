"use client";
import { signInDoras } from "@repo/auth/client";
import TasqIcon from "@repo/ui/components/brand-icon";
import { Button } from "@repo/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@repo/ui/components/dialog";
import { Input } from "@repo/ui/components/input";
import { Label } from "@repo/ui/components/label";
import { ArrowRight } from "lucide-react";
import Image from "next/image";

interface Props {
	trigger?: React.ReactNode;
}
export default function LoginDialog({ trigger }: Props) {
	return (
		<Dialog>
			<DialogTrigger asChild>{trigger || <Button variant="outline">Sign in</Button>}</DialogTrigger>
			<DialogContent onOpenAutoFocus={(e) => e.preventDefault()}>
				<div className="flex flex-col items-center gap-2">
					<div
						className="flex size-11 shrink-0 items-center justify-center rounded-full bg-accent border"
						aria-hidden="true"
					>
						<TasqIcon className="text-primary" />
						{/* <svg
							className="stroke-zinc-800 dark:stroke-zinc-100"
							xmlns="http://www.w3.org/2000/svg"
							width="20"
							height="20"
							viewBox="0 0 32 32"
							aria-hidden="true"
						>
							<circle cx="16" cy="16" r="12" fill="none" strokeWidth="8" />
						</svg> */}
					</div>
					<DialogHeader>
						<DialogTitle className="sm:text-center">{process.env.NEXT_PUBLIC_PROJECT_NAME}</DialogTitle>
						<DialogDescription className="sm:text-center">Sign in or create an account</DialogDescription>
					</DialogHeader>
				</div>
				<div className="flex items-end gap-2 justify-between">
					<div className="group relative w-full">
						<label
							htmlFor={"email"}
							className="bg-card text-foreground absolute start-1 top-0 z-10 block -translate-y-1/2 px-2 text-xs font-medium group-has-disabled:opacity-50"
						>
							Email address
						</label>
						<Input id={"email"} className="h-10 bg-card" placeholder="hi@yourcompany.com" type="email" />
					</div>
					<Button type="button" size={"icon"} className="shrink-0">
						<ArrowRight />
					</Button>
				</div>

				<div className="relative">
					<div className="absolute inset-0 flex items-center">
						<span className="w-full border-t border-border" />
					</div>
					<div className="relative flex justify-center text-xs uppercase">
						<span className="bg-card px-2 text-muted-foreground">Or continue with</span>
					</div>
				</div>

				<Button
					variant="accent"
					className="bg-accent flex flex-col items-center gap-1 h-14 w-full"
					onClick={signInDoras}
				>
					<Image
						src={"https://cdn.doras.to/doras/icon-white.svg"}
						alt="Doras logo"
						width={20}
						height={20}
						className=" not-dark:hidden"
					/>
					<Image
						src={"https://cdn.doras.to/doras/icon.svg"}
						alt="Doras logo"
						width={20}
						height={20}
						className="dark:hidden"
					/>
					<Label className="font-bold">Doras.to</Label>
				</Button>
			</DialogContent>
		</Dialog>
	);
}
