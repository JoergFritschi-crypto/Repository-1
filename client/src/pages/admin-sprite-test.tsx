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
        </div>
      </div>
    </div>
  );
}