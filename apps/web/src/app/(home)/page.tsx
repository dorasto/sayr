import { HeroSectionWithBeamsAndGrid } from "../components/home/hero";

export default async function Home() {
	console.log("Rendering Home Page");
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
