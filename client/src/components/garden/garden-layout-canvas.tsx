import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, Maximize2, Minimize2, Info } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { Plant } from '@shared/schema';

interface GardenLayoutCanvasProps {
  shape: string;
  dimensions: Record<string, number>;
  units: 'metric' | 'imperial';
  gardenId?: string;
  aiDesign?: any;
  onOpenPlantSearch?: () => void;
}

interface PlacedPlant {
  id: string;
  plantId: string;
  plantName: string;
  scientificName?: string;
  x: number; // percentage of canvas width
  y: number; // percentage of canvas height
  quantity: number;
}

export default function GardenLayoutCanvas({
  shape,
  dimensions,
  units,
  gardenId,
  aiDesign,
  onOpenPlantSearch
}: GardenLayoutCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });
  const [unplacedPlants, setUnplacedPlants] = useState<Plant[]>([]);
  const [placedPlants, setPlacedPlants] = useState<PlacedPlant[]>([]);
  const [selectedPlant, setSelectedPlant] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [draggedPlant, setDraggedPlant] = useState<Plant | null>(null);

  const unitSymbol = units === 'metric' ? 'm' : 'ft';
  const unitSquared = units === 'metric' ? 'm²' : 'ft²';
  
  // Calculate area based on shape and dimensions
  const calculateArea = () => {
    switch (shape) {
      case 'rectangle':
        return (dimensions.width * dimensions.height).toFixed(1);
      case 'square':
        const side = dimensions.width || dimensions.side || 10;
        return (side * side).toFixed(1);
      case 'circle':
        const radius = dimensions.radius || dimensions.width / 2 || 5;
        return (Math.PI * radius * radius).toFixed(1);
      case 'oval':
        const a = dimensions.width / 2 || 5;
        const b = dimensions.height / 2 || 4;
        return (Math.PI * a * b).toFixed(1);
      case 'l-shaped':
        // Approximate L-shape as two rectangles
        const mainArea = (dimensions.width || 10) * (dimensions.height || 8);
        const extensionArea = ((dimensions.width || 10) * 0.5) * ((dimensions.height || 8) * 0.5);
        return (mainArea - extensionArea).toFixed(1);
      default:
        return '0';
    }
  };

  // Update canvas size to maintain 4:3 aspect ratio and fill 80% of available space
  useEffect(() => {
    const updateCanvasSize = () => {
      if (canvasRef.current) {
        const container = canvasRef.current.parentElement;
        if (container) {
          const availableWidth = container.clientWidth * 0.95; // Leave some margin
          const availableHeight = window.innerHeight * 0.5; // Use 50% of viewport height for canvas
          
          // Maintain 4:3 aspect ratio
          let width = availableWidth;
          let height = (width * 3) / 4;
          
          if (height > availableHeight) {
            height = availableHeight;
            width = (height * 4) / 3;
          }
          
          setCanvasSize({ width, height });
        }
      }
    };

    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);
    return () => window.removeEventListener('resize', updateCanvasSize);
  }, []);

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
        quantity: plant.quantity || 1
      }));
      setPlacedPlants(placed);
      // For AI design, inventory starts empty
      setUnplacedPlants([]);
    }
  }, [aiDesign]);

  // Get garden shape path for SVG
  const getShapePath = () => {
    const cx = canvasSize.width / 2;
    const cy = canvasSize.height / 2;
    const scale = 0.8; // Use 80% of canvas
    
    switch (shape) {
      case 'rectangle':
        const rectWidth = canvasSize.width * scale;
        const rectHeight = canvasSize.height * scale;
        return `M ${(canvasSize.width - rectWidth) / 2} ${(canvasSize.height - rectHeight) / 2} 
                h ${rectWidth} v ${rectHeight} h -${rectWidth} z`;
      
      case 'square':
        const squareSize = Math.min(canvasSize.width, canvasSize.height) * scale;
        return `M ${(canvasSize.width - squareSize) / 2} ${(canvasSize.height - squareSize) / 2} 
                h ${squareSize} v ${squareSize} h -${squareSize} z`;
      
      case 'circle':
        const radius = Math.min(canvasSize.width, canvasSize.height) * scale / 2;
        return `M ${cx - radius} ${cy} 
                A ${radius} ${radius} 0 1 0 ${cx + radius} ${cy}
                A ${radius} ${radius} 0 1 0 ${cx - radius} ${cy}`;
      
      case 'oval':
        const rx = canvasSize.width * scale / 2;
        const ry = canvasSize.height * scale / 2;
        return `M ${cx - rx} ${cy} 
                A ${rx} ${ry} 0 1 0 ${cx + rx} ${cy}
                A ${rx} ${ry} 0 1 0 ${cx - rx} ${cy}`;
      
      case 'l-shaped':
        const lWidth = canvasSize.width * scale;
        const lHeight = canvasSize.height * scale;
        const offsetX = (canvasSize.width - lWidth) / 2;
        const offsetY = (canvasSize.height - lHeight) / 2;
        return `M ${offsetX} ${offsetY} 
                h ${lWidth * 0.6} v ${lHeight * 0.4} h ${lWidth * 0.4} v ${lHeight * 0.6} 
                h -${lWidth} z`;
      
      default:
        return getShapePath(); // Default to rectangle
    }
  };

  // Handle plant drag start
  const handleDragStart = (plant: Plant, e: React.DragEvent) => {
    setDraggedPlant(plant);
    setIsDragging(true);
    e.dataTransfer.effectAllowed = 'copy';
  };

  // Handle plant drop on canvas
  const handleCanvasDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (!draggedPlant || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    const newPlacedPlant: PlacedPlant = {
      id: `placed-${Date.now()}`,
      plantId: draggedPlant.id,
      plantName: draggedPlant.commonName,
      scientificName: draggedPlant.scientificName || '',
      x,
      y,
      quantity: 1
    };

    setPlacedPlants([...placedPlants, newPlacedPlant]);
    setIsDragging(false);
    setDraggedPlant(null);
  };

  // Group placed plants by type for summary
  const plantSummary = placedPlants.reduce((acc, plant) => {
    const key = plant.plantName;
    if (!acc[key]) {
      acc[key] = { 
        name: plant.plantName, 
        scientificName: plant.scientificName,
        quantity: 0 
      };
    }
    acc[key].quantity += plant.quantity;
    return acc;
  }, {} as Record<string, { name: string; scientificName?: string; quantity: number }>);

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Plant Search Button */}
      <div className="flex justify-between items-center">
        <Button
          onClick={onOpenPlantSearch}
          className="flex items-center gap-2"
          variant="outline"
          data-testid="button-open-plant-search"
        >
          <Search className="w-4 h-4" />
          Search & Add Plants to Inventory
        </Button>
        <Button
          onClick={() => setIsFullscreen(!isFullscreen)}
          variant="ghost"
          size="sm"
          data-testid="button-toggle-fullscreen"
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </Button>
      </div>

      {/* Plants Inventory (Unplaced Elements) */}
      <Card className="border-gray-200">
        <CardHeader className="py-3">
          <CardTitle className="text-sm flex items-center justify-between">
            Plants Inventory (Unplaced)
            <Badge variant="outline">{unplacedPlants.length} plants</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="py-2">
          <ScrollArea className="h-24">
            {unplacedPlants.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                {aiDesign ? "All plants have been placed by AI" : "No plants in inventory. Search to add plants."}
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {unplacedPlants.map((plant) => (
                  <div
                    key={plant.id}
                    draggable
                    onDragStart={(e) => handleDragStart(plant, e)}
                    className="bg-green-100 border border-green-300 rounded-lg px-3 py-1.5 cursor-move hover:bg-green-200 transition-colors"
                    data-testid={`unplaced-plant-${plant.id}`}
                  >
                    <p className="text-xs font-medium">{plant.commonName}</p>
                    {plant.scientificName && (
                      <p className="text-xs text-gray-600 italic">{plant.scientificName}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Main Garden Canvas */}
      <Card className="border-2 border-green-600 bg-gradient-to-br from-green-50 to-emerald-50">
        <div 
          ref={canvasRef}
          className="relative overflow-hidden"
          style={{ width: `${canvasSize.width}px`, height: `${canvasSize.height}px` }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleCanvasDrop}
          data-testid="garden-canvas"
        >
          {/* Dimensions Display */}
          <div className="absolute top-2 left-2 bg-white/90 rounded-lg px-3 py-2 shadow-sm z-10">
            <p className="text-xs font-medium">Dimensions:</p>
            <p className="text-sm">
              {shape === 'circle' 
                ? `Ø ${dimensions.radius || dimensions.width || 10}${unitSymbol}`
                : `${dimensions.width || 10} × ${dimensions.height || dimensions.width || 8}${unitSymbol}`}
            </p>
            <p className="text-xs text-gray-600 mt-1">
              Area: {calculateArea()} {unitSquared}
            </p>
          </div>

          {/* Garden Shape SVG */}
          <svg 
            width={canvasSize.width} 
            height={canvasSize.height}
            className="absolute inset-0"
            style={{ pointerEvents: 'none' }}
          >
            <defs>
              <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#e5e7eb" strokeWidth="1" opacity="0.5"/>
              </pattern>
            </defs>
            
            {/* Grid background */}
            <rect width="100%" height="100%" fill="url(#grid)" />
            
            {/* Garden shape */}
            <path
              d={getShapePath()}
              fill="rgba(34, 197, 94, 0.1)"
              stroke="#16a34a"
              strokeWidth="2"
              strokeDasharray="5,5"
            />
          </svg>

          {/* Placed Plants */}
          {placedPlants.map((plant) => (
            <div
              key={plant.id}
              className={`absolute w-10 h-10 bg-green-500 rounded-full border-2 border-white shadow-lg cursor-pointer hover:scale-110 transition-transform flex items-center justify-center ${
                selectedPlant === plant.id ? 'ring-2 ring-blue-500' : ''
              }`}
              style={{
                left: `${plant.x}%`,
                top: `${plant.y}%`,
                transform: 'translate(-50%, -50%)'
              }}
              onClick={() => setSelectedPlant(plant.id)}
              title={plant.plantName}
              data-testid={`placed-plant-${plant.id}`}
            >
              <span className="text-white text-xs font-bold">{plant.quantity}</span>
            </div>
          ))}

          {/* Drag indicator */}
          {isDragging && (
            <div className="absolute inset-0 bg-green-100/20 pointer-events-none flex items-center justify-center">
              <p className="text-green-700 font-medium">Drop plant here</p>
            </div>
          )}
        </div>
      </Card>

      {/* Placed Elements Summary */}
      <Card className="border-gray-200">
        <CardHeader className="py-3">
          <CardTitle className="text-sm flex items-center justify-between">
            Placed Elements Summary
            <Badge variant="outline">{placedPlants.length} total</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="py-2">
          {Object.keys(plantSummary).length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-2">
              No plants placed yet
            </p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              {Object.values(plantSummary).map((summary) => (
                <div 
                  key={summary.name}
                  className="bg-gray-50 rounded-lg px-3 py-2 border border-gray-200"
                  data-testid={`summary-${summary.name}`}
                >
                  <p className="text-sm font-medium">{summary.name}</p>
                  {summary.scientificName && (
                    <p className="text-xs text-gray-600 italic truncate">{summary.scientificName}</p>
                  )}
                  <Badge className="mt-1" variant="secondary">
                    Qty: {summary.quantity}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}