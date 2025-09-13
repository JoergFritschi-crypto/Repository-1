import { storage } from "./storage";
import type { Garden, Plant, GardenPlant } from "@shared/schema";

interface SceneState {
  camera: {
    position: { x: number; y: number; z: number };
    target: { x: number; y: number; z: number };
    fov: number;
  };
  lighting: {
    timeOfDay: number; // 0-24 hours
    sunAngle: number;
    shadowIntensity: number;
  };
  bounds: {
    width: number;
    height: number;
    depth: number;
  };
  season: string;
  month: number; // 1-12
}

interface PlantSeasonalData {
  commonName: string;
  scientificName: string;
  cultivar?: string;
  position: { x: number; y: number };
  size: { height: number; spread: number };
  seasonalState: string;
  type: string;
  foliage: string;
  bloomStatus: string;
  maintenanceState: string;
}

interface BorderGeometry {
  type: 'polygon' | 'circle' | 'rectangular';
  coordinates: Array<{ x: number; y: number }>;
  thickness: number; // in meters
  material: string;
  height: number; // in meters
  color: string;
}

interface LayoutGeometry {
  borders: BorderGeometry[];
  paths: Array<{
    coordinates: Array<{ x: number; y: number }>;
    width: number; // in meters
    material: string;
    surfaceType: string;
  }>;
  groundAreas: Array<{
    coordinates: Array<{ x: number; y: number }>;
    material: string;
    color: string;
    texture: string;
  }>;
  surroundingFeatures: Array<{
    type: string;
    position: { x: number; y: number };
    dimensions: { width: number; height: number };
    description: string;
  }>;
  coordinateSystem: {
    origin: { x: number; y: number };
    scale: string; // 'percentage' or 'meters'
    bounds: { width: number; height: number };
  };
}

interface PhotorealizationContext {
  garden: Garden;
  plants: PlantSeasonalData[];
  sceneState: SceneState;
  geometry: LayoutGeometry;
  environment: {
    surroundings: string;
    groundMaterial: string;
    pathways: string[];
    borders: string[];
  };
  lighting: {
    timeDescription: string;
    sunPosition: string;
    shadowDirection: string;
    lightQuality: string;
  };
}

/**
 * Builds comprehensive photorealization context with all necessary information
 * for AI image generation
 */
// Type definition for plants provided from frontend
interface ProvidedPlant {
  id: string;
  plantId: string;
  plantName?: string;
  scientificName?: string;
  x?: number;
  y?: number;
  plantDetails?: {
    id?: string;
    commonName?: string;
    scientificName?: string;
    cultivar?: string; // Critical for cultivar support
    type?: string;
    heightMinCm?: number;
    heightMaxCm?: number;
    heightMin?: number;
    heightMax?: number;
    spreadMinCm?: number;
    spreadMaxCm?: number;
    spreadMin?: number;
    spreadMax?: number;
    foliage?: string;
    // Frontend field names
    flowerColor?: string | string[];
    floweringSeason?: string | string[];
    sunlight?: string;
    soil?: string;
    watering?: string;
    // Backend field names (might also be present)
    flowerColors?: string[];
    bloomTime?: string[];
    sunExposure?: string;
    soilType?: string;
    waterNeeds?: string;
  };
}

export async function buildPhotorealizationContext(
  gardenId: string, 
  sceneState: SceneState,
  providedPlants?: ProvidedPlant[] // Properly typed plants from frontend
): Promise<PhotorealizationContext> {
  // Get garden data
  const garden = await storage.getGarden(gardenId);
  if (!garden) {
    throw new Error(`Garden ${gardenId} not found`);
  }

  // Use provided plants if available, otherwise fetch from database
  let plantsWithDetails: Array<{ gardenPlant: any; plant: any }> = [];
  
  if (providedPlants && providedPlants.length > 0) {
    // Use plants provided from frontend (not yet saved to database)
    console.log(`[Photorealization] Using ${providedPlants.length} plants provided from frontend`);
    
    plantsWithDetails = providedPlants.map(placedPlant => ({
      gardenPlant: {
        id: placedPlant.id,
        gardenId: gardenId,
        plantId: placedPlant.plantId,
        quantity: 1,
        position_x: placedPlant.x?.toString() || '50', // Convert percentage to string
        position_y: placedPlant.y?.toString() || '50',
        notes: null
      },
      plant: placedPlant.plantDetails ? {
        // When plantDetails exists, properly map all fields including cultivar
        id: placedPlant.plantDetails.id || placedPlant.plantId,
        commonName: placedPlant.plantDetails.commonName || placedPlant.plantName || 'Unknown Plant',
        scientificName: placedPlant.plantDetails.scientificName || placedPlant.scientificName || '',
        cultivar: placedPlant.plantDetails.cultivar || null, // CRITICAL: Include cultivar from plantDetails
        type: placedPlant.plantDetails.type || 'perennial',
        heightMinCm: placedPlant.plantDetails.heightMinCm || placedPlant.plantDetails.heightMin || 30,
        heightMaxCm: placedPlant.plantDetails.heightMaxCm || placedPlant.plantDetails.heightMax || 60,
        spreadMinCm: placedPlant.plantDetails.spreadMinCm || placedPlant.plantDetails.spreadMin || 20,
        spreadMaxCm: placedPlant.plantDetails.spreadMaxCm || placedPlant.plantDetails.spreadMax || 40,
        foliage: placedPlant.plantDetails.foliage || 'deciduous',
        // Map frontend field names to backend expected field names
        flowerColors: placedPlant.plantDetails.flowerColor ? 
          (Array.isArray(placedPlant.plantDetails.flowerColor) ? 
            placedPlant.plantDetails.flowerColor : 
            [placedPlant.plantDetails.flowerColor]) : 
          (placedPlant.plantDetails.flowerColors || []),
        bloomTime: placedPlant.plantDetails.floweringSeason ? 
          (Array.isArray(placedPlant.plantDetails.floweringSeason) ? 
            placedPlant.plantDetails.floweringSeason : 
            [placedPlant.plantDetails.floweringSeason]) : 
          (placedPlant.plantDetails.bloomTime || []),
        sunExposure: placedPlant.plantDetails.sunlight || placedPlant.plantDetails.sunExposure || 'full sun',
        soilType: placedPlant.plantDetails.soil || placedPlant.plantDetails.soilType || 'well-drained',
        waterNeeds: placedPlant.plantDetails.watering || placedPlant.plantDetails.waterNeeds || 'moderate'
      } : {
        // Fallback when no plantDetails exist
        id: placedPlant.plantId,
        commonName: placedPlant.plantName || 'Unknown Plant',
        scientificName: placedPlant.scientificName || '',
        cultivar: null, // No cultivar in fallback
        type: 'perennial',
        heightMinCm: 30,
        heightMaxCm: 60,
        spreadMinCm: 20,
        spreadMaxCm: 40,
        foliage: 'deciduous',
        flowerColors: [],
        bloomTime: [],
        sunExposure: 'full sun',
        soilType: 'well-drained',
        waterNeeds: 'moderate'
      }
    }));
  } else {
    // Fallback to fetching from database
    console.log('[Photorealization] No plants provided, fetching from database');
    const gardenPlants = await storage.getGardenPlants(gardenId);
    
    plantsWithDetails = await Promise.all(
      gardenPlants.map(async (gp) => {
        const plant = await storage.getPlant(gp.plantId);
        return {
          gardenPlant: gp,
          plant
        };
      })
    );
  }

  // Convert plants to seasonal data for July (month 7)
  const plantsData: PlantSeasonalData[] = plantsWithDetails
    .filter(({ plant }) => plant !== undefined)
    .map(({ gardenPlant, plant }) => {
      const seasonalState = getSeasonalState(plant!, sceneState.month);
      const bloomStatus = getBloomStatus(plant!, sceneState.month);
      const maintenanceState = getMaintenanceState(plant!, sceneState.month);
      
      return {
        commonName: plant!.commonName,
        scientificName: plant!.scientificName,
        cultivar: plant!.cultivar,
        position: {
          x: parseFloat(gardenPlant.position_x || '50'),
          y: parseFloat(gardenPlant.position_y || '50')
        },
        size: {
          // Calculate median values from min and max
          height: ((plant!.heightMinCm || 30) + (plant!.heightMaxCm || 60)) / 2 / 100, // Median in meters
          spread: ((plant!.spreadMinCm || 20) + (plant!.spreadMaxCm || 40)) / 2 / 100  // Median in meters
        },
        seasonalState,
        type: plant!.type || 'perennial',
        foliage: plant!.foliage || 'deciduous',
        bloomStatus,
        maintenanceState
      };
    });
    
  // Enhanced logging for debugging cultivar propagation
  console.log(`[Photorealization] Processing ${plantsData.length} plants for garden ${gardenId}:`, 
    plantsData.map(p => ({
      name: p.commonName,
      scientificName: p.scientificName,
      cultivar: p.cultivar || 'No cultivar', // Log cultivar explicitly
      position: `(${p.position.x.toFixed(1)}%, ${p.position.y.toFixed(1)}%)`,
      size: `${p.size.height}m x ${p.size.spread}m`,
      seasonalState: p.seasonalState,
      bloomStatus: p.bloomStatus
    }))
  );
  
  // Additional logging specifically for cultivar tracking
  const plantsWithCultivars = plantsData.filter(p => p.cultivar);
  if (plantsWithCultivars.length > 0) {
    console.log(`[Photorealization] Found ${plantsWithCultivars.length} plants with cultivars:`,
      plantsWithCultivars.map(p => `${p.scientificName} '${p.cultivar}'`)
    );
  } else {
    console.log('[Photorealization] No cultivars found in plant data');
  }

  // Extract detailed geometry from layout_data
  const geometry = extractLayoutGeometry(garden);
  
  // Build environment description (enhanced with layout_data)
  const environment = {
    surroundings: describeSurroundings(garden),
    groundMaterial: describeGroundMaterial(garden),
    pathways: describePathways(garden),
    borders: describeBorders(garden)
  };

  // Build lighting description
  const lighting = {
    timeDescription: describeTimeOfDay(sceneState.lighting.timeOfDay),
    sunPosition: describeSunPosition(sceneState.lighting.timeOfDay, sceneState.month),
    shadowDirection: describeShadowDirection(sceneState.lighting.sunAngle),
    lightQuality: describeLightQuality(sceneState.lighting.timeOfDay, sceneState.month, garden.sunExposure || undefined)
  };

  return {
    garden,
    plants: plantsData,
    sceneState,
    geometry,
    environment,
    lighting
  };
}

/**
 * Extracts detailed geometry information from garden layout_data
 */
function extractLayoutGeometry(garden: Garden): LayoutGeometry {
  const layoutData = garden.layout_data as any || {};
  
  // Calculate coordinate system based on garden dimensions
  const dimensions = calculateActualDimensions(garden);
  const coordinateSystem = {
    origin: { x: 0, y: 0 }, // Top-left corner as origin
    scale: 'percentage' as const, // Canvas uses percentage positioning
    bounds: { width: dimensions.width, height: dimensions.length }
  };
  
  // Extract or infer borders from layout_data or garden shape
  const borders: BorderGeometry[] = [];
  if (layoutData.borders) {
    // Use explicit border data if available
    borders.push(...layoutData.borders.map((border: any) => ({
      type: border.type || 'polygon',
      coordinates: border.coordinates || [],
      thickness: border.thickness || 0.15, // 15cm default
      material: border.material || 'stone edging',
      height: border.height || 0.1, // 10cm default
      color: border.color || '#8B7355'
    })));
  } else {
    // Infer border from garden shape
    const shapeCoords = getShapeCoordinates(garden.shape, dimensions);
    borders.push({
      type: garden.shape === 'circle' ? 'circle' : 'polygon',
      coordinates: shapeCoords,
      thickness: 0.15,
      material: 'natural stone edging',
      height: 0.1,
      color: '#8B7355'
    });
  }
  
  // Extract paths from layout_data
  const paths = layoutData.paths ? layoutData.paths.map((path: any) => ({
    coordinates: path.coordinates || [],
    width: path.width || 0.8, // 80cm default
    material: path.material || 'gravel',
    surfaceType: path.surfaceType || 'natural gravel path'
  })) : [];
  
  // Extract ground areas
  const groundAreas = layoutData.groundAreas ? layoutData.groundAreas.map((area: any) => ({
    coordinates: area.coordinates || [],
    material: area.material || 'soil',
    color: area.color || '#8B4513',
    texture: area.texture || 'rich dark topsoil'
  })) : [{
    coordinates: getShapeCoordinates(garden.shape, dimensions),
    material: 'soil',
    color: '#8B4513',
    texture: 'rich dark topsoil with organic matter'
  }];
  
  // Extract surrounding features - keep minimal
  const surroundingFeatures = layoutData.surroundings ? layoutData.surroundings.map((feature: any) => ({
    type: feature.type || 'neutral background',
    position: feature.position || { x: 50, y: 0 },
    dimensions: feature.dimensions || { width: 100, height: 50 },
    description: feature.description || 'soft neutral background blur'
  })) : [];
  
  return {
    borders,
    paths,
    groundAreas,
    surroundingFeatures,
    coordinateSystem
  };
}

/**
 * Get shape coordinates for standard garden shapes
 */
function getShapeCoordinates(shape: string, dimensions: any): Array<{ x: number; y: number }> {
  switch (shape) {
    case 'rectangle':
    case 'square':
      return [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 100, y: 100 },
        { x: 0, y: 100 }
      ];
    case 'circle':
      // Generate circle points
      const points = [];
      for (let i = 0; i < 16; i++) {
        const angle = (i * 2 * Math.PI) / 16;
        points.push({
          x: 50 + 50 * Math.cos(angle),
          y: 50 + 50 * Math.sin(angle)
        });
      }
      return points;
    case 'oval':
      const ovalPoints = [];
      for (let i = 0; i < 16; i++) {
        const angle = (i * 2 * Math.PI) / 16;
        ovalPoints.push({
          x: 50 + 40 * Math.cos(angle),
          y: 50 + 30 * Math.sin(angle)
        });
      }
      return ovalPoints;
    default:
      // Default rectangle
      return [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 100, y: 100 },
        { x: 0, y: 100 }
      ];
  }
}

/**
 * Builds structured prompt from photorealization context
 */
function buildDetailedPhotorealizationPrompt(context: PhotorealizationContext): string {
  const { garden, plants, sceneState, geometry, environment, lighting } = context;

  // Calculate garden dimensions
  const dimensions = calculateActualDimensions(garden);

  const prompt = `
=== PHOTOREALISTIC GARDEN VISUALIZATION ===

IMAGE REQUIREMENTS:
- ASPECT RATIO: Generate a landscape 16:9 image (1280x720 pixels). Do not crop or change aspect ratio.
- ORIENTATION: Preserve exact orientation from reference. Green marker on LEFT edge, red marker on RIGHT edge. Blue/N marker at TOP. Do NOT mirror, flip, or rotate the image.
- BOUNDARIES: Show garden bed boundaries/edges as clearly visible natural borders (stone edging, mulch edge, or lawn edge) around the planting area.
- COORDINATE PRESERVATION: Origin at top-left (0,0), x increases rightward, y increases downward. Maintain exact plant positions from reference.

COORDINATE SYSTEM & SCALE:
- Origin: Top-left corner (0%, 0%) = (0m, 0m) in real coordinates
- Scale: ${geometry.coordinateSystem.scale} positioning (0-100% canvas) = ${geometry.coordinateSystem.bounds.width}m × ${geometry.coordinateSystem.bounds.height}m real space
- Grid reference: 1% canvas = ${(geometry.coordinateSystem.bounds.width / 100).toFixed(2)}m horizontal, ${(geometry.coordinateSystem.bounds.height / 100).toFixed(2)}m vertical
- Conversion: Canvas position (x%, y%) = Real position (${(geometry.coordinateSystem.bounds.width / 100).toFixed(2)}*x meters, ${(geometry.coordinateSystem.bounds.height / 100).toFixed(2)}*y meters)

CANVAS & BOUNDS:
- Garden shape: ${garden.shape}
- Dimensions: ${dimensions.width}m × ${dimensions.length}m
- Total area: ${dimensions.area}m²
- Ground level: ${garden.slopePercentage ? `${garden.slopePercentage}% slope ${garden.slopeDirection}` : 'level'}
- North orientation: ${garden.northOrientation || 'N'}

BORDERS & SURROUNDINGS GEOMETRY:
${geometry.borders.map((border, idx) => `
Border ${idx + 1}:
  Type: ${border.type}
  Material: ${border.material} (${border.color})
  Thickness: ${border.thickness}m, Height: ${border.height}m
  Coordinates (exact positions):
${border.coordinates.map(coord => `    (${coord.x.toFixed(1)}%, ${coord.y.toFixed(1)}%) = (${((coord.x * geometry.coordinateSystem.bounds.width) / 100).toFixed(1)}m, ${((coord.y * geometry.coordinateSystem.bounds.height) / 100).toFixed(1)}m)`).join('\n')}`).join('')}

${geometry.paths.length > 0 ? `PATHWAYS GEOMETRY:
${geometry.paths.map((path, idx) => `
Path ${idx + 1}:
  Width: ${path.width}m
  Material: ${path.material} (${path.surfaceType})
  Route coordinates:
${path.coordinates.map(coord => `    (${coord.x.toFixed(1)}%, ${coord.y.toFixed(1)}%) = (${((coord.x * geometry.coordinateSystem.bounds.width) / 100).toFixed(1)}m, ${((coord.y * geometry.coordinateSystem.bounds.height) / 100).toFixed(1)}m)`).join('\n')}`).join('')}` : ''}

GROUND AREAS GEOMETRY:
${geometry.groundAreas.map((area, idx) => `
Ground Area ${idx + 1}:
  Material: ${area.material} (${area.color})
  Texture: ${area.texture}
  Coverage coordinates:
${area.coordinates.map(coord => `    (${coord.x.toFixed(1)}%, ${coord.y.toFixed(1)}%) = (${((coord.x * geometry.coordinateSystem.bounds.width) / 100).toFixed(1)}m, ${((coord.y * geometry.coordinateSystem.bounds.height) / 100).toFixed(1)}m)`).join('\n')}`).join('')}

${geometry.surroundingFeatures.length > 0 ? `SURROUNDING FEATURES:
${geometry.surroundingFeatures.map((feature, idx) => `
Feature ${idx + 1}:
  Type: ${feature.type}
  Position: (${feature.position.x.toFixed(1)}%, ${feature.position.y.toFixed(1)}%) = (${((feature.position.x * geometry.coordinateSystem.bounds.width) / 100).toFixed(1)}m, ${((feature.position.y * geometry.coordinateSystem.bounds.height) / 100).toFixed(1)}m)
  Size: ${feature.dimensions.width}m × ${feature.dimensions.height}m
  Description: ${feature.description}`).join('')}` : ''}

CAMERA & LENS (LOCKED POSITION):
- Position: ${sceneState.camera.position.x.toFixed(1)}m, ${sceneState.camera.position.y.toFixed(1)}m, ${sceneState.camera.position.z.toFixed(1)}m
- Target: ${sceneState.camera.target.x.toFixed(1)}m, ${sceneState.camera.target.y.toFixed(1)}m, ${sceneState.camera.target.z.toFixed(1)}m
- Field of view: ${sceneState.camera.fov}°
- Lens type: Professional landscape photography (equivalent to 24-70mm)

LIGHTING (JULY):
- Time: ${lighting.timeDescription}
- Sun position: ${lighting.sunPosition}
- Shadow direction: ${lighting.shadowDirection}
- Light quality: ${lighting.lightQuality}
- Sky: ${describeSkyCondition(sceneState.lighting.timeOfDay)}

CRITICAL PLANT COUNT VERIFICATION:
- EXACT COUNT: ${plants.length} plants total - NO MORE, NO LESS
- SPECIES LIST: ${plants.map(p => p.commonName).join(', ')}
- VERIFICATION: Count exactly ${plants.length} distinct plants in final image
- NO background plants, NO filler vegetation, NO extras

BOTANICAL SPECIMEN LIST (HERBARIUM-QUALITY IDENTIFICATION - JULY):
${plants.map((plant, idx) => {
  const botanicalDetails = getBotanicalMorphology(plant.scientificName, plant.commonName, plant.cultivar);
  const plantNumber = idx + 1;
  const totalPlants = plants.length;
  return `
Specimen ${plantNumber} of ${totalPlants}: ${plant.scientificName}${plant.cultivar ? ` '${plant.cultivar}'` : ''} [common: ${plant.commonName}]
  CRITICAL IDENTIFICATION: ${botanicalDetails}
  Position: (${plant.position.x.toFixed(1)}%, ${plant.position.y.toFixed(1)}%) = (${((plant.position.x * geometry.coordinateSystem.bounds.width) / 100).toFixed(1)}m, ${((plant.position.y * geometry.coordinateSystem.bounds.height) / 100).toFixed(1)}m)
  Mature size: ${plant.size.height.toFixed(1)}m tall × ${plant.size.spread.toFixed(1)}m spread
  Growth type: ${plant.type}, ${plant.foliage}
  July phenology: ${plant.seasonalState}
  Flowering status: ${plant.bloomStatus}
  Cultivation state: ${plant.maintenanceState}
  UNIQUE PLACEMENT: This is plant ${plantNumber} of exactly ${totalPlants} plants`;
}).join('')}

SURROUNDINGS:
- Context: ${environment.surroundings}
- Beyond garden: Minimal, soft-focus neutral background only
- Horizon line: Keep very subtle, no specific landscape details
- Background: Gentle bokeh blur, no identifiable features or structures
- Focus: 95% on garden bed itself, 5% minimal neutral surroundings

OUTPUT STYLE:
- Botanical specimen photography - Royal Horticultural Society standard
- Professional garden bed documentation with botanical accuracy
- Herbarium-quality plant identification - each species clearly recognizable
- Natural color palette for July in ${garden.location || 'temperate climate'}
- Botanical garden photography aesthetic - educational quality
- Sharp botanical detail: visible leaf venation, accurate flower structure, correct growth habit
- Scientific accuracy: authentic plant morphology, no artistic interpretation
- Reference: Chelsea Flower Show photography, Kew Gardens documentation
- BACKGROUND TREATMENT: Minimal soft-focus blur, neutral tones, no specific details
- DEPTH OF FIELD: Sharp focus on garden bed, background heavily blurred
- COMPOSITION: Garden bed fills 90-95% of frame, minimal background visible

CRITICAL CONSTRAINTS (ABSOLUTE REQUIREMENTS):

CAMERA POSITION (LOCKED - NO MODIFICATIONS):
- DO NOT move, rotate, or zoom the camera from specified position
- DO NOT change the field of view (${sceneState.camera.fov}° locked)
- DO NOT alter the viewing angle or perspective from 3D reference
- MAINTAIN exact camera target and position coordinates as specified
- DO NOT crop or reframe the composition

BORDERS & MATERIALS (EXACT SPECIFICATIONS):
- DO NOT alter border materials, thickness, or positioning from geometry specifications
- DO NOT change ground materials or textures from specified coordinates
- DO NOT modify pathway materials, width, or routing from defined coordinates
- DO NOT add, remove, or relocate any surrounding features beyond specifications
- MAINTAIN exact border polygons and edging as defined in coordinate system

COORDINATE SYSTEM (ABSOLUTE FIDELITY):
- USE ONLY the specified coordinate conversion: Canvas % to meters
- DO NOT interpret positions differently than the defined grid reference
- ANCHOR all elements to the scene bounds: ${geometry.coordinateSystem.bounds.width}m × ${geometry.coordinateSystem.bounds.height}m
- RESPECT the origin at top-left corner (0%, 0%) as (0m, 0m)
- SCALE anchoring: 1% canvas = ${(geometry.coordinateSystem.bounds.width / 100).toFixed(2)}m horizontal

PLANT SPECIFICATIONS (NO DEVIATIONS):
- EXACT plant count: Only ${plants.length} plants as specified above
- NO additional plants, flowers, or vegetation beyond the list
- NO artistic interpretation of plant positions - use exact coordinates only
- BOTANICAL ACCURACY - each plant must look like its scientific species
- REALISTIC SCALE - plants sized according to specified dimensions
- July seasonal state ONLY - no other seasonal appearance

FORBIDDEN ADDITIONS & BOTANICAL ACCURACY REQUIREMENTS:
- NO decorative elements not mentioned (statues, furniture, arbors, ornaments)
- NO people, animals, or artificial objects anywhere in scene
- NO water features, lighting, or structures not explicitly specified
- NO creative liberties with composition, framing, or artistic interpretation
- NO specific background details (buildings, fences, specific trees, landscapes)
- MINIMAL background - only soft neutral blur beyond garden boundaries
- NO recognizable environmental features that could conflict with actual location

CRITICAL BOTANICAL CONSTRAINTS - SPECIES ACCURACY:
${getExcludedSpeciesForPlants(plants)}
- NO generic "garden plants" - each plant must be its EXACT scientific species
- NO hybrid interpretations - pure species characteristics only
- NO mixing plant features - maintain distinct species identity
- NO seasonal confusion - July appearance only, no spring bulbs or autumn colors
- MANDATORY: Each plant must be identifiable by a botanist to genus and species level

BACKGROUND MINIMIZATION REQUIREMENTS:
- BACKGROUND: Maximum 10% of image, soft bokeh blur only
- NO specific environmental features (no buildings, fences, specific trees)
- NO identifiable location markers (urban/rural/suburban details)
- NEUTRAL soft-focus gradient beyond garden boundaries
- DEPTH OF FIELD: Sharp focus on garden, background heavily blurred
- ENVIRONMENTAL NEUTRALITY: Image should work in any real-world setting
- SKY: Minimal, neutral tones only, no dramatic clouds or colors
- HORIZON: Barely visible, no landscape details

Generate a photorealistic garden image showing exactly ${plants.length} plants: ${plants.map(p => p.commonName).join(', ')}. Each plant must be botanically accurate at its specified position. July bloom state, soft blurred background, no decorations or extras.
`;

  return prompt.trim();
}

/**
 * Builds an enhanced, highly detailed prompt for accurate photorealization
 * Target: 5000-6000 characters for maximum clarity and precision
 */
export function buildPhotorealizationPrompt(context: PhotorealizationContext): string {
  const { garden, plants, sceneState } = context;
  const dimensions = calculateActualDimensions(garden);
  
  // Calculate grid references for positioning
  const gridCellW = (dimensions.width / 10).toFixed(2);
  const gridCellH = (dimensions.length / 10).toFixed(2);
  
  // Build detailed plant placement matrix - optimized for 5000-6000 char target
  const plantMatrix = plants.map((plant, idx) => {
    const num = idx + 1;
    const morphology = getBotanicalMorphology(plant.scientificName, plant.commonName, plant.cultivar);
    const gridX = Math.floor(plant.position.x / 10);
    const gridY = Math.floor(plant.position.y / 10);
    const mX = (plant.position.x * dimensions.width / 100).toFixed(1);
    const mY = (plant.position.y * dimensions.length / 100).toFixed(1);
    
    // Dynamic morphology length to maintain 5000-6000 char target
    // With 4 plants, aim for ~120 chars per plant description
    const targetLength = plants.length <= 3 ? 140 : plants.length <= 5 ? 120 : 100;
    const shortMorph = morphology.length > targetLength ? morphology.substring(0, targetLength - 3) + '...' : morphology;
    
    return `P${num}: ${plant.commonName}${plant.cultivar ? ` '${plant.cultivar}'` : ''} @ [${gridX},${gridY}] (${plant.position.x}%L,${plant.position.y}%T=${mX}m,${mY}m)
  ${plant.size.height.toFixed(1)}m×${plant.size.spread.toFixed(1)}m | ${shortMorph}`;
  }).join('\n');
  
  // Calculate plant spacing and relationships
  const plantSpacing = plants.map((p1, i) => {
    return plants.slice(i + 1).map(p2 => {
      const dx = Math.abs(p1.position.x - p2.position.x) * dimensions.width / 100;
      const dy = Math.abs(p1.position.y - p2.position.y) * dimensions.length / 100;
      return Math.sqrt(dx * dx + dy * dy);
    });
  }).flat();
  const minSpace = plantSpacing.length > 0 ? Math.min(...plantSpacing).toFixed(2) : 'N/A';
  const avgSpace = plantSpacing.length > 0 ? (plantSpacing.reduce((a,b) => a+b, 0) / plantSpacing.length).toFixed(2) : 'N/A';
  
  // Calculate size groups for hierarchy
  const tallPlants = plants.filter(p => p.size.height > 1).map(p => `${p.commonName}(${p.size.height.toFixed(1)}m)`).join(', ');
  const medPlants = plants.filter(p => p.size.height >= 0.5 && p.size.height <= 1).map(p => `${p.commonName}(${p.size.height.toFixed(1)}m)`).join(', ');
  const shortPlants = plants.filter(p => p.size.height < 0.5).map(p => `${p.commonName}(${p.size.height.toFixed(1)}m)`).join(', ');
  
  // Build comprehensive prompt targeting 5000-6000 characters
  // Dynamic sections adjust based on plant count to maintain target size
  const basePromptSize = 4200; // Base structure without plants
  const perPlantAllocation = Math.floor((5500 - basePromptSize) / Math.max(plants.length, 1));
  
  // Build comprehensive plant descriptions for 5000-6000 character target
  const plantDescriptions = plants.map((plant, idx) => {
    const num = idx + 1;
    const morphology = getBotanicalMorphology(plant.scientificName, plant.commonName, plant.cultivar);
    const gridX = Math.floor(plant.position.x / 10);
    const gridY = Math.floor(plant.position.y / 10);
    const mX = (plant.position.x * dimensions.width / 100).toFixed(1);
    const mY = (plant.position.y * dimensions.length / 100).toFixed(1);
    
    // Expanded descriptions to help reach 5000-6000 character target
    const typeDesc = plant.type === 'perennial' ? 'herbaceous perennial' : 
                     plant.type === 'shrub' ? 'woody shrub' : 
                     plant.type === 'tree' ? 'deciduous tree' : plant.type;
    const bloomDesc = plant.bloomStatus.includes('flowering') 
      ? `Displaying characteristic ${plant.scientificName.includes('Rosa') ? 'rose blooms' : 
         plant.scientificName.includes('Lavandula') ? 'lavender flower spikes' : 'flowers'} during July`
      : 'Rich green foliage only, no flowering in July';
    
    return `PLANT ${num}: ${plant.commonName}${plant.cultivar ? ` '${plant.cultivar}'` : ''} (${plant.scientificName})
  Grid Position: Cell [${gridX},${gridY}] = ${plant.position.x}% from left edge, ${plant.position.y}% from top edge
  Physical Location: ${mX} meters from left boundary, ${mY} meters from back boundary
  Mature Size: ${plant.size.height.toFixed(1)} meters tall × ${plant.size.spread.toFixed(1)} meters wide spread
  Growth Form: ${typeDesc} with ${plant.foliage} foliage type
  Botanical Details: ${morphology}
  July Appearance: ${bloomDesc}
  Spacing: Maintain clear soil visible around base, no overlapping with adjacent plants`;
  }).join('\n\n');

  // Create comprehensive prompt targeting exactly 5000-6000 characters
  const addPadding = (text: string, targetLength: number): string => {
    // Add descriptive padding to reach target length if needed
    const currentLength = text.length;
    if (currentLength < targetLength) {
      const padding = `\n\nADDITIONAL EMPHASIS: This garden visualization must be photorealistic with exact plant placement. Each plant's position is critical for garden planning. Maintain professional photography standards throughout. Verify all specifications are met before finalizing the image. The garden should appear natural yet precisely planned.`.substring(0, targetLength - currentLength);
      return text + padding;
    }
    return text;
  };

  const basePrompt = `=== PHOTOREALISTIC GARDEN BED VISUALIZATION - PRECISE BOTANICAL PLACEMENT (JULY) ===

[SPATIAL REFERENCE SYSTEM & COORDINATE MAPPING]
VIEWING ANGLE: Professional garden photography - eye-level 1.6m, ${sceneState?.camera?.position?.z?.toFixed(1) || '4'}m from bed front
GRID OVERLAY: Visualize precise 10×10 reference grid on bed surface
- Cells: ${gridCellW}m × ${gridCellH}m each
- Origin: TOP-LEFT corner (0,0)
- X-axis: LEFT(0%) to RIGHT(100%)
- Y-axis: TOP(0%) to BOTTOM(100%)
MARKERS: GREEN=left, RED=right, BLUE=back, YELLOW=front
CRITICAL: NO MIRRORING - left stays left, right stays right

[GARDEN BED SPECIFICATIONS]
SHAPE: ${garden.shape === 'rectangle' ? 'Rectangular' : garden.shape === 'circle' ? 'Circular' : 'Oval'} raised bed
DIMENSIONS: ${dimensions.width}×${dimensions.length}m = ${dimensions.area.toFixed(1)}m²
SOIL: Dark chocolate brown #3E2723, fine tilth, moist
- Natural undulations, mounding at plants
EDGES: ${garden.shape === 'rectangle' ? 'Straight 90°' : 'Curved'}, 10-15cm drop
MULCH: 2-3cm aged bark at plant bases only

[PLANT PLACEMENT - EXACTLY ${plants.length} PLANTS]
${plantDescriptions}

SPACING: Min ${minSpace}m, avg ${avgSpace}m between plants
Soil patches visible between plantings

[BOTANICAL ACCURACY - JULY]
STATE: Peak summer growth, full foliage
FLOWERING: Summer bloomers only
SIZES: Tall(>1m): ${tallPlants || 'none'} | Med(0.5-1m): ${medPlants || 'none'} | Short(<0.5m): ${shortPlants || 'none'}
Each plant identifiable to species level

[COMPOSITION & LIGHTING]
CAMERA: ${sceneState?.camera?.position?.z?.toFixed(1) || '4'}m distance, 35-50mm, f/5.6-8
FOCUS: Entire bed sharp, background blurred
LIGHT: 2-3PM July, high SW sun (60-70°)
- Short shadows forward-right
- Greens #2E7D32-#66BB6A
- Soil #3E2723-#5D4037

[STRICT PROHIBITIONS]
FORBIDDEN:
× NO ornaments, structures, paths
× NO water features, tools
× NO people, animals, insects
× NO extra plants beyond ${plants.length}
× NO weeds, fillers
× NO mirroring or position changes
Background <10% of image

[VERIFICATION]
□ COUNT: EXACTLY ${plants.length} plants (${plants.map(p => p.commonName).join(', ')})
□ POSITIONS: Grid coordinates exact
□ SIZES: Match specifications
□ SPECIES: Botanically accurate
□ SEASON: July appearance
□ NO MIRRORING: Left=left, right=right

GENERATE: ${dimensions.width}×${dimensions.length}m ${garden.shape} bed, ${plants.length} plants at exact positions, photorealistic July garden`;

  const prompt = addPadding(basePrompt, 5500); // Target middle of 5000-6000 range

  return prompt.trim();
}

/**
 * Get seasonal state description for a plant in a specific month
 */
function getSeasonalState(plant: Plant, month: number): string {
  const type = plant.type || 'perennial';
  const foliage = plant.foliage || 'deciduous';
  
  if (month === 7) { // July
    if (type.includes('evergreen') || foliage === 'evergreen') {
      return 'at peak summer growth, full dense foliage, vibrant green color';
    } else if (type.includes('perennial') || type.includes('shrub')) {
      return 'at full summer maturity, lush healthy growth, peak seasonal form';
    } else if (type.includes('annual')) {
      return 'at mid-season growth, actively growing and flowering';
    } else {
      return 'in full summer growth, healthy and vigorous';
    }
  }
  
  return 'in typical seasonal state';
}

/**
 * Get bloom status for a plant in a specific month
 */
function getBloomStatus(plant: Plant, month: number): string {
  const bloomTime = plant.floweringSeason || '';
  
  if (month === 7) { // July
    if (bloomTime.includes('summer') || bloomTime.includes('july')) {
      return 'actively flowering, showing peak blooms';
    } else if (bloomTime.includes('spring')) {
      return 'post-bloom, focusing on foliage growth';
    } else if (bloomTime.includes('autumn') || bloomTime.includes('fall')) {
      return 'pre-bloom, building energy for later flowering';
    } else {
      return 'in seasonal foliage phase';
    }
  }
  
  return 'typical seasonal bloom status';
}

/**
 * Get maintenance state for a plant in a specific month
 */
function getMaintenanceState(plant: Plant, month: number): string {
  if (month === 7) { // July
    return 'well-maintained, recently weeded around base, mulched if appropriate';
  }
  return 'well-maintained condition';
}

/**
 * Calculate actual garden dimensions from stored data
 */
function calculateActualDimensions(garden: Garden): { width: number; length: number; area: number } {
  const dims = garden.dimensions as any;
  let width = 10, length = 10; // defaults
  
  if (garden.shape === 'rectangle' && dims.width && dims.length) {
    width = dims.width;
    length = dims.length;
  } else if (garden.shape === 'square' && dims.size) {
    width = length = dims.size;
  } else if (garden.shape === 'circle' && dims.radius) {
    width = length = dims.radius * 2;
  }
  
  return {
    width,
    length,
    area: width * length
  };
}

/**
 * Describe garden surroundings based on location and style
 * Keep minimal and neutral to match any actual environment
 */
function describeSurroundings(garden: Garden): string {
  // Return minimal, neutral background description
  return 'Soft, neutral background with gentle blur beyond garden boundaries';
}

/**
 * Describe ground material based on garden preferences
 */
function describeGroundMaterial(garden: Garden): string {
  const soilType = garden.soilType || 'loam';
  
  return `Well-prepared ${soilType} soil, rich dark brown color, naturally cultivated garden bed with organic matter incorporated, some fine mulch around plant bases`;
}

/**
 * Describe pathways in the garden
 */
function describePathways(garden: Garden): string[] {
  // For now, return natural pathways - this could be enhanced with actual pathway data
  return ['Natural grass stepping areas between planting zones'];
}

/**
 * Describe garden borders
 */
function describeBorders(garden: Garden): string[] {
  return ['Natural garden bed edges', 'Clean edge definition without specific background details'];
}

/**
 * Describe time of day
 */
function describeTimeOfDay(hour: number): string {
  if (hour >= 6 && hour < 9) return 'Early morning (golden hour beginning)';
  if (hour >= 9 && hour < 12) return 'Mid-morning (bright clear light)';
  if (hour >= 12 && hour < 15) return 'Midday (strong overhead sun)';
  if (hour >= 15 && hour < 18) return 'Afternoon (angled warm light)';
  if (hour >= 18 && hour < 20) return 'Late afternoon (golden hour)';
  return 'Bright daylight';
}

/**
 * Describe sun position for July
 */
function describeSunPosition(hour: number, month: number): string {
  if (month === 7) { // July - high summer sun
    if (hour >= 6 && hour < 12) return 'Rising high in eastern sky';
    if (hour >= 12 && hour < 15) return 'High overhead position (summer solstice angle)';
    if (hour >= 15 && hour < 20) return 'High in western sky, creating long dramatic shadows';
  }
  return 'Seasonal appropriate position';
}

/**
 * Describe shadow direction
 */
function describeShadowDirection(sunAngle: number): string {
  const angle = sunAngle % 360;
  if (angle >= 315 || angle < 45) return 'Shadows pointing northward';
  if (angle >= 45 && angle < 135) return 'Shadows pointing westward';
  if (angle >= 135 && angle < 225) return 'Shadows pointing southward';
  return 'Shadows pointing eastward';
}

/**
 * Describe light quality
 */
function describeLightQuality(hour: number, month: number, sunExposure?: string): string {
  const exposure = sunExposure || 'full_sun';
  let quality = '';
  
  if (hour >= 6 && hour < 9 || hour >= 18 && hour < 20) {
    quality = 'Warm golden hour light, soft and directional';
  } else if (hour >= 12 && hour < 15) {
    quality = 'Bright clear midday light, strong and crisp';
  } else {
    quality = 'Natural daylight, clear and even';
  }
  
  if (exposure === 'partial_shade') {
    quality += ', filtered through overhead canopy';
  } else if (exposure === 'full_shade') {
    quality += ', soft diffused light';
  }
  
  return quality;
}

/**
 * Describe sky condition
 * Keep simple and neutral to avoid conflicting with actual environment
 */
function describeSkyCondition(hour: number): string {
  if (hour >= 6 && hour < 9 || hour >= 18 && hour < 20) {
    return 'Soft, neutral sky with gentle light';
  }
  return 'Simple, neutral sky background';
}

/**
 * Get detailed botanical morphology for a plant - trait-driven approach
 */
function getBotanicalMorphology(scientificName: string, commonName: string, cultivar?: string): string {
  const genus = scientificName.split(' ')[0];
  const plantNameUpper = commonName.toUpperCase();
  const cultivarLabel = cultivar ? ` '${cultivar}'` : '';
  
  // Build trait-based descriptions based on genus and common characteristics
  const genusTraits: Record<string, any> = {
    'Rosa': {
      base: 'ROSE',
      leafType: 'compound pinnate leaves with 5-7 glossy leaflets, serrated margins',
      stems: 'thorny green stems',
      growth: 'bushy upright growth habit',
      flowers: 'multiple blooms visible in July',
      cultivarMap: {
        'Mister Lincoln': 'DEEP VELVETY RED flowers, high-centered blooms 5-6 inches across, exceptionally fragrant, tall upright growth to 2m',
        'Chrysler Imperial': 'DARK CRIMSON-RED flowers, classic high-centered form, velvety petals, strong damask fragrance, upright bush 1.5m tall',
        'Oklahoma': 'BLACK-RED velvety flowers, very fragrant, large blooms on long stems, vigorous upright growth to 1.8m',
        'Ingrid Bergman': 'BRIGHT RED flowers, perfect form, minimal fragrance, excellent disease resistance, compact growth 1.2m',
        'Double Delight': 'CREAM flowers edged in RED, color intensifies in sun, spicy fragrance, bushy growth to 1.5m, unique bicolor blooms'
      }
    },
    'Hosta': {
      base: 'HOSTA',
      leafType: 'large broad ovate leaves with prominent parallel venation',
      growth: 'clumping herbaceous perennial forming dense mounds',
      defaultColor: 'green to blue-green foliage',
      cultivarMap: {
        'Sum and Substance': 'ENORMOUS chartreuse-gold leaves up to 50cm wide, giant mounding form to 90cm tall',
        'Patriot': 'dark green leaves with broad white margins, medium mounding habit 60cm tall',
        'Blue Angel': 'huge blue-gray leaves with heavy texture, large mounding form to 80cm tall'
      }
    },
    'Lavandula': {
      base: 'LAVENDER',
      leafType: 'narrow linear gray-green aromatic leaves',
      growth: 'compact Mediterranean shrub',
      flowers: 'upright PURPLE flower spikes rising above foliage',
      cultivarMap: {
        'Hidcote': 'deep purple flowers, compact form to 40cm, silvery foliage',
        'Munstead': 'lavender-blue flowers, dwarf habit to 45cm, gray-green foliage',
        'Grosso': 'long purple flower spikes, vigorous growth to 80cm, highly fragrant'
      }
    },
    'Phlox': {
      base: 'PHLOX',
      leafType: 'opposite lanceolate leaves',
      growth: 'upright herbaceous perennial',
      flowers: 'terminal clusters of fragrant flowers in July',
      cultivarMap: {
        'David': 'pure WHITE flower clusters, tall upright growth to 1.2m, mildew resistant',
        'Starfire': 'brilliant RED flower clusters, dark green foliage, compact growth to 80cm',
        'Blue Paradise': 'LAVENDER-BLUE flower clusters, sturdy stems to 90cm'
      }
    },
    'Helianthus': {
      base: 'SUNFLOWER',
      leafType: 'large rough-textured ovate to lanceolate leaves',
      growth: 'tall upright perennial or annual',
      flowers: 'daisy-like flowers with prominent centers',
      cultivarMap: {
        'Lemon Queen': 'pale LEMON-YELLOW flowers, multiple blooms, tall growth to 2m',
        'Prairie Gold': 'golden YELLOW flowers along stems, prairie native, 2.5m tall',
        'Italian White': 'creamy WHITE flowers with dark centers, multi-branched to 1.5m'
      }
    },
    'Delphinium': {
      base: 'DELPHINIUM',
      leafType: 'deeply lobed palmate leaves',
      growth: 'tall herbaceous perennial',
      flowers: 'tall dense flower spikes',
      cultivarMap: {
        'Blue Bird': 'bright BLUE flowers with white bee, tall spikes to 1.8m',
        'Galahad': 'pure WHITE flower spikes, sturdy stems to 2m',
        'Black Knight': 'deep PURPLE-BLACK flowers, imposing spikes to 1.8m'
      }
    },
    'Echinacea': {
      base: 'CONEFLOWER',
      leafType: 'rough lanceolate leaves',
      growth: 'upright herbaceous perennial',
      flowers: 'daisy-like flowers with prominent raised centers',
      cultivarMap: {
        'Magnus': 'large ROSE-PINK flowers, horizontal petals, sturdy growth to 90cm',
        'White Swan': 'pure WHITE flowers with golden centers, compact to 60cm',
        'Cheyenne Spirit': 'mixed colors from YELLOW to ORANGE to RED, 60cm tall'
      }
    },
    'Rudbeckia': {
      base: 'BLACK-EYED SUSAN',
      leafType: 'rough hairy ovate to lanceolate leaves',
      growth: 'upright herbaceous perennial',
      flowers: 'bright daisy-like flowers with dark centers',
      cultivarMap: {
        'Goldsturm': 'golden YELLOW flowers with black centers, compact to 60cm',
        'Cherokee Sunset': 'warm ORANGE-RED-BRONZE flowers, double blooms, 60cm tall',
        'Prairie Sun': 'YELLOW flowers with green centers, tall growth to 90cm'
      }
    }
  };
  
  // Check if we have specific traits for this genus
  const traits = genusTraits[genus];
  
  if (traits) {
    let description = `${traits.base}${cultivarLabel}: `;
    
    // Check for specific cultivar description
    if (cultivar && traits.cultivarMap && traits.cultivarMap[cultivar]) {
      description += traits.cultivarMap[cultivar] + ', ';
    } else if (traits.flowers) {
      // Generic flower description if no specific cultivar
      description += traits.flowers + ', ';
    }
    
    // Add common traits
    description += traits.leafType;
    if (traits.stems) description += ', ' + traits.stems;
    description += ', ' + traits.growth;
    
    return description;
  }
  
  // Fallback for plants not in our trait system
  // Try to build description from common name patterns
  if (commonName.toLowerCase().includes('maple')) {
    return `${plantNameUpper}${cultivarLabel}: Palmate lobed leaves with 5-7 points, opposite arrangement, ornamental tree or large shrub form`;
  } else if (commonName.toLowerCase().includes('grass')) {
    return `${plantNameUpper}${cultivarLabel}: Ornamental grass with linear leaves, clumping or spreading habit, graceful texture`;
  } else if (commonName.toLowerCase().includes('fern')) {
    return `${plantNameUpper}${cultivarLabel}: Divided fronds with pinnate structure, shade-tolerant, spreading or clumping habit`;
  }
  
  // Generic fallback with cultivar name if present
  return `${plantNameUpper}${cultivarLabel}: Botanically accurate representation with species-specific leaf shape and growth habit`;
}

/**
 * Get list of excluded species to prevent confusion
 */
function getExcludedSpeciesForPlants(plants: PlantSeasonalData[]): string {
  const exclusions: string[] = [];
  
  // Add explicit plant count first with strong emphasis
  exclusions.push(`- CRITICAL PLANT COUNT: Show EXACTLY ${plants.length} plants - NO MORE, NO LESS`);
  exclusions.push(`- REQUIRED PLANTS ONLY: ${plants.map(p => p.commonName).join(', ')} = EXACTLY ${plants.length} plants total`);
  exclusions.push('- FORBIDDEN: Background plants, filler plants, extra vegetation, duplicates');
  exclusions.push('- COUNT VERIFICATION: If you see more than ${plants.length} plants in your generation, STOP and regenerate');
  
  // Count each species type
  const speciesCount: { [key: string]: number } = {};
  plants.forEach(plant => {
    const species = plant.commonName;
    speciesCount[species] = (speciesCount[species] || 0) + 1;
  });
  
  // Add specific counts per species
  Object.entries(speciesCount).forEach(([species, count]) => {
    exclusions.push(`- EXACTLY ${count} ${species}${count > 1 ? 's' : ''} - no more, no less`);
  });
  
  plants.forEach(plant => {
    if (plant.scientificName.includes('Hosta')) {
      exclusions.push('- NO Hydrangea, NO Brunnera, NO Ligularia - show TRUE HOSTA with broad parallel-veined leaves in mounding clumps');
    }
    if (plant.scientificName.includes('Rosa')) {
      exclusions.push('- NO Paeonia (peony), NO Camellia, NO Hibiscus, NO generic shrubs - show TRUE ROSE BUSH with visible FLOWERS, compound leaves and thorny stems');
      exclusions.push('- ROSES MUST SHOW BLOOMS in July - not just green foliage');
    }
    if (plant.scientificName.includes('Lavandula')) {
      exclusions.push('- NO Salvia, NO Perovskia, NO ornamental grasses - show TRUE LAVENDER with purple flower spikes and gray-green narrow leaves');
    }
    if (plant.scientificName.includes('Acer')) {
      exclusions.push('- NO Liquidambar, NO Platanus - show TRUE Japanese Maple (Acer palmatum) with distinctive palmate leaves');
    }
  });
  
  // Add counting reminder at the end
  exclusions.push(`- FINAL PLANT COUNT CHECK: Must show EXACTLY ${plants.length} plants - count them before finalizing`);
  exclusions.push('- NO INVENTED PLANTS: Do not add any plants not explicitly listed above');
  
  return Array.from(new Set(exclusions)).join('\n');
}