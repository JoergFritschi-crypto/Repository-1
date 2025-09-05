import express, { type Express } from "express";
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
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));

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

  // Climate data endpoint with Mapbox geocoding
  app.get('/api/climate', async (req, res) => {
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
        coordinates
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
      
      res.json({
        ...climateData,
        coordinates,
        location: formattedLocation
      });
    } catch (error) {
      console.error("Error fetching climate data:", error);
      res.status(500).json({ message: "Failed to fetch climate data" });
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
        error: error.message 
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
        error: error.message 
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
        error: error.message 
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
        error: error.message 
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
        error: error.message 
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
        error: error.message 
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
        res.status(500).json({ error: error.message });
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
          message: error.message 
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
    
    // Get 20 years of continuous historical data for accurate climate analysis
    // Visual Crossing Professional plan supports up to 40 years of historical data
    // 20 years should capture most extreme weather events for accurate zone determination
    const endDate = new Date();
    const startDate = new Date();
    startDate.setFullYear(endDate.getFullYear() - 20); // 20 years of data
    
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

function generateGardeningAdvice(zones: any, weatherData: any) {
  // Calculate additional metrics for recommendations
  const avgRainfall = weatherData.days.reduce((sum: number, day: any) => sum + (day.precip || 0), 0) / Math.max(1, weatherData.days.length);
  const avgTemp = weatherData.days.reduce((sum: number, day: any) => sum + (day.temp || 0), 0) / Math.max(1, weatherData.days.length);
  const frostDays = weatherData.days.filter((day: any) => day.tempmin <= 0).length;
  const hotDays = weatherData.days.filter((day: any) => day.tempmax >= 30).length;
  
  let recommendations = [];
  
  // Comprehensive climate-specific advice (4x enhanced)
  if (zones.zoneNumber <= 6) {
    recommendations.push(
      "Cold Climate Garden Strategy: Your region experiences significant winter cold with average minimum temperatures reaching " + zones.tempRange + ", creating ideal conditions for temperate plants requiring 800-1200 chill hours annually. " +
      "Plant cold-hardy perennials including Siberian iris Caesar Brother with striking purple blooms, peonies Sarah Bernhardt offering fragrant double pink flowers and Karl Rosenfield with deep red blooms lasting 7-10 days, hostas Sum and Substance growing to 3 feet wide with chartreuse leaves, and astilbe Bridal Veil producing feathery white plumes in partial shade. " +
      "For vegetables, establish succession plantings of cold-tolerant varieties: curly kale Winterbor surviving to minus 15 degrees Celsius, Brussels sprouts Long Island Improved maturing in 90 days, savoy cabbage with crinkled leaves storing well through winter, Nantes carrots growing 6-7 inches long in 65 days, and Hollow Crown parsnips sweetening after frost exposure. " +
      "Spring bulbs perform exceptionally well: Darwin tulips bloom mid-May reaching 24 inches tall, King Alfred daffodils naturalize rapidly producing golden trumpets, Dutch crocuses emerge through snow providing early nectar for bees, Siberian squill creates blue carpets under deciduous trees, and glory-of-the-snow spreads naturally in lawns. " +
      "Native trees provide essential structure: sugar maples offer brilliant orange-red fall color and maple syrup potential, paper birch features distinctive white exfoliating bark, white spruce grows 40-60 feet providing excellent windbreaks, Colorado blue spruce displays silver-blue needles year-round, and eastern white pine serves as valuable wildlife habitat growing 50-80 feet tall. "
    );
    
    recommendations.push(
      "Season Extension Techniques: Maximize your " + Math.round((zones.zoneNumber <= 4 ? 120 : 150)) + "-day growing season through strategic planning and protective structures. " +
      "Start warm-season crops indoors using full-spectrum LED grow lights positioned 6 inches above seedlings for 14-16 hours daily, combined with thermostatically controlled heat mats maintaining consistent 70-75 degree Fahrenheit soil temperature, beginning tomatoes and peppers 8-10 weeks before last frost date. " +
      "Construct south-facing cold frames with 45-degree angled tops using twin-wall polycarbonate panels providing R-value of 1.5, or install 20-foot hoop houses covered with 6-mil greenhouse plastic extending harvest season by 6-8 weeks in both spring and fall. " +
      "Deploy floating row covers made from spunbonded polypropylene fabric: lightweight versions protecting to 28 degrees Fahrenheit for lettuce and spinach, medium-weight to 26 degrees for broccoli and cabbage, and heavyweight to 24 degrees for established perennials, securing edges with landscape staples every 3 feet. " +
      "Select rapid-maturing cultivars specifically bred for short seasons: Early Girl tomatoes producing fruit in 50 days from transplant, Ace bell peppers maturing in 60 days, Marketmore 76 cucumbers ready in 55 days, and Early Wonder beets harvestable as baby vegetables in just 35 days, while using infrared-transmitting black plastic mulch raising soil temperature 5-10 degrees accelerating growth by 2-3 weeks. "
    );
  } else if (zones.zoneNumber <= 8) {
    recommendations.push(
      "Moderate Climate Opportunities: Your zone " + zones.zoneNumber + " climate with average annual temperatures between " + avgTemp.toFixed(1) + " degrees Celsius supports exceptional plant diversity, allowing cultivation of both temperate and subtropical species with minimal protection requirements. " +
      "Establish cottage garden borders combining David Austin roses Lady Emma Hamilton featuring apricot-orange blooms with strong myrrh fragrance and Graham Thomas producing golden-yellow flowers on 4-foot bushes, English lavender Hidcote maintaining compact 15-inch height with deep purple flowers, Pacific Giant delphiniums reaching 6 feet with massive flower spikes, foxgloves Camelot series blooming first year from seed, and Chaters Double hollyhocks displaying pompon-like flowers along 6-8 foot stems. " +
      "Extend vegetable production through succession planting: Cherokee Purple heirloom tomatoes producing 10-12 ounce dusky pink fruits with exceptional flavor, Carmen Italian sweet peppers ripening from green to red in 60 days, Waltham Butternut squash storing 6 months after harvest, Blue Lake bush beans yielding continuously for 3 weeks per planting, plus Winter Density romaine lettuce tolerating both heat and cold for year-round harvests. " +
      "Develop productive orchards with disease-resistant varieties: Honeycrisp apples requiring 800-1000 chill hours producing exceptionally crisp fruits, Bartlett pears ripening August-September perfect for fresh eating and canning, Victoria plums self-fertile bearing heavy crops of sweet red fruits, Conference pears storing until January, and Cox Orange Pippin apples offering complex aromatic flavor profiles. " +
      "Create Mediterranean herb gardens featuring Tuscan Blue rosemary growing upright to 6 feet with dark blue flowers, Berggarten sage producing minimal flowers but abundant gray-green leaves, English thyme forming dense mats covered in pink summer flowers, Greek oregano intensifying flavor when grown in lean soil, and French tarragon requiring excellent drainage but rewarding with anise-flavored leaves essential for classic béarnaise sauce. "
    );
    
    recommendations.push(
      "Year-Round Garden Interest: Your mild zone " + zones.zoneNumber + " winters with temperatures rarely below " + zones.tempRange + " allow spectacular four-season garden displays combining flowers, foliage, bark, and berries for continuous visual impact throughout the calendar year. " +
      "Establish winter framework using architectural shrubs: Hamamelis Arnold Promise witch hazel producing fragrant spider-like yellow flowers on bare branches January-February lasting 4 weeks, Jasminum nudiflorum winter jasmine cascading with bright yellow tubular flowers December-March before leaves emerge, Mahonia Charity bearing 12-inch racemes of fragrant lemon-yellow flowers November-January followed by blue-black berries, winter-flowering viburnums producing clusters of pink-tinged white intensely fragrant flowers, and Sarcococca confusa Christmas box filling the garden with vanilla scent from tiny white flowers hidden among glossy leaves. " +
      "Build evergreen structure creating year-round garden bones: Buxus sempervirens Suffruticosa dwarf boxwood maintaining 3-foot height perfect for formal edging and topiary, Taxus baccata English yew tolerating heavy pruning for hedges and architectural shapes, Ilex aquifolium JC van Tol self-fertile holly producing abundant red berries without need for male pollinator, Portuguese laurel Prunus lusitanica forming dense screens with fragrant white flower racemes, and fastigiate Irish yew providing 20-foot vertical accents in narrow spaces. " +
      "Layer seasonal bulbs and perennials for succession interest: Galanthus Flore Pleno double snowdrops emerging through snow in January, Narcissus February Gold blooming 3 weeks earlier than standard daffodils, Eranthis winter aconites carpeting ground with golden buttercup flowers, summer combinations of coral bells Heuchera with colored foliage lasting 10 months paired with Astilbe producing feathery plumes, autumn-flowering Cyclamen hederifolium displaying marbled leaves after pink or white flowers, and Colchicum autumnale naked ladies emerging without foliage in September. " +
      "Feature specimens with exceptional bark and winter structure: Acer griseum paperbark maple exfoliating cinnamon-colored bark glowing when backlit by winter sun, Acer palmatum Sango-kaku coral bark Japanese maple intensifying to brilliant coral-red stems in cold weather, Betula utilis jacquemontii displaying brilliant white bark developing after 3 years, Prunus serrula Tibetan cherry featuring mahogany bark polished to mirror finish, and Cornus alba Sibirica producing scarlet winter stems after annual March pruning. "
    );
  } else {
    recommendations.push(
      "Warm Climate Gardening: Your zone " + zones.zoneNumber + " climate with minimal frost risk and average temperatures of " + avgTemp.toFixed(1) + " degrees Celsius enables continuous cultivation of tropical and subtropical species without winter protection requirements. " +
      "Design dramatic tropical landscapes using Phoenix canariensis date palms reaching 60 feet with 20-foot crown spread, Strelitzia reginae bird of paradise producing orange and blue flowers resembling exotic birds lasting 2 weeks in arrangements, Bougainvillea Barbara Karst displaying magenta bracts 10 months annually and California Gold featuring golden-yellow color, Hibiscus rosa-sinensis Red Dragon bearing 8-inch crimson flowers attracting hummingbirds, and Plumeria rubra filling evening air with intense fragrance from white, pink, or yellow propeller-shaped blooms. " +
      "Establish productive home orchards with Washington Navel oranges ripening November through May with easy-peel seedless fruits, Meyer lemons bearing thin-skinned sweet-tart fruits year-round suitable for container growing, Ruby Red grapefruits developing pink flesh with increasing sweetness through winter, Hass avocados producing 8-ounce fruits with creamy texture when tree reaches 5 years, Kent mangoes yielding fiberless fruits weighing up to 2 pounds each, and Red Lady papayas bearing sweet orange-red flesh on compact 8-foot trees. " +
      "Maintain continuous vegetable production through strategic variety selection: Sun Gold cherry tomatoes producing intensely sweet orange fruits resistant to cracking, Thai Dragon peppers growing upward-facing 3-inch fruits with 75,000 Scoville heat units, Japanese eggplants Ping Tung Long reaching 18 inches with tender purple skin requiring no peeling, Clemson Spineless okra yielding tender pods when harvested at 3 inches every other day, and Beauregard sweet potatoes producing disease-resistant orange roots ready in 90 days. " +
      "Layer tropical foliage for year-round interest: red torch ginger displaying 12-inch cone-shaped red bracts lasting months, Heliconia Lobster Claw producing distinctive red and yellow bracts on 15-foot plants, Musa Dwarf Cavendish bananas fruiting at just 6 feet height in containers, Canna Tropicanna showcasing striped burgundy-orange leaves with bright orange flowers, and elephant ears Alocasia macrorrhiza creating 6-foot leaves providing instant tropical atmosphere. "
    );
    
    recommendations.push(
      "Heat and Drought Management: With " + hotDays + " days exceeding 30.0 degrees Celsius annually and average rainfall of " + (avgRainfall * 365).toFixed(1) + "mm, successful gardening requires comprehensive water conservation and temperature mitigation strategies maximizing every drop while protecting plants from heat stress. " +
      "Design efficient irrigation systems delivering water precisely where needed: pressure-compensating drip emitters rated at 2 gallons per hour spaced 12 inches apart for vegetables and 18 inches for shrubs, quarter-inch soaker hoses laid in parallel lines 10 inches apart under mulch, micro-sprinklers providing 90-degree coverage for ground covers, smart controllers adjusting schedules based on weather data reducing water use by 30%, and rain sensors preventing irrigation during precipitation events. " +
      "Apply strategic mulching maintaining consistent 3-4 inch depth year-round: shredded hardwood bark decomposing slowly adding organic matter, pine bark nuggets resisting flotation during heavy rain, cocoa hull mulch providing attractive appearance with chocolate aroma, recycled rubber mulch lasting 10 years in pathways, and living mulches like sweet alyssum between vegetables suppressing weeds while attracting beneficial insects. " +
      "Create protective microclimates moderating temperature extremes: aluminet shade cloth providing 30% shade for tomatoes and 50% for lettuce while reflecting heat, wooden pergolas supporting deciduous vines like grapes providing summer shade and winter sun, lath houses constructed with 50% open spacing ideal for orchids and ferns, strategic placement near thermal mass walls radiating absorbed heat at night, and companion planting using tall sunflowers shading heat-sensitive lettuce and spinach. " +
      "Select resilient drought-adapted plants thriving with minimal irrigation: architectural agaves including Agave americana growing 6 feet wide with dramatic blue-gray leaves, medicinal Aloe vera producing healing gel in lance-shaped succulent leaves, Autumn Joy sedum transitioning from green through pink to rust-red flowers lasting into winter, native salvias like Cleveland sage with aromatic gray foliage and purple flowers, and penstemons attracting hummingbirds with tubular flowers while tolerating extreme drought once established. "
    );
  }

  // Rainfall-specific recommendations
  if (avgRainfall < 1.5) {
    recommendations.push(
      "Water Conservation Strategies: Your annual rainfall of approximately " + (avgRainfall * 365).toFixed(1) + "mm requires comprehensive water harvesting and conservation techniques capturing every drop while selecting plants adapted to periodic drought conditions. " +
      "Construct bioswales and rain gardens maximizing storm water infiltration: excavate depressions 6-8 inches deep with 3:1 side slopes directing runoff from driveways and roofs, amend soil with 30% compost improving percolation rates to 1 inch per hour, plant native sedges like Carex pensylvanica and rushes including Juncus effusus absorbing excess water, incorporate river rocks creating attractive dry creek beds during non-rain periods, and position overflow outlets preventing flooding during intense storms while recharging groundwater tables naturally. " +
      "Implement rainwater harvesting systems capturing roof runoff: install first-flush diverters removing initial contaminated water containing dust and bird droppings, connect 50-gallon rain barrels in series providing 200 gallons storage from single downspout, upgrade to 500-1000 gallon polyethylene cisterns for serious water conservation, add mosquito-proof screens and spigots positioned 6 inches above base for sediment accumulation, and calculate that 1000 square feet of roof area yields 600 gallons from just 1 inch of rainfall. " +
      "Design hydrozones grouping plants by water requirements: locate high-water vegetables and annual flowers nearest irrigation sources, position moderate-water perennials in transition zones receiving occasional deep watering, establish low-water Mediterranean and native plant areas furthest from water sources, use drip irrigation zones with separate timers for each hydrozone, and achieve 40% water savings compared to mixed plantings with uniform irrigation. " +
      "Build drought-resilient plant communities thriving with minimal supplemental water: English lavender Munstead maintaining compact 18-inch mounds covered in fragrant purple spikes, Russian sage Blue Spire producing airy 4-foot tall violet-blue flowers lasting through autumn, sedum Dragon Blood forming red-edged succulent groundcover turning brilliant red in fall, yarrow Moonshine displaying flat-topped sulfur-yellow flowers on silver foliage attractive to butterflies, and blue fescue grass creating 8-inch tufted mounds of steel-blue needle-like foliage requiring no summer water once established. " +
      "Enhance soil water-holding capacity through organic matter addition: incorporate 2-3 inches aged compost annually increasing water retention by 20% in sandy soils, add coconut coir holding 9 times its weight in water, mix perlite improving drainage while retaining moisture in clay soils, apply mycorrhizal inoculants extending root zones by 100-fold through fungal networks, and maintain living soil biology creating aggregates that store water while remaining well-aerated. "
    );
  } else if (avgRainfall > 3) {
    recommendations.push(
      "Managing High Rainfall: Your abundant " + (avgRainfall * 365).toFixed(1) + "mm annual precipitation creates challenges with waterlogging, fungal diseases, and nutrient leaching requiring comprehensive drainage solutions and careful plant selection favoring moisture-tolerant species. " +
      "Engineer effective drainage systems preventing water accumulation: excavate French drains 18 inches deep and 6 inches wide filled with 3/4-inch gravel wrapped in landscape fabric, install 4-inch perforated pipes sloped 1% minimum toward outlets, construct dry wells 3 feet wide by 4 feet deep filled with 1.5-inch stones handling 50 gallons runoff, build raised beds 12-18 inches high using rot-resistant cedar filled with 40% topsoil 40% compost 20% perlite mix, and crown plant rows 4-6 inches above pathways facilitating surface drainage during heavy downpours. " +
      "Select moisture-loving plants thriving in high humidity conditions: astilbe Bridal Veil producing graceful white plumes in deep shade tolerating wet feet, cardinal flower Lobelia cardinalis displaying scarlet spikes attracting hummingbirds in bog gardens, Joe Pye weed Gateway growing 5 feet with mauve-pink flowers supporting monarch butterflies, ostrich fern Matteuccia struthiopteris spreading via runners creating 4-foot tropical effect, and Japanese painted fern showing silver and burgundy fronds brightening shaded wet areas. " +
      "Combat fungal diseases prevalent in humid conditions through resistant varieties and cultural practices: grow Iron Lady tomatoes with triple disease resistance to late blight fusarium and verticillium, plant DMR-401 cucumbers resisting downy mildew maintaining production through wet summers, space plants widely improving air circulation reducing foliar diseases by 40%, apply preventive neem oil sprays weekly during humid periods, and remove lower leaves of tomatoes preventing soil splash spreading pathogens. " +
      "Develop specialized rain garden ecosystems managing excess water creatively: excavate depressions 6 inches deep with gentle slopes creating temporary pooling zones, amend with 30% organic matter improving structure while maintaining moisture, establish native wetland plants like blue flag iris and swamp milkweed, add stepping stone paths allowing garden access during wet periods, and incorporate overflow areas planted with water-tolerant grasses preventing erosion during extreme events. " +
      "Celebrate moisture with specialized plantings impossible in dry climates: establish moss gardens using cushion moss Leucobryum glaucum forming silvery-green mounds and sheet moss Hypnum creating velvety carpets, plant moisture-loving groundcovers including Ajuga Black Scallop with purple-black leaves and blue flower spikes, sweet woodruff Galium odoratum spreading fragrant whorled foliage under trees, Japanese forest grass Hakonechloa macra cascading golden foliage, and native wild ginger forming glossy heart-shaped carpets in deep shade. "
    );
  }

  // Specialized recommendations based on climate extremes
  if (frostDays > 100) {
    recommendations.push(
      "Frost Protection Essentials: With " + frostDays + " annual frost days, comprehensive protection strategies determine success differentiating thriving gardens from repeated crop failures during temperature fluctuations. " +
      "Assemble protective materials before frost season begins: floating row covers in three weights providing 4-degree protection for light frost 6-degree for moderate and 8-degree for severe conditions, old cotton bedsheets and blankets retaining earth's radiated heat better than synthetic materials, corrugated cardboard boxes for individual plant protection creating dead air insulation spaces, Christmas lights generating gentle heat when draped through sensitive plants, and water-filled wall-o-water tepees creating microclimate 10 degrees warmer enabling 6-week earlier tomato planting. " +
      "Position tender plants strategically utilizing microclimates: south-facing walls absorbing solar radiation during day releasing heat throughout night raising temperatures 5 degrees, large boulders and concrete surfaces acting as thermal mass moderating temperature swings, cold air drainage patterns avoiding frost pockets in valleys where cold air settles, overhead tree canopies reducing radiation heat loss providing 2-3 degrees protection, and proximity to water bodies moderating temperatures through thermal mass effect. " +
      "Monitor soil temperatures determining optimal planting times: use soil thermometers at 4-inch depth where roots develop checking at 8 AM for consistent readings, wait for 60 degrees Fahrenheit sustained 3 consecutive days before transplanting tomatoes peppers and eggplants, plant cucurbits when soil reaches 65 degrees ensuring rapid germination avoiding rot, cool-season crops tolerate 40-degree soil temperatures allowing 6-week earlier planting, and track soil temperature trends using digital loggers identifying microclimates warming earliest. " +
      "Select frost-resilient varieties extending harvest seasons: kale Winterbor surviving minus 10 degrees Celsius becoming sweeter after frost exposure through starch-to-sugar conversion, spinach Bloomsdale Long Standing tolerating 20 degree Fahrenheit temperatures maintaining quality, mache corn salad thriving at 5 degrees providing fresh salad greens all winter, claytonia miners lettuce self-sowing creating permanent winter green patches, and Asian greens including mizuna and tatsoi tolerating 25 degrees while growing actively. " +
      "Implement winter mulching strategies preventing soil heaving: wait until ground freezes solid 2 inches deep preventing rodent habitat creation, apply 4-6 inch layer of straw or shredded leaves around perennials avoiding crown rot, use evergreen boughs providing insulation while allowing air circulation, remove mulch gradually in spring as growth begins preventing premature sprouting, and maintain mulch-free zones around tree trunks preventing bark damage from moisture retention. "
    );
  }

  if (hotDays > 60) {
    recommendations.push(
      "Heat Stress Prevention: With " + hotDays + " days exceeding 30 degrees Celsius, protecting plants from heat stress through shading, cooling, and variety selection determines summer garden productivity and plant survival. " +
      "Engineer shade structures moderating extreme temperatures: install aluminet shade cloth on PVC or metal frames providing 30% shade for fruiting vegetables maintaining photosynthesis while reducing heat stress, use 50% shade for leafy greens preventing bolting and bitter flavors, orient shade structures east-west maximizing morning sun exposure while blocking intense afternoon radiation, incorporate retractable systems allowing adjustment based on weather conditions, and paint structures white reflecting additional heat away from growing areas. " +
      "Optimize irrigation timing and methods maximizing water effectiveness: apply 1-2 inches water weekly through drip irrigation or soaker hoses minimizing evaporation losses, water before 8 AM allowing plants to hydrate before heat stress begins, avoid overhead watering during hot periods preventing leaf scorch from magnified water droplets, monitor soil moisture at 6-inch depth where active roots exist, and apply anti-transpirant sprays reducing water loss through leaves by 30% during heat waves. " +
      "Select heat-adapted varieties thriving in extreme temperatures: Armenian cucumber Suyo Long producing 15-inch fruits remaining crisp and mild above 35 degrees Celsius, yard-long beans Red Noodle yielding continuously when regular beans fail in heat, Malabar spinach Red Stem providing heat-tolerant greens with ornamental red stems, cherry tomatoes Sun Gold maintaining fruit set above 90 degrees when large varieties abort flowers, and okra Clemson Spineless increasing production as temperatures rise above 85 degrees. " +
      "Implement cooling strategies reducing ambient temperatures: apply white or silver reflective mulch decreasing soil temperature 10 degrees while increasing lower canopy photosynthesis by 30%, install misting systems creating evaporative cooling dropping air temperature 10-20 degrees in dry climates, use shade paint or kaolin clay sprays on fruit trees reducing leaf temperature and sunburn damage, position oscillating fans improving air circulation preventing fungal diseases in humid heat, and create windbreaks reducing desiccating effects of hot dry winds. " +
      "Schedule garden activities avoiding heat stress for plants and gardeners: harvest vegetables early morning when water content peaks improving storage quality, transplant seedlings evening allowing overnight recovery before facing daytime heat, prune and train plants during cool periods minimizing stress responses, apply foliar feeds and pesticides early morning or late evening preventing leaf burn, and postpone major soil work until temperatures moderate avoiding soil structure damage when dry. "
    );
  }

  // Join all recommendations into a single comprehensive string
  return recommendations.join(" ");
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
