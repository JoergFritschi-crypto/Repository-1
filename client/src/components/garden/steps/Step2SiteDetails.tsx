import { memo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FormField, FormControl, FormDescription, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { AlertCircle } from 'lucide-react';
import GardenSketch from '@/components/garden/garden-sketch';
import PhotoUpload from '@/components/garden/photo-upload';
import type { Step2Props } from './types';

const Step2SiteDetails = memo(({
  form,
  hasUploadedPhotos,
  setHasUploadedPhotos,
  hasSetOrientation,
  setHasSetOrientation,
  analysis,
  setAnalysis,
  recommendedStyleIds,
  setRecommendedStyleIds,
}: Step2Props) => {
  const watchedShape = form.watch("shape");
  const watchedDimensions = form.watch("dimensions") || {};
  const watchedUnits = form.watch("units");
  const watchedSlopeDirection = form.watch("slopeDirection");
  const watchedSlopePercentage = form.watch("slopePercentage");
  const watchedUsdaZone = form.watch("usdaZone");
  const watchedRhsZone = form.watch("rhsZone");

  return (
    <div className="space-y-3">
      <Card className="border-2 border-primary shadow-sm" data-testid="step-site-details">
        <CardHeader className="py-7 flower-band-spring rounded-t-lg">
          <CardTitle className="text-base">Garden Details</CardTitle>
          <CardDescription>
            Define your garden's physical characteristics
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          {/* Units Selection */}
          <FormField
            control={form.control}
            name="units"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Measurement Units <span className="text-red-500">*</span></FormLabel>
                <FormControl>
                  <RadioGroup
                    value={field.value}
                    onValueChange={field.onChange}
                    className="flex flex-row gap-4"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="meters" id="meters" data-testid="radio-meters" />
                      <Label htmlFor="meters">Meters (Metric)</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="feet" id="feet" data-testid="radio-feet" />
                      <Label htmlFor="feet">Feet (Imperial)</Label>
                    </div>
                  </RadioGroup>
                </FormControl>
                <FormDescription className="text-xs">
                  Choose your preferred measurement system
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Garden Shape */}
          <FormField
            control={form.control}
            name="shape"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Garden Shape <span className="text-red-500">*</span></FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="select-shape">
                      <SelectValue placeholder="Select shape" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="rectangle">Rectangle</SelectItem>
                    <SelectItem value="square">Square</SelectItem>
                    <SelectItem value="circle">Circle</SelectItem>
                    <SelectItem value="oval">Oval</SelectItem>
                    <SelectItem value="triangle">Triangle</SelectItem>
                    <SelectItem value="l_shaped">L-Shaped</SelectItem>
                    <SelectItem value="r_shaped">R-Shaped (Reverse L)</SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription className="text-xs">
                  Select the shape that best matches your garden
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Dimension Inputs - Dynamic based on shape */}
          <div className="space-y-4">
            <h3 className="font-semibold">Dimensions ({watchedUnits || 'meters'})</h3>
            
            {['rectangle', 'oval'].includes(watchedShape) && (
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="dimensions.width"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Width ({watchedUnits}) <span className="text-red-500">*</span></FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="10" 
                          {...field} 
                          onChange={(e) => field.onChange(parseFloat(e.target.value))}
                          data-testid="input-dimension-width"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="dimensions.length"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Length ({watchedUnits}) <span className="text-red-500">*</span></FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="15" 
                          {...field} 
                          onChange={(e) => field.onChange(parseFloat(e.target.value))}
                          data-testid="input-dimension-length"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {watchedShape === 'square' && (
              <FormField
                control={form.control}
                name="dimensions.width"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Side Length ({watchedUnits}) <span className="text-red-500">*</span></FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="10" 
                        {...field} 
                        onChange={(e) => field.onChange(parseFloat(e.target.value))}
                        data-testid="input-dimension-side"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {watchedShape === 'circle' && (
              <FormField
                control={form.control}
                name="dimensions.radius"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Radius ({watchedUnits}) <span className="text-red-500">*</span></FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="5" 
                        {...field} 
                        onChange={(e) => field.onChange(parseFloat(e.target.value))}
                        data-testid="input-dimension-radius"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {watchedShape === 'triangle' && (
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="dimensions.base"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Base ({watchedUnits}) <span className="text-red-500">*</span></FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="12" 
                          {...field} 
                          onChange={(e) => field.onChange(parseFloat(e.target.value))}
                          data-testid="input-dimension-base"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="dimensions.height"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Height ({watchedUnits}) <span className="text-red-500">*</span></FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="8" 
                          {...field} 
                          onChange={(e) => field.onChange(parseFloat(e.target.value))}
                          data-testid="input-dimension-height"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {['l_shaped', 'r_shaped'].includes(watchedShape) && (
              <div>
                <p className="text-sm text-muted-foreground mb-3">
                  Define the main body and the cutout dimensions
                </p>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <FormField
                    control={form.control}
                    name="dimensions.mainLength"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Main Length ({watchedUnits}) <span className="text-red-500">*</span></FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="15" 
                            {...field} 
                            onChange={(e) => field.onChange(parseFloat(e.target.value))}
                            data-testid="input-dimension-main-length"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="dimensions.mainWidth"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Main Width ({watchedUnits}) <span className="text-red-500">*</span></FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="10" 
                            {...field} 
                            onChange={(e) => field.onChange(parseFloat(e.target.value))}
                            data-testid="input-dimension-main-width"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="dimensions.cutoutLength"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cutout Length ({watchedUnits}) <span className="text-red-500">*</span></FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="8" 
                            {...field} 
                            onChange={(e) => field.onChange(parseFloat(e.target.value))}
                            data-testid="input-dimension-cutout-length"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="dimensions.cutoutWidth"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cutout Width ({watchedUnits}) <span className="text-red-500">*</span></FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="5" 
                            {...field} 
                            onChange={(e) => field.onChange(parseFloat(e.target.value))}
                            data-testid="input-dimension-cutout-width"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Slope & Orientation */}
          <div className="space-y-4">
            <h3 className="font-semibold">Slope & Orientation</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="slopeDirection"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Slope Direction</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-slope-direction" className="bg-white dark:bg-card">
                          <SelectValue placeholder="Select direction" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="N">North</SelectItem>
                        <SelectItem value="NE">Northeast</SelectItem>
                        <SelectItem value="E">East</SelectItem>
                        <SelectItem value="SE">Southeast</SelectItem>
                        <SelectItem value="S">South</SelectItem>
                        <SelectItem value="SW">Southwest</SelectItem>
                        <SelectItem value="W">West</SelectItem>
                        <SelectItem value="NW">Northwest</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription className="text-xs">
                      Direction the slope faces
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="slopePercentage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Slope Percentage (%)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="0" 
                        min="0"
                        max="100"
                        {...field} 
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        data-testid="input-slope-percentage"
                        className="bg-white dark:bg-card"
                      />
                    </FormControl>
                    <FormDescription className="text-xs">
                      0% = flat, 100% = 45° angle
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Garden Sketch with rotatable rings */}
      <Card className="border-2 border-primary shadow-sm" data-testid="step-garden-sketch">
        <CardHeader className="py-7 flower-band-autumn rounded-t-lg">
          <CardTitle className="text-base">Garden Orientation & View <span className="text-red-500">*</span></CardTitle>
          <p className="text-sm text-gray-600 mt-1">Set north direction and viewing point using the interactive controls below</p>
        </CardHeader>
        <CardContent>
          <GardenSketch
            shape={watchedShape}
            dimensions={watchedDimensions}
            units={watchedUnits === 'feet' ? 'imperial' : 'metric'}
            slopeDirection={watchedSlopeDirection}
            slopePercentage={watchedSlopePercentage}
            usdaZone={watchedUsdaZone}
            rhsZone={watchedRhsZone}
            onOrientationChange={(isComplete) => setHasSetOrientation(isComplete)}
          />
        </CardContent>
      </Card>

      {/* Orientation Warning if not set */}
      {!hasSetOrientation && (
        <Card className="border-2 border-orange-400 bg-orange-50 shadow-sm">
          <CardContent className="py-4">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-accent mt-0.5 flex-shrink-0" />
              <div className="space-y-1">
                <p className="text-sm font-semibold text-primary">
                  Garden Orientation Not Set
                </p>
                <p className="text-sm text-primary/80">
                  Please set your garden's actual north direction and viewing point above. 
                  These are critical for accurate sun exposure calculations and proper plant placement in your design.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Photo Upload Section */}
      <PhotoUpload 
        maxPhotos={6}
        onPhotosChange={(photos) => {
          setHasUploadedPhotos(photos.length > 0);
          console.log(`Uploaded ${photos.length} photos`);
        }}
        gardenData={form.getValues()}
        onAnalysisComplete={(analysisData) => {
          console.log('Garden analysis complete', analysisData);
          setAnalysis(analysisData);
        }}
        onRecommendedStyles={(styleIds) => {
          console.log('Recommended styles:', styleIds);
          setRecommendedStyleIds(styleIds);
        }}
      />
    </div>
  );
});

Step2SiteDetails.displayName = 'Step2SiteDetails';

export default Step2SiteDetails;