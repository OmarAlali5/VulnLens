import { Card, CardContent } from '@/components/ui/Card'
import { cn } from '@/utils/cn'

function Bone({ className }: { className?: string }) {
  return (
    <div className={cn('relative overflow-hidden rounded-lg bg-slate-800/70', className)}>
      <div className="skeleton-shimmer absolute inset-0" aria-hidden />
    </div>
  )
}

export function ScanResultsSkeleton() {
  return (
    <div className="mx-auto max-w-6xl space-y-6 animate-fade-in">
      <Card glow>
        <CardContent className="space-y-5 pt-6">
          <div className="flex flex-wrap justify-between gap-4">
            <div className="min-w-0 flex-1 space-y-3">
              <Bone className="h-3 w-16" />
              <Bone className="h-7 w-64 max-w-full" />
              <Bone className="h-3 w-40" />
            </div>
            <Bone className="h-8 w-28 rounded-full" />
          </div>
          <div className="grid gap-4 sm:grid-cols-4">
            <Bone className="h-14" />
            <Bone className="h-14" />
            <Bone className="h-14" />
            <Bone className="h-14" />
          </div>
          <Bone className="h-2.5 w-full rounded-full" />
          {/* Timeline skeleton */}
          <div className="flex gap-3">
            <div className="flex flex-col items-center gap-1">
              <Bone className="size-3 rounded-full" />
              <Bone className="h-8 w-px" />
              <Bone className="size-3 rounded-full" />
              <Bone className="h-8 w-px" />
              <Bone className="size-3 rounded-full" />
            </div>
            <div className="flex-1 space-y-5">
              <Bone className="h-4 w-20" />
              <Bone className="h-4 w-24" />
              <Bone className="h-4 w-16" />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,280px)_1fr]">
        <Bone className="h-52 rounded-xl" />
        <Bone className="h-52 rounded-xl" />
      </div>

      <div className="space-y-4">
        <Bone className="h-6 w-40" />
        <Bone className="h-52 rounded-xl" />
        <Bone className="h-52 rounded-xl" />
        <Bone className="h-52 rounded-xl" />
      </div>
    </div>
  )
}
