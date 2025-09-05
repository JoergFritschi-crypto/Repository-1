export function generateGardeningAdvice(zones: any, weatherData: any) {
  // Calculate metrics
  const avgRainfall = weatherData.days.reduce((sum: number, day: any) => sum + (day.precip || 0), 0) / Math.max(1, weatherData.days.length);
  const avgTemp = weatherData.days.reduce((sum: number, day: any) => sum + (day.temp || 0), 0) / Math.max(1, weatherData.days.length);
  const totalDays = weatherData.days.length;
  const yearsOfData = Math.max(1, totalDays / 365);
  const frostDaysTotal = weatherData.days.filter((day: any) => day.tempmin <= 0).length;
  const frostDaysPerYear = Math.round(frostDaysTotal / yearsOfData);
  const hotDaysTotal = weatherData.days.filter((day: any) => day.tempmax >= 30).length;
  const hotDaysPerYear = Math.round(hotDaysTotal / yearsOfData);
  
  let recommendations = [];
  
  // Zone-specific advice (concise)
  if (zones.zoneNumber <= 6) {
    recommendations.push(
      "Cold Climate Strategy: With minimum temperatures of " + zones.tempRange + ". " +
      "Recommended plants: Siberian iris, peonies Sarah Bernhardt, hostas, kale Winterbor, Brussels sprouts. " +
      "Use cold frames and row covers to extend the growing season by 6-8 weeks."
    );
  } else if (zones.zoneNumber <= 8) {
    recommendations.push(
      "Temperate Climate: Zone " + zones.zoneNumber + " supports diverse plantings year-round. " +
      "Ideal for roses, lavender Hidcote, delphiniums, tomatoes Cherokee Purple, and fruit trees. " +
      "Focus on succession planting for continuous harvests."
    );
  } else {
    recommendations.push(
      "Warm Climate: Zone " + zones.zoneNumber + " enables tropical plantings. " +
      "Grow citrus, avocados, bougainvillea, hibiscus, and heat-tolerant vegetables. " +
      "Provide afternoon shade and maintain consistent moisture during hot periods."
    );
  }

  // Rainfall recommendations (concise)
  const annualRainfall = (avgRainfall * 365).toFixed(1);
  if (avgRainfall < 1.5) {
    recommendations.push(
      "Low Rainfall (" + annualRainfall + "mm/year): Install drip irrigation and harvest rainwater. " +
      "Choose drought-tolerant plants: lavender, Russian sage, sedums, native grasses. " +
      "Apply 3-4 inch mulch layer to retain moisture."
    );
  } else if (avgRainfall > 3) {
    recommendations.push(
      "High Rainfall (" + annualRainfall + "mm/year): Ensure good drainage with raised beds. " +
      "Plant moisture-lovers: astilbe, cardinal flower, ferns, hostas. " +
      "Space plants well for air circulation to prevent fungal diseases."
    );
  }

  // Temperature extremes (concise)
  if (frostDaysPerYear > 100) {
    recommendations.push(
      "Frost Management: With " + frostDaysPerYear + " frost days annually, use row covers and position plants near south walls. " +
      "Choose frost-hardy varieties and wait for soil to reach 60°F before planting tender crops."
    );
  }

  if (hotDaysPerYear > 60) {
    recommendations.push(
      "Heat Management: " + hotDaysPerYear + " days above 30°C annually. " +
      "Use 30-50% shade cloth, water early morning, and select heat-tolerant varieties like Sun Gold tomatoes and Armenian cucumbers."
    );
  }

  // General tips based on zone
  recommendations.push(
    "Soil Improvement: Add 2-3 inches of compost annually. Test pH and adjust: add lime for acid soils, sulfur for alkaline. " +
    "Maintain organic mulch year-round for moisture retention and weed suppression."
  );

  return recommendations.join("\n\n");
}