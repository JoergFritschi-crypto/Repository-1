import { db } from "./db";
import { apiHealthChecks, apiUsageStats, apiAlerts } from "@shared/schema";
import { eq, and, gte, sql } from "drizzle-orm";
import { fallbackStorage } from "./utils/fallbackStorage";

interface HealthCheckResult {
  service: string;
  status: 'healthy' | 'degraded' | 'down';
  responseTime?: number;
  errorMessage?: string;
  quotaUsed?: number;
  quotaLimit?: number;
  metadata?: any;
}

interface ServiceEndpoint {
  name: string;
  testFunction: () => Promise<HealthCheckResult>;
  criticalService: boolean;
}

export class APIMonitoringService {
  private services: ServiceEndpoint[] = [];
  private healthCache = new Map<string, HealthCheckResult>();
  private usageCache = new Map<string, any>();
  private lastHealthCheck: Date | null = null;
  private readonly HEALTH_CACHE_TTL = 60 * 1000; // 1 minute
  private readonly USAGE_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor() {
    this.initializeServices();
  }

  private initializeServices() {
    // Anthropic AI Health Check
    if (process.env.ANTHROPIC_API_KEY) {
      this.services.push({
        name: 'anthropic',
        criticalService: true,
        testFunction: async () => {
          const startTime = Date.now();
          try {
            const response = await fetch('https://api.anthropic.com/v1/messages', {
              method: 'POST',
              headers: {
                'x-api-key': process.env.ANTHROPIC_API_KEY!,
                'anthropic-version': '2023-06-01',
                'content-type': 'application/json',
              },
              body: JSON.stringify({
                model: 'claude-3-haiku-20240307',
                max_tokens: 10,
                messages: [{ role: 'user', content: 'test' }]
              })
            });
            const responseTime = Date.now() - startTime;
            
            if (response.ok) {
              const remaining = response.headers.get('anthropic-ratelimit-requests-remaining');
              const limit = response.headers.get('anthropic-ratelimit-requests-limit');
              
              return {
                service: 'anthropic',
                status: 'healthy',
                responseTime,
                quotaUsed: limit && remaining ? parseInt(limit) - parseInt(remaining) : undefined,
                quotaLimit: limit ? parseInt(limit) : undefined
              };
            } else {
              const error = await response.text();
              return {
                service: 'anthropic',
                status: response.status === 429 ? 'degraded' : 'down',
                responseTime,
                errorMessage: error
              };
            }
          } catch (error) {
            return {
              service: 'anthropic',
              status: 'down',
              responseTime: Date.now() - startTime,
              errorMessage: error.message
            };
          }
        }
      });
    }

    // Perplexity AI Health Check
    if (process.env.PERPLEXITY_API_KEY) {
      this.services.push({
        name: 'perplexity',
        criticalService: true,
        testFunction: async () => {
          const startTime = Date.now();
          try {
            const response = await fetch('https://api.perplexity.ai/chat/completions', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                model: 'sonar-pro',
                messages: [
                  {
                    role: 'system',
                    content: 'You are a helpful assistant.'
                  },
                  { 
                    role: 'user', 
                    content: 'Reply with just the word test' 
                  }
                ],
                max_tokens: 10,
                temperature: 0.2,
                top_p: 0.9,
                stream: false,
                presence_penalty: 0,
                frequency_penalty: 1
              })
            });
            const responseTime = Date.now() - startTime;
            
            if (response.ok) {
              const data = await response.json();
              return {
                service: 'perplexity',
                status: 'healthy',
                responseTime,
                metadata: {
                  model: data.model,
                  usage: data.usage
                }
              };
            } else {
              const errorText = await response.text();
              let errorDetails = errorText;
              try {
                const errorJson = JSON.parse(errorText);
                errorDetails = errorJson.error?.message || errorJson.detail || errorText;
              } catch (e) {
                // Keep errorText as is if not JSON
              }
              
              return {
                service: 'perplexity',
                status: response.status === 429 ? 'degraded' : 'down',
                responseTime,
                errorMessage: `Status ${response.status}: ${errorDetails}`
              };
            }
          } catch (error) {
            return {
              service: 'perplexity',
              status: 'down',
              responseTime: Date.now() - startTime,
              errorMessage: `Connection failed: ${error.message}`
            };
          }
        }
      });
    }

    // Gemini AI Health Check
    if (process.env.GEMINI_API_KEY) {
      this.services.push({
        name: 'gemini',
        criticalService: false,
        testFunction: async () => {
          const startTime = Date.now();
          try {
            // Use Gemini 2.5 Flash Preview (Nano Banana)
            const response = await fetch(
              `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image-preview:generateContent?key=${process.env.GEMINI_API_KEY}`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  contents: [{ parts: [{ text: 'test' }] }]
                })
              }
            );
            const responseTime = Date.now() - startTime;
            
            if (response.ok) {
              const data = await response.json();
              return {
                service: 'gemini',
                status: 'healthy',
                responseTime,
                metadata: { model: 'gemini-2.5-flash-image-preview' }
              };
            } else {
              const errorText = await response.text();
              let errorDetails = errorText;
              try {
                const errorJson = JSON.parse(errorText);
                errorDetails = errorJson.error?.message || errorText;
              } catch (e) {
                // Keep errorText as is
              }
              return {
                service: 'gemini',
                status: response.status === 429 ? 'degraded' : 'down',
                responseTime,
                errorMessage: `Status ${response.status}: ${errorDetails}`
              };
            }
          } catch (error) {
            return {
              service: 'gemini',
              status: 'down',
              responseTime: Date.now() - startTime,
              errorMessage: error.message
            };
          }
        }
      });
    }

    // Perenual API Health Check
    if (process.env.PERENUAL_API_KEY) {
      this.services.push({
        name: 'perenual',
        criticalService: false,
        testFunction: async () => {
          const startTime = Date.now();
          try {
            const response = await fetch(
              `https://perenual.com/api/species-list?key=${process.env.PERENUAL_API_KEY}&page=1`
            );
            const responseTime = Date.now() - startTime;
            
            if (response.ok) {
              const data = await response.json();
              return {
                service: 'perenual',
                status: 'healthy',
                responseTime,
                metadata: { totalRecords: data.total }
              };
            } else {
              return {
                service: 'perenual',
                status: response.status === 429 ? 'degraded' : 'down',
                responseTime,
                errorMessage: `Status: ${response.status}`
              };
            }
          } catch (error) {
            return {
              service: 'perenual',
              status: 'down',
              responseTime: Date.now() - startTime,
              errorMessage: error.message
            };
          }
        }
      });
    }

    // GBIF API Health Check
    if (process.env.GBIF_EMAIL && process.env.GBIF_PASSWORD) {
      this.services.push({
        name: 'gbif',
        criticalService: false,
        testFunction: async () => {
          const startTime = Date.now();
          try {
            const authHeader = 'Basic ' + Buffer.from(
              `${process.env.GBIF_EMAIL}:${process.env.GBIF_PASSWORD}`
            ).toString('base64');
            
            const response = await fetch('https://api.gbif.org/v1/species/search?q=test&limit=1', {
              headers: { 'Authorization': authHeader }
            });
            const responseTime = Date.now() - startTime;
            
            return {
              service: 'gbif',
              status: response.ok ? 'healthy' : 'down',
              responseTime,
              errorMessage: !response.ok ? `Status: ${response.status}` : undefined
            };
          } catch (error) {
            return {
              service: 'gbif',
              status: 'down',
              responseTime: Date.now() - startTime,
              errorMessage: error.message
            };
          }
        }
      });
    }

    // Mapbox API Health Check
    if (process.env.MAPBOX_API_KEY) {
      this.services.push({
        name: 'mapbox',
        criticalService: false,
        testFunction: async () => {
          const startTime = Date.now();
          try {
            const response = await fetch(
              `https://api.mapbox.com/geocoding/v5/mapbox.places/London.json?access_token=${process.env.MAPBOX_API_KEY}&limit=1`
            );
            const responseTime = Date.now() - startTime;
            
            return {
              service: 'mapbox',
              status: response.ok ? 'healthy' : 'down',
              responseTime,
              errorMessage: !response.ok ? `Status: ${response.status}` : undefined
            };
          } catch (error) {
            return {
              service: 'mapbox',
              status: 'down',
              responseTime: Date.now() - startTime,
              errorMessage: error.message
            };
          }
        }
      });
    }

    // Visual Crossing API Health Check
    if (process.env.VISUAL_CROSSING_API_KEY) {
      this.services.push({
        name: 'visual_crossing',
        criticalService: false,
        testFunction: async () => {
          const startTime = Date.now();
          try {
            const response = await fetch(
              `https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline/London?key=${process.env.VISUAL_CROSSING_API_KEY}&include=current`
            );
            const responseTime = Date.now() - startTime;
            
            return {
              service: 'visual_crossing',
              status: response.ok ? 'healthy' : 'down',
              responseTime,
              errorMessage: !response.ok ? `Status: ${response.status}` : undefined
            };
          } catch (error) {
            return {
              service: 'visual_crossing',
              status: 'down',
              responseTime: Date.now() - startTime,
              errorMessage: error.message
            };
          }
        }
      });
    }

    // HuggingFace API Health Check (Flux Schnell)
    if (process.env.HUGGINGFACE_API_KEY) {
      this.services.push({
        name: 'huggingface',
        criticalService: false,
        testFunction: async () => {
          const startTime = Date.now();
          try {
            // Test with Flux Schnell model that we're actually using
            const response = await fetch(
              'https://api-inference.huggingface.co/models/black-forest-labs/FLUX.1-schnell',
              {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                  inputs: 'A simple test image',
                  parameters: {
                    guidance_scale: 7.5,
                    num_inference_steps: 4  // Schnell uses fewer steps
                  }
                })
              }
            );
            const responseTime = Date.now() - startTime;
            
            if (response.ok) {
              return {
                service: 'huggingface',
                status: 'healthy',
                responseTime,
                metadata: { model: 'FLUX.1-schnell' }
              };
            } else {
              const errorText = await response.text();
              let errorDetails = errorText;
              try {
                const errorJson = JSON.parse(errorText);
                errorDetails = errorJson.error || errorText;
              } catch (e) {
                // Keep errorText as is
              }
              return {
                service: 'huggingface',
                status: response.status === 503 ? 'degraded' : 'down',
                responseTime,
                errorMessage: `Status ${response.status}: ${errorDetails}`
              };
            }
          } catch (error) {
            return {
              service: 'huggingface',
              status: 'down',
              responseTime: Date.now() - startTime,
              errorMessage: `Connection failed: ${error.message}`
            };
          }
        }
      });
    }

    // Runware API Health Check
    if (process.env.RUNWARE_API_KEY) {
      this.services.push({
        name: 'runware',
        criticalService: false,
        testFunction: async () => {
          const startTime = Date.now();
          try {
            // Generate a proper UUID v4 for Runware
            const generateUUID = () => {
              return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
                const r = Math.random() * 16 | 0;
                const v = c === 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
              });
            };
            
            // Test with a minimal request that validates the API key
            const response = await fetch('https://api.runware.ai/v1', {
              method: 'POST',
              headers: { 
                'Authorization': `Bearer ${process.env.RUNWARE_API_KEY}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify([
                {
                  taskType: 'imageInference',
                  taskUUID: generateUUID(),
                  positivePrompt: 'test',
                  width: 512,
                  height: 512,
                  model: 'runware:100@1',
                  numberResults: 1
                }
              ])
            });
            const responseTime = Date.now() - startTime;
            
            const data = await response.json();
            
            // Runware returns errors even with 200 status
            if (data.errors && data.errors.length > 0) {
              const error = data.errors[0];
              // Check if it's an auth error or other error
              if (error.code === 'invalidApiKey' || error.message?.includes('Invalid API key')) {
                return {
                  service: 'runware',
                  status: 'down',
                  responseTime,
                  errorMessage: 'Invalid API key'
                };
              } else {
                // Other errors might just mean rate limits or temporary issues
                return {
                  service: 'runware',
                  status: 'degraded',
                  responseTime,
                  errorMessage: error.message || 'Service issue'
                };
              }
            }
            
            // If we get a successful response with data
            if (data.data && Array.isArray(data.data) && data.data.length > 0) {
              return {
                service: 'runware',
                status: 'healthy',
                responseTime,
                metadata: { taskType: data.data[0].taskType }
              };
            }
            
            // If response is ok but no data (might be queued)
            if (response.ok) {
              return {
                service: 'runware',
                status: 'healthy',
                responseTime,
                metadata: { note: 'Request accepted' }
              };
            } 
            
            // Handle non-200 responses
            const errorText = await response.text();
            let errorDetails = errorText;
            try {
              const errorJson = JSON.parse(errorText);
              if (errorJson.errors && errorJson.errors[0]) {
                errorDetails = errorJson.errors[0].message;
              } else {
                errorDetails = errorJson.error?.message || errorJson.detail || errorText;
              }
            } catch (e) {
              // Keep errorText as is
            }
            return {
              service: 'runware',
              status: response.status === 429 ? 'degraded' : 'down',
              responseTime,
              errorMessage: `Status ${response.status}: ${errorDetails}`
            };
          } catch (error) {
            return {
              service: 'runware',
              status: 'down',
              responseTime: Date.now() - startTime,
              errorMessage: `Connection failed: ${error.message}`
            };
          }
        }
      });
    }

    // FireCrawl API Health Check
    if (process.env.FIRECRAWL_API_KEY) {
      this.services.push({
        name: 'firecrawl',
        criticalService: false,
        testFunction: async () => {
          const startTime = Date.now();
          try {
            const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${process.env.FIRECRAWL_API_KEY}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                url: 'https://example.com',
                formats: ['markdown']
              })
            });
            const responseTime = Date.now() - startTime;
            
            // FireCrawl returns different status codes for different scenarios
            if (response.status === 200) {
              return {
                service: 'firecrawl',
                status: 'healthy',
                responseTime
              };
            } else if (response.status === 402) {
              // Out of credits but API key is valid
              return {
                service: 'firecrawl',
                status: 'degraded',
                responseTime,
                errorMessage: 'Out of credits'
              };
            } else if (response.status === 401) {
              return {
                service: 'firecrawl',
                status: 'down',
                responseTime,
                errorMessage: 'Invalid API key'
              };
            } else {
              const errorText = await response.text();
              return {
                service: 'firecrawl',
                status: 'down',
                responseTime,
                errorMessage: `Status ${response.status}: ${errorText}`
              };
            }
          } catch (error) {
            return {
              service: 'firecrawl',
              status: 'down',
              responseTime: Date.now() - startTime,
              errorMessage: `Connection failed: ${error.message}`
            };
          }
        }
      });
    }

    // Stripe API Health Check
    if (process.env.STRIPE_SECRET_KEY) {
      this.services.push({
        name: 'stripe',
        criticalService: true,
        testFunction: async () => {
          const startTime = Date.now();
          try {
            const response = await fetch('https://api.stripe.com/v1/balance', {
              headers: {
                'Authorization': `Bearer ${process.env.STRIPE_SECRET_KEY}`,
              }
            });
            const responseTime = Date.now() - startTime;
            
            return {
              service: 'stripe',
              status: response.ok ? 'healthy' : 'down',
              responseTime,
              errorMessage: !response.ok ? `Status: ${response.status}` : undefined
            };
          } catch (error) {
            return {
              service: 'stripe',
              status: 'down',
              responseTime: Date.now() - startTime,
              errorMessage: error.message
            };
          }
        }
      });
    }
  }

  // Run health checks for all services with resilient storage
  async runHealthChecks(): Promise<HealthCheckResult[]> {
    const results: HealthCheckResult[] = [];
    
    for (const service of this.services) {
      try {
        const result = await service.testFunction();
        
        // Cache the result immediately
        this.healthCache.set(service.name, result);
        
        // Try to save to database (don't fail if DB is down)
        try {
          await db.insert(apiHealthChecks).values({
            service: result.service,
            status: result.status,
            responseTime: result.responseTime,
            errorMessage: result.errorMessage,
            quotaUsed: result.quotaUsed,
            quotaLimit: result.quotaLimit,
            metadata: result.metadata,
            lastChecked: new Date()
          });
          
          // Check alerts only if DB is available
          await this.checkAlerts(result);
        } catch (dbError) {
          console.warn(`Failed to store health check in DB for ${service.name}:`, dbError.message);
        }
        
        results.push(result);
      } catch (error) {
        console.error(`Health check failed for ${service.name}:`, error);
        const errorResult = {
          service: service.name,
          status: 'down' as const,
          errorMessage: error.message
        };
        
        // Cache the error result
        this.healthCache.set(service.name, errorResult);
        results.push(errorResult);
      }
    }
    
    // Update last health check time
    this.lastHealthCheck = new Date();
    
    return results;
  }

  // Check and trigger alerts based on health check results
  private async checkAlerts(result: HealthCheckResult) {
    try {
      const alerts = await db
        .select()
        .from(apiAlerts)
        .where(and(
          eq(apiAlerts.service, result.service),
          eq(apiAlerts.isActive, true)
        ));

    for (const alert of alerts) {
      let shouldTrigger = false;
      
      switch (alert.alertType) {
        case 'service_down':
          shouldTrigger = result.status === 'down';
          break;
        case 'slow_response':
          shouldTrigger = result.responseTime !== undefined && 
                         result.responseTime > (alert.threshold || 5000);
          break;
        case 'quota_warning':
          if (result.quotaUsed !== undefined && result.quotaLimit !== undefined) {
            const percentUsed = (result.quotaUsed / result.quotaLimit) * 100;
            shouldTrigger = percentUsed >= (alert.threshold || 80);
          }
          break;
      }
      
      if (shouldTrigger) {
        await db
          .update(apiAlerts)
          .set({
            lastTriggered: new Date(),
            notificationsSent: sql`${apiAlerts.notificationsSent} + 1`
          })
          .where(eq(apiAlerts.id, alert.id));
        
        console.warn(`Alert triggered: ${alert.service} - ${alert.alertType}`);
      }
    }
    } catch (error) {
      console.warn('Failed to check alerts:', error.message);
      // Continue execution - don't throw
    }
  }

  // Get latest health status for all services with resilient fallback
  async getHealthStatus() {
    const services = this.services.map(s => s.name);
    const latestChecks = [];
    
    try {
      // Try to get from database
      for (const service of services) {
        const [latest] = await db
          .select()
          .from(apiHealthChecks)
          .where(eq(apiHealthChecks.service, service))
          .orderBy(sql`${apiHealthChecks.lastChecked} DESC`)
          .limit(1);
        
        if (latest) {
          latestChecks.push(latest);
          // Cache the result
          this.healthCache.set(service, {
            service: latest.service,
            status: latest.status as 'healthy' | 'degraded' | 'down',
            responseTime: latest.responseTime || undefined,
            errorMessage: latest.errorMessage || undefined,
            quotaUsed: latest.quotaUsed || undefined,
            quotaLimit: latest.quotaLimit || undefined,
            metadata: latest.metadata || undefined
          });
        } else {
          latestChecks.push({
            service,
            status: 'unknown',
            lastChecked: null
          });
        }
      }
    } catch (error) {
      console.warn('Database unavailable for health status, using cache/defaults:', error.message);
      
      // Fallback to cached values or defaults
      for (const service of services) {
        const cached = this.healthCache.get(service);
        if (cached) {
          latestChecks.push({
            service: cached.service,
            status: cached.status,
            lastChecked: this.lastHealthCheck,
            responseTime: cached.responseTime,
            errorMessage: cached.errorMessage,
            quotaUsed: cached.quotaUsed,
            quotaLimit: cached.quotaLimit
          });
        } else {
          // Return default unknown status
          latestChecks.push({
            service,
            status: 'unknown',
            lastChecked: null,
            errorMessage: 'No health data available'
          });
        }
      }
    }
    
    return latestChecks;
  }

  // Get usage statistics for a specific time period with resilient fallback
  async getUsageStats(startDate: Date, endDate?: Date) {
    const cacheKey = `usage:${startDate.toISOString()}:${endDate?.toISOString() || 'now'}`;
    
    try {
      const query = endDate
        ? and(
            gte(apiUsageStats.date, startDate),
            sql`${apiUsageStats.date} <= ${endDate}`
          )
        : gte(apiUsageStats.date, startDate);
      
      const stats = await db
        .select({
          service: apiUsageStats.service,
          totalRequests: sql`SUM(${apiUsageStats.requestCount})`,
          totalTokens: sql`SUM(${apiUsageStats.tokensUsed})`,
          totalCost: sql`SUM(${apiUsageStats.cost})`
        })
        .from(apiUsageStats)
        .where(query)
        .groupBy(apiUsageStats.service);
      
      // Cache the result
      this.usageCache.set(cacheKey, {
        data: stats,
        timestamp: Date.now()
      });
      
      return stats;
    } catch (error) {
      console.warn('Database unavailable for usage stats, using cache/defaults:', error.message);
      
      // Check if we have cached data
      const cached = this.usageCache.get(cacheKey);
      if (cached && (Date.now() - cached.timestamp) < this.USAGE_CACHE_TTL) {
        console.log('Returning cached usage stats');
        return cached.data;
      }
      
      // Return empty stats for all services
      const services = this.services.map(s => s.name);
      return services.map(service => ({
        service,
        totalRequests: 0,
        totalTokens: 0,
        totalCost: 0
      }));
    }
  }

  // Record API usage with resilient storage
  async recordUsage(data: {
    service: string;
    endpoint?: string;
    userId?: string;
    tokensUsed?: number;
    cost?: number;
  }) {
    try {
      await db.insert(apiUsageStats).values({
        service: data.service,
        endpoint: data.endpoint,
        userId: data.userId,
        requestCount: 1,
        tokensUsed: data.tokensUsed,
        cost: data.cost?.toString(),
        date: new Date()
      });
    } catch (error) {
      console.warn('Failed to record API usage in database:', error.message);
      // Continue execution - don't throw
    }
    
    // Update usage cache even if DB fails
    const cacheKey = `current:${data.service}`;
    const existing = this.usageCache.get(cacheKey) || { count: 0, cost: 0, tokens: 0 };
    this.usageCache.set(cacheKey, {
      count: existing.count + 1,
      cost: existing.cost + (data.cost || 0),
      tokens: existing.tokens + (data.tokensUsed || 0),
      timestamp: Date.now()
    });
  }

  // Get service configuration
  getServiceConfiguration() {
    return {
      anthropic: {
        enabled: !!process.env.ANTHROPIC_API_KEY,
        critical: true,
        purpose: 'Plant identification and diagnosis'
      },
      perplexity: {
        enabled: !!process.env.PERPLEXITY_API_KEY,
        critical: true,
        purpose: 'Garden design generation with real-time search'
      },
      gemini: {
        enabled: !!process.env.GEMINI_API_KEY,
        critical: false,
        purpose: 'Companion plants and planting calendars'
      },
      perenual: {
        enabled: !!process.env.PERENUAL_API_KEY,
        critical: false,
        purpose: 'Plant database and care information'
      },
      gbif: {
        enabled: !!(process.env.GBIF_EMAIL && process.env.GBIF_PASSWORD),
        critical: false,
        purpose: 'Biodiversity and species data'
      },
      mapbox: {
        enabled: !!process.env.MAPBOX_API_KEY,
        critical: false,
        purpose: 'Geocoding and location services'
      },
      visual_crossing: {
        enabled: !!process.env.VISUAL_CROSSING_API_KEY,
        critical: false,
        purpose: 'Climate and weather data'
      },
      huggingface: {
        enabled: !!process.env.HUGGINGFACE_API_KEY,
        critical: false,
        purpose: 'Image generation with Flux models'
      },
      runware: {
        enabled: !!process.env.RUNWARE_API_KEY,
        critical: false,
        purpose: 'Advanced garden visualizations'
      },
      stripe: {
        enabled: !!process.env.STRIPE_SECRET_KEY,
        critical: true,
        purpose: 'Payment processing'
      },
      firecrawl: {
        enabled: !!process.env.FIRECRAWL_API_KEY,
        critical: false,
        purpose: 'Web scraping and crawling for plant data'
      }
    };
  }
}

// Create singleton instance
export const apiMonitoring = new APIMonitoringService();