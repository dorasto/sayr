export const dummyOrg = [
    {
        name: "Doras",
        id: "1",
        slug: "doras",
        avatar: "/avatars/doras.jpg",
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

]

export const dummyIssues = [
  {
    id: "1",
    title: "Sample Bug",
    description: "This is a sample bug description.",
    status: "open",
    priority: "high",
    assignee: "John Doe",
    labels: ["bug", "ui"],
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
        content: "This is another sample comment, created by an internal user and is posted publicly.",
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
      }
    ],
  },
  {
    id: "2",
    title: "Another Bug",
    description: "This is another bug description.",
    status: "in-progress",
    priority: "medium",
    assignee: "Jane Smith",
    labels: ["bug", "backend"],
    createdAt: new Date(),
    updatedAt: new Date(),
    comments: [],
  }
];

export function getIssueById(id: string) {
  return dummyIssues.find((issue) => issue.id === id);
}

