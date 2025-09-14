import { useState, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { debounce } from "@/lib/performance";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Filter, X, Flower, Ruler, ChevronDown, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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
    selectedColors: [],
    includeLargeSpecimens: false
  });

  // Debounce the search to reduce API calls
  const debouncedOnSearch = useMemo(
    () => debounce((newFilters: any) => {
      onSearch(newFilters);
    }, 400),
    [onSearch]
  );

  const handleFilterChange = useCallback((key: string, value: any) => {
    const newFilters = { ...filters };
    if (value === undefined || value === "" || value === "all") {
      delete newFilters[key];
    } else {
      newFilters[key] = value;
    }
    setFilters(newFilters);
    // For non-slider filters, use debounced search
    if (key !== "heightMin" && key !== "heightMax" && key !== "spreadMin" && key !== "spreadMax") {
      debouncedOnSearch(newFilters);
    }
  }, [filters, debouncedOnSearch]);

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

  const clearFilters = useCallback(() => {
    const clearedFilters = {
      heightMin: 0,
      heightMax: 500,
      spreadMin: 0,
      spreadMax: 300,
      selectedColors: [],
      includeLargeSpecimens: false
    };
    setFilters(clearedFilters);
    onSearch({});
  }, [onSearch]);

  const activeFilterCount = Object.keys(filters).filter(key => {
    if (key === 'heightMin' && filters[key] === 0) return false;
    if (key === 'heightMax' && filters[key] === 500) return false;
    if (key === 'spreadMin' && filters[key] === 0) return false;
    if (key === 'spreadMax' && filters[key] === 300) return false;
    if (key === 'selectedColors' && filters[key].length === 0) return false;
    if (key === 'includeLargeSpecimens' && filters[key] === false) return false;
    return filters[key] !== undefined;
  }).length;

  return (
    <Card className="border-2 border-primary/20">
      <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 pb-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Filter className="w-6 h-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg font-bold">
                Plant Filters & Search
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Use any combination of filters to find your perfect plants
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="text-sm py-1 px-3" data-testid="badge-active-filters">
                <Filter className="w-3 h-3 mr-1" />
                {activeFilterCount} active
              </Badge>
            )}
            {totalResults !== undefined && (
              <Badge variant="outline" className="text-sm py-1 px-3" data-testid="badge-total-results">
                {totalResults} plants found
              </Badge>
            )}
            {activeFilterCount > 0 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={clearFilters}
                data-testid="button-clear-filters"
              >
                <X className="w-4 h-4 mr-1" />
                Clear All
              </Button>
            )}
            <Button
              variant="default"
              size="sm"
              onClick={applyFilters}
              className="bg-primary hover:bg-primary/90"
              data-testid="button-apply-filters"
            >
              <Search className="w-4 h-4 mr-1" />
              Search
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        {/* Main search bar - prominent at the top */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder="Search plants by common or scientific name..."
              value={filters.search || ""}
              onChange={(e) => handleFilterChange("search", e.target.value)}
              className="pl-10 h-12 text-base font-medium border-2 focus:border-primary"
              data-testid="input-search"
            />
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Tip: Use the filters below to narrow down your search by plant characteristics
          </p>
        </div>

        {/* All Filters Section - Always visible */}
        <div className="border rounded-lg p-4 bg-gray-50/50">
            <div className="space-y-6">
            {/* Plant Type - Multi-select */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Plant Types (Select Multiple)</label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-between h-10 text-sm font-medium"
                    data-testid="select-plant-types"
                  >
                    <span className="truncate">
                      {filters.plantTypes && filters.plantTypes.length > 0
                        ? `${filters.plantTypes.length} type${filters.plantTypes.length !== 1 ? 's' : ''} selected`
                        : "Select Plant Types"}
                    </span>
                    <ChevronDown className="h-4 w-4 ml-2 flex-shrink-0" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-64 max-h-80 overflow-y-auto">
                  <DropdownMenuCheckboxItem
                    checked={filters.plantTypes?.includes("perennial") || false}
                    onCheckedChange={(checked) => {
                      const current = filters.plantTypes || [];
                      const updated = checked 
                        ? [...current, "perennial"]
                        : current.filter((t: string) => t !== "perennial");
                      handleFilterChange("plantTypes", updated);
                    }}
                  >
                    Perennials
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={filters.plantTypes?.includes("annual") || false}
                    onCheckedChange={(checked) => {
                      const current = filters.plantTypes || [];
                      const updated = checked 
                        ? [...current, "annual"]
                        : current.filter((t: string) => t !== "annual");
                      handleFilterChange("plantTypes", updated);
                    }}
                  >
                    Annuals
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={filters.plantTypes?.includes("biennial") || false}
                    onCheckedChange={(checked) => {
                      const current = filters.plantTypes || [];
                      const updated = checked 
                        ? [...current, "biennial"]
                        : current.filter((t: string) => t !== "biennial");
                      handleFilterChange("plantTypes", updated);
                    }}
                  >
                    Biennials
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={filters.plantTypes?.includes("shrub") || false}
                    onCheckedChange={(checked) => {
                      const current = filters.plantTypes || [];
                      const updated = checked 
                        ? [...current, "shrub"]
                        : current.filter((t: string) => t !== "shrub");
                      handleFilterChange("plantTypes", updated);
                    }}
                  >
                    Shrubs
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={filters.plantTypes?.includes("tree") || false}
                    onCheckedChange={(checked) => {
                      const current = filters.plantTypes || [];
                      const updated = checked 
                        ? [...current, "tree"]
                        : current.filter((t: string) => t !== "tree");
                      handleFilterChange("plantTypes", updated);
                    }}
                  >
                    Trees
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={filters.plantTypes?.includes("bulb") || false}
                    onCheckedChange={(checked) => {
                      const current = filters.plantTypes || [];
                      const updated = checked 
                        ? [...current, "bulb"]
                        : current.filter((t: string) => t !== "bulb");
                      handleFilterChange("plantTypes", updated);
                    }}
                  >
                    Bulbs
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={filters.plantTypes?.includes("climber") || false}
                    onCheckedChange={(checked) => {
                      const current = filters.plantTypes || [];
                      const updated = checked 
                        ? [...current, "climber"]
                        : current.filter((t: string) => t !== "climber");
                      handleFilterChange("plantTypes", updated);
                    }}
                  >
                    Climbers
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={filters.plantTypes?.includes("grass") || false}
                    onCheckedChange={(checked) => {
                      const current = filters.plantTypes || [];
                      const updated = checked 
                        ? [...current, "grass"]
                        : current.filter((t: string) => t !== "grass");
                      handleFilterChange("plantTypes", updated);
                    }}
                  >
                    Ornamental Grasses
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={filters.plantTypes?.includes("succulent") || false}
                    onCheckedChange={(checked) => {
                      const current = filters.plantTypes || [];
                      const updated = checked 
                        ? [...current, "succulent"]
                        : current.filter((t: string) => t !== "succulent");
                      handleFilterChange("plantTypes", updated);
                    }}
                  >
                    Succulents
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={filters.plantTypes?.includes("cactus") || false}
                    onCheckedChange={(checked) => {
                      const current = filters.plantTypes || [];
                      const updated = checked 
                        ? [...current, "cactus"]
                        : current.filter((t: string) => t !== "cactus");
                      handleFilterChange("plantTypes", updated);
                    }}
                  >
                    Cacti
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={filters.plantTypes?.includes("fern") || false}
                    onCheckedChange={(checked) => {
                      const current = filters.plantTypes || [];
                      const updated = checked 
                        ? [...current, "fern"]
                        : current.filter((t: string) => t !== "fern");
                      handleFilterChange("plantTypes", updated);
                    }}
                  >
                    Ferns
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={filters.plantTypes?.includes("aquatic") || false}
                    onCheckedChange={(checked) => {
                      const current = filters.plantTypes || [];
                      const updated = checked 
                        ? [...current, "aquatic"]
                        : current.filter((t: string) => t !== "aquatic");
                      handleFilterChange("plantTypes", updated);
                    }}
                  >
                    Aquatic Plants
                  </DropdownMenuCheckboxItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            
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
                  {/* Large Specimen Checkbox */}
                  <div className="flex items-center justify-between p-3 bg-card/60 rounded-lg border border-secondary">
                    <label htmlFor="large-specimens" className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        id="large-specimens"
                        checked={filters.includeLargeSpecimens}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setFilters((prev: any) => ({
                            ...prev,
                            includeLargeSpecimens: checked,
                            heightMax: checked ? 0 : 500 // 0 means no limit when checked
                          }));
                        }}
                        className="w-4 h-4 text-green-600 rounded border-green-300 focus:ring-green-500"
                        data-testid="checkbox-large-specimens"
                      />
                      <span className="text-sm font-medium text-green-800">
                        Include large specimen trees
                      </span>
                      <span className="text-xs text-green-600">
                        (5m+)
                      </span>
                    </label>
                    {filters.includeLargeSpecimens && (
                      <Badge className="bg-primary/20 text-primary">
                        🌳 All heights
                      </Badge>
                    )}
                  </div>
                  
                  <div className="flex justify-between text-sm font-medium">
                    <span className="text-green-700 bg-green-100 px-2 py-1 rounded">
                      Min: {filters.heightMin === 0 ? 'Any' : `${(filters.heightMin / 100).toFixed(1)}m`}
                    </span>
                    <span className="text-green-700 bg-green-100 px-2 py-1 rounded">
                      Max: {filters.includeLargeSpecimens ? 'Any height' : 
                            filters.heightMax === 500 ? 'Any' : `${(filters.heightMax / 100).toFixed(1)}m`}
                    </span>
                  </div>
                  <div className="relative">
                    <Slider
                      min={0}
                      max={filters.includeLargeSpecimens ? 2000 : 500}
                      step={10}
                      value={[filters.heightMin, filters.includeLargeSpecimens ? 2000 : filters.heightMax]}
                      onValueChange={(value) => {
                        handleSliderChange("heightMin", value[0]);
                        if (!filters.includeLargeSpecimens) {
                          handleSliderChange("heightMax", value[1]);
                        }
                      }}
                      disabled={filters.includeLargeSpecimens && filters.heightMin === 0}
                      className="w-full [&_[role=slider]]:bg-green-600 [&_[role=slider]]:border-green-700 [&_.relative]:bg-green-200 [&_[data-orientation]]:bg-green-100"
                      data-testid="slider-height-range"
                    />
                  </div>
                  <div className="text-xs text-center text-green-600 font-medium">
                    {filters.includeLargeSpecimens 
                      ? "Showing all ornamental trees including large specimens"
                      : "From tiny ground covers to medium trees (up to 5m)"}
                  </div>
                  <div className="text-xs text-center text-muted-foreground">
                    {filters.includeLargeSpecimens
                      ? "Includes Araucaria, Cedars, and other specimen trees"
                      : "Default: Shows typical garden plants • Check box for larger trees"}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Spread/Width Range Slider */}
            <Card className="border-2 border-[#004025] bg-gradient-to-br from-[#004025]/10 to-[#004025]/5">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2 text-[#004025]">
                  <Ruler className="w-4 h-4 rotate-90 text-[#004025]" />
                  Spread/Width Range
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between text-sm font-medium">
                    <span className="text-[#004025] bg-[#004025]/10 px-2 py-1 rounded">
                      Min: {filters.spreadMin === 0 ? 'Any' : `${(filters.spreadMin / 100).toFixed(1)}m`}
                    </span>
                    <span className="text-[#004025] bg-[#004025]/10 px-2 py-1 rounded">
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
                      className="w-full [&_[role=slider]]:bg-[#004025] [&_[role=slider]]:border-[#004025] [&_.relative]:bg-[#004025]/20 [&_[data-orientation]]:bg-[#004025]/10"
                      data-testid="slider-spread-range"
                    />
                  </div>
                  <div className="text-xs text-center text-[#004025] font-medium">
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
                          <div className="w-5 h-5 bg-card rounded-full shadow-lg flex items-center justify-center">
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Select
                value={filters.sunlight || "all"}
                onValueChange={(value) => handleFilterChange("sunlight", value)}
              >
                <SelectTrigger className="h-10 text-sm font-medium w-full" data-testid="select-sunlight">
                  <SelectValue placeholder="Any Sun Requirements" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Any Sun Requirements</SelectItem>
                  <SelectItem value="full_sun">Full Sun</SelectItem>
                  <SelectItem value="part_shade">Part Shade</SelectItem>
                  <SelectItem value="full_shade">Full Shade</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={filters.water || "all"}
                onValueChange={(value) => handleFilterChange("water", value)}
              >
                <SelectTrigger className="h-10 text-sm font-medium w-full" data-testid="select-water">
                  <SelectValue placeholder="Any Water Requirements" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Any Water Requirements</SelectItem>
                  <SelectItem value="low">Low Water</SelectItem>
                  <SelectItem value="moderate">Moderate Water</SelectItem>
                  <SelectItem value="high">High Water</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={filters.soil_type || "all"}
                onValueChange={(value) => handleFilterChange("soil_type", value)}
              >
                <SelectTrigger className="h-10 text-sm font-medium w-full" data-testid="select-soil-type">
                  <SelectValue placeholder="Any Soil Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Any Soil Type</SelectItem>
                  <SelectItem value="clay">Clay</SelectItem>
                  <SelectItem value="loam">Loam</SelectItem>
                  <SelectItem value="sand">Sandy</SelectItem>
                  <SelectItem value="well-drained">Well-drained</SelectItem>
                  <SelectItem value="moist">Moist</SelectItem>
                  <SelectItem value="dry">Dry</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Row 2: More Growing Conditions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Select
                value={filters.soil_ph || "all"}
                onValueChange={(value) => handleFilterChange("soil_ph", value)}
              >
                <SelectTrigger className="h-10 text-sm font-medium w-full" data-testid="select-soil-ph">
                  <SelectValue placeholder="Any Soil pH" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Any Soil pH</SelectItem>
                  <SelectItem value="acidic">Acidic (pH below 6.5)</SelectItem>
                  <SelectItem value="neutral">Neutral (pH 6.5-7.5)</SelectItem>
                  <SelectItem value="alkaline">Alkaline (pH above 7.5)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Row 3: Additional Filters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Select
                value={filters.growth_rate || "all"}
                onValueChange={(value) => handleFilterChange("growth_rate", value)}
              >
                <SelectTrigger className="h-10 text-sm font-medium w-full" data-testid="select-growth-rate">
                  <SelectValue placeholder="Any Growth Pattern" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Any Growth Pattern</SelectItem>
                  <SelectItem value="slow">Slow Growing</SelectItem>
                  <SelectItem value="moderate">Moderate Growing</SelectItem>
                  <SelectItem value="fast">Fast Growing</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={filters.maintenance || "all"}
                onValueChange={(value) => handleFilterChange("maintenance", value)}
              >
                <SelectTrigger className="h-10 text-sm font-medium w-full" data-testid="select-maintenance">
                  <SelectValue placeholder="Any Care Level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Any Care Level</SelectItem>
                  <SelectItem value="low">Low Maintenance</SelectItem>
                  <SelectItem value="moderate">Moderate Maintenance</SelectItem>
                  <SelectItem value="high">High Maintenance</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={filters.hardiness || "all"}
                onValueChange={(value) => handleFilterChange("hardiness", value)}
              >
                <SelectTrigger className="h-10 text-sm font-medium w-full" data-testid="select-hardiness">
                  <SelectValue placeholder="All Hardiness Levels" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Hardiness Levels</SelectItem>
                  <SelectItem value="very-hardy">Very Hardy (USDA Zones 3-5)</SelectItem>
                  <SelectItem value="hardy">Hardy (USDA Zones 6-7)</SelectItem>
                  <SelectItem value="half-hardy">Half-Hardy (USDA Zones 8-9)</SelectItem>
                  <SelectItem value="tender">Tender (USDA Zones 10-11)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Row 4: Toxicity and Additional */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Toxicity Filter with RHS Ratings */}
              <div>
                <div className="flex items-center gap-1 mb-1">
                  <label className="text-sm font-medium text-gray-700">Plant Toxicity</label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="w-3 h-3 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p className="font-semibold mb-1">RHS Toxicity Ratings:</p>
                        <p className="text-xs mb-1"><span className="font-medium">A:</span> Poisonous - May cause serious illness or death</p>
                        <p className="text-xs mb-1"><span className="font-medium">B:</span> Skin/eye irritant - May cause rashes or irritation</p>
                        <p className="text-xs"><span className="font-medium">C:</span> Harmful if eaten - May cause stomach upset</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <Select
                  value={filters.toxicity || "all"}
                  onValueChange={(value) => handleFilterChange("toxicity", value)}
                >
                  <SelectTrigger className="h-10 text-sm font-medium w-full" data-testid="select-toxicity">
                    <SelectValue placeholder="Any Toxicity Level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Any Toxicity Level</SelectItem>
                    <SelectItem value="none">Non-toxic (Safe)</SelectItem>
                    <SelectItem value="a">RHS A - Poisonous</SelectItem>
                    <SelectItem value="b">RHS B - Skin/Eye Irritant</SelectItem>
                    <SelectItem value="c">RHS C - Harmful if Eaten</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Row 5: Bloom and Foliage - Multi-select */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Bloom Season - Multi-select */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Bloom Season (Select Multiple)</label>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-between h-10 text-sm font-medium"
                      data-testid="select-bloom-seasons"
                    >
                      <span className="truncate">
                        {filters.bloomSeasons && filters.bloomSeasons.length > 0
                          ? `${filters.bloomSeasons.length} season${filters.bloomSeasons.length !== 1 ? 's' : ''} selected`
                          : "Select Bloom Seasons"}
                      </span>
                      <ChevronDown className="h-4 w-4 ml-2 flex-shrink-0" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-64 max-h-80 overflow-y-auto">
                    <DropdownMenuCheckboxItem
                      checked={filters.bloomSeasons?.includes("early-spring") || false}
                      onCheckedChange={(checked) => {
                        const current = filters.bloomSeasons || [];
                        const updated = checked 
                          ? [...current, "early-spring"]
                          : current.filter((s: string) => s !== "early-spring");
                        handleFilterChange("bloomSeasons", updated);
                      }}
                    >
                      Early Spring (March-April)
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem
                      checked={filters.bloomSeasons?.includes("late-spring") || false}
                      onCheckedChange={(checked) => {
                        const current = filters.bloomSeasons || [];
                        const updated = checked 
                          ? [...current, "late-spring"]
                          : current.filter((s: string) => s !== "late-spring");
                        handleFilterChange("bloomSeasons", updated);
                      }}
                    >
                      Late Spring (May-June)
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem
                      checked={filters.bloomSeasons?.includes("early-summer") || false}
                      onCheckedChange={(checked) => {
                        const current = filters.bloomSeasons || [];
                        const updated = checked 
                          ? [...current, "early-summer"]
                          : current.filter((s: string) => s !== "early-summer");
                        handleFilterChange("bloomSeasons", updated);
                      }}
                    >
                      Early Summer (June-July)
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem
                      checked={filters.bloomSeasons?.includes("late-summer") || false}
                      onCheckedChange={(checked) => {
                        const current = filters.bloomSeasons || [];
                        const updated = checked 
                          ? [...current, "late-summer"]
                          : current.filter((s: string) => s !== "late-summer");
                        handleFilterChange("bloomSeasons", updated);
                      }}
                    >
                      Late Summer (August-September)
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem
                      checked={filters.bloomSeasons?.includes("early-fall") || false}
                      onCheckedChange={(checked) => {
                        const current = filters.bloomSeasons || [];
                        const updated = checked 
                          ? [...current, "early-fall"]
                          : current.filter((s: string) => s !== "early-fall");
                        handleFilterChange("bloomSeasons", updated);
                      }}
                    >
                      Early Fall (September-October)
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem
                      checked={filters.bloomSeasons?.includes("late-fall") || false}
                      onCheckedChange={(checked) => {
                        const current = filters.bloomSeasons || [];
                        const updated = checked 
                          ? [...current, "late-fall"]
                          : current.filter((s: string) => s !== "late-fall");
                        handleFilterChange("bloomSeasons", updated);
                      }}
                    >
                      Late Fall (October-November)
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem
                      checked={filters.bloomSeasons?.includes("winter") || false}
                      onCheckedChange={(checked) => {
                        const current = filters.bloomSeasons || [];
                        const updated = checked 
                          ? [...current, "winter"]
                          : current.filter((s: string) => s !== "winter");
                        handleFilterChange("bloomSeasons", updated);
                      }}
                    >
                      Winter (December-February)
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem
                      checked={filters.bloomSeasons?.includes("year-round") || false}
                      onCheckedChange={(checked) => {
                        const current = filters.bloomSeasons || [];
                        const updated = checked 
                          ? [...current, "year-round"]
                          : current.filter((s: string) => s !== "year-round");
                        handleFilterChange("bloomSeasons", updated);
                      }}
                    >
                      Year-round Blooming
                    </DropdownMenuCheckboxItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              
              {/* Foliage Type - Multi-select */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Foliage Type (Select Multiple)</label>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-between h-10 text-sm font-medium"
                      data-testid="select-foliage-types"
                    >
                      <span className="truncate">
                        {filters.foliageTypes && filters.foliageTypes.length > 0
                          ? `${filters.foliageTypes.length} type${filters.foliageTypes.length !== 1 ? 's' : ''} selected`
                          : "Select Foliage Types"}
                      </span>
                      <ChevronDown className="h-4 w-4 ml-2 flex-shrink-0" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-64 max-h-80 overflow-y-auto">
                    <DropdownMenuCheckboxItem
                      checked={filters.foliageTypes?.includes("evergreen") || false}
                      onCheckedChange={(checked) => {
                        const current = filters.foliageTypes || [];
                        const updated = checked 
                          ? [...current, "evergreen"]
                          : current.filter((f: string) => f !== "evergreen");
                        handleFilterChange("foliageTypes", updated);
                      }}
                    >
                      Evergreen
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem
                      checked={filters.foliageTypes?.includes("deciduous") || false}
                      onCheckedChange={(checked) => {
                        const current = filters.foliageTypes || [];
                        const updated = checked 
                          ? [...current, "deciduous"]
                          : current.filter((f: string) => f !== "deciduous");
                        handleFilterChange("foliageTypes", updated);
                      }}
                    >
                      Deciduous
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem
                      checked={filters.foliageTypes?.includes("semi-evergreen") || false}
                      onCheckedChange={(checked) => {
                        const current = filters.foliageTypes || [];
                        const updated = checked 
                          ? [...current, "semi-evergreen"]
                          : current.filter((f: string) => f !== "semi-evergreen");
                        handleFilterChange("foliageTypes", updated);
                      }}
                    >
                      Semi-Evergreen
                    </DropdownMenuCheckboxItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Row 6: Special Features - Checkboxes */}
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
        </div>
      </CardContent>
    </Card>
  );
}

export default PlantAdvancedSearch;