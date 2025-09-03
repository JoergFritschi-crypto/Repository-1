import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import Navigation from "@/components/layout/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { APIMonitoring } from "@/components/admin/api-monitoring";
import { APIKeysManager } from "@/components/admin/api-keys-manager";
import { PlantAdvancedSearch } from "@/components/admin/plant-advanced-search";
import { PlantCard } from "@/components/admin/plant-card";
import { 
  Settings, 
  Database, 
  Upload, 
  FlaskConical, 
  Shield, 
  Server, 
  Key, 
  Users,
  Search,
  Filter,
  Check,
  X,
  Edit,
  Trash,
  Plus,
  FolderSync,
  FolderOutput,
  Leaf
} from "lucide-react";

export default function Admin() {
  const { user, isLoading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState("plants");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const { toast } = useToast();

  // Admin access check and make admin
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
    
    // Make yourself admin on first access
    if (user && !(user as any).isAdmin) {
      apiRequest("POST", "/api/admin/make-admin")
        .then(response => response.json())
        .then(() => {
          toast({
            title: "Admin Access Granted",
            description: "You now have admin privileges",
          });
          queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
        })
        .catch(error => console.log("Admin setup:", error));
    }
  }, [user, authLoading, toast]);

  const { data: pendingPlants, isLoading: pendingPlantsLoading } = useQuery({
    queryKey: ["/api/admin/plants/pending"],
    enabled: !!user,
  });

  const { data: plants, isLoading: plantsLoading } = useQuery({
    queryKey: ["/api/plants/search", { q: searchQuery }],
    enabled: !!user,
  });

  const verifyPlantMutation = useMutation({
    mutationFn: async (plantId: string) => {
      const response = await apiRequest("PUT", `/api/admin/plants/${plantId}/verify`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Plant Verified",
        description: "Plant has been verified successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/plants/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/plants/search"] });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
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
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

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

  const adminTabs = [
    { id: "plants", label: "Plant Database", icon: Database },
    { id: "api-monitor", label: "API Monitor", icon: Server },
    { id: "import", label: "Import Wizard", icon: Upload },
    { id: "testing", label: "Testing Tools", icon: FlaskConical },
    { id: "security", label: "Security", icon: Shield },
    { id: "api-keys", label: "API Keys", icon: Key },
    { id: "users", label: "User Management", icon: Users },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-serif font-bold text-foreground mb-2" data-testid="text-admin-title">
            <Settings className="w-8 h-8 inline mr-3 text-accent" />
            Admin Dashboard
          </h1>
          <p className="text-lg text-muted-foreground" data-testid="text-admin-subtitle">
            System management and configuration
          </p>
        </div>

        {/* Admin Navigation */}
        <Card className="mb-8">
          <CardContent className="pt-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid grid-cols-3 lg:grid-cols-7 gap-1" data-testid="tabs-admin">
                {adminTabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <TabsTrigger
                      key={tab.id}
                      value={tab.id}
                      className="flex flex-col p-3 text-xs"
                      data-testid={`tab-${tab.id}`}
                    >
                      <Icon className="w-4 h-4 mb-1" />
                      <span className="hidden lg:inline">{tab.label}</span>
                      <span className="lg:hidden">{tab.label.split(' ')[0]}</span>
                    </TabsTrigger>
                  );
                })}
              </TabsList>

              {/* Plant Database Management */}
              <TabsContent value="plants" className="mt-8">
                <div className="space-y-6">
                  {/* Database Overview Bar */}
                  <Card>
                    <CardContent className="py-4">
                      <div className="flex flex-wrap gap-8 items-center">
                        <div>
                          <p className="text-sm text-muted-foreground">Total Plants</p>
                          <p className="text-2xl font-bold" data-testid="text-total-plants">0</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Verified</p>
                          <p className="text-xl font-semibold text-accent" data-testid="text-verified-plants">0</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Pending</p>
                          <p className="text-xl font-semibold text-canary" data-testid="text-pending-plants">{(pendingPlants as any)?.length || 0}</p>
                        </div>
                        <div className="ml-auto flex gap-2">
                          <Button 
                            size="sm" 
                            variant="outline" 
                            data-testid="button-seed-plants"
                            onClick={async () => {
                              try {
                                const response = await apiRequest('POST', '/api/admin/plants/seed');
                                const data = await response.json();
                                toast({
                                  title: "Plants Added!",
                                  description: data.message,
                                });
                                queryClient.invalidateQueries({ queryKey: ['/api/plants/search'] });
                                queryClient.invalidateQueries({ queryKey: ['/api/admin/plants/pending'] });
                              } catch (error) {
                                toast({
                                  title: "Error",
                                  description: "Failed to seed plants",
                                  variant: "destructive",
                                });
                              }
                            }}
                          >
                            <Leaf className="w-4 h-4 mr-1" />
                            Seed 3 Plants
                          </Button>
                          <Button size="sm" variant="outline" data-testid="button-add-plant">
                            <Plus className="w-4 h-4 mr-1" />
                            Add Plant
                          </Button>
                          <Button size="sm" variant="outline" data-testid="button-export-database">
                            <FolderOutput className="w-4 h-4 mr-1" />
                            Export
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Advanced Search */}
                  <PlantAdvancedSearch 
                    onSearch={(filters) => {
                      console.log('Searching with filters:', filters);
                      // TODO: Implement search with filters
                    }}
                    totalResults={(plants as any)?.length || 0}
                  />

                  {/* Plant Cards Grid */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Plant Database</CardTitle>
                    </CardHeader>
                    <CardContent>

                        {/* Plants Display */}
                        {(!(plants as any) || (plants as any).length === 0) && (!(pendingPlants as any) || (pendingPlants as any).length === 0) ? (
                          <div className="text-center py-12">
                            <Leaf className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                            <h3 className="text-xl font-semibold mb-2">No Plants Yet</h3>
                            <p className="text-muted-foreground mb-4">
                              Start by importing plants from Perenual or adding them manually
                            </p>
                            <Button>
                              <Plus className="w-4 h-4 mr-2" />
                              Add Your First Plant
                            </Button>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {/* Render pending plants as cards */}
                            {(pendingPlants as any) && (pendingPlants as any).map((plant: any) => (
                              <PlantCard
                                key={plant.id}
                                plant={plant}
                                showActions={true}
                                onVerify={() => verifyPlantMutation.mutate(plant.id)}
                                onReject={() => console.log('Reject plant:', plant.id)}
                                onEdit={() => console.log('Edit plant:', plant.id)}
                                onDelete={() => console.log('Delete plant:', plant.id)}
                              />
                            ))}
                            
                            {/* Render verified plants as cards */}
                            {(plants as any) && (plants as any).map((plant: any) => (
                              <PlantCard
                                key={plant.id}
                                plant={plant}
                                showActions={true}
                                onEdit={() => console.log('Edit plant:', plant.id)}
                                onDelete={() => console.log('Delete plant:', plant.id)}
                              />
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
              </TabsContent>

              {/* Other admin tabs would be implemented similarly */}
              <TabsContent value="import" className="mt-8">
                <Card>
                  <CardHeader>
                    <CardTitle data-testid="text-import-wizard-title">Plant Import Wizard</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-12" data-testid="import-wizard-placeholder">
                      <Upload className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-xl font-semibold mb-2">Import Wizard</h3>
                      <p className="text-muted-foreground">
                        Bulk import plants from CSV files or external APIs
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="testing" className="mt-8">
                <Card>
                  <CardHeader>
                    <CardTitle data-testid="text-testing-tools-title">Testing Tools</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-12" data-testid="testing-tools-placeholder">
                      <FlaskConical className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-xl font-semibold mb-2">Testing Tools</h3>
                      <p className="text-muted-foreground">
                        System testing and debugging utilities
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="security" className="mt-8">
                <Card>
                  <CardHeader>
                    <CardTitle data-testid="text-security-title">Security Settings</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-12" data-testid="security-placeholder">
                      <Shield className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-xl font-semibold mb-2">Security Settings</h3>
                      <p className="text-muted-foreground">
                        Manage security policies and access controls
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>


              <TabsContent value="api-monitor" className="mt-8">
                <APIMonitoring />
              </TabsContent>

              <TabsContent value="api-keys" className="mt-8">
                <APIKeysManager />
              </TabsContent>

              <TabsContent value="users" className="mt-8">
                <Card>
                  <CardHeader>
                    <CardTitle data-testid="text-user-management-title">User Management</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-12" data-testid="user-management-placeholder">
                      <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-xl font-semibold mb-2">User Management</h3>
                      <p className="text-muted-foreground">
                        Manage user accounts and permissions
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
