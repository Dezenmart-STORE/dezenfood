import { baseApi } from './baseApi';
import type { Order } from '../../utils/types';
import type { VendorProfile, VendorStatus } from './vendorsApi';

const list = <T,>(res: unknown, key: string): T[] => {
  const r = res as Record<string, unknown>;
  const d = (r?.data ?? r) as Record<string, unknown> | T[];
  if (Array.isArray(d)) return d;
  const v = (d as Record<string, unknown>)?.[key];
  return Array.isArray(v) ? (v as T[]) : [];
};

/** { data: { [key]: T } } -> T, tolerating a bare object. */
const one = <T,>(res: unknown, key: string): T => {
  const r = res as Record<string, unknown>;
  const d = (r?.data ?? r) as Record<string, unknown>;
  return (d?.[key] ?? d) as T;
};

export type DisputeResolution = 'release_to_vendor' | 'refund_buyer';

export const adminApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getAdminVendors: builder.query<VendorProfile[], { status?: VendorStatus } | void>({
      query: (arg) => `/admin/vendors${arg?.status ? `?status=${arg.status}` : ''}`,
      transformResponse: (res: unknown) => list<VendorProfile>(res, 'vendors'),
      providesTags: [{ type: 'Admin', id: 'VENDORS' }],
    }),
    reviewVendor: builder.mutation<VendorProfile, { id: string; status: Extract<VendorStatus, 'approved' | 'rejected' | 'suspended'>; reason?: string }>({
      query: ({ id, ...body }) => ({
        url: `/admin/vendors/${id}/review`,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      }),
      transformResponse: (res: unknown) => one<VendorProfile>(res, 'vendor'),
      invalidatesTags: [{ type: 'Admin', id: 'VENDORS' }],
    }),

    getAdminDisputes: builder.query<Order[], void>({
      query: () => '/admin/disputes',
      transformResponse: (res: unknown) => list<Order>(res, 'orders'),
      providesTags: [{ type: 'Admin', id: 'DISPUTES' }],
    }),
    resolveDispute: builder.mutation<Order, { orderId: string; resolution: DisputeResolution; note?: string }>({
      query: ({ orderId, ...body }) => ({
        url: `/admin/disputes/${orderId}/resolve`,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      }),
      transformResponse: (res: unknown) => one<Order>(res, 'order'),
      invalidatesTags: [{ type: 'Admin', id: 'DISPUTES' }, { type: 'Orders', id: 'LIST' }],
    }),

    getAdminOrders: builder.query<Order[], { status?: string } | void>({
      query: (arg) => `/admin/orders${arg?.status ? `?status=${arg.status}` : ''}`,
      transformResponse: (res: unknown) => list<Order>(res, 'orders'),
      providesTags: [{ type: 'Admin', id: 'ORDERS' }],
    }),
  }),
});

export const {
  useGetAdminVendorsQuery,
  useReviewVendorMutation,
  useGetAdminDisputesQuery,
  useResolveDisputeMutation,
  useGetAdminOrdersQuery,
} = adminApi;
