import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import Navigation from "@/components/layout/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Stethoscope, 
  Camera, 
  Upload, 
  Leaf, 
  Bug, 
  AlertTriangle, 
  CheckCircle,
  Clock,
  Crown,
  ChevronRight
} from "lucide-react";

export default function PlantDoctor() {
  const [activeService, setActiveService] = useState<"identification" | "disease" | "weed">("identification");
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [additionalNotes, setAdditionalNotes] = useState("");
  const { toast } = useToast();

  const { data: sessions = [], isLoading: sessionsLoading } = useQuery<any[]>({
    queryKey: ["/api/plant-doctor/sessions"],
  });

  const identificationMutation = useMutation({
    mutationFn: async (data: { imageUrl?: string; sessionType: string; notes?: string }) => {
      const response = await apiRequest("POST", "/api/plant-doctor/identify", data);
      return response.json();
    },
    onSuccess: (result) => {
      toast({
        title: "Analysis Complete",
        description: "Your plant has been analyzed successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/plant-doctor/sessions"] });
      setSelectedImage(null);
      setImagePreview(null);
      setAdditionalNotes("");
    },
    onError: (error) => {
      toast({
        title: "Analysis Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onload = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAnalyze = () => {
    if (!selectedImage) {
      toast({
        title: "No Image Selected",
        description: "Please select an image to analyze.",
        variant: "destructive",
      });
      return;
    }

    // In a real implementation, we would upload the image first
    // For now, we'll simulate the API call
    identificationMutation.mutate({
      sessionType: activeService,
      notes: additionalNotes,
    });
  };

  const serviceConfig = {
    identification: {
      title: "Plant Identification",
      description: "Upload a photo to identify any plant species",
      icon: Leaf,
      color: "text-accent",
      bgColor: "bg-accent",
    },
    disease: {
      title: "Disease Diagnosis",
      description: "Identify plant diseases and get treatment advice",
      icon: AlertTriangle,
      color: "text-destructive",
      bgColor: "bg-destructive",
    },
    weed: {
      title: "Weed Identification",
      description: "Identify weeds and get removal strategies",
      icon: Bug,
      color: "text-secondary",
      bgColor: "bg-secondary",
    },
  };

  const currentService = serviceConfig[activeService];

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header - Compact */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-serif font-semibold text-[#004025] mb-2" data-testid="text-plant-doctor-title">
            <Stethoscope className="w-7 h-7 inline mr-2 text-[#004025]" />
            Plant Doctor
          </h1>
          <p className="text-sm text-muted-foreground max-w-2xl mx-auto" data-testid="text-plant-doctor-subtitle">
            AI-powered plant identification and health diagnosis
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Service Selection */}
          <div className="lg:col-span-1 space-y-6">
            <Card className="border-2 border-[#004025]">
              <CardHeader className="py-4">
                <CardTitle className="text-lg">Select Service</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 pt-0">
                {(Object.entries(serviceConfig) as [keyof typeof serviceConfig, typeof serviceConfig[keyof typeof serviceConfig]][]).map(([key, config]) => {
                  const Icon = config.icon;
                  return (
                    <div
                      key={key}
                      className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                        activeService === key
                          ? "border-[#004025] bg-[#004025]/10"
                          : "border-[#004025]/30 hover:border-[#004025]"
                      }`}
                      onClick={() => setActiveService(key)}
                      data-testid={`service-${key}`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-[#004025]/10 rounded-full flex items-center justify-center border-2 border-[#004025]">
                          <Icon className="w-5 h-5 text-[#004025]" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-medium text-sm">{config.title}</h3>
                          <p className="text-xs text-muted-foreground">{config.description}</p>
                        </div>
                        {activeService === key && (
                          <CheckCircle className="w-4 h-4 text-[#004025]" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* Premium Features */}
            <Card className="border-2 border-[#004025] bg-[#004025]/5">
              <CardContent className="pt-4">
                <div className="text-center">
                  <Crown className="w-6 h-6 text-[#004025] mx-auto mb-2" />
                  <h3 className="font-medium text-sm mb-2">Premium Plant Doctor</h3>
                  <div className="space-y-1 text-xs text-left mb-3">
                    <div className="flex items-center">
                      <CheckCircle className="w-3 h-3 text-[#004025] mr-1.5" />
                      <span>Advanced disease diagnosis</span>
                    </div>
                    <div className="flex items-center">
                      <CheckCircle className="w-3 h-3 text-[#004025] mr-1.5" />
                      <span>Treatment recommendations</span>
                    </div>
                    <div className="flex items-center">
                      <CheckCircle className="w-3 h-3 text-[#004025] mr-1.5" />
                      <span>Seasonal care guides</span>
                    </div>
                    <div className="flex items-center">
                      <CheckCircle className="w-3 h-3 text-[#004025] mr-1.5" />
                      <span>Expert consultation</span>
                    </div>
                  </div>
                  <Button variant="default" className="w-full" size="sm" data-testid="button-upgrade-plant-doctor">
                    Upgrade Now
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Interface */}
          <div className="lg:col-span-2">
            <Card className="border-2 border-[#004025]">
              <CardHeader className="py-4">
                <CardTitle className="flex items-center text-lg">
                  <currentService.icon className="w-5 h-5 mr-2 text-[#004025]" />
                  {currentService.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="upload" className="w-full">
                  <TabsList className="grid w-full grid-cols-2 h-9" data-testid="tabs-plant-doctor">
                    <TabsTrigger value="upload" className="text-xs" data-testid="tab-upload">Upload Image</TabsTrigger>
                    <TabsTrigger value="results" className="text-xs" data-testid="tab-results">Recent Results</TabsTrigger>
                  </TabsList>

                  <TabsContent value="upload" className="mt-4">
                    <div className="space-y-4">
                      {/* Image Upload */}
                      <div>
                        <label className="block text-xs font-medium mb-2">Plant Photo</label>
                        <div className="border-2 border-dashed border-[#004025]/50 rounded-lg p-6 text-center hover:border-[#004025] transition-colors cursor-pointer">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleImageSelect}
                            className="hidden"
                            id="image-upload"
                            data-testid="input-image-upload"
                          />
                          <label htmlFor="image-upload" className="cursor-pointer">
                            {imagePreview ? (
                              <div>
                                <img
                                  src={imagePreview}
                                  alt="Selected plant"
                                  className="max-w-sm mx-auto rounded-lg mb-4"
                                  data-testid="img-preview"
                                />
                                <p className="text-sm text-muted-foreground">Click to change image</p>
                              </div>
                            ) : (
                              <div>
                                <Upload className="w-10 h-10 text-[#004025]/50 mx-auto mb-3" />
                                <h4 className="font-medium text-sm mb-1">Upload Plant Photo</h4>
                                <p className="text-xs text-muted-foreground mb-3">
                                  Drag and drop or click to select a clear photo of your plant
                                </p>
                                <Button type="button" size="sm" variant="outline" data-testid="button-choose-file">
                                  Choose File
                                </Button>
                              </div>
                            )}
                          </label>
                        </div>
                      </div>

                      {/* Additional Notes */}
                      <div>
                        <label className="block text-xs font-medium mb-2">Additional Notes (Optional)</label>
                        <Textarea
                          placeholder="Describe any symptoms, location, or other relevant details..."
                          value={additionalNotes}
                          onChange={(e) => setAdditionalNotes(e.target.value)}
                          rows={3}
                          data-testid="textarea-additional-notes"
                        />
                      </div>

                      {/* Analyze Button */}
                      <Button
                        onClick={handleAnalyze}
                        disabled={!selectedImage || identificationMutation.isPending}
                        className="w-full"
                        size="default"
                        data-testid="button-analyze"
                      >
                        {identificationMutation.isPending ? (
                          <>
                            <Clock className="w-4 h-4 mr-2 animate-spin" />
                            Analyzing...
                          </>
                        ) : (
                          <>
                            <currentService.icon className="w-4 h-4 mr-2" />
                            Analyze Plant
                          </>
                        )}
                      </Button>
                    </div>
                  </TabsContent>

                  <TabsContent value="results" className="mt-4">
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <h3 className="font-medium text-sm" data-testid="text-recent-results">Recent Analysis Results</h3>
                        <Badge variant="secondary" data-testid="badge-session-count">
                          {sessions?.length || 0} sessions
                        </Badge>
                      </div>

                      {sessionsLoading ? (
                        <div className="text-center py-8" data-testid="loading-sessions">
                          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                          <p className="text-muted-foreground">Loading your analysis history...</p>
                        </div>
                      ) : sessions && (sessions as any[]).length > 0 ? (
                        <div className="space-y-4">
                          {sessions.slice(0, 5).map((session: any) => (
                            <div key={session.id} className="border-2 border-[#004025]/30 rounded-lg p-3 hover:border-[#004025] transition-all" data-testid={`session-${session.id}`}>
                              <div className="flex items-start space-x-4">
                                <div className="w-16 h-16 bg-muted rounded-lg flex-shrink-0 flex items-center justify-center">
                                  {session.imageUrl ? (
                                    <img src={session.imageUrl} alt="Plant" className="w-full h-full object-cover rounded-lg" />
                                  ) : (
                                    <Camera className="w-8 h-8 text-muted-foreground" />
                                  )}
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center justify-between mb-2">
                                    <Badge variant="outline" className="capitalize" data-testid={`badge-session-type-${session.id}`}>
                                      {session.sessionType}
                                    </Badge>
                                    <span className="text-sm text-muted-foreground">
                                      {new Date(session.createdAt).toLocaleDateString()}
                                    </span>
                                  </div>
                                  {session.aiAnalysis && (
                                    <div>
                                      <h4 className="font-medium mb-1" data-testid={`text-analysis-result-${session.id}`}>
                                        {session.aiAnalysis.identification || "Analysis Result"}
                                      </h4>
                                      <p className="text-sm text-muted-foreground mb-2">
                                        {session.aiAnalysis.description || "AI analysis completed"}
                                      </p>
                                      {session.confidence && (
                                        <div className="flex items-center">
                                          <span className="text-sm text-muted-foreground mr-2">Confidence:</span>
                                          <Badge 
                                            variant={session.confidence > 0.8 ? "default" : "secondary"}
                                            data-testid={`badge-confidence-${session.id}`}
                                          >
                                            {Math.round(session.confidence * 100)}%
                                          </Badge>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                                <Button variant="ghost" size="sm" data-testid={`button-view-session-${session.id}`}>
                                  <ChevronRight className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-12" data-testid="empty-sessions-state">
                          <Stethoscope className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                          <h3 className="text-xl font-semibold mb-2">No analysis history</h3>
                          <p className="text-muted-foreground mb-4">
                            Upload your first plant photo to get started with AI analysis
                          </p>
                          <Button variant="outline" data-testid="button-start-first-analysis">
                            Start First Analysis
                          </Button>
                        </div>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
