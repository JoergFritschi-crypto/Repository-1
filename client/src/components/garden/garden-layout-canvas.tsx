import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Search, Info, Image, Sun, Cloud, Snowflake, Flower2, Trash2, Save, FolderOpen, Loader2, AlertCircle, ArrowRight, Lightbulb, MousePointer } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { Plant } from '@shared/schema';

interface GardenLayoutCanvasProps {
  shape: string;
  dimensions: Record<string, number>;
  units: 'metric' | 'imperial';
  gardenId?: string;
  gardenName?: string;
  aiDesign?: any;
  gardenPlants?: any[];
  inventoryPlants?: any[];
  onOpenPlantSearch?: () => void;
  onPlacedPlantsChange?: (plants: PlacedPlant[]) => void;
}

export interface PlacedPlant {
  id: string;
  plantId: string;
  plantName: string;
  scientificName?: string;
  x: number; // percentage of canvas width
  y: number; // percentage of canvas height
  quantity: number;
  plantType?: string;
  flowerColor?: string;
}

export default function GardenLayoutCanvas({
  shape,
  dimensions,
  units,
  gardenId,
  gardenName,
  aiDesign,
  gardenPlants,
  inventoryPlants,
  onOpenPlantSearch,
  onPlacedPlantsChange
}: GardenLayoutCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 1200, height: 800 });
  const [unplacedPlants, setUnplacedPlants] = useState<Partial<Plant>[]>([]);
  const [placedPlants, setPlacedPlants] = useState<PlacedPlant[]>([]);
  const [selectedPlant, setSelectedPlant] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isDraggingOverInventory, setIsDraggingOverInventory] = useState(false);
  const [draggedPlant, setDraggedPlant] = useState<Partial<Plant> | null>(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [selectedSeason, setSelectedSeason] = useState<string>('summer');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showLoadDialog, setShowLoadDialog] = useState(false);
  const [availableGardens, setAvailableGardens] = useState<any[]>([]);
  const { toast } = useToast();

  // Save design to database
  const handleSaveDesign = async () => {
    if (!gardenId) {
      toast({
        title: "Error",
        description: "No garden selected to save",
        variant: "destructive"
      });
      return;
    }

    setIsSaving(true);
    try {
      const layoutData = {
        plantPlacements: placedPlants,
        canvasSettings: {
          shape,
          dimensions,
          units,
          timestamp: new Date().toISOString()
        }
      };

      await apiRequest('PUT', `/api/gardens/${gardenId}`, { layout_data: layoutData });

      toast({
        title: "Design Saved",
        description: "Your garden design has been saved successfully"
      });
    } catch (error) {
      console.error('Error saving design:', error);
      toast({
        title: "Error",
        description: "Failed to save garden design",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Load design from database
  const handleLoadDesign = async (selectedGardenId: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/gardens/${selectedGardenId}`);
      const garden = await response.json();

      if (garden.layout_data?.plantPlacements) {
        setPlacedPlants(garden.layout_data.plantPlacements);
        toast({
          title: "Design Loaded",
          description: `Loaded design from ${garden.name}`
        });
      } else {
        toast({
          title: "No Design Found",
          description: "This garden doesn't have a saved design yet",
          variant: "destructive"
        });
      }
      setShowLoadDialog(false);
    } catch (error) {
      console.error('Error loading design:', error);
      toast({
        title: "Error",
        description: "Failed to load garden design",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch available gardens for loading
  const fetchAvailableGardens = async () => {
    try {
      const response = await fetch('/api/gardens');
      const gardens = await response.json();
      setAvailableGardens(gardens);
      setShowLoadDialog(true);
    } catch (error) {
      console.error('Error fetching gardens:', error);
      toast({
        title: "Error",
        description: "Failed to fetch available gardens",
        variant: "destructive"
      });
    }
  };

  // Get plant initials from scientific name (e.g., "Acer palmatum" -> "AP")
  const getPlantInitials = (scientificName?: string): string => {
    if (!scientificName) return '??';
    const parts = scientificName.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return scientificName.substring(0, 2).toUpperCase();
  };

  // Get plant color based on type or characteristics
  const getPlantColor = (plant: any): string => {
    // Special colors for specific plants we know we have
    const commonName = (plant.commonName || plant.plantName)?.toLowerCase() || '';
    const scientificName = plant.scientificName?.toLowerCase() || '';
    
    // Specific plant colors
    if (commonName.includes('lavender') || scientificName.includes('lavandula')) return '#a78bfa'; // Lavender purple
    if (commonName.includes('rose') || scientificName.includes('rosa')) return '#dc2626'; // Red for roses
    if (commonName.includes('hydrangea')) return '#ec4899'; // Pink
    if (commonName.includes('peony') || scientificName.includes('paeonia')) return '#f472b6'; // Light pink
    if (commonName.includes('iris')) return '#7c3aed'; // Deep purple
    if (commonName.includes('salvia')) return '#6366f1'; // Indigo
    if (commonName.includes('astilbe')) return '#db2777'; // Dark pink
    if (commonName.includes('daylily') || scientificName.includes('hemerocallis')) return '#fb923c'; // Orange
    if (commonName.includes('hosta')) return '#059669'; // Deep green for foliage plant
    if (commonName.includes('maple') || scientificName.includes('acer')) return '#b91c1c'; // Deep red for Japanese Maple
    
    // If flower color is specified, use that
    if (plant.flowerColor && typeof plant.flowerColor === 'string') {
      const colorMap: Record<string, string> = {
        'red': '#dc2626',
        'pink': '#ec4899',
        'purple': '#9333ea',
        'lavender': '#a78bfa',
        'blue': '#2563eb',
        'white': '#f3f4f6',
        'yellow': '#facc15',
        'orange': '#fb923c',
      };
      const lowerColor = plant.flowerColor.toLowerCase();
      for (const [key, value] of Object.entries(colorMap)) {
        if (lowerColor.includes(key)) return value;
      }
    }
    
    // Default colors based on plant type
    if (plant.type && typeof plant.type === 'string') {
      if (plant.type.includes('tree')) return '#059669'; // Emerald for trees
      if (plant.type.includes('shrub')) return '#16a34a'; // Green for shrubs
      if (plant.type.includes('perennial')) return '#8b5cf6'; // Violet for perennials
      if (plant.type.includes('annual')) return '#f59e0b'; // Amber for annuals
      if (plant.type.includes('herb')) return '#10b981'; // Light green for herbs
    }
    
    // Default green
    return '#22c55e';
  };

  const unitSymbol = units === 'metric' ? 'm' : 'ft';
  const unitSquared = units === 'metric' ? 'm²' : 'ft²';
  
  // Get actual garden dimensions in base units (meters or feet)
  const gardenWidth = dimensions.width || dimensions.side || dimensions.radius * 2 || 10;
  const gardenHeight = dimensions.height || dimensions.side || dimensions.radius * 2 || 10;
  
  // Convert to centimeters or inches for fine measurements
  const gardenWidthInBaseUnits = units === 'metric' ? gardenWidth * 100 : gardenWidth * 12; // cm or inches
  const gardenHeightInBaseUnits = units === 'metric' ? gardenHeight * 100 : gardenHeight * 12;
  
  // Calculate scale: pixels per base unit (cm or inch) with padding
  const effectiveWidth = canvasSize.width - 24 - 70; // Subtract card padding and ruler space
  const effectiveHeight = canvasSize.height - 70; // Subtract ruler space
  const scaleX = effectiveWidth / gardenWidthInBaseUnits;
  const scaleY = effectiveHeight / gardenHeightInBaseUnits;
  
  // Grid spacing in base units
  const gridSpacing = units === 'metric' ? 25 : 12; // 25cm or 12 inches (1 foot)
  
  // Calculate area based on shape and dimensions
  const calculateArea = () => {
    const width = dimensions.width || dimensions.side || dimensions.radius || 10;
    const height = dimensions.height || dimensions.width || dimensions.side || dimensions.radius || 10;
    const radius = dimensions.radius || dimensions.width / 2 || 5;
    
    switch (shape) {
      case 'rectangle':
        return (width * height).toFixed(1);
      case 'square':
        return (width * width).toFixed(1);
      case 'circle':
        return (Math.PI * radius * radius).toFixed(1);
      case 'oval':
        const a = width / 2;
        const b = height / 2;
        return (Math.PI * a * b).toFixed(1);
      case 'l-shaped':
        // Approximate L-shape as two rectangles
        const mainArea = width * height;
        const extensionArea = (width * 0.5) * (height * 0.5);
        return (mainArea - extensionArea).toFixed(1);
      default:
        return '0';
    }
  };

  // Update canvas size to match garden aspect ratio with proper padding
  useEffect(() => {
    const updateCanvasSize = () => {
      if (canvasRef.current) {
        const container = canvasRef.current.parentElement;
        if (container) {
          // Canvas takes 80% of container width
          const availableWidth = window.innerWidth * 0.8;
          const availableHeight = window.innerHeight * 0.75; // Use 75% of viewport height
          
          // Calculate aspect ratio based on actual garden dimensions
          const gardenAspectRatio = gardenWidth / gardenHeight;
          
          // Add padding for rulers and borders (40px for rulers, 20px for padding)
          const rulerPadding = 60;
          
          let width = availableWidth;
          let height = width / gardenAspectRatio;
          
          // If height exceeds available space, scale down
          if (height > availableHeight) {
            height = availableHeight;
            width = height * gardenAspectRatio;
          }
          
          // Ensure minimum size
          const minWidth = 700;
          const minHeight = 700;
          width = Math.max(width, minWidth);
          height = Math.max(height, minHeight);
          
          // For square gardens (10x10m), ensure equal dimensions
          if (Math.abs(gardenAspectRatio - 1) < 0.01) {
            const size = Math.min(Math.max(width, height), availableHeight, availableWidth);
            width = size;
            height = size;
          }
          
          // Add extra space for visibility
          width = Math.min(width + rulerPadding, window.innerWidth * 0.85);
          height = Math.min(height + rulerPadding, availableHeight);
          
          setCanvasSize({ width, height });
        }
      }
    };

    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);
    return () => window.removeEventListener('resize', updateCanvasSize);
  }, [gardenWidth, gardenHeight]);

  // Initialize with AI design if provided
  useEffect(() => {
    if (aiDesign && aiDesign.plantPlacements) {
      const placed: PlacedPlant[] = aiDesign.plantPlacements.map((plant: any) => ({
        id: `placed-${plant.id}`,
        plantId: plant.id,
        plantName: plant.plantName,
        scientificName: plant.scientificName,
        x: plant.x, // Already in percentage
        y: plant.y, // Already in percentage
        quantity: plant.quantity || 1,
        plantType: plant.plantType,
        flowerColor: plant.flowerColor
      }));
      setPlacedPlants(placed);
      // For AI design, inventory starts empty
      setUnplacedPlants([]);
    }
  }, [aiDesign]);

  // Load saved garden plants onto canvas
  useEffect(() => {
    if (gardenPlants && gardenPlants.length > 0 && !aiDesign) {
      // Restore placed plants on canvas from saved positions
      const restoredPlants: PlacedPlant[] = [];
      gardenPlants.forEach((gp: any) => {
        if (gp.position_x !== null && gp.position_y !== null) {
          // Plant has saved position, place it on canvas
          restoredPlants.push({
            id: `placed-${gp.id}`,
            plantId: gp.plantId || gp.plant?.id || `plant-${Math.random()}`,
            plantName: gp.plant?.commonName || gp.plant?.scientificName || 'Unknown',
            scientificName: gp.plant?.scientificName,
            x: gp.position_x,
            y: gp.position_y,
            quantity: gp.quantity || 1,
            plantType: gp.plant?.type,
            flowerColor: gp.plant?.flowerColor
          });
        }
      });
      setPlacedPlants(restoredPlants);
      
      // Don't add plants to inventory if they're already placed on canvas
      // Only add plants without positions to inventory
      const unplacedGardenPlants = gardenPlants.filter(gp => 
        gp.position_x === null || gp.position_y === null
      );
      
      if (unplacedGardenPlants.length > 0) {
        const inventoryPlantsFromGarden: Partial<Plant>[] = [];
        let uniqueCounter = 0;
        unplacedGardenPlants.forEach((gp: any) => {
          const quantity = gp.quantity || 1;
          for (let i = 0; i < quantity; i++) {
            inventoryPlantsFromGarden.push({
              ...gp.plant,
              id: `inventory-${uniqueCounter++}-${Math.random()}`,
              commonName: gp.plant?.commonName || 'Unknown Plant',
              scientificName: gp.plant?.scientificName || ''
            });
          }
        });
        setUnplacedPlants(inventoryPlantsFromGarden);
      }
    }
  }, [gardenPlants, aiDesign]);

  // Notify parent when placed plants change
  useEffect(() => {
    if (onPlacedPlantsChange) {
      onPlacedPlantsChange(placedPlants);
    }
  }, [placedPlants, onPlacedPlantsChange]);

  // Add inventory plants from advanced search
  useEffect(() => {
    if (inventoryPlants && inventoryPlants.length > 0) {
      // Add unique IDs to incoming plants and add them to unplaced
      const newPlants = inventoryPlants.map((plant, index) => ({
        ...plant,
        id: `search-${Date.now()}-${index}-${Math.random()}`,
        commonName: plant.commonName || 'Unknown Plant',
        scientificName: plant.scientificName || ''
      }));
      setUnplacedPlants(prev => [...prev, ...newPlants]);
    }
  }, [inventoryPlants]);

  // Generate seasonal image using Gemini
  const generateSeasonalImage = async (season: string) => {
    console.log('generateSeasonalImage called with:', { season, gardenId, placedPlantsCount: placedPlants.length });
    
    if (!gardenId) {
      toast({
        title: "Error",
        description: "Garden ID is required",
        variant: "destructive"
      });
      return;
    }

    if (placedPlants.length === 0) {
      toast({
        title: "No Plants",
        description: "Please add plants to the canvas before generating images",
        variant: "destructive"
      });
      return;
    }

    setIsGeneratingImage(true);
    try {
      const canvasDesign = {
        plants: placedPlants.map(p => ({
          id: p.plantId,
          plantName: p.plantName,
          scientificName: p.scientificName,
          commonName: p.plantName,
          x: p.x,
          y: p.y,
          quantity: p.quantity
        }))
      };

      const url = `/api/gardens/${gardenId}/generate-seasonal-images`;
      console.log('Making request to:', url, 'with data:', { canvasDesign, season });
      
      const response = await apiRequest('POST', url, {
        canvasDesign,
        season
      });
      
      console.log('Response status:', response.status);
      const result = await response.json();
      console.log('Response data:', result);
      
      toast({
        title: "Image Generation Started",
        description: `Generating ${season} garden visualization...`,
      });
      
      if (result.imageUrl) {
        // For base64 images, create a blob and open in new tab
        if (result.imageUrl.startsWith('data:')) {
          // Base64 image - open directly
          const newWindow = window.open('', '_blank');
          if (newWindow) {
            newWindow.document.write(`
              <html>
                <head><title>${season} Garden Visualization</title></head>
                <body style="margin:0; display:flex; justify-content:center; align-items:center; min-height:100vh; background:#f0f0f0;">
                  <img src="${result.imageUrl}" style="max-width:100%; height:auto;" alt="${season} garden visualization"/>
                </body>
              </html>
            `);
          }
        } else {
          // Regular URL - open directly
          window.open(result.imageUrl, '_blank');
        }
      }
    } catch (error) {
      console.error("Error generating seasonal image:", error);
      toast({
        title: "Generation Failed",
        description: "Failed to generate seasonal image",
        variant: "destructive"
      });
    } finally {
      setIsGeneratingImage(false);
    }
  };

  // Get garden shape path for SVG - with proper padding
  const getShapePath = () => {
    const padding = 35; // Increased padding to ensure full visibility
    const w = canvasSize.width - 24 - (padding * 2); // Account for card padding
    const h = canvasSize.height - (padding * 2);
    const cx = (canvasSize.width - 24) / 2;
    const cy = canvasSize.height / 2;
    
    switch (shape) {
      case 'rectangle':
        return `M ${padding} ${padding} h ${w} v ${h} h -${w} Z`;
      
      case 'square':
        const squareSize = Math.min(w, h);
        const squareX = (canvasSize.width - squareSize) / 2;
        const squareY = (canvasSize.height - squareSize) / 2;
        return `M ${squareX} ${squareY} h ${squareSize} v ${squareSize} h -${squareSize} Z`;
      
      case 'circle':
        const radius = Math.min(w, h) / 2;
        return `M ${cx} ${cy - radius} A ${radius} ${radius} 0 1 1 ${cx} ${cy + radius} A ${radius} ${radius} 0 1 1 ${cx} ${cy - radius} Z`;
      
      case 'oval':
        const rx = w / 2;
        const ry = h / 2;
        return `M ${cx - rx} ${cy} A ${rx} ${ry} 0 1 1 ${cx + rx} ${cy} A ${rx} ${ry} 0 1 1 ${cx - rx} ${cy} Z`;
      
      case 'l-shaped':
        const cutWidth = w * 0.5;
        const cutHeight = h * 0.5;
        return `M ${padding} ${padding} h ${w} v ${h} h -${cutWidth} v -${cutHeight} h -${w - cutWidth} Z`;
      
      default:
        return '';
    }
  };

  const handleDragStart = (plant: Partial<Plant>, e: React.DragEvent) => {
    setDraggedPlant(plant);
    setIsDragging(true);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', plant.id || '');
  };

  const handlePlacedPlantDragStart = (placedPlant: PlacedPlant, e: React.DragEvent) => {
    setDraggedPlant(placedPlant as any);
    setIsDragging(true);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('placedPlantId', placedPlant.id);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    setDraggedPlant(null);
  };

  // Handle plant deletion from canvas
  const handleDeletePlant = (plantId: string) => {
    setPlacedPlants(prev => prev.filter(p => p.id !== plantId));
    toast({
      title: "Plant Removed",
      description: "Plant has been removed from the canvas",
    });
  };

  const handleCanvasDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (!draggedPlant || !canvasRef.current) return;
    
    // Check if we're dragging from placed plants back to canvas (just moving position)
    const placedPlantId = e.dataTransfer.getData('placedPlantId');
    if (placedPlantId) {
      const rect = canvasRef.current.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      
      setPlacedPlants(placedPlants.map(p => 
        p.id === placedPlantId 
          ? { ...p, x: Math.max(5, Math.min(95, x)), y: Math.max(5, Math.min(95, y)) }
          : p
      ));
    } else {
      // Adding new plant from inventory
      const rect = canvasRef.current.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      
      const newPlacedPlant: PlacedPlant = {
        id: `placed-${Date.now()}-${Math.random()}`,
        plantId: draggedPlant.id || `plant-${Date.now()}`,
        plantName: draggedPlant.commonName || 'Unknown Plant',
        scientificName: draggedPlant.scientificName,
        x: Math.max(5, Math.min(95, x)), // Keep within bounds
        y: Math.max(5, Math.min(95, y)),
        quantity: 1, // Always 1 since each dot represents one plant
        plantType: (draggedPlant as any).plantType,
        flowerColor: (draggedPlant as any).flowerColor
      };
      
      setPlacedPlants([...placedPlants, newPlacedPlant]);
      // Remove from unplaced if it was there
      setUnplacedPlants(prev => prev.filter(p => p.id !== draggedPlant.id));
    }
    setDraggedPlant(null);
  };

  const handleInventoryDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const placedPlantId = e.dataTransfer.getData('placedPlantId');
    if (placedPlantId) {
      // Find the plant being dragged back
      const placedPlant = placedPlants.find(p => p.id === placedPlantId);
      if (placedPlant) {
        // Remove from placed plants
        setPlacedPlants(placedPlants.filter(p => p.id !== placedPlantId));
        
        // Always add back to unplaced plants with complete data for color matching
        const restoredPlant: Partial<Plant> = {
          id: `${placedPlant.plantId}-${Date.now()}`, // Unique ID to allow multiple of same plant
          commonName: placedPlant.plantName,
          scientificName: placedPlant.scientificName || '',
          family: '',
          genus: '',
          species: '',
          cultivar: '',
          type: placedPlant.plantType || null,
          dimension: null,
          cycle: '',
          foliage: '',
          hardiness: '',
          sunlight: null,
          soil: null,
          soilPH: '',
          watering: '',
          wateringGeneralBenchmark: null,
          wateringPeriod: '',
          depthWaterRequirement: null,
          volumeWaterRequirement: null,
          growthRate: '',
          droughtTolerant: false,
          saltTolerant: false,
          thorny: false,
          tropical: false,
          careLevel: '',
          maintenance: '',
          baseAvailabilityScore: null,
          cultivationDifficulty: '',
          propagationMethod: '',
          commercialProduction: '',
          climateAdaptability: null,
          petSafe: true,
          childSafe: false,
          cuisine: false,
          medicinal: false,
          attracts: null,
          propagation: null,
          pruningMonth: null,
          pruningCount: null,
          pestSusceptibility: null,
          description: null,
          careGuides: null,
          thumbnailImage: null,
          fullImage: null,
          detailImage: null,
          imageGenerationStatus: 'pending',
          imageGenerationStartedAt: null,
          imageGenerationCompletedAt: null,
          imageGenerationError: null,
          imageGenerationAttempts: 0,
          lastImageGenerationAt: null,
          generatedImageUrl: null,
          dataSource: 'perenual',
          importedAt: null,
          verificationStatus: 'pending',
          createdAt: new Date(),
          updatedAt: new Date(),
          perenualId: null
        };
        setUnplacedPlants([...unplacedPlants, restoredPlant]);
      }
    }
    setDraggedPlant(null);
  };

  // Calculate plant summary for placed elements - group by species, not individual plant IDs
  const plantSummary = placedPlants.reduce((acc, plant) => {
    const key = `${plant.plantName}-${plant.scientificName || 'unknown'}`;
    if (!acc[key]) {
      acc[key] = {
        name: plant.plantName,
        scientificName: plant.scientificName,
        quantity: 0
      };
    }
    acc[key].quantity += 1; // Each dot represents one plant
    return acc;
  }, {} as Record<string, { name: string; scientificName?: string; quantity: number }>);

  return (
    <>
      {/* Load Garden Dialog */}
      <Dialog open={showLoadDialog} onOpenChange={setShowLoadDialog}>
        <DialogContent className="sm:max-w-[425px] border-2 border-primary shadow-xl">
          <DialogHeader className="border-b pb-4 border-gold/30">
            <DialogTitle className="text-primary font-semibold">Load Garden Design</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {availableGardens.length === 0 ? (
              <p className="text-sm text-muted-foreground">No gardens available to load</p>
            ) : (
              <div className="space-y-2">
                {availableGardens.map(garden => (
                  <Button
                    key={garden.id}
                    className="w-full justify-start border-2 border-primary/30 hover:bg-canary hover:text-primary hover:border-gold transition-all duration-200 hover:shadow-md hover:scale-105 bg-white"
                    onClick={() => handleLoadDesign(garden.id)}
                    disabled={isLoading}
                    data-testid={`button-load-garden-${garden.id}`}
                  >
                    <Flower2 className="w-4 h-4 mr-2 text-primary" />
                    <div className="text-left">
                      <div className="font-medium">{garden.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {garden.shape} • {garden.layout_data?.plantPlacements?.length || 0} plants
                      </div>
                    </div>
                  </Button>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <div className="w-full flex gap-3">
      {/* Left side: Canvas area with info bars */}
      <div className="flex flex-col gap-3">
        {/* Workflow Guidance Alert */}
        <Alert className="border-2 border-primary/30 bg-gradient-to-r from-primary/5 to-canary/5" style={{ width: `${canvasSize.width}px` }}>
          <AlertCircle className="h-4 w-4 text-primary" />
          <AlertTitle className="text-primary">Design Your Garden Layout</AlertTitle>
          <AlertDescription className="text-sm text-muted-foreground mt-2">
            {aiDesign ? (
              <div className="space-y-2">
                <p className="flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-gold" />
                  This garden was AI-designed. Feel free to adjust plant positions or add/remove plants to personalize it.
                </p>
                <p className="flex items-center gap-2">
                  <MousePointer className="w-4 h-4 text-primary" />
                  Drag plants from the inventory on the right to reposition them. Drag back to remove.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="flex items-center gap-2">
                  <MousePointer className="w-4 h-4 text-primary" />
                  Design your garden by dragging plants from the inventory. You can manually adjust AI-generated designs or create from scratch.
                </p>
                <p className="flex items-center gap-2">
                  <ArrowRight className="w-4 h-4 text-gold" />
                  Once satisfied, switch to the <strong>3D Visualization</strong> tab to see your garden come to life!
                </p>
              </div>
            )}
          </AlertDescription>
        </Alert>

        {/* Advanced Search Module at Top */}
        <Card className="shadow-md border-2 border-primary/30 hover:border-gold transition-all duration-200" style={{ width: `${canvasSize.width}px` }}>
          <CardHeader className="py-3 px-4 bg-gradient-to-r from-primary/5 to-canary/5 border-b border-gold/30">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-primary">
              <Search className="w-4 h-4" />
              Plant Search
            </CardTitle>
          </CardHeader>
          <CardContent className="py-3 px-4">
            <Button 
              onClick={onOpenPlantSearch}
              className="w-full bg-primary hover:bg-dark-spring-green text-white border-2 border-gold/50 hover:border-canary transition-all duration-200 shadow-md hover:shadow-lg hover:scale-105"
              data-testid="button-open-plant-search"
            >
              Go to Advanced Search Tab →
            </Button>
          </CardContent>
        </Card>

        {/* Garden Info Bar Above Canvas */}
        <Card className="shadow-md border-2 border-primary/30" style={{ width: `${canvasSize.width}px` }}>
        <CardContent className="py-2 px-4 flex items-center justify-between bg-gradient-to-r from-background to-primary/5">
          <div className="flex gap-6">
            <div className="flex items-center gap-2">
              <span className="text-xs text-primary/60 uppercase font-medium">Shape:</span>
              <span className="text-sm font-semibold text-primary">{shape.charAt(0).toUpperCase() + shape.slice(1).replace('-', ' ')}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-primary/60 uppercase font-medium">Dimensions:</span>
              <span className="text-sm font-semibold text-primary">
                {shape === 'circle' ? 
                  `R: ${dimensions.radius || dimensions.width/2 || 5}${unitSymbol}` :
                shape === 'square' ?
                  `${dimensions.width || dimensions.side || 10}${unitSymbol}` :
                  `${dimensions.width || 10} × ${dimensions.height || dimensions.width || 10}${unitSymbol}`
                }
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-primary/60 uppercase font-medium">Area:</span>
              <span className="text-sm font-bold text-dark-spring-green">{calculateArea()} {unitSquared}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    className="bg-primary hover:bg-dark-spring-green text-white border-2 border-gold/50 hover:border-canary transition-all duration-200 shadow-md hover:shadow-lg hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={handleSaveDesign}
                    disabled={isSaving || !gardenId || placedPlants.length === 0}
                    data-testid="button-save-design"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-1" />
                        Save Design
                      </>
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Save your current layout to revisit later</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    className="border-2 border-primary text-primary hover:bg-canary hover:text-primary hover:border-gold transition-all duration-200 shadow-sm hover:shadow-md hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed bg-white"
                    onClick={fetchAvailableGardens}
                    disabled={isLoading}
                    data-testid="button-load-design"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      <>
                        <FolderOpen className="w-4 h-4 mr-1" />
                        Load Design
                      </>
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Load a previously saved garden design</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <div className="text-xs text-primary/70 ml-2 flex items-center">
              <Info className="w-3 h-3 mr-1 text-gold" />
              Drag plants to/from canvas
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Canvas */}
      <div className="flex gap-3">
        {/* Canvas Section - Full Width */}
        <Card className="shadow-lg overflow-visible border-2 border-primary hover:border-gold transition-all duration-200" style={{ width: `${canvasSize.width}px` }}>
          <CardContent className="p-3 overflow-visible bg-gradient-to-br from-background via-primary/5 to-canary/5">
            <div 
              ref={canvasRef}
              className="relative bg-gradient-to-br from-muted/30 via-background to-muted/30 rounded-lg shadow-inner"
              style={{ 
                width: `${canvasSize.width - 24}px`, 
                height: `${canvasSize.height}px`,
                overflow: 'visible'
              }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleCanvasDrop}
              data-testid="garden-canvas"
            >
              {/* Garden Shape SVG with padding for full visibility */}
              <svg 
                width={canvasSize.width - 24} 
                height={canvasSize.height}
                className="absolute inset-0"
                style={{ pointerEvents: 'none', overflow: 'visible' }}
                viewBox={`0 0 ${canvasSize.width - 24} ${canvasSize.height}`}
                preserveAspectRatio="xMidYMid meet"
              >
                <defs>
                  {/* Fine grid pattern for visual reference - 10cm or 4 inch intervals */}
                  <pattern 
                    id="fineGrid" 
                    width={units === 'metric' ? 10 * scaleX : 4 * scaleX} 
                    height={units === 'metric' ? 10 * scaleY : 4 * scaleY} 
                    patternUnits="userSpaceOnUse"
                    x="35"
                    y="35"
                  >
                    <path 
                      d={`M ${units === 'metric' ? 10 * scaleX : 4 * scaleX} 0 L 0 0 0 ${units === 'metric' ? 10 * scaleY : 4 * scaleY}`} 
                      fill="none" 
                      stroke="#86efac" 
                      strokeWidth="0.3" 
                      opacity="0.3"
                    />
                  </pattern>
                  
                  {/* Main measurement grid - 25cm or 1ft intervals */}
                  <pattern 
                    id="measurementGrid" 
                    width={gridSpacing * scaleX} 
                    height={gridSpacing * scaleY} 
                    patternUnits="userSpaceOnUse"
                    x="35"
                    y="35"
                  >
                    <path 
                      d={`M ${gridSpacing * scaleX} 0 L 0 0 0 ${gridSpacing * scaleY}`} 
                      fill="none" 
                      stroke="#059669" 
                      strokeWidth="1" 
                      opacity="0.5"
                    />
                  </pattern>
                </defs>
                
                {/* Fine grid background */}
                <rect width="100%" height="100%" fill="url(#fineGrid)" />
                
                {/* Measurement grid */}
                <rect width="100%" height="100%" fill="url(#measurementGrid)" />
                
                {/* Ruler markings - Horizontal */}
                {Array.from({ length: Math.ceil(gardenWidthInBaseUnits / gridSpacing) + 1 }, (_, i) => {
                  const rulerOffset = 35; // Match garden shape padding
                  const x = rulerOffset + (i * gridSpacing * scaleX);
                  const label = units === 'metric' 
                    ? `${(i * 25 / 100).toFixed(1)}m`
                    : `${i}ft`;
                  const showLabel = units === 'metric' ? (i % 4 === 0) : (i % 2 === 0); // Show every 1m for metric, every 2ft for imperial
                  const tickHeight = showLabel ? 10 : 5; // Longer ticks for labeled marks
                  return (
                    <g key={`h-ruler-${i}`}>
                      <line x1={x} y1={0} x2={x} y2={tickHeight} stroke="#047857" strokeWidth={showLabel ? "1.5" : "0.5"} />
                      {showLabel && (
                        <text x={x} y={20} fill="#047857" fontSize="10" textAnchor="middle" fontWeight="500">
                          {label}
                        </text>
                      )}
                    </g>
                  );
                })}
                
                {/* Ruler markings - Vertical */}
                {Array.from({ length: Math.ceil(gardenHeightInBaseUnits / gridSpacing) + 1 }, (_, i) => {
                  const rulerOffset = 35; // Match garden shape padding
                  const y = rulerOffset + (i * gridSpacing * scaleY);
                  const label = units === 'metric' 
                    ? (i * 25 / 100) >= 1 ? `${(i * 25 / 100).toFixed(0)}m` : `${i * 25}cm`
                    : `${i}ft`;
                  const showLabel = units === 'metric' ? (i % 4 === 0) : (i % 2 === 0); // Show every 1m for metric, every 2ft for imperial
                  const tickWidth = showLabel ? 10 : 5; // Longer ticks for labeled marks
                  return (
                    <g key={`v-ruler-${i}`}>
                      <line x1={0} y1={y} x2={tickWidth} y2={y} stroke="#047857" strokeWidth={showLabel ? "1.5" : "0.5"} />
                      {showLabel && (
                        <text 
                          x={20} 
                          y={y + 4} 
                          fill="#047857" 
                          fontSize="10" 
                          fontWeight="500"
                          textAnchor="start"
                        >
                          {label}
                        </text>
                      )}
                    </g>
                  );
                })}
                
                {/* Garden shape with color fill */}
                <path
                  d={getShapePath()}
                  fill="rgba(134, 239, 172, 0.2)"
                  stroke="#16a34a"
                  strokeWidth="3"
                  strokeDasharray="8,4"
                />
              </svg>

              {/* Placed Plants */}
              <TooltipProvider>
                {placedPlants.map((plant) => (
                  <Tooltip key={plant.id}>
                    <TooltipTrigger asChild>
                      <div
                        draggable
                        onDragStart={(e) => handlePlacedPlantDragStart(plant, e)}
                        onDragEnd={handleDragEnd}
                        className={`absolute rounded-full border-2 border-foreground/80 shadow-lg cursor-move hover:scale-125 transition-transform flex items-center justify-center ${
                          selectedPlant === plant.id ? 'ring-2 ring-primary' : ''
                        }`}
                        style={{
                          width: '24px',
                          height: '24px',
                          backgroundColor: getPlantColor(plant),
                          left: `${plant.x}%`,
                          top: `${plant.y}%`,
                          transform: 'translate(-50%, -50%)'
                        }}
                        onClick={() => setSelectedPlant(plant.id)}
                        data-testid={`placed-plant-${plant.id}`}
                      >
                        <span className="text-white font-bold drop-shadow-md" style={{ fontSize: '11px', textShadow: '0 0 2px rgba(0,0,0,0.8)' }}>
                          {getPlantInitials(plant.scientificName)}
                        </span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent className="p-2 bg-white dark:bg-gray-900 text-black dark:text-white border border-gray-200 dark:border-gray-700 shadow-lg">
                      <div className="flex items-center gap-2">
                        <div className="text-sm flex-1">
                          <div className="font-semibold italic">{plant.scientificName || 'Unknown'}</div>
                          <div className="text-xs opacity-75">{plant.plantName}</div>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0 hover:bg-destructive hover:text-destructive-foreground"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeletePlant(plant.id);
                          }}
                          data-testid={`delete-plant-${plant.id}`}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                ))}
              </TooltipProvider>

              {/* Drag indicator - subtle border only */}
              {isDragging && (
                <div className="absolute inset-0 border-3 border-primary/50 border-dashed rounded-lg pointer-events-none animate-pulse" />
              )}
            </div>
          </CardContent>
        </Card>
      </div>

        {/* Placed Plants List Below Canvas */}
        <Card className="shadow-md border-2 border-primary/30" style={{ width: `${canvasSize.width}px` }}>
          <CardHeader className="py-3 px-4 bg-gradient-to-r from-primary/5 to-canary/5 border-b border-gold/30">
            <CardTitle className="text-sm text-primary font-medium">
              Placed Plants ({placedPlants.length} total, {Object.keys(plantSummary).length} unique species)
            </CardTitle>
          </CardHeader>
          <CardContent className="py-3 px-4">
            <ScrollArea className="h-32">
              {placedPlants.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No plants placed yet. Drag plants from the inventory to the canvas.
                </p>
              ) : (
                <div className="flex flex-wrap gap-3">
                  <TooltipProvider>
                    {(() => {
                      // Group placed plants by plantName and scientificName
                      const groupedPlacedPlants = placedPlants.reduce((acc, plant) => {
                        const key = `${plant.plantName}-${plant.scientificName || 'unknown'}`;
                        if (!acc[key]) {
                          acc[key] = {
                            plantName: plant.plantName,
                            scientificName: plant.scientificName,
                            plants: []
                          };
                        }
                        acc[key].plants.push(plant);
                        return acc;
                      }, {} as Record<string, any>);

                      return Object.values(groupedPlacedPlants).map((group: any, groupIndex: number) => (
                        <Tooltip key={`placed-group-${groupIndex}`}>
                          <TooltipTrigger asChild>
                            <div className="flex items-center gap-2 bg-background border rounded-lg px-3 py-1.5 shadow-sm">
                              <div
                                className="rounded-full border-2 border-primary shadow-md hover:shadow-lg flex items-center justify-center transition-all duration-200"
                                style={{
                                  width: '24px',
                                  height: '24px',
                                  backgroundColor: getPlantColor(group),
                                }}
                              >
                                <span className="text-white text-xs font-bold" style={{ fontSize: '10px' }}>
                                  {getPlantInitials(group.scientificName)}
                                </span>
                              </div>
                              <span className="text-sm font-medium">{group.plants.length}</span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent className="p-2 bg-white dark:bg-gray-900 text-black dark:text-white border border-gray-200 dark:border-gray-700 shadow-lg">
                            <div className="text-sm">
                              <div className="font-semibold italic">{group.scientificName || 'Unknown'}</div>
                              <div className="text-xs opacity-75">{group.plantName}</div>
                              <div className="text-xs opacity-75 mt-1">Quantity on canvas: {group.plants.length}</div>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      ));
                    })()}
                  </TooltipProvider>
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Right side: Plant Inventory - Full Height */}
      <Card className="shadow-md h-fit sticky top-4 border-2 border-primary hover:border-gold transition-all duration-200">
        <CardHeader className="py-3 px-4 bg-gradient-to-r from-primary/5 to-canary/5 border-b border-gold/30">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-primary">
              Plants Inventory ({unplacedPlants.length} unplaced)
            </CardTitle>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="w-4 h-4 text-gold cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="text-sm"><strong>Tip:</strong> Plants placed here can be freely moved or removed. Drag to canvas to place, drag back to remove.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          {/* Quick Test Plants Button for Test Gardens */}
          {gardenName?.includes("Test Garden") && (
            <Button
              variant="outline"
              size="sm"
              className="mt-2 w-full"
              onClick={async () => {
                const testPlants = [
                  { id: "japanese-maple-17569010727932", name: "Japanese Maple", scientificName: "Acer palmatum", plantType: "tree" },
                  { id: "hosta-17569010727931", name: "Hosta", scientificName: "Hosta sieboldiana", plantType: "perennial" },
                  { id: "rose-red-17569010727934", name: "Red Rose", scientificName: "Rosa", plantType: "shrub" },
                  { id: "lavender-1756901072793", name: "English Lavender", scientificName: "Lavandula angustifolia", plantType: "perennial" }
                ];
                
                try {
                  // Add plants to database
                  const response = await apiRequest("POST", `/api/gardens/${gardenId}/plants`, {
                    plants: testPlants.map(p => ({
                      plantId: p.id,
                      quantity: 1
                    }))
                  });
                  await response.json();
                  
                  // Add them to the canvas at specific positions
                  const newPlacedPlants: PlacedPlant[] = testPlants.map((plant, index) => ({
                    id: `${plant.id}-${Date.now()}-${index}`,
                    plantId: plant.id,
                    plantName: plant.name,
                    scientificName: plant.scientificName,
                    x: 20 + (index % 2) * 40, // Positions: 20%, 60%, 20%, 60%
                    y: 20 + Math.floor(index / 2) * 40, // Positions: 20%, 20%, 60%, 60%
                    quantity: 1,
                    plantType: plant.plantType
                  }));
                  
                  setPlacedPlants(prev => [...prev, ...newPlacedPlants]);
                  
                  toast({
                    title: "Test Plants Added",
                    description: "Added 4 test plants to the canvas"
                  });
                } catch (error) {
                  console.error("Error adding test plants:", error);
                  toast({
                    title: "Error",
                    description: "Failed to add test plants",
                    variant: "destructive"
                  });
                }
              }}
            >
              Add Test Plants (Maple, Hosta, Rose, Lavender)
            </Button>
          )}
        </CardHeader>
        <CardContent 
          className={`py-3 px-4 relative transition-colors ${isDraggingOverInventory ? 'bg-destructive/10 border-2 border-destructive border-dashed' : ''}`}
          onDragOver={(e) => {
            e.preventDefault();
            const placedPlantId = e.dataTransfer.types.includes('text/plain') ? e.dataTransfer.getData('text/plain') : '';
            if (placedPlantId || e.dataTransfer.types.includes('placedPlantId')) {
              setIsDraggingOverInventory(true);
            }
          }}
          onDragLeave={() => setIsDraggingOverInventory(false)}
          onDrop={(e) => {
            handleInventoryDrop(e);
            setIsDraggingOverInventory(false);
          }}
        >
          <ScrollArea className="h-[600px]">
            {unplacedPlants.length === 0 && placedPlants.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                {aiDesign ? "AI has placed all plants on the canvas" : "No plants in inventory. Use Advanced Search to add plants."}
              </p>
            ) : unplacedPlants.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                All plants are on the canvas. Drag them back here to remove.
              </p>
            ) : (
              <div className="flex flex-col gap-3">
                <TooltipProvider>
                  {(() => {
                    // Group plants by scientificName
                    const groupedPlants = unplacedPlants.reduce((acc, plant) => {
                      const key = plant.scientificName || plant.commonName || 'unknown';
                      if (!acc[key]) {
                        acc[key] = {
                          ...plant,
                          count: 0,
                          plants: []
                        };
                      }
                      acc[key].count++;
                      acc[key].plants.push(plant);
                      return acc;
                    }, {} as Record<string, any>);

                    return Object.values(groupedPlants).map((group: any, index: number) => (
                      <Tooltip key={`${group.scientificName || group.commonName}-${index}`}>
                        <TooltipTrigger asChild>
                          <div className="flex flex-col gap-2 bg-background border rounded-lg p-2 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex items-center gap-2">
                              <div
                                className="rounded-full border-2 border-primary shadow-md hover:shadow-lg flex items-center justify-center transition-all duration-200"
                                style={{
                                  width: '20px',
                                  height: '20px',
                                  backgroundColor: getPlantColor(group),
                                }}
                              >
                                <span className="text-white text-xs font-bold" style={{ fontSize: '9px' }}>
                                  {getPlantInitials(group.scientificName)}
                                </span>
                              </div>
                              <span className="text-xs font-medium">×{group.count}</span>
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {group.plants.map((plant: any, index: number) => (
                                <div
                                  key={plant.id}
                                  draggable
                                  onDragStart={(e) => handleDragStart(plant, e)}
                                  onDragEnd={handleDragEnd}
                                  className="rounded-full border border-foreground/60 cursor-move hover:scale-125 transition-transform flex items-center justify-center"
                                  style={{
                                    width: '20px',
                                    height: '20px',
                                    backgroundColor: getPlantColor(plant),
                                  }}
                                  data-testid={`inventory-plant-${plant.id}`}
                                >
                                  <span className="text-white text-xs font-bold" style={{ fontSize: '9px' }}>
                                    {getPlantInitials(plant.scientificName)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent className="p-2 bg-white dark:bg-gray-900 text-black dark:text-white border border-gray-200 dark:border-gray-700 shadow-lg">
                          <div className="text-sm">
                            <div className="font-semibold italic">{group.scientificName || 'Unknown'}</div>
                            <div className="text-xs opacity-75">{group.commonName}</div>
                            <div className="text-xs opacity-75 mt-1">Quantity: {group.count}</div>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    ));
                  })()}
                </TooltipProvider>
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
    </>
  );
}