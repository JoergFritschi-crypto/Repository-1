import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, Filter, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface PlantAdvancedSearchProps {
  onSearch: (filters: any) => void;
  totalResults?: number;
}

export function PlantAdvancedSearch({ onSearch, totalResults }: PlantAdvancedSearchProps) {
  const [filters, setFilters] = useState<any>({});
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleFilterChange = (key: string, value: any) => {
    const newFilters = { ...filters };
    if (value === undefined || value === "" || value === "all") {
      delete newFilters[key];
    } else {
      newFilters[key] = value;
    }
    setFilters(newFilters);
    onSearch(newFilters);
  };

  const clearFilters = () => {
    setFilters({});
    onSearch({});
  };

  const activeFilterCount = Object.keys(filters).filter(key => filters[key] !== undefined).length;

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
            className="md:col-span-2"
            data-testid="input-search"
          />
          <Select
            value={filters.type || "all"}
            onValueChange={(value) => handleFilterChange("type", value)}
          >
            <SelectTrigger data-testid="select-plant-type">
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
            <SelectTrigger data-testid="select-sunlight">
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
          <div className="space-y-4 pt-4 border-t">
            {/* Row 1: Growing Conditions */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Select
                value={filters.watering || "all"}
                onValueChange={(value) => handleFilterChange("watering", value)}
              >
                <SelectTrigger data-testid="select-watering">
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
                <SelectTrigger data-testid="select-growth-rate">
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
                <SelectTrigger data-testid="select-maintenance">
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
                <SelectTrigger data-testid="select-hardiness">
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

            {/* Row 2: Flower & Color */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Select
                value={filters.flower_color || "all"}
                onValueChange={(value) => handleFilterChange("flower_color", value)}
              >
                <SelectTrigger data-testid="select-flower-color">
                  <SelectValue placeholder="Flower Color" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Any Color</SelectItem>
                  <SelectItem value="white">White</SelectItem>
                  <SelectItem value="yellow">Yellow</SelectItem>
                  <SelectItem value="orange">Orange</SelectItem>
                  <SelectItem value="red">Red</SelectItem>
                  <SelectItem value="pink">Pink</SelectItem>
                  <SelectItem value="purple">Purple</SelectItem>
                  <SelectItem value="blue">Blue</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={filters.flowering_season || "all"}
                onValueChange={(value) => handleFilterChange("flowering_season", value)}
              >
                <SelectTrigger data-testid="select-flowering-season">
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
                <SelectTrigger data-testid="select-foliage">
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
                <SelectTrigger data-testid="select-family">
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
            </div>

            {/* Row 3: Special Features - Checkboxes */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              <label className="flex items-center space-x-2">
                <Checkbox
                  checked={filters.drought_tolerant || false}
                  onCheckedChange={(checked) => handleFilterChange("drought_tolerant", checked)}
                  data-testid="checkbox-drought-tolerant"
                />
                <span className="text-sm">Drought Tolerant</span>
              </label>
              <label className="flex items-center space-x-2">
                <Checkbox
                  checked={filters.salt_tolerant || false}
                  onCheckedChange={(checked) => handleFilterChange("salt_tolerant", checked)}
                  data-testid="checkbox-salt-tolerant"
                />
                <span className="text-sm">Salt Tolerant</span>
              </label>
              <label className="flex items-center space-x-2">
                <Checkbox
                  checked={filters.pet_safe || false}
                  onCheckedChange={(checked) => handleFilterChange("pet_safe", checked)}
                  data-testid="checkbox-pet-safe"
                />
                <span className="text-sm">Pet Safe</span>
              </label>
              <label className="flex items-center space-x-2">
                <Checkbox
                  checked={filters.edible || false}
                  onCheckedChange={(checked) => handleFilterChange("edible", checked)}
                  data-testid="checkbox-edible"
                />
                <span className="text-sm">Edible</span>
              </label>
              <label className="flex items-center space-x-2">
                <Checkbox
                  checked={filters.medicinal || false}
                  onCheckedChange={(checked) => handleFilterChange("medicinal", checked)}
                  data-testid="checkbox-medicinal"
                />
                <span className="text-sm">Medicinal</span>
              </label>
              <label className="flex items-center space-x-2">
                <Checkbox
                  checked={filters.indoor || false}
                  onCheckedChange={(checked) => handleFilterChange("indoor", checked)}
                  data-testid="checkbox-indoor"
                />
                <span className="text-sm">Indoor</span>
              </label>
              <label className="flex items-center space-x-2">
                <Checkbox
                  checked={filters.invasive === false}
                  onCheckedChange={(checked) => handleFilterChange("invasive", checked ? false : undefined)}
                  data-testid="checkbox-non-invasive"
                />
                <span className="text-sm">Non-Invasive</span>
              </label>
              <label className="flex items-center space-x-2">
                <Checkbox
                  checked={filters.attracts_pollinators || false}
                  onCheckedChange={(checked) => handleFilterChange("attracts_pollinators", checked)}
                  data-testid="checkbox-attracts-pollinators"
                />
                <span className="text-sm">Attracts Pollinators</span>
              </label>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default PlantAdvancedSearch;