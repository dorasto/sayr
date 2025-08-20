export const dummyOrg = [
	{
		name: "Doras",
		id: "1",
		slug: "doras",
		avatar:
			"https://cdn.doras.to/doras/assets/05c5db48-cfba-49d7-82a1-5b4a3751aa40/49ca4647-65ed-412e-95c6-c475633d62af.png",
		banner:
			"https://cdn.doras.to/doras/assets/05c5db48-cfba-49d7-82a1-5b4a3751aa40/2980edae-36d3-409f-ba25-d8e0c08c3a15.jpeg",
		users: [
			{
				name: "Tommerty",
				email: "tom@doras.to",
				avatar: "/avatars/tommerty.jpg",
				role: "Admin",
			},
			{
				name: "Jane Doe",
				email: "jane@doras.to",
				avatar: "/avatars/jane.jpg",
				role: "User",
			},
		],
	},
];

export const dummyIssues = [
	{
		id: "8782",
		title:
			"You can't compress the program without quantifying the open-source SSD pixel!",
		description:
			"You can't compress the program without quantifying the open-source SSD pixel!",
		status: "in progress",
		labels: ["documentation"],
		priority: "medium",
		assignee: "Tommerty",
		createdAt: new Date(),
		updatedAt: new Date(),
		comments: [
			{
				id: "1",
				author: "Jane Smith",
				usertype: "external",
				content: "This is a sample comment.",
				public: true,
				createdAt: new Date(),
				updatedAt: new Date(),
			},
			{
				id: "2",
				author: "John Doe",
				usertype: "internal",
				content:
					"This is another sample comment, created by an internal user and is posted publicly.",
				public: true,
				createdAt: new Date(),
				updatedAt: new Date(),
			},
			{
				id: "3",
				author: "John Doe",
				usertype: "internal",
				content: "This is a third sample comment.",
				public: false,
				createdAt: new Date(),
				updatedAt: new Date(),
			},
		],
	},
	{
		id: "7878",
		title:
			"Try to calculate the EXE feed, maybe it will index the multi-byte pixel!",
		description:
			"Try to calculate the EXE feed, maybe it will index the multi-byte pixel!",
		status: "backlog",
		labels: ["documentation"],
		priority: "medium",
		assignee: "Jane Doe",
		createdAt: new Date(),
		updatedAt: new Date(),
		comments: [],
	},
	{
		id: "7839",
		title: "We need to bypass the neural TCP card!",
		description: "We need to bypass the neural TCP card!",
		status: "todo",
		labels: ["bug"],
		priority: "high",
		assignee: "Tommerty",
		createdAt: new Date(),
		updatedAt: new Date(),
		comments: [],
	},
	{
		id: "5562",
		title:
			"The SAS interface is down, bypass the open-source pixel so we can back up the PNG bandwidth!",
		description:
			"The SAS interface is down, bypass the open-source pixel so we can back up the PNG bandwidth!",
		status: "backlog",
		labels: ["feature"],
		priority: "medium",
		assignee: "Jane Doe",
		createdAt: new Date(),
		updatedAt: new Date(),
		comments: [],
	},
	{
		id: "8686",
		title:
			"I'll parse the wireless SSL protocol, that should driver the API panel!",
		description:
			"I'll parse the wireless SSL protocol, that should driver the API panel!",
		status: "canceled",
		labels: ["feature"],
		priority: "medium",
		assignee: "Tommerty",
		createdAt: new Date(),
		updatedAt: new Date(),
		comments: [],
	},
	{
		id: "1280",
		title:
			"Use the digital TLS panel, then you can transmit the haptic system!",
		description:
			"Use the digital TLS panel, then you can transmit the haptic system!",
		status: "done",
		labels: ["bug"],
		priority: "high",
		assignee: "Jane Doe",
		createdAt: new Date(),
		updatedAt: new Date(),
		comments: [],
	},
	{
		id: "7262",
		title:
			"The UTF8 application is down, parse the neural bandwidth so we can back up the PNG bandwidth!",
		description:
			"The UTF8 application is down, parse the neural bandwidth so we can back up the PNG bandwidth!",
		status: "done",
		labels: ["feature"],
		priority: "high",
		assignee: "Tommerty",
		createdAt: new Date(),
		updatedAt: new Date(),
		comments: [],
	},
	{
		id: "1138",
		title:
			"Generating the driver won't do anything, we need to quantify the 1080p SMTP bandwidth!",
		description:
			"Generating the driver won't do anything, we need to quantify the 1080p SMTP bandwidth!",
		status: "in progress",
		labels: ["feature"],
		priority: "medium",
		assignee: "Jane Doe",
		createdAt: new Date(),
		updatedAt: new Date(),
		comments: [],
	},
	{
		id: "7184",
		title: "We need to program the back-end THX pixel!",
		description: "We need to program the back-end THX pixel!",
		status: "todo",
		labels: ["feature"],
		priority: "low",
		assignee: "Tommerty",
		createdAt: new Date(),
		updatedAt: new Date(),
		comments: [],
	},
	{
		id: "5160",
		title:
			"Calculating the bus won't do anything, we need to navigate the back-end JSON protocol!",
		description:
			"Calculating the bus won't do anything, we need to navigate the back-end JSON protocol!",
		status: "in progress",
		labels: ["documentation"],
		priority: "high",
		assignee: "Jane Doe",
		createdAt: new Date(),
		updatedAt: new Date(),
		comments: [],
	},
	{
		id: "5618",
		title:
			"Generating the driver won't do anything, we need to index the online SSL application!",
		description:
			"Generating the driver won't do anything, we need to index the online SSL application!",
		status: "done",
		labels: ["documentation"],
		priority: "medium",
		assignee: "Tommerty",
		createdAt: new Date(),
		updatedAt: new Date(),
		comments: [],
	},
	{
		id: "6699",
		title:
			"I'll transmit the wireless JBOD capacitor, that should hard drive the SSD feed!",
		description:
			"I'll transmit the wireless JBOD capacitor, that should hard drive the SSD feed!",
		status: "backlog",
		labels: ["documentation"],
		priority: "medium",
		assignee: "Jane Doe",
		createdAt: new Date(),
		updatedAt: new Date(),
		comments: [],
	},
];

export function getIssueById(id: string) {
	return dummyIssues.find((issue) => issue.id === id);
}

export function getOrgBySlug(slug: string) {
	return dummyOrg.find((org) => org.slug === slug);
}

export const fullyDummy = [
	{
		org: {
			name: "Doras",
			id: 1,
			slug: "doras",
			avatar:
				"https://cdn.doras.to/doras/assets/05c5db48-cfba-49d7-82a1-5b4a3751aa40/49ca4647-65ed-412e-95c6-c475633d62af.png",
			banner:
				"https://cdn.doras.to/doras/assets/05c5db48-cfba-49d7-82a1-5b4a3751aa40/2980edae-36d3-409f-ba25-d8e0c08c3a15.jpeg",
			users: [
				{
					name: "Tommerty",
					email: "tom@doras.to",
					id: 4,
					avatar: "/avatars/tommerty.jpg",
					role: "Admin",
				},
				{
					name: "Jane Doe",
					email: "jane@doras.to",
					id: 5,
					avatar: "/avatars/jane.jpg",
					role: "User",
				},
				{
					name: "John Smith",
					email: "john@doras.to",
					id: 6,
					avatar: "/avatars/john.jpg",
					role: "User",
				},
			],
			teams: [
				{
					name: "Administration",
					id: 2,
					members: [
						{
							id: 4, // Tommerty
						},
					],
				},
				{
					name: "Development",
					id: 3,
					members: [
						{
							id: 5, // Jane Doe
						},
						{
							id: 6, // John Smith
						},
					],
				},
			],
			projects: [
				{
					name: "Doras.to",
					id: 1,
					description: "The main project for Doras.to",
					createdAt: new Date(),
					updatedAt: new Date(),
					labels: [
						"feature",
						"documentation",
						"bug",
						"blocks",
						"blogging",
						"mediakit",
						"account management",
						"organization",
					],
					category: ["Bug", "Feature", "Documentation", "Enhancement"],
					statuses: ["open", "in progress", "closed"],
					meta: [
						{ repo: "https://github.com/doras/doras" },
						{
							release: [
								"not yet released",
								"closed beta",
								"open beta",
								"general availability",
							],
						},
					],
					issues: [
						{
							id: 1,
							title: "Compressing problems",
							description:
								"You can't compress the program without quantifying the open-source SSD pixel!",
							category: "Bug",
							status: "in progress",
							labels: ["Bug"],
							priority: "medium",
							assignee: 4,
							meta: {
								release: "not yet released",
							},
							createdAt: new Date(),
							updatedAt: new Date(),
							comments: [
								{
									id: 1,
									author: "Jane Smith",
									usertype: "external",
									content: "This is a sample comment.",
									public: true,
									createdAt: new Date(),
									updatedAt: new Date(),
								},
								{
									id: 2,
									author: "John Doe",
									usertype: "internal",
									content:
										"This is another sample comment, created by an internal user and is posted publicly.",
									public: true,
									createdAt: new Date(),
									updatedAt: new Date(),
								},
								{
									id: 3,
									author: "John Doe",
									usertype: "internal",
									content: "This is a third sample comment.",
									public: false,
									createdAt: new Date(),
									updatedAt: new Date(),
								},
							],
						},
					],
				},
			],
		},
	},
];
