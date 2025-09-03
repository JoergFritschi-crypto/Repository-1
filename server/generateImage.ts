// Production AI Image Generation - Fast & Reliable
import { productionImageGenerator } from './productionImageGenerator';

interface GenerateImageOptions {
  prompt: string;
  aspectRatio?: "1:1" | "3:4" | "4:3" | "9:16" | "16:9";
  oneLine: string;
}

export async function generateImage(options: GenerateImageOptions): Promise<string> {
  const { prompt, oneLine } = options;
  
  // Determine image type from context
  let imageType: 'thumbnail' | 'full' | 'detail' = 'thumbnail';
  const lowerLine = oneLine.toLowerCase();
  
  if (lowerLine.includes('full') || lowerLine.includes('garden view')) {
    imageType = 'full';
  } else if (lowerLine.includes('detail') || lowerLine.includes('close')) {
    imageType = 'detail';
  }
  
  // Extract plant name
  const plantName = oneLine
    .replace(/thumbnail|full|detail|garden view/gi, '')
    .trim() || oneLine;
  
  // Generate production image
  const imagePath = await productionImageGenerator.generateImage({
    prompt: prompt || plantName,
    plantName,
    imageType
  });
  
  return imagePath;
}

// Helper function to delete old images
export async function deleteOldImages(imagePaths: (string | null)[]): Promise<void> {
  const fs = await import('fs/promises');
  const path = await import('path');
  
  for (const imagePath of imagePaths) {
    if (!imagePath) continue;
    
    try {
      const fullPath = path.join(process.cwd(), "client", "public", imagePath.replace(/^\//, ""));
      await fs.unlink(fullPath);
      console.log(`Deleted old image: ${imagePath}`);
    } catch (error) {
      console.log(`Could not delete: ${imagePath}`);
    }
  }
}