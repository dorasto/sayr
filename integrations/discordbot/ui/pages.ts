import type { UIPage } from "@repo/integrations/types";

export const settingsPage: UIPage = {
  title: "Settings",
  description: "Connect your Discord server and configure message templates",
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
      title: "Discord Connection",
      description: "Connect your Discord server using a bot token",
      fields: [
        {
          name: "guildId",
          type: "string",
          label: "Server ID",
          description:
            "The ID of your Discord server (right-click server name → Copy ID)",
          placeholder: "123456789012345678",
        },
        {
          name: "channelId",
          type: "string",
          label: "Default Channel ID",
          description: "Channel to send notifications to by default",
          placeholder: "123456789012345678",
        },
      ],
      actions: [
        {
          type: "save",
          label: "Save Connection",
        },
      ],
    },
  ],
};

export const templatesPage: UIPage = {
  title: "Templates",
  description:
    "Manage Discord task templates. Each template has its own questions and default task values.",
  api: { path: "/templates", methods: { get: {}, post: {} } },
  sections: [
    {
      type: "list",
      data: "$.templates",
      title: "Task Templates",
      description:
        "Templates appear as choices when a user runs /sayr create in Discord",
      item: {
        key: "id",
        fields: [
          {
            name: "name",
            type: "string",
            label: "Name",
          },
          {
            name: "titlePrefix",
            type: "string",
            label: "Title Prefix",
          },
          {
            name: "description",
            type: "string",
            label: "Description",
          },
        ],
        actions: [
          {
            type: "create",
            label: "New Template",
            path: "/templates",
            method: "POST",
          },
          {
            type: "edit",
            label: "Edit",
            path: "/templates",
            method: "PATCH",
          },
          {
            type: "delete",
            label: "Delete",
            path: "/templates",
          },
        ],
        createFields: [
          {
            name: "name",
            type: "string",
            label: "Template Name",
            placeholder: "e.g., Bug Report",
            required: true,
          },
          {
            name: "titlePrefix",
            type: "string",
            label: "Title Prefix",
            placeholder: "e.g., [BUG]",
          },
          {
            name: "description",
            type: "textarea",
            label: "Description",
            placeholder: "Brief description of when to use this template",
          },
          {
            name: "question_1",
            type: "string",
            label: "Question 1",
            placeholder: "e.g., Steps to reproduce (leave empty to disable)",
            required: true,
          },
          {
            name: "question_2",
            type: "string",
            label: "Question 2",
            placeholder: "e.g., Expected behaviour",
          },
          {
            name: "question_3",
            type: "string",
            label: "Question 3",
            placeholder: "e.g., Actual behaviour",
          },
          {
            name: "question_4",
            type: "string",
            label: "Question 4",
            placeholder: "e.g., Additional context",
          },
          {
            name: "status",
            type: "select",
            label: "Status",
            required: true,
            default: "backlog",
            options: [
              { value: "backlog", label: "Backlog" },
              { value: "todo", label: "To Do" },
              { value: "in-progress", label: "In Progress" },
              { value: "done", label: "Done" },
              { value: "canceled", label: "Canceled" },
            ],
          },
          {
            name: "priority",
            type: "select",
            label: "Priority",
            required: true,
            default: "none",
            options: [
              { value: "none", label: "None" },
              { value: "low", label: "Low" },
              { value: "medium", label: "Medium" },
              { value: "high", label: "High" },
              { value: "urgent", label: "Urgent" },
            ],
          },
          {
            name: "categoryId",
            type: "select",
            label: "Category",
            placeholder: "Select category...",
            optionsData: "$.categories",
          },
        ],
      },
    },
  ],
};
