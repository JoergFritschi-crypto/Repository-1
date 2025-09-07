import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { GardenVisualization } from "@/components/garden/garden-visualization";
import { AdminNavigation } from "@/components/admin/admin-navigation";
import { ArrowLeft, FlaskConical } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export default function AdminTestVisualization() {
  const { user } = useAuth();
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const [selectedGardenId, setSelectedGardenId] = useState<string>("1");
  const [testingTier, setTestingTier] = useState<'free' | 'pay_per_design' | 'premium'>('premium');
  
  // Get Test Garden 1
  const { data: garden, isLoading: gardenLoading } = useQuery({
    queryKey: ["/api/gardens", selectedGardenId],
    enabled: !!selectedGardenId,
  });
  
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
                    variant={selectedGardenId === "2" ? "default" : "outline"}
                    onClick={() => setSelectedGardenId("2")}
                    disabled={gardenLoading}
                  >
                    Test Garden 2
                  </Button>
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium mb-2 block">Test as Tier</label>
                <div className="flex gap-2">
                  <Button
                    variant={testingTier === 'free' ? "default" : "outline"}
                    onClick={() => setTestingTier('free')}
                  >
                    <Badge variant="secondary" className="mr-2">Free</Badge>
                    Up to 2 images, 3 iterations
                  </Button>
                  <Button
                    variant={testingTier === 'pay_per_design' ? "default" : "outline"}
                    onClick={() => setTestingTier('pay_per_design')}
                  >
                    <Badge className="mr-2 bg-blue-500">Tier 2</Badge>
                    Up to 6 images, unlimited
                  </Button>
                  <Button
                    variant={testingTier === 'premium' ? "default" : "outline"}
                    onClick={() => {
                      console.log('Premium button clicked, setting tier to premium');
                      setTestingTier('premium');
                    }}
                  >
                    <Badge className="mr-2 bg-purple-500">Premium</Badge>
                    Up to 6 images, unlimited
                  </Button>
                </div>
              </div>
              
              {garden && (
                <div className="space-y-3">
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-sm">
                      <strong>Garden:</strong> {garden.name} | 
                      <strong> Plants:</strong> {garden.canvasDesign?.plants?.length || garden.layout_data?.plants?.length || 0} | 
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
        {console.log('Current testingTier state:', testingTier)}
        {garden ? (
          <GardenVisualization 
            key={`${selectedGardenId}-${testingTier}`}
            gardenId={selectedGardenId}
            userTier={testingTier}
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
              <li>Free tier: Limited to up to 2 images and 3 iterations</li>
              <li>Paid tiers: Up to 6 images with unlimited iterations</li>
              <li>Images are evenly distributed across the selected time period</li>
              <li>Saved images persist in the garden's metadata</li>
              <li>Progress bar shows real-time generation status</li>
              <li>Full-screen viewer includes YouTube-style controls</li>
              <li>Keyboard shortcuts: Arrow keys, Space (play/pause), F (fullscreen)</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}