// Runware AI Image Generation - Fast & Reliable Production Service
import fs from "fs/promises";
import path from "path";
import fetch from "node-fetch";
import { randomUUID } from "crypto";

interface ImageRequest {
  prompt: string;
  plantName: string;
  imageType: 'thumbnail' | 'full' | 'detail';
}

export class RunwareImageGenerator {
  private apiKey: string;
  private imagesDir: string;
  private baseUrl = 'https://api.runware.ai/v1';
  
  constructor() {
    if (!process.env.RUNWARE_API_KEY) {
      throw new Error("RUNWARE_API_KEY is required");
    }
    this.apiKey = process.env.RUNWARE_API_KEY;
    this.imagesDir = path.join(process.cwd(), "client", "public", "generated-images");
  }
  
  // Botanical characteristics for accurate plant representation
  private getBotanicalDetails(plantName: string): string {
    const botanicalDescriptions: Record<string, string> = {
      'japanese maple': 'Acer palmatum with distinctive palmate leaves having 5-7 pointed lobes, delicate branching structure, red or purple foliage, smooth gray bark, small red samaras (winged seeds)',
      'english lavender': 'Lavandula angustifolia with narrow silvery-green linear leaves, purple flower spikes on long stems, bushy compact growth habit, aromatic Mediterranean shrub, square stems',
      'hosta': 'Hosta plantaginea with large broad ovate leaves, prominent parallel veins, blue-green or variegated foliage, forms dense mounds, tall flower stalks with tubular white or purple flowers',
      'rose': 'Rosa species with compound pinnate leaves, serrated leaflets, thorny stems, layered petals in spiral formation, green sepals, rose hips',
      'tulip': 'Tulipa species with single bulb, broad lanceolate leaves, six tepals, cup-shaped flowers, straight stem, no branching',
      'sunflower': 'Helianthus annuus with large rough heart-shaped leaves, thick hairy stem, composite flower head with yellow ray petals, dark center disk florets, heliotropic behavior'
    };
    
    const normalizedName = plantName.toLowerCase();
    for (const [key, description] of Object.entries(botanicalDescriptions)) {
      if (normalizedName.includes(key)) {
        return description;
      }
    }
    
    return plantName; // Fallback to original name if no specific description
  }
  
  async generateImage(request: ImageRequest): Promise<string> {
    await fs.mkdir(this.imagesDir, { recursive: true });
    
    const timestamp = Date.now();
    const filename = `${request.plantName.toLowerCase().replace(/\s+/g, '-')}-${request.imageType}-${timestamp}.png`;
    const filepath = path.join(this.imagesDir, filename);
    
    console.log(`🌿 Generating with Runware: ${request.plantName} (${request.imageType})`);
    
    // Get botanically accurate description
    const botanicalDescription = this.getBotanicalDetails(request.plantName);
    
    // Create natural garden-focused prompt (avoiding atlas/specimen style)
    const botanicalPrompt = `beautiful ${botanicalDescription} growing naturally in garden setting, ${
      request.imageType === 'full' ? 'entire plant or tree in landscaped garden, showing natural growth habit, garden path visible, other plants nearby, outdoor natural environment' :
      request.imageType === 'detail' ? 'close-up of living flowers and leaves on the plant, natural garden background, soft bokeh, morning dew' :
      'healthy plant portrait in garden bed, natural outdoor lighting, mulch and soil visible, garden setting'
    }, photorealistic garden photography, natural colors, no white background, living plant in real garden environment`;
    
    try {
      // Runware API requires taskUUID for each request
      const taskUUID = randomUUID();
      
      const response = await fetch(`${this.baseUrl}/images`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify([{
          taskType: "imageInference",
          taskUUID: taskUUID,
          positivePrompt: botanicalPrompt,
          model: "runware:100@1",  // FLUX Schnell - Fast & natural garden imagery
          // FLUX Schnell is optimized for natural, garden-style botanical images
          // rather than atlas/specimen style with white backgrounds
          numberOfImages: 1,
          height: 768,
          width: 768,
          outputFormat: "PNG",
          steps: 4,  // FLUX Schnell works best with 1-4 steps
          CFGScale: 3.5  // Lower CFG for more natural results
        }])
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Runware API error: ${response.status} - ${errorText}`);
        throw new Error(`Runware API failed: ${response.status}`);
      }
      
      const result = await response.json() as any;
      
      // Runware returns image URLs in the data array
      if (result.data && result.data.length > 0) {
        // Find our task result
        const taskResult = result.data.find((item: any) => item.taskUUID === taskUUID);
        
        if (taskResult && taskResult.imageURL) {
          const imageUrl = taskResult.imageURL;
          console.log(`  Downloading image from Runware...`);
          
          // Download the image
          const imageResponse = await fetch(imageUrl);
          if (!imageResponse.ok) {
            throw new Error(`Failed to download image from Runware`);
          }
        
        const buffer = await imageResponse.arrayBuffer();
        const imageBuffer = Buffer.from(buffer);
        
        if (imageBuffer.length > 10000) {
          await fs.writeFile(filepath, imageBuffer);
          console.log(`✅ Runware generated: ${filename} (${(imageBuffer.length / 1024).toFixed(1)} KB)`);
          return `/generated-images/${filename}`;
          } else {
            throw new Error(`Image too small: ${imageBuffer.length} bytes`);
          }
        } else {
          throw new Error('No matching task result in Runware response');
        }
      } else {
        throw new Error('No data in Runware response');
      }
    } catch (error: any) {
      console.error(`Runware generation failed: ${error.message}`);
      throw error;
    }
  }
}

export const runwareImageGenerator = new RunwareImageGenerator();