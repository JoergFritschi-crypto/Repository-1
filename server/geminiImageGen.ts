import * as fs from "fs";
import * as path from "path";
import { GoogleGenAI, Modality } from "@google/genai";

// DON'T DELETE THIS COMMENT
// Follow these instructions when using this blueprint:
// - Note that the newest Gemini model series is "gemini-2.5-flash" or gemini-2.5-pro"
//   - do not change this unless explicitly requested by the user

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function generateGardenToolIcon(
  toolName: string,
  description: string,
  outputPath: string
): Promise<boolean> {
  try {
    // Create a detailed prompt for photorealistic 3D garden tool icons
    const prompt = `Create a photorealistic, 3D rendered icon of a ${toolName}. 

STYLE REQUIREMENTS:
- Photorealistic 3D rendering with professional lighting and shadows
- Clean white or transparent background suitable for icon use
- High detail showing craftsmanship and materials
- Sophisticated, premium garden tool aesthetic
- Perfect for use as an application icon

COLOR SCHEME (use these exact colors):
- British Racing Green: #004025 (dark forest green)
- Dark Spring Green: #107838 
- Dark Pastel Green: #1DB233
- Canary Yellow: #FFE523
- Gold: #FFD500

TOOL SPECIFICATIONS:
${description}

TECHNICAL REQUIREMENTS:
- 3D rendered appearance with depth and dimension
- Realistic materials: wood grain on handles, metal reflections on blades
- Professional product photography lighting
- Sharp focus throughout
- Icon-suitable composition (centered, clear silhouette)
- High contrast for visibility at small sizes

Create a beautiful, artistic representation that captures the elegance and craftsmanship of traditional English garden tools.`;

    console.log(`Generating ${toolName} icon with Gemini...`);

    // IMPORTANT: only this gemini model supports image generation
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash-preview-image-generation",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        responseModalities: [Modality.TEXT, Modality.IMAGE],
      },
    });

    const candidates = response.candidates;
    if (!candidates || candidates.length === 0) {
      console.error(`No candidates returned for ${toolName}`);
      return false;
    }

    const content = candidates[0].content;
    if (!content || !content.parts) {
      console.error(`No content parts returned for ${toolName}`);
      return false;
    }

    let imageGenerated = false;
    for (const part of content.parts) {
      if (part.text) {
        console.log(`Description for ${toolName}:`, part.text);
      } else if (part.inlineData && part.inlineData.data) {
        // Ensure the directory exists
        const dir = path.dirname(outputPath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }

        const imageData = Buffer.from(part.inlineData.data, "base64");
        fs.writeFileSync(outputPath, imageData);
        console.log(`${toolName} icon saved as ${outputPath}`);
        imageGenerated = true;
      }
    }

    return imageGenerated;
  } catch (error) {
    console.error(`Failed to generate ${toolName} icon:`, error);
    return false;
  }
}

export async function generateGardenToolIconSet(): Promise<{
  success: boolean;
  generatedIcons: string[];
  errors: string[];
}> {
  const icons = [
    {
      name: "watering-can",
      description: `Classic long-spout watering can with brass fittings. British racing green metal body with gold brass spout, handle, and top handle. Elegant curves, realistic water droplets. Traditional English garden style with premium craftsmanship details.`
    },
    {
      name: "garden-spade", 
      description: `Professional garden spade with ash wood handle in natural gold/canary tones. British racing green metal blade with sharp cutting edge. Green grip wrap on handle. Step bar for foot placement. Traditional D-handle design.`
    },
    {
      name: "garden-fork",
      description: `Three-tine garden fork with wooden handle in gold tones. British racing green metal head and tines. Green grip wrap. Varying tine lengths. Professional forged steel construction with realistic metal reflections.`
    },
    {
      name: "plant-pot",
      description: `Terracotta plant pot in British racing green with gold rim. Realistic ceramic texture. Planted with small green plants with canary yellow leaves. Rich soil visible. Professional pottery craftsmanship.`
    },
    {
      name: "pruning-shears",
      description: `Professional pruning shears with ergonomic handles in gold tones. British racing green metal blades with sharp cutting edges. Brass pivot mechanism. Return spring. Premium garden tool craftsmanship.`
    },
    {
      name: "garden-rake",
      description: `Seven-tine garden rake with ash wood handle in gold tones. British racing green metal head and tines. Varying tine heights. Professional forged construction with metal reflections.`
    },
    {
      name: "hand-trowel",
      description: `Hand trowel with curved wooden handle in gold tones. British racing green pointed metal blade. Brass ferrule connection. Sharp cutting edge with metallic shine. Perfect for detailed planting work.`
    },
    {
      name: "garden-hoe",
      description: `Garden hoe with long wooden handle in gold tones. British racing green rectangular blade positioned at angle. Sharp cutting edge for weeding. Traditional English garden tool design.`
    },
    {
      name: "seed-packet",
      description: `Vintage seed packet with paper texture in cream background. Gold metallic top seal. British racing green botanical illustrations of plants. Realistic seeds visible. Traditional gardening aesthetic.`
    }
  ];

  const generatedIcons: string[] = [];
  const errors: string[] = [];

  for (const icon of icons) {
    const outputPath = `client/public/generated-icons/${icon.name}.png`;
    
    try {
      const success = await generateGardenToolIcon(icon.name, icon.description, outputPath);
      if (success) {
        generatedIcons.push(icon.name);
        console.log(`✅ Successfully generated ${icon.name}`);
      } else {
        errors.push(`Failed to generate ${icon.name}`);
        console.log(`❌ Failed to generate ${icon.name}`);
      }
    } catch (error) {
      const errorMsg = `Error generating ${icon.name}: ${error}`;
      errors.push(errorMsg);
      console.error(`❌ ${errorMsg}`);
    }

    // Small delay between requests to be respectful to the API
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  return {
    success: generatedIcons.length > 0,
    generatedIcons,
    errors
  };
}