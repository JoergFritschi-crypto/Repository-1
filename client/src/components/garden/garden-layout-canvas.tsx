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

  // Update canvas size to maintain 4:3 aspect ratio and fill more space (30% bigger)
  useEffect(() => {
    const updateCanvasSize = () => {
      if (canvasRef.current) {
        const container = canvasRef.current.parentElement;
        if (container) {
          // Canvas takes 80% of container width, leaving 20% for sidebar
          const availableWidth = container.clientWidth * 0.78;
          const availableHeight = window.innerHeight * 0.7; // 70% of viewport (40% increase from 0.5)
          
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
        const rectX = (canvasSize.width - rectWidth) / 2;
        const rectY = (canvasSize.height - rectHeight) / 2;
        return `M ${rectX} ${rectY} h ${rectWidth} v ${rectHeight} h -${rectWidth} Z`;
      
      case 'square':
        const squareSize = Math.min(canvasSize.width, canvasSize.height) * scale;
        const squareX = (canvasSize.width - squareSize) / 2;
        const squareY = (canvasSize.height - squareSize) / 2;
        return `M ${squareX} ${squareY} h ${squareSize} v ${squareSize} h -${squareSize} Z`;
      
      case 'circle':
        const radius = Math.min(canvasSize.width, canvasSize.height) * scale / 2;
        return `M ${cx} ${cy - radius} A ${radius} ${radius} 0 1 1 ${cx} ${cy + radius} A ${radius} ${radius} 0 1 1 ${cx} ${cy - radius} Z`;
      
      case 'oval':
        const rx = canvasSize.width * scale / 2;
        const ry = canvasSize.height * scale / 2;
        return `M ${cx - rx} ${cy} A ${rx} ${ry} 0 1 1 ${cx + rx} ${cy} A ${rx} ${ry} 0 1 1 ${cx - rx} ${cy} Z`;
      
      case 'l-shaped':
        const lWidth = canvasSize.width * scale;
        const lHeight = canvasSize.height * scale;
        const lX = (canvasSize.width - lWidth) / 2;
        const lY = (canvasSize.height - lHeight) / 2;
        const cutWidth = lWidth * 0.5;
        const cutHeight = lHeight * 0.5;
        return `M ${lX} ${lY} h ${lWidth} v ${lHeight} h -${cutWidth} v -${cutHeight} h -${lWidth - cutWidth} Z`;
      
      default:
        return '';
    }
  };

  const handleDragStart = (plant: Plant, e: React.DragEvent) => {
    setDraggedPlant(plant);
    setIsDragging(true);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleCanvasDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (!draggedPlant || !canvasRef.current) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    const newPlacedPlant: PlacedPlant = {
      id: `placed-${Date.now()}`,
      plantId: draggedPlant.id,
      plantName: draggedPlant.commonName,
      scientificName: draggedPlant.scientificName,
      x: Math.max(5, Math.min(95, x)), // Keep within bounds
      y: Math.max(5, Math.min(95, y)),
      quantity: 1
    };
    
    setPlacedPlants([...placedPlants, newPlacedPlant]);
    // Remove from unplaced if it was there
    setUnplacedPlants(unplacedPlants.filter(p => p.id !== draggedPlant.id));
    setDraggedPlant(null);
  };

  // Calculate plant summary for placed elements
  const plantSummary = placedPlants.reduce((acc, plant) => {
    if (!acc[plant.plantId]) {
      acc[plant.plantId] = {
        name: plant.plantName,
        scientificName: plant.scientificName,
        quantity: 0
      };
    }
    acc[plant.plantId].quantity += plant.quantity;
    return acc;
  }, {} as Record<string, { name: string; scientificName?: string; quantity: number }>);

  return (
    <div className="w-full">
      {/* Compact Plants Inventory Above Canvas */}
      <Card className="border border-gray-200 mb-2">
        <CardHeader className="py-2 px-4">
          <div className="flex justify-between items-center">
            <CardTitle className="text-sm font-medium">
              Plants Inventory ({unplacedPlants.length} unplaced)
            </CardTitle>
            <Button 
              onClick={onOpenPlantSearch}
              size="sm"
              className="bg-green-600 hover:bg-green-700 h-7 text-xs"
              data-testid="button-search-add-plants"
            >
              <Search className="w-3 h-3 mr-1" />
              Add Plants
            </Button>
          </div>
        </CardHeader>
        <CardContent className="py-2 px-4">
          <ScrollArea className="h-16">
            {unplacedPlants.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-2">
                {aiDesign ? "AI placed all plants" : "No plants. Click 'Add Plants' to start."}
              </p>
            ) : (
              <div className="flex flex-wrap gap-1">
                {unplacedPlants.map((plant) => (
                  <div
                    key={plant.id}
                    draggable
                    onDragStart={(e) => handleDragStart(plant, e)}
                    className="bg-green-50 border border-green-300 rounded px-2 py-1 cursor-move hover:bg-green-100 text-xs"
                    data-testid={`inventory-plant-${plant.id}`}
                  >
                    {plant.commonName}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Main Layout: Canvas Left, Info Right */}
      <div className="flex gap-3">
        {/* Canvas Section - Takes Most Space */}
        <div className="flex-1">
          <Card className="border-2 border-green-500">
            <CardContent className="p-2">
              <div 
                ref={canvasRef}
                className="relative bg-gradient-to-br from-green-50 to-emerald-50 rounded"
                style={{ width: `${canvasSize.width}px`, height: `${canvasSize.height}px` }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleCanvasDrop}
                data-testid="garden-canvas"
              >
                {/* Fullscreen Toggle */}
                <Button
                  size="sm"
                  variant="ghost"
                  className="absolute top-2 right-2 z-10 bg-white/80"
                  onClick={() => setIsFullscreen(!isFullscreen)}
                  data-testid="button-toggle-fullscreen"
                >
                  {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </Button>

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
                    fill="rgba(34, 197, 94, 0.05)"
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
            </CardContent>
          </Card>
        </div>

        {/* Info Sidebar - Compact on Right */}
        <div className="w-72 space-y-2">
          {/* Garden Info */}
          <Card className="border border-gray-200">
            <CardHeader className="py-2 px-3">
              <CardTitle className="text-sm flex items-center gap-1">
                <Info className="w-4 h-4" />
                Garden Details
              </CardTitle>
            </CardHeader>
            <CardContent className="py-2 px-3 space-y-2">
              <div>
                <p className="text-xs text-gray-600">Shape</p>
                <p className="text-sm font-medium">{shape.charAt(0).toUpperCase() + shape.slice(1).replace('-', ' ')}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600">Dimensions</p>
                <p className="text-sm font-medium">
                  {shape === 'circle' ? 
                    `Radius: ${dimensions.radius || dimensions.width/2 || 5}${unitSymbol}` :
                  shape === 'square' ?
                    `Side: ${dimensions.width || dimensions.side || 10}${unitSymbol}` :
                    `${dimensions.width || 10} × ${dimensions.height || dimensions.width || 10}${unitSymbol}`
                  }
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-600">Total Area</p>
                <p className="text-sm font-bold text-green-700">{calculateArea()} {unitSquared}</p>
              </div>
            </CardContent>
          </Card>

          {/* Placed Plants Summary */}
          <Card className="border border-gray-200">
            <CardHeader className="py-2 px-3">
              <CardTitle className="text-sm">
                Placed Plants ({Object.keys(plantSummary).length})
              </CardTitle>
            </CardHeader>
            <CardContent className="py-2 px-3">
              <ScrollArea className="h-96">
                {Object.keys(plantSummary).length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">
                    No plants placed yet. Drag from inventory.
                  </p>
                ) : (
                  <div className="space-y-1">
                    {Object.values(plantSummary).map((summary) => (
                      <div 
                        key={summary.name}
                        className="flex justify-between items-center p-2 bg-gray-50 rounded text-sm"
                        data-testid={`summary-${summary.name}`}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{summary.name}</p>
                          {summary.scientificName && (
                            <p className="text-xs text-gray-600 italic truncate">{summary.scientificName}</p>
                          )}
                        </div>
                        <Badge variant="secondary" className="ml-2">
                          {summary.quantity}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}