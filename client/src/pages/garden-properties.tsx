import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import Navigation from "@/components/layout/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import ProgressBar from "@/components/ui/progress-bar";
import ShapeSelector from "@/components/garden/shape-selector";
import ClimateReport from "@/components/garden/climate-report";
import InteractiveCanvas from "@/components/garden/interactive-canvas";
import { GARDEN_STEPS } from "@/types/garden";
import { MapPin, ArrowLeft, ArrowRight } from "lucide-react";
import flowerBorderImg from "@/assets/flower-border.png";

const gardenSchema = z.object({
  name: z.string().min(1, "Garden name is required"),
  location: z.string().optional(), // Combined location for API
  city: z.string().optional(),
  country: z.string().optional(),
  zipCode: z.string().optional(),
  units: z.enum(["metric", "imperial"]),
  shape: z.enum(["rectangle", "circle", "oval", "rhomboid", "l_shaped"]),
  dimensions: z.record(z.number()),
  slopePercentage: z.number().min(0).max(45).optional(),
  slopeDirection: z.enum(["N", "NE", "E", "SE", "S", "SW", "W", "NW"]).optional(),
  sunExposure: z.enum(["full_sun", "partial_sun", "partial_shade", "full_shade"]).optional(),
  soilType: z.enum(["clay", "loam", "sand", "silt", "chalk"]).optional(),
  soilPh: z.number().min(4).max(9).optional(),
  preferences: z.object({
    colors: z.array(z.string()).optional(),
    plantTypes: z.array(z.string()).optional(),
    bloomTimes: z.array(z.string()).optional(),
    petSafe: z.boolean().optional(),
    childSafe: z.boolean().optional(),
    noThorns: z.boolean().optional(),
    lowAllergen: z.boolean().optional(),
    fragrant: z.boolean().optional(),
    deerResistant: z.boolean().optional(),
    droughtTolerant: z.boolean().optional(),
  }).optional(),
  design_approach: z.enum(["ai", "manual", "hybrid"]).optional(),
});

type GardenFormData = z.infer<typeof gardenSchema>;

export default function GardenProperties() {
  const [currentStep, setCurrentStep] = useState(1);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const form = useForm<GardenFormData>({
    resolver: zodResolver(gardenSchema),
    defaultValues: {
      units: undefined, // No default - must be selected
      shape: "rectangle",
      dimensions: { length: 10, width: 8 },
      slopePercentage: 5,
      slopeDirection: "S",
      sunExposure: "full_sun",
      soilType: "loam",
      soilPh: 6.5,
      design_approach: "ai",
      preferences: {
        petSafe: false,
        childSafe: false,
        noThorns: false,
        lowAllergen: true,
        fragrant: true,
        colors: ["red", "yellow"],
        plantTypes: ["perennials", "hedges"],
        bloomTimes: ["spring", "summer"],
      },
    },
  });

  const watchedLocation = form.watch("location");
  const watchedCity = form.watch("city");
  const watchedCountry = form.watch("country");
  const watchedZipCode = form.watch("zipCode");

  // Combine location fields for API
  const combinedLocation = `${watchedCity || ''} ${watchedCountry || ''} ${watchedZipCode || ''}`.trim();

  // Fetch climate data when location changes
  const { data: climateData, isLoading: climateLoading } = useQuery({
    queryKey: ["/api/climate", combinedLocation || watchedLocation],
    enabled: !!(combinedLocation || watchedLocation) && ((combinedLocation || watchedLocation) || '').length > 3,
  });

  const createGardenMutation = useMutation({
    mutationFn: async (data: GardenFormData) => {
      const response = await apiRequest("POST", "/api/gardens", data);
      return response.json();
    },
    onSuccess: (garden) => {
      toast({
        title: "Garden Created",
        description: "Your garden has been created successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/gardens"] });
      setLocation(`/garden-design/${garden.id}`);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: GardenFormData) => {
    if (currentStep < 7) {
      setCurrentStep(currentStep + 1);
    } else {
      // Combine location fields before submission
      const submissionData = {
        ...data,
        location: combinedLocation || data.location || 'Not specified',
      };
      createGardenMutation.mutate(submissionData);
    }
  };

  const nextStep = () => {
    // Validate required fields for Step 1
    if (currentStep === 1) {
      const units = form.getValues('units');
      const name = form.getValues('name');
      if (!units || !name) {
        toast({
          title: "Required Fields",
          description: "Please select measurement units and enter a garden name.",
          variant: "destructive",
        });
        return;
      }
    }
    if (currentStep < 7) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const completedSteps = Math.min(currentStep - 1, 7);
  const progress = (completedSteps / 7) * 100;

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Progress Header - Compact */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-3">
            <h1 className="text-2xl font-serif font-semibold text-[#004025]" data-testid="text-garden-setup-title">
              Garden Setup
            </h1>
            <span className="text-xs font-medium px-2 py-1 bg-[#004025]/10 text-[#004025] rounded-md border border-[#004025]" data-testid="text-step-counter">
              Step {currentStep} of 7
            </span>
          </div>
          <ProgressBar value={progress} className="mb-3 h-1.5 border border-[#004025]" data-testid="progress-bar" />
          <div className="flex justify-between items-center">
            <p className="text-sm font-medium text-[#004025]" data-testid="text-current-step-title">
              {GARDEN_STEPS[currentStep - 1]?.title}
            </p>
            <div className="flex gap-1">
              {[...Array(7)].map((_, i) => (
                <div
                  key={i}
                  className={`w-2 h-2 rounded-full transition-all duration-300 ${
                    i < currentStep 
                      ? 'bg-accent shadow-sm shadow-accent' 
                      : i === currentStep - 1 
                      ? 'bg-primary animate-pulse' 
                      : 'bg-border'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            {/* Step 1: Location & Units */}
            {currentStep === 1 && (
              <div className="space-y-4">
                <Card className="border-2 border-[#004025] shadow-sm" data-testid="step-location-units">
                  <CardHeader className="py-4">
                    <CardTitle className="flex items-center text-lg">
                      <MapPin className="w-4 h-4 mr-2 text-[#004025]" />
                      Garden Setup & Location
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 pt-0">
                    {/* Measurement Units - Required */}
                    <FormField
                      control={form.control}
                      name="units"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-medium">
                            Measurement Units <span className="text-destructive">*</span>
                          </FormLabel>
                          <FormControl>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <SelectTrigger data-testid="select-units" className={`h-9 text-xs border-2 ${!field.value ? "border-destructive" : "border-[#004025]"}`}>
                                <SelectValue placeholder="Please select measurement units" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="metric">Metric (meters, centimeters)</SelectItem>
                                <SelectItem value="imperial">Imperial (feet, inches)</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <p className="text-xs text-muted-foreground">
                            ⚠️ Important: Units cannot be changed once this garden design is created
                          </p>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Garden Name - Required */}
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            Garden Name <span className="text-destructive">*</span>
                          </FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="My Beautiful Garden" 
                              {...field} 
                              data-testid="input-garden-name" 
                              className={!field.value ? "border-destructive" : ""}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Location Fields - Optional */}
                    <div className="space-y-4">
                      <h3 className="text-sm font-medium">Garden Location (Optional)</h3>
                      <p className="text-xs text-muted-foreground">
                        Providing location helps us determine your climate zone and give personalized recommendations
                      </p>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="city"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>City</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g., London" {...field} data-testid="input-city" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="country"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Country</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g., United Kingdom" {...field} data-testid="input-country" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={form.control}
                        name="zipCode"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Postal/Zip Code</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., SW1A 1AA" {...field} data-testid="input-zip-code" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Combined location field for API */}
                      <FormField
                        control={form.control}
                        name="location"
                        render={({ field }) => (
                          <FormItem className="hidden">
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Climate Report - moved from Step 5 */}
                {combinedLocation && (
                  <Card className="garden-card-frame" data-testid="step-climate-report">
                    <CardHeader>
                      <CardTitle>Climate Report & Hardiness Zone</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ClimateReport
                        location={combinedLocation}
                        climateData={climateData as any}
                        isLoading={climateLoading}
                      />
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {/* Step 2: Garden Shape */}
            {currentStep === 2 && (
              <Card className="garden-card-frame" data-testid="step-garden-shape">
                <CardHeader 
                  className="relative overflow-hidden h-[60px]"
                  style={{
                    backgroundImage: `url(${flowerBorderImg})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center center',
                    backgroundRepeat: 'repeat-x'
                  }}
                >
                  <div className="absolute inset-0 bg-white/90 backdrop-blur-sm" />
                  <CardTitle className="relative z-10">Garden Shape & Dimensions</CardTitle>
                </CardHeader>
                <CardContent>
                  <ShapeSelector
                    shape={form.watch("shape")}
                    dimensions={form.watch("dimensions")}
                    units={form.watch("units")}
                    onShapeChange={(shape) => form.setValue("shape", shape as any)}
                    onDimensionsChange={(dimensions) => form.setValue("dimensions", dimensions as any)}
                  />
                </CardContent>
              </Card>
            )}

            {/* Step 3: Slope & Direction */}
            {currentStep === 3 && (
              <Card className="garden-card-frame" data-testid="step-slope-direction">
                <CardHeader 
                  className="relative overflow-hidden h-[60px]"
                  style={{
                    backgroundImage: `url(${flowerBorderImg})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center center',
                    backgroundRepeat: 'repeat-x'
                  }}
                >
                  <div className="absolute inset-0 bg-white/90 backdrop-blur-sm" />
                  <CardTitle className="relative z-10">Slope & Cardinal Direction</CardTitle>
                </CardHeader>
                <CardContent className="space-y-8">
                  <FormField
                    control={form.control}
                    name="slopePercentage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Slope Percentage: {field.value}%</FormLabel>
                        <FormControl>
                          <Slider
                            min={0}
                            max={45}
                            step={1}
                            value={[field.value || 5]}
                            onValueChange={(value) => field.onChange(value[0])}
                            className="w-full"
                            data-testid="slider-slope"
                          />
                        </FormControl>
                        <div className="flex justify-between text-sm text-muted-foreground">
                          <span>0% (Flat)</span>
                          <span>45% (Steep)</span>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="slopeDirection"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Slope Direction</FormLabel>
                        <FormControl>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <SelectTrigger data-testid="select-slope-direction">
                              <SelectValue placeholder="Select direction" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="N">North (N)</SelectItem>
                              <SelectItem value="NE">Northeast (NE)</SelectItem>
                              <SelectItem value="E">East (E)</SelectItem>
                              <SelectItem value="SE">Southeast (SE)</SelectItem>
                              <SelectItem value="S">South (S)</SelectItem>
                              <SelectItem value="SW">Southwest (SW)</SelectItem>
                              <SelectItem value="W">West (W)</SelectItem>
                              <SelectItem value="NW">Northwest (NW)</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            )}

            {/* Step 4: Interactive Canvas */}
            {currentStep === 4 && (
              <Card className="garden-card-frame" data-testid="step-interactive-canvas">
                <CardHeader 
                  className="relative overflow-hidden h-[60px]"
                  style={{
                    backgroundImage: `url(${flowerBorderImg})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center center',
                    backgroundRepeat: 'repeat-x'
                  }}
                >
                  <div className="absolute inset-0 bg-white/90 backdrop-blur-sm" />
                  <CardTitle className="relative z-10">Garden Layout Canvas</CardTitle>
                </CardHeader>
                <CardContent>
                  <InteractiveCanvas
                    shape={form.watch("shape")}
                    dimensions={form.watch("dimensions")}
                    units={form.watch("units")}
                  />
                </CardContent>
              </Card>
            )}

            {/* Step 5: Design Approach */}
            {currentStep === 5 && (
              <Card className="garden-card-frame" data-testid="step-design-approach">
                <CardHeader 
                  className="relative overflow-hidden h-[60px]"
                  style={{
                    backgroundImage: `url(${flowerBorderImg})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center center',
                    backgroundRepeat: 'repeat-x'
                  }}
                >
                  <div className="absolute inset-0 bg-white/90 backdrop-blur-sm" />
                  <CardTitle className="relative z-10">Garden Design Approach</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <FormField
                    control={form.control}
                    name="design_approach"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>How would you like to design your garden?</FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            className="space-y-4"
                          >
                            <div className="flex items-start space-x-3">
                              <RadioGroupItem value="ai" id="ai" />
                              <div>
                                <Label htmlFor="ai" className="font-medium">
                                  AI-Powered Design
                                </Label>
                                <p className="text-sm text-muted-foreground">
                                  Let our AI create a beautiful garden design based on your preferences and climate
                                </p>
                              </div>
                            </div>
                            <div className="flex items-start space-x-3">
                              <RadioGroupItem value="manual" id="manual" />
                              <div>
                                <Label htmlFor="manual" className="font-medium">
                                  Manual Design
                                </Label>
                                <p className="text-sm text-muted-foreground">
                                  Design your garden yourself using our interactive canvas
                                </p>
                              </div>
                            </div>
                            <div className="flex items-start space-x-3">
                              <RadioGroupItem value="hybrid" id="hybrid" />
                              <div>
                                <Label htmlFor="hybrid" className="font-medium">
                                  Hybrid Approach
                                </Label>
                                <p className="text-sm text-muted-foreground">
                                  Start with AI suggestions and customize them to your liking
                                </p>
                              </div>
                            </div>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            )}

            {/* Step 6: Sun & Soil */}
            {currentStep === 6 && (
              <Card className="garden-card-frame" data-testid="step-sun-soil">
                <CardHeader>
                  <CardTitle>Sun Exposure & Soil Properties</CardTitle>
                </CardHeader>
                <CardContent className="space-y-8">
                  <FormField
                    control={form.control}
                    name="sunExposure"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Daily Sun Exposure</FormLabel>
                        <FormControl>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <SelectTrigger data-testid="select-sun-exposure">
                              <SelectValue placeholder="Select sun exposure" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="full_sun">Full Sun (6+ hours)</SelectItem>
                              <SelectItem value="partial_sun">Partial Sun (4-6 hours)</SelectItem>
                              <SelectItem value="partial_shade">Partial Shade (2-4 hours)</SelectItem>
                              <SelectItem value="full_shade">Full Shade (0-2 hours)</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="soilType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Soil Type</FormLabel>
                          <FormControl>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <SelectTrigger data-testid="select-soil-type">
                                <SelectValue placeholder="Select soil type" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="clay">Clay</SelectItem>
                                <SelectItem value="loam">Loam</SelectItem>
                                <SelectItem value="sand">Sand</SelectItem>
                                <SelectItem value="silt">Silt</SelectItem>
                                <SelectItem value="chalk">Chalk</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="soilPh"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Soil pH: {field.value?.toFixed(1)}</FormLabel>
                          <FormControl>
                            <Slider
                              min={4}
                              max={9}
                              step={0.1}
                              value={[field.value || 6.5]}
                              onValueChange={(value) => field.onChange(value[0])}
                              className="w-full"
                              data-testid="slider-soil-ph"
                            />
                          </FormControl>
                          <div className="flex justify-between text-sm text-muted-foreground">
                            <span>4.0 (Acidic)</span>
                            <span>9.0 (Alkaline)</span>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step 7: Plant Preferences */}
            {currentStep === 7 && (
              <Card className="garden-card-frame" data-testid="step-plant-preferences">
                <CardHeader>
                  <CardTitle>Plant Preferences</CardTitle>
                </CardHeader>
                <CardContent className="space-y-8">
                  <div>
                    <h3 className="font-semibold mb-4">Safety Considerations</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="preferences.petSafe"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                data-testid="checkbox-pet-safe"
                              />
                            </FormControl>
                            <FormLabel className="text-sm font-normal">
                              Pet-safe plants only
                            </FormLabel>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="preferences.childSafe"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                data-testid="checkbox-child-safe"
                              />
                            </FormControl>
                            <FormLabel className="text-sm font-normal">
                              Child-safe (non-toxic)
                            </FormLabel>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="preferences.noThorns"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                data-testid="checkbox-no-thorns"
                              />
                            </FormControl>
                            <FormLabel className="text-sm font-normal">
                              No thorny plants
                            </FormLabel>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="preferences.lowAllergen"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                data-testid="checkbox-low-allergen"
                              />
                            </FormControl>
                            <FormLabel className="text-sm font-normal">
                              Low allergen varieties
                            </FormLabel>
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <FormField
                    control={form.control}
                    name="design_approach"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Design Approach</FormLabel>
                        <FormControl>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <SelectTrigger data-testid="select-design-approach">
                              <SelectValue placeholder="Select approach" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="ai">Let AI design my garden</SelectItem>
                              <SelectItem value="manual">I'll design it myself</SelectItem>
                              <SelectItem value="hybrid">Hybrid (AI + manual)</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={prevStep}
                disabled={currentStep === 1}
                data-testid="button-previous"
              >
                <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
                Previous
              </Button>

              <Button
                type={currentStep === 7 ? "submit" : "button"}
                onClick={currentStep < 7 ? nextStep : undefined}
                disabled={createGardenMutation.isPending}
                variant={currentStep === 7 ? "default" : "default"}
                data-testid="button-next-or-create"
              >
                {createGardenMutation.isPending ? (
                  "Creating..."
                ) : currentStep === 7 ? (
                  "Generate Garden Design"
                ) : (
                  <>
                    Next
                    <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
