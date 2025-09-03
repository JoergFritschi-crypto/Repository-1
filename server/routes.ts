import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertGardenSchema, insertPlantSchema, insertPlantDoctorSessionSchema } from "@shared/schema";
import Stripe from "stripe";
import PerplexityAI from "./perplexityAI";
import AnthropicAI from "./anthropicAI";
import GeminiAI from "./geminiAI";
import { PerenualAPI, GBIFAPI, MapboxAPI, HuggingFaceAPI, RunwareAPI } from "./externalAPIs";
import { apiMonitoring } from "./apiMonitoring";

// Initialize Stripe if API key is available
let stripe: Stripe | null = null;
if (process.env.STRIPE_SECRET_KEY) {
  stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2023-10-16",
  });
}

// Initialize AI services
let perplexityAI: PerplexityAI | null = null;
if (process.env.PERPLEXITY_API_KEY) {
  perplexityAI = new PerplexityAI(process.env.PERPLEXITY_API_KEY);
}

let anthropicAI: AnthropicAI | null = null;
if (process.env.ANTHROPIC_API_KEY) {
  anthropicAI = new AnthropicAI(process.env.ANTHROPIC_API_KEY);
}

let geminiAI: GeminiAI | null = null;
if (process.env.GEMINI_API_KEY) {
  geminiAI = new GeminiAI(process.env.GEMINI_API_KEY);
}

// Initialize external APIs
let perenualAPI: PerenualAPI | null = null;
if (process.env.PERENUAL_API_KEY) {
  perenualAPI = new PerenualAPI(process.env.PERENUAL_API_KEY);
}

let gbifAPI: GBIFAPI | null = null;
if (process.env.GBIF_EMAIL && process.env.GBIF_PASSWORD) {
  gbifAPI = new GBIFAPI(process.env.GBIF_EMAIL, process.env.GBIF_PASSWORD);
}

let mapboxAPI: MapboxAPI | null = null;
if (process.env.MAPBOX_API_KEY) {
  mapboxAPI = new MapboxAPI(process.env.MAPBOX_API_KEY);
}

let huggingFaceAPI: HuggingFaceAPI | null = null;
if (process.env.HUGGINGFACE_API_KEY) {
  huggingFaceAPI = new HuggingFaceAPI(process.env.HUGGINGFACE_API_KEY);
}

let runwareAPI: RunwareAPI | null = null;
if (process.env.RUNWARE_API_KEY) {
  runwareAPI = new RunwareAPI(process.env.RUNWARE_API_KEY);
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Garden routes
  app.get('/api/gardens', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const gardens = await storage.getUserGardens(userId);
      res.json(gardens);
    } catch (error) {
      console.error("Error fetching gardens:", error);
      res.status(500).json({ message: "Failed to fetch gardens" });
    }
  });

  app.get('/api/gardens/:id', isAuthenticated, async (req: any, res) => {
    try {
      const garden = await storage.getGarden(req.params.id);
      if (!garden) {
        return res.status(404).json({ message: "Garden not found" });
      }
      // Check ownership
      if (garden.userId !== req.user.claims.sub) {
        return res.status(403).json({ message: "Unauthorized" });
      }
      res.json(garden);
    } catch (error) {
      console.error("Error fetching garden:", error);
      res.status(500).json({ message: "Failed to fetch garden" });
    }
  });

  app.post('/api/gardens', isAuthenticated, async (req: any, res) => {
    try {
      const gardenData = insertGardenSchema.parse({
        ...req.body,
        userId: req.user.claims.sub
      });
      const garden = await storage.createGarden(gardenData);
      res.status(201).json(garden);
    } catch (error) {
      console.error("Error creating garden:", error);
      res.status(400).json({ message: "Failed to create garden", error: error.message });
    }
  });

  app.put('/api/gardens/:id', isAuthenticated, async (req: any, res) => {
    try {
      const garden = await storage.getGarden(req.params.id);
      if (!garden) {
        return res.status(404).json({ message: "Garden not found" });
      }
      // Check ownership
      if (garden.userId !== req.user.claims.sub) {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const updatedGarden = await storage.updateGarden(req.params.id, req.body);
      res.json(updatedGarden);
    } catch (error) {
      console.error("Error updating garden:", error);
      res.status(400).json({ message: "Failed to update garden", error: error.message });
    }
  });

  app.delete('/api/gardens/:id', isAuthenticated, async (req: any, res) => {
    try {
      const garden = await storage.getGarden(req.params.id);
      if (!garden) {
        return res.status(404).json({ message: "Garden not found" });
      }
      // Check ownership
      if (garden.userId !== req.user.claims.sub) {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      await storage.deleteGarden(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting garden:", error);
      res.status(500).json({ message: "Failed to delete garden" });
    }
  });

  // AI Garden Design Generation
  app.post('/api/gardens/:id/generate-ai-design', isAuthenticated, async (req: any, res) => {
    try {
      if (!perplexityAI) {
        return res.status(503).json({ message: "AI service not configured. Please add PERPLEXITY_API_KEY." });
      }

      const garden = await storage.getGarden(req.params.id);
      if (!garden) {
        return res.status(404).json({ message: "Garden not found" });
      }
      
      // Check ownership
      if (garden.userId !== req.user.claims.sub) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      // Generate AI design using Perplexity
      const aiDesign = await perplexityAI.generateGardenDesign({
        location: garden.location || 'United Kingdom',
        shape: garden.shape || 'rectangular',
        dimensions: garden.dimensions,
        hardiness_zone: garden.hardiness_zone,
        sun_exposure: garden.sun_exposure,
        design_approach: garden.design_approach,
        preferences: garden.preferences
      });

      // Update garden with AI-generated layout
      const updatedGarden = await storage.updateGarden(req.params.id, {
        layout_data: aiDesign.layout,
        ai_generated: true
      });

      // Store plant recommendations if needed
      if (aiDesign.plantRecommendations && aiDesign.plantRecommendations.length > 0) {
        // Store recommendations in garden preferences or separate table
        await storage.updateGarden(req.params.id, {
          preferences: {
            ...garden.preferences,
            ai_plant_recommendations: aiDesign.plantRecommendations,
            ai_design_notes: aiDesign.designNotes
          }
        });
      }

      res.json({
        garden: updatedGarden,
        plantRecommendations: aiDesign.plantRecommendations,
        designNotes: aiDesign.designNotes
      });
    } catch (error) {
      console.error("Error generating AI garden design:", error);
      res.status(500).json({ message: "Failed to generate AI design", error: error.message });
    }
  });

  // Plant routes
  app.get('/api/plants/search', async (req, res) => {
    try {
      const query = req.query.q as string || "";
      const filters = {
        type: req.query.type as string,
        hardiness_zone: req.query.hardiness_zone as string,
        sun_requirements: req.query.sun_requirements as string,
        pet_safe: req.query.pet_safe === 'true' ? true : undefined
      };
      
      const plants = await storage.searchPlants(query, filters);
      res.json(plants);
    } catch (error) {
      console.error("Error searching plants:", error);
      res.status(500).json({ message: "Failed to search plants" });
    }
  });

  app.get('/api/plants/:id', async (req, res) => {
    try {
      const plant = await storage.getPlant(req.params.id);
      if (!plant) {
        return res.status(404).json({ message: "Plant not found" });
      }
      res.json(plant);
    } catch (error) {
      console.error("Error fetching plant:", error);
      res.status(500).json({ message: "Failed to fetch plant" });
    }
  });

  // Admin plant routes
  app.post('/api/admin/plants', isAuthenticated, async (req: any, res) => {
    try {
      // TODO: Add admin role check
      const plantData = insertPlantSchema.parse(req.body);
      const plant = await storage.createPlant(plantData);
      res.status(201).json(plant);
    } catch (error) {
      console.error("Error creating plant:", error);
      res.status(400).json({ message: "Failed to create plant", error: error.message });
    }
  });

  app.get('/api/admin/plants/pending', isAuthenticated, async (req: any, res) => {
    try {
      // TODO: Add admin role check
      const plants = await storage.getPendingPlants();
      res.json(plants);
    } catch (error) {
      console.error("Error fetching pending plants:", error);
      res.status(500).json({ message: "Failed to fetch pending plants" });
    }
  });

  app.put('/api/admin/plants/:id/verify', isAuthenticated, async (req: any, res) => {
    try {
      // TODO: Add admin role check
      const plant = await storage.verifyPlant(req.params.id);
      res.json(plant);
    } catch (error) {
      console.error("Error verifying plant:", error);
      res.status(500).json({ message: "Failed to verify plant" });
    }
  });

  // User plant collection routes
  app.get('/api/my-collection', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const collection = await storage.getUserPlantCollection(userId);
      res.json(collection);
    } catch (error) {
      console.error("Error fetching plant collection:", error);
      res.status(500).json({ message: "Failed to fetch plant collection" });
    }
  });

  app.post('/api/my-collection', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const collection = await storage.addToUserCollection({
        userId,
        plantId: req.body.plantId,
        notes: req.body.notes,
        isFavorite: req.body.isFavorite || false
      });
      res.status(201).json(collection);
    } catch (error) {
      console.error("Error adding to plant collection:", error);
      res.status(400).json({ message: "Failed to add to collection", error: error.message });
    }
  });

  app.delete('/api/my-collection/:plantId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      await storage.removeFromUserCollection(userId, req.params.plantId);
      res.status(204).send();
    } catch (error) {
      console.error("Error removing from plant collection:", error);
      res.status(500).json({ message: "Failed to remove from collection" });
    }
  });

  // Plant Doctor routes - Uses Anthropic for plant analysis
  app.post('/api/plant-doctor/identify', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { imageUrl, imageBase64, notes, sessionType } = req.body;
      
      if (!anthropicAI) {
        // If Anthropic is not configured, still save the session but without AI analysis
        const sessionData = insertPlantDoctorSessionSchema.parse({
          ...req.body,
          userId,
          sessionType: sessionType || 'identification'
        });
        const session = await storage.createPlantDoctorSession(sessionData);
        return res.status(201).json({
          ...session,
          message: "AI service not configured. Please add ANTHROPIC_API_KEY for plant analysis."
        });
      }

      let aiAnalysis = null;
      let confidence = 0.5;
      
      try {
        // Use Anthropic for plant identification and analysis
        if (sessionType === 'disease') {
          aiAnalysis = await anthropicAI.analyzePlantDisease(imageBase64, notes || '');
          confidence = aiAnalysis.confidence;
        } else if (sessionType === 'weed') {
          aiAnalysis = await anthropicAI.identifyWeed(imageBase64, req.body.location || 'UK');
          confidence = 0.75; // Default confidence for weed ID
        } else {
          // Default to plant identification
          aiAnalysis = await anthropicAI.identifyPlant(imageBase64, notes);
          confidence = aiAnalysis.confidence;
        }
      } catch (aiError) {
        console.error("AI analysis failed:", aiError);
        aiAnalysis = {
          error: "AI analysis failed",
          message: aiError.message
        };
      }

      // Save the session with AI analysis
      const sessionData = insertPlantDoctorSessionSchema.parse({
        imageUrl,
        userId,
        sessionType: sessionType || 'identification',
        aiAnalysis,
        confidence
      });
      
      const session = await storage.createPlantDoctorSession(sessionData);
      res.status(201).json(session);
    } catch (error) {
      console.error("Error creating plant doctor session:", error);
      res.status(400).json({ message: "Failed to create identification session", error: error.message });
    }
  });

  app.get('/api/plant-doctor/sessions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const sessions = await storage.getUserPlantDoctorSessions(userId);
      res.json(sessions);
    } catch (error) {
      console.error("Error fetching plant doctor sessions:", error);
      res.status(500).json({ message: "Failed to fetch sessions" });
    }
  });

  // Enhanced Plant Search - Combines Perenual and GBIF data
  app.get('/api/plants/enhanced-search', async (req, res) => {
    try {
      const query = req.query.q as string || "";
      const source = req.query.source as string || "all"; // all, perenual, gbif, local
      
      let results = [];
      
      // Search local database
      if (source === "all" || source === "local") {
        const localPlants = await storage.searchPlants(query, {});
        results = results.concat(localPlants.map(p => ({ ...p, source: 'local' })));
      }
      
      // Search Perenual if available
      if ((source === "all" || source === "perenual") && perenualAPI) {
        const perenualPlants = await perenualAPI.searchPlants(query, {
          hardiness: req.query.hardiness as string,
          sunlight: req.query.sunlight as string,
          poisonous: req.query.poisonous === 'true'
        });
        results = results.concat(perenualPlants.map(p => ({ ...p, source: 'perenual' })));
      }
      
      // Search GBIF if available
      if ((source === "all" || source === "gbif") && gbifAPI) {
        const gbifSpecies = await gbifAPI.searchSpecies(query);
        results = results.concat(gbifSpecies.map(s => ({
          id: s.key,
          common_name: s.vernacularName,
          scientific_name: s.scientificName,
          family: s.family,
          genus: s.genus,
          source: 'gbif'
        })));
      }
      
      res.json(results);
    } catch (error) {
      console.error("Error in enhanced plant search:", error);
      res.status(500).json({ message: "Failed to search plants" });
    }
  });

  // Generate Garden Visualization using Runware or HuggingFace
  app.post('/api/gardens/:id/generate-visualization', isAuthenticated, async (req: any, res) => {
    try {
      const garden = await storage.getGarden(req.params.id);
      if (!garden) {
        return res.status(404).json({ message: "Garden not found" });
      }
      
      // Check ownership
      if (garden.userId !== req.user.claims.sub) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const { prompt, style } = req.body;
      
      // Try Runware first for better quality
      if (runwareAPI) {
        const result = await runwareAPI.generateGardenVisualization({
          prompt: prompt || `Beautiful ${garden.shape} ornamental garden with ${garden.style || 'traditional'} design`,
          style: style || 'photorealistic',
          aspectRatio: '16:9'
        });
        
        if (result) {
          return res.json({ imageUrl: result.imageUrl, source: 'runware' });
        }
      }
      
      // Fallback to HuggingFace
      if (huggingFaceAPI) {
        const imageBuffer = await huggingFaceAPI.generateImage(
          prompt || `A ${garden.shape} garden in ${garden.style || 'traditional'} style`
        );
        
        if (imageBuffer) {
          // Convert buffer to base64 for frontend display
          const base64Image = imageBuffer.toString('base64');
          return res.json({ 
            imageData: `data:image/png;base64,${base64Image}`,
            source: 'huggingface' 
          });
        }
      }
      
      res.status(503).json({ message: "Image generation service not available" });
    } catch (error) {
      console.error("Error generating visualization:", error);
      res.status(500).json({ message: "Failed to generate visualization" });
    }
  });

  // Gemini AI endpoints for additional features
  app.post('/api/gardens/:id/companion-plants', isAuthenticated, async (req: any, res) => {
    try {
      if (!geminiAI) {
        return res.status(503).json({ message: "Gemini AI not configured" });
      }

      const garden = await storage.getGarden(req.params.id);
      if (!garden || garden.userId !== req.user.claims.sub) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const { mainPlant, gardenStyle } = req.body;
      const companions = await geminiAI.suggestCompanionPlants(
        mainPlant || 'roses',
        gardenStyle || garden.style || 'traditional'
      );
      
      res.json(companions);
    } catch (error) {
      console.error("Error getting companion plants:", error);
      res.status(500).json({ message: "Failed to get companion plant suggestions" });
    }
  });

  app.post('/api/gardens/:id/planting-calendar', isAuthenticated, async (req: any, res) => {
    try {
      if (!geminiAI) {
        return res.status(503).json({ message: "Gemini AI not configured" });
      }

      const garden = await storage.getGarden(req.params.id);
      if (!garden || garden.userId !== req.user.claims.sub) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const calendar = await geminiAI.generatePlantingCalendar(
        garden.location || 'UK',
        req.body.plants || [],
        garden.hardiness_zone || '8b'
      );
      
      res.json(calendar);
    } catch (error) {
      console.error("Error generating planting calendar:", error);
      res.status(500).json({ message: "Failed to generate planting calendar" });
    }
  });

  // Geocoding endpoint using Mapbox
  app.post('/api/geocode', async (req, res) => {
    try {
      const { address } = req.body;
      
      if (!mapboxAPI) {
        return res.status(503).json({ message: "Geocoding service not configured" });
      }
      
      const result = await mapboxAPI.geocode(address);
      
      if (result) {
        res.json(result);
      } else {
        res.status(404).json({ message: "Location not found" });
      }
    } catch (error) {
      console.error("Error geocoding address:", error);
      res.status(500).json({ message: "Failed to geocode address" });
    }
  });

  // Climate data routes - Enhanced with geocoding
  app.get('/api/climate/:location', async (req, res) => {
    try {
      const location = req.params.location;
      let climateData = await storage.getClimateData(location);
      
      if (!climateData || isClimateDataStale(climateData.lastUpdated)) {
        // Get coordinates if we have Mapbox
        let coordinates = null;
        if (mapboxAPI) {
          coordinates = await mapboxAPI.geocode(location);
        }
        
        // Fetch fresh data from Visual Crossing API
        if (process.env.VISUAL_CROSSING_API_KEY) {
          const freshData = await fetchClimateData(location, coordinates);
          if (freshData) {
            if (climateData) {
              climateData = await storage.updateClimateData(location, freshData);
            } else {
              climateData = await storage.createClimateData({ location, ...freshData });
            }
          }
        }
      }
      
      if (!climateData) {
        return res.status(404).json({ message: "Climate data not found" });
      }
      
      res.json(climateData);
    } catch (error) {
      console.error("Error fetching climate data:", error);
      res.status(500).json({ message: "Failed to fetch climate data" });
    }
  });

  // Admin API Monitoring Routes
  app.get('/api/admin/api-health', isAuthenticated, async (req: any, res) => {
    try {
      // Check if user is admin
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || !user.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const healthStatus = await apiMonitoring.getHealthStatus();
      res.json(healthStatus);
    } catch (error) {
      console.error("Error fetching API health status:", error);
      res.status(500).json({ message: "Failed to fetch health status" });
    }
  });

  app.post('/api/admin/api-health/check', isAuthenticated, async (req: any, res) => {
    try {
      // Check if user is admin
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || !user.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const results = await apiMonitoring.runHealthChecks();
      res.json(results);
    } catch (error) {
      console.error("Error running health checks:", error);
      res.status(500).json({ message: "Failed to run health checks" });
    }
  });

  app.get('/api/admin/api-usage', isAuthenticated, async (req: any, res) => {
    try {
      // Check if user is admin
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || !user.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const startDate = req.query.startDate 
        ? new Date(req.query.startDate as string) 
        : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
      const endDate = req.query.endDate 
        ? new Date(req.query.endDate as string)
        : new Date();

      const usageStats = await apiMonitoring.getUsageStats(startDate, endDate);
      res.json(usageStats);
    } catch (error) {
      console.error("Error fetching API usage stats:", error);
      res.status(500).json({ message: "Failed to fetch usage stats" });
    }
  });

  app.get('/api/admin/api-config', isAuthenticated, async (req: any, res) => {
    try {
      // Check if user is admin
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || !user.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const config = apiMonitoring.getServiceConfiguration();
      res.json(config);
    } catch (error) {
      console.error("Error fetching API configuration:", error);
      res.status(500).json({ message: "Failed to fetch configuration" });
    }
  });

  // Set user as admin (one-time setup route - should be removed in production)
  app.post('/api/admin/make-admin', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Only allow first user to become admin
      const allUsers = await storage.getAllUsers();
      if (allUsers.length > 1 && !user.isAdmin) {
        return res.status(403).json({ message: "Admin already exists" });
      }

      await storage.updateUser(userId, { isAdmin: true });
      res.json({ message: "Admin privileges granted" });
    } catch (error) {
      console.error("Error setting admin:", error);
      res.status(500).json({ message: "Failed to set admin" });
    }
  });

  // Stripe payment routes (if Stripe is configured)
  if (stripe) {
    app.post("/api/create-payment-intent", async (req, res) => {
      try {
        const { amount } = req.body;
        const paymentIntent = await stripe!.paymentIntents.create({
          amount: Math.round(amount * 100), // Convert to cents
          currency: "gbp", // British pounds for British Heritage theme
        });
        res.json({ clientSecret: paymentIntent.client_secret });
      } catch (error: any) {
        res.status(500).json({ message: "Error creating payment intent: " + error.message });
      }
    });

    app.post('/api/get-or-create-subscription', isAuthenticated, async (req: any, res) => {
      try {
        let user = await storage.getUser(req.user.claims.sub);
        if (!user) {
          return res.status(404).json({ message: "User not found" });
        }

        if (user.stripeSubscriptionId) {
          const subscription = await stripe!.subscriptions.retrieve(user.stripeSubscriptionId);
          res.json({
            subscriptionId: subscription.id,
            clientSecret: (subscription.latest_invoice as any)?.payment_intent?.client_secret,
          });
          return;
        }
        
        if (!user.email) {
          return res.status(400).json({ message: 'No user email on file' });
        }

        const customer = await stripe!.customers.create({
          email: user.email,
          name: `${user.firstName} ${user.lastName}`.trim(),
        });

        const subscription = await stripe!.subscriptions.create({
          customer: customer.id,
          items: [{
            price: process.env.STRIPE_PRICE_ID || 'price_premium_monthly',
          }],
          payment_behavior: 'default_incomplete',
          expand: ['latest_invoice.payment_intent'],
        });

        await storage.updateUserStripeInfo(user.id, customer.id, subscription.id);
    
        res.json({
          subscriptionId: subscription.id,
          clientSecret: (subscription.latest_invoice as any)?.payment_intent?.client_secret,
        });
      } catch (error: any) {
        console.error("Stripe subscription error:", error);
        return res.status(400).json({ error: { message: error.message } });
      }
    });
  }

  const httpServer = createServer(app);
  return httpServer;
}

// Helper functions
function isClimateDataStale(lastUpdated: Date): boolean {
  const now = new Date();
  const daysSinceUpdate = Math.floor((now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60 * 24));
  return daysSinceUpdate > 30; // Update every 30 days
}

async function fetchClimateData(location: string, coordinates?: { latitude: number; longitude: number } | null): Promise<any> {
  if (!process.env.VISUAL_CROSSING_API_KEY) {
    console.warn("Visual Crossing API key not configured");
    return null;
  }

  try {
    const response = await fetch(
      `https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline/${encodeURIComponent(location)}?key=${process.env.VISUAL_CROSSING_API_KEY}&include=days&unitGroup=metric`
    );
    
    if (!response.ok) {
      throw new Error(`Visual Crossing API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Process and structure the climate data
    return {
      hardiness_zone: determineHardinessZone(data.address),
      annual_rainfall: calculateAnnualRainfall(data.days),
      avg_temp_min: calculateAverageTemp(data.days, 'tempmin'),
      avg_temp_max: calculateAverageTemp(data.days, 'tempmax'),
      frost_dates: calculateFrostDates(data.days),
      growing_season: calculateGrowingSeason(data.days),
      monthly_data: processMonthlyData(data.days),
      data_source: 'visual_crossing'
    };
  } catch (error) {
    console.error("Error fetching climate data:", error);
    return null;
  }
}

function determineHardinessZone(address: string): string {
  // Simplified hardiness zone determination for UK locations
  // In a real implementation, this would use proper mapping data
  if (address.includes('Scotland')) return '7a';
  if (address.includes('Northern Ireland')) return '8a';
  if (address.includes('Wales')) return '8b';
  return '9a'; // Default for most of England
}

function calculateAnnualRainfall(days: any[]): number {
  return days.reduce((total, day) => total + (day.precip || 0), 0);
}

function calculateAverageTemp(days: any[], field: string): number {
  const temps = days.map(day => day[field]).filter(temp => temp !== null);
  return temps.reduce((sum, temp) => sum + temp, 0) / temps.length;
}

function calculateFrostDates(days: any[]): any {
  // Find first and last frost dates based on minimum temperatures
  const frostDays = days.filter(day => day.tempmin <= 0);
  return {
    first_frost: frostDays.length > 0 ? frostDays[frostDays.length - 1].datetime : null,
    last_frost: frostDays.length > 0 ? frostDays[0].datetime : null
  };
}

function calculateGrowingSeason(days: any[]): any {
  // Determine growing season based on consistent temperatures above 5°C
  const growingDays = days.filter(day => day.tempmin > 5);
  return {
    start: growingDays.length > 0 ? growingDays[0].datetime : null,
    end: growingDays.length > 0 ? growingDays[growingDays.length - 1].datetime : null,
    length_days: growingDays.length
  };
}

function processMonthlyData(days: any[]): any {
  const monthlyData = {};
  days.forEach(day => {
    const month = new Date(day.datetime).getMonth();
    if (!monthlyData[month]) {
      monthlyData[month] = {
        temp_avg: [],
        precip_total: 0,
        days_count: 0
      };
    }
    monthlyData[month].temp_avg.push((day.tempmin + day.tempmax) / 2);
    monthlyData[month].precip_total += day.precip || 0;
    monthlyData[month].days_count++;
  });
  
  // Calculate averages
  Object.keys(monthlyData).forEach(month => {
    const data = monthlyData[month];
    data.temp_avg = data.temp_avg.reduce((sum, temp) => sum + temp, 0) / data.temp_avg.length;
  });
  
  return monthlyData;
}
