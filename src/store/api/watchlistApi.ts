import { baseApi } from './baseApi';
import { unwrapList } from './unwrap';
import type { WatchlistItem, WatchlistCheck } from '../../utils/types';

export const watchlistApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Get user's watchlist
    getWatchlist: builder.query<WatchlistItem[], void>({
      query: () => '/watchlist',
      transformResponse: (r: unknown) => unwrapList<WatchlistItem>(r),
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ _id }) => ({ type: 'Watchlist' as const, id: _id })),
              { type: 'Watchlist', id: 'LIST' },
            ]
          : [{ type: 'Watchlist', id: 'LIST' }],
    }),

    // Check if product is in watchlist
    checkWatchlist: builder.query<WatchlistCheck, string>({
      query: (productId) => `/watchlist/${productId}/check`,
      providesTags: (result, error, productId) => [
        { type: 'Watchlist', id: `CHECK_${productId}` },
      ],
    }),

    // Add to watchlist
    addToWatchlist: builder.mutation<WatchlistItem, string>({
      query: (productId) => ({
        url: `/watchlist/${productId}`,
        method: 'POST',
      }),
      invalidatesTags: (result, error, productId) => [
        { type: 'Watchlist', id: 'LIST' },
        { type: 'Watchlist', id: `CHECK_${productId}` },
      ],
      // Optimistic update
      async onQueryStarted(productId, { dispatch, queryFulfilled }) {
        const patchResult = dispatch(
          watchlistApi.util.updateQueryData('checkWatchlist', productId, (draft) => {
            draft.isWatchlist = true;
          })
        );
        try {
          await queryFulfilled;
        } catch {
          patchResult.undo();
        }
      },
    }),

    // Remove from watchlist
    removeFromWatchlist: builder.mutation<void, string>({
      query: (productId) => ({
        url: `/watchlist/${productId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, productId) => [
        { type: 'Watchlist', id: 'LIST' },
        { type: 'Watchlist', id: `CHECK_${productId}` },
      ],
      // Optimistic update
      async onQueryStarted(productId, { dispatch, queryFulfilled }) {
        const patchResult = dispatch(
          watchlistApi.util.updateQueryData('checkWatchlist', productId, (draft) => {
            draft.isWatchlist = false;
          })
        );
        try {
          await queryFulfilled;
        } catch {
          patchResult.undo();
        }
      },
    }),
  }),
});

export const {
  useGetWatchlistQuery,
  useCheckWatchlistQuery,
  useAddToWatchlistMutation,
  useRemoveFromWatchlistMutation,
} = watchlistApi;
