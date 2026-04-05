import { useEffect, useState } from "react";
import parse from "html-react-parser";
import { renderMarkdown, type MarkdownResult } from "@/lib/markdown";
import { cn } from "@repo/ui/lib/utils";

interface MarkdownContentProps {
  content: string;
  className?: string;
}

export function MarkdownContent({ content, className }: MarkdownContentProps) {
  const [result, setResult] = useState<MarkdownResult | null>(null);

  useEffect(() => {
    renderMarkdown(content).then(setResult);
  }, [content]);

  if (!result) {
    return null;
  }

  return (
    <div
      className={cn(
        "markdown-content text-sm! text-foreground [&_h2]:text-foreground [&_h2]:text-base! [&_h2]:font-semibold [&_h2]:mt-4 [&_h2]:mb-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1.5 [&_li]:leading-relaxed! [&_strong]:text-foreground [&_strong]:font-medium [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-xs [&_code]:font-mono [&_p]:leading-relaxed! [&_a]:text-primary [&_a]:hover:underline [&_hr]:border-border [&_hr]:my-3",
        className,
      )}
    >
      {parse(result.markup)}
    </div>
  );
}
