import { Link } from "react-router";
import type { Route } from "./+types/bugs";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { dummyIssues } from "~/lib/dummy-issue";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Bugs" },
    { name: "description", content: "List of all bugs" },
  ];
}

export default function Bugs() {
  return (
    <div className="p-4 grid gap-4">
      {dummyIssues.map((issue) => (
        <Card key={issue.id}>
          <CardHeader>
            <div className="flex items-center gap-3">
              <CardTitle>
                <Link to={`/bugs/${issue.id}`} className="hover:underline">
                  {issue.title}
                </Link>
              </CardTitle>
              <div className="ml-auto gap-3 flex items-center">
                <Badge>{issue.status}</Badge>
                <Badge variant="outline">
                  Updated: {issue.updatedAt.toLocaleDateString()}
                </Badge>
              </div>
            </div>
            <CardDescription>{issue.description}</CardDescription>
          </CardHeader>
        </Card>
      ))}
    </div>
  );
}

