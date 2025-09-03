import fs from "fs/promises";
import path from "path";
import fetch from "node-fetch";

interface GenerateImageOptions {
  prompt: string;
  aspectRatio?: "1:1" | "3:4" | "4:3" | "9:16" | "16:9";
  oneLine: string;
}

// Using fetch with dynamic import workaround for Node.js compatibility
const nodeFetch = fetch as any;

// Helper function to generate plant-themed colors based on plant name
function getPlantColors(plantName: string): [string, string, string] {
  const name = plantName.toLowerCase();
  
  // Define color palettes for different plant types
  if (name.includes('lavender') || name.includes('purple')) {
    return ['#9370DB', '#8A7FBE', '#DDA0DD'];
  } else if (name.includes('rose') || name.includes('pink')) {
    return ['#FFB6C1', '#FF69B4', '#FFC0CB'];
  } else if (name.includes('maple') || name.includes('autumn') || name.includes('fall')) {
    return ['#CD5C5C', '#D2691E', '#FF8C00'];
  } else if (name.includes('hosta') || name.includes('fern')) {
    return ['#228B22', '#3CB371', '#90EE90'];
  } else if (name.includes('sun') || name.includes('yellow') || name.includes('gold')) {
    return ['#FFD700', '#FFA500', '#FFEB3B'];
  } else if (name.includes('blue') || name.includes('hydrangea')) {
    return ['#4169E1', '#6495ED', '#87CEEB'];
  } else if (name.includes('white') || name.includes('lily')) {
    return ['#F0F8FF', '#F5F5DC', '#FFFAF0'];
  } else {
    // Default green garden palette
    return ['#7FB069', '#8FBC8F', '#556B2F'];
  }
}

// Helper function to escape XML special characters
function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
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
    console.log(`Generating image for: ${oneLine}`);
    
    // Import sharp for image generation
    const sharp = (await import('sharp')).default;
    
    // Generate a plant-themed gradient based on the plant name
    const colors = getPlantColors(oneLine);
    
    // Create an SVG with a nature-inspired design
    const svgContent = `
      <svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:${colors[0]};stop-opacity:1" />
            <stop offset="50%" style="stop-color:${colors[1]};stop-opacity:1" />
            <stop offset="100%" style="stop-color:${colors[2]};stop-opacity:1" />
          </linearGradient>
          <pattern id="leaves" x="0" y="0" width="100" height="100" patternUnits="userSpaceOnUse">
            <circle cx="25" cy="25" r="15" fill="${colors[0]}" opacity="0.3"/>
            <circle cx="75" cy="75" r="20" fill="${colors[1]}" opacity="0.3"/>
            <ellipse cx="50" cy="50" rx="25" ry="15" fill="${colors[2]}" opacity="0.2" transform="rotate(45 50 50)"/>
          </pattern>
        </defs>
        
        <!-- Background gradient -->
        <rect width="512" height="512" fill="url(#bg)"/>
        
        <!-- Pattern overlay -->
        <rect width="512" height="512" fill="url(#leaves)"/>
        
        <!-- Central decorative circle -->
        <circle cx="256" cy="256" r="150" fill="white" opacity="0.1"/>
        <circle cx="256" cy="256" r="100" fill="white" opacity="0.1"/>
        
        <!-- Text background -->
        <rect x="56" y="226" width="400" height="60" rx="10" fill="black" opacity="0.4"/>
        
        <!-- Plant name text -->
        <text x="256" y="256" font-family="Georgia, serif" font-size="28" fill="white" text-anchor="middle" font-weight="bold">
          ${escapeXml(oneLine)}
        </text>
        
        <!-- Decorative elements -->
        <circle cx="100" cy="100" r="30" fill="${colors[0]}" opacity="0.2"/>
        <circle cx="412" cy="412" r="40" fill="${colors[1]}" opacity="0.2"/>
        <circle cx="412" cy="100" r="25" fill="${colors[2]}" opacity="0.15"/>
        <circle cx="100" cy="412" r="35" fill="${colors[0]}" opacity="0.15"/>
      </svg>
    `;
    
    // Convert SVG to PNG using Sharp
    const imageBuffer = await sharp(Buffer.from(svgContent))
      .png()
      .toBuffer();
    
    // Save the generated image
    await fs.writeFile(filepath, imageBuffer);
    console.log(`Image saved to: ${filepath} (${imageBuffer.length} bytes)`);
    
  } catch (error) {
    console.error("Error generating image:", error);
    
    // Create a better placeholder with actual visual content
    console.log("Creating visual placeholder image");
    
    // Generate SVG as fallback 
    const svgContent = `
      <svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#7FB069;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#556B2F;stop-opacity:1" />
          </linearGradient>
        </defs>
        <rect width="512" height="512" fill="url(#bg)"/>
        <text x="256" y="256" font-family="Arial" font-size="24" fill="white" text-anchor="middle">
          ${oneLine}
        </text>
      </svg>
    `;
    
    // Convert SVG to PNG using sharp if available
    try {
      const sharp = await import('sharp').catch(() => null);
      if (sharp) {
        const pngBuffer = await sharp.default(Buffer.from(svgContent))
          .png()
          .toBuffer();
        await fs.writeFile(filepath, pngBuffer);
      } else {
        // Save as SVG if sharp not available
        const svgFilename = filename.replace('.png', '.svg');
        const svgPath = path.join(imagesDir, svgFilename);
        await fs.writeFile(svgPath, svgContent);
        return `/generated-images/${svgFilename}`;
      }
    } catch (sharpError) {
      console.error("Could not convert SVG to PNG:", sharpError);
      // Save as SVG
      const svgFilename = filename.replace('.png', '.svg');
      const svgPath = path.join(imagesDir, svgFilename);
      await fs.writeFile(svgPath, svgContent);
      return `/generated-images/${svgFilename}`;
    }
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