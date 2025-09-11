import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Leaf,
  Sun,
  Droplets,
  TreePine,
  AlertTriangle,
  Heart,
  Info,
  Edit,
  Trash,
  Check,
  X,
  ChefHat,
  Pill,
  Flower2,
  Sprout,
  Calendar,
  Bug,
  Scissors,
  ImageIcon,
  Loader2
} from "lucide-react";
import type { Plant } from "@shared/schema";

interface PlantCardProps {
  plant: Partial<Plant>;
  onEdit?: () => void;
  onDelete?: () => void;
  onVerify?: () => void;
  onReject?: () => void;
  onGenerateImages?: () => void;
  showActions?: boolean;
  isAdmin?: boolean;
}

export function PlantCard({ 
  plant, 
  onEdit, 
  onDelete, 
  onVerify,
  onReject,
  onGenerateImages,
  showActions = false,
  isAdmin = false 
}: PlantCardProps) {
  // Safety level mapping
  const getToxicityBadge = (level: number | undefined, type: string) => {
    if (level === undefined || level === 0) {
      return <Badge variant="default" className="bg-green-500">Safe</Badge>;
    } else if (level <= 2) {
      return <Badge variant="outline" className="text-amber-600">Mild {type}</Badge>;
    } else if (level <= 4) {
      return <Badge variant="outline" className="text-orange-600">Moderate {type}</Badge>;
    } else {
      return <Badge variant="destructive">Highly Toxic {type}</Badge>;
    }
  };

  const formatSunlight = (sunlight: any) => {
    if (!sunlight) return "Unknown";
    if (Array.isArray(sunlight)) return sunlight.join(", ");
    if (typeof sunlight === 'object') return Object.values(sunlight).join(", ");
    return sunlight.toString();
  };

  return (
    <Card className="plant-card-frame">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            {/* Botanical Name - PRIMARY FOCUS */}
            <h3 className="text-lg font-semibold font-serif">
              {plant.scientificName || `${plant.genus || ''} ${plant.species || ''} ${plant.cultivar || ''}`.trim() || 'Unknown Plant'}
            </h3>
            {/* Common Name */}
            <p className="text-sm text-muted-foreground mt-1">
              {plant.commonName || 'No common name'}
            </p>
          </div>
          {/* Verification Status */}
          {plant.verificationStatus && (
            <Badge 
              variant={
                plant.verificationStatus === 'verified' ? 'default' : 
                plant.verificationStatus === 'pending' ? 'outline' : 'destructive'
              }
            >
              {plant.verificationStatus}
            </Badge>
          )}
        </div>

        {/* Plant Type and Family */}
        <div className="flex gap-2 mt-2">
          {plant.type && (
            <Badge variant="secondary">
              <TreePine className="w-3 h-3 mr-1" />
              {plant.type}
            </Badge>
          )}
          {plant.family && (
            <Badge variant="outline">
              {plant.family}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Image display with generation status */}
        {plant.thumbnailImage || plant.fullImage || plant.generatedImageUrl ? (
          <div className="relative">
            <img 
              src={plant.thumbnailImage || plant.fullImage || plant.generatedImageUrl} 
              alt={plant.scientificName || plant.commonName}
              className="w-full h-48 object-cover rounded-lg"
            />
            {plant.imageGenerationStatus === "generating" && (
              <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-white animate-spin" />
              </div>
            )}
          </div>
        ) : (
          <div className="w-full h-48 bg-muted rounded-lg flex flex-col items-center justify-center">
            <Leaf className="w-12 h-12 text-muted-foreground mb-2" />
            {plant.imageGenerationStatus && (
              <Badge variant="outline" className="text-xs">
                {plant.imageGenerationStatus}
              </Badge>
            )}
          </div>
        )}

        {/* Growing Conditions */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Growing Conditions</h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {plant.sunlight && (
              <div className="flex items-center gap-1">
                <Sun className="w-4 h-4 text-amber-600" />
                <span>{formatSunlight(plant.sunlight)}</span>
              </div>
            )}
            {plant.watering && (
              <div className="flex items-center gap-1">
                <Droplets className="w-4 h-4 text-blue-500" />
                <span>{plant.watering}</span>
              </div>
            )}
            {plant.hardiness && (
              <div className="flex items-center gap-1">
                <TreePine className="w-4 h-4 text-green-600" />
                <span>Zone {plant.hardiness}</span>
              </div>
            )}
            {plant.careLevel && (
              <div className="flex items-center gap-1">
                <Info className="w-4 h-4 text-muted-foreground" />
                <span>{plant.careLevel} care</span>
              </div>
            )}
          </div>
        </div>

        {/* Plant Characteristics */}
        <div className="flex flex-wrap gap-1">
          {plant.droughtTolerant && (
            <Badge variant="outline" className="text-xs">
              <Droplets className="w-3 h-3 mr-1" />
              Drought Tolerant
            </Badge>
          )}
          {plant.saltTolerant && (
            <Badge variant="outline" className="text-xs">
              Salt Tolerant
            </Badge>
          )}
          {plant.thorny && (
            <Badge variant="outline" className="text-xs">
              <AlertTriangle className="w-3 h-3 mr-1" />
              Thorny
            </Badge>
          )}
          {plant.tropical && (
            <Badge variant="outline" className="text-xs">
              Tropical
            </Badge>
          )}
          {plant.medicinal && (
            <Badge variant="outline" className="text-xs">
              <Pill className="w-3 h-3 mr-1" />
              Medicinal
            </Badge>
          )}
          {plant.cuisine && (
            <Badge variant="outline" className="text-xs">
              <ChefHat className="w-3 h-3 mr-1" />
              Culinary
            </Badge>
          )}
        </div>

        {/* Safety Information - VERY IMPORTANT */}
        <div className="space-y-2 p-3 bg-muted/50 rounded-lg">
          <h4 className="text-sm font-medium flex items-center gap-1">
            <AlertTriangle className="w-4 h-4" />
            Safety Information
          </h4>
          <div className="flex gap-2">
            {getToxicityBadge(plant.poisonousToHumans, "to Humans")}
            {getToxicityBadge(plant.poisonousToPets, "to Pets")}
          </div>
        </div>

        {/* Appearance */}
        {(plant.flowerColor || plant.leafColor || plant.floweringSeason) && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Appearance</h4>
            <div className="text-sm space-y-1">
              {plant.flowerColor && (
                <div className="flex items-center gap-1">
                  <Flower2 className="w-4 h-4 text-pink-500" />
                  <span>Flowers: {Array.isArray(plant.flowerColor) ? plant.flowerColor.join(", ") : plant.flowerColor}</span>
                </div>
              )}
              {plant.leafColor && (
                <div className="flex items-center gap-1">
                  <Leaf className="w-4 h-4 text-green-500" />
                  <span>Foliage: {Array.isArray(plant.leafColor) ? plant.leafColor.join(", ") : plant.leafColor}</span>
                </div>
              )}
              {plant.floweringSeason && (
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span>Blooms: {plant.floweringSeason}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Garden Care */}
        {(plant.pruningMonth || plant.propagation || plant.pestSusceptibility) && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Garden Care</h4>
            <div className="text-sm space-y-1">
              {plant.pruningMonth && (
                <div className="flex items-center gap-1">
                  <Scissors className="w-4 h-4 text-muted-foreground" />
                  <span>Prune: {Array.isArray(plant.pruningMonth) ? plant.pruningMonth.join(", ") : plant.pruningMonth}</span>
                </div>
              )}
              {plant.propagation && (
                <div className="flex items-center gap-1">
                  <Sprout className="w-4 h-4 text-green-500" />
                  <span>Propagate: {Array.isArray(plant.propagation) ? plant.propagation.join(", ") : plant.propagation}</span>
                </div>
              )}
              {plant.pestSusceptibility && (
                <div className="flex items-center gap-1">
                  <Bug className="w-4 h-4 text-red-500" />
                  <span>Watch for: {Array.isArray(plant.pestSusceptibility) ? plant.pestSusceptibility.slice(0, 3).join(", ") : plant.pestSusceptibility}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Description */}
        {plant.description && (
          <div className="pt-2 border-t">
            <p className="text-sm text-muted-foreground line-clamp-3">
              {plant.description}
            </p>
          </div>
        )}

        {/* Action Buttons */}
        {showActions && (
          <div className="flex gap-2 pt-3 border-t">
            {plant.verificationStatus === 'pending' && (
              <>
                <Button 
                  size="sm" 
                  variant="default"
                  onClick={onVerify}
                  className="flex-1"
                >
                  <Check className="w-4 h-4 mr-1" />
                  Verify
                </Button>
                <Button 
                  size="sm" 
                  variant="destructive"
                  onClick={onReject}
                  className="flex-1"
                >
                  <X className="w-4 h-4 mr-1" />
                  Reject
                </Button>
              </>
            )}
            {plant.verificationStatus === 'verified' && (
              <>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={onEdit}
                  className="flex-1"
                >
                  <Edit className="w-4 h-4 mr-1" />
                  Edit
                </Button>
                {isAdmin && (
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={onGenerateImages}
                    disabled={plant.imageGenerationStatus === "generating"}
                    className="flex-1"
                  >
                    {plant.imageGenerationStatus === "generating" ? (
                      <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Generating</>
                    ) : (
                      <><ImageIcon className="w-4 h-4 mr-1" /> Generate</>
                    )}
                  </Button>
                )}
                <Button 
                  size="sm" 
                  variant="ghost"
                  onClick={onDelete}
                >
                  <Trash className="w-4 h-4" />
                </Button>
              </>
            )}
          </div>
        )}

        {/* Data Source */}
        {plant.dataSource && (
          <div className="text-xs text-muted-foreground text-center pt-2">
            Source: {plant.dataSource} {plant.perenualId && `#${plant.perenualId}`}
          </div>
        )}
      </CardContent>
    </Card>
  );
}