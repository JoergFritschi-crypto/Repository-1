import { generateImage } from './server/generateImage.js';

async function testProduction() {
  console.log('Testing Production Image Generator with SDXL Turbo...\n');
  
  const plants = [
    'English Lavender',
    'Japanese Maple',
    'White Rose'
  ];
  
  for (const plant of plants) {
    try {
      const startTime = Date.now();
      console.log(`Generating ${plant}...`);
      
      const imagePath = await generateImage({
        prompt: `${plant} botanical garden plant`,
        aspectRatio: '1:1',
        oneLine: plant
      });
      
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      
      // Verify file size
      const fs = await import('fs/promises');
      const stats = await fs.stat('client/public' + imagePath);
      const sizeKB = (stats.size / 1024).toFixed(1);
      
      if (stats.size > 50000) {
        console.log(`✅ ${plant}: Real image (${sizeKB} KB) in ${elapsed}s`);
      } else if (stats.size > 10000) {
        console.log(`⚠️ ${plant}: Small image (${sizeKB} KB) in ${elapsed}s`);
      } else {
        console.log(`❌ ${plant}: Failed (${sizeKB} KB)`);
      }
    } catch (error) {
      console.error(`❌ ${plant}: ${error.message}`);
    }
  }
}

testProduction().catch(console.error);
