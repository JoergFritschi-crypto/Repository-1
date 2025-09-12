/**
 * Comprehensive test for GardenScene3D conversion functions
 * Validates mathematical accuracy of 2D to 3D transformations
 */

import {
  Vector3D,
  GardenBounds,
  PlantInstance3D,
  CameraParameters,
  LightingParameters,
  GardenScene3D,
  PlacedPlant,
  Plant,
  convertCanvasToWorld,
  createGardenBounds,
  createCameraParameters,
  createLightingParameters,
  convertPlantTo3D,
  createGardenScene3D
} from './shared/schema';

// Test data simulating a real garden design
const testGardenData = {
  gardenId: 'test-garden-1',
  gardenName: 'Test Cottage Garden',
  shape: 'rectangle',
  dimensions: { width: 10, height: 8 }, // 10m x 8m
  units: 'metric' as const,
  orientationSettings: {
    cardinalRotation: 45, // North rotated 45 degrees clockwise
    viewerRotation: 135   // Viewing from northeast
  },
  environmentSettings: {
    season: 'summer' as const,
    timeOfDay: 14, // 2 PM
    slopePercentage: 5,
    slopeDirection: 'S',
    latitude: 51.5 // London latitude
  }
};

const testPlants: Plant[] = [
  {
    id: 'plant-1',
    commonName: 'English Lavender',
    scientificName: 'Lavandula angustifolia',
    genus: 'Lavandula',
    species: 'angustifolia',
    family: 'Lamiaceae',
    type: 'perennial',
    heightMinCm: 40,
    heightMaxCm: 80,
    spreadMinCm: 30,
    spreadMaxCm: 60,
    flowerColor: JSON.stringify(['purple']),
    leafColor: JSON.stringify(['green']),
    // ... other required fields with defaults
    perenualId: null,
    externalId: null,
    cultivar: null,
    dimension: null,
    heightMinInches: null,
    heightMaxInches: null,
    spreadMinInches: null,
    spreadMaxInches: null,
    cycle: null,
    foliage: null,
    hardiness: null,
    hardinessLocation: null,
    sunlight: null,
    soil: null,
    soilPH: null,
    watering: null,
    wateringGeneralBenchmark: null,
    wateringPeriod: null,
    depthWaterRequirement: null,
    volumeWaterRequirement: null,
    growthRate: null,
    droughtTolerant: false,
    saltTolerant: false,
    thorny: false,
    tropical: false,
    invasive: false,
    indoor: false,
    careLevel: null,
    maintenance: null,
    baseAvailabilityScore: null,
    cultivationDifficulty: null,
    propagationMethod: null,
    commercialProduction: null,
    climateAdaptability: null,
    regionalAvailability: null,
    leaf: null,
    floweringSeason: null,
    fruitColor: null,
    harvestSeason: null,
    bloomStartMonth: null,
    bloomEndMonth: null,
    toxicityCategory: 'low',
    toxicityToHumans: 'low',
    toxicityToPets: 'low',
    toxicityNotes: null,
    childSafe: true,
    petSafe: true,
    edibleFruit: false,
    edibleLeaf: false,
    cuisine: false,
    medicinal: false,
    poisonousToHumans: 0,
    poisonousToPets: 0,
    attracts: null,
    propagation: null,
    resistance: null,
    problem: null,
    pruningMonth: null,
    pruningCount: null,
    seeds: null,
    pestSusceptibility: null,
    pestSusceptibilityApi: null,
    description: null,
    careGuides: null,
    thumbnailImage: null,
    fullImage: null,
    detailImage: null,
    imageGenerationStatus: 'pending',
    imageGenerationStartedAt: null,
    imageGenerationCompletedAt: null,
    isPublic: true,
    needsReview: false,
    pendingUser: null,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'plant-2',
    commonName: 'Japanese Maple',
    scientificName: 'Acer palmatum',
    genus: 'Acer',
    species: 'palmatum',
    family: 'Sapindaceae',
    type: 'tree',
    heightMinCm: 200,
    heightMaxCm: 500,
    spreadMinCm: 150,
    spreadMaxCm: 400,
    flowerColor: JSON.stringify(['red']),
    leafColor: JSON.stringify(['red', 'green']),
    // ... other required fields with defaults
    perenualId: null,
    externalId: null,
    cultivar: null,
    dimension: null,
    heightMinInches: null,
    heightMaxInches: null,
    spreadMinInches: null,
    spreadMaxInches: null,
    cycle: null,
    foliage: null,
    hardiness: null,
    hardinessLocation: null,
    sunlight: null,
    soil: null,
    soilPH: null,
    watering: null,
    wateringGeneralBenchmark: null,
    wateringPeriod: null,
    depthWaterRequirement: null,
    volumeWaterRequirement: null,
    growthRate: null,
    droughtTolerant: false,
    saltTolerant: false,
    thorny: false,
    tropical: false,
    invasive: false,
    indoor: false,
    careLevel: null,
    maintenance: null,
    baseAvailabilityScore: null,
    cultivationDifficulty: null,
    propagationMethod: null,
    commercialProduction: null,
    climateAdaptability: null,
    regionalAvailability: null,
    leaf: null,
    floweringSeason: null,
    fruitColor: null,
    harvestSeason: null,
    bloomStartMonth: null,
    bloomEndMonth: null,
    toxicityCategory: 'low',
    toxicityToHumans: 'low',
    toxicityToPets: 'low',
    toxicityNotes: null,
    childSafe: true,
    petSafe: true,
    edibleFruit: false,
    edibleLeaf: false,
    cuisine: false,
    medicinal: false,
    poisonousToHumans: 0,
    poisonousToPets: 0,
    attracts: null,
    propagation: null,
    resistance: null,
    problem: null,
    pruningMonth: null,
    pruningCount: null,
    seeds: null,
    pestSusceptibility: null,
    pestSusceptibilityApi: null,
    description: null,
    careGuides: null,
    thumbnailImage: null,
    fullImage: null,
    detailImage: null,
    imageGenerationStatus: 'pending',
    imageGenerationStartedAt: null,
    imageGenerationCompletedAt: null,
    isPublic: true,
    needsReview: false,
    pendingUser: null,
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

const testPlacedPlants: PlacedPlant[] = [
  {
    id: 'placed-1',
    plantId: 'plant-1',
    plantName: 'English Lavender',
    scientificName: 'Lavandula angustifolia',
    x: 25, // 25% from left edge
    y: 75, // 75% from top edge
    quantity: 3,
    plantType: 'perennial',
    flowerColor: 'purple'
  },
  {
    id: 'placed-2',
    plantId: 'plant-2',
    plantName: 'Japanese Maple',
    scientificName: 'Acer palmatum',
    x: 75, // 75% from left edge
    y: 25, // 25% from top edge
    quantity: 1,
    plantType: 'tree',
    flowerColor: 'red'
  }
];

// Test utilities
function assertVector3D(vector: Vector3D, expected: { x: number, y: number, z: number }, tolerance = 0.01) {
  if (Math.abs(vector.x - expected.x) > tolerance ||
      Math.abs(vector.y - expected.y) > tolerance ||
      Math.abs(vector.z - expected.z) > tolerance) {
    throw new Error(`Vector3D assertion failed: expected ${JSON.stringify(expected)}, got ${JSON.stringify(vector)}`);
  }
  console.log(`✓ Vector3D test passed: ${JSON.stringify(vector)}`);
}

function assertNumber(actual: number, expected: number, tolerance = 0.01, label = 'Number') {
  if (Math.abs(actual - expected) > tolerance) {
    throw new Error(`${label} assertion failed: expected ${expected}, got ${actual}`);
  }
  console.log(`✓ ${label} test passed: ${actual}`);
}

// Test functions
function testCoordinateConversion() {
  console.log('\n=== Testing Coordinate Conversion ===');
  
  // Create garden bounds for a 10m x 8m rectangle
  const bounds = createGardenBounds('rectangle', { width: 10, height: 8 }, 'metric');
  
  console.log('Garden bounds:', bounds);
  
  // Test bounds creation
  assertNumber(bounds.minX, -5, 0.01, 'MinX'); // -width/2
  assertNumber(bounds.maxX, 5, 0.01, 'MaxX');  // +width/2
  assertNumber(bounds.minY, -4, 0.01, 'MinY'); // -height/2
  assertNumber(bounds.maxY, 4, 0.01, 'MaxY');  // +height/2
  
  // Test coordinate conversion
  // Center of canvas (50%, 50%) should map to world center (0, 0)
  const centerWorld = convertCanvasToWorld(50, 50, bounds);
  assertVector3D(centerWorld, { x: 0, y: 0, z: 0 });
  
  // Top-left corner (0%, 0%) should map to (-5, 4)
  const topLeft = convertCanvasToWorld(0, 0, bounds);
  assertVector3D(topLeft, { x: -5, y: 4, z: 0 });
  
  // Bottom-right corner (100%, 100%) should map to (5, -4)
  const bottomRight = convertCanvasToWorld(100, 100, bounds);
  assertVector3D(bottomRight, { x: 5, y: -4, z: 0 });
  
  // Test grid snapping (should snap to 10cm = 0.1m precision)
  const unsnapped = convertCanvasToWorld(23.7, 67.3, bounds, false);
  const snapped = convertCanvasToWorld(23.7, 67.3, bounds, true);
  
  console.log('Unsnapped position:', unsnapped);
  console.log('Snapped position:', snapped);
  
  // Check that snapped coordinates are multiples of 0.1 (handle floating point precision)
  const xRemainder = Math.abs((snapped.x * 10) % 1);
  const yRemainder = Math.abs((snapped.y * 10) % 1);
  const tolerance = 0.01; // More lenient tolerance for floating point
  
  if (xRemainder > tolerance && xRemainder < (1 - tolerance) ||
      yRemainder > tolerance && yRemainder < (1 - tolerance)) {
    throw new Error(`Grid snapping failed: x remainder ${xRemainder}, y remainder ${yRemainder}`);
  }
  console.log('✓ Grid snapping test passed');
}

function testDifferentShapes() {
  console.log('\n=== Testing Different Garden Shapes ===');
  
  // Test circle
  const circleBounds = createGardenBounds('circle', { radius: 5 }, 'metric');
  assertNumber(circleBounds.boundaryGeometry.radius!, 5, 0.01, 'Circle radius');
  
  // Test oval
  const ovalBounds = createGardenBounds('oval', { width: 8, height: 6 }, 'metric');
  assertNumber(ovalBounds.boundaryGeometry.radiusX!, 4, 0.01, 'Oval radiusX');
  assertNumber(ovalBounds.boundaryGeometry.radiusY!, 3, 0.01, 'Oval radiusY');
  
  // Test L-shaped
  const lBounds = createGardenBounds('l_shaped', { 
    mainWidth: 20, 
    mainLength: 30, 
    cutoutWidth: 10, 
    cutoutLength: 15 
  }, 'metric');
  
  if (!lBounds.boundaryGeometry.vertices || lBounds.boundaryGeometry.vertices.length !== 6) {
    throw new Error('L-shaped garden should have 6 vertices');
  }
  console.log('✓ L-shaped garden vertices created');
  
  // Test imperial to metric conversion
  const imperialBounds = createGardenBounds('rectangle', { width: 30, height: 20 }, 'imperial');
  // 30 feet = 9.144m, 20 feet = 6.096m
  assertNumber(imperialBounds.maxX - imperialBounds.minX, 30 * 0.3048, 0.01, 'Imperial width conversion');
  assertNumber(imperialBounds.maxY - imperialBounds.minY, 20 * 0.3048, 0.01, 'Imperial height conversion');
}

function testCameraParameters() {
  console.log('\n=== Testing Camera Parameters ===');
  
  const bounds = createGardenBounds('rectangle', { width: 10, height: 8 }, 'metric');
  
  // Test camera positioning with different rotations
  const camera1 = createCameraParameters(0, 0, bounds); // North = 0°, viewing from south
  const camera2 = createCameraParameters(0, 90, bounds); // North = 0°, viewing from west
  const camera3 = createCameraParameters(45, 135, bounds); // North = 45°, viewing from northeast
  
  console.log('Camera 1 (south view):', camera1.position);
  console.log('Camera 2 (west view):', camera2.position);
  console.log('Camera 3 (northeast view):', camera3.position);
  
  // Camera should always look at garden center
  assertVector3D(camera1.target, bounds.center);
  assertVector3D(camera2.target, bounds.center);
  assertVector3D(camera3.target, bounds.center);
  
  // Camera should be at viewing distance from center
  const distance1 = Math.sqrt(
    Math.pow(camera1.position.x - bounds.center.x, 2) +
    Math.pow(camera1.position.y - bounds.center.y, 2)
  );
  assertNumber(distance1, 15, 0.1, 'Camera distance');
  
  // Test FOV calculation based on garden size
  assertNumber(camera1.fov, 35, 10, 'Camera FOV'); // Should be reasonable FOV
}

function testLightingParameters() {
  console.log('\n=== Testing Lighting Parameters ===');
  
  // Test lighting with different cardinal rotations and times
  const lighting1 = createLightingParameters(0, 12, 'summer', 45); // Noon, summer, 45° latitude
  const lighting2 = createLightingParameters(45, 14, 'winter', 51.5); // 2 PM, winter, London
  
  console.log('Lighting 1 (noon summer):', lighting1.sun);
  console.log('Lighting 2 (2 PM winter):', lighting2.sun);
  
  // Sun should be high at noon in summer
  if (lighting1.sun.position.z <= 0) {
    throw new Error('Sun should be above horizon at noon in summer');
  }
  
  // Sun intensity should be higher at noon than 2 PM
  if (lighting1.sun.intensity <= lighting2.sun.intensity) {
    console.log('Warning: Sun intensity may not be correctly calculated');
  }
  
  // Cardinal rotation should affect sun position
  if (lighting1.sun.position.x === lighting2.sun.position.x && 
      lighting1.sun.position.y === lighting2.sun.position.y) {
    throw new Error('Cardinal rotation should affect sun position');
  }
  
  console.log('✓ Lighting parameters test passed');
}

function testPlantConversion() {
  console.log('\n=== Testing Plant Conversion ===');
  
  const bounds = createGardenBounds('rectangle', { width: 10, height: 8 }, 'metric');
  const placedPlant = testPlacedPlants[0]; // Lavender at 25%, 75%
  const plant = testPlants[0];
  
  const plant3D = convertPlantTo3D(placedPlant, plant, bounds, 'summer', 'mature');
  
  console.log('Plant 3D conversion:', plant3D);
  
  // Check position conversion
  const expectedWorldPos = convertCanvasToWorld(placedPlant.x, placedPlant.y, bounds);
  assertVector3D(plant3D.position, expectedWorldPos);
  
  // Check dimension conversion from cm to meters
  assertNumber(plant3D.dimensions.heightMin, 0.4, 0.01, 'Height min (0.4m from 40cm)');
  assertNumber(plant3D.dimensions.heightMax, 0.8, 0.01, 'Height max (0.8m from 80cm)');
  assertNumber(plant3D.dimensions.spreadMin, 0.3, 0.01, 'Spread min (0.3m from 30cm)');
  assertNumber(plant3D.dimensions.spreadMax, 0.6, 0.01, 'Spread max (0.6m from 60cm)');
  
  // Check that current dimensions are within min/max ranges
  if (plant3D.dimensions.heightCurrent < plant3D.dimensions.heightMin ||
      plant3D.dimensions.heightCurrent > plant3D.dimensions.heightMax) {
    throw new Error('Current height should be within min/max range');
  }
  
  console.log('✓ Plant conversion test passed');
}

function testCompleteSceneCreation() {
  console.log('\n=== Testing Complete Scene Creation ===');
  
  const scene = createGardenScene3D({
    ...testGardenData,
    placedPlants: testPlacedPlants,
    plants: testPlants
  });
  
  console.log('Complete scene created');
  console.log('Scene bounds:', scene.bounds);
  console.log('Scene plants count:', scene.plants.length);
  console.log('Scene camera:', scene.camera.position);
  console.log('Scene lighting:', scene.lighting.sun);
  
  // Validate scene structure
  if (scene.plants.length !== testPlacedPlants.length) {
    throw new Error('Scene should have same number of plants as placed plants');
  }
  
  if (!scene.gardenId || !scene.gardenName) {
    throw new Error('Scene should have garden identification');
  }
  
  if (!scene.bounds || !scene.camera || !scene.lighting || !scene.terrain) {
    throw new Error('Scene should have all required components');
  }
  
  if (!scene.originalData || !scene.originalData.placedPlants) {
    throw new Error('Scene should preserve original 2D data');
  }
  
  console.log('✓ Complete scene creation test passed');
  
  // Log some key measurements for verification
  console.log('\n=== Key Measurements for Verification ===');
  console.log(`Garden dimensions: ${testGardenData.dimensions.width}m x ${testGardenData.dimensions.height}m`);
  console.log(`Garden bounds: X(${scene.bounds.minX}, ${scene.bounds.maxX}), Y(${scene.bounds.minY}, ${scene.bounds.maxY})`);
  console.log(`Lavender position: Canvas(${testPlacedPlants[0].x}%, ${testPlacedPlants[0].y}%) → World(${scene.plants[0].position.x}m, ${scene.plants[0].position.y}m)`);
  console.log(`Japanese Maple position: Canvas(${testPlacedPlants[1].x}%, ${testPlacedPlants[1].y}%) → World(${scene.plants[1].position.x}m, ${scene.plants[1].position.y}m)`);
  console.log(`Camera viewing from: (${scene.camera.position.x.toFixed(2)}m, ${scene.camera.position.y.toFixed(2)}m, ${scene.camera.position.z.toFixed(2)}m)`);
  console.log(`Sun position: (${scene.lighting.sun.position.x.toFixed(0)}m, ${scene.lighting.sun.position.y.toFixed(0)}m, ${scene.lighting.sun.position.z.toFixed(0)}m)`);
}

// Run all tests
function runAllTests() {
  console.log('🧪 Starting Garden Scene 3D Conversion Tests');
  console.log('=====================================');
  
  try {
    testCoordinateConversion();
    testDifferentShapes();
    testCameraParameters();
    testLightingParameters();
    testPlantConversion();
    testCompleteSceneCreation();
    
    console.log('\n🎉 All tests passed! The GardenScene3D schema is mathematically sound.');
    console.log('=====================================');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    console.log('=====================================');
    throw error;
  }
}

// Export for use in other modules
export {
  runAllTests,
  testGardenData,
  testPlants,
  testPlacedPlants
};

// Run tests immediately when this file is executed
runAllTests();