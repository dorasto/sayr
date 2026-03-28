import type { ParsedSection, ParsedListSection, ParsedListItemTemplate } from "../types";
import { parsePageConfig, type ParsedPage } from "./specs";
import { useState, useEffect, useCallback } from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@repo/ui/components/card";
import { Checkbox } from "@repo/ui/components/checkbox";
import { Input } from "@repo/ui/components/input";
import { Label } from "@repo/ui/components/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@repo/ui/components/select";
import { Textarea } from "@repo/ui/components/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@repo/ui/components/tabs";
import { Button } from "@repo/ui/components/button";
import { Badge } from "@repo/ui/components/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@repo/ui/components/table";
import { ScrollArea } from "@repo/ui/components/scroll-area";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@repo/ui/components/dialog";
function getByPath(obj: unknown, path: string): unknown {
	if (!path || path === "$") return obj;
	const cleanPath = path.replace(/^\$\.?/, "");
	if (!cleanPath) return obj;
	return cleanPath.split(".").reduce((acc: unknown, key) => (acc as Record<string, unknown>)?.[key], obj);
}

function setByPath(obj: Record<string, unknown>, path: string, value: unknown): void {
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
}

export function IntegrationPage({ pageName, pageConfig, integrationId, orgId }: IntegrationPageProps) {
	if (!pageConfig) {
		return <div className="p-4 text-red-500">No page config for "{pageName}"</div>;
	}

	const parsedPage = parsePageConfig(pageConfig);

	return (
		<div className="p-6 space-y-6">
			<div>
				<h1 className="text-2xl font-bold mb-2">{parsedPage.title}</h1>
				{parsedPage.description && (
					<p className="text-muted-foreground">{parsedPage.description}</p>
				)}
			</div>

			<PageRenderer page={parsedPage} integrationId={integrationId} orgId={orgId} />
		</div>
	);
}

interface PageRendererProps {
	page: ParsedPage;
	integrationId: string;
	orgId: string;
}

function PageRenderer({ page, integrationId, orgId }: PageRendererProps) {
	const apiBase = import.meta.env.VITE_APP_ENV === "development"
		? `/backend-api/integrations/${orgId}`
		: `/api/integrations${orgId}`;
	const api = page.api;
	const apiPath = api?.path ?? "";

	const [rootData, setRootData] = useState<Record<string, unknown>>({});
	const [loading, setLoading] = useState(false);

	const fetchData = useCallback(async () => {
		if (!api?.methods?.get) return;

		setLoading(true);
		try {
			const res = await fetch(`${apiBase}/${integrationId}${apiPath}`, {
				credentials: "include",
			});

			if (!res.ok) return;

			const json = await res.json();
			setRootData(json.data ?? {});
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

	const onSave = async () => {
		if (!api?.methods?.patch && !api?.methods?.put) return;

		const method = api.methods.patch ? "PATCH" : "PUT";

		await fetch(`${apiBase}/${integrationId}${apiPath}`, {
			method,
			headers: { "Content-Type": "application/json" },
			credentials: "include",
			body: JSON.stringify(rootData),
		});
	};

	return (
		<div className="space-y-4">
			{loading && api?.methods?.get && (
				<div className="flex items-center gap-2 text-muted-foreground">
					<div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
					<span>Loading...</span>
				</div>
			)}

			{page.sections.map((section, idx) => (
				<SectionRenderer
					key={idx}
					section={section}
					data={rootData}
					updateData={updateData}
					onSave={onSave}
					onRefresh={fetchData}
					integrationId={integrationId}
					orgId={orgId}
					apiPath={apiPath}
				/>
			))}
		</div>
	);
}

interface SectionRendererProps {
	section: ParsedSection;
	data: Record<string, unknown>;
	updateData: (path: string, value: unknown) => void;
	onSave: () => void;
	onRefresh: () => void;
	integrationId: string;
	orgId: string;
	apiPath: string;
}

function SectionRenderer(props: SectionRendererProps) {
	const { section, data, updateData, onSave, onRefresh, integrationId, orgId, apiPath } = props;

	const sectionData = section.type === "card" && section.data ? getByPath(data, section.data) : data;

	if (section.type === "card") {
		return (
			<Card>
				{(section.title || section.description) && (
					<CardHeader>
						{section.title && <CardTitle>{section.title}</CardTitle>}
						{section.description && (
							<CardDescription>{section.description}</CardDescription>
						)}
					</CardHeader>
				)}

				<CardContent className="space-y-4">
					{section.fields?.map((field) => (
						<FieldRenderer
							key={field.name}
							field={field}
							data={sectionData as Record<string, unknown>}
							updateData={(value) => {
								const fullPath = field.bind ?? (section.data ? `${section.data}.${field.name}` : field.name);
								updateData(fullPath, value);
							}}
						/>
					))}

					{section.actions?.map((action, i) =>
						action.type === "save" ? (
							<Button key={i} onClick={onSave}>
								{action.label ?? "Save"}
							</Button>
						) : action.type === "refresh" ? (
							<Button key={i} variant="outline" onClick={onRefresh}>
								{action.label ?? "Refresh"}
							</Button>
						) : null
					)}

					{section.children?.map((child, i) => (
						<SectionRenderer
							key={i}
							section={child}
							data={sectionData as Record<string, unknown>}
							updateData={(path) => {
								const fullPath = section.data ? `${section.data}.${path}` : path;
								updateData(fullPath, undefined);
							}}
							onSave={onSave}
							onRefresh={onRefresh}
							integrationId={integrationId}
							orgId={orgId}
							apiPath={apiPath}
						/>
					))}
				</CardContent>
			</Card>
		);
	}

	if (section.type === "list") {
		const items = getByPath(data, section.data) as unknown[];

		return (
			<Card>
				{(section.title || section.description) && (
					<CardHeader>
						{section.title && <CardTitle>{section.title}</CardTitle>}
						{section.description && (
							<CardDescription>{section.description}</CardDescription>
						)}
					</CardHeader>
				)}

				<CardContent>
					<ListRenderer
						section={section}
						items={items ?? []}
						integrationId={integrationId}
						orgId={orgId}
						apiPath={apiPath}
						onRefresh={onRefresh}
					/>
				</CardContent>
			</Card>
		);
	}

	if (section.type === "tabs") {
		const [active, setActive] = useState(section.tabs[0]?.id || "");

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
							updateData={updateData}
							onSave={onSave}
							onRefresh={onRefresh}
							integrationId={integrationId}
							orgId={orgId}
							apiPath={apiPath}
						/>
					</TabsContent>
				))}
			</Tabs>
		);
	}

	if (section.type === "grid") {
		const cols = section.columns ?? 2;

		return (
			<div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
				{section.children?.map((child, idx) => (
					<SectionRenderer
						key={idx}
						section={child}
						data={data}
						updateData={updateData}
						onSave={onSave}
						onRefresh={onRefresh}
						integrationId={integrationId}
						orgId={orgId}
						apiPath={apiPath}
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
}

function ListRenderer({ section, items, integrationId, orgId, apiPath, onRefresh }: ListRendererProps) {
	const apiBase = import.meta.env.VITE_APP_ENV === "development"
		? `/backend-api/integrations/${orgId}`
		: `/api/integrations${orgId}`;
	const [isCreateOpen, setIsCreateOpen] = useState(false);
	const [createFormData, setCreateFormData] = useState<Record<string, unknown>>({});

	const keyField = section.item.keyField ?? "id";
	const createAction = section.item.actions?.find((a) => a.type === "create");

	const handleAction = async (item: unknown, action: NonNullable<ParsedListItemTemplate["actions"]>[0]) => {
		if (!item) return;
		const itemId = (item as Record<string, unknown>)[keyField];

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
				body: JSON.stringify({ orgId, ...(item as Record<string, unknown>) }),
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

	const hasFields = section.item.fields && section.item.fields.length > 0;
	const hasChildren = section.item.children && section.item.children.length > 0;
	const listActions = section.item.actions?.filter((a) => a.type !== "create") ?? [];

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
						fields={section.item.fields ?? []}
						formData={createFormData}
						setFormData={setCreateFormData}
						onSubmit={handleCreate}
						title={createAction.label ?? "Create Item"}
					/>
				)}
			</>
		);
	}

	if (hasFields) {
		const fields = section.item.fields!;

		return (
			<>
				<div className="flex justify-end mb-4">
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
											<ListFieldValue field={field} value={itemRecord[field.name]} />
										</TableCell>
									))}
									{listActions.length > 0 && (
										<TableCell className="text-right">
											<div className="flex items-center justify-end gap-2">
												{listActions.map((action, aIdx) => (
													<Button
														key={aIdx}
														variant={action.type === "delete" ? "ghost" : "outline"}
														size="sm"
														onClick={() => handleAction(item, action)}
														className={action.type === "delete" ? "text-red-500 hover:text-red-600" : ""}
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
						fields={section.item.fields ?? []}
						formData={createFormData}
						setFormData={setCreateFormData}
						onSubmit={handleCreate}
						title={createAction.label ?? "Create Item"}
					/>
				)}
			</>
		);
	}

	if (hasChildren) {
		return (
			<div className="space-y-4">
				{items.map((item, idx) => {
					const itemRecord = item as Record<string, unknown>;
					const itemKey = String(itemRecord[keyField] ?? idx);

					return (
						<Card key={itemKey} className="bg-muted/30">
							<CardContent className="pt-4">
								<div className="space-y-4">
									{section.item.children?.map((child, cIdx) => (
										<SectionRenderer
											key={cIdx}
											section={child}
											data={itemRecord}
											updateData={(path, value) => {
												const newItems = [...items];
												const idx = newItems.indexOf(item);
												if (idx !== -1) {
													(newItems[idx] as Record<string, unknown>)[path] = value;
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
			<div className="space-y-2">
				{items.map((item, idx) => {
					const itemRecord = item as Record<string, unknown>;
					return (
						<div key={idx} className="p-3 border rounded-md bg-muted/30">
							<pre className="text-xs">{JSON.stringify(itemRecord, null, 2)}</pre>
						</div>
					);
				})}
			</div>
		</ScrollArea>
	);
}

function ListFieldValue({ field, value }: { field: { type: string; options?: { value: string; label: string }[] }; value: unknown }) {
	if (field.type === "boolean") {
		return value ? <Badge variant="default">Yes</Badge> : <Badge variant="secondary">No</Badge>;
	}

	if (field.type === "select" && field.options) {
		const opt = field.options.find((o) => o.value === value);
		return opt?.label ?? String(value ?? "");
	}

	if (value === null || value === undefined) {
		return <span className="text-muted-foreground">-</span>;
	}

	if (typeof value === "object") {
		return <span className="text-muted-foreground">{JSON.stringify(value)}</span>;
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

	const options = field.optionsData ? getByPath(data, field.optionsData) as { value: string; label: string }[] ?? [] : field.options;

	if (field.type === "readonly") {
		return (
			<div className="space-y-1">
				<Label className="text-muted-foreground">{field.label || field.name}</Label>
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
			<div className="space-y-2">
				<Label>
					{field.label || field.name}
					{field.required && <span className="text-red-500 ml-1">*</span>}
				</Label>
				<Textarea
					value={String(displayValue ?? "")}
					onChange={(e) => updateData(e.target.value)}
					placeholder={field.placeholder}
				/>
				{field.description && <p className="text-xs text-muted-foreground">{field.description}</p>}
			</div>
		);
	}

	if (field.type === "select") {
		const selectValue = displayValue !== undefined ? String(displayValue) : "";
		return (
			<div className="space-y-2">
				<Label>
					{field.label || field.name}
					{field.required && <span className="text-red-500 ml-1">*</span>}
				</Label>
				<Select value={selectValue} onValueChange={(val) => updateData(val)}>
					<SelectTrigger>
						<SelectValue placeholder={field.placeholder} />
					</SelectTrigger>
					<SelectContent>
						{!field.required && <SelectItem value="_none_">None</SelectItem>}
						{options?.map((opt) => (
							<SelectItem key={opt.value} value={opt.value}>
								{opt.label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
				{field.description && <p className="text-xs text-muted-foreground">{field.description}</p>}
			</div>
		);
	}

	return (
		<div className="space-y-2">
			<Label>
				{field.label || field.name}
				{field.required && <span className="text-red-500 ml-1">*</span>}
			</Label>
			<Input
				type={field.type === "number" ? "number" : "text"}
				value={String(displayValue ?? "")}
				onChange={(e) => updateData(field.type === "number" ? Number(e.target.value) : e.target.value)}
				placeholder={field.placeholder}
			/>
			{field.description && <p className="text-xs text-muted-foreground">{field.description}</p>}
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
	}>;
	formData: Record<string, unknown>;
	setFormData: (data: Record<string, unknown>) => void;
	onSubmit: () => void;
	title: string;
}

function CreateDialog({ open, onOpenChange, fields, formData, setFormData, onSubmit, title }: CreateDialogProps) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[425px]">
				<DialogHeader>
					<DialogTitle>{title}</DialogTitle>
				</DialogHeader>
				<div className="grid gap-4 py-4">
					{fields.map((field) => (
						<FieldRenderer
							key={field.name}
							field={field}
							data={formData}
							updateData={(value) => setFormData({ ...formData, [field.name]: value })}
						/>
					))}
				</div>
				<DialogFooter>
					<Button type="submit" onClick={onSubmit}>
						Create
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
