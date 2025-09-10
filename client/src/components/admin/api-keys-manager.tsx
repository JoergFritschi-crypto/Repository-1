import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Key,
  CheckCircle, 
  XCircle, 
  ExternalLink,
  AlertTriangle,
  Info,
  Play,
  RefreshCw,
  CreditCard,
  Globe,
  Brain,
  Map,
  Leaf,
  Cloud,
  Image,
  Sparkles,
  Eye,
  FileSearch
} from "lucide-react";

interface APIKeyInfo {
  service: string;
  configured: boolean;
  lastTested?: string;
  status?: 'active' | 'invalid' | 'untested';
  usage?: {
    used: number;
    limit: number;
    unit: string;
  };
  documentationUrl: string;
  description: string;
  requiredKeys: string[];
  icon: JSX.Element;
}

const SERVICE_INFO: Record<string, Partial<APIKeyInfo>> = {
  anthropic: {
    description: "Claude AI for plant identification and gardening advice",
    documentationUrl: "https://console.anthropic.com/api-keys",
    icon: <Brain className="w-5 h-5" />,
    requiredKeys: ["ANTHROPIC_API_KEY"]
  },
  stripe: {
    description: "Payment processing and subscription management",
    documentationUrl: "https://dashboard.stripe.com/apikeys",
    icon: <CreditCard className="w-5 h-5" />,
    requiredKeys: ["STRIPE_SECRET_KEY", "VITE_STRIPE_PUBLIC_KEY"]
  },
  mapbox: {
    description: "Interactive maps for garden visualization",
    documentationUrl: "https://account.mapbox.com/access-tokens",
    icon: <Map className="w-5 h-5" />,
    requiredKeys: ["MAPBOX_API_KEY"]
  },
  perenual: {
    description: "Comprehensive plant database and care information",
    documentationUrl: "https://perenual.com/docs/api",
    icon: <Leaf className="w-5 h-5" />,
    requiredKeys: ["PERENUAL_API_KEY"]
  },
  visual_crossing: {
    description: "Weather and climate data for garden planning",
    documentationUrl: "https://www.visualcrossing.com/account",
    icon: <Cloud className="w-5 h-5" />,
    requiredKeys: ["VISUAL_CROSSING_API_KEY"]
  },
  huggingface: {
    description: "FLUX.1-schnell for plant image generation",
    documentationUrl: "https://huggingface.co/settings/tokens",
    icon: <Sparkles className="w-5 h-5" />,
    requiredKeys: ["HUGGINGFACE_API_KEY"]
  },
  runware: {
    description: "Alternative image generation service (Trial)",
    documentationUrl: "https://runware.ai/dashboard",
    icon: <Image className="w-5 h-5" />,
    requiredKeys: ["RUNWARE_API_KEY"]
  },
  perplexity: {
    description: "Sonar-pro model for advanced plant queries",
    documentationUrl: "https://www.perplexity.ai/settings/api",
    icon: <Eye className="w-5 h-5" />,
    requiredKeys: ["PERPLEXITY_API_KEY"]
  },
  gemini: {
    description: "Google's multimodal AI for plant analysis",
    documentationUrl: "https://makersuite.google.com/app/apikey",
    icon: <Sparkles className="w-5 h-5" />,
    requiredKeys: ["GEMINI_API_KEY"]
  },
  gbif: {
    description: "Global biodiversity and species information",
    documentationUrl: "https://www.gbif.org/user/profile",
    icon: <Globe className="w-5 h-5" />,
    requiredKeys: ["GBIF_EMAIL", "GBIF_PASSWORD"]
  },
  firecrawl: {
    description: "Web scraping and crawling for plant data extraction",
    documentationUrl: "https://firecrawl.dev/app",
    icon: <FileSearch className="w-5 h-5" />,
    requiredKeys: ["FIRECRAWL_API_KEY"]
  }
};

export function APIKeysManager() {
  const { toast } = useToast();
  const [testingKey, setTestingKey] = useState<string | null>(null);

  // Fetch API key status
  const { data: keyStatus, isLoading } = useQuery({
    queryKey: ["/api/admin/api-keys/status"],
    refetchInterval: false,
  });

  // Test individual API key
  const testKeyMutation = useMutation({
    mutationFn: async (service: string) => {
      const response = await apiRequest("POST", `/api/admin/api-keys/test/${service}`);
      return response.json();
    },
    onSuccess: (data, service) => {
      toast({
        title: "API Key Test Complete",
        description: `${service} key is ${data.valid ? 'valid' : 'invalid'}`,
        variant: data.valid ? "default" : "destructive",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/api-keys/status"] });
    },
    onError: (error) => {
      toast({
        title: "Test Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleTestKey = async (service: string) => {
    setTestingKey(service);
    await testKeyMutation.mutateAsync(service);
    setTestingKey(null);
  };

  const getKeyStatus = (service: string) => {
    const info = (keyStatus as any[])?.find((k: any) => k.service === service);
    if (!info) return { configured: false, status: 'untested' as const };
    return {
      configured: info.configured,
      status: info.status || 'untested' as const,
      lastTested: info.lastTested,
      usage: info.usage
    };
  };

  const criticalServices = ['anthropic', 'stripe', 'mapbox', 'perenual', 'visual_crossing'];
  const optionalServices = ['huggingface', 'runware', 'perplexity', 'gemini', 'gbif', 'firecrawl'];

  const renderServiceCard = (service: string) => {
    const info = SERVICE_INFO[service];
    const status = getKeyStatus(service);
    const isTesting = testingKey === service;

    return (
      <Card key={service} className="relative overflow-hidden">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              {info?.icon}
              <CardTitle className="text-base capitalize">{service}</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              {status.configured ? (
                <Badge variant="default" className="bg-green-500">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Configured
                </Badge>
              ) : (
                <Badge variant="outline">
                  <XCircle className="w-3 h-3 mr-1" />
                  Missing
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">{info?.description}</p>
          
          {info?.requiredKeys && (
            <div className="space-y-1">
              <p className="text-xs font-medium">Required Keys:</p>
              <div className="flex flex-wrap gap-1">
                {info.requiredKeys.map(key => (
                  <Badge key={key} variant="secondary" className="text-xs">
                    {key}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {status.usage && (
            <div className="space-y-1">
              <p className="text-xs font-medium">Usage:</p>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-secondary rounded-full h-2">
                  <div 
                    className="bg-primary rounded-full h-2 transition-all"
                    style={{ width: `${(status.usage.used / status.usage.limit) * 100}%` }}
                  />
                </div>
                <span className="text-xs text-muted-foreground">
                  {status.usage.used}/{status.usage.limit} {status.usage.unit}
                </span>
              </div>
            </div>
          )}

          {status.lastTested && (
            <p className="text-xs text-muted-foreground">
              Last tested: {new Date(status.lastTested).toLocaleString()}
            </p>
          )}

          <div className="flex gap-2">
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => handleTestKey(service)}
              disabled={!status.configured || isTesting}
            >
              {isTesting ? (
                <>
                  <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                  Testing...
                </>
              ) : (
                <>
                  <Play className="w-3 h-3 mr-1" />
                  Test Key
                </>
              )}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              asChild
            >
              <a 
                href={info?.documentationUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-1"
              >
                <ExternalLink className="w-3 h-3" />
                Get Key
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const configuredCount = (keyStatus as any[])?.filter((k: any) => k.configured).length || 0;
  const totalCount = Object.keys(SERVICE_INFO).length;

  return (
    <div className="space-y-6">
      {/* Overview Alert */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>API Key Status</AlertTitle>
        <AlertDescription>
          {configuredCount} of {totalCount} API keys configured. 
          Critical services are required for core functionality.
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="critical" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="critical">Critical Services</TabsTrigger>
          <TabsTrigger value="optional">Optional Services</TabsTrigger>
        </TabsList>
        
        <TabsContent value="critical" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {criticalServices.map(renderServiceCard)}
          </div>
        </TabsContent>
        
        <TabsContent value="optional" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {optionalServices.map(renderServiceCard)}
          </div>
        </TabsContent>
      </Tabs>

      {/* Instructions */}
      <Card className="bg-muted/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="w-4 h-4" />
            How to Add API Keys
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>1. Click "Get Key" to visit the service provider's website</p>
          <p>2. Create an account and generate an API key</p>
          <p>3. In Replit, go to Tools → Secrets (🔒)</p>
          <p>4. Add the key with the exact name shown above</p>
          <p>5. Restart the application for changes to take effect</p>
        </CardContent>
      </Card>
    </div>
  );
}