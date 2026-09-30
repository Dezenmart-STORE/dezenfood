import { FC } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

export interface BannerProps {
  title: string;
  subtitle: string;
  isUppercase?: boolean;
  primaryImage?: string;
  /** Shown instead of images when set (brand-agnostic art until real assets exist) */
  emoji?: string;
  secondaryImage?: string;
  backgroundColor?: string;
  textColor?: string;
  ctaText?: string;
  ctaPath?: string;
}

const Banner: FC<BannerProps> = ({
  title,
  subtitle,
  isUppercase = true,
  primaryImage,
  emoji,
  secondaryImage,
  backgroundColor = "#f97316",
  textColor = "white",
  ctaText,
  ctaPath,
}) => {
  return (
    <motion.div
      className="flex justify-between items-center px-4 sm:px-6 rounded-lg overflow-hidden"
      style={{ backgroundColor }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className={`text-${textColor} p-4 sm:p-5`}>
        <h5 className="text-base md:text-xl font-medium leading-snug">
          {title}{" "}
          <span
            className={`font-bold block md:inline ${
              isUppercase ? "uppercase" : ""
            }`}
          >
            {subtitle}
          </span>
        </h5>
        {ctaText && ctaPath && (
          <Link
            to={ctaPath}
            className="mt-3 inline-block bg-white/20 hover:bg-white/30 text-white text-sm font-medium px-4 py-1.5 rounded-full transition-colors"
          >
            {ctaText} →
          </Link>
        )}
      </div>

      <div className="flex items-center justify-center flex-shrink-0">
        {emoji && (
          <motion.span
            aria-hidden="true"
            className="text-5xl md:text-7xl leading-none"
            initial={{ rotate: -10 }}
            animate={{ rotate: 0 }}
            transition={{ duration: 0.5 }}
          >
            {emoji}
          </motion.span>
        )}
        {primaryImage && <motion.img
          src={primaryImage}
          alt=""
          className="w-[50px] h-[50px] md:w-[90px] md:h-[90px]"
          initial={{ rotate: -10 }}
          animate={{ rotate: 0 }}
          transition={{ duration: 0.5 }}
        />}
        {secondaryImage && (
          <motion.img
            src={secondaryImage}
            alt=""
            className="w-[30px] h-[30px] md:w-[69px] md:h-[67px]"
            initial={{ rotate: 10, scale: 0.8 }}
            animate={{ rotate: 0, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          />
        )}
      </div>
    </motion.div>
  );
};

export default Banner;
