import { baseApi } from './baseApi';
import type { CreateQuoteParams, ProviderQuote } from '../../utils/types';

interface StatesEnvelope {
  data?: { states?: string[] };
}
interface LgasEnvelope {
  data?: { lgas?: string[] };
}
interface QuotesEnvelope {
  data?: { quotes?: ProviderQuote[] };
}

const num = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

export const logisticsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Nigerian states (for address + product forms).
    // Effectively static, so keep the cache for a day to avoid refetching.
    getNigerianStates: builder.query<string[], void>({
      query: () => '/logistics/locations/states',
      transformResponse: (res: StatesEnvelope) => res?.data?.states ?? [],
      keepUnusedDataFor: 86400,
    }),

    // LGAs for a given state (dependent on selected state). Also static; cached
    // per-state for a day so switching back to a state doesn't refetch.
    getStateLgas: builder.query<string[], string>({
      query: (state) => `/logistics/locations/states/${encodeURIComponent(state)}/lgas`,
      transformResponse: (res: LgasEnvelope) => res?.data?.lgas ?? [],
      keepUnusedDataFor: 86400,
    }),

    // Quotes for a route + weight from the buyer's saved address. Returns every
    // provider that can deliver, each with its own quoteId + fee, so this single
    // POST is the source of truth for the provider list (no separate /available).
    //
    // A quote is ephemeral (server-side expiry), so it must not be reused from
    // cache: keepUnusedDataFor 0 purges it the moment nothing subscribes, so
    // (re)selecting an address always mints fresh quotes (see the hook's
    // refetchOnMountOrArgChange).
    getLogisticsQuotes: builder.query<ProviderQuote[], CreateQuoteParams>({
      query: (body) => ({
        url: '/logistics/quotes',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      }),
      keepUnusedDataFor: 0,
      transformResponse: (res: QuotesEnvelope): ProviderQuote[] =>
        (res?.data?.quotes ?? []).map((q) => ({
          ...q,
          quoteId: String(q.quoteId ?? ''),
          providerId: String(q.providerId ?? q.provider?.id ?? ''),
          deliveryFee: num(q.deliveryFee ?? q.breakdown?.totalPrice),
        })),
    }),
  }),
});

export const {
  useGetNigerianStatesQuery,
  useGetStateLgasQuery,
  useGetLogisticsQuotesQuery,
} = logisticsApi;
