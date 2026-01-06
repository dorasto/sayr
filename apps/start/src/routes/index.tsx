import { Button } from "@repo/ui/components/button";
import { createFileRoute } from "@tanstack/react-router";
import LoginDialog from "@/components/auth/login";

export const Route = createFileRoute("/")({ component: App });

function App() {
	return <LoginDialog trigger={<Button size={"lg"}>Get started</Button>} />
}
