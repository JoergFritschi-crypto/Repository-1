import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Check, Search, Leaf, Database, Heart } from 'lucide-react';
import { PlantAdvancedSearch } from './plant-advanced-search';
import { CompactPlantCard } from './compact-plant-card';
import type { Plant } from '@shared/schema';

interface PlantSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPlant: (plant: Plant) => void;
  userTier?: 'free' | 'pay_per_design' | 'premium';
}

export default function PlantSearchModal({
  isOpen,
  onClose,
  onSelectPlant,
  userTier = 'free'
}: PlantSearchModalProps) {
  const [filters, setFilters] = useState<any>({});
  const [selectedPlants, setSelectedPlants] = useState<Set<string>>(new Set());
  const [searchSource, setSearchSource] = useState<'database' | 'collection'>('database');

  // Fetch user's collection
  const { data: myCollection = [], isLoading: collectionLoading } = useQuery<any[]>({
    queryKey: ['/api/my-collection'],
    enabled: isOpen && userTier === 'premium'
  });

  // Fetch user info for tier
  const { data: userInfo } = useQuery({
    queryKey: ['/api/auth/user'],
    enabled: isOpen
  });

  // Fetch plants based on filters from database
  const { data: databaseResults = [], isLoading: databaseLoading } = useQuery({
    queryKey: ["/api/plants/search", filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) {
          if (Array.isArray(value)) {
            if (value.length > 0) {
              params.append(key, value.join(','));
            }
          } else if (value !== null) {
            params.append(key, value.toString());
          }
        }
      });
      
      const response = await fetch(`/api/plants/search?${params}`);
      if (!response.ok) throw new Error("Failed to search plants");
      return response.json();
    },
    enabled: isOpen && searchSource === 'database'
  });

  // Filter collection based on filters
  const collectionResults = React.useMemo(() => {
    if (searchSource !== 'collection' || !myCollection) return [];
    
    let filtered = myCollection.map(item => item.plant).filter(Boolean);
    
    // Apply filters to collection
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter((plant: any) => 
        plant.commonName?.toLowerCase().includes(searchLower) ||
        plant.scientificName?.toLowerCase().includes(searchLower)
      );
    }

    if (filters.type && filters.type !== 'all') {
      filtered = filtered.filter((plant: any) => plant.type === filters.type);
    }

    if (filters.sunlight && filters.sunlight !== 'all') {
      filtered = filtered.filter((plant: any) => 
        plant.sunlight?.includes(filters.sunlight) || 
        plant.sunRequirements === filters.sunlight
      );
    }

    // Apply numeric filters for height and spread
    if (filters.heightMin !== undefined && filters.heightMin > 0) {
      filtered = filtered.filter((plant: any) => 
        plant.heightMaxCm >= filters.heightMin
      );
    }

    if (filters.heightMax !== undefined && filters.heightMax < 500) {
      filtered = filtered.filter((plant: any) => 
        plant.heightMinCm <= filters.heightMax
      );
    }

    if (filters.spreadMin !== undefined && filters.spreadMin > 0) {
      filtered = filtered.filter((plant: any) => 
        plant.spreadMaxCm >= filters.spreadMin
      );
    }

    if (filters.spreadMax !== undefined && filters.spreadMax < 300) {
      filtered = filtered.filter((plant: any) => 
        plant.spreadMinCm <= filters.spreadMax
      );
    }

    // Apply color filters
    if (filters.selectedColors && filters.selectedColors.length > 0) {
      filtered = filtered.filter((plant: any) => {
        if (!plant.flowerColor) return false;
        const plantColors = plant.flowerColor.toLowerCase();
        return filters.selectedColors.some((color: string) => 
          plantColors.includes(color)
        );
      });
    }

    return filtered;
  }, [myCollection, filters, searchSource]);

  // Get the appropriate search results based on source
  const searchResults = searchSource === 'database' ? databaseResults : collectionResults;
  const isLoading = searchSource === 'database' ? databaseLoading : collectionLoading;
  
  const handleTogglePlant = (plantId: string) => {
    const newSelected = new Set(selectedPlants);
    if (newSelected.has(plantId)) {
      newSelected.delete(plantId);
    } else {
      newSelected.add(plantId);
    }
    setSelectedPlants(newSelected);
  };
  
  const handleAddSelectedPlants = () => {
    const plantsToAdd = searchResults.filter((plant: Plant) => selectedPlants.has(plant.id));
    plantsToAdd.forEach((plant: Plant) => onSelectPlant(plant));
    setSelectedPlants(new Set());
    onClose();
  };
  
  const handleClose = () => {
    setSelectedPlants(new Set());
    setFilters({});
    setSearchSource('database');
    onClose();
  };

  const handleSearchFilters = (newFilters: any) => {
    setFilters(newFilters);
    setSelectedPlants(new Set()); // Clear selections when search changes
  };

  // Reset selected plants when switching tabs
  useEffect(() => {
    setSelectedPlants(new Set());
  }, [searchSource]);
  
  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-7xl h-[90vh] flex flex-col bg-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Search className="w-5 h-5" />
            Search Plants for Your Garden
          </DialogTitle>
          <DialogDescription>
            {userTier === 'premium' 
              ? 'Search from the complete database or your personal collection'
              : 'Search our comprehensive plant database'}
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Search Source Tabs */}
          <Tabs value={searchSource} onValueChange={(value: any) => setSearchSource(value)} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="database" className="flex items-center gap-2">
                <Database className="w-4 h-4" />
                Plant Database
              </TabsTrigger>
              <TabsTrigger 
                value="collection" 
                disabled={userTier !== 'premium'}
                className="flex items-center gap-2"
              >
                <Heart className="w-4 h-4" />
                My Collection
                {userTier === 'premium' && myCollection?.length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {myCollection.length}
                  </Badge>
                )}
                {userTier !== 'premium' && (
                  <Badge variant="outline" className="ml-2 text-xs">
                    Premium Only
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value={searchSource} className="mt-0 flex-1 flex flex-col">
              {/* Advanced Plant Search Component */}
              <div className="mb-4">
                <PlantAdvancedSearch 
                  onSearch={handleSearchFilters}
                  totalResults={searchResults.length}
                />
              </div>
              
              {/* Search Results with Plant Cards */}
              {searchResults.length > 0 && (
                <div className="flex-1 flex flex-col">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium">
                      {searchSource === 'collection' ? 'Plants from Your Collection' : 'Search Results'}
                      <span className="text-sm font-normal text-muted-foreground ml-2">
                        ({searchResults.length} found)
                      </span>
                    </h3>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{selectedPlants.size} selected</Badge>
                      {selectedPlants.size > 0 && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setSelectedPlants(new Set())}
                        >
                          Clear Selection
                        </Button>
                      )}
                    </div>
                  </div>
                  <ScrollArea className="flex-1 border rounded-lg p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {searchResults.map((plant: Plant) => (
                        <div 
                          key={plant.id} 
                          className={`relative cursor-pointer transition-all ${
                            selectedPlants.has(plant.id) 
                              ? 'ring-2 ring-primary ring-offset-2 rounded-lg' 
                              : ''
                          }`}
                          onClick={() => handleTogglePlant(plant.id)}
                        >
                          <CompactPlantCard
                            plant={plant}
                            isAdmin={false}
                            hideActions={true}
                          />
                          {selectedPlants.has(plant.id) && (
                            <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-1">
                              <Check className="w-4 h-4" />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}

              {/* Loading State */}
              {isLoading && (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-muted-foreground">
                      Searching {searchSource === 'collection' ? 'your collection' : 'plant database'}...
                    </p>
                  </div>
                </div>
              )}

              {/* Empty State */}
              {!isLoading && searchResults.length === 0 && Object.keys(filters).length > 0 && (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <Search className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No plants found</h3>
                    <p className="text-muted-foreground">
                      {searchSource === 'collection' 
                        ? 'No plants in your collection match these filters'
                        : 'Try adjusting your search filters'}
                    </p>
                    {searchSource === 'collection' && myCollection.length === 0 && (
                      <p className="text-sm text-muted-foreground mt-2">
                        Your collection is empty. Search the database to add plants.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Initial State */}
              {!isLoading && searchResults.length === 0 && Object.keys(filters).length === 0 && (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <Leaf className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">
                      {searchSource === 'collection' 
                        ? 'Search Your Collection'
                        : 'Search Plant Database'}
                    </h3>
                    <p className="text-muted-foreground">
                      Use the filters above to find plants
                    </p>
                    {searchSource === 'collection' && (
                      <p className="text-sm text-muted-foreground mt-2">
                        You have {myCollection.length} plants in your collection
                      </p>
                    )}
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
        
        {/* Footer Actions */}
        <div className="flex justify-between items-center pt-4 border-t">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <div className="flex items-center gap-2">
            {selectedPlants.size > 0 && (
              <span className="text-sm text-muted-foreground">
                {selectedPlants.size} plant{selectedPlants.size !== 1 ? 's' : ''} selected
              </span>
            )}
            <Button 
              onClick={handleAddSelectedPlants}
              disabled={selectedPlants.size === 0}
              data-testid="button-add-selected-plants"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add to Garden Canvas
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}