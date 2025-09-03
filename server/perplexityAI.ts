interface PerplexityMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface PerplexityResponse {
  id: string;
  model: string;
  object: string;
  created: number;
  citations?: string[];
  choices: Array<{
    index: number;
    finish_reason: string;
    message: {
      role: string;
      content: string;
    };
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

class PerplexityAI {
  private apiKey: string;
  private apiUrl = 'https://api.perplexity.ai/chat/completions';
  
  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private async makeRequest(messages: PerplexityMessage[], options: any = {}): Promise<PerplexityResponse> {
    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-sonar-small-128k-online',
        messages,
        max_tokens: options.maxTokens || 1024,
        temperature: options.temperature || 0.7,
        top_p: options.topP || 0.9,
        search_domain_filter: options.searchDomainFilter || [],
        return_images: false,
        return_related_questions: false,
        search_recency_filter: options.searchRecencyFilter || 'month',
        stream: false,
        ...options
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Perplexity API error: ${response.status} - ${error}`);
    }

    return response.json();
  }

  async generateGardenDesign(gardenData: {
    location: string;
    shape: string;
    dimensions: any;
    hardiness_zone?: string;
    sun_exposure?: string;
    design_approach?: string;
    preferences?: any;
  }): Promise<{
    layout: any;
    plantRecommendations: Array<{
      name: string;
      scientific_name?: string;
      quantity: number;
      placement: string;
      reason: string;
    }>;
    designNotes: string;
  }> {
    const messages: PerplexityMessage[] = [
      {
        role: 'system',
        content: `You are an expert garden designer specializing in British ornamental gardens. 
          Create detailed, practical garden designs based on the provided specifications.
          Your designs should consider climate, hardiness zones, sun exposure, and aesthetic preferences.
          Always provide specific plant recommendations with scientific names when possible.
          Output your response in JSON format with keys: 
          "layout" (object with zones and features), 
          "plantRecommendations" (array of plant objects with name, scientific_name, quantity, placement, reason),
          "designNotes" (string with design philosophy and care tips).`
      },
      {
        role: 'user',
        content: `Design an ornamental garden with these specifications:
          Location: ${gardenData.location}
          Shape: ${gardenData.shape}
          Dimensions: ${JSON.stringify(gardenData.dimensions)}
          Hardiness Zone: ${gardenData.hardiness_zone || 'Not specified'}
          Sun Exposure: ${gardenData.sun_exposure || 'Mixed'}
          Design Approach: ${gardenData.design_approach || 'Traditional'}
          Preferences: ${JSON.stringify(gardenData.preferences || {})}
          
          Please create a cohesive design that:
          1. Works well in the British climate
          2. Provides year-round interest
          3. Is suitable for the specified conditions
          4. Includes a mix of trees, shrubs, perennials, and seasonal bulbs
          5. Considers maintenance requirements`
      }
    ];

    try {
      const response = await this.makeRequest(messages, {
        maxTokens: 2000,
        temperature: 0.8,
        searchRecencyFilter: 'year',
        searchDomainFilter: ['rhs.org.uk', 'gardenersworld.com', 'bbc.co.uk/gardening']
      });

      const content = response.choices[0].message.content;
      const parsedContent = JSON.parse(content);

      return {
        layout: parsedContent.layout || {},
        plantRecommendations: parsedContent.plantRecommendations || [],
        designNotes: parsedContent.designNotes || ''
      };
    } catch (error) {
      console.error('Error generating garden design:', error);
      throw new Error('Failed to generate garden design using Perplexity AI');
    }
  }

  async identifyPlant(imageUrl: string, additionalNotes?: string): Promise<{
    plantName: string;
    scientificName?: string;
    confidence: number;
    description: string;
    careInstructions?: string;
    possibleDiseases?: string[];
    isWeed?: boolean;
  }> {
    const messages: PerplexityMessage[] = [
      {
        role: 'system',
        content: `You are an expert botanist and horticulturist with extensive knowledge of British garden plants.
          Identify plants from descriptions and provide detailed information about them.
          Include care instructions and potential issues.
          Output your response in JSON format with keys:
          "plantName" (common name),
          "scientificName" (Latin name if known),
          "confidence" (0-1 scale),
          "description" (brief description),
          "careInstructions" (how to care for it),
          "possibleDiseases" (array of potential issues),
          "isWeed" (boolean, true if it's a common weed).`
      },
      {
        role: 'user',
        content: `Please identify this plant based on the following information:
          Image URL: ${imageUrl}
          Additional Notes: ${additionalNotes || 'None provided'}
          
          Provide identification with confidence level and detailed information about the plant,
          including whether it's suitable for British gardens.`
      }
    ];

    try {
      const response = await this.makeRequest(messages, {
        maxTokens: 1000,
        temperature: 0.5,
        searchRecencyFilter: 'year'
      });

      const content = response.choices[0].message.content;
      const parsedContent = JSON.parse(content);

      return {
        plantName: parsedContent.plantName || 'Unknown',
        scientificName: parsedContent.scientificName,
        confidence: parsedContent.confidence || 0.5,
        description: parsedContent.description || '',
        careInstructions: parsedContent.careInstructions,
        possibleDiseases: parsedContent.possibleDiseases || [],
        isWeed: parsedContent.isWeed || false
      };
    } catch (error) {
      console.error('Error identifying plant:', error);
      throw new Error('Failed to identify plant using Perplexity AI');
    }
  }

  async getDiseaseAnalysis(imageUrl: string, symptoms: string): Promise<{
    diagnosis: string;
    confidence: number;
    treatment: string;
    prevention: string;
  }> {
    const messages: PerplexityMessage[] = [
      {
        role: 'system',
        content: `You are a plant pathologist specializing in garden plant diseases and pests.
          Diagnose plant health issues and provide treatment recommendations.
          Output your response in JSON format with keys:
          "diagnosis" (what's wrong with the plant),
          "confidence" (0-1 scale),
          "treatment" (how to fix it),
          "prevention" (how to prevent it in future).`
      },
      {
        role: 'user',
        content: `Analyze this plant health issue:
          Image URL: ${imageUrl}
          Symptoms: ${symptoms}
          
          Please provide a diagnosis with treatment and prevention recommendations
          suitable for home gardeners in the UK.`
      }
    ];

    try {
      const response = await this.makeRequest(messages, {
        maxTokens: 1000,
        temperature: 0.5
      });

      const content = response.choices[0].message.content;
      const parsedContent = JSON.parse(content);

      return {
        diagnosis: parsedContent.diagnosis || 'Unable to determine',
        confidence: parsedContent.confidence || 0.5,
        treatment: parsedContent.treatment || 'General plant care recommended',
        prevention: parsedContent.prevention || 'Maintain good garden hygiene'
      };
    } catch (error) {
      console.error('Error analyzing plant disease:', error);
      throw new Error('Failed to analyze plant disease using Perplexity AI');
    }
  }

  async getWeedIdentification(imageUrl: string, location: string): Promise<{
    weedName: string;
    scientificName?: string;
    isInvasive: boolean;
    removalMethod: string;
    prevention: string;
  }> {
    const messages: PerplexityMessage[] = [
      {
        role: 'system',
        content: `You are a weed identification expert familiar with British garden weeds.
          Identify weeds and provide removal recommendations.
          Output your response in JSON format with keys:
          "weedName" (common name),
          "scientificName" (Latin name),
          "isInvasive" (boolean),
          "removalMethod" (how to remove it),
          "prevention" (how to prevent regrowth).`
      },
      {
        role: 'user',
        content: `Identify this potential weed:
          Image URL: ${imageUrl}
          Location: ${location}
          
          Provide identification and safe, effective removal methods suitable for UK gardens.`
      }
    ];

    try {
      const response = await this.makeRequest(messages, {
        maxTokens: 800,
        temperature: 0.5
      });

      const content = response.choices[0].message.content;
      const parsedContent = JSON.parse(content);

      return {
        weedName: parsedContent.weedName || 'Unknown weed',
        scientificName: parsedContent.scientificName,
        isInvasive: parsedContent.isInvasive || false,
        removalMethod: parsedContent.removalMethod || 'Manual removal recommended',
        prevention: parsedContent.prevention || 'Regular monitoring and mulching'
      };
    } catch (error) {
      console.error('Error identifying weed:', error);
      throw new Error('Failed to identify weed using Perplexity AI');
    }
  }
}

export default PerplexityAI;