import { db } from "./db";
import { apiHealthChecks, apiUsageStats, apiAlerts } from "@shared/schema";
import { eq, and, gte, sql } from "drizzle-orm";

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
                model: 'llama-3.1-sonar-small-128k-online',
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
            const response = await fetch(
              `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  contents: [{ parts: [{ text: 'test' }] }]
                })
              }
            );
            const responseTime = Date.now() - startTime;
            
            return {
              service: 'gemini',
              status: response.ok ? 'healthy' : 'down',
              responseTime,
              errorMessage: !response.ok ? `Status: ${response.status}` : undefined
            };
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

    // HuggingFace API Health Check
    if (process.env.HUGGINGFACE_API_KEY) {
      this.services.push({
        name: 'huggingface',
        criticalService: false,
        testFunction: async () => {
          const startTime = Date.now();
          try {
            const response = await fetch(
              'https://api-inference.huggingface.co/models/gpt2',
              {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ inputs: 'test', parameters: { max_length: 10 } })
              }
            );
            const responseTime = Date.now() - startTime;
            
            return {
              service: 'huggingface',
              status: response.ok ? 'healthy' : 'down',
              responseTime,
              errorMessage: !response.ok ? `Status: ${response.status}` : undefined
            };
          } catch (error) {
            return {
              service: 'huggingface',
              status: 'down',
              responseTime: Date.now() - startTime,
              errorMessage: error.message
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
            // Note: This is a hypothetical endpoint - adjust based on actual Runware API
            const response = await fetch('https://api.runware.ai/v1/health', {
              headers: { 'Authorization': `Bearer ${process.env.RUNWARE_API_KEY}` }
            });
            const responseTime = Date.now() - startTime;
            
            return {
              service: 'runware',
              status: response.ok ? 'healthy' : 'down',
              responseTime,
              errorMessage: !response.ok ? `Status: ${response.status}` : undefined
            };
          } catch (error) {
            return {
              service: 'runware',
              status: 'down',
              responseTime: Date.now() - startTime,
              errorMessage: error.message
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

  // Run health checks for all services
  async runHealthChecks(): Promise<HealthCheckResult[]> {
    const results: HealthCheckResult[] = [];
    
    for (const service of this.services) {
      try {
        const result = await service.testFunction();
        
        // Save to database
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
        
        // Check alerts
        await this.checkAlerts(result);
        
        results.push(result);
      } catch (error) {
        console.error(`Health check failed for ${service.name}:`, error);
        results.push({
          service: service.name,
          status: 'down',
          errorMessage: error.message
        });
      }
    }
    
    return results;
  }

  // Check and trigger alerts based on health check results
  private async checkAlerts(result: HealthCheckResult) {
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
  }

  // Get latest health status for all services
  async getHealthStatus() {
    const services = this.services.map(s => s.name);
    const latestChecks = [];
    
    for (const service of services) {
      const [latest] = await db
        .select()
        .from(apiHealthChecks)
        .where(eq(apiHealthChecks.service, service))
        .orderBy(sql`${apiHealthChecks.lastChecked} DESC`)
        .limit(1);
      
      if (latest) {
        latestChecks.push(latest);
      } else {
        latestChecks.push({
          service,
          status: 'unknown',
          lastChecked: null
        });
      }
    }
    
    return latestChecks;
  }

  // Get usage statistics for a specific time period
  async getUsageStats(startDate: Date, endDate?: Date) {
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
    
    return stats;
  }

  // Record API usage
  async recordUsage(data: {
    service: string;
    endpoint?: string;
    userId?: string;
    tokensUsed?: number;
    cost?: number;
  }) {
    await db.insert(apiUsageStats).values({
      service: data.service,
      endpoint: data.endpoint,
      userId: data.userId,
      requestCount: 1,
      tokensUsed: data.tokensUsed,
      cost: data.cost?.toString(),
      date: new Date()
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
      }
    };
  }
}

// Create singleton instance
export const apiMonitoring = new APIMonitoringService();