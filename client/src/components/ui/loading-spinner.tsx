import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface LoadingSpinnerProps {
  className?: string;
  size?: "xs" | "sm" | "base" | "lg" | "xl";
  text?: string;
  textPosition?: "bottom" | "right";
  fullScreen?: boolean;
  overlay?: boolean;
}

export function LoadingSpinner({ 
  className, 
  size = "base",
  text,
  textPosition = "bottom",
  fullScreen = false,
  overlay = false
}: LoadingSpinnerProps) {
  const sizeClasses = {
    xs: "h-3 w-3",
    sm: "h-4 w-4",
    base: "h-6 w-6",
    lg: "h-8 w-8",
    xl: "h-12 w-12"
  };

  const textSizeClasses = {
    xs: "text-xs",
    sm: "text-sm",
    base: "text-base",
    lg: "text-lg",
    xl: "text-xl"
  };

  const spinner = (
    <div className={cn(
      "flex items-center gap-2",
      textPosition === "bottom" ? "flex-col" : "flex-row",
      className
    )}>
      <Loader2 className={cn(
        "animate-spin text-primary",
        sizeClasses[size]
      )} />
      {text && (
        <span className={cn(
          "text-muted-foreground",
          textSizeClasses[size]
        )}>
          {text}
        </span>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
        {spinner}
      </div>
    );
  }

  if (overlay) {
    return (
      <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/50 backdrop-blur-sm rounded-lg">
        {spinner}
      </div>
    );
  }

  return spinner;
}

interface LoadingDotsProps {
  className?: string;
  size?: "sm" | "base" | "lg";
}

export function LoadingDots({ className, size = "base" }: LoadingDotsProps) {
  const sizeClasses = {
    sm: "h-1 w-1",
    base: "h-2 w-2",
    lg: "h-3 w-3"
  };

  return (
    <div className={cn("flex items-center gap-1", className)}>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className={cn(
            "bg-primary rounded-full animate-bounce",
            sizeClasses[size]
          )}
          style={{
            animationDelay: `${i * 150}ms`,
            animationDuration: "600ms"
          }}
        />
      ))}
    </div>
  );
}

interface ProgressBarProps {
  value: number;
  max?: number;
  text?: string;
  showPercentage?: boolean;
  className?: string;
  color?: "primary" | "accent" | "secondary";
}

export function ProgressBar({ 
  value, 
  max = 100,
  text,
  showPercentage = false,
  className,
  color = "primary"
}: ProgressBarProps) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));
  
  const colorClasses = {
    primary: "bg-primary",
    accent: "bg-accent",
    secondary: "bg-secondary"
  };

  return (
    <div className={cn("w-full space-y-1", className)}>
      {(text || showPercentage) && (
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">{text}</span>
          {showPercentage && (
            <span className="text-muted-foreground">{Math.round(percentage)}%</span>
          )}
        </div>
      )}
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div 
          className={cn(
            "h-full transition-all duration-300 ease-out rounded-full",
            colorClasses[color]
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

interface LoadingStepsProps {
  steps: Array<{
    label: string;
    status: "pending" | "loading" | "completed" | "error";
  }>;
  className?: string;
}

export function LoadingSteps({ steps, className }: LoadingStepsProps) {
  return (
    <div className={cn("space-y-2", className)}>
      {steps.map((step, index) => (
        <div key={index} className="flex items-center gap-3">
          <div className="relative">
            {step.status === "completed" && (
              <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            )}
            {step.status === "loading" && (
              <LoadingSpinner size="xs" />
            )}
            {step.status === "pending" && (
              <div className="h-5 w-5 rounded-full border-2 border-muted" />
            )}
            {step.status === "error" && (
              <div className="h-5 w-5 rounded-full bg-destructive flex items-center justify-center">
                <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
            )}
          </div>
          <span className={cn(
            "text-sm",
            step.status === "completed" && "text-muted-foreground",
            step.status === "loading" && "text-foreground font-medium",
            step.status === "pending" && "text-muted-foreground/50",
            step.status === "error" && "text-destructive"
          )}>
            {step.label}
          </span>
        </div>
      ))}
    </div>
  );
}