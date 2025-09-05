import { useState, useEffect } from "react";
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
import ClimateReportModal from "@/components/garden/climate-report-modal";
import InteractiveCanvas from "@/components/garden/interactive-canvas";
import { GARDEN_STEPS } from "@/types/garden";
import { MapPin, ArrowLeft, ArrowRight, Thermometer, CloudSun } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { FormDescription } from "@/components/ui/form";
import flowerBand1 from "@/assets/flower-band-1.png";
import flowerBand2 from "@/assets/flower-band-2.png";
import flowerBand3 from "@/assets/flower-band-3.png";
import flowerBand4 from "@/assets/flower-band-4.png";
import flowerBand5 from "@/assets/flower-band-5.png";
import flowerBand6 from "@/assets/flower-band-6.png";
import flowerBand7 from "@/assets/flower-band-7.png";

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
  usdaZone: z.string().optional(),
  rhsZone: z.string().optional(),
  hardinessCategory: z.string().optional(),
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
  
  // Check if user is admin
  const { data: user } = useQuery({
    queryKey: ["/api/auth/user"],
  });
  
  const isAdmin = (user as any)?.isAdmin || false;

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

  // Manual climate report fetching
  const [shouldFetchClimate, setShouldFetchClimate] = useState(false);
  const [showClimateModal, setShowClimateModal] = useState(false);
  const locationToFetch = combinedLocation || watchedLocation || '';

  // Fetch climate data only when manually triggered
  const { data: climateData, isLoading: climateLoading, refetch: fetchClimate } = useQuery({
    queryKey: ["/api/climate", locationToFetch],
    enabled: shouldFetchClimate && locationToFetch.length > 3,
  });

  // Auto-fill form fields when climate data is loaded
  useEffect(() => {
    if (climateData) {
      // Auto-fill USDA zone if not already set
      if (!form.getValues("usdaZone") && (climateData as any)?.usda_zone) {
        form.setValue("usdaZone", (climateData as any).usda_zone);
      }
      // Auto-fill RHS zone if not already set
      if (!form.getValues("rhsZone") && (climateData as any)?.rhs_zone) {
        form.setValue("rhsZone", (climateData as any).rhs_zone);
      }
      // Auto-fill hardiness category if not already set (handle case mismatch)
      if (!form.getValues("hardinessCategory") && (climateData as any)?.hardiness_category) {
        const category = (climateData as any).hardiness_category;
        // Normalize to lowercase to match select options
        const normalizedCategory = category ? category.toLowerCase().replace(' ', '-') : '';
        form.setValue("hardinessCategory", normalizedCategory);
      }
    }
  }, [climateData, form]);

  // Handle manual climate fetch
  const handleFetchClimate = async () => {
    if (locationToFetch.length > 3) {
      // If we already have data, just show the modal
      if (climateData) {
        setShowClimateModal(true);
      } else {
        // Otherwise fetch the data first
        setShouldFetchClimate(true);
        const result = await fetchClimate();
        if (result.data) {
          setShowClimateModal(true);
        }
      }
    }
  };

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
    // Skip validation for admins
    if (!isAdmin) {
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
        {/* Progress Header - Compact with Flower Band */}
        <div className="mb-6">
          {/* Flower Band Background */}
          <div 
            className="relative overflow-hidden rounded-lg mb-4 shadow-sm border-2 border-[#004025]"
            style={{
              backgroundImage: `url(${
                currentStep === 1 ? flowerBand1 :
                currentStep === 2 ? flowerBand2 :
                currentStep === 3 ? flowerBand3 :
                currentStep === 4 ? flowerBand4 :
                currentStep === 5 ? flowerBand5 :
                currentStep === 6 ? flowerBand6 :
                flowerBand7
              })`,
              backgroundSize: 'cover',
              backgroundPosition: 'center center',
              backgroundRepeat: 'repeat-x',
              height: '100px'
            }}
          >
            <div className="absolute inset-0 bg-white/60" />
            <div className="relative z-10 flex justify-between items-center h-full px-6">
              <h1 className="text-3xl font-serif font-semibold text-[#004025] bg-white/80 px-4 py-2 rounded-md border-2 border-[#004025] shadow-sm" data-testid="text-garden-setup-title">
                Garden Setup
              </h1>
              <span className="text-sm font-medium px-3 py-1.5 bg-white/80 text-[#004025] rounded-md border-2 border-[#004025] shadow-sm" data-testid="text-step-counter">
                Step {currentStep} of 7
              </span>
            </div>
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
                  onClick={() => isAdmin && setCurrentStep(i + 1)}
                  className={`w-2 h-2 rounded-full transition-all duration-300 ${
                    isAdmin ? 'cursor-pointer hover:scale-150' : ''
                  } ${
                    i < currentStep 
                      ? 'bg-accent shadow-sm shadow-accent' 
                      : i === currentStep - 1 
                      ? 'bg-primary animate-pulse' 
                      : 'bg-border'
                  }`}
                  title={isAdmin ? `Jump to Step ${i + 1}` : ''}
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
                              <SelectContent className="bg-white border-2 border-[#004025]">
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
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger data-testid="select-country">
                                    <SelectValue placeholder="Select your country" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent className="bg-white border-2 border-[#004025] max-h-60">
                                  <SelectItem value="Afghanistan">Afghanistan</SelectItem>
                                  <SelectItem value="Albania">Albania</SelectItem>
                                  <SelectItem value="Algeria">Algeria</SelectItem>
                                  <SelectItem value="Andorra">Andorra</SelectItem>
                                  <SelectItem value="Angola">Angola</SelectItem>
                                  <SelectItem value="Antigua and Barbuda">Antigua and Barbuda</SelectItem>
                                  <SelectItem value="Argentina">Argentina</SelectItem>
                                  <SelectItem value="Armenia">Armenia</SelectItem>
                                  <SelectItem value="Australia">Australia</SelectItem>
                                  <SelectItem value="Austria">Austria</SelectItem>
                                  <SelectItem value="Azerbaijan">Azerbaijan</SelectItem>
                                  <SelectItem value="Bahamas">Bahamas</SelectItem>
                                  <SelectItem value="Bahrain">Bahrain</SelectItem>
                                  <SelectItem value="Bangladesh">Bangladesh</SelectItem>
                                  <SelectItem value="Barbados">Barbados</SelectItem>
                                  <SelectItem value="Belarus">Belarus</SelectItem>
                                  <SelectItem value="Belgium">Belgium</SelectItem>
                                  <SelectItem value="Belize">Belize</SelectItem>
                                  <SelectItem value="Benin">Benin</SelectItem>
                                  <SelectItem value="Bhutan">Bhutan</SelectItem>
                                  <SelectItem value="Bolivia">Bolivia</SelectItem>
                                  <SelectItem value="Bosnia and Herzegovina">Bosnia and Herzegovina</SelectItem>
                                  <SelectItem value="Botswana">Botswana</SelectItem>
                                  <SelectItem value="Brazil">Brazil</SelectItem>
                                  <SelectItem value="Brunei">Brunei</SelectItem>
                                  <SelectItem value="Bulgaria">Bulgaria</SelectItem>
                                  <SelectItem value="Burkina Faso">Burkina Faso</SelectItem>
                                  <SelectItem value="Burundi">Burundi</SelectItem>
                                  <SelectItem value="Cambodia">Cambodia</SelectItem>
                                  <SelectItem value="Cameroon">Cameroon</SelectItem>
                                  <SelectItem value="Canada">Canada</SelectItem>
                                  <SelectItem value="Cape Verde">Cape Verde</SelectItem>
                                  <SelectItem value="Central African Republic">Central African Republic</SelectItem>
                                  <SelectItem value="Chad">Chad</SelectItem>
                                  <SelectItem value="Chile">Chile</SelectItem>
                                  <SelectItem value="China">China</SelectItem>
                                  <SelectItem value="Colombia">Colombia</SelectItem>
                                  <SelectItem value="Comoros">Comoros</SelectItem>
                                  <SelectItem value="Congo">Congo</SelectItem>
                                  <SelectItem value="Costa Rica">Costa Rica</SelectItem>
                                  <SelectItem value="Croatia">Croatia</SelectItem>
                                  <SelectItem value="Cuba">Cuba</SelectItem>
                                  <SelectItem value="Cyprus">Cyprus</SelectItem>
                                  <SelectItem value="Czech Republic">Czech Republic</SelectItem>
                                  <SelectItem value="Denmark">Denmark</SelectItem>
                                  <SelectItem value="Djibouti">Djibouti</SelectItem>
                                  <SelectItem value="Dominica">Dominica</SelectItem>
                                  <SelectItem value="Dominican Republic">Dominican Republic</SelectItem>
                                  <SelectItem value="East Timor">East Timor</SelectItem>
                                  <SelectItem value="Ecuador">Ecuador</SelectItem>
                                  <SelectItem value="Egypt">Egypt</SelectItem>
                                  <SelectItem value="El Salvador">El Salvador</SelectItem>
                                  <SelectItem value="Equatorial Guinea">Equatorial Guinea</SelectItem>
                                  <SelectItem value="Eritrea">Eritrea</SelectItem>
                                  <SelectItem value="Estonia">Estonia</SelectItem>
                                  <SelectItem value="Ethiopia">Ethiopia</SelectItem>
                                  <SelectItem value="Fiji">Fiji</SelectItem>
                                  <SelectItem value="Finland">Finland</SelectItem>
                                  <SelectItem value="France">France</SelectItem>
                                  <SelectItem value="Gabon">Gabon</SelectItem>
                                  <SelectItem value="Gambia">Gambia</SelectItem>
                                  <SelectItem value="Georgia">Georgia</SelectItem>
                                  <SelectItem value="Germany">Germany</SelectItem>
                                  <SelectItem value="Ghana">Ghana</SelectItem>
                                  <SelectItem value="Greece">Greece</SelectItem>
                                  <SelectItem value="Grenada">Grenada</SelectItem>
                                  <SelectItem value="Guatemala">Guatemala</SelectItem>
                                  <SelectItem value="Guinea">Guinea</SelectItem>
                                  <SelectItem value="Guinea-Bissau">Guinea-Bissau</SelectItem>
                                  <SelectItem value="Guyana">Guyana</SelectItem>
                                  <SelectItem value="Haiti">Haiti</SelectItem>
                                  <SelectItem value="Honduras">Honduras</SelectItem>
                                  <SelectItem value="Hungary">Hungary</SelectItem>
                                  <SelectItem value="Iceland">Iceland</SelectItem>
                                  <SelectItem value="India">India</SelectItem>
                                  <SelectItem value="Indonesia">Indonesia</SelectItem>
                                  <SelectItem value="Iran">Iran</SelectItem>
                                  <SelectItem value="Iraq">Iraq</SelectItem>
                                  <SelectItem value="Ireland">Ireland</SelectItem>
                                  <SelectItem value="Israel">Israel</SelectItem>
                                  <SelectItem value="Italy">Italy</SelectItem>
                                  <SelectItem value="Jamaica">Jamaica</SelectItem>
                                  <SelectItem value="Japan">Japan</SelectItem>
                                  <SelectItem value="Jordan">Jordan</SelectItem>
                                  <SelectItem value="Kazakhstan">Kazakhstan</SelectItem>
                                  <SelectItem value="Kenya">Kenya</SelectItem>
                                  <SelectItem value="Kiribati">Kiribati</SelectItem>
                                  <SelectItem value="Kuwait">Kuwait</SelectItem>
                                  <SelectItem value="Kyrgyzstan">Kyrgyzstan</SelectItem>
                                  <SelectItem value="Laos">Laos</SelectItem>
                                  <SelectItem value="Latvia">Latvia</SelectItem>
                                  <SelectItem value="Lebanon">Lebanon</SelectItem>
                                  <SelectItem value="Lesotho">Lesotho</SelectItem>
                                  <SelectItem value="Liberia">Liberia</SelectItem>
                                  <SelectItem value="Libya">Libya</SelectItem>
                                  <SelectItem value="Liechtenstein">Liechtenstein</SelectItem>
                                  <SelectItem value="Lithuania">Lithuania</SelectItem>
                                  <SelectItem value="Luxembourg">Luxembourg</SelectItem>
                                  <SelectItem value="Macedonia">Macedonia</SelectItem>
                                  <SelectItem value="Madagascar">Madagascar</SelectItem>
                                  <SelectItem value="Malawi">Malawi</SelectItem>
                                  <SelectItem value="Malaysia">Malaysia</SelectItem>
                                  <SelectItem value="Maldives">Maldives</SelectItem>
                                  <SelectItem value="Mali">Mali</SelectItem>
                                  <SelectItem value="Malta">Malta</SelectItem>
                                  <SelectItem value="Marshall Islands">Marshall Islands</SelectItem>
                                  <SelectItem value="Mauritania">Mauritania</SelectItem>
                                  <SelectItem value="Mauritius">Mauritius</SelectItem>
                                  <SelectItem value="Mexico">Mexico</SelectItem>
                                  <SelectItem value="Micronesia">Micronesia</SelectItem>
                                  <SelectItem value="Moldova">Moldova</SelectItem>
                                  <SelectItem value="Monaco">Monaco</SelectItem>
                                  <SelectItem value="Mongolia">Mongolia</SelectItem>
                                  <SelectItem value="Montenegro">Montenegro</SelectItem>
                                  <SelectItem value="Morocco">Morocco</SelectItem>
                                  <SelectItem value="Mozambique">Mozambique</SelectItem>
                                  <SelectItem value="Myanmar">Myanmar</SelectItem>
                                  <SelectItem value="Namibia">Namibia</SelectItem>
                                  <SelectItem value="Nauru">Nauru</SelectItem>
                                  <SelectItem value="Nepal">Nepal</SelectItem>
                                  <SelectItem value="Netherlands">Netherlands</SelectItem>
                                  <SelectItem value="New Zealand">New Zealand</SelectItem>
                                  <SelectItem value="Nicaragua">Nicaragua</SelectItem>
                                  <SelectItem value="Niger">Niger</SelectItem>
                                  <SelectItem value="Nigeria">Nigeria</SelectItem>
                                  <SelectItem value="North Korea">North Korea</SelectItem>
                                  <SelectItem value="Norway">Norway</SelectItem>
                                  <SelectItem value="Oman">Oman</SelectItem>
                                  <SelectItem value="Pakistan">Pakistan</SelectItem>
                                  <SelectItem value="Palau">Palau</SelectItem>
                                  <SelectItem value="Palestine">Palestine</SelectItem>
                                  <SelectItem value="Panama">Panama</SelectItem>
                                  <SelectItem value="Papua New Guinea">Papua New Guinea</SelectItem>
                                  <SelectItem value="Paraguay">Paraguay</SelectItem>
                                  <SelectItem value="Peru">Peru</SelectItem>
                                  <SelectItem value="Philippines">Philippines</SelectItem>
                                  <SelectItem value="Poland">Poland</SelectItem>
                                  <SelectItem value="Portugal">Portugal</SelectItem>
                                  <SelectItem value="Qatar">Qatar</SelectItem>
                                  <SelectItem value="Romania">Romania</SelectItem>
                                  <SelectItem value="Russia">Russia</SelectItem>
                                  <SelectItem value="Rwanda">Rwanda</SelectItem>
                                  <SelectItem value="Saint Kitts and Nevis">Saint Kitts and Nevis</SelectItem>
                                  <SelectItem value="Saint Lucia">Saint Lucia</SelectItem>
                                  <SelectItem value="Saint Vincent and the Grenadines">Saint Vincent and the Grenadines</SelectItem>
                                  <SelectItem value="Samoa">Samoa</SelectItem>
                                  <SelectItem value="San Marino">San Marino</SelectItem>
                                  <SelectItem value="Sao Tome and Principe">Sao Tome and Principe</SelectItem>
                                  <SelectItem value="Saudi Arabia">Saudi Arabia</SelectItem>
                                  <SelectItem value="Senegal">Senegal</SelectItem>
                                  <SelectItem value="Serbia">Serbia</SelectItem>
                                  <SelectItem value="Seychelles">Seychelles</SelectItem>
                                  <SelectItem value="Sierra Leone">Sierra Leone</SelectItem>
                                  <SelectItem value="Singapore">Singapore</SelectItem>
                                  <SelectItem value="Slovakia">Slovakia</SelectItem>
                                  <SelectItem value="Slovenia">Slovenia</SelectItem>
                                  <SelectItem value="Solomon Islands">Solomon Islands</SelectItem>
                                  <SelectItem value="Somalia">Somalia</SelectItem>
                                  <SelectItem value="South Africa">South Africa</SelectItem>
                                  <SelectItem value="South Korea">South Korea</SelectItem>
                                  <SelectItem value="South Sudan">South Sudan</SelectItem>
                                  <SelectItem value="Spain">Spain</SelectItem>
                                  <SelectItem value="Sri Lanka">Sri Lanka</SelectItem>
                                  <SelectItem value="Sudan">Sudan</SelectItem>
                                  <SelectItem value="Suriname">Suriname</SelectItem>
                                  <SelectItem value="Swaziland">Swaziland</SelectItem>
                                  <SelectItem value="Sweden">Sweden</SelectItem>
                                  <SelectItem value="Switzerland">Switzerland</SelectItem>
                                  <SelectItem value="Syria">Syria</SelectItem>
                                  <SelectItem value="Taiwan">Taiwan</SelectItem>
                                  <SelectItem value="Tajikistan">Tajikistan</SelectItem>
                                  <SelectItem value="Tanzania">Tanzania</SelectItem>
                                  <SelectItem value="Thailand">Thailand</SelectItem>
                                  <SelectItem value="Togo">Togo</SelectItem>
                                  <SelectItem value="Tonga">Tonga</SelectItem>
                                  <SelectItem value="Trinidad and Tobago">Trinidad and Tobago</SelectItem>
                                  <SelectItem value="Tunisia">Tunisia</SelectItem>
                                  <SelectItem value="Turkey">Turkey</SelectItem>
                                  <SelectItem value="Turkmenistan">Turkmenistan</SelectItem>
                                  <SelectItem value="Tuvalu">Tuvalu</SelectItem>
                                  <SelectItem value="Uganda">Uganda</SelectItem>
                                  <SelectItem value="Ukraine">Ukraine</SelectItem>
                                  <SelectItem value="United Arab Emirates">United Arab Emirates</SelectItem>
                                  <SelectItem value="United Kingdom">United Kingdom</SelectItem>
                                  <SelectItem value="United States">United States</SelectItem>
                                  <SelectItem value="Uruguay">Uruguay</SelectItem>
                                  <SelectItem value="Uzbekistan">Uzbekistan</SelectItem>
                                  <SelectItem value="Vanuatu">Vanuatu</SelectItem>
                                  <SelectItem value="Vatican City">Vatican City</SelectItem>
                                  <SelectItem value="Venezuela">Venezuela</SelectItem>
                                  <SelectItem value="Vietnam">Vietnam</SelectItem>
                                  <SelectItem value="Yemen">Yemen</SelectItem>
                                  <SelectItem value="Zambia">Zambia</SelectItem>
                                  <SelectItem value="Zimbabwe">Zimbabwe</SelectItem>
                                </SelectContent>
                              </Select>
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

                      {/* Climate Report Button */}
                      {locationToFetch.length > 3 && (
                        <div className="pt-3 border-t">
                          <Button 
                            type="button" 
                            onClick={handleFetchClimate}
                            disabled={climateLoading}
                            variant="outline"
                            className="w-full"
                            data-testid="button-fetch-climate"
                          >
                            {climateLoading ? (
                              <>Loading Climate Data...</>
                            ) : (
                              <>
                                <CloudSun className="w-4 h-4 mr-2" />
                                Get Climate Report for {locationToFetch}
                              </>
                            )}
                          </Button>
                          
                          {/* Show success message if report is ready */}
                          {climateData && !showClimateModal && (
                            <div className="mt-2 text-sm text-green-600">
                              ✓ Climate report ready - Click button to view again
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Manual Hardiness Zone Selection */}
                <Card className="border-2 border-[#004025] shadow-sm" data-testid="step-hardiness-zones">
                  <CardHeader className="py-4">
                    <CardTitle className="flex items-center text-lg">
                      <Thermometer className="w-4 h-4 mr-2 text-[#004025]" />
                      Hardiness Zone Selection
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 pt-0">
                    <p className="text-xs text-muted-foreground">
                      Select your hardiness zone using one of the three systems below. Zones may be auto-filled if you provide location above.
                    </p>
                    
                    {/* Display current zones if any are set */}
                    {(form.watch("usdaZone") || form.watch("rhsZone") || form.watch("hardinessCategory")) && (
                      <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg text-sm">
                        <div className="font-medium text-green-800 dark:text-green-200 mb-2">Currently Selected:</div>
                        <div className="space-y-1 text-green-700 dark:text-green-300">
                          {form.watch("usdaZone") && <div>USDA Zone: {form.watch("usdaZone")}</div>}
                          {form.watch("rhsZone") && <div>RHS Rating: {form.watch("rhsZone")}</div>}
                          {form.watch("hardinessCategory") && <div>Category: {form.watch("hardinessCategory")}</div>}
                        </div>
                      </div>
                    )}
                    
                    {/* Zone Selection Tabs */}
                    <Tabs defaultValue="usda" className="w-full">
                      <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="usda">USDA Zone</TabsTrigger>
                        <TabsTrigger value="rhs">RHS Rating</TabsTrigger>
                        <TabsTrigger value="category">Category</TabsTrigger>
                      </TabsList>
                      
                      <TabsContent value="usda" className="space-y-4">
                        <FormField
                          control={form.control}
                          name="usdaZone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>USDA Hardiness Zone</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value || (climateData as any)?.usda_zone || ""} defaultValue={field.value || (climateData as any)?.usda_zone}>
                                <FormControl>
                                  <SelectTrigger data-testid="select-usda-zone">
                                    <SelectValue placeholder="Select your USDA zone" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="3a">Zone 3a (-40 to -37°C)</SelectItem>
                                  <SelectItem value="3b">Zone 3b (-37 to -34°C)</SelectItem>
                                  <SelectItem value="4a">Zone 4a (-34 to -32°C)</SelectItem>
                                  <SelectItem value="4b">Zone 4b (-32 to -29°C)</SelectItem>
                                  <SelectItem value="5a">Zone 5a (-29 to -26°C)</SelectItem>
                                  <SelectItem value="5b">Zone 5b (-26 to -23°C)</SelectItem>
                                  <SelectItem value="6a">Zone 6a (-23 to -21°C)</SelectItem>
                                  <SelectItem value="6b">Zone 6b (-21 to -18°C)</SelectItem>
                                  <SelectItem value="7a">Zone 7a (-18 to -15°C)</SelectItem>
                                  <SelectItem value="7b">Zone 7b (-15 to -12°C)</SelectItem>
                                  <SelectItem value="8a">Zone 8a (-12 to -9°C)</SelectItem>
                                  <SelectItem value="8b">Zone 8b (-9 to -7°C)</SelectItem>
                                  <SelectItem value="9a">Zone 9a (-7 to -4°C)</SelectItem>
                                  <SelectItem value="9b">Zone 9b (-4 to -1°C)</SelectItem>
                                  <SelectItem value="10a">Zone 10a (-1 to 2°C)</SelectItem>
                                  <SelectItem value="10b">Zone 10b (2 to 4°C)</SelectItem>
                                  <SelectItem value="11a">Zone 11a (4 to 7°C)</SelectItem>
                                  <SelectItem value="11b">Zone 11b (7 to 10°C)</SelectItem>
                                  <SelectItem value="12a">Zone 12a (10 to 12.8°C)</SelectItem>
                                  <SelectItem value="12b">Zone 12b (12.8 to 15.6°C)</SelectItem>
                                  <SelectItem value="13a">Zone 13a (15.6 to 18.3°C)</SelectItem>
                                  <SelectItem value="13b">Zone 13b (18.3 to 21.1°C)</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormDescription className="text-xs">
                                USDA zones are based on average annual minimum winter temperatures
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </TabsContent>
                      
                      <TabsContent value="rhs" className="space-y-4">
                        <FormField
                          control={form.control}
                          name="rhsZone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>RHS Hardiness Rating</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value || (climateData as any)?.rhs_zone || ""} defaultValue={field.value || (climateData as any)?.rhs_zone}>
                                <FormControl>
                                  <SelectTrigger data-testid="select-rhs-zone">
                                    <SelectValue placeholder="Select your RHS rating" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="H7">H7 - Very hardy (&lt; -20°C)</SelectItem>
                                  <SelectItem value="H6">H6 - Hardy everywhere (-20 to -15°C)</SelectItem>
                                  <SelectItem value="H5">H5 - Hardy in most places (-15 to -10°C)</SelectItem>
                                  <SelectItem value="H4">H4 - Hardy through most of UK (-10 to -5°C)</SelectItem>
                                  <SelectItem value="H3">H3 - Hardy in coastal/mild areas (-5 to 1°C)</SelectItem>
                                  <SelectItem value="H2">H2 - Tolerant of low temps (1 to 5°C)</SelectItem>
                                  <SelectItem value="H1c">H1c - Outside in summer (5 to 10°C)</SelectItem>
                                  <SelectItem value="H1b">H1b - Outside in summer (10 to 15°C)</SelectItem>
                                  <SelectItem value="H1a">H1a - Under glass all year (&gt;15°C)</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormDescription className="text-xs">
                                RHS ratings are UK-specific hardiness classifications
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </TabsContent>
                      
                      <TabsContent value="category" className="space-y-4">
                        <FormField
                          control={form.control}
                          name="hardinessCategory"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Hardiness Category</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value || (climateData as any)?.hardiness_category || ""} defaultValue={field.value || (climateData as any)?.hardiness_category}>
                                <FormControl>
                                  <SelectTrigger data-testid="select-hardiness-category">
                                    <SelectValue placeholder="Select hardiness category" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="very-hardy">Very Hardy - Survives extreme cold (&lt;-10°C)</SelectItem>
                                  <SelectItem value="hardy">Hardy - Tolerates normal frosts (-10 to -5°C)</SelectItem>
                                  <SelectItem value="half-hardy">Half Hardy - Survives light frost (-5 to 0°C)</SelectItem>
                                  <SelectItem value="tender">Tender - No frost tolerance (&gt;0°C)</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormDescription className="text-xs">
                                Simplified 4-tier classification for practical gardening
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>

                {/* Climate Report - shows when location is provided */}
                {combinedLocation && (
                  <Card className="border-2 border-[#004025] shadow-sm" data-testid="step-climate-report">
                    <CardHeader className="py-4">
                      <CardTitle className="flex items-center text-lg">
                        <CloudSun className="w-4 h-4 mr-2 text-[#004025]" />
                        Detailed Climate Report
                      </CardTitle>
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
                <CardHeader>
                  <CardTitle>Garden Shape & Dimensions</CardTitle>
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
                <CardHeader>
                  <CardTitle>Slope & Cardinal Direction</CardTitle>
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
                <CardHeader>
                  <CardTitle>Garden Layout Canvas</CardTitle>
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
                <CardHeader>
                  <CardTitle>Garden Design Approach</CardTitle>
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

        {/* Climate Report Modal */}
        <ClimateReportModal
          open={showClimateModal}
          onClose={() => setShowClimateModal(false)}
          location={locationToFetch}
          climateData={climateData}
        />
      </div>
    </div>
  );
}
