import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AlertTriangle, RefreshCw, XCircle, Home, ArrowLeft } from "lucide-react";
import { Link } from "wouter";

interface ErrorMessageProps {
  title?: string;
  message?: string;
  error?: Error | unknown;
  onRetry?: () => void;
  showHomeButton?: boolean;
  showBackButton?: boolean;
  onBack?: () => void;
  className?: string;
  variant?: "inline" | "card" | "fullscreen";
}

export function ErrorMessage({ 
  title = "Something went wrong",
  message,
  error,
  onRetry,
  showHomeButton = false,
  showBackButton = false,
  onBack,
  className,
  variant = "inline"
}: ErrorMessageProps) {
  // Extract error message if error object provided
  const errorMessage = message || (
    error instanceof Error 
      ? error.message 
      : typeof error === 'string' 
        ? error 
        : "An unexpected error occurred. Please try again."
  );

  const content = (
    <>
      <div className="flex items-center justify-center mb-4">
        <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
          <AlertTriangle className="h-6 w-6 text-destructive" />
        </div>
      </div>
      <h3 className="text-lg font-semibold text-center mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground text-center mb-4 max-w-md">
        {errorMessage}
      </p>
      <div className="flex gap-2 justify-center">
        {onRetry && (
          <Button 
            onClick={onRetry}
            variant="default"
            size="sm"
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Try Again
          </Button>
        )}
        {showBackButton && onBack && (
          <Button 
            onClick={onBack}
            variant="outline"
            size="sm"
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Go Back
          </Button>
        )}
        {showHomeButton && (
          <Button 
            variant="outline"
            size="sm"
            className="gap-2"
            asChild
          >
            <Link href="/">
              <Home className="h-4 w-4" />
              Home
            </Link>
          </Button>
        )}
      </div>
    </>
  );

  if (variant === "fullscreen") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          {content}
        </div>
      </div>
    );
  }

  if (variant === "card") {
    return (
      <Card className={cn("p-6", className)}>
        {content}
      </Card>
    );
  }

  return (
    <div className={cn("py-8", className)}>
      {content}
    </div>
  );
}

interface ErrorBoundaryFallbackProps {
  error: Error;
  resetErrorBoundary: () => void;
}

export function ErrorBoundaryFallback({ 
  error, 
  resetErrorBoundary 
}: ErrorBoundaryFallbackProps) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="max-w-md w-full p-6">
        <div className="flex items-center justify-center mb-4">
          <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
            <XCircle className="h-8 w-8 text-destructive" />
          </div>
        </div>
        <h2 className="text-xl font-semibold text-center mb-2">
          Application Error
        </h2>
        <p className="text-sm text-muted-foreground text-center mb-4">
          The application encountered an unexpected error. This has been logged and we'll look into it.
        </p>
        <details className="mb-4">
          <summary className="text-sm text-muted-foreground cursor-pointer hover:text-foreground">
            Error details
          </summary>
          <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-x-auto">
            {error.message}
          </pre>
        </details>
        <div className="flex gap-2">
          <Button 
            onClick={resetErrorBoundary}
            className="flex-1 gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Try Again
          </Button>
          <Button 
            variant="outline"
            className="flex-1 gap-2"
            asChild
          >
            <Link href="/">
              <Home className="h-4 w-4" />
              Go Home
            </Link>
          </Button>
        </div>
      </Card>
    </div>
  );
}

interface InlineErrorProps {
  message: string;
  className?: string;
}

export function InlineError({ message, className }: InlineErrorProps) {
  return (
    <div className={cn(
      "flex items-center gap-2 text-sm text-destructive",
      className
    )}>
      <AlertTriangle className="h-4 w-4" />
      <span>{message}</span>
    </div>
  );
}

interface EmptyStateProps {
  title?: string;
  message?: string;
  icon?: React.ReactNode;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyState({ 
  title = "No data found",
  message = "There's nothing to display here yet.",
  icon,
  action,
  className
}: EmptyStateProps) {
  return (
    <div className={cn(
      "flex flex-col items-center justify-center py-12",
      className
    )}>
      {icon && (
        <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground text-center max-w-md mb-4">
        {message}
      </p>
      {action && (
        <Button onClick={action.onClick} size="sm">
          {action.label}
        </Button>
      )}
    </div>
  );
}