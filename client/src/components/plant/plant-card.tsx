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
import { 
  Heart, 
  Sun, 
  Cloud, 
  CloudSun, 
  Eye, 
  Plus, 
  Minus,
  Droplets,
  Shield,
  Baby,
  Flower,
  Info
} from "lucide-react";
import type { Plant } from "@/types/plant";

interface PlantCardProps {
  plant: Plant;
  viewMode: "grid" | "list";
  showActions?: boolean;
  isInCollection?: boolean;
  collectionNotes?: string;
}

export default function PlantCard({ 
  plant, 
  viewMode, 
  showActions = true, 
  isInCollection = false,
  collectionNotes 
}: PlantCardProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [notes, setNotes] = useState(collectionNotes || "");
  const { toast } = useToast();

  const addToCollectionMutation = useMutation({
    mutationFn: async (data: { plantId: string; notes?: string }) => {
      const response = await apiRequest("POST", "/api/my-collection", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Added to Collection",
        description: `${plant.commonName} has been added to your collection!`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/my-collection"] });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
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
        description: `${plant.commonName} has been removed from your collection.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/my-collection"] });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
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

  const getSunIcon = (sunRequirement?: string) => {
    switch (sunRequirement) {
      case "full_sun":
        return <Sun className="w-4 h-4 text-canary" />;
      case "partial_sun":
        return <CloudSun className="w-4 h-4 text-canary" />;
      case "partial_shade":
        return <CloudSun className="w-4 h-4 text-muted-foreground" />;
      case "full_shade":
        return <Cloud className="w-4 h-4 text-muted-foreground" />;
      default:
        return <Sun className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getSunLabel = (sunRequirement?: string) => {
    switch (sunRequirement) {
      case "full_sun":
        return "Full Sun";
      case "partial_sun":
        return "Partial Sun";
      case "partial_shade":
        return "Partial Shade";
      case "full_shade":
        return "Full Shade";
      default:
        return "Unknown";
    }
  };

  const handleAddToCollection = () => {
    addToCollectionMutation.mutate({
      plantId: plant.id,
      notes: notes.trim() || undefined,
    });
  };

  const handleRemoveFromCollection = () => {
    removeFromCollectionMutation.mutate(plant.id);
  };

  if (viewMode === "list") {
    return (
      <Card className="plant-card-hover" data-testid={`plant-card-${plant.id}`}>
        <CardContent className="p-4">
          <div className="flex items-center space-x-4">
            {/* Plant Image/Icon */}
            <div className="w-16 h-16 bg-accent/20 rounded-lg flex items-center justify-center flex-shrink-0">
              {plant.image_url ? (
                <img 
                  src={plant.image_url} 
                  alt={plant.commonName}
                  className="w-full h-full object-cover rounded-lg"
                />
              ) : (
                <Flower className="w-8 h-8 text-accent" />
              )}
            </div>

            {/* Plant Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="font-semibold text-lg truncate" data-testid={`text-plant-name-${plant.id}`}>
                    {plant.commonName}
                  </h3>
                  <p className="text-sm text-muted-foreground italic" data-testid={`text-plant-scientific-${plant.id}`}>
                    {plant.scientificName}
                  </p>
                </div>
                {isInCollection && (
                  <Badge variant="default" className="bg-accent" data-testid={`badge-in-collection-${plant.id}`}>
                    <Heart className="w-3 h-3 mr-1" />
                    In Collection
                  </Badge>
                )}
              </div>

              <div className="flex flex-wrap gap-2 mb-3">
                {plant.type && (
                  <Badge variant="outline" data-testid={`badge-plant-type-${plant.id}`}>
                    {plant.type}
                  </Badge>
                )}
                {plant.hardiness_zones && (
                  <Badge variant="secondary" data-testid={`badge-hardiness-${plant.id}`}>
                    {plant.hardiness_zones}
                  </Badge>
                )}
                {plant.pet_safe && (
                  <Badge variant="outline" className="text-accent border-accent" data-testid={`badge-pet-safe-${plant.id}`}>
                    <Shield className="w-3 h-3 mr-1" />
                    Pet Safe
                  </Badge>
                )}
                {plant.fragrant && (
                  <Badge variant="outline" className="text-secondary border-secondary" data-testid={`badge-fragrant-${plant.id}`}>
                    Fragrant
                  </Badge>
                )}
              </div>

              {collectionNotes && (
                <p className="text-sm text-muted-foreground mb-2" data-testid={`text-collection-notes-${plant.id}`}>
                  <strong>Notes:</strong> {collectionNotes}
                </p>
              )}
            </div>

            {/* Actions */}
            {showActions && (
              <div className="flex flex-col space-y-2">
                <div className="flex items-center space-x-2">
                  {getSunIcon(plant.sun_requirements)}
                  <span className="text-sm text-muted-foreground">
                    {getSunLabel(plant.sun_requirements)}
                  </span>
                </div>

                <div className="flex space-x-2">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="outline" data-testid={`button-view-details-${plant.id}`}>
                        <Info className="w-4 h-4 mr-1" />
                        Details
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>{plant.commonName}</DialogTitle>
                      </DialogHeader>
                      <PlantDetailsContent plant={plant} />
                    </DialogContent>
                  </Dialog>

                  {isInCollection ? (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={handleRemoveFromCollection}
                      disabled={removeFromCollectionMutation.isPending}
                      data-testid={`button-remove-collection-${plant.id}`}
                    >
                      <Minus className="w-4 h-4 mr-1" />
                      Remove
                    </Button>
                  ) : (
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button size="sm" data-testid={`button-add-collection-${plant.id}`}>
                          <Plus className="w-4 h-4 mr-1" />
                          Add
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Add to Collection</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <p>Add <strong>{plant.commonName}</strong> to your plant collection?</p>
                          <div>
                            <label className="block text-sm font-medium mb-2">Notes (optional)</label>
                            <Textarea
                              placeholder="Add personal notes about this plant..."
                              value={notes}
                              onChange={(e) => setNotes(e.target.value)}
                              rows={3}
                              data-testid={`textarea-plant-notes-${plant.id}`}
                            />
                          </div>
                          <div className="flex justify-end space-x-2">
                            <DialogTrigger asChild>
                              <Button variant="outline">Cancel</Button>
                            </DialogTrigger>
                            <Button
                              onClick={handleAddToCollection}
                              disabled={addToCollectionMutation.isPending}
                              data-testid={`button-confirm-add-${plant.id}`}
                            >
                              {addToCollectionMutation.isPending ? "Adding..." : "Add to Collection"}
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Grid view
  return (
    <Card className="plant-card-hover overflow-hidden" data-testid={`plant-card-${plant.id}`}>
      {/* Plant Image */}
      <div className="h-48 bg-muted relative">
        {plant.image_url ? (
          <img 
            src={plant.image_url} 
            alt={plant.commonName}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Flower className="w-16 h-16 text-muted-foreground" />
          </div>
        )}
        {isInCollection && (
          <Badge className="absolute top-2 right-2 bg-accent" data-testid={`badge-grid-in-collection-${plant.id}`}>
            <Heart className="w-3 h-3 mr-1" />
            Saved
          </Badge>
        )}
      </div>

      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-2">
          <h3 className="font-semibold text-lg truncate" data-testid={`text-grid-plant-name-${plant.id}`}>
            {plant.commonName}
          </h3>
        </div>
        
        <p className="text-sm text-muted-foreground italic mb-3 truncate" data-testid={`text-grid-plant-scientific-${plant.id}`}>
          {plant.scientificName}
        </p>

        <div className="flex flex-wrap gap-1 mb-4">
          {plant.type && (
            <Badge variant="outline" className="text-xs" data-testid={`badge-grid-plant-type-${plant.id}`}>
              {plant.type}
            </Badge>
          )}
          {plant.hardiness_zones && (
            <Badge variant="secondary" className="text-xs" data-testid={`badge-grid-hardiness-${plant.id}`}>
              {plant.hardiness_zones}
            </Badge>
          )}
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1">
            {getSunIcon(plant.sun_requirements)}
            <span className="text-sm text-muted-foreground">
              {getSunLabel(plant.sun_requirements)}
            </span>
          </div>

          {showActions && (
            <div className="flex space-x-1">
              <Dialog>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline" data-testid={`button-grid-view-details-${plant.id}`}>
                    <Eye className="w-4 h-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>{plant.commonName}</DialogTitle>
                  </DialogHeader>
                  <PlantDetailsContent plant={plant} />
                </DialogContent>
              </Dialog>

              {isInCollection ? (
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={handleRemoveFromCollection}
                  disabled={removeFromCollectionMutation.isPending}
                  data-testid={`button-grid-remove-collection-${plant.id}`}
                >
                  <Heart className="w-4 h-4" />
                </Button>
              ) : (
                <Dialog>
                  <DialogTrigger asChild>
                    <Button size="sm" data-testid={`button-grid-add-collection-${plant.id}`}>
                      <Plus className="w-4 h-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add to Collection</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <p>Add <strong>{plant.commonName}</strong> to your plant collection?</p>
                      <div>
                        <label className="block text-sm font-medium mb-2">Notes (optional)</label>
                        <Textarea
                          placeholder="Add personal notes about this plant..."
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          rows={3}
                          data-testid={`textarea-grid-plant-notes-${plant.id}`}
                        />
                      </div>
                      <div className="flex justify-end space-x-2">
                        <DialogTrigger asChild>
                          <Button variant="outline">Cancel</Button>
                        </DialogTrigger>
                        <Button
                          onClick={handleAddToCollection}
                          disabled={addToCollectionMutation.isPending}
                          data-testid={`button-grid-confirm-add-${plant.id}`}
                        >
                          {addToCollectionMutation.isPending ? "Adding..." : "Add to Collection"}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          )}
        </div>

        {collectionNotes && (
          <div className="mt-3 p-2 bg-muted rounded text-xs" data-testid={`text-grid-collection-notes-${plant.id}`}>
            <strong>Notes:</strong> {collectionNotes}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function PlantDetailsContent({ plant }: { plant: Plant }) {
  return (
    <div className="space-y-6" data-testid={`plant-details-${plant.id}`}>
      {/* Basic Info */}
      <div>
        <h3 className="font-semibold mb-3">Basic Information</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Scientific Name:</span>
            <p className="font-medium italic">{plant.scientificName}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Common Name:</span>
            <p className="font-medium">{plant.commonName}</p>
          </div>
          {plant.family && (
            <div>
              <span className="text-muted-foreground">Family:</span>
              <p className="font-medium">{plant.family}</p>
            </div>
          )}
          {plant.type && (
            <div>
              <span className="text-muted-foreground">Type:</span>
              <p className="font-medium capitalize">{plant.type}</p>
            </div>
          )}
        </div>
      </div>

      {/* Growing Conditions */}
      <div>
        <h3 className="font-semibold mb-3">Growing Conditions</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Sun Requirements:</span>
            <p className="font-medium">{plant.sun_requirements?.replace('_', ' ') || 'Unknown'}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Hardiness Zones:</span>
            <p className="font-medium">{plant.hardiness_zones || 'Unknown'}</p>
          </div>
          {plant.water_requirements && (
            <div>
              <span className="text-muted-foreground">Water Needs:</span>
              <p className="font-medium">{plant.water_requirements}</p>
            </div>
          )}
          {plant.mature_height && (
            <div>
              <span className="text-muted-foreground">Mature Height:</span>
              <p className="font-medium">{plant.mature_height}</p>
            </div>
          )}
        </div>
      </div>

      {/* Plant Features */}
      <div>
        <h3 className="font-semibold mb-3">Plant Features</h3>
        <div className="flex flex-wrap gap-2">
          {plant.pet_safe && (
            <Badge variant="outline" className="text-accent border-accent">
              <Shield className="w-3 h-3 mr-1" />
              Pet Safe
            </Badge>
          )}
          {!plant.toxic_to_children && (
            <Badge variant="outline" className="text-secondary border-secondary">
              <Baby className="w-3 h-3 mr-1" />
              Child Safe
            </Badge>
          )}
          {plant.fragrant && (
            <Badge variant="outline">Fragrant</Badge>
          )}
          {plant.deer_resistant && (
            <Badge variant="outline">Deer Resistant</Badge>
          )}
          {plant.drought_tolerant && (
            <Badge variant="outline">
              <Droplets className="w-3 h-3 mr-1" />
              Drought Tolerant
            </Badge>
          )}
          {plant.attracts_pollinators && (
            <Badge variant="outline">Attracts Pollinators</Badge>
          )}
        </div>
      </div>

      {/* Bloom Information */}
      {(plant.bloom_time || plant.bloom_color) && (
        <div>
          <h3 className="font-semibold mb-3">Bloom Information</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            {plant.bloom_time && (
              <div>
                <span className="text-muted-foreground">Bloom Time:</span>
                <p className="font-medium">{plant.bloom_time}</p>
              </div>
            )}
            {plant.bloom_color && (
              <div>
                <span className="text-muted-foreground">Bloom Color:</span>
                <p className="font-medium">{plant.bloom_color}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Care Notes */}
      {plant.care_notes && (
        <div>
          <h3 className="font-semibold mb-3">Care Notes</h3>
          <p className="text-sm text-muted-foreground">{plant.care_notes}</p>
        </div>
      )}

      {/* Planting Instructions */}
      {plant.planting_instructions && (
        <div>
          <h3 className="font-semibold mb-3">Planting Instructions</h3>
          <p className="text-sm text-muted-foreground">{plant.planting_instructions}</p>
        </div>
      )}
    </div>
  );
}
