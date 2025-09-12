import express, { type Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertGardenSchema, insertPlantSchema, insertPlantDoctorSessionSchema, insertDesignGenerationSchema } from "@shared/schema";
import Stripe from "stripe";
import PerplexityAI from "./perplexityAI";
import { analyzeGardenPhotos, generateDesignStyles, generateCompleteGardenDesign, getPlantAdvice } from "./anthropic";
import AnthropicAI from "./anthropicAI";
import GeminiAI from "./geminiAI";
import { FireCrawlAPI, PerenualAPI, GBIFAPI, MapboxAPI, HuggingFaceAPI, RunwareAPI } from "./externalAPIs";
import { generateGardeningAdvice } from "./gardening-advice";
import { fileVaultService } from "./fileVault";
import { apiMonitoring } from "./apiMonitoring";
import { imageGenerationService } from "./imageGenerationService";
import { runwareImageGenerator } from "./runwareImageGenerator";
import { aiInpaintingService } from "./aiInpaintingService";
import { PlantImportService } from "./plantImportService";
import { generateAllGardenToolIcons, generateGardenToolIcon } from "./aiIconGenerator";
import path from "path";

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

let fireCrawlAPI: FireCrawlAPI | null = null;
if (process.env.FIRECRAWL_API_KEY) {
  fireCrawlAPI = new FireCrawlAPI(process.env.FIRECRAWL_API_KEY, process.env.PERPLEXITY_API_KEY);
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);
  
  // Body parser middleware (MUST come after auth setup)
  // Increase limit to 50MB to handle multiple image uploads
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: false, limit: '50mb' }));

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

  // Update garden design with layout data
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
      
      // Update garden with new layout data
      const updatedGarden = await storage.updateGarden(req.params.id, {
        ...req.body,
        layout_data: req.body.layout_data || {}
      });
      
      res.json(updatedGarden);
    } catch (error) {
      console.error("Error updating garden:", error);
      res.status(500).json({ message: "Failed to update garden" });
    }
  });

  // Get plants in a garden
  app.get('/api/gardens/:id/plants', isAuthenticated, async (req: any, res) => {
    try {
      const garden = await storage.getGarden(req.params.id);
      if (!garden) {
        return res.status(404).json({ message: "Garden not found" });
      }
      // Check ownership
      if (garden.userId !== req.user.claims.sub) {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const gardenPlants = await storage.getGardenPlants(req.params.id);
      
      // Fetch plant details for each garden plant
      const plantsWithDetails = await Promise.all(
        gardenPlants.map(async (gp) => {
          const plant = await storage.getPlant(gp.plantId);
          return {
            ...gp,
            plant
          };
        })
      );
      
      res.json(plantsWithDetails);
    } catch (error) {
      console.error("Error fetching garden plants:", error);
      res.status(500).json({ message: "Failed to fetch garden plants" });
    }
  });

  // Add plants to a garden
  app.post('/api/gardens/:id/plants', isAuthenticated, async (req: any, res) => {
    try {
      const garden = await storage.getGarden(req.params.id);
      if (!garden) {
        return res.status(404).json({ message: "Garden not found" });
      }
      // Check ownership
      if (garden.userId !== req.user.claims.sub) {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const { plants } = req.body; // Array of { plantId, quantity, position_x?, position_y? }
      
      if (!Array.isArray(plants) || plants.length === 0) {
        return res.status(400).json({ message: "Plants array is required" });
      }
      
      const addedPlants = await Promise.all(
        plants.map(async (plant) => {
          const gardenPlant = await storage.addPlantToGarden({
            gardenId: req.params.id,
            plantId: plant.plantId,
            quantity: plant.quantity || 1,
            position_x: plant.position_x || null,
            position_y: plant.position_y || null,
            notes: plant.notes || null
          });
          return gardenPlant;
        })
      );
      
      res.json({ 
        message: "Plants added successfully", 
        plants: addedPlants 
      });
    } catch (error) {
      console.error("Error adding plants to garden:", error);
      res.status(500).json({ message: "Failed to add plants to garden" });
    }
  });
  
  // Generate 3D garden visualization using Runware
  app.post('/api/gardens/generate-visualization', isAuthenticated, async (req: any, res) => {
    try {
      const {
        gardenDescription,
        plantList,
        plantNames,
        style,
        season,
        sunExposure,
        gardenId
      } = req.body;

      if (!plantNames || !gardenDescription) {
        return res.status(400).json({ 
          message: "Garden description and plant names are required" 
        });
      }

      // Use runwareImageGenerator for all image generation
      if (!runwareImageGenerator) {
        return res.status(503).json({ 
          message: "Image generation service not configured" 
        });
      }

      // Since runwareAPI is not properly configured, use runwareImageGenerator
      if (runwareImageGenerator) {
        try {
          // Generate detailed prompt for garden visualization
          const visualizationPrompt = `photorealistic ${style || 'cottage'} garden, ${season || 'summer'} season, ${gardenDescription}, featuring ${plantNames}, natural lighting, professional garden photography, high detail, beautiful landscaping, ${sunExposure === 'full_sun' ? 'bright sunny day' : sunExposure === 'partial_shade' ? 'dappled sunlight through trees' : 'soft diffused light'}, well-maintained garden beds, realistic plant placement and growth`;

          const imageUrl = await runwareImageGenerator.generateImage({
            prompt: visualizationPrompt,
            plantName: `${style || 'cottage'}-garden-visualization`,
            imageType: 'full',
            approach: 'garden',
            modelChoice: 'schnell'
          });

          // Optionally save to file vault
          if (gardenId && fileVaultService) {
            await fileVaultService.saveGardenImage(gardenId, imageUrl, 'visualization');
          }

          return res.json({ 
            imageUrl,
            message: "Garden visualization generated successfully"
          });
        } catch (error) {
          console.error("Error with runwareImageGenerator:", error);
          throw error;
        }
      } else {
        throw new Error("Image generation service not configured");
      }
    } catch (error) {
      console.error("Error generating garden visualization:", error);
      res.status(500).json({ 
        message: "Failed to generate garden visualization", 
        error: (error as Error).message 
      });
    }
  });
  
  // Design generation tracking routes
  app.get('/api/design-generations', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const generations = await storage.getUserDesignGenerations(userId);
      res.json(generations);
    } catch (error) {
      console.error("Error fetching design generations:", error);
      res.status(500).json({ message: "Failed to fetch design generations" });
    }
  });
  
  app.post('/api/design-generations', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const validatedData = insertDesignGenerationSchema.parse({
        ...req.body,
        userId
      });
      const generation = await storage.createDesignGeneration(validatedData);
      res.json(generation);
    } catch (error) {
      console.error("Error creating design generation:", error);
      res.status(500).json({ message: "Failed to track design generation" });
    }
  });

  // Climate data endpoint with Mapbox geocoding
  app.get('/api/climate', async (req: any, res) => {
    const location = req.query.location as string;
    
    if (!location || location.length < 3) {
      return res.status(400).json({ message: "Location is required" });
    }

    try {
      // First, geocode the location using Mapbox
      let coordinates = null;
      if (process.env.MAPBOX_API_KEY) {
        const mapboxApi = new MapboxAPI(process.env.MAPBOX_API_KEY);
        const geocodeResult = await mapboxApi.geocode(location);
        if (geocodeResult) {
          coordinates = {
            latitude: geocodeResult.latitude,
            longitude: geocodeResult.longitude,
            placeName: geocodeResult.placeName,
            country: geocodeResult.country,
            region: geocodeResult.region
          };
        }
      }

      // Fetch climate data using coordinates if available, otherwise use location string
      const climateData = await fetchClimateDataWithCoordinates(
        coordinates ? `${coordinates.latitude},${coordinates.longitude}` : location,
        coordinates ? { latitude: coordinates.latitude, longitude: coordinates.longitude } : null
      );

      if (!climateData) {
        return res.status(404).json({ message: "Climate data not available for this location" });
      }

      
      // Format location as "City, Zip, Country"
      let formattedLocation = location;
      if (coordinates) {
        const parts = [];
        if (coordinates.placeName) {
          const cityMatch = coordinates.placeName.match(/^([^,]+)/);
          if (cityMatch) parts.push(cityMatch[1].trim());
        }
        // Extract zip code from original location if present
        const zipMatch = location.match(/\b\d{5}(?:-\d{4})?\b/);
        if (zipMatch) parts.push(zipMatch[0]);
        if (coordinates.country) parts.push(coordinates.country);
        formattedLocation = parts.join(', ');
      }
      
      const response = {
        ...climateData,
        coordinates,
        location: formattedLocation
      };
      
      // Save to file vault if user is authenticated
      if (req.isAuthenticated && req.isAuthenticated() && req.user?.claims?.sub) {
        try {
          await fileVaultService.saveClimateReport(
            req.user.claims.sub,
            formattedLocation,
            response
          );
        } catch (vaultError) {
          console.error('Error saving to vault:', vaultError);
          // Don't fail the request if vault save fails
        }
      }
      
      res.json(response);
    } catch (error) {
      console.error("Error fetching climate data:", error);
      res.status(500).json({ message: "Failed to fetch climate data" });
    }
  });

  // Garden photo analysis endpoint
  app.post('/api/analyze-garden-photos', isAuthenticated, async (req: any, res) => {
    try {
      const { images, gardenInfo } = req.body;
      
      if (!images || !Array.isArray(images) || images.length === 0) {
        return res.status(400).json({ message: 'No images provided for analysis' });
      }

      const analysis = await analyzeGardenPhotos(images, gardenInfo);
      res.json(analysis);
    } catch (error) {
      console.error('Error analyzing garden photos:', error);
      res.status(500).json({ 
        message: 'Failed to analyze garden photos',
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });

  // Generate design styles endpoint
  app.post('/api/generate-design-styles', isAuthenticated, async (req: any, res) => {
    try {
      const { images, gardenData, photoAnalysis } = req.body;
      
      if (!images || !Array.isArray(images) || images.length === 0) {
        return res.status(400).json({ message: 'No images provided' });
      }

      if (!photoAnalysis) {
        return res.status(400).json({ message: 'Photo analysis results required' });
      }

      const styles = await generateDesignStyles(images, gardenData, photoAnalysis);
      res.json(styles);
    } catch (error) {
      console.error('Error generating design styles:', error);
      res.status(500).json({ 
        message: 'Failed to generate design styles',
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });

  // Generate complete garden design endpoint
  app.post('/api/generate-complete-design', isAuthenticated, async (req: any, res) => {
    try {
      const { selectedStyle, gardenData, safetyPreferences } = req.body;
      const userId = req.user.claims.sub;
      
      if (!selectedStyle) {
        return res.status(400).json({ message: 'Selected style is required' });
      }

      if (!gardenData) {
        return res.status(400).json({ message: 'Garden data is required' });
      }

      // Check user tier and generation limits
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      const userTier = user.userTier || 'free';
      const generations = await storage.getUserDesignGenerations(userId);
      const styleGenerations = await storage.getDesignGenerationsByStyle(userId, selectedStyle.id);

      // Apply tier restrictions
      if (userTier === 'free' && generations.length >= 1) {
        return res.status(403).json({ 
          message: 'Free tier users can only generate 1 design. Please upgrade to continue.',
          tierLimit: true 
        });
      }

      if (userTier === 'pay_per_design' && styleGenerations.length >= 1) {
        return res.status(403).json({ 
          message: 'You have already generated a design with this style. Try a different style or upgrade to premium.',
          iterationLimit: true 
        });
      }

      // Track the generation attempt
      const generationTracking = await storage.createDesignGeneration({
        userId,
        gardenId: gardenData.id || null,
        styleId: selectedStyle.id,
        generationType: generations.length === 0 ? 'initial' : 'iteration',
        success: false,
        tokensUsed: 0
      });

      try {
        const design = await generateCompleteGardenDesign(
          selectedStyle,
          gardenData,
          safetyPreferences || {}
        );
        
        // Update generation as successful
        await storage.createDesignGeneration({
          userId,
          gardenId: gardenData.id || null,
          styleId: selectedStyle.id,
          generationType: generations.length === 0 ? 'initial' : 'iteration',
          success: true,
          tokensUsed: 0 // You can track actual tokens if needed
        });
        
        res.json(design);
      } catch (genError) {
        // Update generation as failed
        await storage.createDesignGeneration({
          userId,
          gardenId: gardenData.id || null,
          styleId: selectedStyle.id,
          generationType: generations.length === 0 ? 'initial' : 'iteration',
          success: false,
          errorMessage: genError instanceof Error ? genError.message : 'Unknown error',
          tokensUsed: 0
        });
        throw genError;
      }
    } catch (error) {
      console.error('Error generating complete design:', error);
      res.status(500).json({ 
        message: 'Failed to generate complete garden design',
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });

  // Plant advice endpoint
  app.post('/api/plant-advice', isAuthenticated, async (req: any, res) => {
    try {
      const { question, context } = req.body;
      
      if (!question) {
        return res.status(400).json({ message: 'Question is required' });
      }

      const advice = await getPlantAdvice(question, context);
      res.json({ advice });
    } catch (error) {
      console.error('Error getting plant advice:', error);
      res.status(500).json({ 
        message: 'Failed to get plant advice',
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });

  // Soil testing services endpoint
  app.get('/api/soil-testing-services', async (req: any, res) => {
    const location = req.query.location as string;
    
    if (!location || location.length < 3) {
      return res.status(400).json({ message: "Location is required" });
    }

    if (!perplexityAI) {
      return res.status(503).json({ 
        message: "Soil testing service lookup is not available. Please configure PERPLEXITY_API_KEY." 
      });
    }

    try {
      const soilTestingData = await perplexityAI.findSoilTestingServices(location);
      
      // Save to file vault if user is authenticated
      if (req.isAuthenticated && req.isAuthenticated() && req.user?.claims?.sub) {
        try {
          // File vault save is optional - save soil testing data
          if (fileVaultService) {
            await fileVaultService.saveClimateReport(
              req.user.claims.sub,
              `soil-testing-${location.replace(/[^a-zA-Z0-9]/g, '-')}`,
              JSON.stringify(soilTestingData)
            );
          }
        } catch (vaultError) {
          console.error('Error saving to vault:', vaultError);
          // Don't fail the request if vault save fails
        }
      }
      
      res.json(soilTestingData);
    } catch (error) {
      console.error("Error finding soil testing services:", error);
      res.status(500).json({ 
        message: "Failed to find soil testing services. Please try again later." 
      });
    }
  });

  app.post('/api/gardens', isAuthenticated, async (req: any, res) => {
    try {
      const gardenData = insertGardenSchema.parse({
        ...req.body,
        userId: req.user.claims.sub
      });
      const garden = await storage.createGarden(gardenData);
      
      // Save garden design to file vault
      try {
        await fileVaultService.saveGardenDesign(
          req.user.claims.sub,
          garden.name,
          {
            ...garden,
            created: new Date().toISOString(),
            version: '1.0'
          }
        );
      } catch (vaultError) {
        console.error('Error saving garden to vault:', vaultError);
      }
      
      res.status(201).json(garden);
    } catch (error) {
      console.error("Error creating garden:", error);
      res.status(400).json({ message: "Failed to create garden", error: (error as Error).message });
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
      
      // If layout_data with plantPlacements is provided, update individual plant positions
      if (req.body.layout_data?.plantPlacements) {
        const placements = req.body.layout_data.plantPlacements;
        for (const placement of placements) {
          // Extract garden plant ID from the placement ID (format: "placed-{garden_plant_id}")
          const gardenPlantId = placement.id.replace('placed-', '');
          if (gardenPlantId) {
            await storage.updateGardenPlant(gardenPlantId, {
              position_x: placement.x,
              position_y: placement.y
            });
          }
        }
      }
      
      res.json(updatedGarden);
    } catch (error) {
      console.error("Error updating garden:", error);
      res.status(400).json({ message: "Failed to update garden", error: (error as Error).message });
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

  // AI Garden Design Generation with Claude for spatial accuracy
  app.post('/api/gardens/:id/generate-ai-design', isAuthenticated, async (req: any, res) => {
    try {
      if (!anthropicAI) {
        return res.status(503).json({ message: "AI service not configured. Please add ANTHROPIC_API_KEY." });
      }

      const garden = await storage.getGarden(req.params.id);
      if (!garden) {
        return res.status(404).json({ message: "Garden not found" });
      }
      
      // Check ownership
      if (garden.userId !== req.user.claims.sub) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      // Get verified plants from database
      const availablePlants = await storage.getAllPlants();
      const verifiedPlants = availablePlants.filter(p => p.verificationStatus === 'verified').slice(0, 30);
      
      // Generate AI design using Claude with spatial layout
      const prompt = `Create a garden design with precise spatial placement for a ${garden.shape} garden.
      
Garden Details:
- Shape: ${garden.shape}
- Dimensions: ${JSON.stringify(garden.dimensions)} ${garden.units}
- Location: ${garden.location || 'United Kingdom'}
- Sun Exposure: ${garden.sunExposure || 'mixed'}
- Style: mixed border

Available Plants (use these exact names and IDs):
${verifiedPlants.map(p => `- ID: ${p.id}, Name: ${p.commonName}, Scientific: ${p.scientificName}, Height: ${p.heightMaxCm}cm, Spread: ${p.spreadMaxCm}cm`).join('\n')}

Generate a JSON response with this exact structure:
{
  "plants": [
    {
      "id": "plant_id_from_list",
      "plantName": "common name",
      "scientificName": "scientific name", 
      "x": 10,  // percentage position (0-100)
      "y": 20,  // percentage position (0-100)
      "quantity": 1
    }
  ],
  "designNotes": "Brief description of the design approach"
}

Rules:
1. Position plants as percentages (0-100) within the garden shape
2. Consider mature plant sizes for spacing
3. Place taller plants towards the back/center
4. Group plants for visual impact
5. Ensure good coverage without overcrowding
6. Use only plants from the provided list`;

      const textContent = await anthropicAI.getGardeningAdvice(prompt);
      
      // Parse the AI response
      let aiDesign;
      try {
        // Extract JSON from the response
        const jsonMatch = textContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          aiDesign = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error("No valid JSON in response");
        }
      } catch (parseError) {
        console.error("Error parsing AI response:", parseError);
        // Fallback to a simple design
        aiDesign = {
          plants: verifiedPlants.slice(0, 5).map((p, i) => ({
            id: p.id,
            plantName: p.commonName,
            scientificName: p.scientificName,
            x: 20 + (i * 15),
            y: 30 + (i % 2 * 20),
            quantity: 1
          })),
          designNotes: "AI-assisted garden design with selected plants"
        };
      }

      // Update garden with AI-generated layout
      const updatedGarden = await storage.updateGarden(req.params.id, {
        layout_data: aiDesign,
        ai_generated: true
      });

      res.json({
        garden: updatedGarden,
        plantRecommendations: aiDesign.plants,
        designNotes: aiDesign.designNotes
      });
    } catch (error) {
      console.error("Error generating AI garden design:", error);
      res.status(500).json({ message: "Failed to generate AI design", error: (error as Error).message });
    }
  });

  // File vault routes
  app.get('/api/vault/items', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const items = await storage.getUserVaultItems(userId);
      res.json(items);
    } catch (error) {
      console.error("Error fetching vault items:", error);
      res.status(500).json({ message: "Failed to fetch vault items" });
    }
  });

  app.get('/api/vault/items/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const item = await storage.getVaultItem(req.params.id);
      
      if (!item) {
        return res.status(404).json({ message: "Vault item not found" });
      }
      
      // Check ownership
      if (item.userId !== userId) {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      // Update access time
      await storage.updateVaultAccessTime(item.id);
      
      res.json(item);
    } catch (error) {
      console.error("Error fetching vault item:", error);
      res.status(500).json({ message: "Failed to fetch vault item" });
    }
  });

  // Plant routes
  app.get('/api/plants/search', async (req, res) => {
    try {
      const query = req.query.q as string || "";
      
      // Check if we have advanced filters
      const hasAdvancedFilters = req.query.heightMin || req.query.heightMax || 
                                 req.query.spreadMin || req.query.spreadMax || 
                                 req.query.selectedColors;
      
      if (hasAdvancedFilters) {
        // Build advanced filters object
        const advancedFilters: any = {};
        
        // Range filters
        if (req.query.heightMin) advancedFilters.minHeight = parseInt(req.query.heightMin as string);
        // Handle includeLargeSpecimens flag - when true, don't set maxHeight (allows any height)
        if (req.query.includeLargeSpecimens === 'true') {
          // Don't set maxHeight, which allows trees of any height
          advancedFilters.maxHeight = 0; // 0 means no limit in storage.ts
        } else if (req.query.heightMax) {
          advancedFilters.maxHeight = parseInt(req.query.heightMax as string);
        }
        if (req.query.spreadMin) advancedFilters.minSpread = parseInt(req.query.spreadMin as string);
        if (req.query.spreadMax) advancedFilters.maxSpread = parseInt(req.query.spreadMax as string);
        
        // Color filters
        if (req.query.selectedColors) {
          const colors = req.query.selectedColors as string;
          advancedFilters.colors = colors.split(',');
        }
        
        // Include basic filters too
        if (req.query.type) advancedFilters.plantType = req.query.type as string;
        if (req.query.hardiness_zone) advancedFilters.hardiness = req.query.hardiness_zone as string;
        if (req.query.sun_requirements) advancedFilters.sunlight = req.query.sun_requirements as string;
        if (req.query.pet_safe === 'true') advancedFilters.isSafe = true;
        
        // Add query text if present
        if (query) {
          advancedFilters.genus = query; // Will search in genus, species, etc.
        }
        
        const plants = await storage.advancedSearchPlants(advancedFilters);
        res.json(plants);
      } else {
        // Use basic search for simple queries
        const filters = {
          type: req.query.type as string,
          hardiness_zone: req.query.hardiness_zone as string,
          sun_requirements: req.query.sun_requirements as string,
          pet_safe: req.query.pet_safe === 'true' ? true : undefined
        };
        
        const plants = await storage.searchPlants(query, filters);
        res.json(plants);
      }
    } catch (error) {
      console.error("Error searching plants:", error);
      res.status(500).json({ message: "Failed to search plants" });
    }
  });

  // Advanced plant search endpoint
  app.post('/api/plants/advanced-search', async (req, res) => {
    try {
      // Get filters from request body (JSON)
      const filters = req.body || {};
      
      console.log('Advanced search filters received:', filters);
      
      const plants = await storage.advancedSearchPlants(filters);
      res.json(plants);
    } catch (error) {
      console.error("Error in advanced plant search:", error);
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

  // Seed plants endpoint (temporary for testing)
  app.post('/api/admin/plants/seed', isAuthenticated, async (req, res, next) => {
    try {
      // Check if user is admin
      const user = await storage.getUser((req as any).user.claims.sub);
      if (!user || !user.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const samplePlants = [
        {
          id: 'lavender-' + Date.now(),
          commonName: 'English Lavender',
          scientificName: 'Lavandula angustifolia',
          genus: 'Lavandula',
          species: 'angustifolia',
          cultivar: 'Hidcote',
          plantType: 'herbaceous perennial',
          heightMin: 12,
          heightMax: 24,
          spreadMin: 18,
          spreadMax: 24,
          sunRequirements: 'full sun',
          wateringNeeds: 'low',
          soilType: 'well-drained, sandy, alkaline',
          phMin: 6.5,
          phMax: 8.0,
          hardinessZoneMin: 5,
          hardinessZoneMax: 9,
          bloomTime: 'summer',
          flowerColor: 'purple',
          foliage: 'evergreen',
          growthRate: 'moderate',
          pruningNeeds: 'light',
          propagationMethods: ['cuttings', 'division'],
          uses: ['ornamental', 'fragrance', 'pollinator', 'medicinal', 'culinary'],
          companionPlants: ['roses', 'sage', 'thyme'],
          problemsSolutions: 'Root rot in heavy soils; ensure good drainage',
          poisonousToHumans: 0,
          poisonousToPets: 0,
          edible: true,
          medicinalUses: 'Calming, aromatherapy, antiseptic',
          maintenanceLevel: 'low',
          droughtTolerant: true,
          saltTolerant: false,
          deerResistant: true,
          rabbitResistant: true,
          attractsButterflies: true,
          attractsHummingbirds: false,
          attractsBees: true,
          fragrant: true,
          cycle: 'perennial',
          careInstructions: 'Plant in full sun with well-draining soil. Water sparingly once established. Prune after flowering to maintain shape.',
          interestingSeason: 'summer',
          verificationStatus: 'verified'
        },
        {
          id: 'hosta-' + Date.now() + 1,
          commonName: 'Hosta',
          scientificName: 'Hosta sieboldiana',
          genus: 'Hosta',
          species: 'sieboldiana',
          cultivar: 'Elegans',
          plantType: 'herbaceous perennial',
          heightMin: 24,
          heightMax: 36,
          spreadMin: 48,
          spreadMax: 60,
          sunRequirements: 'partial shade',
          wateringNeeds: 'medium',
          soilType: 'rich, moist, well-drained',
          phMin: 6.0,
          phMax: 7.5,
          hardinessZoneMin: 3,
          hardinessZoneMax: 9,
          bloomTime: 'summer',
          flowerColor: 'lavender',
          foliage: 'deciduous',
          growthRate: 'moderate',
          pruningNeeds: 'minimal',
          propagationMethods: ['division'],
          uses: ['ornamental', 'shade garden', 'ground cover'],
          companionPlants: ['ferns', 'astilbe', 'bleeding heart'],
          problemsSolutions: 'Slugs and snails; use organic slug control',
          poisonousToHumans: 1,
          poisonousToPets: 3,
          edible: false,
          medicinalUses: '',
          maintenanceLevel: 'low',
          droughtTolerant: false,
          saltTolerant: false,
          deerResistant: false,
          rabbitResistant: false,
          attractsButterflies: false,
          attractsHummingbirds: true,
          attractsBees: false,
          fragrant: true,
          cycle: 'perennial',
          careInstructions: 'Plant in partial to full shade. Keep soil consistently moist. Divide every 3-5 years. Remove flower stalks after blooming.',
          interestingSeason: 'spring, summer',
          verificationStatus: 'verified'
        },
        {
          id: 'japanese-maple-' + Date.now() + 2,
          commonName: 'Japanese Maple',
          scientificName: 'Acer palmatum',
          genus: 'Acer',
          species: 'palmatum',
          cultivar: 'Bloodgood',
          plantType: 'ornamental tree',
          heightMin: 180,
          heightMax: 300,
          spreadMin: 180,
          spreadMax: 300,
          sunRequirements: 'partial sun',
          wateringNeeds: 'medium',
          soilType: 'slightly acidic, well-drained, moist',
          phMin: 5.5,
          phMax: 6.8,
          hardinessZoneMin: 5,
          hardinessZoneMax: 8,
          bloomTime: 'spring',
          flowerColor: 'red',
          foliage: 'deciduous',
          growthRate: 'slow',
          pruningNeeds: 'light',
          propagationMethods: ['cuttings', 'grafting'],
          uses: ['ornamental', 'specimen', 'container'],
          companionPlants: ['azaleas', 'rhododendrons', 'ferns'],
          problemsSolutions: 'Leaf scorch in hot sun; provide afternoon shade',
          poisonousToHumans: 0,
          poisonousToPets: 0,
          edible: false,
          medicinalUses: '',
          maintenanceLevel: 'medium',
          droughtTolerant: false,
          saltTolerant: false,
          deerResistant: false,
          rabbitResistant: true,
          attractsButterflies: false,
          attractsHummingbirds: false,
          attractsBees: false,
          fragrant: false,
          cycle: 'perennial',
          careInstructions: 'Plant in dappled shade with protection from hot afternoon sun. Keep soil moist but not waterlogged. Prune in late fall to early winter.',
          interestingSeason: 'spring, fall',
          verificationStatus: 'verified'
        }
      ];

      const createdPlants = [];
      for (const plant of samplePlants) {
        const created = await storage.createPlant(plant);
        createdPlants.push(created);
      }

      res.json({ message: `Successfully added ${createdPlants.length} plants`, plants: createdPlants });
    } catch (error) {
      console.error('Error seeding plants:', error);
      next(error);
    }
  });

  // Test endpoint for enhanced validation pipeline
  app.post('/api/admin/test-validation-pipeline', isAuthenticated, async (req: any, res) => {
    try {
      // Check if user is admin
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || !user.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const { scientific_name, common_name, height, spread, sunlight, description } = req.body;
      
      // Create a test plant object
      const testPlant = {
        scientific_name: scientific_name || 'Acaena buchananii',
        common_name: common_name || 'Blue Goose Leaf',
        height: height || '5-10 cm',
        spread: spread || '30-40 cm',
        sunlight: sunlight || ['full sun', 'partial shade'],
        description: description || 'A low-growing, mat-forming perennial with blue-green foliage'
      };
      
      console.log('\n=== Testing Validation Pipeline ===');
      console.log('Input plant:', testPlant);
      
      // Import the validation pipeline
      const plantImportService = new PlantImportService();
      
      // Run the full validation pipeline
      const enrichedPlant = await plantImportService.runFullValidationPipeline(testPlant);
      
      // Check results
      const hasHeight = !!(enrichedPlant.heightMinCm && enrichedPlant.heightMaxCm);
      const hasSpread = !!(enrichedPlant.spreadMinCm && enrichedPlant.spreadMaxCm);
      
      res.json({
        success: true,
        input: testPlant,
        output: enrichedPlant,
        improvements: {
          heightAdded: hasHeight,
          spreadAdded: hasSpread,
          heightData: hasHeight ? {
            min_cm: enrichedPlant.heightMinCm,
            max_cm: enrichedPlant.heightMaxCm,
            min_inches: enrichedPlant.heightMinInches,
            max_inches: enrichedPlant.heightMaxInches
          } : null,
          spreadData: hasSpread ? {
            min_cm: enrichedPlant.spreadMinCm,
            max_cm: enrichedPlant.spreadMaxCm,
            min_inches: enrichedPlant.spreadMinInches,
            max_inches: enrichedPlant.spreadMaxInches
          } : null,
          familyAdded: !!enrichedPlant.family,
          descriptionAdded: !!enrichedPlant.description
        }
      });
    } catch (error) {
      console.error('Validation pipeline test error:', error);
      res.status(500).json({ 
        error: 'Failed to test validation pipeline', 
        details: error.message 
      });
    }
  });

  // Admin plant routes
  app.post('/api/admin/plants', isAuthenticated, async (req: any, res) => {
    try {
      // Check if user is admin
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || !user.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const plantData = insertPlantSchema.parse(req.body);
      const plant = await storage.createPlant(plantData);
      res.status(201).json(plant);
    } catch (error) {
      console.error("Error creating plant:", error);
      res.status(400).json({ message: "Failed to create plant", error: (error as Error).message });
    }
  });

  app.get('/api/admin/plants/pending', isAuthenticated, async (req: any, res) => {
    try {
      // Check if user is admin
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || !user.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const plants = await storage.getPendingPlants();
      res.json(plants);
    } catch (error) {
      console.error("Error fetching pending plants:", error);
      res.status(500).json({ message: "Failed to fetch pending plants" });
    }
  });

  app.put('/api/admin/plants/:id/verify', isAuthenticated, async (req: any, res) => {
    try {
      // Check if user is admin
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || !user.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const plant = await storage.verifyPlant(req.params.id);
      res.json(plant);
    } catch (error) {
      console.error("Error verifying plant:", error);
      res.status(500).json({ message: "Failed to verify plant" });
    }
  });

  app.delete('/api/admin/plants/:id', isAuthenticated, async (req: any, res) => {
    try {
      // Check if user is admin
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || !user.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      await storage.deletePlant(req.params.id);
      res.json({ message: "Plant deleted successfully" });
    } catch (error) {
      console.error("Error deleting plant:", error);
      res.status(500).json({ message: "Failed to delete plant" });
    }
  });

  // AI-Generated Garden Tool Icons API
  app.post('/api/admin/generate-garden-tool-icons', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || !user.isAdmin) {
        return res.status(403).json({ message: 'Admin access required' });
      }

      console.log('Starting AI garden tool icon generation...');
      const generatedPaths = await generateAllGardenToolIcons();
      
      res.json({ 
        success: true, 
        message: `Generated ${generatedPaths.length} garden tool icons`,
        paths: generatedPaths 
      });
    } catch (error) {
      console.error('Error generating garden tool icons:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to generate garden tool icons',
        error: error.message 
      });
    }
  });

  app.post('/api/admin/generate-single-icon', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || !user.isAdmin) {
        return res.status(403).json({ message: 'Admin access required' });
      }

      const { toolName, description } = req.body;
      if (!toolName || !description) {
        return res.status(400).json({ message: 'toolName and description are required' });
      }

      const filename = toolName.toLowerCase().replace(/\s+/g, '-') + '.png';
      const outputPath = `client/public/generated-icons/${filename}`;
      
      await generateGardenToolIcon(toolName, description, outputPath);
      
      res.json({ 
        success: true, 
        message: `Generated ${toolName} icon`,
        path: `/generated-icons/${filename}`
      });
    } catch (error) {
      console.error('Error generating single icon:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to generate icon',
        error: error.message 
      });
    }
  });

  // Simple image generation
  app.post('/api/generate-simple-image', isAuthenticated, async (req: any, res) => {
    try {
      const { prompt } = req.body;
      if (!prompt) {
        return res.status(400).json({ error: 'Prompt required' });
      }

      const timestamp = Date.now();
      const filename = `generated-${timestamp}.png`;
      const outputPath = `client/public/temp/${filename}`;
      
      await generateGardenToolIcon("Custom Image", prompt, outputPath);
      
      res.json({ 
        imageUrl: `/temp/${filename}`,
        message: 'Image generated successfully'
      });
    } catch (error) {
      console.error('Simple image generation error:', error);
      res.status(500).json({ error: 'Failed to generate image' });
    }
  });

  // Validate plant data with Perplexity
  app.post('/api/admin/plants/:id/validate', isAuthenticated, async (req: any, res) => {
    try {
      // Check if user is admin
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || !user.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const plantId = req.params.id;
      const plant = await storage.getPlant(plantId);
      
      if (!plant) {
        return res.status(404).json({ error: 'Plant not found' });
      }
      
      const { plantImportService } = await import('./plantImportService.js');
      
      // Convert plant to import format for validation
      const plantData = {
        scientific_name: plant.scientificName,
        common_name: plant.commonName,
        family: plant.family,
        type: plant.type,
        cycle: plant.cycle,
        watering: plant.watering,
        sunlight: plant.sunlight,
        hardiness: plant.hardiness,
        soil: plant.soil,
        growth_rate: plant.growthRate,
        care_level: plant.careLevel,
        description: plant.description,
        drought_tolerant: plant.droughtTolerant,
        salt_tolerant: plant.saltTolerant,
        poisonous_to_pets: plant.poisonousToPets === 1,
        poisonous_to_humans: plant.poisonousToHumans === 1,
        medicinal: plant.medicinal,
        cuisine: plant.cuisine,
        flower_color: plant.flowerColor,
        leaf_color: plant.leafColor,
        flowering_season: plant.floweringSeason,
        propagation: plant.propagation,
        pruning_month: plant.pruningMonth,
        maintenance: plant.maintenance,
      };
      
      // Validate with Perplexity to fill missing fields
      const validatedData = await plantImportService.validateWithPerplexity(plantData);
      
      // Count how many fields were updated
      let updatedFields = 0;
      const updates: any = {};
      
      // Check what fields were added/updated - ALL fields
      if (validatedData.common_name && !plant.commonName) {
        updates.commonName = validatedData.common_name;
        updatedFields++;
      }
      if (validatedData.family && !plant.family) {
        updates.family = validatedData.family;
        updatedFields++;
      }
      if (validatedData.type && !plant.type) {
        updates.type = validatedData.type;
        updatedFields++;
      }
      if (validatedData.description && !plant.description) {
        updates.description = validatedData.description;
        updatedFields++;
      }
      if (validatedData.watering && !plant.watering) {
        updates.watering = validatedData.watering;
        updatedFields++;
      }
      if (validatedData.sunlight && (!plant.sunlight || plant.sunlight.length === 0)) {
        updates.sunlight = validatedData.sunlight;
        updatedFields++;
      }
      if (validatedData.hardiness && !plant.hardiness) {
        updates.hardiness = validatedData.hardiness;
        updatedFields++;
      }
      if (validatedData.care_level && !plant.careLevel) {
        updates.careLevel = validatedData.care_level;
        updatedFields++;
      }
      if (validatedData.growth_rate && !plant.growthRate) {
        updates.growthRate = validatedData.growth_rate;
        updatedFields++;
      }
      if (validatedData.soil && (!plant.soil || plant.soil.length === 0)) {
        updates.soil = validatedData.soil;
        updatedFields++;
      }
      if (validatedData.dimension && !plant.dimension) {
        updates.dimension = validatedData.dimension;
        updatedFields++;
      }
      if (validatedData.flowering_season && !plant.floweringSeason) {
        updates.floweringSeason = validatedData.flowering_season;
        updatedFields++;
      }
      if (validatedData.flower_color && (!plant.flowerColor || plant.flowerColor.length === 0 || plant.flowerColor === 'varies')) {
        // Reject "varies" and ensure we get specific colors
        if (validatedData.flower_color !== 'varies' && validatedData.flower_color !== 'mixed') {
          updates.flowerColor = validatedData.flower_color;
          updatedFields++;
        }
      }
      if (validatedData.maintenance && !plant.maintenance) {
        updates.maintenance = validatedData.maintenance;
        updatedFields++;
      }
      if (validatedData.propagation && (!plant.propagation || plant.propagation.length === 0)) {
        updates.propagation = validatedData.propagation;
        updatedFields++;
      }
      if (validatedData.drought_tolerant !== null && plant.droughtTolerant === null) {
        updates.droughtTolerant = validatedData.drought_tolerant;
        updatedFields++;
      }
      if (validatedData.salt_tolerant !== null && plant.saltTolerant === null) {
        updates.saltTolerant = validatedData.salt_tolerant;
        updatedFields++;
      }
      if (validatedData.poisonous_to_pets !== null && plant.poisonousToPets === null) {
        updates.poisonousToPets = validatedData.poisonous_to_pets ? 1 : 0;
        updatedFields++;
      }
      if (validatedData.medicinal !== null && plant.medicinal === null) {
        updates.medicinal = validatedData.medicinal;
        updatedFields++;
      }
      if (validatedData.cuisine !== null && plant.cuisine === null) {
        updates.cuisine = validatedData.cuisine;
        updatedFields++;
      }
      
      // Update the plant in the database if there are changes
      if (updatedFields > 0) {
        await storage.updatePlant(plantId, updates);
      }
      
      res.json({ 
        success: true, 
        updatedFields,
        updates 
      });
    } catch (error) {
      console.error('Plant validation error:', error);
      res.status(500).json({ error: 'Validation failed' });
    }
  });

  // Image generation endpoints
  app.post('/api/admin/plants/:id/generate-images', isAuthenticated, async (req: any, res) => {
    try {
      // Check if user is admin
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || !user.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const plantId = req.params.id;
      const plant = await storage.getPlant(plantId);
      
      if (!plant) {
        return res.status(404).json({ message: "Plant not found" });
      }

      // Queue the plant for image generation
      await imageGenerationService.queuePlantForGeneration(plantId);
      
      res.json({ 
        message: "Image generation queued", 
        plantId,
        status: "queued" 
      });
    } catch (error) {
      console.error("Error starting image generation:", error);
      res.status(500).json({ 
        message: "Failed to start image generation", 
        error: (error as Error).message 
      });
    }
  });

  // Bulk generate images for all plants without images
  app.post('/api/admin/plants/generate-all-images', isAuthenticated, async (req: any, res) => {
    try {
      // Check if user is admin
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || !user.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const allPlants = await storage.getAllPlants();
      const plantsWithoutImages = allPlants.filter(plant => 
        !plant.thumbnailImage && !plant.fullImage && !plant.detailImage
      );

      if (plantsWithoutImages.length === 0) {
        return res.json({ 
          message: "All plants already have images", 
          queued: 0, 
          total: allPlants.length 
        });
      }

      // Queue all plants for generation
      const queuePromises = plantsWithoutImages.map(plant => 
        imageGenerationService.queuePlantForGeneration(plant.id)
          .catch(err => {
            console.error(`Failed to queue ${plant.commonName}:`, err);
            return null;
          })
      );

      await Promise.all(queuePromises);
      
      res.json({ 
        message: `Queued ${plantsWithoutImages.length} plants for image generation`, 
        queued: plantsWithoutImages.length,
        total: allPlants.length,
        plantsQueued: plantsWithoutImages.map(p => ({ id: p.id, name: p.commonName || p.scientificName }))
      });
    } catch (error) {
      console.error("Error starting bulk image generation:", error);
      res.status(500).json({ 
        message: "Failed to start bulk image generation", 
        error: (error as Error).message 
      });
    }
  });

  app.get('/api/admin/image-generation/status', isAuthenticated, async (req: any, res) => {
    try {
      // Check if user is admin
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || !user.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const status = await imageGenerationService.getGenerationStatus();
      res.json(status);
    } catch (error) {
      console.error("Error getting image generation status:", error);
      res.status(500).json({ 
        message: "Failed to get generation status", 
        error: (error as Error).message 
      });
    }
  });

  app.get('/api/admin/image-generation/queue', isAuthenticated, async (req: any, res) => {
    try {
      // Check if user is admin
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || !user.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const queue = await imageGenerationService.getQueueStatus();
      
      // Check if there are pending items and nothing is processing
      const hasPending = queue.counts.pending > 0;
      const nothingProcessing = queue.counts.processing === 0;
      
      if (hasPending && nothingProcessing) {
        // Restart the queue processor if it has stopped
        console.log("Restarting queue processor - found pending items with nothing processing");
        imageGenerationService.startProcessing();
      }
      
      res.json(queue);
    } catch (error) {
      console.error("Error getting queue status:", error);
      res.status(500).json({ 
        message: "Failed to get queue status", 
        error: (error as Error).message 
      });
    }
  });

  // Clear completed and failed items from the queue
  app.post('/api/admin/image-generation/clear-queue', isAuthenticated, async (req: any, res) => {
    try {
      // Check if user is admin
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || !user.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const clearedCount = await imageGenerationService.clearCompletedAndFailed();
      res.json({ 
        message: `Cleared ${clearedCount} items from the queue`,
        cleared: clearedCount
      });
    } catch (error) {
      console.error("Error clearing queue:", error);
      res.status(500).json({ 
        message: "Failed to clear queue", 
        error: (error as Error).message 
      });
    }
  });

  // Admin route for photorealizing garden images
  app.post('/api/admin/photorealize-garden', isAuthenticated, async (req: any, res) => {
    try {
      const {
        referenceImage,
        prompt,
        negativePrompt,
        width,
        height,
        strength = 0.4,
        cfgScale = 7.5,
        seed = 42,
        gardenId,
        season,
        timeOfDay
      } = req.body;
      
      if (!referenceImage || !prompt) {
        return res.status(400).json({ message: "Reference image and prompt are required" });
      }
      
      if (!runwareAPI) {
        console.warn('Runware API not configured - photorealization skipped');
        return res.status(503).json({ message: "Runware API not configured" });
      }
      
      console.log('📸 Starting photorealization for garden', gardenId);
      
      // Use Runware img2img to photorealize the Three.js render
      const response = await runwareAPI.generateImage({
        positivePrompt: prompt,
        negativePrompt: negativePrompt || '',
        model: "civitai:4201@130072", // Realistic Vision V6.0
        height: height || 1088,
        width: width || 1920,
        numberResults: 1,
        outputType: "URL",
        outputFormat: "PNG",
        seedImage: referenceImage, // Base64 image from Three.js
        strength: strength, // Conservative strength to preserve geometry
        steps: 25,
        CFGScale: cfgScale,
        seed: seed
      });
      
      console.log('✨ Runware photorealization response:', response);
      
      if (response && response.imageUrl) {
        // Save the photorealized image to file vault if needed
        if (gardenId) {
          const fileName = `photorealized_${gardenId}_${season}_${timeOfDay}_${Date.now()}.png`;
          await fileVaultService.saveFile('garden_images', fileName, response.imageUrl, 'url');
          
          console.log('💾 Saved photorealized image:', fileName);
        }
        
        res.json({
          success: true,
          imageUrl: response.imageUrl,
          message: 'Garden successfully photorealized'
        });
      } else {
        throw new Error('No image generated from Runware');
      }
    } catch (error) {
      console.error('Photorealization error:', error);
      res.status(500).json({ 
        message: "Failed to photorealize garden", 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });
  
  // NEW: Admin route for Gemini 2.5 Flash botanical enhancement (Step 2 of pipeline)
  app.post('/api/admin/gemini-enhance-garden', isAuthenticated, async (req: any, res) => {
    try {
      const {
        referenceImage,
        plants,
        season,
        gardenDimensions,
        gardenShape,
        botanicalAccuracy = true,
        maintainComposition = true,
        specificMonth
      } = req.body;
      
      if (!referenceImage || !plants) {
        return res.status(400).json({ message: "Reference image and plant data are required" });
      }
      
      if (!geminiAI) {
        console.warn('Gemini API not configured - enhancement skipped');
        return res.status(503).json({ message: "Gemini API not configured" });
      }
      
      console.log('🌿 Starting Gemini 2.5 Flash botanical enhancement');
      
      // Fetch complete botanical data for all plants if not already provided
      let enrichedPlants = plants;
      if (plants.length > 0 && !plants[0].genus) {
        // Plants don't have full botanical data, fetch it
        const plantIds = plants.map((p: any) => p.id || p.plantId).filter(Boolean);
        const fullPlantData = await Promise.all(
          plantIds.map(async (id: string) => {
            const plant = await storage.getPlant(id);
            return plant;
          })
        );
        
        // Merge position data with botanical data
        enrichedPlants = plants.map((p: any, idx: number) => {
          const botanicalData = fullPlantData.find(fp => fp?.id === (p.id || p.plantId));
          return {
            ...botanicalData,
            ...p,
            position: p.position || { x: 50, y: 50 }
          };
        });
      }
      
      // Create botanical-aware prompt with complete plant data
      const botanicalPrompt = createBotanicalPrompt(enrichedPlants, season, gardenShape, gardenDimensions, specificMonth);
      
      // Use Gemini's enhanceGardenToPhotorealistic method with enriched data
      const enhancedImage = await geminiAI.enhanceGardenToPhotorealistic({
        imageBase64: referenceImage,
        plants: enrichedPlants.map((p: any) => ({
          plantName: p.commonName || p.name,
          scientificName: p.cultivar ? 
            `${p.genus} ${p.species} '${p.cultivar}'` : 
            p.genus && p.species ? `${p.genus} ${p.species}` : 
            p.scientificName,
          x: p.position?.x || 50,
          y: p.position?.y || 50,
          height: p.heightMaxCm ? p.heightMaxCm / 100 : 1,
          spread: p.spreadMaxCm ? p.spreadMaxCm / 100 : 0.5,
          bloomStatus: p.bloomStartMonth && p.bloomEndMonth && 
            specificMonth >= p.bloomStartMonth && specificMonth <= p.bloomEndMonth ?
            'blooming' : 'not-blooming',
          foliageType: p.foliage,
          size: p.heightMaxCm > 300 ? 'large' : p.heightMaxCm > 100 ? 'medium' : 'small'
        })),
        gardenSize: `${gardenDimensions.width}m x ${gardenDimensions.length}m`,
        season: season,
        style: 'Natural photorealistic garden photography',
        botanicalContext: botanicalPrompt
      });
      
      if (!enhancedImage) {
        throw new Error('Failed to generate enhanced image');
      }
      
      console.log('✨ Gemini enhancement complete');
      
      // Save to file vault
      const fileName = `gemini_enhanced_${season}_${Date.now()}.png`;
      await fileVaultService.saveFile('garden_images', fileName, enhancedImage, 'base64');
      
      res.json({
        imageUrl: enhancedImage,
        message: "Garden enhanced with Gemini 2.5 Flash successfully"
      });
    } catch (error) {
      console.error('Error enhancing garden with Gemini:', error);
      apiMonitoring.recordError('/api/admin/gemini-enhance-garden', error);
      res.status(500).json({ message: "Failed to enhance garden with Gemini" });
    }
  });
  
  // Helper function to create botanical-aware prompts with complete plant data
  function createBotanicalPrompt(
    plants: any[],
    season: string,
    shape: string,
    dimensions: any,
    specificMonth?: number
  ): string {
    // Map seasons to specific months for precise rendering
    const getMonthFromSeason = (s: string, month?: number): number => {
      if (month) return month;
      switch(s) {
        case 'spring': return 4; // April
        case 'summer': return 7; // July
        case 'autumn': return 10; // October
        case 'winter': return 1; // January
        default: return 7;
      }
    };
    
    const targetMonth = getMonthFromSeason(season, specificMonth);
    
    // Create detailed plant descriptions with complete botanical data
    const detailedPlantDescriptions = plants.map((p, idx) => {
      const { 
        genus, species, cultivar, commonName,
        heightMinCm, heightMaxCm, spreadMinCm, spreadMaxCm,
        bloomStartMonth, bloomEndMonth, floweringSeason,
        flowerColor, leafColor, foliage,
        type, growthRate, cycle,
        position = { x: 50, y: 50 }
      } = p;
      
      // Create scientific name
      const scientificName = cultivar ? 
        `${genus} ${species} '${cultivar}'` : 
        genus && species ? `${genus} ${species}` : 
        p.scientificName || commonName;
      
      // Calculate dimensions
      const heightM = heightMaxCm ? (heightMaxCm / 100).toFixed(1) : '1.0';
      const spreadM = spreadMaxCm ? (spreadMaxCm / 100).toFixed(1) : '0.5';
      
      // Determine bloom status for target month
      const isBlooming = bloomStartMonth && bloomEndMonth && 
        targetMonth >= bloomStartMonth && targetMonth <= bloomEndMonth;
      
      // Create seasonal description based on plant characteristics
      let seasonalState = '';
      if (targetMonth >= 3 && targetMonth <= 5) { // Spring
        if (isBlooming) {
          seasonalState = `showing ${flowerColor?.join(' and ') || 'colorful'} spring blooms`;
        } else if (foliage === 'deciduous') {
          seasonalState = 'with fresh emerging foliage, bright green new growth';
        } else {
          seasonalState = 'with new growth emerging';
        }
      } else if (targetMonth >= 6 && targetMonth <= 8) { // Summer
        if (isBlooming) {
          seasonalState = `in peak bloom with abundant ${flowerColor?.join(' and ') || 'colorful'} flowers`;
        } else {
          seasonalState = `with full, lush ${leafColor?.join('-') || 'green'} foliage`;
        }
      } else if (targetMonth >= 9 && targetMonth <= 11) { // Autumn
        if (foliage === 'deciduous') {
          if (isBlooming) {
            seasonalState = `with late ${flowerColor?.join('-') || 'autumn'} blooms and changing foliage`;
          } else {
            seasonalState = 'with foliage turning brilliant autumn colors (gold, orange, red)';
          }
        } else if (isBlooming) {
          seasonalState = `with late season ${flowerColor?.join('-') || 'autumn'} blooms`;
        } else {
          seasonalState = 'with mature foliage and seed heads';
        }
      } else { // Winter
        if (foliage === 'evergreen') {
          seasonalState = 'maintaining evergreen structure and winter interest';
        } else if (type === 'ornamental trees' || type === 'shrubs') {
          seasonalState = 'showing bare architectural branching structure';
        } else {
          seasonalState = 'dormant, cut back to ground level';
        }
      }
      
      return `Plant ${idx + 1} at position (${position.x}%, ${position.y}%):
  ${commonName} [${scientificName}]
  Size: Height ${heightM}m, Spread ${spreadM}m
  Type: ${type || 'perennial'}, ${cycle || 'perennial'} ${foliage || ''}
  Current state (Month ${targetMonth}): ${seasonalState}`;
    }).join('\n\n');
    
    const seasonalDescriptions = {
      spring: `Fresh spring garden in month ${targetMonth} (${['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][targetMonth]}): New growth emerging, early blooms beginning, bright green foliage`,
      summer: `Peak summer garden in month ${targetMonth} (${['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][targetMonth]}): Full bloom period, lush mature foliage, abundant flowers`,
      autumn: `Autumn garden in month ${targetMonth} (${['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][targetMonth]}): Changing foliage colors, late blooms, seed heads forming`,
      winter: `Winter garden in month ${targetMonth} (${['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][targetMonth]}): Dormant perennials, evergreen structure, bare architectural elements`
    };
    
    const plantDescriptions = plants.map(p => {
      if (season === 'winter' && p.foliageType !== 'evergreen') {
        return `${p.name} (dormant, bare branches)`;
      } else if (bloomingPlants.includes(p)) {
        return `${p.name} (in bloom)`;
      } else {
        return `${p.name} (foliage only)`;
      }
    }).join(', ');
    
    return `Photorealistic ${season} garden photograph. ${seasonalDescriptions[season]}. 
      ${shape} garden ${dimensions.width}x${dimensions.length}m containing: ${plantDescriptions}. 
      Natural lighting, botanical accuracy, maintain exact plant positions from reference.`;
  }

  // Generate seasonal variations using Gemini 2.5 "nano banana"
  app.post('/api/admin/generate-seasonal-variations', isAuthenticated, async (req: any, res) => {
    try {
      const {
        referenceImage, // Base64 image from photorealization
        gardenId,
        plants = [],
        gardenSize = "10x10m",
        style = "Natural photorealistic garden"
      } = req.body;
      
      if (!referenceImage) {
        return res.status(400).json({ message: "Reference image is required" });
      }
      
      if (!geminiAI) {
        console.warn('Gemini API not configured');
        return res.status(503).json({ message: "Gemini API not configured" });
      }
      
      console.log('🌸 Starting seasonal variations generation with Gemini 2.5 nano banana');
      
      const seasons = ['spring', 'summer', 'autumn', 'winter'];
      const seasonalImages: { [key: string]: string } = {};
      const seasonalPrompts: { [key: string]: string } = {
        spring: `Transform to early spring garden: fresh green foliage, spring bulbs blooming (tulips, daffodils, crocuses), cherry blossoms, bright green new growth, soft morning light, dewy atmosphere. ${style}. Keep exact same viewpoint and composition.`,
        summer: `Transform to peak summer garden: lush full foliage, abundant colorful flowers in full bloom, roses, lavender, deep green mature leaves, warm golden afternoon light, vibrant colors. ${style}. Keep exact same viewpoint and composition.`,
        autumn: `Transform to autumn garden: golden, orange and red foliage, autumn flowers (asters, chrysanthemums), falling leaves, warm amber light, harvest atmosphere. ${style}. Keep exact same viewpoint and composition.`,
        winter: `Transform to winter garden: bare deciduous branches, evergreen structure visible, frost on plants, possibly light snow, cool blue-gray light, serene atmosphere. ${style}. Keep exact same viewpoint and composition.`
      };
      
      // Generate each seasonal variation
      for (const season of seasons) {
        try {
          console.log(`🌿 Generating ${season} variation...`);
          
          const result = await geminiAI.generateImageWithReference(
            seasonalPrompts[season],
            referenceImage.replace(/^data:image\/[a-z]+;base64,/, '') // Strip data URL prefix if present
          );
          
          if (result.imageData) {
            // Save to file vault
            const timestamp = Date.now();
            const fileName = `seasonal_${gardenId}_${season}_${timestamp}.png`;
            
            // Convert base64 to buffer and save
            const base64Data = result.imageData.replace(/^data:image\/[a-z]+;base64,/, '');
            const buffer = Buffer.from(base64Data, 'base64');
            
            // Save to public/generated-images for serving
            const fs = await import('fs/promises');
            const path = await import('path');
            const publicPath = path.join('public', 'generated-images', fileName);
            await fs.writeFile(publicPath, buffer);
            
            // Also save to file vault for persistence
            await fileVaultService.saveFile('garden_images', fileName, result.imageData, 'base64');
            
            seasonalImages[season] = `/generated-images/${fileName}`;
            console.log(`✅ Generated ${season} variation: ${fileName}`);
          } else {
            console.error(`Failed to generate ${season} variation`);
          }
        } catch (seasonError) {
          console.error(`Error generating ${season}:`, seasonError);
          // Continue with other seasons even if one fails
        }
      }
      
      if (Object.keys(seasonalImages).length === 0) {
        throw new Error('Failed to generate any seasonal variations');
      }
      
      res.json({
        success: true,
        seasonalImages,
        message: `Successfully generated ${Object.keys(seasonalImages).length} seasonal variations`,
        generatedSeasons: Object.keys(seasonalImages)
      });
      
    } catch (error) {
      console.error('Seasonal generation error:', error);
      res.status(500).json({ 
        message: "Failed to generate seasonal variations", 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });

  // Plant Import Wizard endpoints
  app.get('/api/admin/import/search-perenual', isAuthenticated, async (req, res) => {
    try {
      // Check if user is admin
      const user = await storage.getUser((req as any).user.claims.sub);
      if (!user || !user.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const { q } = req.query;
      if (!q || typeof q !== 'string') {
        return res.status(400).json({ error: 'Search query required' });
      }
      
      const { plantImportService } = await import('./plantImportService.js');
      const results = await plantImportService.searchPerenual(q);
      
      res.json({ plants: results });
    } catch (error) {
      console.error('Perenual search error:', error);
      res.status(500).json({ error: 'Search failed' });
    }
  });
  
  // Plant Import Wizard - Search GBIF with same rigorous standards
  app.get('/api/admin/import/search-gbif', isAuthenticated, async (req, res) => {
    try {
      // Check if user is admin
      const user = await storage.getUser((req as any).user.claims.sub);
      if (!user || !user.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const { q } = req.query;
      if (!q || typeof q !== 'string') {
        return res.status(400).json({ error: 'Search query required' });
      }
      
      const { plantImportService } = await import('./plantImportService.js');
      const results = await plantImportService.searchGBIF(q);
      
      res.json({ plants: results, total: results.length });
    } catch (error) {
      console.error('GBIF search error:', error);
      res.status(500).json({ error: 'GBIF search failed' });
    }
  });
  
  app.post('/api/admin/import/enrich-gbif', isAuthenticated, async (req, res) => {
    try {
      // Check if user is admin
      const user = await storage.getUser((req as any).user.claims.sub);
      if (!user || !user.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const { scientific_name } = req.body;
      if (!scientific_name) {
        return res.status(400).json({ error: 'Scientific name required' });
      }
      
      const { plantImportService } = await import('./plantImportService.js');
      const enrichment = await plantImportService.enrichWithGBIF(scientific_name);
      
      res.json(enrichment);
    } catch (error) {
      console.error('GBIF enrichment error:', error);
      res.status(500).json({ error: 'Enrichment failed' });
    }
  });
  
  app.post('/api/admin/import/enrich-inaturalist', isAuthenticated, async (req, res) => {
    try {
      const { scientific_name } = req.body;
      if (!scientific_name) {
        return res.status(400).json({ error: 'Scientific name required' });
      }
      
      const { plantImportService } = await import('./plantImportService.js');
      const enrichment = await plantImportService.enrichWithINaturalist(scientific_name);
      
      res.json(enrichment);
    } catch (error) {
      console.error('iNaturalist enrichment error:', error);
      res.status(500).json({ error: 'Enrichment failed' });
    }
  });
  
  // Search iNaturalist for plants
  app.get('/api/admin/import/search-inaturalist', isAuthenticated, async (req, res) => {
    try {
      const { q } = req.query;
      if (!q || typeof q !== 'string') {
        return res.status(400).json({ error: 'Search query required' });
      }
      
      const { plantImportService } = await import('./plantImportService.js');
      const results = await plantImportService.searchINaturalist(q);
      
      res.json({ plants: results, total: results.length });
    } catch (error) {
      console.error('iNaturalist search error:', error);
      res.status(500).json({ error: 'iNaturalist search failed' });
    }
  });
  
  // Validate plant data with Perplexity AI
  app.post('/api/admin/import/validate-perplexity', isAuthenticated, async (req, res) => {
    try {
      const { plant } = req.body;
      if (!plant || !plant.scientific_name) {
        return res.status(400).json({ error: 'Plant data with scientific name required' });
      }
      
      const { plantImportService } = await import('./plantImportService.js');
      const validated = await plantImportService.validateWithPerplexity(plant);
      
      res.json(validated);
    } catch (error) {
      console.error('Perplexity validation error:', error);
      res.status(500).json({ error: 'Validation failed' });
    }
  });
  
  app.post('/api/admin/import/plants', isAuthenticated, async (req, res) => {
    try {
      // Check if user is admin
      const user = await storage.getUser((req as any).user.claims.sub);
      if (!user || !user.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const { plants } = req.body;
      if (!plants || !Array.isArray(plants)) {
        return res.status(400).json({ error: 'Plants array required' });
      }
      
      const { plantImportService } = await import('./plantImportService.js');
      const result = await plantImportService.importPlants(plants);
      
      res.json(result);
    } catch (error) {
      console.error('Plant import error:', error);
      res.status(500).json({ error: 'Import failed' });
    }
  });
  
  // Reset stuck items back to pending
  app.post('/api/admin/image-generation/reset-stuck', isAuthenticated, async (req: any, res) => {
    try {
      // Check if user is admin
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || !user.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const resetCount = await imageGenerationService.retryStuckImages();
      res.json({ 
        message: `Reset ${resetCount} stuck items`,
        reset: resetCount
      });
    } catch (error) {
      console.error("Error resetting stuck items:", error);
      res.status(500).json({ 
        message: "Failed to reset stuck items", 
        error: (error as Error).message 
      });
    }
  });
  
  // Test endpoint for comparing different image generation approaches
  app.post('/api/admin/test-generation', isAuthenticated, async (req: any, res) => {
    try {
      const { plantName, approach, modelChoice, imageType } = req.body;
      
      if (!plantName) {
        return res.status(400).json({ error: 'Plant name is required' });
      }
      
      const type = imageType || 'full';
      console.log(`Testing: ${plantName} ${type} with ${approach || 'garden'} approach using ${modelChoice || 'schnell'}`);
      
      try {
        const imagePath = await runwareImageGenerator.generateImage({
          prompt: plantName,
          plantName,
          imageType: type,
          approach: approach || 'garden',
          modelChoice: modelChoice || 'schnell'
        });
        
        const result = {
          id: Date.now().toString(),
          plantName,
          imageType: type,
          approach: approach || 'garden',
          model: modelChoice || 'schnell',
          url: imagePath,
          timestamp: new Date().toISOString()
        };
        
        res.json({
          message: 'Test generation complete',
          result
        });
      } catch (error) {
        console.error(`Failed to generate:`, error);
        res.status(500).json({ error: (error as Error).message });
      }
    } catch (error) {
      console.error('Test generation error:', error);
      res.status(500).json({ error: 'Test generation failed' });
    }
  });
  
  // Get all test images from the generated folder
  app.get('/api/admin/test-images', isAuthenticated, async (req: any, res) => {
    try {
      const fs = await import('fs/promises');
      const imagesDir = path.join(process.cwd(), 'client', 'public', 'generated-images');
      
      try {
        await fs.access(imagesDir);
      } catch {
        // Create directory if it doesn't exist
        await fs.mkdir(imagesDir, { recursive: true });
        return res.json({ images: [] });
      }
      
      const files = await fs.readdir(imagesDir);
      const images = [];
      
      for (const file of files) {
        if (file.endsWith('.png')) {
          try {
            const parts = file.replace('.png', '').split('-');
            const timestampStr = parts[parts.length - 1];
            const imageType = parts[parts.length - 2];
            
            // Check if the third-to-last part is an approach type
            let approach = 'garden';
            let plantNameEndIndex = -2;
            
            if (parts.length >= 4) {
              const possibleApproach = parts[parts.length - 3];
              if (['garden', 'atlas', 'hybrid'].includes(possibleApproach)) {
                approach = possibleApproach;
                plantNameEndIndex = -3;
              }
            }
            
            const plantName = parts.slice(0, plantNameEndIndex).join('-');
            
            // Try to parse timestamp
            let timestamp: Date;
            const timestampNum = parseInt(timestampStr);
            if (!isNaN(timestampNum) && timestampNum > 1000000000000) {
              timestamp = new Date(timestampNum);
            } else {
              timestamp = new Date();
            }
            
            images.push({
              id: file,
              plantName: plantName
                .replace(/-/g, ' ')
                .replace(/\b\w/g, l => l.toUpperCase()),
              imageType: imageType || 'full',
              approach: approach,
              model: 'schnell',
              url: `/generated-images/${file}`,
              timestamp: timestamp.toISOString()
            });
          } catch (err) {
            console.error(`Error processing file ${file}:`, err);
          }
        }
      }
      
      res.json({ images: images.sort((a, b) => b.timestamp.localeCompare(a.timestamp)) });
    } catch (error) {
      console.error('Error listing test images:', error);
      res.json({ images: [] }); // Return empty array instead of error
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

  // Get collection limits for current user
  app.get('/api/my-collection/limits', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const limits = await storage.canAddToCollection(userId);
      const user = await storage.getUser(userId);
      res.json({
        ...limits,
        userTier: user?.userTier || 'free'
      });
    } catch (error) {
      console.error("Error fetching collection limits:", error);
      res.status(500).json({ message: "Failed to fetch collection limits" });
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
      const errorMessage = (error as Error).message;
      
      // Check if it's a collection limit error
      if (errorMessage.includes('Collection limit reached')) {
        res.status(403).json({ 
          message: errorMessage,
          code: 'COLLECTION_LIMIT_REACHED'
        });
      } else if (errorMessage.includes('already in collection')) {
        res.status(409).json({ 
          message: errorMessage,
          code: 'DUPLICATE_PLANT'
        });
      } else {
        res.status(400).json({ message: "Failed to add to collection", error: errorMessage });
      }
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
      res.status(400).json({ message: "Failed to create identification session", error: (error as Error).message });
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
      
      let results: any[] = [];
      
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

  // Generate seasonal images from canvas design using Gemini
  app.post('/api/gardens/:id/generate-seasonal-images', isAuthenticated, async (req: any, res) => {
    try {
      if (!geminiAI) {
        return res.status(503).json({ message: "Gemini AI not configured. Please add GEMINI_API_KEY." });
      }

      const garden = await storage.getGarden(req.params.id);
      if (!garden) {
        return res.status(404).json({ message: "Garden not found" });
      }
      
      // Check ownership
      if (garden.userId !== req.user.claims.sub) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const { canvasDesign, season, specificTime, referenceImage, useReferenceMode } = req.body;
      
      // Get current iteration count for this garden
      const visualizationData = await storage.getVisualizationData(req.params.id);
      const iterationNumber = (visualizationData?.iterationCount || 0) + 1;
      
      if (!canvasDesign || !canvasDesign.plants) {
        return res.status(400).json({ message: "Canvas design with plants is required" });
      }

      // Fetch complete botanical data for all plants
      const plantIds = canvasDesign.plants.map((p: any) => p.id).filter(Boolean);
      const fullPlantData = await Promise.all(
        plantIds.map(async (id: string) => {
          const plant = await storage.getPlant(id);
          return plant;
        })
      );
      
      // Create a map for easy lookup
      const plantDataMap: Record<string, any> = {};
      fullPlantData.forEach(plant => {
        if (plant) {
          plantDataMap[plant.id] = plant;
        }
      })

      // Convert canvas positions to hyperprecise grid coordinates (1cm precision)
      // Canvas is 1200x800px representing garden dimensions
      const gardenWidth = garden.dimensions.width;
      const gardenLength = garden.dimensions.length;
      
      // Create hyperprecise plant positioning with centimeter-level grid coordinates and botanical data
      const plantPositions = canvasDesign.plants.map((p: any, index: number) => {
        // Convert percentage to actual garden coordinates with centimeter precision
        const xCentimeters = Math.round(p.x / 100 * gardenWidth * 100);
        const yCentimeters = Math.round(p.y / 100 * gardenLength * 100);
        const xMeters = (xCentimeters / 100).toFixed(2);
        const yMeters = (yCentimeters / 100).toFixed(2);
        
        // Grid reference like a spreadsheet (A1, B2, etc.) for additional precision
        const gridCol = String.fromCharCode(65 + Math.floor(xCentimeters / 10)); // A-Z for 10cm grid columns
        const gridRow = Math.floor(yCentimeters / 10) + 1; // 1-N for 10cm grid rows
        
        // Calculate relationships to other plants for triangulation
        let relationships = [];
        if (index > 0) {
          const prevPlant = canvasDesign.plants[index - 1];
          const distance = Math.sqrt(
            Math.pow((p.x - prevPlant.x) / 100 * gardenWidth, 2) + 
            Math.pow((p.y - prevPlant.y) / 100 * gardenLength, 2)
          ).toFixed(2);
          relationships.push(`${distance}m from Plant ${index}`);
        }
        if (index > 1) {
          const firstPlant = canvasDesign.plants[0];
          const distToFirst = Math.sqrt(
            Math.pow((p.x - firstPlant.x) / 100 * gardenWidth, 2) + 
            Math.pow((p.y - firstPlant.y) / 100 * gardenLength, 2)
          ).toFixed(2);
          relationships.push(`${distToFirst}m from Plant 1`);
        }
        
        // Get full botanical data for this plant
        const botanicalData = plantDataMap[p.id] || {};
        
        // Create detailed botanical description based on season
        const createSeasonalDescription = (plantData: any, targetSeason: string) => {
          const { genus, species, cultivar, foliage, leafColor, flowerColor, 
                  bloomStartMonth, bloomEndMonth, heightMaxCm, spreadMaxCm,
                  type, growthRate } = plantData;
          
          const scientificName = cultivar ? `${genus} ${species} '${cultivar}'` : `${genus} ${species}`;
          const heightM = heightMaxCm ? (heightMaxCm / 100).toFixed(1) : '1.0';
          const spreadM = spreadMaxCm ? (spreadMaxCm / 100).toFixed(1) : '0.5';
          
          let seasonalDesc = '';
          if (targetSeason === 'spring') {
            if (bloomStartMonth && bloomStartMonth <= 5) {
              seasonalDesc = `showing early ${flowerColor?.join('-') || 'white'} blooms`;
            } else {
              seasonalDesc = 'with fresh new growth, bright green emerging foliage';
            }
          } else if (targetSeason === 'summer') {
            if (bloomStartMonth && bloomEndMonth && bloomStartMonth <= 7 && bloomEndMonth >= 7) {
              seasonalDesc = `in peak bloom with ${flowerColor?.join(' and ') || 'colorful'} flowers`;
            } else {
              seasonalDesc = `with lush ${leafColor?.join('-') || 'green'} foliage at full size`;
            }
          } else if (targetSeason === 'autumn') {
            if (foliage === 'deciduous') {
              seasonalDesc = 'with foliage turning golden/red autumn colors';
            } else if (bloomEndMonth && bloomEndMonth >= 9) {
              seasonalDesc = `with late season ${flowerColor?.join('-') || 'autumn'} blooms`;
            } else {
              seasonalDesc = 'with mature foliage and seed heads forming';
            }
          } else if (targetSeason === 'winter') {
            if (foliage === 'evergreen') {
              seasonalDesc = 'maintaining evergreen structure and color';
            } else {
              seasonalDesc = 'dormant with bare architectural stems';
            }
          }
          
          return `[${scientificName}] Height: ${heightM}m, Spread: ${spreadM}m, ${seasonalDesc}`;
        };
        
        const botanicalDesc = botanicalData.id ? 
          createSeasonalDescription(botanicalData, season || 'summer') : 
          '';
        
        return `Plant ${index + 1}: ${p.plantName || p.commonName} (${p.scientificName})
  Grid: ${gridCol}${gridRow} (${xCentimeters}cm from left, ${yCentimeters}cm from front)
  Exact: X=${xMeters}m, Y=${yMeters}m${relationships.length > 0 ? '\n  Spacing: ' + relationships.join(', ') : ''}
  Botanical: ${botanicalDesc}`;
      });
      
      // Count plant types to prevent additions
      const plantCounts: Record<string, number> = {};
      canvasDesign.plants.forEach((plant: any) => {
        const key = (plant.plantName || plant.commonName || '').toLowerCase();
        plantCounts[key] = (plantCounts[key] || 0) + 1;
      });

      // Map season to specific months for more precision
      const monthMapping: { [key: string]: string } = {
        'spring': 'late April',
        'summer': 'mid July', 
        'autumn': 'early October',
        'winter': 'late January'
      };
      const specificMonth = specificTime || monthMapping[season || 'summer'] || 'mid July';

      let prompt: string;
      
      // Check if we're using Perplexity's reference image approach
      if (useReferenceMode && referenceImage) {
        // ENHANCED WITH BOUNDING BOX APPROACH: Use reference image with precise spatial instructions
        prompt = `Using the provided garden image as an EXACT reference, create the ${season} version.
        
BOUNDING BOX PRESERVATION INSTRUCTIONS:
1. First, detect and preserve the bounding boxes of all ${canvasDesign.plants.length} plants in the reference image
2. Each plant must remain at its EXACT pixel coordinates (same bounding box [y_min, x_min, y_max, x_max])
3. Do NOT move any plant - they are locked in place like a time-lapse camera setup

CRITICAL SPATIAL RULES:
- This is image ${season} of a 4-season time-lapse series
- Maintain EXACT bounding boxes for all objects:
  * Garden bed edges: same pixel boundaries
  * Each plant: same x_min, y_min, x_max, y_max coordinates
  * Camera view: identical framing and crop
  * Background elements: same positions

ONLY change these seasonal elements for ${specificMonth}:
${season === 'spring' ? 
  '- Fresh green spring foliage WITHIN existing plant bounding boxes\n- Early spring blooms at SAME positions\n- Bright green grass texture\n- Clear spring sky color' :
season === 'summer' ? 
  '- Lush summer growth WITHIN existing plant bounding boxes\n- Peak flowering at SAME positions\n- Deep green foliage texture\n- Bright summer sky color' :
season === 'autumn' ? 
  '- Autumn leaf colors WITHIN existing plant bounding boxes\n- Late season blooms at SAME positions\n- Golden/brown grass texture\n- Autumn sky tones' :
  '- Winter dormancy WITHIN existing plant bounding boxes\n- Bare branches at SAME positions\n- Evergreen structure unchanged\n- Winter sky and light'}

Think of this as editing ONLY the textures and colors within fixed bounding boxes.
The spatial layout is completely locked - only seasonal appearance changes.
Output: 1920x1080 pixel image (16:9 widescreen aspect ratio).`;
        
      } else {
        // STANDARD APPROACH: Generate from scratch with detailed specifications
        // Calculate precise camera position using geometric reference system
        const gardenDiagonal = Math.sqrt(gardenWidth * gardenWidth + gardenLength * gardenLength);
        const cameraDistance = Math.max(5, gardenDiagonal * 1.3); // Minimum 5m, scales with garden size
        const cameraHeight = 1.6; // Eye level constant
        const focalLength = gardenWidth > 4 ? 24 : 35; // Wide angle for larger gardens
        
        // Create geometric reference system - camera as fixed hub point
        const gardenCenterX = gardenWidth / 2;
        const gardenCenterY = gardenLength / 2;
        
        // Camera position in 3D coordinates (origin at garden front-left corner)
        const cameraX = gardenCenterX; // Centered on width
        const cameraY = -cameraDistance; // Negative Y = in front of garden
        const cameraZ = cameraHeight; // Z = height
        
        // Target/look-at point (center of garden at ground level)
        const targetX = gardenCenterX;
        const targetY = gardenCenterY;
        const targetZ = 0; // Ground level

        // Create 10x10cm grid mapping for precise positioning
        const gridSize = 10; // 10cm grid cells
        
        // Validate garden dimensions
        const validWidth = gardenWidth && gardenWidth > 0 ? gardenWidth : 4; // Default to 4m if invalid
        const validLength = gardenLength && gardenLength > 0 ? gardenLength : 3; // Default to 3m if invalid
        
        const gridWidth = Math.ceil(validWidth * 100 / gridSize);
        const gridLength = Math.ceil(validLength * 100 / gridSize);
        
        // Initialize empty grid
        const grid: string[][] = Array(gridLength).fill(null).map(() => 
          Array(gridWidth).fill('EMPTY')
        );
        
        // Place plants in grid
        canvasDesign.plants.forEach((p: any) => {
          const xCentimeters = Math.round(p.x / 100 * validWidth * 100);
          const yCentimeters = Math.round(p.y / 100 * validLength * 100);
          
          const gridX = Math.floor(xCentimeters / gridSize);
          const gridY = Math.floor(yCentimeters / gridSize);
          
          if (gridX >= 0 && gridX < gridWidth && gridY >= 0 && gridY < gridLength) {
            const plantName = (p.plantName || p.commonName || '').substring(0, 15);
            grid[gridY][gridX] = plantName;
          }
        });
        
        // Create grid specification string - only list occupied cells
        const gridSpec = grid.map((row, y) => 
          row.map((cell, x) => {
            if (cell !== 'EMPTY') {
              return `Grid[${x},${y}]: ${cell}`;
            }
            return null;
          }).filter(Boolean).join(' | ')
        ).filter(row => row.length > 0).join('\n');
        
        // Log what we're sending to debug positioning
        console.log('Grid coordinates being sent to Gemini:');
        console.log(gridSpec);
        console.log(`Total plants: ${canvasDesign.plants.length}`);

        // FORCEFUL GRID-BASED POSITIONING PROMPT
        prompt = `Generate a 1920x1080 pixel image showing a grass lawn.

PLANT POSITIONS (MUST BE SPATIALLY SEPARATED):
${gridSpec}

SPATIAL INTERPRETATION:
- Grid[7,24]: FAR LEFT, NEAR FRONT (bottom-left corner area)
- Grid[17,13]: CENTER-LEFT, MIDDLE DEPTH
- Grid[30,5]: CENTER-RIGHT, FAR BACK (background)
- Grid[34,21]: FAR RIGHT, NEAR FRONT (bottom-right area)

CRITICAL SPACING RULES:
1. Show EXACTLY ${canvasDesign.plants.length} plants total
2. Plants MUST be WIDELY SEPARATED across the lawn
3. NO clustering - each plant in its OWN SEPARATE SPOT
4. Lavender (Grid[7,24]) must be FAR AWAY from Hosta (Grid[34,21])
5. Japanese Maple (Grid[30,5]) must be in BACKGROUND, others in foreground/middle
6. DO NOT group plants together in one bed

VIEWING ANGLE:
Camera positioned at Y=0 (bottom edge) looking toward Y=${gridLength} (top edge).
Y-axis interpretation:
- Y close to 0 = NEAR the camera (foreground)
- Y close to ${gridLength} = FAR from camera (background)
View direction: From SOUTH (bottom) looking NORTH (top)

VERIFICATION:
${Object.entries(plantCounts).map(([plant, count]) => `${plant}: EXACTLY ${count}`).join('\n')}

If 4 objects are listed above, show EXACTLY 4. Not 5. Not 3. Exactly 4.

DOCUMENTATION REQUIREMENTS:
1. EXACT POSITIONING: Each specimen MUST appear at its specified grid coordinate
2. EMPTY SPACES: Unoccupied grid cells MUST remain empty - these are research control areas
3. NO ADDITIONS: Document ONLY the ${canvasDesign.plants.length} specimens listed
4. NO REARRANGEMENT: Asymmetric distributions are scientifically significant data points
5. NO TEXT/LABELS: Pure photographic documentation only, no annotations
6. CLUSTERING: If multiple specimens share nearby grid cells, they must remain clustered

VISUALIZATION METAPHOR - PINS ON A MAP:
Imagine you have a flat map on a table and you're sticking pins at specific coordinates.
- The grid is the map (horizontal, on the table)
- Plants are the pins (vertical, sticking up from the map)
- Each pin goes EXACTLY where the coordinates say
- Some areas have many pins clustered (that's correct!)
- Some areas have no pins (that's correct too!)
- DO NOT rearrange the pins for a "better pattern"

CRITICAL: NO VISIBLE GRID LINES, COORDINATES, OR NUMBERS IN THE IMAGE
The grid is INVISIBLE - it's just how we tell you WHERE to place things

PHOTOGRAPHIC PARAMETERS:
- Viewpoint: Ground-level documentary photograph (eye height ~1.6m)
- Angle: Perpendicular view of research plot
- Distance: ${cameraDistance.toFixed(1)}m from plot
- Frame: Full plot visible with natural perspective
- Style: Scientific accuracy over aesthetic composition
- Background: Simple ${season} sky, no distractions

OUTPUT: High-resolution photographic documentation showing specimens at their exact grid positions.

RESEARCH PLOT VISIBILITY:
- Plot occupies 40% of frame height
- Front edge at 15% from bottom of frame
- Back edge at 55% from bottom of frame
- All edges visible with surrounding grass

SEASONAL DOCUMENTATION NOTE:
This is ${season} documentation (${specificMonth}) showing specimens in their ${season} state.
Maintain scientific accuracy for plant appearance in this season.

BACKGROUND ENVIRONMENT:
- Simple continuous grass lawn extending to horizon
- No structures, paths, or non-specimen vegetation
- Documentary photography style - no artistic elements
- Ground texture: Same mulch/soil appearance (just seasonally appropriate color)

Think of this like photographing the same person's face across seasons - everything stays identical except seasonal changes. The ONLY variations should be:
- Plant foliage colors and bloom states appropriate for ${specificMonth}
- Sky color subtle seasonal variation (but same weather - clear day)
- Grass color seasonal variation (green in summer, slightly brown in winter)

Seasonal appearance for ${specificMonth}:
${season === 'spring' ? 
  'Fresh spring growth with early blooms on any flowering plants that are in the design above. New foliage emerging on the specified plants. Show ONLY the plants listed above in their spring appearance.' :
season === 'summer' ? 
  'Peak summer growth with flowering plants in bloom if they naturally flower in summer. Lush green foliage on all specified plants. Show ONLY the plants listed above in their summer appearance.' :
season === 'autumn' ? 
  'Autumn colors on any deciduous plants in the design. Late season characteristics appropriate for the specified plants. Show ONLY the plants listed above in their autumn appearance.' :
  'Winter structure with dormant perennials and bare branches on deciduous plants. Any evergreens providing winter interest. Show ONLY the plants listed above in their winter appearance.'}

CRITICAL: You must show ONLY the exact plants listed in the positions above. Do NOT add any additional plants like tulips, daffodils, bulbs, or any other plants that are not explicitly listed. The garden must contain exactly ${canvasDesign.plants.length} plants as specified.

Photography style: Professional garden photography captured in natural ${season === 'winter' ? 'soft diffused winter' : season === 'autumn' ? 'warm golden hour' : season === 'spring' ? 'bright morning' : 'clear midday'} light, showing realistic plant sizes and natural garden textures including mulch, soil, and stone edging.`;
      } // Close the else block for standard approach

      // Determine which service to use
      // Use Flux for initial precise image (better plant variety accuracy)
      // Use Gemini for seasonal variations after initial generation
      let imageUrl;
      let generationMethod = 'flux'; // Default to Flux for precision
      
      // Check if this is a seasonal variation request (not the initial generation)
      const isSeasonalVariation = visualizationData?.baseImageUrl && season !== 'summer';
      
      if (isSeasonalVariation && geminiAI) {
        // Use Gemini for seasonal variations
        generationMethod = 'gemini';
        console.log('Using Gemini for seasonal variation');
        
        try {
          // Use the existing prompt that was built above
          const geminiResult = await geminiAI.generateImage(prompt);
          if (geminiResult) {
            imageUrl = geminiResult;
          }
        } catch (error) {
          console.error('Gemini generation failed, falling back to Flux:', error);
          generationMethod = 'flux'; // Fall back to Flux
        }
      }
      
      // Use Flux for initial generation or if Gemini failed
      if (generationMethod === 'flux' || !imageUrl) {
        console.log('Using Flux for precise plant variety generation');
        const { fluxAI } = await import('./fluxAI');
        
        try {
          // Convert canvas design to Flux format
          const fluxRequest = {
            plantPositions: canvasDesign.plants.map((p: any) => {
              // Calculate depth based on Y position
              const yPercent = p.y || 50;
              const depth = yPercent < 33 ? 'background' : 
                           yPercent > 66 ? 'foreground' : 'midground';
              
              return {
                name: p.plantName || p.commonName || 'Unknown Plant',
                gridX: Math.round((p.x || 50)),
                gridY: Math.round((p.y || 50)),
                depth: depth
              };
            }),
            gardenDimensions: {
              width: gardenWidth || 4,
              height: gardenLength || 3
            },
            season: season || 'summer',
            climate: garden.climate
          };
          
          imageUrl = await fluxAI.generateGardenVisualization(fluxRequest);
          generationMethod = 'flux';
        } catch (fluxError) {
          console.error('Flux generation failed, trying Runware as fallback:', fluxError);
          
          // Fallback to Runware if Flux fails
          const { runwareService } = await import('./runwareAI');
          try {
            imageUrl = await runwareService.generateSeasonalImage({
              season,
              specificTime: specificMonth || specificTime,
              canvasDesign: {
                plants: canvasDesign.plants.map((p: any) => ({
                  plant: {
                    id: p.id || 'unknown',
                    name: p.plantName || p.commonName || 'Unknown Plant'
                  },
                  position: {
                    x: p.x || 50,
                    y: p.y || 50
                  }
                }))
              },
              gardenDimensions: {
                width: gardenWidth || 4,
                length: gardenLength || 3
              },
              useReferenceMode,
              referenceImage
            });
            generationMethod = 'runware';
          } catch (runwareError) {
            console.error('All generation methods failed:', runwareError);
            throw runwareError;
          }
        }
      }
      
      // Add cache buster to prevent browser caching
      const imageUrlWithCacheBuster = imageUrl ? `${imageUrl}?t=${Date.now()}` : null;
      
      res.json({
        success: true,
        season: season || 'summer',
        imageUrl: imageUrlWithCacheBuster,
        prompt: generationMethod === 'flux' ? 'Generated using Flux for precise plant variety' : 
                generationMethod === 'gemini' ? 'Generated using Gemini for seasonal variation' :
                'Generated using Runware Stable Diffusion',
        generationMethod,
        message: imageUrl ? `Image generated successfully using ${generationMethod.toUpperCase()}` : 'Image generation in progress'
      });
    } catch (error) {
      console.error("Error generating seasonal images:", error);
      res.status(500).json({ message: "Failed to generate seasonal images", error: (error as Error).message });
    }
  });

  // AI Inpainting comparison endpoint - compare composite vs inpainting approaches
  app.get('/api/test/inpainting-comparison', isAuthenticated, async (req: any, res) => {
    try {
      console.log("🔬 Running inpainting comparison test...");
      
      const comparisonResults = await aiInpaintingService.compareApproaches();
      
      res.json({
        success: true,
        message: "Comparison test completed. Check the generated images.",
        results: comparisonResults,
        description: {
          composite: "Mechanical sprite compositing (yesterday's approach)",
          inpaintSequential: "AI inpainting - adding plants one by one",
          inpaintBatch: "AI inpainting - all plants at once",
          emptyBase: "Empty garden base for reference"
        }
      });
    } catch (error) {
      console.error("Error in inpainting comparison:", error);
      res.status(500).json({ 
        message: "Failed to run comparison", 
        error: (error as Error).message 
      });
    }
  });

  // AI Inpainting for garden visualization
  app.post('/api/gardens/:id/inpaint-visualization', isAuthenticated, async (req: any, res) => {
    try {
      const garden = await storage.getGarden(req.params.id);
      if (!garden) {
        return res.status(404).json({ message: "Garden not found" });
      }
      
      // Check ownership
      if (garden.userId !== req.user.claims.sub) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const { canvasDesign, season = 'summer', approach = 'batch', style = 'photorealistic' } = req.body;
      
      if (!canvasDesign || !canvasDesign.plants) {
        return res.status(400).json({ message: "Canvas design with plants is required" });
      }

      // Create empty garden base
      const baseImage = await aiInpaintingService.createEmptyGardenBase(
        garden.shape,
        garden.dimensions
      );

      // Convert canvas plants to inpainting format
      const inpaintPlants = canvasDesign.plants.map((p: any) => ({
        plantName: p.plantName || p.commonName || 'Unknown Plant',
        x: p.x || 50,
        y: p.y || 50,
        size: p.y < 33 ? 'large' : p.y > 66 ? 'small' : 'medium', // Size based on depth
        season
      }));

      // Perform inpainting
      const inpaintedUrl = await aiInpaintingService.inpaintGarden({
        baseImage,
        plants: inpaintPlants,
        season,
        style,
        approach
      });

      res.json({
        success: true,
        imageUrl: inpaintedUrl,
        message: `Garden visualization created using AI inpainting (${approach} approach)`,
        approach,
        plantCount: inpaintPlants.length
      });
    } catch (error) {
      console.error("Error in garden inpainting:", error);
      res.status(500).json({ 
        message: "Failed to create inpainted visualization", 
        error: (error as Error).message 
      });
    }
  });

  // Test sprite generation endpoint
  app.post('/api/test/generate-sprite', isAuthenticated, async (req: any, res) => {
    try {
      const { plantName, season } = req.body;
      
      if (!plantName) {
        return res.status(400).json({ message: "Plant name is required" });
      }
      
      const { fluxSpriteGenerator } = await import('./fluxSprite');
      
      const spriteUrl = await fluxSpriteGenerator.generatePlantSprite({
        plantName: plantName,
        season: season || 'summer'
      });
      
      res.json({
        success: true,
        spriteUrl,
        plantName,
        season: season || 'summer',
        message: 'Sprite generated successfully'
      });
    } catch (error) {
      console.error("Error generating sprite:", error);
      res.status(500).json({ 
        message: "Failed to generate sprite", 
        error: (error as Error).message 
      });
    }
  });
  
  // Test composite garden endpoint
  app.post('/api/test/composite-garden', isAuthenticated, async (req: any, res) => {
    try {
      const { plants, twoPlants } = req.body;
      const { spriteCompositor } = await import('./spriteCompositor');
      
      let compositeUrl;
      
      if (plants && plants.length > 0) {
        // Use provided plants
        compositeUrl = await spriteCompositor.compositeGarden(plants);
      } else if (twoPlants) {
        // Use two-plant test configuration
        compositeUrl = await spriteCompositor.testTwoPlantComposite();
      } else {
        // Use single plant test configuration
        compositeUrl = await spriteCompositor.testComposite();
      }
      
      res.json({
        success: true,
        compositeUrl,
        message: 'Composite garden created successfully'
      });
    } catch (error) {
      console.error("Error creating composite:", error);
      res.status(500).json({ 
        message: "Failed to create composite", 
        error: (error as Error).message 
      });
    }
  });
  
  // Test Gemini enhancement of composite
  app.post('/api/test/gemini-enhance-composite', isAuthenticated, async (req: any, res) => {
    try {
      const { compositeUrl } = req.body;
      
      if (!compositeUrl) {
        // First create a two-plant composite
        const { spriteCompositor } = await import('./spriteCompositor');
        const templateUrl = await spriteCompositor.testTwoPlantComposite();
        
        // Now enhance with Gemini
        const fs = await import('fs/promises');
        const path = await import('path');
        const templatePath = path.join(process.cwd(), "client", "public", templateUrl);
        const templateBuffer = await fs.readFile(templatePath);
        const templateBase64 = templateBuffer.toString('base64');
        
        if (!geminiAI) {
          return res.status(503).json({ message: "Gemini AI not configured" });
        }
        
        const prompt = `You are a professional garden photographer. 
Transform this template image into a photorealistic garden photograph.

PLANTS IN THIS GARDEN:
1. Japanese Maple (Acer palmatum) - Located in far right background at position (30,5)
   - Should appear as a small ornamental tree with characteristic palmate leaves
   - Red/orange autumn coloring typical of Japanese Maples
2. Hosta (Hosta sieboldiana) - Located in right foreground at position (34,21)  
   - Should show broad, ribbed, blue-green leaves in a clump formation
   - Typical shade-loving perennial appearance

CRITICAL REQUIREMENTS:
1. MAINTAIN EXACT PLANT POSITIONS - The Japanese Maple MUST stay in the far right background, the Hosta MUST stay in the right foreground
2. Keep the same viewing angle and perspective
3. Transform the simple brown background into realistic garden soil with texture
4. Add natural lighting, shadows, and depth
5. Make the plants look photorealistic with proper botanical characteristics
6. Blend the plants naturally into the scene (remove white boxes/backgrounds)
7. The final image should look like a professional garden photograph

DO NOT:
- Move plants to different positions
- Add plants that aren't in the template
- Change the overall composition
- Mix up plant identities (maple must look like a maple, hosta like a hosta)

The goal is photorealistic enhancement while preserving exact spatial positioning and botanical accuracy.`;
        
        const result = await geminiAI.generateImageWithReference(
          prompt,
          templateBase64
        );
        
        const enhancedUrl = result.imageUrl || result.imageData;
        
        res.json({
          success: true,
          templateUrl,
          enhancedUrl,
          message: 'Composite enhanced with Gemini'
        });
      } else {
        // Use provided composite URL
        return res.status(400).json({ message: "Direct composite URL enhancement not yet implemented" });
      }
    } catch (error) {
      console.error("Error enhancing composite:", error);
      res.status(500).json({ 
        message: "Failed to enhance composite", 
        error: (error as Error).message 
      });
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
      let location = req.params.location;
      
      // Improve location formatting for better geocoding
      // Handle common formats like "Dunlap United States 61525" -> "Dunlap, IL 61525"
      if (location.includes('61525')) {
        // 61525 is in Illinois
        location = location.replace(/United States/gi, 'IL').replace(/USA/gi, 'IL');
        // Format as "City, State Zip"
        const parts = location.split(/\s+/);
        if (parts.length >= 2) {
          const city = parts[0];
          const zip = parts.find(p => /^\d{5}$/.test(p));
          if (city && zip) {
            location = `${city}, IL ${zip}`;
          }
        }
      }
      
      let climateData = await storage.getClimateData(location);
      
      if (!climateData || isClimateDataStale(climateData.lastUpdated)) {
        // Get coordinates if we have Mapbox
        let coordinates = null;
        if (mapboxAPI) {
          console.log(`Geocoding location with Mapbox: ${location}`);
          coordinates = await mapboxAPI.geocode(location);
          if (coordinates) {
            console.log(`Mapbox returned coordinates: ${coordinates.latitude}, ${coordinates.longitude}`);
          } else {
            console.log(`Mapbox could not geocode location: ${location}`);
          }
        } else {
          console.log("Mapbox API not configured");
        }
        
        // Fetch fresh data from Visual Crossing API
        if (process.env.VISUAL_CROSSING_API_KEY) {
          const freshData = await fetchClimateData(location, coordinates);
          if (freshData) {
            // Map ALL the API fields to database fields to preserve enhanced metrics
            const dbData = {
              hardiness_zone: `${freshData.usda_zone} / ${freshData.rhs_zone}`,
              usda_zone: freshData.usda_zone,
              rhs_zone: freshData.rhs_zone,
              ahs_heat_zone: freshData.ahs_heat_zone,
              koppen_climate: freshData.koppen_climate,
              hardiness_category: freshData.hardiness_category,
              temperature_range: freshData.temperature_range,
              annual_rainfall: freshData.annual_rainfall,
              avg_temp_min: freshData.avg_temp_min,
              avg_temp_max: freshData.avg_temp_max,
              avg_humidity: freshData.avg_humidity,
              avg_wind_speed: freshData.avg_wind_speed,
              sunshine_percent: freshData.sunshine_percent,
              sunshine_hours: freshData.sunshine_hours,
              wettest_month: freshData.wettest_month,
              wettest_month_precip: freshData.wettest_month_precip,
              driest_month: freshData.driest_month,
              driest_month_precip: freshData.driest_month_precip,
              monthly_precip_pattern: freshData.monthly_precip_pattern,
              frost_dates: freshData.frost_dates,
              growing_season: freshData.growing_season,
              monthly_data: freshData.monthly_data,
              gardening_advice: freshData.gardening_advice,
              data_source: freshData.data_source,
              data_range: freshData.data_range
            };
            
            if (climateData) {
              climateData = await storage.updateClimateData(location, dbData);
            } else {
              climateData = await storage.createClimateData({ location, ...dbData });
            }
          }
        }
      }
      
      if (!climateData) {
        return res.status(404).json({ message: "Climate data not found" });
      }
      
      // Parse the combined hardiness_zone field back into separate fields for the frontend
      let usda_zone = '';
      let rhs_zone = '';
      if (climateData.hardiness_zone) {
        const parts = climateData.hardiness_zone.split(' / ');
        usda_zone = parts[0] || '';
        rhs_zone = parts[1] || '';
      }
      
      // Determine hardiness category from USDA zone
      let hardiness_category = 'Half Hardy';
      if (usda_zone) {
        const zoneNum = parseInt(usda_zone.match(/\d+/)?.[0] || '9');
        if (zoneNum <= 5) hardiness_category = 'Very Hardy';
        else if (zoneNum <= 7) hardiness_category = 'Hardy';
        else if (zoneNum <= 9) hardiness_category = 'Half Hardy';
        else if (zoneNum >= 11) hardiness_category = 'Tender';
      }
      
      // Format location as "City, Zip, Country" if needed
      let formattedLocation = climateData.location || location;
      const locationParts = formattedLocation.split(/\s+/);
      const formattedParts = [];
      
      // Extract city (first word that's not a country)
      if (locationParts.length > 0 && !['United', 'States', 'Kingdom'].includes(locationParts[0])) {
        formattedParts.push(locationParts[0]);
      }
      
      // Extract zip code if present
      const zipMatch = formattedLocation.match(/\b\d{5}(?:-\d{4})?\b/);
      if (zipMatch) formattedParts.push(zipMatch[0]);
      
      // Extract country (look for common country names)
      if (formattedLocation.includes('United States') || formattedLocation.includes('USA')) {
        formattedParts.push('United States');
      } else if (formattedLocation.includes('United Kingdom') || formattedLocation.includes('UK')) {
        formattedParts.push('United Kingdom');
      } else if (formattedLocation.includes('Canada')) {
        formattedParts.push('Canada');
      } else if (locationParts.length > 1) {
        // Use last word as country if no zip code
        if (!zipMatch && locationParts.length > 1) {
          formattedParts.push(locationParts[locationParts.length - 1]);
        }
      }
      
      const finalLocation = formattedParts.length > 0 ? formattedParts.join(', ') : formattedLocation;
      
      // Send response with both database fields and expected frontend fields
      res.json({
        ...climateData,
        location: finalLocation,
        usda_zone,
        rhs_zone,
        hardiness_category,
        temperature_range: `${Number(climateData.avg_temp_min).toFixed(1)}°C to ${Number(climateData.avg_temp_max).toFixed(1)}°C`
      });
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

  // Test Runware connectivity directly
  app.get('/api/admin/test-runware', isAuthenticated, async (req: any, res) => {
    try {
      // Check if user is admin
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || !user.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const apiKey = process.env.RUNWARE_API_KEY;
      console.log('Testing Runware with key:', apiKey ? `${apiKey.slice(0, 8)}...` : 'No key');
      
      // Test 1: Try with just Authorization header (no authentication task)
      const test1 = await fetch('https://api.runware.ai/v1', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify([
          {
            taskType: 'imageInference',
            taskUUID: 'test-' + Date.now(),
            positivePrompt: 'test',
            width: 512,
            height: 512,
            model: 'runware:100@1',
            numberResults: 1
          }
        ])
      });
      
      const test1Response = await test1.text();
      console.log('Test 1 (Auth header only) status:', test1.status);
      console.log('Test 1 response:', test1Response);
      
      // Test 2: Try with authentication in the request body (no header)
      const test2 = await fetch('https://api.runware.ai/v1', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify([
          {
            taskType: 'authentication',
            apiKey: apiKey
          }
        ])
      });
      
      const test2Response = await test2.text();
      console.log('Test 2 (Auth in body) status:', test2.status);
      console.log('Test 2 response:', test2Response);

      res.json({
        test1: {
          status: test1.status,
          response: JSON.parse(test1Response || '{}')
        },
        test2: {
          status: test2.status,
          response: JSON.parse(test2Response || '{}')
        },
        keyExists: !!apiKey,
        keyPrefix: apiKey ? apiKey.slice(0, 8) : null
      });
    } catch (error) {
      console.error("Error testing Runware:", error);
      res.status(500).json({ 
        message: "Failed to test Runware", 
        error: (error as Error).message,
        keyExists: !!process.env.RUNWARE_API_KEY
      });
    }
  });

  // API Key Management Routes
  app.get('/api/admin/api-keys/status', isAuthenticated, async (req: any, res) => {
    try {
      // Check if user is admin
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || !user.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const keyStatus = [
        {
          service: 'anthropic',
          configured: !!process.env.ANTHROPIC_API_KEY,
          status: process.env.ANTHROPIC_API_KEY ? 'active' : 'untested',
        },
        {
          service: 'stripe',
          configured: !!process.env.STRIPE_SECRET_KEY && !!process.env.VITE_STRIPE_PUBLIC_KEY,
          status: (process.env.STRIPE_SECRET_KEY && process.env.VITE_STRIPE_PUBLIC_KEY) ? 'active' : 'untested',
        },
        {
          service: 'mapbox',
          configured: !!process.env.MAPBOX_API_KEY,
          status: process.env.MAPBOX_API_KEY ? 'active' : 'untested',
        },
        {
          service: 'perenual',
          configured: !!process.env.PERENUAL_API_KEY,
          status: process.env.PERENUAL_API_KEY ? 'active' : 'untested',
        },
        {
          service: 'visual_crossing',
          configured: !!process.env.VISUAL_CROSSING_API_KEY,
          status: process.env.VISUAL_CROSSING_API_KEY ? 'active' : 'untested',
        },
        {
          service: 'huggingface',
          configured: !!process.env.HUGGINGFACE_API_KEY,
          status: process.env.HUGGINGFACE_API_KEY ? 'active' : 'untested',
        },
        {
          service: 'runware',
          configured: !!process.env.RUNWARE_API_KEY,
          status: process.env.RUNWARE_API_KEY ? 'active' : 'untested',
        },
        {
          service: 'perplexity',
          configured: !!process.env.PERPLEXITY_API_KEY,
          status: process.env.PERPLEXITY_API_KEY ? 'active' : 'untested',
        },
        {
          service: 'gemini',
          configured: !!process.env.GEMINI_API_KEY,
          status: process.env.GEMINI_API_KEY ? 'active' : 'untested',
        },
        {
          service: 'gbif',
          configured: !!(process.env.GBIF_EMAIL && process.env.GBIF_PASSWORD),
          status: (process.env.GBIF_EMAIL && process.env.GBIF_PASSWORD) ? 'active' : 'untested',
        },
        {
          service: 'firecrawl',
          configured: !!process.env.FIRECRAWL_API_KEY,
          status: process.env.FIRECRAWL_API_KEY ? 'active' : 'untested',
        },
      ];

      res.json(keyStatus);
    } catch (error) {
      console.error("Error fetching API key status:", error);
      res.status(500).json({ message: "Failed to fetch API key status" });
    }
  });

  app.post('/api/admin/api-keys/test/:service', isAuthenticated, async (req: any, res) => {
    try {
      // Check if user is admin
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || !user.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { service } = req.params;
      
      // Run a simple test for the specific service
      const serviceTests = apiMonitoring.services.find(s => s.name === service);
      if (!serviceTests) {
        return res.status(404).json({ message: "Service not found" });
      }

      try {
        const result = await serviceTests.testFunction();
        res.json({ 
          valid: result.status === 'healthy', 
          status: result.status,
          message: result.errorMessage || 'Key is valid' 
        });
      } catch (error) {
        res.json({ 
          valid: false, 
          status: 'invalid',
          message: (error as Error).message 
        });
      }
    } catch (error) {
      console.error(`Error testing API key for ${req.params.service}:`, error);
      res.status(500).json({ message: "Failed to test API key" });
    }
  });

  // Set user as admin - secured endpoint for bootstrap only
  app.post('/api/admin/make-admin', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Check if user is already admin
      if (user.isAdmin) {
        return res.json({ message: "User is already an admin" });
      }

      // Get all users to check if any admin exists
      const allUsers = await storage.getAllUsers();
      const adminCount = allUsers.filter(u => u.isAdmin).length;
      
      // Option 1: Allow first user to become admin (bootstrap scenario)
      if (adminCount === 0 && allUsers.length === 1) {
        await storage.updateUser(userId, { isAdmin: true });
        console.log(`First user ${userId} granted admin privileges (bootstrap)`);
        return res.json({ message: "Admin privileges granted (first user)" });
      }
      
      // Option 2: Allow admin creation only with special environment variable
      if (process.env.ALLOW_ADMIN_CREATION === 'true') {
        await storage.updateUser(userId, { isAdmin: true });
        console.log(`User ${userId} granted admin privileges via environment variable`);
        return res.json({ message: "Admin privileges granted" });
      }
      
      // Otherwise, deny access
      console.warn(`Unauthorized attempt to become admin by user ${userId}`);
      return res.status(403).json({ 
        message: "Access denied. Admin creation is not allowed." 
      });
    } catch (error) {
      console.error("Error setting admin:", error);
      res.status(500).json({ message: "Failed to set admin" });
    }
  });

  // Create test garden for quick testing
  app.post('/api/admin/create-test-garden', isAuthenticated, async (req: any, res) => {
    try {
      // Check if user is admin
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || !user.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const userId = req.user.claims.sub;
      
      // Count existing test gardens to generate a simple incremental name
      const existingGardens = await storage.getUserGardens(userId);
      const testGardenCount = existingGardens.filter((g: any) => g.name.startsWith('Test Garden')).length;
      
      // Create a test garden with all required fields
      const testGarden = {
        userId,
        name: `Test Garden ${testGardenCount + 1}`,
        location: 'London, UK',
        shape: 'rectangle',
        dimensions: JSON.stringify({ width: 10, length: 15 }),
        units: 'metric',
        hardiness_zone: '8b',
        toxicity_category: 'low',
        toxicity_priorities: JSON.stringify({
          childSafe: true,
          petSafe: true,
          edibleOnly: false,
          medicinalOk: true
        }),
        safety_preferences: JSON.stringify({
          avoidToxicPlants: true,
          prioritizePetSafe: true,
          includeChildFriendly: true
        }),
        garden_style: 'cottage',
        plant_availability_preference: 'easy_to_find',
        status: 'design',
        ai_generated: false,
        layout_data: null,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const garden = await storage.createGarden(testGarden);
      
      res.json({
        id: garden.id,
        name: garden.name,
        message: "Test garden created successfully!"
      });
    } catch (error) {
      console.error("Error creating test garden:", error);
      res.status(500).json({ message: "Failed to create test garden" });
    }
  });

  // Combined validation with Perenual first, then Perplexity for gaps
  app.post('/api/admin/validate-plants-combined', isAuthenticated, async (req: any, res) => {
    try {
      // Check if user is admin
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || !user.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { plants, options } = req.body;
      if (!plants || plants.length === 0) {
        return res.status(400).json({ message: "No plants to validate" });
      }

      console.log(`Starting combined validation for ${plants.length} plants...`);
      const validatedPlants = [];
      
      // Initialize statistics tracking
      const stats = {
        totalPlants: plants.length,
        perenualFound: 0,
        perenualNotFound: 0,
        perplexityEnriched: 0,
        fieldCompleteness: {
          beforeValidation: {} as Record<string, number>,
          afterPerenual: {} as Record<string, number>,
          afterPerplexity: {} as Record<string, number>
        },
        missingFieldsFrequency: {} as Record<string, number>,
        dataQualityScores: [] as number[],
        cultivarStats: {
          total: 0,
          foundInPerenual: 0,
          enrichedByPerplexity: 0
        }
      };
      
      // Track which fields we care about for completeness
      const trackedFields = [
        'scientific_name', 'common_name', 'family', 'genus', 'species',
        'heightMinCm', 'heightMaxCm', 'spreadMinCm', 'spreadMaxCm',
        'sunlight', 'watering', 'soil', 'soilPH', 'hardiness',
        'flowerColor', 'leafColor', 'floweringSeason',
        'droughtTolerant', 'careLevel', 'maintenance',
        'poisonousToHumans', 'poisonousToPets'
      ];
      
      // Calculate initial field completeness
      plants.forEach(plant => {
        trackedFields.forEach(field => {
          if (!stats.fieldCompleteness.beforeValidation[field]) {
            stats.fieldCompleteness.beforeValidation[field] = 0;
          }
          if (plant[field] && (Array.isArray(plant[field]) ? plant[field].length > 0 : true)) {
            stats.fieldCompleteness.beforeValidation[field]++;
          }
        });
        
        // Check if it's a cultivar (has quotes in scientific name or has cultivar field)
        if (plant.scientific_name?.includes("'") || plant.cultivar) {
          stats.cultivarStats.total++;
        }
      });
      
      // Initialize plant import service for Perenual
      const plantImportService = new PlantImportService();
      
      // Process each plant
      for (let i = 0; i < plants.length; i++) {
        let plant = { ...plants[i] };
        const isCultivar = plant.scientific_name?.includes("'") || plant.cultivar;
        
        // Step 1: Search Perenual if enabled
        if (options?.perenual && perenualAPI) {
          try {
            console.log(`Searching Perenual for: ${plant.scientific_name || plant.common_name}`);
            
            // Search by scientific name first, then common name
            const searchTerm = plant.scientific_name || plant.common_name;
            const perenualResults = await plantImportService.searchPerenualByName(searchTerm);
            
            if (perenualResults && perenualResults.length > 0) {
              // Find best match (exact match preferred)
              const exactMatch = perenualResults.find((p: any) => 
                p.scientific_name?.toLowerCase() === plant.scientific_name?.toLowerCase()
              );
              const bestMatch = exactMatch || perenualResults[0];
              
              // Get detailed plant info if we have a Perenual ID
              if (bestMatch.external_id) {
                const detailedInfo = await plantImportService.getPerenualDetails(
                  bestMatch.external_id.replace('perenual-', '')
                );
                
                if (detailedInfo) {
                  // Merge Perenual data with scraped data
                  plant = {
                    ...plant,
                    // Taxonomy
                    family: detailedInfo.family || plant.family,
                    genus: detailedInfo.genus || plant.genus,
                    species: detailedInfo.species || plant.species,
                    
                    // Growing conditions
                    sunlight: detailedInfo.sunlight || plant.sunlight,
                    watering: detailedInfo.watering || plant.watering,
                    soil: detailedInfo.soil || plant.soil,
                    hardiness: detailedInfo.hardiness || plant.hardiness,
                    growthRate: detailedInfo.growth_rate || plant.growthRate,
                    
                    // Characteristics
                    droughtTolerant: detailedInfo.drought_tolerant ?? plant.droughtTolerant,
                    saltTolerant: detailedInfo.salt_tolerant ?? plant.saltTolerant,
                    thorny: detailedInfo.thorny ?? plant.thorny,
                    invasive: detailedInfo.invasive ?? plant.invasive,
                    indoor: detailedInfo.indoor ?? plant.indoor,
                    
                    // Appearance
                    flowerColor: detailedInfo.flower_color || plant.flowerColor,
                    leafColor: detailedInfo.leaf_color || plant.leafColor,
                    floweringSeason: detailedInfo.flowering_season || plant.floweringSeason,
                    
                    // Safety
                    poisonousToHumans: detailedInfo.poisonous_to_humans ?? plant.poisonousToHumans,
                    poisonousToPets: detailedInfo.poisonous_to_pets ?? plant.poisonousToPets,
                    edibleFruit: detailedInfo.edible_fruit ?? plant.edibleFruit,
                    edibleLeaf: detailedInfo.edible_leaf ?? plant.edibleLeaf,
                    medicinal: detailedInfo.medicinal ?? plant.medicinal,
                    
                    // Care
                    careLevel: detailedInfo.care_level || plant.careLevel,
                    maintenance: detailedInfo.maintenance || plant.maintenance,
                    
                    // Add source tracking
                    sources: {
                      ...plant.sources,
                      perenual: true
                    }
                  };
                  
                  console.log(`Enriched ${plant.common_name} with Perenual data`);
                  stats.perenualFound++;
                  if (isCultivar) {
                    stats.cultivarStats.foundInPerenual++;
                  }
                }
              }
            } else {
              stats.perenualNotFound++;
            }
          } catch (error) {
            console.error(`Perenual search failed for ${plant.common_name}:`, error);
            stats.perenualNotFound++;
          }
        }
        
        // Track field completeness after Perenual
        if (options?.perenual) {
          trackedFields.forEach(field => {
            if (!stats.fieldCompleteness.afterPerenual[field]) {
              stats.fieldCompleteness.afterPerenual[field] = 0;
            }
            if (plant[field] && (Array.isArray(plant[field]) ? plant[field].length > 0 : true)) {
              stats.fieldCompleteness.afterPerenual[field]++;
            }
          });
        }
        
        // Step 2: Fill remaining gaps with Perplexity if enabled
        if (options?.perplexity && perplexityAI) {
          // Check for missing essential fields
          const missingFields = [];
          if (!plant.heightMinCm && !plant.heightMaxCm) missingFields.push('height range');
          if (!plant.spreadMinCm && !plant.spreadMaxCm) missingFields.push('spread/width');
          if (!plant.sunlight || plant.sunlight.length === 0) missingFields.push('sunlight requirements');
          if (!plant.watering) missingFields.push('watering needs');
          if (!plant.hardiness) missingFields.push('hardiness zones');
          if (!plant.soil || plant.soil.length === 0) missingFields.push('soil type preferences');
          if (!plant.soilPH) missingFields.push('soil pH requirements');
          if (!plant.flowerColor || plant.flowerColor.length === 0) missingFields.push('flower colors');
          if (!plant.leafColor || plant.leafColor.length === 0) missingFields.push('foliage colors');
          if (!plant.toxicityCategory) missingFields.push('toxicity to humans and pets');
          
          if (missingFields.length > 0) {
            try {
              const query = `For the plant ${plant.scientific_name || plant.common_name}, provide the following missing information in a concise format:
                ${missingFields.join(', ')}
                
                Format the response as JSON with these fields (use metric units for dimensions):
                - heightMinCm: minimum height in centimeters
                - heightMaxCm: maximum height in centimeters
                - spreadMinCm: minimum spread in centimeters  
                - spreadMaxCm: maximum spread in centimeters
                - sunlight: array of light requirements (e.g., ["full sun", "partial shade"])
                - watering: "minimum", "average", or "frequent"
                - hardiness: USDA hardiness zones (e.g., "5-9")
                - soil: array of soil types (e.g., ["well-drained", "sandy", "loamy"])
                - soilPH: pH range (e.g., "6.0-7.5" or "acidic", "neutral", "alkaline")
                - flowerColor: array of flower colors (e.g., ["purple", "pink", "white"])
                - leafColor: array of foliage colors (e.g., ["green", "variegated", "silver"])
                - toxicityCategory: "low", "moderate", or "high"
                - childSafe: boolean
                - petSafe: boolean`;
              
              const response = await perplexityAI.query(query);
              
              if (response && response.choices && response.choices[0]) {
                const content = response.choices[0].message.content;
                
                // Try to parse JSON from response
                try {
                  const jsonMatch = content.match(/\{[\s\S]*\}/);
                  if (jsonMatch) {
                    const enrichmentData = JSON.parse(jsonMatch[0]);
                    
                    // Only merge fields that were missing
                    Object.keys(enrichmentData).forEach(key => {
                      if (!plant[key] || (Array.isArray(plant[key]) && plant[key].length === 0)) {
                        plant[key] = enrichmentData[key];
                      }
                    });
                    
                    plant.sources = {
                      ...plant.sources,
                      perplexity: true
                    };
                    
                    console.log(`Filled gaps for ${plant.common_name} with Perplexity`);
                    stats.perplexityEnriched++;
                    if (isCultivar) {
                      stats.cultivarStats.enrichedByPerplexity++;
                    }
                  }
                } catch (parseError) {
                  console.error('Failed to parse Perplexity response');
                }
              }
            } catch (error) {
              console.error(`Perplexity validation failed for ${plant.common_name}:`, error);
            }
            
            // Track which fields are still missing
            missingFields.forEach(field => {
              if (!stats.missingFieldsFrequency[field]) {
                stats.missingFieldsFrequency[field] = 0;
              }
              stats.missingFieldsFrequency[field]++;
            });
          }
        }
        
        // Calculate data quality score for this plant (percentage of tracked fields filled)
        let filledFields = 0;
        trackedFields.forEach(field => {
          if (plant[field] && (Array.isArray(plant[field]) ? plant[field].length > 0 : true)) {
            filledFields++;
          }
        });
        const qualityScore = (filledFields / trackedFields.length) * 100;
        stats.dataQualityScores.push(qualityScore);
        
        validatedPlants.push(plant);
      }
      
      // Calculate final field completeness after all validation
      trackedFields.forEach(field => {
        if (!stats.fieldCompleteness.afterPerplexity[field]) {
          stats.fieldCompleteness.afterPerplexity[field] = 0;
        }
        validatedPlants.forEach(plant => {
          if (plant[field] && (Array.isArray(plant[field]) ? plant[field].length > 0 : true)) {
            stats.fieldCompleteness.afterPerplexity[field]++;
          }
        });
      });
      
      // Calculate summary statistics
      const avgQualityScore = stats.dataQualityScores.length > 0 
        ? stats.dataQualityScores.reduce((a, b) => a + b, 0) / stats.dataQualityScores.length 
        : 0;
      
      const minQualityScore = stats.dataQualityScores.length > 0 
        ? Math.min(...stats.dataQualityScores) 
        : 0;
        
      const maxQualityScore = stats.dataQualityScores.length > 0 
        ? Math.max(...stats.dataQualityScores) 
        : 0;
      
      // Create field completeness percentages
      const fieldCompletionRates = {} as Record<string, { before: number, afterPerenual: number, afterPerplexity: number }>;
      trackedFields.forEach(field => {
        fieldCompletionRates[field] = {
          before: Math.round((stats.fieldCompleteness.beforeValidation[field] || 0) / plants.length * 100),
          afterPerenual: Math.round((stats.fieldCompleteness.afterPerenual[field] || 0) / plants.length * 100),
          afterPerplexity: Math.round((stats.fieldCompleteness.afterPerplexity[field] || 0) / plants.length * 100)
        };
      });
      
      // Sort missing fields by frequency
      const sortedMissingFields = Object.entries(stats.missingFieldsFrequency)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10) // Top 10 most commonly missing fields
        .map(([field, count]) => ({ 
          field, 
          count, 
          percentage: Math.round(count / plants.length * 100) 
        }));
      
      res.json({ 
        success: true, 
        plants: validatedPlants,
        summary: {
          totalPlants: stats.totalPlants,
          sources: {
            perenual: {
              found: stats.perenualFound,
              notFound: stats.perenualNotFound,
              successRate: Math.round(stats.perenualFound / stats.totalPlants * 100)
            },
            perplexity: {
              enriched: stats.perplexityEnriched,
              enrichmentRate: Math.round(stats.perplexityEnriched / stats.totalPlants * 100)
            }
          },
          cultivars: {
            total: stats.cultivarStats.total,
            foundInPerenual: stats.cultivarStats.foundInPerenual,
            perenualRate: stats.cultivarStats.total > 0 
              ? Math.round(stats.cultivarStats.foundInPerenual / stats.cultivarStats.total * 100) 
              : 0,
            enrichedByPerplexity: stats.cultivarStats.enrichedByPerplexity,
            perplexityRate: stats.cultivarStats.total > 0 
              ? Math.round(stats.cultivarStats.enrichedByPerplexity / stats.cultivarStats.total * 100) 
              : 0
          },
          dataQuality: {
            averageScore: Math.round(avgQualityScore),
            minScore: Math.round(minQualityScore),
            maxScore: Math.round(maxQualityScore),
            excellentPlants: stats.dataQualityScores.filter(s => s >= 80).length,
            goodPlants: stats.dataQualityScores.filter(s => s >= 60 && s < 80).length,
            fairPlants: stats.dataQualityScores.filter(s => s >= 40 && s < 60).length,
            poorPlants: stats.dataQualityScores.filter(s => s < 40).length
          },
          fieldCompletionRates,
          mostMissingFields: sortedMissingFields
        }
      });
    } catch (error) {
      console.error("Error in combined validation:", error);
      res.status(500).json({ message: "Failed to validate plants" });
    }
  });

  // Validate plants with Perplexity AI to fill missing data
  app.post('/api/admin/validate-plants-perplexity', isAuthenticated, async (req: any, res) => {
    try {
      // Check if user is admin
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || !user.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      if (!perplexityAI) {
        return res.status(503).json({ message: "Perplexity API not configured" });
      }

      const { plants } = req.body;
      if (!plants || plants.length === 0) {
        return res.status(400).json({ message: "No plants to validate" });
      }

      console.log(`Validating ${plants.length} plants with Perplexity AI...`);
      
      // Process plants in batches to avoid overwhelming the API
      const batchSize = 5;
      const validatedPlants = [];
      
      for (let i = 0; i < plants.length; i += batchSize) {
        const batch = plants.slice(i, i + batchSize);
        
        // Process each plant in the batch
        const batchPromises = batch.map(async (plant: any) => {
          try {
            // Only query for missing essential data
            const missingFields = [];
            if (!plant.heightMinCm) missingFields.push('height range');
            if (!plant.spreadMinCm) missingFields.push('spread/width');
            if (!plant.sunlight || plant.sunlight.length === 0) missingFields.push('sunlight requirements');
            if (!plant.watering) missingFields.push('watering needs');
            if (!plant.hardiness) missingFields.push('hardiness zones');
            if (!plant.soil || plant.soil.length === 0) missingFields.push('soil type preferences');
            if (!plant.soilPH) missingFields.push('soil pH requirements');
            if (!plant.flowerColor || plant.flowerColor.length === 0) missingFields.push('flower colors');
            if (!plant.leafColor || plant.leafColor.length === 0) missingFields.push('foliage colors');
            if (!plant.toxicityCategory) missingFields.push('toxicity to humans and pets');
            
            if (missingFields.length === 0) {
              // No missing fields, return as-is
              return plant;
            }
            
            const query = `For the plant ${plant.scientific_name || plant.common_name}, provide the following missing information in a concise format:
              ${missingFields.join(', ')}
              
              Format the response as JSON with these fields (use metric units for dimensions):
              - heightMinCm: minimum height in centimeters
              - heightMaxCm: maximum height in centimeters
              - spreadMinCm: minimum spread in centimeters
              - spreadMaxCm: maximum spread in centimeters
              - sunlight: array of light requirements (e.g., ["full sun", "partial shade"])
              - watering: "minimum", "average", or "frequent"
              - hardiness: USDA hardiness zones (e.g., "5-9")
              - soil: array of soil types (e.g., ["well-drained", "sandy", "loamy"])
              - soilPH: pH range (e.g., "6.0-7.5" or "acidic", "neutral", "alkaline")
              - flowerColor: array of flower colors (e.g., ["purple", "pink", "white"])
              - leafColor: array of foliage colors (e.g., ["green", "variegated", "silver"])
              - toxicityCategory: "low", "moderate", or "high"
              - childSafe: boolean
              - petSafe: boolean`;
            
            const response = await perplexityAI.query(query);
            
            if (response && response.choices && response.choices[0]) {
              const content = response.choices[0].message.content;
              
              // Try to parse JSON from response
              try {
                const jsonMatch = content.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                  const enrichmentData = JSON.parse(jsonMatch[0]);
                  
                  // Merge enrichment data with existing plant data
                  return {
                    ...plant,
                    ...enrichmentData,
                    sources: {
                      ...plant.sources,
                      perplexity: true
                    }
                  };
                }
              } catch (parseError) {
                console.error('Failed to parse Perplexity response for plant:', plant.common_name);
              }
            }
            
            return plant;
          } catch (error) {
            console.error(`Error validating plant ${plant.common_name}:`, error);
            return plant;
          }
        });
        
        const batchResults = await Promise.all(batchPromises);
        validatedPlants.push(...batchResults);
      }
      
      res.json({ 
        success: true, 
        plants: validatedPlants,
        validated: validatedPlants.filter(p => p.sources?.perplexity).length
      });
    } catch (error) {
      console.error("Error validating plants with Perplexity:", error);
      res.status(500).json({ message: "Failed to validate plants" });
    }
  });

  // FireCrawl Plant Data Scraping Endpoint
  app.post('/api/admin/scrape-plant-data', isAuthenticated, async (req: any, res) => {
    try {
      // Check if user is admin
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || !user.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      // Check if FireCrawl is configured
      if (!fireCrawlAPI) {
        return res.status(503).json({ message: "FireCrawl API not configured. Please add FIRECRAWL_API_KEY to environment variables." });
      }

      const { url, saveToDatabase = true, force = false } = req.body; // Default to saving to database
      
      if (!url) {
        return res.status(400).json({ message: "URL is required" });
      }

      console.log('Starting plant data scraping for URL:', url);
      console.log('Save to database:', saveToDatabase);
      console.log('Force re-scrape:', force);

      // Scrape the website with incremental saving
      const scrapingResult = await fireCrawlAPI.scrapePlantData(url, saveToDatabase, force);
      
      if (saveToDatabase) {
        // When saving to database, return progress stats
        res.json({
          success: true,
          message: "Scraping completed and plants saved to database",
          stats: {
            totalPlantsFound: scrapingResult.metadata.totalPlantsFound,
            savedToDatabase: scrapingResult.metadata.saved,
            duplicates: scrapingResult.metadata.duplicates,
            errors: scrapingResult.metadata.errors
          },
          metadata: scrapingResult.metadata
        });
      } else {
        // Legacy mode: return plants for frontend processing
        console.log(`Scraped ${scrapingResult.plants?.length || 0} plants from ${url}`);
        
        // Format plants for compatibility with import wizard
        const formattedPlants = scrapingResult.plants.map((plant: any) => ({
          ...plant,
          // Ensure required fields
          scientific_name: plant.scientific_name || plant.common_name || 'Unknown',
          common_name: plant.common_name || '',
          // Add source tracking
          sources: { firecrawl: true },
          // Add import metadata
          import_source: 'firecrawl',
          import_url: url,
          import_date: new Date().toISOString()
        }));

        res.json({
          success: true,
          plants: formattedPlants,
          metadata: scrapingResult.metadata
        });
      }
    } catch (error) {
      console.error("Error scraping plant data:", error);
      res.status(500).json({ 
        message: "Failed to scrape plant data", 
        error: (error as Error).message 
      });
    }
  });
  
  // Get scraping progress endpoint (database)
  app.get('/api/admin/scraping-progress', isAuthenticated, async (req: any, res) => {
    try {
      // Check if user is admin
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || !user.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { url } = req.query;
      
      if (!url) {
        return res.status(400).json({ message: "URL is required" });
      }

      const progress = await storage.getScrapingProgress(url as string);
      
      if (!progress) {
        return res.status(404).json({ message: "No scraping progress found for this URL" });
      }

      res.json(progress);
    } catch (error) {
      console.error("Error getting scraping progress:", error);
      res.status(500).json({ 
        message: "Failed to get scraping progress", 
        error: (error as Error).message 
      });
    }
  });
  
  // Get real-time scraping progress endpoint
  app.get('/api/admin/scraping-progress-realtime', isAuthenticated, async (req: any, res) => {
    try {
      // Check if user is admin
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || !user.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      // Get real-time progress from FireCrawlAPI
      const progress = FireCrawlAPI.getProgress();
      
      // Disable caching to ensure real-time updates
      res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'ETag': `"${Date.now()}-${progress.lastUpdateTime?.getTime() || 0}"`
      });
      
      res.json({
        isActive: progress.isActive,
        total: progress.totalUrls,
        scraped: progress.processedUrls,
        saved: progress.savedPlants,
        duplicates: progress.duplicatePlants,
        failed: progress.failedPlants,
        currentBatch: progress.currentBatch,
        totalBatches: progress.totalBatches,
        currentBatchUrl: progress.currentBatchUrl,
        estimatedTimeRemaining: progress.estimatedTimeRemaining,
        averageTimePerUrl: progress.averageTimePerUrl,
        startTime: progress.startTime,
        lastUpdateTime: progress.lastUpdateTime,
        _timestamp: Date.now() // Force frontend cache invalidation
      });
    } catch (error) {
      console.error("Error getting real-time scraping progress:", error);
      res.status(500).json({ 
        message: "Failed to get real-time scraping progress", 
        error: (error as Error).message 
      });
    }
  });

  // Generate photorealistic garden tool icons using Gemini AI
  app.post("/api/admin/generate-garden-icons", isAuthenticated, async (req: any, res) => {
    try {
      // Check if user is admin
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || !user.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      console.log("Starting AI-powered garden tool icon generation...");
      
      const { generateGardenToolIconSet } = await import("./geminiImageGen.js");
      const result = await generateGardenToolIconSet();
      
      if (result.success) {
        res.json({
          success: true,
          message: `Successfully generated ${result.generatedIcons.length} photorealistic garden tool icons`,
          generatedIcons: result.generatedIcons,
          errors: result.errors
        });
      } else {
        res.status(500).json({
          success: false,
          message: "Failed to generate any icons",
          errors: result.errors
        });
      }
    } catch (error) {
      console.error("Error generating garden tool icons:", error);
      res.status(500).json({
        success: false,
        message: "Error generating garden tool icons",
        error: error instanceof Error ? error.message : "Unknown error"
      });
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
        res.status(500).json({ message: "Error creating payment intent: " + (error as Error).message });
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
        return res.status(400).json({ error: { message: (error as Error).message } });
      }
    });
  }

  // Todo task routes for admin dashboard
  app.get('/api/admin/todo-tasks', isAuthenticated, async (req: any, res) => {
    try {
      // Check if user is admin
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || !user.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const tasks = await storage.getAllTodoTasks();
      res.json(tasks);
    } catch (error) {
      console.error("Error fetching todo tasks:", error);
      res.status(500).json({ message: "Failed to fetch todo tasks" });
    }
  });

  app.post('/api/admin/todo-tasks', isAuthenticated, async (req: any, res) => {
    try {
      // Check if user is admin
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || !user.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const { task } = req.body;
      if (!task || task.trim().length === 0) {
        return res.status(400).json({ message: "Task text is required" });
      }
      
      const newTask = await storage.createTodoTask({ task: task.trim() });
      res.json(newTask);
    } catch (error) {
      console.error("Error creating todo task:", error);
      res.status(500).json({ message: "Failed to create todo task" });
    }
  });

  app.delete('/api/admin/todo-tasks/:id', isAuthenticated, async (req: any, res) => {
    try {
      // Check if user is admin
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || !user.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      await storage.deleteTodoTask(req.params.id);
      res.json({ message: "Task deleted successfully" });
    } catch (error) {
      console.error("Error deleting todo task:", error);
      res.status(500).json({ message: "Failed to delete todo task" });
    }
  });

  // Populate Test Garden 1 with sample plants
  app.post('/api/admin/populate-test-garden', isAuthenticated, async (req: any, res) => {
    try {
      // Check if user is admin
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || !user.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const testGardenId = "1";
      
      // Sample canvas design with plants
      const sampleCanvasDesign = {
        plants: [
          {
            id: "plant1",
            plantId: "1",
            x: 200,
            y: 150,
            size: "medium",
            color: "#FF6B6B",
            initials: "RO",
            name: "Rosa 'Queen Elizabeth'",
            quantity: 1
          },
          {
            id: "plant2",
            plantId: "2",
            x: 400,
            y: 200,
            size: "large",
            color: "#4ECDC4",
            initials: "LA",
            name: "Lavandula angustifolia",
            quantity: 3
          },
          {
            id: "plant3",
            plantId: "3",
            x: 600,
            y: 150,
            size: "medium",
            color: "#FFD93D",
            initials: "HE",
            name: "Helianthus annuus",
            quantity: 2
          },
          {
            id: "plant4",
            plantId: "4",
            x: 300,
            y: 350,
            size: "small",
            color: "#6BCB77",
            initials: "SA",
            name: "Salvia officinalis",
            quantity: 4
          },
          {
            id: "plant5",
            plantId: "5",
            x: 500,
            y: 400,
            size: "large",
            color: "#FF6B6B",
            initials: "PE",
            name: "Paeonia lactiflora",
            quantity: 1
          },
          {
            id: "plant6",
            plantId: "6",
            x: 700,
            y: 300,
            size: "medium",
            color: "#4ECDC4",
            initials: "HO",
            name: "Hosta 'Patriot'",
            quantity: 2
          },
          {
            id: "plant7",
            plantId: "7",
            x: 150,
            y: 450,
            size: "small",
            color: "#FFD93D",
            initials: "TH",
            name: "Thymus vulgaris",
            quantity: 5
          },
          {
            id: "plant8",
            plantId: "8",
            x: 800,
            y: 200,
            size: "large",
            color: "#6BCB77",
            initials: "RH",
            name: "Rhododendron 'Nova Zembla'",
            quantity: 1
          }
        ],
        gardenShape: "rectangular",
        width: 1200,
        height: 800
      };
      
      // Update Test Garden 1 with the canvas design
      await storage.updateGarden(testGardenId, {
        layout_data: sampleCanvasDesign
      });
      
      res.json({ 
        message: "Test Garden 1 populated with sample plants", 
        plantCount: sampleCanvasDesign.plants.length 
      });
    } catch (error) {
      console.error("Error populating test garden:", error);
      res.status(500).json({ message: "Failed to populate test garden" });
    }
  });

  // Get visualization data (iteration count, saved images, etc)
  app.get('/api/gardens/:id/visualization-data', isAuthenticated, async (req: any, res) => {
    try {
      const gardenId = req.params.id;
      const garden = await storage.getGarden(gardenId);
      
      if (!garden) {
        return res.status(404).json({ message: "Garden not found" });
      }
      
      // Check ownership
      if (garden.userId !== req.user.claims.sub) {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      // Get or initialize visualization data
      const vizData = await storage.getVisualizationData(gardenId);
      res.json(vizData || { iterationCount: 0, savedImages: [] });
    } catch (error) {
      console.error("Error fetching visualization data:", error);
      res.status(500).json({ message: "Failed to fetch visualization data" });
    }
  });
  
  // Update visualization data
  app.post('/api/gardens/:id/update-visualization-data', isAuthenticated, async (req: any, res) => {
    try {
      const gardenId = req.params.id;
      const garden = await storage.getGarden(gardenId);
      
      if (!garden) {
        return res.status(404).json({ message: "Garden not found" });
      }
      
      // Check ownership
      if (garden.userId !== req.user.claims.sub) {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const { iterationCount, savedImages } = req.body;
      await storage.updateVisualizationData(gardenId, { iterationCount, savedImages });
      res.json({ success: true });
    } catch (error) {
      console.error("Error updating visualization data:", error);
      res.status(500).json({ message: "Failed to update visualization data" });
    }
  });
  
  // Save seasonal images to garden
  app.post('/api/gardens/:id/save-seasonal-images', isAuthenticated, async (req: any, res) => {
    try {
      const gardenId = req.params.id;
      const garden = await storage.getGarden(gardenId);
      
      if (!garden) {
        return res.status(404).json({ message: "Garden not found" });
      }
      
      // Check ownership
      if (garden.userId !== req.user.claims.sub) {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const { images } = req.body;
      
      // Get current visualization data
      const currentVizData = await storage.getVisualizationData(gardenId) || { iterationCount: 0 };
      
      // Update with saved images
      await storage.updateVisualizationData(gardenId, {
        ...currentVizData,
        savedImages: images,
        lastSaved: new Date().toISOString()
      });
      
      res.json({ success: true, message: "Images saved successfully" });
    } catch (error) {
      console.error("Error saving seasonal images:", error);
      res.status(500).json({ message: "Failed to save seasonal images" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

// Helper functions
function isClimateDataStale(lastUpdated: Date): boolean {
  const now = new Date();
  const daysSinceUpdate = Math.floor((now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60 * 24));
  return daysSinceUpdate > 180; // Update every 6 months since we use 10-year averages
}

async function fetchClimateDataWithCoordinates(location: string, coordinates?: { latitude: number; longitude: number } | null): Promise<any> {
  if (!process.env.VISUAL_CROSSING_API_KEY) {
    console.warn("Visual Crossing API key not configured");
    return null;
  }

  try {
    // Use coordinates if available for more accurate data
    const queryLocation = coordinates 
      ? `${coordinates.latitude},${coordinates.longitude}`
      : location;
    
    // Get 10 years of historical data for accurate climate analysis
    // Visual Crossing Professional plan supports up to 40 years of historical data
    // 10 years provides good balance between accuracy and performance
    const endDate = new Date();
    const startDate = new Date();
    startDate.setFullYear(endDate.getFullYear() - 10); // 10 years for accurate zone determination
    
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];
    
    const response = await fetch(
      `https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline/${encodeURIComponent(queryLocation)}/${startDateStr}/${endDateStr}?key=${process.env.VISUAL_CROSSING_API_KEY}&include=days&unitGroup=metric`
    );
    
    if (!response.ok) {
      if (response.status === 429) {
        console.log("Visual Crossing API rate limit hit. Please wait a moment and try again.");
        throw new Error(`API rate limit reached. Please wait 60 seconds and try again.`);
      }
      // Log the error details for debugging
      const errorText = await response.text();
      console.error(`Visual Crossing API error ${response.status}: ${errorText}`);
      throw new Error(`Visual Crossing API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Calculate accurate hardiness zones based on absolute minimum temperature
    const minTemp = calculateColdestWinterTemp(data.days);
    const zones = determineHardinessZones(minTemp, coordinates);
    
    // Calculate the actual years of data we received
    const years = new Set(data.days.map(day => new Date(day.datetime).getFullYear()));
    const yearsArray = Array.from(years).sort();
    
    // Calculate enhanced climate metrics
    const heatZone = calculateHeatZone(data.days);
    const koppenClimate = determineKoppenClimate(data.days, coordinates?.latitude || 0);
    const additionalMetrics = calculateClimateMetrics(data.days);
    
    // Process and structure the climate data
    return {
      usda_zone: zones.usda,
      rhs_zone: zones.rhs,
      hardiness_category: zones.category,
      temperature_range: zones.tempRange,
      ahs_heat_zone: heatZone,
      koppen_climate: koppenClimate,
      annual_rainfall: parseFloat(calculateAnnualRainfall(data.days).toFixed(1)),
      avg_temp_min: parseFloat(minTemp.toFixed(1)),
      avg_temp_max: parseFloat(calculateAverageTemp(data.days, 'tempmax').toFixed(1)),
      avg_humidity: additionalMetrics.avgHumidity,
      avg_wind_speed: additionalMetrics.avgWindSpeed,
      sunshine_percent: additionalMetrics.estimatedSunshinePercent,
      sunshine_hours: additionalMetrics.sunshineHoursPerDay,
      wettest_month: additionalMetrics.wettestMonth,
      wettest_month_precip: additionalMetrics.wettestMonthPrecip,
      driest_month: additionalMetrics.driestMonth,
      driest_month_precip: additionalMetrics.driestMonthPrecip,
      monthly_precip_pattern: additionalMetrics.monthlyPrecipPattern,
      frost_dates: calculateFrostDates(data.days),
      growing_season: calculateGrowingSeason(data.days),
      monthly_data: processMonthlyData(data.days),
      gardening_advice: generateGardeningAdvice(zones, data),
      data_source: 'visual_crossing_with_mapbox',
      data_range: {
        years_included: yearsArray,
        total_years: years.size,
        date_range: `historical data ${yearsArray[0]} - ${yearsArray[yearsArray.length - 1]}`,
        total_days: data.days.length
      }
    };
  } catch (error) {
    console.error("Error fetching climate data:", error);
    return null;
  }
}

// Keep old function for backward compatibility
async function fetchClimateData(location: string, coordinates?: { latitude: number; longitude: number } | null): Promise<any> {
  return fetchClimateDataWithCoordinates(location, coordinates);
}

// Calculate AHS Heat Zone based on days above 30°C (86°F)
function calculateHeatZone(days: any[]): number {
  // Count days with max temp above 30°C
  const hotDays = days.filter(day => day.tempmax > 30).length;
  const avgHotDaysPerYear = hotDays / Math.max(1, days.length / 365);
  
  // AHS Heat Zone mapping
  const heatZones = [
    { zone: 1, min: 0, max: 1 },
    { zone: 2, min: 1, max: 7 },
    { zone: 3, min: 7, max: 14 },
    { zone: 4, min: 14, max: 30 },
    { zone: 5, min: 30, max: 45 },
    { zone: 6, min: 45, max: 60 },
    { zone: 7, min: 60, max: 90 },
    { zone: 8, min: 90, max: 120 },
    { zone: 9, min: 120, max: 150 },
    { zone: 10, min: 150, max: 180 },
    { zone: 11, min: 180, max: 210 },
    { zone: 12, min: 210, max: 365 }
  ];
  
  for (const zone of heatZones) {
    if (avgHotDaysPerYear >= zone.min && avgHotDaysPerYear < zone.max) {
      return zone.zone;
    }
  }
  return 12; // Maximum heat zone
}

// Determine Köppen climate classification
function determineKoppenClimate(days: any[], latitude: number): string {
  // Calculate basic metrics
  const avgTemp = days.reduce((sum, day) => sum + day.temp, 0) / days.length;
  const totalPrecip = days.reduce((sum, day) => sum + (day.precip || 0), 0);
  const avgPrecipPerYear = totalPrecip / Math.max(1, days.length / 365);
  
  // Group by month to find seasonal patterns
  const monthlyData: { [key: number]: { temp: number[], precip: number[] } } = {};
  days.forEach(day => {
    const month = new Date(day.datetime).getMonth();
    if (!monthlyData[month]) {
      monthlyData[month] = { temp: [], precip: [] };
    }
    monthlyData[month].temp.push(day.temp);
    monthlyData[month].precip.push(day.precip || 0);
  });
  
  // Calculate monthly averages
  const monthlyAvgs = Object.entries(monthlyData).map(([month, data]) => ({
    month: parseInt(month),
    avgTemp: data.temp.reduce((a, b) => a + b, 0) / data.temp.length,
    totalPrecip: data.precip.reduce((a, b) => a + b, 0)
  }));
  
  const coldestMonth = Math.min(...monthlyAvgs.map(m => m.avgTemp));
  const hottestMonth = Math.max(...monthlyAvgs.map(m => m.avgTemp));
  
  // Simplified Köppen classification
  if (coldestMonth >= 18) {
    // Tropical (A)
    if (avgPrecipPerYear > 1500) {
      return "Af - Tropical rainforest";
    } else if (avgPrecipPerYear > 600) {
      return "Aw - Tropical savanna";
    } else {
      return "Am - Tropical monsoon";
    }
  } else if (coldestMonth <= -3) {
    // Continental (D)
    if (avgPrecipPerYear > 600) {
      return hottestMonth > 22 ? "Dfa - Hot summer continental" : "Dfb - Warm summer continental";
    } else {
      return "Dfc - Subarctic";
    }
  } else if (avgPrecipPerYear < 500) {
    // Arid (B)
    return avgTemp > 18 ? "BWh - Hot desert" : "BSk - Cold steppe";
  } else {
    // Temperate (C)
    if (Math.abs(latitude) < 40) {
      if (avgPrecipPerYear > 1000) {
        return hottestMonth > 22 ? "Cfa - Humid subtropical" : "Cfb - Oceanic";
      } else {
        return "Csa - Mediterranean";
      }
    } else {
      return hottestMonth > 22 ? "Cfb - Oceanic" : "Cfc - Subpolar oceanic";
    }
  }
}

// Calculate additional climate metrics
function calculateClimateMetrics(days: any[]) {
  // Average humidity
  const avgHumidity = days.reduce((sum, day) => sum + (day.humidity || 0), 0) / days.length;
  
  // Average wind speed
  const avgWindSpeed = days.reduce((sum, day) => sum + (day.windspeed || 0), 0) / days.length;
  
  // Sunshine hours (estimate from cloud cover if solar radiation not available)
  const avgCloudCover = days.reduce((sum, day) => sum + (day.cloudcover || 0), 0) / days.length;
  const estimatedSunshinePercent = 100 - avgCloudCover;
  // Convert to hours per day (assuming average 12 hours daylight)
  const sunshineHoursPerDay = (estimatedSunshinePercent / 100) * 12;
  
  // Precipitation pattern (wet/dry seasons)
  const monthlyPrecip: number[] = new Array(12).fill(0);
  const monthlyCounts: number[] = new Array(12).fill(0);
  
  days.forEach(day => {
    const month = new Date(day.datetime).getMonth();
    monthlyPrecip[month] += day.precip || 0;
    monthlyCounts[month]++;
  });
  
  const monthlyAvgPrecip = monthlyPrecip.map((total, i) => 
    monthlyCounts[i] > 0 ? total / monthlyCounts[i] : 0
  );
  
  // Find wettest and driest months
  const wettestMonthIndex = monthlyAvgPrecip.indexOf(Math.max(...monthlyAvgPrecip));
  const driestMonthIndex = monthlyAvgPrecip.indexOf(Math.min(...monthlyAvgPrecip));
  
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  
  return {
    avgHumidity: parseFloat(avgHumidity.toFixed(1)),
    avgWindSpeed: parseFloat(avgWindSpeed.toFixed(1)),
    estimatedSunshinePercent: parseFloat(estimatedSunshinePercent.toFixed(1)),
    sunshineHoursPerDay: parseFloat(sunshineHoursPerDay.toFixed(1)),
    wettestMonth: months[wettestMonthIndex],
    wettestMonthPrecip: parseFloat((monthlyAvgPrecip[wettestMonthIndex] * 30).toFixed(1)),
    driestMonth: months[driestMonthIndex],
    driestMonthPrecip: parseFloat((monthlyAvgPrecip[driestMonthIndex] * 30).toFixed(1)),
    monthlyPrecipPattern: monthlyAvgPrecip.map(p => parseFloat((p * 30).toFixed(1)))
  };
}

function determineHardinessZones(avgMinTemp: number, coordinates?: { latitude: number } | null) {
  // USDA Hardiness Zone mapping based on average minimum temperature (in Celsius)
  const usdaZones = [
    { zone: '1a', min: -51.1, max: -48.3 },
    { zone: '1b', min: -48.3, max: -45.6 },
    { zone: '2a', min: -45.6, max: -42.8 },
    { zone: '2b', min: -42.8, max: -40 },
    { zone: '3a', min: -40, max: -37.2 },
    { zone: '3b', min: -37.2, max: -34.4 },
    { zone: '4a', min: -34.4, max: -31.7 },
    { zone: '4b', min: -31.7, max: -28.9 },
    { zone: '5a', min: -28.9, max: -26.1 },
    { zone: '5b', min: -26.1, max: -23.3 },
    { zone: '6a', min: -23.3, max: -20.6 },
    { zone: '6b', min: -20.6, max: -17.8 },
    { zone: '7a', min: -17.8, max: -15 },
    { zone: '7b', min: -15, max: -12.2 },
    { zone: '8a', min: -12.2, max: -9.4 },
    { zone: '8b', min: -9.4, max: -6.7 },
    { zone: '9a', min: -6.7, max: -3.9 },
    { zone: '9b', min: -3.9, max: -1.1 },
    { zone: '10a', min: -1.1, max: 1.7 },
    { zone: '10b', min: 1.7, max: 4.4 },
    { zone: '11a', min: 4.4, max: 7.2 },
    { zone: '11b', min: 7.2, max: 10 },
    { zone: '12a', min: 10, max: 12.8 },
    { zone: '12b', min: 12.8, max: 15.6 },
    { zone: '13a', min: 15.6, max: 18.3 },
    { zone: '13b', min: 18.3, max: 21.1 }
  ];

  // RHS Hardiness Rating (UK-specific)
  const rhsRatings = [
    { rating: 'H1a', min: 15, max: 99, desc: 'Under glass all year (>15°C)' },
    { rating: 'H1b', min: 10, max: 15, desc: 'Can be grown outside in summer (10-15°C)' },
    { rating: 'H1c', min: 5, max: 10, desc: 'Can be grown outside in summer (5-10°C)' },
    { rating: 'H2', min: 1, max: 5, desc: 'Tolerant of low temps but not surviving being frozen (1-5°C)' },
    { rating: 'H3', min: -5, max: 1, desc: 'Hardy in coastal/mild areas (-5 to 1°C)' },
    { rating: 'H4', min: -10, max: -5, desc: 'Hardy through most of UK (-10 to -5°C)' },
    { rating: 'H5', min: -15, max: -10, desc: 'Hardy in most places (-15 to -10°C)' },
    { rating: 'H6', min: -20, max: -15, desc: 'Hardy everywhere (-20 to -15°C)' },
    { rating: 'H7', min: -99, max: -20, desc: 'Very hardy (< -20°C)' }
  ];

  // Find USDA zone
  let usdaZone = '13b'; // Default to warmest for tropical areas
  
  // Check if temperature is warmer than all zones (tropical)
  if (avgMinTemp > 21.1) {
    usdaZone = '13b'; // Tropical - no frost
  } else {
    for (const zone of usdaZones) {
      if (avgMinTemp >= zone.min && avgMinTemp < zone.max) {
        usdaZone = zone.zone;
        break;
      }
    }
  }

  // Find RHS rating
  let rhsRating = 'H4'; // Default for UK
  let rhsDesc = '';
  for (const rating of rhsRatings) {
    if (avgMinTemp >= rating.min && avgMinTemp < rating.max) {
      rhsRating = rating.rating;
      rhsDesc = rating.desc;
      break;
    }
  }

  // Determine hardiness category
  let category = 'Half Hardy';
  const zoneNum = parseInt(usdaZone.match(/\d+/)?.[0] || '9');
  if (zoneNum <= 5) category = 'Very Hardy';
  else if (zoneNum <= 7) category = 'Hardy';
  else if (zoneNum <= 9) category = 'Half Hardy';
  else category = 'Tender';

  return {
    usda: usdaZone,
    rhs: rhsRating,
    rhsDescription: rhsDesc,
    category,
    tempRange: `${avgMinTemp.toFixed(1)}°C average minimum`,
    zoneNumber: zoneNum
  };
}


function calculateAnnualRainfall(days: any[]): number {
  // Calculate average annual rainfall when we have multiple years of data
  const totalRainfall = days.reduce((total, day) => total + (day.precip || 0), 0);
  const years = new Set(days.map(day => new Date(day.datetime).getFullYear())).size;
  return totalRainfall / Math.max(1, years); // Average per year
}

function calculateAverageTemp(days: any[], field: string): number {
  const temps = days.map(day => day[field]).filter(temp => temp !== null);
  return temps.reduce((sum, temp) => sum + temp, 0) / temps.length;
}

function calculateColdestWinterTemp(days: any[]): number {
  // USDA zones are determined by the absolute minimum temperature
  // Find the single coldest temperature in the entire dataset
  
  let absoluteMin = Infinity;
  
  days.forEach(day => {
    if (day.tempmin !== null && day.tempmin !== undefined) {
      absoluteMin = Math.min(absoluteMin, day.tempmin);
    }
  });
  
  if (absoluteMin === Infinity) {
    // No temperature data found
    return 0;
  }
  
  // With 20 years of data, we should capture the actual extreme minimums
  // No need for location-specific overrides
  
  
  return absoluteMin;
}

function calculateFrostDates(days: any[]): any {
  // For each year, find the last spring frost and first fall frost
  const yearlyFrostDates: { [year: number]: { lastSpring: Date | null, firstFall: Date | null } } = {};
  
  days.forEach(day => {
    const date = new Date(day.datetime);
    const year = date.getFullYear();
    const month = date.getMonth();
    const dayOfMonth = date.getDate();
    
    if (day.tempmin <= 0) {
      if (!yearlyFrostDates[year]) {
        yearlyFrostDates[year] = { lastSpring: null, firstFall: null };
      }
      
      // Spring frost (January to June)
      if (month >= 0 && month <= 5) {
        if (!yearlyFrostDates[year].lastSpring || date > yearlyFrostDates[year].lastSpring!) {
          yearlyFrostDates[year].lastSpring = date;
        }
      }
      
      // Fall frost (July to December)
      if (month >= 6 && month <= 11) {
        if (!yearlyFrostDates[year].firstFall || date < yearlyFrostDates[year].firstFall!) {
          yearlyFrostDates[year].firstFall = date;
        }
      }
    }
  });
  
  // Calculate average dates
  const lastSpringFrosts: Date[] = [];
  const firstFallFrosts: Date[] = [];
  
  Object.values(yearlyFrostDates).forEach(year => {
    if (year.lastSpring) lastSpringFrosts.push(year.lastSpring);
    if (year.firstFall) firstFallFrosts.push(year.firstFall);
  });
  
  if (lastSpringFrosts.length === 0 && firstFallFrosts.length === 0) {
    return { first_frost: null, last_frost: null };
  }
  
  // Calculate average dates
  let avgLastFrost: Date | null = null;
  let avgFirstFrost: Date | null = null;
  
  if (lastSpringFrosts.length > 0) {
    const avgLastMonth = Math.round(lastSpringFrosts.reduce((sum, d) => sum + d.getMonth(), 0) / lastSpringFrosts.length);
    const avgLastDay = Math.round(lastSpringFrosts.reduce((sum, d) => sum + d.getDate(), 0) / lastSpringFrosts.length);
    avgLastFrost = new Date(2024, avgLastMonth, avgLastDay);
  }
  
  if (firstFallFrosts.length > 0) {
    const avgFirstMonth = Math.round(firstFallFrosts.reduce((sum, d) => sum + d.getMonth(), 0) / firstFallFrosts.length);
    const avgFirstDay = Math.round(firstFallFrosts.reduce((sum, d) => sum + d.getDate(), 0) / firstFallFrosts.length);
    avgFirstFrost = new Date(2024, avgFirstMonth, avgFirstDay);
  }
  
  // Format dates
  const formatDate = (date: Date | null) => {
    if (!date) return null;
    return `2024-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };
  
  return {
    last_frost: formatDate(avgLastFrost),
    first_frost: formatDate(avgFirstFrost)
  };
}

function calculateGrowingSeason(days: any[]): any {
  // Calculate typical growing season within a calendar year
  // Growing season is when minimum temperature stays above 5°C
  const growingDays = days.filter(day => day.tempmin > 5);
  
  // For tropical locations with year-round growing season
  if (growingDays.length === days.length || growingDays.length > days.length * 0.95) {
    const currentYear = new Date().getFullYear();
    return {
      start: `${currentYear}-01-01`,
      end: `${currentYear}-12-31`,
      length_days: 365
    };
  }
  
  if (growingDays.length === 0) {
    return { start: null, end: null, length_days: 0 };
  }
  
  // Group by year to find typical pattern
  const seasonByYear: { [year: number]: { start: string, end: string, days: number } } = {};
  
  days.forEach(day => {
    const year = new Date(day.datetime).getFullYear();
    const isGrowing = day.tempmin > 5;
    
    if (isGrowing) {
      if (!seasonByYear[year]) {
        seasonByYear[year] = { start: day.datetime, end: day.datetime, days: 1 };
      } else {
        if (day.datetime < seasonByYear[year].start) {
          seasonByYear[year].start = day.datetime;
        }
        if (day.datetime > seasonByYear[year].end) {
          seasonByYear[year].end = day.datetime;
        }
        seasonByYear[year].days++;
      }
    }
  });
  
  // Calculate average season
  const validYears = Object.values(seasonByYear).filter(y => y.start && y.end);
  if (validYears.length === 0) return { start: null, end: null, length_days: 0 };
  
  // Find typical start and end dates
  const startDates = validYears.map(y => {
    const d = new Date(y.start);
    return { month: d.getMonth(), day: d.getDate() };
  });
  const endDates = validYears.map(y => {
    const d = new Date(y.end);
    return { month: d.getMonth(), day: d.getDate() };
  });
  
  // Calculate average start and end
  const avgStartMonth = Math.round(startDates.reduce((sum, d) => sum + d.month, 0) / startDates.length);
  const avgStartDay = Math.round(startDates.reduce((sum, d) => sum + d.day, 0) / startDates.length);
  const avgEndMonth = Math.round(endDates.reduce((sum, d) => sum + d.month, 0) / endDates.length);
  const avgEndDay = Math.round(endDates.reduce((sum, d) => sum + d.day, 0) / endDates.length);
  
  const avgDays = validYears.reduce((sum, y) => sum + y.days, 0) / validYears.length;
  
  const currentYear = new Date().getFullYear();
  
  return {
    start: `${currentYear}-${String(avgStartMonth + 1).padStart(2, '0')}-${String(avgStartDay).padStart(2, '0')}`,
    end: `${currentYear}-${String(avgEndMonth + 1).padStart(2, '0')}-${String(avgEndDay).padStart(2, '0')}`,
    length_days: Math.round(avgDays)
  };
}

function processMonthlyData(days: any[]): any {
  const monthlyData: { [key: number]: any } = {};
  days.forEach((day: any) => {
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
    const data = monthlyData[parseInt(month)];
    data.temp_avg = data.temp_avg.reduce((sum: number, temp: number) => sum + temp, 0) / data.temp_avg.length;
  });
  
  return monthlyData;
}

