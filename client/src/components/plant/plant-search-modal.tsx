import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Check, Search, Leaf } from 'lucide-react';
import PlantSearch from './plant-search';
import type { Plant } from '@shared/schema';

interface PlantSearchModalProps {
  open: boolean;
  onClose: () => void;
  onAddPlants: (plants: Plant[]) => void;
  userTier?: 'free' | 'pay_per_design' | 'premium';
  existingCollection?: Plant[];
}

export default function PlantSearchModal({
  open,
  onClose,
  onAddPlants,
  userTier = 'free',
  existingCollection = []
}: PlantSearchModalProps) {
  const [searchResults, setSearchResults] = useState<Plant[]>([]);
  const [selectedPlants, setSelectedPlants] = useState<Set<string>>(new Set());
  
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
    const plantsToAdd = searchResults.filter(plant => selectedPlants.has(plant.id));
    onAddPlants(plantsToAdd);
    setSelectedPlants(new Set());
    onClose();
  };
  
  const handleClose = () => {
    setSelectedPlants(new Set());
    onClose();
  };
  
  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-6xl h-[80vh] flex flex-col bg-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Search className="w-5 h-5" />
            Search Plants for Your Garden
          </DialogTitle>
          <DialogDescription>
            Search our plant database or {userTier === 'premium' && existingCollection.length > 0 
              ? 'select from your personal collection' 
              : 'upgrade to premium to access your personal collection'}
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
          
          {/* Plant Search Component */}
          <div className="flex-1 overflow-auto">
            <PlantSearch onResults={setSearchResults} />
          </div>
          
          {/* Search Results with Selection */}
          {searchResults.length > 0 && (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium">Select Plants to Add</h3>
                <Badge variant="outline">{selectedPlants.size} selected</Badge>
              </div>
              <ScrollArea className="h-48 border rounded-lg p-3">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {searchResults.map((plant) => (
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
                          <p className="font-medium text-sm italic truncate">{plant.scientificName}</p>
                          {plant.commonName && (
                            <p className="text-xs text-gray-600 truncate">{plant.commonName}</p>
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