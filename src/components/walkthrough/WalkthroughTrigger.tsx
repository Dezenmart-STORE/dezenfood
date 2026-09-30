import { motion } from "framer-motion";
import { HiQuestionMarkCircle, HiAcademicCap } from "react-icons/hi2";
import { useWalkthrough } from "../../context/WalkthroughContext";

interface WalkthroughTriggerProps {
  variant?: "button" | "icon" | "text";
  className?: string;
}

const WalkthroughTrigger = ({
  variant = "button",
  className = "",
}: WalkthroughTriggerProps) => {
  const { resetWalkthrough, hasCompletedWalkthrough } = useWalkthrough();

  const handleClick = () => {
    resetWalkthrough();
  };

  if (variant === "icon") {
    return (
      <motion.button
        onClick={handleClick}
        className={`p-2 rounded-full hover:bg-[#292B30] transition-colors relative ${className}`}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        aria-label="Start tutorial"
        title="Learn how to use DezenFoods"
      >
        <HiQuestionMarkCircle className="text-2xl text-white" />
        {!hasCompletedWalkthrough && (
          <motion.span
            className="absolute top-1 right-1 w-2 h-2 bg-Red rounded-full"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ repeat: Infinity, duration: 2 }}
          />
        )}
      </motion.button>
    );
  }

  if (variant === "text") {
    return (
      <motion.button
        onClick={handleClick}
        className={`text-sm text-gray-400 hover:text-white transition-colors flex items-center gap-2 ${className}`}
        whileHover={{ x: 2 }}
      >
        <HiAcademicCap className="w-4 h-4" />
        <span>View Tutorial</span>
      </motion.button>
    );
  }

  return (
    <motion.button
      onClick={handleClick}
      className={`px-4 py-2 rounded-lg bg-Red/10 border border-Red/30 text-Red hover:bg-Red/20 transition-colors flex items-center gap-2 ${className}`}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      <HiAcademicCap className="w-5 h-5" />
      <span className="font-medium">Start Tutorial</span>
    </motion.button>
  );
};

export default WalkthroughTrigger;
