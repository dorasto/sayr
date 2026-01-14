import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/orgs/$orgSlug/$shortId/')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/orgs/$orgSlug/$shortId/"!</div>
}
