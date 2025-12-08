"use client";
import type { schema } from "@repo/database";
import {
	Avatar,
	AvatarFallback,
	AvatarImage,
} from "@repo/ui/components/avatar";
import { Button } from "@repo/ui/components/button";
import { ButtonGroup } from "@repo/ui/components/button-group";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@repo/ui/components/dropdown-menu";
import { IconCheck, IconX } from "@tabler/icons-react";
import { priorityConfig, statusConfig } from "../config";
import { getFieldConfig, isMultiCondition } from "./multi-select";
import { getOperatorLabel } from "./operators";
import type { FilterCondition, FilterField, FilterOperator } from "./types";

interface FilterBadgesProps {
	conditions: FilterCondition[];
	labels: schema.labelType[];
	availableUsers: schema.userType[];
	categories: schema.categoryType[];
	removeFilter: (id: string) => void;
	updateFilterOperator: (id: string, op: FilterOperator) => void;
	toggleValue: (id: string, value: string) => void;
	getAvailableOptions: (field: FilterField) => {
		value: string;
		label: string;
		icon?: React.ReactNode;
		color?: string;
		image?: string;
	}[];
	getAvailableOperators: (field: FilterField) => FilterOperator[];
	renderFilterValue: (condition: FilterCondition) => React.ReactNode;
}

export function FilterBadges(props: FilterBadgesProps) {
	const {
		conditions,
		labels,
		availableUsers,
		categories,
		removeFilter,
		updateFilterOperator,
		toggleValue,
		getAvailableOptions,
		getAvailableOperators,
		renderFilterValue,
	} = props;

	return (
		<div className="flex items-center gap-2 flex-wrap">
			{conditions.map((condition) => {
				const cfg = getFieldConfig(condition.field);
				const multi = isMultiCondition(condition);
				let displayNode: React.ReactNode = null;
				let multiDisplay: string | null = null;
				if (multi) {
					const values = Array.isArray(condition.value)
						? condition.value
						: condition.value
							? [condition.value as string]
							: [];
					if (values.length <= 2) {
						multiDisplay = values
							.map((v) => {
								if (condition.field === "label") {
									const l = labels.find((x) => x.id === v);
									return l?.name || v;
								}
								if (condition.field === "status")
									return (
										statusConfig[v as keyof typeof statusConfig]?.label || v
									);
								if (condition.field === "priority")
									return (
										priorityConfig[v as keyof typeof priorityConfig]?.label || v
									);
								if (condition.field === "assignee") {
									const u = availableUsers.find((u) => u.id === v);
									return u?.name || u?.email || v;
								}
								if (condition.field === "category") {
									const u = categories.find((category) => category.id === v);
									return u?.name || v;
								}
								return v;
							})
							.join(", ");
					} else {
						multiDisplay = `${values.length} selected`;
					}
					if (condition.field === "label") {
						const labelObjs = values
							.map((id) => labels.find((l) => l.id === id))
							.filter((l): l is (typeof labels)[number] => !!l);
						if (labelObjs.length <= 2) {
							displayNode = (
								<span
									className="flex items-center gap-1 truncate"
									title={labelObjs.map((l) => l.name).join(", ")}
								>
									{labelObjs.map((l) => (
										<span key={l.id} className="flex items-center gap-1">
											<span
												className="w-2 h-2 rounded-full"
												style={{ backgroundColor: l.color || "#ccc" }}
											/>
											<span className="truncate max-w-[60px]">{l.name}</span>
										</span>
									))}
								</span>
							);
						} else if (labelObjs.length > 2) {
							const maxDots = 5;
							const shown = labelObjs.slice(0, maxDots);
							displayNode = (
								<span
									className="flex items-center truncate -space-x-0.5"
									title={labelObjs.map((l) => l.name).join(", ")}
								>
									{shown.map((l) => (
										<span
											key={l.id}
											className="w-2 h-2 rounded-full"
											style={{ backgroundColor: l.color || "#ccc" }}
										/>
									))}
									{/* {labelObjs.length > maxDots && ( */}
									<span className="truncate max-w-56 pl-2">
										{labelObjs.length} labels
									</span>
									{/* )} */}
								</span>
							);
						}
					}
					if (condition.field === "assignee") {
						const userObjs = values
							.map((id) => availableUsers.find((u) => u.id === id))
							.filter((u): u is (typeof availableUsers)[number] => !!u);
						if (userObjs.length <= 2) {
							displayNode = (
								<span
									className="flex items-center gap-1 truncate"
									title={userObjs
										.map((u) => u.name || u.email || "")
										.join(", ")}
								>
									{userObjs.map((u) => (
										<span key={u.id} className="flex items-center gap-1">
											<Avatar className="h-4 w-4">
												<AvatarImage src={u.image || undefined} />
												<AvatarFallback className="text-[10px]">
													{(u.name || u.email || "?")
														.split(" ")
														.map((n) => n[0])
														.join("")
														.toUpperCase()}
												</AvatarFallback>
											</Avatar>
											<span className="truncate max-w-[80px]">
												{u.name || u.email || u.id}
											</span>
										</span>
									))}
								</span>
							);
						} else if (userObjs.length > 2) {
							const maxAvatars = 5;
							const shown = userObjs.slice(0, maxAvatars);
							displayNode = (
								<span
									className="flex items-center truncate -space-x-1"
									title={userObjs
										.map((u) => u.name || u.email || "")
										.join(", ")}
								>
									{shown.map((u) => (
										<Avatar key={u.id} className="h-4 w-4">
											<AvatarImage src={u.image || undefined} />
											<AvatarFallback className="text-[10px]">
												{(u.name || u.email || "?")
													.split(" ")
													.map((n) => n[0])
													.join("")
													.toUpperCase()}
											</AvatarFallback>
										</Avatar>
									))}
									<span className="truncate max-w-56 pl-2">
										{userObjs.length} assignees
									</span>
								</span>
							);
						}
					}
				}

				const commonButtonClasses =
					"my-auto border-transparent p-1 hover:text-destructive-foreground transition-all h-6 [&_svg]:h-3 [&_svg]:w-3";

				return (
					<ButtonGroup key={condition.id} className="h-6 text-xs">
						{/* Field label (non-interactive) */}
						<Button
							variant="accent"
							size="sm"
							className={`${commonButtonClasses} pointer-events-none font-medium`}
						>
							{cfg?.icon}
							{cfg?.label}
						</Button>

						{/* Operator selector */}
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button
									variant="accent"
									size="sm"
									className={`${commonButtonClasses} text-muted-foreground hover:text-foreground`}
								>
									{getOperatorLabel(condition.operator)}
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent className="w-40">
								{getAvailableOperators(condition.field).map((operator) => (
									<DropdownMenuItem
										key={operator}
										className={`text-xs ${operator === condition.operator ? "bg-accent" : ""}`}
										onClick={() => updateFilterOperator(condition.id, operator)}
									>
										{getOperatorLabel(operator)}
									</DropdownMenuItem>
								))}
							</DropdownMenuContent>
						</DropdownMenu>

						{/* Multi value manager */}
						{multi && (
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<Button
										variant="accent"
										size="sm"
										className={`${commonButtonClasses} max-w-56 truncate text-muted-foreground hover:text-foreground`}
									>
										{displayNode || multiDisplay}
									</Button>
								</DropdownMenuTrigger>
								<DropdownMenuContent className="w-56 max-h-80 overflow-y-auto">
									{getAvailableOptions(condition.field).map((item) => {
										const selected = Array.isArray(condition.value)
											? condition.value.includes(item.value)
											: condition.value === item.value;
										return (
											<DropdownMenuItem
												key={item.value}
												className="flex items-center gap-2 text-xs cursor-pointer"
												onClick={(e) => {
													e.preventDefault();
													toggleValue(condition.id, item.value);
												}}
											>
												{item.image && (
													<Avatar className="h-5 w-5">
														<AvatarImage src={item.image || undefined} />
														<AvatarFallback className="text-xs">
															{(item.label || "U")
																.split(" ")
																.map((n) => n[0])
																.join("")
																.toUpperCase()}
														</AvatarFallback>
													</Avatar>
												)}
												{item.icon && (
													<div className="w-3 h-3">{item.icon}</div>
												)}
												{item.color && !item.icon && (
													<div
														className="w-3 h-3 rounded-full shrink-0"
														style={{ backgroundColor: item.color || "#gray" }}
													/>
												)}
												<span className="flex-1 truncate">{item.label}</span>
												{selected && <IconCheck className="w-3 h-3" />}
											</DropdownMenuItem>
										);
									})}
								</DropdownMenuContent>
							</DropdownMenu>
						)}

						{/* Single value (non-interactive) */}
						{!multi &&
							condition.value &&
							condition.operator !== "empty" &&
							condition.operator !== "not_empty" &&
							(() => {
								if (
									condition.field === "assignee" &&
									typeof condition.value === "string"
								) {
									const user = availableUsers.find(
										(u) => u.id === condition.value,
									);
									return (
										<Button
											variant="accent"
											size="sm"
											className={`${commonButtonClasses} pointer-events-none max-w-56 truncate text-muted-foreground`}
										>
											<Avatar className="h-4 w-4 mr-1">
												<AvatarImage src={user?.image || undefined} />
												<AvatarFallback className="text-[10px]">
													{(user?.name || user?.email || "?")
														.split(" ")
														.map((n) => n[0])
														.join("")
														.toUpperCase()}
												</AvatarFallback>
											</Avatar>
											<span className="truncate">
												{user?.name || condition.value}
											</span>
										</Button>
									);
								}
								// Fallback default rendering
								return (
									<Button
										variant="accent"
										size="sm"
										className={`${commonButtonClasses} pointer-events-none max-w-56 truncate text-muted-foreground`}
									>
										{renderFilterValue(condition)}
									</Button>
								);
							})()}

						{/* Remove filter */}
						<Button
							variant="accent"
							size="sm"
							onClick={() => removeFilter(condition.id)}
							className={`${commonButtonClasses} hover:text-destructive-foreground`}
						>
							<IconX className="!w-3 !h-3" />
						</Button>
					</ButtonGroup>
				);
			})}
		</div>
	);
}
