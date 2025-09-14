import { cn } from "@/lib/utils";

interface SkeletonTextProps {
  className?: string;
  lines?: number;
  width?: "full" | "3/4" | "1/2" | "1/3" | "1/4";
  height?: "xs" | "sm" | "base" | "lg" | "xl";
}

export function SkeletonText({ 
  className, 
  lines = 1,
  width = "full",
  height = "base"
}: SkeletonTextProps) {
  const heightClasses = {
    xs: "h-2",
    sm: "h-3",
    base: "h-4",
    lg: "h-5",
    xl: "h-6"
  };

  const widthClasses = {
    "full": "w-full",
    "3/4": "w-3/4",
    "1/2": "w-1/2",
    "1/3": "w-1/3",
    "1/4": "w-1/4"
  };

  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <div 
          key={i}
          className={cn(
            "bg-muted rounded animate-pulse",
            heightClasses[height],
            i === lines - 1 ? widthClasses[width] : "w-full"
          )}
        />
      ))}
    </div>
  );
}

interface SkeletonHeadingProps {
  className?: string;
  level?: 1 | 2 | 3 | 4;
  width?: "full" | "3/4" | "1/2" | "1/3";
}

export function SkeletonHeading({ 
  className, 
  level = 2,
  width = "3/4"
}: SkeletonHeadingProps) {
  const sizes = {
    1: "h-8",
    2: "h-6",
    3: "h-5",
    4: "h-4"
  };

  const widthClasses = {
    "full": "w-full",
    "3/4": "w-3/4",
    "1/2": "w-1/2",
    "1/3": "w-1/3"
  };

  return (
    <div className={cn(
      "bg-muted rounded animate-pulse",
      sizes[level],
      widthClasses[width],
      className
    )} />
  );
}

interface SkeletonBadgeProps {
  count?: number;
  className?: string;
}

export function SkeletonBadge({ count = 1, className }: SkeletonBadgeProps) {
  return (
    <div className={cn("flex gap-2", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div 
          key={i}
          className="h-5 bg-muted rounded-full animate-pulse"
          style={{ width: `${Math.random() * 40 + 40}px` }}
        />
      ))}
    </div>
  );
}

interface SkeletonStatProps {
  label?: boolean;
  className?: string;
}

export function SkeletonStat({ label = true, className }: SkeletonStatProps) {
  return (
    <div className={cn("space-y-1", className)}>
      <div className="h-7 bg-muted rounded w-16 animate-pulse" />
      {label && (
        <div className="h-3 bg-muted rounded w-24 animate-pulse" />
      )}
    </div>
  );
}