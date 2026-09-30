import { baseApi } from './baseApi';

/**
 * Fiat payments. The browser never talks to Korapay or Pandascrow: their
 * secret keys live on the DezenMart backend, which creates the charge/escrow,
 * verifies it server-side and receives the provider webhooks. The frontend
 * only asks the backend to start a payment and then polls its verified status.
 *
 * Contract (see docs/BACKEND-CHANGES.md):
 *   GET  /payments/methods
 *   POST /payments/fiat/initialize
 *   GET  /payments/:reference/status
 */

export type FiatProvider = 'korapay' | 'pandascrow';

export interface PaymentMethodInfo {
  provider: FiatProvider | 'crypto';
  enabled: boolean;
  label: string;
  blurb?: string;
  currencies?: string[];
}

export interface InitializeFiatPaymentParams {
  orderId: string;
  provider: FiatProvider;
  /** Buyer email for the receipt / provider customer record */
  email: string;
  /** Where the provider should send the buyer afterwards. Backend allow-lists origins. */
  returnUrl: string;
}

/** Normalised by the backend so the client never depends on a provider's raw shape. */
export interface InitializeFiatPaymentResult {
  reference: string;
  provider: FiatProvider;
  /** Hosted checkout / payment page to send the buyer to */
  checkoutUrl?: string;
  /** Pay-by-transfer details, when the provider returns a virtual account */
  virtualAccount?: {
    bankName?: string;
    accountNumber?: string;
    accountName?: string;
    expiresAt?: string;
  };
  amount: number;
  currency: string;
}

export type PaymentStatus = 'pending' | 'success' | 'failed' | 'expired';

export interface PaymentStatusResult {
  reference: string;
  status: PaymentStatus;
  orderId: string;
  orderStatus?: string;
  provider?: FiatProvider;
}

const unwrap = <T,>(res: unknown): T => {
  const r = res as { data?: T } | T;
  return ((r as { data?: T })?.data ?? r) as T;
};

export const paymentsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getPaymentMethods: builder.query<PaymentMethodInfo[], void>({
      query: () => '/payments/methods',
      transformResponse: (res: unknown) => {
        const d = unwrap<{ methods?: PaymentMethodInfo[] } | PaymentMethodInfo[]>(res);
        return Array.isArray(d) ? d : (d?.methods ?? []);
      },
      keepUnusedDataFor: 300,
      providesTags: [{ type: 'Payments', id: 'METHODS' }],
    }),

    initializeFiatPayment: builder.mutation<InitializeFiatPaymentResult, InitializeFiatPaymentParams>({
      query: (body) => ({
        url: '/payments/fiat/initialize',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      }),
      transformResponse: (res: unknown) => unwrap<InitializeFiatPaymentResult>(res),
    }),

    // Never cached: the status must always be the backend's latest verified view.
    getPaymentStatus: builder.query<PaymentStatusResult, string>({
      query: (reference) => `/payments/${encodeURIComponent(reference)}/status`,
      transformResponse: (res: unknown) => unwrap<PaymentStatusResult>(res),
      keepUnusedDataFor: 0,
    }),
  }),
});

export const {
  useGetPaymentMethodsQuery,
  useInitializeFiatPaymentMutation,
  useGetPaymentStatusQuery,
  useLazyGetPaymentStatusQuery,
} = paymentsApi;
