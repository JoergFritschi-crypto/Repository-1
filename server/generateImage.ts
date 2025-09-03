import { replitImageGenerator } from './replitImageGenerator';

interface GenerateImageOptions {
  prompt: string;
  aspectRatio?: "1:1" | "3:4" | "4:3" | "9:16" | "16:9";
  oneLine: string;
}

export async function generateImage(options: GenerateImageOptions): Promise<string> {
  const { prompt, oneLine, aspectRatio = "1:1" } = options;
  
  console.log(`Production image generation for: ${oneLine}`);
  
  // Determine image type from the context
  let imageType: 'thumbnail' | 'full' | 'detail' = 'thumbnail';
  const lowerLine = oneLine.toLowerCase();
  
  if (lowerLine.includes('full') || lowerLine.includes('garden view')) {
    imageType = 'full';
  } else if (lowerLine.includes('detail') || lowerLine.includes('close')) {
    imageType = 'detail';
  }
  
  // Extract plant name from the oneLine
  const plantName = oneLine
    .replace(/thumbnail|full|detail|garden view/gi, '')
    .trim();
  
  // Use the production-ready image generator
  try {
    const imagePath = await replitImageGenerator.generatePlantImage({
      prompt,
      plantName: plantName || oneLine,
      imageType,
      aspectRatio
    });
    
    console.log(`Successfully generated: ${imagePath}`);
    return imagePath;
  } catch (error) {
    console.error('Image generation failed:', error);
    
    // Emergency fallback - return a simple placeholder path
    // This should rarely happen with our robust pipeline
    return `/generated-images/placeholder-${Date.now()}.png`;
  }
}

// Helper function to delete old images when generating new ones
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
      // Image might not exist, that's okay
      console.log(`Could not delete old image: ${imagePath}`);
    }
  }
}