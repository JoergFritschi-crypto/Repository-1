import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Lightbulb, TrendingUp } from 'lucide-react';

interface GardenSketchProps {
  shape: string;
  dimensions: Record<string, number>;
  units: 'metric' | 'imperial';
  slopeDirection?: string;
  slopePercentage?: number;
  usdaZone?: string;
  rhsZone?: string;
}

export default function GardenSketch({
  shape,
  dimensions,
  units,
  slopeDirection = 'N',
  slopePercentage = 5,
  usdaZone = '',
  rhsZone = ''
}: GardenSketchProps) {
  const [cardinalRotation, setCardinalRotation] = useState(0);
  const [viewerRotation, setViewerRotation] = useState(0);
  const [isDraggingCardinal, setIsDraggingCardinal] = useState(false);
  const [isDraggingViewer, setIsDraggingViewer] = useState(false);
  const [containerSize, setContainerSize] = useState({ width: 400, height: 400 });
  const [showAssessment, setShowAssessment] = useState(false);
  const [assessment, setAssessment] = useState<string[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Calculate area based on shape and dimensions
  const calculateArea = () => {
    let area = 0;
    switch (shape) {
      case 'rectangle':
      case 'l-shape':
        area = (dimensions.width || 4) * (dimensions.length || 3);
        break;
      case 'square':
        const side = dimensions.width || 4;
        area = side * side;
        break;
      case 'circle':
        const radius = dimensions.radius || 5;
        area = Math.PI * radius * radius;
        break;
      case 'oval':
        const width = dimensions.width || 4;
        const length = dimensions.length || 6;
        area = Math.PI * (width / 2) * (length / 2);
        break;
      case 'triangle':
        area = ((dimensions.width || 4) * (dimensions.length || 3)) / 2;
        break;
      default:
        area = (dimensions.width || 4) * (dimensions.length || 3);
    }
    return area.toFixed(1);
  };

  // Handle window resize
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const width = containerRef.current.clientWidth;
        const size = Math.min(width * 0.9, 500);
        setContainerSize({ width: size, height: size });
      }
    };
    
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Calculate optimal scale for shape to fit inside inner ring
  const calculateOptimalScale = () => {
    const innerRingRadius = containerSize.width * 0.4;
    const maxSize = innerRingRadius * 2 * 0.85; // 85% of inner ring diameter
    
    // Get the largest dimension of the shape
    let largestDimension = 1;
    switch (shape) {
      case 'rectangle':
      case 'l-shape':
      case 'oval':
        const width = dimensions.width || 4;
        const length = dimensions.length || 3;
        largestDimension = Math.max(width, length);
        break;
      case 'square':
        largestDimension = dimensions.width || 4;
        break;
      case 'circle':
        largestDimension = (dimensions.radius || 5) * 2;
        break;
      case 'triangle':
        largestDimension = Math.max(dimensions.width || 4, dimensions.length || 3);
        break;
      default:
        largestDimension = Math.max(dimensions.width || 4, dimensions.length || 3);
    }
    
    // Calculate scale to fit shape inside inner ring
    return maxSize / (largestDimension * 20);
  };

  // Get garden shape path
  const getShapePath = () => {
    const centerX = containerSize.width / 2;
    const centerY = containerSize.height / 2;
    const scale = calculateOptimalScale();
    
    switch (shape) {
      case 'rectangle':
        const rectWidth = (dimensions.width || 4) * 20 * scale;
        const rectHeight = (dimensions.length || 3) * 20 * scale;
        return `M ${centerX - rectWidth/2} ${centerY - rectHeight/2} 
                h ${rectWidth} v ${rectHeight} h ${-rectWidth} z`;
      
      case 'square':
        const squareSize = (dimensions.width || 4) * 20 * scale;
        return `M ${centerX - squareSize/2} ${centerY - squareSize/2} 
                h ${squareSize} v ${squareSize} h ${-squareSize} z`;
      
      case 'circle':
        const radius = (dimensions.radius || 5) * 20 * scale;
        return `M ${centerX} ${centerY - radius} 
                A ${radius} ${radius} 0 1 1 ${centerX} ${centerY + radius}
                A ${radius} ${radius} 0 1 1 ${centerX} ${centerY - radius}`;
      
      case 'oval':
        const ovalWidth = (dimensions.width || 4) * 20 * scale;
        const ovalHeight = (dimensions.length || 6) * 20 * scale;
        return `M ${centerX - ovalWidth/2} ${centerY} 
                A ${ovalWidth/2} ${ovalHeight/2} 0 1 1 ${centerX + ovalWidth/2} ${centerY}
                A ${ovalWidth/2} ${ovalHeight/2} 0 1 1 ${centerX - ovalWidth/2} ${centerY}`;
      
      case 'triangle':
        const triWidth = (dimensions.width || 4) * 20 * scale;
        const triHeight = (dimensions.length || 3) * 20 * scale;
        return `M ${centerX} ${centerY - triHeight/2} 
                L ${centerX - triWidth/2} ${centerY + triHeight/2} 
                L ${centerX + triWidth/2} ${centerY + triHeight/2} z`;
      
      case 'l-shape':
        const lWidth = (dimensions.width || 4) * 20 * scale;
        const lHeight = (dimensions.length || 3) * 20 * scale;
        return `M ${centerX - lWidth/2} ${centerY - lHeight/2}
                h ${lWidth * 0.6} v ${lHeight * 0.4}
                h ${lWidth * 0.4} v ${lHeight * 0.6}
                h ${-lWidth} z`;
      
      default:
        return getShapePath();
    }
  };

  // Handle mouse down on rings
  const handleMouseDown = (e: React.MouseEvent, ring: 'cardinal' | 'viewer') => {
    e.preventDefault();
    if (ring === 'cardinal') {
      setIsDraggingCardinal(true);
    } else {
      setIsDraggingViewer(true);
    }
  };

  // Handle mouse move for rotation
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!svgRef.current || (!isDraggingCardinal && !isDraggingViewer)) return;
      
      const rect = svgRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      
      const angle = Math.atan2(e.clientY - centerY, e.clientX - centerX) * (180 / Math.PI) + 90;
      
      if (isDraggingCardinal) {
        setCardinalRotation(angle);
      } else if (isDraggingViewer) {
        setViewerRotation(angle);
      }
    };

    const handleMouseUp = () => {
      setIsDraggingCardinal(false);
      setIsDraggingViewer(false);
    };

    if (isDraggingCardinal || isDraggingViewer) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDraggingCardinal, isDraggingViewer]);

  const centerX = containerSize.width / 2;
  const centerY = containerSize.height / 2;
  const outerRadius = containerSize.width * 0.45;
  const innerRadius = containerSize.width * 0.4;
  
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

  // Generate garden assessment based on conditions
  const generateAssessment = () => {
    const tips: string[] = [];
    
    // Get actual cardinal direction considering rotation
    const actualDirection = directions[(Math.round(cardinalRotation / 45) + directions.indexOf(slopeDirection)) % 8];
    
    // Slope assessment
    if (slopePercentage > 0) {
      if (slopePercentage < 10) {
        tips.push(`🌱 Gentle ${slopePercentage}% slope facing ${actualDirection} - Ideal for most plants with good drainage`);
      } else if (slopePercentage < 25) {
        tips.push(`⛰️ Moderate ${slopePercentage}% slope facing ${actualDirection} - Consider terracing for better planting areas`);
      } else {
        tips.push(`🏔️ Steep ${slopePercentage}% slope facing ${actualDirection} - Requires erosion control and terracing`);
      }
    }
    
    // Sun exposure based on slope direction
    if (actualDirection.includes('S')) {
      tips.push('☀️ South-facing slope maximizes sun exposure - Perfect for sun-loving plants and earlier spring growth');
    } else if (actualDirection.includes('N')) {
      tips.push('🌤️ North-facing slope provides cooler conditions - Ideal for shade-tolerant and moisture-loving plants');
    } else if (actualDirection.includes('E')) {
      tips.push('🌅 East-facing slope gets morning sun - Great for plants that prefer gentler morning light');
    } else if (actualDirection.includes('W')) {
      tips.push('🌇 West-facing slope receives afternoon sun - Consider heat-tolerant plants for intense afternoon exposure');
    }
    
    // Hardiness zone tips
    if (usdaZone) {
      const zone = parseInt(usdaZone);
      if (zone <= 5) {
        tips.push(`❄️ USDA Zone ${usdaZone} - Focus on cold-hardy perennials and protect tender plants in winter`);
      } else if (zone <= 8) {
        tips.push(`🌡️ USDA Zone ${usdaZone} - Wide variety of plants possible with proper seasonal care`);
      } else {
        tips.push(`🌴 USDA Zone ${usdaZone} - Year-round growing possible, watch for heat stress in summer`);
      }
    }
    
    // Viewing angle tips
    const viewAngle = (viewerRotation + 360) % 360;
    if (viewAngle >= 315 || viewAngle < 45) {
      tips.push('👁️ Main view from South - Design will emphasize the back/north side of plantings');
    } else if (viewAngle >= 45 && viewAngle < 135) {
      tips.push('👁️ Main view from West - Morning shadows will create dramatic effects');
    } else if (viewAngle >= 135 && viewAngle < 225) {
      tips.push('👁️ Main view from North - Front-facing plants will get maximum visual impact');
    } else {
      tips.push('👁️ Main view from East - Evening light will highlight your garden beautifully');
    }
    
    // Combined factors
    if (slopePercentage > 15 && actualDirection.includes('S')) {
      tips.push('💡 Steep south slope creates a natural microclimate - Can grow plants from 1 zone warmer');
    }
    if (slopePercentage > 10) {
      tips.push('💧 Slope aids drainage - Choose plants that prefer well-drained soil, avoid bog plants');
    }
    
    setAssessment(tips);
    setShowAssessment(true);
  };

  return (
    <div ref={containerRef} className="w-full">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left side - Canvas */}
        <div>
          <div className="mb-3 text-sm space-y-1">
            <div className="flex justify-between">
              <span className="font-medium">Dimensions:</span>
              <span>
                {shape === 'circle' 
                  ? `Radius: ${dimensions.radius || 5} ${units === 'metric' ? 'm' : 'ft'}`
                  : `${dimensions.width || 4} x ${dimensions.length || 3} ${units === 'metric' ? 'm' : 'ft'}`
                }
              </span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Area:</span>
              <span>{calculateArea()} {units === 'metric' ? 'm²' : 'sq ft'}</span>
            </div>
          </div>

          <svg
        ref={svgRef}
        width={containerSize.width}
        height={containerSize.height}
        className="border rounded-lg bg-white cursor-move"
        style={{ touchAction: 'none' }}
      >
        {/* Outer Cardinal Ring */}
        <g transform={`rotate(${cardinalRotation} ${centerX} ${centerY})`}>
          <circle
            cx={centerX}
            cy={centerY}
            r={outerRadius}
            fill="none"
            stroke="#004025"
            strokeWidth="2"
            opacity="0.3"
          />
          
          {/* Cardinal Direction Markers */}
          {directions.map((dir, i) => {
            const angle = i * 45;
            const radian = (angle - 90) * (Math.PI / 180);
            const x = centerX + outerRadius * Math.cos(radian);
            const y = centerY + outerRadius * Math.sin(radian);
            const isMainDirection = i % 2 === 0;
            
            return (
              <g key={dir}>
                <circle
                  cx={x}
                  cy={y}
                  r={isMainDirection ? 12 : 8}
                  fill={dir === 'N' ? '#dc2626' : dir === 'S' ? '#fbbf24' : '#004025'}
                  onMouseDown={(e) => handleMouseDown(e, 'cardinal')}
                  className="cursor-grab active:cursor-grabbing"
                />
                {dir === 'S' ? (
                  // Sun icon for South
                  <g pointerEvents="none">
                    <circle
                      cx={x}
                      cy={y}
                      r={4}
                      fill="#fff"
                    />
                    {/* Sun rays */}
                    {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => {
                      const rad = angle * (Math.PI / 180);
                      const x1 = x + 5 * Math.cos(rad);
                      const y1 = y + 5 * Math.sin(rad);
                      const x2 = x + 8 * Math.cos(rad);
                      const y2 = y + 8 * Math.sin(rad);
                      return (
                        <line
                          key={angle}
                          x1={x1}
                          y1={y1}
                          x2={x2}
                          y2={y2}
                          stroke="#fff"
                          strokeWidth="1.5"
                        />
                      );
                    })}
                  </g>
                ) : (
                  <text
                    x={x}
                    y={y}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="white"
                    fontSize={isMainDirection ? "11" : "9"}
                    fontWeight="bold"
                    pointerEvents="none"
                  >
                    {dir}
                  </text>
                )}
              </g>
            );
          })}
          
          {/* Ring grip indicator */}
          <path
            d={`M ${centerX - 30} ${centerY - outerRadius} 
                Q ${centerX} ${centerY - outerRadius - 10} ${centerX + 30} ${centerY - outerRadius}`}
            fill="none"
            stroke="#004025"
            strokeWidth="3"
            strokeDasharray="5,5"
            opacity="0.5"
            onMouseDown={(e) => handleMouseDown(e, 'cardinal')}
            className="cursor-grab active:cursor-grabbing"
          />
        </g>

        {/* Inner Viewer Ring */}
        <g transform={`rotate(${viewerRotation} ${centerX} ${centerY})`}>
          <circle
            cx={centerX}
            cy={centerY}
            r={innerRadius}
            fill="none"
            stroke="#1e88e5"
            strokeWidth="3"
            opacity="0.6"
          />
          
          {/* Viewer Position Indicator */}
          <g>
            <circle
              cx={centerX}
              cy={centerY - innerRadius}
              r={10}
              fill="#0066cc"
              onMouseDown={(e) => handleMouseDown(e, 'viewer')}
              className="cursor-grab active:cursor-grabbing"
            />
            {/* Eye icon */}
            <path
              d={`M ${centerX - 6} ${centerY - innerRadius} 
                  Q ${centerX} ${centerY - innerRadius - 4} ${centerX + 6} ${centerY - innerRadius}
                  Q ${centerX} ${centerY - innerRadius + 4} ${centerX - 6} ${centerY - innerRadius}`}
              fill="white"
              pointerEvents="none"
            />
            <circle
              cx={centerX}
              cy={centerY - innerRadius}
              r={2}
              fill="white"
              pointerEvents="none"
            />
          </g>
          
          {/* View direction arrow - inside ring pointing inward */}
          <path
            d={`M ${centerX} ${centerY - innerRadius + 60} 
                L ${centerX - 8} ${centerY - innerRadius + 45} 
                L ${centerX - 3} ${centerY - innerRadius + 45}
                L ${centerX - 3} ${centerY - innerRadius + 30}
                L ${centerX + 3} ${centerY - innerRadius + 30}
                L ${centerX + 3} ${centerY - innerRadius + 45}
                L ${centerX + 8} ${centerY - innerRadius + 45} z`}
            fill="#1e88e5"
            opacity="0.9"
            pointerEvents="none"
          />
        </g>

        {/* Garden gradient */}
        <defs>
          <radialGradient id="gardenGradient" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#81c784" />
            <stop offset="50%" stopColor="#66bb6a" />
            <stop offset="100%" stopColor="#4caf50" />
          </radialGradient>
        </defs>
        
        {/* Garden Shape */}
        <path
          d={getShapePath()}
          fill="url(#gardenGradient)"
          stroke="#004025"
          strokeWidth="2"
          opacity="0.9"
        />
      </svg>

          <div className="mt-3 text-xs text-muted-foreground space-y-1">
            <p>🔴 Drag the red N marker to orient North to your property</p>
            <p>👁️ Drag the blue eye to set your main viewing angle</p>
          </div>
          
          {/* Assessment Button */}
          <Button 
            onClick={generateAssessment}
            className="w-full mt-3"
            variant="outline"
            size="sm"
            data-testid="button-assess-garden"
          >
            <Lightbulb className="w-4 h-4 mr-2" />
            Analyze Garden Conditions
          </Button>
        </div>

        {/* Right side - Assessment Panel */}
        {showAssessment && (
          <Card className="border-green-300 bg-green-50/50">
            <CardHeader className="py-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-green-600" />
                Garden Assessment
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2">
                {assessment.map((tip, index) => (
                  <div 
                    key={index} 
                    className="text-xs p-2 bg-white rounded-lg border border-green-200"
                  >
                    {tip}
                  </div>
                ))}
              </div>
              
              {/* Summary Box */}
              <div className="mt-4 p-3 bg-gradient-to-r from-green-100 to-blue-100 rounded-lg">
                <p className="text-xs font-semibold mb-1">🌿 Overall Recommendation:</p>
                <p className="text-xs">
                  Based on your garden's orientation and conditions, focus on plants that match 
                  your specific microclimate. Consider the viewing angle when placing focal points 
                  and specimen plants for maximum visual impact.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}