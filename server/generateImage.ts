// AI Image Generation with Multiple Fallback Options
import { huggingfaceOptimized } from './huggingfaceOptimized';
import { runwareImageGenerator } from './runwareImageGenerator';
import { geminiImageGenerator } from './geminiImageGenerator';

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
  
  console.log(`=== AI Image Generation ===`);
  console.log(`Plant: ${plantName}`);
  console.log(`Type: ${imageType}`);
  
  // Try Gemini first - newest and best quality
  if (process.env.GEMINI_API_KEY) {
    try {
      const imagePath = await geminiImageGenerator.generateImage({
        prompt: prompt || plantName,
        plantName,
        imageType
      });
      console.log(`✅ Success with Gemini (Nano Banana)`);
      return imagePath;
    } catch (error: any) {
      console.log(`Gemini failed: ${error.message}, trying fallback...`);
    }
  }
  
  // Try Runware as second option
  if (process.env.RUNWARE_API_KEY) {
    try {
      const imagePath = await runwareImageGenerator.generateImage({
        prompt: prompt || plantName,
        plantName,
        imageType,
        approach: 'garden'  // Always use garden approach for natural, realistic images
      });
      console.log(`✅ Success with Runware`);
      return imagePath;
    } catch (error: any) {
      console.log(`Runware failed: ${error.message}, trying fallback...`);
    }
  }
  
  // Fallback to HuggingFace if others fail
  if (process.env.HUGGINGFACE_API_KEY) {
    try {
      const imagePath = await huggingfaceOptimized.generateImage({
        prompt: prompt || plantName,
        plantName,
        imageType
      });
      console.log(`✅ Success with HuggingFace`);
      return imagePath;
    } catch (error: any) {
      console.log(`HuggingFace failed: ${error.message}`);
    }
  }
  
  throw new Error("No image generation service available or all services failed. Please ensure API keys are configured.");
}