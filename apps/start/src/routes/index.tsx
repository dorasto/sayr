import { createFileRoute } from "@tanstack/react-router";
import { HeroSectionWithBeamsAndGrid } from "@/components/home";

export const Route = createFileRoute("/")({ component: App });

function App() {
	return <HeroSectionWithBeamsAndGrid />;
}
