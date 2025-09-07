import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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
  Wind,
  Snowflake,
  FlaskConical
} from "lucide-react";

interface PlantAdvancedSearchProps {
  onSearch: (filters: any) => void;
  totalResults?: number;
}

// Expanded color options - 30-40 colors
const colorOptions = [
  // Reds & Pinks
  { name: "Red", color: "#dc2626" },
  { name: "Crimson", color: "#991b1b" },
  { name: "Rose", color: "#f43f5e" },
  { name: "Pink", color: "#ec4899" },
  { name: "Hot Pink", color: "#d946ef" },
  { name: "Pale Pink", color: "#fce7f3" },
  
  // Purples & Violets
  { name: "Purple", color: "#9333ea" },
  { name: "Violet", color: "#7c3aed" },
  { name: "Lavender", color: "#c084fc" },
  { name: "Mauve", color: "#9f7aea" },
  { name: "Magenta", color: "#c026d3" },
  
  // Blues
  { name: "Blue", color: "#2563eb" },
  { name: "Navy", color: "#1e3a8a" },
  { name: "Sky Blue", color: "#0ea5e9" },
  { name: "Turquoise", color: "#06b6d4" },
  { name: "Teal", color: "#0d9488" },
  { name: "Indigo", color: "#4f46e5" },
  
  // Greens
  { name: "Green", color: "#16a34a" },
  { name: "Dark Green", color: "#14532d" },
  { name: "Lime", color: "#84cc16" },
  { name: "Mint", color: "#86efac" },
  { name: "Olive", color: "#65a30d" },
  { name: "Sage", color: "#9ca3af" },
  
  // Yellows & Oranges
  { name: "Yellow", color: "#eab308" },
  { name: "Gold", color: "#f59e0b" },
  { name: "Amber", color: "#d97706" },
  { name: "Orange", color: "#ea580c" },
  { name: "Coral", color: "#fb923c" },
  { name: "Peach", color: "#fed7aa" },
  { name: "Apricot", color: "#fb923c" },
  
  // Browns & Neutrals
  { name: "Brown", color: "#92400e" },
  { name: "Tan", color: "#d4a574" },
  { name: "Rust", color: "#b45309" },
  { name: "Maroon", color: "#7f1d1d" },
  { name: "Burgundy", color: "#881337" },
  
  // Black, White, Gray
  { name: "White", color: "#ffffff" },
  { name: "Cream", color: "#fef3c7" },
  { name: "Gray", color: "#6b7280" },
  { name: "Silver", color: "#e5e7eb" },
  { name: "Black", color: "#18181b" }
];

export function PlantAdvancedSearch({ onSearch, totalResults }: PlantAdvancedSearchProps) {
  const [filters, setFilters] = useState<any>({
    // Botanical identity (simplified)
    genus: '',
    species: '',
    cultivar: '',
    
    // Plant type (single selection)
    plantType: '',
    
    // Foliage type (single selection)
    foliageType: '',
    
    // Hardiness (single selection)
    hardiness: '',
    
    // Sunlight (single selection)
    sunlight: '',
    
    // Soil type (single selection)
    soilType: '',
    
    // Soil pH (single selection)
    soilPH: '',
    
    // Care level (single selection)
    careLevel: '',
    
    // Height range (in cm)
    minHeight: 0,
    maxHeight: 500,
    
    // Special features (multiple selections)
    specialFeatures: [],
    
    // Attracts wildlife (multiple selections)
    attractsWildlife: [],
    
    // Safety (single yes/no)
    isSafe: false,
    
    // Colors (multiple selections)
    colors: []
  });

  // Options for radio button sections (single selection)
  const radioModules = {
    plantType: {
      title: "Plant Type",
      icon: TreePine,
      options: [
        'Any', 'Annuals', 'Perennials', 'Biennials', 'Shrubs', 'Trees',
        'Bulbs', 'Climbers', 'Ground Covers', 'Grasses', 'Herbs',
        'Succulents', 'Cacti', 'Aquatic', 'Ferns', 'Alpine'
      ]
    },
    foliageType: {
      title: "Foliage Type",
      icon: Leaf,
      options: [
        'Any', 'Variegated', 'Deciduous', 'Evergreen', 'Semi-evergreen'
      ]
    },
    hardiness: {
      title: "Hardiness",
      icon: Snowflake,
      options: [
        'Any',
        'Very Hardy (Below -20°C)',
        'Hardy (-15 to -20°C)', 
        'Moderately Hardy (-10 to -15°C)',
        'Tender (Above -10°C)'
      ]
    },
    sunlight: {
      title: "Sunlight",
      icon: Sun,
      options: [
        'Any', 'Full Sun', 'Partial Sun', 'Partial Shade', 'Full Shade'
      ]
    },
    soilType: {
      title: "Soil Type",
      icon: Mountain,
      options: [
        'Any', 'Clay', 'Loam', 'Sand', 'Chalk'
      ]
    },
    soilPH: {
      title: "Soil pH",
      icon: FlaskConical,
      options: [
        'Any', 'Acidic', 'Neutral', 'Alkaline'
      ]
    },
    careLevel: {
      title: "Care Level",
      icon: Heart,
      options: [
        'Any', 'Easy', 'Moderate', 'Difficult'
      ]
    }
  };

  // Options for checkbox sections (multiple selections)
  const checkboxModules = {
    specialFeatures: {
      title: "Special Features",
      icon: Flower,
      options: [
        'Drought Tolerant', 'Salt Tolerant', 'Fast Growing', 
        'Fragrant', 'Thorny', 'Tropical',
        'Culinary', 'Medicinal'
      ]
    },
    attractsWildlife: {
      title: "Attracts Wildlife",
      icon: Bird,
      options: [
        'Butterflies', 'Birds', 'Bees', 'Hummingbirds', 'Pollinators'
      ]
    }
  };

  const handleSearch = () => {
    // Filter out empty values
    const activeFilters = Object.entries(filters).reduce((acc, [key, value]) => {
      if (value !== '' && value !== undefined && value !== false && value !== 0 &&
          (Array.isArray(value) ? value.length > 0 : true)) {
        // Don't include "Any" selections in search
        if (typeof value === 'string' && value === 'Any') {
          return acc;
        }
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
      plantType: '',
      foliageType: '',
      hardiness: '',
      sunlight: '',
      soilType: '',
      soilPH: '',
      careLevel: '',
      minHeight: 0,
      maxHeight: 500,
      specialFeatures: [],
      attractsWildlife: [],
      isSafe: false,
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

  // Render a radio button module (single selection)
  const renderRadioModule = (moduleKey: string) => {
    const module = radioModules[moduleKey as keyof typeof radioModules];
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
          <RadioGroup value={filters[moduleKey] || 'Any'} onValueChange={(value) => updateFilter(moduleKey, value)}>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {module.options.map((option) => (
                <div key={option} className="flex items-center gap-2">
                  <RadioGroupItem value={option} id={`${moduleKey}-${option}`} className="data-[state=checked]:border-green-600" />
                  <Label 
                    htmlFor={`${moduleKey}-${option}`}
                    className={`text-xs cursor-pointer ${option === 'Any' ? 'font-semibold' : ''}`}
                  >
                    {option}
                  </Label>
                </div>
              ))}
            </div>
          </RadioGroup>
        </CardContent>
      </Card>
    );
  };

  // Render a checkbox module (multiple selections)
  const renderCheckboxModule = (moduleKey: string) => {
    const module = checkboxModules[moduleKey as keyof typeof checkboxModules];
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
                <Label 
                  className="text-xs cursor-pointer"
                  onClick={() => toggleArrayFilter(moduleKey, option)}
                >
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
    <Card className="w-full border-2 border-green-500">
      <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50">
        <CardTitle className="flex items-center gap-2">
          <Search className="w-5 h-5 text-green-700" />
          Advanced Plant Search
        </CardTitle>
        <CardDescription>
          Find plants using specific criteria - logical search combinations
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
        <Card className="border shadow-sm bg-gradient-to-br from-green-50 to-emerald-50">
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Ruler className="w-4 h-4 text-green-600" />
              Height Range
            </CardTitle>
          </CardHeader>
          <CardContent className="py-3 px-4">
            <div className="space-y-4">
              <div className="bg-white/70 rounded-lg p-3">
                <div className="flex justify-between text-sm mb-2">
                  <Label className="text-xs font-medium text-green-700">Min Height: <span className="text-green-600 font-bold">{filters.minHeight} cm</span></Label>
                </div>
                <Slider
                  value={[filters.minHeight]}
                  onValueChange={(value) => updateFilter('minHeight', value[0])}
                  min={0}
                  max={500}
                  step={10}
                  className="w-full [&_[role=slider]]:bg-green-600 [&_[role=slider]]:border-green-600 [&_[role=slider]]:focus:ring-green-500 [&_.bg-primary]:bg-green-500"
                />
              </div>
              <div className="bg-white/70 rounded-lg p-3">
                <div className="flex justify-between text-sm mb-2">
                  <Label className="text-xs font-medium text-green-700">Max Height: <span className="text-green-600 font-bold">{filters.maxHeight} cm</span></Label>
                </div>
                <Slider
                  value={[filters.maxHeight]}
                  onValueChange={(value) => updateFilter('maxHeight', value[0])}
                  min={0}
                  max={500}
                  step={10}
                  className="w-full [&_[role=slider]]:bg-green-600 [&_[role=slider]]:border-green-600 [&_[role=slider]]:focus:ring-green-500 [&_.bg-primary]:bg-green-500"
                />
              </div>
              <div className="text-center text-xs text-gray-600 italic">
                From tiny ground covers to towering trees
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Color Selection - Multiple selections allowed */}
        <Card className="border shadow-sm">
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Palette className="w-4 h-4" />
              Colors (Select All That Apply)
            </CardTitle>
          </CardHeader>
          <CardContent className="py-3 px-4">
            <div className="grid grid-cols-10 md:grid-cols-15 gap-2">
              {colorOptions.map((colorOption) => (
                <div 
                  key={colorOption.name}
                  className="group relative cursor-pointer"
                  onClick={() => toggleColor(colorOption.name)}
                >
                  <div
                    className={`w-8 h-8 rounded border-2 transition-all ${
                      filters.colors.includes(colorOption.name) 
                        ? 'border-green-600 shadow-md scale-110' 
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                    style={{
                      backgroundColor: colorOption.color,
                      border: colorOption.name === 'White' ? '2px solid #d1d5db' : undefined
                    }}
                  />
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                    {colorOption.name}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Single Selection Sections (Radio Buttons) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {renderRadioModule('plantType')}
          {renderRadioModule('foliageType')}
          {renderRadioModule('hardiness')}
          {renderRadioModule('sunlight')}
          {renderRadioModule('soilType')}
          {renderRadioModule('soilPH')}
          {renderRadioModule('careLevel')}
        </div>

        {/* Multiple Selection Sections (Checkboxes) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {renderCheckboxModule('specialFeatures')}
          {renderCheckboxModule('attractsWildlife')}
        </div>

        {/* Safety - Simple Yes/No */}
        <Card className="border shadow-sm">
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Safety
            </CardTitle>
          </CardHeader>
          <CardContent className="py-3 px-4">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={filters.isSafe}
                onCheckedChange={(checked) => updateFilter('isSafe', checked === true)}
                className="data-[state=checked]:bg-green-600"
              />
              <Label className="text-sm cursor-pointer" onClick={() => updateFilter('isSafe', !filters.isSafe)}>
                Child & Pet Safe
              </Label>
            </div>
          </CardContent>
        </Card>

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
            <Button onClick={handleSearch} className="bg-green-600 hover:bg-green-700">
              <Search className="w-4 h-4 mr-2" />
              Search Plants
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}