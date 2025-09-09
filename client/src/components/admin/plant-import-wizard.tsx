import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQuery } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { 
  Search, 
  Upload, 
  ChevronRight, 
  ChevronLeft,
  CheckCircle,
  AlertCircle,
  Loader2,
  Database,
  Globe,
  Leaf,
  BookOpen,
  Download,
  X
} from 'lucide-react';

interface PlantImportData {
  // Perenual fields (primary)
  scientific_name?: string;
  common_name?: string;
  family?: string;
  genus?: string;
  species?: string;
  cycle?: string;
  watering?: string;
  sunlight?: string[];
  hardiness?: { min: number; max: number };
  soil?: string[];
  growth_rate?: string;
  drought_tolerant?: boolean;
  salt_tolerant?: boolean;
  thorny?: boolean;
  invasive?: boolean;
  tropical?: boolean;
  indoor?: boolean;
  care_level?: string;
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
  description?: string;
  maintenance?: string;
  propagation?: string[];
  pruning_month?: string[];
  
  // Additional enrichment fields
  gbif_id?: string;
  inaturalist_id?: string;
  native_region?: string;
  conservation_status?: string;
  
  // Import metadata
  source?: 'perenual' | 'gbif' | 'inaturalist' | 'manual' | 'csv';
  external_id?: string;
  confidence_score?: number;
}

export function PlantImportWizard() {
  const [step, setStep] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlants, setSelectedPlants] = useState<PlantImportData[]>([]);
  const [importMode, setImportMode] = useState<'search' | 'csv'>('search');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<PlantImportData[]>([]);
  const [searchProgress, setSearchProgress] = useState('');
  const { toast } = useToast();

  // Step 1: Search Perenual API
  const searchPerenual = async () => {
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    setSearchProgress('Searching Perenual database (fetching multiple pages)...');
    try {
      const response = await fetch(`/api/admin/import/search-perenual?q=${encodeURIComponent(searchQuery)}`, {
        // Increase timeout for multi-page searches
        signal: AbortSignal.timeout(30000) // 30 second timeout
      });
      
      if (!response.ok) throw new Error('Search failed');
      
      const data = await response.json();
      const plants = data.plants || [];
      setSearchResults(plants);
      
      // Automatically select all found plants by default
      if (plants.length > 0) {
        setSelectedPlants(prevSelected => {
          const existingIds = new Set(prevSelected.map(p => p.scientific_name));
          const newPlants = plants.filter((p: PlantImportData) => !existingIds.has(p.scientific_name));
          return [...prevSelected, ...newPlants];
        });
        
        toast({
          title: "Search complete",
          description: `Found ${plants.length} plant${plants.length !== 1 ? 's' : ''} matching "${searchQuery}"`,
        });
      } else {
        toast({
          title: "No results",
          description: "No plants found in Perenual. Try a different search term.",
          variant: "destructive"
        });
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        toast({
          title: "Search timeout",
          description: "Search took too long. Try a more specific search term.",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Search error",
          description: "Failed to search Perenual database",
          variant: "destructive"
        });
      }
    } finally {
      setIsSearching(false);
      setSearchProgress('');
    }
  };

  // Step 2: Enrich with GBIF
  const enrichWithGBIF = async (plants: PlantImportData[]) => {
    const enrichedPlants = [...plants];
    
    for (let i = 0; i < enrichedPlants.length; i++) {
      if (enrichedPlants[i].scientific_name) {
        try {
          const response = await fetch(`/api/admin/import/enrich-gbif`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ scientific_name: enrichedPlants[i].scientific_name })
          });
          
          if (response.ok) {
            const gbifData = await response.json();
            enrichedPlants[i] = { ...enrichedPlants[i], ...gbifData };
          }
        } catch (error) {
          console.error('GBIF enrichment failed for', enrichedPlants[i].scientific_name);
        }
      }
    }
    
    return enrichedPlants;
  };

  // Step 3: Enrich with iNaturalist
  const enrichWithINaturalist = async (plants: PlantImportData[]) => {
    const enrichedPlants = [...plants];
    
    for (let i = 0; i < enrichedPlants.length; i++) {
      if (enrichedPlants[i].scientific_name) {
        try {
          const response = await fetch(`/api/admin/import/enrich-inaturalist`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ scientific_name: enrichedPlants[i].scientific_name })
          });
          
          if (response.ok) {
            const inatData = await response.json();
            enrichedPlants[i] = { ...enrichedPlants[i], ...inatData };
          }
        } catch (error) {
          console.error('iNaturalist enrichment failed for', enrichedPlants[i].scientific_name);
        }
      }
    }
    
    return enrichedPlants;
  };

  // Final import to database
  const importPlants = useMutation({
    mutationFn: async (plants: PlantImportData[]) => {
      const response = await fetch('/api/admin/import/plants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plants })
      });
      
      if (!response.ok) throw new Error('Import failed');
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Import successful",
        description: `Imported ${data.imported} plants successfully`
      });
      queryClient.invalidateQueries({ queryKey: ['/api/plants'] });
      setSelectedPlants([]);
      setStep(1);
    },
    onError: () => {
      toast({
        title: "Import failed",
        description: "Failed to import plants to database",
        variant: "destructive"
      });
    }
  });

  const renderStep = () => {
    switch(step) {
      case 1:
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Leaf className="w-5 h-5 text-green-600" />
              <h3 className="text-lg font-semibold">Step 1: Search Perenual Database</h3>
            </div>
            
            <Tabs value={importMode} onValueChange={(v) => setImportMode(v as 'search' | 'csv')}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="search">Search Plants</TabsTrigger>
                <TabsTrigger value="csv">Upload CSV</TabsTrigger>
              </TabsList>
              
              <TabsContent value="search" className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Search by common or scientific name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && searchPerenual()}
                    data-testid="input-plant-search"
                  />
                  <Button 
                    onClick={searchPerenual} 
                    disabled={isSearching}
                    data-testid="button-search-plants"
                  >
                    {isSearching ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Search className="w-4 h-4" />
                    )}
                  </Button>
                </div>
                
                {isSearching && searchProgress && (
                  <p className="text-sm text-muted-foreground animate-pulse">
                    {searchProgress}
                  </p>
                )}
                
                {searchResults.length > 0 && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">
                      Found {searchResults.length} result{searchResults.length !== 1 ? 's' : ''}
                    </p>
                    <ScrollArea className="h-[400px] border rounded-lg p-4">
                      <div className="space-y-2">
                      {searchResults.map((plant, idx) => (
                        <div 
                          key={idx} 
                          className="flex items-center justify-between p-3 border rounded hover:bg-accent"
                        >
                          <div>
                            <p className="font-medium italic">{plant.scientific_name}</p>
                            <p className="text-sm text-muted-foreground">
                              {plant.common_name || 'No common name'}
                            </p>
                            {plant.family && (
                              <Badge variant="outline" className="mt-1">
                                {plant.family}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
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
                            <Button
                              size="sm"
                              variant="destructive"
                              className="h-8 w-8 p-0"
                              onClick={() => {
                                setSelectedPlants(selectedPlants.filter(p => 
                                  p.scientific_name !== plant.scientific_name
                                ));
                              }}
                              data-testid={`button-delete-plant-${idx}`}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                      </div>
                    </ScrollArea>
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="csv" className="space-y-4">
                <Alert>
                  <Upload className="w-4 h-4" />
                  <AlertDescription>
                    Upload a CSV file with columns matching Perenual data structure.
                    Required: scientific_name, common_name
                  </AlertDescription>
                </Alert>
                <Input type="file" accept=".csv" data-testid="input-csv-upload" />
              </TabsContent>
            </Tabs>
            
            <div className="flex justify-between items-center pt-4">
              <p className="text-sm text-muted-foreground">
                Selected: {selectedPlants.length} plants
              </p>
              <Button 
                onClick={() => setStep(2)} 
                disabled={selectedPlants.length === 0}
                data-testid="button-next-step"
              >
                Next: GBIF Enrichment <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        );
        
      case 2:
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Globe className="w-5 h-5 text-blue-600" />
              <h3 className="text-lg font-semibold">Step 2: GBIF Enrichment</h3>
            </div>
            
            <Alert>
              <Database className="w-4 h-4" />
              <AlertDescription>
                Enriching {selectedPlants.length} plants with GBIF biodiversity data...
                This adds native regions, conservation status, and taxonomic details.
              </AlertDescription>
            </Alert>
            
            <ScrollArea className="h-[400px] border rounded-lg p-4">
              <div className="space-y-2">
                {selectedPlants.map((plant, idx) => (
                  <div key={idx} className="p-3 border rounded">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium italic">{plant.scientific_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {plant.common_name || 'No common name'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {plant.gbif_id ? (
                          <Badge variant="default" className="bg-green-500">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            GBIF Enriched
                          </Badge>
                        ) : (
                          <Badge variant="outline">
                            Pending
                          </Badge>
                        )}
                        <Button
                          size="sm"
                          variant="destructive"
                          className="h-8 w-8 p-0"
                          onClick={() => {
                            setSelectedPlants(selectedPlants.filter(p => 
                              p.scientific_name !== plant.scientific_name
                            ));
                          }}
                          data-testid={`button-delete-plant-gbif-${idx}`}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    {plant.native_region && (
                      <p className="text-sm mt-2">
                        Native: {plant.native_region}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
            
            <div className="flex justify-between pt-4">
              <Button 
                variant="outline" 
                onClick={() => setStep(1)}
                data-testid="button-back"
              >
                <ChevronLeft className="w-4 h-4 mr-2" /> Back
              </Button>
              <Button 
                onClick={async () => {
                  const enriched = await enrichWithGBIF(selectedPlants);
                  setSelectedPlants(enriched);
                  setStep(3);
                }}
                data-testid="button-enrich-gbif"
              >
                Enrich & Continue <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        );
        
      case 3:
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <BookOpen className="w-5 h-5 text-purple-600" />
              <h3 className="text-lg font-semibold">Step 3: iNaturalist Enrichment</h3>
            </div>
            
            <Alert>
              <AlertCircle className="w-4 h-4" />
              <AlertDescription>
                Optional: Enrich with observation data from iNaturalist.
                This adds community observations and regional variations.
              </AlertDescription>
            </Alert>
            
            <ScrollArea className="h-[400px] border rounded-lg p-4">
              <div className="space-y-2">
                {selectedPlants.map((plant, idx) => (
                  <div key={idx} className="p-3 border rounded">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium italic">{plant.scientific_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {plant.common_name || 'No common name'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {plant.gbif_id && (
                          <Badge variant="default" className="bg-green-500">
                            GBIF
                          </Badge>
                        )}
                        {plant.inaturalist_id && (
                          <Badge variant="default" className="bg-purple-500">
                            iNat
                          </Badge>
                        )}
                        <Button
                          size="sm"
                          variant="destructive"
                          className="h-8 w-8 p-0"
                          onClick={() => {
                            setSelectedPlants(selectedPlants.filter(p => 
                              p.scientific_name !== plant.scientific_name
                            ));
                          }}
                          data-testid={`button-delete-plant-inat-${idx}`}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
            
            <div className="flex justify-between pt-4">
              <Button 
                variant="outline" 
                onClick={() => setStep(2)}
                data-testid="button-back"
              >
                <ChevronLeft className="w-4 h-4 mr-2" /> Back
              </Button>
              <div className="flex gap-2">
                <Button 
                  variant="outline"
                  onClick={() => setStep(4)}
                  data-testid="button-skip-inaturalist"
                >
                  Skip iNaturalist
                </Button>
                <Button 
                  onClick={async () => {
                    const enriched = await enrichWithINaturalist(selectedPlants);
                    setSelectedPlants(enriched);
                    setStep(4);
                  }}
                  data-testid="button-enrich-inaturalist"
                >
                  Enrich & Continue <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          </div>
        );
        
      case 4:
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <h3 className="text-lg font-semibold">Step 4: Review & Manual Enhancement</h3>
            </div>
            
            <Alert>
              <AlertCircle className="w-4 h-4" />
              <AlertDescription>
                Review plant data and manually fill any missing critical fields.
                Click on a plant to edit its details.
              </AlertDescription>
            </Alert>
            
            <ScrollArea className="h-[400px] border rounded-lg p-4">
              <div className="space-y-2">
                {selectedPlants.map((plant, idx) => (
                  <div key={idx} className="p-4 border rounded hover:bg-accent cursor-pointer">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-medium italic">{plant.scientific_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {plant.common_name || 'No common name'}
                        </p>
                        
                        <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="font-medium">Water:</span>{' '}
                            {plant.watering || <span className="text-red-500">Missing</span>}
                          </div>
                          <div>
                            <span className="font-medium">Sun:</span>{' '}
                            {plant.sunlight?.join(', ') || <span className="text-red-500">Missing</span>}
                          </div>
                          <div>
                            <span className="font-medium">Hardiness:</span>{' '}
                            {plant.hardiness ? `${plant.hardiness.min}-${plant.hardiness.max}` : <span className="text-red-500">Missing</span>}
                          </div>
                          <div>
                            <span className="font-medium">Care:</span>{' '}
                            {plant.care_level || <span className="text-red-500">Missing</span>}
                          </div>
                        </div>
                        
                        <div className="flex gap-1 mt-2">
                          {plant.source && (
                            <Badge variant="outline" className="text-xs">
                              {plant.source}
                            </Badge>
                          )}
                          {plant.gbif_id && (
                            <Badge variant="outline" className="text-xs bg-green-50">
                              GBIF
                            </Badge>
                          )}
                          {plant.inaturalist_id && (
                            <Badge variant="outline" className="text-xs bg-purple-50">
                              iNat
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          data-testid={`button-edit-plant-${idx}`}
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="h-8 w-8 p-0"
                          onClick={() => {
                            setSelectedPlants(selectedPlants.filter(p => 
                              p.scientific_name !== plant.scientific_name
                            ));
                          }}
                          data-testid={`button-delete-plant-review-${idx}`}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
            
            <div className="flex justify-between pt-4">
              <Button 
                variant="outline" 
                onClick={() => setStep(3)}
                data-testid="button-back"
              >
                <ChevronLeft className="w-4 h-4 mr-2" /> Back
              </Button>
              <Button 
                onClick={() => setStep(5)}
                data-testid="button-review-complete"
              >
                Review Complete <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        );
        
      case 5:
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Database className="w-5 h-5 text-green-600" />
              <h3 className="text-lg font-semibold">Step 5: Final Import</h3>
            </div>
            
            <Alert className="bg-green-50">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <AlertDescription>
                Ready to import {selectedPlants.length} plants to the database.
                This will create plant cards for both the database and library.
              </AlertDescription>
            </Alert>
            
            <Card>
              <CardHeader>
                <CardTitle>Import Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Total Plants:</span>
                    <span className="font-bold">{selectedPlants.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>With GBIF Data:</span>
                    <span className="font-bold">
                      {selectedPlants.filter(p => p.gbif_id).length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>With iNaturalist Data:</span>
                    <span className="font-bold">
                      {selectedPlants.filter(p => p.inaturalist_id).length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Complete Records:</span>
                    <span className="font-bold">
                      {selectedPlants.filter(p => 
                        p.watering && p.sunlight && p.hardiness && p.care_level
                      ).length}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <div className="flex justify-between pt-4">
              <Button 
                variant="outline" 
                onClick={() => setStep(4)}
                data-testid="button-back"
              >
                <ChevronLeft className="w-4 h-4 mr-2" /> Back
              </Button>
              <Button 
                onClick={() => importPlants.mutate(selectedPlants)}
                disabled={importPlants.isPending}
                className="bg-green-600 hover:bg-green-700"
                data-testid="button-import-plants"
              >
                {importPlants.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Database className="w-4 h-4 mr-2" />
                    Import to Database
                  </>
                )}
              </Button>
            </div>
          </div>
        );
        
      default:
        return null;
    }
  };

  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle data-testid="text-import-wizard-title">Plant Import Wizard</CardTitle>
        <CardDescription>
          Import plants from Perenual, enrich with GBIF and iNaturalist data
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Progress indicator */}
        <div className="flex items-center justify-between mb-8">
          {[1, 2, 3, 4, 5].map((s) => (
            <div key={s} className="flex items-center">
              <div 
                className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  s === step 
                    ? 'bg-primary text-primary-foreground' 
                    : s < step 
                    ? 'bg-green-600 text-white'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {s < step ? <CheckCircle className="w-4 h-4" /> : s}
              </div>
              {s < 5 && (
                <div 
                  className={`w-full h-1 mx-2 ${
                    s < step ? 'bg-green-600' : 'bg-muted'
                  }`}
                />
              )}
            </div>
          ))}
        </div>
        
        {renderStep()}
      </CardContent>
    </Card>
  );
}