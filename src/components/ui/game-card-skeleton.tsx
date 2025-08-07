import { Skeleton } from "./skeleton"
import { Card, CardContent } from "./card"

interface GameCardSkeletonProps {
  variant?: 'default' | 'featured' | 'compact'
}

export function GameCardSkeleton({ variant = 'default' }: GameCardSkeletonProps) {
  if (variant === 'featured') {
    return (
      <Card className="group overflow-hidden border-2 border-primary/20 bg-gradient-to-br from-background to-primary/5 transition-all duration-300 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/20">
        <CardContent className="p-0">
          {/* Featured game image skeleton */}
          <div className="relative overflow-hidden">
            <Skeleton className="aspect-[16/10] w-full bg-primary/10" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            <div className="absolute bottom-4 left-4 right-4">
              <Skeleton className="h-8 w-3/4 bg-white/20 mb-2" />
              <Skeleton className="h-4 w-full bg-white/10" />
            </div>
          </div>
          {/* Featured game stats */}
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <Skeleton className="h-5 w-24 bg-primary/10" />
              <Skeleton className="h-5 w-20 bg-primary/10" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-6 w-16 bg-primary/10 rounded-full" />
              <Skeleton className="h-6 w-20 bg-primary/10 rounded-full" />
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (variant === 'compact') {
    return (
      <Card className="group overflow-hidden border-primary/20 bg-gradient-to-br from-background to-primary/5 transition-all duration-300 hover:border-primary/40 hover:shadow-md hover:shadow-primary/10">
        <CardContent className="p-0">
          <div className="flex items-center p-3 space-x-3">
            {/* Compact image skeleton */}
            <Skeleton className="w-12 h-12 rounded-lg bg-primary/10 flex-shrink-0" />
            {/* Compact content skeleton */}
            <div className="flex-1 min-w-0">
              <Skeleton className="h-4 w-full bg-primary/10 mb-2" />
              <Skeleton className="h-3 w-2/3 bg-primary/10" />
            </div>
            {/* Compact rating skeleton */}
            <Skeleton className="h-4 w-8 bg-primary/10 flex-shrink-0" />
          </div>
        </CardContent>
      </Card>
    )
  }

  // Default variant
  return (
    <Card className="group overflow-hidden border-primary/20 bg-gradient-to-br from-background to-primary/5 transition-all duration-300 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/20">
      <CardContent className="p-0">
        {/* Game image skeleton */}
        <div className="relative overflow-hidden">
          <Skeleton className="aspect-[4/3] w-full bg-primary/10" />
          {/* Play button overlay skeleton */}
          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
            <Skeleton className="w-16 h-16 rounded-full bg-white/20" />
          </div>
        </div>
        
        {/* Game info skeleton */}
        <div className="p-4">
          <div className="space-y-3">
            {/* Title skeleton */}
            <Skeleton className="h-5 w-4/5 bg-primary/10" />
            
            {/* Rating and stats skeleton */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1">
                {/* Stars skeleton */}
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="w-4 h-4 bg-primary/10" />
                ))}
              </div>
              <Skeleton className="h-4 w-12 bg-primary/10" />
            </div>
            
            {/* Tags skeleton */}
            <div className="flex gap-2">
              <Skeleton className="h-5 w-16 bg-primary/10 rounded-full" />
              <Skeleton className="h-5 w-20 bg-primary/10 rounded-full" />
            </div>
            
            {/* Description skeleton */}
            <div className="space-y-2">
              <Skeleton className="h-3 w-full bg-primary/10" />
              <Skeleton className="h-3 w-3/4 bg-primary/10" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}