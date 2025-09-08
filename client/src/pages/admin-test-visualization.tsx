import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { GardenVisualization } from "@/components/garden/garden-visualization";
import { AdminNavigation } from "@/components/admin/admin-navigation";
import { ArrowLeft, FlaskConical, Plus } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export default function AdminTestVisualization() {
  const { user } = useAuth();
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const [selectedGardenId, setSelectedGardenId] = useState<string>("1");
  const [isCreating, setIsCreating] = useState(false);
  
  // Get Test Garden 1
  const { data: garden, isLoading: gardenLoading } = useQuery({
    queryKey: ["/api/gardens", selectedGardenId],
    enabled: !!selectedGardenId,
  });
  
  // Create new test garden
  const createTestGarden = async () => {
    setIsCreating(true);
    try {
      const response = await apiRequest("POST", "/api/gardens", {
        name: `Test Garden ${new Date().getTime()}`,
        location: "Test Location",
        shape: "rectangle",
        dimensions: { width: 4, length: 3 },
        units: "metric",
        sunExposure: "full_sun",
        soilType: "loam",
        preferences: {},
        design_approach: "manual"
      });
      
      const newGarden = await response.json();
      
      toast({
        title: "Test Garden Created",
        description: `Garden ID: ${newGarden.id}. Redirecting to design page...`
      });
      
      // Redirect to garden design page with the new garden ID
      setTimeout(() => {
        window.location.href = `/garden-design/${newGarden.id}`;
      }, 1000);
      
    } catch (error) {
      console.error("Error creating test garden:", error);
      toast({
        title: "Error",
        description: "Failed to create test garden",
        variant: "destructive"
      });
    } finally {
      setIsCreating(false);
    }
  };
  
  
  return (
    <div className="min-h-screen bg-background">
      <AdminNavigation currentPage="Testing Tools" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <Button 
            variant="ghost" 
            onClick={() => setLocation("/admin")}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Admin
          </Button>
          
          <div className="flex items-center gap-3">
            <FlaskConical className="w-8 h-8 text-purple-600" />
            <div>
              <h1 className="text-3xl font-serif font-bold text-foreground">
                Visualization Testing
              </h1>
              <p className="text-muted-foreground">
                Test the seasonal visualization feature with different tier configurations
              </p>
            </div>
          </div>
        </div>
        
        {/* Tier Testing Controls */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Testing Configuration</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Test Garden</label>
                <div className="flex gap-2">
                  <Button
                    variant={selectedGardenId === "1" ? "default" : "outline"}
                    onClick={() => setSelectedGardenId("1")}
                    disabled={gardenLoading}
                  >
                    Test Garden 1
                  </Button>
                  <Button
                    variant={selectedGardenId === "0ed224de-6416-47d6-aafc-c166deb2d474" ? "default" : "outline"}
                    onClick={() => setSelectedGardenId("0ed224de-6416-47d6-aafc-c166deb2d474")}
                    disabled={gardenLoading}
                  >
                    Test Garden 2
                  </Button>
                  <Button
                    variant="outline"
                    onClick={createTestGarden}
                    disabled={isCreating}
                    className="flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    {isCreating ? "Creating..." : "Create New Test Garden"}
                  </Button>
                </div>
              </div>
              
              {garden && (
                <div className="space-y-3">
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-sm">
                      <strong>Garden:</strong> {garden.name} | 
                      <strong> Plants:</strong> {garden.canvasDesign?.plants?.length || garden.layout_data?.plantPlacements?.length || 0} | 
                      <strong> Shape:</strong> {garden.shape} | 
                      <strong> Size:</strong> {garden.dimensions?.width}x{garden.dimensions?.length} {garden.units}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        
        {/* Visualization Component */}
        {garden ? (
          <GardenVisualization 
            key={selectedGardenId}
            gardenId={selectedGardenId}
            onReturn={() => toast({
              title: "Return to Design",
              description: "This would return to the garden design in production"
            })}
          />
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">
                {gardenLoading ? "Loading garden..." : "Select a test garden to begin"}
              </p>
            </CardContent>
          </Card>
        )}
        
        {/* Testing Notes */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Testing Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>Admin testing has full premium access: Up to 6 images with unlimited iterations</li>
              <li>Images are evenly distributed across the selected time period</li>
              <li>Saved images persist in the garden's metadata</li>
              <li>Full-screen viewer includes YouTube-style controls</li>
              <li>Keyboard shortcuts: Arrow keys, Space (play/pause), F (fullscreen)</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}