# Structured Data Implementation Guide

## Overview

This guide covers the enhanced structured data (Schema.org) implementation for DezenMart, including Product schemas, Review schemas, FAQ schemas, HowTo guides, and more.

---

## Available Schema Generators

All schema generators are located in `src/utils/seo/seoConfig.ts`.

### 1. **Product Schema** (`generateProductSchema`)

Used for product detail pages to show rich snippets in search results.

**Features:**
- Product name, description, price
- Product images
- Availability status
- Seller information
- Aggregate ratings and review count
- Category information

**Usage:**

```typescript
import { generateProductSchema } from '../utils/seo/seoConfig';

const productSchema = generateProductSchema({
  name: "iPhone 15 Pro",
  description: "Latest iPhone with A17 Pro chip",
  price: 999.99,
  currency: "USD",
  images: ["https://example.com/image1.jpg", "https://example.com/image2.jpg"],
  category: "Electronics",
  seller: { name: "Apple Store" },
  rating: 4.5,
  reviewCount: 120,
});

// Use with useSEO hook
useSEO({
  structuredData: [productSchema],
});
```

**Result in Search:**
- Star ratings visible
- Price displayed
- Availability shown ("In Stock")
- Seller name

---

### 2. **Breadcrumb Schema** (`generateBreadcrumbSchema`)

Creates breadcrumb navigation for better site structure understanding.

**Usage:**

```typescript
import { generateBreadcrumbSchema, SEO_CONFIG } from '../utils/seo/seoConfig';

const breadcrumbSchema = generateBreadcrumbSchema([
  { name: "Home", url: SEO_CONFIG.siteUrl },
  { name: "Products", url: `${SEO_CONFIG.siteUrl}/product` },
  { name: "Electronics", url: `${SEO_CONFIG.siteUrl}/product/category/electronics` },
  { name: "iPhone 15 Pro", url: `${SEO_CONFIG.siteUrl}/product/123` },
]);

useSEO({
  structuredData: [breadcrumbSchema],
});
```

**Result in Search:**
- Breadcrumb trail in search results
- Better navigation context

---

### 3. **FAQ Schema** (`generateFAQSchema`)

Used to display FAQs directly in search results as expandable sections.

**Features:**
- Questions and answers
- Expandable in Google search results
- Increases SERP real estate

**Usage:**

```typescript
import { generateFAQSchema } from '../utils/seo/seoConfig';
import { FAQ_DATA } from '../data/faq';

const faqSchema = generateFAQSchema(
  FAQ_DATA.slice(0, 10).map(faq => ({
    question: faq.question,
    answer: faq.answer,
  }))
);

useSEO({
  structuredData: [faqSchema],
});
```

**Result in Search:**
- FAQ accordion directly in Google results
- "People also ask" section enrichment

---

### 4. **Review Schema** (`generateReviewSchema`, `generateAggregateReviewSchema`)

For individual reviews and aggregate rating summaries.

**Single Review:**

```typescript
import { generateReviewSchema } from '../utils/seo/seoConfig';

const reviewSchema = generateReviewSchema({
  author: "John Doe",
  rating: 5,
  reviewBody: "Excellent product! Fast shipping and great quality.",
  datePublished: "2025-01-14",
  productName: "iPhone 15 Pro",
});

useSEO({
  structuredData: [reviewSchema],
});
```

**Aggregate Reviews (Multiple Reviews):**

```typescript
import { generateAggregateReviewSchema } from '../utils/seo/seoConfig';

const aggregateSchema = generateAggregateReviewSchema(
  [
    {
      author: "Jane Smith",
      rating: 5,
      reviewBody: "Love it!",
      datePublished: "2025-01-14",
    },
    {
      author: "Bob Johnson",
      rating: 4,
      reviewBody: "Very good product",
      datePublished: "2025-01-13",
    },
  ],
  {
    name: "iPhone 15 Pro",
    averageRating: 4.5,
    reviewCount: 120,
  }
);

useSEO({
  structuredData: [aggregateSchema],
});
```

**Result in Search:**
- Star ratings in search results
- Review count displayed
- Snippet of review text

---

### 5. **HowTo Schema** (`generateHowToSchema`)

For step-by-step guides and tutorials.

**Usage:**

```typescript
import { generateHowToSchema } from '../utils/seo/seoConfig';

const howToSchema = generateHowToSchema({
  name: "How to Buy Products with Cryptocurrency on DezenMart",
  description: "A step-by-step guide to making your first crypto purchase on DezenMart",
  totalTime: "PT5M", // 5 minutes (ISO 8601 format)
  image: ["https://dezenmart.com/guides/crypto-shopping.jpg"],
  steps: [
    {
      name: "Connect Your Wallet",
      text: "Click the 'Connect Wallet' button and select your preferred wallet (MetaMask, Coinbase Wallet, etc.)",
      image: "https://dezenmart.com/guides/step1.jpg",
    },
    {
      name: "Browse Products",
      text: "Browse our product catalog and add items to your cart. Prices are shown in both crypto and USD.",
    },
    {
      name: "Complete Checkout",
      text: "Review your cart, select your payment token, and confirm the transaction in your wallet.",
    },
    {
      name: "Confirm Delivery",
      text: "Once you receive your order, confirm delivery to release escrow funds to the seller.",
    },
  ],
});

useSEO({
  structuredData: [howToSchema],
});
```

**Result in Search:**
- Rich "HowTo" card with step-by-step instructions
- Featured snippet potential
- Voice search optimization

**Time Format Guide (ISO 8601 Duration):**
- `PT5M` = 5 minutes
- `PT1H` = 1 hour
- `PT1H30M` = 1 hour 30 minutes
- `P1D` = 1 day

---

### 6. **Offer Schema** (`generateOfferSchema`)

For special promotions, deals, and limited-time offers.

**Usage:**

```typescript
import { generateOfferSchema } from '../utils/seo/seoConfig';

const offerSchema = generateOfferSchema({
  name: "20% Off Electronics",
  description: "Get 20% off all electronics when you pay with cUSD",
  price: 799.99,
  currency: "USD",
  validFrom: "2025-01-14",
  validThrough: "2025-01-31",
  availability: "https://schema.org/InStock",
  seller: "DezenMart",
});

useSEO({
  structuredData: [offerSchema],
});
```

**Result in Search:**
- Special offer badge
- Valid dates displayed
- Price and discount info

---

### 7. **Video Schema** (`generateVideoSchema`)

For product videos, tutorials, and promotional content.

**Usage:**

```typescript
import { generateVideoSchema } from '../utils/seo/seoConfig';

const videoSchema = generateVideoSchema({
  name: "iPhone 15 Pro Unboxing & Review",
  description: "Complete unboxing and hands-on review of the iPhone 15 Pro",
  thumbnailUrl: "https://dezenmart.com/videos/iphone-thumb.jpg",
  uploadDate: "2025-01-14",
  contentUrl: "https://dezenmart.com/videos/iphone-review.mp4",
  embedUrl: "https://www.youtube.com/embed/VIDEO_ID",
  duration: "PT10M30S", // 10 minutes 30 seconds
});

useSEO({
  structuredData: [videoSchema],
});
```

**Result in Search:**
- Video thumbnail in search results
- Duration and upload date
- Direct video playback option

---

## Combining Multiple Schemas

You can use multiple schemas on the same page for maximum SEO benefit:

```typescript
import { useSEO } from '../hooks/useSEO';
import {
  generateProductSchema,
  generateBreadcrumbSchema,
  generateAggregateReviewSchema,
  generateHowToSchema,
  SEO_CONFIG,
} from '../utils/seo/seoConfig';

useSEO({
  title: "iPhone 15 Pro - Buy with Crypto | DezenMart",
  description: "Buy iPhone 15 Pro with cryptocurrency. Fast shipping, escrow protection, 120+ reviews.",
  structuredData: [
    // Product Schema
    generateProductSchema({
      name: "iPhone 15 Pro",
      description: "Latest iPhone with A17 Pro chip",
      price: 999.99,
      currency: "USD",
      images: ["/product-image.jpg"],
      rating: 4.5,
      reviewCount: 120,
    }),

    // Breadcrumb Schema
    generateBreadcrumbSchema([
      { name: "Home", url: SEO_CONFIG.siteUrl },
      { name: "Electronics", url: `${SEO_CONFIG.siteUrl}/product/category/electronics` },
      { name: "iPhone 15 Pro", url: `${SEO_CONFIG.siteUrl}/product/123` },
    ]),

    // Reviews Schema
    generateAggregateReviewSchema(
      reviews,
      {
        name: "iPhone 15 Pro",
        averageRating: 4.5,
        reviewCount: 120,
      }
    ),

    // HowTo Guide
    generateHowToSchema({
      name: "How to Buy iPhone with Crypto",
      description: "Step-by-step guide",
      steps: [/* ... */],
    }),
  ],
});
```

---

## FAQ Implementation

### Using Pre-Built FAQ Data

We've created a comprehensive FAQ dataset in `src/data/faq.ts`:

```typescript
import { FAQ_DATA, getFAQsByCategory, searchFAQs } from '../data/faq';

// Use all FAQs
const allFAQs = FAQ_DATA;

// Filter by category
const gettingStartedFAQs = getFAQsByCategory("Getting Started");
const paymentFAQs = getFAQsByCategory("Payments");

// Search FAQs
const cryptoFAQs = searchFAQs("cryptocurrency");

// Generate FAQ schema
const faqSchema = generateFAQSchema(
  allFAQs.map(faq => ({
    question: faq.question,
    answer: faq.answer,
  }))
);
```

### Available FAQ Categories

- **Getting Started** - Platform basics
- **Payments** - Crypto payments, stablecoins, fees
- **Security** - Escrow, safety, disputes
- **Wallets** - Web3 wallets, setup, configuration
- **Selling** - How to sell on DezenMart
- **Shipping** - Delivery, tracking, international shipping
- **Troubleshooting** - Common issues and solutions

---

## Testing & Validation

### 1. **Google Rich Results Test**

Test your structured data implementation:

1. Visit: https://search.google.com/test/rich-results
2. Enter your page URL or paste HTML
3. Verify all schemas are detected correctly

### 2. **Schema.org Validator**

Validate JSON-LD syntax:

1. Visit: https://validator.schema.org/
2. Paste your schema JSON
3. Check for errors or warnings

### 3. **Lighthouse SEO Audit**

Run Chrome Lighthouse:

```bash
# In Chrome DevTools
1. Open DevTools (F12)
2. Go to "Lighthouse" tab
3. Select "SEO" category
4. Click "Generate report"
```

---

## Best Practices

### 1. **Keep Schemas Accurate**

❌ **Bad:**
```typescript
price: 19.99,  // Actual price is 29.99
```

✅ **Good:**
```typescript
price: product.price, // Use actual product price
```

### 2. **Use Specific Descriptions**

❌ **Bad:**
```typescript
description: "Great product"
```

✅ **Good:**
```typescript
description: "iPhone 15 Pro with A17 Pro chip, 256GB storage, titanium design, and ProRAW camera"
```

### 3. **Include All Available Data**

Always include optional fields when available:

```typescript
generateProductSchema({
  // Required
  name: product.name,
  description: product.description,
  price: product.price,
  currency: "USD",
  images: product.images,

  // Optional but recommended
  category: product.category,        // ✅ Include
  seller: { name: seller.name },     // ✅ Include
  rating: product.averageRating,     // ✅ Include
  reviewCount: product.reviewCount,  // ✅ Include
});
```

### 4. **Update Structured Data with Product Changes**

When product details change (price, availability, reviews), structured data updates automatically via React hooks and state management.

---

## SEO Impact & Benefits

### Expected Improvements

✅ **Higher Click-Through Rates (CTR)**
- Star ratings visible in search results
- Rich snippets stand out from competitors
- More information displayed

✅ **Better Search Rankings**
- Google prefers well-structured data
- Enhanced understanding of content
- Eligibility for featured snippets

✅ **Voice Search Optimization**
- HowTo and FAQ schemas optimize for voice queries
- "Hey Google, how do I buy with crypto on DezenMart?"

✅ **Enhanced Mobile Results**
- Rich cards on mobile devices
- Better product discovery
- Improved user experience

### Measuring Success

**Google Search Console:**
- Monitor "Enhancements" section
- Check rich result performance
- Track impressions & clicks

**Analytics:**
- Organic traffic increase
- Lower bounce rates
- Higher engagement from search

---

## Common Issues & Troubleshooting

### Issue: Schema Not Showing in Rich Results Test

**Solution:**
1. Verify JSON-LD is in document `<head>`
2. Check for JavaScript errors preventing injection
3. Ensure `useSEO` hook is called in component
4. Wait 24-48 hours for Google to crawl updated pages

### Issue: "Missing required field" Error

**Solution:**
```typescript
// Make sure all required fields are included
generateProductSchema({
  name: product.name,          // ✅ Required
  description: product.desc,   // ✅ Required
  price: product.price,        // ✅ Required
  currency: "USD",            // ✅ Required
  images: product.images,     // ✅ Required
});
```

### Issue: Multiple Schemas Conflicting

**Solution:**
Each schema should be in its own object in the array:

```typescript
structuredData: [
  productSchema,      // ✅ Separate
  breadcrumbSchema,   // ✅ Separate
  reviewSchema,       // ✅ Separate
]
```

NOT:

```typescript
structuredData: productSchema + breadcrumbSchema  // ❌ Wrong
```

---

## Advanced Examples

### E-commerce Product Page (Complete)

```typescript
import { useSEO } from '../hooks/useSEO';
import {
  generateProductSchema,
  generateBreadcrumbSchema,
  generateAggregateReviewSchema,
  generateOfferSchema,
  generateVideoSchema,
  SEO_CONFIG,
} from '../utils/seo/seoConfig';

const ProductPage = ({ product, reviews }) => {
  useSEO({
    title: `${product.name} - Buy with Crypto | DezenMart`,
    description: product.description,
    image: product.images[0],
    type: "product",
    structuredData: [
      // 1. Product Schema
      generateProductSchema({
        name: product.name,
        description: product.description,
        price: product.price,
        currency: "USD",
        images: product.images,
        category: product.category,
        rating: product.averageRating,
        reviewCount: product.reviewCount,
      }),

      // 2. Breadcrumbs
      generateBreadcrumbSchema([
        { name: "Home", url: SEO_CONFIG.siteUrl },
        { name: "Products", url: `${SEO_CONFIG.siteUrl}/product` },
        { name: product.category, url: `${SEO_CONFIG.siteUrl}/product/category/${product.category.toLowerCase()}` },
        { name: product.name, url: `${SEO_CONFIG.siteUrl}/product/${product._id}` },
      ]),

      // 3. Reviews
      generateAggregateReviewSchema(
        reviews.map(r => ({
          author: r.user.name,
          rating: r.rating,
          reviewBody: r.comment,
          datePublished: new Date(r.createdAt).toISOString().split('T')[0],
        })),
        {
          name: product.name,
          averageRating: product.averageRating,
          reviewCount: product.reviewCount,
        }
      ),

      // 4. Special Offer (if applicable)
      product.isOnSale && generateOfferSchema({
        name: `${product.name} - Special Offer`,
        description: `Get ${product.discountPercent}% off`,
        price: product.salePrice,
        currency: "USD",
        validFrom: product.saleStartDate,
        validThrough: product.saleEndDate,
      }),

      // 5. Product Video (if available)
      product.videoUrl && generateVideoSchema({
        name: `${product.name} - Product Demo`,
        description: `Watch ${product.name} in action`,
        thumbnailUrl: product.videoThumbnail,
        uploadDate: product.videoUploadDate,
        contentUrl: product.videoUrl,
        duration: product.videoDuration,
      }),
    ].filter(Boolean), // Remove undefined schemas
  });

  return (
    // Component JSX...
  );
};
```

---

## Summary

You now have a comprehensive structured data implementation that includes:

✅ **Product Schema** - Rich snippets with prices, ratings, availability
✅ **Breadcrumb Schema** - Clear site hierarchy
✅ **FAQ Schema** - Featured in "People also ask"
✅ **Review Schema** - Star ratings in search results
✅ **HowTo Schema** - Step-by-step guides for featured snippets
✅ **Offer Schema** - Promotions and deals highlighted
✅ **Video Schema** - Video content enrichment

This implementation gives DezenMart a significant SEO advantage and improves visibility in search results, especially for e-commerce and crypto-related queries.

---

**Last Updated**: January 2025
**Maintained By**: SEO Team
**Version**: 2.0.0
