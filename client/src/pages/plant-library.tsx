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
import { Sprout, Search, Heart, ChevronLeft, ChevronRight, ArrowUpDown } from "lucide-react";
import type { Plant, PlantSearchFilters } from "@/types/plant";

export default function PlantLibrary() {
  const [activeTab, setActiveTab] = useState("browse");
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<PlantSearchFilters>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState<"name-asc" | "name-desc" | "newest" | "oldest">("name-asc");
  const plantsPerPage = 24; // 3x8 grid

  const { data: plants, isLoading: plantsLoading } = useQuery({
    queryKey: ["/api/plants/search", { q: searchQuery, ...filters }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchQuery) params.append("q", searchQuery);
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
      return response.json();
    },
  });

  const { data: myCollection = [], isLoading: collectionLoading } = useQuery<any[]>({
    queryKey: ["/api/my-collection"],
  });

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

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header - Compact */}
        <div className="mb-6">
          <Card className="border-2 border-[#004025] shadow-sm mb-2">
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
            <TabsTrigger value="collection" className="text-xs" data-testid="tab-my-collection">
              <Heart className="w-3 h-3 mr-1.5" />
              My Collection ({myCollection?.length || 0})
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
                      <p className="text-sm text-muted-foreground">Total Plants</p>
                      <p className="text-2xl font-bold" data-testid="text-total-plants">{sortedPlants?.length || 0}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Verified</p>
                      <p className="text-xl font-semibold text-accent" data-testid="text-verified-plants">
                        {sortedPlants?.filter((p: any) => p.verificationStatus === 'verified').length || 0}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Available</p>
                      <p className="text-xl font-semibold text-green-600" data-testid="text-available-plants">
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
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[...Array(6)].map((_, i) => (
                      <Card key={i} className="animate-pulse" data-testid={`skeleton-plant-${i}`}>
                        <div className="h-48 bg-muted"></div>
                        <CardContent className="pt-4">
                          <div className="h-4 bg-muted rounded mb-2"></div>
                          <div className="h-3 bg-muted rounded w-2/3"></div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
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
                    <div className="text-center py-12" data-testid="empty-plants-state">
                      <Sprout className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-xl font-semibold mb-2">No plants found</h3>
                      <p className="text-muted-foreground mb-4">
                        Try adjusting your search criteria or clearing filters
                      </p>
                      <Button onClick={clearFilters} data-testid="button-clear-search">
                        Clear Search & Filters
                      </Button>
                    </div>
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
                      <p className="text-sm text-muted-foreground">Total in Collection</p>
                      <p className="text-2xl font-bold" data-testid="text-total-collection">{myCollection?.length || 0}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Perennials</p>
                      <p className="text-xl font-semibold text-accent" data-testid="text-perennials-collection">
                        {myCollection?.filter((item: any) => item.plant?.type === 'perennial').length || 0}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Annuals</p>
                      <p className="text-xl font-semibold text-green-600" data-testid="text-annuals-collection">
                        {myCollection?.filter((item: any) => item.plant?.type === 'annual').length || 0}
                      </p>
                    </div>
                    <div className="ml-auto flex gap-2">
                      {/* Collection Actions */}
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => setActiveTab("browse")}
                        data-testid="button-add-to-collection"
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
                  console.log('Searching collection with filters:', filters);
                  // Filter collection based on search
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
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {[...Array(6)].map((_, i) => (
                        <Card key={i} className="animate-pulse" data-testid={`skeleton-collection-${i}`}>
                          <div className="h-48 bg-muted"></div>
                          <CardContent className="pt-4">
                            <div className="h-4 bg-muted rounded mb-2"></div>
                            <div className="h-3 bg-muted rounded w-2/3"></div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : myCollection && Array.isArray(myCollection) && myCollection.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {myCollection.map((item: any) => (
                        <CompactPlantCard
                          key={item.id}
                          plant={item.plant}
                          isAdmin={false}
                          isInCollection={true}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12" data-testid="empty-collection-state">
                      <Heart className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-xl font-semibold mb-2">Your collection is empty</h3>
                      <p className="text-muted-foreground mb-4">
                        Start building your personal plant collection by browsing our database
                      </p>
                      <Button onClick={() => setActiveTab("browse")} data-testid="button-browse-to-add">
                        Browse Plants
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

        </Tabs>
      </div>
    </div>
  );
}