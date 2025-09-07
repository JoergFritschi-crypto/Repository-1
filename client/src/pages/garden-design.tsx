import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import Navigation from "@/components/layout/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import GardenLayoutCanvas from "@/components/garden/garden-layout-canvas";
import PlantSearchModal from "@/components/plant/plant-search-modal";
import { PlantAdvancedSearch } from "@/components/admin/plant-advanced-search";
import { useAuth } from "@/hooks/useAuth";
import { AdminNavigation } from "@/components/admin/admin-navigation";
import { 
  Save, 
  Download, 
  RefreshCw, 
  Settings, 
  Leaf,
  Eye
} from "lucide-react";

export default function GardenDesign() {
  const { id } = useParams<{ id: string }>();
  const [location] = useLocation();
  const [viewMode, setViewMode] = useState("canvas");
  const [showPlantSearch, setShowPlantSearch] = useState(false);
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [inventoryPlants, setInventoryPlants] = useState<any[]>([]);
  const [searchFilters, setSearchFilters] = useState<any>({});
  const { toast } = useToast();
  const { user } = useAuth();
  
  // Check if we came from admin
  const isFromAdmin = sessionStorage.getItem('navigationSource') === 'admin';

  const { data: garden, isLoading: gardenLoading } = useQuery({
    queryKey: ["/api/gardens", id],
    enabled: !!id,
  });

  const { data: gardenPlants } = useQuery({
    queryKey: ["/api/gardens", id, "plants"],
    enabled: !!id,
  });

  const { data: myCollection } = useQuery({
    queryKey: ["/api/my-collection"],
    enabled: user?.userTier === 'premium',
  });

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
              onClick={() => saveDesignMutation.mutate({ status: 'completed' })}
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
                <TabsTrigger value="3d" data-testid="tab-3d-view">3D View</TabsTrigger>
                <TabsTrigger value="plants" data-testid="tab-plant-list">Plant List</TabsTrigger>
              </TabsList>
            </div>
            
            {/* Canvas View - Main Feature */}
            <TabsContent value="canvas" className="mt-0">
              <GardenLayoutCanvas
                shape={garden.shape}
                dimensions={garden.dimensions}
                units={garden.units}
                gardenId={garden.id}
                aiDesign={garden.layout_data}
                onOpenPlantSearch={() => setShowPlantSearch(true)}
              />
            </TabsContent>

            {/* Advanced Plant Search */}
            <TabsContent value="advanced-search" className="mt-0">
              <div className="space-y-4">
                <PlantAdvancedSearch 
                  onSearch={(filters) => {
                    console.log('Advanced search filters:', filters);
                    setSearchFilters(filters);
                    // TODO: Implement actual search with these filters
                    toast({
                      title: "Search Applied",
                      description: `Searching with ${Object.keys(filters).length} active filters`,
                    });
                  }}
                  totalResults={0}
                />
                
                {/* Search Results */}
                <Card className="border-2 border-gray-200">
                  <CardHeader>
                    <CardTitle>Search Results</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-8 text-muted-foreground">
                      <p>Use the advanced search above to find plants</p>
                      <p className="text-sm mt-2">Results will appear here</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
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
        open={showPlantSearch}
        onClose={() => setShowPlantSearch(false)}
        onAddPlants={handleAddPlantsToInventory}
        userTier={user?.userTier || 'free'}
        existingCollection={myCollection || []}
      />
    </div>
  );
}