import * as Icon from "@tabler/icons-react";
export const navigation = [
	{
		title: "Overview",
		icon: Icon.IconLayoutGrid,
		items: [
			{
				title: "Dashboard",
				url: "/admin",
				icon: Icon.IconHome,
				activeIcon: Icon.IconHomeFilled,
			},
			{
				title: "My Tasks",
				url: "#",
			},
			{
				title: "Settings",
				url: "#",
			},
		],
	},
];
