import { useRef, useEffect, useState, useCallback } from 'react';
import * as THREE from 'three';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { 
  Download, 
  RotateCcw, 
  Camera, 
  Sun, 
  Eye, 
  Sparkles, 
  ImageIcon, 
  Loader2, 
  TreePine, 
  Leaf, 
  Snowflake, 
  Info,
  Mountain,
  Compass
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { useQuery } from '@tanstack/react-query';
import type { Garden } from '@/types/garden';
import type { Plant } from '@/types/plant';
import type { PlacedPlant } from '@/components/garden/garden-layout-canvas';
import { 
  createGardenScene3D, 
  createCameraParameters,
  createLightingParameters,
  type GardenScene3D, 
  type PlantInstance3D,
  type GardenBounds
} from '@shared/schema';

interface Garden3DViewProps {
  gardenId: string;
  gardenName: string;
  gardenData: Garden;
  placedPlants: PlacedPlant[];
}

// Convert north orientation enum to degrees
const northOrientationToDegrees = (orientation?: string | null): number => {
  const orientationMap: Record<string, number> = {
    'N': 0,
    'NE': 45,
    'E': 90,
    'SE': 135,
    'S': 180,
    'SW': 225,
    'W': 270,
    'NW': 315
  };
  return orientation ? (orientationMap[orientation] || 0) : 0;
};

// Convert point of view to initial camera settings
const pointOfViewToCamera = (pov?: string | null): { distance: number; height: number; rotation: number } => {
  switch (pov) {
    case 'top_down':
      return { distance: 10, height: 15, rotation: 0 };
    case 'bird_eye':
      return { distance: 15, height: 10, rotation: 45 };
    case 'ground_level':
      return { distance: 8, height: 2, rotation: 0 };
    case 'elevated_angle':
      return { distance: 12, height: 5, rotation: 30 };
    case 'isometric':
      return { distance: 15, height: 12, rotation: 45 };
    default:
      return { distance: 15, height: 5, rotation: 45 };
  }
};

export default function Garden3DView({
  gardenId,
  gardenName,
  gardenData,
  placedPlants
}: Garden3DViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const sunLightRef = useRef<THREE.DirectionalLight | null>(null);
  const sunHelperRef = useRef<THREE.Mesh | null>(null);
  const gardenBoundsRef = useRef<GardenBounds | null>(null);
  const plantMeshesRef = useRef<THREE.Group>(new THREE.Group());
  
  const [isSceneReady, setIsSceneReady] = useState(false);
  const [scene3D, setScene3D] = useState<GardenScene3D | null>(null);
  
  // Get initial camera settings from point of view
  const initialCamera = pointOfViewToCamera(gardenData.pointOfView);
  const cardinalRotation = northOrientationToDegrees(gardenData.northOrientation);
  
  // Render settings with database values
  const [renderSettings, setRenderSettings] = useState({
    season: 'summer' as 'spring' | 'summer' | 'autumn' | 'winter',
    timeOfDay: 14,
    viewingDistance: initialCamera.distance,
    viewingHeight: initialCamera.height,
    viewerRotation: initialCamera.rotation,
    showGrid: true,
    showCompass: true,
    showSunPath: true,
    shadowsEnabled: true,
    levelOfDetail: 'high' as 'low' | 'medium' | 'high' | 'ultra'
  });
  
  const { toast } = useToast();
  
  // Fetch plant data for placed plants
  const { data: plants } = useQuery<Plant[]>({
    queryKey: ["/api/plants", placedPlants.map(p => p.plantId)],
    queryFn: async () => {
      const uniquePlantIds = Array.from(new Set(placedPlants.map(p => p.plantId)));
      const promises = uniquePlantIds.map(id => 
        fetch(`/api/plants/${id}`).then(res => res.json())
      );
      return Promise.all(promises);
    },
    enabled: placedPlants.length > 0
  });

  // Initialize Three.js scene
  const initScene = useCallback(() => {
    if (!canvasRef.current || !containerRef.current) return;
    
    console.log('Initializing 3D scene with garden data:', {
      shape: gardenData.shape,
      dimensions: gardenData.dimensions,
      northOrientation: gardenData.northOrientation,
      cardinalRotation,
      slope: {
        percentage: gardenData.slopePercentage,
        direction: gardenData.slopeDirection
      }
    });
    
    // Reset previous scene if exists
    if (sceneRef.current) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (rendererRef.current) {
        rendererRef.current.dispose();
      }
    }
    
    // Create scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb); // Sky blue
    scene.fog = new THREE.Fog(0x87ceeb, 20, 100);
    
    // Create renderer
    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: true,
      alpha: true
    });
    renderer.shadowMap.enabled = renderSettings.shadowsEnabled;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    
    const rect = containerRef.current.getBoundingClientRect();
    renderer.setSize(rect.width, rect.height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    
    // Create camera
    const camera = new THREE.PerspectiveCamera(
      50,
      rect.width / rect.height,
      0.1,
      1000
    );
    
    // Store references
    sceneRef.current = scene;
    rendererRef.current = renderer;
    cameraRef.current = camera;
    
    // Add to scene
    scene.add(plantMeshesRef.current);
    
    setIsSceneReady(true);
  }, [gardenData, cardinalRotation, renderSettings.shadowsEnabled]);

  // Create garden ground and terrain
  const createGardenTerrain = useCallback((bounds: GardenBounds, slope?: { percentage?: number; direction?: string }) => {
    if (!sceneRef.current) return;
    
    // Remove existing ground if any
    const existingGround = sceneRef.current.getObjectByName('garden-ground');
    if (existingGround) {
      sceneRef.current.remove(existingGround);
    }
    
    // Calculate dimensions
    const width = bounds.maxX - bounds.minX;
    const depth = bounds.maxY - bounds.minY;
    
    // Create ground geometry based on shape
    let groundGeometry: THREE.BufferGeometry;
    
    switch (bounds.shape) {
      case 'circle':
        const radius = bounds.boundaryGeometry.radius || width / 2;
        groundGeometry = new THREE.CircleGeometry(radius, 64);
        groundGeometry.rotateX(-Math.PI / 2);
        break;
        
      case 'oval':
        // Create oval using scaled circle
        const radiusX = bounds.boundaryGeometry.radiusX || width / 2;
        const radiusY = bounds.boundaryGeometry.radiusY || depth / 2;
        groundGeometry = new THREE.CircleGeometry(1, 64);
        groundGeometry.scale(radiusX, radiusY, 1);
        groundGeometry.rotateX(-Math.PI / 2);
        break;
        
      default:
        // Rectangle/square
        groundGeometry = new THREE.PlaneGeometry(width, depth, 20, 20);
        groundGeometry.rotateX(-Math.PI / 2);
    }
    
    // Apply slope if present
    if (slope?.percentage && slope.percentage > 0) {
      const slopeRad = Math.atan(slope.percentage / 100);
      const directionMap: Record<string, number> = {
        'N': 0, 'NE': 45, 'E': 90, 'SE': 135,
        'S': 180, 'SW': 225, 'W': 270, 'NW': 315
      };
      const slopeAngle = (directionMap[slope.direction || 'S'] || 180) * Math.PI / 180;
      
      // Modify vertices to create slope
      const positions = groundGeometry.attributes.position;
      for (let i = 0; i < positions.count; i++) {
        const x = positions.getX(i);
        const z = positions.getZ(i);
        const distance = Math.sqrt(x * x + z * z);
        const angle = Math.atan2(z, x);
        const alignmentFactor = Math.cos(angle - slopeAngle);
        const elevation = distance * Math.tan(slopeRad) * alignmentFactor;
        positions.setY(i, elevation);
      }
      positions.needsUpdate = true;
      groundGeometry.computeVertexNormals();
    }
    
    // Create material with grass texture
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: 0x2d5016,
      roughness: 0.9,
      metalness: 0.1,
      side: THREE.DoubleSide
    });
    
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.name = 'garden-ground';
    ground.receiveShadow = true;
    ground.position.set(bounds.center.x, 0, bounds.center.y);
    
    sceneRef.current.add(ground);
    
    // Add grid helper if enabled
    if (renderSettings.showGrid) {
      const existingGrid = sceneRef.current.getObjectByName('grid-helper');
      if (existingGrid) {
        sceneRef.current.remove(existingGrid);
      }
      
      const gridSize = Math.max(width, depth) * 1.5;
      const gridHelper = new THREE.GridHelper(gridSize, 20, 0x888888, 0xcccccc);
      gridHelper.name = 'grid-helper';
      gridHelper.position.y = 0.01;
      sceneRef.current.add(gridHelper);
    }
    
    // Add compass if enabled
    if (renderSettings.showCompass) {
      const existingCompass = sceneRef.current.getObjectByName('compass');
      if (existingCompass) {
        sceneRef.current.remove(existingCompass);
      }
      
      const compassGroup = new THREE.Group();
      compassGroup.name = 'compass';
      
      // North arrow
      const arrowGeometry = new THREE.ConeGeometry(0.3, 1, 4);
      const northArrow = new THREE.Mesh(
        arrowGeometry,
        new THREE.MeshBasicMaterial({ color: 0xff0000 })
      );
      northArrow.rotation.z = Math.PI;
      northArrow.position.set(0, 1, -(Math.max(width, depth) / 2 + 2));
      
      // Rotate compass based on north orientation
      compassGroup.rotation.y = -cardinalRotation * Math.PI / 180;
      compassGroup.add(northArrow);
      
      sceneRef.current.add(compassGroup);
    }
  }, [renderSettings.showGrid, renderSettings.showCompass, cardinalRotation]);

  // Create plant representations
  const createPlants = useCallback((plants3D: PlantInstance3D[]) => {
    console.log('createPlants called with:', plants3D.length, 'plants');
    // Clear existing plants
    plantMeshesRef.current.clear();
    
    plants3D.forEach(plant => {
      console.log(`Creating ${plant.plantName} at position (${plant.position.x}, ${plant.position.y}) with height ${plant.dimensions.heightCurrent}m and spread ${plant.dimensions.spreadCurrent}m`);
      // Create plant representation
      let plantMesh: THREE.Mesh;
      
      // Different representations based on plant type
      if (plant.properties.type?.includes('tree')) {
        // Tree representation
        const trunkGeometry = new THREE.CylinderGeometry(0.1, 0.15, plant.dimensions.heightCurrent * 0.3);
        const trunkMaterial = new THREE.MeshStandardMaterial({ color: 0x4a3c28 });
        const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
        trunk.position.y = plant.dimensions.heightCurrent * 0.15;
        
        const crownRadius = plant.dimensions.spreadCurrent;
        const crownGeometry = new THREE.SphereGeometry(crownRadius, 16, 12);
        const crownMaterial = new THREE.MeshStandardMaterial({ 
          color: new THREE.Color(plant.properties.leafColor || '#2d5016')
        });
        const crown = new THREE.Mesh(crownGeometry, crownMaterial);
        crown.position.y = plant.dimensions.heightCurrent * 0.7;
        
        const treeGroup = new THREE.Group();
        treeGroup.add(trunk);
        treeGroup.add(crown);
        plantMesh = treeGroup as any;
      } else if (plant.properties.type?.includes('shrub')) {
        // Shrub representation
        const shrubGeometry = new THREE.SphereGeometry(
          plant.dimensions.spreadCurrent,
          12,
          8
        );
        shrubGeometry.scale(1, plant.dimensions.heightCurrent / plant.dimensions.spreadCurrent, 1);
        const shrubMaterial = new THREE.MeshStandardMaterial({
          color: new THREE.Color(plant.properties.leafColor || '#3a6b1c')
        });
        plantMesh = new THREE.Mesh(shrubGeometry, shrubMaterial);
        plantMesh.position.y = plant.dimensions.heightCurrent / 2;
      } else {
        // Default plant representation (perennials, etc.)
        const plantGeometry = new THREE.ConeGeometry(
          plant.dimensions.spreadCurrent,
          plant.dimensions.heightCurrent,
          8
        );
        const plantColor = plant.properties.flowerColor || plant.properties.leafColor || '#4a7c59';
        const plantMaterial = new THREE.MeshStandardMaterial({
          color: new THREE.Color(plantColor)
        });
        plantMesh = new THREE.Mesh(plantGeometry, plantMaterial);
        plantMesh.position.y = plant.dimensions.heightCurrent / 2;
      }
      
      // Position plant
      if (plantMesh instanceof THREE.Group) {
        plantMesh.position.x = plant.position.x;
        plantMesh.position.z = plant.position.y;
      } else {
        plantMesh.position.x = plant.position.x;
        plantMesh.position.z = plant.position.y;
      }
      
      plantMesh.castShadow = true;
      plantMesh.receiveShadow = true;
      plantMesh.userData = { plant };
      
      plantMeshesRef.current.add(plantMesh);
      console.log(`Added ${plant.plantName} to scene`);
    });
    console.log('Total plants in scene:', plantMeshesRef.current.children.length);
  }, []);

  // Update lighting based on settings
  const updateLighting = useCallback(() => {
    if (!sceneRef.current || !gardenBoundsRef.current) return;
    
    // Remove existing sun light
    if (sunLightRef.current) {
      sceneRef.current.remove(sunLightRef.current);
      sunLightRef.current.dispose();
    }
    
    // Remove existing sun helper
    if (sunHelperRef.current) {
      sceneRef.current.remove(sunHelperRef.current);
    }
    
    // Create new lighting parameters
    const lighting = createLightingParameters(
      cardinalRotation,
      renderSettings.timeOfDay,
      renderSettings.season
    );
    
    // Create sun light
    const sunLight = new THREE.DirectionalLight(
      lighting.sun.color,
      lighting.sun.intensity
    );
    
    // Scale sun position to scene
    const scaleFactor = 0.05;
    sunLight.position.set(
      lighting.sun.position.x * scaleFactor,
      lighting.sun.position.z * scaleFactor, // Y and Z swapped for Three.js coordinate system
      lighting.sun.position.y * scaleFactor
    );
    
    sunLight.castShadow = renderSettings.shadowsEnabled;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 50;
    
    const gardenSize = Math.max(
      gardenBoundsRef.current.maxX - gardenBoundsRef.current.minX,
      gardenBoundsRef.current.maxY - gardenBoundsRef.current.minY
    );
    sunLight.shadow.camera.left = -gardenSize;
    sunLight.shadow.camera.right = gardenSize;
    sunLight.shadow.camera.top = gardenSize;
    sunLight.shadow.camera.bottom = -gardenSize;
    
    sceneRef.current.add(sunLight);
    sunLightRef.current = sunLight;
    
    // Update ambient light
    const ambientLight = sceneRef.current.getObjectByName('ambient-light') as THREE.AmbientLight;
    if (ambientLight) {
      ambientLight.color = new THREE.Color(lighting.ambient.color);
      ambientLight.intensity = lighting.ambient.intensity;
    } else {
      const newAmbientLight = new THREE.AmbientLight(
        lighting.ambient.color,
        lighting.ambient.intensity
      );
      newAmbientLight.name = 'ambient-light';
      sceneRef.current.add(newAmbientLight);
    }
    
    // Add sun path visualization if enabled
    if (renderSettings.showSunPath) {
      // Create sun sphere
      const sunGeometry = new THREE.SphereGeometry(0.5, 16, 16);
      const sunMaterial = new THREE.MeshBasicMaterial({ 
        color: 0xffff00
      });
      const sunSphere = new THREE.Mesh(sunGeometry, sunMaterial);
      sunSphere.position.copy(sunLight.position);
      sceneRef.current.add(sunSphere);
      sunHelperRef.current = sunSphere;
      
      // Create sun path arc
      const pathCurve = new THREE.EllipseCurve(
        0, 0,
        gardenSize * 1.5, gardenSize * 1.5,
        0, Math.PI,
        false,
        0
      );
      const pathPoints = pathCurve.getPoints(50);
      const pathGeometry = new THREE.BufferGeometry().setFromPoints(
        pathPoints.map(p => new THREE.Vector3(p.x, p.y + 5, 0))
      );
      
      // Rotate path based on cardinal direction
      pathGeometry.rotateY(-cardinalRotation * Math.PI / 180);
      
      const pathMaterial = new THREE.LineBasicMaterial({ 
        color: 0xffaa00,
        opacity: 0.3,
        transparent: true
      });
      const pathLine = new THREE.Line(pathGeometry, pathMaterial);
      pathLine.name = 'sun-path';
      
      // Remove old path if exists
      const oldPath = sceneRef.current.getObjectByName('sun-path');
      if (oldPath) sceneRef.current.remove(oldPath);
      
      sceneRef.current.add(pathLine);
    }
  }, [renderSettings, cardinalRotation]);

  // Update camera position
  const updateCamera = useCallback(() => {
    if (!cameraRef.current || !gardenBoundsRef.current) return;
    
    const camera = createCameraParameters(
      cardinalRotation,
      renderSettings.viewerRotation,
      gardenBoundsRef.current,
      renderSettings.viewingDistance,
      renderSettings.viewingHeight
    );
    
    cameraRef.current.position.set(
      camera.position.x,
      camera.position.z, // Y and Z swapped for Three.js
      camera.position.y
    );
    
    cameraRef.current.lookAt(
      camera.target.x,
      camera.target.z,
      camera.target.y
    );
    
    cameraRef.current.fov = camera.fov;
    cameraRef.current.updateProjectionMatrix();
  }, [renderSettings, cardinalRotation]);

  // Animation loop
  const animate = useCallback(() => {
    if (!rendererRef.current || !sceneRef.current || !cameraRef.current) return;
    
    rendererRef.current.render(sceneRef.current, cameraRef.current);
    animationFrameRef.current = requestAnimationFrame(animate);
  }, []);

  // Build complete 3D scene
  const buildScene = useCallback(() => {
    console.log('Building scene - plants:', plants, 'isSceneReady:', isSceneReady, 'placedPlants:', placedPlants);
    if (!plants || !isSceneReady) return;
    
    // Create garden scene data
    const sceneData = createGardenScene3D({
      gardenId,
      gardenName,
      shape: gardenData.shape,
      dimensions: gardenData.dimensions as Record<string, number>,
      units: gardenData.units as 'metric' | 'imperial',
      placedPlants,
      plants: plants as any[],
      orientationSettings: {
        cardinalRotation,
        viewerRotation: renderSettings.viewerRotation
      },
      environmentSettings: {
        season: renderSettings.season,
        timeOfDay: renderSettings.timeOfDay,
        slopePercentage: gardenData.slopePercentage || 0,
        slopeDirection: gardenData.slopeDirection || 'S',
        latitude: 45 // Default latitude, could be calculated from location
      }
    });
    
    setScene3D(sceneData);
    gardenBoundsRef.current = sceneData.bounds;
    
    // Create terrain
    createGardenTerrain(sceneData.bounds, {
      percentage: gardenData.slopePercentage,
      direction: gardenData.slopeDirection
    });
    
    // Create plants
    console.log('Creating plants in 3D scene:', sceneData.plants);
    createPlants(sceneData.plants);
    
    // Update lighting and camera
    updateLighting();
    updateCamera();
    
    // Start animation
    if (!animationFrameRef.current) {
      animate();
    }
  }, [
    plants,
    isSceneReady,
    gardenId,
    gardenName,
    gardenData,
    placedPlants,
    cardinalRotation,
    renderSettings,
    createGardenTerrain,
    createPlants,
    updateLighting,
    updateCamera,
    animate
  ]);

  // Initialize scene on mount
  useEffect(() => {
    initScene();
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (rendererRef.current) {
        rendererRef.current.dispose();
      }
    };
  }, [initScene]);

  // Build scene when ready
  useEffect(() => {
    buildScene();
  }, [buildScene]);

  // Update scene when settings change
  useEffect(() => {
    if (isSceneReady && gardenBoundsRef.current) {
      updateLighting();
      updateCamera();
    }
  }, [renderSettings, isSceneReady, updateLighting, updateCamera]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (!containerRef.current || !rendererRef.current || !cameraRef.current) return;
      
      const rect = containerRef.current.getBoundingClientRect();
      rendererRef.current.setSize(rect.width, rect.height);
      cameraRef.current.aspect = rect.width / rect.height;
      cameraRef.current.updateProjectionMatrix();
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Reset view to defaults
  const handleResetView = () => {
    const initial = pointOfViewToCamera(gardenData.pointOfView);
    setRenderSettings(prev => ({
      ...prev,
      viewingDistance: initial.distance,
      viewingHeight: initial.height,
      viewerRotation: initial.rotation,
      timeOfDay: 14,
      season: 'summer'
    }));
  };

  // Export as image
  const handleExportImage = () => {
    if (!rendererRef.current || !sceneRef.current || !cameraRef.current) return;
    
    rendererRef.current.render(sceneRef.current, cameraRef.current);
    const dataURL = rendererRef.current.domElement.toDataURL('image/png');
    
    const link = document.createElement('a');
    link.download = `${gardenName}-3d-view.png`;
    link.href = dataURL;
    link.click();
    
    toast({
      title: "Image Exported",
      description: "Your 3D garden view has been saved as an image.",
    });
  };

  return (
    <Card className="border-2 border-gray-200">
      <CardHeader className="pb-4">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-xl font-semibold">3D Garden Visualization</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Interactive 3D view with realistic lighting and terrain
            </p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleResetView}
              data-testid="button-reset-3d-view"
            >
              <RotateCcw className="w-4 h-4 mr-1" />
              Reset View
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleExportImage}
              data-testid="button-export-3d-image"
            >
              <Download className="w-4 h-4 mr-1" />
              Export
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* 3D Canvas */}
        <div 
          ref={containerRef}
          className="relative bg-gradient-to-b from-blue-100 to-green-50 rounded-lg overflow-hidden"
          style={{ height: '500px' }}
          data-testid="3d-canvas-container"
        >
          <canvas 
            ref={canvasRef}
            className="w-full h-full"
            data-testid="3d-canvas"
          />
          
          {/* Status indicators */}
          <div className="absolute top-4 left-4 space-y-2">
            {gardenData.northOrientation && (
              <Badge variant="secondary" className="bg-white/90">
                <Compass className="w-3 h-3 mr-1" />
                North: {gardenData.northOrientation}
              </Badge>
            )}
            {gardenData.slopePercentage && gardenData.slopePercentage > 0 && (
              <Badge variant="secondary" className="bg-white/90">
                <Mountain className="w-3 h-3 mr-1" />
                Slope: {gardenData.slopePercentage}% {gardenData.slopeDirection}
              </Badge>
            )}
          </div>
          
          {/* Loading state */}
          {!isSceneReady && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/50">
              <div className="text-center">
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Loading 3D scene...</p>
              </div>
            </div>
          )}
        </div>
        
        {/* Control Panel */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Camera Controls */}
          <div className="space-y-4">
            <h3 className="font-medium text-sm flex items-center gap-2">
              <Camera className="w-4 h-4" />
              Camera Controls
            </h3>
            
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Distance: {renderSettings.viewingDistance}m</Label>
                <Slider
                  value={[renderSettings.viewingDistance]}
                  onValueChange={([value]) => setRenderSettings(prev => ({ ...prev, viewingDistance: value }))}
                  min={5}
                  max={30}
                  step={1}
                  className="mt-1"
                  data-testid="slider-camera-distance"
                />
              </div>
              
              <div>
                <Label className="text-xs">Height: {renderSettings.viewingHeight}m</Label>
                <Slider
                  value={[renderSettings.viewingHeight]}
                  onValueChange={([value]) => setRenderSettings(prev => ({ ...prev, viewingHeight: value }))}
                  min={2}
                  max={15}
                  step={0.5}
                  className="mt-1"
                  data-testid="slider-camera-height"
                />
              </div>
              
              <div>
                <Label className="text-xs">Rotation: {renderSettings.viewerRotation}°</Label>
                <Slider
                  value={[renderSettings.viewerRotation]}
                  onValueChange={([value]) => setRenderSettings(prev => ({ ...prev, viewerRotation: value }))}
                  min={0}
                  max={360}
                  step={5}
                  className="mt-1"
                  data-testid="slider-viewer-rotation"
                />
              </div>
            </div>
          </div>
          
          {/* Environment Controls */}
          <div className="space-y-4">
            <h3 className="font-medium text-sm flex items-center gap-2">
              <Sun className="w-4 h-4" />
              Environment Settings
            </h3>
            
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Time of Day: {renderSettings.timeOfDay}:00</Label>
                <Slider
                  value={[renderSettings.timeOfDay]}
                  onValueChange={([value]) => setRenderSettings(prev => ({ ...prev, timeOfDay: value }))}
                  min={6}
                  max={20}
                  step={1}
                  className="mt-1"
                  data-testid="slider-time-of-day"
                />
              </div>
              
              <div>
                <Label className="text-xs">Season</Label>
                <Select 
                  value={renderSettings.season} 
                  onValueChange={(value: any) => setRenderSettings(prev => ({ ...prev, season: value }))}
                >
                  <SelectTrigger className="w-full mt-1" data-testid="select-season">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="spring">
                      <span className="flex items-center gap-2">
                        <Leaf className="w-4 h-4 text-green-500" />
                        Spring
                      </span>
                    </SelectItem>
                    <SelectItem value="summer">
                      <span className="flex items-center gap-2">
                        <Sun className="w-4 h-4 text-yellow-500" />
                        Summer
                      </span>
                    </SelectItem>
                    <SelectItem value="autumn">
                      <span className="flex items-center gap-2">
                        <TreePine className="w-4 h-4 text-orange-500" />
                        Autumn
                      </span>
                    </SelectItem>
                    <SelectItem value="winter">
                      <span className="flex items-center gap-2">
                        <Snowflake className="w-4 h-4 text-blue-500" />
                        Winter
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Show Grid</Label>
                  <Switch
                    checked={renderSettings.showGrid}
                    onCheckedChange={(checked) => setRenderSettings(prev => ({ ...prev, showGrid: checked }))}
                    data-testid="switch-show-grid"
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Show Compass</Label>
                  <Switch
                    checked={renderSettings.showCompass}
                    onCheckedChange={(checked) => setRenderSettings(prev => ({ ...prev, showCompass: checked }))}
                    data-testid="switch-show-compass"
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Show Sun Path</Label>
                  <Switch
                    checked={renderSettings.showSunPath}
                    onCheckedChange={(checked) => setRenderSettings(prev => ({ ...prev, showSunPath: checked }))}
                    data-testid="switch-show-sun-path"
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Shadows</Label>
                  <Switch
                    checked={renderSettings.shadowsEnabled}
                    onCheckedChange={(checked) => setRenderSettings(prev => ({ ...prev, shadowsEnabled: checked }))}
                    data-testid="switch-shadows"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Info Alert */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <span className="font-medium">3D Visualization:</span> This view uses your garden's north orientation 
            ({gardenData.northOrientation || 'N'}) and terrain settings to create an accurate 3D representation. 
            The sun position is calculated based on time of day and cardinal direction.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}