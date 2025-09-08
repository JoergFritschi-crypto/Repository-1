import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, Leaf, Download } from "lucide-react";
import Navigation from "@/components/layout/navigation";

export default function AdminSpriteTest() {
  const { toast } = useToast();
  const [plantName, setPlantName] = useState("Japanese Maple");
  const [season, setSeason] = useState("summer");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedSprite, setGeneratedSprite] = useState<string | null>(null);
  const [isCompositing, setIsCompositing] = useState(false);
  const [compositeImage, setCompositeImage] = useState<string | null>(null);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [enhancedImage, setEnhancedImage] = useState<string | null>(null);
  
  const handleGenerateSprite = async () => {
    if (!plantName) {
      toast({
        title: "Error",
        description: "Please enter a plant name",
        variant: "destructive"
      });
      return;
    }
    
    setIsGenerating(true);
    try {
      const response = await apiRequest("POST", "/api/test/generate-sprite", {
        plantName,
        season
      });
      
      const data = await response.json();
      
      if (data.success && data.spriteUrl) {
        setGeneratedSprite(data.spriteUrl);
        toast({
          title: "Success",
          description: "Sprite generated successfully!"
        });
      } else {
        throw new Error(data.message || "Failed to generate sprite");
      }
    } catch (error) {
      console.error("Sprite generation error:", error);
      toast({
        title: "Generation Failed",
        description: (error as Error).message,
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };
  
  const handleDownload = () => {
    if (generatedSprite) {
      const link = document.createElement('a');
      link.href = generatedSprite;
      link.download = `sprite-${plantName.toLowerCase().replace(/\s+/g, '-')}-${season}.png`;
      link.click();
    }
  };
  
  const handleTestComposite = async () => {
    setIsCompositing(true);
    try {
      const response = await apiRequest("POST", "/api/test/composite-garden", {});
      const data = await response.json();
      
      if (data.success && data.compositeUrl) {
        setCompositeImage(data.compositeUrl);
        toast({
          title: "Success",
          description: "Composite garden created!"
        });
      } else {
        throw new Error(data.message || "Failed to create composite");
      }
    } catch (error) {
      console.error("Composite error:", error);
      toast({
        title: "Composite Failed",
        description: (error as Error).message,
        variant: "destructive"
      });
    } finally {
      setIsCompositing(false);
    }
  };
  
  const handleTestGeminiEnhance = async () => {
    setIsEnhancing(true);
    setEnhancedImage(null);
    try {
      const response = await apiRequest("POST", "/api/test/gemini-enhance-composite", {});
      const data = await response.json();
      
      if (data.success && data.enhancedUrl) {
        setCompositeImage(data.templateUrl);
        setEnhancedImage(data.enhancedUrl);
        toast({
          title: "Success",
          description: "Gemini enhanced the composite!"
        });
      } else {
        throw new Error(data.message || "Failed to enhance composite");
      }
    } catch (error) {
      console.error("Enhancement error:", error);
      toast({
        title: "Enhancement Failed",
        description: (error as Error).message,
        variant: "destructive"
      });
    } finally {
      setIsEnhancing(false);
    }
  };
  
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Plant Sprite Generator Test</h1>
          <p className="text-muted-foreground">
            Testing isolated plant sprite generation for precise garden compositing
          </p>
        </div>
        
        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Generate Plant Sprite</CardTitle>
              <CardDescription>
                Create an isolated plant image on white background suitable for compositing
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="plant-name">Plant Name</Label>
                <Input
                  id="plant-name"
                  value={plantName}
                  onChange={(e) => setPlantName(e.target.value)}
                  placeholder="e.g., Japanese Maple"
                  disabled={isGenerating}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="season">Season</Label>
                <Select value={season} onValueChange={setSeason} disabled={isGenerating}>
                  <SelectTrigger id="season">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="spring">Spring</SelectItem>
                    <SelectItem value="summer">Summer</SelectItem>
                    <SelectItem value="autumn">Autumn</SelectItem>
                    <SelectItem value="winter">Winter</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <Button 
                onClick={handleGenerateSprite}
                disabled={isGenerating || !plantName}
                className="w-full"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating Sprite...
                  </>
                ) : (
                  <>
                    <Leaf className="w-4 h-4 mr-2" />
                    Generate Sprite
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
          
          {generatedSprite && (
            <Card>
              <CardHeader>
                <CardTitle>Generated Sprite</CardTitle>
                <CardDescription>
                  {plantName} - {season} season
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Checkerboard background to show transparency */}
                  <div 
                    className="relative rounded-lg overflow-hidden"
                    style={{
                      backgroundImage: `repeating-conic-gradient(#808080 0% 25%, transparent 0% 50%)`,
                      backgroundPosition: '0 0, 10px 10px',
                      backgroundSize: '20px 20px'
                    }}
                  >
                    <img
                      src={generatedSprite}
                      alt={`${plantName} sprite`}
                      className="w-full h-auto"
                      style={{ maxHeight: '500px', objectFit: 'contain' }}
                    />
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={handleDownload}
                      className="flex-1"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download Sprite
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setGeneratedSprite(null);
                        setPlantName("Hosta");
                      }}
                      className="flex-1"
                    >
                      Generate Another
                    </Button>
                  </div>
                  
                  <div className="p-4 bg-muted rounded-lg">
                    <h4 className="font-semibold mb-2">Sprite Requirements Check:</h4>
                    <ul className="space-y-1 text-sm">
                      <li>✓ Isolated plant (no background elements)?</li>
                      <li>✓ White/transparent background?</li>
                      <li>✓ Consistent perspective (45° view)?</li>
                      <li>✓ Natural shadows for depth?</li>
                      <li>✓ Clear plant details?</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          
          <Card>
            <CardHeader>
              <CardTitle>Test the "Miracle Step"</CardTitle>
              <CardDescription>
                Create composite with 2 plants, then have Gemini beautify it
                <br />
                <span className="text-xs text-muted-foreground">Japanese Maple at (30,5) + Hosta at (34,21)</span>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={handleTestGeminiEnhance}
                disabled={isEnhancing}
                className="w-full"
              >
                {isEnhancing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating & Enhancing...
                  </>
                ) : (
                  <>
                    <Leaf className="w-4 h-4 mr-2" />
                    Test Composite → Gemini Enhancement
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
          
          {compositeImage && (
            <Card>
              <CardHeader>
                <CardTitle>Composite Garden Result</CardTitle>
                <CardDescription>
                  Japanese Maple placed at exact grid coordinates (30, 5)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="relative rounded-lg overflow-hidden border">
                    <img
                      src={compositeImage}
                      alt="Composite garden"
                      className="w-full h-auto"
                    />
                    {/* Grid overlay to show positioning */}
                    <div className="absolute inset-0 pointer-events-none opacity-20">
                      <div className="grid grid-cols-[repeat(40,1fr)] grid-rows-[repeat(30,1fr)] h-full w-full">
                        {[...Array(40 * 30)].map((_, i) => (
                          <div key={i} className="border border-gray-500 border-opacity-20" />
                        ))}
                      </div>
                    </div>
                    {/* Position marker */}
                    <div 
                      className="absolute w-2 h-2 bg-red-500 rounded-full"
                      style={{ 
                        left: `${(30/40) * 100}%`, 
                        top: `${(5/30) * 100}%`,
                        transform: 'translate(-50%, -50%)'
                      }}
                    />
                  </div>
                  
                  <div className="p-4 bg-muted rounded-lg">
                    <h4 className="font-semibold mb-2">Positioning Test:</h4>
                    <ul className="space-y-1 text-sm">
                      <li>✓ Grid coordinates: (30, 5)</li>
                      <li>✓ Pixel coordinates: ~(1440px, 240px)</li>
                      <li>✓ Plant: Japanese Maple</li>
                      <li>✓ Scale: 0.3 (tree sized for garden)</li>
                      <li>✓ Depth scaling applied (background = smaller)</li>
                    </ul>
                  </div>
                  
                  <Button
                    variant="outline"
                    onClick={() => {
                      const link = document.createElement('a');
                      link.href = compositeImage;
                      link.download = 'composite-garden.png';
                      link.click();
                    }}
                    className="w-full"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download Composite
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
          
          {enhancedImage && (
            <Card>
              <CardHeader>
                <CardTitle>The "Miracle Step" Result</CardTitle>
                <CardDescription>
                  Gemini's enhancement of the composite template
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-sm font-semibold mb-2">Template (Input)</h4>
                      <div className="rounded-lg overflow-hidden border">
                        <img
                          src={compositeImage || ''}
                          alt="Template composite"
                          className="w-full h-auto"
                        />
                      </div>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold mb-2">Gemini Enhanced (Output)</h4>
                      <div className="rounded-lg overflow-hidden border">
                        <img
                          src={enhancedImage}
                          alt="Enhanced garden"
                          className="w-full h-auto"
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-4 bg-muted rounded-lg">
                    <h4 className="font-semibold mb-2">Did Gemini Respect Positions?</h4>
                    <ul className="space-y-1 text-sm">
                      <li>❓ Japanese Maple still at (30, 5) - far right background?</li>
                      <li>❓ Hosta still at (34, 21) - right foreground?</li>
                      <li>❓ No plants moved or added?</li>
                      <li>❓ Photorealistic quality achieved?</li>
                    </ul>
                  </div>
                  
                  <Button
                    variant="outline"
                    onClick={() => {
                      const link = document.createElement('a');
                      link.href = enhancedImage;
                      link.download = 'gemini-enhanced-garden.png';
                      link.click();
                    }}
                    className="w-full"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download Enhanced Image
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}