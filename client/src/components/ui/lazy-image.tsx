import { useState, useEffect, useRef, ImgHTMLAttributes, memo } from 'react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { ImageOff } from 'lucide-react';

interface LazyImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  placeholder?: string; // Low-quality placeholder for blur-up effect
  fallbackSrc?: string; // Fallback image on error
  threshold?: number; // Intersection Observer threshold
  rootMargin?: string; // Intersection Observer root margin
  aspectRatio?: string; // Aspect ratio for skeleton (e.g., "16/9", "1/1")
  onLoad?: () => void;
  onError?: () => void;
  skeletonClassName?: string;
  fadeIn?: boolean; // Enable fade-in animation
  priority?: boolean; // Load immediately without lazy loading
  webpSrc?: string; // WebP format source for modern browsers
  srcSet?: string; // Responsive image set
  sizes?: string; // Sizes attribute for responsive images
}

const LazyImage = memo(({
  src,
  alt,
  placeholder,
  fallbackSrc = '/placeholder-image.png',
  threshold = 0.1,
  rootMargin = '50px',
  aspectRatio,
  className,
  skeletonClassName,
  onLoad,
  onError,
  fadeIn = true,
  priority = false,
  style,
  ...props
}: LazyImageProps) => {
  const [imageSrc, setImageSrc] = useState<string>(placeholder || '');
  const [imageLoaded, setImageLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isIntersecting, setIsIntersecting] = useState(priority);
  const imgRef = useRef<HTMLImageElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Setup Intersection Observer
  useEffect(() => {
    if (priority || !imgRef.current) {
      return;
    }

    // Check if IntersectionObserver is supported
    if (!('IntersectionObserver' in window)) {
      setIsIntersecting(true);
      return;
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsIntersecting(true);
            // Once intersected, stop observing
            if (observerRef.current && entry.target) {
              observerRef.current.unobserve(entry.target);
            }
          }
        });
      },
      {
        threshold,
        rootMargin,
      }
    );

    observerRef.current.observe(imgRef.current);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [priority, threshold, rootMargin]);

  // Load the actual image when intersecting
  useEffect(() => {
    if (!isIntersecting || !src) {
      return;
    }

    let isMounted = true;
    const img = new Image();

    img.onload = () => {
      if (isMounted) {
        setImageSrc(src);
        setImageLoaded(true);
        setHasError(false);
        onLoad?.();
      }
    };

    img.onerror = () => {
      if (isMounted) {
        setHasError(true);
        setImageSrc(fallbackSrc);
        setImageLoaded(true);
        onError?.();
      }
    };

    img.src = src;

    return () => {
      isMounted = false;
    };
  }, [isIntersecting, src, fallbackSrc, onLoad, onError]);

  // Combined styles for aspect ratio and custom styles
  const combinedStyle = {
    ...style,
    ...(aspectRatio && !imageLoaded ? { aspectRatio } : {}),
  };

  // Show skeleton while not loaded
  if (!imageLoaded && !placeholder) {
    return (
      <div
        ref={imgRef}
        className={cn('relative overflow-hidden', className)}
        style={combinedStyle}
      >
        <Skeleton 
          className={cn(
            'absolute inset-0 w-full h-full',
            skeletonClassName
          )} 
        />
      </div>
    );
  }

  // Show error state
  if (hasError && !fallbackSrc) {
    return (
      <div
        ref={imgRef}
        className={cn(
          'relative overflow-hidden bg-muted flex items-center justify-center',
          className
        )}
        style={combinedStyle}
      >
        <ImageOff className="w-8 h-8 text-muted-foreground" />
      </div>
    );
  }

  // Support WebP with fallback
  if (props.webpSrc && isIntersecting && !hasError) {
    return (
      <picture ref={imgRef}>
        <source srcSet={props.webpSrc} type="image/webp" />
        <source srcSet={src} type="image/jpeg" />
        <img
          src={imageSrc || placeholder || ''}
          alt={alt}
          className={cn(
            'transition-opacity duration-300',
            fadeIn && !imageLoaded && 'opacity-0',
            fadeIn && imageLoaded && 'opacity-100',
            hasError && 'filter grayscale',
            className
          )}
          style={combinedStyle}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          srcSet={props.srcSet}
          sizes={props.sizes}
          {...props}
        />
      </picture>
    );
  }

  return (
    <img
      ref={imgRef}
      src={imageSrc || placeholder || ''}
      alt={alt}
      className={cn(
        'transition-opacity duration-300',
        fadeIn && !imageLoaded && 'opacity-0',
        fadeIn && imageLoaded && 'opacity-100',
        hasError && 'filter grayscale',
        className
      )}
      style={combinedStyle}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      srcSet={props.srcSet}
      sizes={props.sizes}
      {...props}
    />
  );
});

LazyImage.displayName = 'LazyImage';

export default LazyImage;

// Hook for preloading images
export const useImagePreloader = () => {
  const preloadImage = (src: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve();
      img.onerror = () => reject(new Error(`Failed to preload image: ${src}`));
      img.src = src;
    });
  };

  const preloadImages = async (srcs: string[]): Promise<void> => {
    await Promise.all(srcs.map((src) => preloadImage(src).catch(() => {})));
  };

  return { preloadImage, preloadImages };
};

// Utility to generate blur data URL for placeholder
export const generateBlurDataUrl = (width = 10, height = 10): string => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#f3f4f6';
    ctx.fillRect(0, 0, width, height);
  }
  return canvas.toDataURL();
};