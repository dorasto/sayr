import { LoginComponent } from "@/app/components/auth/login";
import { HeroSectionWithBeamsAndGrid } from "../../components/home/hero";

export default async function LoginPage() {
	return (
		<div className="h-full min-h-full flex items-center justify-center">
			<LoginComponent />
		</div>
	);
}
