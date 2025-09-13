import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { TestingModeIndicator } from "@/components/ui/testing-mode-indicator";
import { useAuth } from "@/hooks/useAuth";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import Home from "@/pages/home";
import GardenProperties from "@/pages/garden-properties";
import GardenDesign from "@/pages/garden-design";
import PlantLibrary from "@/pages/plant-library";
import PlantDoctor from "@/pages/plant-doctor";
import PremiumDashboard from "@/pages/premium-dashboard";
import Admin from "@/pages/admin";
import AdminTestVisualization from "@/pages/admin-test-visualization";
import AdminSpriteTest from "@/pages/admin-sprite-test";
import InpaintingComparison from "@/pages/inpainting-comparison";
import TestSeasonalSelector from "@/pages/test-seasonal-selector";
import Privacy from "@/pages/privacy";
import Terms from "@/pages/terms";
import Contact from "@/pages/contact";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <Switch>
      {/* Public pages available to everyone */}
      <Route path="/" component={Landing} />
      <Route path="/welcome" component={Landing} />
      <Route path="/privacy" component={Privacy} />
      <Route path="/terms" component={Terms} />
      <Route path="/contact" component={Contact} />
      
      {/* Authenticated routes */}
      {isAuthenticated && (
        <>
          <Route path="/home" component={Home} />
          <Route path="/garden-setup" component={GardenProperties} />
          <Route path="/garden-properties/:id?" component={GardenProperties} />
          <Route path="/garden-design/:id?" component={GardenDesign} />
          <Route path="/garden/:id/design" component={GardenDesign} />
          <Route path="/plant-library" component={PlantLibrary} />
          <Route path="/plant-doctor" component={PlantDoctor} />
          <Route path="/premium" component={PremiumDashboard} />
          <Route path="/admin" component={Admin} />
          <Route path="/admin/test-visualization" component={AdminTestVisualization} />
          <Route path="/admin/sprite-test" component={AdminSpriteTest} />
          <Route path="/admin/inpainting-comparison" component={InpaintingComparison} />
          <Route path="/test-seasonal-selector" component={TestSeasonalSelector} />
        </>
      )}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <TestingModeIndicator />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
