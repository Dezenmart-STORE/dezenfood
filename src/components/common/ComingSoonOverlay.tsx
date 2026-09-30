import { memo, useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { FaClock, FaBell } from "react-icons/fa";

interface ComingSoonOverlayProps {
  title?: string;
  description?: string;
  features?: string[];
  onNotifyMe?: () => void;
  onClose?: () => void;
  className?: string;
  backgroundOpacity?: number;
}

const ComingSoonOverlay = memo<ComingSoonOverlayProps>(
  ({
    title = "P2P Trading Coming Soon",
    description = "Connect directly with sellers who are online now for instant communication and faster transactions.",
    features = [
      "Real-time seller availability",
      "Instant messaging with sellers",
      "Quick order processing",
      "Secure peer-to-peer transactions",
    ],
    onNotifyMe,
    onClose,
    className = "",
    backgroundOpacity = 0.95,
  }) => {
    const [isVisible, setIsVisible] = useState(false);
    const [showNotification, setShowNotification] = useState(false);

    useEffect(() => {
      // Smooth entrance animation
      const timer = setTimeout(() => setIsVisible(true), 100);
      
      // Add escape key listener
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          console.log("Escape key pressed, calling handleClose");
          handleClose();
        }
      };
      
      document.addEventListener('keydown', handleEscape);
      
      return () => {
        clearTimeout(timer);
        document.removeEventListener('keydown', handleEscape);
      };
    }, [onClose]);

    const handleNotifyMe = useCallback(() => {
      if (onNotifyMe) {
        onNotifyMe();
      }
      setShowNotification(true);
      setTimeout(() => setShowNotification(false), 3000);
    }, [onNotifyMe]);

    const handleClose = useCallback(() => {
      console.log("Close button clicked! onClose:", onClose);
      if (onClose) {
        console.log("Setting modal to invisible and calling onClose");
        setIsVisible(false);
        // Small delay to allow exit animation to complete
        setTimeout(() => {
          console.log("Calling onClose after delay");
          onClose();
        }, 300);
      } else {
        console.log("No onClose provided, just hiding modal");
        setIsVisible(false);
      }
    }, [onClose]);

    const overlayVariants: Variants = {
      hidden: { opacity: 0, backdropFilter: "blur(0px)" },
      visible: {
        opacity: 1,
        backdropFilter: "blur(8px)",
        transition: { duration: 0.5, ease: "easeOut" },
      },
    };

    const contentVariants: Variants = {
      hidden: { opacity: 0, y: 30, scale: 0.9 },
      visible: {
        opacity: 1,
        y: 0,
        scale: 1,
        transition: { duration: 0.6, ease: "easeOut", delay: 0.2 },
      },
    };

    return (
      <AnimatePresence>
        {isVisible && (
          <motion.div
            variants={overlayVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${className}`}
            style={{
              backgroundColor: `rgba(33, 36, 40, ${backgroundOpacity})`,
            }}
            onClick={() => {
              console.log("Overlay background clicked, calling handleClose");
              handleClose();
            }}
          >
            <motion.div
              variants={contentVariants}
              className="relative max-w-md w-full bg-[#212428] rounded-2xl border border-[#292B30] shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header with Icon */}
              <div className="relative bg-gradient-to-r from-[#f97316] to-[#ea580c] p-6 text-center">
                {/* Close Button */}
                <button
                  onClick={handleClose}
                  className="absolute top-4 right-4 w-8 h-8 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-all duration-200 group z-10"
                  aria-label="Close modal"
                  style={{ zIndex: 1000 }}
                >
                  <svg
                    className="w-4 h-4 text-white group-hover:scale-110 transition-transform duration-200"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>

                <motion.div
                  initial={{ rotate: 0 }}
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  className="inline-flex items-center justify-center w-16 h-16 bg-white/10 rounded-full backdrop-blur-sm mb-4"
                >
                  <FaClock className="text-white text-2xl" />
                </motion.div>

                <h2 className="text-xl font-bold text-white mb-2">{title}</h2>
                <p className="text-white/90 text-sm leading-relaxed">
                  {description}
                </p>
              </div>

              {/* Features List */}
              <div className="p-6 space-y-4">
                <h3 className="text-white font-semibold text-sm uppercase tracking-wide mb-3">
                  What's Coming:
                </h3>

                <div className="space-y-3">
                  {features.map((feature, index) => (
                    <motion.div
                      key={feature}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.4 + index * 0.1 }}
                      className="flex items-center space-x-3"
                    >
                      <div className="w-2 h-2 bg-[#f97316] rounded-full flex-shrink-0" />
                      <span className="text-white/80 text-sm">{feature}</span>
                    </motion.div>
                  ))}
                </div>

                {/* Notify Button */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleNotifyMe}
                  className="w-full mt-6 bg-[#f97316] hover:bg-[#ea580c] text-white font-medium py-3 px-4 rounded-lg transition-all duration-200 flex items-center justify-center space-x-2"
                >
                  <FaBell className="text-sm" />
                  <span>Notify Me When Available</span>
                </motion.button>

                {/* Success Notification */}
                <AnimatePresence>
                  {showNotification && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="bg-green-500/20 border border-green-500/30 text-green-400 p-3 rounded-lg text-sm text-center"
                    >
                      ✓ We'll notify you when P2P trading is available!
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    );
  }
);

ComingSoonOverlay.displayName = "ComingSoonOverlay";

export default ComingSoonOverlay;
