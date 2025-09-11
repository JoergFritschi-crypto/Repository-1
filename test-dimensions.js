// Test script for dimension parsing utilities
import { parseDimension, parsePlantDimensions, validatePlantData } from './server/dimensionUtils.js';

console.log('Testing Dimension Parsing Utilities\n');
console.log('====================================\n');

// Test various dimension formats
const testCases = [
  '5-10 cm',
  '0.3-0.9 m',
  'bis 50 cm',
  'ca. 30 cm',
  '12-18 inches',
  '2 ft',
  '1.5-3 m',
  '30-40 cm'
];

console.log('1. Testing parseDimension function:');
testCases.forEach(test => {
  const result = parseDimension(test);
  console.log(`  "${test}" => `, result);
});

console.log('\n2. Testing parsePlantDimensions with German data:');
const germanPlant = {
  height: '5-10 cm',
  spread: '30-40 cm'
};
const germanResult = parsePlantDimensions(germanPlant);
console.log('  Input:', germanPlant);
console.log('  Output:', germanResult);

console.log('\n3. Testing parsePlantDimensions with Perenual format:');
const perenualPlant = {
  dimension: {
    height: { min: 0.05, max: 0.1 },  // meters
    spread: { min: 0.3, max: 0.4 }    // meters
  }
};
const perenualResult = parsePlantDimensions(perenualPlant);
console.log('  Input:', perenualPlant);
console.log('  Output:', perenualResult);

console.log('\n4. Testing data validation:');
const plantWithWrongData = {
  scientific_name: 'Helianthus maximiliani',
  common_name: 'Maximilian Sunflower',
  sunlight: 'This is a tall perennial sunflower that grows in full sun and needs moderate water',
  description: 'Maximilian Sunflower'
};
const validation = validatePlantData(plantWithWrongData);
console.log('  Plant with wrong field mappings:');
console.log('    sunlight:', plantWithWrongData.sunlight);
console.log('    description:', plantWithWrongData.description);
console.log('  Validation result:', validation);

console.log('\n5. Testing correct data:');
const correctPlant = {
  scientific_name: 'Helianthus maximiliani',
  common_name: 'Maximilian Sunflower',
  sunlight: ['full sun'],
  description: 'A tall, native perennial sunflower with bright yellow flowers that bloom in late summer and fall. Forms dense colonies and provides excellent wildlife habitat.',
  heightMinCm: 150,
  heightMaxCm: 300,
  spreadMinCm: 90,
  spreadMaxCm: 120
};
const correctValidation = validatePlantData(correctPlant);
console.log('  Correctly formatted plant:');
console.log('    sunlight:', correctPlant.sunlight);
console.log('    description:', correctPlant.description.substring(0, 50) + '...');
console.log('    height: ', correctPlant.heightMinCm + '-' + correctPlant.heightMaxCm + ' cm');
console.log('    spread: ', correctPlant.spreadMinCm + '-' + correctPlant.spreadMaxCm + ' cm');
console.log('  Validation result:', correctValidation);

console.log('\n====================================');
console.log('Testing Complete!');