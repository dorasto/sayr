# Teams & Permissions System

## Schema Changes

`packages/database/schema/member.schema.ts` - New nested permission structure:

```typescript
interface TeamPermissions {
  admin: { administrator, manageMembers, manageTeams }
  content: { manageCategories, manageLabels, manageViews }
  tasks: { create, editAny, deleteAny, assign, changeStatus, changePriority }
  moderation: { manageComments, approveSubmissions, manageVotes }
}
```

## Permission Logic

`packages/database/src/index.ts`:
- `hasOrgPermission(userId, orgId, "admin.manageTeams")` - dot-notation paths
- `getOrgPermissions(userId, orgId)` - returns merged permissions across all teams
- `isPlatformAdmin(userId)` - checks `user.role === 'admin'`

**Inheritance**: Discord-style "most permissive wins" - if ANY team grants a permission, user has it.

**God mode**: Platform admins (`user.role = 'admin'`) bypass all org-level permission checks.

## New Functions

`packages/database/src/functions/organization.ts`:
- `bootstrapOrganizationAdminTeam(orgId)` - creates default "Administrators" team with full perms
- `addMemberToAdminTeam(orgId, memberId)` - adds member to admin team

Called automatically on org creation.

## UI

- `/admin/settings/org/$orgId/teams` - team list
- `/admin/settings/org/$orgId/teams/new` - create team
- `/admin/settings/org/$orgId/teams/$teamId` - edit team (General, Permissions, Members tabs)

## Backend

All permission checks in `apps/backend/routes/api/organization.ts` and `task.ts` use `traceOrgPermissionCheck()` with the new dot-notation format.
