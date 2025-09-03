// Optimized HuggingFace with Inference API 
import fs from "fs/promises";
import path from "path";
import fetch from "node-fetch";

interface ImageRequest {
  prompt: string;
  plantName: string;
  imageType: 'thumbnail' | 'full' | 'detail';
}

// Use the most reliable, hosted models on HuggingFace
const FAST_MODELS = [
  'stabilityai/sdxl-turbo',           // Fastest (1 step)
  'segmind/SSD-1B',                   // Very fast 
  'runwayml/stable-diffusion-v1-5',   // Classic, reliable
  'CompVis/stable-diffusion-v1-4',    // Backup option
];

export class HuggingFaceOptimized {
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
    
    console.log(`🌱 HuggingFace Optimized: ${request.plantName}`);
    
    // Simple, effective botanical prompt
    const prompt = `botanical photograph of ${request.plantName}, ${
      request.imageType === 'full' ? 'full plant view' :
      request.imageType === 'detail' ? 'close-up detail' :
      'plant portrait'
    }, garden photography, natural light`;
    
    // Try each model with specific optimizations
    for (const model of FAST_MODELS) {
      try {
        console.log(`  Trying ${model}...`);
        
        const params = this.getModelParams(model);
        
        const response = await fetch(
          `https://api-inference.huggingface.co/models/${model}`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${this.apiKey}`,
              'Content-Type': 'application/json',
              'x-use-cache': 'false'  // Force fresh generation
            },
            body: JSON.stringify({
              inputs: prompt,
              parameters: params,
              options: {
                wait_for_model: true,  // Wait if model needs to load
                use_cache: false
              }
            }),
            // Shorter timeout for faster failover
            signal: AbortSignal.timeout(20000)  
          }
        );
        
        if (response.ok) {
          const buffer = await response.arrayBuffer();
          const imageBuffer = Buffer.from(buffer);
          
          if (imageBuffer.length > 10000) {
            await fs.writeFile(filepath, imageBuffer);
            const sizeKB = (imageBuffer.length / 1024).toFixed(1);
            console.log(`✅ Generated with ${model}: ${sizeKB} KB`);
            return `/generated-images/${filename}`;
          }
        } else if (response.status === 503) {
          // Model is loading
          const text = await response.text();
          const data = JSON.parse(text);
          if (data.estimated_time) {
            console.log(`  Model loading, wait ${Math.ceil(data.estimated_time)}s...`);
            await new Promise(r => setTimeout(r, Math.min(data.estimated_time * 1000, 15000)));
            
            // Retry once after waiting
            const retry = await fetch(
              `https://api-inference.huggingface.co/models/${model}`,
              {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${this.apiKey}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ inputs: prompt, parameters: params }),
                signal: AbortSignal.timeout(20000)
              }
            );
            
            if (retry.ok) {
              const buffer = await retry.arrayBuffer();
              const imageBuffer = Buffer.from(buffer);
              
              if (imageBuffer.length > 10000) {
                await fs.writeFile(filepath, imageBuffer);
                const sizeKB = (imageBuffer.length / 1024).toFixed(1);
                console.log(`✅ Generated with ${model}: ${sizeKB} KB`);
                return `/generated-images/${filename}`;
              }
            }
          }
        }
      } catch (error: any) {
        console.log(`  ${model} failed: ${error.message}`);
        continue;  // Try next model
      }
    }
    
    throw new Error("All HuggingFace models failed");
  }
  
  private getModelParams(model: string): any {
    // Optimized parameters for each model
    if (model.includes('turbo')) {
      return {
        num_inference_steps: 1,  // Turbo only needs 1 step!
        guidance_scale: 0.0,     // Required for turbo
        width: 512,
        height: 512
      };
    } else if (model.includes('SSD-1B')) {
      return {
        num_inference_steps: 8,  // Very fast with 8 steps
        guidance_scale: 7.5,
        width: 512,
        height: 512
      };
    } else {
      return {
        num_inference_steps: 20,  // Standard models
        guidance_scale: 7.5,
        width: 512,
        height: 512
      };
    }
  }
}

export const huggingfaceOptimized = new HuggingFaceOptimized();