import { baseApi } from './baseApi';
import type { Review } from '../../utils/types';

export const reviewsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Get reviews for a user (as reviewee)
    getReviewsForUser: builder.query<Review[], string>({
      query: (userId) => `/reviews/user/${userId}`,
      providesTags: (result, error, userId) =>
        result
          ? [
              ...result.map(({ _id }) => ({ type: 'Reviews' as const, id: _id })),
              { type: 'Reviews', id: `USER_${userId}` },
            ]
          : [{ type: 'Reviews', id: `USER_${userId}` }],
    }),

    // Get review for an order
    getOrderReview: builder.query<Review, string>({
      query: (orderId) => `/reviews/order/${orderId}`,
      providesTags: (result, error, orderId) => [
        { type: 'Reviews', id: `ORDER_${orderId}` },
      ],
    }),

    // Create review
    createReview: builder.mutation<
      Review,
      { reviewed: string; order: string; rating: number; comment: string }
    >({
      query: (data) => ({
        url: '/reviews',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: data,
      }),
      invalidatesTags: (_, __, arg) => [
        { type: 'Reviews', id: `USER_${arg.reviewed}` },
        { type: 'Reviews', id: `ORDER_${arg.order}` },
      ],
    }),

    // Update user rating (recalculate based on reviews)
    updateUserRating: builder.mutation<void, string>({
      query: (userId) => ({
        url: `/reviews/user-rating/${userId}`,
        method: 'PUT',
      }),
      invalidatesTags: (result, error, userId) => [
        { type: 'User', id: userId },
      ],
    }),
  }),
});

export const {
  useGetReviewsForUserQuery,
  useGetOrderReviewQuery,
  useCreateReviewMutation,
  useUpdateUserRatingMutation,
} = reviewsApi;
