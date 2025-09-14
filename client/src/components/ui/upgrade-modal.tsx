import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, Crown, Sparkles, Star, Zap, Leaf, TreePine, Package } from 'lucide-react';
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { loadStripe } from '@stripe/stripe-js';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTier: 'free' | 'pay_per_design' | 'premium';
  triggerReason?: string;
  onSuccessfulUpgrade?: () => void;
}

const stripePromise = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY 
  ? loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY)
  : null;

const tierDetails = {
  free: {
    name: 'Free',
    icon: Leaf,
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-50',
    limits: {
      designs: '1 design',
      plants: '15 plants',
      plantId: '5 IDs/month',
      support: 'Community support'
    }
  },
  pay_per_design: {
    name: 'Pay-per-Design',
    icon: Sparkles,
    color: 'text-blue-500',
    bgColor: 'bg-blue-50',
    price: '$10',
    limits: {
      designs: '1 design per style',
      plants: '100 plants',
      plantId: '20 IDs/month',
      support: 'Email support',
      features: 'All design styles'
    }
  },
  premium: {
    name: 'Premium',
    icon: Crown,
    color: 'text-canary',
    bgColor: 'bg-gradient-to-r from-canary/10 to-gold/10',
    price: '$29/month',
    limits: {
      designs: 'Unlimited designs',
      plants: 'Unlimited plants',
      plantId: 'Unlimited IDs',
      support: 'Priority support',
      features: '3D visualization',
      advanced: 'AI recommendations'
    }
  }
};

export function UpgradeModal({ 
  isOpen, 
  onClose, 
  currentTier, 
  triggerReason,
  onSuccessfulUpgrade 
}: UpgradeModalProps) {
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  
  const createCheckoutSession = useMutation({
    mutationFn: async (priceId: string) => {
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          priceId,
          successUrl: `${window.location.origin}/gardens?upgraded=true&tier=${priceId === 'price_payperdesign' ? 'pay_per_design' : 'premium'}`,
          cancelUrl: window.location.href
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to create checkout session' }));
        throw new Error(errorData.message || 'Failed to create checkout session');
      }
      
      return await response.json();
    },
    onSuccess: async (data: any) => {
      // Check if running in demo mode
      if (data.demoMode) {
        toast({
          title: "Demo Mode Active",
          description: "In production, you would be redirected to Stripe checkout. Your tier has been upgraded for testing.",
          variant: "default"
        });
        
        // Simulate successful upgrade in demo mode
        setTimeout(() => {
          if (onSuccessfulUpgrade) onSuccessfulUpgrade();
          window.location.reload(); // Refresh to show new tier
        }, 2000);
        return;
      }
      
      // Normal Stripe flow
      if (!stripePromise) {
        toast({
          title: "Configuration Notice",
          description: "Stripe is not fully configured. Running in demo mode.",
          variant: "default"
        });
        
        // Treat as demo mode success
        setTimeout(() => {
          if (onSuccessfulUpgrade) onSuccessfulUpgrade();
          window.location.reload();
        }, 2000);
        return;
      }
      
      const stripe = await stripePromise;
      if (!stripe) {
        toast({
          title: "Loading Stripe...",
          description: "Please wait while we set up the payment system.",
          variant: "default"
        });
        return;
      }
      
      const { error } = await stripe.redirectToCheckout({
        sessionId: data.sessionId
      });
      
      if (error) {
        toast({
          title: "Payment Error",
          description: error.message,
          variant: "destructive"
        });
      } else if (onSuccessfulUpgrade) {
        onSuccessfulUpgrade();
      }
    },
    onError: (error: any) => {
      console.error('Checkout session error:', error);
      toast({
        title: "Upgrade Process",
        description: "There was an issue starting the upgrade. Please try again or contact support.",
        variant: "destructive"
      });
    },
    onSettled: () => {
      setIsProcessing(false);
    }
  });

  const handleUpgrade = async (targetTier: 'pay_per_design' | 'premium') => {
    setIsProcessing(true);
    
    // Price IDs - using defaults if environment variables not set
    const priceIds = {
      pay_per_design: import.meta.env.VITE_STRIPE_PAY_PER_DESIGN_PRICE_ID || 'price_payperdesign',
      premium: import.meta.env.VITE_STRIPE_PREMIUM_PRICE_ID || 'price_premium'
    };
    
    // Always use the mutation which handles both demo and real modes
    createCheckoutSession.mutate(priceIds[targetTier]);
  };

  const getUpgradeOptions = () => {
    if (currentTier === 'free') {
      return ['pay_per_design', 'premium'] as const;
    } else if (currentTier === 'pay_per_design') {
      return ['premium'] as const;
    }
    return [] as const;
  };

  const upgradeOptions = getUpgradeOptions();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Crown className="w-5 h-5 text-canary" />
            Upgrade Your Plan
          </DialogTitle>
          <DialogDescription>
            {triggerReason || "Unlock more features and remove limitations"}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Current Plan */}
          <Card className={`border-2 ${currentTier === 'premium' ? 'border-canary' : 'border-muted'}`}>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    {(() => {
                      const Icon = tierDetails[currentTier].icon;
                      return <Icon className={`w-5 h-5 ${tierDetails[currentTier].color}`} />;
                    })()}
                    <h3 className="font-semibold">Current Plan: {tierDetails[currentTier].name}</h3>
                  </div>
                  <Badge variant="secondary">Active</Badge>
                </div>
              </div>
              <ul className="space-y-2 text-sm">
                {Object.entries(tierDetails[currentTier].limits).map(([key, value]) => (
                  <li key={key} className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-500" />
                    <span>{value}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Upgrade Options */}
          {upgradeOptions.map((tier) => {
            const details = tierDetails[tier];
            return (
              <Card 
                key={tier}
                className={`border-2 ${tier === 'premium' ? 'border-canary' : 'border-primary'} ${details.bgColor}`}
              >
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        {(() => {
                          const Icon = details.icon;
                          return <Icon className={`w-5 h-5 ${details.color}`} />;
                        })()}
                        <h3 className="font-semibold">{details.name}</h3>
                        {tier === 'premium' && (
                          <Badge className="bg-canary text-primary">BEST VALUE</Badge>
                        )}
                      </div>
                      <p className="text-2xl font-bold">{details.price}</p>
                    </div>
                  </div>
                  <ul className="space-y-2 text-sm mb-4">
                    {Object.entries(details.limits).map(([key, value]) => (
                      <li key={key} className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-emerald-500" />
                        <span className="font-medium">{value}</span>
                      </li>
                    ))}
                  </ul>
                  <Button 
                    className={`w-full ${tier === 'premium' ? 'bg-canary text-primary hover:bg-gold' : ''}`}
                    onClick={() => handleUpgrade(tier)}
                    disabled={isProcessing}
                    data-testid={`button-upgrade-${tier}`}
                  >
                    {isProcessing ? 'Processing...' : `Upgrade to ${details.name}`}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isProcessing}>
            Maybe Later
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}