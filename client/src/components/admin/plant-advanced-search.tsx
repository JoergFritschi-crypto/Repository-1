import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { 
  Search, 
  Filter, 
  RotateCcw,
  TreePine,
  Sun,
  Droplets,
  Thermometer,
  Leaf,
  Heart,
  AlertTriangle,
  ChefHat,
  Pill,
  Butterfly
} from "lucide-react";

interface PlantAdvancedSearchProps {
  onSearch: (filters: any) => void;
  totalResults?: number;
}

export function PlantAdvancedSearch({ onSearch, totalResults }: PlantAdvancedSearchProps) {
  const [filters, setFilters] = useState<any>({
    // Botanical identity
    scientificName: '',
    commonName: '',
    genus: '',
    species: '',
    cultivar: '',
    
    // Plant types
    type: [],
    foliage: '',
    cycle: '',
    
    // Growing conditions
    hardiness: '',
    sunlight: [],
    soil: [],
    watering: '',
    careLevel: '',
    
    // Features
    droughtTolerant: undefined,
    tropical: undefined,
    thorny: undefined,
    
    // Safety & Uses
    poisonousToHumans: undefined,
    poisonousToPets: undefined,
    cuisine: undefined,
    medicinal: undefined,
    
    // Attracts
    attracts: []
  });

  // Plant type options - as specified by user
  const plantTypes = [
    'annuals',
    'perennials',
    'herbaceous perennials',
    'biennials',
    'shrubs',
    'ornamental trees',
    'bulbs',
    'climbers',
    'ground covers',
    'ornamental grasses',
    'herbs-medicinal',
    'herbs-culinary',
    'succulents',
    'cacti',
    'aquatic plants',
    'ferns',
    'alpine rock garden plants'
  ];

  const foliageTypes = [
    'variegated',
    'deciduous',
    'evergreen'
  ];

  const sunlightOptions = [
    'full sun',
    'partial sun',
    'partial shade',
    'full shade'
  ];

  const soilTypes = [
    'clay',
    'loam',
    'sand',
    'chalk',
    'acidic',
    'alkaline',
    'well-drained',
    'moist'
  ];

  const wateringOptions = [
    'minimal',
    'low',
    'average',
    'frequent',
    'high'
  ];

  const careLevels = [
    'easy',
    'moderate',
    'hard'
  ];

  const attractsOptions = [
    'butterflies',
    'birds',
    'bees',
    'hummingbirds',
    'pollinators'
  ];

  const handleSearch = () => {
    // Filter out empty values
    const activeFilters = Object.entries(filters).reduce((acc, [key, value]) => {
      if (value !== '' && value !== undefined && 
          (Array.isArray(value) ? value.length > 0 : true)) {
        acc[key] = value;
      }
      return acc;
    }, {} as any);
    
    onSearch(activeFilters);
  };

  const handleReset = () => {
    setFilters({
      scientificName: '',
      commonName: '',
      genus: '',
      species: '',
      cultivar: '',
      type: [],
      foliage: '',
      cycle: '',
      hardiness: '',
      sunlight: [],
      soil: [],
      watering: '',
      careLevel: '',
      droughtTolerant: undefined,
      tropical: undefined,
      thorny: undefined,
      poisonousToHumans: undefined,
      poisonousToPets: undefined,
      cuisine: undefined,
      medicinal: undefined,
      attracts: []
    });
    onSearch({});
  };

  const updateFilter = (key: string, value: any) => {
    setFilters((prev: any) => ({ ...prev, [key]: value }));
  };

  const toggleArrayFilter = (key: string, value: string) => {
    setFilters((prev: any) => ({
      ...prev,
      [key]: prev[key].includes(value)
        ? prev[key].filter((v: string) => v !== value)
        : [...prev[key], value]
    }));
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="w-5 h-5" />
          Advanced Plant Search
        </CardTitle>
        <CardDescription>
          Find plants based on specific characteristics and requirements
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Botanical Identity Section */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Leaf className="w-4 h-4" />
            Botanical Identity
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <Label>Scientific Name</Label>
              <Input
                placeholder="e.g., Rosa rugosa"
                value={filters.scientificName}
                onChange={(e) => updateFilter('scientificName', e.target.value)}
              />
            </div>
            <div>
              <Label>Common Name</Label>
              <Input
                placeholder="e.g., Beach Rose"
                value={filters.commonName}
                onChange={(e) => updateFilter('commonName', e.target.value)}
              />
            </div>
            <div>
              <Label>Genus</Label>
              <Input
                placeholder="e.g., Rosa"
                value={filters.genus}
                onChange={(e) => updateFilter('genus', e.target.value)}
              />
            </div>
            <div>
              <Label>Species</Label>
              <Input
                placeholder="e.g., rugosa"
                value={filters.species}
                onChange={(e) => updateFilter('species', e.target.value)}
              />
            </div>
            <div>
              <Label>Cultivar</Label>
              <Input
                placeholder="e.g., Alba"
                value={filters.cultivar}
                onChange={(e) => updateFilter('cultivar', e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Plant Type Section */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <TreePine className="w-4 h-4" />
            Plant Type & Characteristics
          </h3>
          <div className="space-y-4">
            <div>
              <Label>Plant Types</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {plantTypes.map((type) => (
                  <Badge
                    key={type}
                    variant={filters.type.includes(type) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => toggleArrayFilter('type', type)}
                  >
                    {type}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Foliage Type</Label>
                <Select value={filters.foliage} onValueChange={(v) => updateFilter('foliage', v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select foliage type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Any</SelectItem>
                    {foliageTypes.map(type => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Growth Cycle</Label>
                <Select value={filters.cycle} onValueChange={(v) => updateFilter('cycle', v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select cycle" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Any</SelectItem>
                    <SelectItem value="annual">Annual</SelectItem>
                    <SelectItem value="biennial">Biennial</SelectItem>
                    <SelectItem value="perennial">Perennial</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>

        {/* Growing Conditions Section */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Sun className="w-4 h-4" />
            Growing Conditions
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Hardiness Zone</Label>
              <Input
                placeholder="e.g., 5-9"
                value={filters.hardiness}
                onChange={(e) => updateFilter('hardiness', e.target.value)}
              />
            </div>
            <div>
              <Label>Watering Needs</Label>
              <Select value={filters.watering} onValueChange={(v) => updateFilter('watering', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select watering needs" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Any</SelectItem>
                  {wateringOptions.map(opt => (
                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Care Level</Label>
              <Select value={filters.careLevel} onValueChange={(v) => updateFilter('careLevel', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select care level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Any</SelectItem>
                  {careLevels.map(level => (
                    <SelectItem key={level} value={level}>{level}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Sunlight Requirements</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {sunlightOptions.map((opt) => (
                <Badge
                  key={opt}
                  variant={filters.sunlight.includes(opt) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => toggleArrayFilter('sunlight', opt)}
                >
                  <Sun className="w-3 h-3 mr-1" />
                  {opt}
                </Badge>
              ))}
            </div>
          </div>
          <div>
            <Label>Soil Types</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {soilTypes.map((type) => (
                <Badge
                  key={type}
                  variant={filters.soil.includes(type) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => toggleArrayFilter('soil', type)}
                >
                  {type}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Heart className="w-4 h-4" />
            Special Features
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={filters.droughtTolerant === true}
                onCheckedChange={(checked) => 
                  updateFilter('droughtTolerant', checked === true ? true : undefined)
                }
              />
              <Label className="text-sm">Drought Tolerant</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                checked={filters.tropical === true}
                onCheckedChange={(checked) => 
                  updateFilter('tropical', checked === true ? true : undefined)
                }
              />
              <Label className="text-sm">Tropical</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                checked={filters.thorny === true}
                onCheckedChange={(checked) => 
                  updateFilter('thorny', checked === true ? true : undefined)
                }
              />
              <Label className="text-sm">Has Thorns</Label>
            </div>
          </div>
          <div>
            <Label>Attracts Wildlife</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {attractsOptions.map((opt) => (
                <Badge
                  key={opt}
                  variant={filters.attracts.includes(opt) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => toggleArrayFilter('attracts', opt)}
                >
                  <Butterfly className="w-3 h-3 mr-1" />
                  {opt}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        {/* Safety & Uses Section */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Safety & Uses
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Toxicity to Humans</Label>
              <Select 
                value={filters.poisonousToHumans?.toString() || ''} 
                onValueChange={(v) => updateFilter('poisonousToHumans', v ? parseInt(v) : undefined)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select toxicity level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Any</SelectItem>
                  <SelectItem value="0">Safe (0)</SelectItem>
                  <SelectItem value="1">Very Mild (1)</SelectItem>
                  <SelectItem value="2">Mild (2)</SelectItem>
                  <SelectItem value="3">Moderate (3)</SelectItem>
                  <SelectItem value="4">High (4)</SelectItem>
                  <SelectItem value="5">Severe (5)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Toxicity to Pets</Label>
              <Select 
                value={filters.poisonousToPets?.toString() || ''} 
                onValueChange={(v) => updateFilter('poisonousToPets', v ? parseInt(v) : undefined)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select toxicity level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Any</SelectItem>
                  <SelectItem value="0">Safe (0)</SelectItem>
                  <SelectItem value="1">Very Mild (1)</SelectItem>
                  <SelectItem value="2">Mild (2)</SelectItem>
                  <SelectItem value="3">Moderate (3)</SelectItem>
                  <SelectItem value="4">High (4)</SelectItem>
                  <SelectItem value="5">Severe (5)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={filters.cuisine === true}
                onCheckedChange={(checked) => 
                  updateFilter('cuisine', checked === true ? true : undefined)
                }
              />
              <Label className="text-sm flex items-center gap-1">
                <ChefHat className="w-4 h-4" />
                Culinary Use
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                checked={filters.medicinal === true}
                onCheckedChange={(checked) => 
                  updateFilter('medicinal', checked === true ? true : undefined)
                }
              />
              <Label className="text-sm flex items-center gap-1">
                <Pill className="w-4 h-4" />
                Medicinal Use
              </Label>
            </div>
          </div>
        </div>

        {/* Search Actions */}
        <div className="flex justify-between items-center pt-4 border-t">
          <div className="text-sm text-muted-foreground">
            {totalResults !== undefined && (
              <span>{totalResults} plants found</span>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleReset}>
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset
            </Button>
            <Button onClick={handleSearch}>
              <Search className="w-4 h-4 mr-2" />
              Search Plants
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}