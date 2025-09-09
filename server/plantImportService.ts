// Plant Import Service - handles importing plants from various sources
import { db } from './db.js';
import { plants } from '@shared/schema.js';
import { eq } from 'drizzle-orm';
import fetch from 'node-fetch';

interface PerenualPlant {
  id: number;
  common_name: string;
  scientific_name: string[];
  family?: string;
  genus?: string;
  species?: string;
  cycle?: string;
  watering?: string;
  sunlight?: string[];
  hardiness?: { min: number; max: number };
  soil?: string[];
  growth_rate?: string;
  drought_tolerant?: boolean;
  salt_tolerant?: boolean;
  thorny?: boolean;
  invasive?: boolean;
  tropical?: boolean;
  indoor?: boolean;
  care_level?: string;
  flowers?: boolean;
  flowering_season?: string;
  flower_color?: string;
  leaf_color?: string[];
  fruit_color?: string[];
  harvest_season?: string;
  edible_fruit?: boolean;
  edible_leaf?: boolean;
  cuisine?: boolean;
  medicinal?: boolean;
  poisonous_to_humans?: number;
  poisonous_to_pets?: number;
  description?: string;
  maintenance?: string;
  propagation?: string[];
  pruning_month?: string[];
}

export class PlantImportService {
  private perenualApiKey: string | undefined;
  
  constructor() {
    this.perenualApiKey = process.env.PERENUAL_API_KEY;
  }
  
  // Search Perenual API with pagination support
  async searchPerenual(query: string): Promise<any[]> {
    if (!this.perenualApiKey) {
      throw new Error('Perenual API key not configured');
    }
    
    try {
      // Always use the query parameter but with max results per page
      const searchUrl = `https://perenual.com/api/species-list?key=${this.perenualApiKey}&q=${encodeURIComponent(query)}&per_page=100`;
      
      console.log(`Searching Perenual with URL: ${searchUrl.replace(this.perenualApiKey, 'API_KEY')}`);
      
      // First, get initial page to determine total pages
      const initialResponse = await fetch(searchUrl, { method: 'GET' });
      
      if (!initialResponse.ok) {
        throw new Error(`Perenual API error: ${initialResponse.status}`);
      }
      
      const initialData = await initialResponse.json() as any;
      const totalPages = initialData.last_page || 1;
      const totalResults = initialData.total || 0;
      
      console.log(`Perenual API reports ${totalResults} total results across ${totalPages} pages for "${query}"`);
      
      let allPlants = initialData.data || [];
      
      // Fetch ALL available pages (up to a reasonable limit)
      if (totalPages > 1) {
        const maxPages = Math.min(totalPages, 20); // Fetch up to 20 pages (2000 results max)
        const pagePromises = [];
        
        for (let page = 2; page <= maxPages; page++) {
          const pageUrl = `${searchUrl}&page=${page}`;
          pagePromises.push(
            fetch(pageUrl, { method: 'GET' })
              .then(res => res.json())
              .then(data => data.data || [])
              .catch(err => {
                console.error(`Error fetching page ${page}:`, err);
                return [];
              })
          );
        }
        
        const additionalPages = await Promise.all(pagePromises);
        additionalPages.forEach(plants => {
          allPlants = allPlants.concat(plants);
        });
        
        console.log(`Actually fetched ${maxPages} pages with ${allPlants.length} total results`);
      }
      
      console.log(`Perenual search for "${query}" returned ${allPlants.length} results`);
      
      // Transform to our format
      return allPlants.map((plant: any) => ({
        scientific_name: plant.scientific_name?.[0] || plant.scientific_name || '',
        common_name: plant.common_name || '',
        family: plant.family,
        genus: plant.genus,
        species: plant.species,
        cycle: plant.cycle,
        watering: plant.watering,
        sunlight: plant.sunlight,
        external_id: `perenual-${plant.id}`,
        source: 'perenual'
      }));
    } catch (error) {
      console.error('Perenual search error:', error);
      return [];
    }
  }
  
  // Get detailed plant info from Perenual
  async getPerenualDetails(plantId: string): Promise<any> {
    if (!this.perenualApiKey) {
      throw new Error('Perenual API key not configured');
    }
    
    try {
      const response = await fetch(
        `https://perenual.com/api/species/details/${plantId}?key=${this.perenualApiKey}`,
        { method: 'GET' }
      );
      
      if (!response.ok) {
        throw new Error(`Perenual API error: ${response.status}`);
      }
      
      const plant = await response.json() as any;
      
      // Transform to our format with all details
      return {
        scientific_name: plant.scientific_name?.[0] || plant.scientific_name || '',
        common_name: plant.common_name || '',
        family: plant.family,
        genus: plant.genus,
        species: plant.species,
        cycle: plant.cycle,
        watering: plant.watering,
        sunlight: plant.sunlight,
        hardiness: plant.hardiness,
        soil: plant.soil,
        growth_rate: plant.growth_rate,
        drought_tolerant: plant.drought_tolerant,
        salt_tolerant: plant.salt_tolerant,
        thorny: plant.thorny,
        invasive: plant.invasive,
        tropical: plant.tropical,
        indoor: plant.indoor,
        care_level: plant.care_level,
        flowers: plant.flowers,
        flowering_season: plant.flowering_season,
        flower_color: plant.flower_color,
        leaf_color: plant.leaf_color,
        fruit_color: plant.fruit_color,
        harvest_season: plant.harvest_season,
        edible_fruit: plant.edible_fruit,
        edible_leaf: plant.edible_leaf,
        cuisine: plant.cuisine,
        medicinal: plant.medicinal,
        poisonous_to_humans: plant.poisonous_to_humans,
        poisonous_to_pets: plant.poisonous_to_pets,
        description: plant.description,
        maintenance: plant.maintenance,
        propagation: plant.propagation,
        pruning_month: plant.pruning_month,
        external_id: `perenual-${plant.id}`,
        source: 'perenual'
      };
    } catch (error) {
      console.error('Perenual details error:', error);
      return null;
    }
  }
  
  // Enrich with GBIF data
  async enrichWithGBIF(scientificName: string): Promise<any> {
    try {
      // Search GBIF for the species
      const searchResponse = await fetch(
        `https://api.gbif.org/v1/species/match?name=${encodeURIComponent(scientificName)}`,
        { method: 'GET' }
      );
      
      if (!searchResponse.ok) {
        throw new Error(`GBIF API error: ${searchResponse.status}`);
      }
      
      const match = await searchResponse.json() as any;
      
      if (match.usageKey) {
        // Get detailed species info
        const detailsResponse = await fetch(
          `https://api.gbif.org/v1/species/${match.usageKey}`,
          { method: 'GET' }
        );
        
        if (detailsResponse.ok) {
          const details = await detailsResponse.json() as any;
          
          return {
            gbif_id: match.usageKey?.toString(),
            family: details.family || undefined,
            genus: details.genus || undefined,
            species: details.species || undefined,
            native_region: details.origin || undefined,
            conservation_status: details.threatStatus || undefined
          };
        }
      }
      
      return {};
    } catch (error) {
      console.error('GBIF enrichment error:', error);
      return {};
    }
  }
  
  // Enrich with iNaturalist data
  async enrichWithINaturalist(scientificName: string): Promise<any> {
    try {
      // Search iNaturalist for the species
      const response = await fetch(
        `https://api.inaturalist.org/v1/taxa?q=${encodeURIComponent(scientificName)}&per_page=1`,
        { method: 'GET' }
      );
      
      if (!response.ok) {
        throw new Error(`iNaturalist API error: ${response.status}`);
      }
      
      const data = await response.json() as any;
      const results = data.results || [];
      
      if (results.length > 0) {
        const taxon = results[0];
        
        return {
          inaturalist_id: taxon.id?.toString(),
          common_name: taxon.preferred_common_name || undefined,
          conservation_status: taxon.conservation_status?.status || undefined,
          native_region: taxon.establishment_means?.place?.display_name || undefined
        };
      }
      
      return {};
    } catch (error) {
      console.error('iNaturalist enrichment error:', error);
      return {};
    }
  }
  
  // Import plants to database
  async importPlants(plantsData: any[]): Promise<{ imported: number; failed: number }> {
    let imported = 0;
    let failed = 0;
    
    for (const plantData of plantsData) {
      try {
        // Check if plant already exists
        const existing = await db.select()
          .from(plants)
          .where(eq(plants.scientificName, plantData.scientific_name))
          .limit(1);
        
        if (existing.length > 0) {
          console.log(`Plant already exists: ${plantData.scientific_name}`);
          continue;
        }
        
        // Generate a unique ID
        const plantId = `import-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        // Map the data to our database schema
        const plantRecord = {
          id: plantId,
          scientificName: plantData.scientific_name,
          genus: plantData.genus || plantData.scientific_name?.split(' ')[0] || 'Unknown',
          species: plantData.species || plantData.scientific_name?.split(' ')[1] || undefined,
          commonName: plantData.common_name || 'Unknown',
          description: plantData.description || '',
          
          // Plant characteristics
          plantType: plantData.cycle || 'perennial',
          matureHeight: plantData.mature_height || '1-3 feet',
          matureWidth: plantData.mature_width || '1-2 feet',
          growthRate: plantData.growth_rate || 'moderate',
          bloomTime: plantData.flowering_season || 'summer',
          flowerColor: Array.isArray(plantData.flower_color) 
            ? plantData.flower_color.join(', ') 
            : plantData.flower_color || 'varies',
          foliageColor: Array.isArray(plantData.leaf_color)
            ? plantData.leaf_color.join(', ')
            : plantData.leaf_color || 'green',
          texture: 'medium', // Default
          
          // Growing conditions
          sunExposure: Array.isArray(plantData.sunlight)
            ? plantData.sunlight.join(', ')
            : plantData.sunlight || 'full sun to part shade',
          soilType: Array.isArray(plantData.soil)
            ? plantData.soil.join(', ')
            : plantData.soil || 'well-drained',
          soilPH: '6.0-7.0', // Default
          waterNeeds: plantData.watering || 'moderate',
          hardinessZones: plantData.hardiness 
            ? `${plantData.hardiness.min}-${plantData.hardiness.max}`
            : '5-9',
          
          // Special features
          nativeRegion: plantData.native_region || '',
          wildlifeAttracted: '',
          resistances: [
            plantData.drought_tolerant && 'drought',
            plantData.salt_tolerant && 'salt'
          ].filter(Boolean).join(', ') || '',
          toxicity: plantData.poisonous_to_humans || plantData.poisonous_to_pets
            ? 'toxic to humans/pets'
            : 'non-toxic',
          
          // Care
          maintenance: plantData.care_level || plantData.maintenance || 'low',
          pruning: Array.isArray(plantData.pruning_month)
            ? `Prune in ${plantData.pruning_month.join(', ')}`
            : '',
          propagation: Array.isArray(plantData.propagation)
            ? plantData.propagation.join(', ')
            : '',
          
          // Uses
          landscapeUses: '',
          companionPlants: '',
          
          // Metadata
          createdAt: new Date(),
          updatedAt: new Date(),
          source: plantData.source || 'import',
          perennialId: plantData.external_id,
          status: 'approved',
          submittedBy: 'admin-import',
          approvedBy: 'admin-import',
          approvedAt: new Date()
        };
        
        await db.insert(plants).values(plantRecord);
        imported++;
        
      } catch (error) {
        console.error(`Failed to import plant ${plantData.scientific_name}:`, error);
        failed++;
      }
    }
    
    return { imported, failed };
  }
}

export const plantImportService = new PlantImportService();