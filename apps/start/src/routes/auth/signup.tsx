import { LoginComponent } from '@/components/auth/login'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/auth/signup')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <div>
      <LoginComponent />
    </div>
  )
}
