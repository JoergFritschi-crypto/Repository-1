import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import Navigation from "@/components/layout/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import GardenLayoutCanvas, { type PlacedPlant } from "@/components/garden/garden-layout-canvas";
import PlantSearchModal from "@/components/plant/plant-search-modal";
import { PlantAdvancedSearch } from "@/components/admin/plant-advanced-search";
import { GardenVisualization } from "@/components/garden/garden-visualization";
import { useAuth } from "@/hooks/useAuth";
import { AdminNavigation } from "@/components/admin/admin-navigation";
import type { Garden } from "@/types/garden";
import type { Plant } from "@/types/plant";
import { 
  Save, 
  Download, 
  RefreshCw, 
  Settings, 
  Leaf,
  Eye,
  FolderOpen
} from "lucide-react";

export default function GardenDesign() {
  const { id } = useParams<{ id: string }>();
  const [location, setLocation] = useLocation();
  const [viewMode, setViewMode] = useState("canvas");
  const [showPlantSearch, setShowPlantSearch] = useState(false);
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [inventoryPlants, setInventoryPlants] = useState<any[]>([]);
  const [searchFilters, setSearchFilters] = useState<any>({});
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showLoadDesignDialog, setShowLoadDesignDialog] = useState(false);
  const [canvasPlacedPlants, setCanvasPlacedPlants] = useState<PlacedPlant[]>([]);
  const { toast } = useToast();
  const { user } = useAuth();
  
  // Check if we're admin or came from admin
  const isFromAdmin = sessionStorage.getItem('navigationSource') === 'admin';
  const isAdmin = user?.isAdmin === true;
  
  // Check if this is a page refresh (no navigation intent)
  useEffect(() => {
    const navigationSource = sessionStorage.getItem('navigationSource');
    const intentionalNav = sessionStorage.getItem('intentionalNavigation');
    
    // Clear the flags immediately to prevent them persisting
    sessionStorage.removeItem('intentionalNavigation');
    
    // If neither flag is set, this is a refresh - redirect to landing
    if (!navigationSource && !intentionalNav) {
      // Use replace to prevent back button issues
      window.location.replace('/');
    }
  }, []);

  const { data: garden, isLoading: gardenLoading } = useQuery<Garden>({
    queryKey: ["/api/gardens", id],
    enabled: !!id,
  });

  const { data: gardenPlants } = useQuery<any[]>({
    queryKey: ["/api/gardens", id, "plants"],
    enabled: !!id,
  });

  const { data: myCollection } = useQuery<any[]>({
    queryKey: ["/api/my-collection"],
    enabled: user?.userTier === 'premium',
  });

  // Fetch all gardens for the load design dialog
  const { data: allGardens, isLoading: gardensLoading } = useQuery<Garden[]>({
    queryKey: ["/api/gardens"],
    enabled: showLoadDesignDialog,
  });

  const handleAddPlantToInventory = (plant: any) => {
    // Add to inventory plants state that will be passed to canvas
    setInventoryPlants(prev => [...prev, plant]);
    toast({
      title: "Plant Added",
      description: `${plant.commonName} added to inventory`,
    });
  };

  const handleAddPlantsToInventory = (plants: any[]) => {
    setInventoryPlants(prev => [...prev, ...plants]);
    toast({
      title: "Plants Added",
      description: `Added ${plants.length} plant${plants.length !== 1 ? 's' : ''} to your inventory`,
    });
  };

  const saveDesignMutation = useMutation({
    mutationFn: async (designData: any) => {
      const response = await apiRequest("PUT", `/api/gardens/${id}`, designData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Design Saved",
        description: "Your garden design has been saved successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/gardens", id] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const generateAIDesignMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/gardens/${id}/generate-ai-design`);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "AI Design Generated",
        description: "Your AI-powered garden design is ready!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/gardens", id] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (gardenLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="flex items-center justify-center h-96">
          <p>Loading garden design...</p>
        </div>
      </div>
    );
  }

  if (!garden) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="flex items-center justify-center h-96">
          <p>Garden not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="container mx-auto px-4 py-6">
        {/* Admin Testing Controls */}
        {isAdmin && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-yellow-800 dark:text-yellow-200">
                Admin Testing Mode
              </h3>
              <Badge variant="outline" className="bg-yellow-100 dark:bg-yellow-900/40">
                Garden ID: {id || 'None'}
              </Badge>
            </div>
            <p className="text-xs text-yellow-700 dark:text-yellow-300 mb-3">
              Testing environment with admin privileges. Load any saved design for testing.
            </p>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setShowLoadDesignDialog(true)}
              className="text-xs bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/40 dark:hover:bg-blue-900/60"
            >
              <FolderOpen className="w-4 h-4 mr-2" />
              Load Design
            </Button>
          </div>
        )}

        {/* Show admin navigation if accessed from admin */}
        {isFromAdmin && (
          <AdminNavigation gardenId={id} />
        )}
        {/* Garden Header */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-3xl font-serif font-bold text-foreground mb-2" data-testid="text-garden-name">
              {garden.name}
            </h1>
            <p className="text-lg text-muted-foreground" data-testid="text-garden-location">
              {garden.location} • {garden.shape} • {garden.units === 'metric' ? 'Metric' : 'Imperial'}
            </p>
            <div className="flex items-center space-x-2 mt-2">
              <Badge variant={garden.status === 'completed' ? 'default' : 'secondary'} data-testid="badge-garden-status">
                {garden.status}
              </Badge>
              {garden.ai_generated && (
                <Badge variant="outline" className="border-accent text-accent" data-testid="badge-ai-generated">
                  AI Generated
                </Badge>
              )}
            </div>
          </div>

          <div className="flex space-x-2">
            <Button
              variant="outline"
              onClick={() => generateAIDesignMutation.mutate()}
              disabled={generateAIDesignMutation.isPending}
              data-testid="button-regenerate-ai"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              {generateAIDesignMutation.isPending ? "Generating..." : "Regenerate AI"}
            </Button>
            <Button
              onClick={() => saveDesignMutation.mutate({ 
                status: 'completed',
                layout_data: {
                  plantPlacements: canvasPlacedPlants
                }
              })}
              disabled={saveDesignMutation.isPending}
              data-testid="button-save-design"
            >
              <Save className="w-4 h-4 mr-2" />
              Save Design
            </Button>
          </div>
        </div>

        {/* Main Design Area - Full Width */}
        <div className="w-full">
          <Tabs value={viewMode} onValueChange={setViewMode} className="w-full">
            <div className="flex justify-between items-center mb-4">
              <TabsList data-testid="tabs-view-mode">
                <TabsTrigger value="canvas" data-testid="tab-canvas">Garden Canvas</TabsTrigger>
                <TabsTrigger value="advanced-search" data-testid="tab-advanced-search">Advanced Plant Search</TabsTrigger>
                <TabsTrigger value="visualization" data-testid="tab-visualization">Seasonal View</TabsTrigger>
                <TabsTrigger value="3d" data-testid="tab-3d-view">3D View</TabsTrigger>
                <TabsTrigger value="plants" data-testid="tab-plant-list">Plant List</TabsTrigger>
              </TabsList>
            </div>
            
            {/* Canvas View - Main Feature */}
            <TabsContent value="canvas" className="mt-0">
              <GardenLayoutCanvas
                shape={garden.shape}
                dimensions={garden.dimensions as Record<string, number>}
                units={garden.units}
                gardenId={garden.id}
                gardenName={garden.name}
                aiDesign={garden.layout_data}
                gardenPlants={gardenPlants || []}
                inventoryPlants={inventoryPlants}
                onOpenPlantSearch={() => setViewMode('advanced-search')}
                onPlacedPlantsChange={setCanvasPlacedPlants}
              />
            </TabsContent>

            {/* Advanced Plant Search */}
            <TabsContent value="advanced-search" className="mt-0">
              <div className="space-y-4">
                <PlantAdvancedSearch 
                  onSearch={async (filters) => {
                    console.log('Advanced search filters:', filters);
                    setSearchFilters(filters);
                    setIsSearching(true);
                    
                    try {
                      // Build query parameters from filters
                      const queryParams = new URLSearchParams();
                      Object.entries(filters).forEach(([key, value]) => {
                        if (Array.isArray(value)) {
                          value.forEach(v => queryParams.append(key, v));
                        } else if (value !== null && value !== undefined && value !== '') {
                          queryParams.append(key, String(value));
                        }
                      });
                      
                      const response = await apiRequest('GET', `/api/plants/advanced-search?${queryParams}`);
                      const results = await response.json();
                      setSearchResults(results);
                      
                      toast({
                        title: "Search Complete",
                        description: `Found ${results.length} matching plants`,
                      });
                    } catch (error) {
                      console.error('Search error:', error);
                      toast({
                        title: "Search Error",
                        description: "Failed to search plants",
                        variant: "destructive",
                      });
                    } finally {
                      setIsSearching(false);
                    }
                  }}
                  totalResults={searchResults.length}
                />
                
                {/* Search Results */}
                <Card className="border-2 border-gray-200">
                  <CardHeader>
                    <CardTitle>
                      Search Results 
                      {searchResults.length > 0 && (
                        <span className="text-sm font-normal text-muted-foreground ml-2">
                          ({searchResults.length} result{searchResults.length !== 1 ? 's' : ''})
                        </span>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {isSearching ? (
                      <div className="text-center py-8">
                        <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-muted-foreground" />
                        <p className="text-muted-foreground">Searching...</p>
                      </div>
                    ) : searchResults.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {searchResults.map((plant: any) => (
                          <div key={plant.id} className="border rounded-lg p-4 hover:shadow-lg transition-shadow">
                            <div className="mb-3">
                              <h4 className="font-medium text-lg italic">{plant.scientificName}</h4>
                              <p className="text-sm text-muted-foreground">{plant.commonName || 'No common name'}</p>
                            </div>
                            
                            <div className="space-y-1 text-sm mb-4">
                              {plant.plantType && (
                                <p><span className="font-medium">Type:</span> {plant.plantType}</p>
                              )}
                              {plant.height && (
                                <p><span className="font-medium">Height:</span> {plant.height}cm</p>
                              )}
                              {plant.spread && (
                                <p><span className="font-medium">Spread:</span> {plant.spread}cm</p>
                              )}
                              {plant.flowerColor && (
                                <p><span className="font-medium">Flower:</span> {plant.flowerColor}</p>
                              )}
                            </div>
                            
                            <Button 
                              className="w-full"
                              onClick={() => handleAddPlantToInventory(plant)}
                              data-testid={`button-add-plant-${plant.id}`}
                            >
                              <Leaf className="w-4 h-4 mr-2" />
                              Add to Inventory
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <p>Use the advanced search above to find plants</p>
                        <p className="text-sm mt-2">Results will appear here</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Seasonal Visualization */}
            <TabsContent value="visualization" className="mt-0">
              <GardenVisualization 
                gardenId={id || ''}
                onReturn={() => setViewMode('canvas')}
              />
            </TabsContent>

            {/* 3D View - Premium Feature */}
            <TabsContent value="3d" className="mt-0">
              <Card className="border-2 border-gray-200">
                <div className="relative bg-gradient-to-b from-blue-100 to-green-100 rounded-lg h-[600px] overflow-hidden" data-testid="3d-visualization">
                  <div className="absolute inset-0 bg-primary/10 flex items-center justify-center">
                    <div className="text-center">
                      <Eye className="w-16 h-16 text-primary mx-auto mb-4" />
                      <h3 className="text-xl font-semibold mb-2">3D Visualization</h3>
                      <p className="text-muted-foreground mb-4">
                        Experience your garden design in photorealistic 3D
                      </p>
                      <Badge className="bg-yellow-400 text-black">Premium Feature</Badge>
                    </div>
                  </div>
                </div>
              </Card>
            </TabsContent>

            {/* Plant List View */}
            <TabsContent value="plants" className="mt-0">
              <Card className="border-2 border-gray-200">
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle>Plants in This Garden</CardTitle>
                    <Button variant="outline" size="sm" data-testid="button-export-plant-list">
                      <Download className="w-4 h-4 mr-2" />
                      Export List
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {gardenPlants && gardenPlants.length > 0 ? (
                    <div className="space-y-3">
                      {gardenPlants.map((gardenPlant: any) => (
                        <div key={gardenPlant.id} className="flex items-center justify-between p-4 border border-border rounded-lg" data-testid={`garden-plant-${gardenPlant.id}`}>
                          <div className="flex items-center space-x-4">
                            <div className="w-12 h-12 bg-accent rounded-lg flex-shrink-0"></div>
                            <div>
                              <h4 className="font-medium">{gardenPlant.plant?.commonName}</h4>
                              <p className="text-sm text-muted-foreground italic">{gardenPlant.plant?.scientificName}</p>
                              <p className="text-sm text-muted-foreground">
                                Quantity: {gardenPlant.quantity} • Position: ({gardenPlant.position_x}, {gardenPlant.position_y})
                              </p>
                            </div>
                          </div>
                          <div className="flex space-x-2">
                            <Button size="sm" variant="outline" data-testid={`button-edit-plant-${gardenPlant.id}`}>
                              <Settings className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="outline" data-testid={`button-remove-plant-${gardenPlant.id}`}>
                              ×
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8" data-testid="empty-plant-list">
                      <Leaf className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="font-medium mb-2">No plants added yet</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Start by searching and adding plants to your inventory
                      </p>
                      <Button onClick={() => setShowPlantSearch(true)} data-testid="button-add-first-plant">
                        Add Your First Plant
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Plant Search Modal */}
      <PlantSearchModal
        isOpen={showPlantSearch}
        onClose={() => setShowPlantSearch(false)}
        onSelectPlant={handleAddPlantToInventory}
        userTier={user?.userTier || 'free'}
      />

      {/* Load Design Dialog */}
      <Dialog open={showLoadDesignDialog} onOpenChange={setShowLoadDesignDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Load Garden Design</DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            {gardensLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-2"></div>
                <p className="text-sm text-muted-foreground">Loading gardens...</p>
              </div>
            ) : allGardens && allGardens.length > 0 ? (
              <div className="space-y-2">
                {allGardens.map((garden: any) => (
                  <div 
                    key={garden.id} 
                    className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-accent/10 cursor-pointer transition-colors"
                    onClick={() => {
                      setShowLoadDesignDialog(false);
                      // Navigate to the new garden design
                      window.history.pushState({}, '', `/garden-design/${garden.id}`);
                      window.location.reload();
                    }}
                  >
                    <div>
                      <h3 className="font-medium">{garden.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {garden.location} • {garden.shape} • Created {new Date(garden.createdAt).toLocaleDateString()}
                      </p>
                      <div className="flex items-center space-x-2 mt-1">
                        <Badge variant={garden.status === 'completed' ? 'default' : 'secondary'}>
                          {garden.status}
                        </Badge>
                        {garden.ai_generated && (
                          <Badge variant="outline" className="border-accent text-accent">
                            AI Generated
                          </Badge>
                        )}
                      </div>
                    </div>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowLoadDesignDialog(false);
                        // Navigate to the new garden design
                        window.history.pushState({}, '', `/garden-design/${garden.id}`);
                        window.location.reload();
                      }}
                    >
                      Load
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground">No saved gardens found</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}