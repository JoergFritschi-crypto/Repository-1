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
  
  // Extract surrounding features
  const surroundingFeatures = layoutData.surroundings ? layoutData.surroundings.map((feature: any) => ({
    type: feature.type || 'landscape',
    position: feature.position || { x: 50, y: 0 },
    dimensions: feature.dimensions || { width: 100, height: 50 },
    description: feature.description || 'natural countryside transition'
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
export function buildPhotorealizationPrompt(context: PhotorealizationContext): string {
  const { garden, plants, sceneState, geometry, environment, lighting } = context;

  // Calculate garden dimensions
  const dimensions = calculateActualDimensions(garden);

  const prompt = `
=== PHOTOREALISTIC GARDEN VISUALIZATION ===

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

BOTANICAL SPECIMEN LIST (HERBARIUM-QUALITY IDENTIFICATION - JULY):
${plants.map((plant, idx) => {
  const botanicalDetails = getBotanicalMorphology(plant.scientificName, plant.commonName);
  return `
Specimen ${idx + 1}: ${plant.scientificName} [common: ${plant.commonName}]
  CRITICAL IDENTIFICATION: ${botanicalDetails}
  Position: (${plant.position.x.toFixed(1)}%, ${plant.position.y.toFixed(1)}%) = (${((plant.position.x * geometry.coordinateSystem.bounds.width) / 100).toFixed(1)}m, ${((plant.position.y * geometry.coordinateSystem.bounds.height) / 100).toFixed(1)}m)
  Mature size: ${plant.size.height.toFixed(1)}m tall × ${plant.size.spread.toFixed(1)}m spread
  Growth type: ${plant.type}, ${plant.foliage}
  July phenology: ${plant.seasonalState}
  Flowering status: ${plant.bloomStatus}
  Cultivation state: ${plant.maintenanceState}`;
}).join('')}

SURROUNDINGS:
- Context: ${environment.surroundings}
- Beyond garden: Natural countryside transition
- Horizon line: Soft, natural landscape extending to distance
- No artificial structures unless specified

OUTPUT STYLE:
- Botanical specimen photography - Royal Horticultural Society standard
- Professional landscape architecture with botanical accuracy
- Herbarium-quality plant identification - each species clearly recognizable
- Natural color palette for July in ${garden.location || 'temperate climate'}
- Botanical garden photography aesthetic - educational quality
- Sharp botanical detail: visible leaf venation, accurate flower structure, correct growth habit
- Scientific accuracy: authentic plant morphology, no artistic interpretation
- Reference: Chelsea Flower Show photography, Kew Gardens documentation

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

CRITICAL BOTANICAL CONSTRAINTS - SPECIES ACCURACY:
${getExcludedSpeciesForPlants(plants)}
- NO generic "garden plants" - each plant must be its EXACT scientific species
- NO hybrid interpretations - pure species characteristics only
- NO mixing plant features - maintain distinct species identity
- NO seasonal confusion - July appearance only, no spring bulbs or autumn colors
- MANDATORY: Each plant must be identifiable by a botanist to genus and species level

Create a botanically accurate photorealistic garden documentation image that meets scientific identification standards. This should look like it was photographed for a botanical journal or RHS plant identification guide in July. Each plant specimen must be recognizable to its exact scientific species with correct morphological features - as if being documented for a botanical survey. Maintain absolute fidelity to the specified plant list, exact positions, and July seasonal phenology. Think herbarium-quality accuracy in a garden setting.
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

/**
 * Get detailed botanical morphology for a plant
 */
function getBotanicalMorphology(scientificName: string, commonName: string): string {
  const botanicalDescriptions: Record<string, string> = {
    'Hosta sieboldiana': 'Large broad ovate leaves with prominent parallel venation, blue-green color, clumping herbaceous perennial, NO flower spikes in July',
    'Hosta plantaginea': 'Large heart-shaped leaves, glossy green, deep parallel veins, thick texture, mounding habit, fragrant white flowers if blooming',
    'Rosa': 'Compound pinnate leaves with 5-7 leaflets, serrated margins, thorny stems, shrub form',
    'Rosa × damascena': 'Compound leaves, thorny canes, double flowers if blooming, bushy shrub habit',
    'Lavandula angustifolia': 'Linear gray-green leaves, opposite arrangement, aromatic, purple flower spikes on square stems, compact shrub',
    'Lavandula': 'Narrow silvery-gray leaves, Mediterranean shrub, upright purple flower spikes, woody base',
    'Acer palmatum': 'Palmate leaves with 5-7 pointed lobes, opposite leaf arrangement, small tree form, smooth gray bark',
    'Helianthus': 'Large rough-textured ovate leaves, tall upright stems, large daisy-like flowers with brown centers',
    'Helianthus maximiliani': 'Narrow lanceolate leaves, tall prairie perennial, multiple yellow flowers along stem'
  };
  
  // Try exact match first
  if (botanicalDescriptions[scientificName]) {
    return botanicalDescriptions[scientificName];
  }
  
  // Try genus match
  const genus = scientificName.split(' ')[0];
  if (botanicalDescriptions[genus]) {
    return botanicalDescriptions[genus];
  }
  
  // Default botanical description based on common name patterns
  if (commonName.toLowerCase().includes('hosta')) {
    return 'Large broad leaves with parallel venation, clumping perennial habit, shade garden plant';
  } else if (commonName.toLowerCase().includes('rose')) {
    return 'Compound pinnate leaves, thorny stems, shrub form with showy flowers';
  } else if (commonName.toLowerCase().includes('lavender')) {
    return 'Narrow gray-green aromatic leaves, upright flower spikes, Mediterranean shrub';
  } else if (commonName.toLowerCase().includes('maple')) {
    return 'Palmate lobed leaves, opposite arrangement, tree or large shrub form';
  }
  
  return 'Botanically accurate representation with species-specific leaf shape and growth habit';
}

/**
 * Get list of excluded species to prevent confusion
 */
function getExcludedSpeciesForPlants(plants: PlantSeasonalData[]): string {
  const exclusions: string[] = [];
  
  plants.forEach(plant => {
    if (plant.scientificName.includes('Hosta')) {
      exclusions.push('- NO Hydrangea, NO Brunnera, NO Ligularia - show TRUE Hosta with parallel-veined leaves');
    }
    if (plant.scientificName.includes('Rosa')) {
      exclusions.push('- NO Paeonia (peony), NO Camellia, NO Hibiscus - show TRUE Rosa with compound leaves and thorns');
    }
    if (plant.scientificName.includes('Lavandula')) {
      exclusions.push('- NO Salvia, NO Perovskia, NO ornamental grasses - show TRUE Lavandula with gray-green narrow leaves');
    }
    if (plant.scientificName.includes('Acer')) {
      exclusions.push('- NO Liquidambar, NO Platanus - show TRUE Acer palmatum with palmate leaves');
    }
  });
  
  return Array.from(new Set(exclusions)).join('\n');
}