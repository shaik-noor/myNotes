import { Skeleton } from '../ui/skeleton'

export function WorkspaceSkeleton({ editor = false }: { editor?: boolean }) {
  return (
    <div
      role="status"
      aria-label={editor ? 'Opening page' : 'Loading your notes'}
      aria-busy="true"
      className="min-w-0 flex-1 overflow-hidden p-5 sm:p-8"
    >
      <div className={editor ? 'mx-auto max-w-3xl space-y-6' : 'mx-auto max-w-5xl space-y-6'}>
        <span className="sr-only">{editor ? 'Opening page…' : 'Loading your notes…'}</span>
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-9 w-56 max-w-full" />
        <Skeleton className={editor ? 'h-4 w-36' : 'h-10 w-full'} />
        <div className="space-y-4 pt-4">
          {[1, 2, 3, 4].map((item) => (
            <Skeleton key={item} className={editor ? 'h-4 w-full' : 'h-16 w-full'} />
          ))}
        </div>
      </div>
    </div>
  )
}
