import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, Info } from 'lucide-react';
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
  const [canvasSize, setCanvasSize] = useState({ width: 900, height: 675 });
  const [unplacedPlants, setUnplacedPlants] = useState<Plant[]>([]);
  const [placedPlants, setPlacedPlants] = useState<PlacedPlant[]>([]);
  const [selectedPlant, setSelectedPlant] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [draggedPlant, setDraggedPlant] = useState<Plant | null>(null);

  const unitSymbol = units === 'metric' ? 'm' : 'ft';
  const unitSquared = units === 'metric' ? 'm²' : 'ft²';
  
  // Get actual garden dimensions in base units (meters or feet)
  const gardenWidth = dimensions.width || dimensions.side || dimensions.radius * 2 || 10;
  const gardenHeight = dimensions.height || dimensions.side || dimensions.radius * 2 || 10;
  
  // Convert to centimeters or inches for fine measurements
  const gardenWidthInBaseUnits = units === 'metric' ? gardenWidth * 100 : gardenWidth * 12; // cm or inches
  const gardenHeightInBaseUnits = units === 'metric' ? gardenHeight * 100 : gardenHeight * 12;
  
  // Calculate scale: pixels per base unit (cm or inch)
  const scaleX = (canvasSize.width - 24) / gardenWidthInBaseUnits;
  const scaleY = canvasSize.height / gardenHeightInBaseUnits;
  
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

  // Update canvas size to maintain 4:3 aspect ratio and fill more space
  useEffect(() => {
    const updateCanvasSize = () => {
      if (canvasRef.current) {
        const container = canvasRef.current.parentElement;
        if (container) {
          // Canvas takes most of container width, leaving some for garden info sidebar
          const availableWidth = container.clientWidth * 0.75;
          const availableHeight = window.innerHeight * 0.5; // Use 50% of viewport height
          
          // Maintain 4:3 aspect ratio
          let width = availableWidth;
          let height = (width * 3) / 4;
          
          if (height > availableHeight) {
            height = availableHeight;
            width = (height * 4) / 3;
          }
          
          // Ensure minimum size
          width = Math.max(width, 800);
          height = Math.max(height, 600);
          
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

  // Get garden shape path for SVG - now fills the entire canvas
  const getShapePath = () => {
    const padding = 10; // Small padding from edges
    const w = canvasSize.width - (padding * 2);
    const h = canvasSize.height - (padding * 2);
    const cx = canvasSize.width / 2;
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
    <div className="w-full space-y-3">
      {/* Advanced Search Module at Top */}
      <Card className="border-2 border-blue-400 shadow-md" style={{ width: `${canvasSize.width}px` }}>
        <CardHeader className="py-3 px-4 bg-blue-50">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Search className="w-4 h-4" />
            Advanced Plant Search
          </CardTitle>
        </CardHeader>
        <CardContent className="py-3 px-4">
          <Button 
            onClick={onOpenPlantSearch}
            className="w-full bg-blue-600 hover:bg-blue-700"
            data-testid="button-open-plant-search"
          >
            Open Advanced Search & Filter
          </Button>
        </CardContent>
      </Card>

      {/* Plants Inventory Above Canvas */}
      <Card className="border-2 border-gray-300 shadow-md" style={{ width: `${canvasSize.width}px` }}>
        <CardHeader className="py-3 px-4 bg-gray-50">
          <CardTitle className="text-sm font-medium">
            Plants Inventory ({unplacedPlants.length} unplaced)
          </CardTitle>
        </CardHeader>
        <CardContent className="py-3 px-4">
          <ScrollArea className="h-24">
            {unplacedPlants.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                {aiDesign ? "AI has placed all plants on the canvas" : "No plants in inventory. Use Advanced Search above to add plants."}
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {unplacedPlants.map((plant) => (
                  <div
                    key={plant.id}
                    draggable
                    onDragStart={(e) => handleDragStart(plant, e)}
                    className="bg-green-100 border border-green-400 rounded-lg px-3 py-2 cursor-move hover:bg-green-200 transition-colors"
                    data-testid={`inventory-plant-${plant.id}`}
                  >
                    <p className="font-medium text-sm">{plant.commonName}</p>
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

      {/* Main Layout: Canvas Left, Garden Info Right */}
      <div className="flex gap-3">
        {/* Canvas Section */}
        <Card className="border-2 border-green-600 shadow-lg overflow-visible" style={{ width: `${canvasSize.width}px` }}>
          <CardContent className="p-3">
            <div 
              ref={canvasRef}
              className="relative bg-gradient-to-br from-green-100 via-emerald-50 to-green-100 rounded-lg shadow-inner overflow-hidden"
              style={{ width: `${canvasSize.width - 24}px`, height: `${canvasSize.height}px` }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleCanvasDrop}
              data-testid="garden-canvas"
            >
              {/* Garden Shape SVG */}
              <svg 
                width={canvasSize.width - 24} 
                height={canvasSize.height}
                className="absolute inset-0"
                style={{ pointerEvents: 'none' }}
              >
                <defs>
                  {/* Fine grid pattern for visual reference - 10cm or 4 inch intervals */}
                  <pattern 
                    id="fineGrid" 
                    width={units === 'metric' ? 10 * scaleX : 4 * scaleX} 
                    height={units === 'metric' ? 10 * scaleY : 4 * scaleY} 
                    patternUnits="userSpaceOnUse"
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
                  const x = i * gridSpacing * scaleX;
                  const label = units === 'metric' 
                    ? i % 4 === 0 ? `${i * 25 / 100}m` : `${i * 25}cm`
                    : `${i}ft`;
                  const showLabel = units === 'metric' ? (i % 2 === 0) : true; // Show every 50cm for metric
                  return (
                    <g key={`h-ruler-${i}`}>
                      <line x1={x} y1={0} x2={x} y2={8} stroke="#047857" strokeWidth="1" />
                      {showLabel && i > 0 && (
                        <text x={x} y={18} fill="#047857" fontSize="9" textAnchor="middle">
                          {label}
                        </text>
                      )}
                    </g>
                  );
                })}
                
                {/* Ruler markings - Vertical */}
                {Array.from({ length: Math.ceil(gardenHeightInBaseUnits / gridSpacing) + 1 }, (_, i) => {
                  const y = i * gridSpacing * scaleY;
                  const label = units === 'metric' 
                    ? i % 4 === 0 ? `${i * 25 / 100}m` : `${i * 25}cm`
                    : `${i}ft`;
                  const showLabel = units === 'metric' ? (i % 2 === 0) : true; // Show every 50cm for metric
                  return (
                    <g key={`v-ruler-${i}`}>
                      <line x1={0} y1={y} x2={8} y2={y} stroke="#047857" strokeWidth="1" />
                      {showLabel && i > 0 && (
                        <text x={15} y={y + 3} fill="#047857" fontSize="9">
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
              {placedPlants.map((plant) => (
                <div
                  key={plant.id}
                  className={`absolute w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full border-2 border-white shadow-lg cursor-pointer hover:scale-110 transition-transform flex items-center justify-center ${
                    selectedPlant === plant.id ? 'ring-4 ring-blue-400' : ''
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
                  <span className="text-white text-sm font-bold">{plant.quantity}</span>
                </div>
              ))}

              {/* Drag indicator */}
              {isDragging && (
                <div className="absolute inset-0 bg-green-200/30 backdrop-blur-sm pointer-events-none flex items-center justify-center rounded-lg">
                  <p className="text-green-800 font-semibold text-lg bg-white/80 px-4 py-2 rounded-lg">Drop plant here</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Garden Info Sidebar - Right */}
        <Card className="border-2 border-gray-300 shadow-md flex-1">
          <CardHeader className="py-3 px-4 bg-gray-50">
            <CardTitle className="text-sm flex items-center gap-1">
              <Info className="w-4 h-4" />
              Garden Details
            </CardTitle>
          </CardHeader>
          <CardContent className="py-3 px-4 space-y-3">
            <div>
              <p className="text-xs text-gray-600 uppercase tracking-wider">Shape</p>
              <p className="text-base font-semibold">{shape.charAt(0).toUpperCase() + shape.slice(1).replace('-', ' ')}</p>
            </div>
            <div>
              <p className="text-xs text-gray-600 uppercase tracking-wider">Dimensions</p>
              <p className="text-base font-semibold">
                {shape === 'circle' ? 
                  `Radius: ${dimensions.radius || dimensions.width/2 || 5}${unitSymbol}` :
                shape === 'square' ?
                  `Side: ${dimensions.width || dimensions.side || 10}${unitSymbol}` :
                  `${dimensions.width || 10} × ${dimensions.height || dimensions.width || 10}${unitSymbol}`
                }
              </p>
            </div>
            <div className="pt-2 border-t">
              <p className="text-xs text-gray-600 uppercase tracking-wider">Total Area</p>
              <p className="text-xl font-bold text-green-700">{calculateArea()} {unitSquared}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Placed Plants List Below Canvas */}
      <Card className="border-2 border-gray-300 shadow-md" style={{ width: `${canvasSize.width}px` }}>
        <CardHeader className="py-3 px-4 bg-gray-50">
          <CardTitle className="text-sm">
            Placed Plants ({Object.keys(plantSummary).length} unique species)
          </CardTitle>
        </CardHeader>
        <CardContent className="py-3 px-4">
          <ScrollArea className="h-32">
            {Object.keys(plantSummary).length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No plants placed yet. Drag plants from the inventory above to the canvas.
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {Object.values(plantSummary).map((summary) => (
                  <div 
                    key={summary.name}
                    className="flex justify-between items-center p-2 bg-green-50 rounded-lg border border-green-200"
                    data-testid={`summary-${summary.name}`}
                  >
                    <div className="flex-1 min-w-0 pr-2">
                      <p className="font-medium text-sm truncate">{summary.name}</p>
                      {summary.scientificName && (
                        <p className="text-xs text-gray-600 italic truncate">{summary.scientificName}</p>
                      )}
                    </div>
                    <Badge variant="secondary" className="ml-2 flex-shrink-0">
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
  );
}