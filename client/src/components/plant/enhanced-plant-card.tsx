import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { motion } from "framer-motion";
import { 
  Heart, 
  Sun, 
  Cloud, 
  CloudSun,
  Eye,
  Plus,
  Droplets,
  Shield,
  TreePine,
  Flower2,
  Calendar,
  MapPin,
  Ruler,
  Info,
  Check,
  Star,
  Sparkles,
  Leaf
} from "lucide-react";
import type { Plant } from "@/types/plant";

interface EnhancedPlantCardProps {
  plant: Plant;
  viewMode?: "grid" | "list";
  isInCollection?: boolean;
  collectionNotes?: string;
}

export function EnhancedPlantCard({ 
  plant, 
  viewMode = "grid",
  isInCollection = false,
  collectionNotes 
}: EnhancedPlantCardProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [notes, setNotes] = useState(collectionNotes || "");
  const [imageLoaded, setImageLoaded] = useState(false);
  const { toast } = useToast();

  const addToCollectionMutation = useMutation({
    mutationFn: async (data: { plantId: string; notes?: string }) => {
      const response = await apiRequest("POST", "/api/my-collection", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Added to Collection",
        description: `${plant.commonName} has been added to your garden collection!`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/my-collection"] });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const removeFromCollectionMutation = useMutation({
    mutationFn: async (plantId: string) => {
      await apiRequest("DELETE", `/api/my-collection/${plantId}`);
    },
    onSuccess: () => {
      toast({
        title: "Removed from Collection",
        description: `${plant.commonName} has been removed.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/my-collection"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const getSunIcon = (sunRequirement?: string) => {
    switch (sunRequirement) {
      case "full_sun":
        return <Sun className="w-4 h-4 text-yellow-500" />;
      case "partial_sun":
      case "partial_shade":
        return <CloudSun className="w-4 h-4 text-yellow-400" />;
      case "full_shade":
        return <Cloud className="w-4 h-4 text-gray-400" />;
      default:
        return <Sun className="w-4 h-4 text-gray-300" />;
    }
  };

  const getCareLevel = (plant: Plant): { level: string; color: string; stars: number } => {
    // Determine care level based on various factors
    let difficulty = 0;
    
    if (plant.water_requirements?.includes("high")) difficulty++;
    if (plant.water_requirements?.includes("specific")) difficulty++;
    if (!plant.drought_tolerant) difficulty++;
    if (plant.toxic_to_children || plant.toxic_to_pets) difficulty++;
    if (plant.care_notes?.includes("difficult")) difficulty += 2;
    
    if (difficulty <= 1) return { level: "Easy", color: "text-green-500", stars: 1 };
    if (difficulty <= 3) return { level: "Moderate", color: "text-yellow-500", stars: 2 };
    return { level: "Advanced", color: "text-red-500", stars: 3 };
  };

  const careLevel = getCareLevel(plant);
  const primaryImage = plant.fullImage || plant.thumbnailImage;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card 
        className="group overflow-hidden hover:shadow-xl transition-all duration-300 border-accent/20"
        data-testid={`enhanced-plant-card-${plant.id}`}
      >
        {/* Image Section with Overlay Info */}
        <div className="relative h-64 bg-gradient-to-br from-green-50 to-emerald-50 overflow-hidden">
          {primaryImage ? (
            <>
              <img 
                src={primaryImage}
                alt={plant.commonName}
                className={`w-full h-full object-cover transition-all duration-700 group-hover:scale-110 ${
                  imageLoaded ? 'opacity-100' : 'opacity-0'
                }`}
                onLoad={() => setImageLoaded(true)}
              />
              {!imageLoaded && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Leaf className="w-12 h-12 text-green-300 animate-pulse" />
                </div>
              )}
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-center">
                <Flower2 className="w-16 h-16 text-green-300 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No image available</p>
              </div>
            </div>
          )}
          
          {/* Top Badges */}
          <div className="absolute top-3 left-3 right-3 flex justify-between items-start">
            <div className="flex gap-2">
              {plant.pet_safe && (
                <Badge className="bg-green-500/90 backdrop-blur-sm">
                  <Shield className="w-3 h-3 mr-1" />
                  Pet Safe
                </Badge>
              )}
              {plant.drought_tolerant && (
                <Badge className="bg-blue-500/90 backdrop-blur-sm">
                  <Droplets className="w-3 h-3 mr-1" />
                  Drought OK
                </Badge>
              )}
            </div>
            {isInCollection && (
              <Badge className="bg-accent/90 backdrop-blur-sm">
                <Heart className="w-3 h-3 mr-1 fill-current" />
                In Garden
              </Badge>
            )}
          </div>
          
          {/* Bottom Gradient with Plant Name */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
            <h3 className="text-white font-bold text-xl mb-1">
              {plant.commonName}
            </h3>
            <p className="text-white/80 text-sm italic">
              {plant.scientificName}
            </p>
          </div>
        </div>

        <CardContent className="p-4 space-y-4">
          {/* Quick Info Grid */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="space-y-1">
              <div className="flex justify-center">
                {getSunIcon(plant.sun_requirements)}
              </div>
              <p className="text-xs text-muted-foreground">
                {plant.sun_requirements?.replace(/_/g, ' ') || 'Any light'}
              </p>
            </div>
            <div className="space-y-1">
              <div className="flex justify-center text-blue-500">
                <Droplets className="w-4 h-4" />
              </div>
              <p className="text-xs text-muted-foreground">
                {plant.water_requirements || 'Moderate'}
              </p>
            </div>
            <div className="space-y-1">
              <div className="flex justify-center">
                {[...Array(careLevel.stars)].map((_, i) => (
                  <Star key={i} className={`w-3 h-3 fill-current ${careLevel.color}`} />
                ))}
              </div>
              <p className={`text-xs ${careLevel.color}`}>
                {careLevel.level}
              </p>
            </div>
          </div>

          {/* Plant Type and Zone */}
          <div className="flex flex-wrap gap-2">
            {plant.type && (
              <Badge variant="secondary" className="text-xs">
                <TreePine className="w-3 h-3 mr-1" />
                {plant.type}
              </Badge>
            )}
            {plant.hardiness_zones && (
              <Badge variant="outline" className="text-xs">
                <MapPin className="w-3 h-3 mr-1" />
                Zone {plant.hardiness_zones}
              </Badge>
            )}
            {plant.mature_height && (
              <Badge variant="outline" className="text-xs">
                <Ruler className="w-3 h-3 mr-1" />
                {plant.mature_height}
              </Badge>
            )}
          </div>

          {/* Bloom Info if available */}
          {(plant.bloom_time || plant.bloom_color) && (
            <div className="flex items-center gap-2 p-2 bg-accent/10 rounded-lg">
              <Flower2 className="w-4 h-4 text-accent" />
              <div className="text-xs">
                {plant.bloom_color && <span className="font-medium">{plant.bloom_color} blooms</span>}
                {plant.bloom_time && plant.bloom_color && " • "}
                {plant.bloom_time && <span>{plant.bloom_time}</span>}
              </div>
            </div>
          )}

          {/* Special Features */}
          {(plant.fragrant || plant.attracts_pollinators || plant.deer_resistant) && (
            <div className="flex gap-1">
              {plant.fragrant && (
                <Badge variant="outline" className="text-xs bg-purple-50">
                  <Sparkles className="w-3 h-3 mr-1" />
                  Fragrant
                </Badge>
              )}
              {plant.attracts_pollinators && (
                <Badge variant="outline" className="text-xs bg-yellow-50">
                  🐝 Pollinators
                </Badge>
              )}
              {plant.deer_resistant && (
                <Badge variant="outline" className="text-xs bg-amber-50">
                  🦌 Deer Resistant
                </Badge>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <Dialog>
              <DialogTrigger asChild>
                <Button 
                  variant="outline" 
                  className="flex-1"
                  data-testid={`button-view-details-${plant.id}`}
                >
                  <Eye className="w-4 h-4 mr-1" />
                  View Details
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto bg-white text-gray-900">
                <DialogHeader>
                  <DialogTitle className="text-2xl text-gray-900">
                    {plant.commonName}
                    <span className="text-base text-gray-600 italic block">
                      {plant.scientificName}
                    </span>
                  </DialogTitle>
                </DialogHeader>
                <PlantDetailsView plant={plant} />
              </DialogContent>
            </Dialog>
            
            {isInCollection ? (
              <Button
                variant="destructive"
                className="flex-1"
                onClick={() => removeFromCollectionMutation.mutate(plant.id)}
                disabled={removeFromCollectionMutation.isPending}
                data-testid={`button-remove-collection-${plant.id}`}
              >
                <Heart className="w-4 h-4 mr-1 fill-current" />
                Remove
              </Button>
            ) : (
              <Dialog>
                <DialogTrigger asChild>
                  <Button 
                    className="flex-1 bg-accent hover:bg-accent/90"
                    data-testid={`button-add-collection-${plant.id}`}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add to Garden
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-white text-gray-900">
                  <DialogHeader>
                    <DialogTitle className="text-gray-900">Add to Your Garden</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 text-gray-900">
                    <div className="flex items-center gap-3">
                      {primaryImage && (
                        <img 
                          src={primaryImage} 
                          alt={plant.commonName}
                          className="w-20 h-20 object-cover rounded-lg"
                        />
                      )}
                      <div>
                        <p className="font-semibold">{plant.commonName}</p>
                        <p className="text-sm text-muted-foreground italic">{plant.scientificName}</p>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Personal Notes</label>
                      <Textarea
                        placeholder="Where will you plant it? Any special care notes?"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={3}
                        data-testid={`textarea-notes-${plant.id}`}
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <DialogTrigger asChild>
                        <Button variant="outline">Cancel</Button>
                      </DialogTrigger>
                      <Button
                        onClick={() => addToCollectionMutation.mutate({
                          plantId: plant.id,
                          notes: notes.trim() || undefined
                        })}
                        disabled={addToCollectionMutation.isPending}
                        data-testid={`button-confirm-add-${plant.id}`}
                      >
                        {addToCollectionMutation.isPending ? "Adding..." : (
                          <>
                            <Check className="w-4 h-4 mr-1" />
                            Add to Garden
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// Enhanced Plant Details View
function PlantDetailsView({ plant }: { plant: Plant }) {
  const images = [plant.fullImage, plant.thumbnailImage, plant.detailImage].filter(Boolean);
  const [selectedImage, setSelectedImage] = useState(0);
  
  return (
    <div className="space-y-6">
      {/* Image Gallery */}
      {images.length > 0 && (
        <div className="space-y-3">
          <div className="relative h-96 rounded-lg overflow-hidden bg-gradient-to-br from-green-50 to-emerald-50">
            <img 
              src={images[selectedImage]}
              alt={plant.commonName}
              className="w-full h-full object-cover"
            />
          </div>
          {images.length > 1 && (
            <div className="flex gap-2 justify-center">
              {images.map((img, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedImage(index)}
                  className={`relative w-20 h-20 rounded-lg overflow-hidden border-2 transition-all ${
                    selectedImage === index ? 'border-accent' : 'border-transparent'
                  }`}
                >
                  <img 
                    src={img}
                    alt={`${plant.commonName} ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      
      {/* Botanical Information */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
              <Info className="w-5 h-5 text-accent" />
              Botanical Details
            </h3>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Scientific Name:</dt>
                <dd className="font-medium italic">{plant.scientificName}</dd>
              </div>
              {plant.family && (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Family:</dt>
                  <dd className="font-medium">{plant.family}</dd>
                </div>
              )}
              {plant.type && (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Type:</dt>
                  <dd className="font-medium">{plant.type}</dd>
                </div>
              )}
              {plant.cycle && (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Life Cycle:</dt>
                  <dd className="font-medium">{plant.cycle}</dd>
                </div>
              )}
            </dl>
          </div>
          
          <div>
            <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
              <TreePine className="w-5 h-5 text-accent" />
              Growing Conditions
            </h3>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Sun:</dt>
                <dd className="font-medium">{plant.sun_requirements?.replace(/_/g, ' ')}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Water:</dt>
                <dd className="font-medium">{plant.water_requirements || 'Moderate'}</dd>
              </div>
              {plant.hardiness_zones && (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Hardiness Zones:</dt>
                  <dd className="font-medium">{plant.hardiness_zones}</dd>
                </div>
              )}
              {plant.mature_height && (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Mature Height:</dt>
                  <dd className="font-medium">{plant.mature_height}</dd>
                </div>
              )}
            </dl>
          </div>
        </div>
        
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
              <Flower2 className="w-5 h-5 text-accent" />
              Ornamental Features
            </h3>
            <dl className="space-y-2 text-sm">
              {plant.bloom_time && (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Bloom Time:</dt>
                  <dd className="font-medium">{plant.bloom_time}</dd>
                </div>
              )}
              {plant.bloom_color && (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Flower Color:</dt>
                  <dd className="font-medium">{plant.bloom_color}</dd>
                </div>
              )}
              {plant.foliage && (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Foliage Type:</dt>
                  <dd className="font-medium">{plant.foliage}</dd>
                </div>
              )}
            </dl>
          </div>
          
          <div>
            <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
              <Shield className="w-5 h-5 text-accent" />
              Special Characteristics
            </h3>
            <div className="flex flex-wrap gap-2">
              {plant.pet_safe && (
                <Badge className="bg-green-100 text-green-700">Pet Safe</Badge>
              )}
              {plant.drought_tolerant && (
                <Badge className="bg-blue-100 text-blue-700">Drought Tolerant</Badge>
              )}
              {plant.deer_resistant && (
                <Badge className="bg-amber-100 text-amber-700">Deer Resistant</Badge>
              )}
              {plant.fragrant && (
                <Badge className="bg-purple-100 text-purple-700">Fragrant</Badge>
              )}
              {plant.attracts_pollinators && (
                <Badge className="bg-yellow-100 text-yellow-700">Attracts Pollinators</Badge>
              )}
              {plant.native_origin && (
                <Badge className="bg-emerald-100 text-emerald-700">Native: {plant.native_origin}</Badge>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Care Instructions */}
      {(plant.care_notes || plant.planting_instructions) && (
        <div className="space-y-4 pt-4 border-t">
          {plant.care_notes && (
            <div>
              <h3 className="font-semibold text-lg mb-2">Care Instructions</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {plant.care_notes}
              </p>
            </div>
          )}
          {plant.planting_instructions && (
            <div>
              <h3 className="font-semibold text-lg mb-2">Planting Guide</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {plant.planting_instructions}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}