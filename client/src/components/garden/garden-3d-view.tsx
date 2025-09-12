import { useRef, useEffect, useState, useCallback } from 'react';
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
  const viewerMarkerRef = useRef<THREE.Group | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const compassRef = useRef<THREE.Group | null>(null);
  const targetCameraPositionRef = useRef<THREE.Vector3>(new THREE.Vector3());
  const targetCameraTargetRef = useRef<THREE.Vector3>(new THREE.Vector3());
  const smoothTransitionRef = useRef<boolean>(false);
  
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
    showGrid: true,
    showCompass: true,
    showSunPath: true,
    showViewerMarker: true,
    shadowsEnabled: true,
    levelOfDetail: 'high' as 'low' | 'medium' | 'high' | 'ultra'
  });
  
  const { toast } = useToast();
  const [isGeneratingArtistic, setIsGeneratingArtistic] = useState(false);
  
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
    
    // Add garden dimensions display
    const gardenWidth = gardenData.dimensions?.width || 10;
    const gardenHeight = gardenData.dimensions?.length || 10;
    const dimensionText = `${gardenWidth}m × ${gardenHeight}m`;
    
    // Create a plane to display dimensions
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.fillRect(0, 0, 256, 64);
      ctx.fillStyle = '#333';
      ctx.font = 'bold 24px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(dimensionText, 128, 32);
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    const dimensionSprite = new THREE.Sprite(
      new THREE.SpriteMaterial({ 
        map: texture,
        fog: false
      })
    );
    dimensionSprite.scale.set(2, 0.5, 1);
    dimensionSprite.position.set(0, 0.1, -Math.max(gardenWidth, gardenHeight) / 2 - 1);
    dimensionSprite.name = 'dimension-sprite';
    scene.add(dimensionSprite);
    
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
  }, [renderSettings, cardinalRotation]);

  // Create plant representations
  const createPlants = useCallback((plants3D: PlantInstance3D[]) => {
    console.log('createPlants called with:', plants3D.length, 'plants');
    // Clear existing plants
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
      // Apply proportional scaling to all plants
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
  }, [gardenData]);

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
  }, [renderSettings, cardinalRotation]);

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
    
    // Create or update viewer position marker
    if (!viewerMarkerRef.current) {
      // Create viewer marker group
      const viewerGroup = new THREE.Group();
      viewerGroup.name = 'viewer-marker';
      
      // Create eye shape (outer ellipse)
      const eyeOuterShape = new THREE.Shape();
      const eyeWidth = 0.25;
      const eyeHeight = 0.15;
      eyeOuterShape.ellipse(0, 0, eyeWidth, eyeHeight, 0, Math.PI * 2, false, 0);
      
      const eyeOuterGeometry = new THREE.ShapeGeometry(eyeOuterShape);
      const eyeOuter = new THREE.Mesh(
        eyeOuterGeometry,
        new THREE.MeshBasicMaterial({ 
          color: 0x0066ff, // Bright blue for eye outline
          fog: false,
          depthTest: false,
          depthWrite: false,
          transparent: true,
          opacity: 0.9,
          side: THREE.DoubleSide
        })
      );
      eyeOuter.rotation.x = -Math.PI / 2; // Lay flat on ground
      eyeOuter.position.y = 0; // At group level
      
      // Create pupil (inner circle)
      const pupilGeometry = new THREE.CircleGeometry(0.08, 16);
      const pupil = new THREE.Mesh(
        pupilGeometry,
        new THREE.MeshBasicMaterial({ 
          color: 0x001133, // Dark blue/black for pupil
          fog: false,
          depthTest: false,
          depthWrite: false,
          side: THREE.DoubleSide
        })
      );
      pupil.rotation.x = -Math.PI / 2; // Lay flat on ground
      pupil.position.y = 0.001; // Just above the eye
      
      // Create iris (middle circle)
      const irisGeometry = new THREE.RingGeometry(0.05, 0.08, 16);
      const iris = new THREE.Mesh(
        irisGeometry,
        new THREE.MeshBasicMaterial({ 
          color: 0x0099ff, // Medium blue for iris
          fog: false,
          depthTest: false,
          depthWrite: false,
          transparent: true,
          opacity: 0.8,
          side: THREE.DoubleSide
        })
      );
      iris.rotation.x = -Math.PI / 2; // Lay flat on ground
      iris.position.y = 0.0005; // Between eye and pupil
      
      // Create view direction indicator (small triangle)
      const arrowShape = new THREE.Shape();
      arrowShape.moveTo(0, 0.08);
      arrowShape.lineTo(-0.05, -0.08);
      arrowShape.lineTo(0.05, -0.08);
      arrowShape.closePath();
      
      const arrowGeometry = new THREE.ShapeGeometry(arrowShape);
      const viewerArrow = new THREE.Mesh(
        arrowGeometry,
        new THREE.MeshBasicMaterial({ 
          color: 0x0044cc, // Darker blue for arrow
          fog: false,
          depthTest: false,
          depthWrite: false,
          transparent: true,
          opacity: 0.7
        })
      );
      viewerArrow.rotation.x = -Math.PI / 2; // Lay flat on ground
      viewerArrow.position.y = 0; // At group level
      viewerArrow.position.z = -0.15;
      
      viewerGroup.add(eyeOuter);
      viewerGroup.add(iris);
      viewerGroup.add(pupil);
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
        const fixedDistance = compassDistance * 0.7; // Same distance as compass
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
      
      // Only update visibility, not position
      viewerMarkerRef.current.visible = renderSettings.showViewerMarker;
    }
  }, [renderSettings, cardinalRotation]);

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
  
  // Generate artistic view using Gemini AI
  const handleGenerateArtisticView = async () => {
    if (!rendererRef.current || !sceneRef.current || !cameraRef.current || !canvasRef.current) return;
    
    setIsGeneratingArtistic(true);
    
    try {
      // Render the scene first
      rendererRef.current.render(sceneRef.current, cameraRef.current);
      
      // Capture the current canvas as base64
      const dataURL = rendererRef.current.domElement.toDataURL('image/png');
      
      // Create a prompt for enhancement
      const prompt = `Enhance this 3D garden render into a photorealistic, artistic garden visualization.
        Maintain the exact composition, viewing angle, plant positions, and layout.
        Make it look like a professional landscape architecture visualization with:
        - Realistic textures for plants, soil, grass, and pathways
        - Beautiful ${renderSettings.timeOfDay < 12 ? 'morning' : renderSettings.timeOfDay < 17 ? 'afternoon' : 'evening'} lighting
        - Atmospheric perspective and depth
        - Natural garden style
        - Photorealistic plant rendering with proper colors and textures
        Keep the same viewing angle and perspective as the input image.`;
      
      // Send to the API endpoint
      const response = await fetch('/api/gardens/generate-artistic-view', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          canvasImage: dataURL,
          prompt,
          gardenId,
          gardenName
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate artistic view');
      }
      
      const data = await response.json();
      
      if (data.imageUrl) {
        // Open the enhanced image in a new tab
        window.open(data.imageUrl, '_blank');
        
        toast({
          title: "Artistic View Generated",
          description: "Your enhanced garden visualization has been created!",
        });
      } else {
        throw new Error('No image URL in response');
      }
    } catch (error: any) {
      console.error('Error generating artistic view:', error);
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to generate artistic view. Please try again.",
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
              data-testid="button-generate-artistic"
            >
              {isGeneratingArtistic ? (
                <>
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4 mr-1" />
                  Generate Artistic View
                </>
              )}
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
                  min={1}
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
}