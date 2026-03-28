import { UIPage } from "@repo/integrations/types";

export const settingsPage: UIPage = {
	title: "Settings",
	description: "Connect your Discord server and configure message templates",
	layout: "admin",
	api: {
		path: "/settings",
		methods: {
			get: {},
			patch: {}
		}
	},
	sections: [
		{
			type: "card",
			title: "Discord Connection",
			description: "Connect your Discord server using a bot token",
			fields: [
				{
					name: "guildId",
					type: "string",
					label: "Server ID",
					description: "The ID of your Discord server (right-click server name → Copy ID)",
					placeholder: "123456789012345678"
				},
				{
					name: "channelId",
					type: "string",
					label: "Default Channel ID",
					description: "Channel to send notifications to by default",
					placeholder: "123456789012345678"
				}
			],
			actions: [
				{
					type: "save",
					label: "Save Connection"
				}
			]
		}
	]
};

export const questionsPage: UIPage = {
	title: "Questionnaire",
	description: "Configure the questions asked in Discord when creating tasks",
	api: { path: "/questions", methods: { get: {}, patch: {} } },
	sections: [
		{
			type: "card",
			title: "Questions",
			description: "Label for each question field (leave empty to disable)",
			data: "$",
			fields: [
				{
					name: "question_1",
					type: "string",
					label: "Question 1",
					placeholder: "e.g., Description"
				},
				{
					name: "question_2",
					type: "string",
					label: "Question 2",
					placeholder: "e.g., Priority"
				},
				{
					name: "question_3",
					type: "string",
					label: "Question 3",
					placeholder: "e.g., Due Date"
				},
				{
					name: "question_4",
					type: "string",
					label: "Question 4",
					placeholder: "e.g., Assignee"
				}
			],
			actions: [
				{
					type: "save",
					label: "Save Questions"
				}
			]
		},
		{
			type: "card",
			title: "Defaults",
			description: "Default values for new tasks created from Discord",
			fields: [
				{
					name: "status",
					bind: "defaults.status",
					type: "select",
					label: "Default Status",
					required: true,
					options: [
						{ value: "backlog", label: "Backlog" },
						{ value: "todo", label: "To Do" },
						{ value: "in-progress", label: "In Progress" }
					]
				},
				{
					name: "priority",
					bind: "defaults.priority",
					type: "select",
					label: "Default Priority",
					required: true,
					options: [
						{ value: "none", label: "None" },
						{ value: "low", label: "Low" },
						{ value: "medium", label: "Medium" },
						{ value: "high", label: "High" },
						{ value: "urgent", label: "Urgent" }
					]
				},
				{
					name: "categoryId",
					bind: "defaults.categoryId",
					type: "select",
					optionsData: "$.categories",
					label: "Default Category",
					placeholder: "Select category..."
				}
			],
			actions: [
				{
					type: "save",
					label: "Save Defaults"
				}
			]
		}
	]
};
