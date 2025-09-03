// Runware AI Image Generation - Fast & Reliable Production Service
import fs from "fs/promises";
import path from "path";
import fetch from "node-fetch";

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
  
  async generateImage(request: ImageRequest): Promise<string> {
    await fs.mkdir(this.imagesDir, { recursive: true });
    
    const timestamp = Date.now();
    const filename = `${request.plantName.toLowerCase().replace(/\s+/g, '-')}-${request.imageType}-${timestamp}.png`;
    const filepath = path.join(this.imagesDir, filename);
    
    console.log(`🌿 Generating with Runware: ${request.plantName} (${request.imageType})`);
    
    // Create botanical photography prompt
    const botanicalPrompt = `professional botanical photography of ${request.plantName}, ${
      request.imageType === 'full' ? 'full plant in garden setting' :
      request.imageType === 'detail' ? 'close-up detail of flowers or leaves' :
      'centered specimen portrait'
    }, natural lighting, high resolution nature photography, sharp focus, garden background`;
    
    try {
      // Runware API for image generation (expects array format)
      const response = await fetch(`${this.baseUrl}/images`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify([{
          taskType: "imageInference",
          positivePrompt: botanicalPrompt,
          model: "runwareai/stable-diffusion-xl-base-1.0",
          numberOfImages: 1,
          height: 768,
          width: 768,
          outputFormat: "PNG"
        }])
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Runware API error: ${response.status} - ${errorText}`);
        throw new Error(`Runware API failed: ${response.status}`);
      }
      
      const result = await response.json() as any;
      
      // Runware returns image URLs that we need to download
      if (result.data && result.data[0] && result.data[0].imageURL) {
        const imageUrl = result.data[0].imageURL;
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
        throw new Error('No image URL in Runware response');
      }
    } catch (error: any) {
      console.error(`Runware generation failed: ${error.message}`);
      throw error;
    }
  }
}

export const runwareImageGenerator = new RunwareImageGenerator();