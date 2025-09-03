import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { 
  Search, 
  Filter,
  ChevronDown,
  ChevronUp,
  X,
  Leaf,
  Sun,
  Droplets,
  TreePine,
  Flower2,
  AlertTriangle
} from "lucide-react";

export interface PlantSearchFilters {
  botanicalName?: string;
  genus?: string;
  species?: string;
  commonName?: string;
  type?: string;
  hardiness?: string[];
  sunlight?: string[];
  watering?: string;
  careLevel?: string;
  droughtTolerant?: boolean;
  saltTolerant?: boolean;
  thorny?: boolean;
  tropical?: boolean;
  poisonousToHumans?: number;
  poisonousToPets?: number;
  medicinal?: boolean;
  cuisine?: boolean;
}

interface AdvancedSearchProps {
  onSearch: (filters: PlantSearchFilters) => void;
  totalResults?: number;
}

export function PlantAdvancedSearch({ onSearch, totalResults = 0 }: AdvancedSearchProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [filters, setFilters] = useState<PlantSearchFilters>({});
  const [activeFilters, setActiveFilters] = useState<string[]>([]);

  const handleSearch = () => {
    const filtersToApply: PlantSearchFilters = {};
    const activeFilterList: string[] = [];

    // Add non-empty filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== "" && value !== false && 
          !(Array.isArray(value) && value.length === 0)) {
        filtersToApply[key as keyof PlantSearchFilters] = value;
        activeFilterList.push(key);
      }
    });

    setActiveFilters(activeFilterList);
    onSearch(filtersToApply);
  };

  const clearFilters = () => {
    setFilters({});
    setActiveFilters([]);
    onSearch({});
  };

  const removeFilter = (filterKey: string) => {
    const newFilters = { ...filters };
    delete newFilters[filterKey as keyof PlantSearchFilters];
    setFilters(newFilters);
    handleSearch();
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Search className="w-5 h-5" />
            Advanced Plant Search
          </CardTitle>
          <div className="flex items-center gap-2">
            {activeFilters.length > 0 && (
              <Badge variant="secondary">
                {activeFilters.length} filters active
              </Badge>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsOpen(!isOpen)}
            >
              <Filter className="w-4 h-4 mr-2" />
              {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {/* Quick Search Bar */}
        <div className="flex gap-2 mb-4">
          <div className="flex-1">
            <Input
              placeholder="Search by botanical or common name..."
              value={filters.botanicalName || ""}
              onChange={(e) => setFilters({ ...filters, botanicalName: e.target.value })}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              className="w-full"
            />
          </div>
          <Button onClick={handleSearch}>
            <Search className="w-4 h-4 mr-2" />
            Search
          </Button>
        </div>

        {/* Active Filters Display */}
        {activeFilters.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {activeFilters.map(filter => (
              <Badge key={filter} variant="default" className="pr-1">
                {filter.replace(/([A-Z])/g, ' $1').trim()}
                <button
                  onClick={() => removeFilter(filter)}
                  className="ml-1 hover:bg-background/20 rounded p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Clear all
            </Button>
          </div>
        )}

        {/* Advanced Filters */}
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleContent>
            <div className="space-y-6 pt-4 border-t">
              {/* Botanical Identity */}
              <div>
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <Leaf className="w-4 h-4" />
                  Botanical Identity
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="genus">Genus</Label>
                    <Input
                      id="genus"
                      placeholder="e.g., Rosa"
                      value={filters.genus || ""}
                      onChange={(e) => setFilters({ ...filters, genus: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="species">Species</Label>
                    <Input
                      id="species"
                      placeholder="e.g., rugosa"
                      value={filters.species || ""}
                      onChange={(e) => setFilters({ ...filters, species: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="commonName">Common Name</Label>
                    <Input
                      id="commonName"
                      placeholder="e.g., Beach Rose"
                      value={filters.commonName || ""}
                      onChange={(e) => setFilters({ ...filters, commonName: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Growing Conditions */}
              <div>
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <Sun className="w-4 h-4" />
                  Growing Conditions
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="type">Plant Type</Label>
                    <Select value={filters.type || ""} onValueChange={(v) => setFilters({ ...filters, type: v })}>
                      <SelectTrigger id="type">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="perennial">Perennial</SelectItem>
                        <SelectItem value="annual">Annual</SelectItem>
                        <SelectItem value="shrub">Shrub</SelectItem>
                        <SelectItem value="tree">Tree</SelectItem>
                        <SelectItem value="bulb">Bulb</SelectItem>
                        <SelectItem value="climber">Climber</SelectItem>
                        <SelectItem value="grass">Grass</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="watering">Watering Needs</Label>
                    <Select value={filters.watering || ""} onValueChange={(v) => setFilters({ ...filters, watering: v })}>
                      <SelectTrigger id="watering">
                        <SelectValue placeholder="Select watering" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="frequent">Frequent</SelectItem>
                        <SelectItem value="average">Average</SelectItem>
                        <SelectItem value="minimum">Minimum</SelectItem>
                        <SelectItem value="none">None (Xerophyte)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="careLevel">Care Level</Label>
                    <Select value={filters.careLevel || ""} onValueChange={(v) => setFilters({ ...filters, careLevel: v })}>
                      <SelectTrigger id="careLevel">
                        <SelectValue placeholder="Select care level" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="easy">Easy</SelectItem>
                        <SelectItem value="moderate">Moderate</SelectItem>
                        <SelectItem value="hard">Hard</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Plant Characteristics */}
              <div>
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <TreePine className="w-4 h-4" />
                  Plant Characteristics
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="droughtTolerant"
                      checked={filters.droughtTolerant || false}
                      onCheckedChange={(v) => setFilters({ ...filters, droughtTolerant: v })}
                    />
                    <Label htmlFor="droughtTolerant" className="cursor-pointer">
                      Drought Tolerant
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="saltTolerant"
                      checked={filters.saltTolerant || false}
                      onCheckedChange={(v) => setFilters({ ...filters, saltTolerant: v })}
                    />
                    <Label htmlFor="saltTolerant" className="cursor-pointer">
                      Salt Tolerant
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="thorny"
                      checked={filters.thorny || false}
                      onCheckedChange={(v) => setFilters({ ...filters, thorny: v })}
                    />
                    <Label htmlFor="thorny" className="cursor-pointer">
                      Has Thorns
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="tropical"
                      checked={filters.tropical || false}
                      onCheckedChange={(v) => setFilters({ ...filters, tropical: v })}
                    />
                    <Label htmlFor="tropical" className="cursor-pointer">
                      Tropical
                    </Label>
                  </div>
                </div>
              </div>

              {/* Safety */}
              <div>
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Safety & Usage
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Max Toxicity to Humans (0-5)</Label>
                    <div className="flex items-center gap-3">
                      <Slider
                        value={[filters.poisonousToHumans || 5]}
                        onValueChange={([v]) => setFilters({ ...filters, poisonousToHumans: v })}
                        min={0}
                        max={5}
                        step={1}
                        className="flex-1"
                      />
                      <span className="w-8 text-center">{filters.poisonousToHumans ?? 5}</span>
                    </div>
                  </div>
                  <div>
                    <Label>Max Toxicity to Pets (0-5)</Label>
                    <div className="flex items-center gap-3">
                      <Slider
                        value={[filters.poisonousToPets || 5]}
                        onValueChange={([v]) => setFilters({ ...filters, poisonousToPets: v })}
                        min={0}
                        max={5}
                        step={1}
                        className="flex-1"
                      />
                      <span className="w-8 text-center">{filters.poisonousToPets ?? 5}</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="medicinal"
                      checked={filters.medicinal || false}
                      onCheckedChange={(v) => setFilters({ ...filters, medicinal: v })}
                    />
                    <Label htmlFor="medicinal" className="cursor-pointer">
                      Medicinal Uses
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="cuisine"
                      checked={filters.cuisine || false}
                      onCheckedChange={(v) => setFilters({ ...filters, cuisine: v })}
                    />
                    <Label htmlFor="cuisine" className="cursor-pointer">
                      Culinary Uses
                    </Label>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={clearFilters}>
                  Clear All
                </Button>
                <Button onClick={handleSearch}>
                  Apply Filters
                </Button>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Results Count */}
        {totalResults > 0 && (
          <div className="mt-4 text-sm text-muted-foreground">
            Found <span className="font-semibold">{totalResults}</span> plants
          </div>
        )}
      </CardContent>
    </Card>
  );
}