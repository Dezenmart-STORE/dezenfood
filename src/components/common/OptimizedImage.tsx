import { ImgHTMLAttributes, useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface OptimizedImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'alt'> {
  src: string;
  alt: string; // Made required for SEO
  width?: number | string;
  height?: number | string;
  lazy?: boolean;
  priority?: boolean;
  fallback?: string;
  objectFit?: "contain" | "cover" | "fill" | "none" | "scale-down";
  quality?: number;
  className?: string;
  placeholderClassName?: string;
  aspectRatio?: string;
  onLoad?: () => void;
  onError?: () => void;
}

/**
 * OptimizedImage Component
 *
 * SEO-optimized image component with:
 * - Lazy loading by default
 * - Proper alt text (required)
 * - Responsive image loading
 * - Fallback image support
 * - Loading skeleton
 * - Error handling
 *
 * @example
 * <OptimizedImage
 *   src="/product.jpg"
 *   alt="Product name - buy with crypto"
 *   width={300}
 *   height={300}
 *   lazy={true}
 * />
 */
const OptimizedImage = ({
  src,
  alt,
  width,
  height,
  lazy = true,
  priority = false,
  fallback = "/images/placeholder.png",
  objectFit = "cover",
  quality = 85,
  className = "",
  placeholderClassName = "",
  aspectRatio,
  onLoad,
  onError,
  ...props
}: OptimizedImageProps) => {
  const [imageSrc, setImageSrc] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    // If priority image, load immediately
    if (priority) {
      loadImage(src);
      return;
    }

    // Lazy load with Intersection Observer
    if (!lazy) {
      loadImage(src);
      return;
    }

    // Set up intersection observer for lazy loading
    if (!imgRef.current) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            loadImage(src);
            observerRef.current?.disconnect();
          }
        });
      },
      {
        rootMargin: "100px", // Start loading 100px before viewport
        threshold: 0.01,
      }
    );

    if (imgRef.current) {
      observerRef.current.observe(imgRef.current);
    }

    return () => {
      observerRef.current?.disconnect();
    };
  }, [src, priority, lazy]);

  const loadImage = (imageSrc: string) => {
    const img = new Image();
    img.src = imageSrc;

    img.onload = () => {
      setImageSrc(imageSrc);
      setIsLoading(false);
      setImageLoaded(true);
      onLoad?.();
    };

    img.onerror = () => {
      setImageSrc(fallback);
      setIsLoading(false);
      setHasError(true);
      onError?.();
      console.error(`Failed to load image: ${imageSrc}`);
    };
  };

  // Generate responsive srcset if width is provided
  const generateSrcSet = () => {
    if (!src || hasError) return undefined;

    // For external URLs, return as is
    if (src.startsWith('http')) {
      return undefined;
    }

    // For local images, generate responsive sizes
    const sizes = [320, 640, 768, 1024, 1280, 1536];
    const srcset = sizes
      .filter(size => !width || size <= (typeof width === 'number' ? width : parseInt(width as string)))
      .map(size => `${src}?w=${size} ${size}w`)
      .join(', ');

    return srcset || undefined;
  };

  return (
    <div
      ref={imgRef}
      className={`relative overflow-hidden bg-gray-800 ${className}`}
      style={{
        width: width || '100%',
        height: height || 'auto',
        aspectRatio: aspectRatio || undefined,
      }}
    >
      {/* Shimmer Loading skeleton - prevents white flash */}
      <AnimatePresence>
        {isLoading && !imageLoaded && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className={`absolute inset-0 ${
              placeholderClassName || "bg-gradient-to-r from-gray-800 via-gray-700 to-gray-800"
            }`}
          >
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent"
              animate={{
                x: ["-100%", "100%"],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: "linear",
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Optimized Image - fade in smoothly */}
      {imageSrc && (
        <motion.img
          src={imageSrc}
          alt={alt}
          width={width}
          height={height}
          loading={lazy && !priority ? "lazy" : "eager"}
          decoding="async"
          srcSet={generateSrcSet()}
          sizes={width ? `(max-width: ${width}px) 100vw, ${width}px` : undefined}
          className={`absolute inset-0 w-full h-full ${
            objectFit === "cover" ? "object-cover" :
            objectFit === "contain" ? "object-contain" :
            objectFit === "fill" ? "object-fill" :
            objectFit === "scale-down" ? "object-scale-down" :
            "object-none"
          }`}
          initial={{ opacity: 0 }}
          animate={{ opacity: imageLoaded ? 1 : 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          {...(props as any)}
        />
      )}

      {/* Error state */}
      {hasError && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 flex items-center justify-center bg-gray-800"
        >
          <div className="text-center text-gray-500">
            <svg
              className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-2 opacity-40"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <p className="text-xs opacity-75">Image unavailable</p>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default OptimizedImage;
