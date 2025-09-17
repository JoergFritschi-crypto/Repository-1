import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import {
  Activity,
  AlertCircle,
  CheckCircle,
  Clock,
  DollarSign,
  ExternalLink,
  Key,
  RefreshCw,
  Shield,
  Zap,
  Eye,
  EyeOff,
  RotateCcw,
  TestTube
} from 'lucide-react';

interface ServiceInfo {
  name: string;
  endpoint: string;
  requiredKeys: string[];
  documentation: string;
  testEndpoint?: string;
  category: 'critical' | 'auxiliary';
}

interface AdminConfig {
  refreshIntervals: {
    apiHealth: number;
    imageGeneration: number;
  };
  serviceCategories: {
    critical: string[];
    auxiliary: string[];
  };
  lastUpdated: string;
}

// Dynamic service information based on actual system configuration
const getServiceInfo = (serviceName: string, category: 'critical' | 'auxiliary'): ServiceInfo => {
  const serviceNames: Record<string, string> = {
    anthropic: 'Anthropic Claude',
    gemini: 'Google Gemini', 
    stripe: 'Stripe',
    perplexity: 'Perplexity AI',
    perenual: 'Perenual Plant Database',
    gbif: 'GBIF Species Data',
    mapbox: 'Mapbox Geocoding',
    visual_crossing: 'Visual Crossing Weather',
    huggingface: 'HuggingFace AI',
    runware: 'Runware Images',
    firecrawl: 'FireCrawl Web',
    github: 'GitHub'
  };
  
  const endpoints: Record<string, string> = {
    anthropic: 'https://api.anthropic.com',
    gemini: 'https://generativelanguage.googleapis.com',
    stripe: 'https://api.stripe.com',
    perplexity: 'https://api.perplexity.ai',
    perenual: 'https://perenual.com/api',
    gbif: 'https://api.gbif.org',
    mapbox: 'https://api.mapbox.com',
    visual_crossing: 'https://weather.visualcrossing.com',
    huggingface: 'https://api-inference.huggingface.co',
    runware: 'https://api.runware.ai',
    firecrawl: 'https://api.firecrawl.dev',
    github: 'https://api.github.com'
  };
  
  const docs: Record<string, string> = {
    anthropic: 'https://docs.anthropic.com',
    gemini: 'https://ai.google.dev/docs',
    stripe: 'https://stripe.com/docs/api',
    perplexity: 'https://docs.perplexity.ai',
    perenual: 'https://perenual.com/docs/api',
    gbif: 'https://www.gbif.org/developer',
    mapbox: 'https://docs.mapbox.com/api/',
    visual_crossing: 'https://www.visualcrossing.com/resources/documentation',
    huggingface: 'https://huggingface.co/docs/api-inference',
    runware: 'https://docs.runware.ai',
    firecrawl: 'https://docs.firecrawl.dev',
    github: 'https://docs.github.com/en/rest'
  };
  
  const requiredKeys: Record<string, string[]> = {
    anthropic: ['ANTHROPIC_API_KEY'],
    gemini: ['GEMINI_API_KEY'],
    stripe: ['STRIPE_SECRET_KEY', 'VITE_STRIPE_PUBLIC_KEY'],
    perplexity: ['PERPLEXITY_API_KEY'],
    perenual: ['PERENUAL_API_KEY'],
    gbif: ['GBIF_EMAIL', 'GBIF_PASSWORD'],
    mapbox: ['MAPBOX_API_KEY'],
    visual_crossing: ['VISUAL_CROSSING_API_KEY'],
    huggingface: ['HUGGINGFACE_API_KEY'],
    runware: ['RUNWARE_API_KEY'],
    firecrawl: ['FIRECRAWL_API_KEY'],
    github: ['REPLIT_CONNECTORS_HOSTNAME', 'REPL_IDENTITY|WEB_REPL_RENEWAL']
  };
  
  return {
    name: serviceNames[serviceName] || serviceName.charAt(0).toUpperCase() + serviceName.slice(1),
    endpoint: endpoints[serviceName] || '',
    requiredKeys: requiredKeys[serviceName] || [],
    documentation: docs[serviceName] || '',
    category
  };
};

export default function APIManagement() {
  const { toast } = useToast();
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [keyValues, setKeyValues] = useState<Record<string, string>>({});

  // Fetch admin configuration for dynamic settings
  const { data: adminConfig, isLoading: configLoading } = useQuery<AdminConfig>({
    queryKey: ['/api/admin/config'],
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false
  });

  // Query for API health status with dynamic refresh interval
  const { data: healthData, isLoading: isLoadingHealth, refetch: refetchHealth } = useQuery({
    queryKey: ['/api/admin/api-health'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/admin/api-health');
      return response.json();
    },
    refetchInterval: adminConfig?.refreshIntervals.apiHealth || 60000
  });

  // Query for API usage metrics
  const { data: usageData, isLoading: isLoadingUsage } = useQuery({
    queryKey: ['/api/admin/api-usage'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/admin/api-usage');
      return response.json();
    }
  });

  // Query for API keys status
  const { data: keysStatus, isLoading: isLoadingKeys, refetch: refetchKeys } = useQuery({
    queryKey: ['/api/admin/api-keys/status'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/admin/api-keys/status');
      return response.json();
    }
  });

  // Mutation to update API key
  const updateKeyMutation = useMutation({
    mutationFn: async ({ service, keyName, value }: { service: string; keyName: string; value: string }) => {
      const response = await apiRequest('POST', '/api/admin/api-keys/update', {
        service,
        keyName,
        value
      });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "API Key Updated",
        description: `Successfully updated ${data.service} key`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/api-keys/status'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/api-health'] });
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update API key",
        variant: "destructive",
      });
    }
  });

  // Mutation to test API key
  const testKeyMutation = useMutation({
    mutationFn: async ({ service }: { service: string }) => {
      const response = await apiRequest('POST', '/api/admin/api-keys/test', { service });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: data.success ? "Test Successful" : "Test Failed",
        description: data.message,
        variant: data.success ? "default" : "destructive",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Test Failed",
        description: error.message || "Failed to test API key",
        variant: "destructive",
      });
    }
  });

  // Mutation to run health check
  const runHealthCheckMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/admin/api-health/check');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Health Check Complete",
        description: "API health status has been updated",
      });
      refetchHealth();
    },
    onError: (error: any) => {
      toast({
        title: "Health Check Failed",
        description: error.message || "Failed to run health check",
        variant: "destructive",
      });
    }
  });

  const handleUpdateKey = (service: string, keyName: string) => {
    const value = keyValues[`${service}_${keyName}`];
    if (!value) {
      toast({
        title: "Error",
        description: "Please enter a key value",
        variant: "destructive",
      });
      return;
    }
    updateKeyMutation.mutate({ service, keyName, value });
  };

  const handleTestKey = (service: string) => {
    testKeyMutation.mutate({ service });
  };

  const toggleKeyVisibility = (key: string) => {
    setShowKeys(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const getServiceStatus = (service: string) => {
    if (!healthData?.services) return 'unknown';
    return healthData.services[service]?.status || 'unknown';
  };

  const getKeyStatus = (service: string, keyName: string) => {
    if (!keysStatus?.keys) return { configured: false, lastUsed: null };
    return keysStatus.keys[`${service}_${keyName}`] || { configured: false, lastUsed: null };
  };

  // Get all available services from admin config and health data
  const getAllServices = () => {
    if (!adminConfig) return [];
    
    const allServices = [...adminConfig.serviceCategories.critical, ...adminConfig.serviceCategories.auxiliary];
    return allServices.map(serviceName => ({
      ...getServiceInfo(serviceName, adminConfig.serviceCategories.critical.includes(serviceName) ? 'critical' : 'auxiliary'),
      serviceName: serviceName, // Add the actual service name for backend communication
      status: getServiceStatus(serviceName)
    }));
  };

  return (
    <div className="space-y-6">
      {/* Overall Status Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl flex items-center gap-2">
                <Shield className="w-5 h-5" />
                API Management Dashboard
              </CardTitle>
              <CardDescription>
                Monitor health, usage, and manage API keys for all integrated services
              </CardDescription>
            </div>
            <Button
              onClick={() => runHealthCheckMutation.mutate()}
              disabled={runHealthCheckMutation.isPending}
              variant="outline"
              data-testid="button-run-health-check"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${runHealthCheckMutation.isPending ? 'animate-spin' : ''}`} />
              Run Health Check
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Overall Health */}
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold flex items-center gap-2">
                  {healthData?.overallHealth === 'healthy' && <CheckCircle className="w-6 h-6 text-green-500" />}
                  {healthData?.overallHealth === 'degraded' && <AlertCircle className="w-6 h-6 text-yellow-500" />}
                  {healthData?.overallHealth === 'critical' && <AlertCircle className="w-6 h-6 text-red-500" />}
                  {!healthData && <Clock className="w-6 h-6 text-gray-400" />}
                  <span className="capitalize">{healthData?.overallHealth || 'Loading...'}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">System Health</p>
              </CardContent>
            </Card>

            {/* Active Services */}
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold flex items-center gap-2">
                  <Activity className="w-6 h-6 text-blue-500" />
                  {healthData?.activeServices || 0} / {getAllServices().length}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Active Services</p>
              </CardContent>
            </Card>

            {/* Total Requests */}
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold flex items-center gap-2">
                  <Zap className="w-6 h-6 text-purple-500" />
                  {usageData?.totalRequests?.toLocaleString() || 0}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Total API Calls</p>
              </CardContent>
            </Card>

            {/* Estimated Cost */}
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold flex items-center gap-2">
                  <DollarSign className="w-6 h-6 text-green-500" />
                  ${usageData?.estimatedCost?.toFixed(2) || '0.00'}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Estimated Cost</p>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      {/* Service Management Tabs */}
      <Tabs defaultValue="critical" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="critical">Critical Services</TabsTrigger>
          <TabsTrigger value="auxiliary">Auxiliary Services</TabsTrigger>
        </TabsList>

        <TabsContent value="critical" className="space-y-4">
          {configLoading ? (
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <span className="ml-3 text-muted-foreground">Loading service configuration...</span>
            </div>
          ) : (
            getAllServices()
              .filter(service => service.category === 'critical')
              .map(service => {
                const serviceKey = service.serviceName; // Use the actual service name for backend communication
                return (
                  <ServiceCard
                    key={serviceKey}
                    serviceKey={serviceKey}
                    serviceInfo={service}
                    status={service.status || 'unknown'}
                    keysStatus={service.requiredKeys.map(key => ({
                      name: key,
                      ...getKeyStatus(service.serviceName, key)
                    }))}
                    showKeys={showKeys}
                    keyValues={keyValues}
                    onToggleVisibility={toggleKeyVisibility}
                    onUpdateKey={handleUpdateKey}
                    onTestKey={handleTestKey}
                    onKeyValueChange={(key: string, value: string) => setKeyValues(prev => ({ ...prev, [key]: value }))}
                    isUpdating={updateKeyMutation.isPending}
                    isTesting={testKeyMutation.isPending}
                  />
                );
              })
          )}
        </TabsContent>

        <TabsContent value="auxiliary" className="space-y-4">
          {configLoading ? (
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <span className="ml-3 text-muted-foreground">Loading service configuration...</span>
            </div>
          ) : (
            getAllServices()
              .filter(service => service.category === 'auxiliary')
              .map(service => {
                const serviceKey = service.serviceName; // Use the actual service name for backend communication
                return (
                  <ServiceCard
                    key={serviceKey}
                    serviceKey={serviceKey}
                    serviceInfo={service}
                    status={service.status || 'unknown'}
                    keysStatus={service.requiredKeys.map(key => ({
                      name: key,
                      ...getKeyStatus(service.serviceName, key)
                    }))}
                    showKeys={showKeys}
                    keyValues={keyValues}
                    onToggleVisibility={toggleKeyVisibility}
                    onUpdateKey={handleUpdateKey}
                    onTestKey={handleTestKey}
                    onKeyValueChange={(key: string, value: string) => setKeyValues(prev => ({ ...prev, [key]: value }))}
                    isUpdating={updateKeyMutation.isPending}
                    isTesting={testKeyMutation.isPending}
                  />
                );
              })
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Service Card Component
function ServiceCard({
  serviceKey,
  serviceInfo,
  status,
  keysStatus,
  showKeys,
  keyValues,
  onToggleVisibility,
  onUpdateKey,
  onTestKey,
  onKeyValueChange,
  isUpdating,
  isTesting
}: any) {
  const statusColor = status === 'healthy' ? 'text-green-500' : status === 'degraded' ? 'text-yellow-500' : 'text-red-500';
  const statusIcon = status === 'healthy' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CardTitle className="text-lg">{serviceInfo.name}</CardTitle>
            <Badge variant={status === 'healthy' ? 'default' : status === 'degraded' ? 'secondary' : 'destructive'}>
              <span className={`flex items-center gap-1 ${statusColor}`}>
                {statusIcon}
                {status}
              </span>
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => onTestKey(serviceKey)}
              disabled={isTesting}
              data-testid={`button-test-${serviceKey}`}
            >
              <TestTube className="w-3 h-3 mr-1" />
              Test
            </Button>
            <Button
              size="sm"
              variant="ghost"
              asChild
            >
              <a href={serviceInfo.documentation} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-3 h-3" />
              </a>
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {keysStatus.map((keyStatus: any) => {
          const keyId = `${serviceKey}_${keyStatus.name}`;
          const isVisible = showKeys[keyId];
          
          return (
            <div key={keyStatus.name} className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">{keyStatus.name}</Label>
                <div className="flex items-center gap-2">
                  {keyStatus.configured ? (
                    <Badge variant="outline" className="text-xs">
                      <CheckCircle className="w-3 h-3 mr-1 text-green-500" />
                      Configured
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs">
                      <AlertCircle className="w-3 h-3 mr-1 text-yellow-500" />
                      Not Configured
                    </Badge>
                  )}
                  {keyStatus.lastUsed && (
                    <span className="text-xs text-muted-foreground">
                      Last used: {new Date(keyStatus.lastUsed).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    type={isVisible ? "text" : "password"}
                    placeholder={keyStatus.configured ? "••••••••••••••••" : "Enter API key"}
                    value={keyValues[keyId] || ''}
                    onChange={(e) => onKeyValueChange(keyId, e.target.value)}
                    className="pr-10"
                    data-testid={`input-${keyId}`}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => onToggleVisibility(keyId)}
                  >
                    {isVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
                <Button
                  onClick={() => onUpdateKey(serviceKey, keyStatus.name)}
                  disabled={isUpdating || !keyValues[keyId]}
                  data-testid={`button-update-${keyId}`}
                >
                  <Key className="w-3 h-3 mr-1" />
                  Update
                </Button>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}