import { GoogleGenAI } from "@google/genai";

// The newest Gemini model is "gemini-2.5-flash"
// Do not change this unless explicitly requested by the user
const DEFAULT_MODEL = "gemini-2.5-flash";

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
}

export default GeminiAI;