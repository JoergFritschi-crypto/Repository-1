import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Plus, Check, Search, Leaf, ArrowLeft, Minus, ShoppingCart } from 'lucide-react';
import { CompactPlantCard } from './compact-plant-card';
import type { Plant } from '@/types/plant';

interface PlantSearchResultsProps {
  filters: any;
  searchSource: 'database' | 'collection';
  onSelectPlants: (plants: Map<string, { plant: Plant; quantity: number }>) => void;
  onBack: () => void;
  userTier?: 'free' | 'pay_per_design' | 'premium';
}

export default function PlantSearchResults({
  filters,
  searchSource,
  onSelectPlants,
  onBack,
  userTier = 'free'
}: PlantSearchResultsProps) {
  const [selectedPlants, setSelectedPlants] = useState<Map<string, { quantity: number }>>(new Map());
  
  // Fetch user's collection
  const { data: myCollection = [] } = useQuery<any[]>({
    queryKey: ['/api/my-collection']
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
    enabled: searchSource === 'database'
  });

  // Filter collection based on filters
  const collectionResults = React.useMemo(() => {
    if (searchSource !== 'collection' || !myCollection) return [];
    
    let filtered = myCollection.map(item => item.plant).filter(Boolean);
    
    // Apply all the filters here (same logic as in plant-search-modal)
    const hasActiveFilters = Object.keys(filters).some(key => {
      const value = filters[key];
      if (key === 'heightMin' && value === 0) return false;
      if (key === 'heightMax' && value === 500) return false;
      if (key === 'spreadMin' && value === 0) return false;
      if (key === 'spreadMax' && value === 300) return false;
      if (key === 'selectedColors' && (!value || value.length === 0)) return false;
      if (key === 'includeLargeSpecimens' && value === false) return false;
      if (value === undefined || value === '' || value === 'all') return false;
      return true;
    });
    
    if (!hasActiveFilters) {
      return filtered;
    }
    
    // Apply search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter((plant: any) => 
        plant.commonName?.toLowerCase().includes(searchLower) ||
        plant.scientificName?.toLowerCase().includes(searchLower)
      );
    }

    // Apply other filters...
    if (filters.plantTypes && filters.plantTypes.length > 0) {
      filtered = filtered.filter((plant: any) => 
        filters.plantTypes.includes(plant.type)
      );
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
  const isLoading = searchSource === 'database' ? databaseLoading : false;
  
  const handleTogglePlant = (plantId: string) => {
    const newSelected = new Map(selectedPlants);
    if (newSelected.has(plantId)) {
      newSelected.delete(plantId);
    } else {
      newSelected.set(plantId, { quantity: 1 });
    }
    setSelectedPlants(newSelected);
  };
  
  const handleQuantityChange = (plantId: string, quantity: number) => {
    if (quantity < 1) return;
    const newSelected = new Map(selectedPlants);
    if (newSelected.has(plantId)) {
      newSelected.set(plantId, { quantity });
      setSelectedPlants(newSelected);
    }
  };
  
  const handleAddSelectedPlants = () => {
    const plantsToAdd = new Map<string, { plant: Plant; quantity: number }>();
    selectedPlants.forEach((info, plantId) => {
      const plant = searchResults.find((p: Plant) => p.id === plantId);
      if (plant) {
        plantsToAdd.set(plantId, { plant, quantity: info.quantity });
      }
    });
    onSelectPlants(plantsToAdd);
  };
  
  // Calculate total plants selected including quantities
  const totalPlantsSelected = Array.from(selectedPlants.values()).reduce(
    (sum, info) => sum + info.quantity, 
    0
  );
  
  return (
    <div className="min-h-screen bg-background">
      {/* Header with back button and selection info */}
      <div className="sticky top-0 z-10 bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                onClick={onBack}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Filters
              </Button>
              <div>
                <h1 className="text-2xl font-semibold">
                  {searchSource === 'collection' ? 'Your Collection' : 'Plant Database'} Results
                </h1>
                <p className="text-sm text-muted-foreground">
                  {searchResults.length} plant{searchResults.length !== 1 ? 's' : ''} found
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              {selectedPlants.size > 0 && (
                <>
                  <div className="flex items-center gap-2">
                    <ShoppingCart className="w-5 h-5 text-green-600" />
                    <Badge variant="outline" className="text-base">
                      {selectedPlants.size} type{selectedPlants.size !== 1 ? 's' : ''} • {totalPlantsSelected} total
                    </Badge>
                  </div>
                  <Button
                    variant="ghost"
                    onClick={() => setSelectedPlants(new Map())}
                  >
                    Clear All
                  </Button>
                  <Button 
                    onClick={handleAddSelectedPlants}
                    className="bg-green-600 hover:bg-green-700"
                    data-testid="button-add-to-canvas"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add to Garden Canvas ({totalPlantsSelected})
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Main content area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
            {searchResults.map((plant: Plant) => {
              const isSelected = selectedPlants.has(plant.id);
              const quantity = selectedPlants.get(plant.id)?.quantity || 1;
              const isInCollection = myCollection.some((item: any) => item.plantId === plant.id);
              
              return (
                <div 
                  key={plant.id} 
                  className="relative"
                >
                  <div
                    className={`transition-all cursor-pointer rounded-lg ${
                      isSelected 
                        ? 'ring-4 ring-green-500 ring-offset-2 bg-green-50 scale-[1.02]' 
                        : 'hover:scale-[1.01]'
                    }`}
                    onClick={() => handleTogglePlant(plant.id)}
                  >
                    <CompactPlantCard
                      plant={plant}
                      isAdmin={false}
                      isInCollection={isInCollection}
                      hideActions={false}
                      hideCollectionActions={false}
                    />
                  </div>
                  
                  {isSelected && (
                    <>
                      {/* Selection indicator */}
                      <div className="absolute top-2 right-2 bg-green-500 text-white rounded-full p-1.5 shadow-lg z-10">
                        <Check className="w-5 h-5" />
                      </div>
                      
                      {/* Quantity selector */}
                      <div className="absolute bottom-2 left-2 right-2 bg-white rounded-lg shadow-lg border-2 border-green-500 p-2 z-10">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium text-gray-700">Qty:</span>
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 w-7 p-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleQuantityChange(plant.id, quantity - 1);
                              }}
                              disabled={quantity <= 1}
                            >
                              <Minus className="w-3 h-3" />
                            </Button>
                            <Input
                              type="number"
                              value={quantity}
                              onChange={(e) => {
                                e.stopPropagation();
                                const val = parseInt(e.target.value) || 1;
                                handleQuantityChange(plant.id, val);
                              }}
                              onClick={(e) => e.stopPropagation()}
                              className="h-7 w-14 text-center p-1 font-bold"
                              min="1"
                              max="99"
                            />
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 w-7 p-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleQuantityChange(plant.id, quantity + 1);
                              }}
                              disabled={quantity >= 99}
                            >
                              <Plus className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">
                Searching {searchSource === 'collection' ? 'your collection' : 'plant database'}...
              </p>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && searchResults.length === 0 && (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <Search className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No plants found</h3>
              <p className="text-muted-foreground mb-4">
                {searchSource === 'collection' 
                  ? 'No plants in your collection match these filters'
                  : 'Try adjusting your search filters'}
              </p>
              <Button onClick={onBack} variant="outline">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Filters
              </Button>
            </div>
          </div>
        )}
      </div>
      
      {/* Floating action button for mobile */}
      {selectedPlants.size > 0 && (
        <div className="fixed bottom-6 right-6 lg:hidden">
          <Button 
            onClick={handleAddSelectedPlants}
            size="lg"
            className="bg-green-600 hover:bg-green-700 rounded-full shadow-lg"
            data-testid="button-add-to-canvas-mobile"
          >
            <Plus className="w-5 h-5 mr-2" />
            Add ({totalPlantsSelected})
          </Button>
        </div>
      )}
    </div>
  );
}