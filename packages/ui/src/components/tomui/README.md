# TabbedDialog Component

A flexible dialog component that supports both top tabs (horizontal) and side tabs (vertical) layouts, similar to Notion's preferences dialog.

## Features

- **Two Layout Modes**: Top tabs (horizontal) and side tabs (vertical)
- **Tab Grouping**: Organize tabs into groups when using side layout with clear group headers
- **Dynamic Headers**: Custom titles and descriptions for each tab in side layout
- **Scrollable Content**: Content area scrolls independently from tabs
- **Responsive Design**: Adapts to different screen sizes
- **Accessibility**: Full keyboard navigation and screen reader support

## Basic Usage

### Top Tabs Layout (Default)

```tsx
import { TabbedDialog, TabPanel, TabbedDialogFooter } from "@repo/ui/components/tomui/tabbed-dialog";

const tabs = [
  { id: "general", label: "General", icon: <Settings className="w-4 h-4" /> },
  { id: "profile", label: "Profile", icon: <User className="w-4 h-4" /> },
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
  
  <TabPanel tabId="profile">
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
  {/* TabPanel components for each tab */}
</TabbedDialog>
```

### Side Tabs Layout with Groups (Legacy)

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

### Side Layout
- Tabs displayed vertically on the left side
- Support for grouping tabs under labeled sections with clear group headers
- Title and description shown in content header (dynamic based on selected tab)
- More space for tab labels and better organization
- Each tab can have its own custom title and description

## Example Component

See `TabbedDialogExample` for a complete working example with both layouts.
