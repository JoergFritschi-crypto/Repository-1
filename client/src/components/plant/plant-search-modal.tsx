import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Check, Search, Leaf } from 'lucide-react';
import { PlantAdvancedSearch } from './plant-advanced-search';
import type { Plant } from '@shared/schema';

interface PlantSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPlant: (plant: Plant) => void;
  userTier?: 'free' | 'pay_per_design' | 'premium';
  existingCollection?: Plant[];
}

export default function PlantSearchModal({
  isOpen,
  onClose,
  onSelectPlant,
  userTier = 'free',
  existingCollection = []
}: PlantSearchModalProps) {
  const [filters, setFilters] = useState<any>({});
  const [selectedPlants, setSelectedPlants] = useState<Set<string>>(new Set());

  // Fetch plants based on filters
  const { data: searchResults = [], isLoading } = useQuery({
    queryKey: ["/api/plants/search", filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) {
          // Handle array values (like selectedColors) as comma-separated strings
          if (Array.isArray(value)) {
            if (value.length > 0) {
              params.append(key, value.join(','));
            }
          } else {
            params.append(key, value.toString());
          }
        }
      });
      
      const response = await fetch(`/api/plants/search?${params}`);
      if (!response.ok) throw new Error("Failed to search plants");
      return response.json();
    },
    enabled: isOpen // Only search when modal is open
  });
  
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
    onClose();
  };

  const handleSearchFilters = (newFilters: any) => {
    setFilters(newFilters);
    setSelectedPlants(new Set()); // Clear selections when search changes
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-7xl h-[90vh] flex flex-col bg-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Search className="w-5 h-5" />
            Search Plants for Your Garden
          </DialogTitle>
          <DialogDescription>
            Use our advanced search to find the perfect plants for your garden design
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Premium Collection Tab */}
          {userTier === 'premium' && existingCollection.length > 0 && (
            <div className="mb-4">
              <Card className="bg-purple-50 border-purple-200">
                <CardContent className="py-3">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium text-sm flex items-center gap-2">
                      <Leaf className="w-4 h-4 text-purple-600" />
                      Your Personal Collection
                    </h3>
                    <Badge variant="secondary">{existingCollection.length} plants</Badge>
                  </div>
                  <ScrollArea className="h-24">
                    <div className="flex flex-wrap gap-2">
                      {existingCollection.map((plant) => (
                        <Button
                          key={plant.id}
                          variant={selectedPlants.has(plant.id) ? "default" : "outline"}
                          size="sm"
                          onClick={() => handleTogglePlant(plant.id)}
                          className="h-auto py-1 px-2"
                        >
                          {selectedPlants.has(plant.id) && <Check className="w-3 h-3 mr-1" />}
                          <span className="text-xs italic">{plant.scientificName}</span>
                        </Button>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          )}
          
          {/* Advanced Plant Search Component */}
          <div className="mb-4">
            <PlantAdvancedSearch 
              onSearch={handleSearchFilters}
              totalResults={searchResults.length}
            />
          </div>
          
          {/* Search Results with Selection */}
          {searchResults.length > 0 && (
            <div className="flex-1 flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium">
                  Select Plants to Add 
                  <span className="text-sm font-normal text-muted-foreground ml-2">
                    ({searchResults.length} found)
                  </span>
                </h3>
                <Badge variant="outline">{selectedPlants.size} selected</Badge>
              </div>
              <ScrollArea className="flex-1 border rounded-lg p-3">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                  {searchResults.map((plant: Plant) => (
                    <div
                      key={plant.id}
                      onClick={() => handleTogglePlant(plant.id)}
                      className={`p-3 rounded-lg border cursor-pointer transition-all ${
                        selectedPlants.has(plant.id)
                          ? 'bg-green-50 border-green-400'
                          : 'bg-white hover:bg-gray-50 border-gray-200'
                      }`}
                      data-testid={`plant-result-${plant.id}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{plant.commonName}</p>
                          <p className="text-xs text-gray-600 italic truncate">{plant.scientificName}</p>
                          {plant.heightMinCm && plant.heightMaxCm && (
                            <p className="text-xs text-gray-500 mt-1">
                              H: {(plant.heightMinCm / 100).toFixed(1)}-{(plant.heightMaxCm / 100).toFixed(1)}m
                            </p>
                          )}
                          {plant.spreadMinCm && plant.spreadMaxCm && (
                            <p className="text-xs text-gray-500">
                              W: {(plant.spreadMinCm / 100).toFixed(1)}-{(plant.spreadMaxCm / 100).toFixed(1)}m
                            </p>
                          )}
                        </div>
                        {selectedPlants.has(plant.id) && (
                          <Check className="w-4 h-4 text-green-600 flex-shrink-0 ml-2" />
                        )}
                      </div>
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
                <p className="text-muted-foreground">Searching plants...</p>
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
                  Try adjusting your search filters
                </p>
              </div>
            </div>
          )}
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
              Add to Inventory
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}