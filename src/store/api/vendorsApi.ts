import { baseApi } from './baseApi';
import type { Product } from '../../utils/types';
import type { Weekday } from '../../utils/food';

export type VendorStatus = 'pending' | 'approved' | 'rejected' | 'suspended';

export interface VendorProfile {
  _id: string;
  user: string;
  businessName: string;
  description: string;
  categories: string[];
  phone: string;
  state: string;
  lga: string;
  address: string;
  logo?: string;
  coverImage?: string;
  openingHours?: { days: Weekday[]; open: string; close: string };
  /** Vendor can pause new orders without unlisting */
  isOpen: boolean;
  status: VendorStatus;
  rejectionReason?: string;
  rating?: number;
  reviewCount?: number;
  /** Only present for the vendor themselves. Account number is masked server-side. */
  payoutAccount?: { bankName: string; accountName: string; accountNumberMasked: string };
  createdAt: string;
}

export interface VendorApplication {
  businessName: string;
  description: string;
  categories: string[];
  phone: string;
  state: string;
  lga: string;
  address: string;
  openingHours?: { days: Weekday[]; open: string; close: string };
  payout: { bankCode: string; accountNumber: string };
}

export interface Bank {
  code: string;
  name: string;
}

const unwrap = <T,>(res: unknown, key?: string): T => {
  const r = res as Record<string, unknown>;
  const d = (r?.data ?? r) as Record<string, unknown>;
  return ((key && d?.[key]) ?? d) as T;
};

export const vendorsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getMyVendor: builder.query<VendorProfile | null, void>({
      query: () => '/vendors/me',
      transformResponse: (res: unknown) => unwrap<VendorProfile>(res, 'vendor') ?? null,
      // 404 = "not a vendor yet" - treat as empty rather than an error
      transformErrorResponse: (e) => e,
      providesTags: [{ type: 'Vendor', id: 'ME' }],
    }),

    getVendorById: builder.query<VendorProfile, string>({
      query: (id) => `/vendors/${id}`,
      transformResponse: (res: unknown) => unwrap<VendorProfile>(res, 'vendor'),
      providesTags: (_r, _e, id) => [{ type: 'Vendors', id }],
    }),

    getVendorProducts: builder.query<Product[], string>({
      query: (id) => `/products/seller/${id}`,
      transformResponse: (res: unknown) => {
        const d = unwrap<Product[] | { products?: Product[] }>(res);
        return Array.isArray(d) ? d : (d?.products ?? []);
      },
      providesTags: [{ type: 'Products', id: 'SELLER' }],
    }),

    applyAsVendor: builder.mutation<VendorProfile, VendorApplication>({
      query: (body) => ({
        url: '/vendors/apply',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      }),
      transformResponse: (res: unknown) => unwrap<VendorProfile>(res, 'vendor'),
      invalidatesTags: [{ type: 'Vendor', id: 'ME' }],
    }),

    updateMyVendor: builder.mutation<VendorProfile, Partial<Omit<VendorApplication, 'payout'>> & { isOpen?: boolean }>({
      query: (body) => ({
        url: '/vendors/me',
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body,
      }),
      transformResponse: (res: unknown) => unwrap<VendorProfile>(res, 'vendor'),
      invalidatesTags: [{ type: 'Vendor', id: 'ME' }],
    }),

    getBanks: builder.query<Bank[], void>({
      query: () => '/vendors/banks',
      transformResponse: (res: unknown) => {
        const d = unwrap<Bank[] | { banks?: Bank[] }>(res);
        return Array.isArray(d) ? d : (d?.banks ?? []);
      },
      keepUnusedDataFor: 86400,
    }),

    /** Server-side account-name lookup, so the vendor confirms the right account. */
    resolveBankAccount: builder.mutation<{ accountName: string }, { bankCode: string; accountNumber: string }>({
      query: (body) => ({
        url: '/vendors/banks/resolve',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      }),
      transformResponse: (res: unknown) => unwrap<{ accountName: string }>(res),
    }),
  }),
});

export const {
  useGetMyVendorQuery,
  useGetVendorByIdQuery,
  useGetVendorProductsQuery,
  useApplyAsVendorMutation,
  useUpdateMyVendorMutation,
  useGetBanksQuery,
  useResolveBankAccountMutation,
} = vendorsApi;
