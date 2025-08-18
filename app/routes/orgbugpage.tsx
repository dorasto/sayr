import { useParams } from "react-router";
import { Badge } from "~/components/ui/badge";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "~/components/ui/card";
import { getIssueById } from "~/lib/dummy-issue";

export default function OrgBugPage() {
	const { id } = useParams();
	const issue = getIssueById(id!);

	if (!issue) {
		return <div className="p-4">Bug not found</div>;
	}

	const publicComments = issue.comments.filter((comment) => comment.public);

	return (
		<div className="w-full p-4 max-w-7xl mx-auto">
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
				{publicComments.map((comment) => (
					<Card key={comment.id}>
						<CardHeader>
							<div className="flex items-center gap-4">
								<p className="font-semibold">{comment.author}</p>
								<p className="text-sm text-muted-foreground ml-auto">
									{comment.createdAt.toLocaleDateString()}
								</p>
							</div>
						</CardHeader>
						<CardContent>
							<p>{comment.content}</p>
						</CardContent>
					</Card>
				))}
				{publicComments.length === 0 && <p>No public comments.</p>}
			</div>
		</div>
	);
}
