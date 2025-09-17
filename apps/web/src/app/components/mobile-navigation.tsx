'use client';

import { Button } from '@repo/ui/components/button';
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@repo/ui/components/sheet';
import { GitBranch, Globe, Menu, Rocket, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

export default function MobileNavigation() {
	const [open, setOpen] = useState(false);

	const handleLinkClick = () => {
		setOpen(false);
	};

	return (
		<Sheet open={open} onOpenChange={setOpen}>
			<SheetTrigger asChild>
				<Button variant="ghost" size="sm" className="md:hidden">
					<Menu className="h-5 w-5" />
					<span className="sr-only">Toggle menu</span>
				</Button>
			</SheetTrigger>
			<SheetContent side="left" className="w-[300px] sm:w-[400px]">
				<div className="flex flex-col space-y-4 mt-8">
					<div className="flex items-center justify-between mb-6">
						<SheetTitle className="text-lg font-semibold">Navigation</SheetTitle>
					</div>

					<nav className="flex flex-col space-y-4">
						<Link
							href="#features"
							scroll={true}
							className="flex items-center space-x-3 text-lg text-muted-foreground hover:text-foreground transition-colors py-2"
							onClick={handleLinkClick}
						>
							<Sparkles className="w-5 h-5" />
							<span>Features</span>
						</Link>

						<Link
							href="#quick-start"
							scroll={true}
							className="flex items-center space-x-3 text-lg text-muted-foreground hover:text-foreground transition-colors py-2"
							onClick={handleLinkClick}
						>
							<Rocket className="w-5 h-5" />
							<span>Quick Start</span>
						</Link>

						<div className="border-t border-border pt-4 mt-6">
							<Link
								href="https://github.com/ProductOfAmerica/turbo-starter"
								target="_blank"
								className="flex items-center space-x-3 text-lg text-muted-foreground hover:text-foreground transition-colors py-2"
								onClick={handleLinkClick}
							>
								<GitBranch className="w-5 h-5" />
								<span>GitHub</span>
							</Link>

							<Link
								href="https://turbo.build/repo/docs"
								target="_blank"
								className="flex items-center space-x-3 text-lg text-muted-foreground hover:text-foreground transition-colors py-2"
								onClick={handleLinkClick}
							>
								<Globe className="w-5 h-5" />
								<span>Documentation</span>
							</Link>
						</div>
					</nav>
				</div>
			</SheetContent>
		</Sheet>
	);
}
