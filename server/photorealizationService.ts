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
    bloomStartMonth?: number;
    bloomEndMonth?: number;
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
        flowerColor: placedPlant.plantDetails.flowerColor ? 
          (Array.isArray(placedPlant.plantDetails.flowerColor) ? 
            placedPlant.plantDetails.flowerColor : 
            [placedPlant.plantDetails.flowerColor]) : 
          (placedPlant.plantDetails.flowerColors || []),
        bloomTime: placedPlant.plantDetails.floweringSeason ? 
          (Array.isArray(placedPlant.plantDetails.floweringSeason) ? 
            placedPlant.plantDetails.floweringSeason : 
            [placedPlant.plantDetails.floweringSeason]) : 
          (placedPlant.plantDetails.bloomTime || []),
        // CRITICAL: Include bloom months from database for proper photorealization
        bloomStartMonth: placedPlant.plantDetails.bloomStartMonth || null,
        bloomEndMonth: placedPlant.plantDetails.bloomEndMonth || null,
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
        flowerColor: [],
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
- ORIENTATION: Preserve exact orientation from reference. NO HORIZONTAL MIRRORING. Plants on the left MUST stay on the left, plants on the right MUST stay on the right from YOUR viewing position.
- BOUNDARIES: Show garden bed boundaries/edges as clearly visible natural borders (stone edging, mulch edge, or lawn edge) around the planting area.
- COORDINATE PRESERVATION: Origin at top-left (0,0), x increases rightward FROM YOUR VIEWPOINT, y increases downward. Maintain exact plant positions from reference.
- VIEWING PERSPECTIVE: You are viewing from the EXACT camera position shown in reference. DO NOT flip or mirror the scene horizontally.

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
${getCameraViewingPerspective(sceneState)}

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
 * Calculate and describe the viewing perspective based on camera position
 */
function getCameraViewingPerspective(sceneState: any): string {
  if (!sceneState?.camera?.position) {
    return 'VIEWING DIRECTION: Standard front view';
  }
  
  const camPos = sceneState.camera.position;
  const camTarget = sceneState.camera.target || { x: 0, y: 0, z: 0 };
  
  // Calculate viewing angle based on camera position relative to target
  const dx = camTarget.x - camPos.x;
  const dz = camTarget.z - camPos.z;
  const viewAngle = Math.atan2(dx, -dz) * (180 / Math.PI);
  
  // Determine cardinal direction of viewing
  let viewingFrom = '';
  let lookingToward = '';
  
  if (viewAngle >= -22.5 && viewAngle < 22.5) {
    viewingFrom = 'SOUTH';
    lookingToward = 'NORTH';
  } else if (viewAngle >= 22.5 && viewAngle < 67.5) {
    viewingFrom = 'SOUTHWEST';
    lookingToward = 'NORTHEAST';
  } else if (viewAngle >= 67.5 && viewAngle < 112.5) {
    viewingFrom = 'WEST';
    lookingToward = 'EAST';
  } else if (viewAngle >= 112.5 && viewAngle < 157.5) {
    viewingFrom = 'NORTHWEST';
    lookingToward = 'SOUTHEAST';
  } else if (viewAngle >= 157.5 || viewAngle < -157.5) {
    viewingFrom = 'NORTH';
    lookingToward = 'SOUTH';
  } else if (viewAngle >= -157.5 && viewAngle < -112.5) {
    viewingFrom = 'NORTHEAST';
    lookingToward = 'SOUTHWEST';
  } else if (viewAngle >= -112.5 && viewAngle < -67.5) {
    viewingFrom = 'EAST';
    lookingToward = 'WEST';
  } else if (viewAngle >= -67.5 && viewAngle < -22.5) {
    viewingFrom = 'SOUTHEAST';
    lookingToward = 'NORTHWEST';
  }
  
  // Build explicit perspective description
  return `VIEWING DIRECTION: Camera at (${camPos.x.toFixed(1)}, ${camPos.y.toFixed(1)}, ${camPos.z.toFixed(1)})m
You are viewing from the ${viewingFrom} looking ${lookingToward}
From YOUR perspective:
- Plants on YOUR LEFT are at LOWER X coordinates (more negative X)
- Plants on YOUR RIGHT are at HIGHER X coordinates (more positive X)
- DO NOT mirror or flip the scene - maintain this exact left-right orientation
Viewing angle: ${viewAngle.toFixed(0)}° from north`;
}

/**
 * Builds an enhanced, highly detailed prompt for accurate photorealization
 * Optimized for gardens with 1-50+ plants with tiered detail levels
 */
export function buildPhotorealizationPrompt(context: PhotorealizationContext): string {
  const { garden, plants, sceneState } = context;
  const dimensions = calculateActualDimensions(garden);
  
  // Calculate grid references for positioning
  const gridCellW = (dimensions.width / 10).toFixed(2);
  const gridCellH = (dimensions.length / 10).toFixed(2);
  
  // Determine detail level based on plant count
  const plantCount = plants.length;
  const detailLevel = plantCount <= 10 ? 'full' : plantCount <= 20 ? 'medium' : 'compact';
  
  // Character budget allocation
  const MAX_PROMPT_LENGTH = 45000; // Well under 50K limit
  const FIXED_SECTIONS_LENGTH = 2500; // Core requirements that never change
  const availablePlantBudget = MAX_PROMPT_LENGTH - FIXED_SECTIONS_LENGTH;
  const perPlantBudget = Math.floor(availablePlantBudget / Math.max(plantCount, 1));
  
  // Build plant descriptions based on detail level
  let plantDescriptions = '';
  
  if (detailLevel === 'full') {
    // 1-10 plants: Full detail (~600 chars per plant)
    plantDescriptions = plants.map((plant, idx) => {
      const num = idx + 1;
      const morphology = getBotanicalMorphology(plant.scientificName, plant.commonName, plant.cultivar);
      const gridX = Math.floor(plant.position.x / 10);
      const gridY = Math.floor(plant.position.y / 10);
      const mX = (plant.position.x * dimensions.width / 100).toFixed(1);
      const mY = (plant.position.y * dimensions.length / 100).toFixed(1);
      
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
    
  } else if (detailLevel === 'medium') {
    // 11-20 plants: Medium detail (~300 chars per plant)
    plantDescriptions = `PLANT MATRIX (${plantCount} specimens):\n` + 
      plants.map((plant, idx) => {
        const num = idx + 1;
        const morphology = getBotanicalMorphology(plant.scientificName, plant.commonName, plant.cultivar);
        const shortMorph = morphology.substring(0, 80) + (morphology.length > 80 ? '...' : '');
        const mX = (plant.position.x * dimensions.width / 100).toFixed(1);
        const mY = (plant.position.y * dimensions.length / 100).toFixed(1);
        
        return `P${num}: ${plant.commonName}${plant.cultivar ? ` '${plant.cultivar}'` : ''} (${plant.scientificName})
  Position: (${plant.position.x}%,${plant.position.y}%) = ${mX}m×${mY}m from origin
  Size: ${plant.size.height.toFixed(1)}m tall × ${plant.size.spread.toFixed(1)}m wide
  July: ${shortMorph}, ${plant.bloomStatus}`;
      }).join('\n');
      
  } else {
    // 21+ plants: Compact detail (~150 chars per plant)
    // Group plants by zones for efficiency
    const zones: { [key: string]: typeof plants } = {};
    
    // Divide garden into zones (front, middle, back)
    plants.forEach(plant => {
      const zone = plant.position.y < 33 ? 'FRONT' : 
                   plant.position.y < 66 ? 'MIDDLE' : 'BACK';
      if (!zones[zone]) zones[zone] = [];
      zones[zone].push(plant);
    });
    
    plantDescriptions = `PLANT MATRIX (${plantCount} total plants):\n`;
    
    // First list all plants in compact format
    plantDescriptions += plants.map((plant, idx) => {
      const num = idx + 1;
      const mX = (plant.position.x * dimensions.width / 100).toFixed(1);
      const mY = (plant.position.y * dimensions.length / 100).toFixed(1);
      const cultivarText = plant.cultivar ? ` '${plant.cultivar}'` : '';
      
      return `#${num}: ${plant.commonName}${cultivarText} @ (${plant.position.x.toFixed(0)}%,${plant.position.y.toFixed(0)}%) = ${mX}×${mY}m | ${plant.size.height.toFixed(1)}m ${plant.type}`;
    }).join('\n');
    
    // Then add zone summary for better organization
    plantDescriptions += '\n\nZONE DISTRIBUTION:\n';
    Object.entries(zones).forEach(([zone, zonePlants]) => {
      const plantNames = zonePlants.map(p => p.commonName).join(', ');
      plantDescriptions += `${zone} (${zonePlants.length} plants): ${plantNames}\n`;
    });
  }
  
  // Calculate plant spacing for all detail levels
  const plantSpacing = plants.length > 1 ? plants.map((p1, i) => {
    return plants.slice(i + 1).map(p2 => {
      const dx = Math.abs(p1.position.x - p2.position.x) * dimensions.width / 100;
      const dy = Math.abs(p1.position.y - p2.position.y) * dimensions.length / 100;
      return Math.sqrt(dx * dx + dy * dy);
    });
  }).flat() : [];
  
  const minSpace = plantSpacing.length > 0 ? Math.min(...plantSpacing).toFixed(2) : 'N/A';
  const avgSpace = plantSpacing.length > 0 ? (plantSpacing.reduce((a,b) => a+b, 0) / plantSpacing.length).toFixed(2) : 'N/A';
  
  // Build size groups for better organization
  const sizeGroups = detailLevel !== 'compact' ? {
    tall: plants.filter(p => p.size.height > 1).map(p => `${p.commonName}(${p.size.height.toFixed(1)}m)`).join(', ') || 'none',
    medium: plants.filter(p => p.size.height >= 0.5 && p.size.height <= 1).map(p => `${p.commonName}(${p.size.height.toFixed(1)}m)`).join(', ') || 'none', 
    short: plants.filter(p => p.size.height < 0.5).map(p => `${p.commonName}(${p.size.height.toFixed(1)}m)`).join(', ') || 'none'
  } : null;
  
  // Build base prompt with critical requirements (these NEVER change)
  const criticalRequirements = `=== PHOTOREALISTIC GARDEN BED VISUALIZATION - PRECISE BOTANICAL PLACEMENT (JULY) ===

[CRITICAL REQUIREMENTS - NON-NEGOTIABLE]
PLANT COUNT: EXACTLY ${plants.length} plants - NO MORE, NO LESS
ORIENTATION: NO MIRRORING - left stays left, right stays right from YOUR viewing position
BOUNDARIES: Visible garden bed edges (stone/mulch/lawn edge)
COORDINATE SYSTEM: Origin at top-left (0,0), X increases right, Y increases down
CAMERA LOCKED: You are viewing from EXACTLY the position shown in reference image

[SPATIAL REFERENCE]
VIEWING: Eye-level 1.6m, ${sceneState?.camera?.position?.z?.toFixed(1) || '4'}m from bed front
GRID: 10×10 reference, cells ${gridCellW}×${gridCellH}m
${getCameraViewingPerspective(sceneState)}
MARKERS: GREEN=left, RED=right, BLUE=back, YELLOW=front

[GARDEN SPECIFICATIONS]
SHAPE: ${garden.shape === 'rectangle' ? 'Rectangular' : garden.shape === 'circle' ? 'Circular' : 'Oval'} raised bed
DIMENSIONS: ${dimensions.width}×${dimensions.length}m = ${dimensions.area.toFixed(1)}m²
SOIL: Dark chocolate brown #3E2723, fine tilth, visible between plants
EDGES: ${garden.shape === 'rectangle' ? 'Straight 90°' : 'Curved'}, 10-15cm drop`;

  // Build variable detail sections based on plant count
  let variableDetail = '';
  
  if (detailLevel === 'full') {
    variableDetail = `

[DETAILED PLANT PLACEMENT - ${plants.length} SPECIMENS]
${plantDescriptions}

SPACING: Min ${minSpace}m, avg ${avgSpace}m between plants
Clear soil patches visible between all plantings

[BOTANICAL ACCURACY - JULY STATE]
Peak summer growth, full foliage density
SIZES: Tall(>1m): ${sizeGroups?.tall} | Med(0.5-1m): ${sizeGroups?.medium} | Short(<0.5m): ${sizeGroups?.short}
Each plant must be identifiable to species level by botanical features`;
    
  } else if (detailLevel === 'medium') {
    variableDetail = `

[PLANT PLACEMENT - ${plants.length} SPECIMENS]
${plantDescriptions}

SPACING: Min ${minSpace}m, avg ${avgSpace}m
Soil visible between plants

[JULY APPEARANCE]
Summer growth state, appropriate flowering
Height distribution maintained as specified`;
    
  } else {
    // Compact for 21+ plants
    variableDetail = `

[PLANT PLACEMENT - ${plants.length} SPECIMENS]
${plantDescriptions}

SPACING: Min ${minSpace}m avg, maintain separation
All ${plants.length} plants clearly visible and distinct`;
  }
  
  // Common ending for all detail levels
  const commonEnding = `

[COMPOSITION & LIGHTING]
CAMERA: ${sceneState?.camera?.position?.z?.toFixed(1) || '4'}m distance, 35-50mm lens
LIGHT: 2-3PM July sun, shadows forward-right
COLORS: Greens #2E7D32-#66BB6A, Soil #3E2723-#5D4037

[STRICT PROHIBITIONS]
× NO extra plants beyond ${plants.length}
× NO ornaments, structures, tools
× NO people, animals, insects  
× NO position changes or mirroring - maintain exact left-right orientation
× Background <10% of image
× DO NOT flip or mirror the scene horizontally

[VERIFICATION CHECKLIST]
□ COUNT: Exactly ${plants.length} plants visible
□ SPECIES: ${plants.map(p => p.commonName).join(', ')}
□ POSITIONS: As specified in matrix
□ NO MIRRORING: Left-right orientation EXACTLY as in reference

GENERATE: ${dimensions.width}×${dimensions.length}m ${garden.shape} bed, ${plants.length} plants at exact positions, photorealistic July garden`;

  const prompt = criticalRequirements + variableDetail + commonEnding;
  
  // Log prompt efficiency metrics for debugging
  console.log(`[Photorealization] Prompt generated for ${plantCount} plants:
    Detail level: ${detailLevel}
    Prompt length: ${prompt.length} chars (max: ${MAX_PROMPT_LENGTH})
    Per-plant budget: ${perPlantBudget} chars
    Efficiency: ${((prompt.length / MAX_PROMPT_LENGTH) * 100).toFixed(1)}% of max`);
  
  return prompt.trim();
}

/**
 * Helper function to convert day-of-year to month
 */
function dayOfYearToMonth(dayOfYear: number): number {
  // Array of cumulative days at end of each month (non-leap year)
  const monthEnds = [31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334, 365];
  
  for (let month = 0; month < 12; month++) {
    if (dayOfYear <= monthEnds[month]) {
      return month + 1; // Return 1-based month
    }
  }
  return 12; // Day 366 = December in leap years
}

/**
 * Normalize bloom months for a plant using ONLY database bloom data
 * Completely database-driven with no hardcoded defaults
 */
function normalizeBloomMonths(plant: any): Set<number> {
  const months = new Set<number>();
  const commonName = plant.commonName || 'Unknown';
  const scientificName = plant.scientificName || '';
  const cultivar = plant.cultivar || '';
  
  // PRIORITY 1: Use day-of-year fields if available
  if (plant.bloomStartDayOfYear && plant.bloomEndDayOfYear) {
    const startMonth = dayOfYearToMonth(plant.bloomStartDayOfYear);
    const endMonth = dayOfYearToMonth(plant.bloomEndDayOfYear);
    
    // Handle wrap-around (e.g., Nov-Feb)
    if (startMonth <= endMonth) {
      for (let m = startMonth; m <= endMonth; m++) months.add(m);
    } else {
      // Wrap around year
      for (let m = startMonth; m <= 12; m++) months.add(m);
      for (let m = 1; m <= endMonth; m++) months.add(m);
    }
    console.log(`[Bloom Data] ${commonName}${cultivar ? ` '${cultivar}'` : ''} (${scientificName}): Day ${plant.bloomStartDayOfYear}-${plant.bloomEndDayOfYear} = months ${Array.from(months).sort((a,b) => a-b).join(',')}`);
    return months;
  }
  
  // PRIORITY 2: Use legacy month fields if available
  if (plant.bloomStartMonth && plant.bloomEndMonth) {
    if (plant.bloomStartMonth <= plant.bloomEndMonth) {
      for (let m = plant.bloomStartMonth; m <= plant.bloomEndMonth; m++) {
        months.add(m);
      }
    } else {
      // Handle wrap-around
      for (let m = plant.bloomStartMonth; m <= 12; m++) months.add(m);
      for (let m = 1; m <= plant.bloomEndMonth; m++) months.add(m);
    }
    console.log(`[Bloom Data] ${commonName}${cultivar ? ` '${cultivar}'` : ''} (${scientificName}): Months ${plant.bloomStartMonth}-${plant.bloomEndMonth}`);
    return months;
  }
  
  // NO HARDCODED DEFAULTS - if no database data, return empty set
  if (months.size === 0) {
    console.log(`[Bloom Data] ${commonName}${cultivar ? ` '${cultivar}'` : ''} (${scientificName}): No bloom data in database`);
  }
  
  return months;
}

/**
 * Get seasonal state description for a plant in a specific month
 * Database-driven with generic descriptions
 */
function getSeasonalState(plant: Plant, month: number): string {
  const type = plant.type || 'perennial';
  const foliage = plant.foliage || 'deciduous';
  const bloomMonths = normalizeBloomMonths(plant);
  
  // Check if plant is currently blooming
  if (bloomMonths.has(month)) {
    return 'actively flowering, displaying seasonal blooms';
  }
  
  // Check bloom timing relative to current month
  const bloomArray = Array.from(bloomMonths).sort((a, b) => a - b);
  if (bloomArray.length > 0) {
    const minBloom = Math.min(...bloomArray);
    const maxBloom = Math.max(...bloomArray);
    
    if (month < minBloom) {
      return 'pre-bloom phase, developing foliage and flower buds';
    } else if (month > maxBloom) {
      return 'post-bloom phase, seed development and foliage maturation';
    }
  }
  
  // Generic seasonal descriptions based on plant type
  if (type.includes('evergreen') || foliage === 'evergreen') {
    return 'displaying evergreen foliage at seasonal peak';
  } else if (type.includes('perennial') || type.includes('shrub')) {
    return 'in vegetative growth phase with healthy foliage';
  } else if (type.includes('annual')) {
    return 'in active growing season';
  } else if (type.includes('tree')) {
    return 'displaying mature canopy with seasonal foliage';
  }
  
  return 'in typical seasonal growth phase';
}

/**
 * Get bloom status for a plant in a specific month
 * Completely database-driven with generic descriptions
 */
function getBloomStatus(plant: Plant, month: number): string {
  const bloomMonths = normalizeBloomMonths(plant);
  
  // Log bloom data source
  const dataSource = plant.bloomStartDayOfYear ? 'DAY_OF_YEAR' : 
                     (plant.bloomStartMonth ? 'MONTH' : 'NONE');
  console.log(`[Bloom Status] ${plant.commonName || 'Unknown'}: Month ${month}, Source: ${dataSource}`);
  
  if (bloomMonths.has(month)) {
    // Plant is blooming in this month - use generic description with colors if available
    const flowerColors = plant.flowerColor || [];
    const colorArray = Array.isArray(flowerColors) ? flowerColors : [flowerColors];
    
    if (colorArray.length > 0) {
      const colorStr = colorArray.filter(c => c).join(' and ');
      return `actively flowering with ${colorStr} blooms`;
    } else {
      return 'actively flowering';
    }
  }
  
  // Check bloom timing relative to current month
  const bloomArray = Array.from(bloomMonths).sort((a, b) => a - b);
  if (bloomArray.length > 0) {
    const minBloom = Math.min(...bloomArray);
    const maxBloom = Math.max(...bloomArray);
    
    if (month < minBloom) {
      const monthsUntilBloom = minBloom - month;
      if (monthsUntilBloom === 1) {
        return 'flower buds forming, bloom imminent';
      } else {
        return 'pre-bloom vegetative growth';
      }
    } else if (month > maxBloom) {
      const monthsSinceBloom = month - maxBloom;
      if (monthsSinceBloom === 1) {
        return 'finishing bloom cycle, seed heads forming';
      } else {
        return 'post-bloom phase, seed development';
      }
    }
  }
  
  // No bloom data - return foliage-focused description
  return 'displaying foliage only, no current blooms';
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
 * Get botanical morphology description for a plant - completely database-driven
 * No hardcoded genus-specific descriptions
 */
function getBotanicalMorphology(scientificName: string, commonName: string, cultivar?: string): string {
  const plantNameUpper = commonName.toUpperCase();
  const cultivarLabel = cultivar ? ` '${cultivar}'` : '';
  
  // Build a generic but botanically accurate description
  // AI models will use scientific name to render appropriate characteristics
  let description = `${plantNameUpper}${cultivarLabel} (${scientificName}): `;
  
  // Generic botanical accuracy statement
  description += 'Botanically accurate representation displaying species-appropriate morphology, ';
  description += 'leaf structure, growth habit, and seasonal characteristics as found in nature';
  
  return description;
}

/**
 * Get list of plant count requirements to ensure accuracy
 * Database-driven without hardcoded species knowledge
 */
function getExcludedSpeciesForPlants(plants: PlantSeasonalData[]): string {
  const exclusions: string[] = [];
  
  // Add explicit plant count requirements
  exclusions.push(`- EXACT COUNT REQUIRED: ${plants.length} plants total`);
  exclusions.push(`- PLANT LIST: ${plants.map(p => p.commonName).join(', ')}`);
  exclusions.push('- NO additional plants, background vegetation, or duplicates');
  
  // Count each species type
  const speciesCount: { [key: string]: number } = {};
  plants.forEach(plant => {
    const species = plant.commonName;
    speciesCount[species] = (speciesCount[species] || 0) + 1;
  });
  
  // Add specific counts per species
  Object.entries(speciesCount).forEach(([species, count]) => {
    exclusions.push(`- ${count} × ${species}`);
  });
  
  // Generic botanical accuracy requirement
  exclusions.push('- Each plant must be botanically accurate based on its scientific name');
  exclusions.push('- Maintain species-specific characteristics and growth habits');
  
  return exclusions.join('\n');
}