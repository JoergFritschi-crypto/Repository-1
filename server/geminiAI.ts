import { GoogleGenAI, Modality } from "@google/genai";
import * as fs from "fs";
import { randomUUID } from "crypto";

// The newest Gemini model is "gemini-2.5-flash"
// Do not change this unless explicitly requested by the user
const DEFAULT_MODEL = "gemini-2.5-flash";
// IMPORTANT: Gemini 2.5 Flash Image is Google's most advanced image generation model
// Also known as "Nano Banana" - supports sophisticated image generation with consistency
const IMAGE_GENERATION_MODEL = "gemini-2.5-flash-image-preview";

interface GardenVisualizationResult {
  description: string;
  visualElements: string[];
  colorPalette: string[];
  seasonalChanges: {
    spring: string;
    summer: string;
    autumn: string;
    winter: string;
  };
  lightingRecommendations?: string;
}

class GeminiAI {
  private ai: GoogleGenAI;

  constructor(apiKey: string) {
    this.ai = new GoogleGenAI({ apiKey });
  }

  async generateGardenVisualization(gardenData: {
    shape: string;
    dimensions: any;
    plants: string[];
    style: string;
    features?: string[];
  }): Promise<GardenVisualizationResult> {
    try {
      const prompt = `Create a detailed visualization description for a garden with these specifications:
        Shape: ${gardenData.shape}
        Dimensions: ${JSON.stringify(gardenData.dimensions)}
        Plants: ${gardenData.plants.join(', ')}
        Style: ${gardenData.style}
        Features: ${gardenData.features?.join(', ') || 'None specified'}
        
        Provide a JSON response with:
        - description: detailed visual description
        - visualElements: array of key visual elements
        - colorPalette: array of dominant colors through the year
        - seasonalChanges: object with descriptions for each season (spring, summer, autumn, winter)
        - lightingRecommendations: optional lighting suggestions`;

      const response = await this.ai.models.generateContent({
        model: DEFAULT_MODEL,
        contents: prompt,
      });

      const text = response.text || "{}";
      const result = JSON.parse(text);

      return {
        description: result.description || '',
        visualElements: result.visualElements || [],
        colorPalette: result.colorPalette || [],
        seasonalChanges: result.seasonalChanges || {
          spring: '',
          summer: '',
          autumn: '',
          winter: ''
        },
        lightingRecommendations: result.lightingRecommendations
      };
    } catch (error) {
      console.error('Error generating visualization with Gemini:', error);
      throw new Error('Failed to generate garden visualization');
    }
  }

  async analyzeGardenPhoto(base64Image: string): Promise<{
    description: string;
    strengths: string[];
    improvements: string[];
    plantHealth: string;
    designScore: number;
  }> {
    try {
      const contents = [
        {
          inlineData: {
            data: base64Image,
            mimeType: "image/jpeg",
          },
        },
        `Analyze this garden photo and provide a JSON response with:
        - description: overall garden description
        - strengths: array of positive aspects
        - improvements: array of suggested improvements
        - plantHealth: general health assessment
        - designScore: design quality score from 1-10`,
      ];

      const response = await this.ai.models.generateContent({
        model: DEFAULT_MODEL,
        contents: contents,
      });

      const text = response.text || "{}";
      const result = JSON.parse(text);

      return {
        description: result.description || '',
        strengths: result.strengths || [],
        improvements: result.improvements || [],
        plantHealth: result.plantHealth || 'Unable to assess',
        designScore: result.designScore || 5
      };
    } catch (error) {
      console.error('Error analyzing garden photo with Gemini:', error);
      throw new Error('Failed to analyze garden photo');
    }
  }

  async generatePlantingCalendar(location: string, plants: string[], hardinessZone: string): Promise<{
    calendar: Array<{
      month: string;
      tasks: string[];
      plants: string[];
    }>;
    tips: string[];
  }> {
    try {
      const prompt = `Create a month-by-month planting and maintenance calendar for:
        Location: ${location}
        Hardiness Zone: ${hardinessZone}
        Plants: ${plants.join(', ')}
        
        Provide a JSON response with:
        - calendar: array of objects with month, tasks array, and plants array
        - tips: array of general gardening tips for this location`;

      const response = await this.ai.models.generateContent({
        model: DEFAULT_MODEL,
        contents: prompt,
      });

      const text = response.text || "{}";
      const result = JSON.parse(text);

      return {
        calendar: result.calendar || [],
        tips: result.tips || []
      };
    } catch (error) {
      console.error('Error generating planting calendar with Gemini:', error);
      throw new Error('Failed to generate planting calendar');
    }
  }

  async suggestCompanionPlants(mainPlant: string, gardenStyle: string): Promise<{
    companions: Array<{
      name: string;
      reason: string;
      placement: string;
    }>;
    avoid: string[];
  }> {
    try {
      const prompt = `Suggest companion plants for ${mainPlant} in a ${gardenStyle} garden.
        
        Provide a JSON response with:
        - companions: array of objects with name, reason, and placement
        - avoid: array of plants to avoid near ${mainPlant}`;

      const response = await this.ai.models.generateContent({
        model: DEFAULT_MODEL,
        contents: prompt,
      });

      const text = response.text || "{}";
      const result = JSON.parse(text);

      return {
        companions: result.companions || [],
        avoid: result.avoid || []
      };
    } catch (error) {
      console.error('Error suggesting companion plants with Gemini:', error);
      throw new Error('Failed to suggest companion plants');
    }
  }

  async generateImage(prompt: string): Promise<{ imageUrl?: string; imageData?: string }> {
    try {
      // Use the special image generation model
      const response = await this.ai.models.generateContent({
        model: IMAGE_GENERATION_MODEL,
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: {
          responseModalities: [Modality.TEXT, Modality.IMAGE],
        },
      });

      const candidates = response.candidates;
      if (!candidates || candidates.length === 0) {
        return {};
      }

      const content = candidates[0].content;
      if (!content || !content.parts) {
        return {};
      }

      for (const part of content.parts) {
        if (part.inlineData && part.inlineData.data) {
          // Return base64 encoded image data
          const imageData = `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
          return { imageData };
        }
      }

      return {};
    } catch (error) {
      console.error('Error generating image with Gemini:', error);
      throw new Error('Failed to generate image');
    }
  }

  async enhanceGardenToPhotorealistic(options: {
    imageBase64: string;
    plants: Array<{ 
      plantName: string; 
      scientificName?: string;
      x: number; 
      y: number; 
      height?: number;
      spread?: number;
      bloomStatus?: string;
      foliageType?: string;
      size: string;
    }>;
    gardenSize: string;
    season: string;
    style: string;
    botanicalContext?: string;
  }): Promise<string | null> {
    try {
      // Enhanced botanical identification for common plants
      const getBotanicalFeatures = (plantName: string, scientificName?: string): string => {
        const name = plantName.toLowerCase();
        const sciName = scientificName?.toLowerCase() || '';
        
        if (name.includes('rose') || sciName.includes('rosa')) {
          return 'ROSE BUSH with RED/PINK FLOWERS (multiple blooms visible), compound pinnate leaves with 5-7 leaflets, thorny green stems, bushy shrub form';
        } else if (name.includes('hosta') || sciName.includes('hosta')) {
          return 'HOSTA with large broad leaves showing parallel venation, clumping perennial forming dense mounds, shade-tolerant plant';
        } else if (name.includes('lavender') || sciName.includes('lavandula')) {
          return 'LAVENDER with narrow gray-green leaves, purple flower spikes rising above foliage, Mediterranean shrub';
        } else if (name.includes('maple') || sciName.includes('acer')) {
          return 'JAPANESE MAPLE with palmate leaves (5-7 lobes), small ornamental tree, graceful branching';
        } else if (name.includes('sunflower') || sciName.includes('helianthus')) {
          return 'SUNFLOWER with large rough leaves, tall stems, yellow daisy-like flowers with brown centers';
        }
        return '';
      };
      
      // Create detailed plant descriptions with botanical accuracy
      const plantDescriptions = options.plants.map((p, idx) => {
        const height = p.height ? `${p.height.toFixed(1)}m` : 
                      p.size === 'small' ? '0.3m' : 
                      p.size === 'large' ? '3-4m' : '1m';
        const spread = p.spread ? `${p.spread.toFixed(1)}m` : height;
        const botanical = p.scientificName ? ` [${p.scientificName}]` : '';
        const bloom = p.bloomStatus === 'blooming' ? ' (currently flowering)' : '';
        const foliage = p.foliageType ? `, ${p.foliageType} foliage` : '';
        const features = getBotanicalFeatures(p.plantName, p.scientificName);
        const plantNumber = idx + 1;
        const totalPlants = options.plants.length;
        
        return `Plant ${plantNumber} of ${totalPlants}: ${p.plantName}${botanical} at EXACT position (${p.x}%, ${p.y}%)
  Identification: ${features || 'Specific botanical features'}
  Size: Height ${height}, Spread ${spread}${bloom}${foliage}
  UNIQUE SPECIMEN: This is plant ${plantNumber} of exactly ${totalPlants} plants`;
      }).join('\n');
      
      // If botanical context is provided, use it for the main description
      const botanicalInfo = options.botanicalContext || plantDescriptions;
      
      const prompt = `Transform this garden layout into a photorealistic ${options.season} garden photograph.

CRITICAL PLANT COUNT:
- EXACT COUNT: ${options.plants.length} plants total - NO MORE, NO LESS
- SPECIES LIST: ${options.plants.map(p => p.plantName).join(', ')}
- VERIFICATION: Must show exactly ${options.plants.length} distinct plants
- NO background plants, NO filler vegetation, NO extras

GARDEN SPECIFICATIONS:
- Size: ${options.gardenSize}
- Season: ${options.season}
- Photography style: ${options.style}

BOTANICAL ACCURACY REQUIREMENTS:
${botanicalInfo}

CRITICAL INSTRUCTIONS:
1. PLANT COUNT: Show EXACTLY ${options.plants.length} plants - count them to verify
2. EXACT POSITIONING: Each plant must remain at its specified percentage coordinates
3. BOTANICAL ACCURACY: Render each plant with correct identifying features
   - ROSES: Must show flowers/blooms, compound leaves, thorny stems
   - HOSTAS: Large broad leaves with parallel veins, clumping form
   - LAVENDER: Purple flower spikes, gray-green narrow leaves
4. SEASONAL REALISM: Show appropriate bloom status, foliage color, and growth stage for ${options.season}
5. NO ADDITIONS: Do not add ANY plants not listed above
6. NO DUPLICATES: Each plant appears exactly once at its specified position
7. MAINTAIN COMPOSITION: Keep the exact spatial arrangement from the reference image

VERIFICATION CHECKLIST:
- Count plants: Should be exactly ${options.plants.length}
- Rose identification: Shows flowers and compound leaves
- Hosta identification: Shows broad leaves with parallel veins
- No extra plants in background or edges

The plants should look naturally established in the garden, not like overlaid sprites.
Create a cohesive, photorealistic garden scene while maintaining precise plant positions.`;
      
      const result = await this.generateImageWithReference(prompt, options.imageBase64);
      return result.imageData || result.imageUrl || null;
    } catch (error) {
      console.error('Error enhancing garden:', error);
      return null;
    }
  }

  async generateImageWithReference(prompt: string, referenceImageBase64: string): Promise<{ imageUrl?: string; imageData?: string }> {
    try {
      // Use the special image generation model with reference image
      const response = await this.ai.models.generateContent({
        model: IMAGE_GENERATION_MODEL,
        contents: [
          {
            role: "user", 
            parts: [
              {
                inlineData: {
                  data: referenceImageBase64,
                  mimeType: "image/jpeg"
                }
              },
              { text: prompt }
            ]
          }
        ],
        config: {
          responseModalities: [Modality.TEXT, Modality.IMAGE],
        },
      });

      const candidates = response.candidates;
      if (!candidates || candidates.length === 0) {
        return {};
      }

      const content = candidates[0].content;
      if (!content || !content.parts) {
        return {};
      }

      for (const part of content.parts) {
        if (part.inlineData && part.inlineData.data) {
          // Return base64 encoded image data
          const imageData = `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
          return { imageData };
        }
      }

      return {};
    } catch (error) {
      console.error('Error generating image with reference using Gemini:', error);
      throw new Error('Failed to generate image with reference');
    }
  }
}

export default GeminiAI;