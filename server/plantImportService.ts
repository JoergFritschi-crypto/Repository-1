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
  
  // NOMENCLATURE STANDARDS:
  // All three data sources (Perenual, GBIF, iNaturalist) use the same rigorous rules:
  // 1. Botanical nomenclature correction (ALL CAPS → Proper Case, cultivar formatting)
  // 2. Filtering of vague entries (sp., spp., cvs., agg., complex)
  // 3. Intelligent deduplication based on normalized scientific names
  // 4. ICNCP-compliant cultivar formatting ('Single quotes' for cultivars)
  // 5. Species inference for known cultivars missing species epithets
  
  // Known species corrections for cultivars missing species names
  private knownSpeciesCorrections: { [key: string]: string } = {
    // Helianthus cultivars
    'helianthus capenoch star': 'decapetalus',
    'helianthus capenor star': 'decapetalus',
    'helianthus lemon queen': 'pauciflorus',
    'helianthus monarch': 'atrorubens',
    'helianthus happy days': 'annuus',
    'helianthus sunshine daydream': 'annuus',  // Another annual cultivar
    // Note: Sunfinity Series cultivars should not have species per ICNCP
    // They will be formatted as: Helianthus Sunfinity Series 'cultivar name'
    
    // Add more corrections as we discover them
    // Format: 'genus cultivar' : 'species'
  };
  
  constructor() {
    this.perenualApiKey = process.env.PERENUAL_API_KEY;
  }
  
  // Correct botanical nomenclature formatting
  private correctBotanicalNomenclature(name: string): string {
    if (!name) return '';
    
    // Handle ALL CAPS names
    if (name === name.toUpperCase() && name.length > 3) {
      name = name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
    }
    
    // Remove extra spaces and fix formatting
    name = name.trim().replace(/\s+/g, ' ');
    
    // Fix common issues
    name = name.replace(/\s+x\s+/g, ' × '); // Hybrid notation
    name = name.replace(/\s+var\.\s+/g, ' var. ');
    name = name.replace(/\s+subsp\.\s+/g, ' subsp. ');
    name = name.replace(/\s+f\.\s+/g, ' f. ');
    
    return name;
  }
  
  // Search Perenual API with pagination support
  async searchPerenual(query: string): Promise<any[]> {
    if (!this.perenualApiKey) {
      throw new Error('Perenual API key not configured');
    }
    
    try {
      // Always use the query parameter but with max results per page
      const searchUrl = `https://perenual.com/api/v2/species-list?key=${this.perenualApiKey}&q=${encodeURIComponent(query)}&per_page=100`;
      
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
              .then((data: any) => data.data || [])
              .catch(err => {
                console.error(`Error fetching page ${page}:`, err);
                return [];
              })
          );
        }
        
        const additionalPages = await Promise.all(pagePromises);
        additionalPages.forEach((plants: any[]) => {
          allPlants = allPlants.concat(plants);
        });
        
        console.log(`Actually fetched ${maxPages} pages with ${allPlants.length} total results`);
      }
      
      console.log(`Perenual search for "${query}" returned ${allPlants.length} results`);
      
      // Filter out vague entries like "cvs." (cultivars without specific names)
      const filteredPlants = allPlants.filter((plant: any) => {
        const name = plant.scientific_name?.[0] || plant.scientific_name || '';
        // Skip entries ending with "cvs." or "cultivars" as they're too vague
        return !name.match(/\bcvs?\.\s*$/i) && !name.match(/\bcultivars?\s*$/i);
      });
      
      console.log(`After filtering vague entries: ${filteredPlants.length} plants`);
      
      // Transform to our format and fix common nomenclature issues
      return filteredPlants.map((plant: any) => {
        // Start with basic transformation - v2 API provides TONS of data!
        let result = {
          scientific_name: plant.scientific_name?.[0] || plant.scientific_name || '',
          common_name: plant.common_name || '',
          family: plant.family,
          genus: plant.genus,
          species: plant.species,
          cycle: plant.cycle,
          watering: plant.watering,
          sunlight: plant.sunlight,
          // v2 API includes MUCH more data:
          flower_color: plant.flower_color,
          flowering_season: plant.flowering_season,
          dimension: plant.dimension,
          growth_rate: plant.growth_rate,
          drought_tolerant: plant.drought_tolerant,
          salt_tolerant: plant.salt_tolerant,
          thorny: plant.thorny,
          invasive: plant.invasive,
          tropical: plant.tropical,
          indoor: plant.indoor,
          care_level: plant.care_level,
          maintenance: plant.maintenance,
          flowers: plant.flowers,
          leaf: plant.leaf,
          leaf_color: plant.leaf_color,
          fruit_color: plant.fruit_color,
          harvest_season: plant.harvest_season,
          hardiness: plant.hardiness,
          hardiness_location: plant.hardiness_location,
          attracts: plant.attracts,
          propagation: plant.propagation,
          resistance: plant.resistance,
          soil: plant.soil,
          problem: plant.problem,
          pest_susceptibility: plant.pest_susceptibility,
          edible_fruit: plant.edible_fruit,
          edible_leaf: plant.edible_leaf,
          cuisine: plant.cuisine,
          medicinal: plant.medicinal,
          poisonous_to_humans: plant.poisonous_to_humans,
          poisonous_to_pets: plant.poisonous_to_pets,
          external_id: `perenual-${plant.id}`,
          source: 'perenual'
        };
        
        // Fix common nomenclature issues
        result = this.fixBotanicalNomenclature(result);
        
        return result;
      });
    } catch (error) {
      console.error('Perenual search error:', error);
      return [];
    }
  }
  
  // Fix common botanical nomenclature issues
  private fixBotanicalNomenclature(plant: any): any {
    // Parse the scientific name to extract components
    let scientificName = plant.scientific_name || '';
    const commonName = (plant.common_name || '').toLowerCase();
    
    
    // Check if this is a hybrid (contains ×)
    const isHybrid = scientificName.includes('×') || scientificName.toLowerCase().includes(' x ');
    
    // Fix ALL CAPS or improper capitalization (e.g., "SUNFINITY" or every word capitalized)
    let words = scientificName.split(/\s+/);
    const hasImproperCaps = words.length > 0 && words.some((word: string) => 
      word.length > 3 && word === word.toUpperCase() && /[A-Z]/.test(word)
    );
    
    if (scientificName && (scientificName === scientificName.toUpperCase() || hasImproperCaps)) {
      // Convert to proper case: first word capitalized (genus), rest lowercase except cultivar names
      words = scientificName.split(/\s+/);
      if (words.length > 0) {
        // First word is genus - capitalize it
        words[0] = words[0].charAt(0).toUpperCase() + words[0].slice(1).toLowerCase();
        
        // For remaining words, check if they look like cultivar names (multiple capitalized words)
        if (words.length > 1) {
          // Check for × or X indicating hybrid
          const hasHybridMarker = words.some((w: string) => w === 'X' || w === '×');
          const remainingWords = words.slice(1);
          
          if (hasHybridMarker) {
            // Handle hybrid notation
            scientificName = words.map((w: string, i: number) => {
              if (w === 'X') return '×';  // Replace X with proper ×
              if (i === 0) return w;  // Genus already formatted
              return w.toLowerCase();  // Species names lowercase
            }).join(' ');
          } else if (remainingWords.length >= 2 && !scientificName.includes("'")) {
            // Check if this is a series cultivar
            const knownSeries = ['Sunfinity', 'Sunfiniti', 'SunBelievable', 'ProCut'];
            const firstRemainingWord = remainingWords[0];
            const isSeriesCultivar = knownSeries.some(series => 
              firstRemainingWord.toLowerCase() === series.toLowerCase()
            );
            
            if (isSeriesCultivar) {
              // Format as Series cultivar
              const seriesName = firstRemainingWord.charAt(0).toUpperCase() + 
                                firstRemainingWord.slice(1).toLowerCase();
              const cultivarPart = remainingWords.slice(1).map((w: string) => 
                w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
              ).join(' ');
              scientificName = `${words[0]} ${seriesName} Series '${cultivarPart}'`;
            } else {
              // Regular cultivar
              const cultivarName = remainingWords.map((w: string) => 
                w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
              ).join(' ');
              scientificName = `${words[0]} '${cultivarName}'`;
            }
          } else {
            // Just fix the case
            scientificName = words.map((w: string, i: number) => 
              i === 0 ? w : w.toLowerCase()
            ).join(' ');
          }
        }
      }
      plant.scientific_name = scientificName;
    }
    
    // Normalize hybrid notation (replace ' x ' with ' × ')
    if (scientificName.toLowerCase().includes(' x ')) {
      scientificName = scientificName.replace(/ x /gi, ' × ');
      plant.scientific_name = scientificName;
    }
    
    
    // First, extract genus from scientific name if not provided by Perenual
    if (!plant.genus && scientificName) {
      const firstWord = scientificName.split(/\s+/)[0];
      if (firstWord && firstWord[0] === firstWord[0].toUpperCase()) {
        plant.genus = firstWord;
      }
    }
    
    const genus = plant.genus || '';
    
    // Check if we have a cultivar in quotes or apostrophes
    let cultivarMatch = scientificName.match(/['"]([^'"]+)['"]/);
    let hasCultivar = cultivarMatch !== null;
    let cultivarName = cultivarMatch ? cultivarMatch[1] : '';
    
    // Also check for unquoted cultivar patterns (genus followed by multiple capitalized words)
    if (!hasCultivar && genus) {
      // Pattern: "Helianthus Sunfiniti Yellow Dark Center" -> detect as series cultivar
      const pattern = new RegExp(`^${genus}\\s+([A-Z][a-z]*(?:\\s+[A-Z][a-z]*)*)$`);
      const match = scientificName.match(pattern);
      if (match && match[1].split(/\s+/).length >= 2) {
        const words = match[1].split(/\s+/);
        
        // Check if this looks like a series (first word is a brand/series name)
        const knownSeries = ['Sunfinity', 'Sunfiniti', 'SunBelievable', 'ProCut'];
        const firstWord = words[0];
        const isSeriesCultivar = knownSeries.some(series => 
          firstWord.toLowerCase() === series.toLowerCase()
        );
        
        if (isSeriesCultivar) {
          // Format as Series cultivar per ICNCP: Genus Series 'cultivar'
          const seriesName = firstWord;
          const cultivarPart = words.slice(1).join(' ');
          plant.scientific_name = `${genus} ${seriesName} Series '${cultivarPart}'`;
          // Don't mark as needing species - series cultivars don't require species
          hasCultivar = false; // Prevent species lookup
        } else {
          // Regular cultivar
          hasCultivar = true;
          cultivarName = match[1];
          plant.scientific_name = `${genus} '${cultivarName}'`;
        }
      }
    }
    
    // Case 1: We have a cultivar but missing species (like "Helianthus 'Capenoch Star'")
    if (genus && hasCultivar && !plant.species) {
      const lookupKey = `${genus.toLowerCase()} ${cultivarName.toLowerCase()}`;
      const lookupKeyAlt = `${genus.toLowerCase()} ${commonName}`;
      
      // Check our known corrections database
      const species = this.knownSpeciesCorrections[lookupKey] || 
                      this.knownSpeciesCorrections[lookupKeyAlt];
      
      if (species) {
        plant.species = species;
        // Rebuild the scientific name with the species
        plant.scientific_name = `${genus} ${species} '${cultivarName}'`;
      }
    }
    
    // Case 2: Extract species from scientific name if we have it in the format "Genus species 'Cultivar'"
    if (scientificName && !plant.species) {
      const parts = scientificName.split(/\s+/);
      if (parts.length >= 2) {
        const possibleSpecies = parts[1];
        // Check if it's a species (lowercase) and not a cultivar name or quote
        if (possibleSpecies && 
            possibleSpecies[0] === possibleSpecies[0].toLowerCase() && 
            !possibleSpecies.includes("'") && 
            !possibleSpecies.includes('"')) {
          plant.species = possibleSpecies;
        }
      }
    }
    
    // Case 3: Fix common typos in cultivar names
    if (cultivarName) {
      const corrections: { [key: string]: string } = {
        'capenor star': 'Capenoch Star',
        'capenoch star': 'Capenoch Star',
        // Add more typo corrections as needed
      };
      
      const corrected = corrections[cultivarName.toLowerCase()];
      if (corrected && cultivarMatch) {
        plant.scientific_name = plant.scientific_name.replace(cultivarMatch[0], `'${corrected}'`);
      }
    }
    
    // Case 4: Ensure proper formatting of scientific names
    if (plant.genus && plant.species) {
      // Ensure genus is capitalized and species is lowercase
      plant.genus = plant.genus.charAt(0).toUpperCase() + plant.genus.slice(1).toLowerCase();
      plant.species = plant.species.toLowerCase();
      
      // Rebuild scientific name if needed
      if (!plant.scientific_name || plant.scientific_name === '') {
        plant.scientific_name = `${plant.genus} ${plant.species}`;
        if (cultivarName) {
          plant.scientific_name += ` '${cultivarName}'`;
        }
      }
    }
    
    return plant;
  }
  
  // Search Perenual by plant name (alias for searchPerenual)
  async searchPerenualByName(name: string): Promise<any[]> {
    return this.searchPerenual(name);
  }
  
  // Get detailed plant info from Perenual
  async getPerenualDetails(plantId: string): Promise<any> {
    if (!this.perenualApiKey) {
      throw new Error('Perenual API key not configured');
    }
    
    try {
      const response = await fetch(
        `https://perenual.com/api/v2/species/details/${plantId}?key=${this.perenualApiKey}`,
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
  
  // Search GBIF with same rigorous standards as Perenual
  async searchGBIF(query: string): Promise<any[]> {
    try {
      console.log(`Searching GBIF for "${query}"`);
      
      // Use GBIF's species search endpoint - ONLY search Kingdom Plantae!
      const searchUrl = `https://api.gbif.org/v1/species/search?q=${encodeURIComponent(query)}&kingdom=Plantae&rank=SPECIES&rank=SUBSPECIES&rank=VARIETY&status=ACCEPTED&limit=100`;
      
      const response = await fetch(searchUrl, { method: 'GET' });
      
      if (!response.ok) {
        throw new Error(`GBIF API error: ${response.status}`);
      }
      
      const data = await response.json() as any;
      const results = data.results || [];
      
      console.log(`GBIF search for "${query}" returned ${results.length} results`);
      
      // Filter out vague entries AND double-check Kingdom Plantae
      const filteredResults = results.filter((species: any) => {
        // STRICT: Only allow Kingdom Plantae
        if (species.kingdom !== 'Plantae') {
          console.log(`  GBIF filtering out non-plant: ${species.scientificName} (Kingdom: ${species.kingdom || 'unknown'})`);
          return false;
        }
        
        const name = species.scientificName || species.canonicalName || '';
        // Skip entries ending with "sp." (species not determined) or "spp." (multiple species)
        // Skip entries with "agg." (aggregate species) or "complex" (species complex)
        return !name.match(/\b(sp|spp|agg|complex)\.\s*$/i) && 
               !name.match(/\bcultivars?\s*$/i) &&
               !name.match(/\bcvs?\.\s*$/i);
      });
      
      console.log(`After filtering vague entries: ${filteredResults.length} plants`);
      
      // Transform to our format and apply corrections
      return filteredResults.map((species: any) => {
        // Start with basic transformation
        let result = {
          scientific_name: species.scientificName || species.canonicalName || '',
          common_name: species.vernacularName || '',
          family: species.family,
          genus: species.genus,
          species: species.specificEpithet,
          kingdom: species.kingdom,
          phylum: species.phylum,
          class: species.class,
          order: species.order,
          rank: species.rank,
          taxonomic_status: species.taxonomicStatus,
          accepted_name: species.accepted,
          gbif_key: species.key,
          external_id: `gbif-${species.key}`,
          source: 'gbif'
        };
        
        // Apply same nomenclature corrections as Perenual
        result = this.fixBotanicalNomenclature(result);
        
        return result;
      });
    } catch (error) {
      console.error('GBIF search error:', error);
      return [];
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
  
  // Search iNaturalist for plants
  async searchINaturalist(query: string): Promise<any[]> {
    try {
      const searchUrl = `https://api.inaturalist.org/v1/taxa/autocomplete?q=${encodeURIComponent(query)}&rank=species,subspecies,variety,cultivar&is_active=true&per_page=100`;
      
      console.log(`Searching iNaturalist for: ${query}`);
      
      const response = await fetch(searchUrl, { method: 'GET' });
      
      if (!response.ok) {
        throw new Error(`iNaturalist API error: ${response.status}`);
      }
      
      const data = await response.json() as any;
      const results = data.results || [];
      
      console.log(`iNaturalist search for "${query}" returned ${results.length} results`);
      
      // Store reference to this for use in map
      const self = this;
      
      // Filter and format results
      const filteredResults = results
        .filter((taxon: any) => {
          // STRICT: Only allow Kingdom Plantae (no fungi, no animals, no missing kingdoms)
          if (taxon.iconic_taxon_name !== 'Plantae') {
            console.log(`  Filtering out non-plant: ${taxon.name} (Kingdom: ${taxon.iconic_taxon_name || 'unknown'})`);
            return false;
          }
          
          // Filter out vague entries
          const name = taxon.name || '';
          const vagueSuffixes = ['sp.', 'spp.', 'cvs.', 'agg.', 'complex'];
          if (vagueSuffixes.some(suffix => name.endsWith(suffix))) {
            return false;
          }
          
          return true;
        })
        .map((taxon: any) => {
          // Use stored reference to call the method
          const scientificName = self.correctBotanicalNomenclature(taxon.name || '');
          
          return {
            scientific_name: scientificName,
            common_name: taxon.preferred_common_name || taxon.english_common_name || '',
            family: taxon.family?.name || '',
            genus: taxon.genus?.name || '',
            species: taxon.species?.name || '',
            rank: taxon.rank || '',
            conservation_status: taxon.conservation_status?.status || '',
            inaturalist_id: taxon.id?.toString() || '',
            observations_count: taxon.observations_count || 0,
            photo_url: taxon.default_photo?.square_url || ''
          };
        })
        .sort((a: any, b: any) => b.observations_count - a.observations_count); // Sort by popularity
      
      console.log(`After filtering: ${filteredResults.length} plants`);
      
      return filteredResults;
      
    } catch (error) {
      console.error('iNaturalist search error:', error);
      return [];
    }
  }
  
  // Enrich plant with height/spread data from Perenual
  async enrichHeightSpreadFromPerenual(plant: any): Promise<any> {
    if (!this.perenualApiKey) {
      return plant;
    }
    
    // Skip if we already have height/spread data
    if (plant.heightMinCm && plant.heightMaxCm && plant.spreadMinCm && plant.spreadMaxCm) {
      return plant;
    }
    
    try {
      // Search for the plant in Perenual
      const searchResults = await this.searchPerenual(plant.scientific_name || plant.genus);
      
      if (searchResults.length > 0) {
        // Find best match
        const match = searchResults.find(p => 
          p.scientific_name?.toLowerCase() === plant.scientific_name?.toLowerCase()
        ) || searchResults[0];
        
        if (match.dimension) {
          const { parsePlantDimensions } = await import('./dimensionUtils.js');
          const dimensions = parsePlantDimensions({ dimension: match.dimension });
          
          // Update plant with dimension data if missing
          if (!plant.heightMinCm && dimensions.heightMinCm) {
            plant.heightMinCm = dimensions.heightMinCm;
            plant.heightMaxCm = dimensions.heightMaxCm;
            plant.heightMinInches = dimensions.heightMinInches;
            plant.heightMaxInches = dimensions.heightMaxInches;
            console.log(`Enriched height data for ${plant.scientific_name} from Perenual`);
          }
          
          if (!plant.spreadMinCm && dimensions.spreadMinCm) {
            plant.spreadMinCm = dimensions.spreadMinCm;
            plant.spreadMaxCm = dimensions.spreadMaxCm;
            plant.spreadMinInches = dimensions.spreadMinInches;
            plant.spreadMaxInches = dimensions.spreadMaxInches;
            console.log(`Enriched spread data for ${plant.scientific_name} from Perenual`);
          }
        }
      }
    } catch (error) {
      console.error(`Failed to enrich height/spread from Perenual for ${plant.scientific_name}:`, error);
    }
    
    return plant;
  }
  
  // Validate plant data with Perplexity AI
  async validateWithPerplexity(plant: any): Promise<any> {
    const perplexityApiKey = process.env.PERPLEXITY_API_KEY;
    
    if (!perplexityApiKey) {
      console.warn('Perplexity API key not configured, skipping validation');
      return plant;
    }
    
    try {
      // Build a list of ALL empty fields that need validation
      const emptyFields = [];
      if (!plant.common_name) emptyFields.push('common name');
      if (!plant.family) emptyFields.push('plant family');
      if (!plant.type) emptyFields.push('plant type (perennial/annual/shrub)');
      if (!plant.description) emptyFields.push('description');
      if (!plant.watering) emptyFields.push('watering needs');
      if (!plant.sunlight || plant.sunlight?.length === 0) emptyFields.push('sunlight requirements');
      if (!plant.hardiness) emptyFields.push('hardiness zones');
      if (!plant.care_level) emptyFields.push('care level');
      if (!plant.growth_rate) emptyFields.push('growth rate');
      if (!plant.soil || plant.soil?.length === 0) emptyFields.push('soil requirements');
      // Check for height/spread data
      if (!plant.heightMinCm && !plant.heightMaxCm && !plant.dimension) emptyFields.push('mature size dimensions');
      if (!plant.flowering_season) emptyFields.push('flowering season');
      if (!plant.flower_color || plant.flower_color?.length === 0) emptyFields.push('flower colors');
      if (!plant.maintenance) emptyFields.push('maintenance level');
      if (!plant.propagation || plant.propagation?.length === 0) emptyFields.push('propagation methods');
      if (plant.drought_tolerant === undefined) emptyFields.push('drought tolerance');
      if (plant.salt_tolerant === undefined) emptyFields.push('salt tolerance');
      if (plant.poisonous_to_pets === undefined) emptyFields.push('pet toxicity');
      if (plant.medicinal === undefined) emptyFields.push('medicinal uses');
      if (plant.cuisine === undefined) emptyFields.push('culinary uses');
      
      if (emptyFields.length === 0) {
        return plant; // No validation needed
      }
      
      const prompt = `For the plant "${plant.scientific_name}" (${plant.common_name || 'common name unknown'}), provide ALL the following missing information in JSON format: ${emptyFields.join(', ')}.
      
      IMPORTANT RULES:
      1. For flower_color: provide SPECIFIC colors like "yellow", "orange", "red", "pink", "white", "purple", "blue". Never use "varies", "mixed", or "multiple" - list the actual colors instead. If the plant doesn't flower, use null.
      2. For dimensions: Provide as {"height": "30-90 cm", "spread": "60-90 cm"} using CENTIMETERS (cm). Include both min and max range.
      
      Research thoroughly and return ONLY a JSON object with ALL these exact keys (use appropriate values or null if truly unknown):
      {
        "common_name": "string or null",
        "family": "string (botanical family name) or null",
        "type": "perennial/annual/biennial/shrub/tree/bulb/succulent or null",
        "description": "string (2-3 sentences about appearance and characteristics) or null",
        "watering": "low/moderate/high or null",
        "sunlight": ["full sun", "part shade", "shade"] or similar array or null,
        "hardiness": "zone range like 3-9 or null",
        "care_level": "low/moderate/high or null",
        "growth_rate": "slow/moderate/fast or null",
        "soil": ["well-drained", "moist", "sandy"] or similar array or null,
        "dimension": {"height": "30-90 cm", "spread": "60-90 cm"} (always in centimeters with range) or null,
        "flowering_season": "spring/summer/fall/winter or months or null",
        "flower_color": ["yellow", "orange", "red"] (specific colors only, never "varies" or "mixed") or null if no flowers,
        "maintenance": "low/moderate/high or null",
        "propagation": ["seed", "division", "cuttings"] or similar array or null,
        "drought_tolerant": true/false or null,
        "salt_tolerant": true/false or null,
        "poisonous_to_pets": true/false or null,
        "medicinal": true/false or null,
        "cuisine": true/false or null
      }`;
      
      const response = await fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${perplexityApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'sonar-pro',
          messages: [
            {
              role: 'system',
              content: 'You are a botanical expert. Provide accurate plant information in JSON format only.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.2,
          max_tokens: 500
        })
      });
      
      if (!response.ok) {
        throw new Error(`Perplexity API error: ${response.status}`);
      }
      
      const data = await response.json() as any;
      const content = data.choices?.[0]?.message?.content || '{}';
      
      // Parse the JSON response
      let validatedData;
      try {
        validatedData = JSON.parse(content);
      } catch (e) {
        // Try to extract JSON from the response
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          validatedData = JSON.parse(jsonMatch[0]);
        } else {
          console.warn('Could not parse Perplexity response as JSON');
          return plant;
        }
      }
      
      // Merge validated data with existing plant data
      const enrichedPlant = { ...plant };
      let fieldsUpdated = 0;
      
      // Update all possible fields from the validation response
      if (validatedData.common_name && !plant.common_name) {
        enrichedPlant.common_name = validatedData.common_name;
        fieldsUpdated++;
      }
      if (validatedData.family && !plant.family) {
        enrichedPlant.family = validatedData.family;
        fieldsUpdated++;
      }
      if (validatedData.type && !plant.type) {
        enrichedPlant.type = validatedData.type;
        fieldsUpdated++;
      }
      if (validatedData.description && !plant.description) {
        enrichedPlant.description = validatedData.description;
        fieldsUpdated++;
      }
      if (validatedData.watering && !plant.watering) {
        enrichedPlant.watering = validatedData.watering;
        fieldsUpdated++;
      }
      if (validatedData.sunlight && (!plant.sunlight || plant.sunlight.length === 0)) {
        enrichedPlant.sunlight = validatedData.sunlight;
        fieldsUpdated++;
      }
      if (validatedData.hardiness && !plant.hardiness) {
        enrichedPlant.hardiness = validatedData.hardiness;
        fieldsUpdated++;
      }
      if (validatedData.care_level && !plant.care_level) {
        enrichedPlant.care_level = validatedData.care_level;
        fieldsUpdated++;
      }
      if (validatedData.native_region && !plant.native_region) {
        enrichedPlant.native_region = validatedData.native_region;
        fieldsUpdated++;
      }
      if (validatedData.growth_rate && !plant.growth_rate) {
        enrichedPlant.growth_rate = validatedData.growth_rate;
        fieldsUpdated++;
      }
      if (validatedData.soil && (!plant.soil || plant.soil.length === 0)) {
        enrichedPlant.soil = validatedData.soil;
        fieldsUpdated++;
      }
      if (validatedData.dimension && (!plant.dimension || (!plant.heightMinCm && !plant.spreadMinCm))) {
        // Parse dimension strings to numeric values
        const { parsePlantDimensions } = await import('./dimensionUtils.js');
        const dimensions = parsePlantDimensions({
          dimension: validatedData.dimension,
          height: validatedData.dimension?.height,
          spread: validatedData.dimension?.spread
        });
        
        // Update both legacy dimension field and new numeric fields
        enrichedPlant.dimension = validatedData.dimension;
        if (!plant.heightMinCm && dimensions.heightMinCm) {
          enrichedPlant.heightMinCm = dimensions.heightMinCm;
          enrichedPlant.heightMaxCm = dimensions.heightMaxCm;
          enrichedPlant.heightMinInches = dimensions.heightMinInches;
          enrichedPlant.heightMaxInches = dimensions.heightMaxInches;
        }
        if (!plant.spreadMinCm && dimensions.spreadMinCm) {
          enrichedPlant.spreadMinCm = dimensions.spreadMinCm;
          enrichedPlant.spreadMaxCm = dimensions.spreadMaxCm;
          enrichedPlant.spreadMinInches = dimensions.spreadMinInches;
          enrichedPlant.spreadMaxInches = dimensions.spreadMaxInches;
        }
        fieldsUpdated++;
      }
      if (validatedData.flowering_season && !plant.flowering_season) {
        enrichedPlant.flowering_season = validatedData.flowering_season;
        fieldsUpdated++;
      }
      if (validatedData.flower_color && (!plant.flower_color || plant.flower_color.length === 0)) {
        enrichedPlant.flower_color = validatedData.flower_color;
        fieldsUpdated++;
      }
      if (validatedData.maintenance && !plant.maintenance) {
        enrichedPlant.maintenance = validatedData.maintenance;
        fieldsUpdated++;
      }
      if (validatedData.propagation && (!plant.propagation || plant.propagation.length === 0)) {
        enrichedPlant.propagation = validatedData.propagation;
        fieldsUpdated++;
      }
      if (validatedData.drought_tolerant !== null && validatedData.drought_tolerant !== undefined && plant.drought_tolerant === null) {
        enrichedPlant.drought_tolerant = validatedData.drought_tolerant;
        fieldsUpdated++;
      }
      if (validatedData.salt_tolerant !== null && validatedData.salt_tolerant !== undefined && plant.salt_tolerant === null) {
        enrichedPlant.salt_tolerant = validatedData.salt_tolerant;
        fieldsUpdated++;
      }
      if (validatedData.poisonous_to_pets !== null && validatedData.poisonous_to_pets !== undefined && plant.poisonous_to_pets === null) {
        enrichedPlant.poisonous_to_pets = validatedData.poisonous_to_pets;
        fieldsUpdated++;
      }
      if (validatedData.medicinal !== null && validatedData.medicinal !== undefined && plant.medicinal === null) {
        enrichedPlant.medicinal = validatedData.medicinal;
        fieldsUpdated++;
      }
      if (validatedData.cuisine !== null && validatedData.cuisine !== undefined && plant.cuisine === null) {
        enrichedPlant.cuisine = validatedData.cuisine;
        fieldsUpdated++;
      }
      
      console.log(`Validated ${plant.scientific_name} with Perplexity, filled ${fieldsUpdated} fields`);
      
      return enrichedPlant;
      
    } catch (error) {
      console.error('Perplexity validation error:', error);
      return plant; // Return original plant on error
    }
  }
  
  // Comprehensive validation and enrichment pipeline
  async runFullValidationPipeline(plant: any): Promise<any> {
    let enrichedPlant = { ...plant };
    
    console.log(`\nRunning full validation pipeline for: ${plant.scientific_name || plant.common_name}`);
    
    // Step 1: Parse any existing dimension data
    const { parsePlantDimensions, validatePlantData } = await import('./dimensionUtils.js');
    const parsedDimensions = parsePlantDimensions({
      dimension: plant.dimension,
      height: plant.height,
      spread: plant.spread || plant.width,
      heightMinCm: plant.heightMinCm,
      heightMaxCm: plant.heightMaxCm,
      spreadMinCm: plant.spreadMinCm,
      spreadMaxCm: plant.spreadMaxCm
    });
    
    // Apply parsed dimensions if available
    if (parsedDimensions.heightMinCm && !enrichedPlant.heightMinCm) {
      enrichedPlant = { ...enrichedPlant, ...parsedDimensions };
      console.log(`  ✓ Parsed dimensions from existing data`);
    }
    
    // Step 2: Validate data integrity
    const validation = validatePlantData(enrichedPlant);
    if (!validation.isValid) {
      console.warn(`  ⚠ Data validation warnings:`, validation.warnings);
    }
    
    // Step 3: Fix botanical nomenclature
    enrichedPlant = this.fixBotanicalNomenclature(enrichedPlant);
    console.log(`  ✓ Fixed botanical nomenclature`);
    
    // Step 4: Enrich with GBIF data
    if (enrichedPlant.scientific_name) {
      const gbifData = await this.enrichWithGBIF(enrichedPlant.scientific_name);
      if (gbifData.family && !enrichedPlant.family) {
        enrichedPlant.family = gbifData.family;
        console.log(`  ✓ Added family from GBIF: ${gbifData.family}`);
      }
    }
    
    // Step 5: Enrich height/spread from Perenual if missing
    if (!enrichedPlant.heightMinCm || !enrichedPlant.spreadMinCm) {
      enrichedPlant = await this.enrichHeightSpreadFromPerenual(enrichedPlant);
    }
    
    // Step 6: Validate with Perplexity AI for remaining missing fields
    enrichedPlant = await this.validateWithPerplexity(enrichedPlant);
    
    // Step 7: Final dimension parsing in case Perplexity added dimension data
    if (!enrichedPlant.heightMinCm && enrichedPlant.dimension) {
      const finalDimensions = parsePlantDimensions({ dimension: enrichedPlant.dimension });
      if (finalDimensions.heightMinCm) {
        enrichedPlant = { ...enrichedPlant, ...finalDimensions };
        console.log(`  ✓ Parsed dimensions from AI validation`);
      }
    }
    
    // Step 8: Log final status
    const hasHeight = enrichedPlant.heightMinCm && enrichedPlant.heightMaxCm;
    const hasSpread = enrichedPlant.spreadMinCm && enrichedPlant.spreadMaxCm;
    console.log(`  Final status: Height=${hasHeight ? 'YES' : 'NO'}, Spread=${hasSpread ? 'YES' : 'NO'}`);
    
    return enrichedPlant;
  }
  
  // Import plants to database
  async importPlants(plantsData: any[]): Promise<{ imported: number; failed: number }> {
    let imported = 0;
    let failed = 0;
    
    for (const plantData of plantsData) {
      try {
        // Run full validation pipeline before importing
        const validatedPlantData = await this.runFullValidationPipeline(plantData);
        
        // Check if plant already exists
        const existing = await db.select()
          .from(plants)
          .where(eq(plants.scientificName, validatedPlantData.scientific_name))
          .limit(1);
        
        if (existing.length > 0) {
          console.log(`Plant already exists: ${validatedPlantData.scientific_name}`);
          continue;
        }
        
        // Generate a unique ID
        const plantId = `import-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        // Parse dimensions if available
        const { parsePlantDimensions } = await import('./dimensionUtils.js');
        const dimensions = parsePlantDimensions({
          dimension: plantData.dimension,
          height: plantData.height,
          spread: plantData.spread || plantData.width,
          heightMinCm: plantData.heightMinCm,
          heightMaxCm: plantData.heightMaxCm,
          spreadMinCm: plantData.spreadMinCm,
          spreadMaxCm: plantData.spreadMaxCm
        });
        
        // Map the data to our database schema - using correct field names from schema
        const plantRecord = {
          id: plantId,
          scientificName: plantData.scientific_name,
          genus: plantData.genus || plantData.scientific_name?.split(' ')[0] || 'Unknown',
          species: plantData.species || plantData.scientific_name?.split(' ')[1] || undefined,
          commonName: plantData.common_name || 'Unknown',
          description: plantData.description || '',
          family: plantData.family || null, // Add family field!
          
          // Plant characteristics - use correct field names
          type: plantData.cycle || plantData.type || 'perennial', // Use 'type' not 'plantType'
          dimension: plantData.dimension || null, // Keep as JSON for backward compatibility
          // Add numeric dimension fields
          heightMinCm: dimensions.heightMinCm,
          heightMaxCm: dimensions.heightMaxCm,
          spreadMinCm: dimensions.spreadMinCm,
          spreadMaxCm: dimensions.spreadMaxCm,
          heightMinInches: dimensions.heightMinInches,
          heightMaxInches: dimensions.heightMaxInches,
          spreadMinInches: dimensions.spreadMinInches,
          spreadMaxInches: dimensions.spreadMaxInches,
          cycle: plantData.cycle || null,
          foliage: plantData.foliage || null,
          
          // Growing conditions - use correct field names from schema
          hardiness: plantData.hardiness 
            ? (typeof plantData.hardiness === 'object' 
                ? `${plantData.hardiness.min}-${plantData.hardiness.max}`
                : plantData.hardiness)
            : '5-9',
          sunlight: plantData.sunlight || ['full sun to part shade'], // Keep as array
          soil: plantData.soil || ['well-drained'], // Keep as array
          soilPH: plantData.soil_ph || '6.0-7.0',
          watering: plantData.watering || 'moderate', // Use 'watering' not 'waterNeeds'
          wateringGeneralBenchmark: plantData.watering_general_benchmark || null,
          wateringPeriod: plantData.watering_period || null,
          depthWaterRequirement: plantData.depth_water_requirement || null,
          volumeWaterRequirement: plantData.volume_water_requirement || null,
          
          // Plant characteristics - v2 API provides all these!
          growthRate: plantData.growth_rate || 'moderate',
          droughtTolerant: plantData.drought_tolerant || false,
          saltTolerant: plantData.salt_tolerant || false,
          thorny: plantData.thorny || false,
          invasive: plantData.invasive || false,
          tropical: plantData.tropical || false,
          indoor: plantData.indoor || false,
          careLevel: plantData.care_level || 'moderate',
          maintenance: plantData.maintenance || plantData.care_level || 'low',
          hardinessLocation: plantData.hardiness_location || null,
          
          // Appearance - v2 API provides actual colors!
          leafColor: plantData.leaf_color || (plantData.leaf ? ['green'] : null),
          flowerColor: plantData.flower_color || null,  // v2 provides real colors, not 'varies'
          floweringSeason: plantData.flowering_season || plantData.bloom_time || null,
          fruitColor: plantData.fruit_color || null,
          harvestSeason: plantData.harvest_season || null,
          
          // Features
          poisonousToPets: plantData.poisonous_to_pets === true ? 1 : 0,
          poisonousToHumans: plantData.poisonous_to_humans === true ? 1 : 0,
          edibleFruit: plantData.edible_fruit || false,
          edibleLeaf: plantData.edible_leaf || false,
          cuisine: plantData.cuisine || false,
          medicinal: plantData.medicinal || false,
          
          // Propagation and problems
          propagation: Array.isArray(plantData.propagation)
            ? plantData.propagation
            : plantData.propagation ? [plantData.propagation] : null,
          resistance: plantData.resistance || null, // v2 API - disease resistance
          problem: plantData.problem || null, // v2 API - common problems
          pruningMonth: plantData.pruning_month || null,
          
          // Metadata
          createdAt: new Date(),
          updatedAt: new Date(),
          source: plantData.source || 'import',
          perenualId: plantData.perenual_id || plantData.external_id || null,
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