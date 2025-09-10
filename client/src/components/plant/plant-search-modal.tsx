import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Database, Heart, ExternalLink } from 'lucide-react';
import { PlantAdvancedSearch } from './plant-advanced-search';
import PlantSearchResults from './plant-search-results';
import type { Plant } from '@/types/plant';

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
  const [searchSource, setSearchSource] = useState<'database' | 'collection'>('database');
  const [showResults, setShowResults] = useState(false);

  // Fetch user's collection for badge count
  const { data: myCollection = [] } = useQuery<any[]>({
    queryKey: ['/api/my-collection'],
    enabled: isOpen
  });

  const handleSelectPlants = (plantsToAdd: Map<string, { plant: Plant; quantity: number }>) => {
    plantsToAdd.forEach(({ plant, quantity }) => {
      for (let i = 0; i < quantity; i++) {
        onSelectPlant(plant);
      }
    });
    setShowResults(false);
    onClose();
  };
  
  const handleClose = () => {
    setFilters({});
    setSearchSource('database');
    setShowResults(false);
    onClose();
  };

  const handleSearchFilters = (newFilters: any) => {
    setFilters(newFilters);
  };
  
  const handleViewResults = () => {
    setShowResults(true);
  };
  
  const handleBackToFilters = () => {
    setShowResults(false);
  };
  
  // Check if any filters are active
  const hasActiveFilters = Object.keys(filters).some(key => {
    const value = filters[key];
    if (key === 'heightMin' && value === 0) return false;
    if (key === 'heightMax' && value === 500) return false;
    if (key === 'spreadMin' && value === 0) return false;
    if (key === 'spreadMax' && value === 300) return false;
    if (key === 'selectedColors' && (!value || value.length === 0)) return false;
    if (key === 'includeLargeSpecimens' && value === false) return false;
    if (key === 'plantTypes' && (!value || value.length === 0)) return false;
    if (key === 'bloomSeasons' && (!value || value.length === 0)) return false;
    if (key === 'foliageTypes' && (!value || value.length === 0)) return false;
    if (value === undefined || value === '' || value === 'all' || value === null) return false;
    return true;
  });
  
  // If showing results, render the full-page results component
  if (showResults) {
    return (
      <PlantSearchResults
        filters={filters}
        searchSource={searchSource}
        onSelectPlants={handleSelectPlants}
        onBack={handleBackToFilters}
        userTier={userTier}
      />
    );
  }
  
  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl w-full max-h-[85vh] flex flex-col bg-white overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Search className="w-5 h-5" />
            Search Plants for Your Garden
          </DialogTitle>
          <DialogDescription>
            {userTier === 'premium' 
              ? 'Set your search criteria, then view results in full screen'
              : 'Set your search criteria, then view results in full screen'}
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 overflow-auto">
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

            <TabsContent value={searchSource} className="mt-0">
              {/* Advanced Plant Search Component */}
              <div className="mb-6">
                <PlantAdvancedSearch 
                  onSearch={handleSearchFilters}
                  totalResults={0}
                />
              </div>
              
              {/* Filter Status Message */}
              {hasActiveFilters && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                  <p className="text-sm text-green-800">
                    Your filters are set. Click the button below to view matching plants.
                  </p>
                </div>
              )}
              
              {!hasActiveFilters && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <p className="text-sm text-blue-800">
                    Set your search criteria above, then view results in full screen.
                  </p>
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
          <Button 
            onClick={handleViewResults}
            className="bg-green-600 hover:bg-green-700"
            size="lg"
            data-testid="button-view-results"
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            View Search Results in Full Screen
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}