// AI Inpainting Service for Garden Visualization
// This is a proof of concept for using AI inpainting as an alternative to sprite compositing
import sharp from 'sharp';
import path from 'path';
import fs from 'fs/promises';
import GeminiAI from './geminiAI.js';
import { runwareService, runwareAI, runwareModels } from './runwareAI.js';

interface PlantInpaintRequest {
  plantName: string;
  x: number;  // Position in percentage (0-100)
  y: number;  // Position in percentage (0-100)
  size: 'small' | 'medium' | 'large';
  season?: string;
}

interface InpaintingOptions {
  baseImage: Buffer | string;  // Base garden image
  plants: PlantInpaintRequest[];
  season: string;
  style?: 'photorealistic' | 'artistic' | 'watercolor';
  approach: 'sequential' | 'batch';  // Sequential: add one plant at a time, Batch: all at once
}

export class AIInpaintingService {
  private geminiAI: GeminiAI | null = null;
  private outputDir: string;
  
  constructor() {
    // Only initialize Gemini if API key is available
    if (process.env.GEMINI_API_KEY) {
      this.geminiAI = new GeminiAI(process.env.GEMINI_API_KEY);
    }
    
    this.outputDir = path.join(process.cwd(), "client", "public", "inpainted-gardens");
  }
  
  // Create a base garden image with empty bed
  async createEmptyGardenBase(shape: string = 'rectangle', dimensions: any = { width: 10, height: 10 }): Promise<Buffer> {
    const width = 1920;
    const height = 1440;
    
    // Create a simple garden bed - just soil, no decorative elements
    const svg = `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <!-- Simple soil gradient -->
          <linearGradient id="soil" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" style="stop-color:#6b5d4f;stop-opacity:1" />
            <stop offset="50%" style="stop-color:#5d4e37;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#4a3f2f;stop-opacity:1" />
          </linearGradient>
          
          <!-- Soil texture pattern -->
          <pattern id="soilTexture" patternUnits="userSpaceOnUse" width="20" height="20">
            <rect width="20" height="20" fill="#5d4e37"/>
            <circle cx="5" cy="5" r="2" fill="#4a3f2f" opacity="0.3"/>
            <circle cx="15" cy="15" r="1.5" fill="#5C4033" opacity="0.4"/>
            <circle cx="10" cy="12" r="1" fill="#3E2723" opacity="0.3"/>
          </pattern>
        </defs>
        
        <!-- Full garden bed with stone frame -->
        <rect width="${width}" height="${height}" fill="#8B7D6B"/>
        
        <!-- Inner garden bed (10x10m) with stone border -->
        <rect x="${width * 0.1}" y="${height * 0.1}" 
              width="${width * 0.8}" height="${height * 0.8}" 
              fill="url(#soil)" 
              stroke="#696969" stroke-width="20"/>
        
        <!-- Add soil texture overlay to inner bed -->
        <rect x="${width * 0.1}" y="${height * 0.1}" 
              width="${width * 0.8}" height="${height * 0.8}" 
              fill="url(#soilTexture)" opacity="0.4"/>
        
        <!-- Stone border highlights -->
        <rect x="${width * 0.1}" y="${height * 0.1}" 
              width="${width * 0.8}" height="${height * 0.8}" 
              fill="none" 
              stroke="#A9A9A9" stroke-width="15" opacity="0.5"/>
      </svg>
    `;
    
    return sharp(Buffer.from(svg)).png().toBuffer();
  }
  
  // Generate mask for inpainting at specific location
  private async generateInpaintMask(
    imageWidth: number, 
    imageHeight: number,
    x: number, 
    y: number, 
    size: 'small' | 'medium' | 'large'
  ): Promise<Buffer> {
    // Size mapping for mask radius - calibrated for 10x10m garden at 800px
    // 10m = 800px, so 1m = 80px
    const sizeMap = {
      small: 0.015,   // ~12px = ~0.15m diameter (small herbs like lavender, hostas)
      medium: 0.08,   // ~64px = ~0.8m diameter (medium shrubs) 
      large: 0.2      // ~160px = ~2m diameter (mature trees)
    };
    
    const radius = imageWidth * sizeMap[size];
    const centerX = (x / 100) * imageWidth;
    const centerY = (y / 100) * imageHeight;
    
    // Create a circular mask
    const svg = `
      <svg width="${imageWidth}" height="${imageHeight}" xmlns="http://www.w3.org/2000/svg">
        <!-- Black background (keep original) -->
        <rect width="${imageWidth}" height="${imageHeight}" fill="black"/>
        <!-- White circle (area to inpaint) -->
        <circle cx="${centerX}" cy="${centerY}" r="${radius}" fill="white"/>
      </svg>
    `;
    
    return sharp(Buffer.from(svg)).png().toBuffer();
  }
  
  // Use AI to inpaint plants into the garden
  async inpaintGarden(options: InpaintingOptions): Promise<string> {
    console.log("🎨 Starting AI inpainting process...");
    await fs.mkdir(this.outputDir, { recursive: true });
    
    // Convert base image to buffer if it's a string path
    let baseBuffer: Buffer;
    if (typeof options.baseImage === 'string') {
      baseBuffer = await fs.readFile(options.baseImage);
    } else {
      baseBuffer = options.baseImage;
    }
    
    let currentImage = baseBuffer;
    const timestamp = Date.now();
    
    if (options.approach === 'sequential') {
      // Sequential approach: Add one plant at a time
      for (const plant of options.plants) {
        console.log(`  Adding ${plant.plantName} at position (${plant.x}, ${plant.y})`);
        currentImage = await this.inpaintSinglePlant(currentImage, plant, options);
      }
    } else {
      // Batch approach: Generate prompt for all plants at once
      currentImage = await this.inpaintAllPlants(currentImage, options);
    }
    
    // Save the final inpainted image
    const filename = `inpainted-garden-${options.approach}-${timestamp}.png`;
    const filepath = path.join(this.outputDir, filename);
    await sharp(currentImage).png().toFile(filepath);
    
    const publicUrl = `/inpainted-gardens/${filename}`;
    console.log(`✅ Inpainted garden saved to: ${publicUrl}`);
    
    return publicUrl;
  }
  
  // Inpaint a single plant using AI
  private async inpaintSinglePlant(
    imageBuffer: Buffer, 
    plant: PlantInpaintRequest,
    options: InpaintingOptions
  ): Promise<Buffer> {
    // True sequential inpainting using Runware's inpainting with mask
    const imageBase64 = imageBuffer.toString('base64');
    const imageMeta = await sharp(imageBuffer).metadata();
    
    // Generate mask for the plant position
    const maskBuffer = await this.generateInpaintMask(
      imageMeta.width || 1920,
      imageMeta.height || 1440,
      plant.x,
      plant.y,
      plant.size
    );
    const maskBase64 = maskBuffer.toString('base64');
    
    // Build inpainting prompt
    const seasonDesc = this.getSeasonDescription(plant.season || options.season);
    const depthDesc = plant.y < 30 ? "in the background" : 
                      plant.y > 70 ? "in the foreground" : "in the middle ground";
    
    // Add size descriptors calibrated for 10x10m garden
    const sizeDesc = plant.size === 'small' ? 'small, compact' :
                      plant.size === 'large' ? 'large, mature' :
                      'medium-sized';
    
    // Reference garden size in prompt for scale (10x10 meters)
    const scaleRef = plant.size === 'small' ? '20-30cm tall small plant' :
                      plant.size === 'large' ? '3-4 meter tall tree' :
                      '80cm-1 meter tall shrub';
    
    const prompt = `In a clearly defined 10x10 meter square garden bed with stone border framing, add ONE ${sizeDesc} ${plant.plantName} (${scaleRef}) ${depthDesc}, 
                    ${seasonDesc}, natural lighting, photorealistic, proper scale to stone-framed 10x10m bed,
                    single plant only, no duplicates, maintain correct proportions, show stone edge of bed`;
    
    try {
      console.log(`  Sequential: Adding ${plant.plantName} at (${plant.x}, ${plant.y})`);
      
      // Use Runware's inpainting with mask for true sequential addition
      const result = await runwareAI.imageInference({
        positivePrompt: prompt,
        negativePrompt: "cartoon, anime, illustration, multiple plants, duplicates, oversized, tiny, unrealistic scale",
        model: runwareModels.civitai_74407, // Photorealistic Vision model
        numberResults: 1,
        height: imageMeta.height || 1440,
        width: imageMeta.width || 1920,
        seedImage: `data:image/png;base64,${imageBase64}`,
        mask: `data:image/png;base64,${maskBase64}`,
        strength: 0.9,  // High strength for significant changes
        CFGScale: 12,
        steps: 40,
        seed: Math.floor(Math.random() * 1000000)
      });
      
      if (!result || result.length === 0) {
        throw new Error('No inpainting result generated');
      }
      
      // Download and return the inpainted image
      const imageUrl = result[0].imageURL || result[0].imageUrl || result[0].url;
      if (!imageUrl) {
        console.error('No image URL in result:', result[0]);
        throw new Error('No image URL found in result');
      }
      const response = await fetch(imageUrl);
      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
      
    } catch (error) {
      console.error(`Failed to inpaint ${plant.plantName}:`, error);
      return imageBuffer; // Return original on failure
    }
  }
  
  // Inpaint all plants at once
  private async inpaintAllPlants(
    imageBuffer: Buffer,
    options: InpaintingOptions
  ): Promise<Buffer> {
    const imageBase64 = imageBuffer.toString('base64');
    const imageMeta = await sharp(imageBuffer).metadata();
    
    // Generate a combined mask for all plant positions
    const maskBuffer = await this.generateCombinedMask(
      imageMeta.width || 1920,
      imageMeta.height || 1440,
      options.plants
    );
    const maskBase64 = maskBuffer.toString('base64');
    
    // Build comprehensive prompt for all plants with proper sizing
    const plantDescriptions = options.plants.map(plant => {
      const position = plant.x < 33 ? "left" : plant.x > 66 ? "right" : "center";
      const depth = plant.y < 33 ? "background" : plant.y > 66 ? "foreground" : "midground";
      
      // Add size descriptors calibrated for 10x10m garden
      const sizeDesc = plant.size === 'small' ? 'small' :
                       plant.size === 'large' ? 'large mature' :
                       'medium-sized';
      
      // Add specific height guidance for 10x10 meter garden scale
      const heightDesc = plant.size === 'small' ? '(20-30cm tall, very small)' :
                        plant.size === 'large' ? '(3-4 meters tall tree)' :
                        '(80cm tall)';
      
      return `ONE ${sizeDesc} ${plant.plantName} ${heightDesc} in the ${position} ${depth}`;
    }).join(", ");
    
    const seasonDesc = this.getSeasonDescription(options.season);
    const styleDesc = options.style === 'watercolor' ? "watercolor painting style" :
                      options.style === 'artistic' ? "artistic illustration" :
                      "photorealistic";
    
    const prompt = `A clearly defined 10x10 meter square garden bed with stone border framing, containing EXACTLY ${options.plants.length} plants: ${plantDescriptions}. 
                    ${seasonDesc}, ${styleDesc}, proper scale showing full 10x10m bed with stone edge, natural lighting and shadows, 
                    no duplicate plants, only the specified plants, ground level view showing entire bed with stone frame, photorealistic garden bed`;
    
    try {
      console.log(`  Batch: Adding ${options.plants.length} plants at once`);
      
      // Use Runware's inpainting with combined mask for batch addition
      const result = await runwareAI.imageInference({
        positivePrompt: prompt,
        negativePrompt: "cartoon, anime, illustration, duplicates, oversized plants, tiny plants, unrealistic scale, missing stone border",
        model: runwareModels.civitai_74407, // Photorealistic Vision model
        numberResults: 1,
        height: imageMeta.height || 1440,
        width: imageMeta.width || 1920,
        seedImage: `data:image/png;base64,${imageBase64}`,
        mask: `data:image/png;base64,${maskBase64}`,
        strength: 0.85,  // Slightly lower strength for batch to preserve more context
        CFGScale: 10,
        steps: 35,
        seed: Math.floor(Math.random() * 1000000)
      });
      
      if (!result || result.length === 0) {
        throw new Error('No batch inpainting result generated');
      }
      
      // Download and return the inpainted image
      const imageUrl = result[0].imageURL || result[0].imageUrl || result[0].url;
      if (!imageUrl) {
        console.error('No image URL in batch result:', result[0]);
        throw new Error('No image URL found in batch result');
      }
      const response = await fetch(imageUrl);
      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
      
    } catch (error) {
      console.error("Failed to inpaint all plants:", error);
      return imageBuffer;
    }
  }
  
  private getSeasonDescription(season: string): string {
    const seasonMap: Record<string, string> = {
      'spring': 'early spring with fresh growth',
      'summer': 'summer in full bloom',
      'fall': 'autumn with warm colors',
      'autumn': 'autumn with warm colors',
      'winter': 'winter with dormant plants'
    };
    
    return seasonMap[season.toLowerCase()] || 'lush garden';
  }
  
  // Get realistic plant size based on plant type
  // Generate combined mask for multiple plant positions
  private async generateCombinedMask(
    imageWidth: number, 
    imageHeight: number, 
    plants: PlantInpaintRequest[]
  ): Promise<Buffer> {
    // Size mapping for mask radius - calibrated for 10x10m garden at 800px
    const sizeMap = {
      small: 0.015,   // ~12px = ~0.15m diameter (small herbs like lavender, hostas)
      medium: 0.08,   // ~64px = ~0.8m diameter (medium shrubs) 
      large: 0.2      // ~160px = ~2m diameter (mature trees)
    };
    
    const svg = `
      <svg width="${imageWidth}" height="${imageHeight}" xmlns="http://www.w3.org/2000/svg">
        <rect width="${imageWidth}" height="${imageHeight}" fill="black"/>
        ${plants.map(plant => {
          const radius = imageWidth * sizeMap[plant.size];
          const centerX = (plant.x / 100) * imageWidth;
          const centerY = (plant.y / 100) * imageHeight;
          
          return `
            <circle cx="${centerX}" cy="${centerY}" r="${radius}" fill="white" opacity="0.9"/>
            <circle cx="${centerX}" cy="${centerY}" r="${radius * 0.8}" fill="white" opacity="1"/>
          `;
        }).join('')}
      </svg>
    `;
    
    return sharp(Buffer.from(svg)).png().toBuffer();
  }
  
  private getPlantSize(plantName: string): 'small' | 'medium' | 'large' {
    const name = plantName.toLowerCase();
    
    // Trees are large
    if (name.includes('maple') || name.includes('oak') || name.includes('tree')) {
      return 'large';
    }
    
    // Small plants (30-60cm) - including Hosta perennials
    if (name.includes('lavender') || name.includes('thyme') || name.includes('sage') || 
        name.includes('rosemary') || name.includes('herb') || name.includes('hosta')) {
      return 'small';  // Hostas are typically 40-60cm tall
    }
    
    // Everything else is medium (actual shrubs 1-1.5m tall)
    return 'medium';
  }
  
  // Comparison test between composite and inpainting
  async compareApproaches(): Promise<{
    composite: string;
    enhancedComposite: string;
    inpaintSequential: string;
    inpaintBatch: string;
    emptyBase: string;
  }> {
    console.log("🔬 Running comparison test between approaches...");
    
    // Test plants configuration with proper sizing
    const testPlants: PlantInpaintRequest[] = [
      {
        plantName: "Japanese Maple",
        x: 70,  // Right side
        y: 25,  // Background
        size: this.getPlantSize("Japanese Maple"), // Will be 'large'
        season: 'summer'
      },
      {
        plantName: "Hosta",
        x: 30,  // Left side
        y: 65,  // Foreground
        size: this.getPlantSize("Hosta"), // Will be 'medium'
        season: 'summer'
      },
      {
        plantName: "Lavender",
        x: 50,  // Center
        y: 45,  // Middle
        size: this.getPlantSize("Lavender"), // Will be 'small'
        season: 'summer'
      }
    ];
    
    // Create empty base for comparison
    const emptyBase = await this.createEmptyGardenBase();
    const timestamp = Date.now();
    const emptyPath = path.join(this.outputDir, `empty-base-${timestamp}.png`);
    await sharp(emptyBase).png().toFile(emptyPath);
    
    // 1. Use existing sprite compositor for mechanical approach
    const { spriteCompositor } = await import('./spriteCompositor.js');
    const compositeUrl = await spriteCompositor.testTwoPlantComposite();
    
    // 1b. ENHANCE the composite with AI to make it photorealistic - the magical step!
    let enhancedCompositeUrl = compositeUrl;
    try {
      // Read the composite image
      const compositePath = path.join(process.cwd(), "client", "public", compositeUrl);
      const compositeBuffer = await fs.readFile(compositePath);
      
      // Use the batch inpainting approach to transform the composite to photorealistic
      // This maintains positions while making plants look real
      console.log("🎨 Enhancing composite to photorealistic...");
      const enhancedBuffer = await this.inpaintAllPlants(compositeBuffer, {
        baseImage: compositeBuffer,
        plants: testPlants, // Plants are already in the image, this guides the enhancement
        season: 'summer',
        style: 'photorealistic',
        approach: 'batch'
      });
      
      // Save enhanced composite
      const enhancedFilename = `enhanced-composite-${timestamp}.png`;
      const enhancedPath = path.join(this.outputDir, enhancedFilename);
      await fs.writeFile(enhancedPath, enhancedBuffer);
      enhancedCompositeUrl = `/inpainted-gardens/${enhancedFilename}`;
      
      console.log("✅ Enhanced composite saved");
    } catch (error) {
      console.error("Failed to enhance composite:", error);
    }
    
    // 2. Sequential inpainting (one plant at a time)
    let sequentialUrl = await this.inpaintGarden({
      baseImage: emptyBase,
      plants: testPlants,
      season: 'summer',
      style: 'photorealistic',
      approach: 'sequential'
    });
    
    // 2b. ENHANCE the sequential result with the magical step!
    try {
      console.log("🎨 Enhancing sequential inpainting result...");
      const sequentialPath = path.join(process.cwd(), "client", "public", sequentialUrl);
      const sequentialBuffer = await fs.readFile(sequentialPath);
      
      // Apply the magical enhancement transformation
      const enhancedSequential = await runwareAI.imageInference({
        positivePrompt: "Photorealistic garden with plants, natural lighting, highly detailed, professional photography, vibrant colors, clear stone border frame, 10x10 meter garden bed",
        negativePrompt: "cartoon, anime, illustration, blurry, artifacts, low quality",
        model: runwareModels.civitai_74407,
        numberResults: 1,
        height: 1440,
        width: 1920,
        seedImage: `data:image/png;base64,${sequentialBuffer.toString('base64')}`,
        strength: 0.3,  // Lower strength to preserve plant positions
        CFGScale: 7,
        steps: 25
      });
      
      if (enhancedSequential && enhancedSequential.length > 0) {
        const imageUrl = enhancedSequential[0].imageURL || enhancedSequential[0].imageUrl || enhancedSequential[0].url;
        if (imageUrl) {
          const response = await fetch(imageUrl);
          const arrayBuffer = await response.arrayBuffer();
          const enhancedFilename = `enhanced-sequential-${timestamp}.png`;
          const enhancedPath = path.join(this.outputDir, enhancedFilename);
          await fs.writeFile(enhancedPath, Buffer.from(arrayBuffer));
          sequentialUrl = `/inpainted-gardens/${enhancedFilename}`;
          console.log("✅ Enhanced sequential result saved");
        }
      }
    } catch (error) {
      console.error("Failed to enhance sequential result:", error);
    }
    
    // 3. Batch inpainting (all plants at once)
    let batchUrl = await this.inpaintGarden({
      baseImage: emptyBase,
      plants: testPlants,
      season: 'summer',
      style: 'photorealistic',
      approach: 'batch'
    });
    
    // 3b. ENHANCE the batch result with the magical step!
    try {
      console.log("🎨 Enhancing batch inpainting result...");
      const batchPath = path.join(process.cwd(), "client", "public", batchUrl);
      const batchBuffer = await fs.readFile(batchPath);
      
      // Apply the magical enhancement transformation
      const enhancedBatch = await runwareAI.imageInference({
        positivePrompt: "Photorealistic garden with plants, natural lighting, highly detailed, professional photography, vibrant colors, clear stone border frame, 10x10 meter garden bed",
        negativePrompt: "cartoon, anime, illustration, blurry, artifacts, low quality",
        model: runwareModels.civitai_74407,
        numberResults: 1,
        height: 1440,
        width: 1920,
        seedImage: `data:image/png;base64,${batchBuffer.toString('base64')}`,
        strength: 0.3,  // Lower strength to preserve plant positions
        CFGScale: 7,
        steps: 25
      });
      
      if (enhancedBatch && enhancedBatch.length > 0) {
        const imageUrl = enhancedBatch[0].imageURL || enhancedBatch[0].imageUrl || enhancedBatch[0].url;
        if (imageUrl) {
          const response = await fetch(imageUrl);
          const arrayBuffer = await response.arrayBuffer();
          const enhancedFilename = `enhanced-batch-${timestamp}.png`;
          const enhancedPath = path.join(this.outputDir, enhancedFilename);
          await fs.writeFile(enhancedPath, Buffer.from(arrayBuffer));
          batchUrl = `/inpainted-gardens/${enhancedFilename}`;
          console.log("✅ Enhanced batch result saved");
        }
      }
    } catch (error) {
      console.error("Failed to enhance batch result:", error);
    }
    
    return {
      composite: compositeUrl,
      enhancedComposite: enhancedCompositeUrl,
      inpaintSequential: sequentialUrl,
      inpaintBatch: batchUrl,
      emptyBase: `/inpainted-gardens/empty-base-${timestamp}.png`
    };
  }
}

export const aiInpaintingService = new AIInpaintingService();