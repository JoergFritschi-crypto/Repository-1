// Flux AI for generating plant sprites for precise compositing
import fetch from "node-fetch";
import fs from "fs/promises";
import path from "path";

interface SpriteGenerationRequest {
  plantName: string;
  plantId?: string;
  season?: 'spring' | 'summer' | 'autumn' | 'winter';
}

export class FluxSpriteGenerator {
  private apiKey: string;
  private spritesDir: string;
  
  constructor() {
    if (!process.env.HUGGINGFACE_API_KEY) {
      throw new Error("HUGGINGFACE_API_KEY is required for Flux sprites");
    }
    this.apiKey = process.env.HUGGINGFACE_API_KEY;
    this.spritesDir = path.join(process.cwd(), "client", "public", "plant-sprites");
  }
  
  async generatePlantSprite(request: SpriteGenerationRequest): Promise<string> {
    console.log("Flux Sprite: Generating sprite for", request.plantName);
    
    // Build sprite-specific prompt
    const prompt = this.buildSpritePrompt(request);
    console.log("Flux Sprite prompt:", prompt);
    
    // Use Flux Dev for quality
    const model = "black-forest-labs/FLUX.1-dev";
    
    try {
      const response = await fetch(
        `https://api-inference.huggingface.co/models/${model}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
            'x-use-cache': 'false'
          },
          body: JSON.stringify({
            inputs: prompt,
            parameters: {
              num_inference_steps: 28,
              guidance_scale: 3.5,
              width: 1024,
              height: 1024,
              seed: 42
            },
            options: {
              wait_for_model: true,
              use_cache: false
            }
          }),
          signal: AbortSignal.timeout(60000)
        }
      );
      
      if (response.ok) {
        const buffer = await response.arrayBuffer();
        
        // Save sprite to dedicated sprites directory
        await fs.mkdir(this.spritesDir, { recursive: true });
        const timestamp = Date.now();
        const season = request.season || 'summer';
        const filename = `sprite-${request.plantName.toLowerCase().replace(/\s+/g, '-')}-${season}-${timestamp}.png`;
        const filepath = path.join(this.spritesDir, filename);
        
        await fs.writeFile(filepath, Buffer.from(buffer));
        
        const publicUrl = `/plant-sprites/${filename}`;
        console.log("Flux Sprite: Successfully generated sprite");
        console.log("Flux Sprite: Saved to:", publicUrl);
        return publicUrl;
      } else if (response.status === 503) {
        // Model is loading, wait and retry
        const text = await response.text();
        const data = JSON.parse(text);
        if (data.estimated_time) {
          console.log(`Flux Sprite: Model loading, waiting ${Math.ceil(data.estimated_time)}s...`);
          await new Promise(r => setTimeout(r, Math.min(data.estimated_time * 1000, 30000)));
          
          // Retry once
          const retry = await fetch(
            `https://api-inference.huggingface.co/models/${model}`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                inputs: prompt,
                parameters: {
                  num_inference_steps: 28,
                  guidance_scale: 3.5,
                  width: 1024,
                  height: 1024,
                  seed: 42
                }
              }),
              signal: AbortSignal.timeout(60000)
            }
          );
          
          if (retry.ok) {
            const buffer = await retry.arrayBuffer();
            
            await fs.mkdir(this.spritesDir, { recursive: true });
            const timestamp = Date.now();
            const season = request.season || 'summer';
            const filename = `sprite-${request.plantName.toLowerCase().replace(/\s+/g, '-')}-${season}-${timestamp}.png`;
            const filepath = path.join(this.spritesDir, filename);
            
            await fs.writeFile(filepath, Buffer.from(buffer));
            
            const publicUrl = `/plant-sprites/${filename}`;
            console.log("Flux Sprite: Successfully generated sprite (after retry)");
            return publicUrl;
          }
        }
        throw new Error(`Flux model failed to load: ${response.status}`);
      } else {
        const errorText = await response.text();
        throw new Error(`Flux sprite generation failed: ${response.status} - ${errorText}`);
      }
    } catch (error: any) {
      console.error("Flux sprite generation error:", error);
      throw error;
    }
  }
  
  private buildSpritePrompt(request: SpriteGenerationRequest): string {
    const { plantName, season = 'summer' } = request;
    
    // Build a prompt specifically for isolated sprite generation
    let prompt = `COMPLETE FULL ${plantName} `;
    
    // Specify if it's a tree, shrub, or smaller plant
    if (plantName.toLowerCase().includes('maple') || plantName.toLowerCase().includes('tree')) {
      prompt += "TREE showing ENTIRE trunk and full canopy, ";
    } else if (plantName.toLowerCase().includes('rose') || plantName.toLowerCase().includes('bush')) {
      prompt += "BUSH showing complete plant from base to top, ";
    } else {
      prompt += "PLANT showing complete specimen from base to top, ";
    }
    
    prompt += "isolated on pure white background, ";
    prompt += "NO ground, NO soil, NO pot, NO other elements, ";
    prompt += "single COMPLETE plant floating/isolated in center of frame, ";
    prompt += "show FULL HEIGHT from bottom of trunk/stem to top of foliage, ";
    prompt += "45 degree elevated viewing angle, ";
    prompt += "soft shadow beneath plant for depth, ";
    prompt += "botanical specimen photography style, ";
    prompt += "ultra detailed, sharp focus, ";
    
    // Add seasonal descriptors
    if (season === 'spring') {
      prompt += "fresh spring growth, new leaves, early blooms if flowering plant";
    } else if (season === 'summer') {
      prompt += "peak summer growth, full foliage, flowers in full bloom if applicable";
    } else if (season === 'autumn') {
      prompt += "autumn colors, fall foliage, late season appearance";
    } else if (season === 'winter') {
      prompt += "winter appearance, dormant state, bare branches if deciduous";
    }
    
    prompt += ", professional botanical photography, white studio background";
    
    return prompt;
  }
}

export const fluxSpriteGenerator = new FluxSpriteGenerator();