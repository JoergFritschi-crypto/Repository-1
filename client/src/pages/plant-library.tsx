import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import Navigation from "@/components/layout/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { CompactPlantCard } from "@/components/plant/compact-plant-card";
import PlantSearch from "@/components/plant/plant-search";
import PlantAdvancedSearch from "@/components/plant/plant-advanced-search";
import RecentlyViewedPlants from "@/components/plant/recently-viewed-plants";
import { SkeletonCardGrid } from "@/components/ui/skeleton-card";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { ErrorMessage, EmptyState } from "@/components/ui/error-message";
import { Sprout, Search, Heart, ChevronLeft, ChevronRight, ArrowUpDown } from "lucide-react";
import type { Plant, PlantSearchFilters } from "@/types/plant";

export default function PlantLibrary() {
  const [activeTab, setActiveTab] = useState("browse");
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<PlantSearchFilters>({});
  const [collectionFilters, setCollectionFilters] = useState<any>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [currentCollectionPage, setCurrentCollectionPage] = useState(1);
  const [sortBy, setSortBy] = useState<"name-asc" | "name-desc" | "newest" | "oldest">("name-asc");
  const plantsPerPage = 24; // 3x8 grid
  
  // Fetch collection limits
  const { data: collectionLimits } = useQuery<any>({
    queryKey: ["/api/my-collection/limits"],
    queryFn: async () => {
      const response = await fetch("/api/my-collection/limits");
      if (!response.ok) throw new Error("Failed to fetch limits");
      return response.json();
    },
  });

  const { data: plants, isLoading: plantsLoading, error: plantsError, refetch: refetchPlants } = useQuery({
    queryKey: ["/api/plants/search", { q: filters.search || searchQuery, ...filters }],
    queryFn: async () => {
      const params = new URLSearchParams();
      // Use search from filters first, fallback to searchQuery
      const searchTerm = filters.search || searchQuery;
      if (searchTerm) params.append("q", searchTerm);
      
      Object.entries(filters).forEach(([key, value]) => {
        if (key === 'search') return; // Skip search as we handle it above
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
      return response.json();
    },
    enabled: true, // Enable auto-fetch when filters change
  });

  const { data: myCollectionRaw = [], isLoading: collectionLoading, error: collectionError } = useQuery<any[]>({
    queryKey: ["/api/my-collection"],
  });

  // Filter collection based on search filters
  const filteredCollection = useMemo(() => {
    if (!myCollectionRaw || !Array.isArray(myCollectionRaw)) return [];
    
    let filtered = myCollectionRaw.filter(item => item.plant); // Only items with plant data
    
    // Check if any filters are active
    const hasActiveFilters = Object.keys(collectionFilters).some(key => {
      const value = collectionFilters[key];
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
    
    if (!hasActiveFilters) return filtered;
    
    // Apply search filter - search across all name fields for flexibility
    if (collectionFilters.search) {
      const searchLower = collectionFilters.search.toLowerCase();
      filtered = filtered.filter((item: any) => {
        const plant = item.plant;
        return (
          plant.commonName?.toLowerCase().includes(searchLower) ||
          plant.scientificName?.toLowerCase().includes(searchLower) ||
          plant.genus?.toLowerCase().includes(searchLower) ||
          plant.species?.toLowerCase().includes(searchLower) ||
          plant.cultivar?.toLowerCase().includes(searchLower)
        );
      });
    }

    // Apply plant type filters (multi-select)
    if (collectionFilters.plantTypes && collectionFilters.plantTypes.length > 0) {
      filtered = filtered.filter((item: any) => 
        collectionFilters.plantTypes.includes(item.plant.type)
      );
    }

    // Apply sun requirements
    if (collectionFilters.sunlight && collectionFilters.sunlight !== 'all') {
      filtered = filtered.filter((item: any) => {
        const plantSun = item.plant.sunlight;
        if (Array.isArray(plantSun)) {
          return plantSun.some((s: string) => s.toLowerCase().includes(collectionFilters.sunlight.toLowerCase()));
        }
        return plantSun?.toLowerCase().includes(collectionFilters.sunlight.toLowerCase());
      });
    }

    // Apply water requirements
    if (collectionFilters.water && collectionFilters.water !== 'all') {
      filtered = filtered.filter((item: any) => 
        item.plant.watering?.toLowerCase() === collectionFilters.water.toLowerCase()
      );
    }

    // Apply soil type
    if (collectionFilters.soil_type && collectionFilters.soil_type !== 'all') {
      filtered = filtered.filter((item: any) => {
        const plantSoil = item.plant.soil;
        if (Array.isArray(plantSoil)) {
          return plantSoil.some((s: string) => s.toLowerCase().includes(collectionFilters.soil_type.toLowerCase()));
        }
        return false;
      });
    }

    // Apply numeric filters for height
    if (collectionFilters.heightMin !== undefined && collectionFilters.heightMin > 0) {
      filtered = filtered.filter((item: any) => 
        item.plant.heightMaxCm >= collectionFilters.heightMin
      );
    }

    if (collectionFilters.heightMax !== undefined && collectionFilters.heightMax < 500) {
      filtered = filtered.filter((item: any) => 
        item.plant.heightMinCm <= collectionFilters.heightMax
      );
    }

    // Apply numeric filters for spread
    if (collectionFilters.spreadMin !== undefined && collectionFilters.spreadMin > 0) {
      filtered = filtered.filter((item: any) => 
        item.plant.spreadMaxCm >= collectionFilters.spreadMin
      );
    }

    if (collectionFilters.spreadMax !== undefined && collectionFilters.spreadMax < 300) {
      filtered = filtered.filter((item: any) => 
        item.plant.spreadMinCm <= collectionFilters.spreadMax
      );
    }

    // Apply color filters
    if (collectionFilters.selectedColors && collectionFilters.selectedColors.length > 0) {
      filtered = filtered.filter((item: any) => {
        const flowerColor = item.plant.flowerColor;
        if (!flowerColor) return false;
        if (Array.isArray(flowerColor)) {
          return flowerColor.some((color: string) => 
            collectionFilters.selectedColors.includes(color.toLowerCase())
          );
        }
        return false;
      });
    }

    // Apply bloom season filters (multi-select)
    if (collectionFilters.bloomSeasons && collectionFilters.bloomSeasons.length > 0) {
      filtered = filtered.filter((item: any) => {
        const floweringSeason = item.plant.floweringSeason?.toLowerCase();
        if (!floweringSeason) return false;
        return collectionFilters.bloomSeasons.some((season: string) => 
          floweringSeason.includes(season.toLowerCase())
        );
      });
    }

    // Apply foliage type filters (multi-select)
    if (collectionFilters.foliageTypes && collectionFilters.foliageTypes.length > 0) {
      filtered = filtered.filter((item: any) => {
        const foliage = item.plant.foliage?.toLowerCase();
        if (!foliage) return false;
        return collectionFilters.foliageTypes.some((type: string) => 
          foliage.includes(type.toLowerCase())
        );
      });
    }

    // Apply hardiness filter
    if (collectionFilters.hardiness && collectionFilters.hardiness !== 'all') {
      filtered = filtered.filter((item: any) => 
        item.plant.hardiness === collectionFilters.hardiness
      );
    }

    // Apply toxicity filter
    if (collectionFilters.toxicity && collectionFilters.toxicity !== 'all') {
      filtered = filtered.filter((item: any) => 
        item.plant.toxicityCategory === collectionFilters.toxicity
      );
    }

    // Apply growth rate filter
    if (collectionFilters.growth_rate && collectionFilters.growth_rate !== 'all') {
      filtered = filtered.filter((item: any) => 
        item.plant.growthRate?.toLowerCase() === collectionFilters.growth_rate.toLowerCase()
      );
    }

    // Apply native/exotic filter
    if (collectionFilters.native && collectionFilters.native !== 'all') {
      filtered = filtered.filter((item: any) => {
        const isNative = collectionFilters.native === 'native';
        // This would need a native field in the database
        // For now, we'll skip this filter
        return true;
      });
    }

    return filtered;
  }, [myCollectionRaw, collectionFilters]);

  // Use filtered collection
  const myCollection = filteredCollection;

  const handleFilterChange = (newFilters: Partial<PlantSearchFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
    setCurrentPage(1); // Reset to first page when filters change
  };

  const clearFilters = () => {
    setFilters({});
    setSearchQuery("");
    setCurrentPage(1);
  };

  // Sort plants based on selected option
  const sortedPlants = useMemo(() => {
    if (!plants || !Array.isArray(plants)) return [];
    
    const sorted = [...plants];
    switch (sortBy) {
      case "name-asc":
        return sorted.sort((a, b) => a.commonName.localeCompare(b.commonName));
      case "name-desc":
        return sorted.sort((a, b) => b.commonName.localeCompare(a.commonName));
      case "newest":
        return sorted.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      case "oldest":
        return sorted.sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime());
      default:
        return sorted;
    }
  }, [plants, sortBy]);

  // Paginate plants
  const paginatedPlants = useMemo(() => {
    const startIndex = (currentPage - 1) * plantsPerPage;
    const endIndex = startIndex + plantsPerPage;
    return sortedPlants.slice(startIndex, endIndex);
  }, [sortedPlants, currentPage, plantsPerPage]);

  const totalPages = Math.ceil((sortedPlants?.length || 0) / plantsPerPage);

  // Paginate collection
  const paginatedCollection = useMemo(() => {
    const startIndex = (currentCollectionPage - 1) * plantsPerPage;
    const endIndex = startIndex + plantsPerPage;
    return myCollection.slice(startIndex, endIndex);
  }, [myCollection, currentCollectionPage, plantsPerPage]);

  const totalCollectionPages = Math.ceil((myCollection?.length || 0) / plantsPerPage);

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header - Compact */}
        <div className="mb-6">
          <Card className="border-2 border-primary shadow-sm mb-2">
            <CardHeader className="py-6 flower-band-purple rounded-t-lg">
              <CardTitle className="text-2xl font-serif" data-testid="text-plant-library-title">Plant Library</CardTitle>
            </CardHeader>
          </Card>
          <p className="text-sm text-muted-foreground" data-testid="text-plant-library-subtitle">
            Explore our comprehensive botanical database with over 2,000 ornamental plants
          </p>
        </div>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 h-9" data-testid="tabs-plant-library">
            <TabsTrigger value="browse" className="text-xs" data-testid="tab-browse-plants">
              <Sprout className="w-3 h-3 mr-1.5" />
              Browse Plants
            </TabsTrigger>
            <TabsTrigger value="collection" className="text-xs relative" data-testid="tab-my-collection">
              <Heart className="w-3 h-3 mr-1.5" />
              My Collection ({myCollection?.length || 0}{collectionLimits?.limit > 0 ? `/${collectionLimits.limit}` : ''})
              {collectionLimits?.userTier === 'premium' && (
                <Badge className="absolute -top-2 -right-2 text-[10px] px-1 py-0 h-4" variant="default">
                  ∞
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Browse Plants Tab */}
          <TabsContent value="browse" className="mt-8">
            <div className="space-y-6">
              {/* Database Overview Bar */}
              <Card>
                <CardContent className="py-4">
                  <div className="flex flex-wrap gap-8 items-center">
                    <div>
                      <p className="text-sm text-muted-foreground font-medium">Total Plants</p>
                      <p className="text-2xl font-semibold" data-testid="text-total-plants">{sortedPlants?.length || 0}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground font-medium">Verified</p>
                      <p className="text-2xl font-semibold text-accent" data-testid="text-verified-plants">
                        {sortedPlants?.filter((p: any) => p.verificationStatus === 'verified').length || 0}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground font-medium">Available</p>
                      <p className="text-2xl font-semibold text-green-600" data-testid="text-available-plants">
                        {sortedPlants?.length || 0}
                      </p>
                    </div>
                    <div className="ml-auto flex gap-2">
                      {/* Sorting Dropdown */}
                      <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                        <SelectTrigger className="w-[180px]" data-testid="select-sort">
                          <ArrowUpDown className="w-4 h-4 mr-2" />
                          <SelectValue placeholder="Sort by" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="name-asc">Name (A-Z)</SelectItem>
                          <SelectItem value="name-desc">Name (Z-A)</SelectItem>
                          <SelectItem value="newest">Newly Added</SelectItem>
                          <SelectItem value="oldest">Oldest First</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Advanced Search */}
              <PlantAdvancedSearch 
                onSearch={(filters) => {
                  console.log('Searching with filters:', filters);
                  setFilters(filters);
                  setCurrentPage(1);
                }}
                totalResults={sortedPlants?.length || 0}
              />

              {/* Recently Viewed Plants */}
              <RecentlyViewedPlants 
                showTimestamp={true}
                maxItems={12}
                compact={true}
              />

              {/* Plant Cards Grid */}
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle>Plant Database</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Plants Display */}
                  {plantsLoading ? (
                    <SkeletonCardGrid count={9} variant="plant" />
                  ) : plantsError ? (
                    <ErrorMessage
                      title="Failed to load plants"
                      error={plantsError}
                      onRetry={refetchPlants}
                      variant="card"
                    />
                  ) : paginatedPlants && paginatedPlants.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {paginatedPlants.map((plant: Plant) => (
                        <CompactPlantCard
                          key={plant.id}
                          plant={plant}
                          isAdmin={false}
                        />
                      ))}
                    </div>
                  ) : (
                    <EmptyState
                      title="No plants found"
                      message="Try adjusting your search criteria or clearing filters"
                      icon={<Sprout className="w-8 h-8 text-muted-foreground" />}
                      action={{
                        label: "Clear Search & Filters",
                        onClick: clearFilters
                      }}
                    />
                  )}
                </CardContent>
              </Card>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                      <div className="flex justify-center items-center gap-2 mt-8">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                          disabled={currentPage === 1}
                          data-testid="button-prev-page"
                        >
                          <ChevronLeft className="w-4 h-4" />
                          Previous
                        </Button>
                        
                        {/* Page Numbers */}
                        <div className="flex gap-1">
                          {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                            let pageNum;
                            if (totalPages <= 7) {
                              pageNum = i + 1;
                            } else if (currentPage <= 4) {
                              pageNum = i < 5 ? i + 1 : i === 5 ? -1 : totalPages;
                            } else if (currentPage >= totalPages - 3) {
                              pageNum = i === 0 ? 1 : i === 1 ? -1 : totalPages - 5 + i;
                            } else {
                              pageNum = i === 0 ? 1 : i === 1 ? -1 : i === 2 ? currentPage - 1 : i === 3 ? currentPage : i === 4 ? currentPage + 1 : i === 5 ? -1 : totalPages;
                            }
                            
                            if (pageNum === -1) {
                              return <span key={`dots-${i}`} className="px-2">...</span>;
                            }
                            
                            return (
                              <Button
                                key={pageNum}
                                variant={currentPage === pageNum ? "default" : "outline"}
                                size="sm"
                                onClick={() => setCurrentPage(pageNum)}
                                className="w-10"
                                data-testid={`button-page-${pageNum}`}
                              >
                                {pageNum}
                              </Button>
                            );
                          })}
                        </div>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                          disabled={currentPage === totalPages}
                          data-testid="button-next-page"
                        >
                          Next
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                  </div>
                )}
            </div>
          </TabsContent>

          {/* My Collection Tab */}
          <TabsContent value="collection" className="mt-8">
            <div className="space-y-6">
              {/* Database Overview Bar */}
              <Card>
                <CardContent className="py-4">
                  <div className="flex flex-wrap gap-8 items-center">
                    <div>
                      <p className="text-sm text-muted-foreground font-medium">Total in Collection</p>
                      <div className="flex items-baseline gap-2">
                        <p className="text-2xl font-semibold" data-testid="text-total-collection">
                          {myCollection?.length || 0}
                        </p>
                        {collectionLimits && collectionLimits.limit > 0 && (
                          <>
                            <span className="text-lg text-muted-foreground">/</span>
                            <span className="text-lg font-medium text-muted-foreground">
                              {collectionLimits.limit}
                            </span>
                          </>
                        )}
                        {collectionLimits?.userTier === 'premium' && (
                          <Badge variant="secondary" className="ml-2">
                            Unlimited
                          </Badge>
                        )}
                      </div>
                      {collectionLimits && collectionLimits.limit > 0 && (
                        <div className="mt-2">
                          <div className="w-48 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div 
                              className={`h-full transition-all ${
                                ((myCollection?.length || 0) / collectionLimits.limit) > 0.8 
                                  ? 'bg-orange-500' 
                                  : 'bg-green-500'
                              }`}
                              style={{ width: `${Math.min(100, ((myCollection?.length || 0) / collectionLimits.limit) * 100)}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground font-medium">Perennials</p>
                      <p className="text-2xl font-semibold text-accent" data-testid="text-perennials-collection">
                        {myCollection?.filter((item: any) => item.plant?.type === 'perennial').length || 0}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground font-medium">Annuals</p>
                      <p className="text-2xl font-semibold text-green-600" data-testid="text-annuals-collection">
                        {myCollection?.filter((item: any) => item.plant?.type === 'annual').length || 0}
                      </p>
                    </div>
                    <div className="ml-auto flex gap-2">
                      {/* Collection Actions */}
                      {collectionLimits && collectionLimits.userTier !== 'premium' && 
                       collectionLimits.current >= collectionLimits.limit && (
                        <Button 
                          size="sm" 
                          variant="default"
                          className="bg-gradient-to-r from-purple-600 to-blue-600"
                          onClick={() => window.location.href = '/pricing'}
                          data-testid="button-upgrade-premium"
                        >
                          <Sprout className="w-4 h-4 mr-1" />
                          Upgrade to Premium
                        </Button>
                      )}
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => setActiveTab("browse")}
                        data-testid="button-add-to-collection"
                        disabled={collectionLimits && collectionLimits.userTier !== 'premium' && 
                                 collectionLimits.current >= collectionLimits.limit}
                      >
                        <Heart className="w-4 h-4 mr-1" />
                        Add Plants
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Advanced Search for Collection */}
              <PlantAdvancedSearch 
                onSearch={(filters) => {
                  setCollectionFilters(filters);
                  setCurrentCollectionPage(1); // Reset to first page when filters change
                }}
                totalResults={myCollection?.length || 0}
              />

              {/* Collection Grid */}
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle>My Plant Collection</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  {collectionLoading ? (
                    <SkeletonCardGrid count={9} variant="plant" />
                  ) : collectionError ? (
                    <ErrorMessage
                      title="Failed to load collection"
                      error={collectionError}
                      onRetry={() => window.location.reload()}
                      variant="card"
                    />
                  ) : paginatedCollection && Array.isArray(paginatedCollection) && paginatedCollection.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {paginatedCollection.map((item: any) => (
                        <CompactPlantCard
                          key={item.id}
                          plant={item.plant}
                          isAdmin={false}
                          isInCollection={true}
                        />
                      ))}
                    </div>
                  ) : (
                    <EmptyState
                      title="Your collection is empty"
                      message="Start building your personal plant collection by browsing our database"
                      icon={<Heart className="w-8 h-8 text-muted-foreground" />}
                      action={{
                        label: "Browse Plants",
                        onClick: () => setActiveTab("browse")
                      }}
                    />
                  )}
                </CardContent>
              </Card>

              {/* Pagination Controls for Collection */}
              {totalCollectionPages > 1 && (
                <div className="flex justify-center items-center gap-2 mt-8">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentCollectionPage(prev => Math.max(1, prev - 1))}
                    disabled={currentCollectionPage === 1}
                    data-testid="button-collection-prev-page"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Previous
                  </Button>
                  
                  {/* Page Numbers */}
                  <div className="flex gap-1">
                    {Array.from({ length: Math.min(totalCollectionPages, 7) }, (_, i) => {
                      let pageNum;
                      if (totalCollectionPages <= 7) {
                        pageNum = i + 1;
                      } else if (currentCollectionPage <= 4) {
                        pageNum = i < 5 ? i + 1 : i === 5 ? -1 : totalCollectionPages;
                      } else if (currentCollectionPage >= totalCollectionPages - 3) {
                        pageNum = i === 0 ? 1 : i === 1 ? -1 : totalCollectionPages - 5 + i;
                      } else {
                        pageNum = i === 0 ? 1 : i === 1 ? -1 : i === 2 ? currentCollectionPage - 1 : i === 3 ? currentCollectionPage : i === 4 ? currentCollectionPage + 1 : i === 5 ? -1 : totalCollectionPages;
                      }
                      
                      if (pageNum === -1) {
                        return <span key={`dots-${i}`} className="px-2">...</span>;
                      }
                      
                      return (
                        <Button
                          key={pageNum}
                          variant={currentCollectionPage === pageNum ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentCollectionPage(pageNum)}
                          className="w-10"
                          data-testid={`button-collection-page-${pageNum}`}
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentCollectionPage(prev => Math.min(totalCollectionPages, prev + 1))}
                    disabled={currentCollectionPage === totalCollectionPages}
                    data-testid="button-collection-next-page"
                  >
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>

        </Tabs>
      </div>
    </div>
  );
}