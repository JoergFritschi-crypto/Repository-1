import type { Plant } from './schema';

export type AvailabilityLevel = 'common' | 'specialty' | 'exotic';

export type RegionalSupplier = {
  name: string;
  lastSeen: string;
  priceRange?: string;
};

export type RegionalAvailabilityData = {
  score: number;
  suppliers: string[];
  lastSeen?: string;
  priceRange?: string;
  confidence?: 'high' | 'medium' | 'low';
};

export type RegionalAvailability = {
  europe?: RegionalAvailabilityData;
  northAmerica?: RegionalAvailabilityData;
  asia?: RegionalAvailabilityData;
  oceania?: RegionalAvailabilityData;
  africa?: RegionalAvailabilityData;
  southAmerica?: RegionalAvailabilityData;
};

/**
 * Calculate base availability score from plant characteristics
 * Returns a score from 1-10 where:
 * - 8-10: Common (garden center staples)
 * - 5-7: Specialty (may need specific nurseries)
 * - 1-4: Exotic (online/specialty ordering required)
 */
export function calculateBaseAvailabilityScore(plant: Partial<Plant>): number {
  let score = 0;
  
  // Propagation method (0-3 points)
  switch (plant.propagationMethod) {
    case 'seed':
      score += 3; // Easiest to mass produce
      break;
    case 'cutting':
      score += 2; // Moderately easy
      break;
    case 'division':
      score += 1; // Requires parent plants
      break;
    case 'tissue-culture':
      score += 0; // Specialist only
      break;
    default:
      score += 1; // Unknown, assume moderate
  }
  
  // Commercial production (0-3 points)
  switch (plant.commercialProduction) {
    case 'mass':
      score += 3; // Widely available
      break;
    case 'specialty':
      score += 2; // Specialty nurseries
      break;
    case 'rare':
      score += 1; // Limited production
      break;
    case 'collector':
      score += 0; // Very limited
      break;
    default:
      score += 1; // Unknown, assume limited
  }
  
  // Climate adaptability (0-2 points)
  if (plant.climateAdaptability !== undefined && plant.climateAdaptability !== null) {
    if (plant.climateAdaptability >= 4) {
      score += 2; // Wide range
    } else if (plant.climateAdaptability >= 2) {
      score += 1; // Moderate range
    } else {
      score += 0; // Specific conditions
    }
  } else {
    score += 1; // Unknown, assume moderate
  }
  
  // Cultivation difficulty bonus (0-2 points)
  switch (plant.cultivationDifficulty) {
    case 'easy':
      score += 2; // Easy to grow
      break;
    case 'moderate':
      score += 1; // Some skill needed
      break;
    case 'difficult':
      score += 0; // Expert growers
      break;
    default:
      score += 1; // Unknown, assume moderate
  }
  
  return Math.min(10, Math.max(1, score));
}

/**
 * Get availability level from score
 */
export function getAvailabilityLevel(score: number): AvailabilityLevel {
  if (score >= 8) return 'common';
  if (score >= 5) return 'specialty';
  return 'exotic';
}

/**
 * Calculate final availability score considering regional data
 * @param baseScore - The base availability score (1-10)
 * @param regionalData - Regional availability data from scraping
 * @param userRegion - The user's region
 */
export function calculateFinalAvailabilityScore(
  baseScore: number,
  regionalData?: RegionalAvailability,
  userRegion?: keyof RegionalAvailability
): { score: number; level: AvailabilityLevel; confidence: 'high' | 'medium' | 'low' } {
  
  // If we have regional data for the user's region, weight it heavily
  if (regionalData && userRegion && regionalData[userRegion]) {
    const regional = regionalData[userRegion];
    const finalScore = (baseScore * 0.4) + (regional.score * 0.6);
    
    return {
      score: Math.round(finalScore),
      level: getAvailabilityLevel(finalScore),
      confidence: regional.confidence || 'medium'
    };
  }
  
  // If we have any regional data, use average
  if (regionalData) {
    const regions = Object.values(regionalData).filter(r => r?.score !== undefined);
    if (regions.length > 0) {
      const avgRegionalScore = regions.reduce((sum, r) => sum + r.score, 0) / regions.length;
      const finalScore = (baseScore * 0.6) + (avgRegionalScore * 0.4);
      
      return {
        score: Math.round(finalScore),
        level: getAvailabilityLevel(finalScore),
        confidence: 'low'
      };
    }
  }
  
  // Fall back to base score only
  return {
    score: baseScore,
    level: getAvailabilityLevel(baseScore),
    confidence: 'low'
  };
}

/**
 * Get user region from location
 */
export function getUserRegion(country?: string): keyof RegionalAvailability | undefined {
  if (!country) return undefined;
  
  const countryLower = country.toLowerCase();
  
  // Europe
  if (['germany', 'france', 'uk', 'united kingdom', 'netherlands', 'belgium', 'austria', 
       'switzerland', 'italy', 'spain', 'portugal', 'poland', 'sweden', 'norway', 
       'denmark', 'finland'].some(c => countryLower.includes(c))) {
    return 'europe';
  }
  
  // North America
  if (['usa', 'united states', 'canada', 'mexico'].some(c => countryLower.includes(c))) {
    return 'northAmerica';
  }
  
  // Asia
  if (['china', 'japan', 'korea', 'india', 'thailand', 'vietnam', 'singapore', 
       'malaysia', 'indonesia', 'philippines'].some(c => countryLower.includes(c))) {
    return 'asia';
  }
  
  // Oceania
  if (['australia', 'new zealand', 'papua', 'fiji'].some(c => countryLower.includes(c))) {
    return 'oceania';
  }
  
  // Africa
  if (['south africa', 'nigeria', 'egypt', 'kenya', 'morocco', 'ghana', 
       'ethiopia', 'tanzania'].some(c => countryLower.includes(c))) {
    return 'africa';
  }
  
  // South America
  if (['brazil', 'argentina', 'chile', 'peru', 'colombia', 'venezuela', 
       'ecuador', 'bolivia'].some(c => countryLower.includes(c))) {
    return 'southAmerica';
  }
  
  return undefined;
}