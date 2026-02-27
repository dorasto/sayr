import TasqIcon from "@repo/ui/components/brand-icon";
import {
  IconBrandDiscord,
  IconBrandFacebook,
  IconBrandGithub,
  IconBrandInstagram,
  IconBrandLinkedin,
  IconBrandTwitter,
} from "@tabler/icons-react";
import type React from "react";
import { cn } from "@/lib/utils";
import { ModeToggle } from "../ModeToggle";
import { Button } from "../ui/button";

export function Footer() {
  const pages = [
    {
      title: "Pricing",
      href: "/pricing",
    },
    {
      title: "Privacy",
      href: "/legal/privacy",
    },
    {
      title: "Terms",
      href: "/legal/terms",
    },
    {
      title: "Subprocessors",
      href: "/legal/subprocessors",
    },
  ];

  return (
    <div className="relative w-full overflow-hidden bg-background rounded-lg border border-b-0 shadow-2xl p-8">
      <div className="mx-auto max-w-prose w-full items-start justify-between text-sm text-muted-foreground md:px-8">
        <div className="relative flex w-full flex-col">
          <div className="mr-0 mb-4 md:mr-4 md:flex">
            <Logo />
          </div>

          <ul className="flex list-none flex-col gap-4 text-muted-foreground transition-colors sm:flex-row items-start">
            {pages.map((page) => (
              <li key={page.title} className="list-none">
                <a
                  className="hover:text-foreground transition-colors"
                  href={page.href}
                >
                  {page.title}
                </a>
              </li>
            ))}
          </ul>
        </div>
        <div className="mt-8 flex w-full flex-col items-center justify-between sm:flex-row">
          <p className="mb-8 text-muted-foreground sm:mb-0 ">
            &copy; Doras Media Limited
          </p>
          <div className="flex gap-2">
            <a href="https://github.com/dorasto/sayr">
              <Button variant="ghost" size="icon" className="h-6 w-6">
                <IconBrandGithub className="text-muted-foreground transition-all" />
              </Button>
            </a>

            <a href="https://doras.to/discord">
              <Button variant="ghost" size="icon" className="h-6 w-6">
                <IconBrandDiscord className="text-muted-foreground transition-all" />
              </Button>
            </a>
            <ModeToggle />
          </div>
        </div>
      </div>
    </div>
  );
}

const GridLineHorizontal = ({
  className,
  offset,
}: {
  className?: string;
  offset?: string;
}) => {
  return (
    <div
      style={
        {
          "--background": "#ffffff",
          "--color": "rgba(0, 0, 0, 0.2)",
          "--height": "1px",
          "--width": "5px",
          "--fade-stop": "90%",
          "--offset": offset || "200px", //-100px if you want to keep the line inside
          "--color-dark": "rgba(255, 255, 255, 0.2)",
          maskComposite: "exclude",
        } as React.CSSProperties
      }
      className={cn(
        "h-(--height) w-[calc(100%+var(--offset))]",
        "bg-[linear-gradient(to_right,var(--color),var(--color)_50%,transparent_0,transparent)]",
        "bg-size-[var(--width)_var(--height)]",
        "[mask:linear-gradient(to_left,var(--background)_var(--fade-stop),transparent),linear-gradient(to_right,var(--background)_var(--fade-stop),transparent),linear-gradient(black,black)]",
        "mask-exclude",
        "z-30",
        "dark:bg-[linear-gradient(to_right,var(--color-dark),var(--color-dark)_50%,transparent_0,transparent)]",
        className,
      )}
    ></div>
  );
};

const Logo = () => {
  return (
    <a
      href="/"
      className="relative z-20 pl-0 flex items-center space-x-2 px-2 py-1 text-sm font-normal text-foreground"
    >
      <TasqIcon className="size-8!" />
      <span className="font-medium text-foreground">Sayr.io</span>
    </a>
  );
};
