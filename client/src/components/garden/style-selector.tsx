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

  // Track selected styles in current session
  const [selectedStyles, setSelectedStyles] = useState<string[]>(selectedStyle ? [selectedStyle] : []);
  
  // Get tier limits
  const getTierLimit = () => {
    switch(userTier) {
      case 'free': return 1;
      case 'pay_per_design': return 3;
      case 'premium': return 3;
      default: return 1;
    }
  };
  
  // Check if user can select this style based on tier
  const canSelectStyle = (styleId: string): { allowed: boolean; reason?: string } => {
    const tierLimit = getTierLimit();
    const totalGenerations = generationHistory?.total || 0;
    
    // Check if already selected
    if (selectedStyles.includes(styleId)) {
      return { allowed: true }; // Can deselect
    }
    
    // Check tier limits for new selection
    if (userTier === 'free') {
      if (selectedStyles.length >= 1) {
        return { 
          allowed: false, 
          reason: 'Free tier: 1 style limit. Upgrade for more options.' 
        };
      }
      if (totalGenerations >= 1) {
        return { 
          allowed: false, 
          reason: 'Free tier: You\'ve already generated your 1 design. Upgrade to continue.' 
        };
      }
    }
    
    if (userTier === 'pay_per_design' || userTier === 'premium') {
      if (selectedStyles.length >= 3) {
        return { 
          allowed: false, 
          reason: `You can select up to 3 styles. Deselect one to choose another.` 
        };
      }
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
      case 'low': return 'bg-primary/20 text-primary';
      case 'medium': return 'bg-accent/20 text-accent';
      case 'low-medium': return 'bg-secondary/20 text-secondary';
      case 'medium-high': return 'bg-accent/30 text-accent';
      case 'high': return 'bg-destructive/20 text-destructive';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Handle style selection/deselection
  const handleStyleSelect = (styleId: string) => {
    if (selectedStyles.includes(styleId)) {
      // Deselect
      setSelectedStyles(selectedStyles.filter(id => id !== styleId));
      if (selectedStyle === styleId) {
        onStyleSelect('');
      }
    } else {
      // Select
      const { allowed } = canSelectStyle(styleId);
      if (allowed) {
        if (userTier === 'free') {
          // Free users can only select one
          setSelectedStyles([styleId]);
          onStyleSelect(styleId);
        } else {
          // Pay/Premium can select up to 3
          const newSelection = [...selectedStyles, styleId];
          setSelectedStyles(newSelection);
          onStyleSelect(styleId); // Update the main selected style
        }
      }
    }
  };
  
  return (
    <div className="space-y-4">
      {/* Tier Information */}
      <Alert className="border-primary">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="text-sm">
          <strong className="capitalize">{userTier} Tier:</strong> {
            userTier === 'free' 
              ? 'You can select 1 style. Choose from Claude\'s recommendations or pick your own!'
              : userTier === 'pay_per_design'
              ? 'You can select up to 3 styles. Use Claude\'s recommendations or choose your own!'
              : 'You can select up to 3 styles. Mix and match as you like!'
          }
          {selectedStyles.length > 0 && (
            <span className="ml-2 font-medium">
              ({selectedStyles.length}/{getTierLimit()} selected)
            </span>
          )}
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
          const isSelected = selectedStyles.includes(style.id);
          const hasUsedStyle = (generationHistory?.byStyle?.[style.id] ?? 0) > 0;
          
          return (
            <Card 
              key={style.id}
              className={`relative transition-all ${
                isSelected 
                  ? 'border-2 border-primary shadow-lg' 
                  : allowed
                  ? 'hover:border-accent hover:shadow-md cursor-pointer'
                  : 'opacity-60 cursor-not-allowed'
              }`}
              onClick={() => allowed && handleStyleSelect(style.id)}
              data-testid={`style-card-${style.id}`}
            >
              {/* AI Recommendation Badge */}
              {recommendation && (
                <div className="absolute -top-2 -right-2 z-10">
                  <Badge className="bg-gradient-to-r from-primary to-accent text-white flex items-center gap-1">
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
                  <div className="p-2 bg-primary/10 rounded-lg border border-primary/30">
                    <p className="text-xs font-medium text-primary mb-1">
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
                        ? 'bg-primary hover:bg-primary/90' 
                        : ''
                    }`}
                    variant={isSelected ? "default" : "outline"}
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStyleSelect(style.id);
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
        <Alert className="border-primary bg-primary/10">
          <Sparkles className="h-4 w-4 text-primary" />
          <AlertDescription>
            <strong>Want unlimited designs?</strong> Upgrade to Premium for unlimited iterations on all styles, 
            plus exclusive features like advanced plant recommendations and seasonal planning.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}