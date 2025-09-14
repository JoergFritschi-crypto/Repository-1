import { memo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FormField, FormControl, FormDescription, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Wand2, PenTool, Sparkles, Lightbulb } from 'lucide-react';
import StyleSelector from '@/components/garden/style-selector';
import SafetyPreferences from '@/components/garden/safety-preferences';
import type { Step3Props } from './types';

const Step3DesignApproach = memo(({
  form,
  localDesignApproach,
  setLocalDesignApproach,
  selectedGardenStyle,
  setSelectedGardenStyle,
  generatedStyles,
  analysis,
}: Step3Props) => {
  const watchedDesignApproach = form.watch("design_approach");
  const watchedSelectedStyle = form.watch("selectedStyle");

  return (
    <div className="space-y-3">
      <Card className="border-2 border-primary shadow-sm" data-testid="step-design-approach">
        <CardHeader className="py-7 flower-band-sunset rounded-t-lg">
          <CardTitle className="text-base">Choose Your Design Approach</CardTitle>
          <CardDescription>
            Select how you'd like to create your garden design
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          {/* Design Approach Selection */}
          <FormField
            control={form.control}
            name="design_approach"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Design Method <span className="text-red-500">*</span></FormLabel>
                <FormControl>
                  <RadioGroup
                    value={field.value || localDesignApproach || undefined}
                    onValueChange={(value) => {
                      field.onChange(value);
                      setLocalDesignApproach(value as "ai" | "manual");
                    }}
                    className="space-y-4"
                  >
                    <div className="flex items-start space-x-3 p-4 border-2 border-primary/20 rounded-lg hover:border-primary/40 transition-colors cursor-pointer">
                      <RadioGroupItem value="ai" id="ai-design" className="mt-1" data-testid="radio-ai-design" />
                      <label htmlFor="ai-design" className="flex-1 cursor-pointer">
                        <div className="flex items-center gap-2 mb-1">
                          <Wand2 className="w-4 h-4 text-primary" />
                          <span className="font-semibold">AI-Generated Design</span>
                          <Badge variant="secondary" className="text-xs">Recommended</Badge>
                        </div>
                        <p className="text-sm text-gray-600">
                          Let our AI create a professional garden design based on your preferences, climate, and selected style. Perfect for beginners and those seeking expert guidance.
                        </p>
                      </label>
                    </div>
                    
                    <div className="flex items-start space-x-3 p-4 border-2 border-primary/20 rounded-lg hover:border-primary/40 transition-colors cursor-pointer">
                      <RadioGroupItem value="manual" id="manual-design" className="mt-1" data-testid="radio-manual-design" />
                      <label htmlFor="manual-design" className="flex-1 cursor-pointer">
                        <div className="flex items-center gap-2 mb-1">
                          <PenTool className="w-4 h-4 text-primary" />
                          <span className="font-semibold">Manual Design</span>
                        </div>
                        <p className="text-sm text-gray-600">
                          Create your garden from scratch using our interactive design canvas. Full creative control for experienced gardeners or those with specific visions.
                        </p>
                      </label>
                    </div>
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* AI Design Preferences - Only shown when AI is selected */}
          {(watchedDesignApproach === 'ai' || localDesignApproach === 'ai') && (
            <div className="space-y-4 pt-4 border-t">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                AI Design Preferences
              </h3>
              
              {/* Garden Style Selection */}
              <div className="space-y-2">
                <Label>Garden Style</Label>
                <StyleSelector
                  gardenStyles={generatedStyles}
                  selectedStyle={selectedGardenStyle || watchedSelectedStyle || ''}
                  onStyleSelect={(styleId) => {
                    setSelectedGardenStyle(styleId);
                    form.setValue('selectedStyle', styleId);
                  }}
                  analysisData={analysis}
                  showAIRecommendations={true}
                />
              </div>

              {/* Safety Preferences */}
              <div className="space-y-2">
                <Label>Safety & Accessibility</Label>
                <SafetyPreferences
                  form={form}
                  showAvailabilityPreference={true}
                />
              </div>

              {/* Spacing Preference */}
              <FormField
                control={form.control}
                name="spacingPreference"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Plant Spacing Preference</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value || 'balanced'}>
                      <FormControl>
                        <SelectTrigger data-testid="select-spacing">
                          <SelectValue placeholder="Select spacing preference" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="minimum">Minimum (Dense, lush garden)</SelectItem>
                        <SelectItem value="balanced">Balanced (Recommended spacing)</SelectItem>
                        <SelectItem value="maximum">Maximum (Open, spacious garden)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription className="text-xs">
                      How closely plants should be placed together
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          )}

          {/* Manual Design Info - Only shown when Manual is selected */}
          {(watchedDesignApproach === 'manual' || localDesignApproach === 'manual') && (
            <Alert className="mt-4">
              <Lightbulb className="h-4 w-4" />
              <AlertTitle>Manual Design Mode</AlertTitle>
              <AlertDescription>
                In the next step, you'll have access to our interactive garden canvas where you can:
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Search and browse our plant database</li>
                  <li>Drag and drop plants onto your garden</li>
                  <li>Arrange plants exactly as you envision</li>
                  <li>See real-time spacing and compatibility feedback</li>
                </ul>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
});

Step3DesignApproach.displayName = 'Step3DesignApproach';

export default Step3DesignApproach;