import { describe, it, expect } from 'vitest';
import {
  userProfileSchema,
  productSchema,
  orderSchema,
  walletAddressSchema,
  amountSchema,
  messageSchema,
} from '../utils/validation/schemas';

describe('Validation Schemas', () => {
  describe('userProfileSchema', () => {
    it('should validate correct user profile data', () => {
      const validData = {
        name: 'John Doe',
        email: 'john@example.com',
        phoneNumber: '+1234567890',
        address: '123 Main St, City, Country',
      };

      const result = userProfileSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject invalid email', () => {
      const invalidData = {
        email: 'invalid-email',
      };

      const result = userProfileSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject short names', () => {
      const invalidData = {
        name: 'A',
      };

      const result = userProfileSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('productSchema', () => {
    it('should validate correct product data', () => {
      const validData = {
        name: 'Test Product',
        description: 'This is a test product with a detailed description',
        price: 100,
        category: 'Electronics',
        stock: 50,
        paymentToken: 'cUSD',
        logisticsProviders: ['provider1'],
        logisticsCost: ['10'],
        images: ['https://example.com/image.jpg'],
      };

      const result = productSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject negative price', () => {
      const invalidData = {
        name: 'Test Product',
        description: 'This is a test product',
        price: -100,
        category: 'Electronics',
        stock: 50,
        paymentToken: 'cUSD',
        logisticsProviders: ['provider1'],
        logisticsCost: ['10'],
        images: ['https://example.com/image.jpg'],
      };

      const result = productSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should require at least one image', () => {
      const invalidData = {
        name: 'Test Product',
        description: 'This is a test product',
        price: 100,
        category: 'Electronics',
        stock: 50,
        paymentToken: 'cUSD',
        logisticsProviders: ['provider1'],
        logisticsCost: ['10'],
        images: [],
      };

      const result = productSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('orderSchema', () => {
    it('should validate correct order data', () => {
      const validData = {
        productId: '507f1f77bcf86cd799439011',
        quantity: 2,
        logisticsProvider: 'provider1',
        logisticsCost: 10,
      };

      const result = orderSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject zero or negative quantity', () => {
      const invalidData = {
        productId: '507f1f77bcf86cd799439011',
        quantity: 0,
        logisticsProvider: 'provider1',
        logisticsCost: 10,
      };

      const result = orderSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('walletAddressSchema', () => {
    it('should validate correct Ethereum address', () => {
      const validAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0';
      const result = walletAddressSchema.safeParse(validAddress);
      expect(result.success).toBe(true);
    });

    it('should reject invalid Ethereum address', () => {
      const invalidAddresses = [
        '0x123', // Too short
        '742d35Cc6634C0532925a3b844Bc9e7595f0bEb', // Missing 0x
        '0xGGGd35Cc6634C0532925a3b844Bc9e7595f0bEb', // Invalid hex
      ];

      invalidAddresses.forEach((address) => {
        const result = walletAddressSchema.safeParse(address);
        expect(result.success).toBe(false);
      });
    });
  });

  describe('amountSchema', () => {
    it('should validate correct amounts', () => {
      const validAmounts = ['100', '100.50', '0.001'];

      validAmounts.forEach((amount) => {
        const result = amountSchema.safeParse(amount);
        expect(result.success).toBe(true);
      });
    });

    it('should reject invalid amounts', () => {
      const invalidAmounts = ['0', '-100', 'abc', ''];

      invalidAmounts.forEach((amount) => {
        const result = amountSchema.safeParse(amount);
        expect(result.success).toBe(false);
      });
    });
  });

  describe('messageSchema', () => {
    it('should validate correct message data', () => {
      const validData = {
        recipient: '507f1f77bcf86cd799439011',
        content: 'Hello, this is a test message',
      };

      const result = messageSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject empty message content', () => {
      const invalidData = {
        recipient: '507f1f77bcf86cd799439011',
        content: '',
      };

      const result = messageSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject overly long messages', () => {
      const invalidData = {
        recipient: '507f1f77bcf86cd799439011',
        content: 'a'.repeat(5001), // Exceeds 5000 character limit
      };

      const result = messageSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });
});
