import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { RotateCcw, Download } from "lucide-react";

interface GeneratedIcon {
  name: string;
  path: string;
  timestamp: string;
}

const AIGeneratedIcon = ({ path, name, size = 96 }: { path: string; name: string; size?: number }) => (
  <div className="flex flex-col items-center space-y-2 p-4 border border-border rounded-lg bg-card hover:bg-accent/50 transition-colors">
    <div 
      className="border-2 border-border rounded-lg p-3 bg-white dark:bg-gray-900 shadow-sm" 
      style={{ width: size + 16, height: size + 16 }}
    >
      <img 
        src={path} 
        alt={name}
        width={size}
        height={size}
        className="object-contain"
        onError={(e) => {
          console.error(`Failed to load icon: ${path}`);
          e.currentTarget.style.display = 'none';
        }}
      />
    </div>
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

export default function IconGallery() {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);

  // Check which icons exist
  const checkIconExistence = async () => {
    const existingIcons: GeneratedIcon[] = [];
    
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

  const { data: existingIcons = [], refetch } = useQuery({
    queryKey: ['/api/generated-icons'],
    queryFn: checkIconExistence,
    refetchOnMount: true,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const generateIconsMutation = useMutation({
    mutationFn: async () => {
      setIsGenerating(true);
      const response = await apiRequest('/api/admin/generate-garden-tool-icons', 'POST');
      return response;
    },
    onSuccess: (data: any) => {
      setIsGenerating(false);
      toast({
        title: "Success! 🎨",
        description: `Generated ${data.paths?.length || 0} photorealistic garden tool icons using Gemini AI`,
      });
      refetch();
    },
    onError: (error: any) => {
      setIsGenerating(false);
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
    <div className="container mx-auto py-8 px-4">
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
                disabled={isGenerating}
                size="lg"
                className="bg-primary text-primary-foreground hover:bg-primary/90"
                data-testid="button-generate-icons"
              >
                {isGenerating ? (
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
                onClick={() => refetch()}
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
          {isGenerating && (
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
    </div>
  );
}