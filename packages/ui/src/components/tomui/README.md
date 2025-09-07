# TabbedDialog Component

A flexible dialog component that supports both top tabs (horizontal) and side tabs (vertical) layouts, similar to Notion's preferences dialog. Features full mobile support with adaptive drawer interface.

## Features

- **Two Layout Modes**: Top tabs (horizontal) and side tabs (vertical)
- **Tab Grouping**: Organize tabs into groups when using side layout with clear group headers
- **Dynamic Headers**: Custom titles and descriptions for each tab in side layout
- **Per-Tab Footers**: Independent footer content for each tab with multiple definition methods
- **Mobile Responsive**: Automatically switches to drawer interface on mobile with dropdown navigation
- **Scrollable Content**: Content area scrolls independently from tabs with sticky headers/footers
- **Hierarchical Data Structure**: Modern groupedTabs structure for better organization
- **Accessibility**: Full keyboard navigation and screen reader support

## Basic Usage

### Top Tabs Layout with Per-Tab Footers

```tsx
import { TabbedDialog, TabPanel, TabbedDialogFooter } from "@repo/ui/components/tomui/tabbed-dialog";

const tabs = [
  { 
    id: "general", 
    label: "General", 
    icon: <Settings className="w-4 h-4" />,
    footer: (
      <TabbedDialogFooter
        onCancel={() => setIsOpen(false)}
        onSubmit={() => console.log("Saving general settings...")}
        submitLabel="Save General"
      />
    )
  },
  { 
    id: "profile", 
    label: "Profile", 
    icon: <User className="w-4 h-4" />,
    // No footer for this tab
  },
];

<TabbedDialog
  isOpen={isOpen}
  onOpenChange={setIsOpen}
  title="Settings"
  tabs={tabs}
  defaultTab="general"
  layout="top" // or omit (default)
>
  <TabPanel tabId="general">
    <h3>General Settings</h3>
    <p>Configure your general preferences.</p>
  </TabPanel>
  
  <TabPanel 
    tabId="profile"
    footer={
      <TabbedDialogFooter
        onCancel={() => setIsOpen(false)}
        onSubmit={() => console.log("Saving profile...")}
        submitLabel="Update Profile"
        successVariant="default"
      />
    }
  >
    <h3>Profile</h3>
    <p>Manage your profile information.</p>
  </TabPanel>
</TabbedDialog>
```

### Side Tabs Layout with Hierarchical Groups (Recommended)

```tsx
const groupedTabs = [
  {
    name: "Account",
    items: [
      { 
        id: "profile", 
        label: "Profile", 
        icon: <User className="w-4 h-4" />, 
        title: "Profile Settings",
        description: "Update your personal information and preferences"
      },
      { 
        id: "security", 
        label: "Security", 
        icon: <Shield className="w-4 h-4" />, 
        title: "Security & Privacy",
        description: "Manage your account security and authentication settings"
      },
    ]
  },
  {
    name: "Preferences",
    items: [
      { 
        id: "notifications", 
        label: "Notifications", 
        icon: <Bell className="w-4 h-4" />, 
        title: "Notification Settings",
        description: "Choose how and when you want to be notified"
      },
      {
        id: "language",
        label: "Language & Region",
        icon: <Globe className="w-4 h-4" />,
        title: "Language & Regional Settings",
        description: "Set your language, timezone, and regional preferences",
        footer: (
          <TabbedDialogFooter
            onCancel={() => setIsOpen(false)}
            onSubmit={() => console.log("Saving language settings...")}
            submitLabel="Apply Settings"
            successVariant="destructive"
          />
        )
      }
    ]
  }
];

<TabbedDialog
  isOpen={isOpen}
  onOpenChange={setIsOpen}
  title="Preferences" // Fallback title
  description="Customize your workspace" // Fallback description
  groupedTabs={groupedTabs}
  defaultTab="profile"
  layout="side"
  size="xl"
>
  <TabPanel tabId="profile">
    <div>Profile content...</div>
  </TabPanel>
  
  <TabPanel 
    tabId="notifications"
    footer={
      <TabbedDialogFooter
        onCancel={() => setIsOpen(false)}
        onSubmit={() => console.log("Saving notifications...")}
        submitLabel="Save Preferences"
      />
    }
  >
    <div>Notification settings...</div>
  </TabPanel>
  
  {/* Other TabPanel components... */}
</TabbedDialog>
```

### Mobile Support

The component automatically adapts to mobile devices by switching to a drawer interface with dropdown navigation:

```tsx
// Same component code works seamlessly on mobile
<TabbedDialog
  isOpen={isOpen}
  onOpenChange={setIsOpen}
  title="Settings"
  groupedTabs={groupedTabs}
  defaultTab="profile"
  layout="side" // Automatically becomes drawer on mobile
>
  {/* TabPanel components remain the same */}
</TabbedDialog>
```

On mobile:
- Dialog becomes a full-screen drawer
- Tabs are accessible via an animated dropdown menu
- Content scrolls naturally within the drawer
- Per-tab footers are preserved and properly positioned

## Per-Tab Footers

The component supports independent footers for each tab using multiple methods:

### Method 1: Footer in Tab Definition

```tsx
const tabs = [
  {
    id: "general",
    label: "General",
    icon: <Settings className="w-4 h-4" />,
    footer: (
      <TabbedDialogFooter
        onCancel={() => setIsOpen(false)}
        onSubmit={() => console.log("Saving general...")}
        submitLabel="Save General"
      />
    )
  }
];
```

### Method 2: Footer in TabPanel Props

```tsx
<TabPanel 
  tabId="profile"
  footer={
    <TabbedDialogFooter
      onCancel={() => setIsOpen(false)}
      onSubmit={() => console.log("Saving profile...")}
      submitLabel="Update Profile"
      successVariant="default"
    />
  }
>
  <div>Profile content...</div>
</TabPanel>
```

### Method 3: Global Footer (Fallback)

```tsx
<TabbedDialog
  footer={
    <TabbedDialogFooter
      onCancel={() => setIsOpen(false)}
      onSubmit={() => console.log("Global save...")}
    />
  }
>
  {/* Tabs without specific footers will use this */}
</TabbedDialog>
```

### Priority Order

1. Tab definition `footer` property (highest priority)
2. TabPanel `footer` prop
3. Global dialog `footer` prop (lowest priority)
4. No footer if none are specified

## Props

### TabbedDialog

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `isOpen` | `boolean` | - | Controls dialog visibility |
| `onOpenChange` | `(open: boolean) => void` | - | Callback when dialog open state changes |
| `title` | `string` | - | Dialog title |
| `description` | `string` | - | Optional dialog description |
| `tabs` | `Tab[]` | - | Array of tab definitions (optional when using groupedTabs) |
| `defaultTab` | `string` | - | ID of the initially active tab |
| `children` | `ReactNode` | - | Tab panel content |
| `footer` | `ReactNode` | - | Optional footer content |
| `className` | `string` | - | Additional CSS classes |
| `size` | `"sm" \| "md" \| "lg" \| "xl"` | `"md"` | Dialog size |
| `layout` | `"top" \| "side"` | `"top"` | Tab layout orientation |
| `groups` | `TabGroup[]` | - | Explicit group definitions (legacy, side layout only) |
| `groupedTabs` | `TabGroupHierarchical[]` | - | Hierarchical group structure (recommended, side layout only) |

### Tab

| Prop | Type | Description |
|------|------|-------------|
| `id` | `string` | Unique tab identifier |
| `label` | `string` | Tab display label |
| `icon` | `ReactNode` | Optional tab icon |
| `group` | `string` | Group name (side layout only) |
| `title` | `string` | Custom title for content header (side layout only) |
| `description` | `string` | Custom description for content header (side layout only) |
| `footer` | `ReactNode` | Per-tab footer content |

### TabGroupHierarchical

| Prop | Type | Description |
|------|------|-------------|
| `name` | `string` | Group display name |
| `items` | `Tab[]` | Tabs in this group |

### TabPanel

| Prop | Type | Description |
|------|------|-------------|
| `tabId` | `string` | Tab ID this panel belongs to |
| `children` | `ReactNode` | Panel content |
| `className` | `string` | Additional CSS classes |
| `footer` | `ReactNode` | Per-panel footer content (alternative to tab definition footer) |

### TabbedDialogFooter

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `onCancel` | `() => void` | - | Cancel button callback |
| `onSubmit` | `() => void` | - | Submit button callback |
| `submitLabel` | `string` | `"Save changes"` | Submit button text |
| `cancelLabel` | `string` | `"Cancel"` | Cancel button text |
| `isSubmitting` | `boolean` | `false` | Shows loading state |
| `submitDisabled` | `boolean` | `false` | Disables submit button |

## Layout Differences

### Top Layout
- Tabs displayed horizontally at the top
- Scrollable tab bar with fade gradients
- Title shown in screen reader only
- Compact design suitable for fewer tabs
- On mobile: Drawer with dropdown navigation

### Side Layout
- Tabs displayed vertically on the left side
- Support for grouping tabs under labeled sections with clear group headers
- Title and description shown in content header (dynamic based on selected tab)
- More space for tab labels and better organization
- Each tab can have its own custom title and description
- On mobile: Drawer with dropdown navigation showing grouped structure

### Mobile Behavior
- Both layouts automatically convert to drawer interface on mobile devices
- Animated dropdown menu provides access to all tabs
- Maintains grouping structure and per-tab footers
- Full-screen drawer for optimal mobile experience
- Content scrolls naturally within the drawer area

## Legacy Support

### Side Tabs Layout with Groups (Legacy)

For backward compatibility, the component still supports the legacy group structure:

```tsx
const tabs = [
  { id: "profile", label: "Profile", icon: <User className="w-4 h-4" />, group: "Account" },
  { id: "security", label: "Security", icon: <Shield className="w-4 h-4" />, group: "Account" },
  { id: "notifications", label: "Notifications", icon: <Bell className="w-4 h-4" />, group: "Preferences" },
  { id: "appearance", label: "Appearance", icon: <Palette className="w-4 h-4" />, group: "Preferences" },
];

<TabbedDialog
  isOpen={isOpen}
  onOpenChange={setIsOpen}
  title="Preferences"
  description="Customize your workspace"
  tabs={tabs}
  defaultTab="profile"
  layout="side"
  size="xl"
>
  {/* TabPanel components for each tab */}
</TabbedDialog>
```

**Note**: The new `groupedTabs` structure is recommended for new implementations as it provides better organization and type safety.

## Example Component

See `TabbedDialogExample` for a complete working example demonstrating:

- Both top and side layouts
- Per-tab footers with different configurations
- Hierarchical group structure
- Mobile responsive behavior
- Custom titles and descriptions
- Various footer button variants

```tsx
import { TabbedDialogExample } from "@repo/ui/components/tomui/tabbed-dialog";

export default function MyPage() {
  return <TabbedDialogExample />;
}
```

The example component includes:
- **Top Layout**: Demonstrates per-tab footers defined in tab objects
- **Side Layout**: Shows hierarchical grouping with dynamic headers
- **Mixed Footer Approaches**: Some tabs use tab-level footers, others use TabPanel footers
- **Responsive Design**: Test on mobile to see drawer behavior
- **Various Configurations**: Different button variants and styling options
