import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  CloudSun, 
  Thermometer, 
  Droplets, 
  Sun, 
  Snowflake, 
  Brain,
  MapPin,
  Loader2
} from "lucide-react";
import type { ClimateData } from "@/types/garden";

interface ClimateReportProps {
  location: string;
  climateData?: ClimateData;
  isLoading: boolean;
}

// 4-Tiered Hardiness System with temperature ranges
const hardinessCategories = [
  { 
    name: "Very Hardy", 
    minTemp: "<-10°C", 
    zones: "1-5", 
    description: "Survives extreme cold",
    color: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
  },
  { 
    name: "Hardy", 
    minTemp: "-10 to -5°C", 
    zones: "6-7",
    description: "Tolerates normal frosts",
    color: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
  },
  { 
    name: "Half Hardy", 
    minTemp: "-5 to 0°C", 
    zones: "8-9",
    description: "Survives light frost",
    color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300"
  },
  { 
    name: "Tender", 
    minTemp: ">0°C", 
    zones: "10+",
    description: "No frost tolerance",
    color: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
  }
];

// Convert USDA zone to 4-tier category
function getHardinessInfo(zone: string | undefined) {
  if (!zone) return hardinessCategories[2]; // Default to Half Hardy
  
  const match = zone.match(/\d+/);
  if (!match) return hardinessCategories[2];
  
  const zoneNum = parseInt(match[0]);
  
  if (zoneNum <= 5) return hardinessCategories[0]; // Very Hardy
  if (zoneNum <= 7) return hardinessCategories[1]; // Hardy
  if (zoneNum <= 9) return hardinessCategories[2]; // Half Hardy
  return hardinessCategories[3]; // Tender
}

// Get zone temperature range
function getZoneTemperature(zone: string): string {
  const zoneTemps: { [key: string]: string } = {
    "3": "-40 to -34°C",
    "4": "-34 to -29°C",
    "5": "-29 to -23°C",
    "6": "-23 to -18°C",
    "7": "-18 to -12°C",
    "8": "-12 to -7°C",
    "9": "-7 to -1°C",
    "10": "-1 to 4°C",
    "11": "4 to 10°C"
  };
  
  const match = zone?.match(/\d+/);
  if (!match) return "";
  
  return zoneTemps[match[0]] || "";
}

export default function ClimateReport({ location, climateData, isLoading }: ClimateReportProps) {
  // Use new zone data if available, otherwise fall back to old format
  const hardiness_zone = climateData?.usda_zone || climateData?.hardiness_zone;

  if (!location || location.length < 3) {
    return (
      <div className="text-center py-12" data-testid="no-location-state">
        <MapPin className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-xl font-semibold mb-2">Enter Location</h3>
        <p className="text-muted-foreground">
          Please enter your garden location to get climate information
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div>
        <Card className="mb-6 border-primary/20 bg-primary/5">
          <CardContent className="py-8">
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="relative">
                <CloudSun className="w-12 h-12 text-primary/30" />
                <Loader2 className="w-6 h-6 animate-spin text-primary absolute -bottom-1 -right-1" />
              </div>
              <h3 className="text-lg font-medium text-primary">Fetching Climate Data</h3>
              <p className="text-sm text-muted-foreground text-center max-w-md">
                Analyzing 20 years of historical weather data for {location}...
                <br />
                <span className="text-xs">This may take up to 30 seconds for comprehensive analysis</span>
              </p>
              <div className="w-full max-w-xs">
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full animate-pulse" style={{ width: '60%' }} />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        <div className="grid md:grid-cols-2 gap-8 opacity-50">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
            </CardHeader>
            <CardContent className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex justify-between">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-24" />
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
        </div>
      </div>
    );
  }

  if (!climateData) {
    return (
      <div className="text-center py-12" data-testid="no-climate-data">
        <CloudSun className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-xl font-semibold mb-2">Climate Data Unavailable</h3>
        <p className="text-muted-foreground">
          Unable to fetch climate data for {location}. Please check the location and try again.
        </p>
      </div>
    );
  }

  const seasons = [
    {
      name: "Spring",
      period: "Mar-May",
      temp: "8-18°C",
      icon: Sun,
      color: "bg-green-100 text-green-800",
    },
    {
      name: "Summer",
      period: "Jun-Aug",
      temp: "15-24°C",
      icon: Sun,
      color: "bg-canary bg-opacity-20 text-primary",
    },
    {
      name: "Autumn",
      period: "Sep-Nov",
      temp: "7-16°C",
      icon: CloudSun,
      color: "bg-accent bg-opacity-20 text-accent-foreground",
    },
    {
      name: "Winter",
      period: "Dec-Feb",
      temp: "2-8°C",
      icon: Snowflake,
      color: "bg-blue-100 text-blue-800",
    },
  ];

  return (
    <div className="space-y-8">
      <div className="grid md:grid-cols-2 gap-8">
        {/* Climate Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center" data-testid="text-climate-summary-title">
              <Thermometer className="w-5 h-5 mr-2 text-accent" />
              {location.replace(/\s+/g, ', ').replace(', ,', ',')} Climate Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">USDA Zone:</span>
                <div className="flex items-center gap-2">
                  <Badge variant="default" data-testid="badge-hardiness-zone">
                    {hardiness_zone || 'Zone 9a'}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {climateData?.temperature_range || getZoneTemperature(hardiness_zone || '9a')}
                  </span>
                </div>
              </div>
              {climateData?.rhs_zone && (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">RHS Rating:</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" data-testid="badge-rhs-zone">
                      {climateData.rhs_zone}
                    </Badge>
                    {climateData.rhsDescription && (
                      <span className="text-xs text-muted-foreground">
                        {climateData.rhsDescription}
                      </span>
                    )}
                  </div>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Category:</span>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-1 rounded font-medium ${getHardinessInfo(hardiness_zone).color}`}>
                    {climateData?.hardiness_category || getHardinessInfo(hardiness_zone).name}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {getHardinessInfo(hardiness_zone).minTemp}
                  </span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground italic">
                {getHardinessInfo(hardiness_zone).description}
              </p>
              {climateData?.coordinates && (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Location:</span>
                  <span className="text-xs">
                    {Number(climateData.coordinates.latitude).toFixed(1)}, {Number(climateData.coordinates.longitude).toFixed(1)}
                  </span>
                </div>
              )}
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Min Winter Temp:</span>
              <span className="font-medium" data-testid="text-min-winter-temp">
                {climateData.avg_temp_min ? Number(climateData.avg_temp_min).toFixed(1) : 'N/A'}°C
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Growing Season:</span>
              <span className="font-medium" data-testid="text-growing-season">
                {climateData.growing_season?.start && climateData.growing_season?.end
                  ? (() => {
                      const startDate = new Date(climateData.growing_season.start);
                      const endDate = new Date(climateData.growing_season.end);
                      const startMonth = startDate.toLocaleDateString('en-US', { month: 'long' });
                      const endMonth = endDate.toLocaleDateString('en-US', { month: 'long' });
                      const startDay = startDate.getDate();
                      const endDay = endDate.getDate();
                      
                      const getOrdinal = (day: number) => {
                        if (day === 1 || day === 21 || day === 31) return day === 1 ? 'first' : day === 21 ? 'twenty-first' : 'thirty-first';
                        if (day === 2 || day === 22) return day === 2 ? 'second' : 'twenty-second';
                        if (day === 3 || day === 23) return day === 3 ? 'third' : 'twenty-third';
                        if (day >= 4 && day <= 20) {
                          const ones = ['', '', '', '', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth',
                                       'tenth', 'eleventh', 'twelfth', 'thirteenth', 'fourteenth', 'fifteenth',
                                       'sixteenth', 'seventeenth', 'eighteenth', 'nineteenth', 'twentieth'];
                          return ones[day] || `${day}th`;
                        }
                        return `${['twenty', 'thirty'][Math.floor(day / 10) - 2]}-${['', 'first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth'][day % 10]}`;
                      };
                      
                      return `${getOrdinal(startDay)} of ${startMonth} - ${getOrdinal(endDay)} of ${endMonth}`;
                    })()
                  : 'March - October'
                }
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Annual Rainfall:</span>
              <span className="font-medium" data-testid="text-annual-rainfall">
                {climateData.annual_rainfall ? Number(climateData.annual_rainfall).toFixed(1) : 'N/A'}mm
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Frost Dates:</span>
              <span className="font-medium" data-testid="text-frost-dates">
                {climateData.frost_dates?.last_frost && climateData.frost_dates?.first_frost
                  ? (() => {
                      const lastFrost = new Date(climateData.frost_dates.last_frost);
                      const firstFrost = new Date(climateData.frost_dates.first_frost);
                      const lastMonth = lastFrost.toLocaleDateString('en-US', { month: 'long' });
                      const firstMonth = firstFrost.toLocaleDateString('en-US', { month: 'long' });
                      const lastDay = lastFrost.getDate();
                      const firstDay = firstFrost.getDate();
                      
                      const getOrdinal = (day: number) => {
                        if (day === 1 || day === 21 || day === 31) return day === 1 ? 'first' : day === 21 ? 'twenty-first' : 'thirty-first';
                        if (day === 2 || day === 22) return day === 2 ? 'second' : 'twenty-second';
                        if (day === 3 || day === 23) return day === 3 ? 'third' : 'twenty-third';
                        if (day >= 4 && day <= 20) {
                          const ones = ['', '', '', '', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth',
                                       'tenth', 'eleventh', 'twelfth', 'thirteenth', 'fourteenth', 'fifteenth',
                                       'sixteenth', 'seventeenth', 'eighteenth', 'nineteenth', 'twentieth'];
                          return ones[day] || `${day}th`;
                        }
                        return `${['twenty', 'thirty'][Math.floor(day / 10) - 2]}-${['', 'first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth'][day % 10]}`;
                      };
                      
                      return `${getOrdinal(lastDay)} of ${lastMonth} - ${getOrdinal(firstDay)} of ${firstMonth}`;
                    })()
                  : 'fifteenth of November - fifteenth of March'
                }
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Monthly Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center" data-testid="text-monthly-overview-title">
              <CloudSun className="w-5 h-5 mr-2 text-secondary" />
              Seasonal Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {seasons.map((season) => {
                const Icon = season.icon;
                return (
                  <div key={season.name} className={`flex items-center justify-between p-3 rounded ${season.color}`} data-testid={`season-${season.name.toLowerCase()}`}>
                    <div className="flex items-center space-x-3">
                      <Icon className="w-5 h-5" />
                      <div>
                        <span className="font-medium">{season.name}</span>
                        <span className="text-sm ml-2">({season.period})</span>
                      </div>
                    </div>
                    <span className="font-medium">{season.temp}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Hardiness Zone Guide */}
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center" data-testid="text-hardiness-guide-title">
            <Thermometer className="w-5 h-5 mr-2 text-primary" />
            Understanding Hardiness Categories
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-4 gap-4">
            {hardinessCategories.map((category) => (
              <div key={category.name} className="space-y-2">
                <div className={`text-sm font-medium px-3 py-2 rounded text-center ${category.color}`}>
                  {category.name}
                </div>
                <div className="text-xs space-y-1">
                  <p><span className="font-medium">Min Temp:</span> {category.minTemp}</p>
                  <p><span className="font-medium">USDA Zones:</span> {category.zones}</p>
                  <p className="text-muted-foreground italic">{category.description}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* AI Recommended Plants */}
      <Card className="border-accent bg-accent/5">
        <CardHeader>
          <CardTitle className="flex items-center" data-testid="text-ai-plants-title">
            <Brain className="w-5 h-5 mr-2 text-accent" />
            AI Recommended Plants
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            {(() => {
              const zoneNum = parseInt(hardiness_zone?.match(/\d+/)?.[0] || '9');
              
              // Define plants for different zones
              let plants = [];
              
              if (zoneNum <= 4) {
                // Very cold zones
                plants = [
                  { name: "Siberian Iris", type: "Perennial", color: "Purple/Blue blooms" },
                  { name: "Paper Birch", type: "Tree", color: "White bark" },
                  { name: "Peony 'Sarah Bernhardt'", type: "Perennial", color: "Pink blooms" },
                  { name: "Blue Spruce", type: "Evergreen", color: "Silver-blue needles" },
                  { name: "Hosta 'Sum and Substance'", type: "Perennial", color: "Chartreuse foliage" },
                  { name: "Ninebark 'Diablo'", type: "Shrub", color: "Purple foliage" },
                  { name: "Astilbe 'Bridal Veil'", type: "Perennial", color: "White plumes" },
                  { name: "Serviceberry", type: "Tree", color: "White spring flowers" },
                  { name: "Russian Sage", type: "Perennial", color: "Lavender flowers" },
                  { name: "Arborvitae 'Emerald Green'", type: "Evergreen", color: "Bright green" },
                  { name: "Bleeding Heart", type: "Perennial", color: "Pink heart flowers" },
                  { name: "Red Twig Dogwood", type: "Shrub", color: "Red winter stems" }
                ];
              } else if (zoneNum <= 6) {
                // Cold zones
                plants = [
                  { name: "Lavender 'Munstead'", type: "Perennial", color: "Purple flowers" },
                  { name: "Japanese Maple", type: "Tree", color: "Red fall foliage" },
                  { name: "Hydrangea 'Annabelle'", type: "Shrub", color: "White ball flowers" },
                  { name: "Black-eyed Susan", type: "Perennial", color: "Yellow daisy flowers" },
                  { name: "Eastern Redbud", type: "Tree", color: "Pink spring blooms" },
                  { name: "Coneflower 'Magnus'", type: "Perennial", color: "Pink-purple flowers" },
                  { name: "Boxwood 'Green Velvet'", type: "Evergreen", color: "Dense green" },
                  { name: "Daylily 'Stella d'Oro'", type: "Perennial", color: "Golden yellow" },
                  { name: "Lilac 'Miss Kim'", type: "Shrub", color: "Fragrant purple" },
                  { name: "Coral Bells 'Palace Purple'", type: "Perennial", color: "Purple foliage" },
                  { name: "Spirea 'Goldflame'", type: "Shrub", color: "Orange-gold leaves" }
                ];
              } else if (zoneNum <= 8) {
                // Temperate zones
                plants = [
                  { name: "Rose 'Lady Emma Hamilton'", type: "Shrub", color: "Apricot-orange" },
                  { name: "English Lavender", type: "Perennial", color: "Purple fragrant" },
                  { name: "Japanese Camellia", type: "Shrub", color: "Pink/Red blooms" },
                  { name: "Delphinium 'Pacific Giant'", type: "Perennial", color: "Blue spikes" },
                  { name: "Magnolia 'Jane'", type: "Tree", color: "Purple-pink flowers" },
                  { name: "Salvia 'May Night'", type: "Perennial", color: "Deep purple" },
                  { name: "Rhododendron 'PJM'", type: "Evergreen", color: "Lavender-pink" },
                  { name: "Clematis 'Jackmanii'", type: "Vine", color: "Purple flowers" },
                  { name: "Weigela 'Wine & Roses'", type: "Shrub", color: "Pink flowers" },
                  { name: "Allium 'Purple Sensation'", type: "Bulb", color: "Purple globes" },
                  { name: "Wisteria sinensis", type: "Vine", color: "Fragrant purple" },
                  { name: "Hellebore 'Winter Jewels'", type: "Perennial", color: "Winter blooms" }
                ];
              } else if (zoneNum <= 10) {
                // Warm zones
                plants = [
                  { name: "Bougainvillea 'Barbara Karst'", type: "Vine", color: "Magenta bracts" },
                  { name: "Meyer Lemon", type: "Tree", color: "Fragrant white flowers" },
                  { name: "Agapanthus 'Storm Cloud'", type: "Perennial", color: "Blue-purple" },
                  { name: "Gardenia 'August Beauty'", type: "Shrub", color: "White fragrant" },
                  { name: "Mexican Sage", type: "Perennial", color: "Purple spikes" },
                  { name: "Oleander 'Pink Beauty'", type: "Shrub", color: "Pink flowers" },
                  { name: "Society Garlic", type: "Perennial", color: "Lavender blooms" },
                  { name: "Bottlebrush 'Little John'", type: "Shrub", color: "Red brushes" },
                  { name: "Rosemary 'Tuscan Blue'", type: "Herb", color: "Blue flowers" },
                  { name: "Pride of Madeira", type: "Shrub", color: "Purple spikes" },
                  { name: "Lantana 'New Gold'", type: "Perennial", color: "Yellow clusters" },
                  { name: "Fig 'Brown Turkey'", type: "Tree", color: "Edible fruit" }
                ];
              } else {
                // Tropical zones
                plants = [
                  { name: "Bird of Paradise", type: "Perennial", color: "Orange-blue blooms" },
                  { name: "Plumeria 'Singapore White'", type: "Tree", color: "Fragrant white" },
                  { name: "Hibiscus 'Red Dragon'", type: "Shrub", color: "Large red flowers" },
                  { name: "Mango 'Kent'", type: "Tree", color: "Sweet fruit" },
                  { name: "Ixora 'Super King'", type: "Shrub", color: "Red clusters" },
                  { name: "Croton 'Petra'", type: "Shrub", color: "Colorful foliage" },
                  { name: "Heliconia 'Lobster Claw'", type: "Perennial", color: "Red-yellow bracts" },
                  { name: "Royal Palm", type: "Palm", color: "Majestic trunk" },
                  { name: "Bougainvillea 'California Gold'", type: "Vine", color: "Golden yellow" },
                  { name: "Frangipani", type: "Tree", color: "Fragrant pink-white" },
                  { name: "Ti Plant 'Red Sister'", type: "Shrub", color: "Red-pink leaves" },
                  { name: "Passion Fruit Vine", type: "Vine", color: "Purple fruit" }
                ];
              }
              
              return plants.map((plant, index) => (
                <div key={index} className="flex flex-col space-y-1">
                  <div className="flex items-start">
                    <span className="w-2 h-2 bg-accent rounded-full mr-2 mt-1 flex-shrink-0"></span>
                    <div className="text-sm">
                      <span className="font-medium">{plant.name}</span>
                      <div className="text-xs text-muted-foreground">
                        <span>{plant.type}</span> • <span className="italic">{plant.color}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ));
            })()}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
