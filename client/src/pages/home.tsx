import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Navigation from "@/components/layout/navigation";
import { PlusCircle, Palette, Sprout, Download, Crown } from "lucide-react";

export default function Home() {
  const { user } = useAuth();
  
  const { data: gardens, isLoading: gardensLoading } = useQuery({
    queryKey: ["/api/gardens"],
  });

  const { data: plantCollection, isLoading: collectionLoading } = useQuery({
    queryKey: ["/api/my-collection"],
  });

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-serif font-bold text-foreground mb-2" data-testid="text-welcome-title">
            Welcome back, {user?.firstName || 'Gardener'}!
          </h1>
          <p className="text-lg text-muted-foreground" data-testid="text-welcome-subtitle">
            Ready to create something beautiful in your garden?
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold" data-testid="text-stat-designs">
                    {gardensLoading ? '...' : gardens?.length || 0}
                  </p>
                  <p className="text-sm text-muted-foreground">Garden Designs</p>
                </div>
                <Palette className="w-8 h-8 text-accent" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold" data-testid="text-stat-plants">
                    {collectionLoading ? '...' : plantCollection?.length || 0}
                  </p>
                  <p className="text-sm text-muted-foreground">Plants in Collection</p>
                </div>
                <Sprout className="w-8 h-8 text-secondary" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold" data-testid="text-stat-blueprints">0</p>
                  <p className="text-sm text-muted-foreground">Blueprints Downloaded</p>
                </div>
                <Download className="w-8 h-8 text-primary" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold" data-testid="text-stat-membership">Free</p>
                  <p className="text-sm text-muted-foreground">Membership</p>
                </div>
                <Crown className="w-8 h-8 text-canary" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Recent Gardens */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle data-testid="text-recent-gardens-title">Recent Garden Designs</CardTitle>
                <Button asChild data-testid="button-new-garden">
                  <Link href="/garden-properties">
                    <PlusCircle className="w-4 h-4 mr-2" />
                    New Garden
                  </Link>
                </Button>
              </CardHeader>
              <CardContent>
                {gardensLoading ? (
                  <div className="text-center py-8" data-testid="loading-gardens">
                    <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Loading your gardens...</p>
                  </div>
                ) : gardens && gardens.length > 0 ? (
                  <div className="space-y-4">
                    {gardens.slice(0, 3).map((garden: any) => (
                      <div key={garden.id} className="flex items-center justify-between p-4 border border-border rounded-lg" data-testid={`garden-item-${garden.id}`}>
                        <div>
                          <h3 className="font-medium" data-testid={`text-garden-name-${garden.id}`}>{garden.name}</h3>
                          <p className="text-sm text-muted-foreground" data-testid={`text-garden-location-${garden.id}`}>
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
                          <Button variant="outline" size="sm" asChild data-testid={`button-edit-${garden.id}`}>
                            <Link href={`/garden-design/${garden.id}`}>Edit</Link>
                          </Button>
                          <Button variant="outline" size="sm" data-testid={`button-view-${garden.id}`}>
                            View 3D
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8" data-testid="empty-gardens">
                    <Palette className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="font-medium mb-2">No gardens yet</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Start by creating your first garden design
                    </p>
                    <Button asChild data-testid="button-create-first-garden">
                      <Link href="/garden-properties">Create Your First Garden</Link>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions & Plant Collection */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle data-testid="text-quick-actions-title">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button asChild className="w-full justify-start" data-testid="button-plant-doctor">
                  <Link href="/plant-doctor">
                    <Stethoscope className="w-4 h-4 mr-2" />
                    Plant Doctor
                  </Link>
                </Button>
                <Button asChild variant="secondary" className="w-full justify-start" data-testid="button-browse-plants">
                  <Link href="/plant-library">
                    <Sprout className="w-4 h-4 mr-2" />
                    Browse Plants
                  </Link>
                </Button>
                <Button asChild variant="outline" className="w-full justify-start" data-testid="button-premium-features">
                  <Link href="/premium">
                    <Crown className="w-4 h-4 mr-2" />
                    Premium Features
                  </Link>
                </Button>
              </CardContent>
            </Card>

            {/* Plant Collection Preview */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle data-testid="text-collection-title">My Plant Collection</CardTitle>
                <Button variant="ghost" size="sm" asChild data-testid="button-view-all-plants">
                  <Link href="/plant-library?tab=collection">View All</Link>
                </Button>
              </CardHeader>
              <CardContent>
                {collectionLoading ? (
                  <div className="text-center py-4" data-testid="loading-collection">
                    <div className="animate-spin w-6 h-6 border-4 border-primary border-t-transparent rounded-full mx-auto mb-2"></div>
                    <p className="text-sm text-muted-foreground">Loading collection...</p>
                  </div>
                ) : plantCollection && plantCollection.length > 0 ? (
                  <div className="space-y-3">
                    {plantCollection.slice(0, 3).map((item: any) => (
                      <div key={item.id} className="flex items-center space-x-3 p-2 rounded" data-testid={`collection-item-${item.id}`}>
                        <div className="w-8 h-8 bg-accent rounded-full flex-shrink-0"></div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate" data-testid={`text-plant-name-${item.id}`}>
                            {item.plant?.commonName || 'Unknown Plant'}
                          </p>
                          <p className="text-xs text-muted-foreground">Added to collection</p>
                        </div>
                      </div>
                    ))}
                    {plantCollection.length > 3 && (
                      <p className="text-sm text-muted-foreground text-center" data-testid="text-more-plants">
                        +{plantCollection.length - 3} more plants
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-4" data-testid="empty-collection">
                    <Sprout className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No plants in collection</p>
                    <Button variant="ghost" size="sm" asChild className="mt-2" data-testid="button-browse-to-add">
                      <Link href="/plant-library">Browse Plants</Link>
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
