import Anthropic from '@anthropic-ai/sdk';

// The newest Anthropic model is "claude-sonnet-4-20250514", not older 3.x models
// Keep this unless explicitly requested to change
const DEFAULT_MODEL = "claude-3-5-sonnet-20241022"; // Using stable version for production

interface PlantIdentificationResult {
  plantName: string;
  scientificName?: string;
  confidence: number;
  description: string;
  careInstructions?: string;
  nativeRegion?: string;
  hardinessZone?: string;
  sunRequirements?: string;
  waterNeeds?: string;
  soilPreference?: string;
  matureSize?: string;
  bloomTime?: string;
  toxicity?: string;
}

interface DiseaseAnalysisResult {
  diagnosis: string;
  confidence: number;
  severity: 'mild' | 'moderate' | 'severe';
  treatment: string;
  organicTreatment?: string;
  prevention: string;
  affectedParts: string[];
  spreadRisk: 'low' | 'medium' | 'high';
}

interface WeedIdentificationResult {
  weedName: string;
  scientificName?: string;
  isInvasive: boolean;
  spreadMethod: string;
  removalMethod: string;
  organicControl?: string;
  chemicalControl?: string;
  prevention: string;
  seedViability?: string;
}

class AnthropicAI {
  private anthropic: Anthropic;

  constructor(apiKey: string) {
    this.anthropic = new Anthropic({
      apiKey: apiKey,
    });
  }

  async identifyPlant(imageBase64: string, additionalNotes?: string): Promise<PlantIdentificationResult> {
    try {
      const message = await this.anthropic.messages.create({
        model: DEFAULT_MODEL,
        max_tokens: 1500,
        system: `You are an expert botanist specializing in ornamental garden plants, particularly those suitable for British gardens. 
          Analyze plant images and provide detailed, accurate identification.
          Always respond in valid JSON format with the exact keys specified.
          If uncertain, provide your best assessment with an appropriate confidence level.`,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Please identify this plant and provide detailed information.
                ${additionalNotes ? `Additional context: ${additionalNotes}` : ''}
                
                Respond with JSON containing these keys:
                - plantName: common name
                - scientificName: Latin/botanical name
                - confidence: 0-1 scale
                - description: detailed description
                - careInstructions: care tips
                - nativeRegion: where it's from
                - hardinessZone: USDA/RHS zones
                - sunRequirements: Full Sun/Partial Sun/Part Shade/Shade
                - waterNeeds: watering requirements
                - soilPreference: soil type preferences
                - matureSize: expected size
                - bloomTime: when it flowers
                - toxicity: safety for pets/children`
              },
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: 'image/jpeg',
                  data: imageBase64
                }
              }
            ]
          }
        ]
      });

      const content = message.content[0].type === 'text' ? message.content[0].text : '';
      const result = JSON.parse(content);
      
      return {
        plantName: result.plantName || 'Unknown',
        scientificName: result.scientificName,
        confidence: result.confidence || 0.5,
        description: result.description || '',
        careInstructions: result.careInstructions,
        nativeRegion: result.nativeRegion,
        hardinessZone: result.hardinessZone,
        sunRequirements: result.sunRequirements,
        waterNeeds: result.waterNeeds,
        soilPreference: result.soilPreference,
        matureSize: result.matureSize,
        bloomTime: result.bloomTime,
        toxicity: result.toxicity
      };
    } catch (error) {
      console.error('Error identifying plant with Anthropic:', error);
      throw new Error('Failed to identify plant');
    }
  }

  async analyzePlantDisease(imageBase64: string, symptoms: string): Promise<DiseaseAnalysisResult> {
    try {
      const message = await this.anthropic.messages.create({
        model: DEFAULT_MODEL,
        max_tokens: 1500,
        system: `You are a plant pathologist with expertise in garden plant diseases, pests, and disorders.
          Provide accurate diagnosis and practical treatment advice suitable for home gardeners.
          Focus on both conventional and organic treatment options.
          Always respond in valid JSON format.`,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Analyze this plant health issue.
                Symptoms described: ${symptoms}
                
                Respond with JSON containing:
                - diagnosis: what's wrong
                - confidence: 0-1 scale
                - severity: mild/moderate/severe
                - treatment: conventional treatment
                - organicTreatment: organic alternatives
                - prevention: preventive measures
                - affectedParts: array of affected plant parts
                - spreadRisk: low/medium/high risk of spreading`
              },
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: 'image/jpeg',
                  data: imageBase64
                }
              }
            ]
          }
        ]
      });

      const content = message.content[0].type === 'text' ? message.content[0].text : '';
      const result = JSON.parse(content);
      
      return {
        diagnosis: result.diagnosis || 'Unable to determine',
        confidence: result.confidence || 0.5,
        severity: result.severity || 'moderate',
        treatment: result.treatment || 'General plant care recommended',
        organicTreatment: result.organicTreatment,
        prevention: result.prevention || 'Maintain good garden hygiene',
        affectedParts: result.affectedParts || [],
        spreadRisk: result.spreadRisk || 'medium'
      };
    } catch (error) {
      console.error('Error analyzing disease with Anthropic:', error);
      throw new Error('Failed to analyze plant disease');
    }
  }

  async identifyWeed(imageBase64: string, location: string): Promise<WeedIdentificationResult> {
    try {
      const message = await this.anthropic.messages.create({
        model: DEFAULT_MODEL,
        max_tokens: 1200,
        system: `You are a weed identification expert familiar with British and European garden weeds.
          Provide accurate identification and effective, safe removal methods.
          Consider both organic and conventional control methods.
          Always respond in valid JSON format.`,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Identify this potential weed found in ${location}.
                
                Respond with JSON containing:
                - weedName: common name
                - scientificName: Latin name
                - isInvasive: boolean
                - spreadMethod: how it spreads
                - removalMethod: best removal technique
                - organicControl: organic control methods
                - chemicalControl: chemical options if needed
                - prevention: prevention strategies
                - seedViability: how long seeds remain viable`
              },
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: 'image/jpeg',
                  data: imageBase64
                }
              }
            ]
          }
        ]
      });

      const content = message.content[0].type === 'text' ? message.content[0].text : '';
      const result = JSON.parse(content);
      
      return {
        weedName: result.weedName || 'Unknown weed',
        scientificName: result.scientificName,
        isInvasive: result.isInvasive || false,
        spreadMethod: result.spreadMethod || 'Seeds',
        removalMethod: result.removalMethod || 'Manual removal',
        organicControl: result.organicControl,
        chemicalControl: result.chemicalControl,
        prevention: result.prevention || 'Regular monitoring',
        seedViability: result.seedViability
      };
    } catch (error) {
      console.error('Error identifying weed with Anthropic:', error);
      throw new Error('Failed to identify weed');
    }
  }

  async getGardeningAdvice(question: string, context?: any): Promise<string> {
    try {
      const message = await this.anthropic.messages.create({
        model: DEFAULT_MODEL,
        max_tokens: 1000,
        system: `You are a friendly, knowledgeable gardening expert specializing in British ornamental gardens.
          Provide practical, actionable advice suitable for home gardeners.
          Consider the UK climate and growing conditions.`,
        messages: [
          {
            role: 'user',
            content: `${question}${context ? `\n\nContext: ${JSON.stringify(context)}` : ''}`
          }
        ]
      });

      return message.content[0].type === 'text' ? message.content[0].text : '';
    } catch (error) {
      console.error('Error getting gardening advice:', error);
      throw new Error('Failed to get gardening advice');
    }
  }

  async extractPlantData(markdown: string, pageUrl: string): Promise<any> {
    try {
      const prompt = `You are a botanical data extraction expert. Analyze this German nursery product page and extract structured plant data.

Page URL: ${pageUrl}
Content:
${markdown.substring(0, 5000)}

Extract the following information and respond in JSON format:
{
  "common_name": "German common name from the page",
  "scientific_name": "Scientific/botanical Latin name (e.g., Acaena buchananii)",
  "description": "Full plant description in German (the actual descriptive paragraph about the plant's appearance and characteristics, NOT the name)",
  "price": "Price in euros if present (e.g., €12,90)",
  "height": "Height range WITH UNITS (look for Wuchshöhe, Höhe, or height - e.g., '5-10 cm', '0.3-0.5 m', 'bis 50 cm')",
  "spread": "Width/spread range WITH UNITS (look for Wuchsbreite, Breite, Pflanzabstand, or spread - e.g., '30-40 cm')",
  "bloom_time": "Blooming period (e.g., Juni-August, Mai bis September)",
  "sunlight": "Sun requirements - MUST be one of these exact values: 'full sun', 'partial shade', 'full shade', or 'sun to partial shade'",
  "water": "Water requirements (trocken/dry, mäßig/moderate, feucht/moist)",
  "hardiness": "Hardiness zone if mentioned (e.g., Z3, Zone 3-7, winterhart bis -30°C)",
  "soil": "Soil requirements (e.g., durchlässig, humos, sandig)",
  "flower_color": "Flower color in German (e.g., gelb, rot, violett)",
  "foliage_color": "Foliage color in German (e.g., grün, blaugrün, silbrig)",
  "growth_habit": "Growth habit in German (e.g., kriechend, aufrecht, polsterbildend, horstig)"
}

CRITICAL EXTRACTION RULES:
1. HEIGHT: Look for "Wuchshöhe", "Höhe", or height measurements. ALWAYS include units (cm, m).
2. SPREAD: Look for "Wuchsbreite", "Breite", "Pflanzabstand", or width measurements. ALWAYS include units.
3. SUNLIGHT: Must translate German terms to English:
   - "sonnig" or "volle Sonne" → "full sun"
   - "halbschattig" or "Halbschatten" → "partial shade"
   - "schattig" or "Schatten" → "full shade"
   - "sonnig bis halbschattig" → "sun to partial shade"
4. DESCRIPTION: Extract the actual descriptive text about the plant's characteristics, NOT just its name or shipping info.
5. Do NOT put descriptions in the sunlight field or common names in the description field.`;

      const message = await this.anthropic.messages.create({
        model: DEFAULT_MODEL,
        max_tokens: 1500,
        system: 'You are an expert at extracting structured botanical data from German nursery websites. Always respond with valid JSON. Be very careful to put the right data in the right fields.',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      });

      const content = message.content[0].type === 'text' ? message.content[0].text : '';
      return JSON.parse(content);
    } catch (error) {
      console.error('Error extracting plant data with Anthropic:', error);
      throw error;
    }
  }
}

export default AnthropicAI;