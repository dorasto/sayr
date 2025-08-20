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
