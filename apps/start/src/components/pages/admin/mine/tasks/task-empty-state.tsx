interface TaskEmptyStateProps {
	hasFilters: boolean;
}

export function TaskEmptyState({ hasFilters }: TaskEmptyStateProps) {
	return (
		<div className="flex flex-col items-center justify-center text-muted-foreground">
			<p className="text-sm">No tasks found</p>
			{hasFilters && (
				<p className="text-xs mt-1">Try adjusting your filters</p>
			)}
		</div>
	);
}
