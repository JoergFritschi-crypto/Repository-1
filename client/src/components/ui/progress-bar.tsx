import * as React from "react";
import { cn } from "@/lib/utils";

interface ProgressBarProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number;
  max?: number;
}

const ProgressBar = React.forwardRef<HTMLDivElement, ProgressBarProps>(
  ({ className, value, max = 100, ...props }, ref) => {
    const percentage = Math.min(100, Math.max(0, (value / max) * 100));

    return (
      <div
        ref={ref}
        className={cn(
          "w-full bg-muted rounded-full h-2 overflow-hidden shadow-inner",
          className
        )}
        {...props}
      >
        <div
          className="h-full gold-accent transition-all duration-500 ease-out relative overflow-hidden"
          style={{ width: `${percentage}%` }}
        >
          <div className="absolute inset-0 shimmer opacity-30" />
        </div>
      </div>
    );
  }
);
ProgressBar.displayName = "ProgressBar";

export default ProgressBar;
