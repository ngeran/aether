/**
 * Skeleton Card Component
 * Provides a loading skeleton for cards with shimmer effect
 */

export function SkeletonCard({ className = "" }) {
    return (
        <div className={`bg-card border rounded-xl p-6 animate-pulse ${className}`}>
            <div className="flex items-center space-x-3 mb-4">
                <div className="h-10 w-10 bg-muted rounded-lg" />
                <div className="space-y-2 flex-1">
                    <div className="h-4 bg-muted rounded w-3/4" />
                    <div className="h-3 bg-muted rounded w-1/2" />
                </div>
            </div>
            <div className="space-y-3">
                <div className="h-8 bg-muted rounded w-1/2" />
                <div className="h-3 bg-muted rounded w-full" />
                <div className="h-3 bg-muted rounded w-5/6" />
            </div>
        </div>
    );
}

export function StatCardSkeleton() {
    return (
        <div className="bg-card border rounded-xl p-6 animate-pulse">
            <div className="flex items-center justify-between mb-4">
                <div className="h-10 w-10 bg-muted rounded-lg" />
                <div className="h-4 w-16 bg-muted rounded" />
            </div>
            <div className="space-y-2">
                <div className="h-3 bg-muted rounded w-1/3" />
                <div className="h-8 bg-muted rounded w-2/3" />
            </div>
        </div>
    );
}

export function TableSkeleton({ rows = 5 }) {
    return (
        <div className="space-y-3">
            {/* Header */}
            <div className="flex space-x-4 p-4 bg-card border rounded-lg animate-pulse">
                <div className="h-4 bg-muted rounded w-1/4" />
                <div className="h-4 bg-muted rounded w-1/4" />
                <div className="h-4 bg-muted rounded w-1/4" />
                <div className="h-4 bg-muted rounded w-1/6" />
            </div>
            {/* Rows */}
            {Array.from({ length: rows }).map((_, i) => (
                <div key={i} className="flex space-x-4 p-4 bg-card border rounded-lg animate-pulse">
                    <div className="h-4 bg-muted rounded w-1/4" />
                    <div className="h-4 bg-muted rounded w-1/4" />
                    <div className="h-4 bg-muted rounded w-1/4" />
                    <div className="h-4 bg-muted rounded w-1/6" />
                </div>
            ))}
        </div>
    );
}

export function ActivityFeedSkeleton({ items = 4 }) {
    return (
        <div className="space-y-3 p-4 bg-card border rounded-xl">
            {Array.from({ length: items }).map((_, i) => (
                <div key={i} className="flex items-start space-x-3 animate-pulse">
                    <div className="h-8 w-8 bg-muted rounded-full flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                        <div className="h-4 bg-muted rounded w-3/4" />
                        <div className="h-3 bg-muted rounded w-1/2" />
                    </div>
                    <div className="h-6 w-16 bg-muted rounded flex-shrink-0" />
                </div>
            ))}
        </div>
    );
}

export function ServiceHealthSkeleton() {
    return (
        <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-card border rounded-lg animate-pulse">
                    <div className="flex items-center space-x-3">
                        <div className="h-8 w-8 bg-muted rounded-full" />
                        <div className="space-y-1">
                            <div className="h-4 bg-muted rounded w-24" />
                            <div className="h-3 bg-muted rounded w-16" />
                        </div>
                    </div>
                    <div className="h-6 w-20 bg-muted rounded" />
                </div>
            ))}
        </div>
    );
}
