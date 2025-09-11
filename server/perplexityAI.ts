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
              console.error('Could not parse extracted JSON:', e instanceof Error ? e.message : String(e));
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

  // New universal plant data extraction with better AI capabilities
  async extractPlantDataUniversal(content: string, url?: string): Promise<any> {
    const messages: PerplexityMessage[] = [
      {
        role: 'system',
        content: `You are an expert botanist and horticulturist specializing in extracting plant data from various sources.
          Extract detailed plant information from any content format (e-commerce pages, nursery catalogs, blog posts, etc.).
          Be flexible with the format - work with whatever information is available.
          
          Output your response as a JSON array of plant objects. Each plant should have:
          {
            "common_name": "Common name of the plant",
            "scientific_name": "Botanical/Latin name (if available)",
            "description": "Detailed description combining all available info",
            "price": "Price if mentioned (as string with currency)",
            "size": "Size/pot size if mentioned",
            "height": "Height range or mature height",
            "spread": "Width/spread if mentioned",
            "sun_exposure": "Full sun/partial shade/shade etc",
            "water_needs": "Watering requirements",
            "soil_type": "Soil preferences",
            "hardiness_zone": "USDA zones or temperature range",
            "bloom_time": "When it flowers",
            "flower_color": "Flower colors",
            "foliage_color": "Leaf colors",
            "growth_rate": "Fast/moderate/slow",
            "maintenance": "Low/moderate/high",
            "attracts": "Wildlife it attracts",
            "deer_resistant": "Yes/no/unknown",
            "native_to": "Native regions",
            "cultivar": "Specific cultivar name if mentioned",
            "availability": "In stock/out of stock/limited",
            "special_features": "Any notable features",
            "care_instructions": "Care tips if provided",
            "url": "Product URL if detectable"
          }
          
          IMPORTANT RULES:
          1. Extract ALL plants found in the content
          2. Use null for missing fields, don't make up data
          3. If content appears to be a catalog/list, extract each plant separately
          4. If content is a single plant page, extract just that one plant
          5. Preserve prices and sizes exactly as shown
          6. For scientific names, use proper botanical formatting
          7. If no plants are found, return an empty array []`
      },
      {
        role: 'user',
        content: `Extract plant data from this content:
          
          Source URL: ${url || 'Unknown'}
          
          Content:
          ${content.substring(0, 30000)} ${content.length > 30000 ? '...[truncated]' : ''}
          
          Please extract all plant information found in this content. Return as a JSON array.`
      }
    ];

    try {
      const response = await this.makeRequest(messages, {
        maxTokens: 4000,
        temperature: 0.3, // Lower temperature for more consistent extraction
        searchRecencyFilter: 'month'
      });

      const responseContent = response.choices[0].message.content;
      
      // Try to parse the JSON response
      try {
        // Clean up the response - sometimes AI adds markdown formatting and weird quotes
        const cleanedContent = responseContent
          .replace(/```json\n?/g, '')
          .replace(/```\n?/g, '')
          // Fix various quote issues
          .replace(/[""''„"]/g, '"')  // Replace smart quotes
          .replace(/[：]/g, ':')       // Replace Chinese colon
          .replace(/，/g, ',')         // Replace Chinese comma
          .replace(/\bnull\b/gi, 'null')  // Normalize null values
          .replace(/\bnil\b/gi, 'null')   // Convert nil to null
          .replace(/\bnone\b/gi, 'null')  // Convert none to null
          .replace(/\bNULL\b/g, 'null')   // Convert NULL to null
          .replace(/\bNULl\b/g, 'null')   // Fix mixed case
          .replace(/\bNull\b/g, 'null')   // Fix capitalized
          .trim();
        
        let plants;
        try {
          plants = JSON.parse(cleanedContent);
        } catch (parseError) {
          // If JSON is truncated, try to salvage what we can
          console.log('JSON parsing failed, attempting to salvage partial data...');
          
          // Try to fix common truncation issues
          let fixedContent = cleanedContent;
          
          // Count brackets to see if we're missing closing brackets
          const openBrackets = (fixedContent.match(/\[/g) || []).length;
          const closeBrackets = (fixedContent.match(/\]/g) || []).length;
          const openBraces = (fixedContent.match(/\{/g) || []).length;
          const closeBraces = (fixedContent.match(/\}/g) || []).length;
          
          // Add missing closing brackets/braces
          if (openBraces > closeBraces) {
            fixedContent += '}'.repeat(openBraces - closeBraces);
          }
          if (openBrackets > closeBrackets) {
            fixedContent += ']'.repeat(openBrackets - closeBrackets);
          }
          
          // Try parsing again
          try {
            plants = JSON.parse(fixedContent);
          } catch (secondError) {
            // If still failing, return empty array
            console.log('Could not fix JSON, falling back to regex extraction');
            throw parseError; // Re-throw to trigger fallback
          }
        }
        
        // Ensure it's an array
        if (!Array.isArray(plants)) {
          console.warn('AI returned non-array, wrapping in array');
          return [plants];
        }
        
        // Post-process plants to ensure data quality
        return plants.map(plant => ({
          ...plant,
          // Ensure common_name exists
          common_name: plant.common_name || plant.name || 'Unknown Plant',
          // Clean up scientific name
          scientific_name: plant.scientific_name?.replace(/['"]/g, '').trim() || null,
          // Ensure description exists
          description: plant.description || `${plant.common_name || 'Plant'} available from nursery`,
          // Normalize sun exposure
          sun_exposure: this.normalizeSunExposure(plant.sun_exposure),
          // Add source URL if not present
          url: plant.url || url || null
        }));
        
      } catch (parseError) {
        console.error('Failed to parse AI response as JSON:', parseError);
        console.log('Raw AI response:', responseContent);
        
        // Fallback: Try to extract basic info with regex
        return this.fallbackExtraction(content, url);
      }
      
    } catch (error) {
      console.error('Error extracting plant data with AI:', error);
      // Fallback to basic extraction
      return this.fallbackExtraction(content, url);
    }
  }

  private normalizeSunExposure(exposure: string | null): string | null {
    if (!exposure) return null;
    
    const normalized = exposure.toLowerCase();
    if (normalized.includes('full sun')) return 'Full Sun';
    if (normalized.includes('partial') || normalized.includes('part shade')) return 'Partial Shade';
    if (normalized.includes('full shade') || normalized.includes('deep shade')) return 'Full Shade';
    if (normalized.includes('sun')) return 'Full to Partial Sun';
    if (normalized.includes('shade')) return 'Partial to Full Shade';
    
    return exposure; // Return original if no match
  }

  private fallbackExtraction(content: string, url?: string): any[] {
    console.log('Using fallback extraction method...');
    
    const plants: any[] = [];
    
    // Try to find plant names with basic patterns
    // Look for patterns like "Name - Scientific Name" or "Name (Scientific Name)"
    const plantPatterns = [
      /^##\s*([A-Z][^-\n]+?)(?:\s*[-–]\s*|\s*\()?([A-Z][a-z]+ [a-z]+(?:\s+['"][^'"]+['"])?)/gm,
      /^###\s*([A-Z][^-\n]+?)(?:\s*[-–]\s*|\s*\()?([A-Z][a-z]+ [a-z]+)/gm,
      /\*\*([A-Z][^*]+?)\*\*(?:\s*[-–]\s*|\s*\()?([A-Z][a-z]+ [a-z]+)/g
    ];
    
    for (const pattern of plantPatterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const [_, commonName, scientificName] = match;
        
        // Extract price if nearby (within 200 chars)
        const nearbyContent = content.substring(match.index, Math.min(match.index + 500, content.length));
        const priceMatch = nearbyContent.match(/[£$€]\s*\d+(?:\.\d{2})?/);
        
        plants.push({
          common_name: commonName.trim(),
          scientific_name: scientificName.trim(),
          description: `${commonName} - ${scientificName}`,
          price: priceMatch ? priceMatch[0] : null,
          url: url || null
        });
      }
    }
    
    // If no plants found with patterns, try a very basic approach
    if (plants.length === 0) {
      // Look for any heading that might be a plant name
      const headingPattern = /^###?\s*([A-Z][A-Za-z\s'-]+)$/gm;
      let match;
      let count = 0;
      
      while ((match = headingPattern.exec(content)) !== null && count < 10) {
        const name = match[1].trim();
        // Filter out obvious non-plant headings
        if (!name.match(/^(Shop|Cart|Menu|Contact|About|Home|Products?|Categories|Footer|Header|Navigation)/i)) {
          plants.push({
            common_name: name,
            scientific_name: null,
            description: `${name} from catalog`,
            url: url || null
          });
          count++;
        }
      }
    }
    
    console.log(`Fallback extraction found ${plants.length} potential plants`);
    return plants;
  }

  // Old universal plant data extraction (legacy method)
  async extractPlantDataUniversalLegacy(markdown: string, pageUrl: string): Promise<any> {
    const messages: PerplexityMessage[] = [
      {
        role: 'system',
        content: `You are an expert botanist and web data extraction specialist. 
          Extract plant/product information from any nursery or garden website regardless of language or structure.
          Always respond with valid JSON. Be thorough but flexible in extraction.`
      },
      {
        role: 'user',
        content: `Analyze this nursery/garden website page and extract ALL plant-related information you can find.

Page URL: ${pageUrl}
Content:
${markdown.substring(0, 6000)}

Extract any available plant information and respond in JSON format:
{
  "common_name": "Common name in original language or English",
  "scientific_name": "Scientific/botanical Latin name if present (e.g., Genus species 'Cultivar')",
  "description": "Full plant description if available",
  "price": "Price with currency symbol if present",
  "height": "Height/size information WITH UNITS (e.g., '30-40 cm', '2-3 ft', '1 m')",
  "spread": "Width/spread information WITH UNITS",
  "bloom_time": "Blooming period or season",
  "sunlight": "Sun requirements - normalize to: 'full sun', 'partial shade', 'full shade', or 'sun to partial shade'",
  "water": "Water requirements (e.g., low, moderate, high, drought tolerant)",
  "hardiness": "Hardiness zone or temperature tolerance",
  "soil": "Soil requirements or preferences",
  "flower_color": "Flower color if mentioned",
  "foliage_color": "Leaf/foliage color if mentioned",
  "growth_habit": "Growth form (e.g., upright, spreading, climbing, mounding)",
  "type": "Plant type (e.g., perennial, annual, shrub, tree, grass)",
  "native_to": "Native region if mentioned",
  "mature_size": "Mature dimensions if different from height/spread",
  "features": "Special features (e.g., attracts butterflies, deer resistant, fragrant)",
  "care_level": "Maintenance level (e.g., easy, moderate, high)",
  "availability": "Stock status if mentioned",
  "sku": "Product code or SKU if present"
}

EXTRACTION GUIDELINES:
1. Extract whatever information is available - not all fields will be present
2. Keep original language for names/descriptions but normalize technical terms
3. ALWAYS include units for measurements (cm, m, ft, inches, etc.)
4. For sunlight, translate/normalize to the standard terms listed
5. Return null for fields with no data rather than guessing
6. Look for information in product titles, descriptions, specifications, tables, or lists
7. If multiple plants are on the page, focus on the main/first product`
      }
    ];

    try {
      const response = await this.makeRequest(messages, {
        model: 'sonar-pro',
        maxTokens: 2000,
        temperature: 0.3,
        searchRecencyFilter: 'month'
      });

      const content = response.choices[0].message.content;
      
      // Parse the JSON response
      let parsedContent;
      try {
        parsedContent = JSON.parse(content);
      } catch (parseError) {
        // Try to extract JSON from markdown code block if present
        const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (codeBlockMatch) {
          parsedContent = JSON.parse(codeBlockMatch[1]);
        } else {
          console.error('Failed to parse AI response:', content);
          throw parseError;
        }
      }

      // Clean up and validate the extracted data
      const cleanedData: any = {};
      for (const [key, value] of Object.entries(parsedContent)) {
        if (value !== null && value !== undefined && value !== '' && value !== 'N/A' && value !== 'Not specified') {
          cleanedData[key] = value;
        }
      }

      return cleanedData;
    } catch (error) {
      console.error('Error extracting plant data with Perplexity:', error);
      throw new Error('Failed to extract plant data using Perplexity AI');
    }
  }

  // German-specific plant data extraction (legacy method for compatibility)
  async extractPlantData(markdown: string, pageUrl: string): Promise<any> {
    // Check if this is German content
    const isGermanContent = pageUrl.includes('.de') || 
                          markdown.includes('Wuchshöhe') || 
                          markdown.includes('Blütezeit');
    
    // Use universal method for non-German content
    if (!isGermanContent) {
      return this.extractPlantDataUniversal(markdown, pageUrl);
    }

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
        model: 'sonar', // Use sonar model for extraction
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