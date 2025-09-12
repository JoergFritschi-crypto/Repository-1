import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as THREE from 'three';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Download, RotateCcw, Settings, Camera, Sun, Eye } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { 
  createGardenScene3D, 
  type GardenScene3D, 
  type PlacedPlant,
  type PlantInstance3D
} from '@shared/schema';

interface GardenRenderer3DProps {
  gardenData: {
    gardenId: string;
    gardenName: string;
    shape: string;
    dimensions: Record<string, number>;
    units: 'metric' | 'imperial';
    slopeDirection?: string;
    slopePercentage?: number;
  };
  placedPlants: PlacedPlant[];
  inventoryPlants: any[];
  orientationSettings?: {
    cardinalRotation: number;
    viewerRotation: number;
  };
}

export default function GardenRenderer3D({
  gardenData,
  placedPlants,
  inventoryPlants,
  orientationSettings = { cardinalRotation: 0, viewerRotation: 45 }
}: GardenRenderer3DProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const billboardsRef = useRef<THREE.Sprite[]>([]);
  const textureCache = useRef<Map<string, THREE.Texture>>(new Map());
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSceneReady, setIsSceneReady] = useState(false);
  const [scene3D, setScene3D] = useState<GardenScene3D | null>(null);
  const [renderSettings, setRenderSettings] = useState({
    season: 'summer' as 'spring' | 'summer' | 'autumn' | 'winter',
    timeOfDay: 14,
    viewingDistance: 15,
    viewingHeight: 5,
    showGrid: true,
    shadowsEnabled: true,
    levelOfDetail: 'medium' as 'low' | 'medium' | 'high' | 'ultra'
  });
  
  const { toast } = useToast();

  // CRITICAL FIX: Centralized scene reset with comprehensive resource disposal
  const resetScene = useCallback(() => {
    console.log('Resetting 3D scene and disposing resources...');
    
    // Cancel animation frame to prevent memory leaks
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    
    // Dispose billboards with proper material cleanup
    billboardsRef.current.forEach(billboard => {
      if (sceneRef.current) {
        sceneRef.current.remove(billboard);
      }
      // Dispose billboard material (but preserve cached textures)
      if (billboard.material) {
        billboard.material.dispose();
      }
    });
    billboardsRef.current = [];
    
    // Dispose renderer resources
    if (rendererRef.current) {
      rendererRef.current.dispose();
      rendererRef.current = null;
    }
    
    // CRITICAL: Comprehensively dispose previous scene's resources
    if (sceneRef.current) {
      // Track cached textures for proper preservation
      const cachedTextures = new Set(textureCache.current.values());
      
      sceneRef.current.traverse((object) => {
        // CRITICAL FIX: Include THREE.LineSegments for GridHelper/AxesHelper disposal
        if (object instanceof THREE.Mesh || 
            object instanceof THREE.Line || 
            object instanceof THREE.Points || 
            object instanceof THREE.LineSegments || 
            object instanceof THREE.Sprite) {
          
          // Dispose geometries
          if (object.geometry) {
            object.geometry.dispose();
          }
          
          // Dispose materials and their textures with corrected cache logic
          if (object.material) {
            if (Array.isArray(object.material)) {
              object.material.forEach(material => {
                // CRITICAL FIX: Correct cache preservation using Set of cached textures
                if (material.map && !cachedTextures.has(material.map)) {
                  material.map.dispose();
                }
                material.dispose();
              });
            } else {
              // CRITICAL FIX: Correct cache preservation using Set of cached textures
              if (object.material.map && !cachedTextures.has(object.material.map)) {
                object.material.map.dispose();
              }
              object.material.dispose();
            }
          }
        }
        
        // Dispose lights and their shadow maps
        if (object instanceof THREE.Light) {
          if (object.shadow && object.shadow.map) {
            object.shadow.map.dispose();
          }
        }
      });
      
      // Clear scene hierarchy and reset
      sceneRef.current.clear();
      sceneRef.current = null;
    }
    
    // Reset camera reference
    cameraRef.current = null;
    
    console.log('Scene reset complete - GPU resources disposed');
  }, []);

  // Optional: Texture cache management with improved filtering
  const manageTextureCache = useCallback((forceReset: boolean = false) => {
    if (forceReset || textureCache.current.size > 50) { // Limit cache size
      console.log(`Managing texture cache (${textureCache.current.size} textures)`);
      textureCache.current.forEach(texture => {
        texture.dispose();
      });
      textureCache.current.clear();
    }
    
    // Apply better texture filtering for existing cached textures
    textureCache.current.forEach(texture => {
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.needsUpdate = true;
    });
  }, []);

  // Initialize Three.js scene
  const initializeScene = useCallback(() => {
    if (!canvasRef.current || !containerRef.current) return null;

    // CRITICAL FIX: Use centralized reset function for proper resource disposal
    // This ensures no previous scene resources remain in GPU memory
    resetScene();

    // Create scene with proper coordinate system
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb); // Sky blue background
    
    // Set up renderer with Z-up coordinate system
    const renderer = new THREE.WebGLRenderer({ 
      canvas: canvasRef.current,
      antialias: true,
      preserveDrawingBuffer: true // For export functionality
    });
    
    // Get container dimensions for dynamic aspect ratio
    const container = containerRef.current;
    const rect = container.getBoundingClientRect();
    const width = rect.width;
    const height = Math.max(400, rect.width * 0.6); // Maintain reasonable aspect ratio
    
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = renderSettings.shadowsEnabled;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    
    // Create camera with dynamic aspect ratio (NOT hardcoded 16/9)
    const camera = new THREE.PerspectiveCamera(
      60, // FOV
      width / height, // Dynamic aspect ratio from container
      0.1, // Near plane
      1000 // Far plane
    );
    
    // CRITICAL: Set Z-up coordinate system as required
    camera.up.set(0, 0, 1);
    
    // Position camera for good initial view
    camera.position.set(10, -10, 8);
    camera.lookAt(0, 0, 0);
    
    // Create ground plane at z=0 (oriented for Z-up system)
    const groundGeometry = new THREE.PlaneGeometry(50, 50);
    const groundMaterial = new THREE.MeshLambertMaterial({ 
      color: 0x8b4513,
      transparent: true,
      opacity: 0.8
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.position.set(0, 0, 0); // At z=0 for Z-up system
    ground.receiveShadow = true;
    scene.add(ground);
    
    // Add coordinate system helper for Z-up verification
    if (renderSettings.showGrid) {
      const gridHelper = new THREE.GridHelper(20, 20, 0x666666, 0x888888);
      // Rotate grid to align with Z-up system
      gridHelper.rotateX(Math.PI / 2);
      gridHelper.position.set(0, 0, 0.01); // Slightly above ground
      scene.add(gridHelper);
      
      // Add axis helper (red=X, green=Y, blue=Z)
      const axesHelper = new THREE.AxesHelper(5);
      scene.add(axesHelper);
    }
    
    // Set up basic directional lighting
    const ambientLight = new THREE.AmbientLight(0x87ceeb, 0.4); // Sky blue ambient
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 10, 20); // High position for Z-up
    directionalLight.castShadow = renderSettings.shadowsEnabled;
    
    // Configure shadow properties
    if (renderSettings.shadowsEnabled) {
      directionalLight.shadow.mapSize.width = 2048;
      directionalLight.shadow.mapSize.height = 2048;
      directionalLight.shadow.camera.near = 0.5;
      directionalLight.shadow.camera.far = 500;
      directionalLight.shadow.camera.left = -25;
      directionalLight.shadow.camera.right = 25;
      directionalLight.shadow.camera.top = 25;
      directionalLight.shadow.camera.bottom = -25;
    }
    
    scene.add(directionalLight);
    
    // Store references
    sceneRef.current = scene;
    rendererRef.current = renderer;
    cameraRef.current = camera;
    
    return { scene, renderer, camera };
  }, [renderSettings.showGrid, renderSettings.shadowsEnabled, resetScene]);

  // Create plant billboard sprite based on plant type and dimensions
  const createPlantBillboard = useCallback((plant: PlantInstance3D): THREE.Sprite => {
    // Determine plant visual style based on type
    const plantType = plant.properties.type?.toLowerCase() || 'perennial';
    const flowerColor = plant.properties.flowerColor || '#90EE90';
    const leafColor = plant.properties.leafColor || '#228B22';
    
    // Create cache key for texture reuse
    const cacheKey = `${plantType}-${flowerColor}-${leafColor}`;
    
    // Check texture cache first
    let texture = textureCache.current.get(cacheKey);
    
    if (!texture) {
      // Create canvas texture for the plant billboard
      const canvas = document.createElement('canvas');
      const size = 256; // Texture resolution
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d')!;
      
      // Clear canvas with transparent background
      ctx.clearRect(0, 0, size, size);
    
    // Create different shapes based on plant type
    if (plantType.includes('tree') || plantType.includes('ornamental tree')) {
      // Tree: Simple tree silhouette with trunk and canopy
      ctx.fillStyle = '#8B4513'; // Brown trunk
      const trunkWidth = size * 0.1;
      const trunkHeight = size * 0.4;
      ctx.fillRect((size - trunkWidth) / 2, size - trunkHeight, trunkWidth, trunkHeight);
      
      // Green canopy
      ctx.fillStyle = leafColor;
      ctx.beginPath();
      ctx.arc(size / 2, size * 0.3, size * 0.35, 0, Math.PI * 2);
      ctx.fill();
      
    } else if (plantType.includes('shrub')) {
      // Shrub: Rounded bush shape
      ctx.fillStyle = leafColor;
      ctx.beginPath();
      ctx.arc(size / 2, size * 0.6, size * 0.3, 0, Math.PI * 2);
      ctx.fill();
      
      // Add some texture with darker green
      ctx.fillStyle = '#1F5F1F';
      ctx.beginPath();
      ctx.arc(size * 0.4, size * 0.55, size * 0.15, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(size * 0.6, size * 0.65, size * 0.12, 0, Math.PI * 2);
      ctx.fill();
      
    } else {
      // Perennial/flower: Simple flower shape with colorful bloom
      ctx.fillStyle = leafColor;
      // Stem
      ctx.fillRect(size * 0.47, size * 0.5, size * 0.06, size * 0.5);
      
      // Flower bloom
      ctx.fillStyle = flowerColor;
      ctx.beginPath();
      ctx.arc(size / 2, size * 0.3, size * 0.2, 0, Math.PI * 2);
      ctx.fill();
      
      // Add petals for flower look
      for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2;
        const petalX = size / 2 + Math.cos(angle) * size * 0.15;
        const petalY = size * 0.3 + Math.sin(angle) * size * 0.15;
        ctx.beginPath();
        ctx.arc(petalX, petalY, size * 0.08, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    
      // Add subtle border for visibility
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, size * 0.45, 0, Math.PI * 2);
      ctx.stroke();
      
      // Create texture from canvas with improved filtering
      texture = new THREE.CanvasTexture(canvas);
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.needsUpdate = true;
      
      // Cache the texture for reuse
      textureCache.current.set(cacheKey, texture);
    }
    
    // Create sprite material
    const material = new THREE.SpriteMaterial({ 
      map: texture,
      transparent: true,
      alphaTest: 0.1 // Remove transparent pixels
    });
    
    // Create sprite
    const sprite = new THREE.Sprite(material);
    
    // CRITICAL FIX: Set sprite center to bottom for proper ground anchoring
    sprite.center.set(0.5, 0); // Bottom center anchoring
    
    // Clamp dimensions to prevent zero/negative values
    const heightCurrent = Math.max(0.1, plant.dimensions.heightCurrent || 0.5);
    const spreadCurrent = Math.max(0.1, plant.dimensions.spreadCurrent || 0.5);
    
    // Position sprite at plant location with proper Z positioning
    // Since sprite center is now at bottom (0.5, 0), the bottom of sprite sits at plant.position.z
    sprite.position.set(plant.position.x, plant.position.y, plant.position.z);
    
    // Scale sprite based on plant dimensions
    // Use the larger of height or spread for consistent scaling
    const scaleH = heightCurrent;
    const scaleW = Math.max(spreadCurrent, heightCurrent * 0.6);
    sprite.scale.set(scaleW, scaleH, 1);
    
    // Store plant data for debugging
    sprite.userData = {
      plantId: plant.id,
      plantName: plant.plantName,
      type: plantType,
      height: heightCurrent,
      spread: spreadCurrent
    };
    
    return sprite;
  }, []);

  // Update all billboards to face the camera
  const updateBillboardRotations = useCallback(() => {
    if (!cameraRef.current || billboardsRef.current.length === 0) return;
    
    // Billboards automatically face camera due to THREE.Sprite nature
    // but we can add custom rotation logic here if needed
    billboardsRef.current.forEach(billboard => {
      // Sprites automatically face camera, but we can add custom behavior
      // For example, constrain rotation to vertical axis only for more realistic look
      if (billboard.material instanceof THREE.SpriteMaterial) {
        // Optional: Add wind animation or seasonal effects here
      }
    });
  }, []);

  // Create all plant billboards for the scene
  const createPlantBillboards = useCallback((plants: PlantInstance3D[]) => {
    if (!sceneRef.current) return;
    
    // Clear existing billboards with proper resource disposal
    billboardsRef.current.forEach(billboard => {
      sceneRef.current?.remove(billboard);
      // Dispose material and its texture map
      if (billboard.material) {
        billboard.material.dispose();
        // Note: Don't dispose cached textures here, they're reused
      }
    });
    billboardsRef.current = [];
    
    // Create new billboards for each plant
    plants.forEach(plant => {
      const billboard = createPlantBillboard(plant);
      sceneRef.current?.add(billboard);
      billboardsRef.current.push(billboard);
    });
    
    console.log(`Created ${billboardsRef.current.length} plant billboards`);
  }, [createPlantBillboard]);

  // Animation loop with lifecycle guards
  const animate = useCallback(() => {
    // CRITICAL FIX: Guard against multiple animation loops
    if (!rendererRef.current || !sceneRef.current || !cameraRef.current) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      return;
    }
    
    // Update billboard rotations to face camera
    updateBillboardRotations();
    
    rendererRef.current.render(sceneRef.current, cameraRef.current);
    
    // Only continue animation loop if still valid
    if (rendererRef.current && sceneRef.current) {
      animationFrameRef.current = requestAnimationFrame(animate);
    }
  }, [updateBillboardRotations]);

  // Handle window resize
  const handleResize = useCallback(() => {
    if (!rendererRef.current || !cameraRef.current || !containerRef.current) return;
    
    const container = containerRef.current;
    const rect = container.getBoundingClientRect();
    const width = rect.width;
    const height = Math.max(400, rect.width * 0.6);
    
    // Update camera aspect ratio dynamically
    cameraRef.current.aspect = width / height;
    cameraRef.current.updateProjectionMatrix();
    
    rendererRef.current.setSize(width, height);
  }, []);

  // Generate 3D scene from garden data
  const generateScene3D = useCallback(async () => {
    if (!gardenData.gardenId || placedPlants.length === 0) {
      toast({
        title: "Cannot Generate 3D Scene",
        description: "Please add some plants to your garden first.",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);
    
    // CRITICAL FIX: Reset scene before generating new one for clean GPU memory state
    console.log('Starting 3D scene generation - cleaning up previous resources...');
    resetScene();
    manageTextureCache(); // Optimize texture cache for better performance
    
    try {
      // Convert garden data to 3D scene using schema functions
      const scene3DData = createGardenScene3D({
        gardenId: gardenData.gardenId,
        gardenName: gardenData.gardenName,
        shape: gardenData.shape,
        dimensions: gardenData.dimensions,
        units: gardenData.units,
        placedPlants: placedPlants,
        plants: inventoryPlants, // Plant database entries
        orientationSettings: orientationSettings,
        environmentSettings: {
          season: renderSettings.season,
          timeOfDay: renderSettings.timeOfDay,
          slopePercentage: gardenData.slopePercentage || 0,
          slopeDirection: gardenData.slopeDirection || 'S',
          latitude: 45 // Default latitude, could be from garden location
        }
      });
      
      setScene3D(scene3DData);
      
      // Initialize Three.js scene
      const sceneObjects = initializeScene();
      if (sceneObjects) {
        setIsSceneReady(true);
        
        // Apply camera settings from 3D scene data
        const { camera } = sceneObjects;
        const cameraParams = scene3DData.camera;
        
        camera.position.set(
          cameraParams.position.x,
          cameraParams.position.y,
          cameraParams.position.z
        );
        
        camera.lookAt(
          cameraParams.target.x,
          cameraParams.target.y,
          cameraParams.target.z
        );
        
        camera.fov = cameraParams.fov;
        camera.updateProjectionMatrix();
        
        // Create plant billboards for visual representation
        createPlantBillboards(scene3DData.plants);
        
        // CRITICAL FIX: Only start animation loop if not already running
        if (!animationFrameRef.current) {
          animate();
        }
        
        toast({
          title: "3D Scene Generated",
          description: `Your garden has been rendered in 3D with ${scene3DData.plants.length} plant billboards.`,
        });
      }
      
    } catch (error) {
      console.error('Error generating 3D scene:', error);
      toast({
        title: "Generation Failed",
        description: "Failed to generate 3D scene. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  }, [gardenData, placedPlants, inventoryPlants, orientationSettings, renderSettings, initializeScene, animate, createPlantBillboards, toast, resetScene, manageTextureCache]);

  // Export PNG at specified resolution
  const exportPNG = useCallback(async (width: number = 1920, height: number = 1088) => {
    if (!rendererRef.current || !sceneRef.current || !cameraRef.current) {
      toast({
        title: "Export Failed",
        description: "3D scene not ready for export.",
        variant: "destructive"
      });
      return;
    }

    try {
      // Temporarily resize renderer for export
      const originalSize = rendererRef.current.getSize(new THREE.Vector2());
      const originalAspect = cameraRef.current.aspect;
      
      // Set export resolution
      rendererRef.current.setSize(width, height);
      cameraRef.current.aspect = width / height;
      cameraRef.current.updateProjectionMatrix();
      
      // Render at high resolution
      rendererRef.current.render(sceneRef.current, cameraRef.current);
      
      // Get canvas data
      const canvas = rendererRef.current.domElement;
      const dataURL = canvas.toDataURL('image/png');
      
      // Create download link
      const link = document.createElement('a');
      link.download = `garden-3d-${gardenData.gardenName}-${Date.now()}.png`;
      link.href = dataURL;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Restore original settings
      rendererRef.current.setSize(originalSize.x, originalSize.y);
      cameraRef.current.aspect = originalAspect;
      cameraRef.current.updateProjectionMatrix();
      
      toast({
        title: "Export Successful",
        description: `Garden exported as PNG (${width}x${height})`,
      });
      
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Export Failed",
        description: "Failed to export 3D scene.",
        variant: "destructive"
      });
    }
  }, [gardenData.gardenName, toast]);

  // Cleanup on unmount with comprehensive resource disposal
  useEffect(() => {
    return () => {
      // Cancel animation frame
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      
      // Clean up billboards with proper disposal
      billboardsRef.current.forEach(billboard => {
        if (billboard.material) {
          billboard.material.dispose();
          // Note: Don't dispose cached textures here, handle separately
        }
      });
      billboardsRef.current = [];
      
      // Dispose cached textures
      textureCache.current.forEach(texture => {
        texture.dispose();
      });
      textureCache.current.clear();
      
      // Dispose renderer
      if (rendererRef.current) {
        rendererRef.current.dispose();
        rendererRef.current = null;
      }
      
      // CRITICAL FIX: Clean up Three.js scene with complete object type coverage
      if (sceneRef.current) {
        sceneRef.current.traverse((object) => {
          // Include ALL object types that have disposable resources
          if (object instanceof THREE.Mesh || 
              object instanceof THREE.Line || 
              object instanceof THREE.Points || 
              object instanceof THREE.LineSegments || 
              object instanceof THREE.Sprite) {
            
            // Dispose geometry
            if (object.geometry) object.geometry.dispose();
            
            // Dispose materials
            if (object.material) {
              if (Array.isArray(object.material)) {
                object.material.forEach(material => {
                  // Dispose material textures (all textures at cleanup)
                  if (material.map) material.map.dispose();
                  material.dispose();
                });
              } else {
                // Dispose material texture (all textures at cleanup)
                if (object.material.map) object.material.map.dispose();
                object.material.dispose();
              }
            }
          }
          
          // Dispose lights and shadow maps
          if (object instanceof THREE.Light) {
            if (object.shadow && object.shadow.map) {
              object.shadow.map.dispose();
            }
          }
        });
        sceneRef.current.clear();
        sceneRef.current = null;
      }
    };
  }, []);

  // Handle resize events
  useEffect(() => {
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [handleResize]);

  return (
    <div className="space-y-6" data-testid="garden-renderer-3d">
      {/* Controls Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            3D Garden Visualization
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="space-y-2">
              <Label>Season</Label>
              <Select value={renderSettings.season} onValueChange={(value: any) => 
                setRenderSettings(prev => ({ ...prev, season: value }))
              }>
                <SelectTrigger data-testid="select-season">
                  <SelectValue placeholder="Select season" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="spring">Spring</SelectItem>
                  <SelectItem value="summer">Summer</SelectItem>
                  <SelectItem value="autumn">Autumn</SelectItem>
                  <SelectItem value="winter">Winter</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Time of Day</Label>
              <div className="px-2">
                <Slider
                  value={[renderSettings.timeOfDay]}
                  onValueChange={([value]) => 
                    setRenderSettings(prev => ({ ...prev, timeOfDay: value }))
                  }
                  min={6}
                  max={20}
                  step={1}
                  data-testid="slider-time-of-day"
                />
                <div className="text-sm text-muted-foreground text-center mt-1">
                  {renderSettings.timeOfDay}:00
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Quality</Label>
              <Select value={renderSettings.levelOfDetail} onValueChange={(value: any) => 
                setRenderSettings(prev => ({ ...prev, levelOfDetail: value }))
              }>
                <SelectTrigger data-testid="select-quality">
                  <SelectValue placeholder="Select quality" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="ultra">Ultra</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <Button 
              onClick={generateScene3D} 
              disabled={isGenerating}
              data-testid="button-generate-3d"
            >
              {isGenerating ? (
                <>
                  <RotateCcw className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Camera className="h-4 w-4 mr-2" />
                  Generate 3D Visualization
                </>
              )}
            </Button>
            
            {isSceneReady && (
              <>
                <Button 
                  variant="outline" 
                  onClick={() => exportPNG(1920, 1088)}
                  data-testid="button-export-png"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export PNG (1920×1088)
                </Button>
                
                <Button 
                  variant="outline" 
                  onClick={() => exportPNG(3840, 2176)}
                  data-testid="button-export-png-4k"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export 4K
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 3D Canvas */}
      <Card>
        <CardContent className="p-0">
          <div 
            ref={containerRef} 
            className="relative w-full min-h-[400px] bg-gradient-to-b from-sky-200 to-sky-100"
            data-testid="canvas-container"
          >
            <canvas 
              ref={canvasRef}
              className="w-full h-full rounded-lg"
              data-testid="canvas-3d"
            />
            
            {!isSceneReady && !isGenerating && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center space-y-4">
                  <Eye className="h-16 w-16 text-muted-foreground mx-auto opacity-50" />
                  <div>
                    <h3 className="text-lg font-semibold text-muted-foreground">
                      3D Visualization Not Generated
                    </h3>
                    <p className="text-muted-foreground">
                      Click "Generate 3D Visualization" to see your garden in 3D
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            {scene3D && (
              <div className="absolute top-4 left-4 space-y-2">
                <Badge variant="secondary" className="bg-white/90">
                  <Sun className="h-3 w-3 mr-1" />
                  {renderSettings.season} • {renderSettings.timeOfDay}:00
                </Badge>
                <Badge variant="secondary" className="bg-white/90">
                  Plants: {scene3D.plants.length}
                </Badge>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}