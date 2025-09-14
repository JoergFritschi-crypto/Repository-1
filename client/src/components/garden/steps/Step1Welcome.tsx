import { memo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FormField, FormControl, FormDescription, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Thermometer, Beaker, MapPin, Sun, Cloud, CloudRain } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import ClimateReportModal from '@/components/garden/climate-report-modal';
import SoilTestingModal from '@/components/garden/soil-testing-modal';
import type { Step1Props } from './types';

const Step1Welcome = memo(({
  form,
  showClimateModal,
  setShowClimateModal,
  showSoilTestingModal,
  setShowSoilTestingModal,
  locationToFetch,
  setLocationToFetch,
  climateData,
  setClimateData,
}: Step1Props) => {
  const watchedCountry = form.watch("country");
  const watchedCity = form.watch("city");
  const watchedZipCode = form.watch("zipCode");

  return (
    <div className="space-y-3">
      {/* Climate Report Modal */}
      {showClimateModal && locationToFetch && (
        <ClimateReportModal
          isOpen={showClimateModal}
          onClose={() => setShowClimateModal(false)}
          location={locationToFetch}
          onClimateData={(data: any) => {
            setClimateData(data);
            if (data.zones) {
              if (data.zones.usda) form.setValue('usdaZone', data.zones.usda);
              if (data.zones.rhs) form.setValue('rhsZone', data.zones.rhs);
              if (data.zones.heat) form.setValue('heatZone', data.zones.heat);
            }
          }}
        />
      )}

      {/* Soil Testing Modal */}
      {showSoilTestingModal && (
        <SoilTestingModal
          isOpen={showSoilTestingModal}
          onClose={() => setShowSoilTestingModal(false)}
          onAnalysisComplete={(data: any) => {
            if (data) {
              form.setValue('hasSoilAnalysis', true);
              form.setValue('soilTestId', data.id);
              form.setValue('soilAnalysis', data.analysis);
              form.setValue('soilType', data.soilType || 'loam');
              form.setValue('soilPh', data.soilPh || 'neutral');
              toast({
                title: 'Soil Analysis Complete',
                description: 'Your soil test results have been saved'
              });
            }
          }}
        />
      )}

      <Card className="border-2 border-primary shadow-sm" data-testid="step-welcome">
        <CardHeader className="py-7 flower-band-summer rounded-t-lg">
          <CardTitle className="text-base">Welcome to Garden Design</CardTitle>
          <CardDescription>
            Let's create your perfect garden together
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Garden Name <span className="text-red-500">*</span></FormLabel>
                <FormControl>
                  <Input 
                    placeholder="My Dream Garden" 
                    {...field} 
                    data-testid="input-garden-name"
                  />
                </FormControl>
                <FormDescription className="text-xs">
                  Give your garden a memorable name
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="space-y-3">
            <h3 className="font-semibold flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Location
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>City</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="London" 
                        {...field} 
                        data-testid="input-city"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="zipCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Postal/Zip Code</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="SW1A 1AA" 
                        {...field} 
                        data-testid="input-zip"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="country"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Country</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-country">
                        <SelectValue placeholder="Select country" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="max-h-64 overflow-y-auto">
                      <SelectItem value="AF">Afghanistan</SelectItem>
                      <SelectItem value="AL">Albania</SelectItem>
                      <SelectItem value="DZ">Algeria</SelectItem>
                      <SelectItem value="AD">Andorra</SelectItem>
                      <SelectItem value="AO">Angola</SelectItem>
                      <SelectItem value="AG">Antigua and Barbuda</SelectItem>
                      <SelectItem value="AR">Argentina</SelectItem>
                      <SelectItem value="AM">Armenia</SelectItem>
                      <SelectItem value="AU">Australia</SelectItem>
                      <SelectItem value="AT">Austria</SelectItem>
                      <SelectItem value="AZ">Azerbaijan</SelectItem>
                      <SelectItem value="BS">Bahamas</SelectItem>
                      <SelectItem value="BH">Bahrain</SelectItem>
                      <SelectItem value="BD">Bangladesh</SelectItem>
                      <SelectItem value="BB">Barbados</SelectItem>
                      <SelectItem value="BY">Belarus</SelectItem>
                      <SelectItem value="BE">Belgium</SelectItem>
                      <SelectItem value="BZ">Belize</SelectItem>
                      <SelectItem value="BJ">Benin</SelectItem>
                      <SelectItem value="BT">Bhutan</SelectItem>
                      <SelectItem value="BO">Bolivia</SelectItem>
                      <SelectItem value="BA">Bosnia and Herzegovina</SelectItem>
                      <SelectItem value="BW">Botswana</SelectItem>
                      <SelectItem value="BR">Brazil</SelectItem>
                      <SelectItem value="BN">Brunei</SelectItem>
                      <SelectItem value="BG">Bulgaria</SelectItem>
                      <SelectItem value="BF">Burkina Faso</SelectItem>
                      <SelectItem value="BI">Burundi</SelectItem>
                      <SelectItem value="KH">Cambodia</SelectItem>
                      <SelectItem value="CM">Cameroon</SelectItem>
                      <SelectItem value="CA">Canada</SelectItem>
                      <SelectItem value="CV">Cape Verde</SelectItem>
                      <SelectItem value="CF">Central African Republic</SelectItem>
                      <SelectItem value="TD">Chad</SelectItem>
                      <SelectItem value="CL">Chile</SelectItem>
                      <SelectItem value="CN">China</SelectItem>
                      <SelectItem value="CO">Colombia</SelectItem>
                      <SelectItem value="KM">Comoros</SelectItem>
                      <SelectItem value="CG">Congo</SelectItem>
                      <SelectItem value="CR">Costa Rica</SelectItem>
                      <SelectItem value="HR">Croatia</SelectItem>
                      <SelectItem value="CU">Cuba</SelectItem>
                      <SelectItem value="CY">Cyprus</SelectItem>
                      <SelectItem value="CZ">Czech Republic</SelectItem>
                      <SelectItem value="DK">Denmark</SelectItem>
                      <SelectItem value="DJ">Djibouti</SelectItem>
                      <SelectItem value="DM">Dominica</SelectItem>
                      <SelectItem value="DO">Dominican Republic</SelectItem>
                      <SelectItem value="EC">Ecuador</SelectItem>
                      <SelectItem value="EG">Egypt</SelectItem>
                      <SelectItem value="SV">El Salvador</SelectItem>
                      <SelectItem value="GQ">Equatorial Guinea</SelectItem>
                      <SelectItem value="ER">Eritrea</SelectItem>
                      <SelectItem value="EE">Estonia</SelectItem>
                      <SelectItem value="ET">Ethiopia</SelectItem>
                      <SelectItem value="FJ">Fiji</SelectItem>
                      <SelectItem value="FI">Finland</SelectItem>
                      <SelectItem value="FR">France</SelectItem>
                      <SelectItem value="GA">Gabon</SelectItem>
                      <SelectItem value="GM">Gambia</SelectItem>
                      <SelectItem value="GE">Georgia</SelectItem>
                      <SelectItem value="DE">Germany</SelectItem>
                      <SelectItem value="GH">Ghana</SelectItem>
                      <SelectItem value="GR">Greece</SelectItem>
                      <SelectItem value="GD">Grenada</SelectItem>
                      <SelectItem value="GT">Guatemala</SelectItem>
                      <SelectItem value="GN">Guinea</SelectItem>
                      <SelectItem value="GW">Guinea-Bissau</SelectItem>
                      <SelectItem value="GY">Guyana</SelectItem>
                      <SelectItem value="HT">Haiti</SelectItem>
                      <SelectItem value="HN">Honduras</SelectItem>
                      <SelectItem value="HU">Hungary</SelectItem>
                      <SelectItem value="IS">Iceland</SelectItem>
                      <SelectItem value="IN">India</SelectItem>
                      <SelectItem value="ID">Indonesia</SelectItem>
                      <SelectItem value="IR">Iran</SelectItem>
                      <SelectItem value="IQ">Iraq</SelectItem>
                      <SelectItem value="IE">Ireland</SelectItem>
                      <SelectItem value="IL">Israel</SelectItem>
                      <SelectItem value="IT">Italy</SelectItem>
                      <SelectItem value="CI">Ivory Coast</SelectItem>
                      <SelectItem value="JM">Jamaica</SelectItem>
                      <SelectItem value="JP">Japan</SelectItem>
                      <SelectItem value="JO">Jordan</SelectItem>
                      <SelectItem value="KZ">Kazakhstan</SelectItem>
                      <SelectItem value="KE">Kenya</SelectItem>
                      <SelectItem value="KI">Kiribati</SelectItem>
                      <SelectItem value="KP">North Korea</SelectItem>
                      <SelectItem value="KR">South Korea</SelectItem>
                      <SelectItem value="KW">Kuwait</SelectItem>
                      <SelectItem value="KG">Kyrgyzstan</SelectItem>
                      <SelectItem value="LA">Laos</SelectItem>
                      <SelectItem value="LV">Latvia</SelectItem>
                      <SelectItem value="LB">Lebanon</SelectItem>
                      <SelectItem value="LS">Lesotho</SelectItem>
                      <SelectItem value="LR">Liberia</SelectItem>
                      <SelectItem value="LY">Libya</SelectItem>
                      <SelectItem value="LI">Liechtenstein</SelectItem>
                      <SelectItem value="LT">Lithuania</SelectItem>
                      <SelectItem value="LU">Luxembourg</SelectItem>
                      <SelectItem value="MG">Madagascar</SelectItem>
                      <SelectItem value="MW">Malawi</SelectItem>
                      <SelectItem value="MY">Malaysia</SelectItem>
                      <SelectItem value="MV">Maldives</SelectItem>
                      <SelectItem value="ML">Mali</SelectItem>
                      <SelectItem value="MT">Malta</SelectItem>
                      <SelectItem value="MH">Marshall Islands</SelectItem>
                      <SelectItem value="MR">Mauritania</SelectItem>
                      <SelectItem value="MU">Mauritius</SelectItem>
                      <SelectItem value="MX">Mexico</SelectItem>
                      <SelectItem value="FM">Micronesia</SelectItem>
                      <SelectItem value="MD">Moldova</SelectItem>
                      <SelectItem value="MC">Monaco</SelectItem>
                      <SelectItem value="MN">Mongolia</SelectItem>
                      <SelectItem value="ME">Montenegro</SelectItem>
                      <SelectItem value="MA">Morocco</SelectItem>
                      <SelectItem value="MZ">Mozambique</SelectItem>
                      <SelectItem value="MM">Myanmar</SelectItem>
                      <SelectItem value="NA">Namibia</SelectItem>
                      <SelectItem value="NR">Nauru</SelectItem>
                      <SelectItem value="NP">Nepal</SelectItem>
                      <SelectItem value="NL">Netherlands</SelectItem>
                      <SelectItem value="NZ">New Zealand</SelectItem>
                      <SelectItem value="NI">Nicaragua</SelectItem>
                      <SelectItem value="NE">Niger</SelectItem>
                      <SelectItem value="NG">Nigeria</SelectItem>
                      <SelectItem value="MK">North Macedonia</SelectItem>
                      <SelectItem value="NO">Norway</SelectItem>
                      <SelectItem value="OM">Oman</SelectItem>
                      <SelectItem value="PK">Pakistan</SelectItem>
                      <SelectItem value="PW">Palau</SelectItem>
                      <SelectItem value="PS">Palestine</SelectItem>
                      <SelectItem value="PA">Panama</SelectItem>
                      <SelectItem value="PG">Papua New Guinea</SelectItem>
                      <SelectItem value="PY">Paraguay</SelectItem>
                      <SelectItem value="PE">Peru</SelectItem>
                      <SelectItem value="PH">Philippines</SelectItem>
                      <SelectItem value="PL">Poland</SelectItem>
                      <SelectItem value="PT">Portugal</SelectItem>
                      <SelectItem value="QA">Qatar</SelectItem>
                      <SelectItem value="RO">Romania</SelectItem>
                      <SelectItem value="RU">Russia</SelectItem>
                      <SelectItem value="RW">Rwanda</SelectItem>
                      <SelectItem value="KN">Saint Kitts and Nevis</SelectItem>
                      <SelectItem value="LC">Saint Lucia</SelectItem>
                      <SelectItem value="VC">Saint Vincent and the Grenadines</SelectItem>
                      <SelectItem value="WS">Samoa</SelectItem>
                      <SelectItem value="SM">San Marino</SelectItem>
                      <SelectItem value="ST">Sao Tome and Principe</SelectItem>
                      <SelectItem value="SA">Saudi Arabia</SelectItem>
                      <SelectItem value="SN">Senegal</SelectItem>
                      <SelectItem value="RS">Serbia</SelectItem>
                      <SelectItem value="SC">Seychelles</SelectItem>
                      <SelectItem value="SL">Sierra Leone</SelectItem>
                      <SelectItem value="SG">Singapore</SelectItem>
                      <SelectItem value="SK">Slovakia</SelectItem>
                      <SelectItem value="SI">Slovenia</SelectItem>
                      <SelectItem value="SB">Solomon Islands</SelectItem>
                      <SelectItem value="SO">Somalia</SelectItem>
                      <SelectItem value="ZA">South Africa</SelectItem>
                      <SelectItem value="SS">South Sudan</SelectItem>
                      <SelectItem value="ES">Spain</SelectItem>
                      <SelectItem value="LK">Sri Lanka</SelectItem>
                      <SelectItem value="SD">Sudan</SelectItem>
                      <SelectItem value="SR">Suriname</SelectItem>
                      <SelectItem value="SE">Sweden</SelectItem>
                      <SelectItem value="CH">Switzerland</SelectItem>
                      <SelectItem value="SY">Syria</SelectItem>
                      <SelectItem value="TW">Taiwan</SelectItem>
                      <SelectItem value="TJ">Tajikistan</SelectItem>
                      <SelectItem value="TZ">Tanzania</SelectItem>
                      <SelectItem value="TH">Thailand</SelectItem>
                      <SelectItem value="TL">Timor-Leste</SelectItem>
                      <SelectItem value="TG">Togo</SelectItem>
                      <SelectItem value="TO">Tonga</SelectItem>
                      <SelectItem value="TT">Trinidad and Tobago</SelectItem>
                      <SelectItem value="TN">Tunisia</SelectItem>
                      <SelectItem value="TR">Turkey</SelectItem>
                      <SelectItem value="TM">Turkmenistan</SelectItem>
                      <SelectItem value="TV">Tuvalu</SelectItem>
                      <SelectItem value="UG">Uganda</SelectItem>
                      <SelectItem value="UA">Ukraine</SelectItem>
                      <SelectItem value="AE">United Arab Emirates</SelectItem>
                      <SelectItem value="GB">United Kingdom</SelectItem>
                      <SelectItem value="US">United States</SelectItem>
                      <SelectItem value="UY">Uruguay</SelectItem>
                      <SelectItem value="UZ">Uzbekistan</SelectItem>
                      <SelectItem value="VU">Vanuatu</SelectItem>
                      <SelectItem value="VA">Vatican City</SelectItem>
                      <SelectItem value="VE">Venezuela</SelectItem>
                      <SelectItem value="VN">Vietnam</SelectItem>
                      <SelectItem value="YE">Yemen</SelectItem>
                      <SelectItem value="ZM">Zambia</SelectItem>
                      <SelectItem value="ZW">Zimbabwe</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="button"
              variant="outline"
              onClick={() => {
                const city = form.getValues('city');
                const zipCode = form.getValues('zipCode');
                const country = form.getValues('country');
                if (city && country) {
                  const locationString = zipCode 
                    ? `${city}, ${zipCode}, ${country}`
                    : `${city}, ${country}`;
                  setLocationToFetch(locationString);
                  setShowClimateModal(true);
                } else {
                  toast({
                    title: 'Missing Information',
                    description: 'Please enter both city and country',
                    variant: 'destructive'
                  });
                }
              }}
              disabled={!watchedCity || !watchedCountry}
              className="w-full"
              data-testid="button-get-climate"
            >
              <Thermometer className="w-4 h-4 mr-2" />
              Get Climate Data
            </Button>

            <div className="space-y-4 mt-4">
              <div className="text-sm text-muted-foreground">
                Climate zones (auto-filled after getting climate data)
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="usdaZone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        USDA Hardiness Zone <span className="text-red-500">*</span>
                        <span className="text-xs text-muted-foreground ml-2">(at least one zone required)</span>
                      </FormLabel>
                      <Select 
                        onValueChange={(value) => {
                          field.onChange(value);
                          if (value) {
                            form.setValue("rhsZone", "");
                          }
                        }} 
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-usda-zone">
                            <SelectValue placeholder="Select zone" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="3a">Zone 3a (-40 to -35°F)</SelectItem>
                          <SelectItem value="3b">Zone 3b (-35 to -30°F)</SelectItem>
                          <SelectItem value="4a">Zone 4a (-30 to -25°F)</SelectItem>
                          <SelectItem value="4b">Zone 4b (-25 to -20°F)</SelectItem>
                          <SelectItem value="5a">Zone 5a (-20 to -15°F)</SelectItem>
                          <SelectItem value="5b">Zone 5b (-15 to -10°F)</SelectItem>
                          <SelectItem value="6a">Zone 6a (-10 to -5°F)</SelectItem>
                          <SelectItem value="6b">Zone 6b (-5 to 0°F)</SelectItem>
                          <SelectItem value="7a">Zone 7a (0 to 5°F)</SelectItem>
                          <SelectItem value="7b">Zone 7b (5 to 10°F)</SelectItem>
                          <SelectItem value="8a">Zone 8a (10 to 15°F)</SelectItem>
                          <SelectItem value="8b">Zone 8b (15 to 20°F)</SelectItem>
                          <SelectItem value="9a">Zone 9a (20 to 25°F)</SelectItem>
                          <SelectItem value="9b">Zone 9b (25 to 30°F)</SelectItem>
                          <SelectItem value="10a">Zone 10a (30 to 35°F)</SelectItem>
                          <SelectItem value="10b">Zone 10b (35 to 40°F)</SelectItem>
                          <SelectItem value="11">Zone 11 (Above 40°F)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription className="text-xs">
                        Primary cold hardiness zone
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="rhsZone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        RHS Hardiness Rating <span className="text-red-500">*</span>
                        <span className="text-xs text-muted-foreground ml-2">(at least one zone required)</span>
                      </FormLabel>
                      <Select 
                        onValueChange={(value) => {
                          field.onChange(value);
                          if (value) {
                            form.setValue("usdaZone", "");
                          }
                        }} 
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-rhs-zone">
                            <SelectValue placeholder="Select rating" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="H1">H1 - Tropical (Above 15°C)</SelectItem>
                          <SelectItem value="H2">H2 - Subtropical (10-15°C)</SelectItem>
                          <SelectItem value="H3">H3 - Warm temperate (5-10°C)</SelectItem>
                          <SelectItem value="H4">H4 - Cool temperate (-5 to 5°C)</SelectItem>
                          <SelectItem value="H5">H5 - Cold (-10 to -5°C)</SelectItem>
                          <SelectItem value="H6">H6 - Very cold (-15 to -10°C)</SelectItem>
                          <SelectItem value="H7">H7 - Extremely cold (Below -15°C)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription className="text-xs">
                        Temperature hardiness rating
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="heatZone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>AHS Heat Zone</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-heat-zone">
                          <SelectValue placeholder="Select heat zone" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="1">Zone 1 (Less than 1 day above 86°F)</SelectItem>
                        <SelectItem value="2">Zone 2 (1-7 days above 86°F)</SelectItem>
                        <SelectItem value="3">Zone 3 (8-14 days above 86°F)</SelectItem>
                        <SelectItem value="4">Zone 4 (15-30 days above 86°F)</SelectItem>
                        <SelectItem value="5">Zone 5 (31-45 days above 86°F)</SelectItem>
                        <SelectItem value="6">Zone 6 (46-60 days above 86°F)</SelectItem>
                        <SelectItem value="7">Zone 7 (61-90 days above 86°F)</SelectItem>
                        <SelectItem value="8">Zone 8 (91-120 days above 86°F)</SelectItem>
                        <SelectItem value="9">Zone 9 (121-150 days above 86°F)</SelectItem>
                        <SelectItem value="10">Zone 10 (151-180 days above 86°F)</SelectItem>
                        <SelectItem value="11">Zone 11 (181-210 days above 86°F)</SelectItem>
                        <SelectItem value="12">Zone 12 (More than 210 days above 86°F)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription className="text-xs">
                      American Horticultural Society heat tolerance zone
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          <FormField
            control={form.control}
            name="sunExposure"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Primary Sun Exposure <span className="text-red-500">*</span></FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="select-sun-exposure">
                      <SelectValue placeholder="Select sun exposure" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="full_sun">
                      <div className="flex items-center">
                        <Sun className="w-4 h-4 mr-2 text-amber-600" />
                        Full Sun (6+ hours)
                      </div>
                    </SelectItem>
                    <SelectItem value="partial_sun">
                      <div className="flex items-center">
                        <Sun className="w-4 h-4 mr-2 text-amber-500" />
                        Partial Sun (4-6 hours)
                      </div>
                    </SelectItem>
                    <SelectItem value="partial_shade">
                      <div className="flex items-center">
                        <Cloud className="w-4 h-4 mr-2 text-gray-400" />
                        Partial Shade (2-4 hours)
                      </div>
                    </SelectItem>
                    <SelectItem value="full_shade">
                      <div className="flex items-center">
                        <CloudRain className="w-4 h-4 mr-2 text-gray-600" />
                        Full Shade (Less than 2 hours)
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription className="text-xs">
                  Average daily sun exposure in your garden
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="space-y-4">
            <h3 className="font-semibold">Soil Information</h3>
            
            <FormField
              control={form.control}
              name="soilType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Soil Type <span className="text-red-500">*</span></FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-soil-type">
                        <SelectValue placeholder="Select soil type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="clay">Clay - Heavy, holds moisture</SelectItem>
                      <SelectItem value="sand">Sandy - Light, drains quickly</SelectItem>
                      <SelectItem value="loam">Loam - Ideal mix, well-balanced</SelectItem>
                      <SelectItem value="silt">Silt - Smooth, retains moisture</SelectItem>
                      <SelectItem value="chalk">Chalk - Alkaline, free-draining</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription className="text-xs">
                    Your garden's primary soil composition
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="soilPh"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Soil pH <span className="text-red-500">*</span></FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-soil-ph">
                        <SelectValue placeholder="Select pH level" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="acidic">Acidic (below 7.0)</SelectItem>
                      <SelectItem value="neutral">Neutral (around 7.0)</SelectItem>
                      <SelectItem value="alkaline">Alkaline (above 7.0)</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription className="text-xs">
                    General soil acidity level
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="hasSoilAnalysis"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      data-testid="checkbox-soil-analysis"
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>I have professional soil test results</FormLabel>
                    <FormDescription className="text-xs">
                      Check this if you have lab results from a soil testing service
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />

            {form.watch('hasSoilAnalysis') && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowSoilTestingModal(true)}
                className="w-full"
                data-testid="button-add-soil-test"
              >
                <Beaker className="w-4 h-4 mr-2" />
                Add Soil Test Results
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
});

Step1Welcome.displayName = 'Step1Welcome';

export default Step1Welcome;