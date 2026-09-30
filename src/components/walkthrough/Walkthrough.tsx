import { useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useWalkthrough } from "../../context/WalkthroughContext";
import {
  HiShieldCheck,
  HiCurrencyDollar,
  HiShoppingCart,
  HiCheckCircle,
  HiSparkles,
} from "react-icons/hi2";
import { IoClose, IoChevronBack, IoChevronForward } from "react-icons/io5";

interface WalkthroughStep {
  title: string;
  description: string;
  icon: React.ReactNode;
  tips?: string[];
  illustration?: string;
}

const walkthroughSteps: WalkthroughStep[] = [
  {
    title: "Welcome to DezenFoods! 🍲",
    description:
      "Order snacks, small chops, groceries, pepper soup, rice meals and more from trusted vendors, with your payment protected until your food arrives.",
    icon: <HiSparkles className="w-12 h-12 text-Red" />,
    tips: [
      "Browse food by category or vendor",
      "Your money is protected in escrow",
      "Same DezenMart account you already use",
    ],
  },
  {
    title: "Build Your Order 🛒",
    description:
      "Add items to your cart from one vendor at a time, add notes like 'less pepper', and choose delivery or pickup.",
    icon: <HiShoppingCart className="w-12 h-12 text-Red" />,
    tips: [
      "Check prep time and any order cut-off on each item",
      "Dietary tags and allergens are listed on every item",
      "You see the full total before you pay",
    ],
  },
  {
    title: "Pay Your Way 💳",
    description:
      "Pay by card or bank transfer, use Pandascrow escrow, or pay with crypto where the vendor accepts it. You choose at checkout.",
    icon: <HiCurrencyDollar className="w-12 h-12 text-Red" />,
    tips: [
      "Card and bank payments through Korapay",
      "Escrow payments through Pandascrow",
      "Crypto wallet payments are optional",
    ],
  },
  {
    title: "Escrow Protection 🛡️",
    description:
      "Your payment is held safely until your order is delivered and you confirm you received it. The vendor only gets paid when you're happy.",
    icon: <HiShieldCheck className="w-12 h-12 text-Red" />,
    tips: [
      "Vendors can't access the money before you confirm",
      "Report a problem and the money stays held while we review",
      "Always pay inside the app - never to a vendor directly",
    ],
  },
  {
    title: "Track It & Enjoy 📦",
    description:
      "Follow your order from paid, to preparing, to on the way. Confirm when it arrives and leave the vendor a rating.",
    icon: <HiCheckCircle className="w-12 h-12 text-Red" />,
    tips: [
      "Get notified at every step",
      "Confirm delivery only when you have your food",
      "Cook or sell food? Apply to become a vendor from your account",
      "You can restart this tutorial anytime from settings",
    ],
  },
];

const Walkthrough = () => {
  const {
    isWalkthroughActive,
    currentStep,
    totalSteps,
    nextStep,
    previousStep,
    skipWalkthrough,
    completeWalkthrough,
  } = useWalkthrough();

  const isLastStep = currentStep === totalSteps - 1;
  const isFirstStep = currentStep === 0;
  const step = walkthroughSteps[currentStep];

  // Prevent body scroll when walkthrough is active
  useEffect(() => {
    if (isWalkthroughActive) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isWalkthroughActive]);

  // Keyboard navigation
  useEffect(() => {
    if (!isWalkthroughActive) return;

    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        skipWalkthrough();
      } else if (e.key === "ArrowRight" && !isLastStep) {
        nextStep();
      } else if (e.key === "ArrowLeft" && !isFirstStep) {
        previousStep();
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [
    isWalkthroughActive,
    isLastStep,
    isFirstStep,
    nextStep,
    previousStep,
    skipWalkthrough,
  ]);

  const handleNext = useCallback(() => {
    if (isLastStep) {
      completeWalkthrough();
    } else {
      nextStep();
    }
  }, [isLastStep, nextStep, completeWalkthrough]);

  if (!isWalkthroughActive) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm"
        onClick={(e) => {
          if (e.target === e.currentTarget) skipWalkthrough();
        }}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: "spring", duration: 0.5 }}
          className="relative w-full max-w-2xl mx-4 bg-[#212428] rounded-2xl shadow-2xl overflow-hidden"
        >
          {/* Close button */}
          <motion.button
            onClick={skipWalkthrough}
            className="absolute top-4 right-4 z-10 p-2 rounded-full bg-gray-700/50 hover:bg-gray-600 transition-colors"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            aria-label="Close walkthrough"
          >
            <IoClose className="w-6 h-6 text-white" />
          </motion.button>

          {/* Progress bar */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gray-700">
            <motion.div
              className="h-full bg-gradient-to-r from-Red to-red-400"
              initial={{ width: 0 }}
              animate={{
                width: `${((currentStep + 1) / totalSteps) * 100}%`,
              }}
              transition={{ duration: 0.3 }}
            />
          </div>

          {/* Content */}
          <div className="p-8 pt-12">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                {/* Icon */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{
                    type: "spring",
                    stiffness: 260,
                    damping: 20,
                  }}
                  className="flex justify-center"
                >
                  <div className="w-20 h-20 rounded-full bg-Red/10 flex items-center justify-center">
                    {step.icon}
                  </div>
                </motion.div>

                {/* Title */}
                <h2 className="text-2xl md:text-3xl font-bold text-white text-center">
                  {step.title}
                </h2>

                {/* Description */}
                <p className="text-gray-300 text-center text-base md:text-lg leading-relaxed">
                  {step.description}
                </p>

                {/* Tips */}
                {step.tips && step.tips.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-[#292B30] rounded-lg p-4 space-y-2"
                  >
                    <h3 className="text-sm font-semibold text-Red flex items-center gap-2">
                      <HiSparkles className="w-4 h-4" />
                      Quick Tips:
                    </h3>
                    <ul className="space-y-2">
                      {step.tips.map((tip, index) => (
                        <motion.li
                          key={index}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.1 * index }}
                          className="text-gray-400 text-sm flex items-start gap-2"
                        >
                          <span className="text-Red mt-0.5">•</span>
                          <span>{tip}</span>
                        </motion.li>
                      ))}
                    </ul>
                  </motion.div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Footer */}
          <div className="border-t border-gray-700 p-4 sm:p-6 bg-[#1A1B1F]">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-0">
              {/* Step indicator */}
              <div className="flex items-center gap-1.5 sm:gap-2 order-2 sm:order-1">
                {Array.from({ length: totalSteps }).map((_, index) => (
                  <motion.div
                    key={index}
                    className={`h-1.5 sm:h-2 rounded-full transition-all ${
                      index === currentStep
                        ? "w-6 sm:w-8 bg-Red"
                        : index < currentStep
                        ? "w-1.5 sm:w-2 bg-Red/50"
                        : "w-1.5 sm:w-2 bg-gray-600"
                    }`}
                    initial={false}
                    animate={{
                      scale: index === currentStep ? 1.2 : 1,
                    }}
                  />
                ))}
              </div>

              {/* Navigation buttons */}
              <div className="flex items-center gap-2 sm:gap-3 order-1 sm:order-2 w-full sm:w-auto justify-between sm:justify-end">
                {!isFirstStep && (
                  <motion.button
                    onClick={previousStep}
                    className="px-3 sm:px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white flex items-center gap-1 sm:gap-2 transition-colors text-sm sm:text-base"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    aria-label="Previous step"
                  >
                    <IoChevronBack className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span>Back</span>
                  </motion.button>
                )}

                {!isLastStep && (
                  <motion.button
                    onClick={skipWalkthrough}
                    className="px-3 sm:px-4 py-2 rounded-lg text-gray-400 hover:text-white transition-colors text-sm sm:text-base"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Skip
                  </motion.button>
                )}

                <motion.button
                  onClick={handleNext}
                  className="px-4 sm:px-6 py-2 rounded-lg bg-Red hover:bg-brand-hover text-white flex items-center gap-1 sm:gap-2 font-semibold transition-colors text-sm sm:text-base whitespace-nowrap"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <span className="hidden xs:inline">{isLastStep ? "Get Started" : "Next"}</span>
                  <span className="xs:hidden">{isLastStep ? "Start" : "Next"}</span>
                  {!isLastStep && <IoChevronForward className="w-4 h-4 sm:w-5 sm:h-5" />}
                </motion.button>
              </div>
            </div>

            {/* Keyboard hints */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-xs text-gray-500 text-center mt-3 sm:mt-4 hidden sm:block"
            >
              Use arrow keys to navigate • Press ESC to skip
            </motion.p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default Walkthrough;
