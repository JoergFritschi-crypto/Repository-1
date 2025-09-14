import { cn } from "@/lib/utils";

interface SkeletonTableProps {
  rows?: number;
  columns?: number;
  showHeader?: boolean;
  className?: string;
}

export function SkeletonTable({ 
  rows = 5, 
  columns = 4,
  showHeader = true,
  className 
}: SkeletonTableProps) {
  return (
    <div className={cn("w-full overflow-hidden rounded-lg border", className)}>
      {showHeader && (
        <div className="border-b bg-muted/50 px-4 py-3">
          <div className="flex gap-4">
            {Array.from({ length: columns }).map((_, i) => (
              <div 
                key={i}
                className="h-4 bg-muted rounded animate-pulse"
                style={{ width: `${100 / columns}%` }}
              />
            ))}
          </div>
        </div>
      )}
      <div className="divide-y">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className="px-4 py-3">
            <div className="flex gap-4">
              {Array.from({ length: columns }).map((_, colIndex) => (
                <div 
                  key={colIndex}
                  className="h-4 bg-muted rounded animate-pulse"
                  style={{ 
                    width: colIndex === 0 ? "30%" : `${70 / (columns - 1)}%`,
                    animationDelay: `${(rowIndex + colIndex) * 100}ms`
                  }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface SkeletonListItemProps {
  showIcon?: boolean;
  showActions?: boolean;
  className?: string;
}

export function SkeletonListItem({ 
  showIcon = false, 
  showActions = false,
  className 
}: SkeletonListItemProps) {
  return (
    <div className={cn(
      "flex items-center gap-4 p-4 rounded-lg border",
      className
    )}>
      {showIcon && (
        <div className="h-10 w-10 bg-muted rounded-lg animate-pulse" />
      )}
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-muted rounded w-1/3 animate-pulse" />
        <div className="h-3 bg-muted rounded w-1/2 animate-pulse" />
      </div>
      {showActions && (
        <div className="flex gap-2">
          <div className="h-8 w-8 bg-muted rounded animate-pulse" />
          <div className="h-8 w-8 bg-muted rounded animate-pulse" />
        </div>
      )}
    </div>
  );
}

export function SkeletonList({ 
  count = 5, 
  showIcon = false,
  showActions = false,
  className 
}: { 
  count?: number;
  showIcon?: boolean;
  showActions?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonListItem 
          key={i} 
          showIcon={showIcon}
          showActions={showActions}
        />
      ))}
    </div>
  );
}