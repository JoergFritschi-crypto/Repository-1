import { db } from "./db";
import { plants } from "@shared/schema";
import { sql } from "drizzle-orm";

// Helper function to parse dimension text like "4-10 feet" or "120-300 cm"
function parseDimensionText(text: string): { min: number; max: number; unit: string } | null {
  if (!text || typeof text !== 'string') return null;
  
  // Try to match patterns like "4-10 feet", "120-300 cm", "4 feet", etc.
  const rangeMatch = text.match(/(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)\s*(feet|foot|ft|inches|inch|in|cm|m|meters?)?/i);
  const singleMatch = text.match(/(\d+(?:\.\d+)?)\s*(feet|foot|ft|inches|inch|in|cm|m|meters?)?/i);
  
  if (rangeMatch) {
    const unit = rangeMatch[3]?.toLowerCase() || 'feet';
    return {
      min: parseFloat(rangeMatch[1]),
      max: parseFloat(rangeMatch[2]),
      unit
    };
  } else if (singleMatch) {
    const value = parseFloat(singleMatch[1]);
    const unit = singleMatch[2]?.toLowerCase() || 'feet';
    return {
      min: value,
      max: value,
      unit
    };
  }
  
  return null;
}

// Convert any measurement to centimeters
function toCentimeters(value: number, unit: string): number {
  switch (unit) {
    case 'feet':
    case 'foot':
    case 'ft':
      return Math.round(value * 30.48); // 1 foot = 30.48 cm
    case 'inches':
    case 'inch':
    case 'in':
      return Math.round(value * 2.54); // 1 inch = 2.54 cm
    case 'm':
    case 'meter':
    case 'meters':
      return Math.round(value * 100); // 1 meter = 100 cm
    case 'cm':
      return Math.round(value);
    default:
      // Assume feet if no unit specified
      return Math.round(value * 30.48);
  }
}

// Convert centimeters to inches
function toInches(cm: number): number {
  return Math.round(cm / 2.54);
}

async function migrateDimensions() {
  console.log("Starting dimension migration...");
  
  try {
    // Get all plants
    const allPlants = await db.select().from(plants);
    console.log(`Found ${allPlants.length} plants to process`);
    
    let updated = 0;
    let skipped = 0;
    
    for (const plant of allPlants) {
      // Skip if already has numeric dimensions
      if (plant.heightMinCm !== null && plant.heightMaxCm !== null) {
        skipped++;
        continue;
      }
      
      const updates: any = {};
      
      // Process dimension field if it exists
      if (plant.dimension && typeof plant.dimension === 'object') {
        const dim = plant.dimension as any;
        
        // Process height
        if (dim.height) {
          const height = parseDimensionText(dim.height);
          if (height) {
            updates.heightMinCm = toCentimeters(height.min, height.unit);
            updates.heightMaxCm = toCentimeters(height.max, height.unit);
            updates.heightMinInches = toInches(updates.heightMinCm);
            updates.heightMaxInches = toInches(updates.heightMaxCm);
          }
        }
        
        // Process spread
        if (dim.spread) {
          const spread = parseDimensionText(dim.spread);
          if (spread) {
            updates.spreadMinCm = toCentimeters(spread.min, spread.unit);
            updates.spreadMaxCm = toCentimeters(spread.max, spread.unit);
            updates.spreadMinInches = toInches(updates.spreadMinCm);
            updates.spreadMaxInches = toInches(updates.spreadMaxCm);
          }
        }
      }
      
      // Only update if we have some dimension data
      if (Object.keys(updates).length > 0) {
        await db.update(plants)
          .set(updates)
          .where(sql`${plants.id} = ${plant.id}`);
        updated++;
        console.log(`Updated ${plant.commonName}: height ${updates.heightMinCm}-${updates.heightMaxCm}cm, spread ${updates.spreadMinCm}-${updates.spreadMaxCm}cm`);
      }
    }
    
    console.log(`\nMigration complete!`);
    console.log(`Updated: ${updated} plants`);
    console.log(`Skipped: ${skipped} plants (already had numeric dimensions)`);
    console.log(`No dimension data: ${allPlants.length - updated - skipped} plants`);
    
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
  
  process.exit(0);
}

// Run the migration
migrateDimensions();