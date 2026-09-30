/**
 * SEO Configuration
 * Central configuration for all SEO-related settings
 */

import { BRAND } from "../../config/brand";

export const SEO_CONFIG = {
  // Site Information
  siteName: BRAND.name,
  siteUrl: BRAND.siteUrl,
  defaultTitle: `${BRAND.name} - Order Food Online | Escrow-Protected Payments`,
  titleTemplate: `%s | ${BRAND.name}`,
  defaultDescription: BRAND.description,
  defaultKeywords: [...BRAND.keywords],

  // Social Media
  social: {
    twitter: BRAND.social.twitterHandle,
    twitterCreator: BRAND.social.twitterHandle,
    linkedin: "company/dezenmart",
  },

  // Open Graph
  openGraph: {
    type: "website",
    locale: "en_NG",
    siteName: BRAND.name,
    images: {
      default: BRAND.assets.logoFull, // 1200x630px
      logo: BRAND.assets.logo,
    },
  },

  // Twitter Card
  twitterCard: {
    cardType: "summary_large_image",
    site: BRAND.social.twitterHandle,
    creator: BRAND.social.twitterHandle,
  },

  // Verification
  verification: {
    google: "your-google-verification-code", // Add Google Search Console verification
    bing: "your-bing-verification-code", // Add Bing Webmaster verification
  },

  // Organization Schema
  organization: {
    name: BRAND.name,
    legalName: BRAND.legalName,
    url: BRAND.siteUrl,
    logo: `${BRAND.siteUrl}${BRAND.assets.logo}`,
    foundingDate: "2024",
    founders: [],
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "Customer Service",
      email: BRAND.supportEmail,
      availableLanguage: ["English"],
    },
    sameAs: [BRAND.social.twitterUrl, BRAND.social.linkedinUrl],
  },

  // Breadcrumb
  breadcrumb: {
    showOnAllPages: true,
    separator: "›",
  },

  // Robots
  robots: {
    index: true,
    follow: true,
    maxSnippet: -1,
    maxImagePreview: "large",
    maxVideoPreview: -1,
  },
} as const;

/**
 * Page-specific SEO configurations
 */
export const PAGE_SEO: Record<
  string,
  {
    title: string;
    description: string;
    keywords?: string[];
    noindex?: boolean;
  }
> = {
  home: {
    title: "Order Food Online from Trusted Vendors",
    description:
      "Snacks, small chops, groceries, pepper soup, rice meals and more from trusted vendors. Pay with card, bank or crypto - your money stays in escrow until your food arrives.",
    keywords: ["order food online", "small chops", "snacks", "rice meals", "pepper soup", "groceries"],
  },
  products: {
    title: "Browse Food & Groceries",
    description:
      "Browse snacks, small chops, groceries, pepper soup and rice meals from vendors near you. Escrow protection on every order.",
    keywords: ["food delivery", "buy food online", "small chops", "groceries online"],
  },
  login: {
    title: "Sign In - Access Your Account",
    description:
      `Sign in to ${BRAND.name} to manage your orders, track deliveries and reorder your favourites. One DezenMart identity, every service.`,
    noindex: true,
  },
  account: {
    title: "My Account - Orders & Profile",
    description:
      `Manage your ${BRAND.name} account, view order history, track deliveries and update your preferences.`,
    noindex: true,
  },
  trades: {
    title: "My Orders - Active & Completed",
    description:
      `View your active and completed ${BRAND.name} orders. Track status, confirm delivery and manage escrow payments.`,
    noindex: true,
  },
  community: {
    title: "Community - Food Lovers & Vendors",
    description:
      `Join the ${BRAND.name} community. Share experiences, discover new vendors and get help.`,
  },
  referral: {
    title: "Referral Program - Earn Rewards",
    description:
      `Invite friends to ${BRAND.name} and earn rewards for every successful referral.`,
    keywords: ["referral program", "earn rewards"],
  },
};

/**
 * Generate canonical URL
 */
export const getCanonicalUrl = (path: string): string => {
  const cleanPath = path.replace(/\/$/, ""); // Remove trailing slash
  return `${SEO_CONFIG.siteUrl}${cleanPath}`;
};

/**
 * Generate structured data for products
 */
export const generateProductSchema = (product: {
  name: string;
  description: string;
  price: number;
  currency: string;
  images: string[];
  category?: string;
  seller?: { name: string };
  rating?: number;
  reviewCount?: number;
}) => {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    image: product.images,
    offers: {
      "@type": "Offer",
      price: product.price,
      priceCurrency: product.currency || "NGN",
      availability: "https://schema.org/InStock",
      priceValidUntil: `${new Date().getFullYear()}-12-31`,
      seller: {
        "@type": "Organization",
        name: product.seller?.name || `${BRAND.name} Vendor`,
      },
    },
    ...(product.rating && {
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: product.rating,
        reviewCount: product.reviewCount || 0,
        bestRating: 5,
        worstRating: 1,
      },
    }),
    ...(product.category && {
      category: product.category,
    }),
  };
};

/**
 * Generate breadcrumb structured data
 */
export const generateBreadcrumbSchema = (
  items: Array<{ name: string; url: string }>
) => {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
};

/**
 * Generate FAQ structured data
 */
export const generateFAQSchema = (
  faqs: Array<{ question: string; answer: string }>
) => {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };
};

/**
 * Generate review structured data
 */
export const generateReviewSchema = (review: {
  author: string;
  rating: number;
  reviewBody: string;
  datePublished: string;
  productName?: string;
}) => {
  return {
    "@context": "https://schema.org",
    "@type": "Review",
    ...(review.productName && {
      itemReviewed: {
        "@type": "Product",
        name: review.productName,
      },
    }),
    author: {
      "@type": "Person",
      name: review.author,
    },
    reviewRating: {
      "@type": "Rating",
      ratingValue: review.rating,
      bestRating: 5,
      worstRating: 1,
    },
    reviewBody: review.reviewBody,
    datePublished: review.datePublished,
  };
};

/**
 * Generate multiple reviews with aggregate rating
 */
export const generateAggregateReviewSchema = (reviews: Array<{
  author: string;
  rating: number;
  reviewBody: string;
  datePublished: string;
}>, product: {
  name: string;
  averageRating: number;
  reviewCount: number;
}) => {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: product.averageRating,
      reviewCount: product.reviewCount,
      bestRating: 5,
      worstRating: 1,
    },
    review: reviews.map(review => ({
      "@type": "Review",
      author: {
        "@type": "Person",
        name: review.author,
      },
      reviewRating: {
        "@type": "Rating",
        ratingValue: review.rating,
        bestRating: 5,
        worstRating: 1,
      },
      reviewBody: review.reviewBody,
      datePublished: review.datePublished,
    })),
  };
};

/**
 * Generate HowTo structured data
 */
export const generateHowToSchema = (howTo: {
  name: string;
  description: string;
  totalTime?: string; // ISO 8601 duration format (PT30M = 30 minutes)
  steps: Array<{
    name: string;
    text: string;
    image?: string;
    url?: string;
  }>;
  image?: string[];
}) => {
  return {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: howTo.name,
    description: howTo.description,
    ...(howTo.totalTime && { totalTime: howTo.totalTime }),
    ...(howTo.image && { image: howTo.image }),
    step: howTo.steps.map((step, index) => ({
      "@type": "HowToStep",
      position: index + 1,
      name: step.name,
      text: step.text,
      ...(step.image && { image: step.image }),
      ...(step.url && { url: step.url }),
    })),
  };
};

/**
 * Generate Offer structured data (for promotions/deals)
 */
export const generateOfferSchema = (offer: {
  name: string;
  description: string;
  price: number;
  currency: string;
  validFrom: string;
  validThrough: string;
  availability?: string;
  seller?: string;
}) => {
  return {
    "@context": "https://schema.org",
    "@type": "Offer",
    name: offer.name,
    description: offer.description,
    price: offer.price,
    priceCurrency: offer.currency,
    priceValidUntil: offer.validThrough,
    validFrom: offer.validFrom,
    availability: offer.availability || "https://schema.org/InStock",
    seller: {
      "@type": "Organization",
      name: offer.seller || BRAND.name,
    },
  };
};

/**
 * Generate VideoObject structured data
 */
export const generateVideoSchema = (video: {
  name: string;
  description: string;
  thumbnailUrl: string;
  uploadDate: string;
  contentUrl: string;
  embedUrl?: string;
  duration?: string; // ISO 8601 duration format
}) => {
  return {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    name: video.name,
    description: video.description,
    thumbnailUrl: video.thumbnailUrl,
    uploadDate: video.uploadDate,
    contentUrl: video.contentUrl,
    ...(video.embedUrl && { embedUrl: video.embedUrl }),
    ...(video.duration && { duration: video.duration }),
  };
};

/**
 * Generate WebSite schema with sitelinks searchbox
 */
export const generateWebSiteSchema = () => {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SEO_CONFIG.siteName,
    url: SEO_CONFIG.siteUrl,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SEO_CONFIG.siteUrl}/product?search={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
};

/**
 * Generate Organization schema from central config
 */
export const generateOrganizationSchema = () => {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SEO_CONFIG.organization.name,
    legalName: SEO_CONFIG.organization.legalName,
    url: SEO_CONFIG.organization.url,
    logo: {
      "@type": "ImageObject",
      url: SEO_CONFIG.organization.logo,
    },
    foundingDate: SEO_CONFIG.organization.foundingDate,
    contactPoint: SEO_CONFIG.organization.contactPoint,
    sameAs: SEO_CONFIG.organization.sameAs,
  };
};
