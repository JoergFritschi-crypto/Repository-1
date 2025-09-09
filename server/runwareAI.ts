import { Runware } from "@runware/sdk-js";

interface CanvasDesign {
  plants: Array<{
    plant: {
      id: string;
      name: string;
    };
    position: {
      x: number;
      y: number;
    };
  }>;
}

interface SeasonalImageOptions {
  season: string;
  specificTime: string;
  canvasDesign: CanvasDesign;
  gardenDimensions: { width: number; length: number };
  useReferenceMode?: boolean;
  referenceImage?: string;
}

class RunwareService {
  private runware: any;
  
  constructor() {
    if (!process.env.RUNWARE_API_KEY) {
      throw new Error('RUNWARE_API_KEY is not set');
    }
    // Initialize Runware with API key
    this.runware = new Runware({ 
      apiKey: process.env.RUNWARE_API_KEY 
    });
  }
  
  async connect() {
    // Some Runware SDK versions require connection
    if (this.runware.connect) {
      await this.runware.connect();
    }
  }

  async generateSeasonalImage(options: SeasonalImageOptions): Promise<string> {
    console.log('Runware: Starting image generation');
    const { season, specificTime, canvasDesign, gardenDimensions } = options;
    
    // Calculate grid positions for precise placement
    const gridWidth = Math.floor(gardenDimensions.width * 10);
    const gridLength = Math.floor(gardenDimensions.length * 10);
    
    // Build position specification for each plant
    const plantPositions = canvasDesign.plants.map((item) => {
      const gridX = Math.round(item.position.x * gridWidth / 100);
      const gridY = Math.round(item.position.y * gridLength / 100);
      
      // Convert canvas Y (0=top) to viewing Y (0=bottom/front)
      const viewY = gridLength - gridY;
      
      return {
        name: item.plant.name,
        gridX,
        viewY,
        depth: viewY < gridLength * 0.3 ? "foreground" : 
               viewY > gridLength * 0.7 ? "background" : "midground"
      };
    });

    // Build the prompt for Stable Diffusion
    // SD models follow instructions more literally than Gemini
    const prompt = this.buildPrompt(plantPositions, season, specificTime, canvasDesign.plants.length);
    const negativePrompt = this.buildNegativePrompt(canvasDesign.plants.length);
    
    console.log('Runware: Generated prompt:', prompt.substring(0, 200) + '...');

    try {
      let images;
      
      if (options.useReferenceMode && options.referenceImage) {
        // Use image-to-image for consistency across seasons
        // Connect if needed
        await this.connect();
        
        images = await this.runware.requestImages({
          positivePrompt: prompt,
          negativePrompt: negativePrompt,
          model: "civitai:4201@130072", // Realistic Vision V6.0 - photorealistic model
          height: 1088,  // Must be multiple of 64 (1088 = 17 * 64)
          width: 1920,   // 1920 = 30 * 64
          numberResults: 1,
          outputType: "URL",
          outputFormat: "PNG",
          seedImage: options.referenceImage, // Use reference for consistency
          strength: 0.65, // Keep composition but change season
          steps: 25,
          CFGScale: 7.5
        });
      } else {
        // Initial generation
        // Connect if needed
        await this.connect();
        
        images = await this.runware.requestImages({
          positivePrompt: prompt,
          negativePrompt: negativePrompt,
          model: "civitai:4201@130072", // Realistic Vision V6.0 - photorealistic model
          height: 1088,  // Must be multiple of 64 (1088 = 17 * 64)
          width: 1920,   // 1920 = 30 * 64
          numberResults: 1,
          outputType: "URL",
          outputFormat: "PNG",
          steps: 25,
          CFGScale: 7.5,
          seed: 42 // Fixed seed for more consistent layouts
        });
      }

      console.log('Runware: Response received:', JSON.stringify(images, null, 2));
      
      if (images && images.length > 0) {
        // Check different possible response formats
        const firstImage = images[0];
        const imageUrl = firstImage.imageURL || 
                        firstImage.imageUrl || 
                        firstImage.url ||
                        firstImage.imageBase64 ||
                        firstImage.base64 ||
                        '';
        
        if (imageUrl) {
          console.log('Runware: Returning image URL');
          return imageUrl;
        }
      }
      
      throw new Error('No image generated from Runware');
    } catch (error) {
      console.error('Runware generation error:', error);
      throw error;
    }
  }

  private buildPrompt(
    plantPositions: Array<{name: string, gridX: number, viewY: number, depth: string}>,
    season: string,
    specificTime: string,
    plantCount: number
  ): string {
    // Stable Diffusion responds better to descriptive, visual prompts
    // We'll be explicit about positioning using natural language
    
    const seasonDesc = this.getSeasonDescription(season, specificTime);
    
    // Build concise spatial description with visual hints
    let spatialDesc = `Plants: `;
    
    plantPositions.forEach((plant, index) => {
      const pos = plant.gridX < 20 ? "left" : 
                  plant.gridX > 70 ? "right" : "center";
      const depth = plant.depth === "foreground" ? "front" :
                    plant.depth === "background" ? "back" : "mid";
      
      // Add visual descriptors to help model distinguish plants
      let plantDesc = plant.name;
      if (plant.name.includes('Japanese Maple')) {
        plantDesc = 'red maple tree';
      } else if (plant.name.includes('Hosta')) {
        plantDesc = 'large-leaf hosta';
      } else if (plant.name.includes('Rose')) {
        plantDesc = 'red rose bush';
      } else if (plant.name.includes('Lavender')) {
        plantDesc = 'purple lavender';
      }
      
      spatialDesc += `${plantDesc} ${pos}-${depth}`;
      if (index < plantPositions.length - 1) spatialDesc += ", ";
    });

    return `RAW photo of garden with EXACTLY: ${spatialDesc}. ${seasonDesc}, photorealistic, wide view, show variety not repetition`;
  }

  private buildNegativePrompt(plantCount: number): string {
    // Explicitly tell SD what NOT to generate
    const extraCount = plantCount + 1;
    return `cartoon, anime, illustration, painting, blurry, distorted, 
      ${extraCount} plants, more than ${plantCount} plants, extra plants, 
      duplicate plants, crowded, overlapping plants, clustered plants,
      plants in wrong positions, aerial view, top-down view, bird's eye view,
      garden bed, mulch bed, raised bed, flower bed, border garden,
      close-up view, zoomed in, macro photography, narrow view,
      lupine, gerbera, daisy, tulip, daffodil, sunflower, peony, iris,
      wrong plants, different plants, substitute plants`;
  }

  private getSeasonDescription(season: string, specificTime: string): string {
    const seasonMap: Record<string, string> = {
      'Spring': 'early spring garden with fresh green growth, budding plants',
      'Summer': 'summer garden in full bloom, lush vegetation, vibrant colors',
      'Fall': 'autumn garden with changing foliage, warm colors, mature plants',
      'Winter': 'winter garden with dormant plants, frost, muted colors'
    };
    
    return seasonMap[season] || `${specificTime} garden scene`;
  }
}

export const runwareService = new RunwareService();
export const runwareAI = runwareService.runware;
export const runwareModels = {
  civitai_74407: "civitai:74407@95489"  // Photorealistic Vision model
};