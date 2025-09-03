import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import Navigation from "@/components/layout/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import InteractiveCanvas from "@/components/garden/interactive-canvas";
import { 
  Palette, 
  Eye, 
  Save, 
  Download, 
  RefreshCw, 
  Settings, 
  Leaf,
  Calendar,
  BarChart3,
  Crown
} from "lucide-react";

interface GardenDesignProps {
  id?: string;
}

export default function GardenDesign() {
  const { id } = useParams<{ id: string }>();
  const [selectedSeason, setSelectedSeason] = useState("spring");
  const [viewMode, setViewMode] = useState("2d");
  const { toast } = useToast();

  const { data: garden, isLoading: gardenLoading } = useQuery({
    queryKey: ["/api/gardens", id],
    enabled: !!id,
  });

  const { data: gardenPlants } = useQuery({
    queryKey: ["/api/gardens", id, "plants"],
    enabled: !!id,
  });

  const { data: suggestedPlants } = useQuery({
    queryKey: ["/api/plants/search"],
    queryFn: async () => {
      const response = await fetch("/api/plants/search?limit=10");
      return response.json();
    },
  });

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
    onSuccess: () => {
      toast({
        title: "AI Design Generated",
        description: "A new AI design has been generated for your garden!",
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
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" aria-label="Loading"/>
        </div>
      </div>
    );
  }

  if (!garden) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card>
            <CardContent className="pt-6 text-center">
              <h2 className="text-xl font-semibold mb-2">Garden Not Found</h2>
              <p className="text-muted-foreground">The garden you're looking for doesn't exist or you don't have access to it.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex justify-between items-start mb-8">
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

        <div className="grid lg:grid-cols-4 gap-8">
          {/* Sidebar - Design Controls */}
          <div className="lg:col-span-1 space-y-6">
            {/* Plant Suggestions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Leaf className="w-5 h-5 mr-2 text-accent" />
                  Suggested Plants
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {suggestedPlants?.slice(0, 5).map((plant: any) => (
                    <div key={plant.id} className="flex items-center space-x-3 p-2 hover:bg-muted rounded cursor-pointer" data-testid={`plant-suggestion-${plant.id}`}>
                      <div className="w-8 h-8 bg-accent rounded-full flex-shrink-0"></div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{plant.commonName}</p>
                        <p className="text-xs text-muted-foreground italic">{plant.scientificName}</p>
                      </div>
                      <Button size="sm" variant="ghost" data-testid={`button-add-plant-${plant.id}`}>
                        +
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Season Preview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Calendar className="w-5 h-5 mr-2 text-secondary" />
                  Season Preview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2">
                  {['spring', 'summer', 'autumn', 'winter'].map((season) => (
                    <Button
                      key={season}
                      variant={selectedSeason === season ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSelectedSeason(season)}
                      className="capitalize"
                      data-testid={`button-season-${season}`}
                    >
                      {season}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Design Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart3 className="w-5 h-5 mr-2 text-primary" />
                  Design Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Plant Species:</span>
                    <span className="font-medium" data-testid="text-plant-count">{gardenPlants?.length || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Garden Beds:</span>
                    <span className="font-medium" data-testid="text-bed-count">3</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Year-round Interest:</span>
                    <span className="font-medium text-accent" data-testid="text-year-round-interest">85%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Maintenance Level:</span>
                    <span className="font-medium" data-testid="text-maintenance-level">Medium</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Premium Upgrade */}
            <Card className="border-canary bg-canary/5">
              <CardContent className="pt-6">
                <div className="text-center">
                  <Crown className="w-8 h-8 text-canary mx-auto mb-2" />
                  <h3 className="font-semibold mb-2">Premium Features</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Unlock advanced 3D visualization and export tools
                  </p>
                  <Button className="w-full bg-canary text-primary hover:bg-gold" data-testid="button-upgrade-premium">
                    Upgrade Now
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Design Area */}
          <div className="lg:col-span-3">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Garden Design</CardTitle>
                  <Tabs value={viewMode} onValueChange={setViewMode}>
                    <TabsList data-testid="tabs-view-mode">
                      <TabsTrigger value="2d" data-testid="tab-2d-view">2D Layout</TabsTrigger>
                      <TabsTrigger value="3d" data-testid="tab-3d-view">3D View</TabsTrigger>
                      <TabsTrigger value="plants" data-testid="tab-plant-list">Plant List</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
              </CardHeader>
              <CardContent>
                <Tabs value={viewMode} className="w-full">
                  <TabsContent value="2d" className="mt-0">
                    <InteractiveCanvas
                      shape={garden.shape}
                      dimensions={garden.dimensions}
                      units={garden.units}
                      gardenId={garden.id}
                    />
                  </TabsContent>

                  <TabsContent value="3d" className="mt-0">
                    <div className="relative bg-gradient-to-b from-blue-100 to-green-100 rounded-lg h-96 overflow-hidden" data-testid="3d-visualization">
                      {/* Mock 3D view - in production this would be actual 3D rendering */}
                      <div className="absolute inset-0 bg-primary/10 flex items-center justify-center">
                        <div className="text-center">
                          <Eye className="w-16 h-16 text-primary mx-auto mb-4" />
                          <h3 className="text-xl font-semibold mb-2">3D Visualization</h3>
                          <p className="text-muted-foreground mb-4">
                            Experience your garden design in photorealistic 3D
                          </p>
                          <Badge className="bg-canary text-primary">Premium Feature</Badge>
                        </div>
                      </div>

                      {/* 3D Controls */}
                      <div className="absolute top-4 right-4 space-y-2">
                        <Button size="sm" variant="secondary" data-testid="button-3d-fullscreen">
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="secondary" data-testid="button-3d-rotate">
                          <RefreshCw className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="secondary" data-testid="button-3d-download">
                          <Download className="w-4 h-4" />
                        </Button>
                      </div>

                      {/* Viewing Angle Controls */}
                      <div className="absolute bottom-4 left-4">
                        <div className="bg-background/90 rounded-lg p-2">
                          <p className="text-sm font-medium mb-2">View Angle</p>
                          <div className="flex space-x-2">
                            <Button size="sm" variant="default" data-testid="button-aerial-view">Aerial</Button>
                            <Button size="sm" variant="outline" data-testid="button-eye-level-view">Eye Level</Button>
                            <Button size="sm" variant="outline" data-testid="button-ground-view">Ground</Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="plants" className="mt-0">
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <h3 className="text-lg font-semibold" data-testid="text-plant-list-title">Plants in This Garden</h3>
                        <Button variant="outline" size="sm" data-testid="button-export-plant-list">
                          <Download className="w-4 h-4 mr-2" />
                          Export List
                        </Button>
                      </div>
                      
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
                            Start by dragging plants from the suggestions or use AI generation
                          </p>
                          <Button data-testid="button-add-first-plant">Add Your First Plant</Button>
                        </div>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-4 mt-6">
              <Button className="bg-canary text-primary hover:bg-gold" data-testid="button-save-and-export">
                <Save className="w-4 h-4 mr-2" />
                Save & Export Blueprint
              </Button>
              <Button variant="secondary" data-testid="button-share-design">
                Share Design
              </Button>
              <Button variant="outline" data-testid="button-duplicate-design">
                Duplicate Design
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
