import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { useMutation } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { 
  Search, 
  ChevronRight, 
  ChevronLeft,
  CheckCircle,
  AlertCircle,
  Loader2,
  Database,
  Globe,
  Leaf,
  X,
  Shield,
  Brain
} from 'lucide-react';

interface PlantImportData {
  // Core identification
  scientific_name: string;
  common_name?: string;
  
  // Taxonomy
  family?: string;
  genus?: string;
  species?: string;
  kingdom?: string;
  phylum?: string;
  class?: string;
  order?: string;
  rank?: string;
  taxonomic_status?: string;
  
  // Growing conditions
  cycle?: string;
  watering?: string;
  sunlight?: string[];
  hardiness?: { min: number; max: number };
  soil?: string[];
  growth_rate?: string;
  care_level?: string;
  
  // Characteristics
  drought_tolerant?: boolean;
  salt_tolerant?: boolean;
  thorny?: boolean;
  invasive?: boolean;
  tropical?: boolean;
  indoor?: boolean;
  flowers?: boolean;
  flowering_season?: string;
  flower_color?: string;
  leaf_color?: string[];
  fruit_color?: string[];
  harvest_season?: string;
  edible_fruit?: boolean;
  edible_leaf?: boolean;
  cuisine?: boolean;
  medicinal?: boolean;
  poisonous_to_humans?: boolean;
  poisonous_to_pets?: boolean;
  
  // Descriptive
  description?: string;
  maintenance?: string;
  propagation?: string[];
  pruning_month?: string[];
  native_region?: string;
  conservation_status?: string;
  
  // Database tracking
  sources: {
    perenual?: boolean;
    gbif?: boolean;
    inaturalist?: boolean;
  };
  
  // IDs
  perenual_id?: string;
  gbif_id?: string;
  gbif_key?: number;
  inaturalist_id?: string;
  external_id?: string;
  confidence_score?: number;
}

interface DatabaseCounts {
  perenual: number;
  gbif: number;
  inaturalist: number;
  perenual_only: number;
  gbif_only: number;
  inaturalist_only: number;
  all_three: number;
  two_sources: number;
}

export function PlantImportWizard() {
  const [step, setStep] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [originalSearchTerm, setOriginalSearchTerm] = useState('');
  const [selectedPlants, setSelectedPlants] = useState<PlantImportData[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchProgress, setSearchProgress] = useState('');
  const [counts, setCounts] = useState<DatabaseCounts>({
    perenual: 0,
    gbif: 0,
    inaturalist: 0,
    perenual_only: 0,
    gbif_only: 0,
    inaturalist_only: 0,
    all_three: 0,
    two_sources: 0
  });
  const { toast } = useToast();
  
  // Normalize scientific names for deduplication
  // Handles variations like extra spaces, case differences, quotes
  const normalizeScientificName = (name: string): string => {
    return name
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ')  // Replace multiple spaces with single space
      .replace(/['']/g, "'") // Normalize quotes
      .replace(/×/g, 'x');   // Normalize multiplication sign for hybrids
  };
  
  // Check if two scientific names are the same plant
  // Returns true only if we're certain they're the same
  const isSamePlant = (name1: string, name2: string): boolean => {
    const normalized1 = normalizeScientificName(name1);
    const normalized2 = normalizeScientificName(name2);
    
    // Exact match after normalization
    if (normalized1 === normalized2) return true;
    
    // Check if one is a cultivar of the other (e.g., "Helianthus annuus" vs "Helianthus annuus 'Sunspot'")
    // Only match if the base species is exactly the same
    const base1 = normalized1.split("'")[0].trim();
    const base2 = normalized2.split("'")[0].trim();
    
    // If they have different base names, they're different plants
    if (base1 !== base2) return false;
    
    // If both have cultivar names but they're different, they're different plants
    const cultivar1 = normalized1.includes("'");
    const cultivar2 = normalized2.includes("'");
    if (cultivar1 && cultivar2 && normalized1 !== normalized2) return false;
    
    // If one has cultivar and other doesn't, they're different
    // (species vs specific cultivar should be kept separate)
    if (cultivar1 !== cultivar2) return false;
    
    return true;
  };

  // Calculate counts whenever selectedPlants changes
  useEffect(() => {
    const newCounts: DatabaseCounts = {
      perenual: 0,
      gbif: 0,
      inaturalist: 0,
      perenual_only: 0,
      gbif_only: 0,
      inaturalist_only: 0,
      all_three: 0,
      two_sources: 0
    };

    selectedPlants.forEach(plant => {
      const sources = plant.sources || {};
      const sourceCount = Object.values(sources).filter(Boolean).length;
      
      if (sources.perenual) newCounts.perenual++;
      if (sources.gbif) newCounts.gbif++;
      if (sources.inaturalist) newCounts.inaturalist++;
      
      if (sourceCount === 1) {
        if (sources.perenual) newCounts.perenual_only++;
        else if (sources.gbif) newCounts.gbif_only++;
        else if (sources.inaturalist) newCounts.inaturalist_only++;
      } else if (sourceCount === 2) {
        newCounts.two_sources++;
      } else if (sourceCount === 3) {
        newCounts.all_three++;
      }
    });
    
    setCounts(newCounts);
  }, [selectedPlants]);

  // Step 1: Search Perenual
  const searchPerenual = async () => {
    if (!searchTerm.trim()) {
      toast({
        title: "Error",
        description: "Please enter a search term",
        variant: "destructive"
      });
      return;
    }
    
    setIsSearching(true);
    setSearchProgress('Searching Perenual database for cultivated plants...');
    setOriginalSearchTerm(searchTerm);
    
    try {
      const response = await fetch(
        `/api/admin/import/search-perenual?q=${encodeURIComponent(searchTerm)}`,
        {
          method: 'GET',
          credentials: 'include'
        }
      );
      
      if (!response.ok) throw new Error('Perenual search failed');
      
      const data = await response.json();
      const plants = (data.plants || []).map((plant: any) => ({
        ...plant,
        sources: { perenual: true }
      }));
      
      setSelectedPlants(plants);
      
      toast({
        title: "✓ Perenual Search Complete",
        description: `Found ${plants.length} plants from Perenual`,
      });
      
      // Automatically move to step 2
      setStep(2);
      // Automatically search GBIF
      await searchAndMergeGBIF(searchTerm, plants);
      
    } catch (error) {
      console.error('Perenual search error:', error);
      toast({
        title: "Search Failed",
        description: "Failed to search Perenual database",
        variant: "destructive"
      });
    } finally {
      setIsSearching(false);
      setSearchProgress('');
    }
  };

  // Step 2: Search and merge GBIF
  const searchAndMergeGBIF = async (term: string, existingPlants: PlantImportData[]) => {
    setIsSearching(true);
    setSearchProgress('Searching GBIF biodiversity database...');
    
    try {
      const response = await fetch(
        `/api/admin/import/search-gbif?q=${encodeURIComponent(term)}`,
        {
          method: 'GET',
          credentials: 'include'
        }
      );
      
      if (!response.ok) throw new Error('GBIF search failed');
      
      const data = await response.json();
      const gbifPlants = data.plants || [];
      
      // Merge GBIF results with existing plants
      const mergedPlants = [...existingPlants];
      let newCount = 0;
      let enrichedCount = 0;
      
      gbifPlants.forEach((gbifPlant: any) => {
        // Find existing plant using intelligent deduplication
        const existing = mergedPlants.find(p => 
          isSamePlant(p.scientific_name || '', gbifPlant.scientific_name || '')
        );
        
        if (existing) {
          // Enrich existing plant - merge data from GBIF
          existing.sources.gbif = true;
          if (gbifPlant.gbif_id) existing.gbif_id = gbifPlant.gbif_id;
          if (gbifPlant.gbif_key) existing.gbif_key = gbifPlant.gbif_key;
          if (gbifPlant.family && !existing.family) existing.family = gbifPlant.family;
          if (gbifPlant.native_region && !existing.native_region) existing.native_region = gbifPlant.native_region;
          if (gbifPlant.conservation_status && !existing.conservation_status) existing.conservation_status = gbifPlant.conservation_status;
          if (gbifPlant.taxonomic_status && !existing.taxonomic_status) existing.taxonomic_status = gbifPlant.taxonomic_status;
          // Merge arrays if they exist
          if (gbifPlant.soil && (!existing.soil || existing.soil.length === 0)) existing.soil = gbifPlant.soil;
          if (gbifPlant.sunlight && (!existing.sunlight || existing.sunlight.length === 0)) existing.sunlight = gbifPlant.sunlight;
          enrichedCount++;
        } else {
          // Add new plant from GBIF
          mergedPlants.push({
            ...gbifPlant,
            sources: { gbif: true }
          });
          newCount++;
        }
      });
      
      setSelectedPlants(mergedPlants);
      
      toast({
        title: "✓ GBIF Search Complete",
        description: `Found ${gbifPlants.length} plants (${enrichedCount} enriched, ${newCount} new)`,
      });
      
    } catch (error) {
      console.error('GBIF search error:', error);
      toast({
        title: "GBIF Search Failed",
        description: "Continuing without GBIF data",
        variant: "destructive"
      });
    } finally {
      setIsSearching(false);
      setSearchProgress('');
    }
  };

  // Step 3: Search and merge iNaturalist
  const searchAndMergeINaturalist = async () => {
    setIsSearching(true);
    setSearchProgress('Searching iNaturalist community database...');
    
    try {
      const response = await fetch(
        `/api/admin/import/search-inaturalist?q=${encodeURIComponent(originalSearchTerm)}`,
        {
          method: 'GET',
          credentials: 'include'
        }
      );
      
      if (!response.ok) throw new Error('iNaturalist search failed');
      
      const data = await response.json();
      const inatPlants = data.plants || [];
      
      // Merge iNaturalist results
      const mergedPlants = [...selectedPlants];
      let newCount = 0;
      let enrichedCount = 0;
      
      inatPlants.forEach((inatPlant: any) => {
        // Find existing plant using intelligent deduplication
        const existing = mergedPlants.find(p => 
          isSamePlant(p.scientific_name || '', inatPlant.scientific_name || '')
        );
        
        if (existing) {
          // Enrich existing plant - merge data from iNaturalist
          existing.sources.inaturalist = true;
          if (inatPlant.inaturalist_id) existing.inaturalist_id = inatPlant.inaturalist_id;
          if (inatPlant.common_name && !existing.common_name) {
            existing.common_name = inatPlant.common_name;
          }
          if (inatPlant.conservation_status && !existing.conservation_status) {
            existing.conservation_status = inatPlant.conservation_status;
          }
          if (inatPlant.family && !existing.family) existing.family = inatPlant.family;
          if (inatPlant.observations_count) {
            existing.observations_count = inatPlant.observations_count;
          }
          enrichedCount++;
        } else {
          // Add new plant from iNaturalist
          mergedPlants.push({
            ...inatPlant,
            sources: { inaturalist: true }
          });
          newCount++;
        }
      });
      
      setSelectedPlants(mergedPlants);
      
      toast({
        title: "✓ iNaturalist Search Complete",
        description: `Found ${inatPlants.length} plants (${enrichedCount} enriched, ${newCount} new)`,
      });
      
      // Move to review step
      setStep(4);
      
    } catch (error) {
      console.error('iNaturalist search error:', error);
      toast({
        title: "iNaturalist Search Failed",
        description: "Continuing without iNaturalist data",
        variant: "destructive"
      });
      setStep(4);
    } finally {
      setIsSearching(false);
      setSearchProgress('');
    }
  };

  // Perplexity validation for empty fields
  const validateWithPerplexity = async () => {
    setIsSearching(true);
    setSearchProgress('Validating empty fields with Perplexity AI...');
    
    try {
      // Find plants with empty fields
      const plantsToValidate = selectedPlants.filter(plant => 
        !plant.common_name || !plant.family || !plant.description ||
        !plant.watering || !plant.sunlight || !plant.care_level
      );
      
      if (plantsToValidate.length === 0) {
        toast({
          title: "All fields complete",
          description: "No validation needed - all plants have complete data",
        });
        return;
      }
      
      // Validate each plant
      for (const plant of plantsToValidate) {
        const response = await fetch('/api/admin/import/validate-perplexity', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ plant })
        });
        
        if (response.ok) {
          const validated = await response.json();
          // Update the plant in selectedPlants
          const index = selectedPlants.findIndex(p => 
            p.scientific_name === plant.scientific_name
          );
          if (index !== -1) {
            selectedPlants[index] = { ...selectedPlants[index], ...validated };
          }
        }
      }
      
      setSelectedPlants([...selectedPlants]);
      
      toast({
        title: "✓ Validation Complete",
        description: `Validated ${plantsToValidate.length} plants with Perplexity`,
      });
      
    } catch (error) {
      console.error('Perplexity validation error:', error);
      toast({
        title: "Validation Failed",
        description: "Could not validate with Perplexity",
        variant: "destructive"
      });
    } finally {
      setIsSearching(false);
      setSearchProgress('');
    }
  };

  // Final import
  const importPlants = async () => {
    setIsSearching(true);
    setSearchProgress('Importing plants to database...');
    
    try {
      const response = await fetch('/api/admin/import/plants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ plants: selectedPlants })
      });
      
      if (!response.ok) throw new Error('Import failed');
      
      const result = await response.json();
      
      toast({
        title: "✓ Import Successful",
        description: `Imported ${result.imported} plants successfully`,
      });
      
      // Reset wizard
      setStep(1);
      setSearchTerm('');
      setSelectedPlants([]);
      setOriginalSearchTerm('');
      
      // Refresh plant list
      queryClient.invalidateQueries({ queryKey: ['/api/admin/plants/pending'] });
      
    } catch (error) {
      console.error('Import error:', error);
      toast({
        title: "Import Failed",
        description: "Failed to import plants to database",
        variant: "destructive"
      });
    } finally {
      setIsSearching(false);
      setSearchProgress('');
    }
  };

  // Helper to get database badges
  const getSourceBadges = (plant: PlantImportData) => {
    const badges = [];
    const sources = plant.sources || {};
    
    if (sources.perenual) {
      badges.push(
        <Badge key="perenual" className="bg-green-500 text-white">
          <Leaf className="w-3 h-3 mr-1" />
          Perenual
        </Badge>
      );
    }
    if (sources.gbif) {
      badges.push(
        <Badge key="gbif" className="bg-blue-500 text-white">
          <Globe className="w-3 h-3 mr-1" />
          GBIF
        </Badge>
      );
    }
    if (sources.inaturalist) {
      badges.push(
        <Badge key="inaturalist" className="bg-red-500 text-white">
          <Database className="w-3 h-3 mr-1" />
          iNaturalist
        </Badge>
      );
    }
    
    return badges;
  };

  // Plant list component
  const PlantList = ({ plants, showCheckboxes = true }: { plants: PlantImportData[], showCheckboxes?: boolean }) => (
    <ScrollArea className="h-[400px] border rounded-lg p-4">
      <div className="space-y-2">
        {plants.map((plant, idx) => (
          <div 
            key={`${plant.scientific_name}-${idx}`}
            className="flex items-center justify-between p-3 border rounded hover:bg-accent"
            data-testid={`plant-item-${idx}`}
          >
            <div className="flex items-center gap-3 flex-1">
              {showCheckboxes && (
                <Checkbox
                  checked={selectedPlants.some(p => 
                    p.scientific_name === plant.scientific_name
                  )}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setSelectedPlants([...selectedPlants, plant]);
                    } else {
                      setSelectedPlants(selectedPlants.filter(p => 
                        p.scientific_name !== plant.scientific_name
                      ));
                    }
                  }}
                  data-testid={`checkbox-plant-${idx}`}
                />
              )}
              <div className="flex-1">
                <p className="font-medium italic">{plant.scientific_name}</p>
                <p className="text-sm text-muted-foreground">
                  {plant.common_name || 'No common name'}
                </p>
                <div className="flex gap-1 mt-1">
                  {getSourceBadges(plant)}
                  {plant.family && (
                    <Badge variant="outline">{plant.family}</Badge>
                  )}
                </div>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedPlants(selectedPlants.filter(p => 
                  p.scientific_name !== plant.scientific_name
                ));
              }}
              data-testid={`button-delete-${idx}`}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        ))}
      </div>
    </ScrollArea>
  );

  return (
    <Card className="w-full max-w-6xl mx-auto">
      <CardHeader>
        <CardTitle>Plant Import Wizard</CardTitle>
        <CardDescription>
          Progressive enrichment from multiple botanical databases
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Progress indicator */}
        <div className="flex items-center justify-between mb-6">
          {[1, 2, 3, 4, 5].map((s) => (
            <div
              key={s}
              className={`flex items-center ${s < 5 ? 'flex-1' : ''}`}
            >
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium ${
                  step >= s
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {step > s ? <CheckCircle className="w-5 h-5" /> : s}
              </div>
              {s < 5 && (
                <div
                  className={`h-1 flex-1 mx-2 ${
                    step > s ? 'bg-primary' : 'bg-muted'
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step labels */}
        <div className="flex justify-between mb-8 text-sm">
          <span className={step >= 1 ? 'font-medium' : 'text-muted-foreground'}>
            Search
          </span>
          <span className={step >= 2 ? 'font-medium' : 'text-muted-foreground'}>
            GBIF
          </span>
          <span className={step >= 3 ? 'font-medium' : 'text-muted-foreground'}>
            iNaturalist
          </span>
          <span className={step >= 4 ? 'font-medium' : 'text-muted-foreground'}>
            Review
          </span>
          <span className={step >= 5 ? 'font-medium' : 'text-muted-foreground'}>
            Import
          </span>
        </div>

        {/* Step 1: Initial Search */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="search">Search Term</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  id="search"
                  placeholder="Enter plant name (e.g., Helianthus, Rose, Tomato)"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') searchPerenual();
                  }}
                  disabled={isSearching}
                  data-testid="input-search"
                />
                <Button 
                  onClick={searchPerenual}
                  disabled={isSearching || !searchTerm.trim()}
                  data-testid="button-search"
                >
                  {isSearching ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Search className="w-4 h-4" />
                  )}
                  Search
                </Button>
              </div>
            </div>
            
            {searchProgress && (
              <Alert>
                <Loader2 className="w-4 h-4 animate-spin" />
                <AlertDescription>{searchProgress}</AlertDescription>
              </Alert>
            )}
            
            <Alert>
              <AlertCircle className="w-4 h-4" />
              <AlertDescription>
                Enter a search term to begin progressive enrichment through Perenual → GBIF → iNaturalist
              </AlertDescription>
            </Alert>
          </div>
        )}

        {/* Step 2: GBIF Enrichment */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">GBIF Enrichment</h3>
              <div className="flex gap-2 text-sm">
                <Badge variant="outline">
                  Perenual: {counts.perenual} plants
                </Badge>
                <Badge variant="outline">
                  New from GBIF: {counts.gbif_only} plants
                </Badge>
                <Badge variant="outline">
                  Enriched: {counts.perenual - counts.perenual_only} plants
                </Badge>
              </div>
            </div>
            
            {searchProgress && (
              <Alert>
                <Loader2 className="w-4 h-4 animate-spin" />
                <AlertDescription>{searchProgress}</AlertDescription>
              </Alert>
            )}
            
            <PlantList plants={selectedPlants} />
            
            <div className="flex justify-between">
              <Button
                variant="outline"
                onClick={() => setStep(1)}
                data-testid="button-back"
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <Button
                onClick={() => {
                  setStep(3);
                  searchAndMergeINaturalist();
                }}
                disabled={isSearching}
                data-testid="button-next"
              >
                Continue to iNaturalist
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: iNaturalist Enrichment */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">iNaturalist Enrichment</h3>
              <div className="flex gap-2 text-sm">
                <Badge variant="outline">
                  Total: {selectedPlants.length} plants
                </Badge>
                <Badge variant="outline">
                  From 3 sources: {counts.all_three} plants
                </Badge>
                <Badge variant="outline">
                  From 2 sources: {counts.two_sources} plants
                </Badge>
              </div>
            </div>
            
            {searchProgress && (
              <Alert>
                <Loader2 className="w-4 h-4 animate-spin" />
                <AlertDescription>{searchProgress}</AlertDescription>
              </Alert>
            )}
            
            <PlantList plants={selectedPlants} />
            
            <div className="flex justify-between">
              <Button
                variant="outline"
                onClick={() => setStep(2)}
                disabled={isSearching}
                data-testid="button-back"
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <Button
                onClick={() => setStep(4)}
                disabled={isSearching}
                data-testid="button-next"
              >
                Continue to Review
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 4: Review & Validate */}
        {step === 4 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">Review & Validate</h3>
              <div className="flex gap-2">
                <Badge className="bg-green-500 text-white">
                  Perenual only: {counts.perenual_only}
                </Badge>
                <Badge className="bg-blue-500 text-white">
                  GBIF only: {counts.gbif_only}
                </Badge>
                <Badge className="bg-red-500 text-white">
                  iNaturalist only: {counts.inaturalist_only}
                </Badge>
                <Badge className="bg-purple-500 text-white">
                  All 3 sources: {counts.all_three}
                </Badge>
              </div>
            </div>
            
            <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-900/20">
              <Shield className="w-4 h-4 text-amber-600" />
              <AlertDescription className="text-amber-800 dark:text-amber-200">
                Plants with only one source may need closer review. Multiple sources increase confidence.
              </AlertDescription>
            </Alert>
            
            <PlantList plants={selectedPlants} />
            
            <div className="flex justify-between">
              <Button
                variant="outline"
                onClick={() => setStep(3)}
                data-testid="button-back"
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={validateWithPerplexity}
                  disabled={isSearching}
                  data-testid="button-validate"
                >
                  <Brain className="w-4 h-4 mr-2" />
                  Validate Empty Fields
                </Button>
                <Button
                  onClick={() => setStep(5)}
                  disabled={selectedPlants.length === 0}
                  data-testid="button-continue"
                >
                  Continue to Import
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Step 5: Final Import */}
        {step === 5 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">Final Import</h3>
              <Badge variant="outline">
                Ready to import: {selectedPlants.length} plants
              </Badge>
            </div>
            
            <Alert className="border-green-200 bg-green-50 dark:bg-green-900/20">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <AlertDescription className="text-green-800 dark:text-green-200">
                Ready to import {selectedPlants.length} plants to your database.
                This will create new plant entries with all collected data.
              </AlertDescription>
            </Alert>
            
            <PlantList plants={selectedPlants} showCheckboxes={false} />
            
            {searchProgress && (
              <Alert>
                <Loader2 className="w-4 h-4 animate-spin" />
                <AlertDescription>{searchProgress}</AlertDescription>
              </Alert>
            )}
            
            <div className="flex justify-between">
              <Button
                variant="outline"
                onClick={() => setStep(4)}
                disabled={isSearching}
                data-testid="button-back"
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <Button
                onClick={importPlants}
                disabled={isSearching || selectedPlants.length === 0}
                className="bg-green-600 hover:bg-green-700"
                data-testid="button-import"
              >
                {isSearching ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Database className="w-4 h-4 mr-2" />
                )}
                Import {selectedPlants.length} Plants
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}