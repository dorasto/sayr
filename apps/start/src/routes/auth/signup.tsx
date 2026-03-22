import { LoginComponent } from '@/components/auth/login'
import { createFileRoute } from '@tanstack/react-router'
import { seo, getOgImageUrl } from '@/seo'

export const Route = createFileRoute('/auth/signup')({
  head: () => ({
    meta: seo({
      title: "Sign up",
      image: getOgImageUrl({ type: "simple", title: "Sign up" }),
    }),
  }),
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <div>
      <LoginComponent />
    </div>
  )
}
