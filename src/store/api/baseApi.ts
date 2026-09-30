import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { BaseQueryFn, FetchArgs, FetchBaseQueryError } from '@reduxjs/toolkit/query';

import { BRAND } from '../../config/brand';

const API_URL = import.meta.env.VITE_API_URL;

// Custom base query with auth token injection
const baseQueryWithAuth: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (
  args,
  api,
  extraOptions
) => {
  const baseQuery = fetchBaseQuery({
    baseUrl: API_URL,
    prepareHeaders: (headers) => {
      // Get token from localStorage (will be replaced with cookies later)
      const token = localStorage.getItem('auth_token');
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
      // Scope every request to this vertical (the backend shares one API).
      headers.set('X-Vertical', BRAND.vertical);
      return headers;
    },
  });

  const result = await baseQuery(args, api, extraOptions);

  // Handle 401 unauthorized - token expired
  if (result.error && result.error.status === 401) {
    // Clear auth state only if there was a token (meaning it expired)
    const hadToken = localStorage.getItem('auth_token');
    if (hadToken) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
      console.log('Token expired, cleared auth state');
    }
    // Don't redirect - let ProtectedRoute handle redirects for protected pages
  }

  return result;
};

export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithAuth,
  tagTypes: [
    'User',
    'Products',
    'Product',
    'Orders',
    'Order',
    'Trades',
    'Trade',
    'Reviews',
    'Referrals',
    'Watchlist',
    'Rewards',
    'Notifications',
    'Messages',
    'Conversations',
    'Logistics',
    'DeliveryAddress',
    'Legal',
    'Wallet',
    'Payments',
    'Vendor',
    'Vendors',
    'Admin',
    'Categories',
  ],
  endpoints: () => ({}),
});
