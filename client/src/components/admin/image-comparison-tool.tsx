import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, RefreshCw, Download, Sparkles } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface TestImage {
  id: string;
  plantName: string;
  imageType: 'thumbnail' | 'full' | 'detail';
  approach: 'garden' | 'atlas' | 'hybrid';
  model: 'schnell' | 'dev' | 'sdxl';
  url: string;
  timestamp: string;
  fileSize?: string;
}

export function ImageComparisonTool() {
  const [images, setImages] = useState<TestImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selectedPlant, setSelectedPlant] = useState<string>("all");
  const [selectedType, setSelectedType] = useState<string>("all");
  const { toast } = useToast();
  
  const plants = ["Japanese Maple", "English Lavender", "Hosta"];
  const approaches = ["garden", "atlas", "hybrid"];
  const models = ["schnell"];
  const imageTypes = ["full", "detail"];
  
  // Load existing images
  const loadImages = async () => {
    setLoading(true);
    try {
      const response = await apiRequest('GET', '/api/admin/test-images');
      const data = await response.json();
      setImages(data.images || []);
    } catch (error) {
      console.error('Failed to load test images:', error);
      setImages([]);
    }
    setLoading(false);
  };
  
  useEffect(() => {
    loadImages();
  }, []);
  
  // Generate test images for comparison
  const generateTestImages = async () => {
    setGenerating(true);
    const results = [];
    
    for (const plant of plants) {
      for (const approach of approaches) {
        for (const imageType of imageTypes) {
          // Only test with schnell for now (faster)
          try {
            toast({
              title: "Generating",
              description: `${plant} - ${approach} - ${imageType}`,
            });
            
            const response = await apiRequest('POST', '/api/admin/test-generation', {
              plantName: plant,
              approach: approach,
              modelChoice: 'schnell',
              imageType: imageType
            });
            
            const data = await response.json();
            if (data.result) {
              results.push(data.result);
            }
          } catch (error) {
            console.error(`Failed: ${plant} ${approach} ${imageType}`, error);
          }
        }
      }
    }
    
    toast({
      title: "Generation Complete",
      description: `Generated ${results.length} test images`,
    });
    
    setGenerating(false);
    loadImages();
  };
  
  // Filter images
  const filteredImages = images.filter(img => {
    if (selectedPlant !== "all" && img.plantName !== selectedPlant) return false;
    if (selectedType !== "all" && img.imageType !== selectedType) return false;
    return true;
  });
  
  // Group images by plant
  const groupedImages = plants.reduce((acc, plant) => {
    acc[plant] = filteredImages.filter(img => img.plantName === plant);
    return acc;
  }, {} as Record<string, TestImage[]>);
  
  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Image Quality Comparison Tool</span>
            <div className="flex gap-2">
              <Button 
                onClick={loadImages} 
                variant="outline" 
                size="sm"
                disabled={loading}
              >
                <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button
                onClick={generateTestImages}
                disabled={generating}
                size="sm"
              >
                {generating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-1" />
                    Generate Test Set
                  </>
                )}
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Select value={selectedPlant} onValueChange={setSelectedPlant}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by plant" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Plants</SelectItem>
                {plants.map(plant => (
                  <SelectItem key={plant} value={plant}>{plant}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="full">Full View</SelectItem>
                <SelectItem value="detail">Detail View</SelectItem>
                <SelectItem value="thumbnail">Thumbnail</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="mt-4 text-sm text-muted-foreground">
            Comparing {filteredImages.length} images across {Object.keys(groupedImages).length} plants
          </div>
        </CardContent>
      </Card>
      
      {/* Image Comparison Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      ) : (
        <Tabs defaultValue={plants[0]} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            {plants.map(plant => (
              <TabsTrigger key={plant} value={plant}>
                {plant} ({groupedImages[plant]?.length || 0})
              </TabsTrigger>
            ))}
          </TabsList>
          
          {plants.map(plant => (
            <TabsContent key={plant} value={plant} className="space-y-6">
              {/* Full View Images */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Full View Comparison</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {approaches.map(approach => {
                    const img = groupedImages[plant]?.find(
                      i => i.imageType === 'full' && i.approach === approach
                    );
                    return (
                      <Card key={approach} className="overflow-hidden">
                        <CardHeader className="pb-2">
                          <div className="flex justify-between items-start">
                            <div>
                              <Badge variant="outline" className="mb-1">
                                {approach}
                              </Badge>
                              <p className="text-xs text-muted-foreground">
                                Model: {img?.model || 'schnell'}
                              </p>
                            </div>
                            {img && (
                              <Button size="sm" variant="ghost" asChild>
                                <a href={img.url} download>
                                  <Download className="w-4 h-4" />
                                </a>
                              </Button>
                            )}
                          </div>
                        </CardHeader>
                        <CardContent className="p-2">
                          {img ? (
                            <div>
                              <img 
                                src={img.url} 
                                alt={`${plant} - ${approach}`}
                                className="w-full h-64 object-cover rounded"
                              />
                              <p className="text-xs text-muted-foreground mt-2 text-center">
                                {new Date(img.timestamp).toLocaleString()}
                              </p>
                            </div>
                          ) : (
                            <div className="w-full h-64 bg-muted rounded flex items-center justify-center">
                              <p className="text-sm text-muted-foreground">Not generated</p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
              
              {/* Detail View Images */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Detail View Comparison</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {approaches.map(approach => {
                    const img = groupedImages[plant]?.find(
                      i => i.imageType === 'detail' && i.approach === approach
                    );
                    return (
                      <Card key={approach} className="overflow-hidden">
                        <CardHeader className="pb-2">
                          <div className="flex justify-between items-start">
                            <div>
                              <Badge variant="outline" className="mb-1">
                                {approach}
                              </Badge>
                              <p className="text-xs text-muted-foreground">
                                Model: {img?.model || 'schnell'}
                              </p>
                            </div>
                            {img && (
                              <Button size="sm" variant="ghost" asChild>
                                <a href={img.url} download>
                                  <Download className="w-4 h-4" />
                                </a>
                              </Button>
                            )}
                          </div>
                        </CardHeader>
                        <CardContent className="p-2">
                          {img ? (
                            <div>
                              <img 
                                src={img.url} 
                                alt={`${plant} - ${approach}`}
                                className="w-full h-64 object-cover rounded"
                              />
                              <p className="text-xs text-muted-foreground mt-2 text-center">
                                {new Date(img.timestamp).toLocaleString()}
                              </p>
                            </div>
                          ) : (
                            <div className="w-full h-64 bg-muted rounded flex items-center justify-center">
                              <p className="text-sm text-muted-foreground">Not generated</p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      )}
      
      {/* Approach Descriptions */}
      <Card>
        <CardHeader>
          <CardTitle>Approach Descriptions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div>
            <Badge className="mb-1">Garden</Badge>
            <p className="text-sm text-muted-foreground">
              Natural garden setting with other plants visible, outdoor environment, no white background
            </p>
          </div>
          <div>
            <Badge className="mb-1">Atlas</Badge>
            <p className="text-sm text-muted-foreground">
              Scientific botanical specimen on white background, educational reference style (Linné-style)
            </p>
          </div>
          <div>
            <Badge className="mb-1">Hybrid</Badge>
            <p className="text-sm text-muted-foreground">
              Semi-isolated specimen with soft natural background, botanical garden style
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}