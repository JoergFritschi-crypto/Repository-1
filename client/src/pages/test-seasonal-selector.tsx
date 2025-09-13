import { useState } from 'react';
import SeasonalDateSelector from '@/components/garden/seasonal-date-selector';
import { useToast } from '@/hooks/use-toast';

export default function TestSeasonalSelector() {
  const [selectedRange, setSelectedRange] = useState<{ start: number; end: number } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleDateRangeSelected = async (startDay: number, endDay: number) => {
    setIsLoading(true);
    setSelectedRange({ start: startDay, end: endDay });
    
    // Simulate API call
    toast({
      title: "Date Range Selected",
      description: `Selected days ${startDay} to ${endDay} for seasonal image generation`,
    });

    // Simulate loading
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsLoading(false);
    
    toast({
      title: "Test Complete",
      description: "Seasonal date selector is working correctly!",
    });
  };

  return (
    <div className="container mx-auto py-8 px-4 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-primary">Seasonal Date Selector Test</h1>
        <p className="text-muted-foreground">
          Testing the seasonal date selector component functionality
        </p>
      </div>

      <div className="max-w-4xl mx-auto">
        <SeasonalDateSelector
          onDateRangeSelected={handleDateRangeSelected}
          isLoading={isLoading}
          className="shadow-lg"
        />
      </div>

      {selectedRange && (
        <div className="max-w-4xl mx-auto">
          <div className="bg-muted/50 rounded-lg p-4 text-center">
            <h3 className="font-semibold text-primary mb-2">Last Selected Range:</h3>
            <p className="text-sm text-muted-foreground">
              Start Day: {selectedRange.start}, End Day: {selectedRange.end}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}