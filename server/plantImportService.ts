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
      
      // Filter out vague entries like "cvs." (cultivars without specific names)
      const filteredPlants = allPlants.filter((plant: any) => {
        const name = plant.scientific_name?.[0] || plant.scientific_name || '';
        // Skip entries ending with "cvs." or "cultivars" as they're too vague
        return !name.match(/\bcvs?\.\s*$/i) && !name.match(/\bcultivars?\s*$/i);
      });
      
      console.log(`After filtering vague entries: ${filteredPlants.length} plants`);
      
      // Transform to our format and fix common nomenclature issues
      return filteredPlants.map((plant: any) => {
        // Start with basic transformation
        let result = {
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
    const hasImproperCaps = words.length > 0 && words.some(word => 
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
          const hasHybridMarker = words.some(w => w === 'X' || w === '×');
          const remainingWords = words.slice(1);
          
          if (hasHybridMarker) {
            // Handle hybrid notation
            scientificName = words.map((w, i) => {
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
              const cultivarPart = remainingWords.slice(1).map(w => 
                w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
              ).join(' ');
              scientificName = `${words[0]} ${seriesName} Series '${cultivarPart}'`;
            } else {
              // Regular cultivar
              const cultivarName = remainingWords.map(w => 
                w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
              ).join(' ');
              scientificName = `${words[0]} '${cultivarName}'`;
            }
          } else {
            // Just fix the case
            scientificName = words.map((w, i) => 
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
  
  // Search GBIF with same rigorous standards as Perenual
  async searchGBIF(query: string): Promise<any[]> {
    try {
      console.log(`Searching GBIF for "${query}"`);
      
      // Use GBIF's species search endpoint
      const searchUrl = `https://api.gbif.org/v1/species/search?q=${encodeURIComponent(query)}&rank=SPECIES&rank=SUBSPECIES&rank=VARIETY&status=ACCEPTED&limit=100`;
      
      const response = await fetch(searchUrl, { method: 'GET' });
      
      if (!response.ok) {
        throw new Error(`GBIF API error: ${response.status}`);
      }
      
      const data = await response.json() as any;
      const results = data.results || [];
      
      console.log(`GBIF search for "${query}" returned ${results.length} results`);
      
      // Filter out vague entries
      const filteredResults = results.filter((species: any) => {
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
      
      // Filter and format results
      const filteredResults = results
        .filter((taxon: any) => {
          // Filter out non-plant kingdoms
          if (taxon.iconic_taxon_name && 
              !['Plantae', 'Fungi'].includes(taxon.iconic_taxon_name)) {
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
          // Use arrow function to preserve 'this' context
          const scientificName = this.correctBotanicalNomenclature(taxon.name || '');
          
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
  
  // Validate plant data with Perplexity AI
  async validateWithPerplexity(plant: any): Promise<any> {
    const perplexityApiKey = process.env.PERPLEXITY_API_KEY;
    
    if (!perplexityApiKey) {
      console.warn('Perplexity API key not configured, skipping validation');
      return plant;
    }
    
    try {
      // Build a list of empty fields that need validation
      const emptyFields = [];
      if (!plant.common_name) emptyFields.push('common name');
      if (!plant.family) emptyFields.push('family');
      if (!plant.description) emptyFields.push('description');
      if (!plant.watering) emptyFields.push('watering needs');
      if (!plant.sunlight || plant.sunlight?.length === 0) emptyFields.push('sunlight requirements');
      if (!plant.care_level) emptyFields.push('care level');
      if (!plant.native_region) emptyFields.push('native region');
      if (!plant.growth_rate) emptyFields.push('growth rate');
      if (!plant.soil || plant.soil?.length === 0) emptyFields.push('soil requirements');
      
      if (emptyFields.length === 0) {
        return plant; // No validation needed
      }
      
      const prompt = `For the plant "${plant.scientific_name}", provide the following missing information in JSON format: ${emptyFields.join(', ')}. 
      
      Return ONLY a JSON object with these exact keys (use null if truly unknown):
      {
        "common_name": "string or null",
        "family": "string or null",
        "description": "string (1-2 sentences) or null",
        "watering": "low/moderate/high or null",
        "sunlight": ["full sun", "part shade"] or null,
        "care_level": "low/moderate/high or null",
        "native_region": "string or null",
        "growth_rate": "slow/moderate/fast or null",
        "soil": ["well-drained", "moist"] or null
      }`;
      
      const response = await fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${perplexityApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'sonar',
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
      
      if (validatedData.common_name && !plant.common_name) {
        enrichedPlant.common_name = validatedData.common_name;
      }
      if (validatedData.family && !plant.family) {
        enrichedPlant.family = validatedData.family;
      }
      if (validatedData.description && !plant.description) {
        enrichedPlant.description = validatedData.description;
      }
      if (validatedData.watering && !plant.watering) {
        enrichedPlant.watering = validatedData.watering;
      }
      if (validatedData.sunlight && (!plant.sunlight || plant.sunlight.length === 0)) {
        enrichedPlant.sunlight = validatedData.sunlight;
      }
      if (validatedData.care_level && !plant.care_level) {
        enrichedPlant.care_level = validatedData.care_level;
      }
      if (validatedData.native_region && !plant.native_region) {
        enrichedPlant.native_region = validatedData.native_region;
      }
      if (validatedData.growth_rate && !plant.growth_rate) {
        enrichedPlant.growth_rate = validatedData.growth_rate;
      }
      if (validatedData.soil && (!plant.soil || plant.soil.length === 0)) {
        enrichedPlant.soil = validatedData.soil;
      }
      
      console.log(`Validated ${plant.scientific_name} with Perplexity, filled ${emptyFields.length} fields`);
      
      return enrichedPlant;
      
    } catch (error) {
      console.error('Perplexity validation error:', error);
      return plant; // Return original plant on error
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