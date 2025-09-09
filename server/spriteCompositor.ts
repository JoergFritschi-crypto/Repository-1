// Sprite compositor for precise garden visualization
import sharp from 'sharp';
import path from 'path';
import fs from 'fs/promises';

interface PlantPosition {
  spriteUrl: string;  // Path to the sprite image
  x: number;          // Canvas X coordinate (0-40)
  y: number;          // Canvas Y coordinate (0-30)
  scale?: number;     // Scale factor (1.0 = normal, 0.5 = half size)
  name?: string;      // Plant name for debugging
}

export class SpriteCompositor {
  private baseWidth = 1920;  // Base canvas width in pixels (1920 = 30 * 64, valid for Runware)
  private baseHeight = 1472; // Base canvas height in pixels (1472 = 23 * 64, valid for Runware)
  private cellWidth = 48;    // Width per grid cell (1920/40)
  private cellHeight = 49;   // Height per grid cell (approximately 1472/30)
  
  constructor() {}
  
  // Convert grid coordinates to pixel coordinates
  private gridToPixels(gridX: number, gridY: number): { x: number, y: number } {
    return {
      x: Math.round(gridX * this.cellWidth),
      y: Math.round(gridY * this.cellHeight)
    };
  }
  
  async createGardenBase(): Promise<Buffer> {
    // Create a realistic garden bed with earth/soil texture
    const svg = `
      <svg width="${this.baseWidth}" height="${this.baseHeight}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="soil" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" style="stop-color:#8d6e63;stop-opacity:1" />
            <stop offset="50%" style="stop-color:#6d4c41;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#5d4037;stop-opacity:1" />
          </linearGradient>
          <pattern id="earth" patternUnits="userSpaceOnUse" width="8" height="8">
            <rect width="8" height="8" fill="url(#soil)"/>
            <circle cx="2" cy="2" r="1" fill="#5d4037" opacity="0.4"/>
            <circle cx="6" cy="6" r="0.8" fill="#3e2723" opacity="0.3"/>
            <circle cx="4" cy="5" r="0.6" fill="#4e342e" opacity="0.5"/>
          </pattern>
          <!-- Add mulch texture -->
          <pattern id="mulch" patternUnits="userSpaceOnUse" width="12" height="12">
            <rect width="12" height="12" fill="#6d4c41"/>
            <rect x="1" y="2" width="3" height="1" fill="#5d4037" opacity="0.7"/>
            <rect x="5" y="4" width="2" height="1" fill="#795548" opacity="0.6"/>
            <rect x="7" y="8" width="3" height="1" fill="#4e342e" opacity="0.8"/>
            <rect x="2" y="9" width="2" height="1" fill="#5d4037" opacity="0.5"/>
          </pattern>
        </defs>
        <!-- Base soil layer -->
        <rect width="${this.baseWidth}" height="${this.baseHeight}" fill="url(#earth)"/>
        <!-- Add some mulch areas for variation -->
        <rect x="0" y="${this.baseHeight * 0.7}" width="${this.baseWidth}" height="${this.baseHeight * 0.3}" 
              fill="url(#mulch)" opacity="0.6"/>
        <!-- Add subtle depth with darker edges -->
        <rect x="0" y="0" width="${this.baseWidth}" height="80" 
              fill="black" opacity="0.15"/>
        <rect x="0" y="${this.baseHeight - 100}" width="${this.baseWidth}" height="100" 
              fill="black" opacity="0.1"/>
      </svg>
    `;
    
    return sharp(Buffer.from(svg)).png().toBuffer();
  }
  
  async compositeGarden(plants: PlantPosition[]): Promise<string> {
    console.log("Compositing garden with", plants.length, "plants");
    
    // Create base garden image
    const baseBuffer = await this.createGardenBase();
    let composite = sharp(baseBuffer);
    
    // Prepare composite operations
    const compositeOps = [];
    
    for (const plant of plants) {
      const pixelPos = this.gridToPixels(plant.x, plant.y);
      console.log(`Placing ${plant.name || 'plant'} at grid(${plant.x},${plant.y}) → pixels(${pixelPos.x},${pixelPos.y})`);
      
      // Load the sprite
      const spritePath = path.join(process.cwd(), "client", "public", plant.spriteUrl);
      
      try {
        const spriteBuffer = await fs.readFile(spritePath);
        const spriteMeta = await sharp(spriteBuffer).metadata();
        
        // Calculate size based on scale and position (background plants smaller)
        const depthScale = 1 - (plant.y / 30) * 0.3; // Reduce size by up to 30% for far plants
        const finalScale = (plant.scale || 1) * depthScale;
        
        const targetWidth = Math.round((spriteMeta.width || 512) * finalScale);
        const targetHeight = Math.round((spriteMeta.height || 512) * finalScale);
        
        // Resize sprite
        const resizedSprite = await sharp(spriteBuffer)
          .resize(targetWidth, targetHeight, { fit: 'inside' })
          .toBuffer();
        
        // Center the sprite on the grid position
        const left = Math.max(0, pixelPos.x - Math.round(targetWidth / 2));
        const top = Math.max(0, pixelPos.y - Math.round(targetHeight * 0.8)); // Anchor near bottom
        
        compositeOps.push({
          input: resizedSprite,
          left: left,
          top: top,
          blend: 'over' as const
        });
        
      } catch (error) {
        console.error(`Failed to load sprite ${plant.spriteUrl}:`, error);
      }
    }
    
    // Apply all composites
    if (compositeOps.length > 0) {
      composite = composite.composite(compositeOps);
    }
    
    // Save the final image
    const outputDir = path.join(process.cwd(), "client", "public", "composite-gardens");
    await fs.mkdir(outputDir, { recursive: true });
    
    const timestamp = Date.now();
    const filename = `composite-garden-${timestamp}.png`;
    const filepath = path.join(outputDir, filename);
    
    await composite.png().toFile(filepath);
    
    const publicUrl = `/composite-gardens/${filename}`;
    console.log("Composite garden saved to:", publicUrl);
    
    return publicUrl;
  }
  
  // Quick test with pre-positioned plants
  async testComposite(): Promise<string> {
    // Test with the maple we just generated
    const testPlants: PlantPosition[] = [
      {
        spriteUrl: "/plant-sprites/sprite-japanese-maple-summer-1757358029844.png",
        x: 30,  // Far right
        y: 5,   // Background
        scale: 0.5,  // Increase scale a bit
        name: "Japanese Maple"
      }
    ];
    
    return this.compositeGarden(testPlants);
  }
  
  // Test with two plants for Gemini enhancement
  async testTwoPlantComposite(): Promise<string> {
    const testPlants: PlantPosition[] = [
      {
        spriteUrl: "/plant-sprites/sprite-japanese-maple-summer-1757358029844.png",
        x: 30,  // Far right background
        y: 5,   // Background position
        scale: 0.6,  // Tree size
        name: "Japanese Maple"
      },
      {
        spriteUrl: "/plant-sprites/sprite-hosta-sieboldiana-summer-1757359540170.png", 
        x: 34,  // Right foreground
        y: 21,  // Foreground position
        scale: 0.8,  // Smaller plant
        name: "Hosta"
      }
    ];
    
    return this.compositeGarden(testPlants);
  }
}

export const spriteCompositor = new SpriteCompositor();