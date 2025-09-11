import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { FormField, FormControl, FormItem, FormLabel, FormDescription } from '@/components/ui/form';
import { Shield, AlertTriangle, Info, ShoppingCart, Globe } from 'lucide-react';

interface SafetyPreferencesProps {
  form: any;
  showAvailabilityPreference?: boolean;
}

export default function SafetyPreferences({ form, showAvailabilityPreference = true }: SafetyPreferencesProps) {
  return (
    <Card className="border-2 border-[#004025] bg-[#004025]/5 shadow-sm" data-testid="safety-preferences">
      <CardHeader className="py-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Shield className="w-4 h-4 text-[#004025]" />
          Safety & Plant Selection Preferences
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pt-0">
        {/* Toxicity Risk Level Selection */}
        <div className="space-y-3">
          <FormField
            control={form.control}
            name="preferences.toxicityLevel"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-semibold">
                  Plant Toxicity Risk Level (RHS Classification)
                </FormLabel>
                <FormDescription className="text-xs text-muted-foreground mb-2">
                  Select your preferred toxicity risk level for plants. Based on Royal Horticultural Society guidelines.
                </FormDescription>
                <FormControl>
                  <RadioGroup
                    value={field.value || 'none'}
                    onValueChange={field.onChange}
                    className="space-y-2"
                  >
                    <div className="flex items-start space-x-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50">
                      <RadioGroupItem value="none" id="none" />
                      <div className="flex-1">
                        <Label htmlFor="none" className="font-medium text-sm cursor-pointer">
                          No Restriction
                        </Label>
                        <p className="text-xs text-muted-foreground mt-1">
                          Include all plants regardless of toxicity level
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-3 p-3 rounded-lg border border-[#004025]/30 bg-[#004025]/10 hover:bg-[#004025]/15">
                      <RadioGroupItem value="low" id="low" />
                      <div className="flex-1">
                        <Label htmlFor="low" className="font-medium text-sm cursor-pointer flex items-center gap-2">
                          Low Risk Only
                          <span className="text-xs bg-[#FFD500] text-[#004025] px-2 py-0.5 rounded">Safest Option</span>
                        </Label>
                        <p className="text-xs text-muted-foreground mt-1">
                          Only plants with minimal toxicity risk. Suitable for households with small children and pets.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-3 p-3 rounded-lg border border-primary/40 bg-primary/15 hover:bg-primary/20">
                      <RadioGroupItem value="moderate" id="moderate" />
                      <div className="flex-1">
                        <Label htmlFor="moderate" className="font-medium text-sm cursor-pointer">
                          Low to Moderate Risk
                        </Label>
                        <p className="text-xs text-muted-foreground mt-1">
                          Includes plants with low to moderate toxicity. May cause mild reactions if ingested.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-3 p-3 rounded-lg border border-[#004025]/50 bg-[#004025]/20 hover:bg-[#004025]/30">
                      <RadioGroupItem value="all" id="all" />
                      <div className="flex-1">
                        <Label htmlFor="all" className="font-medium text-sm cursor-pointer">
                          All Risk Levels (With Warnings)
                        </Label>
                        <p className="text-xs text-muted-foreground mt-1">
                          Include all plants but clearly mark high-risk ones. For experienced gardeners.
                        </p>
                      </div>
                    </div>
                  </RadioGroup>
                </FormControl>
              </FormItem>
            )}
          />
        </div>

        {/* Important Safety Disclaimer */}
        <Alert className="border-primary/40 bg-primary/15">
          <AlertTriangle className="h-4 w-4 text-[#004025]" />
          <AlertDescription className="text-xs">
            <strong>Important Safety Notice:</strong> There is never zero risk with plants. Even "low risk" plants may cause reactions in sensitive individuals or specific pets. 
            For example, lilies are extremely toxic to cats despite being generally considered safe. Always research plants for your specific pets and family members. 
            This classification is a guide only - final responsibility lies with you to verify plant safety.
          </AlertDescription>
        </Alert>

        {/* Plant Availability Preference */}
        {showAvailabilityPreference && (
          <div className="space-y-3 pt-2">
            <FormField
              control={form.control}
              name="preferences.plantAvailability"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-semibold flex items-center gap-2">
                    <ShoppingCart className="w-4 h-4" />
                    Plant Availability Preference
                  </FormLabel>
                  <FormDescription className="text-xs text-muted-foreground mb-2">
                    Choose between common, easily available plants or include exotic, harder-to-find varieties.
                  </FormDescription>
                  <FormControl>
                    <RadioGroup
                      value={field.value || 'common'}
                      onValueChange={field.onChange}
                      className="space-y-2"
                    >
                      <div className="flex items-start space-x-3 p-3 rounded-lg border border-[#004025]/30 bg-[#004025]/10 hover:bg-[#004025]/15">
                        <RadioGroupItem value="common" id="common" />
                        <div className="flex-1">
                          <Label htmlFor="common" className="font-medium text-sm cursor-pointer flex items-center gap-2">
                            Common & Easy to Find
                            <span className="text-xs bg-[#FFD500] text-[#004025] px-2 py-0.5 rounded">Recommended</span>
                          </Label>
                          <p className="text-xs text-muted-foreground mt-1">
                            Popular plants readily available at most garden centers and nurseries. Easier to source and typically more affordable.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start space-x-3 p-3 rounded-lg border border-[#004025]/40 bg-[#004025]/15 hover:bg-[#004025]/20">
                        <RadioGroupItem value="mixed" id="mixed" />
                        <div className="flex-1">
                          <Label htmlFor="mixed" className="font-medium text-sm cursor-pointer">
                            Mix of Common & Specialty
                          </Label>
                          <p className="text-xs text-muted-foreground mt-1">
                            Mostly common plants with some interesting specialty varieties for focal points.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start space-x-3 p-3 rounded-lg border border-primary/50 bg-primary/20 hover:bg-primary/25">
                        <RadioGroupItem value="exotic" id="exotic" />
                        <div className="flex-1">
                          <Label htmlFor="exotic" className="font-medium text-sm cursor-pointer flex items-center gap-2">
                            Include Exotic & Rare
                            <Globe className="w-3 h-3 text-[#004025]" />
                          </Label>
                          <p className="text-xs text-muted-foreground mt-1">
                            Include unusual and hard-to-find plants. May require specialty suppliers or online ordering.
                          </p>
                        </div>
                      </div>
                    </RadioGroup>
                  </FormControl>
                </FormItem>
              )}
            />

            {/* Location-based availability note */}
            <Alert className="border-[#004025]/30 bg-[#004025]/10">
              <Info className="h-4 w-4 text-[#004025]" />
              <AlertDescription className="text-xs">
                <strong>Regional Note:</strong> Plant availability varies by location. What's common in one region may be exotic in another. 
                We'll try to account for your location when suggesting plants, but local availability should always be verified.
              </AlertDescription>
            </Alert>
          </div>
        )}
      </CardContent>
    </Card>
  );
}