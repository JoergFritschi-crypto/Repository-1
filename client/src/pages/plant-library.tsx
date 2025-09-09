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
import { Sprout, Search, Heart, ChevronLeft, ChevronRight, ArrowUpDown, Filter } from "lucide-react";
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
        if (value !== undefined) params.append(key, value.toString());
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
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-3 h-9" data-testid="tabs-plant-library">
            <TabsTrigger value="browse" className="text-xs" data-testid="tab-browse-plants">
              <Sprout className="w-3 h-3 mr-1.5" />
              Browse Plants
            </TabsTrigger>
            <TabsTrigger value="collection" className="text-xs" data-testid="tab-my-collection">
              <Heart className="w-3 h-3 mr-1.5" />
              My Collection ({myCollection?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="search" className="hidden lg:flex text-xs" data-testid="tab-advanced-search">
              <Search className="w-3 h-3 mr-1.5" />
              Advanced Search
            </TabsTrigger>
          </TabsList>

          {/* Browse Plants Tab */}
          <TabsContent value="browse" className="mt-6">
            <div className="grid lg:grid-cols-4 gap-6">
              {/* Filters Sidebar */}
              <div className="lg:col-span-1">
                <Card className="border-2 border-[#004025]">
                  <CardHeader className="py-5 flower-band-sunset rounded-t-lg">
                    <CardTitle className="flex items-center justify-between text-lg">
                      <span className="flex items-center gap-2">
                        <Filter className="w-4 h-4" />
                        Filters
                      </span>
                      <Button variant="ghost" size="sm" onClick={clearFilters} className="h-7 px-2 text-xs" data-testid="button-clear-filters">
                        Clear
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 pt-4">
                    {/* Search */}
                    <div>
                      <label className="text-xs font-medium mb-1.5 block">Search Plants</label>
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-[#004025]/50" />
                        <Input
                          placeholder="Search by name..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-10"
                          data-testid="input-plant-search"
                        />
                      </div>
                    </div>

                    {/* Plant Type Filter */}
                    <div>
                      <label className="text-xs font-medium mb-1.5 block">Plant Type</label>
                      <Select onValueChange={(value) => handleFilterChange({ type: value === 'all' ? undefined : value })}>
                        <SelectTrigger data-testid="select-plant-type">
                          <SelectValue placeholder="All Types" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Types</SelectItem>
                          <SelectItem value="perennial">Perennials</SelectItem>
                          <SelectItem value="annual">Annuals</SelectItem>
                          <SelectItem value="shrub">Shrubs</SelectItem>
                          <SelectItem value="tree">Trees</SelectItem>
                          <SelectItem value="bulb">Bulbs</SelectItem>
                          <SelectItem value="grass">Ornamental Grasses</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Sun Requirements Filter */}
                    <div>
                      <label className="text-xs font-medium mb-1.5 block">Sun Requirements</label>
                      <Select onValueChange={(value) => handleFilterChange({ sun_requirements: value === 'any' ? undefined : value })}>
                        <SelectTrigger data-testid="select-sun-requirements">
                          <SelectValue placeholder="Any Sun Exposure" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="any">Any Sun Exposure</SelectItem>
                          <SelectItem value="full_sun">Full Sun</SelectItem>
                          <SelectItem value="partial_sun">Partial Sun</SelectItem>
                          <SelectItem value="partial_shade">Partial Shade</SelectItem>
                          <SelectItem value="full_shade">Full Shade</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Special Features */}
                    <div>
                      <label className="text-xs font-medium mb-2 block">Special Features</label>
                      <div className="space-y-2">
                        <label className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={filters.pet_safe || false}
                            onChange={(e) => handleFilterChange({ pet_safe: e.target.checked || undefined })}
                            className="rounded border-gray-300"
                            data-testid="checkbox-pet-safe"
                          />
                          <span className="text-xs">Pet Safe</span>
                        </label>
                        <label className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={filters.drought_tolerant || false}
                            onChange={(e) => handleFilterChange({ drought_tolerant: e.target.checked || undefined })}
                            className="rounded border-gray-300"
                            data-testid="checkbox-drought-tolerant"
                          />
                          <span className="text-xs">Drought Tolerant</span>
                        </label>
                        <label className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={filters.fragrant || false}
                            onChange={(e) => handleFilterChange({ fragrant: e.target.checked || undefined })}
                            className="rounded border-gray-300"
                            data-testid="checkbox-fragrant"
                          />
                          <span className="text-xs">Fragrant</span>
                        </label>
                        <label className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={filters.attracts_pollinators || false}
                            onChange={(e) => handleFilterChange({ attracts_pollinators: e.target.checked || undefined })}
                            className="rounded border-gray-300"
                            data-testid="checkbox-attracts-pollinators"
                          />
                          <span className="text-xs">Attracts Pollinators</span>
                        </label>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Plants Grid */}
              <div className="lg:col-span-3">
                {/* Results Bar with Sorting */}
                <div className="flex justify-between items-center mb-6">
                  <div className="flex items-center space-x-4">
                    <p className="text-sm text-muted-foreground" data-testid="text-results-count">
                      {plantsLoading ? "Loading..." : `${sortedPlants?.length || 0} plants found`}
                    </p>
                    {Object.keys(filters).length > 0 && (
                      <Badge variant="secondary" data-testid="badge-filters-applied">
                        {Object.keys(filters).length} filter(s) applied
                      </Badge>
                    )}
                    {totalPages > 1 && (
                      <Badge variant="outline" data-testid="badge-page-info">
                        Page {currentPage} of {totalPages}
                      </Badge>
                    )}
                  </div>
                  
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

                {/* Plants Display */}
                {plantsLoading ? (
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                  <>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {paginatedPlants.map((plant: Plant) => (
                        <CompactPlantCard
                          key={plant.id}
                          plant={plant}
                          isAdmin={false}
                        />
                      ))}
                    </div>

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
                  </>
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
              </div>
            </div>
          </TabsContent>

          {/* My Collection Tab */}
          <TabsContent value="collection" className="mt-8">
            <Card>
              <CardHeader className="py-7 flower-band-green rounded-t-lg">
                <CardTitle>My Plant Collection</CardTitle>
              </CardHeader>
              <CardContent>
                {collectionLoading ? (
                  <div className="text-center py-8" data-testid="loading-collection">
                    <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Loading your collection...</p>
                  </div>
                ) : myCollection && Array.isArray(myCollection) && myCollection.length > 0 ? (
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
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
          </TabsContent>

          {/* Advanced Search Tab */}
          <TabsContent value="search" className="mt-8">
            <PlantSearch onResults={(results) => console.log(results)} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}