// External API integrations for GardenScape Pro

// Perenual Plant Database API
export class PerenualAPI {
  private apiKey: string;
  private baseUrl = 'https://perenual.com/api';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async searchPlants(query: string, filters?: {
    hardiness?: string;
    sunlight?: string;
    watering?: string;
    poisonous?: boolean;
  }): Promise<any[]> {
    try {
      const params = new URLSearchParams({
        key: this.apiKey,
        q: query,
        ...(filters?.hardiness && { hardiness: filters.hardiness }),
        ...(filters?.sunlight && { sunlight: filters.sunlight }),
        ...(filters?.watering && { watering: filters.watering }),
        ...(filters?.poisonous !== undefined && { poisonous: filters.poisonous.toString() })
      });

      const response = await fetch(`${this.baseUrl}/species-list?${params}`);
      if (!response.ok) throw new Error(`Perenual API error: ${response.status}`);
      
      const data = await response.json();
      return data.data || [];
    } catch (error) {
      console.error('Error fetching from Perenual:', error);
      return [];
    }
  }

  async getPlantDetails(plantId: string): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/species/details/${plantId}?key=${this.apiKey}`);
      if (!response.ok) throw new Error(`Perenual API error: ${response.status}`);
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching plant details from Perenual:', error);
      return null;
    }
  }

  async getCareTips(plantId: string): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/species-care-guide-list?species_id=${plantId}&key=${this.apiKey}`);
      if (!response.ok) throw new Error(`Perenual API error: ${response.status}`);
      
      const data = await response.json();
      return data.data || [];
    } catch (error) {
      console.error('Error fetching care tips from Perenual:', error);
      return [];
    }
  }
}

// GBIF (Global Biodiversity Information Facility) API
export class GBIFAPI {
  private baseUrl = 'https://api.gbif.org/v1';
  private email: string;
  private password: string;

  constructor(email: string, password: string) {
    this.email = email;
    this.password = password;
  }

  private getAuthHeader(): string {
    return 'Basic ' + Buffer.from(`${this.email}:${this.password}`).toString('base64');
  }

  async searchSpecies(scientificName: string): Promise<any[]> {
    try {
      const params = new URLSearchParams({
        q: scientificName,
        rank: 'SPECIES',
        status: 'ACCEPTED',
        limit: '20'
      });

      const response = await fetch(`${this.baseUrl}/species/search?${params}`, {
        headers: {
          'Authorization': this.getAuthHeader()
        }
      });
      
      if (!response.ok) throw new Error(`GBIF API error: ${response.status}`);
      
      const data = await response.json();
      return data.results || [];
    } catch (error) {
      console.error('Error fetching from GBIF:', error);
      return [];
    }
  }

  async getSpeciesDetails(speciesKey: number): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/species/${speciesKey}`, {
        headers: {
          'Authorization': this.getAuthHeader()
        }
      });
      
      if (!response.ok) throw new Error(`GBIF API error: ${response.status}`);
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching species details from GBIF:', error);
      return null;
    }
  }

  async getVernacularNames(speciesKey: number): Promise<any[]> {
    try {
      const response = await fetch(`${this.baseUrl}/species/${speciesKey}/vernacularNames`, {
        headers: {
          'Authorization': this.getAuthHeader()
        }
      });
      
      if (!response.ok) throw new Error(`GBIF API error: ${response.status}`);
      
      const data = await response.json();
      return data.results || [];
    } catch (error) {
      console.error('Error fetching vernacular names from GBIF:', error);
      return [];
    }
  }
}

// Mapbox Geocoding API
export class MapboxAPI {
  private apiKey: string;
  private baseUrl = 'https://api.mapbox.com/geocoding/v5';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async geocode(address: string): Promise<{
    latitude: number;
    longitude: number;
    placeName: string;
    country?: string;
    region?: string;
  } | null> {
    try {
      const params = new URLSearchParams({
        access_token: this.apiKey,
        limit: '1',
        country: 'GB' // Bias towards UK results
      });

      const response = await fetch(
        `${this.baseUrl}/mapbox.places/${encodeURIComponent(address)}.json?${params}`
      );
      
      if (!response.ok) throw new Error(`Mapbox API error: ${response.status}`);
      
      const data = await response.json();
      
      if (data.features && data.features.length > 0) {
        const feature = data.features[0];
        const [longitude, latitude] = feature.center;
        
        // Extract context information
        const country = feature.context?.find(c => c.id.startsWith('country'))?.text;
        const region = feature.context?.find(c => c.id.startsWith('region'))?.text;
        
        return {
          latitude,
          longitude,
          placeName: feature.place_name,
          country,
          region
        };
      }
      
      return null;
    } catch (error) {
      console.error('Error geocoding with Mapbox:', error);
      return null;
    }
  }

  async reverseGeocode(lat: number, lng: number): Promise<{
    address: string;
    city?: string;
    region?: string;
    country?: string;
    postcode?: string;
  } | null> {
    try {
      const params = new URLSearchParams({
        access_token: this.apiKey,
        limit: '1'
      });

      const response = await fetch(
        `${this.baseUrl}/mapbox.places/${lng},${lat}.json?${params}`
      );
      
      if (!response.ok) throw new Error(`Mapbox API error: ${response.status}`);
      
      const data = await response.json();
      
      if (data.features && data.features.length > 0) {
        const feature = data.features[0];
        const context = feature.context || [];
        
        return {
          address: feature.place_name,
          city: context.find(c => c.id.startsWith('place'))?.text,
          region: context.find(c => c.id.startsWith('region'))?.text,
          country: context.find(c => c.id.startsWith('country'))?.text,
          postcode: context.find(c => c.id.startsWith('postcode'))?.text
        };
      }
      
      return null;
    } catch (error) {
      console.error('Error reverse geocoding with Mapbox:', error);
      return null;
    }
  }
}

// Hugging Face API for image generation
export class HuggingFaceAPI {
  private apiKey: string;
  private baseUrl = 'https://api-inference.huggingface.co/models';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async generateImage(prompt: string, model: string = 'black-forest-labs/FLUX.1-schnell'): Promise<Buffer | null> {
    try {
      const response = await fetch(`${this.baseUrl}/${model}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: prompt,
          parameters: {
            guidance_scale: 7.5,
            num_inference_steps: 50,
          }
        })
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`HuggingFace API error: ${response.status} - ${error}`);
      }

      const buffer = await response.arrayBuffer();
      return Buffer.from(buffer);
    } catch (error) {
      console.error('Error generating image with HuggingFace:', error);
      return null;
    }
  }
}

// Runware API for advanced image generation
export class RunwareAPI {
  private apiKey: string;
  private baseUrl = 'https://api.runware.ai/v1';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async generateGardenVisualization(params: {
    prompt: string;
    style?: string;
    aspectRatio?: string;
    seed?: number;
  }): Promise<{ imageUrl: string } | null> {
    try {
      const response = await fetch(`${this.baseUrl}/images/generate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: params.prompt,
          model: 'runware-v1',
          style: params.style || 'photorealistic',
          aspect_ratio: params.aspectRatio || '16:9',
          seed: params.seed,
          num_images: 1,
          guidance_scale: 7.5,
          steps: 30
        })
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Runware API error: ${response.status} - ${error}`);
      }

      const data = await response.json();
      
      if (data.images && data.images.length > 0) {
        return { imageUrl: data.images[0].url };
      }
      
      return null;
    } catch (error) {
      console.error('Error generating visualization with Runware:', error);
      return null;
    }
  }

  async enhanceImage(imageUrl: string, enhancementType: 'upscale' | 'stylize' | 'colorize'): Promise<{ imageUrl: string } | null> {
    try {
      const response = await fetch(`${this.baseUrl}/images/enhance`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image_url: imageUrl,
          enhancement_type: enhancementType,
          scale: enhancementType === 'upscale' ? 2 : undefined
        })
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Runware API error: ${response.status} - ${error}`);
      }

      const data = await response.json();
      return { imageUrl: data.enhanced_image_url };
    } catch (error) {
      console.error('Error enhancing image with Runware:', error);
      return null;
    }
  }
}