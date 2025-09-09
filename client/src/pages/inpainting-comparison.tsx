import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Loader2, Image as ImageIcon, Sparkles, Layers, GitCompareArrows } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

export default function InpaintingComparison() {
  const [isLoading, setIsLoading] = useState(false);
  const [comparisonResults, setComparisonResults] = useState<{
    composite?: string;
    enhancedComposite?: string;
    inpaintSequential?: string;
    inpaintBatch?: string;
    emptyBase?: string;
  } | null>(null);
  const { toast } = useToast();

  const runComparison = async () => {
    setIsLoading(true);
    try {
      const response = await apiRequest('GET', '/api/test/inpainting-comparison');
      const data = await response.json();
      
      if (data.success) {
        setComparisonResults(data.results);
        toast({
          title: "Comparison Complete",
          description: "Generated images using both composite and inpainting approaches",
        });
      } else {
        throw new Error(data.message || 'Comparison failed');
      }
    } catch (error) {
      console.error('Comparison error:', error);
      toast({
        title: "Comparison Failed",
        description: error instanceof Error ? error.message : "Failed to run comparison",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GitCompareArrows className="h-6 w-6" />
              AI Inpainting vs Composite Comparison
            </CardTitle>
            <CardDescription>
              Proof of concept comparing mechanical sprite compositing with AI inpainting for garden visualization
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                <h3 className="font-semibold">Test Configuration:</h3>
                <ul className="text-sm space-y-1 ml-4">
                  <li>• <strong>Plants:</strong> Japanese Maple (background right), Hosta (foreground left), Lavender (center)</li>
                  <li>• <strong>Season:</strong> Summer</li>
                  <li>• <strong>Approaches:</strong> Composite sprites vs Sequential inpainting vs Batch inpainting</li>
                </ul>
              </div>
              
              <Button 
                onClick={runComparison} 
                disabled={isLoading}
                className="w-full sm:w-auto"
                data-testid="button-run-comparison"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating Comparisons...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Run Comparison Test
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {comparisonResults && (
          <Tabs defaultValue="side-by-side" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="side-by-side">Side by Side</TabsTrigger>
              <TabsTrigger value="individual">Individual Views</TabsTrigger>
            </TabsList>
            
            <TabsContent value="side-by-side" className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                {/* Enhanced Composite Approach */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <Layers className="h-5 w-5" />
                        Enhanced Composite
                      </span>
                      <Badge variant="outline">Current Approach</Badge>
                    </CardTitle>
                    <CardDescription>
                      Sprite placement + AI enhancement for photorealism
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {comparisonResults.enhancedComposite ? (
                      <img 
                        src={comparisonResults.enhancedComposite} 
                        alt="Enhanced composite approach" 
                        className="w-full rounded-lg border"
                      />
                    ) : (
                      <div className="h-64 bg-muted rounded-lg flex items-center justify-center">
                        <ImageIcon className="h-12 w-12 text-muted-foreground" />
                      </div>
                    )}
                    <div className="mt-3 p-3 bg-muted/50 rounded text-sm">
                      <strong>Pros:</strong> Precise positioning, photorealistic finish
                      <br />
                      <strong>Cons:</strong> Two-step process, may lose some plant details
                    </div>
                  </CardContent>
                </Card>

                {/* Batch Inpainting */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5" />
                        AI Inpainting (Batch)
                      </span>
                      <Badge>New Approach</Badge>
                    </CardTitle>
                    <CardDescription>
                      AI intelligently paints all plants at once
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {comparisonResults.inpaintBatch ? (
                      <img 
                        src={comparisonResults.inpaintBatch} 
                        alt="Batch inpainting approach" 
                        className="w-full rounded-lg border"
                      />
                    ) : (
                      <div className="h-64 bg-muted rounded-lg flex items-center justify-center">
                        <ImageIcon className="h-12 w-12 text-muted-foreground" />
                      </div>
                    )}
                    <div className="mt-3 p-3 bg-muted/50 rounded text-sm">
                      <strong>Pros:</strong> Natural integration, realistic lighting/shadows
                      <br />
                      <strong>Cons:</strong> Less control, may vary from expectations
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Additional comparisons */}
              <div className="grid md:grid-cols-3 gap-6">
                {/* Basic Composite (Mechanical) */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Layers className="h-5 w-5" />
                      Mechanical Composite
                    </CardTitle>
                    <CardDescription>
                      Raw sprite placement (before enhancement)
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {comparisonResults.composite ? (
                      <img 
                        src={comparisonResults.composite} 
                        alt="Mechanical composite" 
                        className="w-full rounded-lg border"
                      />
                    ) : (
                      <div className="h-64 bg-muted rounded-lg flex items-center justify-center">
                        <ImageIcon className="h-12 w-12 text-muted-foreground" />
                      </div>
                    )}
                  </CardContent>
                </Card>
                
                {/* Sequential Inpainting */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5" />
                      AI Inpainting (Sequential)
                    </CardTitle>
                    <CardDescription>
                      AI adds plants one at a time
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {comparisonResults.inpaintSequential ? (
                      <img 
                        src={comparisonResults.inpaintSequential} 
                        alt="Sequential inpainting approach" 
                        className="w-full rounded-lg border"
                      />
                    ) : (
                      <div className="h-64 bg-muted rounded-lg flex items-center justify-center">
                        <ImageIcon className="h-12 w-12 text-muted-foreground" />
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="individual" className="space-y-6">
              {Object.entries(comparisonResults).map(([key, url]) => (
                <Card key={key}>
                  <CardHeader>
                    <CardTitle className="capitalize">
                      {key.replace(/([A-Z])/g, ' $1').trim()}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {url ? (
                      <img 
                        src={url} 
                        alt={key} 
                        className="w-full rounded-lg border"
                      />
                    ) : (
                      <div className="h-96 bg-muted rounded-lg flex items-center justify-center">
                        <ImageIcon className="h-12 w-12 text-muted-foreground" />
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </TabsContent>
          </Tabs>
        )}

        {/* Analysis Section */}
        {comparisonResults && (
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>Approach Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold mb-2">Composite Approach (Current)</h3>
                  <ul className="space-y-1 text-sm">
                    <li>✅ Predictable and consistent positioning</li>
                    <li>✅ Each plant clearly distinguishable</li>
                    <li>✅ Fast generation time</li>
                    <li>❌ Less natural appearance</li>
                    <li>❌ No environmental integration</li>
                    <li>❌ Lighting/shadows may not match</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">AI Inpainting (Proposed)</h3>
                  <ul className="space-y-1 text-sm">
                    <li>✅ Natural, photorealistic results</li>
                    <li>✅ Proper lighting and shadows</li>
                    <li>✅ Environmental coherence</li>
                    <li>❌ Less precise positioning</li>
                    <li>❌ May interpret plants differently</li>
                    <li>❌ Slower generation time</li>
                  </ul>
                </div>
              </div>
              
              <div className="mt-6 p-4 bg-primary/5 rounded-lg">
                <h3 className="font-semibold mb-2">Recommendation</h3>
                <p className="text-sm">
                  For production use, consider a hybrid approach: Use composite for precise layout preview, 
                  then AI inpainting for final photorealistic renders. This gives users control during design 
                  while delivering beautiful final visualizations.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}