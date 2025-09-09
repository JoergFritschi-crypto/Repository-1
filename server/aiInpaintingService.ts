// AI Inpainting Service for Garden Visualization
// This is a proof of concept for using AI inpainting as an alternative to sprite compositing
import sharp from 'sharp';
import path from 'path';
import fs from 'fs/promises';
import GeminiAI from './geminiAI.js';
import { runwareService } from './runwareAI.js';

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
    
    // Create an empty garden bed with realistic perspective
    const svg = `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <!-- Sky gradient -->
          <linearGradient id="sky" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" style="stop-color:#87CEEB;stop-opacity:1" />
            <stop offset="70%" style="stop-color:#E0F6FF;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#F0F8FF;stop-opacity:1" />
          </linearGradient>
          
          <!-- Ground gradient with perspective -->
          <linearGradient id="ground" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" style="stop-color:#8FBC8F;stop-opacity:1" />
            <stop offset="30%" style="stop-color:#90EE90;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#228B22;stop-opacity:1" />
          </linearGradient>
          
          <!-- Garden bed soil -->
          <pattern id="soil" patternUnits="userSpaceOnUse" width="20" height="20">
            <rect width="20" height="20" fill="#8B4513"/>
            <circle cx="5" cy="5" r="2" fill="#654321" opacity="0.5"/>
            <circle cx="15" cy="15" r="1.5" fill="#5C4033" opacity="0.4"/>
            <circle cx="10" cy="12" r="1" fill="#3E2723" opacity="0.3"/>
          </pattern>
        </defs>
        
        <!-- Sky background -->
        <rect width="${width}" height="${height * 0.4}" fill="url(#sky)"/>
        
        <!-- Ground/lawn area -->
        <rect y="${height * 0.4}" width="${width}" height="${height * 0.6}" fill="url(#ground)"/>
        
        <!-- Garden bed with perspective (trapezoid shape for depth) -->
        <path d="M ${width * 0.2} ${height * 0.5} 
                 L ${width * 0.8} ${height * 0.5}
                 L ${width * 0.75} ${height * 0.85}
                 L ${width * 0.25} ${height * 0.85} Z" 
              fill="url(#soil)" 
              stroke="#5C4033" 
              stroke-width="3"/>
        
        <!-- Add some texture lines for depth -->
        <line x1="${width * 0.2}" y1="${height * 0.5}" 
              x2="${width * 0.25}" y2="${height * 0.85}" 
              stroke="#3E2723" stroke-width="1" opacity="0.3"/>
        <line x1="${width * 0.8}" y1="${height * 0.5}" 
              x2="${width * 0.75}" y2="${height * 0.85}" 
              stroke="#3E2723" stroke-width="1" opacity="0.3"/>
        
        <!-- Horizon line -->
        <line x1="0" y1="${height * 0.4}" 
              x2="${width}" y2="${height * 0.4}" 
              stroke="#6B8E23" stroke-width="2" opacity="0.5"/>
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
    // Size mapping for mask radius
    const sizeMap = {
      small: 0.05,   // 5% of image width
      medium: 0.08,  // 8% of image width
      large: 0.12    // 12% of image width
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
    // For proof of concept, we'll use Runware's img2img with masking
    // In production, you'd use a dedicated inpainting model
    
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
    
    const prompt = `A ${plant.plantName} ${depthDesc} of a garden, ${seasonDesc}, 
                    natural lighting, photorealistic, maintaining perspective and scale`;
    
    try {
      // Use Runware for inpainting-like generation
      const result = await runwareService.generateSeasonalImage({
        season: options.season,
        specificTime: seasonDesc,
        canvasDesign: {
          plants: [{
            plant: { id: '1', name: plant.plantName },
            position: { x: plant.x, y: plant.y }
          }]
        },
        gardenDimensions: { width: 10, length: 10 },
        useReferenceMode: true,
        referenceImage: `data:image/png;base64,${imageBase64}`
      });
      
      // Convert result URL to buffer
      if (result.startsWith('data:')) {
        const base64Data = result.split(',')[1];
        return Buffer.from(base64Data, 'base64');
      } else {
        // For URL results, would need to fetch the image
        // For now, return original image
        return imageBuffer;
      }
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
    
    // Build comprehensive prompt for all plants
    const plantDescriptions = options.plants.map(plant => {
      const position = plant.x < 33 ? "left" : plant.x > 66 ? "right" : "center";
      const depth = plant.y < 33 ? "background" : plant.y > 66 ? "foreground" : "midground";
      return `${plant.plantName} in the ${position} ${depth}`;
    }).join(", ");
    
    const seasonDesc = this.getSeasonDescription(options.season);
    const styleDesc = options.style === 'watercolor' ? "watercolor painting style" :
                      options.style === 'artistic' ? "artistic illustration" :
                      "photorealistic";
    
    const prompt = `Garden scene with ${plantDescriptions}, ${seasonDesc}, ${styleDesc}, 
                    maintaining proper perspective and scale, natural lighting and shadows`;
    
    try {
      // Try Gemini first if available
      if (this.geminiAI) {
        const result = await this.geminiAI.generateImageWithReference(prompt, imageBase64);
        if (result.imageData) {
          const base64Data = result.imageData.split(',')[1];
          return Buffer.from(base64Data, 'base64');
        }
      }
      
      // Fallback to Runware
      const result = await runwareService.generateSeasonalImage({
        season: options.season,
        specificTime: seasonDesc,
        canvasDesign: {
          plants: options.plants.map((plant, idx) => ({
            plant: { id: idx.toString(), name: plant.plantName },
            position: { x: plant.x, y: plant.y }
          }))
        },
        gardenDimensions: { width: 10, length: 10 },
        useReferenceMode: true,
        referenceImage: `data:image/png;base64,${imageBase64}`
      });
      
      if (result.startsWith('data:')) {
        const base64Data = result.split(',')[1];
        return Buffer.from(base64Data, 'base64');
      }
      
      return imageBuffer; // Return original if all fails
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
  
  // Comparison test between composite and inpainting
  async compareApproaches(): Promise<{
    composite: string;
    inpaintSequential: string;
    inpaintBatch: string;
    emptyBase: string;
  }> {
    console.log("🔬 Running comparison test between approaches...");
    
    // Test plants configuration
    const testPlants: PlantInpaintRequest[] = [
      {
        plantName: "Japanese Maple",
        x: 70,  // Right side
        y: 25,  // Background
        size: 'large',
        season: 'summer'
      },
      {
        plantName: "Hosta",
        x: 30,  // Left side
        y: 65,  // Foreground
        size: 'medium',
        season: 'summer'
      },
      {
        plantName: "Lavender",
        x: 50,  // Center
        y: 45,  // Middle
        size: 'small',
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
    
    // 2. Sequential inpainting (one plant at a time)
    const sequentialUrl = await this.inpaintGarden({
      baseImage: emptyBase,
      plants: testPlants,
      season: 'summer',
      style: 'photorealistic',
      approach: 'sequential'
    });
    
    // 3. Batch inpainting (all plants at once)
    const batchUrl = await this.inpaintGarden({
      baseImage: emptyBase,
      plants: testPlants,
      season: 'summer',
      style: 'photorealistic',
      approach: 'batch'
    });
    
    return {
      composite: compositeUrl,
      inpaintSequential: sequentialUrl,
      inpaintBatch: batchUrl,
      emptyBase: `/inpainted-gardens/empty-base-${timestamp}.png`
    };
  }
}

export const aiInpaintingService = new AIInpaintingService();