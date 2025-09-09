import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import Navigation from "@/components/layout/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { APIMonitoring } from "@/components/admin/api-monitoring";
import { APIKeysManager } from "@/components/admin/api-keys-manager";
import { PlantAdvancedSearch } from "@/components/admin/plant-advanced-search";
import { CompactPlantCard } from "@/components/plant/compact-plant-card";
import { ImageGenerationMonitor } from "@/components/admin/image-generation-monitor";
import { ImageComparisonTool } from "@/components/admin/image-comparison-tool";
import { AdminNavigation } from "@/components/admin/admin-navigation";
import { PlantImportWizard } from "@/components/admin/plant-import-wizard";
import { useLocation } from "wouter";
import { 
  Settings, 
  Database, 
  Upload, 
  FlaskConical, 
  Shield, 
  Server, 
  Key, 
  Users,
  User,
  Search,
  Filter,
  Check,
  X,
  Edit,
  Trash,
  Plus,
  FolderSync,
  FolderOutput,
  Leaf,
  ImageIcon,
  RefreshCw,
  Loader2,
  Crown,
  CreditCard,
  Zap,
  Trash2,
  Lock,
  Map
} from "lucide-react";

export default function Admin() {
  const { user, isLoading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState("plants");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [testingTier, setTestingTier] = useState<string | null>(null);
  const { toast } = useToast();

  // Handle tier testing
  useEffect(() => {
    if (testingTier) {
      sessionStorage.setItem('tierTestingMode', testingTier);
      // Trigger re-render of auth-dependent components
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      toast({
        title: "Testing Mode Activated",
        description: `Now testing as ${testingTier.replace('_', ' ').toUpperCase()} user`,
      });
    } else {
      sessionStorage.removeItem('tierTestingMode');
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
    }
  }, [testingTier]);

  // Admin access check and make admin
  useEffect(() => {
    if (!authLoading && !user) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
    
    // Make yourself admin on first access
    if (user && !(user as any).isAdmin) {
      apiRequest("POST", "/api/admin/make-admin")
        .then(response => response.json())
        .then(() => {
          toast({
            title: "Admin Access Granted",
            description: "You now have admin privileges",
          });
          queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
        })
        .catch(error => console.log("Admin setup:", error));
    }
  }, [user, authLoading, toast]);

  const { data: pendingPlants, isLoading: pendingPlantsLoading } = useQuery({
    queryKey: ["/api/admin/plants/pending"],
    enabled: !!user,
  });

  const { data: plants, isLoading: plantsLoading, refetch: refetchPlants } = useQuery({
    queryKey: [`/api/plants/search?q=${searchQuery || ''}`],
    enabled: !!user,
    // Auto-refresh every 5 seconds if there are plants generating images
    refetchInterval: (data) => {
      if (!data || !Array.isArray(data)) return false;
      return data.some((p: any) => p.imageGenerationStatus === 'generating' || p.imageGenerationStatus === 'queued') ? 5000 : false;
    },
  });

  const verifyPlantMutation = useMutation({
    mutationFn: async (plantId: string) => {
      const response = await apiRequest("PUT", `/api/admin/plants/${plantId}/verify`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Plant Verified",
        description: "Plant has been verified successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/plants/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/plants/search"] });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" aria-label="Loading"/>
        </div>
      </div>
    );
  }

  const deletePlantMutation = useMutation({
    mutationFn: async (plantId: string) => {
      const response = await apiRequest("DELETE", `/api/admin/plants/${plantId}`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Plant Deleted",
        description: "Plant has been removed from the database.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/plants/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/plants/search"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete plant.",
        variant: "destructive",
      });
    },
  });

  const adminTabs = [
    { id: "plants", label: "Plant Database", icon: Database },
    { id: "image-gen", label: "Image Generation", icon: ImageIcon },
    { id: "image-test", label: "Image Testing", icon: FlaskConical },
    { id: "api-monitor", label: "API Monitor", icon: Server },
    { id: "import", label: "Import Wizard", icon: Upload },
    { id: "testing", label: "Testing Tools", icon: FlaskConical },
    { id: "security", label: "Security", icon: Shield },
    { id: "api-keys", label: "API Keys", icon: Key },
  ];

  // Create test garden mutation
  const createTestGardenMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/admin/create-test-garden");
      return response.json();
    },
    onSuccess: (data) => {
      // Mark that we're navigating from admin
      sessionStorage.setItem('navigationSource', 'admin');
      window.location.href = `/garden-design/${data.id}`;
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Admin Navigation Bar */}
        <AdminNavigation currentPage={activeTab === 'plants' ? 'Plant Database' : activeTab === 'testing' ? 'Testing Tools' : undefined} />
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-serif font-bold text-foreground mb-2" data-testid="text-admin-title">
            <Settings className="w-8 h-8 inline mr-3 text-accent" />
            Admin Dashboard
          </h1>
          <p className="text-lg text-muted-foreground" data-testid="text-admin-subtitle">
            System management and configuration
          </p>
        </div>

        {/* Admin Navigation */}
        <Card className="mb-8">
          <CardContent className="pt-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="inline-flex h-10 items-center justify-start rounded-lg bg-muted p-1 text-muted-foreground w-full" data-testid="tabs-admin">
                {adminTabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <Tooltip key={tab.id}>
                      <TooltipTrigger asChild>
                        <TabsTrigger
                          value={tab.id}
                          className="inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
                          data-testid={`tab-${tab.id}`}
                        >
                          <Icon className="w-4 h-4" />
                        </TabsTrigger>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{tab.label}</p>
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </TabsList>

              {/* Plant Database Management */}
              <TabsContent value="plants" className="mt-8">
                <div className="space-y-6">
                  {/* Database Overview Bar */}
                  <Card>
                    <CardContent className="py-4">
                      <div className="flex flex-wrap gap-8 items-center">
                        <div>
                          <p className="text-sm text-muted-foreground">Total Plants</p>
                          <p className="text-2xl font-bold" data-testid="text-total-plants">{(plants as any)?.length || 0}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Verified</p>
                          <p className="text-xl font-semibold text-accent" data-testid="text-verified-plants">
                            {(plants as any)?.filter((p: any) => p.verification_status === 'verified').length || 0}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Pending</p>
                          <p className="text-xl font-semibold text-canary" data-testid="text-pending-plants">
                            {(plants as any)?.filter((p: any) => p.verification_status === 'pending').length || 0}
                          </p>
                        </div>
                        {(plants as any)?.some((p: any) => p.imageGenerationStatus === 'generating' || p.imageGenerationStatus === 'queued') && (
                          <div>
                            <p className="text-sm text-muted-foreground">Generating</p>
                            <p className="text-xl font-semibold text-blue-500 flex items-center gap-1">
                              <Loader2 className="w-4 h-4 animate-spin" />
                              {(plants as any)?.filter((p: any) => p.imageGenerationStatus === 'generating' || p.imageGenerationStatus === 'queued').length || 0}
                            </p>
                          </div>
                        )}
                        <div className="ml-auto flex gap-2">
                          <Button
                            size="sm"
                            variant="default"
                            className="bg-green-600 hover:bg-green-700"
                            data-testid="button-create-test-garden"
                            onClick={() => createTestGardenMutation.mutate()}
                            disabled={createTestGardenMutation.isPending}
                          >
                            <Map className="w-4 h-4 mr-1" />
                            Create Test Garden
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            data-testid="button-refresh-plants"
                            onClick={() => {
                              refetchPlants();
                              queryClient.invalidateQueries({ queryKey: ['/api/admin/plants/pending'] });
                              toast({
                                title: "Refreshed",
                                description: "Plant database has been refreshed",
                              });
                            }}
                            disabled={plantsLoading}
                          >
                            <RefreshCw className={`w-4 h-4 mr-1 ${plantsLoading ? 'animate-spin' : ''}`} />
                            Refresh
                          </Button>
                          <Button size="sm" variant="outline" data-testid="button-add-plant">
                            <Plus className="w-4 h-4 mr-1" />
                            Add Plant
                          </Button>
                          <Button size="sm" variant="outline" data-testid="button-export-database">
                            <FolderOutput className="w-4 h-4 mr-1" />
                            Export
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Advanced Search */}
                  <PlantAdvancedSearch 
                    onSearch={(filters) => {
                      console.log('Searching with filters:', filters);
                      // TODO: Implement search with filters
                    }}
                    totalResults={(plants as any)?.length || 0}
                  />

                  {/* Plant Cards Grid */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Plant Database</CardTitle>
                    </CardHeader>
                    <CardContent>

                        {/* Plants Display */}
                        {(!(plants as any) || (plants as any).length === 0) ? (
                          <div className="text-center py-12">
                            <Leaf className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                            <h3 className="text-xl font-semibold mb-2">No Plants Yet</h3>
                            <p className="text-muted-foreground mb-4">
                              Start by importing plants from Perenual or adding them manually
                            </p>
                            <Button>
                              <Plus className="w-4 h-4 mr-2" />
                              Add Your First Plant
                            </Button>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {/* Render all plants once with their verification status shown on the card */}
                            {(plants as any) && (plants as any).map((plant: any) => (
                              <CompactPlantCard
                                key={plant.id}
                                plant={plant}
                                isAdmin={true}
                                onVerify={plant.verification_status === 'pending' ? () => verifyPlantMutation.mutate(plant.id) : undefined}
                                onReject={plant.verification_status === 'pending' ? () => deletePlantMutation.mutate(plant.id) : undefined}
                                onEdit={() => {
                                  toast({
                                    title: "Edit Feature",
                                    description: "Plant editing feature coming soon.",
                                  });
                                }}
                                onDelete={() => deletePlantMutation.mutate(plant.id)}
                                onGenerateImages={async () => {
                                  try {
                                    const response = await apiRequest('POST', `/api/admin/plants/${plant.id}/generate-images`);
                                    const data = await response.json();
                                    toast({
                                      title: "Image Generation Started",
                                      description: "Images are being generated. This may take a few minutes.",
                                    });
                                    queryClient.invalidateQueries({ queryKey: [`/api/plants/search?q=${searchQuery || ''}`] });
                                  } catch (error) {
                                    toast({
                                      title: "Error",
                                      description: "Failed to start image generation",
                                      variant: "destructive",
                                    });
                                  }
                                }}
                              />
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
              </TabsContent>

              {/* Plant Import Wizard Tab */}
              <TabsContent value="import" className="mt-8">
                <PlantImportWizard />
              </TabsContent>

              <TabsContent value="testing" className="mt-8 space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle data-testid="text-testing-tools-title">Testing Tools</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      {/* Tier Testing Tool */}
                      <div className="border rounded-lg p-6 bg-gradient-to-r from-purple-50 to-pink-50">
                        <div className="flex items-center gap-3 mb-4">
                          <Crown className="w-6 h-6 text-purple-600" />
                          <h3 className="text-lg font-semibold">User Tier Testing</h3>
                        </div>
                        <p className="text-sm text-muted-foreground mb-4">
                          Temporarily simulate different user tiers to test the user experience. Your admin privileges remain accessible.
                        </p>
                        
                        <div className="grid grid-cols-3 gap-4">
                          <Button
                            variant={testingTier === 'free' ? 'default' : 'outline'}
                            onClick={() => setTestingTier('free')}
                            className="flex flex-col items-center py-4"
                            data-testid="button-test-tier-free"
                          >
                            <User className="w-5 h-5 mb-2" />
                            <span className="font-medium">Free Tier</span>
                            <span className="text-xs text-muted-foreground mt-1">1 design credit</span>
                          </Button>
                          
                          <Button
                            variant={testingTier === 'pay_per_design' ? 'default' : 'outline'}
                            onClick={() => setTestingTier('pay_per_design')}
                            className="flex flex-col items-center py-4"
                            data-testid="button-test-tier-pay-per-design"
                          >
                            <CreditCard className="w-5 h-5 mb-2" />
                            <span className="font-medium">Pay-Per-Design</span>
                            <span className="text-xs text-muted-foreground mt-1">Purchase credits</span>
                          </Button>
                          
                          <Button
                            variant={testingTier === 'premium' ? 'default' : 'outline'}
                            onClick={() => setTestingTier('premium')}
                            className="flex flex-col items-center py-4"
                            data-testid="button-test-tier-premium"
                          >
                            <Crown className="w-5 h-5 mb-2" />
                            <span className="font-medium">Premium</span>
                            <span className="text-xs text-muted-foreground mt-1">Unlimited access</span>
                          </Button>
                        </div>
                        
                        {testingTier && (
                          <div className="mt-4 space-y-3">
                            <div className="p-3 bg-white rounded-lg border border-purple-200">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                                  <span className="text-sm font-medium">Testing as: {testingTier.replace('_', ' ').toUpperCase()}</span>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setTestingTier(null)}
                                  data-testid="button-clear-testing-tier"
                                >
                                  <X className="w-4 h-4 mr-1" />
                                  Clear
                                </Button>
                              </div>
                            </div>
                            
                            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                              <p className="text-sm text-blue-800">
                                <strong>How to exit testing mode:</strong> Look for the floating indicator at the bottom-right of your screen. 
                                Click "Exit to Admin" to return to your normal admin privileges, or click the minimize button to hide it temporarily.
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {/* Testing Tools Section */}
                      <div className="border-t pt-6" data-testid="testing-tools-section">
                        <h3 className="font-semibold mb-4 flex items-center gap-2">
                          <Zap className="w-4 h-4 text-yellow-500" />
                          Quick Actions
                        </h3>
                        
                        <div className="grid grid-cols-2 gap-3">
                          <Button
                            variant="outline"
                            className="h-auto flex flex-col items-center py-4 hover:bg-blue-50 hover:border-blue-300"
                            onClick={() => {
                              // Navigate to Test Garden 1
                              window.location.href = '/garden-design/1';
                            }}
                            data-testid="button-load-test-garden"
                          >
                            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mb-2">
                              <Map className="w-5 h-5 text-blue-600" />
                            </div>
                            <span className="font-medium text-sm">Load Test Garden 1</span>
                            <span className="text-xs text-muted-foreground mt-1">Continue saved design</span>
                          </Button>
                          
                          <Button
                            variant="outline"
                            className="h-auto flex flex-col items-center py-4 hover:bg-blue-50 hover:border-blue-300"
                            onClick={() => {
                              toast({
                                title: "Coming Soon",
                                description: "Database seeding will be available soon",
                              });
                            }}
                            data-testid="button-seed-database"
                          >
                            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mb-2">
                              <Database className="w-5 h-5 text-blue-600" />
                            </div>
                            <span className="font-medium text-sm">Seed Database</span>
                            <span className="text-xs text-muted-foreground mt-1">Add sample plants</span>
                          </Button>
                          
                          <Button
                            variant="outline"
                            className="h-auto flex flex-col items-center py-4 hover:bg-green-50 hover:border-green-300"
                            onClick={() => {
                              window.location.href = "/admin/test-visualization";
                            }}
                            data-testid="button-test-visualization"
                          >
                            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mb-2">
                              <ImageIcon className="w-5 h-5 text-green-600" />
                            </div>
                            <span className="font-medium text-sm">Test Visualization</span>
                            <span className="text-xs text-muted-foreground mt-1">Seasonal images</span>
                          </Button>
                          
                          <Button
                            variant="outline"
                            className="h-auto flex flex-col items-center py-4 hover:bg-blue-50 hover:border-blue-300"
                            onClick={() => {
                              window.location.href = "/admin/sprite-test";
                            }}
                            data-testid="button-sprite-test"
                          >
                            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mb-2">
                              <Leaf className="w-5 h-5 text-blue-600" />
                            </div>
                            <span className="font-medium text-sm">Sprite Test</span>
                            <span className="text-xs text-muted-foreground mt-1">Plant sprites</span>
                          </Button>
                          
                          <Button
                            variant="outline"
                            className="h-auto flex flex-col items-center py-4 hover:bg-purple-50 hover:border-purple-300"
                            onClick={() => {
                              window.location.href = "/admin/inpainting-comparison";
                            }}
                            data-testid="button-inpainting-comparison"
                          >
                            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center mb-2">
                              <Zap className="w-5 h-5 text-purple-600" />
                            </div>
                            <span className="font-medium text-sm">AI Inpainting</span>
                            <span className="text-xs text-muted-foreground mt-1">Compare approaches</span>
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="security" className="mt-8">
                <Card>
                  <CardHeader>
                    <CardTitle data-testid="text-security-title">Security Settings</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-12" data-testid="security-placeholder">
                      <Shield className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-xl font-semibold mb-2">Security Settings</h3>
                      <p className="text-muted-foreground">
                        Manage security policies and access controls
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>


              <TabsContent value="image-gen" className="mt-8">
                <ImageGenerationMonitor />
              </TabsContent>
              
              <TabsContent value="image-test" className="mt-8">
                <ImageComparisonTool />
              </TabsContent>

              <TabsContent value="api-monitor" className="mt-8">
                <APIMonitoring />
              </TabsContent>

              <TabsContent value="api-keys" className="mt-8">
                <APIKeysManager />
              </TabsContent>

            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
