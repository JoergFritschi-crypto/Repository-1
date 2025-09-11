import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import Navigation from "@/components/layout/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { isUnauthorizedError } from "@/lib/authUtils";
import { 
  Crown, 
  Palette, 
  Sprout, 
  Download, 
  Stethoscope,
  Calendar,
  BarChart3,
  Settings,
  ChevronRight,
  Star,
  Gift,
  TrendingUp
} from "lucide-react";

export default function PremiumDashboard() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();

  const { data: gardens } = useQuery({
    queryKey: ["/api/gardens"],
  });

  const { data: plantCollection } = useQuery({
    queryKey: ["/api/my-collection"],
  });

  const { data: collectionLimits } = useQuery({
    queryKey: ["/api/my-collection/limits"],
  });

  const { data: plantDoctorSessions } = useQuery({
    queryKey: ["/api/plant-doctor/sessions"],
  });

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [user, authLoading, toast]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" aria-label="Loading"/>
        </div>
      </div>
    );
  }

  const stats = {
    designsCreated: gardens?.length || 0,
    plantsInCollection: plantCollection?.length || 0,
    blueprintsDownloaded: 0, // Would be tracked in backend
    plantDoctorUses: plantDoctorSessions?.length || 0,
  };

  const thisMonthStats = {
    designsCreated: Math.max(0, stats.designsCreated - 8), // Mock current month data
    aiGenerations: 12,
    plantDoctorUses: Math.max(0, stats.plantDoctorUses - 15),
    blueprintsExported: 3,
  };

  const isPremium = user?.subscriptionStatus === 'active';

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-serif font-bold text-foreground mb-2" data-testid="text-dashboard-title">
              Premium Dashboard
            </h1>
            <p className="text-lg text-muted-foreground" data-testid="text-dashboard-subtitle">
              Manage your garden designs and premium features
            </p>
          </div>
          <div className="text-right">
            <Badge className={isPremium ? "bg-canary text-primary" : "bg-muted text-muted-foreground"} data-testid="badge-membership-status">
              <Crown className="w-4 h-4 mr-2" />
              {isPremium ? "Premium Member" : "Free Member"}
            </Badge>
            {isPremium && (
              <p className="text-sm text-muted-foreground mt-1" data-testid="text-subscription-valid">
                Valid until March 2025
              </p>
            )}
          </div>
        </div>

        {/* Upgrade Banner for Free Users */}
        {!isPremium && (
          <Card className="border-canary bg-gradient-to-r from-canary/10 to-gold/10 mb-8">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-canary rounded-full flex items-center justify-center">
                    <Crown className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg" data-testid="text-upgrade-title">Unlock Premium Features</h3>
                    <p className="text-muted-foreground" data-testid="text-upgrade-subtitle">
                      Get unlimited designs, advanced 3D visualization, and priority support
                    </p>
                  </div>
                </div>
                <Button className="bg-canary text-primary hover:bg-gold" data-testid="button-upgrade-premium">
                  Upgrade Now
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats Overview */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold" data-testid="text-stat-designs">{stats.designsCreated}</p>
                  <p className="text-sm text-muted-foreground">Designs Created</p>
                </div>
                <Palette className="w-8 h-8 text-accent" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold" data-testid="text-stat-plants">{stats.plantsInCollection}</p>
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
                  <p className="text-2xl font-bold" data-testid="text-stat-blueprints">{stats.blueprintsDownloaded}</p>
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
                  <p className="text-2xl font-bold" data-testid="text-stat-doctor-uses">{stats.plantDoctorUses}</p>
                  <p className="text-sm text-muted-foreground">Plant Doctor Uses</p>
                </div>
                <Stethoscope className="w-8 h-8 text-canary" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* My Designs */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle data-testid="text-my-designs-title">My Garden Designs</CardTitle>
                <Button asChild data-testid="button-create-new-design">
                  <a href="/garden-properties">
                    <Palette className="w-4 h-4 mr-2" />
                    New Design
                  </a>
                </Button>
              </CardHeader>
              <CardContent>
                {gardens && gardens.length > 0 ? (
                  <div className="space-y-4">
                    {gardens.slice(0, 3).map((garden: any) => (
                      <div key={garden.id} className="border border-border rounded-lg p-4 hover:shadow-sm transition-shadow" data-testid={`design-item-${garden.id}`}>
                        <div className="flex items-center space-x-4">
                          <div className="w-16 h-16 bg-accent/20 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Palette className="w-8 h-8 text-accent" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-medium" data-testid={`text-design-name-${garden.id}`}>{garden.name}</h3>
                            <p className="text-sm text-muted-foreground" data-testid={`text-design-details-${garden.id}`}>
                              Created {new Date(garden.createdAt).toLocaleDateString()}
                            </p>
                            <div className="flex items-center space-x-4 mt-2 text-sm">
                              <span className="text-muted-foreground">{garden.location}</span>
                              <span className="text-muted-foreground">•</span>
                              <span className="text-muted-foreground">{garden.shape}</span>
                              <Badge variant={garden.status === 'completed' ? 'default' : 'secondary'} data-testid={`badge-design-status-${garden.id}`}>
                                {garden.status}
                              </Badge>
                            </div>
                          </div>
                          <div className="flex flex-col space-y-2">
                            <Button variant="outline" size="sm" asChild data-testid={`button-edit-design-${garden.id}`}>
                              <a href={`/garden-design/${garden.id}`}>Edit</a>
                            </Button>
                            <Button variant="outline" size="sm" data-testid={`button-export-design-${garden.id}`}>
                              Export
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                    {gardens.length > 3 && (
                      <div className="text-center pt-4">
                        <Button variant="ghost" data-testid="button-view-all-designs">
                          View All Designs ({gardens.length})
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-12" data-testid="empty-designs-state">
                    <Palette className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-xl font-semibold mb-2">No designs yet</h3>
                    <p className="text-muted-foreground mb-4">
                      Create your first garden design to get started
                    </p>
                    <Button asChild data-testid="button-create-first-design">
                      <a href="/garden-properties">Create Your First Design</a>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* My Plant Collection */}
            <Card className={collectionLimits?.userTier === 'premium' ? 'border-canary bg-canary/5' : ''}>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center" data-testid="text-collection-title">
                  {collectionLimits?.userTier === 'premium' && (
                    <Crown className="w-4 h-4 mr-2 text-canary" />
                  )}
                  My Plant Collection
                </CardTitle>
                <Button variant="ghost" size="sm" asChild data-testid="button-manage-collection">
                  <a href="/plant-library?tab=collection">Manage</a>
                </Button>
              </CardHeader>
              <CardContent>
                {/* Collection Stats */}
                {collectionLimits && (
                  <div className="mb-4 p-3 bg-muted/50 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium">Collection Status</span>
                      {collectionLimits.userTier === 'premium' ? (
                        <Badge variant="default" className="bg-canary text-primary">
                          Unlimited
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          {collectionLimits.current}/{collectionLimits.limit}
                        </Badge>
                      )}
                    </div>
                    {collectionLimits.limit > 0 && (
                      <>
                        <Progress 
                          value={(collectionLimits.current / collectionLimits.limit) * 100} 
                          className="h-2" 
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          {collectionLimits.limit - collectionLimits.current} slots remaining
                        </p>
                      </>
                    )}
                    {collectionLimits.userTier === 'premium' && (
                      <div className="grid grid-cols-2 gap-2 mt-3">
                        <div>
                          <p className="text-2xl font-bold">{plantCollection?.length || 0}</p>
                          <p className="text-xs text-muted-foreground">Total Plants</p>
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-green-600">
                            {plantCollection?.filter((i: any) => i.isFavorite)?.length || 0}
                          </p>
                          <p className="text-xs text-muted-foreground">Favorites</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                
                {/* Plant List */}
                {plantCollection && plantCollection.length > 0 ? (
                  <div className="space-y-3">
                    {plantCollection.slice(0, 3).map((item: any) => (
                      <div key={item.id} className="flex items-center space-x-3" data-testid={`collection-item-${item.id}`}>
                        <div className="w-8 h-8 bg-accent rounded-full flex-shrink-0">
                          {item.isFavorite && (
                            <Star className="w-4 h-4 text-canary m-2" />
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-sm" data-testid={`text-plant-name-${item.id}`}>
                            {item.plant?.commonName || 'Unknown Plant'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {item.plant?.scientificName || 'Added to collection'}
                          </p>
                        </div>
                      </div>
                    ))}
                    {plantCollection.length > 3 && (
                      <p className="text-sm text-muted-foreground text-center pt-2" data-testid="text-more-plants">
                        +{plantCollection.length - 3} more plants
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-4" data-testid="empty-collection-state">
                    <Sprout className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No plants in collection</p>
                    <Button variant="ghost" size="sm" asChild className="mt-2" data-testid="button-browse-plants">
                      <a href="/plant-library" className="link-reset">Browse Plants</a>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle data-testid="text-quick-actions-title">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button asChild className="w-full justify-start" data-testid="button-plant-doctor">
                  <a href="/plant-doctor" className="link-reset">
                    <Stethoscope className="w-4 h-4 mr-2" />
                    Plant Doctor
                  </a>
                </Button>
                <Button asChild variant="secondary" className="w-full justify-start" data-testid="button-3d-visualizer">
                  <a href="/garden-design" className="link-reset">
                    <BarChart3 className="w-4 h-4 mr-2" />
                    3D Visualizer
                  </a>
                </Button>
                <Button variant="outline" className="w-full justify-start" data-testid="button-export-all">
                  <Download className="w-4 h-4 mr-2" />
                  Export All
                </Button>
              </CardContent>
            </Card>

            {/* Usage Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center" data-testid="text-monthly-stats-title">
                  <Calendar className="w-5 h-5 mr-2" />
                  This Month
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Designs Created:</span>
                  <span className="font-medium" data-testid="text-monthly-designs">{thisMonthStats.designsCreated}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">AI Generations:</span>
                  <span className="font-medium" data-testid="text-monthly-ai-generations">{thisMonthStats.aiGenerations}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Plant Doctor Uses:</span>
                  <span className="font-medium" data-testid="text-monthly-doctor-uses">{thisMonthStats.plantDoctorUses}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Blueprints Exported:</span>
                  <span className="font-medium" data-testid="text-monthly-exports">{thisMonthStats.blueprintsExported}</span>
                </div>
              </CardContent>
            </Card>

            {/* Premium Benefits */}
            {isPremium ? (
              <Card className="border-canary bg-canary/5">
                <CardHeader>
                  <CardTitle className="flex items-center text-canary">
                    <Crown className="w-5 h-5 mr-2" />
                    Premium Benefits
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex items-center">
                    <Star className="w-4 h-4 text-canary mr-2" />
                    <span>Unlimited garden designs</span>
                  </div>
                  <div className="flex items-center">
                    <Star className="w-4 h-4 text-canary mr-2" />
                    <span>Advanced 3D visualization</span>
                  </div>
                  <div className="flex items-center">
                    <Star className="w-4 h-4 text-canary mr-2" />
                    <span>Priority customer support</span>
                  </div>
                  <div className="flex items-center">
                    <Star className="w-4 h-4 text-canary mr-2" />
                    <span>Export high-res blueprints</span>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-muted">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Gift className="w-5 h-5 mr-2 text-muted-foreground" />
                    Usage Limits
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-muted-foreground">Garden Designs</span>
                      <span>{stats.designsCreated}/3</span>
                    </div>
                    <Progress value={(stats.designsCreated / 3) * 100} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-muted-foreground">Plant Doctor</span>
                      <span>{stats.plantDoctorUses}/5</span>
                    </div>
                    <Progress value={(stats.plantDoctorUses / 5) * 100} className="h-2" />
                  </div>
                  <Button className="w-full bg-canary text-primary hover:bg-gold" size="sm" data-testid="button-upgrade-for-unlimited">
                    Upgrade for Unlimited
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
