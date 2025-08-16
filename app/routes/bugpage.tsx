import type { Route } from "./+types/home";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "~/components/ui/card"
import {Badge} from "~/components/ui/badge";
export function meta({}: Route.MetaArgs) {
  return [
    { title: "New React Router App" },
    { name: "description", content: "Welcome to React Router!" },
  ];
}

export default function Bugs() {
  return <div className="p-4">
    <Card>
        <CardHeader>
            <div className="flex items-center gap-3">
            <CardTitle>Bug title</CardTitle>
            <div className="ml-auto gap-3 flex items-center">
                <Badge>New</Badge>
                <Badge variant="outline">Updated: 2 days ago</Badge>
            </div>
            </div>
            <CardDescription>This is the bug description</CardDescription>
        </CardHeader>
        <CardContent>
            <p>Additional information about the bug can go here.</p>
        </CardContent>
    </Card>
  </div>;
}
