import { useEffect, useRef, useCallback, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { isEqual } from 'lodash';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface UseAutoSaveOptions {
  data: any;
  onSave: (data: any) => Promise<void>;
  enabled?: boolean;
  interval?: number; // milliseconds
  debounceDelay?: number; // milliseconds
  onStatusChange?: (status: SaveStatus) => void;
}

interface AutoSaveState {
  status: SaveStatus;
  lastSaved: Date | null;
  error: string | null;
  pendingSave: boolean;
}

export function useAutoSave({
  data,
  onSave,
  enabled = true,
  interval = 30000, // 30 seconds
  debounceDelay = 2000, // 2 seconds
  onStatusChange,
}: UseAutoSaveOptions): AutoSaveState {
  const [status, setStatus] = useState<SaveStatus>('idle');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingSave, setPendingSave] = useState(false);
  
  const { toast } = useToast();
  const lastSavedDataRef = useRef<any>(null);
  const saveTimerRef = useRef<NodeJS.Timeout>();
  const intervalTimerRef = useRef<NodeJS.Timeout>();
  const retryCountRef = useRef(0);
  const maxRetries = 3;
  const saveQueueRef = useRef<any[]>([]);
  const isSavingRef = useRef(false);

  // Update status and notify
  const updateStatus = useCallback((newStatus: SaveStatus) => {
    setStatus(newStatus);
    onStatusChange?.(newStatus);
  }, [onStatusChange]);

  // Check if data has changed
  const hasDataChanged = useCallback(() => {
    return !isEqual(data, lastSavedDataRef.current);
  }, [data]);

  // Save function with retry logic
  const performSave = useCallback(async () => {
    if (!enabled || isSavingRef.current || !hasDataChanged()) {
      return;
    }

    isSavingRef.current = true;
    updateStatus('saving');
    setError(null);

    try {
      await onSave(data);
      
      // Success
      lastSavedDataRef.current = structuredClone(data);
      setLastSaved(new Date());
      updateStatus('saved');
      retryCountRef.current = 0;
      setPendingSave(false);
      
      // Process any queued saves
      if (saveQueueRef.current.length > 0) {
        const nextData = saveQueueRef.current.shift();
        if (!isEqual(nextData, lastSavedDataRef.current)) {
          setTimeout(() => performSave(), 100);
        }
      }
    } catch (err) {
      console.error('Auto-save failed:', err);
      
      // Retry logic with exponential backoff
      if (retryCountRef.current < maxRetries) {
        retryCountRef.current++;
        const retryDelay = Math.min(1000 * Math.pow(2, retryCountRef.current), 10000);
        
        updateStatus('error');
        setError(err instanceof Error ? err.message : 'Failed to save');
        
        toast({
          title: "Auto-save failed",
          description: `Retrying in ${retryDelay / 1000} seconds... (Attempt ${retryCountRef.current}/${maxRetries})`,
          variant: "destructive",
        });
        
        setTimeout(() => performSave(), retryDelay);
      } else {
        // Max retries reached
        updateStatus('error');
        setError('Failed to save after multiple attempts');
        setPendingSave(true);
        
        toast({
          title: "Auto-save failed",
          description: "Your changes could not be saved. Please check your connection and try saving manually.",
          variant: "destructive",
        });
        
        // Queue the data for later
        saveQueueRef.current.push(structuredClone(data));
      }
    } finally {
      isSavingRef.current = false;
    }
  }, [enabled, data, onSave, hasDataChanged, updateStatus, toast]);

  // Debounced save on data change
  useEffect(() => {
    if (!enabled || !hasDataChanged()) {
      return;
    }

    // Clear existing timer
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    // Set new debounced save
    saveTimerRef.current = setTimeout(() => {
      performSave();
    }, debounceDelay);

    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, [data, enabled, debounceDelay, performSave, hasDataChanged]);

  // Interval-based save
  useEffect(() => {
    if (!enabled) {
      return;
    }

    intervalTimerRef.current = setInterval(() => {
      if (hasDataChanged() && !isSavingRef.current) {
        performSave();
      }
    }, interval);

    return () => {
      if (intervalTimerRef.current) {
        clearInterval(intervalTimerRef.current);
      }
    };
  }, [enabled, interval, performSave, hasDataChanged]);

  // Save on page unload
  useEffect(() => {
    if (!enabled) {
      return;
    }

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasDataChanged()) {
        // Try to save synchronously (best effort)
        navigator.sendBeacon && navigator.sendBeacon('/api/gardens/beacon-save', JSON.stringify(data));
        
        // Show warning
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [enabled, data, hasDataChanged]);

  // Handle online/offline events
  useEffect(() => {
    const handleOnline = () => {
      if (saveQueueRef.current.length > 0 || pendingSave) {
        toast({
          title: "Connection restored",
          description: "Syncing your changes...",
        });
        performSave();
      }
    };

    const handleOffline = () => {
      toast({
        title: "Connection lost",
        description: "Your changes will be saved when connection is restored",
        variant: "destructive",
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [performSave, pendingSave, toast]);

  // Force save function for manual trigger
  const forceSave = useCallback(() => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }
    performSave();
  }, [performSave]);

  // Expose force save on window for debugging
  useEffect(() => {
    (window as any).__forceSave = forceSave;
    return () => {
      delete (window as any).__forceSave;
    };
  }, [forceSave]);

  return {
    status,
    lastSaved,
    error,
    pendingSave,
  };
}