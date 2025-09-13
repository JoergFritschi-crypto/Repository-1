// Test script to verify the enhanced prompt length
import { buildPhotorealizationPrompt } from './photorealizationService';
import type { PhotorealizationContext } from './photorealizationService';

// Create a sample context with a few plants
const testContext: PhotorealizationContext = {
  garden: {
    id: 'test-garden',
    userId: 'test-user',
    name: 'Test Garden',
    shape: 'rectangle',
    dimensions: { width: 4, length: 3 },
    location: 'Temperate',
    sunExposure: 'full sun',
    soilType: 'loam',
    waterAvailability: 'moderate',
    maintenanceLevel: 'moderate',
    style: 'cottage',
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    northOrientation: 'N',
    slopePercentage: null,
    slopeDirection: null,
    layout_data: {}
  },
  plants: [
    {
      commonName: 'English Lavender',
      scientificName: 'Lavandula angustifolia',
      cultivar: 'Hidcote',
      position: { x: 25, y: 30 },
      size: { height: 0.45, spread: 0.5 },
      seasonalState: 'at peak summer growth, full dense foliage, vibrant green color',
      type: 'shrub',
      foliage: 'evergreen',
      bloomStatus: 'actively flowering, showing peak blooms',
      maintenanceState: 'well-maintained, recently weeded around base, mulched if appropriate'
    },
    {
      commonName: 'Hosta',
      scientificName: 'Hosta sieboldiana',
      cultivar: 'Sum and Substance',
      position: { x: 75, y: 20 },
      size: { height: 0.9, spread: 1.2 },
      seasonalState: 'at full summer maturity, lush healthy growth, peak seasonal form',
      type: 'perennial',
      foliage: 'deciduous',
      bloomStatus: 'in seasonal foliage phase',
      maintenanceState: 'well-maintained, recently weeded around base, mulched if appropriate'
    },
    {
      commonName: 'Red Rose',
      scientificName: 'Rosa hybrid',
      cultivar: 'Mister Lincoln',
      position: { x: 50, y: 60 },
      size: { height: 1.5, spread: 0.8 },
      seasonalState: 'at full summer maturity, lush healthy growth, peak seasonal form',
      type: 'shrub',
      foliage: 'deciduous',
      bloomStatus: 'actively flowering, showing peak blooms',
      maintenanceState: 'well-maintained, recently weeded around base, mulched if appropriate'
    },
    {
      commonName: 'Japanese Maple',
      scientificName: 'Acer palmatum',
      cultivar: null,
      position: { x: 85, y: 75 },
      size: { height: 2.0, spread: 1.8 },
      seasonalState: 'at peak summer growth, full dense foliage, vibrant green color',
      type: 'tree',
      foliage: 'deciduous',
      bloomStatus: 'in seasonal foliage phase',
      maintenanceState: 'well-maintained, recently weeded around base, mulched if appropriate'
    }
  ],
  sceneState: {
    camera: {
      position: { x: 0, y: 1.6, z: -4.5 },
      target: { x: 0, y: 0, z: 0 },
      fov: 35
    },
    lighting: {
      timeOfDay: 14,
      sunAngle: 120,
      shadowIntensity: 0.7
    },
    bounds: {
      width: 4,
      height: 3,
      depth: 5
    },
    season: 'summer',
    month: 7
  },
  geometry: {
    borders: [{
      type: 'polygon',
      coordinates: [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 100, y: 100 },
        { x: 0, y: 100 }
      ],
      thickness: 0.15,
      material: 'natural stone edging',
      height: 0.1,
      color: '#8B7355'
    }],
    paths: [],
    groundAreas: [{
      coordinates: [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 100, y: 100 },
        { x: 0, y: 100 }
      ],
      material: 'soil',
      color: '#8B4513',
      texture: 'rich dark topsoil with organic matter'
    }],
    surroundingFeatures: [],
    coordinateSystem: {
      origin: { x: 0, y: 0 },
      scale: 'percentage',
      bounds: { width: 4, height: 3 }
    }
  },
  environment: {
    surroundings: 'Soft, neutral background with gentle blur beyond garden boundaries',
    groundMaterial: 'Well-prepared loam soil, rich dark brown color',
    pathways: ['Natural grass stepping areas between planting zones'],
    borders: ['Natural garden bed edges']
  },
  lighting: {
    timeDescription: 'Midday (strong overhead sun)',
    sunPosition: 'High overhead position (summer solstice angle)',
    shadowDirection: 'Short shadows directly beneath plants',
    lightQuality: 'Bright, clear summer light'
  }
};

// Generate the prompt
const prompt = buildPhotorealizationPrompt(testContext);

// Display results
console.log('=== ENHANCED PROMPT LENGTH TEST ===\n');
console.log(`Total characters: ${prompt.length}`);
console.log(`Target range: 5000-6000 characters`);
console.log(`Status: ${prompt.length >= 5000 && prompt.length <= 6000 ? '✓ WITHIN TARGET RANGE' : prompt.length < 5000 ? '✗ TOO SHORT' : '✗ TOO LONG'}\n`);

// Show prompt sections
const sections = prompt.split(/\[([^\]]+)\]/g);
console.log('Prompt sections found:');
sections.forEach((section, i) => {
  if (i % 2 === 1) { // Section headers
    const nextSection = sections[i + 1] || '';
    console.log(`- [${section}]: ${nextSection.length} chars`);
  }
});

console.log('\n=== FIRST 500 CHARACTERS OF PROMPT ===');
console.log(prompt.substring(0, 500) + '...\n');

console.log('=== LAST 500 CHARACTERS OF PROMPT ===');
console.log('...' + prompt.substring(prompt.length - 500));

// Also test with different plant counts
console.log('\n=== TESTING WITH DIFFERENT PLANT COUNTS ===');
for (let plantCount of [1, 2, 5, 10]) {
  const testPlants = testContext.plants.slice(0, plantCount);
  const modifiedContext = { ...testContext, plants: testPlants };
  const testPrompt = buildPhotorealizationPrompt(modifiedContext);
  console.log(`${plantCount} plant(s): ${testPrompt.length} characters`);
}