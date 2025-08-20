import { useParams } from "react-router";
import { Badge } from "~/components/ui/badge";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "~/components/ui/card";
import { getIssueById } from "~/lib/dummy";
import { cn } from "~/lib/utils";
import type { Route } from "./+types/bugpage";

export function meta({ params }: Route.MetaArgs) {
	const issue = getIssueById(params.id);
	return [
		{ title: issue ? issue.title : "Bug not found" },
		{
			name: "description",
			content: issue ? issue.description : "Bug not found",
		},
	];
}

export default function BugPage() {
	const { id } = useParams();

	// Early return if id is missing to avoid using a non-null assertion.
	if (!id) {
		return <div className="p-4">Bug not found</div>;
	}

	const issue = getIssueById(id);

	if (!issue) {
		return <div className="p-4">Bug not found</div>;
	}

	return (
		<div className="p-4 grid gap-4">
			<Card>
				<CardHeader>
					<div className="flex items-center gap-3">
						<CardTitle>{issue.title}</CardTitle>
						<div className="ml-auto gap-3 flex items-center">
							<Badge>{issue.status}</Badge>
							<Badge variant="outline">
								Updated: {issue.updatedAt.toLocaleDateString()}
							</Badge>
						</div>
					</div>
					<CardDescription>{issue.description}</CardDescription>
				</CardHeader>
				<CardContent>
					<p>Assignee: {issue.assignee}</p>
					<p>Priority: {issue.priority}</p>
					<div className="flex gap-2 mt-2">
						{issue.labels.map((label) => (
							<Badge key={label} variant="secondary">
								{label}
							</Badge>
						))}
					</div>
				</CardContent>
			</Card>
			<div className="grid gap-4">
				<h2 className="text-2xl font-bold">Comments</h2>
				{issue.comments.map((comment) => (
					<div className="relative" key={comment.id}>
						{/* <div className="absolute top-0 right-0">
                    {comment.public === false && <Badge variant="outline" className="ml-2">Private</Badge>}
                </div> */}
						<Card
							className={cn(
								!comment.public && "bg-secondary text-secondary-foreground",
							)}
						>
							<CardHeader>
								<div className="flex items-center gap-4">
									<p className="font-semibold">
										{comment.author}
										{comment.usertype === "internal" && (
											<Badge variant="outline" className="ml-2">
												Admin
											</Badge>
										)}
										{comment.public === false && (
											<Badge variant="outline" className="ml-2">
												Private
											</Badge>
										)}
									</p>
									<p className="text-sm text-muted-foreground ml-auto">
										{comment.createdAt.toLocaleDateString()}
									</p>
								</div>
							</CardHeader>
							<CardContent>
								<p>{comment.content}</p>
							</CardContent>
						</Card>
					</div>
				))}
			</div>
		</div>
	);
}
