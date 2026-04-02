import type { UIPage } from "@repo/integrations/types";

export const settingsPage: UIPage = {
	title: "Settings",
	description: "Configure integration",
	layout: "admin",
	api: {
		path: "/settings",
		methods: {
			get: {},
			patch: {},
		},
	},
	sections: [
		{
			type: "card",
			title: "Configuration",
			description: "Configure your integration settings",
			fields: [
				{
					name: "baseUrl",
					type: "string",
					label: "Base URL",
					description: "URL of the external API",
					placeholder: "https://api.example.com",
					required: true,
					default: "https://admin.sayr.io/api/health"
				},
			],
			actions: [
				{
					type: "save",
					label: "Save Settings",
				},
			],
		},
	],
};

export const itemsPage: UIPage = {
	title: "Items",
	description: "Manage items synced with external API",
	layout: "admin",
	api: {
		path: "/items",
		methods: {
			get: {},
			post: {},
			patch: {},
			delete: {},
		},
	},
	sections: [
		{
			type: "list",
			data: "$",
			title: "Items",
			description: "Items synced with the external API",
			item: {
				key: "id",
				fields: [
					{ name: "name", type: "string", label: "Name" },
					{ name: "description", type: "string", label: "Description" },
					{ name: "enabled", type: "boolean", label: "Enabled" },
				],
				actions: [
					{
						type: "create",
						label: "New Item",
						path: "/items",
						method: "POST",
					},
					{
						type: "edit",
						label: "Edit",
						path: "/items",
						method: "PATCH",
					},
					{
						type: "delete",
						label: "Delete",
						path: "/items",
						method: "DELETE",
					},
				],
				createFields: [
					{
						name: "name",
						type: "string",
						label: "Name",
						required: true,
						placeholder: "Item name",
					},
					{
						name: "description",
						type: "textarea",
						label: "Description",
						placeholder: "Add details...",
					},
					{
						name: "enabled",
						type: "boolean",
						label: "Enabled",
						default: true,
					},
				],
			},
		},
	],
};

export const syncPage: UIPage = {
	title: "Sync",
	description: "Sync items with the external API",
	layout: "admin",
	api: {
		path: "/sync/preview",
		methods: {
			get: {},
		},
	},
	sections: [
		{
			type: "card",
			title: "Preview Result",
			description: "Data returned from the external API",
			data: "$",
			fields: [
				{
					name: "data",
					type: "readonly",
					label: "Response",
					bind: "$.preview.stringify",
				},
			],
		},
	],
};