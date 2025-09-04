import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CompactPlantCard } from "./compact-plant-card";
import { Search, Filter, X, Loader } from "lucide-react";
import type { Plant, PlantSearchFilters } from "@/types/plant";

interface PlantSearchProps {
  onResults?: (results: Plant[]) => void;
}

export default function PlantSearch({ onResults }: PlantSearchProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<PlantSearchFilters>({});
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  const { data: searchResults, isLoading, error } = useQuery({
    queryKey: ["/api/plants/search", { q: searchQuery, ...filters }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.append("q", searchQuery.trim());
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "" && value !== "any") {
          params.append(key, value.toString());
        }
      });
      
      const response = await fetch(`/api/plants/search?${params}`);
      if (!response.ok) {
        throw new Error(`Search failed: ${response.status}`);
      }
      return response.json();
    },
    enabled: searchQuery.trim().length > 0 || Object.keys(filters).some(key => filters[key] !== undefined),
  });

  const updateFilter = (key: keyof PlantSearchFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value === "" || value === "any" ? undefined : value,
    }));
  };

  const clearFilters = () => {
    setFilters({});
    setSearchQuery("");
  };

  const activeFiltersCount = Object.values(filters).filter(v => v !== undefined && v !== null && v !== "").length;

  // Notify parent of results
  if (onResults && searchResults) {
    onResults(searchResults);
  }

  return (
    <div className="space-y-6">
      {/* Search Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center">
              <Search className="w-5 h-5 mr-2" />
              Advanced Plant Search
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              data-testid="button-toggle-filters"
            >
              <Filter className="w-4 h-4 mr-2" />
              Filters {activeFiltersCount > 0 && `(${activeFiltersCount})`}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Main Search */}
          <div>
            <Label htmlFor="search-input">Search Plants</Label>
            <div className="relative mt-2">
              <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
              <Input
                id="search-input"
                placeholder="Search by common name, scientific name, or family..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="input-advanced-search"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 top-1.5"
                  onClick={() => setSearchQuery("")}
                  data-testid="button-clear-search"
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Advanced Filters */}
          {showAdvancedFilters && (
            <div className="space-y-6 border-t pt-6">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Advanced Filters</h3>
                {activeFiltersCount > 0 && (
                  <Button variant="outline" size="sm" onClick={clearFilters} data-testid="button-clear-all-filters">
                    Clear All
                  </Button>
                )}
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Plant Type */}
                <div>
                  <Label>Plant Type</Label>
                  <Select onValueChange={(value) => updateFilter("type", value)}>
                    <SelectTrigger className="mt-2" data-testid="select-advanced-plant-type">
                      <SelectValue placeholder="Any type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">Any type</SelectItem>
                      <SelectItem value="perennial">Perennials</SelectItem>
                      <SelectItem value="annual">Annuals</SelectItem>
                      <SelectItem value="shrub">Shrubs</SelectItem>
                      <SelectItem value="tree">Trees</SelectItem>
                      <SelectItem value="bulb">Bulbs</SelectItem>
                      <SelectItem value="grass">Ornamental Grasses</SelectItem>
                      <SelectItem value="vine">Vines</SelectItem>
                      <SelectItem value="fern">Ferns</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Sun Requirements */}
                <div>
                  <Label>Sun Requirements</Label>
                  <Select onValueChange={(value) => updateFilter("sun_requirements", value)}>
                    <SelectTrigger className="mt-2" data-testid="select-advanced-sun-requirements">
                      <SelectValue placeholder="Any sun exposure" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">Any sun exposure</SelectItem>
                      <SelectItem value="full_sun">Full Sun (6+ hours)</SelectItem>
                      <SelectItem value="partial_sun">Partial Sun (4-6 hours)</SelectItem>
                      <SelectItem value="partial_shade">Partial Shade (2-4 hours)</SelectItem>
                      <SelectItem value="full_shade">Full Shade (0-2 hours)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Hardiness Zone */}
                <div>
                  <Label>Hardiness Zone</Label>
                  <Select onValueChange={(value) => updateFilter("hardiness_zone", value)}>
                    <SelectTrigger className="mt-2" data-testid="select-advanced-hardiness-zone">
                      <SelectValue placeholder="Any zone" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">Any zone</SelectItem>
                      {Array.from({ length: 11 }, (_, i) => i + 1).map(zone => (
                        <SelectItem key={zone} value={zone.toString()}>Zone {zone}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator />

              {/* Special Features */}
              <div>
                <Label className="text-base font-semibold">Special Features</Label>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mt-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="pet-safe"
                      checked={filters.pet_safe || false}
                      onCheckedChange={(checked) => updateFilter("pet_safe", checked || undefined)}
                      data-testid="checkbox-advanced-pet-safe"
                    />
                    <Label htmlFor="pet-safe" className="text-sm font-normal">Pet Safe</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="drought-tolerant"
                      checked={filters.drought_tolerant || false}
                      onCheckedChange={(checked) => updateFilter("drought_tolerant", checked || undefined)}
                      data-testid="checkbox-advanced-drought-tolerant"
                    />
                    <Label htmlFor="drought-tolerant" className="text-sm font-normal">Drought Tolerant</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="fragrant"
                      checked={filters.fragrant || false}
                      onCheckedChange={(checked) => updateFilter("fragrant", checked || undefined)}
                      data-testid="checkbox-advanced-fragrant"
                    />
                    <Label htmlFor="fragrant" className="text-sm font-normal">Fragrant</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="attracts-pollinators"
                      checked={filters.attracts_pollinators || false}
                      onCheckedChange={(checked) => updateFilter("attracts_pollinators", checked || undefined)}
                      data-testid="checkbox-advanced-attracts-pollinators"
                    />
                    <Label htmlFor="attracts-pollinators" className="text-sm font-normal">Attracts Pollinators</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="deer-resistant"
                      checked={filters.deer_resistant || false}
                      onCheckedChange={(checked) => updateFilter("deer_resistant", checked || undefined)}
                      data-testid="checkbox-advanced-deer-resistant"
                    />
                    <Label htmlFor="deer-resistant" className="text-sm font-normal">Deer Resistant</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="evergreen"
                      checked={filters.evergreen || false}
                      onCheckedChange={(checked) => updateFilter("evergreen", checked || undefined)}
                      data-testid="checkbox-advanced-evergreen"
                    />
                    <Label htmlFor="evergreen" className="text-sm font-normal">Evergreen</Label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Active Filters Display */}
          {activeFiltersCount > 0 && (
            <div className="flex flex-wrap gap-2">
              <span className="text-sm font-medium">Active filters:</span>
              {Object.entries(filters).map(([key, value]) => {
                if (value === undefined || value === null || value === "") return null;
                return (
                  <Badge
                    key={key}
                    variant="secondary"
                    className="flex items-center gap-1"
                    data-testid={`badge-filter-${key}`}
                  >
                    {key.replace(/_/g, " ")}: {value.toString()}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto p-0 ml-1"
                      onClick={() => updateFilter(key as keyof PlantSearchFilters, undefined)}
                      data-testid={`button-remove-filter-${key}`}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </Badge>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Search Results */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span data-testid="text-search-results-title">Search Results</span>
            {searchResults && (
              <Badge variant="outline" data-testid="badge-results-count">
                {searchResults.length} plants found
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12" data-testid="loading-search-results">
              <Loader className="w-8 h-8 animate-spin text-primary mr-3" />
              <span className="text-muted-foreground">Searching plants...</span>
            </div>
          ) : error ? (
            <div className="text-center py-12" data-testid="search-error-state">
              <div className="text-destructive mb-2">Search Error</div>
              <p className="text-muted-foreground">
                Unable to search plants. Please try again.
              </p>
              <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>
                Retry
              </Button>
            </div>
          ) : !searchQuery.trim() && activeFiltersCount === 0 ? (
            <div className="text-center py-12" data-testid="search-empty-state">
              <Search className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Start Your Plant Search</h3>
              <p className="text-muted-foreground">
                Enter a search term or apply filters to find plants in our database
              </p>
            </div>
          ) : searchResults && searchResults.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4" data-testid="search-results-grid">
              {searchResults.map((plant: Plant) => (
                <CompactPlantCard
                  key={plant.id}
                  plant={plant}
                  isAdmin={false}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12" data-testid="search-no-results">
              <Search className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Plants Found</h3>
              <p className="text-muted-foreground mb-4">
                No plants match your current search criteria. Try adjusting your search terms or filters.
              </p>
              <Button variant="outline" onClick={clearFilters} data-testid="button-clear-search-filters">
                Clear Search & Filters
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
