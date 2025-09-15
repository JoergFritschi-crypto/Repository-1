import { lazy, Suspense } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { TestingModeIndicator } from "@/components/ui/testing-mode-indicator";
import { useAuth } from "@/hooks/useAuth";
import ErrorBoundary from "@/components/ui/error-boundary";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

// Eagerly loaded lightweight pages
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import Home from "@/pages/home";
import Privacy from "@/pages/privacy";
import Terms from "@/pages/terms";
import Contact from "@/pages/contact";

// Lazy load heavy pages with lots of images/complex components
const PlantLibrary = lazy(() => import("@/pages/plant-library"));
const PlantDoctor = lazy(() => import("@/pages/plant-doctor"));
const GardenProperties = lazy(() => import("@/pages/garden-properties"));
const GardenDesign = lazy(() => import("@/pages/garden-design"));
const PremiumDashboard = lazy(() => import("@/pages/premium-dashboard"));

// Lazy load admin pages (only loaded when needed)
const Admin = lazy(() => import("@/pages/admin"));
const AdminTestVisualization = lazy(() => import("@/pages/admin-test-visualization"));
const AdminSpriteTest = lazy(() => import("@/pages/admin-sprite-test"));
const InpaintingComparison = lazy(() => import("@/pages/inpainting-comparison"));
const TestSeasonalSelector = lazy(() => import("@/pages/test-seasonal-selector"));
const TestI18n = lazy(() => import("@/pages/test-i18n"));

// Loading fallback component for lazy-loaded routes
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen">
    <LoadingSpinner size="xl" text="Loading page..." />
  </div>
);

// Wrapper component for lazy-loaded routes
const LazyRoute = ({ component: Component, ...props }: any) => (
  <Suspense fallback={<PageLoader />}>
    <Component {...props} />
  </Suspense>
);

function Router() {
  const { isAuthenticated, isLoading } = useAuth();
  const [location] = useLocation();
  
  // Define public routes that should be accessible without authentication
  const publicRoutes = ['/', '/welcome', '/privacy', '/terms', '/contact'];
  const isPublicRoute = publicRoutes.includes(location);
  
  // Only show loading spinner for authenticated routes when auth is being checked
  // Public routes should render immediately
  if (isLoading && !isPublicRoute) {
    return <PageLoader />;
  }

  return (
    <ErrorBoundary level="page" showDetails={process.env.NODE_ENV === 'development'}>
      <Switch>
        {/* Public pages available to everyone */}
        <Route path="/" component={Landing} />
        <Route path="/welcome" component={Landing} />
        <Route path="/privacy" component={Privacy} />
        <Route path="/terms" component={Terms} />
        <Route path="/contact" component={Contact} />
        
        {/* Authenticated routes - only render if authenticated */}
        {isAuthenticated && (
          <>
            <Route path="/home" component={Home} />
            <Route path="/garden-setup">
              {(params) => <LazyRoute component={GardenProperties} {...params} />}
            </Route>
            <Route path="/garden-properties/:id?">
              {(params) => <LazyRoute component={GardenProperties} {...params} />}
            </Route>
            <Route path="/garden-design/:id?">
              {(params) => <LazyRoute component={GardenDesign} {...params} />}
            </Route>
            <Route path="/garden/:id/design">
              {(params) => <LazyRoute component={GardenDesign} {...params} />}
            </Route>
            <Route path="/plant-library">
              {(params) => <LazyRoute component={PlantLibrary} {...params} />}
            </Route>
            <Route path="/plant-doctor">
              {(params) => <LazyRoute component={PlantDoctor} {...params} />}
            </Route>
            <Route path="/premium">
              {(params) => <LazyRoute component={PremiumDashboard} {...params} />}
            </Route>
            <Route path="/admin">
              {(params) => <LazyRoute component={Admin} {...params} />}
            </Route>
            <Route path="/admin/test-visualization">
              {(params) => <LazyRoute component={AdminTestVisualization} {...params} />}
            </Route>
            <Route path="/admin/sprite-test">
              {(params) => <LazyRoute component={AdminSpriteTest} {...params} />}
            </Route>
            <Route path="/admin/inpainting-comparison">
              {(params) => <LazyRoute component={InpaintingComparison} {...params} />}
            </Route>
            <Route path="/test-seasonal-selector">
              {(params) => <LazyRoute component={TestSeasonalSelector} {...params} />}
            </Route>
            <Route path="/test-i18n">
              {(params) => <LazyRoute component={TestI18n} {...params} />}
            </Route>
          </>
        )}
        <Route component={NotFound} />
      </Switch>
    </ErrorBoundary>
  );
}

function App() {
  return (
    <ErrorBoundary 
      level="page" 
      showDetails={process.env.NODE_ENV === 'development'}
      onReset={() => window.location.reload()}
    >
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <TestingModeIndicator />
          <Router />
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
