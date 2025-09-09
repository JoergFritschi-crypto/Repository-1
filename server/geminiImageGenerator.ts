import { GoogleGenerativeAI } from '@google/genai';
import fs from 'fs/promises';
import path from 'path';

interface GeminiImageOptions {
  prompt: string;
  plantName: string;
  imageType: 'thumbnail' | 'full' | 'detail';
}

class GeminiImageGenerator {
  private genAI: GoogleGenerativeAI | null = null;

  constructor() {
    const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
    if (apiKey) {
      this.genAI = new GoogleGenerativeAI(apiKey);
    }
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
    if (!this.genAI) {
      throw new Error('Gemini API key not configured');
    }

    const { plantName, imageType } = options;
    const prompt = this.createBotanicalPrompt(options);
    
    try {
      // Use the new Gemini 2.5 Flash Image Preview model (Nano Banana)
      const model = this.genAI.getGenerativeModel({ 
        model: "gemini-2.0-flash-preview-image-generation"  // Using the stable version first
      });

      console.log(`Generating ${imageType} image for ${plantName} with Gemini...`);
      
      // Generate image with text prompt
      const result = await model.generateContent({
        contents: [{
          role: 'user',
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          responseMimeType: 'image/png',
          temperature: 0.7,  // Balanced between creativity and accuracy
        }
      });

      const response = await result.response;
      
      // Extract image data from response
      if (!response.candidates?.[0]?.content?.parts?.[0]) {
        throw new Error('No image generated in response');
      }

      const imagePart = response.candidates[0].content.parts[0];
      
      // Check if we have inline data (base64)
      if (!imagePart.inlineData?.data) {
        throw new Error('No image data in response');
      }

      // Convert base64 to buffer
      const imageBuffer = Buffer.from(imagePart.inlineData.data, 'base64');
      
      // Save to file system
      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substring(7);
      const fileName = `${plantName.toLowerCase().replace(/\s+/g, '-')}-${imageType}-${timestamp}-${randomStr}.png`;
      const filePath = path.join('public', 'generated', fileName);
      
      // Ensure directory exists
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      
      // Write file
      await fs.writeFile(filePath, imageBuffer);
      
      console.log(`✅ Gemini generated ${imageType} image saved to ${filePath}`);
      
      // Return the path that can be served by the web server
      return `/generated/${fileName}`;
      
    } catch (error: any) {
      console.error('Gemini image generation failed:', error);
      throw new Error(`Gemini image generation failed: ${error.message}`);
    }
  }
}

export const geminiImageGenerator = new GeminiImageGenerator();