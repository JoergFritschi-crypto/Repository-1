import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, ExternalLink, Phone, MapPin, FlaskConical, Calendar, DollarSign, Info, CheckCircle2, Beaker, ClipboardList } from "lucide-react";

interface SoilTestingModalProps {
  open: boolean;
  onClose: () => void;
  location: string;
}

interface SoilTestingProvider {
  name: string;
  type: 'commercial' | 'university' | 'government' | 'cooperative';
  services: string[];
  priceRange?: string;
  turnaroundTime?: string;
  website?: string;
  phone?: string;
  address?: string;
  specialNotes?: string;
}

interface SoilTestingData {
  providers: SoilTestingProvider[];
  samplingGuidance: {
    howToSample: string[];
    whatToRequest: string[];
    bestTimeToTest: string;
    frequency: string;
  };
  interpretation: {
    keyMetrics: string[];
    optimalRanges: any;
    commonAmendments: string[];
  };
}

export default function SoilTestingModal({ open, onClose, location }: SoilTestingModalProps) {
  const [activeTab, setActiveTab] = useState("providers");

  const { data, isLoading, error } = useQuery<SoilTestingData>({
    queryKey: ['/api/soil-testing-services', location],
    enabled: open && location.length > 3,
  });

  const getProviderTypeBadge = (type: string) => {
    const colors = {
      commercial: "bg-blue-100 text-blue-800",
      university: "bg-green-100 text-green-800",
      government: "bg-purple-100 text-purple-800",
      cooperative: "bg-orange-100 text-orange-800"
    };
    return colors[type as keyof typeof colors] || "bg-gray-100 text-gray-800";
  };

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FlaskConical className="w-5 h-5 text-primary" />
            Professional Soil Testing Services
          </DialogTitle>
          <DialogDescription>
            Find local soil testing laboratories and learn how to get your soil professionally analyzed for {location || 'your area'}
          </DialogDescription>
        </DialogHeader>

        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <span className="ml-3 text-sm text-muted-foreground">Finding soil testing services...</span>
          </div>
        )}

        {error && (
          <Alert className="mt-4" variant="destructive">
            <AlertTitle>Unable to find services</AlertTitle>
            <AlertDescription>
              We couldn't find soil testing services for your location. Please try again later or search manually for local agricultural extensions or soil laboratories.
            </AlertDescription>
          </Alert>
        )}

        {data && !isLoading && (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="providers">Providers</TabsTrigger>
              <TabsTrigger value="sampling">How to Sample</TabsTrigger>
              <TabsTrigger value="interpretation">Understanding Results</TabsTrigger>
              <TabsTrigger value="benefits">Why Test?</TabsTrigger>
            </TabsList>

            <ScrollArea className="h-[500px] mt-4">
              {/* Providers Tab */}
              <TabsContent value="providers" className="space-y-4 px-1">
                {data.providers.length === 0 ? (
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertTitle>No providers found</AlertTitle>
                    <AlertDescription>
                      We couldn't find specific providers for your area. Try searching for "soil testing {location}" or contact your local agricultural extension office.
                    </AlertDescription>
                  </Alert>
                ) : (
                  data.providers.map((provider, index) => (
                    <Card key={index} className="border-l-4" style={{ borderLeftColor: 'var(--primary)' }}>
                      <CardHeader className="pb-3">
                        <div className="flex justify-between items-start">
                          <CardTitle className="text-base">{provider.name}</CardTitle>
                          <Badge className={getProviderTypeBadge(provider.type)}>
                            {provider.type}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {provider.services && provider.services.length > 0 && (
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-1">Services Offered:</p>
                            <div className="flex flex-wrap gap-1">
                              {provider.services.map((service, idx) => (
                                <Badge key={idx} variant="outline" className="text-xs">
                                  {service}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          {provider.priceRange && (
                            <div className="flex items-center gap-2">
                              <DollarSign className="w-3 h-3 text-muted-foreground" />
                              <span className="text-xs">{provider.priceRange}</span>
                            </div>
                          )}
                          
                          {provider.turnaroundTime && (
                            <div className="flex items-center gap-2">
                              <Calendar className="w-3 h-3 text-muted-foreground" />
                              <span className="text-xs">{provider.turnaroundTime}</span>
                            </div>
                          )}
                        </div>

                        {provider.address && (
                          <div className="flex items-start gap-2">
                            <MapPin className="w-3 h-3 text-muted-foreground mt-0.5" />
                            <span className="text-xs text-muted-foreground">{provider.address}</span>
                          </div>
                        )}

                        <div className="flex gap-2 pt-2">
                          {provider.website && (
                            <Button size="sm" variant="outline" className="h-7 text-xs" asChild>
                              <a href={provider.website} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="w-3 h-3 mr-1" />
                                Visit Website
                              </a>
                            </Button>
                          )}
                          
                          {provider.phone && (
                            <Button size="sm" variant="outline" className="h-7 text-xs" asChild>
                              <a href={`tel:${provider.phone}`}>
                                <Phone className="w-3 h-3 mr-1" />
                                {provider.phone}
                              </a>
                            </Button>
                          )}
                        </div>

                        {provider.specialNotes && (
                          <Alert className="mt-2">
                            <Info className="h-3 w-3" />
                            <AlertDescription className="text-xs">
                              {provider.specialNotes}
                            </AlertDescription>
                          </Alert>
                        )}
                      </CardContent>
                    </Card>
                  ))
                )}
              </TabsContent>

              {/* Sampling Tab */}
              <TabsContent value="sampling" className="space-y-4 px-1">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Beaker className="w-4 h-4" />
                      How to Collect Soil Samples
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {data.samplingGuidance.howToSample.map((step, index) => (
                      <div key={index} className="flex gap-3">
                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold">
                          {index + 1}
                        </div>
                        <p className="text-sm">{step}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <ClipboardList className="w-4 h-4" />
                      What Tests to Request
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {data.samplingGuidance.whatToRequest.map((test, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                          <span className="text-sm">{test}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Best Time to Test</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">{data.samplingGuidance.bestTimeToTest}</p>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Testing Frequency</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">{data.samplingGuidance.frequency}</p>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Interpretation Tab */}
              <TabsContent value="interpretation" className="space-y-4 px-1">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Key Metrics to Understand</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {data.interpretation.keyMetrics.map((metric, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                          <span className="text-sm">{metric}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                {data.interpretation.optimalRanges && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Optimal Ranges for Ornamental Gardens</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {Object.entries(data.interpretation.optimalRanges).map(([key, value]) => (
                          <div key={key} className="flex justify-between text-sm">
                            <span className="font-medium capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}:</span>
                            <span className="text-muted-foreground">{String(value)}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Common Soil Amendments</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {data.interpretation.commonAmendments.map((amendment, index) => (
                        <li key={index} className="text-sm">• {amendment}</li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Benefits Tab */}
              <TabsContent value="benefits" className="space-y-4 px-1">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Why Professional Soil Testing Matters</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-3">
                      <div>
                        <h4 className="font-semibold text-sm mb-1">💰 Save Money</h4>
                        <p className="text-sm text-muted-foreground">
                          Stop wasting money on unnecessary fertilizers and amendments. Know exactly what your soil needs.
                        </p>
                      </div>
                      
                      <div>
                        <h4 className="font-semibold text-sm mb-1">🌱 Healthier Plants</h4>
                        <p className="text-sm text-muted-foreground">
                          Plants thrive when soil conditions are optimized. Proper nutrient balance leads to stronger, more disease-resistant plants.
                        </p>
                      </div>
                      
                      <div>
                        <h4 className="font-semibold text-sm mb-1">🎯 Targeted Solutions</h4>
                        <p className="text-sm text-muted-foreground">
                          Address specific deficiencies rather than guessing. Get customized recommendations for your exact soil conditions.
                        </p>
                      </div>
                      
                      <div>
                        <h4 className="font-semibold text-sm mb-1">🌍 Environmental Protection</h4>
                        <p className="text-sm text-muted-foreground">
                          Avoid over-fertilization that can harm waterways and beneficial soil organisms.
                        </p>
                      </div>
                      
                      <div>
                        <h4 className="font-semibold text-sm mb-1">📈 Track Progress</h4>
                        <p className="text-sm text-muted-foreground">
                          Regular testing helps you see how your soil improves over time with proper management.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Alert className="border-green-200 bg-green-50">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertTitle className="text-green-900">Investment That Pays Off</AlertTitle>
                  <AlertDescription className="text-green-800">
                    A professional soil test typically costs between $50-100 but can save hundreds in failed plants and unnecessary products. 
                    For serious gardeners, it's one of the best investments you can make.
                  </AlertDescription>
                </Alert>
              </TabsContent>
            </ScrollArea>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}