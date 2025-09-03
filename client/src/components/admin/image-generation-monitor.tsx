import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { 
  ImageIcon, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Loader2,
  AlertCircle,
  Pause,
  Play,
  RefreshCw,
  Sparkles
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";

// Type definitions for API responses
interface QueueItem {
  id: string;
  plantId: string;
  plantName?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error?: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  attempts: number;
  imageType: 'thumbnail' | 'full' | 'detail';
}

interface GenerationQueue {
  items: QueueItem[];
}

interface GenerationStatus {
  totalPlants: number;
  withImages: number;
  withoutImages: number;
  completed: number;
  generating: number;
  queued: number;
  failed: number;
  recentActivity?: Array<{
    timestamp: string;
    plantName: string;
    action: string;
    status: 'success' | 'error' | 'info';
  }>;
}

export function ImageGenerationMonitor() {
  const { toast } = useToast();
  
  // Get generation status
  const { data: status, isLoading: statusLoading } = useQuery<GenerationStatus>({
    queryKey: ["/api/admin/image-generation/status"],
    refetchInterval: 5000, // Poll every 5 seconds
  });

  // Get queue status
  const { data: queue, isLoading: queueLoading } = useQuery<GenerationQueue>({
    queryKey: ["/api/admin/image-generation/queue"],
    refetchInterval: 5000,
  });

  // Get all plants without images
  const { data: plants } = useQuery({
    queryKey: ["/api/plants/search?q="],
  });

  // Bulk generation mutation
  const generateAllMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/admin/plants/generate-all-images');
      const data = await response.json();
      if (data.queued === 0) {
        throw new Error(data.message || "No plants need image generation");
      }
      return data;
    },
    onSuccess: (data) => {
      toast({
        title: "Bulk Generation Started",
        description: `Successfully queued ${data.queued} out of ${data.total} plants for image generation`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/image-generation/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/image-generation/queue"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (statusLoading || queueLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch(status) {
      case "generating":
        return <Badge className="bg-blue-500"><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Generating</Badge>;
      case "completed":
        return <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" /> Completed</Badge>;
      case "failed":
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" /> Failed</Badge>;
      case "queued":
        return <Badge variant="outline"><Clock className="w-3 h-3 mr-1" /> Queued</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Status Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>
              <ImageIcon className="inline w-5 h-5 mr-2" />
              Image Generation Status
            </span>
            <div className="flex gap-2">
              <Button 
                size="sm" 
                variant="default"
                onClick={() => generateAllMutation.mutate()}
                disabled={generateAllMutation.isPending || ((status?.generating ?? 0) > 0) || ((plants as any[])?.filter((p: any) => !p.thumbnailImage && !p.fullImage && !p.detailImage).length === 0)}
              >
                {generateAllMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                    Queueing...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-1" />
                    Generate All Missing
                  </>
                )}
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">{status?.totalPlants || 0}</p>
              <p className="text-sm text-muted-foreground">Total Plants</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-500">{status?.completed || 0}</p>
              <p className="text-sm text-muted-foreground">Completed</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-500">{status?.generating || 0}</p>
              <p className="text-sm text-muted-foreground">Generating</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-yellow-500">{status?.queued || 0}</p>
              <p className="text-sm text-muted-foreground">In Queue</p>
            </div>
          </div>

          {/* Missing Images Count */}
          {plants && (
            <div className="mb-4 p-3 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">
                <strong>{((plants as any[])?.filter((p: any) => !p.thumbnailImage && !p.fullImage && !p.detailImage).length || 0)}</strong> plants need images generated
              </p>
            </div>
          )}

          {/* Progress Bar */}
          {(status?.totalPlants ?? 0) > 0 && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Overall Progress</span>
                <span>{Math.round(((status?.completed ?? 0) / (status?.totalPlants ?? 1)) * 100)}%</span>
              </div>
              <Progress value={((status?.completed ?? 0) / (status?.totalPlants ?? 1)) * 100} className="h-2" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Queue Details */}
      <Card>
        <CardHeader>
          <CardTitle>Generation Queue</CardTitle>
        </CardHeader>
        <CardContent>
          {queue?.items && queue.items.length > 0 ? (
            <div className="space-y-3">
              {queue.items.map((item: any, index: number) => (
                <div key={`${item.id}-${index}`} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {getStatusBadge(item.status)}
                    <div>
                      <p className="font-medium">{item.plantName || item.plantId}</p>
                      <p className="text-sm text-muted-foreground">
                        {item.status === "generating" && item.progress && (
                          <>Generating image {item.progress.current} of {item.progress.total}</>
                        )}
                        {item.status === "queued" && <>Position in queue: {item.position}</>}
                        {item.status === "failed" && <>Error: {item.error}</>}
                        {item.status === "completed" && <>Completed at {new Date(item.completedAt).toLocaleTimeString()}</>}
                      </p>
                    </div>
                  </div>
                  
                  {item.status === "generating" && (
                    <div className="w-24">
                      <Progress value={(item.progress?.current / item.progress?.total) * 100} className="h-2" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <ImageIcon className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No plants in queue</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {status?.recentActivity?.map((activity: any, index: number) => (
              <div key={index} className="flex items-center gap-3 text-sm">
                {activity.type === "success" && <CheckCircle className="w-4 h-4 text-green-500" />}
                {activity.type === "error" && <XCircle className="w-4 h-4 text-red-500" />}
                {activity.type === "info" && <AlertCircle className="w-4 h-4 text-blue-500" />}
                <span className="flex-1">{activity.message}</span>
                <span className="text-muted-foreground text-xs">
                  {new Date(activity.timestamp).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}