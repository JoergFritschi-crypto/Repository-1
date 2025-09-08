// Flux AI for precise garden visualization
import fetch from "node-fetch";

interface GardenVisualizationRequest {
  plantPositions: Array<{
    name: string;
    gridX: number;
    gridY: number;
    depth: string;
  }>;
  gardenDimensions: {
    width: number;
    height: number;
  };
  season: string;
  climate?: string;
}

export class FluxAI {
  private apiKey: string;
  
  constructor() {
    if (!process.env.HUGGINGFACE_API_KEY) {
      throw new Error("HUGGINGFACE_API_KEY is required for Flux");
    }
    this.apiKey = process.env.HUGGINGFACE_API_KEY;
  }
  
  async generateGardenVisualization(request: GardenVisualizationRequest): Promise<string> {
    console.log("Flux: Generating precise garden visualization");
    
    // Build detailed prompt for Flux with emphasis on plant variety
    const prompt = this.buildFluxPrompt(request);
    console.log("Flux prompt:", prompt);
    
    // Use Flux Dev for better prompt adherence to plant variety
    // Flux Dev has better accuracy than Schnell for complex scenes
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
              num_inference_steps: 28,  // Optimal for Flux Dev
              guidance_scale: 3.5,      // Good balance for Flux Dev
              width: 1024,              // Flux works best at 1024x1024
              height: 1024,
              seed: 42                  // For consistency during testing
            },
            options: {
              wait_for_model: true,
              use_cache: false
            }
          }),
          signal: AbortSignal.timeout(60000) // 60 second timeout for Flux
        }
      );
      
      if (response.ok) {
        const buffer = await response.arrayBuffer();
        const base64 = Buffer.from(buffer).toString('base64');
        const dataUrl = `data:image/png;base64,${base64}`;
        console.log("Flux: Successfully generated garden image");
        return dataUrl;
      } else if (response.status === 503) {
        // Model is loading, wait and retry
        const text = await response.text();
        const data = JSON.parse(text);
        if (data.estimated_time) {
          console.log(`Flux: Model loading, waiting ${Math.ceil(data.estimated_time)}s...`);
          await new Promise(r => setTimeout(r, Math.min(data.estimated_time * 1000, 30000)));
          
          // Retry once after waiting
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
            const base64 = Buffer.from(buffer).toString('base64');
            const dataUrl = `data:image/png;base64,${base64}`;
            console.log("Flux: Successfully generated garden image (after retry)");
            return dataUrl;
          }
        }
        throw new Error(`Flux model failed to load: ${response.status}`);
      } else {
        const errorText = await response.text();
        throw new Error(`Flux generation failed: ${response.status} - ${errorText}`);
      }
    } catch (error: any) {
      console.error("Flux generation error:", error);
      throw error;
    }
  }
  
  private buildFluxPrompt(request: GardenVisualizationRequest): string {
    const { plantPositions } = request;
    const plantCount = plantPositions.length;
    
    // Group plants by species to emphasize variety
    const plantSpecies = new Set(plantPositions.map(p => this.simplifyPlantName(p.name)));
    const speciesCount = plantSpecies.size;
    
    // Build a clear, structured prompt that Flux can follow accurately
    let prompt = `A photorealistic garden photograph showing EXACTLY ${speciesCount} different plant species: `;
    
    // List each unique species clearly
    const speciesList = Array.from(plantSpecies);
    speciesList.forEach((species, index) => {
      const count = plantPositions.filter(p => this.simplifyPlantName(p.name) === species).length;
      if (count > 1) {
        prompt += `${count} ${species} plants`;
      } else {
        prompt += `1 ${species}`;
      }
      if (index < speciesList.length - 1) prompt += ", ";
    });
    
    prompt += ". ";
    
    // Add positioning details
    prompt += "Garden layout: ";
    plantPositions.forEach((plant, index) => {
      const pos = this.getPositionDescription(plant);
      prompt += `${this.simplifyPlantName(plant.name)} at ${pos}`;
      if (index < plantPositions.length - 1) prompt += ", ";
    });
    
    // Add visual style and quality descriptors
    prompt += ". Professional garden photography, natural daylight, wide angle view showing all plants clearly separated and distinguishable, ";
    prompt += "each plant species visually distinct, green lawn background, high detail, sharp focus, photorealistic rendering";
    
    return prompt;
  }
  
  private simplifyPlantName(name: string): string {
    // Extract the essential plant name for clearer prompts
    if (name.includes('Japanese Maple')) return 'Japanese Maple tree';
    if (name.includes('Hosta')) return 'Hosta with large leaves';
    if (name.includes('Rose')) return 'Rose bush with red flowers';
    if (name.includes('Lavender')) return 'Lavender with purple spikes';
    if (name.includes('Hydrangea')) return 'Hydrangea bush';
    if (name.includes('Peony')) return 'Peony with pink blooms';
    if (name.includes('Iris')) return 'Bearded Iris';
    if (name.includes('Daylily')) return 'Daylily flowers';
    if (name.includes('Astilbe')) return 'Astilbe plumes';
    if (name.includes('Salvia')) return 'Salvia spikes';
    return name;
  }
  
  private getPositionDescription(plant: any): string {
    const horizontal = plant.gridX < 33 ? "left" : plant.gridX > 66 ? "right" : "center";
    const depth = plant.depth === "foreground" ? "foreground" : 
                  plant.depth === "background" ? "background" : "middle";
    return `${horizontal} ${depth}`;
  }
}

export const fluxAI = new FluxAI();