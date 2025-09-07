import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { 
  Search, 
  RotateCcw,
  TreePine,
  Sun,
  Droplets,
  Leaf,
  Heart,
  AlertTriangle,
  ChefHat,
  Pill,
  Bird,
  Flower,
  Ruler,
  Palette,
  Mountain,
  Wind
} from "lucide-react";

interface PlantAdvancedSearchProps {
  onSearch: (filters: any) => void;
  totalResults?: number;
}

// Color options for plants
const colorOptions = [
  { name: "Red", color: "#ef4444" },
  { name: "Pink", color: "#ec4899" },
  { name: "Purple", color: "#a855f7" },
  { name: "Blue", color: "#3b82f6" },
  { name: "White", color: "#f9fafb" },
  { name: "Yellow", color: "#eab308" },
  { name: "Orange", color: "#f97316" },
  { name: "Green", color: "#22c55e" },
  { name: "Brown", color: "#92400e" },
  { name: "Black", color: "#18181b" },
  { name: "Multicolor", color: "linear-gradient(90deg, #ef4444, #eab308, #22c55e, #3b82f6)" }
];

export function PlantAdvancedSearch({ onSearch, totalResults }: PlantAdvancedSearchProps) {
  const [filters, setFilters] = useState<any>({
    // Botanical identity (simplified)
    genus: '',
    species: '',
    cultivar: '',
    
    // Plant types
    plantTypes: [],
    
    // Foliage types
    foliageTypes: [],
    
    // Growing conditions
    sunlight: [],
    soil: [],
    
    // Care level
    careLevel: [],
    
    // Height range (in cm)
    minHeight: 0,
    maxHeight: 500,
    
    // Special features
    specialFeatures: [],
    
    // Attracts wildlife
    attractsWildlife: [],
    
    // Safety
    safety: [],
    
    // Colors
    colors: []
  });

  // Options for each category
  const searchModules = {
    plantTypes: {
      title: "Plant Types",
      icon: TreePine,
      options: [
        'Annuals', 'Perennials', 'Biennials', 'Shrubs', 'Trees',
        'Bulbs', 'Climbers', 'Ground Covers', 'Grasses', 'Herbs',
        'Succulents', 'Cacti', 'Aquatic', 'Ferns', 'Alpine'
      ]
    },
    foliageTypes: {
      title: "Foliage Types",
      icon: Leaf,
      options: [
        'Variegated', 'Deciduous', 'Evergreen', 'Semi-evergreen'
      ]
    },
    sunlight: {
      title: "Sunlight",
      icon: Sun,
      options: [
        'Full Sun', 'Partial Sun', 'Partial Shade', 'Full Shade'
      ]
    },
    soil: {
      title: "Soil",
      icon: Mountain,
      options: [
        'Clay', 'Loam', 'Sand', 'Chalk', 'Acidic', 'Alkaline', 
        'Well-drained', 'Moist', 'Dry'
      ]
    },
    careLevel: {
      title: "Care Level",
      icon: Heart,
      options: [
        'Easy', 'Moderate', 'Difficult'
      ]
    },
    specialFeatures: {
      title: "Special Features",
      icon: Flower,
      options: [
        'Drought Tolerant', 'Frost Hardy', 'Fast Growing', 
        'Fragrant', 'Thorny', 'Native', 'Rare'
      ]
    },
    attractsWildlife: {
      title: "Attracts Wildlife",
      icon: Bird,
      options: [
        'Butterflies', 'Birds', 'Bees', 'Hummingbirds', 'Pollinators'
      ]
    },
    safety: {
      title: "Safety",
      icon: AlertTriangle,
      options: [
        'Child Safe', 'Pet Safe', 'Non-toxic', 'Edible', 'Medicinal'
      ]
    }
  };

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
      genus: '',
      species: '',
      cultivar: '',
      plantTypes: [],
      foliageTypes: [],
      sunlight: [],
      soil: [],
      careLevel: [],
      minHeight: 0,
      maxHeight: 500,
      specialFeatures: [],
      attractsWildlife: [],
      safety: [],
      colors: []
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

  const toggleColor = (color: string) => {
    toggleArrayFilter('colors', color);
  };

  // Render a search module (modular approach)
  const renderSearchModule = (moduleKey: string) => {
    const module = searchModules[moduleKey as keyof typeof searchModules];
    if (!module) return null;
    
    const Icon = module.icon;
    
    return (
      <Card key={moduleKey} className="border shadow-sm">
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Icon className="w-4 h-4" />
            {module.title}
          </CardTitle>
        </CardHeader>
        <CardContent className="py-3 px-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {module.options.map((option) => (
              <div key={option} className="flex items-center gap-2">
                <Checkbox
                  checked={filters[moduleKey].includes(option)}
                  onCheckedChange={() => toggleArrayFilter(moduleKey, option)}
                  className="data-[state=checked]:bg-green-600"
                />
                <Label className="text-xs cursor-pointer" onClick={() => toggleArrayFilter(moduleKey, option)}>
                  {option}
                </Label>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <Card className="w-full border-2 border-blue-200">
      <CardHeader className="bg-blue-50">
        <CardTitle className="flex items-center gap-2">
          <Search className="w-5 h-5" />
          Advanced Plant Search
        </CardTitle>
        <CardDescription>
          Find plants using specific criteria - modular search system
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 pt-6">
        {/* Botanical Identity - Simplified */}
        <Card className="border shadow-sm">
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Leaf className="w-4 h-4" />
              Botanical Identity
            </CardTitle>
          </CardHeader>
          <CardContent className="py-3 px-4">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs">Genus</Label>
                <Input
                  placeholder="e.g., Rosa"
                  value={filters.genus}
                  onChange={(e) => updateFilter('genus', e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs">Species</Label>
                <Input
                  placeholder="e.g., rugosa"
                  value={filters.species}
                  onChange={(e) => updateFilter('species', e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs">Cultivar</Label>
                <Input
                  placeholder="e.g., Alba"
                  value={filters.cultivar}
                  onChange={(e) => updateFilter('cultivar', e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Height Criteria */}
        <Card className="border shadow-sm">
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Ruler className="w-4 h-4" />
              Height Range
            </CardTitle>
          </CardHeader>
          <CardContent className="py-3 px-4">
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span>{filters.minHeight} cm</span>
                <span>{filters.maxHeight} cm</span>
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <Label className="text-xs">Min Height</Label>
                  <Slider
                    value={[filters.minHeight]}
                    onValueChange={(value) => updateFilter('minHeight', value[0])}
                    max={500}
                    step={10}
                    className="mt-2"
                  />
                </div>
                <div className="flex-1">
                  <Label className="text-xs">Max Height</Label>
                  <Slider
                    value={[filters.maxHeight]}
                    onValueChange={(value) => updateFilter('maxHeight', value[0])}
                    max={500}
                    step={10}
                    className="mt-2"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Color Selection - Large Visual Field */}
        <Card className="border shadow-sm">
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Palette className="w-4 h-4" />
              Colors
            </CardTitle>
          </CardHeader>
          <CardContent className="py-3 px-4">
            <div className="grid grid-cols-6 md:grid-cols-11 gap-3">
              {colorOptions.map((colorOption) => (
                <div 
                  key={colorOption.name}
                  className="flex flex-col items-center gap-1 cursor-pointer"
                  onClick={() => toggleColor(colorOption.name)}
                >
                  <div
                    className={`w-12 h-12 rounded-lg border-2 transition-all ${
                      filters.colors.includes(colorOption.name) 
                        ? 'border-blue-500 shadow-lg scale-110' 
                        : 'border-gray-300'
                    }`}
                    style={{
                      background: colorOption.color,
                      border: colorOption.name === 'White' ? '2px solid #e5e7eb' : undefined
                    }}
                  />
                  <span className="text-xs text-center">{colorOption.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Modular Search Sections in 2 columns */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {renderSearchModule('plantTypes')}
          {renderSearchModule('foliageTypes')}
          {renderSearchModule('sunlight')}
          {renderSearchModule('soil')}
          {renderSearchModule('careLevel')}
          {renderSearchModule('specialFeatures')}
          {renderSearchModule('attractsWildlife')}
          {renderSearchModule('safety')}
        </div>

        {/* Search Actions */}
        <div className="flex justify-between items-center pt-4 border-t">
          <div className="text-sm text-muted-foreground">
            {totalResults !== undefined && (
              <span className="font-medium">{totalResults} plants found</span>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleReset}>
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset All
            </Button>
            <Button onClick={handleSearch} className="bg-blue-600 hover:bg-blue-700">
              <Search className="w-4 h-4 mr-2" />
              Search Plants
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}