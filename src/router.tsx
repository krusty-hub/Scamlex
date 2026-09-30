import { createRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'
import { QueryClient } from '@tanstack/react-query'

export const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
  context: {
    queryClient: new QueryClient
  }
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
