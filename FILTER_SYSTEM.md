# Task Filter System

## Overview

The task filter system provides a powerful and user-friendly way to filter tasks in the project management tool. It uses a dropdown menu interface similar to Linear's filtering system with full search capabilities and operator selection.

## Features

### 🎯 **Three-Step Filter Creation**
1. **Select Field**: Choose what to filter by (Status, Priority, Assignee, etc.)
2. **Select Operator**: Choose how to filter ("is", "is not", "include any of", "exclude if any of", etc.)
3. **Select Value(s)**: Choose the specific values to filter by

### 🔍 **Dual Search Functionality**
- **Main Search**: Search through available filter types (Status, Priority, Assignee, etc.)
- **Value Search**: Search within the available values for the selected field

### ⚡ **Smart Operators**
Different operators are available based on the field type:

#### **Selection Operators** (Status, Priority, Labels, Users):
- **"is"** - Exact match for single value
- **"is not"** - Exclude exact match
- **"include any of"** - Match any of multiple values  
- **"exclude if any of"** - Exclude if matches any of multiple values

#### **Content Operators** (Title, Descriptions):
- **"contains"** - Text contains substring
- **"does not contain"** - Text doesn't contain substring  

#### **Date Operators** (Created, Updated):
- **"is before"** - Date is before specified date
- **"is after"** - Date is after specified date
- **"is between"** - Date is between two dates

#### **Empty State Operators** (Assignee, Labels):
- **"is empty"** - Field has no values
- **"is not empty"** - Field has at least one value

### 🎨 **Enhanced UX Features**
- **Recent Filters**: Quick access to recently used filters
- **Visual Badges**: Active filters displayed as removable badges with operator context
- **Color Coding**: Status and labels show their associated colors
- **Keyboard Shortcuts**: Escape key to clear searches
- **Three-Level Navigation**: Field → Operator → Value with back buttons
- **Smart Badge Display**: Shows field name, operator (when relevant), and value

## Usage Flow

1. Click the "Filter" button in the project header
2. **Step 1**: Search and select a filter field (e.g., "Status")
3. **Step 2**: Choose an operator (e.g., "is not")
4. **Step 3**: Search and select value(s) (e.g., "Done")
5. The filter is applied immediately and shown as a badge
6. Remove filters by clicking the X on filter badges

## Examples

- **Status is Todo** - Shows only tasks with Todo status
- **Priority is not None** - Shows tasks that have a priority set
- **Assignee include any of [Alice, Bob]** - Shows tasks assigned to Alice or Bob
- **Labels exclude if any of [Bug]** - Hides tasks with the Bug label
- **Title contains "urgent"** - Shows tasks with "urgent" in the title
- **Assignee is empty** - Shows unassigned tasks

## Architecture

### State Management
```typescript
interface FilterCondition {
  id: string;
  field: FilterField;
  operator: FilterOperator; // New: operator selection
  value: string | string[] | Date | null;
  label?: string;
}
```

### Navigation State
The component tracks three navigation states:
- `selectedField`: Currently selected field (Step 1)
- `selectedOperator`: Currently selected operator (Step 2)  
- Value selection happens in Step 3

## Integration Points

- **ProjectPage**: Renders the three-step filter dropdown
- **TaskList**: Applies filters with full operator support
- **Recent Filters**: Remembers complete field+operator+value combinations
- **Badge Display**: Shows human-readable filter descriptions

## Technical Benefits

- **Flexible Filtering**: Support for complex filter logic like "exclude if any of"
- **Type Safe**: Full TypeScript support with operator validation
- **Extensible**: Easy to add new operators per field type
- **User Friendly**: Clear visual feedback at each step
- **Linear-like UX**: Familiar interface pattern for power users