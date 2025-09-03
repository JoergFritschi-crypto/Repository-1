import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { 
  Printer,
  Share2,
  Download,
  X,
  Sun,
  Droplets,
  TreePine,
  AlertTriangle,
  Heart,
  ChefHat,
  Pill,
  Thermometer,
  Ruler,
  Clock,
  PawPrint,
  Baby,
  Leaf,
  Bug,
  Scissors,
  Calendar,
  Flower2,
  Bird,
  Butterfly
} from "lucide-react";
import type { Plant } from "@shared/schema";

interface PlantDetailViewProps {
  plant: Partial<Plant>;
  onClose?: () => void;
}

export function PlantDetailView({ plant, onClose }: PlantDetailViewProps) {
  
  // Format botanical name with proper formatting
  const formatBotanicalName = () => {
    let name = '';
    if (plant.genus) name += plant.genus;
    if (plant.species) name += ` ${plant.species}`;
    return name.trim();
  };

  // Get plant dimensions
  const getDimensions = () => {
    if (!plant.dimension) return null;
    const dim = plant.dimension as any;
    
    let result: any = {};
    
    if (dim.height) {
      const min = dim.height.min || dim.min_height;
      const max = dim.height.max || dim.max_height;
      if (min && max) result.height = `${min}-${max} ${dim.unit || 'ft'}`;
      else if (max) result.height = `Up to ${max} ${dim.unit || 'ft'}`;
    }
    
    if (dim.spread) {
      const min = dim.spread.min || dim.min_spread;
      const max = dim.spread.max || dim.max_spread;
      if (min && max) result.spread = `${min}-${max} ${dim.unit || 'ft'}`;
      else if (max) result.spread = `${max} ${dim.unit || 'ft'}`;
    }
    
    return result;
  };

  // Format array fields
  const formatArray = (arr: any) => {
    if (!arr) return "Not specified";
    if (Array.isArray(arr)) {
      return arr.map(s => 
        typeof s === 'string' ? s.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : s
      ).join(", ");
    }
    if (typeof arr === 'string') {
      return arr.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
    return "Not specified";
  };

  // Get toxicity level
  const getToxicityInfo = (level: number | undefined, type: string) => {
    if (!level || level === 0) return { text: `Safe for ${type}`, color: "text-green-600", badge: "default" };
    if (level === 1) return { text: `Very mild toxicity to ${type}`, color: "text-yellow-500", badge: "outline" };
    if (level === 2) return { text: `Mild toxicity to ${type}`, color: "text-yellow-600", badge: "outline" };
    if (level === 3) return { text: `Moderate toxicity to ${type}`, color: "text-orange-500", badge: "secondary" };
    if (level === 4) return { text: `High toxicity to ${type}`, color: "text-orange-600", badge: "destructive" };
    return { text: `Severe toxicity to ${type}`, color: "text-red-600", badge: "destructive" };
  };

  // Handle print
  const handlePrint = () => {
    window.print();
  };

  // Handle share
  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${plant.commonName || plant.scientificName}`,
          text: `Check out this plant: ${plant.commonName} (${plant.scientificName})`,
          url: window.location.href
        });
      } catch (err) {
        console.log('Share cancelled or failed');
      }
    } else {
      // Fallback - copy to clipboard
      navigator.clipboard.writeText(window.location.href);
      alert('Link copied to clipboard!');
    }
  };

  // Handle download (as JSON for now)
  const handleDownload = () => {
    const dataStr = JSON.stringify(plant, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportName = `${plant.scientificName || 'plant'}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportName);
    linkElement.click();
  };

  const dimensions = getDimensions();
  const humanToxicity = getToxicityInfo(plant.poisonousToHumans, "humans");
  const petToxicity = getToxicityInfo(plant.poisonousToPets, "pets");

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm overflow-y-auto print:relative print:inset-auto print:z-auto print:bg-transparent">
      <div className="container max-w-4xl mx-auto py-8 px-4">
        <Card className="print:shadow-none">
          {/* Header with Actions */}
          <CardHeader className="print:hidden">
            <div className="flex justify-between items-start">
              <CardTitle>Plant Details</CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="icon" onClick={handlePrint}>
                  <Printer className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={handleShare}>
                  <Share2 className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={handleDownload}>
                  <Download className="h-4 w-4" />
                </Button>
                {onClose && (
                  <Button variant="outline" size="icon" onClick={onClose}>
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-6 print:space-y-4">
            {/* Plant Identity */}
            <div>
              <h1 className="text-3xl font-serif">
                <span className="italic">{formatBotanicalName()}</span>
                {plant.cultivar && <span className="not-italic"> '{plant.cultivar.replace(/['"]/g, '')}'</span>}
              </h1>
              <p className="text-xl text-muted-foreground mt-2">
                {plant.commonName || 'No common name'}
              </p>
              {plant.genus && plant.species && (
                <p className="text-sm text-muted-foreground mt-1">
                  Genus: <span className="italic">{plant.genus}</span> | 
                  Species: <span className="italic">{plant.species}</span>
                  {plant.cultivar && <> | Cultivar: '{plant.cultivar.replace(/['"]/g, '')}'</>}
                </p>
              )}
            </div>

            {/* Images */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {plant.generatedImageUrl ? (
                <>
                  <img 
                    src={plant.generatedImageUrl} 
                    alt={`${plant.commonName} - Full view`}
                    className="w-full h-64 object-cover rounded-lg"
                  />
                  <img 
                    src={plant.generatedImageUrl} 
                    alt={`${plant.commonName} - Detail view`}
                    className="w-full h-64 object-cover rounded-lg"
                  />
                </>
              ) : (
                <>
                  <div className="w-full h-64 bg-muted rounded-lg flex items-center justify-center">
                    <Leaf className="w-16 h-16 text-muted-foreground" />
                    <p className="ml-2 text-muted-foreground">Full plant view</p>
                  </div>
                  <div className="w-full h-64 bg-muted rounded-lg flex items-center justify-center">
                    <Flower2 className="w-16 h-16 text-muted-foreground" />
                    <p className="ml-2 text-muted-foreground">Detail view</p>
                  </div>
                </>
              )}
            </div>

            <Separator />

            {/* Basic Characteristics */}
            <div>
              <h2 className="text-lg font-semibold mb-3">Basic Characteristics</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {plant.type && (
                  <div>
                    <p className="text-sm text-muted-foreground">Type</p>
                    <p className="font-medium">{plant.type}</p>
                  </div>
                )}
                {plant.cycle && (
                  <div>
                    <p className="text-sm text-muted-foreground">Cycle</p>
                    <p className="font-medium">{plant.cycle}</p>
                  </div>
                )}
                {plant.foliage && (
                  <div>
                    <p className="text-sm text-muted-foreground">Foliage</p>
                    <p className="font-medium">{plant.foliage}</p>
                  </div>
                )}
                {dimensions?.height && (
                  <div>
                    <p className="text-sm text-muted-foreground">Height</p>
                    <p className="font-medium">{dimensions.height}</p>
                  </div>
                )}
                {dimensions?.spread && (
                  <div>
                    <p className="text-sm text-muted-foreground">Spread</p>
                    <p className="font-medium">{dimensions.spread}</p>
                  </div>
                )}
                {plant.growthRate && (
                  <div>
                    <p className="text-sm text-muted-foreground">Growth Rate</p>
                    <p className="font-medium">{plant.growthRate}</p>
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* Growing Conditions */}
            <div>
              <h2 className="text-lg font-semibold mb-3">Growing Conditions</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {plant.hardiness && (
                  <div>
                    <p className="text-sm text-muted-foreground">Hardiness Zones</p>
                    <p className="font-medium">{plant.hardiness}</p>
                  </div>
                )}
                {plant.sunlight && (
                  <div>
                    <p className="text-sm text-muted-foreground">Sunlight</p>
                    <p className="font-medium">{formatArray(plant.sunlight)}</p>
                  </div>
                )}
                {plant.soil && (
                  <div>
                    <p className="text-sm text-muted-foreground">Soil</p>
                    <p className="font-medium">{formatArray(plant.soil)}</p>
                  </div>
                )}
                {plant.watering && (
                  <div>
                    <p className="text-sm text-muted-foreground">Watering</p>
                    <p className="font-medium">{plant.watering}</p>
                  </div>
                )}
                {plant.careLevel && (
                  <div>
                    <p className="text-sm text-muted-foreground">Care Level</p>
                    <p className="font-medium">{plant.careLevel}</p>
                  </div>
                )}
                {plant.maintenance && (
                  <div>
                    <p className="text-sm text-muted-foreground">Maintenance</p>
                    <p className="font-medium">{plant.maintenance}</p>
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* Plant Features */}
            <div>
              <h2 className="text-lg font-semibold mb-3">Plant Features</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {plant.droughtTolerant !== undefined && (
                  <div>
                    <p className="text-sm text-muted-foreground">Drought Tolerant</p>
                    <p className="font-medium">{plant.droughtTolerant ? "Yes" : "No"}</p>
                  </div>
                )}
                {plant.saltTolerant !== undefined && (
                  <div>
                    <p className="text-sm text-muted-foreground">Salt Tolerant</p>
                    <p className="font-medium">{plant.saltTolerant ? "Yes" : "No"}</p>
                  </div>
                )}
                {plant.thorny !== undefined && (
                  <div>
                    <p className="text-sm text-muted-foreground">Thorny</p>
                    <p className="font-medium">{plant.thorny ? "Yes" : "No"}</p>
                  </div>
                )}
                {plant.tropical !== undefined && (
                  <div>
                    <p className="text-sm text-muted-foreground">Tropical</p>
                    <p className="font-medium">{plant.tropical ? "Yes" : "No"}</p>
                  </div>
                )}
                {plant.flowerColor && (
                  <div>
                    <p className="text-sm text-muted-foreground">Flower Color</p>
                    <p className="font-medium">{formatArray(plant.flowerColor)}</p>
                  </div>
                )}
                {plant.floweringSeason && (
                  <div>
                    <p className="text-sm text-muted-foreground">Flowering Season</p>
                    <p className="font-medium">{plant.floweringSeason}</p>
                  </div>
                )}
                {plant.leafColor && (
                  <div>
                    <p className="text-sm text-muted-foreground">Leaf Color</p>
                    <p className="font-medium">{formatArray(plant.leafColor)}</p>
                  </div>
                )}
                {plant.attracts && (
                  <div className="col-span-2">
                    <p className="text-sm text-muted-foreground">Attracts</p>
                    <p className="font-medium">{formatArray(plant.attracts)}</p>
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* Safety & Uses */}
            <div>
              <h2 className="text-lg font-semibold mb-3">Safety & Uses</h2>
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {plant.poisonousToHumans !== undefined && (
                    <Badge variant={humanToxicity.badge as any} className="gap-1">
                      <Baby className="w-3 h-3" />
                      {humanToxicity.text}
                    </Badge>
                  )}
                  {plant.poisonousToPets !== undefined && (
                    <Badge variant={petToxicity.badge as any} className="gap-1">
                      <PawPrint className="w-3 h-3" />
                      {petToxicity.text}
                    </Badge>
                  )}
                  {plant.cuisine && (
                    <Badge className="gap-1 bg-green-600">
                      <ChefHat className="w-3 h-3" />
                      Culinary Use
                    </Badge>
                  )}
                  {plant.medicinal && (
                    <Badge className="gap-1 bg-blue-600">
                      <Pill className="w-3 h-3" />
                      Medicinal Use
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Description */}
            {plant.description && (
              <>
                <Separator />
                <div>
                  <h2 className="text-lg font-semibold mb-3">Description</h2>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{plant.description}</p>
                </div>
              </>
            )}

            {/* Care Information */}
            {(plant.pruningMonth || plant.propagation || plant.pestSusceptibility) && (
              <>
                <Separator />
                <div>
                  <h2 className="text-lg font-semibold mb-3">Care Information</h2>
                  <div className="space-y-2">
                    {plant.pruningMonth && (
                      <div>
                        <p className="text-sm text-muted-foreground">Pruning Months</p>
                        <p className="font-medium">{formatArray(plant.pruningMonth)}</p>
                      </div>
                    )}
                    {plant.propagation && (
                      <div>
                        <p className="text-sm text-muted-foreground">Propagation Methods</p>
                        <p className="font-medium">{formatArray(plant.propagation)}</p>
                      </div>
                    )}
                    {plant.pestSusceptibility && (
                      <div>
                        <p className="text-sm text-muted-foreground">Common Pests</p>
                        <p className="font-medium">{formatArray(plant.pestSusceptibility)}</p>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* Print-only footer */}
            <div className="hidden print:block pt-4 mt-4 border-t text-center text-sm text-muted-foreground">
              Generated from GardenScape Pro • {new Date().toLocaleDateString()}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}