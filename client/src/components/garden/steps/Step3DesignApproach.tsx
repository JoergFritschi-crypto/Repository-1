import { memo } from 'react';
import { useTranslation } from 'react-i18next';
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

  const { t } = useTranslation();

  return (
    <div className="space-y-3">
      <Card className="border-2 border-primary shadow-sm" data-testid="step-design-approach">
        <CardHeader className="py-7 flower-band-sunset rounded-t-lg">
          <CardTitle className="text-base">{t('garden.workflow.step3.title')}</CardTitle>
          <CardDescription>
            {t('garden.workflow.step3.subtitle')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          {/* Design Approach Selection */}
          <FormField
            control={form.control}
            name="design_approach"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('garden.workflow.step3.designMethod.label')} <span className="text-red-500">*</span></FormLabel>
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
                          <span className="font-semibold">{t('garden.workflow.step3.designMethod.ai.title')}</span>
                          <Badge variant="secondary" className="text-xs">{t('garden.workflow.step3.designMethod.ai.recommended')}</Badge>
                        </div>
                        <p className="text-sm text-gray-600">
                          {t('garden.workflow.step3.designMethod.ai.description')}
                        </p>
                      </label>
                    </div>
                    
                    <div className="flex items-start space-x-3 p-4 border-2 border-primary/20 rounded-lg hover:border-primary/40 transition-colors cursor-pointer">
                      <RadioGroupItem value="manual" id="manual-design" className="mt-1" data-testid="radio-manual-design" />
                      <label htmlFor="manual-design" className="flex-1 cursor-pointer">
                        <div className="flex items-center gap-2 mb-1">
                          <PenTool className="w-4 h-4 text-primary" />
                          <span className="font-semibold">{t('garden.workflow.step3.designMethod.manual.title')}</span>
                        </div>
                        <p className="text-sm text-gray-600">
                          {t('garden.workflow.step3.designMethod.manual.description')}
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
                {t('garden.workflow.step3.aiPreferences.title')}
              </h3>
              
              {/* Garden Style Selection */}
              <div className="space-y-2">
                <Label>{t('garden.workflow.step3.aiPreferences.gardenStyle.label')}</Label>
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
                <Label>{t('garden.workflow.step3.aiPreferences.safety.label')}</Label>
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
                    <FormLabel>{t('garden.workflow.step3.aiPreferences.spacing.label')}</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value || 'balanced'}>
                      <FormControl>
                        <SelectTrigger data-testid="select-spacing">
                          <SelectValue placeholder={t('garden.workflow.step3.aiPreferences.spacing.placeholder')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="minimum">{t('garden.workflow.step3.aiPreferences.spacing.options.minimum')}</SelectItem>
                        <SelectItem value="balanced">{t('garden.workflow.step3.aiPreferences.spacing.options.balanced')}</SelectItem>
                        <SelectItem value="maximum">{t('garden.workflow.step3.aiPreferences.spacing.options.maximum')}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription className="text-xs">
                      {t('garden.workflow.step3.aiPreferences.spacing.description')}
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
              <AlertTitle>{t('garden.workflow.step3.manualMode.title')}</AlertTitle>
              <AlertDescription>
                {t('garden.workflow.step3.manualMode.description')}
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>{t('garden.workflow.step3.manualMode.features.search')}</li>
                  <li>{t('garden.workflow.step3.manualMode.features.dragDrop')}</li>
                  <li>{t('garden.workflow.step3.manualMode.features.arrange')}</li>
                  <li>{t('garden.workflow.step3.manualMode.features.feedback')}</li>
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