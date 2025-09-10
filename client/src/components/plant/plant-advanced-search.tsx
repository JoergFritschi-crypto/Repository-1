import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Search, Filter, X, Flower, Ruler } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface PlantAdvancedSearchProps {
  onSearch: (filters: any) => void;
  totalResults?: number;
}

// Define color palette
const colorPalette = [
  { name: "White", value: "white", color: "#FFFFFF", border: true },
  { name: "Cream", value: "cream", color: "#FFFDD0" },
  { name: "Yellow", value: "yellow", color: "#FFD700" },
  { name: "Orange", value: "orange", color: "#FFA500" },
  { name: "Peach", value: "peach", color: "#FFDAB9" },
  { name: "Red", value: "red", color: "#DC143C" },
  { name: "Pink", value: "pink", color: "#FFB6C1" },
  { name: "Hot Pink", value: "hot-pink", color: "#FF69B4" },
  { name: "Magenta", value: "magenta", color: "#FF00FF" },
  { name: "Purple", value: "purple", color: "#9370DB" },
  { name: "Lavender", value: "lavender", color: "#E6E6FA" },
  { name: "Blue", value: "blue", color: "#4169E1" },
  { name: "Light Blue", value: "light-blue", color: "#87CEEB" },
  { name: "Turquoise", value: "turquoise", color: "#40E0D0" },
  { name: "Green", value: "green", color: "#228B22" },
  { name: "Lime", value: "lime", color: "#32CD32" },
  { name: "Brown", value: "brown", color: "#8B4513" },
  { name: "Black", value: "black", color: "#000000" },
];

export function PlantAdvancedSearch({ onSearch, totalResults }: PlantAdvancedSearchProps) {
  const [filters, setFilters] = useState<any>({
    heightMin: 0,
    heightMax: 500,
    spreadMin: 0,
    spreadMax: 300,
    selectedColors: []
  });
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleFilterChange = (key: string, value: any) => {
    const newFilters = { ...filters };
    if (value === undefined || value === "" || value === "all") {
      delete newFilters[key];
    } else {
      newFilters[key] = value;
    }
    setFilters(newFilters);
    // For non-slider filters, search immediately
    if (key !== "heightMin" && key !== "heightMax" && key !== "spreadMin" && key !== "spreadMax") {
      onSearch(newFilters);
    }
  };

  const handleSliderChange = (key: string, value: any) => {
    // Update local state without triggering search
    setFilters((prev: any) => ({ ...prev, [key]: value }));
  };

  const applyFilters = () => {
    onSearch(filters);
  };

  const handleColorToggle = (color: string) => {
    const newColors = filters.selectedColors.includes(color) 
      ? filters.selectedColors.filter((c: string) => c !== color)
      : [...filters.selectedColors, color];
    const newFilters = { ...filters, selectedColors: newColors };
    setFilters(newFilters);
    // Don't search immediately for color changes
  };

  const clearFilters = () => {
    const clearedFilters = {
      heightMin: 0,
      heightMax: 500,
      spreadMin: 0,
      spreadMax: 300,
      selectedColors: []
    };
    setFilters(clearedFilters);
    onSearch({});
  };

  const activeFilterCount = Object.keys(filters).filter(key => {
    if (key === 'heightMin' && filters[key] === 0) return false;
    if (key === 'heightMax' && filters[key] === 500) return false;
    if (key === 'spreadMin' && filters[key] === 0) return false;
    if (key === 'spreadMax' && filters[key] === 300) return false;
    if (key === 'selectedColors' && filters[key].length === 0) return false;
    return filters[key] !== undefined;
  }).length;

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2">
            <Search className="w-5 h-5" />
            Advanced Search
          </CardTitle>
          <div className="flex items-center gap-2">
            {activeFilterCount > 0 && (
              <Badge variant="secondary" data-testid="badge-active-filters">
                {activeFilterCount} filter{activeFilterCount !== 1 ? 's' : ''} active
              </Badge>
            )}
            {totalResults !== undefined && (
              <Badge variant="outline" data-testid="badge-total-results">
                {totalResults} results
              </Badge>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAdvanced(!showAdvanced)}
              data-testid="button-toggle-advanced"
            >
              <Filter className="w-4 h-4 mr-1" />
              {showAdvanced ? 'Hide' : 'Show'} Filters
            </Button>
            {showAdvanced && (
              <Button
                variant="default"
                size="sm"
                onClick={applyFilters}
                data-testid="button-apply-filters"
              >
                <Search className="w-4 h-4 mr-1" />
                Apply
              </Button>
            )}
            {activeFilterCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                data-testid="button-clear-filters"
              >
                <X className="w-4 h-4 mr-1" />
                Clear
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Basic Search */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <Input
            placeholder="Search by name..."
            value={filters.search || ""}
            onChange={(e) => handleFilterChange("search", e.target.value)}
            className="md:col-span-2 h-10 text-sm font-medium"
            data-testid="input-search"
          />
          <Select
            value={filters.type || "all"}
            onValueChange={(value) => handleFilterChange("type", value)}
          >
            <SelectTrigger className="h-10 text-sm font-medium" data-testid="select-plant-type">
              <SelectValue placeholder="Plant Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="perennial">Perennials</SelectItem>
              <SelectItem value="annual">Annuals</SelectItem>
              <SelectItem value="biennial">Biennials</SelectItem>
              <SelectItem value="shrub">Shrubs</SelectItem>
              <SelectItem value="tree">Trees</SelectItem>
              <SelectItem value="bulb">Bulbs</SelectItem>
              <SelectItem value="climber">Climbers</SelectItem>
              <SelectItem value="grass">Ornamental Grasses</SelectItem>
              <SelectItem value="succulent">Succulents</SelectItem>
              <SelectItem value="cactus">Cacti</SelectItem>
              <SelectItem value="fern">Ferns</SelectItem>
              <SelectItem value="aquatic">Aquatic Plants</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={filters.sunlight || "all"}
            onValueChange={(value) => handleFilterChange("sunlight", value)}
          >
            <SelectTrigger className="h-10 text-sm font-medium" data-testid="select-sunlight">
              <SelectValue placeholder="Sun Requirements" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any Sun</SelectItem>
              <SelectItem value="full_sun">Full Sun</SelectItem>
              <SelectItem value="part_shade">Part Shade</SelectItem>
              <SelectItem value="full_shade">Full Shade</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Advanced Filters */}
        {showAdvanced && (
          <div className="space-y-6 pt-4 border-t">
            {/* Height Range Slider */}
            <Card className="border-2 border-green-200 bg-gradient-to-br from-green-50 to-emerald-50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2 text-green-800">
                  <Ruler className="w-4 h-4 text-green-600" />
                  Height Range
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between text-sm font-medium">
                    <span className="text-green-700 bg-green-100 px-2 py-1 rounded">
                      Min: {filters.heightMin === 0 ? 'Any' : `${(filters.heightMin / 100).toFixed(1)}m`}
                    </span>
                    <span className="text-green-700 bg-green-100 px-2 py-1 rounded">
                      Max: {filters.heightMax === 500 ? 'Any' : `${(filters.heightMax / 100).toFixed(1)}m`}
                    </span>
                  </div>
                  <div className="relative">
                    <Slider
                      min={0}
                      max={500}
                      step={10}
                      value={[filters.heightMin, filters.heightMax]}
                      onValueChange={(value) => {
                        handleSliderChange("heightMin", value[0]);
                        handleSliderChange("heightMax", value[1]);
                      }}
                      className="w-full [&_[role=slider]]:bg-green-600 [&_[role=slider]]:border-green-700 [&_.relative]:bg-green-200 [&_[data-orientation]]:bg-green-100"
                      data-testid="slider-height-range"
                    />
                  </div>
                  <div className="text-xs text-center text-green-600 font-medium">
                    From tiny ground covers to towering trees
                  </div>
                  <div className="text-xs text-center text-muted-foreground">
                    Default: Shows all heights • Adjust to filter
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Spread/Width Range Slider */}
            <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-sky-50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2 text-blue-800">
                  <Ruler className="w-4 h-4 rotate-90 text-blue-600" />
                  Spread/Width Range
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between text-sm font-medium">
                    <span className="text-blue-700 bg-blue-100 px-2 py-1 rounded">
                      Min: {filters.spreadMin === 0 ? 'Any' : `${(filters.spreadMin / 100).toFixed(1)}m`}
                    </span>
                    <span className="text-blue-700 bg-blue-100 px-2 py-1 rounded">
                      Max: {filters.spreadMax === 300 ? 'Any' : `${(filters.spreadMax / 100).toFixed(1)}m`}
                    </span>
                  </div>
                  <div className="relative">
                    <Slider
                      min={0}
                      max={300}
                      step={10}
                      value={[filters.spreadMin, filters.spreadMax]}
                      onValueChange={(value) => {
                        handleSliderChange("spreadMin", value[0]);
                        handleSliderChange("spreadMax", value[1]);
                      }}
                      className="w-full [&_[role=slider]]:bg-blue-600 [&_[role=slider]]:border-blue-700 [&_.relative]:bg-blue-200 [&_[data-orientation]]:bg-blue-100"
                      data-testid="slider-spread-range"
                    />
                  </div>
                  <div className="text-xs text-center text-blue-600 font-medium">
                    Plant width for proper spacing
                  </div>
                  <div className="text-xs text-center text-muted-foreground">
                    Default: Shows all spreads • Adjust to filter
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Visual Color Palette */}
            <Card className="border-2">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Flower className="w-4 h-4" />
                  Colors (Select All That Apply)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-6 md:grid-cols-9 gap-2">
                  {colorPalette.map((color) => (
                    <button
                      key={color.value}
                      onClick={() => handleColorToggle(color.value)}
                      className={`
                        relative w-12 h-12 rounded-lg transition-all transform hover:scale-110
                        ${filters.selectedColors.includes(color.value) 
                          ? 'ring-2 ring-primary ring-offset-2 scale-105' 
                          : 'hover:ring-2 hover:ring-gray-300'}
                        ${color.border ? 'border-2 border-gray-300' : ''}
                      `}
                      style={{ backgroundColor: color.color }}
                      title={color.name}
                      data-testid={`color-${color.value}`}
                    >
                      {filters.selectedColors.includes(color.value) && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-5 h-5 bg-white rounded-full shadow-lg flex items-center justify-center">
                            <span className="text-xs">✓</span>
                          </div>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
                {filters.selectedColors.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {filters.selectedColors.map((color: string) => (
                      <Badge key={color} variant="secondary" className="text-xs">
                        {colorPalette.find(c => c.value === color)?.name}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Row 1: Growing Conditions */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Select
                value={filters.watering || "all"}
                onValueChange={(value) => handleFilterChange("watering", value)}
              >
                <SelectTrigger className="h-10 text-sm font-medium" data-testid="select-watering">
                  <SelectValue placeholder="Water Needs" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Any Water</SelectItem>
                  <SelectItem value="minimal">Minimal</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="moderate">Moderate</SelectItem>
                  <SelectItem value="frequent">Frequent</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={filters.growth_rate || "all"}
                onValueChange={(value) => handleFilterChange("growth_rate", value)}
              >
                <SelectTrigger className="h-10 text-sm font-medium" data-testid="select-growth-rate">
                  <SelectValue placeholder="Growth Rate" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Any Growth</SelectItem>
                  <SelectItem value="slow">Slow</SelectItem>
                  <SelectItem value="moderate">Moderate</SelectItem>
                  <SelectItem value="fast">Fast</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={filters.maintenance || "all"}
                onValueChange={(value) => handleFilterChange("maintenance", value)}
              >
                <SelectTrigger className="h-10 text-sm font-medium" data-testid="select-maintenance">
                  <SelectValue placeholder="Maintenance" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Any Level</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="moderate">Moderate</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={filters.hardiness || "all"}
                onValueChange={(value) => handleFilterChange("hardiness", value)}
              >
                <SelectTrigger className="h-10 text-sm font-medium" data-testid="select-hardiness">
                  <SelectValue placeholder="Hardiness Zone" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Zones</SelectItem>
                  <SelectItem value="3-5">Zones 3-5 (Cold)</SelectItem>
                  <SelectItem value="6-7">Zones 6-7 (Temperate)</SelectItem>
                  <SelectItem value="8-9">Zones 8-9 (Warm)</SelectItem>
                  <SelectItem value="10-11">Zones 10-11 (Tropical)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Row 2: Additional Filters */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Select
                value={filters.flowering_season || "all"}
                onValueChange={(value) => handleFilterChange("flowering_season", value)}
              >
                <SelectTrigger className="h-10 text-sm font-medium" data-testid="select-flowering-season">
                  <SelectValue placeholder="Bloom Time" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Any Season</SelectItem>
                  <SelectItem value="spring">Spring</SelectItem>
                  <SelectItem value="summer">Summer</SelectItem>
                  <SelectItem value="fall">Fall</SelectItem>
                  <SelectItem value="winter">Winter</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={filters.foliage || "all"}
                onValueChange={(value) => handleFilterChange("foliage", value)}
              >
                <SelectTrigger className="h-10 text-sm font-medium" data-testid="select-foliage">
                  <SelectValue placeholder="Foliage Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Any Foliage</SelectItem>
                  <SelectItem value="evergreen">Evergreen</SelectItem>
                  <SelectItem value="deciduous">Deciduous</SelectItem>
                  <SelectItem value="semi-evergreen">Semi-Evergreen</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={filters.family || "all"}
                onValueChange={(value) => handleFilterChange("family", value)}
              >
                <SelectTrigger className="h-10 text-sm font-medium" data-testid="select-family">
                  <SelectValue placeholder="Plant Family" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Families</SelectItem>
                  <SelectItem value="Asteraceae">Asteraceae (Daisy)</SelectItem>
                  <SelectItem value="Rosaceae">Rosaceae (Rose)</SelectItem>
                  <SelectItem value="Lamiaceae">Lamiaceae (Mint)</SelectItem>
                  <SelectItem value="Fabaceae">Fabaceae (Legume)</SelectItem>
                  <SelectItem value="Solanaceae">Solanaceae (Nightshade)</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={filters.soil_type || "all"}
                onValueChange={(value) => handleFilterChange("soil_type", value)}
              >
                <SelectTrigger className="h-10 text-sm font-medium" data-testid="select-soil-type">
                  <SelectValue placeholder="Soil Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Any Soil</SelectItem>
                  <SelectItem value="clay">Clay</SelectItem>
                  <SelectItem value="loam">Loam</SelectItem>
                  <SelectItem value="sand">Sand</SelectItem>
                  <SelectItem value="chalk">Chalk</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Row 3: Special Features - Checkboxes */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              <label className="flex items-center space-x-2">
                <Checkbox
                  checked={filters.drought_tolerant || false}
                  onCheckedChange={(checked) => handleFilterChange("drought_tolerant", checked)}
                  data-testid="checkbox-drought-tolerant"
                />
                <span className="text-sm font-medium">Drought Tolerant</span>
              </label>
              <label className="flex items-center space-x-2">
                <Checkbox
                  checked={filters.salt_tolerant || false}
                  onCheckedChange={(checked) => handleFilterChange("salt_tolerant", checked)}
                  data-testid="checkbox-salt-tolerant"
                />
                <span className="text-sm font-medium">Salt Tolerant</span>
              </label>
              <label className="flex items-center space-x-2">
                <Checkbox
                  checked={filters.pet_safe || false}
                  onCheckedChange={(checked) => handleFilterChange("pet_safe", checked)}
                  data-testid="checkbox-pet-safe"
                />
                <span className="text-sm font-medium">Pet Safe</span>
              </label>
              <label className="flex items-center space-x-2">
                <Checkbox
                  checked={filters.edible || false}
                  onCheckedChange={(checked) => handleFilterChange("edible", checked)}
                  data-testid="checkbox-edible"
                />
                <span className="text-sm font-medium">Edible</span>
              </label>
              <label className="flex items-center space-x-2">
                <Checkbox
                  checked={filters.medicinal || false}
                  onCheckedChange={(checked) => handleFilterChange("medicinal", checked)}
                  data-testid="checkbox-medicinal"
                />
                <span className="text-sm font-medium">Medicinal</span>
              </label>
              <label className="flex items-center space-x-2">
                <Checkbox
                  checked={filters.indoor || false}
                  onCheckedChange={(checked) => handleFilterChange("indoor", checked)}
                  data-testid="checkbox-indoor"
                />
                <span className="text-sm font-medium">Indoor</span>
              </label>
              <label className="flex items-center space-x-2">
                <Checkbox
                  checked={filters.invasive === false}
                  onCheckedChange={(checked) => handleFilterChange("invasive", checked ? false : undefined)}
                  data-testid="checkbox-non-invasive"
                />
                <span className="text-sm font-medium">Non-Invasive</span>
              </label>
              <label className="flex items-center space-x-2">
                <Checkbox
                  checked={filters.attracts_pollinators || false}
                  onCheckedChange={(checked) => handleFilterChange("attracts_pollinators", checked)}
                  data-testid="checkbox-attracts-pollinators"
                />
                <span className="text-sm font-medium">Attracts Pollinators</span>
              </label>
              <label className="flex items-center space-x-2">
                <Checkbox
                  checked={filters.fragrant || false}
                  onCheckedChange={(checked) => handleFilterChange("fragrant", checked)}
                  data-testid="checkbox-fragrant"
                />
                <span className="text-sm font-medium">Fragrant</span>
              </label>
              <label className="flex items-center space-x-2">
                <Checkbox
                  checked={filters.native || false}
                  onCheckedChange={(checked) => handleFilterChange("native", checked)}
                  data-testid="checkbox-native"
                />
                <span className="text-sm font-medium">Native</span>
              </label>
              <label className="flex items-center space-x-2">
                <Checkbox
                  checked={filters.deer_resistant || false}
                  onCheckedChange={(checked) => handleFilterChange("deer_resistant", checked)}
                  data-testid="checkbox-deer-resistant"
                />
                <span className="text-sm font-medium">Deer Resistant</span>
              </label>
              <label className="flex items-center space-x-2">
                <Checkbox
                  checked={filters.rabbit_resistant || false}
                  onCheckedChange={(checked) => handleFilterChange("rabbit_resistant", checked)}
                  data-testid="checkbox-rabbit-resistant"
                />
                <span className="text-sm font-medium">Rabbit Resistant</span>
              </label>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default PlantAdvancedSearch;