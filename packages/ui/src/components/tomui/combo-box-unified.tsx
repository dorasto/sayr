"use client";

import { CheckIcon, ChevronDownIcon, XIcon } from "lucide-react";
import * as React from "react";
import { useIsMobile } from "../../hooks/use-mobile";
import { cn } from "../../lib/utils";
import { Badge } from "../badge";
import { Button } from "../button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "../command";
import { Drawer, DrawerContent, DrawerTrigger } from "../custom-sidebar-drawer";
import { Popover, PopoverContent, PopoverTrigger } from "../popover";

// Context for the ComboBox
interface ComboBoxContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
  value?: string;
  values?: string[];
  onValueChange?: (value: string | null) => void;
  onValuesChange?: (values: string[]) => void;
  isMultiple: boolean;
  isMobile: boolean;
}

const ComboBoxContext = React.createContext<ComboBoxContextValue | undefined>(
  undefined,
);

function useComboBox() {
  const context = React.useContext(ComboBoxContext);
  if (!context) {
    throw new Error("ComboBox components must be used within a ComboBox");
  }
  return context;
}

// Root ComboBox component
interface ComboBoxProps {
  children: React.ReactNode;
  // Single selection
  value?: string;
  onValueChange?: (value: string | null) => void;
  // Multiple selection
  values?: string[];
  onValuesChange?: (values: string[]) => void;
  // External control of open state
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

function ComboBox({
  children,
  value,
  onValueChange,
  values,
  onValuesChange,
  open: externalOpen,
  onOpenChange,
}: ComboBoxProps) {
  const [internalOpen, setInternalOpen] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);
  const isMultiple = values !== undefined || onValuesChange !== undefined;
  const isMobile = useIsMobile();

  // Use external open state if provided, otherwise use internal state
  const open = externalOpen !== undefined ? externalOpen : internalOpen;
  const setOpen = onOpenChange || setInternalOpen;

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const contextValue = {
    open,
    setOpen,
    value,
    values,
    onValueChange,
    onValuesChange,
    isMultiple,
    isMobile: mounted ? isMobile : false, // Default to desktop during SSR/initial render
  };

  // During SSR and initial render, always render as desktop to avoid hydration mismatch
  // After mounting, render based on actual mobile detection
  const shouldRenderMobile = mounted && isMobile;

  return (
    <ComboBoxContext.Provider value={contextValue}>
      {!shouldRenderMobile ? (
        <Popover open={open} onOpenChange={setOpen}>
          {children}
        </Popover>
      ) : (
        <Drawer open={open} onOpenChange={setOpen}>
          {children}
        </Drawer>
      )}
    </ComboBoxContext.Provider>
  );
}

// Trigger component
interface ComboBoxTriggerProps {
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  asChild?: boolean;
}

function ComboBoxTrigger({
  children,
  className,
  disabled,
  asChild = false,
}: ComboBoxTriggerProps) {
  const { open, isMobile } = useComboBox();

  if (!isMobile) {
    if (asChild) {
      return <PopoverTrigger asChild>{children}</PopoverTrigger>;
    }
    return (
      <PopoverTrigger asChild>
        <Button
          variant="primary"
          aria-expanded={open}
          className={cn("justify-start text-xs shadow-none", className)}
          disabled={disabled}
        >
          {children}
        </Button>
      </PopoverTrigger>
    );
  }

  if (asChild) {
    return <DrawerTrigger asChild>{children}</DrawerTrigger>;
  }
  return (
    <DrawerTrigger asChild>
      <Button
        variant="outline"
        className={cn(
          "bg-background hover:bg-background border-input justify-between px-3 font-normal outline-offset-0 outline-none focus-visible:outline-[3px] w-full",
          className,
        )}
        disabled={disabled}
      >
        {children}
      </Button>
    </DrawerTrigger>
  );
}

// Content component
interface ComboBoxContentProps {
  children: React.ReactNode;
  className?: string;
  align?: "start" | "center" | "end";
  side?: "top" | "right" | "bottom" | "left";
  /** When true, disables cmdk's built-in client-side filtering (for server-side search) */
  shouldFilter?: boolean;
}

function ComboBoxContent({
  children,
  className,
  align = "start",
  side = "bottom",
  shouldFilter,
}: ComboBoxContentProps) {
  const { isMobile } = useComboBox();

  if (!isMobile) {
    return (
      <PopoverContent
        className={cn("w-full p-0 w-72", className)}
        align={align}
        side={side}
        // onOpenAutoFocus={(e) => e.preventDefault()}
        onWheel={(e) => {
          // Allow wheel events to bubble for scrolling
          e.stopPropagation();
        }}
      >
        <Command shouldFilter={shouldFilter}>{children}</Command>
      </PopoverContent>
    );
  }

  return (
    <DrawerContent>
      <div className="mt-4 border-t">
        <Command shouldFilter={shouldFilter}>{children}</Command>
      </div>
    </DrawerContent>
  );
}

// Value component for displaying selected items
interface ComboBoxValueProps {
  placeholder?: string;
  children?: React.ReactNode;
}

function ComboBoxValue({
  placeholder = "Select items...",
  children,
}: ComboBoxValueProps) {
  const { value, values, isMultiple } = useComboBox();

  if (children) {
    return <>{children}</>;
  }

  if (isMultiple) {
    if (!values || values.length === 0) {
      return <span className="text-muted-foreground">{placeholder}</span>;
    }
    // For multiple selection, return placeholder - the actual rendering should be done by custom children
    return <span className="text-muted-foreground">{placeholder}</span>;
  } else {
    if (!value) {
      return <span className="text-muted-foreground">{placeholder}</span>;
    }
    // For single selection, return placeholder - the actual rendering should be done by custom children
    return <span className="text-muted-foreground">{placeholder}</span>;
  }
}

// Icon component for the chevron
function ComboBoxIcon() {
  return (
    <ChevronDownIcon className="h-4 w-4 shrink-0 text-muted-foreground/80 ml-auto" />
  );
}

// Search input component
interface ComboBoxSearchProps {
  placeholder?: string;
  className?: string;
  icon?: React.ReactNode;
  /** Called with the current search string on every keystroke */
  onValueChange?: (value: string) => void;
}

function ComboBoxSearch({
  placeholder = "Search...",
  className,
  icon,
  onValueChange,
}: ComboBoxSearchProps) {
  return (
    <CommandInput
      icon={icon}
      placeholder={placeholder}
      className={className}
      onValueChange={onValueChange}
    />
  );
}

// List component
interface ComboBoxListProps {
  children: React.ReactNode;
  className?: string;
}

function ComboBoxList({ children, className }: ComboBoxListProps) {
  return <CommandList className={className}>{children}</CommandList>;
}

// Empty component
interface ComboBoxEmptyProps {
  children: React.ReactNode;
  className?: string;
}

function ComboBoxEmpty({ children, className }: ComboBoxEmptyProps) {
  return (
    <CommandEmpty className={cn("p-3", className)}>{children}</CommandEmpty>
  );
}

// Group component
interface ComboBoxGroupProps {
  children: React.ReactNode;
}

function ComboBoxGroup({ children }: ComboBoxGroupProps) {
  return <CommandGroup className="flex-1">{children}</CommandGroup>;
}

// Item component
interface ComboBoxItemProps {
  value: string;
  children: React.ReactNode;
  disabled?: boolean;
  onSelect?: (value: string) => void;
  searchValue?: string;
  showCheck?: boolean;
}

function ComboBoxItem({
  value,
  children,
  disabled,
  onSelect,
  searchValue,
  showCheck = true,
}: ComboBoxItemProps) {
  const {
    value: selectedValue,
    values: selectedValues,
    onValueChange,
    onValuesChange,
    isMultiple,
    setOpen,
  } = useComboBox();

  const isSelected = isMultiple
    ? selectedValues?.includes(value) || false
    : selectedValue === value;
  const itemValue = searchValue ? `${searchValue} ${value}` : value;

  const handleSelect = () => {
    if (onSelect) {
      onSelect(value);
      return;
    }

    if (isMultiple && onValuesChange) {
      const current = selectedValues || [];
      const next = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      onValuesChange(next);
      // Keep open for multi-select
    } else if (!isMultiple && onValueChange) {
      onValueChange(value === selectedValue ? null : value);
      setOpen(false);
    }
  };

  return (
    <CommandItem value={itemValue} disabled={disabled} onSelect={handleSelect}>
      {children}
      {showCheck && isSelected && <CheckIcon className="h-4 w-4 ml-auto" />}
    </CommandItem>
  );
}

// Selected items component for multiple selection
interface ComboBoxSelectedProps {
  children?: (items: string[]) => React.ReactNode;
  maxVisible?: number;
  onRemove?: (value: string) => void;
}

function ComboBoxSelected({
  children,
  maxVisible = 3,
  onRemove,
}: ComboBoxSelectedProps) {
  const { values, onValuesChange } = useComboBox();

  if (!values || values.length === 0) {
    return null;
  }

  const handleRemove = (value: string) => {
    if (onRemove) {
      onRemove(value);
    } else if (onValuesChange) {
      onValuesChange(values.filter((v) => v !== value));
    }
  };

  if (children) {
    return <>{children(values)}</>;
  }

  // Default rendering
  if (values.length > maxVisible) {
    return <span>{values.length} selected</span>;
  }

  return (
    <div className="flex flex-wrap gap-1 flex-1 min-w-0">
      {values.map((value) => (
        <Badge
          key={value}
          variant="secondary"
          className="flex items-center gap-1 text-xs h-5"
        >
          <span className="truncate">{value}</span>
          <XIcon
            className="h-3 w-3 cursor-pointer hover:bg-muted rounded-sm"
            onClick={() => {
              handleRemove(value);
            }}
          />
        </Badge>
      ))}
    </div>
  );
}

export {
  ComboBox,
  ComboBoxTrigger,
  ComboBoxContent,
  ComboBoxValue,
  ComboBoxIcon,
  ComboBoxSearch,
  ComboBoxList,
  ComboBoxEmpty,
  ComboBoxGroup,
  ComboBoxItem,
  ComboBoxSelected,
};
