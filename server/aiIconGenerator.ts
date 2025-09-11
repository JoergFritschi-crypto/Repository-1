import * as fs from "fs";
import * as path from "path";
import { GoogleGenAI, Modality } from "@google/genai";

// From the Gemini integration blueprint
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export interface GardenToolIconRequest {
  toolName: string;
  description: string;
  colorScheme: string;
}

export async function generateGardenToolIcon(
  toolName: string,
  description: string,
  outputPath: string
): Promise<void> {
  try {
    // Craft a detailed prompt for photorealistic 3D garden tool icons
    const prompt = `Create a photorealistic, highly detailed 3D rendered icon of a ${toolName}. 

STYLE REQUIREMENTS:
- Photorealistic 3D rendering with professional lighting and shadows
- High-quality icon suitable for digital interfaces (clean, recognizable at small sizes)
- Studio lighting with soft shadows and realistic materials
- Sharp focus with subtle depth of field

TOOL DETAILS: ${description}

COLOR SCHEME (MANDATORY):
- British Racing Green (#004025) - for metal parts and main construction
- Dark Spring Green (#107838) - for secondary metal elements  
- Dark Pastel Green (#1DB233) - for accent details
- Bright Gold (#FFD500) - for brass fittings, handles, decorative elements
- Canary Yellow (#FFE523) - for highlights and metallic reflections

MATERIAL SPECIFICATIONS:
- Wooden handles: Natural ash wood with visible grain, golden honey color with brass ferrules
- Metal parts: British racing green powder-coated steel with realistic wear patterns
- Brass elements: Polished brass fittings with natural patina and warm gold tones
- Realistic surface textures: metal scratches, wood grain, brass oxidation

COMPOSITION:
- Single tool positioned at 3/4 angle for depth
- Clean white background with subtle drop shadow
- Tool should fill 70% of frame
- Professional product photography style
- Icon-appropriate clarity and contrast

LIGHTING:
- Studio lighting setup with key light from upper left
- Soft fill lighting to reduce harsh shadows  
- Rim lighting to separate tool from background
- Realistic material reflections and specularity

The result should look like a premium, hand-crafted English garden tool photographed for a luxury gardening catalog.`;

    console.log(`Generating ${toolName} icon with Gemini 2.0 Flash...`);

    // IMPORTANT: only gemini-2.0-flash-preview-image-generation model supports image generation
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash-preview-image-generation",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        responseModalities: [Modality.TEXT, Modality.IMAGE],
      },
    });

    const candidates = response.candidates;
    if (!candidates || candidates.length === 0) {
      throw new Error("No image generated");
    }

    const content = candidates[0].content;
    if (!content || !content.parts) {
      throw new Error("No content in response");
    }

    let imageSaved = false;
    for (const part of content.parts) {
      if (part.text) {
        console.log(`Gemini description: ${part.text}`);
      } else if (part.inlineData && part.inlineData.data) {
        const imageData = Buffer.from(part.inlineData.data, "base64");
        
        // Ensure directory exists
        const dir = path.dirname(outputPath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        
        fs.writeFileSync(outputPath, imageData);
        console.log(`${toolName} icon saved as ${outputPath}`);
        imageSaved = true;
      }
    }

    if (!imageSaved) {
      throw new Error("No image data found in response");
    }

  } catch (error) {
    console.error(`Failed to generate ${toolName} icon:`, error);
    throw new Error(`Failed to generate ${toolName} icon: ${error}`);
  }
}

export const gardenToolPrompts: GardenToolIconRequest[] = [
  {
    toolName: "Garden Spade",
    description: "Traditional digging spade with D-shaped wooden handle, brass ferrule, and sharp pointed steel blade. Classic English garden tool with step bar for foot pressure.",
    colorScheme: "British racing green blade, golden ash handle, brass fittings"
  },
  {
    toolName: "Garden Fork",
    description: "Three-tine garden fork with wooden handle and brass collar. Sturdy steel tines for soil cultivation and turning compost. Professional quality construction.",
    colorScheme: "British racing green tines and head, golden ash handle, brass ferrule"
  },
  {
    toolName: "Garden Rake",
    description: "Steel rake with multiple curved tines and long wooden handle. Perfect for leveling soil and gathering leaves. Heavy-duty construction with brass fittings.",
    colorScheme: "British racing green head and tines, golden ash handle, brass collar"
  },
  {
    toolName: "Terracotta Plant Pot",
    description: "Classic terracotta pot with drainage hole and decorative rim. Natural clay color with brass accent band. Perfect for herbs and small plants.",
    colorScheme: "Natural terracotta with brass decorative rim and accent details"
  },
  {
    toolName: "Watering Can",
    description: "Traditional long-spout watering can with curved handle and rose attachment. Classic galvanized steel construction with brass fittings and spout.",
    colorScheme: "British racing green body, brass spout and fittings, golden handle"
  },
  {
    toolName: "Hand Trowel",
    description: "Precision hand trowel with ergonomic wooden handle and narrow pointed blade. Perfect for planting bulbs and detailed garden work.",
    colorScheme: "British racing green blade, golden ash handle, brass ferrule"
  },
  {
    toolName: "Pruning Shears",
    description: "Professional bypass pruning shears with curved blades and ergonomic handles. Spring-loaded action with brass pivot mechanism.",
    colorScheme: "British racing green blades, golden handles, brass pivot and spring"
  },
  {
    toolName: "Garden Hoe",
    description: "Wide-blade garden hoe with long handle for weeding and soil cultivation. Sharp cutting edge and sturdy construction.",
    colorScheme: "British racing green blade, golden ash handle, brass connection"
  },
  {
    toolName: "Seed Dibber",
    description: "Traditional pointed wooden dibber for making precise planting holes. Smooth hardwood construction with brass tip and measurement markings.",
    colorScheme: "Golden ash wood, brass tip and measurement rings"
  }
];

export async function generateAllGardenToolIcons(): Promise<string[]> {
  const generatedPaths: string[] = [];
  const outputDir = "client/public/generated-icons";
  
  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  for (const tool of gardenToolPrompts) {
    try {
      const filename = tool.toolName.toLowerCase().replace(/\s+/g, '-') + '.png';
      const outputPath = path.join(outputDir, filename);
      
      await generateGardenToolIcon(tool.toolName, tool.description, outputPath);
      generatedPaths.push(`/generated-icons/${filename}`);
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 2000));
      
    } catch (error) {
      console.error(`Failed to generate ${tool.toolName}:`, error);
    }
  }
  
  return generatedPaths;
}