import { cn } from "@/lib/utils";

interface SkeletonCardProps {
  className?: string;
  variant?: "default" | "plant" | "garden";
  showImage?: boolean;
  imageHeight?: string;
}

export function SkeletonCard({ 
  className, 
  variant = "default",
  showImage = true,
  imageHeight = "h-48"
}: SkeletonCardProps) {
  return (
    <div className={cn(
      "rounded-lg border bg-card overflow-hidden animate-pulse",
      className
    )}>
      {showImage && (
        <div className={cn(
          "bg-muted",
          imageHeight
        )} />
      )}
      <div className="p-4 space-y-3">
        {/* Title */}
        <div className="h-5 bg-muted rounded w-3/4" />
        
        {/* Subtitle or badges */}
        {variant === "plant" && (
          <div className="flex gap-2">
            <div className="h-5 bg-muted rounded-full w-16" />
            <div className="h-5 bg-muted rounded-full w-20" />
          </div>
        )}
        
        {/* Description lines */}
        <div className="space-y-2">
          <div className="h-3 bg-muted rounded" />
          <div className="h-3 bg-muted rounded w-5/6" />
          {variant !== "plant" && (
            <div className="h-3 bg-muted rounded w-4/6" />
          )}
        </div>
        
        {/* Action buttons */}
        {variant === "plant" && (
          <div className="flex gap-2 pt-2">
            <div className="h-8 bg-muted rounded w-20" />
            <div className="h-8 bg-muted rounded w-20" />
          </div>
        )}
        
        {variant === "garden" && (
          <div className="flex justify-between items-center pt-2">
            <div className="h-5 bg-muted rounded w-24" />
            <div className="h-8 bg-muted rounded w-16" />
          </div>
        )}
      </div>
    </div>
  );
}

export function SkeletonCardGrid({ 
  count = 6, 
  variant = "default",
  className 
}: { 
  count?: number; 
  variant?: "default" | "plant" | "garden";
  className?: string;
}) {
  return (
    <div className={cn(
      "grid gap-4",
      variant === "plant" ? "grid-cols-2 md:grid-cols-3 lg:grid-cols-4" : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
      className
    )}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} variant={variant} />
      ))}
    </div>
  );
}