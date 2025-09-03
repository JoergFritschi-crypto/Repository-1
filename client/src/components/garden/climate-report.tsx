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
  MapPin
} from "lucide-react";
import type { ClimateData } from "@/types/garden";

interface ClimateReportProps {
  location: string;
  climateData?: ClimateData;
  isLoading: boolean;
}

export default function ClimateReport({ location, climateData, isLoading }: ClimateReportProps) {
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
      <div className="grid md:grid-cols-2 gap-8">
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
              {location} Climate Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Hardiness Zone:</span>
              <Badge variant="default" data-testid="badge-hardiness-zone">
                {climateData.hardiness_zone || 'Zone 9a'}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Min Winter Temp:</span>
              <span className="font-medium" data-testid="text-min-winter-temp">
                {climateData.avg_temp_min?.toFixed(1)}°C
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Growing Season:</span>
              <span className="font-medium" data-testid="text-growing-season">
                {climateData.growing_season?.start && climateData.growing_season?.end
                  ? `${new Date(climateData.growing_season.start).toLocaleDateString()} - ${new Date(climateData.growing_season.end).toLocaleDateString()}`
                  : 'March - October'
                }
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Annual Rainfall:</span>
              <span className="font-medium" data-testid="text-annual-rainfall">
                {climateData.annual_rainfall?.toFixed(0)}mm
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Frost Dates:</span>
              <span className="font-medium" data-testid="text-frost-dates">
                {climateData.frost_dates?.last_frost && climateData.frost_dates?.first_frost
                  ? `${new Date(climateData.frost_dates.last_frost).toLocaleDateString()} - ${new Date(climateData.frost_dates.first_frost).toLocaleDateString()}`
                  : 'Nov 15 - Mar 15'
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

      {/* AI Recommendations */}
      <Card className="border-accent bg-accent/5">
        <CardHeader>
          <CardTitle className="flex items-center" data-testid="text-ai-recommendations-title">
            <Brain className="w-5 h-5 mr-2 text-accent" />
            AI Climate Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium mb-3">Recommended Plants:</h4>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-accent rounded-full mr-3"></span>
                  Hardy perennials (Lavender, Rosemary)
                </li>
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-accent rounded-full mr-3"></span>
                  Spring bulbs (Daffodils, Tulips)
                </li>
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-accent rounded-full mr-3"></span>
                  Deciduous shrubs (Hydrangea, Rose)
                </li>
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-accent rounded-full mr-3"></span>
                  Evergreen hedges (Box, Yew)
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-3">Garden Tips:</h4>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-secondary rounded-full mr-3"></span>
                  Plant spring bulbs in October
                </li>
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-secondary rounded-full mr-3"></span>
                  Mulch tender plants before winter
                </li>
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-secondary rounded-full mr-3"></span>
                  Consider rainwater collection
                </li>
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-secondary rounded-full mr-3"></span>
                  Plan for year-round interest
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
