import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Leaf,
  Sun,
  Droplets,
  TreePine,
  Heart,
  Info,
  ChefHat,
  Pill,
  Thermometer,
  Ruler,
  Clock,
  PawPrint,
  Baby
} from "lucide-react";
import type { Plant } from "@shared/schema";

interface PlantCardDisplayProps {
  plant: Partial<Plant>;
  onViewDetails?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onVerify?: () => void;
  onReject?: () => void;
  showActions?: boolean;
}

export function PlantCardDisplay({ 
  plant, 
  onViewDetails,
  onEdit, 
  onDelete, 
  onVerify,
  onReject,
  showActions = false 
}: PlantCardDisplayProps) {
  
  // Format botanical name with proper formatting
  const formatBotanicalName = () => {
    if (plant.scientificName) return plant.scientificName;
    
    let name = '';
    if (plant.genus) name += plant.genus;
    if (plant.species) name += ` ${plant.species}`;
    if (plant.cultivar) {
      // Cultivars should be in single quotes, not italicized
      name += ` '${plant.cultivar.replace(/['"]/g, '')}'`;
    }
    return name.trim() || 'Unknown Plant';
  };

  // Get plant dimensions
  const getDimensions = () => {
    if (!plant.dimension) return null;
    const dim = plant.dimension as any;
    
    let height = 'Unknown height';
    let spread = 'Unknown spread';
    
    if (dim.height) {
      const min = dim.height.min || dim.min_height;
      const max = dim.height.max || dim.max_height;
      if (min && max) height = `${min}-${max}${dim.unit || 'ft'}`;
      else if (max) height = `Up to ${max}${dim.unit || 'ft'}`;
    }
    
    if (dim.spread) {
      const min = dim.spread.min || dim.min_spread;
      const max = dim.spread.max || dim.max_spread;
      if (min && max) spread = `${min}-${max}${dim.unit || 'ft'} spread`;
      else if (max) spread = `${max}${dim.unit || 'ft'} spread`;
    }
    
    return { height, spread };
  };

  // Format sunlight requirements
  const formatSunlight = (sunlight: any) => {
    if (!sunlight) return "Unknown";
    if (Array.isArray(sunlight)) {
      return sunlight.map(s => 
        s.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
      ).join(", ");
    }
    if (typeof sunlight === 'string') {
      return sunlight.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
    return "Unknown";
  };

  // Get toxicity level
  const getToxicityLevel = (level: number | undefined) => {
    if (!level || level === 0) return { text: "Safe", color: "text-green-600" };
    if (level <= 2) return { text: "Mild", color: "text-amber-600" };
    if (level <= 4) return { text: "Moderate", color: "text-orange-600" };
    return { text: "Toxic", color: "text-red-600" };
  };

  const dimensions = getDimensions();
  const humanToxicity = getToxicityLevel(plant.poisonousToHumans);
  const petToxicity = getToxicityLevel(plant.poisonousToPets);

  return (
    <Card className="hover:shadow-lg transition-shadow h-full flex flex-col">
      <CardHeader className="pb-3">
        {/* Scientific Name - Properly formatted */}
        <h3 className="text-lg font-serif italic">
          {plant.genus && plant.species ? (
            <>
              <span className="italic">{plant.genus} {plant.species}</span>
              {plant.cultivar && <span className="not-italic"> '{plant.cultivar.replace(/['"]/g, '')}'</span>}
            </>
          ) : (
            <span className="italic">{formatBotanicalName()}</span>
          )}
        </h3>
        
        {/* Common Name */}
        <p className="text-base font-medium mt-1">
          {plant.commonName || 'No common name'}
        </p>
      </CardHeader>

      <CardContent className="flex-1 space-y-3">
        {/* Plant Image */}
        {plant.generatedImageUrl ? (
          <img 
            src={plant.generatedImageUrl} 
            alt={plant.commonName || plant.scientificName}
            className="w-full h-48 object-cover rounded-lg"
          />
        ) : (
          <div className="w-full h-48 bg-muted rounded-lg flex items-center justify-center">
            <Leaf className="w-12 h-12 text-muted-foreground" />
          </div>
        )}

        {/* Top 10 Most Important Characteristics */}
        <div className="space-y-2 text-sm">
          {/* 1. Type and Cycle */}
          <div className="flex flex-wrap gap-1">
            {plant.type && (
              <Badge variant="secondary" className="text-xs">
                <TreePine className="w-3 h-3 mr-1" />
                {plant.type}
              </Badge>
            )}
            {plant.cycle && (
              <Badge variant="outline" className="text-xs">
                <Clock className="w-3 h-3 mr-1" />
                {plant.cycle}
              </Badge>
            )}
            {plant.foliage && (
              <Badge variant="outline" className="text-xs">
                {plant.foliage}
              </Badge>
            )}
          </div>

          {/* 2-3. Dimensions */}
          {dimensions && (
            <div className="flex items-center gap-1 text-xs">
              <Ruler className="w-3 h-3" />
              <span>{dimensions.height}</span>
              {dimensions.spread !== 'Unknown spread' && (
                <span>• {dimensions.spread}</span>
              )}
            </div>
          )}

          {/* 4. Hardiness */}
          {plant.hardiness && (
            <div className="flex items-center gap-1 text-xs">
              <Thermometer className="w-3 h-3" />
              <span>Zones: {plant.hardiness}</span>
            </div>
          )}

          {/* 5. Sunlight */}
          {plant.sunlight && (
            <div className="flex items-center gap-1 text-xs">
              <Sun className="w-3 h-3" />
              <span>{formatSunlight(plant.sunlight)}</span>
            </div>
          )}

          {/* 6. Watering */}
          {plant.watering && (
            <div className="flex items-center gap-1 text-xs">
              <Droplets className="w-3 h-3" />
              <span>{plant.watering}</span>
            </div>
          )}

          {/* 7. Care Level */}
          {plant.careLevel && (
            <div className="flex items-center gap-1 text-xs">
              <Heart className="w-3 h-3" />
              <span>Care: {plant.careLevel}</span>
            </div>
          )}

          {/* 8-9. Safety */}
          <div className="flex gap-2 text-xs">
            {plant.poisonousToHumans !== undefined && (
              <div className={`flex items-center gap-1 ${humanToxicity.color}`}>
                <Baby className="w-3 h-3" />
                <span>{humanToxicity.text}</span>
              </div>
            )}
            {plant.poisonousToPets !== undefined && (
              <div className={`flex items-center gap-1 ${petToxicity.color}`}>
                <PawPrint className="w-3 h-3" />
                <span>{petToxicity.text}</span>
              </div>
            )}
          </div>

          {/* 10. Special Uses */}
          <div className="flex gap-1">
            {plant.cuisine && (
              <Badge variant="default" className="text-xs bg-green-600">
                <ChefHat className="w-3 h-3 mr-1" />
                Culinary
              </Badge>
            )}
            {plant.medicinal && (
              <Badge variant="default" className="text-xs bg-blue-600">
                <Pill className="w-3 h-3 mr-1" />
                Medicinal
              </Badge>
            )}
          </div>
        </div>

        {/* View Details Button */}
        <Button 
          onClick={onViewDetails}
          className="w-full mt-auto"
          variant="outline"
        >
          <Info className="w-4 h-4 mr-2" />
          View Details
        </Button>

        {/* Admin Actions */}
        {showActions && (
          <div className="flex gap-2 pt-2 border-t">
            {plant.verificationStatus === 'pending' && onVerify && (
              <>
                <Button size="sm" variant="default" onClick={onVerify} className="flex-1">
                  Verify
                </Button>
                <Button size="sm" variant="destructive" onClick={onReject} className="flex-1">
                  Reject
                </Button>
              </>
            )}
            {onEdit && (
              <Button size="sm" variant="outline" onClick={onEdit} className="flex-1">
                Edit
              </Button>
            )}
            {onDelete && (
              <Button size="sm" variant="destructive" onClick={onDelete} className="flex-1">
                Delete
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}