import { authClient } from "@repo/auth/client";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@repo/ui/components/avatar";
import {
  SidebarMenuButton,
  SidebarMenuItem,
} from "@repo/ui/components/doras-ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@repo/ui/components/dropdown-menu";
import { useIsMobile } from "@repo/ui/hooks/use-mobile.tsx";
import { IconUserCog } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import {
  Bell,
  ChevronsUpDown,
  CreditCard,
  LogOut,
  Moon,
  Sun,
} from "lucide-react";
import { useLayoutData } from "@/components/generic/Context";
import { getDisplayName } from "@repo/util";
import { useTheme } from "@/components/theme-provider";
// import { UserUpdate } from "@/app/components/admin/user/update"; // TODO: Port this component

export default function UserDropdown() {
  const { account } = useLayoutData();
  const isMobile = useIsMobile();
  const { theme, setTheme } = useTheme();
  const editionRaw = import.meta.env.VITE_SAYR_EDITION ?? "community";
  const editionLabel = editionRaw.charAt(0).toUpperCase() + editionRaw.slice(1);
  // const [isUserUpdateOpen, setIsUserUpdateOpen] = useState(false);
  return (
    <>
      <SidebarMenuItem className="min-h-auto">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="small"
              icon={
                <Avatar className="h-4 w-4 rounded-lg">
                  <AvatarImage src={account.image || ""} alt={account.name} />
                  <AvatarFallback className="rounded-lg uppercase">
                    {account.name.slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
              }
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground cursor-pointer"
              tooltip={"Your account"}
            >
              <div className="flex items-center justify-between">
                <span className="truncate font-medium">
                  {getDisplayName(account)}
                </span>
                <ChevronsUpDown className="ml-auto size-4 shrink-0" />
              </div>
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg z-[999]"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage src={account.image || ""} alt={account.name} />
                  <AvatarFallback className="rounded-lg uppercase">
                    {account.name.slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="line-clamp-1 font-medium">
                    {account.name}
                  </span>

                  <span className="truncate text-xs">{account.email}</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <Link to={"/settings"} className="w-full">
                <DropdownMenuItem>
                  <IconUserCog />
                  Account settings
                </DropdownMenuItem>
              </Link>
            </DropdownMenuGroup>
            <DropdownMenuGroup>
              <DropdownMenuItem>
                <CreditCard />
                Billing
              </DropdownMenuItem>
              <Link to={"/mine"} search={{ tab: "inbox" }} className="w-full">
                <DropdownMenuItem>
                  <Bell />
                  Notifications
                </DropdownMenuItem>
              </Link>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              {theme === "dark" ? <Sun /> : <Moon />}
              {theme === "dark" ? "Light mode" : "Dark mode"}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={async () => {
                await authClient.signOut();
                console.log("User signed out successfully.");
                window.location.reload();
              }}
            >
              <LogOut />
              Log out
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
              Sayr {import.meta.env.VITE_APP_VERSION ?? "localhost"} · {editionLabel}
            </DropdownMenuLabel>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
      {/* <UserUpdate isOpen={isUserUpdateOpen} onOpenChange={setIsUserUpdateOpen} /> */}
    </>
  );
}
