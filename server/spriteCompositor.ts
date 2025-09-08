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
  private baseWidth = 1920;  // Base canvas width in pixels
  private baseHeight = 1440; // Base canvas height in pixels
  private cellWidth = 48;    // Width per grid cell (1920/40)
  private cellHeight = 48;   // Height per grid cell (1440/30)
  
  constructor() {}
  
  // Convert grid coordinates to pixel coordinates
  private gridToPixels(gridX: number, gridY: number): { x: number, y: number } {
    return {
      x: Math.round(gridX * this.cellWidth),
      y: Math.round(gridY * this.cellHeight)
    };
  }
  
  async createGardenBase(): Promise<Buffer> {
    // Create a simple garden bed background
    // For now, using a gradient green lawn with subtle texture
    const svg = `
      <svg width="${this.baseWidth}" height="${this.baseHeight}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="lawn" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" style="stop-color:#7cb342;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#689f38;stop-opacity:1" />
          </linearGradient>
          <pattern id="grass" patternUnits="userSpaceOnUse" width="4" height="4">
            <rect width="4" height="4" fill="url(#lawn)"/>
            <circle cx="1" cy="1" r="0.5" fill="#5e8e3a" opacity="0.3"/>
            <circle cx="3" cy="3" r="0.5" fill="#8bc34a" opacity="0.2"/>
          </pattern>
        </defs>
        <rect width="${this.baseWidth}" height="${this.baseHeight}" fill="url(#grass)"/>
        <!-- Add subtle depth with darker edges -->
        <rect x="0" y="0" width="${this.baseWidth}" height="50" 
              fill="black" opacity="0.1"/>
        <rect x="0" y="${this.baseHeight - 50}" width="${this.baseWidth}" height="50" 
              fill="black" opacity="0.05"/>
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
        scale: 0.3,  // Smaller since it's a tree
        name: "Japanese Maple"
      }
    ];
    
    return this.compositeGarden(testPlants);
  }
}

export const spriteCompositor = new SpriteCompositor();