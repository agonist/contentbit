import { createFileRoute } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'

export const Route = createFileRoute('/')({ component: App })

function App() {
  return (
    <div className="flex min-h-svh p-6">
      <div className="flex max-w-md min-w-0 flex-col gap-4 text-sm leading-loose">
        <div>
          <h1 className="font-medium">Project ready!</h1>
          <p>You may now add components and start building.</p>
          <p>Open the blog demo to see internal linking in action.</p>
          <Button asChild className="mt-2">
            <a href="/blog">View blog demo</a>
          </Button>
        </div>
      </div>
    </div>
  )
}
