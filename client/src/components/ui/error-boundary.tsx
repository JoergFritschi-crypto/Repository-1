import { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, RefreshCw, Home, Bug, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
  resetKeys?: Array<string | number>;
  resetOnPropsChange?: boolean;
  isolate?: boolean;
  level?: 'page' | 'section' | 'component';
  showDetails?: boolean;
  className?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorCount: number;
  showDetails: boolean;
  isRecovering: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  private resetTimeoutId: number | null = null;
  private previousResetKeys: Array<string | number> = [];

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0,
      showDetails: false,
      isRecovering: false,
    };
    
    if (props.resetKeys) {
      this.previousResetKeys = props.resetKeys;
    }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    // Log error details in development
    if (isDevelopment) {
      console.group('🚨 Error Boundary Caught Error');
      console.error('Error:', error);
      console.error('Error Info:', errorInfo);
      console.error('Component Stack:', errorInfo.componentStack);
      console.groupEnd();
    } else {
      // In production, log minimal info
      console.error('Application error:', error.message);
    }

    this.setState(prevState => ({
      errorInfo,
      errorCount: prevState.errorCount + 1,
    }));

    // Auto-reset after 3 errors to prevent infinite loops
    if (this.state.errorCount >= 3) {
      this.resetTimeoutId = window.setTimeout(() => {
        this.resetErrorBoundary();
      }, 5000);
    }
  }

  componentDidUpdate(prevProps: Props) {
    const { resetKeys, resetOnPropsChange } = this.props;
    
    // Reset on prop changes if enabled
    if (resetOnPropsChange && prevProps.children !== this.props.children) {
      this.resetErrorBoundary();
    }
    
    // Reset if resetKeys changed
    if (resetKeys && this.previousResetKeys) {
      const hasResetKeyChanged = resetKeys.some(
        (key, idx) => key !== this.previousResetKeys[idx]
      );
      
      if (hasResetKeyChanged) {
        this.resetErrorBoundary();
        this.previousResetKeys = resetKeys;
      }
    }
  }

  componentWillUnmount() {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
    }
  }

  resetErrorBoundary = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0,
      showDetails: false,
      isRecovering: true,
    });

    // Clear recovering state after a moment
    setTimeout(() => {
      this.setState({ isRecovering: false });
    }, 500);

    this.props.onReset?.();
  };

  toggleDetails = () => {
    this.setState(prev => ({ showDetails: !prev.showDetails }));
  };

  navigateHome = () => {
    window.location.href = '/home';
  };

  render() {
    const { hasError, error, errorInfo, showDetails, isRecovering, errorCount } = this.state;
    const { children, fallback, level = 'component', showDetails: showDetailsProp, className } = this.props;
    const isDevelopment = process.env.NODE_ENV === 'development';

    if (isRecovering) {
      return (
        <div className={cn("flex items-center justify-center p-8", className)}>
          <div className="flex items-center gap-2 text-muted-foreground">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span>Recovering...</span>
          </div>
        </div>
      );
    }

    if (hasError && error) {
      // Custom fallback if provided
      if (fallback) {
        return <>{fallback}</>;
      }

      // Determine error severity and messaging based on level
      const isPageLevel = level === 'page';
      const isSectionLevel = level === 'section';
      
      const errorTitle = isPageLevel 
        ? "Page Error" 
        : isSectionLevel 
        ? "Section Error"
        : "Component Error";
      
      const errorMessage = isPageLevel
        ? "This page encountered an error and cannot be displayed."
        : isSectionLevel
        ? "This section of the page has encountered an error."
        : "A component has encountered an error.";

      return (
        <div className={cn(
          "flex items-center justify-center",
          isPageLevel ? "min-h-screen p-8" : "p-6",
          className
        )}>
          <Card className={cn(
            "w-full",
            isPageLevel ? "max-w-2xl" : "max-w-xl"
          )}>
            <CardHeader>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                <CardTitle>{errorTitle}</CardTitle>
              </div>
              <CardDescription>
                {errorMessage}
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Something went wrong</AlertTitle>
                <AlertDescription>
                  {error.message || "An unexpected error occurred"}
                </AlertDescription>
              </Alert>

              {errorCount > 1 && (
                <Alert>
                  <AlertDescription>
                    This error has occurred {errorCount} times. 
                    {errorCount >= 3 && " The component will auto-reset in a few seconds."}
                  </AlertDescription>
                </Alert>
              )}

              {(isDevelopment || showDetailsProp) && (
                <div className="space-y-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={this.toggleDetails}
                    className="w-full justify-between"
                    data-testid="toggle-error-details"
                  >
                    <span className="flex items-center gap-2">
                      <Bug className="h-4 w-4" />
                      Error Details
                    </span>
                    {showDetails ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                  
                  {showDetails && (
                    <Card className="bg-muted/50">
                      <CardContent className="pt-4">
                        <div className="space-y-3">
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-1">Error Name:</p>
                            <p className="text-sm font-mono">{error.name}</p>
                          </div>
                          
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-1">Message:</p>
                            <p className="text-sm font-mono break-all">{error.message}</p>
                          </div>
                          
                          {error.stack && (
                            <div>
                              <p className="text-xs font-medium text-muted-foreground mb-1">Stack Trace:</p>
                              <pre className="text-xs bg-black/10 dark:bg-white/10 p-2 rounded overflow-x-auto max-h-40">
                                {error.stack}
                              </pre>
                            </div>
                          )}
                          
                          {errorInfo?.componentStack && (
                            <div>
                              <p className="text-xs font-medium text-muted-foreground mb-1">Component Stack:</p>
                              <pre className="text-xs bg-black/10 dark:bg-white/10 p-2 rounded overflow-x-auto max-h-40">
                                {errorInfo.componentStack}
                              </pre>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}
            </CardContent>
            
            <CardFooter className="flex gap-2">
              <Button 
                onClick={this.resetErrorBoundary}
                className="flex-1"
                data-testid="reset-error-boundary"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
              
              {isPageLevel && (
                <Button 
                  variant="outline"
                  onClick={this.navigateHome}
                  className="flex-1"
                  data-testid="navigate-home"
                >
                  <Home className="h-4 w-4 mr-2" />
                  Go Home
                </Button>
              )}
            </CardFooter>
          </Card>
        </div>
      );
    }

    return <>{children}</>;
  }
}

// Specialized error boundaries for different contexts
export class GardenDesignErrorBoundary extends Component<
  { children: ReactNode; gardenId?: string },
  State
> {
  state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    errorCount: 0,
    showDetails: false,
    isRecovering: false,
  };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Garden Design Error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0,
    });
  };

  handleResume = () => {
    // Attempt to resume from last saved state
    const savedState = localStorage.getItem(`garden-state-${this.props.gardenId}`);
    if (savedState) {
      console.log('Attempting to resume from saved state');
      this.handleReset();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-[400px] p-8">
          <Card className="max-w-md w-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                Garden Design Error
              </CardTitle>
              <CardDescription>
                The garden designer encountered an issue
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertDescription>
                  Your garden design progress has been saved. You can try resuming
                  from where you left off or start fresh.
                </AlertDescription>
              </Alert>
            </CardContent>
            <CardFooter className="flex gap-2">
              <Button onClick={this.handleResume} className="flex-1" data-testid="resume-design">
                <RefreshCw className="h-4 w-4 mr-2" />
                Resume Design
              </Button>
              <Button variant="outline" onClick={this.handleReset} className="flex-1" data-testid="restart-design">
                Start Over
              </Button>
            </CardFooter>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export class CanvasErrorBoundary extends Component<
  { children: ReactNode; onFallback?: () => void },
  State & { useFallback: boolean }
> {
  state = {
    hasError: false,
    error: null as Error | null,
    errorInfo: null as ErrorInfo | null,
    errorCount: 0,
    showDetails: false,
    isRecovering: false,
    useFallback: false,
  };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Canvas Error:', error, errorInfo);
    this.setState({ errorInfo });
    
    // Check if it's a WebGL error
    if (error.message.includes('WebGL') || error.message.includes('canvas')) {
      this.setState({ useFallback: true });
      this.props.onFallback?.();
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      useFallback: false,
    });
  };

  handleUseFallback = () => {
    this.setState({ useFallback: true });
    this.props.onFallback?.();
  };

  render() {
    if (this.state.hasError) {
      return (
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Canvas Error
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Alert>
              <AlertDescription>
                The interactive canvas encountered an error. This might be due to
                browser compatibility or graphics driver issues.
              </AlertDescription>
            </Alert>
          </CardContent>
          <CardFooter className="flex gap-2">
            <Button onClick={this.handleReset} data-testid="retry-canvas">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry Canvas
            </Button>
            <Button variant="outline" onClick={this.handleUseFallback} data-testid="use-simple-view">
              Use Simple View
            </Button>
          </CardFooter>
        </Card>
      );
    }

    return this.props.children;
  }
}

export class PlantSearchErrorBoundary extends Component<
  { children: ReactNode },
  State
> {
  state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    errorCount: 0,
    showDetails: false,
    isRecovering: false,
  };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Plant Search Error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReset = () => {
    // Clear any cached search data
    sessionStorage.removeItem('plant-search-filters');
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      return (
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Search Error
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Alert>
              <AlertDescription>
                The plant search encountered an error. Filters have been reset.
              </AlertDescription>
            </Alert>
          </CardContent>
          <CardFooter>
            <Button onClick={this.handleReset} className="w-full" data-testid="reset-search">
              <RefreshCw className="h-4 w-4 mr-2" />
              Reset Search
            </Button>
          </CardFooter>
        </Card>
      );
    }

    return this.props.children;
  }
}

export class SeasonalViewerErrorBoundary extends Component<
  { children: ReactNode; onUseStatic?: () => void },
  State & { useStaticFallback: boolean }
> {
  state = {
    hasError: false,
    error: null as Error | null,
    errorInfo: null as ErrorInfo | null,
    errorCount: 0,
    showDetails: false,
    isRecovering: false,
    useStaticFallback: false,
  };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Seasonal Viewer Error:', error, errorInfo);
    this.setState({ errorInfo });
    
    // Check if it's an image loading error
    if (error.message.includes('image') || error.message.includes('load')) {
      this.setState({ useStaticFallback: true });
      this.props.onUseStatic?.();
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      useStaticFallback: false,
    });
  };

  handleUseStatic = () => {
    this.setState({ useStaticFallback: true });
    this.props.onUseStatic?.();
  };

  render() {
    if (this.state.hasError) {
      return (
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Seasonal Viewer Error
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Alert>
              <AlertDescription>
                The seasonal visualization encountered an error. This might be due to
                image loading issues or animation problems.
              </AlertDescription>
            </Alert>
          </CardContent>
          <CardFooter className="flex gap-2">
            <Button onClick={this.handleReset} data-testid="retry-viewer">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry Viewer
            </Button>
            <Button variant="outline" onClick={this.handleUseStatic} data-testid="use-static-images">
              Use Static Images
            </Button>
          </CardFooter>
        </Card>
      );
    }

    return this.props.children;
  }
}

// Hooks for functional components
export function useErrorHandler() {
  return (error: Error, errorInfo?: ErrorInfo) => {
    console.error('Error caught by hook:', error, errorInfo);
    // Could send to error reporting service here
  };
}

export default ErrorBoundary;