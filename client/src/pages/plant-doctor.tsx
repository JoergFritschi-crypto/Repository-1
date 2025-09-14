import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import Navigation from "@/components/layout/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { SkeletonList } from "@/components/ui/skeleton-table";
import { LoadingSpinner, LoadingSteps } from "@/components/ui/loading-spinner";
import { ErrorMessage, EmptyState } from "@/components/ui/error-message";
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
  const { t } = useTranslation();
  const [activeService, setActiveService] = useState<"identification" | "disease" | "weed">("identification");
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [additionalNotes, setAdditionalNotes] = useState("");
  const { toast } = useToast();

  const { data: sessions = [], isLoading: sessionsLoading, error: sessionsError } = useQuery<any[]>({
    queryKey: ["/api/plant-doctor/sessions"],
  });

  const identificationMutation = useMutation({
    mutationFn: async (data: { imageUrl?: string; sessionType: string; notes?: string }) => {
      const response = await apiRequest("POST", "/api/plant-doctor/identify", data);
      return response.json();
    },
    onSuccess: (result) => {
      toast({
        title: t('plants.doctor.analysisComplete'),
        description: t('plants.doctor.analysisSuccess'),
      });
      queryClient.invalidateQueries({ queryKey: ["/api/plant-doctor/sessions"] });
      setSelectedImage(null);
      setImagePreview(null);
      setAdditionalNotes("");
    },
    onError: (error) => {
      toast({
        title: t('plants.doctor.analysisFailed'),
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
        title: t('plants.doctor.noImageSelected'),
        description: t('plants.doctor.selectImagePrompt'),
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
      title: t('plants.doctor.identification.title'),
      description: t('plants.doctor.identification.description'),
      icon: Leaf,
      color: "text-accent",
      bgColor: "bg-accent",
    },
    disease: {
      title: t('plants.doctor.disease.title'),
      description: t('plants.doctor.disease.description'),
      icon: AlertTriangle,
      color: "text-destructive",
      bgColor: "bg-destructive",
    },
    weed: {
      title: t('plants.doctor.weed.title'),
      description: t('plants.doctor.weed.description'),
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
          <h1 className="text-2xl font-serif font-semibold text-primary mb-2" data-testid="text-plant-doctor-title">
            <Stethoscope className="w-7 h-7 inline mr-2 text-primary" />
            {t('plants.doctor.title')}
          </h1>
          <p className="text-sm text-muted-foreground max-w-2xl mx-auto" data-testid="text-plant-doctor-subtitle">
            {t('plants.doctor.subtitle')}
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Service Selection */}
          <div className="lg:col-span-1 space-y-6">
            <Card className="border-2 border-primary">
              <CardHeader className="py-4">
                <CardTitle className="text-lg">{t('plants.doctor.selectService')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 pt-0">
                {(Object.entries(serviceConfig) as [keyof typeof serviceConfig, typeof serviceConfig[keyof typeof serviceConfig]][]).map(([key, config]) => {
                  const Icon = config.icon;
                  return (
                    <div
                      key={key}
                      className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                        activeService === key
                          ? "border-primary bg-primary/10"
                          : "border-primary/30 hover:border-primary"
                      }`}
                      onClick={() => setActiveService(key)}
                      data-testid={`service-${key}`}
                    >
                      <div className="flex items-center space-x-3">
                        <Icon className="w-10 h-10 text-primary" />
                        <div className="flex-1">
                          <h3 className="font-medium text-sm">{config.title}</h3>
                          <p className="text-xs text-muted-foreground">{config.description}</p>
                        </div>
                        {activeService === key && (
                          <CheckCircle className="w-4 h-4 text-primary" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* Premium Features */}
            <Card className="border-2 border-primary bg-primary/5">
              <CardContent className="pt-4">
                <div className="text-center">
                  <Crown className="w-6 h-6 text-primary mx-auto mb-2" />
                  <h3 className="font-medium text-sm mb-2">{t('plants.doctor.premium.title')}</h3>
                  <div className="space-y-1 text-xs text-left mb-3">
                    <div className="flex items-center">
                      <CheckCircle className="w-3 h-3 text-primary mr-1.5" />
                      <span>{t('plants.doctor.premium.feature1')}</span>
                    </div>
                    <div className="flex items-center">
                      <CheckCircle className="w-3 h-3 text-primary mr-1.5" />
                      <span>{t('plants.doctor.premium.feature2')}</span>
                    </div>
                    <div className="flex items-center">
                      <CheckCircle className="w-3 h-3 text-primary mr-1.5" />
                      <span>{t('plants.doctor.premium.feature3')}</span>
                    </div>
                    <div className="flex items-center">
                      <CheckCircle className="w-3 h-3 text-primary mr-1.5" />
                      <span>{t('plants.doctor.premium.feature4')}</span>
                    </div>
                  </div>
                  <Button variant="default" className="w-full" size="sm" data-testid="button-upgrade-plant-doctor">
                    {t('plants.doctor.premium.upgrade')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Interface */}
          <div className="lg:col-span-2">
            <Card className="border-2 border-primary">
              <CardHeader className="py-4">
                <CardTitle className="flex items-center text-lg">
                  <currentService.icon className="w-5 h-5 mr-2 text-primary" />
                  {currentService.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="upload" className="w-full">
                  <TabsList className="grid w-full grid-cols-2 h-9" data-testid="tabs-plant-doctor">
                    <TabsTrigger value="upload" className="text-xs" data-testid="tab-upload">{t('plants.doctor.upload.title')}</TabsTrigger>
                    <TabsTrigger value="results" className="text-xs" data-testid="tab-results">{t('plants.doctor.results.title')}</TabsTrigger>
                  </TabsList>

                  <TabsContent value="upload" className="mt-4">
                    <div className="space-y-4">
                      {/* Image Upload */}
                      <div>
                        <label className="block text-xs font-medium mb-2">{t('plants.doctor.upload.photoLabel')}</label>
                        <div className="border-2 border-dashed border-primary/50 rounded-lg p-6 text-center hover:border-primary transition-colors cursor-pointer">
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
                                <p className="text-sm text-muted-foreground">{t('plants.doctor.upload.changeImage')}</p>
                              </div>
                            ) : (
                              <div>
                                <Upload className="w-10 h-10 text-primary/50 mx-auto mb-3" />
                                <h4 className="font-medium text-sm mb-1">{t('plants.doctor.upload.title')}</h4>
                                <p className="text-xs text-muted-foreground mb-3">
                                  {t('plants.doctor.upload.instructions')}
                                </p>
                                <Button type="button" size="sm" variant="outline" data-testid="button-choose-file">
                                  {t('plants.doctor.upload.chooseFile')}
                                </Button>
                              </div>
                            )}
                          </label>
                        </div>
                      </div>

                      {/* Additional Notes */}
                      <div>
                        <label className="block text-xs font-medium mb-2">{t('plants.doctor.upload.notesLabel')}</label>
                        <Textarea
                          placeholder={t('plants.doctor.upload.notesPlaceholder')}
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
                            <LoadingSpinner size="xs" />
                            <span className="ml-2">{t('plants.doctor.analyzing')}</span>
                          </>
                        ) : (
                          <>
                            <currentService.icon className="w-4 h-4 mr-2" />
                            {t('plants.doctor.analyzePlant')}
                          </>
                        )}
                      </Button>
                      
                      {/* Loading Steps */}
                      {identificationMutation.isPending && (
                        <LoadingSteps
                          steps={[
                            { label: t('plants.doctor.steps.preparing'), status: "completed" },
                            { label: t('plants.doctor.steps.analyzing'), status: "loading" },
                            { label: t('plants.doctor.steps.identifying'), status: "pending" },
                            { label: t('plants.doctor.steps.diagnosing'), status: "pending" }
                          ]}
                        />
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="results" className="mt-4">
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <h3 className="font-medium text-sm" data-testid="text-recent-results">{t('plants.doctor.results.title')}</h3>
                        <Badge variant="secondary" data-testid="badge-session-count">
                          {sessions?.length || 0} {t('plants.doctor.results.sessions')}
                        </Badge>
                      </div>

                      {sessionsLoading ? (
                        <SkeletonList count={3} showIcon={true} showActions={true} />
                      ) : sessionsError ? (
                        <ErrorMessage
                          title={t('plants.doctor.results.loadFailed')}
                          error={sessionsError}
                          onRetry={() => queryClient.invalidateQueries({ queryKey: ["/api/plant-doctor/sessions"] })}
                          variant="card"
                        />
                      ) : sessions && (sessions as any[]).length > 0 ? (
                        <div className="space-y-4">
                          {sessions.slice(0, 5).map((session: any) => (
                            <div key={session.id} className="border-2 border-primary/30 rounded-lg p-3 hover:border-primary transition-all" data-testid={`session-${session.id}`}>
                              <div className="flex items-start space-x-4">
                                <div className="w-16 h-16 rounded-lg flex-shrink-0 flex items-center justify-center">
                                  {session.imageUrl ? (
                                    <img src={session.imageUrl} alt="Plant" className="w-full h-full object-cover rounded-lg" />
                                  ) : (
                                    <Camera className="w-16 h-16 text-muted-foreground" />
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
                                        {session.aiAnalysis.identification || t('plants.doctor.results.analysisResult')}
                                      </h4>
                                      <p className="text-sm text-muted-foreground mb-2">
                                        {session.aiAnalysis.description || t('plants.doctor.results.analysisCompleted')}
                                      </p>
                                      {session.confidence && (
                                        <div className="flex items-center">
                                          <span className="text-sm text-muted-foreground mr-2">{t('plants.doctor.results.confidence')}:</span>
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
                        <EmptyState
                          title={t('plants.doctor.results.noHistory')}
                          message={t('plants.doctor.results.noHistoryMessage')}
                          icon={<Stethoscope className="w-8 h-8 text-muted-foreground" />}
                          action={{
                            label: t('plants.doctor.results.startFirst'),
                            onClick: () => document.getElementById('tab-upload')?.click()
                          }}
                        />
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
