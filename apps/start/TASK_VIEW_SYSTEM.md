# Task View State Management System

This document outlines the consolidated state management system for task views, filters, and URL synchronization in the TanStack Start application.

## Overview

The task view system manages three related pieces of state that need to stay synchronized:

1. **Filter State** - Which filters are applied (status, priority, assignee, category, labels)
2. **View Config State** - How tasks are displayed (grouping, view mode, show empty groups, show completed)
3. **URL State** - Query parameters for sharing and deep linking (`?view=`, `?filters=`)

Previously, these were managed by separate hooks which caused:
- Multiple re-renders per user action (~7 renders per click)
- Race conditions between state updates
- Unnecessary server function calls from URL changes triggering route loaders
- UI flickering and crashes from too many pending requests

## Architecture

### The Problem with nuqs

The original implementation used `nuqs` for URL state management. However, **nuqs does not support TanStack Start** - it triggers full navigation events instead of shallow URL updates, causing `beforeLoad` and `loader` functions to re-run on every URL change.

### The Solution

We created two custom hooks:

1. **`useTasksSearchParams`** - Shallow URL updates using the History API
2. **`useTaskViewManager`** - Consolidated state management with atomic updates

## Core Files

```
apps/start/src/
├── hooks/
│   ├── useTasksSearchParams.ts    # Shallow URL state management
│   └── useTaskViewManager.ts      # Consolidated task view state
├── components/tasks/
│   ├── filter/
│   │   ├── types.ts               # Type definitions
│   │   ├── serialization.ts       # URL serialization/deserialization
│   │   └── use-task-view-state.ts # (DEPRECATED) Old hook
│   ├── side.tsx                   # Sidebar navigation
│   └── views/
│       ├── unified-task-view.tsx  # Main task list/kanban view
│       ├── unified-task-item.tsx  # Individual task item
│       └── TaskViewDropdown.tsx   # View settings dropdown
└── components/generic/
    └── TasksPageNavigationInfo.tsx # Breadcrumb navigation
```

## useTasksSearchParams

Custom hook for shallow URL updates that **does not trigger TanStack Router navigation**.

### Key Features

- Uses `window.history.replaceState()` for shallow updates
- Dispatches custom events (`task-search-params-change`) instead of `popstate`
- Uses `useSyncExternalStore` for React state synchronization
- Prevents route `beforeLoad` and `loader` from re-running

### API

```typescript
const {
  filters,      // Current filters param value
  view,         // Current view slug param value
  task,         // Current task shortId param value
  setSearchParams,  // Batch update multiple params
  setFilters,       // Update filters param
  setView,          // Update view param
  setTask,          // Update task param
} = useTasksSearchParams();

// Example: Atomic update of multiple params
setSearchParams({ view: 'my-view', filters: null });
```

## useTaskViewManager

Consolidated hook that combines filter state and view config into a single TanStack Query key.

### Key Features

- Single query key (`task-view-combined`) for all task view state
- Atomic updates reduce re-render cascades
- Built-in click handling to prevent duplicate updates from useEffects
- Provides semantic methods for common operations

### API

```typescript
const {
  // Current state
  filters,           // FilterState object
  viewConfig,        // TaskViewState object
  viewSlug,          // Current view slug from URL

  // Convenience accessors
  grouping,          // Current grouping setting
  viewMode,          // 'list' | 'kanban'
  showEmptyGroups,   // boolean
  showCompletedTasks, // boolean

  // View operations
  selectView,        // (view: savedViewType) => void
  clearView,         // (newFilters?: FilterState) => void
  applyFilter,       // (filters: FilterState) => void

  // Filter operations
  setFilters,        // (filters: FilterState) => void
  addFilter,         // (condition: FilterCondition) => void
  removeFilter,      // (filterId: string) => void
  updateFilterOperator, // (filterId: string, operator: FilterOperator) => void
  toggleFilterValue, // (conditionId: string, value: string) => void
  clearFilters,      // () => void

  // View config operations
  setViewConfig,     // (updates: Partial<TaskViewState>) => void
  setGrouping,       // (grouping: TaskGroupingId) => void
  setViewMode,       // (mode: 'list' | 'kanban') => void
  setShowEmptyGroups,    // (show: boolean) => void
  setShowCompletedTasks, // (show: boolean) => void

  // Internal
  isHandlingAction,  // Ref to check if action is in progress
} = useTaskViewManager();
```

### Common Operations

#### Selecting a Saved View
```typescript
// Updates filters, view config, and URL atomically
selectView(view);
```

#### Applying a Filter (e.g., from sidebar)
```typescript
// Clears current view, applies filter, resets view config to defaults
const categoryFilter: FilterState = {
  groups: [{
    id: 'category-123-group',
    operator: 'AND',
    conditions: [{
      id: 'category-any-123',
      field: 'category',
      operator: 'any',
      value: '123',
    }],
  }],
  operator: 'AND',
};
applyFilter(categoryFilter);
```

#### Clearing to Default State
```typescript
// Resets filters, view config, and clears URL params
clearView();
```

## State Flow

```
User Action (click sidebar view)
         │
         ▼
┌─────────────────────────────┐
│   useTaskViewManager        │
│   ┌───────────────────────┐ │
│   │ isHandlingAction=true │ │
│   └───────────────────────┘ │
│            │                │
│   ┌────────┴────────┐       │
│   │                 │       │
│   ▼                 ▼       │
│ setCombinedState  setSearchParams
│ (TanStack Query)  (History API)
│            │                │
│            └────────┬───────┘
│                     │       │
│   ┌───────────────────────┐ │
│   │ isHandlingAction=false│ │
│   └───────────────────────┘ │
└─────────────────────────────┘
         │
         ▼
   Re-render (1-2 times)
```

## Type Definitions

### FilterState
```typescript
interface FilterState {
  groups: FilterGroup[];
  operator: 'AND' | 'OR';
}

interface FilterGroup {
  id: string;
  operator: 'AND' | 'OR';
  conditions: FilterCondition[];
}

interface FilterCondition {
  id: string;
  field: FilterField;
  operator: FilterOperator;
  value: string | string[] | Date;
}

type FilterField = 'status' | 'priority' | 'assignee' | 'label' | 'category' | 'dueDate';
type FilterOperator = 'any' | 'all' | 'none' | 'before' | 'after' | 'between';
```

### TaskViewState
```typescript
interface TaskViewState {
  grouping: TaskGroupingId;
  showEmptyGroups: boolean;
  showCompletedTasks: boolean;
  viewMode: 'list' | 'kanban';
}

type TaskGroupingId = 'status' | 'priority' | 'assignee' | 'category' | 'none';
```

## URL Serialization

Filters are serialized to URL-safe strings using base64 encoding:

```typescript
// Serialize
const serialized = serializeFilters(filterState);
// e.g., "eyJncm91cHMiOlt7ImlkIjoi..."

// Deserialize
const filterState = deserializeFilters(serialized);
```

## Migration Guide

### Before (Multiple Hooks)
```typescript
// Old approach - multiple state sources
const { filters: filtersParam, setFilters, view } = useTasksSearchParams();
const { value: filterState, setValue: setFilterState } = useStateManagement<FilterState>('task-filters');
const { viewState, setViewState } = useTaskViewState();

// Manual coordination required
const handleViewClick = (view) => {
  setFilters(null);
  setFilterState(deserializeFilters(view.filterParams));
  setViewState(mapConfigToState(view.viewConfig));
  setSearchParams({ view: view.slug });
};
```

### After (Consolidated Hook)
```typescript
// New approach - single source of truth
const { selectView, clearView, applyFilter, filters, viewMode } = useTaskViewManager();

// Simple, atomic operations
const handleViewClick = (view) => selectView(view);
```

## Performance Benefits

| Metric | Before | After |
|--------|--------|-------|
| Re-renders per click | ~7 | ~2 |
| State sources | 3 | 1 |
| URL updates | Multiple (race conditions) | Single (atomic) |
| Server function calls | Triggered on every URL change | None (shallow updates) |

## Debugging

Add render logging to track re-renders:
```typescript
console.log("[RENDER] ComponentName");
```

Check if action is being handled:
```typescript
const { isHandlingAction } = useTaskViewManager();
console.log("Is handling action:", isHandlingAction.current);
```

## Future Improvements

1. **Remove deprecated `useTaskViewState`** - The old hook is still exported but no longer used
2. **Add URL sync for view config** - Currently only filters and view slug are in URL
3. **Persist view preferences** - Remember last-used view per organization
4. **Add undo/redo support** - Use history stack for filter changes
