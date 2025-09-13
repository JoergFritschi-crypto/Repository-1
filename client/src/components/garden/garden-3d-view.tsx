import { useRef, useEffect, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
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
  Compass,
  Wand2
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
  photorealizationMode?: boolean; // Added for AI photorealization
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

// Export type for ref methods
export interface Garden3DViewRef {
  captureCanvas: () => Promise<string | null>;
}

const Garden3DView = forwardRef<Garden3DViewRef, Garden3DViewProps>((
  {
    gardenId,
    gardenName,
    gardenData,
    placedPlants,
    photorealizationMode = false
  },
  ref
) => {
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
  const viewerMarkerRef = useRef<THREE.Group | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const compassRef = useRef<THREE.Group | null>(null);
  const targetCameraPositionRef = useRef<THREE.Vector3>(new THREE.Vector3());
  const targetCameraTargetRef = useRef<THREE.Vector3>(new THREE.Vector3());
  const smoothTransitionRef = useRef<boolean>(false);
  const textureCache = useRef<Map<string, THREE.Texture>>(new Map()); // Added for texture caching
  
  const [isSceneReady, setIsSceneReady] = useState(false);
  const [scene3D, setScene3D] = useState<GardenScene3D | null>(null);
  
  // Get initial camera settings from point of view
  const initialCamera = pointOfViewToCamera(gardenData.pointOfView);
  const cardinalRotation = northOrientationToDegrees(gardenData.northOrientation);
  
  // Render settings with database values
  const [renderSettings, setRenderSettings] = useState({
    timeOfDay: 14,
    viewingDistance: initialCamera.distance,
    viewingHeight: initialCamera.height,
    viewerRotation: initialCamera.rotation,
    showGrid: false,
    showCompass: true,
    showSunPath: true,
    showViewerMarker: true,
    shadowsEnabled: true,
    levelOfDetail: 'high' as 'low' | 'medium' | 'high' | 'ultra'
  });
  
  const { toast } = useToast();
  const [isGeneratingArtistic, setIsGeneratingArtistic] = useState(false);
  
  // Expose canvas capture method via ref
  useImperativeHandle(ref, () => ({
    captureCanvas: async (): Promise<string | null> => {
      try {
        if (!canvasRef.current || !rendererRef.current) {
          console.error('Canvas or renderer not ready for capture');
          return null;
        }
        
        // Ensure the scene is fully rendered
        if (rendererRef.current && sceneRef.current && cameraRef.current) {
          // Force a render to ensure latest state
          rendererRef.current.render(sceneRef.current, cameraRef.current);
        }
        
        // Wait for next animation frame to ensure render is complete
        await new Promise(resolve => requestAnimationFrame(resolve));
        
        // Capture the canvas as base64 PNG
        const dataUrl = canvasRef.current.toDataURL('image/png', 1.0);
        console.log('Canvas captured successfully in photorealization mode');
        
        return dataUrl;
      } catch (error) {
        console.error('Error capturing canvas:', error);
        return null;
      }
    }
  }), []);
  
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

  // Create minimal dot marker for photorealization mode
  const createMinimalPlantMarker = useCallback((plant: PlantInstance3D): THREE.Sprite => {
    // CRITICAL: For photorealization, use pure white dots only
    const cacheKey = 'minimal-marker-white';
    
    // Check texture cache first
    let texture = textureCache.current.get(cacheKey);
    
    if (!texture) {
      // Create TINY circular marker (16x16 pixels for minimal size)
      const canvas = document.createElement('canvas');
      const size = 16; // Tiny texture for minimal dots
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d')!;
      
      // Clear canvas with transparent background
      ctx.clearRect(0, 0, size, size);
      
      // Draw pure white filled circle
      ctx.fillStyle = '#FFFFFF'; // Pure white
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, size * 0.4, 0, Math.PI * 2);
      ctx.fill();
      
      // Create texture from canvas
      texture = new THREE.CanvasTexture(canvas);
      // CRITICAL: Use NearestFilter to avoid halos
      texture.minFilter = THREE.NearestFilter;
      texture.magFilter = THREE.NearestFilter;
      texture.needsUpdate = true;
      
      // Cache the texture for reuse
      textureCache.current.set(cacheKey, texture);
    }
    
    // Create sprite material with specific settings for photorealization
    const material = new THREE.SpriteMaterial({ 
      map: texture,
      color: 0xffffff, // Pure white
      transparent: true,
      opacity: 1, // Full opacity
      depthTest: false, // Always render on top
      depthWrite: false, // Don't write to depth buffer
      sizeAttenuation: false // Constant size regardless of distance
    });
    
    // Create sprite
    const sprite = new THREE.Sprite(material);
    
    // Center sprite at its center (standard positioning)
    sprite.center.set(0.5, 0.5);
    
    // Position sprite at plant position (directly on ground)
    sprite.position.set(plant.position.x, plant.position.y, 0.01);
    
    // Very small fixed size for minimal dots
    const scaleFactor = 0.2; // Tiny fixed size for all plants
    sprite.scale.set(scaleFactor, scaleFactor, 1);
    
    // Set high render order so dots always draw on top
    sprite.renderOrder = 999;
    
    // Store minimal plant data
    sprite.userData = {
      plantId: plant.id,
      plantName: plant.plantName,
      isMinimalMarker: true
    };
    
    return sprite;
  }, []);

  // Initialize Three.js scene
  const initScene = useCallback(() => {
    if (!canvasRef.current || !containerRef.current) {
      console.error('Cannot initialize scene: missing refs', {
        canvas: !!canvasRef.current,
        container: !!containerRef.current
      });
      return;
    }
    
    console.log('=== INIT SCENE START ===');
    console.log('Container dimensions:', containerRef.current.getBoundingClientRect());
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
        animationFrameRef.current = null;
      }
      if (rendererRef.current) {
        rendererRef.current.dispose();
      }
    }
    
    // Create scene
    const scene = new THREE.Scene();
    // Use black background for photorealization mode, sky blue for normal mode
    if (photorealizationMode) {
      scene.background = new THREE.Color(0x000000); // Pure black for photorealization
      // No fog in photorealization mode
    } else {
      scene.background = new THREE.Color(0x87ceeb); // Sky blue for normal mode
      scene.fog = new THREE.Fog(0x87ceeb, 20, 100);
    }
    
    // Create renderer
    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true // For reliable canvas capture
    });
    // Disable shadows in photorealization mode
    renderer.shadowMap.enabled = photorealizationMode ? false : renderSettings.shadowsEnabled;
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
    
    // Set initial camera position based on garden settings
    const initialCameraSettings = pointOfViewToCamera(gardenData.pointOfView);
    camera.position.set(
      initialCameraSettings.distance,
      initialCameraSettings.height,
      initialCameraSettings.distance
    );
    camera.lookAt(0, 0, 0);
    
    // Initialize target positions for smooth transitions
    targetCameraPositionRef.current.copy(camera.position);
    targetCameraTargetRef.current.set(0, 0, 0);
    
    // Add OrbitControls for pan/zoom/rotate with smooth modern settings
    const controls = new OrbitControls(camera, canvasRef.current);
    
    // Enable smooth damping for modern feel
    controls.enableDamping = true;
    controls.dampingFactor = 0.08; // Slightly higher for smoother feel
    
    // Set control speeds for smooth movement
    controls.rotateSpeed = 0.7; // Smooth rotation speed
    controls.panSpeed = 0.8; // Smooth panning speed
    controls.zoomSpeed = 0.8; // Smooth zoom speed
    
    // Enable screen space panning for intuitive movement
    controls.screenSpacePanning = true; // Allow panning parallel to screen
    controls.minDistance = 0.01; // Set very low to avoid clamp conflicts with slider
    controls.maxDistance = 50;
    controls.maxPolarAngle = Math.PI / 2; // Prevent camera from going below ground
    
    // Configure mouse settings for smooth scrolling
    controls.mouseButtons = {
      LEFT: THREE.MOUSE.ROTATE,
      MIDDLE: THREE.MOUSE.DOLLY,
      RIGHT: THREE.MOUSE.PAN
    };
    
    // Set smooth touch controls for mobile
    controls.touches = {
      ONE: THREE.TOUCH.ROTATE,
      TWO: THREE.TOUCH.DOLLY_PAN
    };
    
    // Enable auto-rotation for a dynamic feel (disabled by default)
    controls.autoRotate = false;
    controls.autoRotateSpeed = 2.0;
    
    controls.target.set(0, 0, 0);
    controls.update();
    controlsRef.current = controls;
    
    // Store references
    sceneRef.current = scene;
    rendererRef.current = renderer;
    cameraRef.current = camera;
    
    // Add to scene
    scene.add(plantMeshesRef.current);
    
    // Note: Garden dimensions display has been moved below the canvas
    // to prevent interference with AI image generation
    
    // Skip lighting in photorealization mode for clean capture
    if (!photorealizationMode) {
      // Add brighter ambient lighting immediately to ensure visibility
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
      ambientLight.name = 'ambient-light-initial';
      scene.add(ambientLight);
      
      // Add a brighter directional light for initial visibility
      const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
      directionalLight.position.set(5, 10, 5);
      directionalLight.name = 'directional-light-initial';
      scene.add(directionalLight);
      console.log('Added initial lighting');
    } else {
      console.log('Skipped initial lighting for photorealization mode');
    }
    
    // Start animation loop immediately
    if (!animationFrameRef.current) {
      console.log('Starting animation loop from initScene');
      animate();
    }
    
    // Force initial render
    console.log('About to force initial render...');
    renderer.render(scene, camera);
    console.log('Forced initial render complete');
    console.log('Scene children count:', scene.children.length);
    console.log('=== INIT SCENE END ===');
    
    setIsSceneReady(true);
  }, [gardenData, cardinalRotation, photorealizationMode]);

  // Handle shadow settings changes without rebuilding scene
  useEffect(() => {
    if (rendererRef.current) {
      rendererRef.current.shadowMap.enabled = renderSettings.shadowsEnabled;
      
      // Update all lights that cast shadows
      if (sceneRef.current) {
        sceneRef.current.traverse((object) => {
          if (object instanceof THREE.DirectionalLight || object instanceof THREE.SpotLight) {
            object.castShadow = renderSettings.shadowsEnabled;
          }
        });
      }
    }
  }, [renderSettings.shadowsEnabled]);

  // Create garden ground and terrain
  const createGardenTerrain = useCallback((bounds: GardenBounds, slope?: { percentage?: number; direction?: string }) => {
    if (!sceneRef.current) return;
    
    // Remove existing ground if any
    const existingGround = sceneRef.current.getObjectByName('garden-ground');
    if (existingGround) {
      sceneRef.current.remove(existingGround);
    }
    
    // Skip decorations and use simple black ground in photorealization mode
    if (photorealizationMode) {
      const width = bounds.maxX - bounds.minX;
      const depth = bounds.maxY - bounds.minY;
      const groundGeometry = new THREE.PlaneGeometry(width, depth);
      groundGeometry.rotateX(-Math.PI / 2);
      const groundMaterial = new THREE.MeshBasicMaterial({
        color: 0x000000, // Pure black
        side: THREE.DoubleSide
      });
      const ground = new THREE.Mesh(groundGeometry, groundMaterial);
      ground.name = 'garden-ground';
      ground.position.set(bounds.center.x, 0, bounds.center.y);
      sceneRef.current.add(ground);
      return; // Skip all decorations
    }
    
    // Calculate dimensions (normal mode)
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
        // Rectangle/square - only subdivide if there's a slope
        const subdivisions = (slope?.percentage && slope.percentage > 0) ? 20 : 1;
        groundGeometry = new THREE.PlaneGeometry(width, depth, subdivisions, subdivisions);
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
    
    // Create material with soil/earth color
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: 0x8b6914, // Brown soil color
      roughness: 0.9,
      metalness: 0.02,
      side: THREE.DoubleSide
    });
    
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.name = 'garden-ground';
    ground.receiveShadow = true;
    ground.position.set(bounds.center.x, 0, bounds.center.y);
    
    sceneRef.current.add(ground);
    
    // Always create grid helper (visibility controlled by toggle)
    const existingGrid = sceneRef.current.getObjectByName('grid-helper');
    if (existingGrid) {
      sceneRef.current.remove(existingGrid);
    }
    
    const gridSize = Math.max(width, depth) * 1.5;
    const gridHelper = new THREE.GridHelper(gridSize, 20, 0xaaaaaa, 0xdddddd);
    gridHelper.name = 'grid-helper';
    gridHelper.position.y = 0.01;
    gridHelper.visible = renderSettings.showGrid;
    sceneRef.current.add(gridHelper);
    
    // Always create compass (visibility controlled by toggle)
    const existingCompass = sceneRef.current.getObjectByName('compass');
    if (existingCompass) {
      sceneRef.current.remove(existingCompass);
    }
    if (compassRef.current) {
      sceneRef.current.remove(compassRef.current);
      compassRef.current = null;
    }
    
    const compassGroup = new THREE.Group();
    compassGroup.name = 'compass';
    
    // Create a classic compass arrow shape
    const arrowShape = new THREE.Shape();
    const arrowLength = 0.4;
    const arrowWidth = 0.08;
    
    // Create diamond/rhombus shaped arrow
    arrowShape.moveTo(arrowLength / 2, 0); // Tip
    arrowShape.lineTo(0, arrowWidth); // Left middle
    arrowShape.lineTo(-arrowLength / 4, 0); // Back point
    arrowShape.lineTo(0, -arrowWidth); // Right middle
    arrowShape.closePath();
    
    const arrowGeometry = new THREE.ShapeGeometry(arrowShape);
    const arrowMesh = new THREE.Mesh(
      arrowGeometry,
      new THREE.MeshBasicMaterial({ 
        color: 0xcc0000, // Deep red for north arrow
        fog: false,
        side: THREE.DoubleSide
      })
    );
    arrowMesh.rotation.x = -Math.PI / 2; // Lay flat on ground
    arrowMesh.position.y = 0.02;
    
    // Create "N" letter using canvas texture for better visibility
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;
    
    // Clear canvas with transparent background
    ctx.clearRect(0, 0, 128, 128);
    
    // Draw white circle background
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(64, 64, 50, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw red "N" letter
    ctx.fillStyle = '#cc0000';
    ctx.font = 'bold 80px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('N', 64, 64);
    
    const nTexture = new THREE.CanvasTexture(canvas);
    const nSprite = new THREE.Sprite(
      new THREE.SpriteMaterial({ 
        map: nTexture,
        fog: false
      })
    );
    nSprite.scale.set(0.2, 0.2, 1);
    nSprite.position.set(arrowLength / 2 + 0.15, 0.1, 0);
    
    // Add small compass ring around the arrow
    const ringGeometry = new THREE.RingGeometry(0.3, 0.32, 32);
    const ringMesh = new THREE.Mesh(
      ringGeometry,
      new THREE.MeshBasicMaterial({ 
        color: 0x666666, // Gray ring
        fog: false,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.5
      })
    );
    ringMesh.rotation.x = -Math.PI / 2; // Lay flat
    ringMesh.position.y = 0.01;
    
    // Position compass at ground level in corner of garden
    const compassDistance = Math.max(width, depth) / 2 + 0.8;
    compassGroup.position.set(compassDistance * 0.7, 0.05, -compassDistance * 0.7); // Just above ground
    
    // Add all parts to compass group
    compassGroup.add(ringMesh);
    compassGroup.add(arrowMesh);
    compassGroup.add(nSprite);
    
    // Rotate compass based on north orientation
    compassGroup.rotation.y = -cardinalRotation * Math.PI / 180;
    compassGroup.visible = renderSettings.showCompass;
    
    compassRef.current = compassGroup;
    sceneRef.current.add(compassGroup);
  }, [renderSettings, cardinalRotation, photorealizationMode]);

  // Create plant representations
  const createPlants = useCallback((plants3D: PlantInstance3D[]) => {
    console.log('createPlants called with:', plants3D.length, 'plants');
    // CRITICAL: Properly remove existing plants from scene before clearing
    if (sceneRef.current && plantMeshesRef.current) {
      // Remove each child from the scene first
      plantMeshesRef.current.children.forEach(child => {
        sceneRef.current?.remove(child);
      });
    }
    // Now clear the group reference
    plantMeshesRef.current.clear();
    
    // Calculate garden dimensions for proportional scaling
    const gardenBounds = gardenBoundsRef.current;
    const gardenWidth = gardenBounds ? gardenBounds.maxX - gardenBounds.minX : 10;
    const gardenHeight = gardenBounds ? gardenBounds.maxY - gardenBounds.minY : 10;
    const maxGardenDimension = Math.max(gardenWidth, gardenHeight);
    
    // Find the tallest plant to determine scaling
    const tallestPlantHeight = Math.max(...plants3D.map(p => p.dimensions.heightCurrent), 1);
    
    // Scale plants proportionally to garden size
    // If tallest plant is taller than garden dimension, scale down
    // Otherwise use actual sizes up to a reasonable proportion (e.g., 1.5x garden size)
    const maxAllowedHeight = maxGardenDimension * 1.5; // Plants can be up to 1.5x garden size
    const scaleFactor = tallestPlantHeight > maxAllowedHeight 
      ? maxAllowedHeight / tallestPlantHeight 
      : 1;
    
    plants3D.forEach(plant => {
      // Use minimal markers in photorealization mode
      if (photorealizationMode) {
        const sprite = createMinimalPlantMarker(plant);
        plantMeshesRef.current.add(sprite);
        console.log(`Added minimal marker for ${plant.plantName}`);
        return;
      }
      
      // Apply proportional scaling to all plants (normal mode)
      const scaledHeight = plant.dimensions.heightCurrent * scaleFactor;
      const scaledSpread = plant.dimensions.spreadCurrent * scaleFactor;
      
      console.log(`Creating ${plant.plantName} at position (${plant.position.x}, ${plant.position.y}) - Original: ${plant.dimensions.heightCurrent}m tall, Scaled: ${scaledHeight}m tall`);
      
      // Create plant representation
      let plantMesh: THREE.Mesh;
      
      // Different representations based on plant type
      if (plant.properties.type?.includes('tree')) {
        // Tree representation with scaled dimensions
        const trunkGeometry = new THREE.CylinderGeometry(0.1, 0.15, scaledHeight * 0.3);
        const trunkMaterial = new THREE.MeshStandardMaterial({ color: 0x4a3c28 });
        const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
        trunk.position.y = scaledHeight * 0.15;
        
        const crownRadius = scaledSpread / 2; // Use radius, not diameter
        const crownGeometry = new THREE.SphereGeometry(crownRadius, 16, 12);
        const crownMaterial = new THREE.MeshStandardMaterial({ 
          color: new THREE.Color(plant.properties.leafColor || '#7db86f'), // Lighter green
          roughness: 0.7,
          metalness: 0.1
        });
        const crown = new THREE.Mesh(crownGeometry, crownMaterial);
        crown.position.y = scaledHeight * 0.7;
        
        const treeGroup = new THREE.Group();
        treeGroup.add(trunk);
        treeGroup.add(crown);
        plantMesh = treeGroup as any;
      } else if (plant.properties.type?.includes('shrub')) {
        // Shrub representation with scaled dimensions
        const shrubGeometry = new THREE.SphereGeometry(
          scaledSpread / 2, // Use radius, not diameter
          12,
          8
        );
        shrubGeometry.scale(1, scaledHeight / scaledSpread, 1);
        const shrubMaterial = new THREE.MeshStandardMaterial({
          color: new THREE.Color(plant.properties.leafColor || '#8fce6f'), // Light green
          roughness: 0.6,
          metalness: 0.1
        });
        plantMesh = new THREE.Mesh(shrubGeometry, shrubMaterial);
        plantMesh.position.y = scaledHeight / 2;
      } else {
        // Default plant representation (perennials, etc.) with scaled dimensions
        const plantGeometry = new THREE.ConeGeometry(
          scaledSpread / 2, // Use radius, not diameter
          scaledHeight,
          8
        );
        const plantColor = plant.properties.flowerColor || plant.properties.leafColor || '#9acd32'; // Yellowish green
        const plantMaterial = new THREE.MeshStandardMaterial({
          color: new THREE.Color(plantColor),
          roughness: 0.5,
          metalness: 0.05
        });
        plantMesh = new THREE.Mesh(plantGeometry, plantMaterial);
        plantMesh.position.y = scaledHeight / 2;
      }
      
      // Position plant
      if (plantMesh instanceof THREE.Group) {
        plantMesh.position.x = plant.position.x;
        plantMesh.position.z = plant.position.y;
      } else {
        plantMesh.position.x = plant.position.x;
        plantMesh.position.z = plant.position.y;
      }
      
      // Apply tilt if on sloped terrain - use gardenData for slope values
      if (gardenData.slopePercentage && gardenData.slopePercentage > 0) {
        const slopePercentage = gardenData.slopePercentage;
        const slopeDirection = gardenData.slopeDirection || 'S';
        
        // Calculate tilt angle based on slope percentage (max 15 degrees tilt)
        const tiltAngle = Math.min(Math.atan(slopePercentage / 100) * 0.3, 15 * Math.PI / 180);
        
        // Convert slope direction to rotation
        const directionMap: Record<string, number> = {
          'N': 0, 'NE': 45, 'E': 90, 'SE': 135,
          'S': 180, 'SW': 225, 'W': 270, 'NW': 315
        };
        const slopeAngleRad = (directionMap[slopeDirection] || 180) * Math.PI / 180;
        
        // Apply tilt in the direction of the slope
        plantMesh.rotation.x = Math.sin(slopeAngleRad) * tiltAngle;
        plantMesh.rotation.z = Math.cos(slopeAngleRad) * tiltAngle;
      }
      
      plantMesh.castShadow = true;
      plantMesh.receiveShadow = true;
      plantMesh.userData = { plant };
      
      plantMeshesRef.current.add(plantMesh);
      console.log(`Added ${plant.plantName} to scene`);
    });
    console.log('Total plants in scene:', plantMeshesRef.current.children.length);
  }, [gardenData, photorealizationMode, createMinimalPlantMarker]);

  // Update lighting based on settings
  const updateLighting = useCallback(() => {
    if (!sceneRef.current || !gardenBoundsRef.current) return;
    
    // Skip lighting in photorealization mode - keep minimal scene
    if (photorealizationMode) {
      console.log('Skipping lighting in photorealization mode');
      return;
    }
    
    // Remove existing sun light
    if (sunLightRef.current) {
      sceneRef.current.remove(sunLightRef.current);
      sunLightRef.current.dispose();
    }
    
    // Remove existing sun helper
    if (sunHelperRef.current) {
      sceneRef.current.remove(sunHelperRef.current);
    }
    
    // Create new lighting parameters (always use summer for step 5)
    const lighting = createLightingParameters(
      cardinalRotation,
      renderSettings.timeOfDay,
      'summer' // Always summer in step 5, seasons are in step 7
    );
    
    // Create sun light
    const sunLight = new THREE.DirectionalLight(
      lighting.sun.color,
      lighting.sun.intensity
    );
    
    // Calculate sun position based on time of day
    const gardenSize = Math.max(
      gardenBoundsRef.current.maxX - gardenBoundsRef.current.minX,
      gardenBoundsRef.current.maxY - gardenBoundsRef.current.minY
    );
    
    // Calculate sun position on arc (0-24 hours)
    const hour = renderSettings.timeOfDay;
    const dayProgress = (hour - 6) / 12; // 6am to 6pm normalized to 0-1
    const sunAngle = Math.PI * Math.max(0, Math.min(1, dayProgress)); // Clamp to sunrise-sunset
    
    // Position sun on east-west arc
    const sunDistance = gardenSize * 1.5;
    const sunHeight = Math.sin(sunAngle) * gardenSize * 0.8 + 0.5;
    const sunX = Math.cos(sunAngle) * sunDistance;
    const sunZ = 0;
    
    sunLight.position.set(sunX, sunHeight, sunZ);
    
    // Rotate based on north orientation
    const rotationRad = -cardinalRotation * Math.PI / 180;
    const rotatedX = sunX * Math.cos(rotationRad) - sunZ * Math.sin(rotationRad);
    const rotatedZ = sunX * Math.sin(rotationRad) + sunZ * Math.cos(rotationRad);
    sunLight.position.set(rotatedX, sunHeight, rotatedZ);
    
    // Adjust intensity based on sun elevation - make shadows stronger
    const elevationFactor = Math.sin(sunAngle);
    sunLight.intensity = lighting.sun.intensity * Math.max(0.8, elevationFactor * 1.5); // Increased for stronger shadows
    
    // Warm colors at dawn/dusk
    if (hour < 8 || hour > 18) {
      sunLight.color = new THREE.Color(0xffaa88);
    } else if (hour < 10 || hour > 16) {
      sunLight.color = new THREE.Color(0xffd8aa);
    } else {
      sunLight.color = new THREE.Color(lighting.sun.color);
    }
    
    sunLight.castShadow = renderSettings.shadowsEnabled;
    sunLight.shadow.mapSize.width = 4096; // Higher resolution shadows
    sunLight.shadow.mapSize.height = 4096;
    sunLight.shadow.camera.near = 0.1;
    sunLight.shadow.camera.far = 50;
    sunLight.shadow.bias = -0.0005; // Reduce shadow acne
    sunLight.shadow.normalBias = 0.02; // Improve shadow quality
    
    const shadowSize = gardenSize * 1.5;
    sunLight.shadow.camera.left = -shadowSize;
    sunLight.shadow.camera.right = shadowSize;
    sunLight.shadow.camera.top = shadowSize;
    sunLight.shadow.camera.bottom = -shadowSize;
    
    sceneRef.current.add(sunLight);
    sunLightRef.current = sunLight;
    
    // Update ambient light - remove old ones first
    const oldAmbientLight = sceneRef.current.getObjectByName('ambient-light') as THREE.AmbientLight;
    if (oldAmbientLight) {
      sceneRef.current.remove(oldAmbientLight);
    }
    const oldInitialAmbient = sceneRef.current.getObjectByName('ambient-light-initial') as THREE.AmbientLight;
    if (oldInitialAmbient) {
      sceneRef.current.remove(oldInitialAmbient);
    }
    
    // Add new ambient light - increase intensity for better visibility
    const newAmbientLight = new THREE.AmbientLight(
      lighting.ambient.color,
      Math.min(1.2, lighting.ambient.intensity * 2) // Double the intensity but cap at 1.2
    );
    newAmbientLight.name = 'ambient-light';
    sceneRef.current.add(newAmbientLight);
    
    // Always create sun path visualization (visibility controlled by toggle)
    // Remove old sun helper and path if exists
    const oldSunSphere = sceneRef.current.getObjectByName('sun-sphere');
    if (oldSunSphere) sceneRef.current.remove(oldSunSphere);
    const oldPath = sceneRef.current.getObjectByName('sun-path');
    if (oldPath) sceneRef.current.remove(oldPath);
    
    // Create sun sphere
    const sunGeometry = new THREE.SphereGeometry(0.5, 16, 16);
    const sunMaterial = new THREE.MeshBasicMaterial({ 
      color: hour < 8 || hour > 18 ? 0xff8844 : 0xffd700,
      fog: false
    });
    const sunSphere = new THREE.Mesh(sunGeometry, sunMaterial);
    sunSphere.name = 'sun-sphere';
    sunSphere.position.copy(sunLight.position);
    sunSphere.visible = renderSettings.showSunPath;
    sceneRef.current.add(sunSphere);
    sunHelperRef.current = sunSphere;
    
    // Create sun path arc - properly positioned as an arc in 3D space
    const pathPoints: THREE.Vector3[] = [];
    const numPoints = 50;
    
    // Create arc from east to west through south (overhead)
    for (let i = 0; i <= numPoints; i++) {
      const t = i / numPoints; // 0 to 1
      const angle = t * Math.PI; // 0 to PI (sunrise to sunset)
      
      // Position on arc (east to west)
      const x = Math.cos(angle) * gardenSize * 1.2;
      const z = 0; // Along the east-west axis
      
      // Height varies with sun position (highest at noon)
      const height = Math.sin(angle) * gardenSize * 0.8 + 0.5;
      
      pathPoints.push(new THREE.Vector3(x, height, z));
    }
    
    const pathGeometry = new THREE.BufferGeometry().setFromPoints(pathPoints);
    
    // Rotate path based on cardinal direction
    pathGeometry.rotateY(-cardinalRotation * Math.PI / 180);
    
    const pathMaterial = new THREE.LineBasicMaterial({ 
      color: 0xffaa00,
      opacity: 0.3,
      transparent: true
    });
    const pathLine = new THREE.Line(pathGeometry, pathMaterial);
    pathLine.name = 'sun-path';
    pathLine.visible = renderSettings.showSunPath;
    
    sceneRef.current.add(pathLine);
  }, [renderSettings, cardinalRotation, photorealizationMode]);

  // Update camera position with smooth transitions
  const updateCamera = useCallback(() => {
    if (!cameraRef.current || !gardenBoundsRef.current || !sceneRef.current || !controlsRef.current) return;
    
    const camera = createCameraParameters(
      cardinalRotation,
      renderSettings.viewerRotation,
      gardenBoundsRef.current,
      renderSettings.viewingDistance,
      renderSettings.viewingHeight
    );
    
    // Enforce bounds to keep garden in view
    const minHeight = 1;
    const maxHeight = 20;
    const clampedHeight = Math.max(minHeight, Math.min(maxHeight, renderSettings.viewingHeight));
    
    // Treat viewingDistance as TRUE 3D spherical distance from camera to garden center
    const maxDistance = 30;
    const clampedDistance = Math.max(0.5, Math.min(maxDistance, renderSettings.viewingDistance));
    
    // Calculate ground-plane radius: r = sqrt(max(0, distance^2 - height^2))
    const groundRadius = Math.sqrt(Math.max(0, clampedDistance * clampedDistance - clampedHeight * clampedHeight));
    
    // Calculate target camera position using 3D spherical distance
    const cameraAngle = (renderSettings.viewerRotation + cardinalRotation) * Math.PI / 180;
    const cameraX = gardenBoundsRef.current.center.x + Math.cos(cameraAngle) * groundRadius;
    const cameraZ = gardenBoundsRef.current.center.y + Math.sin(cameraAngle) * groundRadius;
    
    // Set target positions for smooth transition
    targetCameraPositionRef.current.set(cameraX, clampedHeight, cameraZ);
    targetCameraTargetRef.current.set(
      gardenBoundsRef.current.center.x,
      0,
      gardenBoundsRef.current.center.y
    );
    
    // Enable smooth transition
    smoothTransitionRef.current = true;
    
    cameraRef.current.fov = camera.fov;
    cameraRef.current.updateProjectionMatrix();
    
    // Create or update viewer position marker (skip in photorealization mode)
    if (!viewerMarkerRef.current && !photorealizationMode) {
      // Create viewer marker group
      const viewerGroup = new THREE.Group();
      viewerGroup.name = 'viewer-marker';
      
      // Create directional arrow indicator (clean and simple)
      const arrowShape = new THREE.Shape();
      arrowShape.moveTo(0.2, 0);      // Front tip (larger arrow)
      arrowShape.lineTo(-0.1, -0.1);   // Back left
      arrowShape.lineTo(-0.05, 0);     // Back center notch
      arrowShape.lineTo(-0.1, 0.1);    // Back right
      arrowShape.closePath();
      
      const arrowGeometry = new THREE.ShapeGeometry(arrowShape);
      const viewerArrow = new THREE.Mesh(
        arrowGeometry,
        new THREE.MeshBasicMaterial({ 
          color: 0x0066ff, // Bright blue for visibility
          fog: false,
          depthTest: false,
          depthWrite: false,
          side: THREE.DoubleSide
        })
      );
      viewerArrow.rotation.x = -Math.PI / 2; // Lay flat on ground  
      viewerArrow.position.y = 0.03; // Slightly above ground level for visibility
      
      viewerGroup.add(viewerArrow);
      viewerGroup.renderOrder = 999;
      
      viewerMarkerRef.current = viewerGroup;
      sceneRef.current.add(viewerGroup);
    }
    
    // Update viewer marker - keep it at a FIXED position
    if (viewerMarkerRef.current) {
      // Set initial fixed position for viewer marker (only once)
      if (!viewerMarkerRef.current.userData.positionSet) {
        const fixedAngle = renderSettings.viewerRotation * Math.PI / 180;
        const gardenWidth = gardenBoundsRef.current.maxX - gardenBoundsRef.current.minX;
        const gardenHeight = gardenBoundsRef.current.maxY - gardenBoundsRef.current.minY;
        const fixedDistance = Math.max(gardenWidth, gardenHeight) / 2 + 0.6; // Same distance as compass
        const fixedX = gardenBoundsRef.current.center.x + Math.cos(fixedAngle) * fixedDistance;
        const fixedZ = gardenBoundsRef.current.center.y + Math.sin(fixedAngle) * fixedDistance;
        
        viewerMarkerRef.current.position.set(fixedX, 0.02, fixedZ); // Just above grid level
        
        // Point towards garden center
        const lookDirection = Math.atan2(
          gardenBoundsRef.current.center.y - fixedZ,
          gardenBoundsRef.current.center.x - fixedX
        );
        viewerMarkerRef.current.rotation.y = -lookDirection;
        viewerMarkerRef.current.userData.positionSet = true;
      }
      
      // Only update visibility, not position (hide in photorealization mode)
      viewerMarkerRef.current.visible = renderSettings.showViewerMarker && !photorealizationMode;
    }
  }, [renderSettings, cardinalRotation, photorealizationMode]);

  // Smooth animation loop optimized for 60 FPS with camera transitions
  const animate = useCallback(() => {
    if (!rendererRef.current || !sceneRef.current || !cameraRef.current) {
      // If refs aren't ready, try again next frame silently
      animationFrameRef.current = requestAnimationFrame(animate);
      return;
    }
    
    // Check renderer size only when needed
    const size = rendererRef.current.getSize(new THREE.Vector2());
    if (size.x === 0 || size.y === 0) {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          rendererRef.current.setSize(rect.width, rect.height);
          if (cameraRef.current) {
            cameraRef.current.aspect = rect.width / rect.height;
            cameraRef.current.updateProjectionMatrix();
          }
        }
      }
    }
    
    // Handle smooth camera transitions when settings change
    if (smoothTransitionRef.current && controlsRef.current) {
      const lerpFactor = 0.1; // Smooth interpolation factor
      
      // Smoothly interpolate camera position
      cameraRef.current.position.lerp(targetCameraPositionRef.current, lerpFactor);
      
      // Smoothly interpolate controls target
      controlsRef.current.target.lerp(targetCameraTargetRef.current, lerpFactor);
      
      // Check if we're close enough to the target
      const positionDistance = cameraRef.current.position.distanceTo(targetCameraPositionRef.current);
      const targetDistance = controlsRef.current.target.distanceTo(targetCameraTargetRef.current);
      
      if (positionDistance < 0.01 && targetDistance < 0.01) {
        // Snap to final position and disable smooth transition
        cameraRef.current.position.copy(targetCameraPositionRef.current);
        controlsRef.current.target.copy(targetCameraTargetRef.current);
        smoothTransitionRef.current = false;
      }
    }
    
    // Update controls for smooth damping - CRITICAL for smooth movement
    if (controlsRef.current) {
      controlsRef.current.update();
    }
    
    // Render the scene
    rendererRef.current.render(sceneRef.current, cameraRef.current);
    
    // Continue the animation loop for smooth 60 FPS
    animationFrameRef.current = requestAnimationFrame(animate);
  }, []);

  // Build complete 3D scene
  const buildScene = useCallback(() => {
    console.log('=== BUILD SCENE START ===');
    console.log('Building scene - plants:', plants?.length, 'isSceneReady:', isSceneReady, 'placedPlants:', placedPlants?.length);
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
        season: 'summer', // Always summer in step 5
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
    
    // Make sure animation loop is running
    if (!animationFrameRef.current) {
      console.log('Starting animation loop from buildScene');
      animate();
    } else {
      console.log('Animation loop already running');
    }
    
    console.log('=== BUILD SCENE END ===');
  }, [
    plants,
    isSceneReady,
    gardenId,
    gardenName,
    gardenData,
    placedPlants,
    cardinalRotation,
    renderSettings,
    photorealizationMode, // CRITICAL: Rebuild scene when mode changes
    createGardenTerrain,
    createPlants,
    updateLighting,
    updateCamera,
    animate
  ]);

  // Initialize scene on mount
  useEffect(() => {
    console.log('=== MOUNT EFFECT: Initializing scene ===');
    initScene();
    
    // Start animation loop after a short delay to ensure everything is ready
    const timer = setTimeout(() => {
      if (!animationFrameRef.current) {
        console.log('Starting animation from mount effect after delay');
        animate();
      }
    }, 100);
    
    return () => {
      clearTimeout(timer);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (rendererRef.current) {
        rendererRef.current.dispose();
      }
    };
  }, [initScene, animate]);

  // Build scene when ready
  useEffect(() => {
    buildScene();
  }, [buildScene]);

  // Update scene when settings change
  useEffect(() => {
    if (isSceneReady && gardenBoundsRef.current) {
      updateLighting();
      updateCamera();
      
      // Update visibility of toggleable elements
      if (sceneRef.current) {
        // Toggle grid visibility
        const grid = sceneRef.current.getObjectByName('grid-helper');
        if (grid) {
          grid.visible = renderSettings.showGrid;
        }
        
        // Toggle compass visibility
        const compass = sceneRef.current.getObjectByName('compass');
        if (compass) {
          compass.visible = renderSettings.showCompass;
        }
        
        // Toggle sun path visibility
        const sunPath = sceneRef.current.getObjectByName('sun-path');
        if (sunPath) {
          sunPath.visible = renderSettings.showSunPath;
        }
        const sunSphere = sceneRef.current.getObjectByName('sun-sphere');
        if (sunSphere) {
          sunSphere.visible = renderSettings.showSunPath;
        }
        
        // Toggle shadows
        if (rendererRef.current) {
          rendererRef.current.shadowMap.enabled = renderSettings.shadowsEnabled;
          if (sunLightRef.current) {
            sunLightRef.current.castShadow = renderSettings.shadowsEnabled;
          }
          // Force re-render
          rendererRef.current.shadowMap.needsUpdate = true;
        }
      }
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
      timeOfDay: 14
    }));
  };

  // Helper function to hide/show UI elements during image capture
  const toggleUIElementsForCapture = (visible: boolean) => {
    if (sceneRef.current) {
      // Hide/show viewer marker
      const viewerMarker = sceneRef.current.getObjectByName('viewer-marker');
      if (viewerMarker) viewerMarker.visible = visible;
      
      // Hide/show compass
      const compass = sceneRef.current.getObjectByName('compass');
      if (compass) compass.visible = visible;
      
      // Hide/show dimensions display
      const dimensions = sceneRef.current.getObjectByName('dimensions');
      if (dimensions) dimensions.visible = visible;
    }
  };

  // Export as image
  const handleExportImage = () => {
    if (!rendererRef.current || !sceneRef.current || !cameraRef.current) return;
    
    // Hide UI elements during capture
    toggleUIElementsForCapture(false);
    
    rendererRef.current.render(sceneRef.current, cameraRef.current);
    const dataURL = rendererRef.current.domElement.toDataURL('image/png');
    
    // Restore UI elements after capture
    toggleUIElementsForCapture(true);
    rendererRef.current.render(sceneRef.current, cameraRef.current);
    
    const link = document.createElement('a');
    link.download = `${gardenName}-3d-view.png`;
    link.href = dataURL;
    link.click();
    
    toast({
      title: "Image Exported",
      description: "Your 3D garden view has been saved as an image.",
    });
  };
  
  // Extract comprehensive scene state for photorealization
  const extractSceneState = () => {
    if (!cameraRef.current || !gardenBoundsRef.current) {
      console.warn('Cannot extract scene state: missing camera or bounds');
      return null;
    }

    const camera = cameraRef.current;
    const bounds = gardenBoundsRef.current;
    
    // Calculate sun angle based on time of day
    const sunAngle = (renderSettings.timeOfDay - 6) * 15; // Convert to degrees (0-210°)
    
    return {
      camera: {
        position: {
          x: camera.position.x,
          y: camera.position.y,
          z: camera.position.z
        },
        target: controlsRef.current ? {
          x: controlsRef.current.target.x,
          y: controlsRef.current.target.y,
          z: controlsRef.current.target.z
        } : { x: 0, y: 0, z: 0 },
        fov: camera.fov
      },
      lighting: {
        timeOfDay: renderSettings.timeOfDay,
        sunAngle: sunAngle,
        shadowIntensity: renderSettings.shadowsEnabled ? 0.7 : 0.0
      },
      bounds: {
        width: bounds.maxX - bounds.minX,
        height: bounds.maxY - bounds.minY,
        depth: bounds.maxZ - bounds.minZ
      },
      season: 'summer',
      month: 7 // July for peak summer appearance
    };
  };

  // Generate photorealistic view using comprehensive context
  const handleGenerateArtisticView = async () => {
    if (!rendererRef.current || !sceneRef.current || !cameraRef.current || !canvasRef.current) return;
    
    setIsGeneratingArtistic(true);
    
    try {
      // Extract comprehensive scene state
      const sceneState = extractSceneState();
      if (!sceneState) {
        throw new Error('Could not extract scene state. Please ensure the 3D view is fully loaded.');
      }
      
      console.log('Extracted scene state for photorealization:', sceneState);
      
      // Hide UI elements during capture
      toggleUIElementsForCapture(false);
      
      // CRITICAL FIX: Save current renderer size and camera aspect
      const originalSize = rendererRef.current.getSize(new THREE.Vector2());
      const originalAspect = cameraRef.current.aspect;
      
      // CRITICAL FIX: Force 16:9 aspect ratio for capture (1280x720)
      const captureWidth = 1280;
      const captureHeight = 720;
      rendererRef.current.setSize(captureWidth, captureHeight);
      cameraRef.current.aspect = captureWidth / captureHeight;
      cameraRef.current.updateProjectionMatrix();
      
      // Add orientation markers and garden boundaries
      const orientationGroup = new THREE.Group();
      orientationGroup.name = 'orientation-markers';
      
      // Add visible garden boundary outline
      const gardenBounds = gardenBoundsRef.current;
      if (gardenBounds) {
        const boundaryGeometry = new THREE.BufferGeometry();
        const boundaryPoints = [];
        
        // Create boundary based on garden shape
        if (gardenData.shape === 'circle') {
          const radius = (gardenBounds.maxX - gardenBounds.minX) / 2;
          const centerX = (gardenBounds.maxX + gardenBounds.minX) / 2;
          const centerY = (gardenBounds.maxY + gardenBounds.minY) / 2;
          for (let i = 0; i <= 32; i++) {
            const angle = (i / 32) * Math.PI * 2;
            boundaryPoints.push(
              centerX + radius * Math.cos(angle),
              centerY + radius * Math.sin(angle),
              0.01
            );
          }
        } else {
          // Rectangle or square boundary
          boundaryPoints.push(
            gardenBounds.minX, gardenBounds.minY, 0.01,
            gardenBounds.maxX, gardenBounds.minY, 0.01,
            gardenBounds.maxX, gardenBounds.maxY, 0.01,
            gardenBounds.minX, gardenBounds.maxY, 0.01,
            gardenBounds.minX, gardenBounds.minY, 0.01
          );
        }
        
        boundaryGeometry.setAttribute('position', new THREE.Float32BufferAttribute(boundaryPoints, 3));
        const boundaryMaterial = new THREE.LineBasicMaterial({ 
          color: 0x8B4513, // Brown color for garden edge
          linewidth: 3,
          opacity: 1,
          transparent: false
        });
        const boundaryLine = new THREE.Line(boundaryGeometry, boundaryMaterial);
        orientationGroup.add(boundaryLine);
      }
      
      // Add LEFT orientation marker (green square)
      const leftMarkerGeometry = new THREE.PlaneGeometry(0.3, 0.3);
      const leftMarkerMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x00FF00, // Bright green
        side: THREE.DoubleSide
      });
      const leftMarker = new THREE.Mesh(leftMarkerGeometry, leftMarkerMaterial);
      leftMarker.position.set(gardenBounds ? gardenBounds.minX - 0.5 : -2.5, 0, 0.02);
      orientationGroup.add(leftMarker);
      
      // Add RIGHT orientation marker (red square)
      const rightMarkerGeometry = new THREE.PlaneGeometry(0.3, 0.3);
      const rightMarkerMaterial = new THREE.MeshBasicMaterial({ 
        color: 0xFF0000, // Bright red
        side: THREE.DoubleSide
      });
      const rightMarker = new THREE.Mesh(rightMarkerGeometry, rightMarkerMaterial);
      rightMarker.position.set(gardenBounds ? gardenBounds.maxX + 0.5 : 2.5, 0, 0.02);
      orientationGroup.add(rightMarker);
      
      // Add North arrow or indicator
      const northGroup = new THREE.Group();
      const arrowShape = new THREE.Shape();
      arrowShape.moveTo(0, 0.2);
      arrowShape.lineTo(-0.1, -0.1);
      arrowShape.lineTo(0, 0);
      arrowShape.lineTo(0.1, -0.1);
      arrowShape.lineTo(0, 0.2);
      
      const arrowGeometry = new THREE.ShapeGeometry(arrowShape);
      const arrowMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x0000FF, // Blue for North
        side: THREE.DoubleSide
      });
      const northArrow = new THREE.Mesh(arrowGeometry, arrowMaterial);
      northArrow.position.set(0, gardenBounds ? gardenBounds.maxY + 0.5 : 2, 0.02);
      northGroup.add(northArrow);
      
      // Add "N" text (simplified as a blue circle for now)
      const nMarkerGeometry = new THREE.CircleGeometry(0.15, 16);
      const nMarkerMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x0000FF,
        side: THREE.DoubleSide
      });
      const nMarker = new THREE.Mesh(nMarkerGeometry, nMarkerMaterial);
      nMarker.position.set(0, gardenBounds ? gardenBounds.maxY + 0.8 : 2.3, 0.02);
      northGroup.add(nMarker);
      orientationGroup.add(northGroup);
      
      // Add orientation markers to scene
      sceneRef.current.add(orientationGroup);
      
      // Render the scene with orientation markers
      rendererRef.current.render(sceneRef.current, cameraRef.current);
      
      // Capture the current canvas as base64 at 16:9 aspect ratio
      const dataURL = rendererRef.current.domElement.toDataURL('image/png', 1.0);
      
      // Remove orientation markers after capture
      sceneRef.current.remove(orientationGroup);
      
      // Clean up marker geometries and materials
      leftMarkerGeometry.dispose();
      leftMarkerMaterial.dispose();
      rightMarkerGeometry.dispose();
      rightMarkerMaterial.dispose();
      arrowGeometry.dispose();
      arrowMaterial.dispose();
      nMarkerGeometry.dispose();
      nMarkerMaterial.dispose();
      
      // CRITICAL FIX: Restore original renderer size and camera aspect
      rendererRef.current.setSize(originalSize.x, originalSize.y);
      cameraRef.current.aspect = originalAspect;
      cameraRef.current.updateProjectionMatrix();
      
      // Restore UI elements after capture
      toggleUIElementsForCapture(true);
      rendererRef.current.render(sceneRef.current, cameraRef.current);
      
      // Prepare plant data with details from query
      const plantsForBackend = placedPlants.map(placedPlant => {
        const plantDetail = plants?.find(p => p.id === placedPlant.plantId);
        return {
          ...placedPlant,
          // Include full plant details if available
          plantDetails: plantDetail ? {
            commonName: plantDetail.commonName,
            scientificName: plantDetail.scientificName,
            cultivar: plantDetail.cultivar,
            type: plantDetail.type,
            heightMaxCm: plantDetail.heightMaxCm,
            spreadMaxCm: plantDetail.spreadMaxCm,
            foliage: plantDetail.foliage,
            flowerColor: plantDetail.flowerColor, // Fixed: singular not plural
            floweringSeason: plantDetail.floweringSeason, // Fixed: proper field name
            sunlight: plantDetail.sunlight, // Fixed: sunlight not sunExposure
            soil: plantDetail.soil, // Fixed: soil not soilType
            watering: plantDetail.watering, // Fixed: watering not waterNeeds
            // Add other relevant properties
          } : null
        };
      });
      
      console.log(`Sending ${plantsForBackend.length} plants to photorealization endpoint`);
      
      // Send comprehensive data to the photorealization endpoint
      const response = await fetch('/api/gardens/generate-artistic-view', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          canvasImage: dataURL,
          gardenId,
          gardenName,
          sceneState, // Complete scene context for comprehensive prompting
          placedPlants: plantsForBackend, // Include placed plants with their details
          // customPrompt can be added here if user wants to override
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to generate photorealistic view');
      }
      
      const data = await response.json();
      
      if (data.imageUrl) {
        // Open the enhanced image in a new tab
        window.open(data.imageUrl, '_blank');
        
        toast({
          title: "Photorealistic View Generated",
          description: `Your enhanced garden visualization has been created! ${data.context ? `(${data.context.plantCount} plants in ${data.context.seasonalContext})` : ''}`,
        });
      } else {
        throw new Error('No image URL in response');
      }
    } catch (error: any) {
      console.error('Error generating photorealistic view:', error);
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to generate photorealistic view. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsGeneratingArtistic(false);
    }
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
            <Button 
              variant="default" 
              size="sm"
              onClick={handleGenerateArtisticView}
              disabled={isGeneratingArtistic || !isSceneReady}
              data-testid="button-capture-view"
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium"
            >
              {isGeneratingArtistic ? (
                <>
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Camera className="w-4 h-4 mr-1" />
                  Use This View
                </>
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Garden Information Card */}
        <Card className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200">
          <CardContent className="pt-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {/* Dimensions & Area */}
              <div className="space-y-1">
                <p className="text-xs font-semibold text-green-700 uppercase tracking-wider">Dimensions</p>
                <p className="text-sm font-bold text-gray-900">
                  {gardenData.dimensions?.width || 10}m × {gardenData.dimensions?.length || 10}m
                </p>
                <p className="text-xs text-gray-600">
                  Area: {((gardenData.dimensions?.width || 10) * (gardenData.dimensions?.length || 10)).toFixed(1)}m²
                </p>
              </div>
              
              {/* Shape & Slope */}
              <div className="space-y-1">
                <p className="text-xs font-semibold text-green-700 uppercase tracking-wider">Terrain</p>
                <p className="text-sm font-bold text-gray-900 capitalize">
                  {gardenData.shape || 'Rectangle'}
                </p>
                <p className="text-xs text-gray-600">
                  {gardenData.slopePercentage && Number(gardenData.slopePercentage) > 0 
                    ? `${gardenData.slopePercentage}% slope ${gardenData.slopeDirection || 'S'}`
                    : 'Level ground'}
                </p>
              </div>
              
              {/* Plants */}
              <div className="space-y-1">
                <p className="text-xs font-semibold text-green-700 uppercase tracking-wider">Plants</p>
                <p className="text-sm font-bold text-gray-900">
                  {placedPlants.length} {placedPlants.length === 1 ? 'Plant' : 'Plants'}
                </p>
                <p className="text-xs text-gray-600 truncate" title={Array.from(new Set(placedPlants.map(p => p.plantName))).join(', ')}>
                  {Array.from(new Set(placedPlants.map(p => p.plantName))).slice(0, 3).join(', ')}
                  {Array.from(new Set(placedPlants.map(p => p.plantName))).length > 3 && '...'}
                </p>
              </div>
              
              {/* Location & Climate */}
              <div className="space-y-1">
                <p className="text-xs font-semibold text-green-700 uppercase tracking-wider">Location</p>
                <p className="text-sm font-bold text-gray-900 truncate" title={gardenData.location}>
                  {gardenData.location || 'Not specified'}
                </p>
                <p className="text-xs text-gray-600">
                  Zone: {gardenData.hardiness_zone || 'Not set'}
                </p>
              </div>
              
              {/* Sun & Orientation */}
              <div className="space-y-1">
                <p className="text-xs font-semibold text-green-700 uppercase tracking-wider">Orientation</p>
                <p className="text-sm font-bold text-gray-900">
                  North: {gardenData.northOrientation || 'N'}
                </p>
                <p className="text-xs text-gray-600 capitalize">
                  {gardenData.sunExposure ? gardenData.sunExposure.replace('_', ' ') : 'Full sun'}
                </p>
              </div>
              
              {/* Soil */}
              <div className="space-y-1">
                <p className="text-xs font-semibold text-green-700 uppercase tracking-wider">Soil</p>
                <p className="text-sm font-bold text-gray-900 capitalize">
                  {gardenData.soilType ? gardenData.soilType.replace('_', ' ') : 'Loam'}
                </p>
                <p className="text-xs text-gray-600">
                  pH: {gardenData.soilPh || 'Not tested'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* 3D Canvas */}
        <div 
          ref={containerRef}
          className="relative bg-gradient-to-b from-blue-100 to-green-50 rounded-lg overflow-hidden"
          style={{ height: '500px' }}
          data-testid="3d-canvas-container"
        >
          <canvas 
            ref={canvasRef}
            className="w-full h-full block"
            style={{ display: 'block', width: '100%', height: '100%' }}
            data-testid="3d-canvas"
          />
          
          {/* Removed status indicators to clean up UI */}
          
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
                  min={2}
                  max={30}
                  step={0.1}
                  className="mt-1"
                  data-testid="slider-camera-distance"
                />
              </div>
              
              <div>
                <Label className="text-xs">Height: {renderSettings.viewingHeight}m</Label>
                <Slider
                  value={[renderSettings.viewingHeight]}
                  onValueChange={([value]) => setRenderSettings(prev => ({ ...prev, viewingHeight: value }))}
                  min={1}
                  max={15}
                  step={0.1}
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
                  step={1}
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
                <Label className="text-xs">Time of Day: {Math.floor(renderSettings.timeOfDay)}:{String(Math.round((renderSettings.timeOfDay % 1) * 60)).padStart(2, '0')}</Label>
                <Slider
                  value={[renderSettings.timeOfDay]}
                  onValueChange={([value]) => setRenderSettings(prev => ({ ...prev, timeOfDay: value }))}
                  min={6}
                  max={20}
                  step={0.1}
                  className="mt-1"
                  data-testid="slider-time-of-day"
                />
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
                  <Label className="text-xs">Show Viewer Position</Label>
                  <Switch
                    checked={renderSettings.showViewerMarker}
                    onCheckedChange={(checked) => setRenderSettings(prev => ({ ...prev, showViewerMarker: checked }))}
                    data-testid="switch-show-viewer"
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
});

Garden3DView.displayName = 'Garden3DView';

export default Garden3DView;