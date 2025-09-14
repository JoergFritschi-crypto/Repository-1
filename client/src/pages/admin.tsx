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
import APIManagement from "@/components/admin/api-management";
import { PlantAdvancedSearch } from "@/components/admin/plant-advanced-search";
import { CompactPlantCard } from "@/components/plant/compact-plant-card";
import { ImageGenerationMonitor } from "@/components/admin/image-generation-monitor";
import { ImageComparisonTool } from "@/components/admin/image-comparison-tool";
import { AdminNavigation } from "@/components/admin/admin-navigation";
import { PlantImportWizard } from "@/components/admin/plant-import-wizard";
import { TodoList } from "@/components/admin/todo-list";
import { SecuritySettings } from "@/components/admin/security-settings";
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
  Map,
  ListTodo,
  Palette,
  Download,
  RotateCcw
} from "lucide-react";

// AI-Generated Icon Component for Icon Gallery
const AIGeneratedIcon = ({ path, name, size = 96 }: { path: string; name: string; size?: number }) => (
  <div className="flex flex-col items-center space-y-2 p-4 border border-border rounded-lg bg-card hover:bg-accent/50 transition-colors">
    <img 
      src={path} 
      alt={name}
      width={size}
      height={size}
      className="object-contain mx-auto"
      style={{ width: size, height: size }}
      onError={(e) => {
        console.error(`Failed to load icon: ${path}`);
        e.currentTarget.style.display = 'none';
      }}
    />
    <span className="text-sm font-medium text-center max-w-[120px] text-foreground">{name}</span>
    <Button
      variant="outline"
      size="sm"
      onClick={() => {
        // Download the icon
        const link = document.createElement('a');
        link.href = path;
        link.download = name.toLowerCase().replace(/\s+/g, '-') + '.png';
        link.click();
      }}
      data-testid={`download-icon-${name.toLowerCase().replace(/\s+/g, '-')}`}
    >
      <Download className="w-4 h-4 mr-1" />
      Download
    </Button>
  </div>
);

const expectedIcons = [
  { name: "Garden Spade", filename: "garden-spade.png" },
  { name: "Garden Fork", filename: "garden-fork.png" },
  { name: "Garden Rake", filename: "garden-rake.png" },
  { name: "Terracotta Plant Pot", filename: "terracotta-plant-pot.png" },
  { name: "Watering Can", filename: "watering-can.png" },
  { name: "Hand Trowel", filename: "hand-trowel.png" },
  { name: "Pruning Shears", filename: "pruning-shears.png" },
  { name: "Garden Hoe", filename: "garden-hoe.png" },
  { name: "Seed Dibber", filename: "seed-dibber.png" }
];

export default function Admin() {
  const { user, isLoading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState("plants");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [testingTier, setTestingTier] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<any>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchFilters, setSearchFilters] = useState<any>(null);
  const [isGeneratingIcons, setIsGeneratingIcons] = useState(false);
  const [isBatchValidating, setIsBatchValidating] = useState(false);
  const [isGeneratingMissing, setIsGeneratingMissing] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number } | null>(null);
  const { toast } = useToast();

  // Icon Gallery functionality
  const IconGalleryContent = () => {
    // Check which icons exist
    const checkIconExistence = async () => {
      const existingIcons: Array<{ name: string; path: string; timestamp: string }> = [];
      
      for (const icon of expectedIcons) {
        try {
          const response = await fetch(`/generated-icons/${icon.filename}`, { method: 'HEAD' });
          if (response.ok) {
            existingIcons.push({
              name: icon.name,
              path: `/generated-icons/${icon.filename}`,
              timestamp: new Date().toISOString()
            });
          }
        } catch (error) {
          // Icon doesn't exist, skip
        }
      }
      
      return existingIcons;
    };

    const { data: existingIcons = [], refetch: refetchIcons } = useQuery({
      queryKey: ['/api/generated-icons'],
      queryFn: checkIconExistence,
      refetchOnMount: true,
      staleTime: 5 * 60 * 1000, // 5 minutes
    });

    const generateIconsMutation = useMutation({
      mutationFn: async () => {
        setIsGeneratingIcons(true);
        const response = await apiRequest('POST', '/api/admin/generate-garden-tool-icons');
        return await response.json();
      },
      onSuccess: (data: any) => {
        setIsGeneratingIcons(false);
        toast({
          title: "Success! 🎨",
          description: `Generated ${data.paths?.length || 0} photorealistic garden tool icons using Gemini AI`,
        });
        refetchIcons();
      },
      onError: (error: any) => {
        setIsGeneratingIcons(false);
        toast({
          title: "Generation Failed",
          description: error.message || "Failed to generate icons. Please try again.",
          variant: "destructive",
        });
      },
    });

    const hasAllIcons = existingIcons.length === expectedIcons.length;
    const missingCount = expectedIcons.length - existingIcons.length;

    return (
      <Card className="bg-card border-border">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold text-foreground mb-2">
            🎨 AI-Generated Garden Tool Icons
          </CardTitle>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Photorealistic, 3D-rendered garden tool icons created using <strong>Gemini 2.0 Flash</strong> AI. 
            Each icon follows our British racing green and gold color scheme with studio lighting and realistic materials.
          </p>
        </CardHeader>
        
        <CardContent className="space-y-8">
          {/* Generation Controls */}
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
              <span>Icons: {existingIcons.length}/{expectedIcons.length}</span>
              {!hasAllIcons && (
                <span className="text-amber-600 dark:text-amber-400">
                  {missingCount} missing
                </span>
              )}
              {hasAllIcons && (
                <span className="text-emerald-600 dark:text-emerald-400">
                  ✓ Complete set
                </span>
              )}
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
              <Button
                onClick={() => generateIconsMutation.mutate()}
                disabled={isGeneratingIcons}
                size="lg"
                className="bg-primary text-primary-foreground hover:bg-primary/90"
                data-testid="button-generate-icons"
              >
                {isGeneratingIcons ? (
                  <>
                    <RotateCcw className="w-4 h-4 mr-2 animate-spin" />
                    Generating with Gemini AI...
                  </>
                ) : (
                  <>
                    🎨 Generate All Icons
                  </>
                )}
              </Button>
              
              <Button
                onClick={() => refetchIcons()}
                variant="outline"
                size="lg"
                data-testid="button-refresh-gallery"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Refresh Gallery
              </Button>
            </div>
          </div>

          {/* Progress/Status */}
          {isGeneratingIcons && (
            <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
              <div className="text-center space-y-2">
                <div className="text-amber-800 dark:text-amber-200 font-medium">
                  🤖 Gemini 2.0 Flash is creating your icons...
                </div>
                <div className="text-sm text-amber-700 dark:text-amber-300">
                  Each icon takes 2-3 seconds to generate with photorealistic 3D rendering
                </div>
                <div className="w-full bg-amber-200 dark:bg-amber-800 rounded-full h-2">
                  <div className="bg-amber-600 h-2 rounded-full animate-pulse" style={{ width: '60%' }}></div>
                </div>
              </div>
            </div>
          )}

          {/* Icon Grid */}
          {existingIcons.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {existingIcons.map((icon, index) => (
                <AIGeneratedIcon
                  key={`${icon.name}-${index}`}
                  path={icon.path}
                  name={icon.name}
                  size={96}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 space-y-4">
              <div className="text-6xl">🎨</div>
              <div className="text-xl font-medium text-foreground">No icons generated yet</div>
              <div className="text-muted-foreground max-w-md mx-auto">
                Click "Generate All Icons" to create photorealistic garden tool icons using Gemini AI. 
                Each icon will be rendered in 3D with professional lighting and our signature color scheme.
              </div>
            </div>
          )}

          {/* Technical Details */}
          <div className="bg-muted/50 rounded-lg p-6 space-y-4">
            <h3 className="text-lg font-semibold text-foreground">🔧 Technical Details</h3>
            <div className="grid md:grid-cols-2 gap-4 text-sm text-muted-foreground">
              <div className="space-y-2">
                <div><strong>AI Model:</strong> Gemini 2.0 Flash (Image Generation)</div>
                <div><strong>Style:</strong> Photorealistic 3D Studio Rendering</div>
                <div><strong>Format:</strong> PNG with transparency</div>
                <div><strong>Resolution:</strong> High-quality for web use</div>
              </div>
              <div className="space-y-2">
                <div><strong>Color Scheme:</strong> British Racing Green & Gold</div>
                <div><strong>Lighting:</strong> Professional studio setup</div>
                <div><strong>Materials:</strong> Realistic metal, wood, brass</div>
                <div><strong>Generation Time:</strong> ~2-3 seconds per icon</div>
              </div>
            </div>
          </div>

          {/* Feature Comparison */}
          <div className="bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-emerald-800 dark:text-emerald-200 mb-4">
              ✨ Why AI-Generated Icons?
            </h3>
            <div className="grid sm:grid-cols-2 gap-4 text-sm">
              <div className="space-y-2 text-emerald-700 dark:text-emerald-300">
                <div>🎨 <strong>Photorealistic Quality:</strong> True 3D rendering with depth and shadows</div>
                <div>🎯 <strong>Perfect Consistency:</strong> Unified style across all tools</div>
                <div>⚡ <strong>Rapid Generation:</strong> New icons in seconds, not hours</div>
              </div>
              <div className="space-y-2 text-emerald-700 dark:text-emerald-300">
                <div>🎭 <strong>Artistic Vision:</strong> Hand-crafted English garden tool aesthetic</div>
                <div>🔄 <strong>Infinite Variations:</strong> Easy to generate new tools</div>
                <div>📐 <strong>Icon Optimized:</strong> Clear and recognizable at all sizes</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

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

  // Admin access check
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
    
    // Check if user has admin privileges
    if (user && !(user as any).isAdmin) {
      toast({
        title: "Access Denied",
        description: "You need admin privileges to access this page",
        variant: "destructive",
      });
      // Redirect to home page after showing the message
      setTimeout(() => {
        window.location.href = "/";
      }, 2000);
    }
  }, [user, authLoading, toast]);

  const { data: pendingPlants, isLoading: pendingPlantsLoading } = useQuery({
    queryKey: ["/api/admin/plants/pending"],
    enabled: !!user,
  });

  const { data: plants, isLoading: plantsLoading, refetch: refetchPlants } = useQuery({
    queryKey: [`/api/plants/search?q=${searchQuery || ''}`],
    enabled: !!user && !searchResults,
    // Auto-refresh every 5 seconds if there are plants generating images
    refetchInterval: (data) => {
      if (!data || !Array.isArray(data)) return false;
      return data.some((p: any) => p.imageGenerationStatus === 'generating' || p.imageGenerationStatus === 'queued') ? 5000 : false;
    },
  });

  // Display either search results or default plants
  const displayedPlants = searchResults || plants;

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
      // Invalidate all related queries to ensure UI updates
      queryClient.invalidateQueries({ queryKey: ["/api/admin/plants/pending"] });
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          const key = query.queryKey[0];
          return typeof key === 'string' && key.startsWith('/api/plants/search');
        }
      });
      queryClient.invalidateQueries({ queryKey: ["/api/plants"] });
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
      // Invalidate all related queries to ensure UI updates
      queryClient.invalidateQueries({ queryKey: ["/api/admin/plants/pending"] });
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          const key = query.queryKey[0];
          return typeof key === 'string' && key.startsWith('/api/plants/search');
        }
      });
      queryClient.invalidateQueries({ queryKey: ["/api/plants"] });
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
    { id: "todo", label: "To-Do List", icon: ListTodo },
    { id: "plants", label: "Plant Database", icon: Database },
    { id: "icon-gallery", label: "Icon Gallery", icon: Palette },
    { id: "image-gen", label: "Image Generation", icon: ImageIcon },
    { id: "image-test", label: "Image Testing", icon: FlaskConical },
    { id: "api-management", label: "API Management", icon: Server },
    { id: "import", label: "Import Wizard", icon: Upload },
    { id: "testing", label: "Testing Tools", icon: FlaskConical },
    { id: "security", label: "Security", icon: Shield },
  ];

  // Batch validation handler
  const handleBatchValidation = async () => {
    setIsBatchValidating(true);
    setBatchProgress(null);
    
    try {
      const pendingPlantIds = displayedPlants
        ?.filter((p: any) => p.verification_status === 'pending')
        .map((p: any) => p.id) || [];
      
      const totalPlants = pendingPlantIds.length;
      setBatchProgress({ current: 0, total: totalPlants });
      
      // Process in batches of 10
      const batchSize = 10;
      let successCount = 0;
      let failCount = 0;
      
      for (let i = 0; i < pendingPlantIds.length; i += batchSize) {
        const batch = pendingPlantIds.slice(i, i + batchSize);
        
        // Process batch
        const response = await apiRequest("POST", "/api/admin/plants/batch-validate", {
          plantIds: batch
        });
        
        const result = await response.json();
        successCount += result.success || 0;
        failCount += result.failed || 0;
        
        setBatchProgress({ current: Math.min(i + batchSize, totalPlants), total: totalPlants });
        
        // Add delay to prevent overload
        if (i + batchSize < pendingPlantIds.length) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }
      
      toast({
        title: "Batch Validation Complete",
        description: `Successfully validated ${successCount} plants${failCount > 0 ? `, ${failCount} failed` : ''}`,
      });
      
      // Refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/admin/plants/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/plants"] });
      refetchPlants();
    } catch (error: any) {
      toast({
        title: "Batch Validation Failed",
        description: error.message || "Failed to validate plants",
        variant: "destructive",
      });
    } finally {
      setIsBatchValidating(false);
      setBatchProgress(null);
    }
  };
  
  // Generate missing images handler
  const handleGenerateMissing = async () => {
    setIsGeneratingMissing(true);
    setBatchProgress(null);
    
    try {
      const plantsWithMissingImages = displayedPlants
        ?.filter((p: any) => !p.images?.gardenFull && p.verification_status === 'verified')
        .map((p: any) => p.id) || [];
      
      const totalPlants = plantsWithMissingImages.length;
      setBatchProgress({ current: 0, total: totalPlants });
      
      // Process in batches of 5 (image generation is more resource intensive)
      const batchSize = 5;
      let successCount = 0;
      let failCount = 0;
      
      for (let i = 0; i < plantsWithMissingImages.length; i += batchSize) {
        const batch = plantsWithMissingImages.slice(i, i + batchSize);
        
        // Process batch
        const response = await apiRequest("POST", "/api/admin/plants/batch-generate-images", {
          plantIds: batch
        });
        
        const result = await response.json();
        successCount += result.success || 0;
        failCount += result.failed || 0;
        
        setBatchProgress({ current: Math.min(i + batchSize, totalPlants), total: totalPlants });
        
        // Add delay to prevent overload
        if (i + batchSize < plantsWithMissingImages.length) {
          await new Promise(resolve => setTimeout(resolve, 500)); // Longer delay for image generation
        }
      }
      
      toast({
        title: "Image Generation Complete",
        description: `Successfully generated images for ${successCount} plants${failCount > 0 ? `, ${failCount} failed` : ''}`,
      });
      
      // Refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/plants"] });
      refetchPlants();
    } catch (error: any) {
      toast({
        title: "Image Generation Failed",
        description: error.message || "Failed to generate images",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingMissing(false);
      setBatchProgress(null);
    }
  };

  // Create test garden mutation
  const createTestGardenMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/admin/create-test-garden");
      return response.json();
    },
    onSuccess: (data) => {
      // Mark that we're navigating from admin
      sessionStorage.setItem('navigationSource', 'admin');
      sessionStorage.setItem('intentionalNavigation', 'true');
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
                          className="inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-[#004025] data-[state=active]:text-white data-[state=active]:shadow-md hover:bg-[#004025]/10"
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

              {/* To-Do List */}
              <TabsContent value="todo" className="mt-8">
                <TodoList />
              </TabsContent>

              {/* Plant Database Management */}
              <TabsContent value="plants" className="mt-8">
                <div className="space-y-6">
                  {/* Database Overview Bar */}
                  <Card>
                    <CardContent className="py-4">
                      <div className="flex flex-wrap gap-8 items-center">
                        <div>
                          <p className="text-sm text-muted-foreground">Total Plants</p>
                          <p className="text-2xl font-bold" data-testid="text-total-plants">{displayedPlants?.length || 0}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Verified</p>
                          <p className="text-xl font-semibold text-accent" data-testid="text-verified-plants">
                            {displayedPlants?.filter((p: any) => p.verification_status === 'verified').length || 0}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Pending</p>
                          <p className="text-xl font-semibold text-canary" data-testid="text-pending-plants">
                            {displayedPlants?.filter((p: any) => p.verification_status === 'pending').length || 0}
                          </p>
                        </div>
                        {displayedPlants?.some((p: any) => p.imageGenerationStatus === 'generating' || p.imageGenerationStatus === 'queued') && (
                          <div>
                            <p className="text-sm text-muted-foreground">Generating</p>
                            <p className="text-xl font-semibold text-blue-500 flex items-center gap-1">
                              <Loader2 className="w-4 h-4 animate-spin" />
                              {displayedPlants?.filter((p: any) => p.imageGenerationStatus === 'generating' || p.imageGenerationStatus === 'queued').length || 0}
                            </p>
                          </div>
                        )}
                        <div className="ml-auto flex gap-2">
                          {displayedPlants?.filter((p: any) => p.verification_status === 'pending').length > 0 && (
                            <Button
                              size="sm"
                              variant="default"
                              className="bg-[#004025] hover:bg-[#004025]/90"
                              data-testid="button-batch-validate"
                              onClick={handleBatchValidation}
                              disabled={isBatchValidating}
                            >
                              {isBatchValidating ? (
                                <>
                                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                  {batchProgress ? `${batchProgress.current}/${batchProgress.total}` : 'Validating...'}
                                </>
                              ) : (
                                <>
                                  <Check className="w-4 h-4 mr-1" />
                                  Batch Validate ({displayedPlants?.filter((p: any) => p.verification_status === 'pending').length})
                                </>
                              )}
                            </Button>
                          )}
                          {displayedPlants?.filter((p: any) => !p.images?.gardenFull && p.verification_status === 'verified').length > 0 && (
                            <Button
                              size="sm"
                              variant="default"
                              className="bg-[#004025] hover:bg-[#004025]/90"
                              data-testid="button-generate-missing"
                              onClick={handleGenerateMissing}
                              disabled={isGeneratingMissing}
                            >
                              {isGeneratingMissing ? (
                                <>
                                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                  {batchProgress ? `${batchProgress.current}/${batchProgress.total}` : 'Generating...'}
                                </>
                              ) : (
                                <>
                                  <ImageIcon className="w-4 h-4 mr-1" />
                                  Generate Missing ({displayedPlants?.filter((p: any) => !p.images?.gardenFull && p.verification_status === 'verified').length})
                                </>
                              )}
                            </Button>
                          )}
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
                              setSearchResults(null);
                              setSearchFilters(null);
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
                    onSearch={async (filters) => {
                      // If filters are empty, reset to default view
                      if (Object.keys(filters).length === 0) {
                        setSearchResults(null);
                        setSearchFilters(null);
                        refetchPlants();
                        return;
                      }

                      setIsSearching(true);
                      setSearchFilters(filters);
                      
                      try {
                        const response = await apiRequest('POST', '/api/plants/advanced-search', filters);
                        const data = await response.json();
                        
                        setSearchResults(data);
                        
                        toast({
                          title: "Search Complete",
                          description: `Found ${data.length} plant${data.length !== 1 ? 's' : ''} matching your criteria`,
                        });
                      } catch (error) {
                        toast({
                          title: "Search Error",
                          description: "Failed to search plants. Please try again.",
                          variant: "destructive",
                        });
                        setSearchResults(null);
                      } finally {
                        setIsSearching(false);
                      }
                    }}
                    totalResults={displayedPlants?.length || 0}
                  />

                  {/* Plant Cards Grid */}
                  <Card>
                    <CardHeader>
                      <div className="flex justify-between items-center">
                        <CardTitle>
                          Plant Database
                          {searchFilters && (
                            <Badge variant="secondary" className="ml-2">
                              <Search className="w-3 h-3 mr-1" />
                              Filtered Results
                            </Badge>
                          )}
                        </CardTitle>
                        {searchFilters && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setSearchResults(null);
                              setSearchFilters(null);
                              refetchPlants();
                              toast({
                                title: "Search Cleared",
                                description: "Showing all plants",
                              });
                            }}
                            className="mr-2"
                            data-testid="button-clear-search"
                          >
                            <X className="w-4 h-4 mr-1" />
                            Clear Search
                          </Button>
                        )}
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={async () => {
                            await refetchPlants();
                            toast({
                              title: "Plants Refreshed",
                              description: "Plant database has been updated with latest data and images.",
                            });
                          }}
                          disabled={plantsLoading}
                          className="gap-2"
                          data-testid="button-refresh-plants"
                        >
                          <RefreshCw className={`w-4 h-4 ${plantsLoading ? 'animate-spin' : ''}`} />
                          Refresh Plants
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>

                        {/* Plants Display */}
                        {isSearching ? (
                          <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-8 h-8 animate-spin text-primary" />
                            <span className="ml-2 text-muted-foreground">Searching plants...</span>
                          </div>
                        ) : (!displayedPlants || displayedPlants.length === 0) ? (
                          <div className="text-center py-12">
                            <Leaf className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                            <h3 className="text-xl font-semibold mb-2">
                              {searchFilters ? 'No Matching Plants' : 'No Plants Yet'}
                            </h3>
                            <p className="text-muted-foreground mb-4">
                              {searchFilters 
                                ? 'Try adjusting your search criteria to find plants' 
                                : 'Start by importing plants from Perenual or adding them manually'}
                            </p>
                            <Button>
                              <Plus className="w-4 h-4 mr-2" />
                              Add Your First Plant
                            </Button>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {/* Render all plants once with their verification status shown on the card */}
                            {displayedPlants && displayedPlants.map((plant: any) => (
                              <CompactPlantCard
                                key={plant.id}
                                plant={plant}
                                isAdmin={true}
                                onVerify={plant.verificationStatus === 'pending' ? () => verifyPlantMutation.mutate(plant.id) : undefined}
                                onReject={plant.verificationStatus === 'pending' ? () => deletePlantMutation.mutate(plant.id) : undefined}
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
                          <Zap className="w-4 h-4 text-primary" />
                          Quick Actions
                        </h3>
                        
                        <div className="grid grid-cols-2 gap-3">
                          <Button
                            variant="outline"
                            className="h-auto flex flex-col items-center py-4 hover:bg-blue-50 hover:border-blue-300"
                            onClick={() => {
                              // Mark intentional navigation
                              sessionStorage.setItem('intentionalNavigation', 'true');
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
                <SecuritySettings />
              </TabsContent>


              <TabsContent value="image-gen" className="mt-8">
                <ImageGenerationMonitor />
              </TabsContent>
              
              <TabsContent value="image-test" className="mt-8">
                <ImageComparisonTool />
              </TabsContent>

              <TabsContent value="api-management" className="mt-8">
                <APIManagement />
              </TabsContent>

              {/* Icon Gallery */}
              <TabsContent value="icon-gallery" className="mt-8">
                <IconGalleryContent />
              </TabsContent>

            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
