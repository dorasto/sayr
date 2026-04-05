import { SidebarTrigger } from "@repo/ui/components/doras-ui/sidebar";
import { useIsMobile } from "@repo/ui/hooks/use-mobile.tsx";
import { cn } from "@repo/ui/lib/utils";

// --- PageHeader ---

interface PageHeaderProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Consistent page header container. Renders Zone 1 (identity) and optionally Zone 2 (toolbar).
 * Every admin page should render this at the top.
 *
 * Usage:
 * ```tsx
 * <PageHeader>
 *   <PageHeader.Identity icon={<Icon />} title="Tasks" actions={<Button>New</Button>} />
 *   <PageHeader.Toolbar left={<FilterBar />} right={<ViewDropdown />} />
 * </PageHeader>
 * ```
 */
export function PageHeader({ children, className }: PageHeaderProps) {
  const isMobile = useIsMobile();

  return (
    <div
      className={cn(
        "sticky top-0 z-9999 bg-background shrink-0 flex flex-col w-full",
        className,
      )}
    >
      {children}
    </div>
  );
}

// --- Zone 1: Identity ---

interface IdentityProps {
  /** Optional icon/avatar rendered before the title */
  icon?: React.ReactNode;
  /** Page title text or breadcrumb component */
  title?: React.ReactNode;
  /** Custom content to render instead of icon+title (for complex breadcrumbs) */
  children?: React.ReactNode;
  /** Actions rendered on the right side (e.g., create button, toggle) */
  actions?: React.ReactNode;
  className?: string;
}

function Identity({
  icon,
  title,
  children,
  actions,
  className,
}: IdentityProps) {
  const isMobile = useIsMobile();
  return (
    <div
      className={cn(
        "flex items-center gap-2 h-11 px-3 w-full shrink-0 border-b",
        className,
      )}
    >
      <div className="flex items-center gap-2 min-w-0 flex-1">
        {isMobile && (
          <SidebarTrigger sidebarId="primary-sidebar" className="w-10 h-10" />
        )}
        {children ?? (
          <>
            {icon && <span className="shrink-0 flex items-center">{icon}</span>}
            {title && (
              <span className="text-xs font-medium truncate">{title}</span>
            )}
          </>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-1 shrink-0 ml-auto">
          {actions}
        </div>
      )}
    </div>
  );
}

// --- Zone 2: Toolbar ---

interface ToolbarProps {
  /** Left side content (filters, badges) */
  left?: React.ReactNode;
  /** Right side content (view dropdown, display options) */
  right?: React.ReactNode;
  /** Custom content to render instead of left+right split */
  children?: React.ReactNode;
  className?: string;
}

function Toolbar({ left, right, children, className }: ToolbarProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-1 px-2 h-11 shrink-0 border-b md:gap-2 md:px-3",
        className,
      )}
    >
      {children ?? (
        <>
          {left && (
            <div className="flex items-center gap-1 min-w-0 flex-1">{left}</div>
          )}
          {right && (
            <div className="flex items-center gap-2 shrink-0 ml-auto">
              {right}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// Attach sub-components
PageHeader.Identity = Identity;
PageHeader.Toolbar = Toolbar;
