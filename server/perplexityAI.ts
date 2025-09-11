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
        model: options.model || 'sonar-pro',
        messages,
        max_tokens: options.maxTokens || 1024,
        temperature: options.temperature || 0.7,
        top_p: options.topP || 0.9,
        search_domain_filter: options.searchDomainFilter || [],
        return_images: false,
        return_related_questions: false,
        search_recency_filter: options.searchRecencyFilter || 'month',
        stream: false,
        presence_penalty: 0,
        frequency_penalty: 1
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

  // Regional fallbacks for countries without local testing services
  private getRegionalFallbacks(country: string): string[] {
    const fallbacks: { [key: string]: string[] } = {
      // Europe - Small countries
      'Andorra': ['Spain', 'France'],
      'Monaco': ['France', 'Italy'],
      'Liechtenstein': ['Switzerland', 'Austria'],
      'San Marino': ['Italy'],
      'Vatican City': ['Italy'],
      'Malta': ['Italy', 'UK'],
      'Luxembourg': ['Belgium', 'Germany', 'France'],
      
      // Caribbean
      'Antigua and Barbuda': ['Trinidad and Tobago', 'USA'],
      'Saint Kitts and Nevis': ['Trinidad and Tobago', 'Puerto Rico'],
      'Saint Lucia': ['Trinidad and Tobago', 'Barbados'],
      'Saint Vincent and the Grenadines': ['Trinidad and Tobago', 'Barbados'],
      'Grenada': ['Trinidad and Tobago', 'Barbados'],
      'Dominica': ['Trinidad and Tobago', 'Puerto Rico'],
      
      // Pacific Islands
      'Nauru': ['Australia', 'New Zealand'],
      'Tuvalu': ['Australia', 'New Zealand'],
      'Palau': ['Philippines', 'Australia'],
      'Marshall Islands': ['USA', 'Australia'],
      'Kiribati': ['Australia', 'New Zealand'],
      'Samoa': ['New Zealand', 'Australia'],
      'Tonga': ['New Zealand', 'Australia'],
      'Vanuatu': ['Australia', 'New Zealand'],
      'Solomon Islands': ['Australia', 'Papua New Guinea'],
      
      // Africa - Small countries
      'Sao Tome and Principe': ['Portugal', 'Ghana', 'Nigeria'],
      'Seychelles': ['South Africa', 'Kenya'],
      'Comoros': ['Madagascar', 'South Africa'],
      'Cape Verde': ['Portugal', 'Senegal'],
      'Djibouti': ['Ethiopia', 'Kenya'],
      'Gambia': ['Senegal'],
      'Guinea-Bissau': ['Senegal', 'Portugal'],
      'Lesotho': ['South Africa'],
      'Swaziland': ['South Africa'],
      
      // Asia - Small countries
      'Maldives': ['India', 'Sri Lanka'],
      'Bhutan': ['India'],
      'Brunei': ['Malaysia', 'Singapore'],
      'East Timor': ['Indonesia', 'Australia'],
      
      // Middle East
      'Bahrain': ['Saudi Arabia', 'UAE'],
      'Qatar': ['Saudi Arabia', 'UAE'],
      'Kuwait': ['Saudi Arabia', 'UAE'],
    };
    
    return fallbacks[country] || [];
  }

  async findSoilTestingServices(location: string): Promise<{
    providers: Array<{
      name: string;
      type: 'commercial' | 'university' | 'government' | 'cooperative';
      services: string[];
      priceRange?: string;
      turnaroundTime?: string;
      website?: string;
      phone?: string;
      address?: string;
      specialNotes?: string;
    }>;
    samplingGuidance: {
      howToSample: string[];
      whatToRequest: string[];
      bestTimeToTest: string;
      frequency: string;
    };
    interpretation: {
      keyMetrics: string[];
      optimalRanges: any;
      commonAmendments: string[];
    };
  }> {
    // Get regional fallbacks if needed
    const fallbackCountries = this.getRegionalFallbacks(location);
    const searchLocations = fallbackCountries.length > 0 
      ? `${location} (or nearby: ${fallbackCountries.join(', ')})` 
      : location;
    
    const messages: PerplexityMessage[] = [
      {
        role: 'system',
        content: `You are an expert gardening advisor with extensive knowledge of soil testing services worldwide.
          Find local soil testing laboratories and services for the specified location.
          If the primary country doesn't have local services, provide options from nearby countries.
          Prioritize professional labs, university extension services, and government agricultural services.
          For small countries, include services from neighboring countries that accept international samples.
          Always indicate which country each service is located in.
          Output your response in JSON format with the exact structure specified.`
      },
      {
        role: 'user',
        content: `Find professional soil testing services for: ${searchLocations}
          
          ${fallbackCountries.length > 0 ? 
            `Note: ${location} may not have local testing facilities. Please include services from ${fallbackCountries.join(' and ')} that accept samples from ${location}. Clearly indicate which country each lab is in.` : ''}
          
          Please provide:
          1. At least 3 local soil testing providers (commercial labs, university extensions, or government services)
          2. What types of tests to request for ornamental garden use
          3. How to properly collect soil samples
          4. Typical costs and turnaround times
          5. How to interpret the results
          
          Focus on services that provide comprehensive nutrient analysis including:
          - NPK levels
          - Secondary nutrients (Ca, Mg, S)
          - Micronutrients (Fe, Mn, Zn, Cu, B, Mo)
          - Organic matter percentage
          - CEC (Cation Exchange Capacity)
          - pH and buffer pH
          
          Output as JSON with keys:
          "providers" (array of provider objects with name, type, services, priceRange, turnaroundTime, website, phone, address, specialNotes),
          "samplingGuidance" (object with howToSample array, whatToRequest array, bestTimeToTest, frequency),
          "interpretation" (object with keyMetrics array, optimalRanges object, commonAmendments array)`
      }
    ];

    try {
      const response = await this.makeRequest(messages, {
        model: 'sonar-pro',
        maxTokens: 2500,
        temperature: 0.3,
        searchRecencyFilter: 'month'
      });

      const content = response.choices[0].message.content;
      
      // Try to parse the JSON response
      let parsedContent;
      try {
        // First attempt: direct parse
        parsedContent = JSON.parse(content);
      } catch (parseError) {
        // Second attempt: extract JSON from markdown code block
        const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (codeBlockMatch) {
          try {
            parsedContent = JSON.parse(codeBlockMatch[1]);
          } catch (e) {
            // Code block content might be truncated or malformed
            // Try to fix common issues
            let fixedJson = codeBlockMatch[1];
            
            // Add closing brackets/braces if truncated
            const openBraces = (fixedJson.match(/\{/g) || []).length;
            const closeBraces = (fixedJson.match(/\}/g) || []).length;
            const openBrackets = (fixedJson.match(/\[/g) || []).length;
            const closeBrackets = (fixedJson.match(/\]/g) || []).length;
            
            for (let i = 0; i < openBrackets - closeBrackets; i++) {
              fixedJson += ']';
            }
            for (let i = 0; i < openBraces - closeBraces; i++) {
              fixedJson += '}';
            }
            
            try {
              parsedContent = JSON.parse(fixedJson);
            } catch (e2) {
              console.error('Could not parse code block JSON even after fixes');
            }
          }
        }
        
        // Third attempt: extract and fix raw JSON
        if (!parsedContent) {
          // Find the first { and try to extract a valid JSON object
          const startIndex = content.indexOf('{');
          if (startIndex >= 0) {
            let jsonStr = content.substring(startIndex);
            
            // Truncate at a reasonable point if it's incomplete
            const lastValidClose = Math.max(
              jsonStr.lastIndexOf('}}'),
              jsonStr.lastIndexOf('}]'),
              jsonStr.lastIndexOf(']}'),
              jsonStr.lastIndexOf('}')
            );
            
            if (lastValidClose > 0) {
              jsonStr = jsonStr.substring(0, lastValidClose + 1);
            }
            
            // Add missing closing brackets
            const openBraces = (jsonStr.match(/\{/g) || []).length;
            const closeBraces = (jsonStr.match(/\}/g) || []).length;
            const openBrackets = (jsonStr.match(/\[/g) || []).length;
            const closeBrackets = (jsonStr.match(/\]/g) || []).length;
            
            for (let i = 0; i < openBrackets - closeBrackets; i++) {
              jsonStr += ']';
            }
            for (let i = 0; i < openBraces - closeBraces; i++) {
              jsonStr += '}';
            }
            
            try {
              parsedContent = JSON.parse(jsonStr);
            } catch (e) {
              console.error('Could not parse extracted JSON:', e.message);
              throw new Error('Unable to parse response from Perplexity API');
            }
          }
        }
      }

      // Ensure all required fields are present with defaults
      return {
        providers: parsedContent.providers || [],
        samplingGuidance: parsedContent.samplingGuidance || {
          howToSample: [
            "Take 10-15 samples from different areas of your garden",
            "Sample to a depth of 6-8 inches for established gardens",
            "Mix samples thoroughly in a clean bucket",
            "Take about 2 cups of the mixed soil for testing",
            "Avoid sampling recently fertilized areas"
          ],
          whatToRequest: [
            "Complete nutrient analysis",
            "Organic matter percentage",
            "CEC and base saturation",
            "Recommendations for ornamental plants"
          ],
          bestTimeToTest: "Early spring or fall",
          frequency: "Every 2-3 years for established gardens"
        },
        interpretation: parsedContent.interpretation || {
          keyMetrics: [
            "pH (6.0-7.0 for most ornamentals)",
            "Organic matter (3-5% ideal)",
            "NPK levels",
            "CEC (10-20 meq/100g for loam)"
          ],
          optimalRanges: {
            pH: "6.0-7.0",
            organicMatter: "3-5%",
            nitrogen: "20-40 ppm",
            phosphorus: "20-40 ppm",
            potassium: "150-250 ppm"
          },
          commonAmendments: [
            "Lime for raising pH",
            "Sulfur for lowering pH",
            "Compost for organic matter",
            "Balanced fertilizers for nutrient deficiencies"
          ]
        }
      };
    } catch (error) {
      console.error('Error finding soil testing services:', error);
      throw new Error('Failed to find soil testing services');
    }
  }

  async extractPlantData(markdown: string, pageUrl: string): Promise<any> {
    const messages: PerplexityMessage[] = [
      {
        role: 'system',
        content: 'You are an expert at extracting structured botanical data from German nursery websites. Always respond with valid JSON. Be very careful to put the right data in the right fields.'
      },
      {
        role: 'user',
        content: `You are a botanical data extraction expert. Analyze this German nursery product page and extract structured plant data.

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
5. Do NOT put descriptions in the sunlight field or common names in the description field.`
      }
    ];

    try {
      const response = await this.makeRequest(messages, {
        model: 'llama-3.1-sonar-small-128k-online', // Use specific model for better extraction
        maxTokens: 1500,
        temperature: 0.3, // Lower temperature for more consistent extraction
        searchRecencyFilter: 'month'
      });

      const content = response.choices[0].message.content;
      
      // Try to parse the JSON response
      let parsedContent;
      try {
        parsedContent = JSON.parse(content);
      } catch (parseError) {
        // Try to extract JSON from markdown code block if present
        const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (codeBlockMatch) {
          parsedContent = JSON.parse(codeBlockMatch[1]);
        } else {
          throw parseError;
        }
      }

      return parsedContent;
    } catch (error) {
      console.error('Error extracting plant data with Perplexity:', error);
      throw new Error('Failed to extract plant data using Perplexity AI');
    }
  }
}

export default PerplexityAI;