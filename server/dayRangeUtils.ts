/**
 * Day-of-year range utilities for seasonal image generation
 * Handles wrap-around scenarios (e.g., Nov-Feb: 320-60)
 */

export interface DayRange {
  startDay: number;
  endDay: number;
  totalDays: number;
  isWrapAround: boolean;
}

export interface SelectedDay {
  dayOfYear: number;
  date: string;
  month: number;
  season: 'spring' | 'summer' | 'autumn' | 'winter';
}

/**
 * Calculate total days in a range, handling wrap-around
 */
export function calculateDayRange(startDay: number, endDay: number): DayRange {
  // Validate input
  if (startDay < 1 || startDay > 365 || endDay < 1 || endDay > 365) {
    throw new Error('Day values must be between 1 and 365');
  }
  
  const isWrapAround = endDay < startDay;
  let totalDays: number;
  
  if (isWrapAround) {
    // Wrap around year: e.g., Nov 15 (320) to Feb 15 (45)
    // Days from startDay to end of year + days from start of year to endDay
    totalDays = (365 - startDay + 1) + endDay;
  } else {
    // Normal range within same year
    totalDays = endDay - startDay + 1;
  }
  
  return {
    startDay,
    endDay,
    totalDays,
    isWrapAround
  };
}

/**
 * Generate sequence of days in range, handling wrap-around
 */
export function generateDaySequence(range: DayRange): number[] {
  const days: number[] = [];
  
  if (range.isWrapAround) {
    // Add days from startDay to end of year
    for (let day = range.startDay; day <= 365; day++) {
      days.push(day);
    }
    // Add days from start of year to endDay
    for (let day = 1; day <= range.endDay; day++) {
      days.push(day);
    }
  } else {
    // Normal sequence
    for (let day = range.startDay; day <= range.endDay; day++) {
      days.push(day);
    }
  }
  
  return days;
}

/**
 * Select optimal days for image generation across the range
 */
export function selectDaysForImages(range: DayRange, requestedCount?: number): number[] {
  const totalDays = range.totalDays;
  
  // Determine optimal image count based on range length
  let imageCount: number;
  if (requestedCount && requestedCount > 0) {
    imageCount = Math.min(requestedCount, 8); // Cap at 8 images
  } else if (totalDays <= 30) {
    imageCount = Math.min(3, totalDays);
  } else if (totalDays <= 120) {
    imageCount = Math.min(5, Math.ceil(totalDays / 24));
  } else {
    imageCount = Math.min(7, Math.ceil(totalDays / 40));
  }
  
  // Ensure at least 1 image
  imageCount = Math.max(1, imageCount);
  
  // Generate the full day sequence
  const allDays = generateDaySequence(range);
  
  if (imageCount === 1) {
    // Single image: take middle day
    const middleIndex = Math.floor(allDays.length / 2);
    return [allDays[middleIndex]];
  }
  
  if (imageCount >= allDays.length) {
    // More images than days: return all days
    return allDays;
  }
  
  // Select evenly spaced days
  const selectedDays: number[] = [];
  const step = (allDays.length - 1) / (imageCount - 1);
  
  for (let i = 0; i < imageCount; i++) {
    const index = Math.round(i * step);
    selectedDays.push(allDays[index]);
  }
  
  // Ensure we don't have duplicates (can happen with rounding)
  return Array.from(new Set(selectedDays)).sort((a, b) => {
    // Special sorting for wrap-around ranges
    if (range.isWrapAround) {
      // Days >= startDay come first, then days <= endDay
      if (a >= range.startDay && b >= range.startDay) return a - b;
      if (a <= range.endDay && b <= range.endDay) return a - b;
      if (a >= range.startDay && b <= range.endDay) return -1;
      if (a <= range.endDay && b >= range.startDay) return 1;
    }
    return a - b;
  });
}

/**
 * Convert day-of-year to date string and additional metadata
 */
export function dayToDateInfo(dayOfYear: number, year: number = 2024): SelectedDay {
  // Handle leap year (2024 is a leap year)
  const isLeapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  
  // Days in each month (for leap year)
  const daysInMonth = [31, isLeapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  
  let month = 1;
  let dayInMonth = dayOfYear;
  
  // Find the month
  for (let i = 0; i < daysInMonth.length; i++) {
    if (dayInMonth <= daysInMonth[i]) {
      month = i + 1;
      break;
    }
    dayInMonth -= daysInMonth[i];
  }
  
  // Create date string
  const date = new Date(year, month - 1, dayInMonth);
  const dateString = date.toISOString().split('T')[0]; // YYYY-MM-DD format
  
  // Determine season based on month
  let season: 'spring' | 'summer' | 'autumn' | 'winter';
  if (month >= 3 && month <= 5) {
    season = 'spring';
  } else if (month >= 6 && month <= 8) {
    season = 'summer';
  } else if (month >= 9 && month <= 11) {
    season = 'autumn';
  } else {
    season = 'winter';
  }
  
  return {
    dayOfYear,
    date: dateString,
    month,
    season
  };
}

/**
 * Get plants that are blooming on a specific day
 */
export function getPlantsBloomingOnDay(plants: any[], dayOfYear: number): string[] {
  const bloomingPlants: string[] = [];
  
  for (const plant of plants) {
    if (!plant.plant) continue;
    
    const p = plant.plant;
    let isBloomingOnDay = false;
    
    // Check day-of-year bloom data first (highest precision)
    if (p.bloomStartDayOfYear && p.bloomEndDayOfYear) {
      if (p.bloomStartDayOfYear <= p.bloomEndDayOfYear) {
        // Normal range (e.g., 90-180 for Apr-Jun)
        isBloomingOnDay = dayOfYear >= p.bloomStartDayOfYear && dayOfYear <= p.bloomEndDayOfYear;
      } else {
        // Wrap-around range (e.g., 320-60 for Nov-Feb)
        isBloomingOnDay = dayOfYear >= p.bloomStartDayOfYear || dayOfYear <= p.bloomEndDayOfYear;
      }
    } else if (p.bloomStartMonth && p.bloomEndMonth) {
      // Fallback to month-based bloom data
      const dayInfo = dayToDateInfo(dayOfYear);
      const month = dayInfo.month;
      
      if (p.bloomStartMonth <= p.bloomEndMonth) {
        // Normal month range
        isBloomingOnDay = month >= p.bloomStartMonth && month <= p.bloomEndMonth;
      } else {
        // Wrap-around month range
        isBloomingOnDay = month >= p.bloomStartMonth || month <= p.bloomEndMonth;
      }
    }
    
    if (isBloomingOnDay) {
      const displayName = p.cultivar 
        ? `${p.commonName || p.scientificName} '${p.cultivar}'`
        : (p.commonName || p.scientificName);
      bloomingPlants.push(displayName);
    }
  }
  
  return bloomingPlants;
}

/**
 * Generate weather description for a day
 */
export function generateWeatherDescription(dayOfYear: number, season: string): string {
  // Simple weather generation based on season and time
  const weatherOptions = {
    spring: ['mild spring weather', 'gentle spring breeze', 'soft spring light', 'fresh spring air'],
    summer: ['warm summer sunshine', 'bright summer day', 'golden summer light', 'clear summer sky'],
    autumn: ['crisp autumn air', 'golden autumn light', 'cool autumn breeze', 'clear autumn day'],
    winter: ['soft winter light', 'crisp winter air', 'gentle winter sunshine', 'clear winter day']
  };
  
  const options = weatherOptions[season as keyof typeof weatherOptions] || weatherOptions.summer;
  const index = Math.floor((dayOfYear + season.length) % options.length);
  return options[index];
}