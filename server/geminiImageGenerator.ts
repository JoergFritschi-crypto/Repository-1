import { GoogleGenAI, Modality } from '@google/genai';
import fs from 'fs/promises';
import path from 'path';

// Gemini 2.5 Flash Image Preview (Nano Banana) - latest image generation model
const IMAGE_GENERATION_MODEL = "gemini-2.5-flash-image-preview";

interface GeminiImageOptions {
  prompt: string;
  plantName: string;
  imageType: 'thumbnail' | 'full' | 'detail';
}

interface GeminiEnhanceOptions {
  referenceImage: string; // base64 encoded image
  prompt: string;
  outputFileName?: string;
}

class GeminiImageGenerator {
  private ai: GoogleGenAI | null = null;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      this.ai = new GoogleGenAI({ apiKey });
    }
  }

  private shouldRetryError(error: any, attempt: number, maxAttempts: number): boolean {
    // Don't retry if we've reached max attempts
    if (attempt >= maxAttempts) return false;
    
    // Check for specific error types
    const errorMessage = error.message?.toLowerCase() || '';
    const errorStatus = error.status || error.response?.status;
    
    // Retry on 500/502/503 server errors
    if (errorStatus >= 500 && errorStatus < 600) {
      console.log(`Server error (${errorStatus}), will retry...`);
      return true;
    }
    
    // Retry on rate limiting (429)
    if (errorStatus === 429) {
      console.log('Rate limit hit, will retry with longer delay...');
      return true;
    }
    
    // Retry on network/timeout errors
    if (errorMessage.includes('network') || 
        errorMessage.includes('timeout') || 
        errorMessage.includes('econnrefused') ||
        errorMessage.includes('internal error')) {
      console.log('Network/Internal error detected, will retry...');
      return true;
    }
    
    // Don't retry on 400 bad request or other client errors
    if (errorStatus >= 400 && errorStatus < 500) {
      console.log(`Client error (${errorStatus}), not retrying.`);
      return false;
    }
    
    // Default: don't retry unknown errors
    return false;
  }

  private getErrorMessage(error: any, attempts: number): string {
    const errorMessage = error.message?.toLowerCase() || '';
    const errorStatus = error.status || error.response?.status;
    
    // Server errors
    if (errorStatus >= 500 || errorMessage.includes('internal error')) {
      return `The AI image service is temporarily unavailable after ${attempts} attempts. Please try again in a few moments.`;
    }
    
    // Rate limiting
    if (errorStatus === 429) {
      return 'Image generation rate limit reached. Please wait a moment before trying again.';
    }
    
    // Bad request
    if (errorStatus === 400) {
      return 'Invalid image generation request. Please check your input and try again.';
    }
    
    // Network errors
    if (errorMessage.includes('network') || errorMessage.includes('timeout')) {
      return 'Network error occurred while generating image. Please check your connection and try again.';
    }
    
    // API key issues
    if (errorMessage.includes('api key') || errorMessage.includes('unauthorized')) {
      return 'Gemini API authentication failed. Please contact support.';
    }
    
    // Default message
    return `Image generation failed after ${attempts} attempts: ${error.message}`;
  }

  private async waitWithBackoff(attempt: number, isRateLimit: boolean = false): Promise<void> {
    const baseDelays = [1000, 2000, 4000]; // Exponential backoff
    const rateDelays = [5000, 10000, 20000]; // Longer delays for rate limits
    
    const delays = isRateLimit ? rateDelays : baseDelays;
    const delay = delays[attempt - 1] || delays[delays.length - 1];
    
    console.log(`Waiting ${delay}ms before retry...`);
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  private createBotanicalPrompt(options: GeminiImageOptions): string {
    const { prompt, plantName, imageType } = options;
    
    // If custom prompt provided, enhance it
    if (prompt && prompt.length > 20) {
      return `Professional botanical photography: ${prompt}. Style: Natural garden photography, realistic, high detail, soft natural lighting, professional quality.`;
    }
    
    // Otherwise create type-specific prompts
    switch (imageType) {
      case 'thumbnail':
        return `Professional botanical photograph of ${plantName}. 
          Show: Single healthy specimen in natural garden setting, centered composition, clear view of characteristic features.
          Style: Clean background, soft natural lighting, vibrant colors, high detail, professional garden photography.
          Quality: Ultra-realistic, 4K quality, sharp focus on plant, slightly blurred natural background.`;
        
      case 'full':
        return `Professional garden photography of ${plantName} in landscape setting.
          Show: Multiple plants in natural garden environment, showing growth habit and mature size, garden context.
          Style: Wide angle view, golden hour lighting, natural garden design, professional landscape photography.
          Setting: Well-designed garden bed, complementary plants nearby, natural mulch or ground cover.
          Quality: Photorealistic, high resolution, professional gardening magazine quality.`;
        
      case 'detail':
        return `Extreme close-up macro photograph of ${plantName}.
          Focus: Detailed view of flowers, leaves, or distinctive features in sharp detail.
          Style: Botanical macro photography, shallow depth of field, soft diffused lighting.
          Details: Show texture, veining, color variations, botanical structures clearly.
          Quality: Ultra-sharp macro detail, professional botanical photography, scientific accuracy.`;
        
      default:
        return `Professional photograph of ${plantName} plant in natural garden setting. High quality, realistic, botanical accuracy.`;
    }
  }

  async generateImage(options: GeminiImageOptions): Promise<string> {
    if (!this.ai) {
      throw new Error('Gemini API key not configured');
    }

    const { plantName, imageType } = options;
    const prompt = this.createBotanicalPrompt(options);
    
    // Retry configuration
    const maxAttempts = 3;
    let attempts = 0;
    let lastError: any;
    
    while (attempts < maxAttempts) {
      try {
        attempts++;
        console.log(`Generating ${imageType} image for ${plantName} with Gemini (attempt ${attempts}/${maxAttempts})...`);
        
        // Generate image using the image generation model
        const response = await this.ai.models.generateContent({
          model: IMAGE_GENERATION_MODEL,
          contents: [{ 
            role: "user", 
            parts: [{ text: prompt }] 
          }],
          config: {
            responseModalities: [Modality.TEXT, Modality.IMAGE],
          },
        });

        const candidates = response.candidates;
        if (!candidates || candidates.length === 0) {
          throw new Error('No image generated in response');
        }

        const content = candidates[0].content;
        if (!content || !content.parts) {
          throw new Error('No content in response');
        }

        // Find the image part
        let imageData: string | null = null;
        for (const part of content.parts) {
          if (part.inlineData && part.inlineData.data) {
            imageData = part.inlineData.data;
            break;
          }
        }

        if (!imageData) {
          throw new Error('No image data in response');
        }

        // Convert base64 to buffer
        const imageBuffer = Buffer.from(imageData, 'base64');
        
        // Save to file system
        const timestamp = Date.now();
        const randomStr = Math.random().toString(36).substring(7);
        const fileName = `${plantName.toLowerCase().replace(/\s+/g, '-')}-${imageType}-${timestamp}-${randomStr}.png`;
        const filePath = path.join('public', 'generated', fileName);
        
        // Ensure directory exists
        await fs.mkdir(path.dirname(filePath), { recursive: true });
        
        // Write file
        await fs.writeFile(filePath, imageBuffer);
        
        console.log(`✅ Gemini (Nano Banana) generated ${imageType} image saved to ${filePath}`);
        
        // Return the path that can be served by the web server
        return `/generated/${fileName}`;
        
      } catch (error: any) {
        lastError = error;
        console.error(`Gemini image generation failed (attempt ${attempts}/${maxAttempts}):`, error.message);
        
        // Determine if we should retry based on error type
        const shouldRetry = this.shouldRetryError(error, attempts, maxAttempts);
        
        if (shouldRetry && attempts < maxAttempts) {
          const isRateLimit = error.status === 429;
          await this.waitWithBackoff(attempts, isRateLimit);
          continue;
        }
        
        // Max attempts reached or non-retryable error
        break;
      }
    }
    
    // Throw appropriate error with user-friendly message
    const errorMessage = this.getErrorMessage(lastError, attempts);
    throw new Error(errorMessage);
  }

  async generateImageWithReference(options: GeminiEnhanceOptions): Promise<string> {
    if (!this.ai) {
      throw new Error('Gemini API key not configured');
    }

    const { referenceImage, prompt, outputFileName } = options;
    
    // Retry configuration
    const maxAttempts = 3;
    let attempts = 0;
    let lastError: any;
    
    while (attempts < maxAttempts) {
      try {
        attempts++;
        console.log(`Enhancing image with Gemini using reference (attempt ${attempts}/${maxAttempts})...`);
        
        // Prepare the image data for Gemini
        // Remove data URL prefix if present
        const base64Data = referenceImage.replace(/^data:image\/\w+;base64,/, '');
        
        // Generate enhanced image using both text and image inputs
        const response = await this.ai.models.generateContent({
          model: IMAGE_GENERATION_MODEL,
          contents: [{ 
            role: "user", 
            parts: [
              { text: prompt },
              { 
                inlineData: {
                  mimeType: 'image/png',
                  data: base64Data
                }
              }
            ] 
          }],
          config: {
            responseModalities: [Modality.TEXT, Modality.IMAGE],
          },
        });

        const candidates = response.candidates;
        if (!candidates || candidates.length === 0) {
          throw new Error('No enhanced image generated in response');
        }

        const content = candidates[0].content;
        if (!content || !content.parts) {
          throw new Error('No content in response');
        }

        // Find the image part
        let imageData: string | null = null;
        for (const part of content.parts) {
          if (part.inlineData && part.inlineData.data) {
            imageData = part.inlineData.data;
            break;
          }
        }

        if (!imageData) {
          throw new Error('No enhanced image data in response');
        }

        // Convert base64 to buffer
        const imageBuffer = Buffer.from(imageData, 'base64');
        
        // Save to file system
        const timestamp = Date.now();
        const randomStr = Math.random().toString(36).substring(7);
        const fileName = outputFileName || `enhanced-garden-${timestamp}-${randomStr}.png`;
        const filePath = path.join('public', 'generated', fileName);
        
        // Ensure directory exists
        await fs.mkdir(path.dirname(filePath), { recursive: true });
        
        // Write file
        await fs.writeFile(filePath, imageBuffer);
        
        console.log(`✅ Gemini (Nano Banana) enhanced image saved to ${filePath}`);
        
        // Return the path that can be served by the web server
        return `/generated/${fileName}`;
        
      } catch (error: any) {
        lastError = error;
        console.error(`Gemini image enhancement failed (attempt ${attempts}/${maxAttempts}):`, error.message);
        
        // Determine if we should retry based on error type
        const shouldRetry = this.shouldRetryError(error, attempts, maxAttempts);
        
        if (shouldRetry && attempts < maxAttempts) {
          const isRateLimit = error.status === 429;
          await this.waitWithBackoff(attempts, isRateLimit);
          continue;
        }
        
        // Max attempts reached or non-retryable error
        break;
      }
    }
    
    // Throw appropriate error with user-friendly message
    const errorMessage = this.getErrorMessage(lastError, attempts);
    throw new Error(errorMessage);
  }
}

export const geminiImageGenerator = new GeminiImageGenerator();