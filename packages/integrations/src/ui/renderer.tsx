import type {
  ParsedSection,
  ParsedListSection,
  ParsedListItemTemplate,
} from "../types";
import { parsePageConfig, type ParsedPage } from "./specs";
import { useState, useEffect, useCallback, useRef } from "react";

import {
  CardContent,
  Card,
} from "@repo/ui/components/card";
import { Checkbox } from "@repo/ui/components/checkbox";
import { Input } from "@repo/ui/components/input";
import { Label } from "@repo/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/components/select";
import { Textarea } from "@repo/ui/components/textarea";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@repo/ui/components/tabs";
import { Button } from "@repo/ui/components/button";
import { Badge } from "@repo/ui/components/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/ui/components/table";
import { ScrollArea } from "@repo/ui/components/scroll-area";
import { Skeleton } from "@repo/ui/components/skeleton";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@repo/ui/components/dialog";
import SimpleClipboard from "@repo/ui/components/tomui/simple-clipboard"

function getByPath(obj: unknown, path: string): unknown {
  if (!path || path === "$") return obj;
  const cleanPath = path.replace(/^\$\.?/, "");
  if (!cleanPath) return obj;

  const isStringify = cleanPath.endsWith(".stringify");
  const targetPath = isStringify
    ? cleanPath.slice(0, -".stringify".length)
    : cleanPath;

  const value = targetPath
    .split(".")
    .reduce(
      (acc: unknown, key) => (acc as Record<string, unknown>)?.[key],
      obj,
    );

  if (isStringify && value !== undefined) {
    return JSON.stringify(value, null, 2);
  }

  return value;
}

function setByPath(
  obj: Record<string, unknown>,
  path: string,
  value: unknown,
): void {
  const cleanPath = path.replace(/^\$\.?/, "");
  if (!cleanPath) return;
  const keys = cleanPath.split(".");
  const lastKey = keys.pop();
  if (!lastKey) return;
  let current = obj;
  for (const key of keys) {
    if (!(key in current)) current[key] = {};
    current = current[key] as Record<string, unknown>;
  }
  current[lastKey] = value;
}

interface IntegrationPageProps {
  integrationId: string;
  pageName: string;
  orgId: string;
  pageConfig?: any;
  onSaveWithToast?: (doFetch: () => Promise<Response>) => Promise<void>;
}

export function IntegrationPage({
  pageName,
  pageConfig,
  integrationId,
  orgId,
  onSaveWithToast,
}: IntegrationPageProps) {
  if (!pageConfig) {
    return (
      <div className="p-4 text-red-500">No page config for "{pageName}"</div>
    );
  }

  const parsedPage = parsePageConfig(pageConfig);

  return (
    <div className="space-y-4">
      <PageRenderer
        page={parsedPage}
        integrationId={integrationId}
        orgId={orgId}
        onSaveWithToast={onSaveWithToast}
      />
    </div>
  );
}

interface PageRendererProps {
  page: ParsedPage;
  integrationId: string;
  orgId: string;
  onSaveWithToast?: (doFetch: () => Promise<Response>) => Promise<void>;
}

function PageRenderer({
  page,
  integrationId,
  orgId,
  onSaveWithToast,
}: PageRendererProps) {
  const apiBase =
    //@ts-expect-error ignore this needed for vite env var typing
    import.meta.env.VITE_APP_ENV === "development"
      ? `/backend-api/integrations/${orgId}`
      : `/api/integrations/${orgId}`;
  const api = page.api;
  const apiPath = api?.path ?? "";

  const [rootData, setRootData] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const savedDataRef = useRef<string>("{}");

  const isDirty = JSON.stringify(rootData) !== savedDataRef.current;

  const fetchData = useCallback(async () => {
    if (!api?.methods?.get) return;

    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/${integrationId}${apiPath}`, {
        credentials: "include",
      });

      if (!res.ok) return;

      const json = await res.json();
      const data = json.data ?? {};
      setRootData(data);
      savedDataRef.current = JSON.stringify(data);
    } finally {
      setLoading(false);
    }
  }, [apiBase, api?.methods?.get, integrationId, apiPath]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const updateData = useCallback((path: string, value: unknown) => {
    setRootData((prev) => {
      const newData = { ...prev };
      setByPath(newData, path, value);
      return newData;
    });
  }, []);

  const doSaveFetch = useCallback((): Promise<Response> => {
    const method = api?.methods?.patch ? "PATCH" : "PUT";
    return fetch(`${apiBase}/${integrationId}${apiPath}`, {
      method,
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(rootData),
    });
  }, [apiBase, integrationId, apiPath, api?.methods?.patch, rootData]);

  const onSave = useCallback(async () => {
    if (!api?.methods?.patch && !api?.methods?.put) return;

    setIsSaving(true);
    try {
      if (onSaveWithToast) {
        await onSaveWithToast(doSaveFetch);
      } else {
        await doSaveFetch();
      }
      savedDataRef.current = JSON.stringify(rootData);
    } finally {
      setIsSaving(false);
    }
  }, [
    api?.methods?.patch,
    api?.methods?.put,
    onSaveWithToast,
    doSaveFetch,
    rootData,
  ]);

  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <div
            // biome-ignore lint/suspicious/noArrayIndexKey: skeleton placeholder
            key={`section-skeleton-${i}`}
            className="flex flex-col gap-3"
          >
            <div className="flex items-start justify-between">
              <div className="flex flex-col gap-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-56" />
              </div>
              <Skeleton className="h-8 w-20 rounded-md" />
            </div>
            <div className="bg-card rounded-lg p-4 flex flex-col gap-4">
              {Array.from({ length: 2 }).map((_, j) => (
                <div
                  // biome-ignore lint/suspicious/noArrayIndexKey: skeleton placeholder
                  key={`field-skeleton-${i}-${j}`}
                  className="flex flex-col gap-2"
                >
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-9 w-full rounded-md" />
                  <Skeleton className="h-3 w-48" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {page.sections.map((section, idx) => (
        <SectionRenderer
          // biome-ignore lint/suspicious/noArrayIndexKey: no stable key available
          key={idx}
          section={section}
          data={rootData}
          pageData={rootData}
          updateData={updateData}
          onSave={onSave}
          onRefresh={fetchData}
          integrationId={integrationId}
          orgId={orgId}
          apiPath={apiPath}
          isDirty={isDirty}
          isSaving={isSaving}
        />
      ))}
    </div>
  );
}

interface SectionRendererProps {
  section: ParsedSection;
  data: Record<string, unknown>;
  /** Full page-level data, for resolving optionsData paths in nested sections/dialogs */
  pageData?: Record<string, unknown>;
  updateData: (path: string, value: unknown) => void;
  onSave: () => void;
  onRefresh: () => void;
  integrationId: string;
  orgId: string;
  apiPath: string;
  isDirty?: boolean;
  isSaving?: boolean;
}

function TabsSectionRenderer(props: SectionRendererProps) {
  const {
    section,
    data,
    pageData,
    updateData,
    onSave,
    onRefresh,
    integrationId,
    orgId,
    apiPath,
    isDirty,
    isSaving,
  } = props;

  const defaultTab = section.type === "tabs" ? section.tabs[0]?.id || "" : "";
  const [active, setActive] = useState(defaultTab);

  if (section.type !== "tabs") return null;

  return (
    <Tabs value={active} onValueChange={setActive}>
      <TabsList>
        {section.tabs.map((t) => (
          <TabsTrigger key={t.id} value={t.id}>
            {t.label}
          </TabsTrigger>
        ))}
      </TabsList>

      {section.tabs.map((t) => (
        <TabsContent key={t.id} value={t.id}>
          <SectionRenderer
            section={t.content}
            data={data}
            pageData={pageData}
            updateData={updateData}
            onSave={onSave}
            onRefresh={onRefresh}
            integrationId={integrationId}
            orgId={orgId}
            apiPath={apiPath}
            isDirty={isDirty}
            isSaving={isSaving}
          />
        </TabsContent>
      ))}
    </Tabs>
  );
}

function SectionRenderer(props: SectionRendererProps) {
  const {
    section,
    data,
    pageData,
    updateData,
    onSave,
    onRefresh,
    integrationId,
    orgId,
    apiPath,
    isDirty,
    isSaving,
  } = props;

  const sectionData =
    section.type === "card" && section.data
      ? getByPath(data, section.data)
      : data;

  if (section.type === "card") {
    const hasSave = section.actions?.some((a) => a.type === "save");
    const hasCopy = section.actions?.some((a) => a.type === "copy");
    const hasNewTab = section.actions?.some((a) => a.type === "open");
    const hasRefresh = section.actions?.some((a) => a.type === "refresh");
    const saveLabel =
      section.actions?.find((a) => a.type === "save")?.label ?? "Save";
    const refreshLabel =
      section.actions?.find((a) => a.type === "refresh")?.label ?? "Refresh";
    const copyUrl =
      section.actions?.find((a) => a.type === "copy")?.url ?? "Copy";
    const copyLabel =
      section.actions?.find((a) => a.type === "copy")?.label ?? "Copy";
    const newTabUrl =
      section.actions?.find((a) => a.type === "open")?.url;
    section.actions?.find((a) => a.type === "copy")?.label ?? "Copy";
    const newTabLabel =
      section.actions?.find((a) => a.type === "open")?.label ?? "";
    return (
      <div className="flex flex-col gap-3">
        {(section.title || section.description || hasSave || hasRefresh || hasCopy) && (
          <div className="flex items-start justify-between">
            <div className="flex flex-col">
              {section.title && (
                <Label variant="heading">{section.title}</Label>
              )}
              {section.description && (
                <Label variant="description">{section.description}</Label>
              )}
            </div>
            <div className="flex items-center gap-2">
              {hasRefresh && (
                <Button variant="ghost" size="sm" onClick={onRefresh}>
                  {refreshLabel}
                </Button>
              )}
              {hasSave && (
                <Button
                  size="sm"
                  variant="primary"
                  disabled={!isDirty || isSaving}
                  onClick={onSave}
                >
                  {isSaving ? "Saving..." : saveLabel}
                </Button>
              )}
              {hasCopy && (
                <SimpleClipboard
                  textToCopy={copyUrl || ""}
                  size="sm"
                  variant="primary"
                  tooltipText={copyLabel}
                >
                </SimpleClipboard>
              )}
              {hasNewTab && newTabUrl && (
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => window.open(newTabUrl)}
                >
                  {newTabLabel}
                </Button>
              )}
            </div>
          </div>
        )}

        <div className="bg-card rounded-lg p-4 flex flex-col gap-4">
          {section.fields?.map((field) => (
            <FieldRenderer
              key={field.name}
              field={field}
              data={sectionData as Record<string, unknown>}
              updateData={(value) => {
                const fullPath =
                  field.bind ??
                  (section.data ? `${section.data}.${field.name}` : field.name);
                updateData(fullPath, value);
              }}
            />
          ))}

          {section.children?.map((child, i) => (
            <SectionRenderer
              // biome-ignore lint/suspicious/noArrayIndexKey: no stable key available
              key={i}
              section={child}
              data={sectionData as Record<string, unknown>}
              pageData={pageData}
              updateData={(path, value) => {
                const fullPath = section.data
                  ? `${section.data}.${path}`
                  : path;
                updateData(fullPath, value);
              }}
              onSave={onSave}
              onRefresh={onRefresh}
              integrationId={integrationId}
              orgId={orgId}
              apiPath={apiPath}
              isDirty={isDirty}
              isSaving={isSaving}
            />
          ))}
        </div>
      </div>
    );
  }

  if (section.type === "list") {
    const items = getByPath(data, section.data) as unknown[];

    return (
      <div className="flex flex-col gap-3">
        {(section.title || section.description) && (
          <div className="flex flex-col">
            {section.title && <Label variant="heading">{section.title}</Label>}
            {section.description && (
              <Label variant="description">{section.description}</Label>
            )}
          </div>
        )}
        <div className="bg-card rounded-lg">
          <ListRenderer
            section={section}
            items={items ?? []}
            integrationId={integrationId}
            orgId={orgId}
            apiPath={apiPath}
            onRefresh={onRefresh}
            pageData={pageData ?? data}
          />
        </div>
      </div>
    );
  }

  if (section.type === "tabs") {
    return (
      <TabsSectionRenderer
        section={section}
        data={data}
        pageData={pageData}
        updateData={updateData}
        onSave={onSave}
        onRefresh={onRefresh}
        integrationId={integrationId}
        orgId={orgId}
        apiPath={apiPath}
        isDirty={isDirty}
        isSaving={isSaving}
      />
    );
  }

  if (section.type === "grid") {
    const cols = section.columns ?? 2;

    return (
      <div
        className="grid gap-4"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
      >
        {section.children?.map((child, idx) => (
          <SectionRenderer
            // biome-ignore lint/suspicious/noArrayIndexKey: no stable key available
            key={idx}
            section={child}
            data={data}
            pageData={pageData}
            updateData={updateData}
            onSave={onSave}
            onRefresh={onRefresh}
            integrationId={integrationId}
            orgId={orgId}
            apiPath={apiPath}
            isDirty={isDirty}
            isSaving={isSaving}
          />
        ))}
      </div>
    );
  }

  return null;
}

interface ListRendererProps {
  section: ParsedListSection;
  items: unknown[];
  integrationId: string;
  orgId: string;
  apiPath: string;
  onRefresh: () => void;
  /** Full page-level data for resolving optionsData paths in the create dialog */
  pageData?: Record<string, unknown>;
}

function ListRenderer({
  section,
  items,
  integrationId,
  orgId,
  apiPath,
  onRefresh,
  pageData,
}: ListRendererProps) {
  const apiBase =
    //@ts-expect-error ignore this needed for vite env var typing
    import.meta.env.VITE_APP_ENV === "development"
      ? `/backend-api/integrations/${orgId}`
      : `/api/integrations/${orgId}`;
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createFormData, setCreateFormData] = useState<Record<string, unknown>>(
    {},
  );
  const [editItem, setEditItem] = useState<Record<string, unknown> | null>(
    null,
  );
  const [editFormData, setEditFormData] = useState<Record<string, unknown>>({});

  const keyField = section.item.keyField ?? "id";
  const createAction = section.item.actions?.find((a) => a.type === "create");
  const editAction = section.item.actions?.find((a) => a.type === "edit");

  /**
   * Flatten one level of nested objects so that e.g. { questions: { question_1: "foo" } }
   * becomes { question_1: "foo" } — matching the flat field names used in createFields.
   */
  function flattenItem(item: Record<string, unknown>): Record<string, unknown> {
    const flat: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(item)) {
      if (val !== null && typeof val === "object" && !Array.isArray(val)) {
        for (const [subKey, subVal] of Object.entries(
          val as Record<string, unknown>,
        )) {
          flat[subKey] = subVal;
        }
      } else {
        flat[key] = val;
      }
    }
    return flat;
  }

  const handleAction = async (
    item: unknown,
    action: NonNullable<ParsedListItemTemplate["actions"]>[0],
  ) => {
    if (!item) return;
    const itemRecord = item as Record<string, unknown>;
    const itemId = itemRecord[keyField];

    if (action.type === "edit") {
      setEditItem(itemRecord);
      setEditFormData(flattenItem(itemRecord));
      return;
    }

    if (action.type === "delete" && action.path) {
      await fetch(`${apiBase}/${integrationId}${action.path}/${itemId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      onRefresh();
    }

    if (action.type === "custom" && action.path && action.method) {
      await fetch(`${apiBase}/${integrationId}${action.path}`, {
        method: action.method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ orgId, ...itemRecord }),
      });
      onRefresh();
    }
  };

  const handleCreate = async () => {
    if (!createAction?.path) return;
    const method = createAction.method ?? "POST";
    await fetch(`${apiBase}/${integrationId}${createAction.path}`, {
      method,
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ orgId, ...createFormData }),
    });
    setIsCreateOpen(false);
    setCreateFormData({});
    onRefresh();
  };

  const handleEdit = async () => {
    if (!editAction?.path || !editItem) return;
    const itemId = editItem[keyField];
    const method = editAction.method ?? "PATCH";
    await fetch(`${apiBase}/${integrationId}${editAction.path}/${itemId}`, {
      method,
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ orgId, ...editFormData }),
    });
    setEditItem(null);
    setEditFormData({});
    onRefresh();
  };

  const hasFields = section.item.fields && section.item.fields.length > 0;
  const hasChildren = section.item.children && section.item.children.length > 0;
  const listActions =
    section.item.actions?.filter((a) => a.type !== "create") ?? [];

  const renderEmptyState = () => (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <p className="text-muted-foreground mb-4">No items found</p>
      {createAction && (
        <Button onClick={() => setIsCreateOpen(true)}>
          {createAction.label ?? "Add Item"}
        </Button>
      )}
    </div>
  );

  if (!Array.isArray(items) || items.length === 0) {
    return (
      <>
        {renderEmptyState()}
        {createAction && (
          <CreateDialog
            open={isCreateOpen}
            onOpenChange={setIsCreateOpen}
            fields={section.item.createFields ?? section.item.fields ?? []}
            formData={createFormData}
            setFormData={setCreateFormData}
            onSubmit={handleCreate}
            title={createAction.label ?? "Create Item"}
            pageData={pageData}
          />
        )}
        {editAction && (
          <CreateDialog
            open={editItem !== null}
            onOpenChange={(open) => {
              if (!open) {
                setEditItem(null);
                setEditFormData({});
              }
            }}
            fields={section.item.createFields ?? section.item.fields ?? []}
            formData={editFormData}
            setFormData={setEditFormData}
            onSubmit={handleEdit}
            title={editAction.label ?? "Edit Item"}
            submitLabel="Save"
            pageData={pageData}
          />
        )}
      </>
    );
  }

  if (hasFields) {
    const fields = section.item.fields!;

    return (
      <>
        <div className="flex justify-end p-4">
          {createAction && (
            <Button onClick={() => setIsCreateOpen(true)}>
              {createAction.label ?? "Add Item"}
            </Button>
          )}
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              {fields.map((field) => (
                <TableHead key={field.name}>
                  {field.label ?? field.name}
                </TableHead>
              ))}
              {section.item.actions && section.item.actions.length > 0 && (
                <TableHead className="text-right">Actions</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item, idx) => {
              const itemRecord = item as Record<string, unknown>;
              const itemKey = String(itemRecord[keyField] ?? idx);

              return (
                <TableRow key={itemKey}>
                  {fields.map((field) => (
                    <TableCell key={field.name}>
                      <ListFieldValue
                        field={field}
                        value={itemRecord[field.name]}
                      />
                    </TableCell>
                  ))}
                  {listActions.length > 0 && (
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {listActions.map((action, aIdx) => (
                          <Button
                            // biome-ignore lint/suspicious/noArrayIndexKey: no stable key available
                            key={aIdx}
                            variant={
                              action.type === "delete" ? "ghost" : "outline"
                            }
                            size="sm"
                            onClick={() => handleAction(item, action)}
                            className={
                              action.type === "delete"
                                ? "text-red-500 hover:text-red-600"
                                : ""
                            }
                          >
                            {action.label ?? action.type}
                          </Button>
                        ))}
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        {createAction && (
          <CreateDialog
            open={isCreateOpen}
            onOpenChange={setIsCreateOpen}
            fields={section.item.createFields ?? section.item.fields ?? []}
            formData={createFormData}
            setFormData={setCreateFormData}
            onSubmit={handleCreate}
            title={createAction.label ?? "Create Item"}
            pageData={pageData}
          />
        )}
        {editAction && (
          <CreateDialog
            open={editItem !== null}
            onOpenChange={(open) => {
              if (!open) {
                setEditItem(null);
                setEditFormData({});
              }
            }}
            fields={section.item.createFields ?? section.item.fields ?? []}
            formData={editFormData}
            setFormData={setEditFormData}
            onSubmit={handleEdit}
            title={editAction.label ?? "Edit Item"}
            submitLabel="Save"
            pageData={pageData}
          />
        )}
      </>
    );
  }

  if (hasChildren) {
    return (
      <div className="space-y-4 p-4">
        {items.map((item, idx) => {
          const itemRecord = item as Record<string, unknown>;
          const itemKey = String(itemRecord[keyField] ?? idx);

          return (
            <Card key={itemKey} className="bg-muted/30">
              <CardContent className="pt-4">
                <div className="space-y-4">
                  {section.item.children?.map((child, cIdx) => (
                    <SectionRenderer
                      // biome-ignore lint/suspicious/noArrayIndexKey: no stable key available
                      key={cIdx}
                      section={child}
                      data={itemRecord}
                      updateData={(path, value) => {
                        const newItems = [...items];
                        const idx = newItems.indexOf(item);
                        if (idx !== -1) {
                          (newItems[idx] as Record<string, unknown>)[path] =
                            value;
                        }
                      }}
                      onSave={() => { }}
                      onRefresh={onRefresh}
                      integrationId={integrationId}
                      orgId={orgId}
                      apiPath={apiPath}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  }

  return (
    <ScrollArea className="h-[300px]">
      <div className="space-y-2 p-4">
        {items.map((item, idx) => {
          const itemRecord = item as Record<string, unknown>;
          return (
            // biome-ignore lint/suspicious/noArrayIndexKey: no stable key available
            <div key={idx} className="p-3 border rounded-md bg-muted/30">
              <pre className="text-xs">
                {JSON.stringify(itemRecord, null, 2)}
              </pre>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}

function ListFieldValue({
  field,
  value,
}: {
  field: { type: string; options?: { value: string; label: string }[] };
  value: unknown;
}) {
  if (field.type === "boolean") {
    return value ? (
      <Badge variant="default">Yes</Badge>
    ) : (
      <Badge variant="secondary">No</Badge>
    );
  }

  if (field.type === "select" && field.options) {
    const opt = field.options.find((o) => o.value === value);
    return opt?.label ?? String(value ?? "");
  }

  if (value === null || value === undefined) {
    return <span className="text-muted-foreground">-</span>;
  }

  if (typeof value === "object") {
    return (
      <span className="text-muted-foreground">{JSON.stringify(value)}</span>
    );
  }

  return String(value);
}

interface FieldRendererProps {
  field: {
    name: string;
    type: string;
    label?: string;
    description?: string;
    placeholder?: string;
    required?: boolean;
    options?: { value: string; label: string }[];
    optionsData?: string;
    bind?: string;
    default?: unknown;
  };
  data: Record<string, unknown>;
  updateData: (v: unknown) => void;
}

function FieldRenderer({ field, data, updateData }: FieldRendererProps) {
  const value = field.bind ? getByPath(data, field.bind) : data[field.name];
  const displayValue = value === undefined ? field.default : value;
  const options = field.options;

  if (field.type === "heading") {
    return (
      <div className="py-2 flex flex-col">
        {field.label && (
          <Label className="" variant={"subheading"}>
            {field.label}
          </Label>
        )}
        {field.description && (
          <Label variant={"description"}>{field.description}</Label>
        )}
      </div>
    );
  }

  if (field.type === "label") {
    return (
      <Label className="text-base pt-3" variant={"description"}>
        {field.label}
      </Label>
    );
  }

  if (field.type === "readonly") {
    return (
      <div className="space-y-1">
        <Label className="text-muted-foreground">
          {field.label || field.name}
        </Label>
        <div className="p-2 bg-muted rounded-md text-sm">
          {displayValue !== undefined ? String(displayValue) : "-"}
        </div>
      </div>
    );
  }

  if (field.type === "boolean") {
    return (
      <div className="flex items-center gap-2">
        <Checkbox
          id={field.name}
          checked={!!displayValue}
          onCheckedChange={(v) => updateData(!!v)}
        />
        <Label htmlFor={field.name}>{field.label || field.name}</Label>
      </div>
    );
  }

  if (field.type === "textarea") {
    return (
      <div className="flex flex-col gap-1">
        <Label>
          {field.label || field.name}
          {field.required && <span className="text-destructive ml-1">*</span>}
        </Label>
        {field.description && (
          <Label variant={"description"}>{field.description}</Label>
        )}
        <Textarea
          value={String(displayValue ?? "")}
          onChange={(e) => updateData(e.target.value)}
          placeholder={field.placeholder}
          className="bg-accent rounded-xl"
        />
      </div>
    );
  }

  if (field.type === "select") {
    const selectValue = displayValue !== undefined ? String(displayValue) : "";
    return (
      <div className="flex flex-col gap-1">
        <Label>
          {field.label || field.name}
          {field.required && <span className="text-destructive ml-1">*</span>}
        </Label>
        {field.description && (
          <Label variant={"description"}>{field.description}</Label>
        )}
        <Select value={selectValue} onValueChange={(val) => updateData(val)}>
          <SelectTrigger className="bg-accent! rounded-xl hover:bg-secondary!">
            <SelectValue placeholder={field.placeholder} />
          </SelectTrigger>
          <SelectContent className="bg-accent rounded-xl">
            {!field.required && <SelectItem value="_none_">None</SelectItem>}
            {options?.map((opt) => (
              <SelectItem
                key={opt.value}
                value={opt.value}
                className="hover:bg-secondary! rounded-xl"
              >
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <Label>
        {field.label || field.name}
        {field.required && <span className="text-destructive ml-1">*</span>}
      </Label>
      {field.description && (
        <Label variant={"description"}>{field.description}</Label>
      )}
      <Input
        type={field.type === "number" ? "number" : "text"}
        className="bg-accent rounded-xl"
        value={String(displayValue ?? "")}
        onChange={(e) =>
          updateData(
            field.type === "number" ? Number(e.target.value) : e.target.value,
          )
        }
        placeholder={field.placeholder}
      />
    </div>
  );
}

interface CreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fields: Array<{
    name: string;
    type: string;
    label?: string;
    description?: string;
    placeholder?: string;
    required?: boolean;
    options?: { value: string; label: string }[];
    optionsData?: string;
  }>;
  formData: Record<string, unknown>;
  setFormData: (data: Record<string, unknown>) => void;
  onSubmit: () => void;
  title: string;
  submitLabel?: string;
  /** Full page-level data so optionsData paths can be resolved */
  pageData?: Record<string, unknown>;
}

function CreateDialog({
  open,
  onOpenChange,
  fields,
  formData,
  setFormData,
  onSubmit,
  title,
  submitLabel = "Create",
  pageData,
}: CreateDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-prose max-h-[80vh] min-h-[30vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle asChild>
            <Label variant={"heading"}>{title}</Label>
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {fields.map((field) => {
            // Resolve optionsData against pageData if available
            const resolvedField =
              field.optionsData && pageData
                ? {
                  ...field,
                  options:
                    (getByPath(pageData, field.optionsData) as {
                      value: string;
                      label: string;
                    }[]) ?? field.options,
                }
                : field;
            return (
              <FieldRenderer
                key={field.name}
                field={resolvedField}
                data={formData}
                updateData={(value) =>
                  setFormData({ ...formData, [field.name]: value })
                }
              />
            );
          })}
        </div>
        <DialogFooter>
          <Button type="submit" onClick={onSubmit}>
            {submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
