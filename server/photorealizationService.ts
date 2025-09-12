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
  position: { x: number; y: number };
  size: { height: number; spread: number };
  seasonalState: string;
  type: string;
  foliage: string;
  bloomStatus: string;
  maintenanceState: string;
}

interface PhotorealizationContext {
  garden: Garden;
  plants: PlantSeasonalData[];
  sceneState: SceneState;
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
export async function buildPhotorealizationContext(
  gardenId: string, 
  sceneState: SceneState
): Promise<PhotorealizationContext> {
  // Get garden data
  const garden = await storage.getGarden(gardenId);
  if (!garden) {
    throw new Error(`Garden ${gardenId} not found`);
  }

  // Get all plants in this garden with their positions
  const gardenPlants = await storage.getGardenPlants(gardenId);
  
  // Fetch detailed plant data
  const plantsWithDetails = await Promise.all(
    gardenPlants.map(async (gp) => {
      const plant = await storage.getPlant(gp.plantId);
      return {
        gardenPlant: gp,
        plant
      };
    })
  );

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
        position: {
          x: parseFloat(gardenPlant.position_x || '50'),
          y: parseFloat(gardenPlant.position_y || '50')
        },
        size: {
          height: (plant!.heightMaxCm || 60) / 100, // Convert cm to meters
          spread: (plant!.spreadMaxCm || 40) / 100
        },
        seasonalState,
        type: plant!.type || 'perennial',
        foliage: plant!.foliage || 'deciduous',
        bloomStatus,
        maintenanceState
      };
    });

  // Build environment description
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
    environment,
    lighting
  };
}

/**
 * Builds structured prompt from photorealization context
 */
export function buildPhotorealizationPrompt(context: PhotorealizationContext): string {
  const { garden, plants, sceneState, environment, lighting } = context;

  // Calculate garden dimensions
  const dimensions = calculateActualDimensions(garden);

  const prompt = `
=== PHOTOREALISTIC GARDEN VISUALIZATION ===

CANVAS & BOUNDS:
- Garden shape: ${garden.shape}
- Dimensions: ${dimensions.width}m × ${dimensions.length}m
- Total area: ${dimensions.area}m²
- Ground level: ${garden.slopePercentage ? `${garden.slopePercentage}% slope ${garden.slopeDirection}` : 'level'}
- North orientation: ${garden.northOrientation || 'N'}

CAMERA & LENS:
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

GROUND & MATERIALS:
- Surface: ${environment.groundMaterial}
- Pathways: ${environment.pathways.length > 0 ? environment.pathways.join(', ') : 'Natural grass paths'}
- Borders: ${environment.borders.length > 0 ? environment.borders.join(', ') : 'Natural garden edges'}
- Soil visible: Rich dark brown topsoil visible around plant bases

PLANT LIST (EXACT POSITIONS - JULY SEASON):
${plants.map((plant, idx) => `
Plant ${idx + 1} at position (${plant.position.x.toFixed(1)}%, ${plant.position.y.toFixed(1)}%):
  ${plant.commonName} [${plant.scientificName}]
  Size: Height ${plant.size.height.toFixed(1)}m, Spread ${plant.size.spread.toFixed(1)}m
  Type: ${plant.type}, ${plant.foliage}
  July state: ${plant.seasonalState}
  Bloom status: ${plant.bloomStatus}
  Maintenance: ${plant.maintenanceState}`).join('')}

SURROUNDINGS:
- Context: ${environment.surroundings}
- Beyond garden: Natural countryside transition
- Horizon line: Soft, natural landscape extending to distance
- No artificial structures unless specified

OUTPUT STYLE:
- Professional landscape architecture visualization
- Photorealistic quality - could be mistaken for actual photograph
- Natural color palette appropriate for July in ${garden.location || 'temperate climate'}
- Professional garden photography aesthetic
- Sharp focus on foreground plants, gentle depth of field to background
- Natural textures: soil, grass, plant materials, organic surfaces

CRITICAL CONSTRAINTS (STRICT):
- EXACT plant count: Only ${plants.length} plants as specified above
- NO additional plants, flowers, or vegetation beyond the list
- NO decorative elements not mentioned (statues, furniture, arbors)
- NO people, animals, or artificial objects
- NO seasonal mismatch - strictly July appearance
- MAINTAIN exact viewing angle and perspective from 3D reference
- NO artistic interpretation of plant positions - use exact coordinates
- BOTANICAL ACCURACY - each plant must look like its scientific species
- REALISTIC SCALE - plants sized according to specified dimensions

Transform the provided 3D garden layout into a stunning photorealistic image that looks like it was photographed by a professional landscape photographer in July, maintaining absolute fidelity to the specified plant list, positions, and seasonal state.
`;

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
 */
function describeSurroundings(garden: Garden): string {
  const location = garden.location || '';
  
  if (location.toLowerCase().includes('urban')) {
    return 'Urban residential setting with neighboring properties visible in distance';
  } else if (location.toLowerCase().includes('cottage') || (garden.preferences as any)?.style === 'cottage') {
    return 'Traditional cottage garden setting with countryside backdrop';
  } else {
    return 'Natural residential garden setting with mature trees and shrubs in background';
  }
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
  return ['Natural garden bed edges', 'Soft transition to surrounding landscape'];
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
 */
function describeSkyCondition(hour: number): string {
  if (hour >= 6 && hour < 9 || hour >= 18 && hour < 20) {
    return 'Clear sky with warm golden tones';
  }
  return 'Clear blue sky with some natural cloud formations';
}