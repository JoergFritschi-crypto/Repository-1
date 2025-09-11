import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { X, Shield, User, CreditCard, Crown } from 'lucide-react';
import { useAuthWithTesting } from '@/hooks/useAuth';
import { queryClient } from '@/lib/queryClient';

export function TestingModeIndicator() {
  const { isTestingMode, testingTier, user } = useAuthWithTesting();
  const [isMinimized, setIsMinimized] = useState(false);
  
  // Only show for admins in testing mode
  if (!isTestingMode || !user?.isAdmin) return null;
  
  const handleExit = () => {
    sessionStorage.removeItem('tierTestingMode');
    queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
    window.location.reload(); // Force reload to clear testing state
  };
  
  const getTierIcon = () => {
    switch (testingTier) {
      case 'free':
        return <User className="w-4 h-4" />;
      case 'pay_per_design':
        return <CreditCard className="w-4 h-4" />;
      case 'premium':
        return <Crown className="w-4 h-4" />;
      default:
        return <Shield className="w-4 h-4" />;
    }
  };
  
  const getTierColor = () => {
    switch (testingTier) {
      case 'free':
        return 'bg-[#004025]/60';
      case 'pay_per_design':
        return 'bg-[#004025]';
      case 'premium':
        return 'bg-[#FFD500]';
      default:
        return 'bg-[#004025]/80';
    }
  };
  
  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          onClick={() => setIsMinimized(false)}
          className={`${getTierColor()} hover:opacity-90 text-white rounded-full p-3 shadow-lg`}
          size="icon"
          data-testid="button-expand-testing-indicator"
        >
          {getTierIcon()}
        </Button>
      </div>
    );
  }
  
  return (
    <div className="fixed bottom-4 right-4 z-50 bg-white border-2 border-[#004025] rounded-lg shadow-xl p-4 max-w-sm animate-in slide-in-from-bottom-5">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 ${getTierColor()} rounded-full flex items-center justify-center text-white`}>
            {getTierIcon()}
          </div>
          <div>
            <h4 className="font-semibold text-sm">Testing Mode Active</h4>
            <p className="text-xs text-muted-foreground">
              {testingTier?.replace('_', ' ').toUpperCase()} Tier
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsMinimized(true)}
          className="h-6 w-6"
          data-testid="button-minimize-testing-indicator"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
      
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">
          You're testing the {testingTier?.replace('_', '-')} user experience. Admin privileges remain accessible.
        </p>
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExit}
            className="flex-1"
            data-testid="button-exit-testing-mode"
          >
            <Shield className="w-3 h-3 mr-1" />
            Exit to Admin
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.location.href = '/admin'}
            className="flex-1"
            data-testid="button-admin-dashboard"
          >
            Admin Panel
          </Button>
        </div>
      </div>
    </div>
  );
}