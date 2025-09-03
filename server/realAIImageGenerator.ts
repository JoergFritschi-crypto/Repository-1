// REAL AI Image Generation - No shortcuts, no fake images
import fs from "fs/promises";
import path from "path";
import fetch from "node-fetch";

interface RealImageRequest {
  prompt: string;
  plantName: string;
  imageType: 'thumbnail' | 'full' | 'detail';
  aspectRatio?: '1:1' | '3:4' | '4:3' | '16:9' | '9:16';
}

export class RealAIImageGenerator {
  private apiKey: string;
  private imagesDir: string;
  
  constructor() {
    if (!process.env.HUGGINGFACE_API_KEY) {
      throw new Error("HUGGINGFACE_API_KEY is required for real AI image generation");
    }
    this.apiKey = process.env.HUGGINGFACE_API_KEY;
    this.imagesDir = path.join(process.cwd(), "client", "public", "generated-images");
  }
  
  async generateRealImage(request: RealImageRequest): Promise<string> {
    await fs.mkdir(this.imagesDir, { recursive: true });
    
    // Generate filename
    const timestamp = Date.now();
    const filename = `${request.plantName.toLowerCase().replace(/\s+/g, '-')}-${request.imageType}-${timestamp}.png`;
    const filepath = path.join(this.imagesDir, filename);
    
    // Create optimized prompt for plant images
    const botanicalPrompt = this.createBotanicalPrompt(request);
    
    console.log(`Generating REAL AI image for: ${request.plantName} (${request.imageType})`);
    console.log(`Prompt: ${botanicalPrompt}`);
    
    // Try stable, working models with proper configuration
    const workingModels = [
      {
        name: 'stabilityai/stable-diffusion-2-1',
        config: {
          inputs: botanicalPrompt,
          parameters: {
            negative_prompt: "cartoon, illustration, drawing, art, anime, fake, CGI, render, painting, sketch, abstract, low quality, blurry",
            num_inference_steps: 50,
            guidance_scale: 7.5,
            width: 768,
            height: 768
          },
          options: {
            wait_for_model: true,
            use_cache: false
          }
        }
      },
      {
        name: 'runwayml/stable-diffusion-v1-5', 
        config: {
          inputs: botanicalPrompt,
          parameters: {
            negative_prompt: "cartoon, drawing, illustration, painting, abstract",
            num_inference_steps: 30,
            guidance_scale: 7.5,
            width: 512,
            height: 512
          },
          options: {
            wait_for_model: true
          }
        }
      },
      {
        name: 'prompthero/openjourney',
        config: {
          inputs: `mdjrny-v4 style ${botanicalPrompt}`,
          parameters: {
            num_inference_steps: 50,
            guidance_scale: 7,
            width: 512,
            height: 512
          },
          options: {
            wait_for_model: true
          }
        }
      }
    ];
    
    let lastError = null;
    
    for (const model of workingModels) {
      console.log(`Attempting with model: ${model.name}`);
      
      try {
        // Make the API call with proper timeout and error handling
        const response = await this.callHuggingFaceAPI(model.name, model.config);
        
        if (response.ok) {
          const buffer = await response.arrayBuffer();
          const imageBuffer = Buffer.from(buffer);
          
          // Verify it's a real image (should be at least 50KB for a real photo)
          if (imageBuffer.length > 50000) {
            await fs.writeFile(filepath, imageBuffer);
            console.log(`✅ SUCCESS: Real AI image generated - ${filename} (${(imageBuffer.length / 1024).toFixed(1)} KB)`);
            return `/generated-images/${filename}`;
          } else {
            console.log(`Image too small (${imageBuffer.length} bytes), trying next model...`);
            lastError = new Error(`Generated image too small: ${imageBuffer.length} bytes`);
          }
        } else {
          const errorText = await response.text();
          console.log(`Model ${model.name} returned error: ${response.status} - ${errorText}`);
          lastError = new Error(`API error: ${response.status} - ${errorText}`);
        }
      } catch (error: any) {
        console.log(`Model ${model.name} failed: ${error.message}`);
        lastError = error;
        
        // If model is loading, wait and retry
        if (error.message?.includes('loading')) {
          console.log('Model is loading, waiting 20 seconds...');
          await new Promise(resolve => setTimeout(resolve, 20000));
          
          // Retry once after waiting
          try {
            const retryResponse = await this.callHuggingFaceAPI(model.name, model.config);
            if (retryResponse.ok) {
              const buffer = await retryResponse.arrayBuffer();
              const imageBuffer = Buffer.from(buffer);
              
              if (imageBuffer.length > 50000) {
                await fs.writeFile(filepath, imageBuffer);
                console.log(`✅ SUCCESS on retry: Real AI image generated - ${filename}`);
                return `/generated-images/${filename}`;
              }
            }
          } catch (retryError) {
            console.log('Retry also failed, moving to next model');
          }
        }
      }
    }
    
    // If we get here, all models failed - throw error, don't return fake image
    throw new Error(`Failed to generate real AI image: ${lastError?.message || 'All models failed'}`);
  }
  
  private async callHuggingFaceAPI(model: string, config: any): Promise<any> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000); // 60 second timeout
    
    try {
      const response = await fetch(
        `https://api-inference.huggingface.co/models/${model}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(config),
          signal: controller.signal
        }
      );
      
      clearTimeout(timeout);
      return response;
    } catch (error: any) {
      clearTimeout(timeout);
      if (error.name === 'AbortError') {
        throw new Error('Request timeout after 60 seconds');
      }
      throw error;
    }
  }
  
  private createBotanicalPrompt(request: RealImageRequest): string {
    const { plantName, imageType } = request;
    
    // Base prompt for photorealistic plant images
    let prompt = `photorealistic ${plantName}, professional botanical photography, real plant photo, nature photography`;
    
    // Add type-specific details
    switch (imageType) {
      case 'thumbnail':
        prompt += ', centered plant portrait, clear single specimen, garden background, natural daylight';
        break;
      case 'full':
        prompt += ', entire plant in garden setting, landscape view, outdoor environment, natural habitat';
        break;
      case 'detail':
        prompt += ', macro photography of leaves and flowers, close-up detail, sharp focus on botanical features';
        break;
    }
    
    // Add quality modifiers
    prompt += ', high resolution, sharp focus, professional DSLR photo, National Geographic quality, award winning photography';
    
    return prompt;
  }
}

// Export singleton
export const realAIImageGenerator = new RealAIImageGenerator();