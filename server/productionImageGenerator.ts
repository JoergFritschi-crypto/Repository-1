// Production-Ready AI Image Generation with HuggingFace
// Optimized for reliability and speed
import fs from "fs/promises";
import path from "path";
import fetch from "node-fetch";

interface ImageRequest {
  prompt: string;
  plantName: string;
  imageType: 'thumbnail' | 'full' | 'detail';
}

export class ProductionImageGenerator {
  private apiKey: string;
  private imagesDir: string;
  
  constructor() {
    if (!process.env.HUGGINGFACE_API_KEY) {
      throw new Error("HUGGINGFACE_API_KEY is required");
    }
    this.apiKey = process.env.HUGGINGFACE_API_KEY;
    this.imagesDir = path.join(process.cwd(), "client", "public", "generated-images");
  }
  
  async generateImage(request: ImageRequest): Promise<string> {
    await fs.mkdir(this.imagesDir, { recursive: true });
    
    const timestamp = Date.now();
    const filename = `${request.plantName.toLowerCase().replace(/\s+/g, '-')}-${request.imageType}-${timestamp}.png`;
    const filepath = path.join(this.imagesDir, filename);
    
    console.log(`Generating image for: ${request.plantName} (${request.imageType})`);
    
    // Use the FASTEST, most reliable model: SDXL Turbo
    // This model generates images in 1-4 steps instead of 50
    const turboModel = 'stabilityai/sdxl-turbo';
    
    // Simple, effective prompt
    const prompt = `${request.plantName}, botanical photography, garden plant, natural lighting, high quality photo`;
    
    try {
      // First attempt with SDXL Turbo (fastest)
      const response = await this.callAPI(turboModel, {
        inputs: prompt,
        parameters: {
          num_inference_steps: 1, // Only 1 step for ultra-fast generation!
          guidance_scale: 0.0, // Required for turbo model
          width: 512,
          height: 512
        },
        options: {
          wait_for_model: true,
          use_cache: false
        }
      }, 30000); // 30 second timeout
      
      if (response.ok) {
        const buffer = await response.arrayBuffer();
        const imageBuffer = Buffer.from(buffer);
        
        if (imageBuffer.length > 10000) {
          await fs.writeFile(filepath, imageBuffer);
          console.log(`✅ Generated with SDXL Turbo: ${filename} (${(imageBuffer.length / 1024).toFixed(1)} KB)`);
          return `/generated-images/${filename}`;
        }
      }
    } catch (error: any) {
      console.log(`SDXL Turbo error: ${error.message}`);
    }
    
    // Fallback to SSD-1B (also very fast)
    try {
      const ssdModel = 'segmind/SSD-1B';
      const response = await this.callAPI(ssdModel, {
        inputs: prompt,
        parameters: {
          negative_prompt: "cartoon, drawing",
          num_inference_steps: 10, // Very fast with only 10 steps
          guidance_scale: 7.5,
          width: 512,
          height: 512
        },
        options: {
          wait_for_model: true
        }
      }, 45000); // 45 second timeout
      
      if (response.ok) {
        const buffer = await response.arrayBuffer();
        const imageBuffer = Buffer.from(buffer);
        
        if (imageBuffer.length > 10000) {
          await fs.writeFile(filepath, imageBuffer);
          console.log(`✅ Generated with SSD-1B: ${filename} (${(imageBuffer.length / 1024).toFixed(1)} KB)`);
          return `/generated-images/${filename}`;
        }
      }
    } catch (error: any) {
      console.log(`SSD-1B error: ${error.message}`);
    }
    
    // Final attempt with Stable Diffusion 2.1 Base (smaller, faster than full model)
    try {
      const baseModel = 'stabilityai/stable-diffusion-2-1-base';
      const response = await this.callAPI(baseModel, {
        inputs: `photograph of ${prompt}`,
        parameters: {
          num_inference_steps: 15, // Reduced steps for speed
          guidance_scale: 7,
          width: 512,
          height: 512
        },
        options: {
          wait_for_model: true
        }
      }, 60000); // 60 second timeout
      
      if (response.ok) {
        const buffer = await response.arrayBuffer();
        const imageBuffer = Buffer.from(buffer);
        
        if (imageBuffer.length > 10000) {
          await fs.writeFile(filepath, imageBuffer);
          console.log(`✅ Generated with SD 2.1 Base: ${filename} (${(imageBuffer.length / 1024).toFixed(1)} KB)`);
          return `/generated-images/${filename}`;
        }
      }
    } catch (error: any) {
      console.log(`SD 2.1 Base error: ${error.message}`);
    }
    
    throw new Error("All image generation attempts failed");
  }
  
  private async callAPI(model: string, config: any, timeout: number): Promise<any> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    console.log(`  Calling ${model}...`);
    
    try {
      const response = await fetch(
        `https://api-inference.huggingface.co/models/${model}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
            'x-wait-for-model': 'true' // Ensures model loads if needed
          },
          body: JSON.stringify(config),
          signal: controller.signal
        }
      );
      
      clearTimeout(timeoutId);
      
      // If model is loading, wait and retry
      if (!response.ok && response.status === 503) {
        const text = await response.text();
        if (text.includes('loading')) {
          console.log(`  Model ${model} is loading, waiting 15 seconds...`);
          await new Promise(resolve => setTimeout(resolve, 15000));
          
          // Retry once
          const retryResponse = await fetch(
            `https://api-inference.huggingface.co/models/${model}`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(config)
            }
          );
          return retryResponse;
        }
      }
      
      return response;
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error(`Timeout after ${timeout/1000} seconds`);
      }
      throw error;
    }
  }
}

export const productionImageGenerator = new ProductionImageGenerator();