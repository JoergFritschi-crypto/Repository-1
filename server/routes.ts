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
import { PerenualAPI, GBIFAPI, MapboxAPI, HuggingFaceAPI, RunwareAPI } from "./externalAPIs";
import { generateGardeningAdvice } from "./gardening-advice";
import { fileVaultService } from "./fileVault";
import { apiMonitoring } from "./apiMonitoring";
import { imageGenerationService } from "./imageGenerationService";
import { runwareImageGenerator } from "./runwareImageGenerator";
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
          // File vault save is optional - skip if method doesn't exist
          if (fileVaultService && typeof fileVaultService.saveDataToVault === 'function') {
            await fileVaultService.saveDataToVault(
              req.user.claims.sub,
              `soil-testing-${location.replace(/[^a-zA-Z0-9]/g, '-')}`,
              soilTestingData,
              'soil-testing'
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
- Style: ${garden.design_style || 'mixed border'}

Available Plants (use these exact names and IDs):
${verifiedPlants.map(p => `- ID: ${p.id}, Name: ${p.commonName}, Scientific: ${p.scientificName}, Height: ${p.heightMax}cm, Spread: ${p.spreadMax}cm`).join('\n')}

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

      const response = await anthropicAI.generateText(prompt);
      
      // Parse the AI response
      let aiDesign;
      try {
        // Extract JSON from the response
        const jsonMatch = response.match(/\{[\s\S]*\}/);
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

  // Advanced plant search endpoint
  app.get('/api/plants/advanced-search', async (req, res) => {
    try {
      const filters: any = {};
      
      // Text search fields
      if (req.query.genus) filters.genus = req.query.genus;
      if (req.query.species) filters.species = req.query.species;
      if (req.query.cultivar) filters.cultivar = req.query.cultivar;
      
      // Radio fields (single selection)
      if (req.query.plantType && req.query.plantType !== 'Any') filters.plantType = req.query.plantType;
      if (req.query.foliageType && req.query.foliageType !== 'Any') filters.foliageType = req.query.foliageType;
      if (req.query.hardiness && req.query.hardiness !== 'Any') filters.hardiness = req.query.hardiness;
      if (req.query.sunlight && req.query.sunlight !== 'Any') filters.sunlight = req.query.sunlight;
      if (req.query.soilType && req.query.soilType !== 'Any') filters.soilType = req.query.soilType;
      if (req.query.soilPH && req.query.soilPH !== 'Any') filters.soilPH = req.query.soilPH;
      if (req.query.careLevel && req.query.careLevel !== 'Any') filters.careLevel = req.query.careLevel;
      if (req.query.watering && req.query.watering !== 'Any') filters.watering = req.query.watering;
      if (req.query.maintenance && req.query.maintenance !== 'Any') filters.maintenance = req.query.maintenance;
      
      // Range fields
      if (req.query.minHeight) filters.minHeight = parseInt(req.query.minHeight as string);
      if (req.query.maxHeight) filters.maxHeight = parseInt(req.query.maxHeight as string);
      if (req.query.minSpread) filters.minSpread = parseInt(req.query.minSpread as string);
      if (req.query.maxSpread) filters.maxSpread = parseInt(req.query.maxSpread as string);
      
      // Checkbox fields (multiple selections)
      if (req.query.specialFeatures) filters.specialFeatures = Array.isArray(req.query.specialFeatures) 
        ? req.query.specialFeatures 
        : [req.query.specialFeatures];
      if (req.query.attractsWildlife) filters.attractsWildlife = Array.isArray(req.query.attractsWildlife)
        ? req.query.attractsWildlife
        : [req.query.attractsWildlife];
      if (req.query.bloomMonths) filters.bloomMonths = Array.isArray(req.query.bloomMonths)
        ? req.query.bloomMonths
        : [req.query.bloomMonths];
      if (req.query.colors) filters.colors = Array.isArray(req.query.colors)
        ? req.query.colors
        : [req.query.colors];
      
      // Boolean fields
      if (req.query.isSafe) filters.isSafe = req.query.isSafe === 'true';
      if (req.query.hasFlower) filters.hasFlower = req.query.hasFlower === 'true';
      
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
          nativeRegion: 'Mediterranean',
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
          nativeRegion: 'Asia',
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
          nativeRegion: 'Japan, Korea, China',
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

  // Admin plant routes
  app.post('/api/admin/plants', isAuthenticated, async (req: any, res) => {
    try {
      // TODO: Add admin role check
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

  app.delete('/api/admin/plants/:id', isAuthenticated, async (req: any, res) => {
    try {
      // TODO: Add admin role check
      await storage.deletePlant(req.params.id);
      res.json({ message: "Plant deleted successfully" });
    } catch (error) {
      console.error("Error deleting plant:", error);
      res.status(500).json({ message: "Failed to delete plant" });
    }
  });

  // Image generation endpoints
  app.post('/api/admin/plants/:id/generate-images', isAuthenticated, async (req: any, res) => {
    try {
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
  
  // Reset stuck items back to pending
  app.post('/api/admin/image-generation/reset-stuck', isAuthenticated, async (req: any, res) => {
    try {
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
      res.status(400).json({ message: "Failed to add to collection", error: (error as Error).message });
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
      const visualizationData = await storage.getVisualizationData(parseInt(req.params.id));
      const iterationNumber = (visualizationData?.iterationCount || 0) + 1;
      
      if (!canvasDesign || !canvasDesign.plants) {
        return res.status(400).json({ message: "Canvas design with plants is required" });
      }

      // Convert canvas positions to hyperprecise grid coordinates (1cm precision)
      // Canvas is 1200x800px representing garden dimensions
      const gardenWidth = garden.dimensions.width;
      const gardenLength = garden.dimensions.length;
      
      // Create hyperprecise plant positioning with centimeter-level grid coordinates
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
        
        return `Plant ${index + 1}: ${p.plantName || p.commonName} (${p.scientificName})
  Grid: ${gridCol}${gridRow} (${xCentimeters}cm from left, ${yCentimeters}cm from front)
  Exact: X=${xMeters}m, Y=${yMeters}m${relationships.length > 0 ? '\n  Spacing: ' + relationships.join(', ') : ''}`;
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
        // PERPLEXITY'S APPROACH: Use reference image and only change seasonal aspects
        prompt = `Using the provided garden image as an EXACT reference, create the ${season} version.
        
CRITICAL INSTRUCTIONS:
- This is image ${season} of a 4-season time-lapse series
- Keep EVERYTHING identical except seasonal changes:
  * Exact same garden shape and dimensions
  * Exact same camera position and angle
  * Exact same plant positions
  * Exact same composition and framing
  * Exact same background

ONLY change these seasonal elements for ${specificMonth}:
${season === 'spring' ? 
  '- Fresh green spring foliage\n- Early spring blooms\n- Bright green grass\n- Clear spring sky' :
season === 'summer' ? 
  '- Lush summer growth\n- Peak flowering\n- Deep green foliage\n- Bright summer sky' :
season === 'autumn' ? 
  '- Autumn leaf colors (reds, oranges, yellows)\n- Late season blooms\n- Golden/brown grass hints\n- Autumn sky tones' :
  '- Winter dormancy\n- Bare branches on deciduous plants\n- Evergreen structure\n- Winter sky and light'}

The provided reference image shows the exact garden layout, camera angle, and composition.
Replicate it EXACTLY with only the seasonal changes listed above.
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

        // Concise photography-based prompt for Gemini 2.5 Flash
        prompt = `Generate a 1920x1080 pixel image (16:9 widescreen aspect ratio). 

TIME-LAPSE SERIES: Image ${season} of 4 for Garden #${req.params.id} (Iteration ${iterationNumber})
This is a fixed-camera time-lapse where ONLY plants change seasonally. The garden bed shape, camera position, and framing remain IDENTICAL across all 4 images.

GARDEN SHAPE - CRITICAL:
The garden is a perfect RECTANGLE with 4 straight edges and 4 right-angle corners.
- Shape: RECTANGULAR ornamental garden bed (NOT octagon, NOT hexagon, NOT oval)
- Dimensions: ${gardenWidth}m wide × ${gardenLength}m deep
- Edges: Stone or brick edging forming a perfect rectangle
- All 4 corners are 90-degree angles
- The rectangle is aligned with the camera (not rotated)

LOCKED CAMERA (NEVER CHANGES):
Camera positioned DIRECTLY IN FRONT of the garden's center point
NOT at a corner, NOT at 45 degrees, NOT diagonal
Camera is aligned with the garden's front edge (parallel to it)
Distance: ${cameraDistance.toFixed(2)}m straight back from front edge center
Height: ${cameraHeight}m (eye level)

VIEWING DIRECTION - ABSOLUTELY CRITICAL:
The camera looks STRAIGHT at the garden from the FRONT (not corner):
- You are standing directly in front of the garden bed
- The front edge runs horizontally across your view
- You see the garden straight-on like viewing a painting in a gallery
- Both left and right edges recede equally toward the horizon
- This is the SAME VIEW as page 2 of the garden design canvas

EXACT RECTANGULAR GARDEN IN FRAME:
- Front edge: HORIZONTAL line (parallel to frame bottom) at 15% height
- Back edge: HORIZONTAL line (parallel to frame bottom) at 55% height
- Left edge: Diagonal line receding from left
- Right edge: Diagonal line receding from right  
- The rectangle appears as a symmetrical trapezoid
- NOT a diamond shape (that would be 45-degree view)

The garden occupies exactly 40% of frame height. All four stone-edged borders visible: front border at 15% from bottom, back border at 55% from bottom. Left and right borders fully visible with grass margins. Background: continuous grass lawn only - no wooden decking, no paths, no structures, no trees. This is frame ${season} of a time-lapse series photographed in ${specificMonth} in the United Kingdom.

Garden layout with exact plant positions:
${plantPositions.join('\n')}

Critical requirements for maintaining identical layout:
- Preserve the exact spatial positions of every plant as specified above
- Maintain identical plant groupings and spacing throughout
- Keep the same rectangular garden bed shape with visible edging
- Use consistent eye-level viewing angle from the front of the bed
- Show this exact same garden bed configuration in every image

Time-lapse photography consistency for Garden #${req.params.id}:
Camera permanently locked at: ${cameraDistance.toFixed(1)}m distance, exactly ${cameraHeight}m height (standing eye-level, NOT drone view), 15-degree downward tilt, ${focalLength}mm lens. Exact frame proportions: horizon at 65% height, garden occupies 40% of frame height, front border at 15% from bottom, back border at 55% from bottom. The garden appears the same size in every frame - no variation in camera height or angle.

Background environment: Continuous grass lawn extending to horizon. Absolutely no wooden decking, paths, patios, structures, buildings, walls, fences, or trees anywhere in the image.
- Lighting direction: Same sun angle/shadow direction (adjusted only for time of year)
- Composition: Garden bed positioned identically in frame across all images
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

      // Generate the image using Gemini
      let imageResult;
      if (useReferenceMode && referenceImage) {
        // For reference mode, we need to pass the reference image to Gemini
        // Extract base64 data from the referenceImage URL if needed
        const base64Data = referenceImage.startsWith('data:image') 
          ? referenceImage.split(',')[1] 
          : referenceImage;
        
        // Generate with reference image
        imageResult = await geminiAI.generateImageWithReference(prompt, base64Data);
      } else {
        // Standard generation without reference
        imageResult = await geminiAI.generateImage(prompt);
      }
      
      res.json({
        success: true,
        season: season || 'summer',
        imageUrl: imageResult.imageData || imageResult.imageUrl || null,
        prompt: prompt,
        message: imageResult.imageData || imageResult.imageUrl ? 'Seasonal image generated successfully' : 'Image generation in progress'
      });
    } catch (error) {
      console.error("Error generating seasonal images:", error);
      res.status(500).json({ message: "Failed to generate seasonal images", error: (error as Error).message });
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

  // Create test garden for quick testing
  app.post('/api/admin/create-test-garden', isAuthenticated, async (req: any, res) => {
    try {
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

  // Populate Test Garden 1 with sample plants
  app.post('/api/admin/populate-test-garden', isAuthenticated, async (req: any, res) => {
    try {
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
      const gardenId = parseInt(req.params.id);
      const garden = await storage.getGarden(gardenId.toString());
      
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
      const gardenId = parseInt(req.params.id);
      const garden = await storage.getGarden(gardenId.toString());
      
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
      const gardenId = parseInt(req.params.id);
      const garden = await storage.getGarden(gardenId.toString());
      
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
