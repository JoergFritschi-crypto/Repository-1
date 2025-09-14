import { useState, useCallback, useEffect } from 'react';
import { toast } from '@/hooks/use-toast';
import { UseMutationResult } from '@tanstack/react-query';

interface UseStepNavigationProps {
  totalSteps: number;
  form: any;
  gardenId: string | null;
  user: any;
  isPaidUser: boolean;
  autoSaveEnabled: boolean;
  createGardenMutation: UseMutationResult<any, any, any, any>;
  updateGardenMutation: UseMutationResult<any, any, any, any>;
  setGardenId: (id: string | null) => void;
  setShowSeasonalDateSelector?: (show: boolean) => void;
  onComplete?: () => void;
}

export function useStepNavigation({
  totalSteps,
  form,
  gardenId,
  user,
  isPaidUser,
  autoSaveEnabled,
  createGardenMutation,
  updateGardenMutation,
  setGardenId,
  setShowSeasonalDateSelector,
  onComplete,
}: UseStepNavigationProps) {
  const [currentStep, setCurrentStep] = useState(1);

  // Scroll to top when step changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentStep]);

  const validateStep1 = useCallback(() => {
    // Skip validation entirely for admin users
    if (user?.isAdmin === true) {
      return true;
    }
    
    const values = form.getValues();
    const errors: string[] = [];
    
    // Check required fields for Step 1 (non-admin users only)
    if (!values.name) errors.push("Garden Name");
    if (!values.usdaZone && !values.rhsZone) errors.push("At least one Hardiness Zone (USDA or RHS)");
    if (!values.sunExposure) errors.push("Sun Exposure");
    if (!values.soilType) errors.push("Soil Type");
    if (!values.soilPh) errors.push("Soil pH");
    
    if (errors.length > 0) {
      toast({
        title: "Required Fields Missing",
        description: `Please fill in the following required fields: ${errors.join(", ")}`,
        variant: "destructive",
      });
      return false;
    }
    
    return true;
  }, [form, user]);

  const saveGarden = useCallback(async () => {
    const shouldAutoSave = isPaidUser || autoSaveEnabled;
    if (!shouldAutoSave || !user) return true;

    try {
      const values = form.getValues();
      const gardenData = {
        name: values.name,
        city: values.city || undefined,
        zipCode: values.zipCode || undefined,
        country: values.country || undefined,
        usdaZone: values.usdaZone || undefined,
        rhsZone: values.rhsZone || undefined,
        heatZone: values.heatZone || undefined,
        shape: values.shape,
        dimensions: values.dimensions,
        units: values.units,
        sunExposure: values.sunExposure || undefined,
        soilType: values.soilType || undefined,
        soilPh: values.soilPh || undefined,
        slopeDirection: values.slopeDirection,
        slopePercentage: values.slopePercentage,
        hasSoilAnalysis: values.hasSoilAnalysis || false,
        soilAnalysis: values.soilAnalysis || {},
        design_approach: values.design_approach,
        selectedStyle: values.selectedStyle,
        preferences: values.preferences,
      };
      
      if (gardenId) {
        // Update existing garden
        await updateGardenMutation.mutateAsync({ id: gardenId, data: gardenData });
      } else {
        // Create new garden
        const result = await createGardenMutation.mutateAsync(gardenData);
        if (result?.id) {
          setGardenId(result.id);
        }
      }
      return true;
    } catch (error) {
      console.error("Failed to save garden:", error);
      // Continue to next step even if save fails
      return true;
    }
  }, [
    form, 
    gardenId, 
    user, 
    isPaidUser, 
    autoSaveEnabled, 
    createGardenMutation, 
    updateGardenMutation,
    setGardenId
  ]);

  const nextStep = useCallback(async () => {
    // Skip validation for admin users
    const isAdmin = user?.isAdmin === true;
    
    // Handle transition from Step 4 to Step 5
    if (currentStep === 4) {
      await saveGarden();
      setCurrentStep(5);
      setShowSeasonalDateSelector?.(true);
      return;
    }
    
    // Validate Step 1 before proceeding (unless admin)
    if (currentStep === 1 && !isAdmin) {
      if (!validateStep1()) return;
      await saveGarden();
    }
    
    // Auto-save on other steps if enabled
    if (currentStep > 1) {
      await saveGarden();
    }
    
    // Handle final step
    if (currentStep === totalSteps) {
      onComplete?.();
      return;
    }
    
    setCurrentStep(prev => Math.min(prev + 1, totalSteps));
  }, [
    currentStep, 
    totalSteps, 
    user, 
    validateStep1, 
    saveGarden, 
    setShowSeasonalDateSelector,
    onComplete
  ]);

  const prevStep = useCallback(() => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  }, []);

  const goToStep = useCallback((step: number) => {
    if (step >= 1 && step <= totalSteps) {
      setCurrentStep(step);
    }
  }, [totalSteps]);

  return {
    currentStep,
    nextStep,
    prevStep,
    goToStep,
    isFirstStep: currentStep === 1,
    isLastStep: currentStep === totalSteps,
  };
}