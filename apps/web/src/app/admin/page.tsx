import { getAccess } from "@/app/lib/serverFunctions";
import { HeroSectionWithBeamsAndGrid } from "../components/home/hero";

export default async function Home() {
	const account = await getAccess();
	console.log("🚀 ~ Home ~ account:", account);
	return (
		<div className="">
			<HeroSectionWithBeamsAndGrid />
			<HeroSectionWithBeamsAndGrid />
			<HeroSectionWithBeamsAndGrid />
			<HeroSectionWithBeamsAndGrid />
			<HeroSectionWithBeamsAndGrid />
			<HeroSectionWithBeamsAndGrid />
		</div>
	);
}
