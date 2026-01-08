import { ArrowUpRight, CirclePlay } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function Hero() {
	return (
		<div className="md:min-h-[70dvh] flex items-center justify-center">
			<div className="max-w-(--breakpoint-xl) w-full mx-auto grid lg:grid-cols-2 gap-12 px-6 py-12">
				<div>
					<Badge variant="secondary" className="rounded-full py-1 border-border" asChild>
						<a href="#">
							Just released v1.0.0 <ArrowUpRight className="ml-1 size-4" />
						</a>
					</Badge>
					<h1 className="mt-6 max-w-[17ch] text-4xl md:text-5xl lg:text-[2.75rem] xl:text-[3.25rem] font-semibold leading-[1.2]! tracking-[-0.035em]">
						Project management isn't just for internal use
					</h1>
					<p className="mt-6 max-w-[60ch] sm:text-lg text-foreground/80">
						Bridge gaps between your developers and users and improve collaboration between teams. Fully open
						source. Truly collaborative.
					</p>
					<div className="mt-12 flex items-center gap-4">
						<Button size="lg" className="rounded-full text-base">
							Get Started <ArrowUpRight className="h-5! w-5!" />
						</Button>
						<Button variant="outline" size="lg" className="rounded-full text-base shadow-none">
							<CirclePlay className="h-5! w-5!" /> Watch Demo
						</Button>
					</div>
				</div>
				<div className="w-full aspect-video bg-accent rounded-xl" />
			</div>
		</div>
	);
}
