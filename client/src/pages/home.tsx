import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Navigation from "@/components/layout/navigation";
import { PlusCircle, Download } from "lucide-react";
import { GardenDesignIcon, PlantLibraryIcon, PlantDoctorIcon, PremiumIcon } from "@/components/ui/brand-icons";
import heroImage from '@assets/generated_images/Rudbeckia_Delphinium_Salvia_garden_e6d90be8.png';

export default function Home() {
  const { user } = useAuth();
  
  const { data: gardens, isLoading: gardensLoading } = useQuery({
    queryKey: ["/api/gardens"],
  });

  const { data: plantCollection, isLoading: collectionLoading } = useQuery({
    queryKey: ["/api/my-collection"],
  });

  return (
    <div className="min-h-screen bg-background garden-pattern">
      <Navigation />
      
      {/* Hero Section */}
      <div className="relative h-[500px] overflow-hidden">
        <img 
          src={heroImage} 
          alt="Rudbeckia, Delphinium and Salvia garden flowers" 
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-background">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="max-w-4xl mx-auto px-8 text-center">
              <h1 className="text-3xl font-serif font-bold text-white mb-3 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                Welcome to GardenScape Pro
              </h1>
              <p className="text-base text-white mb-4 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] max-w-3xl mx-auto">
                Design stunning gardens with professional tools and expert plant knowledge
              </p>
              <div className="flex gap-3 justify-center">
                <Button size="default" className="bg-white/90 hover:bg-white text-primary border shadow-lg hover:shadow-xl transition-all duration-300" asChild>
                  <Link href="/garden-properties" className="link-reset">
                    <GardenDesignIcon className="w-4 h-4 mr-2" />
                    Start Designing
                  </Link>
                </Button>
                <Button size="default" variant="outline" className="bg-white/90 hover:bg-white text-primary border shadow-lg hover:shadow-xl transition-all duration-300" asChild>
                  <Link href="/plant-library" className="link-reset">
                    <PlantLibraryIcon className="w-4 h-4 mr-2" />
                    Browse Plants
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        {/* Welcome Section */}
        <div className="mb-3">
          <h1 className="text-lg font-serif font-bold text-foreground" data-testid="text-welcome-title">
            Welcome back, {user?.firstName || 'Gardener'}!
          </h1>
          <p className="text-xs text-muted-foreground" data-testid="text-welcome-subtitle">
            Ready to create something beautiful in your garden?
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid md:grid-cols-4 gap-2 mb-3">
          <Card>
            <CardContent className="pt-3 pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-lg font-bold" data-testid="text-stat-designs">
                    {gardensLoading ? '...' : gardens?.length || 0}
                  </p>
                  <p className="text-xs text-muted-foreground">Garden Designs</p>
                </div>
                <GardenDesignIcon className="w-6 h-6" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-3 pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-lg font-bold" data-testid="text-stat-plants">
                    {collectionLoading ? '...' : plantCollection?.length || 0}
                  </p>
                  <p className="text-xs text-muted-foreground">Plants in Collection</p>
                </div>
                <PlantLibraryIcon className="w-6 h-6" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-3 pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-lg font-bold" data-testid="text-stat-blueprints">0</p>
                  <p className="text-xs text-muted-foreground">Blueprints Downloaded</p>
                </div>
                <Download className="w-6 h-6 text-primary" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-3 pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-lg font-bold" data-testid="text-stat-membership">Free</p>
                  <p className="text-xs text-muted-foreground">Membership</p>
                </div>
                <PremiumIcon className="w-6 h-6" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-3 gap-3">
          {/* Recent Gardens */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3 pt-4">
                <CardTitle className="text-base" data-testid="text-recent-gardens-title">Recent Garden Designs</CardTitle>
                <Button size="sm" asChild data-testid="button-new-garden">
                  <Link href="/garden-properties">
                    <PlusCircle className="w-4 h-4 mr-2" />
                    New Garden
                  </Link>
                </Button>
              </CardHeader>
              <CardContent>
                {gardensLoading ? (
                  <div className="text-center py-4" data-testid="loading-gardens">
                    <div className="animate-spin w-6 h-6 border-3 border-primary border-t-transparent rounded-full mx-auto mb-2"></div>
                    <p className="text-sm text-muted-foreground">Loading your gardens...</p>
                  </div>
                ) : gardens && gardens.length > 0 ? (
                  <div className="space-y-2">
                    {gardens.slice(0, 3).map((garden: any) => (
                      <div key={garden.id} className="flex items-center justify-between p-3 border border-border rounded-lg" data-testid={`garden-item-${garden.id}`}>
                        <div>
                          <h3 className="text-sm font-medium" data-testid={`text-garden-name-${garden.id}`}>{garden.name}</h3>
                          <p className="text-xs text-muted-foreground" data-testid={`text-garden-location-${garden.id}`}>
                            {garden.location} • {garden.shape} • Created {new Date(garden.createdAt).toLocaleDateString()}
                          </p>
                          <div className="flex items-center space-x-2 mt-1">
                            <span className={`text-xs px-2 py-1 rounded ${
                              garden.status === 'completed' 
                                ? 'bg-accent text-accent-foreground' 
                                : 'bg-canary text-primary'
                            }`} data-testid={`text-garden-status-${garden.id}`}>
                              {garden.status}
                            </span>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            data-testid={`button-edit-${garden.id}`}
                            onClick={() => {
                              sessionStorage.setItem('intentionalNavigation', 'true');
                              window.location.href = `/garden-design/${garden.id}`;
                            }}
                          >
                            Edit
                          </Button>
                          <Button variant="outline" size="sm" data-testid={`button-view-${garden.id}`}>
                            View 3D
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4" data-testid="empty-gardens">
                    <Palette className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                    <h3 className="text-sm font-medium mb-1">No gardens yet</h3>
                    <p className="text-xs text-muted-foreground mb-3">
                      Start by creating your first garden design
                    </p>
                    <Button size="sm" asChild data-testid="button-create-first-garden">
                      <Link href="/garden-properties">Create Your First Garden</Link>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions & Plant Collection */}
          <div className="space-y-4">
            {/* Quick Actions */}
            <Card>
              <CardHeader className="pb-3 pt-4">
                <CardTitle className="text-base" data-testid="text-quick-actions-title">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button size="sm" asChild className="w-full justify-start" data-testid="button-plant-doctor">
                  <Link href="/plant-doctor" className="link-reset">
                    <PlantDoctorIcon className="w-4 h-4 mr-2" />
                    Plant Doctor
                  </Link>
                </Button>
                <Button size="sm" asChild variant="secondary" className="w-full justify-start" data-testid="button-browse-plants">
                  <Link href="/plant-library" className="link-reset">
                    <PlantLibraryIcon className="w-4 h-4 mr-2" />
                    Browse Plants
                  </Link>
                </Button>
                <Button size="sm" asChild variant="outline" className="w-full justify-start" data-testid="button-premium-features">
                  <Link href="/premium" className="link-reset">
                    <PremiumIcon className="w-4 h-4 mr-2" />
                    Premium Features
                  </Link>
                </Button>
              </CardContent>
            </Card>

            {/* Plant Collection Preview */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3 pt-4">
                <CardTitle className="text-base" data-testid="text-collection-title">My Plant Collection</CardTitle>
                <Button variant="ghost" size="sm" asChild data-testid="button-view-all-plants">
                  <Link href="/plant-library?tab=collection">View All</Link>
                </Button>
              </CardHeader>
              <CardContent>
                {collectionLoading ? (
                  <div className="text-center py-3" data-testid="loading-collection">
                    <div className="animate-spin w-5 h-5 border-3 border-primary border-t-transparent rounded-full mx-auto mb-1"></div>
                    <p className="text-xs text-muted-foreground">Loading collection...</p>
                  </div>
                ) : plantCollection && plantCollection.length > 0 ? (
                  <div className="space-y-2">
                    {plantCollection.slice(0, 3).map((item: any) => (
                      <div key={item.id} className="flex items-center space-x-2 p-1.5 rounded" data-testid={`collection-item-${item.id}`}>
                        <div className="w-6 h-6 bg-accent rounded-full flex-shrink-0"></div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-xs truncate" data-testid={`text-plant-name-${item.id}`}>
                            {item.plant?.commonName || 'Unknown Plant'}
                          </p>
                          <p className="text-xs text-muted-foreground">Added to collection</p>
                        </div>
                      </div>
                    ))}
                    {plantCollection.length > 3 && (
                      <p className="text-xs text-muted-foreground text-center" data-testid="text-more-plants">
                        +{plantCollection.length - 3} more plants
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-3" data-testid="empty-collection">
                    <PlantLibraryIcon className="w-6 h-6 text-muted-foreground mx-auto mb-1" />
                    <p className="text-xs text-muted-foreground">No plants in collection</p>
                    <Button variant="ghost" size="sm" asChild className="mt-2" data-testid="button-browse-to-add">
                      <Link href="/plant-library" className="link-reset">Browse Plants</Link>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
