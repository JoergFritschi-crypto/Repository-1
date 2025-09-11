// Utility functions for parsing and converting plant dimensions

/**
 * Parse a dimension string and extract min/max values in the specified unit
 * Examples:
 * "5-10 cm" => { min: 5, max: 10, unit: 'cm' }
 * "0.3-0.9 m" => { min: 30, max: 90, unit: 'cm' } (converted to cm)
 * "12-18 inches" => { min: 12, max: 18, unit: 'inches' }
 * "2 ft" => { min: 60, max: 60, unit: 'cm' } (converted to cm)
 * "bis 50 cm" => { min: 0, max: 50, unit: 'cm' }
 * "ca. 30 cm" => { min: 25, max: 35, unit: 'cm' } (approximation)
 */
export function parseDimension(dimensionStr: string | null | undefined): {
  min: number;
  max: number;
  unit: 'cm' | 'inches';
} | null {
  if (!dimensionStr || typeof dimensionStr !== 'string') {
    return null;
  }

  // Clean the string
  let str = dimensionStr.toLowerCase().trim();
  
  // Handle German "bis" (up to)
  if (str.includes('bis')) {
    const match = str.match(/bis\s*(\d+(?:[,\.]\d+)?)\s*(cm|m|mm|dm)?/);
    if (match) {
      const value = parseFloat(match[1].replace(',', '.'));
      const unit = match[2] || 'cm';
      const cm = convertToCm(value, unit);
      return { min: 0, max: cm, unit: 'cm' };
    }
  }
  
  // Handle German "ca." or "etwa" (approximately)
  if (str.includes('ca.') || str.includes('etwa')) {
    const match = str.match(/(?:ca\.|etwa)\s*(\d+(?:[,\.]\d+)?)\s*(cm|m|mm|dm)?/);
    if (match) {
      const value = parseFloat(match[1].replace(',', '.'));
      const unit = match[2] || 'cm';
      const cm = convertToCm(value, unit);
      // Add ±20% for approximation
      return { min: Math.round(cm * 0.8), max: Math.round(cm * 1.2), unit: 'cm' };
    }
  }
  
  // Handle range patterns (e.g., "30-50 cm", "0.5-1 m", "12-18 inches")
  const rangePattern = /(\d+(?:[,\.]\d+)?)\s*[-–—]\s*(\d+(?:[,\.]\d+)?)\s*(cm|m|mm|dm|inch|inches|in|ft|feet|'|")?/;
  const rangeMatch = str.match(rangePattern);
  
  if (rangeMatch) {
    const min = parseFloat(rangeMatch[1].replace(',', '.'));
    const max = parseFloat(rangeMatch[2].replace(',', '.'));
    const unit = rangeMatch[3] || detectUnit(str);
    
    const minCm = convertToCm(min, unit);
    const maxCm = convertToCm(max, unit);
    
    return { min: minCm, max: maxCm, unit: 'cm' };
  }
  
  // Handle single value (e.g., "50 cm", "1 m", "24 inches")
  const singlePattern = /(\d+(?:[,\.]\d+)?)\s*(cm|m|mm|dm|inch|inches|in|ft|feet|'|")?/;
  const singleMatch = str.match(singlePattern);
  
  if (singleMatch) {
    const value = parseFloat(singleMatch[1].replace(',', '.'));
    const unit = singleMatch[2] || detectUnit(str);
    const cm = convertToCm(value, unit);
    
    // For single values, use the value as both min and max
    return { min: cm, max: cm, unit: 'cm' };
  }
  
  return null;
}

/**
 * Convert a value from various units to centimeters
 */
function convertToCm(value: number, unit: string): number {
  switch (unit) {
    case 'm':
    case 'meter':
    case 'meters':
      return Math.round(value * 100);
    case 'dm':
      return Math.round(value * 10);
    case 'mm':
      return Math.round(value / 10);
    case 'ft':
    case 'feet':
    case "'":
      return Math.round(value * 30.48);
    case 'inch':
    case 'inches':
    case 'in':
    case '"':
      return Math.round(value * 2.54);
    case 'cm':
    case 'centimeter':
    case 'centimeters':
    default:
      return Math.round(value);
  }
}

/**
 * Try to detect the unit from context clues in the string
 */
function detectUnit(str: string): string {
  if (str.includes('meter') || str.includes(' m ') || str.includes(' m.')) return 'm';
  if (str.includes('feet') || str.includes('ft') || str.includes("'")) return 'ft';
  if (str.includes('inch') || str.includes('"')) return 'inches';
  return 'cm'; // Default to cm
}

/**
 * Convert centimeters to inches
 */
export function cmToInches(cm: number): number {
  return Math.round(cm / 2.54);
}

/**
 * Convert inches to centimeters
 */
export function inchesToCm(inches: number): number {
  return Math.round(inches * 2.54);
}

/**
 * Parse both height and spread from dimension object or separate fields
 */
export interface ParsedDimensions {
  heightMinCm: number | null;
  heightMaxCm: number | null;
  spreadMinCm: number | null;
  spreadMaxCm: number | null;
  heightMinInches: number | null;
  heightMaxInches: number | null;
  spreadMinInches: number | null;
  spreadMaxInches: number | null;
}

export function parsePlantDimensions(data: {
  dimension?: any;
  height?: string;
  spread?: string;
  width?: string;
  heightMinCm?: number;
  heightMaxCm?: number;
  spreadMinCm?: number;
  spreadMaxCm?: number;
}): ParsedDimensions {
  const result: ParsedDimensions = {
    heightMinCm: null,
    heightMaxCm: null,
    spreadMinCm: null,
    spreadMaxCm: null,
    heightMinInches: null,
    heightMaxInches: null,
    spreadMinInches: null,
    spreadMaxInches: null,
  };
  
  // First check if we already have numeric values
  if (data.heightMinCm && data.heightMaxCm) {
    result.heightMinCm = data.heightMinCm;
    result.heightMaxCm = data.heightMaxCm;
    result.heightMinInches = cmToInches(data.heightMinCm);
    result.heightMaxInches = cmToInches(data.heightMaxCm);
  }
  
  if (data.spreadMinCm && data.spreadMaxCm) {
    result.spreadMinCm = data.spreadMinCm;
    result.spreadMaxCm = data.spreadMaxCm;
    result.spreadMinInches = cmToInches(data.spreadMinCm);
    result.spreadMaxInches = cmToInches(data.spreadMaxCm);
  }
  
  // Try to parse from dimension object (legacy format)
  if (data.dimension && typeof data.dimension === 'object') {
    // Handle Perenual format: {height: {min: 0.5, max: 1}, spread: {min: 0.3, max: 0.6}}
    if (data.dimension.height) {
      let heightMin: number | null = null;
      let heightMax: number | null = null;
      
      if (typeof data.dimension.height === 'string') {
        const parsed = parseDimension(data.dimension.height);
        if (parsed) {
          heightMin = parsed.min;
          heightMax = parsed.max;
        }
      } else if (typeof data.dimension.height === 'object') {
        // Assume meters if no unit specified (Perenual format)
        heightMin = data.dimension.height.min ? Math.round(data.dimension.height.min * 100) : null;
        heightMax = data.dimension.height.max ? Math.round(data.dimension.height.max * 100) : null;
      }
      
      if (heightMin !== null && !result.heightMinCm) {
        result.heightMinCm = heightMin;
        result.heightMinInches = cmToInches(heightMin);
      }
      if (heightMax !== null && !result.heightMaxCm) {
        result.heightMaxCm = heightMax;
        result.heightMaxInches = cmToInches(heightMax);
      }
    }
    
    if (data.dimension.spread || data.dimension.width) {
      const spreadData = data.dimension.spread || data.dimension.width;
      let spreadMin: number | null = null;
      let spreadMax: number | null = null;
      
      if (typeof spreadData === 'string') {
        const parsed = parseDimension(spreadData);
        if (parsed) {
          spreadMin = parsed.min;
          spreadMax = parsed.max;
        }
      } else if (typeof spreadData === 'object') {
        // Assume meters if no unit specified
        spreadMin = spreadData.min ? Math.round(spreadData.min * 100) : null;
        spreadMax = spreadData.max ? Math.round(spreadData.max * 100) : null;
      }
      
      if (spreadMin !== null && !result.spreadMinCm) {
        result.spreadMinCm = spreadMin;
        result.spreadMinInches = cmToInches(spreadMin);
      }
      if (spreadMax !== null && !result.spreadMaxCm) {
        result.spreadMaxCm = spreadMax;
        result.spreadMaxInches = cmToInches(spreadMax);
      }
    }
  }
  
  // Try to parse from string fields (scraped data)
  if (data.height && !result.heightMinCm) {
    const parsed = parseDimension(data.height);
    if (parsed) {
      result.heightMinCm = parsed.min;
      result.heightMaxCm = parsed.max;
      result.heightMinInches = cmToInches(parsed.min);
      result.heightMaxInches = cmToInches(parsed.max);
    }
  }
  
  if ((data.spread || data.width) && !result.spreadMinCm) {
    const parsed = parseDimension(data.spread || data.width);
    if (parsed) {
      result.spreadMinCm = parsed.min;
      result.spreadMaxCm = parsed.max;
      result.spreadMinInches = cmToInches(parsed.min);
      result.spreadMaxInches = cmToInches(parsed.max);
    }
  }
  
  return result;
}

/**
 * Validate that field contents match what they should contain
 */
export function validatePlantData(plant: any): {
  isValid: boolean;
  warnings: string[];
} {
  const warnings: string[] = [];
  
  // Check if sunlight contains valid sun requirements
  if (plant.sunlight) {
    const validSunTerms = ['sun', 'shade', 'partial', 'full', 'part', 'dappled'];
    const sunStr = (Array.isArray(plant.sunlight) ? plant.sunlight.join(' ') : plant.sunlight).toLowerCase();
    
    // Check if it contains description text instead of sun requirements
    if (sunStr.length > 50 || !validSunTerms.some(term => sunStr.includes(term))) {
      warnings.push(`Sunlight field may contain wrong data: "${sunStr.substring(0, 50)}..."`);
    }
  }
  
  // Check if description is actually descriptive text
  if (plant.description) {
    const desc = plant.description.toLowerCase();
    
    // If description is too short or just contains the plant name, it's likely wrong
    if (desc.length < 20 || desc === plant.common_name?.toLowerCase() || desc === plant.scientific_name?.toLowerCase()) {
      warnings.push(`Description field may be too short or just contain name: "${desc}"`);
    }
    
    // If description contains typical sun/water terms, it might be misplaced care info
    if (desc.match(/^(full sun|partial shade|moderate water|well-drained)/)) {
      warnings.push(`Description field may contain care instructions instead of description: "${desc.substring(0, 50)}..."`);
    }
  }
  
  // Check if height/spread are missing
  if (!plant.heightMinCm && !plant.heightMaxCm && !plant.dimension?.height && !plant.height) {
    warnings.push('Height data is missing');
  }
  
  if (!plant.spreadMinCm && !plant.spreadMaxCm && !plant.dimension?.spread && !plant.spread && !plant.width) {
    warnings.push('Spread/width data is missing');
  }
  
  return {
    isValid: warnings.length === 0,
    warnings
  };
}