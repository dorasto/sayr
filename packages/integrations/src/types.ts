import type { Hono } from "hono";

// -------------------------
// Integration Manifest
// -------------------------
export interface IntegrationManifest {
  id: string;
  name: string;
  version: string;
  description: string;
  icon?: string;
  /** Optional markdown string shown in the integration's Overview sheet. */
  docs?: string;
  api: Hono<any>;
  ui: {
    pages: Record<string, UIPage>;
    components: Record<string, unknown>;
  };
  author?: {
    name: string;
    url?: string;
  };
  noServiceWorker?: boolean;
  requiresExternalService?: boolean;
  externalServiceNote?: string;
}

// -------------------------
// Page/API Types
// -------------------------
export interface UIPageApi {
  path: string;
  methods: {
    get?: Record<string, unknown>;
    post?: Record<string, unknown>;
    patch?: Record<string, unknown>;
    put?: Record<string, unknown>;
    delete?: Record<string, unknown>;
  };
}

export interface UIPage {
  title: string;
  description?: string;
  layout?: "admin" | "full";
  api?: UIPageApi;
  sections?: UISection[];
}

// -------------------------
// Section Types (Input)
// -------------------------
export type UISection = CardSection | TabsSection | GridSection | ListSection;

export interface CardSection {
  type: "card";
  title?: string;
  description?: string;
  data?: string;
  fields?: UIField[];
  children?: UISection[];
  actions?: CardAction[];
}

export interface TabsSection {
  type: "tabs";
  tabs: {
    id: string;
    label: string;
    content: UISection;
  }[];
}

export interface GridSection {
  type: "grid";
  columns?: number;
  children: UISection[];
}

export interface ListSection {
  type: "list";
  data: string;
  title?: string;
  description?: string;
  item: ListItemTemplate;
}

export interface ListItemTemplate {
  fields?: UIField[];
  /** Fields shown in the Create dialog (falls back to `fields` if omitted) */
  createFields?: UIField[];
  children?: UISection[];
  actions?: ListItemAction[];
  key?: string;
}

export interface ListItemAction {
  type: "delete" | "edit" | "create" | "custom";
  label?: string;
  path?: string;
  method?: "POST" | "PATCH" | "PUT" | "DELETE";
}

// -------------------------
// Field Types
// -------------------------
export interface UIField {
  name: string;
  type:
  | "string"
  | "number"
  | "boolean"
  | "select"
  | "textarea"
  | "date"
  | "label"
  | "heading"
  | "readonly";

  label?: string;
  description?: string;
  placeholder?: string;
  required?: boolean;
  options?: { value: string; label: string }[];
  optionsData?: string;
  bind?: string;
  default?: unknown;
}

export type CardAction = {
  type: "save" | "refresh" | "copy" | "open";
  label?: string;
  url?: string;
};

// -------------------------
// Parsed Section Types
// -------------------------
export type ParsedSection =
  | ParsedCardSection
  | ParsedTabsSection
  | ParsedGridSection
  | ParsedListSection;

export interface ParsedCardSection {
  type: "card";
  title?: string;
  description?: string;
  data?: string;
  fields: UIField[];
  children: ParsedSection[];
  actions: CardAction[];
}

export interface ParsedTabsSection {
  type: "tabs";
  tabs: {
    id: string;
    label: string;
    content: ParsedSection;
  }[];
}

export interface ParsedGridSection {
  type: "grid";
  columns: number;
  children: ParsedSection[];
}

export interface ParsedListSection {
  type: "list";
  data: string;
  title?: string;
  description?: string;
  item: ParsedListItemTemplate;
}

export interface ParsedListItemTemplate {
  fields: UIField[];
  createFields: UIField[];
  children: ParsedSection[];
  actions: ListItemAction[];
  keyField?: string;
}
