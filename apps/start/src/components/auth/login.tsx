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
import { cn } from "@repo/ui/lib/utils";
import { IconBrandGithub } from "@tabler/icons-react";
import { ArrowRight } from "lucide-react";

interface Props {
  trigger?: React.ReactNode;
}
export default function LoginDialog({ trigger }: Props) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        {trigger || <Button variant="outline">Sign in</Button>}
      </DialogTrigger>
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
            <DialogTitle className="sm:text-center">
              {import.meta.env.VITE_PROJECT_NAME}
            </DialogTitle>
            <DialogDescription className="sm:text-center">
              Sign in or create an account
            </DialogDescription>
          </DialogHeader>
        </div>
        <LoginComponent isDialog />
      </DialogContent>
    </Dialog>
  );
}

export function LoginComponent({ isDialog = false }: { isDialog?: boolean }) {
  return (
    <div
      className={cn(
        "rounded-2xl mx-auto w-full max-w-prose",
        !isDialog && "bg-card border p-3",
      )}
    >
      <div className="flex flex-col items-center gap-9">
        {!isDialog && (
          <div className="flex flex-col mx-auto items-center gap-2">
            <div
              className="flex size-11 shrink-0 items-center justify-center rounded-full bg-accent border"
              aria-hidden="true"
            >
              <TasqIcon className="text-primary" />
            </div>
            <Label
              variant={"heading"}
              className="text-4xl text-center font-bold"
            >
              {import.meta.env.VITE_PROJECT_NAME}
            </Label>

            <Label variant={"subheading"} className="text-center">
              Sign in or create an account
            </Label>
          </div>
        )}
        <div className="flex items-center gap-3">
          <Button
            variant="accent"
            size={"icon"}
            className="flex flex-col items-center gap-1 w-full size-18 aspect-square"
            onClick={signInDoras}
          >
            <img
              src={"https://cdn.doras.to/doras/icon-white.svg"}
              alt="Doras logo"
              width={20}
              height={20}
              className=" not-dark:hidden"
            />
            <img
              src={"https://cdn.doras.to/doras/icon.svg"}
              alt="Doras logo"
              width={20}
              height={20}
              className="dark:hidden"
            />
          </Button>
          <Button
            variant="accent"
            size={"icon"}
            className="flex flex-col items-center gap-1 w-full aspect-square size-18"
            // onClick={singInGithub}
            disabled
          >
            <IconBrandGithub className="size-5! text-black dark:hidden" />
            <IconBrandGithub className="size-5! text-white hidden dark:block" />
          </Button>
        </div>

        <div className="flex flex-col gap-3">
          {/* <div className="relative">
						<div className="absolute inset-0 flex items-center">
							<span className="w-full border-t border-border" />
						</div>
						<div className="relative flex justify-center text-xs uppercase">
							<span className="bg-card px-2 text-muted-foreground">Or email</span>
						</div>
					</div> */}
          <div className="flex items-end gap-2 justify-between">
            <div className="group relative w-full">
              <label
                htmlFor={"email"}
                className="bg-card text-foreground absolute start-1 top-0 z-10 block -translate-y-1/2 px-2 text-xs font-medium group-has-disabled:opacity-50"
              >
                Email address
              </label>
              <Input
                id={"email"}
                className="h-10 bg-card"
                placeholder="hi@yourcompany.com"
                type="email"
              />
            </div>
            <Button type="button" size={"icon"} className="shrink-0">
              <ArrowRight />
            </Button>
          </div>
        </div>
      </div>
    </div>
    // <Dialog>
    // 	<DialogTrigger asChild>{trigger || <Button variant="outline">Sign in</Button>}</DialogTrigger>
    // 	<DialogContent onOpenAutoFocus={(e) => e.preventDefault()}>
    // 		<div className="flex flex-col items-center gap-2">
    // 			<div
    // 				className="flex size-11 shrink-0 items-center justify-center rounded-full bg-accent border"
    // 				aria-hidden="true"
    // 			>
    // 				<TasqIcon className="text-primary" />
    // 				{/* <svg
    // 					className="stroke-zinc-800 dark:stroke-zinc-100"
    // 					xmlns="http://www.w3.org/2000/svg"
    // 					width="20"
    // 					height="20"
    // 					viewBox="0 0 32 32"
    // 					aria-hidden="true"
    // 				>
    // 					<circle cx="16" cy="16" r="12" fill="none" strokeWidth="8" />
    // 				</svg> */}
    // 			</div>
    // 			<DialogHeader>
    // 				<DialogTitle className="sm:text-center">{process.env.NEXT_PUBLIC_PROJECT_NAME}</DialogTitle>
    // 				<DialogDescription className="sm:text-center">Sign in or create an account</DialogDescription>
    // 			</DialogHeader>
    // 		</div>
    // 		<div className="flex items-end gap-2 justify-between">
    // 			<div className="group relative w-full">
    // 				<label
    // 					htmlFor={"email"}
    // 					className="bg-card text-foreground absolute start-1 top-0 z-10 block -translate-y-1/2 px-2 text-xs font-medium group-has-disabled:opacity-50"
    // 				>
    // 					Email address
    // 				</label>
    // 				<Input id={"email"} className="h-10 bg-card" placeholder="hi@yourcompany.com" type="email" />
    // 			</div>
    // 			<Button type="button" size={"icon"} className="shrink-0">
    // 				<ArrowRight />
    // 			</Button>
    // 		</div>

    // 		<div className="relative">
    // 			<div className="absolute inset-0 flex items-center">
    // 				<span className="w-full border-t border-border" />
    // 			</div>
    // 			<div className="relative flex justify-center text-xs uppercase">
    // 				<span className="bg-card px-2 text-muted-foreground">Or continue with</span>
    // 			</div>
    // 		</div>

    // 		<Button
    // 			variant="accent"
    // 			className="bg-accent flex flex-col items-center gap-1 h-14 w-full"
    // 			onClick={signInDoras}
    // 		>
    // 			<Image
    // 				src={"https://cdn.doras.to/doras/icon-white.svg"}
    // 				alt="Doras logo"
    // 				width={20}
    // 				height={20}
    // 				className=" not-dark:hidden"
    // 			/>
    // 			<Image
    // 				src={"https://cdn.doras.to/doras/icon.svg"}
    // 				alt="Doras logo"
    // 				width={20}
    // 				height={20}
    // 				className="dark:hidden"
    // 			/>
    // 			<Label className="font-bold">Doras.to</Label>
    // 		</Button>
    // 		<Button
    // 			variant="accent"
    // 			className="bg-accent flex flex-col items-center gap-1 h-14 w-full"
    // 			// onClick={singInGithub}
    // 			disabled
    // 		>
    // 			<IconBrandGithub className="size-5! text-black dark:hidden" />
    // 			<IconBrandGithub className="size-5! text-white hidden dark:block" />
    // 			<Label className="font-bold">GitHub</Label>
    // 		</Button>
    // 	</DialogContent>
    // </Dialog>
  );
}
