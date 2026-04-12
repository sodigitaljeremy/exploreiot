import Card from "@/components/atoms/Card"

export function Skeleton({ className }: { className?: string }) {
  return <div className={`bg-gray-800 rounded animate-pulse ${className ?? ""}`} />
}

export function DashboardSkeleton() {
  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <Skeleton className="h-8 w-64 mb-2" />
        <Skeleton className="h-4 w-96" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <Skeleton className="h-3 w-16 mb-3" />
            <Skeleton className="h-7 w-12" />
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <Card>
          <Skeleton className="h-4 w-20 mb-4" />
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-lg" />
            ))}
          </div>
        </Card>
        <Card className="lg:col-span-2">
          <Skeleton className="h-4 w-32 mb-4" />
          <Skeleton className="h-[220px] w-full rounded-lg" />
        </Card>
      </div>

      <Card>
        <Skeleton className="h-4 w-24 mb-3" />
        <Skeleton className="h-12 w-full rounded-lg" />
      </Card>
    </div>
  )
}
