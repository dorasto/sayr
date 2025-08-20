import * as React from "react";
import { useParams } from "react-router";
import { Link } from "react-router";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { dummyIssues, getOrgBySlug, getCategories } from "~/lib/dummy";
import { ArrowUpIcon, MessageCircleIcon } from "lucide-react";

export default function OrgPage() {
	const { slug } = useParams();
	const org = getOrgBySlug(slug || "");
	
	const [searchTerm, setSearchTerm] = React.useState("");
	const [selectedCategory, setSelectedCategory] = React.useState<string | null>(null);
	
	const categories = getCategories();
	
	// Filter issues based on search term and selected category
	const filteredIssues = React.useMemo(() => {
		return dummyIssues.filter(issue => {
			const matchesSearch = issue.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
				issue.description.toLowerCase().includes(searchTerm.toLowerCase());
			const matchesCategory = selectedCategory ? issue.category === selectedCategory : true;
			return matchesSearch && matchesCategory;
		});
	}, [searchTerm, selectedCategory]);

	if (!org) {
		return <div className="p-4">Organization not found</div>;
	}

	const getStatusColor = (status: string) => {
		switch (status) {
			case "done": return "bg-green-100 text-green-800 border-green-200";
			case "in progress": return "bg-blue-100 text-blue-800 border-blue-200";
			case "todo": return "bg-yellow-100 text-yellow-800 border-yellow-200";
			case "backlog": return "bg-gray-100 text-gray-800 border-gray-200";
			case "canceled": return "bg-red-100 text-red-800 border-red-200";
			default: return "bg-gray-100 text-gray-800 border-gray-200";
		}
	};

	const getPriorityColor = (priority: string) => {
		switch (priority) {
			case "high": return "text-red-600";
			case "medium": return "text-yellow-600";
			case "low": return "text-green-600";
			default: return "text-gray-600";
		}
	};

	return (
		<div className="w-full p-4 max-w-7xl mx-auto">
			<div className="flex items-center gap-4 mb-4 relative aspect-[8/1]">
				<div className="flex items-center gap-4 z-50">
					<Avatar className="h-24 w-24">
						<AvatarImage src={org.avatar} alt={org.name} />
						<AvatarFallback>{org.name.charAt(0)}</AvatarFallback>
					</Avatar>
					<div>
						<h1 className="text-4xl font-bold text-foreground">{org.name}</h1>
						<p className="text-foreground">Public issues and updates.</p>
					</div>
				</div>
				<img
					src={org.banner}
					alt={`${org.name} banner`}
					className="h-full w-full object-cover absolute inset-0 rounded-xl"
				/>
			</div>

			{/* Search and Filter Controls */}
			<div className="flex flex-col gap-4 mb-6">
				<Input
					placeholder="Search issues..."
					value={searchTerm}
					onChange={(event) => setSearchTerm(event.target.value)}
					className="max-w-sm"
				/>
				
				{/* Category Filter Buttons */}
				<div className="flex flex-wrap gap-2">
					<Button
						variant={selectedCategory === null ? "default" : "outline"}
						onClick={() => setSelectedCategory(null)}
						size="sm"
					>
						All Issues ({dummyIssues.length})
					</Button>
					{categories.map((category) => {
						const count = dummyIssues.filter(issue => issue.category === category).length;
						return (
							<Button
								key={category}
								variant={selectedCategory === category ? "default" : "outline"}
								onClick={() => setSelectedCategory(category)}
								size="sm"
							>
								{category} ({count})
							</Button>
						);
					})}
				</div>
			</div>

			{/* Issues Grid */}
			<div className="grid gap-4">
				{filteredIssues.length > 0 ? (
					filteredIssues.map((issue) => (
                        <Link to={`/${slug}/${issue.id}`} key={issue.id}>
						<Card className="hover:shadow-md transition-shadow">
							<CardHeader>
								<div className="flex items-start justify-between gap-4">
									<div className="flex-1 min-w-0">
										<div className="flex items-center gap-3 mb-2">
											<Badge variant="outline" className="font-mono">
												#{issue.id}
											</Badge>
											<Badge className={getStatusColor(issue.status)}>
												{issue.status}
											</Badge>
											<Badge variant="secondary">
												{issue.category}
											</Badge>
										</div>
										<CardTitle className="text-lg line-clamp-1">
											
												{issue.title}
											
										</CardTitle>
										<CardDescription className="mt-2">
											{issue.description}
										</CardDescription>
									</div>
									
									{/* Votes and Comments */}
									<div className="flex flex-col items-end gap-2 text-sm text-muted-foreground">
										<div className="flex items-center gap-1">
											<ArrowUpIcon className="h-4 w-4" />
											<span className="font-medium">{issue.votes}</span>
											<span>votes</span>
										</div>
										<div className="flex items-center gap-1">
											<MessageCircleIcon className="h-4 w-4" />
											<span>{issue.comments.filter(c => c.public).length}</span>
											<span>comments</span>
										</div>
									</div>
								</div>
							</CardHeader>
							<CardContent>
								<div className="flex items-center justify-between text-sm text-muted-foreground">
									<div className="flex items-center gap-4">
										<span>Priority: <span className={getPriorityColor(issue.priority)}>{issue.priority}</span></span>
										<span>Updated: {issue.updatedAt.toLocaleDateString()}</span>
									</div>
									<div className="flex gap-1">
										{issue.labels.map((label) => (
											<Badge key={label} variant="outline" className="text-xs">
												{label}
											</Badge>
										))}
									</div>
								</div>
							</CardContent>
						</Card>
                        </Link>
					))
				) : (
					<Card>
						<CardContent className="text-center py-8">
							<p className="text-muted-foreground">
								{selectedCategory 
									? `No ${selectedCategory.toLowerCase()} issues found matching your search.`
									: "No issues found matching your search."
								}
							</p>
						</CardContent>
					</Card>
				)}
			</div>
		</div>
	);
}
