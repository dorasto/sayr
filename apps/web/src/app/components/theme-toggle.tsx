'use client';

import { Button } from '@repo/ui/components/button';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import * as React from 'react';

export function ThemeToggle() {
	const { theme, setTheme } = useTheme();
	const [mounted, setMounted] = React.useState(false);

	React.useEffect(() => {
		setMounted(true);
	}, []);

	if (!mounted) {
		return (
			<Button variant="ghost" size="sm" className="w-9 h-9 cursor-pointer">
				<span className="sr-only">Toggle theme</span>
			</Button>
		);
	}

	return (
		<Button
			variant="ghost"
			size="sm"
			onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
			className="w-9 h-9 cursor-pointer"
		>
			{theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
			<span className="sr-only">Toggle theme</span>
		</Button>
	);
}
