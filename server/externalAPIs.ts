// External API integrations for GardenScape Pro

import FirecrawlApp from '@mendable/firecrawl-js';
import { storage } from './storage';
import { type InsertPlant } from '@shared/schema';
import { extractBotanicalParts } from '@shared/botanicalUtils';

// FireCrawl Web Scraping API
export class FireCrawlAPI {
  private app: FirecrawlApp;

  constructor(apiKey: string) {
    this.app = new FirecrawlApp({ apiKey });
  }

  async scrapePlantData(url: string, saveToDatabase: boolean = false): Promise<any> {
    try {
      console.log('FireCrawl: Starting to scrape URL:', url);
      
      // For German site, try crawling with pagination support
      const isGermanNursery = url.includes('graefin-von-zeppelin.de');
      
      if (isGermanNursery) {
        console.log('Detected German nursery - using two-stage approach...');
        
        // Clean URL - remove hash fragments
        const baseUrl = url.split('#')[0];
        const domain = new URL(baseUrl).origin;
        
        // Stage 1: Get all product URLs
        let productUrls: string[] = [];
        
        // Try Shopify JSON endpoint first
        try {
          console.log('Attempting Shopify JSON API...');
          for (let page = 1; page <= 10; page++) {
            const jsonUrl = `${domain}/collections/stauden/products.json?limit=250&page=${page}`;
            const response = await fetch(jsonUrl);
            if (response.ok) {
              const data = await response.json();
              if (data.products && data.products.length > 0) {
                const pageUrls = data.products.map((p: any) => `${domain}/products/${p.handle}`);
                productUrls.push(...pageUrls);
                console.log(`Page ${page}: Found ${data.products.length} products`);
              } else {
                break; // No more products
              }
            } else {
              break;
            }
          }
        } catch (e) {
          console.log('JSON API failed, using page scraping...');
        }
        
        // Fallback: Scrape collection pages
        if (productUrls.length === 0) {
          console.log('Scraping collection pages for product URLs...');
          const maxPages = 30; // Estimate ~35 products per page = 1050 products
          
          for (let page = 1; page <= maxPages; page++) {
            try {
              const pageUrl = `${baseUrl}?page=${page}`;
              console.log(`Scraping page ${page}...`);
              
              const pageResult = await this.app.scrapeUrl(pageUrl, {
                formats: ['markdown'],
                waitFor: 1000,
                timeout: 15000
              });
              
              if (pageResult.success && pageResult.markdown) {
                const pageProductUrls = this.extractProductUrlsFromPage(pageResult.markdown, domain);
                if (pageProductUrls.length === 0) {
                  console.log(`No more products found at page ${page}`);
                  break;
                }
                productUrls.push(...pageProductUrls);
                console.log(`Page ${page}: Found ${pageProductUrls.length} product URLs`);
              }
              
              // Small delay between pages
              await new Promise(resolve => setTimeout(resolve, 500));
            } catch (e) {
              console.error(`Failed to scrape page ${page}:`, e);
            }
          }
          
          // Deduplicate URLs
          productUrls = Array.from(new Set(productUrls));
        }
        
        console.log(`Total unique product URLs found: ${productUrls.length}`);
        
        if (productUrls.length === 0) {
          throw new Error('No product URLs found');
        }
        
        // Check if we have existing progress for this URL
        let progress = await storage.getScrapingProgress(url);
        let startBatchIndex = 0;
        
        if (progress) {
          // Resume from where we left off
          if (progress.status === 'completed') {
            console.log('Scraping already completed for this URL');
            return {
              plants: [],
              metadata: {
                url,
                message: 'Already completed',
                totalPlants: progress.totalPlants,
                savedPlants: progress.savedPlants,
                duplicates: progress.duplicatePlants
              }
            };
          }
          
          console.log(`Resuming scraping from batch ${progress.completedBatches}`);
          startBatchIndex = progress.completedBatches || 0;
          
          // Update progress with current run
          await storage.updateScrapingProgress(progress.id, {
            status: 'in_progress',
            productUrls: productUrls,
            totalBatches: Math.ceil(productUrls.length / 10)
          });
        } else {
          // Create new progress tracking
          progress = await storage.createScrapingProgress({
            url,
            status: 'in_progress',
            totalBatches: Math.ceil(productUrls.length / 10),
            completedBatches: 0,
            totalPlants: 0,
            savedPlants: 0,
            duplicatePlants: 0,
            failedPlants: 0,
            productUrls: productUrls,
            errors: []
          });
        }
        
        // Stage 2: Scrape products in small batches
        const allPlants: any[] = [];
        const batchSize = 10; // Very small batches to avoid 502
        const batches = Math.ceil(productUrls.length / batchSize);
        let successfulBatches = 0;
        let failedBatches = 0;
        let skippedUrls = 0;
        let processedUrls = 0;
        
        for (let i = startBatchIndex; i < batches; i++) {
          const start = i * batchSize;
          const end = Math.min(start + batchSize, productUrls.length);
          const batch = productUrls.slice(start, end);
          
          console.log(`Processing batch ${i + 1}/${batches} (${batch.length} products)...`);
          
          const batchPlants: any[] = [];
          let batchSkipped = 0;
          let batchProcessed = 0;
          
          try {
            // Process each product in the batch
            for (const productUrl of batch) {
              try {
                // Check if this URL has already been scraped
                const externalId = `firecrawl-${productUrl}`;
                const existingPlant = await storage.getPlantByExternalId(externalId);
                
                if (existingPlant) {
                  console.log(`Skipping already scraped URL: ${productUrl}`);
                  skippedUrls++;
                  batchSkipped++;
                  continue; // Skip to next URL
                }
                
                // URL not yet scraped, process it
                const result = await this.app.scrapeUrl(productUrl, {
                  formats: ['markdown'],
                  waitFor: 500,
                  timeout: 10000
                });
                
                if (result.success && result.markdown) {
                  const plants = this.extractPlantsFromEcommercePage(result.markdown, productUrl);
                  batchPlants.push(...plants);
                  allPlants.push(...plants);
                  processedUrls++;
                  batchProcessed++;
                }
                
                // Rate limiting - wait between products
                await new Promise(resolve => setTimeout(resolve, 300));
              } catch (e) {
                console.error(`Failed to scrape ${productUrl}`);
              }
            }
            
            // Log batch results
            console.log(`Batch ${i + 1}: Processed ${batchProcessed}, Skipped ${batchSkipped} (already scraped)`);
            
            // Save batch to database if enabled
            if (saveToDatabase && batchPlants.length > 0) {
              console.log(`Saving batch ${i + 1} with ${batchPlants.length} plants to database...`);
              
              // Prepare plants for database insertion
              const plantsToSave: InsertPlant[] = batchPlants.map(plant => {
                const scientificName = plant.scientific_name || plant.common_name || 'Unknown';
                
                // Extract botanical parts from scientific name
                const botanicalParts = extractBotanicalParts(scientificName);
                
                return {
                  scientificName,
                  commonName: plant.common_name || '',
                  family: plant.family,
                  genus: plant.genus || botanicalParts.genus || 'Unknown', // Use extracted genus if not provided
                  species: plant.species || botanicalParts.species,
                  cultivar: plant.cultivar || botanicalParts.cultivar,
                  type: plant.type || 'herbaceous perennials',
                  externalId: plant.product_url ? `firecrawl-${plant.product_url}` : undefined,
                  sourceUrl: plant.product_url || plant.page_url || url,
                  description: plant.description,
                  heightMinCm: plant.height_min,
                  heightMaxCm: plant.height_max,
                  spreadMinCm: plant.spread_min,
                  spreadMaxCm: plant.spread_max,
                  bloomStartMonth: plant.bloom_start,
                  bloomEndMonth: plant.bloom_end,
                  flowerColor: plant.flower_color,
                  sunlight: plant.sunlight,
                  watering: plant.watering,
                  soil: plant.soil,
                  hardiness: plant.hardiness,
                  maintenance: plant.maintenance,
                  growthRate: plant.growth_rate,
                  droughtTolerant: plant.drought_tolerant,
                  saltTolerant: plant.salt_tolerant,
                  verificationStatus: 'pending' as const
                };
              });
              
              const saveResult = await storage.bulkCreatePlants(plantsToSave);
              
              // Update progress including skipped URLs
              if (progress) {
                await storage.updateScrapingProgress(progress.id, {
                  completedBatches: i + 1,
                  totalPlants: progress.totalPlants + batchPlants.length,
                  savedPlants: progress.savedPlants + saveResult.saved,
                  duplicatePlants: progress.duplicatePlants + saveResult.duplicates + batchSkipped, // Include skipped as duplicates
                  failedPlants: progress.failedPlants + saveResult.errors,
                  lastProductUrl: batch[batch.length - 1]
                });
                
                // Update local progress object
                progress.totalPlants += batchPlants.length;
                progress.savedPlants += saveResult.saved;
                progress.duplicatePlants += saveResult.duplicates + batchSkipped;
                progress.failedPlants += saveResult.errors;
              }
              
              console.log(`Batch ${i + 1} results: Saved: ${saveResult.saved}, Duplicates: ${saveResult.duplicates}, Skipped: ${batchSkipped}, Errors: ${saveResult.errors}`);
            } else if (!saveToDatabase) {
              // Even when not saving, update the batch progress
              if (progress) {
                await storage.updateScrapingProgress(progress.id, {
                  completedBatches: i + 1,
                  totalPlants: progress.totalPlants + batchPlants.length,
                  duplicatePlants: progress.duplicatePlants + batchSkipped,
                  lastProductUrl: batch[batch.length - 1]
                });
              }
            } else if (batchSkipped > 0 && saveToDatabase) {
              // Batch had only skipped URLs, still update progress
              if (progress) {
                await storage.updateScrapingProgress(progress.id, {
                  completedBatches: i + 1,
                  duplicatePlants: progress.duplicatePlants + batchSkipped,
                  lastProductUrl: batch[batch.length - 1]
                });
                
                progress.duplicatePlants += batchSkipped;
              }
              console.log(`Batch ${i + 1}: All ${batchSkipped} URLs already scraped, skipping.`);
            }
            
            successfulBatches++;
          } catch (error) {
            console.error(`Batch ${i + 1} failed:`, error);
            failedBatches++;
            
            // Store error in progress
            if (progress) {
              const errors = (progress.errors as any[]) || [];
              errors.push({
                batch: i + 1,
                error: (error as Error).message,
                timestamp: new Date().toISOString()
              });
              await storage.updateScrapingProgress(progress.id, { errors });
            }
            
            // If we get 502 errors, wait longer before retrying
            if ((error as any).toString().includes('502')) {
              console.log('Got 502 error, waiting 30 seconds...');
              await new Promise(resolve => setTimeout(resolve, 30000));
            }
          }
          
          // Progress update
          if ((i + 1) % 10 === 0) {
            console.log(`Progress: ${allPlants.length} new plants scraped, ${skippedUrls} URLs skipped (already in DB)`);
            if (saveToDatabase) {
              console.log(`Database stats: Saved: ${progress!.savedPlants}, Previously scraped: ${skippedUrls}, Duplicates: ${progress!.duplicatePlants - skippedUrls}, Errors: ${progress!.failedPlants}`);
            }
          }
        }
        
        console.log(`Scraping completed: ${successfulBatches} successful batches, ${failedBatches} failed batches`);
        console.log(`URLs processed: ${processedUrls} new, ${skippedUrls} skipped (already in database)`);
        console.log(`Total new plants extracted: ${allPlants.length}`);
        
        // Mark scraping as completed
        if (saveToDatabase && progress) {
          await storage.updateScrapingProgress(progress.id, {
            status: 'completed',
            completedAt: new Date()
          });
        }
        
        // Deduplicate plants
        const uniquePlants = this.deduplicatePlants(allPlants);
        console.log(`After deduplication: ${uniquePlants.length} unique plants`);
        
        // Add plant type
        const plantsWithType = uniquePlants.map(plant => ({
          ...plant,
          type: 'herbaceous perennials',
          sources: { firecrawl: true }
        }));
        
        return {
          plants: saveToDatabase ? [] : plantsWithType, // Don't return plants if saving to DB (they're already saved)
          metadata: {
            url,
            scrapedAt: new Date().toISOString(),
            creditsUsed: processedUrls, // Only count newly processed URLs
            pagesCrawled: processedUrls,
            totalPlantsFound: saveToDatabase && progress ? progress.totalPlants : plantsWithType.length,
            extractionMethod: 'two-stage-batch',
            saved: saveToDatabase && progress ? progress.savedPlants : 0,
            duplicates: saveToDatabase && progress ? progress.duplicatePlants : 0,
            skippedUrls: skippedUrls,
            processedUrls: processedUrls,
            errors: saveToDatabase && progress ? progress.failedPlants : 0
          }
        };
      } else {
        // Standard single-page scraping for other sites
        const scrapeResult = await this.app.scrapeUrl(url, {
          formats: ['extract', 'markdown'],
          timeout: 30000,
          extract: {
            schema: {
              _type: 'object' as const,
              properties: {
                products: {
                  _type: 'array' as const,
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
  
  private extractProductUrlsFromPage(content: string, domain: string): string[] {
    const urls: string[] = [];
    
    // Pattern 1: Markdown links to /products/
    const mdLinkPattern = /\[([^\]]+)\]\(\/products\/([^)]+)\)/g;
    let match;
    while ((match = mdLinkPattern.exec(content)) !== null) {
      const productPath = match[2].split('?')[0]; // Remove query params
      urls.push(`${domain}/products/${productPath}`);
    }
    
    // Pattern 2: HTML links (if present in markdown)
    const htmlLinkPattern = /href=["']\/products\/([^"'?]+)/g;
    while ((match = htmlLinkPattern.exec(content)) !== null) {
      urls.push(`${domain}/products/${match[1]}`);
    }
    
    // Pattern 3: Direct product URLs
    const fullUrlPattern = new RegExp(`${domain}/products/([^\\s"'?]+)`, 'g');
    while ((match = fullUrlPattern.exec(content)) !== null) {
      urls.push(match[0]);
    }
    
    // Deduplicate URLs
    return Array.from(new Set(urls));
  }
  
  private extractPlantsFromEcommercePage(markdown: string, pageUrl: string): any[] {
    const plants: any[] = [];
    
    // Check if this is a product detail page or a collection page
    const isProductPage = pageUrl.includes('/products/') && !pageUrl.includes('/collections/');
    
    if (isProductPage) {
      // Extract data from product detail page
      const plant = this.extractProductDetails(markdown, pageUrl);
      if (plant) {
        plants.push(plant);
      }
    } else {
      // Extract links from collection pages
      const linkPattern = /\[([^\]]+)\]\(([^\)]*\/products\/[^\)]+)\)/g;
      // Pattern 2: Look for any product links (more flexible)
      const productLinkPattern = /href=["']([^"']*\/products\/[^"']+)["'][^>]*>([^<]+)</g;
      // Pattern 3: Simple text patterns for plant names with prices
      const plantWithPricePattern = /([A-Z][a-z]+ [a-z]+(?:\s+['"][^'"]+['"])?)[^\n]*€\s*(\d+[,\.]\d+)/g;
      
      // Try standard markdown links first
      let match;
      while ((match = linkPattern.exec(markdown)) !== null) {
        const fullName = match[1];
        const productUrl = match[2];
        
        // Parse the plant name
        const scientificName = this.extractScientificFromName(fullName);
        const commonName = fullName.replace(scientificName || '', '').trim();
        
        plants.push({
          common_name: commonName || fullName,
          scientific_name: scientificName,
          product_url: productUrl,
          product_slug: productUrl.split('/').pop(),
          page_url: pageUrl
        });
      }
      
      // If no plants found, try HTML-style links
      if (plants.length === 0) {
        linkPattern.lastIndex = 0; // Reset regex
        while ((match = productLinkPattern.exec(markdown)) !== null) {
          const productUrl = match[1];
          const fullName = match[2];
          
          const scientificName = this.extractScientificFromName(fullName);
          const commonName = fullName.replace(scientificName || '', '').trim();
          
          plants.push({
            common_name: commonName || fullName,
            scientific_name: scientificName,
            product_url: productUrl,
            product_slug: productUrl.split('/').pop(),
            page_url: pageUrl
          });
        }
      }
      
      // If still no plants, try simple text pattern matching
      if (plants.length === 0) {
        plantWithPricePattern.lastIndex = 0;
        while ((match = plantWithPricePattern.exec(markdown)) !== null) {
          const scientificName = match[1];
          const price = match[2];
          
          plants.push({
            common_name: scientificName,
            scientific_name: scientificName,
            price: `€${price}`,
            page_url: pageUrl
          });
        }
      }
    }
    
    return plants;
  }
  
  private extractProductDetails(markdown: string, pageUrl: string): any {
    // Extract product title (usually h1 or first header)
    const titleMatch = markdown.match(/^#\s+(.+)/m) || markdown.match(/\*\*(.+?)\*\*/);  
    const title = titleMatch ? titleMatch[1].trim() : '';
    
    // Extract price
    const priceMatch = markdown.match(/€\s*(\d+[,.]\d+)/);  
    const price = priceMatch ? `€${priceMatch[1]}` : undefined;
    
    // Extract scientific name from title or content
    const scientificName = this.extractScientificFromName(title) || 
                          this.extractScientificFromName(markdown);
    
    // Extract characteristics
    const heightMatch = markdown.match(/(?:Höhe|Height|Wuchshöhe)[:\s]*([\d,.-]+\s*(?:cm|m))/i);
    const spreadMatch = markdown.match(/(?:Breite|Width|Spread|Wuchsbreite)[:\s]*([\d,.-]+\s*(?:cm|m))/i);
    const bloomMatch = markdown.match(/(?:Blütezeit|Bloom Time|Flowering)[:\s]*([^\n]+)/i);
    const sunMatch = markdown.match(/(?:Standort|Sun|Light|Sonne)[:\s]*([^\n]+)/i);
    const waterMatch = markdown.match(/(?:Wasser|Water|Feuchtigkeit)[:\s]*([^\n]+)/i);
    
    // Extract description (first paragraph after title)
    const descMatch = markdown.match(/^#[^\n]+\n+([^#\n][^\n]+)/m);
    const description = descMatch ? descMatch[1].trim() : undefined;
    
    if (!title && !scientificName) {
      return null; // No valid plant data found
    }
    
    return {
      common_name: title,
      scientific_name: scientificName,
      price,
      description,
      height: heightMatch ? heightMatch[1] : undefined,
      spread: spreadMatch ? spreadMatch[1] : undefined,
      bloom_time: bloomMatch ? bloomMatch[1] : undefined,
      sunlight: sunMatch ? sunMatch[1] : undefined,
      water: waterMatch ? waterMatch[1] : undefined,
      product_url: pageUrl,
      product_slug: pageUrl.split('/').pop()
    };
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