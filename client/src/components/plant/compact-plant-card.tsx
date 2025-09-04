import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Eye,
  Plus,
  Heart,
  Settings,
  Edit,
  Trash,
  ImageIcon,
  Check,
  X,
  Loader2,
  Sun,
  CloudSun,
  Cloud,
  Droplets,
  MapPin,
  Shield
} from "lucide-react";
import type { Plant } from "@/types/plant";

interface CompactPlantCardProps {
  plant: Plant;
  isAdmin?: boolean;
  isInCollection?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  onVerify?: () => void;
  onReject?: () => void;
  onGenerateImages?: () => void;
}

export function CompactPlantCard({ 
  plant,
  isAdmin = false,
  isInCollection = false,
  onEdit,
  onDelete,
  onVerify,
  onReject,
  onGenerateImages
}: CompactPlantCardProps) {
  const [showAdminDialog, setShowAdminDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [notes, setNotes] = useState("");
  const [imageLoaded, setImageLoaded] = useState(false);
  const { toast } = useToast();

  const primaryImage = plant.fullImage || plant.thumbnailImage;
  const secondaryImage = plant.detailImage || plant.thumbnailImage;

  const addToCollectionMutation = useMutation({
    mutationFn: async (data: { plantId: string; notes?: string }) => {
      const response = await apiRequest("POST", "/api/my-collection", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Added to Collection",
        description: `${plant.commonName} has been added to your garden!`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/my-collection"] });
      setShowAddDialog(false);
    }
  });

  const removeFromCollectionMutation = useMutation({
    mutationFn: async (plantId: string) => {
      await apiRequest("DELETE", `/api/my-collection/${plantId}`);
    },
    onSuccess: () => {
      toast({
        title: "Removed",
        description: `${plant.commonName} removed from collection.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/my-collection"] });
    }
  });

  const getSunIcon = () => {
    // Handle both string and array formats from database
    const sunlight = Array.isArray(plant.sunlight) ? plant.sunlight[0] : plant.sunlight;
    if (!sunlight) return null;
    
    if (sunlight.includes('full sun')) return <Sun className="w-3 h-3 text-yellow-500" />;
    if (sunlight.includes('partial')) return <CloudSun className="w-3 h-3 text-yellow-400" />;
    if (sunlight.includes('shade')) return <Cloud className="w-3 h-3 text-gray-400" />;
    return null;
  };

  return (
    <>
      <Card className="group overflow-hidden hover:shadow-lg transition-shadow h-[280px] relative">
        {/* Image - 70% of card height */}
        <div className="relative h-[196px] bg-gradient-to-br from-green-50 to-emerald-50 overflow-hidden">
          {primaryImage ? (
            <img 
              src={primaryImage}
              alt={plant.commonName}
              className={`w-full h-full object-cover ${imageLoaded ? 'opacity-100' : 'opacity-0'} transition-opacity`}
              onLoad={() => setImageLoaded(true)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-muted">
              <ImageIcon className="w-12 h-12 text-muted-foreground" />
            </div>
          )}
          
          {/* Admin button - only visible in admin mode */}
          {isAdmin && (
            <Button
              size="sm"
              variant="secondary"
              className="absolute top-2 right-2 h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => setShowAdminDialog(true)}
            >
              <Settings className="w-4 h-4" />
            </Button>
          )}
          
          {/* Collection badge */}
          {isInCollection && (
            <div className="absolute top-2 left-2">
              <Heart className="w-5 h-5 text-white fill-white drop-shadow" />
            </div>
          )}
        </div>

        {/* Info - 30% of card height */}
        <div className="p-2 h-[84px] flex flex-col justify-between">
          {/* Plant name and essential info */}
          <div>
            <h3 className="font-semibold text-sm leading-tight">
              {plant.scientificName || 'Unknown Species'}
            </h3>
            <p className="text-xs text-muted-foreground">
              {plant.commonName || 'Unknown Plant'}
            </p>
            
            {/* Quick info in one line */}
            <div className="flex items-center gap-2 mt-1">
              {getSunIcon()}
              {plant.watering && (
                <Droplets className="w-3 h-3 text-blue-500" />
              )}
              {plant.hardiness && (
                <span className="text-xs text-muted-foreground">
                  Z{plant.hardiness}
                </span>
              )}
              {plant.poisonousToPets === 0 && (
                <Shield className="w-3 h-3 text-green-500" />
              )}
              {plant.type && (
                <span className="text-xs text-muted-foreground capitalize">
                  {plant.type}
                </span>
              )}
            </div>
          </div>
          
          {/* Action buttons */}
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="outline"
              className="flex-1 h-7 text-xs"
              onClick={() => setShowDetailsDialog(true)}
            >
              <Eye className="w-3 h-3 mr-1" />
              Details
            </Button>
            {!isInCollection ? (
              <Button
                size="sm"
                className="flex-1 h-7 text-xs"
                onClick={() => setShowAddDialog(true)}
              >
                <Plus className="w-3 h-3 mr-1" />
                Add
              </Button>
            ) : (
              <Button
                size="sm"
                variant="destructive"
                className="flex-1 h-7 text-xs"
                onClick={() => removeFromCollectionMutation.mutate(plant.id)}
              >
                <Heart className="w-3 h-3 mr-1 fill-current" />
                Remove
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Admin Dialog */}
      {isAdmin && (
        <Dialog open={showAdminDialog} onOpenChange={setShowAdminDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Admin Controls</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">{plant.scientificName}</h4>
                <p className="text-sm text-muted-foreground">{plant.commonName}</p>
              </div>
              
              {plant.verificationStatus && (
                <Badge variant={
                  plant.verificationStatus === 'verified' ? 'default' : 
                  plant.verificationStatus === 'pending' ? 'outline' : 'destructive'
                }>
                  Status: {plant.verificationStatus}
                </Badge>
              )}

              <div className="grid grid-cols-2 gap-2">
                {plant.verificationStatus === 'pending' && (
                  <>
                    <Button onClick={onVerify} className="w-full">
                      <Check className="w-4 h-4 mr-1" />
                      Verify
                    </Button>
                    <Button onClick={onReject} variant="destructive" className="w-full">
                      <X className="w-4 h-4 mr-1" />
                      Reject
                    </Button>
                  </>
                )}
                {plant.verificationStatus === 'verified' && (
                  <>
                    <Button onClick={onEdit} variant="outline" className="w-full">
                      <Edit className="w-4 h-4 mr-1" />
                      Edit
                    </Button>
                    <Button 
                      onClick={onGenerateImages}
                      variant="outline"
                      disabled={plant.imageGenerationStatus === "generating"}
                      className="w-full"
                    >
                      {plant.imageGenerationStatus === "generating" ? (
                        <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Generating</>
                      ) : (
                        <><ImageIcon className="w-4 h-4 mr-1" /> Generate</>
                      )}
                    </Button>
                  </>
                )}
              </div>
              
              <Button onClick={onDelete} variant="destructive" className="w-full">
                <Trash className="w-4 h-4 mr-1" />
                Delete Plant
              </Button>

              {plant.dataSource && (
                <p className="text-xs text-muted-foreground text-center">
                  Source: {plant.dataSource} {plant.perenualId && `#${plant.perenualId}`}
                </p>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {plant.scientificName || 'Unknown Species'}
              <span className="text-sm font-normal text-muted-foreground block">
                {plant.commonName || 'Unknown Plant'}
              </span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Images */}
            {(primaryImage || secondaryImage) && (
              <div className="grid grid-cols-2 gap-2">
                {primaryImage && (
                  <img 
                    src={primaryImage}
                    alt={plant.commonName}
                    className="w-full h-48 object-cover rounded-lg"
                  />
                )}
                {secondaryImage && secondaryImage !== primaryImage && (
                  <img 
                    src={secondaryImage}
                    alt={`${plant.commonName} detail`}
                    className="w-full h-48 object-cover rounded-lg"
                  />
                )}
              </div>
            )}
            
            {/* Plant Details Grid */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              {plant.family && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Family:</span>
                  <span>{plant.family}</span>
                </div>
              )}
              {plant.type && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Type:</span>
                  <span>{plant.type}</span>
                </div>
              )}
              {plant.sunlight && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Sun:</span>
                  <span>{Array.isArray(plant.sunlight) ? plant.sunlight.join(', ') : plant.sunlight}</span>
                </div>
              )}
              {plant.watering && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Water:</span>
                  <span>{plant.watering}</span>
                </div>
              )}
              {plant.hardiness && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Zones:</span>
                  <span>{plant.hardiness}</span>
                </div>
              )}
              {plant.dimension && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Size:</span>
                  <span>{typeof plant.dimension === 'object' ? 
                    `${plant.dimension.height || ''} ${plant.dimension.spread ? `× ${plant.dimension.spread}` : ''}`.trim() : 
                    plant.dimension}</span>
                </div>
              )}
              {plant.floweringSeason && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Bloom:</span>
                  <span>{plant.floweringSeason}</span>
                </div>
              )}
              {plant.flowerColor && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Flowers:</span>
                  <span>{Array.isArray(plant.flowerColor) ? plant.flowerColor.join(', ') : plant.flowerColor}</span>
                </div>
              )}
            </div>
            
            {/* Features */}
            <div className="flex flex-wrap gap-1">
              {plant.poisonousToPets === 0 && <Badge variant="outline" className="text-xs">Pet Safe</Badge>}
              {plant.droughtTolerant && <Badge variant="outline" className="text-xs">Drought Tolerant</Badge>}
              {plant.saltTolerant && <Badge variant="outline" className="text-xs">Salt Tolerant</Badge>}
              {plant.medicinal && <Badge variant="outline" className="text-xs">Medicinal</Badge>}
              {plant.cuisine && <Badge variant="outline" className="text-xs">Culinary</Badge>}
              {plant.attracts && Array.isArray(plant.attracts) && plant.attracts.length > 0 && 
                <Badge variant="outline" className="text-xs">Attracts: {plant.attracts.join(', ')}</Badge>}
            </div>
            
            {/* Description */}
            {plant.description && (
              <div>
                <h4 className="font-medium mb-1">Description</h4>
                <p className="text-sm text-muted-foreground">{plant.description}</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Add to Collection Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add to Garden</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p>Add <strong>{plant.commonName}</strong> to your collection?</p>
            <div>
              <label className="block text-sm font-medium mb-2">Notes (optional)</label>
              <Textarea
                placeholder="Where will you plant it?"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowAddDialog(false)} className="flex-1">
                Cancel
              </Button>
              <Button
                onClick={() => addToCollectionMutation.mutate({
                  plantId: plant.id,
                  notes: notes.trim() || undefined
                })}
                disabled={addToCollectionMutation.isPending}
                className="flex-1"
              >
                {addToCollectionMutation.isPending ? "Adding..." : "Add to Garden"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}