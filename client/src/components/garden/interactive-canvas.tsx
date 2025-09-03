import { useState, useRef, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  MousePointer, 
  Leaf, 
  Square, 
  Minus, 
  Home,
  Undo,
  Redo,
  ZoomIn,
  ZoomOut,
  Eye,
  EyeOff,
  Settings
} from "lucide-react";
import type { GardenDimensions } from "@/types/garden";

interface InteractiveCanvasProps {
  shape: string;
  dimensions: GardenDimensions;
  units: 'metric' | 'imperial';
  gardenId?: string;
}

interface CanvasElement {
  id: string;
  type: 'plant' | 'bed' | 'pathway' | 'structure';
  x: number;
  y: number;
  width?: number;
  height?: number;
  radius?: number;
  label: string;
  color: string;
}

export default function InteractiveCanvas({ 
  shape, 
  dimensions, 
  units, 
  gardenId 
}: InteractiveCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [selectedTool, setSelectedTool] = useState<string>('select');
  const [canvasElements, setCanvasElements] = useState<CanvasElement[]>([
    {
      id: '1',
      type: 'plant',
      x: 100,
      y: 100,
      radius: 25,
      label: 'Purple Coneflower',
      color: '#8B5CF6',
    },
    {
      id: '2',
      type: 'plant',
      x: 200,
      y: 150,
      radius: 20,
      label: 'Black-eyed Susan',
      color: '#EAB308',
    },
    {
      id: '3',
      type: 'bed',
      x: 50,
      y: 200,
      width: 180,
      height: 80,
      label: 'Perennial Border',
      color: '#10B981',
    },
  ]);
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [layers, setLayers] = useState({
    plants: true,
    structures: true,
    pathways: true,
    beds: true,
  });
  const [zoom, setZoom] = useState(1);

  const unitSymbol = units === 'metric' ? 'm' : 'ft';
  const scaleRatio = 20; // 1 unit = 20 pixels

  const tools = [
    { id: 'select', label: 'Select', icon: MousePointer, active: selectedTool === 'select' },
    { id: 'plant', label: 'Add Plant', icon: Leaf, active: selectedTool === 'plant' },
    { id: 'bed', label: 'Garden Bed', icon: Square, active: selectedTool === 'bed' },
    { id: 'pathway', label: 'Pathway', icon: Minus, active: selectedTool === 'pathway' },
    { id: 'structure', label: 'Structure', icon: Home, active: selectedTool === 'structure' },
  ];

  const handleCanvasClick = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (selectedTool === 'select') return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = (event.clientX - rect.left) / zoom;
    const y = (event.clientY - rect.top) / zoom;

    const newElement: CanvasElement = {
      id: `${Date.now()}`,
      type: selectedTool as any,
      x,
      y,
      label: `New ${selectedTool}`,
      color: selectedTool === 'plant' ? '#10B981' : '#8B5CF6',
    };

    if (selectedTool === 'plant') {
      newElement.radius = 15;
    } else if (selectedTool === 'bed') {
      newElement.width = 100;
      newElement.height = 60;
    } else if (selectedTool === 'pathway') {
      newElement.width = 120;
      newElement.height = 20;
    } else if (selectedTool === 'structure') {
      newElement.width = 80;
      newElement.height = 80;
    }

    setCanvasElements(prev => [...prev, newElement]);
  }, [selectedTool, zoom]);

  const handleElementClick = useCallback((elementId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    setSelectedElement(elementId);
  }, []);

  const renderElement = (element: CanvasElement) => {
    const isSelected = selectedElement === element.id;
    const isVisible = layers[element.type === 'bed' ? 'beds' : `${element.type}s` as keyof typeof layers];
    
    if (!isVisible) return null;

    const commonProps = {
      key: element.id,
      onClick: (e: React.MouseEvent) => handleElementClick(element.id, e),
      className: `absolute cursor-pointer transition-all ${isSelected ? 'ring-2 ring-primary' : ''}`,
      style: {
        left: element.x,
        top: element.y,
        transform: `scale(${zoom})`,
        transformOrigin: 'top left',
      },
      'data-testid': `canvas-element-${element.id}`,
    };

    if (element.type === 'plant') {
      return (
        <div
          {...commonProps}
          style={{
            ...commonProps.style,
            width: (element.radius || 15) * 2,
            height: (element.radius || 15) * 2,
            borderRadius: '50%',
            backgroundColor: element.color,
            marginLeft: -(element.radius || 15),
            marginTop: -(element.radius || 15),
          }}
        >
          <div className="flex items-center justify-center h-full text-white text-xs font-medium">
            <Leaf className="w-3 h-3" />
          </div>
        </div>
      );
    }

    return (
      <div
        {...commonProps}
        style={{
          ...commonProps.style,
          width: element.width,
          height: element.height,
          backgroundColor: element.color,
          opacity: 0.7,
          border: '2px solid',
          borderColor: element.color,
          borderRadius: element.type === 'structure' ? '4px' : '0',
        }}
      >
        <div className="flex items-center justify-center h-full text-white text-xs font-medium p-1">
          {element.label}
        </div>
      </div>
    );
  };

  const calculateGardenDimensions = () => {
    switch (shape) {
      case 'rectangle':
        return {
          width: (dimensions.length || 10) * scaleRatio,
          height: (dimensions.width || 8) * scaleRatio,
        };
      case 'circle':
        const radius = (dimensions.radius || 5) * scaleRatio;
        return { width: radius * 2, height: radius * 2 };
      case 'oval':
        return {
          width: (dimensions.majorAxis || 12) * scaleRatio,
          height: (dimensions.minorAxis || 8) * scaleRatio,
        };
      default:
        return { width: 400, height: 320 };
    }
  };

  const gardenDims = calculateGardenDimensions();

  return (
    <div className="space-y-6">
      <div className="grid lg:grid-cols-4 gap-6">
        {/* Tool Palette */}
        <div className="lg:col-span-1">
          <div className="space-y-6">
            {/* Tools */}
            <Card>
              <CardContent className="pt-6">
                <h3 className="font-medium mb-4" data-testid="text-design-tools-title">Design Tools</h3>
                <div className="space-y-2">
                  {tools.map((tool) => {
                    const Icon = tool.icon;
                    return (
                      <Button
                        key={tool.id}
                        variant={tool.active ? 'default' : 'outline'}
                        className="w-full justify-start"
                        onClick={() => setSelectedTool(tool.id)}
                        data-testid={`tool-${tool.id}`}
                      >
                        <Icon className="w-4 h-4 mr-2" />
                        {tool.label}
                      </Button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Layers */}
            <Card>
              <CardContent className="pt-6">
                <h3 className="font-medium mb-4" data-testid="text-layers-title">Layers</h3>
                <div className="space-y-2">
                  {Object.entries(layers).map(([layer, visible]) => (
                    <div key={layer} className="flex items-center justify-between p-2 bg-muted rounded" data-testid={`layer-${layer}`}>
                      <span className="text-sm capitalize">{layer}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setLayers(prev => ({ ...prev, [layer]: !visible }))}
                        data-testid={`toggle-layer-${layer}`}
                      >
                        {visible ? <Eye className="w-4 h-4 text-accent" /> : <EyeOff className="w-4 h-4 text-muted-foreground" />}
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Selected Element Properties */}
            {selectedElement && (
              <Card>
                <CardContent className="pt-6">
                  <h3 className="font-medium mb-4" data-testid="text-element-properties-title">Element Properties</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium">Label</label>
                      <input
                        type="text"
                        className="w-full mt-1 px-2 py-1 border rounded text-sm"
                        value={canvasElements.find(e => e.id === selectedElement)?.label || ''}
                        onChange={(e) => {
                          setCanvasElements(prev => prev.map(el => 
                            el.id === selectedElement ? { ...el, label: e.target.value } : el
                          ));
                        }}
                        data-testid="input-element-label"
                      />
                    </div>
                    <Button 
                      variant="destructive" 
                      size="sm" 
                      className="w-full"
                      onClick={() => {
                        setCanvasElements(prev => prev.filter(el => el.id !== selectedElement));
                        setSelectedElement(null);
                      }}
                      data-testid="button-delete-element"
                    >
                      Delete Element
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Canvas Area */}
        <div className="lg:col-span-3">
          <Card>
            <CardContent className="pt-6">
              {/* Canvas Controls */}
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center space-x-2">
                  <Button variant="outline" size="sm" data-testid="button-undo">
                    <Undo className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="sm" data-testid="button-redo">
                    <Redo className="w-4 h-4" />
                  </Button>
                  <Separator orientation="vertical" className="h-6" />
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setZoom(Math.min(zoom + 0.1, 2))}
                    data-testid="button-zoom-in"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setZoom(Math.max(zoom - 0.1, 0.5))}
                    data-testid="button-zoom-out"
                  >
                    <ZoomOut className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant="outline" data-testid="badge-zoom-level">
                    Zoom: {Math.round(zoom * 100)}%
                  </Badge>
                  <Badge variant="outline" data-testid="badge-canvas-scale">
                    Scale: 1{unitSymbol} = {scaleRatio}px
                  </Badge>
                </div>
              </div>

              {/* Canvas */}
              <div 
                ref={canvasRef}
                className="relative border-2 border-dashed border-border rounded-lg bg-muted/30 overflow-hidden cursor-crosshair garden-canvas"
                style={{ 
                  width: gardenDims.width * zoom,
                  height: gardenDims.height * zoom,
                  minHeight: 400,
                }}
                onClick={handleCanvasClick}
                data-testid="garden-canvas"
              >
                {/* Garden Boundary */}
                <div
                  className="absolute border-2 border-primary/50 bg-background/50"
                  style={{
                    left: 10,
                    top: 10,
                    width: gardenDims.width - 20,
                    height: gardenDims.height - 20,
                    borderRadius: shape === 'circle' ? '50%' : shape === 'oval' ? '50%' : '0',
                    transform: `scale(${zoom})`,
                    transformOrigin: 'top left',
                  }}
                  data-testid="garden-boundary"
                />

                {/* Canvas Elements */}
                {canvasElements.map(renderElement)}

                {/* Instructions */}
                {canvasElements.length === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center text-center text-muted-foreground pointer-events-none">
                    <div>
                      <Settings className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p className="text-sm">Select a tool and click to add elements</p>
                      <p className="text-xs mt-1">
                        {shape.charAt(0).toUpperCase() + shape.slice(1)} Garden
                        {dimensions.length && dimensions.width && (
                          <span> • {dimensions.length}{unitSymbol} × {dimensions.width}{unitSymbol}</span>
                        )}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Status Bar */}
              <div className="flex justify-between items-center mt-4 text-sm text-muted-foreground">
                <div data-testid="text-canvas-status">
                  {canvasElements.length} elements • {selectedTool} tool selected
                </div>
                <div data-testid="text-canvas-dimensions">
                  {gardenDims.width}px × {gardenDims.height}px
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
