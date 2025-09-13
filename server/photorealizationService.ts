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
  sceneState: SceneState,
  providedPlants?: any[] // Optional plants provided from frontend
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
      plant: placedPlant.plantDetails || {
        id: placedPlant.plantId,
        commonName: placedPlant.plantName || 'Unknown Plant',
        scientificName: placedPlant.scientificName || '',
        type: placedPlant.plantDetails?.type || 'perennial',
        heightMaxCm: placedPlant.plantDetails?.heightMaxCm || 60,
        spreadMaxCm: placedPlant.plantDetails?.spreadMaxCm || 40,
        foliage: placedPlant.plantDetails?.foliage || 'deciduous',
        flowerColors: placedPlant.plantDetails?.flowerColors || [],
        bloomTime: placedPlant.plantDetails?.bloomTime || [],
        sunExposure: placedPlant.plantDetails?.sunExposure || 'full sun',
        soilType: placedPlant.plantDetails?.soilType || 'well-drained',
        waterNeeds: placedPlant.plantDetails?.waterNeeds || 'moderate'
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
    
  // Log plant data for debugging
  console.log(`[Photorealization] Processing ${plantsData.length} plants for garden ${gardenId}:`, 
    plantsData.map(p => ({
      name: p.commonName,
      position: `(${p.position.x.toFixed(1)}%, ${p.position.y.toFixed(1)}%)`,
      size: `${p.size.height}m x ${p.size.spread}m`
    }))
  );

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

CRITICAL PLANT COUNT VERIFICATION:
- EXACT COUNT: ${plants.length} plants total - NO MORE, NO LESS
- SPECIES LIST: ${plants.map(p => p.commonName).join(', ')}
- VERIFICATION: Count exactly ${plants.length} distinct plants in final image
- NO background plants, NO filler vegetation, NO extras

BOTANICAL SPECIMEN LIST (HERBARIUM-QUALITY IDENTIFICATION - JULY):
${plants.map((plant, idx) => {
  const botanicalDetails = getBotanicalMorphology(plant.scientificName, plant.commonName);
  const plantNumber = idx + 1;
  const totalPlants = plants.length;
  return `
Specimen ${plantNumber} of ${totalPlants}: ${plant.scientificName} [common: ${plant.commonName}]
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

Create a botanically accurate photorealistic garden bed documentation image that meets scientific identification standards. Focus 90-95% on the garden bed itself with minimal, neutral background blur. This should look like it was photographed for a botanical journal or RHS plant identification guide in July, with shallow depth of field keeping attention on the plants. Each plant specimen must be recognizable to its exact scientific species with correct morphological features - as if being documented for a botanical survey. Maintain absolute fidelity to the specified plant list, exact positions, and July seasonal phenology. Think herbarium-quality accuracy in a garden setting with professional macro/portrait lens bokeh for the minimal background.
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
 * Get detailed botanical morphology for a plant
 */
function getBotanicalMorphology(scientificName: string, commonName: string): string {
  const botanicalDescriptions: Record<string, string> = {
    'Hosta sieboldiana': 'HOSTA: Large broad ovate leaves with prominent parallel venation, blue-green color, clumping herbaceous perennial forming dense mounds, smooth leaf texture, NO flower spikes in July, shade-tolerant plant',
    'Hosta plantaginea': 'HOSTA: Large heart-shaped leaves, glossy green, deep parallel veins, thick texture, mounding habit 60cm tall, fragrant white flowers if blooming',
    'Rosa': 'ROSE BUSH: Flowering shrub with RED or PINK FLOWERS (multiple blooms visible in July), compound pinnate leaves with 5-7 glossy leaflets, serrated margins, thorny green stems, bushy upright growth habit 1-2m tall, MUST show flowers',
    'Rosa × damascena': 'DAMASK ROSE: Bushy shrub with fragrant DOUBLE PINK FLOWERS, compound leaves with 5-7 leaflets, thorny canes, multiple blooms in July, 1.5m tall flowering bush',
    'Rosa rugosa': 'RUGOSA ROSE: Shrub with large SINGLE PINK/RED FLOWERS, wrinkled dark green compound leaves, very thorny stems, showing multiple blooms in July, robust bush form',
    'Rosa gallica': 'FRENCH ROSE: Compact shrub with DEEP PINK/RED FLOWERS, compound leaves, thorny stems, multiple fragrant blooms visible in July, bushy growth to 1.2m',
    'Lavandula angustifolia': 'ENGLISH LAVENDER: Linear gray-green leaves, opposite arrangement, aromatic, PURPLE flower spikes on square stems above foliage, compact Mediterranean shrub 60cm tall',
    'Lavandula': 'LAVENDER: Narrow silvery-gray leaves, Mediterranean shrub, upright PURPLE flower spikes rising above foliage, woody base, aromatic plant',
    'Acer palmatum': 'JAPANESE MAPLE: Palmate leaves with 5-7 pointed lobes, opposite leaf arrangement, small ornamental tree, smooth gray bark, graceful branching',
    'Helianthus': 'SUNFLOWER: Large rough-textured ovate leaves, tall upright stems, large daisy-like YELLOW flowers with brown centers, 2-3m tall',
    'Helianthus maximiliani': 'MAXIMILIAN SUNFLOWER: Narrow lanceolate leaves, tall prairie perennial, multiple YELLOW flowers along stem, 2.5m tall'
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
    return 'HOSTA: Large broad leaves with parallel venation, clumping perennial habit forming dense mounds, shade garden plant with smooth leaves';
  } else if (commonName.toLowerCase().includes('rose')) {
    return 'ROSE BUSH: FLOWERING shrub showing RED/PINK BLOOMS in July, compound pinnate leaves with 5-7 leaflets, thorny stems, bushy growth 1-2m tall, MUST display multiple flowers';
  } else if (commonName.toLowerCase().includes('lavender')) {
    return 'LAVENDER: Narrow gray-green aromatic leaves, upright PURPLE flower spikes rising above foliage, Mediterranean shrub 60cm tall';
  } else if (commonName.toLowerCase().includes('maple')) {
    return 'JAPANESE MAPLE: Palmate lobed leaves with 5-7 points, opposite arrangement, small ornamental tree or large shrub form';
  }
  
  return 'Botanically accurate representation with species-specific leaf shape and growth habit';
}

/**
 * Get list of excluded species to prevent confusion
 */
function getExcludedSpeciesForPlants(plants: PlantSeasonalData[]): string {
  const exclusions: string[] = [];
  
  // Add explicit plant count first
  exclusions.push(`- CRITICAL: Show EXACTLY ${plants.length} plants - no more, no less`);
  exclusions.push(`- PLANT COUNT VERIFICATION: ${plants.map(p => p.commonName).join(', ')} = ${plants.length} plants total`);
  exclusions.push('- DO NOT add background plants, filler plants, or any vegetation not explicitly listed');
  
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
  exclusions.push(`- FINAL CHECK: Count ${plants.length} distinct plants in image - no extras in background`);
  
  return Array.from(new Set(exclusions)).join('\n');
}