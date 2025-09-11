// External API integrations for GardenScape Pro

import FirecrawlApp from '@mendable/firecrawl-js';
import { storage } from './storage';
import { type InsertPlant } from '@shared/schema';
import { extractBotanicalParts } from '@shared/botanicalUtils';
import PerplexityAI from './perplexityAI';

// Rate limiter class for API calls
class RateLimiter {
  private timestamps: number[] = [];
  private readonly maxRequests: number;
  private readonly windowMs: number;
  private retryCount: Map<string, number> = new Map();

  constructor(maxRequests: number = 5, windowMs: number = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  async waitIfNeeded(requestId?: string): Promise<void> {
    const now = Date.now();
    
    // Remove timestamps outside the window
    this.timestamps = this.timestamps.filter(ts => now - ts < this.windowMs);
    
    // If we're at the limit, calculate wait time
    if (this.timestamps.length >= this.maxRequests) {
      const oldestTimestamp = this.timestamps[0];
      const waitTime = this.windowMs - (now - oldestTimestamp) + 1000; // Add 1 second buffer
      
      if (waitTime > 0) {
        console.log(`Rate limit reached. Waiting ${Math.ceil(waitTime / 1000)} seconds before next AI extraction...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        
        // Clean up after waiting
        const newNow = Date.now();
        this.timestamps = this.timestamps.filter(ts => newNow - ts < this.windowMs);
      }
    }
    
    // Record this request
    this.timestamps.push(Date.now());
  }

  async executeWithRetry<T>(
    fn: () => Promise<T>,
    requestId: string,
    maxRetries: number = 3
  ): Promise<T> {
    const retries = this.retryCount.get(requestId) || 0;
    
    try {
      await this.waitIfNeeded(requestId);
      const result = await fn();
      this.retryCount.delete(requestId); // Clear on success
      return result;
    } catch (error: any) {
      // Check if it's a rate limit error
      const isRateLimit = error?.status === 429 || 
                         error?.statusCode === 429 || 
                         error?.message?.includes('rate limit') ||
                         error?.message?.includes('429');
      
      if (isRateLimit && retries < maxRetries) {
        const retryDelay = Math.min(60000, Math.pow(2, retries) * 5000); // Exponential backoff: 5s, 10s, 20s, max 60s
        console.log(`Rate limit error. Retry ${retries + 1}/${maxRetries} after ${retryDelay / 1000} seconds...`);
        
        this.retryCount.set(requestId, retries + 1);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        
        // Recursive retry
        return this.executeWithRetry(fn, requestId, maxRetries);
      }
      
      // Clear retry count on non-retryable error or max retries reached
      this.retryCount.delete(requestId);
      throw error;
    }
  }

  getRemainingCapacity(): number {
    const now = Date.now();
    this.timestamps = this.timestamps.filter(ts => now - ts < this.windowMs);
    return Math.max(0, this.maxRequests - this.timestamps.length);
  }
}

// FireCrawl Web Scraping API
export class FireCrawlAPI {
  private app: FirecrawlApp;
  private perplexity: PerplexityAI | null = null;
  private rateLimiter: RateLimiter;
  private aiExtractionEnabled: boolean = true;

  constructor(apiKey: string, perplexityApiKey?: string) {
    this.app = new FirecrawlApp({ apiKey });
    if (perplexityApiKey) {
      this.perplexity = new PerplexityAI(perplexityApiKey);
    }
    // Initialize rate limiter for Perplexity API (100 requests per minute - much more generous)
    this.rateLimiter = new RateLimiter(100, 60000);
  }

  async scrapePlantData(url: string, saveToDatabase: boolean = false, force: boolean = false): Promise<any> {
    try {
      console.log('FireCrawl: Starting to scrape URL:', url);
      
      // For German site, try crawling with pagination support
      const isGermanNursery = url.includes('graefin-von-zeppelin.de');
      
      if (isGermanNursery) {
        console.log('Detected German nursery - using two-stage approach...');
        
        // Clean URL - remove hash fragments
        const baseUrl = url.split('#')[0];
        const domain = new URL(baseUrl).origin;
        const urlParts = new URL(baseUrl);
        const pathParts = urlParts.pathname.split('/');
        
        // Stage 1: Get all product URLs
        let productUrls: string[] = [];
        
        // Try Shopify JSON endpoint first
        try {
          console.log('Attempting Shopify JSON API...');
          
          // Extract collection name from URL (e.g., /collections/stauden -> stauden)
          let collectionName = 'stauden'; // default
          if (pathParts.includes('collections') && pathParts.indexOf('collections') < pathParts.length - 1) {
            collectionName = pathParts[pathParts.indexOf('collections') + 1];
          }
          console.log(`Using collection: ${collectionName}`);
          
          // Try to get all products via JSON API (increased pages to handle 1010 products)
          for (let page = 1; page <= 50; page++) {
            const jsonUrl = `${domain}/collections/${collectionName}/products.json?limit=250&page=${page}`;
            const response = await fetch(jsonUrl);
            if (response.ok) {
              const data = await response.json();
              if (data.products && data.products.length > 0) {
                const pageUrls = data.products.map((p: any) => `${domain}/products/${p.handle}`);
                productUrls.push(...pageUrls);
                console.log(`JSON API Page ${page}: Found ${data.products.length} products`);
              } else {
                console.log(`JSON API: No more products at page ${page}`);
                break; // No more products
              }
            } else {
              console.log(`JSON API failed at page ${page}: ${response.status}`);
              break;
            }
          }
        } catch (e) {
          console.log('JSON API failed:', e);
        }
        
        // Fallback: Scrape collection pages
        if (productUrls.length === 0) {
          console.log('JSON API returned no products, falling back to HTML scraping...');
          const maxPages = 50; // Increased to handle 1010 products (~20-30 per page)
          
          for (let page = 1; page <= maxPages; page++) {
            try {
              // Properly append page parameter
              const separator = baseUrl.includes('?') ? '&' : '?';
              const pageUrl = `${baseUrl}${separator}page=${page}`;
              console.log(`Scraping HTML page ${page}: ${pageUrl}`);
              
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
                console.log(`HTML Page ${page}: Found ${pageProductUrls.length} product URLs`);
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
        
        // Deduplicate URLs again in case both methods found some
        productUrls = Array.from(new Set(productUrls));
        
        // Define constants for concurrent processing upfront
        // Perplexity has much higher rate limits (100+/min) so we can use full concurrency
        const CONCURRENT_LIMIT = 5; // Full concurrent browsers for maximum speed
        const batchSize = 25; // Larger batches for efficient processing
        
        console.log(`===== PRODUCT DISCOVERY COMPLETE =====`);
        console.log(`Total unique product URLs found: ${productUrls.length}`);
        console.log(`Expected: ~1010 products`);
        console.log(`Using ${CONCURRENT_LIMIT} concurrent browsers for optimal performance`);
        console.log(`AI extraction rate limit: ${this.rateLimiter.getRemainingCapacity()}/100 requests available`);
        console.log(`=======================================`);
        
        if (productUrls.length === 0) {
          throw new Error('No product URLs found');
        }
        
        // Check if we have existing progress for this URL
        let progress = await storage.getScrapingProgress(url);
        let startBatchIndex = 0;
        
        if (progress) {
          // Resume from where we left off or reset if force is true
          if (progress.status === 'completed' && !force) {
            console.log('Scraping already completed for this URL. Use force=true to re-scrape.');
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
          
          // Reset progress if force is true
          if (force) {
            console.log('Force re-scraping enabled, resetting progress...');
            await storage.updateScrapingProgress(progress.id, {
              status: 'in_progress',
              completedBatches: 0,
              totalPlants: 0,
              savedPlants: 0,
              duplicatePlants: 0,
              failedPlants: 0,
              errors: []
            });
            startBatchIndex = 0;
          } else {
            console.log(`Resuming scraping from batch ${progress.completedBatches}`);
            startBatchIndex = progress.completedBatches || 0;
          }
          
          // Update progress with current run
          await storage.updateScrapingProgress(progress.id, {
            status: 'in_progress',
            productUrls: productUrls,
            totalBatches: Math.ceil(productUrls.length / batchSize)
          });
        } else {
          // Create new progress tracking
          progress = await storage.createScrapingProgress({
            url,
            status: 'in_progress',
            totalBatches: Math.ceil(productUrls.length / batchSize),
            completedBatches: 0,
            totalPlants: 0,
            savedPlants: 0,
            duplicatePlants: 0,
            failedPlants: 0,
            productUrls: productUrls,
            errors: []
          });
        }
        
        // Stage 2: Scrape products with concurrent processing (5 browsers)
        const allPlants: any[] = [];
        // OPTIMIZATION: Using 5 concurrent browsers (Firecrawl's limit) for 5x faster scraping
        // This reduces scraping time from ~1010 sequential requests to ~202 concurrent chunks
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
          const batchStartTime = Date.now(); // Track timing for performance metrics
          
          try {
            // Process batch in chunks of 5 concurrent requests (Perplexity supports high concurrency)
            const chunkSize = CONCURRENT_LIMIT;
            const chunks = [];
            for (let j = 0; j < batch.length; j += chunkSize) {
              chunks.push(batch.slice(j, Math.min(j + chunkSize, batch.length)));
            }
            
            console.log(`\nBatch ${i + 1}/${batches}: Processing ${batch.length} URLs in ${chunks.length} concurrent chunks (${CONCURRENT_LIMIT} browsers)`);
            console.log(`AI rate limit capacity: ${this.rateLimiter.getRemainingCapacity()}/100 available`);
            
            // Process each chunk of 5 URLs concurrently
            for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
              const chunk = chunks[chunkIndex];
              
              // Process all URLs in the chunk concurrently
              const chunkPromises = chunk.map(async (productUrl) => {
                try {
                  // Check if this URL has already been scraped
                  const externalId = `firecrawl-${productUrl}`;
                  const existingPlant = await storage.getPlantByExternalId(externalId);
                  
                  // Skip existing plants only if force flag is not set
                  if (existingPlant && !force) {
                    console.log(`Skipping already scraped URL: ${productUrl}`);
                    skippedUrls++;
                    batchSkipped++;
                    return null; // Return null for skipped URLs
                  }
                  
                  // URL not yet scraped, process it
                  const result = await this.app.scrapeUrl(productUrl, {
                    formats: ['markdown'],
                    waitFor: 500,
                    timeout: 10000
                  });
                  
                  if (result.success && result.markdown) {
                    const plants = await this.extractPlantsFromEcommercePage(result.markdown, productUrl);
                    processedUrls++;
                    batchProcessed++;
                    return plants; // Return plants for successful scrapes
                  }
                  
                  return null;
                } catch (e) {
                  console.error(`Failed to scrape ${productUrl}:`, e);
                  return null; // Return null for failed URLs
                }
              });
              
              // Wait for all URLs in the chunk to complete
              const chunkResults = await Promise.all(chunkPromises);
              
              // Collect plants from successful scrapes
              for (const plants of chunkResults) {
                if (plants && plants.length > 0) {
                  batchPlants.push(...plants);
                  allPlants.push(...plants);
                }
              }
              
              // Add small delay between chunks for API stability
              // Perplexity has high rate limits so we can use minimal delay
              if (chunkIndex < chunks.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 100)); // Minimal delay for stability
              }
              
              // Progress reporting per chunk
              if ((chunkIndex + 1) % 5 === 0 || chunkIndex === chunks.length - 1) {
                console.log(`  Chunk ${chunkIndex + 1}/${chunks.length} completed - Processed: ${batchProcessed}, Skipped: ${batchSkipped}`);
              }
            }
            
            // Log batch results with timing
            const batchTime = ((Date.now() - batchStartTime) / 1000).toFixed(1);
            const avgTimePerUrl = (batchTime / batch.length).toFixed(2);
            console.log(`Batch ${i + 1} completed in ${batchTime}s (${avgTimePerUrl}s/URL avg): Processed ${batchProcessed}, Skipped ${batchSkipped}`);
            
            // Save batch to database if enabled
            if (saveToDatabase && batchPlants.length > 0) {
              console.log(`Saving batch ${i + 1} with ${batchPlants.length} plants to database...`);
              
              // Prepare plants for database insertion
              const plantsToSave: InsertPlant[] = [];
              let skippedInvalid = 0;
              
              for (const plant of batchPlants) {
                // Generate a proper scientific name
                let scientificName = plant.scientific_name;
                let botanicalParts = { genus: null, species: null, cultivar: null };
                
                // First try to extract from existing scientific name
                if (scientificName) {
                  botanicalParts = extractBotanicalParts(scientificName);
                }
                
                // If no valid botanical parts, try to create from common name
                if (!botanicalParts.genus && plant.common_name) {
                  // Try to extract botanical parts from common name
                  botanicalParts = extractBotanicalParts(plant.common_name);
                  
                  // If still no genus, try to generate from title
                  if (!botanicalParts.genus) {
                    // Create a unique identifier from common name and URL
                    const urlSlug = plant.product_url ? plant.product_url.split('/').pop() : '';
                    const cleanName = plant.common_name.replace(/[^a-zA-Z0-9\s]/g, '').trim();
                    
                    if (cleanName) {
                      // Generate a pseudo-scientific name for uniqueness
                      // Use the first word as genus and add URL slug for uniqueness
                      const nameParts = cleanName.split(' ');
                      botanicalParts.genus = nameParts[0];
                      botanicalParts.species = urlSlug || nameParts.slice(1).join('-').toLowerCase() || 'sp';
                      scientificName = `${botanicalParts.genus} ${botanicalParts.species}`;
                    }
                  } else {
                    // We have botanical parts, construct the scientific name
                    scientificName = botanicalParts.genus;
                    if (botanicalParts.species) {
                      scientificName += ` ${botanicalParts.species}`;
                    }
                    if (botanicalParts.cultivar) {
                      scientificName += ` '${botanicalParts.cultivar}'`;
                    }
                  }
                }
                
                // Skip if we still don't have valid data
                if (!scientificName || !botanicalParts.genus) {
                  console.error(`Skipping plant with invalid botanical data: ${plant.common_name || 'Unknown'} from ${plant.product_url}`);
                  skippedInvalid++;
                  continue;
                }
                
                plantsToSave.push({
                  scientificName,
                  commonName: plant.common_name || '',
                  family: plant.family,
                  genus: plant.genus || botanicalParts.genus,
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
                });
              }
              
              console.log(`Batch ${i + 1}: ${plantsToSave.length} valid plants to save (${skippedInvalid} invalid skipped)`);
              
              // Only save if we have valid plants
              let saveResult = { saved: 0, duplicates: 0, errors: 0 };
              if (plantsToSave.length > 0) {
                saveResult = await storage.bulkCreatePlants(plantsToSave);
                console.log(`Batch ${i + 1} save results: ${saveResult.saved} saved, ${saveResult.duplicates} duplicates, ${saveResult.errors} errors`);
              }
              
              // Update progress with ACTUAL save results, not planned counts
              if (progress) {
                await storage.updateScrapingProgress(progress.id, {
                  completedBatches: i + 1,
                  totalPlants: progress.totalPlants + plantsToSave.length, // Only count valid plants
                  savedPlants: progress.savedPlants + saveResult.saved, // Use actual saved count
                  duplicatePlants: progress.duplicatePlants + saveResult.duplicates + batchSkipped, // Include skipped URLs
                  failedPlants: progress.failedPlants + saveResult.errors + skippedInvalid, // Include invalid plants
                  lastProductUrl: batch[batch.length - 1]
                });
                
                // Update local progress object with actual counts
                progress.totalPlants += plantsToSave.length;
                progress.savedPlants += saveResult.saved;
                progress.duplicatePlants += saveResult.duplicates + batchSkipped;
                progress.failedPlants += saveResult.errors + skippedInvalid;
              }
              
              console.log(`Batch ${i + 1} cumulative totals: Total: ${progress?.totalPlants}, Saved: ${progress?.savedPlants}, Duplicates: ${progress?.duplicatePlants}, Failed: ${progress?.failedPlants}`);
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
            
            // If we get 502 errors, wait before retrying but less time since we're more efficient
            if ((error as any).toString().includes('502')) {
              console.log('Got 502 error, waiting 10 seconds before retrying...');
              await new Promise(resolve => setTimeout(resolve, 10000));
            }
          }
          
          // Progress update - more frequent for concurrent processing
          if ((i + 1) % 5 === 0 || i === batches - 1) {
            const percentComplete = Math.round(((i + 1) / batches) * 100);
            console.log(`\n📊 Overall Progress: ${percentComplete}% (${i + 1}/${batches} batches)`);
            console.log(`   New plants: ${allPlants.length}, Skipped: ${skippedUrls}, Processed: ${processedUrls}`);
            if (saveToDatabase) {
              console.log(`   DB Stats - Saved: ${progress!.savedPlants}, Duplicates: ${progress!.duplicatePlants}, Errors: ${progress!.failedPlants}`);
            }
          }
        }
        
        console.log(`\n========== SCRAPING COMPLETED ==========`);
        console.log(`Successful batches: ${successfulBatches}/${batches}`);
        console.log(`Failed batches: ${failedBatches}`);
        console.log(`URLs processed: ${processedUrls} new, ${skippedUrls} skipped`);
        console.log(`Total new plants extracted: ${allPlants.length}`);
        console.log(`Performance: ${CONCURRENT_LIMIT}x concurrent browsers (rate-limited for AI)`);
        console.log(`Final AI rate limit status: ${this.rateLimiter.getRemainingCapacity()}/5 available`);
        console.log(`========================================\n`);
        
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
  
  private async extractPlantsFromEcommercePage(markdown: string, pageUrl: string): Promise<any[]> {
    const plants: any[] = [];
    
    // Check if this is a product detail page or a collection page
    const isProductPage = pageUrl.includes('/products/') && !pageUrl.includes('/collections/');
    
    if (isProductPage) {
      // Extract data from product detail page
      const plant = await this.extractProductDetails(markdown, pageUrl);
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
  
  private async extractWithAI(markdown: string, pageUrl: string): Promise<any> {
    if (!this.perplexity) {
      throw new Error('Perplexity AI not configured');
    }

    if (!this.aiExtractionEnabled) {
      throw new Error('AI extraction temporarily disabled due to rate limits');
    }

    try {
      // Use rate limiter to execute AI extraction with proper throttling
      const extractedData = await this.rateLimiter.executeWithRetry(
        () => this.perplexity!.extractPlantData(markdown, pageUrl),
        `ai-extract-${pageUrl}`,
        3 // Max 3 retries with exponential backoff
      );
      
      // Import dimension parsing utilities
      const { parsePlantDimensions, validatePlantData } = await import('./dimensionUtils.js');
      
      // Parse dimensions to get numeric values
      const dimensions = parsePlantDimensions({
        height: extractedData.height,
        spread: extractedData.spread
      });
      
      // Convert sunlight to array format if needed
      let sunlightArray: string[] | undefined;
      if (extractedData.sunlight) {
        if (extractedData.sunlight === 'sun to partial shade') {
          sunlightArray = ['full sun', 'partial shade'];
        } else {
          sunlightArray = [extractedData.sunlight];
        }
      }

      // Convert extracted data to our format with proper dimensions
      const plant = {
        common_name: extractedData.common_name || extractedData.scientific_name,
        scientific_name: extractedData.scientific_name,
        description: extractedData.description,
        price: extractedData.price,
        height: extractedData.height, // Keep original string for reference
        spread: extractedData.spread, // Keep original string for reference
        // Add parsed numeric dimensions
        heightMinCm: dimensions.heightMinCm,
        heightMaxCm: dimensions.heightMaxCm,
        spreadMinCm: dimensions.spreadMinCm,
        spreadMaxCm: dimensions.spreadMaxCm,
        heightMinInches: dimensions.heightMinInches,
        heightMaxInches: dimensions.heightMaxInches,
        spreadMinInches: dimensions.spreadMinInches,
        spreadMaxInches: dimensions.spreadMaxInches,
        bloom_time: extractedData.bloom_time,
        sunlight: sunlightArray,
        water: extractedData.water,
        hardiness: extractedData.hardiness,
        soil: extractedData.soil,
        flower_color: extractedData.flower_color,
        foliage_color: extractedData.foliage_color,
        growth_habit: extractedData.growth_habit,
        product_url: pageUrl,
        product_slug: pageUrl.split('/').pop(),
        language: 'de' // Mark as German content
      };
      
      // Validate the extracted data
      const validation = validatePlantData(plant);
      if (!validation.isValid) {
        console.warn(`Data validation warnings for ${plant.scientific_name}:`, validation.warnings);
      }
      
      return plant;
    } catch (error: any) {
      console.error('AI extraction error:', error);
      
      // If we get consistent rate limit errors, temporarily disable AI extraction
      if (error?.status === 429 || error?.message?.includes('rate limit')) {
        console.warn('Multiple rate limit errors detected. Consider reducing concurrent processing.');
      }
      
      throw error;
    }
  }
  
  private async extractProductDetails(markdown: string, pageUrl: string): Promise<any> {
    // Check if this is a German nursery page
    const isGermanContent = pageUrl.includes('graefin-von-zeppelin.de') || 
                           markdown.includes('Wuchshöhe') || 
                           markdown.includes('Blütezeit') ||
                           markdown.includes('Standort');
    
    // Use AI extraction for German content if available
    if (isGermanContent && this.perplexity) {
      try {
        console.log('Using AI extraction for German content from:', pageUrl);
        return await this.extractWithAI(markdown, pageUrl);
      } catch (error) {
        console.error('AI extraction failed, falling back to regex:', error);
        // Fall back to regex extraction if AI fails
      }
    }
    
    // Original regex-based extraction for non-German content or fallback
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