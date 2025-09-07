import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Sparkles, Wand2, Lock, CheckCircle2, AlertCircle, Star } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

interface GardenStyle {
  id: string;
  name: string;
  description: string;
  keyCharacteristics: string[];
  signaturePlants: string[];
  maintenanceLevel: string;
  suitableFor: string[];
  imageUrl?: string;
}

interface StyleSelectorProps {
  gardenStyles: GardenStyle[];
  selectedStyle: string | null;
  onStyleSelect: (styleId: string) => void;
  analysisData?: any; // Garden analysis from Claude
  showAIRecommendations?: boolean;
}

interface AIRecommendation {
  styleId: string;
  matchScore: number;
  reasoning: string;
  adaptations: string[];
}

export default function StyleSelector({
  gardenStyles,
  selectedStyle,
  onStyleSelect,
  analysisData,
  showAIRecommendations = true
}: StyleSelectorProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [aiRecommendations, setAiRecommendations] = useState<AIRecommendation[]>([]);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);
  
  const userTier = user?.userTier || 'free';

  // Fetch user's design generation history
  const { data: generationHistory } = useQuery<{
    total: number;
    byStyle: Record<string, number>;
  }>({
    queryKey: ['/api/garden-designs/generation-history'],
    enabled: !!user
  });

  // Check if user can select this style based on tier
  const canSelectStyle = (styleId: string): { allowed: boolean; reason?: string } => {
    if (!generationHistory) return { allowed: true };
    
    const totalGenerations = generationHistory.total || 0;
    const styleGenerations = generationHistory.byStyle?.[styleId] || 0;
    
    if (userTier === 'free' && totalGenerations >= 1) {
      return { 
        allowed: false, 
        reason: 'Free tier: 1 design limit reached. Upgrade to continue.' 
      };
    }
    
    if (userTier === 'pay_per_design' && styleGenerations >= 1) {
      return { 
        allowed: false, 
        reason: 'You\'ve already used this style. Try another or upgrade to premium.' 
      };
    }
    
    return { allowed: true };
  };

  // Get AI recommendations for best matching styles
  const getAIRecommendations = useMutation({
    mutationFn: async () => {
      if (!analysisData) return [];
      
      const response = await apiRequest('POST', '/api/garden-styles/recommendations', {
        analysisData,
        gardenStyles: gardenStyles.map(s => s.id)
      });
      
      return response.json();
    },
    onSuccess: (data: AIRecommendation[]) => {
      setAiRecommendations(data);
      toast({
        title: 'AI Recommendations Ready',
        description: `Claude has analyzed your garden and recommended ${data.length} styles`
      });
    },
    onError: () => {
      toast({
        title: 'Recommendation Failed',
        description: 'Unable to get AI recommendations. You can still choose manually.',
        variant: 'destructive'
      });
    }
  });

  // Auto-fetch recommendations if analysis data is available
  useEffect(() => {
    if (analysisData && showAIRecommendations && aiRecommendations.length === 0) {
      getAIRecommendations.mutate();
    }
  }, [analysisData, showAIRecommendations]);

  // Sort styles by AI recommendation score if available
  const sortedStyles = [...gardenStyles].sort((a, b) => {
    const recA = aiRecommendations.find(r => r.styleId === a.id);
    const recB = aiRecommendations.find(r => r.styleId === b.id);
    
    if (recA && recB) return recB.matchScore - recA.matchScore;
    if (recA) return -1;
    if (recB) return 1;
    return 0;
  });

  const getMaintenanceColor = (level: string) => {
    switch(level.toLowerCase()) {
      case 'low': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low-medium': return 'bg-lime-100 text-lime-800';
      case 'medium-high': return 'bg-orange-100 text-orange-800';
      case 'high': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-4">
      {/* Tier Information */}
      <Alert className={userTier === 'premium' ? 'border-purple-500' : 'border-blue-500'}>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="text-sm">
          <strong className="capitalize">{userTier} Tier:</strong> {
            userTier === 'free' 
              ? 'You can generate 1 design total. Choose wisely!'
              : userTier === 'pay_per_design'
              ? 'You can generate 1 design per style. Mix and match!'
              : 'Unlimited designs! Experiment with all styles freely.'
          }
        </AlertDescription>
      </Alert>

      {/* AI Recommendations Button */}
      {showAIRecommendations && analysisData && (
        <div className="flex justify-center">
          <Button
            onClick={() => getAIRecommendations.mutate()}
            disabled={getAIRecommendations.isPending}
            variant="outline"
            className="gap-2"
            data-testid="button-get-ai-recommendations"
          >
            <Wand2 className="w-4 h-4" />
            {getAIRecommendations.isPending 
              ? 'Getting AI Recommendations...' 
              : aiRecommendations.length > 0 
              ? 'Refresh AI Recommendations'
              : 'Get AI Style Recommendations'
            }
          </Button>
        </div>
      )}

      {/* Style Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sortedStyles.map((style) => {
          const { allowed, reason } = canSelectStyle(style.id);
          const recommendation = aiRecommendations.find(r => r.styleId === style.id);
          const isSelected = selectedStyle === style.id;
          const hasUsedStyle = (generationHistory?.byStyle?.[style.id] ?? 0) > 0;
          
          return (
            <Card 
              key={style.id}
              className={`relative transition-all ${
                isSelected 
                  ? 'border-2 border-purple-500 shadow-lg' 
                  : allowed
                  ? 'hover:border-purple-300 hover:shadow-md cursor-pointer'
                  : 'opacity-60 cursor-not-allowed'
              }`}
              onClick={() => allowed && !isSelected && onStyleSelect(style.id)}
              data-testid={`style-card-${style.id}`}
            >
              {/* AI Recommendation Badge */}
              {recommendation && (
                <div className="absolute -top-2 -right-2 z-10">
                  <Badge className="bg-gradient-to-r from-purple-600 to-pink-600 text-white flex items-center gap-1">
                    <Star className="w-3 h-3" />
                    {recommendation.matchScore}/10 Match
                  </Badge>
                </div>
              )}

              {/* Lock overlay for restricted styles */}
              {!allowed && (
                <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-20 flex items-center justify-center rounded-lg">
                  <div className="text-center p-4">
                    <Lock className="w-8 h-8 mx-auto mb-2 text-gray-500" />
                    <p className="text-sm font-medium text-gray-700">{reason}</p>
                  </div>
                </div>
              )}

              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    {style.name}
                    {isSelected && <CheckCircle2 className="w-4 h-4 text-purple-600" />}
                  </span>
                  {hasUsedStyle && userTier === 'pay_per_design' && (
                    <Badge variant="secondary" className="text-xs">Used</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  {style.description}
                </p>

                {/* AI Reasoning if available */}
                {recommendation && (
                  <div className="p-2 bg-purple-50 rounded-lg border border-purple-200">
                    <p className="text-xs font-medium text-purple-800 mb-1">
                      Why AI Recommends This:
                    </p>
                    <p className="text-xs text-purple-700">
                      {recommendation.reasoning}
                    </p>
                  </div>
                )}

                {/* Key Characteristics */}
                <div>
                  <p className="text-xs font-semibold mb-1">Key Features:</p>
                  <div className="flex flex-wrap gap-1">
                    {style.keyCharacteristics.slice(0, 3).map((char, i) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        {char}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Signature Plants */}
                <div>
                  <p className="text-xs font-semibold mb-1">Signature Plants:</p>
                  <div className="flex flex-wrap gap-1">
                    {style.signaturePlants.slice(0, 4).map((plant, i) => (
                      <span key={i} className="text-xs bg-green-50 px-2 py-0.5 rounded">
                        {plant}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Maintenance Level */}
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold">Maintenance:</span>
                  <Badge className={`text-xs ${getMaintenanceColor(style.maintenanceLevel)}`}>
                    {style.maintenanceLevel}
                  </Badge>
                </div>

                {/* Select Button */}
                {allowed && (
                  <Button
                    className={`w-full ${
                      isSelected 
                        ? 'bg-purple-600 hover:bg-purple-700' 
                        : ''
                    }`}
                    variant={isSelected ? "default" : "outline"}
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onStyleSelect(style.id);
                    }}
                    data-testid={`button-select-style-${style.id}`}
                  >
                    {isSelected ? '✓ Selected' : 'Select This Style'}
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Upgrade Prompt for Free/Pay-per-design users */}
      {userTier !== 'premium' && (
        <Alert className="border-purple-500 bg-purple-50">
          <Sparkles className="h-4 w-4 text-purple-600" />
          <AlertDescription>
            <strong>Want unlimited designs?</strong> Upgrade to Premium for unlimited iterations on all styles, 
            plus exclusive features like advanced plant recommendations and seasonal planning.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}