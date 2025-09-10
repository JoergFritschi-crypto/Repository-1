import { useState, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
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
  Shield,
  AlertTriangle,
  RefreshCw,
  Sparkles,
  Printer,
  Share2,
  Download
} from "lucide-react";
import type { Plant } from "@/types/plant";

interface CompactPlantCardProps {
  plant: Plant;
  isAdmin?: boolean;
  isInCollection?: boolean;
  hideActions?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  onVerify?: () => void;
  onReject?: () => void;
  onGenerateImages?: () => void;}

// Convert feet string to meters (e.g., "2-3 feet" -> "0.6-0.9 m")
function convertFeetToMeters(measurement: string): string {
  if (!measurement) return '';
  
  // Handle different formats: "2-3 feet", "3 feet", "2-3 ft", etc.
  const feetMatch = measurement.match(/([\d.]+)(?:\s*-\s*([\d.]+))?\s*(?:feet|foot|ft)/i);
  if (feetMatch) {
    const min = parseFloat(feetMatch[1]);
    const max = feetMatch[2] ? parseFloat(feetMatch[2]) : min;
    
    const minMeters = (min * 0.3048).toFixed(1);
    const maxMeters = (max * 0.3048).toFixed(1);
    
    if (min === max) {
      return `${minMeters} m`;
    } else {
      return `${minMeters}-${maxMeters} m`;
    }
  }
  
  // If already in meters or other format, return as-is
  return measurement;
}

// Convert USDA zones to 4-tier hardiness system
function getHardinessCategory(hardiness: string | undefined): string | null {
  if (!hardiness) return null;
  
  // Extract the lowest zone number (e.g., "5-8" → 5)
  const match = hardiness.match(/\d+/);
  if (!match) return null;
  
  const lowestZone = parseInt(match[0]);
  
  // Map USDA zones to 4-tier system based on minimum survivable temperature
  // Zones 1-5: Very Hardy (<-10°C)
  // Zones 6-7: Hardy (-10 to -5°C)  
  // Zones 8-9: Half Hardy (-5 to 0°C)
  // Zones 10+: Tender (>0°C)
  
  if (lowestZone <= 5) return "Very Hardy";
  if (lowestZone <= 7) return "Hardy";
  if (lowestZone <= 9) return "Half Hardy";
  return "Tender";
}

// Get badge color for hardiness category
function getHardinessBadgeColor(category: string | null): string {
  switch (category) {
    case "Very Hardy": return "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300";
    case "Hardy": return "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300";
    case "Half Hardy": return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300";
    case "Tender": return "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300";
    default: return "bg-muted text-muted-foreground";
  }
}

// Get flower color class
function getFlowerColorClass(color: string): string {
  const colorLower = color?.toLowerCase() || '';
  
  if (colorLower.includes('purple') || colorLower.includes('violet')) return 'bg-purple-500';
  if (colorLower.includes('blue')) return 'bg-blue-500';
  if (colorLower.includes('pink')) return 'bg-pink-500';
  if (colorLower.includes('red')) return 'bg-red-500';
  if (colorLower.includes('orange')) return 'bg-orange-500';
  if (colorLower.includes('yellow') || colorLower.includes('gold')) return 'bg-yellow-500';
  if (colorLower.includes('white')) return 'bg-white';
  if (colorLower.includes('lavender')) return 'bg-purple-300';
  if (colorLower.includes('green')) return 'bg-green-500';
  
  return 'bg-gray-400';
}

// Get plant size category based on maximum height
function getSizeCategory(heightMaxCm: number | null | undefined): {
  category: string;
  label: string;
  color: string;
  icon: string;
} | null {
  if (!heightMaxCm || heightMaxCm <= 0) return null;
  
  // Convert cm to meters for comparison
  const heightM = heightMaxCm / 100;
  
  if (heightM <= 2) {
    return {
      category: 'compact',
      label: 'Compact',
      color: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
      icon: '🌱'
    };
  } else if (heightM <= 5) {
    return {
      category: 'standard',
      label: 'Standard',
      color: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
      icon: '🌿'
    };
  } else if (heightM <= 10) {
    return {
      category: 'medium',
      label: 'Medium Tree',
      color: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
      icon: '🌳'
    };
  } else if (heightM <= 20) {
    return {
      category: 'large',
      label: 'Large Tree',
      color: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
      icon: '🌲'
    };
  } else {
    return {
      category: 'giant',
      label: 'Giant Tree',
      color: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
      icon: '🌴'
    };
  }
}

export function CompactPlantCard({ 
  plant,
  isAdmin = false,
  isInCollection = false,
  hideActions = false,
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
  const [isValidating, setIsValidating] = useState(false);
  const [isGeneratingImages, setIsGeneratingImages] = useState(false);
  const { toast } = useToast();

  const primaryImage = plant.fullImage || plant.thumbnailImage;
  const secondaryImage = plant.detailImage || plant.thumbnailImage;

  const addToCollectionMutation = useMutation({
    mutationFn: async (data: { plantId: string; notes?: string }) => {
      const response = await apiRequest("POST", "/api/my-collection", data);
      if (!response.ok) {
        const error = await response.json();
        throw error;
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Added to Collection",
        description: `${plant.commonName} has been added to your garden!`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/my-collection"] });
      queryClient.invalidateQueries({ queryKey: ["/api/my-collection/limits"] });
      setShowAddDialog(false);
    },
    onError: (error: any) => {
      if (error.code === 'COLLECTION_LIMIT_REACHED') {
        toast({
          title: "Collection Limit Reached",
          description: error.message,
          variant: "destructive",
          action: (
            <Button 
              variant="secondary" 
              size="sm"
              onClick={() => window.location.href = '/pricing'}
            >
              Upgrade to Premium
            </Button>
          )
        });
      } else if (error.code === 'DUPLICATE_PLANT') {
        toast({
          title: "Already in Collection",
          description: "This plant is already in your collection.",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Failed to Add",
          description: error.message || "Could not add plant to collection",
          variant: "destructive"
        });
      }
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

  const handlePrint = () => {
    const printContent = document.getElementById('plant-detail-card');
    if (!printContent) return;
    
    const originalContents = document.body.innerHTML;
    const printContents = printContent.innerHTML;
    
    document.body.innerHTML = `
      <html>
        <head>
          <title>${plant.commonName || 'Plant'} - ${plant.scientificName || ''}</title>
          <style>
            @media print {
              body { margin: 0; padding: 20px; font-family: system-ui; }
              .print\\:hidden { display: none !important; }
              img { max-width: 100%; height: auto; }
            }
          </style>
        </head>
        <body>
          ${printContents}
        </body>
      </html>
    `;
    
    window.print();
    document.body.innerHTML = originalContents;
    window.location.reload();
  };
  
  const handleShare = async () => {
    const shareData = {
      title: plant.commonName || 'Plant',
      text: `Check out ${plant.commonName} (${plant.scientificName})`,
      url: window.location.href
    };
    
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        // Fallback: copy to clipboard
        await navigator.clipboard.writeText(window.location.href);
        toast({
          title: "Link Copied",
          description: "Plant link copied to clipboard!",
        });
      }
    } catch (err) {
      console.error('Error sharing:', err);
    }
  };
  
  const handleSave = async () => {
    const element = document.getElementById('plant-detail-card');
    if (!element) return;
    
    try {
      // Hide action buttons for screenshot
      const buttons = element.querySelectorAll('.print\\:hidden');
      buttons.forEach(btn => (btn as HTMLElement).style.display = 'none');
      
      const canvas = await html2canvas(element, {
        backgroundColor: '#ffffff',
        scale: 2,
        logging: false
      });
      
      // Restore buttons
      buttons.forEach(btn => (btn as HTMLElement).style.display = '');
      
      // Convert to image and download
      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${plant.commonName || 'plant'}-${plant.scientificName || 'info'}.png`.replace(/\s+/g, '-');
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        toast({
          title: "Image Saved",
          description: "Plant card saved as image!",
        });
      });
    } catch (err) {
      console.error('Error saving image:', err);
      toast({
        title: "Save Failed",
        description: "Could not save plant card",
        variant: "destructive"
      });
    }
  };
  
  const validatePlantData = async () => {
    setIsValidating(true);
    try {
      const response = await apiRequest("POST", `/api/admin/plants/${plant.id}/validate`);
      const result = await response.json();
      
      toast({
        title: "✓ Validation Complete",
        description: `Updated ${result.updatedFields} fields for ${plant.commonName}`,
      });
      
      // Refresh plant data
      queryClient.invalidateQueries({ queryKey: ["/api/plants"] });
      queryClient.invalidateQueries({ queryKey: ["/api/plants/search"] });
      setShowAdminDialog(false);
    } catch (error) {
      toast({
        title: "Validation Failed",
        description: "Could not validate plant data",
        variant: "destructive"
      });
    } finally {
      setIsValidating(false);
    }
  };

  const generatePlantImages = async () => {
    setIsGeneratingImages(true);
    try {
      const response = await apiRequest("POST", `/api/admin/plants/${plant.id}/generate-images`);
      const result = await response.json();
      
      toast({
        title: "✓ Images Generated",
        description: `Generated new images for ${plant.commonName}`,
      });
      
      // Refresh plant data to show new images
      queryClient.invalidateQueries({ queryKey: ["/api/plants"] });
      queryClient.invalidateQueries({ queryKey: ["/api/plants/search"] });
      setShowAdminDialog(false);
    } catch (error) {
      toast({
        title: "Image Generation Failed",
        description: "Could not generate images",
        variant: "destructive"
      });
    } finally {
      setIsGeneratingImages(false);
    }
  };

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
      <Card className={`group overflow-hidden hover:shadow-lg transition-all relative h-[460px] flex flex-col border-2 ${
        isAdmin && plant.verificationStatus === 'verified' 
          ? 'border-green-500 shadow-green-100' 
          : isAdmin && plant.verificationStatus === 'pending'
          ? 'border-yellow-500 shadow-yellow-100'
          : 'border-[#004025]'
      } hover:border-[#004025]/80`}>
        {/* Image section */}
        <div className="relative h-80 bg-gradient-to-br from-green-50 to-emerald-50 overflow-hidden">
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
          
          {/* Admin button - always visible in admin mode */}
          {isAdmin && (
            <>
              <Button
                size="sm"
                variant="secondary"
                className="absolute top-2 right-2 h-7 w-7 p-0 bg-white/80 hover:bg-white shadow-sm"
                onClick={() => setShowAdminDialog(true)}
              >
                <Settings className="w-4 h-4" />
              </Button>
              
              {/* Verified indicator - only visible for admin */}
              {plant.verificationStatus === 'verified' && (
                <div className="absolute top-2 right-12 bg-green-500 text-white px-2 py-1 rounded-md shadow-sm flex items-center gap-1">
                  <Check className="w-3 h-3" />
                  <span className="text-xs font-medium">Verified</span>
                </div>
              )}
              
              {/* Pending indicator for unapproved plants */}
              {plant.verificationStatus === 'pending' && (
                <div className="absolute top-2 right-12 bg-yellow-500 text-white px-2 py-1 rounded-md shadow-sm flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  <span className="text-xs font-medium">Pending</span>
                </div>
              )}
            </>
          )}
          
          {/* Collection badge */}
          {isInCollection && (
            <div className="absolute top-2 left-2">
              <Heart className="w-5 h-5 text-white fill-white drop-shadow" />
            </div>
          )}
        </div>

        {/* Info section */}
        <div className="flex-1 p-3 flex flex-col">
          {/* Plant names - centered */}
          <div className="text-center mb-2">
            <h3 className="font-semibold text-sm leading-snug line-clamp-1">
              {plant.scientificName || 'Unknown Species'}
            </h3>
            <p className="text-xs text-muted-foreground line-clamp-1">
              {plant.commonName || 'Unknown Plant'}
            </p>
            
            {/* Quick info - centered - Show key fields with missing indicators */}
            <div className="flex flex-wrap items-center justify-center gap-1.5 flex-1">
              {/* Sun */}
              {plant.sunlight ? (
                getSunIcon()
              ) : (
                <div className="flex items-center gap-0.5">
                  <Sun className="w-3 h-3 text-gray-300" />
                  <span className="text-[10px] text-red-400">?</span>
                </div>
              )}
              
              {/* Water */}
              {plant.watering ? (
                <div className="flex items-center gap-0.5">
                  <Droplets className="w-3 h-3 text-blue-500" />
                  <span className="text-[10px] text-muted-foreground">{plant.watering}</span>
                </div>
              ) : (
                <div className="flex items-center gap-0.5">
                  <Droplets className="w-3 h-3 text-gray-300" />
                  <span className="text-[10px] text-red-400">?</span>
                </div>
              )}
              
              {/* Hardiness */}
              {plant.hardiness ? (
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${getHardinessBadgeColor(getHardinessCategory(plant.hardiness))}`}>
                  {getHardinessCategory(plant.hardiness)}
                </span>
              ) : (
                <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-gray-100 text-red-400">
                  Zone ?
                </span>
              )}
              
              {/* Flower color - only if present */}
              {plant.flowerColor && Array.isArray(plant.flowerColor) && plant.flowerColor.length > 0 && (
                <div className="flex items-center gap-0.5">
                  <div className={`w-3 h-3 rounded-full border border-gray-300 ${getFlowerColorClass(plant.flowerColor[0])}`} />
                  <span className="text-[10px] text-muted-foreground capitalize">
                    {plant.flowerColor[0]}
                  </span>
                </div>
              )}
              
              {/* Toxicity - ALWAYS show with RHS categories */}
              <div className="flex items-center gap-0.5">
                {plant.poisonousToPets === 0 ? (
                  <>
                    <Shield className="w-3 h-3 text-green-500" />
                    <span className="text-[10px] text-green-600 font-medium">C</span>
                  </>
                ) : plant.poisonousToPets === 1 ? (
                  <>
                    <AlertTriangle className="w-3 h-3 text-yellow-500" />
                    <span className="text-[10px] text-yellow-600 font-medium">B</span>
                  </>
                ) : plant.poisonousToPets === 2 ? (
                  <>
                    <AlertTriangle className="w-3 h-3 text-red-500" />
                    <span className="text-[10px] text-red-600 font-medium">A</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-3 h-3 text-gray-300" />
                    <span className="text-[10px] text-red-400">?</span>
                  </>
                )}
              </div>
              
              {/* Type - plain text display */}
              {plant.type ? (
                <span className="text-[10px] text-muted-foreground">
                  {plant.type}
                </span>
              ) : (
                <span className="text-[10px] text-red-400">
                  Type ?
                </span>
              )}
              
              {/* Size category for trees over 5m */}
              {(() => {
                const sizeInfo = getSizeCategory(plant.heightMaxCm);
                if (!sizeInfo || sizeInfo.category === 'compact' || sizeInfo.category === 'standard') {
                  return null;
                }
                return (
                  <div className="group/size relative">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${sizeInfo.color} cursor-help`}>
                      {sizeInfo.icon} {sizeInfo.label}
                    </span>
                    <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 invisible group-hover/size:visible bg-black text-white text-xs rounded px-2 py-1 whitespace-nowrap z-10">
                      Best suited for spacious gardens
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
          
          {/* Action buttons - compact, always at bottom */}
          {!hideActions && (
            <div className="flex gap-1 mt-auto">
              <Button
                size="sm"
                variant="outline"
                className="flex-1 h-6 text-[10px] px-2"
                onClick={() => setShowDetailsDialog(true)}
              >
                <Eye className="w-3 h-3 mr-0.5" />
                Details
              </Button>
              {!isInCollection ? (
                <Button
                  size="sm"
                  className="flex-1 h-6 text-[10px] px-2"
                  onClick={() => setShowAddDialog(true)}
                >
                  <Plus className="w-3 h-3 mr-0.5" />
                  Add
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="destructive"
                  className="flex-1 h-6 text-[10px] px-2"
                  onClick={() => removeFromCollectionMutation.mutate(plant.id)}
                >
                  <Heart className="w-3 h-3 mr-0.5 fill-current" />
                  Remove
                </Button>
              )}
            </div>
          )}
        </div>
      </Card>

      {/* Admin Dialog */}
      {isAdmin && (
        <Dialog open={showAdminDialog} onOpenChange={setShowAdminDialog}>
          <DialogContent className="bg-white text-gray-900">
            <DialogHeader>
              <DialogTitle className="text-gray-900">Admin Controls</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 text-gray-900">
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
                  </>
                )}
              </div>
              
              {/* Data Validation and Image Generation - Available for all plants */}
              <div className="grid grid-cols-2 gap-2">
                <Button 
                  onClick={validatePlantData}
                  variant="outline"
                  disabled={isValidating}
                  className="w-full"
                  title="Revalidate all plant data fields using AI"
                >
                  {isValidating ? (
                    <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Validating</>
                  ) : (
                    <><RefreshCw className="w-4 h-4 mr-1" /> Validate Data</>
                  )}
                </Button>
                <Button 
                  onClick={generatePlantImages}
                  variant="outline"
                  disabled={isGeneratingImages}
                  className="w-full"
                  title="Generate or replace plant images"
                >
                  {isGeneratingImages ? (
                    <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Generating</>
                  ) : (
                    <><Sparkles className="w-4 h-4 mr-1" /> Generate Images</>
                  )}
                </Button>
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
        <DialogContent className="max-w-2xl bg-white text-gray-900 print:max-w-none" id="plant-detail-card">
          <DialogHeader>
            <DialogTitle className="text-gray-900 flex justify-between items-start">
              <div>
                {plant.scientificName || 'Unknown Species'}
                <span className="text-sm font-normal text-gray-600 block">
                  {plant.commonName || 'Unknown Plant'}
                </span>
              </div>
              <div className="flex gap-2 print:hidden">
                <Button
                  size="icon"
                  variant="outline"
                  onClick={handlePrint}
                  title="Print"
                  className="h-8 w-8"
                >
                  <Printer className="w-4 h-4" />
                </Button>
                <Button
                  size="icon"
                  variant="outline"
                  onClick={handleShare}
                  title="Share"
                  className="h-8 w-8"
                >
                  <Share2 className="w-4 h-4" />
                </Button>
                <Button
                  size="icon"
                  variant="outline"
                  onClick={handleSave}
                  title="Save as Image"
                  className="h-8 w-8"
                >
                  <Download className="w-4 h-4" />
                </Button>
              </div>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-gray-900">
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
            
            {/* Plant Details Grid - ALWAYS show all fields */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-500">Family: </span>
                <span className={plant.family ? "text-gray-900" : "text-red-400"}>{plant.family || 'Missing'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Type: </span>
                <span className={plant.type ? "text-gray-900" : "text-red-400"}>{plant.type || 'Missing'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Sun: </span>
                <span className={plant.sunlight ? "text-gray-900" : "text-red-400"}>
                  {plant.sunlight ? (Array.isArray(plant.sunlight) ? plant.sunlight.join(', ') : plant.sunlight) : 'Missing'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Water: </span>
                <span className={plant.watering ? "text-gray-900" : "text-red-400"}>{plant.watering || 'Missing'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Hardiness: </span>
                {plant.hardiness ? (
                  <span>
                    <span className="font-medium text-gray-900">{getHardinessCategory(plant.hardiness)}</span>
                    <span className="text-xs text-gray-500 ml-1">(Zone {plant.hardiness})</span>
                  </span>
                ) : (
                  <span className="text-red-400">Missing</span>
                )}
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Height: </span>
                <span className={plant.heightMinCm ? "text-gray-900" : "text-red-400"}>
                  {plant.heightMinCm && plant.heightMaxCm ? 
                    (plant.heightMinCm === plant.heightMaxCm ?
                      `${(plant.heightMinCm / 100).toFixed(1)}m` :
                      `${(plant.heightMinCm / 100).toFixed(1)}-${(plant.heightMaxCm / 100).toFixed(1)}m`)
                    : 'Missing'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Spread: </span>
                <span className={plant.spreadMinCm ? "text-gray-900" : "text-red-400"}>
                  {plant.spreadMinCm && plant.spreadMaxCm ?
                    (plant.spreadMinCm === plant.spreadMaxCm ?
                      `${(plant.spreadMinCm / 100).toFixed(1)}m` :
                      `${(plant.spreadMinCm / 100).toFixed(1)}-${(plant.spreadMaxCm / 100).toFixed(1)}m`)
                    : 'Missing'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Growth Rate: </span>
                <span className={plant.growthRate ? "text-gray-900" : "text-red-400"}>{plant.growthRate || 'Missing'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Maintenance: </span>
                <span className={plant.maintenance ? "text-gray-900" : "text-red-400"}>{plant.maintenance || 'Missing'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Bloom: </span>
                <span className={plant.floweringSeason ? "text-gray-900" : "text-red-400"}>{plant.floweringSeason || 'Missing'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Flowers: </span>
                <span className={plant.flowerColor ? "text-gray-900" : "text-red-400"}>
                  {plant.flowerColor ? (Array.isArray(plant.flowerColor) ? plant.flowerColor.join(', ') : plant.flowerColor) : 'Missing'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Soil: </span>
                <span className={plant.soil ? "text-gray-900" : "text-red-400"}>
                  {plant.soil ? (Array.isArray(plant.soil) ? plant.soil.join(', ') : plant.soil) : 'Missing'}
                </span>
              </div>
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
                <h4 className="font-medium mb-1 text-gray-900">Description</h4>
                <p className="text-xs text-gray-600">{plant.description}</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Add to Collection Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="bg-white text-gray-900">
          <DialogHeader>
            <DialogTitle className="text-gray-900">Add to Garden</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-gray-900">
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