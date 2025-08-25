'use client';

import { Button } from '@repo/ui/components/button';
import { Check, Copy } from 'lucide-react';
import { useState } from 'react';

export default function ClipboardButton({ cmd }: { cmd: string }) {
	const [copied, setCopied] = useState(false);

	const copyToClipboard = (text: string) => {
		navigator.clipboard
			.writeText(text)
			.then(() => {
				setCopied(true);
				setTimeout(() => setCopied(false), 2000);
			})
			.catch((err) => {
				console.error('Failed to copy: ', err);
			});
	};

	return (
		<Button
			variant="ghost"
			size="sm"
			className="ml-2 h-7 w-7 p-0 rounded-full hover:bg-muted/50 transition-all duration-200 hover:scale-110 cursor-pointer"
			onClick={(e) => {
				e.preventDefault();
				copyToClipboard(cmd);
			}}
			aria-label={`Copy ${cmd} to clipboard`}
		>
			{copied ? (
				<Check className="h-4 w-4 text-green-500" />
			) : (
				<Copy className="h-4 w-4 text-muted-foreground transition-colors" />
			)}
		</Button>
	);
}
