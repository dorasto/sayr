import { useParams } from "react-router";
import { Badge } from "~/components/ui/badge";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "~/components/ui/card";
import { getIssueById, getOrgBySlug } from "~/lib/dummy";
import { ArrowUpIcon, MessageCircleIcon } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";

export default function OrgBugPage() {
	const { id, slug } = useParams();
	const issue = getIssueById(id!);
	const org = getOrgBySlug(slug!);

	if (!issue) {
		return <div className="p-4">Bug not found</div>;
	}

	if (!org) {
		return <div className="p-4">Organization not found</div>;
	}

	const publicComments = issue.comments.filter((comment) => comment.public);

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
			
			<Card>
				<CardHeader>
					<div className="flex items-center gap-3">
						<CardTitle>{issue.title}</CardTitle>
						<div className="ml-auto gap-3 flex items-center">
							<div className="flex items-center gap-1 text-sm text-muted-foreground bg-muted rounded-md px-2 py-1">
								<ArrowUpIcon className="h-4 w-4" />
								<span className="font-medium">{issue.votes}</span>
								<span>votes</span>
							</div>
							<div className="flex items-center gap-1 text-sm text-muted-foreground bg-muted rounded-md px-2 py-1">
								<MessageCircleIcon className="h-4 w-4" />
								<span>{publicComments.length}</span>
								<span>comments</span>
							</div>
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
			
			<div className="grid gap-4 mt-6">
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
