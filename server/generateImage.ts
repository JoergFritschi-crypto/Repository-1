import fs from "fs/promises";
import path from "path";
import { HuggingFaceAPI } from "./externalAPIs";

interface GenerateImageOptions {
  prompt: string;
  aspectRatio?: "1:1" | "3:4" | "4:3" | "9:16" | "16:9";
  oneLine: string;
}

export async function generateImage(options: GenerateImageOptions): Promise<string> {
  const { prompt, aspectRatio = "1:1", oneLine } = options;

  // Create a directory for generated images if it doesn't exist
  const imagesDir = path.join(process.cwd(), "client", "public", "generated-images");
  await fs.mkdir(imagesDir, { recursive: true });

  // Generate a unique filename
  const timestamp = Date.now();
  const randomId = Math.random().toString(36).substring(2, 9);
  const filename = `plant-${timestamp}-${randomId}.png`;
  const filepath = path.join(imagesDir, filename);

  try {
    // Check if HuggingFace API is configured
    if (!process.env.HUGGINGFACE_API_KEY) {
      throw new Error("HuggingFace API key not configured");
    }

    // Initialize HuggingFace API
    const huggingFaceAPI = new HuggingFaceAPI(process.env.HUGGINGFACE_API_KEY);
    
    // Enhance prompt for better botanical image generation
    const enhancedPrompt = `${prompt}, high quality, detailed botanical photography, professional lighting, sharp focus, 8k resolution`;
    
    // Generate image using HuggingFace FLUX model
    console.log(`Generating image for: ${oneLine}`);
    const imageBuffer = await huggingFaceAPI.generateImage(enhancedPrompt);
    
    if (!imageBuffer) {
      throw new Error("Failed to generate image from HuggingFace API");
    }

    // Save the generated image
    await fs.writeFile(filepath, imageBuffer);
    console.log(`Image saved to: ${filepath}`);
    
  } catch (error) {
    console.error("Error generating image with HuggingFace:", error);
    
    // Fallback to placeholder if real generation fails
    console.log("Falling back to placeholder image");
    const placeholderPNG = Buffer.from([
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,  // PNG signature
      0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,  // IHDR chunk
      0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
      0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4,
      0x89, 0x00, 0x00, 0x00, 0x0B, 0x49, 0x44, 0x41,  // IDAT chunk
      0x54, 0x78, 0x9C, 0x62, 0x00, 0x01, 0x00, 0x00,
      0x05, 0x00, 0x01, 0x0D, 0x0A, 0x2D, 0xB4, 0x00,  // IEND chunk
      0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE,
      0x42, 0x60, 0x82
    ]);
    await fs.writeFile(filepath, placeholderPNG);
  }

  // Return the public path
  return `/generated-images/${filename}`;
}

// Helper function to delete old images when generating new ones
export async function deleteOldImages(imagePaths: (string | null)[]): Promise<void> {
  for (const imagePath of imagePaths) {
    if (!imagePath) continue;
    
    try {
      const fullPath = path.join(process.cwd(), "client", "public", imagePath.replace(/^\//, ""));
      await fs.unlink(fullPath);
    } catch (error) {
      // Image might not exist, that's okay
      console.log(`Could not delete old image: ${imagePath}`);
    }
  }
}