import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Crown, Leaf, Sparkles, Shield } from 'lucide-react';
import { useState } from 'react';
import { UpgradeModal } from '@/components/ui/upgrade-modal';

interface TierDisplayProps {
  userTier: 'free' | 'pay_per_design' | 'premium';
  isAdmin?: boolean;
  showUpgradeButton?: boolean;
  className?: string;
}

const tierInfo = {
  free: {
    name: 'Free',
    icon: Leaf,
    color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    badgeVariant: 'secondary' as const,
    limits: '1 design • 15 plants • 5 IDs/month'
  },
  pay_per_design: {
    name: 'Pay-per-Design',
    icon: Sparkles,
    color: 'bg-blue-50 text-blue-700 border-blue-200',
    badgeVariant: 'default' as const,
    limits: '1 design/style • 100 plants • 20 IDs/month'
  },
  premium: {
    name: 'Premium',
    icon: Crown,
    color: 'bg-gradient-to-r from-canary/20 to-gold/20 text-canary border-canary',
    badgeVariant: 'outline' as const,
    limits: 'Unlimited designs • Unlimited plants • Unlimited IDs'
  }
};

export function TierDisplay({ userTier, isAdmin, showUpgradeButton = false, className = '' }: TierDisplayProps) {
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const tier = tierInfo[userTier];
  const Icon = tier.icon;

  return (
    <>
      <div className={`flex items-center gap-2 ${className}`}>
        <Badge 
          variant={tier.badgeVariant} 
          className={tier.color}
          data-testid={`badge-tier-${userTier}`}
        >
          <Icon className="w-3 h-3 mr-1" />
          {tier.name}
          {isAdmin && (
            <>
              <Shield className="w-3 h-3 ml-1" />
              Admin
            </>
          )}
        </Badge>
        
        {showUpgradeButton && userTier !== 'premium' && !isAdmin && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowUpgradeModal(true)}
            className="text-xs"
            data-testid="button-upgrade-tier"
          >
            Upgrade
          </Button>
        )}
      </div>
      
      {showUpgradeModal && (
        <UpgradeModal
          isOpen={showUpgradeModal}
          onClose={() => setShowUpgradeModal(false)}
          currentTier={userTier}
          triggerReason="Unlock more features and remove limitations"
        />
      )}
    </>
  );
}

export function TierLimitsDisplay({ userTier }: { userTier: 'free' | 'pay_per_design' | 'premium' }) {
  const tier = tierInfo[userTier];
  
  return (
    <div className="text-xs text-muted-foreground" data-testid={`text-tier-limits-${userTier}`}>
      {tier.limits}
    </div>
  );
}