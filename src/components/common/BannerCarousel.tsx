import { FC, useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Banner, { BannerProps } from "./Banner";

interface BannerCarouselProps {
  banners: BannerProps[];
  autoRotate?: boolean;
  rotationInterval?: number;
  className?: string;
}

const BannerCarousel: FC<BannerCarouselProps> = ({
  banners,
  autoRotate = true,
  rotationInterval = 5000,
  className = "",
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % banners.length);
  }, [banners.length]);

  const goToIndex = useCallback((index: number) => {
    setCurrentIndex(index);
  }, []);

  // Auto-rotation - pauses on hover and when user manually navigates
  useEffect(() => {
    if (!autoRotate || banners.length <= 1 || isPaused) return;
    const interval = window.setInterval(goToNext, rotationInterval);
    return () => window.clearInterval(interval);
  }, [autoRotate, goToNext, rotationInterval, banners.length, isPaused]);

  if (banners.length === 1) {
    return (
      <div className={`mt-8 md:mt-10 ${className}`}>
        <Banner {...banners[0]} />
      </div>
    );
  }

  return (
    <div
      className={`relative mt-8 md:mt-10 ${className}`}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="relative overflow-hidden rounded-lg">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            className="w-full"
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
          >
            <Banner {...banners[currentIndex]} />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Progress indicator dots */}
      <div className="flex justify-center items-center space-x-3 mt-4">
        {banners.map((_, index) => (
          <motion.button
            key={index}
            onClick={() => goToIndex(index)}
            className="focus:outline-none"
            aria-label={`Go to slide ${index + 1}`}
            whileTap={{ scale: 0.95 }}
          >
            <motion.div
              className="bg-white rounded-sm overflow-hidden"
              animate={{
                width: currentIndex === index ? "40px" : "8px",
                height: currentIndex === index ? "4px" : "8px",
                borderRadius: currentIndex === index ? "2px" : "4px",
                opacity: currentIndex === index ? 1 : 0.5,
              }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
            >
              {currentIndex === index && (
                <motion.div
                  className="h-full bg-white"
                  initial={{ width: "0%" }}
                  animate={{ width: "100%" }}
                  transition={{
                    duration: rotationInterval / 1000,
                    ease: "linear",
                  }}
                  key={`progress-${currentIndex}`}
                />
              )}
            </motion.div>
          </motion.button>
        ))}
      </div>
    </div>
  );
};

export default BannerCarousel;
