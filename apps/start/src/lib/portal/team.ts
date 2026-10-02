export interface OrganizationMembersLike<TUser extends { id: string } = { id: string }> {
	members: ReadonlyArray<{ user: TUser }>;
}

/**
 * Whether a user is on the organization's team (a seat-assigned member), per the layout loader's
 * `organization.members[].user.id`. Drives the Team pill, ringed avatars, Latest update and release lead lookup.
 */
export function isTeamMember(userId: string | null | undefined, organization: OrganizationMembersLike): boolean {
	if (!userId) return false;
	return organization.members.some((member) => member.user.id === userId);
}

/** The member's user record when they are on the team, else `null` (e.g. to resolve a release lead). */
export function findTeamMemberUser<TUser extends { id: string }>(
	userId: string | null | undefined,
	organization: OrganizationMembersLike<TUser>
): TUser | null {
	if (!userId) return null;
	return organization.members.find((member) => member.user.id === userId)?.user ?? null;
}
