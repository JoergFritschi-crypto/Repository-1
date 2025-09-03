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
  FolderOutput
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
    if (user && !user.isAdmin) {
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
                <div className="grid lg:grid-cols-4 gap-8">
                  {/* Database Stats */}
                  <div className="lg:col-span-1 space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle data-testid="text-database-overview">Database Overview</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">Total Plants:</span>
                          <span className="font-bold text-xl" data-testid="text-total-plants">2,847</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">Verified Entries:</span>
                          <span className="font-bold text-lg text-accent" data-testid="text-verified-plants">2,692</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">Pending Review:</span>
                          <span className="font-bold text-lg text-canary" data-testid="text-pending-plants">{pendingPlants?.length || 155}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">Last Import:</span>
                          <span className="text-sm" data-testid="text-last-import">March 20, 2024</span>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle data-testid="text-data-sources">Data Sources</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex items-center justify-between p-3 bg-muted rounded">
                          <span className="font-medium">Perenual API</span>
                          <div className="flex items-center space-x-2">
                            <div className="w-2 h-2 bg-accent rounded-full"></div>
                            <span className="text-sm text-accent">Active</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-muted rounded">
                          <span className="font-medium">iNaturalist</span>
                          <div className="flex items-center space-x-2">
                            <div className="w-2 h-2 bg-accent rounded-full"></div>
                            <span className="text-sm text-accent">Active</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-muted rounded">
                          <span className="font-medium">GBIF</span>
                          <div className="flex items-center space-x-2">
                            <div className="w-2 h-2 bg-canary rounded-full"></div>
                            <span className="text-sm text-canary">Syncing</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle data-testid="text-quick-actions">Quick Actions</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <Button className="w-full justify-start" data-testid="button-add-plant">
                          <Plus className="w-4 h-4 mr-2" />
                          Add New Plant
                        </Button>
                        <Button variant="secondary" className="w-full justify-start" data-testid="button-sync-sources">
                          <FolderSync className="w-4 h-4 mr-2" />
                          FolderSync All Sources
                        </Button>
                        <Button variant="outline" className="w-full justify-start" data-testid="button-export-database">
                          <FolderOutput className="w-4 h-4 mr-2" />
                          Export Database
                        </Button>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Main Management Interface */}
                  <div className="lg:col-span-3">
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle data-testid="text-plant-management-title">Plant Database Management</CardTitle>
                        <div className="flex space-x-2">
                          <Button variant="outline" size="sm" data-testid="button-filter-plants">
                            <Filter className="w-4 h-4 mr-1" />
                            Filter
                          </Button>
                          <Select value={filterStatus} onValueChange={setFilterStatus}>
                            <SelectTrigger className="w-32" data-testid="select-plant-status">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Status</SelectItem>
                              <SelectItem value="verified">Verified</SelectItem>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="rejected">Rejected</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {/* Search */}
                        <div className="mb-6">
                          <div className="relative">
                            <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
                            <Input
                              placeholder="Search plants..."
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                              className="pl-10"
                              data-testid="input-search-plants"
                            />
                          </div>
                        </div>

                        {/* Plants List */}
                        <div className="space-y-3">
                          {/* Pending plants first */}
                          {pendingPlants && pendingPlants.length > 0 && (
                            <>
                              <h3 className="font-semibold text-lg mb-4" data-testid="text-pending-review">
                                Pending Review ({pendingPlants.length})
                              </h3>
                              {pendingPlants.map((plant: any) => (
                                <div key={plant.id} className="flex items-center justify-between p-4 border-2 border-canary bg-canary/10 rounded-lg hover:shadow-sm" data-testid={`pending-plant-${plant.id}`}>
                                  <div className="flex items-center space-x-4">
                                    <div className="w-12 h-12 bg-canary rounded-lg flex items-center justify-center">
                                      <Database className="w-6 h-6 text-primary" />
                                    </div>
                                    <div>
                                      <h4 className="font-medium" data-testid={`text-plant-scientific-${plant.id}`}>{plant.scientificName}</h4>
                                      <p className="text-sm text-muted-foreground" data-testid={`text-plant-common-${plant.id}`}>
                                        {plant.commonName} | {plant.type} | {plant.data_source}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <Badge className="bg-canary text-primary" data-testid={`badge-pending-${plant.id}`}>Pending</Badge>
                                    <Button
                                      size="sm"
                                      onClick={() => verifyPlantMutation.mutate(plant.id)}
                                      disabled={verifyPlantMutation.isPending}
                                      data-testid={`button-verify-${plant.id}`}
                                    >
                                      <Check className="w-4 h-4" />
                                    </Button>
                                    <Button size="sm" variant="outline" data-testid={`button-edit-plant-${plant.id}`}>
                                      <Edit className="w-4 h-4" />
                                    </Button>
                                    <Button size="sm" variant="destructive" data-testid={`button-reject-plant-${plant.id}`}>
                                      <X className="w-4 h-4" />
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </>
                          )}

                          {/* Regular plants */}
                          {plants && plants.length > 0 && (
                            <>
                              <h3 className="font-semibold text-lg mb-4 mt-8" data-testid="text-all-plants">
                                All Plants ({plants.length})
                              </h3>
                              {plants.slice(0, 10).map((plant: any) => (
                                <div key={plant.id} className="flex items-center justify-between p-4 border border-border rounded-lg hover:shadow-sm" data-testid={`plant-${plant.id}`}>
                                  <div className="flex items-center space-x-4">
                                    <div className="w-12 h-12 bg-accent rounded-lg flex items-center justify-center">
                                      <Database className="w-6 h-6 text-accent-foreground" />
                                    </div>
                                    <div>
                                      <h4 className="font-medium" data-testid={`text-verified-plant-scientific-${plant.id}`}>{plant.scientificName}</h4>
                                      <p className="text-sm text-muted-foreground" data-testid={`text-verified-plant-common-${plant.id}`}>
                                        {plant.commonName} | {plant.type} | {plant.verification_status}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <Badge 
                                      variant={plant.verification_status === 'verified' ? 'default' : 'secondary'}
                                      data-testid={`badge-status-${plant.id}`}
                                    >
                                      {plant.verification_status}
                                    </Badge>
                                    <Button size="sm" variant="outline" data-testid={`button-edit-verified-plant-${plant.id}`}>
                                      <Edit className="w-4 h-4" />
                                    </Button>
                                    <Button size="sm" variant="destructive" data-testid={`button-delete-plant-${plant.id}`}>
                                      <Trash className="w-4 h-4" />
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </>
                          )}
                        </div>

                        {/* Pagination */}
                        <div className="flex items-center justify-between mt-6">
                          <div className="text-sm text-muted-foreground" data-testid="text-pagination-info">
                            Showing 1-10 of 2,847 plants
                          </div>
                          <div className="flex space-x-2">
                            <Button variant="outline" size="sm" data-testid="button-previous-page">Previous</Button>
                            <Button size="sm" data-testid="button-page-1">1</Button>
                            <Button variant="outline" size="sm" data-testid="button-page-2">2</Button>
                            <Button variant="outline" size="sm" data-testid="button-page-3">3</Button>
                            <Button variant="outline" size="sm" data-testid="button-next-page">Next</Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
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
