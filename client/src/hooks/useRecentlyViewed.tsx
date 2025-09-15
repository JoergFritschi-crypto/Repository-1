import { useState, useEffect, useCallback } from 'react';
import type { Plant } from '@/types/plant';

interface RecentlyViewedPlant {
  id: string;
  commonName: string;
  scientificName?: string;
  thumbnailImage?: string;
  timestamp: number;
}

const STORAGE_KEY = 'recentlyViewedPlants';
const MAX_PLANTS = 15;

// Helper function to check if a string is a valid UUID
const isValidUUID = (str: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
};

export function useRecentlyViewed() {
  const [recentlyViewed, setRecentlyViewed] = useState<RecentlyViewedPlant[]>([]);

  // Load from localStorage on mount and clean up invalid entries
  useEffect(() => {
    // First, clear any localStorage keys that might contain legacy user IDs
    const allKeys = Object.keys(localStorage);
    let clearedLegacyData = false;
    
    allKeys.forEach(key => {
      try {
        const value = localStorage.getItem(key);
        if (value && value.includes('47166530')) {
          localStorage.removeItem(key);
          console.log(`Cleared legacy user data from localStorage key: ${key}`);
          clearedLegacyData = true;
        }
      } catch (error) {
        // Ignore errors for non-JSON values
      }
    });
    
    if (clearedLegacyData) {
      console.log('Successfully cleared legacy user data from localStorage');
    }
    
    // Now handle recently viewed plants
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        // Filter out entries with invalid UUIDs
        const validEntries = parsed.filter((plant: RecentlyViewedPlant) => 
          plant.id && isValidUUID(plant.id)
        );
        
        // If we filtered out any invalid entries, update localStorage
        if (validEntries.length !== parsed.length) {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(validEntries));
          console.log(`Cleaned up ${parsed.length - validEntries.length} invalid plant entries from recently viewed`);
        }
        
        setRecentlyViewed(validEntries);
      } catch (error) {
        console.error('Failed to parse recently viewed plants:', error);
        // Clear corrupted data
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, []);

  // Add a plant to recently viewed
  const addToRecentlyViewed = useCallback((plant: Partial<Plant>) => {
    if (!plant.id || !isValidUUID(plant.id)) {
      console.warn('Invalid plant ID format, skipping recently viewed:', plant.id);
      return;
    }

    const newItem: RecentlyViewedPlant = {
      id: plant.id,
      commonName: plant.commonName || 'Unknown Plant',
      scientificName: plant.scientificName,
      thumbnailImage: plant.thumbnailImage || plant.fullImage,
      timestamp: Date.now()
    };

    setRecentlyViewed(prev => {
      // Remove if already exists (will be added to top)
      const filtered = prev.filter(p => p.id !== plant.id);
      
      // Add to beginning and limit to MAX_PLANTS
      const updated = [newItem, ...filtered].slice(0, MAX_PLANTS);
      
      // Save to localStorage
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      
      return updated;
    });
  }, []);

  // Clear all recently viewed
  const clearRecentlyViewed = useCallback(() => {
    setRecentlyViewed([]);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  // Format timestamp for display
  const formatTimestamp = useCallback((timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
    if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
    if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`;
    
    return new Date(timestamp).toLocaleDateString();
  }, []);

  return {
    recentlyViewed,
    addToRecentlyViewed,
    clearRecentlyViewed,
    formatTimestamp
  };
}