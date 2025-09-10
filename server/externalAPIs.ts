// External API integrations for GardenScape Pro

import FirecrawlApp from '@mendable/firecrawl-js';

// FireCrawl Web Scraping API
export class FireCrawlAPI {
  private app: FirecrawlApp;

  constructor(apiKey: string) {
    this.app = new FirecrawlApp({ apiKey });
  }

  async scrapePlantData(url: string): Promise<any> {
    try {
      console.log('FireCrawl: Starting to scrape URL:', url);
      
      // For German site, try crawling with pagination support
      const isGermanNursery = url.includes('graefin-von-zeppelin.de');
      
      if (isGermanNursery) {
        console.log('Detected German nursery - attempting to crawl all pages...');
        
        // Use crawl mode to get all pages
        const crawlResult = await this.app.crawlUrl(url, {
          limit: 30, // Crawl up to 30 pages (300+ plants if 12 per page)
          maxDepth: 2, // Follow pagination links one level deep
          includePaths: ['/collections/stauden/**', '/collections/pflanzen/**'],
          excludePaths: ['/products/gift-card', '/products/beet-ideen', '/products/katalog'],
          waitFor: 2000
        });
        
        if (!crawlResult.success) {
          throw new Error(crawlResult.error || 'Crawling failed');
        }
        
        console.log(`Crawled ${crawlResult.data?.length || 0} pages`);
        
        // Extract plants from all crawled pages
        let allPlants: any[] = [];
        
        if (crawlResult.data && Array.isArray(crawlResult.data)) {
          for (const page of crawlResult.data) {
            // Extract plants from each page's markdown content
            if (page.markdown) {
              const pagePlants = this.extractPlantsFromEcommercePage(page.markdown, page.url);
              allPlants.push(...pagePlants);
            }
          }
        }
        
        // Deduplicate plants based on scientific name
        const uniquePlants = this.deduplicatePlants(allPlants);
        
        // Add plant type based on URL collection
        const plantsWithType = uniquePlants.map(plant => {
          // Only set herbaceous perennials for /stauden collection
          const isStaudenCollection = url.includes('/collections/stauden') || url.includes('/stauden');
          
          return {
            ...plant,
            type: isStaudenCollection ? 'herbaceous perennials' : plant.type,
            sources: { firecrawl: true }
          };
        });
        
        return {
          plants: plantsWithType,
          metadata: {
            url,
            scrapedAt: new Date().toISOString(),
            creditsUsed: crawlResult.data?.length || 1,
            pagesCrawled: crawlResult.data?.length || 1,
            totalPlantsFound: plantsWithType.length,
            extractionMethod: 'crawl-pagination'
          }
        };
      } else {
        // Standard single-page scraping for other sites
        const scrapeResult = await this.app.scrapeUrl(url, {
          formats: ['extract', 'markdown'],
          waitFor: 3000,
          timeout: 30000,
          extract: {
            schema: {
              type: 'object',
              properties: {
                products: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      name: {
                        type: 'string',
                        description: 'Product name or plant name'
                      },
                      scientificName: {
                        type: 'string',
                        description: 'Scientific/botanical name if present'
                      },
                      price: {
                        type: 'string',
                        description: 'Price of the product'
                      },
                      description: {
                        type: 'string',
                        description: 'Product description or details'
                      },
                      imageUrl: {
                        type: 'string',
                        description: 'Product image URL'
                      },
                      link: {
                        type: 'string',
                        description: 'Link to product page'
                      },
                      characteristics: {
                        type: 'object',
                        properties: {
                          height: { type: 'string' },
                          spread: { type: 'string' },
                          bloomTime: { type: 'string' },
                          sunlight: { type: 'string' },
                          water: { type: 'string' },
                          hardiness: { type: 'string' }
                        }
                      }
                    }
                  }
                }
              }
            },
            prompt: `Extract all plant/perennial products from this nursery catalog page. For each product, capture:
              - Product name (common name and/or scientific name)
              - Price if listed
              - Any description or details
              - Product image URL if available
              - Link to the product detail page
              - Any growing characteristics mentioned (height, spread, bloom time, sun requirements, etc.)
              
              Focus ONLY on actual plant products, not accessories, tools, gift cards, or other non-plant items.
              Look for product cards, listings, or grid items that represent individual plants for sale.`
          }
        });

        if (!scrapeResult.success) {
          throw new Error(scrapeResult.error || 'Scraping failed');
        }

        console.log('FireCrawl extraction result:', JSON.stringify(scrapeResult.extract, null, 2));

        // Convert extracted products to plant format
        let plants = [];
        
        if (scrapeResult.extract?.products) {
          plants = scrapeResult.extract.products.map((product: any) => ({
            common_name: product.name || 'Unknown',
            scientific_name: product.scientificName || this.extractScientificFromName(product.name),
            description: product.description || '',
            price: product.price,
            image_url: product.imageUrl,
            product_url: product.link,
            height: product.characteristics?.height,
            spread: product.characteristics?.spread,
            bloom_time: product.characteristics?.bloomTime,
            sunlight: product.characteristics?.sunlight ? [product.characteristics.sunlight] : undefined,
            watering: product.characteristics?.water,
            hardiness_zones: product.characteristics?.hardiness ? [product.characteristics.hardiness] : undefined,
            sources: { firecrawl: true }
          }));
        }
        
        // If structured extraction didn't work, fall back to content parsing
        if (plants.length === 0 && scrapeResult.markdown) {
          console.log('No products found via extraction, trying content parsing...');
          plants = this.extractPlantsFromContent(scrapeResult.markdown);
        }

        return {
          plants,
          metadata: {
            url,
            scrapedAt: new Date().toISOString(),
            creditsUsed: 1,
            rawContentLength: scrapeResult.markdown?.length || 0,
            extractionMethod: plants.length > 0 ? (scrapeResult.extract?.products ? 'structured' : 'content-parsing') : 'failed'
          }
        };
      }
    } catch (error) {
      console.error('FireCrawl scraping error:', error);
      throw error;
    }
  }
  
  private extractPlantsFromEcommercePage(markdown: string, pageUrl: string): any[] {
    const plants: any[] = [];
    
    // Look for product patterns in markdown
    // German site patterns: "Echinacea purpurea 'Magnus' Scheinsonnenhut"
    const productPattern = /\[([^\]]+)\]\(\/collections\/[^\/]+\/products\/([^\)]+)\)/g;
    const pricePattern = /€(\d+,\d+)/g;
    
    let match;
    while ((match = productPattern.exec(markdown)) !== null) {
      const fullName = match[1];
      const productSlug = match[2];
      
      // Parse the plant name
      const scientificName = this.extractScientificFromName(fullName);
      const commonName = fullName.replace(scientificName || '', '').trim();
      
      plants.push({
        common_name: commonName || fullName,
        scientific_name: scientificName,
        product_url: `/collections/stauden/products/${productSlug}`,
        product_slug: productSlug,
        page_url: pageUrl
      });
    }
    
    return plants;
  }
  
  private deduplicatePlants(plants: any[]): any[] {
    const seen = new Set();
    return plants.filter(plant => {
      const key = plant.scientific_name || plant.common_name;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }
  
  private extractScientificFromName(name: string): string | undefined {
    if (!name) return undefined;
    // Look for scientific name patterns in the product name
    // e.g., "Echinacea purpurea 'Magnus'" or "Lavandula angustifolia"
    const match = name.match(/([A-Z][a-z]+ [a-z]+(?:\s+['"][^'"]+['"])?)/);
    return match ? match[1] : undefined;
  }

  private extractPlantsFromContent(content: string): any[] {
    const plants: any[] = [];
    
    // Basic extraction patterns for plant data
    // This can be enhanced with more sophisticated parsing
    const lines = content.split('\n');
    let currentPlant: any = null;
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      // Look for plant names (common patterns)
      if (trimmed.match(/^#+\s+(.+)/) || trimmed.match(/^\*\*(.+)\*\*/)) {
        if (currentPlant) {
          plants.push(currentPlant);
        }
        const name = trimmed.replace(/^#+\s+/, '').replace(/\*\*/g, '').trim();
        currentPlant = {
          common_name: name,
          scientific_name: this.extractScientificName(trimmed, lines),
          description: '',
          sources: { firecrawl: true }
        };
      }
      
      // Extract descriptions and care info
      if (currentPlant && trimmed.length > 50 && !trimmed.startsWith('#')) {
        if (!currentPlant.description) {
          currentPlant.description = trimmed;
        }
        
        // Extract care information from text
        this.extractCareInfo(trimmed, currentPlant);
      }
    }
    
    // Add the last plant
    if (currentPlant) {
      plants.push(currentPlant);
    }
    
    // If no structured data found, try to extract from paragraphs
    if (plants.length === 0) {
      plants.push(...this.extractFromParagraphs(content));
    }
    
    return plants;
  }

  private extractScientificName(text: string, context: string[]): string | undefined {
    // Look for italic text or parentheses which often contain scientific names
    const italicMatch = text.match(/\*([A-Z][a-z]+ [a-z]+)\*/);
    const parenMatch = text.match(/\(([A-Z][a-z]+ [a-z]+)\)/);
    
    if (italicMatch) return italicMatch[1];
    if (parenMatch) return parenMatch[1];
    
    return undefined;
  }

  private extractCareInfo(text: string, plant: any): void {
    // Extract sunlight requirements
    if (text.match(/full sun|partial shade|shade|sun|bright/i)) {
      const sunMatch = text.match(/(full sun|partial shade|full shade|partial sun|bright indirect)/i);
      if (sunMatch) {
        plant.sunlight = [sunMatch[1].toLowerCase()];
      }
    }
    
    // Extract watering needs
    if (text.match(/water|moist|dry|drought/i)) {
      if (text.match(/low water|drought tolerant|dry/i)) {
        plant.watering = 'minimum';
      } else if (text.match(/moderate water|average/i)) {
        plant.watering = 'average';
      } else if (text.match(/high water|moist|frequent/i)) {
        plant.watering = 'frequent';
      }
    }
    
    // Extract hardiness zones
    const zoneMatch = text.match(/zone[s]?\s+(\d+[ab]?)\s*[-–]\s*(\d+[ab]?)/i);
    if (zoneMatch) {
      plant.hardiness = {
        min: parseInt(zoneMatch[1]),
        max: parseInt(zoneMatch[2])
      };
    }
  }

  private extractFromParagraphs(content: string): any[] {
    const plants: any[] = [];
    const paragraphs = content.split(/\n\n+/);
    
    for (const para of paragraphs) {
      // Look for plant-like content
      if (para.match(/plant|flower|tree|shrub|grass|perennial|annual/i)) {
        // Try to extract a plant name from the beginning of the paragraph
        const nameMatch = para.match(/^([A-Z][a-z]+(?: [A-Z][a-z]+)*)/);
        if (nameMatch) {
          plants.push({
            common_name: nameMatch[1],
            description: para.substring(0, 500),
            sources: { firecrawl: true }
          });
        }
      }
    }
    
    return plants;
  }
}

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
        limit: '1'
        // No country bias - allow global geocoding
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
        const country = feature.context?.find((c: any) => c.id.startsWith('country'))?.text;
        const region = feature.context?.find((c: any) => c.id.startsWith('region'))?.text;
        
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
          city: context.find((c: any) => c.id.startsWith('place'))?.text,
          region: context.find((c: any) => c.id.startsWith('region'))?.text,
          country: context.find((c: any) => c.id.startsWith('country'))?.text,
          postcode: context.find((c: any) => c.id.startsWith('postcode'))?.text
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

  async generateImage(prompt: string, model: string = 'stabilityai/stable-diffusion-2-1'): Promise<Buffer | null> {
    try {
      // Add timeout using AbortController
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

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
            num_inference_steps: 25, // Reduced for faster generation
            width: 512,
            height: 512
          }
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`HuggingFace API error: ${response.status} - ${error}`);
      }

      const buffer = await response.arrayBuffer();
      return Buffer.from(buffer);
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.error('HuggingFace API request timed out after 30 seconds');
      } else {
        console.error('Error generating image with HuggingFace:', error);
      }
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