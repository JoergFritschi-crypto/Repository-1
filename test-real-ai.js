import { generateImage } from './server/generateImage.js';

async function testRealAI() {
  console.log('Testing REAL AI image generation (no fake images)...\n');
  
  try {
    const startTime = Date.now();
    const imagePath = await generateImage({
      prompt: 'Red Rose flower in botanical garden, Rosa species',
      aspectRatio: '1:1',
      oneLine: 'Red Garden Rose'
    });
    
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\n✅ Generated in ${elapsed} seconds: ${imagePath}`);
    
    // Verify it's a real image
    const fs = await import('fs/promises');
    const stats = await fs.stat('client/public' + imagePath);
    const sizeKB = (stats.size / 1024).toFixed(1);
    
    console.log(`File size: ${sizeKB} KB`);
    
    if (stats.size > 50000) {
      console.log('✅ SUCCESS: This is a REAL AI-generated image (>50KB)');
    } else {
      console.log('❌ FAILURE: This might not be a real photo');
    }
  } catch (error) {
    console.error('❌ REAL ERROR (no fake fallbacks):', error.message);
  }
}

testRealAI();
