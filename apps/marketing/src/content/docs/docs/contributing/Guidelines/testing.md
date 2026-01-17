---
title: Testing Guide
description: Writing and running tests in the Sayr codebase
sidebar:
   order: 6
---

Sayr uses [Vitest](https://vitest.dev/) for testing. This guide covers how to write and run tests effectively.

## Running Tests

### All Tests

```bash
pnpm -F start test
```

### Watch Mode

Run tests in watch mode during development:

```bash
pnpm -F start test -- --watch
```

### Specific Tests

```bash
# Run tests matching a pattern
pnpm -F start test -- --testNamePattern="createTask"

# Run a specific test file
pnpm -F start test -- src/lib/__tests__/task.test.ts

# Run tests in a directory
pnpm -F start test -- src/lib/__tests__/
```

### With Coverage

```bash
pnpm -F start test -- --coverage
```

## Test File Structure

Test files should be placed in `__tests__` directories adjacent to the code they test:

```
src/
├── lib/
│   ├── __tests__/
│   │   ├── task.test.ts
│   │   └── organization.test.ts
│   ├── task.ts
│   └── organization.ts
├── components/
│   ├── __tests__/
│   │   └── TaskCard.test.tsx
│   └── TaskCard.tsx
```

### File Naming

- Unit tests: `{name}.test.ts` or `{name}.test.tsx`
- Integration tests: `{name}.integration.test.ts`

## Writing Tests

### Basic Test Structure

```typescript
import { describe, it, expect, beforeEach, afterEach } from "vitest";

describe("TaskService", () => {
   beforeEach(() => {
      // Setup before each test
   });

   afterEach(() => {
      // Cleanup after each test
   });

   describe("createTask", () => {
      it("should create a task with valid data", async () => {
         const task = await createTask({
            title: "Test Task",
            organizationId: "org-123",
         });

         expect(task).toBeDefined();
         expect(task.title).toBe("Test Task");
      });

      it("should throw error with invalid data", async () => {
         await expect(
            createTask({ title: "", organizationId: "" })
         ).rejects.toThrow("Invalid task data");
      });
   });
});
```

### Testing Async Functions

```typescript
import { describe, it, expect } from "vitest";

describe("fetchTasks", () => {
   it("should return tasks for organization", async () => {
      const tasks = await fetchTasks("org-123");

      expect(tasks).toBeInstanceOf(Array);
      expect(tasks.length).toBeGreaterThan(0);
   });

   it("should handle errors gracefully", async () => {
      // Test with invalid org ID
      const result = await fetchTasks("invalid-org");

      expect(result).toEqual([]);
   });
});
```

### Testing with Mocks

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createTask } from "../task";

// Mock the database module
vi.mock("@repo/database", () => ({
   db: {
      insert: vi.fn().mockReturnThis(),
      values: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([{ id: "task-123", title: "Test" }]),
   },
   schema: {
      task: {},
   },
}));

describe("createTask", () => {
   beforeEach(() => {
      vi.clearAllMocks();
   });

   it("should insert task into database", async () => {
      const result = await createTask({
         title: "New Task",
         organizationId: "org-123",
      });

      expect(result).toEqual({ id: "task-123", title: "Test" });
   });
});
```

### Testing React Components

```typescript
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TaskCard } from "../TaskCard";

describe("TaskCard", () => {
   const mockTask = {
      id: "task-123",
      title: "Test Task",
      status: "todo",
      description: "A test task",
   };

   it("should render task title", () => {
      render(<TaskCard task={mockTask} />);

      expect(screen.getByText("Test Task")).toBeInTheDocument();
   });

   it("should call onClick when clicked", () => {
      const handleClick = vi.fn();
      render(<TaskCard task={mockTask} onClick={handleClick} />);

      fireEvent.click(screen.getByRole("article"));

      expect(handleClick).toHaveBeenCalledWith(mockTask);
   });

   it("should display status badge", () => {
      render(<TaskCard task={mockTask} />);

      expect(screen.getByText("todo")).toBeInTheDocument();
   });
});
```

### Testing Hooks

```typescript
import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useTaskFilter } from "../useTaskFilter";

describe("useTaskFilter", () => {
   it("should initialize with default filters", () => {
      const { result } = renderHook(() => useTaskFilter());

      expect(result.current.filters).toEqual({
         status: null,
         priority: null,
         assignee: null,
      });
   });

   it("should update filters", () => {
      const { result } = renderHook(() => useTaskFilter());

      act(() => {
         result.current.setFilter("status", "in-progress");
      });

      expect(result.current.filters.status).toBe("in-progress");
   });

   it("should clear all filters", () => {
      const { result } = renderHook(() => useTaskFilter());

      act(() => {
         result.current.setFilter("status", "done");
         result.current.setFilter("priority", "high");
         result.current.clearFilters();
      });

      expect(result.current.filters).toEqual({
         status: null,
         priority: null,
         assignee: null,
      });
   });
});
```

## Mocking Patterns

### Mocking API Calls

```typescript
import { vi } from "vitest";

// Mock fetch globally
global.fetch = vi.fn();

beforeEach(() => {
   vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: [] }),
   } as Response);
});

afterEach(() => {
   vi.restoreAllMocks();
});
```

### Mocking Modules

```typescript
// Mock entire module
vi.mock("@repo/database", () => ({
   db: mockDb,
   schema: mockSchema,
}));

// Mock specific exports
vi.mock("@repo/util", async () => {
   const actual = await vi.importActual("@repo/util");
   return {
      ...actual,
      generateSlug: vi.fn().mockReturnValue("mocked-slug"),
   };
});
```

### Mocking Environment Variables

```typescript
import { vi, beforeEach, afterEach } from "vitest";

describe("config", () => {
   const originalEnv = process.env;

   beforeEach(() => {
      vi.resetModules();
      process.env = { ...originalEnv };
   });

   afterEach(() => {
      process.env = originalEnv;
   });

   it("should use production URL in production", async () => {
      process.env.NODE_ENV = "production";
      process.env.API_URL = "https://api.sayr.io";

      const { config } = await import("../config");

      expect(config.apiUrl).toBe("https://api.sayr.io");
   });
});
```

## Test Utilities

### Custom Render Function

Create a custom render function that includes providers:

```typescript
// src/test/utils.tsx
import { render, RenderOptions } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactElement } from "react";

const createTestQueryClient = () =>
   new QueryClient({
      defaultOptions: {
         queries: { retry: false },
         mutations: { retry: false },
      },
   });

function AllProviders({ children }: { children: React.ReactNode }) {
   const queryClient = createTestQueryClient();

   return (
      <QueryClientProvider client={queryClient}>
         {children}
      </QueryClientProvider>
   );
}

const customRender = (
   ui: ReactElement,
   options?: Omit<RenderOptions, "wrapper">
) => render(ui, { wrapper: AllProviders, ...options });

export * from "@testing-library/react";
export { customRender as render };
```

### Test Fixtures

Create reusable test data:

```typescript
// src/test/fixtures/task.ts
import type { TaskWithLabels } from "@repo/database";

export const createMockTask = (
   overrides?: Partial<TaskWithLabels>
): TaskWithLabels => ({
   id: "task-123",
   organizationId: "org-123",
   title: "Test Task",
   description: "A test task description",
   status: "todo",
   priority: "medium",
   createdAt: new Date("2024-01-01"),
   updatedAt: new Date("2024-01-01"),
   createdById: "user-123",
   labels: [],
   assignees: [],
   comments: [],
   createdBy: {
      id: "user-123",
      name: "Test User",
      image: null,
   },
   ...overrides,
});

export const mockTasks: TaskWithLabels[] = [
   createMockTask({ id: "task-1", title: "First Task" }),
   createMockTask({ id: "task-2", title: "Second Task", status: "in-progress" }),
   createMockTask({ id: "task-3", title: "Third Task", status: "done" }),
];
```

## Best Practices

### 1. Test Behavior, Not Implementation

```typescript
// Bad - testing implementation details
it("should call setState with new value", () => {
   const setState = vi.spyOn(React, "useState");
   // ...
});

// Good - testing behavior
it("should display updated value after change", () => {
   render(<Counter />);
   fireEvent.click(screen.getByText("+"));
   expect(screen.getByText("1")).toBeInTheDocument();
});
```

### 2. Use Descriptive Test Names

```typescript
// Bad
it("works", () => { /* ... */ });

// Good
it("should return empty array when organization has no tasks", () => { /* ... */ });
```

### 3. Arrange-Act-Assert Pattern

```typescript
it("should update task status", async () => {
   // Arrange
   const task = createMockTask({ status: "todo" });

   // Act
   const updated = await updateTaskStatus(task.id, "done");

   // Assert
   expect(updated.status).toBe("done");
});
```

### 4. Test Edge Cases

```typescript
describe("parseTaskId", () => {
   it("should parse valid task ID", () => {
      expect(parseTaskId("TASK-123")).toBe(123);
   });

   it("should return null for invalid format", () => {
      expect(parseTaskId("invalid")).toBeNull();
   });

   it("should handle empty string", () => {
      expect(parseTaskId("")).toBeNull();
   });

   it("should handle null input", () => {
      expect(parseTaskId(null as any)).toBeNull();
   });
});
```

### 5. Keep Tests Independent

Each test should be able to run in isolation:

```typescript
// Bad - tests depend on each other
let task: Task;

it("should create task", async () => {
   task = await createTask({ title: "Test" });
});

it("should update task", async () => {
   // Depends on previous test!
   await updateTask(task.id, { title: "Updated" });
});

// Good - tests are independent
it("should create task", async () => {
   const task = await createTask({ title: "Test" });
   expect(task).toBeDefined();
});

it("should update task", async () => {
   const task = await createTask({ title: "Test" });
   const updated = await updateTask(task.id, { title: "Updated" });
   expect(updated.title).toBe("Updated");
});
```

## Debugging Tests

### Run Single Test

```bash
pnpm -F start test -- --testNamePattern="should create task"
```

### Verbose Output

```bash
pnpm -F start test -- --reporter=verbose
```

### Debug Mode

Add `debugger` statement and run:

```bash
pnpm -F start test -- --inspect-brk
```

Then open Chrome DevTools at `chrome://inspect`.
