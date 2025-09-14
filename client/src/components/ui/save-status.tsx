import { memo } from 'react';
import { Cloud, CloudOff, Check, Loader2, AlertCircle, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import type { SaveStatus } from '@/hooks/useAutoSave';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface SaveStatusIndicatorProps {
  status: SaveStatus;
  lastSaved: Date | null;
  error?: string | null;
  className?: string;
  showLastSaved?: boolean;
  variant?: 'compact' | 'full';
}

const SaveStatusIndicator = memo(({
  status,
  lastSaved,
  error,
  className,
  showLastSaved = true,
  variant = 'full'
}: SaveStatusIndicatorProps) => {
  const getStatusContent = () => {
    switch (status) {
      case 'saving':
        return {
          icon: <Loader2 className="h-4 w-4 animate-spin" />,
          text: 'Saving...',
          color: 'text-muted-foreground',
          bgColor: 'bg-muted/50',
        };
      case 'saved':
        return {
          icon: <Check className="h-4 w-4" />,
          text: 'All changes saved',
          color: 'text-green-600 dark:text-green-400',
          bgColor: 'bg-green-50 dark:bg-green-950/50',
        };
      case 'error':
        return {
          icon: <AlertCircle className="h-4 w-4" />,
          text: error || 'Failed to save',
          color: 'text-red-600 dark:text-red-400',
          bgColor: 'bg-red-50 dark:bg-red-950/50',
        };
      case 'idle':
      default:
        if (!navigator.onLine) {
          return {
            icon: <CloudOff className="h-4 w-4" />,
            text: 'Offline - changes will sync when connected',
            color: 'text-yellow-600 dark:text-yellow-400',
            bgColor: 'bg-yellow-50 dark:bg-yellow-950/50',
          };
        }
        return {
          icon: <Cloud className="h-4 w-4" />,
          text: 'Ready',
          color: 'text-muted-foreground',
          bgColor: 'bg-muted/50',
        };
    }
  };

  const statusContent = getStatusContent();
  
  const lastSavedText = lastSaved 
    ? `Last saved ${formatDistanceToNow(lastSaved, { addSuffix: true })}`
    : 'Not saved yet';

  if (variant === 'compact') {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div 
              className={cn(
                "flex items-center gap-1.5 px-2 py-1 rounded-md transition-all duration-200",
                statusContent.bgColor,
                statusContent.color,
                className
              )}
              data-testid="save-status-compact"
            >
              {statusContent.icon}
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-xs">
            <div className="space-y-1">
              <p className="font-medium">{statusContent.text}</p>
              {showLastSaved && lastSaved && (
                <p className="text-xs text-muted-foreground">{lastSavedText}</p>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <div 
      className={cn(
        "flex items-center gap-2 px-3 py-1.5 rounded-md transition-all duration-200",
        statusContent.bgColor,
        className
      )}
      data-testid="save-status-full"
    >
      <div className={cn("flex items-center gap-1.5", statusContent.color)}>
        {statusContent.icon}
        <span className="text-sm font-medium">{statusContent.text}</span>
      </div>
      
      {showLastSaved && lastSaved && status === 'saved' && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground border-l pl-2 ml-1">
          <Clock className="h-3 w-3" />
          <span>{lastSavedText}</span>
        </div>
      )}
    </div>
  );
});

SaveStatusIndicator.displayName = 'SaveStatusIndicator';

export { SaveStatusIndicator };
export type { SaveStatusIndicatorProps };