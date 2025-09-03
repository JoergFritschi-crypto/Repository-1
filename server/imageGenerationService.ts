import { db } from "./db";
import { plants, imageGenerationQueue } from "@shared/schema";
import { eq, and, or, lt, desc, isNull, sql } from "drizzle-orm";
import { generateImage } from "./generateImage";

const GENERATION_DELAY_MS = 10000; // 10 seconds between generations to avoid overwhelming the AI
const MAX_CONCURRENT_GENERATIONS = 1;
const STUCK_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

export class ImageGenerationService {
  private isProcessing = false;
  private processingCount = 0;

  // Alias for route compatibility
  async queuePlantForGeneration(plantId: string, priority: number = 0) {
    return this.queuePlantImages(plantId, priority);
  }

  // Queue image generation for a plant
  async queuePlantImages(plantId: string, priority: number = 0) {
    const plant = await db.select().from(plants).where(eq(plants.id, plantId)).limit(1);
    if (!plant.length) {
      throw new Error("Plant not found");
    }

    // Clear any existing pending items for this plant
    await db.delete(imageGenerationQueue)
      .where(and(
        eq(imageGenerationQueue.plantId, plantId),
        eq(imageGenerationQueue.status, "pending")
      ));

    // Add all three image types to the queue
    const imageTypes = ["thumbnail", "full", "detail"];
    const queueItems = imageTypes.map((type, index) => ({
      plantId,
      imageType: type,
      priority,
      scheduledFor: new Date(Date.now() + index * GENERATION_DELAY_MS)
    }));

    await db.insert(imageGenerationQueue).values(queueItems);

    // Update plant status
    await db.update(plants)
      .set({
        imageGenerationStatus: "queued",
        imageGenerationAttempts: 0,
        imageGenerationError: null
      })
      .where(eq(plants.id, plantId));

    // Start processing if not already running
    this.startProcessing();
  }

  // Start processing the queue
  async startProcessing() {
    if (this.isProcessing) {
      return;
    }

    this.isProcessing = true;
    
    while (true) {
      if (this.processingCount >= MAX_CONCURRENT_GENERATIONS) {
        await this.sleep(1000);
        continue;
      }

      const nextItem = await this.getNextQueueItem();
      if (!nextItem) {
        // No items to process, stop processing
        this.isProcessing = false;
        break;
      }

      // Process item asynchronously
      this.processQueueItem(nextItem.id).catch(err => {
        console.error("Error processing queue item:", err);
      });

      // Wait before checking for next item
      await this.sleep(GENERATION_DELAY_MS);
    }
  }

  // Get the next item from the queue
  private async getNextQueueItem() {
    const now = new Date();
    
    const items = await db.select()
      .from(imageGenerationQueue)
      .where(and(
        eq(imageGenerationQueue.status, "pending"),
        or(
          isNull(imageGenerationQueue.scheduledFor),
          lt(imageGenerationQueue.scheduledFor, now)
        )
      ))
      .orderBy(desc(imageGenerationQueue.priority), imageGenerationQueue.createdAt)
      .limit(1);

    return items[0];
  }

  // Process a single queue item
  private async processQueueItem(queueId: string) {
    this.processingCount++;

    try {
      // Mark as processing
      await db.update(imageGenerationQueue)
        .set({
          status: "processing",
          startedAt: new Date()
        })
        .where(eq(imageGenerationQueue.id, queueId));

      // Get queue item with plant details
      const [queueItem] = await db.select({
        queue: imageGenerationQueue,
        plant: plants
      })
        .from(imageGenerationQueue)
        .leftJoin(plants, eq(imageGenerationQueue.plantId, plants.id))
        .where(eq(imageGenerationQueue.id, queueId));

      if (!queueItem || !queueItem.plant) {
        throw new Error("Plant not found for queue item");
      }

      // Generate appropriate prompt based on image type
      const prompt = this.generatePrompt(queueItem.plant, queueItem.queue.imageType);

      // Delete old image if it exists
      const { deleteOldImages } = await import("./generateImage");
      if (queueItem.queue.imageType === "thumbnail" && queueItem.plant.thumbnailImage) {
        await deleteOldImages([queueItem.plant.thumbnailImage]);
      } else if (queueItem.queue.imageType === "full" && queueItem.plant.fullImage) {
        await deleteOldImages([queueItem.plant.fullImage]);
      } else if (queueItem.queue.imageType === "detail" && queueItem.plant.detailImage) {
        await deleteOldImages([queueItem.plant.detailImage]);
      }

      // Generate the image
      const imagePath = await generateImage({
        prompt,
        aspectRatio: queueItem.queue.imageType === "thumbnail" ? "1:1" : "3:4",
        oneLine: `${queueItem.plant.commonName} ${queueItem.queue.imageType}`
      });

      // Update queue item
      await db.update(imageGenerationQueue)
        .set({
          status: "completed",
          generatedImagePath: imagePath,
          completedAt: new Date()
        })
        .where(eq(imageGenerationQueue.id, queueId));

      // Update plant with the generated image
      const updateData: any = {
        imageGenerationStatus: "completed",
        imageGenerationCompletedAt: new Date(),
        lastImageGenerationAt: new Date()
      };

      if (queueItem.queue.imageType === "thumbnail") {
        updateData.thumbnailImage = imagePath;
      } else if (queueItem.queue.imageType === "full") {
        updateData.fullImage = imagePath;
      } else if (queueItem.queue.imageType === "detail") {
        updateData.detailImage = imagePath;
      }

      // Check if all images are complete
      const remainingItems = await db.select()
        .from(imageGenerationQueue)
        .where(and(
          eq(imageGenerationQueue.plantId, queueItem.plant.id),
          eq(imageGenerationQueue.status, "pending")
        ));

      if (remainingItems.length === 0) {
        updateData.imageGenerationStatus = "completed";
      }

      await db.update(plants)
        .set(updateData)
        .where(eq(plants.id, queueItem.plant.id));

    } catch (error) {
      console.error("Error generating image:", error);
      
      // Update queue item with error
      await db.update(imageGenerationQueue)
        .set({
          status: "failed",
          errorMessage: error instanceof Error ? error.message : "Unknown error",
          completedAt: new Date()
        })
        .where(eq(imageGenerationQueue.id, queueId));

      // Update plant status
      const [queueItem] = await db.select()
        .from(imageGenerationQueue)
        .where(eq(imageGenerationQueue.id, queueId));

      if (queueItem) {
        await db.update(plants)
          .set({
            imageGenerationStatus: "failed",
            imageGenerationError: error instanceof Error ? error.message : "Unknown error",
            imageGenerationAttempts: (queueItem.retryCount || 0) + 1
          })
          .where(eq(plants.id, queueItem.plantId));
      }
    } finally {
      this.processingCount--;
    }
  }

  // Generate appropriate prompt for the image type
  private generatePrompt(plant: any, imageType: string): string {
    const baseInfo = `${plant.commonName || plant.scientificName}, ${plant.family || "ornamental plant"}`;
    
    switch (imageType) {
      case "thumbnail":
        return `Professional botanical illustration of ${baseInfo}, isolated on pure white background, single healthy specimen, botanical art style with detailed leaf veins and structure, scientific accuracy, watercolor style, no text or labels`;
      
      case "full":
        return `Beautiful mature ${baseInfo} growing in an English cottage garden, showing entire plant from soil to top, ${plant.dimension ? `approximately ${JSON.stringify(plant.dimension)} in size,` : ""} ${plant.flowerColor ? `vibrant ${Array.isArray(plant.flowerColor) ? plant.flowerColor.join(" and ") : plant.flowerColor} flowers in full bloom,` : ""} ${plant.leafColor ? `healthy ${Array.isArray(plant.leafColor) ? plant.leafColor.join(" and ") : plant.leafColor} foliage,` : ""} photorealistic, golden hour lighting, professional garden photography`;
      
      case "detail":
        return `Stunning macro close-up of ${baseInfo} ${plant.flowerColor ? `showing ${Array.isArray(plant.flowerColor) ? plant.flowerColor.join(" and ") : plant.flowerColor} colored flowers` : "flowers"} and ${plant.leafColor ? `${Array.isArray(plant.leafColor) ? plant.leafColor.join(" and ") : plant.leafColor}` : ""} leaves, extreme detail showing texture and veins, bokeh background, professional macro lens photography, morning dew drops, ultra sharp focus`;
      
      default:
        return `Beautiful ${baseInfo} plant in English garden setting, photorealistic, professional photography`;
    }
  }

  // Find and retry stuck images
  async retryStuckImages() {
    const stuckThreshold = new Date(Date.now() - STUCK_THRESHOLD_MS);
    
    const stuckItems = await db.update(imageGenerationQueue)
      .set({
        status: "pending",
        retryCount: 0,
        scheduledFor: new Date()
      })
      .where(and(
        eq(imageGenerationQueue.status, "processing"),
        lt(imageGenerationQueue.startedAt!, stuckThreshold)
      ))
      .returning();

    if (stuckItems.length > 0) {
      console.log(`Reset ${stuckItems.length} stuck image generation items`);
      this.startProcessing();
    }

    return stuckItems.length;
  }

  // Get generation status for monitoring dashboard
  async getGenerationStatus() {
    const [totalPlantsResult] = await db.select({ count: sql<number>`count(*)` })
      .from(plants);
    
    // Count plants with ALL images (thumbnail, full, and detail)
    const [withImagesResult] = await db.select({ count: sql<number>`count(*)` })
      .from(plants)
      .where(and(
        sql`${plants.thumbnailImage} IS NOT NULL`,
        sql`${plants.fullImage} IS NOT NULL`,
        sql`${plants.detailImage} IS NOT NULL`
      ));
    
    // Count plants without ANY images
    const [withoutImagesResult] = await db.select({ count: sql<number>`count(*)` })
      .from(plants)
      .where(and(
        sql`${plants.thumbnailImage} IS NULL`,
        sql`${plants.fullImage} IS NULL`,
        sql`${plants.detailImage} IS NULL`
      ));

    // Get queue counts
    const [queuedResult] = await db.select({ count: sql<number>`count(*)` })
      .from(imageGenerationQueue)
      .where(eq(imageGenerationQueue.status, "pending"));
      
    const [processingResult] = await db.select({ count: sql<number>`count(*)` })
      .from(imageGenerationQueue)
      .where(eq(imageGenerationQueue.status, "processing"));
    
    const [completedQueueResult] = await db.select({ count: sql<number>`count(*)` })
      .from(imageGenerationQueue)
      .where(eq(imageGenerationQueue.status, "completed"));
      
    const [failedQueueResult] = await db.select({ count: sql<number>`count(*)` })
      .from(imageGenerationQueue)
      .where(eq(imageGenerationQueue.status, "failed"));

    const recentActivity = await this.getRecentActivity(10);

    const totalPlants = totalPlantsResult?.count || 0;
    const withImages = withImagesResult?.count || 0;
    const withoutImages = withoutImagesResult?.count || 0;
    const queued = queuedResult?.count || 0;
    const processing = processingResult?.count || 0;
    const completedQueue = completedQueueResult?.count || 0;
    const failedQueue = failedQueueResult?.count || 0;

    // Calculate actual completed plants (those with ALL their images done)
    const completed = withImages;
    
    // Calculate plants currently generating (have pending or processing items)
    const generating = processing > 0 ? 1 : 0; // Simplified: if anything is processing

    return {
      totalPlants,
      withImages,
      withoutImages,
      completed,
      generating,
      queued,
      failed: failedQueue,
      recentActivity: recentActivity.map(a => ({
        type: a.status === "completed" ? "success" : a.status === "failed" ? "error" : "info",
        message: `${a.plantName || "Plant"} ${a.imageType} image ${a.status}`,
        timestamp: a.completedAt || a.startedAt || a.createdAt
      }))
    };
  }

  // Get detailed queue status for monitoring
  async getQueueStatus() {
    const queueItems = await db.select({
      id: imageGenerationQueue.id,
      plantId: imageGenerationQueue.plantId,
      plantName: plants.commonName,
      scientificName: plants.scientificName,
      imageType: imageGenerationQueue.imageType,
      status: imageGenerationQueue.status,
      priority: imageGenerationQueue.priority,
      scheduledFor: imageGenerationQueue.scheduledFor,
      startedAt: imageGenerationQueue.startedAt,
      completedAt: imageGenerationQueue.completedAt,
      retryCount: imageGenerationQueue.retryCount,
      errorMessage: imageGenerationQueue.errorMessage,
      createdAt: imageGenerationQueue.createdAt
    })
      .from(imageGenerationQueue)
      .leftJoin(plants, eq(imageGenerationQueue.plantId, plants.id))
      .orderBy(desc(imageGenerationQueue.priority), imageGenerationQueue.createdAt);

    // Calculate positions for pending items
    let position = 1;
    const items = queueItems.map(item => {
      const result = {
        id: item.id,
        plantId: item.plantId,
        plantName: item.plantName || item.scientificName || 'Unknown Plant',
        imageType: item.imageType,
        status: item.status,
        priority: item.priority,
        scheduledFor: item.scheduledFor,
        startedAt: item.startedAt,
        completedAt: item.completedAt,
        retryCount: item.retryCount,
        position: item.status === 'pending' ? position : null,
        progress: item.status === 'processing' ? {
          current: item.imageType === 'thumbnail' ? 1 : item.imageType === 'full' ? 2 : 3,
          total: 3
        } : null,
        error: item.errorMessage
      };
      
      if (item.status === 'pending') {
        position++;
      }
      
      return result;
    });

    return {
      items,
      counts: {
        pending: items.filter(i => i.status === 'pending').length,
        processing: items.filter(i => i.status === 'processing').length,
        completed: items.filter(i => i.status === 'completed').length,
        failed: items.filter(i => i.status === 'failed').length
      }
    };
  }

  // Get recent generation activity
  async getRecentActivity(limit: number = 20) {
    return await db.select({
      id: imageGenerationQueue.id,
      plantId: imageGenerationQueue.plantId,
      plantName: plants.commonName,
      imageType: imageGenerationQueue.imageType,
      status: imageGenerationQueue.status,
      errorMessage: imageGenerationQueue.errorMessage,
      startedAt: imageGenerationQueue.startedAt,
      completedAt: imageGenerationQueue.completedAt,
      createdAt: imageGenerationQueue.createdAt
    })
      .from(imageGenerationQueue)
      .leftJoin(plants, eq(imageGenerationQueue.plantId, plants.id))
      .orderBy(desc(imageGenerationQueue.createdAt))
      .limit(limit);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const imageGenerationService = new ImageGenerationService();