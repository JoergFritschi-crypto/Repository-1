import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Activity, 
  AlertCircle, 
  CheckCircle, 
  XCircle, 
  RefreshCw,
  Zap,
  TrendingUp,
  Server,
  Clock,
  DollarSign,
  AlertTriangle
} from "lucide-react";
import { format } from "date-fns";

export function APIMonitoring() {
  const { toast } = useToast();
  const [isChecking, setIsChecking] = useState(false);

  // Fetch health status
  const { data: healthStatus, isLoading: isLoadingHealth } = useQuery({
    queryKey: ["/api/admin/api-health"],
    refetchInterval: 60000, // Refresh every minute
  });

  // Fetch usage stats
  const { data: usageStats } = useQuery({
    queryKey: ["/api/admin/api-usage"],
  });

  // Fetch API configuration
  const { data: apiConfig } = useQuery({
    queryKey: ["/api/admin/api-config"],
  });

  // Run health checks mutation
  const runHealthChecksMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/admin/api-health/check");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Health Check Complete",
        description: "All API services have been checked",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/api-health"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/api-usage"] });
    },
    onError: (error) => {
      toast({
        title: "Health Check Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleRunHealthCheck = async () => {
    setIsChecking(true);
    await runHealthChecksMutation.mutateAsync();
    setIsChecking(false);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'healthy':
        return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" /> Healthy</Badge>;
      case 'degraded':
        return <Badge className="bg-yellow-500"><AlertTriangle className="h-3 w-3 mr-1" /> Degraded</Badge>;
      case 'down':
        return <Badge className="bg-red-500"><XCircle className="h-3 w-3 mr-1" /> Down</Badge>;
      default:
        return <Badge variant="outline"><AlertCircle className="h-3 w-3 mr-1" /> Unknown</Badge>;
    }
  };

  const getServiceIcon = (service: string) => {
    const icons: { [key: string]: any } = {
      anthropic: "🤖",
      perplexity: "🔍",
      gemini: "✨",
      perenual: "🌿",
      gbif: "🌍",
      mapbox: "📍",
      visual_crossing: "☁️",
      huggingface: "🤗",
      runware: "🎨",
      stripe: "💳"
    };
    return icons[service] || "🔧";
  };

  const criticalServices = healthStatus?.filter((s: any) => 
    ['anthropic', 'perplexity', 'stripe'].includes(s.service)
  ) || [];

  const nonCriticalServices = healthStatus?.filter((s: any) => 
    !['anthropic', 'perplexity', 'stripe'].includes(s.service)
  ) || [];

  const healthyCount = healthStatus?.filter((s: any) => s.status === 'healthy').length || 0;
  const totalServices = healthStatus?.length || 0;
  const healthPercentage = totalServices > 0 ? (healthyCount / totalServices) * 100 : 0;

  return (
    <div className="space-y-6" data-testid="component-api-monitoring">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">API Service Monitor</h2>
          <p className="text-muted-foreground">Monitor and manage all integrated API services</p>
        </div>
        <Button 
          onClick={handleRunHealthCheck} 
          disabled={isChecking}
          data-testid="button-run-health-check"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isChecking ? 'animate-spin' : ''}`} />
          Run Health Check
        </Button>
      </div>

      {/* Overall Health Summary */}
      <Card>
        <CardHeader>
          <CardTitle>System Health Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                <span className="font-medium">Overall Health</span>
              </div>
              <div className="flex items-center gap-4">
                <Progress value={healthPercentage} className="w-32" />
                <span className="text-sm font-medium">{healthyCount}/{totalServices} Services Healthy</span>
              </div>
            </div>
            
            {healthPercentage < 100 && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Service Issues Detected</AlertTitle>
                <AlertDescription>
                  Some services are experiencing issues. Check the details below.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Service Tabs */}
      <Tabs defaultValue="critical" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="critical">Critical Services</TabsTrigger>
          <TabsTrigger value="auxiliary">Auxiliary Services</TabsTrigger>
          <TabsTrigger value="usage">Usage & Costs</TabsTrigger>
        </TabsList>

        {/* Critical Services Tab */}
        <TabsContent value="critical" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {criticalServices.map((service: any) => (
              <Card key={service.service} data-testid={`card-service-${service.service}`}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <span className="text-2xl">{getServiceIcon(service.service)}</span>
                      <span className="capitalize">{service.service}</span>
                    </CardTitle>
                    {getStatusBadge(service.status)}
                  </div>
                  <CardDescription>
                    {apiConfig?.[service.service]?.purpose || 'API Service'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    {service.responseTime && (
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" /> Response Time
                        </span>
                        <span className="font-medium">{service.responseTime}ms</span>
                      </div>
                    )}
                    {service.quotaUsed !== undefined && service.quotaLimit !== undefined && (
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1">
                          <Zap className="h-3 w-3" /> Quota Usage
                        </span>
                        <span className="font-medium">
                          {service.quotaUsed}/{service.quotaLimit}
                        </span>
                      </div>
                    )}
                    {service.lastChecked && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Last Checked</span>
                        <span className="font-medium">
                          {format(new Date(service.lastChecked), 'HH:mm:ss')}
                        </span>
                      </div>
                    )}
                    {service.errorMessage && (
                      <Alert variant="destructive" className="mt-2">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{service.errorMessage}</AlertDescription>
                      </Alert>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Auxiliary Services Tab */}
        <TabsContent value="auxiliary" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            {nonCriticalServices.map((service: any) => (
              <Card key={service.service} data-testid={`card-aux-service-${service.service}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <span>{getServiceIcon(service.service)}</span>
                      <span className="capitalize">{service.service}</span>
                    </CardTitle>
                    {getStatusBadge(service.status)}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-xs space-y-1">
                    {service.responseTime && (
                      <div className="flex justify-between">
                        <span>Response</span>
                        <span className="font-medium">{service.responseTime}ms</span>
                      </div>
                    )}
                    {service.lastChecked && (
                      <div className="flex justify-between">
                        <span>Checked</span>
                        <span>{format(new Date(service.lastChecked), 'HH:mm')}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Usage & Costs Tab */}
        <TabsContent value="usage" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>API Usage Statistics</CardTitle>
              <CardDescription>Last 30 days of API usage and estimated costs</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {usageStats?.map((stat: any) => (
                  <div key={stat.service} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{getServiceIcon(stat.service)}</span>
                      <div>
                        <p className="font-medium capitalize">{stat.service}</p>
                        <p className="text-sm text-muted-foreground">
                          {stat.totalRequests || 0} requests
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      {stat.totalTokens && (
                        <p className="text-sm">
                          <TrendingUp className="inline h-3 w-3 mr-1" />
                          {stat.totalTokens.toLocaleString()} tokens
                        </p>
                      )}
                      {stat.totalCost && (
                        <p className="font-medium">
                          <DollarSign className="inline h-3 w-3" />
                          {parseFloat(stat.totalCost).toFixed(2)}
                        </p>
                      )}
                    </div>
                  </div>
                )) || (
                  <p className="text-muted-foreground text-center py-4">
                    No usage data available yet
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Configuration Status */}
      <Card>
        <CardHeader>
          <CardTitle>Service Configuration</CardTitle>
          <CardDescription>Current API service configuration status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
            {apiConfig && Object.entries(apiConfig).map(([service, config]: [string, any]) => (
              <div key={service} className="flex items-center justify-between p-2 border rounded">
                <span className="capitalize text-sm">{service}</span>
                <Badge variant={config.enabled ? "default" : "secondary"}>
                  {config.enabled ? "Enabled" : "Disabled"}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}