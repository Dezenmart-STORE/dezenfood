import { z } from 'zod';

// User Profile Validation
export const userProfileSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be less than 100 characters')
    .optional(),

  email: z
    .string()
    .email('Invalid email address')
    .optional(),

  phoneNumber: z
    .string()
    .regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format')
    .optional()
    .or(z.literal('')),

  address: z
    .string()
    .min(10, 'Address must be at least 10 characters')
    .max(500, 'Address must be less than 500 characters')
    .optional()
    .or(z.literal('')),

  dateOfBirth: z
    .string()
    .refine((date) => {
      const birthDate = new Date(date);
      const age = new Date().getFullYear() - birthDate.getFullYear();
      return age >= 13 && age <= 120;
    }, 'You must be at least 13 years old')
    .optional()
    .or(z.literal('')),

  profileImage: z
    .instanceof(File)
    .refine((file) => file.size <= 5 * 1024 * 1024, 'Image must be less than 5MB')
    .refine(
      (file) => ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'].includes(file.type),
      'Only JPEG, PNG, and WebP images are allowed'
    )
    .optional(),
});

// Product Creation/Update Validation
export const productSchema = z.object({
  name: z
    .string()
    .min(3, 'Product name must be at least 3 characters')
    .max(200, 'Product name must be less than 200 characters'),

  description: z
    .string()
    .min(10, 'Description must be at least 10 characters')
    .max(5000, 'Description must be less than 5000 characters'),

  price: z
    .number()
    .positive('Price must be greater than 0')
    .max(1000000, 'Price cannot exceed 1,000,000'),

  category: z
    .string()
    .min(1, 'Category is required'),

  stock: z
    .number()
    .int('Stock must be a whole number')
    .nonnegative('Stock cannot be negative')
    .or(z.string().regex(/^\d+$/, 'Stock must be a valid number')),

  paymentToken: z
    .string()
    .min(1, 'Payment token is required'),

  logisticsProviders: z
    .array(z.string())
    .min(1, 'At least one logistics provider is required'),

  logisticsCost: z
    .array(z.string())
    .min(1, 'Logistics costs are required'),

  images: z
    .array(
      z.instanceof(File).refine((file) => file.size <= 5 * 1024 * 1024, 'Each image must be less than 5MB')
    )
    .min(1, 'At least one product image is required')
    .max(5, 'Maximum 5 images allowed')
    .or(z.array(z.string()).min(1, 'At least one product image is required')), // Allow existing image URLs
});

// Order Creation Validation
export const orderSchema = z.object({
  productId: z
    .string()
    .min(1, 'Product ID is required'),

  quantity: z
    .number()
    .int('Quantity must be a whole number')
    .positive('Quantity must be greater than 0')
    .max(1000, 'Quantity cannot exceed 1000'),

  logisticsProvider: z
    .string()
    .min(1, 'Logistics provider is required'),

  logisticsCost: z
    .number()
    .nonnegative('Logistics cost cannot be negative'),
});

// Dispute Validation
export const disputeSchema = z.object({
  orderId: z
    .string()
    .min(1, 'Order ID is required'),

  reason: z
    .string()
    .min(20, 'Please provide at least 20 characters explaining the dispute')
    .max(1000, 'Dispute reason must be less than 1000 characters'),
});

// Review Validation
export const reviewSchema = z.object({
  orderId: z
    .string()
    .min(1, 'Order ID is required'),

  rating: z
    .number()
    .int('Rating must be a whole number')
    .min(1, 'Rating must be at least 1')
    .max(5, 'Rating cannot exceed 5'),

  comment: z
    .string()
    .min(10, 'Review must be at least 10 characters')
    .max(1000, 'Review must be less than 1000 characters')
    .optional()
    .or(z.literal('')),
});

// Message Validation
export const messageSchema = z.object({
  recipient: z
    .string()
    .min(1, 'Recipient is required'),

  content: z
    .string()
    .min(1, 'Message cannot be empty')
    .max(5000, 'Message must be less than 5000 characters'),

  order: z
    .string()
    .optional(),
});

// Wallet Address Validation
export const walletAddressSchema = z
  .string()
  .regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address');

// Trade Validation
export const tradeSchema = z.object({
  seller: walletAddressSchema,

  productCost: z
    .number()
    .positive('Product cost must be greater than 0')
    .or(z.string().regex(/^\d+(\.\d+)?$/, 'Invalid product cost')),

  logisticsProvider: walletAddressSchema,

  logisticsCost: z
    .number()
    .nonnegative('Logistics cost cannot be negative')
    .or(z.string().regex(/^\d+(\.\d+)?$/, 'Invalid logistics cost')),

  orderId: z
    .string()
    .min(1, 'Order ID is required'),
});

// Search Query Validation
export const searchQuerySchema = z.object({
  query: z
    .string()
    .min(2, 'Search query must be at least 2 characters')
    .max(100, 'Search query must be less than 100 characters'),

  category: z
    .string()
    .optional(),

  minPrice: z
    .number()
    .nonnegative('Minimum price cannot be negative')
    .optional(),

  maxPrice: z
    .number()
    .positive('Maximum price must be greater than 0')
    .optional(),
});

// Referral Code Validation
export const referralCodeSchema = z
  .string()
  .regex(/^[A-Z0-9]{6,12}$/, 'Invalid referral code format');

// Amount Validation (for token operations)
export const amountSchema = z
  .string()
  .regex(/^\d+(\.\d+)?$/, 'Invalid amount format')
  .refine((val) => parseFloat(val) > 0, 'Amount must be greater than 0');

// Pagination Validation
export const paginationSchema = z.object({
  page: z
    .number()
    .int('Page must be a whole number')
    .positive('Page must be greater than 0')
    .default(1),

  limit: z
    .number()
    .int('Limit must be a whole number')
    .positive('Limit must be greater than 0')
    .max(100, 'Limit cannot exceed 100')
    .default(20),
});

// Export types inferred from schemas
export type UserProfileInput = z.infer<typeof userProfileSchema>;
export type ProductInput = z.infer<typeof productSchema>;
export type OrderInput = z.infer<typeof orderSchema>;
export type DisputeInput = z.infer<typeof disputeSchema>;
export type ReviewInput = z.infer<typeof reviewSchema>;
export type MessageInput = z.infer<typeof messageSchema>;
export type TradeInput = z.infer<typeof tradeSchema>;
export type SearchQueryInput = z.infer<typeof searchQuerySchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;
